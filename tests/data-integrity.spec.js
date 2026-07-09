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

// ── BACnet enumeration tables ───────────────────────────────────────
// bacnetEnums.js is hand-TRANSCRIBED from ASHRAE 135 (the 2026-07
// expansion cross-checked against the bacnet-stack reference enums,
// pending owner review — see the module's `user to verify` markers).
// Uniqueness + identity pins catch a transposed id; the
// objectTypeNames 1:1 check pins the derived map the converter page
// injects at build time. Plain require — it's a CommonJS _data
// module, not a classic script, so no vm loader needed.

const bacnetEnums = require(
    path.join(__dirname, '..', 'html', '_data', 'bacnetEnums.js'));

test('bacnet enum tables — populated, unique ids, sane shapes', () => {
    for (const key of ['objectTypes', 'propertyIds', 'engineeringUnits']) {
        const rows = bacnetEnums[key];
        expect(rows.length, `${key} populated`).toBeGreaterThan(18);
        const ids = rows.map(r => r.id);
        expect(new Set(ids).size, `${key} ids unique`).toBe(ids.length);
        for (const r of rows) {
            expect(Number.isInteger(r.id) && r.id >= 0,
                `${key} id ${r.id} is a non-negative integer`).toBe(true);
            expect(typeof r.name === 'string' && r.name.length > 0,
                `${key} ${r.id} has a name`).toBe(true);
        }
    }
    // Every unit carries a group — the table's Domain column renders it
    // unconditionally.
    for (const u of bacnetEnums.engineeringUnits) {
        expect(typeof u.group === 'string' && u.group.length > 0,
            `unit ${u.id} has a group`).toBe(true);
    }
});

test('bacnet enum tables hit their identity checkpoints', () => {
    const byId = (rows) => Object.fromEntries(rows.map(r => [r.id, r.name]));
    const types = byId(bacnetEnums.objectTypes);
    // The browser-side smoke tests pin the same strings through the
    // converter UI ('8 — Device', '0 — Analog Input (AI)') — these are
    // the load-bearing names.
    expect(types[0]).toBe('Analog Input (AI)');
    expect(types[8]).toBe('Device');
    expect(types[19]).toBe('Multi-state Value (MSV)');
    const props = byId(bacnetEnums.propertyIds);
    expect(props[85]).toBe('Present_Value');
    expect(props[87]).toBe('Priority_Array');
    expect(props[117]).toBe('Units');
    const units = byId(bacnetEnums.engineeringUnits);
    expect(units[62]).toBe('degrees-Celsius');
    expect(units[98]).toBe('percent');
    expect(units[84]).toBe('cubic-feet-per-minute');
    // The derived converter map mirrors objectTypes 1:1.
    expect(Object.keys(bacnetEnums.objectTypeNames).length)
        .toBe(bacnetEnums.objectTypes.length);
    for (const t of bacnetEnums.objectTypes) {
        expect(bacnetEnums.objectTypeNames[t.id]).toBe(t.name);
    }
});

// ── BACnet vendor-ID registry snapshot ──────────────────────────────
// bacnetVendorIds.js is GENERATED by the import script from the
// official ASHRAE registry, so cell-level transposition can't occur —
// what CAN regress is the import itself: a truncated fetch, a markup
// drift half-parsing the table, or an entity slipping through decode.
// These pins mirror the script's own validation so a bad regeneration
// fails the suite even if the script's checks are someday loosened.
// Identity pins stay minimal (id 0 + the reserved flags): org names
// are edited upstream on rebrands, and a re-import shouldn't cascade
// test edits.

const bacnetVendorIds = require(
    path.join(__dirname, '..', 'html', '_data', 'bacnetVendorIds.js'));

test('bacnet vendor-id snapshot — populated, ascending, decoded, flagged', () => {
    const { vendors, reserved, maxId, retrieved } = bacnetVendorIds;
    expect(vendors.length, 'registry populated').toBeGreaterThanOrEqual(1600);
    for (let i = 1; i < vendors.length; i++) {
        expect(vendors[i].id, `ids strictly ascending at index ${i}`)
            .toBeGreaterThan(vendors[i - 1].id);
    }
    expect(vendors[0]).toEqual({ id: 0, org: 'ASHRAE' });
    expect(maxId, 'maxId is the last id').toBe(vendors[vendors.length - 1].id);
    expect(retrieved, 'retrieved is a YYYY-MM-DD date').toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Entity-leak guard — pins the import script's decode step.
    for (const v of vendors) {
        expect(v.org.length, `id ${v.id} has an organization`).toBeGreaterThan(0);
        // [a-z0-9]: digit-bearing named entities (&frac12; &sup2;) must
        // not slip the guard — the import script's decoder throws on
        // unknown names, and this pin has to stay at least as strict.
        expect(v.org, `id ${v.id} org has no undecoded entity or tag`)
            .not.toMatch(/&#|&amp|&[a-z0-9]+;|</i);
    }
    // The seven ASHRAE holds — flagged in the rows AND listed in the
    // module's reserved export, in agreement.
    const flagged = vendors.filter(v => v.reserved).map(v => v.id);
    expect(flagged).toEqual([555, 666, 777, 888, 911, 999, 1111]);
    expect(reserved).toEqual(flagged);
});
