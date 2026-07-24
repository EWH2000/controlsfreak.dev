// DDC Workbench — the air animation's idle gate.
//
// The page runs ONE self-suspending rAF loop for the fan blade and the air
// chevrons (house idiom: flow-engine.js:285-303, codebase-issues #113). It
// suspends when the fan is off, when the Wiresheet tab is up, or when the
// document is hidden, and the ONLY thing that restarts it is fcuRenderUnit
// calling fcuAnimSync() — there is no visibilitychange listener and no
// mirrored tab flag.
//
// That is a single point of failure for a graphic nothing else tests: if the
// resume path ever breaks, the unit renders frozen and every other spec
// still passes. The #113 resolution added a spec for exactly this risk (an
// IO-gated startLoop that never fires); the failure mode here is worse,
// because a frozen DDC graphic looks like a plausible idle unit rather than
// an obvious bug.
//
// The page is deliberately hidden (eleventyExcludeFromCollections + noindex),
// so it is NOT in tests/pages.js — that manifest feeds smoke.spec.js,
// responsive.spec.js and contrast-sweep.spec.js, all of which would pull the
// page back into the crawl-facing surface. Naming the URL directly here keeps
// the coverage without un-hiding the page.

const { test, expect } = require('@playwright/test');

const URL = '/simulators/ddc-workbench.html';

const CHEVRON = '#fcu-flow .fcu-chevron';

// The first chevron's transform — the cheapest observable "is the air
// moving" fingerprint.
function chevron(page) {
    return page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return el ? el.getAttribute('transform') : null;
    }, CHEVRON);
}

// Every chevron's translate() origin, so a test can tell "laid along the
// centerline" from "piled at (0,0) because nothing ever placed them".
function positions(page) {
    return page.evaluate((sel) => Array.from(document.querySelectorAll(sel)).map((el) => {
        const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(el.getAttribute('transform') || '');
        return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
    }), CHEVRON);
}

async function waitForChevrons(page) {
    await page.waitForFunction(
        (sel) => document.querySelectorAll(sel).length > 0,
        CHEVRON,
    );
}

test.describe('DDC Workbench — air animation idle gate', () => {
    test('suspends on the Wiresheet tab and resumes on return to Unit', async ({ page }) => {
        await page.goto(URL);
        await waitForChevrons(page);

        // Arrival: the page lands in AUTO with cooling called, so the air
        // should genuinely be moving.
        const a0 = await chevron(page);
        await page.waitForTimeout(400);
        const a1 = await chevron(page);
        expect(a1, 'chevrons should march on arrival').not.toBe(a0);

        // Wiresheet up → #tab-unit loses .active → the loop must suspend.
        await page.click('.tabs.tabs-flush [data-tab="wiresheet"]');
        await page.waitForTimeout(300);          // let the in-flight frame retire
        const w0 = await chevron(page);
        await page.waitForTimeout(400);
        const w1 = await chevron(page);
        expect(w1, 'chevrons should freeze while the Unit pane is hidden').toBe(w0);

        // Back to Unit → the next hostTick (≤100 ms) must restart the loop.
        await page.click('.tabs.tabs-flush [data-tab="unit"]');
        const r0 = await chevron(page);
        await page.waitForTimeout(400);
        const r1 = await chevron(page);
        expect(r1, 'chevrons should march again after returning to Unit').not.toBe(r0);
    });

    test('chevrons are laid on the centerline, never left at the SVG origin', async ({ page }) => {
        await page.goto(URL);
        await waitForChevrons(page);

        // Chevrons are created with a `d` but no `transform`; a static
        // placement pass is what puts them on the centerline. If that ever
        // regresses they stack at (0,0) — which reads as a missing graphic,
        // not as a stopped one.
        const pts = await positions(page);
        expect(pts.length).toBeGreaterThan(4);
        expect(pts.every((p) => p !== null), 'every chevron has a transform').toBe(true);
        expect(pts.filter((p) => p.x === 0 && p.y === 0).length,
            'no chevron sits at the SVG origin').toBe(0);
        expect(new Set(pts.map((p) => p.x.toFixed(1))).size,
            'chevrons are spread along the centerline').toBeGreaterThan(2);
    });
});
