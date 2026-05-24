// ──────────────────────────────────────────────────────────────────────
// schematic-bg.js — scroll-driven reveal for the gutter schematic art,
// plus the bootstrap call into flow-engine.js so motifs that opt in
// via data-flow / data-pulse pick up motion automatically.
//
// Loaded as a *classic* script (same convention as ui.js, units.js,
// flow-engine.js). Exposes nothing on window — the partial that emits
// the SVGs (html/_includes/schematic-bg.njk) provides every selector
// we need (`[data-sbg-motif]`). The script:
//   1. watches each motif with an IntersectionObserver and adds
//      `.is-drawn` the first time it enters the viewport (CSS in
//      styles.css under SCHEMATIC BACKGROUND handles the opacity +
//      stroke-dashoffset transitions);
//   2. calls FlowEngine.init() once, so the pipes start carrying
//      particles and the wiring / logic-chain / BACnet paths begin
//      auto-firing pulses on their own intervals.
//
// On `prefers-reduced-motion: reduce` we skip the IntersectionObserver
// entirely and snap every motif to its drawn state on load.
// FlowEngine.init() does its own reduced-motion check and stays
// dormant. The global reduced-motion block at the bottom of styles.css
// also collapses transition-duration to 0.01ms, so the static end
// state appears immediately with no fade or stroke draw.
//
// No-op on pages with no motifs (defensive — currently every page
// inherits the partial via layouts/page.njk, but the script must not
// fail if that ever changes).
// ──────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    function init() {
        const motifs = document.querySelectorAll('[data-sbg-motif]');

        const reduceMotion = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (motifs.length) {
            // Measure every stroked path and write its length to
            // --sbg-len. The CSS rule in styles.css under
            // "Per-path dasharray" reads this; the 800 fallback in
            // CSS keeps paths invisible if for any reason length
            // measurement fails (e.g. a path whose geometry isn't
            // laid out yet).
            motifs.forEach(m => {
                m.querySelectorAll('[data-sbg-stroke]').forEach(p => {
                    if (typeof p.getTotalLength !== 'function') return;
                    const len = p.getTotalLength();
                    if (!isFinite(len) || len <= 0) return;
                    // Small padding so the final visible nub clears
                    // any subpixel rounding at the path end.
                    p.style.setProperty('--sbg-len', (len + 2));
                });
            });

            if (reduceMotion || typeof IntersectionObserver === 'undefined') {
                motifs.forEach(m => m.classList.add('is-drawn'));
            } else {
                const io = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('is-drawn');
                            observer.unobserve(entry.target);
                        }
                    });
                }, {
                    // Trigger slightly before the motif edge crosses
                    // the viewport, so the draw-in begins as it's
                    // appearing rather than after.
                    rootMargin: '0px 0px -10% 0px',
                    threshold: 0.05
                });
                motifs.forEach(m => io.observe(m));
            }
        }

        // Kick the flow engine for the gutter motifs (and any page-
        // level data-flow / data-pulse paths the page contributes).
        // Pages with their own engines used to call init themselves;
        // those calls are now refreshes — see layouts/page.njk for
        // the load-order note.
        if (window.FlowEngine && typeof window.FlowEngine.init === 'function') {
            window.FlowEngine.init();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
