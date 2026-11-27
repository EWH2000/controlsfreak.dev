// Guards for quiz-engine.js's CHOICE order — the shuffle at render (#335).
//
// Why this file exists: across the banks the keyed choice sat on a / b /
// c / d far from evenly, and some banks keyed every question on one
// letter, so a test-wise reader could learn the letter instead of the
// answer. The owner ruled "shuffle in the engine": every mcq and gotcha
// question presents its choices in a fresh random order each time it is
// shown, True/False stays True-then-False, and nothing that scores or
// marks an answer may identify a choice by its position. A shuffle that
// leaks into scoring (the reveal marks the wrong button, the "Right
// answer" line names a distractor) or into the bank itself (the data
// array reordered in place) would still look fine to a reader of one
// run, so each of those is pinned here.
//
// The engine is browser-side and its state lives in a closure, so these
// tests drive the BUILT engine on a real practice page (which already
// loads /scripts/quiz-engine.js), mount fixture banks into a scratch
// target with window.Quiz.mount, and read the rendered buttons — the
// same approach as quiz-selection.spec.js and quiz-figure.spec.js.
//
// Determinism: Math.random is replaced inside the page for the duration
// of the (synchronous) mount and restored in a finally, so the stub
// drives exactly this mount's shuffle and nothing else on the page. The
// fixtures mount with no defaultCount and the default 'sequential'
// order, so buildQueue() never draws — the choice shuffle is the only
// consumer of the stub.

const { test, expect } = require('@playwright/test');

const HOST_PAGE = '/practice/modbus-decoding.html';
const SLUG      = 'qcs-fixture';
const MOUNT_ID  = 'qcs-fixture-mount';
const HOST      = '#' + MOUNT_ID;

// shuffleInPlace is Fisher-Yates: for i from n-1 down to 1 it swaps
// arr[i] with arr[j], j = floor(Math.random() * (i + 1)).
//
// 0.999999 → j = floor(0.999999 * (i + 1)) = i for every i a question
// can have, so every swap is a self-swap: the IDENTITY permutation.
const STUB_IDENTITY = 0.999999;
// 0 → j = 0 at every step, so each step swaps arr[i] with arr[0]. On
// [a0, a1, a2, a3]: i=3 → [a3, a1, a2, a0]; i=2 → [a2, a1, a3, a0];
// i=1 → [a1, a2, a3, a0]. In general the authored order ROTATED LEFT BY
// ONE — the head goes to the tail — which for a bank keyed on its first
// choice moves the key to the last position.
const STUB_ZERO = 0;

const KEYED_TEXT = 'A current switch reading above its trip point';
const MCQ = {
    type: 'mcq',
    id: 'qcs-mcq',
    prompt: 'Fixture: which reading proves the supply fan is turning?',
    explain: 'Fixture explanation — the proof is a measurement of the motor, not a command to it.',
    // Keyed on the authored head on purpose: that is the bias the
    // shuffle exists to break.
    choices: [
        { id: 'keyed',      text: KEYED_TEXT, correct: true },
        { id: 'dist-one',   text: 'The start command is on' },
        { id: 'dist-two',   text: 'The drive reports a speed reference' },
        { id: 'dist-three', text: 'The schedule reads occupied' }
    ]
};
const AUTHORED_IDS  = ['keyed', 'dist-one', 'dist-two', 'dist-three'];
const ZERO_STUB_IDS = ['dist-one', 'dist-two', 'dist-three', 'keyed'];

const GOTCHA = {
    type: 'gotcha',
    id: 'qcs-gotcha',
    prompt: 'Fixture: what does this line do when the sensor fails open?',
    snippet: '<pre class="quiz-snippet">IF OAT &lt; 40 THEN HEAT := ON</pre>',
    explain: 'Fixture explanation — an open thermistor reads cold, so the comparison goes true.',
    choices: [
        { id: 'g-keyed',    text: 'It calls for heat', correct: true },
        { id: 'g-dist-one', text: 'It holds the last command' },
        { id: 'g-dist-two', text: 'It turns the heat off' }
    ]
};
const GOTCHA_AUTHORED_IDS  = ['g-keyed', 'g-dist-one', 'g-dist-two'];
const GOTCHA_ZERO_STUB_IDS = ['g-dist-one', 'g-dist-two', 'g-keyed'];

const TF = {
    type: 'tf',
    id: 'qcs-tf',
    prompt: 'Fixture: a start command on its own proves the fan is running.',
    explain: 'Fixture explanation — a command is a request, not a proof.',
    answer: false
};

// Mount `questions` into a fresh scratch target with Math.random pinned
// to `random` (or left real when `random` is null), restoring it in a
// finally. Returns the rendered choice ids in DOM order, plus the bank's
// own choice ids read back AFTER the render — the same in-page objects
// the engine was handed, so an in-place shuffle would show up there.
async function mountFixture(page, questions, random) {
    return page.evaluate(({ qs, random, slug, mountId }) => {
        const prior = document.getElementById(mountId);
        if (prior) prior.remove();
        const host = document.createElement('div');
        host.id = mountId;
        document.querySelector('main').appendChild(host);

        const realRandom = Math.random;
        if (random !== null) Math.random = () => random;
        let mounted;
        try {
            mounted = Boolean(window.Quiz.mount('#' + mountId, qs, { slug: slug }));
        } finally {
            Math.random = realRandom;
        }
        return {
            mounted,
            rendered: [...host.querySelectorAll('.quiz-choice')]
                .map((b) => b.getAttribute('data-choice-id')),
            bankAfter: qs.map((q) => (q.choices || []).map((c) => c.id))
        };
    }, { qs: questions, random: random === undefined ? null : random, slug: SLUG, mountId: MOUNT_ID });
}

test.describe('quiz engine — choice shuffle at render (#335)', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(HOST_PAGE);
        // The page's own quiz focuses its first choice in a setTimeout(0)
        // at boot. Timers of equal delay run in scheduling order, so one
        // more tick here guarantees that focus has landed before a
        // fixture mount schedules its own — otherwise the focus
        // assertion below could race the host page.
        await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
    });

    // Remove the scratch target and any cf_quiz_<slug>_* key the fixture
    // created, mirroring the cleanup in quiz-selection.spec.js's probe.
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

    // (a) Proves the stub is what drives the order: the identity draw
    // must give back exactly the authored sequence.
    test('the identity stub renders the choices in authored order', async ({ page }) => {
        const r = await mountFixture(page, [MCQ], STUB_IDENTITY);
        expect(r.mounted).toBe(true);
        expect(r.rendered).toEqual(AUTHORED_IDS);
    });

    // (b) A non-authored order, with every scoring path still following
    // the keyed choice by its mark rather than its slot.
    test('the zero stub renders a non-authored order and scoring follows the key', async ({ page }) => {
        const r = await mountFixture(page, [MCQ], STUB_ZERO);
        expect(r.mounted).toBe(true);
        expect(r.rendered, 'the exact rotation shuffleInPlace draws for a zero stub')
            .toEqual(ZERO_STUB_IDS);
        expect(r.rendered).not.toEqual(AUTHORED_IDS);
        expect([...r.rendered].sort(), 'shuffled, not dropped or duplicated')
            .toEqual([...AUTHORED_IDS].sort());

        const keyed = page.locator(`${HOST} .quiz-choice[data-correct="true"]`);
        await expect(keyed).toHaveCount(1);
        await expect(keyed).toHaveText(KEYED_TEXT);
        await expect(keyed).toHaveAttribute('data-choice-id', 'keyed');

        await keyed.click();
        await page.locator(`${HOST} .quiz-action-primary`).click();
        await expect(page.locator(`${HOST} .quiz-reveal-status`)).toHaveText('Correct.');
        await expect(keyed).toHaveClass(/\bcorrect\b/);
        await expect(page.locator(`${HOST} .quiz-choice.wrong`)).toHaveCount(0);

        // Second mount, same draw: pick a distractor this time.
        const r2 = await mountFixture(page, [MCQ], STUB_ZERO);
        expect(r2.rendered).toEqual(ZERO_STUB_IDS);
        const wrong = page.locator(`${HOST} .quiz-choice[data-correct="false"]`).first();
        const wrongId = await wrong.getAttribute('data-choice-id');
        await wrong.click();
        await page.locator(`${HOST} .quiz-action-primary`).click();
        await expect(page.locator(`${HOST} .quiz-reveal-status`)).toHaveText('Not quite.');
        await expect(page.locator(`${HOST} .quiz-reveal-right`)).toContainText(KEYED_TEXT);
        // The marks land on the buttons by identity: the picked one is
        // wrong, the keyed one is right, and nothing else is marked.
        await expect(page.locator(`${HOST} .quiz-choice.wrong`)).toHaveCount(1);
        await expect(page.locator(`${HOST} .quiz-choice[data-choice-id="${wrongId}"]`))
            .toHaveClass(/\bwrong\b/);
        await expect(page.locator(`${HOST} .quiz-choice.correct`)).toHaveCount(1);
        await expect(page.locator(`${HOST} .quiz-choice[data-correct="true"]`))
            .toHaveClass(/\bcorrect\b/);
    });

    // (c) The engine shuffles a copy. The bank array has a second
    // consumer on every later render (and the "Right answer" line reads
    // it), so reordering it in place would be a silent data mutation.
    test('the bank\'s own choices array keeps its authored order', async ({ page }) => {
        const r = await mountFixture(page, [MCQ], STUB_ZERO);
        expect(r.mounted).toBe(true);
        // Anti-vacuity: a shuffle actually ran, or the next line would
        // pass on an engine that never reorders anything.
        expect(r.rendered).toEqual(ZERO_STUB_IDS);
        expect(r.bankAfter[0], 'q.choices untouched after render').toEqual(AUTHORED_IDS);
    });

    // (d) True/False is a reading convention, not a lettered list.
    test('True/False renders True then False under both stubs', async ({ page }) => {
        for (const stub of [STUB_IDENTITY, STUB_ZERO]) {
            const r = await mountFixture(page, [TF], stub);
            expect(r.mounted).toBe(true);
            expect(r.rendered, `tf order under stub ${stub}`).toEqual(['true', 'false']);
            await expect(page.locator(`${HOST} .quiz-choice`)).toHaveText(['True', 'False']);
        }
    });

    // (e) gotcha is mcq + snippet and shares the render path; it must
    // not slip through on a type check that names only 'mcq'.
    test('a gotcha question is shuffled too', async ({ page }) => {
        const identity = await mountFixture(page, [GOTCHA], STUB_IDENTITY);
        expect(identity.mounted).toBe(true);
        expect(identity.rendered).toEqual(GOTCHA_AUTHORED_IDS);

        const zero = await mountFixture(page, [GOTCHA], STUB_ZERO);
        expect(zero.rendered, 'the three-choice rotation for a zero stub')
            .toEqual(GOTCHA_ZERO_STUB_IDS);
        await expect(page.locator(`${HOST} .quiz-snippet-slot .quiz-snippet`)).toHaveCount(1);
    });

    // (f) Keyboard follows what the reader SEES. Under the zero stub the
    // first rendered choice is not the first authored one, so a roving
    // tabindex or arrow walk keyed to bank order would fail here.
    test('the first rendered choice is the Tab stop and ArrowDown walks rendered order', async ({ page }) => {
        const r = await mountFixture(page, [MCQ], STUB_ZERO);
        expect(r.rendered).toEqual(ZERO_STUB_IDS);

        const choices = page.locator(`${HOST} .quiz-choice`);
        await expect(choices.nth(0)).toHaveAttribute('data-choice-id', ZERO_STUB_IDS[0]);
        await expect(choices.nth(0)).toHaveAttribute('tabindex', '0');
        for (let i = 1; i < ZERO_STUB_IDS.length; i++) {
            await expect(choices.nth(i)).toHaveAttribute('tabindex', '-1');
        }
        await expect(choices.nth(0)).toBeFocused();

        await page.keyboard.press('ArrowDown');
        await expect(choices.nth(1)).toHaveAttribute('data-choice-id', ZERO_STUB_IDS[1]);
        await expect(choices.nth(1)).toBeFocused();
        await expect(choices.nth(1)).toHaveAttribute('aria-checked', 'true');
        await expect(choices.nth(1)).toHaveAttribute('tabindex', '0');
        await expect(choices.nth(0)).toHaveAttribute('aria-checked', 'false');
    });

    // (g) The real thing, unstubbed: the key has to move. Fisher-Yates
    // with Math.random is uniform, so a false failure needs all 30 mounts
    // to land the key in one slot — the first lands anywhere and the
    // other 29 must match it: (1/4)^29 = 4 × (1/4)^30 ≈ 3.5 × 10^-18.
    test('with the real Math.random the keyed choice lands in more than one position', async ({ page }) => {
        const positions = await page.evaluate(({ q, slug, mountId, runs }) => {
            const out = [];
            for (let r = 0; r < runs; r++) {
                const host = document.createElement('div');
                host.id = mountId;
                document.querySelector('main').appendChild(host);
                const mounted = window.Quiz.mount('#' + mountId, [q], { slug: slug });
                const marks = [...host.querySelectorAll('.quiz-choice')]
                    .map((b) => b.getAttribute('data-correct'));
                out.push(mounted ? marks.indexOf('true') : -1);
                host.remove();
            }
            return out;
        }, { q: MCQ, slug: SLUG, mountId: MOUNT_ID, runs: 30 });

        expect(positions).toHaveLength(30);
        expect(positions.every((p) => p >= 0 && p < AUTHORED_IDS.length),
            'every mount rendered the keyed choice').toBe(true);
        expect(new Set(positions).size, `keyed positions seen: ${positions.join(',')}`)
            .toBeGreaterThanOrEqual(2);
    });

});
