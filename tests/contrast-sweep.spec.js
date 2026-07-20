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
// ── How a ratio is computed ──────────────────────────────────────────
// For each element carrying its OWN text nodes (a container's contrast
// is decided by its own text, not a descendant's — the descendant gets
// its own visit):
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
//   Any OTHER background-image in the backdrop window is NOT excused —
//   it lands in `unresolved`, which is asserted empty, so a new gradient
//   surface under real text fails this spec instead of silently opting
//   out of it.
// * Disabled controls — WCAG 1.4.3 exempts text in an inactive user
//   interface component.
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
const ALLOWLIST = [
    {
        match: (r) => r.cls.split(/\s+/).includes('bit-idx'),
        why: 'codebase-issues #192, IN FLIGHT in a separate lane as of 2026-07-20. '
            + '.bit-idx on tools/modbus-register-viewer carries opacity 0.45; measured '
            + '1.83:1 (light) / 2.05:1 (dark). Pre-existing, not a regression, and no '
            + 'value of --text-dim can clear it — the fix is a visual-weight change to '
            + 'the bit grid. Deliberately NOT fixed here so the two lanes do not collide.',
    },
    {
        match: (r) => r.cls.split(/\s+/).includes('psy-pill') && r.cls.split(/\s+/).includes('off'),
        why: '.psy-pill.off on tools/psychrometric-chart marks a stage that is switched '
            + 'off, via opacity 0.45 (0.78 when also .active). Measured 1.91:1 (light) / '
            + '2.24:1 (dark). The pill is still operable — clicking it is how you turn the '
            + 'stage on — so this is a real AA fail, not an inactive-component exemption. '
            + 'Needs an owner call on how an off stage should read.',
    },
    {
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

function walk(equipmentSelector) {
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

    const fail = [];
    const unresolved = [];
    let checked = 0;
    let equipment = 0;

    for (const el of document.body.querySelectorAll('*')) {
        // Own text nodes only.
        let text = '';
        for (const n of el.childNodes) if (n.nodeType === 3) text += n.nodeValue;
        text = text.replace(/\s+/g, ' ').trim();
        if (!text) continue;

        if (el.closest('svg')) continue;
        if (el.closest('[hidden]')) continue;
        // WCAG 1.4.3 exempts text in an inactive UI component.
        if (el.closest(':disabled, [aria-disabled="true"]')) continue;
        if (el.closest(equipmentSelector)) { equipment++; continue; }

        const rect = el.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) continue;

        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;

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

        const fgRaw = parse(cs.color);
        if (!fgRaw) continue;
        const fg = over({ ...fgRaw, a: fgRaw.a * opacity }, bg);

        const size = parseFloat(cs.fontSize);
        const weight = parseInt(cs.fontWeight, 10) || 400;
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        const floor = large ? 3 : 4.5;
        const r = ratio(fg, bg);

        checked++;
        // 0.005 slack absorbs float noise at exactly-on-the-floor values.
        if (r + 0.005 >= floor) continue;

        const ancestorCls = chain.map((n) => n.getAttribute('class') || '').join(' ');
        const row = {
            path: cssPath(el),
            cls: (el.getAttribute('class') || '').trim(),
            ancestorCls,
            text: text.slice(0, 40),
            ink: hex(fg),
            bg: hex(bg),
            size,
            weight,
            floor,
            ratio: Math.round(r * 100) / 100,
            opacity: Math.round(opacity * 1000) / 1000,
        };
        if (painted) unresolved.push({ ...row, painted });
        else fail.push(row);
    }
    return { fail, unresolved, checked, equipment };
}

async function settle(page) {
    await page.addStyleTag({
        content: '*,*::before,*::after{transition-duration:0s !important;transition-delay:0s !important}',
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
test('contrast math reproduces independently recorded ratios', async ({ page }) => {
    await page.goto('/');
    const got = await page.evaluate(`
        (${walk.toString()}, (() => {
            const f = (v) => { const s = v / 255;
                return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
            const L = (h) => { const n = parseInt(h.slice(1), 16);
                return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255); };
            const R = (a, b) => { const x = L(a), y = L(b);
                return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
            return {
                sanity:   R('#ffffff', '#000000'),
                i81:      R('#828d9b', '#283038'),
                i188old:  R('#666e66', '#e8ece4'),
                i188new:  R('#636b63', '#e8ece4'),
                i192:     R('#afb5ae', '#eef1ec'),
            };
        }))()
    `);
    expect(got.sanity, 'white on black is 21:1 by definition').toBe(21);
    expect(got.i81, 'styles.css: dark #828d9b on --surface-2 (#81)').toBe(3.97);
    expect(got.i188old, 'styles.css: light #666e66 on #e8ece4 before the #188 fix').toBe(4.4);
    expect(got.i188new, 'styles.css: light --text-dim after the #188 fix').toBe(4.6);
    expect(got.i192, 'the #192 commit message: composited .bit-idx ink').toBe(1.83);
});

// Sharded rather than one test per theme: 133 pages x 2 themes in a
// single test blows the default 30s timeout, and one test per page
// would add 266 context launches. Chunks of 20 keep each shard inside a
// generous timeout while `fullyParallel` spreads them over the workers.
const CHUNK = 20;
const chunks = [];
for (let i = 0; i < PAGES.length; i += CHUNK) chunks.push(PAGES.slice(i, i + CHUNK));

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
        // shared nav + footer, so the thinnest page still measures well
        // over 25 text elements; measured 2026-07-20 at ~147/page.
        expect(checked, 'sanity: text elements were measured at all')
            .toBeGreaterThanOrEqual(group.length * 25);
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
