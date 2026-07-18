// ──────────────────────────────────────────────────────────────────────
// fullscreen-toggle.js — CSS-only fullscreen for tool cards.
//
// Loaded site-wide from _includes/layouts/page.njk (before the page's
// {% block scripts %}, so this script's keydown listener registers
// before any per-page listeners). Pages opt in by adding a button
// inside their .tool-card:
//
//     <button type="button" class="tool-card-fullscreen-btn"
//             data-fullscreen-target=".tool-card"
//             aria-pressed="false" aria-label="Enter fullscreen">
//       <svg class="fs-icon-enter" …>…</svg>
//       <svg class="fs-icon-exit"  …>…</svg>
//     </button>
//
// The mechanism is purely class-based: .is-fullscreen on the target
// card + .has-fullscreen-tool on <body>. No Fullscreen API call. The
// matching CSS lives in styles.css under "FULLSCREEN MODE".
//
// ESC exits any active fullscreen card. The listener is on `window`
// (bubble phase), so page-level keydown handlers on `document` run
// first and can stop propagation when they want ESC for themselves
// (e.g. FB editor cancels a pending wire and calls stopPropagation()
// so the same keypress doesn't also exit fullscreen).
//
// While fullscreen is active the covered background is made `inert`:
// setState() walks from the target up to <body>, setting the inert
// attribute on each level's siblings (nav, footer, back-link, gutter
// motifs…), so chrome hidden behind the z-300 overlay drops out of
// the tab order and the AT reading order (codebase-issues #163).
// Everything this script inerts is tagged data-fs-inert and restored
// on EVERY exit path (button, ESC, Fullscreen.exit). Two things stay
// live: the #palette dialog — it layers ABOVE fullscreen (z-index
// 1000 vs 300) so the command palette keeps working, and search.js's
// own background-inert skips data-fs-inert carriers on palette close
// so it can't strip this containment — and anything already inert
// before entry (not ours to undo on exit).
//
// Pages that need to react to entering/exiting (canvas repaint, SVG
// resize) listen for the custom 'fullscreenchange' event the toggle
// dispatches on the target element.
// ──────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    let inited = false;

    function targetFor(btn) {
        const sel = btn.getAttribute('data-fullscreen-target');
        if (!sel) return null;
        return btn.closest(sel) || document.querySelector(sel);
    }

    function syncButton(btn, isFs) {
        btn.setAttribute('aria-pressed', isFs ? 'true' : 'false');
        btn.setAttribute('aria-label', isFs ? 'Exit fullscreen' : 'Enter fullscreen');
    }

    // Background containment (codebase-issues #163): the overlay covers
    // the chrome visually, but the nav / footer / back-link kept their
    // tab order — Shift+Tab from the card landed focus on links the
    // overlay hides, with no visible focus indicator. Walk from the
    // target up to <body>, inerting each level's siblings — the same
    // attribute mechanism search.js uses for the palette (#121; on
    // browsers without inert support the attribute is a harmless no-op
    // and behavior degrades to the old tab order). Skips: <script>
    // (nothing to contain), #palette (layers above fullscreen at
    // z-index 1000 — the command palette stays usable), and anything
    // already inert (a page's own containment isn't ours to undo).
    // Everything set here is tagged data-fs-inert so clearInert()
    // removes exactly what applyInert() added — idempotent across
    // repeated enter/exit cycles.
    function applyInert(targetEl) {
        clearInert();   // never stack two passes' bookkeeping
        for (let el = targetEl; el && el.parentElement; el = el.parentElement) {
            const sibs = el.parentElement.children;
            for (let i = 0; i < sibs.length; i++) {
                const sib = sibs[i];
                if (sib === el || sib.tagName === 'SCRIPT') continue;
                if (sib.id === 'palette') continue;
                if (sib.hasAttribute('inert')) continue;
                sib.setAttribute('inert', '');
                sib.setAttribute('data-fs-inert', '');
            }
            if (el.parentElement === document.body) break;
        }
    }

    function clearInert() {
        document.querySelectorAll('[data-fs-inert]').forEach((el) => {
            el.removeAttribute('inert');
            el.removeAttribute('data-fs-inert');
        });
    }

    function setState(targetEl, isFs) {
        targetEl.classList.toggle('is-fullscreen', isFs);
        document.body.classList.toggle('has-fullscreen-tool', isFs);
        if (isFs) applyInert(targetEl);
        else clearInert();
        targetEl.querySelectorAll('.tool-card-fullscreen-btn')
            .forEach((b) => syncButton(b, isFs));
        targetEl.dispatchEvent(new CustomEvent('fullscreenchange', {
            bubbles: true, detail: { fullscreen: isFs }
        }));
    }

    function toggle(targetEl) {
        if (!targetEl) return;
        setState(targetEl, !targetEl.classList.contains('is-fullscreen'));
    }

    function exitActive() {
        // Exit whatever is ACTUALLY fullscreen, not a hardcoded .tool-card.
        // targetFor() resolves any data-fullscreen-target selector and
        // setState toggles is-fullscreen on that arbitrary element, so a
        // non-.tool-card opt-in would otherwise be unreachable by ESC —
        // is-fullscreen + body.has-fullscreen-tool would stay stuck on with
        // no keyboard way out (codebase-issues #106). Normally there's one.
        document.querySelectorAll('.is-fullscreen').forEach((t) => setState(t, false));
    }

    function init() {
        if (inited) return;
        inited = true;
        document.querySelectorAll('[data-fullscreen-target]').forEach((btn) => {
            btn.addEventListener('click', () => toggle(targetFor(btn)));
        });
        // Bubble-phase listener on window so document-level page handlers
        // (registered later) can stopPropagation() to claim ESC first.
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.body.classList.contains('has-fullscreen-tool')) {
                exitActive();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.Fullscreen = { init, toggle, exit: exitActive };
})();
