// ──────────────────────────────────────────────────────────────────────
// flow-engine.js — particle-flow + signal-pulse animation engine for
// SVG schematics (hydronic piping, control wiring, function-block
// chains, BACnet/IP comm traces).
//
// Two motion modes, both reading the document for opted-in elements:
//
//   data-flow="supply|return|current|air"
//                              — continuous particle stream along the
//                                path. "supply"/"return" for hydronic
//                                pipes (blue / blue-cool). "current"
//                                for electrical loops (amber) — same
//                                visual treatment, just colored to
//                                match the analog-signal family.
//                                "air" for ductwork: particle fill
//                                follows the element's `stroke`
//                                attribute (same rule as the pulse
//                                default), so one type serves every
//                                air stream — OA / RA / SA / EA duct
//                                colors come from the markup, and a
//                                pool rebuild reproduces them by
//                                construction. Fallback when no
//                                stroke attribute: the supply blue.
//   data-pulse="signal"        — discrete pulse that launches along the
//                                path, travels at speed, and retires.
//                                EBO-style "wire just updated" cue;
//                                also the primitive the function-block
//                                editor uses to show a connection
//                                carrying live data.
//
// Loaded as a *classic* script (same pattern as pid-engine.js).
// `flow-engine.js` is now wired site-wide from layouts/page.njk —
// alongside `schematic-bg.js`, which calls `FlowEngine.init()` once
// on DOMContentLoaded so the gutter motifs animate automatically.
// A page-level `<script>FlowEngine.init();</script>` is therefore
// optional but still safe: init() is idempotent (re-registers any
// new paths, doesn't restart the rAF loop or duplicate pools — see
// the `frameStarted` guard and the `poolsByEl` lookup).
//
// Use a page-level init call when the page mutates its SVG geometry
// after DOMContentLoaded (e.g. swaps a path's d attribute) and needs
// the engine to pick up the new geometry without waiting for the
// next full reload. For static schematics, no page-level call is
// needed. The engine is page-agnostic and a no-op where no
// `data-flow` / `data-pulse` element exists.
//
// Mechanic: each annotated element gets its own pool of <circle>
// particles, injected into a single per-SVG `<g class="flow-particles">`
// layer that the engine appends as the SVG's *last* child — so
// particles always paint above the pipework, including the dashed
// return strokes that would otherwise visually compete with them.
// Particles step forward each frame by VELOCITY · dt and wrap to
// position 0 at the path's end (per-segment pools, no path-stitching).
// Position along the path comes from getPointAtLength() — no SMIL,
// no CSS offset-path. Velocity and spacing are *global constants*:
// a longer pipe takes longer to traverse and carries more particles.
// That's deliberate — it's how a viewer reads the unequal load-distance
// characteristic of direct return (and the equal path lengths on
// reverse return).
//
// Reduced motion: if the user has prefers-reduced-motion: reduce,
// init() bails before injecting anything. The static SVG — with its
// solid/dashed pipe convention and the existing flow-arrow polygons —
// carries the meaning on its own.
//
// flow-active class: when an SVG gets at least one particle pool, the
// engine adds `flow-active` to that <svg> element. Pages use this hook
// to switch styling that's tied to "animation is running" — e.g. to
// drop the dashed-return stroke pattern while motion is the directional
// cue, while leaving the dashes in place for reduced-motion, print, or
// any other no-animation state. Scoped to the SVG (not <body>) so a
// page with both animated and static diagrams gets both right.
//
// Path direction: by default the path's drawing order is the flow
// direction. If a path is drawn against the flow, the page can add
// `data-flow-reverse="true"` and the engine walks it from end to
// start instead of rewriting the path.
//
// Per-path geometry caching: `data-flow-static="true"` opts one path
// into the sampled point table (see "Idle cost" below) — the same
// treatment the gutter gets unconditionally. It is an assertion by the
// page, not a hint: *every* mutation of this path's `d` is followed by
// a FlowEngine.refreshPath() call on it. Pages that hold to that get
// the cheaper per-frame read; pages that can't must NOT set it. The
// live counter-example is simulators/hydronic-loop-builder.html, which
// rewrites `d` on every pointermove and only refreshes on pointer-UP —
// its particles track the dragged pipe *because* the read is live, and
// a table there would strand them on the pre-drag route until release.
// simulators/refrigerant-loop.html is the opposite case and a ready
// candidate: its one geometry swap (the cycle re-route) calls
// refreshPath on each element immediately after setting `d`.
//
// Per-path density: `data-flow-density="<float>"` is an optional
// multiplier on baseline particle spacing. Default 1.0 (= baseline
// SPACING). Lower values space particles farther apart on that path
// — sparser flow, the visual encoding of "this pipe carries less
// than the main flow." Clamped at the engine to (0, 1.0]: above 1.0
// has no physical reading on any current diagram and would invite
// misuse; non-positive would mean infinite spacing. Velocity stays
// global per the recorded rule — density changes spacing only,
// never speed. See "Engine attribute conventions" in
// site-ideas-and-friction.md.
//
// Pulse attributes (per-element overrides):
//   data-pulse-color="<css color>"   — fill for the pulse head + trail.
//                                      Default reads the element's `stroke`
//                                      attribute; ultimate fallback is
//                                      var(--accent). Same `var(--name)`
//                                      pattern as data-flow colors.
//   data-pulse-speed="<px/sec>"      — travel speed. Default 220.
//   data-pulse-interval="<ms>"       — auto-fire cadence. Default 4000.
//                                      Set to 0 (or any non-positive) to
//                                      disable auto-fire — the path then
//                                      only animates when something calls
//                                      FlowEngine.pulse(el) explicitly.
//                                      That's the function-block-editor
//                                      mode: pulse on signal update.
//
// Pulse visibility: auto-firing is gated by IntersectionObserver, so
// pulses don't fire on motifs that aren't currently in the viewport
// (the gutter as-builts in particular cover ~5000px of vertical
// extent — letting them all pulse offscreen would spend a lot of
// SVG-element churn for no visible payoff). Explicit FlowEngine.pulse()
// calls bypass the gate.
//
// Flow visibility (audit-2026-06 #31): flow pools are gated two ways.
// (1) Pools inside the gutter collage (`.schematic-bg`) aren't built
// at all while the gutter is display:none (its own CSS hides it below
// 1240px) — a matchMedia('(min-width: 1240px)') listener tears gutter
// pools down / rebuilds them as the viewport crosses the breakpoint,
// so a phone never spends script time moving circles that can't paint.
// (2) Every pool's element is also watched by the same
// IntersectionObserver pattern as pulses, and the rAF loop skips
// ticking pools that aren't currently in the viewport — offscreen
// particles freeze in place (placeAll painted them once at build) and
// resume when scrolled back in. Before this gating the engine ticked
// every particle on every page every frame, ~100% idle main-thread
// cost at desktop widths and 4.5s script per 10s on phones for
// invisible circles.
//
// Public API:
//   FlowEngine.init()              — scan the document for [data-flow]
//                                    and [data-pulse] elements, build
//                                    pools for any new ones, and start
//                                    the rAF loop on the first call.
//                                    Idempotent across calls: the
//                                    `frameStarted` guard means a
//                                    second call only re-registers
//                                    paths, never spins up a second
//                                    loop; per-element pools are
//                                    rebuilt in place via `poolsByEl`
//                                    so duplicates are impossible.
//                                    Called once site-wide from
//                                    schematic-bg.js; page-level
//                                    callers can re-call after
//                                    mutating SVG geometry without
//                                    worrying about state.
//   FlowEngine.refreshPath(el)     — rebuild the particle pool for one
//                                    annotated element after the page
//                                    mutated its `data-flow-density`
//                                    (or any other engine attribute).
//                                    Explicit call rather than a
//                                    MutationObserver because the
//                                    page already knows when it just
//                                    changed something — keeps the
//                                    engine boring and the data flow
//                                    easy to reason about. No-op under
//                                    reduced-motion, since init() never
//                                    built any pools to refresh.
//   FlowEngine.setPathColor(el, c) — recolor the existing particles for
//                                    one annotated element in place (no
//                                    rebuild, no per-frame stutter). For
//                                    pages that drive particle fill from
//                                    something the engine doesn't know
//                                    about — e.g. the d3 twin-T widget,
//                                    where the slider mutates pipe stroke
//                                    AND wants the dots on those pipes to
//                                    track. Call after each state change;
//                                    idempotent. No-op under reduced-motion.
//   FlowEngine.pulse(el)           — fire a single pulse on a pulse-
//                                    annotated element right now,
//                                    regardless of its auto-fire interval
//                                    or viewport visibility. The primitive
//                                    a wired-up function-block editor
//                                    calls when a signal updates. No-op
//                                    under reduced-motion or for elements
//                                    init() didn't register.
//
// What's NOT here: anything page-specific. No per-diagram tuning, no
// hooks for play/pause UI, no speed coupling to a slider. Add those
// on the page that needs them; keep the engine boring.
//
// ── Idle cost (codebase-issues #198) ───────────────────────────────
// The gutter collage is the engine's dominant consumer: 120 motif
// SVGs contribute ~360 flow pools / ~557 particles on EVERY page, so
// a plain calculator page with no animation of its own still paid
// ~41% of a CPU core, continuously, at idle. Three mechanisms below
// cut the per-frame work; each is measured, not assumed:
//
// The gutter is not the only consumer, and on a public page it is
// often not the main one: simulators/refrigerant-loop.html idles with
// 78 particles on CONTENT paths, and hiding its gutter changes nothing
// measurable. So of the three mechanisms below, only the first is
// scoped — the other two apply to EVERY pool, because content diagrams
// are where a visitor actually pays.
//
//   1. Point table — the one scoped mechanism. setPos() called
//      getPointAtLength() per particle per frame. Gutter geometry is
//      server-rendered and static, so gutter pools sample the path
//      ONCE at build into a flat table and interpolate between
//      samples; a content path opts in with data-flow-static (above).
//      The scope exists for exactly one page: hydronic-loop-builder
//      rewrites `d` on every pointermove and only calls refreshPath()
//      on pointer-UP, so its particles track the pipe mid-drag
//      *because* the read is live.
//   2. Cheaper writes, EVERY pool. `circle.cx.baseVal.value = n` skips
//      the number→string→attribute-parse round trip setAttribute()
//      pays, and reflects into getAttribute('cx') (measured 4.1×
//      cheaper than setAttribute with a raw float, 2.1× vs. a rounded
//      one). Values round to 0.1 user units and re-write only when
//      that rounded value CHANGED — an axis-aligned run has one
//      constant coordinate, whose write then vanishes.
//   3. visiblePools, EVERY pool. The frame loop walked all ~360 pools
//      every frame to ask each whether it was visible. The
//      IntersectionObserver already knows, so it now maintains a
//      `visiblePools` array and the loop iterates only that; a
//      zero-particle pool never joins it at all. The full-`pools`
//      !isConnected sweep still runs — on a slow cadence — because it
//      is the ONLY reap path for detached elements and
//      hydronic-loop-builder documents relying on it.
//
// Cheaper writes are not free writes: each one still dirties style and
// layout for its subtree, so the per-frame floor is set by how many
// particles move, not by how cheaply each move is issued. That is why
// the engine-side levers plateau — going lower means moving fewer
// particles (see the variant flag below), not writing them faster.
// ──────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    // ── ⚠ TEMPORARY REVIEW SCAFFOLDING — PR-1 (fix/gutter-idle-cpu) ──
    // Three gutter-performance variants behind a URL query param so the
    // owner can A/B them from the running page. The merge-ready version
    // keeps ONE variant and deletes this block, every `GUTTER_VARIANT`
    // read, and the `v0` legacy path.
    //
    //   ?gutter=v0   original engine, unchanged — the A/B baseline
    //   ?gutter=v1   (default) point table + cheap writes + visiblePools
    //   ?gutter=v2   V1 + gutter flow pools tick at ~20fps (1.5 u/step)
    //   ?gutter=v3   gutter motion off: particles placed once, gutter
    //                pulses silenced; the one-shot draw-in reveal stays
    //
    // Read ONCE here, at script evaluation — not per frame, and not
    // re-read on history navigation.
    const GUTTER_VARIANT = (function () {
        const fallback = 'v1';
        try {
            const q = new URLSearchParams(window.location.search).get('gutter');
            return (q === 'v0' || q === 'v1' || q === 'v2' || q === 'v3') ? q : fallback;
        } catch (e) {
            return fallback;
        }
    })();
    const LEGACY = GUTTER_VARIANT === 'v0';
    const RATE_GATED = GUTTER_VARIANT === 'v2';
    const GUTTER_STATIC = GUTTER_VARIANT === 'v3';

    // Global tuning — one velocity, one spacing, applied uniformly to
    // every annotated path. Tuned by eye on the d1 diagram and then
    // damped (55 → 30 px/sec) once the gutter motif library landed —
    // calmer motion that doesn't pull the eye off the main content
    // area. Pulse speed (PULSE_SPEED_DEFAULT below) is unaffected on
    // purpose: data-transfer cues are *meant* to draw the eye.
    const VELOCITY = 30;        // px/sec along the path
    const SPACING  = 34;        // px between adjacent particles
    const RADIUS   = 3;         // circle r — small but readable

    // Pulse tuning — defaults for data-pulse paths.
    const PULSE_SPEED_DEFAULT    = 220;    // px/sec
    const PULSE_INTERVAL_DEFAULT = 4000;   // ms between auto-fires
    const PULSE_INTERVAL_JITTER  = 0.3;    // ±30% on each next-fire
    const PULSE_HEAD_RADIUS      = 3.2;    // px (head circle)
    const PULSE_TRAIL_LEN        = 4;      // trailing circles behind the head
    const PULSE_TRAIL_GAP        = 5;      // px between trail circles along the path
    const PULSE_TAIL_RADIUS_STEP = 0.18;   // radius shrink per trail step
    const PULSE_TAIL_OPACITY_STEP = 0.22;  // opacity drop per trail step
    const PULSE_FILL_DEFAULT     = 'var(--accent)';

    // Colours — read straight from the design-system custom properties.
    // No `, #hex` fallback (see CLAUDE.md "Design system" — every var
    // used here must be defined in styles.css :root).
    const SUPPLY_FILL  = 'var(--blue)';
    const RETURN_FILL  = 'var(--blue-cool)';
    const CURRENT_FILL = 'var(--amber)';
    const SVG_NS = 'http://www.w3.org/2000/svg';

    // Module-level state. Flow + pulse pools live side by side; the
    // single rAF loop ticks both. Lookup Maps let refresh / external
    // pulse() find an existing registration without walking the array.
    const pools = [];
    const poolsByEl = new Map();
    const pulsePaths = new Map();   // el -> { length, color, speed, intervalMs, nextFireAt }
    const activePulses = [];        // [{ el, length, speed, headOffset, circles: [...] }]
    const visiblePulseEls = new Set();
    const visibleFlowEls = new Set();
    // Derived from visibleFlowEls: the pools the frame loop actually
    // ticks — visible AND particle-bearing (and, under v3, non-gutter).
    // The IO callback and buildPoolForEl are the only writers; every
    // removal path goes through removePool.
    const visiblePools = [];
    let pulseIO = null;
    let flowIO = null;
    let gutterMql = null;
    let frameStarted = false;   // engine initialized (reduced-motion gate); set once
    let looping = false;        // rAF loop currently scheduled (#113 — suspends when idle)
    let lastFrameT = null;      // last rAF timestamp; reset whenever the loop suspends
    let lastReapT = 0;          // last full-`pools` stale sweep (#198)
    let gutterAccum = 0;        // V2 only: dt banked since the last gutter advance

    // The gutter collage's own CSS hides it below this width — keep in
    // sync with the .schematic-bg media query in styles.css.
    const GUTTER_MQ = '(min-width: 1240px)';

    // Stale-pool reap cadence. The frame loop catches a detached VISIBLE
    // pool the same frame (it iterates those anyway); everything else —
    // including the orphans hydronic-loop-builder's renderAll() leaves
    // behind — is caught by this amortized full-`pools` sweep. It stays
    // the only reap path for detached elements, so the interval is a
    // latency knob, never an on/off switch.
    const REAP_INTERVAL = 500;      // ms

    // Point-table sampling pitch, in path user units. Particles advance
    // ~0.5 u/frame, so a nearest-sample lookup would visibly step —
    // positions interpolate between samples instead. At 1 u the worst
    // case is a 90° corner falling midway between two samples, where
    // the chord cuts ~0.35 u off the vertex for ~2 frames.
    const TABLE_STEP = 1;

    // V2 only: how often gutter flow pools advance. Particles cover the
    // same ground at the same average speed — they take one 1.5-unit
    // step instead of three 0.5-unit ones. Applies to the gutter's FLOW
    // pools and nothing else: pulses are never rate-limited (a gutter
    // pulse path is 32-85px at 220 px/s, so a gated head would advance
    // ~15px per frame against a ~20px comet and read as disconnected
    // blinks), and content diagrams keep full frame rate.
    const GUTTER_TICK_S = 1 / 20;   // seconds between gutter advances

    // True if `el` sits inside the gutter collage. Build-time only —
    // never called per frame (pools carry the answer as `pool.gutter`).
    function inGutter(el) {
        return !!(el.closest && el.closest('.schematic-bg'));
    }

    // True while `el` sits inside the gutter collage AND the gutter is
    // hidden — i.e. building/keeping a pool for it would animate
    // circles that can never paint.
    function gutterHidden(el) {
        if (!gutterMql || gutterMql.matches) return false;
        return inGutter(el);
    }

    // ── POINT TABLE ────────────────────────────────────────────────
    // Sampled positions along one path, so the frame loop interpolates
    // instead of calling getPointAtLength() per particle per frame.
    // GUTTER POOLS ONLY — see the idle-cost note in the header for why
    // widening this would break the two simulators that mutate `d`.
    //
    // The gutter renders 120 motifs from SIX distinct bodies, so the
    // ~1,800 gutter geometry elements collapse to ~90 distinct shapes.
    // Tables are immutable and keyed on the geometry attributes, so one
    // table serves every repeat — which is what makes a 1-unit pitch
    // affordable. A geometry mutation produces a different key and
    // therefore a different table, so the cache cannot go stale; it is
    // bounded by the gutter's fixed motif vocabulary.
    const tableCache = new Map();
    const PT = { x: 0, y: 0 };      // scratch — reused, never escapes

    function geometryKey(el, length) {
        const tag = el.tagName;
        const parts = [tag, Math.round(length * 100)];
        if (tag === 'line') {
            parts.push(el.getAttribute('x1'), el.getAttribute('y1'),
                       el.getAttribute('x2'), el.getAttribute('y2'));
        } else if (el.hasAttribute('d')) {
            parts.push(el.getAttribute('d'));
        } else if (el.hasAttribute('points')) {
            parts.push(el.getAttribute('points'));
        } else {
            return null;            // unshareable shape — build a private table
        }
        return parts.join('|');
    }

    function samplePath(el, length) {
        const n = Math.max(1, Math.ceil(length / TABLE_STEP));
        const step = length / n;
        const xs = new Float64Array(n + 1);
        const ys = new Float64Array(n + 1);
        for (let i = 0; i <= n; i++) {
            const pt = el.getPointAtLength(i * step);
            xs[i] = pt.x;
            ys[i] = pt.y;
        }
        return { n: n, step: step, xs: xs, ys: ys };
    }

    function buildTable(el, length) {
        const key = geometryKey(el, length);
        if (key === null) return samplePath(el, length);
        let table = tableCache.get(key);
        if (!table) {
            table = samplePath(el, length);
            tableCache.set(key, table);
        }
        return table;
    }

    // Linear interpolation between the two bracketing samples. `d` is
    // clamped into [0, length]: offsets are always in [0, length) and
    // the reversed read yields (0, length], so the top clamp only ever
    // fires on the exact endpoint.
    function tablePoint(table, d) {
        const f = d / table.step;
        let i = f | 0;
        if (i < 0) i = 0;
        else if (i >= table.n) i = table.n - 1;
        const t = f - i;
        PT.x = table.xs[i] + (table.xs[i + 1] - table.xs[i]) * t;
        PT.y = table.ys[i] + (table.ys[i + 1] - table.ys[i]) * t;
    }

    function init() {
        // Reduced-motion fallback is the static SVG, untouched. Bail
        // before injecting anything.
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        // Track the gutter's visibility breakpoint: rebuild gutter
        // pools when the viewport grows past it, tear them down when
        // it shrinks below. Registered once. The grow path is scoped to
        // gutter elements (buildGutterPools), NOT a full init() —
        // re-running buildPoolForEl over every in-content [data-flow]
        // would tear down those pools too, resetting particle offsets
        // and wiping any setPathColor() a page applied (e.g.
        // refrigerant-cycle-basics recolors to --heat once on load and
        // never again). audit-2026-06 #96.
        if (!gutterMql && window.matchMedia) {
            gutterMql = window.matchMedia(GUTTER_MQ);
            const onGutterChange = function () {
                if (gutterMql.matches) buildGutterPools();
                else teardownGutterPools();
            };
            if (gutterMql.addEventListener) gutterMql.addEventListener('change', onGutterChange);
            else if (gutterMql.addListener) gutterMql.addListener(onGutterChange);
        }

        const annotatedFlow  = document.querySelectorAll('[data-flow]');
        const annotatedPulse = document.querySelectorAll('[data-pulse]');
        annotatedFlow.forEach(buildPoolForEl);
        annotatedPulse.forEach(buildPulsePathFor);

        if (!pools.length && !pulsePaths.size) return;
        frameStarted = true;
        startLoop();
    }

    // #113: only run the rAF loop while there's something to animate. The
    // audit-#31 gating already skipped per-particle work for offscreen
    // pools, but the loop itself still woke every frame to iterate pools
    // and pulsePaths checking visibility. Now the loop SUSPENDS when no
    // visible flow pool, no in-flight pulse, and no visible auto-firing
    // pulse path remains; a resume path (IO 'intersecting', firePulse, or
    // init/buildGutterPools) restarts it. `frameStarted` stays the
    // initialized-once gate firePulse/refreshPath/setPathColor check;
    // `looping` separately tracks whether the rAF loop is scheduled.
    // `visiblePools` is maintained to hold exactly the pools the old
    // full-`pools` scan would have selected, so this stays equivalent.
    // The pulse arm reads `visiblePulseEls.size` rather than walking
    // pulsePaths: pulseIO.observe() is called ONLY for intervalMs > 0
    // (see buildPulsePathFor), so membership already implies it.
    function hasWork() {
        if (activePulses.length) return true;
        if (visiblePools.length) return true;
        return visiblePulseEls.size > 0;
    }

    function startLoop() {
        if (looping || !frameStarted) return;
        if (!hasWork()) return;
        looping = true;
        lastFrameT = null;
        requestAnimationFrame(frame);
    }

    // Amortized reaper over the FULL pool list. The frame loop only
    // walks visible pools now, so this is what retires a pool whose
    // element was detached while offscreen — the case
    // hydronic-loop-builder's renderAll() creates and documents
    // relying on (codebase-issues #112).
    function reapStalePools(t) {
        if (t - lastReapT < REAP_INTERVAL) return;
        lastReapT = t;
        for (let p = pools.length - 1; p >= 0; p--) {
            if (!pools[p].el.isConnected) removePool(pools[p]);
        }
    }

    function frame(t) {
        if (lastFrameT == null) lastFrameT = t;
        // Clamp dt — if the tab was backgrounded, requestAnimationFrame
        // can fire with a huge gap; we don't want a single frame's worth
        // of catch-up to teleport particles past each other.
        const dt = Math.min(0.1, (t - lastFrameT) / 1000);
        lastFrameT = t;
        const delta = VELOCITY * dt;

        // V2 gutter rate gate. Bank dt and spend it in one step every
        // ~50ms, so the average velocity is unchanged and no time is
        // lost — a skipped frame is deferred travel, not dropped travel.
        // gutterDelta === delta for every other variant.
        let gutterDelta = delta;
        if (RATE_GATED) {
            gutterAccum += dt;
            if (gutterAccum < GUTTER_TICK_S) {
                gutterDelta = 0;
            } else {
                gutterDelta = VELOCITY * gutterAccum;
                gutterAccum = 0;
            }
        }

        // Iterate backwards so an in-flight splice of a stale pool (its
        // annotated element was removed from the DOM) doesn't skip the
        // next pool. Offscreen pools aren't in `visiblePools` at all —
        // the particles placed at build time freeze until the path
        // scrolls back into the viewport (audit #31: ticking everything
        // cost ~100% of the idle main thread).
        for (let p = visiblePools.length - 1; p >= 0; p--) {
            const pool = visiblePools[p];
            if (!pool.el.isConnected) {
                removePool(pool);
                continue;
            }
            const step = pool.gutter ? gutterDelta : delta;
            if (step === 0) continue;
            const len = pool.length;
            for (let i = 0; i < pool.particles.length; i++) {
                const part = pool.particles[i];
                part.offset += step;
                if (part.offset >= len) part.offset -= len;
                setPos(pool, part);
            }
        }

        reapStalePools(t);
        tickPulses(dt);

        // Suspend when nothing can animate; a resume path restarts us.
        if (!hasWork()) { looping = false; lastFrameT = null; return; }
        requestAnimationFrame(frame);
    }

    // refreshPath rebuilds one path's particle pool from the current
    // attribute values — call after mutating `data-flow-density` (or
    // any other engine attribute) from page code. No-op if the engine
    // never initialized (reduced-motion path) or the element isn't
    // currently annotated.
    function refreshPath(el) {
        if (!frameStarted) return;
        if (!el || !el.hasAttribute || !el.hasAttribute('data-flow')) return;
        buildPoolForEl(el);
    }

    // setPathColor recolors the existing particles for one annotated
    // element without rebuilding the pool. Cheap (just N setAttribute
    // calls) and avoids the one-frame stutter that refreshPath would
    // cause if a page is mutating colors live (slider drag).
    function setPathColor(el, color) {
        if (!frameStarted) return;
        const pool = poolsByEl.get(el);
        if (!pool) return;
        for (let i = 0; i < pool.particles.length; i++) {
            pool.particles[i].circle.setAttribute('fill', color);
        }
    }

    // Build (or rebuild in place) the particle pool for one annotated
    // element. Reads all current attribute values; tears down any
    // existing circles for that element before recreating them.
    function buildPoolForEl(el) {
        // <path>, <line>, <polyline> etc. all expose getPointAtLength —
        // any SVGGeometryElement works. Anything else is silently
        // skipped so the engine is safe to load on any page.
        if (typeof el.getTotalLength !== 'function' || typeof el.getPointAtLength !== 'function') return;

        // Don't build pools the viewer can't see: gutter motifs while
        // the gutter is display:none (the matchMedia listener rebuilds
        // them if the viewport grows past the breakpoint).
        if (gutterHidden(el)) return;

        const svg = el.ownerSVGElement;
        if (!svg) return;

        const length = el.getTotalLength();
        if (!isFinite(length) || length < 1) return;

        const flow = el.getAttribute('data-flow');
        const reverse = el.getAttribute('data-flow-reverse') === 'true';
        const fill = flow === 'return'  ? RETURN_FILL
                   : flow === 'current' ? CURRENT_FILL
                   : flow === 'air'     ? (el.getAttribute('stroke') || SUPPLY_FILL)
                   : SUPPLY_FILL;

        // Per-path density: clamp to (0, 1.0] at the engine. The page
        // doesn't have to police bounds; non-finite or out-of-range
        // values silently fall back to the baseline.
        let density = parseFloat(el.getAttribute('data-flow-density'));
        if (!isFinite(density) || density <= 0 || density > 1) density = 1;
        const localSpacing = SPACING / density;

        // floor(length / localSpacing): at density 1.0 a path just
        // shorter than SPACING legitimately carries zero particles —
        // the flow is there in encoding but the rendered stream is
        // sparse enough that you don't always see a circle on it.
        const count = Math.floor(length / localSpacing);
        const step = count > 0 ? length / count : 0;

        const layer = ensureParticleLayer(svg);

        // Tear down any existing circles for this element before
        // rebuilding — refresh case (slider mutated density) and
        // double-init case both land here.
        let pool = poolsByEl.get(el);
        if (pool) {
            for (let i = 0; i < pool.particles.length; i++) {
                pool.particles[i].circle.remove();
            }
        } else {
            pool = { el: el, length: length, reverse: reverse, particles: [], gutter: false, table: null };
            poolsByEl.set(el, pool);
            pools.push(pool);
        }
        pool.length = length;
        pool.reverse = reverse;
        pool.particles = [];
        pool.gutter = inGutter(el);
        // Cache geometry for the gutter (always static) and for any path
        // that opts in with data-flow-static. Rebuilt here on purpose:
        // refreshPath() re-runs this function, which is how a page that
        // mutates `d` gets a fresh table. Everything else keeps the live
        // read — see the data-flow-static note in the header.
        pool.table = (!LEGACY && (pool.gutter || el.getAttribute('data-flow-static') === 'true'))
            ? buildTable(el, length)
            : null;

        for (let i = 0; i < count; i++) {
            const circle = document.createElementNS(SVG_NS, 'circle');
            circle.setAttribute('r', RADIUS);
            circle.setAttribute('fill', fill);
            layer.appendChild(circle);
            // lx / ly are the last coordinates written, so an unchanged
            // axis can skip its write. Undefined until the first place.
            pool.particles.push({ circle: circle, offset: i * step, lx: NaN, ly: NaN });
        }

        // Place each particle at its initial position so the first
        // paint isn't a flash at the origin (and so a refresh-induced
        // pool swap doesn't show a frame of bunched-up zeros).
        placeAll(pool);

        // Tick only while visible — same IO pattern as the pulse gate.
        // A pool with zero particles has nothing to tick, so it skips IO
        // registration entirely (~96 of the gutter's ~360 pools). This
        // sits AFTER ensureParticleLayer on purpose: that call is what
        // adds `flow-active`, which six specs and styles.css pin.
        if (!count) {
            markPoolHidden(el);
            if (flowIO) flowIO.unobserve(el);
            return;
        }
        ensureFlowIO();
        if (flowIO) flowIO.observe(el);
        // A rebuild of an already-visible pool gets no fresh IO callback
        // (observe() on an observed target is a no-op), so re-derive.
        if (visibleFlowEls.has(el)) markPoolVisible(el);
    }

    // ── VISIBILITY BOOKKEEPING ─────────────────────────────────────
    // visibleFlowEls stays the source of truth; visiblePools is the
    // iteration list derived from it. Under v3 gutter pools are never
    // added, so hasWork() reports no work and the loop stays suspended.
    function markPoolVisible(el) {
        visibleFlowEls.add(el);
        const pool = poolsByEl.get(el);
        if (!pool || !pool.particles.length) return;
        // V3: gutter pools are still built and placed, but never ticked.
        // They stay out of visiblePools entirely, so hasWork() reports no
        // work and the rAF loop suspends outright on a page with no
        // content animation — which is why v3 reaches ~0% rather than the
        // ~20% floor every keep-animating lever plateaus at.
        if (pool.gutter && GUTTER_STATIC) return;
        if (visiblePools.indexOf(pool) === -1) visiblePools.push(pool);
    }

    function markPoolHidden(el) {
        visibleFlowEls.delete(el);
        const pool = poolsByEl.get(el);
        if (!pool) return;
        const i = visiblePools.indexOf(pool);
        if (i !== -1) visiblePools.splice(i, 1);
    }

    // Remove one pool: circles, lookup entries, IO registration. Shared
    // by the stale-element splice in the frame loop, the amortized
    // reaper, and the gutter teardown.
    function removePool(pool) {
        const index = pools.indexOf(pool);
        if (index === -1) return;
        for (let i = 0; i < pool.particles.length; i++) {
            pool.particles[i].circle.remove();
        }
        // Drop from visiblePools BEFORE the poolsByEl delete — the
        // lookup is how markPoolHidden finds the pool. Missing this is
        // codebase-issues #112 all over again: a torn-down pool the
        // frame loop still holds a reference to.
        markPoolHidden(pool.el);
        poolsByEl.delete(pool.el);
        if (flowIO) flowIO.unobserve(pool.el);
        pools.splice(index, 1);
    }

    // Tear down every pool inside the (now hidden) gutter collage, and
    // clear `flow-active` from any gutter SVG left with no pools so its
    // CSS falls back to the static no-animation state. The class sweep
    // covers EVERY .schematic-bg svg, not just the ones that had flow
    // pools: ensureParticleLayer also flags svgs when a PULSE fires, so
    // a pulse-only motif could otherwise keep flow-active forever after
    // the gutter hides (caught as a parallel-suite flake, 2026-06-10).
    function teardownGutterPools() {
        for (let p = pools.length - 1; p >= 0; p--) {
            const pool = pools[p];
            if (!pool.gutter) continue;
            removePool(pool);
        }
        // #112: also retire in-flight pulses on gutter motifs and drop their
        // pulsePaths + pulseIO registrations. Teardown previously handled
        // flow pools only, so a gutter pulse kept ticking on the now
        // display:none SVG until it self-retired (~1-2s of position writes),
        // and its pulseIO observation leaked for the page lifetime
        // (buildPulsePathFor re-registers it on the next gutter-grow).
        const isGutter = (node) => !!(node.closest && node.closest('.schematic-bg'));
        for (let p = activePulses.length - 1; p >= 0; p--) {
            const pulse = activePulses[p];
            if (!isGutter(pulse.el)) continue;
            for (let i = 0; i < pulse.circles.length; i++) pulse.circles[i].remove();
            activePulses.splice(p, 1);
        }
        pulsePaths.forEach(function (cfg, el) {
            if (!isGutter(el)) return;
            if (pulseIO) pulseIO.unobserve(el);
            visiblePulseEls.delete(el);
            pulsePaths.delete(el);
        });
        document.querySelectorAll('.schematic-bg svg.flow-active').forEach(function (svg) {
            let stillPooled = false;
            pools.forEach(function (pool) {
                if (pool.el.ownerSVGElement === svg) stillPooled = true;
            });
            if (!stillPooled) svg.classList.remove('flow-active');
        });
    }

    // Rebuild ONLY the gutter-collage pools when the viewport grows back
    // past the breakpoint — the mirror of teardownGutterPools' scoping.
    // buildPoolForEl / buildPulsePathFor rebuild in place via poolsByEl /
    // pulsePaths, so this is idempotent; the gutterHidden guard inside
    // buildPoolForEl is now satisfied (gutter visible). Critically, this
    // does NOT touch in-content [data-flow]/[data-pulse] pools, so their
    // particle offsets and any setPathColor() recolor survive a resize
    // across the breakpoint (audit-2026-06 #96).
    function buildGutterPools() {
        document.querySelectorAll('.schematic-bg [data-flow]').forEach(buildPoolForEl);
        document.querySelectorAll('.schematic-bg [data-pulse]').forEach(buildPulsePathFor);
        startLoop();   // #113: rebuilt gutter pools may be visible — resume if suspended
    }

    function ensureFlowIO() {
        if (flowIO || typeof IntersectionObserver !== 'function') return;
        // Same rootMargin as the pulse gate: particles resume just
        // before the path scrolls in, so motion is already underway
        // as it appears.
        flowIO = new IntersectionObserver(function (entries) {
            let appeared = false;
            for (let i = 0; i < entries.length; i++) {
                const e = entries[i];
                if (e.isIntersecting) { markPoolVisible(e.target); appeared = true; }
                else markPoolHidden(e.target);
            }
            if (appeared) startLoop();   // #113: resume the loop if it had suspended
        }, { rootMargin: '120px 0px' });
    }

    // One particle layer per SVG, appended as the last child so painter's-
    // order puts every particle above every pipe stroke (including the
    // dashed return paths). Re-appending an existing layer is a no-op
    // for paint order but keeps the layer last if anything else gets
    // added to the SVG later. Also flags the host SVG with `flow-active`
    // so page-level CSS can react to "animation is running" — see the
    // header comment.
    function ensureParticleLayer(svg) {
        svg.classList.add('flow-active');
        let layer = svg.querySelector(':scope > g.flow-particles');
        if (!layer) {
            layer = document.createElementNS(SVG_NS, 'g');
            layer.setAttribute('class', 'flow-particles');
        }
        svg.appendChild(layer);
        return layer;
    }

    function placeAll(pool) {
        for (let i = 0; i < pool.particles.length; i++) {
            setPos(pool, pool.particles[i]);
        }
    }

    function setPos(pool, part) {
        const d = pool.reverse ? (pool.length - part.offset) : part.offset;
        if (pool.table) {
            tablePoint(pool.table, d);
            writePos(part, PT.x, PT.y);
            return;
        }
        const pt = pool.el.getPointAtLength(d);
        if (LEGACY) {
            part.circle.setAttribute('cx', pt.x);
            part.circle.setAttribute('cy', pt.y);
            return;
        }
        writePos(part, pt.x, pt.y);
    }

    // `cx.baseVal.value = n` reflects into getAttribute('cx') (verified
    // in Chromium) while skipping the number→string→attribute-parse
    // round trip setAttribute pays. Coordinates round to 0.1 user units
    // — subpixel at every rendered scale — and an axis whose rounded
    // value is unchanged skips its write entirely, which is most of the
    // gutter, where runs are axis-aligned.
    function writePos(part, x, y) {
        const rx = Math.round(x * 10) / 10;
        const ry = Math.round(y * 10) / 10;
        if (rx !== part.lx) { part.circle.cx.baseVal.value = rx; part.lx = rx; }
        if (ry !== part.ly) { part.circle.cy.baseVal.value = ry; part.ly = ry; }
    }

    // ── PULSE MODE ─────────────────────────────────────────────────
    // Register one pulse-annotated element. Same SVGGeometryElement
    // duck-typing as buildPoolForEl. Attribute reads here are
    // one-shot — pulses don't refresh on attribute mutation today
    // (no current page needs that), but the path can still pulse
    // externally via FlowEngine.pulse(el).
    function buildPulsePathFor(el) {
        if (typeof el.getTotalLength !== 'function' || typeof el.getPointAtLength !== 'function') return;
        // Mirror buildPoolForEl: don't register a pulse path on a gutter
        // motif while the gutter is hidden (#112) — buildGutterPools
        // re-registers it on the next grow past the breakpoint.
        if (gutterHidden(el)) return;
        const length = el.getTotalLength();
        if (!isFinite(length) || length < 1) return;
        // V3 silences gutter AUTO-fire (interval clamp below) — without
        // it the 144 gutter pulse paths keep the loop alive and v3 never
        // reaches idle. Note what this is NOT: pulses are never
        // rate-limited anywhere, and an explicit FlowEngine.pulse() on a
        // gutter path still fires at full speed under v3, since the path
        // stays registered in pulsePaths.
        const silenced = GUTTER_STATIC && inGutter(el);

        // Default pulse color: element's stroke attribute (handles
        // `var(--name)` literally — the browser resolves it at fill
        // time, same as the SUPPLY_FILL / RETURN_FILL constants). If
        // there's no stroke attribute, fall back to --accent.
        const color = el.getAttribute('data-pulse-color')
                   || el.getAttribute('stroke')
                   || PULSE_FILL_DEFAULT;

        let speed = parseFloat(el.getAttribute('data-pulse-speed'));
        if (!isFinite(speed) || speed <= 0) speed = PULSE_SPEED_DEFAULT;

        let intervalMs = parseFloat(el.getAttribute('data-pulse-interval'));
        if (!isFinite(intervalMs) || intervalMs < 0) intervalMs = PULSE_INTERVAL_DEFAULT;
        if (silenced) intervalMs = 0;   // 0 is the engine's existing "no auto-fire"

        // Stagger initial firing across the first interval window so
        // motifs don't all pulse together on page load.
        const nextFireAt = performance.now() + (intervalMs > 0 ? Math.random() * intervalMs : 0);

        pulsePaths.set(el, { length: length, color: color, speed: speed, intervalMs: intervalMs, nextFireAt: nextFireAt });

        if (intervalMs > 0) {
            ensurePulseIO();
            pulseIO.observe(el);
        }
    }

    function ensurePulseIO() {
        if (pulseIO) return;
        // rootMargin lets us start firing pulses just before the path
        // scrolls in — the first pulse is mid-travel as the path
        // appears, which reads better than a dead path that suddenly
        // wakes up.
        pulseIO = new IntersectionObserver(function (entries) {
            let appeared = false;
            for (let i = 0; i < entries.length; i++) {
                const e = entries[i];
                if (e.isIntersecting) { visiblePulseEls.add(e.target); appeared = true; }
                else visiblePulseEls.delete(e.target);
            }
            if (appeared) startLoop();   // #113: resume the loop if it had suspended
        }, { rootMargin: '120px 0px' });
    }

    // Fire one pulse along a registered pulse path. External callers
    // (function-block editor) use this to indicate a signal update on
    // a specific wire. No-op for unregistered elements or under
    // reduced-motion (frameStarted gates both).
    function firePulse(el) {
        if (!frameStarted) return;
        const cfg = pulsePaths.get(el);
        if (!cfg) return;
        const svg = el.ownerSVGElement;
        if (!svg) return;
        const layer = ensureParticleLayer(svg);

        const circles = [];
        for (let i = 0; i < PULSE_TRAIL_LEN + 1; i++) {
            const c = document.createElementNS(SVG_NS, 'circle');
            c.setAttribute('r', Math.max(0.6, PULSE_HEAD_RADIUS * (1 - i * PULSE_TAIL_RADIUS_STEP)));
            c.setAttribute('fill', cfg.color);
            c.setAttribute('opacity', Math.max(0, 1 - i * PULSE_TAIL_OPACITY_STEP));
            layer.appendChild(c);
            circles.push(c);
        }

        activePulses.push({ el: el, length: cfg.length, speed: cfg.speed, headOffset: 0, circles: circles });
        startLoop();   // #113: an explicit pulse is work — resume if suspended
    }

    // Advance every in-flight pulse and fire newly-due auto-pulses.
    // Called from the rAF loop after the flow particles tick.
    function tickPulses(dt) {
        // 1) Auto-fire newly due pulses on currently-visible paths.
        if (pulsePaths.size) {
            const now = performance.now();
            pulsePaths.forEach(function (cfg, el) {
                if (cfg.intervalMs <= 0) return;
                if (now < cfg.nextFireAt) return;
                if (!visiblePulseEls.has(el)) {
                    // Path isn't on-screen — skip the fire but reset
                    // the timer so it doesn't burst the moment it
                    // comes back into view.
                    cfg.nextFireAt = now + cfg.intervalMs;
                    return;
                }
                firePulse(el);
                const jitter = 1 + (Math.random() - 0.5) * 2 * PULSE_INTERVAL_JITTER;
                cfg.nextFireAt = now + cfg.intervalMs * jitter;
            });
        }

        // 2) Advance every in-flight pulse. Iterate backwards so the
        //    in-place splice for a retiring pulse doesn't skip the next.
        for (let p = activePulses.length - 1; p >= 0; p--) {
            const pulse = activePulses[p];
            // If the path was removed from the DOM mid-flight, retire
            // the pulse silently (matches the stale-pool handling
            // above for flow particles).
            if (!pulse.el.isConnected) {
                for (let i = 0; i < pulse.circles.length; i++) pulse.circles[i].remove();
                activePulses.splice(p, 1);
                continue;
            }

            pulse.headOffset += pulse.speed * dt;

            // Retire when the entire trail has passed the end of the
            // path. Without this guard the last trail circle freezes
            // at the path end for a frame or two before opacity 0
            // catches up.
            const trailLenPx = PULSE_TRAIL_LEN * PULSE_TRAIL_GAP;
            if (pulse.headOffset - trailLenPx > pulse.length) {
                for (let i = 0; i < pulse.circles.length; i++) pulse.circles[i].remove();
                activePulses.splice(p, 1);
                continue;
            }

            for (let i = 0; i < pulse.circles.length; i++) {
                const tailOffset = pulse.headOffset - i * PULSE_TRAIL_GAP;
                const c = pulse.circles[i];
                if (tailOffset < 0 || tailOffset > pulse.length) {
                    c.setAttribute('opacity', '0');
                } else {
                    const pt = pulse.el.getPointAtLength(tailOffset);
                    c.setAttribute('cx', pt.x);
                    c.setAttribute('cy', pt.y);
                    c.setAttribute('opacity', Math.max(0, 1 - i * PULSE_TAIL_OPACITY_STEP));
                }
            }
        }
    }

    window.FlowEngine = {
        init: init,
        refreshPath: refreshPath,
        setPathColor: setPathColor,
        pulse: firePulse
    };
})();
