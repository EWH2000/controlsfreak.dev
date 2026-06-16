// Engine-direct tests for /scripts/psychro-engine.js. Lives under
// tests/*.spec.js so the same `npm test` (Playwright) runner picks it
// up — Playwright workers are Node processes, the `page` fixture is
// just unused here. No second runner to install or configure.
//
// The engine is a classic browser script: top-level function
// declarations + a `const Psychro = (function(){…})()` IIFE at the
// bottom. Top-level `function` / `const` declarations don't attach
// to a `vm.runInNewContext` context bag, so we append a trailing
// expression that bundles every named export and rely on
// `runInNewContext` returning the script's last completion value.

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

function loadEngine() {
    const src = fs.readFileSync(
        path.join(__dirname, '..', 'html', 'scripts', 'psychro-engine.js'),
        'utf8',
    );
    // Leading `;` defends against ASI gluing this onto the previous
    // line — `})();` followed by `({…})` would otherwise parse as
    // calling the IIFE's return value with `({…})` as its argument.
    const trailer = `
        ; ({
            P_STD, GR_PER_LB, MW_RATIO, R_DA,
            satPress, satHumRatio, humRatioFromVapPress, vapPressFromHumRatio,
            humRatioFromRH, rhFromHumRatio, enthalpy, specificVolume,
            humRatioFromWetBulb, wetBulbFromHumRatio, dewPointFromVapPress,
            pressFromAltitude, Psychro,
        });
    `;
    return vm.runInNewContext(src + trailer, {});
}

test.describe('psychro-engine: pure-math invariants', () => {

    test('ASHRAE reference point — 80 °F / 60 % RH at sea level', () => {
        const { Psychro, P_STD, GR_PER_LB } = loadEngine();
        const state = Psychro.solveState('rh', 80, 60, P_STD);
        expect(state.ok).toBe(true);
        // ASHRAE 2017 Fundamentals Ch. 1 reference: W ≈ 92.1 gr/lb,
        // h ≈ 33.6 Btu/lb (per PR #29 review transcript).
        expect(state.W * GR_PER_LB).toBeCloseTo(92.1, 0);
        expect(state.h).toBeCloseTo(33.6, 1);
    });

    test('ASHRAE reference point — 95 °F / 75 °F WB at sea level', () => {
        const { Psychro, P_STD, GR_PER_LB } = loadEngine();
        const state = Psychro.solveState('wb', 95, 75, P_STD);
        expect(state.ok).toBe(true);
        // ASHRAE 2017 Fundamentals Ch. 1 reference: W ≈ 98.5 gr/lb,
        // h ≈ 38.3 Btu/lb (per PR #29 review transcript).
        expect(state.W * GR_PER_LB).toBeCloseTo(98.5, 0);
        expect(state.h).toBeCloseTo(38.3, 1);
    });

    test('5-mode round-trip identity — same point, five Define-by paths', () => {
        const { Psychro, P_STD, GR_PER_LB } = loadEngine();

        // Define the reference point via WB.
        const ref = Psychro.solveState('wb', 80, 70, P_STD);
        expect(ref.ok).toBe(true);

        // Re-solve the same point via each of the other four modes,
        // using the reference state's properties as the second input.
        const variants = {
            wb: Psychro.solveState('wb', 80, ref.twb,           P_STD),
            rh: Psychro.solveState('rh', 80, ref.rh,            P_STD),
            dp: Psychro.solveState('dp', 80, ref.tdp,           P_STD),
            w:  Psychro.solveState('w',  80, ref.W * GR_PER_LB, P_STD),
            h:  Psychro.solveState('h',  80, ref.h,             P_STD),
        };

        for (const [mode, v] of Object.entries(variants)) {
            expect(v.ok, `mode=${mode}`).toBe(true);
            // Two decimals is comfortably looser than the engine's
            // actual precision (bisection runs 70 iterations on a
            // 10s-of-°F interval ⇒ ~1e-19 °F) but tolerant to any
            // future formula tweaks that shift the LSB.
            expect(v.W,   `W   mode=${mode}`).toBeCloseTo(ref.W,   4);
            expect(v.h,   `h   mode=${mode}`).toBeCloseTo(ref.h,   2);
            expect(v.twb, `twb mode=${mode}`).toBeCloseTo(ref.twb, 2);
            expect(v.rh,  `rh  mode=${mode}`).toBeCloseTo(ref.rh,  2);
            expect(v.tdp, `tdp mode=${mode}`).toBeCloseTo(ref.tdp, 2);
        }
    });

    test('dewPointFromVapPress signals out-of-range above the saturation ceiling (#103)', () => {
        const { dewPointFromVapPress, satPress } = loadEngine();
        // A normal sea-level vapor pressure resolves to a finite dew point.
        expect(isFinite(dewPointFromVapPress(0.5))).toBe(true);
        // Above satPress(250) the bisection can't converge — it returns
        // Infinity (mirroring the pw<=0 → -Infinity low end) so a caller's
        // isFinite guard catches it instead of a clamped ~250 that looks real.
        const ceiling = satPress(250);
        expect(dewPointFromVapPress(ceiling + 5)).toBe(Infinity);
        expect(dewPointFromVapPress(-1)).toBe(-Infinity);   // low-end convention, unchanged
    });

});

test.describe('psychro-engine: computeProcess / invertProcess (#125)', () => {

    // computeProcess returns SIGNED loads (qSens = mDot·cpIn·ΔTdb, negative
    // for cooling); invertProcess takes positive magnitudes. So the
    // round-trip feeds back |qSens| / |qLat|.
    test('compute → invert recovers the leaving state (cooling)', () => {
        const { Psychro, P_STD } = loadEngine();
        const cfm = 400;
        const inlet  = Psychro.solveState('rh', 80, 50, P_STD);   // warm, humid
        const outlet = Psychro.solveState('rh', 55, 90, P_STD);   // cooled + dehumidified
        const cp = Psychro.computeProcess({ inlet, outlet, type: 'cool' }, cfm);
        const inv = Psychro.invertProcess(inlet, {
            type: 'cool', cfm, qSens: -cp.qSens, qLat: -cp.qLat,
        });
        expect(inv.ok).toBe(true);
        expect(inv.tdb).toBeCloseTo(outlet.tdb, 6);
        expect(inv.W).toBeCloseTo(outlet.W, 8);
    });

    test('compute → invert recovers the leaving state (sensible heating)', () => {
        const { Psychro, P_STD } = loadEngine();
        const cfm = 600;
        const inlet  = Psychro.solveState('rh', 60, 40, P_STD);
        const outlet = Psychro.buildState(95, inlet.W, P_STD);    // heated, W unchanged
        const cp = Psychro.computeProcess({ inlet, outlet, type: 'heat' }, cfm);
        const inv = Psychro.invertProcess(inlet, { type: 'heat', cfm, qSens: cp.qSens });
        expect(inv.ok).toBe(true);
        expect(inv.tdb).toBeCloseTo(outlet.tdb, 6);
        expect(inv.W).toBeCloseTo(inlet.W, 8);
    });

    test('SHR: between 0 and 1 for a mixed cool, ≈1 for pure-sensible cool', () => {
        const { Psychro, P_STD } = loadEngine();
        const inlet = Psychro.solveState('rh', 80, 50, P_STD);
        // Mixed (sensible + latent) cooling.
        const wet = Psychro.computeProcess(
            { inlet, outlet: Psychro.solveState('rh', 55, 90, P_STD), type: 'cool' }, 400);
        expect(wet.shr).toBeGreaterThan(0);
        expect(wet.shr).toBeLessThan(1);
        // Pure-sensible cooling (W held) → SHR ≈ 1.
        const dry = Psychro.computeProcess(
            { inlet, outlet: Psychro.buildState(65, inlet.W, P_STD), type: 'cool' }, 400);
        expect(dry.shr).toBeCloseTo(1, 6);
    });

    test('invertProcess rejects bad inputs', () => {
        const { Psychro, P_STD } = loadEngine();
        const inlet = Psychro.solveState('rh', 80, 50, P_STD);
        expect(Psychro.invertProcess(inlet, { type: 'cool', cfm: 0,   qSens: 100 }).ok).toBe(false);
        expect(Psychro.invertProcess(inlet, { type: 'cool', cfm: 400, qSens: -1 }).ok).toBe(false);
        expect(Psychro.invertProcess(inlet, { type: 'cool', cfm: 400, qSens: 100, qLat: -1 }).ok).toBe(false);
        // A huge latent removal drives the leaving point past bone-dry.
        expect(Psychro.invertProcess(inlet, { type: 'cool', cfm: 400, qSens: 100, qLat: 5e6 }).ok).toBe(false);
    });

    test('the saturated flag fires when the leaving point lands on the curve', () => {
        const { Psychro, P_STD } = loadEngine();
        const inlet = Psychro.solveState('rh', 80, 50, P_STD);
        // Cool hard (high sensible) with no dehumidification: tdb drops below
        // the entering dew point, so the held W now exceeds saturation at the
        // colder leaving tdb — buildState clamps it and flags saturated.
        const inv = Psychro.invertProcess(inlet, { type: 'cool', cfm: 400, qSens: 200000, qLat: 0 });
        expect(inv.ok).toBe(true);
        expect(inv.saturated).toBe(true);
    });

});
