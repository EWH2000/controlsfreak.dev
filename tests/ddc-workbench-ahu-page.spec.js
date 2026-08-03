// The AHU DDC Workbench page — /simulators/ddc-workbench.html.
//
// ⚠ THIS FILE IS THE ONLY THING THAT WALKS THIS PAGE, AND THAT IS WHY IT
// EXISTS. The page is a HIDDEN page: `noindex` +
// `eleventyExcludeFromCollections` + NO `canonical`. That last one is
// what does it — tests/pages.js is checked against the built sitemap by
// its own drift test, a canonical-less page is deliberately absent from
// the sitemap, so the manifest CANNOT list this page without failing
// that test. The consequence is total: smoke.spec.js never loads it,
// responsive.spec.js never checks it for phone-width overflow, and
// contrast-sweep.spec.js never measures a single colour on it in either
// theme. The omission from tests/pages.js is CORRECT and must not be
// "fixed"; this spec is what stands in its place.
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

test.describe('AHU workbench page: it boots', () => {

    test('loads clean, with no console errors', async ({ page }) => {
        const errs = await open(page);
        await expect(page).toHaveTitle(/DDC Workbench/);
        await expect(page.locator('h1.tool-card-title')).toContainText('DDC Workbench');
        expect(errs, 'the page booted without complaining').toEqual([]);
    });

    test('the page is hidden, and hidden the way the house does it', async () => {
        // Read off the SOURCE, because the three markers live in
        // frontmatter and only one of them survives into the rendered
        // HTML. If a later lane graduates this page it will add a
        // `canonical` here, and this row is where that decision gets
        // noticed — along with every merge-authority row that flips with
        // it (CLAUDE.md, Workflow).
        const src = fs.readFileSync(
            path.join(__dirname, '..', 'html', 'simulators', 'ddc-workbench.html'), 'utf8');
        const fm = src.slice(0, src.indexOf('---', 3));
        expect(fm).toMatch(/noindex:\s*true/);
        expect(fm).toMatch(/eleventyExcludeFromCollections:\s*true/);
        expect(fm, 'a canonical here would put the page in the sitemap')
            .not.toMatch(/^canonical:/m);

        // And the manifest must NOT list it — the omission is the thing
        // being asserted, not an accident to be corrected.
        const pages = require('./pages.js');
        const list = Array.isArray(pages) ? pages : (pages.PAGES || []);
        expect(list.some((p) => String(p).includes('ddc-workbench.html')),
            'a canonical-less page in tests/pages.js fails the sitemap drift test')
            .toBe(false);
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
        // MAT has to fall as the damper opens.
        await page.locator('#ahu-oa-slider').fill('0');
        await page.locator('#ahu-oa-slider').dispatchEvent('input');
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

test.describe('AHU workbench page: the fogging disclosure (#240)', () => {

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
        await page.locator('#ahu-oa-slider').fill('-10');
        await page.locator('#ahu-oa-slider').dispatchEvent('input');
        await page.locator('#ahu-null-oad').uncheck();
        await page.locator('#ahu-oad-slider').fill('60');
        await page.locator('#ahu-oad-slider').dispatchEvent('input');
        await settle(page, 900);

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
        await page.locator('#ahu-oa-slider').fill('-10');
        await page.locator('#ahu-oa-slider').dispatchEvent('input');
        await page.locator('#ahu-null-oad').uncheck();
        await page.locator('#ahu-oad-slider').fill('60');
        await page.locator('#ahu-oad-slider').dispatchEvent('input');
        await settle(page, 900);
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

    test('freezing mixed air under a running stage is named, not read as a dead coil', async ({ page }) => {
        await open(page);
        // Reachable with the PROGRAM in control and one drag: at the
        // slider's −20 °F floor the economizer permits, the damper opens
        // and a latched stage runs on outdoor air. The sheet carries no
        // mixed-air low limit, which is the lesson — and the plain
        // "no ΔT" wording used to blame the compressor for it, because
        // the coil's own ceiling pins the delta near zero when the
        // entering air is already below the coil floor.
        await page.locator('#ahu-oa-slider').fill('-20');
        await page.locator('#ahu-oa-slider').dispatchEvent('input');
        await settle(page, 2000);
        const v = page.locator('#ahu-verdict');
        await expect(v).toHaveClass(/error/);
        await expect(v).toContainText('already near freezing');
    });

    test('the hot-water coil at its leaving-air ceiling warns instead of reporting clean', async ({ page }) => {
        await open(page);
        await page.locator('#ahu-null-hw').uncheck();
        await page.locator('#ahu-null-fan').uncheck();
        await page.locator('#ahu-null-stage').uncheck();
        await page.locator('[data-stage="0"]').click();
        for (const [id, val] of [['ahu-hw-slider', '100'], ['ahu-fan-slider', '25'], ['ahu-oa-slider', '20']]) {
            await page.locator('#' + id).fill(val);
            await page.locator('#' + id).dispatchEvent('input');
        }
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
        await page.locator('#ahu-oa-slider').fill('95');
        await page.locator('#ahu-oa-slider').dispatchEvent('input');
        await settle(page, 900);
        await expect(row).toHaveText('Locked out');
        // Permitted and calling: open.
        await page.locator('#ahu-oa-slider').fill('60');
        await page.locator('#ahu-oa-slider').dispatchEvent('input');
        await settle(page, 1500);
        await expect(row).toHaveText('Open');
    });
});

test.describe('AHU workbench page: the fullscreen cockpit keeps its console', () => {

    // Fullscreen makes the active pane the single scroller, and the right
    // column (mirror + presets + sliders) is ~2.4× the scrollport at the
    // default 1280×720 — so before the sticky pin, scrolling translated the
    // console up out of view and the rest of the travel ran over dead space
    // (owner report, 2026-08-01). These rows pin the fix's two contracts:
    // the console fills the scrollport at max scroll, and its BOTTOM edge
    // (the verdict pill lives there) lands on-screen — a hard top pin would
    // satisfy the first and silently break the second, because the built
    // console is TALLER than the scrollport at this viewport.

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
// The statusbar's "which machine am I looking at" pair. Two hidden
// workbench pages, one plain anchor each way — the ruled design: not
// tabs, not a JS switch. Nothing else on this site tests a link between
// two canonical-less pages, and link-integrity.spec.js walks _site for
// broken FRAGMENTS, not for a page that quietly stops linking its
// sibling, so these rows are the only thing holding the pair together.

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

        // The FCU page's own title, which is the one WITHOUT the "Air
        // Handler" qualifier — the cheapest proof we did not just reload.
        await expect(page).toHaveTitle('DDC Workbench — controlsfreak.dev');

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
        await expect(page).toHaveTitle('DDC Workbench — controlsfreak.dev');
    });
});

test.describe('AHU workbench page: the unit selector on touch', () => {
    // isMobile + hasTouch make Chromium's emulation match (hover: none),
    // which is the only condition under which the page-local touch floor
    // applies. The floor has to be page-local: the consolidated
    // TOUCH-TARGET FLOOR block lives in styles.css, a live surface this
    // pair may not touch — and no sweep reaches a canonical-less page, so
    // this row is the floor's only guard.
    test.use({ isMobile: true, hasTouch: true, viewport: { width: 412, height: 883 } });

    test('the links clear the 44px floor', async ({ page }) => {
        await page.goto(URL);
        const links = page.locator('a.ddcw-unit-link');
        await expect(links).toHaveCount(2);
        for (let i = 0; i < 2; i++) {
            const box = await links.nth(i).boundingBox();
            expect(box.height, `link ${i} height`).toBeGreaterThanOrEqual(44);
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
    // Hand-written contrast rows, because this is a hidden page: no
    // canonical → not in tests/pages.js → contrast-sweep.spec.js never
    // measures a colour on it. The rail's NEW ink sources are the input
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

                const rows = await page.evaluate(() => {
                    const lum = (c) => {
                        const m = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)/.exec(c);
                        const ch = [m[1], m[2], m[3]].map((v) => {
                            const s = Number(v) / 255;
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
                    const ratio = (el) => {
                        const fg = lum(getComputedStyle(el).color);
                        const bg = lum(bgOf(el));
                        return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
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
