// Link + fragment integrity across the built site AND the quiz banks.
//
// What this catches: a renamed or deleted `id="…"`, or a moved/removed
// page, that silently breaks a deep link. Every other drift guard on
// this site compares two HAND-MAINTAINED lists to each other — PAGES vs
// the sitemap, educationSequence vs the education collection, the home
// pills vs the landing chips. Nothing ties any of them to the anchors
// pages actually point at, so a broken `#fragment` ships green: the page
// still renders, the link still resolves to a 200, the reader just lands
// at the top of the document instead of the section they were sent to.
//
// The highest-value slice is the quiz banks. 358 of the ~590 fragment
// links on this site live in html/_data/quizzes/*.js as `learnMore.href`
// and are injected as JSON, then rendered client-side by quiz-engine.js
// — they are structurally INVISIBLE to any scan of built HTML.
// duct-static-control.js alone deep-links six distinct ids. Rename one
// `<h2 class="subhead" id="…">` and dozens of quiz links break with
// every page still rendering and every existing spec still passing.
//
// TWO deep-link surfaces live in those banks and both are covered here.
// `learnMore.href` is the sanctioned mechanism and carries the volume,
// but a handful of questions also write a plain `<a href="…">` inline in
// their prose — 5 today, all in `explain`, one of them a fragment link
// (boolean-logic-latches → /education/timers-and-delays.html#proof).
// Those are invisible for exactly the same reason, so the walk scans
// EVERY string value on a question rather than a list of field names:
// hardcoding `explain` would re-create the hand-maintained list this
// file exists to kill, and a future href in a new field is covered for
// free.
//
// Pure Node, no browser — the `page` fixture is deliberately unused, as
// in worker.spec.js. There is no DOM parser in devDependencies
// (@11ty/eleventy, @playwright/test, wrangler), so regex is the tool.
//
// ── Why the sanity floors ────────────────────────────────────────────
// Every check here derives truth from MARKUP SHAPE — `id="…"` and
// `class="filter-chip"`. A regex that silently stops matching turns a
// real guard into a green no-op: zero links found, zero broken, test
// passes. So each check asserts a floor on what it collected before it
// asserts the collection is clean (the idea is worker.spec.js:22).
// Floors sit ~10-15% under measured so normal growth never trips them.
// The chip-PAGE floor is an EXACT match, not a minimum, on purpose: a
// future rename of `.filter-chip` would hollow out the hash-route
// allowlist, and an exact floor turns that into a red test instead of a
// quietly weakened one.
//
// ── Why the allowlist is derived, never hardcoded ────────────────────
// Three landings run an identical `location.hash` filter-chip router
// (tools, education, practice), so `#hydronics` on /tools/ is a valid
// route, not a broken anchor. Each page's own JS builds its valid set
// with `chips.forEach(c => validSlugs.add(c.dataset.category))`; this
// spec scrapes the same buttons for the same reason. A hardcoded list of
// slugs would BE the hand-maintained-list failure mode this file exists
// to kill. Note education's CARD categories (control, drives, hvac, …)
// are not chip values and `slugFromHash` rejects them — derive from
// `.filter-chip` only, never from a card's `data-category`.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const SITE = path.join(__dirname, '..', '_site');
const SRC = path.join(__dirname, '..', 'html');
const BANK_DIR = path.join(SRC, '_data', 'quizzes');

// Leading \s is load-bearing: it keeps `data-id=` and `aria-labelledby=`
// out of the id set. Collect ALL id attributes, not headings only —
// lesson anchors are `<h2 class="subhead" id="…">` and a heading-only
// scan would miss the widget ids quizzes also deep-link.
const ID_RE = /\sid="([^"]+)"/g;
const HREF_RE = /href="([^"]+)"/g;
const CHIP_RE = /<button[^>]*class="[^"]*filter-chip[^"]*"[^>]*data-category="([^"]+)"/g;
const OFF_SITE = /^(https?:|mailto:|tel:|data:)/;

function walk(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(abs));
        else out.push(abs);
    }
    return out;
}

const siteUrl = (abs) => '/' + path.relative(SITE, abs).split(path.sep).join('/');

const siteFiles = walk(SITE);
// Every _site entry, not just pages — so /styles.css and /assets/… get
// validated by the internal-link check too.
const fileSet = new Set(siteFiles.map(siteUrl));
const builtHtml = siteFiles.filter((f) => f.endsWith('.html'));

const idsByUrl = new Map();
const chipsByUrl = new Map();
const allIds = new Set();
for (const abs of builtHtml) {
    const html = fs.readFileSync(abs, 'utf8');
    const ids = new Set();
    for (const [, id] of html.matchAll(ID_RE)) {
        ids.add(id);
        allIds.add(id);
    }
    idsByUrl.set(siteUrl(abs), ids);

    const chips = new Set();
    for (const [, slug] of html.matchAll(CHIP_RE)) chips.add(slug);
    if (chips.size) chipsByUrl.set(siteUrl(abs), chips);
}

// Handles all three URL conventions the site emits: directory URLs
// (/tools/), the authored .html form (/tools/x.html), and the clean form
// the Worker 301s to (/tools/x). The query strip covers the cache-busting
// `?v={{ site.version }}` the templates append to /styles.css.
function resolve(href) {
    const clean = href.split('?')[0];
    const p = clean.endsWith('/') ? clean + 'index.html' : clean;
    if (fileSet.has(p)) return p;
    if (fileSet.has(p + '.html')) return p + '.html';
    return null;
}

// A fragment is good if the target page carries that id, OR if the target
// is one of the chip landings and the fragment is one of its routes.
function fragmentResolves(url, fragment) {
    const ids = idsByUrl.get(url);
    if (ids && ids.has(fragment)) return true;
    const chips = chipsByUrl.get(url);
    return Boolean(chips && chips.has(fragment));
}

// The stale-build defense, and it has to come first. playwright.config.js
// sets `reuseExistingServer: !process.env.CI`, so a developer with
// `npm run dev` already on :8000 suppresses the webServer rebuild — every
// check below would then read a stale _site and pass against yesterday's
// markup. Compare CONTENT, not mtime: on a clean tree today
// html/tools/index.html is newer than the newest _site file with no
// content change at all, so an mtime check would cry wolf constantly.
test('_site/ is current with html/ sources', () => {
    const sources = walk(SRC).filter((f) => f.endsWith('.html'));
    expect(sources.length, 'sanity: source pages were found').toBeGreaterThanOrEqual(120);

    const stale = [];
    for (const abs of sources) {
        const rel = path.relative(SRC, abs).split(path.sep).join('/');
        if (!fileSet.has('/' + rel)) {
            stale.push(`${rel} — no _site counterpart`);
            continue;
        }
        const builtIds = idsByUrl.get('/' + rel);
        for (const [, id] of fs.readFileSync(abs, 'utf8').matchAll(ID_RE)) {
            // Templated ids can't be compared literally —
            // tools/bacnet-priority.html emits id="bpri-slot-{{ s.n }}".
            if (id.includes('{')) continue;
            if (!builtIds.has(id)) stale.push(`${rel} — id="${id}" is not in the built page`);
        }
    }
    expect(stale, '_site/ is stale — run npm run build').toEqual([]);
});

test('every fragment href resolves to a real id', () => {
    expect(builtHtml.length, 'sanity: built pages were found').toBeGreaterThanOrEqual(120);
    expect(allIds.size, 'sanity: ids were collected').toBeGreaterThanOrEqual(2000);
    // EXACT, not a minimum — see the header note on hollowed guards.
    expect(chipsByUrl.size, 'sanity: the three filter-chip landings were found').toBe(3);
    let chipSlugs = 0;
    for (const chips of chipsByUrl.values()) chipSlugs += chips.size;
    expect(chipSlugs, 'sanity: chip route slugs were collected').toBeGreaterThanOrEqual(20);

    const broken = [];
    let checked = 0;
    for (const abs of builtHtml) {
        const url = siteUrl(abs);
        for (const [, href] of fs.readFileSync(abs, 'utf8').matchAll(HREF_RE)) {
            if (OFF_SITE.test(href) || href === '#') continue;
            const hash = href.indexOf('#');
            if (hash === -1) continue;
            const page = href.slice(0, hash);
            const fragment = href.slice(hash + 1);
            let target;
            if (page === '') target = url;
            else if (!page.startsWith('/')) continue;
            else {
                target = resolve(page);
                // A missing PAGE is the internal-link check's finding, not
                // this one's — don't double-report the same defect.
                if (!target) continue;
            }
            checked++;
            if (!fragmentResolves(target, fragment)) broken.push(`${url} → ${href}`);
        }
    }
    expect(checked, 'sanity: fragment hrefs were found').toBeGreaterThanOrEqual(200);
    expect(broken, 'every #fragment must name an id on the page it points at').toEqual([]);
});

test('every internal link resolves to a file in _site', () => {
    expect(fileSet.size, 'sanity: _site was walked').toBeGreaterThanOrEqual(120);

    const broken = [];
    let checked = 0;
    for (const abs of builtHtml) {
        const url = siteUrl(abs);
        for (const [, href] of fs.readFileSync(abs, 'utf8').matchAll(HREF_RE)) {
            if (OFF_SITE.test(href) || !href.startsWith('/')) continue;
            checked++;
            if (!resolve(href.split('#')[0])) broken.push(`${url} → ${href}`);
        }
    }
    expect(checked, 'sanity: internal links were found').toBeGreaterThanOrEqual(15000);
    expect(broken, 'every root-relative href must resolve under _site/').toEqual([]);
});

// Every string value anywhere on a question, with a dotted trail for the
// error message. Recursive rather than a field list on purpose — see the
// header note on the two deep-link surfaces.
function stringValues(value, trail, out) {
    if (typeof value === 'string') out.push([trail, value]);
    else if (Array.isArray(value)) value.forEach((v, i) => stringValues(v, `${trail}[${i}]`, out));
    else if (value && typeof value === 'object') {
        for (const key of Object.keys(value)) {
            stringValues(value[key], trail ? `${trail}.${key}` : key, out);
        }
    }
    return out;
}

// The flagship check. These links never appear in built HTML — the engine
// paints them from injected JSON after load — so nothing else on this
// site can see them break. Bare require() of the CommonJS banks, exactly
// as quiz-banks.spec.js:26-30 does it.
test('every quiz-bank deep link resolves', () => {
    const banks = fs.readdirSync(BANK_DIR).filter((f) => f.endsWith('.js')).sort();
    expect(banks.length, 'sanity: quiz banks were found').toBeGreaterThanOrEqual(30);

    const broken = [];
    let learnMoreFragments = 0;
    let proseAnchors = 0;

    // Resolves one href the same way for both surfaces; returns whether it
    // carried a fragment so the caller can count. Off-site and relative
    // hrefs are not this spec's business.
    const check = (href, where) => {
        const hash = href.indexOf('#');
        const page = hash === -1 ? href : href.slice(0, hash);
        if (OFF_SITE.test(page) || !page.startsWith('/')) return false;
        const target = resolve(page);
        if (!target) {
            broken.push(`${where} → ${href} (no such page)`);
            return false;
        }
        if (hash === -1) return false;
        if (!fragmentResolves(target, href.slice(hash + 1))) {
            broken.push(`${where} → ${href} (no such id)`);
        }
        return true;
    };

    for (const file of banks) {
        for (const question of require(path.join(BANK_DIR, file))) {
            const href = question.learnMore && question.learnMore.href;
            if (typeof href === 'string' && check(href, `${file}/${question.id} learnMore`)) {
                learnMoreFragments++;
            }
            for (const [trail, text] of stringValues(question, '', [])) {
                for (const [, embedded] of text.matchAll(HREF_RE)) {
                    proseAnchors++;
                    check(embedded, `${file}/${question.id} [${trail}]`);
                }
            }
        }
    }

    expect(learnMoreFragments, 'sanity: learnMore deep links were found').toBeGreaterThanOrEqual(300);
    // Deliberately low: prose anchors are RARE by convention — learnMore is
    // the sanctioned deep-link mechanism, so this floor only has to prove
    // the scan still reaches inside the bank strings at all.
    expect(proseAnchors, 'sanity: prose anchors inside bank strings were found').toBeGreaterThanOrEqual(4);
    expect(broken, 'every quiz-bank link must resolve to a real page and id').toEqual([]);
});
