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

test('mobile: hamburger collapses the header and toggles the sheet', async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 412, height: 883 });   // S25-class width
    await page.goto('/');
    const links = page.locator('#site-nav-links');
    const burger = page.locator('#nav-hamburger');

    // Collapsed by default → compact header (was ~52% of the viewport).
    await expect(burger).toBeVisible();
    await expect(links).toBeHidden();
    const navH = await page.locator('nav.site-nav').evaluate((el) => el.getBoundingClientRect().height);
    expect(navH, 'collapsed mobile nav should be compact, not half the screen').toBeLessThan(100);

    // Open → links show; aria-expanded flips; a sub-dropdown still works.
    await burger.click();
    await expect(links).toBeVisible();
    await expect(burger).toHaveAttribute('aria-expanded', 'true');
    await page.click('#nav-tools-toggle');
    await expect(page.locator('#nav-tools-menu')).toBeVisible();

    // Close via the burger.
    await burger.click();
    await expect(links).toBeHidden();
    expect(errors, 'mobile hamburger should log no errors').toEqual([]);
});

test('mobile: the top-bar search icon opens the palette', async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 412, height: 883 });
    await page.goto('/');
    // The labelled search is hidden on mobile; the compact icon covers it.
    await page.click('.nav-search-btn--mobile');
    await expect(page.locator('#palette')).toBeVisible();
    expect(errors, 'mobile search icon should log no errors').toEqual([]);
});

test('mobile: open sheet locks page scroll and scrolls internally on long lists', async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 412, height: 640 });   // short enough to force overflow
    await page.goto('/');
    await page.click('#nav-hamburger');
    await expect(page.locator('#site-nav-links')).toBeVisible();

    // Page scroll is locked while the sheet is open.
    await expect(page.locator('body')).toHaveClass(/nav-sheet-open/);

    // Open the longest section; the sheet caps under the viewport and gains
    // its own scroll instead of growing the sticky nav past the screen
    // (the bug: page scrolled behind a pinned nav → jumpy menu scrolling).
    await page.click('#nav-education-toggle');
    await expect(page.locator('#nav-education-menu')).toBeVisible();
    const m = await page.locator('#site-nav-links').evaluate((el) => ({
        client: el.clientHeight, scroll: el.scrollHeight, vh: window.innerHeight,
        clientW: el.clientWidth, scrollW: el.scrollWidth,
        docW: document.documentElement.scrollWidth, innerW: window.innerWidth
    }));
    expect(m.client, 'sheet is capped under the viewport').toBeLessThan(m.vh);
    expect(m.scroll, 'a long list overflows the cap → internal scroll').toBeGreaterThan(m.client);
    // No sideways scroll: the capped column must not wrap into a second
    // column off to the right (regression guard for the flex-wrap bug).
    expect(m.scrollW, 'sheet must not overflow horizontally').toBeLessThanOrEqual(m.clientW + 1);
    expect(m.docW, 'document must not widen past the viewport').toBeLessThanOrEqual(m.innerW + 1);

    // Closing releases the lock.
    await page.click('#nav-hamburger');
    await expect(page.locator('body')).not.toHaveClass(/nav-sheet-open/);
    expect(errors, 'mobile sheet scroll should log no errors').toEqual([]);
});

// audit-2026-06 #6: the sheet renders before the burger in DOM order, so
// forward Tab from the burger used to land in the page BEHIND the
// scroll-locked sheet — invisible focus the page won't scroll to. The
// sheet is now entered by moving focus to its first item on open, and
// focus comes home to the burger on close.
test('mobile: opening the sheet moves focus into it; closing hands focus back to the burger', async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 412, height: 883 });
    await page.goto('/');

    await page.click('#nav-hamburger');
    const first = page.locator('#site-nav-links a, #site-nav-links button').first();
    await expect(first).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('.site-nav')).not.toHaveClass(/nav-open/);
    await expect(page.locator('#nav-hamburger')).toBeFocused();

    expect(errors, 'sheet focus management should log no errors').toEqual([]);
});

// The dropdowns sort by visible title (codebase-issues #88) — the old
// slug sort filed "Pump & Fan Affinity Laws" first, breaking the
// alphabetical scan the other 13 labels invite.
test('Tools dropdown lists entries in title order', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.click('#nav-tools-toggle');
    const labels = await page.locator('#nav-tools-menu .nav-menu-item').allTextContents();
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sorted);
    expect(labels[0]).not.toContain('Affinity');
    expect(errors, 'title-order check should log no errors').toEqual([]);
});
