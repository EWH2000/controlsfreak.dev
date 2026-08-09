// Metric conversion gate — every °F → °C figure in the SOURCE, both notations.
//
// BLOCKING, and it runs in `npm test` like any other spec. Pure Node: it
// reads `html/**` off disk and never opens a browser, the same shape as the
// engine-direct specs.
//
// ── Why this exists ──────────────────────────────────────────────────────
// The 2026-08 accuracy audit found the same defect at four sites — a metric
// figure that does not reconcile with the operands its own passage paints —
// two of them in a quiz bank that `quiz-banks.spec.js` walks straight past
// because that spec is shape-only. codebase-issues #232 had already named
// one instance and recorded that nothing guards the class. Four hand-fixes
// and no guard is the signature of a class worth a guard.
//
// The parser, the two tests, the tolerance, the normalisation and the scan
// scope all live in `tests/metric-spans.js` with their reasoning; read that
// header before changing anything here. This file is the gate and its
// exemptions.
//
// ── WHAT THIS GATE DOES NOT CATCH — read this before trusting it ─────────
// It would NOT have caught the audit's own headline finding (#57). That span
// stated `1.1 °C` for `2 °F`, and 1.1 IS a valid delta — it fails only
// against the metric operands painted two sentences away (23.9 and 22.7,
// whose difference is 1.2). Arm 1 closes the "the conversion is outright
// wrong" class: a number that is neither a valid absolute nor a valid delta.
// The "the conversion is valid but contradicts the page's own numbers" class
// is reachable only by the proximity heuristic in
// `.github/scripts/metric-lint.mjs` (`npm run metric-lint`), which is
// REPORT-ONLY by design because it is a heuristic and will produce false
// positives. Do not read a green run here as "the metric figures reconcile."
//
// ── The ALLOWLIST convention ─────────────────────────────────────────────
// Same shape and the same discipline as `contrast-sweep.spec.js`: a genuine
// exception is an entry with a WRITTEN REASON, never a loosened threshold,
// and `every ALLOWLIST entry still matches an unclassifiable figure` below
// fails when an entry stops firing — so a fixed or deleted span forces the
// entry out instead of leaving a silent permanent exemption behind. Entries
// are keyed on `{ file, us }` rather than `path:line` on purpose: a line
// number drifts with every edit above it, while the `data-us` string is the
// thing being exempted.
//
// ── The sanity floors ────────────────────────────────────────────────────
// Every assertion here derives truth from a regex walk, and a walk that
// quietly stops matching turns a real gate into a green no-op: zero spans
// found, zero failures, test passes. So the run asserts how much it saw
// before it asserts that what it saw is clean. Measured against the shipped
// parser, today's populations are: 515 spans in 40 files, 121 parenthetical
// figures in 20 files (113 of those in the quiz banks, across 16 banks), and
// 317 numbered °F → °C figures classified across both notations.
//
// Each floor sits ROUGHLY A FIFTH UNDER its population — low enough that
// ordinary editing never trips it, close enough that a walk losing most of
// its matches does. That sizing is the whole point and it has to be checked
// against a MEASUREMENT, not a recollection: the quiz-bank floor shipped at
// 30 against a population its own comment put at 52, when the real figure is
// 113 — 72 % of slack, enough that the extractor could have lost five banks
// out of six and still reported a clean sweep. Re-measure before moving one.
'use strict';

const { test, expect } = require('@playwright/test');
const {
    TOL_BASE,
    PROSE_FILES,
    numberTokens,
    classifyNumber,
    classifyPair,
    scanFiles,
    extractPairs,
    extractParentheticals,
} = require('./metric-spans.js');

// The fifteen figures the two tests genuinely cannot classify — all of them
// spans; the parenthetical population needs no exemptions today. Every one
// was read by hand during the 2026-08 accuracy audit, and none is a defect.
const ALLOWLIST = [
    {
        file: 'html/education/coil-selection.html',
        us: 'ΔT = 180 − 160 = 20 °F  ·  load = 120,000 Btu/h',
        why: 'One span carries a temperature equation AND a load figure. The '
            + 'temperature half converts cleanly (180 → 82.2, 160 → 71.1 absolute; '
            + '20 → 11.1 delta); the trailing 120,000 Btu/h → 35.2 kW is a power '
            + 'conversion this gate has no test for, and it is paired positionally '
            + 'against nothing meaningful.',
    },
    {
        file: 'html/education/dedicated-outdoor-air.html',
        us: 'in the mid-to-upper 40s&nbsp;°F',
        why: 'Prose-to-prose, not figure-to-figure: "the mid-to-upper 40s °F" is '
            + 'restated as "near 7 to 9 °C", so one numeral becomes two. Both '
            + 'readings are correct (45–48 °F is 7.2–8.9 °C); there is no number '
            + 'pairing to check.',
    },
    {
        file: 'html/education/setpoint-math-reset.html',
        us: "This schedule's cold end happens to sit at 0&nbsp;°F, so the intercept is the design endpoint itself — which is why reset schedules are so often quoted from a zero-degree design day: the b comes for free.",
        why: 'A whole sentence twinned, not a figure. The metric side is rewritten '
            + 'rather than converted, because the observation it makes (the cold end '
            + 'lands on zero, so the intercept is free) is an artefact of the '
            + 'Fahrenheit schedule and does not survive translation.',
    },
    {
        file: 'html/education/setpoint-math-reset.html',
        us: 'SP = −0.667 × 30 + 180 = −20.0 + 180 = 160.0&nbsp;°F',
        why: 'A metric equation TWIN, re-derived rather than converted: the metric '
            + 'slope is −0.665 (from the °C endpoints) where the IP slope is −0.667, '
            + 'and the intercept moves 180 → 70.4. Both lines close on their own '
            + 'operands and the results agree (160.0 °F = 71.1 °C). Pairing the two '
            + 'sides number-by-number is meaningless here — they are two different '
            + 'derivations of the same schedule.',
    },
    {
        file: 'html/education/setpoint-math-reset.html',
        us: '30&nbsp;°F',
        why: 'The metric side deliberately keeps the IP figure in parentheses '
            + '("−1.1 °C (30 °F)") because the surrounding sentence is about the '
            + 'schedule being quoted in °F. One numeral on the left, two on the '
            + 'right; the conversion itself (30 °F → −1.1 °C) is correct.',
    },
    {
        file: 'html/education/setpoint-math-reset.html',
        us: '−0.667 × (−10) + 180 = 6.7 + 180 = 186.7&nbsp;°F',
        why: 'The clamp case of the same metric equation twin as above — same '
            + 're-derived slope and intercept, and the results agree '
            + '(186.7 °F = 85.9 °C).',
    },
    {
        file: 'html/simulators/pid-tuner.html',
        us: 'an 8 °F rise on a 0–100 °F span',
        why: 'A metric-native RE-INSTANTIATION, not a conversion — recorded as '
            + 'working-as-designed by the 2026-08 audit. The sentence teaches a '
            + 'RATIO ("enter the PV change as a percentage of the loop\'s span"), '
            + 'and 4/50 is 8 % exactly as 8/100 is. 0–50 °C is a real metric sensor '
            + 'span; the exact conversion (4.4 °C on 0–55.6 °C) gives the same 8 % '
            + 'with numbers no instrument has.',
    },
    {
        file: 'html/tools/air-mixing.html',
        us: '1000 CFM / 95 °F / 75 °F WB',
        why: 'A preset string mixing airflow with temperatures. 1000 CFM → 1700 m³/h '
            + 'is an airflow conversion this gate has no test for, and it occupies '
            + 'the first pairing slot; the two temperatures behind it convert '
            + 'correctly (95 → 35, 75 → 23.9).',
    },
    {
        file: 'html/tools/air-mixing.html',
        us: '3000 CFM / 75 °F / 50 % RH',
        why: 'Same preset family — airflow plus a relative-humidity percentage that '
            + 'is identical in both systems, so neither temperature test applies to '
            + 'those slots.',
    },
    {
        file: 'html/tools/air-mixing.html',
        us: '500 CFM / 60 °F / 55 °F WB',
        why: 'Same preset family as the two above.',
    },
    {
        file: 'html/tools/airside-load.html',
        us: 'qs = 1.08 × CFM × ΔT°F, in Btu/h',
        why: 'An IP-NATIVE FORMULA LINE. Per CLAUDE.md\'s rounding policy these keep '
            + 'their IP constants and state a metric-native twin instead of a '
            + 'converted one: 1.08 (Btu/h per CFM·°F) and 0.34 (W per m³/h·°C) are '
            + 'the same physics in two unit systems, not a temperature conversion.',
    },
    {
        file: 'html/tools/airside-load.html',
        us: '0.075 lb/ft³, sea level, ~70 °F',
        why: 'A standard-air density note: the leading figure is a density '
            + '(0.075 lb/ft³ → 1.2 kg/m³) and only the trailing reference '
            + 'temperature is a temperature — deliberately coarse in both systems '
            + '("~70 °F" / "~20 °C"), which is the conventional way standard air is '
            + 'quoted.',
    },
    {
        file: 'html/tools/coil-freeze-risk.html',
        us: 'MAT = 50 % × 5 + 50 % × 70 = 37.5 °F',
        why: 'A worked mixed-air line whose leading operands are PERCENTAGES '
            + '(50 % on both sides), which pair against themselves and are neither '
            + 'an absolute nor a delta conversion. The three temperatures behind '
            + 'them are correct (5 → −15, 70 → 21.1, 37.5 → 3.1).',
    },
    {
        file: 'html/tools/thermistor-calculator.html',
        us: 'roughly 1 °F across 32–150 °F (the BAS operating range)',
        why: 'An accuracy DISCLAIMER stated in deliberately coarse round figures in '
            + 'both systems, recorded as accepted-as-is by the 2026-08 audit. '
            + '32 → 0 is exact and 1 °F → 0.5 °C is a fair delta round, but the '
            + 'range end 150 °F is quoted as 0–65 °C where the exact value is '
            + '65.6 — a round number for a range, not a worked-example operand, so '
            + 'there is no arithmetic to close.',
    },
    {
        file: 'html/tools/waterside-load.html',
        us: 'q = 500 × GPM × ΔT°F, in Btu/h',
        why: 'The waterside twin of the airside IP-native formula line: 500 '
            + '(Btu/h per GPM·°F) and 4.187 (kW per L/s·°C) are the same physics in '
            + 'two unit systems.',
    },
];

const allowed = (pair) => ALLOWLIST.some((a) => a.file === pair.file && a.us === pair.us);
const describe = (pair, status) => (pair.notation === 'span'
    ? `${pair.file}:${pair.line} [${status}]\n      data-us="${pair.us}"\n      data-metric="${pair.metric}"`
    : `${pair.file}:${pair.line} [${status}] ${pair.raw}`);

function survey() {
    const templates = scanFiles();
    const proseFiles = scanFiles(undefined, PROSE_FILES);
    const spans = extractPairs(templates);
    const parens = extractParentheticals(proseFiles);
    const pairs = [...spans, ...parens];
    const rows = pairs.map((p) => ({ pair: p, result: classifyPair(p) }));
    return { templates, proseFiles, spans, parens, pairs, rows };
}

test('every °F to °C figure converts as an absolute or a delta', () => {
    const { templates, spans, parens, rows } = survey();

    // Sanity floors FIRST — see the header. A walk that matches nothing must
    // fail loudly rather than report a clean sweep of an empty set. Both
    // notations get their own floor: one extractor silently going dark while
    // the other keeps matching is exactly the half-blind pass to catch.
    expect(spans.length, 'the span walk found implausibly few data-us/data-metric pairs')
        .toBeGreaterThan(400);
    expect(new Set(spans.map((p) => p.file)).size, 'the span walk reached implausibly few files')
        .toBeGreaterThan(30);
    expect(parens.length, 'the parenthetical walk found implausibly few °F (°C) figures')
        .toBeGreaterThan(90);
    expect(
        parens.filter((p) => p.file.startsWith('html/_data/quizzes/')).length,
        'the parenthetical walk stopped reaching the quiz banks — the surface it exists for',
    ).toBeGreaterThan(90);
    expect(templates.length, 'the template scan found implausibly few files').toBeGreaterThan(80);
    const numbered = rows.filter((r) => r.result.status === 'classified' || r.result.status === 'unclassified');
    expect(numbered.length, 'implausibly few numbered °F to °C figures were classified at all')
        .toBeGreaterThan(250);

    const failures = rows
        .filter((r) => r.result.status === 'unclassified' || r.result.status === 'count-mismatch')
        .filter((r) => !allowed(r.pair))
        .map((r) => describe(r.pair, r.result.status));

    expect(
        failures,
        'a °F to °C figure is neither a valid absolute conversion nor a valid delta '
        + `(tolerance base ${TOL_BASE}). Fix the figure, or — if it genuinely `
        + 'cannot be classified — add an ALLOWLIST entry with a written reason.\n'
        + failures.join('\n'),
    ).toEqual([]);
});

// An ALLOWLIST entry that stops matching is not a passing test, it is a
// permanent silent exemption. This is what forces a stale entry out.
test('every ALLOWLIST entry still matches an unclassifiable figure', () => {
    const { rows } = survey();
    const live = rows
        .filter((r) => r.result.status === 'unclassified' || r.result.status === 'count-mismatch')
        .map((r) => r.pair);

    const dead = ALLOWLIST
        .filter((a) => !live.some((p) => p.file === a.file && p.us === a.us))
        .map((a) => `${a.file} — data-us="${a.us}"`);

    expect(
        dead,
        'a stale ALLOWLIST entry is a permanent silent exemption — delete it',
    ).toEqual([]);
});

// Known-answer checks. contrast-sweep.spec.js earns its own version of this
// the hard way: a typo in its sRGB constant scored white-on-black at 5:1 and
// turned most of the site red. Every constant in a guard like this needs a
// fixed point or the guard is unfalsifiable. Verify by mutation — flipping
// the 32 or the 5/9 in metric-spans.js must turn this red.
test('the classifier reproduces known conversions and normalises signs', () => {
    // Absolute fixed points.
    expect(classifyNumber('32', '0')).toBe('absolute');
    expect(classifyNumber('212', '100')).toBe('absolute');
    expect(classifyNumber('68', '20')).toBe('absolute');
    expect(classifyNumber('-40', '-40')).toBe('absolute');

    // Delta fixed points, including the one the HOUSE ROUNDING POLICY
    // requires: 2 °F swings 1.2 °C when the half-band is displayed as 0.6.
    expect(classifyNumber('2', '1.111')).toBe('delta');
    expect(classifyNumber('2', '1.2')).toBe('delta');
    expect(classifyNumber('2', '1.1')).toBe('delta');
    expect(classifyNumber('18', '10')).toBe('delta');

    // The two tests are 32 x 5/9 = 17.78 apart, so they never both match.
    expect(classifyNumber('68', '37.8')).toBe('delta');
    expect(classifyNumber('68', '20')).toBe('absolute');

    // Outright wrong: an absolute converted as though it were nothing at all.
    expect(classifyNumber('70', '70')).toBe('neither');
    expect(classifyNumber('55', '16')).toBe('neither');

    // The tolerance scales with the PRINTED precision, so a whole-degree
    // metric figure is judged at +/-0.5 and a one-decimal one at +/-0.15.
    // 55 °F is 12.78 °C: "13" passes as a rounded whole degree, "13.9" does
    // not pass at one decimal. Both branches are deliberate.
    expect(classifyNumber('55', '13')).toBe('absolute');
    expect(classifyNumber('55', '13.9')).toBe('neither');

    // Sign + separator normalisation. Folding the en dash to a hyphen would
    // tokenize "1–2" as 1 and -2 and silently flip the second operand.
    expect(numberTokens('1–2 °F')).toEqual(['1', '2']);
    expect(numberTokens('&minus;40&nbsp;°F')).toEqual(['-40']);
    expect(numberTokens('−17.8 °C')).toEqual(['-17.8']);
    expect(numberTokens('load = 120,000 Btu/h')).toEqual(['120000']);

    // The classifier must reject a pair it cannot align rather than skip it.
    expect(classifyPair({ us: '30 °F', metric: '−1.1 °C (30 °F)' }).status).toBe('count-mismatch');
    expect(classifyPair({ us: '100 GPM', metric: '6.3 L/s' }).status).toBe('not-temperature');
    expect(classifyPair({ us: 'Dry-bulb (°F)', metric: 'Dry-bulb (°C)' }).status).toBe('label-only');

    // 'label-only' means numeral-free on BOTH sides. A pair with a numeral on
    // exactly ONE side has DROPPED a figure — the classic copy-paste slip —
    // and must reach the failing 'count-mismatch' branch instead of being
    // skipped. This pins the `&&` in classifyPair: under `||` both of these
    // returned 'label-only' and the gate walked past a missing conversion.
    expect(classifyPair({ us: '55 °F', metric: ' °C' }).status).toBe('count-mismatch');
    expect(classifyPair({ us: 'Dry-bulb (°F)', metric: '12.8 °C' }).status).toBe('count-mismatch');
    expect(classifyPair({ us: '55 °F', metric: '12.8 °C' }).status).toBe('classified');
    expect(classifyPair({ us: '55 °F', metric: '13.9 °C' }).status).toBe('unclassified');
});
