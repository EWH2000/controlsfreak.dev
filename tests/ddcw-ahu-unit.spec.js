// Engine-direct tests for /scripts/ddcw-ahu-unit.js — the AHU physics
// core. Lives under tests/*.spec.js so the same `npm test` (Playwright)
// runner picks it up — Playwright workers are Node processes, the
// `page` fixture is just unused here.
//
// LOADER: ddcw-ahu-unit.js reads `Psychro` + `P_STD` at load, so the
// two classic scripts run sequentially in ONE vm context — scripts in
// the same context share a global lexical scope, so the unit file sees
// psychro-engine's top-level consts even though neither attaches to
// the context bag. The bare context IS an assertion: this unit file is
// the PHYSICS half and nothing else, so it promises to read neither
// `document` nor `window`, and a violation throws ReferenceError right
// here.
//
// SCOPE: the file under test ships NO DOM half and no `create(cfg)` —
// it does not yet satisfy the shell's unit contract, deliberately (see
// its header). One row below pins that absence, so the day the graphic
// lane adds the missing methods, this file is the thing that notices.
//
// POLICY — INVARIANTS, NOT FEEL CONSTANTS. The TUNE BY FEEL block
// (C_ZONE / UA_ENV / COIL_TAU / FAN_HEAT / PROOF_MAKE_DELAY / the
// default knobs) is owner-tunable by design, and the rough constants
// (STAGE_Q* / HW_QSENS_MAX / COIL_FLOOR / NOMINAL_CFM / the RH
// assumptions) are first-cut engineering guesses. Nothing below pins
// any of their values. Every row asserts a DIRECTION, an ORDERING, a
// CLAMP BAND, or a CONTRACT SHAPE — the things a retune must preserve
// for the machine to still teach what it teaches:
//   more outdoor air drags MAT toward the outdoor temperature; the
//   mixed air always lands between its two sources; the heating coil
//   raises dry-bulb and leaves humidity ratio alone; the DX coil
//   lowers it; ΔT is DAT − MAT and its SIGN says which coil is
//   working; stage 2 outcools stage 1; an ENERGIZED coil holds a
//   freeze floor and a de-energized one invents nothing; a starved
//   coil pins at that floor rather than quitting; the heating coil
//   holds a leaving-air ceiling; a broken belt keeps the command and
//   loses the proof; proof makes slowly and breaks at once; DAT goes
//   blind the tick the air stops, not on the coil lag; an override
//   splits sensed from truth while the return probe keeps reading
//   truth.
//
// ANTI-VACUITY IS PART OF THE POLICY. A clamp row that never reaches
// its clamp is a green row asserting nothing, and this file shipped
// two of them: the freeze sweep never varied `oaT`, so `afterHeatT`
// sat near 76 °F and the ceiling could not bind, and the blind-DAT row
// used a quasi-static probe where the coil target already IS the zone,
// so it could not tell the branch from its own mutant. Where a row
// exists to pin a clamp or a branch, it carries a probe proving the
// sweep got there.
//
// ONE ROW BELOW GUARDS A BEHAVIOUR THE FEEL CONSTANTS PRODUCE, and the
// distinction is the whole reason it is phrased the way it is. Q_INT_DEF
// was tuned (owner ruling 2026-07-29) so stage 1 reaches its own off
// point on the default day instead of holding the space at 100 % duty
// forever. The VALUE stays unpinned — no row asserts 8,000 Btu/h and no
// row asserts the balance temperature — but "it cycles" is a teaching
// claim the file's own comment makes, and a retune that quietly takes it
// away should not pass. So the row asserts the OUTCOME (an off point is
// reached, and reached again after a re-make, so duty is under 100 %),
// which every retune in the tuned direction — less gain, more capacity,
// any pace — keeps green.
//
// The quasi-static probe: a fresh plant leaves coilLeaveT unseeded, so
// the first update seeds the coil lag directly to its target — and a
// dt of 0 (which passes the isFinite gates) integrates nothing. One
// update(plant, 0) therefore yields the exact steady-state air-path
// solution for the mutated actuator state, with zero trajectory noise.

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

const SCRIPTS = path.join(__dirname, '..', 'html', 'scripts');

function loadUnit() {
    const ctx = vm.createContext({});
    ['psychro-engine.js', 'ddcw-ahu-unit.js'].forEach((f) => {
        vm.runInContext(
            fs.readFileSync(path.join(SCRIPTS, f), 'utf8'), ctx, { filename: f });
    });
    return vm.runInContext('DDCWAhuUnit;', ctx);
}

// Quasi-static probe (see header): steady-state derived.* for a
// mutated plant state, no integration.
function quasi(Unit, mutate) {
    const plant = Unit.createPlant();
    if (mutate) mutate(plant);
    plant.coilLeaveT = undefined;
    Unit.update(plant, 0);
    return plant;
}

// Trajectory run: integrate a mutated fresh plant N steps of dt sim-s.
function run(Unit, mutate, steps, dt) {
    const plant = Unit.createPlant();
    if (mutate) mutate(plant);
    for (let i = 0; i < steps; i++) Unit.update(plant, dt);
    return plant;
}

// Run until the airflow proof makes, capped. A fixed tick count would
// be an undeclared assertion that PROOF_MAKE_DELAY is under it — a
// ceiling on a TUNE BY FEEL constant, which this file promises not to
// set. A row whose SETUP goes red on a retune points the reader at the
// wrong thing.
function runToProof(Unit, mutate) {
    const plant = Unit.createPlant();
    if (mutate) mutate(plant);
    for (let i = 0; i < 600 && !plant.sensors['fan-status']; i++) Unit.update(plant, 1);
    return plant;
}

// Stage-1 control, supplied by the SPEC because the AHU program lane has
// not landed yet. It is the staging convention the FCU's own sample
// sheets use and the AHU's TUNE BY FEEL block names — the SETPOINT IS
// THE CUT-OUT: stage 1 makes above `cooling-setpoint + deadband` and
// breaks below `cooling-setpoint`, with the band read off the plant's own
// params so a setpoint or deadband retune moves the rule with it.
function stage1Control(plant) {
    const sp = plant.params['cooling-setpoint'];
    const db = plant.params['deadband'];
    const t  = plant.sensors['space-temp'];
    if (t > sp + db) plant.actuators.y1 = true;
    if (t < sp)      plant.actuators.y1 = false;
}

// The AHU's coil ΔT — SIGNED, leaving minus entering, and entering on
// this machine is the MIXED air, because the mixing box sits between
// the return and the coils (owner ruling: ΔT is DAT − MAT). Negative
// while cooling, positive while heating; that sign is the reason
// abs() was rejected.
function coilDt(plant) {
    return plant.derived.datT - plant.derived.matT;
}

test.describe('ddcw-ahu-unit: headless loading and scope', () => {

    test('the physics surface loads without window or document', () => {
        // loadUnit() runs the file in a bare context — the load itself
        // is the proof (a document/window read at load would
        // ReferenceError). Here: the headless API came through.
        const Unit = loadUnit();
        ['createPlant', 'update'].forEach((m) => {
            expect(typeof Unit[m], m).toBe('function');
        });
        expect(Array.isArray(Unit.points)).toBe(true);
    });

    test('the shell-contract half is deliberately absent', () => {
        // This lane ships physics only. The file's header says the
        // exported object does NOT satisfy DDCWShell.createWorkbench,
        // and this row is what keeps that statement honest — when the
        // graphic lane lands the methods, this test fails and the
        // header note comes out with it.
        const Unit = loadUnit();
        ['create', 'renderUnit', 'syncControls', 'wireControls',
         'initAnim', 'onResize'].forEach((m) => {
            expect(Unit[m], m + ' is not this lane').toBeUndefined();
        });
    });
});

test.describe('ddcw-ahu-unit: point-list contract', () => {

    test('the roster is the one the design fixed', () => {
        // 5 AI + 1 BI + 3 AO + 3 BO + 5 params, named. The roster is a
        // DESIGN ruling (docs/air-side-sim.md), not an implementation
        // detail, so adding or dropping one has to be a deliberate edit
        // here as well as there.
        const Unit = loadUnit();
        expect(Unit.points.map((p) => p.id).sort()).toEqual([
            'cooling-setpoint', 'dat', 'deadband', 'econ-lockout',
            'fan-enable', 'fan-speed', 'fan-status', 'heating-setpoint',
            'hw-valve', 'mat', 'min-oa-pos', 'oa-damper', 'oat', 'rat',
            'space-temp', 'y1', 'y2',
        ]);
    });

    test('every actuator point carries a relinquishDefault of its own kind', () => {
        // The shell has NO fallback table — a missing relinquishDefault
        // resolves to undefined on release. This is the loud-failure
        // contract, asserted before it can reach a page.
        const Unit = loadUnit();
        const actuators = Unit.points.filter((p) => p.dir === 'actuator');
        expect(actuators.length).toBeGreaterThan(0);
        actuators.forEach((p) => {
            expect(p.relinquishDefault, p.id + ' relinquishDefault').not.toBeUndefined();
            if (p.kind === 'bo') expect(typeof p.relinquishDefault, p.id).toBe('boolean');
            if (p.kind === 'ao') expect(typeof p.relinquishDefault, p.id).toBe('number');
        });
    });

    test('a fully relinquished machine rests stopped and closed', () => {
        // Every relinquishDefault is chosen so that losing the whole
        // priority array parks the unit safe: no fan, no compressor,
        // both control devices shut. A future edit that parks the
        // damper or the valve open has to argue with this row.
        const Unit = loadUnit();
        const rest = {};
        Unit.points.filter((p) => p.dir === 'actuator')
            .forEach((p) => { rest[p.id] = p.relinquishDefault; });
        expect(rest['fan-enable'], 'fan rests off').toBe(false);
        expect(rest['y1'], 'stage 1 rests off').toBe(false);
        expect(rest['y2'], 'stage 2 rests off').toBe(false);
        expect(rest['fan-speed'], 'speed reference rests at zero').toBe(0);
        expect(rest['oa-damper'], 'damper rests closed').toBe(0);
        expect(rest['hw-valve'], 'valve rests closed').toBe(0);
    });

    test('point ids are unique kebab-case, kind/dir pairs cohere, plantKey mirrors id', () => {
        const Unit = loadUnit();
        const KIND_DIR = { ai: 'sensor', bi: 'sensor', ao: 'actuator', bo: 'actuator', param: 'param' };
        const seen = new Set();
        Unit.points.forEach((p) => {
            expect(p.id, 'kebab-case id').toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
            expect(seen.has(p.id), 'duplicate id ' + p.id).toBe(false);
            seen.add(p.id);
            expect(KIND_DIR[p.kind], p.id + " kind '" + p.kind + "'").toBeDefined();
            expect(p.dir, p.id + ' dir').toBe(KIND_DIR[p.kind]);
            expect(typeof p.name, p.id + ' name').toBe('string');
            // The AHU keeps plantKey === id throughout, so there is one
            // name per point and no translation table to drift.
            expect(p.plantKey, p.id + ' plantKey mirrors id').toBe(p.id);
        });
    });

    test('every plantKey resolves on a fresh plant', () => {
        // The binding driver reads/writes plant.sensors / .actuators /
        // .params by plantKey — a key the plant factory doesn't seed
        // would bind silently to undefined.
        const Unit = loadUnit();
        const plant = Unit.createPlant();
        const SURFACE = { sensor: plant.sensors, actuator: plant.actuators, param: plant.params };
        Unit.points.forEach((p) => {
            expect(
                Object.prototype.hasOwnProperty.call(SURFACE[p.dir], p.plantKey),
                p.id + ' plantKey ' + p.plantKey + ' missing from plant.' + p.dir + 's',
            ).toBe(true);
        });
    });

    test('every °F point declares conv, deadband converts as a delta, percents declare none', () => {
        // `unit` cannot stand in for `conv`: a °F-labelled DELTA run
        // through the absolute formula prints −16.7 °C for a 2 °F band.
        // The reverse matters too — a `conv` on a percent point would
        // convert a damper position as a temperature.
        const Unit = loadUnit();
        Unit.points.forEach((p) => {
            if (p.unit === '°F') expect(['temp', 'deltaTemp'], p.id + ' conv').toContain(p.conv);
            if (p.unit === '%')  expect(p.conv, p.id + ' has no conv').toBeUndefined();
        });
        expect(Unit.points.find((p) => p.id === 'deadband').conv).toBe('deltaTemp');
        // Two independent setpoints, not one plus an offset — so that
        // overlapping them (a unit fighting itself) stays reachable.
        ['cooling-setpoint', 'heating-setpoint'].forEach((id) => {
            const p = Unit.points.find((q) => q.id === id);
            expect(p, id + ' exists').toBeTruthy();
            expect(p.dir).toBe('param');
        });
    });
});

test.describe('ddcw-ahu-unit: the mixing box', () => {

    test('more outdoor air drags MAT toward the outdoor temperature, both directions', () => {
        // The mixing lesson itself, and the one thing a reader can
        // check off the graphic with a calculator.
        const Unit = loadUnit();
        const matAt = (oat, damper) => quasi(Unit, (pl) => {
            pl.oaT = oat;
            pl.actuators['oa-damper'] = damper;
        }).derived.matT;

        // Cold outside: opening the dampers pulls MAT down, monotonically.
        let prev = matAt(10, 0);
        [20, 50, 80, 100].forEach((d) => {
            const cur = matAt(10, d);
            expect(cur, 'cold day, damper ' + d + '%').toBeLessThan(prev);
            prev = cur;
        });

        // Hot outside: the same move pushes MAT up.
        prev = matAt(95, 0);
        [20, 50, 80, 100].forEach((d) => {
            const cur = matAt(95, d);
            expect(cur, 'hot day, damper ' + d + '%').toBeGreaterThan(prev);
            prev = cur;
        });
    });

    test('MAT lands between OAT and RAT for any damper position, and pins at the ends', () => {
        // A CLAMP BAND on the mix, swept across weather and position —
        // including the two ends, where the mix must BE one of its
        // sources rather than merely approach it.
        const Unit = loadUnit();
        [-10, 10, 40, 68, 95, 110].forEach((oat) => {
            for (let d = 0; d <= 100; d += 10) {
                const pl = quasi(Unit, (p) => {
                    p.oaT = oat;
                    p.actuators['oa-damper'] = d;
                });
                const lo = Math.min(oat, pl.zoneT);
                const hi = Math.max(oat, pl.zoneT);
                const label = 'OAT ' + oat + ' / damper ' + d + '%';
                expect(pl.derived.matT, label + ' floor').toBeGreaterThanOrEqual(lo - 1e-9);
                expect(pl.derived.matT, label + ' ceiling').toBeLessThanOrEqual(hi + 1e-9);
            }
            const shut = quasi(Unit, (p) => { p.oaT = oat; p.actuators['oa-damper'] = 0; });
            expect(shut.derived.matT, 'dampers shut → all return air').toBeCloseTo(shut.zoneT, 9);
            const wide = quasi(Unit, (p) => { p.oaT = oat; p.actuators['oa-damper'] = 100; });
            expect(wide.derived.matT, 'dampers wide → all outdoor air').toBeCloseTo(oat, 6);
        });
    });

    test('the damper command is obeyed with no plant-side minimum, and clamps out of range', () => {
        // Minimum outdoor air is the SEQUENCE's job. A plant-side floor
        // would silently do the program's work and make a deleted
        // min-OA block undemonstrable — the fault most worth showing.
        // Out-of-range commands still clamp to a physical fraction.
        const Unit = loadUnit();
        const closed = quasi(Unit, (pl) => { pl.actuators['oa-damper'] = 0; });
        expect(closed.derived.oaFrac, 'zero really means zero').toBe(0);
        expect(closed.params['min-oa-pos'], 'the minimum lives on a param, unused by physics')
            .toBeGreaterThan(0);

        expect(quasi(Unit, (pl) => { pl.actuators['oa-damper'] = 150; }).derived.oaFrac).toBe(1);
        expect(quasi(Unit, (pl) => { pl.actuators['oa-damper'] = -40; }).derived.oaFrac).toBe(0);
    });

    test('with no airflow the mixed air is the return air', () => {
        // The fraction is moot when nothing moves — the casing air came
        // from the return.
        const Unit = loadUnit();
        const off = quasi(Unit, (pl) => {
            pl.actuators['fan-enable'] = false;
            pl.actuators['oa-damper'] = 100;
            pl.oaT = -10;
        });
        expect(off.derived.airflowOn).toBe(false);
        expect(off.derived.matT).toBe(off.zoneT);
    });
});

test.describe('ddcw-ahu-unit: the coil section (quasi-static)', () => {

    test('the heating coil raises dry-bulb and leaves humidity ratio alone', () => {
        // A heating coil rides W through unchanged — no latent term.
        // The DIRECTION plus the conserved quantity, monotone in the
        // valve position.
        const Unit = loadUnit();
        const cold = (hw) => quasi(Unit, (pl) => {
            pl.oaT = 20;
            pl.zoneT = 68;
            pl.actuators.y1 = false;
            pl.actuators['hw-valve'] = hw;
        });
        const shut = cold(0);
        expect(shut.derived.afterHeatT).toBeCloseTo(shut.derived.matT, 9);

        let prev = shut.derived.afterHeatT;
        [25, 50, 75, 100].forEach((hw) => {
            const p = cold(hw);
            expect(p.derived.afterHeatT, 'valve ' + hw + '% warms the air').toBeGreaterThan(prev);
            expect(p.derived.afterHeatW, 'valve ' + hw + '% holds W').toBeCloseTo(p.derived.matW, 9);
            expect(p.derived.qHeat, 'valve ' + hw + '% carries load').toBeGreaterThan(0);
            prev = p.derived.afterHeatT;
        });
    });

    test('the heating coil holds a leaving-air ceiling, and W rides through it too', () => {
        // The mirror of the DX coil's freeze floor. qHeat is a fixed
        // Btu/h independent of airflow, so without a ceiling the leaving
        // dry-bulb rises without bound as the fan starves — past 212 °F,
        // where a saturation humidity ratio does not exist at sea level,
        // satHumRatio returns NEGATIVE, and buildState silently zeroes W.
        // That published a heating coil DRYING the air, breaking the
        // invariant the row above asserts, with no error anywhere.
        // Assert the BAND and the conserved quantity, never the value.
        const Unit = loadUnit();
        const at = (fan) => quasi(Unit, (pl) => {
            pl.oaT = 10;
            pl.zoneT = 68;
            pl.actuators['hw-valve'] = 100;
            pl.actuators['fan-speed'] = fan;
            pl.actuators.y1 = false;
        }).derived;

        let sawCeilingBind = false;
        let prev = null;
        [100, 60, 40, 30, 25, 20, 10, 5].forEach((fan) => {
            const d = at(fan);
            const tag = 'fan ' + fan + '%';
            expect(isFinite(d.afterHeatT), tag + ' finite').toBe(true);
            expect(d.afterHeatT, tag + ': the coil still heats').toBeGreaterThan(d.matT);
            // Not a band on HW_LEAVE_MAX — a band on the ENGINE. Above
            // 212 °F at sea level a saturation humidity ratio does not
            // exist, so any leaving state up there is outside the math's
            // validity, whatever the feel constant is retuned to.
            expect(d.afterHeatT, tag + ': and stays inside the engine’s envelope')
                .toBeLessThan(212);
            expect(d.afterHeatW, tag + ': W rides through unchanged').toBeCloseTo(d.matW, 12);
            expect(d.afterHeatW, tag + ': and is not zeroed').toBeGreaterThan(0);
            // The published load is what the AIR absorbed, so it cannot
            // outrun the temperatures once the ceiling binds.
            expect(d.qHeat, tag + ': the load matches the air path').toBeGreaterThan(0);
            // Anti-vacuity: less air over a fixed load deepens the rise,
            // UNTIL the ceiling takes over and it stops. Seeing that
            // stop is the proof the clamp is doing something.
            if (prev !== null && d.afterHeatT <= prev + 1e-9) sawCeilingBind = true;
            prev = d.afterHeatT;
        });
        expect(sawCeilingBind, 'the sweep starved the fan past the ceiling').toBe(true);

        // Two flows deep inside the clamped region land on the SAME
        // leaving temperature — a shared cap, not a per-flow curve — and
        // the load falls with the air that has to carry it.
        expect(at(5).afterHeatT, 'the ceiling is a shared cap')
            .toBeCloseTo(at(10).afterHeatT, 9);
        expect(at(5).qHeat, 'and the load falls with the airflow')
            .toBeLessThan(at(10).qHeat);
    });

    test('the DX coil cools whatever the heating coil hands it', () => {
        const Unit = loadUnit();
        const on = quasi(Unit, (pl) => { pl.actuators.y1 = true; });
        expect(on.derived.coilLeaveT).toBeLessThan(on.derived.afterHeatT);
        expect(on.derived.capActive).toBe(true);

        const idle = quasi(Unit, (pl) => { pl.actuators.y1 = false; });
        expect(idle.derived.stage).toBe(0);
        expect(idle.derived.coilLeaveT).toBeCloseTo(idle.derived.afterHeatT, 9);
    });

    test('ΔT is signed: negative under the DX coil, positive under the HW coil', () => {
        // The whole reason abs() was rejected. DAT − MAT, on the pair
        // the badge will paint.
        const Unit = loadUnit();
        const cooling = quasi(Unit, (pl) => { pl.actuators.y1 = true; pl.actuators.y2 = true; });
        expect(coilDt(cooling), 'cooling drives the air down').toBeLessThan(0);

        const heating = quasi(Unit, (pl) => {
            pl.oaT = 20;
            pl.zoneT = 66;
            pl.actuators.y1 = false;
            pl.actuators['hw-valve'] = 60;
        });
        expect(coilDt(heating), 'heating drives the air up').toBeGreaterThan(0);

        // Fan running, neither coil called: the only thing left is fan
        // heat, so the delta is small and POSITIVE — the motor is the
        // last piece of equipment in the air path. "Small" is asserted
        // as an ORDERING against a real coil delta, not as a band: in
        // this probe the fan-only delta IS FAN_HEAT exactly, so a bare
        // `< 3` would be a ceiling on a TUNE BY FEEL constant whose own
        // comment argues for raising it (a hot mechanical room), with
        // 3× headroom.
        const neither  = quasi(Unit, (pl) => { pl.actuators.y1 = false; });
        const oneStage = quasi(Unit, (pl) => { pl.actuators.y1 = true; });
        expect(coilDt(neither)).toBeGreaterThan(0);
        expect(Math.abs(coilDt(neither)), 'fan heat is small beside a working coil')
            .toBeLessThan(Math.abs(coilDt(oneStage)));

        // No airflow: both sensors read the zone, so the delta is zero.
        const still = quasi(Unit, (pl) => { pl.actuators['fan-enable'] = false; });
        expect(coilDt(still)).toBeCloseTo(0, 9);
    });

    test('stage 2 pulls a deeper ΔT than stage 1, and the count is ADDITIVE', () => {
        // Additive, NOT the FCU's Y2-implies-Y1 interlock: one
        // energized stage is one stage of capacity whichever one it is,
        // so a sequence that calls Y2 without Y1 delivers half — which
        // is diagnosable, where an interlock would hide the miswire.
        const Unit = loadUnit();
        const at = (y1, y2) => quasi(Unit, (pl) => { pl.actuators.y1 = y1; pl.actuators.y2 = y2; });
        expect(at(false, false).derived.stage).toBe(0);
        expect(at(true, false).derived.stage).toBe(1);
        expect(at(false, true).derived.stage, 'y2 alone is ONE stage').toBe(1);
        expect(at(true, true).derived.stage).toBe(2);
        expect(coilDt(at(false, true)), 'y2 alone matches y1 alone')
            .toBeCloseTo(coilDt(at(true, false)), 9);
        expect(coilDt(at(true, true)), 'both stages outcool one')
            .toBeLessThan(coilDt(at(true, false)));
    });

    test('more fan → shallower coil ΔT at a fixed stage (monotone, both stages)', () => {
        // The same load spread over more air is a shallower ΔT. Signed
        // convention: cooling is negative, so "shallower" is CLOSER TO
        // ZERO. Fan values stay above the floor-clamp region so the
        // ordering is strict.
        const Unit = loadUnit();
        [1, 2].forEach((stage) => {
            const dts = [50, 75, 100].map((fan) => coilDt(quasi(Unit, (pl) => {
                pl.actuators['fan-speed'] = fan;
                pl.actuators.y1 = stage >= 1;
                pl.actuators.y2 = stage >= 2;
            })));
            expect(dts[0], 'stage ' + stage + ' 50% vs 75%').toBeLessThan(dts[1]);
            expect(dts[1], 'stage ' + stage + ' 75% vs 100%').toBeLessThan(dts[2]);
            expect(dts[2], 'stage ' + stage + ' ΔT at 100% stays negative').toBeLessThan(0);
        });
    });

    test('a fault collapses the DX capacity to zero ΔT', () => {
        // The "no ΔT over the coil" diagnostic: an energized-but-faulted
        // compressor moves no heat, so the coil leaves at its entering
        // air EXACTLY (zero load through the psych solver is an
        // identity) and only fan heat remains.
        const Unit = loadUnit();
        const healthy = quasi(Unit, (pl) => { pl.actuators.y2 = true; });
        expect(coilDt(healthy)).toBeLessThan(-3);
        const faulted = quasi(Unit, (pl) => {
            pl.actuators.y2 = true;
            pl.conditions.fault = 'low-charge';
        });
        expect(faulted.derived.capActive).toBe(false);
        expect(faulted.derived.coilLeaveT).toBeCloseTo(faulted.derived.matT, 9);
    });

    test('the coil holds a freeze floor and never leaves above its entering air while cooling', () => {
        // Sweep WEATHER × damper × fan × stage × fault. Two clamps close
        // the cooling model: a floor keeps a starved coil above freezing
        // (COIL_FLOOR is a rough constant — assert the BAND, not the
        // value), and a cooling coil can never leave WARMER than the air
        // it was handed. The 5%-fan extreme also pins solver-failure
        // muting: an impossible load-per-cfm falls back to the floor,
        // never to NaN and never to no-cooling.
        //
        // The oaT and damper axes are load-bearing, not thoroughness.
        // Without them afterHeatT is pinned near 76 °F by the default
        // day, the floor can never bind at stage 0, and the ceiling
        // assertion passes vacuously — which is exactly how a freeze
        // clamp that fired on a DE-ENERGIZED coil (inventing up to
        // 55 °F of rise across two dead coils) shipped green.
        const Unit = loadUnit();
        let sawFloorBind = false;
        [-10, 10, 35, 55, 80, 95].forEach((oat) => {
            [0, 50, 100].forEach((damper) => {
                [5, 30, 60, 100].forEach((fan) => {
                    [0, 1, 2].forEach((stage) => {
                        ['none', 'low-charge'].forEach((fault) => {
                            const p = quasi(Unit, (pl) => {
                                pl.oaT = oat;
                                pl.actuators['oa-damper'] = damper;
                                pl.actuators['fan-speed'] = fan;
                                pl.actuators.y1 = stage >= 1;
                                pl.actuators.y2 = stage >= 2;
                                pl.conditions.fault = fault;
                            });
                            const label = 'OAT ' + oat + ' / damper ' + damper
                                + '% / fan ' + fan + '% / stage ' + stage + ' / ' + fault;
                            expect(isFinite(p.coilLeaveT), label + ' finite').toBe(true);
                            // Floor, but only where a coil could hold one:
                            // handed air already below freezing, a DX coil
                            // cannot warm it back up.
                            const floor = Math.min(32, p.derived.afterHeatT);
                            expect(p.coilLeaveT, label + ' floor').toBeGreaterThanOrEqual(floor - 1e-9);
                            expect(p.coilLeaveT, label + ' ceiling')
                                .toBeLessThanOrEqual(p.derived.afterHeatT + 1e-9);
                            if (p.derived.capActive && p.coilLeaveT >= 32
                                && p.coilLeaveT < p.derived.afterHeatT - 20) sawFloorBind = true;
                        });
                    });
                });
            });
        });
        // Anti-vacuity: the sweep has to REACH a starved running coil,
        // or the floor half of the row proves nothing.
        expect(sawFloorBind, 'the sweep reached a starved, energized coil').toBe(true);
    });

    test('a de-energized coil is passive — no clamp invents heat across it', () => {
        // The freeze floor belongs to an ENERGIZED evaporator. With the
        // compressors off (or faulted) the DX coil is a passive heat
        // exchanger, so the air leaves exactly as it arrived however
        // cold that is — which is what keeps "someone deleted the
        // min-OA block on a design-cold morning" demonstrable instead of
        // silently protected by the plant.
        const Unit = loadUnit();
        [['stage 0', (pl) => { pl.actuators.y1 = false; }],
         ['faulted', (pl) => { pl.actuators.y1 = true; pl.actuators.y2 = true;
                               pl.conditions.fault = 'low-charge'; }]].forEach(([label, stageMut]) => {
            [-20, 0, 20].forEach((oat) => {
                const p = quasi(Unit, (pl) => {
                    pl.oaT = oat;
                    pl.actuators['oa-damper'] = 100;      // the deleted min-OA block
                    pl.actuators['hw-valve'] = 0;
                    stageMut(pl);
                });
                const tag = label + ' at OAT ' + oat;
                expect(p.derived.capActive, tag + ': nothing is transferring heat').toBe(false);
                expect(p.derived.coilLeaveT, tag + ': the coil passes the air through')
                    .toBeCloseTo(p.derived.afterHeatT, 9);
                expect(coilDt(p), tag + ': the only ΔT is the fan')
                    .toBeCloseTo(p.derived.datT - p.derived.coilLeaveT, 9);
            });
        });

        // …and a partly-open heating valve moves DAT from its very first
        // percent of stroke, rather than disappearing under a clamp.
        let prev = null;
        [0, 10, 20, 30].forEach((hw) => {
            const p = quasi(Unit, (pl) => {
                pl.oaT = 20;
                pl.actuators['oa-damper'] = 100;
                pl.actuators['hw-valve'] = hw;
                pl.actuators.y1 = false;
            });
            if (prev !== null) {
                expect(p.derived.datT, 'valve ' + hw + '% is visible at the discharge')
                    .toBeGreaterThan(prev);
            }
            prev = p.derived.datT;
        });
    });

    test('a starved DX coil pins at its floor — it does not stop cooling', () => {
        // The solver-failure path. Below a certain airflow the requested
        // load per cfm drives the psych inversion past bone-dry and it
        // returns ok:false. That is a coil that ran out of AIR, and the
        // fallback has to keep it cold: falling back to the entering air
        // gave a RUNNING coil a zero ΔT — this model's own signature for
        // a faulted compressor — and made the ΔT non-monotone in
        // airflow, so one step of the fan slider flipped the DX coil
        // into a heater.
        const Unit = loadUnit();
        [1, 2].forEach((stage) => {
            let prev = null;
            [30, 20, 15, 10, 8, 5, 3].forEach((fan) => {
                const p = quasi(Unit, (pl) => {
                    pl.actuators['fan-speed'] = fan;
                    pl.actuators.y1 = stage >= 1;
                    pl.actuators.y2 = stage >= 2;
                });
                const tag = 'stage ' + stage + ' at fan ' + fan + '%';
                expect(p.derived.capActive, tag + ': the compressors are still called').toBe(true);
                expect(coilDt(p), tag + ': the coil is still cooling').toBeLessThan(0);
                expect(p.derived.qCool, tag + ': and still removing heat').toBeGreaterThan(0);
                // Less air over the same coil never removes MORE heat.
                if (prev !== null) {
                    expect(p.derived.qCool, tag + ': monotone in airflow')
                        .toBeLessThanOrEqual(prev + 1e-9);
                }
                prev = p.derived.qCool;
            });
        });
    });

    test('a unit fighting itself is reachable — both coils carry load at once', () => {
        // Two independent setpoints make overlapping them possible, and
        // the plant runs the result honestly instead of interlocking it
        // away. The DX coil undoes part of the heat it was handed: the
        // air leaves warmer than it entered and the machine burns both
        // fuels doing it.
        const Unit = loadUnit();
        const p = quasi(Unit, (pl) => {
            pl.actuators['hw-valve'] = 100;
            pl.actuators.y1 = true;
            pl.actuators.y2 = true;
        });
        expect(p.derived.qHeat, 'the valve is carrying load').toBeGreaterThan(0);
        expect(p.derived.capActive, 'and so are the compressors').toBe(true);
        expect(p.derived.afterHeatT, 'the heating coil warmed the air')
            .toBeGreaterThan(p.derived.matT);
        expect(p.derived.coilLeaveT, 'the DX coil took some of it back')
            .toBeLessThan(p.derived.afterHeatT);
    });
});

test.describe('ddcw-ahu-unit: airflow, proof, and the blind low-limit', () => {

    test('a broken belt keeps the command and loses the airflow', () => {
        // The three airflow facts stay distinct: fanCmd is what the
        // sequence asked for, airflowOn is whether air moves,
        // fan-status is what the proof switch reports. A belt fault
        // splits the first from the other two.
        const Unit = loadUnit();
        const pl = runToProof(Unit, null);
        expect(pl.sensors['fan-status'], 'healthy run proves airflow').toBe(true);

        pl.conditions.fault = 'fan-belt';
        Unit.update(pl, 1);
        expect(pl.derived.fanCmd, 'the sequence is still calling for the fan').toBe(true);
        expect(pl.derived.airflowOn, 'but no air moves').toBe(false);
        expect(pl.sensors['fan-status'], 'and the proof drops').toBe(false);
        expect(pl.anim.fanFrac, 'the blades stop').toBe(0);
    });

    test('with the air stopped, DAT reads the zone — the blind-limit case', () => {
        // KEEP this branch. A discharge low-limit watching DAT goes
        // BLIND the moment airflow stops, because DAT stops reporting
        // the coil (codebase-issues #225). fan-status is what a correct
        // sequence interlocks on instead — and the contrast is only
        // demonstrable if the plant models the blindness honestly.
        const Unit = loadUnit();
        ['fan-belt', 'none'].forEach((fault) => {
            const pl = quasi(Unit, (p) => {
                p.actuators.y2 = true;                  // full cooling called…
                p.conditions.fault = fault;
                if (fault === 'none') p.actuators['fan-enable'] = false;   // …and no air, either way
            });
            expect(pl.derived.airflowOn, fault).toBe(false);
            expect(pl.derived.datT, fault + ': DAT reads the zone, not the coil').toBe(pl.zoneT);
            expect(pl.sensors['dat'], fault).toBe(pl.zoneT);
            expect(pl.sensors['fan-status'], fault + ': and proof is down').toBe(false);
        });
    });

    test('DAT goes blind the instant airflow stops, not on the coil lag', () => {
        // The row above is a QUASI-STATIC probe, and with airflow off
        // the coil target is already zoneT — so coilLeaveT === zoneT and
        // `airflowOn ? coilLeaveT + FAN_HEAT : zoneT` returns the same
        // number as a `coilLeaveT + (airflowOn ? FAN_HEAT : 0)` that had
        // lost the branch entirely. It pins the fan-heat offset, not the
        // source. The blindness only shows on a TRAJECTORY, where the
        // coil metal is still cold when the air stops — and a discharge
        // low-limit that kept reading the cold coil after airflow
        // stopped would be the exact inverse of the lesson
        // (codebase-issues #225).
        const Unit = loadUnit();
        const pl = run(Unit, (p) => { p.actuators.y1 = true; p.actuators.y2 = true; }, 200, 1);
        expect(pl.derived.airflowOn, 'the healthy run is moving air').toBe(true);
        expect(pl.zoneT - pl.sensors['dat'], 'a real coil delta is showing').toBeGreaterThan(5);

        pl.conditions.fault = 'fan-belt';
        Unit.update(pl, 1);                              // ONE tick after the belt goes
        expect(pl.derived.airflowOn).toBe(false);
        expect(pl.zoneT - pl.coilLeaveT, 'the coil itself is still cold').toBeGreaterThan(5);
        expect(pl.sensors['dat'] - pl.coilLeaveT, 'DAT is not tracking the coil').toBeGreaterThan(5);
        expect(Math.abs(pl.sensors['dat'] - pl.zoneT), 'DAT reads the zone').toBeLessThan(0.5);
    });

    test('proof makes slowly and breaks at once', () => {
        // A duct-pressure switch is asymmetric, and the asymmetry is
        // the whole reason a sequence has to be written around it.
        // Assert the ORDERING — makes late, breaks on the very next
        // tick — never the delay's value.
        const Unit = loadUnit();
        const pl = Unit.createPlant();
        expect(pl.sensors['fan-status'], 'a fresh plant has not proved anything').toBe(false);

        let ticksToMake = 0;
        for (let i = 1; i <= 600 && !pl.sensors['fan-status']; i++) {
            Unit.update(pl, 1);
            ticksToMake = i;
        }
        expect(pl.sensors['fan-status'], 'proof eventually makes').toBe(true);
        expect(ticksToMake, 'it did not make on the first tick').toBeGreaterThan(1);

        // Break it: one tick, whatever its size.
        pl.actuators['fan-enable'] = false;
        Unit.update(pl, 1);
        expect(pl.sensors['fan-status'], 'proof breaks in a single tick').toBe(false);

        // And an interrupted run banks no credit toward the next make.
        pl.actuators['fan-enable'] = true;
        Unit.update(pl, 1);
        expect(pl.sensors['fan-status'], 'the make delay restarts from zero').toBe(false);
    });
});

test.describe('ddcw-ahu-unit: zone trajectory (integration)', () => {

    // 60 × 5 s = 300 sim-seconds — enough for the sign of the balance
    // to separate the runs cleanly at any sane tuning.
    const STEPS = 60;
    const DT = 5;

    test('energy-balance sign: gains push the zone up, cooling pulls it down, heat pushes it back', () => {
        const Unit = loadUnit();
        const start = Unit.createPlant().zoneT;
        const off = run(Unit, (pl) => {
            pl.actuators.y1 = false;
            pl.actuators['fan-enable'] = false;
        }, STEPS, DT);
        const cool = run(Unit, (pl) => { pl.actuators.y2 = true; }, STEPS, DT);
        expect(off.zoneT, 'cooling off under gains').toBeGreaterThan(start);
        expect(cool.zoneT, 'both stages overwhelm the gains').toBeLessThan(start);

        // A cold morning with the valve shut loses the zone; open it and
        // the same morning holds.
        const noHeat = run(Unit, (pl) => {
            pl.oaT = 10; pl.actuators.y1 = false;
        }, STEPS, DT);
        const heat = run(Unit, (pl) => {
            pl.oaT = 10; pl.actuators.y1 = false; pl.actuators['hw-valve'] = 100;
        }, STEPS, DT);
        expect(noHeat.zoneT, 'no heat on a cold morning').toBeLessThan(start);
        expect(heat.zoneT, 'the coil carries it').toBeGreaterThan(noHeat.zoneT);
    });

    test('stage 2 cools the zone faster than stage 1, and outdoor air is a real load', () => {
        const Unit = loadUnit();
        const s1 = run(Unit, (pl) => { pl.actuators.y1 = true; pl.actuators.y2 = false; }, STEPS, DT);
        const s2 = run(Unit, (pl) => { pl.actuators.y1 = true; pl.actuators.y2 = true; }, STEPS, DT);
        expect(s2.zoneT).toBeLessThan(s1.zoneT);

        // The outdoor-air load rides in on the supply air, so opening
        // the dampers on a hot day costs the zone.
        const min = run(Unit, (pl) => { pl.oaT = 95; pl.actuators['oa-damper'] = 20; }, STEPS, DT);
        const wide = run(Unit, (pl) => { pl.oaT = 95; pl.actuators['oa-damper'] = 80; }, STEPS, DT);
        expect(wide.zoneT, 'more hot outdoor air is a warmer zone').toBeGreaterThan(min.zoneT);

        // …and it is counted ONCE. At a fixed zone and outdoor temp the
        // damper position cannot move qGain, which carries only the
        // envelope and the internals; the ventilation load shows up in
        // qCool instead, as less net cooling delivered.
        const shut = quasi(Unit, (pl) => { pl.oaT = 95; pl.actuators['oa-damper'] = 20; });
        const open = quasi(Unit, (pl) => { pl.oaT = 95; pl.actuators['oa-damper'] = 80; });
        expect(shut.derived.qGain, 'qGain is envelope + internal only')
            .toBeCloseTo(open.derived.qGain, 9);
        expect(open.derived.qCool, 'the ventilation load lands in the supply-air term')
            .toBeLessThan(shut.derived.qCool);
    });

    test('coil lag: the leaving temp ramps toward target and a huge step cannot overshoot', () => {
        const Unit = loadUnit();
        const pl = Unit.createPlant();
        pl.actuators.y2 = true;
        Unit.update(pl, 0);                     // seed at the cold two-stage target
        const cold = pl.coilLeaveT;
        pl.actuators.y1 = false;
        pl.actuators.y2 = false;                // compressors drop out; fan keeps running
        Unit.update(pl, 1);                     // 1 sim-second later…
        expect(pl.coilLeaveT).toBeGreaterThan(cold);         // …warming toward the mixed air
        expect(pl.coilLeaveT).toBeLessThan(pl.derived.matT); // …but still cold (residual cooling)
        Unit.update(pl, 1e6);                   // a step far beyond any COIL_TAU
        // Math.min(1, dt/τ) lands the lag exactly ON that tick's own
        // target — never past it. With no capacity called the target is
        // the air the coils were handed, so compare against the same
        // tick's afterHeatT rather than a value read a step earlier.
        expect(pl.coilLeaveT).toBeCloseTo(pl.derived.afterHeatT, 9);
    });

    test('on the default day stage 1 reaches its off point and cycles', () => {
        // The arrival story the file's TUNE BY FEEL block promises: one DX
        // stage pulls the space down to its cut-out and CYCLES, rather
        // than holding it somewhere inside the deadband at 100 % duty —
        // which is what the shipped tuning did before 2026-07-29 (the
        // balance sat above the cut-out, so the stage never broke).
        //
        // Deliberately NOT a row on Q_INT_DEF or on the balance
        // temperature: both are feel constants. What is asserted is that
        // the off point is REACHED, that the stage makes again afterwards
        // so this is a cycle and not a latch, and that duty is therefore
        // under 100 %. Every retune in the tuned direction — less internal
        // gain, more stage capacity, a faster or slower zone — keeps all
        // three green; only a retune that gives the cycling back up goes
        // red, which is the point.
        //
        // Cap-and-break rather than a fixed run length, for the same
        // reason runToProof is written that way: a fixed tick count would
        // be an undeclared ceiling on C_ZONE. The cap is 12 sim-hours
        // against a measured ~82 sim-minutes to the first re-make at the
        // shipped tuning (~2.7 h even with the zone capacitance doubled),
        // and reaching it is the failure.
        const Unit = loadUnit();
        const DT = 5;
        const CAP_TICKS = Math.round(12 * 3600 / DT);
        const plant = Unit.createPlant();
        expect(plant.actuators.y1, 'the arrival state has stage 1 running').toBe(true);

        let ticks = 0, onTicks = 0, cutOuts = 0, reMakes = 0;
        let prev = plant.actuators.y1;
        for (let i = 0; i < CAP_TICKS; i++) {
            stage1Control(plant);
            Unit.update(plant, DT);
            ticks++;
            if (plant.actuators.y1) onTicks++;
            if (plant.actuators.y1 !== prev) {
                if (plant.actuators.y1) { if (cutOuts > 0) reMakes++; } else cutOuts++;
                prev = plant.actuators.y1;
            }
            if (cutOuts >= 1 && reMakes >= 1) break;
        }
        expect(cutOuts, 'stage 1 reached its off point (the zone crossed the cut-out)')
            .toBeGreaterThanOrEqual(1);
        expect(reMakes, 'and made again — a cycle, not a latch').toBeGreaterThanOrEqual(1);
        expect(onTicks / ticks, 'so the duty cycle is not 100 %').toBeLessThan(1);
        // The zone rode the band rather than diving through it: the
        // cut-out is the SETPOINT under this convention, so a zone that
        // ended far below it would mean the stage is not being released.
        expect(plant.zoneT, 'and the zone is back inside its own band')
            .toBeGreaterThan(plant.params['cooling-setpoint'] - 1);
    });

    test('zoneT safety clamps hold at both ends', () => {
        const Unit = loadUnit();
        const hot = Unit.createPlant();
        hot.zoneT = 130;
        Unit.update(hot, 1);
        expect(hot.zoneT).toBe(120);
        const cold = Unit.createPlant();
        cold.zoneT = 25;
        cold.oaT = -20;
        cold.actuators.y1 = false;
        cold.actuators['fan-enable'] = false;
        Unit.update(cold, 1);
        expect(cold.zoneT).toBe(40);
    });

    test('simSec accumulates sim seconds', () => {
        const Unit = loadUnit();
        const pl = Unit.createPlant();
        Unit.update(pl, 2);
        Unit.update(pl, 2);
        Unit.update(pl, 2);
        expect(pl.simSec).toBe(6);
    });

    test('non-finite inputs mute the tick without touching the integrated state', () => {
        // Validate-and-mute, headless: derived.invalid flags the paint
        // layer and the integrator never runs on the junk. Every read
        // the gate covers has to mute — a knob added to the gate later
        // without a row here would be untested.
        const Unit = loadUnit();
        [
            ['fan-speed actuator',  (pl) => { pl.actuators['fan-speed'] = NaN; }],
            ['oa-damper actuator',  (pl) => { pl.actuators['oa-damper'] = NaN; }],
            ['hw-valve actuator',   (pl) => { pl.actuators['hw-valve'] = Infinity; }],
            ['the outdoor knob',    (pl) => { pl.oaT = NaN; }],
            ['the load knob',       (pl) => { pl.qInternal = NaN; }],
            ['the zone state',      (pl) => { pl.zoneT = NaN; }],
        ].forEach(([label, mutate]) => {
            const pl = Unit.createPlant();
            mutate(pl);
            const z0 = pl.zoneT;
            Unit.update(pl, 5);
            expect(pl.derived.invalid, label).toBe(true);
            expect(pl.simSec, label + ' left the clock alone').toBe(0);
            if (isFinite(z0)) expect(pl.zoneT, label + ' left the zone alone').toBe(z0);
        });
    });
});

test.describe('ddcw-ahu-unit: sensed vs truth', () => {

    test('an active override splits the sensed value from the integrating truth', () => {
        // The real-vs-sensed lesson: the program reads the forced number
        // while the actual zone keeps integrating on physics, and the
        // return-duct probe keeps measuring real air — so the two chips
        // visibly disagree.
        const Unit = loadUnit();
        const pl = Unit.createPlant();
        pl.override['space-temp'] = { active: true, value: 60 };
        for (let i = 0; i < 10; i++) Unit.update(pl, 5);
        expect(pl.sensors['space-temp'], "the program's view").toBe(60);
        expect(pl.zoneT, 'the truth kept moving').not.toBe(60);
        expect(pl.derived.overrideActive).toBe(true);
        expect(pl.derived.sensedT).toBe(60);
        expect(pl.sensors['rat'], 'the return probe reads the truth').toBe(pl.zoneT);
        expect(pl.derived.eatT, 'and so does the entering-air sample').not.toBe(60);

        pl.override['space-temp'].active = false;       // release rejoins them
        Unit.update(pl, 5);
        expect(pl.sensors['space-temp']).toBe(pl.zoneT);
        expect(pl.sensors['rat']).toBe(pl.zoneT);
    });

    test('a sensor with no override entry cannot be forced', () => {
        // The map is keyed by sensor point id and only space-temp
        // carries an entry today — the structure the controls half
        // grows into, and the reason the other four read truth.
        const Unit = loadUnit();
        const plant = Unit.createPlant();
        expect(Object.keys(plant.override)).toEqual(['space-temp']);
    });

    test('the displayed entering-air sample and the return probe are one number', () => {
        // d.eatT and sensors['rat'] are two surfaces on ONE measurement
        // and must round identically every tick — the pre-step local
        // zoneT drifts inside a single step, enough to split the last
        // displayed digit at a rounding boundary (the FCU's own review
        // catch, 2026-07-27).
        const Unit = loadUnit();
        const pl = run(Unit, (p) => {
            p.actuators['fan-speed'] = 75;
            p.actuators.y1 = true;
            p.actuators.y2 = true;
        }, 20, 5);
        expect(pl.zoneT).not.toBe(76);                    // the zone genuinely moved
        expect(pl.derived.eatT).toBe(pl.sensors['rat']);  // one measurement, one number
    });

    test('every sensor point is written every tick', () => {
        // The publish step and the point list are two lists that have
        // to stay equal: a sensor the physics forgets to write would
        // hand its program a stale seed forever.
        const Unit = loadUnit();
        const pl = Unit.createPlant();
        pl.oaT = 42;
        Unit.update(pl, 1);
        Unit.points.filter((p) => p.dir === 'sensor').forEach((p) => {
            expect(pl.sensors[p.plantKey], p.id + ' was written').not.toBeUndefined();
        });
        expect(pl.sensors['oat'], 'the outdoor probe follows the knob').toBe(42);
    });
});
