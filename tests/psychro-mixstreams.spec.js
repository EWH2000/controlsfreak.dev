// Engine-direct tests for Psychro.mixStreams — the shared air-mixing
// helper. Lives under tests/*.spec.js so the same `npm test`
// (Playwright) runner picks it up; Playwright workers are Node
// processes, the `page` fixture is just unused here.
//
// LOADER: the ddcw-fcu-unit.spec.js shape — one BARE vm context, the
// engine run into it, then the symbol read back out of that context's
// global lexical scope (top-level `const` declarations in a classic
// script don't attach to the context bag, but a second script in the
// same context sees them). The bare `{}` IS an assertion: the engine
// promises to touch neither `document` nor `window`, and a violation
// throws ReferenceError right here.
//
// POLICY — INVARIANTS, NOT FEEL CONSTANTS. Nothing below pins a
// psychrometric constant or a coefficient. Every row asserts a
// DIRECTION, an ORDERING, a CLAMP BAND, or a CONTRACT SHAPE:
//   a lone stream is its own mix; a zero weight vanishes; the mix
//   lands between its sources; it moves monotonically with the
//   weights; enthalpy is EXACTLY the flow-weighted mean (that is the
//   thing being conserved); mixing is associative; every guard says
//   no; and a mass basis and a volumetric basis disagree in the
//   direction the function's header claims they do.
//
// The one thing this file deliberately does NOT assert is a WEIGHT
// BASIS. mixStreams weights by `flow` and says nothing about units —
// the caller owns that choice. The mass-vs-volume row below pins the
// DIRECTION of the disagreement, not either answer.

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

const SCRIPTS = path.join(__dirname, '..', 'html', 'scripts');

function loadEngine() {
    const ctx = vm.createContext({});
    vm.runInContext(
        fs.readFileSync(path.join(SCRIPTS, 'psychro-engine.js'), 'utf8'),
        ctx, { filename: 'psychro-engine.js' });
    return vm.runInContext('({ Psychro, P_STD, enthalpy, specificVolume });', ctx);
}

// Two stock streams: warm humid outdoor air and cooler drier return
// air. Distinct on BOTH dry-bulb and humidity ratio, so a between-ness
// or monotonicity row can't pass by accident on a coincidence.
function stock(E) {
    return {
        oa: E.Psychro.solveState('rh', 95, 60, E.P_STD),
        ra: E.Psychro.solveState('rh', 75, 40, E.P_STD),
    };
}

test.describe('psychro-engine: mixStreams contract shape', () => {

    test('the helper loads headless and is on the Psychro namespace', () => {
        const E = loadEngine();
        expect(typeof E.Psychro.mixStreams).toBe('function');
    });

    test('a single stream mixes to itself', () => {
        const E = loadEngine();
        const { oa } = stock(E);
        const mix = E.Psychro.mixStreams([{ state: oa, flow: 3500 }], E.P_STD);
        expect(mix.ok).toBe(true);
        expect(mix.tdb).toBeCloseTo(oa.tdb, 8);
        expect(mix.W).toBeCloseTo(oa.W, 10);
        expect(mix.h).toBeCloseTo(oa.h, 8);
    });

    test('a zero weight vanishes — the other stream comes back untouched', () => {
        const E = loadEngine();
        const { oa, ra } = stock(E);
        const mix = E.Psychro.mixStreams([
            { state: oa, flow: 0 },
            { state: ra, flow: 1200 },
        ], E.P_STD);
        expect(mix.ok).toBe(true);
        expect(mix.tdb).toBeCloseTo(ra.tdb, 8);
        expect(mix.W).toBeCloseTo(ra.W, 10);
    });

    test('every guard says no, with a message', () => {
        const E = loadEngine();
        const { oa, ra } = stock(E);
        const bad = E.Psychro.solveState('rh', 75, 140, E.P_STD);   // RH > 100 → not ok
        expect(bad.ok).toBe(false);

        const cases = {
            'not an array':      E.Psychro.mixStreams(null, E.P_STD),
            'no streams':        E.Psychro.mixStreams([], E.P_STD),
            'a non-ok state':    E.Psychro.mixStreams([{ state: bad, flow: 1 }, { state: ra, flow: 1 }], E.P_STD),
            'a missing state':   E.Psychro.mixStreams([{ flow: 1 }], E.P_STD),
            'a non-finite flow': E.Psychro.mixStreams([{ state: oa, flow: NaN }, { state: ra, flow: 1 }], E.P_STD),
            'an infinite flow':  E.Psychro.mixStreams([{ state: oa, flow: Infinity }, { state: ra, flow: 1 }], E.P_STD),
            'a negative flow':   E.Psychro.mixStreams([{ state: oa, flow: -1 }, { state: ra, flow: 2 }], E.P_STD),
            'zero total flow':   E.Psychro.mixStreams([{ state: oa, flow: 0 }, { state: ra, flow: 0 }], E.P_STD),
        };
        Object.entries(cases).forEach(([label, out]) => {
            expect(out.ok, label).toBe(false);
            expect(typeof out.error, label + ' carries a message').toBe('string');
            expect(out.error.length, label + ' message is not empty').toBeGreaterThan(0);
        });
    });

    test('a numeric-STRING flow coerces to the same answer as the number', () => {
        // The guard has always accepted a numeric string (`isFinite`
        // coerces, the same tolerance solveState carries) — but the
        // weights run through the engine's only `+=` accumulator over
        // caller-supplied values, and `0 + '200'` is the string '0200'.
        // Un-coerced, two DOM-read flows totalled 200800, the weights
        // summed to ~0.005, and the helper returned 0.30 °F where the
        // numeric call returns 60.20 — silently, with ok:true. The four
        // inline air-mixing call sites this helper exists to absorb
        // (codebase-issues #228) all read `.value` off an input, so
        // accept-and-coerce is the contract; this row is what pins it.
        const E = loadEngine();
        const oa = E.Psychro.solveState('rh', 0, 40, E.P_STD);
        const ra = E.Psychro.solveState('rh', 75, 50, E.P_STD);
        const num = E.Psychro.mixStreams([
            { state: oa, flow: 400 },
            { state: ra, flow: 1600 },
        ], E.P_STD);
        const str = E.Psychro.mixStreams([
            { state: oa, flow: '400' },
            { state: ra, flow: '1600' },
        ], E.P_STD);
        expect(num.ok && str.ok, 'both forms are accepted').toBe(true);
        expect(str.tdb, 'and land on the same dry-bulb').toBeCloseTo(num.tdb, 12);
        expect(str.W, 'and the same humidity ratio').toBeCloseTo(num.W, 14);
    });
});

test.describe('psychro-engine: mixStreams invariants', () => {

    test('the mix lands strictly between its sources on both W and h', () => {
        const E = loadEngine();
        const { oa, ra } = stock(E);
        const mix = E.Psychro.mixStreams([
            { state: oa, flow: 400 },
            { state: ra, flow: 1600 },
        ], E.P_STD);
        expect(mix.ok).toBe(true);
        [['W', 'W'], ['h', 'h'], ['tdb', 'dry-bulb']].forEach(([k, label]) => {
            expect(mix[k], label + ' above the cooler source').toBeGreaterThan(Math.min(oa[k], ra[k]));
            expect(mix[k], label + ' below the warmer source').toBeLessThan(Math.max(oa[k], ra[k]));
        });
    });

    test('enthalpy is EXACTLY the flow-weighted mean — that is what is conserved', () => {
        const E = loadEngine();
        const { oa, ra } = stock(E);
        const fOa = 700, fRa = 1300, tot = fOa + fRa;
        const mix = E.Psychro.mixStreams([
            { state: oa, flow: fOa },
            { state: ra, flow: fRa },
        ], E.P_STD);
        expect(mix.ok).toBe(true);
        expect(mix.h).toBeCloseTo((fOa * oa.h + fRa * ra.h) / tot, 8);
        expect(mix.W).toBeCloseTo((fOa * oa.W + fRa * ra.W) / tot, 10);
    });

    test('the mixed dry-bulb and W move monotonically with the weight', () => {
        const E = loadEngine();
        const { oa, ra } = stock(E);
        const at = (frac) => E.Psychro.mixStreams([
            { state: oa, flow: frac },
            { state: ra, flow: 1 - frac },
        ], E.P_STD);
        let prev = at(0);
        for (let i = 1; i <= 10; i++) {
            const cur = at(i / 10);
            expect(cur.ok, 'frac ' + i / 10).toBe(true);
            // The OA stream is both warmer and wetter, so both track up.
            expect(cur.tdb, 'tdb rises toward the warmer source at ' + i / 10).toBeGreaterThan(prev.tdb);
            expect(cur.W, 'W rises toward the wetter source at ' + i / 10).toBeGreaterThan(prev.W);
            prev = cur;
        }
        expect(prev.tdb).toBeCloseTo(oa.tdb, 8);
    });

    test('mixing is associative — three streams equal a pairwise mix of the same weights', () => {
        const E = loadEngine();
        const { oa, ra } = stock(E);
        const relief = E.Psychro.solveState('rh', 60, 70, E.P_STD);
        const all = E.Psychro.mixStreams([
            { state: oa,     flow: 400 },
            { state: ra,     flow: 1400 },
            { state: relief, flow: 200 },
        ], E.P_STD);
        const pair = E.Psychro.mixStreams([{ state: oa, flow: 400 }, { state: ra, flow: 1400 }], E.P_STD);
        const then = E.Psychro.mixStreams([
            { state: pair,   flow: 1800 },
            { state: relief, flow: 200 },
        ], E.P_STD);
        expect(all.ok && then.ok).toBe(true);
        expect(all.tdb).toBeCloseTo(then.tdb, 8);
        expect(all.W).toBeCloseTo(then.W, 10);
    });

    test('a hand-computed two-stream case round-trips through the helper', () => {
        const E = loadEngine();
        const { oa, ra } = stock(E);
        const fOa = 0.25, fRa = 0.75;
        // The arithmetic the function's own header describes, done by
        // hand out here: weight the conserved quantities, then recover
        // dry-bulb by inverting the enthalpy formula.
        const W = fOa * oa.W + fRa * ra.W;
        const h = fOa * oa.h + fRa * ra.h;
        const tdb = (h - 1061 * W) / (0.240 + 0.444 * W);
        const mix = E.Psychro.mixStreams([
            { state: oa, flow: fOa },
            { state: ra, flow: fRa },
        ], E.P_STD);
        expect(mix.ok).toBe(true);
        expect(mix.tdb).toBeCloseTo(tdb, 10);
        expect(mix.W).toBeCloseTo(W, 12);
        // …and the engine's own enthalpy primitive agrees on the result.
        expect(mix.h).toBeCloseTo(E.enthalpy(tdb, W), 8);
    });

    test('a super-saturated mix is clamped onto the curve, not returned impossible', () => {
        const E = loadEngine();
        // Two near-saturated streams far apart in temperature: the
        // straight line between them cuts above the saturation curve,
        // which is fog. buildState clamps W, so the caller always gets
        // a valid state.
        const warm = E.Psychro.solveState('rh', 95, 98, E.P_STD);
        const cold = E.Psychro.solveState('rh', 35, 98, E.P_STD);
        let sawTheCurve = false;
        for (let i = 1; i <= 9; i++) {
            const mix = E.Psychro.mixStreams([
                { state: warm, flow: i },
                { state: cold, flow: 10 - i },
            ], E.P_STD);
            expect(mix.ok, 'frac ' + i).toBe(true);
            expect(mix.rh, 'RH stays physical at ' + i).toBeLessThanOrEqual(100 + 1e-6);
            if (mix.rh > 99.999) sawTheCurve = true;
        }
        // Anti-vacuity: the sweep must actually reach the clamp, or the
        // row proves nothing about clamping.
        expect(sawTheCurve, 'the sweep reached saturation').toBe(true);
    });

    test('a mass basis and a volumetric basis disagree in the documented direction', () => {
        // The header's load-bearing claim, and its SCOPE. Specific
        // volume rises with humidity ratio as well as with temperature,
        // so "the colder stream is the denser one" holds wherever the
        // temperature spread dominates the moisture spread — which is
        // the whole freeze regime the claim is about, and where every
        // sampled point below sits (all ≥ 15 °F from the return). There
        // the mass basis shifts weight toward the colder stream and the
        // volumetric mix never reads cooler. It is NOT a universal, and
        // the row after this one pins the exception, so a maintainer who
        // widens the sweep reads a documented boundary rather than a bug
        // they are tempted to "fix". Pins directions and orderings,
        // never either number.
        const E = loadEngine();
        const ra = E.Psychro.solveState('rh', 75, 50, E.P_STD);
        const gapAt = (oatF) => {
            const oa = E.Psychro.solveState('rh', oatF, 40, E.P_STD);
            const cfmOa = 400, cfmRa = 1600;
            const vol = E.Psychro.mixStreams([
                { state: oa, flow: cfmOa },
                { state: ra, flow: cfmRa },
            ], E.P_STD);
            const mass = E.Psychro.mixStreams([
                { state: oa, flow: cfmOa * 60 / oa.v },
                { state: ra, flow: cfmRa * 60 / ra.v },
            ], E.P_STD);
            expect(vol.ok && mass.ok).toBe(true);
            return vol.tdb - mass.tdb;
        };
        // Never cooler, on either side of the return temperature.
        [-10, 0, 20, 40, 60, 90, 100, 110].forEach((oat) => {
            expect(gapAt(oat), 'volumetric is not cooler than mass at OAT ' + oat)
                .toBeGreaterThanOrEqual(0);
        });
        // Zero exactly when there is no spread to disagree about.
        expect(gapAt(75), 'no spread, no disagreement').toBeCloseTo(0, 9);
        // …and strictly widening as the streams pull apart.
        const spread = [60, 40, 20, 0, -10].map(gapAt);
        for (let i = 1; i < spread.length; i++) {
            expect(spread[i], 'the gap widens as the streams spread (step ' + i + ')')
                .toBeGreaterThan(spread[i - 1]);
        }

        // The documented EXCEPTION, pinned so the header's scoping is
        // falsifiable rather than decorative: within a degree or so of
        // the return temperature there is no temperature spread left for
        // the density argument to work on, the moisture spread (OA 40 %
        // against RA 50 %) takes over, and the sign flips. Measured at
        // this stock pair the flip lives in a ~1 °F window either side
        // of 75 and is worth about 1.5e-4 °F — real, and nowhere near
        // the ~2 °F the freeze regime is about.
        const nearCross = gapAt(75.75);
        expect(nearCross, 'the sign really does flip with no spread to work on')
            .toBeLessThan(0);
        expect(Math.abs(nearCross), 'but only by a rounding-scale amount')
            .toBeLessThan(1e-3);
    });
});
