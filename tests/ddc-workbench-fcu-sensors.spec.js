// DDC Workbench (FCU) — the visible sensor glyphs + the chip pulse.
//
// Phase 6 of the workbench arc puts a schematic device glyph at each
// sensed AI point's PHYSICAL home on the unit graphic: a wall plate in
// the zone for space-temp, an insertion probe in the return duct for
// rat (owner mockup round — the displayed coil ΔT had no visible
// entering-air measurement), an insertion probe in the discharge duct
// for dat. Clicking a glyph calls the shell's highlightChip hook, which
// pulses that point's statusbar chip with a temporary CSS class
// (.ddcw-chip-hilite) and a one-shot timeout — no rAF loop, no
// interval, because this page's idle cost is profiled
// (tests/perf-profile.mjs).
//
// What this file pins:
//   • coverage — every sensed AI point with a physical home has
//     exactly ONE glyph, and no glyph names anything else;
//   • the pulse — click marks the RIGHT chip, the class appears and
//     then clears on its own;
//   • keyboard — the glyphs themselves are NOT focusable, and the
//     keyboard path is the point mirror's real HTML buttons outside
//     the SVG (owner ruling, codebase-issues #227b: role="img" stays,
//     so nothing inside the drawing may take focus, and the activation
//     affordance moved to the mirror). Both halves are pinned: nothing
//     in the graphic is focusable, and each mirror button fires the
//     same pulse from Enter and from Space;
//   • real-vs-sensed — forcing the wall stat splits the chips: Space
//     shows the lie the program reads, RAT stays on the zone truth
//     (a return-duct probe measures real air);
//   • the accessible name — each glyph carries a native SVG <title>;
//   • id hygiene — the rendered page has no duplicate ids (the glyph
//     group added ids to a graphic that already had many).
//
// The page is deliberately hidden (eleventyExcludeFromCollections +
// noindex), so it is NOT in tests/pages.js — naming the URL directly
// keeps the coverage without un-hiding the page (same note as the
// sibling workbench specs).
//
// No fixed sleeps: every settle is a waitForFunction on class / text
// state (the ddc-workbench-fcu-priority.spec.js house pattern).

const { test, expect } = require('@playwright/test');

// Headless Chromium defaults to prefers-color-scheme: light; force the
// site's default (dark) so the page under test is the one users see.
test.use({ colorScheme: 'dark' });

const URL = '/simulators/ddc-workbench-fcu.html';

// The sensed AI points that have a physical home on the drawing —
// mirrors FCU_POINTS (ddcw-fcu-unit.js): every kind:'ai' sensor
// point. The chip caption is the point's `name`.
const GLYPHED = [
    { point: 'rat',        chip: 'RAT' },
    { point: 'dat',        chip: 'DAT' },
    { point: 'space-temp', chip: 'Space' },
];

function glyphSel(point) {
    return `#fcu-graphic .ddcw-sensor[data-point="${point}"]`;
}

// Is the named chip currently carrying the highlight class?
function chipLit(page, chipName) {
    return page.evaluate((name) => {
        const chips = document.querySelectorAll('#ddcw-io .ddcw-chip');
        for (const c of chips) {
            const cap = c.querySelector('.ddcw-chip-cap');
            if (cap && cap.textContent === name) {
                return c.classList.contains('ddcw-chip-hilite');
            }
        }
        return null;    // no such chip — a test bug, surfaced loudly
    }, chipName);
}

function waitForChipLit(page, chipName, want) {
    return page.waitForFunction(([name, w]) => {
        const chips = document.querySelectorAll('#ddcw-io .ddcw-chip');
        for (const c of chips) {
            const cap = c.querySelector('.ddcw-chip-cap');
            if (cap && cap.textContent === name) {
                return c.classList.contains('ddcw-chip-hilite') === w;
            }
        }
        return false;
    }, [chipName, want]);
}

test.describe('DDC Workbench — visible sensor glyphs', () => {

    test('every glyphed AI point has exactly one glyph, and nothing else is glyphed', async ({ page }) => {
        await page.goto(URL);
        for (const g of GLYPHED) {
            await expect(page.locator(glyphSel(g.point)),
                `one glyph for ${g.point}`).toHaveCount(1);
        }
        // No stray glyphs beyond the pinned set (a glyph for a point
        // with no physical home — or a typo'd data-point — fails here).
        await expect(page.locator('.ddcw-sensor')).toHaveCount(GLYPHED.length);
    });

    test('click pulses the RIGHT chip — the class appears, then clears on its own', async ({ page }) => {
        await page.goto(URL);
        for (const g of GLYPHED) {
            await page.click(glyphSel(g.point));
            await waitForChipLit(page, g.chip, true);
            // Only the matching chip is lit.
            for (const other of GLYPHED) {
                if (other.chip === g.chip) continue;
                expect(await chipLit(page, other.chip),
                    `${other.chip} stays unlit while ${g.chip} pulses`).toBe(false);
            }
            // The pulse releases itself (one-shot timeout, ~1.2 s).
            await waitForChipLit(page, g.chip, false);
        }
    });

    test('nothing inside the graphic is focusable (#227b keeps role="img")', async ({ page }) => {
        await page.goto(URL);
        // The ruling's mechanism: role="img" prunes the subtree, so the
        // ~19 <text> nodes the mirror already carries are not read twice.
        // A focusable descendant is what would force the swap away from
        // it, so this is the assertion that holds the ruling.
        await expect(page.locator('#fcu-graphic')).toHaveAttribute('role', 'img');
        expect(await page.locator('#fcu-graphic .ddcw-sensor[tabindex]').count()).toBe(0);
        expect(await page.locator('#fcu-graphic .ddcw-sensor[role="button"]').count()).toBe(0);
        // The drill-down links are the deliberate exception, and each is
        // named — a nameless tab stop is the failure this rules out.
        const links = page.locator('#fcu-graphic a');
        const n = await links.count();
        expect(n).toBeGreaterThan(0);
        for (let i = 0; i < n; i++) {
            expect(await links.nth(i).getAttribute('aria-label'), 'link ' + i).toBeTruthy();
        }
    });

    test('keyboard: Enter and Space fire the pulse from the mirror button', async ({ page }) => {
        await page.goto(URL);
        const btn = page.locator('.fcu-point-btn[data-point="dat"]');

        await btn.focus();
        await page.keyboard.press('Enter');
        await waitForChipLit(page, 'DAT', true);
        await waitForChipLit(page, 'DAT', false);

        // Space on a real <button> must not scroll the page. Measured as a
        // DELTA, not against zero: the mirror sits below the fold, so
        // focusing it legitimately scrolls it into view first.
        const before = await page.evaluate(() => window.scrollY);
        await page.keyboard.press(' ');
        await waitForChipLit(page, 'DAT', true);
        expect(await page.evaluate(() => window.scrollY)).toBe(before);
        await waitForChipLit(page, 'DAT', false);
    });

    test('every glyphed point has a mirror button, and the latch is exclusive', async ({ page }) => {
        await page.goto(URL);
        await expect(page.locator('.fcu-point-btn[data-point]')).toHaveCount(GLYPHED.length);
        for (const g of GLYPHED) {
            await page.click(`.fcu-point-btn[data-point="${g.point}"]`);
            await waitForChipLit(page, g.chip, true);
            const pressed = await page.evaluate(() => Array.from(
                document.querySelectorAll('.fcu-point-btn[data-point]'),
                (b) => b.getAttribute('data-point') + ':' + b.getAttribute('aria-pressed')));
            expect(pressed.filter((r) => r.endsWith(':true'))).toEqual([g.point + ':true']);
            await waitForChipLit(page, g.chip, false);
        }
    });

    test('forcing the wall stat splits the chips — Space shows the lie, RAT stays on the truth', async ({ page }) => {
        // The real-vs-sensed commissioning moment, on the chip strip:
        // the space-temp override forces the value the PROGRAM reads,
        // but a return-duct probe measures real air, so the RAT chip
        // keeps reporting the integrating zone truth and the two chips
        // visibly disagree. (Engine-direct twin: the sensor-override
        // rows in ddcw-fcu-unit.spec.js.)
        await page.goto(URL);
        await page.click('#fcu-ovr-toggle');
        await page.fill('#fcu-ovr-input', '60');
        // Space chip settles on the forced value at the next host tick.
        await page.waitForFunction(() => {
            const chips = document.querySelectorAll('#ddcw-io .ddcw-chip');
            for (const c of chips) {
                if (c.querySelector('.ddcw-chip-cap').textContent === 'Space') {
                    return c.querySelector('.ddcw-chip-val').textContent === '60.0 °F';
                }
            }
            return false;
        });
        // RAT keeps the truth: the real zone arrived at 76 °F and no
        // physics here can drag it anywhere near the forced 60.
        const rat = await page.evaluate(() => {
            const chips = document.querySelectorAll('#ddcw-io .ddcw-chip');
            for (const c of chips) {
                if (c.querySelector('.ddcw-chip-cap').textContent === 'RAT') {
                    return c.querySelector('.ddcw-chip-val').textContent;
                }
            }
            return null;
        });
        expect(rat).not.toBe('60.0 °F');
        expect(parseFloat(rat)).toBeGreaterThan(65);
    });

    test('a forced sensor lies to the DRAWING too — truth only at the override readout', async ({ page }) => {
        // The AHU render convention, harmonised onto the FCU 2026-08-03:
        // the graphic's wells paint the SENSED value per point, so a
        // forced wall stat rewrites the zone box on the drawing and the
        // mirror cell under it — exactly as a stuck input lies to a real
        // front end — while the ACTUAL integrated zone appears in one
        // place only, the `zone` readout beside the override control
        // (#fcu-zone-val). Before this pass the FCU painted the truth
        // everywhere and the lie showed only on the Space chip, which
        // told the commissioning story backwards.
        await page.goto(URL);
        await page.click('#fcu-ovr-toggle');
        await page.fill('#fcu-ovr-input', '60');
        // The zone box (SVG well) and the mirror settle on the lie at
        // the next host tick.
        await page.waitForFunction(() =>
            document.getElementById('fcu-zone-t').textContent === '60.0 °F');
        await page.waitForFunction(() =>
            document.getElementById('fcu-zone-r').textContent.startsWith('60.0 /'));
        // The truth readout keeps the integrating zone: it arrived at
        // 76 °F and nothing here can drag it near the forced 60.
        const truth = await page.evaluate(() =>
            document.getElementById('fcu-zone-val').textContent);
        expect(truth).toMatch(/^zone /);
        expect(parseFloat(truth.replace(/^zone\s*/, ''))).toBeGreaterThan(65);
        // Release: the well rejoins the truth.
        await page.click('#fcu-ovr-toggle');
        await page.waitForFunction(() =>
            parseFloat(document.getElementById('fcu-zone-t').textContent) > 65);
    });

    test('forcing draws the dashed ring on the glyph, and release clears it', async ({ page }) => {
        // The forced-sensor marker (.fcu-forced-mark, the AHU page's
        // dashed accent ring) — a forced input that leaves no mark on
        // the drawing is how a wrong number survives a shift change.
        // Only space-temp has a force control today, so the wall plate
        // is the one glyph a user can light; the ring must also RELEASE,
        // or every drawing would eventually carry it.
        await page.goto(URL);
        const glyph = page.locator(glyphSel('space-temp'));
        await expect(glyph).not.toHaveClass(/is-forced/);
        // Every glyph carries a mark rect — the per-point seam.
        for (const g of GLYPHED) {
            await expect(page.locator(`${glyphSel(g.point)} .fcu-forced-mark`),
                `${g.point} carries a forced-mark rect`).toHaveCount(1);
        }
        await page.click('#fcu-ovr-toggle');
        await expect(glyph).toHaveClass(/is-forced/);
        // The ring is real ink while forced: the mark rect gains a
        // stroke (it is stroke:none at rest, so the drawing carries no
        // extra ink unforced).
        const stroked = await page.evaluate((sel) => {
            const m = document.querySelector(sel + ' .fcu-forced-mark');
            return getComputedStyle(m).stroke;
        }, glyphSel('space-temp'));
        expect(stroked).not.toBe('none');
        // The other two glyphs stay unlit — the flag is per point.
        await expect(page.locator(glyphSel('rat'))).not.toHaveClass(/is-forced/);
        await expect(page.locator(glyphSel('dat'))).not.toHaveClass(/is-forced/);
        await page.click('#fcu-ovr-toggle');
        await expect(glyph).not.toHaveClass(/is-forced/);
    });

    test('each glyph exposes an accessible name via a native SVG <title>', async ({ page }) => {
        await page.goto(URL);
        for (const g of GLYPHED) {
            const title = await page.locator(`${glyphSel(g.point)} > title`).textContent();
            expect(title && title.trim().length,
                `${g.point} carries a non-empty <title>`).toBeGreaterThan(0);
            expect(title.toLowerCase()).toContain('sensor');
        }
    });

    test('no duplicate ids on the rendered page', async ({ page }) => {
        await page.goto(URL);
        const dupes = await page.evaluate(() => {
            const seen = new Map();
            document.querySelectorAll('[id]').forEach((el) => {
                seen.set(el.id, (seen.get(el.id) || 0) + 1);
            });
            return Array.from(seen.entries())
                .filter(([, n]) => n > 1)
                .map(([id, n]) => `${id} ×${n}`);
        });
        expect(dupes).toEqual([]);
    });
});
