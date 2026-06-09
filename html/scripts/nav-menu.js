// ──────────────────────────────────────────────────────────────────────
// nav-menu.js — dropdown menus for the Tools / Simulators / Education nav.
//
// Goal: any tool/simulator/lesson is one click from every page, not just
// the home shortcuts. Each of the three hub items in nav.njk keeps its
// top-level link (1-click to the landing, preserves .active) and gains a
// disclosure button that opens a panel of direct links — populated at
// build time from the navTools/navSimulators/navEducation collections.
//
// Disclosure pattern (button with aria-expanded + aria-controls), NOT a
// CSS :hover menu: hover fails keyboard users and fails touch entirely —
// the field engineer on a phone in a mech room is exactly who that breaks.
// The menu items are ordinary links, so Tab walks them for free; Arrow /
// Home / End / Escape are added on top. Only one menu is open at a time.
//
// Loaded site-wide from _includes/layouts/page.njk. Escape here is a
// bubble-phase document listener, so search.js's capture-phase Escape
// (which stops propagation while the palette is open) still wins.
//
// Public API (window.NavMenu): closeAll()  — used by nothing yet; exposed
// for symmetry with the other site-wide controllers.
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

    const linksOf = (m) =>
        Array.prototype.slice.call(m.menu.querySelectorAll('.nav-menu-item'));

    function isOpen(m) {
        return m.toggle.getAttribute('aria-expanded') === 'true';
    }
    function close(m) {
        m.toggle.setAttribute('aria-expanded', 'false');
        m.menu.hidden = true;
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

    function focusLink(m, idx) {
        const links = linksOf(m);
        if (!links.length) return;
        let i = idx;
        if (i < 0) i = links.length - 1;
        if (i >= links.length) i = 0;
        links[i].focus();
    }

    menus.forEach((m) => {
        m.toggle.addEventListener('click', () => toggle(m));

        m.toggle.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); open(m); focusLink(m, 0); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); open(m); focusLink(m, -1); }
            else if (e.key === 'Escape' && isOpen(m)) { e.preventDefault(); close(m); }
        });

        m.menu.addEventListener('keydown', (e) => {
            const links = linksOf(m);
            const cur = links.indexOf(document.activeElement);
            if (e.key === 'ArrowDown') { e.preventDefault(); focusLink(m, cur + 1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); focusLink(m, cur - 1); }
            else if (e.key === 'Home') { e.preventDefault(); focusLink(m, 0); }
            else if (e.key === 'End') { e.preventDefault(); focusLink(m, -1); }
            else if (e.key === 'Escape') { e.preventDefault(); close(m); m.toggle.focus(); }
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
        nav.classList.toggle('nav-open', open);
        // Lock page scroll while the sheet is open so the only thing that
        // scrolls is the sheet itself (the CSS lock is mobile-scoped).
        document.body.classList.toggle('nav-sheet-open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        if (!open) closeAll();   // collapsing the bar also closes any sub-menu
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
