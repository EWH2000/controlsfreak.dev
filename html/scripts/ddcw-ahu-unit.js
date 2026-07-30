// ──────────────────────────────────────────────────────────────────────
// ddcw-ahu-unit.js — the AIR HANDLER unit for the DDC Workbench: a
// single-zone constant-volume AHU with two stages of DX cooling, a
// modulating hot-water heating coil, and a dry-bulb economizer.
// Sibling of /scripts/ddcw-fcu-unit.js, which is the reference
// implementation for every convention this file follows.
//
// ⚠️ SCOPE — THIS FILE IS THE PHYSICS HALF ONLY, AND THAT IS
// DELIBERATE. It ships the point list, the plant factory, the tick
// integrator and nothing else. There is NO DOM half, NO `create(cfg)`,
// and no renderUnit / syncControls / wireControls / initAnim /
// onResize. **The exported object therefore does NOT satisfy
// DDCWShell.createWorkbench's unit contract**, and handing it to the
// shell would boot part-way and throw — at ddcw-shell.js:565,
// `FBE.makeGraph(unit.programs[programKey])`, because there is no
// `programs` map either, forty-five lines BEFORE the missing
// `wireControls` would have been reached. (Quoted so a reader who hits
// the generic TypeError can grep it: the real message names neither
// this file nor the contract.) No page loads this file, so nothing is
// broken by that —
// the file is inert at runtime and reachable only from an
// engine-direct spec. The graphic, the hand controls and the
// `create(cfg)` assembly land in the AHU graphic lane; the sample
// programs land in the AHU program lane. Read an absent method as
// "not this lane", never as an unfinished edit.
//
// Loaded as a *classic* script (no type="module"), same convention as
// /scripts/ddcw-shell.js — see that header for the consuming page's
// full script order once one exists. Requires /scripts/psychro-engine.js
// loaded first: `P_STD` is read at LOAD for the `P` constant, and
// `Psychro` plus the bare-name primitive `satHumRatio` are read per
// tick.
// The 11ty build copies this file through unchanged, so it is already
// published at /scripts/ddcw-ahu-unit.js — unreferenced, not hidden.
//
// FILE LAYOUT — one banner today, and the split it names is
// load-bearing:
//
//   PHYSICS (DOM-free): constants, the TUNE BY FEEL block, the plant
//       factory, the mixing box → HW coil → DX coil → fan air-path
//       solver, the zone integrator, and the point list. NOTHING in
//       this file reads `document` or `window`, so a vm context that
//       has loaded psychro-engine.js can load it and drive
//       plant-in / plant-out physics headless.
//   DOM (graphic + controls): absent — see the scope note above. When
//       it lands it goes below its own banner, and every element
//       handle resolves inside bindDom() called from wireControls,
//       never at load, exactly as the FCU does.
//
// API (window.DDCWAhuUnit) — the headless physics surface, all of it:
//
//   DDCWAhuUnit.createPlant()          → a fresh plant
//   DDCWAhuUnit.update(plant, dtSim)   → integrate one step
//   DDCWAhuUnit.points                 → the AHU point list
//
// The points key is lower-case `points`, not the FCU's `POINTS`,
// because there is no `create(cfg)` here to map it: this namespace key
// IS the shell-contract key it will populate (`unit.points`), so the
// two cannot drift while the assembly half is missing.
//
// BINDING INVARIANT (shared with the shell): a point's id === the seed
// FBE-block id in every program === the IO block the programs author.
// No program authors an AHU block yet, so EVERY point is currently
// unbound — which is safe in one direction and not the other, and the
// program lane owes the difference: the shell's binding driver silently
// skips an unauthored SENSOR or param, but an unauthored ACTUATOR gets
// its slot 16 released every tick and rests at its relinquishDefault,
// announced in the off-program window. Both are correct behaviour for
// a machine with no sequence loaded.
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
// Consumers: none yet (see the scope note).
// Tests: tests/ddcw-ahu-unit.spec.js pins the physics invariants
// engine-direct (directions, orderings, clamp bands, contract shapes —
// never feel-constant values); tests/psychro-mixstreams.spec.js pins
// the mixing helper this file's mixed-air state is built on.
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
            // the publish step walks it. Only `space-temp` has an entry
            // today — an id with no entry simply cannot be forced, so
            // adding one is the whole cost of making another sensor
            // overridable.
            override: { 'space-temp': { active: false, value: 76 } },
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
        // for. (Deliberately no claim here about how cold the OA knob
        // goes — this file declares no range for `oat`, the DOM half
        // owns that control, and the figure belongs with whatever sets
        // it. An earlier draft said "the coldest day the sliders
        // reach (0 °F)", which the fog paragraph below then contradicted
        // 12 lines later.)
        //
        // FOGGING IS REACHABLE, AND THIS MODEL DROPS THE WATER. Mixing
        // 50 %-RH return air into cold dry outdoor air lands the mixture
        // above the saturation curve well inside the knob ranges — at the
        // shipped RH assumptions, from about −2 °F outdoor at a 50 %
        // damper against a 72 °F zone, or at a plain 0 °F once the damper
        // is at 50 % or more against a 76 °F zone, and across a large
        // corner of the spec's own sweep grid. Psychro.mixStreams re-solves the mixed
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
        // %OA·OAT + %RA·RAT: about 0.5 °F just past the crossing, 2 °F at
        // 0 °F outdoor with the damper at 60 %, 6.6 °F at the −20 °F /
        // 70 % corner, and 13.6 °F at the coldest-and-most-open pair the
        // space-temp band reaches (zone 90 °F, 65 % damper, −30 °F). That
        // is real psychrometrics, not a modelling slip — but it means the
        // three pages named above still print the plain blend for inputs
        // where this model prints the re-solved value, because they do
        // their mixing inline and have not adopted Psychro.mixStreams yet
        // (codebase-issues #228). A MAT that a reader's own arithmetic
        // cannot reproduce needs to SAY it is a fogging mixture, which is
        // a graphic question, not a physics one — logged as
        // codebase-issues #240 for the DOM half.
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
            // BOTH clamps below live inside `capActive`, and that is the
            // load-bearing part. A de-energized DX coil is a passive heat
            // exchanger: with the clamps outside, a shut valve and two
            // dead compressors on a design-cold morning painted DAT − MAT
            // = +55 °F — the plant doing the sequence's freeze protection
            // for it, and hiding the "someone deleted the min-OA block"
            // fault the damper note above says must stay showable.
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
        // FCU's safeties sheet carries no airflow proof and its DAT
        // low-limit inherits that hole). The new fan-status BI is what
        // a correct sequence interlocks on instead, and this branch is
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
        d.matT        = matT;
        d.afterHeatT  = afterHeat.ok ? afterHeat.tdb : matT;   // quasi-static (only the coil section is lagged)
        d.coilLeaveT  = coilLeaveT;                            // LAGGED
        d.datT        = datT;
        // Moisture at the two coil-section boundaries — observability
        // only today (no consumer), and the pair a heating coil is
        // supposed to leave equal. lb_water / lb_dry-air.
        d.matW        = mixState.ok ? mixState.W : 0;
        d.afterHeatW  = afterHeat.ok ? afterHeat.W : 0;
        // Commanded positions, and what the plant made of each.
        d.damperPct   = damperPct;
        d.oaFrac      = oaFrac;
        d.hwValvePct  = hwPct;
        d.hwFrac      = hwFrac;
        d.fanPct      = fanPct;
        // Discrete state — the three airflow facts stay distinct all the
        // way to the paint layer.
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
        { id: 'cooling-setpoint', kind: 'param', dir: 'param',    plantKey: 'cooling-setpoint', name: 'Cool SP',   unit: '°F', conv: 'temp' },
        { id: 'heating-setpoint', kind: 'param', dir: 'param',    plantKey: 'heating-setpoint', name: 'Heat SP',   unit: '°F', conv: 'temp' },
        // PER-SETPOINT hysteresis, NOT the gap between the two above:
        // cooling makes at cooling-setpoint + this and breaks at
        // cooling-setpoint. The heating/cooling separation is the
        // SETPOINT GAP (the graphic's SP DIFF well) — nothing sets it,
        // it follows whichever setpoint moves, and it is not a param.
        { id: 'deadband',         kind: 'param', dir: 'param',    plantKey: 'deadband',         name: 'Deadband',  unit: '°F', conv: 'deltaTemp' },
        { id: 'min-oa-pos',       kind: 'param', dir: 'param',    plantKey: 'min-oa-pos',       name: 'Min OA',    unit: '%' },
        // Fixed dry-bulb high limit, above the differential enable
        // (OAT < RAT). economizers.html derives ~62.4 °F as the
        // worst-case fixed limit for 75 °F / 50 % return air — the
        // point above which outdoor air can carry MORE total heat than
        // the return despite being cooler. 62 sits just under that, and
        // is deliberately not the inherited 65 or 70 the lesson argues
        // against.
        { id: 'econ-lockout',     kind: 'param', dir: 'param',    plantKey: 'econ-lockout',     name: 'Econ Lock', unit: '°F', conv: 'temp' },
    ];

    return {
        // The headless physics surface — DOM-free by construction (see
        // the PHYSICS banner); what an engine-direct spec drives, and
        // all this file exposes. `create(cfg)` and the shell-contract
        // methods land with the graphic lane.
        createPlant: ahuCreatePlant,
        update: ahuUpdate,
        points: AHU_POINTS,
    };
})();

if (typeof window !== 'undefined') { window.DDCWAhuUnit = DDCWAhuUnit; }
