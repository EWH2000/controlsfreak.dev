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
// Same remedy the workbench specs used while those pages were hidden
// (they graduated 2026-08-04; this page deliberately did not): name the
// URL directly here rather than add it to PAGES, which would pull a
// deliberately hidden page back into the crawl-facing surface.
//
// SCOPE — a floor, not a depiction review. The drawing itself is the
// owner's call (his equipment-graphics eye), and pinning geometry here
// would fight every future revision. What this file pins is that the
// page still RENDERS, in BOTH themes, with its identity colours resolving
// to the tokens the colour code claims — the things that break silently.
//
// ONE DEPICTION FACT IS PINNED, and only because it is a WCAG 1.4.1
// property rather than a drawing preference: the heating and cooling
// coils must not be separated by hue alone (#231). It is asserted
// relationally — the DX coil's silhouette is wider than the heating
// coil's — so a future revision is free to redraw the cue, and only
// deleting it fails.
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

// codebase-issues #231. The two serpentines are the same drawing at a
// 76-unit offset, so before the DX coil got its refrigerant distributor
// the ONLY thing separating a heating coil from a cooling one was
// `--heat-fill` versus `--blue` — dead in greyscale, dead on paper, dead
// for a protanope. This is the one depiction fact the spec pins, and it
// is pinned RELATIONALLY rather than by coordinate, per the scope note at
// the top: what must hold is that the DX coil's drawn silhouette is not a
// translate of the heating coil's, not that the cone sits at x492.
test('the two coils are separated by shape, not by hue alone', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });

    const shape = await page.evaluate((sel) => {
        const svg = document.querySelector(sel);
        const linkOf = (id) => svg.querySelector(`#${id}`).closest('a');
        const dx = linkOf('ahu-coil-dx');
        const hw = linkOf('ahu-coil-hw');
        const box = (el) => {
            const b = el.getBBox();
            return { w: +b.width.toFixed(2), h: +b.height.toFixed(2) };
        };
        const paintOf = (el) => {
            const cs = getComputedStyle(el);
            return { fill: cs.fill, stroke: cs.stroke };
        };
        const body = dx.querySelector('.ahu-dist-body');
        return {
            dxBody: dx.querySelectorAll('.ahu-dist-body').length,
            dxFeeder: dx.querySelectorAll('.ahu-dist-feeder').length,
            // The heating coil must NOT sprout one "for symmetry" — a
            // hydronic coil has no distributor and the cue dies if both
            // carry it.
            hwDistributor: hw.querySelectorAll('.ahu-dist-body, .ahu-dist-feeder').length,
            dxLink: box(dx),
            hwLink: box(hw),
            bodyPaint: paintOf(body),
            feederPaint: paintOf(dx.querySelector('.ahu-dist-feeder')),
            coolTube: getComputedStyle(svg.querySelector('.ahu-tube.is-cool')).stroke,
        };
    }, R2);

    expect(shape.dxBody, 'the DX coil carries a distributor body').toBeGreaterThan(0);
    expect(shape.dxFeeder, 'the DX coil carries feeder tubes').toBeGreaterThan(0);
    expect(shape.hwDistributor, 'the hydronic coil carries no distributor').toBe(0);

    // The load-bearing assertion: rendered geometry, not class names. The
    // two link groups are the same 52x82 box around the same serpentine,
    // so if the distributor is deleted these widths go equal again and
    // this fails — which a class-presence check alone would not catch if
    // someone left an empty <g> behind.
    expect(shape.dxLink.h, 'both coils stand the same height').toBe(shape.hwLink.h);
    expect(
        shape.dxLink.w,
        'the DX coil is visibly wider than the heating coil — its refrigerant connections',
    ).toBeGreaterThan(shape.hwLink.w + 4);

    // The distributor is part of the cooling coil, so it wears that coil's
    // identity token — and per the house no-fallback rule a mistyped one
    // resolves to empty and the part silently stops being drawn.
    expect(shape.bodyPaint.stroke, 'the distributor body is outlined in the cooling identity colour')
        .toBe(shape.coolTube);
    expect(shape.feederPaint.stroke, 'feeder tubes carry the cooling identity colour')
        .toBe(shape.coolTube);

    // The body is a surface-filled OUTLINE, not a solid. On this drawing a
    // solid fill with stroke:none is the arrow idiom, and a filled wedge
    // reads as a block arrow pointing upstream — so this row is what
    // catches a well-meaning "make it pop" fill later.
    expect(shape.bodyPaint.fill, 'the distributor body is not a solid in the identity colour')
        .not.toBe(shape.coolTube);
    expect(shape.bodyPaint.fill, 'the distributor fill must resolve to a real colour').toMatch(/^rgb/);
});

// The value-well ink rule, confirmed by the owner 2026-07-28: measured =
// plain bright, commanded-or-held-by-the-program = accent, calculated =
// blue. The rail's SP DIFF row is the one place that rule is load-BEARING
// rather than decorative — it sits between two parameter rows it is the
// difference of, and the blue is what says "nothing sets this" before the
// caption is read.
//
// WHY THIS IS PINNED AND ITS NEIGHBOURS ARE NOT. `.ahu-param-well` defaults
// to the commanded ink, so `.is-calc` is a single class standing between
// the intended meaning and a row that merely looks tidy. Deleting it is a
// one-token edit that reads as consistency — three matching wells under one
// heading — and silently asserts that the program sets a value it computes.
// Nothing else in the suite would notice. So this test fails on tidying,
// which is its whole reason for existing.
//
// Asserted BOTH ways round: equal to the ink the drawing already uses for
// its one calculated value (the ΔT well), and different from the two rows
// it sits between. The relational form survives a token retune; a hardcoded
// rgb would have to be re-measured on every theme pass.
for (const theme of ['dark', 'light']) {
    test(`SP DIFF reads as calculated, not as a parameter (${theme})`, async ({ browser }) => {
        const ctx = await open(browser, theme);
        const page = await ctx.newPage();
        try {
            await page.goto(URL, { waitUntil: 'domcontentloaded' });
            expect(
                await page.evaluate(() => document.documentElement.getAttribute('data-theme')),
                'the seeded theme must actually render',
            ).toBe(theme);

            const rail = await page.evaluate(() => {
                const pick = (id) => {
                    const el = document.getElementById(id);
                    if (!el) return null;
                    const cs = getComputedStyle(el);
                    return {
                        text: el.textContent.trim(),
                        color: cs.color,
                        border: cs.borderTopColor,
                    };
                };
                const dt = document.querySelector('#ahu-graphic #ahu-v-dt');
                return {
                    cool: pick('ahu-p-cool-sp'),
                    heat: pick('ahu-p-heat-sp'),
                    diff: pick('ahu-p-sp-diff'),
                    // The drawing's own calculated value — the reference ink.
                    dtFill: dt ? getComputedStyle(dt).fill : null,
                    // Rendered caption, uppercased by CSS. The row must not
                    // introduce a second abbreviation for "setpoint" three
                    // rows below COOLING SP / HEATING SP.
                    label: getComputedStyle(
                        document.getElementById('ahu-p-sp-diff').closest('.ahu-param-row')
                            .querySelector('.ahu-param-lbl'),
                    ).textTransform,
                    labelText: document.getElementById('ahu-p-sp-diff')
                        .closest('.ahu-param-row').querySelector('.ahu-param-lbl')
                        .textContent.trim(),
                    // Adjacency carries the meaning, so order is part of the
                    // claim: the difference sits directly under its operands.
                    order: Array.from(
                        document.getElementById('ahu-p-sp-diff').closest('.ahu-param-group')
                            .querySelectorAll('.ahu-param-well'),
                    ).map((el) => el.id),
                };
            });

            expect(rail.diff, 'the SP DIFF row exists').not.toBeNull();

            // THE ASSERTION THIS TEST EXISTS FOR.
            expect(rail.diff.color, 'SP DIFF carries the calculated ink, not the parameter ink')
                .not.toBe(rail.cool.color);
            expect(rail.diff.color, 'SP DIFF rides the same calculated ink the drawing gives ΔT')
                .toBe(rail.dtFill);
            expect(rail.diff.border, 'the calculated well is framed differently too')
                .not.toBe(rail.cool.border);

            // The two rows it subtracts must stay parameters — if a future
            // retune flattens all three to one colour the row above still
            // passes on equality alone, so pin the pair.
            expect(rail.heat.color, 'HEATING SP stays a parameter').toBe(rail.cool.color);
            for (const [k, v] of Object.entries({
                cool: rail.cool.color, diff: rail.diff.color, dt: rail.dtFill,
            })) {
                expect(v, `${k} ink must resolve to a real colour, not empty`).toMatch(/^rgb/);
            }

            // The displayed value must be the arithmetic of the DISPLAYED
            // operands (the site's rounding policy), not of some unrounded
            // canonical pair a reader cannot see.
            const num = (s) => parseFloat(s.replace(/[^\d.\-]/g, ''));
            expect(
                +(num(rail.cool.text) - num(rail.heat.text)).toFixed(1),
                'SP DIFF is exactly what the two rows above it subtract to',
            ).toBe(num(rail.diff.text));

            expect(rail.order, 'the difference sits directly beneath its operands')
                .toEqual(['ahu-p-cool-sp', 'ahu-p-heat-sp', 'ahu-p-sp-diff', 'ahu-p-deadband']);
            expect(rail.labelText, 'one abbreviation for setpoint per panel').toBe('SP diff');
            expect(rail.label, 'the caption renders in caps like its neighbours').toBe('uppercase');
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
