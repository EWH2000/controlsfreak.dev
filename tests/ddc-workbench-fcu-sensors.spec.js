// DDC Workbench (FCU) — the visible sensor glyphs + the chip pulse.
//
// Phase 6 of the workbench arc puts a schematic device glyph at each
// sensed AI point's PHYSICAL home on the unit graphic: a wall plate in
// the zone for space-temp, an insertion probe in the discharge duct
// for dat. Activating a glyph (click, Enter, or Space — the
// role="button" contract) calls the shell's highlightChip hook, which
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
//   • keyboard — Enter and Space both fire, and the glyphs sit in the
//     page's real tab order (the drill-down links precede them in the
//     SVG, so Tab walks link → link → probe → plate);
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
// mirrors FCU_POINTS (ddcw-fcu-unit.js): the two kind:'ai' sensor
// points. The chip caption is the point's `name`.
const GLYPHED = [
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

    test('keyboard: Enter and Space both fire the pulse from a focused glyph', async ({ page }) => {
        await page.goto(URL);
        const probe = page.locator(glyphSel('dat'));

        await probe.focus();
        await page.keyboard.press('Enter');
        await waitForChipLit(page, 'DAT', true);
        await waitForChipLit(page, 'DAT', false);

        await page.keyboard.press(' ');
        await waitForChipLit(page, 'DAT', true);
        // Space on a role="button" must not scroll the page.
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
        await waitForChipLit(page, 'DAT', false);
    });

    test('tab order reaches every glyph (after the in-graphic drill-down links)', async ({ page }) => {
        await page.goto(URL);
        // The graphic's tab sequence is DOM order: coil link → fan link
        // → the sensors group (probe, then plate). Start from the last
        // drill-down and walk forward.
        await page.locator('a.fcu-link[href*="vfd-mock"]').focus();
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => document.activeElement.getAttribute('data-point')))
            .toBe('dat');
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => document.activeElement.getAttribute('data-point')))
            .toBe('space-temp');
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
