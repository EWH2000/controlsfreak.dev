// DDC Workbench session persistence — codebase-issues #275.
//
// The workbench held its whole simulation in one closure, and the arc's
// own way to move around the sim — click the DX coil, walk into the
// refrigerant loop — is a NAVIGATION, so every one of those clicks threw
// the reader's work away. /scripts/ddcw-session.js + the shell's restore
// answer that. This file is the behavioural proof.
//
// POLICY — ROUND TRIPS, NOT UNIT-TEST STUBS. Every restore row here
// leaves the page through a control a reader can actually click (an SVG
// drill-down, its HTML twin, the unit selector) and comes back the way a
// reader comes back. A spec that called saveNow() and reload() directly
// would pass while the real departure path was broken, which is exactly
// the failure #275 describes: the navigation model IS the feature.
//
// Two things this file deliberately does NOT do:
//   • It pins no temperature, capacity or time constant. The workbench's
//     TUNE BY FEEL constants are owner-tunable; every row below asserts
//     that a value SURVIVED, that a direction held, or that a control
//     reads what the plant says — never what the number is.
//   • It asserts nothing about the browser's back/forward cache. #275's
//     own measurement note covers why: Playwright launches Chromium with
//     --disable-back-forward-cache, a bfcache hit is a heuristic subject
//     to eviction, and it covers exactly one of the several return paths.
//     Every row here is a FRESH LOAD, which is the case that has to work.

'use strict';

const fs   = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const AHU = '/simulators/ddc-workbench.html';
const FCU = '/simulators/ddc-workbench-fcu.html';

// Load with the console/pageerror watcher armed from before navigation —
// the shell's boot paint is synchronous inside the page's inline IIFE, so
// a boot-time throw would otherwise race past us. Returns the error sink,
// which several rows assert is empty at the end.
function watch(page) {
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    return errs;
}

async function open(page, url) {
    const errs = watch(page);
    await page.goto(url);
    await page.waitForTimeout(400);
    return errs;
}

// The statusbar chip strip is the one surface both units share and both
// tabs show, so every "did this value survive" assertion reads through it.
// Captions are the roster's short names ('Fan En', 'OAT', …).
function chip(page, cap) {
    return page.locator('.ddcw-chip', { hasText: cap }).locator('.ddcw-chip-val').first();
}

// A compact picture of everything a restore is supposed to carry, read
// off surfaces rather than internals: the off-program window (the
// priority arrays), the picker (the running sheet), the environment
// readouts, the forced-sensor box, and the clock.
async function snapshotSurfaces(page, prefix) {
    return page.evaluate((p) => ({
        offprog: document.getElementById('ddcw-offprog-list').textContent.replace(/\s+/g, ' ').trim(),
        program: document.getElementById('ddcw-program').value,
        oaReadout: document.getElementById(p + '-oa-val').textContent.trim(),
        loadReadout: document.getElementById(p + '-load-val').textContent.trim(),
        speedReadout: document.getElementById(p + '-speed-val').textContent.trim(),
        oaSlider: document.getElementById(p + '-oa-slider').value,
        loadSlider: document.getElementById(p + '-load-slider').value,
        speedSlider: document.getElementById(p + '-speed-slider').value,
        forcing: document.getElementById(p + '-ovr-toggle').textContent.trim(),
        forcedValue: document.getElementById(p + '-ovr-input').value,
    }), prefix);
}

// Stage a situation on the AHU that touches every category #275
// enumerates: a hand command in slot 8 (the preset writes five), a forced
// sensor, a non-default sheet, and both environment knobs.
async function stageAhu(page) {
    await page.click('[data-preset="belt"]');
    await page.selectOption('#ahu-ovr-select', 'dat');
    await page.click('#ahu-ovr-toggle');
    await page.fill('#ahu-ovr-input', '44.0');
    await page.selectOption('#ddcw-program', 'econ-2stage-lowlimits');
    await page.locator('#ahu-load-slider').evaluate((el) => {
        el.value = '14000';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('#ahu-speed-slider').evaluate((el) => {
        el.value = '5';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(500);
}

async function stageFcu(page) {
    await page.click('[data-preset="lowcharge"]');
    await page.click('#fcu-ovr-toggle');
    await page.fill('#fcu-ovr-input', '81.0');
    await page.selectOption('#ddcw-program', 'cool-2stage-safeties');
    await page.locator('#fcu-oa-slider').evaluate((el) => {
        el.value = '96';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('#fcu-speed-slider').evaluate((el) => {
        el.value = '5';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(500);
}

// Seed sessionStorage BEFORE any page script runs. addInitScript is the
// only hook early enough — the shell reads the key inside the page's
// end-of-body IIFE, so a post-load page.evaluate() would be too late.
function seedStorage(page, unitId, rawValue) {
    return page.addInitScript(([k, v]) => {
        try { sessionStorage.setItem(k, v); } catch (e) { /* nothing to seed */ }
    }, ['cf_ddcw_' + unitId, rawValue]);
}

test.describe('workbench session: the round trip a reader actually takes', () => {
    test('AHU state survives leaving through an in-graphic drill-down and coming back', async ({ page }) => {
        const errs = await open(page, AHU);
        await stageAhu(page);
        const before = await snapshotSurfaces(page, 'ahu');
        expect(before.offprog.length, 'the preset put points off program').toBeGreaterThan(0);
        expect(before.program).toBe('econ-2stage-lowlimits');
        expect(before.forcing, 'the DAT sensor is forced').toBe('Release');

        // The drill-down the arc chose: a real <a> inside the drawing.
        await page.click('.ahu-svg a[href="/simulators/refrigerant-loop.html"]');
        await page.waitForURL(/refrigerant-loop/);
        await page.goBack();
        await page.waitForTimeout(700);

        const after = await snapshotSurfaces(page, 'ahu');
        expect(after.offprog, 'the priority arrays came back').toBe(before.offprog);
        expect(after.program, 'the loaded sheet came back').toBe(before.program);
        expect(after.forcing, 'the forced sensor came back forced').toBe('Release');
        expect(after.forcedValue, 'with the value the reader typed').toBe(before.forcedValue);
        expect(after.oaSlider, 'the OA knob handle came back').toBe(before.oaSlider);
        expect(after.loadSlider, 'the load knob handle came back').toBe(before.loadSlider);
        expect(after.speedSlider, 'the sim clock came back').toBe(before.speedSlider);
        expect(after.oaReadout).toBe(before.oaReadout);
        expect(after.loadReadout).toBe(before.loadReadout);
        expect(after.speedReadout).toBe(before.speedReadout);

        await expect(page.locator('#ddcw-resumed')).toBeVisible();
        expect(errs, 'no console noise across the round trip').toEqual([]);
    });

    test('the same holds through the HTML twin outside the drawing', async ({ page }) => {
        // Every SVG drill-down carries an HTML twin (the WCAG 2.5.5/2.5.8
        // equivalent-control pass ddc-workbench-ahu-page.spec.js pins).
        // Both detonate the same state, so both have to restore it.
        const errs = await open(page, AHU);
        await stageAhu(page);
        const before = await snapshotSurfaces(page, 'ahu');

        const twin = page.locator('.ahu-teach-p a[href="/simulators/vfd-mock.html"]');
        await expect(twin, 'the HTML twin is where the drill-down spec says').toHaveCount(1);
        await twin.click();
        await page.waitForURL(/vfd-mock/);
        // Return by URL rather than history — the shared-link / typed-URL
        // path, which #275 lists beside Back as a way readers come back.
        await page.goto(AHU);
        await page.waitForTimeout(700);

        const after = await snapshotSurfaces(page, 'ahu');
        expect(after.offprog).toBe(before.offprog);
        expect(after.program).toBe(before.program);
        expect(after.forcedValue).toBe(before.forcedValue);
        await expect(page.locator('#ddcw-resumed')).toBeVisible();
        expect(errs).toEqual([]);
    });
});

test.describe('workbench session: the unit selector is lossless both ways', () => {
    test('AHU → FCU → AHU keeps both machines', async ({ page }) => {
        const errs = await open(page, AHU);
        await stageAhu(page);
        const ahuBefore = await snapshotSurfaces(page, 'ahu');

        await page.click('.ddcw-unit-sel a[href="' + FCU + '"]');
        await page.waitForURL(/ddc-workbench-fcu/);
        await page.waitForTimeout(500);
        // The FCU has never been visited in this tab — its own key does
        // not exist, so it must boot PRISTINE beside a restored AHU key.
        await expect(page.locator('#ddcw-resumed'), 'the FCU boots fresh').toBeHidden();
        await stageFcu(page);
        const fcuBefore = await snapshotSurfaces(page, 'fcu');

        await page.click('.ddcw-unit-sel a[href="' + AHU + '"]');
        await page.waitForURL(/ddc-workbench\.html/);
        await page.waitForTimeout(700);
        const ahuAfter = await snapshotSurfaces(page, 'ahu');
        expect(ahuAfter.offprog).toBe(ahuBefore.offprog);
        expect(ahuAfter.program).toBe(ahuBefore.program);
        expect(ahuAfter.forcedValue).toBe(ahuBefore.forcedValue);
        expect(ahuAfter.oaSlider).toBe(ahuBefore.oaSlider);
        await expect(page.locator('#ddcw-resumed')).toBeVisible();

        // …and the FCU is still there behind its own key.
        await page.click('.ddcw-unit-sel a[href="' + FCU + '"]');
        await page.waitForURL(/ddc-workbench-fcu/);
        await page.waitForTimeout(700);
        const fcuAfter = await snapshotSurfaces(page, 'fcu');
        expect(fcuAfter.offprog).toBe(fcuBefore.offprog);
        expect(fcuAfter.program).toBe(fcuBefore.program);
        expect(fcuAfter.forcedValue).toBe(fcuBefore.forcedValue);
        expect(fcuAfter.oaSlider).toBe(fcuBefore.oaSlider);
        await expect(page.locator('#ddcw-resumed')).toBeVisible();
        expect(errs).toEqual([]);
    });

    test('FCU → AHU → FCU keeps both machines', async ({ page }) => {
        const errs = await open(page, FCU);
        await stageFcu(page);
        const fcuBefore = await snapshotSurfaces(page, 'fcu');

        await page.click('.ddcw-unit-sel a[href="' + AHU + '"]');
        await page.waitForURL(/ddc-workbench\.html/);
        await page.waitForTimeout(500);
        await expect(page.locator('#ddcw-resumed'), 'the AHU boots fresh').toBeHidden();
        await stageAhu(page);
        const ahuBefore = await snapshotSurfaces(page, 'ahu');

        await page.click('.ddcw-unit-sel a[href="' + FCU + '"]');
        await page.waitForURL(/ddc-workbench-fcu/);
        await page.waitForTimeout(700);
        const fcuAfter = await snapshotSurfaces(page, 'fcu');
        expect(fcuAfter.offprog).toBe(fcuBefore.offprog);
        expect(fcuAfter.program).toBe(fcuBefore.program);
        expect(fcuAfter.forcedValue).toBe(fcuBefore.forcedValue);

        await page.click('.ddcw-unit-sel a[href="' + AHU + '"]');
        await page.waitForURL(/ddc-workbench\.html/);
        await page.waitForTimeout(700);
        const ahuAfter = await snapshotSurfaces(page, 'ahu');
        expect(ahuAfter.offprog).toBe(ahuBefore.offprog);
        expect(ahuAfter.program).toBe(ahuBefore.program);
        expect(errs).toEqual([]);
    });
});

test.describe('workbench session: the way out', () => {
    test('Start fresh drops the snapshot and reloads pristine', async ({ page }) => {
        const errs = await open(page, AHU);
        const pristine = await snapshotSurfaces(page, 'ahu');
        await stageAhu(page);

        await page.click('.ahu-svg a[href="/simulators/refrigerant-loop.html"]');
        await page.waitForURL(/refrigerant-loop/);
        await page.goBack();
        await page.waitForTimeout(700);
        await expect(page.locator('#ddcw-resumed')).toBeVisible();

        await page.click('#ddcw-resumed-fresh');
        await page.waitForTimeout(900);

        // The reload must land on a pristine boot AND leave nothing behind
        // — the suppression flag is what stops the reload's own pagehide
        // from writing back the snapshot that was just removed.
        await expect(page.locator('#ddcw-resumed'), 'no notice on the fresh boot').toBeHidden();
        const after = await snapshotSurfaces(page, 'ahu');
        expect(after.offprog, 'the off-program window is empty again').toBe('');
        expect(after.program, 'the default sheet is back').toBe(pristine.program);
        expect(after.oaSlider).toBe(pristine.oaSlider);
        expect(after.loadSlider).toBe(pristine.loadSlider);
        expect(after.speedSlider).toBe(pristine.speedSlider);
        expect(after.forcing, 'no sensor is forced').toBe(pristine.forcing);
        const key = await page.evaluate(() => sessionStorage.getItem('cf_ddcw_ahu'));
        expect(key, 'the snapshot did not resurrect itself on the reload').toBeNull();
        expect(errs).toEqual([]);
    });
});

test.describe('workbench session: every bad snapshot is a silent pristine boot', () => {
    // The shared assertion for all three: the page comes up working, the
    // notice stays hidden, and NOTHING is written to the console. That
    // last clause is not politeness — smoke.spec.js fails the whole suite
    // on a console error, and every path below is one a real visitor can
    // reach with a full quota, a private-mode window, or a deploy that
    // moved the model under an open tab.
    async function expectPristineBoot(page, errs) {
        await expect(page.locator('#ddcw-resumed')).toBeHidden();
        await expect(page.locator('.ddcw-chip')).not.toHaveCount(0);
        await expect(chip(page, 'Fan En')).toHaveText(/ON|OFF/);
        expect(await page.locator('#ddcw-offprog-list').textContent()).toBe('');
        expect(errs, 'a bad snapshot must not reach the console').toEqual([]);
    }

    test('a corrupted value boots clean and is dropped', async ({ page }) => {
        await seedStorage(page, 'ahu', '{"v":1,"unit":"ahu",NOT JSON');
        const errs = await open(page, AHU);
        await expectPristineBoot(page, errs);
        const key = await page.evaluate(() => sessionStorage.getItem('cf_ddcw_ahu'));
        expect(key, 'an unparseable key is dead and gets dropped').toBeNull();
    });

    test('a cross-version envelope boots clean and is dropped', async ({ page }) => {
        // Structurally perfect, wrong `v`. This is the deploy case: an
        // envelope written by a previous shape of the code.
        await seedStorage(page, 'ahu', JSON.stringify({
            v: 0, unit: 'ahu', fp: 'whatever', simSpeed: 20,
            programKey: 'econ-2stage', graph: { blocks: [], wires: [] },
            cmd: {}, plant: { zoneT: 99 },
        }));
        const errs = await open(page, AHU);
        await expectPristineBoot(page, errs);
        expect(await page.evaluate(() => sessionStorage.getItem('cf_ddcw_ahu'))).toBeNull();
    });

    test('a stale fingerprint boots clean and is dropped', async ({ page }) => {
        // Right version, wrong SHAPE — the case the fingerprint exists
        // for. `plant.zoneT: 99` would be visible if this half-restored,
        // which is what makes the row a real test and not a tautology.
        await seedStorage(page, 'ahu', JSON.stringify({
            v: 1, unit: 'ahu', fp: 'v1.ahu.stale.stale.stale', simSpeed: 20,
            programKey: 'econ-2stage', graph: { blocks: [], wires: [] },
            cmd: {}, plant: { zoneT: 99 },
        }));
        const errs = await open(page, AHU);
        await expectPristineBoot(page, errs);
        expect(await page.evaluate(() => sessionStorage.getItem('cf_ddcw_ahu'))).toBeNull();
        // The stale plant did not land: the zone chip reads the model's
        // own arrival value, not 99.
        await expect(chip(page, 'Zone Temp')).not.toHaveText(/99/);
    });

    test('a page with no storage at all boots clean, and leaving does not throw', async ({ page }) => {
        // Private modes and locked-down enterprise profiles make the
        // ACCESSOR throw, not just the write — which is why every one of
        // read / write / clear owns its own try, rather than sharing one
        // around a "storage is available" probe taken at boot.
        await page.addInitScript(() => {
            Object.defineProperty(window, 'sessionStorage', {
                configurable: true,
                get() { throw new Error('storage denied'); },
            });
        });
        const errs = await open(page, AHU);
        await expectPristineBoot(page, errs);
        // The departure path is the other half: saveNow() runs on the way
        // out and must swallow the same throw.
        await page.click('.ahu-svg a[href="/simulators/refrigerant-loop.html"]');
        await page.waitForURL(/refrigerant-loop/);
        await page.goBack();
        await page.waitForTimeout(700);
        await expectPristineBoot(page, errs);
    });
});

test.describe('workbench session: the notice', () => {
    test('the polite region is written exactly once, after the box is unhidden', async ({ page }) => {
        // The observer is installed in an init script, before any page
        // script runs, because the shell writes the region on a
        // setTimeout(0) that can beat a DOMContentLoaded-installed one.
        // It watches the whole document for childList records and keeps
        // only the ones whose target IS the polite region — the region's
        // own insertion by the parser is a record on its PARENT, so it
        // does not count, and a second write would.
        await page.addInitScript(() => {
            window.__srWrites = 0;
            new MutationObserver((records) => {
                for (const r of records) {
                    if (r.target && r.target.id === 'ddcw-resumed-sr') window.__srWrites++;
                }
            }).observe(document, { childList: true, subtree: true });
        });
        const errs = await open(page, AHU);
        expect(await page.evaluate(() => window.__srWrites), 'silent on a cold boot').toBe(0);

        await stageAhu(page);
        await page.click('.ahu-svg a[href="/simulators/refrigerant-loop.html"]');
        await page.waitForURL(/refrigerant-loop/);
        await page.goBack();
        await page.waitForTimeout(1200);

        await expect(page.locator('#ddcw-resumed')).toBeVisible();
        expect(await page.evaluate(() => window.__srWrites), 'announced once, not per tick').toBe(1);
        const sr = (await page.locator('#ddcw-resumed-sr').textContent()).trim();
        expect(sr.length, 'the region carries the sentence').toBeGreaterThan(20);
        // Derived from the visible copy + the button's own label, so the
        // two surfaces cannot drift apart.
        const visible = (await page.locator('#ddcw-resumed-msg').textContent()).replace(/\s+/g, ' ').trim();
        const label = (await page.locator('#ddcw-resumed-fresh').textContent()).trim();
        expect(sr).toContain(visible);
        expect(sr).toContain(label);
        // No focus steal: the reader asked for the sub-sim, not a dialog.
        const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
        expect(focused).not.toBe('ddcw-resumed-fresh');
        expect(errs).toEqual([]);
    });

    test('the notice fits a 375px phone without pushing the page sideways', async ({ page }) => {
        // responsive.spec.js walks every page in tests/pages.js at phone
        // width, but it walks a COLD load — the notice ships hidden, so
        // the sweep can never see it. This is that check for the one
        // state the sweep structurally cannot reach.
        await page.setViewportSize({ width: 375, height: 720 });
        const errs = await open(page, AHU);
        await stageAhu(page);
        await page.click('.ahu-svg a[href="/simulators/refrigerant-loop.html"]');
        await page.waitForURL(/refrigerant-loop/);
        await page.goBack();
        await page.waitForTimeout(700);
        await expect(page.locator('#ddcw-resumed')).toBeVisible();

        const m = await page.evaluate(() => {
            const el = document.getElementById('ddcw-resumed');
            const r = el.getBoundingClientRect();
            return {
                docScroll: document.documentElement.scrollWidth,
                docClient: document.documentElement.clientWidth,
                right: r.right,
                left: r.left,
            };
        });
        expect(m.docScroll, 'no horizontal overflow with the notice showing')
            .toBeLessThanOrEqual(m.docClient + 1);
        expect(m.left).toBeGreaterThanOrEqual(-1);
        expect(m.right).toBeLessThanOrEqual(m.docClient + 1);

        // The button still clears the touch floor at phone width.
        const box = await page.locator('#ddcw-resumed-fresh').boundingBox();
        expect(box.width).toBeGreaterThan(0);
        expect(box.height).toBeGreaterThan(0);
        expect(errs).toEqual([]);
    });
});

test.describe('workbench session: the interplay with #260', () => {
    test('block runtime state restores, and the first Wiresheet mount still clears it', async ({ page }) => {
        // BOTH HALVES ARE THE ASSERTION, and the second half is a
        // DOCUMENTED EXISTING DEFECT, not a bug this row is reporting.
        //
        // codebase-issues.md:11589 (#260, "The workbench shell's first
        // editor mount resets every block's state — latches release,
        // integrals clear"): the lazy editor mount swaps the driving
        // graph for a fresh clone, so every stateful block
        // re-initialises. #275 v1 deliberately does NOT fix that — the
        // fix belongs to #260 and lands in fbe-editor.js, a third live
        // page. What #275 owes is that the snapshot carries the state
        // faithfully INTO the shell's graph; what happens at the mount
        // is #260's business and is pinned here so a future #260 fix
        // has to come and change this row on purpose.
        const errs = await open(page, AHU);
        await page.selectOption('#ddcw-program', 'econ-2stage-lowlimits');
        await page.waitForTimeout(400);
        await expect(chip(page, 'Fan En'), 'the machine starts running').toHaveText('ON');

        // Trip the SOFTWARE low limit by lying to the DAT sensor. (The
        // hardwired stat reads the plant's truth, so it stays made — the
        // page's own "two failure stories" beat.)
        await page.selectOption('#ahu-ovr-select', 'dat');
        await page.click('#ahu-ovr-toggle');
        await page.fill('#ahu-ovr-input', '30');
        await expect(chip(page, 'Fan En'), 'the low limit drops the fan').toHaveText('OFF');

        // Release the lie. The SR latch holds — that is what makes the
        // next assertion about STATE rather than about the input.
        await page.click('#ahu-ovr-toggle');
        await page.waitForTimeout(800);
        await expect(chip(page, 'Fan En'), 'the latch holds with the sensor released').toHaveText('OFF');

        await page.click('.ahu-svg a[href="/simulators/vfd-mock.html"]');
        await page.waitForURL(/vfd-mock/);
        await page.goBack();
        await page.waitForTimeout(800);

        // Half one — #275's own contract: the latch travelled.
        await expect(page.locator('#ddcw-resumed')).toBeVisible();
        await expect(chip(page, 'Fan En'), 'the restored latch is still set').toHaveText('OFF');

        // Half two — #260's documented reset, unchanged by this work.
        await page.click('.tabs.tabs-flush [data-tab="wiresheet"]');
        await page.waitForTimeout(800);
        await expect(chip(page, 'Fan En'),
            'the first Wiresheet mount releases it — codebase-issues #260, unfixed by design')
            .toHaveText('ON');
        expect(errs).toEqual([]);
    });
});

test.describe('workbench session: a snapshot taken mid-ramp', () => {
    test('the outdoor air comes back apart from its target and resumes the walk', async ({ page }) => {
        // The AHU's weather CHASES the knob rather than teleporting to it
        // (OA_RAMP_RATE — the sustained-cold ruling, 2026-08-09): the
        // slider writes plant.oaTarget and plant.oaT walks there. So a
        // snapshot taken mid-walk restores the two APART, and the right
        // behaviour is to keep walking — the target is a standing command
        // the reader gave, and a trip into a sub-sim does not revoke it.
        //
        // The readouts split the same way and that split is deliberate:
        // #ahu-oa-val paints the TARGET (it is the knob's own readout and
        // must agree with the handle under it), the OAT chip paints the
        // plant's truth.
        const errs = await open(page, AHU);
        await page.locator('#ahu-oa-slider').evaluate((el) => {
            el.value = '10';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        // Leave almost immediately — the walk is 70 °F at 0.5 °F per
        // sim-second, so it is nowhere near arrived.
        await page.waitForTimeout(250);
        const oatBefore = parseFloat(await chip(page, 'OAT').textContent());
        expect(oatBefore, 'still on the way down').toBeGreaterThan(15);

        await page.click('.ahu-svg a[href="/simulators/refrigerant-loop.html"]');
        await page.waitForURL(/refrigerant-loop/);
        await page.goBack();
        await page.waitForTimeout(400);

        await expect(page.locator('#ddcw-resumed')).toBeVisible();
        expect(await page.locator('#ahu-oa-slider').inputValue(),
            'the handle came back on the target the reader set').toBe('10');
        expect((await page.locator('#ahu-oa-val').textContent()).trim(),
            'and so did the knob readout').toMatch(/^10\s/);

        const oatResumed = parseFloat(await chip(page, 'OAT').textContent());
        expect(oatResumed, 'the truth came back mid-walk, not snapped to the target')
            .toBeGreaterThan(10);
        expect(oatResumed, 'and not snapped back to the arrival weather either')
            .toBeLessThan(80);

        // Direction, not a number: it keeps going down.
        await page.waitForTimeout(1200);
        const oatLater = parseFloat(await chip(page, 'OAT').textContent());
        expect(oatLater, 'the weather resumed walking toward the target')
            .toBeLessThan(oatResumed);
        expect(oatLater).toBeGreaterThanOrEqual(10);
        expect(errs).toEqual([]);
    });
});

test.describe('workbench session: the module contract', () => {
    // One structural row, engine-direct — the session module is loaded by
    // two live pages and is the kind of file whose header claims decay
    // silently. This checks the claims a browser row cannot: that it is
    // DOM-free, and that both pages actually load it ahead of the shell
    // (a script tag in the wrong order boots a workbench with no restore
    // and no error).
    const ROOT = path.join(__dirname, '..');

    test('ddcw-session.js loads in a bare vm with no window or document', () => {
        const vm  = require('node:vm');
        const src = fs.readFileSync(path.join(ROOT, 'html/scripts/ddcw-session.js'), 'utf8');
        const S = vm.runInNewContext(src + '\n; DDCWSession;', {});
        expect(typeof S.fingerprint).toBe('function');
        // The IO half degrades rather than throwing when there is no
        // storage to reach — the same branch a private-mode visitor takes.
        expect(S.read('ahu')).toBeNull();
        expect(S.write('ahu', { a: 1 })).toBe(false);
        expect(() => S.clear('ahu')).not.toThrow();
    });

    test('both workbench pages load the session module before the shell', () => {
        for (const rel of ['html/simulators/ddc-workbench.html',
                           'html/simulators/ddc-workbench-fcu.html']) {
            const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
            const session = src.indexOf('/scripts/ddcw-session.js');
            const shell   = src.indexOf('/scripts/ddcw-shell.js"');
            expect(session, rel + ' loads the session module').toBeGreaterThan(-1);
            expect(shell, rel + ' loads the shell').toBeGreaterThan(-1);
            expect(session, rel + ': session module comes first').toBeLessThan(shell);
        }
    });
});
