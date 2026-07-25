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

test('air-handlers: air-type pools inherit each duct\'s stroke', async ({ page }) => {
    // data-flow="air" has no fixed fill constant — the particle color is
    // read from the element's stroke attribute at pool build (one type
    // serves OA/RA/SA/EA). Pin (1) every diagram on the page pools up,
    // (2) the stroke-derived fills actually land on particles (teal OA,
    // text-dim EA — colors no water/current type produces), and (3) the
    // engine's count formula holds across the mixed-density air paths of
    // the main air-path diagram.
    await page.goto('/education/air-handlers.html');
    await expect(page.locator('main svg.flow-active')).toHaveCount(4);

    const oa = await page.locator('main g.flow-particles circle[fill="var(--teal)"]').count();
    const ea = await page.locator('main g.flow-particles circle[fill="var(--text-dim)"]').count();
    expect(oa, 'OA duct particles carry the teal stroke').toBeGreaterThan(0);
    expect(ea, 'EA duct particles carry the text-dim stroke').toBeGreaterThan(0);

    const d1 = await page.evaluate((SPACING) => {
        const probe = document.querySelector('main [id^="ah-d1"]');
        if (!probe) return { found: false };
        const svg = probe.ownerSVGElement;
        let expected = 0;
        svg.querySelectorAll('[data-flow]').forEach((el) => {
            let density = parseFloat(el.getAttribute('data-flow-density'));
            if (!isFinite(density) || density <= 0 || density > 1) density = 1;
            expected += Math.floor(el.getTotalLength() / (SPACING / density));
        });
        return {
            found: true,
            expected,
            circles: svg.querySelectorAll('g.flow-particles circle').length,
        };
    }, SPACING);
    expect(d1.found, 'the air-path diagram ids exist').toBe(true);
    expect(d1.circles).toBe(d1.expected);
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

// ── Gutter pool coverage (codebase-issues #198) ────────────────────
// The gutter is the engine's dominant consumer (120 motifs, ~360 pools,
// 552 particles on every page) and until #198 nothing asserted anything
// about it except that pools exist and tear down at the breakpoint. The
// two tests below close the gaps the point-table optimization opened:
// nothing pinned that a cached-geometry particle still lands where the
// live read would have put it, and the only movement assertion was on
// the UN-cached content path.
//
// `r="3"` selects flow particles specifically — the engine's RADIUS.
// Pulse circles land in the same layer at r=3.2 and shrinking, so an
// unfiltered circle count is a moving target.
const GUTTER_VIEWPORT = { width: 1400, height: 900 };

test('gutter particles sit ON their path — the point table matches the live read', async ({ page }) => {
    // The cached-geometry path is the one real correctness risk in the
    // #198 diff: a wrong table strands particles beside the pipe instead
    // of on it, and every existing assertion (counts, colors, movement)
    // still passes while it does. Motifs whose data-flow elements are
    // ALL <line> give an exact expected geometry, so a particle must be
    // collinear with some segment of its own SVG and inside it.
    await page.setViewportSize(GUTTER_VIEWPORT);
    await page.goto('/privacy.html');
    await expect(page.locator('.schematic-bg g.flow-particles circle').first()).toBeAttached();

    const probe = await page.evaluate(() => {
        let checked = 0;
        let maxDist = 0;
        let maxOvershoot = 0;
        document.querySelectorAll('.schematic-bg svg.flow-active').forEach((svg) => {
            const flows = Array.from(svg.querySelectorAll('[data-flow]'));
            // Skip motifs carrying a <path> flow (the current-loop
            // polyline): its corners have no closed-form segment test.
            if (!flows.length || flows.some((el) => el.tagName !== 'line')) return;
            const segs = flows.map((el) => ({
                x1: parseFloat(el.getAttribute('x1')), y1: parseFloat(el.getAttribute('y1')),
                x2: parseFloat(el.getAttribute('x2')), y2: parseFloat(el.getAttribute('y2')),
            }));
            svg.querySelectorAll('g.flow-particles circle[r="3"]').forEach((c) => {
                const px = c.cx.baseVal.value;
                const py = c.cy.baseVal.value;
                let best = Infinity;
                let bestT = 0;
                segs.forEach((s) => {
                    const dx = s.x2 - s.x1;
                    const dy = s.y2 - s.y1;
                    const len2 = dx * dx + dy * dy;
                    if (!len2) return;
                    const t = ((px - s.x1) * dx + (py - s.y1) * dy) / len2;
                    const ct = Math.max(0, Math.min(1, t));
                    const d = Math.hypot(px - (s.x1 + ct * dx), py - (s.y1 + ct * dy));
                    if (d < best) { best = d; bestT = t; }
                });
                if (best === Infinity) return;
                checked++;
                if (best > maxDist) maxDist = best;
                const over = Math.max(0 - bestT, bestT - 1, 0);
                if (over > maxOvershoot) maxOvershoot = over;
            });
        });
        return { checked, maxDist, maxOvershoot };
    });

    // Guard against a vacuous pass: if the motif vocabulary changes so
    // that no all-<line> motif is left, this test stops meaning anything
    // and should fail loudly rather than go quietly green.
    expect(probe.checked, 'a meaningful number of gutter particles were measured').toBeGreaterThan(100);
    // Interpolating a table sampled along a straight line is exact, so
    // the only error left is the engine's 0.1-unit coordinate rounding
    // (≤0.071 perpendicular). 0.2 leaves headroom without tolerating a
    // real geometry mismatch.
    expect(probe.maxDist, 'every particle is on one of its motif segments').toBeLessThan(0.2);
    expect(probe.maxOvershoot, 'and inside the segment, not past an end').toBeLessThan(0.01);
});

test('gutter particles animate too (#198 — the movement twin)', async ({ page }) => {
    // The #113 movement test covers the content path, which does NOT use
    // the point table. Without this twin, a table that returns a frozen
    // or constant point passes the whole suite: counts, colors, flow-
    // active and teardown all still hold with every particle standing
    // still. Only in-viewport pools tick by design, so sample a cohort
    // that is actually on screen.
    await page.setViewportSize(GUTTER_VIEWPORT);
    await page.goto('/privacy.html');
    await expect(page.locator('.schematic-bg g.flow-particles circle').first()).toBeAttached();

    await page.evaluate(() => {
        window.cfCohort = Array.from(
            document.querySelectorAll('.schematic-bg g.flow-particles circle[r="3"]')
        ).filter((c) => {
            const b = c.getBoundingClientRect();
            return b.width > 0 && b.top >= 0 && b.bottom <= window.innerHeight;
        }).slice(0, 20);
    });
    const posAt = () => page.evaluate(
        () => window.cfCohort.map((c) => [c.cx.baseVal.value, c.cy.baseVal.value]));

    const a = await posAt();
    expect(a.length, 'some gutter particles are on screen').toBeGreaterThan(4);
    await page.waitForTimeout(350);              // 30 px/s → ~10 units of travel
    const b = await posAt();
    const movers = a.filter((p, i) => Math.hypot(b[i][0] - p[0], b[i][1] - p[1]) > 0.5).length;
    expect(movers, 'on-screen gutter particles moved → the gutter is live').toBe(a.length);
});
