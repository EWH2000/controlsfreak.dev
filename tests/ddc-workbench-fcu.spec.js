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

const URL = '/simulators/ddc-workbench-fcu.html';

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
        expect(cells.length, 'the whole list is still in the DOM').toBe(6);
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
        expect(quiet.length, 'three plain cells').toBe(3);
        expect(quiet.map((q) => q.id)).toEqual(['fcu-dt-r', 'fcu-fan-r', 'fcu-comp-r']);
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
            'one pixel under the cutoff the whole list is back').toBe(6);
    });

    test('the diet does not hand the fullscreen pane a horizontal scrollbar', async ({ page }) => {
        // On main this pane is clean at the default 1280×720: the last grid
        // track held a PLAIN cell, whose box has no hit-area bleed. The diet
        // makes the desktop row all buttons, so a button always holds the
        // last track — and its -0.3rem bleed poked 4.8px past the grid,
        // which the fullscreen pane (the one scrolling ancestor) rendered
        // as a horizontal scrollbar the pre-diet page never showed. The
        // diet-scoped padding-right on .fcu-points absorbs the bleed; this
        // row is what reddens if that rule is dropped.
        //
        // Deliberately NOT asserted below the cutoff, and NOT on the AHU:
        // sub-900 this page's cell mix is exactly main's, where a button
        // can land in the last track at some widths (640/700px fullscreen
        // measure the same 5px on main), and the AHU pane already scrolls
        // 5px at 1280 on main — both halves of the PRE-EXISTING overhang,
        // logged as a design call (grid padding vs. the negative margin),
        // which this row must not quietly pre-decide.
        await page.goto(URL);
        await page.click('.tool-card-fullscreen-btn');
        const over = await page.evaluate(() => {
            const pane = document.querySelector('#tab-unit');
            return pane.scrollWidth - pane.clientWidth;
        });
        expect(over, 'no horizontal scroll in the diet regime').toBe(0);
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
        // named case, closed page-locally on both workbench pages).
        await page.goto(URL);
        const links = page.locator('a.ddcw-unit-link');
        await expect(links).toHaveCount(2);
        for (let i = 0; i < 2; i++) {
            const box = await links.nth(i).boundingBox();
            expect(box.height, `link ${i} height`).toBeGreaterThanOrEqual(44);
            expect(box.width, `link ${i} width`).toBeGreaterThanOrEqual(44);
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
        expect(boxed, 'all six mirror cells occupy the grid at 375').toBe(6);
    });

    test('the rail inputs clear the 44px floor in both dimensions, and a touch commit lands', async ({ page }) => {
        await page.goto(URL);
        const inputs = page.locator('.fcu-param-input');
        await expect(inputs).toHaveCount(2);
        for (let i = 0; i < 2; i++) {
            const box = await inputs.nth(i).boundingBox();
            expect(box.height, `rail input ${i} height`).toBeGreaterThanOrEqual(44);
            expect(box.width, `rail input ${i} width`).toBeGreaterThanOrEqual(44);
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
            expect(box.height, `${sel} height`).toBeGreaterThanOrEqual(44);
            expect(box.width, `${sel} width`).toBeGreaterThanOrEqual(44);
        }
    });

    test('the fullscreen button does not paint over the title tag', async ({ page }) => {
        // This page's AIR-SIDE tag cleared the button by a measured 2px at
        // 375 before the clearance rule — one root-font bump from the
        // collision the AHU page actually shipped (18px under the button).
        await page.goto(URL);
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
        // the mirror's zone/setpoint pair, and the field itself.
        expect(await chipText(page, 'Cool SP')).toContain('75.0');
        await expect(page.locator('#fcu-zone-sp')).toHaveText('75.0 °F');
        await expect(page.locator('#fcu-zone-r')).toContainText('/ 75.0 °F');
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
        await expect(page.locator('#fcu-p-cool-sp-u')).toHaveText('°C');
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
