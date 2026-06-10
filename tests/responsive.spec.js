// Viewport-responsive LAYOUT contracts (audit-2026-06 #40). The rest
// of the suite runs at Playwright's default 1280×720, where no
// responsive block applies — so a media query dead on source order
// (audit #23: the RESPONSIVE block preceded the components it tried to
// override) shipped green. These tests pin the collapse contracts via
// computed styles at a phone viewport; the .pid-controls track-count
// assertion was verified to fail against the pre-#23 build.

const { test, expect } = require('@playwright/test');

const PHONE = { width: 375, height: 667 };

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
        await expect(spoiler.locator('.ref-table')).toHaveCSS('font-size', '12.16px');

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
