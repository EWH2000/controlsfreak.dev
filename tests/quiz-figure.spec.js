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
//
// The <defs> block is load-bearing, not decoration. The site's diagram
// SVGs are full of same-document references — marker arrowheads in
// bacnet-mstp.html, <pattern> in commanding-actuators.html,
// <linearGradient> + <use> in refrigerant-loop.html — and the first cut
// of this feature stripped every id from the clone, which left those
// url(#…) references dangling so the arrowheads and fills silently
// painted nothing. The original fixture was a bare <rect> + <text> and
// so reported green against a case that could not exhibit the bug.
// Keep a marker, a paint server, and a <use> in here.
const FIGURE_BANK = `
<div class="qf-fixture-bank">
    <svg id="qf-fixture-one" class="edu-svg hidden" viewBox="0 0 200 100" role="img">
        <title>Fixture wiresheet trace</title>
        <desc>A sensor block feeding a comparison block; the input reads 72 and the setpoint reads 70.</desc>
        <defs>
            <marker id="qf-fixture-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z"></path>
            </marker>
            <linearGradient id="qf-fixture-grad">
                <stop offset="0" stop-color="#0a0"></stop>
                <stop offset="1" stop-color="#00a"></stop>
            </linearGradient>
            <path id="qf-fixture-glyph" d="M0,0 L4,0 L4,4 Z"></path>
        </defs>
        <rect id="qf-fixture-one-box" x="10" y="10" width="60" height="30" fill="url(#qf-fixture-grad)"></rect>
        <line x1="10" y1="55" x2="90" y2="55" marker-end="url(#qf-fixture-arrow)"></line>
        <use href="#qf-fixture-glyph" x="120" y="20"></use>
        <text x="10" y="70">SENSOR</text>
    </svg>
</div>
<div id="qf-fixture-mount"></div>
`;

// A figure shaped like the education-page SVG corpus, which names itself
// with aria-labelledby rather than natively. Copying a lesson SVG into a
// figure bank is the path of least resistance, so the engine rejects it
// at mount rather than letting the accessible name silently degrade.
const ARIA_FIGURE_BANK = `
<div class="qf-fixture-bank">
    <svg id="qf-aria-fig" class="edu-svg hidden" viewBox="0 0 200 100"
         role="img" aria-labelledby="qf-aria-fig-title qf-aria-fig-desc">
        <title id="qf-aria-fig-title">Corpus-shaped figure</title>
        <desc id="qf-aria-fig-desc">A sensor block feeding a comparison block.</desc>
        <rect x="10" y="10" width="60" height="30"></rect>
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
async function mountFixture(page, questions, bankHtml) {
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
    }, { bank: bankHtml || FIGURE_BANK, qs: questions });
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

    test('the source figure stays hidden and the clone reuses no source id', async ({ page }) => {
        await mountFixture(page, [
            Object.assign({}, BASE_QUESTION, { figure: 'qf-fixture-one' })
        ]);
        // Source is still the only holder of its ids, and still hidden.
        await expect(page.locator('#qf-fixture-one')).toHaveCount(1);
        await expect(page.locator('#qf-fixture-one')).toBeHidden();
        await expect(page.locator('#qf-fixture-one-box')).toHaveCount(1);
        // The clone's ids are renamed, not stripped: it still has ids
        // (the defs have to keep them to stay referenceable), but none
        // of them collide with the source's.
        const ids = await page.locator('#qf-fixture-mount .quiz-figure')
            .evaluate((el) => [...el.querySelectorAll('[id]')].map((n) => n.id));
        expect(ids.length).toBeGreaterThan(0);
        expect(ids).not.toContain('qf-fixture-one');
        expect(ids).not.toContain('qf-fixture-one-box');
        expect(ids).not.toContain('qf-fixture-arrow');
        // Root id is dropped outright.
        const rootHasId = await page.locator('#qf-fixture-mount .quiz-figure svg')
            .evaluate((el) => el.hasAttribute('id'));
        expect(rootHasId).toBe(false);
    });

    // The regression this feature shipped with: ids were stripped from
    // the clone while url(#…) / <use href="#…"> were left pointing at
    // them, so markers, gradients and patterns painted nothing at all.
    // Chromium does NOT fall through to the still-live hidden source.
    test('the clone resolves its own internal references', async ({ page }) => {
        await mountFixture(page, [
            Object.assign({}, BASE_QUESTION, { figure: 'qf-fixture-one' })
        ]);
        const refs = await page.locator('#qf-fixture-mount .quiz-figure svg')
            .evaluate((svg) => {
                const read = (sel, attr) => svg.querySelector(sel).getAttribute(attr);
                const frag = (v) => (v.match(/#([^)'"\s]+)/) || [])[1];
                return {
                    markerTarget: frag(read('line', 'marker-end')),
                    fillTarget: frag(read('rect', 'fill')),
                    useTarget: frag(read('use', 'href'))
                };
            });
        // Every reference must resolve INSIDE the clone, not document-wide.
        for (const target of [refs.markerTarget, refs.fillTarget, refs.useTarget]) {
            expect(target).toBeTruthy();
            const insideClone = await page.locator('#qf-fixture-mount .quiz-figure svg')
                .evaluate((svg, id) => Boolean(svg.querySelector('#' + CSS.escape(id))), target);
            expect(insideClone, `reference #${target} must resolve inside the clone`).toBe(true);
        }
        // And they must not be the source's ids (that would be a collision).
        expect(refs.markerTarget).not.toBe('qf-fixture-arrow');
    });

    test('a figure that names itself with aria-labelledby fails mount', async ({ page }) => {
        // The education-page SVG corpus names diagrams with
        // aria-labelledby="<x>-title <x>-desc". That shape collapses the
        // whole description into the graphic's accessible NAME, so the
        // engine rejects it rather than degrading silently.
        const { mounted, warnings } = await mountFixture(page, [
            Object.assign({}, BASE_QUESTION, { figure: 'qf-aria-fig' })
        ], ARIA_FIGURE_BANK);
        expect(mounted).toBe(false);
        expect(warnings.join(' ')).toContain('aria-labelledby');
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
