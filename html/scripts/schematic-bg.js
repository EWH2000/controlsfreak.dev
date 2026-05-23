// ──────────────────────────────────────────────────────────────────────
// schematic-bg.js — scroll-driven reveal for the gutter schematic art.
//
// Loaded as a *classic* script (same convention as ui.js, units.js,
// flow-engine.js). Exposes nothing on window — the partial that emits
// the SVGs (html/_includes/schematic-bg.njk) provides every selector
// we need (`[data-sbg-motif]`). The script just watches each motif
// with an IntersectionObserver and adds `.is-drawn` the first time
// it enters the viewport; CSS in styles.css under SCHEMATIC BACKGROUND
// handles the actual opacity + stroke-dashoffset transitions.
//
// On `prefers-reduced-motion: reduce` we skip the observer entirely
// and snap every motif to its drawn state on load. The global
// reduced-motion block at the bottom of styles.css also collapses
// transition-duration to 0.01ms, so the snap is genuinely instant.
//
// No-op on pages with no motifs (defensive — currently every page
// inherits the partial via layouts/page.njk, but the script must not
// fail if that ever changes).
// ──────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    function init() {
        const motifs = document.querySelectorAll('[data-sbg-motif]');
        if (!motifs.length) return;

        const reduceMotion = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (reduceMotion || typeof IntersectionObserver === 'undefined') {
            motifs.forEach(m => m.classList.add('is-drawn'));
            return;
        }

        const io = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-drawn');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            // Trigger slightly before the motif edge crosses the viewport,
            // so the draw-in begins as it's appearing rather than after.
            rootMargin: '0px 0px -10% 0px',
            threshold: 0.05
        });

        motifs.forEach(m => io.observe(m));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
