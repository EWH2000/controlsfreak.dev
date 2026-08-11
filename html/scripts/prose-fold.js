// ──────────────────────────────────────────────────────────────────────
// prose-fold.js — print support for the details.prose-fold disclosure.
//
// Loaded per-page from {% block scripts %} on pages that carry folds
// (the two DDC Workbench pages today), NOT site-wide: a page with no
// details.prose-fold has nothing for this to do, and the pattern is
// young enough that site-wide loading would be premature.
//
// The fold itself is a native <details> styled in styles.css under
// "PROSE FOLD" — it opens, closes, keyboard-operates, announces its
// expanded state, and gets auto-expanded by Chromium's find-in-page,
// all with zero JavaScript. This file exists for the ONE thing CSS
// cannot do: a closed <details> stays closed on paper. `@media print`
// can restyle the body but cannot open the element, so a reader who
// prints the page loses the folded background prose entirely.
//
// So: force every closed fold open before the print box, restore
// exactly the ones we opened after it. Restoring only our own set is
// the point — a fold the reader opened themselves must still be open
// when the dialog closes.
//
// NOTE — this DIVERGES from the standing precedent: the five
// details.tool-preamble pages and pid-tuner's .pid-spoiler all print
// closed today, unexamined. Applying the same shim to bare `details`
// would retrofit them for free; that is deliberately NOT done here.
// The pilot ships the narrow behaviour and leaves the wider question
// as an explicit owner call.
//
// Scope note: only `beforeprint` / `afterprint` are used. The
// matchMedia('print') fallback for engines that never fire them is
// omitted on purpose — its failure mode is "some browser prints a
// fold closed", which is exactly the standing precedent above, not a
// regression this page introduces.
//
// No state is persisted. Folds ship closed on every load, so there is
// no cf_* storage key and nothing for privacy.html to declare.
// ──────────────────────────────────────────────────────────────────────
(function () {
    'use strict';

    const SELECTOR = 'details.prose-fold';
    // The folds THIS script opened, so afterprint restores only those.
    const forcedOpen = [];

    window.addEventListener('beforeprint', function () {
        forcedOpen.length = 0;
        for (const fold of document.querySelectorAll(SELECTOR)) {
            if (fold.open) continue;
            fold.open = true;
            forcedOpen.push(fold);
        }
    });

    window.addEventListener('afterprint', function () {
        for (const fold of forcedOpen) fold.open = false;
        forcedOpen.length = 0;
    });
})();
