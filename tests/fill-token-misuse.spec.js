// The `-fill` family is UNSAFE AS TEXT BY CONSTRUCTION. This spec is what
// makes that constraint enforceable instead of aspirational.
//
// ── Why the family exists, and why it needs a guard ──────────────────
// `--amber` and `--heat` are component-identity colours on the DDC
// equipment graphics AND text colours elsewhere (`color: var(--amber)`
// at styles.css:2186 / :2554 / :2869 / :3179, `color: var(--heat)` in
// education/psychrometrics-basics.html). In LIGHT theme that dual role
// forces them down to clear WCAG 1.4.3's 4.5:1 small-text floor —
// 4.84:1 and 4.74:1 on `--bg`, a third of a point of headroom — which
// lands amber on a dark olive and heat on a dark orange-brown, out of
// the register the identity convention is written in (codebase-issues
// #230). `--amber-fill` / `--heat-fill` answer to WCAG 1.4.11's 3:1
// NON-TEXT floor instead, so they may run brighter. That is the whole
// point of them and it is also the whole risk: put one in a `color:`
// declaration and you have shipped 3.10:1 body text.
//
// The `-ink` family is the mirror image of this argument — `--accent-ink`
// / `--blue-ink` / `--red-text` exist because small TEXT needs a
// different step than the base hue, per theme. `-fill` exists because
// drawn GEOMETRY needs a different step than the text token. Same
// mechanism, opposite direction. The difference is that misusing an
// `-ink` token degrades gracefully (it is merely over-tuned for a
// stroke), while misusing a `-fill` token ships an AA failure — so only
// this direction gets a guard.
//
// ── Why a SOURCE scan is the primary check ───────────────────────────
// contrast-sweep.spec.js is the site's rendered contrast guard and it
// would NOT catch this, for two independent reasons, both documented in
// its own header:
//   1. It walks `tests/pages.js` (+ styleguide.html). The primary
//      consumer of these tokens, `simulators/ddc-workbench-ahu-mockup
//      .html`, is `noindex: true` + `eleventyExcludeFromCollections:
//      true` with no `canonical`, so it is absent from the sitemap and
//      therefore from PAGES. No spec visits it at all.
//   2. SVG text is explicitly out of its scope ("diagram labels sit over
//      drawn geometry, not over CSS backgrounds, so ancestor-walking
//      cannot resolve their backdrop"). `fill: var(--amber-fill)` on an
//      `<text>` is exactly the misuse this file exists to catch, and it
//      is precisely what that walker cannot measure.
// A source scan has neither hole: it reads every file, and it reports
// file:line. It is also the right instrument on failure-mode grounds —
// the defect is a human writing a declaration, and the declaration is
// literally greppable.
//
// ── Why the occurrence census, not just a blocklist ──────────────────
// Four regexes classify the four sinks a token can reach today: a CSS
// declaration, an SVG/HTML presentation attribute, `el.style.<prop> =`,
// and `setProperty('<prop>', …)`. A blocklist of those four would go
// green the day someone reaches a token through a fifth idiom. So the
// scan also COUNTS every `var(--…-fill)` reference in the stripped
// source and asserts the four classifiers accounted for all of them —
// an unclassified reference fails as loudly as a forbidden one. Same
// anti-vacuity posture as link-integrity.spec.js's sanity floors.
//
// ── Why comments must be stripped first ──────────────────────────────
// Not hygiene — correctness. The `:root` comment that pins these tokens
// says the words "never in a `color:` declaration", and the AHU graphic's
// identity-colour block quotes the rule back. Both would trip a naive
// scan. (The same trap bites the print-sync test below: a value regex
// run over unstripped CSS matches `--blue:` inside the `--blue-ink`
// comment and reports phantom drift. Measured, not guessed.)
//
// ── The guard's floor ────────────────────────────────────────────────
// It can only see what is LITERAL in a scanned file. A token reached
// through a run-time-computed property name, or injected from `_data`,
// passes. Read it as *no literal `-fill` ink ships*, never as *no
// `-fill` ink ships*. The rendered arm below closes the one gap that
// matters in practice (SVG text and custom-property aliasing) on the
// pages that actually use the tokens.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = [path.join(ROOT, 'html'), path.join(ROOT, 'src')];
const SCAN_EXT = new Set(['.css', '.html', '.njk', '.js']);
const SKIP_DIR = new Set(['node_modules', '_site', '.git', '.claude']);

// A `-fill` token is object paint. These are the properties that paint
// an object; everything else — above all `color`, but also
// `-webkit-text-fill-color`, `caret-color`, `text-decoration-color` —
// paints type or a caret and is forbidden by omission.
const PAINT_PROPS = new Set([
    'fill', 'stroke',
    'background', 'background-color', 'background-image',
    'border-color', 'border-top-color', 'border-right-color',
    'border-bottom-color', 'border-left-color',
    'outline-color', 'stop-color', 'flood-color', 'lighting-color',
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'outline',
]);

const FILL_TOKEN = /var\(\s*(--[a-z0-9-]*-fill)\b/g;

// A custom property may carry -fill paint only if it is ITSELF named
// -fill, so the never-for-text constraint travels with the name. That
// single rule also closes the aliasing hole a property-name check would
// otherwise leave open:
//     --section-accent: var(--amber-fill);   /* legal on its own */
//     .thing { color: var(--section-accent); }
// The first line is what fails here; the second is out of reach of any
// source scan.
const isPaint = (prop) => PAINT_PROPS.has(prop) || /^--[a-z0-9-]*-fill$/.test(prop);

function scanFiles() {
    const out = [];
    const walk = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            if (SKIP_DIR.has(e.name)) continue;
            const p = path.join(dir, e.name);
            if (e.isDirectory()) walk(p);
            else if (SCAN_EXT.has(path.extname(e.name))) out.push(p);
        }
    };
    SCAN_DIRS.forEach(walk);
    return out;
}

// Replace comment bodies with spaces rather than deleting them, so byte
// offsets survive and line numbers stay honest in the failure message.
const blank = (s) => s.replace(/[^\n]/g, ' ');
function strip(src) {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, blank)
        .replace(/<!--[\s\S]*?-->/g, blank);
}
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

// `#rrggbb` -> the `rgb(r, g, b)` form getComputedStyle returns, so a token's
// DECLARED value can be checked against what it actually RESOLVED to. Returns
// null for any other notation, which the caller treats as "not checkable"
// rather than as a failure.
const hexToRgb = (h) => {
    const m = /^#([0-9a-f]{6})$/i.exec(String(h).trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

// The four sinks a token value can reach. Each captures the PROPERTY the
// token lands in, so the verdict is "is this property object paint",
// never "does this file look suspicious".
const SINKS = [
    // CSS declaration:  stroke: var(--amber-fill);
    /(^|[^-a-zA-Z0-9])([-a-zA-Z][-a-zA-Z0-9]*)\s*:\s*([^;{}]*?var\(\s*--[a-z0-9-]*-fill\b[^;{}]*)/g,
    // Presentation attribute:  fill="var(--amber-fill)"
    /([-a-zA-Z][-a-zA-Z0-9]*)\s*=\s*"([^"]*var\(\s*--[a-z0-9-]*-fill\b[^"]*)"/g,
    // JS:  el.style.color = 'var(--amber-fill)'
    /\.style\.([-a-zA-Z][-a-zA-Z0-9]*)\s*=\s*(['"][^'"]*var\(\s*--[a-z0-9-]*-fill\b[^'"]*['"])/g,
    // JS:  el.style.setProperty('color', 'var(--amber-fill)')
    /setProperty\(\s*['"]([^'"]+)['"]\s*,\s*(['"][^'"]*var\(\s*--[a-z0-9-]*-fill\b[^'"]*['"])/g,
];

// Operates on one already-stripped source string, so the fixture test
// below drives the SAME classifier the file walk uses. A re-implementation
// in the test body would pin a private copy and leave these regexes
// unguarded — the shape of no-op guard contrast-sweep.spec.js's own
// header argues against.
function classify(src, label) {
    const uses = [];
    const references = (src.match(FILL_TOKEN) || []).length;
    FILL_TOKEN.lastIndex = 0;
    for (const [i, re] of SINKS.entries()) {
        re.lastIndex = 0;
        for (const m of src.matchAll(re)) {
            // Sink 0 has a leading-delimiter group; the rest do not.
            const prop = (i === 0 ? m[2] : m[1]).toLowerCase();
            uses.push({
                file: label,
                line: lineOf(src, m.index),
                prop,
                text: m[0].trim().replace(/\s+/g, ' ').slice(0, 90),
            });
        }
    }
    return { uses, references };
}

function collect() {
    const uses = [];
    let references = 0;
    for (const file of scanFiles()) {
        const r = classify(strip(fs.readFileSync(file, 'utf8')), path.relative(ROOT, file));
        uses.push(...r.uses);
        references += r.references;
    }
    return { uses, references };
}

test('a -fill token never paints text', () => {
    const { uses, references } = collect();

    // Anti-vacuity, both directions. A regex that stops matching turns
    // this guard into a green no-op; a fifth sink idiom would slip
    // through the classifiers entirely. Floor sits ~15% under the 7
    // references the AHU graphic carries today, matching
    // link-integrity.spec.js's stated sanity-floor convention.
    expect(references, 'sanity: the -fill family is referenced at all')
        .toBeGreaterThanOrEqual(6);
    expect(uses.length, 'every var(--…-fill) reference must land in a classified sink')
        .toBe(references);

    const bad = uses
        .filter((u) => !isPaint(u.prop))
        .map((u) => (u.prop.startsWith('--')
            ? `${u.file}:${u.line} — \`${u.prop}\` aliases a -fill token but is not itself `
                + `named -fill, so the never-for-text constraint stops travelling with it: ${u.text}`
            : `${u.file}:${u.line} — \`${u.prop}\` is not object paint: ${u.text}`));
    expect(bad, 'a -fill token answers WCAG 1.4.11 (3:1), not the 4.5:1 text floor').toEqual([]);
});

test('the light token block and the @media print block stay in sync', () => {
    // Print always uses the LIGHT token set (audit-2026-06 #54), and that
    // set is DUPLICATED in an `@media print` block whose only guarantee
    // today is a comment saying "keep the two in sync". For the `-fill`
    // family that comment is load-bearing in a way it was not before: a
    // token defined in `:root` and in the light block but NOT in the print
    // block falls back to the DARK value on paper — `--amber-fill`
    // #e0a94a on white is 2.11:1, under the 3:1 non-text floor, so the
    // dampers print washed out. Measured, not assumed.
    const css = strip(fs.readFileSync(path.join(ROOT, 'html', 'styles.css'), 'utf8'));
    const grab = (re, label) => {
        const m = css.match(re);
        expect(m, `sanity: the ${label} block was found`).toBeTruthy();
        const out = new Map();
        for (const d of m[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) out.set(d[1], d[2].trim());
        return out;
    };
    const light = grab(/:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/, 'light');
    const print = grab(/@media print \{\s*:root, :root\[data-theme="dark"\]\s*\{([\s\S]*?)\n {4}\}/, 'print');

    expect(light.size, 'sanity: light tokens were parsed').toBeGreaterThanOrEqual(40);

    const drift = [];
    for (const [k, v] of light) {
        if (!print.has(k)) drift.push(`${k} — declared in the light block, missing from @media print`);
        else if (print.get(k) !== v) drift.push(`${k} — light ${v} vs print ${print.get(k)}`);
    }
    for (const k of print.keys()) if (!light.has(k)) drift.push(`${k} — in @media print but not the light block`);
    expect(drift, 'printing resolves the light set; a missing token falls back to the DARK value').toEqual([]);
});

test('no rendered element paints TEXT with a -fill token', async ({ browser }) => {
    // The residual hole in the source scan: `fill:` is object paint and
    // therefore allowlisted, but `fill:` on an SVG `<text>` IS ink. Only a
    // render can tell those apart, and contrast-sweep cannot reach it
    // (SVG text is out of its scope, and the AHU mockup is not in PAGES).
    //
    // Pages are DERIVED from the source scan, not hardcoded: whichever
    // pages reference a -fill token are the pages that get walked, so a
    // second consumer is covered the day it lands.
    const consumers = scanFiles()
        .filter((f) => f.startsWith(path.join(ROOT, 'html') + path.sep))
        .filter((f) => path.extname(f) === '.html')
        .filter((f) => !f.includes(`${path.sep}_includes${path.sep}`))
        // FILL_TOKEN carries /g, so `.test()` ADVANCES lastIndex on a match and
        // the next file gets searched from that offset. Reset unconditionally,
        // BEFORE the test — resetting only on the false branch (which is where
        // the engine already resets it) is exactly backwards, and silently
        // drops any later file whose only match sits before the leaked offset.
        // Measured on two synthetic consumers: the stateful form returned one
        // of them, this form returns both.
        .filter((f) => {
            FILL_TOKEN.lastIndex = 0;
            return FILL_TOKEN.test(strip(fs.readFileSync(f, 'utf8')));
        })
        .map((f) => '/' + path.relative(path.join(ROOT, 'html'), f).split(path.sep).join('/'));
    expect(consumers.length, 'sanity: at least one page consumes a -fill token').toBeGreaterThanOrEqual(1);

    const offenders = [];
    for (const theme of ['dark', 'light']) {
        // A FRESH CONTEXT PER THEME, per contrast-sweep.spec.js. Seeding
        // cf_theme on one reused page would ACCUMULATE init scripts — both
        // would run on every later navigation and the last would win, so the
        // second pass would silently decide the first one's theme too.
        const ctx = await browser.newContext({ reducedMotion: 'reduce' });
        await ctx.addInitScript((t) => {
            try { localStorage.setItem('cf_theme', t); } catch (e) { /* private mode */ }
        }, theme);
        const page = await ctx.newPage();
        try {
            for (const url of consumers) {
                await page.goto(url, { waitUntil: 'domcontentloaded' });
                // Dark is the default and headless Chromium reports
                // prefers-color-scheme: light, so neither theme can be assumed —
                // assert what actually rendered (contrast-sweep's rule). Without
                // this, a seeding failure would run both passes in one theme and
                // the spec would still go green.
                expect(
                    await page.evaluate(() => document.documentElement.getAttribute('data-theme')),
                    `${url} must actually render the ${theme} theme`,
                ).toBe(theme);
                const res = await page.evaluate(() => {
                    const cs = getComputedStyle(document.documentElement);
                    const tokens = new Map();
                    for (const sheet of document.styleSheets) {
                        let rules;
                        try { rules = sheet.cssRules; } catch (e) { continue; }
                        for (const r of rules) {
                            if (!r.style) continue;
                            for (const p of r.style) {
                                if (/^--[a-z0-9-]*-fill$/.test(p)) tokens.set(p, cs.getPropertyValue(p).trim());
                            }
                        }
                    }
                    // A FRESH element per token. Reusing one <span> and
                    // reassigning `style.color` reads STALE: Chromium does not
                    // re-resolve the computed value without a style recalc, and
                    // under `reducedMotion: 'reduce'` (set above) this page has
                    // no animation left to force one. Every token after the
                    // first then resolves to the FIRST token's colour, they
                    // collapse into one Set entry, and every token but one
                    // becomes INVISIBLE to the scan below — which is the whole
                    // arm. Measured on this page: the reused probe returned 1 of
                    // 2 colours under 'reduce' and 2 of 2 under 'no-preference';
                    // a `void probe.offsetWidth` nudge did NOT fix it, a fresh
                    // element did. The per-token floor below is what keeps this
                    // from regressing silently.
                    const values = new Set();
                    const probes = [];
                    for (const [name, declared] of tokens) {
                        const probe = document.createElement('span');
                        probe.style.color = `var(${name})`;
                        document.body.appendChild(probe);
                        const resolved = getComputedStyle(probe).color;
                        probe.remove();
                        values.add(resolved);
                        probes.push({ name, declared, resolved });
                    }

                    const hasOwnText = (el) => [...el.childNodes]
                        .some((n) => n.nodeType === 3 && /\S/.test(n.nodeValue));
                    const hits = [];
                    let painted = 0;
                    for (const el of document.querySelectorAll('*')) {
                        const s = getComputedStyle(el);
                        if (values.has(s.fill) || values.has(s.stroke)) painted++;
                        if (!hasOwnText(el)) continue;
                        const isSvgText = el instanceof SVGElement;
                        if (values.has(s.color) || (isSvgText && values.has(s.fill))) {
                            hits.push(`${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''}`);
                        }
                    }
                    return { tokenCount: tokens.size, resolved: [...values], probes, painted, hits };
                });
                // A token that resolves to nothing would make every comparison
                // vacuously false — the same green no-op the source floors guard.
                expect(res.tokenCount, `sanity: ${url} declares -fill tokens`).toBeGreaterThanOrEqual(1);
                expect(res.probes.length, `sanity: ${url} (${theme}) probed every -fill token`).toBe(res.tokenCount);
                expect(res.resolved.every((v) => /^rgb/.test(v)), `sanity: -fill tokens resolve on ${url} (${theme})`).toBe(true);

                // Per-token known-answer, and the floor that makes the stale-probe
                // bug above non-recurrent: each token must resolve to ITS OWN
                // declared value, not a neighbour's. Checked per token rather than
                // by counting distinct colours, so it stays correct if two -fill
                // tokens ever legitimately carry the same value.
                const checkable = res.probes.filter((p) => hexToRgb(p.declared) !== null);
                expect(checkable.length, `sanity: ${url} (${theme}) has a hex-declared -fill token to check`)
                    .toBeGreaterThanOrEqual(1);
                expect(
                    checkable
                        .filter((p) => p.resolved !== hexToRgb(p.declared))
                        .map((p) => `${p.name} declared ${p.declared} but the probe resolved ${p.resolved}`),
                    `every -fill token must resolve to its own value on ${url} (${theme})`,
                ).toEqual([]);
                expect(res.painted, `sanity: ${url} (${theme}) paints geometry with a -fill token`).toBeGreaterThanOrEqual(1);
                offenders.push(...res.hits.map((h) => `${url} (${theme}) — ${h}`));
            }
        } finally {
            await ctx.close();
        }
    }
    expect(offenders, 'a -fill token on a text-bearing element is an AA failure').toEqual([]);
});

// ── Known-answer check ───────────────────────────────────────────────
// Every constant in a guard needs one or the guard is unfalsifiable
// (contrast-sweep.spec.js's `selfTest`, and the reason it exists: a
// typo'd `1.055` scored white-on-black at 5.04:1 and nobody noticed).
// Verified by mutation — dropping any SINK regex must turn this red.
const FIXTURES = [
    ['.d { stroke: var(--amber-fill); }',                        'stroke',  true],
    ['.d { fill: var(--heat-fill); }',                           'fill',    true],
    ['.d { border: 2px solid var(--amber-fill); }',              'border',  true],
    ['.k { border-color: var(--heat-fill); }',                   'border-color', true],
    ['.d { color: var(--amber-fill); }',                         'color',   false],
    ['.d { -webkit-text-fill-color: var(--heat-fill); }',        '-webkit-text-fill-color', false],
    ['<polygon fill="var(--heat-fill)"/>',                       'fill',    true],
    ['<text color="var(--amber-fill)">x</text>',                 'color',   false],
    ["el.style.color = 'var(--amber-fill)';",                    'color',   false],
    ["el.style.stroke = 'var(--heat-fill)';",                    'stroke',  true],
    ["el.style.setProperty('color', 'var(--amber-fill)');",      'color',   false],
    ["el.setAttribute('style', 'color: var(--heat-fill)');",     'color',   false],
    [':root { --section-accent: var(--amber-fill); }',           '--section-accent', false],
    [':root { --amber-fill: var(--heat-fill); }',                '--amber-fill', true],
];

test('the sink classifier catches every known misuse shape', () => {
    for (const [src, prop, ok] of FIXTURES) {
        const r = classify(src, 'fixture');
        expect(r.references, `fixture counted: ${src}`).toBe(1);
        expect(r.uses.length, `fixture classified exactly once: ${src}`).toBe(1);
        expect(r.uses[0].prop, `fixture sink: ${src}`).toBe(prop);
        expect(isPaint(r.uses[0].prop), `fixture verdict: ${src}`).toBe(ok);
    }
    // A reference the classifiers cannot place must NOT pass silently —
    // this is what makes the census in the first test load-bearing.
    const orphan = classify('const c = [`var(--amber-fill)`].join();', 'fixture');
    expect(orphan.references).toBe(1);
    expect(orphan.uses.length, 'an unplaceable reference stays unclassified').toBe(0);
});
