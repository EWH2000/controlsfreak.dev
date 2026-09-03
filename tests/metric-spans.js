// Shared `data-us` / `data-metric` span classifier — the ONE parse of the
// site's dual-unit spans, used by two consumers:
//
//   * tests/metric-spans.spec.js   — the BLOCKING gate (arm 1). Fails CI on
//                                    a °F → °C span that is neither a valid
//                                    absolute conversion nor a valid delta.
//   * .github/scripts/metric-lint.mjs — the REPORT-ONLY proximity heuristic
//                                    (arm 2). Reads the same classification
//                                    and then asks a question arm 1 cannot:
//                                    does a delta agree with the metric
//                                    operands the same passage paints?
//
// It lives outside any *.spec.js for the same reason tests/pages.js does —
// requiring it must not re-register another spec's tests — and it lives in
// ONE file because two consumers reading two copies of a parser is precisely
// the drift this repo keeps re-discovering (see the two-source category note
// in CLAUDE.md, and audit-2026-08's own first classifier run).
//
// ── Why the entity + sign normalisation is load-bearing ──────────────────
// Not hygiene. The 2026-08 accuracy audit's first classifier run parsed the
// raw attribute values and mis-signed every negative span, manufacturing
// roughly five false findings before anyone noticed. The site writes minus
// as U+2212 (111 occurrences) and `&minus;`, writes non-breaking and thin
// spaces as entities, and — the trap that matters most — writes RANGES with
// an EN DASH (`1–2 °F`). Fold the en dash to an ASCII hyphen and `1–2`
// tokenizes as `1` and `-2`: the second operand silently flips sign. So the
// dash family folds to a SPACE (it is a separator, never a sign) while the
// true-minus family folds to `-` (it is a sign, never a separator). Verified
// against the corpus: no span uses an ASCII hyphen as a range separator
// (`\d-\d` returns nothing), and every ASCII hyphen that precedes a digit is
// a leading minus.
//
// ── The two tests, and the tolerance ─────────────────────────────────────
// For each positionally-paired number F (from `data-us`) and C (from
// `data-metric`):
//
//     ABSOLUTE   |C − (F − 32) · 5/9| ≤ tol
//     DELTA      |C − F · 5/9|        ≤ tol
//
// The two can never both match — they differ by a constant 32 · 5/9 = 17.78 —
// so a number is absolute, delta, or neither, and "neither" is the failure.
//
// `tol = max(0.5 × 10^(−decimals(C)), TOL_BASE)`. The first term is the
// half-step of the printed precision. TOL_BASE is what makes the guard
// compatible with the HOUSE ROUNDING POLICY rather than at war with it:
// CLAUDE.md requires a stated metric delta or result to be the arithmetic of
// the DISPLAYED operands, never the unrounded canonical value — so
// `2 °F → 1.2 °C` (0.6 doubled) is correct site policy while the canonical
// value is 1.111, a residual of 0.089. A tolerance tight enough to reject
// that would fail the very lines the audit shipped to satisfy the policy.
//
// TOL_BASE = 0.15 is MEASURED, not picked. Scoring every paired number in the
// corpus against the nearer of the two tests and sweeping the base gives a
// flat plateau: 0.10, 0.15, 0.20 and 0.25 all leave exactly the same 20
// over-tolerance numbers, because the legitimate residuals top out at 0.222
// and the next one up is 0.260 (`1.08 → 0.34`, an IP-native formula constant
// that is a genuine hand-inspect). 0.15 sits mid-plateau, so the threshold is
// not perched on an edge of the data. Tightening it to 0.06 — the value the
// audit used for a one-shot human-reviewed sweep — reintroduces five failures
// that are all the rounding policy working as designed.
//
// ── What this deliberately does NOT assert ───────────────────────────────
// * That every number in one span classifies the SAME way. Legitimate spans
//   mix: `50 − 40 = 10 °F` → `10.0 − 4.4 = 5.6 °C` is two absolutes and a
//   delta, and it is correct. An agreement rule would flag every worked
//   equation twin on the site and buy one contrived catch in return.
// * Anything about non-temperature units. A `psi → kPa` or `CFM → m³/h` span
//   is skipped outright: those have no absolute-vs-delta ambiguity, which is
//   the specific defect class this exists for.
// * That a VALID delta is the RIGHT delta. `1.1 °C` for `2 °F` is a perfectly
//   valid delta and passes here; it is wrong only against operands painted
//   elsewhere in the passage. That is finding #57's class, and reaching it
//   needs arm 2 — see .github/scripts/metric-lint.mjs.
//
// ── Two notations, because the defect lives in both ──────────────────────
// A dual-unit figure ships in one of two forms, and CLAUDE.md's rounding
// policy says which goes where:
//
//   SPAN            <span data-us="55 °F" data-metric="12.8 °C">55 °F</span>
//                   Lesson and tool prose. The units walker swaps them.
//   PARENTHETICAL   48 °F (8.9 °C)
//                   Quiz prompts and explanations, which paint AFTER the
//                   walker runs and so cannot use spans.
//
// Scanning only the spans would miss the surface where HALF the 2026-08
// audit's instances of this defect actually lived: two of the four were in
// `html/_data/quizzes/comparators-and-deadband.js`, which `quiz-banks.spec.js`
// walks straight past because that spec is shape-only. So both notations are
// extracted and both are held to the same two tests. Today all 121
// parenthetical pairs classify cleanly, so covering them costs no exemptions.
//
// ── Scan scope ───────────────────────────────────────────────────────────
// SPANS: by default, `.html` and `.njk` under `html/` — the templates that
// render to pages. The blocking spec supplies `_site/` instead so localized
// message values have been resolved before classification. `.js` is excluded
// in either case: the only `data-us` occurrences in a script are the
// DOM-convention example in `html/scripts/units.js`'s header comment and its
// own `[data-us][data-metric]` query selector, neither of which is shipped
// markup.
// PARENTHETICALS: `.html`, `.njk` AND `.js` under `html/`, because the quiz
// banks under `html/_data/quizzes/` are `.js` modules and are exactly the
// surface this notation exists to cover.
// The report-only lint keeps source as the single authored surface. The
// blocking spec scans rendered spans and authored parentheticals because
// locale overlays resolve only during the build.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_ROOT = path.join(ROOT, 'html');
const TOL_BASE = 0.15;

// Sign family → ASCII hyphen. Separator family → space. See the header.
const NORMALISE = [
    [/&nbsp;|&#160;|&#xa0;| /gi, ' '],
    [/&thinsp;|&#8201;| /gi, ' '],
    [/&minus;|&#8722;|−/gi, '-'],
    [/&#8209;|‑/gi, '-'],
    [/&ndash;|&mdash;|&#8211;|&#8212;|–|—/gi, ' '],
];

function normalise(text) {
    return NORMALISE.reduce((acc, [re, to]) => acc.replace(re, to), String(text));
}

// Comma-grouped thousands are one number, not two: `120,000 Btu/h` must not
// tokenize as 120 and 000.
const NUMBER = /-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?/g;

function numberTokens(text) {
    return (normalise(text).match(NUMBER) || []).map((t) => t.replace(/,/g, ''));
}

function decimals(token) {
    const m = String(token).match(/\.(\d+)/);
    return m ? m[1].length : 0;
}

const isFahrenheit = (text) => /°\s*F/.test(normalise(text));
const isCelsius = (text) => /°\s*C/.test(normalise(text));

function toleranceFor(celsiusToken) {
    return Math.max(0.5 * Math.pow(10, -decimals(celsiusToken)), TOL_BASE);
}

// 'absolute' | 'delta' | 'neither'
function classifyNumber(fToken, cToken) {
    const f = Number(fToken);
    const c = Number(cToken);
    const tol = toleranceFor(cToken);
    if (Math.abs(c - (f - 32) * 5 / 9) <= tol) return 'absolute';
    if (Math.abs(c - f * 5 / 9) <= tol) return 'delta';
    return 'neither';
}

/**
 * status:
 *   'not-temperature'  — not a °F → °C pair; out of scope
 *   'label-only'       — a °F → °C pair with no numeral on EITHER side
 *                        (`Dry-bulb (°F)` → `Dry-bulb (°C)`). A pair with a
 *                        numeral on ONE side is NOT this: a dropped numeral
 *                        (`55 °F` → ` °C`) is the classic copy-paste slip and
 *                        must reach 'count-mismatch', which fails.
 *   'count-mismatch'   — different numeral counts; nothing to pair
 *   'classified'       — every paired number is absolute or delta
 *   'unclassified'     — at least one paired number is neither  ← the failure
 */
function classifyPair(pair) {
    if (!isFahrenheit(pair.us) || !isCelsius(pair.metric)) {
        return { status: 'not-temperature', numbers: [] };
    }
    const fTokens = numberTokens(pair.us);
    const cTokens = numberTokens(pair.metric);
    // `&&`, not `||`: a pair that is numeral-free on BOTH sides is a label
    // twin and genuinely out of scope, but one that has a numeral on ONE side
    // has LOST a figure, which is squarely the defect class this gate exists
    // for. `||` swallowed that case as 'label-only' and skipped it; `&&` lets
    // it fall through to 'count-mismatch', which is a hard failure.
    if (!fTokens.length && !cTokens.length) return { status: 'label-only', numbers: [] };
    if (fTokens.length !== cTokens.length) return { status: 'count-mismatch', numbers: [] };

    const numbers = fTokens.map((f, i) => ({
        f: Number(f),
        c: Number(cTokens[i]),
        tol: toleranceFor(cTokens[i]),
        kind: classifyNumber(f, cTokens[i]),
    }));
    const bad = numbers.some((n) => n.kind === 'neither');
    return { status: bad ? 'unclassified' : 'classified', numbers };
}

const TEMPLATE_FILES = /\.(html|njk)$/;
const PROSE_FILES = /\.(html|njk|js)$/;

function scanFiles(dir = SCAN_ROOT, pattern = TEMPLATE_FILES, out = []) {
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) scanFiles(full, pattern, out);
        else if (pattern.test(entry)) out.push(full);
    }
    return out.sort();
}

// Any element may carry the pair — `<span>` dominates but `<td>` and `<text>`
// occur too — so the tag name is not part of the match. `[^<>]*?` keeps the
// scan inside one tag.
const OPEN_TAG = /<([a-zA-Z][\w-]*)\b[^<>]*?>/g;

// `index` is in NORMALISED coordinates for every extractor here, because
// `metric-lint.mjs` measures its proximity window as the raw difference of two
// indices and so needs them in ONE coordinate system. The parenthetical walk
// and the lint's own `celsiusValues` both index into `normalise(src)`, where
// `&nbsp;` is 1 character rather than 6 and `&ndash;` 1 rather than 7; a raw
// span offset is therefore systematically LARGER than its normalised twin, by
// as much as 702 characters on this corpus (66 of 515 spans drift ≥200 — 58 %
// of the 1200-char window), which silently mis-scopes the window for spans
// and never for parentheticals.
//
// It is translated rather than re-matched: running the tag scan over
// normalised source would also rewrite the CAPTURED `data-us` / `data-metric`
// strings, and those are the ALLOWLIST's keys in `metric-spans.spec.js` —
// several entries hold a literal `&nbsp;`. Callers get the raw attribute text
// (the classifier normalises internally, per the header) and a normalised
// offset. The translation is exact because no NORMALISE pattern contains `<`,
// so none can straddle the cut, which always lands on a tag's `<`.
const normalisedIndex = (src, rawIndex) => normalise(src.slice(0, rawIndex)).length;

function extractPairs(files = scanFiles()) {
    const pairs = [];
    for (const file of files) {
        const src = fs.readFileSync(file, 'utf8');
        const rel = path.relative(ROOT, file).split(path.sep).join('/');
        let m;
        const re = new RegExp(OPEN_TAG.source, 'g');
        while ((m = re.exec(src))) {
            const tag = m[0];
            const us = /data-us="([^"]*)"/.exec(tag);
            const metric = /data-metric="([^"]*)"/.exec(tag);
            if (!us || !metric) continue;
            pairs.push({
                notation: 'span',
                file: rel,
                line: src.slice(0, m.index).split('\n').length,
                index: normalisedIndex(src, m.index),
                us: us[1],
                metric: metric[1],
            });
        }
    }
    return pairs;
}

// `48 °F (8.9 °C)` and its variants. Run against NORMALISED source, so the
// leading minus is already an ASCII hyphen — matching the raw text instead
// drops the sign off every `−10 °F (−23.3 °C)` in the quiz banks and reports
// three false failures, which is how this regex was first written.
// The gap between the two halves may carry a qualifier (`75 °F WB (23.9 °C)`)
// but never a DIGIT: an unbounded gap happily pairs a temperature with a
// parenthetical from the next sentence.
const PARENTHETICAL = /(-?\d[\d,]*(?:\.\d+)?)\s*°\s*F\b[^()\d]{0,24}?\(\s*(?:about |approx\.? |roughly |~|≈)?(-?\d[\d,]*(?:\.\d+)?)\s*°\s*C/g;

function extractParentheticals(files = scanFiles(SCAN_ROOT, PROSE_FILES)) {
    const pairs = [];
    for (const file of files) {
        const src = normalise(fs.readFileSync(file, 'utf8'));
        const rel = path.relative(ROOT, file).split(path.sep).join('/');
        let m;
        const re = new RegExp(PARENTHETICAL.source, 'g');
        while ((m = re.exec(src))) {
            pairs.push({
                notation: 'parenthetical',
                file: rel,
                line: src.slice(0, m.index).split('\n').length,
                index: m.index,
                us: `${m[1]} °F`,
                metric: `${m[2]} °C`,
                raw: m[0],
            });
        }
    }
    return pairs;
}

module.exports = {
    ROOT,
    SCAN_ROOT,
    TOL_BASE,
    TEMPLATE_FILES,
    PROSE_FILES,
    normalise,
    numberTokens,
    decimals,
    isFahrenheit,
    isCelsius,
    toleranceFor,
    classifyNumber,
    classifyPair,
    scanFiles,
    extractPairs,
    extractParentheticals,
};
