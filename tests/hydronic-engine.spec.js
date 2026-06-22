// Engine-direct tests for /scripts/hydronic-engine.js. Lives under
// tests/*.spec.js so the same `npm test` (Playwright) runner picks it up —
// Playwright workers are Node processes, the `page` fixture is just unused
// here. Same vm-loader trick as wiring-engine.spec.js / psychro-engine.spec.js.
//
// hydronic-engine.js ends with `const HYDRO = (function(){…})();` plus
// `if (typeof window…) window.HYDRO = HYDRO;`. A trailing `; HYDRO;` makes
// runInNewContext return the engine; the window/module guards skip in the
// empty vm sandbox. loadEngine() is called fresh per test — no state bleed.
//
// The hydraulic solver is validated three ways, strongest first:
//   1. closed-form operating point of a known pump + resistance loop,
//   2. physical invariants the solver must satisfy at convergence — mass
//      conservation (KCL) at every node, and the signed branch law on every
//      branch (a self-consistency / energy check),
//   3. behavioral checks of each component (valve closes → flow drops, 3-way
//      holds pump flow, balance valve rebalances a split, coil ΔT = q/500·gpm),
// plus the must-never-NaN edge cases (shut valve, dead pump, islands).

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

function loadEngine() {
    const src = fs.readFileSync(
        path.join(__dirname, '..', 'html', 'scripts', 'hydronic-engine.js'),
        'utf8',
    );
    return vm.runInNewContext(src + '\n; HYDRO;', {});
}

// ── builders (fresh per call so a test can mutate without bleed) ────────

// Minimal closed series loop: pump → coil → back to pump, two pipes.
function seriesLoop(HYDRO, opts) {
    opts = opts || {};
    return HYDRO.makeSystem({
        components: [
            { id: 'p1', type: 'pump', pos: { x: 0, y: 0, z: 0 },
              params: Object.assign({ h0: 40, a: 0.012, speed: 100, on: true }, opts.pump) },
            { id: 'c1', type: 'coil', pos: { x: 4, y: 0, z: 0 },
              params: Object.assign({ k: 0.02, qdesign: 120, tspace: 70 }, opts.coil) },
        ],
        pipes: [
            { id: 'sa', from: ['p1', 'out'], to: ['c1', 'in'] },
            { id: 'sb', from: ['c1', 'out'], to: ['p1', 'in'] },
        ],
    });
}

// Heated loop with a plant as the thermal source: plant → pump → coil → plant.
function heatedLoop(HYDRO, opts) {
    opts = opts || {};
    return HYDRO.makeSystem({
        components: [
            { id: 'pl', type: 'plant', pos: { x: 0, y: 0, z: 0 },
              params: Object.assign({ mode: 'heat', lwt: 180, qmax: 800, k: 0.005 }, opts.plant) },
            { id: 'p1', type: 'pump', pos: { x: 3, y: 0, z: 0 },
              params: Object.assign({ h0: 40, a: 0.012, speed: 100, on: true }, opts.pump) },
            { id: 'c1', type: 'coil', pos: { x: 6, y: 0, z: 0 },
              params: Object.assign({ k: 0.02, qdesign: 120, tspace: 70 }, opts.coil) },
        ],
        pipes: [
            { id: 'a', from: ['pl', 'out'], to: ['p1', 'in'] },
            { id: 'b', from: ['p1', 'out'], to: ['c1', 'in'] },
            { id: 'c', from: ['c1', 'out'], to: ['pl', 'in'] },
        ],
    });
}

// Loop with a 2-way throttling valve in series: pump → valve2 → coil → pump.
function valveLoop(HYDRO, valveParams) {
    return HYDRO.makeSystem({
        components: [
            { id: 'p1', type: 'pump',   pos: { x: 0, y: 0, z: 0 },
              params: { h0: 40, a: 0.012, speed: 100, on: true } },
            { id: 'v1', type: 'valve2', pos: { x: 3, y: 0, z: 0 },
              params: Object.assign({ cv: 8, pos: 100, eqpct: false }, valveParams) },
            { id: 'c1', type: 'coil',   pos: { x: 6, y: 0, z: 0 },
              params: { k: 0.02, qdesign: 120, tspace: 70 } },
        ],
        pipes: [
            { id: 'a', from: ['p1', 'out'], to: ['v1', 'in'] },
            { id: 'b', from: ['v1', 'out'], to: ['c1', 'in'] },
            { id: 'c', from: ['c1', 'out'], to: ['p1', 'in'] },
        ],
    });
}

// Two parallel coils off a supply tee / return tee, fed by one pump.
//   pump → teeS.a ; teeS.b → coilA → teeR.a ; teeS.c → coilB → teeR.b ;
//   teeR.c → pump
function parallelLoop(HYDRO, opts) {
    opts = opts || {};
    return HYDRO.makeSystem({
        components: [
            { id: 'p1',  type: 'pump', pos: { x: 0, y: 0, z: 0 },
              params: { h0: 40, a: 0.012, speed: 100, on: true } },
            { id: 'ts',  type: 'tee',  pos: { x: 3, y: 0, z: 0 } },
            { id: 'ca',  type: 'coil', pos: { x: 6, y: 0, z: 2 },
              params: Object.assign({ k: 0.05, qdesign: 60, tspace: 70 }, opts.coilA) },
            { id: 'cb',  type: 'coil', pos: { x: 6, y: 0, z: -2 },
              params: Object.assign({ k: 0.05, qdesign: 60, tspace: 70 }, opts.coilB) },
            { id: 'extra', type: 'balanceValve', pos: { x: 4.5, y: 0, z: 2 },
              // big Cv so a wide-open setting is ~lossless — the imbalance a test
              // creates with unequal coils then shows, and tightening throttles it.
              params: Object.assign({ cv: 40, setting: 100 }, opts.balA) },
            { id: 'tr',  type: 'tee',  pos: { x: 9, y: 0, z: 0 } },
        ],
        pipes: [
            { id: 'p_in',  from: ['p1', 'out'],  to: ['ts', 'a'] },
            // branch A goes through the balance valve so a test can throttle it
            { id: 'a_bal', from: ['ts', 'b'],    to: ['extra', 'in'] },
            { id: 'a_coil',from: ['extra', 'out'], to: ['ca', 'in'] },
            { id: 'a_ret', from: ['ca', 'out'],  to: ['tr', 'a'] },
            // branch B straight
            { id: 'b_coil',from: ['ts', 'c'],    to: ['cb', 'in'] },
            { id: 'b_ret', from: ['cb', 'out'],  to: ['tr', 'b'] },
            { id: 'p_out', from: ['tr', 'c'],    to: ['p1', 'in'] },
        ],
    });
}

// ── model readers ──────────────────────────────────────────────────────
function branchById(model, id) { return model.branches.find((b) => b.id === id); }
function qOf(model, compId) {            // |flow| of a component's first branch
    const b = branchById(model, compId + '#0');
    return b ? Math.abs(b.Q) : 0;
}
function pipeQ(model, pipeId) {
    const b = branchById(model, 'pipe#' + pipeId);
    return b ? Math.abs(b.Q) : 0;
}
function allFinite(model) {
    return model.nodes.every((n) => isFinite(n.P) && isFinite(n.T)) &&
           model.branches.every((b) => isFinite(b.Q));
}

test.describe('hydronic-engine: catalog + factory', () => {

    test('createComponent fills defaults; unknown type → null', () => {
        const HYDRO = loadEngine();
        const p = HYDRO.createComponent('pump', 'p1', 2, 5);
        expect(p.type).toBe('pump');
        expect(p.id).toBe('p1');
        expect(p.pos).toEqual({ x: 2, y: 0, z: 5 });
        expect(p.params.h0).toBe(40);
        expect(p.params.on).toBe(true);
        // mutating the instance can't reach the catalog default
        p.params.h0 = 99;
        expect(HYDRO.COMPONENTS.pump.params.find((x) => x.name === 'h0').default).toBe(40);
        expect(HYDRO.createComponent('no-such', 'z', 0, 0)).toBeNull();
    });

    test('every catalog type and category is well-formed', () => {
        const HYDRO = loadEngine();
        expect(HYDRO.CATEGORIES.length).toBeGreaterThan(0);
        for (const type of Object.keys(HYDRO.COMPONENTS)) {
            const def = HYDRO.COMPONENTS[type];
            expect(def, type).toBeTruthy();
            expect(Array.isArray(def.ports), type + ' ports').toBe(true);
            expect(HYDRO.CATEGORIES.indexOf(def.category), type + ' category in CATEGORIES')
                .toBeGreaterThan(-1);
            // every branch's from/to names exist as ports
            (def.branches || []).forEach((b) => {
                expect(def.ports.some((p) => p.name === b.from), type + ' branch.from').toBe(true);
                expect(def.ports.some((p) => p.name === b.to), type + ' branch.to').toBe(true);
            });
        }
    });

    test('makeSystem drops unknown components and dangling pipes', () => {
        const HYDRO = loadEngine();
        const sys = HYDRO.makeSystem({
            components: [
                { id: 'p1', type: 'pump' },
                { id: 'x1', type: 'bogus' },                 // unknown → dropped
            ],
            pipes: [
                { id: 'd1', from: ['p1', 'out'], to: ['x1', 'in'] },   // → dangling, dropped
                { id: 'd2', from: ['p1', 'out'], to: ['p1', 'nope'] }, // bad port, dropped
            ],
        });
        expect(sys.components.length).toBe(1);
        expect(sys.pipes.length).toBe(0);
    });
});

test.describe('hydronic-engine: hydraulic solver', () => {

    test('single loop hits the closed-form operating point', () => {
        const HYDRO = loadEngine();
        const S = HYDRO.SETTINGS;
        const sys = seriesLoop(HYDRO);
        const model = HYDRO.solve(sys);
        expect(model.converged).toBe(true);

        // Closed loop, elevation cancels. Balance: hsrc = Σ k·Q² around the loop.
        //   h0 − a·Q² = (pump casing + 2 pipes + coil) · Q²
        //   Q = sqrt(h0 / (a + k_total))
        const kTotal = S.K_PUMP_CASE + 2 * S.K_PIPE + 0.02;
        const qExpected = Math.sqrt(40 / (0.012 + kTotal));
        expect(Math.abs(qOf(model, 'p1') - qExpected)).toBeLessThan(0.05);
        // ~34.3 GPM for these anchors — sanity that it's in the right ballpark
        expect(qOf(model, 'p1')).toBeGreaterThan(30);
        expect(qOf(model, 'p1')).toBeLessThan(40);
    });

    test('mass is conserved (KCL) at every node', () => {
        const HYDRO = loadEngine();
        const model = HYDRO.solve(parallelLoop(HYDRO));
        expect(model.converged).toBe(true);
        const net = new Array(model.nodes.length).fill(0);
        model.branches.forEach((b) => { net[b.nodeTo] += b.Q; net[b.nodeFrom] -= b.Q; });
        net.forEach((v, i) => expect(Math.abs(v), 'node ' + i + ' imbalance').toBeLessThan(1e-3));
    });

    test('every branch satisfies the signed branch law at convergence', () => {
        const HYDRO = loadEngine();
        const model = HYDRO.solve(valveLoop(HYDRO, { pos: 60 }));
        expect(model.converged).toBe(true);
        // P_from − P_to should equal  k·Q·|Q| − hsrc + (Z_to − Z_from)
        model.branches.forEach((b) => {
            const lhs = model.nodes[b.nodeFrom].P - model.nodes[b.nodeTo].P;
            const rhs = b.k * b.Q * Math.abs(b.Q) - b.hsrc + (b.Zto - b.Zfrom);
            expect(Math.abs(lhs - rhs), 'branch ' + b.id + ' law residual').toBeLessThan(1e-2);
        });
    });

    test('parallel branch flows sum to the pump flow', () => {
        const HYDRO = loadEngine();
        const model = HYDRO.solve(parallelLoop(HYDRO));
        const total = qOf(model, 'p1');
        const split = qOf(model, 'ca') + qOf(model, 'cb');
        expect(Math.abs(total - split)).toBeLessThan(1e-2);
        expect(total).toBeGreaterThan(0.5);
    });

    test('static head cancels around a closed loop under a whole-system lift', () => {
        const HYDRO = loadEngine();
        const flat = HYDRO.solve(seriesLoop(HYDRO));
        // Lift the WHOLE loop 50 ft. Every pipe's developed length AND every
        // elevation difference is unchanged, so the static head cancels and the
        // friction is identical → exactly the same flow. This isolates the
        // static-head cancellation from the developed-length friction below
        // (the old single test conflated the two by raising only the coil).
        const lifted = seriesLoop(HYDRO);
        lifted.components.forEach((c) => { c.pos.z += 50; });
        const model = HYDRO.solve(lifted);
        expect(Math.abs(qOf(model, 'p1') - qOf(flat, 'p1'))).toBeLessThan(1e-3);
    });

    test('a longer riser adds pipe friction and shaves flow (static still cancels)', () => {
        const HYDRO = loadEngine();
        const S = HYDRO.SETTINGS;
        const flat = HYDRO.solve(seriesLoop(HYDRO));
        // Raise ONLY the coil onto a 30 ft riser: the static lift up still
        // cancels on the drop back (closed loop), but the supply + return pipes
        // are now ~30 ft longer, so their friction (k = K_PER_FT·L, above the
        // K_PIPE floor) is real head loss → flow drops. The layout's footage
        // matters now; it didn't in phase 1 (flat K_PIPE).
        const tall = seriesLoop(HYDRO);
        tall.components.find((c) => c.id === 'c1').pos.z = 30;
        const model = HYDRO.solve(tall);
        const riser = model.branches.find((b) => b.id === 'pipe#sa');
        expect(riser.length).toBeGreaterThan(28);              // the supply riser grew
        expect(riser.k).toBeGreaterThan(S.K_PIPE);             // above the floor now
        expect(qOf(model, 'p1')).toBeLessThan(qOf(flat, 'p1'));        // friction shaved flow
        expect(qOf(model, 'p1')).toBeGreaterThan(qOf(flat, 'p1') - 1); // but only a hair
    });

    test('pipe resistance scales with 3D developed length, floored at K_PIPE', () => {
        const HYDRO = loadEngine();
        const S = HYDRO.SETTINGS;
        // A short loop: both pipes are under the ~20 ft crossover, so each
        // floors at K_PIPE (phase-1 behavior is preserved for short runs — this
        // is why the closed-form operating-point tests above still hold).
        const m = HYDRO.solve(seriesLoop(HYDRO));
        m.branches.filter((b) => b.kind === 'pipe').forEach((b) => {
            expect(b.length).toBeLessThan(20);
            expect(b.k).toBeCloseTo(S.K_PIPE, 9);              // floored
        });
        // A deliberately long run: k = K_PER_FT · length, comfortably above floor.
        const longSys = HYDRO.makeSystem({
            components: [
                { id: 'p1', type: 'pump', pos: { x: 0,  y: 0, z: 0 }, params: { h0: 40, a: 0.012, speed: 100, on: true } },
                { id: 'c1', type: 'coil', pos: { x: 90, y: 0, z: 0 }, params: { k: 0.02 } },
            ],
            pipes: [
                { id: 'go',  from: ['p1', 'out'], to: ['c1', 'in'] },
                { id: 'ret', from: ['c1', 'out'], to: ['p1', 'in'] },
            ],
        });
        const go = HYDRO.solve(longSys).branches.find((b) => b.id === 'pipe#go');
        expect(go.length).toBeGreaterThan(85);
        expect(go.k).toBeCloseTo(S.K_PER_FT * go.length, 9);
        expect(go.k).toBeGreaterThan(S.K_PIPE);
    });

    test('an explicit k_pipe literal overrides the length derivation', () => {
        const HYDRO = loadEngine();
        // A pinned k_pipe is a manual override — makeSystem preserves it and
        // flatten skips the length derivation for that pipe.
        const sys = HYDRO.makeSystem({
            components: [
                { id: 'p1', type: 'pump', pos: { x: 0,  y: 0, z: 0 }, params: { h0: 40, a: 0.012, speed: 100, on: true } },
                { id: 'c1', type: 'coil', pos: { x: 90, y: 0, z: 0 }, params: { k: 0.02 } },
            ],
            pipes: [
                { id: 'go',  from: ['p1', 'out'], to: ['c1', 'in'], k_pipe: 0.003 },   // pinned
                { id: 'ret', from: ['c1', 'out'], to: ['p1', 'in'] },
            ],
        });
        const m = HYDRO.solve(sys);
        expect(m.branches.find((b) => b.id === 'pipe#go').k).toBeCloseTo(0.003, 9);
    });

    test('writeback exposes each pipe developed length and friction head loss', () => {
        const HYDRO = loadEngine();
        const sys = seriesLoop(HYDRO);
        HYDRO.tick(sys, 0.1);
        sys.pipes.forEach((p) => {
            expect(isFinite(p.length)).toBe(true);
            expect(p.length).toBeGreaterThan(0);
            expect(isFinite(p.dH)).toBe(true);
            expect(p.dH).toBeGreaterThanOrEqual(0);
        });
    });

    test('a fresh solve converges within MAX_ITERS; a warm re-solve in a few', () => {
        const HYDRO = loadEngine();
        const sys = seriesLoop(HYDRO);
        const cold = HYDRO.solve(sys);                 // cold: Q starts at 0
        expect(cold.converged).toBe(true);
        expect(cold.iters).toBeLessThanOrEqual(HYDRO.SETTINGS.MAX_ITERS);
        // tick() writes warm-start flows back onto the system; re-solving is fast.
        HYDRO.tick(sys, 0.1);
        const warm = HYDRO.solve(sys);
        expect(warm.converged).toBe(true);
        expect(warm.iters).toBeLessThanOrEqual(4);
    });
});

test.describe('hydronic-engine: valves', () => {

    test('a 2-way valve throttles total flow as it closes', () => {
        const HYDRO = loadEngine();
        const open  = qOf(HYDRO.solve(valveLoop(HYDRO, { pos: 100 })), 'p1');
        const part  = qOf(HYDRO.solve(valveLoop(HYDRO, { pos: 40  })), 'p1');
        const tiny  = qOf(HYDRO.solve(valveLoop(HYDRO, { pos: 10  })), 'p1');
        expect(open).toBeGreaterThan(part);
        expect(part).toBeGreaterThan(tiny);
    });

    test('a shut 2-way valve starves the loop to ~0 with no NaN', () => {
        const HYDRO = loadEngine();
        const model = HYDRO.solve(valveLoop(HYDRO, { pos: 0 }));
        expect(allFinite(model)).toBe(true);
        expect(qOf(model, 'p1')).toBeLessThan(0.05);
    });

    test('a 3-way valve holds pump flow while diverting coil flow to bypass', () => {
        const HYDRO = loadEngine();
        // A faithful diverting circuit: the bypass carries a balance valve sized
        // to match the coil's resistance, so the through-vs-bypass paths are
        // comparable and diverting holds total flow ~constant (the real-world
        // commissioning trick — an unmatched bare-pipe bypass would instead let
        // pump flow climb as the valve opens the low-resistance shortcut).
        //   pump → v3.a ; v3.b → coil → tr.a ; v3.c → bypassBal → tr.b ; tr.c → pump
        function v3Loop(pos) {
            return HYDRO.makeSystem({
                components: [
                    { id: 'p1', type: 'pump',   pos: { x: 0, y: 0, z: 0 },
                      params: { h0: 40, a: 0.012, speed: 100, on: true } },
                    { id: 'v3', type: 'valve3', pos: { x: 3, y: 0, z: 0 },
                      params: { cv: 10, pos: pos } },
                    { id: 'c1', type: 'coil',   pos: { x: 6, y: 0, z: 0 },
                      params: { k: 0.04, qdesign: 120, tspace: 70 } },
                    { id: 'bp', type: 'balanceValve', pos: { x: 6, y: 0, z: -2 },
                      params: { cv: 8, setting: 95 } },     // Cv≈7.6 → k≈0.04 ≈ coil
                    { id: 'tr', type: 'tee',    pos: { x: 9, y: 0, z: 0 } },
                ],
                pipes: [
                    { id: 'a', from: ['p1', 'out'], to: ['v3', 'a'] },
                    { id: 'b', from: ['v3', 'b'],   to: ['c1', 'in'] },
                    { id: 'c', from: ['c1', 'out'], to: ['tr', 'a'] },
                    { id: 'd', from: ['v3', 'c'],   to: ['bp', 'in'] },
                    { id: 'e', from: ['bp', 'out'], to: ['tr', 'b'] },
                    { id: 'f', from: ['tr', 'c'],   to: ['p1', 'in'] },
                ],
            });
        }
        const hi = HYDRO.solve(v3Loop(100));
        const lo = HYDRO.solve(v3Loop(30));
        expect(hi.converged && lo.converged).toBe(true);

        const pumpHi = qOf(hi, 'p1'), pumpLo = qOf(lo, 'p1');
        const coilHi = qOf(hi, 'c1'), coilLo = qOf(lo, 'c1');
        // Coil (through) flow drops hard as the valve diverts to bypass…
        expect(coilLo).toBeLessThan(coilHi * 0.6);
        // …while pump flow barely moves — the constant-flow lesson. The pump's
        // relative change is a fraction of the coil's.
        const pumpChange = Math.abs(pumpHi - pumpLo) / pumpHi;
        const coilChange = Math.abs(coilHi - coilLo) / coilHi;
        expect(pumpChange).toBeLessThan(coilChange * 0.5);
        expect(pumpChange).toBeLessThan(0.3);
    });

    test('a balance valve throttles a flow-hogging parallel branch toward balance', () => {
        const HYDRO = loadEngine();
        // Branch A's coil is lower-resistance, so wide open it hogs the split;
        // its balance valve (big Cv) is ~lossless open. Tightening it adds
        // resistance to A and pulls the split back toward even.
        const unbal = HYDRO.solve(parallelLoop(HYDRO, {
            coilA: { k: 0.03 }, coilB: { k: 0.06 }, balA: { setting: 100 } }));
        const bal   = HYDRO.solve(parallelLoop(HYDRO, {
            coilA: { k: 0.03 }, coilB: { k: 0.06 }, balA: { setting: 18 } }));
        const aU = qOf(unbal, 'ca'), bU = qOf(unbal, 'cb');
        const aB = qOf(bal, 'ca'),   bB = qOf(bal, 'cb');
        expect(aU).toBeGreaterThan(bU);                              // low-resistance A hogs flow
        expect(aB).toBeLessThan(aU);                                // throttling A drops its flow
        expect(Math.abs(aB - bB)).toBeLessThan(Math.abs(aU - bU));  // closer to balanced
    });
});

test.describe('hydronic-engine: thermal transport', () => {

    test('coil ΔT obeys q = 500 · GPM · ΔT once the loop is warm', () => {
        const HYDRO = loadEngine();
        const sys = heatedLoop(HYDRO);
        for (let i = 0; i < 60; i++) HYDRO.tick(sys, 0.1);   // let the loop warm to steady
        const coil = sys.components.find((c) => c.id === 'c1');
        const q = coil.out.Q;
        expect(q).toBeGreaterThan(1);
        // fixed-load coil: ΔT = qdesign / (500 · GPM), uncapped (hot water,
        // Tin well above the 70 °F space).
        const dtExpected = (120 * 1000) / (500 * q);
        expect(coil.out.dT).toBeCloseTo(dtExpected, 1);
        // and the reported heat closes with the same constant
        expect(coil.out.Qheat).toBeCloseTo(500 * q * coil.out.dT, 0);
        expect(coil.out.Tin).toBeGreaterThan(coil.out.Tout);     // heating: water cools at the coil
    });

    test('a cold loop warms up over ticks toward the plant setpoint', () => {
        const HYDRO = loadEngine();
        const sys = heatedLoop(HYDRO);
        HYDRO.tick(sys, 0.1);
        const plant = () => sys.components.find((c) => c.id === 'pl').out;
        const early = plant().lwt;
        for (let i = 0; i < 80; i++) HYDRO.tick(sys, 0.1);
        const late = plant().lwt;
        expect(late).toBeGreaterThan(early - 1);     // monotone-ish warm-up
        expect(late).toBeGreaterThan(150);           // approaches the 180 °F setpoint
        expect(late).toBeLessThanOrEqual(180.001);   // never overshoots the setpoint
    });

    test('a UA coil duty tracks the approach: q ≈ UA · (Tin − tspace)', () => {
        const HYDRO = loadEngine();
        const sys = heatedLoop(HYDRO, { coil: { coilmode: 'ua', ua: 1000, tspace: 70 } });
        for (let i = 0; i < 100; i++) HYDRO.tick(sys, 0.1);   // warm to steady
        const coil = sys.components.find((c) => c.id === 'c1').out;
        expect(coil.Q).toBeGreaterThan(1);
        // At steady state ΔT = q/(500·GPM) so Qheat = 500·GPM·ΔT = q itself —
        // and q = UA·approach. (The cap-at-tspace band is far off: 70 vs ~180.)
        const expected = 1000 * Math.abs(coil.Tin - 70);
        expect(Math.abs(coil.Qheat - expected)).toBeLessThan(Math.max(50, expected * 0.01));
        // ΔT still closes with the site constant q = 500 · GPM · ΔT
        expect(coil.Qheat).toBeCloseTo(500 * coil.Q * coil.dT, -1);
    });

    test('a UA coil delivers less as the approach shrinks (space warms toward supply)', () => {
        const HYDRO = loadEngine();
        const warm = (tspace) => {
            const sys = heatedLoop(HYDRO, { coil: { coilmode: 'ua', ua: 1000, tspace: tspace } });
            for (let i = 0; i < 100; i++) HYDRO.tick(sys, 0.1);
            return sys.components.find((c) => c.id === 'c1').out;
        };
        const big   = warm(70);    // ~110 °F approach to a 180 °F supply
        const small = warm(150);   // ~30 °F approach
        expect(small.Qheat).toBeLessThan(big.Qheat * 0.6);   // duty tracks the approach
        expect(small.dT).toBeLessThan(big.dT);               // smaller drop per pass
    });

    test('a chilled plant drives the loop the other way (water warms at the coil)', () => {
        const HYDRO = loadEngine();
        const sys = heatedLoop(HYDRO, { plant: { mode: 'cool', lwt: 44, qmax: 800 } });
        for (let i = 0; i < 80; i++) HYDRO.tick(sys, 0.1);
        const coil = sys.components.find((c) => c.id === 'c1').out;
        expect(coil.Tin).toBeLessThan(60);           // chilled supply reaches the coil
        expect(coil.Tout).toBeGreaterThan(coil.Tin); // cooling: water warms at the coil
    });

    test('every temperature stays inside the sane band, never NaN', () => {
        const HYDRO = loadEngine();
        const sys = heatedLoop(HYDRO, { plant: { lwt: 999 } });   // absurd setpoint
        for (let i = 0; i < 40; i++) HYDRO.tick(sys, 0.1);
        const model = HYDRO.solve(sys);
        expect(allFinite(model)).toBe(true);
        sys.pipes.forEach((p) => {
            expect(p.T).toBeGreaterThanOrEqual(HYDRO.SETTINGS.TEMP_MIN - 0.001);
            expect(p.T).toBeLessThanOrEqual(HYDRO.SETTINGS.TEMP_MAX + 0.001);
        });
    });
});

test.describe('hydronic-engine: must-never-NaN edge cases', () => {

    test('a disabled pump moves no flow', () => {
        const HYDRO = loadEngine();
        const model = HYDRO.solve(seriesLoop(HYDRO, { pump: { on: false } }));
        expect(allFinite(model)).toBe(true);
        expect(qOf(model, 'p1')).toBeLessThan(1e-2);
    });

    test('a pump at 0 % speed moves no flow', () => {
        const HYDRO = loadEngine();
        const model = HYDRO.solve(seriesLoop(HYDRO, { pump: { speed: 0 } }));
        expect(qOf(model, 'p1')).toBeLessThan(1e-2);
        expect(allFinite(model)).toBe(true);
    });

    test('disconnected islands solve independently with no NaN', () => {
        const HYDRO = loadEngine();
        // two unrelated loops + one stray, unpiped component in the same system
        const a = seriesLoop(HYDRO);
        const sys = HYDRO.makeSystem({
            components: [
                { id: 'p1', type: 'pump', pos: { x: 0, y: 0, z: 0 },
                  params: { h0: 40, a: 0.012, speed: 100, on: true } },
                { id: 'c1', type: 'coil', pos: { x: 4, y: 0, z: 0 }, params: { k: 0.02 } },
                { id: 'p2', type: 'pump', pos: { x: 0, y: 0, z: 10 },
                  params: { h0: 30, a: 0.01, speed: 80, on: true } },
                { id: 'c2', type: 'coil', pos: { x: 4, y: 0, z: 10 }, params: { k: 0.03 } },
                { id: 'lonely', type: 'valve2', pos: { x: 8, y: 0, z: 0 } },   // no pipes
            ],
            pipes: [
                { id: 'a1', from: ['p1', 'out'], to: ['c1', 'in'] },
                { id: 'a2', from: ['c1', 'out'], to: ['p1', 'in'] },
                { id: 'b1', from: ['p2', 'out'], to: ['c2', 'in'] },
                { id: 'b2', from: ['c2', 'out'], to: ['p2', 'in'] },
            ],
        });
        const model = HYDRO.solve(sys);
        expect(allFinite(model)).toBe(true);
        expect(qOf(model, 'p1')).toBeGreaterThan(1);
        expect(qOf(model, 'p2')).toBeGreaterThan(1);
    });

    test('an empty system and a lone component never throw or NaN', () => {
        const HYDRO = loadEngine();
        const empty = HYDRO.solve(HYDRO.makeSystem({ components: [], pipes: [] }));
        expect(empty.nodes.length).toBe(0);
        const lone = HYDRO.makeSystem({
            components: [{ id: 'p1', type: 'pump' }], pipes: [],
        });
        const model = HYDRO.tick(lone, 0.1);          // tick, not just solve
        expect(allFinite(model)).toBe(true);
        expect(qOf(model, 'p1')).toBeLessThan(1e-2);   // deadheaded pump
    });

    test('tick mutates pipes and component out for the render', () => {
        const HYDRO = loadEngine();
        const sys = heatedLoop(HYDRO);
        HYDRO.tick(sys, 0.1);
        sys.pipes.forEach((p) => {
            expect(isFinite(p.Q)).toBe(true);
            expect([-1, 0, 1]).toContain(p.dir);
            expect(isFinite(p.T)).toBe(true);
        });
        const pump = sys.components.find((c) => c.id === 'p1').out;
        expect(isFinite(pump.Q)).toBe(true);
        expect(isFinite(pump.head)).toBe(true);
    });
});

// Regressions for the issues the adversarial physics review surfaced. Each
// targets a concrete defect that the original 22 tests did not exercise.
test.describe('hydronic-engine: review regressions', () => {

    // A setpoint plant must only act on its own side of the water: a boiler can
    // ADD heat, never remove it (and a chiller the reverse). Before the fix, a
    // return hotter than a heating setpoint made the "boiler" cool the loop.
    test('a setpoint boiler never cools the loop when the return runs hot', () => {
        const HYDRO = loadEngine();
        // tspace (200) above the boiler setpoint (120) drives the coil to WARM the
        // water past the setpoint, so the return reaches the plant hotter than lwt.
        const sys = heatedLoop(HYDRO, {
            plant: { mode: 'heat', srcmode: 'setpoint', lwt: 120, qmax: 600 },
            coil:  { k: 0.02, qdesign: 300, tspace: 200 },
        });
        for (let i = 0; i < 120; i++) HYDRO.tick(sys, 0.1);
        const pl = sys.components.find((c) => c.id === 'pl').out;
        // Off its heating side the boiler is a pass-through — it never leaves the
        // water COLDER than it entered.
        expect(pl.lwt).toBeGreaterThanOrEqual(pl.ewt - 0.05);
    });

    test('a setpoint chiller never heats the loop when the return runs cold', () => {
        const HYDRO = loadEngine();
        const sys = heatedLoop(HYDRO, {
            plant: { mode: 'cool', srcmode: 'setpoint', lwt: 60, qmax: 600 },
            coil:  { k: 0.02, qdesign: 300, tspace: 20 },   // chills the water below 60
        });
        for (let i = 0; i < 120; i++) HYDRO.tick(sys, 0.1);
        const pl = sys.components.find((c) => c.id === 'pl').out;
        expect(pl.lwt).toBeLessThanOrEqual(pl.ewt + 0.05);
    });

    // Two pumps in series (a trivial drag-together) made the secant iteration
    // limit-cycle before adaptive damping landed.
    test('two pumps in series converge to a steady flow', () => {
        const HYDRO = loadEngine();
        const sys = HYDRO.makeSystem({
            components: [
                { id: 'p1', type: 'pump', pos: { x: 0, y: 0, z: 0 }, params: { h0: 40, a: 0.012, speed: 100, on: true } },
                { id: 'p2', type: 'pump', pos: { x: 2, y: 0, z: 0 }, params: { h0: 40, a: 0.012, speed: 100, on: true } },
                { id: 'c1', type: 'coil', pos: { x: 4, y: 0, z: 0 }, params: { k: 0.02 } },
            ],
            pipes: [
                { id: 'a', from: ['p1', 'out'], to: ['p2', 'in'] },
                { id: 'b', from: ['p2', 'out'], to: ['c1', 'in'] },
                { id: 'c', from: ['c1', 'out'], to: ['p1', 'in'] },
            ],
        });
        const m = HYDRO.solve(sys);
        expect(m.converged).toBe(true);
        // Two 40-ft pumps in series move more than one — but a finite, sane flow.
        expect(qOf(m, 'p1')).toBeGreaterThan(qOf(HYDRO.solve(seriesLoop(HYDRO)), 'p1'));
        expect(qOf(m, 'p1')).toBeLessThan(HYDRO.SETTINGS.Q_CAP);
    });

    // A loop whose true operating point exceeds Q_CAP must report NOT converged
    // rather than silently returning the clamp ceiling as if it solved.
    test('a supra-Q_CAP loop reports converged:false, never a false positive', () => {
        const HYDRO = loadEngine();
        const sys = HYDRO.makeSystem({
            components: [
                { id: 'p1', type: 'pump', pos: { x: 0, y: 0, z: 0 }, params: { h0: 5000, a: 0.0001, speed: 100, on: true } },
                { id: 'c1', type: 'coil', pos: { x: 2, y: 0, z: 0 }, params: { k: 1e-6 } },
            ],
            pipes: [
                { id: 'a', from: ['p1', 'out'], to: ['c1', 'in'] },
                { id: 'b', from: ['c1', 'out'], to: ['p1', 'in'] },
            ],
        });
        const m = HYDRO.solve(sys);
        expect(m.converged).toBe(false);
        expect(allFinite(m)).toBe(true);                  // still finite, never NaN
    });

    // A self-loop pipe (both ends on one node, e.g. across a tee) carries no flow
    // and must not perturb the rest of the loop or report a phantom Q.
    test('a self-loop pipe carries ~0 flow and leaves the loop solution intact', () => {
        const HYDRO = loadEngine();
        const comps = [
            { id: 'p1', type: 'pump', pos: { x: 0, y: 0, z: 0 }, params: { h0: 40, a: 0.012, speed: 100, on: true } },
            { id: 'c1', type: 'coil', pos: { x: 4, y: 0, z: 0 }, params: { k: 0.02 } },
            { id: 't1', type: 'tee',  pos: { x: 6, y: 0, z: 0 } },
        ];
        const realPipes = [
            { id: 'a', from: ['p1', 'out'], to: ['c1', 'in'] },
            { id: 'b', from: ['c1', 'out'], to: ['t1', 'a'] },
            { id: 'r', from: ['t1', 'b'],   to: ['p1', 'in'] },
        ];
        // identical topology, with vs without a self-loop pipe across the tee —
        // isolates the self-loop's effect (should be none).
        const ref = HYDRO.solve(HYDRO.makeSystem({ components: comps, pipes: realPipes }));
        const m = HYDRO.solve(HYDRO.makeSystem({
            components: comps,
            pipes: realPipes.concat([{ id: 'self', from: ['t1', 'a'], to: ['t1', 'c'] }]),
        }));
        expect(allFinite(m)).toBe(true);
        expect(pipeQ(m, 'self')).toBeLessThan(1e-3);      // no phantom flow
        // the real loop flow is unchanged by the dead-end self-loop
        expect(Math.abs(qOf(m, 'p1') - qOf(ref, 'p1'))).toBeLessThan(0.02);
        // …and the readout reports no developed length for the flowless self-loop
        const sys = HYDRO.makeSystem({
            components: comps,
            pipes: realPipes.concat([{ id: 'self', from: ['t1', 'a'], to: ['t1', 'c'] }]),
        });
        HYDRO.tick(sys, 0.1);
        expect(sys.pipes.find((p) => p.id === 'self').length).toBe(0);
    });

    // makeSystem's contract is fail-soft: a corrupted / hand-authored literal
    // (non-array list, null entry, duplicate pipe ids) is coerced, never thrown.
    test('makeSystem coerces a malformed literal instead of throwing', () => {
        const HYDRO = loadEngine();
        expect(() => HYDRO.makeSystem({ components: {}, pipes: 5 })).not.toThrow();
        const a = HYDRO.makeSystem({ components: {}, pipes: 5 });
        expect(a.components.length).toBe(0);
        expect(a.pipes.length).toBe(0);
        // null + unknown-type entries drop; the one valid component survives
        const b = HYDRO.makeSystem({ components: [null, { id: 'p1', type: 'pump' }, { type: 'bogus' }], pipes: [null] });
        expect(b.components.length).toBe(1);
        // duplicate pipe ids are made unique so warm-start / writeback can't alias
        const c = HYDRO.makeSystem({
            components: [{ id: 'p1', type: 'pump' }, { id: 'c1', type: 'coil' }],
            pipes: [
                { id: 'dup', from: ['p1', 'out'], to: ['c1', 'in'] },
                { id: 'dup', from: ['c1', 'out'], to: ['p1', 'in'] },
            ],
        });
        expect(new Set(c.pipes.map((p) => p.id)).size).toBe(c.pipes.length);
    });

    // solve()/tick() are public — a raw literal that never went through
    // makeSystem (no warm-start caches) must still solve, not throw.
    test('solve() tolerates a raw system literal with no warm-start caches', () => {
        const HYDRO = loadEngine();
        expect(() => HYDRO.solve({
            components: [
                { id: 'p1', type: 'pump', pos: { x: 0, y: 0, z: 0 }, params: { h0: 40, a: 0.012, speed: 100, on: true } },
                { id: 'c1', type: 'coil', pos: { x: 2, y: 0, z: 0 }, params: { k: 0.02 } },
            ],
            pipes: [
                { id: 'a', from: ['p1', 'out'], to: ['c1', 'in'] },
                { id: 'b', from: ['c1', 'out'], to: ['p1', 'in'] },
            ],
        })).not.toThrow();
    });

    // Convergence is now measured on the TRUE secant residual (not the under-
    // relaxed step), and the relaxation floor drops far enough (0.005) that a
    // genuinely stiff loop settles instead of limit-cycling at the cap. Before the
    // fix this triple-pump series loop reported converged:false at MAX_ITERS.
    test('a stiff multi-pump series loop converges to its closed-form operating point', () => {
        const HYDRO = loadEngine();
        const S = HYDRO.SETTINGS;
        const sys = HYDRO.makeSystem({
            components: [
                { id: 'p1', type: 'pump', pos: { x: 0, y: 0, z: 0 }, params: { h0: 40, a: 0.032, speed: 100, on: true } },
                { id: 'p2', type: 'pump', pos: { x: 2, y: 0, z: 0 }, params: { h0: 40, a: 0.032, speed: 100, on: true } },
                { id: 'p3', type: 'pump', pos: { x: 4, y: 0, z: 0 }, params: { h0: 40, a: 0.032, speed: 100, on: true } },
                { id: 'c1', type: 'coil', pos: { x: 6, y: 0, z: 0 }, params: { k: 1e-5 } },
            ],
            pipes: [
                { id: 'a', from: ['p1', 'out'], to: ['p2', 'in'] },
                { id: 'b', from: ['p2', 'out'], to: ['p3', 'in'] },
                { id: 'c', from: ['p3', 'out'], to: ['c1', 'in'] },
                { id: 'd', from: ['c1', 'out'], to: ['p1', 'in'] },
            ],
        });
        const m = HYDRO.solve(sys);
        expect(m.converged).toBe(true);
        expect(m.iters).toBeLessThanOrEqual(S.MAX_ITERS);
        // 3·(h0 − a·Q²) = (3 pump casings + 4 pipes + coil)·Q²
        const kTotal = 3 * S.K_PUMP_CASE + 4 * S.K_PIPE + 1e-5;
        const qExpected = Math.sqrt(3 * 40 / (3 * 0.032 + kTotal));
        expect(Math.abs(qOf(m, 'p1') - qExpected)).toBeLessThan(0.1);
    });

    // The converged flag must be honest: the OLD metric tested the relaxed step
    // |qNew−Q| = relax·|qSolved−Q|, so once damping cut relax it could report
    // converged while the branch law was still off by up to residual/relax. With
    // the residual-based metric, converged:true implies the law holds to ~TOL.
    test('the converged flag is honest — a converged stiff solve satisfies the branch law', () => {
        const HYDRO = loadEngine();
        const sys = HYDRO.makeSystem({
            components: [
                { id: 'p1', type: 'pump', pos: { x: 0, y: 0, z: 0 }, params: { h0: 40, a: 0.032, speed: 100, on: true } },
                { id: 'p2', type: 'pump', pos: { x: 2, y: 0, z: 0 }, params: { h0: 40, a: 0.032, speed: 100, on: true } },
                { id: 'c1', type: 'coil', pos: { x: 4, y: 0, z: 0 }, params: { k: 1e-4 } },
            ],
            pipes: [
                { id: 'a', from: ['p1', 'out'], to: ['p2', 'in'] },
                { id: 'b', from: ['p2', 'out'], to: ['c1', 'in'] },
                { id: 'c', from: ['c1', 'out'], to: ['p1', 'in'] },
            ],
        });
        const m = HYDRO.solve(sys);
        if (m.converged) {
            m.branches.forEach((b) => {
                const lhs = m.nodes[b.nodeFrom].P - m.nodes[b.nodeTo].P;
                const rhs = b.k * b.Q * Math.abs(b.Q) - b.hsrc + (b.Zto - b.Zfrom);
                expect(Math.abs(lhs - rhs), 'branch ' + b.id + ' law residual').toBeLessThan(1e-2);
            });
        }
    });

    // pos coercion — makeSystem and the public solve()/tick() honor the documented
    // "never thrown on a corrupted/raw literal" contract for pos too (a truthy
    // non-object pos would otherwise throw on `c.pos.y = …` under 'use strict').
    test('makeSystem coerces a truthy non-object pos instead of throwing', () => {
        const HYDRO = loadEngine();
        expect(() => HYDRO.makeSystem({
            components: [{ id: 'p1', type: 'pump', pos: 5 }], pipes: [],
        })).not.toThrow();
        const sys = HYDRO.makeSystem({ components: [{ id: 'p1', type: 'pump', pos: 5 }], pipes: [] });
        expect(sys.components[0].pos).toEqual({ x: 0, y: 0, z: 0 });
    });

    test('solve() tolerates a raw literal whose component omits pos entirely', () => {
        const HYDRO = loadEngine();
        expect(() => HYDRO.solve({
            components: [
                { id: 'p1', type: 'pump', params: { h0: 40, a: 0.012, speed: 100, on: true } },
                { id: 'c1', type: 'coil', params: { k: 0.02 } },
            ],
            pipes: [
                { id: 'a', from: ['p1', 'out'], to: ['c1', 'in'] },
                { id: 'b', from: ['c1', 'out'], to: ['p1', 'in'] },
            ],
        })).not.toThrow();
    });
});
