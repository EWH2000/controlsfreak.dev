// ──────────────────────────────────────────────────────────────────────
// search.js — site-wide command palette / search.
//
// The whole point is time-to-answer: one keystroke from any page to any
// tool. Triggers are `/` and Ctrl/⌘-K (plus the visible .nav-search-btn in
// the nav). It opens a modal over a static index of every page —
// /search-index.json, emitted at build time by html/search-index.njk from
// the `searchPages` collection — fetched once on first open and cached.
// Ranked substring/token matching, no library.
//
// Loaded site-wide from _includes/layouts/page.njk (right after theme.js),
// so the shortcut works on every page. The dialog markup is static in
// page.njk (a <div id="palette" role="dialog" …>) so there's no
// build-a-DOM flash; this script only reveals/populates it.
//
// Escape coexistence: this script's trigger listener is on `document`
// (capture phase), which runs before fullscreen-toggle.js's `window`
// bubble-phase Escape listener — so when the palette is open, Escape
// closes it and stopPropagation() keeps the same keypress from also
// exiting a fullscreen tool card.
//
// Public API (window.Palette):
//   open(invoker?)  → reveal modal, lazy-fetch the index, focus the input
//   close()         → hide modal, restore focus to the invoker
//   isOpen()        → boolean
//
// Custom events on document: 'paletteopen' / 'paletteclose' (mirrors
// theme.js's 'themechange' broadcast convention).

(function () {
    'use strict';

    const INDEX_URL = '/search-index.json';
    const MAX_RESULTS = 8;
    const SECTION_ORDER = { tools: 0, simulators: 1, education: 2, practice: 3 };
    const SECTION_LABEL = {
        tools: 'Tool',
        simulators: 'Simulator',
        education: 'Lesson',
        practice: 'Practice'
    };

    let entries = null;          // cached index (null until first fetch)
    let loading = null;          // in-flight fetch promise (de-dupes opens)
    let results = [];            // current ranked results
    let active = -1;             // highlighted index into results
    let invoker = null;          // element to restore focus to on close

    const byId = (id) => document.getElementById(id);
    const palette = byId('palette');
    if (!palette) return;        // markup absent → no-op
    const input = byId('palette-input');
    const list = byId('palette-results');
    const status = byId('palette-status');

    const reduce = window.matchMedia &&
        matchMedia('(prefers-reduced-motion: reduce)').matches;

    function isTypingTarget(el) {
        if (!el) return false;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
            el.isContentEditable;
    }

    function load() {
        if (entries) return Promise.resolve(entries);
        if (loading) return loading;
        loading = fetch(INDEX_URL)
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => { entries = Array.isArray(data) ? data : []; return entries; })
            .catch(() => { entries = []; return entries; });
        return loading;
    }

    function sectionRank(s) {
        return s in SECTION_ORDER ? SECTION_ORDER[s] : 4;
    }

    // Score-level section boost (owner decision, codebase-issues #82):
    // the palette's stated job is one keystroke to any TOOL, so tools
    // and simulators get a flat bonus instead of the old tie-break-only
    // ordering — "superheat" now puts the calculator above the
    // lesson/quiz pair (97+35 vs 125). Sized to about one title-token's
    // worth: a strong lesson title match still beats a weak tool
    // keyword match. The bonus applies ONLY when the entry matched in
    // its title or keywords — a description-only hit is the weakest
    // signal (often an incidental word like dew-point's "...flags..."
    // for the query "fla"), and boosting it promoted noise above the
    // pages that genuinely cover the term (caught by CI on the #217
    // regression test the first cut of this bonus broke).
    const SECTION_BONUS = { tools: 35, simulators: 20 };

    // Short tokens (≤3 chars) must match at a word START — a bare
    // substring match on "fla" surfaced cloudFLAre and similar mid-word
    // noise while the pages that actually cover FLA were unreachable
    // (audit-2026-06 #17). Word-start (rather than whole-word) keeps
    // incremental typing alive: "sig" still finds Signal Scaling.
    // Longer tokens keep plain substring matching.
    function hasToken(hay, t) {
        if (t.length > 3) return hay.includes(t);
        let i = hay.indexOf(t);
        while (i !== -1) {
            if (i === 0 || !/[a-z0-9]/.test(hay[i - 1])) return true;
            i = hay.indexOf(t, i + 1);
        }
        return false;
    }

    // Weighted substring/token score. Every query token must match the
    // title, keywords, or description somewhere, or the entry is dropped —
    // keeps multi-word queries precise on a small index.
    function rank(raw) {
        const query = raw.trim().toLowerCase();
        if (!query || !entries) return [];
        const tokens = query.split(/\s+/);
        const scored = [];
        for (const it of entries) {
            const title = (it.title || '').toLowerCase();
            const kw = (it.keywords || '').toLowerCase();
            const desc = (it.description || '').toLowerCase();
            let score = 0;
            if (title.startsWith(query)) score += 100;
            else if (title.includes(query)) score += 60;
            let ok = true;
            let substantive = title.startsWith(query) || title.includes(query);
            for (const t of tokens) {
                let ts = 0;
                if (hasToken(title, t)) { ts += 20; substantive = true; }
                if (hasToken(kw, t)) { ts += 12; substantive = true; }
                if (hasToken(desc, t)) ts += 5;
                if (ts === 0) { ok = false; break; }
                score += ts;
            }
            if (ok) {
                scored.push({ it: it, score: score + (substantive ? (SECTION_BONUS[it.section] || 0) : 0) });
            }
        }
        scored.sort((a, b) =>
            b.score - a.score ||
            sectionRank(a.it.section) - sectionRank(b.it.section) ||
            (a.it.title || '').localeCompare(b.it.title || ''));
        return scored.slice(0, MAX_RESULTS).map((s) => s.it);
    }

    function setActive(i) {
        active = i;
        const opts = list.children;
        for (let n = 0; n < opts.length; n++) {
            const on = n === i;
            opts[n].setAttribute('aria-selected', on ? 'true' : 'false');
            if (on) opts[n].scrollIntoView({ block: 'nearest' });
        }
        // Remove rather than set '' — an empty aria-activedescendant is
        // an invalid ID reference (audit-2026-06 #56).
        if (i >= 0) input.setAttribute('aria-activedescendant', 'palette-opt-' + i);
        else input.removeAttribute('aria-activedescendant');
    }

    function move(delta) {
        if (!results.length) return;
        let i = active + delta;
        if (i < 0) i = results.length - 1;
        if (i >= results.length) i = 0;
        setActive(i);
    }

    function render() {
        list.textContent = '';
        results.forEach((it, i) => {
            const li = document.createElement('li');
            li.className = 'palette-result';
            li.id = 'palette-opt-' + i;
            li.setAttribute('role', 'option');
            li.setAttribute('aria-selected', 'false');
            li.dataset.url = it.url;

            const tag = document.createElement('span');
            tag.className = 'palette-result-tag';
            tag.textContent = SECTION_LABEL[it.section] || 'Page';

            const title = document.createElement('span');
            title.className = 'palette-result-title';
            title.textContent = it.title || it.url;

            const desc = document.createElement('span');
            desc.className = 'palette-result-desc';
            desc.textContent = it.description || '';

            li.appendChild(tag);
            li.appendChild(title);
            li.appendChild(desc);
            list.appendChild(li);
        });

        if (!input.value.trim()) {
            status.hidden = true;
            input.setAttribute('aria-expanded', 'false');
            setActive(-1);
        } else {
            status.hidden = false;
            status.textContent = results.length
                ? results.length + (results.length === 1 ? ' result' : ' results')
                : 'No matches';
            input.setAttribute('aria-expanded', results.length ? 'true' : 'false');
            setActive(results.length ? 0 : -1);
        }
    }

    function onInput() {
        results = rank(input.value);
        render();
    }

    function go(url) {
        if (url) window.location.href = url;
    }

    function isOpen() {
        return !palette.hidden;
    }

    function open(fromEl) {
        if (isOpen()) return;
        invoker = fromEl || document.activeElement;
        palette.hidden = false;
        document.body.classList.add('palette-open');
        input.value = '';
        results = [];
        render();
        input.focus();
        load().then(() => { if (isOpen()) onInput(); });
        document.dispatchEvent(new CustomEvent('paletteopen'));
    }

    function close() {
        if (!isOpen()) return;
        palette.hidden = true;
        document.body.classList.remove('palette-open');
        input.value = '';
        results = [];
        list.textContent = '';
        // The option elements are gone — a lingering activedescendant
        // would be a dangling ID reference (audit-2026-06 #56).
        active = -1;
        input.removeAttribute('aria-activedescendant');
        status.hidden = true;
        if (invoker && typeof invoker.focus === 'function') invoker.focus();
        invoker = null;
        document.dispatchEvent(new CustomEvent('paletteclose'));
    }

    // ── Wiring ─────────────────────────────────────────────────────────
    function init() {
        // Two triggers can exist: the full button in the desktop link bar
        // and a compact icon button in the mobile top bar (wired by class).
        document.querySelectorAll('.nav-search-btn').forEach((trigger) =>
            trigger.addEventListener('click', () => open(trigger)));

        input.addEventListener('input', onInput);

        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
            else if (e.key === 'Home' && results.length) { e.preventDefault(); setActive(0); }
            else if (e.key === 'End' && results.length) { e.preventDefault(); setActive(results.length - 1); }
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (active >= 0 && results[active]) go(results[active].url);
            } else if (e.key === 'Tab') {
                e.preventDefault();   // single focusable element → trap focus on input
            }
        });

        // Click a result to navigate; hover to highlight.
        list.addEventListener('click', (e) => {
            const li = e.target.closest('.palette-result');
            if (li) go(li.dataset.url);
        });
        list.addEventListener('mousemove', (e) => {
            const li = e.target.closest('.palette-result');
            if (li) setActive(Array.prototype.indexOf.call(list.children, li));
        });

        // Click the backdrop (not the box) to close.
        palette.addEventListener('mousedown', (e) => {
            if (e.target === palette) close();
        });

        // Global triggers. Capture phase so Escape beats fullscreen's
        // window-level bubble listener when the palette is open.
        document.addEventListener('keydown', (e) => {
            if (isOpen() && e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                close();
                return;
            }
            const k = e.key.toLowerCase();
            if ((e.ctrlKey || e.metaKey) && k === 'k') {
                e.preventDefault();
                open();
            } else if (e.key === '/' && !isOpen() && !isTypingTarget(e.target)) {
                e.preventDefault();
                open();
            }
        }, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.Palette = { open: open, close: close, isOpen: isOpen };
}());
