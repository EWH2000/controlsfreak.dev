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
//
// THE FOG ROWS ARE THE EXCEPTION TO "NO CONSTANTS", and only just. The
// fogging branch re-solves the mixed dry-bulb on the saturation curve
// (owner ruling 2026-07-29, codebase-issues #236), and the thing being
// asserted is CONSERVATION — so those rows carry their own reference
// implementation of the energy balance
//
//     h_mix = h_sat(T) + (W_mix − W_sat(T)) · h_condensate(T)
//
// built from the engine's flat ASHRAE primitives plus a condensate
// enthalpy written out HERE from the same source, not imported from the
// engine (`condensateEnthalpy` is private to the Psychro IIFE and would
// make the check circular anyway). The two constants in it —
// h_w = t − 32 for liquid and h_w = 0.48·t − 159 for ice — are the ones
// ASHRAE's IP wet-bulb relations imply, which is exactly why the engine
// uses them: `humRatioFromWetBulb`'s two branches solve this same
// adiabatic-saturation balance, and its (1093 − 0.556·t*) / (1220 −
// 0.04·t*) coefficients are these enthalpies rearranged. So a maintainer
// who retunes the engine's condensate convention must ALSO argue with
// the wet-bulb primitive, and this file goes red if they only do one.

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
    return vm.runInContext(
        '({ Psychro, P_STD, enthalpy, specificVolume, satHumRatio });', ctx);
}

// ── the fog rows' independent reference (see the header) ──────────────
// Enthalpy of the suspended condensate, Btu per lb of WATER, on the same
// datum as the engine's 1061 / 0.444 vapour formulation. Liquid above the
// ice point, ICE below it — a jump of the latent heat of fusion at 32 °F,
// which is the convention switch these rows exist to police.
const LATENT_FUSION = 143.64;                          // Btu/lb at 32 °F
const condensateH = tF => (tF >= 32 ? tF - 32 : 0.48 * tF - 159);

// The mixture enthalpy a fogging result implies: saturated air at the
// returned dry-bulb, plus the water it is holding in suspension. A
// correct solve puts this back on the flow-weighted mixture enthalpy.
function mixtureEnthalpy(mix) {
    return mix.h + mix.condensate * condensateH(mix.tdb);
}

// Flow-weighted references, computed out here from the stream list so no
// row checks the implementation against itself.
function weighted(streams, key) {
    const total = streams.reduce((s, x) => s + x.flow, 0);
    return streams.reduce((s, x) => s + x.flow / total * x.state[key], 0);
}

// Two streams that fog when mixed: 50 %-RH room air into cold, dry
// outdoor air — the AHU mixing box's own case, and the one #236 measured.
function fogPair(E, zoneF, oatF) {
    return {
        ra: E.Psychro.solveState('rh', zoneF, 50, E.P_STD),
        oa: E.Psychro.solveState('rh', oatF, 40, E.P_STD),
    };
}
function fogMix(E, zoneF, oatF, oaFrac) {
    const { ra, oa } = fogPair(E, zoneF, oatF);
    const streams = [{ state: oa, flow: oaFrac }, { state: ra, flow: 1 - oaFrac }];
    return { streams, mix: E.Psychro.mixStreams(streams, E.P_STD) };
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

    test('every result declares fogging and condensate, and a clear mix declares none', () => {
        // The contract shape, in the same idiom invertProcess uses for
        // `saturated`: the fields are on EVERY result, not only the
        // interesting one, so a caller can read them unconditionally
        // instead of learning the branch.
        const E = loadEngine();
        const { oa, ra } = stock(E);
        const clear = E.Psychro.mixStreams([
            { state: oa, flow: 400 },
            { state: ra, flow: 1600 },
        ], E.P_STD);
        expect(clear.ok).toBe(true);
        expect(typeof clear.fogging, 'fogging is a boolean').toBe('boolean');
        expect(typeof clear.condensate, 'condensate is a number').toBe('number');
        expect(clear.fogging, 'a clear mix is not fogging').toBe(false);
        expect(clear.condensate, 'and holds no water in suspension').toBe(0);
        // A lone stream, and a zero-weighted one, are clear too.
        [[{ state: oa, flow: 3500 }],
         [{ state: oa, flow: 0 }, { state: ra, flow: 1200 }]].forEach((streams, i) => {
            const out = E.Psychro.mixStreams(streams, E.P_STD);
            expect(out.fogging, 'case ' + i).toBe(false);
            expect(out.condensate, 'case ' + i).toBe(0);
        });

        const { mix } = fogMix(E, 80, -20, 0.70);
        expect(mix.ok).toBe(true);
        expect(mix.fogging, 'the #236 corner really does fog').toBe(true);
        expect(mix.condensate, 'and reports the water it set aside').toBeGreaterThan(0);
    });

    test('the fog branch conserves the mixture enthalpy and humidity ratio', () => {
        // The row #236 existed for. The pre-fix implementation recovered
        // the dry-bulb from the PRE-clamp humidity ratio and let
        // buildState drop W onto the curve without re-solving, so neither
        // conserved quantity came back flow-weighted and the returned
        // dry-bulb ran cold — 6.68 °F at the corner an AHU mixing box can
        // reach. Checked against the reference balance at the top of this
        // file, never against the implementation.
        const E = loadEngine();
        let fogCases = 0;
        [[80, -20, 0.70], [80, -10, 0.60], [72, -5, 0.70], [90, -20, 0.70],
         [75, 0, 0.80], [80, 10, 0.90], [95, 20, 0.95]].forEach(([zone, oat, frac]) => {
            const { streams, mix } = fogMix(E, zone, oat, frac);
            const label = 'zone ' + zone + ' / OAT ' + oat + ' / ' + (frac * 100) + '% OA';
            expect(mix.ok, label).toBe(true);
            if (!mix.fogging) return;
            // The ice-point plateau is the one case the two returned
            // fields cannot close (the condensate is part ice, part
            // liquid and they do not say which) — it has its own row.
            if (Math.abs(mix.tdb - 32) < 1e-9) return;
            fogCases++;
            expect(mixtureEnthalpy(mix), label + ': mixture enthalpy is conserved')
                .toBeCloseTo(weighted(streams, 'h'), 9);
            expect(mix.W + mix.condensate, label + ': and so is the water')
                .toBeCloseTo(weighted(streams, 'W'), 12);
        });
        // Anti-vacuity: a sweep that never fogged would pass this row
        // while proving nothing about the branch it is named after.
        expect(fogCases, 'the sweep reached the fog branch').toBeGreaterThan(3);
    });

    test('a fogging result lands exactly on the saturation curve', () => {
        // "Valid" used to mean only this much (the clamp put W on the
        // curve at a dry-bulb solved for a different W). It still has to
        // hold after the re-solve — the returned pair is a real saturated
        // state, and the suspended water is reported beside it rather
        // than folded into W.
        const E = loadEngine();
        let seen = 0;
        [[80, -20, 0.70], [80, -10, 0.50], [72, -5, 0.70], [85, 5, 0.85]].forEach(([z, o, f]) => {
            const { mix } = fogMix(E, z, o, f);
            if (!mix.fogging) return;
            seen++;
            const label = 'zone ' + z + ' / OAT ' + o;
            expect(mix.W, label + ': W is the saturation value at the returned dry-bulb')
                .toBeCloseTo(E.satHumRatio(mix.tdb, E.P_STD), 14);
            expect(mix.rh, label + ': so it reads saturated').toBeGreaterThan(99.999);
            expect(mix.rh, label + ': and not past it').toBeLessThanOrEqual(100 + 1e-6);
        });
        expect(seen, 'the sweep reached the fog branch').toBeGreaterThan(2);
    });

    test('the re-solve runs WARMER than the pre-clamp recovery, and stays between the sources', () => {
        // The DIRECTION of the defect, pinned so it cannot come back: the
        // pre-clamp enthalpy recovery IS what the function used to return,
        // and ∂t/∂W < 0 in it, so the uncorrected answer is always the
        // colder one. A regression to the old code makes this difference
        // exactly zero.
        const E = loadEngine();
        let seen = 0;
        [[80, -20, 0.70], [80, -10, 0.60], [90, -20, 0.70], [72, -2, 0.60]].forEach(([z, o, f]) => {
            const { streams, mix } = fogMix(E, z, o, f);
            if (!mix.fogging) return;
            seen++;
            const W = weighted(streams, 'W');
            const h = weighted(streams, 'h');
            const preClamp = (h - 1061 * W) / (0.240 + 0.444 * W);
            const label = 'zone ' + z + ' / OAT ' + o;
            expect(mix.tdb, label + ': warmer than the uncorrected recovery')
                .toBeGreaterThan(preClamp);
            // …and still a mixture: bounded by the two source dry-bulbs.
            const lo = Math.min(streams[0].state.tdb, streams[1].state.tdb);
            const hi = Math.max(streams[0].state.tdb, streams[1].state.tdb);
            expect(mix.tdb, label + ': above the colder source').toBeGreaterThan(lo);
            expect(mix.tdb, label + ': below the warmer source').toBeLessThan(hi);
        });
        expect(seen, 'the sweep reached the fog branch').toBeGreaterThan(2);
    });

    test('the solve is continuous across the 32 °F ice / liquid switch', () => {
        // The condensate convention JUMPS at the ice point — liquid above,
        // ice below, a whole latent heat of fusion apart — so the energy
        // balance the solve inverts is monotone on each side of 32 °F but
        // steps across it, by (W_mix − W_sat(32)) × 143.64. That step's
        // SIGN follows the mixture's own moisture, and it points downward
        // over part of this very trace; what keeps bisection single-rooted
        // is the bracket's upper bound sitting at the dew point, which the
        // fogTemp header derives.
        // The SOLVED TEMPERATURE still has to walk smoothly as the streams
        // are dialled through the crossing, or a slider drag would paint a
        // step change in mixed-air temperature out of nowhere.
        const E = loadEngine();
        const step = 0.25;
        let prev = null, sawAbove = false, sawBelow = false, worstJump = 0;
        for (let oat = 10; oat >= -22; oat -= step) {
            const { mix } = fogMix(E, 80, oat, 0.55);
            expect(mix.ok, 'OAT ' + oat).toBe(true);
            if (mix.fogging) {
                if (mix.tdb > 32) sawAbove = true;
                if (mix.tdb < 32) sawBelow = true;
            }
            if (prev !== null) {
                // Non-increasing, not strictly decreasing: the trace has a
                // genuine FLAT stretch where it sits pinned at the ice
                // point (the row below owns that case), and the epsilon is
                // for the bisection's last bits inside it.
                expect(mix.tdb, 'colder outdoor air never warms the mix (OAT ' + oat + ')')
                    .toBeLessThanOrEqual(prev + 1e-9);
                worstJump = Math.max(worstJump, prev - mix.tdb);
            }
            prev = mix.tdb;
        }
        // Anti-vacuity in BOTH directions: the trace has to actually
        // straddle the convention switch, or it is a row about nothing.
        expect(sawAbove, 'the trace fogged above the ice point').toBe(true);
        expect(sawBelow, 'and crossed below it').toBe(true);
        // No step change: every 0.25 °F of outdoor air moves the mixed
        // dry-bulb by well under a degree. The clear-air stretch at the
        // top of the trace is the steepest part (~0.14 °F per step here),
        // so a bound of 1 °F is loose on purpose — it fails a JUMP, which
        // is what the row is about, not a slope.
        expect(worstJump, 'the trace has no discontinuity at the switch').toBeLessThan(1);
    });

    test('the ice-point plateau is bounded, and it announces itself', () => {
        // The one documented hole in the conservation contract. When the
        // energy balance's root falls inside the 32 °F jump, the mixture
        // sits at the ice point with part of its condensate frozen — which
        // is physically right, and which the two returned fields cannot
        // fully describe, because they do not carry the frozen fraction.
        // The reconstruction error there is bounded by the latent heat of
        // fusion on the condensate, and `tdb === 32 && condensate > 0` is
        // the signature a caller can test for.
        const E = loadEngine();
        let plateaus = 0, worst = 0;
        for (let oat = -17; oat >= -21; oat -= 0.02) {
            const { streams, mix } = fogMix(E, 80, oat, 0.55);
            if (!mix.fogging || Math.abs(mix.tdb - 32) > 1e-9) continue;
            plateaus++;
            expect(mix.condensate, 'the plateau carries condensate').toBeGreaterThan(0);
            const err = Math.abs(mixtureEnthalpy(mix) - weighted(streams, 'h'));
            expect(err, 'bounded by the fusion enthalpy on that condensate')
                .toBeLessThanOrEqual(mix.condensate * LATENT_FUSION + 1e-9);
            worst = Math.max(worst, err);
        }
        // Anti-vacuity: the sweep has to REACH the plateau. It is narrow —
        // about 1.3 °F of outdoor air at this pair — so a row that missed
        // it would silently stop guarding the exception.
        expect(plateaus, 'the sweep reached the ice-point plateau').toBeGreaterThan(10);
        // And the hole is small in absolute terms — well under a Btu per
        // lb of dry air — which is why it is documented rather than
        // modelled away.
        expect(worst, 'and it is a small hole').toBeLessThan(1);
    });

    test('the clear-of-the-curve path is exact, and stays exact', () => {
        // The fog branch is a NEW branch; this row is the one that says
        // the old path did not move. MEASURED over a 131,881-point sweep
        // of stream pairs (−20…110 °F × 10…90 % RH × nine weightings):
        // the recovered dry-bulb matches a hand computation EXACTLY (both
        // evaluate the same expression), the flow-weighted enthalpy to
        // 1.4e-14 Btu/lb and the humidity ratio exactly. The bounds below
        // are a couple of orders looser than that, so ordinary
        // floating-point reordering passes and a re-routed clear mix does
        // not.
        const E = loadEngine();
        const pairs = [[95, 60, 75, 40, 0.35], [0, 40, 75, 50, 0.20],
                       [110, 20, -10, 80, 0.50], [68, 30, 68, 90, 0.75]];
        pairs.forEach(([t1, rh1, t2, rh2, f]) => {
            const a = E.Psychro.solveState('rh', t1, rh1, E.P_STD);
            const b = E.Psychro.solveState('rh', t2, rh2, E.P_STD);
            const streams = [{ state: a, flow: f }, { state: b, flow: 1 - f }];
            const mix = E.Psychro.mixStreams(streams, E.P_STD);
            const label = t1 + '/' + rh1 + ' + ' + t2 + '/' + rh2;
            expect(mix.ok, label).toBe(true);
            expect(mix.fogging, label + ' is clear of the curve').toBe(false);
            const W = weighted(streams, 'W');
            const h = weighted(streams, 'h');
            expect(Math.abs(mix.tdb - (h - 1061 * W) / (0.240 + 0.444 * W)),
                label + ': the enthalpy inversion is exact').toBeLessThan(1e-12);
            expect(Math.abs(mix.h - h), label + ': h is the flow-weighted mean')
                .toBeLessThan(1e-12);
            expect(Math.abs(mix.W - W), label + ': and so is W').toBeLessThan(1e-16);
        });
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
