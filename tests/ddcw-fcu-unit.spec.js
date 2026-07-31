// Engine-direct tests for /scripts/ddcw-fcu-unit.js — the FCU physics
// core the shell extraction made importable. Lives under tests/*.spec.js
// so the same `npm test` (Playwright) runner picks it up — Playwright
// workers are Node processes, the `page` fixture is just unused here.
//
// LOADER: ddcw-fcu-unit.js reads `Psychro` + `P_STD` at load, so the
// two classic scripts run sequentially in ONE vm context — scripts in
// the same context share a global lexical scope, so the unit file sees
// psychro-engine's top-level consts even though neither attaches to
// the context bag (the psychro-engine.spec.js trailer note, extended
// to two files). The bare context IS an assertion: the PHYSICS half of
// the unit file promises to read neither `document` nor `window`, and
// a violation throws ReferenceError right here.
//
// POLICY — INVARIANTS, NOT FEEL CONSTANTS. The TUNE BY FEEL block
// (C_ZONE / UA_ENV / COIL_TAU / the default knobs) is owner-tunable by
// design, and the rough constants (STAGE_Q* / FAN_HEAT / COIL_FLOOR /
// NOMINAL_CFM) are first-cut engineering guesses. Nothing below pins
// any of their values. Every row asserts a DIRECTION, an ORDERING, a
// CLAMP BAND, or a CONTRACT SHAPE — the things a retune must preserve
// for the page to still teach what it teaches:
//   more fan → shallower ΔT (signed: closer to zero); stage 2 outcools
//   stage 1; a fault collapses
//   the ΔT; the coil never leaves below a freeze floor or above the
//   zone; the override splits sensed from truth; the programs bind
//   the points they claim to.
//
// The quasi-static probe: a fresh plant leaves coilLeaveT unseeded, so
// the first update seeds the coil lag directly to its target — and a
// dt of 0 (which passes the isFinite gates) integrates nothing. One
// update(plant, 0) therefore yields the exact steady-state coil
// solution for the mutated actuator state, with zero trajectory noise.

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

const SCRIPTS = path.join(__dirname, '..', 'html', 'scripts');

function loadUnit() {
    const ctx = vm.createContext({});
    ['psychro-engine.js', 'ddcw-fcu-unit.js'].forEach((f) => {
        vm.runInContext(
            fs.readFileSync(path.join(SCRIPTS, f), 'utf8'), ctx, { filename: f });
    });
    return vm.runInContext('DDCWFcuUnit;', ctx);
}

// Same loader as fbe-engine.spec.js — the FBE engine for the program
// sweeps below.
function loadFBE() {
    const src = fs.readFileSync(path.join(SCRIPTS, 'fbe-engine.js'), 'utf8');
    return vm.runInNewContext(src + '\n; FBE;', {});
}

// The shipped FCU_PROGRAMS literal, regex-extracted from the page
// source and evaluated in a vm — the fbe-engine.spec.js loadLiteral
// loader shape, so these tests exercise the exact shipped graphs (no
// hand-copied twin to drift).
function loadPrograms() {
    const src = fs.readFileSync(
        path.join(__dirname, '..', 'html', 'simulators', 'ddc-workbench-fcu.html'),
        'utf8',
    );
    const m = src.match(/const FCU_PROGRAMS = \{[\s\S]*?\n {8}\};/);
    if (!m) throw new Error('FCU_PROGRAMS literal not found in ddc-workbench-fcu.html');
    return vm.runInNewContext(m[0] + '\nFCU_PROGRAMS;', {});
}

// Quasi-static probe (see header): steady-state derived.* for a
// mutated actuator state, no integration.
function quasi(Unit, mutate) {
    const plant = Unit.createPlant();
    if (mutate) mutate(plant);
    plant.coilLeaveT = undefined;
    Unit.update(plant, 0);
    return plant;
}

// Coil ΔT the page's verdict logic reasons about — SIGNED, leaving
// minus entering (owner ruling 2026-07-27: negative while cooling; the
// sign says which way the coil drives the air). Coil-only here — fan
// heat excluded, that is DAT's job; displayDt below includes it.
function coilDt(plant) {
    return plant.derived.coilLeaveT - plant.derived.eatT;
}

// The signed pair the BADGE computes from: DAT (post-fan) minus the
// entering air (= rat = zoneT) — the display convention itself.
function displayDt(plant) {
    return plant.derived.datT - plant.derived.eatT;
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

test.describe('ddcw-fcu-unit: point-list contract', () => {

    test('every actuator point carries a relinquishDefault of its own kind', () => {
        // The shell has NO fallback table — a missing relinquishDefault
        // resolves to undefined on release. This is the loud-failure
        // contract, asserted before it can reach a page.
        const Unit = loadUnit();
        const actuators = Unit.POINTS.filter((p) => p.dir === 'actuator');
        expect(actuators.length).toBeGreaterThan(0);
        actuators.forEach((p) => {
            expect(p.relinquishDefault, p.id + ' relinquishDefault').not.toBeUndefined();
            if (p.kind === 'bo') expect(typeof p.relinquishDefault, p.id).toBe('boolean');
            if (p.kind === 'ao') expect(typeof p.relinquishDefault, p.id).toBe('number');
        });
    });

    test('point ids are unique kebab-case and kind/dir pairs cohere', () => {
        const Unit = loadUnit();
        const KIND_DIR = { ai: 'sensor', bi: 'sensor', ao: 'actuator', bo: 'actuator', param: 'param' };
        const seen = new Set();
        Unit.POINTS.forEach((p) => {
            expect(p.id, 'kebab-case id').toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
            expect(seen.has(p.id), 'duplicate id ' + p.id).toBe(false);
            seen.add(p.id);
            expect(KIND_DIR[p.kind], p.id + " kind '" + p.kind + "'").toBeDefined();
            expect(p.dir, p.id + ' dir').toBe(KIND_DIR[p.kind]);
            expect(typeof p.plantKey, p.id + ' plantKey').toBe('string');
            expect(typeof p.name, p.id + ' name').toBe('string');
        });
    });

    test('every plantKey resolves on a fresh plant', () => {
        // The binding driver reads/writes plant.sensors / .actuators /
        // .params by plantKey — a key the plant factory doesn't seed
        // would bind silently to undefined.
        const Unit = loadUnit();
        const plant = Unit.createPlant();
        const SURFACE = { sensor: plant.sensors, actuator: plant.actuators, param: plant.params };
        Unit.POINTS.forEach((p) => {
            expect(
                Object.prototype.hasOwnProperty.call(SURFACE[p.dir], p.plantKey),
                p.id + ' plantKey ' + p.plantKey + ' missing from plant.' + p.dir + 's',
            ).toBe(true);
        });
    });

    test('every °F point declares conv, and deadband converts as a delta', () => {
        // `unit` cannot stand in for `conv`: a °F-labelled DELTA run
        // through the absolute formula prints −16.1 °C for a 3 °F band
        // (the contract's own worked example).
        const Unit = loadUnit();
        Unit.POINTS.forEach((p) => {
            if (p.unit === '°F') {
                expect(['temp', 'deltaTemp'], p.id + ' conv').toContain(p.conv);
            }
        });
        const deadband = Unit.POINTS.find((p) => p.id === 'deadband');
        expect(deadband.conv).toBe('deltaTemp');
    });

    test('create(cfg) assembles the full unit contract', () => {
        // The exact surface DDCWShell.createWorkbench consumes — a
        // missing method fails here, engine-direct, not on page boot.
        const Unit = loadUnit();
        const cfg = {
            programs: { demo: { blocks: [], wires: [] } },
            programLabels: { demo: 'Demo' },
            defaultProgram: 'demo',
            canvasSize: { w: 1401, h: 480 },
        };
        const unit = Unit.create(cfg);
        ['createPlant', 'update', 'renderUnit', 'syncControls',
         'wireControls', 'initAnim', 'onResize'].forEach((m) => {
            expect(typeof unit[m], m).toBe('function');
        });
        expect(unit.points).toBe(Unit.POINTS);
        expect(unit.programs).toBe(cfg.programs);
        expect(unit.programLabels).toBe(cfg.programLabels);
        expect(unit.defaultProgram).toBe('demo');
        expect(unit.canvasSize).toBe(cfg.canvasSize);
        expect(isFinite(unit.speedDefault), 'speedDefault').toBe(true);
        expect(isFinite(unit.maxDtSim), 'maxDtSim').toBe(true);
        expect(typeof unit.id).toBe('string');
        expect(typeof unit.prefix).toBe('string');
    });
});

test.describe('ddcw-fcu-unit: headless loading', () => {

    test('the physics surface loads without window or document', () => {
        // loadUnit() runs the file in a bare context — the load itself
        // is the PHYSICS-banner proof (a document/window read at load
        // would ReferenceError). Here: the headless API came through.
        const Unit = loadUnit();
        ['createPlant', 'update', 'zoneInletState'].forEach((m) => {
            expect(typeof Unit[m], m).toBe('function');
        });
        expect(Array.isArray(Unit.POINTS)).toBe(true);
        expect(typeof Unit.create).toBe('function');
    });
});

test.describe('ddcw-fcu-unit: coil physics (quasi-static)', () => {

    test('more fan → shallower coil ΔT at a fixed stage (monotone, both stages)', () => {
        // The page's core lesson: the same load spread over more air is
        // a shallower ΔT. Signed convention: cooling is negative, so
        // "shallower" is CLOSER TO ZERO — starved airflow is the most
        // negative. Fan values stay above the floor-clamp region so the
        // ordering is strict.
        const Unit = loadUnit();
        [1, 2].forEach((stage) => {
            const dts = [40, 70, 100].map((fan) => coilDt(quasi(Unit, (pl) => {
                pl.actuators['fan-speed'] = fan;
                pl.actuators.y1 = stage >= 1;
                pl.actuators.y2 = stage >= 2;
            })));
            expect(dts[0], 'stage ' + stage + ' 40% vs 70%').toBeLessThan(dts[1]);
            expect(dts[1], 'stage ' + stage + ' 70% vs 100%').toBeLessThan(dts[2]);
            expect(dts[2], 'stage ' + stage + ' ΔT at 100% stays negative').toBeLessThan(0);
        });
    });

    test('coil ΔT never INVERTS as airflow falls (the starved-coil fallback, #237)', () => {
        // The row above sweeps 40/70/100, deliberately clear of the
        // floor-clamp region so it can assert STRICT ordering — which is
        // exactly why it never saw #237. Below ~40 % the coil pins at
        // the freeze floor and the ordering goes FLAT, so strictness is
        // the wrong tool down there; what must hold everywhere is that
        // slowing the fan never makes the coil ΔT SHALLOWER.
        //
        // The shipped bug: a failed psychro inversion (load-per-cfm past
        // bone-dry) fell back to the ENTERING air, handing a running
        // coil a zero ΔT — this model's own signature for a faulted
        // compressor. One step of the fan slider took DAT from ~34 °F to
        // ~76 °F and turned a DX coil into a heater. A dense ascending
        // sweep with a NON-STRICT comparison catches that inversion and
        // tolerates the floor's flat shelf.
        const Unit = loadUnit();
        [1, 2].forEach((stage) => {
            const fans = [];
            for (let f = 5; f <= 100; f += 1) fans.push(f);
            const rows = fans.map((fan) => quasi(Unit, (pl) => {
                pl.actuators['fan-speed'] = fan;
                pl.actuators.y1 = stage >= 1;
                pl.actuators.y2 = stage >= 2;
            }));
            for (let i = 1; i < rows.length; i++) {
                const tag = 'stage ' + stage + ': fan ' + fans[i - 1] + '% → ' + fans[i] + '%';
                expect(coilDt(rows[i]), tag + ' coil ΔT must not invert')
                    .toBeGreaterThanOrEqual(coilDt(rows[i - 1]) - 1e-9);
                expect(rows[i].derived.datT, tag + ' DAT must not fall as the fan speeds up')
                    .toBeGreaterThanOrEqual(rows[i - 1].derived.datT - 1e-9);
            }
            // And the starved end genuinely reaches the clamp — without
            // this the sweep could pass on a model that never starves.
            expect(coilDt(rows[0]), 'stage ' + stage + ': the 5% end is a deep, real ΔT')
                .toBeLessThan(-20);
        });
    });

    test('a de-energized coil passes the air through — the clamps stay inside capActive', () => {
        // The freeze floor belongs to a RUNNING coil. A de-energized DX
        // coil is a passive heat exchanger: air crosses it and leaves
        // where it went in. Run the floor over it and the plant starts
        // doing the sequence's freeze protection for it — the AHU shipped
        // exactly that and painted a +55 °F rise on dead compressors.
        // The zone balance clamps zoneT to 40 °F, so this is only
        // reachable from a spec — which is the point of asserting it.
        //
        // ⚠ MEASURED SENSITIVITY, so nobody reads this row as pinning
        // more than it does: on the FCU the `if (capActive)` nesting and
        // the entering-air CEILING each prevent this independently, so
        // this row only reddens when BOTH go (verified by mutation —
        // hoisting the clamps out of capActive alone leaves it green,
        // because the ceiling puts the floor's lift straight back).
        // The AHU measures the SAME way — an earlier draft of this
        // comment claimed the nesting was load-bearing there on its own
        // and that is false. Probed on ddcw-ahu-unit.js at −20 °F
        // entering with both compressors off: shipped −20, both clamps
        // hoisted out of capActive −20, floor hoisted alone 34. The
        // entering-air ceiling neutralizes the floor on both modules.
        // Keep the nesting anyway — it spares a psychro solve every
        // tick the compressor is off and keeps the two modules
        // structurally parallel — just not because it is the thing
        // holding this row up.
        const Unit = loadUnit();
        const p = quasi(Unit, (pl) => {
            pl.zoneT = 20;                     // below COIL_FLOOR
            pl.actuators.y1 = false;
            pl.actuators.y2 = false;
        });
        expect(p.derived.capActive).toBe(false);
        expect(p.derived.coilLeaveT, 'a dead coil neither heats nor cools').toBeCloseTo(20, 6);
    });

    test('stage 2 pulls a deeper (more negative) ΔT than stage 1 at the same fan', () => {
        const Unit = loadUnit();
        [70, 100].forEach((fan) => {
            const at = (stage) => coilDt(quasi(Unit, (pl) => {
                pl.actuators['fan-speed'] = fan;
                pl.actuators.y1 = true;
                pl.actuators.y2 = stage === 2;
            }));
            expect(at(2), fan + '% fan').toBeLessThan(at(1));
        });
    });

    test('low-charge / blocked-condenser faults collapse the coil ΔT to zero', () => {
        // The "no ΔT over the coil" diagnostic: an energized-but-faulted
        // compressor moves no heat, so the coil leaves at the zone temp
        // EXACTLY (zero load through the psych solver is an identity).
        //
        // ⚠ These two names are the CAPACITY faults, and neither stops
        // the air — `fan-belt` is the one that does, and it lives in its
        // own describe below. Note this row cannot tell a real fault
        // name from a typo on its own (capActive gates on `!== 'none'`,
        // so any string collapses the ΔT); the vocabulary itself is
        // pinned by the verdict-ladder + belt rows that DO branch on the
        // exact value.
        const Unit = loadUnit();
        const healthy = quasi(Unit, (pl) => { pl.actuators.y1 = true; pl.actuators.y2 = true; });
        expect(coilDt(healthy)).toBeLessThan(-3);
        ['low-charge', 'blocked-condenser'].forEach((fault) => {
            const p = quasi(Unit, (pl) => {
                pl.actuators.y1 = true;
                pl.actuators.y2 = true;
                pl.conditions.fault = fault;
            });
            expect(coilDt(p), fault).toBeCloseTo(0, 6);
            expect(p.derived.capActive, fault).toBe(false);
        });
    });

    test('compressor off: no ΔT, and the fan heat lands as a real zone gain', () => {
        // Fan-only operation: coil leaves at zone temp, DAT sits above
        // it, and qCool falls out NEGATIVE — the fan motor heats the
        // zone with no special case in the balance.
        const Unit = loadUnit();
        const p = quasi(Unit, (pl) => { pl.actuators.y1 = false; pl.actuators.y2 = false; });
        expect(p.derived.stage).toBe(0);
        expect(coilDt(p)).toBeCloseTo(0, 6);
        expect(p.derived.datT).toBeGreaterThan(p.zoneT);
        expect(p.derived.qCool).toBeLessThan(0);
    });

    test('displayed ΔT (DAT − RAT) is signed: negative cooling, ~zero at rest, magnitude shrinks with airflow', () => {
        // The badge convention itself, on the pair the render arithmetic
        // uses: DAT (post-fan) minus the entering air. Three rows:
        //   • cooling stages on → the delta is genuinely NEGATIVE;
        //   • fan off → the delta is exactly zero (both sensors read
        //     the zone: no air moves, nothing crosses the coil);
        //   • magnitude shrinks as airflow rises (|ΔT| strictly
        //     decreasing 40% → 70% → 100%).
        const Unit = loadUnit();

        const cooling = quasi(Unit, (pl) => { pl.actuators.y1 = true; pl.actuators.y2 = true; });
        expect(displayDt(cooling)).toBeLessThan(-3);

        const off = quasi(Unit, (pl) => { pl.actuators['fan-enable'] = false; });
        expect(displayDt(off)).toBeCloseTo(0, 6);

        const mags = [40, 70, 100].map((fan) => Math.abs(displayDt(quasi(Unit, (pl) => {
            pl.actuators['fan-speed'] = fan;
            pl.actuators.y1 = true;
            pl.actuators.y2 = true;
        }))));
        expect(mags[0], '|ΔT| 40% vs 70%').toBeGreaterThan(mags[1]);
        expect(mags[1], '|ΔT| 70% vs 100%').toBeGreaterThan(mags[2]);
    });

    test('fan-enable false gates everything even with stages called', () => {
        // fan-enable is a real BO gate, not speed > 0 alone: no air, no
        // capacity, DAT reads the zone, and the blade animation stops.
        const Unit = loadUnit();
        const p = quasi(Unit, (pl) => {
            pl.actuators['fan-enable'] = false;
            pl.actuators.y1 = true;
            pl.actuators.y2 = true;
        });
        // No command and therefore no air: with fan-enable false both
        // facts agree. They only diverge under a belt fault (below).
        expect(p.derived.fanCmd).toBe(false);
        expect(p.derived.airflowOn).toBe(false);
        expect(p.derived.capActive).toBe(false);
        expect(p.derived.datT).toBe(p.zoneT);
        expect(p.anim.fanFrac).toBe(0);
    });

    test('y2 alone reads as stage 2 (Y2 implies Y1)', () => {
        const Unit = loadUnit();
        const p = quasi(Unit, (pl) => { pl.actuators.y1 = false; pl.actuators.y2 = true; });
        expect(p.derived.stage).toBe(2);
    });

    test('coil leaving temp holds a freeze floor and never exceeds the zone', () => {
        // Sweep the fan × stage × fault grid. Two clamps close the model:
        // a freeze floor keeps a starved coil above ~freezing (COIL_FLOOR
        // is a rough constant — assert the BAND, not the value), and a
        // cooling-only coil can never leave WARMER than its entering air.
        // The 5%-fan extreme also pins solver-failure muting: an
        // impossible load-per-cfm falls back to no-cooling, never NaN.
        const Unit = loadUnit();
        [5, 40, 70, 100].forEach((fan) => {
            [0, 1, 2].forEach((stage) => {
                ['none', 'low-charge'].forEach((fault) => {
                    const p = quasi(Unit, (pl) => {
                        pl.actuators['fan-speed'] = fan;
                        pl.actuators.y1 = stage >= 1;
                        pl.actuators.y2 = stage >= 2;
                        pl.conditions.fault = fault;
                    });
                    const label = fan + '% / stage ' + stage + ' / ' + fault;
                    expect(isFinite(p.coilLeaveT), label + ' finite').toBe(true);
                    expect(p.coilLeaveT, label + ' floor').toBeGreaterThanOrEqual(32);
                    expect(p.coilLeaveT, label + ' ceiling').toBeLessThanOrEqual(p.zoneT + 1e-9);
                });
            });
        });
    });

    test('DAT rides above the coil when the fan runs and feeds the dat sensor back', () => {
        // Draw-through pickup: DAT = lagged coil temp + a small positive
        // fan heat (assert the SHAPE, not FAN_HEAT's value), and the
        // result lands in plant.sensors.dat for the program's AI.
        const Unit = loadUnit();
        const on = quasi(Unit, (pl) => { pl.actuators.y1 = true; });
        expect(on.derived.datT).toBeGreaterThan(on.derived.coilLeaveT);
        expect(on.derived.datT - on.derived.coilLeaveT).toBeLessThan(3);
        expect(on.sensors['dat']).toBe(on.derived.datT);

        const off = quasi(Unit, (pl) => { pl.actuators['fan-enable'] = false; });
        expect(off.derived.datT).toBe(off.zoneT);
        expect(off.sensors['dat']).toBe(off.zoneT);
    });

    test('zoneInletState builds a plausible coil-inlet state from the zone temp', () => {
        const Unit = loadUnit();
        const st = Unit.zoneInletState(76);
        expect(st.ok).toBe(true);
        expect(st.tdb).toBe(76);
        expect(st.W).toBeGreaterThan(0.001);   // some moisture…
        expect(st.W).toBeLessThan(0.03);       // …but not a swamp
        expect(st.rh).toBeGreaterThan(0);
        expect(st.rh).toBeLessThanOrEqual(100);
    });
});

test.describe('ddcw-fcu-unit: zone trajectory (integration)', () => {

    // 60 × 5 s = 300 sim-seconds — enough for the sign of the balance
    // to separate the runs cleanly at any sane tuning.
    const STEPS = 60;
    const DT = 5;

    test('energy-balance sign: gains push the zone up, stage 2 pulls it down', () => {
        const Unit = loadUnit();
        const start = Unit.createPlant().zoneT;
        const off = run(Unit, (pl) => {
            pl.actuators.y1 = false;
            pl.actuators['fan-enable'] = false;
        }, STEPS, DT);
        const s2 = run(Unit, (pl) => { pl.actuators.y2 = true; }, STEPS, DT);
        expect(off.zoneT, 'cooling off under gains').toBeGreaterThan(start);
        expect(s2.zoneT, 'stage 2 overwhelms the gains').toBeLessThan(start);
    });

    test('stage 2 cools the zone faster than stage 1', () => {
        const Unit = loadUnit();
        const s1 = run(Unit, (pl) => { pl.actuators.y1 = true; pl.actuators.y2 = false; }, STEPS, DT);
        const s2 = run(Unit, (pl) => { pl.actuators.y1 = true; pl.actuators.y2 = true; }, STEPS, DT);
        expect(s2.zoneT).toBeLessThan(s1.zoneT);
    });

    test('coil lag: leaving temp ramps toward target, and a huge step cannot overshoot', () => {
        const Unit = loadUnit();
        const pl = Unit.createPlant();
        pl.actuators.y2 = true;
        Unit.update(pl, 0);                    // seed at the cold stage-2 target
        const cold = pl.coilLeaveT;
        pl.actuators.y1 = false;
        pl.actuators.y2 = false;               // compressor drops out; fan keeps running
        Unit.update(pl, 1);                    // 1 sim-second later…
        expect(pl.coilLeaveT).toBeGreaterThan(cold);        // …warming toward the zone
        expect(pl.coilLeaveT).toBeLessThan(pl.zoneT - 1);   // …but still cold (residual cooling)
        const target = pl.zoneT;               // no-capacity target = the zone
        Unit.update(pl, 1e6);                  // a step far beyond any COIL_TAU
        // Math.min(1, dt/τ) lands the lag exactly ON target — never past.
        expect(pl.coilLeaveT).toBeCloseTo(target, 6);
    });

    test('zoneT safety clamps hold at both ends', () => {
        const Unit = loadUnit();
        const hot = Unit.createPlant();
        hot.zoneT = 130;
        Unit.update(hot, 1);
        expect(hot.zoneT).toBe(120);
        const cold = Unit.createPlant();
        cold.zoneT = 25;
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

    test('non-finite inputs mute the tick without touching the zone state', () => {
        // Validate-and-mute, headless: derived.invalid flags the paint
        // layer, and the integrator never runs on the junk.
        const Unit = loadUnit();
        const pl = Unit.createPlant();
        pl.actuators['fan-speed'] = NaN;
        const z0 = pl.zoneT;
        Unit.update(pl, 5);
        expect(pl.derived.invalid).toBe(true);
        expect(pl.zoneT).toBe(z0);
        expect(pl.simSec).toBe(0);
    });

    test('the displayed EAT and the return probe are one sample — never split mid-tick', () => {
        // d.eatT once sampled the tick-START zoneT while sensors['rat']
        // samples the tick-END truth — up to ~0.06 °F apart inside one
        // 5-sim-s step, enough to split the last displayed digit of the
        // EAT badge from the RAT chip at a rounding boundary (review
        // catch, 2026-07-27). Both now read the post-integration zoneT,
        // so the two surfaces can never disagree, even transiently.
        const Unit = loadUnit();
        const pl = run(Unit, (p) => {
            p.actuators['fan-enable'] = true;
            p.actuators['fan-speed'] = 70;
            p.actuators.y1 = true;
            p.actuators.y2 = true;
        }, 20, 5);
        expect(pl.zoneT).not.toBe(76);                    // the zone genuinely moved
        expect(pl.derived.eatT).toBe(pl.sensors['rat']);  // one measurement, one number
    });
});

test.describe('ddcw-fcu-unit: DAT low-limit annunciator', () => {

    // The plant-side hysteresis mirror of the safeties program's
    // trip/clear pair. Bands, not values: the trip sits at the same
    // line as the freeze-watch verdict and the clear a recovery band
    // above it — the rows assert latch BEHAVIOR across the coil-lag
    // trajectory, which is deterministic physics.

    test('a starved coil latches the annunciator; recovery through the band holds, then clears', () => {
        const Unit = loadUnit();
        // Trip: stage 2 on 40% fan starves the coil to the freeze floor
        // (the same recipe the coil-physics rows use) — DAT dives.
        const pl = quasi(Unit, (p) => {
            p.actuators['fan-speed'] = 40;
            p.actuators.y1 = true;
            p.actuators.y2 = true;
        });
        expect(pl.derived.datT).toBeLessThan(42);
        expect(pl.derived.lowLimitLatched).toBe(true);

        // Recovery: stages off, fan on — the coil lag ramps DAT back
        // toward the zone. The latch must HOLD everywhere below the
        // clear threshold (including the 42–52 band) and release only
        // above it. Anti-vacuity: the ramp must actually sample the
        // hold band.
        pl.actuators.y1 = false;
        pl.actuators.y2 = false;
        pl.actuators['fan-speed'] = 100;
        let sawHoldBand = false;
        let cleared = false;
        for (let i = 0; i < 600 && !cleared; i++) {
            Unit.update(pl, 1);
            const dat = pl.derived.datT;
            if (dat > 42 && dat < 52) {
                sawHoldBand = true;
                expect(pl.derived.lowLimitLatched, 'held inside the band at ' + dat).toBe(true);
            }
            if (pl.derived.lowLimitLatched === false) {
                cleared = true;
                expect(dat, 'released only above the clear threshold').toBeGreaterThan(52);
            }
        }
        expect(sawHoldBand, 'the ramp sampled the hysteresis band').toBe(true);
        expect(cleared, 'the latch eventually cleared').toBe(true);
    });

    test('fan-off reads the zone, so the annunciator self-clears (the verdict-ladder premise)', () => {
        // The annunciator verdict line ranks below the fan-off branches
        // because a stopped fan hands datT the zone temp — the latch
        // cannot stay latched with no airflow and a warm zone.
        const Unit = loadUnit();
        const pl = quasi(Unit, (p) => {
            p.actuators['fan-speed'] = 40;
            p.actuators.y1 = true;
            p.actuators.y2 = true;
        });
        expect(pl.derived.lowLimitLatched).toBe(true);
        pl.actuators['fan-enable'] = false;
        Unit.update(pl, 0);                    // dt 0: pure re-read, no integration
        expect(pl.derived.datT).toBe(pl.zoneT);
        expect(pl.derived.lowLimitLatched).toBe(false);
    });
});

test.describe('ddcw-fcu-unit: sensor override', () => {

    test('an active override splits the sensed value from the integrating truth', () => {
        // The page's real-vs-sensed lesson: the program reads the forced
        // number while the actual zone keeps integrating on physics.
        const Unit = loadUnit();
        const pl = Unit.createPlant();
        pl.override.spaceTemp = { active: true, value: 60 };
        for (let i = 0; i < 10; i++) Unit.update(pl, 5);
        expect(pl.sensors['space-temp']).toBe(60);            // the program's view
        expect(pl.zoneT).not.toBe(60);                        // the truth kept moving
        expect(pl.derived.overrideActive).toBe(true);
        expect(pl.derived.sensedT).toBe(60);
        expect(pl.derived.eatT).not.toBe(60);                 // coil sees ACTUAL return air
        // The return-duct probe measures real air: rat reads the TRUTH
        // while the override lies to the program — the two chips
        // visibly disagree (the real-vs-sensed commissioning moment).
        expect(pl.sensors['rat']).toBe(pl.zoneT);
        expect(pl.sensors['rat']).not.toBe(60);

        pl.override.spaceTemp.active = false;                 // release rejoins them
        Unit.update(pl, 5);
        expect(pl.sensors['space-temp']).toBe(pl.zoneT);
        expect(pl.sensors['rat']).toBe(pl.zoneT);             // rat never left the truth
    });
});

test.describe('ddcw-fcu-unit: programs × points (the binding invariant)', () => {

    // point kind → the FBE block type its seed block must carry.
    const KIND_TO_BLOCK = { ai: 'ai', bi: 'bi', ao: 'ao', bo: 'bo', param: 'const' };

    // Display-only exception to the seed-block identity: a SENSOR
    // point may ship before any sheet authors its block — the shell's
    // binding driver skips an unmatched point, so the chip is live and
    // the sheets stay untouched. `rat` landed this way on the owner's
    // mockup round (2026-07-27): the return-air probe + chip precede
    // any program consuming it, and the ΔT lane owns the sheets next.
    // The honesty test below keeps this set self-expiring: the moment
    // any program DOES author a block for an exempted id, the entry
    // must come out. Sensors only — a skipped actuator would silently
    // freeze at Relinquish_Default, which is exactly what the sweep
    // exists to catch.
    const DISPLAY_ONLY_SENSORS = new Set(['rat']);

    test('every program constructs, ticks, and carries every point with its kind-matched block type', () => {
        // The load-bearing identity: point id === seed FBE-block id in
        // EVERY program. A missing actuator block silently drops the
        // point to Relinquish_Default; a missing sensor block leaves a
        // sequence staging on a literal. Iterates whatever the registry
        // holds, so a new program is swept automatically.
        const Unit = loadUnit();
        const FBE = loadFBE();
        const programs = Object.entries(loadPrograms());
        expect(programs.length).toBeGreaterThan(0);
        programs.forEach(([name, def]) => {
            const g = FBE.makeGraph(def);           // throws = fail (the makeGraph pass)
            FBE.tick(g, 0.1);
            const byId = {};
            def.blocks.forEach((b) => { byId[b.id] = b; });
            Unit.POINTS.forEach((p) => {
                if (DISPLAY_ONLY_SENSORS.has(p.id)) return;
                const blk = byId[p.id];
                expect(blk, name + ': no seed block for point ' + p.id).toBeTruthy();
                expect(blk.type, name + ': ' + p.id + ' block type').toBe(KIND_TO_BLOCK[p.kind]);
            });
        });
    });

    test('display-only exemptions stay honest: real sensor points, unauthored on every sheet', () => {
        // Anti-decay, both directions: an exempted id must BE a sensor
        // point (an actuator exemption would defeat the sweep), and no
        // shipped sheet may author it — when one does, the point is no
        // longer display-only and its exemption must be deleted.
        const Unit = loadUnit();
        const byPointId = new Map(Unit.POINTS.map((p) => [p.id, p]));
        const programs = Object.entries(loadPrograms());
        DISPLAY_ONLY_SENSORS.forEach((id) => {
            const p = byPointId.get(id);
            expect(p, id + ' is a real FCU point').toBeTruthy();
            expect(p.dir, id + ' exemption is sensor-only').toBe('sensor');
            programs.forEach(([name, def]) => {
                expect(
                    def.blocks.some((b) => b.id === id),
                    name + ' authors ' + id + ' — remove it from DISPLAY_ONLY_SENSORS',
                ).toBe(false);
            });
        });
    });

    // Program-local `bi` sources: a bi block whose id is deliberately
    // NOT a point, so the binding driver never writes it and the reader
    // toggles it by hand (the same idiom as the sim page's sts/rst).
    // This set exists because `bi` stopped being wholesale-exempt the
    // day fan-status became a bound point: binding is BY ID, so a typo
    // (`fan-statud`) would silently degrade a live proof switch into a
    // hand-toggled constant that reads false forever — a sheet that
    // looks interlocked and is not.
    const LOCAL_BI_SOURCES = new Set(['fanon']);

    test('every hard-IO block on every sheet is a bound point', () => {
        // The reverse direction: an ai / ao / bo / bi block whose id is
        // not a point would render as IO the binding never drives — a
        // dead actuator or a frozen fake sensor. `bi` is included, with
        // the declared program-local sources above as the only way out.
        const Unit = loadUnit();
        const pointIds = new Set(Unit.POINTS.map((p) => p.id));
        Object.entries(loadPrograms()).forEach(([name, def]) => {
            def.blocks.forEach((b) => {
                if (b.type === 'ai' || b.type === 'ao' || b.type === 'bo') {
                    expect(
                        pointIds.has(b.id),
                        name + ': ' + b.type + ' block ' + b.id + ' is not an FCU point',
                    ).toBe(true);
                } else if (b.type === 'bi' && !LOCAL_BI_SOURCES.has(b.id)) {
                    expect(
                        pointIds.has(b.id),
                        name + ': bi block ' + b.id + ' is neither an FCU point nor a'
                            + ' declared program-local source',
                    ).toBe(true);
                }
            });
        });
    });

    test('declared program-local bi sources stay honest', () => {
        // Self-verifying, the DISPLAY_ONLY_SENSORS shape: an entry must
        // still EXIST on some sheet and must still NOT be a point, so a
        // source that gets promoted to a real point (or deleted) forces
        // the set to be edited instead of decaying into a silent
        // permanent hole in the rule above.
        const Unit = loadUnit();
        const pointIds = new Set(Unit.POINTS.map((p) => p.id));
        const programs = Object.entries(loadPrograms());
        LOCAL_BI_SOURCES.forEach((id) => {
            expect(pointIds.has(id), id + ' is a point now — drop it from LOCAL_BI_SOURCES')
                .toBe(false);
            const used = programs.some(([, def]) =>
                def.blocks.some((b) => b.type === 'bi' && b.id === id));
            expect(used, id + ' is on no sheet — drop it from LOCAL_BI_SOURCES').toBe(true);
        });
    });
});

test.describe('ddcw-fcu-unit: program logic (engine-direct)', () => {

    // Drive the shipped graphs directly: set the space-temp AI block's
    // value, tick, read what the sequence commands into the IO blocks.
    // This is the observable half of "params bind" available headless —
    // the shell's bindingTick plumbing is covered by the page specs.
    function mount(FBE, def) {
        const g = FBE.makeGraph(def);
        const by = {};
        g.blocks.forEach((b) => { by[b.id] = b; });
        return { g, by };
    }

    test('cool-2stage: the staging spine, with latch hysteresis', () => {
        const FBE = loadFBE();
        const { g, by } = mount(FBE, loadPrograms()['cool-2stage']);
        const at = (t) => {
            by['space-temp'].params.value = t;
            FBE.tick(g, 0.1);
            return {
                y1: by.y1.in.IN, y2: by.y2.in.IN,
                fanen: by['fan-enable'].in.IN, spd: by['fan-speed'].in.IN,
            };
        };
        // SP 72 / deadband 3 / separation 2: cut-ins 75 and 77.
        expect(at(76)).toEqual({ y1: true, y2: false, fanen: true, spd: by.low.params.value });
        expect(at(78)).toEqual({ y1: true, y2: true, fanen: true, spd: by.hundred.params.value });
        // Back inside the band: Y2 breaks (< 75), Y1 HOLDS (latch).
        expect(at(74).y2).toBe(false);
        expect(at(74).y1).toBe(true);
        // Below the setpoint cut-out: everything breaks, fan included.
        const rest = at(71);
        expect(rest.y1).toBe(false);
        expect(rest.fanen).toBe(false);

        // Hysteresis is real: a FRESH sheet at 74 (inside the band,
        // latches clear) never makes stage 1 — the band only holds a
        // call that already exists.
        const fresh = mount(FBE, loadPrograms()['cool-2stage']);
        fresh.by['space-temp'].params.value = 74;
        FBE.tick(fresh.g, 0.1);
        expect(fresh.by.y1.in.IN).toBe(false);
    });

    test('cool-2stage: editing the setpoint const re-thresholds the staging', () => {
        // The staging math derives from the cooling-setpoint block —
        // the same edit path the shell's block → plant param binding
        // exposes in the inspector. 70 °F is a call at SP 65, not at 72.
        const FBE = loadFBE();
        const stock = mount(FBE, loadPrograms()['cool-2stage']);
        stock.by['space-temp'].params.value = 70;
        FBE.tick(stock.g, 0.1);
        expect(stock.by.y1.in.IN).toBe(false);

        const edited = mount(FBE, loadPrograms()['cool-2stage']);
        edited.by['cooling-setpoint'].params.value = 65;
        edited.by['space-temp'].params.value = 70;
        FBE.tick(edited.g, 0.1);
        expect(edited.by.y1.in.IN).toBe(true);
    });

    test('cool-2stage: the speed reference stages through the select', () => {
        // Stage 1 runs the low reference, stage 2 the high one — assert
        // against the sheet's own const blocks, never a copied number.
        const FBE = loadFBE();
        const { g, by } = mount(FBE, loadPrograms()['cool-2stage']);
        by['space-temp'].params.value = 76;
        FBE.tick(g, 0.1);
        expect(by['fan-speed'].in.IN).toBe(by.low.params.value);
        by['space-temp'].params.value = 78;
        FBE.tick(g, 0.1);
        expect(by['fan-speed'].in.IN).toBe(by.hundred.params.value);
        expect(by.hundred.params.value).toBeGreaterThan(by.low.params.value);
    });

    test('cool-1stage: the speed reference is deliberately uninterrupted; y2 is commanded OFF', () => {
        // Two owner-pinned teaching states: the AO reads the constant
        // reference even at rest (an AO shows the command, not the
        // state — fan-enable stops the motor), and the unwired y2 block
        // still evaluates false, so the sequence explicitly commands
        // slot 16 OFF every tick (distinct from DELETING the block,
        // which releases the slot — the D4 distinction).
        const FBE = loadFBE();
        const { g, by } = mount(FBE, loadPrograms()['cool-1stage']);
        by['space-temp'].params.value = 71;      // no call
        FBE.tick(g, 0.1);
        expect(by.y1.in.IN).toBe(false);
        expect(by['fan-speed'].in.IN).toBe(by.hundred.params.value);
        expect(by.y2.in.IN).toBe(false);

        by['space-temp'].params.value = 78;      // staged
        FBE.tick(g, 0.1);
        expect(by.y1.in.IN).toBe(true);
        expect(by['fan-speed'].in.IN).toBe(by.hundred.params.value);
        expect(by.y2.in.IN).toBe(false);
    });

    test('cool-2stage-fanon: fan-enable follows the fanon source, not the cooling call', () => {
        const FBE = loadFBE();
        const { g, by } = mount(FBE, loadPrograms()['cool-2stage-fanon']);
        by['space-temp'].params.value = 71;      // no call…
        FBE.tick(g, 0.1);
        expect(by.y1.in.IN).toBe(false);
        expect(by['fan-enable'].in.IN).toBe(true);   // …fan runs anyway
        by.fanon.params.state = false;           // toggling the source off…
        FBE.tick(g, 0.1);
        expect(by['fan-enable'].in.IN).toBe(false);  // …is the taught no-airflow fault
    });

    // ── cool-2stage-safeties ── the protected sequence. Thresholds are
    // read from the sheet's own const blocks (lowlim / hilim) and the
    // TON's own pt param, never copied numbers. Ticks use exact-binary
    // dt values so timer thresholds can't float-drift.

    test('cool-2stage-safeties: DAT low-limit trips the latch, holds in the band, clears above — fan rides through', () => {
        const FBE = loadFBE();
        const { g, by } = mount(FBE, loadPrograms()['cool-2stage-safeties']);
        const pt = by.tonoff.params.pt;
        const trip = by.lowlim.params.value;
        const clear = by.hilim.params.value;
        expect(clear).toBeGreaterThan(trip);     // hysteresis is real

        // Boot: warm zone calls both stages; one big tick burns the
        // power-up min-off (TON clamps et at pt) and the stages make
        // the SAME tick the permit opens (the cycle members are
        // declared in dependency order — the layout comment in the
        // page pins that).
        by['space-temp'].params.value = 78;
        by.dat.params.value = clear + 3;
        // Airflow proof is the FIRST permit on this sheet, so every row
        // that expects a stage has to prove air. Its own behaviour is
        // pinned by the proof-interlock describe below; here it is
        // setup, and it is stated rather than assumed because without it
        // the sheet correctly refuses to stage anything.
        by['fan-status'].params.state = true;
        FBE.tick(g, pt + 1);
        expect(by.y1.in.IN).toBe(true);
        expect(by.y2.in.IN).toBe(true);
        expect(by['fan-enable'].in.IN).toBe(true);
        expect(by['fan-speed'].in.IN).toBe(by.hundred.params.value);

        // Trip: DAT below the lowlim const cuts BOTH stages that tick.
        // The fan rides through: fan-enable stays on the cooling call,
        // and the speed reference stays staged on the CALL (sr2), so
        // the AO holds the high reference — an AO shows the command.
        by.dat.params.value = trip - 2;
        FBE.tick(g, 1);
        expect(by.y1.in.IN).toBe(false);
        expect(by.y2.in.IN).toBe(false);
        expect(by['fan-enable'].in.IN).toBe(true);
        expect(by['fan-speed'].in.IN).toBe(by.hundred.params.value);

        // Hold: between trip and clear the latch holds the lockout.
        by.dat.params.value = (trip + clear) / 2;
        FBE.tick(g, 1);
        expect(by.y1.in.IN).toBe(false);
        expect(by['fan-enable'].in.IN).toBe(true);

        // Clear: DAT above hilim re-arms the latch, but the stages have
        // only been off a few sim-seconds — the min-off TON still holds
        // them (okrun is back TRUE, offok is not).
        by.dat.params.value = clear + 3;
        FBE.tick(g, 1);
        expect(by.okrun.out.Q).toBe(true);
        expect(by.y1.in.IN).toBe(false);

        // Burn the min-off: the stages restage.
        FBE.tick(g, pt);
        expect(by.y1.in.IN).toBe(true);
        expect(by.y2.in.IN).toBe(true);
    });

    test('cool-2stage-safeties: min-off blocks a quick restage after a thermostat stop', () => {
        const FBE = loadFBE();
        const { g, by } = mount(FBE, loadPrograms()['cool-2stage-safeties']);
        const pt = by.tonoff.params.pt;

        by['space-temp'].params.value = 78;
        by.dat.params.value = by.hilim.params.value + 3;
        by['fan-status'].params.state = true;    // proof gates every stage — see below
        FBE.tick(g, pt + 1);
        expect(by.y1.in.IN).toBe(true);

        // Zone satisfied: everything breaks — a normal stop, no fault.
        by['space-temp'].params.value = 71;
        FBE.tick(g, 1);
        expect(by.y1.in.IN).toBe(false);
        expect(by['fan-enable'].in.IN).toBe(false);

        // The call returns seconds later: the latches re-make, the fan
        // follows the call — but the stages CANNOT restage until the
        // min-off elapses (the anti-short-cycle behavior the sheet
        // exists to teach).
        by['space-temp'].params.value = 78;
        FBE.tick(g, 1);
        FBE.tick(g, 1);
        expect(by.sr1.out.Q).toBe(true);             // the call is back…
        expect(by['fan-enable'].in.IN).toBe(true);   // …the fan follows it…
        expect(by.y1.in.IN).toBe(false);             // …the stage waits

        FBE.tick(g, pt);                             // off-time served
        expect(by.y1.in.IN).toBe(true);
    });

    test('cool-2stage-safeties: no airflow proof, no stages — even on a blind-healthy DAT (#225)', () => {
        // The defect this sheet was rewired to answer. With the air
        // stopped the discharge probe reads the ZONE, so the low limit
        // sees a comfortable number and its latch happily SETS — the
        // "goes blind and self-clears" half of #225. Measured before the
        // fix, the sheet answered {y1:true, y2:true, okrun:true,
        // permit:true} and drove both compressors into dead air.
        //
        // The fix does not stop the latch from clearing blindly — a latch
        // cannot know its probe is lying — it puts the proof interlock
        // AHEAD of the latch, so that stale clear commands nothing. Assert
        // both halves, or a future change could "fix" the latch, break the
        // interlock, and still pass.
        const FBE = loadFBE();
        const { g, by } = mount(FBE, loadPrograms()['cool-2stage-safeties']);
        by['space-temp'].params.value = 78;              // a heavy cooling call
        by.dat.params.value = by.hilim.params.value + 3; // the blind, healthy-looking reading
        by['fan-status'].params.state = false;           // …but no air is moving
        FBE.tick(g, by.tonoff.params.pt + 1);            // and burn the power-up min-off

        expect(by.okrun.out.Q, 'the latch does clear on the blind reading').toBe(true);
        expect(by.coilok.out.Q, 'but the proof interlock ahead of it does not').toBe(false);
        expect(by.permit.out.Q, 'so the merged permit stays shut').toBe(false);
        expect(by.y1.in.IN, 'and no compressor is commanded into dead air').toBe(false);
        expect(by.y2.in.IN).toBe(false);
        // The fan is deliberately OUTSIDE the interlock: gate it on the
        // proof its own airflow produces and nothing could ever start.
        expect(by['fan-enable'].in.IN, 'the fan still follows the cooling call').toBe(true);
    });

    test('cool-2stage-safeties: losing proof drops a running stage the same tick', () => {
        // The belt fault, driven on the sheet rather than the plant: the
        // stages are running, proof goes away, and the permit shuts on
        // the interlock — NOT on a discharge reading, which by then is
        // blind. This is what makes the belt fault demonstrable.
        const FBE = loadFBE();
        const { g, by } = mount(FBE, loadPrograms()['cool-2stage-safeties']);
        by['space-temp'].params.value = 78;
        by.dat.params.value = by.hilim.params.value + 3;
        by['fan-status'].params.state = true;
        FBE.tick(g, by.tonoff.params.pt + 1);
        expect(by.y1.in.IN).toBe(true);
        expect(by.y2.in.IN).toBe(true);

        by['fan-status'].params.state = false;           // the belt goes
        FBE.tick(g, 1);
        expect(by.y1.in.IN, 'stage 1 drops on the proof interlock').toBe(false);
        expect(by.y2.in.IN, 'and so does stage 2').toBe(false);
        expect(by.okrun.out.Q, 'the low limit never tripped — it could not see').toBe(true);
        expect(by['fan-enable'].in.IN, 'the fan command still stands').toBe(true);
    });
});

test.describe('ddcw-fcu-unit: airflow, proof, and the blind low-limit', () => {

    test('a broken belt keeps the command and loses the airflow', () => {
        // The three airflow facts stay distinct: fanCmd is what the
        // sequence asked for, airflowOn is whether air moves, fan-status
        // is what the proof switch reports. A belt fault splits the
        // first from the other two — and that split is the whole reason
        // `d.fanOn` no longer exists.
        const Unit = loadUnit();
        const pl = runToProof(Unit, null);
        expect(pl.sensors['fan-status'], 'a healthy run proves airflow').toBe(true);

        pl.conditions.fault = 'fan-belt';
        Unit.update(pl, 1);
        expect(pl.derived.fanCmd, 'the sequence is still calling for the fan').toBe(true);
        expect(pl.derived.airflowOn, 'but no air moves').toBe(false);
        expect(pl.sensors['fan-status'], 'and the proof drops').toBe(false);
        expect(pl.derived.capActive, 'so the coil cannot be producing').toBe(false);
        expect(pl.anim.fanFrac, 'the blades stop even though the command stands').toBe(0);
    });

    test('a capacity fault is NOT an airflow fault', () => {
        // The vocabulary's load-bearing distinction, and the reason the
        // old `airflow` fault was renamed: blocked-condenser and
        // low-charge kill the heat transfer while the air keeps moving.
        // Only fan-belt stops the air. A model that conflated them would
        // make the proof switch drop on a refrigeration-side failure.
        //
        // This is also why the capacity fault is named for the CONDENSER
        // and not the coil in the cabinet: a blocked evaporator would
        // restrict the air, which is precisely what this row proves does
        // NOT happen here (codebase-issues #246).
        const Unit = loadUnit();
        ['low-charge', 'blocked-condenser'].forEach((fault) => {
            const pl = runToProof(Unit, null);
            pl.conditions.fault = fault;
            Unit.update(pl, 1);
            expect(pl.derived.airflowOn, fault + ': air still moves').toBe(true);
            expect(pl.sensors['fan-status'], fault + ': proof stays made').toBe(true);
            expect(pl.derived.capActive, fault + ': but nothing is produced').toBe(false);
            expect(pl.anim.fanFrac, fault + ': the blades keep turning')
                .toBeGreaterThan(0);
        });
    });

    test('with the air stopped, DAT reads the zone — the blind-limit case', () => {
        // KEEP this branch. A discharge low-limit watching DAT goes
        // BLIND the moment airflow stops, because DAT stops reporting
        // the coil (codebase-issues #225). fan-status is what a correct
        // sequence interlocks on instead — and the contrast is only
        // demonstrable if the plant models the blindness honestly.
        // Sweep BOTH ways of stopping the air so the row cannot pass for
        // the wrong reason.
        const Unit = loadUnit();
        ['fan-belt', 'none'].forEach((fault) => {
            const pl = quasi(Unit, (p) => {
                p.actuators.y2 = true;                 // full cooling called…
                p.conditions.fault = fault;
                if (fault === 'none') p.actuators['fan-enable'] = false;   // …and no air either way
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
        // SOURCE. The blindness only shows on a TRAJECTORY, where the
        // coil metal is still cold when the air stops — and a discharge
        // low-limit that kept reading the cold coil after airflow
        // stopped would be the exact inverse of the lesson (#225).
        const Unit = loadUnit();
        const pl = run(Unit, (p) => { p.actuators.y1 = true; p.actuators.y2 = true; }, 200, 1);
        expect(pl.derived.airflowOn, 'the healthy run is moving air').toBe(true);
        expect(pl.zoneT - pl.sensors['dat'], 'a real coil delta is showing').toBeGreaterThan(5);

        pl.conditions.fault = 'fan-belt';
        Unit.update(pl, 1);                              // ONE tick after the belt goes
        expect(pl.derived.airflowOn).toBe(false);
        expect(pl.zoneT - pl.coilLeaveT, 'the coil itself is still cold').toBeGreaterThan(5);
        expect(pl.sensors['dat'] - pl.coilLeaveT, 'DAT is not tracking the coil')
            .toBeGreaterThan(5);
        expect(Math.abs(pl.sensors['dat'] - pl.zoneT), 'DAT reads the zone').toBeLessThan(0.5);
    });

    test('proof makes slowly and breaks at once', () => {
        // A duct-pressure switch is asymmetric, and the asymmetry is the
        // whole reason a sequence has to be written around it. Assert the
        // ORDERING — makes late, breaks on the very next tick — never the
        // delay's value: PROOF_MAKE_DELAY is a TUNE BY FEEL constant.
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

    test('the proof switch is not overridable — it reports its own state', () => {
        // The sensor-override bag forces what the PROGRAM READS for a
        // measured value. A proof switch measures nothing continuous, so
        // there is nothing to force; it must track the plant even while
        // the space-temp override is lying.
        const Unit = loadUnit();
        const pl = runToProof(Unit, (p) => {
            p.override.spaceTemp.active = true;
            p.override.spaceTemp.value = 55;
        });
        expect(pl.derived.overrideActive).toBe(true);
        expect(pl.sensors['space-temp'], 'the program is being lied to').toBe(55);
        expect(pl.sensors['fan-status'], 'proof still reports the truth').toBe(true);
    });
});

test.describe('ddcw-fcu-unit: display numbers never gate a decision (#224)', () => {

    test('no display-unit local is compared against anything', () => {
        // The rule a second unit module copies: a dispTempNum-derived
        // number exists to be PAINTED. Thresholds live on the canonical
        // side — an IP constant against a value off `derived` — because a
        // display number drags the units toggle into the comparison, which
        // is how a healthy 4 °F coil painted "No ΔT across coil" for a
        // metric reader while a US reader saw healthy cooling.
        //
        // The comparison operand is deliberately UNCONSTRAINED. An earlier
        // draft anchored it to a numeric literal, which would have passed
        // the very regression this exists to stop: after the #224 fix the
        // likeliest way back in is `dtN <= COOLING_DT_TRIP` — right
        // constant, wrong operand — and a digit-anchored pattern cannot
        // see it. The `(?<!=)` on the reversed form keeps `=>` from
        // reading as the `>` operator, so an arrow function returning a
        // display local is not a false hit.
        //
        // Floor: this is a source scan of non-comment lines, so a trailing
        // `// dtN > -3` on a code line would trip it and a comparison
        // built by string concatenation would not. Read it as "no literal
        // display-unit comparison ships".
        const src = fs.readFileSync(path.join(SCRIPTS, 'ddcw-fcu-unit.js'), 'utf8');
        const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l));

        // Anti-vacuity 1: the display locals must still exist, or the scan
        // would pass by having nothing left to look at.
        expect(code.join('\n'), 'the display locals are still there')
            .toMatch(/const dtN\s*=/);

        const DISP = '(dtN|eatN|datN|spN|sensedN)';
        const OPS  = '(<=|>=|<|>|===|!==|==|!=)';
        const CMP  = new RegExp('\\b' + DISP + '\\s*' + OPS);
        const REV  = new RegExp('(?<!=)' + OPS + '\\s*' + DISP + '\\b');
        const hits = (l) => CMP.test(l) || REV.test(l);

        // Anti-vacuity 2: the pattern must still catch the shapes it is
        // for — both the original bug and the constant-named relapse.
        expect(hits('        const cooling = d.capActive && dtN <= -3;')).toBe(true);
        expect(hits('        const cooling = d.capActive && dtN <= COOLING_DT_TRIP;')).toBe(true);
        expect(hits('        } else if (COOLING_DT_TRIP < dtN) {')).toBe(true);
        expect(hits('        const pick = (d) => datN;'), 'arrow is not a comparison').toBe(false);

        expect(code.filter(hits),
            'a display-unit local gates a decision').toEqual([]);
    });
});
