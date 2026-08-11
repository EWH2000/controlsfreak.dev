// DDC Workbench (FCU) — the cool-2stage-safeties program end-to-end.
//
// The engine-direct rows (ddcw-fcu-unit.spec.js) prove the sheet's
// logic headless: latch trip/hold/clear against its own const blocks,
// min-off enforcement, fan ride-through. This spec pins the CLOSED
// LOOP on the built page — the piece no vm run can see: the program's
// dat AI is fed by the plant's own lagged coil physics, so the freeze
// dive that trips the lockout is produced by the unit, not by a test
// poking a block value.
//
// The deterministic recipe (all physics, no fixed timeouts):
//   • pin the cooling call with the SENSOR override (85 °F forced —
//     an input-side force, so it works in the all-released arrival
//     state and holds the call regardless of what the real zone does);
//   • crank the sim clock to 60× so the coil lag and the min-off TON
//     play out in real seconds;
//   • hand-force the fan slow (slot 8) under the standing 2-stage
//     call — the starved coil dives DAT through the trip line;
//   • assert the lockout: both stage chips drop, Fan En rides through, the
//     hand-held speed keeps the air moving, and the unit verdict names
//     the state ("DAT low-limit annunciator latched …" — the ladder
//     line this program motivates; observation wording by design, the
//     annunciator is plant-side and must not assert WHO cut the
//     stages — see the DAT_LOW_* note in ddcw-fcu-unit.js);
//   • release the fan: at full airflow DAT recovers above the clear
//     line, the min-off elapses, the stages restage, and the verdict
//     returns to healthy cooling.
//
// Program-switch note: the safeties sheet boots with its min-off TON
// at zero, so the stages hold off for the preset after the download —
// the anti-short-cycle power-up delay. The first waitForChip('Clg Stg 1','ON')
// after the switch rides through that window; at 60× it is a couple of
// real seconds.
//
// The page was hidden when this file was written; graduation (Phase 8,
// 2026-08-04) added its canonical and tests/pages.js row, so the
// site-wide sweeps reach it too (same note as the sibling workbench
// specs).
//
// No fixed sleeps: every settle is a waitForFunction on chip / verdict
// TEXT (the ddc-workbench-fcu-priority.spec.js house pattern).

const { test, expect } = require('@playwright/test');

// Headless Chromium defaults to prefers-color-scheme: light; force the
// site's default (dark) so the page under test is the one users see.
test.use({ colorScheme: 'dark' });

const URL = '/simulators/ddc-workbench-fcu.html';

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

function chipMap(page) {
    return page.evaluate(() => {
        const chips = {};
        document.querySelectorAll('#ddcw-io .ddcw-chip').forEach((c) => {
            chips[c.querySelector('.ddcw-chip-cap').textContent] =
                c.querySelector('.ddcw-chip-val').textContent;
        });
        return chips;
    });
}

test.describe('DDC Workbench — 2-stage + safeties program', () => {

    test('DAT low-limit lockout: stages cut, fan rides through, verdict names it; recovery restages', async ({ page }) => {
        await page.goto(URL);
        // Arrival on the default (unprotected) program.
        await waitForChip(page, 'Clg Stg 1', 'ON');

        // 60× — the coil lag and the min-off timer in real seconds.
        await page.locator('#fcu-speed-slider').evaluate((el) => {
            el.value = '60';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });

        // Pin the cooling call: force the space-temp SENSOR to 85 °F.
        // Input-side, so it needs no slot and holds the 2-stage call
        // no matter where the real zone integrates to.
        await page.click('#fcu-ovr-toggle');
        await page.locator('#fcu-ovr-input').fill('85');
        await waitForChip(page, 'Clg Stg 2', 'ON');

        // Download the safeties program and ride out its power-up
        // min-off — the stages must come back on their own.
        await page.selectOption('#ddcw-program', 'cool-2stage-safeties');
        await waitForChip(page, 'Clg Stg 1', 'ON');
        await waitForChip(page, 'Clg Stg 2', 'ON');

        // Starve the coil: hand the fan to slot 8 and drag it to 40%.
        // The 2-stage call stands, so DAT dives — the default sheet's
        // freeze dive, now with a program that answers it.
        await page.locator('#fcu-null-fan').uncheck();
        await page.locator('#fcu-fan-slider').evaluate((el) => {
            el.value = '40';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });

        // The lockout, all on one painted tick: stages cut, fan-enable
        // riding through, the hand-held speed still moving air, and
        // the verdict naming the state.
        await page.waitForFunction(() => {
            const chips = {};
            document.querySelectorAll('#ddcw-io .ddcw-chip').forEach((c) => {
                chips[c.querySelector('.ddcw-chip-cap').textContent] =
                    c.querySelector('.ddcw-chip-val').textContent;
            });
            const verdict = document.getElementById('fcu-verdict').textContent;
            return verdict.includes('DAT low-limit annunciator latched')
                && chips['Clg Stg 1'] === 'OFF'
                && chips['Clg Stg 2'] === 'OFF'
                && chips['Fan En'] === 'ON'
                && chips['Fan Spd'] === '40 %';
        });

        // Spot-check the same state through the evaluate seam (typed,
        // not just truthy) — and that the off-program window blames
        // only the hand-held fan, not the cut stages: y1/y2 are the
        // SEQUENCE's doing at slot 16, so they are on-program.
        const chips = await chipMap(page);
        expect(chips['Fan En']).toBe('ON');
        const offprog = await page.evaluate(
            () => document.getElementById('ddcw-offprog').textContent);
        // The window groups by the slot in play (#283), so "Fan Spd 40 %"
        // sitting directly against the tail is itself the claim that the
        // fan is ALONE at slot 8 — a second held point would join the
        // same line ahead of the em dash. The stage names must not appear
        // at all: they are the sequence's doing at slot 16.
        expect(offprog).toContain(
            'Fan Spd 40 % — commanded by slot 8 (Manual Operator) — write NULL to release.');
        expect(offprog).not.toContain('Clg Stg 1');
        expect(offprog).not.toContain('Clg Stg 2');

        // Release the fan to the sequence: full airflow warms the coil
        // past the clear line, the min-off elapses, and the unit comes
        // back — the verdict returns to healthy cooling.
        await page.locator('#fcu-null-fan').check();
        await waitForChip(page, 'Clg Stg 1', 'ON');
        await page.waitForFunction(() => (
            document.getElementById('fcu-verdict').textContent
                .includes('Cooling — clear ΔT across the coil')
        ));
    });

    // The READER'S path, click for click, from the sheet note above the
    // wiresheet ("Why proof has to come first"). The engine-direct rows
    // prove the interlock on the graph; this one proves the printed
    // instruction produces what it promises — which is a different
    // claim, and the one that went wrong: a scenario writes slot 8, and
    // slot 8 outranks the sequence at 16, so the stages CANNOT drop
    // until the reader hands them back. Anything that re-words that
    // paragraph without re-measuring the page reddens here.
    test("the note's belt walkthrough: the scenario holds the stages, releasing them lets the interlock act", async ({ page }) => {
        await page.goto(URL);
        await waitForChip(page, 'Clg Stg 1', 'ON');

        // 60× so the proof make-delay and the min-off play out in real
        // seconds. No assertion below reads either constant.
        await page.locator('#fcu-speed-slider').evaluate((el) => {
            el.value = '60';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });

        await page.selectOption('#ddcw-program', 'cool-2stage-safeties');
        await waitForChip(page, 'Clg Stg 1', 'ON');

        // "Break the belt from the scenario row and watch it: the fan
        // command stays on, the blades stop, and the DAT chip climbs to
        // the zone temperature."
        await page.click('[data-preset="belt"]');
        await waitForChip(page, 'Fan Sts', 'OFF');
        const held = await chipMap(page);
        expect(held['Fan En'], 'the fan command stands — the BELT failed').toBe('ON');
        await page.waitForFunction(() => {
            const chips = {};
            document.querySelectorAll('#ddcw-io .ddcw-chip').forEach((c) => {
                chips[c.querySelector('.ddcw-chip-cap').textContent] =
                    c.querySelector('.ddcw-chip-val').textContent;
            });
            const num = (s) => parseFloat(String(s).replace(/[^\d.\-]/g, ''));
            // A blind discharge probe reads the room. Band, not a
            // value: the zone keeps integrating under the dead coil.
            return Math.abs(num(chips['DAT']) - num(chips['Zone Temp'])) < 1;
        });

        // "The stages hold, though" — slot 8 outranks the sequence, and
        // the off-program window says so in as many words.
        expect(held['Clg Stg 1'], 'the scenario wrote y1 at slot 8').toBe('ON');
        expect(held['Clg Stg 2'], 'the scenario wrote y2 at slot 8').toBe('ON');
        const offprog = await page.evaluate(
            () => document.getElementById('ddcw-offprog').textContent);
        // A scenario writes slot 8 on every output it touches, so the
        // grouped window (#283) names them on ONE line under one tail —
        // both stages among them, at the values the chips just read.
        expect(offprog).toContain('Clg Stg 1 ON');
        expect(offprog).toContain('Clg Stg 2 ON');
        expect(offprog).toContain(
            'all commanded by slot 8 (Manual Operator) — write NULL to release.');

        // "Hand them back with the NULL — released box under Compressor
        // stage and they drop on the next tick: on the proof interlock."
        await page.locator('#fcu-null-stage').check();
        await waitForChip(page, 'Clg Stg 1', 'OFF');
        await waitForChip(page, 'Clg Stg 2', 'OFF');
        const dropped = await chipMap(page);
        expect(dropped['Fan En'], 'the fan is still commanded on').toBe('ON');
        expect(dropped['Fan Sts'], 'and still proving nothing').toBe('OFF');
        // The verdict names the PROOF, not a discharge reading — the
        // whole point of the paragraph.
        await page.waitForFunction(() => (
            document.getElementById('fcu-verdict').textContent
                .includes('airflow proof is down')
        ));
    });
});
