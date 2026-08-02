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
// The page is deliberately hidden (eleventyExcludeFromCollections + noindex),
// so it is NOT in tests/pages.js — that manifest feeds smoke.spec.js,
// responsive.spec.js and contrast-sweep.spec.js, all of which would pull the
// page back into the crawl-facing surface. Naming the URL directly here keeps
// the coverage without un-hiding the page.
//
// Also here, for the same reason — this is the spec that already drives the
// built Unit tab: the signed coil-ΔT read of the arrival state (leaving minus
// entering, negative while cooling — owner ruling 2026-07-27), and the
// statusbar unit selector that links this page to the AHU workbench.

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
    test('arrival cooling paints a NEGATIVE ΔT that reconciles from the displayed EAT / DAT', async ({ page }) => {
        // Owner ruling 2026-07-27: ΔT = DAT − RAT, negative while
        // cooling — the sign says which way the coil drives the air.
        // Arrival state is a live cooling call (zone 76 over SP 72), so
        // once the verdict settles on the cooling line the badge must
        // read clearly negative, the mobile mirror must agree, and the
        // on-screen arithmetic must close (metric worked-example
        // rounding policy: the delta IS displayed DAT minus displayed
        // EAT, not the unrounded canonical value).
        await page.goto(URL);
        await page.waitForFunction(() =>
            document.getElementById('fcu-verdict').textContent
                .includes('Cooling — clear ΔT across the coil'));

        const vals = await page.evaluate(() => ({
            eat: document.getElementById('fcu-eat').textContent,
            dat: document.getElementById('fcu-dat').textContent,
            dt: document.getElementById('fcu-dt').textContent,
            dtR: document.getElementById('fcu-dt-r').textContent,
        }));
        expect(vals.dt, 'badge and mirror agree').toBe(vals.dtR);
        const dt = parseFloat(vals.dt);
        expect(dt, 'cooling ΔT is clearly negative').toBeLessThan(-3);
        // The displayed delta is the arithmetic of the displayed pair.
        expect(dt).toBeCloseTo(parseFloat(vals.dat) - parseFloat(vals.eat), 1);
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
        expect(chip('Y1'), 'stage 1 is still called').toContain('ON');
        expect(chip('Y2'), 'stage 2 is still called').toContain('ON');

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
    // spans all three grid rows, so it pins without any wrapper; `bottom: 0`
    // rides along because the item is CENTERED (see the page's head block).

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
// The statusbar's "which machine am I looking at" pair. Two hidden
// workbench pages, one plain anchor each way — the ruled design: not
// tabs, not a JS switch. Nothing else on this site tests a link between
// two canonical-less pages, and link-integrity.spec.js walks _site for
// broken FRAGMENTS, not for a page that quietly stops linking its
// sibling, so these rows are the only thing holding the pair together.
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
