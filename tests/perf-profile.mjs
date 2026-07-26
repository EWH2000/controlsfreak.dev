// perf-profile.mjs — idle animation cost per page, for controlsfreak.dev.
//
// REPORT-ONLY. Prints tables and nothing else. No assertions, no threshold
// that fails, and deliberately NOT wired into .github/workflows/test.yml —
// see "WHY THIS IS NOT A CI GATE" below.
//
// Run modes:
//   npm run perf-profile                          full manifest, human report
//   npm run perf-profile -- --json                machine-readable rows
//   npm run perf-profile -- --only=<id>[,<id>]    a subset (control always runs)
//   npm run perf-profile -- --reps=1              faster, noisier (default 3)
//   npm run perf-profile -- --viewport=1100x900   override the viewport
//   npm run perf-profile -- --list                manifest ids + why, no browser
//
// Needs a server holding the BUILT site. `npm run dev` works; so does
// `python3 -m http.server <port> --directory _site` after `npm run build`.
// Point it with CF_BASE_URL. Ports 8000-8099 are occupied on the author's
// box, so every example here uses 9401:
//
//   npm run build && python3 -m http.server 9401 --directory _site &
//   CF_BASE_URL=http://127.0.0.1:9401 npm run perf-profile
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS
// ---------------------------------------------------------------------------
//
// Idle animation cost has regressed silently four times — codebase-issues
// #70, #109, #110, #113. Every one was found by hand, by somebody noticing a
// warm laptop or a spun-up fan, and every one shipped through a green
// `npm test`. Playwright asserts behaviour; nothing in the suite had ever
// looked at what a page costs while the user does nothing. Each fix landed
// and left no instrument behind, so the next regression started from zero
// again. This is the instrument. codebase-issues #200 carries the history.
//
// WHY THIS IS NOT A CI GATE (owner ruling, 2026-07-24)
//
// CPU numbers are machine-dependent, and a threshold over a machine-dependent
// number flakes. A flaky gate gets muted, and a muted gate is worse than no
// gate because it launders the regression it was installed to catch. So the
// script reports and a human reads it. The trigger for reading it is written
// into CLAUDE.md and repeated in codebase-issues #200: run it before merging
// any PR that touches an animation loop, a rAF/setInterval gate,
// `schematic-bg`, or the animation rules in `styles.css`.
//
// ===========================================================================
// READ THIS FIRST: CPU% INVERTS ON A SATURATED PAGE
// ===========================================================================
//
// **Do not rank rows by CPU. Rank them by FPS.** On a page whose main thread
// is already saturated, REMOVING WORK MAKES CPU% GO UP, because the freed
// thread spends the headroom rendering the frames it was dropping.
//
// The worked example, measured by this arc's optimisation lane on the
// baseline machine at 1920x1080, on `simulators/refrigerant-loop.html`, idle,
// diagram scrolled into view, 6s window, liveness asserted:
//
//     as shipped                    CPU 55.5%   fps 26    (78/78 main + 557/557 gutter moving)
//     gutter hidden                 CPU 65.0%   fps 57    (78/78 main, 0/552 gutter)
//     gutter hidden + writes off    CPU 29.9%   fps 60    (nothing moving)
//
// The middle row removed a large chunk of real work and CPU went UP nearly
// ten points, while the frame rate more than doubled. Anyone reading the CPU
// column alone would have recorded that change as a 17% regression and
// reverted a fix that made the page twice as smooth.
//
// So: FPS is the "is this bad" signal, because it is what a user perceives.
// CPU is the "what does it cost" signal, and it is only interpretable
// alongside the frame rate that produced it. The report prints them side by
// side on every row and deliberately offers no single composite score.
//
// ---------------------------------------------------------------------------
// WHAT IT MEASURES
// ---------------------------------------------------------------------------
//
// Per row: open the page, run its optional action, scroll its measured
// surface into view, assert the preconditions, then wait SETTLE_MS so the
// one-shot load work is behind us. Then two back-to-back measurement phases:
//
//   PHASE A — CPU, uninstrumented. Two CDP `Performance.getMetrics` snapshots
//   WINDOW_MS apart. Everything is a delta between them, divided by the delta
//   of the `Timestamp` metric from the SAME snapshots — numerator and
//   denominator off one monotonic clock, so no `Date.now()` skew and no CDP
//   round-trip latency leaks into the ratio. Nothing of ours is running
//   during this window; that matters most for the reduced-motion row, whose
//   whole point is reading ~0.
//
//   PHASE B — frame rate and per-frame structure. A rAF counter is started,
//   then another metrics pair FPS_WINDOW_MS apart. Gives fps, and gives the
//   layout / style-recalc counts divided by frames actually rendered.
//
// TaskDuration is reported as milliseconds of main-thread work per second of
// wall clock, which reads directly as "% of one core": 417 ms/s is 41.7%.
//
// THE THREE SIGNALS:
//
//   FPS — what the user perceives. The ranking signal (see the inversion
//   note above). Also pure host-load weather on a page with headroom, so a
//   drop from 60 to 57 means nothing and a drop from 57 to 26 means the page
//   is saturated.
//
//   CPU TIME — what the battery pays. Machine-dependent, and the noisiest
//   number here: measured across six back-to-back reps on the baseline
//   machine the control's TaskDuration/s spread 16.4% of its mean, and in a
//   busier window 40%. Interpret only alongside fps.
//
//   STRUCTURAL WORK (LayoutCount / RecalcStyleCount PER RENDERED FRAME) —
//   counts of work units, not time, and per frame rather than per second,
//   which is the whole trick. In the same six reps the frame rate ranged 31.5
//   to 58.7 fps and layouts PER FRAME held between 45.19 and 45.84 — a 1.4%
//   spread across a run where the frame rate nearly doubled. Contention costs
//   you frames, not work-per-frame, so dividing by frames divides the
//   contention out. This is the SENSITIVE detector, and it points straight at
//   this defect class: every regression in the #70/#109/#110/#113 family was
//   a loop doing more work per frame, which is exactly what it counts.
//
// ---------------------------------------------------------------------------
// FOUR THINGS THAT WILL MISLEAD YOU
// ---------------------------------------------------------------------------
//
// 1. `TaskDuration` IS MAIN-THREAD ONLY. It excludes the compositor thread,
//    raster, and the GPU process entirely. A page animated purely with CSS
//    transforms or opacity runs on the compositor and can read near ZERO here
//    while still costing real battery. A low number is evidence about the
//    main thread and nothing else — not a clean bill of health. This site's
//    motion is overwhelmingly rAF + setAttribute on SVG geometry, which IS
//    main-thread, which is why the metric is the right one HERE. It would be
//    the wrong one for a transform-driven redesign.
//
// 2. THE CONTROL MAKES THE CPU COLUMN PORTABLE, AND IT HAS A BLIND SPOT.
//    `tools/signal-scaling.html` is a plain calculator: zero
//    `requestAnimationFrame`, zero `setInterval`, zero `setTimeout` in the
//    page source (verified — grep it). Everything it costs is site-wide
//    chrome, overwhelmingly the `.schematic-bg` gutter collage. Subtracting
//    it gives a page-local cost that survives being measured on a different
//    machine, because both rows ran on the same machine in the same run.
//
//    The blind spot: a regression in the CHROME raises every row equally, so
//    every delta stays flat and the headline column shows nothing. That class
//    is visible only in the control's own ABSOLUTE row — which is
//    machine-dependent, and which is printed for exactly this reason. Note
//    also that the control is a REFERENCE, NOT A FLOOR: a delta can
//    legitimately come out negative, because gutter motifs run down the whole
//    page and flow-engine's IntersectionObserver only animates the ones near
//    the viewport, so a taller page can have fewer live at scroll 0.
//
// 3. A DISABLED ANIMATION READS EXACTLY LIKE A BRILLIANT OPTIMISATION, so
//    every row carries a mandatory liveness probe. While characterising the
//    mechanism for this script, injecting `contain: strict` on the gutter
//    motifs took the control from ~420 ms/s to ~3 ms/s — a spectacular
//    result, and a total artefact: size containment collapses the motif
//    elements, `IntersectionObserver` then reports nothing intersecting, and
//    flow-engine's #113 idle gate suspends the rAF loop. Nothing moved.
//
//    THE PROBE IS POPULATION-LEVEL, NOT A SAMPLE, and that is load-bearing.
//    Sampling one particle produced a FALSE `frozen` on refrigerant-loop:
//    `querySelector` returned a particle belonging to a legitimately
//    suspended offscreen pool while all 78 in-content particles were moving
//    normally. The probe snapshots EVERY animated element, re-snapshots
//    PROBE_MS later, and reports `moved/total` across THREE scopes, which
//    fail independently: `main` (in-content flow-engine particles), `gutter`
//    (`.schematic-bg`), and `page` (a per-entry `motionSel` covering
//    page-local rAF work that moves a transform or a path rather than a
//    flow-engine circle — ddc-workbench's marching air chevrons are why this
//    scope exists; without it that page's liveness would report only whether
//    the gutter was alive). The counts are themselves a better regression
//    signal than any boolean: a population that changes size is a change in
//    what the page animates.
//
//    A PARTIAL COUNT IS USUALLY CORRECT, NOT A FAULT. hydronic-loops reports
//    `main 46/160 · gutter 47/552` when scrolled to its first diagram: the
//    other two diagrams and most of the gutter are off screen, and
//    IntersectionObserver freezing them is the #113 fix working. The verdict
//    is per scope — a scope with elements but zero moving is the failure.
//
//    AND THE PROBE HAS A FLOOR IT CANNOT SEE UNDER: an animation whose output
//    has CONVERGED writes identical DOM forever and is indistinguishable from
//    a stopped one. function-block-editor is exactly that case — its canned
//    econ sheet settles, and its 10 Hz tick then repaints byte-identical
//    class names and value text (verified: 16 elements, ONE distinct DOM
//    state across 10s of sampling). Its manifest entry therefore declares no
//    `motionSel` and says so; adding one would fail permanently and falsely.
//    Where liveness cannot speak, the CPU and STRUCTURAL columns do.
//
// 4. CONTENT BELOW THE FOLD IS CORRECTLY FROZEN, so a row whose animated
//    surface starts off-screen measures a page that is not animating. Manifest
//    entries carry an optional `scrollTo` selector; the row scrolls it into
//    view before settling and ASSERTS that it landed in the viewport. A
//    failed precondition is printed in its own section and the row's numbers
//    are marked untrustworthy — it is not silently absorbed.
//
// THE FRAME COUNTER IS STARTED AFTER THE CPU WINDOW, DELIBERATELY.
// `Performance.getMetrics` exposes no render-frame counter (its `Frames`
// metric is the frame TREE and sits at 1), so frames are counted by a rAF
// loop of ours. That loop RE-REQUESTS, which keeps frames flowing on a page
// that would otherwise produce none — so running it during the CPU window
// would fabricate work on the reduced-motion row, the one row whose entire
// purpose is reading ~0. Phase A therefore runs clean and phase B pays for
// the counter. On a page with no animation the phase-B fps figure measures
// available HEADROOM rather than delivered animation; read it with the
// liveness column, which says whether anything was moving at all.
//
// The counter also cannot detect a SUSPENDED animation loop — it would go on
// counting its own frames. That is fine, and it is why caveat 3's liveness
// probe is a separate mechanism watching actual particle geometry. Neither
// check substitutes for the other.
//
// CPU THROTTLING IS NOT OFFERED — 1x ONLY, DELIBERATELY. Chromium's
// `Emulation.setCPUThrottlingRate` does not slow tasks down; it idles the
// scheduler BETWEEN them. Task durations therefore stay roughly put while
// wall clock stretches, so the computed FRACTION moves counter-intuitively —
// throttling can make a page look CHEAPER, the same sign error as the
// saturation inversion above. Rather than ship a flag whose direction had not
// been verified, this runs at 1x and says so.
//
// ---------------------------------------------------------------------------
// WHY A HAND-PICKED MANIFEST AND NOT THE SITEMAP
// ---------------------------------------------------------------------------
//
// `tests/screenshot-diagrams.mjs` walks `/sitemap.xml`, and that is right for
// what it does. It is wrong here: `simulators/ddc-workbench.html` is
// deliberately absent from the sitemap (it ships live-but-hidden) and it is
// the most animation-heavy page on the site — the page this whole performance
// arc exists to fix. A sitemap-driven profiler would omit it. Verified at the
// time of writing: `grep -c ddc-workbench _site/sitemap.xml` returns 0 while
// `_site/simulators/ddc-workbench.html` exists.
//
// The manifest is small on purpose. Each row earns its place with a `why`
// string that prints with the report, so a reader can tell a control from a
// sentinel from a delta pair without opening this file. Add a row when a page
// introduces a NEW animation mechanism, not when it merely has animation.
//
// ---------------------------------------------------------------------------
// BASELINE — MEASURED, NOT GUESSED
// ---------------------------------------------------------------------------
//
// RE-BASELINED 2026-07-24 at commit 5b9c457, after the whole perf arc landed
// (#427 flow-engine point table, #429 refrigerant-loop opt-in, #426 workbench
// idle gate). The original capture was taken at 12b5df3 — BEFORE any of them
// merged — so on current main every row read 90-96% under baseline and the
// report was red by default, including its own control. A report that is red
// when nothing is wrong decays exactly the way this header warns about, so
// the values below are the post-arc state: THREE full runs, mean of the three.
//
// THE TOLERANCE REGIME CHANGED WITH THEM, and this is the part worth reading.
// ±8% was derived when layouts/frame read ~46. It now reads ~2-5 on every row
// but hydronic-loops, and at that magnitude the same ABSOLUTE jitter is a huge
// percentage. Observed across the three re-baseline runs:
//
//     control      3.42 / 2.97 / 2.68      wiresheet   2.55 / 2.09 / 3.84
//     ddc unit     2.20 / 2.44 / 1.87      refrig      4.05 / 4.38 / 5.72
//     fbe          4.59 / 3.71 / 3.08      home        4.54 / 4.11 / 2.57
//     hydronic    52.02 / 49.75 / 50.79   ← PRE-#202; superseded, see below
//
// A pure percentage prints drift on nearly every run at those magnitudes. So
// the structural check now fires only when a row exceeds the percentage AND
// moves more than TOL_LAYOUTS_ABS in absolute terms.
//
// HYDRONIC-LOOPS RE-BASELINED 2026-07-25 — THIS ROW ONLY, on branch
// `issue-202/education-flow-static` off `db88b7a`. codebase-issues #202
// swept `data-flow-static="true"` onto all 197 content flow paths across the
// 15 education lessons that carry them, so the row that was the ONE outlier
// in the block above now sits with everything else. It was the only page left
// calling getPointAtLength() per particle per frame; the sweep is why it
// moved, and the move is the point of the change rather than a surprise.
// Measured with the same settings as the 2026-07-24 capture, on the same
// machine, three full runs, mean of the three:
//
//     layouts/frame   4.69 / 2.62 / 4.75   → mean 4.02   (was 50.97)
//     Δ control       97.4 / 60.3 / 104.5  → mean 87.4   (was 164.5)
//     fps             60.1 / 58.1 /  58.7  → mean 59.0   (was 59.6)
//
// A BEFORE run on the same server, same session, immediately prior to the
// sweep measured 49.87 layouts/frame — so the delta is this branch's, not the
// recorded baseline's. Liveness was byte-identical before and after (main
// 46/160 · gutter 47/552), which is what rules out the caveat-3 artefact:
// the loop is still animating the same population, it is just no longer
// re-reading the geometry it already knows.
//
// NO TOLERANCE CHANGED, and the arithmetic for that is worth keeping. The
// three samples spread 2.13 in absolute terms, which LOOKS wider than the
// ±2.0 floor — but the floor is measured against the mean, and the worst
// deviation from 4.02 is 1.40, inside it. The CPU column's worst deviation
// from its mean is 27.1 ms/s against ±110. So this row now behaves like the
// other low rows the floor was designed for. If a fourth run flags it,
// widen the floor and record the observation per the note below — do not
// quietly nudge the baseline to meet the run.
//
// HOW THE FLOOR WAS SET, INCLUDING THE MISTAKE. It was first derived from two
// runs, which gave a max low-row spread of 0.88 and a floor of 1.0. A third
// run immediately falsified that — four rows flagged, worst deviation from
// the mean 1.17 (home) — so the floor went to 2.0. This is the same error the
// arc had already documented for the CPU column ("run it twice" understates
// the spread), applied to the CPU column and then not to this one. If a
// FOURTH run flags a row that nothing else explains, widen the floor and add
// the observation here; do not treat it as a regression. Two data points
// cannot characterise noise on a machine this contended.
//
// ONE ROW HAS ALREADY TRIPPED THAT PROTOCOL AND IS DELIBERATELY NOT WIDENED:
// `ddc-workbench-unit`. Its observations sit on the BASELINE row itself
// rather than here, because that is where a reader holding a red number is
// looking; codebase-issues #214 carries the same record. Read that comment
// before acting on a drift there — the row's baseline is not trusted, and
// widening its floor without a measurement session would hide the open
// question rather than settle it.
//
// Original capture (kept for provenance) was on `command.home.arpa` — Fedora
// 44, and NOT an idle
// machine: it runs the household service stack (caddy, several rootless
// podman apps, clickhouse, kafka, goflow2, grafana, pmcd) continuously, plus
// three sibling agent lanes of this same arc during capture. Load average
// ranged 1.6 to 9.7 over the session. That is the machine this instrument
// will actually be run on, so the noise below is real operating noise, not a
// best case.
//
// Settings: chromium headless, 1x CPU, dark, 1920x1080, settle 3000ms, CPU
// window 6000ms, fps window 2000ms, probe 500ms, reps 3 (median by CPU).
//
// HOW THE TOLERANCES WERE DERIVED. Three full manifest runs back to back —
// 24 row-measurements per metric — plus separate six-rep single-page runs to
// characterise the raw per-measurement spread. For each row, the range across
// the three runs' MEDIANS; the tolerance is the worst row's range rounded up.
//
//   metric                       worst row       range          TOLERANCE
//   Δ control, TaskDuration      hydronic-loops  99.6 ms/s      ±110 ms/s
//   layouts per rendered frame   ddc Unit        6.6%           ±8%
//   fps                          home            59.8%          (none — see below)
//
// FPS GETS NO TOLERANCE, DELIBERATELY. It is the ranking signal WITHIN a run
// and pure host-load weather ACROSS runs: home measured 18.6 / 45.2 / 45.7
// over the three, and hydronic-loops 26.9 / 58.3 / 59.4. Its baseline is
// printed for orientation only. To compare frame rates, compare two
// configurations measured BACK TO BACK on a quiet machine — which is what the
// CPU-inversion experiment at the top of this file did.
//
// WHY REPS DEFAULTS TO 3. The raw per-measurement spread is large and it is a
// property of the host, not the browser: six back-to-back reps of the control
// gave TaskDuration/s from 381.8 to 450.9 (16.4% of the mean), and in a
// busier window 379.8 to 570.8 (40%). Median-of-3 over those same six
// samples collapses the range from 69.1 ms/s to 38.0. Structural work needs
// no such help — in a run where the frame rate ranged 31.5 to 58.7 fps,
// layouts per frame held between 45.19 and 45.84.
//
// READ THE TOLERANCES HONESTLY. ±110 ms/s on the CPU column is wide enough to
// hide a real regression; that is the measurement, not a design choice, and
// it is the argument for reading the structural column — whose ±8% catches
// far more — and the LIVENESS counts, which came out essentially determinate
// across all three runs (gutter 44/552 on every gutter-only row, main 78/78
// on refrigerant-loop, page 26/26 on both ddc rows, every run). A drift
// inside tolerance is not evidence of no change; it is an absence of evidence
// of change.
//
// RE-BASELINING. These are this machine's numbers. On different hardware the
// CPU column will not match and that is expected — re-run three times,
// confirm the spread, and rewrite this block with your own date, commit, and
// machine. Do not adjust a tolerance to make a red row go away; that is how a
// guard decays into decoration.
//
// ---------------------------------------------------------------------------

'use strict';

import { chromium } from '@playwright/test';

const BASE = process.env.CF_BASE_URL || 'http://localhost:8000';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const listOnly = args.includes('--list');
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

// 1920x1080 is the baseline: it is the common desktop size, it is what this
// arc's optimisation lane measures at, and it is where `.schematic-bg` is at
// full width — the strip is `min(340px, (100vw - 1180px) / 2)`, so it is
// 340px here against 130px at 1440. Measuring the gutter at a third of its
// real width would understate the dominant idle cost on the site. The strip
// is `display: none` below 1240px (styles.css), so `--viewport=1100x900` is
// the way to see that decomposition on purpose: the control drops to near
// zero and its gutter liveness reads 0/0.
const DEFAULT_VIEWPORT = { width: 1920, height: 1080 };
const SETTLE_MS = 3000;        // > the 3000ms sbg draw-in transition + entrance anims
const WINDOW_MS = 6000;        // phase A: steady-state CPU window
const FPS_WINDOW_MS = 2000;    // phase B: frame rate + per-frame structure
const PROBE_MS = 500;          // liveness re-snapshot gap
const DEFAULT_REPS = 3;        // median-of-N; see BASELINE for why N is not 1

const PARTICLE_SEL = 'g.flow-particles circle';

function parseViewport(spec) {
    const m = /^(\d+)x(\d+)$/.exec(spec || '');
    return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
}

const VIEWPORT = parseViewport(flag('viewport')) || DEFAULT_VIEWPORT;
const REPS = Math.max(1, Number(flag('reps')) || DEFAULT_REPS);

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------
//
// Per entry:
//   motion    'moving' — every non-empty particle scope must be moving
//             'none'   — no particles at all is the correct reading
//   action    optional async (page) => {} run before settling
//   scrollTo  optional selector scrolled into view, then asserted in-viewport
//   assert    optional async (page) => string|null returning an error message

const MANIFEST = [
    {
        id: 'signal-scaling',
        path: '/tools/signal-scaling.html',
        label: 'tools/signal-scaling.html',
        control: true,
        motion: 'moving',
        why: 'THE CONTROL. A plain calculator — no requestAnimationFrame, no setInterval, '
            + 'no setTimeout in the page source. Whatever it costs is site-wide chrome, '
            + 'almost all of it the .schematic-bg gutter. Every delta below subtracts it.',
    },
    {
        id: 'ddc-workbench-unit',
        path: '/simulators/ddc-workbench.html',
        label: 'simulators/ddc-workbench.html (Unit)',
        motion: 'moving',
        scrollTo: '#tab-unit',
        motionSel: '.fcu-chevron',
        why: 'The most animation-heavy page on the site and the reason this arc exists. '
            + 'Absent from the sitemap (ships live-but-hidden), so only a hand-picked '
            + 'manifest reaches it — a sitemap walker would skip the whole point.',
    },
    {
        id: 'ddc-workbench-wiresheet',
        path: '/simulators/ddc-workbench.html',
        label: 'simulators/ddc-workbench.html (Wiresheet)',
        motion: 'moving',
        action: async (page) => { await page.click('.tabs.tabs-flush [data-tab="wiresheet"]'); },
        assert: async (page) => (await page.locator('#tab-wiresheet').evaluate((el) => el.classList.contains('active'))
            ? null : 'the wiresheet pane never became active — the tab click did not take'),
        scrollTo: '#tab-wiresheet',
        why: 'Same page, one click away from the row above. The pair is a controlled '
            + 'experiment — identical load, identical chrome, one tab swap — so the '
            + 'DIFFERENCE BETWEEN THESE TWO ROWS is what a wiresheet-side change moved. '
            + 'NO motionSel, deliberately — same reason as the FBE row below, reached by '
            + 'a different route. The obvious pick, .fcu-chevron, is WRONG here: every '
            + 'chevron lives in #fcu-flow inside #tab-unit, the pane this row makes '
            + 'display:none. It reads alive today only because the chevron rAF loop keeps '
            + 'writing transforms into a hidden pane — i.e. it certifies liveness of the '
            + 'pane this row is not about. Once that loop is idle-gated the same selector '
            + 'reads 0 and prints "expected moving", calling a CORRECT idle gate a broken '
            + 'animation. Repointing it at the wiresheet pane fails too: nothing inside '
            + '#tab-wiresheet changes within PROBE_MS (verified — only 2 .fbe-block-val '
            + 'nodes move, and not until ~4s). This row is watched via CPU, STRUCTURAL '
            + 'and the gutter scope.',
    },
    {
        id: 'refrigerant-loop',
        path: '/simulators/refrigerant-loop.html',
        label: 'simulators/refrigerant-loop.html',
        motion: 'moving',
        scrollTo: '#rl-cycle',
        why: 'The flagship sim — a continuous physics tick plus an animated cycle '
            + 'schematic and live gauges. The page the CPU-inversion worked example at '
            + 'the top of this file was measured on: it SATURATES, so read its fps first.',
    },
    {
        id: 'function-block-editor',
        path: '/simulators/function-block-editor.html',
        label: 'simulators/function-block-editor.html',
        motion: 'moving',
        why: 'REGRESSION SENTINEL for codebase-issues #110. Its 10 Hz sim loop lives in '
            + 'the shared /scripts/fbe-editor.js (extracted from the page by #196) and '
            + 'carries the #110 document.hidden guard plus a min-width:1000px gate — so '
            + 'the fix now sits in a module several pages could reach, not in one page. '
            + 'NO motionSel, deliberately: the canned econ sheet CONVERGES, so the tick '
            + 'writes byte-identical class names and value text forever (verified — 16 '
            + 'elements, one distinct DOM state across 10s of sampling). Liveness here '
            + 'can only speak for the gutter; this row is watched via CPU and STRUCTURAL. '
            + 'Do not add a motionSel to "fix" it — it would fail permanently and falsely.',
    },
    {
        id: 'hydronic-loops',
        path: '/education/hydronic-loops.html',
        label: 'education/hydronic-loops.html',
        motion: 'moving',
        scrollTo: 'svg.edu-svg',
        why: 'The lesson archetype with in-content particle flow — the common case across '
            + 'the education chapters, and the shape a flow-engine change reaches widest. '
            + 'Its diagrams start below the fold, hence the scrollTo.',
    },
    {
        id: 'home',
        path: '/',
        label: '/ (home)',
        motion: 'moving',
        why: 'Highest-traffic page on the site and the only landing with an interactive '
            + 'hero. Whatever this row says is the first thing a visitor pays.',
    },
    {
        id: 'signal-scaling-reduced-motion',
        path: '/tools/signal-scaling.html',
        label: 'tools/signal-scaling.html (reduced-motion)',
        reducedMotion: 'reduce',
        motion: 'none',
        why: 'The control again under prefers-reduced-motion. flow-engine bails before '
            + 'injecting anything, so this row should read near zero AND report zero '
            + 'particles. If it ever reports particles moving, the reduced-motion gate '
            + 'is broken. Its fps reads available headroom, not delivered animation.',
    },
];

// ---------------------------------------------------------------------------
// Baseline + tolerance — see the BASELINE section of the header for the
// machine, the date, and how these were measured.
// ---------------------------------------------------------------------------

const BASELINE = {
    'signal-scaling':                { deltaTask: 0.0, fps: 59.7, layoutsPerFrame: 2.87 },
    // KNOWN-UNTRUSTWORTHY BASELINE — a DRIFT on this row means nothing until
    // the question below is answered, so do not read one as a regression
    // (codebase-issues #214). Two observations, recorded here because the
    // protocol says they belong next to the row they haunt:
    //
    //   1. 2.23 came from capture samples 2.20 / 2.44 / 1.87, and the row has
    //      flagged over-tolerance on BOTH runs since — 4.34 and 4.67
    //      layouts/frame.
    //   2. Noise at this magnitude explains the SIZE of that gap and not its
    //      ORDERING: the recorded 2.23 sits BELOW the control's 2.87, i.e.
    //      the most animation-heavy page on the site doing less structural
    //      work per frame than a plain calculator, while both later runs sit
    //      above it.
    //
    // A missing idle gate is RULED OUT — the capture was taken at the #426
    // idle-gate merge, not before it. The remaining candidate is a page-state
    // precondition difference between the capture and the later runs, and
    // WHICH precondition is unresolved and open.
    //
    // NOT WIDENED, DELIBERATELY. The protocol in the header has two halves —
    // widen the floor AND record the observation — and the widen half needs a
    // measurement session (three fresh runs, characterised machine) that the
    // pass writing this did not do. Widening a tolerance around a baseline
    // nobody trusts hides the question instead of answering it, which is the
    // decay the RE-BASELINING note warns about. So the observation lands and
    // the numbers stay exactly where they were.
    'ddc-workbench-unit':            { deltaTask: 89.4, fps: 58.6, layoutsPerFrame: 2.23 },
    // Two rows carry their own wider absolute floor. Both animate
    // CONVERGENTLY and event-driven rather than steady-state, so their
    // per-frame layout count is genuinely unstable run to run — not noise in
    // the instrument. Observed across four re-baseline runs:
    //   wiresheet  2.55 / 2.09 / 3.84 / 5.23   (range 3.14)
    //   fbe        4.59 / 3.71 / 3.08 / 1.00   (range 3.59)
    // Widening the GLOBAL floor to cover them would blind every steady-state
    // row, which is where this column earns its keep. If either settles down
    // later, tighten it back and say so here.
    'ddc-workbench-wiresheet':       { deltaTask: 18.8, fps: 53.1, layoutsPerFrame: 3.43, tolLayoutsAbs: 4.0 },
    'refrigerant-loop':              { deltaTask: 97.3, fps: 47.3, layoutsPerFrame: 4.44 },
    'function-block-editor':         { deltaTask: -35.2, fps: 46.8, layoutsPerFrame: 3.10, tolLayoutsAbs: 4.0 },
    // Re-baselined 2026-07-25 for the #202 education point-table sweep —
    // this row only. Three-run samples + why it moved are in the BASELINE
    // section of the header.
    'hydronic-loops':                { deltaTask: 87.4, fps: 59.0, layoutsPerFrame: 4.02 },
    'home':                          { deltaTask: -51.2, fps: 46.3, layoutsPerFrame: 3.79 },
    'signal-scaling-reduced-motion': { deltaTask: -321.1, fps: 60.1, layoutsPerFrame: 0.00 },
};

// Worst observed range across three full runs was 99.6 ms/s and 6.6%; both
// rounded up. Derivation and the raw spreads are in the BASELINE section of
// the header. fps carries no tolerance on purpose — see the same section.
const TOL_DELTA_TASK_MS_PER_S = 110;   // CPU column, absolute ms/s
const TOL_LAYOUTS_PCT = 8;             // structural column, % of baseline
const TOL_LAYOUTS_ABS = 2.0;           // ...and an absolute floor, see below

// ---------------------------------------------------------------------------
// Measurement
// ---------------------------------------------------------------------------

const TIME_KEYS = ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration'];
const COUNT_KEYS = ['LayoutCount', 'RecalcStyleCount'];

const toObject = (metrics) => Object.fromEntries(metrics.map((m) => [m.name, m.value]));
const sleep = (page, ms) => page.evaluate((n) => new Promise((r) => setTimeout(r, n)), ms);

// Population liveness probe. Runs ENTIRELY inside one page.evaluate so it can
// hold ELEMENT IDENTITY across the two samples, which is load-bearing and was
// learned the hard way: the first cut snapshotted two arrays in document
// order and compared them index by index. flow-engine creates and retires
// pulse circles into the same `g.flow-particles` layer as the steady
// particles (flow-engine.js:639 vs :434), so the population changes size
// mid-probe — and a few insertions near the front shift every later index,
// making a nearly-still gutter report 552/562 moved. Comparing per element,
// and counting only elements present in BOTH samples, removes the artefact
// entirely; appearances and disappearances are reported separately as churn.
//
// Three scopes, because they fail independently:
//   main   — in-content flow-engine particles
//   gutter — `.schematic-bg` particles
//   page   — a per-entry `motionSel`, covering page-local rAF work that moves
//            a transform / path / dash offset rather than a flow-engine
//            circle. ddc-workbench's marching air chevrons are why this
//            exists: without it that page's liveness would report only
//            whether the GUTTER was alive, which says nothing about the page
//            this arc is here to fix.
const PROBE_FN = async ({ particleSel, motionSel, ms }) => {
    const geom = (el) => (el.tagName === 'circle'
        ? `${el.getAttribute('cx')},${el.getAttribute('cy')}`
        : [
            el.getAttribute('transform'), el.style.transform,
            el.getAttribute('d'), el.getAttribute('points'),
            el.getAttribute('cx'), el.getAttribute('cy'),
            el.getAttribute('x'), el.getAttribute('y'),
            el.getAttribute('stroke-dashoffset'), el.style.strokeDashoffset,
            // Not every animation moves geometry — a DDC-style readout
            // animates by repainting a class name and a value string. Both
            // count.
            el.getAttribute('class'), el.textContent,
        ].join('|'));

    const collect = () => {
        const out = { main: [], gutter: [], page: [] };
        document.querySelectorAll(particleSel).forEach((c) => {
            (c.closest('.schematic-bg') ? out.gutter : out.main).push(c);
        });
        if (motionSel) document.querySelectorAll(motionSel).forEach((el) => out.page.push(el));
        return out;
    };

    const scopes = ['main', 'gutter', 'page'];
    const first = collect();
    const seen = {};
    for (const s of scopes) seen[s] = new Map(first[s].map((el) => [el, geom(el)]));

    await new Promise((r) => setTimeout(r, ms));

    const second = collect();
    const result = {};
    for (const s of scopes) {
        let moved = 0;
        let compared = 0;
        for (const el of second[s]) {
            if (!seen[s].has(el)) continue;
            compared += 1;
            if (seen[s].get(el) !== geom(el)) moved += 1;
        }
        result[s] = {
            moved,
            total: compared,
            churn: (first[s].length - compared) + (second[s].length - compared),
        };
    }
    return result;
};

const SCOPES = ['main', 'gutter', 'page'];

async function measureOnce(browser, entry) {
    const context = await browser.newContext({
        viewport: VIEWPORT,
        // Headless Chromium reports prefers-color-scheme: light. The site's
        // default (and its heavier register) is dark, so pin it — otherwise
        // this profiles a theme almost nobody runs.
        colorScheme: 'dark',
        reducedMotion: entry.reducedMotion || 'no-preference',
    });

    // MUST be an init script. A PerformanceObserver installed after
    // page.goto() resolves has already missed the load phase, which is the
    // half of the timeline the buffered longtask entries exist to show.
    await context.addInitScript(() => {
        window.__cfLongTasks = [];
        try {
            new PerformanceObserver((list) => {
                for (const e of list.getEntries()) window.__cfLongTasks.push(e.duration);
            }).observe({ type: 'longtask', buffered: true });
        } catch (err) {
            window.__cfLongTaskError = String(err);
        }
    });

    const page = await context.newPage();
    await page.goto(BASE + entry.path, { waitUntil: 'load' });

    const preconditions = [];

    if (entry.action) {
        await sleep(page, 250);
        await entry.action(page);
    }
    if (entry.assert) {
        const err = await entry.assert(page).catch((e) => String(e.message || e));
        if (err) preconditions.push(err);
    }

    // Caveat 4: below-the-fold animation is CORRECTLY frozen by
    // IntersectionObserver, so scroll the measured surface in and PROVE it
    // landed. A silently-unscrolled row would report a still page as cheap.
    if (entry.scrollTo) {
        const inView = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el) return 'missing';
            el.scrollIntoView({ block: 'center', behavior: 'instant' });
            const r = el.getBoundingClientRect();
            return (r.bottom > 0 && r.top < window.innerHeight) ? 'ok' : 'offscreen';
        }, entry.scrollTo);
        if (inView === 'missing') preconditions.push(`scrollTo selector "${entry.scrollTo}" matched nothing`);
        if (inView === 'offscreen') preconditions.push(`scrollTo "${entry.scrollTo}" did not land in the viewport`);
    }

    // Settle past the one-shot work: the 3000ms schematic-bg draw-in
    // transition, .tool-card entrance animations, first-paint layout, and any
    // IntersectionObserver callbacks the scroll above just queued.
    await sleep(page, SETTLE_MS);

    // Advisory only — long tasks from navigation through the settle window.
    const loadLongTasks = await page.evaluate(() => (window.__cfLongTasks || []).slice());

    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    const metrics = async () => toObject((await cdp.send('Performance.getMetrics')).metrics);

    // ── Phase A: CPU, with nothing of ours running ─────────────────────────
    const a0 = await metrics();
    await sleep(page, WINDOW_MS);
    const a1 = await metrics();

    // The Timestamp metric is the denominator on purpose: same monotonic
    // clock as the numerators, same two snapshots.
    const wallSec = a1.Timestamp - a0.Timestamp;
    const perSecond = {};
    for (const k of TIME_KEYS) perSecond[k] = wallSec > 0 ? ((a1[k] - a0[k]) / wallSec) * 1000 : NaN;
    for (const k of COUNT_KEYS) perSecond[k] = wallSec > 0 ? (a1[k] - a0[k]) / wallSec : NaN;

    // ── Phase B: frame rate + per-frame structure ──────────────────────────
    await page.evaluate(() => {
        window.__cfFrames = 0;
        const tick = () => { window.__cfFrames += 1; requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
    });
    const b0 = await metrics();
    const f0 = await page.evaluate(() => window.__cfFrames);
    await sleep(page, FPS_WINDOW_MS);
    const b1 = await metrics();
    const f1 = await page.evaluate(() => window.__cfFrames);

    const fpsWallSec = b1.Timestamp - b0.Timestamp;
    const frames = f1 - f0;
    const fps = fpsWallSec > 0 ? frames / fpsWallSec : NaN;
    const perFrame = {};
    for (const k of COUNT_KEYS) perFrame[k] = frames > 0 ? (b1[k] - b0[k]) / frames : NaN;

    // ── Liveness: population, not a sample (caveat 3) ──────────────────────
    const liveness = await page.evaluate(PROBE_FN, {
        particleSel: PARTICLE_SEL,
        motionSel: entry.motionSel || null,
        ms: PROBE_MS,
    });

    await context.close();

    const totalParticles = SCOPES.reduce((n, s) => n + liveness[s].total, 0);
    const anyDead = SCOPES.some((s) => liveness[s].total > 0 && liveness[s].moved === 0);
    const motionOk = entry.motion === 'moving'
        ? totalParticles > 0 && !anyDead
        : totalParticles === 0;

    return {
        wallSec,
        perSecond,
        fps,
        frames,
        perFrame,
        liveness,
        totalParticles,
        motionOk,
        preconditions,
        loadLongTasks: {
            count: loadLongTasks.length,
            totalMs: loadLongTasks.reduce((s, d) => s + d, 0),
            maxMs: loadLongTasks.length ? Math.max(...loadLongTasks) : 0,
        },
    };
}

// Median by TaskDuration, and then the WHOLE rep is reported — not a
// per-metric median. Mixing the layout count from one rep with the task time
// from another produces a row that never happened, and the ratios between
// columns are half of what makes the report readable.
async function measureRow(browser, entry) {
    const reps = [];
    for (let i = 0; i < REPS; i += 1) reps.push(await measureOnce(browser, entry));
    const ordered = [...reps].sort((a, b) => a.perSecond.TaskDuration - b.perSecond.TaskDuration);
    const chosen = ordered[Math.floor((ordered.length - 1) / 2)];
    const tasks = ordered.map((r) => r.perSecond.TaskDuration);
    const allFps = reps.map((r) => r.fps).sort((a, b) => a - b);

    return {
        id: entry.id,
        label: entry.label,
        path: entry.path,
        why: entry.why,
        control: !!entry.control,
        motionExpected: entry.motion,
        reps: REPS,
        // The spread across this row's own reps. Printed because it is the
        // reader's on-the-spot check that the machine was quiet enough for
        // the run to mean anything — if repSpread rivals the drift, stop.
        repSpreadTaskMsPerS: tasks[tasks.length - 1] - tasks[0],
        repSpreadFps: allFps[allFps.length - 1] - allFps[0],
        // Preconditions and liveness are unioned across reps, not medianed:
        // one bad rep out of three still means a measurement went wrong.
        preconditions: [...new Set(reps.flatMap((r) => r.preconditions))],
        motionOkAllReps: reps.every((r) => r.motionOk),
        ...chosen,
    };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const f2 = (n) => (Number.isFinite(n) ? n.toFixed(2) : '—');
const f1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : '—');
const signed = (n) => (Number.isFinite(n) ? (n >= 0 ? '+' : '') + n.toFixed(1) : '—');
const pad = (s, w) => String(s).padEnd(w);
const lpad = (s, w) => String(s).padStart(w);

const W = 44;
const rule = (extra) => '─'.repeat(W + extra);

const livenessCell = (r) => {
    const shown = ['main', 'gutter', 'page'].filter((s) => r.liveness[s].total > 0);
    if (!shown.length) return 'nothing animating';
    return shown.map((s) => `${s} ${r.liveness[s].moved}/${r.liveness[s].total}`
        + (r.liveness[s].churn ? ` (+${r.liveness[s].churn} churn)` : '')).join(' · ');
};

function selectedEntries() {
    const only = flag('only');
    if (!only) return MANIFEST;
    const ids = new Set(only.split(',').map((s) => s.trim()));
    // The control always runs: without it there is no delta column, and the
    // delta column is the only machine-portable number in the report.
    return MANIFEST.filter((e) => e.control || ids.has(e.id));
}

async function preflight() {
    // Fail fast and NAME THE URL. A profiler pointed at a dead port that
    // hangs — or worse, prints a table of zeros — is a trap: zeros look like
    // a wonderful result.
    try {
        const res = await fetch(`${BASE}/sitemap.xml`, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
        return `cannot reach ${BASE} (${err.message}) — is a server holding _site running there?\n\n`
            + '  npm run build && python3 -m http.server 9401 --directory _site &\n'
            + '  CF_BASE_URL=http://127.0.0.1:9401 npm run perf-profile';
    }
    return null;
}

async function main() {
    const entries = selectedEntries();

    if (listOnly) {
        for (const e of entries) {
            console.log(`${e.id}${e.control ? '  [CONTROL]' : ''}`);
            console.log(`    ${e.path}`);
            console.log(`    ${e.why}\n`);
        }
        return;
    }

    const problem = await preflight();
    if (problem) {
        console.log('perf-profile — ABORTED BEFORE MEASURING');
        console.log(problem);
        // Not a finding, an operator error: the run could not happen at all.
        // Measurements never set a failing code (that is what report-only
        // means) — this is the one thing that does, and it is the same call
        // tests/screenshot-diagrams.mjs makes on an unreachable sitemap.
        process.exitCode = 1;
        return;
    }

    const browser = await chromium.launch();
    const rows = [];
    // try/finally, not a bare sequence: when a row throws mid-run — the server
    // going away under it is the realistic case — an unclosed browser keeps
    // the Node process alive forever, so the script neither reports nor
    // exits. Caught exactly that way while baselining.
    try {
        for (const entry of entries) rows.push(await measureRow(browser, entry));
    } finally {
        await browser.close();
    }

    const control = rows.find((r) => r.control);
    for (const r of rows) {
        const base = BASELINE[r.id] || {};
        r.deltaTask = control ? r.perSecond.TaskDuration - control.perSecond.TaskDuration : NaN;
        r.baseDeltaTask = typeof base.deltaTask === 'number' ? base.deltaTask : null;
        r.driftTask = r.baseDeltaTask === null ? NaN : r.deltaTask - r.baseDeltaTask;
        r.taskOverTolerance = Number.isFinite(r.driftTask)
            && Math.abs(r.driftTask) > TOL_DELTA_TASK_MS_PER_S;

        r.baseFps = typeof base.fps === 'number' ? base.fps : null;
        r.baseLayoutsPerFrame = typeof base.layoutsPerFrame === 'number' ? base.layoutsPerFrame : null;
        r.driftLayoutsPct = r.baseLayoutsPerFrame
            ? ((r.perFrame.LayoutCount - r.baseLayoutsPerFrame) / r.baseLayoutsPerFrame) * 100
            : NaN;
        // Tolerance is percentage OR an absolute floor, whichever is looser.
        // The percentage alone was derived when this column read ~46; after
        // the 2026-07-24 arc most rows read ~2-4, where the SAME absolute
        // jitter is 15-24% and would print drift on every run. See BASELINE.
        const absTol = typeof base.tolLayoutsAbs === 'number' ? base.tolLayoutsAbs : TOL_LAYOUTS_ABS;
        r.layoutsOverTolerance = Number.isFinite(r.driftLayoutsPct)
            && Math.abs(r.driftLayoutsPct) > TOL_LAYOUTS_PCT
            && Math.abs(r.perFrame.LayoutCount - r.baseLayoutsPerFrame) > absTol;
    }

    if (asJson) {
        console.log(JSON.stringify({
            base: BASE,
            viewport: VIEWPORT,
            settleMs: SETTLE_MS,
            windowMs: WINDOW_MS,
            fpsWindowMs: FPS_WINDOW_MS,
            probeMs: PROBE_MS,
            reps: REPS,
            tolerance: { deltaTaskMsPerS: TOL_DELTA_TASK_MS_PER_S, layoutsPct: TOL_LAYOUTS_PCT, layoutsAbs: TOL_LAYOUTS_ABS },
            units: {
                fps: 'rendered frames per second — THE RANKING SIGNAL; CPU% inverts on a saturated page',
                perSecond_TaskDuration: 'ms of main-thread work per second of wall clock (1000 = one core)',
                perFrame_LayoutCount: 'layouts per rendered frame — the contention-resistant detector',
                liveness: 'moved/total particles, split main (in-content) vs gutter (.schematic-bg)',
            },
            rows,
        }, null, 2));
        return;
    }

    console.log('perf-profile — idle animation cost per page (REPORT-ONLY, never fails)');
    console.log(`base ${BASE} · chromium headless · 1x CPU · dark · viewport ${VIEWPORT.width}x${VIEWPORT.height}`);
    console.log(`settle ${SETTLE_MS}ms · cpu window ${WINDOW_MS}ms · fps window ${FPS_WINDOW_MS}ms`);
    console.log(`liveness probe ${PROBE_MS}ms · reps ${REPS} (median by CPU)\n`);
    console.log('RANK BY FPS, NOT BY CPU. On a saturated page, removing work raises CPU%');
    console.log('because the freed thread renders the frames it was dropping — measured on');
    console.log('refrigerant-loop: hiding the gutter took CPU 55.5% -> 65.0% while fps went');
    console.log('26 -> 57. Reading CPU alone scores that improvement as a regression.');
    console.log('CPU units: ms of main-thread work per second of wall. 1000 = one full core.\n');

    // ── Headline ───────────────────────────────────────────────────────────
    console.log('══ HEADLINE — fps first, then CPU relative to the control ══');
    console.log('Δ CTRL subtracts the control measured on this machine in this run, which is');
    console.log('what makes it portable. It is also the noisiest column here: check REP SPR,');
    console.log('the range across a row\'s own repetitions, before believing a DRIFT.\n');
    console.log(`${pad('ROW', W)} ${lpad('FPS', 6)} ${lpad('BASE', 6)} ${lpad('Δ CTRL', 8)} ${lpad('BASE', 8)} ${lpad('DRIFT', 8)} ${lpad('REP SPR', 8)}`);
    console.log(rule(50));
    for (const r of rows) {
        if (r.control) continue;
        console.log(
            `${pad(r.label, W)} ${lpad(f1(r.fps), 6)} ${lpad(r.baseFps === null ? '—' : f1(r.baseFps), 6)}`
            + ` ${lpad(signed(r.deltaTask), 8)}`
            + ` ${lpad(r.baseDeltaTask === null ? '—' : signed(r.baseDeltaTask), 8)}`
            + ` ${lpad(signed(r.driftTask), 8)} ${lpad(f1(r.repSpreadTaskMsPerS), 8)}`
            + `${r.taskOverTolerance ? '  << cpu over tolerance' : ''}`,
        );
    }
    console.log(`\n  CPU tolerance ±${TOL_DELTA_TASK_MS_PER_S} ms/s — measured, not guessed. See BASELINE in the header.`);
    console.log('  A row well under 60 fps is saturated; read its CPU number only in that light.');

    if (control) {
        console.log(`\n  CONTROL ABSOLUTE: ${f1(control.perSecond.TaskDuration)} ms/s`
            + `  ·  ${f1(control.fps)} fps  ·  ${f2(control.perFrame.LayoutCount)} layouts/frame`);
        console.log('  MACHINE-DEPENDENT — this one does not travel. It is printed because a');
        console.log('  regression in SITE-WIDE chrome (schematic-bg, flow-engine, an animation');
        console.log('  rule in styles.css) raises every row equally and leaves every delta above');
        console.log('  flat. That class is visible here and nowhere else in this report.');
    }

    // ── Structural ─────────────────────────────────────────────────────────
    console.log('\n══ STRUCTURAL — work units PER RENDERED FRAME, the sensitive detector ══');
    console.log('Counts, not time, and per frame rather than per second: contention costs you');
    console.log('frames, not work-per-frame, so dividing by frames divides it out. Measured on');
    console.log('the baseline machine across six reps where the frame rate ranged 31.5-58.7');
    console.log('fps, layouts per frame held to 1.4%. Every regression in the');
    console.log('#70/#109/#110/#113 family was a loop doing more work per frame — this column.\n');
    console.log(`${pad('ROW', W)} ${lpad('LAYOUT/f', 9)} ${lpad('BASE', 9)} ${lpad('DRIFT', 8)} ${lpad('STYLE/f', 9)}`);
    console.log(rule(40));
    for (const r of rows) {
        console.log(
            `${pad(r.label + (r.control ? ' [CTRL]' : ''), W)} ${lpad(f2(r.perFrame.LayoutCount), 9)}`
            + ` ${lpad(r.baseLayoutsPerFrame === null ? '—' : f2(r.baseLayoutsPerFrame), 9)}`
            + ` ${lpad(Number.isFinite(r.driftLayoutsPct) ? `${signed(r.driftLayoutsPct)}%` : '—', 8)}`
            + ` ${lpad(f2(r.perFrame.RecalcStyleCount), 9)}`
            + `${r.layoutsOverTolerance ? '  << over tolerance' : ''}`,
        );
    }
    console.log(`\n  tolerance ±${TOL_LAYOUTS_PCT}% of baseline AND ±${TOL_LAYOUTS_ABS.toFixed(1)} absolute —`
        + ` both must be exceeded. Most rows now sit near 3, where percentage alone is noise.`);

    // ── Liveness ───────────────────────────────────────────────────────────
    console.log('\n══ LIVENESS — moved/total animated elements, population not sample ══');
    console.log('A disabled animation reads exactly like a brilliant optimisation, so no CPU');
    console.log('number above means anything without this. Three scopes, because they fail');
    console.log('independently: main (in-content flow-engine particles), gutter');
    console.log('(.schematic-bg), page (a page-local rAF the particle probe cannot see).');
    console.log('A PARTIAL count is usually CORRECT — IntersectionObserver freezes what is');
    console.log('off screen. Counts compare per ELEMENT, not by index (see PROBE_FN); churn');
    console.log('is pulse circles born and retired mid-probe and is expected.\n');
    console.log(`${pad('ROW', W)} ${lpad('ELEMS', 6)}  LIVENESS`);
    console.log(rule(30));
    for (const r of rows) {
        const verdict = r.motionOk ? '' : `  << expected ${r.motionExpected}`;
        const flaky = r.motionOk && !r.motionOkAllReps ? '  (a rep disagreed)' : '';
        console.log(`${pad(r.label + (r.control ? ' [CTRL]' : ''), W)} ${lpad(r.totalParticles, 6)}  ${livenessCell(r)}${verdict}${flaky}`);
    }

    const dead = rows.filter((r) => !r.motionOk);
    if (dead.length) {
        console.log('\n  READ THIS BEFORE ANY NUMBER ABOVE:');
        for (const r of dead) {
            console.log(`    ${r.label}: ${livenessCell(r)}, manifest expects "${r.motionExpected}".`);
        }
        console.log('    A row whose animation is not running has a MEANINGLESS CPU number, and');
        console.log('    a suspended loop reads exactly like a brilliant optimisation. Find out');
        console.log('    why the motion stopped before you believe anything above it.');
    }

    // ── Preconditions ──────────────────────────────────────────────────────
    const broken = rows.filter((r) => r.preconditions.length);
    if (broken.length) {
        console.log('\n══ PRECONDITION FAILURES — these rows did not measure what they claim ══\n');
        for (const r of broken) {
            for (const p of r.preconditions) console.log(`  ${r.label}: ${p}`);
        }
        console.log('\n  A row that never scrolled its diagram into view, or never switched tab,');
        console.log('  measured a page that was not animating. Discard its numbers.');
    } else {
        console.log('\n  Preconditions: every tab switch and scroll-into-view landed as specified.');
    }

    // ── CPU breakdown ──────────────────────────────────────────────────────
    console.log('\n══ CPU BREAKDOWN — machine-dependent, do not compare across machines ══\n');
    console.log(`${pad('ROW', W)} ${lpad('TASK', 8)} ${lpad('SCRIPT', 8)} ${lpad('LAYOUT', 8)} ${lpad('STYLE', 8)} ${lpad('FPS', 6)}`);
    console.log(rule(48));
    for (const r of rows) {
        const p = r.perSecond;
        console.log(
            `${pad(r.label + (r.control ? ' [CTRL]' : ''), W)} ${lpad(f1(p.TaskDuration), 8)}`
            + ` ${lpad(f1(p.ScriptDuration), 8)} ${lpad(f1(p.LayoutDuration), 8)}`
            + ` ${lpad(f1(p.RecalcStyleDuration), 8)} ${lpad(f1(r.fps), 6)}`,
        );
    }
    console.log('\n  TASK is the total: script + layout + style + everything else on the main');
    console.log('  thread. It EXCLUDES compositor, raster and GPU, so a transform-animated');
    console.log('  page can read near zero here and still cost power.');

    // ── Load phase ─────────────────────────────────────────────────────────
    console.log('\n══ LOAD PHASE — advisory, not part of the steady-state numbers ══');
    console.log('Long tasks (>50ms) from navigation through the end of the settle window.\n');
    console.log(`${pad('ROW', W)} ${lpad('COUNT', 6)} ${lpad('TOTAL ms', 9)} ${lpad('MAX ms', 8)}`);
    console.log(rule(25));
    for (const r of rows) {
        console.log(`${pad(r.label, W)} ${lpad(r.loadLongTasks.count, 6)} ${lpad(f1(r.loadLongTasks.totalMs), 9)} ${lpad(f1(r.loadLongTasks.maxMs), 8)}`);
    }

    // ── Manifest rationale ─────────────────────────────────────────────────
    console.log('\n══ WHY EACH ROW IS IN THE MANIFEST ══\n');
    for (const r of rows) {
        console.log(`${r.label}  (${r.path})`);
        console.log(`    ${r.why}\n`);
    }

    console.log('Report-only by design — a measurement never sets a failing exit code.');
    console.log('Run it before merging anything that touches an animation loop, a rAF or');
    console.log('setInterval gate, schematic-bg, or an animation rule in styles.css.');
}

// NOTE: no process.exit() anywhere in this file, deliberately — the same trap
// .github/scripts/prose-lint.mjs documents. `console.log` to a PIPE is
// asynchronous: Node queues the write and process.exit() discards whatever has
// not drained. `--json` emits one multi-kilobyte write, so `… --json | jq .`
// would truncate at the pipe buffer and produce unparseable JSON, while
// redirecting to a file hid the bug entirely (writes to a file descriptor are
// synchronous). Falling off the end of the script lets the event loop flush
// every write first. The handler below sets process.exitCode for the same
// reason rather than exiting.
main().catch((err) => {
    console.log('perf-profile — RUN FAILED');
    console.log(String(err && err.stack ? err.stack : err));
    process.exitCode = 1;
});
