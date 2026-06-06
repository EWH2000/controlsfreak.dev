// Site-wide theme: 'dark' (the default register) or 'light' (≈ the
// pre-redesign look). Persisted in localStorage (cf_theme) and surfaced
// as [data-theme] on <html>, which the CSS keys off — see styles.css
// :root (dark) + :root[data-theme="light"].
//
// A before-paint bootstrap in _includes/head.njk sets [data-theme] (and
// the theme-color meta) from cf_theme, else prefers-color-scheme, so the
// first paint is correct with no flash. This script — loaded site-wide
// from layouts/page.njk, so the nav toggle works on EVERY page (unlike
// units.js, which loads only on pages that convert) — owns the runtime:
// it wires the .theme-btn pill, keeps aria-pressed + the theme-color meta
// in sync, and persists changes.
//
// Public API (window.Theme):
//   current()      → 'dark' | 'light'
//   set(theme)     → updates state, persists, flips <html>, broadcasts
//
// Custom event: 'themechange' on document, detail = { theme }. Canvas-
// based pages (psychrometric chart, PID tuner) can subscribe to redraw.

(function () {
    'use strict';

    const STORAGE_KEY = 'cf_theme';
    const THEMES = ['dark', 'light'];
    const META_COLOR = { dark: '#13161b', light: '#ffffff' };

    function stored() {
        try {
            const v = localStorage.getItem(STORAGE_KEY);
            return THEMES.indexOf(v) !== -1 ? v : null;
        } catch (e) {
            return null;
        }
    }

    function prefersLight() {
        return window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches;
    }

    // Active theme: whatever the head bootstrap already put on <html>,
    // else the stored choice, else the OS preference, else dark default.
    function resolve() {
        const attr = document.documentElement.dataset.theme;
        if (THEMES.indexOf(attr) !== -1) return attr;
        return stored() || (prefersLight() ? 'light' : 'dark');
    }

    let theme = resolve();

    function save(t) {
        try { localStorage.setItem(STORAGE_KEY, t); } catch (e) { /* private mode etc. */ }
    }

    function syncMeta() {
        const m = document.querySelector('meta[name="theme-color"]');
        if (m) m.setAttribute('content', META_COLOR[theme]);
    }

    function syncAria() {
        const btns = document.querySelectorAll('.theme-btn[data-theme-set]');
        for (let i = 0; i < btns.length; i++) {
            btns[i].setAttribute('aria-pressed', btns[i].dataset.themeSet === theme ? 'true' : 'false');
        }
    }

    function setTheme(next) {
        if (THEMES.indexOf(next) === -1 || next === theme) return;
        theme = next;
        save(theme);
        document.documentElement.dataset.theme = theme;
        syncMeta();
        syncAria();
        document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
    }

    function onReady() {
        // Belt-and-braces: make <html> + meta + aria agree with the active
        // theme even if the head bootstrap was somehow absent.
        document.documentElement.dataset.theme = theme;
        syncMeta();
        syncAria();
        const btns = document.querySelectorAll('.theme-btn[data-theme-set]');
        for (const btn of btns) {
            btn.addEventListener('click', function () { setTheme(btn.dataset.themeSet); });
        }
    }

    // The tag sits near the end of <body>, so document.body is normally
    // already parsed; DOMContentLoaded is the safety net.
    if (document.body) {
        onReady();
    } else {
        document.addEventListener('DOMContentLoaded', onReady);
    }

    window.Theme = {
        current: function () { return theme; },
        set: setTheme
    };
})();
