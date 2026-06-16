// Functional assertions for /scripts/flow-engine.js (audit-2026-06
// #43): the engine fails soft by design, so a de-registered path
// produces zero errors and the suite previously had zero assertions
// against it. Locator counts are scoped to `main` — the gutter motifs
// also register pools (75 document-wide flow-active SVGs on
// hydronic-loops vs exactly 3 in main), so unscoped counts assert the
// chrome, not the diagrams.
//
// Also pins the audit #31 gating: pools inside the hidden gutter
// (`.schematic-bg`, display:none < 1240px) must not be built, and must
// tear down / rebuild as the viewport crosses the breakpoint.

const { test, expect } = require('@playwright/test');

// Engine constant (flow-engine.js SPACING) — particle count per path
// is floor(length / (SPACING / density)).
const SPACING = 34;

test('hydronic-loops: all three main diagrams get pools with particles', async ({ page }) => {
    await page.goto('/education/hydronic-loops.html');
    await expect(page.locator('main svg.flow-active')).toHaveCount(3);
    const circles = await page.locator('main g.flow-particles circle').count();
    expect(circles).toBeGreaterThan(0);
});

test('load-piping: both halves of the converging-tee split are pooled', async ({ page }) => {
    // The documented gotcha: a diverting-valve tee must be drawn as two
    // segments (coil-to-tee + bypass-to-tee). If either half loses its
    // registration the engine stays silent — pin both.
    await page.goto('/education/load-piping.html');

    const tee = await page.evaluate((SPACING) => {
        const coil = document.querySelector('main [id^="lp-3wd-coil-to-tee"]');
        const bypass = document.querySelector('main [id^="lp-3wd-bypass-to-tee"]');
        if (!coil || !bypass) return { found: false };
        const svg = coil.ownerSVGElement;
        // Expected pool size for every annotated path in this SVG, from
        // the engine's documented count formula.
        let expected = 0;
        svg.querySelectorAll('[data-flow]').forEach((el) => {
            let density = parseFloat(el.getAttribute('data-flow-density'));
            if (!isFinite(density) || density <= 0 || density > 1) density = 1;
            expected += Math.floor(el.getTotalLength() / (SPACING / density));
        });
        const perHalf = [coil, bypass].map((el) => {
            let density = parseFloat(el.getAttribute('data-flow-density'));
            if (!isFinite(density) || density <= 0 || density > 1) density = 1;
            return Math.floor(el.getTotalLength() / (SPACING / density));
        });
        return {
            found: true,
            coilFlow: coil.getAttribute('data-flow'),
            bypassFlow: bypass.getAttribute('data-flow'),
            expected,
            perHalf,
            circles: svg.querySelectorAll('g.flow-particles circle').length,
            flowActive: svg.classList.contains('flow-active'),
        };
    }, SPACING);

    expect(tee.found, 'both tee-half ids must exist').toBe(true);
    expect(tee.coilFlow, 'coil half carries data-flow').toBeTruthy();
    expect(tee.bypassFlow, 'bypass half carries data-flow').toBeTruthy();
    expect(tee.flowActive).toBe(true);
    // Each half is long enough to carry at least one particle, and the
    // SVG's actual circle count matches the engine's formula across all
    // its annotated paths — a silently-dropped half breaks the equality.
    expect(tee.perHalf[0]).toBeGreaterThan(0);
    expect(tee.perHalf[1]).toBeGreaterThan(0);
    expect(tee.circles).toBe(tee.expected);
});

test('reduced motion: zero particles, zero flow-active', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/education/hydronic-loops.html');
    await expect(page.locator('g.flow-particles circle')).toHaveCount(0);
    await expect(page.locator('svg.flow-active')).toHaveCount(0);
});

test('hidden gutter builds no pools; crossing 1240px tears down / rebuilds (#31)', async ({ page }) => {
    // Below the gutter breakpoint: the collage is display:none and the
    // engine must not animate circles that can't paint.
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto('/privacy.html');
    await expect(page.locator('.schematic-bg g.flow-particles circle')).toHaveCount(0);

    // Grow past the breakpoint: the matchMedia listener rebuilds the
    // gutter pools.
    await page.setViewportSize({ width: 1400, height: 800 });
    await expect(page.locator('.schematic-bg svg.flow-active').first()).toBeAttached();
    const wideCount = await page.locator('.schematic-bg g.flow-particles circle').count();
    expect(wideCount).toBeGreaterThan(0);

    // Shrink back below: teardown removes the circles and clears
    // flow-active from the gutter SVGs.
    await page.setViewportSize({ width: 600, height: 800 });
    await expect(page.locator('.schematic-bg g.flow-particles circle')).toHaveCount(0);
    await expect(page.locator('.schematic-bg svg.flow-active')).toHaveCount(0);
});

test('growing past 1240px preserves in-content setPathColor recolors (#96)', async ({ page }) => {
    // refrigerant-cycle-basics recolors its hot-side pipes (rc-discharge +
    // rc-liquid, both data-flow="supply") from the engine default to
    // var(--heat) once on load. Crossing UP through the gutter breakpoint
    // must rebuild ONLY gutter pools — a full init() would tear down and
    // recolor-reset every in-content pool too, wiping the recolor (the
    // page's own script comment warns a re-init does exactly that).
    await page.setViewportSize({ width: 1000, height: 900 });   // < 1240: gutter hidden
    await page.goto('/education/refrigerant-cycle-basics.html');

    const heat = 'main g.flow-particles circle[fill="var(--heat)"]';
    const before = await page.locator(heat).count();
    expect(before, 'page recolors some in-content particles on load').toBeGreaterThan(0);

    // Cross up past 1240px — the gutter rebuild fires.
    await page.setViewportSize({ width: 1400, height: 900 });
    await expect(page.locator('.schematic-bg g.flow-particles circle').first()).toBeAttached();
    // The in-content recolor survives the crossing (a full re-init wiped it).
    await expect(page.locator(heat)).toHaveCount(before);
});

test('the rAF loop starts on a visible diagram and animates particles (#113)', async ({ page }) => {
    // The loop now only runs while there's visible work (it suspends when
    // idle and resumes via the IO 'intersecting' callback / firePulse). The
    // load-bearing risk is that the IO-gated startLoop never fires — so pin
    // that a visible diagram's particle actually MOVES over a short window.
    await page.goto('/education/hydronic-loops.html');
    await expect(page.locator('main g.flow-particles circle').first()).toBeAttached();

    const posAt = () => page.evaluate(() => {
        const c = document.querySelector('main g.flow-particles circle');
        return c ? [parseFloat(c.getAttribute('cx')), parseFloat(c.getAttribute('cy'))] : null;
    });
    const a = await posAt();
    await page.waitForTimeout(350);              // 30 px/s → ~10 px of travel
    const b = await posAt();
    expect(a, 'a particle exists on a visible diagram').not.toBeNull();
    const moved = Math.hypot(b[0] - a[0], b[1] - a[1]);
    expect(moved, 'the particle moved → the loop is running').toBeGreaterThan(0.5);
});
