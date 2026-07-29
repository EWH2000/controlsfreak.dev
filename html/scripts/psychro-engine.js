// ──────────────────────────────────────────────────────────────────────
// psychro-engine.js — shared moist-air psychrometric math
//
// Loaded as a *classic* script (no type="module") on purpose: each page's
// logic lives in an IIFE-wrapped inline <script>, and an IIFE's bindings
// can't be reached from outside it — so the engine exposes its API as
// plain top-level declarations (script-scoped globals), not as ES-module
// exports. Same convention as /scripts/pid-engine.js. Any page that wants
// psych math just adds
//
//     <script src="/scripts/psychro-engine.js"></script>
//
// before its own inline <script>. The 11ty build templates the HTML chrome
// and copies this file through unchanged; the browser loads it directly,
// nothing transpiles or bundles.
//
// API — two tiers:
//
//   1. ASHRAE primitives (flat top-level — call by bare name)
//        satPress(tF)
//        humRatioFromVapPress(pw, P)        vapPressFromHumRatio(W, P)
//        satHumRatio(tF, P)
//        humRatioFromRH(rhPct, tdb, P)      rhFromHumRatio(W, tdb, P)
//        enthalpy(tdb, W)                   specificVolume(tdb, W, P)
//        pressFromAltitude(zFt)
//        humRatioFromWetBulb(twb, tdb, P)   wetBulbFromHumRatio(W, tdb, P)
//        dewPointFromVapPress(pw)
//      plus the constants P_STD, MW_RATIO, R_DA, GR_PER_LB.
//
//   2. Higher-level solver (namespaced under Psychro)
//        Psychro.solveState(mode, tdb, second, P)
//        Psychro.buildState(tdb, W, P)
//        Psychro.computeProcess(stage, cfm)
//        Psychro.invertProcess(inlet, opts)
//        Psychro.mixStreams(streams, P)
//
// Why two tiers: the primitives are the unopinionated ASHRAE math any
// future psych tool will want directly (a coil-sizing calculator wants
// enthalpy, an economizer-ratio helper wants humRatioFromRH, etc.) —
// keeping them flat means future call sites read identically to today's.
// The solver helpers are opinionated combinators (mode dispatch on
// solveState; standard property bundle from buildState; per-stage delta
// math in computeProcess) — keeping those namespaced gives future tools
// room to grow their own solver methods (Psychro.coilSizing, etc.)
// without bare-name collisions and lets a future Psychro.* namespace
// flip survive contained churn. Candidate second consumers — air-mixing,
// coil-sizing, economizer-ratio — are tracked in site-ideas-and-friction.
//
// What lives here: anything pure. What does NOT live here: anything that
// touches the DOM, window.Units, or any specific page's HTML structure.
// The chart's chain solver (solveChain) stays on the page — it reads
// inputs from DOM, converts via Units, calls the engine, hands results
// back to the page renderers. Per-page chart drawing and chip positioning
// stay on the page that hosts them.
//
// Units throughout: dry-bulb / wet-bulb / dew-point °F · humidity ratio
// lb_water / lb_dry-air · pressure psia · enthalpy Btu / lb dry air ·
// specific volume ft³ / lb dry air. Convert at the display boundary, not
// here. Formulas: ASHRAE 2017 Fundamentals, Chapter 1 (IP equations).
// ──────────────────────────────────────────────────────────────────────

'use strict';

const R_DA       = 0.370486;    // R_dry-air / 144, ft³·psi / (lb·°R)
const MW_RATIO   = 0.621945;    // M_water / M_dry-air
const GR_PER_LB  = 7000;
const P_STD      = 14.696;      // standard sea-level pressure, psia

// Saturation vapor pressure (psia) over water (t ≥ 32 °F) or ice (t < 32 °F). t in °F.
function satPress(tF) {
    const T = tF + 459.67;      // absolute temperature, °R
    let lnP;
    if (tF >= 32) {
        lnP = -1.0440397e4 / T - 1.1294650e1 - 2.7022355e-2 * T
              + 1.2890360e-5 * T * T - 2.4780681e-9 * T * T * T + 6.5459673 * Math.log(T);
    } else {
        lnP = -1.0214165e4 / T - 4.8932428 - 5.3765794e-3 * T + 1.9202377e-7 * T * T
              + 3.5575832e-10 * T * T * T - 9.0344688e-14 * T * T * T * T + 4.1635019 * Math.log(T);
    }
    return Math.exp(lnP);
}

const humRatioFromVapPress = (pw, P) => MW_RATIO * pw / (P - pw);
const vapPressFromHumRatio = (W, P) => P * W / (MW_RATIO + W);
const satHumRatio          = (tF, P) => humRatioFromVapPress(satPress(tF), P);
const humRatioFromRH       = (rhPct, tdb, P) => humRatioFromVapPress(rhPct / 100 * satPress(tdb), P);
const rhFromHumRatio       = (W, tdb, P) => vapPressFromHumRatio(W, P) / satPress(tdb) * 100;
const enthalpy             = (tdb, W) => 0.240 * tdb + W * (1061 + 0.444 * tdb);
const specificVolume       = (tdb, W, P) => R_DA * (tdb + 459.67) * (1 + 1.607858 * W) / P;
const pressFromAltitude    = zFt => P_STD * Math.pow(1 - 6.8754e-6 * zFt, 5.2559);

// Humidity ratio from (thermodynamic) wet-bulb temperature. twb, tdb in °F.
function humRatioFromWetBulb(twb, tdb, P) {
    const Wsw = satHumRatio(twb, P);
    return (twb >= 32)
        ? ((1093 - 0.556 * twb) * Wsw - 0.240 * (tdb - twb)) / (1093 + 0.444 * tdb - twb)
        : ((1220 - 0.04  * twb) * Wsw - 0.240 * (tdb - twb)) / (1220 + 0.444 * tdb - 0.48 * twb);
}

// Dew point: temperature where satPress(tdp) = pw. Bisection.
function dewPointFromVapPress(pw) {
    if (pw <= 0) return -Infinity;
    // Above the bracket's saturation ceiling (pw > satPress(250) ≈ 29.85
    // psia) the bisection can't converge — hi never moves down, the loop
    // pins at ~250, and it would return a plausible-looking but wrong dew
    // point. Signal out-of-range (mirroring the pw<=0 → -Infinity low end)
    // so a caller's isFinite guard catches it. Unreachable at/below sea
    // level (pw can't exceed P_STD = 14.696), but the function is a flat
    // primitive the header advertises for reuse. (codebase-issues #103)
    if (pw > satPress(250)) return Infinity;
    let lo = -148, hi = 250;
    for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (satPress(mid) > pw) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
}

// Wet-bulb from dry-bulb + humidity ratio. Bisection on [dew point, dry-bulb].
function wetBulbFromHumRatio(W, tdb, P) {
    let lo = dewPointFromVapPress(vapPressFromHumRatio(Math.max(W, 0), P));
    let hi = tdb;
    if (!isFinite(lo) || lo > hi) lo = Math.min(-148, hi - 200);
    for (let i = 0; i < 70; i++) {
        const mid = (lo + hi) / 2;
        if (humRatioFromWetBulb(mid, tdb, P) > W) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
}

// ── Higher-level solver — wrapped so the helpers are reachable only via
//    Psychro.*. Pages should call Psychro.solveState / buildState /
//    computeProcess; the bare-name primitives above stay reachable by any
//    page that wants them directly.
const Psychro = (function () {
    'use strict';

    // Build moist-air state from (mode, dry-bulb, the second value, pressure).
    // mode ∈ {rh, wb, dp, w, h}.
    function solveState(mode, tdb, second, P) {
        if (![tdb, second, P].every(isFinite) || P <= 0) return { ok: false, error: 'Enter numeric values.' };
        let W;
        if (mode === 'rh') {
            if (second < 0)   return { ok: false, error: 'Relative humidity can’t be negative.' };
            if (second > 100) return { ok: false, error: 'Relative humidity can’t exceed 100%.' };
            W = humRatioFromRH(second, tdb, P);
        } else if (mode === 'wb') {
            if (second > tdb + 1e-6) return { ok: false, error: 'Wet-bulb can’t exceed dry-bulb.' };
            W = humRatioFromWetBulb(second, tdb, P);
        } else if (mode === 'dp') {
            if (second > tdb + 1e-6) return { ok: false, error: 'Dew point can’t exceed dry-bulb.' };
            W = humRatioFromVapPress(satPress(second), P);
        } else if (mode === 'w') {
            W = second / GR_PER_LB;
            if (W < -1e-9) return { ok: false, error: 'Humidity ratio can’t be negative.' };
        } else if (mode === 'h') {
            W = (second - 0.240 * tdb) / (1061 + 0.444 * tdb);
            if (W < -1e-9) return { ok: false, error: 'Enthalpy is below dry air at this dry-bulb — impossible.' };
        } else {
            return { ok: false, error: 'Pick a property to define the point by.' };
        }
        W = Math.max(0, W);
        const Wsat = satHumRatio(tdb, P);
        // Cause-honest over-saturation message: only the rh mode can
        // truthfully blame RH. In the other modes the entered RH may be
        // a perfectly valid 50% while a low dry-bulb / altitude typo is
        // what pushed W past saturation — blaming RH there asserts
        // something false about the user's entry (audit-2026-06 polish).
        if (W > Wsat + 1e-6) {
            const prop = { wb: 'wet-bulb', dp: 'dew point', w: 'humidity ratio', h: 'enthalpy' }[mode];
            return {
                ok: false,
                error: mode === 'rh'
                    ? 'That point is past saturation (RH over 100%) — impossible.'
                    : 'That ' + prop + ' is past saturation — more moisture than air can hold at this dry-bulb and pressure.',
            };
        }
        W = Math.min(W, Wsat);
        return buildState(tdb, W, P);
    }

    // Build a state directly from (dry-bulb, humidity ratio).
    function buildState(tdb, W, P) {
        W = Math.max(0, Math.min(W, satHumRatio(tdb, P)));
        const pw = vapPressFromHumRatio(W, P);
        return {
            ok: true, tdb, W, P, pw,
            rh:  W <= 0 ? 0 : rhFromHumRatio(W, tdb, P),
            twb: wetBulbFromHumRatio(W, tdb, P),
            tdp: W <= 0 ? -Infinity : dewPointFromVapPress(pw),
            h:   enthalpy(tdb, W),
            v:   specificVolume(tdb, W, P),
        };
    }

    // Process-delta math for a single coil / humidifier segment. Pure —
    // takes a stage object { inlet, outlet, type } and optional CFM, returns
    // the deltas plus heat-flow rates (when CFM is supplied) and the
    // sensible-heat ratio (cooling stages only; CFM-independent).
    function computeProcess(stage, cfm) {
        const { inlet, outlet, type } = stage;
        const dDb = outlet.tdb - inlet.tdb;
        const dW  = outlet.W - inlet.W;
        const dH  = outlet.h - inlet.h;
        let qTotal = null, qSens = null, qLat = null;
        if (cfm && inlet.v > 0) {
            const mDot = cfm * 60 / inlet.v;            // lb_da / h
            qTotal = mDot * dH;                         // Btu/h
            const cpIn = 0.240 + 0.444 * inlet.W;       // Btu/(lb_da·°F)
            qSens = mDot * cpIn * dDb;
            qLat  = qTotal - qSens;
        }
        let shr = null;
        if (type === 'cool') {
            // SHR by enthalpy ratios (CFM-independent — works even without flow).
            const cpIn = 0.240 + 0.444 * inlet.W;
            const dhSens = cpIn * dDb;
            if (Math.abs(dH) > 1e-9) shr = dhSens / dH;
        }
        return { dDb, dW, dH, qTotal, qSens, qLat, shr };
    }

    // Inverse of computeProcess for a single coil: given the entering-air
    // state, the coil type, the airflow, and the load the coil must carry,
    // solve the leaving-air state. The arithmetic is the exact inverse of
    // computeProcess's q-formulas — feed a result of one into the other and
    // it round-trips. Loads are positive magnitudes; `type` decides whether
    // the coil warms or cools the air. opts = { type, cfm, qSens, qLat }:
    // qSens is the sensible load (Btu/h), qLat the latent load (Btu/h,
    // cooling only — a heating coil rides humidity ratio through unchanged,
    // so qLat is ignored when type !== 'cool'). The returned state carries
    // an extra `saturated` flag — true when the requested latent load drives
    // the leaving point onto the saturation curve (its apparatus dew point),
    // where buildState clamps it.
    function invertProcess(inlet, opts) {
        if (!inlet || !inlet.ok) return { ok: false, error: 'Entering-air state is invalid.' };
        const type = opts.type;
        const cfm  = opts.cfm;
        if (!isFinite(cfm) || cfm <= 0) return { ok: false, error: 'Enter a positive airflow.' };
        if (inlet.v <= 0) return { ok: false, error: 'Entering-air state is invalid.' };
        const qSens = opts.qSens;
        const qLat  = type === 'cool' ? (opts.qLat || 0) : 0;
        if (!isFinite(qSens) || qSens < 0) return { ok: false, error: 'Sensible load can’t be negative.' };
        if (type === 'cool' && (!isFinite(qLat) || qLat < 0)) return { ok: false, error: 'Latent load can’t be negative.' };
        const mDot = cfm * 60 / inlet.v;                 // lb dry air / h
        const cpIn = 0.240 + 0.444 * inlet.W;            // Btu / (lb_da·°F)
        const sign = type === 'cool' ? -1 : 1;           // cooling lowers dry-bulb and enthalpy
        const tdbOut = inlet.tdb + sign * qSens / (mDot * cpIn);
        const hOut   = inlet.h   + sign * (qSens + qLat) / mDot;
        const Wout   = (hOut - 0.240 * tdbOut) / (1061 + 0.444 * tdbOut);
        if (Wout < -1e-9) return { ok: false, error: 'That load drives the air past bone-dry — check the inputs.' };
        const Wsat = satHumRatio(tdbOut, inlet.P);
        const out  = buildState(tdbOut, Math.max(0, Wout), inlet.P);
        out.saturated = Wout > Wsat + 1e-6;
        return out;
    }

    // Enthalpy of the SUSPENDED CONDENSATE in a fogging mixture — Btu per
    // lb of WATER (not per lb of dry air), on the same datum as the
    // 1061 / 0.444 water-vapour formulation above. Above the ice point the
    // condensate is liquid; below it, it is ICE, and the enthalpy drops by
    // the latent heat of fusion, which is why one form cannot cover both.
    //
    // Both forms are the ones ASHRAE's own IP wet-bulb relations imply,
    // and those relations are ALREADY in this file — humRatioFromWetBulb
    // solves the same adiabatic-saturation balance, once per side of 32 °F:
    //   • the ≥32 branch's (1093 − 0.556·t*) / (1093 + 0.444·t − t*)
    //     coefficients fall out of h_w = t − 32 — a 1.0 Btu/(lb·°F)
    //     liquid specific heat on a 32 °F liquid-water datum;
    //   • the <32 branch's (1220 − 0.04·t*) / (1220 + 0.444·t − 0.48·t*)
    //     coefficients give h_w = 0.48·t − 159 — i.e. −143.64 Btu/lb at
    //     32 °F (the latent heat of fusion) and a 0.48 Btu/(lb·°F) ice
    //     specific heat.
    // Deriving the constants from those branches rather than quoting a
    // table is deliberate: it makes a fog solve and a below-freezing
    // wet-bulb agree BY CONSTRUCTION rather than to three digits.
    //
    // ONE CAVEAT if you re-derive it, because it does not close exactly:
    // the ice branch's DENOMINATOR gives 0.48·t − 159 as above, but its
    // printed NUMERATOR coefficient of 0.04 gives 0.484·t − 159 — the
    // exactly-consistent numerator would read 1220 − 0.036·t*. That 0.8 %
    // split in the ice specific heat is in the published correlation, not
    // in this file, and the two forms are worth 3e-4 °F on the solve
    // (17.6676 °F against 17.6673 at the AHU's reachable corner), so the
    // denominator's 0.48 is taken as the pair. (ASHRAE Fundamentals Ch. 1,
    // IP thermodynamic wet-bulb relations — the same source as the rest of
    // this file. The measured fusion enthalpy, 143.34 Btu/lb with a 0.487
    // ice specific heat, is NOT what 143.64 rounds from — 143.64 is the
    // artifact of the correlation's own coefficients — and swapping the
    // measured pair in moves the solved corner by 8e-4 °F. Datum check:
    // these give h_g(32) = 1075.21 and h_ig(32) = 1218.85 against
    // ASHRAE's ~1075.1 and ~1218.7.)
    const condensateEnthalpy = tF => (tF >= 32 ? tF - 32 : 0.48 * tF - 159);

    // Re-solve the dry-bulb of a FOGGING mixture. `hMix` and `W` are the
    // flow-weighted mixture enthalpy and humidity ratio; `tdbLow` is the
    // pre-clamp enthalpy recovery, which is the solve's own lower bound.
    // Finds the temperature T at which saturated air PLUS the suspended
    // condensate carries the whole mixture enthalpy:
    //
    //     h_mix = h_sat(T) + (W_mix − W_sat(T)) · h_condensate(T)
    //
    // Bisection on [tdbLow, the mixture's dew point]. At the lower bound
    // every bit of the excess moisture is still being counted as vapour,
    // which overstates the enthalpy the air can hold, so the residual is
    // negative; at the dew point there is no condensate left at all and it
    // is positive; and it rises monotonically on each side of 32 °F.
    // Returns NaN if the bracket does not resolve, so the caller falls back
    // rather than publishing a number from a broken solve.
    //
    // THE RESIDUAL JUMPS AT 32 °F, AND `hi` IS WHAT MAKES THAT SAFE — this
    // is the one line in here a "robustness" edit could break. Crossing
    // upward, the condensate stops being ice and gains the heat of fusion,
    // so the step is
    //     r(32⁺) − r(32⁻) = (W_mix − W_sat(32)) · 143.64
    // whose SIGN is not fixed: upward when the mixture holds more water
    // than saturated air at the ice point, DOWNWARD when it holds less.
    // Downward matters, because a downward step can in principle straddle
    // zero and hand bisection a second root. What rules that out is the
    // BRACKET, not monotonicity: the step flips down exactly when
    // W_mix < W_sat(32), and satHumRatio is monotone, so that same
    // inequality puts the mixture's dew point BELOW 32 °F — i.e. the
    // sign-flipping discontinuity sits strictly above `hi` whenever it
    // flips. So `hi` must stay AT the dew point; widening it past that is
    // what would let a second root inside the interval.
    // Where the step is upward it can bracket the root, and bisection then
    // converges on 32 °F exactly — the physically right answer: the
    // mixture sits at the ice point with part of its condensate frozen and
    // part still liquid. (Measured: at the AHU's own reachable corner —
    // zone 80 °F / 50 % RH against −20 °F / 40 % RH at 70 % outdoor air —
    // W_mix is 23.45 gr/lb against W_sat(32)'s 26.42, so the residual DROPS
    // 0.060 Btu/lb_da crossing 32 upward, and the dew point is 29.4 °F.
    // The sweep in tests/psychro-mixstreams.spec.js finds no disagreement
    // with an independent bisection over a much wider bracket.)
    function fogTemp(hMix, W, tdbLow, P) {
        let lo = tdbLow;
        let hi = dewPointFromVapPress(vapPressFromHumRatio(W, P));
        if (!isFinite(lo) || !isFinite(hi) || hi <= lo) return NaN;
        const residual = T => enthalpy(T, satHumRatio(T, P))
            + (W - satHumRatio(T, P)) * condensateEnthalpy(T) - hMix;
        if (!(residual(lo) < 0) || !(residual(hi) > 0)) return NaN;
        for (let i = 0; i < 80; i++) {
            const mid = (lo + hi) / 2;
            if (residual(mid) > 0) hi = mid; else lo = mid;
        }
        return (lo + hi) / 2;
    }

    // Mix N air streams into one state. `streams` is [{ state, flow }, …]
    // — `state` is a solveState / buildState result, `flow` is that
    // stream's weight. Humidity ratio and enthalpy are the conserved
    // quantities, so BOTH are weighted by `flow`; the mixed dry-bulb is
    // then RECOVERED by inverting h = (0.240 + 0.444·W)·T + 1061·W,
    // never averaged directly.
    //
    // Mixing warm humid air into cold air can land the straight line
    // between the two streams ABOVE the saturation curve, which is fog.
    // Every result carries the outcome explicitly, in the shape
    // invertProcess uses for its own `saturated` flag:
    //
    //   • `fogging`    — true when the mixture holds more water than
    //                    saturated air at the mixed temperature can.
    //   • `condensate` — lb_water / lb_dry-air held in SUSPENSION, i.e.
    //                    the flow-weighted W minus the W of the returned
    //                    state. Zero on every clear-of-the-curve result.
    //
    // Clear of the curve the function is exact: the enthalpy inversion
    // round-trips to ~3e-14 °F and `h` / `W` come back flow-weighted.
    //
    // IN THE FOGGING BRANCH, `h` IS THE AIR'S ALONE — BY DESIGN, AND IT IS
    // NOT THE MIXTURE'S. A buildState result structurally cannot represent
    // suspended water: `h` is the saturated-air enthalpy at the returned
    // dry-bulb, and the mixture's total enthalpy is
    //     h + condensate · <the condensate enthalpy at that dry-bulb>
    // which below freezing is LOWER than `h` (ice carries a negative
    // enthalpy on this datum). That is why `condensate` is returned rather
    // than dropped: a caller summing enthalpy across a mixing box can
    // close its own balance, and one that ignores it loses the water
    // loudly rather than silently. `tdb` and `W` ARE the mixture's.
    //
    // ONE EXCEPTION to that balance, and it is detectable: a fogging
    // result whose `tdb` is EXACTLY 32 °F sits on the ice-point plateau,
    // where the condensate is part ice and part liquid and the two fields
    // cannot say which. Reconstructing the mixture enthalpy there is off
    // by the frozen fraction, bounded by `condensate` × 143.64 Btu/lb.
    // THE BOUND, NOT A MEASURED WORST, IS THE THING TO READ: the plateau's
    // condensate depends on how far past the curve the caller's streams
    // sit, so any single measured figure is a figure for one pair of
    // streams. Measured, with the scope named — 0.29 Btu/lb_da over the
    // AHU's own band (a 50 %-RH return anywhere in 60…90 °F against a
    // 40 %-RH outdoor stream at −30 °F and up, any damper; worst at zone
    // 88.5 °F / −24 °F / 60 %, where the bound itself is 0.33), rising to
    // 0.67 once return and outdoor RH are free as well (zone 90 °F / 90 %
    // against −28 °F / 90 % at 70 %). An earlier draft of this comment
    // published 0.172 as a sweep worst; that is the figure for exactly one
    // configuration, the 80 °F / 55 % pair the span below describes.
    // Off the plateau the reconstruction closes to ~6e-13 everywhere.
    // The plateau is narrow but real: at the AHU's own RH assumptions and a
    // 55 % damper it spans about 1.3 °F of outdoor air (−19.16 to
    // −17.88 °F against an 80 °F zone).
    // `tdb === 32 && condensate > 0` is the signature; a caller that needs
    // the split has to model the freezing itself.
    //
    // The fog branch RE-SOLVES the dry-bulb (see fogTemp) — owner ruling
    // 2026-07-29, closing codebase-issues #236. It previously recovered
    // the dry-bulb from the PRE-clamp W and let buildState drop W onto
    // the curve without re-solving; since ∂t/∂W < 0 in that recovery the
    // returned dry-bulb ran COLD. MEASURED corrections: 7.25 °F at the
    // corner an AHU mixing box can reach (zone 80 °F, 70 % outdoor air,
    // −20 °F outdoor: 10.42 °F then against 17.67 °F now), and 12.80 °F at
    // the worst pair inside the AHU's own band (zone 90 °F, 65 % outdoor
    // air, −30 °F outdoor: 12.75 °F then against 25.56 °F now). Away from
    // room air and weather it grows without any interesting bound — a
    // coarse sweep of near-saturated pairs from −40 to 120 °F reaches
    // 50.1 °F (−40 °F / 99 % at 70 % into 120 °F / 99 %: 12.77 °F then
    // against 62.85 °F now) — so a caller mixing something else should
    // read the MECHANISM, not a magnitude: the correction is as large as
    // the latent heat the condensing water releases, and nothing caps that
    // but the moisture the streams brought.
    // Every AHU-reachable fog case lands BELOW freezing, which is exactly
    // why the ice convention above is not optional: at that first corner
    // the liquid-only form solves to 17.10 °F against the ice form's
    // 17.67 °F. The 0.57 °F gap is small only because the condensate is
    // ~10 grains — the per-pound enthalpy gap is 136 Btu/lb_water.
    //
    // WEIGHT BASIS — this function does not care which basis it is
    // handed. It weights by `flow` and says nothing about units, so
    // THE CALLER OWNS THE CHOICE and owes its reader a statement of
    // which one it made:
    //   • True dry-air MASS flow (lb_da/h, i.e. CFM·60/v) is the EXACT
    //     basis — mass is what conserves across a mixing box.
    //   • VOLUMETRIC flow (CFM) is the common field approximation, and
    //     it is the arithmetic the site's own lessons teach
    //     (%OA·OAT + %RA·RAT).
    //   • The two diverge as the streams' specific volumes diverge —
    //     that is, as their temperatures spread. Measured against this
    //     engine: 0 °F outdoor air against 75 °F / 50 % RH return air
    //     at a 20 % VOLUMETRIC outdoor fraction is a 22.8 % MASS
    //     fraction, so the mass-weighted mix lands at 58.1 °F where the
    //     volumetric one lands at 60.2 °F — about 2 °F, inside the
    //     freeze-protection band that decides whether a coil is at
    //     risk. On a 95 °F cooling day the same 20 % split is a 19.3 %
    //     mass fraction and the two answers sit 0.14 °F apart. The gap
    //     tracks the SPREAD — nil when the streams match, and largest
    //     in winter, which is where the freeze question lives.
    //   • DIRECTION, scoped: specific volume rises with humidity ratio
    //     as well as with temperature, so "the colder stream is the
    //     denser one" holds only where the TEMPERATURE spread dominates
    //     the MOISTURE spread. Throughout that regime — which is the
    //     whole freeze regime this paragraph is about — the mass basis
    //     shifts weight toward the colder stream and the volumetric
    //     answer reads the warmer of the two. It is not a universal: a
    //     warm DRY stream against a cool HUMID one inverts it (90 °F /
    //     100 % RH has v = 15.39 against 110 °F / 0 % RH at v = 14.36),
    //     and so does a pair within a couple of degrees of each other,
    //     where the moisture spread is all there is. Measured worst
    //     inversion over a 162-state grid: 0.06 °F. tests/
    //     psychro-mixstreams.spec.js pins both the dominant direction
    //     and the near-crossover exception, so this scoping is
    //     falsifiable rather than decorative.
    //
    // One more property of the recovery, worth knowing before anyone
    // calls it a rounding bug: because cp = 0.240 + 0.444·W, the
    // recovered dry-bulb is cp-weighted, so it sits a shade off the
    // plain weighted average of the source dry-bulbs whenever the
    // streams' moisture differs — 60.2 °F against the plain blend's
    // 60.0 °F in the case above. That gap is psychrometrically honest,
    // not an artifact.
    function mixStreams(streams, P) {
        if (!Array.isArray(streams) || streams.length < 1) {
            return { ok: false, error: 'Mix at least one air stream.' };
        }
        let total = 0;
        for (let i = 0; i < streams.length; i++) {
            const s = streams[i];
            if (!s || !s.state || !s.state.ok) {
                return { ok: false, error: 'One of the mixed streams has an invalid air state.' };
            }
            // Coerce ONCE and use the coerced value for both the guard
            // and the weight — solveState tolerates coercible input the
            // same way. This is the engine's first `+=` accumulator over
            // caller-supplied values, and that makes the tolerance
            // dangerous rather than harmless: `isFinite('200')` is true,
            // but `0 + '200'` is the STRING '0200', so an un-coerced
            // accumulator turned two DOM-read flows into a total of
            // 200800, weights summing to ~0.005, and a silently wrong
            // dry-bulb returned with ok:true. The four inline air-mixing
            // call sites this helper is meant to absorb (codebase-issues
            // #228) all read `.value` off an input.
            const f = Number(s.flow);
            if (!isFinite(f)) return { ok: false, error: 'Enter a numeric flow for every stream.' };
            if (f < 0)        return { ok: false, error: 'Stream flow can’t be negative.' };
            total += f;
        }
        if (total <= 0) return { ok: false, error: 'Enter a positive total flow.' };
        let W = 0, h = 0;
        for (let i = 0; i < streams.length; i++) {
            const f = Number(streams[i].flow) / total;
            W += f * streams[i].state.W;
            h += f * streams[i].state.h;
        }
        const tdb = (h - 1061 * W) / (0.240 + 0.444 * W);
        const Wsat = satHumRatio(tdb, P);
        // `Wsat > 0` is not paranoia: above the boiling point for the
        // pressure the saturation formula degenerates NEGATIVE
        // (codebase-issues #238), which would read as fog on bone-dry air.
        // Route that to the clear-of-the-curve arm, where buildState's own
        // clamp handles it exactly as it did before this branch existed.
        if (!(Wsat > 0) || !(W > Wsat)) {
            const clear = buildState(tdb, W, P);
            clear.fogging = false;
            clear.condensate = 0;
            return clear;
        }
        const tFog = fogTemp(h, W, tdb, P);
        // Defensive: the bracket is guaranteed by the residual's own signs
        // whenever Wsat > 0 and W > Wsat, so this arm should be
        // unreachable. If a future edit breaks that, fall back to the
        // pre-#236 behaviour — a state ON the curve at the uncorrected
        // (cold) dry-bulb — rather than publish a broken solve. `fogging`
        // is still true, because it is.
        const out = buildState(isFinite(tFog) ? tFog : tdb, W, P);
        out.fogging = true;
        out.condensate = W - out.W;
        return out;
    }

    return { solveState, buildState, computeProcess, invertProcess, mixStreams };
})();
