// Engine-direct tests for /scripts/duct-engine.js. Lives under
// tests/*.spec.js so the same `npm test` (Playwright) runner picks it
// up — Playwright workers are Node processes, the `page` fixture is
// just unused here. Same vm-loader trick as psychro-engine.spec.js:
// classic-script top-level declarations don't attach to a
// `vm.runInNewContext` context bag, so a trailing object-literal
// expression bundles the named exports and the script's last
// completion value becomes the "module".

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

function loadEngine() {
    const src = fs.readFileSync(
        path.join(__dirname, '..', 'html', 'scripts', 'duct-engine.js'),
        'utf8',
    );
    const trailer = `
        ; ({
            DUCT_EPS_GALV,
            DUCT_DIA_MIN, DUCT_DIA_MAX, DUCT_VEL_MIN, DUCT_VEL_MAX,
            DUCT_SIDE_MIN, DUCT_SIDE_MAX,
            ductArea, ductFriction, ductDiaForFriction, ductVelForFriction,
            huebscherDe, huebscherSide,
        });
    `;
    return vm.runInNewContext(src + trailer, {});
}

test.describe('duct-engine: friction chart anchors', () => {

    test('matches the published friction chart across its working range', () => {
        const { ductFriction } = loadEngine();
        // (diameter in., velocity FPM, chart friction in. w.c./100 ft).
        // Chart-reading tolerance is about ±0.01 — these are the points
        // a paper ductulator and the ASHRAE chart agree on.
        const anchors = [
            [12, 1000, 0.12],
            [10,  800, 0.10],
            [ 8,  600, 0.08],
            [24, 1500, 0.11],
            [36, 2000, 0.12],
        ];
        for (const [d, v, chart] of anchors) {
            const got = ductFriction(d, v).dp100;
            expect(Math.abs(got - chart), `${d} in. @ ${v} FPM → ${got}`).toBeLessThan(0.01);
        }
        // The canonical anchor, tighter: 12 in. @ 1,000 FPM = 0.121.
        expect(ductFriction(12, 1000).dp100).toBeCloseTo(0.121, 2);
    });

    test('pins the low-f′ correction region (large duct, moderate velocity)', () => {
        const { ductFriction } = loadEngine();
        // Below f′ = 0.018 the fit switches to f = 0.85f′ + 0.0028 — the
        // region every duct ≥ ~12.5 in. at mains velocity lives in. The
        // chart anchors' ±0.01 tolerance is too loose to notice the
        // correction there (mutation-tested: deleting it passed them all,
        // reading large-duct friction 6–12 % low), so these two pin it
        // tight enough that dropping the correction fails.
        expect(ductFriction(60, 1500).dp100).toBeCloseTo(0.0368, 3);
        expect(ductFriction(36, 2000).f).toBeCloseTo(0.0141, 3);
    });

    test('friction is monotonic the way the solvers assume', () => {
        const { ductFriction, ductArea } = loadEngine();
        // Rising in velocity at fixed diameter…
        expect(ductFriction(12, 500).dp100).toBeLessThan(ductFriction(12, 1000).dp100);
        expect(ductFriction(12, 1000).dp100).toBeLessThan(ductFriction(12, 2000).dp100);
        // …falling in diameter at fixed CFM.
        const atD = (cfm, d) => ductFriction(d, cfm / ductArea(d)).dp100;
        expect(atD(1200, 8)).toBeGreaterThan(atD(1200, 12));
        expect(atD(1200, 12)).toBeGreaterThan(atD(1200, 20));
    });

    test('geometry sanity: a 24 in. round is exactly π ft²', () => {
        const { ductArea } = loadEngine();
        expect(ductArea(24)).toBeCloseTo(Math.PI, 10);
    });
});

test.describe('duct-engine: bisection solvers', () => {

    test('diameter and velocity solves round-trip through ductFriction', () => {
        const { ductFriction, ductArea, ductDiaForFriction, ductVelForFriction } = loadEngine();
        for (const [cfm, target] of [[100, 0.05], [626, 0.08], [1200, 0.08], [5000, 0.10], [20000, 0.30]]) {
            const d = ductDiaForFriction(cfm, target);
            expect(isFinite(d), `dia solve ${cfm} CFM @ ${target}`).toBe(true);
            expect(ductFriction(d, cfm / ductArea(d)).dp100).toBeCloseTo(target, 6);
        }
        for (const [dia, target] of [[6, 0.05], [12, 0.08], [24, 0.10], [60, 0.30]]) {
            const v = ductVelForFriction(dia, target);
            expect(isFinite(v), `vel solve ${dia} in. @ ${target}`).toBe(true);
            expect(ductFriction(dia, v).dp100).toBeCloseTo(target, 6);
        }
    });

    test('the worked-example triple: 1200 CFM ↔ 12 in. ↔ 0.08 in/100 ft', () => {
        const { ductFriction, ductArea, ductDiaForFriction, ductVelForFriction } = loadEngine();
        // Diagnostic direction: the 12 in. moving 1200 CFM runs hard.
        expect(ductFriction(12, 1200 / ductArea(12)).dp100).toBeCloseTo(0.264, 2);
        // Sizing direction: at 0.08 the same air wants ~15.3 in.
        expect(ductDiaForFriction(1200, 0.08)).toBeCloseTo(15.29, 1);
        // Capacity direction: a 12 in. at 0.08 carries ~626 CFM.
        const v = ductVelForFriction(12, 0.08);
        expect(v * ductArea(12)).toBeCloseTo(626, 0);
    });

    test('unreachable targets return NaN instead of pinning at a bound', () => {
        const { ductDiaForFriction, ductVelForFriction } = loadEngine();
        // A million CFM can't run at 0.08 even in the biggest duct…
        expect(ductDiaForFriction(1e6, 0.08)).toBeNaN();
        // …and 10 CFM can't generate 0.08 even in the smallest.
        expect(ductDiaForFriction(10, 0.08)).toBeNaN();
        // A 120 in. duct never reaches 100 in/100 ft inside the bracket.
        expect(ductVelForFriction(120, 100)).toBeNaN();
        // Garbage in, NaN out — never a fake number.
        expect(ductDiaForFriction(-500, 0.08)).toBeNaN();
        expect(ductDiaForFriction(1200, 0)).toBeNaN();
        expect(ductVelForFriction(0, 0.08)).toBeNaN();
        expect(ductVelForFriction(NaN, 0.08)).toBeNaN();
    });
});

test.describe('duct-engine: Huebscher rect↔round', () => {

    test('matches the published equivalent-diameter tables', () => {
        const { huebscherDe } = loadEngine();
        const anchors = [
            [20, 10, 15.2],
            [12, 12, 13.1],
            [30, 12, 20.2],
            [ 8,  8,  8.7],
            [24, 18, 22.7],
        ];
        for (const [a, b, table] of anchors) {
            expect(huebscherDe(a, b), `${a}×${b}`).toBeCloseTo(table, 1);
        }
        // Orientation can't matter.
        expect(huebscherDe(20, 10)).toBe(huebscherDe(10, 20));
    });

    test('side solve round-trips and refuses impossible pairings', () => {
        const { huebscherDe, huebscherSide } = loadEngine();
        const b = huebscherSide(15.3, 10);
        expect(huebscherDe(10, b)).toBeCloseTo(15.3, 6);
        expect(b).toBeCloseTo(20.2, 1);
        // A 10 in. side already exceeds De 3 at the bracket's floor…
        expect(huebscherSide(3, 10)).toBeNaN();
        // …and can't reach De 200 at its ceiling.
        expect(huebscherSide(200, 10)).toBeNaN();
        expect(huebscherSide(0, 10)).toBeNaN();
        expect(huebscherSide(15.3, -1)).toBeNaN();
    });
});
