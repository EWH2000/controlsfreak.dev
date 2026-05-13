// ──────────────────────────────────────────────────────────────────────
// thermistor-data.js — sensor curves for /tools/thermistor-calculator.html
//
// Loaded as a *classic* script (no type="module"), same pattern as
// /scripts/pid-engine.js: it exposes one global, THERMISTOR_TYPES, so the
// page's inline <script> and on* handlers can see it. Load it with
//
//     <script src="/scripts/thermistor-data.js"></script>
//
// before the page's own inline <script>. (Still "no build step" — the
// browser loads the file directly; nothing transpiles or bundles it.)
//
// ──────────────────────────────────────────────────────────────────────
// ⚠️  VERIFICATION STATUS — READ BEFORE TRUSTING ANY NUMBER HERE
//
// The R/T tables below are *generated* from the nominal curve parameters in
// each type's `curve:` block — they are NOT transcribed row-by-row from a
// manufacturer datasheet. The thing to verify is therefore the small set of
// curve parameters (β values, R25, shunt resistances, RTD coefficients),
// not 500+ individual cells.  A field-verification pass — the site owner
// plus a second technician — will confirm or correct these against
// datasheets and meter readings before the tool is treated as
// authoritative. `// TODO: verify` markers below flag the types where
// confidence is lowest; the obscure shunted curves (Schneider "Type 5",
// the JCI "8.7K") and the 1K Balco are the ones where a field-measured
// table beats anything published.
//
// THERMISTOR_TYPES = {
//   <id>: {
//     name:   short label for the dropdown,
//     family: 'thermistor' | 'rtd'     — drives the card tag (THERMISTOR / RTD),
//     group:  'NTC Thermistors' | 'RTDs'  — the <optgroup> label,
//     ref:    a short "defining reference point" string shown in the Output column,
//     notes:  type-specific context (maker, typical use, accuracy) shown under the table,
//     curve:  the nominal curve parameters the table is generated from (see below),
//     table:  [[tempF, tempC, resistanceOhms], ...] — generated from `curve`, ascending
//             in temperature, spanning ≈ −40 … 250 °F at 5 °F steps. (To override a type
//             with a transcribed datasheet table, just replace this array directly and
//             delete the `curve` block — the page only reads `table`.)
//   }
// }
//
// curve kinds:
//   { kind:'ntc',       r25, beta }          — β-model NTC:  R(T) = r25·exp(β·(1/T − 1/298.15)), T in kelvin
//   { kind:'ntc-shunt', r25, beta, shunt }   — β-model NTC element in PARALLEL with a fixed shunt resistor
//   { kind:'rtd-pt',    r0 }                 — platinum RTD, IEC 60751 / DIN 43760 (α = 0.00385), r0 at 0 °C
//   { kind:'rtd-balco', r0, refF, alphaC }   — nickel-iron (Balco) RTD, ~linear:  R = r0·(1 + alphaC·(T − Tref°C))
// ──────────────────────────────────────────────────────────────────────

const THERMISTOR_TYPES = (function () {
    const F2C = f => (f - 32) * 5 / 9;
    const K   = c => c + 273.15;

    // β-model NTC resistance at temperature tC (°C).
    const ntcR = (r25, beta, tC) => r25 * Math.exp(beta * (1 / K(tC) - 1 / 298.15));
    // two resistances in parallel
    const par  = (a, b) => (a * b) / (a + b);
    // platinum RTD per IEC 60751 — Callendar–Van Dusen (standard coefficients, α = 0.00385)
    const A = 3.9083e-3, B = -5.775e-7, C = -4.183e-12;
    const ptR  = (r0, tC) => tC >= 0
        ? r0 * (1 + A * tC + B * tC * tC)
        : r0 * (1 + A * tC + B * tC * tC + C * (tC - 100) * tC * tC * tC);

    function resAt(curve, tC) {
        switch (curve.kind) {
            case 'ntc':       return ntcR(curve.r25, curve.beta, tC);
            case 'ntc-shunt': return par(ntcR(curve.r25, curve.beta, tC), curve.shunt);
            case 'rtd-pt':    return ptR(curve.r0, tC);
            case 'rtd-balco': return curve.r0 * (1 + curve.alphaC * (tC - F2C(curve.refF)));
        }
    }

    // Round a resistance for display. RTDs only ever span ≈ 80–1500 Ω, so 0.1 Ω
    // throughout. NTC thermistors swing across 4+ decades, so use ≈ 3 significant
    // figures. (Interpolation in the page works on these already-rounded values —
    // the table is the source of truth, by design, so this rounding is part of it.)
    function roundR(r, kind) {
        if (kind === 'rtd-pt' || kind === 'rtd-balco') return Math.round(r * 10) / 10;
        if (r >= 100000) return Math.round(r / 1000) * 1000;
        if (r >= 10000)  return Math.round(r / 100) * 100;
        if (r >= 1000)   return Math.round(r / 10) * 10;
        if (r >= 100)    return Math.round(r);
        return Math.round(r * 10) / 10;
    }

    function buildTable(curve, loF, hiF, stepF) {
        const rows = [];
        for (let f = loF; f <= hiF + 1e-9; f += stepF) {
            const c = F2C(f);
            rows.push([Math.round(f), Math.round(c * 10) / 10, roundR(resAt(curve, c), curve.kind)]);
        }
        return rows;
    }

    const RANGE = [-40, 250, 5];   // °F: from, to, step  (−40 °F = −40 °C, 250 °F ≈ 121 °C)

    const T = {
        // ── NTC thermistors ────────────────────────────────────────────
        '10k-2': {
            name:   '10K Type II',
            family: 'thermistor', group: 'NTC Thermistors',
            ref:    '10,000 Ω at 77 °F (25 °C)',
            notes:  'The most widespread BAS thermistor curve — Honeywell, Continental Industries and many OEMs call it "Type 2" (β₂₅/₈₅ ≈ 3892 K). Not interchangeable with Type 3: at 32 °F a Type 2 reads ≈ 33 kΩ, a Type 3 ≈ 35 kΩ.',
            // source: nominal Type 2 curve — β₂₅/₈₅ ≈ 3892 K, R25 = 10 kΩ.  // TODO: verify against a Honeywell / Continental sensor datasheet
            curve:  { kind: 'ntc', r25: 10000, beta: 3892 },
        },
        '10k-3': {
            name:   '10K Type III',
            family: 'thermistor', group: 'NTC Thermistors',
            ref:    '10,000 Ω at 77 °F (25 °C)',
            notes:  'The other common 10K curve (β₂₅/₈₅ ≈ 3976 K) — Mamac, Functional Devices, BAPI "10K-3" and others. Steeper than Type 2; the two are not interchangeable. The 10,000 Ω @ 77 °F point is what makes it a "10K".',
            // source: nominal Type 3 / "10K-3" curve — β₂₅/₈₅ ≈ 3976 K, R25 = 10 kΩ. 10,000 Ω @ 25 °C is the type's defining property (sanity-check point).  // TODO: verify against a Mamac / BAPI datasheet
            curve:  { kind: 'ntc', r25: 10000, beta: 3976 },
        },
        '10k-jci': {
            name:   '10K + 8.7K (JCI)',
            family: 'thermistor', group: 'NTC Thermistors',
            ref:    '≈ 4.65 kΩ at 77 °F',
            notes:  'Johnson Controls convention — a 10K NTC element with an 8.7 kΩ resistor in parallel, which flattens the curve over the occupied range. Reads much lower than a bare 10K (≈ 4.6 kΩ at room temperature).',
            // source: modeled as a 10K Type 2 element (β ≈ 3892) in parallel with 8.7 kΩ. JCI's element type and shunt value are NOT confirmed from a primary datasheet.  // TODO: VERIFY — JCI "8.7K" element β and shunt configuration uncertain; a field-measured table is the better source
            curve:  { kind: 'ntc-shunt', r25: 10000, beta: 3892, shunt: 8700 },
        },
        '10k-5-tac': {
            name:   '10K Type 5 (TAC)',
            family: 'thermistor', group: 'NTC Thermistors',
            ref:    '≈ 5.24 kΩ at 77 °F',
            notes:  'Older Schneider Electric / TAC Vista / Andover Continuum convention — a 10K Type 3 element with an 11 kΩ parallel resistor, "linearized" for the HVAC range. Sometimes labeled "Type V" or "10K-3 (linearized)". Reads roughly half a bare 10K at room temperature.',
            // source: modeled as a 10K Type 3 element (β ≈ 3976) in parallel with 11 kΩ, per Schneider/TAC descriptions of the linearizing shunt. The exact shunt value and element β are LOW CONFIDENCE.  // TODO: VERIFY — Schneider/TAC "Type 5" / 11K-shunt curve is poorly documented; trust a field-measured table from a known-good sensor over this
            curve:  { kind: 'ntc-shunt', r25: 10000, beta: 3976, shunt: 11000 },
        },
        '20k': {
            name:   '20K NTC',
            family: 'thermistor', group: 'NTC Thermistors',
            ref:    '20,000 Ω at 77 °F (25 °C)',
            notes:  'A less common 20K curve seen in some controllers and sensors. Modeled here on the Type 3 β — there are 20K elements on other β values too, so confirm which one your gear actually uses.',
            // source: nominal 20K curve — β ≈ 3976, R25 = 20 kΩ.  // TODO: verify — which 20K curve / β the specific vendor uses
            curve:  { kind: 'ntc', r25: 20000, beta: 3976 },
        },
        '3k': {
            name:   '3K NTC',
            family: 'thermistor', group: 'NTC Thermistors',
            ref:    '3,000 Ω at 77 °F (25 °C)',
            notes:  'An older 3K curve found in some legacy controllers and retrofits. Modeled on the Type 2 β; legacy "3K" elements vary, so confirm against the original device documentation.',
            // source: nominal 3K curve — β ≈ 3892, R25 = 3 kΩ.  // TODO: verify — legacy "3K" elements vary; confirm β against the original device docs
            curve:  { kind: 'ntc', r25: 3000, beta: 3892 },
        },
        // ── RTDs (resistance RISES with temperature; roughly linear) ────
        'balco-1k': {
            name:   '1K Balco (RTD)',
            family: 'rtd', group: 'RTDs',
            ref:    '≈ 1,000 Ω at 70 °F (21 °C)',
            notes:  'A nickel-iron alloy ("Balco" / "Resistalloy") RTD — listed here because it shows up the same way on the troubleshooting bench, but it is an RTD, not an NTC thermistor: resistance RISES with temperature and the curve is roughly linear. Common on older Honeywell and Johnson gear.',
            // source: rough linear model — ≈ 1000 Ω at 70 °F, mean TC ≈ 0.00518 Ω/Ω/°C (nickel-iron). Real Balco has slight upward curvature and the spec point varies between makers (70 °F vs 77 °F).  // TODO: VERIFY — the Balco curve is hard to source; a field-measured table from a known-good sensor beats this approximation
            curve:  { kind: 'rtd-balco', r0: 1000, refF: 70, alphaC: 0.00518 },
        },
        'pt100': {
            name:   'Pt100 RTD',
            family: 'rtd', group: 'RTDs',
            ref:    '100.00 Ω at 0 °C',
            notes:  'Platinum RTD on the IEC 60751 / DIN 43760 curve, α = 0.00385 Ω/Ω/°C — the European / industrial standard. Resistance rises with temperature, very repeatable. Standard checkpoints: 100.00 Ω at 0 °C, ≈ 138.51 Ω at 100 °C. Class A is ±0.15 °C at 0 °C.',
            // source: IEC 60751 Callendar–Van Dusen — A=3.9083e-3, B=-5.775e-7, C=-4.183e-12, R0=100.00 Ω. HIGH CONFIDENCE (standard curve). Checkpoints: 100.00 Ω @ 0 °C, ≈138.51 Ω @ 100 °C.
            curve:  { kind: 'rtd-pt', r0: 100 },
        },
        'pt1000': {
            name:   'Pt1000 RTD',
            family: 'rtd', group: 'RTDs',
            ref:    '1000.00 Ω at 0 °C',
            notes:  'Platinum RTD on the same IEC 60751 curve as Pt100, scaled ×10 — increasingly common in newer HVAC because the higher base resistance makes lead-wire resistance less significant. α = 0.00385 Ω/Ω/°C. Standard checkpoints: 1000.00 Ω at 0 °C, ≈ 1385.1 Ω at 100 °C.',
            // source: IEC 60751 Callendar–Van Dusen, R0=1000.00 Ω (Pt100 ×10). HIGH CONFIDENCE. Checkpoints: 1000.00 Ω @ 0 °C, ≈1385.1 Ω @ 100 °C.
            curve:  { kind: 'rtd-pt', r0: 1000 },
        },
    };

    for (const id in T) T[id].table = buildTable(T[id].curve, RANGE[0], RANGE[1], RANGE[2]);
    return T;
})();
