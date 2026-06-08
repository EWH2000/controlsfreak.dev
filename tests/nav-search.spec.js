const { test, expect } = require('@playwright/test');

// Shared with smoke.spec.js: capture pageerror + console.error so an
// error during a real interaction can't slip past a green assertion.
function watchErrors(page) {
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    return errors;
}

test('search-index.json is valid and stays in sync with the sitemap', () => {
    // Both /search-index.json (searchPages) and /sitemap.xml (sitemapPages)
    // are built from the same "has a canonical" filter, so a drift between
    // their counts means the index silently lost (or gained) pages. Read
    // the build output — the webServer in playwright.config.js builds _site/
    // before the run.
    const fs = require('fs');
    const index = JSON.parse(fs.readFileSync('_site/search-index.json', 'utf8'));
    const sitemap = fs.readFileSync('_site/sitemap.xml', 'utf8');
    const locCount = [...sitemap.matchAll(/<loc>/g)].length;

    expect(Array.isArray(index), 'index parses as an array').toBe(true);
    expect(index.length, 'one index entry per sitemap <loc>').toBe(locCount);
    for (const entry of index) {
        expect(entry.title, 'every entry has a title').toBeTruthy();
        expect(entry.url, 'every entry has a url').toMatch(/^\//);
        expect(entry).toHaveProperty('section');
        expect(entry).toHaveProperty('keywords');
    }
    // The clean title strips the " — controlsfreak.dev" suffix.
    const sig = index.find((e) => e.url === '/tools/signal-scaling.html');
    expect(sig.title).toBe('Signal Scaling Calculator');
});

test('"/" opens the palette and Enter navigates to the first result', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');

    // Slash on the body (not in a field) opens the modal and focuses the input.
    await expect(page.locator('#palette')).toBeHidden();
    await page.keyboard.press('/');
    await expect(page.locator('#palette')).toBeVisible();
    await expect(page.locator('#palette-input')).toBeFocused();

    // Type a query → the first result is Signal Scaling; Enter navigates.
    await page.fill('#palette-input', 'signal scaling');
    const first = page.locator('.palette-result').first();
    await expect(first).toContainText('Signal Scaling');
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/tools\/signal-scaling\.html$/);

    expect(errors, 'palette open/navigate should log no errors').toEqual([]);
});

test('keyword synonyms match (4-20mA finds Signal Scaling)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.keyboard.press('/');
    // "4-20mA" lives only in the keywords frontmatter (the description has
    // "4-20 mA" with a space), so a hit proves the synonym channel works.
    await page.fill('#palette-input', '4-20mA');
    await expect(page.locator('.palette-result').first()).toContainText('Signal Scaling');
    expect(errors, 'keyword-synonym search should log no errors').toEqual([]);
});

test('Ctrl+K opens; Escape closes and restores focus to the trigger', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');

    // Open via the visible nav button so focus restoration is deterministic.
    await page.click('#nav-search-btn');
    await expect(page.locator('#palette')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#palette')).toBeHidden();
    await expect(page.locator('#nav-search-btn')).toBeFocused();

    // Ctrl+K also opens it.
    await page.keyboard.press('Control+k');
    await expect(page.locator('#palette')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#palette')).toBeHidden();

    expect(errors, 'ctrl-k / escape should log no errors').toEqual([]);
});

test('"/" inside a tool input types normally and does NOT open the palette', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/signal-scaling.html');

    // Focus a real form field, then press "/" — the guard keeps the palette
    // shut so the slash reaches the input instead of hijacking the keystroke.
    const field = page.locator('main input').first();
    await field.focus();
    await page.keyboard.press('/');
    await expect(page.locator('#palette')).toBeHidden();

    expect(errors, 'slash-in-field guard should log no errors').toEqual([]);
});
