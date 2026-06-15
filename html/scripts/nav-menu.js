// ──────────────────────────────────────────────────────────────────────
// nav-menu.js — cascading dropdown menus for the Tools / Simulators /
// Education / Practice nav.
//
// Goal: any tool/simulator/lesson/quiz is a couple of clicks from every
// page. Each hub item in nav.njk keeps its top-level link (1-click to the
// landing, preserves .active) and gains a disclosure button that opens a
// panel — built at build time from the navTools/navSimulators/
// navEducation/navPractice collections via nav-dropdown.njk.
//
// Two levels of disclosure:
//   • Section (level 1) — .nav-menu-toggle opens a .nav-menu.
//   • Category (level 2) — inside a *categorized* section's menu, each
//     .nav-menu-group has a .nav-group-toggle that opens its .nav-submenu
//     of links. One category open at a time per section; collapsing a
//     section resets its categories. Flat sections (Simulators) have no
//     groups, so the group code no-ops and they behave as a plain list.
//
// Disclosure pattern (button with aria-expanded + aria-controls), NOT a
// CSS :hover menu: hover fails keyboard users and fails touch entirely —
// the field engineer on a phone in a mech room is exactly who that breaks.
// Items are ordinary buttons/links, so Tab walks them for free; Arrow /
// Home / End / Escape are layered on top and rove only the *visible* rows
// (a collapsed category's links are skipped). Enter/Space on a category
// toggle expands it (native button activation). Escape collapses the open
// category first, then the section.
//
// Loaded site-wide from _includes/layouts/page.njk. Escape here is a
// bubble-phase document listener, so search.js's capture-phase Escape
// (which stops propagation while the palette is open) still wins.
//
// Public API (window.NavMenu): closeAll(), setNavOpen(open).
// ──────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    const items = Array.prototype.slice.call(
        document.querySelectorAll('.nav-item--has-menu'));
    if (!items.length) return;

    const menus = items
        .map((item) => ({
            item: item,
            toggle: item.querySelector('.nav-menu-toggle'),
            menu: item.querySelector('.nav-menu')
        }))
        .filter((m) => m.toggle && m.menu);

    // ── Category groups (level 2) ───────────────────────────────────────
    // A categorized section's menu holds .nav-menu-group blocks, each a
    // .nav-group-toggle + .nav-submenu. Flat sections return [] here.
    const groupsOf = (m) =>
        Array.prototype.slice.call(m.menu.querySelectorAll('.nav-menu-group'))
            .map((el) => ({
                toggle: el.querySelector('.nav-group-toggle'),
                sub: el.querySelector('.nav-submenu')
            }))
            .filter((g) => g.toggle && g.sub);

    function isGroupOpen(g) {
        return g.toggle.getAttribute('aria-expanded') === 'true';
    }
    function closeGroup(g) {
        g.toggle.setAttribute('aria-expanded', 'false');
        g.sub.hidden = true;
    }
    function closeGroups(m, exceptToggle) {
        groupsOf(m).forEach((g) => { if (g.toggle !== exceptToggle) closeGroup(g); });
    }
    function openGroup(m, g) {
        closeGroups(m, g.toggle);   // one category open at a time per section
        g.toggle.setAttribute('aria-expanded', 'true');
        g.sub.hidden = false;
    }
    function toggleGroup(m, g) {
        if (isGroupOpen(g)) closeGroup(g); else openGroup(m, g);
    }

    // ── Section menus (level 1) ─────────────────────────────────────────
    function isOpen(m) {
        return m.toggle.getAttribute('aria-expanded') === 'true';
    }
    function close(m) {
        m.toggle.setAttribute('aria-expanded', 'false');
        m.menu.hidden = true;
        closeGroups(m);   // collapsing a section resets its categories
    }
    function closeAll(except) {
        menus.forEach((m) => { if (m !== except) close(m); });
    }
    function open(m) {
        closeAll(m);
        m.toggle.setAttribute('aria-expanded', 'true');
        m.menu.hidden = false;
    }
    function toggle(m) {
        if (isOpen(m)) close(m); else open(m);
    }

    // Roving targets for keyboard nav: the visible row sequence in DOM
    // order. Categorized → each group toggle plus, when a category is
    // open, its submenu links (collapsed links are excluded so focus
    // never lands on a hidden element). Flat → the links directly.
    function focusables(m) {
        const groups = groupsOf(m);
        if (!groups.length) {
            return Array.prototype.slice.call(
                m.menu.querySelectorAll('.nav-menu-item'));
        }
        const out = [];
        groups.forEach((g) => {
            out.push(g.toggle);
            if (isGroupOpen(g)) {
                Array.prototype.forEach.call(
                    g.sub.querySelectorAll('.nav-menu-item'), (a) => out.push(a));
            }
        });
        return out;
    }
    function focusAt(list, idx) {
        if (!list.length) return;
        let i = idx;
        if (i < 0) i = list.length - 1;
        if (i >= list.length) i = 0;
        list[i].focus();
    }

    menus.forEach((m) => {
        m.toggle.addEventListener('click', () => toggle(m));

        m.toggle.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); open(m); focusAt(focusables(m), 0); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); open(m); focusAt(focusables(m), -1); }
            else if (e.key === 'Escape' && isOpen(m)) { e.preventDefault(); e.stopPropagation(); close(m); }
        });

        // Category toggles: Enter/Space (native button click) expand them;
        // arrows/Home/End/Escape are handled by the menu-level listener.
        groupsOf(m).forEach((g) => {
            g.toggle.addEventListener('click', () => toggleGroup(m, g));
        });

        m.menu.addEventListener('keydown', (e) => {
            const list = focusables(m);
            const cur = list.indexOf(document.activeElement);
            if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(list, cur + 1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(list, cur - 1); }
            else if (e.key === 'Home') { e.preventDefault(); focusAt(list, 0); }
            else if (e.key === 'End') { e.preventDefault(); focusAt(list, list.length - 1); }
            else if (e.key === 'Escape') {
                e.preventDefault();
                // Step back one level only — stop the bubble so the
                // document Escape handler doesn't closeAll() and blow the
                // whole section (and the mobile sheet) away in one press.
                e.stopPropagation();
                // Collapse the open category if focus is on/inside it;
                // otherwise back out of the whole section.
                const g = groupsOf(m).find((grp) =>
                    isGroupOpen(grp) && (grp.toggle === document.activeElement
                        || grp.sub.contains(document.activeElement)));
                if (g) { closeGroup(g); g.toggle.focus(); }
                else { close(m); m.toggle.focus(); }
            }
        });

        // Tab (or any focus move) out of this nav item closes its menu.
        m.item.addEventListener('focusout', (e) => {
            if (!m.item.contains(e.relatedTarget)) close(m);
        });
    });

    // ── Mobile hamburger: collapses the whole link bar behind one button
    // so the header isn't half the screen on a phone. Desktop never shows
    // the button (CSS), so this is inert there.
    const nav = document.querySelector('.site-nav');
    const burger = document.getElementById('nav-hamburger');
    function setNavOpen(open) {
        if (!nav || !burger) return;
        const wasOpen = nav.classList.contains('nav-open');
        nav.classList.toggle('nav-open', open);
        // Lock page scroll while the sheet is open so the only thing that
        // scrolls is the sheet itself (the CSS lock is mobile-scoped).
        document.body.classList.toggle('nav-sheet-open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        if (!open) closeAll();   // collapsing the bar also closes any sub-menu

        // Focus management (audit-2026-06 #6): the sheet renders BEFORE
        // the burger in DOM order, so forward Tab from the burger lands
        // in the page *behind* the scroll-locked sheet — focus becomes
        // invisible and the page won't scroll to it. Move focus to the
        // first sheet item on open; on close, hand it back to the burger
        // if it was inside the (now display:none) sheet or already lost.
        if (open && !wasOpen) {
            const first = document.querySelector('#site-nav-links a, #site-nav-links button');
            if (first) first.focus();
        } else if (!open && wasOpen) {
            const a = document.activeElement;
            if (!a || a === document.body || a.closest('#site-nav-links')) {
                burger.focus();
            }
        }
    }
    if (burger) {
        burger.addEventListener('click', () =>
            setNavOpen(!nav.classList.contains('nav-open')));
    }

    // A click outside a section group closes its sub-menu; a click fully
    // outside the nav also collapses the mobile hamburger.
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-item--has-menu')) closeAll();
        if (nav && nav.classList.contains('nav-open') && !e.target.closest('.site-nav')) {
            setNavOpen(false);
        }
    });

    // Bubble-phase Escape backstop (search.js's capture Escape runs first).
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAll();
            if (nav && nav.classList.contains('nav-open')) setNavOpen(false);
        }
    });

    window.NavMenu = { closeAll: closeAll, setNavOpen: setNavOpen };
}());
