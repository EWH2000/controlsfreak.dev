// #154 / content-audit #48 — the VAV coil-airflow widget's CFM/ton verdict
// must agree with the equipment-airflow tool it links to (owner-blessed
// 350/400/500 bands) and this page's own "~400 CFM/ton" prose. The widget
// used to call 350 the OK floor, so a coil at 350–400 CFM/ton read "OK" here
// while the same number read "thin" in the tool. Pin the corrected bands at
// the 400 edge, at two reachable operating points on the widget itself
// (behavioral, not a screenshot — the verdict math lives in the page IIFE).

const { test, expect } = require('@playwright/test');

test('VAV coil verdict tracks the equipment-airflow 400 CFM/ton floor (#154)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/education/vav-systems.html');
    const coil = page.locator('#vav-w-coil');

    // Design preset: all zones calling, both stages, 30,000 CFM ÷ 75 tons =
    // exactly 400 CFM/ton — the healthy floor, reads OK.
    await page.click('[data-vav-preset="design"]');
    await expect(coil).toHaveText(/^400 CFM\/ton · OK$/);

    // Slide the driving zone to its minimum at the same "all calling" load:
    // 29,200 ÷ 75 ≈ 389 CFM/ton — below 400, now reads "thin" (the tool calls
    // the same number thin/warn; the old widget wrongly said OK here).
    await page.$eval('#vav-w-zone-slider', (el) => {
        el.value = '74';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(coil).toHaveText(/^389 CFM\/ton · thin$/);

    expect(errors, 'no page errors').toEqual([]);
});
