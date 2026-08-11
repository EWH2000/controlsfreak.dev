// ──────────────────────────────────────────────────────────────────────
// ddcw-shell.js — the DDC Workbench SHELL: the unit-agnostic half of a
// workbench page, extracted from simulators/ddc-workbench-fcu.html so a
// second unit page can share it. One host tick drives everything:
// binding → FBE program scan → priority arbitration → unit physics →
// paint. The shell owns the tabs, the persistent statusbar (live IO
// chips + program picker), the off-program window, the per-actuator
// PriorityArray command store, and the lazy Function-Block Editor
// mount; a UNIT script owns physics, the graphic and the hand
// controls, and reaches the command store only through the host hooks.
//
// Loaded as a *classic* script (no type="module"), same convention as
// /scripts/fbe-editor.js and /scripts/point-arbitration.js: a consuming
// page adds
//
//     <script src="/scripts/psychro-engine.js"></script>   (unit dep)
//     <script src="/scripts/fbe-engine.js"></script>
//     <script src="/scripts/fbe-editor.js"></script>
//     <script src="/scripts/point-arbitration.js"></script>
//     <script src="/scripts/ddcw-session.js"></script>     (optional)
//     <script src="/scripts/ddcw-shell.js"></script>
//     <script src="/scripts/ddcw-<unit>-unit.js"></script>
//     <script src="/scripts/ui.js"></script>               (switchTab)
//
// inside its {% block scripts %}, BEFORE its own inline IIFE, which
// assembles the unit object and calls DDCWShell.createWorkbench(unit).
// The 11ty build copies this file through unchanged — nothing
// transpiles or bundles.
//
// The FACTORY touches the DOM; the FILE does not. Nothing outside
// createWorkbench() reads `document`, so a vm context can load this
// source and exercise the pure helpers (formatPointValue) without a
// browser; window.Units is read at CALL time by the display helpers.
//
// API (window.DDCWShell):
//
//   DDCWShell.createWorkbench(unit, opts)
//       Boot the workbench: build the statusbar chips and the program
//       picker from the unit config, create one PriorityArray per
//       actuator point, wire the unit's controls through the host
//       hooks, and start the single 10 Hz host tick. `opts` is the
//       shell-side extension seam (same rule as the sync context
//       below): a future shell option is a new key on it, not a
//       signature change on every page. No keys are defined today.
//
//   DDCWShell.formatPointValue(p, raw)
//       The ONE point-value formatter (pure — safe to call headless).
//       Binary points render ON/OFF; analog points convert at the
//       display boundary per the point's `conv` (see the contract).
//
//   DDCWShell.dispTempNum(f) / DDCWShell.tSuffix() / DDCWShell.dSuffix()
//       Generic window.Units display wrappers — one decimal in metric,
//       per the worked-example rounding policy. They live on the SHELL
//       (codebase-issues #218) and are exposed as statics so unit
//       scripts render through the SAME conversion path as the chip
//       strip and the off-program window — the surfaces can't drift.
//
// ── THE UNIT CONTRACT ── the `unit` object createWorkbench consumes:
//
//   id, prefix           strings (informational — the unit's page-id
//                        prefix, e.g. its widget-CSS prefix).
//   points               array of point configs — the whole data
//       surface the shell walks (chips, binding, arbitration,
//       off-program window all iterate unit.points, never a
//       hard-coded list):
//       { id, kind: 'ai'|'bi'|'ao'|'bo'|'param',
//         dir: 'sensor'|'actuator'|'param', plantKey, name,
//         unit?, conv?, min?, max?, step?, relinquishDefault? }
//       • BINDING INVARIANT (load-bearing): a point's id === the seed
//         FBE-block id in every program === the IO block the programs
//         author. bindingTick joins graph blocks to plant keys
//         through that identity.
//       • relinquishDefault (the real BACnet property) is REQUIRED on
//         every dir:'actuator' point: the value the point rests at
//         when its whole priority array is NULL. It comes from the
//         point config ALONE — the shell has no fallback table, so a
//         missing one resolves to undefined and fails loudly rather
//         than inventing a safe value.
//       • conv drives formatPointValue: 'temp' converts an absolute
//         temperature at the display boundary; 'deltaTemp' converts a
//         temperature DIFFERENCE. `unit` cannot stand in for conv — a
//         °F-labelled deadband run through the absolute formula would
//         print -16.1 °C for a 3 °F band. No conv = unitless or
//         already-universal (%), passed through with the `unit` label.
//   programs             { key → FBE graph literal } — the sample
//                        library; keys are the picker option values
//                        and the editor's example keys.
//   programLabels        { key → human label } for the picker options.
//   defaultProgram       the programs key loaded + selected on boot.
//   canvasSize           { w, h } — passed through to
//                        FBEEditor.createEditor (the wiresheet bounds
//                        the unit's program layouts were authored to).
//   speedDefault         × real time — the sim clock's boot value.
//   maxDtSim             s — per-tick sim-time clamp (integrator
//                        safety; the unit knows its own stiffness).
//   createPlant()        → plant. The shell treats it as opaque except
//                        plant.sensors / plant.actuators / plant.params
//                        (keyed by plantKey), which the binding reads
//                        and writes.
//   update(plant, dtSim)      physics — integrate one speed-scaled step.
//   renderUnit(plant)         paint the unit graphic + readouts.
//   syncControls(plant, ctx)  reflect plant + slot state into the hand
//       controls. ctx is an extensible OBJECT, not a mode string:
//       ctx.slot8(pointId) → the slot-8 value, null = released;
//       ctx.simSpeed()     → the live host clock multiplier;
//       ctx.paramWritable(pointId) → true while the RUNNING graph
//       carries a value-bearing block under that id (the const a
//       param point binds to). False = the freeze case: bindingTick
//       skips a missing block, so plant.params holds the last value
//       and a rail edit would have nowhere to land — the unit's
//       param inputs disable off this probe.
//       A future shell-side signal (occupancy, alarm, a second
//       operator surface) is a new key here, not a signature change
//       on every unit.
//   hydrateControls(plant, ctx)  OPTIONAL — re-seed the controls
//       syncControls deliberately never writes, called ONCE and only on
//       a session restore (codebase-issues #275). syncControls owns the
//       steady-state paint and is written not to fight a drag: it skips
//       a HELD slider (the user's hand is on it) and never touches the
//       environment knobs at all, because those set the world rather
//       than reflect it. Both of those are correct every tick except
//       the first tick after a restore, where the plant says 20 °F
//       outside and the OA handle is still parked at its authored
//       default. This hook is that one-shot reconciliation: write the
//       held sliders from ctx.slot8(pointId), the environment sliders
//       from their plant fields, the clock slider from ctx.simSpeed(),
//       and any forced-sensor box from plant.override. Same ctx object
//       syncControls gets. A unit without the hook simply boots with
//       stale handles — the shell no-ops on a missing one.
//   wireControls(plant, host) bind the unit's DOM controls, once. The
//       host hooks are the ONLY way unit code touches the command
//       store — arbitration stays shell code, controls stay unit code:
//       host.writeSlot8(pointId, v) / host.releaseSlot8(pointId) /
//       host.slot8(pointId) / host.setSpeed(v) / host.requestRender() /
//       host.highlightChip(pointId) (pulse a point's statusbar chip —
//       see the sensor-glyph note in the markup contract below) /
//       host.writeParam(pointId, v) (write a param point's live value
//       — see the param write path note below).
//
// ── PARAM WRITE PATH ── host.writeParam(pointId, value) is how an
// operator-graphic surface (a unit page's parameter rail) adjusts a
// param point. The canonical live value of a param is
// blk.params.value on the const block of the RUNNING graph (block id
// === point id, the binding invariant); plant.params is a per-tick
// block → plant mirror, so writing IT directly is clobbered within
// one tick. The hook validates a finite number, writes the block,
// and repaints; it returns false — writing nothing — when the sheet
// carries no such block (Clear, or a deleted const on a custom
// sheet). It is deliberately DUMB: clamping, unit conversion and any
// range announcement are UNIT-side UI concerns (the roster owns
// min/max), exactly as the hand controls own their own validation.
// A writeParam does NOT mark the program custom — it edits a value
// on the sheet, same as an inspector param edit, not the sheet's
// structure — and a program switch still resets params to the
// authored literals, both matching the wiresheet's own behaviour.
//   initAnim(plant)      start the unit's own animation machinery.
//   onResize(plant, isFullscreen)  reflow hook on the fullscreen edge.
//
//   Boot call order: createPlant → [session restore] → wireControls →
//   initAnim → hydrateControls (restore only) → first hostTick
//   (renderUnit / syncControls / statusbar) → [resumed notice]. A unit
//   may therefore resolve its DOM handles inside wireControls, and
//   hydrateControls can count on them.
//
// ── SESSION PERSISTENCE ── (codebase-issues #275) if
// /scripts/ddcw-session.js is loaded before this file, the shell
// snapshots the whole simulation to sessionStorage on the way out and
// restores it on the way back. The unit needs to know almost nothing
// about it: the snapshot is the plant, the running graph, the priority
// arrays, the sim clock and the program key, and the only unit-side
// surface is the optional hydrateControls hook above. Without the
// module the shell boots pristine exactly as it always did — the
// `window.DDCWSession` probe is the whole feature gate.
//
// Two shell invariants the restore is written around:
//   • CONSTRUCT THEN ASSIGN. Every step that can throw runs into a
//     local; `plant` / `graph` / `cmd` are reassigned only once all of
//     them have succeeded, so a malformed snapshot leaves the pristine
//     boot standing rather than a half-built one.
//   • A snapshot never gets a privileged construction path. The graph
//     rebuilds through FBE.makeGraph, the same call a program switch
//     makes, and the plant merges onto a FRESH unit.createPlant().
//
// ── MARKUP CONTRACT ── the fixed ddcw-* skeleton the factory binds:
//   #ddcw-io (chip strip) · #ddcw-program (an EMPTY <select> — options
//   are built here from programs/programLabels, plus the disabled
//   'custom' option) · #ddcw-offprog + #ddcw-offprog-list (the live
//   region; empty = the .is-empty collapse, never `hidden`) ·
//   #ddcw-resumed + #ddcw-resumed-msg + #ddcw-resumed-fresh (the
//   session notice — ships with the `hidden` ATTRIBUTE and is unhidden
//   only on a restore) and the separate, always-present, always-empty
//   polite region #ddcw-resumed-sr · tab
//   buttons `.tabs.tabs-flush [data-tab]` with panes #tab-unit /
//   #tab-wiresheet · the editor nodes #ddcw-fbe-canvas / -inner /
//   -palette / -inspector / -status / -run and the sim-bar buttons
//   `#tab-wiresheet [data-fbe-action]` · `.tool-card` (fullscreen
//   event target). Chrome CSS: the DDC WORKBENCH SHELL section of
//   styles.css.
//   OPTIONAL sensor glyphs: a unit graphic may mark where a sensed
//   point's physical device lives with
//   `<g class="ddcw-sensor" data-point="<point-id>">` groups (native
//   SVG <title> = the accessible name). The shell binds them
//   generically at boot — a click pulses that point's statusbar chip
//   via highlightChip. data-point must equal a unit.points id; an
//   unknown id no-ops. Zero glyphs is fine.
//   ⚠ FOCUSABILITY IS A PER-PAGE DECISION, NOT PART OF THIS
//   CONTRACT. A graphic that keeps `role="img"` prunes its own
//   subtree, so nothing inside it may carry `tabindex` or
//   `role="button"` — both workbench pages are in that shape (owner
//   ruling, codebase-issues #227b) and supply the keyboard path as
//   real HTML buttons OUTSIDE the SVG, in the point mirror. The
//   keydown binding below stays for a future graphic that drops
//   role="img" and hides its duplicated text instead; on a page
//   without tabindex it is simply inert, because the node never
//   takes focus.
//
// Command arbitration: every actuator point owns a real 16-slot
// priority array (window.PriorityArray). The sequence writes slot 16,
// the hand controls write slot 8 (Manual Operator), and
// plant.actuators[*] is always the RESOLVED value — the unit's
// physics, graphic and chips never see an unarbitrated command.
//
// NOTHING UNIT-SPECIFIC LIVES HERE. Nothing in this file may key off
// FCU control ids — or any unit's control ids: the shell speaks only
// of unit.points, plant keys and the ddcw-* skeleton. Grep-provable:
// a case-insensitive grep for the FCU prefix over this file hits ONLY
// this header's contract prose — zero code identifiers. Intended
// consumers, both assembling a unit object and calling
// createWorkbench: simulators/ddc-workbench-fcu.html (the DX fan coil
// unit, via /scripts/ddcw-fcu-unit.js) and simulators/ddc-workbench.html
// (the AHU, via /scripts/ddcw-ahu-unit.js).
//
// Consumers: simulators/ddc-workbench-fcu.html,
// simulators/ddc-workbench.html.
// Tests: tests/ddcw-shell.spec.js pins this header's own claims
// engine-direct (bare-vm loadability, formatPointValue's conv paths,
// the grep proof); tests/ddc-workbench-fcu.spec.js +
// tests/ddc-workbench-fcu-priority.spec.js drive the built page;
// tests/point-arbitration.spec.js proves the arbitration core
// engine-direct.
// ──────────────────────────────────────────────────────────────────────

'use strict';

const DDCWShell = (function () {
    'use strict';

    const DT = 0.1;                             // host tick step, seconds (10 Hz)

    // ── Units display helpers ── round metric to one decimal; a
    // displayed delta is the arithmetic of the displayed operands so
    // the on-screen math closes (the metric worked-example rounding
    // policy). Moved here from the unit half (codebase-issues #218):
    // they are generic window.Units wrappers with no unit knowledge,
    // and formatPointValue closes over them.
    function dispTempNum(f) {
        const U = window.Units;
        const v = U.current() === 'us' ? f : U.display.temp(f);
        return Math.round(v * 10) / 10;
    }
    function tSuffix() { return window.Units.suffix.temp(); }
    function dSuffix() { return window.Units.suffix.deltaTemp(); }

    // ── point-value formatter — the ONE formatter the chip strip and
    // the off-program window share, so the two surfaces can't disagree
    // about what a value looks like. Binary points render ON/OFF;
    // analog points convert at the display boundary (codebase-issues
    // #212): the plant is canonical IP throughout, and the strip used
    // to print the raw Fahrenheit number under a hard-coded '°F' label
    // — so in metric it disagreed with the readout mirror directly
    // above it (24.4 °C vs 75.9 °F, same value). Uses the same
    // dispTempNum / tSuffix / dSuffix the unit paints through, so the
    // strip and the graphic can't drift. p.conv distinguishes an
    // absolute temp from a delta; see the points schema in the unit
    // contract (header) for why `unit` can't.
    function formatPointValue(p, raw) {
        if (p.kind === 'bo' || p.kind === 'bi') {
            return raw === true ? 'ON' : 'OFF';
        }
        const n = Number(raw);
        let num, lbl = p.unit;
        if (!isFinite(n)) {
            num = '—';
        } else if (p.conv === 'temp') {
            num = dispTempNum(n).toFixed(1);
            lbl = tSuffix();
        } else if (p.conv === 'deltaTemp') {
            const U = window.Units;
            const d = U.current() === 'us' ? n : U.display.deltaTemp(n);
            num = (Math.round(d * 10) / 10).toFixed(1);
            lbl = dSuffix();
        } else {
            num = p.kind === 'ao'
                ? String(Math.round(n))
                : String(Math.round(n * 10) / 10);
        }
        return num + (lbl ? ' ' + lbl : '');
    }

    // ── the workbench factory — every document touch lives in here ──
    // `opts` is deliberately accepted (and unread today) — see the API
    // note in the header.
    function createWorkbench(unit, opts) {
        const FBE       = window.FBE;
        const FBEEditor = window.FBEEditor;

        // ── shell state (assigned in the init sequence at the bottom) ──
        let plant, graph;
        let byId  = {};
        // Sim clock (generic — the unit sets the default + clamp at init).
        // One speed-scaled dtSim drives BOTH the binding/FBE.tick and the
        // unit integrator, so control timers and the plant share one clock.
        let simSpeed  = 1;                      // × real time (host-clock multiplier)
        let simMaxDt  = 5;                      // s — per-tick sim-time clamp
        let editor = null, editorBuilt = false, wiresheetVisible = false;
        let programKey = null;                  // current sample key, or null = custom
        let suppressCustom = false;             // true while WE load a program
        const chipVals = {};                    // pointId → statusbar value node
        // pointId → PriorityArray state, one per actuator point (built in
        // init from unit.points — dir === 'actuator' only). Deliberately
        // NEVER reset on program switch, editor Reset, or Clear: a priority
        // array lives on the POINT, not in the program, so a slot-8 hand
        // value survives a program download exactly as it does in the
        // field. That persistence IS the lesson this page teaches (the
        // months-old stale override) — do not "fix" it by re-creating the
        // arrays when the sheet changes.
        const cmd = {};

        // ── roster-named programs ──────────────────────────────────────────
        // A block on a workbench sheet whose id matches a point id IS that
        // point (point id === FBE block id is the load-bearing binding
        // invariant), so its name comes from the ROSTER — the same string
        // the statusbar chip and the off-program window already print. The
        // program literals therefore carry no `name:` of their own for an
        // IO block; duplicating the roster strings into them would be two
        // sources for one word, and the first rename would break the tie.
        //
        // This is derived ONCE, up front, off the pristine `unit.programs`
        // — not stamped after each FBE.makeGraph(). The editor clones a
        // program literal itself on every loadExample() (a program switch)
        // and again on construction, so a post-makeGraph stamp in the shell
        // would be silently lost on the first re-mount or program change.
        // Naming the SOURCE the editor clones from covers every path, and
        // `unit.programs` stays untouched for anything else reading it.
        // A block the user drops from the palette gets an id like 'b3' and
        // matches no point, so it stays unnamed — correct: it is not a
        // point.
        const programs = {};

        function buildNamedPrograms() {
            const nameById = {};
            unit.points.forEach(function (p) { if (p.name) nameById[p.id] = p.name; });
            Object.keys(unit.programs).forEach(function (key) {
                const g = JSON.parse(JSON.stringify(unit.programs[key]));
                g.blocks.forEach(function (b) {
                    if (nameById[b.id]) b.name = nameById[b.id];
                });
                programs[key] = g;
            });
        }

        // ── generic binding driver (names NO unit point) ───────────────────
        function reindex(g) {
            byId = {};
            g.blocks.forEach(function (b) { byId[b.id] = b; });
        }

        function bindingTick(dt) {
            const pts = unit.points;
            let i, p, blk, v;
            // sensors + params → into the seeded IO blocks
            for (i = 0; i < pts.length; i++) {
                p = pts[i];
                blk = byId[p.id];
                if (!blk) continue;
                if (p.dir === 'sensor') {
                    if (p.kind === 'ai') blk.params.value = plant.sensors[p.plantKey];
                    else if (p.kind === 'bi') blk.params.state = !!plant.sensors[p.plantKey];
                } else if (p.kind === 'param') {
                    // Params (setpoint / deadband) live in the wiresheet const
                    // block — the program's own config. Read them INTO plant
                    // (block → plant) so the IO chips display them AND a user
                    // edit of the const takes effect on the unit; a plant → block
                    // write would freeze them at the literal and clobber edits.
                    // A future plant-side setpoint schedule would seed the block
                    // at load instead, keeping this read for display.
                    plant.params[p.plantKey] = blk.params.value;
                }
            }
            FBE.tick(graph, dt);
            // actuators ← arbitration, UNCONDITIONALLY. The program's output
            // lands in slot 16 (the sequence); the hand hooks write slot 8
            // elsewhere; the plant always gets the RESOLVED value.
            for (i = 0; i < pts.length; i++) {
                p = pts[i];
                if (p.dir !== 'actuator') continue;
                blk = byId[p.id];
                if (blk) {
                    v = blk.in ? blk.in.IN : undefined;   // guard .in === {} pre-tick
                    // undefined = the block exists but hasn't been evaluated
                    // yet (only possible before its first FBE.tick). SKIP,
                    // don't release: a present block means the sequence is
                    // still writing, and it self-heals next tick — releasing
                    // would flap slot 16 through NULL for no reason.
                    if (v !== undefined) {
                        PriorityArray.write(cmd[p.id], 16, (p.kind === 'bo') ? (v === true) : v);
                    }
                } else {
                    // No block on the sheet (deleted, or Clear): nothing
                    // writes the sequence slot any more — release it.
                    PriorityArray.release(cmd[p.id], 16);
                }
                plant.actuators[p.plantKey] = PriorityArray.resolve(cmd[p.id]).value;
            }
        }

        // ── host tick loop (the SOLE ticker) ────────────────────────────────
        function hostTick() {
            // Compress the wall tick by the speed slider, then clamp so a
            // fast clock (or a tab-refocus hitch) can't destabilize the
            // forward-Euler integrator. The SAME dtSim goes to the binding
            // (→ FBE.tick) and to the unit integrator — one shared clock.
            let dtSim = DT * simSpeed;
            if (dtSim > simMaxDt) dtSim = simMaxDt;
            bindingTick(dtSim);
            unit.update(plant, dtSim);
            unit.renderUnit(plant);
            unit.syncControls(plant, syncCtx);
            renderStatusbar();
            if (editorBuilt && wiresheetVisible) editor.refresh();
        }
        function requestRender() { hostTick(); }   // immediate repaint on interaction

        // ── statusbar (generic — live IO chips + program + off-program) ────
        function initChips() {
            const strip = document.getElementById('ddcw-io');
            strip.innerHTML = '';
            unit.points.forEach(function (p) {
                const chip = document.createElement('span');
                chip.className = 'ddcw-chip';
                const cap = document.createElement('span');
                cap.className = 'ddcw-chip-cap';
                cap.textContent = p.name;
                const val = document.createElement('span');
                val.className = 'ddcw-chip-val';
                chip.appendChild(cap);
                chip.appendChild(val);
                strip.appendChild(chip);
                chipVals[p.id] = val;
            });
        }

        function updateChips() {
            unit.points.forEach(function (p) {
                const el = chipVals[p.id];
                if (!el) return;
                let raw;
                if (p.dir === 'sensor') raw = plant.sensors[p.plantKey];
                else if (p.kind === 'param') raw = plant.params[p.plantKey];
                else raw = plant.actuators[p.plantKey];
                let cls = '';
                if (p.kind === 'bo' || p.kind === 'bi') cls = raw === true ? 'on' : 'off';
                el.textContent = formatPointValue(p, raw);
                el.className = 'ddcw-chip-val' + (cls ? ' ' + cls : '');
            });
        }

        // ── off-program window — names every actuator point whose
        // resolved command is NOT the sequence at slot 16, GROUPED BY THE
        // SLOT IN PLAY: one line per slot family, each point rendered
        // "<name> <value>" and the family's teaching tail written once
        // (codebase-issues #283, treatment T-A). Walks unit.points (never
        // a hard-coded point list) and formats through formatPointValue, so
        // it makes no assumption about how many actuators a unit has or
        // what units they carry. Vocabulary matches tools/bacnet-priority:
        // 'slot 8 (Manual Operator)', slot 16 = the sequence, and
        // Relinquish_Default as the fallback property — never "slot 17".
        //
        // Why grouped: this window is FIXED CHROME above the fullscreen
        // instrument pane, so every row it grows comes straight out of the
        // machine — six sentences measured 154px of a 768px cockpit (29%
        // of the pane) with 57% of the band's width empty, and a preset
        // seizes every actuator at once, so that is the common path rather
        // than the corner. Nothing the per-point sentences carried is
        // lost — which points, which slot, at what value, how to release —
        // only the repeated tail, and the shared clause reads as the
        // shared CAUSE: one hand on six points, not six unrelated events.
        //
        // The grouping key is the RESOLVED SLOT the walk already computed,
        // never a second membership test — a point is in the slot-8 family
        // because its own resolve said 8. Grouping by slot (rather than by
        // the three-way "manual / released / other") is also what keeps
        // the fallback arm honest: two points held at different slots get
        // two lines, each naming its own.
        //
        // Signature-guarded repaint: the host ticks at 10 Hz and this is an
        // aria-live region, so rewriting the DOM every tick would spam a
        // screen reader (and burn layout). The joined LINE text is the
        // signature — it carries every point's value, so it still changes
        // on a units toggle and a future temperature-carrying entry
        // re-renders in the right unit.
        let offprogSig = null;
        function renderOffProgram() {
            const box  = document.getElementById('ddcw-offprog');
            const list = document.getElementById('ddcw-offprog-list');
            // One bucket per slot in play, in first-appearance order (so
            // the lines follow the roster the chips already run in). 'rd'
            // keys the released case — slot 16 NULL, resting on
            // Relinquish_Default — so it can never collide with a slot
            // number.
            const families = [];
            const byKey = {};
            unit.points.forEach(function (p) {
                if (p.dir !== 'actuator') return;
                const r = PriorityArray.resolve(cmd[p.id]);
                if (r.slot === 16) return;      // following the program — not listed
                const key = r.slot === null ? 'rd' : 's' + r.slot;
                if (!byKey[key]) {
                    byKey[key] = { slot: r.slot, members: [] };
                    families.push(byKey[key]);
                }
                byKey[key].members.push({ point: p, value: r.value });
            });
            const entries = families.map(function (fam) {
                const many = fam.members.length > 1;
                const all = many ? 'all ' : '';
                const named = fam.members.map(function (m) {
                    return m.point.name + ' ' + formatPointValue(m.point, m.value);
                }).join(' · ');
                if (fam.slot === null) {
                    // Slot 16 can only be NULL when the block is gone: a
                    // present block always evaluates (unwired inputs read
                    // false/0), so the sequence writes it every tick. The
                    // missing BLOCK ids stay enumerated even when the tail
                    // is shared — they are the one part of this line that
                    // is per point, and they are what a reader carries
                    // back to the wiresheet.
                    const ids = fam.members.map(function (m) { return m.point.id; });
                    const blocks = many
                        ? ids.slice(0, -1).join(', ') + ' or ' + ids[ids.length - 1] + ' blocks'
                        : ids[0] + ' block';
                    return named + ' — slot 16 is NULL (no ' + blocks
                        + ' on the wiresheet) — ' + all + 'holding Relinquish_Default.';
                }
                if (fam.slot === 8) {
                    return named + ' — ' + all
                        + 'commanded by slot 8 (Manual Operator) — write NULL to release.';
                }
                // Unreachable from the shell's own hooks (only 8 and 16
                // are written), but the array underneath is a full
                // sixteen slots — don't render a lie if that changes.
                return named + ' — ' + all + 'commanded by slot ' + fam.slot + '.';
            });
            const sig = entries.join('\n');
            if (sig === offprogSig) return;
            offprogSig = sig;
            list.textContent = '';
            entries.forEach(function (t) {
                const li = document.createElement('li');
                li.textContent = t;
                list.appendChild(li);
            });
            // .is-empty, not the hidden attribute: the region must STAY
            // in the accessibility tree while empty — a live region that
            // enters the tree already populated announces nothing, and
            // the empty→first-entry edge is exactly the event this
            // window exists to announce.
            box.classList.toggle('is-empty', entries.length === 0);
        }
        // ── sensor-glyph chip pulse ── highlightChip(pointId) marks a
        // point's statusbar chip for a beat, so activating a sensor
        // glyph on the unit graphic shows WHICH chip that physical
        // device feeds. Unit-agnostic: pointId resolves through
        // chipVals (built from unit.points); an unknown id no-ops.
        // Mechanism is one temporary CSS class + a CSS transition
        // (.ddcw-chip-hilite — page-inline for now, see the page's
        // head block) and a one-shot timeout — deliberately no rAF
        // loop and no interval: this page's idle cost is profiled
        // (tests/perf-profile.mjs), and the pulse must cost nothing
        // while nobody is clicking. A re-trigger restarts the hold;
        // a second glyph steals the mark from the first.
        const HILITE_MS = 1200;
        let hiliteTimer = null;
        let hiliteChip = null;
        function highlightChip(pointId) {
            const val = chipVals[pointId];
            if (!val || !val.parentNode) return;
            const chip = val.parentNode;
            if (hiliteChip && hiliteChip !== chip) hiliteChip.classList.remove('ddcw-chip-hilite');
            if (hiliteTimer !== null) window.clearTimeout(hiliteTimer);
            chip.classList.add('ddcw-chip-hilite');
            hiliteChip = chip;
            hiliteTimer = window.setTimeout(function () {
                chip.classList.remove('ddcw-chip-hilite');
                hiliteChip = null;
                hiliteTimer = null;
            }, HILITE_MS);
        }

        function syncProgramSelect() {
            const sel = document.getElementById('ddcw-program');
            const want = programKey || 'custom';
            if (sel.value !== want) sel.value = want;
        }
        function renderStatusbar() { updateChips(); syncProgramSelect(); renderOffProgram(); }

        // ── program picker — options are built FROM the unit config
        // (programs + programLabels), so the markup ships an empty
        // <select> and a second unit page can't drift from its own
        // program set. The disabled 'custom' option is the shell's own:
        // never user-selectable, it only DISPLAYS when a structural
        // edit marks the running program custom (onGraphChange →
        // syncProgramSelect). ──
        function buildProgramPicker() {
            const sel = document.getElementById('ddcw-program');
            Object.keys(unit.programs).forEach(function (key) {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = (unit.programLabels && unit.programLabels[key]) || key;
                sel.appendChild(opt);
            });
            const custom = document.createElement('option');
            custom.value = 'custom';
            custom.disabled = true;
            custom.textContent = 'Custom (edited)';
            sel.appendChild(custom);
        }

        // ── program picker + graph single-source contract ───────────────────
        function onGraphChange(g) {
            graph = g;
            reindex(g);
            // A structural edit (add/delete block or wire) that we didn't
            // initiate marks the running program "custom".
            if (!suppressCustom) programKey = null;
        }
        function loadProgram(key) {
            if (!programs[key]) return;
            programKey = key;
            if (editorBuilt) {
                suppressCustom = true;
                editor.loadExample(key);        // replaces graph → onGraphChange recaptures
                suppressCustom = false;
            } else {
                graph = FBE.makeGraph(programs[key]);
                reindex(graph);
            }
            syncProgramSelect();
        }

        // ── lazy editor mount (built once, on first Wiresheet open) ──────────
        function ensureEditor() {
            if (editorBuilt) return;
            // The construction's setGraph fires onGraphChange with the editor's
            // NEW (deep-cloned) internal graph object — capture it, but don't
            // let it mark the program "custom".
            suppressCustom = true;
            editor = FBEEditor.createEditor({
                engine: FBE,
                elements: {
                    canvas:    document.getElementById('ddcw-fbe-canvas'),
                    inner:     document.getElementById('ddcw-fbe-inner'),
                    palette:   document.getElementById('ddcw-fbe-palette'),
                    inspector: document.getElementById('ddcw-fbe-inspector'),
                    status:    document.getElementById('ddcw-fbe-status'),
                    runButton: document.getElementById('ddcw-fbe-run'),
                },
                // The roster-named copies, NOT unit.programs — the editor
                // re-clones from this registry on every program switch,
                // so it is what has to carry the names.
                examples: programs,
                initialGraph: graph,            // share the already-running graph
                // Canvas bounds come from the unit config — the sheet
                // layouts and the canvas they were authored to move
                // together (the consuming page's assembly IIFE documents
                // its numbers where the program literals live).
                canvasSize: unit.canvasSize,
                autoloop: false,                // the HOST drives ticks
                keyScope: document.getElementById('tab-wiresheet'),
                onChange: onGraphChange,
            });
            suppressCustom = false;
            editorBuilt = true;
            // Sim-bar buttons — Run/Pause toggles the wire-flow animation
            // (the host keeps ticking); Reset re-arms latches/timers; Clear
            // empties the sheet to author from scratch.
            document.querySelectorAll('#tab-wiresheet [data-fbe-action]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    switch (btn.dataset.fbeAction) {
                        case 'run':   editor.setRunning(!editor.isRunning()); break;
                        case 'reset': editor.reset(); break;
                        case 'clear': editor.clearCanvas(); break;
                    }
                });
            });
            editor.refresh();
        }

        // ── tabs ─────────────────────────────────────────────────────────────
        function showTab(name) {
            wiresheetVisible = (name === 'wiresheet');
            if (wiresheetVisible) {
                ensureEditor();                 // pane is already visible (switchTab ran first)
                const fs = document.body.classList.contains('has-fullscreen-tool');
                editor.onFullscreenChange(fs);  // re-measure in fullscreen, pin otherwise
                editor.refresh();
            }
        }

        // ── init sequence ───────────────────────────────────────────────────
        plant = unit.createPlant();
        // One priority array per actuator point. relinquishDefault comes
        // from the point config ALONE — no shell-side fallback, so a unit
        // that forgets one ships a visibly-undefined resting value instead
        // of a silently-invented safe one.
        unit.points.forEach(function (p) {
            if (p.dir === 'actuator') cmd[p.id] = PriorityArray.create(p.relinquishDefault);
        });
        // The unit declares its sim-clock preferences (generic contract).
        if (isFinite(unit.speedDefault)) simSpeed = unit.speedDefault;
        if (isFinite(unit.maxDtSim))     simMaxDt = unit.maxDtSim;
        programKey = unit.defaultProgram;
        // Derive the roster-named program registry before the first clone
        // — everything downstream (this graph, the editor's `examples`,
        // every later loadProgram) reads `programs`, never `unit.programs`.
        buildNamedPrograms();
        graph = FBE.makeGraph(programs[programKey]);
        reindex(graph);

        // ── session restore (codebase-issues #275) ─────────────────────
        // Construct-then-assign: rebuildGraph and applyPlant both run into
        // LOCALS, and nothing above is reassigned until both have come
        // back, so a snapshot that fails anywhere leaves the pristine boot
        // standing. Feature-gated on the module being present — a page
        // that does not load /scripts/ddcw-session.js boots exactly as it
        // did before this existed.
        //
        // Every failure path is silent and every one ends in a removeItem:
        // a snapshot that survived `validate` and then failed to rebuild
        // is poison, and leaving it in place would fail identically on
        // every subsequent load of the tab.
        const Session = window.DDCWSession;
        let resumed = false;
        if (Session) {
            const raw = Session.read(unit.id);
            if (raw) {
                const snap = Session.validate(raw, unit);
                if (!snap) {
                    // Wrong version, wrong unit, or the shape digest moved
                    // under it (a model change, a new point, a re-authored
                    // sheet). Pristine boot, and drop it.
                    Session.clear(unit.id);
                } else {
                    try {
                        const nextGraph = Session.rebuildGraph(FBE, snap.graph);
                        const nextPlant = Session.applyPlant(unit.createPlant(), snap.plant);
                        // A restored key that no longer names a program
                        // reads as 'custom', which is the honest label for
                        // a sheet the picker cannot reproduce.
                        const nextKey = (snap.programKey && programs[snap.programKey])
                            ? snap.programKey : null;
                        graph = nextGraph;
                        reindex(graph);
                        plant = nextPlant;
                        programKey = nextKey;
                        if (isFinite(snap.simSpeed)) simSpeed = snap.simSpeed;
                        // Total by construction — walks the shell's own
                        // store, so a snapshot naming a retired point
                        // writes nothing. Last, so nothing after it can
                        // throw with the arrays half-loaded.
                        Session.applyCmd(cmd, snap.cmd);
                        resumed = true;
                    } catch (e) {
                        Session.clear(unit.id);
                    }
                }
            }
        }

        // ── session save ───────────────────────────────────────────────
        // NO timer and NO per-tick autosave. These pages' idle cost is
        // profiled (tests/perf-profile.mjs) and this feature is required
        // to add exactly zero idle work: the snapshot is taken on the way
        // out and nowhere else.
        //
        // Both triggers are needed and neither is redundant.
        // `visibilitychange → hidden` is the one that actually fires on a
        // mobile tab switch or an app backgrounding, where `pagehide` may
        // not; `pagehide` is the one that fires on a same-tab navigation.
        // Chrome fires the visibility change FIRST on a navigation, so the
        // dedupe flag is what keeps a single departure from serialising
        // the plant twice. It resets when the document comes back, so a
        // reader who tabs away and returns is snapshotted again next time.
        let saveSuppressed = false;    // start-fresh sets this before reloading
        let savedThisHide  = false;
        function saveNow() {
            if (!Session || saveSuppressed) return;
            Session.write(unit.id, Session.encode(unit, {
                fp: Session.fingerprint(unit),
                simSpeed: simSpeed,
                programKey: programKey,
                graph: graph,
                cmd: cmd,
                plant: plant,
            }));
        }
        function saveOnHide() {
            if (savedThisHide) return;
            savedThisHide = true;
            saveNow();
        }
        if (Session) {
            window.addEventListener('pagehide', saveOnHide);
            document.addEventListener('visibilitychange', function () {
                if (document.hidden) saveOnHide();
                else savedThisHide = false;
            });
            window.addEventListener('pageshow', function () { savedThisHide = false; });
        }

        // ── the resumed notice ─────────────────────────────────────────
        // A quiet one-shot line, not a dialog and not a focus steal: the
        // reader asked for the sub-sim, not for a conversation on the way
        // back. It has to SAY what came back, because one of the things
        // that came back is a forced sensor — and this page's whole
        // stale-override lesson depends on the reader knowing when a
        // lesson is running (codebase-issues #275, axis 3).
        //
        // Every node lookup is guarded. The workbench scripts are
        // per-page `{% block scripts %}` refs with no `?v=`, so a
        // returning visitor can hold a cached PAGE against a fresh
        // SCRIPT: a missing notice must be a missing notice, not a boot
        // failure that takes the whole simulator with it.
        function showResumedNotice() {
            const box   = document.getElementById('ddcw-resumed');
            const msg   = document.getElementById('ddcw-resumed-msg');
            const fresh = document.getElementById('ddcw-resumed-fresh');
            const sr    = document.getElementById('ddcw-resumed-sr');
            if (!box || !msg) return;
            box.hidden = false;
            if (fresh) {
                fresh.addEventListener('click', function () {
                    // BEFORE the clear, not after: `location.reload()`
                    // fires `pagehide`, and an un-suppressed save would
                    // write back the very snapshot just removed.
                    saveSuppressed = true;
                    if (Session) Session.clear(unit.id);
                    window.location.reload();
                });
            }
            // The polite mirror is a SEPARATE, always-present, always-empty
            // region, and it is written on a FOLLOW-UP TASK after the box
            // is already unhidden. Both halves are load-bearing: a live
            // region that enters the accessibility tree already populated
            // announces nothing (the same trap the off-program window
            // documents), and unhiding a `[hidden]` container in the same
            // task as its text is that case wearing a different hat. The
            // sentence is DERIVED from the visible copy rather than
            // duplicated, so the two cannot drift.
            if (sr) {
                window.setTimeout(function () {
                    const label = fresh ? fresh.textContent.trim() : '';
                    sr.textContent = msg.textContent.replace(/\s+/g, ' ').trim()
                        + (label ? ' Use the ' + label + ' button to reset it.' : '');
                }, 0);
            }
        }

        initChips();
        buildProgramPicker();
        // Sensor glyphs — bound here, not in unit code, so a second unit
        // page gets the behavior from its markup alone (see the markup
        // contract). The pointId comes from the markup's data-point, so
        // nothing here names a unit's points. keydown, not keyup, and
        // preventDefault on Space so it can't scroll the page under the
        // pulse.
        document.querySelectorAll('.ddcw-sensor[data-point]').forEach(function (g) {
            g.addEventListener('click', function () {
                highlightChip(g.getAttribute('data-point'));
            });
            g.addEventListener('keydown', function (e) {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                highlightChip(g.getAttribute('data-point'));
            });
        });
        // Host hooks — the ONLY way unit code touches the cmd store, so
        // arbitration stays shell code and controls stay unit code.
        // slot8() returns the slot-8 value, or null when released.
        const host = {
            writeSlot8:   function (pointId, value) { PriorityArray.write(cmd[pointId], 8, value); },
            releaseSlot8: function (pointId) { PriorityArray.release(cmd[pointId], 8); },
            slot8:        function (pointId) { return cmd[pointId].slots[8]; },
            setSpeed:     function (v) { if (isFinite(v)) simSpeed = v; },
            requestRender: requestRender,
            // The chip pulse, exposed to unit code too — the seam a
            // future drill-down (a glyph becoming a link into a
            // meter-and-sensor sim) can call on the way out.
            highlightChip: highlightChip,
            // The param write path (see the header note). The write
            // lands on the RUNNING graph's block — never plant.params,
            // which bindingTick overwrites from the block within one
            // tick. Deliberately dumb: a finite number and a block that
            // can hold it, or nothing happens. requestRender() makes
            // the edit propagate to chips / wells / rail in the same
            // synchronous tick.
            writeParam: function (pointId, value) {
                if (typeof value !== 'number' || !isFinite(value)) return false;
                const blk = byId[pointId];
                if (!blk || !blk.params || !('value' in blk.params)) return false;
                blk.params.value = value;
                requestRender();
                return true;
            },
        };
        // The sync context — deliberately an extensible OBJECT, not a mode
        // string: a future shell-side signal (occupancy, alarm, a second
        // operator surface) is a new key here, not a signature change on
        // every unit. Built once; hostTick hands it to unit.syncControls.
        // simSpeed() is the read hook the extraction added — the clock is
        // shell state, and a unit readout (the speed slider's value label)
        // must reflect the live multiplier, not a stale local mirror.
        const syncCtx = {
            slot8: host.slot8,
            simSpeed: function () { return simSpeed; },
            // The write-path probe for a unit's param inputs: false while
            // the running sheet carries no value-bearing block under the
            // point's id (Clear, or a deleted const), which is exactly
            // when bindingTick freezes the param — the unit disables the
            // input off this rather than letting an edit vanish.
            paramWritable: function (pointId) {
                const blk = byId[pointId];
                return !!(blk && blk.params && ('value' in blk.params));
            },
        };
        unit.wireControls(plant, host);
        unit.initAnim(plant);
        // One-shot reconciliation of the handles syncControls never writes
        // — see the hook's entry in the unit contract. Restore only, and
        // only where the unit supplies it.
        if (resumed && typeof unit.hydrateControls === 'function') {
            unit.hydrateControls(plant, syncCtx);
        }

        // Tabs — shared switchTab (ui.js), then lazy-mount / relayout the editor.
        document.querySelectorAll('.tabs.tabs-flush [data-tab]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                switchTab(btn.dataset.tab, e.currentTarget);
                showTab(btn.dataset.tab);
            });
        });

        // Program picker.
        document.getElementById('ddcw-program').addEventListener('change', function (e) {
            const key = e.currentTarget.value;
            if (!key || key === 'custom') return;
            loadProgram(key);
            requestRender();
        });

        // Fullscreen — reflow the unit + (if built & visible) the editor.
        const card = document.querySelector('.tool-card');
        if (card) {
            card.addEventListener('fullscreenchange', function (e) {
                const fs = !!(e.detail && e.detail.fullscreen);
                unit.onResize(plant, fs);
                if (editorBuilt && wiresheetVisible) { editor.onFullscreenChange(fs); editor.refresh(); }
            });
        }

        // Desktop-width crossing — re-measure the editor if it is showing.
        if (window.matchMedia) {
            const mq = window.matchMedia('(min-width: 1000px)');
            mq.addEventListener('change', function () {
                if (editorBuilt && wiresheetVisible) {
                    const fs = document.body.classList.contains('has-fullscreen-tool');
                    editor.onFullscreenChange(fs); editor.refresh();
                }
            });
        }

        // Re-render display on the global unit toggle (metric / US).
        document.addEventListener('unitschange', function () {
            unit.renderUnit(plant);
            unit.syncControls(plant, syncCtx);
        });

        syncProgramSelect();
        hostTick();                              // initial paint — the sequence is commanding on arrival
        // After the first paint, so the reader's eye lands on their own
        // restored machine and the notice explains what they are looking
        // at — not the other way round.
        if (resumed) showResumedNotice();
        window.setInterval(function () { if (!document.hidden) hostTick(); }, 100);
    }

    return {
        createWorkbench: createWorkbench,
        formatPointValue: formatPointValue,
        dispTempNum: dispTempNum,
        tSuffix: tSuffix,
        dSuffix: dSuffix,
    };
})();

if (typeof window !== 'undefined') { window.DDCWShell = DDCWShell; }
