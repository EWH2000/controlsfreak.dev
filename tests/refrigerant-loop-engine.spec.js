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
    'tSucLine', 'tLiqLine', 'tAirInEvap', 'tAirOutEvap', 'tAirInCond',
    'tAirOutCond', 'cfmPerTon'];

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
        // Airflow IS below the 400 floor here, so the verdict names the starve.
        expect(s.verdict.text.toLowerCase()).toContain('airflow starved');
        // The honesty guard: airside starve leaves the refrigerant side normal.
        expect(s.superheat).toBeCloseTo(10, 1);
        expect(s.flags.starved).toBe(false);
        expect(s.cfmPerTon).toBeLessThan(400);
    });

    test('non-airflow freeze ⇒ alarm fires, verdict names the below-32 cause', () => {
        const { RefrigLoop } = loadEngine();
        // Deep undercharge (0.60) + cold return air (65 °F) drags the evaporator
        // below 32 °F at FULL airflow — the reachable state where the P-T plot
        // reddened but the old airflow-gated alarm stayed silent (the mixed
        // signal). The alarm now follows the plot: any sub-32 °F coil freezes.
        const s = RefrigLoop.solve({ charge: 0.60, returnT: 65, airflow: 1.0 });
        expect(s.tEvap).toBeLessThan(32);
        // Airflow is AT the design floor, not below it — the starve branch must
        // not fire, so the verdict must not claim airflow starvation.
        expect(s.cfmPerTon).toBeGreaterThanOrEqual(400);
        expect(s.flags.freeze).toBe(true);
        expect(s.verdict.kind).toBe('error');
        expect(s.verdict.text.toLowerCase()).toContain('freez');
        expect(s.verdict.text.toLowerCase()).not.toContain('airflow starved');
        expect(s.verdict.text.toLowerCase()).toContain('below 32');
    });

    test('undercharge ⇒ starved, high superheat + low/neg subcooling', () => {
        const { RefrigLoop } = loadEngine();
        const s = RefrigLoop.solve(RefrigLoop.PRESETS.undercharge);
        expect(s.flags.starved).toBe(true);
        // charge 0.75 lands superheat right on the ~25 °F "starved" line.
        expect(s.superheat).toBeGreaterThanOrEqual(25);
        expect(s.subcool).toBeLessThan(3);
        expect(s.flags.lowSubcool).toBe(true);
        expect(s.flags.freeze).toBe(false);     // coil sits ~36 °F, above the 32 °F line
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

// ── 7. Physical sanity across the whole knob box ─────────────────────────
// The 2026-07-16 verification audit found a reachable stage-1 + cold-ambient
// corner where tEvap rose ABOVE tCond, putting the suction gauge above the
// head gauge with the compressor running — physically impossible. The engine
// now floors tCond at tEvap + DESIGN.MIN_LIFT; these tests pin that.
test.describe('refrigerant-loop-engine: pressure ordering (min lift)', () => {

    test('pDis > pSuc at every corner of the CLAMPS box, all refrigerants', () => {
        const { RefrigLoop, REFRIGERANT_TYPES } = loadEngine();
        const C = RefrigLoop.CLAMPS;
        const axes = ['airflow', 'returnT', 'charge', 'shTarget', 'ambient', 'condAir', 'capacity'];
        const ids = Object.keys(REFRIGERANT_TYPES);
        for (const id of ids) {
            for (let mask = 0; mask < (1 << axes.length); mask++) {
                const inp = { refrig: id };
                axes.forEach((k, i) => { inp[k] = (mask & (1 << i)) ? C[k].max : C[k].min; });
                const s = RefrigLoop.solve(inp);
                expect(allFinite(s, STATE_NUMS), `finite ${id} mask ${mask}`).toBe(true);
                expect(s.pDis, `pDis>pSuc ${id} mask ${mask}`).toBeGreaterThan(s.pSuc);
                expect(s.tCond, `lift ${id} mask ${mask}`)
                    .toBeGreaterThanOrEqual(s.tEvap + RefrigLoop.DESIGN.MIN_LIFT - 1e-9);
            }
        }
    });

    test('the audit corner that used to invert now keeps positive lift', () => {
        const { RefrigLoop } = loadEngine();
        // Mildest pre-fix inversion: nominal SH/SC, every flag false, suction
        // 186.8 psig over head 175.2 (r410a). The floor must hold it ordered.
        const s = RefrigLoop.solve({ airflow: 1.20, returnT: 85, charge: 1.00,
            shTarget: 10, ambient: 55, condAir: 1.20, capacity: 0.5, refrig: 'r410a' });
        expect(s.tCond).toBeCloseTo(s.tEvap + RefrigLoop.DESIGN.MIN_LIFT, 6);
        expect(s.pDis).toBeGreaterThan(s.pSuc);
    });
});

// ── 8. Verdict priority (most severe wins) ────────────────────────────────
// buildVerdict is a first-match if-chain; nothing pinned its order before, so
// a reorder would have passed the suite. Each case trips MULTIPLE flags and
// asserts which one owns the pill.
test.describe('refrigerant-loop-engine: verdict priority', () => {

    test('freeze outranks starved (deep undercharge + starved airflow)', () => {
        const { RefrigLoop } = loadEngine();
        const s = RefrigLoop.solve({ airflow: 0.40, returnT: 65, charge: 0.60 });
        expect(s.flags.freeze && s.flags.starved).toBe(true);
        expect(s.verdict.kind).toBe('error');
        expect(s.verdict.text.toLowerCase()).toContain('freez');
    });

    test('floodback outranks high head + high subcooling (overcharge + dirty)', () => {
        const { RefrigLoop } = loadEngine();
        const s = RefrigLoop.solve({ charge: 1.20, condAir: 0.50 });
        expect(s.flags.floodback && s.flags.highHead && s.flags.highSubcool).toBe(true);
        expect(s.verdict.text.toLowerCase()).toContain('floodback');
    });

    test('high head outranks high subcooling (mild overcharge + weak condenser)', () => {
        const { RefrigLoop } = loadEngine();
        const s = RefrigLoop.solve({ charge: 1.15, condAir: 0.60 });
        expect(s.flags.floodback).toBe(false);
        expect(s.flags.highHead && s.flags.highSubcool).toBe(true);
        expect(s.verdict.text.toLowerCase()).toContain('high head');
    });
});

// ── 9. Flag threshold boundaries (strict vs inclusive) ───────────────────
// A silent < → <= regression passed the old suite. solve() does not quantize
// to the slider step, so exact-boundary inputs are legal probes.
test.describe('refrigerant-loop-engine: threshold boundaries', () => {

    test('freeze is strictly below 32 °F', () => {
        const { RefrigLoop } = loadEngine();
        expect(RefrigLoop.solve({ airflow: 0.80 }).tEvap).toBeCloseTo(32, 6);
        expect(RefrigLoop.solve({ airflow: 0.80 }).flags.freeze).toBe(false);
        expect(RefrigLoop.solve({ airflow: 0.79 }).flags.freeze).toBe(true);
    });

    test('floodback is inclusive at SH = 3 °F', () => {
        const { RefrigLoop } = loadEngine();
        // Binary-exact knobs so SH computes to exactly 3.0:
        // 4.25 − 40·(1/32) = 4.25 − 1.25 = 3.0 (all dyadic fractions).
        const at3 = RefrigLoop.solve({ shTarget: 4.25, charge: 1 + 1 / 32 });
        expect(at3.superheat).toBe(3);
        expect(at3.flags.floodback).toBe(true);
        // 4.25 − 40·(1/64) = 3.625 — just above the line stays clear.
        expect(RefrigLoop.solve({ shTarget: 4.25, charge: 1 + 1 / 64 }).flags.floodback).toBe(false);
    });

    test('starved is strictly above SH 20 °F', () => {
        const { RefrigLoop } = loadEngine();
        expect(RefrigLoop.solve({ shTarget: 20 }).flags.starved).toBe(false);
        expect(RefrigLoop.solve({ shTarget: 21 }).flags.starved).toBe(true);
    });

    test('subcool bands are strict at 3 and 20 °F', () => {
        const { RefrigLoop } = loadEngine();
        // Binary-exact knobs: 10 + 60·(−1/8) − 8·(−1/16) = 10 − 7.5 + 0.5 = 3.0.
        const atLow = RefrigLoop.solve({ charge: 0.875, condAir: 0.9375 });
        expect(atLow.subcool).toBe(3);
        expect(atLow.flags.lowSubcool).toBe(false);          // strict <
        expect(RefrigLoop.solve({ charge: 0.875 }).flags.lowSubcool).toBe(true);   // SC 2.5
        // 10 + 60·(1/8) − 8·(−5/16) = 10 + 7.5 + 2.5 = 20.0.
        const atHigh = RefrigLoop.solve({ charge: 1.125, condAir: 0.6875 });
        expect(atHigh.subcool).toBe(20);
        expect(atHigh.flags.highSubcool).toBe(false);        // strict >
        expect(RefrigLoop.solve({ charge: 1.125, condAir: 0.5 }).flags.highSubcool).toBe(true); // SC 21.5
    });

    test('highHead split branch is strictly above 18 °F approach', () => {
        const { RefrigLoop } = loadEngine();
        expect(RefrigLoop.solve({ condAir: 0.90 }).flags.highHead).toBe(false);  // split 18.0
        expect(RefrigLoop.solve({ condAir: 0.89 }).flags.highHead).toBe(true);   // split 18.3
    });

    test('the low-head note starts strictly below tCond 85 °F', () => {
        const { RefrigLoop } = loadEngine();
        expect(RefrigLoop.solve({ ambient: 70 }).verdict.kind).toBe('ok');       // tCond 85.0
        expect(RefrigLoop.solve({ ambient: 69 }).verdict.text.toLowerCase()).toContain('head low');
    });
});

// ── 10. The two knobs with no directional coverage + input robustness ────
test.describe('refrigerant-loop-engine: remaining directions + robustness', () => {

    test('returnT ↑ ⇒ tEvap and pSuc ↑; shTarget ↑ ⇒ superheat ↑', () => {
        const { RefrigLoop } = loadEngine();
        const cold = RefrigLoop.solve({ returnT: 65 });
        const warm = RefrigLoop.solve({ returnT: 85 });
        expect(warm.tEvap).toBeGreaterThan(cold.tEvap);
        expect(warm.pSuc).toBeGreaterThan(cold.pSuc);
        expect(RefrigLoop.solve({ shTarget: 25 }).superheat)
            .toBeGreaterThan(RefrigLoop.solve({ shTarget: 4 }).superheat);
    });

    test('garbage inputs fall back to the defaults solve, finite, no throw', () => {
        const { RefrigLoop } = loadEngine();
        const base = RefrigLoop.solve({});
        for (const inp of [null, undefined,
            { refrig: 'bogus', airflow: 'wide', charge: NaN, ambient: Infinity },
            { airflow: {}, returnT: true, shTarget: [], condAir: null }]) {
            let s;
            expect(() => { s = RefrigLoop.solve(inp); }).not.toThrow();
            expect(allFinite(s, STATE_NUMS)).toBe(true);
            expect(s.pSuc).toBeCloseTo(base.pSuc, 6);
            expect(s.pDis).toBeCloseTo(base.pDis, 6);
        }
    });
});

// ── 11. Airside coil temperatures (block F) ──────────────────────────────
// Block F is pure arithmetic on already-solved locals — it never reads the
// saturation tables — so a single refrigerant (the default) covers the
// sweeps. The approach clamps mirror MIN_LIFT on the airside: leaving air
// may approach its coil's saturation temp but never cross it, and condenser
// discharge air never leaves cooler than it entered.
test.describe('refrigerant-loop-engine: airside coil temperatures', () => {

    test('typical lands on the 75→55 supply and 90→102 discharge anchors', () => {
        const { RefrigLoop } = loadEngine();
        const D = RefrigLoop.DESIGN;
        const s = RefrigLoop.solve(RefrigLoop.PRESETS.typical);
        expect(s.tAirInEvap).toBe(75);
        expect(s.tAirOutEvap).toBeCloseTo(55, 6);
        expect(s.tAirInCond).toBe(90);
        expect(s.tAirOutCond).toBeCloseTo(102, 6);
        // The splits close on the design deltas…
        expect(s.tAirInEvap - s.tAirOutEvap).toBeCloseTo(D.AIR_DT_EVAP, 6);
        expect(s.tAirOutCond - s.tAirInCond).toBeCloseTo(D.AIR_DT_COND, 6);
        // …and each airstream sits on the correct side of its own coil.
        expect(s.tAirOutEvap).toBeGreaterThan(s.tEvap);
        expect(s.tAirOutCond).toBeLessThan(s.tCond);
    });

    test('air orderings hold at every corner of the CLAMPS box', () => {
        const { RefrigLoop } = loadEngine();
        const C = RefrigLoop.CLAMPS;
        const D = RefrigLoop.DESIGN;
        const axes = ['airflow', 'returnT', 'charge', 'shTarget', 'ambient', 'condAir', 'capacity'];
        for (let mask = 0; mask < (1 << axes.length); mask++) {
            const inp = {};
            axes.forEach((k, i) => { inp[k] = (mask & (1 << i)) ? C[k].max : C[k].min; });
            const s = RefrigLoop.solve(inp);
            // Entering air IS the knob; leaving air never crosses its coil's
            // saturation temp, the supply always cools, the discharge never
            // leaves cooler than it entered.
            expect(s.tAirInEvap, `evap in mask ${mask}`).toBe(inp.returnT);
            expect(s.tAirInCond, `cond in mask ${mask}`).toBe(inp.ambient);
            expect(s.tAirOutEvap, `evap approach mask ${mask}`)
                .toBeGreaterThanOrEqual(s.tEvap + D.AIR_APPROACH - 1e-9);
            expect(s.tAirOutEvap, `evap cools mask ${mask}`).toBeLessThan(s.tAirInEvap);
            expect(s.tAirOutCond, `cond rises mask ${mask}`)
                .toBeGreaterThanOrEqual(s.tAirInCond);
            expect(s.tAirOutCond, `cond approach mask ${mask}`)
                .toBeLessThanOrEqual(Math.max(s.tAirInCond, s.tCond - D.AIR_APPROACH) + 1e-9);
        }
    });

    test('airflow ↓ ⇒ supply air strictly colder; starve blows freezing air at normal SH', () => {
        const { RefrigLoop } = loadEngine();
        const sweep = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4].map(
            (a) => RefrigLoop.solve({ airflow: a }));
        expect(sweep[0].tAirInEvap).toBe(75);
        for (let i = 1; i < sweep.length; i++) {
            expect(sweep[i].tAirOutEvap, `tAirOutEvap step ${i}`)
                .toBeLessThan(sweep[i - 1].tAirOutEvap);
            expect(sweep[i].tAirInEvap, `tAirInEvap step ${i}`).toBe(75);
        }
        // The teaching tell, airside view of the honesty guard: the starve
        // preset (airflow 0.45, all else design) blows sub-freezing supply
        // air — 75 − 20/0.45 = 30.56 °F — while superheat still reads a
        // normal 10 (nothing on the refrigerant side looks wrong).
        const s = RefrigLoop.solve(RefrigLoop.PRESETS.starve);
        expect(s.tAirOutEvap).toBeLessThan(32);
        expect(s.tAirOutEvap).toBeCloseTo(30.56, 1);
        expect(s.superheat).toBeGreaterThan(RefrigLoop.DESIGN.FLOODBACK_SH);
        expect(s.superheat).toBeLessThanOrEqual(RefrigLoop.DESIGN.STARVED_SH);
    });

    test('condAir ↓ ⇒ discharge air strictly hotter, across the approach cap', () => {
        const { RefrigLoop } = loadEngine();
        // The first two points ride the tCond − 2 cap (97, 100) before the raw
        // rise takes over at 1.0 — strictness must hold across the branch change.
        const sweep = [1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4].map(
            (c) => RefrigLoop.solve({ condAir: c }));
        expect(sweep[0].tAirInCond).toBe(90);
        for (let i = 1; i < sweep.length; i++) {
            expect(sweep[i].tAirOutCond, `tAirOutCond step ${i}`)
                .toBeGreaterThan(sweep[i - 1].tAirOutCond);
            expect(sweep[i].tAirInCond, `tAirInCond step ${i}`).toBe(90);
        }
    });

    test('capacity widens both splits; return / ambient temps track through', () => {
        const { RefrigLoop } = loadEngine();
        // Stage 2 doubles the load on the same air ⇒ both splits widen (strict).
        const stage1 = RefrigLoop.solve({ capacity: 0.5 });
        const stage2 = RefrigLoop.solve({ capacity: 1.0 });
        expect(stage2.tAirInEvap - stage2.tAirOutEvap)
            .toBeGreaterThan(stage1.tAirInEvap - stage1.tAirOutEvap);
        expect(stage2.tAirOutCond - stage2.tAirInCond)
            .toBeGreaterThan(stage1.tAirOutCond - stage1.tAirInCond);
        // Return air shifts both indoor temps 1:1 (the drop term never reads
        // returnT, and neither endpoint hits the approach floor).
        const cold = RefrigLoop.solve({ returnT: 65 });
        const warm = RefrigLoop.solve({ returnT: 85 });
        expect(warm.tAirInEvap - cold.tAirInEvap).toBeCloseTo(20, 6);
        expect(warm.tAirOutEvap - cold.tAirOutEvap).toBeCloseTo(20, 6);
        // Ambient shifts both outdoor temps 1:1 — unclamped at defaults over
        // the whole ambient range (55 ⇒ 67 °F out, 115 ⇒ 127 °F out).
        const mild = RefrigLoop.solve({ ambient: 55 });
        const hot  = RefrigLoop.solve({ ambient: 115 });
        expect(hot.tAirInCond - mild.tAirInCond).toBeCloseTo(60, 6);
        expect(hot.tAirOutCond - mild.tAirOutCond).toBeCloseTo(60, 6);
    });

    test('the approach clamps engage at the derived corners (pinned)', () => {
        const { RefrigLoop } = loadEngine();
        // Warm coil + light load: the raw 56.67 °F supply would leave COLDER
        // than the 58.5 °F coil — floored at tEvap + 2 = 60.5, still below
        // the 65 °F return.
        const a = RefrigLoop.solve({ airflow: 1.2, returnT: 65, charge: 1.2, capacity: 0.5 });
        expect(a.tEvap).toBeCloseTo(58.5, 6);
        expect(a.tAirOutEvap).toBeCloseTo(60.5, 6);
        expect(a.tAirOutEvap).toBeLessThan(65);
        // Deep starve: the raw 15.0 °F supply sits INSIDE the 2 °F approach
        // of the 14 °F coil — floored to 16.
        const b = RefrigLoop.solve({ airflow: 0.4, returnT: 65, charge: 1.2 });
        expect(b.tEvap).toBeCloseTo(14, 6);
        expect(b.tAirOutEvap).toBeCloseTo(16, 6);
        // Overblown condenser: the raw 100 °F discharge would PASS the 99 °F
        // condensing temp — capped at tCond − 2 = 97.
        const c = RefrigLoop.solve({ condAir: 1.2 });
        expect(c.tCond).toBeCloseTo(99, 6);
        expect(c.tAirOutCond).toBeCloseTo(97, 6);
        // Degenerate: overblown condenser + deep undercharge collapses block
        // (C)'s split below zero (tCond 89 < ambient 90) — the ambient floor
        // shows a zero rise rather than contradict the head gauge.
        const d = RefrigLoop.solve({ condAir: 1.2, charge: 0.6 });
        expect(d.tCond).toBeCloseTo(89, 6);
        expect(d.tAirOutCond).toBe(90);
    });
});

// ── 12. Heating mode (the reversing-valve axis) ──────────────────────────
// mode: 'heating' swaps the driving-temperature ROLES: the outdoor coil
// evaporates (ambient + condAir drive block A) and the indoor coil condenses
// (returnT + airflow drive block C). Anchored to the 47 °F heat-pump rating
// point. Backward compat is a hard requirement — the first test below gates
// it explicitly,
// and every pre-mode describe above runs UNCHANGED with mode absent.
test.describe('refrigerant-loop-engine: heating mode', () => {

    test('backward-compat gate: mode absent === mode cooling, bit-identical', () => {
        const { RefrigLoop } = loadEngine();
        expect(RefrigLoop.DEFAULTS.mode).toBe('cooling');
        const probes = [
            {},
            Object.assign({}, RefrigLoop.PRESETS.starve),
            { airflow: 0.45, returnT: 65 },
            { charge: 0.7, condAir: 0.6, capacity: 0.5 },
            { ambient: 115, charge: 1.2, refrig: 'r407c' },
        ];
        for (const inp of probes) {
            const a = RefrigLoop.solve(inp);
            const b = RefrigLoop.solve(Object.assign({}, inp, { mode: 'cooling' }));
            for (const k of STATE_NUMS) expect(b[k], k).toBe(a[k]);
            expect(b.flags).toEqual(a.flags);
            expect(b.verdict).toEqual(a.verdict);
            expect(a.mode).toBe('cooling');
        }
    });

    test('heating clamps: ambient/returnT re-range, everything else shared', () => {
        const { RefrigLoop } = loadEngine();
        const H = RefrigLoop.CLAMPS_HEATING;
        expect(H.ambient).toEqual({ min: -5, max: 65, step: 1, default: 47 });
        expect(H.returnT).toEqual({ min: 60, max: 80, step: 1, default: 70 });
        // The other five knobs are the SAME frozen objects as CLAMPS.
        for (const k of ['airflow', 'charge', 'shTarget', 'condAir', 'capacity']) {
            expect(H[k], k).toBe(RefrigLoop.CLAMPS[k]);
        }
        expect(RefrigLoop.clampsFor('heating')).toBe(H);
        expect(RefrigLoop.clampsFor('cooling')).toBe(RefrigLoop.CLAMPS);
    });

    test('heating design day lands on the 47 °F rating point, all green', () => {
        const { RefrigLoop } = loadEngine();
        // Missing ambient/returnT fall back to the HEATING defaults (47/70).
        const s = RefrigLoop.solve({ mode: 'heating' });
        expect(s.mode).toBe('heating');
        expect(s.tEvap).toBe(27);                       // 47 − 20 approach
        expect(s.tEvap).toBeGreaterThanOrEqual(25);     // published rating band
        expect(s.tEvap).toBeLessThanOrEqual(30);
        expect(s.tCond).toBe(105);                      // 70 + 35 split
        expect(s.tCond).toBeGreaterThanOrEqual(100);
        expect(s.tCond).toBeLessThanOrEqual(110);
        expect(s.superheat).toBe(10);
        expect(s.subcool).toBe(10);
        // Pressures are the same table lookups the P-T tool would make.
        expect(s.pSuc).toBeCloseTo(RefrigLoop.pressAtSatTemp('r410a', 'dew', 27).value, 6);
        expect(s.pDis).toBeCloseTo(RefrigLoop.pressAtSatTemp('r410a', 'bubble', 105).value, 6);
        // A sub-32 coil is NORMAL here: no freeze, and no frost at 47 °F
        // ambient (above the 40 °F accumulation band).
        for (const k of Object.keys(s.flags)) {
            expect(s.flags[k], `flag ${k}`).toBe(false);
        }
        expect(s.verdict.kind).toBe('ok');
    });

    test('swapped roles: condAir drives the evaporator, airflow the condenser', () => {
        const { RefrigLoop } = loadEngine();
        // Outdoor airflow ↓ ⇒ suction dives (the frost-spiral term).
        const sweep = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4].map(
            (c) => RefrigLoop.solve({ mode: 'heating', condAir: c }));
        for (let i = 1; i < sweep.length; i++) {
            expect(sweep[i].tEvap, `tEvap step ${i}`).toBeLessThan(sweep[i - 1].tEvap);
            expect(sweep[i].pSuc,  `pSuc step ${i}`).toBeLessThan(sweep[i - 1].pSuc);
        }
        // Indoor airflow ↓ ⇒ head climbs (winter choked-filter story).
        const good = RefrigLoop.solve({ mode: 'heating', airflow: 1.0 });
        const choked = RefrigLoop.solve({ mode: 'heating', airflow: 0.5 });
        expect(choked.tCond).toBeGreaterThan(good.tCond);
        expect(choked.pDis).toBeGreaterThan(good.pDis);
        expect(choked.flags.highHead).toBe(true);       // split 50 > 38
        expect(good.flags.highHead).toBe(false);        // design split 35
        // Ambient tracks the EVAPORATOR 1:1; the condenser follows at the
        // droop slope (the real capacity fade — owner decision 2026-07-18;
        // this line originally pinned cold.tCond === mild.tCond).
        const mild = RefrigLoop.solve({ mode: 'heating', ambient: 47 });
        const cold = RefrigLoop.solve({ mode: 'heating', ambient: 17 });
        expect(mild.tEvap - cold.tEvap).toBeCloseTo(30, 6);
        expect(cold.tCond).toBeLessThan(mild.tCond);
        expect(mild.tCond - cold.tCond)
            .toBeCloseTo(RefrigLoop.DESIGN.SPLIT_AMB_HEAT * 30, 6);
        // Return air tracks the CONDENSER 1:1 and leaves the evaporator alone.
        const warm = RefrigLoop.solve({ mode: 'heating', returnT: 80 });
        const cool = RefrigLoop.solve({ mode: 'heating', returnT: 60 });
        expect(warm.tCond - cool.tCond).toBeCloseTo(20, 6);
        expect(warm.tEvap).toBeCloseTo(cool.tEvap, 6);
        // Compressor stage keeps its cooling directions.
        const stage1 = RefrigLoop.solve({ mode: 'heating', capacity: 0.5 });
        const stage2 = RefrigLoop.solve({ mode: 'heating', capacity: 1.0 });
        expect(stage2.pSuc).toBeLessThan(stage1.pSuc);
        expect(stage2.pDis).toBeGreaterThan(stage1.pDis);
    });

    test('frost flag: sub-32 coil AND sub-40 ambient, both strict', () => {
        const { RefrigLoop } = loadEngine();
        // 47 °F day: coil at 27 — sub-32, but ambient above the band. Normal.
        expect(RefrigLoop.solve({ mode: 'heating', ambient: 47 }).flags.frost).toBe(false);
        // Ambient gate is strict: 40 °F exactly stays clear, 39 °F frosts.
        expect(RefrigLoop.solve({ mode: 'heating', ambient: 40 }).flags.frost).toBe(false);
        const at39 = RefrigLoop.solve({ mode: 'heating', ambient: 39 });
        expect(at39.tEvap).toBeLessThan(32);
        expect(at39.flags.frost).toBe(true);
        expect(at39.flags.freeze).toBe(false);          // freeze is cooling-cycle-only
        expect(at39.verdict.kind).toBe('warn');
        expect(at39.verdict.text.toLowerCase()).toContain('frost');
        // Coil gate: light load + high outdoor airflow can hold the coil
        // above 32 even in the frost band — no frost then (39.5 °F sat).
        const warmCoil = RefrigLoop.solve({ mode: 'heating', ambient: 39,
            condAir: 1.2, capacity: 0.5 });
        expect(warmCoil.tEvap).toBeGreaterThanOrEqual(32);
        expect(warmCoil.flags.frost).toBe(false);
    });

    test('frostChoked: strict below the 0.75 outdoor-airflow fraction', () => {
        const { RefrigLoop } = loadEngine();
        const at75 = RefrigLoop.solve({ mode: 'heating', ambient: 35, condAir: 0.75 });
        expect(at75.flags.frost).toBe(true);
        expect(at75.flags.frostChoked).toBe(false);     // strict <
        const choked = RefrigLoop.solve({ mode: 'heating', ambient: 35, condAir: 0.70 });
        expect(choked.flags.frostChoked).toBe(true);
        expect(choked.verdict.kind).toBe('error');
        // The choked error outranks the (also-true) generic starve rung.
        expect(choked.flags.starvedOutdoor).toBe(true);
        expect(choked.verdict.text.toLowerCase()).toContain('frosted over');
    });

    test('tEvap is ceiling-clamped at ambient − MIN_APPROACH_HEAT', () => {
        const { RefrigLoop } = loadEngine();
        const D = RefrigLoop.DESIGN;
        // The verification-round repro: light load (stage 1) + overblown
        // outdoor fan at a mild ambient summed +20.5 °F of positive
        // authority — the raw block-A sat temp (65.5) crossed ABOVE the
        // 65 °F air the coil absorbs heat from. The ceiling holds it at
        // ambient − 2.
        const s = RefrigLoop.solve({ mode: 'heating', ambient: 65,
            condAir: 1.2, capacity: 0.5 });
        expect(s.tEvap).toBeCloseTo(65 - D.MIN_APPROACH_HEAT, 6);
        // MIN_LIFT still orders the pair after the ceiling pulls tEvap down.
        expect(s.tCond).toBeGreaterThanOrEqual(s.tEvap + D.MIN_LIFT - 1e-9);
        expect(s.pDis).toBeGreaterThan(s.pSuc);
        // Below the ceiling the raw block-A value is untouched (design day).
        expect(RefrigLoop.solve({ mode: 'heating' }).tEvap).toBe(27);
    });

    test('outdoor starve fires on deep approach at ANY ambient', () => {
        const { RefrigLoop } = loadEngine();
        // The verification-round repro: ambient 45 / condAir 0.40 pulled
        // the coil to 1 °F (suction ~50 psig) yet read green — above the
        // 40 °F frost band no rung saw the collapsed suction. The
        // approach rung does, ambient-independent.
        const s = RefrigLoop.solve({ mode: 'heating', ambient: 45, condAir: 0.40 });
        expect(s.tEvap).toBeCloseTo(1, 6);
        expect(s.flags.frost).toBe(false);              // 45 ≥ 40: no frost claim
        expect(s.flags.starvedOutdoor).toBe(true);
        expect(s.verdict.kind).toBe('warn');
        expect(s.verdict.text.toLowerCase()).toContain('outdoor coil starved');
        // Boundary is strict at approach 30 — at design knobs that lands
        // exactly on condAir 0.75 (40·0.25 = 10 over the 20 design
        // approach), the same physical line FROST_CHOKE_AIR specializes.
        const at30 = RefrigLoop.solve({ mode: 'heating', ambient: 45, condAir: 0.75 });
        expect(45 - at30.tEvap).toBeCloseTo(30, 6);
        expect(at30.flags.starvedOutdoor).toBe(false);  // strict >
        expect(at30.verdict.kind).toBe('ok');
        const past = RefrigLoop.solve({ mode: 'heating', ambient: 45, condAir: 0.70 });
        expect(past.flags.starvedOutdoor).toBe(true);
        // Cycle-gated: never fires in cooling or defrost.
        expect(RefrigLoop.solve({ condAir: 0.40 }).flags.starvedOutdoor).toBe(false);
        expect(RefrigLoop.solve(RefrigLoop.PRESETS.defrost).flags.starvedOutdoor).toBe(false);
    });

    test('hardware-keyed airside mirrors: the LCD remap is explicit', () => {
        const { RefrigLoop } = loadEngine();
        // Cooling: indoor IS the evaporator pair, outdoor the condenser pair.
        const c = RefrigLoop.solve(RefrigLoop.PRESETS.typical);
        expect(c.tAirInIndoor).toBe(c.tAirInEvap);
        expect(c.tAirOutIndoor).toBe(c.tAirOutEvap);
        expect(c.tAirInOutdoor).toBe(c.tAirInCond);
        expect(c.tAirOutOutdoor).toBe(c.tAirOutCond);
        // Heating: indoor air crosses the CONDENSER — the design-day supply
        // rise is 70 → 95, and outdoor air leaves the evaporator COOLED,
        // 47 → 35.
        const h = RefrigLoop.solve({ mode: 'heating' });
        expect(h.tAirInIndoor).toBe(70);
        expect(h.tAirOutIndoor).toBeCloseTo(95, 6);
        expect(h.tAirInOutdoor).toBe(47);
        expect(h.tAirOutOutdoor).toBeCloseTo(35, 6);
        expect(h.tAirInIndoor).toBe(h.tAirInCond);
        expect(h.tAirOutOutdoor).toBe(h.tAirOutEvap);
    });

    test('heating preset signatures: frosted / defrost / low-ambient', () => {
        const { RefrigLoop } = loadEngine();
        // Frosted outdoor coil — the heating headline: suction dives with
        // superheat NORMAL (the honesty guard's outdoor mirror), and the
        // choked-frost error owns the pill.
        const f = RefrigLoop.solve(RefrigLoop.PRESETS.frostedOutdoorCoil);
        expect(f.tEvap).toBe(-5);
        expect(f.superheat).toBeCloseTo(10, 6);
        expect(f.flags.starved).toBe(false);
        expect(f.flags.frost && f.flags.frostChoked).toBe(true);
        expect(f.flags.freeze).toBe(false);
        expect(f.verdict.kind).toBe('error');
        expect(f.verdict.text.toLowerCase()).toContain('frost');
        // Defrost — the honest cooling-cycle run: mode still echoes heating,
        // suction jumps off the warm indoor coil, the supply duct blows
        // ~50 °F (the "cold blow"), the fan-off head spike is narrated (not
        // alarmed — highHead suppressed), and the frost flags clear.
        const d = RefrigLoop.solve(RefrigLoop.PRESETS.defrost);
        expect(d.mode).toBe('heating');
        expect(d.flags.defrost).toBe(true);
        expect(d.tEvap).toBeCloseTo(37.5, 6);           // cooling block A at 70 °F return
        expect(d.tAirOutIndoor).toBeCloseTo(50, 6);     // the cold blow
        expect(d.flags.frost).toBe(false);
        expect(d.flags.freeze).toBe(false);
        expect(d.flags.highHead).toBe(false);
        expect(d.verdict.kind).toBe('warn');
        expect(d.verdict.text.toLowerCase()).toContain('defrost');
        // The gauge tell vs the heating design day: suction UP, head DOWN.
        const design = RefrigLoop.solve({ mode: 'heating' });
        expect(d.pSuc).toBeGreaterThan(design.pSuc);
        expect(d.pDis).toBeLessThan(design.pDis);
        // Low-ambient heating — the 17 °F rating point: deep-cold suction,
        // DROOPED head (the real capacity fade), plain frost warn (NOT
        // choked — airflow is clean).
        const l = RefrigLoop.solve(RefrigLoop.PRESETS.lowAmbientHeating);
        expect(l.tEvap).toBe(-3);
        expect(l.tCond).toBeCloseTo(90, 6);     // 105 − 0.5·30 droop
        expect(l.flags.frost).toBe(true);
        expect(l.flags.frostChoked).toBe(false);
        expect(l.verdict.kind).toBe('warn');
        expect(l.verdict.text.toLowerCase()).toContain('frost');
        // All three are COMPLETE knob sets carrying their mode (§3.5).
        for (const key of ['frostedOutdoorCoil', 'defrost', 'lowAmbientHeating']) {
            const p = RefrigLoop.PRESETS[key];
            expect(p.mode, key).toBe('heating');
            for (const k of ['airflow', 'returnT', 'charge', 'shTarget',
                'ambient', 'condAir', 'capacity', 'refrig']) {
                expect(p[k], `${key}.${k}`).toBeDefined();
            }
        }
    });

    test('cold-weather capacity fade: the condensing side droops', () => {
        // Owner decision 2026-07-18: a REAL ambient droop on heating block
        // C — as suction falls with the cold, less heat reaches the indoor
        // coil, so condensing temp (and, once the tCond − 2 cap undercuts
        // the design rise, the supply air) fades instead of holding at
        // design. One-sided: zero at the 47 °F anchor and above.
        const { RefrigLoop } = loadEngine();
        const at = (a) => RefrigLoop.solve({ mode: 'heating', ambient: a });
        // The rating point is the anchor — droop is exactly zero there,
        // and a mild day holds the design split (no highHead false flag).
        expect(at(47).tCond).toBe(105);
        expect(at(65).tCond).toBe(105);
        expect(at(65).flags.highHead).toBe(false);
        // Strictly decreasing below the anchor — head follows.
        const sweep = [47, 37, 27, 17, 7, -5].map(at);
        for (let i = 1; i < sweep.length; i++) {
            expect(sweep[i].tCond, `tCond step ${i}`).toBeLessThan(sweep[i - 1].tCond);
            expect(sweep[i].pDis,  `pDis step ${i}`).toBeLessThan(sweep[i - 1].pDis);
        }
        // The 17 °F rating point lands the supply in the published band.
        const s17 = at(17);
        expect(s17.tCond).toBeCloseTo(90, 6);
        expect(s17.tAirOutIndoor).toBeGreaterThanOrEqual(85);
        expect(s17.tAirOutIndoor).toBeLessThanOrEqual(90);      // lands 88
        // Deeper cold droops the supply further still…
        expect(at(-5).tAirOutIndoor).toBeLessThan(s17.tAirOutIndoor);
        // …while just inside the frost band the design rise (95) still
        // governs — the droop reads on the head gauge before the duct.
        expect(at(39).tAirOutIndoor).toBeCloseTo(95, 6);
    });

    test('pressure ordering + air orderings hold over the heating box', () => {
        const { RefrigLoop, REFRIGERANT_TYPES } = loadEngine();
        const C = RefrigLoop.CLAMPS_HEATING;
        const D = RefrigLoop.DESIGN;
        const axes = ['airflow', 'returnT', 'charge', 'shTarget', 'ambient', 'condAir', 'capacity'];
        const HW_NUMS = STATE_NUMS.concat(['tAirInIndoor', 'tAirOutIndoor',
            'tAirInOutdoor', 'tAirOutOutdoor']);
        for (const id of Object.keys(REFRIGERANT_TYPES)) {
            for (let mask = 0; mask < (1 << axes.length); mask++) {
                const inp = { mode: 'heating', refrig: id };
                axes.forEach((k, i) => { inp[k] = (mask & (1 << i)) ? C[k].max : C[k].min; });
                const s = RefrigLoop.solve(inp);
                expect(allFinite(s, HW_NUMS), `finite ${id} mask ${mask}`).toBe(true);
                expect(s.pDis, `pDis>pSuc ${id} mask ${mask}`).toBeGreaterThan(s.pSuc);
                expect(s.tCond, `lift ${id} mask ${mask}`)
                    .toBeGreaterThanOrEqual(s.tEvap + D.MIN_LIFT - 1e-9);
                // The evaporating coil never crosses the air it absorbs
                // heat from (the ceiling clamp — 16 pre-fix corners did).
                expect(s.tEvap, `approach ceiling ${id} mask ${mask}`)
                    .toBeLessThanOrEqual(inp.ambient - D.MIN_APPROACH_HEAT + 1e-9);
                // Outdoor air never leaves WARMER than it entered the
                // evaporating coil (the light-load degenerate collapses the
                // drop to zero instead); indoor air never leaves COOLER.
                expect(s.tAirOutEvap, `outdoor cools ${id} mask ${mask}`)
                    .toBeLessThanOrEqual(s.tAirInEvap + 1e-9);
                expect(s.tAirOutEvap, `outdoor floor ${id} mask ${mask}`)
                    .toBeGreaterThanOrEqual(Math.min(s.tAirInEvap, s.tEvap + D.AIR_APPROACH) - 1e-9);
                expect(s.tAirOutCond, `indoor warms ${id} mask ${mask}`)
                    .toBeGreaterThanOrEqual(s.tAirInCond - 1e-9);
                expect(s.tAirOutCond, `indoor cap ${id} mask ${mask}`)
                    .toBeLessThanOrEqual(Math.max(s.tAirInCond, s.tCond - D.AIR_APPROACH) + 1e-9);
            }
        }
    });
});

// ── 13. Loop-SVG geometry guards (source-level) ──────────────────────────
// The simulator page's loop schematic is static markup the animation JS
// hooks by id — same read-the-file grounding as loadEngine() above, aimed
// at the page source instead of the engine. Two guarded families:
//   • crossflow air lanes — every lane is a single vertical segment (the
//     crossflow axis), each IN/OUT pair shares its column and meets at
//     the coil's tube row (y=85 condenser / y=345 evaporator), and path
//     drawing order is the flow direction (condenser air rises → y
//     decreasing; evaporator air drops → y increasing). Exact x columns
//     are deliberately NOT pinned — they may be nudged for label
//     clearance — only the pairing and axis contracts are.
//   • serpentine coil runs — H/V-only square waves whose endpoints join
//     the pipe joints exactly (no particle teleport), and the state
//     gradients they ride declare userSpaceOnUse (the contract that lets
//     particle <circle> fills sample the ramp at their true position).

function loadPageSource() {
    return fs.readFileSync(
        path.join(__dirname, '..', 'html', 'simulators', 'refrigerant-loop.html'),
        'utf8');
}

// First d="…" after the given id inside the same tag (lazy [^>]*? keeps
// the match inside one element; \s keeps `d=` from matching mid-word).
function pathD(src, id) {
    const m = src.match(new RegExp('id="' + id + '"[^>]*?\\sd="([^"]+)"'));
    return m ? m[1] : null;
}

test.describe('refrigerant-loop page: crossflow air-lane geometry', () => {

    const LANE_IDS = ['rl-air-c-in-a', 'rl-air-c-out-a', 'rl-air-c-in-b',
        'rl-air-c-out-b', 'rl-air-e-in-a', 'rl-air-e-out-a', 'rl-air-e-in-b',
        'rl-air-e-out-b'];

    // Parse every lane's d as `M x y0 V y1` — the single-vertical-segment
    // contract — and hand back {x, y0, y1} per id.
    function laneSegs() {
        const src = loadPageSource();
        const segs = {};
        for (const id of LANE_IDS) {
            const d = pathD(src, id);
            expect(d, `${id} has a d attribute`).toBeTruthy();
            const m = d.match(/^M (\d+(?:\.\d+)?) (\d+(?:\.\d+)?) V (\d+(?:\.\d+)?)$/);
            expect(m, `${id} is a single vertical segment: "${d}"`).toBeTruthy();
            segs[id] = { x: parseFloat(m[1]), y0: parseFloat(m[2]), y1: parseFloat(m[3]) };
        }
        return segs;
    }

    test('all 8 lanes are single vertical segments in two distinct columns', () => {
        const segs = laneSegs();
        // a and b columns are distinct, and each coil's a/b pair straddles
        // the same two columns as the other coil's.
        expect(segs['rl-air-c-in-a'].x).not.toBe(segs['rl-air-c-in-b'].x);
        expect(segs['rl-air-e-in-a'].x).toBe(segs['rl-air-c-in-a'].x);
        expect(segs['rl-air-e-in-b'].x).toBe(segs['rl-air-c-in-b'].x);
    });

    test('IN/OUT pairs share a column and meet at the tube row (85 / 345)', () => {
        const segs = laneSegs();
        for (const p of ['a', 'b']) {
            expect(segs[`rl-air-c-in-${p}`].x, `cond pair ${p} column`)
                .toBe(segs[`rl-air-c-out-${p}`].x);
            expect(segs[`rl-air-c-in-${p}`].y1, `cond in-${p} ends at the tube row`).toBe(85);
            expect(segs[`rl-air-c-out-${p}`].y0, `cond out-${p} starts at the tube row`).toBe(85);
            expect(segs[`rl-air-e-in-${p}`].x, `evap pair ${p} column`)
                .toBe(segs[`rl-air-e-out-${p}`].x);
            expect(segs[`rl-air-e-in-${p}`].y1, `evap in-${p} ends at the tube row`).toBe(345);
            expect(segs[`rl-air-e-out-${p}`].y0, `evap out-${p} starts at the tube row`).toBe(345);
        }
    });

    test('path order is the flow direction: condenser rises, evaporator drops', () => {
        const segs = laneSegs();
        for (const id of LANE_IDS) {
            const s = segs[id];
            if (id.indexOf('rl-air-c-') === 0) {
                expect(s.y1, `${id} rises (y decreasing)`).toBeLessThan(s.y0);
            } else {
                expect(s.y1, `${id} drops (y increasing)`).toBeGreaterThan(s.y0);
            }
        }
    });
});

test.describe('refrigerant-loop page: serpentine coils + state gradients', () => {

    // Entry/exit ARE the pipe joints: rl-discharge ends at (200,85) and
    // rl-liquid starts at (520,85); rl-expansion ends at (520,345) and
    // rl-suction starts at (200,345). Draw order = flow direction, so
    // the evaporator run is right→left.
    const SERPENTINES = {
        'rl-coil-cond': { start: [200, 85], end: [520, 85] },
        'rl-coil-evap': { start: [520, 345], end: [200, 345] },
    };

    test('serpentine ds are H/V-only and join the pipe endpoints', () => {
        const src = loadPageSource();
        for (const id of Object.keys(SERPENTINES)) {
            const d = pathD(src, id);
            expect(d, `${id} has a d attribute`).toBeTruthy();
            const m = d.match(/^M (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)((?: [HV] \d+(?:\.\d+)?)+)$/);
            expect(m, `${id} is M + H/V-only commands: "${d}"`).toBeTruthy();
            let x = parseFloat(m[1]);
            let y = parseFloat(m[2]);
            expect([x, y], `${id} starts at its pipe joint`).toEqual(SERPENTINES[id].start);
            const cmds = m[3].trim().split(' ');
            for (let i = 0; i < cmds.length; i += 2) {
                if (cmds[i] === 'H') x = parseFloat(cmds[i + 1]);
                else y = parseFloat(cmds[i + 1]);
            }
            expect([x, y], `${id} ends at its pipe joint`).toEqual(SERPENTINES[id].end);
        }
    });

    test('both state gradients declare userSpaceOnUse', () => {
        const src = loadPageSource();
        for (const id of ['rl-grad-cond', 'rl-grad-evap']) {
            const m = src.match(new RegExp('<linearGradient id="' + id + '"[^>]*>'));
            expect(m, `${id} exists`).toBeTruthy();
            expect(m[0], `${id} samples root user space (particle-fill contract)`)
                .toContain('gradientUnits="userSpaceOnUse"');
        }
    });

    test('the moving stops + span geometry setGradient rewrites exist', () => {
        // The page JS dereferences these unguarded every solve: the four
        // -hold/-done stops it moves, and each gradient's x1/x2 baseline
        // (GRAD_GEOM) it stretches past the bar for flash gas / floodback.
        const src = loadPageSource();
        for (const id of ['rl-grad-cond-hold', 'rl-grad-cond-done',
            'rl-grad-evap-hold', 'rl-grad-evap-done']) {
            expect(src, `${id} stop present`).toContain('<stop id="' + id + '"');
        }
        expect(src, 'condenser span matches GRAD_GEOM (x1=200, dx=+320)')
            .toMatch(/<linearGradient id="rl-grad-cond"[^>]*x1="200"[^>]*x2="520"/);
        expect(src, 'evaporator span matches GRAD_GEOM (x1=520, dx=-320)')
            .toMatch(/<linearGradient id="rl-grad-evap"[^>]*x1="520"[^>]*x2="200"/);
    });
});

// ── 14. Heat-pump re-route (MODE_GEOM) guards (source-level) ─────────────
// The mode flip swaps the six flow elements' d attributes from the page's
// MODE_GEOM table — draw order IS particle direction, so the table is a
// physics claim, not decoration. Four contracts:
//   • the COOLING entries equal the markup d attributes byte-for-byte (the
//     markup is the cooling state; a nudge to one side without the other
//     would silently desync the mode flip);
//   • the HEATING entries are H/V-only paths whose endpoints chain around
//     the loop COUNTERCLOCKWISE — compressor top port → through the valve
//     → bottom (indoor) bar → metering → top (outdoor) bar → back through
//     the valve → compressor bottom port — with no particle teleports at
//     the joints;
//   • the COMPRESSOR PORTS ARE FIXED (the 2026-07-18 re-plumb): discharge
//     starts at the top port and suction ends at the bottom port in BOTH
//     modes — both lines terminate at the reversing valve (their runs
//     thread its capsule), and only the valve's coil-side legs re-route.
//     A real compressor's ports never trade function; the valve does all
//     the swapping;
//   • the GRAD_Y table matches: each state gradient follows its coil to
//     the other bar's tube row (85 ↔ 345).
// A failure here is a design signal, not a test to loosen.

// Extract a { cooling: {id: d}, heating: {id: d} } table from the page's
// inline-JS MODE_GEOM literal (entries are one-per-line quoted pairs).
function modeGeomTable(src) {
    const block = src.match(/const MODE_GEOM = \{([\s\S]*?)\n {8}\};/);
    expect(block, 'MODE_GEOM literal found').toBeTruthy();
    const out = {};
    for (const mode of ['cooling', 'heating']) {
        const sub = block[1].match(new RegExp(mode + ': \\{([\\s\\S]*?)\\}'));
        expect(sub, `MODE_GEOM.${mode} found`).toBeTruthy();
        out[mode] = {};
        const entryRe = /'([a-z-]+)': '([^']+)'/g;
        let m;
        while ((m = entryRe.exec(sub[1])) !== null) out[mode][m[1]] = m[2];
    }
    return out;
}

// Walk an M + H/V-only d and return its [start, end] points.
function hvEndpoints(d, label) {
    const m = d.match(/^M (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)((?: [HV] -?\d+(?:\.\d+)?)+)$/);
    expect(m, `${label} is M + H/V-only commands: "${d}"`).toBeTruthy();
    const start = [parseFloat(m[1]), parseFloat(m[2])];
    let x = start[0], y = start[1];
    const cmds = m[3].trim().split(' ');
    for (let i = 0; i < cmds.length; i += 2) {
        if (cmds[i] === 'H') x = parseFloat(cmds[i + 1]);
        else y = parseFloat(cmds[i + 1]);
    }
    return [start, [x, y]];
}

// Walk the same shape into its [x1, y1, x2, y2] segment list.
function hvSegments(d, label) {
    const m = d.match(/^M (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)((?: [HV] -?\d+(?:\.\d+)?)+)$/);
    expect(m, `${label} is M + H/V-only commands: "${d}"`).toBeTruthy();
    let x = parseFloat(m[1]), y = parseFloat(m[2]);
    const segs = [];
    const cmds = m[3].trim().split(' ');
    for (let i = 0; i < cmds.length; i += 2) {
        const v = parseFloat(cmds[i + 1]);
        if (cmds[i] === 'H') { segs.push([x, y, v, y]); x = v; }
        else { segs.push([x, y, x, v]); y = v; }
    }
    return segs;
}

test.describe('refrigerant-loop page: heat-pump MODE_GEOM re-route', () => {

    const FLOW_IDS = ['rl-discharge', 'rl-liquid', 'rl-expansion',
        'rl-suction', 'rl-coil-cond', 'rl-coil-evap'];

    test('cooling MODE_GEOM entries equal the markup d attributes', () => {
        const src = loadPageSource();
        const geom = modeGeomTable(src);
        for (const id of FLOW_IDS) {
            expect(geom.cooling[id], `${id} cooling entry present`).toBeTruthy();
            expect(geom.cooling[id], `${id} table matches markup`)
                .toBe(pathD(src, id));
        }
    });

    test('heating entries chain counterclockwise with no teleports', () => {
        const geom = modeGeomTable(loadPageSource()).heating;
        const pts = {};
        for (const id of FLOW_IDS) {
            expect(geom[id], `${id} heating entry present`).toBeTruthy();
            pts[id] = hvEndpoints(geom[id], `${id} heating`);
        }
        // Compressor top port → (valve) → indoor (bottom) bar left joint …
        expect(pts['rl-discharge'][0]).toEqual([120, 193]);
        expect(pts['rl-discharge'][1]).toEqual([200, 345]);
        // … condensing serpentine crosses the BOTTOM bar left→right …
        expect(pts['rl-coil-cond'][0]).toEqual(pts['rl-discharge'][1]);
        expect(pts['rl-coil-cond'][1]).toEqual([520, 345]);
        // … liquid climbs to the metering device's bottom port …
        expect(pts['rl-liquid'][0]).toEqual(pts['rl-coil-cond'][1]);
        expect(pts['rl-liquid'][1]).toEqual([600, 235]);
        // … expansion drops out of its top port to the outdoor (top) bar …
        expect(pts['rl-expansion'][0]).toEqual([600, 195]);
        expect(pts['rl-expansion'][1]).toEqual([520, 85]);
        // … evaporating serpentine crosses the TOP bar right→left …
        expect(pts['rl-coil-evap'][0]).toEqual(pts['rl-expansion'][1]);
        expect(pts['rl-coil-evap'][1]).toEqual([200, 85]);
        // … and suction returns through the valve to the bottom port.
        expect(pts['rl-suction'][0]).toEqual(pts['rl-coil-evap'][1]);
        expect(pts['rl-suction'][1]).toEqual([120, 237]);
    });

    test('compressor ports are fixed: the valve, not the compressor, swaps', () => {
        // The re-plumb invariant: discharge starts at the top port and
        // suction ends at the bottom port in BOTH modes — the coil-side
        // ends are the only thing MODE_GEOM may move.
        const geom = modeGeomTable(loadPageSource());
        for (const mode of ['cooling', 'heating']) {
            const dis = hvEndpoints(geom[mode]['rl-discharge'], `rl-discharge ${mode}`);
            const suc = hvEndpoints(geom[mode]['rl-suction'], `rl-suction ${mode}`);
            expect(dis[0], `discharge leaves the top port (${mode})`).toEqual([120, 193]);
            expect(suc[1], `suction enters the bottom port (${mode})`).toEqual([120, 237]);
        }
    });

    test('both compressor lines thread the reversing-valve capsule in both modes', () => {
        // Real hardware: both lines terminate at the 4-way. Depicted here
        // as both runs passing through the capsule's rect in every mode.
        const src = loadPageSource();
        const cap = src.match(
            /<g id="rl-revvalve">\s*<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/);
        expect(cap, 'valve capsule rect found').toBeTruthy();
        const rx0 = +cap[1], ry0 = +cap[2], rx1 = rx0 + +cap[3], ry1 = ry0 + +cap[4];
        const hits = segs => segs.some(([x1, y1, x2, y2]) =>
            Math.min(x1, x2) <= rx1 && Math.max(x1, x2) >= rx0 &&
            Math.min(y1, y2) <= ry1 && Math.max(y1, y2) >= ry0);
        const geom = modeGeomTable(src);
        for (const mode of ['cooling', 'heating']) {
            for (const id of ['rl-discharge', 'rl-suction']) {
                expect(hits(hvSegments(geom[mode][id], `${id} ${mode}`)),
                    `${id} passes through the valve capsule (${mode})`).toBe(true);
            }
        }
    });

    test('GRAD_Y swaps each gradient to the other bar\'s tube row', () => {
        const src = loadPageSource();
        const block = src.match(/const GRAD_Y = \{([\s\S]*?)\n {8}\};/);
        expect(block, 'GRAD_Y literal found').toBeTruthy();
        const rows = {};
        for (const mode of ['cooling', 'heating']) {
            const m = block[1].match(new RegExp(
                mode + ": \\{ 'rl-grad-cond': (\\d+), 'rl-grad-evap': (\\d+) \\}"));
            expect(m, `GRAD_Y.${mode} found`).toBeTruthy();
            rows[mode] = { cond: parseInt(m[1], 10), evap: parseInt(m[2], 10) };
        }
        // Cooling rows equal the markup gradients' y1 …
        expect(String(rows.cooling.cond))
            .toBe(src.match(/<linearGradient id="rl-grad-cond"[^>]*y1="(\d+)"/)[1]);
        expect(String(rows.cooling.evap))
            .toBe(src.match(/<linearGradient id="rl-grad-evap"[^>]*y1="(\d+)"/)[1]);
        // … and heating is the bar swap (cond → bottom row, evap → top).
        expect(rows.heating.cond).toBe(rows.cooling.evap);
        expect(rows.heating.evap).toBe(rows.cooling.cond);
    });
});
