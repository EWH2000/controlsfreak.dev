// Pins for the audit-2026-06 machine-sweep conformance batch
// (#54 print tokens, #55 chrome markup, #56 palette input, #57 log
// role, #14 SVG strokes + the landmark/row-header polish).

const { test, expect } = require('@playwright/test');

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    return errors;
}

test('printing from the dark theme uses the light token set (#54)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.addInitScript(() => localStorage.setItem('cf_theme', 'dark'));
    await page.emulateMedia({ media: 'print' });
    await page.goto('/education/hydronic-loops.html');
    const probe = await page.evaluate(() => ({
        theme: document.documentElement.dataset.theme,
        body: getComputedStyle(document.body).color,
        bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
    }));
    // Theme attribute stays dark; the print block overrides the tokens.
    expect(probe.theme).toBe('dark');
    expect(probe.body).toBe('rgb(56, 66, 58)');   // light --text ink
    expect(probe.bg).toBe('#eef1ec');             // light --bg
    expect(errors, 'print emulation should log no errors').toEqual([]);
});

test('nav chrome markup: div wrappers, no redundant menu labels (#55)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    // The four section wrappers (Tools / Simulators / Education /
    // Practice) are flow-content divs now — a div nested in a span was a
    // conformance error on all 66 pages.
    await expect(page.locator('div.nav-item--has-menu')).toHaveCount(4);
    await expect(page.locator('span.nav-item--has-menu')).toHaveCount(0);
    // The role-less menu containers dropped their ignored aria-labels
    // (the toggle buttons carry the accessible names).
    expect(await page.locator('.nav-menu[aria-label]').count()).toBe(0);
    expect(errors, 'nav markup should log no errors').toEqual([]);
});

test('palette input is a conformant combobox (#56)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    const input = page.locator('#palette-input');
    // type=text (role override on type=search is spec-disallowed), with
    // the mobile search keyboard preserved.
    await expect(input).toHaveAttribute('type', 'text');
    await expect(input).toHaveAttribute('role', 'combobox');
    await expect(input).toHaveAttribute('inputmode', 'search');
    // No empty aria-activedescendant when nothing is active — the
    // attribute is absent, not ''.
    expect(await input.getAttribute('aria-activedescendant')).toBeNull();
    // And it appears once an option is active.
    await page.keyboard.press('/');
    await input.fill('signal');
    await expect(input).toHaveAttribute('aria-activedescendant', /palette-opt-/);
    await page.keyboard.press('Escape');
    expect(await input.getAttribute('aria-activedescendant')).toBeNull();
    expect(errors, 'palette combobox should log no errors').toEqual([]);
});

test('staging event log: role=log on the wrapper, the list stays a list (#57)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/simulators/staging-sequencer.html');
    await expect(page.locator('.stg-log-wrap')).toHaveAttribute('role', 'log');
    await expect(page.locator('.stg-log-wrap')).toHaveAttribute('aria-live', 'polite');
    expect(await page.locator('#stg-log[role]').count()).toBe(0);
    // #55's other half: the unit strip's label is exposed via role=group.
    await expect(page.locator('#stg-units')).toHaveAttribute('role', 'group');
    expect(errors, 'staging log roles should log no errors').toEqual([]);
});

test('meaning-carrying SVG strokes use --text-dim, not --border (#14)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/simulators/pid-tuner.html');
    const dimColor = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--text-dim').trim());
    const duct = await page.locator('.pid-eq-duct').first().evaluate(el => getComputedStyle(el).stroke);
    // Both resolve through the same token — compare via a probe element.
    const dimRgb = await page.evaluate((c) => {
        const el = document.createElement('div');
        el.style.color = c;
        document.body.appendChild(el);
        const v = getComputedStyle(el).color;
        el.remove();
        return v;
    }, dimColor);
    expect(duct).toBe(dimRgb);
    expect(errors, 'svg stroke check should log no errors').toEqual([]);
});

test('psy stage table exposes row headers (#polish)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/psychrometric-chart.html');
    await expect(page.locator('#psy-stage-table thead th').first()).toHaveText('Stage');
    const rowHeaders = page.locator('#psy-stage-table tbody th[scope="row"]');
    expect(await rowHeaders.count()).toBeGreaterThanOrEqual(4);
    await expect(rowHeaders.first()).toHaveText('OA');
    expect(errors, 'stage table should log no errors').toEqual([]);
});
