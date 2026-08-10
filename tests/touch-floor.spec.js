// Touch-target floor pins (audit-2026-06 #24/#25). Chromium's mobile
// emulation (isMobile + hasTouch) makes the (hover: none) media query
// match, so the consolidated TOUCH-TARGET FLOOR block applies — the
// rest of the suite runs as a desktop pointer where it never does.

const { test, expect } = require('@playwright/test');
const { expectTouchFloorHeight } = require('./touch-floor.js');

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
        expectTouchFloorHeight(preset, 'pid preset chip');

        // Range sliders: the padded hit box, not the painted track.
        const slider = await page.locator('#pid-kc').boundingBox();
        expectTouchFloorHeight(slider, 'pid range slider');

        // Filter chips on the tools landing — 28.2px natively.
        await page.goto('/tools/');
        const chip = await page.locator('.filter-chip').first().boundingBox();
        expectTouchFloorHeight(chip, 'tools filter chip');

        // Quiz actions — 39.2px natively.
        await page.goto('/practice/modbus-decoding.html');
        const action = await page.locator('.quiz-action-primary').boundingBox();
        expectTouchFloorHeight(action, 'quiz action');
    });

    test('the #164 form-control family clears the 44px floor on touch', async ({ page }) => {
        // .field select — 38.6px natively (refrigerant-loop sim).
        await page.goto('/simulators/refrigerant-loop.html');
        const fieldSelect = await page.locator('#rl-refrigerant').boundingBox();
        expectTouchFloorHeight(fieldSelect, '.field select');

        // The property-sheet family — 29px natively, selects AND inputs
        // floored together so a sheet doesn't mix 44px and 29px rows.
        await page.goto('/tools/refrigerant-pt.html');
        const psSelect = await page.locator('select.ps-input').first().boundingBox();
        expectTouchFloorHeight(psSelect, 'select.ps-input');
        const psInput = await page.locator('input.ps-input').first().boundingBox();
        expectTouchFloorHeight(psInput, 'input.ps-input');
    });

    test('the #172 tail clears the 44px floor on touch', async ({ page }) => {
        // .field input — 38.6px natively (#164 floored .field select
        // but never the inputs). Contact needs the contact.spec.js
        // Turnstile treatment: route-block challenges.cloudflare.com
        // before navigating (it errors on sandboxed localhost) and use
        // domcontentloaded (the widget never goes network-idle).
        await page.route('https://challenges.cloudflare.com/**', route => route.abort());
        await page.goto('/contact.html', { waitUntil: 'domcontentloaded' });
        const fieldInput = await page.locator('#contact-name').boundingBox();
        expectTouchFloorHeight(fieldInput, 'contact .field input');

        // The same .field input family on the simulator sidebars.
        await page.goto('/simulators/pid-tuner.html');
        const sgInput = await page.locator('#pid-sg-dco').boundingBox();
        expectTouchFloorHeight(sgInput, 'pid sidebar input');
        await page.goto('/simulators/staging-sequencer.html');
        const stgInput = await page.locator('#stg-up').boundingBox();
        expectTouchFloorHeight(stgInput, 'staging sidebar input');

        // The vfds run/speed source selects — 31.8px natively; widget
        // internals with no shared class, floored by the page-local
        // (hover: none) rule in the vfds head, not the shared block.
        await page.goto('/education/vfds.html');
        const runSrc = await page.locator('#vfd-run-src').boundingBox();
        expectTouchFloorHeight(runSrc, 'vfd run source select');
        const spdSrc = await page.locator('#vfd-spd-src').boundingBox();
        expectTouchFloorHeight(spdSrc, 'vfd speed source select');
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
        // The #172 additions hold desktop density too — .field inputs
        // and the vfds page-local select floor are both (hover: none).
        await page.goto('/simulators/staging-sequencer.html');
        const stgInput = await page.locator('#stg-up').boundingBox();
        expect(stgInput.height).toBeLessThan(44);
        await page.goto('/education/vfds.html');
        const runSrc = await page.locator('#vfd-run-src').boundingBox();
        expect(runSrc.height).toBeLessThan(44);
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
