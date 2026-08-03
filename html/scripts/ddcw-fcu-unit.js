// ──────────────────────────────────────────────────────────────────────
// ddcw-fcu-unit.js — the DX FAN COIL unit for the DDC Workbench: the
// unit-specific half extracted from simulators/ddc-workbench-fcu.html.
// Physics (a closed-loop lumped-capacitance zone on a two-stage DX
// coil), the FCU point list, and the fcu-* graphic + hand controls —
// everything the shell (/scripts/ddcw-shell.js) reaches only through
// the unit contract documented in ITS header.
//
// Loaded as a *classic* script (no type="module"), same convention as
// /scripts/ddcw-shell.js — see that header for the consuming page's
// full script order. Requires /scripts/psychro-engine.js loaded first
// (Psychro + P_STD are read at load for the `P` constant). The 11ty
// build copies this file through unchanged.
//
// FILE LAYOUT — two banners, and the split is load-bearing:
//
//   PHYSICS (DOM-free): constants, the TUNE BY FEEL block, plant
//       factory, the psychrometric coil + zone integrator, and the
//       point list. NOTHING above the DOM banner reads `document` or
//       `window`, so a vm context that has loaded psychro-engine.js
//       can load this file and drive plant-in/plant-out physics
//       headless (the fbe-engine.spec.js loader pattern).
//   DOM (graphic + controls): every element handle is resolved inside
//       bindDom(), called from wireControls — never at load. The
//       shell's boot order (createPlant → wireControls → initAnim →
//       first renderUnit/syncControls) is what makes that safe.
//
// API (window.DDCWFcuUnit):
//
//   DDCWFcuUnit.create(cfg) → the unit object the shell consumes
//       (DDCWShell.createWorkbench(unit)). cfg supplies the pieces
//       that live with the PAGE, because the page is where the sheet
//       layout is decided (and where two engine-direct specs read the
//       program literals from — see the page's assembly IIFE):
//         programs       { key → FBE graph literal }
//         programLabels  { key → picker option label }
//         defaultProgram the key booted + selected on arrival
//         canvasSize     { w, h } wiresheet bounds the layouts assume
//       Everything else — points, physics, render/controls methods,
//       sim-clock prefs — is this file's.
//
//   Headless physics surface (for engine-direct specs; no DOM):
//       DDCWFcuUnit.createPlant()            → a fresh plant
//       DDCWFcuUnit.update(plant, dtSim)     → integrate one step
//       DDCWFcuUnit.zoneInletState(t)        → coil-inlet psych state
//       DDCWFcuUnit.POINTS                   → the FCU point list
//
// BINDING INVARIANT (shared with the shell): a point's id === the seed
// FBE-block id in every program === the IO block the programs author.
// The sample programs live in the page; their block ids must match
// POINTS ids exactly, or the binding driver skips the point. One
// deliberate gap: a DISPLAY-ONLY sensor may ship before any sheet
// authors its block — the driver's skip makes that safe (chip live,
// sheets untouched). `rat` is the standing case, exempted by name in
// tests/ddcw-fcu-unit.spec.js until a program consumes it.
//
// Display: internal model is canonical IP (°F, Btu/h); everything
// converts at the display boundary through the shell's Units statics
// (DDCWShell.dispTempNum / tSuffix / dSuffix — codebase-issues #218),
// so the graphic, the readout grid, the chip strip and the off-program
// window all share ONE conversion path. THRESHOLDS STAY ON THE
// CANONICAL SIDE OF THAT BOUNDARY: a verdict or a paint gate compares
// a value off `derived` against an IP constant — never a display
// number against a bare literal, which silently makes the threshold
// mean °C for half the readers (codebase-issues #224). Display numbers
// exist to be PAINTED; decisions read the plant. A second unit module
// inherits this rule.
//
// Consumers: simulators/ddc-workbench-fcu.html (assembles the unit
// object and calls DDCWShell.createWorkbench).
// Tests: tests/ddcw-fcu-unit.spec.js pins the physics invariants
// engine-direct (directions, orderings, clamp bands, contract shapes —
// never feel-constant values); tests/ddc-workbench-fcu.spec.js +
// tests/ddc-workbench-fcu-priority.spec.js drive the built page; the
// program literals this unit runs are swept engine-direct by
// tests/fbe-engine.spec.js and tests/fbe-geometry.spec.js (both load
// FCU_PROGRAMS from the page file).
// ──────────────────────────────────────────────────────────────────────

'use strict';

const DDCWFcuUnit = (function () {
    'use strict';

    // ═══════════════════════ PHYSICS — DOM-free ═══════════════════════
    // Nothing in this half reads `document` or `window`. Keep it that
    // way: the headless physics surface is the vm-spec seam.

    // ── Rough constants (noted for the reviewer) ──────────────────────
    // A ~1.5-ton DX fan coil. Internal model is IP (°F); converted at
    // the display boundary via window.Units. Cooling capacity is a
    // per-stage SENSIBLE + latent load fed to Psychro.invertProcess,
    // which solves the leaving-air state — so lower fan speed (less air
    // over the same load) genuinely deepens the coil ΔT (more negative,
    // displayed signed as leaving minus entering), and a fault that
    // zeroes the load collapses it toward zero.
    const NOMINAL_CFM = 600;                 // CFM at 100% fan
    const STAGE_QSENS = { 1: 7000, 2: 13500 };   // Btu/h sensible
    const STAGE_QLAT  = { 1: 1500, 2: 3000 };    // Btu/h latent
    const RA_RH       = 50;                  // % — assumed return-air RH
    const FAN_HEAT    = 0.6;                 // °F picked up across the fan
    const COIL_FLOOR  = 34;                  // °F leaving-air clamp (freeze floor)
    // "The coil is doing real work" line — SIGNED (leaving minus
    // entering, so cooling is negative). It gates BOTH the downstream
    // air colour and the no-ΔT verdict, and both read it against the
    // CANONICAL delta below, never the displayed one: the badge number
    // is display-unit (°C in metric), so a bare −3 there is a −3 °C ≈
    // −5.4 °F threshold for a metric reader and a healthy 4 °F coil
    // paints "no ΔT" (codebase-issues #224). The flip side is the
    // intended one and looks odd until you know why: a metric reader
    // now sees "Cooling — clear ΔT" beside a −2.0 °C badge, because
    // the trip is −3 °F ≡ −1.7 °C. That is the house policy's own
    // shape — the engine computes in IP and converts at the display
    // boundary — so do not "fix" it back to a °C-looking number.
    const COOLING_DT_TRIP = -3;              // °F — signed DAT − EAT
    // The canonical delta those gates compare. Same operand pair the
    // badge paints (DAT − EAT, fan heat included), straight off
    // `derived` in °F — no Units round trip, so a units toggle can
    // move the NUMBER on screen and never the diagnosis. Callable only
    // AFTER fcuUpdate has filled the bag: `derived.datT` / `.eatT` are
    // assigned at the end of that function, so calling this from inside
    // it (or on a pre-first-update plant, whose `derived` is `{}`)
    // returns NaN.
    function datDeltaT(d) { return d.datT - d.eatT; }
    // DAT low-limit annunciator thresholds — the unit-side mirror of the
    // trip/clear constants the cool-2stage-safeties program carries in
    // its lowlim/hilim const blocks, and the same 42 °F line the
    // freeze-watch verdict already draws (coilLeaveT <= 42 below). The
    // unit tracks this as an OBSERVATION of the plant (a low-limit
    // annunciator on the graphic), independent of which program runs —
    // which is exactly why the verdict line it feeds must never assert
    // WHO cut the stages: on an unprotected sheet a dive can over-cool
    // the zone until the THERMOSTAT cuts the stages while the latch is
    // still inside its clear lag, and the same branch paints for that
    // window (~18 sim-s at 1×; measured, not hypothetical). The line
    // therefore speaks in the annunciator's own observation register —
    // latched, stages off, fan moving air — true whichever logic
    // dropped the stages. Only the safeties sheet holds them off for
    // the whole recovery, and that behavioral contrast is the lesson.
    const DAT_LOW_TRIP  = 42;                // °F — latches below this
    const DAT_LOW_CLEAR = 52;                // °F — releases above this
    const P           = P_STD;               // psia (from psychro-engine)

    // ══ TUNE BY FEEL — PLACEHOLDER zone-thermal constants ══════════════
    // First-cut guesses for the closed-loop zone model. The owner
    // commissions these live on the preview — they are meant to be
    // trivially findable and changed, so DON'T agonize over them. Internal
    // model is IP (Btu/h, °F); the zone is one lumped-capacitance node.
    //   Sizing intent (default 80 °F day): total gain (~4.2 kBtu/h) sits
    //   below stage 1 (~6.7 kBtu/h delivered), so stage 1 pulls the zone
    //   down to setpoint and cycles on the deadband — the "it's working"
    //   baseline. Crank T_OA or the load knob past stage-1 capacity and the
    //   ladder climbs to stage 2 (13.5 kBtu/h), over-cools, and cycles the
    //   ladder — the strained "can't-keep-up" story. C_ZONE sets the pace:
    //   ~200 gives a ~13 min zone time constant, so at 20× a recovery plays
    //   in ~40 s and at 60× in ~15 s; at 1× it runs in real building time.
    const C_ZONE      = 200;                 // Btu/°F — lumped zone capacitance (bigger = slower)
    const UA_ENV      = 300;                 // Btu/(h·°F) — envelope conductance to outdoor air
    const Q_INT_DEF   = 3000;                // Btu/h — default internal sensible gain (load knob)
    const T_OA_DEF    = 80;                  // °F — default outdoor-air temp (moderate day)
    const COIL_TAU    = 30;                  // s — coil thermal + DAT sensor/filter response (bigger = slower ramp)
    const SPEED_DEF   = 20;                  // × — default sim-clock multiplier (1× ≈ real time)
    const SPEED_MIN   = 1;                   // × — slowest (watch a 5 s ON-delay in real seconds)
    const SPEED_MAX   = 60;                  // × — fastest (fast-forward a slow recovery)
    const MAX_DT_SIM  = 5;                   // s — per-tick sim-time clamp (forward-Euler safety)
    // Airflow proof make-delay. A real duct-pressure proof switch is
    // slow to make and fast to break; this is the make side. The break
    // side is not a constant — loss of airflow drops the switch on the
    // very next tick, which is the asymmetry the sequence has to be
    // written around. Same value the AHU carries, and for the same
    // reason: it is long enough to WATCH at 1× and short enough not to
    // stall the arrival state at the default 20×.
    const PROOF_MAKE_DELAY = 8;              // s of continuous airflow before fan-status makes
    // ═══════════════════════════════════════════════════════════════════

    // Live commissioning knobs — start at the placeholders above; the OA
    // and load sliders write these, the speed slider writes the shell's
    // simSpeed via the host hook.
    let tOa       = T_OA_DEF;                // °F — outdoor-air temp (envelope driver)
    let qInternal = Q_INT_DEF;               // Btu/h — internal sensible gain

    // ── plant — the FCU's data-driven IO surface (unit-specific keys) ──
    function fcuCreatePlant() {
        // Arrival: zone 76 °F with SP 72 / deadband 3 puts the cool-2stage
        // program on Y1 (fan on, ΔT visible) the moment the loop starts —
        // so the page shows the program running the unit immediately. The
        // loop is CLOSED: zoneT is the integrated truth; space-temp is the
        // sensed value the program reads (= zoneT unless overridden).
        // The seeded actuator values only cover the instant before the
        // first bindingTick — from then on the resolver overwrites them
        // every tick (they match what cool-2stage commands on arrival,
        // so nothing visibly changes hands).
        return {
            sensors:    {
                'space-temp': 76, 'dat': 55, 'rat': 76,   // rat = zoneT on arrival (a return probe reads the zone's own air)
                'fan-status': false,         // proof has not made yet — it takes airflow plus time
            },
            actuators:  { 'fan-speed': 100, 'fan-enable': true, 'y1': true, 'y2': false },
            params:     { 'cooling-setpoint': 72, 'deadband': 3 },
            // Fault vocabulary is KEBAB-CASE, matching ddcw-ahu-unit.js:
            // the two unit modules have to speak one language before a
            // unit selector puts them behind one picker. That parity is
            // the whole reason — the site's kebab-case rule governs
            // element ids and the JS that references them, not an
            // arbitrary model enum, so it is not what settles this.
            //
            // `blocked-condenser` and `fan-belt` are DIFFERENT failures
            // in this model and the names have to keep them apart: under
            // `blocked-condenser` the capacity goes and the AIR KEEPS
            // MOVING at the commanded cfm (proof stays made), while
            // `fan-belt` stops the air with the command still standing.
            // The name says condenser because that is the failure this
            // arm actually computes — heat rejection gone, indoor
            // airflow untouched. It was briefly `blocked-coil`, which
            // taught the diagnostic backwards: read bare, a blocked coil
            // on a fan coil is the evaporator, and that failure cuts cfm
            // and drives the coil ΔT FURTHER NEGATIVE — a bigger split
            // across the air that still gets through — rather than to
            // zero. (Signed ΔT throughout this module: cooling is
            // negative, so "further negative" is more cooling per pound
            // of air, not less. See the verdict ladder's note.) Owner
            // ruled the label wrong, not the physics
            // (codebase-issues #246).
            conditions: { fault: 'none' },   // none | low-charge | blocked-condenser | fan-belt (observe-only)
            derived:    {},
            anim:       { fanFrac: 1 },
            // ── closed-loop thermal state ──
            zoneT:      76,                  // °F — the integrated REAL zone temp (truth)
            // zoneW:   0.0094,              // lb/lb — future latent state; NOT integrated
            //                                  this session (see the RH-ready seam in fcuUpdate)
            coilLeaveT: undefined,           // °F — first-order-lagged coil leaving-air; seeded to
            //                                  its quasi-static target on the first tick (no page-load ramp)
            // Airflow proof state — `elapsed` is seconds of CONTINUOUS
            // airflow, reset to zero the instant airflow stops.
            proof:      { made: false, elapsed: 0 },
            override:   { spaceTemp: { active: false, value: 76 } },
            // DAT low-limit annunciator state (see the DAT_LOW_* consts):
            // hysteresis-latched on the SENSED discharge temp so the
            // verdict can report the annunciator.
            lowLimit:   { latched: false },
            simSec:     0,                   // accumulated sim-seconds (clock readout hook)
        };
    }

    // ── coil inlet (RH-ready seam) ── built from the ACTUAL zone air in
    // ONE place. Today RH is a fixed assumption (RA_RH). When a latent zone
    // state (plant.zoneW) lands, swap this body to
    // Psychro.buildState(t, plant.zoneW, P) — with RA_RH derived from zoneW
    // — and add the matching Euler line for zoneW on qLat below. One
    // call-site changes.
    function zoneInletState(t) {
        return Psychro.solveState('rh', t, RA_RH, P);
    }

    // ── physics — reads `plant`, not the DOM (renderUnit does the paint).
    //    `dt` is the shared, speed-scaled, clamped sim step (seconds). ──
    function fcuUpdate(plant, dt) {
        const zoneT  = plant.zoneT;                   // °F — the REAL zone temp (truth)
        const fanPct = plant.actuators['fan-speed'];  // %
        const d = plant.derived;

        // Validate-and-mute: if a read isn't finite, blank on render.
        if (!isFinite(zoneT) || !isFinite(fanPct)) { d.invalid = true; return; }
        d.invalid = false;

        const fanFrac = fanPct / 100;
        // Y2-implies-Y1 interlock, FCU-local: a Y2 call is always stage 2.
        const stage = plant.actuators.y2 ? 2 : (plant.actuators.y1 ? 1 : 0);
        // ── airflow gating — three DIFFERENT things, named apart ──
        // fanCmd is what the sequence asked for (fan-enable is a real BO
        // gate, not speed>0 alone). airflowOn is whether air actually
        // moves. fan-status (published below) is PROOF — what a
        // duct-pressure switch reports back, which lags the truth on the
        // way up and matches it on the way down. Every line of physics
        // below gates on airflowOn, never on fanCmd: that gap IS the
        // belt fault. Only `fan-belt` stops the air; `blocked-condenser`
        // is named separately because it kills the heat transfer while
        // the air keeps moving.
        const fanCmd    = !!plant.actuators['fan-enable'] && fanPct > 0;
        const fault     = plant.conditions.fault;
        const airflowOn = fanCmd && fault !== 'fan-belt';
        const capActive = stage > 0 && airflowOn && fault === 'none';
        const cfm = Math.max(50, NOMINAL_CFM * fanFrac);

        // Coil leaving-air TARGET (quasi-static) via the shared psychro
        // solver, on the ACTUAL return air (never the sensed value).
        const inlet = zoneInletState(zoneT);
        let coilLeaveTarget = inlet.ok ? inlet.tdb : zoneT;
        let leavingW = inlet.ok ? inlet.W : 0;
        if (airflowOn && inlet.ok) {
            // The solve and BOTH clamps live inside `capActive`. A
            // de-energized DX coil is a passive heat exchanger — air
            // crosses it and comes out where it went in — so a
            // capacity-free branch must not run the freeze floor over
            // it. (The AHU learned this the hard way: with the clamps
            // outside, two dead compressors on a design-cold morning
            // painted a +55 °F rise.)
            //
            // On the FCU this nesting is NOT the only thing preventing
            // that, and the comment says so rather than overclaiming:
            // the entering-air CEILING below independently undoes any
            // lift the floor applies, and the zone balance clamps zoneT
            // to 40 °F besides, so a sub-floor inlet is not reachable
            // from the UI at all. Measured by mutation — the spec row
            // covering this only reddens when the nesting AND the
            // ceiling both go. It earns its keep for two other reasons:
            // it spares a psychro solve on every tick the compressor is
            // off (this page paints at 10 Hz), and it keeps the two unit
            // modules one shape — on the AHU, where this coil sits
            // downstream of a hot-water coil, the nesting genuinely is
            // load-bearing on its own.
            if (capActive) {
                const cooled = Psychro.invertProcess(inlet, {
                    type: 'cool', cfm: cfm,
                    qSens: STAGE_QSENS[stage], qLat: STAGE_QLAT[stage],
                });
                // A failed inversion means the load-per-cfm drove the
                // solve past bone-dry: a coil that ran out of AIR, not
                // one that stopped cooling. So fall back to the floor,
                // not to the entering air — the latter handed a RUNNING
                // coil a zero ΔT, which is this model's own signature
                // for a faulted compressor, and made the ΔT non-monotone
                // in airflow (one step of the fan slider took DAT from
                // 34 °F to 76 °F and turned the DX coil into a heater —
                // codebase-issues #237).
                if (cooled.ok) { coilLeaveTarget = cooled.tdb; leavingW = cooled.W; }
                else coilLeaveTarget = COIL_FLOOR;
                // The DX coil's two bounds. FLOOR: an evaporator cannot
                // drive air below freezing without icing over. CEILING:
                // a cooling coil cannot leave WARMER than the air it was
                // handed — which is also what keeps the floor harmless
                // on entering air already below it (the floor raises,
                // the ceiling puts it straight back).
                if (coilLeaveTarget < COIL_FLOOR)   coilLeaveTarget = COIL_FLOOR;
                if (coilLeaveTarget > inlet.tdb)    coilLeaveTarget = inlet.tdb;
                // Keep the leaving MOISTURE coherent with the clamped
                // temperature. invertProcess solved W at the unclamped
                // (colder) point, where saturation holds far less water,
                // so a clamped coil would publish a 34 °F dry-bulb
                // against a far colder dew point. This one is NOT
                // display-only on the FCU: leavingW feeds the supply
                // state the zone balance measures qCool from, below.
                const wSat = satHumRatio(coilLeaveTarget, P);
                if (leavingW > wSat) leavingW = wSat;
            }
        } else {
            coilLeaveTarget = zoneT;   // no airflow — nothing crosses the coil
            leavingW = inlet.ok ? inlet.W : 0;
        }

        // First-order lag on the coil leaving-air temp (forward-Euler, same
        // idiom as the zone). The coil metal + refrigerant have thermal mass
        // and the DAT sensor/AI filters besides, so the leaving temp RAMPS to
        // its target instead of stepping — and when the compressor stops the
        // cold coil keeps cooling briefly (residual cooling) as the target
        // jumps back to zoneT. Seed to the target on the first tick so
        // arrival is already at steady state; the Math.min(1, …) guards
        // against overshoot when dt is large. Runs every tick (even fan-off)
        // so plant.coilLeaveT stays continuous.
        if (!isFinite(plant.coilLeaveT)) plant.coilLeaveT = coilLeaveTarget;
        if (isFinite(dt)) {
            plant.coilLeaveT += (coilLeaveTarget - plant.coilLeaveT) * Math.min(1, dt / COIL_TAU);
        }
        const coilLeaveT = plant.coilLeaveT;   // the lagged value drives datT + Q_cool

        // Discharge sensor sits after the fan (draw-through pickup), off the
        // LAGGED coil temp so the delivered cooling ramps in too.
        //
        // KEEP the no-airflow branch. With no air moving, DAT reads the
        // ZONE — which is exactly what makes a discharge low-limit go
        // BLIND the moment the air stops (codebase-issues #225). The
        // fan-status BI is what a correct sequence interlocks on
        // instead, and this branch is what makes the difference between
        // the two demonstrable. Note it gates on airflowOn, so a broken
        // belt blinds the probe while the fan command still stands.
        const datT = airflowOn ? coilLeaveT + FAN_HEAT : zoneT;
        // Fed back into the program's `dat` AI next tick (a discharge
        // low-limit hook).
        plant.sensors['dat'] = datT;

        // DAT low-limit annunciator — the same trip/clear hysteresis the
        // safeties program's latch runs, tracked plant-side so the
        // verdict can report the state. With the fan off, datT reads the
        // zone and the latch self-clears — which is also why the fan-off
        // branches outrank the annunciator line in the verdict ladder.
        if (datT < DAT_LOW_TRIP) plant.lowLimit.latched = true;
        else if (datT > DAT_LOW_CLEAR) plant.lowLimit.latched = false;

        // ── airflow proof ──
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

        // ── zone heat balance (forward-Euler, pid-engine idiom) ──────────
        // Q_cool = sensible heat the SUPPLY air removes from the zone,
        // measured to the POST-FAN datT so the fan's FAN_HEAT (draw-through)
        // re-enters the zone. computeProcess returns qSens = mDot·cp·(datT −
        // zoneT), negative when cooling; heat removed = −qSens. So fan-only
        // (datT above zoneT) falls out NEGATIVE — the fan motor heat lands
        // as a real zone load, no special case.
        let qCool = 0;
        if (inlet.ok) {
            const supply = Psychro.buildState(datT, leavingW, P);
            if (supply.ok) {
                const proc = Psychro.computeProcess({ inlet: inlet, outlet: supply, type: 'cool' }, cfm);
                if (isFinite(proc.qSens)) qCool = -proc.qSens;   // Btu/h (<0 = fan-heat gain)
            }
        }
        // Envelope (negative feedback toward OA — adds damping) + internal.
        const qGain = UA_ENV * (tOa - zoneT) + qInternal;        // Btu/h
        if (isFinite(dt)) {
            // pv += dt · net / C  (tau ↔ C_ZONE). Loads are Btu/HOUR and
            // C_ZONE is Btu/°F, so net/C is °F/h; dt is sim-SECONDS, hence
            // the /3600. A second state (zoneW on qLat) integrates on this
            // exact line — see zoneInletState.
            plant.zoneT += (qGain - qCool) / C_ZONE * (dt / 3600);
            plant.simSec += dt;
            // Wide safety clamp — the envelope term already bounds zoneT;
            // this only catches a pathological knob combination.
            if (plant.zoneT < 40)  plant.zoneT = 40;
            if (plant.zoneT > 120) plant.zoneT = 120;
        }

        // Program-visible sensor = the value the CONTROLLER reads. Normally
        // the real zone; a forced override hands the program a wrong number
        // while the real zone keeps integrating on actual physics.
        plant.sensors['space-temp'] = plant.override.spaceTemp.active
            ? plant.override.spaceTemp.value
            : plant.zoneT;

        // Return-air temp AI — a probe in the return duct measures the
        // REAL air the zone sends back, so it reads the TRUTH
        // (plant.zoneT), NEVER the sensed/overridable value above. The
        // split is deliberate: when the wall-stat override forces a
        // lie, the RAT chip visibly disagrees with the Space chip —
        // the real-vs-sensed commissioning moment, from the plant
        // side. (No program consumes it yet; the binding driver skips
        // an unauthored point — see the header's BINDING INVARIANT.)
        plant.sensors['rat'] = plant.zoneT;

        // The proof switch is not a measurement of a continuous value,
        // so there is nothing to override — it reports its own state.
        plant.sensors['fan-status'] = plant.proof.made;

        // Entering air for the DISPLAY — the same post-integration
        // sample as sensors['rat'] above, because the EAT badge and the
        // RAT chip are one measurement and must round identically every
        // tick. (The pre-step local `zoneT` drifts up to ~0.06 °F from
        // the probe inside one 5-sim-s step — enough to split the last
        // displayed digit at a rounding boundary. The physics above
        // deliberately keeps the tick-START zoneT: that is the Euler
        // evaluation point; only the display samples tick-END state,
        // like every other chip.)
        d.eatT = plant.zoneT;            // actual return air (= zone temp)
        d.coilLeaveT = coilLeaveT;
        d.datT = datT;
        d.stage = stage;
        // The three airflow facts stay distinct. There is deliberately
        // NO `d.fanOn` alias: one key cannot answer both "did the
        // sequence ask for the fan" and "is air moving", and with a
        // belt fault live those two diverge — which is the whole
        // lesson. `fanCmd` and `airflowOn` both have readers in
        // fcuRenderUnit and each of those picks on purpose; `fanStatus`
        // has NO consumer today (the Fan Sts chip paints from
        // plant.sensors, shell-side) and is published for completeness,
        // the `d.matW` idiom on the AHU. Publishing the trio whole is
        // what keeps a later readout from reaching for the wrong one.
        d.fanCmd = fanCmd;
        d.airflowOn = airflowOn;
        d.fanStatus = plant.proof.made;
        d.fanPct = fanPct;
        d.capActive = capActive;
        d.setp = plant.params['cooling-setpoint'];
        d.fault = fault;
        d.qCool = qCool;                 // Btu/h (signed)
        d.qGain = qGain;                 // Btu/h
        d.sensedT = plant.sensors['space-temp'];
        d.overrideActive = plant.override.spaceTemp.active;
        d.lowLimitLatched = plant.lowLimit.latched;
        // The blades follow the AIR, not the command — a broken belt
        // stops the stream on the graphic while the fan-enable chip
        // still reads ON.
        plant.anim.fanFrac = airflowOn ? fanFrac : 0;
    }

    // ── FCU IO points ── point id === seed FBE-block id === the IO block
    // the sample programs author (the load-bearing binding invariant).
    // `dir` is 'sensor' | 'actuator' for the driver; params carry
    // dir:'param'. On sensors/actuators min/max/step mirror the
    // hand-control ranges (informational there — the programs place
    // their own blocks, so no `seed` field); on PARAMS they are
    // LOAD-BEARING: the operator graphic's parameter rail clamps
    // commits to them and announces the catch (owner ruling
    // 2026-08-03). Canonical IP; first-cut ranges pending owner
    // retune on preview.
    // `relinquishDefault` (the real BACnet property) is REQUIRED on every
    // actuator point: it is the value the point rests at when its whole
    // priority array is NULL, and it comes from HERE alone — the shell
    // has no fallback table, so an actuator without one resolves to
    // undefined and fails loudly rather than inventing a safe value.
    const FCU_POINTS = [
        // `conv` drives the shared point-value formatter
        // (DDCWShell.formatPointValue — chip strip + off-program window).
        // `unit` CANNOT stand in for it: `deadband` is a DELTA temperature
        // that also carries '°F', and running a delta through the absolute
        // formula prints -16.1 °C for a 3 °F deadband. Points with no `conv`
        // are unitless-or-already-universal (%) and pass through. The `unit`
        // strings stay as the US labels; the metric label comes from
        // Units.suffix at the display boundary.
        { id: 'space-temp',       kind: 'ai',    dir: 'sensor',   plantKey: 'space-temp',       name: 'Space',    unit: '°F', conv: 'temp',      min: 70, max: 84, step: 1 },
        // rat sits next to dat so the chip strip reads entering →
        // leaving side by side (the pair the coil ΔT is made of).
        { id: 'rat',              kind: 'ai',    dir: 'sensor',   plantKey: 'rat',              name: 'RAT',      unit: '°F', conv: 'temp' },
        { id: 'dat',              kind: 'ai',    dir: 'sensor',   plantKey: 'dat',              name: 'DAT',      unit: '°F', conv: 'temp' },
        // Airflow PROOF, not the fan command — a duct-pressure switch
        // that makes slowly and breaks at once. A sequence that
        // interlocks on this rides through a broken belt; one that
        // assumes the command is the truth does not. No `unit` and no
        // `conv`: the shared formatter short-circuits a bi to ON / OFF
        // before it reaches either.
        { id: 'fan-status',       kind: 'bi',    dir: 'sensor',   plantKey: 'fan-status',       name: 'Fan Sts' },
        { id: 'fan-speed',        kind: 'ao',    dir: 'actuator', plantKey: 'fan-speed',        name: 'Fan Spd',  unit: '%', min: 0, max: 100, step: 5, relinquishDefault: 0 },
        { id: 'fan-enable',       kind: 'bo',    dir: 'actuator', plantKey: 'fan-enable',       name: 'Fan En',   relinquishDefault: false },
        { id: 'y1',               kind: 'bo',    dir: 'actuator', plantKey: 'y1',               name: 'Y1',       relinquishDefault: false },
        { id: 'y2',               kind: 'bo',    dir: 'actuator', plantKey: 'y2',               name: 'Y2',       relinquishDefault: false },
        { id: 'cooling-setpoint', kind: 'param', dir: 'param',    plantKey: 'cooling-setpoint', name: 'Cool SP',  unit: '°F', conv: 'temp',      min: 65, max: 85, step: 0.5 },
        // Deadband min is 1, not 0: a zero band short-cycles by
        // construction, and the zero-band lesson stays reachable on the
        // wiresheet, where the constant is unguarded. (Ships at 3.)
        { id: 'deadband',         kind: 'param', dir: 'param',    plantKey: 'deadband',         name: 'Deadband', unit: '°F', conv: 'deltaTemp', min: 1, max: 5, step: 0.5 },
    ];

    // ═════════════════════ DOM — graphic + controls ═════════════════════
    // Everything below touches the page. No element handle is resolved
    // at load — bindDom() (called from fcuWireControls, the first unit
    // method the shell's boot sequence invokes) owns that, which is
    // what keeps the physics half above vm-loadable without a DOM.

    // Air colour downstream of the coil, set by renderUnit and read by the
    // chevron loop (upstream is always --blue-cool).
    let downstreamColor = 'var(--blue)';
    // Set by fcuInitAnim; renderUnit calls it on every paint. Starts or
    // suspends the animation loop to match the current state, and re-tints
    // the chevrons whenever the loop is suspended (frozen air still has to
    // follow downstreamColor).
    let fcuAnimSync = null;

    // ── DOM handles — assigned in bindDom(), read everywhere below ──
    let fanSlider, fanenToggle;
    // NULL — released checkboxes (checked = slot 8 empty). The stage
    // box governs BOTH y1 and y2 — one control, two points.
    let nullStage, nullFan, nullFanen;
    let zoneValLbl;                          // actual zone readout
    let fanValLbl;
    // Sensor-override controls (real-vs-sensed teaching moment).
    let ovrField, ovrToggle, ovrInput, ovrUnit, ovrState;
    // Environment / clock knobs — sim inputs, not BACnet points:
    // no priority array, live regardless of any slot state.
    let speedSlider, speedValLbl, oaSlider, oaValLbl, loadSlider, loadValLbl;
    let fanBlade, compDot, verdictEl, verdictSrEl, stageBtns, presetBtns, mirrorBtns;
    // On-graphic + readout-grid nodes (kept in one map so renderUnit writes
    // both surfaces from one source).
    let out;

    function bindDom() {
        fanSlider   = document.getElementById('fcu-fan-slider');
        fanenToggle = document.getElementById('fcu-fanen-toggle');
        nullStage   = document.getElementById('fcu-null-stage');
        nullFan     = document.getElementById('fcu-null-fan');
        nullFanen   = document.getElementById('fcu-null-fanen');
        zoneValLbl  = document.getElementById('fcu-zone-val');
        fanValLbl   = document.getElementById('fcu-fan-sval');
        ovrField    = document.getElementById('fcu-override');
        ovrToggle   = document.getElementById('fcu-ovr-toggle');
        ovrInput    = document.getElementById('fcu-ovr-input');
        ovrUnit     = document.getElementById('fcu-ovr-unit');
        ovrState    = document.getElementById('fcu-ovr-state');
        speedSlider = document.getElementById('fcu-speed-slider');
        speedValLbl = document.getElementById('fcu-speed-val');
        oaSlider    = document.getElementById('fcu-oa-slider');
        oaValLbl    = document.getElementById('fcu-oa-val');
        loadSlider  = document.getElementById('fcu-load-slider');
        loadValLbl  = document.getElementById('fcu-load-val');
        fanBlade    = document.getElementById('fcu-fan-blade');
        compDot     = document.getElementById('fcu-comp-dot');
        verdictEl   = document.getElementById('fcu-verdict');
        // Unguarded on purpose, like every other handle in here
        // (zoneValLbl, ovrUnit …): a guard would make this one the odd
        // one out. Worth knowing the cost — a null verdictSrEl throws
        // inside fcuRenderUnit, which takes syncControls, the statusbar
        // and the 10 Hz paint with it, so the failure mode is a frozen
        // simulator rather than a loud error. Only reachable via
        // HTML/JS cache skew (this file is loaded unversioned).
        verdictSrEl = document.getElementById('fcu-verdict-sr');
        stageBtns   = document.querySelectorAll('#tab-unit [data-stage]');
        presetBtns  = document.querySelectorAll('#tab-unit [data-preset]');
        mirrorBtns  = document.querySelectorAll('#tab-unit .fcu-point-btn[data-point]');

        out = {
            eat:  [document.getElementById('fcu-eat'),   document.getElementById('fcu-eat-r')],
            dat:  [document.getElementById('fcu-dat'),   document.getElementById('fcu-dat-r')],
            dt:   [document.getElementById('fcu-dt'),    document.getElementById('fcu-dt-r')],
            zt:   document.getElementById('fcu-zone-t'),
            zsp:  document.getElementById('fcu-zone-sp'),
            zr:   document.getElementById('fcu-zone-r'),
            fanG: document.getElementById('fcu-fan-v'),
            fanR: document.getElementById('fcu-fan-r'),
            compG:document.getElementById('fcu-comp-v'),
            compR:document.getElementById('fcu-comp-r'),
            datG: document.getElementById('fcu-dat'),
            // The param rail (the operator-adjustable surface): the p*
            // handles are <input>s, the u* spans their unit suffixes,
            // paramsHint the rail's one live region. The SVG setpoint
            // well (zsp above) stays the read-only display twin.
            pCoolSp:   document.getElementById('fcu-p-cool-sp'),
            pDeadband: document.getElementById('fcu-p-deadband'),
            uCoolSp:   document.getElementById('fcu-p-cool-sp-u'),
            uDeadband: document.getElementById('fcu-p-deadband-u'),
            paramsHint: document.getElementById('fcu-params-hint'),
        };
    }

    // ── Units helpers — the shell's statics (one conversion path for
    // graphic, readouts, chips and the off-program window; #218) ──
    function dispTempNum(f) { return DDCWShell.dispTempNum(f); }
    function tSuffix() { return DDCWShell.tSuffix(); }
    function dSuffix() { return DDCWShell.dSuffix(); }

    function setBoth(pair, text) {
        pair[0].textContent = text;
        pair[1].textContent = text;
    }

    // Mirror a live param into its rail input — the override-input
    // pattern: never write while the field holds focus (the user is
    // mid-edit; commit is Enter / focus-out), and only on a genuine
    // change so an idle tick never disturbs the field.
    function setParamInput(inp, str) {
        if (document.activeElement === inp) return;
        if (inp.value !== str) inp.value = str;
    }

    // The rail's two adjustable params: roster point id → the out-map
    // handle key of its input. Walked by the mirror paint, the
    // writability sync and the commit wiring, so the three surfaces
    // cannot cover different sets.
    const PARAM_POINTS = [
        { id: 'cooling-setpoint', outKey: 'pCoolSp' },
        { id: 'deadband',         outKey: 'pDeadband' },
    ];

    // Roster lookup by point id — the params' min/max/step and conv all
    // live on FCU_POINTS, the single source the chips already read.
    function rosterPoint(id) {
        for (let i = 0; i < FCU_POINTS.length; i++) {
            if (FCU_POINTS[i].id === id) return FCU_POINTS[i];
        }
        return null;
    }

    // ── verdict — ONE writer for the pill and its screen-reader mirror ──
    // The pill (#fcu-verdict) lives inside #tab-unit, and .tab-pane is
    // display:none while the Wiresheet is up, so aria-live ON THE PILL is
    // out of the accessibility tree on exactly the tab where a reader is
    // studying the program that raised the annunciation. The pill cannot
    // move either — the fullscreen cockpit places it by `grid-area:
    // verdict`, which only resolves while it is a grid child of that pane.
    // So the pill is a mute readout and #fcu-verdict-sr (an .sr-only live
    // region outside both panes) carries the announcement.
    // codebase-issues #227a.
    //
    // SIGNATURE-GUARDED, the shell's offprogSig idiom (ddcw-shell.js:372):
    // the host ticks at 10 Hz and repaints the unit every tick, and an
    // unguarded rewrite of a live region is a screen reader talking over
    // itself ten times a second (measured before this guard: ~40 mutation
    // records on the pill in a 2 s steady window). The class rides IN the
    // signature so a state whose text is unchanged can never skip its
    // class change.
    //
    // Deliberately NOT debounced the way pid-tuner's announceMetrics is:
    // that page throttles a genuinely-changing metric, this one de-dups
    // identical writes, and an annunciation must not be delayed. The
    // residual is boundary chatter — a plant hovering exactly on a verdict
    // threshold can legitimately flip at up to 10 Hz. Accepted.
    //
    // ⚠️ The signature is text-only ON PURPOSE, and that only holds because
    // no verdict string carries a number or a unit — nothing here has to
    // re-render on the shell's `unitschange` event (contrast offprogSig,
    // whose signature deliberately moves with the units toggle). A verdict
    // line that ever interpolates a temperature MUST fold the unit suffix
    // into the signature, or a metric toggle would leave a stale °F line
    // on screen.
    let verdictSig = null;
    function setVerdict(cls, txt) {
        const sig = cls + '|' + txt;
        if (sig === verdictSig) return;
        verdictSig = sig;
        verdictEl.className = 'status-pill fcu-verdict' + (cls ? ' ' + cls : '');
        verdictEl.textContent = txt;
        verdictSrEl.textContent = txt;
    }

    // ── paint — reads plant.derived; owns the DOM (graphic + verdict).
    // The displayed ΔT is the arithmetic of the displayed EAT / DAT so
    // the on-screen math closes (the metric worked-example rounding
    // policy). It is SIGNED — leaving minus entering (DAT − RAT), so a
    // cooling coil reads NEGATIVE (owner ruling 2026-07-27: the sign
    // tells you which way the coil drives the air, and the convention
    // survives a unit that heats; |ΔT| was considered and rejected). ──
    function fcuRenderUnit(plant) {
        const d = plant.derived;
        if (d.invalid) {
            setBoth(out.eat, '—'); setBoth(out.dat, '—'); setBoth(out.dt, '—');
            setVerdict('', 'Enter a value.');
            return;
        }
        // Displayed values — ΔT reconciles from the displayed operands,
        // signed: leaving minus entering (negative while cooling).
        const eatN = dispTempNum(d.eatT);
        const datN = dispTempNum(d.datT);
        const spN  = dispTempNum(d.setp);
        const dtN  = Math.round((datN - eatN) * 10) / 10;

        setBoth(out.eat, eatN.toFixed(1) + ' ' + tSuffix());
        setBoth(out.dat, datN.toFixed(1) + ' ' + tSuffix());
        setBoth(out.dt,  dtN.toFixed(1)  + ' ' + dSuffix());
        out.zt.textContent  = eatN.toFixed(1) + ' ' + tSuffix();
        out.zsp.textContent = spN.toFixed(1) + ' ' + tSuffix();
        out.zr.textContent  = eatN.toFixed(1) + ' / ' + spN.toFixed(1) + ' ' + tSuffix();

        // ── the param rail ── the two params are INPUTS (the rail is the
        // operator-adjustable surface): while a field is not focused its
        // VALUE mirrors the live param — the override-input pattern — and
        // the °F/°C suffix rides in a separate span so the number stays a
        // bare editable value. The SVG SETPOINT well (zsp above) stays
        // the read-only display twin — nothing in the graphic is
        // focusable (#227b). The deadband converts as a DELTA, same as
        // the chips.
        setParamInput(out.pCoolSp, spN.toFixed(1));
        const dbDisp = window.Units.current() === 'us'
            ? plant.params['deadband']
            : window.Units.display.deltaTemp(plant.params['deadband']);
        setParamInput(out.pDeadband, (Math.round(dbDisp * 10) / 10).toFixed(1));
        out.uCoolSp.textContent   = tSuffix();
        out.uDeadband.textContent = dSuffix();

        // The fan readout shows the COMMAND, the peer of the compressor
        // readout beside it — so under a broken belt the graphic reads
        // "100% · ON" while the blades stand still and the Fan Sts chip
        // reads OFF. That disagreement is the tell, not a bug: an output
        // shows what was asked for, and proof is the separate claim.
        const fanTxt = d.fanCmd ? (d.fanPct + '% · ON') : 'OFF';
        out.fanG.textContent = fanTxt;
        out.fanR.textContent = fanTxt;

        const compTxt = d.stage === 0 ? 'OFF' : ('Stage ' + d.stage + ' · ON');
        out.compG.textContent = d.stage === 0 ? 'OFF' : ('STG ' + d.stage + ' · ON');
        out.compR.textContent = compTxt;

        // Compressor LED: producing (green), off (dim), or energized but
        // not producing (red — the fault tell).
        // Energized-but-not-producing reads off the COMMAND pair: a
        // stage called while the fan was also called. A broken belt now
        // lands here (both commanded, nothing produced) instead of
        // falling through to the dim at-rest fill.
        compDot.setAttribute('fill',
            d.capActive ? 'var(--accent)'
                        : (d.stage > 0 && d.fanCmd) ? 'var(--red)' : 'var(--text-dim)');

        // Downstream air colour follows whether the coil is actually
        // cooling; the chevron stream and the DAT number both read it.
        // ΔT is signed, so a clear cooling delta is ≤ COOLING_DT_TRIP —
        // measured on the CANONICAL delta, not the displayed dtN above
        // (#224; the constant's note carries the why).
        const cooling = d.capActive && datDeltaT(d) <= COOLING_DT_TRIP;
        downstreamColor = cooling ? 'var(--blue)' : 'var(--text-dim)';
        out.datG.setAttribute('fill', cooling ? 'var(--text-bright)' : 'var(--text-dim)');
        // Sole resume/suspend vector for the animation loop. renderUnit runs
        // on every hostTick (10 Hz while visible) and synchronously on every
        // control interaction via requestRender, so this one call covers the
        // fan cycling on, a tab switch back to Unit, the tab being un-hidden,
        // and any preset / slider change — no extra listeners needed.
        if (fcuAnimSync) fcuAnimSync();

        // Verdict — a fault or an off state outranks the cooling readout.
        // Fan-off splits two ways: with a stage energized it's a genuine
        // no-airflow fault — reachable several ways, all of them taught
        // here: the `fanon` source toggled false in cool-2stage-fanon,
        // a deleted or1→fan-enable wire (an unwired input evaluates
        // false, so the sequence commands the fan OFF), or a slot-8
        // fan-enable override held OFF under an active cooling call.
        // With no stage called the unit is simply at rest, which is
        // normal operation, not an alarm (previously this whole branch
        // flagged red).
        // The low-limit annunciator line sits BELOW the fan-off branches
        // (an active no-airflow hazard is the more urgent diagnosis, and
        // with the fan off the DAT annunciator self-clears anyway) and
        // ABOVE the generic compressor-off warn: both read "stages off,
        // fan running", so the specific observation must win the tie or
        // it could never surface. Its wording is observation-only — it
        // reports the annunciator, never who cut the stages (see the
        // DAT_LOW_* header note for the unprotected-sheet window that
        // rules out causal phrasing).
        // The airflow branches read `airflowOn` — the PHYSICAL fact —
        // and use `fanCmd` only to word WHY the air stopped. A broken
        // belt and a fan nobody asked for are the same hazard to the
        // coil and two different things to go look at.
        let cls, txt;
        if (!d.airflowOn && d.stage > 0) {
            cls = 'error';
            txt = d.fanCmd
                ? 'Fan commanded on but no air moving — compressor on a dead coil'
                : 'Fan off with compressor on — no airflow across an active coil';
        } else if (!d.airflowOn && d.fanCmd) {
            cls = 'error'; txt = 'Fan commanded on but no air moving — airflow proof is down';
        } else if (!d.airflowOn) {
            cls = '';      txt = 'No cooling call — fan off (idle)';
        } else if (d.stage === 0 && d.lowLimitLatched) {
            cls = 'warn';  txt = 'DAT low-limit annunciator latched — stages off, fan moving air';
        } else if (d.stage === 0) {
            cls = 'warn';  txt = 'Compressor off — fan only, no ΔT across the coil';
        } else if (d.fault === 'low-charge') {
            // Symptom first, charge as ONE candidate — never the finding.
            // `d.fault` is injected ground truth the graphic never draws,
            // so a verdict that reads "low charge" is reporting what the
            // MODEL knows, not what the SCREEN shows: these readings
            // cannot separate low charge from a plugged condenser, a dead
            // compressor or a plugged metering device (they are literally
            // the same displayed state as the blocked-condenser scenario
            // one button over — codebase-issues #247). Naming the
            // instrument that WOULD settle it is the honest close, and it
            // is the same discipline the condenser branch below applies
            // by naming the side instead of the part. Owner ruled
            // disposition 3 on 2026-08-01: keep a distinct string, soften
            // the claim. Moves with the page's blocked-condenser
            // `.ref-note`, which names this verdict.
            cls = 'error'; txt = 'No ΔT across coil — air moving; low charge is one candidate, gauges settle it';
        } else if (d.fault === 'blocked-condenser') {
            // The one verdict that points OFF the drawing, and that is
            // the lesson: the indoor side reads perfect — fan commanded,
            // proof made, chevrons running — and there is still no
            // cooling, so the thing that failed is somewhere this screen
            // does not draw. The graphic has no condenser on it.
            // Deliberately "look condenser-side" rather than "condenser
            // blocked": a blocked condenser is ONE cause of energized-
            // and-not-cooling, and the readings on this screen cannot
            // separate it from a dead compressor or a plugged metering
            // device. Naming the side is what the screen supports;
            // naming the part is what the scenario button already said.
            cls = 'error'; txt = 'No ΔT across coil — air moving; look condenser-side, off this graphic';
        } else if (datDeltaT(d) > COOLING_DT_TRIP) {
            // Signed ΔT: cooling drives it negative, so "no meaningful
            // cooling delta" is anything ABOVE the trip line. Canonical
            // delta, same reason as the chevron gate (#224). Kept as a
            // `>` test rather than `!(… <= …)`: a non-finite delta must
            // keep falling THROUGH this branch exactly as it did, and
            // the negated form would catch it instead.
            cls = 'error'; txt = 'No ΔT across coil — compressor not cooling';
        } else if (d.coilLeaveT <= 42) {
            cls = 'warn';  txt = 'Cooling — but ΔT is high / airflow low (coil-freeze watch)';
        } else {
            cls = 'ok';    txt = 'Cooling — clear ΔT across the coil';
        }
        setVerdict(cls, txt);

        // ── sensor override display — the real-vs-sensed split ──
        // The zone readout is the ACTUAL zone (eatN). The override box
        // shows what the program READS: it mirrors the live zone when off
        // (read-only) and holds the forced value when on. Forcing surfaces
        // the drift on the state line so the wrong-number hazard is plain.
        zoneValLbl.textContent = 'zone ' + eatN.toFixed(1) + ' ' + tSuffix();
        ovrUnit.textContent = tSuffix();
        if (!d.overrideActive) {
            ovrInput.value = eatN.toFixed(1);
            ovrState.textContent = '';
        } else {
            const sensedN = dispTempNum(d.sensedT);
            ovrState.textContent = 'Program reads ' + sensedN.toFixed(1) + ' ' + tSuffix()
                + ' — zone is actually ' + eatN.toFixed(1) + ' ' + tSuffix()
                + '. The controller is staging on the forced value.';
        }
    }

    // ── hand controls — per-point: a RELEASED control (slot 8 NULL)
    // disables and tracks the resolved value; a HELD one is the user's.
    // ctx is the shell's extensible sync context; ctx.slot8(pointId)
    // is the probe (null = released).
    function fcuSyncControls(plant, ctx) {
        // The stage group commands y1 AND y2 as one action, so the two
        // slots always move together; require both NULL to read as
        // released anyway, so a divergence could never hide.
        const stageRel = ctx.slot8('y1') === null && ctx.slot8('y2') === null;
        const fanRel   = ctx.slot8('fan-speed') === null;
        const fanenRel = ctx.slot8('fan-enable') === null;

        // The NULL boxes mirror slot state — slot 8 is the single
        // source of truth, so a scenario's slot-8 write flips the box
        // on the next paint without extra wiring.
        nullStage.checked = stageRel;
        nullFan.checked   = fanRel;
        nullFanen.checked = fanenRel;

        fanSlider.disabled   = fanRel;
        fanenToggle.disabled = fanenRel;
        stageBtns.forEach(function (b) { b.disabled = stageRel; });
        // A released fan slider tracks the resolved command; a held one
        // is the user's (don't overwrite mid-drag).
        if (fanRel) fanSlider.value = String(plant.actuators['fan-speed']);
        fanenToggle.checked = !!plant.actuators['fan-enable'];
        const stg = plant.actuators.y2 ? 2 : (plant.actuators.y1 ? 1 : 0);
        stageBtns.forEach(function (b) {
            const on = parseInt(b.getAttribute('data-stage'), 10) === stg;
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        fanValLbl.textContent = plant.actuators['fan-speed'] + '%';

        // ── sensor override — deliberately OUTSIDE the priority
        // machinery: it forces an INPUT (the value the program reads),
        // not an output command, so it fools the program no matter
        // which slot is winning any output's arbitration. The box is
        // editable only while forcing; renderUnit fills it with the
        // live zone when released.
        const forcing = plant.override.spaceTemp.active;
        ovrToggle.classList.toggle('active', forcing);
        ovrToggle.setAttribute('aria-pressed', forcing ? 'true' : 'false');
        ovrToggle.textContent = forcing ? 'Release' : 'Force sensor';
        ovrInput.disabled = !forcing;
        ovrField.classList.toggle('is-forcing', forcing);

        // ── environment / clock readouts (these sliders are always live —
        // they set the world, not the unit's outputs). Read FROM the knob
        // state, never write the slider value (would fight a drag). The
        // clock multiplier is SHELL state — ctx.simSpeed() is the live
        // read, so this readout can't hold a stale local mirror.
        speedValLbl.textContent = Math.round(ctx.simSpeed()) + '×';
        oaValLbl.textContent    = dispTempNum(tOa).toFixed(0) + ' ' + tSuffix();
        loadValLbl.textContent  = Math.round(qInternal) + ' Btu/h';

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
    // cell, so a fullscreen transition needs no unit-side reflow.
    function fcuOnResize() { /* no-op — SVG scales itself */ }

    // ── control wiring — hand moves write slot 8 via the host hooks;
    // the NULL boxes release it. Nothing here writes plant.actuators
    // directly any more — the resolver owns that. First unit method the
    // shell calls, so it resolves the DOM handles for the whole file. ──
    function fcuWireControls(pl, host) {
        bindDom();

        // ── the sensor-glyph activation affordance (codebase-issues #227b)
        // The glyphs on the drawing are NOT focusable — role="img" prunes
        // the subtree and dropping it would un-hide every <text> node the
        // point mirror already carries — so the keyboard path lives on the
        // mirror cells, which are real buttons. Pressing one pulses that
        // point's statusbar chip through the shell's own hook, which is
        // exactly what a glyph click does. The latch is exclusive and
        // `aria-pressed` moves in the same iteration as the class, so the
        // border colour is not the only channel carrying the state.
        //
        // The AHU page runs the identical block; the ruling was one change
        // across both pages rather than two divergent ones.
        mirrorBtns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                host.highlightChip(e.currentTarget.getAttribute('data-point'));
                mirrorBtns.forEach(function (b) {
                    const on = b === e.currentTarget;
                    b.classList.toggle('is-active', on);
                    b.setAttribute('aria-pressed', String(on));
                });
            });
        });

        // Scenarios are operator writes: slot 8 on every output the
        // scenario touches (the NULL boxes re-sync from slot state on
        // the next paint), so the graphic tells are reachable without
        // wiring a program — and stay put until you release them.
        // Keys are the button's `data-preset` (DOM-side, always
        // lowercase); the `fault` value is the PLANT vocabulary
        // (kebab-case — see fcuCreatePlant). The two are hand-mapped
        // here on purpose, which is what lets the buttons read as
        // sentences without pushing that wording into the model.
        const SCENARIOS = {
            healthy:   { zone: 78, fan: 100, stage: 2, fault: 'none' },
            compoff:   { zone: 78, fan: 100, stage: 0, fault: 'none' },
            lowcharge: { zone: 78, fan: 100, stage: 2, fault: 'low-charge' },
            // `condenser` names the failed PART, the way `belt` below
            // does — a bare `blocked` said nothing about which coil.
            condenser: { zone: 78, fan: 100, stage: 2, fault: 'blocked-condenser' },
            // The fan is COMMANDED here — that is the whole point. The
            // belt is what failed, so the command stands, the air stops
            // and the proof switch drops.
            belt:      { zone: 78, fan: 100, stage: 2, fault: 'fan-belt' },
        };

        presetBtns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                const s = SCENARIOS[e.currentTarget.getAttribute('data-preset')];
                if (!s) return;
                // Seed the zone as an INITIAL CONDITION — the loop carries
                // it from here; a preset never jams the sensed value.
                pl.zoneT = s.zone;
                pl.override.spaceTemp.active = false;   // a preset is a clean start
                pl.override.spaceTemp.value  = s.zone;
                host.writeSlot8('fan-speed', s.fan);
                fanSlider.value = String(s.fan);   // held sliders aren't sync-tracked
                host.writeSlot8('y1', s.stage >= 1);
                host.writeSlot8('y2', s.stage >= 2);
                host.writeSlot8('fan-enable', s.fan > 0);   // scenarios run the fan
                pl.conditions.fault = s.fault;
                host.requestRender();
            });
        });

        // Stage buttons — ONE control, TWO points: a stage pick is a
        // single operator action that commands y1 AND y2 at slot 8
        // (Y2 implies Y1).
        stageBtns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                if (nullStage.checked) return;     // released — buttons are disabled anyway
                const s = parseInt(e.currentTarget.getAttribute('data-stage'), 10);
                host.writeSlot8('y1', s >= 1);
                host.writeSlot8('y2', s >= 2);
                host.requestRender();
            });
        });

        // Fan-enable toggle — writes slot 8 while held.
        fanenToggle.addEventListener('change', function () {
            if (nullFanen.checked) return;
            host.writeSlot8('fan-enable', fanenToggle.checked);
            host.requestRender();
        });

        // Fan-speed slider — writes slot 8 while held.
        fanSlider.addEventListener('input', function () {
            if (nullFan.checked) return;
            const v = parseFloat(fanSlider.value);
            if (isFinite(v)) host.writeSlot8('fan-speed', v);
            host.requestRender();
        });

        // ── NULL boxes — the release/take mechanics, BUMPLESS both
        // ways. Checking writes NULL to slot 8 (the BACnet relinquish
        // idiom — the point falls to the next non-null slot, no bump
        // needed). UNchecking seeds slot 8 with the point's CURRENT
        // resolved value, so the hand takes over exactly where the
        // program left the point — the control doesn't jump, and the
        // unit doesn't lurch. ──
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
        nullFan.addEventListener('change', function () {
            if (nullFan.checked) host.releaseSlot8('fan-speed');
            else host.writeSlot8('fan-speed', pl.actuators['fan-speed']);
            host.requestRender();
        });
        nullFanen.addEventListener('change', function () {
            if (nullFanen.checked) host.releaseSlot8('fan-enable');
            else host.writeSlot8('fan-enable', pl.actuators['fan-enable'] === true);
            host.requestRender();
        });

        // ── Sensor override — force the value the PROGRAM reads. Toggling
        // on seeds the box from the current actual zone; the real zone
        // keeps integrating regardless. The numeric box is display-unit-
        // aware (°F internally, °C when the site is in metric). ──
        function toDisplayTemp(f) {
            const U = window.Units;
            return U.current() === 'us' ? f : U.display.temp(f);
        }
        function fromDisplayTemp(disp) {
            const U = window.Units;
            return U.current() === 'us' ? disp : U.toCanonical.temp(disp);
        }
        ovrToggle.addEventListener('click', function () {
            const ov = pl.override.spaceTemp;
            ov.active = !ov.active;
            if (ov.active) {
                ov.value = pl.zoneT;                   // start the force from the truth
                ovrInput.value = toDisplayTemp(pl.zoneT).toFixed(1);
            }
            host.requestRender();
            if (ov.active) ovrInput.focus();
        });
        ovrInput.addEventListener('input', function () {
            if (!pl.override.spaceTemp.active) return;
            const disp = parseFloat(ovrInput.value);
            if (!isFinite(disp)) return;               // validate-and-mute: ignore junk mid-type
            pl.override.spaceTemp.value = fromDisplayTemp(disp);
            host.requestRender();
        });
        // Re-express the forced value in the current display units when the
        // site unit toggle flips — the render loop leaves the box alone
        // while forcing (so it can't clobber typing), so do it on the event.
        // The rail's min/max/step attributes re-express here too: the
        // shell's own unitschange repaint re-mirrors the input VALUES, but
        // attributes are wireControls' to keep.
        document.addEventListener('unitschange', function () {
            if (pl.override.spaceTemp.active) {
                ovrInput.value = toDisplayTemp(pl.override.spaceTemp.value).toFixed(1);
            }
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
        // classroom (see the markup's rail note). Same block as the AHU
        // page's rail, sized to this unit's two params — duplicated
        // per the unit-selector precedent rather than grown into the
        // unit-agnostic shell.
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
                // Display-equality no-op: if the field reads exactly what
                // the live value displays as, there is nothing to commit.
                // This is what makes the Enter keydown + native 'change'
                // double-fire harmless in METRIC mode: the keydown commit
                // re-expresses the field (85 °F → "29.4"), and the change
                // commit would otherwise re-parse that display through
                // toCanonical (29.4 °C → 84.92 °F) — silently eroding the
                // clamped canonical below the limit the hint just
                // announced. In US units the round-trip is lossless and
                // the second write was merely redundant.
                if (inp.value === paramToDisplay(pt, pl.params[pt.plantKey])) return;
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
                // 'change', so a clamped commit is immediately followed by
                // the change-side call seeing the re-expressed display and
                // no-opping above; a clear here would wipe the
                // announcement the keydown commit just made.
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
                    // Claim Escape only while there is an edit to cancel:
                    // revert, and stop the press reaching the fullscreen
                    // handler (one press = one action — fullscreen-toggle's
                    // header sanctions exactly this claim). A CLEAN field
                    // has nothing to cancel, so the press bubbles on and
                    // can exit the fullscreen cockpit — an unconditional
                    // claim would swallow Escape forever and strand a
                    // keyboard user whose focus sits in a rail field.
                    if (inp.value !== paramToDisplay(pt, pl.params[pt.plantKey])) {
                        revert();
                        e.stopPropagation();
                    }
                }
            });
        });

        // ── Sim-clock speed (× real time) — always live; scales the whole
        // workbench clock through the host hook (binding + integrator). ──
        speedSlider.addEventListener('input', function () {
            const v = parseFloat(speedSlider.value);
            if (isFinite(v)) host.setSpeed(v);
            host.requestRender();
        });

        // ── Outdoor-air temp (envelope driver) — °F-native slider, always
        // live; the readout converts for display. ──
        oaSlider.addEventListener('input', function () {
            const v = parseFloat(oaSlider.value);
            if (isFinite(v)) tOa = v;
            host.requestRender();
        });

        // ── Internal sensible load (Btu/h) — always live. ──
        loadSlider.addEventListener('input', function () {
            const v = parseFloat(loadSlider.value);
            if (isFinite(v)) qInternal = v;
            host.requestRender();
        });
    }

    // ── page-local animations (one rAF loop; reads plant.anim.fanFrac) ──
    // The fan blade and the air chevrons share ONE self-suspending rAF
    // loop rather than running one apiece forever. House idiom:
    // flow-engine.js:285-303 (#113) — hasWork() / `looping` / startLoop().
    // The loop only runs while there is genuinely something to see: motion
    // is allowed, the fan is turning, the Unit pane is the one on screen,
    // and the tab is not hidden. The fan and chevron LOGIC stay separate
    // (each contributes a step(dt) closure); only the scheduling merges, so
    // there is one dt computation and one rAF callback per frame.
    function fcuInitAnim(pl) {
        // Computed once for both consumers — this used to be evaluated
        // twice, once per loop.
        const reduce = !!(window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        // Pull the pane's state rather than mirroring a flag out of
        // showTab: `switchTab` (ui.js) is what actually toggles .active, so
        // a mirrored flag would be a second source of truth that can
        // silently desync from the class the CSS keys off.
        const unitPane = document.getElementById('tab-unit');

        const steps = [];     // per-frame step(dt) closures
        const statics = [];   // repaints for the suspended state

        // Fan-blade spin — speed tracks fan fraction; still when off.
        // No static counterpart: a suspended blade correctly holds its last
        // angle, and under reduced motion it is never written at all. A
        // stopped fan is still.
        if (fanBlade && !reduce) {
            const BASE = 360 / 0.8;   // deg/sec at 100%
            let angle = 0;
            steps.push(function (dt) {
                angle = (angle + BASE * (pl.anim.fanFrac || 0) * dt) % 360;
                fanBlade.style.transform = 'rotate(' + angle.toFixed(2) + 'deg)';
            });
        }

        // Airflow chevrons — page-local (no flow-engine). One invisible
        // centerline is the getPointAtLength source; chevrons march it,
        // speed scales with fan fraction (0% = frozen), and each recolors at
        // the coil's leaving edge so the ΔT shows in the air itself.
        (function () {
            const SVG_NS = 'http://www.w3.org/2000/svg';
            const centerline = document.getElementById('fcu-centerline');
            const layer = document.getElementById('fcu-flow');
            if (!centerline || !layer) return;

            const SPACING = 46;         // px between chevrons along the centerline
            const BASE_SPEED = 0.05;    // loops/sec at 100% fan (× fanFrac)
            const COIL_LEAVE = { x: 202, y: 298 };   // downstream boundary

            const len = centerline.getTotalLength();
            const n = Math.max(8, Math.round(len / 3));
            const raw = [];
            let i;
            for (i = 0; i <= n; i++) raw.push(centerline.getPointAtLength(len * i / n));
            const table = [];
            for (i = 0; i <= n; i++) {
                const a = raw[Math.max(0, i - 1)];
                const b = raw[Math.min(n, i + 1)];
                table.push({ x: raw[i].x, y: raw[i].y, ang: Math.atan2(b.y - a.y, b.x - a.x) });
            }

            let boundaryFrac = 0.5;
            let bestD = Infinity;
            for (i = 0; i <= n; i++) {
                const dx = table[i].x - COIL_LEAVE.x;
                const dy = table[i].y - COIL_LEAVE.y;
                const d = dx * dx + dy * dy;
                if (d < bestD) { bestD = d; boundaryFrac = i / n; }
            }

            const count = Math.max(2, Math.floor(len / SPACING));
            const chevrons = [];
            let k;
            for (k = 0; k < count; k++) {
                const el = document.createElementNS(SVG_NS, 'path');
                el.setAttribute('d', 'M-5 -5 L2 0 L-5 5');
                el.setAttribute('class', 'fcu-chevron');
                layer.appendChild(el);
                chevrons.push({ el: el, base: k / count, color: '' });
            }

            function place(m, travel) {
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
                const color = f < boundaryFrac ? 'var(--blue-cool)' : downstreamColor;
                if (color !== m.color) { m.el.style.stroke = color; m.color = color; }
            }

            let travel = 0;
            let paintedTravel = null;
            let paintedColor = null;

            // Static repaint for the suspended state — the loop can stop
            // now, so a frozen stream still has to be placed and tinted.
            //
            // Colour is the job that makes this necessary: place() derives
            // each stroke from downstreamColor, which renderUnit rewrites,
            // so chevrons frozen on the Wiresheet tab must re-tint when the
            // compressor cycles behind it. Repaint from the CURRENT travel,
            // never from 0, or a suspended stream would snap back to its
            // starting positions on a colour change.
            //
            // Placement rides along: chevrons are created above with a `d`
            // but no `transform`, so something has to lay them on the
            // centerline before the first frame or they sit at the SVG
            // origin. animSync()'s paintStatic() branch already covers the
            // gate-closed cold start (verified by removing this call — the
            // chevrons still place correctly); the unconditional call here
            // additionally closes the one-frame gap on the gate-OPEN path,
            // where startLoop only places them on the next rAF tick.
            const paint = function () {
                if (paintedTravel === travel && paintedColor === downstreamColor) return;
                paintedTravel = travel;
                paintedColor = downstreamColor;
                chevrons.forEach(function (m) { place(m, travel); });
            };
            statics.push(paint);
            paint();

            if (reduce) return;

            steps.push(function (dt) {
                travel = (travel + BASE_SPEED * (pl.anim.fanFrac || 0) * dt) % 1;
                chevrons.forEach(function (m) { place(m, travel); });
            });
        })();

        let looping = false;
        let lastT = null;

        // Under reduced motion nothing pushes a step, so `steps.length` is
        // the reduced-motion gate too — no second matchMedia read.
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

        fcuAnimSync = function () {
            if (hasWork()) startLoop();
            else paintStatic();
        };
        fcuAnimSync();
    }

    // ── the unit factory — the interface the shell calls through ──
    function create(cfg) {
        return {
            id: 'fcu', prefix: 'fcu',
            points: FCU_POINTS,
            programs: cfg.programs,
            programLabels: cfg.programLabels,
            defaultProgram: cfg.defaultProgram,
            canvasSize: cfg.canvasSize,
            speedDefault: SPEED_DEF,             // sim-clock prefs the shell reads
            maxDtSim: MAX_DT_SIM,
            createPlant: fcuCreatePlant,
            update: fcuUpdate,
            renderUnit: fcuRenderUnit,
            syncControls: fcuSyncControls,
            onResize: fcuOnResize,
            initAnim: fcuInitAnim,
            wireControls: fcuWireControls,
        };
    }

    return {
        create: create,
        // Headless physics surface — DOM-free by construction (see the
        // PHYSICS banner); what an engine-direct spec drives.
        createPlant: fcuCreatePlant,
        update: fcuUpdate,
        zoneInletState: zoneInletState,
        POINTS: FCU_POINTS,
    };
})();

if (typeof window !== 'undefined') { window.DDCWFcuUnit = DDCWFcuUnit; }
