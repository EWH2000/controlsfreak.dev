// ──────────────────────────────────────────────────────────────────────
// refrigerant-loop-engine.js — directional vapor-compression solver for the
// Refrigerant Loop Simulator (/simulators/refrigerant-loop.html).
//
// Loaded as a *classic* script (no type="module"): the page's logic lives in
// an IIFE-wrapped inline <script> whose bindings can't be reached from
// outside, so the engine exposes its API as a plain global, RefrigLoop. Same
// convention as /scripts/pid-engine.js, /scripts/hydronic-engine.js,
// /scripts/psychro-engine.js. A page that wants the engine adds
//
//     <script src="/scripts/refrigerant-data.js"></script>   <!-- FIRST -->
//     <script src="/scripts/refrigerant-loop-engine.js"></script>
//
// before its own inline <script>. refrigerant-data.js MUST load first: the
// engine reads its REFRIGERANT_TYPES saturation tables by name (the #139
// pattern — that file declares a top-level `const`, reachable through the
// shared script scope but NOT a window property, so we guard every read with
// `typeof REFRIGERANT_TYPES !== 'undefined'`). The 11ty build copies both
// through unchanged; nothing transpiles or bundles.
//
// PURE — no DOM, no Units, no timers. The page owns the sliders, the gauges,
// the loop animation, and the rAF easing; the engine owns only the
// quasi-static equilibrium solve.
//
// ── What the model IS (and is not) ──────────────────────────────────────
// This is a DIRECTIONAL teaching model, not a thermodynamic property model.
// It has no P-h / enthalpy data. Instead it works entirely in
// SATURATION-TEMPERATURE space: a small set of additive rules move the evap
// and cond saturation temps (and superheat / subcooling) as each knob turns,
// and the ONLY hard data — the pressure↔saturation-temp mapping — comes from
// real table lookups into REFRIGERANT_TYPES (the same tables, and the same
// dew-for-superheat / bubble-for-subcooling convention, that
// /tools/refrigerant-pt.html reads). So:
//   • MAGNITUDES are illustrative (the DESIGN coefficients below are
//     eyeball-tunable, R-410A-design-anchored starting values);
//   • DIRECTIONS are faithful (every knob pushes the state the way it does
//     in the field);
//   • PRESSURES are honest (real interpolated table lookups, clamped — never
//     NaN — to the table ends).
// A real P-h property model is an explicit LATER upgrade, out of v1 scope.
//
// ── The honesty guard (the headline teaching point) ─────────────────────
// Airflow deliberately does NOT move superheat (see DESIGN / rule B). An
// AIRSIDE-starved coil freezes at NORMAL superheat — the refrigerant side
// looks fine while the coil ices over. So the `freeze` flag fires
// INDEPENDENTLY of superheat, driven by low airflow (CFM/ton below the 400
// floor) dragging the evaporator saturation temp below 32 °F. This is the
// crux scenario ("Starve the coil"); the model must not let "superheat looks
// fine" imply "system is fine."
//
// API (window.RefrigLoop):
//   RefrigLoop.solve(inputs)            → state object (below). Recompute-on-
//                                         change; deterministic; no time step.
//   RefrigLoop.satTempAtP(id,curve,psig)   → { ok, value } | { ok:false, lo, hi }
//   RefrigLoop.pressAtSatTemp(id,curve,°F) → same shape. curve is 'dew'
//                                         (low-side / superheat) or 'bubble'
//                                         (high-side / subcooling).
//   RefrigLoop.DESIGN                   coefficients (read-only, frozen)
//   RefrigLoop.CLAMPS                   per-knob {min,max,step,default} (read-only)
//   RefrigLoop.DEFAULTS                 the design knob set (read-only)
//   RefrigLoop.PRESETS                  the six scenario knob sets (read-only)
//
// solve() returns:
//   { pSuc, pDis,            // gauge pressures, psig (real table lookups)
//     tEvap, tCond,          // evap dew sat temp / cond bubble sat temp, °F
//     superheat, subcool,    // °F (SH held by metering; SC emergent from charge)
//     tSucLine, tLiqLine,    // suction-line / liquid-line temps, °F
//     cfmPerTon,             // evaporator airflow vs the 400 floor
//     flags: { freeze, floodback, starved, highHead,
//              lowSubcool, highSubcool, outOfRange },
//     verdict: { kind:'ok'|'warn'|'error', text } }
// (No tDisGas — the discharge-gas-temp readout is omitted from v1; it is the
// least-grounded number, so it waits for a real enthalpy model.)
// ──────────────────────────────────────────────────────────────────────

'use strict';

const RefrigLoop = (function () {
    'use strict';

    const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
    // Coerce a possibly-undefined / non-finite input to a finite fallback, so
    // a stray typed value or a partial preset can never poison the solve with
    // NaN/Infinity (mirrors hydronic-engine's asNum).
    const asNum = (v, dflt) => (typeof v === 'number' && isFinite(v) ? v : dflt);

    // ── Directional coefficients (R-410A design-anchored; owner-tunable) ──
    // Every knob's authority over the gauges lives here as a named constant so
    // it can be eyeballed and re-tuned without touching the solve. Values are a
    // STARTING SET anchored to the R-410A "typical day" point (40 °F evap /
    // 118.4 psig suction, 105 °F cond / 341.9 psig head, 10 °F SH, 10 °F SC).
    const DESIGN = Object.freeze({
        // (A) Evaporator saturation temp, °F.  tEvap = base + Σ(knob terms).
        T_EVAP_BASE: 40,      // design evap dew sat temp, °F
        C_AIR:       40,      // °F per unit airflow fraction — LESS air ⇒ colder
                              //   coil (the dominant, headline term). airflow 0.5
                              //   ⇒ −20 ⇒ 20 °F; 0.8 ⇒ 32 (freeze onset).
        C_RET:       0.5,     // °F per °F return-air above 75 — warmer entering
                              //   air ⇒ slightly higher suction.
        C_CAP_E:    -25,      // °F per unit capacity above 1 — more pumping ⇒
                              //   lower suction (stage 2 pulls the coil colder).
        C_CHG_E:     15,      // °F per unit charge above 1 — undercharge ⇒
                              //   slightly lower / starved suction.

        // (B) Superheat, °F.  Held by the metering device; CHARGE is the
        //     authority axis. Airflow is ABSENT on purpose (honesty guard).
        SH_UNDER:    60,      // °F per unit undercharge, max(0,1−charge) — SH
                              //   climbs as the evap starves. charge 0.8 ⇒ +12.
        SH_OVER:     40,      // °F per unit overcharge, max(0,charge−1) — SH
                              //   falls toward floodback. charge 1.2 ⇒ −8.

        // (C) Condenser split, °F.  tCond = ambient + split.
        SPLIT_BASE:  15,      // design cond approach at ambient 90 ⇒ tCond 105.
        SPLIT_CONDAIR: -30,   // °F per unit condenser-air above 1 — less air ⇒
                              //   higher head. condAir 0.5 ⇒ split +15 ⇒ 120 °F.
        SPLIT_CHG:   25,      // °F per unit charge above 1 — overcharge backs
                              //   liquid up the condenser ⇒ higher head.
        SPLIT_CAP:   5,       // °F per unit capacity above 1 — more flow to reject.

        // (D) Subcooling, °F.  Emergent from charge + condenser.
        SC_BASE:     10,      // design subcooling, °F.
        SC_CHG:      60,      // °F per unit charge — undercharge ⇒ low/neg SC
                              //   (flash gas); overcharge ⇒ high SC. charge 0.8
                              //   ⇒ −2; charge 1.2 ⇒ 22.
        SC_CONDAIR: -8,       // °F per unit condenser-air above 1 — a weak
                              //   condenser holds a little more liquid.

        // (E) Airflow readout.
        CFM_PER_TON_DESIGN: 400,   // design evaporator airflow, CFM/ton (the
                                   //   floor from equipment-airflow / the VAV
                                   //   coil-flow story). cfmPerTon = 400·airflow.

        // ── Flag / verdict thresholds ──
        FREEZE_T:        32,  // °F — coil-freeze onset (evap sat temp below 32).
        HIGH_HEAD_T:     120, // °F — absolute high-head onset (catches a very hot
                              //   ambient even at a normal split).
        HIGH_HEAD_SPLIT: 18,  // °F — abnormal cond approach onset (catches
                              //   overcharge / dirty condenser at a normal
                              //   ambient; design split is 15).
        LOW_HEAD_T:      85,  // °F — verdict-only "head collapsing" note (low
                              //   ambient). Not a flag — no low-head flag exists.
        FLOODBACK_SH:    3,   // °F — superheat ≤ this ⇒ floodback (liquid to the
                              //   compressor). SH may go negative (do not clamp).
        STARVED_SH:      20,  // °F — superheat > this ⇒ starved evaporator / high
                              //   superheat (the undercharge tell; typical 10
                              //   stays clear, undercharge ~25 fires).
        LOW_SC:          3,   // °F — subcool < this ⇒ lowSubcool  (undercharge band)
        HIGH_SC:         20,  // °F — subcool > this ⇒ highSubcool (overcharge band)
    });

    // ── Knob ranges (single source of truth; the page mirrors these) ──────
    // min / max / step drive the sliders; `default` is the design value. Keep
    // the page's <input> min/max/step EQUAL to these.
    const CLAMPS = Object.freeze({
        airflow:  Object.freeze({ min: 0.40, max: 1.20, step: 0.05, default: 1.00 }),
        returnT:  Object.freeze({ min: 65,   max: 85,   step: 1,    default: 75   }),
        charge:   Object.freeze({ min: 0.60, max: 1.20, step: 0.05, default: 1.00 }),
        shTarget: Object.freeze({ min: 4,    max: 25,   step: 1,    default: 10   }),
        ambient:  Object.freeze({ min: 55,   max: 115,  step: 1,    default: 90   }),
        condAir:  Object.freeze({ min: 0.40, max: 1.20, step: 0.05, default: 1.00 }),
        // Compressor is a 2-stage axis, not a continuum: stage 1 = 0.5,
        // stage 2 = 1.0. min/max/step describe the discrete axis for symmetry.
        capacity: Object.freeze({ min: 0.50, max: 1.00, step: 0.50, default: 1.00,
                                  stages: Object.freeze([0.50, 1.00]) }),
    });

    // The design ("typical day") knob set — what the sim opens on and what the
    // `typical` preset restores. refrig is the R-410A default (persisted by the
    // page under the shared cf_rf_refrigerant key; the engine just needs an id).
    const DEFAULTS = Object.freeze({
        airflow:  1.00,
        returnT:  75,
        charge:   1.00,
        shTarget: 10,
        ambient:  90,
        condAir:  1.00,
        capacity: 1.00,
        refrig:   'r410a',
    });

    // ── Scenario presets (full knob sets; the "Try this:" buttons) ────────
    // Each is a COMPLETE input set so a click writes every knob unambiguously
    // (spec §3.5) and solve(PRESETS.x) is self-contained for the tests. Each
    // produces a distinct fault signature on the gauges/LEDs — see the tells.
    const PRESETS = Object.freeze({
        // Baseline: all design ⇒ 118/341, 40/105, SH 10, SC 10, all green.
        typical:        Object.freeze({ airflow: 1.00, returnT: 75, charge: 1.00, shTarget: 10, ambient: 90, condAir: 1.00, capacity: 1.0, refrig: 'r410a' }),
        // HEADLINE: airside starve ⇒ suction dives, evap → ~18 °F → freeze,
        // but SH stays ~10 (nothing on the refrigerant side is wrong).
        starve:         Object.freeze({ airflow: 0.45, returnT: 75, charge: 1.00, shTarget: 10, ambient: 90, condAir: 1.00, capacity: 1.0, refrig: 'r410a' }),
        // Undercharge ⇒ SH high (~25, starved evap) + SC low/negative (flash gas).
        undercharge:    Object.freeze({ airflow: 1.00, returnT: 75, charge: 0.75, shTarget: 10, ambient: 90, condAir: 1.00, capacity: 1.0, refrig: 'r410a' }),
        // Overcharge ⇒ SC high (~22) + head up + SH low (~2, floodback edge).
        overcharge:     Object.freeze({ airflow: 1.00, returnT: 75, charge: 1.20, shTarget: 10, ambient: 90, condAir: 1.00, capacity: 1.0, refrig: 'r410a' }),
        // Dirty / airflow-starved condenser ⇒ high head (~120) with SH/SC normal.
        dirtyCondenser: Object.freeze({ airflow: 1.00, returnT: 75, charge: 1.00, shTarget: 10, ambient: 90, condAir: 0.50, capacity: 1.0, refrig: 'r410a' }),
        // Low ambient ⇒ head collapses (~70 °F cond, ~200 psig) ⇒ weak metering ΔP.
        lowAmbient:     Object.freeze({ airflow: 1.00, returnT: 75, charge: 1.00, shTarget: 10, ambient: 55, condAir: 1.00, capacity: 1.0, refrig: 'r410a' }),
    });

    // ── Saturation lookups (ported verbatim from refrigerant-pt.html) ─────
    // Linear interpolation over a [[psig, °F], …] curve, ascending by psig.
    // xi/yi are the column indices (0 = psig, 1 = °F); °F rises monotonically
    // with psig so scanning either column works. Returns { ok:true, value } or
    // { ok:false, lo, hi } when x is outside the curve's x-column range. This
    // is the EXACT semantics refrigerant-pt.html uses — one source, so the tool,
    // the engine, and the spec agree (collapsing the two copies to one is a
    // tracked follow-up, out of this file's scope).
    function lerp(points, xi, yi, x) {
        const n = points.length;
        const lo = points[0][xi], hi = points[n - 1][xi];
        if (x < lo - 1e-6 || x > hi + 1e-6) return { ok: false, lo: lo, hi: hi };
        if (x <= lo) return { ok: true, value: points[0][yi] };
        if (x >= hi) return { ok: true, value: points[n - 1][yi] };
        for (let i = 0; i < n - 1; i++) {
            const a = points[i], b = points[i + 1];
            if (x >= a[xi] && x <= b[xi]) {
                const f = (x - a[xi]) / (b[xi] - a[xi]);
                return { ok: true, value: a[yi] + f * (b[yi] - a[yi]) };
            }
        }
        return { ok: false, lo: lo, hi: hi };
    }

    // The refrigerant's saturation curve, or null if the data global didn't
    // load (guarded, #139) or the id is unknown. Every table read funnels here.
    function curveOf(id, curve) {
        if (typeof REFRIGERANT_TYPES === 'undefined') return null;
        const R = REFRIGERANT_TYPES[id];
        return (R && R[curve]) ? R[curve] : null;
    }

    // Public lookups: expose the raw lerp result (matching refrigerant-pt.html's
    // { ok, value } shape) so callers/tests can see out-of-range explicitly.
    // curve: 'dew' (low-side / superheat) or 'bubble' (high-side / subcooling).
    function satTempAtP(id, curve, psig) {
        const pts = curveOf(id, curve);
        return pts ? lerp(pts, 0, 1, psig) : { ok: false, lo: NaN, hi: NaN };
    }
    function pressAtSatTemp(id, curve, tempF) {
        const pts = curveOf(id, curve);
        return pts ? lerp(pts, 1, 0, tempF) : { ok: false, lo: NaN, hi: NaN };
    }

    // Internal: a lookup that NEVER returns NaN. On out-of-range it clamps to
    // the nearest table end and reports it, so solve() can raise flags.outOfRange
    // instead of emitting a NaN pressure. Returns { value, oor }.
    function lookupClamped(pts, xi, yi, x) {
        if (!pts || pts.length === 0) return { value: 0, oor: true };
        const r = lerp(pts, xi, yi, x);
        if (r.ok) return { value: r.value, oor: false };
        const n = pts.length;
        // r.lo / r.hi are the x-column bounds; pick the near end's y value.
        const value = (x < r.lo) ? pts[0][yi] : pts[n - 1][yi];
        return { value: value, oor: true };
    }

    // ── The quasi-static equilibrium solve ────────────────────────────────
    // Deterministic recompute-on-change (like the PID sim recomputing on every
    // input) — NOT a time-integrated ODE. Inputs are clamped to CLAMPS first
    // (defensive: a typed value or partial preset can't drive the solve out of
    // bounds), missing keys fall back to DEFAULTS, then the rules run in
    // saturation-temp space and the pressures come from real table lookups.
    function solve(inputs) {
        const inp = inputs || {};
        const D = DESIGN;

        // Resolve + clamp every knob.
        const airflow  = clamp(asNum(inp.airflow,  DEFAULTS.airflow),  CLAMPS.airflow.min,  CLAMPS.airflow.max);
        const returnT  = clamp(asNum(inp.returnT,  DEFAULTS.returnT),  CLAMPS.returnT.min,  CLAMPS.returnT.max);
        const charge   = clamp(asNum(inp.charge,   DEFAULTS.charge),   CLAMPS.charge.min,   CLAMPS.charge.max);
        const shTarget = clamp(asNum(inp.shTarget, DEFAULTS.shTarget), CLAMPS.shTarget.min, CLAMPS.shTarget.max);
        const ambient  = clamp(asNum(inp.ambient,  DEFAULTS.ambient),  CLAMPS.ambient.min,  CLAMPS.ambient.max);
        const condAir  = clamp(asNum(inp.condAir,  DEFAULTS.condAir),  CLAMPS.condAir.min,  CLAMPS.condAir.max);
        const capacity = clamp(asNum(inp.capacity, DEFAULTS.capacity), CLAMPS.capacity.min, CLAMPS.capacity.max);
        // Refrigerant id: fall back to the R-410A default if unknown / data absent.
        const refrig = (curveOf(inp.refrig, 'dew')) ? inp.refrig : DEFAULTS.refrig;

        // (A) Evaporator saturation temp — airflow is the dominant term.
        const tEvap = D.T_EVAP_BASE
            + D.C_AIR   * (airflow  - 1)
            + D.C_RET   * (returnT  - 75)
            + D.C_CAP_E * (capacity - 1)
            + D.C_CHG_E * (charge   - 1);

        // (B) Superheat — held by the metering device, charge is the authority.
        //     Airflow is intentionally absent (an airside starve leaves SH normal).
        const superheat = shTarget
            + D.SH_UNDER * Math.max(0, 1 - charge)
            - D.SH_OVER  * Math.max(0, charge - 1);
        const tSucLine = tEvap + superheat;

        // (C) Condenser saturation temp (high side / head).
        const split = D.SPLIT_BASE
            + D.SPLIT_CONDAIR * (condAir  - 1)
            + D.SPLIT_CHG     * (charge   - 1)
            + D.SPLIT_CAP     * (capacity - 1);
        const tCond = ambient + split;

        // (D) Subcooling — emergent from charge + condenser.
        const subcool = D.SC_BASE
            + D.SC_CHG     * (charge  - 1)
            + D.SC_CONDAIR * (condAir - 1);
        const tLiqLine = tCond - subcool;

        // (E) Airflow readout against the 400 CFM/ton floor.
        const cfmPerTon = D.CFM_PER_TON_DESIGN * airflow;

        // Pressures — the ONE hard-data step. dew for the low side (superheat
        // convention), bubble for the high side (subcooling convention). Clamped
        // to the table ends; a clamp raises flags.outOfRange (never NaN).
        const pSucR = lookupClamped(curveOf(refrig, 'dew'),    1, 0, tEvap);
        const pDisR = lookupClamped(curveOf(refrig, 'bubble'), 1, 0, tCond);
        const pSuc = pSucR.value;
        const pDis = pDisR.value;

        // ── Flags ──
        const flags = {
            // Coil-freeze runaway: evap sat temp below 32 °F AND airflow is the
            // driver (CFM/ton below the design floor). Gated on airflow so the
            // freeze ALARM stays the airside-starvation story — it fires
            // independently of superheat (the honesty guard), which is exactly
            // why a starved coil ices with a normal refrigerant-side reading.
            freeze:      tEvap < D.FREEZE_T && cfmPerTon < D.CFM_PER_TON_DESIGN,
            // Liquid reaching the compressor: superheat collapsed (may be < 0).
            floodback:   superheat <= D.FLOODBACK_SH,
            // Starved evaporator / high superheat — the undercharge tell.
            starved:     superheat > D.STARVED_SH,
            // High head: an abnormal condenser approach (dirty coil / overcharge)
            // OR an absolutely high condensing temp (a very hot ambient).
            highHead:    (tCond > D.HIGH_HEAD_T) || (split > D.HIGH_HEAD_SPLIT),
            lowSubcool:  subcool < D.LOW_SC,
            highSubcool: subcool > D.HIGH_SC,
            outOfRange:  pSucR.oor || pDisR.oor,
        };

        // ── Verdict (single status-pill summary; most severe wins) ──
        const verdict = buildVerdict(flags, tCond, D);

        return {
            pSuc: pSuc, pDis: pDis,
            tEvap: tEvap, tCond: tCond,
            superheat: superheat, subcool: subcool,
            tSucLine: tSucLine, tLiqLine: tLiqLine,
            cfmPerTon: cfmPerTon,
            flags: flags,
            verdict: verdict,
        };
    }

    // Collapse the flag set to one { kind, text } pill. Severity order: an iced
    // coil / slugged compressor first, then heat-rejection and charge tells,
    // then the low-ambient head-collapse note (verdict-only, no flag), then OK.
    function buildVerdict(flags, tCond, D) {
        if (flags.freeze)      return { kind: 'error', text: 'Coil freezing — evaporator airflow starved.' };
        if (flags.floodback)   return { kind: 'warn',  text: 'Floodback — superheat collapsed, liquid reaching the compressor.' };
        if (flags.starved)     return { kind: 'warn',  text: 'Evaporator starved — high superheat, suspect low charge.' };
        if (flags.highHead)    return { kind: 'warn',  text: 'High head — condenser cannot reject heat (dirty coil / overcharge / hot day).' };
        if (flags.highSubcool) return { kind: 'warn',  text: 'High subcooling — suspect overcharge.' };
        if (flags.lowSubcool)  return { kind: 'warn',  text: 'Low subcooling — suspect undercharge / flash gas.' };
        if (flags.outOfRange)  return { kind: 'warn',  text: 'Off the P-T chart — reading clamped to the table end.' };
        if (tCond < D.LOW_HEAD_T) return { kind: 'warn', text: 'Head low — low ambient weakens the metering ΔP.' };
        return { kind: 'ok', text: 'Balanced — superheat and subcooling nominal.' };
    }

    return {
        solve: solve,
        satTempAtP: satTempAtP,
        pressAtSatTemp: pressAtSatTemp,
        DESIGN: DESIGN,
        CLAMPS: CLAMPS,
        DEFAULTS: DEFAULTS,
        PRESETS: PRESETS,
    };
})();

if (typeof window !== 'undefined') { window.RefrigLoop = RefrigLoop; }
if (typeof module !== 'undefined' && module.exports) { module.exports = RefrigLoop; }
