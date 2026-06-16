// Regression test for /scripts/fullscreen-toggle.js (codebase-issues #106).
// The toggle is loaded site-wide and exposes window.Fullscreen. targetFor()
// accepts any data-fullscreen-target selector and setState() toggles
// is-fullscreen on that arbitrary element — but exitActive() (the ESC path)
// used to query the fixed `.tool-card.is-fullscreen`, so a non-.tool-card
// target had no keyboard exit. Generalized to exit whatever is-fullscreen.

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
