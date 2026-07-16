// Engine-direct tests for /scripts/refrigerant-loop-engine.js. Lives under
// tests/*.spec.js so the same `npm test` (Playwright) runner picks it up —
// Playwright workers are Node processes, the `page` fixture is just unused
// here. No second runner to install or configure. Mirrors the pure-Node vm
// pattern in tests/psychro-engine.spec.js.
//
// The engine is a classic browser script that reads REFRIGERANT_TYPES (a
// top-level `const` in refrigerant-data.js) by name. Neither top-level `const`
// attaches to a vm context bag, so we CONCATENATE the two files (data FIRST,
// so the engine's saturation curves exist in the same lexical scope) and
// append a trailing expression bundling both exports — runInNewContext returns
// the script's last completion value.

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

function loadEngine() {
    const read = (f) => fs.readFileSync(
        path.join(__dirname, '..', 'html', 'scripts', f), 'utf8');
    const src = read('refrigerant-data.js') + '\n' + read('refrigerant-loop-engine.js');
    // Leading `;` defends against ASI gluing this onto the previous line — the
    // engine's trailing `if (…) { … }` guard followed by `({…})` would otherwise
    // reparse. Both consts share the concatenated script's top-level scope, so
    // the object literal can name them both.
    const trailer = `\n; ({ REFRIGERANT_TYPES, RefrigLoop });`;
    return vm.runInNewContext(src + trailer, {});
}

// A finite-number guard for the "no NaN" assertions.
function allFinite(state, keys) {
    return keys.every((k) => Number.isFinite(state[k]));
}
const STATE_NUMS = ['pSuc', 'pDis', 'tEvap', 'tCond', 'superheat', 'subcool',
    'tSucLine', 'tLiqLine', 'cfmPerTon'];

// ── 1. Saturation lookups match the table ────────────────────────────────
test.describe('refrigerant-loop-engine: saturation lookups (the grounding)', () => {

    test('R-410A anchor points resolve to the table values', () => {
        const { RefrigLoop } = loadEngine();
        // dew(118.4) = 40 °F — the design suction anchor.
        const t = RefrigLoop.satTempAtP('r410a', 'dew', 118.4);
        expect(t.ok).toBe(true);
        expect(t.value).toBeCloseTo(40, 1);
        // bubble @ 105 °F = 341.9 psig — the design head anchor.
        const p = RefrigLoop.pressAtSatTemp('r410a', 'bubble', 105);
        expect(p.ok).toBe(true);
        expect(p.value).toBeCloseTo(341.9, 0);
    });

    test('R-407C shows a real glide (dew ≠ bubble)', () => {
        const { RefrigLoop } = loadEngine();
        const dew    = RefrigLoop.satTempAtP('r407c', 'dew', 100);
        const bubble = RefrigLoop.satTempAtP('r407c', 'bubble', 100);
        expect(dew.ok && bubble.ok).toBe(true);
        // Honeywell 407C @ 100 psig: bubble 51.1 °F, dew 61.6 °F ⇒ ~10.5 °F glide.
        expect(dew.value).toBeCloseTo(61.6, 1);
        expect(bubble.value).toBeCloseTo(51.1, 1);
        const glide = dew.value - bubble.value;
        expect(glide).toBeGreaterThan(8);
        expect(glide).toBeLessThan(13);
    });

    test('R-22 is pure (dew === bubble, zero glide)', () => {
        const { RefrigLoop } = loadEngine();
        const dew    = RefrigLoop.satTempAtP('r22', 'dew', 196);
        const bubble = RefrigLoop.satTempAtP('r22', 'bubble', 196);
        expect(dew.ok && bubble.ok).toBe(true);
        expect(dew.value).toBeCloseTo(100.0, 1);   // Honeywell 22 @ 196 psig = 100 °F
        expect(dew.value).toBe(bubble.value);       // single component ⇒ identical
    });
});

// ── 2. The typical preset lands on the design anchors ────────────────────
test.describe('refrigerant-loop-engine: the typical preset', () => {

    test('typical solves to the R-410A design point with no flags', () => {
        const { RefrigLoop } = loadEngine();
        const s = RefrigLoop.solve(RefrigLoop.PRESETS.typical);
        expect(s.pSuc).toBeCloseTo(118, 0);       // 118 ± 5
        expect(Math.abs(s.pSuc - 118)).toBeLessThanOrEqual(5);
        expect(Math.abs(s.pDis - 340)).toBeLessThanOrEqual(10);   // 340 ± 10
        expect(s.tEvap).toBeCloseTo(40, 0);       // 40 ± 1
        expect(Math.abs(s.tCond - 105)).toBeLessThanOrEqual(2);   // 105 ± 2
        expect(s.superheat).toBeCloseTo(10, 1);   // 10 ± 0.5
        expect(s.subcool).toBeCloseTo(10, 1);     // 10 ± 0.5
        // No flags raised at the design point.
        for (const k of Object.keys(s.flags)) {
            expect(s.flags[k], `flag ${k}`).toBe(false);
        }
        expect(s.verdict.kind).toBe('ok');
        // Line temps close the SH/SC subtractions.
        expect(s.tSucLine).toBeCloseTo(s.tEvap + s.superheat, 6);
        expect(s.tLiqLine).toBeCloseTo(s.tCond - s.subcool, 6);
    });
});

// ── 3. Directional monotonicity (the core of a directional model) ────────
test.describe('refrigerant-loop-engine: directional monotonicity', () => {

    test('airflow ↓ ⇒ pSuc and tEvap strictly decreasing, then freeze', () => {
        const { RefrigLoop } = loadEngine();
        const sweep = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4].map(
            (a) => RefrigLoop.solve({ airflow: a }));
        for (let i = 1; i < sweep.length; i++) {
            expect(sweep[i].tEvap, `tEvap step ${i}`).toBeLessThan(sweep[i - 1].tEvap);
            expect(sweep[i].pSuc,  `pSuc step ${i}`).toBeLessThan(sweep[i - 1].pSuc);
        }
        // Full airflow: no freeze. Deeply starved (below the 32 °F onset): freeze.
        expect(sweep[0].flags.freeze).toBe(false);
        const low = RefrigLoop.solve({ airflow: 0.45 });
        expect(low.flags.freeze).toBe(true);
        expect(low.tEvap).toBeLessThan(32);
    });

    test('charge ↓ ⇒ superheat ↑ and subcooling ↓ (SC crosses negative)', () => {
        const { RefrigLoop } = loadEngine();
        const full = RefrigLoop.solve({ charge: 1.0 });
        const under = RefrigLoop.solve({ charge: 0.7 });
        expect(under.superheat).toBeGreaterThan(full.superheat);
        expect(under.subcool).toBeLessThan(full.subcool);
        expect(under.subcool).toBeLessThan(0);   // flash gas at deep undercharge
    });

    test('charge ↑ ⇒ subcooling ↑, pDis ↑, superheat ↓', () => {
        const { RefrigLoop } = loadEngine();
        const full = RefrigLoop.solve({ charge: 1.0 });
        const over = RefrigLoop.solve({ charge: 1.2 });
        expect(over.subcool).toBeGreaterThan(full.subcool);
        expect(over.pDis).toBeGreaterThan(full.pDis);
        expect(over.superheat).toBeLessThan(full.superheat);
    });

    test('ambient ↑ ⇒ tCond ↑ and pDis ↑', () => {
        const { RefrigLoop } = loadEngine();
        const cool = RefrigLoop.solve({ ambient: 90 });
        const hot  = RefrigLoop.solve({ ambient: 100 });
        expect(hot.tCond).toBeGreaterThan(cool.tCond);
        expect(hot.pDis).toBeGreaterThan(cool.pDis);
    });

    test('condenser air ↓ ⇒ tCond ↑ (head climbs)', () => {
        const { RefrigLoop } = loadEngine();
        const good = RefrigLoop.solve({ condAir: 1.0 });
        const dirty = RefrigLoop.solve({ condAir: 0.5 });
        expect(dirty.tCond).toBeGreaterThan(good.tCond);
        expect(dirty.pDis).toBeGreaterThan(good.pDis);
    });

    test('capacity ↑ ⇒ pSuc ↓ and pDis ↑', () => {
        const { RefrigLoop } = loadEngine();
        const stage1 = RefrigLoop.solve({ capacity: 0.5 });
        const stage2 = RefrigLoop.solve({ capacity: 1.0 });
        expect(stage2.pSuc).toBeLessThan(stage1.pSuc);
        expect(stage2.pDis).toBeGreaterThan(stage1.pDis);
    });

    test('low ambient ⇒ pDis ↓ (head collapse)', () => {
        const { RefrigLoop } = loadEngine();
        const design = RefrigLoop.solve({ ambient: 90 });
        const cold   = RefrigLoop.solve({ ambient: 55 });
        expect(cold.pDis).toBeLessThan(design.pDis);
        expect(cold.tCond).toBeLessThan(design.tCond);
    });
});

// ── 4. Preset signatures / flags (each preset's intended "tell") ─────────
test.describe('refrigerant-loop-engine: preset fault signatures', () => {

    test('starve ⇒ freeze verdict, superheat still ~normal', () => {
        const { RefrigLoop } = loadEngine();
        const s = RefrigLoop.solve(RefrigLoop.PRESETS.starve);
        expect(s.flags.freeze).toBe(true);
        expect(s.verdict.kind).toBe('error');
        expect(s.verdict.text.toLowerCase()).toContain('freez');
        // The honesty guard: airside starve leaves the refrigerant side normal.
        expect(s.superheat).toBeCloseTo(10, 1);
        expect(s.flags.starved).toBe(false);
        expect(s.cfmPerTon).toBeLessThan(400);
    });

    test('undercharge ⇒ starved, high superheat + low/neg subcooling', () => {
        const { RefrigLoop } = loadEngine();
        const s = RefrigLoop.solve(RefrigLoop.PRESETS.undercharge);
        expect(s.flags.starved).toBe(true);
        // charge 0.75 lands superheat right on the ~25 °F "starved" line.
        expect(s.superheat).toBeGreaterThanOrEqual(25);
        expect(s.subcool).toBeLessThan(3);
        expect(s.flags.lowSubcool).toBe(true);
        expect(s.flags.freeze).toBe(false);     // airflow is fine — a charge fault
    });

    test('overcharge ⇒ high subcooling + high head, superheat low', () => {
        const { RefrigLoop } = loadEngine();
        const s = RefrigLoop.solve(RefrigLoop.PRESETS.overcharge);
        expect(s.flags.highSubcool).toBe(true);
        expect(s.flags.highHead).toBe(true);
        expect(s.superheat).toBeLessThan(4);    // floodback edge
        expect(s.flags.floodback).toBe(true);
    });

    test('dirtyCondenser ⇒ high head with superheat / subcooling normal', () => {
        const { RefrigLoop } = loadEngine();
        const s = RefrigLoop.solve(RefrigLoop.PRESETS.dirtyCondenser);
        expect(s.flags.highHead).toBe(true);
        // A heat-rejection fault, not a charge fault: SH/SC sit in the normal band.
        expect(s.flags.starved).toBe(false);
        expect(s.flags.floodback).toBe(false);
        expect(s.flags.lowSubcool).toBe(false);
        expect(s.flags.highSubcool).toBe(false);
        expect(s.superheat).toBeCloseTo(10, 1);
    });

    test('lowAmbient ⇒ head collapse, no fault flags', () => {
        const { RefrigLoop } = loadEngine();
        const s = RefrigLoop.solve(RefrigLoop.PRESETS.lowAmbient);
        expect(s.tCond).toBeLessThan(85);
        expect(s.flags.highHead).toBe(false);
        expect(s.flags.freeze).toBe(false);
        // No flag represents low head; the verdict still notes it.
        expect(s.verdict.text.toLowerCase()).toContain('head');
    });
});

// ── 5. Every refrigerant solves at typical, in range, no throw ───────────
test.describe('refrigerant-loop-engine: all refrigerants', () => {

    test('all six solve at the typical point without throwing, in range', () => {
        const { RefrigLoop, REFRIGERANT_TYPES } = loadEngine();
        const ids = Object.keys(REFRIGERANT_TYPES);
        expect(ids.length).toBe(6);
        for (const id of ids) {
            const inp = Object.assign({}, RefrigLoop.PRESETS.typical, { refrig: id });
            let s;
            expect(() => { s = RefrigLoop.solve(inp); }, `solve ${id}`).not.toThrow();
            expect(allFinite(s, STATE_NUMS), `finite ${id}`).toBe(true);
            expect(s.flags.outOfRange, `in-range ${id}`).toBe(false);
            expect(s.pSuc, `pSuc>0 ${id}`).toBeGreaterThan(0);
            expect(s.pDis, `pDis>pSuc ${id}`).toBeGreaterThan(s.pSuc);
        }
    });
});

// ── 6. Out-of-range guard: clamp to table ends, flag it, never NaN ───────
test.describe('refrigerant-loop-engine: out-of-range guard', () => {

    test('extreme knobs clamp to the table end with outOfRange, no NaN', () => {
        const { RefrigLoop } = loadEngine();
        // Extreme condensing (hot + starved condenser + overcharge) drives tCond
        // past the top of the R-410A table (max 150 °F). Inputs beyond CLAMPS get
        // clamped first, then the pressure lookup clamps to the table end.
        const s = RefrigLoop.solve({ ambient: 200, condAir: 0.1, charge: 5, refrig: 'r410a' });
        expect(s.flags.outOfRange).toBe(true);
        expect(allFinite(s, STATE_NUMS)).toBe(true);
        // Clamped to the table's top pressure row, not NaN.
        expect(s.pDis).toBeCloseTo(613.9, 0);
    });

    test('a normal solve does NOT raise outOfRange', () => {
        const { RefrigLoop } = loadEngine();
        expect(RefrigLoop.solve(RefrigLoop.PRESETS.typical).flags.outOfRange).toBe(false);
    });
});
