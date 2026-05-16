// ──────────────────────────────────────────────────────────────────────
// ui.js — shared UI helpers (tab switching, clipboard buttons).
//
// Loaded as a *classic* script (same convention as pid-engine.js,
// flow-engine.js, units.js) so a page's inline on* handlers and inline
// <script> can see the helpers as plain globals. Include before any
// inline <script> that uses them:
//
//     <script src="/scripts/ui.js"></script>
//     <script>
//       // page logic, can call switchTab() / copyReadouts() / copyText()
//     </script>
//
// What lives here: tiny UI primitives that more than one page needs.
// What does NOT live here: anything page-specific, anything that does
// real computation, anything that owns visual styling. The CSS rules
// the helpers depend on (.tool-card / .tab-pane / .tab-btn / .copied)
// already live in styles.css.
// ──────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    // Switch tabs within the nearest .tool-card. Pages wire this with
    // an inline handler — onclick="switchTab('foo', this)" — and the
    // matching tab pane is expected to have id="tab-foo".
    function switchTab(name, btn) {
        const card = btn.closest('.tool-card');
        card.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        card.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('tab-' + name).classList.add('active');
        btn.classList.add('active');
    }

    // Copy `text` to the clipboard and flash a "copied!" state on `btn`
    // for ~1.8 s. No-op if there's nothing to copy or the button is
    // already mid-flash. Fails QUIETLY on clipboard rejection — insecure
    // context, no user-activation, or permission denied. The silent
    // failure matches what a user would expect (no chrome to surface
    // the error gracefully), and crucially avoids the unhandled-promise
    // rejection that the smoke tests treat as a console-error failure.
    function copyText(btn, text) {
        if (!text || btn.classList.contains('copied')) return;
        navigator.clipboard.writeText(text).then(() => {
            const orig = btn.textContent;
            btn.textContent = 'copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = orig;
                btn.classList.remove('copied');
            }, 1800);
        }).catch(() => { /* clipboard blocked — silent */ });
    }

    // Copy one or more readout-element textContents to the clipboard,
    // joined by `sep` ('' = single value). Empty "—" placeholders are
    // dropped, so e.g. "Copy IP : port" on an address-only result just
    // copies the IP. No-op if every requested id is empty / placeholder.
    function copyReadouts(btn, sep, ...ids) {
        const parts = ids
            .map(id => document.getElementById(id).textContent)
            .filter(v => v && v !== '—');
        if (!parts.length) return;
        copyText(btn, parts.join(sep));
    }

    window.switchTab    = switchTab;
    window.copyText     = copyText;
    window.copyReadouts = copyReadouts;
})();
