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
//   block = { id, type, x, y, params, state?, out?, in? }
//   wire  = { from: [blockId, outPin], to: [blockId, inPin] }
//
// A block definition is { label, category, inputs, outputs, params,
// stateful, evaluate(ins, params, state, dt) → { out } }. Pins carry a
// `kind` of 'bool' or 'number'; the page uses it to type-check wires and
// to colour them.
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

    // ── block catalog ───────────────────────────────────────────────
    // Each evaluate() returns { out: { pinName: value } }. Stateful
    // blocks read and mutate `state` (an object, {} on first tick).
    const BLOCKS = {

        // — Boolean —
        and: {
            label: 'AND', category: 'Boolean',
            inputs: [{ name: 'A', kind: 'bool' }, { name: 'B', kind: 'bool' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: asBool(i.A) && asBool(i.B) } }),
        },
        or: {
            label: 'OR', category: 'Boolean',
            inputs: [{ name: 'A', kind: 'bool' }, { name: 'B', kind: 'bool' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: asBool(i.A) || asBool(i.B) } }),
        },
        xor: {
            label: 'XOR', category: 'Boolean',
            inputs: [{ name: 'A', kind: 'bool' }, { name: 'B', kind: 'bool' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: asBool(i.A) !== asBool(i.B) } }),
        },
        not: {
            label: 'NOT', category: 'Boolean',
            inputs: [{ name: 'IN', kind: 'bool' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: !asBool(i.IN) } }),
        },
        sr: {
            // Set-dominant SR latch: S wins when both S and R are true.
            label: 'SR LATCH', category: 'Boolean', stateful: true,
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
        gt: {
            label: 'A > B', category: 'Comparator',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: asNum(i.A) > asNum(i.B) } }),
        },
        lt: {
            label: 'A < B', category: 'Comparator',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: asNum(i.A) < asNum(i.B) } }),
        },
        ge: {
            label: 'A ≥ B', category: 'Comparator',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: asNum(i.A) >= asNum(i.B) } }),
        },
        le: {
            label: 'A ≤ B', category: 'Comparator',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: asNum(i.A) <= asNum(i.B) } }),
        },
        eq: {
            label: 'A = B', category: 'Comparator',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: Math.abs(asNum(i.A) - asNum(i.B)) < EPS } }),
        },
        ne: {
            label: 'A ≠ B', category: 'Comparator',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'Q', kind: 'bool' }],
            evaluate: (i) => ({ out: { Q: Math.abs(asNum(i.A) - asNum(i.B)) >= EPS } }),
        },

        // — Math (number, number → number) —
        add: {
            label: 'ADD', category: 'Math',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'O', kind: 'number' }],
            evaluate: (i) => ({ out: { O: asNum(i.A) + asNum(i.B) } }),
        },
        sub: {
            label: 'SUBTRACT', category: 'Math',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'O', kind: 'number' }],
            evaluate: (i) => ({ out: { O: asNum(i.A) - asNum(i.B) } }),
        },
        mul: {
            label: 'MULTIPLY', category: 'Math',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'O', kind: 'number' }],
            evaluate: (i) => ({ out: { O: asNum(i.A) * asNum(i.B) } }),
        },
        div: {
            // Divide guards against /0 — a zero divisor outputs 0 rather
            // than Infinity / NaN, so a downstream comparator stays sane.
            label: 'DIVIDE', category: 'Math',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'O', kind: 'number' }],
            evaluate: (i) => {
                const b = asNum(i.B);
                return { out: { O: b === 0 ? 0 : asNum(i.A) / b } };
            },
        },
        min: {
            label: 'MIN', category: 'Math',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'O', kind: 'number' }],
            evaluate: (i) => ({ out: { O: Math.min(asNum(i.A), asNum(i.B)) } }),
        },
        max: {
            label: 'MAX', category: 'Math',
            inputs: [{ name: 'A', kind: 'number' }, { name: 'B', kind: 'number' }],
            outputs: [{ name: 'O', kind: 'number' }],
            evaluate: (i) => ({ out: { O: Math.max(asNum(i.A), asNum(i.B)) } }),
        },

        // — Timers (stateful) —
        ton: {
            // On-delay: Q goes true once IN has been continuously true
            // for `pt` seconds. ET is the running elapsed time.
            label: 'TON', category: 'Timer', stateful: true,
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
            label: 'TOF', category: 'Timer', stateful: true,
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
            label: 'SELECT', category: 'Selection',
            inputs: [
                { name: 'SEL', kind: 'bool' },
                { name: 'IN0', kind: 'number' },
                { name: 'IN1', kind: 'number' },
            ],
            outputs: [{ name: 'O', kind: 'number' }],
            evaluate: (i) => ({ out: { O: asBool(i.SEL) ? asNum(i.IN1) : asNum(i.IN0) } }),
        },
        limit: {
            label: 'LIMIT', category: 'Selection',
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
            label: 'CONSTANT', category: 'I/O',
            inputs: [],
            outputs: [{ name: 'O', kind: 'number' }],
            params: [{ name: 'value', label: 'Value', kind: 'number', default: 0 }],
            evaluate: (i, p) => ({ out: { O: asNum(p.value) } }),
        },
        ai: {
            label: 'ANALOG IN', category: 'I/O',
            inputs: [],
            outputs: [{ name: 'O', kind: 'number' }],
            params: [{ name: 'value', label: 'Value', kind: 'number', default: 0 }],
            evaluate: (i, p) => ({ out: { O: asNum(p.value) } }),
        },
        bi: {
            label: 'BINARY IN', category: 'I/O',
            inputs: [],
            outputs: [{ name: 'O', kind: 'bool' }],
            params: [{ name: 'state', label: 'State', kind: 'bool', default: false }],
            evaluate: (i, p) => ({ out: { O: p.state === true } }),
        },
        ao: {
            // Sink — no outputs. The page reads `.in.IN` to display it.
            label: 'ANALOG OUT', category: 'I/O',
            inputs: [{ name: 'IN', kind: 'number' }],
            outputs: [],
            evaluate: () => ({ out: {} }),
        },
        bo: {
            label: 'BINARY OUT', category: 'I/O',
            inputs: [{ name: 'IN', kind: 'bool' }],
            outputs: [],
            evaluate: () => ({ out: {} }),
        },
        readout: {
            label: 'READOUT', category: 'I/O',
            inputs: [{ name: 'IN', kind: 'number' }],
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
            label: 'PID', category: 'Control', stateful: true,
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
                // one. Equivalent to d(err)/dt when SP is constant.
                const dPv = s.init ? (pv - s.prevPv) / dt : 0;
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

    // A fresh block instance with default params filled in.
    function createBlock(type, id, x, y) {
        const def = BLOCKS[type];
        if (!def) throw new Error('unknown block type: ' + type);
        const params = {};
        (def.params || []).forEach((p) => { params[p.name] = p.default; });
        return { id, type, x: x || 0, y: y || 0, params, state: {}, out: {}, in: {} };
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
            b.out = res.out || {};
            b.in = ins;
            evaluated.add(id);
        });
    }

    return { BLOCKS, CATEGORIES, createBlock, makeGraph, tick };
})();

if (typeof window !== 'undefined') { window.FBE = FBE; }
