// ──────────────────────────────────────────────────────────────────────
// ddcw-ahu-unit.js — the AIR HANDLER unit for the DDC Workbench: a
// single-zone constant-volume AHU with two stages of DX cooling, a
// modulating hot-water heating coil, and a dry-bulb economizer.
// Sibling of /scripts/ddcw-fcu-unit.js, which is the reference
// implementation for every convention this file follows.
//
// Loaded as a *classic* script (no type="module"), same convention as
// /scripts/ddcw-shell.js — see that header for the consuming page's
// full script order. Requires /scripts/psychro-engine.js loaded first:
// `P_STD` is read at LOAD for the `P` constant, and `Psychro` plus the
// bare-name primitive `satHumRatio` are read per tick (and once per
// paint, for the fogging disclosure).
//
// FILE LAYOUT — two banners, and the split between them is
// load-bearing:
//
//   PHYSICS (DOM-free): constants, the TUNE BY FEEL block, the plant
//       factory, the mixing box → HW coil → DX coil → fan air-path
//       solver, the zone integrator, and the point list. NOTHING above
//       the second banner reads `document` or `window`, so a vm context
//       that has loaded psychro-engine.js can load this file and drive
//       plant-in / plant-out physics headless — which is exactly what
//       tests/ddcw-ahu-unit.spec.js does, and that bare context IS the
//       assertion.
//   DOM (graphic + controls): the shell-contract half — renderUnit,
//       syncControls, wireControls, initAnim, onResize and the
//       `create(cfg)` factory. Every element handle resolves inside
//       bindDom(), called from wireControls, NEVER at load. A
//       `document` reference at module scope down there would break the
//       vm load above.
//
// API (window.DDCWAhuUnit):
//
//   DDCWAhuUnit.create(cfg)            → the unit object the shell
//                                        consumes; cfg carries the
//                                        page's programs /
//                                        programLabels / defaultProgram
//                                        / canvasSize
//   DDCWAhuUnit.createPlant()          → a fresh plant     ┐ headless
//   DDCWAhuUnit.update(plant, dtSim)   → integrate a step  │ physics
//   DDCWAhuUnit.points                 → the AHU point list┘ surface
//
// The points key is lower-case `points`, not the FCU's `POINTS`: this
// namespace key IS the shell-contract key it populates (`unit.points`),
// so the two cannot drift.
//
// BINDING INVARIANT (shared with the shell): a point's id === the seed
// FBE-block id in every program === the IO block the programs author.
// The shell's binding driver silently SKIPS an unauthored sensor or
// param, but an unauthored ACTUATOR gets its slot 16 released every
// tick and rests at its relinquishDefault, announced in the off-program
// window — which is why the page's one shipped sheet authors all six
// outputs. A sheet that drops one leaves the machine sitting dead with
// no error anywhere.
//
// Display: internal model is canonical IP (°F, Btu/h); everything
// converts at the display boundary through the shell's Units statics
// (DDCWShell.dispTempNum / tSuffix / dSuffix — codebase-issues #218).
// THRESHOLDS STAY ON THE CANONICAL SIDE OF THAT BOUNDARY: a verdict or
// a paint gate compares a value off `derived` against an IP constant —
// never a display number against a bare literal, which silently makes
// the threshold mean °C for half the readers (codebase-issues #224).
// Display numbers exist to be PAINTED; decisions read the plant. The
// rule binds the graphic lane the moment it writes one.
//
// Consumers: html/simulators/ddc-workbench.html (the AHU workbench
// page — hidden, no `canonical`, so it is invisible to the smoke /
// responsive / contrast sweeps and carries its own hand-written spec).
// Tests: tests/ddcw-ahu-unit.spec.js pins the physics invariants
// engine-direct (directions, orderings, clamp bands, contract shapes —
// never feel-constant values); tests/ddc-workbench-ahu-page.spec.js
// drives the built page; tests/psychro-mixstreams.spec.js pins the
// mixing helper this file's mixed-air state is built on.
// ──────────────────────────────────────────────────────────────────────

'use strict';

const DDCWAhuUnit = (function () {
    'use strict';

    // ═══════════════════════ PHYSICS — DOM-free ═══════════════════════
    // Nothing in this file reads `document` or `window`. Keep it that
    // way: the headless physics surface is the vm-spec seam.

    // ── Rough constants (noted for the reviewer) ──────────────────────
    // A ~5-ton single-zone constant-volume air handler. Internal model
    // is IP (°F, Btu/h); converted at the display boundary. Both coils
    // are a load fed to Psychro.invertProcess, which solves the leaving
    // state — so less air over the same load genuinely deepens the ΔT
    // and a fault that zeroes the load collapses it toward zero, the
    // same mechanism the FCU uses.
    const NOMINAL_CFM   = 2000;                    // CFM at 100% fan (≈400 cfm/ton)
    const CFM_FLOOR     = 100;                     // CFM — keeps the solver out of divide-by-zero
    const STAGE_QSENS   = { 1: 22000, 2: 42000 };  // Btu/h sensible, per DX stage count
    const STAGE_QLAT    = { 1: 5000,  2: 10000 };  // Btu/h latent, per DX stage count
    const HW_QSENS_MAX  = 100000;                  // Btu/h sensible at a fully open HW valve
    const RA_RH         = 50;                      // % — assumed return-air RH
    // Assumed outdoor-air RH. A FIXED assumption on purpose: this
    // machine is dry-bulb throughout (a dry-bulb economizer with a
    // differential enable and a fixed high limit), so outdoor moisture
    // shapes the mixed state's specific volume and latent content and
    // never a control decision. 40 % is the default the economizer
    // lesson's own changeover widget ships.
    const OA_RH         = 40;                      // %
    // Coil leaving-air clamp. This is the DX coil's own floor — an
    // evaporator cannot drive air below freezing without icing over —
    // and it is NOT the freezestat. The 35–38 °F band that
    // coil-freeze-risk.html and air-handlers.html teach is a MIXED-AIR
    // trip on a different sensor in a different place; this roster
    // carries no freezestat point, so nothing here models one.
    const COIL_FLOOR    = 34;                      // °F
    // Heating-coil leaving-air ceiling — the mirror of COIL_FLOOR, and
    // the same kind of rough constant. A hot-water coil's leaving air
    // approaches the entering WATER temperature and cannot pass it, so
    // starving the fan deepens the heating ΔT only until the air reaches
    // the water. This roster carries no water-temperature point, so the
    // ceiling stands in for a design hot-water supply.
    //
    // Without it the heating side is unbounded above, because qHeat is a
    // fixed Btu/h independent of airflow: a step-5 fan slider at 25 %
    // drove the leaving dry-bulb to 237 °F and the DAT chip past 1100 °F
    // at the corners. That is outside the psych engine's validity
    // envelope as well as the machine's — above 212 °F at sea level a
    // saturation humidity ratio does not exist, satHumRatio returns a
    // NEGATIVE value, and buildState silently zeroes W, which breaks
    // this file's own "a heating coil leaves W alone" invariant on the
    // published bag with no error anywhere.
    const HW_LEAVE_MAX  = 180;                     // °F — design hot-water supply
    const P             = P_STD;                   // psia (from psychro-engine)

    // ══ TUNE BY FEEL — PLACEHOLDER zone-thermal + pacing constants ═════
    // First-cut guesses. The owner commissions these live on the
    // preview — they are meant to be trivially findable and changed, so
    // DON'T agonize over them. The zone is one lumped-capacitance node.
    //
    //   Sizing intent (default 80 °F day, zone arriving at 76 °F):
    //   envelope + internal gain is ~12 kBtu/h, one DX stage delivers
    //   ~18 kBtu/h at the zone, so stage 1 pulls the space down — the
    //   "it's working" arrival. MEASURED (bisected on the quasi-static
    //   balance, confirmed by a 12 h integration): stage 1 alone
    //   balances at 71.7 °F, BELOW the 72 °F cut-out, so it reaches its
    //   own off point and cycles. That is the arrival the FCU teaches
    //   and it is what Q_INT_DEF was tuned for — the owner picked the
    //   internal-gain knob over lifting STAGE_QSENS[1], 2026-07-29.
    //
    //   CYCLING IS A JOINT PROPERTY OF THIS BALANCE AND THE SEQUENCE'S
    //   BAND, so the claim above names the band it assumes: the
    //   convention the FCU sheets use, where the setpoint IS the cut-out
    //   — stage 1 makes above cooling-setpoint + deadband (74 °F) and
    //   breaks below cooling-setpoint (72 °F). Under that rule the
    //   measured run is ~93 % duty, ten cycles per 12 sim-hours, first
    //   cut-out ~77 sim-minutes in. The margin is THIN, and that is worth
    //   knowing before writing those sequences: 71.7 °F clears the cut-out
    //   by 0.3 °F, so a program that centres its band on the setpoint
    //   instead (break at 71 °F) gets the never-cycles behaviour back
    //   without anyone touching a constant. Drop Q_INT_DEF further if a
    //   fatter margin is wanted — 7,000 → 71.0 °F and ~88 % duty,
    //   6,000 → 70.3 °F and ~83 %.
    //
    //   Push the OA knob to 95 °F and the gain more than doubles
    //   (27 kBtu/h at a 76 °F zone) while the mixed air warms, so
    //   stage 1 loses (balances at 86.6 °F) and stage 2 takes over and
    //   holds (72.5 °F, above its own cut-out, so the ladder pins at
    //   stage 2): the strained story, reached by dragging one slider.
    //   Push the load knob past that and the machine visibly cannot keep
    //   up. On the heating side a 10 °F morning is a ~52 kBtu/h loss at a
    //   70 °F zone against a coil worth ~74 kBtu/h there, so the valve
    //   holds the space around three-quarters open — authority to spare,
    //   which is what makes a modulating valve worth watching.
    //
    //   The default day is deliberately a COOLING day even though the
    //   economizer is the headline feature: the DX ladder and the
    //   "no ΔT over the coil" tell are the site's north star, and free
    //   cooling is one drag of the OA knob away.
    //
    //   C_ZONE sets the pace, and the supply-air term only counts the
    //   OUTDOOR fraction of it. Recirculated air carries a zone-temp
    //   change straight back around to the discharge, so it exerts no
    //   restoring force — the term enters at oaFrac · mDot · cp, not at
    //   the full ~2.1 kBtu/(h·°F). MEASURED (central-difference on the
    //   quasi-static balance): 700 gives a ~29 min zone time constant at
    //   the 20 % minimum damper position the machine arrives at, ~14 min
    //   at 100 % OA, and 42 min with the fan off. C_ZONE ≈ 310 would put
    //   the arrival state near 13 min if that is the feel wanted.
    const C_ZONE        = 700;     // Btu/°F — lumped zone capacitance (bigger = slower)
    const UA_ENV        = 1000;    // Btu/(h·°F) — envelope conductance to outdoor air
    const Q_INT_DEF     = 8000;    // Btu/h — default internal sensible gain (load knob)
    const T_OA_DEF      = 80;      // °F — default outdoor-air temp (moderate day)
    const COIL_TAU      = 30;      // s — coil thermal + DAT sensor/filter response (bigger = slower ramp)
    // Fan heat, and the reason it is NOT the FCU's 0.6 °F. An FCU sits
    // in the zone it conditions, so the only pickup is motor work. An
    // AHU typically sits in a mechanical room and picks up casing heat
    // on top of that — and a mechanical room is more likely to be hot
    // than a conditioned space is. The two numbers are MODELLED apart,
    // not drifted apart: do not harmonise them. (It also happens to
    // agree with the 1 °F air-handlers.html already teaches, but that
    // agreement is the secondary benefit, not the reason.)
    const FAN_HEAT      = 1.0;     // °F picked up across the fan
    // Airflow proof make-delay. A real duct-pressure proof switch is
    // slow to make and fast to break; this is the make side. The break
    // side is not a constant — loss of airflow drops the switch on the
    // very next tick, which is the asymmetry the sequence has to be
    // written around.
    const PROOF_MAKE_DELAY = 8;    // s of continuous airflow before fan-status makes
    // ═══════════════════════════════════════════════════════════════════

    // ── plant — the AHU's data-driven IO surface (unit-specific keys) ──
    function ahuCreatePlant() {
        // Arrival: a moderate 80 °F day with the zone at 76 °F, one DX
        // stage running at minimum outdoor air — the machine visibly
        // working, with a real coil ΔT on the graphic from the first
        // paint, and a stage that pulls the zone to its cut-out and
        // cycles rather than running flat out (the TUNE BY FEEL block
        // above carries the measured balance and the band it assumes;
        // this comment deliberately does not restate the numbers). The
        // loop is CLOSED: zoneT is the integrated truth and space-temp
        // is the sensed value a program reads.
        //
        // The seeded actuator values cover the instant before the first
        // bindingTick. Once a program exists the resolver overwrites
        // them every tick; until then they ARE the commanded state,
        // which is what makes this file drivable from a spec.
        return {
            sensors: {
                'rat': 76, 'oat': T_OA_DEF, 'mat': 76.8, 'dat': 67,
                'space-temp': 76,
                'fan-status': false,             // proof has not made yet — it takes airflow plus time
            },
            actuators: {
                'oa-damper': 20,                 // % open — the inherited minimum position
                'hw-valve': 0,                   // % open — no heat called on a cooling day
                'fan-speed': 100,                // % — constant volume, so this rests at design
                'fan-enable': true,
                'y1': true, 'y2': false,
            },
            params: {
                'cooling-setpoint': 72,
                'heating-setpoint': 68,          // 4 °F clear of cooling — see the point list
                'deadband': 2,
                'min-oa-pos': 20,                // % — the convention minimum-outdoor-air.html argues with
                'econ-lockout': 62,              // °F — see the point list for where 62 comes from
            },
            conditions: { fault: 'none' },       // none | low-charge | fan-belt (observe-only)
            derived: {},
            anim: { fanFrac: 1 },
            // ── closed-loop thermal state ──
            zoneT: 76,                           // °F — the integrated REAL zone temp (truth)
            // The commissioning knobs live on the PLANT, not in module
            // scope. The FCU keeps its equivalents as module-level `let`s
            // the sliders write, which means a fresh plant silently
            // inherits whatever the last slider drag left behind and an
            // engine-direct spec cannot vary them at all. The AHU's very
            // first invariant is "more outdoor air lowers MAT when it is
            // colder outside" — unswept weather makes that untestable, so
            // the weather belongs to the plant.
            oaT: T_OA_DEF,                       // °F — the REAL outdoor-air temp (truth); the OA knob writes it
            qInternal: Q_INT_DEF,                // Btu/h — internal sensible gain (the load knob writes it)
            coilLeaveT: undefined,               // °F — first-order-lagged coil leaving-air; seeded to
            //                                      its quasi-static target on the first tick (no page-load ramp)
            // Airflow proof state — `elapsed` is seconds of CONTINUOUS
            // airflow, reset to zero the instant airflow stops.
            proof: { made: false, elapsed: 0 },
            // Sensor overrides, keyed by SENSOR POINT ID. The FCU carries
            // a single `override.spaceTemp` bag; the AHU has five AI
            // points to its three, so the shape generalises to a map and
            // the publish step walks it.
            //
            // ALL FIVE ANALOG INPUTS CARRY AN ENTRY (owner decision
            // 2026-07-30), because each one teaches a different fault and
            // an id with no entry simply cannot be forced — `sensedValue`
            // returns the truth for it. Adding the four was the whole cost
            // of the affordance, exactly as this comment used to predict:
            //   space-temp  the wall stat lies while the zone integrates
            //               on the truth — the FCU's lesson, unchanged;
            //   oat         an economizer that opens on a hot day or stays
            //               shut on a free-cooling morning;
            //   rat         breaks the DIFFERENTIAL changeover
            //               specifically, since OAT < RAT is the enable;
            //   mat         makes a mixed-air low limit see a lie;
            //   dat         blinds the discharge low limit — the same
            //               story a stopped fan tells, reached from the
            //               sensor side instead.
            // `fan-status` deliberately gets NONE: a proof switch is not a
            // measurement of a continuous value, so there is nothing to
            // override, and the publish step routes it around
            // `sensedValue` for the same reason.
            //
            // The seeded `value` is read only while `active`, and the DOM
            // half re-seeds it from the truth the moment a force is taken,
            // so these are the arrival readings rather than meaningful
            // state.
            override: {
                'space-temp': { active: false, value: 76 },
                'rat':        { active: false, value: 76 },
                'oat':        { active: false, value: T_OA_DEF },
                'mat':        { active: false, value: 76.8 },
                'dat':        { active: false, value: 67 },
            },
            simSec: 0,                           // accumulated sim-seconds (clock readout hook)
        };
    }

    // ── the two source streams for the mixing box ─────────────────────
    // Both are built in ONE place each, from the plant's own truth, at
    // a fixed RH assumption. When a latent zone state (plant.zoneW)
    // lands, swap returnAirState's body to Psychro.buildState(t,
    // plant.zoneW, P) and add the matching Euler line for zoneW — one
    // call-site changes, same seam the FCU documents.
    function returnAirState(t) { return Psychro.solveState('rh', t, RA_RH, P); }
    function outdoorAirState(t) { return Psychro.solveState('rh', t, OA_RH, P); }

    // What the CONTROLLER reads for a sensor point: normally the truth,
    // but a forced override hands the program a wrong number while the
    // plant keeps integrating on actual physics. An id with no entry in
    // the override map always reads the truth.
    function sensedValue(plant, id, truth) {
        const ovr = plant.override[id];
        return (ovr && ovr.active) ? ovr.value : truth;
    }

    // ── physics — reads `plant`, not the DOM. `dt` is the shared,
    //    speed-scaled, clamped sim step (seconds). ──
    function ahuUpdate(plant, dt) {
        const zoneT     = plant.zoneT;                     // °F — the REAL zone temp (truth)
        const oaT       = plant.oaT;                       // °F — the REAL outdoor-air temp (truth)
        const fanPct    = plant.actuators['fan-speed'];    // %
        const damperPct = plant.actuators['oa-damper'];    // % open
        const hwPct     = plant.actuators['hw-valve'];     // % open
        const d = plant.derived;

        // Validate-and-mute: if a read isn't finite, blank on render and
        // leave every integrated state exactly where it was.
        if (!isFinite(zoneT) || !isFinite(oaT) || !isFinite(fanPct)
            || !isFinite(damperPct) || !isFinite(hwPct) || !isFinite(plant.qInternal)) {
            d.invalid = true;
            return;
        }
        d.invalid = false;

        // ── 1. airflow gating — three DIFFERENT things, named apart ──
        // fanCmd is what the sequence asked for. airflowOn is whether
        // air actually moves. fan-status (published below) is PROOF —
        // what a duct-pressure switch reports back, which lags the
        // truth on the way up and matches it on the way down. Every
        // line of physics below gates on airflowOn, never on fanCmd:
        // that gap IS the belt fault.
        const fanFrac   = Math.max(0, Math.min(1, fanPct / 100));
        const fanCmd    = !!plant.actuators['fan-enable'] && fanPct > 0;
        const fault     = plant.conditions.fault;
        const airflowOn = fanCmd && fault !== 'fan-belt';
        const cfm       = Math.max(CFM_FLOOR, NOMINAL_CFM * fanFrac);

        // ── 2. damper command → outdoor-air fraction ──
        // Linear in the commanded position, and the plant OBEYS the
        // command with NO minimum-position floor of its own. That is
        // deliberate: minimum outdoor air is the SEQUENCE's job (a max
        // block against the min-oa-pos const), so a plant-side floor
        // would quietly do the program's work and make "someone deleted
        // the min-OA block" undemonstrable — which is precisely the
        // fault worth being able to show.
        //
        // Carrying air-handlers.html's caveat in spirit: a commanded
        // position is not really a flow fraction, because damper flow
        // is not linear with blade angle. The linear model is the same
        // readable simplification the lesson and the minimum-OA tool
        // both make, and both say so out loud.
        const oaFrac = Math.max(0, Math.min(1, damperPct / 100));

        // ── 3. mixed air ──
        // WEIGHT BASIS: VOLUMETRIC (CFM), not true dry-air mass flow.
        // The choice is the caller's to make and to state (see
        // Psychro.mixStreams's header), and this is the statement.
        // Why volumetric: it is the arithmetic every page on this site
        // already teaches — air-handlers.html's worked MAT, the
        // %OA formula economizer-ratio.html prints, and the integer-
        // tenths blend coil-freeze-risk.html walks — so CLEAR OF THE
        // SATURATION CURVE a reader who does the sum off the graphic
        // gets the graphic's own answer, to within 0.61 °F anywhere in
        // the space-temp point's 60…90 °F band. (Scoped deliberately:
        // in the FOG branch the published MAT is not that sum at all —
        // see the paragraph below, which is the larger effect and the
        // one that lands in the freeze corner.)
        // Stacking a rigorous mass basis on top of a deliberately crude
        // linear damper model would also be false precision: the
        // damper simplification is worth degrees, the basis question is
        // worth about two in the cold-and-open corner (0 °F outdoor air
        // at a 20 % volumetric fraction is a 22.8 % mass fraction —
        // 58.1 °F mass-weighted against 60.2 °F volumetric, measured
        // against this engine). That divergence lands inside the
        // freeze-protection band, so it is worth KNOWING; it is not
        // worth buying with a model the rest of the machine cannot pay
        // for. (Still no range claim HERE: this file declares none for
        // `oat`, the DOM half owns that control, and the figure belongs
        // with whatever sets it. As of 2026-07-30 that is the workbench
        // page's outdoor-air slider at −20…110 °F — codebase-issues
        // #243 — so the 0 °F corner above is reachable and the
        // paragraph below is scoped to that range rather than to a
        // hypothetical one.)
        //
        // FOGGING IS REACHABLE FROM THE SHIPPED CONTROLS, AND THIS MODEL
        // DROPS THE WATER. Mixing 50 %-RH return air into cold dry
        // outdoor air lands the mixture above the saturation curve well
        // inside the knob ranges — at the shipped RH assumptions, the
        // onset is about −2 °F outdoor at a 50 % damper against a 72 °F
        // zone, which the −20…110 °F slider reaches, and a plain 0 °F
        // once the damper is at 50 % or more against a 76 °F zone. Both
        // are ordinary drags of one control, not corners of a sweep
        // grid. Psychro.mixStreams re-solves the mixed
        // dry-bulb on the curve for the mixture enthalpy there and hands
        // back a `condensate` term (codebase-issues #236). MAT is the
        // mixture's own temperature; matW is the SATURATED value at it,
        // and this file DROPS the condensate rather than carrying it
        // forward (codebase-issues #239) — the coil section downstream
        // sees saturated air and no liquid load, and neither the latent
        // balance nor the graphic has anywhere to put a fog. Read a
        // fogging MAT as "saturated air at this temperature, minus the
        // mist": for a dry-bulb machine's temperature story that is the
        // part that matters, and matW has no consumer today.
        //
        // AND A FOGGING MAT IS NOT THE %OA BLEND — it reads WARMER, and
        // by more than the basis question above. The condensing water
        // releases its latent heat into the air, so once the mixture
        // crosses the curve the published MAT walks away from
        // %OA·OAT + %RA·RAT. MEASURED AGAINST A 72 °F ZONE, the same one
        // the onset paragraph above names — the zone is the other half of
        // the mixture, so a divergence figure without it does not
        // reproduce: about 0.3 °F just past the crossing (−2 °F outdoor at
        // a 50 % damper), 0.9 °F at 0 °F outdoor with the damper at 60 %,
        // and 5.6 °F at the −20 °F / 70 % corner, which is the coldest the
        // shipped slider reaches. It grows steeply with the zone — the
        // same −20 / 70 corner against a 90 °F zone is 10.9 °F.
        // (An earlier draft also quoted 13.6 °F at −30 °F / 65 % / a
        // 90 °F zone. That pair is OUTSIDE the −20…110 °F range the DOM
        // half declares, so read it as an illustration of where the
        // divergence goes rather than as a state this machine can be put
        // in.) That is real psychrometrics, not a modelling slip — but it
        // means the three pages named above still print the plain blend
        // for inputs where this model prints the re-solved value, because
        // they do their mixing inline and have not adopted
        // Psychro.mixStreams yet (codebase-issues #228). A MAT that a
        // reader's own arithmetic cannot reproduce needs to SAY it is a
        // fogging mixture, which is a graphic question rather than a
        // physics one (codebase-issues #240): the DOM half derives the
        // flag by comparing the published matW against saturation at matT
        // and reveals a marker beside the MAT well plus a sentence in the
        // point mirror. That derivation lives with the paint on purpose —
        // this file has no consumer for the flag and deliberately drops
        // the condensate.
        //
        // With no airflow the fraction is moot — the casing air came
        // from the return — so the mixed state collapses to the return
        // state and MAT reads the zone. Real leakage and stack effect
        // through a stopped unit are out of scope for a single-node
        // mixing box.
        const raState = returnAirState(zoneT);
        const oaState = outdoorAirState(oaT);
        let mixState = raState;
        if (airflowOn && raState.ok && oaState.ok) {
            const mixed = Psychro.mixStreams([
                { state: oaState, flow: cfm * oaFrac },
                { state: raState, flow: cfm * (1 - oaFrac) },
            ], P);
            if (mixed.ok) mixState = mixed;
        }
        const matT = mixState.ok ? mixState.tdb : zoneT;

        // ── 4. hot-water coil — FIRST in the air path ──
        // Modulating: the valve position is the fraction of full coil
        // capacity. A heating coil rides humidity ratio through
        // unchanged, so there is no latent term — Psychro.invertProcess
        // handles that itself for type !== 'cool'.
        const hwFrac = Math.max(0, Math.min(1, hwPct / 100));
        let qHeat     = 0;
        let afterHeat = mixState;
        if (airflowOn && mixState.ok && hwFrac > 0) {
            const heated = Psychro.invertProcess(mixState, {
                type: 'heat', cfm: cfm, qSens: hwFrac * HW_QSENS_MAX,
            });
            if (heated.ok) {
                // Leaving-air ceiling (see HW_LEAVE_MAX). Never below the
                // entering air: on a day already hotter than the water,
                // a heating coil does nothing — it does not cool.
                const leaveMax = Math.max(mixState.tdb, HW_LEAVE_MAX);
                afterHeat = heated.tdb > leaveMax
                    ? Psychro.buildState(leaveMax, mixState.W, P)
                    : heated;
            }
            // qHeat is what the AIR actually absorbed, read back off the
            // leaving state, so the published load and the published
            // temperatures cannot disagree once the ceiling binds. Below
            // the ceiling this round-trips to hwFrac · HW_QSENS_MAX
            // exactly — invertProcess and computeProcess are inverses.
            const proc = Psychro.computeProcess(
                { inlet: mixState, outlet: afterHeat, type: 'heat' }, cfm);
            if (isFinite(proc.qSens)) qHeat = proc.qSens;
        }

        // ── 5. DX coil — SECOND, on whatever the HW coil handed it ──
        // Stage count is ADDITIVE — one energized stage is one stage of
        // capacity, whichever one it is. This is NOT the FCU's
        // Y2-implies-Y1 interlock, and the difference is deliberate: on
        // a two-stage machine a sequence that energizes Y2 without Y1
        // is miswired, and an additive count makes that deliver half
        // capacity (visible, diagnosable) where an interlock would hand
        // it full capacity and hide the mistake.
        //
        // Nothing prevents the HW valve and a DX stage from being
        // commanded together. That is a real fault — a unit fighting
        // itself — and the model runs it honestly rather than
        // interlocking it away.
        const stage     = (plant.actuators.y1 ? 1 : 0) + (plant.actuators.y2 ? 1 : 0);
        const capActive = stage > 0 && airflowOn && fault === 'none';
        let coilLeaveTarget = afterHeat.ok ? afterHeat.tdb : zoneT;
        let leavingW        = afterHeat.ok ? afterHeat.W : 0;
        if (airflowOn && afterHeat.ok) {
            // A de-energized DX coil is a passive heat exchanger: run
            // the freeze floor over one and the plant starts doing the
            // sequence's protection for it — a shut valve and two dead
            // compressors on a design-cold morning painted DAT − MAT =
            // +55 °F, hiding the "someone deleted the min-OA block"
            // fault the damper note above says must stay showable.
            // MEASURED (2026-07-30), because the earlier wording here
            // credited the wrong construct: what prevents that is the
            // FLOOR never applying without the CEILING under it, NOT
            // the `capActive` nesting. Probed at −20 °F entering with
            // both compressors off — shipped −20, both clamps hoisted
            // out of capActive −20, floor hoisted alone 34. Keep the
            // nesting regardless: it spares a psychro solve every tick
            // the compressors are off, and ddcw-fcu-unit.js is built to
            // match it.
            if (capActive) {
                const cooled = Psychro.invertProcess(afterHeat, {
                    type: 'cool', cfm: cfm,
                    qSens: STAGE_QSENS[stage], qLat: STAGE_QLAT[stage],
                });
                // A failed inversion means the load-per-cfm drove the
                // solve past bone-dry: a coil that ran out of AIR, not
                // one that stopped cooling. So fall back to the floor,
                // not to the entering air — the latter handed a running
                // coil a zero ΔT, which is this model's own signature for
                // a FAULTED compressor, and made the ΔT non-monotone in
                // airflow (one step of the fan slider took DAT from
                // 35 °F to 78 °F and turned the DX coil into a heater).
                if (cooled.ok) { coilLeaveTarget = cooled.tdb; leavingW = cooled.W; }
                else coilLeaveTarget = COIL_FLOOR;
                // The DX coil's two bounds. FLOOR: an evaporator cannot
                // drive air below freezing without icing over. CEILING:
                // a cooling coil cannot leave WARMER than the air it was
                // handed — which is also what makes the floor harmless on
                // mixed air that is already below it (the floor raises,
                // the ceiling puts it straight back).
                if (coilLeaveTarget < COIL_FLOOR)    coilLeaveTarget = COIL_FLOOR;
                if (coilLeaveTarget > afterHeat.tdb) coilLeaveTarget = afterHeat.tdb;
                // Keep the leaving MOISTURE coherent with the clamped
                // temperature. invertProcess solved W at the unclamped
                // (colder) point, where saturation holds far less water,
                // so a clamped coil would publish a 35 °F dry-bulb
                // against a −54 °F dew point. Nothing prints leavingW
                // today; a supply-RH or SHR readout would.
                const wSat = satHumRatio(coilLeaveTarget, P);
                if (leavingW > wSat) leavingW = wSat;
            }
        } else {
            coilLeaveTarget = zoneT;             // no airflow — nothing crosses either coil
            leavingW = raState.ok ? raState.W : 0;
        }

        // ── 6. coil lag + discharge sensor ──
        // One first-order lag stands for the whole coil section's
        // thermal mass plus the DAT sensor/AI filter. Seed it to the
        // target on the first tick so arrival is already at steady
        // state; the Math.min(1, …) guards against overshoot when dt is
        // large. Runs every tick (even with no airflow) so
        // plant.coilLeaveT stays continuous. The `isFinite` seed test
        // rather than `=== undefined` means a NaN that ever reached the
        // field re-seeds instead of poisoning forward.
        if (!isFinite(plant.coilLeaveT)) plant.coilLeaveT = coilLeaveTarget;
        if (isFinite(dt)) {
            plant.coilLeaveT += (coilLeaveTarget - plant.coilLeaveT) * Math.min(1, dt / COIL_TAU);
        }
        const coilLeaveT = plant.coilLeaveT;     // the lagged value drives datT and the zone balance

        // Draw-through pickup: the fan sits downstream of both coils, so
        // the discharge sensor reads the lagged coil temp plus fan heat.
        //
        // KEEP the fan-off branch. With no air moving, DAT reads the
        // ZONE — which is exactly what makes a discharge low-limit go
        // BLIND the moment the fan stops (codebase-issues #225: the
        // FCU's safeties sheet SHIPPED without airflow proof and its
        // DAT low-limit inherited that hole — closed 2026-07-30, both
        // units carry the interlock now). The fan-status BI is what a
        // correct sequence interlocks on instead, and this branch is
        // what makes the difference between the two demonstrable.
        const datT = airflowOn ? coilLeaveT + FAN_HEAT : zoneT;

        // ── 7. airflow proof ──
        // A duct-pressure proof switch makes SLOW and breaks FAST: it
        // needs continuous airflow for the make delay, and it drops on
        // the first tick without. `elapsed` resets to zero on the way
        // down, so an interrupted run does not bank credit toward the
        // next make.
        if (airflowOn) {
            if (isFinite(dt)) plant.proof.elapsed += dt;
            if (plant.proof.elapsed >= PROOF_MAKE_DELAY) plant.proof.made = true;
        } else {
            plant.proof.elapsed = 0;
            plant.proof.made = false;
        }

        // ── 8. zone heat balance (forward-Euler, pid-engine idiom) ──
        // Q_cool = sensible heat the SUPPLY air removes from the zone,
        // measured from the RETURN state to the POST-FAN supply state —
        // so the outdoor-air load rides in on the supply air itself and
        // must NOT be added again to qGain. (That is the AHU's one
        // structural difference from the FCU's balance, where the only
        // outdoor term is the envelope.) computeProcess returns qSens =
        // mDot·cp·(datT − zoneT), negative when cooling; heat removed is
        // −qSens. Fan-only operation falls out NEGATIVE with no special
        // case: the motor heat lands as a real zone load.
        let qCool = 0;
        if (raState.ok) {
            const supply = Psychro.buildState(datT, leavingW, P);
            if (supply.ok) {
                const proc = Psychro.computeProcess({ inlet: raState, outlet: supply, type: 'cool' }, cfm);
                // Btu/h. <0 means the supply air is WARMER than the
                // return — the heating coil under load, or fan heat
                // alone when neither coil is loaded. Do not read the
                // negative sign as "fan heat": at oaT 10 / hw-valve 50 %
                // the fan contributes ~2 kBtu/h of the −26 kBtu/h.
                if (isFinite(proc.qSens)) qCool = -proc.qSens;
            }
        }
        // Envelope (negative feedback toward outdoor air — adds damping)
        // + internal gain.
        const qGain = UA_ENV * (oaT - zoneT) + plant.qInternal;  // Btu/h
        if (isFinite(dt)) {
            // pv += dt · net / C  (tau ↔ C_ZONE). Loads are Btu/HOUR and
            // C_ZONE is Btu/°F, so net/C is °F/h; dt is sim-SECONDS,
            // hence the /3600. A second state (zoneW on qLat)
            // integrates on this exact line — see returnAirState.
            plant.zoneT += (qGain - qCool) / C_ZONE * (dt / 3600);
            plant.simSec += dt;
            // Wide safety clamp — the envelope term already bounds
            // zoneT; this only catches a pathological knob combination.
            if (plant.zoneT < 40)  plant.zoneT = 40;
            if (plant.zoneT > 120) plant.zoneT = 120;
        }

        // ── 9. publish the sensors a program reads ──
        // Every AI goes through the override map, so any of them CAN be
        // forced once the controls half exists; only space-temp carries
        // an entry today. A forced sensor lies to the program and to
        // nothing else — the physics above reads plant state, never
        // plant.sensors, so the machine keeps running on the truth.
        plant.sensors['rat']        = sensedValue(plant, 'rat', plant.zoneT);
        plant.sensors['oat']        = sensedValue(plant, 'oat', oaT);
        plant.sensors['mat']        = sensedValue(plant, 'mat', matT);
        plant.sensors['dat']        = sensedValue(plant, 'dat', datT);
        plant.sensors['space-temp'] = sensedValue(plant, 'space-temp', plant.zoneT);
        // The proof switch is not a measurement of a continuous value,
        // so there is nothing to override — it reports its own state.
        plant.sensors['fan-status'] = plant.proof.made;

        // ── 10. the derived bag — written ONLY here, read by render and
        //    the specs. Filled in one contiguous block at the END of the
        //    tick, so anything reading it mid-update gets stale values.
        //    (d.invalid is the sole exception: it must be set before the
        //    early return above.) ──

        // Air path, in path order — outdoor and return in, then the walk
        // through the machine. °F.
        d.oaT         = oaT;
        // The return air ENTERING the unit, sampled post-integration —
        // the same sample as sensors['rat'], because the two are one
        // measurement and must round identically every tick (the pre-step
        // local `zoneT` drifts inside one step, enough to split the last
        // displayed digit). Note this is NOT the coil's entering-air
        // reference on an AHU: ΔT here is DAT − MAT, because the mixing
        // box sits between the return and the coils.
        d.eatT        = plant.zoneT;
        // KNOWN RESIDUAL (codebase-issues #233): matT was solved from the
        // TICK-START zoneT — the Euler evaluation point, and the air the
        // coil actually saw — while eatT and the RAT chip above are the
        // tick-END sample. With the dampers shut those are the same air
        // one step apart, so the two chips can differ by the last
        // displayed digit (~0.02 °F per 5-sim-s step at the default
        // tuning). Deliberate: of the two candidate MAT values, the one
        // the coil was handed is the one `DAT − MAT` has to reconcile
        // against. Read #233 before "fixing" it — every alternative moves
        // the split to a different pair.
        //
        // RE-DISPOSITIONED 2026-07-30, when the graphic lane made the
        // split VISIBLE for the first time: the workbench page paints MAT
        // and RAT as adjacent wells in the point mirror, so at the shut
        // position a reader really can see `MAT 77.5` beside `RAT 77.6`
        // and read it as a broken sensor. DEFERRED ANYWAY, and here is the
        // reason rather than a shrug. The two candidate fixes both move
        // the defect rather than removing it — (b) re-solving the mix
        // post-integration for display makes MAT/RAT agree and stops
        // `DAT − MAT` closing, and (c) publishing the whole path from the
        // tick-start sample makes both of those close and splits
        // `d.eatT` from the RAT chip instead, which is the exact defect
        // the FCU's one-sample rule exists to prevent and which this
        // file's own spec row pins. There is no arrangement that makes all
        // three pairs agree with a one-step integrator. `DAT − MAT` is the
        // headline of the drawing and the number this page teaches people
        // to read, so it is the pair that must close; the MAT/RAT split is
        // one digit, only at the shut position, and only while the zone is
        // moving. A real fix is a smaller `dtSim` or a second-order
        // integrator, and neither is this lane's call.
        d.matT        = matT;
        d.afterHeatT  = afterHeat.ok ? afterHeat.tdb : matT;   // quasi-static (only the coil section is lagged)
        d.coilLeaveT  = coilLeaveT;                            // LAGGED
        d.datT        = datT;
        // Moisture at the two coil-section boundaries — observability
        // only today (no consumer), and the pair a heating coil is
        // supposed to leave equal. lb_water / lb_dry-air.
        d.matW        = mixState.ok ? mixState.W : 0;
        d.afterHeatW  = afterHeat.ok ? afterHeat.W : 0;
        // Did the mixed state land ON the saturation curve? Forwarded from
        // `mixStreams`, which sets `.fogging` explicitly on BOTH of its
        // return arms, rather than re-derived downstream by comparing matW
        // against saturation at matT. The proxy and the engine disagree in
        // a thin band near the curve — three states out of a 53k-point
        // sweep of the shipped control ranges, all of them proxy-says-fog
        // where the engine did NOT re-solve, so the published MAT really
        // was the plain blend and the disclosure the DOM half paints would
        // have said something false. `=== true` because the other
        // assignment path (`raState`, the fan-off case) is a solveState
        // result with no such property, and 50 %-RH return air is not
        // fogging. This forwards a boolean the engine already computed; it
        // does NOT re-open the dropped condensate (#239).
        d.matFogging  = mixState.fogging === true;
        // Commanded positions, and what the plant made of each.
        d.damperPct   = damperPct;
        d.oaFrac      = oaFrac;
        d.hwValvePct  = hwPct;
        d.hwFrac      = hwFrac;
        d.fanPct      = fanPct;
        // Discrete state — the three airflow facts stay distinct.
        // `fanStatus` is the third of them and has no consumer today
        // (the chip paints from plant.sensors), same standing as
        // `d.matW` above.
        d.stage       = stage;
        d.fanCmd      = fanCmd;
        d.airflowOn   = airflowOn;
        d.fanStatus   = plant.proof.made;
        d.capActive   = capActive;
        d.fault       = fault;
        // Loads, Btu/h.
        d.qHeat       = qHeat;
        d.qCool       = qCool;                   // signed (<0 = supply warmer than return)
        d.qGain       = qGain;
        // Setpoints, for the readout grid.
        d.coolSetp    = plant.params['cooling-setpoint'];
        d.heatSetp    = plant.params['heating-setpoint'];
        // Sensed-vs-truth, for the override state line.
        d.sensedT        = plant.sensors['space-temp'];
        d.overrideActive = !!(plant.override['space-temp'] && plant.override['space-temp'].active);

        plant.anim.fanFrac = airflowOn ? fanFrac : 0;
    }

    // ── AHU IO points ── point id === seed FBE-block id === the IO block
    // the sample programs will author (the load-bearing binding
    // invariant). `dir` is 'sensor' | 'actuator' for the driver; params
    // carry dir:'param'. min/max/step mirror the intended hand-control
    // ranges (informational here — the programs place their own blocks,
    // so no `seed` field). plantKey === id throughout.
    //
    // `relinquishDefault` (the real BACnet property) is REQUIRED on
    // every actuator point: it is the value the point rests at when its
    // whole priority array is NULL, and it comes from HERE alone — the
    // shell has no fallback table, so an actuator without one resolves
    // to undefined and fails loudly rather than inventing a safe value.
    // Every one below is chosen so that a fully relinquished machine
    // rests STOPPED and CLOSED: fan off, dampers shut, valve shut, no
    // compressor. See each point for why that is the safe rest rather
    // than the obvious one.
    //
    // The roster is FIXED by the AHU design ruling (docs/air-side-sim.md,
    // 2026-07-27/28) — 5 AI, 1 BI, 3 AO, 3 BO, 5 params. Changing it is
    // a design change, not an implementation detail, and the spec pins
    // the id set so it cannot happen by accident.
    const AHU_POINTS = [
        // `conv` drives the shared point-value formatter
        // (DDCWShell.formatPointValue — chip strip + off-program window).
        // `unit` CANNOT stand in for it: `deadband` is a DELTA
        // temperature that also carries '°F', and running a delta
        // through the absolute formula prints -16.7 °C for a 2 °F
        // deadband. Points with no `conv` are unitless-or-already-
        // universal (%) and pass through. The `unit` strings stay as the
        // US labels; the metric label comes from Units.suffix at the
        // display boundary.
        //
        // Sensor order matches the four-point walk air-handlers.html
        // teaches — RA-T, OA-T, MA-T, DA-T — so reading the chip strip
        // left to right IS walking the unit.
        { id: 'rat',              kind: 'ai',    dir: 'sensor',   plantKey: 'rat',              name: 'RAT',       unit: '°F', conv: 'temp' },
        { id: 'oat',              kind: 'ai',    dir: 'sensor',   plantKey: 'oat',              name: 'OAT',       unit: '°F', conv: 'temp' },
        // MAT is the AHU's entering-air reference: coil ΔT here is
        // DAT − MAT, which stays leaving-minus-entering across both
        // units and reads POSITIVE in heating — the reason abs() was
        // rejected.
        { id: 'mat',              kind: 'ai',    dir: 'sensor',   plantKey: 'mat',              name: 'MAT',       unit: '°F', conv: 'temp' },
        { id: 'dat',              kind: 'ai',    dir: 'sensor',   plantKey: 'dat',              name: 'DAT',       unit: '°F', conv: 'temp' },
        { id: 'space-temp',       kind: 'ai',    dir: 'sensor',   plantKey: 'space-temp',       name: 'Space',     unit: '°F', conv: 'temp', min: 60, max: 90, step: 1 },
        // Airflow PROOF, not the fan command — a duct-pressure switch
        // that makes slowly and breaks at once. A sequence that
        // interlocks on this rides through a broken belt; one that
        // assumes the command is the truth does not.
        { id: 'fan-status',       kind: 'bi',    dir: 'sensor',   plantKey: 'fan-status',       name: 'Fan Sts' },

        // Rests CLOSED. A relinquished damper must not park open: on a
        // design-cold morning a wide-open louver over a still coil is
        // the freeze scenario itself. Minimum position is the
        // sequence's job (see the min-oa-pos param), and with the fan
        // also resting off there is nothing to ventilate anyway.
        { id: 'oa-damper',        kind: 'ao',    dir: 'actuator', plantKey: 'oa-damper',        name: 'OA Dmpr',   unit: '%', min: 0, max: 100, step: 5, relinquishDefault: 0 },
        // Rests CLOSED — and the field's fail-OPEN hot-water valve is
        // not a counter-example. A spring-return actuator opens on loss
        // of POWER or air, a hardware protection that a relinquished
        // command never invokes; Relinquish_Default is where the point
        // rests with the controller alive and every slot NULL. With the
        // fan resting off and the damper resting shut, the coil sees no
        // outdoor air, so closed is the coherent software rest.
        { id: 'hw-valve',         kind: 'ao',    dir: 'actuator', plantKey: 'hw-valve',         name: 'HW Vlv',    unit: '%', min: 0, max: 100, step: 5, relinquishDefault: 0 },
        // Rests at ZERO. The machine is constant-volume by design, so
        // this normally sits at 100 — it is an AO because that is what
        // the sequence commands, and because starving the airflow is
        // how a reader sees what airflow does to the coil ΔT.
        { id: 'fan-speed',        kind: 'ao',    dir: 'actuator', plantKey: 'fan-speed',        name: 'Fan Spd',   unit: '%', min: 0, max: 100, step: 5, relinquishDefault: 0 },
        { id: 'fan-enable',       kind: 'bo',    dir: 'actuator', plantKey: 'fan-enable',       name: 'Fan En',    relinquishDefault: false },
        // Rest OFF, both stages. A compressor energized with no airflow
        // — which is exactly the state a relinquished fan-enable leaves
        // behind — floods the coil and slugs the machine.
        { id: 'y1',               kind: 'bo',    dir: 'actuator', plantKey: 'y1',               name: 'Y1',        relinquishDefault: false },
        { id: 'y2',               kind: 'bo',    dir: 'actuator', plantKey: 'y2',               name: 'Y2',        relinquishDefault: false },

        // TWO setpoints, heating and cooling, rather than one plus a
        // signed offset — specifically so OVERLAPPING them is
        // reachable. A unit fighting itself (heating coil and
        // compressor both called, ΔT going nowhere, energy going
        // everywhere) is a real field fault, and the site has no
        // interactive demonstration of it. An offset would make the
        // fault unreachable by construction.
        //
        // PARAMS ARE RAIL-ADJUSTABLE (owner ruling 2026-08-03): the
        // graphic's parameter rail commits edits through
        // host.writeParam, so every param carries min/max/step — the
        // clamp rails the rail enforces AND announces. Canonical IP;
        // the rail converts at the display boundary. min/max here are
        // first-cut ranges pending owner retune on preview. Note the
        // rails are PER-PARAM only — deliberately no cross-field
        // cooling-vs-heating separation guard, so the setpoints can
        // still be walked into each other from the graphic exactly as
        // they can from the wiresheet.
        { id: 'cooling-setpoint', kind: 'param', dir: 'param',    plantKey: 'cooling-setpoint', name: 'Cool SP',   unit: '°F', conv: 'temp',      min: 65, max: 85, step: 0.5 },
        { id: 'heating-setpoint', kind: 'param', dir: 'param',    plantKey: 'heating-setpoint', name: 'Heat SP',   unit: '°F', conv: 'temp',      min: 55, max: 75, step: 0.5 },
        // PER-SETPOINT hysteresis, NOT the gap between the two above:
        // cooling makes at cooling-setpoint + this and breaks at
        // cooling-setpoint. The heating/cooling separation is the
        // SETPOINT GAP (the graphic's SP DIFF well) — nothing sets it,
        // it follows whichever setpoint moves, and it is not a param.
        // min 1, not 0: a zero deadband short-cycles by construction,
        // and the ZERO-band lesson stays reachable on the wiresheet,
        // where the constant is unguarded.
        { id: 'deadband',         kind: 'param', dir: 'param',    plantKey: 'deadband',         name: 'Deadband',  unit: '°F', conv: 'deltaTemp', min: 1, max: 5, step: 0.5 },
        { id: 'min-oa-pos',       kind: 'param', dir: 'param',    plantKey: 'min-oa-pos',       name: 'Min OA',    unit: '%',                     min: 0, max: 100, step: 5 },
        // Fixed dry-bulb high limit, above the differential enable
        // (OAT < RAT). economizers.html derives ~62.4 °F as the
        // worst-case fixed limit for 75 °F / 50 % return air — the
        // point above which outdoor air can carry MORE total heat than
        // the return despite being cooler. 62 sits just under that, and
        // is deliberately not the inherited 65 or 70 the lesson argues
        // against.
        { id: 'econ-lockout',     kind: 'param', dir: 'param',    plantKey: 'econ-lockout',     name: 'Econ Lock', unit: '°F', conv: 'temp',      min: 45, max: 75, step: 1 },
    ];

    // ═════════════════════ DOM — graphic + controls ═════════════════════
    // Everything below touches the page. NO element handle is resolved at
    // load — bindDom() (called from ahuWireControls, the first unit method
    // the shell's boot sequence invokes) owns that, which is what keeps
    // the physics half above vm-loadable without a DOM. A `document`
    // reference at module scope in this section would break
    // tests/ddcw-ahu-unit.spec.js's bare-context load, and that load IS
    // the assertion that the physics half is DOM-free.

    // ── sim-clock preferences the shell reads (ddcw-shell.js:562-563) ──
    // Deliberately declared HERE and not in the physics block: they are
    // read by the shell, so they are live constants rather than the unread
    // mirror codebase-issues #220 warns about. SPEED_MIN / SPEED_MAX are
    // NOT declared — nothing would read them; the slider's own min / max
    // are written from the markup and the shell clamps nothing, so a
    // second copy here would be exactly that trap.
    const SPEED_DEF  = 20;   // × real time
    const MAX_DT_SIM = 5;    // s — the forward-Euler safety net

    // ── verdict thresholds — CANONICAL IP, on the plant side of the
    // display boundary (codebase-issues #224). A verdict compares a value
    // off `derived` against one of these; it NEVER compares a
    // dispTempNum-derived display local against a bare literal, which
    // would silently make the threshold mean °C for half the readers.
    // Two trips rather than the FCU's one, because this machine heats as
    // well as cools and ΔT is SIGNED (discharge minus mixed).
    const COOL_DT_TRIP  = -3;   // °F — at or below this, the coil is really cooling
    const HEAT_DT_TRIP  = 3;    // °F — at or above this, the coil is really heating
    // Coil-freeze watch. Deliberately ABOVE COIL_FLOOR (34): the floor is
    // where the model stops the coil, so a verdict keyed to it would only
    // fire at the clamp. 38 is the top of the band coil-freeze-risk.html
    // and air-handlers.html teach for a mixed-air trip.
    const FREEZE_WATCH  = 38;   // °F

    // Canonical ΔT — the AHU's entering-air reference is MIXED air, not
    // return air, because the mixing box sits between the return and the
    // coils. Read straight off `derived` in °F with no Units round trip,
    // so a units toggle moves the number on screen and never the
    // diagnosis. Callable only AFTER an update: `derived` is filled in one
    // contiguous block at the END of the tick.
    function datDeltaT(d) { return d.datT - d.matT; }

    // ── module-level DOM state ────────────────────────────────────────
    // Chevron band inks, written by renderUnit and read by the animation
    // loop. SYMBOLIC KEYS, not colour strings: a `-fill` token reference
    // has to sit inside a classified SINK for
    // tests/fill-token-misuse.spec.js, and a bare const holding one is a
    // reference that no sink classifier accounts for — which that census
    // fails on as loudly as a forbidden use. strokeChevron() below is
    // where the literals live, and every one of them lands in a
    // `.style.stroke =` assignment.
    // (That spec strips block comments only, so this note is deliberately
    // written without the token syntax it is about — the scan would read
    // a quoted example here as a real reference.)
    let bandAfterHeat = 'mixed';
    let bandDischarge = 'off';
    // Set by ahuInitAnim; renderUnit calls it on every paint. Starts or
    // suspends the animation loop to match the current state, and
    // re-tints a suspended stream (frozen air still has to follow the
    // current band inks).
    let ahuAnimSync = null;

    // ── DOM handles — assigned in bindDom(), read everywhere below ──
    let oadSlider, hwSlider, fanSlider, fanenToggle;
    let nullOad, nullHw, nullStage, nullFan, nullFanen;
    let zoneValLbl;
    let ovrField, ovrSelect, ovrToggle, ovrInput, ovrUnit, ovrState;
    let speedSlider, speedValLbl, oaSlider, oaValLbl, loadSlider, loadValLbl;
    let fanBlade, verdictEl, verdictSrEl, stageBtns, presetBtns, mirrorBtns;
    let fogMark, fogNote, sensorGroups, calloutGroups;
    // The fogging sentence, read off the markup at bind time so the copy
    // lives in one place, plus the latch that keeps the live region from
    // being rewritten at 10 Hz.
    let fogNoteText = '';
    let fogNoteOn = null;
    let blades;
    let out;

    // Every SVG value id and its point-mirror twin. renderUnit writes both
    // surfaces from ONE source, which is what stops them drifting.
    const PAIR_IDS = [
        ['oat',        'ahu-v-oat',        'ahu-r-oat'],
        ['oa-dmpr',    'ahu-v-oa-dmpr',    'ahu-r-oa-dmpr'],
        ['rat',        'ahu-v-rat',        'ahu-r-rat'],
        ['ra-dmpr',    'ahu-v-ra-dmpr',    'ahu-r-ra-dmpr'],
        ['ea-dmpr',    'ahu-v-ea-dmpr',    'ahu-r-ea-dmpr'],
        ['mat',        'ahu-v-mat',        'ahu-r-mat'],
        ['hw-valve',   'ahu-v-hw-valve',   'ahu-r-hw-valve'],
        ['dx-stg1',    'ahu-v-dx-stg1',    'ahu-r-dx-stg1'],
        ['dx-stg2',    'ahu-v-dx-stg2',    'ahu-r-dx-stg2'],
        ['fan-speed',  'ahu-v-fan-speed',  'ahu-r-fan-speed'],
        ['fan-run',    'ahu-v-fan-run',    'ahu-r-fan-run'],
        ['fan-proof',  'ahu-v-fan-proof',  'ahu-r-fan-proof'],
        ['dat',        'ahu-v-dat',        'ahu-r-dat'],
        ['dt',         'ahu-v-dt',         'ahu-r-dt'],
        ['space',      'ahu-v-space',      'ahu-r-space'],
        ['cool-sp',    'ahu-v-cool-sp',    'ahu-r-cool-sp'],
    ];

    // Single-surface nodes: the rail (HTML only, never mirrored) and the
    // four state dots inside their wells. The five p* param nodes are
    // <input>s (the rail is the operator-adjustable surface); their u*
    // suffix spans ride beside them so the editable value stays a bare
    // number. pMinOa's % suffix is static markup — it never converts.
    const SOLO_IDS = {
        pCoolSp:   'ahu-p-cool-sp',
        pHeatSp:   'ahu-p-heat-sp',
        pSpDiff:   'ahu-p-sp-diff',
        pDeadband: 'ahu-p-deadband',
        pEconLock: 'ahu-p-econ-lockout',
        pMinOa:    'ahu-p-min-oa',
        uCoolSp:   'ahu-p-cool-sp-u',
        uHeatSp:   'ahu-p-heat-sp-u',
        uDeadband: 'ahu-p-deadband-u',
        uEconLock: 'ahu-p-econ-lockout-u',
        paramsHint: 'ahu-params-hint',
        dCall:     'ahu-d-call',
        dEcon:     'ahu-d-econ',
        dMech:     'ahu-d-mech',
        dotStg1:   'ahu-dot-stg1',
        dotStg2:   'ahu-dot-stg2',
        dotRun:    'ahu-dot-fan-run',
        dotProof:  'ahu-dot-fan-proof',
    };

    // The five AI points with a physical device on the drawing. Order is
    // the air-path walk, which is also the mirror's order.
    const GLYPHED = ['oat', 'rat', 'mat', 'dat', 'space-temp'];

    function bindDom() {
        oadSlider   = document.getElementById('ahu-oad-slider');
        hwSlider    = document.getElementById('ahu-hw-slider');
        fanSlider   = document.getElementById('ahu-fan-slider');
        fanenToggle = document.getElementById('ahu-fanen-toggle');
        nullOad     = document.getElementById('ahu-null-oad');
        nullHw      = document.getElementById('ahu-null-hw');
        nullStage   = document.getElementById('ahu-null-stage');
        nullFan     = document.getElementById('ahu-null-fan');
        nullFanen   = document.getElementById('ahu-null-fanen');
        zoneValLbl  = document.getElementById('ahu-zone-val');
        ovrField    = document.getElementById('ahu-override');
        ovrSelect   = document.getElementById('ahu-ovr-select');
        ovrToggle   = document.getElementById('ahu-ovr-toggle');
        ovrInput    = document.getElementById('ahu-ovr-input');
        ovrUnit     = document.getElementById('ahu-ovr-unit');
        ovrState    = document.getElementById('ahu-ovr-state');
        speedSlider = document.getElementById('ahu-speed-slider');
        speedValLbl = document.getElementById('ahu-speed-val');
        oaSlider    = document.getElementById('ahu-oa-slider');
        oaValLbl    = document.getElementById('ahu-oa-val');
        loadSlider  = document.getElementById('ahu-load-slider');
        loadValLbl  = document.getElementById('ahu-load-val');
        fanBlade    = document.getElementById('ahu-fan-blade');
        verdictEl   = document.getElementById('ahu-verdict');
        verdictSrEl = document.getElementById('ahu-verdict-sr');
        fogMark     = document.getElementById('ahu-fog-mark');
        fogNote     = document.getElementById('ahu-mat-fog-note');
        fogNoteText = fogNote.textContent.trim();
        stageBtns   = document.querySelectorAll('#tab-unit [data-stage]');
        presetBtns  = document.querySelectorAll('#tab-unit [data-preset]');
        mirrorBtns  = document.querySelectorAll('#tab-unit .ahu-point-btn[data-point]');

        // Sensor glyph groups + the annotation group each one feeds, keyed
        // by point id. The annotation seam is the data-callout-for
        // ATTRIBUTE and not an id, because oat's callout is
        // #ahu-callout-outside-air and space-temp's annotation is the zone
        // box itself — id matching would resolve three of five.
        sensorGroups = {};
        calloutGroups = {};
        GLYPHED.forEach(function (id) {
            sensorGroups[id] = document.getElementById('ahu-sensor-' + id);
            calloutGroups[id] = document.querySelector('[data-callout-for="' + id + '"]');
        });

        // Damper blades. Each is one <line>, and the animator rewrites its
        // four coordinates from the commanded fraction — see setBlades()
        // for the foreshortening the half-extents encode.
        // ⚠ ATTRIBUTE-ONLY SELECTORS, never element-qualified: the house
        // rule (CLAUDE.md, Gotchas) exists because SVG geometry families
        // mix <line> and <path>, and `line[id^=…]` silently drops the half
        // that is not a <line> the day one of these becomes a path.
        blades = {
            // ⚠ UNEQUAL HALF-EXTENTS ON PURPOSE HERE AND NOWHERE ELSE.
            // hy is half the blade PITCH so a shut stack seals the intake
            // opening edge to edge; the cost is the skew setBlades()
            // describes (a commanded 50 % draws 52°). Owner decision
            // 2026-07-31: this damper reads correct at every position and
            // stays as drawn — the seal is worth 7°.
            oa: {
                els: document.querySelectorAll('[id^="ahu-oa-blade"]'),
                cx: [108, 108, 108], cy: [280, 303, 326],
                hx: 9, hy: 11.5, openIs: 'h',
            },
            // Both vertical-flow sets run hx === hy, so the drawn angle IS
            // the commanded angle. They can, because their blades sit SIDE
            // BY SIDE across the opening — the arrangement for downward /
            // upward flow — and each chord only has to cover its own share
            // of the width: three 14s tile the return's 42 (179-221) and
            // three 12s tile the relief's 36 (292-328), edge to edge when
            // shut. Stacking them instead is what forced the old 21 × 3.5
            // return set, and with it the 9.4° that a commanded 50 % drew.
            ra: {
                els: document.querySelectorAll('[id^="ahu-ra-blade"]'),
                cx: [186, 200, 214], cy: [223, 223, 223],
                hx: 7, hy: 7, openIs: 'v',
            },
            ea: {
                els: document.querySelectorAll('[id^="ahu-ea-blade"]'),
                cx: [298, 310, 322], cy: [77, 77, 77],
                hx: 6, hy: 6, openIs: 'v',
            },
        };

        out = {};
        const missing = [];
        PAIR_IDS.forEach(function (row) {
            const g = document.getElementById(row[1]);
            const m = document.getElementById(row[2]);
            if (!g) missing.push(row[1]);
            if (!m) missing.push(row[2]);
            out[row[0]] = [g, m];
        });
        Object.keys(SOLO_IDS).forEach(function (k) {
            const el = document.getElementById(SOLO_IDS[k]);
            if (!el) missing.push(SOLO_IDS[k]);
            out[k] = el;
        });

        // ⚠ A GUARD, AND IT IS DELIBERATE — the opposite call to the FCU's.
        // setBoth() has no null check, so a missing id throws inside
        // renderUnit, which the shell calls from hostTick BEFORE
        // syncControls and the statusbar: the failure mode is a silently
        // FROZEN simulator, not a loud error. The FCU argues against a
        // one-off guard on the grounds it would make one handle the odd one
        // out — that argument does not reach here, because this guards the
        // WHOLE map at bind time and names every id it could not find. This
        // roster is roughly twice the FCU's and every readout is
        // dual-surface, so the odds of one typo are twice as high and the
        // symptom is identical either way.
        if (missing.length) {
            throw new Error('ddcw-ahu-unit: markup is missing '
                + missing.length + ' readout node(s): ' + missing.join(', '));
        }
    }

    // ── Units helpers — the shell's statics (ONE conversion path for the
    // graphic, the rail, the mirror, the chips and the off-program window;
    // codebase-issues #218) ──
    function dispTempNum(f) { return DDCWShell.dispTempNum(f); }
    function tSuffix() { return DDCWShell.tSuffix(); }
    function dSuffix() { return DDCWShell.dSuffix(); }

    function setBoth(pair, text) {
        pair[0].textContent = text;
        pair[1].textContent = text;
    }

    // Mirror a live param into its rail input — the override-input
    // pattern (see the sensor-override display note): never write while
    // the field holds focus, because the user is mid-edit and commit is
    // Enter / focus-out, and only write on a genuine change so an idle
    // tick never disturbs the field.
    function setParamInput(inp, str) {
        if (document.activeElement === inp) return;
        if (inp.value !== str) inp.value = str;
    }

    // The rail's five adjustable params: roster point id → the bindDom
    // handle key of its input. Walked by the mirror paint, the
    // writability sync and the commit wiring, so the three surfaces
    // cannot cover different sets.
    const PARAM_POINTS = [
        { id: 'cooling-setpoint', outKey: 'pCoolSp' },
        { id: 'heating-setpoint', outKey: 'pHeatSp' },
        { id: 'deadband',         outKey: 'pDeadband' },
        { id: 'econ-lockout',     outKey: 'pEconLock' },
        { id: 'min-oa-pos',       outKey: 'pMinOa' },
    ];

    // Roster lookup by point id — the params' min/max/step and conv all
    // live on AHU_POINTS, the single source the chips already read.
    function rosterPoint(id) {
        for (let i = 0; i < AHU_POINTS.length; i++) {
            if (AHU_POINTS[i].id === id) return AHU_POINTS[i];
        }
        return null;
    }

    // Toggle a class on BOTH surfaces of a pair — the .is-false dim on a
    // false boolean has to land on the SVG well text and on its mirror
    // together, or an off point reads off in one place and on in the other.
    function classBoth(pair, cls, on) {
        pair[0].classList.toggle(cls, on);
        pair[1].classList.toggle(cls, on);
    }

    // ── verdict — ONE writer for the pill and its screen-reader mirror ──
    // The pill (#ahu-verdict) lives inside #tab-unit, and .tab-pane is
    // display:none while the Wiresheet is up, so aria-live ON THE PILL is
    // out of the accessibility tree on exactly the tab where a reader is
    // studying the program that raised the annunciation (codebase-issues
    // #227a). So the pill is a mute readout and #ahu-verdict-sr carries the
    // announcement.
    //
    // SIGNATURE-GUARDED: the host ticks at 10 Hz and repaints every tick,
    // and an unguarded rewrite of a live region is a screen reader talking
    // over itself ten times a second. The class rides IN the signature so a
    // state whose text is unchanged can never skip its class change.
    //
    // ⚠ THE SIGNATURE IS TEXT-ONLY, and that only holds because NO VERDICT
    // STRING BELOW CARRIES A NUMBER OR A UNIT. Checked deliberately on this
    // unit, which has a bigger verdict vocabulary than the FCU: a line that
    // ever interpolates a temperature MUST fold tSuffix() into the
    // signature, or a metric toggle would leave a stale °F line on screen.
    let verdictSig = null;
    function setVerdict(cls, txt) {
        const sig = cls + '|' + txt;
        if (sig === verdictSig) return;
        verdictSig = sig;
        verdictEl.className = 'status-pill ahu-verdict' + (cls ? ' ' + cls : '');
        verdictEl.textContent = txt;
        verdictSrEl.textContent = txt;
    }

    // The override state line is a `role="status"` region, so it needs the
    // same guard setVerdict has and for the same reason — codebase-issues
    // #229, which was filed against the FCU's twin and reproduced here
    // verbatim before this existed: 30 identical rewrites over three
    // seconds while an override was held.
    //
    // Guarding on the WHOLE composed string rather than on the point set is
    // deliberate: the string already interpolates tSuffix() through
    // dispTempNum, so a units toggle changes the signature and repaints.
    // #229's warning about a stale °F line is therefore satisfied by
    // construction here — unlike setVerdict, whose signature is text-only
    // because its vocabulary carries no numbers at all.
    let ovrStateSig = null;
    function setOvrState(txt) {
        if (txt === ovrStateSig) return;
        ovrStateSig = txt;
        ovrState.textContent = txt;
    }

    // ── damper blades ─────────────────────────────────────────────────
    // Every section here cuts ACROSS the blade shafts, so a blade swings in
    // the plane of the drawing: end-on across the opening when it seals,
    // edge-on down the airstream when it is wide. Each blade is one line
    // through its own centre whose half-extents (hx, hy) are scaled by the
    // open angle, which fits every damper at both extremes and reproduces
    // the approved depiction exactly at each commanded position it was
    // drawn at.
    //   openIs 'h' — flow is horizontal, so blades PARALLEL to flow
    //                (horizontal) is fully open.
    //   openIs 'v' — flow is vertical, so blades PARALLEL to flow
    //                (vertical) is fully open.
    //
    // ⚠ THE DRAWN ANGLE IS THE COMMANDED ANGLE ONLY WHERE hx === hy.
    // Scaling x and y by different half-extents walks an ELLIPSE rather
    // than a circle, so the rendered angle is atan(tan θ · hy/hx). Measured
    // on the shipped build before the two vertical-flow sets were
    // equalized: a commanded 50 % drew the return blades at 9.4°, which is
    // indistinguishable from shut and only read as open past 89 % travel,
    // and the relief blades at 69.5°, which read wide from the first nudge.
    // A damper on a supervisory graphic exists to show a position, so a
    // depiction that cannot show it is worth nothing — both are equal now
    // and linear by construction. The oa set is the one deliberate holdout;
    // see the note on the blades map.
    function setBlades(set, frac) {
        const a = Math.max(0, Math.min(1, frac)) * Math.PI / 2;
        const dx = set.openIs === 'h' ? set.hx * Math.sin(a) : set.hx * Math.cos(a);
        const dy = set.openIs === 'h' ? set.hy * Math.cos(a) : set.hy * Math.sin(a);
        for (let i = 0; i < set.els.length; i++) {
            const el = set.els[i];
            const cx = set.cx[i];
            const cy = set.cy[i];
            el.setAttribute('x1', (cx - dx).toFixed(2));
            el.setAttribute('y1', (cy - dy).toFixed(2));
            el.setAttribute('x2', (cx + dx).toFixed(2));
            el.setAttribute('y2', (cy + dy).toFixed(2));
        }
    }

    // ── paint — reads plant.derived and plant.sensors; owns the DOM ──
    //
    // ⚠ THE WELLS SHOW THE SENSED VALUE, NOT THE TRUTH, and that is the
    // whole override lesson: a forced sensor lies to the program AND to
    // this graphic, exactly as a stuck input lies to a real front end. The
    // TRUTH appears in one place only — the zone readout beside the
    // override control — and the state line names the gap. Decisions below
    // read `derived` (the truth) for the same reason in reverse: a verdict
    // that read the sensors would believe the lie.
    function ahuRenderUnit(plant) {
        const d = plant.derived;
        if (d.invalid) {
            PAIR_IDS.forEach(function (row) { setBoth(out[row[0]], '—'); });
            setVerdict('', 'Enter a value.');
            return;
        }

        const s = plant.sensors;
        const p = plant.params;

        // ── display locals. These exist to be PAINTED. Nothing below
        // compares one against anything — the thresholds are the four
        // canonical constants at the top of this section, measured against
        // `derived` (codebase-issues #224, guarded by the display-unit scan
        // in tests/ddcw-fcu-unit.spec.js, which walks both unit modules).
        const oatN     = dispTempNum(s['oat']);
        const ratN     = dispTempNum(s['rat']);
        const matN     = dispTempNum(s['mat']);
        const datN     = dispTempNum(s['dat']);
        const spaceN   = dispTempNum(s['space-temp']);
        const zoneN    = dispTempNum(plant.zoneT);
        const coolSpN  = dispTempNum(p['cooling-setpoint']);
        const heatSpN  = dispTempNum(p['heating-setpoint']);
        const econLkN  = dispTempNum(p['econ-lockout']);
        // ΔT reconciles from the DISPLAYED operands so the on-screen
        // arithmetic closes for a metric reader too (the house rounding
        // policy), and it is signed: discharge minus mixed, negative while
        // the machine removes heat.
        const dtN      = Math.round((datN - matN) * 10) / 10;
        // Setpoint separation — the SP DIFF well. Nothing sets it; it falls
        // out of its two neighbours, which is why its well is blue.
        const spDiffN  = Math.round((coolSpN - heatSpN) * 10) / 10;
        // A deadband is a DELTA temperature, so it converts through the
        // delta path — running it through the absolute formula prints
        // -16.7 °C for a 2 °F band.
        const dbDisp   = window.Units.current() === 'us'
            ? p['deadband'] : window.Units.display.deltaTemp(p['deadband']);
        const dbN      = Math.round(dbDisp * 10) / 10;

        const t = ' ' + tSuffix();
        setBoth(out.oat,   oatN.toFixed(1) + t);
        setBoth(out.rat,   ratN.toFixed(1) + t);
        setBoth(out.mat,   matN.toFixed(1) + t);
        setBoth(out.dat,   datN.toFixed(1) + t);
        setBoth(out.space, spaceN.toFixed(1) + t);
        setBoth(out.dt,    dtN.toFixed(1) + ' ' + dSuffix());
        // The one permitted three-way duplication on this component: the
        // cooling setpoint lives in the zone box, in the rail and in the
        // mirror, because it is the stage's BREAK point — space against
        // setpoint is what tells a reader how close the call is to dropping
        // out. All three are written HERE, in one call, so they cannot
        // drift. The rail copy is an INPUT now — its value is the bare
        // number (the suffix rides in the u* span) and the mirror write
        // skips while the field is being edited.
        setBoth(out['cool-sp'], coolSpN.toFixed(1) + t);
        setParamInput(out.pCoolSp, coolSpN.toFixed(1));

        // ── the three dampers ride ONE actuator ──
        // The roster carries a single oa-damper AO; return and relief are
        // the same command through the linkage every packaged economizer
        // ships. They read COMMANDED rather than calculated because that is
        // what they are: one command, three blade sets.
        const oaPct = Math.round(d.damperPct);
        const raPct = 100 - oaPct;
        const eaPct = oaPct;
        setBoth(out['oa-dmpr'], oaPct + ' %');
        setBoth(out['ra-dmpr'], raPct + ' %');
        setBoth(out['ea-dmpr'], eaPct + ' %');
        setBlades(blades.oa, d.oaFrac);
        setBlades(blades.ra, 1 - d.oaFrac);
        setBlades(blades.ea, d.oaFrac);

        setBoth(out['hw-valve'], Math.round(d.hwValvePct) + ' %');
        setBoth(out['fan-speed'], Math.round(d.fanPct) + ' %');

        // ── booleans: text, state dot and the .is-false dim, together ──
        const y1 = plant.actuators.y1 === true;
        const y2 = plant.actuators.y2 === true;
        setBoth(out['dx-stg1'], y1 ? 'ON' : 'OFF');
        setBoth(out['dx-stg2'], y2 ? 'ON' : 'OFF');
        classBoth(out['dx-stg1'], 'is-false', !y1);
        classBoth(out['dx-stg2'], 'is-false', !y2);
        out.dotStg1.classList.toggle('is-off', !y1);
        out.dotStg2.classList.toggle('is-off', !y2);

        // RUN is the fan COMMAND — the enable AND a non-zero speed
        // reference; PROOF is the duct-pressure switch. Deliberately not
        // merged: a unit can report "on" from a commanded output while the
        // proof never makes, and that gap is the whole reason a proof point
        // exists.
        //
        // ⚠ THE ROW IS NAMED `run`, NOT `status`, AND THAT IS LOAD-BEARING
        // on the one page whose prose teaches that command, status and
        // proof are three different claims. The roster's `fan-status` BI is
        // the PROOF (a duct-pressure or current switch is what a field
        // fan-status point actually is), and it paints the statusbar chip
        // captioned "Fan Sts". A drawing row that also said STATUS while
        // showing the command left the two surfaces on screen together,
        // disagreeing, under the same word.
        const proof = s['fan-status'] === true;
        setBoth(out['fan-run'], d.fanCmd ? 'ON' : 'OFF');
        classBoth(out['fan-run'], 'is-false', !d.fanCmd);
        out.dotRun.classList.toggle('is-off', !d.fanCmd);
        setBoth(out['fan-proof'], proof ? 'MADE' : 'NONE');
        classBoth(out['fan-proof'], 'is-false', !proof);
        out.dotProof.classList.toggle('is-off', !proof);

        // ── the rail ── the five params are INPUTS (the rail is the
        // operator-adjustable surface): while a field is not focused its
        // VALUE mirrors the live param — the override-input pattern — and
        // the °F/°C suffix rides in a separate span so the number stays a
        // bare editable value. SP DIFF stays a painted read-only well:
        // nothing sets it, it falls out of its two neighbours.
        setParamInput(out.pHeatSp, heatSpN.toFixed(1));
        setParamInput(out.pDeadband, dbN.toFixed(1));
        setParamInput(out.pEconLock, econLkN.toFixed(1));
        setParamInput(out.pMinOa, String(Math.round(p['min-oa-pos'])));
        out.uCoolSp.textContent   = tSuffix();
        out.uHeatSp.textContent   = tSuffix();
        out.uDeadband.textContent = dSuffix();
        out.uEconLock.textContent = tSuffix();
        out.pSpDiff.textContent   = spDiffN.toFixed(1) + ' ' + dSuffix();

        // Derived UNIT MODE rows. Each is arithmetic on numbers already on
        // the screen — read off `derived`, not off the display locals.
        const minOaFrac = Math.max(0, Math.min(1, p['min-oa-pos'] / 100));
        const economizing = d.oaFrac > minOaFrac + 0.02;
        out.dCall.textContent = d.stage > 0
            ? 'Cooling'
            : (d.hwFrac > 0 ? 'Heating' : 'Satisfied');
        // THREE states, not two. "At minimum" alone collapsed two
        // physically different reasons — the high limit (or the
        // differential) says no, versus permitted but nothing is calling —
        // into one string, on the row of the rail an economizer question
        // actually gets asked at. The lockout test is the negation of the
        // permit the shipped sheet implements (a fixed high limit ANDed
        // with a differential comparison), read off `derived` rather than
        // off the sensors, so a forced OAT does not rewrite it.
        out.dEcon.textContent = economizing
            ? 'Open'
            : ((d.oaT >= p['econ-lockout'] || d.oaT >= d.eatT) ? 'Locked out' : 'At minimum');
        out.dMech.textContent = d.stage === 0 ? 'Off' : ('Stage ' + d.stage);

        // ── FOGGING DISCLOSURE (codebase-issues #240) ─────────────────
        // `d.matFogging` is the physics half forwarding `mixStreams`' own
        // flag, not a proximity test on the published moisture — see the
        // publish site for why the two are not interchangeable.
        //
        // SUPPRESSED WHILE MAT IS FORCED, and that is the more faithful
        // behaviour rather than information loss. The marker and the note
        // are a disclosure ABOUT the number in the MAT well, and that well
        // paints the SENSED value; annotating a hand-entered 90 °F with a
        // saturation marker derived from a real 30 °F mixture says
        // something plainly untrue. A real front end told MAT is 90 °F
        // could not draw the marker either — this roster carries no
        // humidity point. Nothing is hidden from the reader: the override
        // state line names the held point on the same screen. Recomputing
        // the flag from the sensed dry-bulb was considered and rejected —
        // a sensed dry-bulb against a truth humidity ratio is a third
        // quantity that is neither, and it invents fog on a dry day.
        const matForced = !!(plant.override['mat'] && plant.override['mat'].active);
        const fogging = d.matFogging && !matForced;
        fogMark.classList.toggle('is-fogging', fogging);
        // The note is a `role="status"` region, so the TEXT has to move,
        // not just `hidden` — a live region that is merely revealed
        // announces nothing. The sentence is read off the element at bind
        // time so the copy lives in the markup, in one place, and the write
        // is guarded because this runs at 10 Hz (codebase-issues #229).
        if (fogging !== fogNoteOn) {
            fogNoteOn = fogging;
            fogNote.textContent = fogging ? fogNoteText : '';
            fogNote.hidden = !fogging;
        }

        // ── the fan blade + chevron bands ─────────────────────────────
        // Signed ΔT, measured on the CANONICAL delta against the two IP
        // trips — not on dtN above.
        const dt = datDeltaT(d);
        const heating = d.hwFrac > 0 && d.qHeat > 0;
        const cooling = d.capActive && dt <= COOL_DT_TRIP;
        // The band between the coils: warm once the heating coil is
        // actually putting heat into the air, otherwise still blended air.
        bandAfterHeat = heating ? 'heat' : 'mixed';
        // The discharge band answers "did anything happen to this air", and
        // it is what collapses to the dead grey when a unit stops working.
        // The heat arm is gated on the heating coil being LOADED, not on
        // the delta alone: the coil section is lagged (COIL_TAU) while the
        // mixed air is quasi-static, so dragging the weather cold makes
        // `dt` transiently large and POSITIVE with a shut valve and two
        // running compressors — which painted the discharge warm for a
        // couple of seconds. `heating` is the same term the band above
        // already reads, so this costs nothing.
        bandDischarge = cooling
            ? 'cool'
            : ((heating && dt >= HEAT_DT_TRIP) ? 'heat' : 'off');
        // Sole resume/suspend vector for the animation loop. renderUnit runs
        // on every hostTick and synchronously on every control interaction
        // via requestRender, so this one call covers the fan cycling on, a
        // tab switch back to Unit, the tab being un-hidden, and any preset
        // or slider change — no extra listeners needed.
        if (ahuAnimSync) ahuAnimSync();

        // ── verdict ladder ────────────────────────────────────────────
        // ORDERING RULES, all inherited from the FCU and all load-bearing:
        //  • AIRFLOW BRANCHES OUTRANK EVERYTHING. They read `airflowOn` —
        //    the physical fact — and use `fanCmd` only to word WHY the air
        //    stopped. A broken belt and a fan nobody asked for are the same
        //    hazard to a loaded coil and two different things to go look at.
        //  • IDLE IS NEUTRAL, not an alarm. A unit at rest is normal
        //    operation.
        //  • SIMULTANEOUS HEAT AND COOL outranks either coil's own verdict.
        //    It is the fault this machine exists to be able to show — the
        //    reason it carries two independent setpoints rather than one
        //    plus an offset — and both of the branches below it would
        //    otherwise describe half of it and sound reasonable.
        //  • SPECIFIC BEFORE GENERIC on a tie: the fault branches sit above
        //    the plain "no ΔT" branch, which both would also satisfy.
        //  • A BOUND THE MODEL IS SITTING ON OUTRANKS THE SYMPTOM IT
        //    PRODUCES. Both coils carry a clamp — COIL_FLOOR below,
        //    HW_LEAVE_MAX above — and a machine pinned against either one
        //    reports a delta that looks like a broken coil. Each clamp
        //    gets its own branch above the generic wording for its coil,
        //    or the ladder blames the equipment for physics.
        //  • THE ΔT TESTS ARE WRITTEN `>` AND `<`, NOT AS NEGATIONS. A
        //    non-finite delta must fall THROUGH them exactly as it does
        //    today; the negated form would catch it instead.
        //  • NO BRANCH INTERPOLATES A NUMBER. The verdict string is the
        //    one text surface with no display-unit conversion behind it,
        //    so it stays unit-free by construction.
        let cls, txt;
        if (!d.airflowOn && (d.stage > 0 || d.hwFrac > 0)) {
            cls = 'error';
            txt = d.fanCmd
                ? 'Fan commanded on but no air moving — a coil is loaded on dead air'
                : 'Coil loaded with the fan off — no air across an active coil';
        } else if (!d.airflowOn && d.fanCmd) {
            cls = 'error'; txt = 'Fan commanded on but no air moving — airflow proof is down';
        } else if (!d.airflowOn) {
            cls = '';      txt = 'Unit off — no air moving (idle)';
        } else if (d.stage > 0 && d.hwFrac > 0) {
            cls = 'error'; txt = 'Heating valve open under a running compressor — the unit is fighting itself';
        } else if (d.stage > 0 && d.fault === 'low-charge') {
            cls = 'error'; txt = 'No ΔT across the machine — low charge, not cooling';
        } else if (d.stage > 0 && d.matT < FREEZE_WATCH) {
            // ENTERING AIR ALREADY NEAR FREEZING. This branch sits ABOVE
            // the no-ΔT one because it names the same symptom's real
            // cause, and it is REACHABLE with the shipped program in
            // control — one drag of the outdoor-air slider to its −20 °F
            // floor permits the economizer, drives the damper to 100 %
            // and leaves a latched stage running on outdoor air. The
            // sheet carries no mixed-air low limit, which is the lesson.
            //
            // The band is exactly `matT < FREEZE_WATCH`, not a guess:
            // the DX coil's floor is COIL_FLOOR and the fan adds
            // FAN_HEAT, so the deepest delta a coil can produce on
            // entering air of `matT` is COIL_FLOOR + FAN_HEAT − matT,
            // which fails the COOL_DT_TRIP test for every matT below
            // COIL_FLOOR + FAN_HEAT − COOL_DT_TRIP = 38 = FREEZE_WATCH.
            // Below that the ceiling at the coil (a cooling coil cannot
            // leave warmer than it entered) pins the delta near zero and
            // the plain no-ΔT branch reads it as a dead compressor.
            cls = 'error';
            txt = 'Compressor running on air already near freezing — almost nothing left to take out';
        } else if (d.stage > 0 && dt > COOL_DT_TRIP) {
            cls = 'error'; txt = 'Compressor running with no ΔT — the coil is not cooling';
        } else if (d.stage > 0 && d.coilLeaveT <= FREEZE_WATCH) {
            cls = 'warn';  txt = 'Cooling — but the coil is running cold (freeze watch)';
        } else if (d.stage > 0) {
            cls = 'ok';    txt = 'Mechanical cooling — clear ΔT across the machine';
        } else if (d.hwFrac > 0 && dt < HEAT_DT_TRIP) {
            cls = 'error'; txt = 'Heating valve open with no ΔT — no heat reaching the air';
        } else if (d.hwFrac > 0 && d.afterHeatT >= HW_LEAVE_MAX - 0.1) {
            // THE HOT BOUND, and the mirror of the freeze watch below the
            // cooling branch. HW_LEAVE_MAX binds silently otherwise: at a
            // starved fan the coil absorbs a third less than the valve was
            // commanded and the machine still reports a clean green. The
            // clamp is `Math.max(mixState.tdb, HW_LEAVE_MAX)`, so on a day
            // already hotter than the water the ceiling sits at the
            // entering air and this test cannot fire.
            cls = 'warn';
            txt = 'Heating — the coil is at its leaving-air limit, so opening further adds nothing';
        } else if (d.hwFrac > 0) {
            cls = 'ok';    txt = 'Heating — clear ΔT across the machine';
        } else if (economizing) {
            cls = 'ok';    txt = 'Economizing — free cooling only, no mechanical stage';
        } else if (dt <= COOL_DT_TRIP || dt >= HEAT_DT_TRIP) {
            // Neither coil loaded, but the discharge has not caught up to
            // the mixed air yet — the coil-section lag again. Written with
            // `<=` / `>=` rather than a negation so a non-finite delta
            // falls THROUGH to the settled wording, per the ordering rule
            // above.
            cls = 'warn';  txt = 'Neither coil loaded — the discharge is still settling';
        } else {
            cls = 'warn';  txt = 'Fan running, neither coil loaded — no ΔT across the machine';
        }
        setVerdict(cls, txt);

        // ── sensor override display — the real-vs-sensed split ────────
        // The zone readout is the ACTUAL integrated zone. The override box
        // shows what the program READS for the SELECTED point: it mirrors
        // the live sensed value when that point is released (read-only) and
        // holds the forced value when it is held.
        zoneValLbl.textContent = 'zone ' + zoneN.toFixed(1) + t;
        ovrUnit.textContent = tSuffix();
        const sel = ovrSelect.value;
        const selOvr = plant.override[sel];
        const selActive = !!(selOvr && selOvr.active);
        if (!selActive) ovrInput.value = dispTempNum(truthFor(plant, sel)).toFixed(1);

        // The forced-sensor ring, and the state line that names every held
        // point — not just the selected one. A forced input that leaves no
        // mark is how a wrong number survives a shift change.
        const forced = [];
        GLYPHED.forEach(function (id) {
            const o = plant.override[id];
            const on = !!(o && o.active);
            if (sensorGroups[id]) sensorGroups[id].classList.toggle('is-forced', on);
            if (on) forced.push(pointLabel(id) + ' ' + dispTempNum(o.value).toFixed(1) + t);
        });
        setOvrState(forced.length
            ? 'Forced: ' + forced.join(' · ')
                + '. The program is sequencing on those numbers, not on the machine.'
            : '');
        ovrField.classList.toggle('is-forcing', forced.length > 0);
    }

    // The plant-side truth behind a sensed point — what the box shows while
    // that point is released. Keyed off `derived`, which is where every one
    // of these already lives.
    function truthFor(plant, id) {
        const d = plant.derived;
        if (id === 'oat') return d.oaT;
        if (id === 'rat') return d.eatT;
        if (id === 'mat') return d.matT;
        if (id === 'dat') return d.datT;
        return plant.zoneT;
    }

    // Short caption for the override state line. Reads out of the point
    // roster so a renamed point cannot leave a stale string here.
    function pointLabel(id) {
        for (let i = 0; i < AHU_POINTS.length; i++) {
            if (AHU_POINTS[i].id === id) return AHU_POINTS[i].name;
        }
        return id;
    }

    // ── hand controls — per-point: a RELEASED control (slot 8 NULL)
    // disables and TRACKS the resolved value; a HELD one is the user's.
    // ctx is the shell's extensible sync context; ctx.slot8(pointId) is the
    // probe (null = released), ctx.simSpeed() the live clock multiplier. ──
    function ahuSyncControls(plant, ctx) {
        // The stage group commands y1 AND y2 as one action, so the two
        // slots always move together; require BOTH null to read as released
        // anyway, so a divergence could never hide.
        const stageRel = ctx.slot8('y1') === null && ctx.slot8('y2') === null;
        const oadRel   = ctx.slot8('oa-damper') === null;
        const hwRel    = ctx.slot8('hw-valve') === null;
        const fanRel   = ctx.slot8('fan-speed') === null;
        const fanenRel = ctx.slot8('fan-enable') === null;

        // The NULL boxes mirror slot state — slot 8 is the single source of
        // truth, so a scenario's slot-8 write flips the box on the next
        // paint without extra wiring.
        nullStage.checked = stageRel;
        nullOad.checked   = oadRel;
        nullHw.checked    = hwRel;
        nullFan.checked   = fanRel;
        nullFanen.checked = fanenRel;

        oadSlider.disabled   = oadRel;
        hwSlider.disabled    = hwRel;
        fanSlider.disabled   = fanRel;
        fanenToggle.disabled = fanenRel;
        stageBtns.forEach(function (b) { b.disabled = stageRel; });

        // A released slider tracks the resolved command; a held one is the
        // user's (don't overwrite mid-drag).
        if (oadRel) oadSlider.value = String(plant.actuators['oa-damper']);
        if (hwRel)  hwSlider.value  = String(plant.actuators['hw-valve']);
        if (fanRel) fanSlider.value = String(plant.actuators['fan-speed']);
        fanenToggle.checked = !!plant.actuators['fan-enable'];

        // Stage buttons read the ADDITIVE count this unit uses — one
        // energized stage is one stage of capacity, whichever one it is —
        // so a sequence that energizes Y2 without Y1 shows as stage 1 here
        // rather than being silently promoted.
        const stg = (plant.actuators.y1 ? 1 : 0) + (plant.actuators.y2 ? 1 : 0);
        stageBtns.forEach(function (b) {
            const on = parseInt(b.getAttribute('data-stage'), 10) === stg;
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });

        oadSlider.setAttribute('aria-valuetext', plant.actuators['oa-damper'] + ' percent open');
        document.getElementById('ahu-oad-val').textContent = plant.actuators['oa-damper'] + '%';
        document.getElementById('ahu-hw-val').textContent  = plant.actuators['hw-valve'] + '%';
        document.getElementById('ahu-fan-sval').textContent = plant.actuators['fan-speed'] + '%';

        // The override toggle answers to the SELECTED point.
        const sel = ovrSelect.value;
        const o = plant.override[sel];
        const forcing = !!(o && o.active);
        ovrToggle.classList.toggle('active', forcing);
        ovrToggle.setAttribute('aria-pressed', forcing ? 'true' : 'false');
        ovrToggle.textContent = forcing ? 'Release' : 'Force sensor';
        ovrInput.disabled = !forcing;

        // ── environment / clock readouts. These sliders are always live —
        // they set the world, not the unit's outputs. Read FROM the knob
        // state, never write the slider value (would fight a drag). The
        // clock multiplier is SHELL state, so ctx.simSpeed() is the live
        // read and this readout can't hold a stale local mirror.
        speedValLbl.textContent = Math.round(ctx.simSpeed()) + '×';
        oaValLbl.textContent    = dispTempNum(plant.oaT).toFixed(0) + ' ' + tSuffix();
        loadValLbl.textContent  = Math.round(plant.qInternal) + ' Btu/h';

        // ── param rail writability ── a field is adjustable only while
        // the RUNNING sheet carries its const block. bindingTick skips a
        // missing block (the value freezes at its last read), so the
        // input disables — with a title saying why — rather than accept
        // an edit with nowhere to land. This is the honest depiction of
        // the existing freeze behaviour, not a new rule.
        PARAM_POINTS.forEach(function (pp) {
            const inp = out[pp.outKey];
            const writable = ctx.paramWritable(pp.id);
            if (inp.disabled !== !writable) {
                inp.disabled = !writable;
                if (writable) {
                    inp.removeAttribute('title');
                } else {
                    inp.title = 'The running sheet has no ' + pp.id
                        + ' block, so there is nothing to write — the value shown is the last one read.';
                }
            }
        });
    }

    // The graphic is a viewBox SVG at width:100% — it auto-scales into its
    // cell, so a fullscreen transition needs no unit-side reflow. Present
    // and doing nothing on purpose: the shell reaches this only on the
    // fullscreen edge, so a MISSING onResize is a latent TypeError rather
    // than a boot failure.
    function ahuOnResize() { /* no-op — SVG scales itself */ }

    // ── control wiring — hand moves write slot 8 through the host hooks;
    // the NULL boxes release it. Nothing here writes plant.actuators
    // directly — the resolver owns that. First unit method the shell calls,
    // so it resolves the DOM handles for the whole file. ──
    function ahuWireControls(pl, host) {
        bindDom();

        // Scenarios are operator writes: slot 8 on every output the
        // scenario touches (the NULL boxes re-sync from slot state on the
        // next paint), so the graphic tells are reachable without wiring a
        // program — and they stay put until released. Keys are the button's
        // `data-preset` (DOM-side, always lowercase); the `fault` value is
        // the PLANT vocabulary (kebab-case). The two are hand-mapped here on
        // purpose, which is what lets the buttons read as sentences without
        // pushing that wording into the model.
        //
        // ⚠ THE PLANT KNOWS THREE FAULTS — none | low-charge | fan-belt.
        // `capActive` gates on `fault === 'none'`, so ANY other string
        // collapses capacity with no distinct signature. The FCU has since
        // split its capacity fault into low-charge AND blocked-condenser;
        // this unit has not, so a fourth button here would silently get
        // low-charge behaviour.
        const SCENARIOS = {
            cooling:   { zone: 78, oa: 85, load: 8000,  dmp: 20,  hw: 0,   fan: 100, stage: 1, fault: 'none' },
            freecool:  { zone: 74, oa: 55, load: 8000,  dmp: 100, hw: 0,   fan: 100, stage: 0, fault: 'none' },
            heating:   { zone: 66, oa: 20, load: 2000,  dmp: 20,  hw: 60,  fan: 100, stage: 0, fault: 'none' },
            // The fault this machine exists to be able to show: two
            // setpoints dragged into each other, both coils commanded, ΔT
            // going nowhere and energy going everywhere. Nothing is broken.
            fighting:  { zone: 72, oa: 60, load: 8000,  dmp: 20,  hw: 70,  fan: 100, stage: 2, fault: 'none' },
            lowcharge: { zone: 78, oa: 85, load: 8000,  dmp: 20,  hw: 0,   fan: 100, stage: 2, fault: 'low-charge' },
            // The fan is COMMANDED here — that is the whole point. The belt
            // is what failed, so the command stands, the air stops and the
            // proof switch drops.
            belt:      { zone: 78, oa: 85, load: 8000,  dmp: 20,  hw: 0,   fan: 100, stage: 2, fault: 'fan-belt' },
        };

        presetBtns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                const s = SCENARIOS[e.currentTarget.getAttribute('data-preset')];
                if (!s) return;
                // Seed the zone and the weather as INITIAL CONDITIONS — the
                // loop carries them from here; a preset never jams a sensed
                // value.
                pl.zoneT = s.zone;
                pl.oaT = s.oa;
                pl.qInternal = s.load;
                oaSlider.value = String(s.oa);
                loadSlider.value = String(s.load);
                // A preset is a clean start: release every sensor override.
                GLYPHED.forEach(function (id) {
                    if (pl.override[id]) pl.override[id].active = false;
                });
                host.writeSlot8('oa-damper', s.dmp);
                host.writeSlot8('hw-valve', s.hw);
                host.writeSlot8('fan-speed', s.fan);
                host.writeSlot8('fan-enable', s.fan > 0);
                host.writeSlot8('y1', s.stage >= 1);
                host.writeSlot8('y2', s.stage >= 2);
                oadSlider.value = String(s.dmp);
                hwSlider.value = String(s.hw);
                fanSlider.value = String(s.fan);
                pl.conditions.fault = s.fault;
                host.requestRender();
            });
        });

        // Stage buttons — ONE control, TWO points. The count is ADDITIVE on
        // this unit, so "Stage 1" is y1 alone and "Stage 2" is both.
        stageBtns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                if (nullStage.checked) return;   // released — buttons are disabled anyway
                const s = parseInt(e.currentTarget.getAttribute('data-stage'), 10);
                host.writeSlot8('y1', s >= 1);
                host.writeSlot8('y2', s >= 2);
                host.requestRender();
            });
        });

        fanenToggle.addEventListener('change', function () {
            if (nullFanen.checked) return;
            host.writeSlot8('fan-enable', fanenToggle.checked);
            host.requestRender();
        });

        // The three analog hand controls. Same shape each: ignore the drag
        // while released, validate-and-mute the read, write slot 8.
        [[oadSlider, nullOad, 'oa-damper'],
            [hwSlider, nullHw, 'hw-valve'],
            [fanSlider, nullFan, 'fan-speed']].forEach(function (row) {
            row[0].addEventListener('input', function () {
                if (row[1].checked) return;
                const v = parseFloat(row[0].value);
                if (isFinite(v)) host.writeSlot8(row[2], v);
                host.requestRender();
            });
        });

        // ── NULL boxes — the release/take mechanics, BUMPLESS both ways.
        // Checking writes NULL to slot 8 (the BACnet relinquish idiom — the
        // point falls to the next non-null slot, no bump needed).
        // UNchecking seeds slot 8 with the point's CURRENT resolved value,
        // so the hand takes over exactly where the program left the point:
        // the control doesn't jump and the unit doesn't lurch. ──
        [[nullOad, 'oa-damper'], [nullHw, 'hw-valve'], [nullFan, 'fan-speed']]
            .forEach(function (row) {
                row[0].addEventListener('change', function () {
                    if (row[0].checked) host.releaseSlot8(row[1]);
                    else host.writeSlot8(row[1], pl.actuators[row[1]]);
                    host.requestRender();
                });
            });
        nullStage.addEventListener('change', function () {
            if (nullStage.checked) {
                host.releaseSlot8('y1');
                host.releaseSlot8('y2');
            } else {
                host.writeSlot8('y1', pl.actuators.y1 === true);
                host.writeSlot8('y2', pl.actuators.y2 === true);
            }
            host.requestRender();
        });
        nullFanen.addEventListener('change', function () {
            if (nullFanen.checked) host.releaseSlot8('fan-enable');
            else host.writeSlot8('fan-enable', pl.actuators['fan-enable'] === true);
            host.requestRender();
        });

        // ── Sensor override — force the value the PROGRAM reads, on any of
        // the five analog inputs. The plant's override map was already
        // keyed by sensor point id, so this is affordance, not physics.
        // The numeric box is display-unit-aware (°F internally, °C when the
        // site is in metric). ──
        function toDisplayTemp(f) {
            const U = window.Units;
            return U.current() === 'us' ? f : U.display.temp(f);
        }
        function fromDisplayTemp(disp) {
            const U = window.Units;
            return U.current() === 'us' ? disp : U.toCanonical.temp(disp);
        }
        ovrSelect.addEventListener('change', function () {
            host.requestRender();
        });
        ovrToggle.addEventListener('click', function () {
            const id = ovrSelect.value;
            const ov = pl.override[id];
            if (!ov) return;
            ov.active = !ov.active;
            if (ov.active) {
                // Start the force from the truth, so the first thing the
                // reader does is move a number away from where it was.
                ov.value = truthFor(pl, id);
                ovrInput.value = toDisplayTemp(ov.value).toFixed(1);
            }
            host.requestRender();
            if (ov.active) ovrInput.focus();
        });
        ovrInput.addEventListener('input', function () {
            const ov = pl.override[ovrSelect.value];
            if (!ov || !ov.active) return;
            const disp = parseFloat(ovrInput.value);
            if (!isFinite(disp)) return;     // validate-and-mute: ignore junk mid-type
            ov.value = fromDisplayTemp(disp);
            host.requestRender();
        });
        // Re-express the forced value in the current display units when the
        // site unit toggle flips — the render loop leaves the box alone
        // while forcing (so it can't clobber typing), so do it on the event.
        // The rail's min/max/step attributes re-express here too: the
        // shell's own unitschange repaint re-mirrors the input VALUES, but
        // attributes are wireControls' to keep.
        document.addEventListener('unitschange', function () {
            const ov = pl.override[ovrSelect.value];
            if (ov && ov.active) ovrInput.value = toDisplayTemp(ov.value).toFixed(1);
            PARAM_POINTS.forEach(function (pp) {
                railRangeAttrs(rosterPoint(pp.id), out[pp.outKey]);
            });
        });

        // ── the param rail — the operator-adjustable surface ───────────
        // Commit on Enter or focus-out, NEVER per keystroke: typing 74
        // must not pass through a momentary setpoint of 7. The 'change'
        // event is exactly that boundary (and covers the spinners, which
        // never fire mid-typing); Escape reverts the field to the live
        // value without committing. The write goes through
        // host.writeParam — the const block on the RUNNING sheet —
        // because plant.params is a per-tick block → plant mirror and a
        // direct write there is clobbered within one tick. Clamping
        // lives HERE: the roster owns min/max, the shell hook stays
        // dumb, and a clamp is ANNOUNCED on the rail's hint line — on a
        // real front end the rails are usually silent, but this is a
        // classroom (see the markup's rail note).

        // Display expression for a param value, per its conv — same
        // paths renderUnit paints through, so the field and the wells
        // cannot disagree about what a number looks like.
        function paramToDisplay(pt, v) {
            const U = window.Units;
            if (pt.conv === 'temp') return dispTempNum(v).toFixed(1);
            if (pt.conv === 'deltaTemp') {
                const d = U.current() === 'us' ? v : U.display.deltaTemp(v);
                return (Math.round(d * 10) / 10).toFixed(1);
            }
            return String(Math.round(v));
        }
        function paramToCanonical(pt, disp) {
            const U = window.Units;
            if (U.current() === 'us') return disp;
            if (pt.conv === 'temp') return U.toCanonical.temp(disp);
            if (pt.conv === 'deltaTemp') return U.toCanonical.deltaTemp(disp);
            return disp;
        }
        function paramSuffix(pt) {
            if (pt.conv === 'temp') return tSuffix();
            if (pt.conv === 'deltaTemp') return dSuffix();
            return pt.unit;
        }
        // min/max/step attributes in the CURRENT display units — they
        // drive the spinners and the browser's own cues; the committed
        // clamp below tests the CANONICAL value, so these are expression,
        // never the enforcement. Metric steps by 0.5 on the temperature
        // params: the authored 0.5 °F step converts to a 0.28 °C
        // non-number, and half a degree is what a metric front end walks
        // a setpoint by anyway.
        function railRangeAttrs(pt, inp) {
            inp.min = paramToDisplay(pt, pt.min);
            inp.max = paramToDisplay(pt, pt.max);
            inp.step = (pt.conv && window.Units.current() !== 'us')
                ? '0.5' : String(pt.step);
        }
        // The hint line — one aria-live region for the whole rail,
        // signature-aware: re-announcing the SAME clamp needs a genuine
        // DOM change, so an identical message blanks first and lands on
        // a beat. Auto-clears so a stale range note cannot sit under
        // later edits.
        let railHintTimer = null;
        function railHint(msg) {
            const el = out.paramsHint;
            if (railHintTimer !== null) { window.clearTimeout(railHintTimer); railHintTimer = null; }
            if (msg !== '' && el.textContent === msg) {
                el.textContent = '';
                window.setTimeout(function () { el.textContent = msg; }, 30);
            } else {
                el.textContent = msg;
            }
            if (msg !== '') {
                railHintTimer = window.setTimeout(function () {
                    el.textContent = '';
                    railHintTimer = null;
                }, 6000);
            }
        }
        function railRangeText(pt) {
            return paramToDisplay(pt, pt.min) + '–' + paramToDisplay(pt, pt.max)
                + ' ' + paramSuffix(pt);
        }
        PARAM_POINTS.forEach(function (pp) {
            const pt = rosterPoint(pp.id);
            const inp = out[pp.outKey];
            railRangeAttrs(pt, inp);

            function revert() {
                inp.value = paramToDisplay(pt, pl.params[pt.plantKey]);
            }
            function commit() {
                if (inp.disabled) return;
                const disp = parseFloat(inp.value);
                if (!isFinite(disp)) {
                    // Validate-and-revert: junk never reaches the sheet,
                    // and the hint names the range so the reader knows
                    // what the field takes.
                    revert();
                    railHint(pt.name + ' takes ' + railRangeText(pt)
                        + ' — reverted to the live value.');
                    return;
                }
                let v = paramToCanonical(pt, disp);
                let clamped = false;
                if (v < pt.min) { v = pt.min; clamped = true; }
                else if (v > pt.max) { v = pt.max; clamped = true; }
                host.writeParam(pp.id, v);
                // Re-express what actually committed — the mirror paint
                // skips a focused field, so the commit writes it here.
                inp.value = paramToDisplay(pt, v);
                // A clean commit does NOT clear the hint — the auto-clear
                // owns removal. Enter fires keydown AND the native
                // 'change', so a clamped commit is immediately followed
                // by an in-range re-commit of the clamped value; a clear
                // here would wipe the announcement it just made.
                if (clamped) {
                    railHint(pt.name + ' accepts ' + railRangeText(pt)
                        + ' — held at the limit.');
                }
            }
            inp.addEventListener('change', commit);
            inp.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    commit();
                } else if (e.key === 'Escape') {
                    revert();
                    e.stopPropagation();
                }
            });
        });

        // ── THE ACTIVATION AFFORDANCE (codebase-issues #227b) ──────────
        // Real HTML buttons OUTSIDE the SVG, because role="img" on the
        // graphic makes its whole subtree presentational: a focusable child
        // in there would be Tab-reachable and absent from the accessibility
        // tree at once. Dropping role="img" to expose the glyphs would
        // un-hide every duplicated <text> node in the drawing, which is
        // worse than the thing it fixes — so the affordance moved out here
        // and the glyphs kept their hover-only CSS link.
        //
        // Pressing one does two things: pulses that point's statusbar chip
        // through the shell's own hook (the FCU's glyph behaviour,
        // unchanged) and LATCHES the annotation the glyph feeds, which is
        // what a hover cannot do for a keyboard or touch reader.
        mirrorBtns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                const id = e.currentTarget.getAttribute('data-point');
                host.highlightChip(id);
                mirrorBtns.forEach(function (b) {
                    const on = b === e.currentTarget;
                    // The latch is exclusive, so `aria-pressed` is set in
                    // the SAME iteration as the class rather than from a
                    // second pass — one source of truth for the state, and
                    // the reason the border colour is not the only channel
                    // carrying it.
                    b.classList.toggle('is-active', on);
                    b.setAttribute('aria-pressed', String(on));
                });
                GLYPHED.forEach(function (g) {
                    if (calloutGroups[g]) calloutGroups[g].classList.toggle('is-hilite', g === id);
                });
            });
        });

        // ── Sim-clock speed (× real time) — always live; scales the whole
        // workbench clock through the host hook (binding + integrator). ──
        speedSlider.addEventListener('input', function () {
            const v = parseFloat(speedSlider.value);
            if (isFinite(v)) host.setSpeed(v);
            host.requestRender();
        });

        // ── Outdoor-air temp — °F-native slider, always live; the readout
        // converts for display. It writes plant.oaT, not a module-level
        // `let`: the weather belongs to the plant on this unit (see
        // ahuCreatePlant), which is what makes a fresh plant reproducible
        // and lets an engine-direct spec sweep it. ──
        oaSlider.addEventListener('input', function () {
            const v = parseFloat(oaSlider.value);
            if (isFinite(v)) pl.oaT = v;
            host.requestRender();
        });

        // ── Internal sensible load (Btu/h) — always live, same plant-side
        // rule as the weather. ──
        loadSlider.addEventListener('input', function () {
            const v = parseFloat(loadSlider.value);
            if (isFinite(v)) pl.qInternal = v;
            host.requestRender();
        });
    }

    // ── chevron ink ───────────────────────────────────────────────────
    // Every colour literal the animation writes lives HERE, in a
    // `.style.stroke =` assignment. That is not stylistic: the -fill family
    // is guarded by a census (tests/fill-token-misuse.spec.js) that counts
    // every reference to one in the source and fails on any that no sink
    // classifier accounts for — and a bare const holding one is exactly
    // such a reference. Writing the literal into the assignment
    // keeps the token classified as `stroke`, which is object paint and
    // therefore legal.
    //
    // The bands are the four things air can be on this machine:
    //   oa     outdoor air, not yet blended
    //   mixed  returned or blended but NOT yet conditioned — the one
    //          meaning --blue-cool carries on this drawing
    //   heat   the heating coil has put heat into it
    //   cool   the DX coil has taken heat out of it
    //   off    air that crossed the machine and nothing happened to it —
    //          the dead grey that IS the "no ΔT" tell
    function strokeChevron(el, band) {
        if (band === 'oa') el.style.stroke = 'var(--teal)';
        else if (band === 'mixed') el.style.stroke = 'var(--blue-cool)';
        else if (band === 'heat') el.style.stroke = 'var(--heat-fill)';
        else if (band === 'cool') el.style.stroke = 'var(--blue)';
        else el.style.stroke = 'var(--text-dim)';
    }

    // ── page-local animations (one rAF loop) ──────────────────────────
    // The fan blade and SIX chevron runs share ONE self-suspending rAF loop
    // rather than running seven apiece forever. House idiom:
    // flow-engine.js (#113) — hasWork() / `looping` / startLoop(). The loop
    // only runs while there is genuinely something to see: motion is
    // allowed, air is moving somewhere, the Unit pane is on screen, and the
    // tab is not hidden.
    //
    // ⚠ THIS IS A REWRITE OF THE FCU'S CHEVRON PAINTER, NOT A COPY, AND THE
    // TWO DIFFERENCES THAT FORCED IT ARE:
    //
    //  1. SPEED IS IN USER UNITS PER SECOND, NOT LOOPS PER SECOND. The FCU
    //     animates one closed recirculation loop, so a scalar `travel` in
    //     [0,1) at a fixed loops/sec is correct there. Six runs of DIFFERENT
    //     LENGTH at a fixed loops/sec would march at six visibly different
    //     speeds — the return run is four times the relief run, so its
    //     chevrons would crawl while the relief sprinted. Each run therefore
    //     advances by BASE_UPS · flow · dt / len, which is one shared speed
    //     through the whole machine.
    //
    //  2. THE RECOLOUR BOUNDARY IS AN ORDERED BAND LIST, NOT A SCALAR. The
    //     FCU has one boundary (the coil's leaving edge) and expresses it as
    //     `f < boundaryFrac ? A : B`, which cannot say "three bands". The MA
    //     run genuinely has two: it crosses the heating coil and then ends
    //     at the cooling coil's entering face. So a run carries
    //     [{frac, band}] sorted ascending and place() picks the LAST band
    //     whose frac <= f. The DX coil's own boundary is not on this list —
    //     it is the unrailed gap between the MA and SA rails, which is the
    //     honest way to draw a place where air changes identity.
    //
    // What ports VERBATIM from the FCU: the sample-once-into-table[]
    // construction with a central-difference tangent, the interpolating
    // place(), the `if (band !== m.band)` dirty check that keeps a stroke
    // write off the hot path, the paint()/paintedTravel static-repaint
    // guard, and the whole outer scheduling skeleton — which was already
    // run-agnostic, so six runs push six step closures and six static
    // closures into the existing arrays and there is still ONE rAF loop.
    function ahuInitAnim(pl) {
        const reduce = !!(window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        // Pull the pane's state rather than mirroring a flag out of
        // showTab: `switchTab` (ui.js) is what actually toggles .active, so
        // a mirrored flag would be a second source of truth.
        const unitPane = document.getElementById('tab-unit');

        const steps = [];     // per-frame step(dt) closures
        const statics = [];   // repaints for the suspended state

        // Fan-blade spin — speed tracks fan fraction; still when off. No
        // static counterpart: a suspended blade correctly holds its last
        // angle, and under reduced motion it is never written at all.
        if (fanBlade && !reduce) {
            const BASE = 360 / 0.8;   // deg/sec at 100 %
            let angle = 0;
            steps.push(function (dt) {
                angle = (angle + BASE * (pl.anim.fanFrac || 0) * dt) % 360;
                fanBlade.style.transform = 'rotate(' + angle.toFixed(2) + 'deg)';
            });
        }

        (function () {
            const SVG_NS = 'http://www.w3.org/2000/svg';
            const layer = document.getElementById('ahu-flow');
            if (!layer) return;

            const SPACING = 46;    // user units between chevrons — one duct width
            const BASE_UPS = 60;   // user units per second at 100 % of a run's flow

            // The six rails, with the FLOW each one carries and the bands it
            // paints. `flow` returns 0…1 and is what makes a run freeze —
            // per-run rather than a global gate, because a run with no flow
            // must be able to stand still while its neighbours march.
            //
            // ⚠ THE DELIBERATE ABSENCES ARE THESE FUNCTIONS, NOT A MISSING
            // RAIL. With the return damper shut, `rc` carries nothing and its
            // chevrons stop dead in the drop — which is the depiction's own
            // rule that no flow mark belongs there. With the damper wide
            // open, `rc` stops and `ea` runs: every cubic foot of return air
            // leaves through the relief.
            const RUNS = [
                {
                    path: 'ahu-centerline-oa',
                    flow: function (d) { return (pl.anim.fanFrac || 0) * d.oaFrac; },
                    bands: function () { return [{ frac: 0, band: 'oa' }]; },
                },
                {
                    path: 'ahu-centerline-ra',
                    flow: function () { return pl.anim.fanFrac || 0; },
                    bands: function () { return [{ frac: 0, band: 'mixed' }]; },
                },
                {
                    path: 'ahu-centerline-rc',
                    flow: function (d) { return (pl.anim.fanFrac || 0) * (1 - d.oaFrac); },
                    bands: function () { return [{ frac: 0, band: 'mixed' }]; },
                },
                {
                    path: 'ahu-centerline-ea',
                    flow: function (d) { return (pl.anim.fanFrac || 0) * d.oaFrac; },
                    bands: function () { return [{ frac: 0, band: 'mixed' }]; },
                },
                {
                    // The one two-band run: mixed air up to the heating
                    // coil's LEAVING edge (x476), then whatever the heating
                    // coil made of it up to the cooling coil's entering face.
                    path: 'ahu-centerline-ma',
                    flow: function () { return pl.anim.fanFrac || 0; },
                    boundary: { x: 476, y: 302 },
                    bands: function (d, bf) {
                        return [{ frac: 0, band: 'mixed' }, { frac: bf, band: bandAfterHeat }];
                    },
                },
                {
                    path: 'ahu-centerline-sa',
                    flow: function () { return pl.anim.fanFrac || 0; },
                    bands: function () { return [{ frac: 0, band: bandDischarge }]; },
                },
            ];

            RUNS.forEach(function (spec) {
                const rail = document.getElementById(spec.path);
                if (!rail) return;

                // Sample ONCE at init: getTotalLength() once, then one
                // getPointAtLength per ~3 user units into a flat table of
                // {x, y, ang}. Nothing calls getPointAtLength per frame —
                // that is the whole point of the table, and the same economy
                // the data-flow-static assertion buys flow-engine.js.
                const len = rail.getTotalLength();
                const n = Math.max(8, Math.round(len / 3));
                const raw = [];
                let i;
                for (i = 0; i <= n; i++) raw.push(rail.getPointAtLength(len * i / n));
                const table = [];
                for (i = 0; i <= n; i++) {
                    const a = raw[Math.max(0, i - 1)];
                    const b = raw[Math.min(n, i + 1)];
                    table.push({ x: raw[i].x, y: raw[i].y, ang: Math.atan2(b.y - a.y, b.x - a.x) });
                }

                // A boundary is a POINT in viewBox coordinates, converted to
                // a path fraction once by nearest-sample search — same
                // conversion the FCU does, run in a loop instead of inline.
                let boundaryFrac = 0;
                if (spec.boundary) {
                    let bestD = Infinity;
                    for (i = 0; i <= n; i++) {
                        const dx = table[i].x - spec.boundary.x;
                        const dy = table[i].y - spec.boundary.y;
                        const dd = dx * dx + dy * dy;
                        if (dd < bestD) { bestD = dd; boundaryFrac = i / n; }
                    }
                }

                const count = Math.max(2, Math.floor(len / SPACING));
                const marks = [];
                let k;
                for (k = 0; k < count; k++) {
                    const el = document.createElementNS(SVG_NS, 'path');
                    el.setAttribute('d', 'M-5 -5 L2 0 L-5 5');
                    el.setAttribute('class', 'ahu-chevron');
                    layer.appendChild(el);
                    marks.push({ el: el, base: k / count, band: '' });
                }

                let travel = 0;
                let paintedTravel = null;
                let paintedBands = null;

                function bandAt(bands, f) {
                    let pick = bands[0].band;
                    for (let j = 0; j < bands.length; j++) {
                        if (f >= bands[j].frac) pick = bands[j].band;
                    }
                    return pick;
                }

                function place(m, bands) {
                    const f = (m.base + travel) % 1;
                    const fp = f * n;
                    const i0 = Math.min(n, Math.floor(fp));
                    const i1 = Math.min(n, i0 + 1);
                    const frac = fp - i0;
                    const s0 = table[i0];
                    const s1 = table[i1];
                    const x = s0.x + (s1.x - s0.x) * frac;
                    const y = s0.y + (s1.y - s0.y) * frac;
                    m.el.setAttribute('transform',
                        'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') rotate('
                        + (s0.ang * 180 / Math.PI).toFixed(1) + ')');
                    const band = bandAt(bands, f);
                    if (band !== m.band) { strokeChevron(m.el, band); m.band = band; }
                }

                // Static repaint for the suspended state. Colour is the job
                // that makes it necessary: a frozen stream on the Wiresheet
                // tab still has to re-tint when a coil cycles behind it.
                // Repaint from the CURRENT travel, never from 0, or a
                // suspended stream would snap back to its starting positions
                // on a colour change. Placement rides along, because a
                // chevron ships with a `d` and no `transform` and would
                // otherwise sit at the SVG origin.
                const paint = function () {
                    const bands = spec.bands(pl.derived, boundaryFrac);
                    const sig = bands.map(function (b) { return b.frac + ':' + b.band; }).join('|');
                    if (paintedTravel === travel && paintedBands === sig) return;
                    paintedTravel = travel;
                    paintedBands = sig;
                    marks.forEach(function (m) { place(m, bands); });
                };
                statics.push(paint);
                paint();

                if (reduce) return;

                steps.push(function (dt) {
                    const d = pl.derived;
                    const v = spec.flow(d);
                    if (v > 0) travel = (travel + BASE_UPS * v * dt / len) % 1;
                    // Placement still runs at zero flow: a stopped run has to
                    // follow a band change (a compressor cycling while the
                    // damper is shut), and place() is idempotent, so a frozen
                    // run costs one transform write it was going to make
                    // anyway.
                    const bands = spec.bands(d, boundaryFrac);
                    marks.forEach(function (m) { place(m, bands); });
                });
            });
        })();

        let looping = false;
        let lastT = null;

        // Under reduced motion nothing pushes a step, so `steps.length` is
        // the reduced-motion gate too — no second matchMedia read.
        // The flow gate is the UNION of the runs: air moving anywhere is
        // work. Per-run zero-flow is handled inside each step closure, which
        // is what keeps a stopped relief branch from suspending the loop the
        // supply branch still needs.
        function hasWork() {
            if (!steps.length) return false;
            if (!((pl.anim.fanFrac || 0) > 0)) return false;
            if (unitPane && !unitPane.classList.contains('active')) return false;
            return !document.hidden;
        }

        function startLoop() {
            if (looping || !hasWork()) return;
            looping = true;
            lastT = null;   // a long suspension must not bill its gap as dt
            requestAnimationFrame(frame);
        }

        function frame(t) {
            if (!hasWork()) { looping = false; return; }
            if (lastT === null) lastT = t;
            const dt = Math.min(0.1, (t - lastT) / 1000);
            lastT = t;
            for (let i = 0; i < steps.length; i++) steps[i](dt);
            requestAnimationFrame(frame);
        }

        function paintStatic() {
            for (let i = 0; i < statics.length; i++) statics[i]();
        }

        ahuAnimSync = function () {
            if (hasWork()) startLoop();
            else paintStatic();
        };
        ahuAnimSync();
    }

    // ── the unit factory — the interface the shell calls through ──
    function create(cfg) {
        return {
            id: 'ahu', prefix: 'ahu',
            points: AHU_POINTS,
            programs: cfg.programs,
            programLabels: cfg.programLabels,
            defaultProgram: cfg.defaultProgram,
            canvasSize: cfg.canvasSize,
            speedDefault: SPEED_DEF,             // sim-clock prefs the shell reads
            maxDtSim: MAX_DT_SIM,
            createPlant: ahuCreatePlant,
            update: ahuUpdate,
            renderUnit: ahuRenderUnit,
            syncControls: ahuSyncControls,
            onResize: ahuOnResize,
            initAnim: ahuInitAnim,
            wireControls: ahuWireControls,
        };
    }

    return {
        create: create,
        // The headless physics surface — DOM-free by construction (see the
        // PHYSICS banner); what an engine-direct spec drives.
        createPlant: ahuCreatePlant,
        update: ahuUpdate,
        points: AHU_POINTS,
    };
})();

if (typeof window !== 'undefined') { window.DDCWAhuUnit = DDCWAhuUnit; }
