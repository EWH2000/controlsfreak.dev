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
// An open panel is in one of TWO STATES, and the distinction is what
// makes the gestures deterministic (see THE TOGGLE RACE below):
//
//   PREVIEW — opened by hover. Transient: it closes when the pointer
//             wanders off, because the reader never asked for it.
//   PINNED  — opened by click, tap or focus, or promoted from a preview
//             by a click. It ignores pointer-out entirely and is
//             dismissed only deliberately.
//
//   pointer enters trigger  open a PREVIEW after HOVER_OPEN_MS
//                           hover-intent delay (canceled if the pointer
//                           leaves first)
//   pointer leaves trigger  close after HOVER_CLOSE_MS grace — canceled
//                           if the pointer enters the PANEL, and skipped
//                           entirely while the panel is PINNED
//   pointer leaves panel    close (same grace, preview only)
//   trigger focused         open PINNED, immediately
//   trigger blurred         close, unless focus moved INTO the panel
//   click / tap on trigger  PREVIEW → pin it (never closes);
//                           PINNED  → close; closed → open PINNED
//   Escape                  close, without moving pointer or focus
//   pointerdown outside     close
//   scroll / resize         close — but NOT a scroll inside the panel
//   another gloss opens     close
//
// WCAG 1.4.13 (Content on Hover or Focus), all three prongs explicit:
//   dismissible — Escape closes without moving the pointer;
//   hoverable   — the grace period lets the pointer travel onto the
//                 panel, and hovering the panel cancels the close;
//   persistent  — nothing else closes it. No auto-dismiss timer exists.
//
// ── THE TOGGLE RACE, AND WHY PREVIEW/PINNED EXISTS ────────────────────
// Two orderings collide on one gesture, and a naive toggle loses to
// both:
//
//   1. FOCUS PRECEDES CLICK. A mouse click on a closed trigger opens it
//      via focusin before the click event arrives, so a toggle reading
//      live state would immediately close what the click just opened.
//   2. HOVER PRECEDES CLICK. A pointer that DWELLS over the trigger for
//      longer than HOVER_OPEN_MS opens a preview first — so the same
//      physical "point at the word and click it" produced OPEN when the
//      user was quick and CLOSED when the user was deliberate. Measured
//      on this component before the fix: hover 300 ms then click left
//      the panel hidden; an immediate click left it visible. Identical
//      intent, opposite outcomes, decided by milliseconds — and it made
//      the spec host-load-flaky, since Playwright's own move→down gap
//      crosses 120 ms under load.
//
// The fix is to decide from PRE-GESTURE state plus the preview/pinned
// bit, never from live visibility. `pointerdown` captures both (was it
// open, and was that open a mere preview); keyboard activation is
// distinguished by `event.detail === 0`, since it sends no pointerdown.
// A click on a preview therefore PINS it rather than closing it: the
// reader was already reading that definition, and the click means
// "keep this", which is also the only reading under which the gesture
// is dwell-independent. Closing stays available — a second click, from
// the pinned state, does it.
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
// Zero per-frame work, zero MutationObserver, zero timers at rest — the
// two hover timers exist only between pointer-enter and open/close, and
// the single requestAnimationFrame exists only between open and the
// next frame (see armDismiss for why the dismiss listeners are armed
// late). Listeners are six document-level delegates plus two
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
    let openedByHover = false;   // true = PREVIEW, false = PINNED
    let downWasOpen = false;     // pre-gesture state, captured at pointerdown
    let downWasPreview = false;
    let armFrame = 0;
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
        panel.style.maxHeight = '';   // re-measure clean; the degenerate arm may set it
        panel.hidden = false;
        panel.style.visibility = 'hidden';

        const t = trigger.getBoundingClientRect();
        const p = panel.getBoundingClientRect();
        const vw = document.documentElement.clientWidth;
        const vh = document.documentElement.clientHeight;

        // The panel must NEVER overlap its own trigger. If it did, the
        // pointer would end up over the panel instead of the word it is
        // pointing at, and the click that follows would land on the panel
        // and no-op — the gesture silently doing nothing. So the two
        // gaps are measured explicitly and the degenerate case (a panel
        // taller than both) is bounded to the roomier side rather than
        // being allowed to drift across the trigger.
        const spaceBelow = vh - MARGIN - (t.bottom + GAP);
        const spaceAbove = (t.top - GAP) - MARGIN;
        let top;
        if (p.height <= spaceBelow) {
            top = t.bottom + GAP;
        } else if (p.height <= spaceAbove) {
            top = t.top - GAP - p.height;
        } else if (spaceBelow >= spaceAbove) {
            top = t.bottom + GAP;
            panel.style.maxHeight = Math.max(0, spaceBelow) + 'px';
        } else {
            top = MARGIN;
            panel.style.maxHeight = Math.max(0, spaceAbove) + 'px';
        }

        let left = t.left;
        const maxLeft = vw - MARGIN - p.width;
        if (left > maxLeft) left = maxLeft;
        if (left < MARGIN) left = MARGIN;

        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
        panel.style.visibility = '';
    }

    // Scrolling dismisses the panel — but a scroll ORIGINATING INSIDE it
    // is the reader using the panel, not the page moving out from under
    // it. .gloss-tip provisions overflow-y:auto (and the degenerate arm
    // in place() can hand it a max-height), so this is reachable markup,
    // not a hypothetical.
    function onScroll(e) {
        const tgt = e.target;
        if (openPanel && tgt && tgt.nodeType === 1 && openPanel.contains(tgt)) return;
        close();
    }

    // The dismiss listeners are armed ONE FRAME LATE, on purpose.
    // Focusing a trigger that sits partly offscreen makes the BROWSER
    // scroll it into view, and that scroll belongs to the OPENING
    // gesture, not to the reader dismissing anything. Arming
    // immediately let a panel open and dismiss itself in the same
    // breath — measured on a 380x210 viewport, where the panel never
    // appeared at all, and reachable on any viewport by tabbing to a
    // trigger below the fold. Scroll events fire before animation-frame
    // callbacks within a frame's "update the rendering" steps, so a
    // single rAF is enough to let the focus scroll pass. This is the
    // component's only frame callback and it exists only between open
    // and the next frame — there is still no per-frame work.
    function armDismiss() {
        if (armFrame) cancelAnimationFrame(armFrame);
        armFrame = requestAnimationFrame(function () {
            armFrame = 0;
            window.addEventListener('scroll', onScroll, { passive: true, capture: true });
            window.addEventListener('resize', close);
        });
    }

    function disarmDismiss() {
        if (armFrame) { cancelAnimationFrame(armFrame); armFrame = 0; }
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', close);
    }

    function close() {
        clearTimers();
        if (!openPanel) return;
        openPanel.hidden = true;
        openPanel.style.visibility = '';
        openPanel.style.maxHeight = '';
        openTrigger.classList.remove('gloss-open');
        openPanel = null;
        openTrigger = null;
        openedByHover = false;
        disarmDismiss();
    }

    // `byHover` opens a PREVIEW; everything else opens PINNED. Re-opening
    // the already-open trigger can only PROMOTE preview → pinned, never
    // demote — a hover crossing a pinned gloss must not make it
    // transient again.
    function open(trigger, byHover) {
        const panel = panelFor(trigger);
        if (!panel) return;              // a mark whose panel never rendered
        if (openTrigger === trigger) {
            clearTimers();
            if (!byHover) openedByHover = false;
            return;
        }
        close();
        place(panel, trigger);
        trigger.classList.add('gloss-open');
        openTrigger = trigger;
        openPanel = panel;
        openedByHover = !!byHover;
        // Capture-phase scroll so a scroll inside ANY container closes it,
        // not only a document scroll. Passive — this handler never
        // preventDefault()s. Armed a frame late; see armDismiss().
        armDismiss();
    }

    function scheduleOpen(trigger) {
        if (openTrigger === trigger) { clearTimers(); return; }
        clearTimers();
        pendingTrigger = trigger;
        openTimer = setTimeout(function () {
            openTimer = 0;
            if (pendingTrigger === trigger) open(trigger, true);
        }, HOVER_OPEN_MS);
    }

    function scheduleClose() {
        // Only a PREVIEW closes on pointer-out. A pinned gloss — clicked,
        // tapped or tabbed to — is dismissed by Escape, an outside
        // pointerdown, a blur or another gloss, never by the pointer
        // wandering off it.
        if (openTrigger && !openedByHover) return;
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
            if (trigger) { clearTimers(); open(trigger, false); return; }
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
            downWasPreview = downWasOpen && openedByHover;
            if (trigger) return;
            if (openPanel && closestSel(e.target, '.gloss-tip') === openPanel) return;
            close();
        }, true);

        document.addEventListener('click', function (e) {
            const trigger = closestSel(e.target, TRIGGER_SEL);
            if (!trigger) return;
            if (e.detail === 0) {
                // Keyboard activation (Enter / Space) sends no pointerdown,
                // so there is no capture to read and no hover to race —
                // live state is the honest answer, and it toggles.
                if (trigger === openTrigger) close();
                else open(trigger, false);
                return;
            }
            // Pointer / touch: decide from PRE-GESTURE state only.
            //   was closed  → open pinned (this also absorbs the focusin
            //                 that fired between pointerdown and click)
            //   was preview → pin it; a deliberate click on a definition
            //                 you are already reading means "keep this"
            //   was pinned  → close; this is the toggle-off
            if (!downWasOpen) open(trigger, false);
            else if (downWasPreview) openedByHover = false;
            else close();
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
