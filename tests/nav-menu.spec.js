const { test, expect } = require('@playwright/test');
const fs = require('fs');

// Shared with the other specs: capture pageerror + console.error.
function watchErrors(page) {
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    return errors;
}

test('Tools dropdown lists every tool and stays in sync with the index', async ({ page }) => {
    const errors = watchErrors(page);
    // The menu is built from navTools (nav:tools minus the landing); the
    // search index carries the same section tag, so it's the drift oracle.
    const index = JSON.parse(fs.readFileSync('_site/search-index.json', 'utf8'));
    const expected = index.filter((e) => e.section === 'tools' && e.url !== '/tools/').length;
    expect(expected, 'sanity: there are tools to list').toBeGreaterThan(10);

    await page.goto('/');
    const toggle = page.locator('#nav-tools-toggle');
    const menu = page.locator('#nav-tools-menu');
    await expect(menu).toBeHidden();

    await toggle.click();
    await expect(menu).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(menu.locator('.nav-menu-item')).toHaveCount(expected);
    await expect(menu.locator('a[href="/tools/signal-scaling.html"]')).toBeVisible();

    expect(errors, 'tools dropdown should log no errors').toEqual([]);
});

test('Escape closes the dropdown and restores focus to the toggle', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.click('#nav-tools-toggle');
    await expect(page.locator('#nav-tools-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#nav-tools-menu')).toBeHidden();
    await expect(page.locator('#nav-tools-toggle')).toBeFocused();
    expect(errors, 'escape-close should log no errors').toEqual([]);
});

test('opening one section dropdown closes the others (one at a time)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.click('#nav-tools-toggle');
    await expect(page.locator('#nav-tools-menu')).toBeVisible();
    await page.click('#nav-simulators-toggle');
    await expect(page.locator('#nav-simulators-menu')).toBeVisible();
    await expect(page.locator('#nav-tools-menu')).toBeHidden();
    expect(errors, 'one-at-a-time should log no errors').toEqual([]);
});

test('clicking a dropdown item navigates to the tool', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.click('#nav-tools-toggle');
    await page.click('#nav-tools-menu a[href="/tools/valve-cv.html"]');
    await expect(page).toHaveURL(/\/tools\/valve-cv\.html$/);
    expect(errors, 'dropdown navigate should log no errors').toEqual([]);
});

test('dropdowns work from an inner page — 1-click cross-section nav', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/signal-scaling.html');
    await page.click('#nav-education-toggle');
    await expect(page.locator('#nav-education-menu')).toBeVisible();
    await page.click('#nav-education-menu a[href="/education/pid-basics.html"]');
    await expect(page).toHaveURL(/\/education\/pid-basics\.html$/);
    expect(errors, 'cross-section nav should log no errors').toEqual([]);
});
