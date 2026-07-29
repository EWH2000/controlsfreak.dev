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

    // Mix N air streams into one state. `streams` is [{ state, flow }, …]
    // — `state` is a solveState / buildState result, `flow` is that
    // stream's weight. Humidity ratio and enthalpy are the conserved
    // quantities, so BOTH are weighted by `flow`; the mixed dry-bulb is
    // then RECOVERED by inverting h = (0.240 + 0.444·W)·T + 1061·W,
    // never averaged directly. (buildState clamps a super-saturated
    // result onto the curve, so mixing warm humid air into cold air
    // returns a valid fogging state rather than an impossible one.)
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
    //     mass fraction and the two answers sit 0.14 °F apart. Specific
    //     volume rises with temperature, so the mass basis always
    //     shifts weight toward the COLDER stream: the volumetric answer
    //     is never the cooler of the two, whichever stream is the warm
    //     one, and the gap tracks the SPREAD — nil when the streams
    //     match, and largest in winter, which is where the freeze
    //     question lives.
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
            if (!isFinite(s.flow)) return { ok: false, error: 'Enter a numeric flow for every stream.' };
            if (s.flow < 0)        return { ok: false, error: 'Stream flow can’t be negative.' };
            total += s.flow;
        }
        if (total <= 0) return { ok: false, error: 'Enter a positive total flow.' };
        let W = 0, h = 0;
        for (let i = 0; i < streams.length; i++) {
            const f = streams[i].flow / total;
            W += f * streams[i].state.W;
            h += f * streams[i].state.h;
        }
        const tdb = (h - 1061 * W) / (0.240 + 0.444 * W);
        return buildState(tdb, W, P);
    }

    return { solveState, buildState, computeProcess, invertProcess, mixStreams };
})();
