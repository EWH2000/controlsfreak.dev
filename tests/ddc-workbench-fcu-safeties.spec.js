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
//   • assert the lockout: Y1/Y2 chips drop, Fan En rides through, the
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
// the anti-short-cycle power-up delay. The first waitForChip('Y1','ON')
// after the switch rides through that window; at 60× it is a couple of
// real seconds.
//
// The page is deliberately hidden (eleventyExcludeFromCollections +
// noindex), so it is NOT in tests/pages.js — naming the URL directly
// keeps the coverage without un-hiding the page (same note as the
// sibling workbench specs).
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
        await waitForChip(page, 'Y1', 'ON');

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
        await waitForChip(page, 'Y2', 'ON');

        // Download the safeties program and ride out its power-up
        // min-off — the stages must come back on their own.
        await page.selectOption('#ddcw-program', 'cool-2stage-safeties');
        await waitForChip(page, 'Y1', 'ON');
        await waitForChip(page, 'Y2', 'ON');

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
                && chips['Y1'] === 'OFF'
                && chips['Y2'] === 'OFF'
                && chips['Fan En'] === 'ON'
                && chips['Fan'] === '40 %';
        });

        // Spot-check the same state through the evaluate seam (typed,
        // not just truthy) — and that the off-program window blames
        // only the hand-held fan, not the cut stages: Y1/Y2 are the
        // SEQUENCE's doing at slot 16, so they are on-program.
        const chips = await chipMap(page);
        expect(chips['Fan En']).toBe('ON');
        const offprog = await page.evaluate(
            () => document.getElementById('ddcw-offprog').textContent);
        expect(offprog).toContain('Fan — commanded by slot 8');
        expect(offprog).not.toContain('Y1 —');
        expect(offprog).not.toContain('Y2 —');

        // Release the fan to the sequence: full airflow warms the coil
        // past the clear line, the min-off elapses, and the unit comes
        // back — the verdict returns to healthy cooling.
        await page.locator('#fcu-null-fan').check();
        await waitForChip(page, 'Y1', 'ON');
        await page.waitForFunction(() => (
            document.getElementById('fcu-verdict').textContent
                .includes('Cooling — clear ΔT across the coil')
        ));
    });
});
