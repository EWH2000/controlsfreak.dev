// AHU depiction mockup — the minimum coverage a rendered page needs.
//
// STRUCTURAL GAP THIS CLOSES (found 2026-07-28). This page carries
// `eleventyExcludeFromCollections: true`, `noindex: true` and NO
// `canonical`, so it is absent from the sitemap and therefore from
// tests/pages.js — the manifest smoke.spec.js, responsive.spec.js and
// contrast-sweep.spec.js all walk. Before this file, `grep -rln
// ahu-mockup tests/` returned nothing: a green suite proved literally
// nothing about the page, including that it still returned 200.
//
// That is the same hole ddc-workbench-fcu.spec.js calls out for the FCU
// page, and the same remedy: name the URL directly here rather than add
// it to PAGES, which would pull a deliberately hidden page back into the
// crawl-facing surface.
//
// SCOPE — a floor, not a depiction review. The drawing itself is the
// owner's call (his equipment-graphics eye), and pinning geometry here
// would fight every future revision. What this file pins is that the
// page still RENDERS, in BOTH themes, with its identity colours resolving
// to the tokens the colour code claims — the things that break silently.
//
// The identity-colour rows are the reason this landed with the -fill
// tokens: `--amber-fill` / `--heat-fill` are the paint the drawing's
// whole "find a device before you read a word" thesis rests on, and per
// the house no-fallback rule a mistyped or removed token resolves to
// EMPTY and the stroke simply stops being painted. That failure is
// invisible to every other spec.

const { test, expect } = require('@playwright/test');

const URL = '/simulators/ddc-workbench-ahu-mockup.html';

// The round-2 graphic. The three round-1 compositions below it share the
// class vocabulary but carry .ahu-svg-r1 and keep the BASE tokens
// deliberately (they are the before-half of the comparison the page
// exists to show), so every assertion here is scoped to #ahu-graphic.
const R2 = '#ahu-graphic';

// Expected computed paint per theme. Dark rides the base tokens
// unchanged; light is where the -fill family earns its keep.
//   --amber-fill  dark #e0a94a  light #af7b00
//   --heat-fill   dark #e8884a  light #b85400
const IDENTITY = {
    dark: {
        damper: 'rgb(224, 169, 74)',
        heat: 'rgb(232, 136, 74)',
    },
    light: {
        damper: 'rgb(175, 123, 0)',
        heat: 'rgb(184, 84, 0)',
    },
};

// The sensor roster: one glyph per sensed point on the round-2 unit.
// OAT, RAT, MAT, DAT and the zone's space temperature — the five the
// drawing's callouts annotate.
const SENSOR_POINTS = ['oat', 'rat', 'mat', 'dat', 'space-temp'];

async function open(browser, theme) {
    const ctx = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        reducedMotion: 'reduce',
    });
    await ctx.addInitScript((t) => {
        try { localStorage.setItem('cf_theme', t); } catch (e) { /* private mode */ }
    }, theme);
    return ctx;
}

test('loads clean with no console errors', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));

    const res = await page.goto(URL, { waitUntil: 'domcontentloaded' });
    expect(res.status(), 'the mockup must still be built and served').toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator(R2)).toHaveCount(1);
    expect(errors, 'no console errors').toEqual([]);
});

for (const theme of ['dark', 'light']) {
    test(`renders in the ${theme} theme with its identity colours resolved`, async ({ browser }) => {
        const ctx = await open(browser, theme);
        const page = await ctx.newPage();
        try {
            await page.goto(URL, { waitUntil: 'domcontentloaded' });

            // Dark is the default and headless Chromium reports
            // prefers-color-scheme: light, so neither theme can be
            // assumed — assert what actually rendered before measuring
            // anything against it (contrast-sweep.spec.js's rule).
            expect(
                await page.evaluate(() => document.documentElement.getAttribute('data-theme')),
                'the seeded theme must actually render',
            ).toBe(theme);

            await expect(page.locator(R2)).toBeVisible();

            const paint = await page.evaluate((sel) => {
                const svg = document.querySelector(sel);
                const strokeOf = (s) => {
                    const el = svg.querySelector(s);
                    return el ? getComputedStyle(el).stroke : null;
                };
                return {
                    damperFrame: strokeOf('.ahu-damper-frame'),
                    damperBlade: strokeOf('.ahu-damper-blade'),
                    heatTube: strokeOf('.ahu-tube.is-heat'),
                    valveBody: strokeOf('.ahu-valve-body'),
                    valveLine: strokeOf('.ahu-valve-line'),
                    coolTube: strokeOf('.ahu-tube.is-cool'),
                    // The has-a-point principle's other half: a component
                    // with NO point stays neutral line-art. If this ever
                    // equals the damper colour the teaching claim is dead.
                    louverFrame: strokeOf('.ahu-louver-frame'),
                };
            }, R2);

            const want = IDENTITY[theme];

            // Dampers — the modulating ones the program can drive.
            expect(paint.damperFrame, 'damper frame carries --amber-fill').toBe(want.damper);
            expect(paint.damperBlade, 'damper blades carry --amber-fill').toBe(want.damper);

            // The heating station: serpentine + the valve that is its device.
            expect(paint.heatTube, 'heating serpentine carries --heat-fill').toBe(want.heat);
            expect(paint.valveBody, 'HW valve body carries --heat-fill').toBe(want.heat);
            expect(paint.valveLine, 'HW valve lines carry --heat-fill').toBe(want.heat);

            // Cooling deliberately did NOT get a -fill twin (blue survives
            // the light-theme darkening as blue), so this row is what
            // catches a well-meaning "for symmetry" addition later.
            expect(paint.coolTube, 'cooling serpentine stays on base --blue')
                .toBe(theme === 'dark' ? 'rgb(74, 163, 221)' : 'rgb(17, 103, 159)');

            // No token may resolve to empty. Per the house no-fallback
            // rule `var(--typo)` yields nothing and the paint silently
            // no-ops — the exact failure a cache-bust miss produces.
            for (const [k, v] of Object.entries(paint)) {
                expect(v, `${k} must resolve to a real colour, not empty`).toMatch(/^rgb/);
            }

            // Neutral must stay neutral, or the drawing stops saying which
            // component the program can move.
            expect(paint.louverFrame, 'the fixed louver has no point, so no identity colour')
                .not.toBe(want.damper);
        } finally {
            await ctx.close();
        }
    });
}

test('the sensor glyph count matches the roster', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });

    const points = await page.evaluate((sel) => Array.from(
        document.querySelectorAll(`${sel} .ddcw-sensor`),
    ).map((el) => el.dataset.point), R2);

    // Exactly the five sensed points, no duplicates, no orphans. A glyph
    // added without a callout (or a callout left pointing at a deleted
    // glyph) is the drift this catches.
    expect(points.slice().sort(), 'round-2 sensor roster').toEqual(SENSOR_POINTS.slice().sort());

    // Each sensor glyph must carry a body, or it renders as an empty <g>
    // that occupies the roster slot while drawing nothing.
    const bodies = await page.evaluate((sel) => Array.from(
        document.querySelectorAll(`${sel} .ddcw-sensor`),
    ).every((g) => g.querySelector('.ddcw-sensor-body')), R2);
    expect(bodies, 'every sensor glyph draws a body').toBe(true);
});
