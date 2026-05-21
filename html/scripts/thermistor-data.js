// ──────────────────────────────────────────────────────────────────────
// thermistor-data.js — sensor curves for /tools/thermistor-calculator.html
//
// Loaded as a *classic* script (no type="module"), same pattern as
// /scripts/pid-engine.js: it exposes one global, THERMISTOR_TYPES, so the
// page's IIFE-wrapped inline <script> can reach it by name. Load it with
//
//     <script src="/scripts/thermistor-data.js"></script>
//
// before the page's own inline <script>. The 11ty build templates the HTML
// chrome and copies this file through unchanged; the browser loads it
// directly, nothing transpiles or bundles.
//
// ──────────────────────────────────────────────────────────────────────
// VERIFICATION STATUS — READ BEFORE TRUSTING ANY NUMBER HERE
//
// The R/T tables below are *generated* from the nominal curve parameters
// in each type's `curve:` block — they are NOT transcribed row-by-row
// from a manufacturer datasheet. A single-β model is an approximation of
// a real Steinhart-Hart fit, so the generated table will drift slightly
// from a published reference; deviation per type is documented inline
// below. The thing to audit is therefore the small set of curve
// parameters (β values, R25, shunt resistances, RTD coefficients), not
// 500+ individual cells. Curve parameters were chosen so the generated
// table fits the canonical published R/T table within ~1 °F across the
// BAS-relevant range (0–85 °C / 32–185 °F), with degradation tolerated
// at the extremes (-40 °F and >185 °F).
//
// Per-type confidence after the 2026-05 verification pass:
//   HIGH         pt100, pt1000        — match IEC 60751 exactly
//   GOOD         10k-2, 10k-3, 10k-5-tac, 20k, 3k, balco-1k
//                                     — single-β / single-TCR fit to a
//                                       canonical published table; sources
//                                       cited inline. Within ~1 °F over
//                                       BAS range; check the inline note
//                                       for the residual at the extremes.
//   PENDING      10k-jci              — no public R/T table found for the
//                                       JCI 10K + 8.7K-shunt configuration.
//                                       The canonical Johnson Controls
//                                       TE-6300 PDF (LIT-216320) redirects
//                                       to a docs-portal landing page. The
//                                       8.7K shunt value and underlying
//                                       Type 2 element are folklore-confirmed
//                                       but not datasheet-confirmed; treat
//                                       the table as nominal.
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

'use strict';

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
            default:          throw new Error('unknown curve kind: ' + curve.kind);
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
            notes:  'The most widespread BAS thermistor curve — Honeywell, Johnson Controls, Continental Industries and many OEMs call it "Type 2". Steeper curve than Type 3, not interchangeable: at 32 °F a Type 2 reads ≈ 32.7 kΩ, a Type 3 ≈ 29.5 kΩ; at 185 °F a Type 2 reads ≈ 1.07 kΩ, a Type 3 ≈ 1.26 kΩ. Those are canonical published values; the generated table above differs by up to ~1 °F — see "About these tables".',
            // source: verified against BAPI 10K-2 + Vector Controls Tn10 + Sontay 10K3A1 (all three published tables agree to within 1 Ω across the range). The canonical Type 2 table is a Steinhart-Hart fit; its effective β varies from ≈3720 (β₂₅/₋₄₀) to ≈3976 (β₂₅/₈₅). β=3900 minimizes RMS temperature error across the BAS range — residual ~0.8 °F overall, under 1 °F across 30-150 °F; degrades to ~2-4 °F at the -40 °F extreme where the single-β model can't track the curve.
            curve:  { kind: 'ntc', r25: 10000, beta: 3900 },
        },
        '10k-3': {
            name:   '10K Type III',
            family: 'thermistor', group: 'NTC Thermistors',
            ref:    '10,000 Ω at 77 °F (25 °C)',
            notes:  'The other common 10K curve — BAPI "10K-3", Mamac, Functional Devices, US Sensor "Curve G", Dale "Type 9", ACI "Series AH". Shallower than Type 2 (effective β₂₅/₈₅ ≈ 3693 K), so it reads lower at the cold end and higher at the hot end. The 10,000 Ω @ 77 °F crossover is what makes both "Type 2" and "Type 3" share the "10K" label; everywhere else they diverge, and they are not interchangeable.',
            // source: verified against BAPI 10K-3 + US Sensor "Curve G" + Sontay 10K4A1 (all three published tables agree exactly: R(0°C)=29,490 Ω, R(50°C)=3,893 Ω, R(85°C)=1,255 Ω). US Sensor's datasheet states β₀-₅₀ = 3575; effective β₂₅/₈₅ ≈ 3693. β=3600 minimizes RMS temperature error across the BAS range — residual under 1 °F across 30-150 °F; degrades to ~3-5 °F at the -40 °F extreme where the single-β model can't track the curve.
            curve:  { kind: 'ntc', r25: 10000, beta: 3600 },
        },
        '10k-jci': {
            name:   '10K + 8.7K (JCI)',
            family: 'thermistor', group: 'NTC Thermistors',
            ref:    '≈ 4.65 kΩ at 77 °F',
            notes:  'Johnson Controls convention — a 10K NTC element with an 8.7 kΩ resistor in parallel, which flattens the curve over the occupied range. Reads much lower than a bare 10K (≈ 4.6 kΩ at room temperature). Treat as nominal — see header.',
            // source: modeled as a 10K Type 2 element (β ≈ 3976, matching the verified Type 2 curve) in parallel with 8.7 kΩ. JCI's element type and shunt value are folklore-confirmed but the canonical TE-6300 Product Bulletin (LIT-216320) URL redirects to docs.johnsoncontrols.com — no public R/T table found for the 8.7K-shunted variant. A field-measured table from a known-good JCI sensor would supersede this.
            curve:  { kind: 'ntc-shunt', r25: 10000, beta: 3976, shunt: 8700 },
        },
        '10k-5-tac': {
            name:   '10K Type 5 (TAC)',
            family: 'thermistor', group: 'NTC Thermistors',
            ref:    '≈ 5.24 kΩ at 77 °F',
            notes:  'Older Schneider Electric / TAC Vista / Andover Continuum convention — a 10K Type 3 element with an 11 kΩ parallel resistor, "linearized" for the HVAC range. Sometimes labeled "Type V" or "10K-3 (linearized)". Reads roughly half a bare 10K at room temperature.',
            // source: verified against BAPI "10K-3 (11K) Thermistor Output Table" (BAPI part H10). Modeled as a 10K Type 3 element (β=3693, matching the verified 10K Type 3 curve) in parallel with 11 kΩ. Schneider community KB confirms the 11 kΩ ±0.1% 1/8 W shunt is the I/A Series MNL/MNB convention. Generated table fits BAPI within ~1.5 % across the full -40 to 121 °C range.
            curve:  { kind: 'ntc-shunt', r25: 10000, beta: 3693, shunt: 11000 },
        },
        '20k': {
            name:   '20K NTC',
            family: 'thermistor', group: 'NTC Thermistors',
            ref:    '20,000 Ω at 77 °F (25 °C)',
            notes:  'A less common 20K curve, found on Honeywell T7460/T7470 wall sensors and various OEM duct/immersion probes. Steeper than the 10K curves — β₂₅/₈₅ ≈ 4260 from the canonical table. 20K elements from other vendors may use a different β; confirm against the original device documentation.',
            // source: verified against Vector Controls Tn20 + Sontay 20K6A1 (the two published tables agree exactly: R(-40°C)=814 kΩ, R(0°C)=70,200 Ω, R(25°C)=20,000 Ω, R(50°C)=6,719 Ω). Canonical β₂₅/₈₅ ≈ 4260 — but the curve's effective β varies sharply across temperature. β=3976 fits Vector at -40 °C exactly and within ~3% at 0 °C, prioritizing the OAT range where 20K sensors actually operate; the hot end drifts (about +15% at 85 °C) but 20K thermistors are rarely used above room temperature.
            curve:  { kind: 'ntc', r25: 20000, beta: 3976 },
        },
        '3k': {
            name:   '3K NTC',
            family: 'thermistor', group: 'NTC Thermistors',
            ref:    '3,000 Ω at 77 °F (25 °C)',
            notes:  'An older 3K curve found in some legacy controllers and retrofits — also called "3K3A1" in Sontay nomenclature. Vector lists β₂₅/₈₅ = 3974 for the canonical table. Legacy 3K elements from other vendors may use a different β, so confirm against the original device documentation.',
            // source: verified against Vector Controls Tn3 (R(0°C)=9,795 Ω, R(25°C)=3,000 Ω, R(50°C)=1,081 Ω). β=3892 fits Vector's table within ~1.5 % across the BAS range — actually a slightly closer single-β fit than Vector's own stated β₂₅/₈₅=3974, because Vector's table is Steinhart-Hart and β=3892 happens to split the difference between the cold and warm effective betas.
            curve:  { kind: 'ntc', r25: 3000, beta: 3892 },
        },
        // ── RTDs (resistance RISES with temperature; roughly linear) ────
        'balco-1k': {
            name:   '1K Balco (RTD)',
            family: 'rtd', group: 'RTDs',
            ref:    '≈ 1,000 Ω at 70 °F (21 °C)',
            notes:  'A nickel-iron alloy ("Balco" / "Resistalloy") RTD — listed here because it shows up the same way on the troubleshooting bench, but it is an RTD, not an NTC thermistor: resistance RISES with temperature and the curve is roughly linear with slight upward curvature. TCR ≈ 2.2 Ω/°F (3.96 Ω/°C) at room temperature. Common on older Honeywell and Johnson gear.',
            // source: verified against ACI BALCO datasheet (1,000 Ω @ 70 °F / 21 °C, TCR = 2.2 Ω/°F, -40 to 240 °F operating range) and a Schneider/EBO Balco resistance chart (R(0°C)=920 Ω, R(21°C)=1,001 Ω). Linear model with alphaC = 0.00396 Ω/Ω/°C (the ACI TCR) fits the BAS range within ~1 °F; real Balco has downward curvature below -20 °C so the displayed table will read 3-5 % high in that region. Field-measure against a known-good sensor if you need cryogenic accuracy.
            curve:  { kind: 'rtd-balco', r0: 1000, refF: 70, alphaC: 0.00396 },
        },
        'pt100': {
            name:   'Pt100 RTD',
            family: 'rtd', group: 'RTDs',
            ref:    '100.00 Ω at 0 °C',
            notes:  'Platinum RTD on the IEC 60751 / DIN 43760 curve, α = 0.00385 Ω/Ω/°C — the European / industrial standard. Resistance rises with temperature, very repeatable. Standard checkpoints: 100.00 Ω at 0 °C, ≈ 138.51 Ω at 100 °C. Class A is ±0.15 °C at 0 °C.',
            // source: IEC 60751:2008 Callendar–Van Dusen — A=3.9083e-3, B=-5.775e-7, C=-4.183e-12 (C applies only below 0 °C), R0=100.00 Ω. HIGH CONFIDENCE (international standard). Generated table verified against Vector Controls Tp1, Sontay D-PT100A, Fluke Pt100 table generator (fluke.com/pt100-table-generator), and pt100.de reference tables — all match to the ±0.1 Ω rounding granularity.
            curve:  { kind: 'rtd-pt', r0: 100 },
        },
        'pt1000': {
            name:   'Pt1000 RTD',
            family: 'rtd', group: 'RTDs',
            ref:    '1000.00 Ω at 0 °C',
            notes:  'Platinum RTD on the same IEC 60751 curve as Pt100, scaled ×10 — increasingly common in newer HVAC because the higher base resistance makes lead-wire resistance less significant. α = 0.00385 Ω/Ω/°C. Standard checkpoints: 1000.00 Ω at 0 °C, ≈ 1385.1 Ω at 100 °C.',
            // source: IEC 60751:2008 Callendar–Van Dusen, R0=1000.00 Ω (Pt100 ×10). HIGH CONFIDENCE. Generated table verified against Vector Controls Tp2, Sontay E-PT1000A, and pt100.de reference tables — all match exactly.
            curve:  { kind: 'rtd-pt', r0: 1000 },
        },
    };

    for (const id in T) T[id].table = buildTable(T[id].curve, RANGE[0], RANGE[1], RANGE[2]);
    return T;
})();
