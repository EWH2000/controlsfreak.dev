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
// Also here: the signed coil-ΔT read of the arrival state (leaving minus
// entering, negative while cooling — owner ruling 2026-07-27), because this
// is the spec that already drives the built Unit tab.

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
