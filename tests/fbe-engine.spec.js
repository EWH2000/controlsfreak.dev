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
});
