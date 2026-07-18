// Regression tests for /scripts/fullscreen-toggle.js.
//
// #106: the toggle is loaded site-wide and exposes window.Fullscreen.
// targetFor() accepts any data-fullscreen-target selector and setState()
// toggles is-fullscreen on that arbitrary element — but exitActive() (the
// ESC path) used to query the fixed `.tool-card.is-fullscreen`, so a
// non-.tool-card target had no keyboard exit. Generalized to exit
// whatever is-fullscreen.
//
// #163: the fullscreen overlay covers the chrome visually but the nav /
// footer / back-link kept their tab order — Shift+Tab from the card
// landed focus on covered links with no visible indicator. setState()
// now inerts the background (tagged data-fs-inert) on enter and restores
// it exactly on every exit path. The #palette stays live (it layers
// above fullscreen at z-index 1000), and search.js's palette-close skips
// data-fs-inert carriers so it can't strip the containment.

const { test, expect } = require('@playwright/test');

test('ESC exits a non-.tool-card fullscreen target (#106)', async ({ page }) => {
    await page.goto('/');   // fullscreen-toggle.js is loaded site-wide

    const entered = await page.evaluate(() => {
        // A synthetic NON-.tool-card target (a <section>), entered fullscreen
        // through the public toggle the same way a future page would.
        const el = document.createElement('section');
        el.id = 'fs-probe';
        document.body.appendChild(el);
        window.Fullscreen.toggle(el);
        return {
            el: el.classList.contains('is-fullscreen'),
            body: document.body.classList.contains('has-fullscreen-tool'),
        };
    });
    expect(entered.el).toBe(true);
    expect(entered.body).toBe(true);

    // ESC must exit it. The old exitActive() matched only .tool-card, so the
    // section + body class would stay stuck.
    await page.keyboard.press('Escape');

    const after = await page.evaluate(() => ({
        el: document.getElementById('fs-probe').classList.contains('is-fullscreen'),
        body: document.body.classList.contains('has-fullscreen-tool'),
    }));
    expect(after.el, 'the non-.tool-card target exited').toBe(false);
    expect(after.body, 'body.has-fullscreen-tool cleared').toBe(false);
});

test('fullscreen inerts the covered chrome; Shift+Tab stays inside the card (#163)', async ({ page }) => {
    await page.goto('/tools/psychrometric-chart.html');
    const btn = page.locator('.tool-card-fullscreen-btn');
    await btn.click();
    await expect(page.locator('body')).toHaveClass(/has-fullscreen-tool/);

    // Covered chrome behind the z-300 overlay is inert…
    await expect(page.locator('nav.site-nav')).toHaveAttribute('inert', '');
    await expect(page.locator('footer')).toHaveAttribute('inert', '');
    await expect(page.locator('.back-link')).toHaveAttribute('inert', '');
    // …but the palette is NOT — it layers above fullscreen (z-index 1000)
    // so the Ctrl/⌘-K command palette stays usable.
    await expect(page.locator('#palette')).not.toHaveAttribute('inert', /.*/);

    // Shift+Tab from the fullscreen button must never land on covered
    // chrome. Walk far enough to have crossed the whole nav if it were
    // still tabbable; focus stays inside the card (or passes through
    // <body> on its way out to browser chrome).
    await btn.focus();
    const landed = [];
    for (let i = 0; i < 25; i++) {
        await page.keyboard.press('Shift+Tab');
        landed.push(await page.evaluate(() => {
            const a = document.activeElement;
            if (!a || a === document.body || a === document.documentElement) return 'body';
            if (a.closest('.tool-card.is-fullscreen')) return 'card';
            return 'OUTSIDE: ' + (a.id || a.className || a.tagName);
        }));
    }
    expect(landed.filter((w) => w.startsWith('OUTSIDE')),
        'focus never escaped to covered chrome').toEqual([]);

    // Exit restores everything exactly — no attribute bookkeeping left.
    await btn.click();
    await expect(page.locator('body')).not.toHaveClass(/has-fullscreen-tool/);
    const leftovers = await page.evaluate(
        () => document.querySelectorAll('[inert], [data-fs-inert]').length);
    expect(leftovers, 'exit removed every inert it added').toBe(0);
    const navFocusable = await page.evaluate(() => {
        const a = document.querySelector('.site-nav-links a');
        a.focus();
        return document.activeElement === a;
    });
    expect(navFocusable, 'nav is really tabbable again').toBe(true);
});

test('repeated cycles restore exactly; pre-existing inert is untouched (#163)', async ({ page }) => {
    await page.goto('/simulators/refrigerant-loop.html');
    // A page-owned inert (not fullscreen's) must survive a full cycle —
    // applyInert() skips already-inert elements, so exit can't undo it.
    await page.evaluate(() => document.querySelector('footer').setAttribute('inert', ''));

    const btn = page.locator('.tool-card-fullscreen-btn');
    for (let i = 0; i < 2; i++) {
        await btn.click();
        await expect(page.locator('nav.site-nav')).toHaveAttribute('inert', '');
        await btn.click();
        await expect(page.locator('nav.site-nav')).not.toHaveAttribute('inert', /.*/);
    }

    const state = await page.evaluate(() => ({
        markers: document.querySelectorAll('[data-fs-inert]').length,
        footerInert: document.querySelector('footer').hasAttribute('inert'),
    }));
    expect(state.markers, 'no bookkeeping left after two cycles').toBe(0);
    expect(state.footerInert, 'pre-existing inert untouched').toBe(true);
});

test('closing the palette over a fullscreen tool keeps the background inert (#163)', async ({ page }) => {
    await page.goto('/tools/psychrometric-chart.html');
    await page.locator('.tool-card-fullscreen-btn').click();
    await expect(page.locator('nav.site-nav')).toHaveAttribute('inert', '');

    // The palette layers above fullscreen and must stay usable.
    await page.keyboard.press('Control+k');
    await expect(page.locator('#palette')).toBeVisible();
    await expect(page.locator('#palette')).not.toHaveAttribute('inert', /.*/);

    // Escape closes the palette only (search.js claims it, capture phase)…
    await page.keyboard.press('Escape');
    await expect(page.locator('#palette')).toBeHidden();
    await expect(page.locator('body')).toHaveClass(/has-fullscreen-tool/);
    // …and must NOT strip fullscreen's containment — search.js's
    // palette-close skips data-fs-inert carriers.
    await expect(page.locator('nav.site-nav')).toHaveAttribute('inert', '');

    // A second Escape exits fullscreen and restores everything.
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).not.toHaveClass(/has-fullscreen-tool/);
    await expect(page.locator('nav.site-nav')).not.toHaveAttribute('inert', /.*/);
});
