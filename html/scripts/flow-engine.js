// ──────────────────────────────────────────────────────────────────────
// flow-engine.js — particle-flow + signal-pulse animation engine for
// SVG schematics (hydronic piping, control wiring, function-block
// chains, BACnet/IP comm traces).
//
// Two motion modes, both reading the document for opted-in elements:
//
//   data-flow="supply|return|current"
//                              — continuous particle stream along the
//                                path. "supply"/"return" for hydronic
//                                pipes (blue / blue-cool). "current"
//                                for electrical loops (amber) — same
//                                visual treatment, just colored to
//                                match the analog-signal family.
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
// ──────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

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
    let pulseIO = null;
    let flowIO = null;
    let gutterMql = null;
    let frameStarted = false;

    // The gutter collage's own CSS hides it below this width — keep in
    // sync with the .schematic-bg media query in styles.css.
    const GUTTER_MQ = '(min-width: 1240px)';

    // True while `el` sits inside the gutter collage AND the gutter is
    // hidden — i.e. building/keeping a pool for it would animate
    // circles that can never paint.
    function gutterHidden(el) {
        if (!gutterMql || gutterMql.matches) return false;
        return !!(el.closest && el.closest('.schematic-bg'));
    }

    function init() {
        // Reduced-motion fallback is the static SVG, untouched. Bail
        // before injecting anything.
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        // Track the gutter's visibility breakpoint: rebuild gutter
        // pools when the viewport grows past it, tear them down when
        // it shrinks below. Registered once; init() is idempotent.
        if (!gutterMql && window.matchMedia) {
            gutterMql = window.matchMedia(GUTTER_MQ);
            const onGutterChange = function () {
                if (gutterMql.matches) init();
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
        if (frameStarted) return;
        frameStarted = true;

        let lastT = null;
        function frame(t) {
            if (lastT == null) lastT = t;
            // Clamp dt — if the tab was backgrounded, requestAnimationFrame
            // can fire with a huge gap; we don't want a single frame's
            // worth of catch-up to teleport particles past each other.
            const dt = Math.min(0.1, (t - lastT) / 1000);
            lastT = t;
            const delta = VELOCITY * dt;

            // Iterate backwards so an in-flight splice of a stale pool
            // (its annotated element was removed from the DOM) doesn't
            // skip the next pool. No current page mutates SVG geometry
            // like this — recording the guard so a future animated
            // widget can't leak a detached-element reference here.
            for (let p = pools.length - 1; p >= 0; p--) {
                const pool = pools[p];
                if (!pool.el.isConnected) {
                    removePool(pool, p);
                    continue;
                }
                // Offscreen pools don't tick — the particles placed at
                // build time freeze until the path scrolls back into
                // the viewport (audit #31: ticking everything cost
                // ~100% of the idle main thread).
                if (!visibleFlowEls.has(pool.el)) continue;
                const len = pool.length;
                for (let i = 0; i < pool.particles.length; i++) {
                    const part = pool.particles[i];
                    part.offset += delta;
                    if (part.offset >= len) part.offset -= len;
                    setPos(pool, part);
                }
            }

            tickPulses(dt);

            requestAnimationFrame(frame);
        }
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
            pool = { el: el, length: length, reverse: reverse, particles: [] };
            poolsByEl.set(el, pool);
            pools.push(pool);
        }
        pool.length = length;
        pool.reverse = reverse;
        pool.particles = [];

        for (let i = 0; i < count; i++) {
            const circle = document.createElementNS(SVG_NS, 'circle');
            circle.setAttribute('r', RADIUS);
            circle.setAttribute('fill', fill);
            layer.appendChild(circle);
            pool.particles.push({ circle: circle, offset: i * step });
        }

        // Place each particle at its initial position so the first
        // paint isn't a flash at the origin (and so a refresh-induced
        // pool swap doesn't show a frame of bunched-up zeros).
        placeAll(pool);

        // Tick only while visible — same IO pattern as the pulse gate.
        ensureFlowIO();
        if (flowIO) flowIO.observe(el);
    }

    // Remove one pool (by reference + its index in `pools`): circles,
    // lookup entries, IO registration. Shared by the stale-element
    // splice in the frame loop and the gutter teardown.
    function removePool(pool, index) {
        for (let i = 0; i < pool.particles.length; i++) {
            pool.particles[i].circle.remove();
        }
        poolsByEl.delete(pool.el);
        visibleFlowEls.delete(pool.el);
        if (flowIO) flowIO.unobserve(pool.el);
        pools.splice(index, 1);
    }

    // Tear down every pool inside the (now hidden) gutter collage, and
    // clear `flow-active` from any SVG left with no pools so its CSS
    // falls back to the static no-animation state.
    function teardownGutterPools() {
        const touchedSvgs = new Set();
        for (let p = pools.length - 1; p >= 0; p--) {
            const pool = pools[p];
            if (!(pool.el.closest && pool.el.closest('.schematic-bg'))) continue;
            const svg = pool.el.ownerSVGElement;
            if (svg) touchedSvgs.add(svg);
            removePool(pool, p);
        }
        touchedSvgs.forEach(function (svg) {
            let stillPooled = false;
            pools.forEach(function (pool) {
                if (pool.el.ownerSVGElement === svg) stillPooled = true;
            });
            if (!stillPooled) svg.classList.remove('flow-active');
        });
    }

    function ensureFlowIO() {
        if (flowIO || typeof IntersectionObserver !== 'function') return;
        // Same rootMargin as the pulse gate: particles resume just
        // before the path scrolls in, so motion is already underway
        // as it appears.
        flowIO = new IntersectionObserver(function (entries) {
            for (let i = 0; i < entries.length; i++) {
                const e = entries[i];
                if (e.isIntersecting) visibleFlowEls.add(e.target);
                else visibleFlowEls.delete(e.target);
            }
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
        const pt = pool.el.getPointAtLength(d);
        part.circle.setAttribute('cx', pt.x);
        part.circle.setAttribute('cy', pt.y);
    }

    // ── PULSE MODE ─────────────────────────────────────────────────
    // Register one pulse-annotated element. Same SVGGeometryElement
    // duck-typing as buildPoolForEl. Attribute reads here are
    // one-shot — pulses don't refresh on attribute mutation today
    // (no current page needs that), but the path can still pulse
    // externally via FlowEngine.pulse(el).
    function buildPulsePathFor(el) {
        if (typeof el.getTotalLength !== 'function' || typeof el.getPointAtLength !== 'function') return;
        const length = el.getTotalLength();
        if (!isFinite(length) || length < 1) return;

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
            for (let i = 0; i < entries.length; i++) {
                const e = entries[i];
                if (e.isIntersecting) visiblePulseEls.add(e.target);
                else visiblePulseEls.delete(e.target);
            }
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
