// Guards for quiz-engine.js's NUMERIC answer box — what a reader may
// type, and how it is graded.
//
// Why this file exists: the box used to be <input type="number"> read
// with parseFloat, and a number input hands the page whatever the
// BROWSER's number parser made of the keystrokes — the browser's
// convention, not the reader's. Measured on the old engine in this
// harness (headless Chromium parses English-style even under an
// emulated de-DE or fr-FR locale): "61,6" arrived as 616, "9,5" as 95,
// "10.000" as 10 and "47.808" as 47.808, so a reader who wrote their
// own country's number was marked wrong with no hint why; a browser
// that parses German flips it the other way, "10,000" becoming ten.
// The box is now a text input read by Quiz.parseNumericInput, which
// accepts either separator convention and, for the one genuinely
// ambiguous shape ("10,000", "47.808"), carries BOTH readings and
// grades correct if either is within tolerance.
//
// Every grading test types REAL keystrokes (pressSequentially), never
// .fill(): it is what a reader does, and on the old number input
// .fill() refuses text outright, which would make a test fail for a
// harness reason instead of measuring the engine.
//
// Same approach as quiz-choice-shuffle.spec.js: drive the BUILT engine
// on a real practice page (which already loads /scripts/quiz-engine.js),
// mount fixture banks into a scratch target with window.Quiz.mount, and
// read the rendered DOM. Fixtures mount with no defaultCount and the
// default 'sequential' order, so buildQueue() never draws and a run
// presents the fixture questions in the order given.

const { test, expect } = require('@playwright/test');

const HOST_PAGE = '/practice/modbus-decoding.html';
const SLUG      = 'qni-fixture';
const MOUNT_ID  = 'qni-fixture-mount';
const HOST      = '#' + MOUNT_ID;
const HINT_ID   = 'quiz-' + SLUG + '-numeric-hint';
const HINT_TEXT = 'Enter a number, like 1250 or 12.5.';

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

// The shapes the shipped banks actually carry: the 10k thermistor
// (10000 ± 300), the BACnet/IP port (47808 exact, numeric keypad).
const Q_10K  = numeric('qni-ten-k', 10000, 300, { unit: 'Ω' });
const Q_95   = numeric('qni-nine-five', 9.5, 0);
const Q_55   = numeric('qni-fifty-five', 55, 1);
const Q_PORT = numeric('qni-port', 47808, 0, { inputmode: 'numeric' });
const Q_TEN  = numeric('qni-ten', 10, 0);
const Q_616  = numeric('qni-sixty-one-six', 61.6, 0.5, { unit: '°F' });

async function mountFixture(page, questions) {
    return page.evaluate(({ qs, slug, mountId }) => {
        const prior = document.getElementById(mountId);
        if (prior) prior.remove();
        const host = document.createElement('div');
        host.id = mountId;
        document.querySelector('main').appendChild(host);
        return Boolean(window.Quiz.mount('#' + mountId, qs, { slug: slug }));
    }, { qs: questions, slug: SLUG, mountId: MOUNT_ID });
}

const box     = (page) => page.locator(`${HOST} .quiz-numeric-input`);
const hint    = (page) => page.locator(`${HOST} .quiz-numeric-hint`);
const submit  = (page) => page.locator(`${HOST} .quiz-action-primary`);
const skip    = (page) => page.locator(`${HOST} .quiz-action-secondary`);
const status  = (page) => page.locator(`${HOST} .quiz-reveal-status`);

// Mount one question, type `typed` into the box key by key, submit, and
// return the reveal's status line.
async function grade(page, question, typed) {
    expect(await mountFixture(page, [question])).toBe(true);
    await box(page).pressSequentially(typed);
    await expect(submit(page), `"${typed}" should be submittable`).toBeEnabled();
    await submit(page).click();
    await expect(status(page)).not.toHaveText('');
    return status(page).textContent();
}

test.describe('quiz engine — numeric answer box', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(HOST_PAGE);
        // The host page's own quiz focuses in a setTimeout(0) at boot;
        // one more tick lets that land before a fixture mount schedules
        // its own focus (same reasoning as quiz-choice-shuffle.spec.js).
        await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
    });

    test.afterEach(async ({ page }) => {
        await page.evaluate(({ slug, mountId }) => {
            const host = document.getElementById(mountId);
            if (host) host.remove();
            try {
                Object.keys(localStorage)
                    .filter((k) => k.indexOf('cf_quiz_' + slug + '_') === 0)
                    .forEach((k) => localStorage.removeItem(k));
            } catch (_) { /* opaque origin after a failed navigation */ }
        }, { slug: SLUG, mountId: MOUNT_ID });
    });

    // ── The parser, rule by rule ─────────────────────────────────────
    // Each row is [typed, readings]. Readings are in the engine's order,
    // because the order decides what is stored on a miss.
    const TABLE = [
        // Not a number at all → no reading.
        ['', []],
        ['   ', []],
        ['abc', []],
        ['12abc', []],
        ['1e3', []],               // no exponent: letters are not in the grammar
        ['-', []],                 // a sign with no digit
        ['+', []],
        ['.', []],                 // separators with no digit
        [',', []],
        ['.,', []],
        ['+-5', []],               // ONE optional sign
        ['5-', []],                // leading only
        ["10'000", []],            // apostrophe grouping is not in the grammar
        // No separator → one reading; signs.
        ['1000', [1000]],
        ['007', [7]],
        ['+12', [12]],
        ['-12', [-12]],
        ['\u22125', [-5]],          // U+2212 MINUS SIGN reads as '-'
        // One kind, once, not the ambiguous shape → a decimal mark,
        // digits on at least one side.
        ['12.5', [12.5]],
        ['12,5', [12.5]],
        ['.5', [0.5]],
        [',5', [0.5]],
        ['5.', [5]],
        ['5,', [5]],
        ['0,500', [0.5]],          // leading 0: never the grouping shape
        ['0.500', [0.5]],
        ['1234,567', [1234.567]],  // four digits in front: not a group
        ['12.5000', [12.5]],       // four digits behind: not a group
        // One kind, once, 1-3 digits (no leading 0) + mark + exactly 3 →
        // AMBIGUOUS, two readings: '.' decimal first, ',' grouped first.
        ['10,000', [10000, 10]],
        ['10.000', [10, 10000]],
        ['1,000', [1000, 1]],
        ['999.999', [999.999, 999999]],
        // One kind, twice or more → grouping, and it must be well formed.
        ['1,000,000', [1000000]],
        ['1.000.000', [1000000]],
        ['1,2,3', []],
        ['1.2.3', []],
        ['1,0000,000', []],
        // Both kinds → the LAST is the decimal mark (once); the other
        // groups the integer part in well-formed threes.
        ['10,000.5', [10000.5]],
        ['10.000,5', [10000.5]],
        ['1,234,567.89', [1234567.89]],
        ['1.234.567,89', [1234567.89]],
        ['10,000.', [10000]],
        ['1,2,3.4', []],           // integer part not in groups of three
        ['10000,000.5', []],
        ['1.2,3.4', []],           // the last kind occurs twice
        ['1.000,5,5', []],
        // The sign applies to every reading.
        ['-10,000', [-10000, -10]],
        ['\u221210.000', [-10, -10000]],
        // NFKC: full-width digits, separators and minus become ASCII.
        ['\uff11\uff10\uff0c\uff10\uff10\uff10', [10000, 10]],
        ['\uff11\uff12\uff0e\uff15', [12.5]],
        ['\uff0d\uff15', [-5]],
        // Whitespace (including the no-break family) is removed, so it
        // works as grouping.
        ['10 000', [10000]],
        ['10\u00a0000', [10000]],    // NO-BREAK SPACE
        ['10\u202f000', [10000]],    // NARROW NO-BREAK SPACE (French grouping)
        ['10\u2009000', [10000]],    // THIN SPACE
        ['  12.5  ', [12.5]],
    ];

    test('parseNumericInput reads every rule of the grammar', async ({ page }) => {
        const results = await page.evaluate((rows) => rows.map(([typed]) => {
            const out = window.Quiz.parseNumericInput(typed);
            return { isArray: Array.isArray(out), readings: Array.from(out) };
        }), TABLE);
        TABLE.forEach(([typed, want], i) => {
            const label = `parseNumericInput(${JSON.stringify(typed)})`;
            expect(results[i].isArray, `${label} returns an array`).toBe(true);
            expect(results[i].readings, label).toEqual(want);
        });
    });

    // ── Grading ──────────────────────────────────────────────────────

    test('the ten-thousand question grades every separator convention correct', async ({ page }) => {
        for (const typed of ['10000', '10,000', '10.000', '10 000']) {
            expect(await grade(page, Q_10K, typed), `"${typed}" on 10000 ± 300`).toBe('Correct.');
            await expect(page.locator(`${HOST} .quiz-numeric`)).toHaveClass(/\bcorrect\b/);
        }
    });

    test('a decimal comma grades correct', async ({ page }) => {
        expect(await grade(page, Q_95, '9,5'), '"9,5" on 9.5 exact').toBe('Correct.');
    });

    test('an exact answer is reached by both ambiguous spellings', async ({ page }) => {
        for (const typed of ['47.808', '47,808']) {
            expect(await grade(page, Q_PORT, typed), `"${typed}" on 47808 exact`).toBe('Correct.');
        }
    });

    test('neither reading in tolerance grades wrong, and the reveal says so', async ({ page }) => {
        expect(await grade(page, Q_55, '10,000'), '"10,000" on 55 ± 1').toBe('Not quite.');
        await expect(page.locator(`${HOST} .quiz-numeric`)).toHaveClass(/\bwrong\b/);
        await expect(page.locator(`${HOST} .quiz-reveal-right`)).toContainText('55');
        await expect(page.locator(`${HOST} .quiz-reveal`)).toHaveClass(/quiz-reveal--incorrect/);
    });

    // PINNED, not hidden: the false accept the design knowingly allows.
    // "10,000" is ten thousand to an English reader and ten to a German
    // one, and the engine cannot know which reader is typing, so it
    // accepts either meaning. On an answer of 10 that means a reader who
    // meant ten thousand is marked right. It takes the answer and the
    // decoy three orders of magnitude apart, typed in exactly the
    // ambiguous shape; the design ranks that below marking a German
    // reader wrong for writing ten thousand their own way. If this test
    // ever fails, the two-readings rule has changed — re-decide it on
    // purpose rather than updating the expectation.
    test('the known false accept: "10,000" on an answer of 10 grades correct', async ({ page }) => {
        expect(await grade(page, Q_TEN, '10,000'), '"10,000" on 10 exact').toBe('Correct.');
    });

    // ── Not-a-number entries ─────────────────────────────────────────

    test('a non-number disables Submit and shows the hint; clearing hides it', async ({ page }) => {
        expect(await mountFixture(page, [Q_10K])).toBe(true);
        await expect(box(page)).toHaveAttribute('aria-describedby', HINT_ID);
        await expect(hint(page)).toHaveAttribute('id', HINT_ID);
        await expect(hint(page)).toHaveAttribute('aria-live', 'polite');
        await expect(hint(page)).toBeHidden();

        await box(page).pressSequentially('12abc');
        await expect(box(page), 'what the reader typed is left alone').toHaveValue('12abc');
        await expect(submit(page)).toBeDisabled();
        await expect(hint(page)).toBeVisible();
        await expect(hint(page)).toHaveText(HINT_TEXT);
        await expect(box(page)).toHaveAttribute('aria-invalid', 'true');

        await box(page).fill('');
        await expect(hint(page)).toBeHidden();
        await expect(box(page)).not.toHaveAttribute('aria-invalid', 'true');
        await expect(submit(page)).toBeDisabled();

        await box(page).pressSequentially('12.5');
        await expect(submit(page)).toBeEnabled();
        await expect(hint(page)).toBeHidden();
        await expect(box(page)).not.toHaveAttribute('aria-invalid', 'true');
    });

    test('a whitespace-only entry is empty, not invalid', async ({ page }) => {
        expect(await mountFixture(page, [Q_10K])).toBe(true);
        await box(page).fill('   ');
        await expect(submit(page)).toBeDisabled();
        await expect(hint(page)).toBeHidden();
        await expect(box(page)).not.toHaveAttribute('aria-invalid', 'true');
    });

    test('the hint and aria-invalid are cleared when the next question is shown', async ({ page }) => {
        expect(await mountFixture(page, [Q_10K, Q_55])).toBe(true);
        await box(page).pressSequentially('12abc');
        await expect(hint(page)).toBeVisible();
        await expect(box(page)).toHaveAttribute('aria-invalid', 'true');

        await skip(page).click();
        await submit(page).click();   // "Next question →"
        await expect(page.locator(`${HOST} .quiz-progress-text`)).toHaveText('Question 2 of 2');
        await expect(box(page)).toHaveValue('');
        await expect(box(page)).toBeEnabled();
        await expect(hint(page)).toBeHidden();
        await expect(box(page)).not.toHaveAttribute('aria-invalid', 'true');
    });

    test('Enter submits a valid entry and does nothing on an invalid one', async ({ page }) => {
        expect(await mountFixture(page, [Q_10K])).toBe(true);
        await box(page).pressSequentially('x');
        await box(page).press('Enter');
        await expect(page.locator(`${HOST} .quiz-reveal`)).toBeEmpty();
        await expect(box(page)).toBeEnabled();

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

    // ── The hint's ink ───────────────────────────────────────────────
    // The hint ships `hidden`, and contrast-sweep.spec.js skips anything
    // under [hidden], so no page sweep will ever measure it. Measure it
    // here, shown, in both themes: ink composited at the effective
    // opacity over the backdrop found by walking out from the element
    // itself to the first opaque background — the same method as the
    // sweep. The white-on-black known answer guards the formula's
    // constants.
    test('the hint clears 4.5:1 on its real background in both themes', async ({ page }) => {
        expect(await mountFixture(page, [Q_10K])).toBe(true);
        await box(page).pressSequentially('abc');
        await expect(hint(page)).toBeVisible();

        const seen = {};
        for (const theme of ['dark', 'light']) {
            const r = await page.evaluate(async ({ sel, theme }) => {
                document.documentElement.dataset.theme = theme;
                const el = document.querySelector(sel);
                // Let any colour transition on the chain finish first.
                const chain = [];
                for (let n = el; n; n = n.parentElement) chain.push(n);
                await Promise.all(document.getAnimations()
                    .filter((a) => typeof CSSTransition !== 'undefined' && a instanceof CSSTransition &&
                        chain.includes(a.effect && a.effect.target))
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
                return {
                    applied: document.documentElement.getAttribute('data-theme'),
                    sanity: ratio({ r: 255, g: 255, b: 255, a: 1 }, { r: 0, g: 0, b: 0, a: 1 }),
                    ratio: ratio(ink, backdrop),
                    ink: hex(ink),
                    backdrop: hex(backdrop),
                    fontSize: parseFloat(getComputedStyle(el).fontSize),
                };
            }, { sel: `${HOST} .quiz-numeric-hint`, theme });

            expect(r.applied).toBe(theme);
            expect(Math.round(r.sanity * 100) / 100, 'white on black is 21:1').toBe(21);
            // Small text (well under the 18.66px / 24px large-text sizes).
            expect(r.fontSize).toBeLessThan(18.66);
            expect(r.ratio, `${theme}: ${r.ink} on ${r.backdrop}`).toBeGreaterThanOrEqual(4.5);
            seen[theme] = r.backdrop;
        }
        expect(seen.dark, 'the theme switch changed what was measured').not.toBe(seen.light);
    });
});

// A German-locale browser, real keystrokes (not .fill()). What fails on
// the OLD engine here, measured: the decimal comma ("61,6" arrived as
// 616) and German thousands grouping ("10.000" arrived as 10). The
// "10,000" row does NOT fail on the old engine in this harness — the
// emulated locale never reached the number input's parser, which read
// the comma as English grouping — so it pins the new engine's grouped
// reading for this reader rather than reproducing the defect.
test.describe('quiz engine — numeric answer box in a German-locale browser', () => {
    test.use({ locale: 'de-DE' });

    test.beforeEach(async ({ page }) => {
        await page.goto(HOST_PAGE);
        await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
    });

    test.afterEach(async ({ page }) => {
        await page.evaluate(({ slug, mountId }) => {
            const host = document.getElementById(mountId);
            if (host) host.remove();
            try {
                Object.keys(localStorage)
                    .filter((k) => k.indexOf('cf_quiz_' + slug + '_') === 0)
                    .forEach((k) => localStorage.removeItem(k));
            } catch (_) { /* opaque origin after a failed navigation */ }
        }, { slug: SLUG, mountId: MOUNT_ID });
    });

    test('"10,000" typed key by key grades ten thousand correct', async ({ page }) => {
        expect(await page.evaluate(() => navigator.language), 'the locale really is German').toBe('de-DE');
        expect(await mountFixture(page, [Q_10K])).toBe(true);
        await box(page).pressSequentially('10,000');
        await expect(submit(page)).toBeEnabled();
        await submit(page).click();
        await expect(status(page)).toHaveText('Correct.');
    });

    test('a German decimal comma "61,6" grades correct', async ({ page }) => {
        expect(await mountFixture(page, [Q_616])).toBe(true);
        await box(page).pressSequentially('61,6');
        await expect(submit(page)).toBeEnabled();
        await submit(page).click();
        await expect(status(page)).toHaveText('Correct.');
    });

    test('German thousands grouping "10.000" grades ten thousand correct', async ({ page }) => {
        expect(await mountFixture(page, [Q_10K])).toBe(true);
        await box(page).pressSequentially('10.000');
        await expect(submit(page)).toBeEnabled();
        await submit(page).click();
        await expect(status(page)).toHaveText('Correct.');
    });
});
