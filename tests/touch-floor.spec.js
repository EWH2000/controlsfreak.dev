// Touch-target floor pins (audit-2026-06 #24/#25). Chromium's mobile
// emulation (isMobile + hasTouch) makes the (hover: none) media query
// match, so the consolidated TOUCH-TARGET FLOOR block applies — the
// rest of the suite runs as a desktop pointer where it never does.

const { test, expect } = require('@playwright/test');

test.describe('phone (hover:none, 412×883)', () => {
    // isMobile + hasTouch make Chromium's emulation match (hover: none)
    // — a full device descriptor can't be spread here (its
    // defaultBrowserType is illegal inside a describe group).
    test.use({ isMobile: true, hasTouch: true, viewport: { width: 412, height: 883 } });

    test('the #24 families clear the 44px floor on touch', async ({ page }) => {
        // Copy buttons — 22.4px natively; includes the PID preset chips,
        // the main touch way to drive the process visual.
        await page.goto('/simulators/pid-tuner.html');
        const preset = await page.locator('#pid-preset-aggr').boundingBox();
        expect(preset.height).toBeGreaterThanOrEqual(44);

        // Range sliders: the padded hit box, not the painted track.
        const slider = await page.locator('#pid-kc').boundingBox();
        expect(slider.height).toBeGreaterThanOrEqual(44);

        // Filter chips on the tools landing — 28.2px natively.
        await page.goto('/tools/');
        const chip = await page.locator('.filter-chip').first().boundingBox();
        expect(chip.height).toBeGreaterThanOrEqual(44);

        // Quiz actions — 39.2px natively.
        await page.goto('/practice/modbus-decoding.html');
        const action = await page.locator('.quiz-action-primary').boundingBox();
        expect(action.height).toBeGreaterThanOrEqual(44);
    });

    test('the #164 form-control family clears the 44px floor on touch', async ({ page }) => {
        // .field select — 38.6px natively (refrigerant-loop sim).
        await page.goto('/simulators/refrigerant-loop.html');
        const fieldSelect = await page.locator('#rl-refrigerant').boundingBox();
        expect(fieldSelect.height).toBeGreaterThanOrEqual(44);

        // The property-sheet family — 29px natively, selects AND inputs
        // floored together so a sheet doesn't mix 44px and 29px rows.
        await page.goto('/tools/refrigerant-pt.html');
        const psSelect = await page.locator('select.ps-input').first().boundingBox();
        expect(psSelect.height).toBeGreaterThanOrEqual(44);
        const psInput = await page.locator('input.ps-input').first().boundingBox();
        expect(psInput.height).toBeGreaterThanOrEqual(44);
    });

    test('mode-filtered preset row stays filtered on touch', async ({ page }) => {
        // The floor block's display:inline-flex on .copy-btn beats the
        // UA-default [hidden] rule (the #25 trap family) — without the
        // .copy-btn[hidden] re-assert, the refrigerant-loop sim leaked
        // all nine scenario buttons in both modes on touch devices.
        await page.goto('/simulators/refrigerant-loop.html');
        await expect(page.locator('#main [data-preset]:visible')).toHaveCount(6);
        await expect(page.locator('[data-preset="defrost"]')).toBeHidden();
        await page.click('#rl-mode-heat');
        await expect(page.locator('#main [data-preset]:visible')).toHaveCount(3);
        await expect(page.locator('[data-preset="starve"]')).toBeHidden();
        // Defense-in-depth: even a programmatic click on a cross-mode
        // preset (the CSS-regression scenario) must not load it — the
        // page ignores a preset whose mode isn't active.
        await page.click('#rl-mode-cool');
        await page.locator('[data-preset="defrost"]').dispatchEvent('click');
        await expect(page.locator('#rl-cycle')).not.toHaveClass(/defrost/);
        await expect(page.locator('#rl-ambient')).toHaveValue('90');
    });
});

test.describe('desktop pointer density stays compact (#164)', () => {
    // Default desktop context — (hover: none) must NOT match, so the
    // form-control floor never applies and the workstation density holds.
    test('property-sheet controls keep their compact desktop height', async ({ page }) => {
        await page.goto('/tools/refrigerant-pt.html');
        const psSelect = await page.locator('select.ps-input').first().boundingBox();
        expect(psSelect.height).toBeLessThan(35);
        const psInput = await page.locator('input.ps-input').first().boundingBox();
        expect(psInput.height).toBeLessThan(35);
        await page.goto('/simulators/refrigerant-loop.html');
        const fieldSelect = await page.locator('#rl-refrigerant').boundingBox();
        expect(fieldSelect.height).toBeLessThan(44);
    });
});

test.describe('touch tablet (hover:none, 768×1024)', () => {
    test.use({ isMobile: true, hasTouch: true, viewport: { width: 768, height: 1024 } });

    test('no stray hamburger beside the full link bar (#25)', async ({ page }) => {
        await page.goto('/');
        // Above 620px the full link bar shows; the burger must stay
        // hidden — the touch-floor block's shared display declaration
        // used to force it visible on any hover:none device.
        await expect(page.locator('#site-nav-links')).toBeVisible();
        await expect(page.locator('#nav-hamburger')).toBeHidden();
    });
});
