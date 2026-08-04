// ──────────────────────────────────────────────────────────────────────
// fbe-editor.js — the DOM / canvas / interaction layer for the
// Function-Block Editor, extracted from
// /simulators/function-block-editor.html so a second consumer (the
// forthcoming "DDC Workbench") can embed the same wiresheet.
//
// Loaded as a *classic* script (no type="module"), same convention as
// /scripts/fbe-engine.js: it exposes one PascalCase global,
// window.FBEEditor, whose createEditor() factory builds a single editor
// instance bound to a caller-supplied set of DOM nodes. A page adds
//
//     <script src="/scripts/fbe-engine.js"></script>
//     <script src="/scripts/fbe-editor.js"></script>
//
// before its own inline <script>, which owns only the example-program
// literals and the page-selector event wiring (sim-bar buttons, the
// example chips, and the .tool-card 'fullscreenchange' event). The 11ty
// build copies this through unchanged — nothing transpiles or bundles.
//
// The simulation itself lives in fbe-engine.js (window.FBE): the block
// catalog and the pure per-tick evaluator. This module owns the palette,
// the draggable blocks, pin-to-pin wiring, the inspector, and — when
// autoloop is on — the 10 Hz tick loop. State survives interaction but
// not a reload (session-only, by design — like every other tool here).
//
// FBEEditor.createEditor(config) → the editor API. config keys:
//
//   engine             the pure engine (default window.FBE).
//   elements           { canvas, inner, palette, inspector, status,
//                        runButton } — explicit DOM refs. The module is
//                        id-agnostic, so a host can mount its own nodes
//                        (or several editors) without id collisions.
//   examples           { key → graph literal }; page-owned, passed in.
//   initialExampleKey  load this example on construction (e.g. 'econ').
//   initialGraph       …or seed from a graph literal instead.
//   canvasSize         { w, h } — canvas content bounds in px (default
//                      900×480, the styles.css no-JS size on
//                      .fbe-canvas-inner / .fbe-wire-layer). When
//                      passed, the module inline-sizes the inner div at
//                      construction AND the wire layer on every render;
//                      without the wire-layer inline size the
//                      stylesheet's fixed 900×480 letterboxes every
//                      wire on a non-default canvas (the SVG renders at
//                      900×480 with a larger viewBox, so all wire
//                      geometry draws scaled down and offset).
//   dt                 tick step in seconds (default 0.1 = 10 Hz).
//   autoloop           true (default): the module owns a setInterval and
//                      the #110 idle-gating (no ticks below the desktop
//                      width, none in a hidden tab). false: the host
//                      drives the model by calling tick(dt) itself — no
//                      setInterval, no visibility/media listeners.
//   keyScope           keydown target for Delete / Escape (default
//                      document).
//   onChange           optional (graph) => void, fired after a structural
//                      mutation (add/delete a block or wire) or a graph
//                      replace (load/set/clear).
//
// The returned API:
//   getGraph()             the live graph reference (survives replaces).
//   setGraph(literal)      replace the graph from a literal + re-run.
//   loadExample(key)       load examples[key] and run it.
//   clearCanvas()          empty the sheet.
//   addBlock(type)         drop a block; returns its id.
//   tick(dt?)              one host-driven scan (engine.tick + refresh).
//   step()                 pause if running, then one scan (Step button).
//   refresh()              repaint values/wires without a scan.
//   setRunning(on)         start/stop the loop (autoloop) + wire anim.
//   isRunning()            current run state.
//   reset()                clear runtime state (timers/PID/latches) + scan.
//   onFullscreenChange(isFs)  reflow for the fullscreen transition.
//   relayout()             re-size the wire layer + re-route wires.
//   destroy()              stop the loop and remove every listener.
// ──────────────────────────────────────────────────────────────────────

'use strict';

const FBEEditor = (function () {
    'use strict';

    function createEditor(config) {
        const cfg       = config || {};
        const engine    = cfg.engine || (typeof window !== 'undefined' ? window.FBE : null);
        const nodes     = cfg.elements || {};
        const canvasEl  = nodes.canvas;
        const inner     = nodes.inner;
        const palette   = nodes.palette;
        const inspector = nodes.inspector;
        const statusEl  = nodes.status;
        const runBtn    = nodes.runButton;
        const examples  = cfg.examples || {};
        const DT        = typeof cfg.dt === 'number' ? cfg.dt : 0.1;  // tick step, seconds (10 Hz)
        const autoloop  = cfg.autoloop !== false;
        const keyScope  = cfg.keyScope || document;
        const onChange  = typeof cfg.onChange === 'function' ? cfg.onChange : null;

        // INNER_W / INNER_H grow when the user enters fullscreen so blocks
        // can be dragged into the new space; they never shrink back below
        // their construction size (900×480, or the host's canvasSize) so
        // blocks placed off-screen stay reachable after exit.
        const canvasSize = cfg.canvasSize || null;
        let INNER_W = canvasSize && canvasSize.w ? canvasSize.w : 900;
        let INNER_H = canvasSize && canvasSize.h ? canvasSize.h : 480;
        // True .fbe-block width, re-measured from a rendered block in
        // renderAll(). 136 is the documented fallback — 8.5rem at a 16px
        // root font (#208) — used until a block renders, and kept when a
        // block measures 0 wide (hidden pane / display:none, e.g. the
        // workbench's lazy tab, where getBoundingClientRect is all-zero).
        let blockW = 136;
        // Forward-route threshold stub — see wirePath(). Measured
        // 2026-07: STUB = 10 (forward threshold 20px; was 18 → 36px)
        // fixes econ / tstat-cool / tstat-heat / reset on the public
        // page (tstat crossings 4 → 0 each) and leaves proof on the
        // 5-segment fallback BY DESIGN (see the proof example's layout
        // comment, function-block-editor.html:287). Any change here must
        // be eyeballed on BOTH consumer pages (#205); crossing counts
        // are intersection POINTS, not wire pairs.
        const STUB = 10;

        // ── editor state ────────────────────────────────────────────
        let graph    = { blocks: [], wires: [] };
        let selected = null;                  // { kind:'block'|'wire', id }
        let pending  = null;                  // { block, pin, kind } mid-wire
        let running  = true;
        let tickHandle = null;
        let blockSeq = 0, wireSeq = 0, dropSeq = 0;

        const els = {};                       // blockId → block DOM node
        // #196: render + cache state keyed by wire id, held OFF the wire
        // data objects in graph.wires. Each entry is { hit, vis, lastCls } —
        // the hit-area <path>, the visible <path>, and the last CSS class
        // refreshValues() wrote (the #111 10 Hz skip-redundant-setAttribute
        // cache). renderAll() clears this map in lockstep with `els`, so a
        // rebuilt <path> can never inherit a stale cache from a previous
        // render — the wire-invisibility bug (codebase-issues #196; the
        // narrow w._lastCls reset from PR #421 is now structural).
        const wireEls = {};                   // wireId → { hit, vis, lastCls }
        let svg = null;                       // current wire layer

        function emitChange() { if (onChange) onChange(graph); }

        // ── palette ─────────────────────────────────────────────────
        function buildPalette() {
            engine.CATEGORIES.forEach((cat) => {
                const label = document.createElement('div');
                label.className = 'fbe-palette-label';
                label.textContent = cat;
                palette.appendChild(label);
                Object.keys(engine.BLOCKS).forEach((type) => {
                    if (engine.BLOCKS[type].category !== cat) return;
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'fbe-palette-btn';
                    btn.textContent = engine.BLOCKS[type].label;
                    btn.addEventListener('click', () => addBlock(type));
                    palette.appendChild(btn);
                });
            });
        }

        function addBlock(type) {
            const id = 'b' + (++blockSeq);
            // Drop new blocks into a tidy grid whose column pitch comes
            // from the router's own forward condition (#206, #208), so
            // two adjacent drops wired left→right route as the clean
            // 3-segment elbow, never the buried 5-segment fallback.
            // wirePath() goes forward when the target in-pin sits at
            // least 2·STUB right of the source out-pin. Pin-dot centres
            // sit 0.05rem − 1px outside each block edge (0.36rem margin
            // pull minus the 0.31rem half-dot, less the 1px block
            // border), so one block's in-pin → out-pin span is
            // blockW + 2·(0.05F − 1) = blockW + 0.1F − 2 at root font
            // F px — bounded by blockW + 2 for any root font below 40px.
            // pitchX = blockW + 2·STUB + 2 therefore clears the forward
            // threshold at any plausible font size. The cycle wraps
            // after cols·4 drops, so further blocks may overlap and
            // need a drag.
            const n = dropSeq++;
            const pitchX = Math.ceil(blockW + 2 * STUB + 2);
            const cols = Math.max(1, Math.floor((INNER_W - 80) / pitchX));
            const x = 40 + (n % cols) * pitchX;
            const y = 40 + Math.floor((n % (cols * 4)) / cols) * 120;
            graph.blocks.push(engine.createBlock(type, id, x, y));
            renderAll();
            select({ kind: 'block', id });
            emitChange();
            return id;
        }

        // ── rendering ───────────────────────────────────────────────
        function renderAll() {
            inner.innerHTML = '';
            for (const k in els) delete els[k];
            for (const k in wireEls) delete wireEls[k];

            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'fbe-wire-layer');
            svg.setAttribute('viewBox', '0 0 ' + INNER_W + ' ' + INNER_H);
            // Inline-size the layer to the canvas bounds. The stylesheet
            // fixes .fbe-wire-layer at the 900×480 default, and an SVG
            // rendered at that size with a non-900×480 viewBox
            // letterboxes: every wire draws scaled down and offset from
            // the blocks. A no-op at the default size; load-bearing for
            // any host-passed canvasSize.
            svg.style.width  = INNER_W + 'px';
            svg.style.height = INNER_H + 'px';
            // Redundant to the block-value readouts; an unnamed dynamic
            // SVG is noise for AT (audit-2026-06 polish).
            svg.setAttribute('aria-hidden', 'true');
            inner.appendChild(svg);

            graph.blocks.forEach(renderBlock);
            // Re-measure the true block width — .fbe-block is 8.5rem, so
            // the 136 fallback only holds at a 16px root font (#208). A
            // hidden sheet (display:none — the workbench's lazy tab)
            // measures 0, which would poison the drag clamp and the drop
            // grid; keep the fallback (or the last good measurement)
            // until a visible render.
            if (graph.blocks.length) {
                const w = els[graph.blocks[0].id].getBoundingClientRect().width;
                if (w > 0) blockW = w;
            }
            ensureWireIds();
            graph.wires.forEach(createWireEls);
            drawWires();
            refreshValues();
            renderInspector();
        }

        // ── block head ──────────────────────────────────────────────
        // A block that carries an instance `name` heads as `TAG · Name`
        // — the type's short tag, then what THIS block does on THIS
        // sheet ('AI · OAT', 'SR · Trip Latch'). Two spans, because the
        // tag paints dimmer than the name; the '·' between them comes
        // from CSS (::after on the tag) so it is neither selectable nor
        // announced. A block with no name renders the type's full
        // `label` as one text node — byte-for-byte what shipped before
        // names existed, which is what a fresh block off the palette
        // looks like.
        //
        // The whole string also goes on `title`: the head clips with an
        // ellipsis past ~18 characters (see the styles.css note), and
        // hover is how a truncated name stays recoverable.
        function headString(b) {
            const def = engine.BLOCKS[b.type];
            return b.name ? def.tag + ' · ' + b.name : def.label;
        }

        function paintHead(head, b) {
            const def = engine.BLOCKS[b.type];
            head.textContent = '';
            if (!b.name) {
                head.textContent = def.label;
                head.removeAttribute('title');
                return;
            }
            const tag = document.createElement('span');
            tag.className = 'fbe-block-tag';
            tag.textContent = def.tag;
            const name = document.createElement('span');
            name.className = 'fbe-block-name';
            name.textContent = b.name;
            head.appendChild(tag);
            head.appendChild(name);
            head.title = headString(b);
        }

        // Repaint one block's head in place — the name-edit path, which
        // must not re-render the sheet (that would drop the caret out of
        // the inspector's own input mid-keystroke).
        function repaintHead(b) {
            const el = els[b.id];
            if (!el) return;
            const head = el.querySelector('.fbe-block-head');
            if (head) paintHead(head, b);
        }

        function renderBlock(b) {
            const def = engine.BLOCKS[b.type];
            const el = document.createElement('div');
            el.className = 'fbe-block';
            el.style.left = b.x + 'px';
            el.style.top = b.y + 'px';
            el.dataset.id = b.id;

            const head = document.createElement('div');
            head.className = 'fbe-block-head';
            paintHead(head, b);
            el.appendChild(head);

            const body = document.createElement('div');
            body.className = 'fbe-block-body';
            const colIn = document.createElement('div');
            colIn.className = 'fbe-pins fbe-pins-in';
            const colOut = document.createElement('div');
            colOut.className = 'fbe-pins fbe-pins-out';
            def.inputs.forEach((p) => colIn.appendChild(makePin(b, p, 'in')));
            def.outputs.forEach((p) => colOut.appendChild(makePin(b, p, 'out')));
            body.appendChild(colIn);
            body.appendChild(colOut);
            el.appendChild(body);

            const val = document.createElement('div');
            val.className = 'fbe-block-val';
            if (b.type === 'bi') {
                val.classList.add('fbe-toggle');
                val.addEventListener('click', (e) => {
                    e.stopPropagation();
                    b.params.state = !b.params.state;
                    if (!running) { stepOnce(); } else { refreshValues(); }
                });
            }
            el.appendChild(val);

            el.addEventListener('pointerdown', (e) => onBlockPointerDown(e, b));
            inner.appendChild(el);
            els[b.id] = el;
        }

        function makePin(b, pinDef, dir) {
            const pin = document.createElement('div');
            pin.className = 'fbe-pin fbe-pin-' + dir;
            pin.dataset.pin = pinDef.name;
            pin.dataset.kind = pinDef.kind;
            const dot = document.createElement('span');
            dot.className = 'fbe-pin-dot';
            const lbl = document.createElement('span');
            lbl.className = 'fbe-pin-label';
            lbl.textContent = pinDef.name;
            if (dir === 'in') { pin.appendChild(dot); pin.appendChild(lbl); }
            else { pin.appendChild(lbl); pin.appendChild(dot); }
            pin.addEventListener('click', (e) => {
                e.stopPropagation();
                onPinClick(b, pinDef, dir);
            });
            return pin;
        }

        // ── wires ───────────────────────────────────────────────────
        function ensureWireIds() {
            graph.wires.forEach((w) => {
                if (!w.id) w.id = 'w' + (++wireSeq);
            });
        }

        function createWireEls(w) {
            const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            hit.setAttribute('class', 'fbe-wire-hit');
            hit.addEventListener('click', (e) => {
                e.stopPropagation();
                select({ kind: 'wire', id: w.id });
            });
            const vis = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            vis.setAttribute('class', 'fbe-wire');
            svg.appendChild(hit);
            svg.appendChild(vis);
            // Cache the fresh elements + the render-cache seed in the side
            // map keyed by w.id (ensureWireIds guarantees a stable id first).
            // lastCls starts at the bare 'fbe-wire' the <path> was just built
            // with, so refreshValues() writes the coloured class on its next
            // pass. Because renderAll() clears wireEls before re-creating, the
            // cache cannot desync from the element (#196).
            wireEls[w.id] = { hit: hit, vis: vis, lastCls: 'fbe-wire' };
        }

        // Pin-dot centre, in canvas-inner coordinates.
        function pinCenter(blockId, pinName, dir) {
            const el = els[blockId];
            if (!el) return null;
            const sel = '.fbe-pin-' + dir + '[data-pin="' + cssEsc(pinName) + '"] .fbe-pin-dot';
            const dot = el.querySelector(sel);
            if (!dot) return null;
            const r = dot.getBoundingClientRect();
            const base = inner.getBoundingClientRect();
            return { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top };
        }

        function cssEsc(s) {
            return window.CSS && CSS.escape ? CSS.escape(s) : s;
        }

        // Orthogonal (Manhattan) route from an output pin (right edge of its
        // block) to an input pin (left edge). Forward edges get a single
        // horizontal-vertical-horizontal step at the midpoint; backward edges
        // — feedback loops, where the target sits left of the source — exit
        // right, traverse at the mid height, and re-enter the target from its
        // left, so the wire never doubles back across its own block.
        function wirePath(a, b) {
            if (b.x >= a.x + 2 * STUB) {
                const mx = (a.x + b.x) / 2;
                return 'M ' + a.x + ' ' + a.y + ' H ' + mx + ' V ' + b.y + ' H ' + b.x;
            }
            const ax2 = a.x + STUB;
            const bx2 = b.x - STUB;
            const my = (a.y + b.y) / 2;
            return 'M ' + a.x + ' ' + a.y + ' H ' + ax2 + ' V ' + my +
                   ' H ' + bx2 + ' V ' + b.y + ' H ' + b.x;
        }

        function drawWires() {
            graph.wires.forEach((w) => {
                const a = pinCenter(w.from[0], w.from[1], 'out');
                const b = pinCenter(w.to[0], w.to[1], 'in');
                if (!a || !b) return;
                const we = wireEls[w.id];
                if (!we) return;
                const d = wirePath(a, b);
                we.hit.setAttribute('d', d);
                we.vis.setAttribute('d', d);
            });
        }

        // ── live values ─────────────────────────────────────────────
        function refreshValues() {
            // #111: build the id→block lookup once per tick instead of a
            // graph.blocks.find() per wire (and again inside the kind
            // lookup), and write a wire's class only when it actually
            // changes. refreshValues runs at 10 Hz, so the old per-tick cost
            // was O(wires × blocks) plus a setAttribute on every wire even
            // when nothing moved. Negligible on shipped graphs (≤9 blocks);
            // matters only on a large user-built sheet.
            const byId = {};
            graph.blocks.forEach((b) => { byId[b.id] = b; });
            graph.blocks.forEach((b) => {
                const el = els[b.id];
                if (!el) return;
                const def = engine.BLOCKS[b.type];
                // pin dot states
                el.querySelectorAll('.fbe-pin').forEach((pinEl) => {
                    const dir = pinEl.classList.contains('fbe-pin-out') ? 'out' : 'in';
                    const name = pinEl.dataset.pin;
                    const v = dir === 'out'
                        ? (b.out && b.out[name])
                        : (b.in && b.in[name]);
                    const on = pinEl.dataset.kind === 'bool' ? v === true : v !== undefined;
                    pinEl.classList.toggle('fbe-on', !!on);
                });
                // value strip
                const valEl = el.querySelector('.fbe-block-val');
                const probe = def.outputs.length
                    ? { kind: def.outputs[0].kind, v: b.out && b.out[def.outputs[0].name] }
                    : { kind: def.inputs[0].kind, v: b.in && b.in[def.inputs[0].name] };
                valEl.classList.remove('fbe-val-on', 'fbe-val-off');
                if (probe.kind === 'bool') {
                    const on = probe.v === true;
                    valEl.textContent = on ? 'TRUE' : 'FALSE';
                    valEl.classList.add(on ? 'fbe-val-on' : 'fbe-val-off');
                } else {
                    valEl.textContent = fmt(probe.v);
                }
            });
            // wire colours
            graph.wires.forEach((w) => {
                const we = wireEls[w.id];
                if (!we) return;
                const src = byId[w.from[0]];
                // Kind of the source OUT pin (was a separate pinKind() that
                // did its own graph.blocks.find — folded in here via byId).
                const outs = src ? engine.BLOCKS[src.type].outputs : [];
                const pin = outs.find((p) => p.name === w.from[1]);
                const kind = pin ? pin.kind : 'number';
                let cls = 'fbe-wire fbe-wire-num';
                if (kind === 'bool') {
                    const on = src && src.out && src.out[w.from[1]] === true;
                    cls = 'fbe-wire ' + (on ? 'fbe-wire-bool-on' : 'fbe-wire-bool-off');
                }
                if (selected && selected.kind === 'wire' && selected.id === w.id) {
                    cls += ' fbe-wire-sel';
                }
                if (we.lastCls !== cls) {
                    we.vis.setAttribute('class', cls);
                    we.lastCls = cls;
                }
            });
        }

        function fmt(v) {
            if (typeof v !== 'number' || !isFinite(v)) return '—';
            return Math.abs(v) >= 100 || v === Math.round(v)
                ? String(Math.round(v))
                : v.toFixed(1);
        }

        // ── selection ───────────────────────────────────────────────
        function select(sel) {
            selected = sel;
            cancelWire();
            graph.blocks.forEach((b) => {
                if (els[b.id]) {
                    els[b.id].classList.toggle(
                        'fbe-block-sel',
                        !!sel && sel.kind === 'block' && sel.id === b.id);
                }
            });
            refreshValues();
            renderInspector();
        }

        function clearSelection() { select(null); }

        function deleteSelected() {
            if (!selected) return;
            // A pending wire from the soon-to-be-deleted block would
            // outlive its source; clear it unconditionally — the user
            // can re-pick a source pin if they were mid-wire elsewhere.
            cancelWire();
            if (selected.kind === 'block') {
                graph.wires = graph.wires.filter(
                    (w) => w.from[0] !== selected.id && w.to[0] !== selected.id);
                graph.blocks = graph.blocks.filter((b) => b.id !== selected.id);
            } else {
                graph.wires = graph.wires.filter((w) => w.id !== selected.id);
            }
            selected = null;
            renderAll();
            emitChange();
        }

        // ── inspector ───────────────────────────────────────────────
        // The Name field's id. Deliberately NOT under the `fbe-p-`
        // prefix the param rows generate below (`fbe-p-` + the param's
        // own name), since a name is not a param — and the two prefixes
        // cannot collide whatever a future block type calls its params.
        const NAME_INPUT_ID = 'fbe-insp-name';

        function renderInspector() {
            inspector.innerHTML = '';
            const title = document.createElement('div');
            title.className = 'fbe-insp-title';
            inspector.appendChild(title);

            if (!selected) {
                title.textContent = 'Inspector';
                const p = document.createElement('p');
                p.className = 'fbe-insp-empty';
                p.textContent = 'Select a block to edit its parameters, or a wire to '
                    + 'remove it. Click a block in the palette to add one.';
                inspector.appendChild(p);
                const keys = document.createElement('p');
                keys.className = 'fbe-insp-keys';
                keys.textContent = 'Press Delete to remove · Escape to cancel a wire.';
                inspector.appendChild(keys);
                return;
            }
            if (selected.kind === 'wire') {
                title.textContent = 'Wire';
                addDeleteBtn('Delete wire');
                return;
            }
            const b = graph.blocks.find((x) => x.id === selected.id);
            if (!b) { title.textContent = 'Inspector'; return; }
            const def = engine.BLOCKS[b.type];
            // The instance's own name leads once it has one — that is
            // what the user is looking at on the sheet. The type's label
            // is the fallback, and stays the caption for an unnamed
            // block.
            title.textContent = b.name || def.label;

            // ── Name — above the params, because it identifies the
            // block rather than tuning it. Blank (or all-whitespace)
            // CLEARS the name: the head falls back to the type label,
            // which is the only way back out of a name. Names are
            // authored config, not runtime state, so reset() leaves
            // them alone (it clears .state / .out / .in only).
            const nameRow = document.createElement('div');
            nameRow.className = 'fbe-insp-row';
            const nameLbl = document.createElement('label');
            nameLbl.setAttribute('for', NAME_INPUT_ID);
            nameLbl.textContent = 'Name';
            const nameField = document.createElement('input');
            nameField.type = 'text';
            nameField.id = NAME_INPUT_ID;
            nameField.value = b.name || '';
            nameField.placeholder = def.tag;
            nameField.autocomplete = 'off';
            nameField.spellcheck = false;
            // NOT afterParamEdit(): a param edit has to propagate through
            // the graph while paused, so that helper ticks the engine
            // 0.1s. Nothing in evaluate() reads a name, so ticking here
            // would advance TON / TOF / PID state once per keystroke on a
            // paused sheet. The head repaint and the caption below are a
            // name edit's whole observable effect.
            nameField.addEventListener('input', () => {
                const v = nameField.value.trim();
                if (v === '') delete b.name; else b.name = v;
                repaintHead(b);
                title.textContent = b.name || def.label;
            });
            nameRow.appendChild(nameLbl);
            nameRow.appendChild(nameField);
            inspector.appendChild(nameRow);

            (def.params || []).forEach((p) => {
                const row = document.createElement('div');
                row.className = 'fbe-insp-row';
                const inputId = 'fbe-p-' + p.name;
                if (p.kind === 'bool') {
                    row.className = 'fbe-insp-row fbe-insp-check';
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.id = inputId;
                    cb.checked = b.params[p.name] === true;
                    cb.addEventListener('change', () => {
                        b.params[p.name] = cb.checked;
                        afterParamEdit();
                    });
                    const lbl = document.createElement('label');
                    lbl.setAttribute('for', inputId);
                    lbl.textContent = p.label;
                    row.appendChild(cb);
                    row.appendChild(lbl);
                } else {
                    const lbl = document.createElement('label');
                    lbl.setAttribute('for', inputId);
                    lbl.textContent = p.label;
                    row.appendChild(lbl);
                    let field;
                    if (p.kind === 'enum') {
                        field = document.createElement('select');
                        p.options.forEach((opt) => {
                            const o = document.createElement('option');
                            o.value = opt;
                            o.textContent = opt;
                            field.appendChild(o);
                        });
                        field.value = b.params[p.name];
                        field.addEventListener('change', () => {
                            b.params[p.name] = field.value;
                            afterParamEdit();
                        });
                    } else {
                        field = document.createElement('input');
                        field.type = 'number';
                        field.value = b.params[p.name];
                        field.addEventListener('input', () => {
                            // Don't zero the model while the box is momentarily
                            // empty mid-edit (HLB's number inputs do the same,
                            // codebase-issues #138); a real value repaints it.
                            if (field.value === '') return;
                            const n = parseFloat(field.value);
                            b.params[p.name] = isFinite(n) ? n : 0;
                            afterParamEdit();
                        });
                    }
                    field.id = inputId;
                    row.appendChild(field);
                }
                inspector.appendChild(row);
            });
            addDeleteBtn('Delete block');
        }

        function addDeleteBtn(label) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'copy-btn fbe-insp-del';
            btn.textContent = label;
            btn.addEventListener('click', deleteSelected);
            inspector.appendChild(btn);
        }

        function afterParamEdit() {
            if (!running) stepOnce();
        }

        // ── block drag ──────────────────────────────────────────────
        function onBlockPointerDown(e, b) {
            if (e.target.closest('.fbe-pin') || e.target.closest('.fbe-toggle')) return;
            const el = els[b.id];
            const startX = e.clientX, startY = e.clientY;
            const origX = b.x, origY = b.y;
            let moved = false;
            el.setPointerCapture(e.pointerId);

            function move(ev) {
                const dx = ev.clientX - startX, dy = ev.clientY - startY;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
                b.x = clamp(origX + dx, 0, INNER_W - blockW);
                b.y = clamp(origY + dy, 0, INNER_H - 40);
                el.style.left = b.x + 'px';
                el.style.top = b.y + 'px';
                drawWires();
            }
            function up(ev) {
                el.removeEventListener('pointermove', move);
                el.removeEventListener('pointerup', up);
                el.removeEventListener('pointercancel', up);
                if (!moved) select({ kind: 'block', id: b.id });
            }
            el.addEventListener('pointermove', move);
            el.addEventListener('pointerup', up);
            el.addEventListener('pointercancel', up);
        }

        function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

        // ── wiring ──────────────────────────────────────────────────
        function onPinClick(b, pinDef, dir) {
            if (dir === 'out') {
                pending = { block: b.id, pin: pinDef.name, kind: pinDef.kind };
                highlightTargets(pinDef.kind);
                // Name the block the way the sheet does: its instance
                // name where it has one, its id otherwise. On the
                // workbench the ids ARE the point ids, so this reads
                // 'Wiring from OAT.O' rather than 'oat.O'.
                setStatus('Wiring from ' + (b.name || b.id) + '.' + pinDef.name +
                          ' — click a matching input pin.');
                return;
            }
            // input pin clicked
            if (!pending) {
                setStatus('Start a wire at an output pin (right edge) first.');
                return;
            }
            if (pending.kind !== pinDef.kind) {
                setStatus('Type mismatch — ' + pending.kind + ' output can’t '
                          + 'feed a ' + pinDef.kind + ' input.');
                return;
            }
            if (pending.block === b.id) {
                setStatus('A block can’t wire to itself directly.');
                cancelWire();
                return;
            }
            // one wire per input pin — replace any existing
            graph.wires = graph.wires.filter(
                (w) => !(w.to[0] === b.id && w.to[1] === pinDef.name));
            graph.wires.push({
                id: 'w' + (++wireSeq),
                from: [pending.block, pending.pin],
                to: [b.id, pinDef.name],
            });
            cancelWire();
            renderAll();
            setStatus(running ? 'Running' : 'Paused');
            emitChange();
        }

        function highlightTargets(kind) {
            graph.blocks.forEach((b) => {
                const el = els[b.id];
                if (!el) return;
                el.querySelectorAll('.fbe-pin-in').forEach((pinEl) => {
                    pinEl.classList.toggle('fbe-pin-target', pinEl.dataset.kind === kind);
                });
            });
        }

        function cancelWire() {
            pending = null;
            inner.querySelectorAll('.fbe-pin-target')
                .forEach((p) => p.classList.remove('fbe-pin-target'));
        }

        function setStatus(msg) { statusEl.textContent = msg; }

        // ── simulation loop ─────────────────────────────────────────
        function stepOnce() {
            engine.tick(graph, DT);
            refreshValues();
        }

        // The sheet is hidden below the desktop width (see the CSS gate), so
        // there's no point spinning the 10 Hz scan there — gate the loop on
        // viewport width. A touch tablet ≥1000px keeps ticking, but its canvas
        // is hidden too, so the only cost is a few idle ticks no one sees.
        const desktopMQ = window.matchMedia('(min-width: 1000px)');

        function startLoop() {
            // autoloop:false → the host drives ticks; this module spins no
            // interval of its own.
            if (!autoloop) return;
            if (tickHandle !== null) return;
            if (!desktopMQ.matches) return;
            // Don't spin the 10 Hz loop in a tab opened directly into the
            // background (Ctrl/middle-click) — visibilitychange only fires on
            // a TRANSITION, so without this the loop ran from loadExample()
            // until first focus. The visibilitychange handler restarts it on
            // un-hide via `else if (running) startLoop()` (codebase-issues #110).
            if (document.hidden) return;
            tickHandle = window.setInterval(stepOnce, DT * 1000);
        }
        function stopLoop() {
            if (tickHandle === null) return;
            window.clearInterval(tickHandle);
            tickHandle = null;
        }

        function setRunning(on) {
            running = on;
            runBtn.textContent = on ? 'Pause' : 'Run';
            setStatus(on ? 'Running' : 'Paused');
            // Live-signal wire animation only plays while the sim runs —
            // a paused sheet is static (the CSS keys off this class).
            canvasEl.classList.toggle('fbe-running', on);
            if (on) startLoop(); else stopLoop();
        }

        function resetSim() {
            // Clear every block's runtime state and outputs; keep the
            // graph. Timers restart, the PID integral zeroes, latches drop.
            graph.blocks.forEach((b) => { b.state = {}; b.out = {}; b.in = {}; });
            stepOnce();
        }

        function loadExample(key) {
            graph = engine.makeGraph(examples[key]);
            selected = null;
            wireSeq = 0;
            ensureWireIds();
            renderAll();
            resetSim();
            setRunning(true);
            canvasEl.scrollLeft = 0;
            canvasEl.scrollTop = 0;
            emitChange();
        }

        function setGraph(literal) {
            graph = engine.makeGraph(literal);
            selected = null;
            wireSeq = 0;
            ensureWireIds();
            renderAll();
            resetSim();
            emitChange();
        }

        function clearCanvas() {
            graph = { blocks: [], wires: [] };
            selected = null;
            dropSeq = 0;   // restart the drop grid at the top-left
            renderAll();
            setStatus(running ? 'Running' : 'Paused');
            emitChange();
        }

        // ── fullscreen reflow ───────────────────────────────────────
        // Fullscreen entry/exit reflows .fbe-canvas-inner: in fullscreen, CSS
        // expands it to fill the viewport-relative canvas; on exit we pin it
        // inline at the largest size used so blocks dragged into the extra
        // space remain reachable via the canvas scrollbar. The SVG wire layer
        // needs an explicit size + viewBox update at every transition since
        // its viewBox is the user-space coordinate system the wires + blocks
        // share. INNER_W / INNER_H follow so the drag clamp uses the new bounds.
        function onFullscreenChange(isFs) {
            if (isFs) {
                inner.style.width = '';
                inner.style.height = '';
                const r = inner.getBoundingClientRect();
                INNER_W = Math.max(INNER_W, Math.round(r.width));
                INNER_H = Math.max(INNER_H, Math.round(r.height));
            } else {
                inner.style.width  = INNER_W + 'px';
                inner.style.height = INNER_H + 'px';
            }
            relayout();
        }

        // Re-size the wire layer to the current bounds and re-route every
        // wire. Split out of onFullscreenChange so a host that resizes the
        // canvas some other way can call it directly.
        function relayout() {
            if (svg) {
                svg.style.width  = INNER_W + 'px';
                svg.style.height = INNER_H + 'px';
                svg.setAttribute('viewBox', '0 0 ' + INNER_W + ' ' + INNER_H);
            }
            drawWires();
        }

        // ── module-owned event handlers ─────────────────────────────
        // Click empty canvas — clear selection and any half-made wire.
        function onCanvasClick(e) {
            if (e.target.closest('.fbe-block')) return;
            if (e.target.closest('.fbe-wire-hit')) return;
            cancelWire();
            clearSelection();
            setStatus(running ? 'Running' : 'Paused');
        }

        // Delete / Backspace removes the selection (Escape cancels a wire).
        // The Escape branch claims the keypress (stopPropagation) only when a
        // wire was actually pending — otherwise the press bubbles up to the
        // window-level fullscreen-toggle.js listener, which exits fullscreen.
        function onKeyDown(e) {
            const t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT')) return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selected) { e.preventDefault(); deleteSelected(); }
            } else if (e.key === 'Escape') {
                const hadPending = !!pending;
                cancelWire();
                setStatus(running ? 'Running' : 'Paused');
                if (hadPending) e.stopPropagation();
            }
        }

        // Pause the loop in a backgrounded tab — no idle work (the
        // setInterval-with-lazy-stop posture from codebase-issues #1).
        function onVisibility() {
            if (document.hidden) stopLoop();
            else if (running) startLoop();
        }

        // Start/stop the scan as the window crosses the desktop width: resized
        // wider than 1000px the sheet reappears and should come alive; narrower
        // it's hidden, so stop the loop.
        function onMQChange() {
            if (desktopMQ.matches) { if (running) startLoop(); }
            else stopLoop();
        }

        function destroy() {
            stopLoop();
            canvasEl.removeEventListener('click', onCanvasClick);
            keyScope.removeEventListener('keydown', onKeyDown);
            if (autoloop) {
                document.removeEventListener('visibilitychange', onVisibility);
                desktopMQ.removeEventListener('change', onMQChange);
            }
        }

        // ── construction ────────────────────────────────────────────
        // A host-supplied canvas size inline-sizes the inner div up
        // front (the stylesheet's 900×480 is only the no-JS default);
        // renderAll() sizes the wire layer to match on every rebuild.
        if (canvasSize) {
            inner.style.width  = INNER_W + 'px';
            inner.style.height = INNER_H + 'px';
        }
        buildPalette();
        canvasEl.addEventListener('click', onCanvasClick);
        keyScope.addEventListener('keydown', onKeyDown);
        if (autoloop) {
            document.addEventListener('visibilitychange', onVisibility);
            desktopMQ.addEventListener('change', onMQChange);
        }

        if (cfg.initialGraph) {
            setGraph(cfg.initialGraph);
        } else if (cfg.initialExampleKey) {
            loadExample(cfg.initialExampleKey);
        } else {
            renderAll();
            setStatus(running ? 'Running' : 'Paused');
        }

        // ── public API ──────────────────────────────────────────────
        return {
            getGraph: function () { return graph; },
            setGraph: setGraph,
            loadExample: loadExample,
            clearCanvas: clearCanvas,
            addBlock: addBlock,
            tick: function (d) {
                engine.tick(graph, typeof d === 'number' ? d : DT);
                refreshValues();
            },
            step: function () { if (running) setRunning(false); stepOnce(); },
            refresh: refreshValues,
            setRunning: setRunning,
            isRunning: function () { return running; },
            reset: resetSim,
            onFullscreenChange: onFullscreenChange,
            relayout: relayout,
            destroy: destroy,
        };
    }

    return { createEditor: createEditor };
})();

if (typeof window !== 'undefined') { window.FBEEditor = FBEEditor; }
