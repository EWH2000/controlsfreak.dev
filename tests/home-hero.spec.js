const { test, expect } = require('@playwright/test');

// Shared with the other specs: capture pageerror + console.error.
function watchErrors(page) {
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    return errors;
}

test('hero quick-tools strip links to the top tools', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    const strip = page.locator('.hero-quicktools');
    await expect(strip.locator('a[href="/tools/signal-scaling.html"]')).toBeVisible();
    await expect(strip.locator('a[href="/tools/bacnet-ip-converter.html"]')).toBeVisible();
    await expect(strip.locator('a[href="/tools/thermistor-calculator.html"]')).toBeVisible();
    await expect(strip.locator('a[href="/tools/psychrometric-chart.html"]')).toBeVisible();
    await expect(strip.locator('a[href="/tools/"]')).toBeVisible();
    expect(errors, 'quick-tools should log no errors').toEqual([]);
});

test('hero interactive loop — the slider drives the setpoint and the loop chases it', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');

    // Drive the slider to its max. The output + the device setpoint LCD
    // update immediately (proves the slider owns the loop's setpoint).
    await page.locator('#hero-sp').evaluate((el) => {
        el.value = '58';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#hero-sp-out')).toHaveText(/58\.0/);
    await expect(page.locator('#hero-lcd-sp')).toContainText('58.0');
    // aria-valuetext is what a screen reader announces for the range.
    await expect(page.locator('#hero-sp')).toHaveAttribute('aria-valuetext', /58\.0/);

    // The supply-air PV chases the new (out-of-demo-range) target — proves
    // the loop responds to the user, not just the auto-demo.
    await expect.poll(async () => {
        const t = await page.locator('#hero-readout').textContent();
        const m = t.match(/supply air ([\d.]+)/);
        return m ? parseFloat(m[1]) : 0;
    }, { timeout: 8000, message: 'PV should climb toward the 58 °F setpoint' }).toBeGreaterThanOrEqual(56);

    expect(errors, 'interactive loop should log no errors').toEqual([]);
});

test('hero PID Tuner link resolves to the simulator', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.click('.hseam-tuner-link');
    await expect(page).toHaveURL(/\/simulators\/pid-tuner\.html$/);
    expect(errors, 'tuner link should log no errors').toEqual([]);
});

test('Tools-by-category card deep-links into the pre-filtered Tools page', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.click('.card-grid a[href="/tools/#hvac"]');
    await expect(page).toHaveURL(/\/tools\/#hvac$/);
    // The Tools landing reads the hash and applies the filter on load.
    await expect(page.locator('.filter-chip[data-category="hvac"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.nav-card:not([hidden])')).toHaveCount(6);
    expect(errors, 'category deep-link should log no errors').toEqual([]);
});

// audit-2026-06 #5 (owner decision): the WHOLE hero follows the units
// toggle — tree, readout, slider output, aria-valuetext, packet, and
// the device LCDs (this hero deliberately opts out of the pid-tuner's
// LCD-stays-canonical convention).
test('hero converts every surface for a metric visitor', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('cf_units', 'metric'));
    await page.goto('/');
    for (const id of ['hero-tree-sat', 'hero-tree-sp', 'hero-sp-out', 'hero-readout', 'hero-packet-val']) {
        await expect(page.locator('#' + id)).toContainText('°C');
        await expect(page.locator('#' + id)).not.toContainText('°F');
    }
    await expect(page.locator('#hero-lcd-sat')).toContainText('°C');
    await expect(page.locator('#hero-sp')).toHaveAttribute('aria-valuetext', /°C/);

    // Mid-visit flip back to US repaints everything.
    await page.click('.units-btn[data-units="us"]');
    await expect(page.locator('#hero-tree-sat')).toContainText('°F');
    await expect(page.locator('#hero-sp')).toHaveAttribute('aria-valuetext', /°F/);
});
