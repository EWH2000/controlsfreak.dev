// Node-side integrity tests for every quiz bank under
// html/_data/quizzes/. Same pattern as psychro-engine.spec.js — the
// Playwright runner's workers are Node processes, so these run under
// the one `npm test` with the `page` fixture unused.
//
// The banks are CommonJS data files with two consumers (the browser
// quiz engine and head.njk's FAQPage JSON-LD emitter). The engine
// validates at mount, but only the questions a given run draws — a
// malformed question in the back half of a bank can ship green. These
// checks mirror quiz-engine.js's runtime validator and add the id
// rules it doesn't enforce (kebab-case, uniqueness within the bank).

const fs   = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const BANK_DIR = path.join(__dirname, '..', 'html', '_data', 'quizzes');
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TYPES = ['mcq', 'tf', 'gotcha', 'numeric'];

const bankFiles = fs.readdirSync(BANK_DIR).filter(f => f.endsWith('.js')).sort();

// #335: the engine shuffles the answer choices (owner ruling
// 2026-11-27), so a question that points at a choice by its letter
// points at whatever happens to sit in that slot this time — "(b) is
// wrong because…" explains the wrong choice. Banks name a choice by what
// it says instead, and this returns one problem per reference that
// doesn't, so the failure can list them all.
//
// Deliberately narrow, because the banks are full of single letters
// that are not choices: RS-485 A and B terminals, comparator pins,
// subnet A and B, sheet A and B, Class B. A letter only counts when it
// is one of THIS question's choice ids AND it is either parenthesised
// ("(c)") or follows the word choice / option / answer / distractor
// ("Answer (c)", "choices b and c", "option D"). After one of those
// words a bare lowercase "a" is almost always the article — "never
// answers a Poll-For-Master" — so it only counts when what follows it
// cannot start a noun phrase: end of text, punctuation, or and / or /
// is / was / to / through. An apostrophe or hyphen after the letter
// makes it a name ("answer A's Who-Is"), not a choice.
//
// "All of the above" and kin only mean something inside choice text,
// and they break the same way under a shuffle, so that check runs on
// the choices alone. Positional phrasing ("the first three") is not
// matched — it has too many innocent uses to lint; the sweep that
// shipped with this caught those by hand.
const CHOICE_WORD_LETTER = /\b(?:choices?|options?|answers?|distractors?)\s+(\(?)([a-d])(\)?)(?![\w'’-])/gi;
const AFTER_BARE_A = /^(?:\s*$|\s*[.,;:!?)\]—–]|\s+(?:and|or|is|was|to|through)\b)/i;
const OF_THE_ABOVE = /\b(?:all|none|both|neither)\s+of\s+(?:the\s+)?(?:above|below|these|others)\b|\bthe\s+above\b(?![\w-])/gi;

function choiceLetterRefs(q) {
    const ids = new Set((q.choices || []).map(c => String(c && c.id).toLowerCase()));
    const fields = [['prompt', q.prompt], ['explain', q.explain], ['snippet', q.snippet]];
    for (const c of q.choices || []) fields.push([`choice ${c && c.id}`, c && c.text]);

    const problems = new Set();
    for (const [where, raw] of fields) {
        if (typeof raw !== 'string') continue;
        // Tags out entirely (not to a space), so "<em>(c)</em>" and
        // "(<em>c</em>)" both still read as "(c)".
        const text = raw.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');

        for (const m of text.matchAll(/\(([a-d])\)/gi)) {
            if (ids.has(m[1].toLowerCase())) problems.add(`${where}: "${m[0]}"`);
        }
        for (const m of text.matchAll(CHOICE_WORD_LETTER)) {
            const [hit, open, letter, close] = m;
            if (!ids.has(letter.toLowerCase())) continue;
            if (open && !close) continue;   // "answers (a direct …" — a parenthetical, not "(a)"
            const bare = !open && !close;
            if (bare && letter === 'a' && !AFTER_BARE_A.test(text.slice(m.index + hit.length))) continue;
            problems.add(`${where}: "${hit}"`);
        }
        if (where.startsWith('choice ')) {
            for (const m of text.matchAll(OF_THE_ABOVE)) problems.add(`${where}: "${m[0]}"`);
        }
    }
    return [...problems];
}

test('quiz bank directory is populated', () => {
    expect(bankFiles.length).toBeGreaterThan(0);
});

// The lint above passes vacuously the day its patterns stop matching —
// every bank is clean, so the per-bank tests can't tell a working lint
// from a broken one. Feed it the shapes it exists for, plus the
// innocent look-alikes that live in the banks today.
test('choice-letter lint still bites (anti-vacuity, #335)', () => {
    const choices = [
        { id: 'a', text: 'One.' },
        { id: 'b', text: 'Two.', correct: true },
        { id: 'c', text: 'Three.' },
        { id: 'd', text: 'Four.' },
    ];
    const withLast = text => choices.slice(0, 3).concat({ id: 'd', text });
    const make = fields => ({ id: 'synthetic', type: 'mcq', prompt: 'P?', explain: 'E.', choices, ...fields });

    const bad = [
        { explain: 'Answer (c) is exactly backwards.' },
        { explain: 'Note that (d) is false in a useful way.' },
        { explain: 'Calibration drift <strong>(A)</strong> is small.' },
        { explain: 'Answers b and c describe a pressure-dependent box.' },
        { explain: 'Distractor (b) has a grain of truth.' },
        { explain: 'The choices a and c both miss it.' },
        { explain: 'Pick answer a.' },
        { prompt: 'Is option D or the rest right?' },
        { snippet: '<pre class="quiz-snippet">see (b)</pre>' },
        { choices: withLast('All of the above.') },
        { choices: withLast('None of these.') },
        { choices: withLast('Both of the others.') },
        { choices: withLast('Neither of the above.') },
        { choices: withLast('The above, but only in winter.') },
    ];
    const good = [
        { prompt: 'Landing A-to-A and B-to-B down the trunk is always safe.' },
        { explain: 'A Class B device rides a 4–20 mA loop.' },
        { explain: 'Most controllers offer this as a configuration option, and the answer comes back impossible.' },
        { explain: 'It never answers a Poll-For-Master; the replies that answer A\'s Who-Is never return.' },
        { explain: 'A footnote marked (e) is no choice here.' },
        { choices: withLast('There is no state 0 — the OCCUPIED write fails, and the other two land one state low.') },
        // "(d)" only counts when the question HAS a choice d.
        { choices: choices.slice(0, 3), explain: 'Part (d) of the standard applies.' },
    ];
    for (const fields of bad) {
        expect(choiceLetterRefs(make(fields)), `should flag ${JSON.stringify(fields)}`).not.toEqual([]);
    }
    for (const fields of good) {
        expect(choiceLetterRefs(make(fields)), `should pass ${JSON.stringify(fields)}`).toEqual([]);
    }
});

for (const file of bankFiles) {
    test(`bank integrity — ${file}`, () => {
        const bank = require(path.join(BANK_DIR, file));
        expect(Array.isArray(bank), `${file} must export an array`).toBe(true);
        expect(bank.length, `${file} must not be empty`).toBeGreaterThan(0);

        const ids = new Set();
        for (const q of bank) {
            expect(TYPES, `${file}: unknown type on ${q.id}`).toContain(q.type);
            expect(q.id, `${file}: ids are kebab-case`).toMatch(KEBAB);
            expect(ids.has(q.id), `${file}: duplicate id ${q.id}`).toBe(false);
            ids.add(q.id);
            expect(typeof q.prompt, `${file}/${q.id}: prompt`).toBe('string');
            expect(typeof q.explain, `${file}/${q.id}: explain`).toBe('string');

            // #335 — see choiceLetterRefs() above.
            expect(choiceLetterRefs(q), `${file}/${q.id}: name the choice by what it says — the engine shuffles choices, so a letter or "of the above" points at the wrong one (#335)`).toEqual([]);

            // `figure` is an element id, never markup — the whole point
            // of the field is that the SVG stays in page source and out
            // of the two consumers that strip questions to text. The
            // engine also proves the id resolves at mount; that half
            // needs a DOM, so it lives in quiz-figure.spec.js.
            if (q.figure !== undefined) {
                expect(typeof q.figure, `${file}/${q.id}: figure is an id string`).toBe('string');
                expect(q.figure, `${file}/${q.id}: figure ids are kebab-case`).toMatch(KEBAB);
                expect(q.figure.includes('<'), `${file}/${q.id}: figure carries no markup`).toBe(false);
            }

            // #185: `snippet` is gotcha-only, and the invariant must
            // hold in BOTH directions. The engine checks one — a gotcha
            // without a snippet fails the mount — but a snippet on any
            // other type is silently dropped by the render guard
            // (`q.type === 'gotcha' && q.snippet`) while head.njk's
            // FAQPage emitter still concatenates it into the JSON-LD
            // Question.name: content the page never renders ships as
            // structured data with no warning anywhere. Mirrors the
            // resolution-check philosophy `figure` shipped with — a
            // declared field must never silently no-op.
            if (q.type !== 'gotcha') {
                expect(q.snippet, `${file}/${q.id}: snippet on a non-gotcha — rendered never, published to JSON-LD always (#185)`).toBeUndefined();
            }

            if (q.type === 'mcq' || q.type === 'gotcha') {
                expect(Array.isArray(q.choices), `${file}/${q.id}: choices`).toBe(true);
                expect(q.choices.length, `${file}/${q.id}: ≥2 choices`).toBeGreaterThanOrEqual(2);
                const correct = q.choices.filter(c => c && c.correct === true);
                expect(correct.length, `${file}/${q.id}: exactly one correct choice`).toBe(1);
                // #117: every choice needs a truthy id + text, unique within
                // the question — reveal()/submit() match by data-choice-id,
                // so a duplicate id mis-marks the miss and a missing text
                // renders the literal 'undefined'. Mirrors the runtime
                // validateQuestion() check added in the same pass.
                const choiceIds = new Set();
                for (const c of q.choices) {
                    expect(Boolean(c && c.id), `${file}/${q.id}: every choice has an id`).toBe(true);
                    expect(Boolean(c && c.text), `${file}/${q.id}: choice ${c && c.id} has text`).toBe(true);
                    expect(choiceIds.has(c.id), `${file}/${q.id}: duplicate choice id ${c.id}`).toBe(false);
                    choiceIds.add(c.id);
                }
                if (q.type === 'gotcha') {
                    expect(typeof q.snippet, `${file}/${q.id}: gotcha snippet`).toBe('string');
                }
            } else if (q.type === 'tf') {
                expect(typeof q.answer, `${file}/${q.id}: tf boolean answer`).toBe('boolean');
            } else if (q.type === 'numeric') {
                expect(Number.isFinite(q.answer), `${file}/${q.id}: finite answer`).toBe(true);
                expect(Number.isFinite(q.tolerance), `${file}/${q.id}: finite tolerance`).toBe(true);
                expect(q.tolerance, `${file}/${q.id}: tolerance ≥ 0`).toBeGreaterThanOrEqual(0);
            }
        }
    });
}
