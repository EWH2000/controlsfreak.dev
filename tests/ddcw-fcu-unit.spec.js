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
//   more fan → smaller ΔT; stage 2 outcools stage 1; a fault collapses
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
        path.join(__dirname, '..', 'html', 'simulators', 'ddc-workbench.html'),
        'utf8',
    );
    const m = src.match(/const FCU_PROGRAMS = \{[\s\S]*?\n {8}\};/);
    if (!m) throw new Error('FCU_PROGRAMS literal not found in ddc-workbench.html');
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

// Coil ΔT the page's verdict logic reasons about: actual return air
// minus the coil leaving temp (fan heat excluded — that is DAT's job).
function coilDt(plant) {
    return plant.derived.eatT - plant.derived.coilLeaveT;
}

// Trajectory run: integrate a mutated fresh plant N steps of dt sim-s.
function run(Unit, mutate, steps, dt) {
    const plant = Unit.createPlant();
    if (mutate) mutate(plant);
    for (let i = 0; i < steps; i++) Unit.update(plant, dt);
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

    test('more fan → smaller coil ΔT at a fixed stage (monotone, both stages)', () => {
        // The page's core lesson: the same load spread over more air is
        // a shallower ΔT. Fan values stay above the floor-clamp region
        // so the ordering is strict.
        const Unit = loadUnit();
        [1, 2].forEach((stage) => {
            const dts = [40, 70, 100].map((fan) => coilDt(quasi(Unit, (pl) => {
                pl.actuators['fan-speed'] = fan;
                pl.actuators.y1 = stage >= 1;
                pl.actuators.y2 = stage >= 2;
            })));
            expect(dts[0], 'stage ' + stage + ' 40% vs 70%').toBeGreaterThan(dts[1]);
            expect(dts[1], 'stage ' + stage + ' 70% vs 100%').toBeGreaterThan(dts[2]);
            expect(dts[2], 'stage ' + stage + ' ΔT at 100%').toBeGreaterThan(0);
        });
    });

    test('stage 2 pulls a deeper ΔT than stage 1 at the same fan', () => {
        const Unit = loadUnit();
        [70, 100].forEach((fan) => {
            const at = (stage) => coilDt(quasi(Unit, (pl) => {
                pl.actuators['fan-speed'] = fan;
                pl.actuators.y1 = true;
                pl.actuators.y2 = stage === 2;
            }));
            expect(at(2), fan + '% fan').toBeGreaterThan(at(1));
        });
    });

    test('lowCharge / airflow faults collapse the coil ΔT to zero', () => {
        // The "no ΔT over the coil" diagnostic: an energized-but-faulted
        // compressor moves no heat, so the coil leaves at the zone temp
        // EXACTLY (zero load through the psych solver is an identity).
        const Unit = loadUnit();
        const healthy = quasi(Unit, (pl) => { pl.actuators.y1 = true; pl.actuators.y2 = true; });
        expect(coilDt(healthy)).toBeGreaterThan(3);
        ['lowCharge', 'airflow'].forEach((fault) => {
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

    test('fan-enable false gates everything even with stages called', () => {
        // fan-enable is a real BO gate, not speed > 0 alone: no air, no
        // capacity, DAT reads the zone, and the blade animation stops.
        const Unit = loadUnit();
        const p = quasi(Unit, (pl) => {
            pl.actuators['fan-enable'] = false;
            pl.actuators.y1 = true;
            pl.actuators.y2 = true;
        });
        expect(p.derived.fanOn).toBe(false);
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
                ['none', 'lowCharge'].forEach((fault) => {
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

        pl.override.spaceTemp.active = false;                 // release rejoins them
        Unit.update(pl, 5);
        expect(pl.sensors['space-temp']).toBe(pl.zoneT);
    });
});

test.describe('ddcw-fcu-unit: programs × points (the binding invariant)', () => {

    // point kind → the FBE block type its seed block must carry.
    const KIND_TO_BLOCK = { ai: 'ai', bi: 'bi', ao: 'ao', bo: 'bo', param: 'const' };

    test('all three programs construct, tick, and carry every point with its kind-matched block type', () => {
        // The load-bearing identity: point id === seed FBE-block id in
        // EVERY program. A missing actuator block silently drops the
        // point to Relinquish_Default; a missing sensor block leaves a
        // sequence staging on a literal. Iterates whatever the registry
        // holds, so a fourth program is swept automatically.
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
                const blk = byId[p.id];
                expect(blk, name + ': no seed block for point ' + p.id).toBeTruthy();
                expect(blk.type, name + ': ' + p.id + ' block type').toBe(KIND_TO_BLOCK[p.kind]);
            });
        });
    });

    test('every hard-IO block on every sheet is a bound point', () => {
        // The reverse direction: an ai / ao / bo block whose id is not a
        // point would render as IO the binding never drives — a dead
        // actuator or a frozen fake sensor. `bi` blocks are exempt by
        // design: they are program-local toggle sources (cool-2stage-
        // fanon's `fanon`), the same idiom as the sim page's sts/rst.
        const Unit = loadUnit();
        const pointIds = new Set(Unit.POINTS.map((p) => p.id));
        Object.entries(loadPrograms()).forEach(([name, def]) => {
            def.blocks.forEach((b) => {
                if (b.type === 'ai' || b.type === 'ao' || b.type === 'bo') {
                    expect(
                        pointIds.has(b.id),
                        name + ': ' + b.type + ' block ' + b.id + ' is not an FCU point',
                    ).toBe(true);
                }
            });
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
});
