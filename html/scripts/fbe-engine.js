// ──────────────────────────────────────────────────────────────────────
// fbe-engine.js — function-block simulation core for the Function-Block
// Editor (/simulators/function-block-editor.html).
//
// Loaded as a *classic* script (no type="module"): the page's logic lives
// in an IIFE-wrapped inline <script> whose bindings can't be reached from
// outside, so the engine exposes its API as a plain global. Same
// convention as /scripts/pid-engine.js, /scripts/psychro-engine.js, and
// /scripts/flow-engine.js. A page that wants the engine adds
//
//     <script src="/scripts/fbe-engine.js"></script>
//
// before its own inline <script>. The 11ty build copies this through
// unchanged — nothing transpiles or bundles.
//
// PURE — no DOM. The page owns the canvas, the drag/wire UI, and the tick
// *loop*; the engine owns only the block catalog and the per-tick
// evaluator.
//
// API (window.FBE):
//
//   FBE.BLOCKS                 catalog: type → block definition
//   FBE.CATEGORIES             palette group order
//   FBE.createBlock(type,id,x,y)   fresh instance with default params
//   FBE.makeGraph(def)         deep-clone a graph literal into a runnable
//                              graph (so example-program literals are
//                              never mutated)
//   FBE.tick(graph, dt)        evaluate the whole graph for one tick,
//                              mutating each block's `.out` / `.in` /
//                              `.state`
//
// A graph is { blocks: [...], wires: [...] }:
//   block = { id, type, x, y, params, state?, out?, in?, name? }
//   wire  = { from: [blockId, outPin], to: [blockId, inPin] }
//
// `name` is the OPTIONAL per-instance name — what this particular block
// does on this particular sheet ('Y1 Latch', 'Cool SP', 'OAT'), as
// distinct from what its TYPE is. fbe-editor.js renders it in the head
// as `tag · name`; with no name the head falls back to the type's
// `label`, exactly as it did before names existed. It is a TOP-LEVEL
// block field, never a param — params are the type's declared, tunable
// inputs (and tests/fbe-engine.spec.js's literal sweep rejects any key
// in `params` the type doesn't declare). makeGraph() is a JSON deep
// clone, so a `name` on a graph literal survives into the runnable
// graph with no engine involvement; createBlock() takes one so
// programmatic creation can set one too.
//
// A block definition is { label, tag, category, inputs, outputs, params,
// stateful, evaluate(ins, params, state, dt) → { out } }. `label` is the
// full type name, used by the palette buttons and the inspector title.
// `tag` is its short form (2–5 chars) — the only thing that fits in a
// 8.5rem block head beside an instance name, and therefore what the head
// renders. Pins carry a `kind` of 'bool' or 'number'; the page uses it
// to type-check wires and to colour them.
//
// Tick semantics: blocks are topologically sorted on the wire DAG, so a
// pure combinational chain settles in dependency order within one tick.
// Feedback edges (cycles) read the *previous* tick's value — the
// one-tick-delay convention. Stateful blocks (sr, ton, tof, pid) carry
// their own state across ticks, so feedback through them is stable.
// ──────────────────────────────────────────────────────────────────────

'use strict';

const FBE = (function () {
    'use strict';

    // ── helpers ─────────────────────────────────────────────────────
    const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
    const EPS = 1e-9;

    // Coerce a possibly-undefined pin value to the right type. Unwired
    // input pins and missing sources default to false / 0.
    const asBool = (v) => v === true;
    const asNum  = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

    // Coerce any non-finite numeric output to 0 at the boundary — the
    // mirror of asNum's input contract. A block that overflows to Infinity
    // (e.g. 1e300 * 1e300) or yields NaN must not store a raw non-finite
    // value: a downstream consumer reads it through asNum, which silently
    // turns it into 0 while the SOURCE block's value strip shows '—' (fmt
    // guards isFinite) — a display/logic split, and a comparator could
    // then report the mathematical opposite. Sanitizing here keeps the
    // ref-note's "a downstream comparator stays sane" promise on every
    // overflow path, not just an exact-zero divisor. Booleans/other types
    // pass through untouched. (codebase-issues #97)
    const sanitizeOut = (out) => {
        for (const k in out) {
            if (typeof out[k] === 'number' && !isFinite(out[k])) out[k] = 0;
        }
        return out;
    };

    // ── block catalog ───────────────────────────────────────────────
    // Each evaluate() returns { out: { pinName: value } }. Stateful
    // blocks read and mutate `state` (an object, {} on first tick).
    const BLOCKS = {

        // — Boolean —
        and: {
            label: 'AND', tag: 'AND', category: 'Boolean',
            inputs: [{ name: 'A', kind: 'bool' }, { name: 'B', kind: 'bool' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: asBool(i.A) && asBool(i.B) } }),
        },
        or: {
            label: 'OR', tag: 'OR', category: 'Boolean',
            inputs: [{ name: 'A', kind: 'bool' }, { name: 'B', kind: 'bool' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: asBool(i.A) || asBool(i.B) } }),
        },
        xor: {
            label: 'XOR', tag: 'XOR', category: 'Boolean',
            inputs: [{ name: 'A', kind: 'bool' }, { name: 'B', kind: 'bool' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: asBool(i.A) !== asBool(i.B) } }),
        },
        not: {
            label: 'NOT', tag: 'NOT', category: 'Boolean',
            inputs: [{ name: 'IN', kind: 'bool' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: !asBool(i.IN) } }),
        },
        sr: {
            // Set-dominant SR latch: S wins when both S and R are true.
            // The tag drops "LATCH": what KIND of latch this instance is
            // ('Y1 Latch', 'Trip Latch') belongs in the name.
            label: 'SR LATCH', tag: 'SR', category: 'Boolean', stateful: true,
            inputs: [{ name: 'S', kind: 'bool' }, { name: 'R', kind: 'bool' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i, p, s) => {
                let q = s.q || false;
                if (asBool(i.S)) q = true;
                else if (asBool(i.R)) q = false;
                s.q = q;
                return { out: { Q: q } };
            },
        },

        // — Comparators (number, number → bool) —
        // Comparator tags keep the PIN identity and drop the spaces:
        // the block body labels its two number inputs A and B, and the
        // head is the only place that says which way the test runs
        // between them. A bare '>' would save two characters and cost
        // that.
        // The ge / le / ne TAGS are ASCII while their labels keep the
        // real glyphs, and that asymmetry is deliberate: ≥ / ≤ / ≠ are
        // absent from the bundled Plex Mono subset AND outside the
        // unicode-range every @font-face here declares, so a glyph tag
        // would be sourced from whatever mono the visitor's system
        // falls back to — a second typeface at a second advance, inside
        // the one surface on the sheet that is budgeted to the pixel
        // (18 characters wide, and stacked on a row pitch with 0.28px
        // of clearance on the AHU workbench). ASCII keeps the head
        // deterministic; the label renders in running palette text
        // where a fallback face costs nothing. (Owner ruling
        // 2026-08-01, codebase-issues #255.)
        gt: {
            label: 'A > B', tag: 'A>B', category: 'Comparator',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: asNum(i.A) > asNum(i.B) } }),
        },
        lt: {
            label: 'A < B', tag: 'A<B', category: 'Comparator',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: asNum(i.A) < asNum(i.B) } }),
        },
        ge: {
            label: 'A ≥ B', tag: 'A>=B', category: 'Comparator',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: asNum(i.A) >= asNum(i.B) } }),
        },
        le: {
            label: 'A ≤ B', tag: 'A<=B', category: 'Comparator',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: asNum(i.A) <= asNum(i.B) } }),
        },
        eq: {
            label: 'A = B', tag: 'A=B', category: 'Comparator',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: Math.abs(asNum(i.A) - asNum(i.B)) < EPS } }),
        },
        ne: {
            label: 'A ≠ B', tag: 'A!=B', category: 'Comparator',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: Math.abs(asNum(i.A) - asNum(i.B)) >= EPS } }),
        },

        // — Math (number, number → number) —
        add: {
            label: 'ADD', tag: 'ADD', category: 'Math',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'O', kind: 'number' }],
            evaluate: (i) => ({ out: { O: asNum(i.A) + asNum(i.B) } }),
        },
        sub: {
            label: 'SUBTRACT', tag: 'SUB', category: 'Math',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'O', kind: 'number' }],
            evaluate: (i) => ({ out: { O: asNum(i.A) - asNum(i.B) } }),
        },
        mul: {
            label: 'MULTIPLY', tag: 'MUL', category: 'Math',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'O', kind: 'number' }],
            evaluate: (i) => ({ out: { O: asNum(i.A) * asNum(i.B) } }),
        },
        div: {
            // Divide guards against /0 — a zero divisor outputs 0 rather
            // than Infinity / NaN, so a downstream comparator stays sane.
            label: 'DIVIDE', tag: 'DIV', category: 'Math',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'O', kind: 'number' }],
            evaluate: (i) => {
                const b = asNum(i.B);
                return { out: { O: b === 0 ? 0 : asNum(i.A) / b } };
            },
        },
        min: {
            label: 'MIN', tag: 'MIN', category: 'Math',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'O', kind: 'number' }],
            evaluate: (i) => ({ out: { O: Math.min(asNum(i.A), asNum(i.B)) } }),
        },
        max: {
            label: 'MAX', tag: 'MAX', category: 'Math',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'O', kind: 'number' }],
            evaluate: (i) => ({ out: { O: Math.max(asNum(i.A), asNum(i.B)) } }),
        },

        // — Timers (stateful) —
        ton: {
            // On-delay: Q goes true once IN has been continuously true
            // for `pt` seconds. ET is the running elapsed time.
            label: 'TON', tag: 'TON', category: 'Timer', stateful: true,
            inputs: [{ name: 'IN', kind: 'bool' }],
            outputs: [{ name: 'Q', kind: 'bool' }, { name: 'ET', kind: 'number' }],
            params: [{ name: 'pt', label: 'Preset (s)', kind: 'number', default: 5 }],
            evaluate: (i, p, s, dt) => {
                const pt = Math.max(0, asNum(p.pt));
                let et = s.et || 0;
                if (asBool(i.IN)) et = Math.min(et + dt, pt);
                else et = 0;
                s.et = et;
                return { out: { Q: asBool(i.IN) && et >= pt, ET: et } };
            },
        },
        tof: {
            // Off-delay: Q stays true for `pt` seconds after IN drops.
            label: 'TOF', tag: 'TOF', category: 'Timer', stateful: true,
            inputs: [{ name: 'IN', kind: 'bool' }],
            outputs: [{ name: 'Q', kind: 'bool' }, { name: 'ET', kind: 'number' }],
            params: [{ name: 'pt', label: 'Preset (s)', kind: 'number', default: 5 }],
            evaluate: (i, p, s, dt) => {
                const pt = Math.max(0, asNum(p.pt));
                let q = s.q || false;
                let et = s.et || 0;
                if (asBool(i.IN)) { q = true; et = 0; }
                else if (q) { et += dt; if (et >= pt) q = false; }
                s.q = q; s.et = et;
                return { out: { Q: q, ET: et } };
            },
        },

        // — Selection —
        select: {
            label: 'SELECT', tag: 'SEL', category: 'Selection',
            inputs: [
                { name: 'SEL', kind: 'bool' },
                { name: 'IN0', kind: 'number' },
                { name: 'IN1', kind: 'number' },
            ],
            outputs: [{ name: 'O', kind: 'number' }],
            evaluate: (i) => ({ out: { O: asBool(i.SEL) ? asNum(i.IN1) : asNum(i.IN0) } }),
        },
        limit: {
            label: 'LIMIT', tag: 'LIM', category: 'Selection',
            inputs: [{ name: 'IN', kind: 'number' }],
            outputs: [{ name: 'O', kind: 'number' }],
            params: [
                { name: 'lo', label: 'Low', kind: 'number', default: 0 },
                { name: 'hi', label: 'High', kind: 'number', default: 100 },
            ],
            evaluate: (i, p) => ({ out: { O: clamp(asNum(i.IN), asNum(p.lo), asNum(p.hi)) } }),
        },

        // — I/O (sources and sinks) —
        const: {
            // 'CONST', not 'CON': CON reads as *controller* in a BAS
            // context. The extra character is the tightest name budget
            // on the sheet — constants get 10 characters, not 12.
            label: 'CONSTANT', tag: 'CONST', category: 'I/O',
            inputs: [],
            outputs: [{ name: 'O', kind: 'number' }],
            params: [{ name: 'value', label: 'Value', kind: 'number', default: 0 }],
            evaluate: (i, p) => ({ out: { O: asNum(p.value) } }),
        },
        ai: {
            label: 'ANALOG IN', tag: 'AI', category: 'I/O',
            inputs: [],
            outputs: [{ name: 'O', kind: 'number' }],
            params: [{ name: 'value', label: 'Value', kind: 'number', default: 0 }],
            evaluate: (i, p) => ({ out: { O: asNum(p.value) } }),
        },
        bi: {
            label: 'BINARY IN', tag: 'BI', category: 'I/O',
            inputs: [],
            outputs: [{ name: 'O', kind: 'bool' }],
            params: [{ name: 'state', label: 'State', kind: 'bool', default: false }],
            evaluate: (i, p) => ({ out: { O: p.state === true } }),
        },
        ao: {
            // Sink — no outputs. The page reads `.in.IN` to display it.
            // This is ALSO the display-only sink: a separate 'readout'
            // type used to sit beside it, structurally identical (one
            // number input, no outputs, same value strip), and was
            // folded away 2026-08-01. A display-only output is an
            // editor invention — in the field an output is an output,
            // and the instance NAME says what it drives ('HW Vlv',
            // 'Fan Spd'). Don't reintroduce a type to carry that.
            label: 'ANALOG OUT', tag: 'AO', category: 'I/O',
            inputs: [{ name: 'IN', kind: 'number' }],
            outputs: [],
            evaluate: () => ({ out: {} }),
        },
        bo: {
            label: 'BINARY OUT', tag: 'BO', category: 'I/O',
            inputs: [{ name: 'IN', kind: 'bool' }],
            outputs: [],
            evaluate: () => ({ out: {} }),
        },

        // — Control —
        pid: {
            // Per-tick PID with conditional-integration anti-windup.
            // Output is clamped 0–100 %. `action` picks the error sign:
            // reverse-acting (heating) raises output as PV falls below
            // SP; direct-acting (cooling) raises it as PV climbs above.
            // The derivative term is on PV (not on error) — an SP change
            // doesn't kick the output, matching the rule in pid-basics.
            // Distinct from pid-engine.js's simulatePid (a whole
            // step-response simulation) — this is one controller block.
            label: 'PID', tag: 'PID', category: 'Control', stateful: true,
            inputs: [{ name: 'SP', kind: 'number' }, { name: 'PV', kind: 'number' }],
            outputs: [{ name: 'OUT', kind: 'number' }],
            params: [
                { name: 'kc', label: 'Gain (Kc)', kind: 'number', default: 4 },
                { name: 'ti', label: 'Integral Ti (s)', kind: 'number', default: 60 },
                { name: 'td', label: 'Derivative Td (s)', kind: 'number', default: 0 },
                {
                    name: 'action', label: 'Action', kind: 'enum',
                    options: ['reverse', 'direct'], default: 'reverse',
                },
            ],
            evaluate: (i, p, s, dt) => {
                const sp = asNum(i.SP), pv = asNum(i.PV);
                const kc = asNum(p.kc);
                const ti = asNum(p.ti);
                const td = asNum(p.td);
                const err = p.action === 'direct' ? pv - sp : sp - pv;
                // Derivative on PV: a rising PV adds to a direct-acting
                // controller's output, subtracts from a reverse-acting
                // one. Equivalent to d(err)/dt when SP is constant. Guard
                // dt>0 — a tick with dt=0 (a paused/single-frame caller)
                // would divide by zero and push NaN through OUT; the div
                // block guards /0 the same way. (codebase-issues #98)
                const dPv = (s.init && dt > 0) ? (pv - s.prevPv) / dt : 0;
                const deriv = p.action === 'direct' ? dPv : -dPv;
                const integral = s.integral || 0;
                const iTry = integral + err * dt;
                const term = (iv) => kc * (err + (ti > 0 ? iv / ti : 0) + td * deriv);
                let raw = term(iTry);
                if (raw > 100 || raw < 0) {
                    // Saturated — hold the integral (conditional
                    // integration) so it can't wind up further.
                    raw = term(integral);
                } else {
                    s.integral = iTry;
                }
                s.prevPv = pv;
                s.init = true;
                return { out: { OUT: clamp(raw, 0, 100) } };
            },
        },
    };

    // Palette group order.
    const CATEGORIES = ['I/O', 'Boolean', 'Comparator', 'Math', 'Timer', 'Selection', 'Control'];

    // ── instance + graph helpers ────────────────────────────────────

    // A fresh block instance with default params filled in. `name` is
    // optional — a block dragged out of the palette has none, and its
    // head falls back to the type's label until the user types one into
    // the inspector. The key is only set when a name was supplied, so
    // an unnamed block's shape is byte-identical to what this returned
    // before names existed.
    function createBlock(type, id, x, y, name) {
        const def = BLOCKS[type];
        if (!def) throw new Error('unknown block type: ' + type);
        const params = {};
        (def.params || []).forEach((p) => { params[p.name] = p.default; });
        const b = { id, type, x: x || 0, y: y || 0, params, state: {}, out: {}, in: {} };
        if (typeof name === 'string' && name.trim() !== '') b.name = name.trim();
        return b;
    }

    // Deep-clone a graph literal into a runnable graph. Example-program
    // definitions stay pristine — every load gets its own copy with
    // fresh state.
    function makeGraph(def) {
        const g = JSON.parse(JSON.stringify(def));
        g.blocks.forEach((b) => {
            const bdef = BLOCKS[b.type];
            // Reject unknown block types at graph-construction time —
            // tick() short-circuits past them, but the param-backfill
            // loop below would crash on `bdef.params`. createBlock()
            // throws on the same case; match its shape.
            if (!bdef) {
                throw new Error('unknown block type: ' + b.type +
                                ' (block ' + b.id + ')');
            }
            b.params = b.params || {};
            // Backfill any param the literal omitted.
            (bdef.params || []).forEach((p) => {
                if (!(p.name in b.params)) b.params[p.name] = p.default;
            });
            b.state = {};
            b.out = {};
            b.in = {};
        });
        g.wires = g.wires || [];
        return g;
    }

    // ── evaluation ──────────────────────────────────────────────────

    // Kahn topological sort on the wire DAG. Nodes left in a cycle are
    // appended at the end in declaration order; their feedback edges
    // fall back to the previous tick's value during evaluate().
    function topoOrder(graph) {
        const ids = graph.blocks.map((b) => b.id);
        const indeg = {}, adj = {};
        ids.forEach((id) => { indeg[id] = 0; adj[id] = []; });
        graph.wires.forEach((w) => {
            const s = w.from[0], t = w.to[0];
            if (s === t || !(s in indeg) || !(t in indeg)) return;
            adj[s].push(t);
            indeg[t]++;
        });
        const queue = ids.filter((id) => indeg[id] === 0);
        const order = [];
        while (queue.length) {
            const id = queue.shift();
            order.push(id);
            adj[id].forEach((t) => { if (--indeg[t] === 0) queue.push(t); });
        }
        const seen = new Set(order);
        ids.forEach((id) => { if (!seen.has(id)) order.push(id); });
        return order;
    }

    // Evaluate the whole graph for one tick of `dt` seconds. Mutates
    // every block's `.out` (computed outputs), `.in` (resolved input
    // values — used by the page for sinks and live wire labels), and
    // `.state` (stateful blocks).
    function tick(graph, dt) {
        const byId = {};
        graph.blocks.forEach((b) => {
            byId[b.id] = b;
            if (!b.state) b.state = {};
            if (!b.out) b.out = {};
        });

        // inputMap[blockId][pinName] = [sourceBlockId, sourcePinName]
        const inputMap = {};
        graph.wires.forEach((w) => {
            const [tb, tp] = w.to;
            (inputMap[tb] || (inputMap[tb] = {}))[tp] = w.from;
        });

        // Snapshot last tick's outputs for feedback (back-edge) reads.
        const prevOut = {};
        graph.blocks.forEach((b) => { prevOut[b.id] = Object.assign({}, b.out); });

        const evaluated = new Set();
        topoOrder(graph).forEach((id) => {
            const b = byId[id];
            const def = BLOCKS[b.type];
            if (!def) return;
            const ins = {};
            def.inputs.forEach((pin) => {
                const src = inputMap[id] && inputMap[id][pin.name];
                let v;
                if (src) {
                    const [sid, sp] = src;
                    // A source already evaluated this tick gives a fresh
                    // value; anything else (a cycle back-edge) reads the
                    // previous tick — the one-tick-delay convention.
                    const o = evaluated.has(sid) ? (byId[sid] && byId[sid].out) : prevOut[sid];
                    v = o ? o[sp] : undefined;
                }
                if (v === undefined) v = pin.kind === 'bool' ? false : 0;
                ins[pin.name] = v;
            });
            const res = def.evaluate(ins, b.params || {}, b.state, dt) || {};
            b.out = sanitizeOut(res.out || {});
            b.in = ins;
            evaluated.add(id);
        });
    }

    return { BLOCKS, CATEGORIES, createBlock, makeGraph, tick };
})();

if (typeof window !== 'undefined') { window.FBE = FBE; }
