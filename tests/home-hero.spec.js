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
    await expect(page.locator('.nav-card:not([hidden])')).toHaveCount(8);
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

// Drift guard — codebase-issues #148 / #150. The home page carries two
// hand-maintained count surfaces: the "Tools by Category" pills and the
// Browse pills. Both drifted silently before (category pills were −1/−1/−2
// and two whole categories had no card at all). Rather than pin fresh
// hardcoded numbers that rot the same way, derive the authoritative counts
// at runtime — the /tools/ filter chips for per-category totals (each
// cross-checked against the cards it actually filters to) and the nav-card
// count on each section landing for the Browse totals — and assert every
// home pill matches.
test('home count pills stay in sync with the landings (drift guard)', async ({ page }) => {
    const errors = watchErrors(page);

    // Last "N …" pill on a card → integer.
    const pillNum = async (card) => {
        const txt = (await card.locator('.nav-card-pill').last().textContent()) || '';
        const m = txt.match(/\d+/);
        expect(m, `pill "${txt}" should carry a number`).not.toBeNull();
        return parseInt(m[0], 10);
    };

    // Authoritative per-category tool counts: the /tools/ filter chips,
    // each cross-checked against the cards it actually filters to (so a
    // wrong chip can't quietly validate a wrong home pill).
    await page.goto('/tools/');
    const cats = [];
    for (const chip of await page.locator('.filter-chip[data-category]').all()) {
        const cat = await chip.getAttribute('data-category');
        if (cat === 'all') continue;
        cats.push([cat, parseInt((await chip.locator('.filter-chip-count').textContent()).trim(), 10)]);
    }
    for (const [cat, n] of cats) {
        await page.click(`.filter-chip[data-category="${cat}"]`);
        await expect(page.locator('.nav-card:not([hidden])'),
            `chip "${cat}" count should equal the cards it filters to`).toHaveCount(n);
    }
    const toolsTotal = await page.locator('.nav-card').count();
    expect(cats.reduce((s, [, n]) => s + n, 0),
        'category counts should partition all tool cards').toBe(toolsTotal);

    // Authoritative section totals: nav-card count on each landing.
    await page.goto('/simulators/');
    const simTotal = await page.locator('.nav-card').count();
    await page.goto('/education/');
    const eduTotal = await page.locator('.nav-card').count();
    await page.goto('/practice/');
    const practiceTotal = await page.locator('.nav-card').count();

    // Home page — every pill must match its authoritative source.
    await page.goto('/');

    // Tools-by-Category cards, keyed by their #cat href. Each /tools/
    // category must appear here (catches a category with no home card).
    for (const [cat, n] of cats) {
        const card = page.locator(`.nav-card[href="/tools/#${cat}"]`);
        await expect(card, `home should carry a "${cat}" category card`).toHaveCount(1);
        expect(await pillNum(card), `home "${cat}" pill should read ${n}`).toBe(n);
    }

    // Browse cards, keyed by section-landing href.
    const browse = (href) => page.locator(`.card-grid.two .nav-card[href="${href}"]`);
    expect(await pillNum(browse('/tools/')), 'Browse Tools pill').toBe(toolsTotal);
    expect(await pillNum(browse('/simulators/')), 'Browse Simulators pill').toBe(simTotal);
    expect(await pillNum(browse('/education/')), 'Browse Education pill').toBe(eduTotal);
    expect(await pillNum(browse('/practice/')), 'Browse Practice pill').toBe(practiceTotal);

    expect(errors, 'count-guard should log no page errors').toEqual([]);
});
