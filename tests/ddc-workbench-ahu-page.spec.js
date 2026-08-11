// The AHU DDC Workbench page — /simulators/ddc-workbench.html.
//
// ⚠ THIS FILE PREDATES THE PAGE BEING PUBLIC — it was written while
// the page was HIDDEN (`noindex` + `eleventyExcludeFromCollections` +
// no `canonical`) and was the only thing that walked it. Graduation
// (Phase 8, 2026-08-04) added the canonical and the tests/pages.js
// rows, so the site-wide sweeps reach the page now: smoke loads it,
// responsive checks it at phone widths, contrast-sweep measures it in
// both themes. This spec remains the page's BEHAVIORAL coverage — the
// unit rows, the shell contract, and the hand-written rows below,
// which the generic sweeps cannot know to assert.
//
// POLICY — INVARIANTS, NOT FEEL CONSTANTS. The unit module's TUNE BY
// FEEL block is owner-tunable by design and its rough constants are
// first-cut engineering guesses. Nothing below pins a temperature, a
// capacity or a time constant. Every row asserts a CONTRACT (the page
// boots, the shell finds its skeleton, the roster renders), a
// STRUCTURE (every dual-surface readout resolves on both surfaces), a
// DIRECTION (opening the damper on a cold day drops the mixed air), or
// a BEHAVIOUR (the override splits sensed from truth; a released
// control tracks the sequence).

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { expectTouchFloor, expectTouchFloorHeight } = require('./touch-floor.js');

const URL = '/simulators/ddc-workbench.html';

// Load with a console/pageerror watcher armed from before navigation, so
// a boot-time throw inside createWorkbench cannot race past us. The
// shell's boot paint is synchronous inside the page's inline IIFE, and
// the 10 Hz interval starts immediately after, so a short settle is
// enough to catch a first-tick throw as well as a load-time one.
async function open(page) {
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    await page.goto(URL);
    await page.waitForTimeout(400);
    return errs;
}

// Drive the sim forward without waiting real seconds: the host ticks at
// 10 Hz with a 20× default multiplier, so 1.2 s of wall clock is roughly
// 4 sim-minutes. Used only where a row needs the plant to MOVE, never to
// reach a specific number.
const settle = (page, ms) => page.waitForTimeout(ms);

// Move the weather AND WAIT FOR IT TO ARRIVE.
//
// The OA slider no longer sets the outdoor air — it sets where the
// outdoor air is HEADED, and the plant walks there at OA_RAMP_RATE
// (ddcw-ahu-unit.js; the sustained-cold ruling, 2026-08-09). So every
// row that needs the new weather to have LANDED goes through here, and
// this helper polls the OAT readout — which paints the plant's own
// truth — instead of sleeping a computed number of milliseconds. That
// choice is load-bearing, not tidiness: the travel is fixed in
// SIM-seconds, and a host under load runs fewer 10 Hz ticks per wall
// second, which turns the same travel into MORE wall time. A fixed
// settle sized off a quiet box is a flake generator on a busy one.
//
// Rows that want the JOURNEY rather than the destination — the trip
// rows below, which are about cold air arriving eventually — wait on
// what they actually care about instead of calling this.
async function setWeather(page, degF) {
    await page.fill('#ahu-oa-slider', String(degF));
    await page.dispatchEvent('#ahu-oa-slider', 'input');
    await expect
        .poll(async () => parseFloat(await page.locator('#ahu-r-oat').textContent()),
            { timeout: 30000, message: 'the weather never reached ' + degF + ' °F' })
        .toBeCloseTo(degF, 0);
}

test.describe('AHU workbench page: it boots', () => {

    test('loads clean, with no console errors', async ({ page }) => {
        const errs = await open(page);
        await expect(page).toHaveTitle(/DDC Workbench/);
        await expect(page.locator('h1.tool-card-title')).toContainText('DDC Workbench');
        expect(errs, 'the page booted without complaining').toEqual([]);
    });

    test('the page is public, and public the way the house does it', async () => {
        // Read off the SOURCE. This row's predecessor asserted the
        // hidden shape (noindex + eleventyExcludeFromCollections + no
        // canonical) and named graduation as the event that flips it;
        // Phase 8 (2026-08-04) is that event. Both workbench pages
        // graduate together — the unit selector cross-anchors them, so
        // one public and one hidden would strand a live link on a
        // noindexed page. A regression back to the hidden shape gets
        // noticed here, along with the merge-authority rows that
        // flipped with it (CLAUDE.md, Workflow).
        const pages = require('./pages.js');
        for (const file of ['ddc-workbench.html', 'ddc-workbench-fcu.html']) {
            const src = fs.readFileSync(
                path.join(__dirname, '..', 'html', 'simulators', file), 'utf8');
            const fm = src.slice(0, src.indexOf('---', 3));
            expect(fm, `${file} canonical`).toMatch(new RegExp(
                '^canonical: https://controlsfreak\\.dev/simulators/'
                + file.replace('.', '\\.') + '$', 'm'));
            expect(fm, `${file}: noindex would disclaim the canonical`)
                .not.toMatch(/noindex/);
            expect(fm, `${file}: exclusion would pull it from the sitemap`)
                .not.toMatch(/eleventyExcludeFromCollections/);

            // And the manifest lists it — pages.js is what routes the
            // smoke, responsive and contrast sweeps here.
            expect(pages.some((p) => p.url === '/simulators/' + file),
                `${file} absent from tests/pages.js = absent from every site-wide sweep`)
                .toBe(true);
        }
    });

    test('the shell finds its whole markup skeleton', async ({ page }) => {
        await open(page);
        // The four ids whose absence is a TypeError inside
        // createWorkbench, plus the two panes and the tab strip. The
        // shell's header calls these the markup contract; a page that
        // drops one boots part-way and dies with a message that names
        // neither the page nor the contract.
        for (const sel of ['#ddcw-io', '#ddcw-program', '#ddcw-offprog',
            '#ddcw-offprog-list', '#tab-unit', '#tab-wiresheet',
            '.tabs.tabs-flush [data-tab="unit"]',
            '.tabs.tabs-flush [data-tab="wiresheet"]', '.tool-card']) {
            await expect(page.locator(sel), sel).toHaveCount(1);
        }
        // The off-program window must stay in the accessibility tree
        // while empty — the .is-empty collapse, never `hidden`, or the
        // first entry announces nothing.
        const off = page.locator('#ddcw-offprog');
        await expect(off).toHaveAttribute('role', 'status');
        await expect(off).not.toHaveAttribute('hidden', /.*/);
    });

    test('the program graph builds and every actuator follows it', async ({ page }) => {
        await open(page);
        // The picker is built BY THE SHELL from unit.programs — the
        // markup ships an empty <select> — so options existing at all
        // proves FBE.makeGraph got a valid literal. That call
        // (ddcw-shell.js:565) is where a unit with no programs dies, 45
        // lines before wireControls would have been reached.
        const opts = page.locator('#ddcw-program option');
        await expect(opts).toHaveCount(3);            // both sheets + the disabled "Custom (edited)"
        await expect(opts.nth(0)).toHaveAttribute('value', 'econ-2stage');
        await expect(opts.nth(1)).toHaveAttribute('value', 'econ-2stage-lowlimits');
        await expect(opts.nth(2)).toHaveAttribute('value', 'custom');

        // ⚠ THE OFF-PROGRAM WINDOW BEING EMPTY IS THE REAL ASSERTION
        // HERE. The shell releases slot 16 every tick for any actuator
        // with no block on the sheet, so an unauthored output rests at
        // its Relinquish_Default (0 / false) and the machine sits dead
        // with no error anywhere. An empty window means all six outputs
        // are authored and following the sequence.
        await expect(page.locator('#ddcw-offprog-list li')).toHaveCount(0);
        await expect(page.locator('#ddcw-offprog')).toHaveClass(/is-empty/);
    });
});

test.describe('AHU workbench page: the surfaces render', () => {

    test('the statusbar carries one chip per roster point', async ({ page }) => {
        await open(page);
        // 5 AI + 1 BI + 3 AO + 3 BO + 5 params = 17. The count is a
        // DESIGN ruling (docs/air-side-sim.md) that the unit module's own
        // spec pins by id; here it only has to reach the strip, which is
        // what proves the shell read the roster this page loaded.
        await expect(page.locator('#ddcw-io .ddcw-chip')).toHaveCount(17);
        // Every chip carries a caption and a value node, because
        // highlightChip marks the chip through its VALUE node's parent.
        await expect(page.locator('#ddcw-io .ddcw-chip-val')).toHaveCount(17);
    });

    test('the graphic renders, with its stations and its five sensor glyphs', async ({ page }) => {
        await open(page);
        const svg = page.locator('#ahu-graphic');
        await expect(svg).toBeVisible();
        // Named natively, the education/simulator idiom — role="img" plus
        // a title/desc pair. The role is the #227(b) ruling: it makes the
        // subtree presentational, which is why nothing inside is
        // focusable and the activation affordance lives outside.
        await expect(svg).toHaveAttribute('role', 'img');
        await expect(svg.locator('#ahu-title')).toHaveCount(1);
        await expect(svg.locator('#ahu-desc')).toHaveCount(1);

        for (const id of ['#ahu-louver', '#ahu-oa-damper', '#ahu-ra-damper',
            '#ahu-ea-damper', '#ahu-filter', '#ahu-coil-hw', '#ahu-hw-valve',
            '#ahu-coil-dx', '#ahu-dx-refrig', '#ahu-fan', '#ahu-zone', '#ahu-cabinet']) {
            await expect(svg.locator(id), id).toHaveCount(1);
        }
        // One glyph per sensed point with a physical home; nothing else.
        await expect(svg.locator('.ddcw-sensor')).toHaveCount(5);
        for (const p of ['oat', 'rat', 'mat', 'dat', 'space-temp']) {
            await expect(svg.locator('.ddcw-sensor[data-point="' + p + '"]'), p).toHaveCount(1);
        }
        // The three drill-downs stay real SVG <a> links — focusable and
        // Enter-activable with no JS.
        await expect(svg.locator('a.ahu-link')).toHaveCount(3);
    });

    test('nothing inside the graphic is focusable (#227b)', async ({ page }) => {
        await open(page);
        // role="img" hides the subtree from assistive tech. A focusable
        // child would then be Tab-reachable AND absent from the
        // accessibility tree at the same time — which is the defect the
        // ruling closes, so the glyphs carry no tabindex and no
        // role="button". The <a> drill-downs are the deliberate exception:
        // they are links, and a link inside role="img" is the same idiom
        // the FCU ships.
        await expect(page.locator('#ahu-graphic .ddcw-sensor[tabindex]')).toHaveCount(0);
        await expect(page.locator('#ahu-graphic [role="button"]')).toHaveCount(0);
    });

    test('every dual-surface readout resolves on BOTH surfaces', async ({ page }) => {
        await open(page);
        // setBoth() has no null guard, so a missing id throws inside
        // renderUnit — which the shell calls before syncControls and the
        // statusbar, making the failure mode a silently FROZEN simulator.
        // bindDom() throws a named error at boot for exactly this, and
        // this row is the same claim checked from outside: every SVG well
        // has its point-mirror twin and both are painted.
        const ids = ['oat', 'oa-dmpr', 'rat', 'ra-dmpr', 'ea-dmpr', 'mat',
            'hw-valve', 'dx-stg1', 'dx-stg2', 'fan-speed', 'fan-run',
            'fan-proof', 'dat', 'dt', 'space', 'cool-sp'];
        for (const id of ids) {
            const g = page.locator('#ahu-v-' + id);
            const m = page.locator('#ahu-r-' + id);
            await expect(g, 'graphic well ' + id).toHaveCount(1);
            await expect(m, 'mirror twin ' + id).toHaveCount(1);
            await expect(g, id + ' painted on the graphic').not.toHaveText('');
            await expect(m, id + ' painted on the mirror').not.toHaveText('');
        }
    });

    test('the cooling setpoint reads the same in all three places', async ({ page }) => {
        await open(page);
        // The one permitted duplication on this component — the zone box,
        // the rail and the mirror — because that setpoint is the stage's
        // BREAK point. All three are written in one renderUnit call, and
        // this is what keeps that true. The rail copy is an INPUT now, so
        // its reading is value + suffix span, not textContent.
        const a = await page.locator('#ahu-v-cool-sp').textContent();
        const b = await page.locator('#ahu-p-cool-sp').inputValue()
            + ' ' + await page.locator('#ahu-p-cool-sp-u').textContent();
        const c = await page.locator('#ahu-r-cool-sp').textContent();
        expect(a.trim()).toBe(b.trim());
        expect(a.trim()).toBe(c.trim());
    });

    test('the rail is the adjustable surface: five labelled inputs, calc rows control-free', async ({ page }) => {
        await open(page);
        // This row used to assert ZERO form controls in the rail, with a
        // comment prescribing that an editable parameter would move OUT of
        // the panel. The owner ruled the other way (2026-08-03): the rail
        // itself became the adjustable surface — setpoints adjust from the
        // operator graphic, like a real DDC graphic — so the contract is
        // now five <input type=number>s, each with a real <label for>, and
        // nothing else interactive in the aside.
        const inputs = page.locator('.ahu-params input');
        await expect(inputs).toHaveCount(5);
        for (const id of ['ahu-p-cool-sp', 'ahu-p-heat-sp', 'ahu-p-deadband',
            'ahu-p-econ-lockout', 'ahu-p-min-oa']) {
            await expect(page.locator('#' + id), id).toHaveAttribute('type', 'number');
            await expect(page.locator('label[for="' + id + '"]'), 'label for ' + id)
                .toHaveCount(1);
        }
        await expect(page.locator('.ahu-params select, .ahu-params button'))
            .toHaveCount(0);
        // The calculated rows stay control-free wells: SP DIFF (nothing
        // sets it — it falls out of its two neighbours) and the three
        // UNIT MODE rows. An input on any of them would claim something
        // sets them.
        for (const id of ['ahu-p-sp-diff', 'ahu-d-call', 'ahu-d-econ', 'ahu-d-mech']) {
            const tag = await page.locator('#' + id)
                .evaluate((el) => el.tagName.toLowerCase());
            expect(tag, id + ' stays a well, not a control').toBe('span');
        }
        // And the SP DIFF well keeps .is-calc. The default ink here is the
        // commanded green, so dropping the class is a one-token edit that
        // looks like consistency and destroys the meaning.
        await expect(page.locator('#ahu-p-sp-diff')).toHaveClass(/is-calc/);
        // The rail's clamp announcement line exists and is a polite live
        // region — the announced-rails half of the ruling.
        const hint = page.locator('#ahu-params-hint');
        await expect(hint).toHaveCount(1);
        await expect(hint).toHaveAttribute('role', 'status');
        await expect(hint).toHaveAttribute('aria-live', 'polite');
        // No duplicate ids anywhere on the page — the new input/suffix ids
        // reuse the old well ids, so a half-migrated copy would collide.
        const dups = await page.evaluate(() => {
            const seen = new Set(); const out = [];
            document.querySelectorAll('[id]').forEach((el) => {
                if (seen.has(el.id)) out.push(el.id);
                seen.add(el.id);
            });
            return out;
        });
        expect(dups).toEqual([]);
    });

    test('the verdict announces outside both tab panes', async ({ page }) => {
        await open(page);
        // The pill is inside #tab-unit, which is display:none on the
        // Wiresheet tab, so a live region ON it is out of the
        // accessibility tree exactly where a reader sits studying the
        // program that raised it (codebase-issues #227a).
        const pill = page.locator('#ahu-verdict');
        await expect(pill).toHaveCount(1);
        await expect(pill).not.toHaveAttribute('aria-live', /.*/);
        const sr = page.locator('#ahu-verdict-sr');
        await expect(sr).toHaveAttribute('aria-live', 'polite');
        // Filled by the shell's boot paint, so a reader landing on the
        // page hears the current verdict once.
        await expect(sr).not.toHaveText('');
        // ...and it lives outside both panes.
        expect(await page.locator('#tab-unit #ahu-verdict-sr').count()).toBe(0);
        expect(await page.locator('#tab-wiresheet #ahu-verdict-sr').count()).toBe(0);
    });
});

test.describe('AHU workbench page: the controls', () => {

    test('the outdoor-air slider carries the decided range (#243)', async ({ page }) => {
        await open(page);
        // −20…110 °F, owner decision 2026-07-30. This slider is what OWNS
        // the "how cold can it get" claim: the physics module deliberately
        // declares no range for `oat` and points here, and its fogging and
        // mass-basis figures are scoped to this range. The FCU's own
        // 55…110 stays — that unit has no economizer and no heating coil.
        const oa = page.locator('#ahu-oa-slider');
        await expect(oa).toHaveAttribute('min', '-20');
        await expect(oa).toHaveAttribute('max', '110');
        await expect(oa).toHaveAttribute('step', '1');
    });

    test('every hand control has a NULL box and starts released', async ({ page }) => {
        await open(page);
        // Released = slot 8 empty = the point follows the sequence. A page
        // that shipped one of these unchecked would have a point off
        // program before anyone touched anything.
        for (const id of ['#ahu-null-oad', '#ahu-null-hw', '#ahu-null-stage',
            '#ahu-null-fan', '#ahu-null-fanen']) {
            await expect(page.locator(id), id).toBeChecked();
        }
        // ...and a released control is disabled, because it tracks the
        // resolved value rather than accepting one.
        for (const id of ['#ahu-oad-slider', '#ahu-hw-slider', '#ahu-fan-slider',
            '#ahu-fanen-toggle', '#ahu-stage-1']) {
            await expect(page.locator(id), id).toBeDisabled();
        }
    });

    test('taking a point at slot 8 puts it in the off-program window', async ({ page }) => {
        await open(page);
        await page.locator('#ahu-null-oad').uncheck();
        await expect(page.locator('#ahu-oad-slider')).toBeEnabled();
        // The window is the shell's, rendered from the roster — so this
        // also proves the page's point ids reach it.
        await expect(page.locator('#ddcw-offprog-list li')).toHaveCount(1);
        await expect(page.locator('#ddcw-offprog')).not.toHaveClass(/is-empty/);
        await page.locator('#ahu-null-oad').check();
        await expect(page.locator('#ddcw-offprog-list li')).toHaveCount(0);
    });

    test('opening the damper on a cold day drops the mixed air', async ({ page }) => {
        await open(page);
        // A DIRECTION, not a number: the unit module's very first
        // invariant. Drive the weather cold, take the damper by hand, and
        // MAT has to fall as the damper opens. The weather has to have
        // ARRIVED before the damper moves — mid-ramp the two variables
        // move together and the comparison stops being about the damper.
        await setWeather(page, 0);
        await page.locator('#ahu-null-oad').uncheck();
        const read = async () => {
            const s = await page.locator('#ahu-r-mat').textContent();
            return parseFloat(s);
        };
        await page.locator('#ahu-oad-slider').fill('10');
        await page.locator('#ahu-oad-slider').dispatchEvent('input');
        await settle(page, 400);
        const shut = await read();
        await page.locator('#ahu-oad-slider').fill('90');
        await page.locator('#ahu-oad-slider').dispatchEvent('input');
        await settle(page, 400);
        const open90 = await read();
        expect(open90, 'more outdoor air on a cold day means colder mixed air')
            .toBeLessThan(shut);
    });

    test('a stopped fan freezes the chevrons and blinds the discharge sensor', async ({ page }) => {
        await open(page);
        // The belt scenario: the command stands, the air stops. DAT then
        // reads the ZONE, which is exactly what makes a discharge low
        // limit go BLIND rather than trip (codebase-issues #225).
        await page.locator('[data-preset="belt"]').click();
        await settle(page, 800);
        const dat = parseFloat(await page.locator('#ahu-r-dat').textContent());
        const space = parseFloat(await page.locator('#ahu-r-space').textContent());
        expect(Math.abs(dat - space), 'with no air moving DAT reads the zone')
            .toBeLessThan(0.6);
        // The fan is still COMMANDED — that disagreement is the tell.
        // The row is `fan-run`, not `fan-status`: the roster's fan-status
        // BI is the PROOF and paints the "Fan Sts" chip, so a drawing row
        // showing the command under that word put the same name on two
        // disagreeing things.
        await expect(page.locator('#ahu-v-fan-run')).toHaveText('ON');
        await expect(page.locator('#ahu-v-fan-proof')).toHaveText('NONE');
        await expect(page.locator('#ahu-v-fan-status')).toHaveCount(0);
    });

    test('no airflow proof shuts the damper as well as both coils', async ({ page }) => {
        await open(page);
        // ⚠ HAND EVERY POINT BACK FIRST. A scenario preset writes slot 8 on
        // all six outputs, so a reading taken straight after one reports the
        // PRESET and not the sequence — which is what hid this: the damper
        // select was wired to `occ` while the page's own comments said proof,
        // and every surface that would have shown it was under manual control.
        await page.locator('[data-preset="belt"]').click();
        for (const id of ['#ahu-null-oad', '#ahu-null-hw', '#ahu-null-stage',
            '#ahu-null-fan', '#ahu-null-fanen']) {
            await page.locator(id).check();
        }
        await settle(page, 3000);
        await expect(page.locator('#ahu-v-fan-proof')).toHaveText('NONE');
        // All three interlocked outputs, together — the coils already were,
        // the damper is what changed.
        await expect(page.locator('#ahu-v-oa-dmpr'),
            'a damper open with no air moving is ventilation on paper only')
            .toHaveText('0 %');
        await expect(page.locator('#ahu-v-dx-stg1')).toHaveText('OFF');
        await expect(page.locator('#ahu-v-hw-valve')).toHaveText('0 %');
    });

    test('an unoccupied unit shuts the damper through the proof, with no second gate', async ({ page }) => {
        await open(page);
        // The damper select gates on PROOF ALONE, and this is the row that
        // says why that is enough: `occ` drives `fan-enable`, so unoccupied →
        // fan off → proof drops → damper shut. Gating on proof is transitively
        // stronger than gating on occupancy, which is what let the fix be one
        // rewire rather than a new AND block on a sheet whose layout is
        // hand-tuned for the no-burial invariant. If this row ever goes red
        // the transitive argument has failed and the gate has to become
        // explicit.
        await expect(page.locator('#ahu-v-oa-dmpr')).toHaveText('20 %');
        await page.locator('.tabs.tabs-flush [data-tab="wiresheet"]').click();
        const occ = page.locator('#ddcw-fbe-inner .fbe-block[data-id="occ"]');
        await expect(occ).toHaveCount(1);
        await occ.locator('.fbe-toggle').click();
        await page.locator('.tabs.tabs-flush [data-tab="unit"]').click();
        await settle(page, 4000);
        await expect(page.locator('#ahu-v-fan-run')).toHaveText('OFF');
        await expect(page.locator('#ahu-v-fan-proof')).toHaveText('NONE');
        await expect(page.locator('#ahu-v-oa-dmpr')).toHaveText('0 %');
    });
});

test.describe('AHU workbench page: the chevrons', () => {

    test('every rail is populated and the stream moves', async ({ page }) => {
        await open(page);
        // Six rails — the mockup's five plus the return split at the
        // relief tee, which is what lets the drop stand still while the
        // relief branch runs.
        await expect(page.locator('#ahu-graphic .ahu-centerline')).toHaveCount(6);
        const marks = page.locator('#ahu-flow .ahu-chevron');
        const n = await marks.count();
        expect(n, 'the reserved chevron layer is populated').toBeGreaterThan(10);

        // LIVENESS, not just population: a suspended loop places its
        // chevrons correctly and would pass a count. Sample one transform
        // twice and require it to have MOVED — the lesson from the
        // `contain: strict` regression, where a silently-suspended loop
        // read as a 140× win.
        const before = await marks.first().getAttribute('transform');
        await settle(page, 500);
        const after = await marks.first().getAttribute('transform');
        expect(before, 'a chevron is placed on its rail before the first frame').toBeTruthy();
        expect(after, 'the stream is actually marching').not.toBe(before);
    });

    test('the stream stops when the air does', async ({ page }) => {
        await open(page);
        await page.locator('[data-preset="belt"]').click();
        await settle(page, 500);
        const marks = page.locator('#ahu-flow .ahu-chevron');
        const before = await marks.first().getAttribute('transform');
        await settle(page, 500);
        expect(await marks.first().getAttribute('transform'),
            'no airflow, no marching air').toBe(before);
    });
});

test.describe('AHU workbench page: the dampers show their position', () => {

    // Angle of a blade line from HORIZONTAL, in degrees. One blade per set is
    // enough — the animator writes all three from one (dx, dy) pair.
    const angleOf = (page, id) => page.evaluate((elId) => {
        const el = document.getElementById(elId);
        const n = (a) => parseFloat(el.getAttribute(a));
        return Math.atan2(Math.abs(n('y2') - n('y1')), Math.abs(n('x2') - n('x1')))
            * 180 / Math.PI;
    }, id);

    const setDamper = async (page, pct) => {
        await page.locator('#ahu-oad-slider').fill(String(pct));
        await page.locator('#ahu-oad-slider').dispatchEvent('input');
        await settle(page, 250);
    };

    // The blade coordinates go through toFixed(2), which at these half-extents
    // is worth up to about 0.05°. 0.1 is that with room; the defect this row
    // exists for was worth 35°, so nothing useful hides under the tolerance.
    const QUANT = 0.1;

    test('the return and relief blades draw the angle they are commanded', async ({ page }) => {
        await open(page);
        await page.locator('#ahu-null-oad').uncheck();
        for (const pct of [0, 20, 50, 80, 100]) {
            await setDamper(page, pct);
            // Both sets are openIs 'v' — open is VERTICAL — so a blade at
            // fraction f open stands f × 90° off horizontal. The return damper
            // rides 1 − the outside-air command (common linkage); relief rides
            // it directly.
            const ra = await angleOf(page, 'ahu-ra-blade-2');
            const ea = await angleOf(page, 'ahu-ea-blade-2');
            expect(Math.abs(ra - (100 - pct) / 100 * 90),
                'return blade at a commanded ' + (100 - pct) + ' % open, drawn ' + ra.toFixed(2) + '°')
                .toBeLessThan(QUANT);
            expect(Math.abs(ea - pct / 100 * 90),
                'relief blade at a commanded ' + pct + ' % open, drawn ' + ea.toFixed(2) + '°')
                .toBeLessThan(QUANT);
        }
    });

    test('the intake damper keeps its deliberate skew, and it is bounded', async ({ page }) => {
        await open(page);
        await page.locator('#ahu-null-oad').uncheck();
        // ⚠ THIS ROW ASSERTS A DEVIATION ON PURPOSE. setBlades() scales x and y
        // by different half-extents, which draws atan(tan θ · hy/hx) rather
        // than θ. The two vertical-flow sets were equalized because the error
        // was ruinous there; the oa set keeps 9 × 11.5 by owner decision
        // (2026-07-31), because hy is half the blade PITCH and dropping it
        // would stop the shut stack sealing the intake opening edge to edge.
        // Pinned so the exemption cannot decay into an unnoticed regression in
        // either direction — a silent "fix" fails here, and so does a retune
        // that makes the skew worse.
        await setDamper(page, 50);
        const oa = await angleOf(page, 'ahu-oa-blade-2');
        expect(oa, 'a commanded 50 % draws 52°, not 45°').toBeCloseTo(51.96, 1);
        // The ends stay exact whatever the half-extents are, which is what
        // keeps the skew a lean rather than a wrong endpoint.
        await setDamper(page, 0);
        expect(await angleOf(page, 'ahu-oa-blade-2'), 'shut is edge to edge').toBeCloseTo(90, 1);
        await setDamper(page, 100);
        expect(await angleOf(page, 'ahu-oa-blade-2'), 'wide is down the airstream').toBeCloseTo(0, 1);
    });

    test('a shut damper seals its opening edge to edge, with no gap and no overhang', async ({ page }) => {
        await open(page);
        await page.locator('#ahu-null-oad').uncheck();
        // "Air bypasses the damper" is the one thing a damper must never look
        // like. Both vertical-flow sets tile their frame width with three
        // side-by-side chords, so shut is one continuous line across the
        // opening — read the geometry rather than trusting the constants.
        const span = (page, prefix) => page.evaluate((p) => {
            const ls = Array.from(document.querySelectorAll('[id^="' + p + '-blade"]'));
            const n = (el, a) => parseFloat(el.getAttribute(a));
            const xs = ls.map((el) => [n(el, 'x1'), n(el, 'x2')].sort((a, b) => a - b));
            xs.sort((a, b) => a[0] - b[0]);
            const frame = document.querySelector('#' + p + '-damper .ahu-damper-frame');
            return {
                lo: xs[0][0], hi: xs[xs.length - 1][1],
                gaps: xs.slice(1).map((seg, i) => seg[0] - xs[i][1]),
                fx: parseFloat(frame.getAttribute('x')),
                fw: parseFloat(frame.getAttribute('width')),
            };
        }, prefix);

        for (const [pct, prefix, who] of [[100, 'ahu-ra', 'return'], [0, 'ahu-ea', 'relief']]) {
            await setDamper(page, pct);
            const s = await span(page, prefix);
            expect(s.lo, who + ' blades start at the frame').toBeCloseTo(s.fx, 1);
            expect(s.hi, who + ' blades end at the frame').toBeCloseTo(s.fx + s.fw, 1);
            for (const g of s.gaps) {
                expect(Math.abs(g), who + ' blades meet with no gap').toBeLessThan(0.02);
            }
        }
    });

    test('the return damper sits in the drop, above the casing roof', async ({ page }) => {
        await open(page);
        // The drop's parallel throat runs y141 down to the casing roof at
        // y250, and this damper belongs IN it — drawn below the roof it is
        // inside the unit, where a return damper is not. The rc chevron rail
        // (x200, y118 → 250) then passes through the frame, which is the
        // recirculated air going through the damper rather than around it.
        const f = await page.locator('#ahu-ra-damper .ahu-damper-frame');
        const y = parseFloat(await f.getAttribute('y'));
        const h = parseFloat(await f.getAttribute('height'));
        expect(y, 'the frame starts below the duct top wall').toBeGreaterThan(141);
        expect(y + h, 'the frame ends above the casing roof').toBeLessThan(250);
    });

    test('every leader ends exactly where its anchor dot sits', async ({ page }) => {
        await open(page);
        // ⚠ THE PATH AND THE DOT ARE SEPARATE ELEMENTS, so moving a component
        // moves the leader and leaves the dot behind — silently, and only on
        // the drawing. Found by eye when the return damper moved up into the
        // drop; asserted here so the next move is caught by CI instead.
        // getPointAtLength on the total length reads the endpoint whatever the
        // command letters are, which beats parsing `d`.
        const bad = await page.evaluate(() => {
            const out = [];
            document.querySelectorAll('#ahu-callouts .ahu-callout').forEach((g) => {
                const p = g.querySelector('.ahu-leader');
                const c = g.querySelector('.ahu-anchor');
                if (!p || !c) { out.push(g.id + ': missing leader or anchor'); return; }
                const end = p.getPointAtLength(p.getTotalLength());
                const dx = end.x - parseFloat(c.getAttribute('cx'));
                const dy = end.y - parseFloat(c.getAttribute('cy'));
                if (Math.hypot(dx, dy) > 0.5) {
                    out.push(g.id + ': leader ends (' + end.x.toFixed(1) + ',' + end.y.toFixed(1)
                        + ') but the dot sits (' + c.getAttribute('cx') + ',' + c.getAttribute('cy') + ')');
                }
            });
            return out;
        });
        expect(bad).toEqual([]);
        // ...and the sweep is not vacuous: the zone is the one no-leader
        // exemption, so every OTHER annotation carries exactly one pair.
        await expect(page.locator('#ahu-callouts .ahu-leader')).toHaveCount(9);
        await expect(page.locator('#ahu-callouts .ahu-anchor')).toHaveCount(9);
    });
});

test.describe('AHU workbench page: the sensor overrides (all five)', () => {

    // The plant's override map is keyed by SENSOR POINT ID and already
    // supported all five; the page is what makes them reachable. Each
    // teaches a different fault — the select's option text names it — so
    // the row below walks all five rather than spot-checking one.
    for (const point of ['space-temp', 'oat', 'rat', 'mat', 'dat']) {
        test('forcing ' + point + ' splits sensed from truth', async ({ page }) => {
            await open(page);
            await page.locator('#ahu-ovr-select').selectOption(point);
            await page.locator('#ahu-ovr-toggle').click();
            await expect(page.locator('#ahu-ovr-input')).toBeEnabled();

            // A number the machine cannot be sitting at, so "the chip
            // followed the force" cannot be a coincidence.
            await page.locator('#ahu-ovr-input').fill('123.4');
            await page.locator('#ahu-ovr-input').dispatchEvent('input');
            await settle(page, 300);

            // The forced device is MARKED on the drawing — a forced input
            // that leaves no mark is how a wrong number survives a shift
            // change. Accent ring, never amber: inside this SVG amber
            // means damper, permanently.
            await expect(page.locator('#ahu-sensor-' + point)).toHaveClass(/is-forced/);
            await expect(page.locator('#ahu-ovr-state')).toContainText('Forced');
            await expect(page.locator('#ahu-override')).toHaveClass(/is-forcing/);

            // Releasing rejoins sensed and truth on the next tick.
            await page.locator('#ahu-ovr-toggle').click();
            await settle(page, 300);
            await expect(page.locator('#ahu-sensor-' + point)).not.toHaveClass(/is-forced/);
            await expect(page.locator('#ahu-ovr-state')).toHaveText('');
        });
    }

    test('a forced space temp lies to the program while the zone keeps integrating', async ({ page }) => {
        await open(page);
        await page.locator('#ahu-ovr-select').selectOption('space-temp');
        await page.locator('#ahu-ovr-toggle').click();
        await page.locator('#ahu-ovr-input').fill('95.0');
        await page.locator('#ahu-ovr-input').dispatchEvent('input');
        await settle(page, 300);
        // The graphic shows what the PROGRAM reads — that is the whole
        // lesson, and it is why the wells read `sensors` and the verdict
        // ladder reads `derived`.
        expect(parseFloat(await page.locator('#ahu-r-space').textContent())).toBeCloseTo(95, 0);
        // The truth appears in exactly one place: the zone readout beside
        // the override control.
        const zone = await page.locator('#ahu-zone-val').textContent();
        expect(parseFloat(zone.replace(/[^0-9.\-]/g, '')),
            'the real zone is not the forced number').toBeLessThan(90);
    });

    test('the proof switch is not offered as overridable', async ({ page }) => {
        await open(page);
        // fan-status is not a measurement of a continuous value, so there
        // is nothing to override — it reports its own state. The physics
        // half deliberately routes it around sensedValue(), and the select
        // must not claim otherwise.
        const vals = await page.locator('#ahu-ovr-select option')
            .evaluateAll((os) => os.map((o) => o.value));
        expect(vals).toEqual(['space-temp', 'oat', 'rat', 'mat', 'dat']);
    });
});

test.describe('AHU workbench page: the activation affordance (#227b)', () => {

    test('the five sensed points are buttons in the mirror, and nothing else is', async ({ page }) => {
        await open(page);
        const btns = page.locator('.ahu-point-btn');
        await expect(btns).toHaveCount(5);
        const pts = await btns.evaluateAll((els) => els.map((e) => e.dataset.point));
        expect(pts).toEqual(['oat', 'rat', 'mat', 'dat', 'space-temp']);
        // Every one names a real roster point, or highlightChip no-ops
        // SILENTLY and the button does nothing at all.
        const chipCaps = await page.locator('#ddcw-io .ddcw-chip').count();
        expect(chipCaps).toBe(17);
    });

    test('the latch is exposed programmatically, not by border colour alone', async ({ page }) => {
        await open(page);
        // aria-pressed is the whole point: `.is-active` paints a border in
        // the accent hue and nothing else, so without this the state a
        // screen-reader user needs is the one the affordance built for
        // #227b did not expose (WCAG 4.1.2, and 1.4.1 for the hue).
        const read = () => page.locator('.ahu-point-btn').evaluateAll(
            (els) => els.map((e) => e.dataset.point + ':' + e.getAttribute('aria-pressed')));
        expect(await read()).toEqual(
            ['oat:false', 'rat:false', 'mat:false', 'dat:false', 'space-temp:false']);
        await page.locator('.ahu-point-btn[data-point="rat"]').click();
        expect(await read()).toEqual(
            ['oat:false', 'rat:true', 'mat:false', 'dat:false', 'space-temp:false']);
        await page.locator('.ahu-point-btn[data-point="dat"]').click();
        expect(await read()).toEqual(
            ['oat:false', 'rat:false', 'mat:false', 'dat:true', 'space-temp:false']);
    });

    test('pressing one latches its annotation and pulses its chip', async ({ page }) => {
        await open(page);
        await page.locator('.ahu-point-btn[data-point="mat"]').click();
        // The annotation seam is the data-callout-for ATTRIBUTE, not an
        // id: oat's callout is #ahu-callout-outside-air and space-temp's
        // annotation is the zone box, so id matching would resolve three
        // of five.
        await expect(page.locator('[data-callout-for="mat"]')).toHaveClass(/is-hilite/);
        await expect(page.locator('#ddcw-io .ddcw-chip-hilite')).toHaveCount(1);
        // One at a time — a second press steals the mark.
        await page.locator('.ahu-point-btn[data-point="dat"]').click();
        await expect(page.locator('[data-callout-for="mat"]')).not.toHaveClass(/is-hilite/);
        await expect(page.locator('[data-callout-for="dat"]')).toHaveClass(/is-hilite/);
    });

    test('the space-temp button reaches the ZONE group, not a callout', async ({ page }) => {
        await open(page);
        // The no-leader containment case: the zone box IS the frame, so it
        // carries data-callout-for itself. This is the pairing that made
        // all five glyphs resolve rather than three.
        await page.locator('.ahu-point-btn[data-point="space-temp"]').click();
        await expect(page.locator('#ahu-zone')).toHaveClass(/is-hilite/);
    });
});

test.describe('AHU workbench page: the mirror diet', () => {

    // Owner ruling 2026-08-03. On a desktop this list repainted the whole
    // drawing a second time and the duplication cost more screen than it
    // bought, so above the cutoff the eleven PLAIN cells stop taking space.
    // The five BUTTONS stay at every width — they are the #227(b)
    // affordance, and nothing inside the SVG is focusable, so hiding one
    // would delete the only keyboard path to its chip pulse.
    //
    // Three separate failure modes, one row each: WHICH cells leave the
    // flow, that a cell which leaves is still ANNOUNCED, and the CUTOFF
    // together with the measurement that justifies the number.

    // px — see THE MIRROR DIET in the page's head block for the derivation.
    const CUTOFF = 900;
    // px — .ahu-graphic's designed max-width, the scale every legibility
    // and callout-width figure on this page was hand-measured at.
    const CAP = 780;

    // A LAYOUT box, not visibility: the hidden cells are .sr-only-shaped, so
    // they are still rendered and checkVisibility() stays true. What changes
    // above the cutoff is that they stop occupying the grid.
    const cellBoxes = (page) => page.locator('.ahu-point').evaluateAll(
        (els) => els.map((e) => {
            const r = e.getBoundingClientRect();
            return {
                point: e.dataset.point || null,
                btn: e.classList.contains('ahu-point-btn'),
                boxed: r.width > 2 && r.height > 2,
            };
        }));

    test('at a desktop width only the five sensed-point buttons take space', async ({ page }) => {
        await open(page);               // the config's default viewport is 1280 wide
        const cells = await cellBoxes(page);
        expect(cells.length, 'the whole roster is still in the DOM').toBe(16);
        expect(cells.filter((c) => c.boxed).map((c) => c.point),
            'the desktop row is exactly the buttons, in air-path order')
            .toEqual(['oat', 'rat', 'mat', 'dat', 'space-temp']);
        expect(cells.filter((c) => c.btn && !c.boxed),
            'a button never leaves the flow — it is the keyboard path').toEqual([]);
    });

    test('a cell that leaves the flow is still announced, never display:none', async ({ page }) => {
        // THE REASON THIS ROW EXISTS, and it is the one that must not be
        // "simplified". The drawing is role="img", so its subtree is pruned
        // from the accessibility tree and this list is the ONLY text
        // rendering of those values. `display: none` would therefore delete
        // eleven live values from a desktop screen-reader user, and three of
        // them have no statusbar chip to fall back on either (asserted
        // below) — ΔT among them, on the page whose whole diagnostic is
        // "no ΔT over the coil".
        await open(page);
        const quiet = await page.locator('.ahu-point:not(.ahu-point-btn)').evaluateAll(
            (els) => els.map((e) => {
                const cs = getComputedStyle(e);
                const val = e.querySelector('.ahu-point-val');
                return {
                    id: val ? val.id : '(no value node)',
                    display: cs.display,
                    visibility: cs.visibility,
                    ariaHidden: e.getAttribute('aria-hidden'),
                    text: (e.textContent || '').trim(),
                };
            }));
        expect(quiet.length, 'eleven plain cells').toBe(11);
        for (const q of quiet) {
            expect(q.display, q.id + ' must not be display:none').not.toBe('none');
            expect(q.visibility, q.id + ' must not be visibility:hidden').not.toBe('hidden');
            expect(q.ariaHidden, q.id + ' must not be aria-hidden').toBeNull();
            expect(q.text, q.id + ' is still painted by renderUnit').not.toBe('');
        }

        // The no-fallback claim, off the live roster rather than asserted in
        // prose: three dampers ride ONE commanded output, so the RA and
        // relief cells have no chip of their own, and ΔT is arithmetic and
        // not a point at all. Without this the paragraph above is a comment
        // nothing checks.
        const roster = await page.evaluate(() => window.DDCWAhuUnit.points.map((p) => p.id));
        expect(roster.filter((id) => /damper/.test(id)),
            'one damper output for three sets of blades').toEqual(['oa-damper']);
        expect(roster.filter((id) => /(^|-)dt$|delta/.test(id)),
            'ΔT is arithmetic, so no chip carries it').toEqual([]);
    });

    test('the cutoff is ' + CUTOFF + 'px, and at ' + CUTOFF + ' the drawing is still at its designed width', async ({ page }) => {
        // This row pins the RATIONALE, not only the constant — which
        // matters because the margin is 4px. The cutoff was chosen as the
        // measured 896 (the narrowest viewport at which this drawing still
        // renders its full 780) rounded up to the next round number. So a
        // padding or max-width retune that pushes that 896 line past the
        // cutoff reddens HERE, instead of quietly shipping a squeezed
        // drawing with no mirror under it.
        await page.setViewportSize({ width: CUTOFF, height: 900 });
        await open(page);
        const wide = await cellBoxes(page);
        expect(wide.filter((c) => c.boxed).length,
            'at the cutoff the diet is already on').toBe(5);

        // The cap is read off the LIVE stylesheet, not only compared to the
        // literal: hard-coding `width >= 780` let a tamper that WIDENED
        // .ahu-graphic's max-width to 900 pass, because 784px at a 900px
        // viewport still clears 780 while being well under the new cap —
        // exactly the silent squeeze this row exists to prevent. So both
        // halves are asserted: the cap is still the documented one the 896
        // measurement was derived from, AND the drawing actually reaches it
        // at the cutoff.
        const gfx = await page.locator('.ahu-graphic').evaluate((el) => ({
            width: el.getBoundingClientRect().width,
            cap: parseFloat(getComputedStyle(el).maxWidth),
        }));
        expect(gfx.cap, 'a cap change invalidates the 896 derivation — re-measure it')
            .toBe(CAP);
        expect(gfx.width, 'at the cutoff the drawing still renders its full cap')
            .toBeGreaterThanOrEqual(gfx.cap - 0.5);

        // One pixel narrower: every cell is back in the grid. The reclaimed
        // height IS the deliverable, so measure it rather than trusting that
        // fewer boxed cells implies a shorter grid.
        const mirrorHeight = () => page.evaluate(
            () => document.querySelector('.ahu-points').getBoundingClientRect().height);
        const dieted = await mirrorHeight();
        await page.setViewportSize({ width: CUTOFF - 1, height: 900 });
        const narrow = await cellBoxes(page);
        expect(narrow.filter((c) => c.boxed).length,
            'one pixel under the cutoff the whole list is back').toBe(16);
        // Measured 2026-08-03: 49.2px for the desktop row vs 223.5px for all
        // sixteen at 899 wide. The floor is deliberately loose — the claim is
        // that the diet reclaims real height, not that it reclaims 174px.
        expect(await mirrorHeight(), 'the full list is materially taller than the desktop row')
            .toBeGreaterThan(dieted + 50);
    });
});

test.describe('AHU workbench page: the fogging disclosure (#240)', () => {

    // ⚠ THE RECIPE MOVED WHEN THE HARDWIRED LOW-LIMIT STAT LANDED
    // (2026-08-08), and the move is worth reading before touching it.
    // Fogging needs the mixing box to cross saturation, which needs
    // MIXED AIR IN THE THIRTIES OR COLDER — and a machine with a 38 °F
    // discharge low-limit stat cannot hold air that cold across a dry
    // coil, because DAT is then MAT plus a degree of fan heat. The old
    // recipe here (outdoor −10, damper 60, no heat) trips the stat on
    // the first tick and the fan stops, which collapses the mixed state
    // back to return air and un-fogs it.
    //
    // What restores it is the HOT-WATER COIL, and that is the honest
    // fix rather than a dodge: the fog is a MIXING-BOX phenomenon, the
    // stat watches the DISCHARGE, and on a −15 °F morning a machine
    // with a hot-water coil would have that valve open anyway. Holding
    // it at 80 % puts the discharge in the sixties with the mixed air
    // still in the twenties — fogging, and 20-odd degrees clear of the
    // stat. The compressor is held off for the same reason: a lit stage
    // subtracts about 10 °F from the discharge and walks it back into
    // the trip.
    //
    // ORDER IS LOAD-BEARING BELOW. Set the heat and the stage FIRST and
    // drop the weather LAST — opening the damper on cold air with the
    // arrival stage still lit trips the stat before the valve is there
    // to catch it.
    //
    // ⚠ AND THE OWNER'S RECORDED RECIPE STILL WORKS — AN EARLIER DRAFT
    // OF THIS NOTE SAID OTHERWISE (corrected 2026-08-09, verified
    // engine-direct on this branch, twice). The recorded reproduction
    // (docs/air-side-sim.md, Lane C ruling 5, 2026-08-02: "outdoor air
    // −15 °F, manual damper 60 %" against the settled winter zone) is a
    // state where the program already holds the hot-water valve at
    // 100 % — settled at −15 °F, it could hardly be elsewhere — so the
    // mixed air sits near 17–19 °F while the discharge rides in the
    // nineties, 55 °F clear of the stat: fog asserts, nothing trips,
    // nothing was lost. What the stat actually retired is THIS SPEC'S
    // old arrival-plant recipe (zone 76 °F, valve 0 %): cold air across
    // a dry coil trips it on the first tick, which is the story the
    // paragraph above tells. The recipe below restores the same
    // mixing-box state the honest way — the valve open, exactly as the
    // settled machine holds it for itself.
    const fogRecipe = async (page) => {
        // Hold the compressor off — a lit stage walks the discharge into
        // the stat.
        await page.locator('#ahu-null-stage').uncheck();
        await page.locator('#ahu-stage-0').click();
        // Hot water open: the discharge rides well clear of the stat
        // while the mixing box stays cold enough to fog.
        await page.locator('#ahu-null-hw').uncheck();
        await page.locator('#ahu-hw-slider').fill('80');
        await page.locator('#ahu-hw-slider').dispatchEvent('input');
        await page.locator('#ahu-null-oad').uncheck();
        await page.locator('#ahu-oad-slider').fill('50');
        await page.locator('#ahu-oad-slider').dispatchEvent('input');
        // Weather last — and the weather now TAKES TIME. The knob writes
        // a target and the outdoor air walks there at OA_RAMP_RATE, so
        // this recipe has 95 °F of travel to do (80 → −15): 190
        // sim-seconds, ~9.5 wall-seconds at the default 20× clock.
        // `setWeather` waits for arrival rather than sleeping a number,
        // which is what keeps the recipe honest on a loaded box — see its
        // header. Measured engine-direct: the mixing box crosses
        // saturation at ~7.9 wall-seconds, with the discharge bottoming
        // 8.6 °F clear of the stat the whole way down, so nothing trips
        // during the ramp.
        await setWeather(page, -15);
        await settle(page, 600);
    };

    test('the marker is absent on an ordinary day and appears in the fog branch', async ({ page }) => {
        await open(page);
        // Absent by default — an unforced, unfogged drawing carries no
        // extra ink.
        await expect(page.locator('#ahu-fog-mark')).not.toHaveClass(/is-fogging/);
        await expect(page.locator('#ahu-mat-fog-note')).toBeHidden();

        // Now the cold-and-open corner the −20…110 slider reaches: mixing
        // 50 %-RH return air into cold dry outdoor air crosses saturation,
        // the mixture re-solves ON the curve, and the published MAT is
        // WARMER than the plain %OA blend a reader would compute off the
        // screen. A silent bare number there looks like this site's own
        // %OA arithmetic and is not it.
        await fogRecipe(page);
        // The machine is still running — the disclosure is about a state
        // this unit can actually hold, not a frame before a safety fires.
        await expect(page.locator('#ahu-lls-state')).toHaveText('NORMAL');

        await expect(page.locator('#ahu-fog-mark')).toHaveClass(/is-fogging/);
        // The accessible half — a real sentence, in the one place there is
        // room for one. It sits OUTSIDE the MAT mirror button: inside, it
        // rewrote that button's accessible name to the whole sentence.
        await expect(page.locator('#ahu-mat-fog-note')).toBeVisible();
        expect(await page.locator('.ahu-point-btn[data-point="mat"] #ahu-mat-fog-note')
            .count(), 'the note is not inside the MAT button').toBe(0);
    });

    test('the disclosure is suppressed while the MAT sensor is forced', async ({ page }) => {
        await open(page);
        await fogRecipe(page);
        await expect(page.locator('#ahu-fog-mark')).toHaveClass(/is-fogging/);

        // The marker annotates the MAT WELL, and that well paints the
        // SENSED value. Forcing MAT replaces the number the marker is
        // about, so the marker has to go with it — otherwise a saturation
        // flag hangs off a hand-typed 90 °F.
        await page.locator('#ahu-ovr-select').selectOption('mat');
        await page.locator('#ahu-ovr-toggle').click();
        await page.locator('#ahu-ovr-input').fill('90');
        await settle(page, 700);
        await expect(page.locator('#ahu-v-mat')).toHaveText('90.0 °F');
        await expect(page.locator('#ahu-fog-mark')).not.toHaveClass(/is-fogging/);
        await expect(page.locator('#ahu-mat-fog-note')).toBeHidden();

        // Released, the disclosure comes back — the suppression is a
        // display gate, not a latch.
        await page.locator('#ahu-ovr-toggle').click();
        await settle(page, 700);
        await expect(page.locator('#ahu-fog-mark')).toHaveClass(/is-fogging/);
    });
});

test.describe('AHU workbench page: the verdict ladder\'s coil bounds', () => {

    // ⚠ THIS ROW WAS FIXME'D FOR A DAY, AND THE RESOLUTION IS THE POINT.
    // It went unreachable on 2026-08-08, when the hardwired 38 °F
    // discharge low-limit stat landed in the plant. The collision was
    // STRUCTURAL rather than a matter of coordinates:
    //
    //   the branch needs `stage > 0 && matT < FREEZE_WATCH (38)` with
    //   air moving. With a stage lit and no heat, the DX coil's own
    //   ceiling holds the leaving air at or below the entering air, so
    //   DAT <= matT + FAN_HEAT < 39 — and every value in [35, 39) that
    //   the coil's floor allows trips a stat set at 38. Adding heat does
    //   not open a window either: `stage > 0 && hwFrac > 0` is the
    //   "fighting itself" branch and sits ABOVE this one in the ladder.
    //
    // So a PROTECTED machine cannot hold the state, and the row was left
    // fixme'd with two ways out, both the owner's call: accept it, or
    // give the device face a defeat.
    //
    // OWNER RULING 2026-08-09: build the defeat. A jumper across the
    // stat's terminals is what the trade actually does, and it makes the
    // branch sittable for the same reason it is worth teaching — the
    // machine runs straight through the freeze. Read the row that way:
    // it is not a verdict test that happens to need a jumper, it is the
    // demonstration that the ONLY way to sit in this state is with the
    // safety wired around. A protected machine still cannot hold it, and
    // that remains correct.
    //
    // HAND-HELD RATHER THAN PROGRAM-DRIVEN, and the difference is
    // measured, not cautious. The program-driven route reaches the state
    // too — jumper in, one drag of the outdoor-air slider to −20 on the
    // default sheet, arrival stage lit: the branch paints for ~2.3 wall
    // seconds and overlaps a TRIPPED element for ~1.5 of them, then the
    // zone falls past the cooling cut-out, the stage breaks and the
    // machine flips to heating. That is a window, not a state, and this
    // row asserts two facts TOGETHER. Slot 8 on stage, damper, fan and
    // the heating valve makes it sit indefinitely (measured: still
    // painting after 28 wall-seconds), which is also what the screenshot
    // set needs. The heating valve is the non-obvious one: leave it on
    // the program and the crashing zone opens it, and the
    // "fighting itself" branch above outranks this one.
    test('freezing mixed air under a running stage is named, not read as a dead coil',
        async ({ page }) => {
            await open(page);
            await page.click('#ahu-lls-jumper');
            for (const id of ['ahu-null-stage', 'ahu-null-oad', 'ahu-null-hw', 'ahu-null-fan']) {
                await page.locator('#' + id).uncheck();
            }
            await page.click('[data-stage="2"]');
            for (const [id, val] of [['ahu-oad-slider', '100'], ['ahu-hw-slider', '0'],
                ['ahu-fan-slider', '100']]) {
                await page.locator('#' + id).fill(val);
                await page.locator('#' + id).dispatchEvent('input');
            }
            await setWeather(page, -20);
            await settle(page, 1500);

            const v = page.locator('#ahu-verdict');
            await expect(v).toHaveClass(/error/);
            await expect(v).toContainText('already near freezing');

            // ⚠ READ IN ONE SNAPSHOT, not as two polled assertions. The
            // claim is that a machine SITTING in this verdict is a
            // machine whose stat has tripped — two facts at one instant,
            // and two separate `expect`s would let them be true a second
            // apart. This is what makes the row say "only a jumpered
            // machine can hold this" rather than "these both happened".
            const both = await page.evaluate(() => ({
                verdict: document.getElementById('ahu-verdict').textContent.trim(),
                stat: document.getElementById('ahu-lls-state').textContent.trim(),
                jumper: document.getElementById('ahu-lls-jumper-state').textContent.trim(),
            }));
            expect(both.verdict).toContain('already near freezing');
            expect(both.stat, 'a protected machine cannot hold this state').toBe('TRIPPED');
            expect(both.jumper, 'and this one is only holding it on a wire')
                .toBe('JUMPERED');
        });

    test('the hot-water coil at its leaving-air ceiling warns instead of reporting clean', async ({ page }) => {
        await open(page);
        await page.locator('#ahu-null-hw').uncheck();
        await page.locator('#ahu-null-fan').uncheck();
        await page.locator('#ahu-null-stage').uncheck();
        await page.locator('[data-stage="0"]').click();
        for (const [id, val] of [['ahu-hw-slider', '100'], ['ahu-fan-slider', '25']]) {
            await page.locator('#' + id).fill(val);
            await page.locator('#' + id).dispatchEvent('input');
        }
        // The weather is its own step now: it ramps, so it has to be
        // waited for rather than filled alongside the two actuators.
        await setWeather(page, 20);
        await settle(page, 2500);
        const v = page.locator('#ahu-verdict');
        await expect(v).toHaveClass(/warn/);
        await expect(v).toContainText('leaving-air limit');

        // And it is inert where the clamp is inert: a full fan at a part-
        // open valve is ordinary heating and still reports clean.
        for (const [id, val] of [['ahu-fan-slider', '100'], ['ahu-hw-slider', '60']]) {
            await page.locator('#' + id).fill(val);
            await page.locator('#' + id).dispatchEvent('input');
        }
        await settle(page, 2500);
        await expect(v).toHaveClass(/ok/);
        await expect(v).toContainText('clear ΔT');
    });
});

test.describe('AHU workbench page: the tabs and the wiresheet', () => {

    test('switching to the wiresheet mounts the editor', async ({ page }) => {
        const errs = await open(page);
        await page.locator('.tabs.tabs-flush [data-tab="wiresheet"]').click();
        await expect(page.locator('#tab-wiresheet')).toHaveClass(/active/);
        // Lazy mount on first open — the canvas fills with the shipped
        // sheet's blocks.
        await expect(page.locator('#ddcw-fbe-inner .fbe-block').first()).toBeVisible();
        expect(errs, 'the editor mounted without complaining').toEqual([]);
    });

    test('the unit keeps running while the wiresheet is up', async ({ page }) => {
        await open(page);
        const before = await page.locator('#ddcw-io .ddcw-chip-val').first().textContent();
        await page.locator('.tabs.tabs-flush [data-tab="wiresheet"]').click();
        await settle(page, 1200);
        // The statusbar sits OUTSIDE both panes precisely so it keeps
        // reporting; the host tick does not care which tab is up.
        const after = await page.locator('#ddcw-io .ddcw-chip-val').first().textContent();
        expect(before).toBeTruthy();
        expect(after).toBeTruthy();
    });
});

test.describe('AHU workbench page: naming and the live regions', () => {

    test('every control the page ships carries an accessible name', async ({ page }) => {
        await open(page);
        // The forced-value input is the one that had none: the visible
        // caption is spent on the select beside it and the °F suffix is
        // aria-hidden, so without an explicit name a screen reader hears
        // a bare spinbutton (WCAG 3.3.2 / 4.1.2).
        const unnamed = await page.evaluate(() => {
            const named = (el) => {
                if (el.getAttribute('aria-label')) return true;
                const lb = el.getAttribute('aria-labelledby');
                if (lb && lb.split(/\s+/).every((id) => document.getElementById(id))) return true;
                if (el.id && document.querySelector('label[for="' + el.id + '"]')) return true;
                if (el.closest('label')) return true;
                return !!(el.textContent || '').trim();
            };
            return Array.from(
                document.querySelectorAll('#tab-unit input, #tab-unit select, #tab-unit button'))
                .filter((el) => !named(el))
                .map((el) => el.tagName.toLowerCase() + '#' + (el.id || '') + '.' + el.className);
        });
        expect(unnamed).toEqual([]);
    });

    test('the override state line is signature-guarded, not rewritten at 10 Hz', async ({ page }) => {
        await open(page);
        // codebase-issues #229, filed against the FCU's twin and
        // reproduced verbatim here before the guard: 30 identical
        // rewrites of a role="status" region over three seconds is a
        // screen reader talking over itself.
        await page.locator('#ahu-ovr-toggle').click();
        await settle(page, 600);
        const n = await page.evaluate(() => new Promise((res) => {
            let count = 0;
            new MutationObserver(() => { count++; }).observe(
                document.getElementById('ahu-ovr-state'),
                { childList: true, characterData: true, subtree: true });
            setTimeout(() => res(count), 2500);
        }));
        expect(n, 'a held override rewrites the live region zero times').toBe(0);
        // …and it still repaints when the string genuinely changes.
        await page.locator('#ahu-ovr-toggle').click();
        await settle(page, 500);
        await expect(page.locator('#ahu-ovr-state')).toHaveText('');
    });

    test('the point mirror states its register in text, not only in colour', async ({ page }) => {
        await open(page);
        // WCAG 1.4.1: commanded / measured / calculated is otherwise the
        // green / plain / blue of the colour key and nothing else. The
        // word rides in the CAPTION, ahead of the live value, so a
        // button's accessible name stays stable across repaints.
        const rows = await page.locator('.ahu-point').evaluateAll((els) => els.map((e) => {
            const cap = e.querySelector('.ahu-point-cap');
            const val = e.querySelector('.ahu-point-val');
            return {
                reg: cap && cap.querySelector('.sr-only')
                    ? cap.querySelector('.sr-only').textContent.trim() : null,
                cls: val ? val.className : null,
            };
        }));
        expect(rows.length).toBe(16);
        for (const r of rows) {
            expect(r.reg, 'every mirror row names its register').toBeTruthy();
            const want = /is-calc/.test(r.cls) ? '(calculated)'
                : (/is-cmd/.test(r.cls) ? '(commanded)' : '(measured)');
            expect(r.reg, 'register word matches the colour class ' + r.cls).toBe(want);
        }
    });

    test('the colour key converts with the units toggle', async ({ page }) => {
        await open(page);
        // The key sits above a screen of °C wells in metric; it is plain
        // HTML in an XHTML container, so the SVG exemption does not apply
        // and it takes the site-wide data-us / data-metric idiom.
        await expect(page.locator('.ahu-key-well').first()).toHaveText('62.0 °F');
        await page.locator('.units-btn').filter({ hasText: 'Metric' }).click();
        await expect(page.locator('.ahu-key-well').first()).toHaveText('16.7 °C');
        await expect(page.locator('.ahu-key-well.is-calc')).toHaveText('-3.9 °C');
    });

    test('the economizer rail row tells lockout apart from no-call', async ({ page }) => {
        await open(page);
        const row = page.locator('#ahu-d-econ');
        // Above the high limit: locked out, whatever the zone is doing.
        await setWeather(page, 95);
        await settle(page, 900);
        await expect(row).toHaveText('Locked out');
        // Permitted and calling: open. The lockout is read off the
        // OUTDOOR AIR, not off the knob, so this row has to let the
        // weather arrive — mid-ramp at 80 °F the economizer is still
        // locked out and the row would read the old verdict.
        await setWeather(page, 60);
        await settle(page, 1500);
        await expect(row).toHaveText('Open');
    });
});

test.describe('AHU workbench page: the fullscreen cockpit keeps its console', () => {

    // Fullscreen makes the active pane the single scroller, and the right
    // column (mirror + presets + sliders) outruns it at the default
    // 1280×720 — so before the sticky pin, scrolling translated the console
    // up out of view and the rest of the travel ran over dead space (owner
    // report, 2026-08-01). These rows pin the fix's two contracts: the
    // console fills the scrollport at max scroll, and its BOTTOM edge (the
    // verdict pill lives there) lands on-screen — a hard top pin would
    // satisfy the first and silently break the second, because the built
    // console is TALLER than the scrollport at this viewport.
    //
    // ⚠ RE-DERIVED FOR THE MIRROR DIET, 2026-08-03. Hiding the eleven plain
    // mirror cells shortens the scrolling column, which is exactly the way
    // the `scrollTop > 0` floor below could have gone vacuous. It did not:
    // MEASURED at 1280×720 in fullscreen, the pane's overflow went 669px →
    // 440px, so the pane still scrolls by a wide margin and every assertion
    // here still bites. The console itself is untouched by the diet — the
    // mirror is not inside it — and measures 620px against a 482px
    // scrollport, so the overhang case the second assertion exists for is
    // still the live case (it is now 138px, not the 15px this comment used
    // to quote; the rail grew when its params became inputs in #472, and
    // that stale figure is corrected here and in the page's head block).

    async function measureAtBottom(page, pinnedSel) {
        return page.evaluate((sel) => {
            const pane = document.querySelector('#tab-unit');
            pane.scrollTop = pane.scrollHeight;
            const paneR = pane.getBoundingClientRect();
            const pinR = document.querySelector(sel).getBoundingClientRect();
            const visTop = Math.max(pinR.top, paneR.top);
            const visBot = Math.min(pinR.bottom, paneR.bottom);
            return {
                scrollTop: pane.scrollTop,
                paneClient: pane.clientHeight,
                paneBottom: paneR.bottom,
                pinnedHeight: pinR.height,
                pinnedBottom: pinR.bottom,
                visible: Math.max(0, visBot - visTop),
            };
        }, pinnedSel);
    }

    test('scrolled to the bottom, the console still fills the scrollport', async ({ page }) => {
        await open(page);
        await page.click('.tool-card-fullscreen-btn');
        const m = await measureAtBottom(page, '.ahu-console');

        // Non-vacuity floor: the pane must actually have scrolled. If a
        // future layout change removes the overflow, the visibility
        // assertions below pass vacuously and this is what says so.
        expect(m.scrollTop, 'the pane actually scrolled').toBeGreaterThan(0);

        // The console occupies the whole scrollport (or is fully visible,
        // if a retune ever makes it shorter than the pane) — no dead space.
        expect(m.visible, 'the console still fills the view at max scroll')
            .toBeGreaterThanOrEqual(Math.min(m.pinnedHeight, m.paneClient) - 2);

        // And its BOTTOM edge has arrived on-screen: sticky yields the
        // overhang at the end of the travel instead of hard-pinning the
        // top, so the verdict pill (bottom of the console) is reachable.
        expect(m.pinnedBottom, 'the console bottom (verdict) is on-screen')
            .toBeLessThanOrEqual(m.paneBottom + 2);
    });

    test('the stacked fallback stays ordinary flow (sticky is off)', async ({ page }) => {
        // 800px wide trips the one-column @media arm; a sticky console
        // there would paint over the mirror and controls scrolling under
        // it, so the override pins position back to static.
        await page.setViewportSize({ width: 800, height: 720 });
        await open(page);
        await page.click('.tool-card-fullscreen-btn');
        const pos = await page.evaluate(
            () => getComputedStyle(document.querySelector('.ahu-console')).position);
        expect(pos, 'one-column fallback must not pin the console').toBe('static');
    });
});

// ── The unit selector ────────────────────────────────────────────────
// The statusbar's "which machine am I looking at" pair. Two workbench
// pages, one plain anchor each way — the ruled design: not tabs, not a
// JS switch. link-integrity.spec.js walks _site for broken FRAGMENTS,
// not for a page that quietly stops linking its sibling, so these rows
// are still the only thing holding the pair together.

test.describe('AHU workbench page: the unit selector', () => {

    test('the pair sits in the statusbar and marks THIS page current', async ({ page }) => {
        await open(page);

        // In the statusbar row, not merely somewhere on the page — that
        // placement IS the deliverable, and a refactor that floats it
        // elsewhere should fail here rather than pass quietly.
        const sel = page.locator('#ddcw-statusbar .ddcw-unit-sel');
        await expect(sel).toHaveCount(1);

        // The visible caption is the landmark's accessible name, so the
        // word "Unit" is not written twice.
        await expect(sel).toHaveAttribute('aria-labelledby', 'ddcw-unit-sel-lbl');
        await expect(page.locator('#ddcw-unit-sel-lbl')).toHaveText('Unit');

        // FCU then AHU, in that order, on BOTH pages — a selector that
        // reorders itself per page makes the reader re-find the target.
        const links = sel.locator('a.ddcw-unit-link');
        await expect(links).toHaveCount(2);
        await expect(links.nth(0)).toHaveText('FCU');
        await expect(links.nth(1)).toHaveText('AHU');
        await expect(links.nth(0)).toHaveAttribute('href', '/simulators/ddc-workbench-fcu.html');
        await expect(links.nth(1)).toHaveAttribute('href', '/simulators/ddc-workbench.html');

        // Exactly one aria-current, on this page's own link — which stays
        // a real self-href anchor (asserted above), per the pattern.
        await expect(sel.locator('[aria-current="page"]')).toHaveCount(1);
        await expect(links.nth(1)).toHaveAttribute('aria-current', 'page');
        await expect(links.nth(0)).not.toHaveAttribute('aria-current', /.*/);
    });

    test('the sibling link lands on the FCU workbench, current there', async ({ page }) => {
        await open(page);
        const sib = page.locator('.ddcw-unit-sel a.ddcw-unit-link:not([aria-current])');
        const wait = page.waitForResponse(
            (r) => r.url().endsWith('/simulators/ddc-workbench-fcu.html'));
        await sib.click();
        const resp = await wait;
        expect(resp.status(), 'the sibling href is a live page').toBe(200);

        // The FCU page's own title — its "Fan Coil" qualifier against
        // this page's "Air Handler" is the cheapest proof we did not
        // just reload.
        await expect(page).toHaveTitle('DDC Workbench — Fan Coil — controlsfreak.dev');

        // …and the pair over there marks FCU, so the two halves are wired
        // to each other rather than both to one page.
        await expect(page.locator('.ddcw-unit-sel [aria-current="page"]')).toHaveText('FCU');
    });

    test('fullscreen keeps it on screen and clickable at max scroll', async ({ page }) => {
        await open(page);
        await page.click('.tool-card-fullscreen-btn');

        // The statusbar is fixed chrome in the cockpit (flex: none) while
        // the active pane is the single scroller. Run the pane to the
        // bottom: the selector must not travel with it.
        const m = await page.evaluate(() => {
            const pane = document.querySelector('#tab-unit');
            pane.scrollTop = pane.scrollHeight;
            const el = document.querySelector('.ddcw-unit-sel a.ddcw-unit-link:not([aria-current])');
            const r = el.getBoundingClientRect();
            const hit = document.elementFromPoint(
                (r.left + r.right) / 2, (r.top + r.bottom) / 2);
            return {
                scrollTop: pane.scrollTop,
                top: r.top, bottom: r.bottom, height: r.height,
                vh: window.innerHeight,
                // Nothing painted over it — the click would reach the link.
                covered: !(el === hit || el.contains(hit)),
            };
        });
        expect(m.scrollTop, 'the pane actually scrolled').toBeGreaterThan(0);
        expect(m.height, 'the selector still has a box').toBeGreaterThan(0);
        expect(m.top, 'top edge on screen').toBeGreaterThanOrEqual(0);
        expect(m.bottom, 'bottom edge on screen').toBeLessThanOrEqual(m.vh);
        expect(m.covered, 'the sibling link is not painted over').toBe(false);

        // And it still navigates from inside the cockpit.
        await page.click('.ddcw-unit-sel a.ddcw-unit-link:not([aria-current])');
        await expect(page).toHaveTitle('DDC Workbench — Fan Coil — controlsfreak.dev');
    });
});

test.describe('AHU workbench page: the unit selector on touch', () => {
    // isMobile + hasTouch make Chromium's emulation match (hover: none),
    // which is the only condition under which the unit-selector touch
    // floor applies. The floor rode the unit-selector CSS into
    // styles.css at graduation, kept beside the component (it needs
    // justify-content on top of the TOUCH-TARGET FLOOR boilerplate);
    // this row is still what guards it.
    test.use({ isMobile: true, hasTouch: true, viewport: { width: 412, height: 883 } });

    test('the links clear the 44px floor', async ({ page }) => {
        await page.goto(URL);
        const links = page.locator('a.ddcw-unit-link');
        await expect(links).toHaveCount(2);
        for (let i = 0; i < 2; i++) {
            const box = await links.nth(i).boundingBox();
            expectTouchFloorHeight(box, `link ${i}`);
        }
    });
});

test.describe('AHU workbench page: the parameter rail adjusts the running program', () => {
    // The 2026-08-03 ruling: params are adjustable from the operator
    // graphic. Every row here drives the BUILT page end-to-end, because
    // the write path is the part a unit test can't vouch for — the edit
    // must land on the const block of the RUNNING graph (block id ===
    // point id), never on plant.params, which bindingTick overwrites
    // from the block within one tick. A wrong write path looks fine for
    // exactly one tick, which is why the rows below read the OTHER
    // surfaces (chip, SVG well, mirror, wiresheet block) and not the
    // input they typed into.

    const chipText = (page, cap) => page.evaluate((c) => {
        const chips = Array.from(document.querySelectorAll('#ddcw-io .ddcw-chip'));
        const hit = chips.find((el) => el.textContent.includes(c));
        return hit ? hit.textContent : null;
    }, cap);

    test('typing does not write; Enter commits, and every surface agrees within a tick', async ({ page }) => {
        await open(page);
        const cool = page.locator('#ahu-p-cool-sp');
        await cool.click();
        await cool.fill('');
        await cool.pressSequentially('74');
        await settle(page, 300);
        // Mid-type: the momentary "7" (then "74", uncommitted) must not
        // have reached the program — the chip and the SVG well still read
        // the shipped 72.0.
        expect(await chipText(page, 'Cool SP'), 'chip mid-type').toContain('72.0');
        await expect(page.locator('#ahu-v-cool-sp')).toHaveText('72.0 °F');

        await cool.press('Enter');
        await settle(page, 300);
        expect(await chipText(page, 'Cool SP'), 'chip after Enter').toContain('74.0');
        await expect(page.locator('#ahu-v-cool-sp')).toHaveText('74.0 °F');
        await expect(page.locator('#ahu-r-cool-sp')).toHaveText('74.0 °F');
        expect(await cool.inputValue()).toBe('74.0');
        // SP DIFF follows — the calculated row recomputes off the edit.
        await expect(page.locator('#ahu-p-sp-diff')).toHaveText('6.0 °F');
        // And the edit is a CONSTANT change, not a hand command: the
        // program picker must NOT flip to Custom (same contract as an
        // inspector param edit), and nothing lands off-program.
        expect(await page.locator('#ddcw-program').inputValue()).toBe('econ-2stage');
        await expect(page.locator('#ddcw-offprog-list li')).toHaveCount(0);
    });

    test('Escape reverts the field without committing', async ({ page }) => {
        await open(page);
        const heat = page.locator('#ahu-p-heat-sp');
        await heat.click();
        await heat.fill('60');
        await heat.press('Escape');
        await settle(page, 200);
        expect(await heat.inputValue(), 'field back on the live value').toBe('68.0');
        expect(await chipText(page, 'Heat SP'), 'nothing committed').toContain('68.0');
    });

    test('Escape claims the press only while an edit is pending (fullscreen stays reachable)', async ({ page }) => {
        await open(page);
        await page.click('.tool-card-fullscreen-btn');
        await settle(page, 300);
        const heat = page.locator('#ahu-p-heat-sp');
        await heat.click();
        await heat.fill('60');
        // Dirty field: Escape cancels the edit and must NOT also exit the
        // cockpit — one press, one action.
        await heat.press('Escape');
        await settle(page, 200);
        expect(await heat.inputValue(), 'edit cancelled').toBe('68.0');
        expect(await page.evaluate(() => document.body.classList.contains('has-fullscreen-tool')),
            'first Escape stays in fullscreen').toBe(true);
        // Clean field: nothing to cancel, so the press bubbles to the
        // fullscreen handler. An unconditional stopPropagation here would
        // swallow Escape forever and strand a keyboard user in the cockpit.
        await heat.press('Escape');
        await settle(page, 200);
        expect(await page.evaluate(() => document.body.classList.contains('has-fullscreen-tool')),
            'second Escape exits fullscreen').toBe(false);
    });

    test('a commit outside the rails clamps — and ANNOUNCES the range', async ({ page }) => {
        await open(page);
        const cool = page.locator('#ahu-p-cool-sp');
        await cool.click();
        await cool.fill('200');
        await cool.press('Enter');
        await settle(page, 300);
        // Clamped to the roster max, not rejected and not taken raw…
        expect(await cool.inputValue()).toBe('85.0');
        expect(await chipText(page, 'Cool SP')).toContain('85.0');
        // …and the hint line says so, naming the range, so a reader who
        // skipped the prose doesn't think the field is broken. (On a real
        // front end the rails are usually silent; this is a classroom.)
        await expect(page.locator('#ahu-params-hint')).toContainText('65.0–85.0 °F');
    });

    test('an edit made before the first wiresheet open survives the mount (#260)', async ({ page }) => {
        await open(page);
        // The regression this row exists for: the first Wiresheet open
        // deep-clones the running graph into the editor (construction →
        // makeGraph), and makeGraph resets state/out/in but PRESERVES
        // params. A write path that parked the value anywhere else — or a
        // clone that reset params — would silently revert the edit on
        // first mount, which no other row would catch.
        const cool = page.locator('#ahu-p-cool-sp');
        await cool.click();
        await cool.fill('80');
        await cool.press('Enter');
        await settle(page, 200);
        await page.locator('.tabs.tabs-flush [data-tab="wiresheet"]').click();
        await settle(page, 600);
        // Read the const block's own value strip on the sheet — the
        // editor repaints it from the block's outputs each tick, so this
        // is the running graph speaking, not the input echoing.
        const strip = await page.evaluate(() => {
            const blocks = Array.from(document.querySelectorAll('#ddcw-fbe-inner .fbe-block'));
            const b = blocks.find((el) => (el.textContent || '').includes('Cool SP'));
            return b ? b.querySelector('.fbe-block-val').textContent : null;
        });
        expect(strip, 'the wiresheet const carries the pre-mount edit').toBe('80');
        // And the rail still agrees after the mount's graph swap.
        expect(await cool.inputValue()).toBe('80.0');
    });

    test('a program switch resets the rail to the authored literals', async ({ page }) => {
        await open(page);
        const cool = page.locator('#ahu-p-cool-sp');
        await cool.click();
        await cool.fill('80');
        await cool.press('Enter');
        await settle(page, 200);
        // Blur before switching: Playwright's selectOption moves no
        // focus, but every real interaction with the picker does — and
        // the mirror paint deliberately skips a FOCUSED field (commit is
        // Enter/blur), so an unblurred switch here would read a stale
        // field and call the reset broken when it isn't.
        await cool.blur();
        await page.locator('#ddcw-program').selectOption('econ-2stage-lowlimits');
        await settle(page, 400);
        // Same contract as the wiresheet's own picker behaviour: a
        // program load re-clones the authored literal, params included.
        expect(await cool.inputValue()).toBe('72.0');
        expect(await chipText(page, 'Cool SP')).toContain('72.0');
    });

    test('after Clear the rail disables, honestly depicting the freeze', async ({ page }) => {
        await open(page);
        await page.locator('.tabs.tabs-flush [data-tab="wiresheet"]').click();
        await settle(page, 600);
        await page.locator('#tab-wiresheet [data-fbe-action="clear"]').click();
        await settle(page, 400);
        // bindingTick skips a missing block, so the param freezes at its
        // last read — the input disables (with a title saying why) rather
        // than accept an edit with nowhere to land.
        for (const id of ['ahu-p-cool-sp', 'ahu-p-heat-sp', 'ahu-p-deadband',
            'ahu-p-econ-lockout', 'ahu-p-min-oa']) {
            await expect(page.locator('#' + id), id).toBeDisabled();
        }
        const title = await page.locator('#ahu-p-cool-sp').getAttribute('title');
        expect(title).toContain('no cooling-setpoint block');
        // Reloading a program re-arms the rail.
        await page.locator('#ddcw-program').selectOption('econ-2stage');
        await settle(page, 400);
        await expect(page.locator('#ahu-p-cool-sp')).toBeEnabled();
    });

    test('the units toggle re-expresses values, ranges and suffixes', async ({ page }) => {
        await open(page);
        await page.locator('.units-btn').filter({ hasText: 'Metric' }).click();
        await settle(page, 300);
        const cool = page.locator('#ahu-p-cool-sp');
        // 72 °F → 22.2 °C; the deadband is a DELTA: 2 °F → 1.1 °C.
        expect(await cool.inputValue()).toBe('22.2');
        expect(await page.locator('#ahu-p-deadband').inputValue()).toBe('1.1');
        await expect(page.locator('#ahu-p-cool-sp-u')).toHaveText('°C');
        // The range attributes move with the mode (65–85 °F → 18.3–29.4 °C)
        // so the spinners and browser cues stay honest; the committed
        // clamp is canonical-side and unaffected.
        expect(await cool.getAttribute('min')).toBe('18.3');
        expect(await cool.getAttribute('max')).toBe('29.4');
        // A metric commit round-trips through toCanonical: 23 °C → 73.4 °F.
        await cool.click();
        await cool.fill('23');
        await cool.press('Enter');
        await settle(page, 300);
        expect(await cool.inputValue()).toBe('23.0');
        expect(await chipText(page, 'Cool SP')).toContain('23.0 °C');
    });

    test('a metric clamp holds the CANONICAL limit through the Enter double-fire', async ({ page }) => {
        await open(page);
        // The regression this row exists for: Enter fires keydown AND the
        // native 'change', and the keydown commit re-expresses the field
        // in display units (85 °F → "29.4"). Without the display-equality
        // no-op in commit(), the change-side call re-parses that display
        // through toCanonical (29.4 °C → 84.92 °F) — inside the range, so
        // it commits, silently eroding the clamped canonical below the
        // limit the hint just announced. US units round-trip losslessly,
        // which is why only a metric boundary catches it.
        await page.locator('.units-btn').filter({ hasText: 'Metric' }).click();
        await settle(page, 300);
        const cool = page.locator('#ahu-p-cool-sp');
        await cool.click();
        await cool.fill('29.5');                 // canonical 85.1 → clamp 85
        await cool.press('Enter');
        await settle(page, 300);
        expect(await cool.inputValue()).toBe('29.4');
        await expect(page.locator('#ahu-params-hint')).toContainText('18.3–29.4 °C');
        // Flip back to US: the stored canonical must be EXACTLY the roster
        // max, not the eroded 84.9.
        await page.locator('.units-btn').filter({ hasText: 'US' }).click();
        await settle(page, 300);
        expect(await cool.inputValue(), 'canonical held at the limit').toBe('85.0');
        expect(await chipText(page, 'Cool SP')).toContain('85.0');
    });

    test('boot values sit inside the declared rails', async ({ page }) => {
        await open(page);
        // A shipped literal outside its own roster range would clamp on
        // the first touch — the owner retuning either side must keep the
        // pair coherent, and this is the row that says so.
        const vals = await page.evaluate(() => Array.from(
            document.querySelectorAll('.ahu-params input')).map((el) => ({
            id: el.id, v: parseFloat(el.value),
            min: parseFloat(el.min), max: parseFloat(el.max),
        })));
        expect(vals.length).toBe(5);
        for (const r of vals) {
            expect(r.v, r.id + ' boot value >= min').toBeGreaterThanOrEqual(r.min);
            expect(r.v, r.id + ' boot value <= max').toBeLessThanOrEqual(r.max);
        }
    });
});

test.describe('AHU workbench page: rail ink clears the AA floor in both themes', () => {
    // Hand-written contrast rows, written while this was a hidden page
    // the contrast sweep could not reach. The sweep measures the page
    // now (graduation put it in tests/pages.js), but these rows stay:
    // they assert exact floors on named ink sources, which localizes a
    // failure faster than the sweep's page-wide walk. The rail's NEW
    // ink sources are the input
    // value (accent-ink on the editwell), the label captions (text-dim)
    // and the hint line (amber-ink) — each asserted at the 4.5:1
    // small-text floor in BOTH themes. The disabled state is exempt
    // (WCAG 1.4.3 inactive-control exception).

    async function themed(browser, theme) {
        const ctx = await browser.newContext({
            viewport: { width: 1500, height: 950 },
            colorScheme: theme,                    // headless default is LIGHT — never assume
        });
        await ctx.addInitScript((t) => {
            try { localStorage.setItem('cf_theme', t); } catch (e) { /* private mode */ }
        }, theme);
        return ctx;
    }

    for (const theme of ['dark', 'light']) {
        test(`rail ink >= 4.5:1 in ${theme}`, async ({ browser }) => {
            const ctx = await themed(browser, theme);
            const page = await ctx.newPage();
            try {
                await page.goto(URL);
                await page.waitForTimeout(400);
                expect(await page.evaluate(
                    () => document.documentElement.getAttribute('data-theme'),
                ), 'the seeded theme must actually render').toBe(theme);
                // Settle the tool-card entrance fade BEFORE measuring — its
                // DELAY phase defeats actionability waits (the element is
                // stationary at opacity < 1), so a fixed timeout can land
                // mid-fade and read a ghost (#259). The measurement below
                // composites opacity, so an unsettled fade would read as a
                // hard fail rather than a silent pass — this wait is what
                // makes the rows deterministic.
                await page.waitForFunction(() => {
                    const card = document.querySelector('.tool-card');
                    return card && getComputedStyle(card).opacity === '1';
                });

                const rows = await page.evaluate(() => {
                    const parse = (c) => {
                        const m = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/.exec(c);
                        return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
                    };
                    const lum = (rgb) => {
                        const ch = [rgb.r, rgb.g, rgb.b].map((v) => {
                            const s = v / 255;
                            return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
                        });
                        return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
                    };
                    const bgOf = (el) => {
                        let n = el;
                        while (n && n !== document.documentElement) {
                            const bg = getComputedStyle(n).backgroundColor;
                            if (bg && !/rgba?\(\d+, \d+, \d+, 0\)/.test(bg)
                                && bg !== 'transparent') return bg;
                            n = n.parentElement;
                        }
                        return getComputedStyle(document.documentElement).backgroundColor;
                    };
                    // Ancestor-multiplied opacity — declared colour is not
                    // rendered ink (the site sweep's .bit-idx lesson: a
                    // separate `opacity` on the element counts, and it is
                    // exactly what a colour-only read cannot see).
                    const effOpacity = (el) => {
                        let o = 1, n = el;
                        while (n && n !== document.documentElement) {
                            o *= parseFloat(getComputedStyle(n).opacity);
                            n = n.parentElement;
                        }
                        return o;
                    };
                    const ratio = (el) => {
                        const bg = parse(bgOf(el));
                        const raw = parse(getComputedStyle(el).color);
                        const a = effOpacity(el) * raw.a;
                        const fg = {
                            r: raw.r * a + bg.r * (1 - a),
                            g: raw.g * a + bg.g * (1 - a),
                            b: raw.b * a + bg.b * (1 - a),
                        };
                        const L1 = lum(fg), L2 = lum(bg);
                        return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
                    };
                    const hint = document.getElementById('ahu-params-hint');
                    return {
                        input: ratio(document.getElementById('ahu-p-cool-sp')),
                        suffix: ratio(document.getElementById('ahu-p-cool-sp-u')),
                        label: ratio(document.querySelector('label[for="ahu-p-cool-sp"]')),
                        hint: ratio(hint),
                        note: ratio(document.querySelector('.ahu-param-note')),
                    };
                });
                for (const [name, r] of Object.entries(rows)) {
                    expect(r, `${name} ink in ${theme} (measured ${r.toFixed(2)}:1)`)
                        .toBeGreaterThanOrEqual(4.5);
                }
            } finally {
                await ctx.close();
            }
        });
    }
});

test.describe('AHU workbench page: the phone surface (the Unit tab is the mobile version)', () => {
    // Owner ruling 2026-08-03: "the Unit tab IS the limited mobile
    // version" — a phone visitor gets a real interactive surface, not a
    // desktop-gate. These rows were written before the responsive
    // sweep reached this page (graduation joined it to tests/pages.js)
    // and assert MORE than the sweep does: no
    // sideways scroll, the mirror register filled back in, the rail
    // operable and floored at 44px in BOTH dimensions (the shared
    // TOUCH-TARGET FLOOR is height-only — codebase-issues #262), the
    // wiresheet's one-line truth at tap-in, and one HTML twin per SVG
    // drill-down (the touch-target equivalence that stands in for a
    // floor SVG geometry cannot take).
    test.use({ isMobile: true, hasTouch: true, viewport: { width: 375, height: 667 } });

    test('no sideways scroll and no clipped content at 375', async ({ page }) => {
        await open(page);
        // The responsive.spec.js criterion applied by hand. One page-local
        // entry joins the sweep's intentional list: .ddcw-offprog.is-empty
        // is the sr-only collapse recipe under another name (a live region
        // that must stay rendered while empty), so its 1px box "clips" by
        // design exactly as .sr-only does.
        const offenders = await page.evaluate(() => {
            const out = [];
            const doc = document.documentElement;
            if (doc.scrollWidth > window.innerWidth + 1) {
                out.push(`document scrolls sideways (${doc.scrollWidth} > ${window.innerWidth})`);
            }
            for (const el of document.querySelectorAll('body *')) {
                if (el.clientWidth === 0 || el.scrollWidth <= el.clientWidth + 2) continue;
                if (el.matches('input, textarea, select, .sr-only, .ddcw-offprog.is-empty')) continue;
                const ox = getComputedStyle(el).overflowX;
                if (ox !== 'hidden' && ox !== 'clip') continue;
                let name = el.tagName.toLowerCase();
                if (el.id) name += '#' + el.id;
                else if (el.classList.length) name += '.' + [...el.classList].slice(0, 3).join('.');
                out.push(`${name} clips ${el.scrollWidth}px into ${el.clientWidth}px`);
            }
            return out;
        });
        expect(offenders, 'the Unit tab fits a 375px phone').toEqual([]);
    });

    test('the mirror register is filled back in — the phone reading surface', async ({ page }) => {
        // Below the 900 cutoff the diet is off: all sixteen cells take
        // space, because at this width the drawing's own text renders
        // near 3px and the mirror IS the reading copy.
        await open(page);
        const boxed = await page.locator('.ahu-point').evaluateAll((els) =>
            els.filter((e) => {
                const r = e.getBoundingClientRect();
                return r.width > 2 && r.height > 2;
            }).length);
        expect(boxed, 'all sixteen mirror cells occupy the grid at 375').toBe(16);
    });

    test('the rail inputs clear the 44px floor in both dimensions, and a touch commit lands', async ({ page }) => {
        await open(page);
        const inputs = page.locator('.ahu-param-input');
        await expect(inputs).toHaveCount(5);
        for (let i = 0; i < 5; i++) {
            const box = await inputs.nth(i).boundingBox();
            expectTouchFloor(box, `rail input ${i}`);
        }
        // Operable under touch emulation: tap, type, Enter — the commit
        // reaches the statusbar chip (the phone's always-visible surface).
        await page.tap('#ahu-p-cool-sp');
        await page.fill('#ahu-p-cool-sp', '75');
        await page.keyboard.press('Enter');
        await expect(page.locator('.ddcw-chip', { hasText: 'Cool SP' })
            .locator('.ddcw-chip-val')).toHaveText(/75/);
    });

    test('the clamp hint sits within a phone-keyboard\'s reach of every rail field', async ({ page }) => {
        // The fix this row pins: at single-column widths the hint is
        // grid-ordered BETWEEN the two input-bearing groups. Before it,
        // the Cooling SP field measured 319px above the hint — past the
        // visible band once the on-screen keyboard takes the lower half
        // of a 667px viewport. Ordered, the measured extremes are 169px
        // (zone fields, hint below) and −174px (economizer fields, hint
        // above — the keyboard-safe side); 250 is a loose ceiling on
        // both, because the claim is reach, not a pixel.
        await open(page);
        const dists = await page.evaluate(() => {
            const hint = document.getElementById('ahu-params-hint');
            const h = hint.getBoundingClientRect();
            return [...document.querySelectorAll('.ahu-param-input')].map((inp) => ({
                id: inp.id,
                dist: h.top - inp.getBoundingClientRect().bottom,
            }));
        });
        for (const d of dists) {
            expect(Math.abs(d.dist), `${d.id} to the hint`).toBeLessThanOrEqual(250);
        }
        // The mechanism, not just the outcome: the hint renders before the
        // economizer group, so its announcement is never below BOTH groups.
        const order = await page.evaluate(() => {
            const hint = document.getElementById('ahu-params-hint').getBoundingClientRect();
            const groups = document.querySelectorAll('.ahu-params > .ahu-param-group');
            return { hintTop: hint.top, econTop: groups[groups.length - 1].getBoundingClientRect().top };
        });
        expect(order.hintTop, 'the hint is ordered above the economizer group').toBeLessThan(order.econTop);
    });

    test('the unit-selector links and the stage buttons clear the floor in both dimensions', async ({ page }) => {
        // The unit links measured 41–42px wide natively — the exact case
        // codebase-issues #262 names — and the stage group's "Off" 43px.
        // Both floors are page-local; no sweep reaches this page.
        await open(page);
        for (const sel of ['a.ddcw-unit-link', '#ahu-stage-0', '#ahu-stage-1', '#ahu-stage-2']) {
            const els = page.locator(sel);
            const n = await els.count();
            for (let i = 0; i < n; i++) {
                const box = await els.nth(i).boundingBox();
                expectTouchFloor(box, `${sel}[${i}]`);
            }
        }
    });

    test('the fullscreen button does not paint over the title tag', async ({ page }) => {
        // Measured before the fix: 18px of the AIR HANDLER tag under the
        // absolutely-positioned button at 375. The page-local clearance
        // rule pads the header and lets the title row wrap.
        await open(page);
        const boxes = await page.evaluate(() => {
            const t = document.querySelector('.tool-tag').getBoundingClientRect();
            const b = document.querySelector('.tool-card-fullscreen-btn').getBoundingClientRect();
            return { t: { l: t.left, r: t.right, t: t.top, b: t.bottom },
                     b: { l: b.left, r: b.right, t: b.top, b: b.bottom } };
        });
        const overlapX = Math.min(boxes.t.r, boxes.b.r) - Math.max(boxes.t.l, boxes.b.l);
        const overlapY = Math.min(boxes.t.b, boxes.b.b) - Math.max(boxes.t.t, boxes.b.t);
        expect(overlapX > 0 && overlapY > 0, 'tag and fullscreen button share paint').toBe(false);
    });

    test('the wiresheet opens on its one-line truth, with the workspace honestly absent', async ({ page }) => {
        await open(page);
        await page.tap('button[data-tab="wiresheet"]');
        const note = page.locator('p.ddcw-sheet-mobile-note');
        await expect(note, 'the phone truth renders where the workspace is gated out').toBeVisible();
        // First element in the pane: the truth lands at tap-in, not at the
        // bottom of the sheet notes (where .desktop-only-sim keeps the
        // fuller version, in the workspace's own slot). De-counted with
        // the collapse pilot — the old "nine" was already wrong at 11,
        // and folding some of them behind details.prose-fold would only
        // have made a fresh number wrong again.
        const first = await page.evaluate(() =>
            document.getElementById('tab-wiresheet').querySelector('p') ===
            document.querySelector('p.ddcw-sheet-mobile-note'));
        expect(first, 'the note is the pane\'s first element').toBe(true);
        // Register check, not a full-string pin: what it is + where the
        // editing lives, with no coming-soon promise.
        await expect(note).toContainText('read-through');
        await expect(note).toContainText('Unit tab');
        await expect(page.locator('.fbe-live')).toBeHidden();
        await expect(page.locator('.desktop-only-sim')).toBeVisible();
    });

    test('every SVG drill-down keeps an HTML twin outside the drawing', async ({ page }) => {
        // The touch-target equivalence (WCAG 2.5.5/2.5.8): the SVG <a>
        // glyphs scale with the drawing (~18×28 CSS px at 375) and SVG
        // geometry cannot take a min-width, so the pass rides the
        // equivalent-control clause through the teach block's anchors.
        // Removing one reddens this row.
        await open(page);
        const drills = await page.evaluate(() => {
            const svgHrefs = [...document.querySelectorAll('.ahu-svg a[href]')]
                .map((a) => a.getAttribute('href'));
            return svgHrefs.map((href) => ({
                href,
                twin: [...document.querySelectorAll(`main a[href="${href}"]`)]
                    .some((a) => !a.closest('.ahu-svg')),
            }));
        });
        expect(drills.length, 'the drawing still carries its three drill-downs').toBe(3);
        for (const d of drills) {
            expect(d.twin, `${d.href} needs an HTML twin outside the SVG`).toBe(true);
        }
    });
});

// ══════════════════════════════════════════════════════════════════════
// THE HARDWIRED LOW-LIMIT STAT — the device the controller cannot see.
//
// The machine carries a manual-reset low-limit stat across the coil
// face, landed in the fan starter circuit and NOT landed on the
// controller. Each of the ideas that carries has a row below: it is
// DRAWN on the graphic and left unmarked; its reset lives on an
// equipment-register device face rather than in the software controls;
// and the graphic's verdict never names it. (The wire somebody lays
// across its terminals has its own describe block further down.)
//
// The verdict row is the one that exists to be defended. It pins an
// ABSENCE, so it is written as a vocabulary ban rather than a string
// match: whatever the ladder says while the stat is down, it may not
// say "low limit", "freezestat" or "stat". A future edit that makes the
// graphic more helpful here reddens it, which is the intent — the
// unhelpfulness is the content.
// ══════════════════════════════════════════════════════════════════════

// Words the SCREEN may never use about this device. `stat` is matched
// with a word boundary so "status" is untouched.
//
// ⚠ THE WIRING VOCABULARY IS IN THE BAN TOO, and it is not padding. A
// controller with no point for the stat certainly has no point for a
// wire somebody laid across its terminals, so a verdict that said
// "safety bypassed" would be a bigger lie than one that named the trip.
// The ban has to cover the jumper or it has a hole exactly the width of
// the feature that made this device sittable.
const CAUSE_WORDS = /low[- ]?limit|freeze ?stat|\bstats?\b|\bLLS\b|jumper|defeat|bypass/i;

// Drive the page into a hardwired trip through the real UI: the
// free-cooling preset holds the damper wide open at slot 8, and dragging
// the outdoor-air slider to its floor then puts raw sub-zero air across
// the coils — the freeze a low-limit stat exists to catch. Deliberately
// no program involvement: with slot 8 held, the SOFTWARE low limit on
// the winter sheet could not stop the fan even if it wanted to, which is
// exactly why the hardware device is the one that acts.
//
// THE DRAG IS LEFT AT THE FLOOR, and that is the whole recipe now. The
// knob writes a target and the outdoor air walks toward it at
// OA_RAMP_RATE (the sustained-cold ruling, 2026-08-09), so a drag that
// came back would deliver nothing — that is the ruling's other half,
// pinned by its own row further down. Here the cold is left to arrive:
// the preset snaps the weather to 55 °F, the knob asks for −20, and the
// element goes at ~24 °F on the way past. MEASURED engine-direct at the
// default 20× clock: 62 sim-seconds, ~3.1 wall-seconds. The timeout is
// an order of magnitude clear of that because a loaded box runs fewer
// ticks per wall second, not because the number is uncertain.
async function tripTheStat(page) {
    await page.click('[data-preset="freecool"]');
    await page.fill('#ahu-oa-slider', '-20');
    await page.dispatchEvent('#ahu-oa-slider', 'input');
    await expect(page.locator('#ahu-lls-state')).toHaveText('TRIPPED', { timeout: 30000 });
}

test.describe('AHU workbench page: the low-limit stat', () => {

    test('it is DRAWN on the graphic, and drawn unmarked', async ({ page }) => {
        // Owner ruling 2026-08-08, the DOAS exhaust-fan shape: draw the
        // device, do not mark it. Marking it would hand the controller a
        // point it does not have. Every clause here is an absence, and
        // together they are what "unmarked" means on this drawing.
        await open(page);
        const stat = page.locator('#ahu-lls-stat');
        await expect(stat, 'the device is drawn').toHaveCount(1);
        await expect(stat).toBeVisible();

        const shape = await page.evaluate(() => {
            const g = document.getElementById('ahu-lls-stat');
            return {
                inSvg: !!g.closest('#ahu-graphic'),
                dataPoint: g.hasAttribute('data-point'),
                sensorClass: g.classList.contains('ddcw-sensor')
                    || !!g.querySelector('.ddcw-sensor'),
                focusable: !!g.querySelector('[tabindex], a, button')
                    || g.hasAttribute('tabindex'),
                marks: g.querySelectorAll(
                    '.ahu-leader, .ahu-anchor, .ahu-well, .ahu-callout, text, title').length,
                calloutFor: !!document.querySelector('[data-callout-for="lls"]'),
                // Every ink it paints with, resolved: the neutral no-point
                // family and nothing else. An identity colour here would
                // claim the program reads or writes it.
                inks: [...g.querySelectorAll('*')].map((el) => {
                    const cs = getComputedStyle(el);
                    return cs.stroke + '|' + cs.fill;
                }),
                dim: getComputedStyle(document.querySelector('.ahu-louver-slat')).stroke,
                surface: getComputedStyle(document.querySelector('.ahu-louver-frame')).fill,
            };
        });
        expect(shape.inSvg, 'it sits inside the unit graphic').toBe(true);
        expect(shape.dataPoint, 'no data-point — it is not a point').toBe(false);
        expect(shape.sensorClass, 'not a .ddcw-sensor glyph either').toBe(false);
        expect(shape.focusable, 'nothing inside it is focusable').toBe(false);
        expect(shape.marks, 'no leader, anchor, well, callout, label or tooltip')
            .toBe(0);
        expect(shape.calloutFor, 'no annotation group answers to it').toBe(false);
        // Ink: the same two computed colours the intake louver uses —
        // the drawing's own "no point, neutral line-art" family.
        for (const ink of shape.inks) {
            const [stroke, fill] = ink.split('|');
            expect(stroke, 'stat stroke is the neutral dim ink').toBe(shape.dim);
            expect([shape.surface, 'none'], 'stat fill is the panel face or nothing')
                .toContain(fill);
        }
    });

    test('the reset lives on a device face, not in the software controls', async ({ page }) => {
        // The register IS the argument: a stat that is not a point cannot
        // be reset from a screen, so its button is drawn as hardware. If
        // this ever becomes a .copy-btn beside the scenario row, the page
        // has quietly claimed the controller can reach the device.
        await open(page);
        const panel = page.locator('#ahu-lls');
        await expect(panel).toBeVisible();
        await expect(panel).toHaveClass(/\bdevice\b/);
        const btn = page.locator('#ahu-lls-reset');
        await expect(btn).toBeVisible();
        await expect(btn).toBeEnabled();

        const shape = await page.evaluate(() => {
            const b = document.getElementById('ahu-lls-reset');
            const p = document.getElementById('ahu-lls');
            return {
                tag: b.tagName,
                inDevice: !!b.closest('.device'),
                softwareClass: b.classList.contains('copy-btn'),
                named: (b.textContent || '').trim(),
                group: p.getAttribute('role'),
                labelled: !!document.getElementById(
                    p.getAttribute('aria-labelledby') || ''),
                // The result line is announced (a press is user-initiated
                // feedback); the STATE row deliberately is not.
                msgLive: document.getElementById('ahu-lls-msg').getAttribute('aria-live'),
                stateLive: document.getElementById('ahu-lls-state')
                    .closest('[aria-live]') !== null,
            };
        });
        expect(shape.tag, 'a real button, so Enter and Space work').toBe('BUTTON');
        expect(shape.inDevice, 'it sits on the device face').toBe(true);
        expect(shape.softwareClass, 'not the software button vocabulary').toBe(false);
        expect(shape.named.length, 'the button names itself').toBeGreaterThan(0);
        expect(shape.group).toBe('group');
        expect(shape.labelled, 'the group resolves its own label').toBe(true);
        expect(shape.msgLive).toBe('polite');
        expect(shape.stateLive, 'the state row must not announce itself').toBe(false);

        // Keyboard reachable and visibly focused — the shared focus ring
        // is suppressed by the site-wide outline reset, so the page-local
        // :focus-visible rule is what makes this pass.
        await btn.focus();
        await expect(btn).toBeFocused();
        const outline = await btn.evaluate((el) => getComputedStyle(el).outlineWidth);
        expect(outline, 'a focused hardware button still shows a ring')
            .not.toBe('0px');
    });

    test('a trip stops the fan under a standing command, and the graphic will not say why',
        async ({ page }) => {
            await open(page);
            await tripTheStat(page);

            // The gap that is the whole fault: the command reads ON and
            // nothing is moving. Both readouts come off the SVG, which is
            // what a technician is actually looking at.
            await expect(page.locator('#ahu-v-fan-run')).toHaveText('ON');
            await expect(page.locator('#ahu-v-fan-proof')).toHaveText('NONE');

            // ⚠ THE ROW'S POINT. Whatever the verdict says, it may not
            // name the device — the controller has no point for it.
            const verdict = (await page.locator('#ahu-verdict').textContent()) || '';
            expect(verdict.trim().length, 'the pill still says something').toBeGreaterThan(0);
            expect(verdict, 'the graphic named a device it cannot see: ' + verdict)
                .not.toMatch(CAUSE_WORDS);
            const sr = (await page.locator('#ahu-verdict-sr').textContent()) || '';
            expect(sr, 'the announced mirror leaked it instead: ' + sr)
                .not.toMatch(CAUSE_WORDS);

            // And it LATCHES: warm the weather right back up — all the
            // way back, which now takes a ramp rather than a keystroke —
            // and the machine stays down.
            await setWeather(page, 80);
            await expect(page.locator('#ahu-lls-state')).toHaveText('TRIPPED');
            await expect(page.locator('#ahu-v-fan-proof')).toHaveText('NONE');
        });

    test('the button on the device is what brings it back', async ({ page }) => {
        await open(page);
        await tripTheStat(page);
        // Clear the cause first — the field order, and the only order
        // that leaves the machine running afterwards. "Cleared" now means
        // the WEATHER is back, not the knob: reset while the outdoor air
        // is still mid-ramp and the restarted fan pulls the same cold air
        // across the coil and trips the element again, which is a fair
        // model of pushing the button before the cause is fixed.
        await setWeather(page, 80);

        await page.click('#ahu-lls-reset');
        await expect(page.locator('#ahu-lls-state')).toHaveText('NORMAL');
        // The proof has to re-make from nothing, which is the restart
        // order the page teaches: fan first, then proof, then the loads.
        await expect(page.locator('#ahu-v-fan-proof')).toHaveText('MADE', { timeout: 8000 });
    });

    test('and the press says so — the confirmation survives the repaint it triggers',
        async ({ page }) => {
            // The row above proves the RESET works; this one proves the
            // press is ANSWERED. They are separate claims because the
            // failure mode is invisible to the first: the handler's
            // `host.requestRender()` repaints SYNCHRONOUSLY, and the
            // device face's paint latch wipes the message on the
            // tripped→normal edge — so a result written before that call
            // is erased in the same task. The state row still reads
            // NORMAL, the machine still restarts, and the only casualty
            // is the line the polite live region exists to announce.
            await open(page);
            await tripTheStat(page);
            await setWeather(page, 80);

            await page.click('#ahu-lls-reset');
            await expect(page.locator('#ahu-lls-state')).toHaveText('NORMAL');
            // Wording read off the handler, not paraphrased — the device
            // speaks about its own element and contacts, never about what
            // the machine should do next.
            await expect(page.locator('#ahu-lls-msg'),
                'the successful press left no confirmation to announce')
                .toHaveText('Reset — the element is warm and the contacts are made.');
        });

    test('the software low limit sits above the hardware one, and neither fires on a settled machine',
        async ({ page }) => {
            // Two claims in one row because they are one decision (owner,
            // 2026-08-08): the sheet's LLS Trip constant is ABOVE the
            // hardwired setting, so the program acts first — and with the
            // winter sheet running normally, nothing trips at all.
            //
            // The relation is read off the two SOURCES rather than
            // asserted as a pair of numbers: the setting is field
            // practice, and a retune should move it without reddening a
            // spec that only cares which one is higher.
            const sheet = fs.readFileSync(path.join(
                __dirname, '..', 'html', 'simulators', 'ddc-workbench.html'), 'utf8');
            const unit = fs.readFileSync(path.join(
                __dirname, '..', 'html', 'scripts', 'ddcw-ahu-unit.js'), 'utf8');
            const soft = parseFloat(
                sheet.match(/id: 'llsset',[^}]*value: (-?[\d.]+)/)[1]);
            const hard = parseFloat(
                unit.match(/const LLS_STAT_TRIP\s*=\s*(-?[\d.]+)/)[1]);
            expect(Number.isFinite(soft) && Number.isFinite(hard)).toBe(true);
            expect(soft, `software limit ${soft} must sit above the hardwired ${hard}`)
                .toBeGreaterThan(hard);

            await open(page);
            await page.selectOption('#ddcw-program', 'econ-2stage-lowlimits');
            await settle(page, 2500);                 // ~8 sim-minutes at 20×
            await expect(page.locator('#ahu-lls-state')).toHaveText('NORMAL');
            await expect(page.locator('#ahu-v-fan-proof')).toHaveText('MADE');
        });
});

// ══════════════════════════════════════════════════════════════════════
// THE JUMPER — a wire across the stat's terminals.
//
// Owner ruling 2026-08-09. The field's answer to a stat that keeps
// stopping a machine somebody needs running, and the page's second
// defeat: the wiresheet already teaches the SOFTWARE one (hold LLS
// Reset true and the latch never holds). They are different defeats
// with different field signatures, and the page says so rather than
// calling either the other's equivalent.
//
// Two things the rows below defend, both of which a well-meaning edit
// would take away:
//   • THE TWO ROWS ON THE FACE REPORT DIFFERENT THINGS. Row 1 is the
//     element and goes on reading TRIPPED under a jumper, because the
//     capillary never learns about the wiring. Folding them into one
//     word would teach the opposite of the lesson.
//   • THE SCREEN STILL SAYS NOTHING. The verdict ban (CAUSE_WORDS) now
//     covers the wiring vocabulary too — see its comment.
// ══════════════════════════════════════════════════════════════════════

test.describe('AHU workbench page: the jumper across the stat', () => {

    test('it is a toggle on the device face, wearing a wire rather than a keycap',
        async ({ page }) => {
            await open(page);
            const btn = page.locator('#ahu-lls-jumper');
            await expect(btn).toBeVisible();
            await expect(btn).toBeEnabled();

            const shape = await page.evaluate(() => {
                const b = document.getElementById('ahu-lls-jumper');
                const st = document.getElementById('ahu-lls-jumper-state');
                return {
                    tag: b.tagName,
                    type: b.getAttribute('type'),
                    inDevice: !!b.closest('.device'),
                    softwareClass: b.classList.contains('copy-btn'),
                    // A toggle button, so the STATE is aria-pressed and
                    // the accessible name stays constant. A name that
                    // changed with the state would report it twice and
                    // disagree with itself half the time.
                    pressed: b.getAttribute('aria-pressed'),
                    named: (b.textContent || '').trim().length > 0,
                    // The drawn terminal strip is a PICTURE of what the
                    // word already says, so it must not be announced.
                    stripHidden: b.querySelector('.ahu-lls-terms')
                        .getAttribute('aria-hidden'),
                    // Same live-region split as row 1 (the reset row's
                    // own spec pins that half).
                    stateLive: st.closest('[aria-live]') !== null,
                    // And it is a SECOND row on the SAME face — not a
                    // second widget somewhere else on the page.
                    sameFace: st.closest('#ahu-lls')
                        === document.getElementById('ahu-lls'),
                };
            });
            expect(shape.tag, 'a real button, so Enter and Space work').toBe('BUTTON');
            expect(shape.type, 'and not a submit').toBe('button');
            expect(shape.inDevice, 'it sits on the device face').toBe(true);
            expect(shape.softwareClass, 'not the software button vocabulary').toBe(false);
            expect(shape.pressed, 'a toggle reports its state in aria-pressed').toBe('false');
            expect(shape.named, 'the button names itself').toBe(true);
            expect(shape.stripHidden, 'the drawn wire is decorative').toBe('true');
            expect(shape.stateLive, 'the state row must not announce itself').toBe(false);
            expect(shape.sameFace).toBe(true);

            // The aria-pressed cycle, driven through the real control.
            await btn.click();
            await expect(btn).toHaveAttribute('aria-pressed', 'true');
            await expect(page.locator('#ahu-lls-jumper-state')).toHaveText('JUMPERED');
            await expect(page.locator('#ahu-lls')).toHaveClass(/is-defeated/);
            await btn.click();
            await expect(btn).toHaveAttribute('aria-pressed', 'false');
            await expect(page.locator('#ahu-lls-jumper-state')).toHaveText('NO JUMPER');
            await expect(page.locator('#ahu-lls')).not.toHaveClass(/is-defeated/);

            // Keyboard reachable and visibly focused — the site-wide
            // outline reset means the page-local :focus-visible rule is
            // what makes this pass, exactly as for the Reset button.
            await btn.focus();
            await expect(btn).toBeFocused();
            const outline = await btn.evaluate((el) => getComputedStyle(el).outlineWidth);
            expect(outline, 'a focused hardware toggle still shows a ring')
                .not.toBe('0px');
        });

    test('a jumpered machine runs straight through a trip, and the face says both',
        async ({ page }) => {
            // THE ROW THE FEATURE EXISTS FOR. The element latches, the
            // fan never stops, and the two rows on the face disagree
            // because they are about two different things.
            await open(page);
            await page.click('#ahu-lls-jumper');
            await tripTheStat(page);

            const snap = await page.evaluate(() => ({
                stat: document.getElementById('ahu-lls-state').textContent.trim(),
                jumper: document.getElementById('ahu-lls-jumper-state').textContent.trim(),
                fanRun: document.getElementById('ahu-v-fan-run').textContent.trim(),
                proof: document.getElementById('ahu-v-fan-proof').textContent.trim(),
                verdict: document.getElementById('ahu-verdict').textContent.trim(),
                sr: document.getElementById('ahu-verdict-sr').textContent.trim(),
            }));
            expect(snap.stat, 'the element latched').toBe('TRIPPED');
            expect(snap.jumper).toBe('JUMPERED');
            expect(snap.fanRun, 'and the fan never stopped').toBe('ON');
            expect(snap.proof, 'the air really is still moving').toBe('MADE');

            // ⚠ Same ban as the trip row above, now with the wiring
            // words in it. A screen that cannot see the stat cannot see
            // a wire across it either.
            expect(snap.verdict.length).toBeGreaterThan(0);
            expect(snap.verdict, 'the graphic named the wiring: ' + snap.verdict)
                .not.toMatch(CAUSE_WORDS);
            expect(snap.sr, 'the announced mirror leaked it instead: ' + snap.sr)
                .not.toMatch(CAUSE_WORDS);
        });

    test('pulling the jumper under cold air drops the machine on the spot',
        async ({ page }) => {
            // The field signature the page exists to show: a unit that
            // dies the second the wire comes off was never fixed.
            await open(page);
            await page.click('#ahu-lls-jumper');
            await tripTheStat(page);
            await expect(page.locator('#ahu-v-fan-proof')).toHaveText('MADE');

            await page.click('#ahu-lls-jumper');
            await expect(page.locator('#ahu-v-fan-proof')).toHaveText('NONE');
            await expect(page.locator('#ahu-lls-state')).toHaveText('TRIPPED');
            await expect(page.locator('#ahu-v-fan-run'),
                'and nobody withdrew the command').toHaveText('ON');
            // The press is ANSWERED, and the wording survives the
            // synchronous repaint it triggers — the same ordering trap
            // the reset handler documents, on all four of these lines.
            await expect(page.locator('#ahu-lls-msg')).toHaveText(
                'Jumper removed. The element had tripped while it was wired around '
                + '— the fan just dropped.');
        });

    test('the reset still refuses a cold element with a jumper in, and takes when it clears',
        async ({ page }) => {
            // The button is about the ELEMENT; the jumper is about the
            // WIRING. So the reset flow is unchanged in both directions
            // — and the jumper is still there afterwards.
            await open(page);
            await page.click('#ahu-lls-jumper');
            await tripTheStat(page);

            await page.click('#ahu-lls-reset');
            await expect(page.locator('#ahu-lls-msg')).toContainText(
                'still below its setting');
            await expect(page.locator('#ahu-lls-state')).toHaveText('TRIPPED');

            // Clear the cause, then push the button — the field order.
            await setWeather(page, 80);
            await page.click('#ahu-lls-reset');
            await expect(page.locator('#ahu-lls-state')).toHaveText('NORMAL');
            await expect(page.locator('#ahu-lls-jumper-state'),
                'a reset does not pull a jumper').toHaveText('JUMPERED');
        });

    test('the jumper survives a scenario preset and a program switch', async ({ page }) => {
        // Owner ruling 2026-08-09: nothing an operator does at a screen
        // takes a wire off a terminal — the same reasoning that keeps a
        // preset from clearing the latch and a program switch from
        // clearing the priority arrays. Driven through both surfaces
        // that plausibly would have reset it.
        await open(page);
        await page.click('#ahu-lls-jumper');
        await expect(page.locator('#ahu-lls-jumper-state')).toHaveText('JUMPERED');

        await page.click('[data-preset="heating"]');
        await expect(page.locator('#ahu-lls-jumper-state')).toHaveText('JUMPERED');
        await page.click('[data-preset="cooling"]');
        await expect(page.locator('#ahu-lls-jumper-state')).toHaveText('JUMPERED');

        await page.selectOption('#ddcw-program', 'econ-2stage-lowlimits');
        await settle(page, 800);
        await expect(page.locator('#ahu-lls-jumper-state')).toHaveText('JUMPERED');
        await expect(page.locator('#ahu-lls-jumper')).toHaveAttribute('aria-pressed', 'true');
    });

    test('you cannot jumper past the program — the software limit still stops the fan',
        async ({ page }) => {
            // THE PAYOFF OF THE 3 °F SPREAD, and the honest limit of the
            // jumper. The wire is across the HARDWARE element's
            // contacts; the winter sheet's low limit lives in the
            // controller and acts through the fan-enable BO, which no
            // amount of wire at the unit reaches.
            //
            // The damper goes to slot 8 so raw outdoor air keeps coming
            // — otherwise the sheet's own MAT clamp holds the mixing box
            // near 50 °F and nothing ever gets cold enough to prove
            // anything. Everything else stays on the program, which is
            // the whole point of the row.
            await open(page);
            await page.click('#ahu-lls-jumper');
            await page.selectOption('#ddcw-program', 'econ-2stage-lowlimits');
            await settle(page, 500);
            await page.locator('#ahu-null-oad').uncheck();
            await page.locator('#ahu-oad-slider').fill('100');
            await page.locator('#ahu-oad-slider').dispatchEvent('input');

            await page.fill('#ahu-oa-slider', '-20');
            await page.dispatchEvent('#ahu-oa-slider', 'input');

            // The BO the program resolved, not the airflow: this fan is
            // stopped by the sequence, not by a starter contact.
            await expect(page.locator('#ahu-v-fan-run'),
                'the software low limit never fired').toHaveText('OFF', { timeout: 30000 });
            await expect(page.locator('#ahu-lls-jumper-state')).toHaveText('JUMPERED');
            // And the hardware element is still made — the software
            // limit sits ABOVE it, so on a ramp down it gets there
            // first and the discharge goes blind behind a stopped fan.
            await expect(page.locator('#ahu-lls-state')).toHaveText('NORMAL');
        });

    test('the damage-stakes scope note reaches BOTH tabs, and neither cockpit',
        async ({ page }) => {
            // The page joined the damage-stakes convention (CLAUDE.md)
            // when the stat gained a jumper, and on a tabbed tool that
            // note goes in a .tool-body-row SIBLING of the panes. The
            // placement is the whole claim: the Wiresheet is where a
            // reader learns to wire a reset input down and the Unit tab
            // is where they learn to wire around the contacts, so a note
            // inside either pane is absent from half the material it is
            // about. It was a plain .ref-note inside #tab-unit until
            // 2026-08-09; this row is what stops it drifting back.
            await open(page);
            const row = page.locator('.tool-body-row');
            await expect(row).toHaveCount(1);
            expect(await page.evaluate(() => !!document.querySelector(
                '.tool-body-row').closest('.tab-pane')),
            'the note is back inside a pane').toBe(false);
            await expect(row).toBeVisible();

            await page.click('button[data-tab="wiresheet"]');
            await expect(row, 'the wiresheet tab lost the scope note').toBeVisible();

            // Fullscreen is the instrument view, and reading prose drops
            // out of it. The ROW has to go, not just the paragraph —
            // .tool-body-row carries its own padding, border and fill.
            await page.click('button[data-tab="unit"]');
            await page.locator('.tool-card-fullscreen-btn').click();
            await expect(page.locator('.tool-card')).toHaveClass(/is-fullscreen/);
            await expect(row).toBeHidden();
        });
});

// ══════════════════════════════════════════════════════════════════════
// THE COLD HAS TO BE SUSTAINED — the OA knob writes a target, not the
// weather.
//
// Owner ruling, 2026-08-09: "I don't like the idea of a quick OAT
// slider drag causing a trip, it needs to be sustained… I'm fine with
// one drag doing it, but I don't want someone to trip it just testing
// the slider itself." Before it, the knob teleported: whatever value
// you released on WAS the weather, permanently, so a reader poking the
// slider to see what it did got a latched safety and a dead machine
// (measured, instant knob, arrival plant at the default 20× clock:
// released at −20 it tripped in 1.2 wall-seconds, and every release
// depth at or below 45 °F tripped eventually).
//
// The two rows below are the ruling's two halves and they only mean
// something together — either one alone is satisfiable by a machine
// that has stopped modelling a freeze at all.
// ══════════════════════════════════════════════════════════════════════

test.describe('AHU workbench page: sustained cold trips, a test drag does not', () => {

    test('a quick drag to the floor and back leaves the machine running', async ({ page }) => {
        // THE RULING'S ROW. Same staging as tripTheStat — free cooling,
        // damper wide at slot 8, the arrival stage still where the preset
        // left it — so the ONLY difference from a trip is that the knob
        // comes back. Roughly a second at the floor: measured, the first
        // hold that still trips at this clock is 3.0 wall-seconds from a
        // 55 °F start, so a second is comfortably inside the safe side
        // without being a fixed-timing assertion.
        await open(page);
        await page.click('[data-preset="freecool"]');
        await page.fill('#ahu-oa-slider', '-20');
        await page.dispatchEvent('#ahu-oa-slider', 'input');
        await settle(page, 1000);
        await page.fill('#ahu-oa-slider', '55');
        await page.dispatchEvent('#ahu-oa-slider', 'input');

        // Let the weather finish coming back, then watch a while longer —
        // a latch that arrived late would still be a latch.
        await setWeather(page, 55);
        await settle(page, 1500);

        await expect(page.locator('#ahu-lls-state'),
            'a slider test tripped the hardwired stat').toHaveText('NORMAL');
        // And the machine is genuinely still running, not merely
        // un-latched: the fan is turning and the proof switch is made.
        await expect(page.locator('#ahu-v-fan-proof')).toHaveText('MADE');
    });

    test('the same drag LEFT at the floor trips it — sustained is the difference',
        async ({ page }) => {
            // The other half. `tripTheStat` IS this drag; the only thing
            // it does differently from the row above is not come back.
            await open(page);
            await tripTheStat(page);
            await expect(page.locator('#ahu-lls-state')).toHaveText('TRIPPED');
        });

    test('a scenario preset SNAPS the weather — staging a machine is not testing a slider',
        async ({ page }) => {
            // Presets write the truth AND the target, so their weather
            // lands at once. The exemption is deliberate: the ramp exists
            // to keep a slider TEST from delivering cold air, and clicking
            // "Heating" is a request to be on a 20 °F morning, not a poke
            // at a control. A preset that ramped would arrive a sim-minute
            // after the button, which is a worse lie than instant weather.
            //
            // Asserted on the OAT CHIP, which paints the plant's own
            // outdoor air — the slider's own readout would pass this row
            // even if nothing had snapped, since it shows the knob.
            await open(page);
            await expect(page.locator('#ahu-r-oat')).toHaveText('80.0 °F');
            await page.click('[data-preset="heating"]');
            await expect(page.locator('#ahu-r-oat'),
                'the preset left the weather to ramp').toHaveText('20.0 °F');
        });
});

test.describe('AHU workbench page: the phone truth stays out of the desktop pane', () => {
    test('at a pointer desktop width the note is gone and the workspace is live', async ({ page }) => {
        // The note and the workspace are gated by the same media OR, so
        // they can never show together — this is the desktop half of that
        // claim (the config's default context is 1280 wide, hover-capable).
        await open(page);
        await page.click('button[data-tab="wiresheet"]');
        await expect(page.locator('p.ddcw-sheet-mobile-note')).toBeHidden();
        await expect(page.locator('.fbe-live')).toBeVisible();
        await expect(page.locator('.desktop-only-sim')).toBeHidden();
    });
});
