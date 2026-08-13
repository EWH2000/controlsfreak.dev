// DDC Workbench (FCU) — the air animation's idle gate.
//
// The page runs ONE self-suspending rAF loop for the fan blade and the air
// chevrons (house idiom: flow-engine.js:285-303, codebase-issues #113). It
// suspends when the fan is off, when the Wiresheet tab is up, or when the
// document is hidden, and the ONLY thing that restarts it is fcuRenderUnit
// calling fcuAnimSync() — there is no visibilitychange listener and no
// mirrored tab flag.
//
// That is a single point of failure for a graphic nothing else tests: if the
// resume path ever breaks, the unit renders frozen and every other spec
// still passes. The #113 resolution added a spec for exactly this risk (an
// IO-gated startLoop that never fires); the failure mode here is worse,
// because a frozen DDC graphic looks like a plausible idle unit rather than
// an obvious bug.
//
// The page was hidden (eleventyExcludeFromCollections + noindex) when this
// file was written; graduation (Phase 8, 2026-08-04) added its canonical and
// its tests/pages.js row, so the smoke / responsive / contrast sweeps reach
// it now. This spec stays the page's behavioral coverage — the rows below
// assert what a generic sweep cannot know to.
//
// Also here, for the same reason — this is the spec that already drives the
// built Unit tab: the signed coil-ΔT read of the arrival state (leaving minus
// entering, negative while cooling — owner ruling 2026-07-27), and the
// statusbar unit selector that links this page to the AHU workbench.

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { expectTouchFloor } = require('./touch-floor.js');

const URL = '/simulators/ddc-workbench-fcu.html';

// How many cells the point mirror carries. Three describes below assert it
// — the diet, the phone reading surface and the register rows — so it lives
// here rather than as three literals that a split can move out of step with
// each other (it went 6 → 7 when #298 separated zone from setpoint). The
// figure that MATTERS is that the count is one number; its value is checked
// against the shipped list by the register row, which names every id.
const MIRROR_CELLS = 7;

const CHEVRON = '#fcu-flow .fcu-chevron';

// The first chevron's transform — the cheapest observable "is the air
// moving" fingerprint.
function chevron(page) {
    return page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return el ? el.getAttribute('transform') : null;
    }, CHEVRON);
}

// Every chevron's translate() origin, so a test can tell "laid along the
// centerline" from "piled at (0,0) because nothing ever placed them".
function positions(page) {
    return page.evaluate((sel) => Array.from(document.querySelectorAll(sel)).map((el) => {
        const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(el.getAttribute('transform') || '');
        return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
    }), CHEVRON);
}

async function waitForChevrons(page) {
    await page.waitForFunction(
        (sel) => document.querySelectorAll(sel).length > 0,
        CHEVRON,
    );
}

test.describe('DDC Workbench — air animation idle gate', () => {
    test('suspends on the Wiresheet tab and resumes on return to Unit', async ({ page }) => {
        await page.goto(URL);
        await waitForChevrons(page);

        // Arrival: the sequence owns every output (all NULL boxes
        // released) with cooling called, so the air should genuinely
        // be moving.
        const a0 = await chevron(page);
        await page.waitForTimeout(400);
        const a1 = await chevron(page);
        expect(a1, 'chevrons should march on arrival').not.toBe(a0);

        // Wiresheet up → #tab-unit loses .active → the loop must suspend.
        await page.click('.tabs.tabs-flush [data-tab="wiresheet"]');
        await page.waitForTimeout(300);          // let the in-flight frame retire
        const w0 = await chevron(page);
        await page.waitForTimeout(400);
        const w1 = await chevron(page);
        expect(w1, 'chevrons should freeze while the Unit pane is hidden').toBe(w0);

        // Back to Unit → the next hostTick (≤100 ms) must restart the loop.
        await page.click('.tabs.tabs-flush [data-tab="unit"]');
        const r0 = await chevron(page);
        await page.waitForTimeout(400);
        const r1 = await chevron(page);
        expect(r1, 'chevrons should march again after returning to Unit').not.toBe(r0);
    });

    test('chevrons are laid on the centerline, never left at the SVG origin', async ({ page }) => {
        await page.goto(URL);
        await waitForChevrons(page);

        // Chevrons are created with a `d` but no `transform`; a static
        // placement pass is what puts them on the centerline. If that ever
        // regresses they stack at (0,0) — which reads as a missing graphic,
        // not as a stopped one.
        const pts = await positions(page);
        expect(pts.length).toBeGreaterThan(4);
        expect(pts.every((p) => p !== null), 'every chevron has a transform').toBe(true);
        expect(pts.filter((p) => p.x === 0 && p.y === 0).length,
            'no chevron sits at the SVG origin').toBe(0);
        expect(new Set(pts.map((p) => p.x.toFixed(1))).size,
            'chevrons are spread along the centerline').toBeGreaterThan(2);
    });
});

test.describe('DDC Workbench — the outdoor-air knob is a command, not a fact', () => {

    // codebase-issues #278. The OA slider used to write `plant.oaT`
    // directly; it now writes `plant.oaTarget` and the plant walks the
    // truth there at OA_RAMP_RATE (the AHU's ruling, ported for
    // weather-model parity — a reader hops between the two pages).
    //
    // ⚠ WHY THIS ROW PINS ONLY THE COMMAND HALF. The AHU can assert the
    // whole split on the page because it HAS a weather instrument — an
    // `oat` point, and so an OAT statusbar chip painting the plant's
    // truth beside the knob's own readout. This unit deliberately has no
    // `oat` point at all (the graphic says so: outdoor air is a sim knob,
    // not a BACnet point), so there is NO page surface that shows the
    // truth, and a row claiming to read it here would be reading the
    // command back. The truth-side chase is pinned engine-direct in
    // ddcw-fcu-unit.spec.js, and its browser-side reality is pinned
    // through the session snapshot in ddc-workbench-session.spec.js.
    // Three layers, one contract, split by what each can actually see.
    test('the readout and the handle track the target the instant it is set', async ({ page }) => {
        await page.goto(URL);
        await page.waitForFunction(() => document.getElementById('fcu-verdict')
            .textContent.trim().length > 0);

        const readout = page.locator('#fcu-oa-val');
        await expect(readout, 'arrival weather is settled on the default day')
            .toHaveText(/^80\s/);

        // Drag to the cold end of THIS unit's range (55 °F, not the AHU's
        // −20 — see the slider's own range note on the AHU page).
        await page.locator('#fcu-oa-slider').evaluate((el) => {
            el.value = '55';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });

        // The command lands at once even though the weather does not:
        // the row is a control, and a knob whose own readout lagged its
        // handle would read as broken.
        await expect(readout, 'the knob readout is the knob, so it is instant')
            .toHaveText(/^55\s/);
        expect(await page.locator('#fcu-oa-slider').inputValue(),
            'and the handle stays where the reader left it').toBe('55');

        // It STAYS on the command while the chase runs underneath — the
        // regression this guards is a readout re-pointed at the truth,
        // which would visibly crawl 80 → 55 under a stationary handle.
        await page.waitForTimeout(600);
        await expect(readout, 'the readout does not crawl toward the target')
            .toHaveText(/^55\s/);
    });
});

test.describe('DDC Workbench — signed coil ΔT (leaving minus entering)', () => {
    test('arrival cooling paints a NEGATIVE ΔT that reconciles from the displayed RAT / DAT', async ({ page }) => {
        // Owner ruling 2026-07-27: ΔT = DAT − RAT, negative while
        // cooling — the sign says which way the coil drives the air.
        // Arrival state is a live cooling call (zone 76 over SP 72), so
        // once the verdict settles on the cooling line the badge must
        // read clearly negative, the mobile mirror must agree, and the
        // on-screen arithmetic must close (metric worked-example
        // rounding policy: the delta IS displayed DAT minus displayed
        // RAT, not the unrounded canonical value). The entering badge
        // is #fcu-rat since the 2026-08-03 RAT-vocabulary rename.
        await page.goto(URL);
        await page.waitForFunction(() =>
            document.getElementById('fcu-verdict').textContent
                .includes('Cooling — clear ΔT across the coil'));

        const vals = await page.evaluate(() => ({
            rat: document.getElementById('fcu-rat').textContent,
            dat: document.getElementById('fcu-dat').textContent,
            dt: document.getElementById('fcu-dt').textContent,
            dtR: document.getElementById('fcu-dt-r').textContent,
        }));
        expect(vals.dt, 'badge and mirror agree').toBe(vals.dtR);
        const dt = parseFloat(vals.dt);
        expect(dt, 'cooling ΔT is clearly negative').toBeLessThan(-3);
        // The displayed delta is the arithmetic of the displayed pair.
        expect(dt).toBeCloseTo(parseFloat(vals.dat) - parseFloat(vals.rat), 1);
    });
});

test.describe('DDC Workbench — verdict thresholds are unit-invariant (#224)', () => {
    test('a units flip repaints the numbers and never moves the no-ΔT line', async ({ page }) => {
        // The verdict ladder and the downstream-air gate used to compare the
        // DISPLAYED ΔT against a bare −3. That literal is −3 °F for a US
        // reader and −3 °C ≈ −5.4 °F for a metric one, so between those two
        // lines the SAME plant state read "Cooling — clear ΔT" in US and
        // "No ΔT across coil — compressor not cooling" in metric, with the
        // air past the coil un-tinted to match (codebase-issues #224).
        //
        // A unit system is a display choice, so parking the unit inside that
        // band and flipping the toggle must change the NUMBERS and nothing
        // else. The band is only reachable on the coil's ramp — steady-state
        // stage-1 ΔT is ≈ −10 °F — which is what the scripted manoeuvre below
        // is for: warm the coil fast, then call a stage at 2× and catch it on
        // the way down (~4 s of usable window).
        //
        // The whole manoeuvre runs ~8 s on a quiet box, and this page is the
        // heaviest in the repo (FBE editor + rAF chevron loop), so the 30 s
        // default is too tight to be safe under parallel load. Nothing inside
        // may declare a longer wait than the test's own budget.
        test.setTimeout(60_000);
        await page.addInitScript(() => localStorage.setItem('cf_units', 'us'));
        await page.goto(URL);
        await page.waitForFunction(() =>
            document.getElementById('fcu-verdict').textContent.trim().length > 0);

        // The compressor-off scenario writes slot 8 on the stage AND the fan,
        // so the NULL boxes release themselves and the stage buttons go live.
        // With the stages off and the fan still running, the coil lag carries
        // ΔT back up through zero to fan heat alone. The slider's max is 60×
        // but the unit's 5 s per-tick clamp caps a 10 Hz host at an effective
        // 50× — the warm-up waits on a condition, not a duration, so the
        // exact multiple does not matter; the point is "as fast as it goes".
        await page.locator('#fcu-speed-slider').fill('60');
        await page.click('[data-preset="compoff"]');
        await page.waitForFunction(
            () => parseFloat(document.getElementById('fcu-dt').textContent) > -1,
            null, { timeout: 20000 });

        // 2× real time, then call stage 1: the coil ramps down through the
        // band slowly enough to sample by hand.
        await page.locator('#fcu-speed-slider').fill('2');
        await page.click('#fcu-stage-1');

        // Park between −3.6 and −5.0 °F: past the real (IP) trip line by a
        // margin, short of the metric literal's −5.4 °F. ΔT only deepens from
        // here, so the margin cannot erode while the assertions run.
        await page.waitForFunction(() => {
            const v = parseFloat(document.getElementById('fcu-dt').textContent);
            return isFinite(v) && v <= -3.6 && v >= -5.0;
        }, null, { timeout: 20000 });

        const read = () => page.evaluate(() => ({
            dt: document.getElementById('fcu-dt').textContent,
            verdict: document.getElementById('fcu-verdict').textContent.trim(),
            pill: document.getElementById('fcu-verdict').className,
            datFill: document.getElementById('fcu-dat').getAttribute('fill'),
        }));

        const us = await read();
        // Anti-vacuity: outside the band both unit systems agree even with
        // the bug, so the test has to prove it is standing in the band.
        const usDt = parseFloat(us.dt);
        expect(usDt, 'parked past the IP trip line').toBeLessThanOrEqual(-3.6);
        expect(usDt, 'parked short of the metric literal (−5.4 °F)').toBeGreaterThan(-5.4);
        expect(us.verdict, 'a −4 °F coil is cooling in anybody’s units')
            .toContain('Cooling — clear ΔT across the coil');

        await page.click('.units-btn[data-units="metric"]');
        await page.waitForFunction(() =>
            document.getElementById('fcu-dt').textContent.includes('°C'));
        const met = await read();

        expect(met.dt, 'the NUMBER is what a units toggle changes').not.toBe(us.dt);
        expect(met.verdict, 'the verdict is not a unit-dependent reading').toBe(us.verdict);
        expect(met.pill, 'the pill severity travels with the verdict').toBe(us.pill);
        expect(met.datFill, 'downstream air stays tinted as cooling air').toBe(us.datFill);
    });
});

test.describe('DDC Workbench — the verdict annunciation reaches a screen reader', () => {
    // codebase-issues #227a. #fcu-verdict used to carry aria-live while
    // sitting inside #tab-unit, and styles.css is
    // `.tab-pane { display: none; }` — a live region in a display:none
    // subtree is not in the accessibility tree, so the DAT low-limit
    // annunciation announced NOTHING while the Wiresheet was up, which is
    // exactly where a reader sits studying the program that raised it.
    //
    // The pill cannot simply move out: .tool-card.is-fullscreen
    // #tab-unit.active places it by `grid-area: verdict`, which only
    // resolves while it is a grid child of that pane. So the pill is a mute
    // readout and #fcu-verdict-sr — an .sr-only live region outside both
    // panes — carries the announcement. These two tests pin both halves of
    // that split, because nothing else on the page can see either one.

    test('the pill is mute and the out-of-pane mirror carries the announcement', async ({ page }) => {
        await page.goto(URL);
        await page.waitForFunction(() => document.getElementById('fcu-verdict')
            .textContent.includes('Cooling — clear ΔT across the coil'));

        // The pill must not claim to announce from inside a hidden pane —
        // role="status" would reintroduce the same bug, so pin both.
        const pill = page.locator('#fcu-verdict');
        expect(await pill.getAttribute('aria-live')).toBeNull();
        expect(await pill.getAttribute('role')).toBeNull();

        // The mirror is a real live region, and it is NOT inside a tab pane.
        const sr = page.locator('#fcu-verdict-sr');
        await expect(sr).toHaveAttribute('aria-live', 'polite');
        await expect(sr).toHaveClass(/\bsr-only\b/);
        expect(await sr.evaluate((el) => !!el.closest('.tab-pane'))).toBe(false);

        // Switch to the Wiresheet: the Unit pane goes display:none and the
        // pill stops rendering, while the mirror stays in the tree.
        await page.click('.tab-btn[data-tab="wiresheet"]');
        const state = await page.evaluate(() => {
            const srEl = document.getElementById('fcu-verdict-sr');
            const cs = getComputedStyle(srEl);
            return {
                pane: getComputedStyle(document.getElementById('tab-unit')).display,
                pillRendered: document.getElementById('fcu-verdict').checkVisibility(),
                srDisplay: cs.display,
                srVisibility: cs.visibility,
            };
        });
        expect(state.pane).toBe('none');
        expect(state.pillRendered).toBe(false);
        expect(state.srDisplay).not.toBe('none');
        expect(state.srVisibility).toBe('visible');

        // …and it still tracks a verdict change driven from the statusbar —
        // the only unit control reachable on this tab. Downloading the
        // safeties sheet holds the stages off for its power-up min-off, so
        // the verdict leaves the cooling line on its own.
        await page.selectOption('#ddcw-program', 'cool-2stage-safeties');
        await page.waitForFunction(() => document.getElementById('fcu-verdict-sr')
            .textContent.includes('Compressor off'));

        // Mirror and pill never diverge.
        const both = await page.evaluate(() => ({
            pill: document.getElementById('fcu-verdict').textContent.trim(),
            sr: document.getElementById('fcu-verdict-sr').textContent.trim(),
        }));
        expect(both.sr).toBe(both.pill);
    });

    test('the verdict repaints on a state change, not on every 10 Hz host tick', async ({ page }) => {
        // prose-audit item 18. The shell ticks at 10 Hz (ddcw-shell.js) and
        // repaints the unit every tick; the verdict write used to be
        // unguarded. Harmless while the pill was the only writer — a screen
        // reader talking over itself ten times a second once the mirror
        // above is live. Measured before the setVerdict guard: ~40 mutation
        // records on #fcu-verdict in a 2 s steady window.
        //
        // The mirror is observed CONDITIONALLY and asserted separately, so
        // that on a build without the guard this test reports the pill's
        // mutation count — the defect it is actually about — instead of
        // dying on a MutationObserver over a null mirror.
        await page.goto(URL);
        await page.waitForFunction(() => document.getElementById('fcu-verdict')
            .textContent.includes('Cooling — clear ΔT across the coil'));

        const seen = await page.evaluate(() => new Promise((resolve) => {
            const pillEl = document.getElementById('fcu-verdict');
            const srEl = document.getElementById('fcu-verdict-sr');
            const opts = {
                childList: true, characterData: true, subtree: true,
                attributes: true, attributeFilter: ['class'],
            };
            let pillN = 0;
            let srN = 0;
            const moPill = new MutationObserver((recs) => { pillN += recs.length; });
            const moSr = new MutationObserver((recs) => { srN += recs.length; });
            const before = pillEl.textContent.trim();
            moPill.observe(pillEl, opts);
            if (srEl) moSr.observe(srEl, opts);
            window.setTimeout(() => {
                moPill.disconnect();
                moSr.disconnect();
                resolve({ pillN, srN, srPresent: !!srEl, before,
                    after: pillEl.textContent.trim() });
            }, 2000);
        }));

        // Guard the guard: the zone is a live thermal model, so if it
        // genuinely crossed a verdict boundary inside the window one
        // repaint is legitimate (2 records on the pill — class + text —
        // and 1 on the mirror). The tolerance is per state change, never
        // per tick.
        const changed = seen.before !== seen.after;
        expect(seen.pillN, 'pill repaints only on a verdict change')
            .toBeLessThanOrEqual(changed ? 2 : 0);
        expect(seen.srPresent, 'the sr-only mirror exists to be guarded').toBe(true);
        expect(seen.srN, 'live region repaints only on a verdict change')
            .toBeLessThanOrEqual(changed ? 1 : 0);
    });
});

test.describe('DDC Workbench — the override drift is reported on change of value (#229)', () => {
    // The page's OTHER live region, and the harder one. #fcu-ovr-state used
    // to be a single element doing two jobs: a visible amber drift line
    // repainted on every 10 Hz host tick, carrying role="status"
    // aria-live="polite". Measured on the build before this: 50 mutation
    // records over 5 s with a force held, carrying 4 distinct sentences.
    //
    // ⚠ THE FIX IS NOT THE VERDICT'S SIGNATURE GUARD, and the rows below are
    // written so a build that "harmonised" it back would go red. The AHU's
    // twin interpolates the STATIC number the operator typed, so de-duping
    // identical writes takes it to zero. This line interpolates the LIVE
    // integrated zone temperature, so a de-dup guard leaves ~1 Hz — a
    // screen reader talking over itself once a second instead of ten times.
    // So the node was SPLIT (visible line keeps 10 Hz and carries no
    // aria-live at all; #fcu-ovr-state-sr outside both panes carries the
    // announcement) and the mirror reports on a COV increment.
    //
    // ⚠ AND THE ASSERTIONS ARE DELIBERATELY CLOCK-FREE. A settle debounce
    // could only be pinned by a wall-clock mutation count, which depends on
    // the machine, on simSpeed, and on where in the excursion the window
    // falls — the CI flake the COV decision was partly made to avoid. What
    // is asserted here is a property of the VALUES: consecutive
    // announcements differ by at least the increment. The one row that does
    // count mutations (the storm bound) is deliberately 3× loose and says
    // so.

    const OVR = '#fcu-ovr-state';
    const OVR_SR = '#fcu-ovr-state-sr';
    const HELD = 'The controller is staging on the forced value.';

    // The increment is read out of the shipped source rather than repeated
    // here — a spec carrying its own copy of a tuning constant is a drift
    // generator, and this one is meant to be retunable. A miss THROWS: a
    // regex that silently returned NaN would make every comparison below
    // vacuously true, which is the failure mode this whole file exists to
    // avoid.
    function increment() {
        const src = fs.readFileSync(
            path.join(__dirname, '..', 'html', 'scripts', 'ddcw-fcu-unit.js'), 'utf8');
        const m = /const OVR_COV_INCREMENT = ([\d.]+)/.exec(src);
        if (!m) throw new Error('OVR_COV_INCREMENT not found in ddcw-fcu-unit.js');
        return Number(m[1]);
    }

    // The zone reading out of an announcement — the second number in
    // "Program reads X °F — zone is actually Y °F." While a force is HELD
    // the sensed half is constant, so the change in this number IS the
    // change in the canonical drift the increment is measured on. In US
    // units the display is canonical, so no conversion enters the test.
    function zoneOf(txt) {
        const m = /zone is actually (-?[\d.]+)/.exec(txt);
        return m ? Number(m[1]) : null;
    }

    // The worst drift the page can produce: both environment knobs at an
    // extreme AND the clock at its fastest, with the sensor forced well
    // below the zone so the sequence shuts off and the envelope runs away.
    // Measured engine-direct at 1.29 °F per WALL second — the fastest arm
    // of five, at the fastest of three speeds. Every row below that needs
    // announcements inside a short window uses this, because at the shipped
    // defaults the region is (correctly) nearly silent: ~2 announcements a
    // minute.
    async function stormSetup(page) {
        await page.goto(URL);
        await page.waitForFunction(() => document.getElementById('fcu-verdict')
            .textContent.trim().length > 0);
        await page.locator('#fcu-speed-slider').fill('60');
        await page.locator('#fcu-oa-slider').fill('110');
        await page.locator('#fcu-load-slider').fill('10000');
        await page.locator('#fcu-ovr-toggle').click();
        await expect(page.locator(OVR)).toContainText(HELD);
        await page.locator('#fcu-ovr-input').fill('60');
        await expect(page.locator(OVR_SR)).toContainText(HELD);
    }

    // Collect every distinct text a node takes over a window, in order.
    function watch(page, id, ms) {
        return page.evaluate(([elId, span]) => new Promise((resolve) => {
            const el = document.getElementById(elId);
            const texts = [];
            let n = 0;
            const mo = new MutationObserver((recs) => {
                n += recs.length;
                texts.push(el.textContent);
            });
            mo.observe(el, { childList: true, characterData: true, subtree: true });
            window.setTimeout(() => { mo.disconnect(); resolve({ n, texts }); }, span);
        }), [id, ms]);
    }

    test('the visible drift line still repaints on every host tick', async ({ page }) => {
        // The half that must NOT be paced. Pacing the shared node was the
        // obvious fix and is the wrong one: the visible line exists to show
        // the sensed number and the real one walking apart, so freezing it
        // would delete the hazard to protect the announcement. At the
        // shipped 20× default with a force held, 5 s of 10 Hz ticks is ~50
        // records; the floor is set well under that so a slow CI box cannot
        // flake it, and far over the ~5 a mere de-dup guard would leave.
        await page.goto(URL);
        await page.waitForFunction(() => document.getElementById('fcu-verdict')
            .textContent.trim().length > 0);
        await page.locator('#fcu-ovr-toggle').click();
        await expect(page.locator(OVR)).toContainText(HELD);

        const seen = await watch(page, 'fcu-ovr-state', 5000);

        // Anti-vacuity: the window must have been spent narrating a HELD
        // force. A released override, or a line that was never populated,
        // would post records for the wrong reason.
        expect(seen.texts[seen.texts.length - 1], 'the window was spent with a force held')
            .toContain(HELD);
        expect(seen.n, 'the visible drift readout keeps its 10 Hz repaint')
            .toBeGreaterThanOrEqual(30);
    });

    test('the visible line carries neither aria-live nor role="status"', async ({ page }) => {
        // Pins the split itself against a future "harmonise the two units"
        // pass. role="status" IMPLIES aria-live, so dropping one and
        // keeping the other reintroduces the defect in full — both are
        // asserted for that reason. The mirror is asserted in the same
        // breath so a build that deleted the mirror instead of muting the
        // line cannot pass by having nothing to announce.
        await page.goto(URL);
        const vis = page.locator(OVR);
        expect(await vis.getAttribute('aria-live')).toBeNull();
        expect(await vis.getAttribute('role')).toBeNull();

        const sr = page.locator(OVR_SR);
        await expect(sr).toHaveAttribute('aria-live', 'polite');
        await expect(sr).toHaveClass(/\bsr-only\b/);
        // Outside BOTH panes — not (only) because #tab-unit goes
        // display:none, but because a live region that re-enters the tree
        // already populated announces nothing, and the drift half is not
        // operator-driven (#227a, the .ddcw-offprog contract).
        expect(await sr.evaluate((el) => !!el.closest('.tab-pane'))).toBe(false);
    });

    test('consecutive announcements differ by at least the increment', async ({ page }) => {
        // THE PRIMARY ROW. Clock-free by construction: it asserts a
        // property of the values, so it means the same thing on a fast
        // machine, a slow one, and at any sim speed. A de-dup guard would
        // fail it on the first pair (a tenth apart, not two degrees); the
        // pre-fix build would fail it on nearly every pair.
        const INC = increment();
        await stormSetup(page);

        const seen = await watch(page, 'fcu-ovr-state-sr', 12000);

        // Anti-vacuity, both directions: the pairs have to exist, and the
        // window has to have been spent on a held force rather than on an
        // empty region.
        expect(seen.texts.length, 'the window produced pairs to compare')
            .toBeGreaterThanOrEqual(2);
        seen.texts.forEach((t) => {
            expect(t, 'every announcement is the real sentence').toContain(HELD);
        });

        for (let i = 1; i < seen.texts.length; i++) {
            expect(seen.texts[i], 'no announcement repeats its predecessor verbatim')
                .not.toBe(seen.texts[i - 1]);
            const a = zoneOf(seen.texts[i - 1]);
            const b = zoneOf(seen.texts[i]);
            expect(a, 'the announcement carries a zone reading').not.toBeNull();
            expect(b, 'the announcement carries a zone reading').not.toBeNull();
            // INC − 0.1: the sentence prints the zone to one decimal while
            // the rule compares the canonical value, so a pair exactly at
            // the increment can render a tenth short of it.
            expect(Math.abs(b - a), 'announcement ' + i + ' moved a full increment')
                .toBeGreaterThanOrEqual(INC - 0.1);
        }
    });

    test('the mirror speaks a small fraction of what the visible line paints', async ({ page }) => {
        // The two halves in ONE window, which is the only way to state the
        // ratio honestly — comparing counts from two different runs would
        // compare two different drift excursions. Both floors matter: a
        // mirror at zero is not "quiet", it is broken, and a visible line
        // at zero would mean the pacing leaked onto the wrong node.
        //
        // ⚠ THIS IS THE ONLY ROW IN THE BLOCK THAT DOES NOT READ THE
        // INCREMENT, and that is why it exists. The rows that regex it out
        // of the source track the shipped constant by design — which means
        // an increment set to 0 moves their goalposts with it and they pass
        // vacuously (verified: at INC = 0 this row was the only one that
        // went red). A ratio has no constant to move.
        await stormSetup(page);

        const seen = await page.evaluate((span) => new Promise((resolve) => {
            const visEl = document.getElementById('fcu-ovr-state');
            const srEl = document.getElementById('fcu-ovr-state-sr');
            const opts = { childList: true, characterData: true, subtree: true };
            let visN = 0;
            let srN = 0;
            const moVis = new MutationObserver((r) => { visN += r.length; });
            const moSr = new MutationObserver((r) => { srN += r.length; });
            moVis.observe(visEl, opts);
            moSr.observe(srEl, opts);
            window.setTimeout(() => {
                moVis.disconnect();
                moSr.disconnect();
                resolve({ visN, srN });
            }, 10000);
        }), 10000);

        expect(seen.visN, 'the visible line kept painting').toBeGreaterThanOrEqual(50);
        expect(seen.srN, 'the mirror said something').toBeGreaterThanOrEqual(1);
        expect(seen.srN * 5, 'the mirror is a small fraction of the repaint')
            .toBeLessThanOrEqual(seen.visN);
    });

    test('the fastest drift the page can produce does not storm the region', async ({ page }) => {
        // A SMOKE NET, not the tight assertion — the tight one is the
        // consecutive-increment row above, re-run here in the same
        // conditions. The bound is the analytic ceiling ×3: the measured
        // worst-case drift rate is R_max = 1.29 °F per WALL second (both
        // knobs extreme, clock at 60×, which MAX_DT_SIM clamps to ~50×
        // effective), so a 5 s window can move 5 × R_max degrees and buy at
        // most ceil(5 × R_max / INC) announcements. Tripled, because R_max
        // is a measurement off one machine's physics run and this row is
        // here to catch a lost increment, not to police the tuning.
        const INC = increment();
        const R_MAX = 1.29;                       // °F per wall second, measured
        const ceiling = Math.ceil(5 * R_MAX / INC) * 3;
        await stormSetup(page);

        const seen = await watch(page, 'fcu-ovr-state-sr', 5000);
        expect(seen.n, 'the region stays inside the storm ceiling of ' + ceiling)
            .toBeLessThanOrEqual(ceiling);
        // Same window, tight rule — so a pass here is never a pass by
        // silence.
        for (let i = 1; i < seen.texts.length; i++) {
            const d = Math.abs(zoneOf(seen.texts[i]) - zoneOf(seen.texts[i - 1]));
            expect(d, 'and every pair inside it still moved an increment')
                .toBeGreaterThanOrEqual(INC - 0.1);
        }
    });

    test('the operator’s own actions announce at once, with no increment to clear', async ({ page }) => {
        // The EVENT half. Someone who has just forced a sensor needs to
        // hear that it took — waiting for two degrees of drift would be a
        // control that answers late — and a release has to clear the claim
        // before it can be read back stale. Plain waits, no timing
        // assertion: the announcement is synchronous with the tick that
        // handles the click, so a deadline here would only measure
        // Playwright.
        await page.goto(URL);
        await page.waitForFunction(() => document.getElementById('fcu-verdict')
            .textContent.trim().length > 0);

        await page.locator('#fcu-ovr-toggle').click();
        await expect(page.locator(OVR_SR)).toContainText(HELD);

        await page.locator('#fcu-ovr-toggle').click();
        await expect(page.locator(OVR_SR)).toHaveText('');
        await expect(page.locator(OVR)).toHaveText('');
    });

    test('a units flip mid-override re-announces instead of stranding a °F sentence', async ({ page }) => {
        // The unit suffix rides in the EVENT signature deliberately — the
        // trap setVerdict's header names, which lands for real here because
        // this vocabulary carries numbers and units. Classed as drift, a
        // metric flip would wait on two degrees of movement while the tree
        // held a sentence in the units the reader just left.
        await page.goto(URL);
        await page.waitForFunction(() => document.getElementById('fcu-verdict')
            .textContent.trim().length > 0);

        await page.locator('#fcu-ovr-toggle').click();
        await expect(page.locator(OVR_SR)).toContainText('°F');

        await page.click('.units-btn[data-units="metric"]');
        await expect(page.locator(OVR_SR)).toContainText('°C');
        await expect(page.locator(OVR_SR)).not.toContainText('°F');
        // The visible line gets this for free from its unconditional
        // repaint; asserted anyway, because the two nodes carrying
        // different units would be worse than either being stale.
        await expect(page.locator(OVR)).toContainText('°C');
        await expect(page.locator(OVR)).not.toContainText('°F');
    });
});

test.describe('DDC Workbench — the blocked-condenser scenario is wired end to end (#246)', () => {
    test('the scenario reaches its own verdict, with the indoor side still reading clean', async ({ page }) => {
        // Three hand-mapped names have to agree for this scenario to work
        // at all — the button's data-preset, the SCENARIOS key it looks
        // up, and the plant fault string the verdict ladder branches on
        // (ddcw-fcu-unit.js). Nothing else pins that chain: the
        // engine-direct rows in ddcw-fcu-unit.spec.js set
        // plant.conditions.fault THEMSELVES, so a typo anywhere in the
        // DOM path would leave them green while the page fell through to
        // the generic "compressor not cooling" line. That is precisely
        // the drift the #246 rename could have introduced, so it gets a
        // row.
        //
        // The second half is the LESSON, and it is a PAIRING: the air
        // side reads healthy — fan commanded, proof made, chevrons
        // marching — while the compressor annunciator goes red. Both
        // halves are load-bearing. A model that quietly dropped the air
        // here would make the verdict a lie and teach the opposite
        // diagnostic; a compressor LED that stayed green would leave the
        // reader nothing on the drawing to pair the clean air side
        // against.
        test.setTimeout(60_000);
        await page.goto(URL);
        await page.waitForFunction(() =>
            document.getElementById('fcu-verdict').textContent.trim().length > 0);

        await page.locator('#fcu-speed-slider').fill('60');
        await page.click('[data-preset="condenser"]');

        // Wait on conditions, not durations. The verdict branches on the
        // fault the instant the preset writes it; the ΔT badge is a
        // first-order lag off the coil, so it walks up from the cooling
        // value it was at. Both have to land before the reads below mean
        // anything.
        await page.waitForFunction(() =>
            document.getElementById('fcu-verdict').textContent.includes('condenser-side'),
        null, { timeout: 30000 });
        await page.waitForFunction(
            () => parseFloat(document.getElementById('fcu-dt').textContent) > -1,
            null, { timeout: 30000 });

        const read = await page.evaluate(() => ({
            verdict: document.getElementById('fcu-verdict').textContent.trim(),
            pill: document.getElementById('fcu-verdict').className,
            label: document.querySelector('[data-preset="condenser"]').textContent.trim(),
            chips: Array.from(document.querySelectorAll('.ddcw-chip')).map((c) => c.textContent.trim()),
            dt: document.getElementById('fcu-dt').textContent,
            // The token, not the resolved colour: the module writes
            // `var(--red)` literally, and the two themes resolve it to
            // different rgb triples.
            compDot: document.getElementById('fcu-comp-dot').getAttribute('fill'),
        }));

        expect(read.label, 'the button names the condenser, not a coil').toBe('Blocked condenser');
        expect(read.verdict, 'the verdict sends the reader off the graphic')
            .toBe('No ΔT across coil — air moving; look condenser-side, off this graphic');
        expect(read.pill, 'a stopped coil under a cooling call is an error state').toContain('error');

        // The indoor side reads clean — that is the whole diagnostic.
        const chip = (name) => read.chips.find((c) => c.startsWith(name)) || '';
        expect(chip('Fan Sts'), 'airflow proof stays made').toContain('ON');
        expect(chip('Fan En'), 'the fan is still enabled').toContain('ON');
        expect(chip('Clg Stg 1'), 'stage 1 is still called').toContain('ON');
        expect(chip('Clg Stg 2'), 'stage 2 is still called').toContain('ON');

        // Motion, not population. The chevron COUNT is fixed at init
        // from the centerline length and never changes — a stopped
        // stream has exactly as many nodes as a running one, so counting
        // them would stay green through the very regression this half
        // exists to catch (indoor air quietly dropped under a
        // refrigeration-side fault). Sample the leading chevron's
        // transform twice instead, the idiom the idle-gate rows above
        // already use.
        const m0 = await chevron(page);
        await page.waitForTimeout(600);
        const m1 = await chevron(page);
        expect(m1, 'the air is still drawn moving').not.toBe(m0);

        // The one thing on the drawing that IS wrong, and the half of
        // the tell the page's note now names: the compressor annunciator
        // goes red — energized, producing nothing. A clean air side
        // under a red compressor is what puts the fault on the
        // refrigeration circuit.
        expect(read.compDot, 'the compressor reads energized-but-not-producing')
            .toBe('var(--red)');

        // …and the coil is doing nothing. The `> -1` half is asserted by
        // the waitForFunction above (it fails the row on timeout); this
        // is the upper bound, which nothing else covers — anything past
        // fan heat would mean the capacity gate did not close.
        const dt = parseFloat(read.dt);
        expect(dt, 'the ΔT did not invert into a heating delta').toBeLessThan(2);
    });
});

test.describe('DDC Workbench — the fullscreen cockpit keeps its graphic', () => {

    // Same symptom family as the AHU cockpit: fullscreen makes the active
    // pane the single scroller, the readouts + controls column outruns the
    // scrollport, and before the sticky pin the graphic scrolled partly out
    // of view over dead space (246 of 390px left at 1280×720). The graphic
    // spans the right column's whole row stack (its named grid-area covers
    // every row, so a new row — the param rail landed this way — joins the
    // span without touching the pin), so it pins without any wrapper;
    // `bottom: 0` rides along because the item is CENTERED (see the page's
    // head block).
    //
    // ⚠ RE-DERIVED FOR THE MIRROR DIET, 2026-08-03. Hiding the three plain
    // mirror cells shortens the scrolling column, which is exactly the way
    // the `scrollTop > 0` floor below could have gone vacuous. It did not:
    // MEASURED at 1280×720 in fullscreen, the pane's overflow went 295px →
    // 236px, so the pane still scrolls and the assertions still bite. The
    // graphic (390px) still fits the 515px scrollport either way, so the
    // min() in the second assertion keeps carrying the fits-the-view arm.

    test('scrolled to the bottom, the graphic is still in full view', async ({ page }) => {
        await page.goto(URL);
        await page.click('.tool-card-fullscreen-btn');
        const m = await page.evaluate(() => {
            const pane = document.querySelector('#tab-unit');
            pane.scrollTop = pane.scrollHeight;
            const paneR = pane.getBoundingClientRect();
            const pinR = document.querySelector('.fcu-graphic').getBoundingClientRect();
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
        });

        // Non-vacuity floor: the pane must actually have scrolled, or the
        // visibility assertions below pass without testing the pin.
        expect(m.scrollTop, 'the pane actually scrolled').toBeGreaterThan(0);

        // The graphic is fully visible (it fits the 1280×720 scrollport;
        // the min() keeps the row honest if a retune ever outgrows it)…
        expect(m.visible, 'the graphic still fills the view at max scroll')
            .toBeGreaterThanOrEqual(Math.min(m.pinnedHeight, m.paneClient) - 2);

        // …including its bottom edge — the sticky must yield any overhang
        // at the end of the travel, never hard-pin the top.
        expect(m.pinnedBottom, 'the graphic bottom is on-screen')
            .toBeLessThanOrEqual(m.paneBottom + 2);
    });

    test('the stacked fallback stays ordinary flow (sticky is off)', async ({ page }) => {
        // 800px wide trips the one-column @media arm; the override pins
        // position back to static so the graphic cannot paint over the
        // points and controls scrolling under it.
        await page.setViewportSize({ width: 800, height: 720 });
        await page.goto(URL);
        await page.click('.tool-card-fullscreen-btn');
        const pos = await page.evaluate(
            () => getComputedStyle(document.querySelector('.fcu-graphic')).position);
        expect(pos, 'one-column fallback must not pin the graphic').toBe('static');
    });
});

test.describe('DDC Workbench — the mirror diet', () => {

    // Owner ruling 2026-08-03, one change across both workbench pages (the
    // same scope the #227(b) affordance shipped under). Above the cutoff the
    // PLAIN cells stop taking space; the three BUTTONS stay at every width,
    // because nothing inside the role="img" drawing is focusable and they
    // are the only keyboard path to a chip pulse.
    //
    // The cutoff is the AHU page's measurement — that drawing holds its
    // 780px cap only down to a 896px viewport, this one holds its 660px cap
    // down to 774px — so one shared number has to clear 896 and this page
    // keeps its plain cells over a band where its own drawing is still at
    // cap. Derivation lives in the AHU page's head block.
    const CUTOFF = 900;
    // px — .fcu-graphic's designed max-width. Pinned because the cutoff's
    // whole justification is that a drawing renders at its designed scale
    // above it: widen this and the AHU page's 896 line moves, so a change
    // here must redden rather than quietly squeeze this graphic too.
    const CAP = 660;

    const cellBoxes = (page) => page.locator('.fcu-point').evaluateAll(
        (els) => els.map((e) => {
            const r = e.getBoundingClientRect();
            return {
                point: e.dataset.point || null,
                btn: e.classList.contains('fcu-point-btn'),
                boxed: r.width > 2 && r.height > 2,
            };
        }));

    test('at a desktop width only the three sensed-point buttons take space', async ({ page }) => {
        await page.goto(URL);           // the config's default viewport is 1280 wide
        const cells = await cellBoxes(page);
        expect(cells.length, 'the whole list is still in the DOM').toBe(MIRROR_CELLS);
        expect(cells.filter((c) => c.boxed).map((c) => c.point),
            'the desktop row is exactly the buttons, in air-path order')
            .toEqual(['rat', 'dat', 'space-temp']);
        expect(cells.filter((c) => c.btn && !c.boxed),
            'a button never leaves the flow — it is the keyboard path').toEqual([]);
    });

    test('a cell that leaves the flow is still announced, never display:none', async ({ page }) => {
        // role="img" prunes the drawing's subtree, so this list is the only
        // text rendering of those values and `display: none` would delete
        // them for a desktop screen-reader user. ΔT is the sharp case: it is
        // arithmetic rather than a roster point, so unlike the fan and
        // compressor cells it has no statusbar chip to fall back on
        // (asserted off the live roster below).
        await page.goto(URL);
        const quiet = await page.locator('.fcu-point:not(.fcu-point-btn)').evaluateAll(
            (els) => els.map((e) => {
                const cs = getComputedStyle(e);
                const val = e.querySelector('.fcu-point-val');
                return {
                    id: val ? val.id : '(no value node)',
                    display: cs.display,
                    visibility: cs.visibility,
                    ariaHidden: e.getAttribute('aria-hidden'),
                    text: (e.textContent || '').trim(),
                };
            }));
        // The cooling-setpoint cell joined this set with #298's split: a
        // param has no sensing device on the drawing, so it is a plain div
        // like the fan and compressor rather than a fourth button. Its own
        // fallback is the SVG zone box, which prints the same value.
        expect(quiet.length, 'the plain cells are everything but the three sensor buttons')
            .toBe(MIRROR_CELLS - 3);
        expect(quiet.map((q) => q.id))
            .toEqual(['fcu-dt-r', 'fcu-csp-r', 'fcu-fan-r', 'fcu-comp-r']);
        for (const q of quiet) {
            expect(q.display, q.id + ' must not be display:none').not.toBe('none');
            expect(q.visibility, q.id + ' must not be visibility:hidden').not.toBe('hidden');
            expect(q.ariaHidden, q.id + ' must not be aria-hidden').toBeNull();
            expect(q.text, q.id + ' is still painted by renderUnit').not.toBe('');
        }
        const roster = await page.evaluate(() => window.DDCWFcuUnit.POINTS.map((p) => p.id));
        expect(roster.filter((id) => /(^|-)dt$|delta/.test(id)),
            'ΔT is arithmetic, so no chip carries it').toEqual([]);
    });

    test('the cutoff is ' + CUTOFF + 'px, and at ' + CUTOFF + ' the drawing is still at its designed width', async ({ page }) => {
        await page.setViewportSize({ width: CUTOFF, height: 900 });
        await page.goto(URL);
        expect((await cellBoxes(page)).filter((c) => c.boxed).length,
            'at the cutoff the diet is already on').toBe(3);

        // The cap read off the LIVE stylesheet as well as compared to the
        // literal — a widened cap would slide this drawing under its own
        // designed scale at the cutoff while a bare `width >= 660` still
        // passed. Same pairing as the AHU row.
        const gfx = await page.locator('.fcu-graphic').evaluate((el) => ({
            width: el.getBoundingClientRect().width,
            cap: parseFloat(getComputedStyle(el).maxWidth),
        }));
        expect(gfx.cap, 'a cap change invalidates the shared cutoff — re-measure it')
            .toBe(CAP);
        expect(gfx.width, 'at the cutoff the drawing still renders its full cap')
            .toBeGreaterThanOrEqual(gfx.cap - 0.5);

        await page.setViewportSize({ width: CUTOFF - 1, height: 900 });
        expect((await cellBoxes(page)).filter((c) => c.boxed).length,
            'one pixel under the cutoff the whole list is back').toBe(MIRROR_CELLS);
    });

    test('the mirror absorbs its buttons\' hit-area bleed, above and below the cutoff (#266)', async ({ page }) => {
        // Pre-diet this pane was clean at the default 1280×720: the last
        // grid track held a PLAIN cell, whose box has no hit-area bleed.
        // The diet makes the desktop row all buttons, so a button always
        // holds the last track — and its -0.3rem bleed poked 4.8px past
        // the grid, which the fullscreen pane (the one scrolling ancestor)
        // rendered as a horizontal scrollbar the pre-diet page never
        // showed. Grid padding-right absorbs it.
        //
        // The below-cutoff arm arrived with #266's ruling (2026-08-10),
        // which decided the design call this row used to leave open and
        // moved the declaration out of the diet block onto .fcu-points
        // itself. Sub-900 the cell mix is the pre-diet one, where a button
        // lands in the last track across wide contiguous BANDS — measured
        // here before the fix: 360–473, 610–620 and 642–777 in normal
        // flow, 360–431 and 568–703 in fullscreen. 400 is inside every
        // one of them. The AHU page carries the twin rows.
        await page.goto(URL);
        const overflow = () => page.evaluate(() => {
            const grid = document.querySelector('.fcu-points');
            const pane = document.querySelector('#tab-unit');
            return {
                grid: grid.scrollWidth - grid.clientWidth,
                pane: pane.scrollWidth - pane.clientWidth,
            };
        });
        expect(await overflow(), 'desktop, normal flow').toEqual({ grid: 0, pane: 0 });
        await page.click('.tool-card-fullscreen-btn');
        expect(await overflow(), 'desktop, fullscreen cockpit').toEqual({ grid: 0, pane: 0 });

        await page.setViewportSize({ width: 400, height: 900 });
        expect(await overflow(), 'phone width, fullscreen cockpit').toEqual({ grid: 0, pane: 0 });
        await page.keyboard.press('Escape');
        expect(await overflow(), 'phone width, normal flow').toEqual({ grid: 0, pane: 0 });

        // The equality the fix rests on: the two values are one quantity
        // written twice, so a retune of the hit area that leaves the grid
        // alone reddens here instead of quietly re-opening the scrollbar.
        const m = await page.evaluate(() => ({
            bleed: -parseFloat(getComputedStyle(document.querySelector('.fcu-point-btn')).marginRight),
            pad: parseFloat(getComputedStyle(document.querySelector('.fcu-points')).paddingRight),
        }));
        expect(m.bleed, 'the button still bleeds 0.3rem past its box').toBeCloseTo(4.8, 1);
        expect(m.pad, 'the grid absorbs exactly that much').toBeCloseTo(m.bleed, 1);
    });
});

test.describe('DDC Workbench — the point mirror names its register twice (#269, #298)', () => {

    // TWO channels, one derivation. Every mirror caption tags its point's
    // KIND in an .sr-only span (#269) and every value carries the matching
    // register ink (#298) — so this row asserts the pair AGREE, per cell,
    // against a third source neither of them is.
    //
    // ⚠ The AHU twin (ddc-workbench-ahu-page.spec.js) derives the expected
    // word FROM the colour class. That direction was unavailable here while
    // #269 stood alone, and the reason was the whole of #298: this page had
    // no commanded register at all, so `Supply fan` and `Compressor`
    // rendered in exactly the ink `RAT · return` does and asserting a word
    // against a class that did not exist would have passed vacuously. It is
    // available now — but the derivation still runs off the LIVE ROSTER
    // rather than off the class, because the roster (ddcw-fcu-unit.js's
    // FCU_POINTS `dir`) is the one source that actually knows a point's
    // kind, and driving both channels from it catches the case where gloss
    // and ink agree with each other and are both wrong.
    //
    // Only the wiring below is hand-written: which roster rows feed which
    // mirror cell. A `dir` retune reddens this with no edit here, and a
    // cell whose sources stop resolving fails rather than skipping.
    const DIR_WORD = { sensor: '(measured)', actuator: '(commanded)', param: '(commanded)' };
    // …and the ink each word is spent in. `null` = the plain measured ink,
    // which is the ABSENCE of a register class, so it is asserted as such
    // rather than skipped.
    const WORD_CLASS = {
        '(measured)': null,
        '(commanded)': 'is-cmd',
        '(calculated)': 'accent',
    };
    const REGISTER_CLASSES = ['is-cmd', 'accent'];

    // mirror value id → the roster point ids the cell prints. `fcu-dt-r` is
    // deliberately empty: ΔT is arithmetic over the two displayed operands,
    // owns no roster row, and is the page's one calculated cell.
    const SOURCES = [
        { id: 'fcu-rat-r',  points: ['rat'] },
        { id: 'fcu-dat-r',  points: ['dat'] },
        { id: 'fcu-dt-r',   points: [] },
        // Zone and setpoint are TWO cells, not one. #269 shipped them as one
        // caption with two glosses, because the cell printed a sensed
        // temperature beside the param it answers to and a single word would
        // have been false about half of it. Ink cannot be halved that way at
        // all, so #298 separated them — the AHU's shape all along.
        { id: 'fcu-zone-r', points: ['space-temp'] },
        { id: 'fcu-csp-r',  points: ['cooling-setpoint'] },
        // The fan cell prints the COMMAND, not the proof: fcuRenderUnit's
        // own comment pins that, and `fan-status` (the bi) is a separate
        // claim this list does not carry. Both sources are actuators, so the
        // two collapse to one word.
        { id: 'fcu-fan-r',  points: ['fan-enable', 'fan-speed'] },
        { id: 'fcu-comp-r', points: ['y1', 'y2'] },
    ];

    test('every mirror caption carries its kind, and the words match the roster', async ({ page }) => {
        await page.goto(URL);

        const dirs = await page.evaluate(() => Object.fromEntries(
            window.DDCWFcuUnit.POINTS.map((p) => [p.id, p.dir])));

        const rows = await page.locator('.fcu-point').evaluateAll((els) => els.map((e) => {
            const cap = e.querySelector('.fcu-point-cap');
            const val = e.querySelector('.fcu-point-val');
            return {
                id: val ? val.id : null,
                glosses: cap
                    ? Array.from(cap.querySelectorAll('.sr-only')).map((s) => s.textContent.trim())
                    : [],
                cls: val ? val.className : null,
            };
        }));

        expect(rows.map((r) => r.id), 'the mirror is these cells, in air-path order')
            .toEqual(SOURCES.map((s) => s.id));
        expect(rows.length, 'and the shared cell count agrees with them')
            .toBe(MIRROR_CELLS);

        for (const [i, row] of rows.entries()) {
            const src = SOURCES[i];
            // Derive, don't restate: a source naming no roster point would
            // otherwise hand this row a silent pass.
            const want = src.points.length === 0
                ? ['(calculated)']
                : src.points.map((p) => {
                    expect(dirs[p], src.id + ' names a live roster point: ' + p).toBeTruthy();
                    return DIR_WORD[dirs[p]];
                });
            // Adjacent sources of one kind print one word, not two.
            const collapsed = want.filter((w, n) => n === 0 || w !== want[n - 1]);
            expect(row.glosses, src.id + ' names its register in text')
                .toEqual(collapsed);
            // ONE register per cell, which is what the split bought: a cell
            // spanning two kinds could carry two glosses but never two inks.
            expect(collapsed.length, src.id + ' is a single register').toBe(1);

            // …and the ink says the same thing the word does.
            const worn = REGISTER_CLASSES.filter((c) => new RegExp('\\b' + c + '\\b').test(row.cls || ''));
            const wantClass = WORD_CLASS[collapsed[0]];
            expect(worn, src.id + ' paints the register its caption names')
                .toEqual(wantClass === null ? [] : [wantClass]);
        }

        // Both correspondences also asserted in the reverse direction, so a
        // register cannot quietly spread to a cell that does not claim it.
        const bearing = (cls) => rows.filter((r) => new RegExp('\\b' + cls + '\\b').test(r.cls || ''))
            .map((r) => r.id);
        const glossed = (word) => rows.filter((r) => r.glosses.includes(word)).map((r) => r.id);
        expect(bearing('accent'), 'ΔT is the page\'s only blue cell').toEqual(['fcu-dt-r']);
        expect(glossed('(calculated)'), 'and the only one glossed calculated').toEqual(['fcu-dt-r']);
        expect(bearing('is-cmd'), 'green is the commanded cells and nothing else')
            .toEqual(glossed('(commanded)'));
        expect(bearing('is-cmd').length, 'and there is a commanded register at all (#298)')
            .toBeGreaterThan(0);
    });

    test('the gloss is invisible ink — it never widens a caption', async ({ page }) => {
        // .sr-only is the clip-rect utility, so this is a real assertion
        // about the shipped class rather than a tautology: a caption that
        // grew would be the tell that the span lost it. Measured on the
        // desktop row, where all three cells are buttons in the flow.
        await page.goto(URL);
        const bad = await page.locator('.fcu-point-btn .fcu-point-cap .sr-only').evaluateAll(
            (els) => els.filter((e) => {
                const r = e.getBoundingClientRect();
                return r.width > 2 || r.height > 2;
            }).length);
        expect(bad, 'no gloss takes layout space').toBe(0);
    });

    test('the split rows paint independently — zone follows the sensor, setpoint the param', async ({ page }) => {
        // The two halves of the old combined cell now have to be driven
        // from their own sources, and the row that proves it is the one
        // where they MOVE APART: forcing the wall stat rewrites the zone
        // cell and must leave the setpoint cell exactly where it was.
        await page.goto(URL);
        await page.waitForTimeout(400);

        const read = () => page.evaluate(() => ({
            zone: document.getElementById('fcu-zone-r').textContent.trim(),
            csp: document.getElementById('fcu-csp-r').textContent.trim(),
            well: document.getElementById('fcu-zone-sp').textContent.trim(),
        }));

        const before = await read();
        expect(before.zone, 'the zone cell paints').not.toBe('');
        expect(before.csp, 'the setpoint cell paints').not.toBe('');
        expect(before.csp, 'and it agrees with the SVG setpoint well it twins')
            .toBe(before.well);

        await page.click('#fcu-ovr-toggle');
        await page.fill('#fcu-ovr-input', '60');
        await page.waitForFunction(() =>
            document.getElementById('fcu-zone-r').textContent.trim() === '60.0 °F');
        const after = await read();
        expect(after.csp, 'a forced sensor does not move the commanded setpoint')
            .toBe(before.csp);
    });

    // ── The legend (#298) ────────────────────────────────────────────────
    // A key is only worth printing if it keys what the page actually
    // spends, which is why every row below ties a well back to the mirror
    // rather than checking the legend against itself. The failure mode
    // #298 named — "a partial key is a worse teacher than no key, because
    // it looks complete" — is exactly a legend drifting out of step with
    // the instrument, in either direction.

    test('the key prints all three registers, in the same inks the mirror spends', async ({ page }) => {
        await page.goto(URL);

        const key = page.locator('.fcu-key');
        await expect(key, 'the page prints a key at all').toHaveCount(1);
        // role=group + aria-label, the AHU's call: a one-row key does not
        // earn a heading and a bare div with aria-label would be ignored.
        await expect(key).toHaveAttribute('role', 'group');
        await expect(key).toHaveAttribute('aria-label', 'Colour key');

        const items = await key.locator('.fcu-key-item').evaluateAll((els) => els.map((e) => {
            const well = e.querySelector('.fcu-key-well');
            return {
                label: e.textContent.replace(well ? well.textContent : '', '').trim(),
                sample: well ? well.textContent.trim() : null,
                colour: well ? getComputedStyle(well).color : null,
                cls: well ? well.className : null,
            };
        }));
        expect(items.map((i) => i.label), 'measured / commanded / calculated, in that order')
            .toEqual(['Measured', 'Commanded', 'Calculated']);

        // The colours are read off the LIVE mirror rather than restated as
        // hexes: the assertion is that the legend and the instrument are
        // one system, and a token retune must move both or redden here.
        const mirror = await page.evaluate(() => {
            const paint = (id) => getComputedStyle(document.getElementById(id)).color;
            return {
                measured: paint('fcu-rat-r'),
                commanded: paint('fcu-fan-r'),
                calculated: paint('fcu-dt-r'),
            };
        });
        expect(items[0].colour, 'the measured well is painted like a measured cell')
            .toBe(mirror.measured);
        expect(items[1].colour, 'the commanded well is painted like a commanded cell')
            .toBe(mirror.commanded);
        expect(items[2].colour, 'the calculated well is painted like a calculated cell')
            .toBe(mirror.calculated);
        // …and the three are genuinely three, so a token collapse cannot
        // pass the three rows above by making everything one colour.
        expect(new Set(items.map((i) => i.colour)).size, 'three distinct inks').toBe(3);

        expect(items.map((i) => i.cls), 'the wells carry the register classes')
            .toEqual(['fcu-key-well', 'fcu-key-well is-cmd', 'fcu-key-well is-calc']);
    });

    test('the key samples are this page\'s own values, and they convert', async ({ page }) => {
        // A legend showing invented numbers is a legend a reader cannot
        // match to the screen. Each sample is a value the static seed
        // actually paints, so the US arm reads them straight off the
        // mirror; the metric arm is the units-toggle half — a key frozen in
        // °F beside a metric mirror is the same mismatch one step on.
        await page.goto(URL);
        const wells = page.locator('.fcu-key-well');

        // The three literals below are the ARRIVAL frame — what the shell's
        // boot hostTick() paints with the default cool-2stage program on a
        // fresh plant (zone 76.0, stage 1, fan 60 %). They were 100% and
        // -19.4 °F until codebase-issues #219: #205 restaged the fan
        // reference behind the stage-2 call, so arrival dropped to stage 1
        // / 60 %, and these wells — which carry no id and are the one
        // static surface renderUnit never repaints — went on printing a
        // full-speed stage-2 snapshot BESIDE a mirror reading 60% · ON.
        // A drift here is visible, unlike the rest of the page's statics,
        // so this row is the guard for it: re-derive from the mirror
        // (#fcu-fan-r / #fcu-dt-r on load), never by patching a digit.
        await expect(wells.nth(0), 'measured: the seeded RAT').toHaveText('76.0 °F');
        await expect(wells.nth(1), 'commanded: the seeded fan command').toHaveText('60%');
        await expect(wells.nth(2), 'calculated: the seeded ΔT').toHaveText('-17.6 °F');

        await page.click('.units-btn[data-units="metric"]');
        await expect(wells.nth(0), 'absolute temperature converts').toHaveText('24.4 °C');
        await expect(wells.nth(1), 'a percentage is already universal').toHaveText('60%');
        await expect(wells.nth(2), 'ΔT converts as a DELTA, not an absolute')
            .toHaveText('-9.8 °C');
    });

    test('the key rides into the fullscreen cockpit rather than dropping with the prose', async ({ page }) => {
        // #tab-unit.active is a NAMED-AREA grid in fullscreen, so a child
        // with no grid-area is auto-placed into an implicit cell — a broken
        // cockpit, not a misplaced legend. And the cockpit is where the
        // coded values are, so the legend that keys them has to be there
        // too. Both halves in one row: it is placed, and it is placed
        // between the mirror and the verdict.
        await page.goto(URL);
        await page.click('.tool-card-fullscreen-btn');
        const geom = await page.evaluate(() => {
            const box = (sel) => {
                const r = document.querySelector(sel).getBoundingClientRect();
                return { top: r.top, w: r.width, h: r.height };
            };
            return {
                key: box('.fcu-key'),
                points: box('.fcu-points'),
                verdict: box('#fcu-verdict'),
                area: getComputedStyle(document.querySelector('.fcu-key')).gridArea,
            };
        });
        expect(geom.key.w, 'the key is rendered in the cockpit').toBeGreaterThan(2);
        expect(geom.key.h, 'and has height').toBeGreaterThan(2);
        expect(geom.area, 'it is placed explicitly, not auto-flowed').toContain('key');
        expect(geom.key.top, 'it sits below the mirror it keys')
            .toBeGreaterThan(geom.points.top);
        expect(geom.key.top, 'and above the verdict').toBeLessThan(geom.verdict.top);
        await page.keyboard.press('Escape');
    });
});

test.describe('DDC Workbench — the low-charge verdict offers a candidate, not a finding (#247)', () => {
    test('it names the symptom, and stays a different string from the condenser one', async ({ page }) => {
        // #247, owner disposition 3 (2026-08-01). The low-charge and
        // blocked-condenser scenarios put the FCU in an IDENTICAL displayed
        // state — same chips, same ΔT badge, same red compressor dot, same
        // marching chevrons. A full DOM sweep found the verdict string as
        // the only differing surface. So the verdict is the one place the
        // two can be told apart, and it is also the one place the page can
        // over-claim: the old string read "low charge, not cooling", which
        // is a diagnosis these readings cannot support.
        //
        // Two things get a row, and they pull in opposite directions —
        // which is why neither can be dropped:
        //   1. The string is SOFTENED. `one candidate` is the load-bearing
        //      hedge; a future edit that hardens it back into a finding
        //      has to walk past this assertion.
        //   2. The string is still DISTINCT. Softening far enough would
        //      collapse it into the condenser verdict (disposition 2,
        //      which the owner did NOT take) and cost the scenario its
        //      only distinguishing surface.
        // The distinctness half compares against the condenser verdict
        // READ LIVE rather than a second copy of that literal — a duplicated
        // string would go stale the day the condenser wording is retuned,
        // and the comparison would then prove nothing.
        test.setTimeout(60_000);
        await page.goto(URL);
        await page.waitForFunction(() =>
            document.getElementById('fcu-verdict').textContent.trim().length > 0);

        await page.locator('#fcu-speed-slider').fill('60');
        await page.click('[data-preset="lowcharge"]');

        // Wait on the condition, not a duration: the ladder branches on the
        // fault the instant the preset writes it.
        await page.waitForFunction(() =>
            document.getElementById('fcu-verdict').textContent.includes('one candidate'),
        null, { timeout: 30000 });

        const low = await page.evaluate(() => ({
            verdict: document.getElementById('fcu-verdict').textContent.trim(),
            sr: document.getElementById('fcu-verdict-sr').textContent.trim(),
            pill: document.getElementById('fcu-verdict').className,
            label: document.querySelector('[data-preset="lowcharge"]').textContent.trim(),
        }));

        expect(low.label, 'the button still names the scenario').toBe('Low charge');
        expect(low.verdict, 'the verdict states the symptom and hedges the cause')
            .toBe('No ΔT across coil — air moving; low charge is one candidate, gauges settle it');
        expect(low.pill, 'a stopped coil under a cooling call is still an error state')
            .toContain('error');
        // The pill is mute; the .sr-only live region is what a screen
        // reader hears (#227a), so the hedge has to reach both.
        expect(low.sr, 'the screen-reader mirror carries the same hedge').toBe(low.verdict);

        // …and the same page, one button over, must still say something
        // else. Same fixture, so this also re-confirms that a second
        // preset click re-branches the ladder.
        await page.click('[data-preset="condenser"]');
        await page.waitForFunction(() =>
            document.getElementById('fcu-verdict').textContent.includes('condenser-side'),
        null, { timeout: 30000 });
        const cond = await page.evaluate(() =>
            document.getElementById('fcu-verdict').textContent.trim());

        expect(cond, 'the two scenarios do not collapse onto one verdict')
            .not.toBe(low.verdict);
    });
});

// ── The unit selector ────────────────────────────────────────────────
// The statusbar's "which machine am I looking at" pair. Two workbench
// pages, one plain anchor each way — the ruled design: not tabs, not a
// JS switch. link-integrity.spec.js walks _site for broken FRAGMENTS,
// not for a page that quietly stops linking its sibling, so these rows
// are still the only thing holding the pair together.
// The mirror of this describe lives in ddc-workbench-ahu-page.spec.js;
// each half asserts its own page's state and then follows the link, so
// neither depends on the other running.

test.describe('DDC Workbench — the unit selector', () => {

    test('the pair sits in the statusbar and marks THIS page current', async ({ page }) => {
        await page.goto(URL);

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
        await expect(links.nth(0)).toHaveAttribute('aria-current', 'page');
        await expect(links.nth(1)).not.toHaveAttribute('aria-current', /.*/);
    });

    test('the sibling link lands on the AHU workbench, current there', async ({ page }) => {
        await page.goto(URL);
        const sib = page.locator('.ddcw-unit-sel a.ddcw-unit-link:not([aria-current])');
        const wait = page.waitForResponse(
            (r) => r.url().endsWith('/simulators/ddc-workbench.html'));
        await sib.click();
        const resp = await wait;
        expect(resp.status(), 'the sibling href is a live page').toBe(200);

        // The AHU page's own title — the "Air Handler" qualifier is what
        // tells it apart from this page's, so it is the cheapest proof we
        // did not just reload.
        await expect(page).toHaveTitle('DDC Workbench — Air Handler — controlsfreak.dev');

        // …and the pair over there marks AHU, so the two halves are wired
        // to each other rather than both to one page.
        await expect(page.locator('.ddcw-unit-sel [aria-current="page"]')).toHaveText('AHU');
    });

    test('fullscreen keeps it on screen and clickable at max scroll', async ({ page }) => {
        await page.goto(URL);
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
        await expect(page).toHaveTitle('DDC Workbench — Air Handler — controlsfreak.dev');
    });
});

test.describe('DDC Workbench — the unit selector on touch', () => {
    // isMobile + hasTouch make Chromium's emulation match (hover: none),
    // which is the only condition under which the unit-selector touch
    // floor applies. The floor rode the unit-selector CSS into
    // styles.css at graduation, kept beside the component (it needs
    // justify-content on top of the TOUCH-TARGET FLOOR boilerplate);
    // this row is still what guards it.
    test.use({ isMobile: true, hasTouch: true, viewport: { width: 412, height: 883 } });

    test('the links clear the 44px floor in both dimensions', async ({ page }) => {
        // Height was the original floor; width joined it 2026-08-03 (the
        // links measured 41–42px wide natively — codebase-issues #262's
        // named case). It landed page-local on both workbench pages and
        // then graduated into styles.css with them (2026-08-04), so this
        // row and its AHU twin now measure ONE shared rule from two
        // pages; the scoping half is in tests/touch-floor.spec.js.
        await page.goto(URL);
        const links = page.locator('a.ddcw-unit-link');
        await expect(links).toHaveCount(2);
        for (let i = 0; i < 2; i++) {
            const box = await links.nth(i).boundingBox();
            expectTouchFloor(box, `link ${i}`);
        }
    });
});

test.describe('DDC Workbench — the phone surface (the Unit tab is the mobile version)', () => {
    // Owner ruling 2026-08-03: "the Unit tab IS the limited mobile
    // version". Written before the responsive sweep reached this page
    // (graduation joined it to tests/pages.js); the rows assert MORE
    // than the sweep does — no sideways scroll, the mirror
    // filled back in, the rail floored and operable under touch, the
    // wiresheet's one-line truth at tap-in, and one HTML twin per SVG
    // drill-down. The AHU page spec carries the same block with the
    // longer rationale comments.
    test.use({ isMobile: true, hasTouch: true, viewport: { width: 375, height: 667 } });

    test('no sideways scroll and no clipped content at 375', async ({ page }) => {
        await page.goto(URL);
        await page.waitForTimeout(400);
        // .ddcw-offprog.is-empty is the sr-only collapse recipe (a live
        // region that must stay rendered while empty) — intentional, like
        // the sweep's own .sr-only entry.
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
        await page.goto(URL);
        const boxed = await page.locator('.fcu-point').evaluateAll((els) =>
            els.filter((e) => {
                const r = e.getBoundingClientRect();
                return r.width > 2 && r.height > 2;
            }).length);
        expect(boxed, 'every mirror cell occupies the grid at 375').toBe(MIRROR_CELLS);
    });

    test('the rail inputs clear the 44px floor in both dimensions, and a touch commit lands', async ({ page }) => {
        await page.goto(URL);
        const inputs = page.locator('.fcu-param-input');
        await expect(inputs).toHaveCount(2);
        for (let i = 0; i < 2; i++) {
            const box = await inputs.nth(i).boundingBox();
            expectTouchFloor(box, `rail input ${i}`);
        }
        await page.tap('#fcu-p-cool-sp');
        await page.fill('#fcu-p-cool-sp', '75');
        await page.keyboard.press('Enter');
        await expect(page.locator('.ddcw-chip', { hasText: 'Cool SP' })
            .locator('.ddcw-chip-val')).toHaveText(/75/);
    });

    test('the stage buttons clear the floor in both dimensions', async ({ page }) => {
        // "Off" measured 43px wide natively — the page-local width floor
        // (the shared TOUCH-TARGET FLOOR is height-only, #262).
        await page.goto(URL);
        for (const sel of ['#fcu-stage-0', '#fcu-stage-1', '#fcu-stage-2']) {
            const box = await page.locator(sel).boundingBox();
            expectTouchFloor(box, sel);
        }
    });

    // The title/fullscreen-button overlap row moved to the shared
    // tests/fullscreen-btn-overlap.spec.js when #272 promoted the
    // clearance out of this page's head into styles.css. This page's
    // Air-side tag clears the button by a measured 11.4px at 375 unaided —
    // one root-font bump from the collision the AHU page shipped — and
    // the shared version carries that history plus the anti-vacuity rows.

    test('the wiresheet opens on its one-line truth, with the workspace honestly absent', async ({ page }) => {
        await page.goto(URL);
        await page.tap('button[data-tab="wiresheet"]');
        const note = page.locator('p.ddcw-sheet-mobile-note');
        await expect(note, 'the phone truth renders where the workspace is gated out').toBeVisible();
        const first = await page.evaluate(() =>
            document.getElementById('tab-wiresheet').querySelector('p') ===
            document.querySelector('p.ddcw-sheet-mobile-note'));
        expect(first, 'the note is the pane\'s first element').toBe(true);
        await expect(note).toContainText('read-through');
        await expect(note).toContainText('Unit tab');
        await expect(page.locator('.fbe-live')).toBeHidden();
        await expect(page.locator('.desktop-only-sim')).toBeVisible();
    });

    test('every SVG drill-down keeps an HTML twin outside the drawing', async ({ page }) => {
        // Touch-target equivalence (WCAG 2.5.5/2.5.8): the coil and fan
        // glyphs render ~21×39 / ~30×48 CSS px at 375 and SVG geometry
        // cannot take a min-width, so the pass rides the prose anchors
        // (refrigerant-loop in the blocked-condenser note, the VFD in the
        // fan-heat note). Removing one reddens this row.
        await page.goto(URL);
        const drills = await page.evaluate(() => {
            const svgHrefs = [...document.querySelectorAll('.fcu-svg a[href]')]
                .map((a) => a.getAttribute('href'));
            return svgHrefs.map((href) => ({
                href,
                twin: [...document.querySelectorAll(`main a[href="${href}"]`)]
                    .some((a) => !a.closest('.fcu-svg')),
            }));
        });
        expect(drills.length, 'the drawing still carries its two drill-downs').toBe(2);
        for (const d of drills) {
            expect(d.twin, `${d.href} needs an HTML twin outside the SVG`).toBe(true);
        }
    });
});

test.describe('DDC Workbench — the phone truth stays out of the desktop pane', () => {
    test('at a pointer desktop width the note is gone and the workspace is live', async ({ page }) => {
        await page.goto(URL);
        await page.click('button[data-tab="wiresheet"]');
        await expect(page.locator('p.ddcw-sheet-mobile-note')).toBeHidden();
        await expect(page.locator('.fbe-live')).toBeVisible();
        await expect(page.locator('.desktop-only-sim')).toBeHidden();
    });
});

test.describe('DDC Workbench — the parameter rail adjusts the running program', () => {
    // The FCU half of the 2026-08-03 ruling: this page gained a mini
    // param rail (cooling setpoint + deadband) on the AHU rail's
    // pattern. The AHU page spec carries the exhaustive behaviour rows
    // (write path, #260 mount survival, custom-flag contract); this
    // block pins the FCU's own wiring end-to-end — the rail exists,
    // labels resolve, a commit reaches every display surface, the clamp
    // announces, and the disable honestly depicts a cleared sheet.

    const chipText = (page, cap) => page.evaluate((c) => {
        const chips = Array.from(document.querySelectorAll('#ddcw-io .ddcw-chip'));
        const hit = chips.find((el) => el.textContent.includes(c));
        return hit ? hit.textContent : null;
    }, cap);

    test('two labelled inputs; a commit reaches chip, SVG well and mirror within a tick', async ({ page }) => {
        await page.goto(URL);
        await page.waitForTimeout(400);
        for (const id of ['fcu-p-cool-sp', 'fcu-p-deadband']) {
            await expect(page.locator('#' + id), id).toHaveAttribute('type', 'number');
            await expect(page.locator('label[for="' + id + '"]'), 'label for ' + id)
                .toHaveCount(1);
        }
        // The hint line is a polite live region.
        const hint = page.locator('#fcu-params-hint');
        await expect(hint).toHaveAttribute('role', 'status');
        await expect(hint).toHaveAttribute('aria-live', 'polite');
        // No duplicate ids page-wide (the rail reuses the p*/u* id shape).
        const dups = await page.evaluate(() => {
            const seen = new Set(); const out = [];
            document.querySelectorAll('[id]').forEach((el) => {
                if (seen.has(el.id)) out.push(el.id);
                seen.add(el.id);
            });
            return out;
        });
        expect(dups).toEqual([]);

        const cool = page.locator('#fcu-p-cool-sp');
        // Typing alone must not write — commit is Enter / focus-out.
        await cool.click();
        await cool.fill('');
        await cool.pressSequentially('75');
        await page.waitForTimeout(300);
        expect(await chipText(page, 'Cool SP'), 'chip mid-type').toContain('72.0');
        await cool.press('Enter');
        await page.waitForTimeout(300);
        // Every display surface agrees: chip, the SVG zone well (the
        // read-only display twin — nothing in the graphic is focusable),
        // the mirror's own setpoint cell, and the field itself. That cell
        // is #fcu-csp-r since #298 split it out of the zone cell; the zone
        // cell beside it must NOT have moved, which is the half of this
        // assertion the old combined string could not make.
        expect(await chipText(page, 'Cool SP')).toContain('75.0');
        await expect(page.locator('#fcu-zone-sp')).toHaveText('75.0 °F');
        await expect(page.locator('#fcu-csp-r')).toHaveText('75.0 °F');
        // Read in ONE evaluate: both nodes are written in the same
        // synchronous render pass, so a single snapshot cannot straddle a
        // tick and see them disagree for a reason other than a real one.
        const zone = await page.evaluate(() => ({
            mirror: document.getElementById('fcu-zone-r').textContent,
            well: document.getElementById('fcu-zone-t').textContent,
        }));
        expect(zone.mirror, 'the zone cell still tracks the sensed zone, not the setpoint')
            .toBe(zone.well);
        expect(await cool.inputValue()).toBe('75.0');
        // A constant change, not a hand command: picker not Custom,
        // nothing off-program.
        expect(await page.locator('#ddcw-program').inputValue()).toBe('cool-2stage');
        await expect(page.locator('#ddcw-offprog-list li')).toHaveCount(0);
    });

    test('clamp announces the range; Escape reverts without committing', async ({ page }) => {
        await page.goto(URL);
        await page.waitForTimeout(400);
        const cool = page.locator('#fcu-p-cool-sp');
        await cool.click();
        await cool.fill('10');
        await cool.press('Enter');
        await page.waitForTimeout(300);
        expect(await cool.inputValue(), 'held at the roster min').toBe('65.0');
        await expect(page.locator('#fcu-params-hint')).toContainText('65.0–85.0 °F');

        const db = page.locator('#fcu-p-deadband');
        await db.click();
        await db.fill('4');
        await db.press('Escape');
        await page.waitForTimeout(200);
        expect(await db.inputValue(), 'deadband back on the shipped 3.0').toBe('3.0');
        expect(await chipText(page, 'Deadband'), 'nothing committed').toContain('3.0');
        // Escape on the now-CLEAN field has nothing to cancel, so the
        // press must bubble on to the page handlers — in the fullscreen
        // cockpit that is the only keyboard way out for a user whose
        // focus sits in a rail field (same contract as the AHU page's
        // dedicated row; the rail logic is deliberately duplicated, so
        // the claim-only-when-dirty guard needs its own pin here).
        await page.click('.tool-card-fullscreen-btn');
        await page.waitForTimeout(300);
        await db.click();
        await db.press('Escape');
        await page.waitForTimeout(200);
        expect(await page.evaluate(() => document.body.classList.contains('has-fullscreen-tool')),
            'clean-field Escape exits fullscreen').toBe(false);
    });

    test('a program switch resets the rail; Clear disables it', async ({ page }) => {
        await page.goto(URL);
        await page.waitForTimeout(400);
        const cool = page.locator('#fcu-p-cool-sp');
        await cool.click();
        await cool.fill('78');
        await cool.press('Enter');
        await page.waitForTimeout(200);
        // Blur first — selectOption moves no focus, a real picker
        // interaction does, and the mirror paint deliberately skips a
        // focused field (commit is Enter/blur).
        await cool.blur();
        await page.locator('#ddcw-program').selectOption('cool-1stage');
        await page.waitForTimeout(400);
        expect(await cool.inputValue(), 'authored literal restored').toBe('72.0');

        await page.click('.tabs.tabs-flush [data-tab="wiresheet"]');
        await page.waitForTimeout(600);
        await page.click('#tab-wiresheet [data-fbe-action="clear"]');
        await page.waitForTimeout(400);
        await expect(cool, 'no block on the sheet — the field disables').toBeDisabled();
        await expect(page.locator('#fcu-p-deadband')).toBeDisabled();
        expect(await cool.getAttribute('title')).toContain('no cooling-setpoint block');
    });

    test('the units toggle re-expresses the rail, deadband as a DELTA', async ({ page }) => {
        await page.goto(URL);
        await page.waitForTimeout(400);
        await page.locator('.units-btn').filter({ hasText: 'Metric' }).click();
        await page.waitForTimeout(300);
        // 72 °F → 22.2 °C absolute; the 3 °F deadband is 1.7 °C of BAND —
        // the absolute formula would print −16.1 °C, the contract's own
        // worked example.
        expect(await page.locator('#fcu-p-cool-sp').inputValue()).toBe('22.2');
        expect(await page.locator('#fcu-p-deadband').inputValue()).toBe('1.7');
        // EVERY suffix span, both directions. The spans are painted by one
        // signature-guarded writer that skips the identical repaint on each
        // of the 10 Hz host ticks (codebase-issues #265), so the flip is
        // the one event that has to get through it — and it has to get
        // through going back, which a metric-only assertion never checks.
        // The override box's span rides the same guard as the rail's, so
        // it is named here too.
        const SUFFIXES = ['#fcu-p-cool-sp-u', '#fcu-p-deadband-u', '#fcu-ovr-unit'];
        for (const sel of SUFFIXES) {
            await expect(page.locator(sel), sel).toHaveText('°C');
        }
        await page.locator('.units-btn').filter({ hasText: 'US' }).click();
        await page.waitForTimeout(300);
        for (const sel of SUFFIXES) {
            await expect(page.locator(sel), sel + ' back in US').toHaveText('°F');
        }
    });

    test('a metric clamp holds the CANONICAL limit through the Enter double-fire', async ({ page }) => {
        // Same regression pin as the AHU page's row — the rail logic is
        // deliberately duplicated per the unit-selector precedent, so the
        // erosion needs its own pin HERE: Enter's keydown commit clamps
        // and re-expresses (85 °F → "29.4"); without the display-equality
        // no-op the native change re-parses 29.4 °C → 84.92 °F and quietly
        // undercuts the announced limit.
        await page.goto(URL);
        await page.waitForTimeout(400);
        await page.locator('.units-btn').filter({ hasText: 'Metric' }).click();
        await page.waitForTimeout(300);
        const cool = page.locator('#fcu-p-cool-sp');
        await cool.click();
        await cool.fill('29.5');                 // canonical 85.1 → clamp 85
        await cool.press('Enter');
        await page.waitForTimeout(300);
        expect(await cool.inputValue()).toBe('29.4');
        await page.locator('.units-btn').filter({ hasText: 'US' }).click();
        await page.waitForTimeout(300);
        expect(await cool.inputValue(), 'canonical held at the limit').toBe('85.0');
    });

    test('a units flip clears the rail hint, suffix and all (#276)', async ({ page }) => {
        // Twin of the AHU page's row — the rail logic is deliberately
        // duplicated per the unit-selector precedent, so the clear needs
        // its own pin HERE. #fcu-params-hint is role="status"
        // aria-live="polite" and the hint text carries a unit SUFFIX;
        // before the fix a flip while a hint was up stranded the old
        // suffix on screen, and in the accessibility tree, until the 6 s
        // auto-clear fired.
        await page.goto(URL);
        await page.waitForTimeout(400);
        const cool = page.locator('#fcu-p-cool-sp');
        await cool.click();
        await cool.fill('200');
        await cool.press('Enter');
        await page.waitForTimeout(300);
        // Anti-vacuity: the hint is UP, in US units, BEFORE the flip.
        await expect(page.locator('#fcu-params-hint')).toContainText('65.0–85.0 °F');
        await page.locator('.units-btn').filter({ hasText: 'Metric' }).click();
        await page.waitForTimeout(200);
        // Read ONCE, no retry window — the clear is synchronous inside the
        // unitschange handler, and a polling assertion given long enough
        // would race the 6 s auto-clear into a false pass.
        expect(await page.locator('#fcu-params-hint').textContent(),
            'the stale-unit sentence is gone, not re-expressed').toBe('');
    });
});

test.describe('DDC Workbench — rail ink clears the AA floor in both themes', () => {
    // Hand-written contrast rows, written while the contrast sweep
    // could not reach this page. The sweep measures it now (graduation
    // put it in tests/pages.js), but these rows stay: exact floors on
    // named ink sources localize a failure faster than the sweep's
    // page-wide walk. New ink sources: the input value
    // (accent-ink on the editwell), the label captions (text-dim) and
    // the hint line (amber-ink) — asserted at the 4.5:1 small-text
    // floor in BOTH themes. Disabled state exempt (WCAG 1.4.3
    // inactive-control exception).

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
                    return {
                        input: ratio(document.getElementById('fcu-p-cool-sp')),
                        suffix: ratio(document.getElementById('fcu-p-cool-sp-u')),
                        label: ratio(document.querySelector('label[for="fcu-p-cool-sp"]')),
                        hint: ratio(document.getElementById('fcu-params-hint')),
                        note: ratio(document.querySelector('.fcu-param-note')),
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

test.describe('DDC Workbench — one sim clock across both sheets (#234)', () => {
    // The residual two-source #234 leaves behind. That entry was about a
    // dead SPEED_MIN / SPEED_MAX pair in ddcw-fcu-unit.js, deleted with
    // this row: nothing read them, host.setSpeed() clamps nothing, and
    // the slider's own min / max were always the whole of it — so the
    // knob owns its travel, the way the fan / outdoor-air / load knobs
    // beside it already did.
    //
    // What that leaves untied is the pair that MATTERS, and it is not
    // script-versus-markup: it is SHEET versus SHEET. Both workbench
    // pages ship a sim clock, they agreed at 1…60 by coincidence, and a
    // reader who crosses the unit selector mid-thought must not find the
    // clock re-scaled under them. That is the same drift ddcw-fcu-unit's
    // OA_RAMP_RATE comment refuses for the weather model, in the same
    // words and for the same reason the two pages keep equal values there.
    //
    // NOT pinned here: the numbers themselves (1 and 60 are TUNE BY FEEL
    // — retune them together and this stays green), `step`, or `value`.
    // `value` is per-unit on purpose — it is each module's own SPEED_DEF
    // showing through, and two models are allowed to want different
    // default paces.
    //
    // Deliberately NOT the outdoor-air sliders: those diverge on purpose
    // (−20…110 on the AHU vs 55…110 here — codebase-issues #243, owner
    // decision 2026-07-30), which is exactly why this row names the sim
    // clock rather than sweeping every slider the two pages share.

    // Derived from the directory, never a list — the #235 lesson. A page
    // is in scope because it SHIPS a sim clock, so a third workbench is
    // covered the day its markup lands rather than the day someone
    // remembers this file. The mockup has no clock and drops out on its
    // own.
    function simClocks() {
        const dir = path.join(__dirname, '..', 'html', 'simulators');
        const found = [];
        for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.html'))) {
            const src = fs.readFileSync(path.join(dir, file), 'utf8');
            const m = /<input type="range" id="[a-z]+-speed-slider"([^>]*)>/.exec(src);
            if (!m) continue;
            // Anchored on whitespace so a future `data-min="…"` cannot
            // answer for `min` — the attribute-substring trap.
            const attr = (name) => {
                const a = new RegExp(`\\s${name}="(-?[\\d.]+)"`).exec(m[1]);
                if (!a) throw new Error(`${file}: sim-clock slider has no ${name}`);
                return Number(a[1]);
            };
            found.push({ file, min: attr('min'), max: attr('max') });
        }
        return found;
    }

    test('every workbench sheet offers the same sim-clock range', () => {
        const clocks = simClocks();

        // Anti-vacuity. A regex that quietly matched nothing would make
        // the parity assertion below trivially true — the exact way the
        // #235 guard could have gone silent. Two is the floor because
        // parity needs something to compare.
        expect(clocks.length,
            `expected at least 2 workbench sim clocks, found ${clocks.length}`
            + ` (${clocks.map((c) => c.file).join(', ') || 'none'})`)
            .toBeGreaterThanOrEqual(2);

        const shape = (c) => `${c.min}…${c.max}`;
        const ranges = [...new Set(clocks.map(shape))];
        expect(ranges,
            'the workbench sheets disagree on the sim-clock range: '
            + clocks.map((c) => `${c.file} ${shape(c)}`).join(' vs '))
            .toHaveLength(1);

        // And it is a real range, not two matching typos.
        for (const c of clocks) {
            expect(c.min, `${c.file}: 1× is real time and the floor`).toBe(1);
            expect(c.max, `${c.file}: the clock must fast-forward`).toBeGreaterThan(c.min);
        }
    });

    test('no unit module carries a sim-clock bounds mirror', () => {
        // The other half of #234, and the half that decays silently: a
        // future unit re-declaring SPEED_MIN / SPEED_MAX would be dead on
        // arrival for the same reason the FCU's pair was, and nothing
        // else in the suite would notice. Walks every unit module the way
        // ddcw-display-units.spec.js does, so a third unit is covered on
        // the day its file lands.
        const dir = path.join(__dirname, '..', 'html', 'scripts');
        const units = fs.readdirSync(dir).filter((f) => /^ddcw-.*-unit\.js$/.test(f));
        expect(units.length, 'no unit modules found — the walk went vacuous')
            .toBeGreaterThanOrEqual(2);

        for (const file of units) {
            const src = fs.readFileSync(path.join(dir, file), 'utf8');
            const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l));
            // SPEED_DEF is live (create() → the shell's speedDefault) and
            // stays; only the BOUNDS are banned.
            const mirror = code.filter((l) => /\bSPEED_(MIN|MAX)\b/.test(l));
            expect(mirror,
                `${file} declares a sim-clock bounds mirror nothing can read`
                + ` — the range belongs to the slider (#234): ${mirror.join(' / ')}`)
                .toHaveLength(0);

            // Anti-vacuity for the regex: the live neighbour must still be
            // there, so a rename cannot turn this row into a no-op.
            expect(code.some((l) => /\bSPEED_DEF\b/.test(l)),
                `${file}: SPEED_DEF missing — this guard's regex may be stale`)
                .toBe(true);
        }
    });
});
