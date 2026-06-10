// Engine-direct tests for /scripts/units.js (audit-2026-06 #42). Same
// vm pattern as psychro-engine.spec.js — Playwright workers are Node
// processes; the `page` fixture is unused. The suite previously
// covered units.js with one coarse 50°F≈10°C check, all in default US
// units — which is exactly where the enthalpy datum bug (#1) was
// invisible.
//
// units.js is a classic browser script that wires DOM listeners, so
// the vm context stubs window/document/localStorage just enough for
// the IIFE to run and expose window.Units.

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

function loadUnits() {
    const src = fs.readFileSync(
        path.join(__dirname, '..', 'html', 'scripts', 'units.js'),
        'utf8',
    );
    const ctx = {
        localStorage: { getItem: () => null, setItem: () => {} },
        document: {
            documentElement: { dataset: {} },
            addEventListener: () => {},
            dispatchEvent: () => {},
            querySelectorAll: () => [],
            body: null,
        },
        CustomEvent: function CustomEvent() {},
    };
    ctx.window = ctx;
    vm.runInNewContext(src, ctx);
    return ctx.window.Units;
}

const U = loadUnits();

test('API shape parity: massFlow is the one display-only quantity', () => {
    const suffixKeys = Object.keys(U.suffix).sort();
    const displayKeys = Object.keys(U.display).sort();
    const canonKeys = Object.keys(U.toCanonical).sort();
    // suffix and display cover every quantity 1:1.
    expect(displayKeys).toEqual(suffixKeys);
    // toCanonical covers everything except massFlow — it's a computed
    // readout (coil sizing derives it from airflow ÷ specific volume),
    // never a user input, so the asymmetry is deliberate.
    expect(canonKeys).toEqual(displayKeys.filter(k => k !== 'massFlow'));
});

test('round-trip: us → metric → us is identity for every convertible quantity', () => {
    for (const q of Object.keys(U.toCanonical)) {
        for (const v of [0, 1, 12.5, 100, 1234.5]) {
            const there = U.convert(v, 'us', 'metric', q);
            const back = U.convert(there, 'metric', 'us', q);
            expect(back, `${q}(${v})`).toBeCloseTo(v, 8);
        }
    }
});

test('known pairs match published values', () => {
    // Temperature: 100 °C = 212 °F (exact by definition).
    expect(U.convert(100, 'metric', 'us', 'temp')).toBeCloseTo(212, 10);
    expect(U.convert(212, 'us', 'metric', 'temp')).toBeCloseTo(100, 10);
    // Delta temperature has no offset: 9 °F span = 5 °C span.
    expect(U.convert(9, 'us', 'metric', 'deltaTemp')).toBeCloseTo(5, 10);
    // Airflow: 1 CFM = 1.699011 m³/h.
    expect(U.convert(1, 'us', 'metric', 'airflow')).toBeCloseTo(1.699011, 5);
    // Water flow: 1 GPM = 0.0630902 L/s.
    expect(U.convert(1, 'us', 'metric', 'waterFlow')).toBeCloseTo(0.0630902, 6);
    // Static pressure: 1 in. w.c. = 248.84 Pa — the engine's documented
    // 60 °F convention (the 4 °C convention's 249.089 differs by 0.1%;
    // this pins the deliberate constant, see the units.js comment).
    expect(U.convert(1, 'us', 'metric', 'staticPressure')).toBeCloseTo(248.84, 2);
    // Pressure: 1 atm = 14.696 psia = 101.325 kPa.
    expect(U.convert(14.696, 'us', 'metric', 'pressure')).toBeCloseTo(101.325, 2);
    // Heat capacity: 1 MBH = 0.293071 kW.
    expect(U.convert(1, 'us', 'metric', 'heatCapacity')).toBeCloseTo(0.293071, 5);
    // Humidity ratio: 7 gr/lb = 1 g/kg.
    expect(U.convert(7, 'us', 'metric', 'humidityRatio')).toBeCloseTo(1, 10);
});

test('enthalpy datum regression (#1): state h shifts datums, Δh does not', () => {
    // Published ASHRAE state (the audit\'s hand check): moist air at
    // 75 °F / 23.89 °C with W = 0.01017 lb/lb.
    //   IP:  h = 0.240·75 + 0.01017·(1061 + 0.444·75)   ≈ 29.13 Btu/lb
    //   SI:  h = 1.006·23.89 + 0.01017·(2501 + 1.86·23.89) ≈ 49.92 kJ/kg
    // The pure ×2.326 scale (the pre-fix bug) gives 67.8 — every SI
    // table and Mollier chart says ~50.
    const hIP = 0.240 * 75 + 0.01017 * (1061 + 0.444 * 75);
    const hSI = 1.006 * 23.888888 + 0.01017 * (2501 + 1.86 * 23.888888);
    expect(U.convert(hIP, 'us', 'metric', 'enthalpy')).toBeCloseTo(hSI, 0);
    // Inverse: typing the correct SI value must recover the IP state.
    expect(U.convert(hSI, 'metric', 'us', 'enthalpy')).toBeCloseTo(hIP, 1);

    // Δh is a difference — the datum offset cancels, so the delta
    // quantity stays a pure scale: 10 Btu/lb = 23.26 kJ/kg.
    expect(U.convert(10, 'us', 'metric', 'deltaEnthalpy')).toBeCloseTo(23.26, 6);
    expect(U.convert(0, 'us', 'metric', 'deltaEnthalpy')).toBe(0);
});

test('display/toCanonical honor the current unit system', () => {
    expect(U.current()).toBe('us');
    expect(U.display.temp(212)).toBe(212);          // US: pass-through
    U.set('metric');
    expect(U.current()).toBe('metric');
    expect(U.display.temp(212)).toBeCloseTo(100, 10);
    expect(U.toCanonical.temp(100)).toBeCloseTo(212, 10);
    // State enthalpy displays datum-shifted in metric.
    expect(U.display.enthalpy(29.13)).toBeCloseTo((29.13 - 7.686) * 2.326, 6);
    // Δh displays pure-scaled.
    expect(U.display.deltaEnthalpy(10)).toBeCloseTo(23.26, 6);
    U.set('us');
});
