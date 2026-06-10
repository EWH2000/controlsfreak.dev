// Data-table integrity (audit-2026-06 tests polish). Two hand-touched
// data layers had no invariants pinned:
//
// - refrigerant-data.js is hand-TRANSCRIBED from published P-T charts —
//   monotonicity + bubble/dew ordering catch a transposed row or a
//   fat-fingered digit.
// - thermistor-data.js is GENERATED from per-type curve parameters, so
//   cell-level transposition can't occur — but a wrong β / R₀ slips
//   straight through. Pinning each type against its PUBLISHED
//   checkpoints (the ones cited in the file's own source comments)
//   catches a parameter regression the way the audit's identify()
//   round-trip reasoning intended.
//
// vm pattern from psychro-engine.spec.js — both files are classic
// scripts; the trailer expression hands the globals back.

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

function loadGlobal(file, name) {
    const src = fs.readFileSync(
        path.join(__dirname, '..', 'html', 'scripts', file), 'utf8');
    return vm.runInNewContext(src + `\n; ${name}`, {});
}

// ── Refrigerant P-T tables ──────────────────────────────────────────

const REFRIGERANTS = loadGlobal('refrigerant-data.js', 'REFRIGERANT_TYPES');

for (const id of Object.keys(REFRIGERANTS)) {
    test(`refrigerant table integrity — ${id}`, () => {
        const R = REFRIGERANTS[id];
        for (const curveName of ['bubble', 'dew']) {
            const curve = R[curveName];
            expect(curve.length, `${id}.${curveName} populated`).toBeGreaterThan(10);
            for (let i = 1; i < curve.length; i++) {
                // Strictly ascending pressure AND temperature along each
                // saturation curve — a transposed row breaks one of them.
                expect(curve[i][0], `${id}.${curveName}[${i}] pressure ascending`)
                    .toBeGreaterThan(curve[i - 1][0]);
                expect(curve[i][1], `${id}.${curveName}[${i}] temp ascending`)
                    .toBeGreaterThan(curve[i - 1][1]);
            }
        }
        // At any shared pressure, the bubble temperature sits at or below
        // the dew temperature (equal for single-component refrigerants;
        // the gap is the glide for blends). Compare via interpolation at
        // the bubble curve's own pressure points inside the dew range.
        const interp = (curve, p) => {
            for (let i = 1; i < curve.length; i++) {
                if (curve[i][0] >= p) {
                    const [p0, t0] = curve[i - 1], [p1, t1] = curve[i];
                    return t0 + (t1 - t0) * (p - p0) / (p1 - p0);
                }
            }
            return null;
        };
        for (const [p, bubT] of R.bubble) {
            if (p < R.dew[0][0] || p > R.dew[R.dew.length - 1][0]) continue;
            const dewT = interp(R.dew, p);
            expect(bubT, `${id}: bubble ≤ dew at ${p} psig`)
                .toBeLessThanOrEqual(dewT + 0.15); // 0.1 °F table rounding
        }
    });
}

// ── Thermistor / RTD generated tables vs published checkpoints ─────

const THERMISTORS = loadGlobal('thermistor-data.js', 'THERMISTOR_TYPES');

// [type, °F, published Ω, tolerance fraction] — every value cited from
// the datasheet sources named in thermistor-data.js's own comments.
const CHECKPOINTS = [
    ['10k-2',     77,  10000,   0.03],   // r25 defining point
    ['10k-3',     77,  10000,   0.03],
    ['10k-3',     32,  29490,   0.05],   // US Sensor Curve G / BAPI 10K-3
    ['10k-3',    122,   3893,   0.05],
    ['10k-3',    185,   1255,   0.06],
    ['10k-jci',   77,   4652,   0.04],   // 10k ∥ 8.7k shunt
    ['10k-5-tac', 77,   5238,   0.04],   // 10k ∥ 11k shunt
    ['20k',       77,  20000,   0.03],
    ['20k',      -40, 814000,   0.03],   // Vector Tn20 (fits ~1.2%)
    ['20k',       32,  70200,   0.05],
    ['3k',        77,   3000,   0.03],
    ['pt100',     32,    100,   0.004],  // IEC 60751 anchor
    ['pt100',    212, 138.51,   0.005],
    ['pt1000',    32,   1000,   0.004],
    ['pt1000',   212, 1385.1,   0.005],
    ['balco-1k',  70,   1000,   0.015],  // ACI Balco datasheet
];

function tableR(type, f) {
    const rows = THERMISTORS[type].table;   // [°F, °C, Ω]
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] >= f) {
            const [f0, , r0] = rows[i - 1], [f1, , r1] = rows[i];
            if (f1 === f) return r1;
            if (f0 === f) return r0;
            return r0 + (r1 - r0) * (f - f0) / (f1 - f0);
        }
    }
    throw new Error(`${type}: ${f} °F outside table`);
}

test('thermistor/RTD tables hit their published checkpoints', () => {
    for (const [type, f, ohms, tol] of CHECKPOINTS) {
        const got = tableR(type, f);
        expect(Math.abs(got - ohms) / ohms,
            `${type} @ ${f} °F: got ${got}, published ${ohms}`)
            .toBeLessThanOrEqual(tol);
    }
});

test('thermistor/RTD tables are monotonic in the right direction', () => {
    // Non-strict comparison: the display tables round to ~3 significant
    // figures, so a shunted curve's flat cold end (10k-5-tac approaches
    // its 11 kΩ shunt) legitimately repeats a value across adjacent
    // rows. The endpoint check still pins the overall direction.
    for (const id of Object.keys(THERMISTORS)) {
        const t = THERMISTORS[id];
        const rows = t.table;
        const ntc = t.family !== 'rtd';
        for (let i = 1; i < rows.length; i++) {
            if (ntc) {
                expect(rows[i][2], `${id}[${i}] NTC resistance never rises with temp`)
                    .toBeLessThanOrEqual(rows[i - 1][2]);
            } else {
                expect(rows[i][2], `${id}[${i}] RTD resistance never falls with temp`)
                    .toBeGreaterThanOrEqual(rows[i - 1][2]);
            }
        }
        const first = rows[0][2], last = rows[rows.length - 1][2];
        if (ntc) expect(first, `${id} overall NTC direction`).toBeGreaterThan(last);
        else expect(first, `${id} overall RTD direction`).toBeLessThan(last);
    }
});
