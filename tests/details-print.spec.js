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

test('an unpaired second beforeprint does not strand the disclosures open', async ({ page }) => {
    // Nothing guarantees the two events pair. A cancelled print preview can
    // fire beforeprint a second time with no afterprint between, and on that
    // pass every disclosure the shim opened is already `open`, so the scan
    // skips it and pushes nothing. If the handler cleared its set on entry,
    // afterprint would then have nothing to restore and would leave exactly
    // those folds open forever — a leak the reader never asked for and cannot
    // see coming. Not resetting degrades the unpaired case to a duplicate
    // push at worst, which afterprint absorbs (`open = false` twice).
    await page.goto('/simulators/ddc-workbench.html');

    const after = await page.evaluate(() => {
        window.dispatchEvent(new Event('beforeprint'));
        window.dispatchEvent(new Event('beforeprint'));
        window.dispatchEvent(new Event('afterprint'));
        return [...document.querySelectorAll('details')].map((d) => d.open);
    });

    expect(after.length, 'the page still has disclosures to strand').toBeGreaterThan(0);
    expect(after.every((o) => o === false), 'the second beforeprint stranded none of them').toBe(true);
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

    // It must also be inert here — no throw, nothing to restore. An empty
    // `errors` array cannot carry that on its own: a script that 404'd, or
    // never parsed, or bound nothing produces exactly the same empty array,
    // and the assertion above only proves the <script> TAG is in the DOM.
    // So drive a probe <details> the page grows at runtime — literally the
    // 34th-page case in the header — which is a POSITIVE signal that the
    // listeners are live on a page that ships no folds of its own.
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const probe = await page.evaluate(() => {
        const d = document.body.appendChild(document.createElement('details'));
        window.dispatchEvent(new Event('beforeprint'));
        const opened = d.open;
        window.dispatchEvent(new Event('afterprint'));
        const restored = !d.open;
        d.remove();
        return { opened, restored };
    });
    expect(probe.opened, 'the site-wide listener reaches a fold this page grew at runtime').toBe(true);
    expect(probe.restored, 'and restores it when the print box closes').toBe(true);

    // pageerror delivery is async, so asserting on `errors` the instant the
    // evaluate above resolves can outrun a throw it caused. One more round
    // trip is the flush: CDP messages arrive in order on a single session,
    // so this response cannot precede an exception raised before it was sent.
    // It doubles as the probe's cleanup check.
    expect(await page.evaluate(() => document.querySelectorAll('details').length),
        'the probe left nothing behind').toBe(0);
    expect(errors, 'printing a page with no disclosures is a no-op').toEqual([]);
});
