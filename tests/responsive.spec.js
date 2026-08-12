// Viewport-responsive LAYOUT contracts (audit-2026-06 #40). The rest
// of the suite runs at Playwright's default 1280×720, where no
// responsive block applies — so a media query dead on source order
// (audit #23: the RESPONSIVE block preceded the components it tried to
// override) shipped green. These tests pin the collapse contracts via
// computed styles at a phone viewport; the .pid-controls track-count
// assertion was verified to fail against the pre-#23 build.

const { test, expect } = require('@playwright/test');

const PAGES = require('./pages.js');

const PHONE = { width: 375, height: 667 };
const PHONE_SE = { width: 320, height: 568 };

// styleguide.html is noindex (not in the sitemap, so not in PAGES) but
// is the living design-system reference — sweep it explicitly.
const SWEEP_PAGES = [...PAGES, { name: 'styleguide', url: '/styleguide.html' }];

// The phone-overflow-sweep fix set (2026-07): pages that clipped at
// 320-class widths get pinned there too. Contact stays 375-only — its
// Turnstile widget's fixed ~300px width clips a few px of widget
// chrome at 320, accepted (codebase-issues #146).
const PHONE_SE_PAGES = [
    '/tools/bacnet-objects.html',
    '/tools/modbus-functions.html',
    '/tools/modbus-register-viewer.html',
    '/tools/electrical-quick-calc.html',
    '/education/bacnet-mstp.html',
    '/education/vfds.html',
    '/education/balancing.html',
    '/education/equipment-staging.html',
    '/simulators/vfd-mock.html',
    '/practice/wiresheet-traces.html',
    '/styleguide.html',
];

// Overflow that is by design and must not fail the sweep:
// - input/textarea/select scroll their value natively;
// - .sr-only is the clip-rect screen-reader utility;
// - .hp-field is the contact form's off-screen honeypot;
// - .cf-turnstile is the fixed-width Cloudflare widget (see #146);
// - .ddcw-offprog.is-empty is the workbench off-program window
//   collapsed to a 1px overflow-hidden box while every point follows
//   the program — its label is clipped BY DESIGN (the workbench pages'
//   own hand-written sweeps carry the same exemption);
// - anything inside a .table-scroll wrapper scrolls on purpose.
const INTENTIONAL = 'input, textarea, select, .sr-only, .hp-field, .cf-turnstile, '
    + '.ddcw-offprog.is-empty';

// Report every element whose content is genuinely cut off: wider
// content than box, overflow-x hidden/clip, not on the intentional
// list. Non-default tab panes and closed <details> are forced open
// first — the worst historical offender (the BACnet Property IDs
// table) lived in a non-default tab.
async function clippedOffenders(page) {
    return page.evaluate((intentional) => {
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('active'));
        document.querySelectorAll('details').forEach(d => { d.open = true; });
        const out = [];
        const doc = document.documentElement;
        if (doc.scrollWidth > window.innerWidth + 1) {
            out.push(`document scrolls sideways (${doc.scrollWidth} > ${window.innerWidth})`);
        }
        for (const el of document.querySelectorAll('body *')) {
            if (el.clientWidth === 0 || el.scrollWidth <= el.clientWidth + 2) continue;
            if (el.matches(intentional) || el.closest('.table-scroll')) continue;
            const ox = getComputedStyle(el).overflowX;
            if (ox !== 'hidden' && ox !== 'clip') continue;
            let name = el.tagName.toLowerCase();
            if (el.id) name += '#' + el.id;
            else if (el.classList.length) name += '.' + [...el.classList].slice(0, 3).join('.');
            out.push(`${name} clips ${el.scrollWidth}px into ${el.clientWidth}px`);
        }
        return out;
    }, INTENTIONAL);
}

test.describe('no clipped sideways overflow at 375 (every page)', () => {
    test.use({ viewport: PHONE });
    for (const { name, url } of SWEEP_PAGES) {
        test(`${name} fits at 375`, async ({ page }) => {
            await page.goto(url, url === '/contact.html'
                ? { waitUntil: 'domcontentloaded' } : undefined);
            expect(await clippedOffenders(page), `${url} clips content at 375px`).toEqual([]);
        });
    }
});

test.describe('no clipped sideways overflow at 320 (fixed cluster)', () => {
    test.use({ viewport: PHONE_SE });
    for (const url of PHONE_SE_PAGES) {
        test(`${url} fits at 320`, async ({ page }) => {
            await page.goto(url);
            expect(await clippedOffenders(page), `${url} clips content at 320px`).toEqual([]);
        });
    }
});

// gridTemplateColumns computes to a space-separated track list
// ("293px" collapsed, "82.6px 82.6px 82.6px" not) — count the tracks.
async function gridTrackCount(page, selector) {
    return page.$eval(selector, el =>
        getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
}

test.describe('phone collapse contracts (375×667)', () => {
    test.use({ viewport: PHONE });

    test('pid-tuner: sliders stack, equipment strip stacks, spoiler table fits', async ({ page }) => {
        await page.goto('/simulators/pid-tuner.html');

        // The three tuning sliders collapse to one full-width column
        // (pre-#23 this computed three ~82px columns).
        expect(await gridTrackCount(page, '.pid-controls')).toBe(1);

        // The controller → scene → sensor strip goes vertical at ≤700px.
        await expect(page.locator('.pid-eq-row').first()).toHaveCSS('flex-direction', 'column');

        // The narrow-width canvas + ref-table overrides apply (both were
        // dead on source order pre-#23).
        await expect(page.locator('.sim-canvas-wrap canvas').first()).toHaveCSS('height', '200px');
        const spoiler = page.locator('.pid-spoiler');
        await spoiler.locator('summary').click();
        // 0.78rem = 12.48px — the phone shrink was retuned from 0.76rem
        // when #290 put a 0.78rem floor under prose-length text. The
        // assertion is that the ≤620px override APPLIES at all (it was
        // dead on source order pre-#23); the literal tracks that floor.
        await expect(spoiler.locator('.ref-table')).toHaveCSS('font-size', '12.48px');

        // Audit #26: the open spoiler's 4-column table must not bleed
        // through the card border — it either fits or scrolls inside
        // its .table-scroll wrapper.
        const fits = await spoiler.locator('.table-scroll').evaluate(el =>
            el.scrollWidth <= el.clientWidth || getComputedStyle(el).overflowX === 'auto');
        expect(fits).toBe(true);
    });

    test('tool column grids collapse to a single stack', async ({ page }) => {
        // 2-col (collapses ≤900px) — signal-scaling is the canonical tool.
        await page.goto('/tools/signal-scaling.html');
        expect(await gridTrackCount(page, '.tool-body-2col')).toBe(1);

        // 3-col (collapses ≤1000px).
        await page.goto('/tools/thermistor-calculator.html');
        expect(await gridTrackCount(page, '.tool-body-3col')).toBe(1);
    });

    test('no sideways scroll on representative content pages', async ({ page }) => {
        for (const path of [
            '/simulators/pid-tuner.html',
            '/tools/signal-scaling.html',
            '/education/hydronic-loops.html',
        ]) {
            await page.goto(path);
            const widths = await page.evaluate(() => ({
                scroll: document.documentElement.scrollWidth,
                client: document.documentElement.clientWidth,
            }));
            expect(widths.scroll, `${path} must not scroll sideways`).toBeLessThanOrEqual(widths.client);
        }
    });
});

// The desktop side of the same contracts — guards against the inverse
// regression (a fold-in accidentally collapsing wide layouts).
test.describe('desktop keeps the multi-column layouts (1280×720)', () => {
    test('grids stay multi-column and the strip stays horizontal', async ({ page }) => {
        await page.goto('/simulators/pid-tuner.html');
        expect(await gridTrackCount(page, '.pid-controls')).toBe(3);
        await expect(page.locator('.pid-eq-row').first()).toHaveCSS('flex-direction', 'row');

        await page.goto('/tools/signal-scaling.html');
        expect(await gridTrackCount(page, '.tool-body-2col')).toBe(2);

        await page.goto('/tools/thermistor-calculator.html');
        expect(await gridTrackCount(page, '.tool-body-3col')).toBe(3);
    });
});
