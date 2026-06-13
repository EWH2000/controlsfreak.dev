// The drag-wiring sims (controller-wiring, function-block-editor) are
// pointer-only: a finger can't both drag a block/device and pan the canvas.
// Each hides its live workspace and shows a .desktop-only-sim tips panel
// below 1000px OR on any touch-primary device. Chromium's isMobile+hasTouch
// emulation makes the (hover: none) / (pointer: coarse) half of that gate
// match — see touch-floor.spec.js — so we can pin both halves here.

const { test, expect } = require('@playwright/test');

const PAGES = [
    { name: 'controller wiring',      url: '/simulators/controller-wiring.html',      live: '.cw-live' },
    { name: 'function-block editor',  url: '/simulators/function-block-editor.html',  live: '.fbe-live' },
];

test.describe('desktop pointer (default 1280-wide viewport)', () => {
    for (const p of PAGES) {
        test(`${p.name}: live sim shown, tips panel hidden`, async ({ page }) => {
            await page.goto(p.url);
            await expect(page.locator(p.live)).toBeVisible();
            await expect(page.locator('.desktop-only-sim')).toBeHidden();
        });
    }
});

test.describe('touch tablet, wide (hover:none, 1280×800)', () => {
    // The width is comfortably above 1000px, so the ONLY thing that can hide
    // the sim here is the touch-pointer half of the gate.
    test.use({ isMobile: true, hasTouch: true, viewport: { width: 1280, height: 800 } });
    for (const p of PAGES) {
        test(`${p.name}: live sim hidden for touch even when wide`, async ({ page }) => {
            await page.goto(p.url);
            await expect(page.locator(p.live)).toBeHidden();
            await expect(page.locator('.desktop-only-sim')).toBeVisible();
        });
    }
});

test.describe('phone (412×883)', () => {
    test.use({ isMobile: true, hasTouch: true, viewport: { width: 412, height: 883 } });
    for (const p of PAGES) {
        test(`${p.name}: live sim hidden, tips panel shown`, async ({ page }) => {
            await page.goto(p.url);
            await expect(page.locator(p.live)).toBeHidden();
            await expect(page.locator('.desktop-only-sim')).toBeVisible();
        });
    }
});
