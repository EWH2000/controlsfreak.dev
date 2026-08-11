// Regression tests for /scripts/details-print.js — every <details> on
// the site prints OPEN (owner ruling 2026-08-10).
//
// Why this needs a guard at all: the failure is INVISIBLE on screen. A
// disclosure that prints closed looks perfect in the browser and simply
// drops its content on paper, with no cue to the reader that anything
// is missing. Nothing else in the suite would notice — and nothing did,
// for as long as the three idioms existed.
//
// The site runs three of them, and the count is the reason the shim is
// site-wide rather than per-page:
//   * details.tool-preamble — 30 tool pages
//   * .pid-spoiler          — simulators/pid-tuner.html
//   * details.prose-fold    — the two DDC Workbench pages
// A per-page <script> tag would have to be remembered 33 times, and the
// 34th page would print closed with nothing failing. So this file also
// pins the WIRING (the layout loads it) alongside the behaviour — a
// page with no <details> is the case that proves it is not per-page.
//
// Driving it: page.emulateMedia({ media: 'print' }) applies print
// STYLESHEETS but fires neither event, so these tests dispatch
// beforeprint / afterprint directly. That is the same code path the
// print dialog takes.

const { test, expect } = require('@playwright/test');

// One page per idiom. Names are for the test title only.
const IDIOMS = [
    { idiom: 'details.tool-preamble', url: '/tools/signal-scaling.html' },
    { idiom: '.pid-spoiler', url: '/simulators/pid-tuner.html' },
    { idiom: 'details.prose-fold', url: '/simulators/ddc-workbench.html' },
];

for (const { idiom, url } of IDIOMS) {
    test(`print opens the disclosures and restores them — ${idiom}`, async ({ page }) => {
        await page.goto(url);

        const closedOnLoad = await page.evaluate(() =>
            [...document.querySelectorAll('details')].map((d) => d.open));
        expect(closedOnLoad.length, `${url} has at least one <details>`).toBeGreaterThan(0);
        expect(closedOnLoad.every((o) => o === false), 'all ship closed').toBe(true);

        const during = await page.evaluate(() => {
            window.dispatchEvent(new Event('beforeprint'));
            return [...document.querySelectorAll('details')].every((d) => d.open);
        });
        expect(during, 'every disclosure is open inside the print box').toBe(true);

        const after = await page.evaluate(() => {
            window.dispatchEvent(new Event('afterprint'));
            return [...document.querySelectorAll('details')].map((d) => d.open);
        });
        expect(after.every((o) => o === false), 'and closed again afterward').toBe(true);
    });
}

test('a disclosure the reader opened stays open after printing', async ({ page }) => {
    // The half that a naive "close everything on afterprint" shim gets
    // wrong: it would silently collapse whatever the reader had open.
    await page.goto('/simulators/ddc-workbench.html');

    await page.evaluate(() => { document.getElementById('ddcw-fold-econ-permit').open = true; });

    const after = await page.evaluate(() => {
        window.dispatchEvent(new Event('beforeprint'));
        window.dispatchEvent(new Event('afterprint'));
        return Object.fromEntries(
            [...document.querySelectorAll('details.prose-fold')].map((d) => [d.id, d.open]));
    });

    expect(after['ddcw-fold-econ-permit'], 'the reader opened it, so it stays open').toBe(true);
    expect(after['ddcw-fold-lls-numbers'], 'the shim closes what the shim opened').toBe(false);
    expect(after['ddcw-fold-lls-defeats'], 'the shim closes what the shim opened').toBe(false);
});

test('the shim is wired site-wide, not per-page', async ({ page }) => {
    // The home page carries no <details> at all. If the script is there,
    // it came from layouts/page.njk — which is the only way the 34th page
    // to grow a disclosure inherits the behaviour.
    await page.goto('/');

    const wiring = await page.evaluate(() => ({
        loaded: !!document.querySelector('script[src*="/scripts/details-print.js"]'),
        details: document.querySelectorAll('details').length,
    }));
    expect(wiring.loaded, 'the layout loads details-print.js on a page with no folds').toBe(true);
    expect(wiring.details, 'and this page genuinely has no <details>').toBe(0);

    // It must also be inert here — no throw, nothing to restore.
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.evaluate(() => {
        window.dispatchEvent(new Event('beforeprint'));
        window.dispatchEvent(new Event('afterprint'));
    });
    expect(errors, 'printing a page with no disclosures is a no-op').toEqual([]);
});
