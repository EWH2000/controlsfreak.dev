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
    // Every link renders in the DOM (inside its collapsed category
    // submenu), so the count still oracles against the index.
    await expect(menu.locator('.nav-menu-item')).toHaveCount(expected);
    // To SEE one, expand its category first (signal-scaling → Signals).
    await page.click('#nav-tools-signals-toggle');
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
    await page.click('#nav-tools-hydronics-toggle');   // valve-cv → Hydronics
    await page.click('#nav-tools-menu a[href="/tools/valve-cv.html"]');
    await expect(page).toHaveURL(/\/tools\/valve-cv\.html$/);
    expect(errors, 'dropdown navigate should log no errors').toEqual([]);
});

test('dropdowns work from an inner page — 1-click cross-section nav', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/signal-scaling.html');
    await page.click('#nav-education-toggle');
    await expect(page.locator('#nav-education-menu')).toBeVisible();
    await page.click('#nav-education-fundamentals-toggle');   // pid-basics → Fundamentals
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

    // Open the longest section and expand a populated category so the
    // content overflows the cap; the sheet caps under the viewport and
    // gains its own scroll instead of growing the sticky nav past the
    // screen (the bug: page scrolled behind a pinned nav → jumpy menu
    // scrolling). Cascading menus are short collapsed, so we expand one.
    await page.click('#nav-practice-toggle');
    await expect(page.locator('#nav-practice-menu')).toBeVisible();
    await page.click('#nav-practice-hydronics-toggle');
    await expect(page.locator('#nav-practice-hydronics-sub')).toBeVisible();
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
// alphabetical scan the other labels invite. With cascading categories
// the sort is now WITHIN each category, not across the whole menu.
test('Tools dropdown sorts entries by title within each category', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.click('#nav-tools-toggle');
    const groups = page.locator('#nav-tools-menu .nav-menu-group');
    const n = await groups.count();
    expect(n, 'tools has several categories').toBeGreaterThan(2);
    for (let i = 0; i < n; i++) {
        const labels = await groups.nth(i).locator('.nav-menu-item').allTextContents();
        const sorted = [...labels].sort((a, b) => a.localeCompare(b));
        expect(labels, `category ${i} should be title-sorted`).toEqual(sorted);
    }
    expect(errors, 'title-order check should log no errors').toEqual([]);
});

// ── Cascading (level-2) category disclosure ──────────────────────────
test('a category expands its pages, one category open at a time', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.click('#nav-tools-toggle');
    const hvac = page.locator('#nav-tools-hvac-sub');
    const proto = page.locator('#nav-tools-protocols-sub');
    await expect(hvac).toBeHidden();

    await page.click('#nav-tools-hvac-toggle');
    await expect(hvac).toBeVisible();
    await expect(page.locator('#nav-tools-hvac-toggle')).toHaveAttribute('aria-expanded', 'true');

    // Opening a second category collapses the first.
    await page.click('#nav-tools-protocols-toggle');
    await expect(proto).toBeVisible();
    await expect(hvac).toBeHidden();
    await expect(page.locator('#nav-tools-hvac-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(errors, 'category disclosure should log no errors').toEqual([]);
});

test('Escape collapses an open category before closing the section', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.click('#nav-tools-toggle');
    await page.click('#nav-tools-hvac-toggle');
    await expect(page.locator('#nav-tools-hvac-sub')).toBeVisible();

    // Focus inside the open category; first Escape collapses just it.
    await page.focus('#nav-tools-hvac-sub .nav-menu-item');
    await page.keyboard.press('Escape');
    await expect(page.locator('#nav-tools-hvac-sub')).toBeHidden();
    await expect(page.locator('#nav-tools-menu')).toBeVisible();
    await expect(page.locator('#nav-tools-hvac-toggle')).toBeFocused();

    // Second Escape (focus on the category toggle) closes the section.
    await page.keyboard.press('Escape');
    await expect(page.locator('#nav-tools-menu')).toBeHidden();
    await expect(page.locator('#nav-tools-toggle')).toBeFocused();
    expect(errors, 'escape cascade should log no errors').toEqual([]);
});

// Escape on the SECTION toggle must step back one level too, not blow the
// whole section away — Shift+Tab from a category toggle can park focus on
// the section toggle with a category still open. The menu-level handler
// already steps back; this guards the toggle's own keydown path.
test('Escape on the section toggle steps back one level (category, then section)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.click('#nav-tools-toggle');
    await page.click('#nav-tools-hvac-toggle');
    await expect(page.locator('#nav-tools-hvac-sub')).toBeVisible();

    // Park focus back on the section toggle with the category still open.
    await page.focus('#nav-tools-toggle');
    await expect(page.locator('#nav-tools-toggle')).toBeFocused();
    await expect(page.locator('#nav-tools-hvac-sub')).toBeVisible();
    await expect(page.locator('#nav-tools-menu')).toBeVisible();

    // First Escape collapses only the open category; the section stays open.
    await page.keyboard.press('Escape');
    await expect(page.locator('#nav-tools-hvac-sub')).toBeHidden();
    await expect(page.locator('#nav-tools-menu')).toBeVisible();
    await expect(page.locator('#nav-tools-hvac-toggle')).toHaveAttribute('aria-expanded', 'false');

    // Second Escape (no category open now) closes the section.
    await page.keyboard.press('Escape');
    await expect(page.locator('#nav-tools-menu')).toBeHidden();
    await expect(page.locator('#nav-tools-toggle')).toBeFocused();
    expect(errors, 'section-toggle escape step-back should log no errors').toEqual([]);
});

// A blur to nothing (focusout with relatedTarget === null — a tap that
// dismisses focus, or a browser that blurs to no element) must NOT tear the
// open section down: m.item.contains(null) is false, so the guard is what
// keeps the menu alive mid-interaction. A real click outside still closes it
// via the document click listener.
test('a blur to nothing (relatedTarget null) leaves an open dropdown open', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.click('#nav-tools-toggle');
    await page.focus('#nav-tools-hvac-toggle');
    await expect(page.locator('#nav-tools-menu')).toBeVisible();

    await page.evaluate(() => document.activeElement.blur());
    await expect(page.locator('#nav-tools-menu')).toBeVisible();
    expect(errors, 'blur-to-null should log no errors').toEqual([]);
});

test('Simulators stays a flat menu (no category groups)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.click('#nav-simulators-toggle');
    const menu = page.locator('#nav-simulators-menu');
    await expect(menu).toBeVisible();
    await expect(menu.locator('.nav-menu-group')).toHaveCount(0);
    // Its links are directly visible — no category to expand first.
    await expect(menu.locator('a[href="/simulators/pid-tuner.html"]')).toBeVisible();
    expect(errors, 'flat simulators menu should log no errors').toEqual([]);
});
