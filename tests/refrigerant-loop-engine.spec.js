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
