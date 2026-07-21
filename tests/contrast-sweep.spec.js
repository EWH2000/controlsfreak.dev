// WCAG 1.4.3 contrast sweep over the built site, in BOTH themes.
//
// Four contrast fixes have shipped — codebase-issues #81, #166, #171,
// #188 — and every one of them was found by a human or an agent
// recomputing ratios by hand. None left a guard behind, so the next
// regression was always found the same expensive way. Contrast is
// invisible in code review: nobody reads `color: var(--accent)` in a
// diff and sees 4.42:1. This spec is that missing guard, and it is
// BLOCKING (owner decision, 2026-07-20) — not report-only like the
// prose lint.
//
// ── Why it composites opacity ────────────────────────────────────────
// The single most important thing this file does. #188's own
// verification compared computed `color` against the resolved
// background and was therefore structurally blind to a separate
// `opacity` on the text element. That blindness hid `.bit-idx` on
// modbus-register-viewer at 1.83:1 while its declared pairing read a
// healthy 4.83:1 (codebase-issues #192). A guard that reads DECLARED
// colour reproduces the bug it exists to catch, so the walk multiplies
// the effective opacity all the way up to <html> and composites the ink
// at that alpha. Every failure this sweep has left to allowlist is in
// exactly that family, which is the point.
//
// ── What counts as "text" ────────────────────────────────────────────
// Four ink sources per element, because three of them are invisible to
// a childNodes scan and each has already shipped a real defect
// elsewhere on the web:
//   * the element's OWN text nodes;
//   * `::before` / `::after` string content — `.tool-preamble > summary`
//     paints a "▸ more" affordance entirely in a pseudo-element;
//   * an `<input>` / `<textarea>`'s VALUE — a seeded field's text is not
//     a child node at all;
//   * `::placeholder` — which is how this sweep found the whole
//     `.ps-input` family sitting on the Chromium default at 4.04:1.
// Pseudo content with no letter or digit in it (the `•` separator on
// `.nav-card-pill`, drawn in `--border`) is pure decoration under
// WCAG 1.4.3 and is skipped; anything with a word in it is measured.
//
// ── How a ratio is computed ──────────────────────────────────────────
// For each ink source on an element (a container's contrast is decided
// by its own text, not a descendant's — the descendant gets its own
// visit):
//   1. effective opacity = product of `opacity` from the element up to
//      <html>.
//   2. backdrop = walk from the element ITSELF outward, compositing each
//      `background-color` scaled by the cumulative opacity in force
//      where it paints, stopping at the first fully opaque one. Starting
//      at the element and not its parent is load-bearing: text sits on
//      top of its own element's background, and skipping it reported
//      accent-on-accent buttons as a nonsense 1:1.
//   3. ink = element `color` at (its own alpha x effective opacity),
//      composited over that backdrop.
//   4. floor = 3:1 for large text (>=24px, or >=18.66px at weight >=700),
//      4.5:1 otherwise.
//
// The math is pinned by `contrast math reproduces independently
// recorded ratios` below. That test is not ceremony: the first draft of
// this walker had `1.055` typed as `2.055` in the sRGB linearization and
// scored white-on-black at 5.04:1 instead of 21:1, which quietly turned
// most of the site red. Every constant in a guard like this needs a
// known-answer check or the guard is unfalsifiable.
// That test drives `walk` itself, through its `selfTest` parameter — a
// re-implementation of the formulas in the test body would pin a
// private copy and leave the walker's own constants unguarded, which
// is precisely the shape of no-op guard this file exists to argue
// against (verified by mutation: `1.055` -> `2.055` in `lum` must turn
// the known-answer test red).
//
// ── Scope, and what is deliberately NOT measured ─────────────────────
// * SVG text. Diagram labels sit over drawn geometry, not over CSS
//   backgrounds, so ancestor-walking cannot resolve their backdrop at
//   all. Covering them needs pixel sampling, which is a different
//   (and much more fragile) instrument.
// * The EQUIPMENT REGISTER (`.device` / `.lcd` / `.keypad` / `.gauge.eq`
//   / `.cw-term`). Those faces are painted with gradients — the LCD is
//   `linear-gradient(--lcd-bg -> --lcd-bg-2)` under a radial dot-matrix
//   mesh — which an ancestor walk cannot flatten. Excluded by NAME
//   rather than by "has a background-image" so the hole stays bounded,
//   and safe to exclude on measurement, not assumption: --lcd-ink
//   (#1b2410) reads 7.59:1 on --lcd-bg and 6.16:1 on --lcd-bg-2, so the
//   register clears AA at both ends of its own gradient. It is also
//   theme-constant by design ("a device is a device").
//   Any OTHER background-image in the backdrop window is NOT silently
//   excused as an exemption: a failing text row over one is routed to
//   `unresolved` (asserted empty) rather than `fail`. But mind the limit
//   — `unresolved` is reached ONLY after a row has already failed the
//   ratio against the flattened, gradient-ignoring backdrop (the walk
//   `continue`s on a pass first). So a new gradient surface is caught
//   only where its text ALSO fails that flattened approximation; text
//   that clears it passes silently and the gradient's own light/dark
//   spread is never assessed. See codebase-issues #194.
// * Disabled controls — WCAG 1.4.3 exempts text in an inactive user
//   interface component.
// * Text that is closed at load and has no shared container to reveal
//   it. This one used to be much larger than it looks: a census on
//   2026-07-20 found MORE text elements skipped as hidden (21,242) than
//   measured (19,434). `settle()` now opens the four collapsed chrome
//   shapes that carry real content on every page — the nav dropdowns
//   (`.nav-menu` / `.nav-submenu`), inactive `.tab-pane`s, and the
//   command `.palette` — which were 20,818 of those 21,242. Note it
//   takes BOTH halves: the nav levels are closed with the `hidden`
//   attribute, which the walk skips independently of `display`, so the
//   stylesheet override alone left every nav link unmeasured. What
//   remains is genuinely state-dependent markup a test fixture cannot
//   open from the outside (a quiz's dirty-state notice, the
//   psychrometric editor, conditional table rows); reaching those needs
//   a behavioral spec that drives the widget.
//
// ── Why the sanity floors ────────────────────────────────────────────
// Same reasoning as link-integrity.spec.js: every assertion here derives
// truth from a DOM walk, and a walk that silently stops matching turns a
// real guard into a green no-op — zero elements measured, zero failures,
// test passes. So each theme asserts a floor on how much it measured
// before it asserts what it measured is clean. Floors sit well under
// today's numbers so normal growth never trips them.
//
// ── Settling the page before measuring ───────────────────────────────
// Sampling a page mid-transition reads elements at whatever opacity the
// animation happened to be at — the first run of this walker reported
// ~20,000 "failures" that were nav dropdowns and reveal animations
// caught in flight. So: reducedMotion, transitions zeroed, and every
// running animation finished (or cancelled, for the infinite ones)
// before the walk.

'use strict';

const { test, expect } = require('@playwright/test');
const PAGES = require('./pages');

// styleguide.html is noindex — no canonical, so it is absent from the
// sitemap and therefore from tests/pages.js. It is also the one page whose
// whole purpose is exercising both registers in both themes, and the only
// place the .status-pill .warn / .error verdict states are rendered
// statically — everywhere else they are applied at runtime, so the
// static-page walk never reaches them and those verdict inks go unmeasured
// (codebase-issues #194). Graft it on so the sweep covers it, exactly as
// responsive.spec.js:18 does and for the same reason.
const SWEEP_PAGES = [...PAGES, { name: 'styleguide', url: '/styleguide.html' }];

// Allowlisted shapes. Each entry is a STANDING ANSWER with a measured
// ratio and a reason — codebase-issues #168 is the model, and the point
// of writing them down is that the next reader can tell "deliberate"
// from "not yet fixed". Never a threshold fudge, never a bare selector.
//
// Every entry below is the same defect: a separate `opacity` used to
// convey an inactive/off STATE on a control that is still operable, so
// the WCAG inactive-component exemption does not apply. The fix in each
// case is "drop the opacity, dim the colour to compensate" — a
// visual-weight change to a widget's look, which is an owner call, not
// something a test-guard lane should decide unilaterally. They are
// listed here so the guard can block on everything else today.
//
// Each entry also names the `page` its standing answer was measured on.
// `every ALLOWLIST entry still matches something` below asserts that
// entry still fires there — without it a fixed entry silently decays
// into a permanent exemption by class name, which is the same green
// no-op failure mode the sanity floors exist to prevent. When a lane
// clears one of these, the entry must be DELETED, and that test is what
// forces the deletion.
const ALLOWLIST = [
    {
        page: '/tools/psychrometric-chart.html',
        match: (r) => r.cls.split(/\s+/).includes('psy-pill') && r.cls.split(/\s+/).includes('off'),
        why: '.psy-pill.off on tools/psychrometric-chart marks a stage that is switched '
            + 'off, via opacity 0.45 (0.78 when also .active). Measured 1.91:1 (light) / '
            + '2.24:1 (dark). The pill is still operable — clicking it is how you turn the '
            + 'stage on — so this is a real AA fail, not an inactive-component exemption. '
            + 'Needs an owner call on how an off stage should read.',
    },
    {
        page: '/simulators/vfd-mock.html',
        match: (r) => r.ancestorCls.includes('vfdm-ext-row') && r.ancestorCls.includes('inactive'),
        why: '.vfdm-ext-row.inactive on simulators/vfd-mock greys a whole external-command '
            + 'row to opacity 0.35 when the drive is not listening to that source. '
            + 'Measured 1.63-2.43:1 across .vfdm-ext-lbl and .vfdm-net-btn. The markup '
            + 'comment is explicit that the controls stay operable ("the wire is wired, '
            + 'the drive just isn\'t listening"), so the exemption does not apply. Same '
            + 'owner call as .psy-pill.off.',
    },
];

// The equipment register paints gradient device faces an ancestor walk
// cannot flatten. See the scope note in the header.
const EQUIPMENT = '.device, .lcd, .keypad, .gauge.eq, .cw-term';

function walk(equipmentSelector, selfTest) {
    const parse = (s) => {
        if (!s) return null;
        const m = s.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
        if (p.length < 3 || p.some((n) => !isFinite(n))) return null;
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const over = (fg, bg) => ({
        r: fg.r * fg.a + bg.r * (1 - fg.a),
        g: fg.g * fg.a + bg.g * (1 - fg.a),
        b: fg.b * fg.a + bg.b * (1 - fg.a),
        a: 1,
    });
    const lum = (c) => {
        const f = (v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const ratio = (a, b) => {
        const la = lum(a), lb = lum(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };
    const hex = (c) => '#' + [c.r, c.g, c.b]
        .map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

    const cssPath = (el) => {
        const bits = [];
        for (let n = el; n && n.nodeType === 1 && bits.length < 4; n = n.parentElement) {
            let s = n.tagName.toLowerCase();
            if (n.id) { bits.unshift(s + '#' + n.id); break; }
            const cls = (n.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
            if (cls.length) s += '.' + cls.join('.');
            bits.unshift(s);
        }
        return bits.join(' > ');
    };

    // Known-answer mode: hand the caller ratios computed by THESE
    // closures, so the pinning test exercises the real constants
    // instead of a copy of them. `parse` and `over` are on the path
    // too, not just `lum` / `ratio`.
    if (selfTest) {
        const fromHex = (h) => {
            const n = parseInt(h.slice(1), 16);
            return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
        };
        const round = (x) => Math.round(x * 100) / 100;
        const R = (a, b) => round(ratio(fromHex(a), fromHex(b)));
        const black = fromHex('#000000');
        return {
            sanity:    R('#ffffff', '#000000'),
            i81:       R('#828d9b', '#283038'),
            i188old:   R('#666e66', '#e8ece4'),
            i188new:   R('#636b63', '#e8ece4'),
            i192:      R('#afb5ae', '#eef1ec'),
            composite: round(ratio(over(parse('rgba(255, 255, 255, 0.25)'), black), black)),
        };
    }

    const fail = [];
    const unresolved = [];
    let checked = 0;
    let equipment = 0;

    // A pseudo-element's `content` is only text if it says something —
    // a bare `•` / `→` / `·` separator is pure decoration under WCAG
    // 1.4.3 and is drawn from the border palette on purpose.
    const speaks = (s) => /[0-9A-Za-zÀ-ɏ]/.test(s);
    // Input types that render the user's text. `range` / `checkbox` /
    // `color` and friends have a `value` but paint no glyphs.
    const TEXTUAL = ['text', 'number', 'search', 'email', 'tel', 'url', 'password'];

    for (const el of document.body.querySelectorAll('*')) {
        // Own text nodes.
        let text = '';
        for (const n of el.childNodes) if (n.nodeType === 3) text += n.nodeValue;
        text = text.replace(/\s+/g, ' ').trim();

        if (el.closest('svg')) continue;
        if (el.closest('[hidden]')) continue;
        // WCAG 1.4.3 exempts text in an inactive UI component.
        if (el.closest(':disabled, [aria-disabled="true"]')) continue;
        if (el.closest(equipmentSelector)) { if (text) equipment++; continue; }

        const rect = el.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) continue;

        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;

        // The element's ink sources — see "What counts as text" above.
        // `extra` is opacity carried by the sample itself rather than by
        // the element, which the ancestor product below already has.
        const samples = [];
        if (text) samples.push({ src: 'text', text, cs, own: null, extra: 1 });
        for (const pe of ['::before', '::after']) {
            const ps = getComputedStyle(el, pe);
            const raw = (ps.content || '').trim();
            // Quoted string literals only — `counter()` / `attr()` /
            // `open-quote` render text this walker cannot resolve, and
            // the site uses none of them.
            if (!/^(["']).*\1$/.test(raw)) continue;
            const lit = raw.slice(1, -1);
            if (!speaks(lit)) continue;
            const po = parseFloat(ps.opacity);
            samples.push({
                src: pe, text: lit.trim(), cs: ps,
                own: ps.backgroundColor, extra: isFinite(po) ? po : 1,
            });
        }
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            const type = (el.getAttribute('type') || 'text').toLowerCase();
            if (el.tagName === 'TEXTAREA' || TEXTUAL.includes(type)) {
                if (el.value) {
                    samples.push({ src: 'value', text: String(el.value), cs, own: null, extra: 1 });
                }
                const ph = (el.getAttribute('placeholder') || '').trim();
                if (ph) {
                    const ps = getComputedStyle(el, '::placeholder');
                    const po = parseFloat(ps.opacity);
                    samples.push({
                        src: '::placeholder', text: ph, cs: ps,
                        own: null, extra: isFinite(po) ? po : 1,
                    });
                }
            }
        }
        if (!samples.length) continue;

        const chain = [];
        for (let n = el; n && n.nodeType === 1; n = n.parentElement) chain.unshift(n);

        let opacity = 1;
        let hiddenAncestor = false;
        const opacityAt = [];
        for (const n of chain) {
            const s = getComputedStyle(n);
            if (s.display === 'none' || s.visibility === 'hidden') { hiddenAncestor = true; break; }
            const o = parseFloat(s.opacity);
            opacity *= isFinite(o) ? o : 1;
            opacityAt.push(opacity);
        }
        if (hiddenAncestor) continue;
        // Effectively invisible is not a contrast defect.
        if (opacity < 0.02) continue;

        // Backdrop: element itself outward, stopping at the first opaque
        // background-color. Only layers inside that terminus can affect
        // the ink, so only those are checked for an unflattenable image.
        const stack = [];
        let painted = null;
        for (let i = chain.length - 1; i >= 0; i--) {
            const n = chain[i];
            const s = getComputedStyle(n);
            const c = parse(s.backgroundColor);
            const eff = c ? c.a * opacityAt[i] : 0;
            // body's blueprint graticule is a known, bounded exception:
            // it is 1px --border-faint / --border lines over --bg, and
            // every content surface paints opaquely over it.
            if (s.backgroundImage !== 'none' && n !== document.body && !painted) {
                painted = cssPath(n);
            }
            if (eff > 0) stack.push({ ...c, a: eff });
            if (eff >= 0.999) break;
        }
        let bg = { r: 255, g: 255, b: 255, a: 1 };
        for (let i = stack.length - 1; i >= 0; i--) bg = over(stack[i], bg);

        const ancestorCls = chain.map((n) => n.getAttribute('class') || '').join(' ');

        for (const s of samples) {
            // A pseudo-element can paint its own background over the
            // element's; nothing else in `samples` can.
            let sbg = bg;
            const ownBg = s.own ? parse(s.own) : null;
            if (ownBg && ownBg.a > 0) sbg = over({ ...ownBg, a: ownBg.a * opacity }, bg);

            const fgRaw = parse(s.cs.color);
            if (!fgRaw) continue;
            const eff = opacity * s.extra;
            if (eff < 0.02) continue;
            const fg = over({ ...fgRaw, a: fgRaw.a * eff }, sbg);

            const size = parseFloat(s.cs.fontSize);
            const weight = parseInt(s.cs.fontWeight, 10) || 400;
            const large = size >= 24 || (size >= 18.66 && weight >= 700);
            const floor = large ? 3 : 4.5;
            const r = ratio(fg, sbg);

            checked++;
            // 0.005 slack absorbs float noise at exactly-on-the-floor values.
            if (r + 0.005 >= floor) continue;

            const row = {
                path: cssPath(el) + (s.src === 'text' ? '' : ' ' + s.src),
                cls: (el.getAttribute('class') || '').trim(),
                ancestorCls,
                src: s.src,
                text: s.text.slice(0, 40),
                ink: hex(fg),
                bg: hex(sbg),
                size,
                weight,
                floor,
                ratio: Math.round(r * 100) / 100,
                opacity: Math.round(eff * 1000) / 1000,
            };
            if (painted) unresolved.push({ ...row, painted });
            else fail.push(row);
        }
    }
    return { fail, unresolved, checked, equipment };
}

// Chrome that ships closed on every page and would otherwise never be
// measured: the two nav dropdown levels, inactive tab panes, and the
// command palette. Revealing them costs nothing in accuracy — the walk
// resolves a backdrop by ancestor chain, not by painted pixels, so the
// overlapping layout a forced-open menu produces does not change any
// ratio.
const COLLAPSED_CHROME = '.nav-menu, .nav-submenu, .tab-pane, .palette';

async function settle(page) {
    // The nav dropdowns are closed with the `hidden` ATTRIBUTE, not just
    // a stylesheet rule, and the walk skips `[hidden]` subtrees — so CSS
    // alone leaves ~110 nav links per page unmeasured. Strip the
    // attribute on exactly these containers; every other `[hidden]`
    // subtree on the site is genuinely state-dependent and stays skipped.
    await page.evaluate((sel) => {
        for (const el of document.querySelectorAll(sel)) el.removeAttribute('hidden');
    }, COLLAPSED_CHROME);
    await page.addStyleTag({
        content: '*,*::before,*::after{transition-duration:0s !important;transition-delay:0s !important}'
            + COLLAPSED_CHROME + '{display:block !important;visibility:visible !important}',
    });
    await page.evaluate(() => {
        for (const a of document.getAnimations()) {
            try { a.finish(); } catch (e) { a.cancel(); }
        }
    });
}

const describeRow = (p, r) => `${p} ${r.path} — ${r.ratio}:1 (needs ${r.floor}) `
    + `ink ${r.ink} on ${r.bg}, ${r.size}px w${r.weight}, opacity ${r.opacity} — "${r.text}"`;

// Known-answer check on the ratio math itself, using ratios recorded
// INDEPENDENTLY of this file: four from styles.css token comments
// (codebase-issues #81, #166, #188) and one from the #192 commit
// message. If a constant in the walker drifts, this goes red before the
// sweep starts lying about the site.
//
// It calls `walk` in `selfTest` mode rather than re-deriving the
// formulas here. That is the whole point: a local re-implementation
// agrees with itself no matter what the walker does, so mutating
// `1.055` to `2.055` inside `lum` left this test green while the sweep
// it is supposed to pin turned red.
test('contrast math reproduces independently recorded ratios', async ({ page }) => {
    await page.goto('/');
    const got = await page.evaluate(`(${walk.toString()})(null, true)`);
    expect(got.sanity, 'white on black is 21:1 by definition').toBe(21);
    expect(got.i81, 'styles.css: dark #828d9b on --surface-2 (#81)').toBe(3.97);
    expect(got.i188old, 'styles.css: light #666e66 on #e8ece4 before the #188 fix').toBe(4.4);
    expect(got.i188new, 'styles.css: light --text-dim after the #188 fix').toBe(4.6);
    expect(got.i192, 'the #192 commit message: composited .bit-idx ink').toBe(1.83);
    // Pins `parse` + `over` too. 25% and not 50%: at 0.5 the composite
    // is its own mirror, so a src/dst alpha swap inside `over` produced
    // the identical rgb(127.5) and the check stayed green. At 0.25 the
    // answer is rgb(63.75) -> 2.02:1, and that same swap reads 11.45:1.
    expect(got.composite, '25% white composited over black, vs black').toBe(2.02);
});

// Sharded rather than one test per theme: every page x 2 themes in a
// single test blows the default 30s timeout, and one test per page
// would add a browser context per page per theme. Chunks of CHUNK keep each shard inside a
// generous timeout while `fullyParallel` spreads them over the workers.
const CHUNK = 20;
const chunks = [];
for (let i = 0; i < SWEEP_PAGES.length; i += CHUNK) chunks.push(SWEEP_PAGES.slice(i, i + CHUNK));

for (const theme of ['dark', 'light']) {
    chunks.forEach((group, n) => {
        const label = `${theme} theme, pages ${n * CHUNK + 1}-${n * CHUNK + group.length}`;
        test(`every text element clears its WCAG AA floor — ${label}`, async ({ browser }) => {
            test.setTimeout(180000);
            // reducedMotion so the site's own reveal animations land in their
            // settled state rather than mid-flight.
            const ctx = await browser.newContext({
                viewport: { width: 1280, height: 900 },
                reducedMotion: 'reduce',
            });
            // Dark is the default and headless Chromium reports
            // prefers-color-scheme: light, so neither theme can be assumed —
            // seed cf_theme, then assert what actually rendered.
            await ctx.addInitScript((t) => {
                try { localStorage.setItem('cf_theme', t); } catch (e) { /* private mode */ }
            }, theme);
            const page = await ctx.newPage();

            const failures = [];
            const unresolved = [];
            let checked = 0;
            let equipment = 0;

            try {
                for (const p of group) {
                    // contact.html's Turnstile never goes idle (CLAUDE.md).
                    await page.goto(p.url, { waitUntil: 'domcontentloaded' });
                    await settle(page);

                    const actual = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
                    expect(actual, `${p.url} must actually render the ${theme} theme`).toBe(theme);

                    const res = await page.evaluate(`(${walk.toString()})(${JSON.stringify(EQUIPMENT)})`);
                    checked += res.checked;
                    equipment += res.equipment;
                    for (const r of res.fail) {
                        if (ALLOWLIST.some((a) => a.match(r))) continue;
                        failures.push(describeRow(p.url, r));
                    }
                    for (const r of res.unresolved) {
                        unresolved.push(`${describeRow(p.url, r)} — behind ${r.painted}`);
                    }
                }
            } finally {
                await ctx.close();
            }

            // Sanity floor first — see the header. Every page carries the
            // shared nav (dropdowns force-opened by `settle`) + footer, so
            // even the thinnest page measures hundreds of ink sources —
            // /contact.html, the floor of the site, was 187 on 2026-07-20.
            expect(checked, 'sanity: text elements were measured at all')
                .toBeGreaterThanOrEqual(group.length * 100);
            void equipment;

            // A gradient under real text outside the equipment register is a
            // hole in this guard, not an exemption from it.
            expect(unresolved, 'text over an unflattenable background must not go unmeasured').toEqual([]);
            expect(failures, `WCAG AA contrast failures (${label})`).toEqual([]);
        });
    });
}

// The equipment-register skip is the guard's one named blind spot, so it
// gets its own floor: if the selector ever stops matching, these pages
// would quietly start being measured with an unresolvable backdrop
// (which `unresolved` would then catch) or, worse, a wrong one. Pinned
// on the two pages that carry the most device chrome.
// An ALLOWLIST entry that stops matching is not a passing test, it is a
// standing exemption for a shape nobody is measuring any more — and the
// measured ratios written next to it become fiction. The sharded sweep
// cannot assert this (an entry lives on one page, in one shard), so it
// gets its own pass over just the pages the entries name. When a lane
// clears one of these, DELETE the entry; this test is what makes that
// non-optional.
test('every ALLOWLIST entry still matches something', async ({ browser }) => {
    test.setTimeout(120000);
    const pages = [...new Set(ALLOWLIST.map((a) => a.page))];
    const hits = ALLOWLIST.map(() => 0);
    for (const theme of ['dark', 'light']) {
        const ctx = await browser.newContext({
            viewport: { width: 1280, height: 900 },
            reducedMotion: 'reduce',
        });
        await ctx.addInitScript((t) => {
            try { localStorage.setItem('cf_theme', t); } catch (e) { /* private mode */ }
        }, theme);
        const page = await ctx.newPage();
        try {
            for (const url of pages) {
                await page.goto(url, { waitUntil: 'domcontentloaded' });
                await settle(page);
                const res = await page.evaluate(`(${walk.toString()})(${JSON.stringify(EQUIPMENT)})`);
                for (const r of res.fail) {
                    ALLOWLIST.forEach((a, i) => { if (a.page === url && a.match(r)) hits[i]++; });
                }
            }
        } finally {
            await ctx.close();
        }
    }
    const dead = ALLOWLIST
        .map((a, i) => ({ a, n: hits[i] }))
        .filter((x) => x.n === 0)
        .map((x) => `${x.a.page} — entry no longer matches any failure; delete it: ${x.a.why.slice(0, 80)}…`);
    expect(dead, 'a stale ALLOWLIST entry is a permanent silent exemption').toEqual([]);
});

test('the equipment-register scope exclusion still resolves', async ({ page }) => {
    let equipment = 0;
    for (const url of ['/simulators/refrigerant-loop.html', '/simulators/vfd-mock.html']) {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await settle(page);
        const res = await page.evaluate(`(${walk.toString()})(${JSON.stringify(EQUIPMENT)})`);
        equipment += res.equipment;
    }
    expect(equipment, 'sanity: .device / .lcd / .keypad text was found and skipped')
        .toBeGreaterThanOrEqual(20);
});
