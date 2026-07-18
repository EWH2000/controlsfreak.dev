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
// INDEPENDENTLY of superheat: it trips whenever the evaporator saturation
// temp drops below 32 °F, whatever dragged it there. The airside starve
// (CFM/ton below the 400 floor) is the crux scenario ("Starve the coil") —
// the model must not let "superheat looks fine" imply "system is fine" — but
// a deeply undercharged coil pulled below 32 °F at NORMAL airflow ices too,
// so the alarm follows the P-T plot (any sub-32 °F coil reads as freezing)
// rather than gating on the airflow driver. The verdict text then names
// whichever cause applies (owner decision — the plot already went red on
// tEvap < 32 alone, so gating the alarm on airflow was a mixed signal).
//
// ── The mode axis (heat-pump heating) ───────────────────────────────────
// `mode: 'cooling' | 'heating'` selects which coil evaporates — the
// reversing-valve swap. DEFAULTS.mode = 'cooling', so every pre-mode caller,
// preset, and test is unchanged (backward compat is a hard requirement).
// In HEATING the driving-temperature ROLES swap, not just the numbers:
//   • block (A) — the OUTDOOR coil evaporates: sat temp tracks the outdoor
//     `ambient` (design approach EVAP_APPROACH_HEAT below it — the 47 °F
//     rating point lands tEvap 27 °F) and `condAir` (the outdoor-coil
//     airflow knob) takes over the C_AIR authority. Frost blocking the
//     face IS an outdoor airflow starve — same honesty guard, other coil.
//   • block (C) — the INDOOR coil condenses: tCond = returnT +
//     SPLIT_BASE_HEAT (70 °F return ⇒ 105 °F condensing) and `airflow`
//     (the indoor knob) takes over the SPLIT_CONDAIR authority.
//   • blocks (B)/(D) — superheat / subcooling stay charge-authority;
//     block (D)'s condenser-airflow term follows the condensing coil's
//     knob (airflow in heating).
// `defrost: true` (heating only — the defrost preset) models the field
// reality honestly: defrost IS a temporary cooling-cycle run — the
// reversing valve flips back and the outdoor fan stops (DEFROST_COND_AIR
// stands in for the knob) — so the solve resolves to the COOLING anchor
// set while `mode` still echoes 'heating'.
//
// API (window.RefrigLoop):
//   RefrigLoop.solve(inputs)            → state object (below). Recompute-on-
//                                         change; deterministic; no time step.
//   RefrigLoop.satTempAtP(id,curve,psig)   → { ok, value } | { ok:false, lo, hi }
//   RefrigLoop.pressAtSatTemp(id,curve,°F) → same shape. curve is 'dew'
//                                         (low-side / superheat) or 'bubble'
//                                         (high-side / subcooling).
//   RefrigLoop.DESIGN                   coefficients (read-only, frozen)
//   RefrigLoop.CLAMPS                   per-knob {min,max,step,default} —
//                                         the COOLING set (read-only)
//   RefrigLoop.CLAMPS_HEATING           the heating overlay: ambient / returnT
//                                         re-ranged, every other knob shared
//   RefrigLoop.clampsFor(mode)          → CLAMPS or CLAMPS_HEATING; the page
//                                         slider mirror reads THIS (single source)
//   RefrigLoop.DEFAULTS                 the design knob set (read-only)
//   RefrigLoop.PRESETS                  the nine scenario knob sets (read-only;
//                                         six cooling + three heating)
//
// solve() returns:
//   { mode,                  // echoed: 'cooling' | 'heating'
//     pSuc, pDis,            // gauge pressures, psig (real table lookups)
//     tEvap, tCond,          // evap dew sat temp / cond bubble sat temp, °F
//     superheat, subcool,    // °F (SH held by metering; SC emergent from charge)
//     tSucLine, tLiqLine,    // suction-line / liquid-line temps, °F
//     tAirInEvap, tAirOutEvap,  // EVAPORATING coil entering / leaving air, °F
//     tAirInCond, tAirOutCond,  // CONDENSING coil entering / leaving air, °F
//                            //   (function-keyed; sensible-only)
//     tAirInIndoor, tAirOutIndoor,    // hardware-keyed airside mirrors —
//     tAirInOutdoor, tAirOutOutdoor,  //   the page's Indoor / Outdoor LCD
//                            //   pairs read THESE, so the mode remap is
//                            //   explicit (in heating, indoor air crosses
//                            //   the CONDENSER — the likeliest silent-bug
//                            //   site if a caller guessed from names)
//     cfmPerTon,             // indoor-blower airflow vs the 400 design
//     flags: { freeze, frost, frostChoked, starvedOutdoor, defrost,
//              floodback, starved, highHead, lowSubcool, highSubcool,
//              outOfRange, outOfRangeLow, outOfRangeHigh },
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
        MIN_LIFT:    10,      // °F — minimum condenser-over-evaporator approach
                              //   while the compressor runs: tCond is floored at
                              //   tEvap + MIN_LIFT. A pumping compressor cannot
                              //   hold head below suction (that is why low-ambient
                              //   head-pressure control exists). Without the floor,
                              //   a stage-1 + cold-ambient + high-airflow corner
                              //   drove tEvap above tCond and the suction gauge
                              //   read above the head gauge — physically
                              //   impossible on a running system.

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

        // (F) Airside coil temperatures, °F.  Sensible-only — no latent /
        //     dehumidification model. Each coil's air split scales with load
        //     over air: ΔT_air = base × (capacity / airflow fraction) — double
        //     the pumping or halve the air and the air split doubles.
        AIR_DT_EVAP:  20,     // design indoor-coil air drop, °F — the VAV-lesson
                              //   anchor (75 °F return ⇒ 55 °F supply at design
                              //   airflow). Less air or more pumping ⇒ bigger
                              //   drop.
        AIR_DT_COND:  12,     // design condenser air rise, °F — sits BELOW the
                              //   15 °F design split on purpose so discharge air
                              //   approaches the condensing temp but never
                              //   passes it (90 °F ambient ⇒ 102 °F air under a
                              //   105 °F tCond).
        AIR_APPROACH: 2,      // °F — the airside MIN_LIFT: closest either
                              //   leaving airstream may approach its coil's
                              //   saturation temp. Supply air floors at tEvap +
                              //   this; condenser discharge air caps at tCond −
                              //   this and floors at ambient (when block (C)'s
                              //   split collapses below the approach — overblown
                              //   condenser airflow + deep undercharge — the
                              //   displayed rise collapses to zero rather than
                              //   contradict the head gauge).

        // (G) HEATING-MODE anchors — the reversing-valve swap. The knob
        //     authorities above carry over with their roles exchanged
        //     (C_AIR rides condAir, SPLIT_CONDAIR / SC_CONDAIR ride
        //     airflow); only the anchor geometry is new. Anchored to the
        //     47 °F heat-pump rating point: tEvap 27 °F / tCond 105 °F.
        EVAP_APPROACH_HEAT: 20,  // °F the outdoor coil runs BELOW ambient at
                                 //   design (47 °F day ⇒ 27 °F sat — inside
                                 //   the published 25–30 °F rating band).
                                 //   Ambient tracks 1:1: a 17 °F day lands
                                 //   the coil at −3 °F sat.
        MIN_APPROACH_HEAT:   2,  // °F — the heating evaporator's MIN_LIFT
                                 //   analog: the coil's sat temp may
                                 //   APPROACH the entering outdoor air but
                                 //   never cross it (a coil warmer than the
                                 //   air it absorbs heat from would be
                                 //   rejecting, not absorbing). The block-A
                                 //   positive authorities can sum past the
                                 //   20 °F design approach (+8 fan, +12.5
                                 //   stage 1, +3 overcharge = +23.5), so a
                                 //   reachable light-load corner otherwise
                                 //   put tEvap ABOVE ambient. Mirrors
                                 //   AIR_APPROACH's 2 °F role.
        SPLIT_BASE_HEAT:    35,  // °F indoor condenser split over return air
                                 //   (70 °F return ⇒ 105 °F condensing).
        SPLIT_AMB_HEAT:    0.5,  // °F of condensing-split DROOP per °F of
                                 //   ambient below the 47 °F rating point
                                 //   (owner decision 2026-07-18: a real
                                 //   cold-weather capacity fade, not a
                                 //   held-at-design disclaimer). As ambient
                                 //   falls, suction density and mass flow
                                 //   fall, so less heat reaches the indoor
                                 //   coil: zero at the 47 °F anchor (the
                                 //   rating-point tests stand), tCond 90 °F
                                 //   at the 17 °F point ⇒ ~88 °F supply
                                 //   (published 85–90 band; the supply cap
                                 //   at tCond − AIR_APPROACH is what
                                 //   carries the droop to the air once
                                 //   tCond falls under ~97). Deep cold
                                 //   droops further (−5 °F ⇒ ~77 °F supply
                                 //   — a few °F cooler than typical
                                 //   published, erring on the honest-fade
                                 //   side for a directional model). ONE-
                                 //   SIDED on purpose: above 47 °F the
                                 //   design split holds — a mild-day head
                                 //   boost is second-order and would
                                 //   false-flag highHead at design knobs.
        AIR_DT_EVAP_HEAT:   12,  // °F design outdoor-coil air drop — the air
                                 //   gives up its heat to the refrigerant
                                 //   (47 ⇒ 35 °F off the coil).
        AIR_DT_COND_HEAT:   25,  // °F design indoor supply rise (70 ⇒ 95 °F
                                 //   supply — heat-pump-warm, not furnace-hot).
        HIGH_HEAD_SPLIT_HEAT: 38,  // °F abnormal indoor-condenser approach
                                 //   onset (design split is 35 — same +3
                                 //   margin as the cooling threshold).
        FROST_AMBIENT_T:    40,  // °F — the frost-accumulation ambient
                                 //   ceiling: below-32 °F coil sat is NORMAL
                                 //   heat-pump operation on a cold day, so
                                 //   the frost flag needs the ambient to be
                                 //   in the moisture-laden accumulation band
                                 //   too (strictly below 40 °F).
        FROST_CHOKE_AIR:    0.75,  // outdoor-airflow fraction below which a
                                 //   frosting coil reads CHOKED — the
                                 //   accumulated state (frost blocks the
                                 //   face, the coil pulls colder, more
                                 //   frost — the spiral the defrost cycle
                                 //   exists to break).
        STARVED_APPROACH_HEAT: 30,  // °F — evaporator approach (ambient −
                                 //   sat) beyond which the outdoor coil
                                 //   reads STARVED at ANY ambient (blocked
                                 //   face, matted fins, weak fan — design
                                 //   approach is 20). At design charge and
                                 //   stage this fires exactly when condAir
                                 //   drops below FROST_CHOKE_AIR — the same
                                 //   physical boundary; below the 40 °F
                                 //   frost band frostChoked SPECIALIZES it
                                 //   into the icing error, above the band
                                 //   the generic starve warn carries it
                                 //   (without this rung, a choked coil at
                                 //   45 °F ambient read green with suction
                                 //   collapsed to ~50 psig).
        DEFROST_COND_AIR:   0.05,  // the outdoor-coil airflow the DEFROST
                                 //   solve uses — the fan is OFF, so the
                                 //   knob's commanded value is ignored and
                                 //   the near-zero airflow spikes the coil
                                 //   split (hot coil melts the frost).

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

    // Heating overlay: only the two temperature knobs re-range (a heating
    // day is cold outside and the indoor design return is 70 °F); every
    // other knob is the SAME frozen object as CLAMPS. clampsFor(mode) is
    // what the page's slider mirror reads on a mode flip (single source).
    const CLAMPS_HEATING = Object.freeze(Object.assign({}, CLAMPS, {
        returnT:  Object.freeze({ min: 60,  max: 80,  step: 1, default: 70 }),
        ambient:  Object.freeze({ min: -5,  max: 65,  step: 1, default: 47 }),
    }));

    function clampsFor(mode) {
        return mode === 'heating' ? CLAMPS_HEATING : CLAMPS;
    }

    // The design ("typical day") knob set — what the sim opens on and what the
    // `typical` preset restores. refrig is the R-410A default (persisted by the
    // page under the shared cf_rf_refrigerant key; the engine just needs an id).
    // mode defaults to cooling — the backward-compat anchor: solve() without a
    // mode key is bit-identical to the pre-mode engine. (In heating, missing
    // ambient / returnT keys fall back to CLAMPS_HEATING's defaults instead —
    // solve({ mode: 'heating' }) IS the 47 °F rating point.)
    const DEFAULTS = Object.freeze({
        mode:     'cooling',
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
    // Every preset carries its `mode` so the engine tests are self-contained;
    // the PAGE ignores that key (the preset row filters by the active mode,
    // so a click can never flip the reversing valve — owner decision), the
    // same way it ignores the `refrig` key (cross-page cf_rf_refrigerant).
    const PRESETS = Object.freeze({
        // Baseline: all design ⇒ 118/341, 40/105, SH 10, SC 10, all green.
        typical:        Object.freeze({ mode: 'cooling', airflow: 1.00, returnT: 75, charge: 1.00, shTarget: 10, ambient: 90, condAir: 1.00, capacity: 1.0, refrig: 'r410a' }),
        // HEADLINE: airside starve ⇒ suction dives, evap → ~18 °F → freeze,
        // but SH stays ~10 (nothing on the refrigerant side is wrong).
        starve:         Object.freeze({ mode: 'cooling', airflow: 0.45, returnT: 75, charge: 1.00, shTarget: 10, ambient: 90, condAir: 1.00, capacity: 1.0, refrig: 'r410a' }),
        // Undercharge ⇒ SH high (~25, starved evap) + SC low/negative (flash gas).
        undercharge:    Object.freeze({ mode: 'cooling', airflow: 1.00, returnT: 75, charge: 0.75, shTarget: 10, ambient: 90, condAir: 1.00, capacity: 1.0, refrig: 'r410a' }),
        // Overcharge ⇒ SC high (~22) + head up + SH low (~2, floodback edge).
        overcharge:     Object.freeze({ mode: 'cooling', airflow: 1.00, returnT: 75, charge: 1.20, shTarget: 10, ambient: 90, condAir: 1.00, capacity: 1.0, refrig: 'r410a' }),
        // Dirty / airflow-starved condenser ⇒ high head (~120) with SH/SC normal.
        dirtyCondenser: Object.freeze({ mode: 'cooling', airflow: 1.00, returnT: 75, charge: 1.00, shTarget: 10, ambient: 90, condAir: 0.50, capacity: 1.0, refrig: 'r410a' }),
        // Low ambient ⇒ head collapses (~70 °F cond, ~200 psig) ⇒ weak metering ΔP.
        lowAmbient:     Object.freeze({ mode: 'cooling', airflow: 1.00, returnT: 75, charge: 1.00, shTarget: 10, ambient: 55, condAir: 1.00, capacity: 1.0, refrig: 'r410a' }),

        // ── Heating presets — the reversing-valve stories. ──
        // HEATING HEADLINE: the accumulated frost state. condAir 0.50 stands
        // in for frost blocking the outdoor face (frost IS an airside
        // starve): suction dives (tEvap −5 °F), SH stays ~10 — the honesty
        // guard's outdoor-coil mirror — and the choked-frost error fires.
        frostedOutdoorCoil: Object.freeze({ mode: 'heating', airflow: 1.00, returnT: 70, charge: 1.00, shTarget: 10, ambient: 35, condAir: 0.50, capacity: 1.0, refrig: 'r410a' }),
        // Honest defrost: a temporary COOLING-cycle run — valve flipped
        // back, outdoor fan off (condAir's knob value is ignored; see
        // DEFROST_COND_AIR) — so suction jumps (~113 psig off the 70 °F
        // indoor coil), the indoor duct blows ~50 °F "cold blow", and the
        // fan-off coil split climbs toward the melt.
        defrost:            Object.freeze({ mode: 'heating', defrost: true, airflow: 1.00, returnT: 70, charge: 1.00, shTarget: 10, ambient: 35, condAir: 1.00, capacity: 1.0, refrig: 'r410a' }),
        // Deep low-ambient heating (the 17 °F rating point): capacity fades
        // (tEvap −3 °F, ~45 psig suction) while the frost flag rides —
        // normal-LOOKING operation that needs defrost + auxiliary heat.
        lowAmbientHeating:  Object.freeze({ mode: 'heating', airflow: 1.00, returnT: 70, charge: 1.00, shTarget: 10, ambient: 17, condAir: 1.00, capacity: 1.0, refrig: 'r410a' }),
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

        // Mode axis. Anything but the literal 'heating' resolves to cooling,
        // so a missing / garbage mode key is the pre-mode engine exactly.
        const mode = inp.mode === 'heating' ? 'heating' : 'cooling';
        const defrost = mode === 'heating' && inp.defrost === true;
        // The CYCLE is which coil evaporates. Defrost IS a cooling-cycle run
        // (the reversing valve flips back, the outdoor fan stops) commanded
        // from heating mode, so it resolves to the cooling anchor set while
        // `mode` still echoes 'heating' for the page.
        const cycle = (mode === 'heating' && !defrost) ? 'heating' : 'cooling';
        const CLm = clampsFor(mode);

        // Resolve + clamp every knob against the MODE's ranges. The
        // missing-key fallback is the mode's design default (for cooling
        // these equal DEFAULTS — bit-identical to the pre-mode engine; in
        // heating, ambient/returnT default to the 47 °F rating point).
        const airflow  = clamp(asNum(inp.airflow,  CLm.airflow.default),  CLm.airflow.min,  CLm.airflow.max);
        const returnT  = clamp(asNum(inp.returnT,  CLm.returnT.default),  CLm.returnT.min,  CLm.returnT.max);
        const charge   = clamp(asNum(inp.charge,   CLm.charge.default),   CLm.charge.min,   CLm.charge.max);
        const shTarget = clamp(asNum(inp.shTarget, CLm.shTarget.default), CLm.shTarget.min, CLm.shTarget.max);
        const ambient  = clamp(asNum(inp.ambient,  CLm.ambient.default),  CLm.ambient.min,  CLm.ambient.max);
        const condAir  = clamp(asNum(inp.condAir,  CLm.condAir.default),  CLm.condAir.min,  CLm.condAir.max);
        const capacity = clamp(asNum(inp.capacity, CLm.capacity.default), CLm.capacity.min, CLm.capacity.max);
        // Refrigerant id: fall back to the R-410A default if unknown / data absent.
        const refrig = (curveOf(inp.refrig, 'dew')) ? inp.refrig : DEFAULTS.refrig;

        // Defrost: the outdoor fan is OFF — the cycle sees the near-zero
        // DEFROST_COND_AIR, not the knob (which keeps the commanded value
        // for when defrost terminates).
        const condAirEff = defrost ? D.DEFROST_COND_AIR : condAir;

        // (A) Evaporating-coil saturation temp + (C) condensing split — the
        //     per-mode anchor sets. The knob AUTHORITIES swap with the
        //     reversing valve: in cooling the indoor knobs drive block (A)
        //     and the outdoor knobs block (C); in heating the outdoor coil
        //     evaporates (ambient + condAir drive A) and the indoor coil
        //     condenses (returnT + airflow drive C). Coefficients are
        //     shared; only each mode's anchor geometry differs.
        let tEvap, split, tCondRaw, subcool;
        if (cycle === 'cooling') {
            // (A) cooling — indoor coil evaporates; airflow is the dominant term.
            tEvap = D.T_EVAP_BASE
                + D.C_AIR   * (airflow  - 1)
                + D.C_RET   * (returnT  - 75)
                + D.C_CAP_E * (capacity - 1)
                + D.C_CHG_E * (charge   - 1);
            // (C) cooling — outdoor coil condenses over ambient.
            split = D.SPLIT_BASE
                + D.SPLIT_CONDAIR * (condAirEff - 1)
                + D.SPLIT_CHG     * (charge     - 1)
                + D.SPLIT_CAP     * (capacity   - 1);
            tCondRaw = ambient + split;
            // (D) cooling — subcooling's condenser-airflow term rides condAir.
            subcool = D.SC_BASE
                + D.SC_CHG     * (charge     - 1)
                + D.SC_CONDAIR * (condAirEff - 1);
        } else {
            // (A) heating — OUTDOOR coil evaporates: sat temp tracks ambient
            //     1:1 below the design approach; condAir is the airside
            //     authority (frost blocking the face is an airflow starve).
            //     Ceiling-clamped at ambient − MIN_APPROACH_HEAT: an
            //     evaporator can approach the air it absorbs heat from but
            //     never cross it (the MIN_LIFT analog — the light-load
            //     corner's +23.5 °F of positive authority beat the 20 °F
            //     design approach and put the coil above the outdoor air).
            tEvap = Math.min(
                ambient - D.EVAP_APPROACH_HEAT
                    + D.C_AIR   * (condAir  - 1)
                    + D.C_CAP_E * (capacity - 1)
                    + D.C_CHG_E * (charge   - 1),
                ambient - D.MIN_APPROACH_HEAT);
            // (C) heating — INDOOR coil condenses over return air; the
            //     indoor blower (airflow) is the split authority (a choked
            //     filter in winter reads as high head). The ambient term is
            //     the cold-weather capacity fade: below the 47 °F rating
            //     point the split droops (falling suction ⇒ less mass flow
            //     ⇒ less heat into the indoor coil), one-sided so a mild
            //     day holds the design split — see SPLIT_AMB_HEAT.
            split = D.SPLIT_BASE_HEAT
                + D.SPLIT_CONDAIR  * (airflow  - 1)
                + D.SPLIT_CHG      * (charge   - 1)
                + D.SPLIT_CAP      * (capacity - 1)
                + D.SPLIT_AMB_HEAT * Math.min(0, ambient - 47);
            tCondRaw = returnT + split;
            // (D) heating — the condensing coil's airflow is the indoor knob.
            subcool = D.SC_BASE
                + D.SC_CHG     * (charge  - 1)
                + D.SC_CONDAIR * (airflow - 1);
        }

        // (B) Superheat — held by the metering device, charge is the authority.
        //     Coil airflow is intentionally absent in BOTH modes (an airside
        //     starve — a blocked filter or a frosted outdoor face — leaves SH
        //     normal: the honesty guard).
        const superheat = shTarget
            + D.SH_UNDER * Math.max(0, 1 - charge)
            - D.SH_OVER  * Math.max(0, charge - 1);
        const tSucLine = tEvap + superheat;

        // (C, floor) Head cannot sit below suction while the compressor pumps
        //     (the low-ambient collapse bottoms out here — the machine-side
        //     answer is head-pressure control, which the lowAmbient verdict
        //     already narrates). Same floor in both modes.
        const tCond = Math.max(tCondRaw, tEvap + D.MIN_LIFT);
        const tLiqLine = tCond - subcool;

        // (E) Indoor-blower airflow readout against the 400 CFM/ton design.
        //     Keyed to the indoor knob in BOTH modes (it is the same blower);
        //     only the STORY changes — in cooling 400 is the coil-freeze
        //     floor, in heating low indoor airflow reads as high head.
        const cfmPerTon = D.CFM_PER_TON_DESIGN * airflow;

        // (F) Airside coil temperatures — sensible-only, function-keyed
        //     (Evap = the evaporating coil, whichever cabinet that is).
        //     Each leaving airstream may APPROACH its coil's refrigerant
        //     temp but never cross it, and never crosses its own entering
        //     temp the wrong way when a degenerate corner collapses the
        //     split below the approach (the same zero-split degeneration
        //     rule on both coils, both modes).
        let tAirInEvap, tAirOutEvap, tAirInCond, tAirOutCond;
        if (cycle === 'cooling') {
            tAirInEvap  = returnT;
            tAirOutEvap = Math.max(returnT - D.AIR_DT_EVAP * (capacity / airflow),
                                   tEvap + D.AIR_APPROACH);
            tAirInCond  = ambient;
            tAirOutCond = Math.max(ambient,
                Math.min(ambient + D.AIR_DT_COND * (capacity / condAirEff),
                         tCond - D.AIR_APPROACH));
        } else {
            // Heating: outdoor air crosses the evaporating coil and leaves
            // COOLED (its heat went into the refrigerant); indoor air
            // crosses the condensing coil and leaves as heat-pump-warm
            // supply. The outer min/max keep each stream on the right side
            // of its own inlet when the light-load corner pushes tEvap
            // within the approach of ambient.
            tAirInEvap  = ambient;
            tAirOutEvap = Math.min(ambient,
                Math.max(ambient - D.AIR_DT_EVAP_HEAT * (capacity / condAir),
                         tEvap + D.AIR_APPROACH));
            tAirInCond  = returnT;
            tAirOutCond = Math.max(returnT,
                Math.min(returnT + D.AIR_DT_COND_HEAT * (capacity / airflow),
                         tCond - D.AIR_APPROACH));
        }
        // Hardware-keyed mirrors — what the page's Indoor / Outdoor LCD
        // pairs read. The remap is EXPLICIT here so no caller has to infer
        // it from mode (in heating, indoor air crosses the CONDENSER).
        const indoorIsEvap = cycle === 'cooling';
        const tAirInIndoor   = indoorIsEvap ? tAirInEvap  : tAirInCond;
        const tAirOutIndoor  = indoorIsEvap ? tAirOutEvap : tAirOutCond;
        const tAirInOutdoor  = indoorIsEvap ? tAirInCond  : tAirInEvap;
        const tAirOutOutdoor = indoorIsEvap ? tAirOutCond : tAirOutEvap;

        // Pressures — the ONE hard-data step. dew for the low side (superheat
        // convention), bubble for the high side (subcooling convention). Clamped
        // to the table ends; a clamp raises flags.outOfRange (never NaN).
        const pSucR = lookupClamped(curveOf(refrig, 'dew'),    1, 0, tEvap);
        const pDisR = lookupClamped(curveOf(refrig, 'bubble'), 1, 0, tCond);
        const pSuc = pSucR.value;
        const pDis = pDisR.value;

        // ── Flags ──
        // Frost first: in heating a below-32 °F outdoor coil is NORMAL — the
        // flag needs the moisture-laden accumulation band too (ambient
        // strictly below FROST_AMBIENT_T). frostChoked is the accumulated
        // state: frost blocking the face reads as outdoor airflow below the
        // choke fraction — the spiral defrost exists to break. Both are
        // heating-CYCLE-only (defrost melts, so it clears them).
        const frost = cycle === 'heating'
            && tEvap < D.FREEZE_T && ambient < D.FROST_AMBIENT_T;
        const flags = {
            // Coil-freeze: evap sat temp below 32 °F, whatever drove it there
            // — an airside starve OR a cold/undercharged coil. Fires on the
            // temp alone (owner decision) so the alarm matches the P-T plot,
            // which already reddens on tEvap < 32; it stays independent of
            // superheat (the honesty guard), so a starved coil ices with a
            // normal refrigerant-side reading. buildVerdict names the cause.
            // COOLING-CYCLE-only: in heating the same sub-32 sat temp is
            // normal operation and reads through `frost` instead.
            freeze:      cycle === 'cooling' && tEvap < D.FREEZE_T,
            frost:       frost,
            frostChoked: frost && condAir < D.FROST_CHOKE_AIR,
            // Outdoor-coil starve — the ambient-independent airside tell:
            // an evaporator approach past STARVED_APPROACH_HEAT means the
            // coil cannot pull heat out of the air stream it has (blocked
            // face / weak fan), whatever the thermometer says outside.
            // Below the frost band, frostChoked is this rung's icing
            // specialization and outranks it in the verdict.
            starvedOutdoor: cycle === 'heating'
                && (ambient - tEvap) > D.STARVED_APPROACH_HEAT,
            defrost:     defrost,
            // Liquid reaching the compressor: superheat collapsed (may be < 0).
            floodback:   superheat <= D.FLOODBACK_SH,
            // Starved evaporator / high superheat — the undercharge tell.
            starved:     superheat > D.STARVED_SH,
            // High head: an abnormal condenser approach (dirty coil /
            // overcharge — per-mode threshold, the heating design split is
            // 35 not 15) OR an absolutely high condensing temp. Suppressed
            // during defrost: the fan-off split spike IS the melt working,
            // not a fault (the defrost verdict narrates it).
            highHead:    !defrost && ((tCond > D.HIGH_HEAD_T) || (split >
                (cycle === 'heating' ? D.HIGH_HEAD_SPLIT_HEAT : D.HIGH_HEAD_SPLIT))),
            lowSubcool:  subcool < D.LOW_SC,
            highSubcool: subcool > D.HIGH_SC,
            // Per-side table-clamp detail (the page marks the pegged gauge)
            // plus the combined flag the verdict reads.
            outOfRangeLow:  pSucR.oor,
            outOfRangeHigh: pDisR.oor,
            outOfRange:  pSucR.oor || pDisR.oor,
        };

        // ── Verdict (single status-pill summary; most severe wins) ──
        const verdict = buildVerdict(mode, flags, tCond, cfmPerTon, D);

        return {
            mode: mode,
            pSuc: pSuc, pDis: pDis,
            tEvap: tEvap, tCond: tCond,
            superheat: superheat, subcool: subcool,
            tSucLine: tSucLine, tLiqLine: tLiqLine,
            tAirInEvap: tAirInEvap, tAirOutEvap: tAirOutEvap,
            tAirInCond: tAirInCond, tAirOutCond: tAirOutCond,
            tAirInIndoor: tAirInIndoor, tAirOutIndoor: tAirOutIndoor,
            tAirInOutdoor: tAirInOutdoor, tAirOutOutdoor: tAirOutOutdoor,
            cfmPerTon: cfmPerTon,
            flags: flags,
            verdict: verdict,
        };
    }

    // Collapse the flag set to one { kind, text } pill. Severity order: an iced
    // coil / slugged compressor first, then heat-rejection and charge tells,
    // then the low-ambient head-collapse note (verdict-only, no flag), then OK.
    // Freeze stays the top-priority error, but its text is cause-accurate: it
    // only claims airflow starvation when airflow is actually below the design
    // floor; a coil pulled below 32 °F at normal airflow reads the below-32 °F
    // wording (the flag no longer gates on airflow — see the honesty guard).
    // Heating adds four rungs, all no-ops in cooling (their flags are
    // cycle-gated false), tiered: defrost (narrates the honest
    // cooling-cycle run — right under freeze, which can still fire on the
    // defrosting indoor coil), the choked-frost ERROR (the icing
    // specialization of the starve), then — under floodback/starved, which
    // threaten the compressor — the outdoor-coil starve warn (the
    // ambient-independent airside tell; fires alone above the 40 °F frost
    // band) and the plain frost warn (a normal-looking accumulation; the
    // starve rung outranks it because a deep approach is the more specific
    // finding when both hold). highHead / lowHead re-word per mode: in
    // heating the condenser is the indoor coil and "low ambient" is the
    // suction side's problem, not the head's. With the real ambient droop
    // (SPLIT_AMB_HEAT), deep-cold heating also drifts under the lowHead
    // threshold (tCond crosses 85 near 7 °F ambient at design knobs) — the
    // frost/fade warn above it owns that regime, so the heating lowHead
    // text only surfaces on warm-ambient collapses (undercharge / overblown
    // indoor fan).
    function buildVerdict(mode, flags, tCond, cfmPerTon, D) {
        if (flags.freeze) {
            return (cfmPerTon < D.CFM_PER_TON_DESIGN)
                ? { kind: 'error', text: 'Coil freezing — evaporator airflow starved.' }
                : { kind: 'error', text: 'Coil freezing — evaporator running below 32 °F (0 °C).' };
        }
        if (flags.defrost)     return { kind: 'warn',  text: 'Defrost — reversing valve flipped to cooling, outdoor fan off; hot gas melts the frost while the supply duct blows cool. Normal, and temporary.' };
        if (flags.frostChoked) return { kind: 'error', text: 'Outdoor coil frosted over — frost is choking its airflow and dragging suction down. Defrost overdue.' };
        if (flags.floodback)   return { kind: 'warn',  text: 'Floodback — superheat collapsed, liquid reaching the compressor.' };
        if (flags.starved)     return { kind: 'warn',  text: 'Evaporator starved — high superheat, suspect low charge.' };
        if (flags.starvedOutdoor) return { kind: 'warn', text: 'Outdoor coil starved — running far below the outdoor air, suction collapsing (blocked coil face / weak fan).' };
        if (flags.frost)       return { kind: 'warn',  text: 'Outdoor coil below freezing — frost will build at this ambient, and capacity fades with the falling suction. Real units lean on defrost cycles and auxiliary heat here.' };
        if (flags.highHead) {
            return mode === 'heating'
                ? { kind: 'warn', text: 'High head — the indoor coil cannot reject heat (weak indoor airflow / overcharge).' }
                : { kind: 'warn', text: 'High head — condenser cannot reject heat (dirty coil / overcharge / hot day).' };
        }
        if (flags.highSubcool) return { kind: 'warn',  text: 'High subcooling — suspect overcharge.' };
        if (flags.lowSubcool)  return { kind: 'warn',  text: 'Low subcooling — suspect undercharge / flash gas.' };
        if (flags.outOfRange)  return { kind: 'warn',  text: 'Off the P-T chart — reading clamped to the table end.' };
        if (tCond < D.LOW_HEAD_T) {
            return mode === 'heating'
                ? { kind: 'warn', text: 'Head low — condensing temp collapsed, supply air running lukewarm.' }
                : { kind: 'warn', text: 'Head low — low ambient weakens the metering ΔP.' };
        }
        return { kind: 'ok', text: 'Balanced — superheat and subcooling nominal.' };
    }

    return {
        solve: solve,
        satTempAtP: satTempAtP,
        pressAtSatTemp: pressAtSatTemp,
        DESIGN: DESIGN,
        CLAMPS: CLAMPS,
        CLAMPS_HEATING: CLAMPS_HEATING,
        clampsFor: clampsFor,
        DEFAULTS: DEFAULTS,
        PRESETS: PRESETS,
    };
})();

if (typeof window !== 'undefined') { window.RefrigLoop = RefrigLoop; }
if (typeof module !== 'undefined' && module.exports) { module.exports = RefrigLoop; }
