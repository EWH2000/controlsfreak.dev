// ──────────────────────────────────────────────────────────────────────
// flow-engine.js — particle-flow animation engine for the hydronic
// diagrams (and any other SVG schematic that wants to show direction
// of flow with motion).
//
// Loaded as a *classic* script (same pattern as pid-engine.js) so a
// page's inline <script> can call its global API directly:
//
//     <script src="/scripts/flow-engine.js"></script>
//     <script>FlowEngine.init();</script>
//
// at the bottom of <body> is the whole integration. The engine scans
// the document for SVG geometry elements with a `data-flow` attribute
// and animates discrete particles along them. Pages opt in
// element-by-element by annotating their static SVG; the engine
// itself is page-agnostic and a no-op where no `data-flow` exists.
//
// Mechanic: each annotated element gets its own pool of <circle>
// particles, injected into a single per-SVG `<g class="flow-particles">`
// layer that the engine appends as the SVG's *last* child — so
// particles always paint above the pipework, including the dashed
// return strokes that would otherwise visually compete with them.
// Particles step forward each frame by VELOCITY · dt and wrap to
// position 0 at the path's end (per-segment pools, no path-stitching).
// Position
// along the path comes from getPointAtLength() — no SMIL, no CSS
// offset-path. Velocity and spacing are *global constants*: a longer
// pipe takes longer to traverse and carries more particles. That's
// deliberate — it's how a viewer reads the unequal load-distance
// characteristic of direct return (and, on the reverse-return diagram
// to come, how the equal path lengths land visually).
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
// What's NOT here: anything page-specific. No per-diagram tuning, no
// hooks for play/pause UI, no speed coupling to a slider. Add those
// on the page that needs them; keep the engine boring.
// ──────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    // Global tuning — one velocity, one spacing, applied uniformly to
    // every annotated path. Tuned by eye on the d1 diagram (viewBox
    // 800×360, rendered roughly 820px wide).
    const VELOCITY = 55;        // px/sec along the path
    const SPACING  = 34;        // px between adjacent particles
    const RADIUS   = 3;         // circle r — small but readable

    // Colours — matching the existing SVG element style (CSS var with
    // a literal-hex fallback baked in, so a failed stylesheet still
    // leaves the diagram legible).
    const SUPPLY_FILL = 'var(--blue, #1577b8)';
    const RETURN_FILL = 'var(--blue-cool, #5e8aa0)';
    const SVG_NS = 'http://www.w3.org/2000/svg';

    function init() {
        // Reduced-motion fallback is the static SVG, untouched. Bail
        // before injecting anything.
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        const annotated = document.querySelectorAll('[data-flow]');
        if (!annotated.length) return;

        const pools = [];

        annotated.forEach(function (el) {
            // <path>, <line>, <polyline> etc. all expose getPointAtLength —
            // any SVGGeometryElement works. Anything else is silently
            // skipped so the engine is safe to load on any page.
            if (typeof el.getTotalLength !== 'function' || typeof el.getPointAtLength !== 'function') return;

            const svg = el.ownerSVGElement;
            if (!svg) return;

            const length = el.getTotalLength();
            if (!isFinite(length) || length < 1) return;

            const flow = el.getAttribute('data-flow');
            const reverse = el.getAttribute('data-flow-reverse') === 'true';
            const fill = flow === 'return' ? RETURN_FILL : SUPPLY_FILL;

            const count = Math.max(1, Math.round(length / SPACING));
            const step = length / count;     // even-stride spacing along this path
            const particles = [];
            const layer = ensureParticleLayer(svg);

            for (let i = 0; i < count; i++) {
                const circle = document.createElementNS(SVG_NS, 'circle');
                circle.setAttribute('r', RADIUS);
                circle.setAttribute('fill', fill);
                layer.appendChild(circle);
                particles.push({ circle: circle, offset: i * step });
            }

            pools.push({ el: el, length: length, reverse: reverse, particles: particles });

            // Place each particle at its initial position so the first
            // paint isn't a flash at the origin.
            placeAll(pools[pools.length - 1]);
        });

        if (!pools.length) return;

        let lastT = null;
        function frame(t) {
            if (lastT == null) lastT = t;
            // Clamp dt — if the tab was backgrounded, requestAnimationFrame
            // can fire with a huge gap; we don't want a single frame's
            // worth of catch-up to teleport particles past each other.
            const dt = Math.min(0.1, (t - lastT) / 1000);
            lastT = t;
            const delta = VELOCITY * dt;

            for (let p = 0; p < pools.length; p++) {
                const pool = pools[p];
                const len = pool.length;
                for (let i = 0; i < pool.particles.length; i++) {
                    const part = pool.particles[i];
                    part.offset += delta;
                    if (part.offset >= len) part.offset -= len;
                    setPos(pool, part);
                }
            }

            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
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

    window.FlowEngine = { init: init };
})();
