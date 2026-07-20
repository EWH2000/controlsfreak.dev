// Behavioral coverage for the quiz engine's optional `figure` field.
//
// Why a dedicated spec: no shipped question bank uses `figure` yet, and
// validateQuestion ignores unknown keys — so without a test that mounts
// a fixture question carrying one, the whole feature would ship
// unexercised and could rot into a second `tags` (documented, present,
// consumed by nothing). These tests drive the real engine on a real
// page: they navigate to an existing practice page (which already loads
// /scripts/quiz-engine.js), inject a static figure bank plus a scratch
// mount target, and call Quiz.mount by hand.
//
// The two behaviors worth pinning hardest are the ones that motivated
// the field in the first place — an SVG inside `prompt` leaks into the
// Review/miss table (which strips prompts to textContent) and into
// head.njk's FAQPage JSON-LD — plus the accessibility contract: the
// <desc> travels with the clone, and nothing in the render path
// surfaces it before the figure is on screen.

const { test, expect } = require('@playwright/test');

const HOST_PAGE = '/practice/modbus-decoding.html';

// A figure bank entry shaped the way a real page would ship it: a
// diagram-class SVG carrying class="hidden" (so the diagram-audit
// screenshot script's un-hide loop reaches it) with a native
// <title>/<desc> pair and an inner element that has its own id.
const FIGURE_BANK = `
<div class="qf-fixture-bank">
    <svg id="qf-fixture-one" class="edu-svg hidden" viewBox="0 0 200 100" role="img">
        <title>Fixture wiresheet trace</title>
        <desc>A sensor block feeding a comparison block; the input reads 72 and the setpoint reads 70.</desc>
        <rect id="qf-fixture-one-box" x="10" y="10" width="60" height="30"></rect>
        <text x="10" y="70">SENSOR</text>
    </svg>
</div>
<div id="qf-fixture-mount"></div>
`;

const BASE_QUESTION = {
    type: 'mcq',
    id: 'qf-one',
    prompt: 'Which block drives the output?',
    explain: 'The comparison block does — its output is the one wired onward.',
    choices: [
        { id: 'sensor', text: 'The sensor block' },
        { id: 'compare', text: 'The comparison block', correct: true }
    ]
};

// Inject the bank + mount target, then mount a bank of `questions`.
// Returns whatever Quiz.mount returned, coerced to a boolean — the
// engine returns null on a validation failure and an instance on
// success, and an instance is not serializable across the bridge.
async function mountFixture(page, questions) {
    await page.goto(HOST_PAGE);
    return page.evaluate(({ bank, qs }) => {
        const host = document.createElement('div');
        host.innerHTML = bank;
        document.querySelector('main').appendChild(host);
        const warnings = [];
        const realWarn = console.warn;
        console.warn = (...args) => { warnings.push(args.join(' ')); };
        const result = window.Quiz.mount('#qf-fixture-mount', qs, { slug: 'qf-fixture' });
        console.warn = realWarn;
        return { mounted: Boolean(result), warnings };
    }, { bank: FIGURE_BANK, qs: questions });
}

test.describe('quiz engine — figure field', () => {

    test('renders the referenced figure on a plain mcq (no type gate)', async ({ page }) => {
        // Deliberately NOT a gotcha: the snippet field is gated on
        // type === "gotcha" at render time, and `figure` must not
        // inherit that asymmetry.
        const { mounted } = await mountFixture(page, [
            Object.assign({}, BASE_QUESTION, { figure: 'qf-fixture-one' })
        ]);
        expect(mounted).toBe(true);

        const slot = page.locator('#qf-fixture-mount .quiz-figure');
        await expect(slot).toBeVisible();
        await expect(slot.locator('svg')).toHaveCount(1);
        // The clone keeps its diagram class and drops the hidden marker.
        await expect(slot.locator('svg')).toHaveClass(/edu-svg/);
        await expect(slot.locator('svg.hidden')).toHaveCount(0);
    });

    test('the accessible description travels with the clone', async ({ page }) => {
        await mountFixture(page, [
            Object.assign({}, BASE_QUESTION, { figure: 'qf-fixture-one' })
        ]);
        const desc = await page.locator('#qf-fixture-mount .quiz-figure svg desc').textContent();
        expect(desc).toContain('sensor block feeding a comparison block');
        await expect(
            page.locator('#qf-fixture-mount .quiz-figure svg title')
        ).toHaveText('Fixture wiresheet trace');
    });

    test('the source figure stays hidden and ids are not duplicated', async ({ page }) => {
        await mountFixture(page, [
            Object.assign({}, BASE_QUESTION, { figure: 'qf-fixture-one' })
        ]);
        // Source is still the only holder of the id, and still hidden.
        await expect(page.locator('#qf-fixture-one')).toHaveCount(1);
        await expect(page.locator('#qf-fixture-one')).toBeHidden();
        // The clone carries no ids at all — root or descendant.
        const cloneIds = await page.locator('#qf-fixture-mount .quiz-figure')
            .evaluate((el) => el.querySelectorAll('[id]').length);
        expect(cloneIds).toBe(0);
        await expect(page.locator('#qf-fixture-one-box')).toHaveCount(1);
    });

    test('a question without a figure clears the slot', async ({ page }) => {
        await mountFixture(page, [
            Object.assign({}, BASE_QUESTION, { figure: 'qf-fixture-one' }),
            Object.assign({}, BASE_QUESTION, { id: 'qf-two' })
        ]);
        const slot = page.locator('#qf-fixture-mount .quiz-figure');
        await expect(slot).toBeVisible();
        // Answer and advance to the figure-less question.
        await page.locator('#qf-fixture-mount .quiz-choice').first().click();
        await page.locator('#qf-fixture-mount .quiz-action-primary').click();
        await page.locator('#qf-fixture-mount .quiz-action-primary').click();
        await expect(slot).toBeHidden();
        await expect(slot.locator('svg')).toHaveCount(0);
    });

    test('the Review/miss table stays free of figure content', async ({ page }) => {
        // The motivating leak: an SVG in `prompt` gets flattened into
        // this table by textContent. Keep the figure out of it.
        await mountFixture(page, [
            Object.assign({}, BASE_QUESTION, { figure: 'qf-fixture-one' })
        ]);
        await page.locator('#qf-fixture-mount .quiz-action-secondary').click();
        await page.locator('#qf-fixture-mount .quiz-action-primary').click();
        const row = page.locator('#qf-fixture-mount .quiz-results-misses tbody tr td').first();
        await expect(row).toHaveText('Which block drives the output?');
        const tableText = await page.locator('#qf-fixture-mount .quiz-results-misses').textContent();
        expect(tableText).not.toContain('SENSOR');
        expect(tableText).not.toContain('Fixture wiresheet trace');
        expect(tableText).not.toContain('comparison block; the input reads');
    });

    test('a figure pointing at a missing element fails mount loudly', async ({ page }) => {
        const { mounted, warnings } = await mountFixture(page, [
            Object.assign({}, BASE_QUESTION, { figure: 'qf-fixture-nope' })
        ]);
        expect(mounted).toBe(false);
        expect(warnings.join(' ')).toContain('figure references missing element');
        await expect(page.locator('#qf-fixture-mount .quiz-figure')).toHaveCount(0);
    });

    test('a non-kebab-case figure id fails mount loudly', async ({ page }) => {
        const { mounted, warnings } = await mountFixture(page, [
            Object.assign({}, BASE_QUESTION, { figure: 'qfFixtureOne' })
        ]);
        expect(mounted).toBe(false);
        expect(warnings.join(' ')).toContain('figure must be a kebab-case element id');
    });

});
