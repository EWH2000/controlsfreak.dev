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

// ── 12. Loop-SVG geometry guards (source-level) ──────────────────────────
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
