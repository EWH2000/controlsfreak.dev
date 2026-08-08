// Metric proximity lint — does a stated DELTA agree with the metric operands
// its own passage paints? controlsfreak.dev.
//
// REPORT-ONLY. Always exits 0. Deliberately NOT wired into
// .github/workflows/test.yml, for the same reason `prose-lint` is not: this
// is a heuristic over "nearby", it will produce false positives, and a gate
// that cries wolf gets muted — which is worse than no gate. Its blocking
// sibling is `tests/metric-spans.spec.js`; the two answer different questions
// and neither subsumes the other.
//
// Run modes:
//   node .github/scripts/metric-lint.mjs           grouped human report
//   node .github/scripts/metric-lint.mjs --json    machine-readable findings
//   node .github/scripts/metric-lint.mjs --files   just the file list scanned
//
// ── The question this asks, and why the gate cannot ──────────────────────
// `tests/metric-spans.spec.js` asks: is this number a valid absolute or a
// valid delta? That closes the "the conversion is outright wrong" class and
// it is a real gate. It does NOT close the class the 2026-08 audit actually
// found, because a defect there looked like this:
//
//     "…75 °F (23.9 °C) … 73 °F (22.7 °C) … the DB constant is 1 °F (0.6 °C)
//      … so the space swings 2 °F (1.1 °C) from set to reset."
//
// Every figure is individually defensible — 1.1 IS the canonical delta of
// 2 °F. The passage is still wrong, because it paints 23.9 and 22.7 (whose
// difference is 1.2) and a half-band of 0.6 (which doubles to 1.2), and then
// states 1.1. Per CLAUDE.md's rounding policy the stated delta must be the
// arithmetic of the DISPLAYED operands, so 1.2 is the only correct answer and
// the page contradicts itself. Nothing structural can see that; only
// proximity can. This script is that proximity check.
//
// ── How a finding is produced ────────────────────────────────────────────
// For every DELTA figure D (in °C):
//   1. Collect the OPERAND POOL: every °C numeral within WINDOW characters of
//      it in the same file, minus D's own numerals. Fewer than two operands
//      and the check stops there — see the note at the guard in `lint`.
//   2. Build a CANDIDATE SET of the values the passage implies D should be:
//        * each operand itself       — the same quantity, restated nearby;
//        * twice each operand        — D is that half-band, doubled;
//        * each pairwise difference  — the band, read off its two edges;
//        * half each difference      — the half-band those edges are built from.
//   3. If some candidate matches D within NEAR_TOL, say nothing.
//   4. Otherwise report D, the candidate set, and the nearest miss.
//
// ── Every formulation choice, and why ────────────────────────────────────
// * WINDOW = 1200 characters, measured on the SOURCE, as a stand-in for "the
//   same passage". Site paragraphs run roughly 400–1200 source characters, so
//   one window is about one paragraph plus its neighbours' edges. The
//   direction of the error matters and it is asymmetric: a WIDER window adds
//   candidates, and more candidates only ever make a match MORE likely, so
//   widening SUPPRESSES findings and narrowing produces noise. 1200 is
//   therefore the conservative side of the trade — it under-reports rather
//   than shouting.
// * NEAR_TOL = 0.06, much tighter than the gate's 0.15. Deliberate: the gate
//   compares a figure against a real-number conversion and must tolerate the
//   house rounding policy, while this compares one DISPLAYED one-decimal
//   value against arithmetic on other DISPLAYED one-decimal values. That
//   arithmetic is exact. A 0.1 discrepancy is precisely the defect, so the
//   tolerance must sit below 0.1 — and if it did not, this lint would be
//   blind to the only thing it exists to see.
// * SUBJECTS come from dual-unit figures in both notations — spans and
//   `48 °F (8.9 °C)` parentheticals — because only a paired figure tells you
//   the metric value is meant to be a DELTA. OPERANDS are every °C numeral,
//   paired or bare, because the audit's quiz-bank instance painted its band
//   edges as bare metric values inside an `explain` string and a pairs-only
//   pool is blind to it. Measured: pairs-only catches 1 of the 2 sites; the
//   bare pool catches both.
// * Only a figure whose numbers are ALL deltas is TESTED. A worked equation
//   like `50 − 40 = 10 °F` carries a delta as its result while its own
//   operands sit in the same string, so testing it just reports a tautology.
//   Its numbers still join the pool for its neighbours.
// * The classifier, the tolerance base, the entity/sign normalisation and the
//   scan scope all come from `tests/metric-spans.js`. One parser, two
//   consumers: a second copy of this arithmetic is the drift generator this
//   repo keeps re-finding.
//
// ── Measured against the defects it was built for ────────────────────────
// Re-running this against the three figures the 2026-08 audit had to hand-fix
// (reverted in place, then restored) reports TWO of them and misses ONE:
//
//   CAUGHT  education/comparators-and-deadband.html:419 — `2 °F → 1.1 °C`,
//           "the passage implies 1.2 / 0.6", nearest 1.2, off by 0.1. This is
//           finding #57 / codebase-issues #232, the whole reason for the arm.
//   CAUGHT  _data/quizzes/comparators-and-deadband.js — `6 °F (3.3 °C)`,
//           whose own explain paints "22.2 ± 1.7 °C", nearest 3.4, off by 0.1.
//   MISSED  the same bank's `cdb-band-edge-set-point`. Its operands are
//           written as one metric EXPRESSION with the unit stated once —
//           "(in °C: 22.2 + 0.6 = 22.8, and 22.2 − 0.6 = 21.6)" — so a scan
//           for `<number> °C` sees only the 22.2 that came from the prompt.
//           The band edges it needs are right there and structurally
//           invisible. Do not read that as a bug to fix by loosening the
//           regex: pulling bare numbers out of prose that merely mentions °C
//           somewhere is how a lint starts inventing operands.
//
// Two of three, from a heuristic, on the exact defect class. That is worth
// running before a content sweep and is not worth blocking a merge on.
//
// ── What a finding is NOT ────────────────────────────────────────────────
// It is a CANDIDATE FOR REVIEW, exactly like a prose-lint hit. A passage can
// legitimately state a delta unrelated to any absolutes near it — a lesson
// that mentions a 20 °F ΔT across a coil two sentences from a pair of
// unrelated setpoints trips this and is fine. Read the sentence before
// touching a figure. The total is a ceiling on real defects, never a count of
// them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const spans = require(path.join(ROOT, 'tests/metric-spans.js'));

const { PROSE_FILES, classifyPair, scanFiles, extractPairs, extractParentheticals } = spans;

const WINDOW = 1200;
const NEAR_TOL = 0.06;

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const filesOnly = args.includes('--files');

const round1 = (n) => Math.round(n * 10) / 10;

// Every °C numeral the source paints, pair or not. The operand pool CANNOT be
// built from dual-unit figures alone: the quiz-bank instance of this defect
// painted its two band edges as bare metric values inside an `explain`
// string — "(in °C: 22.2 + 0.6 = 22.8, and 22.2 − 0.6 = 21.6)" — so a
// pairs-only pool sees no operands there and reports nothing at all. Measured:
// with a pairs-only pool this lint catches 1 of the audit's 2 sites; with the
// bare values in the pool it catches both.
const CELSIUS_VALUE = /(-?\d[\d,]*(?:\.\d+)?)\s*°\s*C/g;

function celsiusValues(files) {
    const byFile = new Map();
    for (const file of files) {
        const src = spans.normalise(fs.readFileSync(file, 'utf8'));
        const rel = path.relative(ROOT, file);
        const found = [];
        let m;
        const re = new RegExp(CELSIUS_VALUE.source, 'g');
        while ((m = re.exec(src))) {
            found.push({ index: m.index, value: Number(m[1].replace(/,/g, '')) });
        }
        byFile.set(rel, found);
    }
    return byFile;
}

function collect() {
    const templateFiles = scanFiles();
    const proseFiles = scanFiles(undefined, PROSE_FILES);
    const rows = [...extractPairs(templateFiles), ...extractParentheticals(proseFiles)]
        .map((pair) => ({ pair, result: classifyPair(pair) }))
        .filter((r) => r.result.status === 'classified')
        .sort((a, b) => a.pair.file.localeCompare(b.pair.file) || a.pair.index - b.pair.index);
    return { proseFiles, rows, pool: celsiusValues(proseFiles) };
}

function lint(rows, pool) {
    const findings = [];
    const byFile = new Map();
    for (const r of rows) {
        if (!byFile.has(r.pair.file)) byFile.set(r.pair.file, []);
        byFile.get(r.pair.file).push(r);
    }

    for (const [file, fileRows] of byFile) {
        const painted = pool.get(file) || [];
        for (const subject of fileRows) {
            // Only a figure that is deltas all the way through is tested — see
            // the multi-number note in the header.
            if (!subject.result.numbers.length) continue;
            if (!subject.result.numbers.every((n) => n.kind === 'delta')) continue;

            const own = new Set(subject.result.numbers.map((n) => n.c));
            const operands = painted
                .filter((v) => Math.abs(v.index - subject.pair.index) <= WINDOW)
                .map((v) => v.value)
                .filter((v) => !own.has(v));
            // TWO operands minimum. With one, the only relationships available
            // are "the same value" and "twice it", which almost never match and
            // turned this into a 31-finding noise generator; a difference needs
            // two values by definition, and the difference IS the relationship
            // this check is about.
            if (operands.length < 2) continue;

            // The four relationships a passage can imply for a delta.
            const candidates = new Set();
            const offer = (v) => { if (v > 0) candidates.add(round1(v)); };
            for (let i = 0; i < operands.length; i++) {
                offer(Math.abs(operands[i]));       // the same quantity, restated
                offer(Math.abs(operands[i]) * 2);   // this delta is that half-band doubled
                for (let j = i + 1; j < operands.length; j++) {
                    const diff = Math.abs(operands[i] - operands[j]);
                    offer(diff);                    // the band, read off its two edges
                    offer(diff / 2);                // the half-band those edges are built from
                }
            }
            if (!candidates.size) continue;

            for (const n of subject.result.numbers) {
                const stated = Math.abs(n.c);
                if (stated === 0) continue;
                const list = [...candidates].sort((a, b) => Math.abs(a - stated) - Math.abs(b - stated));
                if (Math.abs(list[0] - stated) <= NEAR_TOL) continue;
                findings.push({
                    file: subject.pair.file,
                    line: subject.pair.line,
                    notation: subject.pair.notation,
                    figure: subject.pair.notation === 'span'
                        ? `${subject.pair.us}  →  ${subject.pair.metric}`
                        : subject.pair.raw,
                    statedDelta: n.c,
                    fahrenheit: n.f,
                    nearestCandidate: list[0],
                    candidates: list.slice(0, 6),
                    operandsInWindow: operands.length,
                });
            }
        }
    }
    return findings;
}

// NOTE: no process.exit() below, deliberately — same trap prose-lint.mjs
// records. `console.log` to a PIPE is asynchronous; process.exit() discards
// whatever has not drained, which truncated that script's --json document at
// the 8 KB pipe buffer and produced unparseable JSON, while redirecting to a
// file hid the bug (file-descriptor writes are synchronous). Falling off the
// end lets the event loop flush. The exit code is 0 regardless: nothing here
// ever sets a failing one.

const { proseFiles, rows, pool } = collect();

if (filesOnly) {
    for (const f of proseFiles) console.log(path.relative(ROOT, f));
} else {
    const findings = lint(rows, pool);
    if (asJson) {
        console.log(JSON.stringify({
            scanned: proseFiles.length,
            classifiedFigures: rows.length,
            window: WINDOW,
            tolerance: NEAR_TOL,
            candidates: { total: findings.length, findings },
        }, null, 2));
    } else {
        console.log('══ metric proximity lint — candidates for review ══');
        console.log('A stated metric DELTA that does not equal any relationship the');
        console.log('surrounding passage paints. Report-only; expect false positives —');
        console.log('read the sentence before changing a figure.\n');
        console.log(`scanned ${proseFiles.length} files · ${rows.length} classified °F→°C figures`);
        console.log(`window ${WINDOW} chars · tolerance ±${NEAR_TOL} °C\n`);
        if (!findings.length) {
            console.log('no candidates.');
        }
        let currentFile = null;
        for (const f of findings) {
            if (f.file !== currentFile) {
                currentFile = f.file;
                console.log(`── ${currentFile} ──`);
            }
            console.log(`  line ${f.line} (${f.notation})  ${f.figure}`);
            console.log(`    states ${f.statedDelta} °C for ${f.fahrenheit} °F;`
                + ` the passage implies ${f.candidates.join(' / ')}`);
            console.log(`    nearest ${f.nearestCandidate} °C`
                + ` (off by ${round1(Math.abs(f.nearestCandidate - f.statedDelta))})`
                + `  · ${f.operandsInWindow} metric operands in the window\n`);
        }
        console.log(`${findings.length} candidate(s). This is a ceiling on real defects, not a count of them.`);
    }
}
