// Prose lint for stale terminal/ordinal claims — controlsfreak.dev.
//
// REPORT-ONLY. Always exits 0. Deliberately NOT wired into
// .github/workflows/test.yml. The point is to make the noise floor
// visible and auditable before anything is allowed to block main.
//
// Run modes:
//   node .github/scripts/prose-lint.mjs           grouped human report
//   node .github/scripts/prose-lint.mjs --json    machine-readable findings
//   node .github/scripts/prose-lint.mjs --files   just the file list it scanned
//
// TWO CLASSES, NEVER SUMMED  (owner ruling, 2026-07-20)
//
// Two rulings landed the same day and looked like they conflicted:
//
//   (a) "A count in prose is a violation only if appending can falsify it."
//   (b) "Keep the `next` / positional class, ranked lower."
//
// The apparent conflict: "the next page in this chapter" is APPEND-SAFE —
// appending to the end of a chapter cannot change what comes next — so a
// strict reading of (a) retires the positional class outright, contradicting
// (b). The owner's resolution is that BOTH stand, because they measure
// DIFFERENT RISKS:
//
//   APPEND-FRAGILE    — HIGH class. Goes stale when a lesson is added to the
//                       END of a chapter. That is how this curriculum
//                       overwhelmingly grows, so these are the time bombs
//                       CLAUDE.md's "Write claims that can't go stale" is
//                       actually about. Rules: terminal-verb, terminal-ordinal,
//                       terminal-in-chapter, counted-set, ordinal-label.
//
//   INSERTION-FRAGILE — MEDIUM class (LOW when anchor-wrapped). Goes stale
//                       only when a lesson is inserted MID-SEQUENCE. Rarer,
//                       but real: chapters do get lessons inserted. Rules:
//                       positional-ordinal, positional-in-chapter. Both are
//                       `next`-shaped; nothing terminal lives in this class.
//
// THEY ARE REPORTED SEPARATELY, WITH SEPARATE TOTALS, AND ARE NEVER ADDED
// TOGETHER. No combined headline number appears in any output mode. That
// conflation is precisely what broke the two earlier formulations of this
// check: one label was used for two different failure modes, so the single
// number it produced meant nothing and could not be argued with. A reader who
// wants to know "how much append-fragile prose is on this site" must be able
// to read that number without subtracting a different risk out of it.
//
// A finding is placed by its WORST failure mode, not its only one. The
// ordinal-label class is the case where that matters: "Page 3 of this chapter"
// read in isolation is insertion-fragile only, but the shape this corpus
// actually carries is the chapter recap (duct-static-control.html:598-604 walks
// "Page one" through "Page five" in one paragraph), and an enumeration of a
// chapter goes INCOMPLETE the moment a page is appended. The class sits in
// append-fragile on that worst case; individual lines within it may be
// insertion-only, and that is a judgement for the reader of the sentence, the
// same judgement the "last page" homograph already demands (see KNOWN
// AMBIGUITY below).
//
// KNOWN MISFILES IN THE APPEND TOTAL — recorded here, in the repo, rather
// than in a PR body, because CLAUDE.md's Workflow section is explicit that
// "PR bodies are not a reliable debt ledger, in either direction" and that a
// reader should "reconcile against the built site". A number the owner ruling
// exists to make independently readable has to carry its own errata:
//
//   - html/education/controls-commissioning.html — "Two lessons sit on either
//     side of this one" reports as counted-set / append / HIGH. It names a
//     fixed BEFORE-and-AFTER pair, so appending to the chapter cannot falsify
//     it; only an insertion can. It is insertion-fragile filed under append.
//     Left in place deliberately: separating it needs a semantic distinction
//     the regex vocabulary cannot draw (a count of neighbours vs a count of a
//     set), and misfiling toward the higher-severity class is the
//     conservative direction.
//   - The ordinal-label class carries the same kind of residue by design —
//     see the worst-case paragraph above. Lines whose ordinal is genuinely
//     lone (refrigerant-cycle-basics.html, superheat-subcooling.html and its
//     quiz bank) are insertion-only within an append-filed class.
//
// So the append total is a CEILING, not a clean figure. Read the sentence.
//
// WHAT IT LOOKS FOR
//
// CLAUDE.md, "Write claims that can't go stale": the curriculum grows by
// APPEND, so a sentence that fixes a chapter's size or names its last page
// is a time bomb. "the last page of this chapter", "these six pages",
// "closes this chapter", "the chapter closer" all went stale the moment a
// page landed; one such claim propagated to six files before anyone caught
// it. Countable-but-uncounted phrasings ("its own page in this chapter",
// "the pages before it") survived every expansion.
//
// FORMULATION CHOICES — PINNED DELIBERATELY
//
// Two earlier attempts at this lint each reported a confident true/false
// split and neither was reproducible, because no pattern was ever
// committed. Every choice that moved those numbers is written down here so
// the next reader can disagree with a specific line instead of re-guessing.
//
// 1. IS "next" IN THE VOCABULARY?  YES — as class `positional`, and it is
//    the whole content of the INSERTION-FRAGILE report, now literally: both
//    positional rules match on `next` alone. `last` / `final in this chapter`
//    used to ride along in positional-in-chapter and are terminal claims, so
//    they moved to terminal-in-chapter in the append class. Rationale: "the next
//    page in this chapter" does not go stale when the chapter grows at the
//    END (the append case CLAUDE.md is actually about), but it DOES go stale
//    on INSERTION. Same failure mode as a backward "the last page" reference.
//    Real, but a different and rarer trigger than a terminal claim — so it is
//    reported in its own section at its own severity rather than excluded,
//    and never added to the append-fragile total. Excluding it entirely is
//    what drove one earlier reconstruction to zero findings; folding it into
//    one number is what made the other reconstruction's number meaningless.
//
// 2. ARE "opening" / "opener" / "first page" IN IT?  NO — subtracted.
//    An opener claim is provably stable under append: appending to a
//    chapter cannot change which page opened it. "the opening lesson of
//    this chapter" (boolean-logic-latches, comparators-and-deadband,
//    timers-and-delays) is correct phrasing, not a defect. This is one of
//    the two provably-safe classes.
//
// 3. EXISTENCE CLAIMS are the other subtracted class. "has its own page in
//    this chapter" / "a page of its own" asserts only that a page exists,
//    never where it sits, so it cannot go stale. The subtraction is applied
//    PER MATCH, not per line: economizers.html:115 carries an existence
//    claim AND a separate "next in this chapter" in the same sentence, and
//    only the positional half is a finding.
//
// 3a. HONEST ACCOUNTING OF WHAT SAFE ACTUALLY DOES TODAY: nothing.
//    Deleting the SAFE array outright produces a byte-identical finding
//    set — same count, same file/line/rule/match, set-diff empty in both
//    directions. It is a FORWARD guard, not a live filter, and the header
//    previously read as though the reported total were net of two
//    subtractions when it is gross.
//
//    The reason is that the safe phrasings are not candidate findings under
//    ANY current rule, so there is nothing for the subtraction to remove.
//    Re-read the economizers.html:115 example above in that light: the SAFE
//    regex does match "a page of its own", but no rule starts inside that
//    span (none of the five begins on "a" / "its" / "opening" / "first"),
//    so the per-match skip never fires. The finding on that line comes from
//    "next in this chapter", which SAFE was never going to touch. The
//    example demonstrates the INTENT correctly and demonstrates the
//    MECHANISM not at all. Same for the three opener claims in choice 2.
//
//    SAFE is kept rather than deleted because the rule vocabulary is the
//    thing most likely to grow — the moment a rule reaches "first page" or
//    "its own page", these subtractions start carrying weight. But that
//    also means SAFE has ZERO coverage proving it works. Anyone extending
//    the rule vocabulary into opener or existence territory should verify
//    the subtraction actually fires rather than trusting this block.
//
// 4. PROXIMITY WINDOW: ADJACENCY, NOT A CHARACTER COUNT. The ordinal word
//    must sit within two words of the sequence noun (page / lesson /
//    chapter). A character window (the earlier formulations used 45-60
//    chars) drags in "closes the question this page opened"
//    (analog-sensing:240), "the first hint of where this page is going"
//    (air-unit-identification:215), "the last preset, which reproduces a
//    building this page..." (building-pressure:411) — all rhetorical, none
//    positional. Adjacency drops every one of them without a bespoke
//    exclusion. A 2-LINE sliding window handles claims wrapped across
//    source lines; each match is anchored to the line where it starts, so
//    nothing is double-reported. The ANCHOR-WRAP check runs on a 3-line
//    window (one wider on each side): the rules only match forward, but an
//    <a> can OPEN on the line before the match starts, and scoring those as
//    unlinked mis-ranked real findings (duct-static-control.html:370 read
//    HIGH when its claim is fully anchor-wrapped and belongs at MEDIUM).
//
// 5. RAW SOURCE OR EXTRACTED PROSE?  Raw source, with four things stripped
//    before matching:
//      - HTML tags        — `id="chapter-next"` and `href=".../last-page"`
//                           are markup, not claims (this was a documented
//                           false-positive source). Masked over the WHOLE
//                           file, like the comments below and for the same
//                           reason: opening tags wrap across source lines all
//                           over this corpus, and a per-line strip left the
//                           continuation line's raw attributes exposed to the
//                           rules — the precise false positive this defends
//                           against.
//      - Nunjucks {{ }} / {% %} — `next: {{ page.fileSlug | nextQuiz }}` in
//                           37 practice pages is a data binding, not prose.
//      - HTML / CSS / JS block comments — dev notes to ourselves. Masked
//                           over the whole file, not per line: several span
//                           multiple source lines, and a per-line mask
//                           leaves their middle lines reading as prose.
//      - JS line comments — likewise. This one is a JUDGMENT CALL and it is
//                           deliberate: duct-static-control.html has three
//                           "last page" claims inside <script>, and they are
//                           NOT equivalent. :683 is a `//` comment (not
//                           reader-facing, correctly dropped here), while
//                           :860 and :884 are string literals painted into
//                           the DOM at runtime and ARE reader-facing. A lint
//                           that scanned only HTML text nodes would miss
//                           both. Scanning raw source with comments stripped
//                           keeps exactly the reader-facing pair.
//
// 6. PATH EXCLUSIONS. Templates, shared scripts, and build data are
//    infrastructure, not reader prose, and are excluded from every rule.
//    html/_data/quizzes/ is deliberately KEPT: quiz prompts and
//    explanations are reader-facing prose.
//
// 6a. LANDINGS ARE EXCLUDED FROM THE ORDINAL CLASSES ONLY — not, as the
//    first cut had it, from every rule. The authority is CLAUDE.md:
//    "Section landings and hub pages are the ONE place ordinals belong,
//    since they enumerate the sequence anyway." That licenses ORDINALS,
//    and it licenses them BECAUSE the page enumerates the sequence in
//    view. It says nothing about counts or terminal claims, and the same
//    bullet elsewhere says the opposite of a blanket pass: "don't count
//    pages, lessons, or files in prose when naming the set does the same
//    work." A blanket exclusion also contradicted the corpus — the
//    terminal claim that motivated PR #395 ("close the chapter from
//    memory") shipped ON a landing, and would have been invisible here.
//    Narrowing it surfaces exactly four findings, all genuine: the four
//    topic hubs open with "Work the {three,five,five,eight} lessons in
//    order" in a `.landing-intro`, sitting above a HAND-WRITTEN hub-path
//    block whose step numbers are equally hardcoded, so nothing
//    regenerates either half when a lesson lands. /refrigeration/'s is
//    the twin of the claim this branch removed from
//    metering-devices-txv-eev.html:303. The home-page count pills stay
//    exempt on their own merits — home-hero.spec.js has a drift guard
//    keeping them honest — but that guard does not reach these hubs.
//
// KNOWN AMBIGUITY THE LINT CANNOT RESOLVE
//
// "the last page" is a homograph. It means "the previous page" (a backward
// reference, stable under append, breaks only on insertion) far more often
// in this corpus than it means "the final page of the chapter" (a terminal
// claim, stale the moment a page lands). Nothing lexical separates them —
// only reading the sentence does. This is the single largest source of
// findings a human will dismiss, and it is why the report ranks
// anchor-wrapped matches lower: a "last page" wrapped in an <a href> to a
// named page is almost always the backward sense.

'use strict';

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HTML_DIR = path.join(ROOT, 'html');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const filesOnly = args.includes('--files');

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

const SCANNED_EXT = new Set(['.html', '.js']);

// Infrastructure — never reader prose, excluded from every rule (choice 6).
const EXCLUDED = [
    /^_includes\//,
    /^scripts\//,
    /^_data\/(?!quizzes\/)/,
];

// Landings and hub pages are excluded from the ORDINAL classes only, not from
// every rule (choice 6a). CLAUDE.md's carve-out is specifically about
// ordinals — "Section landings and hub pages are the ONE place ordinals
// belong, since they enumerate the sequence anyway" — and the licence is
// granted BECAUSE the page enumerates the sequence right there. A count or a
// terminal claim is neither enumerated nor self-checking.
const ORDINAL_ONLY_EXCLUDED = [
    /(^|\/)index\.html$/,
];

const ORDINAL_CLASSES = new Set(['ordinal', 'positional']);

function isExcluded(rel) {
    return EXCLUDED.some((re) => re.test(rel));
}

function skipsClass(rel, cls) {
    return ORDINAL_CLASSES.has(cls) && ORDINAL_ONLY_EXCLUDED.some((re) => re.test(rel));
}

function scanFiles(dir) {
    const out = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...scanFiles(full));
        } else if (SCANNED_EXT.has(path.extname(entry.name))) {
            const rel = path.relative(HTML_DIR, full);
            if (!isExcluded(rel)) out.push(full);
        }
    }
    return out.sort();
}

// ---------------------------------------------------------------------------
// Masking (choice 5)
//
// Every strip REPLACES with spaces of equal length rather than deleting, so
// match offsets stay aligned with the original line. That keeps the
// anchor-wrap check (which reads the raw line) honest.
// ---------------------------------------------------------------------------

const blank = (m) => ' '.repeat(m.length);

// HTML comments and Nunjucks blocks are masked over the WHOLE file, not
// per line — several dev notes in html/education/ span multiple source
// lines, and a per-line mask leaves their middle lines looking like prose.
// Newlines survive the blanking so line numbers stay put.
const blankKeepNewlines = (m) => m.replace(/[^\n]/g, ' ');

function maskFile(src) {
    return src
        .replace(/<!--[\s\S]*?-->/g, blankKeepNewlines)   // HTML comment
        .replace(/\/\*[\s\S]*?\*\//g, blankKeepNewlines)  // CSS / JS block comment
        .replace(/\{#[\s\S]*?#\}/g, blankKeepNewlines)    // Nunjucks comment
        .replace(/\{\{[\s\S]*?\}\}/g, blankKeepNewlines)  // Nunjucks expression
        .replace(/\{%[\s\S]*?%\}/g, blankKeepNewlines)    // Nunjucks tag
        .replace(/<[^>]*>/g, blankKeepNewlines);          // HTML tag
}

// The HTML-tag strip belongs in maskFile, NOT here: `[^>]` spans newlines, and
// this corpus wraps opening tags across source lines constantly (200 lines
// under html/**.html end mid-tag). Stripping per line needs a `<` on the same
// line, so a wrapped tag left its continuation line's raw attributes exposed
// to the rules — defeating the false-positive defense choice 5 claims, since
// `href=".../last-page"` is markup, not a claim. Nothing leaks today, but
// `counted-set` is NUM[-\s]NOUN and that class accepts a hyphen, so a future
// `href=".../three-page-recap.html"` landing on a continuation line would be
// reported as a HIGH prose finding with markup as its match. Moving the strip
// is behavior-preserving on today's corpus (verified: same 44 findings).
function maskLine(line) {
    return line
        .replace(/(^|[^:])\/\/.*$/, (m, p1) => p1 + blank(m.slice(p1.length)));  // JS line comment
}

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

// "one" is deliberately absent: "one page back" is a relative back-reference
// (duct-static-control:148, building-pressure:394, vav-systems:149), not a
// claim about the size of a set, and a set of one cannot drift by growing.
const NUM = '(?:two|three|four|five|six|seven|eight|nine|ten|\\d+)';
const NOUN = '(?:pages?|lessons?|chapters?)';
// "within two words of" (choice 4). [\w-] so a hyphenated compound counts as
// one word — "closes the three-page chapter" must reach its noun.
const GAP = '(?:\\s+[\\w-]+){0,2}\\s+';

const RULES = [
    {
        id: 'terminal-verb',
        cls: 'terminal',
        fragility: 'append',
        severity: 'high',
        why: 'asserts a chapter is closed — stale the moment a page is appended',
        // Every inflection, not just the third-person singular. The first cut
        // of this alternation covered `closes` but not `close` / `closed`, and
        // the wording it therefore missed — "close the chapter from memory" —
        // is a VERBATIM shipped regression: it sat on the practice landing's
        // card desc and the paired drill intro, went stale when the forced-air
        // chapter grew 6 → 8 by append, and was retired in PR #395. A lint
        // commissioned for this defect class that cannot see the defect it was
        // commissioned for is worse than no lint. Same reasoning for `ended` /
        // `wrapped up`: a backward-looking past tense ("this lesson closed the
        // chapter") makes the identical terminal assertion.
        re: new RegExp(`\\b(?:close[sd]?|closing|conclude[sd]?|concluding|wrap(?:s|ped)?\\s+up|end(?:s|ed|ing)?)${GAP}${NOUN}\\b`, 'gi'),
    },
    {
        id: 'terminal-ordinal',
        cls: 'terminal',
        fragility: 'append',
        severity: 'high',
        why: 'names a final page — stale the moment a page is appended',
        re: new RegExp(`\\b(?:final|last)\\s+(?:${NUM}[-\\s])?${NOUN}\\b`, 'gi'),
    },
    {
        id: 'counted-set',
        cls: 'count',
        fragility: 'append',
        severity: 'high',
        // A count is wrong on its own terms once the set grows; linking to a
        // member does not make the number right. No link downgrade.
        keepWhenLinked: true,
        why: 'fixes the size of a set that grows by append',
        re: new RegExp(`\\b${NUM}[-\\s]${NOUN}\\b`, 'gi'),
    },
    {
        // Noun-then-number, the mirror image of counted-set: "Page 3 of this
        // chapter", "Page one built the path". Easy to miss when writing the
        // pattern (both earlier formulations did) and the densest real class
        // in this corpus — it hard-codes a sequence position in prose, which
        // is exactly the "numbered" half of CLAUDE.md's warning. Held at high
        // with no link downgrade for the same reason as counted-set: the
        // anchor still resolves after an insertion, but the number is wrong.
        //
        // APPEND-FRAGILE by worst case, per the two-class note at the top of
        // this file. A lone "Page 3 of this chapter" survives an append; the
        // chapter-recap shape this corpus actually carries does not, because
        // an enumeration of a chapter goes incomplete the moment a page lands
        // at the end. Read the sentence before acting on one of these.
        id: 'ordinal-label',
        cls: 'ordinal',
        fragility: 'append',
        severity: 'high',
        keepWhenLinked: true,
        why: 'hard-codes a sequence position by number — an enumeration goes incomplete on append, and every label shifts on insertion',
        re: new RegExp(`\\b(?:pages?|lessons?)\\s+(?:${NUM}|one)\\b`, 'gi'),
    },
    {
        // The in-chapter twin of terminal-ordinal, for the shape that has no
        // noun to match on: "this lesson is the last in this chapter" states
        // the same terminal claim as "the last page of this chapter", but
        // terminal-ordinal needs `last`/`final` ADJACENT to a sequence noun
        // and this shape puts "in this chapter" there instead.
        //
        // Split out of positional-in-chapter, which used to carry all three of
        // next / last / final under ONE hardcoded `fragility: 'insertion'`. A
        // terminal claim is not insertion-fragile — inserting mid-sequence
        // cannot change which page is last, while APPENDING falsifies it
        // immediately. Routing it to the insertion section put the exact
        // defect class this lint was commissioned for (PR #395's "close the
        // chapter from memory") under a blurb reading "stale only when a
        // lesson is inserted MID-SEQUENCE", which is false for it — the
        // one-label-two-meanings failure the append/insertion split exists to
        // remove, reproduced inside the split itself.
        //
        // `cls: 'terminal'` is load-bearing beyond the report heading: it
        // takes the rule OUT of ORDINAL_CLASSES, so landings no longer skip
        // it. That is choice 6a working as written — CLAUDE.md's landing
        // carve-out licenses ordinals, not terminal claims, and the claim that
        // motivated PR #395 shipped on a landing.
        id: 'terminal-in-chapter',
        cls: 'terminal',
        fragility: 'append',
        severity: 'high',
        why: 'names a final page — stale the moment a page is appended',
        re: /\b(?:last|final)\s+in\s+(?:this|the)\s+chapter\b/gi,
    },
    {
        id: 'positional-ordinal',
        cls: 'positional',
        fragility: 'insertion',
        severity: 'medium',
        why: 'fixes sequence position — stale on insertion (choice 1)',
        re: new RegExp(`\\bnext\\s+${NOUN}\\b`, 'gi'),
    },
    {
        // `next` only — see terminal-in-chapter above for why last / final
        // moved out. Every current hit of this rule is next-shaped, so the
        // split is a no-op on today's corpus and a correction on tomorrow's.
        id: 'positional-in-chapter',
        cls: 'positional',
        fragility: 'insertion',
        severity: 'medium',
        why: 'fixes sequence position — stale on insertion (choice 1)',
        re: /\bnext\s+in\s+(?:this|the)\s+chapter\b/gi,
    },
];

// The two provably-safe classes, subtracted per match (choices 2 + 3).
const SAFE = [
    // Opener claims — appending cannot change which page opened a chapter.
    /\b(?:opening|opener|first)\s+(?:\w+\s+){0,2}?(?:pages?|lessons?)\s+(?:of|in)\s+(?:this|the)\s+chapter\b/gi,
    /\bchapter(?:'s)?\s+(?:opening|opener)\b/gi,
    // Existence claims — assert a page exists, never where it sits.
    /\b(?:its|their)\s+own\s+(?:pages?|lessons?)\b/gi,
    /\ba\s+(?:page|lesson)\s+of\s+(?:its|their)\s+own\b/gi,
    /\bhas\s+(?:a|its)\s+own\s+(?:page|lesson)\b/gi,
];

function safeSpans(text) {
    const spans = [];
    for (const re of SAFE) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(text)) !== null) spans.push([m.index, m.index + m[0].length]);
    }
    return spans;
}

// True when the matched text sits inside an <a ...>…</a> in the raw window.
// Anchor-wrapped claims break on insertion only (the link still resolves),
// so they rank a step lower.
//
// The window passed in must be the SAME 2-line window the rules matched
// against, not the single line the match starts on. This corpus wraps opening
// tags across source lines constantly, so a claim whose <a is on the previous
// line scored linked:false and reported at the undowngraded severity —
// duct-static-control.html:370 is fully anchor-wrapped and was reported HIGH
// instead of MEDIUM. Masking preserves character counts line for line and both
// windows are joined with a single space, so offsets align between the masked
// text the rules see and the raw text this reads.
function isLinked(raw, start, end) {
    const re = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
    let m;
    while ((m = re.exec(raw)) !== null) {
        if (m.index <= start && m.index + m[0].length >= end) return true;
    }
    return false;
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

const RANK = { high: 0, medium: 1, low: 2 };

function lintFile(file) {
    const rel = path.relative(ROOT, file);
    const src = readFileSync(file, 'utf8');
    const raw = src.split('\n');
    const masked = maskFile(src).split('\n').map(maskLine);
    const findings = [];

    for (let i = 0; i < raw.length; i += 1) {
        // 2-line sliding window (choice 4). A match is reported only when it
        // STARTS on line i, so a claim fully inside one line is never also
        // reported by the previous window.
        const own = masked[i];
        const text = own + ' ' + (masked[i + 1] ?? '');
        // One line WIDER than the match window, on both sides. The rules only
        // ever match forward, but an anchor can OPEN on the line before the
        // one a match starts on — duct-static-control.html:370 is exactly that
        // shape, `<a` on 369 and the claim on 370 — so the link check needs a
        // look-behind the rule scan does not. `rawOffset` re-bases the match
        // offsets into this wider window.
        const rawBefore = i > 0 ? raw[i - 1] + ' ' : '';
        const rawOffset = rawBefore.length;
        const rawText = rawBefore + raw[i] + ' ' + (raw[i + 1] ?? '');
        const skip = safeSpans(text);

        for (const rule of RULES) {
            if (skipsClass(rel, rule.cls)) continue;
            rule.re.lastIndex = 0;
            let m;
            while ((m = rule.re.exec(text)) !== null) {
                const start = m.index;
                if (start >= own.length) continue;                       // starts on the next line
                if (skip.some(([a, b]) => start >= a && start < b)) continue;   // safe class

                const linked = isLinked(rawText, rawOffset + start, rawOffset + m.index + m[0].length);
                const severity = (!linked || rule.keepWhenLinked) ? rule.severity
                    : rule.severity === 'high' ? 'medium' : 'low';

                findings.push({
                    file: rel,
                    line: i + 1,
                    rule: rule.id,
                    class: rule.cls,
                    fragility: rule.fragility,
                    severity,
                    linked,
                    match: m[0].replace(/\s+/g, ' ').trim(),
                    why: rule.why,
                    start,
                    end: start + m[0].length,
                    context: text.slice(Math.max(0, start - 60), start + m[0].length + 60)
                        .replace(/\s+/g, ' ').trim(),
                });
            }
        }
    }

    // Rules overlap by design ("last three pages" is both terminal and a
    // count). Report the widest match on a given span once, rather than
    // making the reader reconcile two lines about the same words.
    return findings.filter((f, _, all) => !all.some((o) => o !== f
        && o.line === f.line
        && o.start <= f.start && o.end >= f.end
        && (o.end - o.start > f.end - f.start)));
}

const files = scanFiles(HTML_DIR);

// NOTE: there is no process.exit() below, deliberately. `console.log` to a
// PIPE is asynchronous — Node queues the write and `process.exit()` discards
// whatever has not drained yet. The --json mode emits one ~19 KB write, so
// piping it (`… --json | jq .`) truncated the document at the 8 KB pipe
// buffer and produced unparseable JSON, while redirecting to a file hid the
// bug entirely (writes to a file descriptor are synchronous). Falling off the
// end of the script lets the event loop flush every write first; the exit
// code is 0 regardless, because nothing here ever sets a failing one.

if (filesOnly) {
    for (const f of files) console.log(path.relative(ROOT, f));
} else {
    const all = files.flatMap(lintFile)
        .sort((a, b) => RANK[a.severity] - RANK[b.severity]
            || a.file.localeCompare(b.file)
            || a.line - b.line);

    // The two classes are split HERE and never re-joined. Nothing downstream
    // may add `appendFragile.length` to `insertionFragile.length` — see the
    // two-class note at the top of this file for why that number would be
    // meaningless. Both output modes below print two totals, never a third.
    const appendFragile = all.filter((f) => f.fragility === 'append');
    const insertionFragile = all.filter((f) => f.fragility === 'insertion');

    if (asJson) {
        // Deliberately NOT `{ findings: [...] }`. A single array's `.length`
        // IS a combined headline number, and a consumer reaching for it would
        // reintroduce exactly the conflation this split exists to prevent.
        console.log(JSON.stringify({
            scanned: files.length,
            appendFragile: { total: appendFragile.length, findings: appendFragile },
            insertionFragile: { total: insertionFragile.length, findings: insertionFragile },
        }, null, 2));
    } else {
        const section = (heading, blurb, findings) => {
            console.log(`══ ${heading} — ${findings.length} finding(s) ══`);
            console.log(`${blurb}\n`);
            let current = null;
            for (const f of findings) {
                if (f.severity !== current) {
                    current = f.severity;
                    console.log(`── ${current.toUpperCase()} ──`);
                }
                console.log(`${f.file}:${f.line}  [${f.class}${f.linked ? '/linked' : ''}]  "${f.match}"`);
                console.log(`    ${f.why}`);
                console.log(`    … ${f.context} …\n`);
            }
            if (!findings.length) console.log('(none)\n');
        };

        console.log('prose-lint — stale terminal/ordinal claims (REPORT-ONLY, never fails)');
        console.log(`Scanned ${files.length} file(s) under html/.`);
        console.log('Two classes, reported separately. They measure different risks and are');
        console.log('NEVER summed — there is deliberately no combined total below.\n');

        section(
            'APPEND-FRAGILE',
            'Stale when a lesson is appended to the END of a chapter — how this\n'
            + 'curriculum overwhelmingly grows. The high-priority class.',
            appendFragile,
        );
        section(
            'INSERTION-FRAGILE',
            'Stale only when a lesson is inserted MID-SEQUENCE. Rarer, but real —\n'
            + 'chapters do get lessons inserted. Tracked, ranked below append.',
            insertionFragile,
        );

        console.log('Legend:');
        console.log('  APPEND-FRAGILE classes');
        console.log('    terminal   — asserts a page is last or a chapter is closed.');
        console.log('    count      — fixes the size of an append-growing set. A count of');
        console.log('                 NEIGHBOURS ("two lessons on either side") is insertion-');
        console.log('                 only and files here anyway — read the sentence.');
        console.log('    ordinal    — hard-codes a page number; an enumeration of a chapter');
        console.log('                 goes incomplete on append. Placed by worst case — a lone');
        console.log('                 ordinal reference is insertion-only, so read the sentence.');
        console.log('  INSERTION-FRAGILE classes');
        console.log('    positional — fixes a page\'s place in sequence ("the next page").');
        console.log('  /linked    — the claim wraps an <a href> to the page it names; the link');
        console.log('               keeps resolving, so these are the likeliest dismissals.');
        console.log('\nSee the header of this file for every formulation choice and why.');
        console.log('Report-only by design — exiting 0.');
    }
}
