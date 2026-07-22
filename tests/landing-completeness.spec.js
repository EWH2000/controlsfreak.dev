// Section-landing card completeness: every page under a section
// directory must be reachable from that section's landing grid.
//
// What this catches: a page that exists, builds, lands in the sitemap,
// and is linked from nowhere. The existing guards all miss it because
// they compare hand-maintained lists to each other and a forgotten page
// is absent from BOTH sides. tests/pages.js vs the sitemap passes once
// the page is added to PAGES; educationSequenceGuard covers only
// nav:education; the home-pill drift guard in home-hero.spec.js counts
// CARDS against CARDS, so a page with no card is invisible to it. The
// only source that cannot lie about whether a page exists is the
// filesystem, which is what this reads.
//
// Pure Node, no browser — the `page` fixture is deliberately unused, as
// in worker.spec.js. Kept separate from link-integrity.spec.js on
// purpose: the two share no data (this one needs neither the _site walk,
// the id map, nor the URL resolver), playwright.config.js sets
// `fullyParallel: true` so they land in separate workers, and a failure
// attributes cleanly to one concern.
//
// ── Reading the two sides ────────────────────────────────────────────
// CARDS come from the BUILT landing (_site/<section>/index.html) because
// navCard() is a Nunjucks macro — the source is a macro call, not an
// anchor. FILES come from the SOURCE tree (html/<section>/*.html), not
// _site, deliberately: reading both sides from _site would let a stale
// build pass silently, whereas source-vs-built surfaces it as a
// mismatch. Both directions are checked (file with no card, card with no
// file).
//
// ── Why the anchor regex is shaped this way ──────────────────────────
// Scoping by the card ANCHOR rather than by `.card-grid` is what makes
// this work: only practice's grid is followed by `</section>`, so a
// block-slice approach matches 1 of the 4 landings and would need
// <div>-depth counting. It also makes practice's TWO grids (Content
// Quizzes and Field Drills) a non-issue — the approach is grid-agnostic.
// And the nav-dropdown links that duplicate every card do not carry the
// `nav-card` class, so they are excluded for free rather than by a
// de-dupe pass. Do NOT relax this to an unanchored `class="nav-card`:
// that also hits `nav-card-titlebar` and inner `nav-card--tools`
// elements (308 hits vs. 31 real anchors on the tools landing).
//
// ── Why the sanity floors ────────────────────────────────────────────
// Like link-integrity.spec.js, this derives truth from MARKUP SHAPE —
// `class="nav-card nav-card--*"`. If nav-card.njk is restyled and that
// class pair changes, the regex matches nothing, both sides come back
// empty, and "no missing cards" passes vacuously. So the section count
// is an EXACT match and each section asserts a card floor before
// asserting the sets agree — a hollowed guard goes red instead of green
// (the idea is worker.spec.js:22).

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const SITE = path.join(__dirname, '..', '_site');
const SRC = path.join(__dirname, '..', 'html');

const CARD_RE = /<a class="nav-card nav-card--[a-z-]+"[^>]*?href="([^"]+)"/g;

// A "section" is any non-underscore html/ subdirectory holding an
// index.html plus at least one other page. That yields exactly the four
// card-grid landings and correctly excludes the single-page topic hubs
// (bacnet, forced-air, guides, hydronics, refrigeration) along with
// assets/ and scripts/. A future fifth section enrolls itself.
const sections = fs.readdirSync(SRC, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .filter((name) => {
        const pages = fs.readdirSync(path.join(SRC, name)).filter((f) => f.endsWith('.html'));
        return pages.includes('index.html') && pages.length > 1;
    })
    .sort();

// EXACT, not a minimum — see the header note on hollowed guards. Update
// the count in the same commit that adds a fifth section.
test('section discovery finds every card-grid landing', () => {
    expect(sections, 'sanity: the discovered set of card-grid sections')
        .toEqual(['education', 'practice', 'simulators', 'tools']);
});

for (const section of sections) {
    test(`${section}/ landing links every page in the section`, () => {
        const landing = fs.readFileSync(path.join(SITE, section, 'index.html'), 'utf8');
        const carded = new Set();
        for (const [, href] of landing.matchAll(CARD_RE)) {
            // Landings also carry cross-section cards (a tools landing may
            // point at a simulator); only same-section hrefs count here.
            if (href.startsWith(`/${section}/`)) carded.add(href);
        }
        const onDisk = new Set(fs.readdirSync(path.join(SRC, section))
            .filter((f) => f.endsWith('.html') && f !== 'index.html')
            // Skip pages deliberately excluded from the site's collections.
            // `eleventyExcludeFromCollections` keeps a page out of the nav,
            // the search index and the sitemap, so it is intentionally NOT
            // part of the navigable structure and a landing card is not
            // expected (in-progress mockups stay hidden this way until they
            // ship). This test targets ACCIDENTAL orphans — pages that build
            // and land in the sitemap yet link from nowhere; an excluded page
            // is an intentional one, and is absent from the sitemap besides.
            .filter((f) => !/^eleventyExcludeFromCollections:\s*true\b/m
                .test(fs.readFileSync(path.join(SRC, section, f), 'utf8')))
            .map((f) => `/${section}/${f}`));

        expect(carded.size, `sanity: ${section} landing yielded cards`).toBeGreaterThanOrEqual(5);
        expect(onDisk.size, `sanity: ${section}/ holds pages`).toBeGreaterThanOrEqual(5);

        const offenders = [];
        for (const href of onDisk) {
            if (!carded.has(href)) offenders.push(`  ${href} exists but has no card on /${section}/`);
        }
        for (const href of carded) {
            if (!onDisk.has(href)) offenders.push(`  /${section}/ cards ${href} but no such page exists`);
        }
        expect(offenders, `${section} landing must card every page, and only real pages`).toEqual([]);
    });
}
