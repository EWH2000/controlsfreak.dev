// Guards for quiz-engine.js's NUMERIC answer box — what a reader may
// type, how it is read, and how it is graded.
//
// Why this file exists: the box used to be <input type="number"> read
// with parseFloat, and a number input parses by the BROWSER's own locale.
// Measured 2026-11-27 in headless Chromium, a bare number input, real
// keystrokes: an English-locale browser turns a typed "61,6" into 616
// and reads "10.000" as 10; one running under a German process locale
// turns "10,000" into 10. The box is now a text input read by
// Quiz.parseNumericInput, which gives every entry ONE reading. The only
// shape the keystrokes cannot settle — 1-3 digits, one separator,
// exactly three digits ("10,000", "47.808") — is read by the browser's
// number convention, and the reveal says how it was read.
//
// A first pass at this change gave that shape TWO readings and graded
// correct if either was in tolerance. Against the shipped banks that
// marked realistic unit slips right — "5,000" on a 5-ton answer, "44.444"
// on a 44,444 lb/h answer — which the old engine graded wrong. Both are
// pinned WRONG below.
//
// What the harness can and cannot show. Playwright's `locale` DOES
// change `new Intl.NumberFormat()`'s default (it formats 1234.5 as
// "1.234,5" under de-DE — asserted below), which is what the engine
// reads its decimal mark from. It does NOT change how a native number
// input parses, so no test here can reproduce the German half of the old
// defect ("10,000" becoming 10); the de-DE block pins the new engine's
// reading for a German-locale browser, nothing more.
//
// Every grading test types REAL keystrokes (pressSequentially), never
// .fill(): it is what a reader does, and on the old number input .fill()
// refuses text outright, which would make a test fail for a harness
// reason instead of measuring the engine.
//
// Same approach as quiz-choice-shuffle.spec.js: drive the BUILT engine
// on a real practice page (which already loads /scripts/quiz-engine.js)
// and mount fixture banks with window.Quiz.mount — here into a scratch
// target inside the host page's own `.tool-card .tool-body`, beside its
// #quiz, so `.tool-body p` and the card's surface are in force exactly
// as they are on every shipped quiz. Fixtures mount with no defaultCount
// and the default 'sequential' order, so buildQueue() never draws and a
// run presents the fixture questions in the order given.

const { test, expect } = require('@playwright/test');

const HOST_PAGE = '/practice/modbus-decoding.html';
const SLUG      = 'qni-fixture';
const MOUNT_ID  = 'qni-fixture-mount';
const HOST      = '#' + MOUNT_ID;
const HINT_ID   = 'quiz-' + SLUG + '-numeric-hint';
const HINT_TEXT = 'Enter a number, like 1250 or 12.5.';

const READ = {
    commaGroup:    'The comma in your entry was read as a thousands separator.',
    commaDecimal:  'The comma in your entry was read as a decimal point.',
    periodGroup:   'The period in your entry was read as a thousands separator.',
    periodDecimal: 'The period in your entry was read as a decimal point.',
};

function numeric(id, answer, tolerance, extra) {
    return Object.assign({
        type: 'numeric',
        id: id,
        prompt: 'Fixture: what value is ' + answer + '?',
        explain: 'Fixture explanation for ' + id + '.',
        answer: answer,
        tolerance: tolerance
    }, extra || {});
}

// Shapes the shipped banks carry: the 10k thermistor (10000 ± 300), the
// BACnet/IP port (47808 exact, numeric keypad), the Boston mixed-air
// temperature (61.6 ± 0.5), the 060 tonnage (5 ± 0.1 tons) and the coil
// mass flow (44444 ± 250 lb/h).
const Q_10K   = numeric('qni-ten-k', 10000, 300, { unit: 'Ω' });
const Q_616   = numeric('qni-sixty-one-six', 61.6, 0.5, { unit: '°F' });
const Q_95    = numeric('qni-nine-five', 9.5, 0);
const Q_125   = numeric('qni-twelve-five', 12.5, 0);
const Q_PORT  = numeric('qni-port', 47808, 0, { inputmode: 'numeric' });
const Q_TONS  = numeric('qni-tons', 5, 0.1, { unit: 'tons' });
const Q_MASS  = numeric('qni-mass-flow', 44444, 250, { unit: 'lb/h' });

async function openHost(page) {
    await page.goto(HOST_PAGE);
    // The host page's own quiz focuses in a setTimeout(0) at boot; one
    // more tick lets that land before a fixture mount schedules its own
    // focus (same reasoning as quiz-choice-shuffle.spec.js).
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
}

async function cleanUp(page) {
    await page.evaluate(({ slug, mountId }) => {
        const host = document.getElementById(mountId);
        if (host) host.remove();
        try {
            Object.keys(localStorage)
                .filter((k) => k.indexOf('cf_quiz_' + slug + '_') === 0)
                .forEach((k) => localStorage.removeItem(k));
        } catch (_) { /* opaque origin after a failed navigation */ }
    }, { slug: SLUG, mountId: MOUNT_ID });
}

// Mount a fixture bank where every shipped quiz lives: inside the host
// page's .tool-card .tool-body, after its own #quiz.
async function mountFixture(page, questions) {
    return page.evaluate(({ qs, slug, mountId }) => {
        const prior = document.getElementById(mountId);
        if (prior) prior.remove();
        const own = document.getElementById('quiz');
        const body = own && own.closest('.tool-card .tool-body');
        if (!body) return false;
        const host = document.createElement('div');
        host.id = mountId;
        body.appendChild(host);
        return Boolean(window.Quiz.mount('#' + mountId, qs, { slug: slug }));
    }, { qs: questions, slug: SLUG, mountId: MOUNT_ID });
}

const box      = (page) => page.locator(`${HOST} .quiz-numeric-input`);
const hint     = (page) => page.locator(`${HOST} .quiz-numeric-hint`);
const submit   = (page) => page.locator(`${HOST} .quiz-action-primary`);
const skip     = (page) => page.locator(`${HOST} .quiz-action-secondary`);
const status   = (page) => page.locator(`${HOST} .quiz-reveal-status`);
const readLine = (page) => page.locator(`${HOST} .quiz-reveal-read`);
const reveal   = (page) => page.locator(`${HOST} .quiz-reveal`);

// Mount one question, type `typed` into the box key by key, submit, and
// return the reveal's status line plus the read line (null when absent).
async function grade(page, question, typed) {
    expect(await mountFixture(page, [question])).toBe(true);
    await box(page).pressSequentially(typed);
    await expect(submit(page), `"${typed}" should be submittable`).toBeEnabled();
    await submit(page).click();
    await expect(status(page)).not.toHaveText('');
    const verdict = await status(page).textContent();
    await expect(page.locator(`${HOST} .quiz-numeric`))
        .toHaveClass(verdict === 'Correct.' ? /\bcorrect\b/ : /\bwrong\b/);
    const read = (await readLine(page).count()) ? await readLine(page).textContent() : null;
    return { status: verdict, read: read };
}

// The hint must never so much as flash while a number is typed. A
// per-key `toBeHidden()` cannot see a show-then-hide inside one event,
// and neither can an observer that inspects the state once its callback
// runs, so this one reads the mutation RECORDS: the engine writes the
// hint's text only on its hidden → shown edge, and aria-invalid going
// from absent to present is an attribute record whose oldValue is null.
// Either one, from now until readFlashes(), is a flash.
async function watchFlashes(page) {
    await page.evaluate((sel) => {
        const host = document.querySelector(sel);
        const hintEl = host.querySelector('.quiz-numeric-hint');
        const input = host.querySelector('.quiz-numeric-input');
        const flashes = [];
        const take = (records) => records.forEach((r) => {
            if (r.target === hintEl && r.type === 'childList' && r.addedNodes.length) {
                flashes.push('hint text written at "' + input.value + '"');
            }
            if (r.target === input && r.attributeName === 'aria-invalid' && r.oldValue === null) {
                flashes.push('aria-invalid set at "' + input.value + '"');
            }
        });
        const observer = new MutationObserver(take);
        observer.observe(hintEl, { childList: true });
        observer.observe(input, { attributes: true, attributeFilter: ['aria-invalid'], attributeOldValue: true });
        window.__qniStopWatch = () => {
            take(observer.takeRecords());
            observer.disconnect();
            return flashes;
        };
    }, HOST);
}
async function readFlashes(page) {
    return page.evaluate(() => window.__qniStopWatch());
}

// Type one character at a time, asserting after EACH key that the hint
// is hidden, aria-invalid is absent, and Submit is disabled — except
// after the keys listed in `validAfter`, where Submit must be enabled.
async function typeQuietly(page, text, validAfter) {
    for (let i = 0; i < text.length; i++) {
        await box(page).pressSequentially(text[i]);
        const sofar = text.slice(0, i + 1);
        await expect(hint(page), `no hint at "${sofar}"`).toBeHidden();
        await expect(box(page), `no aria-invalid at "${sofar}"`).not.toHaveAttribute('aria-invalid', /.*/);
        if (validAfter && validAfter.includes(sofar)) {
            await expect(submit(page), `"${sofar}" is a number`).toBeEnabled();
        } else {
            await expect(submit(page), `"${sofar}" is not a number yet`).toBeDisabled();
        }
    }
}

// Measure an element's ink against its backdrop in one theme, the way
// contrast-sweep.spec.js does: opacity composited up the chain, backdrop
// found by walking out to the first opaque background. Also resolves the
// PAGE's --surface (a probe styled with it, appended to <body>) so a test
// can prove the backdrop is the card surface the line ships on, and
// optionally reads another element's computed colour for comparison.
async function measureInk(page, sel, theme, compareSel) {
    return page.evaluate(async ({ sel, theme, compareSel }) => {
        document.documentElement.dataset.theme = theme;
        const el = document.querySelector(sel);
        const chain = [];
        for (let n = el; n; n = n.parentElement) chain.push(n);
        // Let the card's entrance fade and any theme transition on the
        // chain finish first — both move opacity or colour. (An endless
        // animation would never finish; none sits on this chain, and
        // one that did would be skipped rather than hang the test.)
        await Promise.all(document.getAnimations()
            .filter((a) => chain.includes(a.effect && a.effect.target) &&
                a.effect.getComputedTiming().endTime !== Infinity)
            .map((a) => a.finished.catch(() => null)));

        const parse = (s) => {
            const m = /rgba?\(([^)]+)\)/.exec(s || '');
            if (!m) return null;
            const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
            if (p.length < 3 || p.some((n) => !isFinite(n))) return null;
            return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
        };
        const over = (fg, bg) => ({
            r: fg.r * fg.a + bg.r * (1 - fg.a),
            g: fg.g * fg.a + bg.g * (1 - fg.a),
            b: fg.b * fg.a + bg.b * (1 - fg.a),
            a: 1,
        });
        const lum = (c) => {
            const f = (v) => {
                const s = v / 255;
                return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
            };
            return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
        };
        const ratio = (a, b) => {
            const la = lum(a), lb = lum(b);
            return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
        };
        const hex = (c) => '#' + [c.r, c.g, c.b]
            .map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

        let opacity = 1;
        for (const n of chain) opacity *= parseFloat(getComputedStyle(n).opacity);
        const layers = [];
        for (const n of chain) {
            const bg = parse(getComputedStyle(n).backgroundColor);
            if (bg && bg.a > 0) { layers.push(bg); if (bg.a >= 1) break; }
        }
        let backdrop = { r: 255, g: 255, b: 255, a: 1 };
        for (let i = layers.length - 1; i >= 0; i--) backdrop = over(layers[i], backdrop);
        const inkRaw = parse(getComputedStyle(el).color);
        const ink = over(Object.assign({}, inkRaw, { a: inkRaw.a * opacity }), backdrop);

        const probe = document.createElement('div');
        probe.style.transition = 'none';
        probe.style.backgroundColor = 'var(--surface)';
        document.body.appendChild(probe);
        const surface = parse(getComputedStyle(probe).backgroundColor);
        probe.remove();

        const cmp = compareSel ? document.querySelector(compareSel) : null;
        return {
            applied: document.documentElement.getAttribute('data-theme'),
            inToolBody: Boolean(el.closest('.tool-card .tool-body')),
            sanity: ratio({ r: 255, g: 255, b: 255, a: 1 }, { r: 0, g: 0, b: 0, a: 1 }),
            ratio: ratio(ink, backdrop),
            ink: hex(ink),
            backdrop: hex(backdrop),
            surface: hex(surface),
            color: getComputedStyle(el).color,
            compareColor: cmp ? getComputedStyle(cmp).color : null,
            fontSize: parseFloat(getComputedStyle(el).fontSize),
        };
    }, { sel, theme, compareSel: compareSel || null });
}

test.describe('quiz engine — numeric answer box', () => {

    test.beforeEach(async ({ page }) => { await openHost(page); });
    test.afterEach(async ({ page }) => { await cleanUp(page); });

    // ── The parser ───────────────────────────────────────────────────
    // [typed, value]: a value of null means no reading. Every row here
    // is independent of the decimal mark, so each is checked under BOTH
    // '.' and ',' — and each reports ambiguous: false with no sep/readAs.
    const GRAMMAR = [
        // Not a number at all → no reading.
        ['', null],
        ['   ', null],
        ['abc', null],
        ['12abc', null],
        ['1e3', null],               // no exponent: letters are not in the grammar
        ['-', null],                 // a sign with no digit
        ['+', null],
        ['.', null],                 // separators with no digit
        [',', null],
        ['.,', null],
        ['+-5', null],               // ONE optional sign
        ['5-', null],                // leading only
        ["10'000", null],            // apostrophe grouping is not in the grammar
        // No separator → the digits; signs.
        ['1000', 1000],
        ['007', 7],
        ['+12', 12],
        ['-12', -12],
        ['-0', 0],                   // never -0 (checked separately below)
        ['−5', -5],             // U+2212 MINUS SIGN reads as '-'
        // One kind, once, not the ambiguous shape → a decimal mark,
        // digits on at least one side.
        ['12.5', 12.5],
        ['12,5', 12.5],
        ['61,6', 61.6],
        ['.5', 0.5],
        [',5', 0.5],
        ['5.', 5],
        ['5,', 5],
        ['0,500', 0.5],              // leading 0: never the ambiguous shape
        ['0.500', 0.5],
        ['1234,567', 1234.567],      // four digits in front: not ambiguous
        ['12.5000', 12.5],           // four digits behind: not ambiguous
        ['10,00', 10],               // two digits behind: not ambiguous
        // One kind, twice or more → grouping, and it must be well formed.
        ['1,000,000', 1000000],
        ['1.000.000', 1000000],
        ['1,2,3', null],
        ['1.2.3', null],
        ['1,000,0', null],
        ['1,0000,000', null],
        // Both kinds → the LAST is the decimal mark (once); the other
        // groups the integer part in well-formed threes.
        ['10,000.5', 10000.5],
        ['10.000,5', 10000.5],
        ['1,234,567.89', 1234567.89],
        ['1.234.567,89', 1234567.89],
        ['10,000.', 10000],
        ['1,2,3.4', null],           // integer part not in groups of three
        ['10000,000.5', null],
        ['1.2,3.4', null],           // the last kind occurs twice
        ['1.000,5,5', null],
        // NFKC: full-width digits, separators and minus become ASCII.
        ['１２．５', 12.5],
        ['－５', -5],
        // Whitespace (including the no-break family) is removed, so it
        // works as grouping.
        ['10 000', 10000],
        ['10 000', 10000],      // NO-BREAK SPACE
        ['10 000', 10000],      // NARROW NO-BREAK SPACE (French grouping)
        ['10 000', 10000],      // THIN SPACE
        ['  12.5  ', 12.5],
        ['1 000,5', 1000.5],
    ];

    test('parseNumericInput reads every grammar rule the same under either mark', async ({ page }) => {
        const results = await page.evaluate((rows) => {
            const out = [];
            for (const [typed] of rows) {
                for (const mark of ['.', ',']) {
                    const r = window.Quiz.parseNumericInput(typed, mark);
                    out.push({
                        typed, mark,
                        isNull: r === null,
                        keys: r && typeof r === 'object' ? Object.keys(r).sort() : null,
                        value: r ? r.value : null,
                        ambiguous: r ? r.ambiguous : null,
                        negZero: r ? Object.is(r.value, -0) : false,
                    });
                }
            }
            return out;
        }, GRAMMAR);
        const want = new Map(GRAMMAR.map(([typed, value]) => [typed, value]));
        for (const r of results) {
            const label = `parseNumericInput(${JSON.stringify(r.typed)}, '${r.mark}')`;
            const value = want.get(r.typed);
            if (value === null) {
                expect(r.isNull, `${label} has no reading`).toBe(true);
                continue;
            }
            expect(r.keys, `${label} is { value, ambiguous } only`).toEqual(['ambiguous', 'value']);
            expect(r.value, label).toBe(value);
            expect(r.ambiguous, `${label} is not ambiguous`).toBe(false);
            expect(r.negZero, `${label} is not -0`).toBe(false);
        }
    });

    // The one shape the keystrokes cannot settle — optional sign, 1-3
    // digits not starting with 0, ONE separator, exactly three digits —
    // read by the mark it is given: that mark is a decimal point, the
    // other separator a thousands separator.
    // [typed, mark, value, sep, readAs]
    const AMBIGUOUS = [
        ['10,000', '.', 10000, ',', 'group'],
        ['10,000', ',', 10, ',', 'decimal'],
        ['10.000', '.', 10, '.', 'decimal'],
        ['10.000', ',', 10000, '.', 'group'],
        ['1,000', '.', 1000, ',', 'group'],
        ['1,000', ',', 1, ',', 'decimal'],
        ['47.808', '.', 47.808, '.', 'decimal'],
        ['47.808', ',', 47808, '.', 'group'],
        ['999.999', '.', 999.999, '.', 'decimal'],
        ['999,999', '.', 999999, ',', 'group'],
        ['5,000', '.', 5000, ',', 'group'],
        ['5,000', ',', 5, ',', 'decimal'],
        ['44.444', '.', 44.444, '.', 'decimal'],
        ['44.444', ',', 44444, '.', 'group'],
        ['-10,000', '.', -10000, ',', 'group'],
        ['+10,000', ',', 10, ',', 'decimal'],
        ['−10.000', '.', -10, '.', 'decimal'],
        ['１０，０００', '.', 10000, ',', 'group'],   // full-width "10,000"
        ['1,000 ', ',', 1, ',', 'decimal'],                                   // trailing space removed first
    ];

    test('parseNumericInput reads the ambiguous shape by the mark it is given', async ({ page }) => {
        const results = await page.evaluate((rows) => rows.map(([typed, mark]) => {
            const r = window.Quiz.parseNumericInput(typed, mark);
            return r && { keys: Object.keys(r).sort(), value: r.value, ambiguous: r.ambiguous, sep: r.sep, readAs: r.readAs };
        }), AMBIGUOUS);
        AMBIGUOUS.forEach(([typed, mark, value, sep, readAs], i) => {
            const label = `parseNumericInput(${JSON.stringify(typed)}, '${mark}')`;
            expect(results[i], `${label} has a reading`).not.toBeNull();
            expect(results[i].keys, label).toEqual(['ambiguous', 'readAs', 'sep', 'value']);
            expect(results[i].value, label).toBe(value);
            expect(results[i].ambiguous, label).toBe(true);
            expect(results[i].sep, label).toBe(sep);
            expect(results[i].readAs, label).toBe(readAs);
        });
    });

    test('with no mark given, the browser decides: en-US reads "10,000" as ten thousand', async ({ page }) => {
        const r = await page.evaluate(() => ({
            decimal: new Intl.NumberFormat().formatToParts(1.5).find((p) => p.type === 'decimal').value,
            comma: window.Quiz.parseNumericInput('10,000'),
            period: window.Quiz.parseNumericInput('10.000'),
        }));
        expect(r.decimal, 'this context formats numbers English-style').toBe('.');
        expect(r.comma).toEqual({ value: 10000, ambiguous: true, sep: ',', readAs: 'group' });
        expect(r.period).toEqual({ value: 10, ambiguous: true, sep: '.', readAs: 'decimal' });
    });

    // A mount asks Intl once; neither a keystroke nor the grading asks
    // again. Proven by swapping in an Intl that reports a German comma
    // AFTER the mount: the mount still reads by the '.' it asked for, and
    // the stub is never called.
    test('the decimal mark is asked once per mount, not per keystroke', async ({ page }) => {
        expect(await mountFixture(page, [Q_10K])).toBe(true);
        await page.evaluate(() => {
            const Real = Intl.NumberFormat;
            window.__qniRealNF = Real;
            window.__qniNFCalls = 0;
            Intl.NumberFormat = function () {
                window.__qniNFCalls++;
                return { formatToParts: () => [{ type: 'integer', value: '1' }, { type: 'decimal', value: ',' }, { type: 'fraction', value: '5' }] };
            };
        });
        try {
            await box(page).pressSequentially('10,000');
            await expect(submit(page)).toBeEnabled();
            await submit(page).click();
            await expect(status(page)).toHaveText('Correct.');
            await expect(readLine(page)).toHaveText(READ.commaGroup);
            expect(await page.evaluate(() => window.__qniNFCalls), 'Intl.NumberFormat calls after mount').toBe(0);
        } finally {
            await page.evaluate(() => { Intl.NumberFormat = window.__qniRealNF; });
        }
    });

    // ── Grading, real keystrokes ─────────────────────────────────────

    test('ten thousand: "10000", "10,000", "10 000" correct — "10.000" is ten, wrong', async ({ page }) => {
        for (const typed of ['10000', '10,000', '10 000']) {
            expect((await grade(page, Q_10K, typed)).status, `"${typed}" on 10000 ± 300`).toBe('Correct.');
        }
        expect((await grade(page, Q_10K, '10.000')).status, '"10.000" on 10000 ± 300').toBe('Not quite.');
    });

    test('a decimal comma or point: "61,6" and "61.6" on 61.6, "9,5" on 9.5', async ({ page }) => {
        // "61,6" is the old engine's 616.
        expect((await grade(page, Q_616, '61,6')).status, '"61,6" on 61.6 ± 0.5').toBe('Correct.');
        expect((await grade(page, Q_616, '61.6')).status, '"61.6" on 61.6 ± 0.5').toBe('Correct.');
        expect((await grade(page, Q_95, '9,5')).status, '"9,5" on 9.5 exact').toBe('Correct.');
    });

    test('an exact answer: "47,808" correct, "47.808" wrong', async ({ page }) => {
        expect((await grade(page, Q_PORT, '47,808')).status, '"47,808" on 47808 exact').toBe('Correct.');
        expect((await grade(page, Q_PORT, '47.808')).status, '"47.808" on 47808 exact').toBe('Not quite.');
    });

    // REGRESSIONS the first pass would have shipped. Its two-readings
    // rule graded both of these CORRECT; the old engine, and this one,
    // grade them wrong. "5,000" is 60,000 / 12 with the BTU-to-ton
    // conversion forgotten, on the 060 tonnage question (answer 5 tons);
    // "44.444" is the mass flow keyed for 10 CFM instead of 10,000, on
    // the coil mass-flow question (answer 44,444 lb/h). A quiz must not
    // start marking unit slips correct. Grading only, deliberately: each
    // test passes on the old engine and fails on the first pass, which is
    // exactly the regression (the read line is the read-line tests' job).
    // Two tests, not one, so neither slip hides behind the other's
    // failure.
    test('unit slip stays wrong: "5,000" on the 5-ton answer', async ({ page }) => {
        expect((await grade(page, Q_TONS, '5,000')).status, '"5,000" on 5 ± 0.1 tons').toBe('Not quite.');
    });

    test('unit slip stays wrong: "44.444" on the 44,444 lb/h answer', async ({ page }) => {
        expect((await grade(page, Q_MASS, '44.444')).status, '"44.444" on 44444 ± 250 lb/h').toBe('Not quite.');
    });

    // ── The read line ────────────────────────────────────────────────

    test('an ambiguous entry graded RIGHT says how it was read, before the explanation', async ({ page }) => {
        const r = await grade(page, Q_10K, '10,000');
        expect(r.status).toBe('Correct.');
        expect(r.read).toBe(READ.commaGroup);
        const order = await page.evaluate((sel) => [...document.querySelector(sel).children]
            .map((n) => n.className), `${HOST} .quiz-reveal`);
        expect(order).toEqual(['quiz-reveal-status', 'quiz-reveal-right quiz-reveal-read', 'quiz-reveal-explain']);
    });

    test('an ambiguous entry graded WRONG says how it was read, before "Right answer"', async ({ page }) => {
        const r = await grade(page, Q_10K, '10.000');
        expect(r.status).toBe('Not quite.');
        expect(r.read).toBe(READ.periodDecimal);
        const order = await page.evaluate((sel) => [...document.querySelector(sel).children]
            .map((n) => n.className), `${HOST} .quiz-reveal`);
        expect(order).toEqual(['quiz-reveal-status', 'quiz-reveal-right quiz-reveal-read',
            'quiz-reveal-right', 'quiz-reveal-explain']);
        await expect(page.locator(`${HOST} .quiz-reveal-right:not(.quiz-reveal-read)`))
            .toHaveText('Right answer: 10000 Ω');
    });

    test('no read line for an unambiguous entry, or after a Skip', async ({ page }) => {
        expect(await grade(page, Q_10K, '10000')).toEqual({ status: 'Correct.', read: null });
        expect(await grade(page, Q_125, '12.5')).toEqual({ status: 'Correct.', read: null });
        expect(await grade(page, Q_616, '61,6')).toEqual({ status: 'Correct.', read: null });

        expect(await mountFixture(page, [Q_10K])).toBe(true);
        await box(page).pressSequentially('10,000');
        await expect(submit(page)).toBeEnabled();
        await skip(page).click();
        await expect(status(page)).toHaveText('Skipped.');
        await expect(readLine(page)).toHaveCount(0);
    });

    // ── The format hint ──────────────────────────────────────────────

    test('"12abc" shows the hint with aria-invalid; Submit stays disabled', async ({ page }) => {
        expect(await mountFixture(page, [Q_10K])).toBe(true);
        await expect(box(page)).toHaveAttribute('aria-describedby', HINT_ID);
        await expect(hint(page)).toHaveAttribute('id', HINT_ID);
        await expect(hint(page)).toHaveAttribute('aria-live', 'polite');
        await expect(hint(page)).toBeHidden();
        await expect(hint(page)).toHaveText('');
        expect(await hint(page).evaluate((n) => n.parentElement.classList.contains('quiz-numeric')),
            'the hint lives in the numeric row').toBe(true);

        await box(page).pressSequentially('12abc');
        await expect(box(page), 'what the reader typed is left alone').toHaveValue('12abc');
        await expect(submit(page)).toBeDisabled();
        await expect(hint(page)).toBeVisible();
        await expect(hint(page)).toHaveText(HINT_TEXT);
        await expect(box(page)).toHaveAttribute('aria-invalid', 'true');

        await box(page).fill('');
        await expect(hint(page)).toBeHidden();
        await expect(hint(page)).toHaveText('');
        await expect(box(page)).not.toHaveAttribute('aria-invalid', /.*/);
        await expect(submit(page)).toBeDisabled();
    });

    test('typing ".9" one key at a time never shows the hint', async ({ page }) => {
        expect(await mountFixture(page, [Q_95])).toBe(true);
        await watchFlashes(page);
        await typeQuietly(page, '.9', ['.9']);
        expect(await readFlashes(page), 'the hint never flashed').toEqual([]);
    });

    test('a number not yet finished keeps Submit disabled with no hint', async ({ page }) => {
        expect(await mountFixture(page, [Q_10K])).toBe(true);
        for (const entry of ['-', '.', ',', '+', '1,000,0', '1.2.3']) {
            await box(page).fill('');
            await watchFlashes(page);
            await typeQuietly(page, entry, entry === '1,000,0' ? ['1', '1,', '1,0', '1,00', '1,000'] : ['1', '1.', '1.2']);
            expect(await readFlashes(page), `no flash typing "${entry}"`).toEqual([]);
        }
    });

    test('"1.2.3" stays quiet until Enter, then the hint shows; the next keys clear it', async ({ page }) => {
        expect(await mountFixture(page, [Q_10K])).toBe(true);
        await typeQuietly(page, '1.2.3', ['1', '1.', '1.2']);

        await box(page).press('Enter');
        await expect(hint(page), 'Enter on a non-number shows the hint').toBeVisible();
        await expect(hint(page)).toHaveText(HINT_TEXT);
        await expect(box(page)).toHaveAttribute('aria-invalid', 'true');
        await expect(reveal(page), 'nothing was submitted').toBeEmpty();
        await expect(box(page)).toBeEnabled();

        await box(page).press('Backspace');   // "1.2." — still no number
        await expect(box(page)).toHaveValue('1.2.');
        await expect(hint(page), 'the next input re-evaluates by rule (a)').toBeHidden();
        await expect(box(page)).not.toHaveAttribute('aria-invalid', /.*/);
        await expect(submit(page)).toBeDisabled();

        await box(page).press('Backspace');   // "1.2"
        await expect(submit(page)).toBeEnabled();
        await expect(hint(page)).toBeHidden();
    });

    test('a whitespace-only entry is empty, not invalid — even on Enter', async ({ page }) => {
        expect(await mountFixture(page, [Q_10K])).toBe(true);
        await box(page).pressSequentially('   ');
        await expect(submit(page)).toBeDisabled();
        await expect(hint(page)).toBeHidden();
        await box(page).press('Enter');
        await expect(hint(page)).toBeHidden();
        await expect(box(page)).not.toHaveAttribute('aria-invalid', /.*/);
        await expect(reveal(page)).toBeEmpty();
    });

    test('Skip after "12abc" leaves no hint and no aria-invalid under "Skipped."', async ({ page }) => {
        expect(await mountFixture(page, [Q_10K, Q_125])).toBe(true);
        await box(page).pressSequentially('12abc');
        await expect(hint(page)).toBeVisible();
        await skip(page).click();
        await expect(status(page)).toHaveText('Skipped.');
        await expect(hint(page)).toBeHidden();
        await expect(hint(page)).toHaveText('');
        await expect(box(page)).not.toHaveAttribute('aria-invalid', /.*/);
    });

    // Two ways a new question is shown: Next after a reveal, and a
    // settings restart straight from the asking phase. The second never
    // passes through reveal(), so it proves showQuestion() clears the
    // hint on its own.
    test('a new question clears the hint — after Next, and after a settings restart', async ({ page }) => {
        expect(await mountFixture(page, [Q_10K, Q_125])).toBe(true);
        await box(page).pressSequentially('12abc');
        await expect(hint(page)).toBeVisible();
        await skip(page).click();
        await submit(page).click();   // "Next question →"
        await expect(page.locator(`${HOST} .quiz-progress-text`)).toHaveText('Question 2 of 2');
        await expect(box(page)).toHaveValue('');
        await expect(box(page)).toBeEnabled();
        await expect(hint(page)).toBeHidden();
        await expect(box(page)).not.toHaveAttribute('aria-invalid', /.*/);

        await box(page).pressSequentially('x');
        await box(page).press('Enter');
        await expect(hint(page)).toBeVisible();
        await expect(box(page)).toHaveAttribute('aria-invalid', 'true');
        await page.selectOption(`#quiz-${SLUG}-count`, '5');
        await page.locator(`${HOST} .quiz-restart-now`).click();
        await expect(page.locator(`${HOST} .quiz-progress-text`)).toHaveText('Question 1 of 2');
        await expect(box(page)).toHaveValue('');
        await expect(hint(page)).toBeHidden();
        await expect(hint(page)).toHaveText('');
        await expect(box(page)).not.toHaveAttribute('aria-invalid', /.*/);
    });

    test('Enter submits a valid entry and only flags an invalid one', async ({ page }) => {
        expect(await mountFixture(page, [Q_10K])).toBe(true);
        await box(page).pressSequentially('x');
        await box(page).press('Enter');
        await expect(reveal(page)).toBeEmpty();
        await expect(box(page)).toBeEnabled();
        await expect(hint(page)).toBeVisible();

        await box(page).fill('');
        await box(page).pressSequentially('10,000');
        await box(page).press('Enter');
        await expect(status(page)).toHaveText('Correct.');
    });

    test('the box is a text input whose inputmode follows the question', async ({ page }) => {
        expect(await mountFixture(page, [Q_10K, Q_PORT])).toBe(true);
        const input = box(page);
        await expect(input).toHaveAttribute('type', 'text');
        await expect(input).toHaveAttribute('inputmode', 'decimal');
        await expect(input).toHaveAttribute('autocomplete', 'off');
        await expect(input).toHaveAttribute('autocapitalize', 'off');
        await expect(input).toHaveAttribute('spellcheck', 'false');
        expect(await input.evaluate((n) => n.spellcheck), 'spellcheck is really off').toBe(false);

        await skip(page).click();
        await submit(page).click();   // "Next question →"
        await expect(page.locator(`${HOST} .quiz-progress-text`)).toHaveText('Question 2 of 2');
        await expect(input).toHaveAttribute('type', 'text');
        await expect(input).toHaveAttribute('inputmode', 'numeric');
    });

    // ── Where the hint sits ──────────────────────────────────────────
    // On its own line, about 0.4rem under the box, moving nothing in the
    // box + unit row when it appears or goes. Document coordinates, so a
    // scroll between measurements cannot fake a shift. The row's own
    // shape is pinned too — the unit on the box's line at the row's far
    // end — because the global input[type="text"] block makes the box
    // width: 100%, so a row that WRAPS drops the unit onto a line of its
    // own in both states, which the before/after comparison alone would
    // not see.
    test('the hint sits ~0.4rem under the box and moves nothing in the row', async ({ page }) => {
        expect(await mountFixture(page, [Q_10K])).toBe(true);
        await box(page).focus();
        // The host .tool-card fades UP into place (styles.css, fadeUp — a
        // translate), so its first half-second moves everything in it.
        // Let every finite animation on the box's ancestor chain finish
        // before measuring, or the entrance reads as the hint's shift.
        await page.evaluate((sel) => {
            const chain = [];
            for (let n = document.querySelector(sel); n; n = n.parentElement) chain.push(n);
            return Promise.all(document.getAnimations()
                .filter((a) => chain.includes(a.effect && a.effect.target) &&
                    a.effect.getComputedTiming().endTime !== Infinity)
                .map((a) => a.finished.catch(() => null)));
        }, `${HOST} .quiz-numeric-input`);
        const rects = () => page.evaluate((sel) => {
            const host = document.querySelector(sel);
            const r = (n) => {
                const b = n.getBoundingClientRect();
                return { top: b.top + scrollY, left: b.left + scrollX, bottom: b.bottom + scrollY, right: b.right + scrollX };
            };
            const hintEl = host.querySelector('.quiz-numeric-hint');
            return {
                rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
                input: r(host.querySelector('.quiz-numeric-input')),
                unit: r(host.querySelector('.quiz-numeric-unit')),
                row: r(host.querySelector('.quiz-numeric')),
                hint: hintEl.hidden ? null : r(hintEl),
            };
        }, HOST);

        const before = await rects();
        expect(before.hint).toBeNull();
        expect(before.unit.right - before.unit.left, 'the unit label has a box').toBeGreaterThan(0);
        expect(before.unit.top, 'the unit sits on the box\'s line').toBeGreaterThan(before.input.top);
        expect(before.unit.bottom, 'the unit sits on the box\'s line').toBeLessThan(before.input.bottom);
        expect(Math.abs(before.unit.right - before.row.right), 'the unit ends the row').toBeLessThanOrEqual(0.5);
        expect(before.unit.left, 'the unit follows the box').toBeGreaterThan(before.input.right);

        await box(page).pressSequentially('abc');
        await expect(hint(page)).toBeVisible();
        const shown = await rects();
        expect(shown.input, 'the box did not move').toEqual(before.input);
        expect(shown.unit, 'the unit label did not move').toEqual(before.unit);
        const gap = shown.hint.top - shown.input.bottom;
        expect(Math.abs(gap - 0.4 * shown.rem), `box → hint gap ${gap}px ≈ 0.4rem`).toBeLessThanOrEqual(0.5);
        expect(Math.abs(shown.hint.left - shown.input.left), 'the hint starts under the box').toBeLessThanOrEqual(0.5);
        expect(shown.hint.bottom, 'the hint is inside the row').toBeLessThanOrEqual(shown.row.bottom + 0.01);

        await box(page).fill('');
        await expect(hint(page)).toBeHidden();
        expect(await rects(), 'hidden again, the row is exactly as before').toEqual(before);
    });

    // ── Ink, measured where it ships ─────────────────────────────────
    // The hint ships `hidden` and the read line exists only after an
    // ambiguous submit, so contrast-sweep.spec.js never measures either.
    // Measure them here, shown, inside the host page's .tool-card
    // .tool-body, in both themes — and first prove the backdrop really
    // is the page's --surface, so the ratio is taken against the card the
    // reader sees. The white-on-black known answer guards the formula.

    test('the hint clears 4.5:1 on the card surface where it ships, in both themes', async ({ page }) => {
        expect(await mountFixture(page, [Q_10K])).toBe(true);
        await box(page).pressSequentially('abc');
        await expect(hint(page)).toBeVisible();

        const seen = {};
        for (const theme of ['dark', 'light']) {
            const r = await measureInk(page, `${HOST} .quiz-numeric-hint`, theme);
            expect(r.applied).toBe(theme);
            expect(r.inToolBody, 'measured inside .tool-card .tool-body').toBe(true);
            expect(Math.round(r.sanity * 100) / 100, 'white on black is 21:1').toBe(21);
            expect(r.backdrop, `${theme}: the hint sits on the page's --surface`).toBe(r.surface);
            expect(r.fontSize, 'small text').toBeLessThan(18.66);
            expect(r.ratio, `${theme}: ${r.ink} on ${r.backdrop}`).toBeGreaterThanOrEqual(4.5);
            seen[theme] = r.backdrop;
        }
        expect(seen.dark, 'the theme switch changed what was measured').not.toBe(seen.light);
    });

    test('the read line clears 4.5:1 on the card surface, in a colour the panel already ships', async ({ page }) => {
        // Graded wrong, so the "Right answer" line it borrows its style
        // from is on the same panel to compare against.
        const r0 = await grade(page, Q_10K, '10.000');
        expect(r0.read).toBe(READ.periodDecimal);

        const seen = {};
        for (const theme of ['dark', 'light']) {
            const r = await measureInk(page, `${HOST} .quiz-reveal-read`, theme,
                `${HOST} .quiz-reveal-right:not(.quiz-reveal-read)`);
            expect(r.applied).toBe(theme);
            expect(r.inToolBody, 'measured inside .tool-card .tool-body').toBe(true);
            expect(r.backdrop, `${theme}: the read line sits on the page's --surface`).toBe(r.surface);
            expect(r.color, `${theme}: same ink as the "Right answer" line`).toBe(r.compareColor);
            expect(r.fontSize, 'small text').toBeLessThan(18.66);
            expect(r.ratio, `${theme}: ${r.ink} on ${r.backdrop}`).toBeGreaterThanOrEqual(4.5);
            seen[theme] = r.backdrop;
        }
        expect(seen.dark, 'the theme switch changed what was measured').not.toBe(seen.light);
    });
});

// A German-locale browser, real keystrokes (not .fill()). Playwright's
// `locale` reaches Intl.NumberFormat's default — the first test proves
// it — and that is all the engine reads its decimal mark from. It does
// not reach a native number input's parser, so nothing here reproduces
// the old engine's German-side defect; these pin the new engine's
// reading for a reader whose browser formats numbers German-style.
test.describe('quiz engine — numeric answer box in a German-locale browser', () => {
    test.use({ locale: 'de-DE' });

    test.beforeEach(async ({ page }) => { await openHost(page); });
    test.afterEach(async ({ page }) => { await cleanUp(page); });

    test('the browser formats German-style, so the default mark is a comma', async ({ page }) => {
        const r = await page.evaluate(() => ({
            language: navigator.language,
            formatted: new Intl.NumberFormat().format(1234.5),
            comma: window.Quiz.parseNumericInput('10,000'),
            period: window.Quiz.parseNumericInput('10.000'),
            explicit: window.Quiz.parseNumericInput('10,000', '.'),
        }));
        expect(r.language, 'the locale really is German').toBe('de-DE');
        expect(r.formatted, 'Intl formats German-style').toBe('1.234,5');
        expect(r.comma).toEqual({ value: 10, ambiguous: true, sep: ',', readAs: 'decimal' });
        expect(r.period).toEqual({ value: 10000, ambiguous: true, sep: '.', readAs: 'group' });
        expect(r.explicit.value, 'an explicit mark overrides the browser').toBe(10000);
    });

    // In a German context the fallback is observable: anything but a
    // working Intl that reports a comma must yield '.'.
    test('the default mark falls back to "." when Intl is missing, throws, or reports another mark', async ({ page }) => {
        const r = await page.evaluate(() => {
            const RealIntl = window.Intl;
            const RealNF = RealIntl.NumberFormat;
            const read = () => window.Quiz.parseNumericInput('10,000').value;
            const out = {};
            try {
                out.real = read();
                RealIntl.NumberFormat = function () { throw new Error('no'); };
                out.throws = read();
                RealIntl.NumberFormat = function () {
                    return { formatToParts: () => [{ type: 'integer', value: '1' }, { type: 'decimal', value: '٫' }, { type: 'fraction', value: '5' }] };
                };
                out.arabicMark = read();
                RealIntl.NumberFormat = function () { return {}; };   // no formatToParts
                out.noParts = read();
                RealIntl.NumberFormat = RealNF;
                window.Intl = undefined;
                out.noIntl = read();
            } finally {
                window.Intl = RealIntl;
                RealIntl.NumberFormat = RealNF;
            }
            return out;
        });
        expect(r.real, 'the real German Intl reads the comma as a decimal point').toBe(10);
        expect(r.throws, 'Intl throws → "."').toBe(10000);
        expect(r.arabicMark, 'a mark that is not a comma → "."').toBe(10000);
        expect(r.noParts, 'no formatToParts → "."').toBe(10000);
        expect(r.noIntl, 'no Intl → "."').toBe(10000);
    });

    test('ten thousand: "10.000" correct, "10,000" is ten, wrong — and the reveal says how each was read', async ({ page }) => {
        expect(await grade(page, Q_10K, '10.000'), '"10.000" on 10000 ± 300')
            .toEqual({ status: 'Correct.', read: READ.periodGroup });
        expect(await grade(page, Q_10K, '10,000'), '"10,000" on 10000 ± 300')
            .toEqual({ status: 'Not quite.', read: READ.commaDecimal });
    });

    test('a German decimal comma "61,6" grades correct, with no read line', async ({ page }) => {
        expect(await grade(page, Q_616, '61,6'), '"61,6" on 61.6 ± 0.5')
            .toEqual({ status: 'Correct.', read: null });
    });

    test('an exact answer: "47.808" correct, "47,808" wrong', async ({ page }) => {
        expect(await grade(page, Q_PORT, '47.808')).toEqual({ status: 'Correct.', read: READ.periodGroup });
        expect(await grade(page, Q_PORT, '47,808')).toEqual({ status: 'Not quite.', read: READ.commaDecimal });
    });
});
