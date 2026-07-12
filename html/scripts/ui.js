// ──────────────────────────────────────────────────────────────────────
// ui.js — shared UI helpers (tab switching, clipboard buttons).
//
// Loaded as a *classic* script (same convention as pid-engine.js,
// flow-engine.js, units.js) so a page's inline <script> can see the
// helpers as plain globals. Include before any inline <script> that
// uses them:
//
//     <script src="/scripts/ui.js"></script>
//     <script>
//       // page logic, can call switchTab() / copyReadouts() / copyText()
//     </script>
//
// What lives here: tiny UI primitives that more than one page needs
// (tab switching, clipboard buttons, the units-toggle input resync).
// What does NOT live here: anything page-specific, anything that does
// real computation, anything that owns visual styling. The CSS rules
// the helpers depend on (.tool-card / .tab-pane / .tab-btn / .copied)
// already live in styles.css.
// ──────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    // Switch tabs within the nearest .tool-card. Pages wire this with
    // an arrow-wrapped click listener — `btn.addEventListener('click',
    // e => switchTab('foo', e.currentTarget))` — and the matching tab
    // pane is expected to have id="tab-foo".
    function switchTab(name, btn) {
        const card = btn.closest('.tool-card');
        if (!card) {
            console.warn('switchTab: button is not inside a .tool-card — ignoring.');
            return;
        }
        // Resolve the target pane up front: a bad name should be a clean
        // no-op, not deactivate every pane and then throw.
        const pane = document.getElementById('tab-' + name);
        if (!pane) {
            console.warn('switchTab: no pane with id "tab-' + name + '" — ignoring.');
            return;
        }
        card.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        card.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });
        pane.classList.add('active');
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
    }

    // Upgrade every .tabs strip to the ARIA tab pattern once at load —
    // role=tablist/tab/tabpanel + aria-selected + the
    // aria-controls/aria-labelledby pairing (audit-2026-06 #8: the
    // class-only active state announced as three identical plain
    // buttons). Applied from JS rather than a 12-page markup sweep:
    // the tabs only function with JS anyway, and a future tabbed tool
    // gets the semantics for free. switchTab() keeps aria-selected in
    // sync from then on.
    function initTabAria() {
        document.querySelectorAll('.tabs').forEach(strip => {
            const btns = strip.querySelectorAll('.tab-btn');
            if (!btns.length) return;
            strip.setAttribute('role', 'tablist');
            btns.forEach(b => {
                const name = b.dataset.tab;
                b.setAttribute('role', 'tab');
                b.setAttribute('aria-selected', b.classList.contains('active') ? 'true' : 'false');
                if (!name) return;
                if (!b.id) b.id = 'tab-btn-' + name;
                const pane = document.getElementById('tab-' + name);
                if (pane) {
                    b.setAttribute('aria-controls', 'tab-' + name);
                    pane.setAttribute('role', 'tabpanel');
                    pane.setAttribute('aria-labelledby', b.id);
                }
            });
        });
    }
    // ui.js loads at end-of-body (before the page's inline script), so
    // the markup above is already parsed; DOMContentLoaded is the
    // safety net if it ever moves into <head>.
    if (document.body) initTabAria();
    else document.addEventListener('DOMContentLoaded', initTabAria);

    // Copy `text` to the clipboard and flash a "copied!" state on `btn`
    // for ~1.8 s. No-op if there's nothing to copy or the button is
    // already mid-flash. Fails QUIETLY on clipboard rejection — insecure
    // context, no user-activation, or permission denied. The silent
    // failure matches what a user would expect (no chrome to surface
    // the error gracefully), and crucially avoids the unhandled-promise
    // rejection that the smoke tests treat as a console-error failure.
    function copyText(btn, text) {
        if (!text || btn.classList.contains('copied')) return;
        // Latch synchronously — capture orig and add `copied` BEFORE the
        // async writeText — so a fast second click sees `copied` at the
        // entry guard and is a clean no-op. The old code added the class and
        // captured orig inside .then(), after a microtask boundary: a second
        // click landing before the first promise resolved passed the guard,
        // queued a second writeText, and its callback captured
        // orig='copied!', leaving the button stuck on 'copied!' (#105). The
        // 'copied!' text still flips on success only (no false flash on a
        // blocked clipboard); the .catch() unlatches the class.
        const orig = btn.textContent;
        btn.classList.add('copied');
        navigator.clipboard.writeText(text).then(() => {
            btn.textContent = 'copied!';
            setTimeout(() => {
                btn.textContent = orig;
                btn.classList.remove('copied');
            }, 1800);
        }).catch(() => { btn.classList.remove('copied'); /* clipboard blocked — unlatch, stay silent */ });
    }

    // Copy one or more readout-element textContents to the clipboard,
    // joined by `sep` ('' = single value). Empty "—" placeholders are
    // dropped, so e.g. "Copy IP : port" on an address-only result just
    // copies the IP. No-op if every requested id is empty / placeholder.
    function copyReadouts(btn, sep, ...ids) {
        const parts = ids
            .map(id => {
                const el = document.getElementById(id);
                if (!el) {
                    console.warn('copyReadouts: no element with id "' + id + '" — skipping.');
                    return null;
                }
                return el.textContent;
            })
            .filter(v => v && v !== '—');
        if (!parts.length) return;
        copyText(btn, parts.join(sep));
    }

    // Unit-flip input resync. When the units toggle flips, a numeric
    // <input> the user typed into must be re-expressed in the new units
    // WITHOUT the round-trip drift a naive convert-the-display would
    // introduce (audit-2026-06 #60a/#60b). Two guarantees:
    //   • #60a — flipping units away and back hands back exactly the text
    //     the user typed. The canonical (US) value + the verbatim typed
    //     text are stashed on the element's dataset; they're trusted only
    //     while the field still shows the exact string this helper last
    //     wrote for the same quantity (a user edit or mode switch rebuilds
    //     them, since the dataset.canonDisp guard then fails).
    //   • #60b — a fresh conversion rounds to per-quantity display decimals
    //     (the caller's `decMap`, e.g. {airflow: 0, temp: 1}), not
    //     6-significant-figure noise like 1699.01 m³/h.
    // `target` is an element OR an id string; `decMap[quantity]` gives the
    // decimals, falling back to `fallback` (default 2 — refrigerant-pt
    // passes 1 to match its all-1-decimal map). Pages keep only their
    // REWRITE_DEC map + a thin wrapper that binds it; extracted from eight
    // byte-identical page copies (#152).
    function rewriteInput(target, quantity, fromU, toU, decMap, fallback) {
        const el = typeof target === 'string' ? document.getElementById(target) : target;
        if (!el) return;
        const U = window.Units;
        const v = parseFloat(el.value);
        if (!isFinite(v)) return;
        let canon = parseFloat(el.dataset.canonUs);
        if (!(isFinite(canon) && el.dataset.canonQ === quantity && el.dataset.canonDisp === el.value)) {
            canon = U.convert(v, fromU, 'us', quantity);
            el.dataset.canonUs = String(canon);
            el.dataset.canonQ = quantity;
            el.dataset.typedText = el.value;
            el.dataset.typedUnits = fromU;
        }
        if (toU === el.dataset.typedUnits) {
            el.value = el.dataset.typedText;
        } else {
            const dec = (decMap && decMap[quantity] !== undefined)
                ? decMap[quantity]
                : (fallback === undefined ? 2 : fallback);
            el.value = (+U.convert(canon, 'us', toU, quantity).toFixed(dec)).toString();
        }
        el.dataset.canonDisp = el.value;
    }

    window.switchTab    = switchTab;
    window.copyText     = copyText;
    window.copyReadouts = copyReadouts;
    window.rewriteInput = rewriteInput;
})();
