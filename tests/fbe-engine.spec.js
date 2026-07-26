// Engine-direct tests for /scripts/fbe-engine.js. Lives under
// tests/*.spec.js so the same `npm test` (Playwright) runner picks it
// up — Playwright workers are Node processes, the `page` fixture is
// just unused here. Same loader trick as psychro-engine.spec.js.
//
// fbe-engine.js is a classic browser script ending in
// `const FBE = (function(){…})();` plus a window guard. A trailing
// `; FBE` expression makes `runInNewContext` return the engine; the
// window guard is skipped (no `window` in the vm context).

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

function loadEngine() {
    const src = fs.readFileSync(
        path.join(__dirname, '..', 'html', 'scripts', 'fbe-engine.js'),
        'utf8',
    );
    return vm.runInNewContext(src + '\n; FBE;', {});
}

// Convenience — build a runnable graph and return a (block-id → block)
// lookup alongside it, since tests assert on individual blocks.
function run(FBE, def, dt, ticks) {
    const g = FBE.makeGraph(def);
    for (let n = 0; n < (ticks || 1); n++) FBE.tick(g, dt);
    const by = {};
    g.blocks.forEach((b) => { by[b.id] = b; });
    return { g, by };
}

test.describe('fbe-engine: catalog + helpers', () => {

    test('every catalog block has the required shape', () => {
        const FBE = loadEngine();
        for (const [type, def] of Object.entries(FBE.BLOCKS)) {
            expect(Array.isArray(def.inputs), type + ' inputs').toBe(true);
            expect(Array.isArray(def.outputs), type + ' outputs').toBe(true);
            expect(typeof def.evaluate, type + ' evaluate').toBe('function');
            expect(FBE.CATEGORIES, type + ' category').toContain(def.category);
        }
    });

    test('createBlock fills default params', () => {
        const FBE = loadEngine();
        const pid = FBE.createBlock('pid', 'p1', 10, 20);
        expect(pid.params.action).toBe('reverse');
        expect(pid.params.kc).toBe(4);
        expect(pid.x).toBe(10);
        const ton = FBE.createBlock('ton', 't1');
        expect(ton.params.pt).toBe(5);
    });

    test('makeGraph deep-clones — the literal is never mutated', () => {
        const FBE = loadEngine();
        const def = {
            blocks: [{ id: 'c', type: 'const', x: 0, y: 0, params: { value: 7 } }],
            wires: [],
        };
        const g = FBE.makeGraph(def);
        g.blocks[0].params.value = 999;
        expect(def.blocks[0].params.value).toBe(7);
    });

    test('makeGraph throws a clear error on an unknown block type', () => {
        // tick() short-circuits past unknown sources, but makeGraph's
        // param-backfill loop would have crashed on `.params` of an
        // undefined catalog entry. Now it throws at construction time
        // with the bad type and the offending block id.
        const FBE = loadEngine();
        const def = {
            blocks: [{ id: 'x', type: 'no-such-block', x: 0, y: 0 }],
            wires: [],
        };
        expect(() => FBE.makeGraph(def)).toThrow(/no-such-block/);
        expect(() => FBE.makeGraph(def)).toThrow(/block x/);
    });
});

test.describe('fbe-engine: evaluation', () => {

    test('a combinational chain settles in a single tick', () => {
        // const 2 + const 3 → add → gt vs const 4. If the topo sort is
        // working, `gt` sees `add`'s fresh 5 the same tick (5 > 4).
        const FBE = loadEngine();
        const def = {
            blocks: [
                { id: 'a',   type: 'const', x: 0, y: 0, params: { value: 2 } },
                { id: 'b',   type: 'const', x: 0, y: 0, params: { value: 3 } },
                { id: 'sum', type: 'add',   x: 0, y: 0 },
                { id: 'c',   type: 'const', x: 0, y: 0, params: { value: 4 } },
                { id: 'cmp', type: 'gt',    x: 0, y: 0 },
            ],
            wires: [
                { from: ['a', 'O'],   to: ['sum', 'A'] },
                { from: ['b', 'O'],   to: ['sum', 'B'] },
                { from: ['sum', 'O'], to: ['cmp', 'A'] },
                { from: ['c', 'O'],   to: ['cmp', 'B'] },
            ],
        };
        const { by } = run(FBE, def, 0.1, 1);
        expect(by.sum.out.O).toBe(5);
        expect(by.cmp.out.Q).toBe(true);
    });

    test('SR latch is set-dominant and holds state', () => {
        const FBE = loadEngine();
        const def = {
            blocks: [
                { id: 's', type: 'bi', x: 0, y: 0, params: { state: false } },
                { id: 'r', type: 'bi', x: 0, y: 0, params: { state: false } },
                { id: 'l', type: 'sr', x: 0, y: 0 },
            ],
            wires: [
                { from: ['s', 'O'], to: ['l', 'S'] },
                { from: ['r', 'O'], to: ['l', 'R'] },
            ],
        };
        const g = FBE.makeGraph(def);
        const by = {}; g.blocks.forEach((b) => { by[b.id] = b; });

        FBE.tick(g, 0.1);
        expect(by.l.out.Q).toBe(false);          // starts reset

        by.s.params.state = true;
        FBE.tick(g, 0.1);
        expect(by.l.out.Q).toBe(true);           // S sets it

        by.s.params.state = false;
        FBE.tick(g, 0.1);
        expect(by.l.out.Q).toBe(true);           // latch holds with S gone

        by.s.params.state = true;
        by.r.params.state = true;
        FBE.tick(g, 0.1);
        expect(by.l.out.Q).toBe(true);           // S wins over R (set-dominant)

        by.s.params.state = false;
        FBE.tick(g, 0.1);
        expect(by.l.out.Q).toBe(false);          // R alone resets
    });

    test('TON delays its output by the preset time', () => {
        const FBE = loadEngine();
        const def = {
            blocks: [
                { id: 'in', type: 'bi',  x: 0, y: 0, params: { state: true } },
                { id: 't',  type: 'ton', x: 0, y: 0, params: { pt: 0.5 } },
            ],
            wires: [{ from: ['in', 'O'], to: ['t', 'IN'] }],
        };
        const g = FBE.makeGraph(def);
        const t = g.blocks.find((b) => b.id === 't');

        for (let n = 0; n < 4; n++) FBE.tick(g, 0.1);
        expect(t.out.Q).toBe(false);             // 0.4 s elapsed — not yet
        expect(t.out.ET).toBeCloseTo(0.4, 6);

        FBE.tick(g, 0.1);
        expect(t.out.Q).toBe(true);              // 0.5 s — preset reached
    });

    test('TOF holds its output high for the preset after IN drops', () => {
        // Mirror of the TON test: a TOF goes true immediately when IN
        // rises and stays true for `pt` seconds after IN drops.
        const FBE = loadEngine();
        const def = {
            blocks: [
                { id: 'in', type: 'bi',  x: 0, y: 0, params: { state: true } },
                { id: 't',  type: 'tof', x: 0, y: 0, params: { pt: 0.5 } },
            ],
            wires: [{ from: ['in', 'O'], to: ['t', 'IN'] }],
        };
        const g = FBE.makeGraph(def);
        const inBlk = g.blocks.find((b) => b.id === 'in');
        const t     = g.blocks.find((b) => b.id === 't');

        FBE.tick(g, 0.1);
        expect(t.out.Q).toBe(true);              // IN true → Q immediately true
        expect(t.out.ET).toBe(0);

        inBlk.params.state = false;
        for (let n = 0; n < 4; n++) FBE.tick(g, 0.1);
        expect(t.out.Q).toBe(true);              // 0.4 s after drop — still holding
        expect(t.out.ET).toBeCloseTo(0.4, 6);

        FBE.tick(g, 0.1);
        expect(t.out.Q).toBe(false);             // 0.5 s after drop — releases
    });

    test('PID drives its output toward setpoint and clamps to 0–100', () => {
        const FBE = loadEngine();
        const def = {
            blocks: [
                { id: 'sp', type: 'const', x: 0, y: 0, params: { value: 75 } },
                { id: 'pv', type: 'const', x: 0, y: 0, params: { value: 70 } },
                { id: 'c',  type: 'pid',   x: 0, y: 0,
                  params: { kc: 4, ti: 30, td: 0, action: 'reverse' } },
            ],
            wires: [
                { from: ['sp', 'O'], to: ['c', 'SP'] },
                { from: ['pv', 'O'], to: ['c', 'PV'] },
            ],
        };
        const g = FBE.makeGraph(def);
        const c = g.blocks.find((b) => b.id === 'c');

        FBE.tick(g, 0.1);
        const first = c.out.OUT;
        expect(first).toBeGreaterThan(0);        // PV below SP, reverse-acting
        expect(first).toBeLessThanOrEqual(100);

        for (let n = 0; n < 200; n++) FBE.tick(g, 0.1);
        expect(c.out.OUT).toBeGreaterThan(first); // integral keeps climbing
        expect(c.out.OUT).toBeLessThanOrEqual(100);
    });

    test('PID conditional-integration prevents wind-up during saturation', () => {
        // Saturate the controller hard so the proportional term alone
        // pins the output at 100, then reverse the error by a small
        // amount. With conditional integration (the integral is held
        // while the output is saturated) the held integral lets the
        // output drop straight to 0 on the reversal tick; without
        // anti-windup, the integral would have accumulated 100 ticks
        // worth of error and would still hold the output positive.
        const FBE = loadEngine();
        const def = {
            blocks: [
                { id: 'sp', type: 'ai',  x: 0, y: 0, params: { value: 80 } },
                { id: 'pv', type: 'ai',  x: 0, y: 0, params: { value: 50 } },
                { id: 'c',  type: 'pid', x: 0, y: 0,
                  params: { kc: 4, ti: 30, td: 0, action: 'reverse' } },
            ],
            wires: [
                { from: ['sp', 'O'], to: ['c', 'SP'] },
                { from: ['pv', 'O'], to: ['c', 'PV'] },
            ],
        };
        const g = FBE.makeGraph(def);
        const pvBlk = g.blocks.find((b) => b.id === 'pv');
        const ctl   = g.blocks.find((b) => b.id === 'c');

        // Kc=4, err=30 → P term alone = 120, past the 100 ceiling.
        // Saturation persists every tick; integral is held at 0.
        for (let n = 0; n < 100; n++) FBE.tick(g, 0.1);
        expect(ctl.out.OUT).toBe(100);

        // Small reversal — PV just above SP, err = -5. With the held
        // integral, term = kc * (-5 + 0/ti) = -20 → clamps to 0.
        // Without anti-windup the integral would be ≈ 300 and term
        // would be kc * (-5 + 300/30) = +20, holding output positive.
        pvBlk.params.value = 85;
        FBE.tick(g, 0.1);
        expect(ctl.out.OUT).toBe(0);
    });

    test('PID direct-acting raises its output as PV climbs above SP', () => {
        // Mirror of the reverse-acting test, but with action:'direct'.
        // PV > SP should drive the output up (cooling demand grows as
        // the room gets hotter).
        const FBE = loadEngine();
        const def = {
            blocks: [
                { id: 'sp', type: 'const', x: 0, y: 0, params: { value: 75 } },
                { id: 'pv', type: 'const', x: 0, y: 0, params: { value: 80 } },
                { id: 'c',  type: 'pid',   x: 0, y: 0,
                  params: { kc: 4, ti: 30, td: 0, action: 'direct' } },
            ],
            wires: [
                { from: ['sp', 'O'], to: ['c', 'SP'] },
                { from: ['pv', 'O'], to: ['c', 'PV'] },
            ],
        };
        const g = FBE.makeGraph(def);
        const ctl = g.blocks.find((b) => b.id === 'c');

        FBE.tick(g, 0.1);
        const first = ctl.out.OUT;
        expect(first).toBeGreaterThan(0);
        expect(first).toBeLessThanOrEqual(100);

        for (let n = 0; n < 200; n++) FBE.tick(g, 0.1);
        expect(ctl.out.OUT).toBeGreaterThan(first); // integral climbs
        expect(ctl.out.OUT).toBeLessThanOrEqual(100);
    });

    test('a feedback cycle uses last tick (one-tick delay), never hangs', () => {
        // NOT wired back to its own input. With the one-tick-delay
        // convention this toggles every tick instead of looping forever.
        const FBE = loadEngine();
        const def = {
            blocks: [{ id: 'n', type: 'not', x: 0, y: 0 }],
            wires: [{ from: ['n', 'Q'], to: ['n', 'IN'] }],
        };
        const g = FBE.makeGraph(def);
        const n = g.blocks[0];

        FBE.tick(g, 0.1);
        expect(n.out.Q).toBe(true);              // IN read false (no prev)
        FBE.tick(g, 0.1);
        expect(n.out.Q).toBe(false);             // IN read true
        FBE.tick(g, 0.1);
        expect(n.out.Q).toBe(true);              // toggles, stable
    });

    test('a multi-node feedback ring resolves one position per tick', () => {
        // Three-NOT ring A → B → C → A. Every node has in-degree 1, so
        // Kahn's queue is empty and topoOrder falls back to declaration
        // order (a, b, c). The prevOut snapshot is taken before the
        // tick loop, so A reads C's *previous* tick; B and C read
        // freshly-evaluated values from earlier in the loop. The ring
        // advances one position per tick rather than spinning.
        const FBE = loadEngine();
        const def = {
            blocks: [
                { id: 'a', type: 'not', x: 0, y: 0 },
                { id: 'b', type: 'not', x: 0, y: 0 },
                { id: 'c', type: 'not', x: 0, y: 0 },
            ],
            wires: [
                { from: ['a', 'Q'], to: ['b', 'IN'] },
                { from: ['b', 'Q'], to: ['c', 'IN'] },
                { from: ['c', 'Q'], to: ['a', 'IN'] },
            ],
        };
        const g = FBE.makeGraph(def);
        const a = g.blocks.find((bl) => bl.id === 'a');
        const b = g.blocks.find((bl) => bl.id === 'b');
        const c = g.blocks.find((bl) => bl.id === 'c');

        FBE.tick(g, 0.1);
        expect(a.out.Q).toBe(true);              // C.prevOut empty → IN=false
        expect(b.out.Q).toBe(false);             // A.Q true (fresh)
        expect(c.out.Q).toBe(true);              // B.Q false (fresh)

        FBE.tick(g, 0.1);
        expect(a.out.Q).toBe(false);             // C.prevOut.Q = true
        expect(b.out.Q).toBe(true);
        expect(c.out.Q).toBe(false);

        FBE.tick(g, 0.1);
        expect(a.out.Q).toBe(true);              // pattern repeats
        expect(b.out.Q).toBe(false);
        expect(c.out.Q).toBe(true);
    });
});

test.describe('fbe-engine: finite-output guards', () => {

    test('an overflow to Infinity is sanitized to 0 at the output boundary (#97)', () => {
        // const(1e300) → mul(self) overflows to Infinity. Stored raw, a
        // downstream consumer reads it through asNum (silently → 0) while
        // the source strip shows '—' — a display/logic split. The boundary
        // sanitizer coerces the stored output to a finite 0 so both agree.
        const FBE = loadEngine();
        const def = {
            blocks: [
                { id: 'big', type: 'const', x: 0, y: 0, params: { value: 1e300 } },
                { id: 'sq',  type: 'mul',   x: 0, y: 0 },
            ],
            wires: [
                { from: ['big', 'O'], to: ['sq', 'A'] },
                { from: ['big', 'O'], to: ['sq', 'B'] },
            ],
        };
        const { by } = run(FBE, def, 0.1, 1);
        expect(isFinite(by.sq.out.O)).toBe(true);
        expect(by.sq.out.O).toBe(0);             // Infinity → 0, not a raw non-finite
    });

    test('a PID ticked with dt=0 keeps a finite, sensible OUT (#98)', () => {
        // The derivative is (pv - prevPv)/dt; a second tick with dt=0 would
        // divide by zero → NaN through OUT. Reverse-acting with PV below SP
        // must still drive a positive output, not collapse to a sanitized 0.
        const FBE = loadEngine();
        const def = {
            blocks: [
                { id: 'sp', type: 'const', x: 0, y: 0, params: { value: 75 } },
                { id: 'pv', type: 'const', x: 0, y: 0, params: { value: 70 } },
                { id: 'c',  type: 'pid',   x: 0, y: 0,
                  params: { kc: 4, ti: 30, td: 1, action: 'reverse' } },
            ],
            wires: [
                { from: ['sp', 'O'], to: ['c', 'SP'] },
                { from: ['pv', 'O'], to: ['c', 'PV'] },
            ],
        };
        const g = FBE.makeGraph(def);
        const c = g.blocks.find((b) => b.id === 'c');
        FBE.tick(g, 0.1);                        // establish state (prevPv, init)
        FBE.tick(g, 0);                          // dt=0 — must not push NaN through
        expect(isFinite(c.out.OUT)).toBe(true);
        expect(c.out.OUT).toBeGreaterThan(0);    // a real reverse-acting response, not NaN→0
    });
});

test.describe('fbe-engine: catalog coverage (#123)', () => {

    // const(a) op const(b) → read the op block's output pin.
    function math(FBE, type, a, b, outPin) {
        const def = {
            blocks: [
                { id: 'a', type: 'const', x: 0, y: 0, params: { value: a } },
                { id: 'b', type: 'const', x: 0, y: 0, params: { value: b } },
                { id: 'c', type: type,    x: 0, y: 0 },
            ],
            wires: [
                { from: ['a', 'O'], to: ['c', 'A'] },
                { from: ['b', 'O'], to: ['c', 'B'] },
            ],
        };
        return run(FBE, def, 0.1, 1).by.c.out[outPin || 'O'];
    }
    // bi(a) op bi(b) → Q.
    function logic(FBE, type, a, b) {
        const def = {
            blocks: [
                { id: 'a', type: 'bi', x: 0, y: 0, params: { state: a } },
                { id: 'b', type: 'bi', x: 0, y: 0, params: { state: b } },
                { id: 'c', type: type, x: 0, y: 0 },
            ],
            wires: [
                { from: ['a', 'O'], to: ['c', 'A'] },
                { from: ['b', 'O'], to: ['c', 'B'] },
            ],
        };
        return run(FBE, def, 0.1, 1).by.c.out.Q;
    }

    test('DIVIDE guards /0 — the load-bearing, user-advertised behavior', () => {
        const FBE = loadEngine();
        expect(math(FBE, 'div', 12, 4)).toBe(3);
        expect(math(FBE, 'div', 10, 0)).toBe(0);   // /0 → 0, not Infinity/NaN
        expect(math(FBE, 'div', -6, 0)).toBe(0);
    });

    test('math blocks: sub / mul / min / max', () => {
        const FBE = loadEngine();
        expect(math(FBE, 'sub', 10, 3)).toBe(7);
        expect(math(FBE, 'mul', 6, 7)).toBe(42);
        expect(math(FBE, 'min', 10, 3)).toBe(3);
        expect(math(FBE, 'max', 10, 3)).toBe(10);
    });

    test('every comparator family resolves', () => {
        const FBE = loadEngine();
        expect(math(FBE, 'gt', 5, 4, 'Q')).toBe(true);
        expect(math(FBE, 'lt', 1, 2, 'Q')).toBe(true);
        expect(math(FBE, 'ge', 5, 5, 'Q')).toBe(true);
        expect(math(FBE, 'le', 6, 5, 'Q')).toBe(false);
        expect(math(FBE, 'eq', 5, 5, 'Q')).toBe(true);
        expect(math(FBE, 'eq', 5, 6, 'Q')).toBe(false);
        expect(math(FBE, 'ne', 5, 6, 'Q')).toBe(true);
        expect(math(FBE, 'ne', 5, 5, 'Q')).toBe(false);
    });

    test('boolean blocks: and / or / xor', () => {
        const FBE = loadEngine();
        expect(logic(FBE, 'and', true, false)).toBe(false);
        expect(logic(FBE, 'and', true, true)).toBe(true);
        expect(logic(FBE, 'or',  true, false)).toBe(true);
        expect(logic(FBE, 'or',  false, false)).toBe(false);
        expect(logic(FBE, 'xor', true, false)).toBe(true);
        expect(logic(FBE, 'xor', true, true)).toBe(false);
    });

    test('SELECT routes IN0/IN1 by SEL', () => {
        const FBE = loadEngine();
        const def = (sel) => ({
            blocks: [
                { id: 's',  type: 'bi',    x: 0, y: 0, params: { state: sel } },
                { id: 'a',  type: 'const', x: 0, y: 0, params: { value: 10 } },
                { id: 'b',  type: 'const', x: 0, y: 0, params: { value: 20 } },
                { id: 'sl', type: 'select', x: 0, y: 0 },
            ],
            wires: [
                { from: ['s', 'O'], to: ['sl', 'SEL'] },
                { from: ['a', 'O'], to: ['sl', 'IN0'] },
                { from: ['b', 'O'], to: ['sl', 'IN1'] },
            ],
        });
        expect(run(FBE, def(false), 0.1, 1).by.sl.out.O).toBe(10);
        expect(run(FBE, def(true),  0.1, 1).by.sl.out.O).toBe(20);
    });

    test('LIMIT clamps to [lo, hi]', () => {
        const FBE = loadEngine();
        const lim = (v) => {
            const def = {
                blocks: [
                    { id: 'a', type: 'const', x: 0, y: 0, params: { value: v } },
                    { id: 'l', type: 'limit', x: 0, y: 0, params: { lo: 0, hi: 100 } },
                ],
                wires: [{ from: ['a', 'O'], to: ['l', 'IN'] }],
            };
            return run(FBE, def, 0.1, 1).by.l.out.O;
        };
        expect(lim(150)).toBe(100);
        expect(lim(-5)).toBe(0);
        expect(lim(42)).toBe(42);
    });

    test('asNum coerces an unwired/missing number input to 0', () => {
        // const(5) → add, with B left unwired: the missing input defaults to
        // 0 (asNum's contract), so the sum is 5 — not NaN.
        const FBE = loadEngine();
        const def = {
            blocks: [
                { id: 'a', type: 'const', x: 0, y: 0, params: { value: 5 } },
                { id: 's', type: 'add',   x: 0, y: 0 },
            ],
            wires: [{ from: ['a', 'O'], to: ['s', 'A'] }],   // B unwired
        };
        expect(run(FBE, def, 0.1, 1).by.s.out.O).toBe(5);
    });
});

// ── canned-program registries (consumer pages) ──────────────────────
// The EXAMPLES / FCU_PROGRAMS registries live in each consumer page's
// inline script, not the engine — extract the object literal from the
// page source and evaluate it in a vm, so these tests exercise the
// exact shipped graphs (no hand-copied twin to drift). Both literals
// sit at 8-space depth; the first `};` back at that depth closes them
// (everything inside is nested deeper). tests/fbe-geometry.spec.js
// reuses this loader shape for its placement assertions.
function loadLiteral(fileRelPath, literalName) {
    const src = fs.readFileSync(path.join(__dirname, '..', fileRelPath), 'utf8');
    const m = src.match(
        new RegExp('const ' + literalName + ' = \\{[\\s\\S]*?\\n {8}\\};'));
    if (!m) {
        throw new Error(literalName + ' literal not found in ' + fileRelPath);
    }
    return vm.runInNewContext(m[0] + '\n' + literalName + ';', {});
}

// Graph-validity sweep over every program in a registry: every block
// type exists, ids are unique, every literal param is declared on its
// block type, coordinates sit inside the canvas + drag clamp, every
// wire joins existing blocks through kind-compatible pins, no input
// pin is fed twice, and the graph constructs and ticks. `bounds` is
// the canvas the consumer page renders the literal on ({ w, h }); the
// drag clamp is w − 136 by h − 40 (136 = the 8.5rem block width at
// the 16px root font the layouts were authored against — the editor
// re-measures at runtime, this check pins the authored size).
// Returns the registry so callers can pin its key set.
function sweepLiteral(filePath, literalName, bounds) {
    const FBE = loadEngine();
    const registry = loadLiteral(filePath, literalName);
    const xMax = bounds.w - 136;
    const yMax = bounds.h - 40;
    for (const [name, def] of Object.entries(registry)) {
        const byId = {};
        def.blocks.forEach((b) => {
            const bdef = FBE.BLOCKS[b.type];
            expect(bdef, name + ': block ' + b.id + " type '" + b.type + "'").toBeTruthy();
            expect(byId[b.id], name + ': duplicate block id ' + b.id).toBeUndefined();
            byId[b.id] = b;
            // Every param in the literal must be declared on the block
            // type (catches a typo like `preset` for the TON's `pt` —
            // makeGraph would silently keep it and backfill the default).
            Object.keys(b.params || {}).forEach((k) => {
                expect(
                    (bdef.params || []).some((p) => p.name === k),
                    name + ': ' + b.id + " undeclared param '" + k + "'",
                ).toBe(true);
            });
            // Inside the canvas and the editor's drag clamp, so the
            // sheet renders without scrolling at first paint.
            expect(b.x, name + ': ' + b.id + ' x').toBeGreaterThanOrEqual(0);
            expect(b.x, name + ': ' + b.id + ' x').toBeLessThanOrEqual(xMax);
            expect(b.y, name + ': ' + b.id + ' y').toBeGreaterThanOrEqual(0);
            expect(b.y, name + ': ' + b.id + ' y').toBeLessThanOrEqual(yMax);
        });
        const seenTo = new Set();
        def.wires.forEach((w) => {
            const label = name + ': ' + w.from.join('.') + ' → ' + w.to.join('.');
            const src = byId[w.from[0]];
            const dst = byId[w.to[0]];
            expect(src, label + ' (unknown source block)').toBeTruthy();
            expect(dst, label + ' (unknown target block)').toBeTruthy();
            const op = FBE.BLOCKS[src.type].outputs.find((p) => p.name === w.from[1]);
            const ip = FBE.BLOCKS[dst.type].inputs.find((p) => p.name === w.to[1]);
            expect(op, label + ' (not an output pin)').toBeTruthy();
            expect(ip, label + ' (not an input pin)').toBeTruthy();
            expect(op.kind, label + ' (pin kind mismatch)').toBe(ip.kind);
            // The editor enforces one wire per input pin — a shipped
            // literal must not double-feed an input.
            const key = w.to.join('.');
            expect(seenTo.has(key), name + ': input ' + key + ' fed twice').toBe(false);
            seenTo.add(key);
        });
        // And the graph actually constructs and runs.
        const g = FBE.makeGraph(def);
        FBE.tick(g, 0.1);
    }
    return registry;
}

test.describe('fbe-engine: canned examples (sim page)', () => {

    function loadExamples() {
        return loadLiteral('html/simulators/function-block-editor.html', 'EXAMPLES');
    }

    // Build a runnable graph from an example and hand back the id→block
    // lookup (behavioral tests poke sources and read sinks by id).
    function mount(FBE, def) {
        const g = FBE.makeGraph(def);
        const by = {};
        g.blocks.forEach((b) => { by[b.id] = b; });
        return { g, by };
    }

    test('every example wires existing blocks through compatible pins', () => {
        // 900×480 — the sim page mounts the editor at the default canvas.
        const EXAMPLES = sweepLiteral(
            'html/simulators/function-block-editor.html', 'EXAMPLES',
            { w: 900, h: 480 });

        // Pin the registry's key set so the sweep's reach is explicit —
        // a new example must be added here to count as covered.
        expect(Object.keys(EXAMPLES).sort()).toEqual(
            ['econ', 'freeze', 'pid', 'proof', 'reset', 'tstat-cool', 'tstat-heat'],
        );
    });

    test('proof: healthy by default, alarms past the preset, latches, resets', () => {
        const FBE = loadEngine();
        const { g, by } = mount(FBE, loadExamples().proof);

        // dt 0.5 is exact in binary, so 30 ticks accumulate to exactly
        // the 15 s TON preset — no float-drift flake at the threshold.
        // Default state: commanded ON with proof made. Run well past the
        // preset — a healthy fan never alarms.
        for (let n = 0; n < 60; n++) FBE.tick(g, 0.5);       // 30 s
        expect(by.alarm.in.IN).toBe(false);

        // Proof drops while still commanded — the failure timer runs.
        by.sts.params.state = false;
        for (let n = 0; n < 29; n++) FBE.tick(g, 0.5);       // 14.5 s — one tick shy
        expect(by.alarm.in.IN).toBe(false);
        FBE.tick(g, 0.5);                                     // 15 s — TON fires
        expect(by.alarm.in.IN).toBe(true);

        // Proof coming back does NOT clear it — the SR latch holds.
        by.sts.params.state = true;
        for (let n = 0; n < 10; n++) FBE.tick(g, 0.5);
        expect(by.alarm.in.IN).toBe(true);

        // Manual reset clears the latch (S is false once proof is made,
        // so R wins even against the set-dominant latch).
        by.rst.params.state = true;
        FBE.tick(g, 0.5);
        expect(by.alarm.in.IN).toBe(false);
    });

    test('reset: OAT reset line hits the worked numbers and clamps', () => {
        const FBE = loadEngine();
        const { g, by } = mount(FBE, loadExamples().reset);

        const at = (oat) => {
            by.oat.params.value = oat;
            FBE.tick(g, 0.1);
            return by.hwsp.in.IN;
        };

        expect(at(30)).toBeCloseTo(160, 1);   // default first paint: 30 °F → 160 °F
        expect(at(0)).toBe(180);              // design head: 180 °F at 0 °F OAT
        expect(at(-20)).toBe(180);            // LIMIT hi holds the ceiling below 0 °F
        expect(at(60)).toBe(140);             // design foot: 139.98 raw → clamped 140
        expect(at(85)).toBe(140);             // LIMIT lo holds the floor above 60 °F
    });
});

test.describe('fbe-engine: FCU sample programs (workbench page)', () => {

    // C14: the workbench's FCU_PROGRAMS registry shipped with no
    // validity coverage at all — these graphs get the same sweep the
    // sim page's EXAMPLES get. Bounds are the workbench's CURRENT
    // canvas: ddc-workbench.html passes no canvasSize, so its editor
    // mounts at the 900×480 default; the wiresheet-relayout lane
    // updates these bounds when the workbench canvas grows.
    test('every FCU program wires existing blocks through compatible pins', () => {
        const FCU_PROGRAMS = sweepLiteral(
            'html/simulators/ddc-workbench.html', 'FCU_PROGRAMS',
            { w: 900, h: 480 });

        // Pin the registry's key set so the sweep's reach is explicit —
        // a new sample program must be added here to count as covered.
        expect(Object.keys(FCU_PROGRAMS).sort()).toEqual(
            ['cool-1stage', 'cool-2stage', 'cool-2stage-fanon'],
        );
    });
});
