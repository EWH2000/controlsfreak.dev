// ──────────────────────────────────────────────────────────────────────
// duct-engine.js — shared round-duct friction + rect↔round
// equivalent-diameter math for /tools/duct-sizer.html
//
// Loaded as a *classic* script (no type="module") on purpose: each page's
// logic lives in an IIFE-wrapped inline <script>, and an IIFE's bindings
// can't be reached from outside it — so the engine exposes its API as
// plain top-level declarations (script-scoped globals), not as ES-module
// exports. Same convention as /scripts/pid-engine.js and
// /scripts/psychro-engine.js. Any page that wants duct math just adds
//
//     <script src="/scripts/duct-engine.js"></script>
//
// before its own inline <script>. The 11ty build copies this file through
// unchanged; nothing transpiles or bundles.
//
// API (flat top-level — call by bare name):
//
//   DUCT_EPS_GALV                    absolute roughness, ft (galvanized)
//   DUCT_DIA_MIN / DUCT_DIA_MAX      solver diameter bracket, in. (3–120)
//   DUCT_VEL_MIN / DUCT_VEL_MAX      solver velocity bracket, FPM (1–20000)
//   DUCT_SIDE_MIN / DUCT_SIDE_MAX    solver rect-side bracket, in. (1–300)
//   ductArea(diaIn)                  → round cross-section area, ft²
//   ductFriction(diaIn, velFpm)      → { re, f, dp100 }
//   ductDiaForFriction(cfm, dp100)   → diameter, in. — NaN when no
//                                      diameter inside the bracket lands
//                                      on the target friction
//   ductVelForFriction(diaIn, dp100) → velocity, FPM — NaN likewise
//   huebscherDe(aIn, bIn)            → equivalent round diameter, in.
//   huebscherSide(deIn, knownIn)     → the other rectangular side, in. —
//                                      NaN likewise
//
// Method: the Altshul-Tsal friction-factor fit — the closed-form
// approximation ASHRAE Fundamentals offers in place of the Colebrook
// equation its duct friction chart is computed from (the two agree
// within ~1.6 % over the chart's range) — at galvanized roughness and
// standard air (0.075 lb/ft³ — sea level, ~70 °F):
//
//     f′ = 0.11 × (12ε/D + 68/Re)^0.25      (D in inches)
//     f  = f′            when f′ ≥ 0.018
//     f  = 0.85f′ + 0.0028                  otherwise
//     Re ≈ 8.50 × D × V                     (D inches, V FPM — IP shortcut)
//     Δp per 100 ft = (12 × f × 100 / D) × 0.075 × (V / 1097)²
//
// Sanity anchor: 12 in. at 1,000 FPM computes 0.121 in. w.c./100 ft —
// the point every published friction chart agrees on (~0.12). The
// rect↔round conversion is Huebscher's equivalent diameter,
// De = 1.30 (ab)^0.625 / (a+b)^0.25 — equal FRICTION at equal airflow,
// deliberately not equal area and not equal velocity.
//
// The two solve-backwards helpers bisect (both curves are strictly
// monotonic: friction falls as diameter grows at fixed CFM, rises as
// velocity grows at fixed diameter, and De rises with either side).
// Each first checks the target is bracketed and returns NaN when it
// isn't, so a caller can refuse impossible asks honestly instead of
// silently pinning at a bound.
//
// What lives here: anything pure. What does NOT live here: anything that
// touches the DOM or any page's HTML structure — snapping to display
// precision, teaching-mute messages, and formula lines stay on the page.
// The laminar honesty check is also the page's job: the fit is a
// turbulent-flow fit, so callers should treat re below ~4000 as
// "not real duct flow" rather than trusting dp100 there.
//
// Units throughout: diameter / rect sides inches · velocity FPM ·
// airflow CFM · friction in. w.c. per 100 ft. US-native by design (the
// units every ductulator and friction chart is printed in); convert at
// the display boundary, not here.
// ──────────────────────────────────────────────────────────────────────

'use strict';

const DUCT_EPS_GALV = 0.0003;   // ft — absolute roughness, galvanized duct

const DUCT_DIA_MIN  = 3;        // in.
const DUCT_DIA_MAX  = 120;      // in.
const DUCT_VEL_MIN  = 1;        // FPM
const DUCT_VEL_MAX  = 20000;    // FPM
const DUCT_SIDE_MIN = 1;        // in.
const DUCT_SIDE_MAX = 300;      // in.

function ductArea(diaIn) {
    return Math.PI * Math.pow(diaIn / 24, 2);
}

function ductFriction(diaIn, velFpm) {
    const re = 8.50 * diaIn * velFpm;
    const fRough = 0.11 * Math.pow(12 * DUCT_EPS_GALV / diaIn + 68 / re, 0.25);
    const f = fRough >= 0.018 ? fRough : 0.85 * fRough + 0.0028;
    const dp100 = (12 * f * 100 / diaIn) * 0.075 * Math.pow(velFpm / 1097, 2);
    return { re: re, f: f, dp100: dp100 };
}

function ductDiaForFriction(cfm, dp100) {
    if (!isFinite(cfm) || !isFinite(dp100) || cfm <= 0 || dp100 <= 0) return NaN;
    const at = d => ductFriction(d, cfm / ductArea(d)).dp100;
    if (dp100 > at(DUCT_DIA_MIN) || dp100 < at(DUCT_DIA_MAX)) return NaN;
    let lo = DUCT_DIA_MIN;
    let hi = DUCT_DIA_MAX;
    for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (at(mid) > dp100) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
}

function ductVelForFriction(diaIn, dp100) {
    if (!isFinite(diaIn) || !isFinite(dp100) || diaIn <= 0 || dp100 <= 0) return NaN;
    const at = v => ductFriction(diaIn, v).dp100;
    if (dp100 < at(DUCT_VEL_MIN) || dp100 > at(DUCT_VEL_MAX)) return NaN;
    let lo = DUCT_VEL_MIN;
    let hi = DUCT_VEL_MAX;
    for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (at(mid) < dp100) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
}

function huebscherDe(aIn, bIn) {
    return 1.30 * Math.pow(aIn * bIn, 0.625) / Math.pow(aIn + bIn, 0.25);
}

function huebscherSide(deIn, knownIn) {
    if (!isFinite(deIn) || !isFinite(knownIn) || deIn <= 0 || knownIn <= 0) return NaN;
    if (deIn < huebscherDe(knownIn, DUCT_SIDE_MIN) ||
        deIn > huebscherDe(knownIn, DUCT_SIDE_MAX)) return NaN;
    let lo = DUCT_SIDE_MIN;
    let hi = DUCT_SIDE_MAX;
    for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (huebscherDe(knownIn, mid) < deIn) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
}
