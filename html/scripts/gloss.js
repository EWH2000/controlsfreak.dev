// ──────────────────────────────────────────────────────────────────────
// gloss.js — inline term glosses (the tooltip/glossary component).
//
// Loaded ONLY on pages that carry a gloss trigger: the `gloss` transform
// in .eleventy.js injects this <script> tag at the same moment it
// injects the panels, so a page can never carry triggers without its
// runtime, and the other ~90 pages pay nothing — not even a no-op parse.
//
// MARKUP CONTRACT (all three halves are build-owned except the first):
//
//   author writes:  <button type="button" data-gloss="sr-latch">SR latch</button>
//   build adds:     aria-describedby="gloss-tip-sr-latch"
//   build injects:  <div class="gloss-tip" role="tooltip"
//                        id="gloss-tip-sr-latch" hidden>…</div>   (body end)
//
// Definitions live in html/_data/glossary.js. Marking is HAND-PLACED in
// the page source — there is no walker, and this file deliberately does
// not contain a "temporary" one.
//
// ── WHAT A SCREEN READER GETS, WITH NO INTERACTION AT ALL ─────────────
// The panel is the trigger's `aria-describedby` target, and an accessible
// description is computed even while the referenced element is `hidden`.
// So focusing the trigger announces "SR latch, button. The one block in
// the boolean family with a memory…" — name, role, definition — whether
// or not this script ever runs. Everything below is the SIGHTED user's
// open/close model layered on top of that.
//
// ── OPEN / CLOSE MODEL ────────────────────────────────────────────────
// At most ONE panel is open at a time; opening any gloss closes the
// previous one.
//
//   pointer enters trigger  open after HOVER_OPEN_MS hover-intent delay
//                           (canceled if the pointer leaves first)
//   pointer leaves trigger  close after HOVER_CLOSE_MS grace — canceled
//                           if the pointer enters the PANEL, and skipped
//                           entirely while the trigger holds focus
//   pointer leaves panel    close (same grace)
//   trigger focused         open immediately
//   trigger blurred         close, unless focus moved INTO the panel
//   click / tap on trigger  toggle (the whole touch story)
//   Escape                  close, without moving pointer or focus
//   pointerdown outside     close
//   scroll / resize         close (see POSITIONING)
//   another gloss opens     close
//
// WCAG 1.4.13 (Content on Hover or Focus), all three prongs explicit:
//   dismissible — Escape closes without moving the pointer;
//   hoverable   — the grace period lets the pointer travel onto the
//                 panel, and hovering the panel cancels the close;
//   persistent  — nothing else closes it. No auto-dismiss timer exists.
//
// One subtlety the toggle has to survive: focus precedes click, so a
// mouse click on a CLOSED trigger opens it via focusin before the click
// event arrives, and a naive toggle would immediately close it again.
// So the pre-gesture state is captured at `pointerdown` and keyboard
// activation is distinguished by `event.detail === 0`. Click-toggle then
// means what the user meant on pointer, touch and keyboard alike.
//
// ── POSITIONING, AND WHY SCROLLING CLOSES ─────────────────────────────
// `position: fixed` + viewport coordinates means no scroll-offset math
// and no ancestor-offset walking. It would also mean re-positioning on
// every scroll frame — per-frame work, on a site with a measured
// idle-cost history (codebase-issues #70 / #109 / #110 / #113). So
// scrolling CLOSES the panel instead. That is a dismissal, not a 1.4.13
// failure: the content stayed visible until the user acted. Resize
// likewise. Both listeners exist only while a panel is open.
//
// Placement is two getBoundingClientRect() calls at open — one on the
// trigger, one on the panel (unhidden but `visibility: hidden` for the
// measurement, so nothing paints mid-place). Below the trigger by
// default; flipped above when the panel would run off the bottom; the
// horizontal edge is a clamp. No loop, no observer.
//
// ── COST AT REST ──────────────────────────────────────────────────────
// Zero per-frame work, zero rAF, zero MutationObserver, zero timers at
// rest — the two hover timers exist only between pointer-enter and
// open/close. Listeners are six document-level delegates plus two
// window-level ones attached on open and removed on close.
//
// Panels carry no focusable content in the pilot. The blur path already
// checks `relatedTarget` against the panel, so adding a link line later
// (the owning-lesson "read more") is a component change, not a rewrite —
// what it would still need is Enter/Space moving focus INTO the panel.
// ──────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    const TRIGGER_SEL = 'button[data-gloss]';
    const HOVER_OPEN_MS = 120;    // hover intent — a pointer crossing the word doesn't open it
    const HOVER_CLOSE_MS = 200;   // grace to travel pointer → panel (1.4.13 hoverable)
    const GAP = 6;                // trigger ↔ panel
    const MARGIN = 16;            // viewport edge keep-out

    let openTrigger = null;
    let openPanel = null;
    let openTimer = 0;
    let closeTimer = 0;
    let pendingTrigger = null;
    let downWasOpen = false;
    let wired = false;

    // Element.closest, guarded: an event target can be a non-Element node
    // (or the document itself) on a delegated listener, and those have no
    // closest().
    function closestSel(node, sel) {
        return node && typeof node.closest === 'function' ? node.closest(sel) : null;
    }

    function panelFor(trigger) {
        const id = trigger.getAttribute('aria-describedby');
        return id ? document.getElementById(id) : null;
    }

    function clearTimers() {
        if (openTimer) { clearTimeout(openTimer); openTimer = 0; }
        if (closeTimer) { clearTimeout(closeTimer); closeTimer = 0; }
        pendingTrigger = null;
    }

    // Two rects, no loop. The panel is unhidden with visibility:hidden so
    // it can be measured without a flash at the wrong coordinates.
    function place(panel, trigger) {
        panel.style.left = '0px';
        panel.style.top = '0px';
        panel.hidden = false;
        panel.style.visibility = 'hidden';

        const t = trigger.getBoundingClientRect();
        const p = panel.getBoundingClientRect();
        const vw = document.documentElement.clientWidth;
        const vh = document.documentElement.clientHeight;

        let top = t.bottom + GAP;
        if (top + p.height > vh - MARGIN) {
            const above = t.top - GAP - p.height;
            // Neither side fits only on a degenerate viewport; the CSS
            // max-height + overflow clamp bounds it either way.
            top = above >= MARGIN ? above : Math.max(MARGIN, vh - MARGIN - p.height);
        }

        let left = t.left;
        const maxLeft = vw - MARGIN - p.width;
        if (left > maxLeft) left = maxLeft;
        if (left < MARGIN) left = MARGIN;

        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
        panel.style.visibility = '';
    }

    function close() {
        clearTimers();
        if (!openPanel) return;
        openPanel.hidden = true;
        openPanel.style.visibility = '';
        openTrigger.classList.remove('gloss-open');
        openPanel = null;
        openTrigger = null;
        window.removeEventListener('scroll', close, true);
        window.removeEventListener('resize', close);
    }

    function open(trigger) {
        const panel = panelFor(trigger);
        if (!panel) return;              // a mark whose panel never rendered
        if (openTrigger === trigger) { clearTimers(); return; }
        close();
        place(panel, trigger);
        trigger.classList.add('gloss-open');
        openTrigger = trigger;
        openPanel = panel;
        // Capture-phase scroll so a scroll inside ANY container closes it,
        // not only a document scroll. Passive — this handler never
        // preventDefault()s.
        window.addEventListener('scroll', close, { passive: true, capture: true });
        window.addEventListener('resize', close);
    }

    function scheduleOpen(trigger) {
        if (openTrigger === trigger) { clearTimers(); return; }
        clearTimers();
        pendingTrigger = trigger;
        openTimer = setTimeout(function () {
            openTimer = 0;
            if (pendingTrigger === trigger) open(trigger);
        }, HOVER_OPEN_MS);
    }

    function scheduleClose() {
        // A trigger the user has tabbed to stays open until it is blurred
        // or Escaped — the pointer wandering off it is not a dismissal.
        if (openTrigger && document.activeElement === openTrigger) return;
        if (closeTimer) clearTimeout(closeTimer);
        closeTimer = setTimeout(function () {
            closeTimer = 0;
            close();
        }, HOVER_CLOSE_MS);
    }

    // `to` is the element the pointer/focus is moving toward — used to
    // decide whether it is still "inside" the open gloss.
    function withinOpen(to) {
        if (!to || !to.nodeType) return false;
        if (openTrigger && openTrigger.contains(to)) return true;
        return !!(openPanel && openPanel.contains(to));
    }

    function init() {
        if (wired) return;
        wired = true;

        document.addEventListener('mouseover', function (e) {
            const trigger = closestSel(e.target, TRIGGER_SEL);
            if (trigger) { scheduleOpen(trigger); return; }
            if (openPanel && closestSel(e.target, '.gloss-tip') === openPanel) {
                // Pointer made it onto the panel — 1.4.13 hoverable.
                if (closeTimer) { clearTimeout(closeTimer); closeTimer = 0; }
            }
        });

        document.addEventListener('mouseout', function (e) {
            const from = closestSel(e.target, TRIGGER_SEL) || closestSel(e.target, '.gloss-tip');
            if (!from) return;
            if (withinOpen(e.relatedTarget)) return;
            if (from === pendingTrigger) clearTimers();
            scheduleClose();
        });

        document.addEventListener('focusin', function (e) {
            const trigger = closestSel(e.target, TRIGGER_SEL);
            if (trigger) { clearTimers(); open(trigger); return; }
            if (openTrigger && !withinOpen(e.target)) close();
        });

        document.addEventListener('focusout', function (e) {
            const trigger = closestSel(e.target, TRIGGER_SEL);
            if (!trigger || trigger !== openTrigger) return;
            // Keeps the door open for a future in-panel link: focus moving
            // INTO the panel is not a dismissal.
            if (withinOpen(e.relatedTarget)) return;
            close();
        });

        // Pre-gesture state capture AND outside-dismiss, in one listener.
        // These are the same gesture read two ways, and a second
        // pointerdown listener attached on open would only re-ask the
        // question this one already answers.
        document.addEventListener('pointerdown', function (e) {
            const trigger = closestSel(e.target, TRIGGER_SEL);
            downWasOpen = !!trigger && trigger === openTrigger;
            if (trigger) return;
            if (openPanel && closestSel(e.target, '.gloss-tip') === openPanel) return;
            close();
        }, true);

        document.addEventListener('click', function (e) {
            const trigger = closestSel(e.target, TRIGGER_SEL);
            if (!trigger) return;
            // detail === 0 is keyboard activation (Enter / Space), which
            // sends no pointerdown — so read live state, not the capture.
            const wasOpen = e.detail === 0 ? trigger === openTrigger : downWasOpen;
            if (wasOpen) close();
            else open(trigger);
        });

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape' || !openPanel) return;
            // Dismiss in place: pointer and focus both stay put (1.4.13).
            close();
            e.stopPropagation();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.Gloss = { init: init, close: close };
})();
