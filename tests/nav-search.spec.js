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

// audit-2026-06 #17 + #15: short tokens used to match mid-word
// substrings ("fla" → cloudFLAre noise only) while the pages that
// actually cover FLA had no keywords and were unreachable, and core
// field vocabulary ("40001", "pt chart", "ms/tp") returned nothing.
test('field-vocabulary queries resolve, short tokens skip mid-word noise', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.keyboard.press('/');

    const titles = async (q) => {
        await page.fill('#palette-input', q);
        await expect(page.locator('#palette-status')).not.toHaveText('No matches');
        return page.evaluate(() =>
            [...document.querySelectorAll('.palette-result-title')].map((e) => e.textContent));
    };

    // "fla": the genuine FLA pages lead — the multifunction electrical
    // calc (a Motor FLA tab) and the VFD pages; the privacy page
    // (cloudFLAre — a mid-word hit) no longer appears at all.
    const fla = await titles('fla');
    expect(fla[0]).toMatch(/Electrical|VFD/);
    expect(fla.join('|')).toContain('Field Electrical Quick Calc');
    expect(fla.join('|')).toContain('VFDs');
    expect(fla.join('|')).not.toContain('Privacy');

    // The audit's dead field-vocabulary queries now land on the right
    // pages via the keywords sweep.
    expect((await titles('40001'))[0]).toContain('Modbus Register Viewer');
    expect((await titles('pt chart'))[0]).toContain('Refrigerant P-T');
    // 'ms/tp' top-ranked BACnet Networking until the dedicated lesson
    // shipped (2026-06-10); the more specific page winning is the point.
    expect((await titles('ms/tp'))[0]).toContain('BACnet MS/TP');
    expect((await titles('endian'))[0]).toContain('Modbus');

    // Word-START boundary (not whole-word) keeps incremental typing
    // alive — three typed chars of "signal" still find the tool.
    expect((await titles('sig')).join('|')).toContain('Signal Scaling');

    expect(errors, 'search vocabulary should log no errors').toEqual([]);
});

// codebase-issues #121: the modal palette must inert the rest of the page
// while open — aria-modal="true" was asserted but the background stayed
// perceivable/navigable to AT browse-mode users.
test('opening the palette inerts the background; closing restores it (#121)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');

    const main = page.locator('main#main');
    await expect(main).not.toHaveAttribute('inert', /.*/);   // not inert when closed

    await page.keyboard.press('/');
    await expect(page.locator('#palette')).toBeVisible();
    // The background is inert; the palette dialog itself is not.
    await expect(main).toHaveAttribute('inert', '');
    await expect(page.locator('#palette')).not.toHaveAttribute('inert', /.*/);

    await page.keyboard.press('Escape');
    await expect(page.locator('#palette')).toBeHidden();
    await expect(main).not.toHaveAttribute('inert', /.*/);   // restored on close

    expect(errors, 'inert toggle should log no errors').toEqual([]);
});

// codebase-issues #119: a transient index-fetch failure used to cache an
// empty index for the page lifetime (entries=[] is truthy → never retried)
// and surface a misleading "No matches". Now it shows a real status and
// retries on the next open. (No watchErrors — the deliberate abort logs
// expected network noise.)
test('a failed index load shows a real status and retries on reopen (#119)', async ({ page }) => {
    let failNext = true;
    await page.route('**/search-index.json', (route) => {
        if (failNext) { failNext = false; return route.abort(); }
        return route.continue();
    });
    await page.goto('/');

    await page.keyboard.press('/');
    await page.fill('#palette-input', 'signal');
    // First open: the fetch was aborted — a real "unavailable" status, not
    // a misleading "No matches".
    await expect(page.locator('#palette-status')).toContainText('unavailable');

    // Reopen (Ctrl+K — opens regardless of where focus landed on close):
    // load() retries (entries was left null), the second fetch succeeds,
    // and real results appear.
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+k');
    await page.fill('#palette-input', 'signal');
    await expect(page.locator('.palette-result').first()).toContainText('Signal Scaling');
});

// codebase-issues #127: the palette's Escape is a capture-phase handler
// that stopPropagation()s; nav-menu.js has a bubble-phase Escape backstop.
// The two can't actually conflict because opening the palette grabs focus
// (closing any open nav dropdown via its focusout handler) AND inerts the
// background (#121) — so they're never simultaneously open. This pins that
// structural invariant plus the capture-phase Escape closing ONLY the
// palette, which is what makes the ordering safe.
test('opening the palette closes an open nav dropdown; Escape closes only the palette (#127)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');

    await page.click('#nav-tools-toggle');
    await expect(page.locator('#nav-tools-menu')).toBeVisible();

    // Open the palette over it — the dropdown closes (focus moved to the
    // palette input + the background is inert), so the two never coexist.
    await page.keyboard.press('Control+k');
    await expect(page.locator('#palette')).toBeVisible();
    await expect(page.locator('#nav-tools-menu')).toBeHidden();

    // Capture-phase Escape closes the palette and stops propagation, so the
    // nav-menu bubble backstop never fires and nothing reopens.
    await page.keyboard.press('Escape');
    await expect(page.locator('#palette')).toBeHidden();
    await expect(page.locator('#nav-tools-menu')).toBeHidden();

    expect(errors, 'palette/nav Escape coexistence should log no errors').toEqual([]);
});

// codebase-issues #82: tools carry a score-level section bonus, so a
// tool-shaped query puts the tool first — "superheat" used to rank the
// calculator third, under the lesson and quiz.
test('tool-shaped queries rank the tool first; lesson-only queries unaffected', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.keyboard.press('/');

    const first = async (q) => {
        await page.fill('#palette-input', q);
        await expect(page.locator('#palette-status')).not.toHaveText('No matches');
        return page.locator('.palette-result').first().locator('.palette-result-title').textContent();
    };

    expect(await first('superheat')).toContain('Calculator');
    expect(await first('psychrometric')).toContain('Chart');
    // The Hydronic Loop Builder simulator is a direct title match and now leads
    // "hydronic" (before it shipped, the Hydronic Loops lesson did) — the most
    // relevant Hydronic page wins, not a tangentially-related tool.
    expect(await first('hydronic')).toContain('Hydronic Loop Builder');
    expect(await page.locator('.palette-result').first().locator('.palette-result-tag').textContent()).toBe('Simulator');
    // A lesson-led topic still leads with its lesson — the builder's keyword hit
    // on "balancing" doesn't hijack a non-tool-shaped query.
    expect(await first('balancing')).toContain('Balancing');
    expect(await page.locator('.palette-result').first().locator('.palette-result-tag').textContent()).toBe('Lesson');

    expect(errors, 'section-bonus ranking should log no errors').toEqual([]);
});
