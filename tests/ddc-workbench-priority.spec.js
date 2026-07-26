// DDC Workbench — the three-slot priority arbitration (#209).
//
// Every actuator point on the workbench owns a real 16-slot BACnet
// priority array (/scripts/point-arbitration.js): the sequence writes
// slot 16, the hand controls write slot 8 (Manual Operator), and the
// point rests on Relinquish_Default when both are NULL. The
// engine-direct spec (point-arbitration.spec.js) proves the resolver;
// this spec pins the PAGE behaviors built on top of it:
//
//   • deleting an output block RELEASES slot 16 — the point falls to
//     Relinquish_Default and the off-program window names that REASON,
//     not just the value;
//   • the NULL boxes are the release/take mechanics, bumpless both
//     ways: unchecking seeds slot 8 with the resolved value, a hand
//     move rewrites slot 8, and writing NULL back hands the point to
//     the sequence within a tick;
//   • the D4 distinction the window teaches: "slot 16 commands OFF"
//     (a present-but-unwired block — NOT listed) versus "slot 16 is
//     NULL" (block gone — listed, Relinquish_Default named). Same
//     displayed value, opposite meaning — the window is the only
//     surface that tells them apart;
//   • scenario presets are operator writes (slot 8) — the NULL boxes
//     re-sync unchecked from slot state, and no AUTO/HAND mode chrome
//     exists anywhere (Variant A collapsed the mode into the boxes);
//   • the compressor readout on the graphic can never disagree with
//     the Y1/Y2 chips — both surfaces render from the same resolved
//     plant.actuators, and a MutationObserver holds them to it across
//     every repaint of a full replay.
//
// The page is deliberately hidden (eleventyExcludeFromCollections +
// noindex), so it is NOT in tests/pages.js — that manifest feeds
// smoke.spec.js, responsive.spec.js and contrast-sweep.spec.js, all of
// which would pull the page back into the crawl-facing surface. Naming
// the URL directly here keeps the coverage without un-hiding the page.
//
// No fixed timeouts: the host ticks at 10 Hz (and the sim-speed
// default is high), so every settle is a waitForFunction on chip /
// window TEXT, never a sleep.

const { test, expect } = require('@playwright/test');

// Headless Chromium defaults to prefers-color-scheme: light; force the
// site's default (dark) so the page under test is the one users see.
test.use({ colorScheme: 'dark' });

const URL = '/simulators/ddc-workbench.html';

// The two off-program reasons, verbatim from the page's renderer —
// asserting the full entry pins the REASON wording, not mere presence.
const Y1_RD_ENTRY = 'Y1 — slot 16 is NULL (no y1 block on the wiresheet) '
    + '— holding Relinquish_Default (OFF).';
const Y2_RD_ENTRY = 'Y2 — slot 16 is NULL (no y2 block on the wiresheet) '
    + '— holding Relinquish_Default (OFF).';

// ── statusbar chip helpers ── chips are keyed by their cap text
// (p.name), the one stable handle the shell renders from unit.points.
function waitForChip(page, name, want) {
    return page.waitForFunction(([n, w]) => {
        const chips = document.querySelectorAll('#ddcw-io .ddcw-chip');
        for (const c of chips) {
            const cap = c.querySelector('.ddcw-chip-cap');
            if (cap && cap.textContent === n) {
                return c.querySelector('.ddcw-chip-val').textContent === w;
            }
        }
        return false;
    }, [name, want]);
}

function offprogState(page) {
    return page.evaluate(() => {
        const box = document.getElementById('ddcw-offprog');
        return { hidden: box.hidden, text: box.textContent };
    });
}

function waitForOffprogEntry(page, substr) {
    return page.waitForFunction((s) => {
        const box = document.getElementById('ddcw-offprog');
        return !box.hidden && box.textContent.includes(s);
    }, substr);
}

// Select a block on the wiresheet and delete it via the inspector.
// Clicking the head avoids the pins (a pin click starts a wire, not a
// selection); selection happens on pointerup without movement.
async function deleteBlock(page, blockId) {
    await page.click('.tabs.tabs-flush [data-tab="wiresheet"]');
    await page.click('.fbe-block[data-id="' + blockId + '"] .fbe-block-head');
    await page.click('#ddcw-fbe-inspector .fbe-insp-del');
}

test.describe('DDC Workbench — point-priority arbitration', () => {

    test('deleting the y1 block releases slot 16 → Relinquish_Default, and the window names the reason', async ({ page }) => {
        await page.goto(URL);
        // Arrival: cool-2stage stages Y1 on the warm zone — slot 16 is
        // commanding, so the off-program window has nothing to say.
        await waitForChip(page, 'Y1', 'ON');
        expect((await offprogState(page)).hidden).toBe(true);

        await deleteBlock(page, 'y1');

        // Nothing writes slot 16 any more → the point falls to
        // Relinquish_Default (false) and the chip flips OFF.
        await waitForChip(page, 'Y1', 'OFF');
        await waitForOffprogEntry(page, Y1_RD_ENTRY);

        // Pin the REASON, not just presence: slot-16-NULL wording plus
        // the Relinquish_Default value, in one entry.
        const w = await offprogState(page);
        expect(w.hidden).toBe(false);
        expect(w.text).toContain('slot 16 is NULL');
        expect(w.text).toContain('Relinquish_Default (OFF)');
    });

    test('NULL box round-trip: uncheck seeds slot 8 bumplessly, hand drives it, NULL hands it back', async ({ page }) => {
        await page.goto(URL);
        await waitForChip(page, 'Fan', '100 %');

        // Uncheck NULL: the hand takes over at the point's CURRENT
        // resolved value (bumpless) — slot 8 opens at 100, not 0.
        await page.locator('#fcu-null-fan').uncheck();
        await waitForOffprogEntry(page,
            'Fan — commanded by slot 8 (Manual Operator) at 100 %');

        // Drive the (now-enabled) slider to 0 — every move rewrites
        // slot 8, and both surfaces follow.
        await page.locator('#fcu-fan-slider').evaluate((el) => {
            el.value = '0';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await waitForChip(page, 'Fan', '0 %');
        await waitForOffprogEntry(page,
            'Fan — commanded by slot 8 (Manual Operator) at 0 % — write NULL to release.');

        // Write NULL back: slot 8 releases, the sequence's slot-16
        // command (100) returns within a tick, and the entry drops.
        await page.locator('#fcu-null-fan').check();
        await waitForChip(page, 'Fan', '100 %');
        await page.waitForFunction(() => {
            const box = document.getElementById('ddcw-offprog');
            return box.hidden || !box.textContent.includes('Fan — commanded');
        });
        expect(await page.locator('#fcu-null-fan').isChecked()).toBe(true);
    });

    test('D4: slot 16 commanding OFF (unwired block) is NOT off-program; slot 16 NULL (cleared) IS', async ({ page }) => {
        await page.goto(URL);
        await waitForChip(page, 'Y1', 'ON');
        await waitForChip(page, 'Y2', 'OFF');

        // Stage up via the SENSOR override — an input-side force that
        // works in the default all-released state precisely because it
        // is NOT part of the output priority machinery.
        await page.click('#fcu-ovr-toggle');
        await page.locator('#fcu-ovr-input').fill('85');
        await waitForChip(page, 'Y2', 'ON');

        // Switch to cool-1stage: its y2 block is present but unwired,
        // and an unwired input evaluates false — so the SEQUENCE
        // commands Y2 off at slot 16 every tick. Same OFF as a release,
        // but the point is FOLLOWING the program: the window must stay
        // empty.
        await page.selectOption('#ddcw-program', 'cool-1stage');
        await waitForChip(page, 'Y2', 'OFF');
        await page.waitForFunction(() => (
            document.getElementById('ddcw-offprog').hidden === true
        ));
        // The block really is on the sheet — that presence is what
        // keeps slot 16 written.
        await page.click('.tabs.tabs-flush [data-tab="wiresheet"]');
        await expect(page.locator('.fbe-block[data-id="y2"]')).toHaveCount(1);

        // Clear the canvas: now NOTHING writes slot 16, so the same
        // displayed OFF is a different state — resting on
        // Relinquish_Default — and the window says so by name.
        await page.click('#ddcw-fbe-clear');
        await waitForChip(page, 'Y2', 'OFF');
        await waitForOffprogEntry(page, Y2_RD_ENTRY);
        const w = await offprogState(page);
        expect(w.text).toContain('Relinquish_Default (OFF)');
    });

    test('a scenario preset writes slot 8: NULL boxes re-sync unchecked, window lists the holds, no mode chrome exists', async ({ page }) => {
        await page.goto(URL);
        await waitForChip(page, 'Y1', 'ON');

        // Variant A: the AUTO/HAND mode buttons were deleted outright —
        // not hidden, GONE.
        await expect(page.locator('#ddcw-mode-auto')).toHaveCount(0);
        await expect(page.locator('[id^="ddcw-mode"]')).toHaveCount(0);

        // All released on arrival — the program owns every output.
        for (const id of ['#fcu-null-stage', '#fcu-null-fan', '#fcu-null-fanen']) {
            expect(await page.locator(id).isChecked()).toBe(true);
        }
        expect((await offprogState(page)).hidden).toBe(true);

        // A preset is an operator write: slot 8 on every output it
        // touches. The NULL boxes mirror slot state on the next paint —
        // no extra wiring, so they cannot drift from the truth.
        await page.click('[data-preset="compoff"]');
        await page.waitForFunction(() => (
            !document.getElementById('fcu-null-stage').checked
            && !document.getElementById('fcu-null-fan').checked
            && !document.getElementById('fcu-null-fanen').checked
        ));
        await page.waitForFunction(() => {
            const box = document.getElementById('ddcw-offprog');
            if (box.hidden) return false;
            const t = box.textContent;
            return (t.match(/slot 8 \(Manual Operator\)/g) || []).length === 4
                && t.includes('Fan —') && t.includes('Fan En —')
                && t.includes('Y1 —') && t.includes('Y2 —');
        });
    });

    test('the compressor readout never disagrees with the Y1/Y2 chips across a full replay', async ({ page }) => {
        await page.goto(URL);
        await waitForChip(page, 'Y1', 'ON');

        // Both surfaces render from the same resolved plant.actuators
        // inside one synchronous hostTick, so no observed repaint may
        // ever show them split. MutationObserver callbacks run after
        // the whole tick's DOM writes settle (microtask), so a
        // mid-tick transient can't false-positive this.
        await page.evaluate(() => {
            window.__aggViolations = [];
            const read = () => {
                const chips = {};
                document.querySelectorAll('#ddcw-io .ddcw-chip').forEach((c) => {
                    chips[c.querySelector('.ddcw-chip-cap').textContent] =
                        c.querySelector('.ddcw-chip-val').textContent;
                });
                return {
                    y1: chips['Y1'],
                    y2: chips['Y2'],
                    comp: document.getElementById('fcu-comp-r').textContent,
                };
            };
            const expected = (s) => (
                s.y2 === 'ON' ? 'Stage 2 · ON'
                    : (s.y1 === 'ON' ? 'Stage 1 · ON' : 'OFF'));
            const check = () => {
                const s = read();
                if (s.comp !== expected(s)) {
                    window.__aggViolations.push(JSON.stringify(s));
                }
            };
            const mo = new MutationObserver(check);
            mo.observe(document.getElementById('ddcw-io'),
                { subtree: true, childList: true, characterData: true });
            mo.observe(document.getElementById('fcu-comp-r'),
                { subtree: true, childList: true, characterData: true });
            check();
        });

        // Replay the state changes of the three tests above, settling
        // (on chip text) after each so the observer sees every regime.
        // 1 — delete the y1 block: stage collapses to OFF.
        await deleteBlock(page, 'y1');
        await waitForChip(page, 'Y1', 'OFF');

        // 2 — the fan NULL round-trip (exercises repaints; the
        // compressor must hold OFF through all of it).
        await page.click('.tabs.tabs-flush [data-tab="unit"]');
        await page.locator('#fcu-null-fan').uncheck();
        await page.locator('#fcu-fan-slider').evaluate((el) => {
            el.value = '0';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await waitForChip(page, 'Fan', '0 %');
        await page.locator('#fcu-null-fan').check();
        await waitForChip(page, 'Fan', '100 %');

        // 3 — sensor override stages Y2 (y1 still resting on
        // Relinquish_Default: Stage 2 with Y1 OFF is the agreement
        // rule's y2-wins arm).
        await page.click('#fcu-ovr-toggle');
        await page.locator('#fcu-ovr-input').fill('85');
        await waitForChip(page, 'Y2', 'ON');

        // 4 — program switch restores a full sheet: Y1 ON, Y2 OFF via
        // the unwired block.
        await page.selectOption('#ddcw-program', 'cool-1stage');
        await waitForChip(page, 'Y2', 'OFF');
        await waitForChip(page, 'Y1', 'ON');

        // 5 — Clear the canvas: everything to Relinquish_Default.
        await page.click('.tabs.tabs-flush [data-tab="wiresheet"]');
        await page.click('#ddcw-fbe-clear');
        await waitForChip(page, 'Y1', 'OFF');
        await waitForChip(page, 'Y2', 'OFF');

        // No repaint anywhere in the replay may have split the two
        // surfaces.
        const violations = await page.evaluate(() => window.__aggViolations);
        expect(violations).toEqual([]);

        // And the final settled state agrees outright.
        const final = await page.evaluate(() => ({
            comp: document.getElementById('fcu-comp-r').textContent,
        }));
        expect(final.comp).toBe('OFF');
    });
});
