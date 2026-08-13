// ──────────────────────────────────────────────────────────────────────
// details-print.js — every <details> on the page prints OPEN.
//
// Loaded SITE-WIDE from _includes/layouts/page.njk, alongside theme /
// units / search / nav-menu / flow-engine / schematic-bg /
// fullscreen-toggle. A page with no <details> registers two listeners
// and does nothing else — the same shape as units.js, whose DOM walker
// no-ops on pages with no data-us spans.
//
// ── The problem ──────────────────────────────────────────────────────
// A closed <details> is closed by the ABSENCE of its `open` attribute,
// and CSS cannot add an attribute. `@media print` can restyle the body
// all it likes; Chromium hides it inside the UA shadow slot, so the
// content never reaches paper. Anyone printing a page loses whatever
// was folded, silently, with no cue that anything is missing.
//
// So: force every closed <details> open before the print box, and
// restore EXACTLY the ones this script opened after it. Restoring only
// our own set is the point — a disclosure the reader opened themselves
// must still be open when the dialog closes.
//
// ── Why site-wide, and why bare `details` ────────────────────────────
// The site runs three disclosure idioms and they are not rare:
// details.tool-preamble on 30 tool pages, .pid-spoiler on pid-tuner,
// details.prose-fold on the two DDC Workbench pages. Owner ruling
// 2026-08-10: ALL of them print open, which the pilot's original
// per-page load could not deliver — a script loaded on two pages
// reaches two pages, and widening its selector would have changed
// nothing on the other 31. Per-page <script> tags across 33 pages is a
// drift generator: the 34th page to add a <details> would silently
// print closed again, and nothing would fail.
//
// The selector is bare `details` rather than a list of the three
// classes, for the same reason — a future disclosure inherits the
// behaviour instead of having to remember to ask for it.
//
// ── If a disclosure must NOT print ───────────────────────────────────
// Give its body an `@media print { display: none }` rule. Do not add an
// exception here: this script's contract is "paper shows the page",
// and a per-idiom opt-out list here would be a second place to look.
//
// ── Scope ────────────────────────────────────────────────────────────
// `beforeprint` / `afterprint` only. The matchMedia('print') fallback
// for engines that never fire them is omitted on purpose — its failure
// mode is "some browser prints a disclosure closed", which is exactly
// the behaviour that stood on this site until now, not a regression
// this script introduces.
//
// Note for tests: page.emulateMedia({ media: 'print' }) applies print
// STYLESHEETS but does not fire either event, so driving this script
// means dispatching the events directly.
//
// No state is persisted; nothing here touches storage.
// ──────────────────────────────────────────────────────────────────────
(function () {
    'use strict';

    // The disclosures THIS script opened, so afterprint restores only
    // those and leaves the reader's own open ones alone.
    //
    // beforeprint deliberately does NOT clear this set on entry, and that
    // omission is load-bearing: nothing guarantees the browser pairs the
    // two events, and a cancelled print preview can fire beforeprint twice
    // with no afterprint between. On that second pass every disclosure this
    // script already opened reads `open`, so the scan below skips it and
    // pushes nothing — clearing first would leave afterprint with an empty
    // set and strand exactly those folds open permanently. Keeping the set
    // degrades the unpaired case to a duplicate push at worst (only if the
    // reader closed one meanwhile), which afterprint absorbs: `open = false`
    // twice on one element is the same as once. afterprint is the only
    // place the set is emptied, which is what makes that true.
    const forcedOpen = [];

    window.addEventListener('beforeprint', function () {
        for (const el of document.querySelectorAll('details')) {
            if (el.open) continue;
            el.open = true;
            forcedOpen.push(el);
        }
    });

    window.addEventListener('afterprint', function () {
        for (const el of forcedOpen) el.open = false;
        forcedOpen.length = 0;
    });
})();
