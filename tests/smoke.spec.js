const { test, expect } = require('@playwright/test');

// The vendor-ID tests derive their expectations from the generated
// registry snapshot instead of pinning org strings — upstream renames
// and re-imports must not cascade test edits (the id-0/reserved pins
// live in data-integrity.spec.js, which owns the snapshot contract).
const bacnetVendorIds = require('../html/_data/bacnetVendorIds.js');

// Attach pageerror + console.error listeners and return the captured-
// errors array. The smoke loop and every behavioral test calls this at
// the top of its body and asserts the array is empty at the end, so a
// console-error surprise during a real interaction (slider drag, tab
// click, units flip) doesn't slip past a green suite.
function watchErrors(page) {
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    return errors;
}

// The page manifest lives in tests/pages.js (shared with
// responsive.spec.js's phone-width sweep); the sitemap-drift test
// below keeps it honest. See pages.js for the .html-vs-clean-URL note.
const PAGES = require('./pages.js');

test('PAGES array stays in sync with the generated sitemap', () => {
    // sitemap.xml is built from html/sitemap.njk (the sitemapPages
    // collection), so read the build output, not a source file. The
    // webServer in playwright.config.js builds _site/ before the run.
    const fs = require('fs');
    const sitemap = fs.readFileSync('_site/sitemap.xml', 'utf8');
    // The sitemap <loc> renders the clean canonical form (no .html — the
    // cleanCanonical filter, codebase-issues #86), while PAGES navigates the
    // local python -m http.server which needs the real .html file paths. So
    // compare membership on the extension-stripped path — a drift in the set
    // of pages still fails, but the deliberate .html-vs-clean form gap doesn't.
    const norm = (u) => u.replace(/^https?:\/\/[^/]+/, '').replace(/\.html$/, '');
    const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map(m => norm(m[1]))
        .sort();
    const pagesPaths = PAGES
        .map(p => norm(p.url))
        .sort();
    expect(pagesPaths, 'every sitemap entry should appear in PAGES and vice versa').toEqual(sitemapPaths);
});

for (const { name, url } of PAGES) {
    test(`${name} loads cleanly`, async ({ page }) => {
        const errors = watchErrors(page);
        const res = await page.goto(url);
        expect(res.status(), `${url} should return 200`).toBe(200);
        await expect(page).toHaveTitle(/controlsfreak\.dev/);
        await expect(page.locator('nav.site-nav')).toBeVisible();
        // SEO meta: every PAGES entry has a canonical frontmatter, so it
        // must render <link rel="canonical"> + twitter:card. Non-home
        // pages also carry a BreadcrumbList JSON-LD block (home gets
        // WebSite + Person instead). The canonical attribute is checked
        // by full string match to catch typos in path/scheme.
        const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute('href');
        expect(canonicalHref, `${url} should have canonical link`).toMatch(/^https:\/\/controlsfreak\.dev\//);
        await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
        if (url !== '/') {
            const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
            expect(jsonLd, `${url} should carry a BreadcrumbList`).toContain('BreadcrumbList');
        }
        expect(errors, `${url} should log no page / console errors`).toEqual([]);
    });
}

test('404 page noindexes, has no canonical, and lists key sections', async ({ page }) => {
    // The 404 file is served directly as a 200 by python -m http.server;
    // the deployed Worker is what returns it with HTTP 404 status. The
    // file-level assertions (noindex meta, no canonical, helpful links)
    // are what matters either way.
    const errors = watchErrors(page);
    const res = await page.goto('/404.html');
    expect(res.status()).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    expect(await page.locator('link[rel="canonical"]').count()).toBe(0);
    await expect(page.locator('main h1')).toContainText('Page not found');
    // Sanity-check the four key recovery links are present and resolve.
    for (const href of ['/', '/tools/', '/simulators/', '/education/', '/contact.html']) {
        await expect(page.locator(`main a[href="${href}"]`)).toBeVisible();
    }
    expect(errors, '404 page should log no page / console errors').toEqual([]);
});

test('pid tuner runs the shared simulation engine on load', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/simulators/pid-tuner.html');
    // pid-engine.js drives the canvas + metrics on init; the readouts should fill in.
    await expect(page.locator('#pid-over')).not.toHaveText('—');
    await expect(page.locator('#pid-settle')).not.toHaveText('—');
    await expect(page.locator('#pid-err')).not.toHaveText('—');
    expect(errors, 'pid tuner behavioral should log no page / console errors').toEqual([]);
});

test('pid tuner — high dead-time process reaches the unstable regime', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/simulators/pid-tuner.html');
    // The three well-behaved buckets barely overshoot even at the slider
    // maxima; the High dead-time process (dead/τ ≈ 0.5) can be driven to
    // ring — the "too much P" lesson the cheat-sheet describes. ux-audit #6.
    await page.selectOption('#pid-proc', 'vhigh');
    await page.$eval('#pid-kc', el => { el.value = '20'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.$eval('#pid-ki', el => { el.value = '6';  el.dispatchEvent(new Event('input', { bubbles: true })); });
    // Overshoot clears the >20 % warn threshold, so the readout flags it.
    await expect(page.locator('#pid-over')).toHaveClass(/warn/);
    await expect(page.locator('#pid-settle')).toContainText('>');   // never settles in window
    expect(errors, 'pid high-dead-time behavioral should log no page / console errors').toEqual([]);
});

test('pid tuner — bump-test starting gains compute, restyle, and mute', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/simulators/pid-tuner.html');
    // Seeded example (ΔCO 10 %, ΔPV 10 %, τ 120 s, θ 15 s) is arranged to land
    // on the Decent PI preset: SIMC with λ = 3θ → Kc 2.00, Ti 2 min = reset 0.50.
    await expect(page.locator('#pid-sg-kc')).toHaveText('2.00');
    await expect(page.locator('#pid-sg-ti')).toHaveText('0.50');
    // Parameter Style flip re-reads the same result in EBO seconds.
    await page.selectOption('#pid-conv', 'timeSec');
    await expect(page.locator('#pid-sg-ti-lbl')).toHaveText('Integral time (Ti, s)');
    await expect(page.locator('#pid-sg-ti')).toHaveText('120');
    // Minutes toggle rescales the entered times: same Kc (ratio is unit-free),
    // Ti now min(120 min, 240 min) = 120 min = 7200 s.
    await page.click('#pid-sg-unit-min');
    await expect(page.locator('#pid-sg-tau-unit')).toHaveText('min');
    await expect(page.locator('#pid-sg-kc')).toHaveText('2.00');
    await expect(page.locator('#pid-sg-ti')).toHaveText('7200');
    // Validate-and-mute: a blank τ empties both readouts and the note.
    await page.fill('#pid-sg-tau', '');
    await expect(page.locator('#pid-sg-kc')).toHaveText('—');
    await expect(page.locator('#pid-sg-ti')).toHaveText('—');
    // PV against an upward output step = negative process gain (cooling-style):
    // magnitudes drive the math, and the note flags DIRECT-acting.
    await page.fill('#pid-sg-tau', '120');
    await page.fill('#pid-sg-dpv', '-10');
    await expect(page.locator('#pid-sg-note')).toContainText('direct-acting');
    await expect(page.locator('#pid-sg-kc')).toHaveText('2.00');
    // A downward bump entered as trended (ΔCO and ΔPV both negative) is a
    // positive-gain loop: same magnitudes, no acting-direction flag.
    await page.fill('#pid-sg-dco', '-10');
    await expect(page.locator('#pid-sg-kc')).toHaveText('2.00');
    await expect(page.locator('#pid-sg-note')).not.toContainText('direct-acting');
    // θ = 0 is the predictable field entry — muted readouts plus a pointer.
    await page.fill('#pid-sg-dead', '0');
    await expect(page.locator('#pid-sg-kc')).toHaveText('—');
    await expect(page.locator('#pid-sg-note')).toContainText('sample interval');
    expect(errors, 'pid starting-gains behavioral should log no page / console errors').toEqual([]);
});

test('pid tuner — preset chips leave the bump-test unit toggle alone', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/simulators/pid-tuner.html');
    // The preset handler clears .active by [data-preset] scope; the unit
    // toggle shares the chip chrome and must keep its own selection.
    await page.click('#pid-sg-unit-min');
    await page.click('#pid-preset-aggr');
    await expect(page.locator('#pid-sg-unit-min')).toHaveClass(/active/);
    await expect(page.locator('#pid-preset-aggr')).toHaveClass(/active/);
    expect(errors, 'pid preset/unit-toggle isolation should log no page / console errors').toEqual([]);
});

test('staging sequencer — high demand stages units up and logs the event', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/simulators/staging-sequencer.html');
    // Drive the plant deterministically: Manual demand pinned high + a
    // zero stage-delay means the running sequence must add units on the
    // first evaluate. With 3 units at 100 % demand it climbs to all three.
    await page.click('#stg-mode-manual');
    await page.$eval('#stg-delay', el => { el.value = '0'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.$eval('#stg-demand', el => { el.value = '100'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('#stg-play');   // idempotent if already auto-playing
    await expect(page.locator('#stg-running')).toHaveText('3');
    await expect(page.locator('#stg-log')).toContainText('Stage up');
    expect(errors, 'staging sequencer behavioral should log no page / console errors').toEqual([]);
});

test('staging sequencer — Fixed leads unit 1; tripping the lead hands it off (#126)', async ({ page }) => {
    // The only prior staging test pins stage-up COUNT, which is insensitive
    // to WHICH unit leads. This pins the lead-selection + handoff: Fixed
    // keeps the lead on unit 1, and a Trip moves it off the faulted unit.
    // (The runtime-equalized convergence and scheduled-interval rotation are
    // time-based and not deterministically reproducible in this harness.)
    const errors = watchErrors(page);
    await page.goto('/simulators/staging-sequencer.html');
    await page.click('#stg-mode-manual');
    await page.$eval('#stg-delay',  el => { el.value = '0';   el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.$eval('#stg-demand', el => { el.value = '100'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('#stg-play');
    await expect(page.locator('#stg-running')).toHaveText('3');

    // Fixed strategy (default) → unit 1 (the first cell) always leads.
    const units = page.locator('#stg-units .stg-unit');
    await expect(units.first()).toHaveAttribute('data-lead', 'true');

    // Trip the lead: unit 1 faults and the lead role moves off it.
    await page.click('#stg-trip');
    await expect(page.locator('#stg-log')).toContainText('FAULT');
    await expect(units.first()).toHaveAttribute('data-state', 'fault');
    await expect(units.first()).toHaveAttribute('data-lead', 'false');

    expect(errors, 'staging lead/trip handoff should log no errors').toEqual([]);
});

test('controller wiring — a correct panel reads live; a short pops the fuse', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/simulators/controller-wiring.html');
    // The AHU preset lands every point correctly; the thermistor on UI1
    // should read a live temperature and the FAULTS panel should clear.
    await page.click('[data-preset="ahu"]');
    await expect(page.locator('[data-readout="ui1"]')).toContainText('°F');
    await expect(page.locator('#cw-faults-list')).toContainText('All landings check out');
    // The broken-fuse preset dead-shorts the transformer — the fuse pops
    // and the engine names the short. This is the obvious-failure path.
    await page.click('[data-preset="broken-fuse"]');
    await expect(page.locator('#cw-fuse .tag')).toHaveText('FUSE BLOWN');
    await expect(page.locator('#cw-faults-list')).toContainText('Dead short');
    await expect(page.locator('[data-readout="ui1"]')).toHaveText('———');
    expect(errors, 'controller wiring behavioral should log no page / console errors').toEqual([]);
});

test('hydronic loop builder — an example loads and the loop solves to live flow', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/simulators/hydronic-loop-builder.html');
    // The single-loop example auto-loads and runs at 10 Hz. The pump should
    // find its operating point — a nonzero flow — and its readout LED light.
    const pumpLed = page.locator('#hlb-readouts .device').first().locator('.led');
    await expect(pumpLed).toHaveClass(/led--run/);
    await expect(page.locator('#hlb-readouts')).toContainText('GPM');
    // Loading another example rebuilds a fresh, running loop. Each component
    // renders once per elevation view (north + east), so count within one pane.
    await page.click('[data-example="parallel"]');
    await expect(page.locator('#hlb-inner-n .hlb-comp')).toHaveCount(7);   // parallel: plant, pump, 2 tees, balance, 2 coils
    await expect(page.locator('#hlb-readouts .device').first().locator('.led')).toHaveClass(/led--run/);
    // The loop animates flow particles, and adding a component must NOT kill them
    // (regression: addComponent skipped refreshFlowGeometry so the new pipe paths
    // got no FlowEngine pools and a steady loop's particles vanished).
    await expect.poll(() => page.locator('main g.flow-particles circle').count()).toBeGreaterThan(0);
    await page.locator('.hlb-palette-btn', { hasText: 'Coil' }).first().click();
    await expect(page.locator('#hlb-inner-n .hlb-comp')).toHaveCount(8);
    await expect.poll(() => page.locator('main g.flow-particles circle').count()).toBeGreaterThan(0);
    expect(errors, 'hydronic loop builder behavioral should log no page / console errors').toEqual([]);
});

test('bacnet/ip converter converts a hex string', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/bacnet-ip-converter.html');
    await page.fill('#b2i-hex', 'C0A80164BAC0');
    await expect(page.locator('#b2i-ip')).toHaveText('192.168.1.100');
    await expect(page.locator('#b2i-port')).toHaveText('47808');
    expect(errors, 'bacnet behavioral should log no page / console errors').toEqual([]);
});

// Audit-2026-06 lineup gap: the Object ID tab packs/unpacks the
// Object_Identifier's 10-bit type + 22-bit instance — the encoding two
// lessons teach in prose but nothing on the site decoded.
test('bacnet/ip converter — object ID tab packs and unpacks', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/bacnet-ip-converter.html');
    await page.click('.tab-btn[data-tab="objid"]');

    // Default raw 0x020004D2 decodes on load: Device, 1234.
    await expect(page.locator('#boi-out-type')).toHaveText('8 — Device');
    await expect(page.locator('#boi-out-instance')).toHaveText('1234');
    await expect(page.locator('#boi-out-dec')).toHaveText('33555666');
    await expect(page.locator('#boi-type')).toHaveValue('8');
    await expect(page.locator('#boi-instance')).toHaveValue('1234');

    // Parts → raw: analog-input, 4 packs to 0x00000004.
    await page.fill('#boi-type', '0');
    await page.fill('#boi-instance', '4');
    await expect(page.locator('#boi-raw')).toHaveValue('0x00000004');
    await expect(page.locator('#boi-out-type')).toHaveText('0 — Analog Input (AI)');

    // Raw decimal → parts; wildcard instance gets the note.
    await page.fill('#boi-raw', '37748735');   // 8 × 2^22 + 4194303
    await expect(page.locator('#boi-out-type')).toHaveText('8 — Device');
    await expect(page.locator('#boi-out-instance')).toHaveText('4194303');
    await expect(page.locator('#boi-formula')).toContainText('unassigned/wildcard');

    // Proprietary + garbage handling.
    await page.fill('#boi-type', '200');
    await page.fill('#boi-instance', '7');
    await expect(page.locator('#boi-out-type')).toContainText('vendor-proprietary');
    await page.fill('#boi-raw', '12ab');
    await expect(page.locator('#boi-callout')).toBeVisible();
    await expect(page.locator('#boi-out-dec')).toHaveText('—');

    expect(errors, 'object ID behavioral should log no errors').toEqual([]);
});

test('bacnet object reference — filter drives rows, badges, and empty rows', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/bacnet-objects.html');

    // One query filters all three tables at once; each tab badge shows
    // its own live match count. Invariant (badge ≡ visible rows), not a
    // pinned number — the enum data is expected to grow.
    await page.fill('#bo-search', 'present');
    const visibleProps = await page
        .locator('#bo-table-props tbody tr:not(.bo-empty):not([hidden])').count();
    expect(visibleProps).toBeGreaterThan(0);
    await expect(page.locator('.bo-count[data-count="props"]'))
        .toHaveText('· ' + visibleProps);

    // Symbol search — the units rows carry field symbols like (°C).
    await page.fill('#bo-search', '°C');
    expect(await page
        .locator('#bo-table-units tbody tr:not(.bo-empty):not([hidden])').count())
        .toBeGreaterThan(0);

    // Garbage query — rows hide, the empty-state row shows on the
    // active tab, badges read zero.
    await page.fill('#bo-search', 'zzzzz');
    await expect(page.locator('#bo-table-objects tbody tr:not(.bo-empty):not([hidden])'))
        .toHaveCount(0);
    await expect(page.locator('#bo-table-objects .bo-empty')).toBeVisible();
    await expect(page.locator('.bo-count[data-count="objects"]')).toHaveText('· 0');

    expect(errors, 'bacnet reference behavioral should log no errors').toEqual([]);
});

test('bacnet object reference emits DefinedTermSet JSON-LD after the breadcrumb', async ({ page }) => {
    await page.goto('/tools/bacnet-objects.html');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    // BreadcrumbList stays the FIRST block (the per-page smoke check
    // above pins the same invariant site-wide) — the term sets follow.
    expect(blocks[0]).toContain('BreadcrumbList');
    const termSets = blocks.filter(b => b.includes('"DefinedTermSet"'));
    expect(termSets).toHaveLength(3);
    const joined = termSets.join('');
    expect(joined).toContain('"termCode":"85"');
    expect(joined).toContain('Present_Value');
    // Every block must parse — the safeScriptJson serialization contract.
    for (const b of blocks) JSON.parse(b);
});

test('bacnet vendor ids — decode box walks the registered / reserved / unassigned states', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/bacnet-vendor-ids.html');

    // Seeded 260 decodes on first paint — a registered ID, ok pill. The
    // expected org comes from the data module, not a string pin, so an
    // upstream rename survives a re-import.
    const seeded = bacnetVendorIds.vendors.find(v => v.id === 260);
    await expect(page.locator('#bvid-out-org')).toHaveText(seeded.org);
    await expect(page.locator('#bvid-status')).toHaveClass(/ok/);

    // 555 is one of ASHRAE's seven held IDs — warn pill, org shows the
    // registry's literal "Reserved for ASHRAE" row text.
    await page.fill('#bvid-id', '555');
    await expect(page.locator('#bvid-out-org')).toHaveText('Reserved for ASHRAE');
    await expect(page.locator('#bvid-status')).toHaveClass(/warn/);

    // A withdrawn/never-issued gap below the ceiling is its own warn
    // state, distinct from beyond-snapshot. Derive the gap from the data
    // module (currently 1395) so a future re-import that fills it moves
    // the test instead of breaking it.
    const present = new Set(bacnetVendorIds.vendors.map(v => v.id));
    let gapId = null;
    for (let i = 0; i <= bacnetVendorIds.maxId; i++) {
        if (!present.has(i)) { gapId = i; break; }
    }
    if (gapId !== null) {
        await page.fill('#bvid-id', String(gapId));
        await expect(page.locator('#bvid-out-org')).toHaveText('—');
        await expect(page.locator('#bvid-status')).toHaveText(/withdrawn or never issued/i);
        await expect(page.locator('#bvid-status')).toHaveClass(/warn/);
    }

    // 65000 is in Unsigned16 range but far beyond the snapshot ceiling —
    // muted org, warn pill naming the beyond-snapshot state specifically
    // (not the withdrawn-gap wording). 65000, not a today-gap: decades of
    // headroom vs. registry churn.
    await page.fill('#bvid-id', '65000');
    await expect(page.locator('#bvid-out-org')).toHaveText('—');
    await expect(page.locator('#bvid-status')).toHaveText(/unassigned in this snapshot/i);
    await expect(page.locator('#bvid-status')).toHaveClass(/warn/);

    // 70000 is past the Unsigned16 range — validate-and-mute plus the
    // failure callout.
    await page.fill('#bvid-id', '70000');
    await expect(page.locator('#bvid-out-org')).toHaveText('—');
    await expect(page.locator('#bvid-callout')).toBeVisible();

    // Recover — a low registered ID decodes again and the callout clears.
    await page.fill('#bvid-id', '0');
    await expect(page.locator('#bvid-out-org')).toHaveText('ASHRAE');
    await expect(page.locator('#bvid-callout')).toBeHidden();

    expect(errors, 'vendor-id decode behavioral should log no errors').toEqual([]);
});

test('bacnet vendor ids — filter narrows the registry table and badge tracks it', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/bacnet-vendor-ids.html');

    // Name search — invariant (badge ≡ visible rows), not a pinned
    // number: the registry grows on every re-import.
    await page.fill('#bvid-search', 'trane');
    const visible = await page
        .locator('#bvid-table tbody tr:not(.bvid-empty):not([hidden])').count();
    expect(visible).toBeGreaterThan(0);
    await expect(page.locator('#bvid-count')).toHaveText('· ' + visible);

    // Garbage query — rows hide, the empty-state row shows, badge zero.
    await page.fill('#bvid-search', 'zzzzz');
    await expect(page.locator('#bvid-table tbody tr:not(.bvid-empty):not([hidden])'))
        .toHaveCount(0);
    await expect(page.locator('#bvid-table .bvid-empty')).toBeVisible();
    await expect(page.locator('#bvid-count')).toHaveText('· 0');

    // Clearing restores every row and empties the badge.
    await page.fill('#bvid-search', '');
    expect(await page
        .locator('#bvid-table tbody tr:not(.bvid-empty):not([hidden])').count())
        .toBeGreaterThan(1600);
    await expect(page.locator('#bvid-count')).toHaveText('');

    expect(errors, 'vendor-id filter behavioral should log no errors').toEqual([]);
});

test('bacnet vendor ids — id cells copy their code, and a copy flash cannot corrupt the filter', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/bacnet-vendor-ids.html');

    // Stub the clipboard (no permission needed) and record writes.
    await page.evaluate(() => {
        window.copiedCalls = [];
        navigator.clipboard.writeText = (t) => {
            window.copiedCalls.push(t);
            return Promise.resolve();
        };
    });

    // Click path: the first id cell copies its data-code (0), not its
    // visible text — which copyText swaps to "copied!" for the flash.
    const firstCell = page.locator('#bvid-table td.bvid-copyable').first();
    await firstCell.click();
    expect(await page.evaluate(() => window.copiedCalls)).toEqual(['0']);
    await expect(firstCell).toHaveText('copied!');

    // Filter DURING the flash — the haystack reads data-code, so the
    // mutated cell text must not hide the row (regression: filtering by
    // a just-copied ID used to drop exactly that row).
    await page.fill('#bvid-search', '0');
    await expect(page.locator('#bvid-table tbody tr').first()).toBeVisible();

    // Keyboard path: Enter on a focused cell copies too.
    await page.fill('#bvid-search', '');
    const secondCell = page.locator('#bvid-table td.bvid-copyable').nth(1);
    await secondCell.focus();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => window.copiedCalls)).toEqual(['0', '1']);

    expect(errors, 'vendor-id copy behavioral should log no errors').toEqual([]);
});

test('bacnet vendor ids — FAQPage JSON-LD emits and every block parses', async ({ page }) => {
    await page.goto('/tools/bacnet-vendor-ids.html');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks[0]).toContain('BreadcrumbList');
    const faq = blocks.filter(b => b.includes('"FAQPage"'));
    expect(faq).toHaveLength(1);
    expect(faq[0]).toContain('Vendor_Identifier');
    // No 1,600-term DefinedTermSet on this page — deliberate (head weight).
    expect(blocks.filter(b => b.includes('"DefinedTermSet"'))).toHaveLength(0);
    // Every block must parse — the serialization contract.
    for (const b of blocks) JSON.parse(b);
});

test('modbus register viewer — single + pair tabs decode bits and bytes correctly', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/modbus-register-viewer.html');

    // Single Register tab — set value via hex; readouts mirror it.
    await page.fill('#mod-hex', '0xABCD');
    await expect(page.locator('#read-dec')).toHaveText('43981');
    await expect(page.locator('#read-hex')).toHaveText('0xABCD');
    await expect(page.locator('#read-bin')).toHaveText('1010 1011 1100 1101');

    // Signed toggle flips the decimal interpretation only — hex / bin
    // are bit-level views and stay put.
    await page.fill('#mod-hex', '0xFFFF');
    await expect(page.locator('#read-dec')).toHaveText('65535');
    await page.selectOption('#mod-signed', 'signed');
    await expect(page.locator('#read-dec')).toHaveText('-1');
    await expect(page.locator('#read-hex')).toHaveText('0xFFFF');
    await expect(page.locator('#read-bin')).toHaveText('1111 1111 1111 1111');

    // 32-bit Pair tab — 0x4248F5C3 is the canonical big-endian IEEE-754
    // representation of ≈ 50.24. ABCD decodes to ~50.24; the other three
    // orderings produce dramatically different values, proving the
    // byte-shuffle math is working.
    await page.click('[data-tab="pair"]');
    await page.fill('#pair-r1-hex', '0x4248');
    await page.fill('#pair-r2-hex', '0xF5C3');
    await expect(page.locator('#pair-abcd-f32')).toContainText('50.2');
    // uint32 of 0x4248F5C3 = 1112077763; MSB clear, so int32 matches.
    await expect(page.locator('#pair-abcd-u32')).toHaveText('1112077763');
    await expect(page.locator('#pair-abcd-i32')).toHaveText('1112077763');
    // CDAB swaps the words; resulting float is in the e+32 range.
    await expect(page.locator('#pair-cdab-f32')).not.toContainText('50.2');
    await expect(page.locator('#pair-cdab-f32')).toContainText('e+32');

    expect(errors, 'modbus behavioral should log no page / console errors').toEqual([]);
});

// Audit-2026-06 lineup gap: the Address ↔ Offset tab converts the
// 5-digit documentation reference both directions, and the Single
// Register value field hints when a typed value is address-shaped
// (the "5-digit register trap" the Modbus Decoding lesson teaches).
test('modbus register viewer — address/offset converter + trap hint', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/modbus-register-viewer.html');

    // Trap hint: hidden on first paint (the teaching default 43981 is
    // address-shaped but wasn't typed), shown for a typed 4xxxx value,
    // hidden again for a plain value.
    await expect(page.locator('#mod-trap-hint')).toBeHidden();
    await page.fill('#mod-dec', '40013');
    const hint = page.locator('#mod-trap-hint');
    await expect(hint).toBeVisible();
    await expect(hint).toContainText('holding-register offset 12');
    await expect(hint).toContainText('FC03');
    // Still non-blocking — the register decodes as a plain value.
    await expect(page.locator('#read-dec')).toHaveText('40013');
    await page.fill('#mod-dec', '1234');
    await expect(hint).toBeHidden();

    // Converter tab — default 43021 resolves on load.
    await page.click('.tab-btn[data-tab="convert"]');
    await expect(page.locator('#mod-conv-offset')).toHaveText('3020 (0x0BCC)');
    await expect(page.locator('#mod-conv-fc')).toHaveText('FC03 (Read Holding Registers)');
    await expect(page.locator('#mod-conv-sentence')).toContainText('Vendor docs 43021');

    // Address → table + offset: 30013 lands in the input-register table.
    await page.fill('#mod-addr', '30013');
    await expect(page.locator('#mod-table')).toHaveValue('input');
    await expect(page.locator('#mod-offset')).toHaveValue('12');
    await expect(page.locator('#mod-conv-fc')).toHaveText('FC04 (Read Input Registers)');

    // Table + offset → address: holding offset 0 is the canonical 40001.
    await page.selectOption('#mod-table', 'holding');
    await page.fill('#mod-offset', '0');
    await expect(page.locator('#mod-addr')).toHaveValue('40001');
    await expect(page.locator('#mod-conv-sentence')).toContainText('Vendor docs 40001');

    // No-table address fails loud, not quietly.
    await page.fill('#mod-addr', '20005');
    await expect(page.locator('#mod-conv-callout')).toBeVisible();
    await expect(page.locator('#mod-conv-callout')).toContainText('No table owns that address');
    await expect(page.locator('#mod-conv-offset')).toHaveText('—');

    expect(errors, 'modbus converter behavioral should log no errors').toEqual([]);
});

test('psychrometric chart computes the AHU chain on load', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/psychrometric-chart.html');
    // default summer cooling: OA 92 °F DB / 76 °F WB is the focused stage,
    // so the right-hand detail block shows OA's state.
    await expect(page.locator('#ro-db')).toHaveText('92.0');
    await expect(page.locator('#ro-wb')).toHaveText('76.0');
    // stage table includes the active CC row (cooling coil is on by default)
    await expect(page.locator('#psy-stage-table tbody tr')).toHaveCount(5);  // OA, RA, MA, CC, SA
    // CC leaving DB = 55 °F at row index 3 (0-based). The stage key is
    // a <th scope="row"> now (the a11y machine-sweep), so DB is the
    // FIRST td — assert the th carries the key too.
    await expect(page.locator('#psy-stage-table tbody tr').nth(3).locator('th')).toHaveText('CC');
    await expect(page.locator('#psy-stage-table tbody tr').nth(3).locator('td').nth(0)).toHaveText('55.0');
    // pick RA so the detail block tracks the selection
    await page.click('.psy-pill[data-step="ra"]');
    await expect(page.locator('#ro-db')).toHaveText('75.0');
    // an impossible state mutes the readouts and surfaces an error
    await page.selectOption('#ra-mode', 'wb');
    await page.fill('#ra-tdb', '70');
    await page.fill('#ra-second', '80');  // wet-bulb above dry-bulb
    await expect(page.locator('#ro-wb')).toHaveText('—');
    await expect(page.locator('#psy-msg')).toContainText('Wet-bulb can');
    expect(errors, 'psychrometric behavioral should log no page / console errors').toEqual([]);
});

test.describe('psychrometric chart — Cold range preset', () => {
    // No cleanup hook on purpose: Playwright gives every test its own
    // browser context, so localStorage writes (cf_psy_range here) can't
    // bleed between tests — the audit-2026-06 isolation probe verified
    // this empirically, and the afterEach this comment used to justify
    // was dead code teaching a wrong invariant.

    test('toggle switches active button + persists to localStorage', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto('/tools/psychrometric-chart.html');

        // Fresh visit defaults to Standard (no localStorage entry yet).
        await expect(page.locator('[data-range="standard"]')).toHaveClass(/active/);
        await expect(page.locator('[data-range="cold"]')).not.toHaveClass(/active/);

        // Click Cold; both class state and localStorage flip.
        await page.click('[data-range="cold"]');
        await expect(page.locator('[data-range="cold"]')).toHaveClass(/active/);
        await expect(page.locator('[data-range="standard"]')).not.toHaveClass(/active/);
        expect(await page.evaluate(() => localStorage.getItem('cf_psy_range'))).toBe('cold');

        // Reload: the preset persists.
        await page.reload({ waitUntil: 'load' });
        await expect(page.locator('[data-range="cold"]')).toHaveClass(/active/);

        // Flip back to Standard; localStorage updates.
        await page.click('[data-range="standard"]');
        expect(await page.evaluate(() => localStorage.getItem('cf_psy_range'))).toBe('standard');

        expect(errors, 'psychrometric range-preset behavioral should log no page / console errors').toEqual([]);
    });
});

test('air mixing — three-stream blend computes on both tabs', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/air-mixing.html');

    // By-mass-flow tab: defaults are a 1000/3000/500 CFM blend of
    // 95/75WB, 75/50%RH, and 60/55WB. Mass-weighted (dominated by the
    // 3000 CFM stream), engine produces tdb=77.6 / wb=64.8 / rh=50.3 /
    // h=29.7 / w=70.9 gr/lb / v=13.76 ft³/lb. Substring matchers stay
    // loose enough to absorb cosmetic-rounding tweaks but tight enough
    // to fail on any ~5 %+ engine drift.
    await expect(page.locator('#am-flow-ma-tdb')).toContainText('77.');
    await expect(page.locator('#am-flow-ma-wb' )).toContainText('64.');
    await expect(page.locator('#am-flow-ma-rh' )).toContainText('50.');
    await expect(page.locator('#am-flow-ma-h'  )).toContainText('29.');
    await expect(page.locator('#am-flow-ma-w'  )).toContainText('70.');
    await expect(page.locator('#am-flow-status')).toContainText('Mixed state computed');

    // A bad stream input (WB > DB) surfaces inline + mutes the output.
    await page.fill('#am-flow-s1-second', '200');
    await expect(page.locator('#am-flow-s1-err')).toContainText('Wet-bulb can');
    await expect(page.locator('#am-flow-ma-tdb')).toHaveText('—');
    await expect(page.locator('#am-flow-status')).toContainText('Fix the stream');

    // Restore stream 1 and switch to by-mass-fraction tab.
    await page.fill('#am-flow-s1-second', '75');
    await page.click('[data-tab="frac"]');

    // Fraction defaults (22/67/11) at the same per-stream air states
    // compute to tdb=77.8 / rh=50.1 / h=29.8 — close to the mass-flow
    // result above (the 22 % fraction is a slight overstatement of the
    // hot stream's mass weight, hence the 0.2 °F bump).
    await expect(page.locator('#am-frac-ma-tdb')).toContainText('77.');
    await expect(page.locator('#am-frac-ma-rh' )).toContainText('50.');
    await expect(page.locator('#am-frac-ma-h'  )).toContainText('29.');

    // Fractions that don't sum to 100 surface a tab-level warning.
    await page.fill('#am-frac-s1-w', '30');
    await expect(page.locator('#am-frac-status')).toContainText('must sum to 100');
    await expect(page.locator('#am-frac-ma-tdb')).toHaveText('—');

    expect(errors, 'air-mixing behavioral should log no page / console errors').toEqual([]);
});

test('economizer ratio — dry-bulb and enthalpy tabs compute their cases', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/economizer-ratio.html');

    // Dry-bulb tab loads with the worked-example defaults: 60 / 75 / 65 °F.
    // (65 − 75) / (60 − 75) × 100 = 66.7 % — feasible, shown as the headline.
    await expect(page.locator('#er-db-pct')).toHaveText('66.7 %');
    await expect(page.locator('#er-db-feas')).toContainText('Feasible');

    // Out-of-range (>100 %): drop the setpoint below OA. (55 − 75) / (60 − 75)
    // × 100 = 133.3 % — a simple mix can't get there, so the headline mutes to
    // — and the feasibility callout carries the explanation (ux-audit #11).
    await page.fill('#er-db-ma', '55');
    await expect(page.locator('#er-db-pct')).toHaveText('—');
    await expect(page.locator('#er-db-pct')).toHaveClass(/muted/);
    await expect(page.locator('#er-db-feas')).toContainText('100 % OA');

    // Another feasible case: setpoint between OA and RA.
    await page.fill('#er-db-oa', '50');
    await page.fill('#er-db-ma', '65');
    // (65 − 75) / (50 − 75) × 100 = 40 %
    await expect(page.locator('#er-db-pct')).toHaveText('40.0 %');
    await expect(page.locator('#er-db-feas')).toContainText('Feasible');

    // Infeasible (<0 %) — OA hotter than the setpoint AND than RA. Headline
    // mutes here too; feasibility line explains minimum-OA only.
    await page.fill('#er-db-oa', '85');
    await page.fill('#er-db-ma', '60');
    await expect(page.locator('#er-db-pct')).toHaveText('—');
    await expect(page.locator('#er-db-pct')).toHaveClass(/muted/);
    await expect(page.locator('#er-db-feas')).toContainText('Infeasible');

    // Enthalpy tab — defaults: OA 78/68WB, RA 75/63WB, MA target 65.
    // Engine raw: h_OA = 32.27 / h_RA = 28.43 Btu/lb (OA carries more
    // enthalpy → unfavorable). Page renders one decimal: 32.3 / 28.4.
    await page.click('[data-tab="h"]');
    await expect(page.locator('#er-h-changeover')).toContainText('Unfavorable');
    // OA dry-bulb (78) > RA dry-bulb (75), MA target 65 < both → infeasible.
    await expect(page.locator('#er-h-feas')).toContainText('Infeasible');
    await expect(page.locator('#er-h-ma-h')).not.toHaveText('—');
    await expect(page.locator('#er-h-oa-h')).toContainText('32.3');
    await expect(page.locator('#er-h-ra-h')).toContainText('28.4');

    // Non-WB Define-by mode: switch OA to RH=50% at 78 °F → h ≈ 29.9
    // (down from 32.3 at 68 °F WB). Exercises the rh branch in
    // Psychro.solveState; the value drop proves the mode-dispatch reran.
    await page.selectOption('#er-h-oa-mode', 'rh');
    await page.fill('#er-h-oa-second', '50');
    await expect(page.locator('#er-h-oa-h')).toContainText('29.9');

    // OA == RA dry-bulb edge case — hits the no-unique-%OA guard at
    // economizer-ratio.html:467. Reset OA back to WB defaults, then set
    // RA dry-bulb to match OA's 78 °F.
    await page.selectOption('#er-h-oa-mode', 'wb');
    await page.fill('#er-h-oa-second', '68');
    await page.fill('#er-h-ra-tdb', '78');
    await expect(page.locator('#er-h-feas')).toContainText('OA and RA dry-bulbs are identical');
    await expect(page.locator('#er-h-pct')).toHaveText('—');
    await expect(page.locator('#er-h-pct')).toHaveClass(/muted/);
    await expect(page.locator('#er-h-pct')).toHaveClass(/error/);

    expect(errors, 'economizer behavioral should log no page / console errors').toEqual([]);
});

// Regression for audit-2026-06 #53: in metric the default inputs render
// as 18.3 / 23.9 / 15.6 °C, and everything downstream must reconcile
// with THOSE numbers — headline and formula tail both 67.5 % (the
// arithmetic of the displayed operands), never the 66.7 % the unrounded
// US defaults produce. The formula tail is additionally computed from
// the displayed operand strings so the taught line closes by
// construction.
test('economizer ratio — metric formula line closes arithmetically', async ({ page }) => {
    const errors = watchErrors(page);
    await page.addInitScript(() => localStorage.setItem('cf_units', 'metric'));
    await page.goto('/tools/economizer-ratio.html');

    await expect(page.locator('#er-db-pct')).toHaveText('67.5 %');
    const formula = page.locator('#er-db-formula');
    await expect(formula).toContainText('(18.3 − 23.9) ÷ (15.6 − 23.9)');
    await expect(formula).toContainText('= 67.5 %');

    expect(errors, 'metric economizer formula should log no errors').toEqual([]);
});

// Audit-2026-06 #3: the refrigeration lessons are dual-stated with the
// data-us/data-metric span convention. Spot-check the superheat lesson's
// worked example in metric — the converted subtraction must close
// (10.0 − 4.4 = 5.6, the rounding policy) and match what the P-T tool
// shows a metric user for the same system.
test('superheat lesson — metric worked example swaps and closes', async ({ page }) => {
    const errors = watchErrors(page);
    await page.addInitScript(() => localStorage.setItem('cf_units', 'metric'));
    await page.goto('/education/superheat-subcooling.html');

    // The attribute values carry   between number and unit (the
    // phone-width polish keeps "5.6 °C" from wrapping mid-token), so the
    // attribute selectors must match them exactly; toHaveText normalizes
    // nbsp to space, so the expected texts stay plain.
    const sh = page.locator('span[data-metric="superheat = 10.0 °C − 4.4 °C = 5.6 °C"]');
    await expect(sh).toHaveText('superheat = 10.0 °C − 4.4 °C = 5.6 °C');
    const sc = page.locator('span[data-metric="subcooling = 40.6 °C − 35.0 °C = 5.6 °C"]');
    await expect(sc).toHaveText('subcooling = 40.6 °C − 35.0 °C = 5.6 °C');

    expect(errors, 'metric superheat lesson should log no errors').toEqual([]);
});

test('coil sizing — capacity and leaving-state tabs compute their cases', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/coil-sizing.html');

    // Capacity tab — cooling defaults: 2000 CFM, entering 80/67WB,
    // leaving 55/54WB. Engine: 76.9 MBH total, 53.1 sensible, 23.9
    // latent, SHR 0.69. Substring matchers absorb cosmetic rounding
    // tweaks but fail on any ~5 %+ engine drift.
    await expect(page.locator('#cs-cap-q-total')).toContainText('76.');
    await expect(page.locator('#cs-cap-q-sens' )).toContainText('53.');
    await expect(page.locator('#cs-cap-q-lat'  )).toContainText('23.');
    await expect(page.locator('#cs-cap-shr'    )).toHaveText('0.69');
    await expect(page.locator('#cs-cap-status' )).toContainText('Cooling coil');
    // Worked formula prints the entering-air specific-volume basis (ux #12).
    await expect(page.locator('#cs-cap-formula')).toContainText('v = 13.85 ft³/lb at entering 80.0/67.0 °F');

    // Worked formula is dimensionally coherent per units (#75): US carries
    // the CFM→per-hour × 60 factor and reads lb dry air/h; metric drops the
    // × 60 (m³/h is already per-hour) and reads kg dry air/h. Toggle back to
    // US afterwards so the rest of the test runs against the US defaults.
    await expect(page.locator('#cs-cap-formula')).toContainText('× 60 ÷ v');
    await expect(page.locator('#cs-cap-formula')).toContainText('lb dry air/h');
    await page.click('.units-btn[data-units="metric"]');
    await expect(page.locator('#cs-cap-formula')).toContainText('kg dry air/h');
    await expect(page.locator('#cs-cap-formula')).not.toContainText('× 60');
    await expect(page.locator('#cs-cap-formula')).not.toContainText('lb dry air/h');
    await page.click('.units-btn[data-units="us"]');
    await expect(page.locator('#cs-cap-formula')).toContainText('lb dry air/h');

    // Switch to a heating coil — the sensible / latent / SHR rows drop
    // out, and a leaving dry-bulb above entering reads as heating.
    await page.selectOption('#cs-coil-type', 'heat');
    await expect(page.locator('#cs-cap-q-sens')).toBeHidden();
    await page.fill('#cs-cap-lvg-tdb', '95');
    await expect(page.locator('#cs-cap-ddb'   )).toContainText('+15.0');
    await expect(page.locator('#cs-cap-status')).toContainText('Heating coil');

    // Leaving-state tab — back to cooling defaults: entering 80/67WB,
    // 2000 CFM, 40 MBH sensible + 15 MBH latent → leaving ≈ 61 °F /
    // 83 % RH.
    await page.selectOption('#cs-coil-type', 'cool');
    await page.click('[data-tab="leaving"]');
    await expect(page.locator('#cs-lvg-out-db' )).toContainText('61.');
    await expect(page.locator('#cs-lvg-out-rh' )).toContainText('83.');
    await expect(page.locator('#cs-lvg-status' )).toContainText('solved');

    // A sensible load past what the air can shed without saturating
    // pins the leaving point on the saturation curve (apparatus dew
    // point) — 90 MBH sensible drives leaving air to 100 % RH.
    await page.fill('#cs-lvg-q-sens', '90');
    await expect(page.locator('#cs-lvg-status')).toContainText('saturation curve');

    // Bad entering-air state (WB > DB) surfaces inline and mutes output.
    await page.fill('#cs-lvg-q-sens', '40');
    await page.fill('#cs-lvg-ent-second', '200');
    await expect(page.locator('#cs-lvg-status')).toContainText('Wet-bulb can');
    await expect(page.locator('#cs-lvg-out-db')).toHaveText('—');

    expect(errors, 'coil-sizing behavioral should log no page / console errors').toEqual([]);
});

test('power & energy converter — convert, time bridge, and boiler turndown', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/power-energy-converter.html');

    // Convert tab — 100 kW fans out to every power unit via the BTU-family
    // chain (1 kW = 3.412 MBH): 341.2 MBH, 28.4 tons.
    await expect(page.locator('#pe-conv-mbh')).toContainText('341.2');
    await expect(page.locator('#pe-conv-ton')).toContainText('28.4');
    // Clearing the value mutes the readouts and surfaces the callout.
    await page.fill('#pe-conv-val', '');
    await expect(page.locator('#pe-conv-mbh')).toHaveText('—');
    await expect(page.locator('#pe-conv-callout')).toBeVisible();
    // Choosing an energy unit swaps the table to the energy dimension.
    await page.fill('#pe-conv-val', '100');
    await page.selectOption('#pe-conv-unit', 'kwh');
    await expect(page.locator('#pe-conv-mj')).toContainText('360');      // 100 kWh = 360 MJ

    // Time bridge — defaults solve Energy: 100 kW × 24 hr = 2,400 kWh.
    await page.click('[data-tab="bridge"]');
    await expect(page.locator('#pe-br-out')).toContainText('2,400 kWh');
    // Flip to solve Power from that energy + 24 hr → back to 100 kW.
    await page.selectOption('#pe-br-solve', 'power');
    await expect(page.locator('#pe-br-out')).toContainText('100 kW');

    // Boiler tab — 835 MBH input fired to a 570 MBH minimum = 1.46:1, the
    // poor-turndown warning from the worked example.
    await page.click('[data-tab="boiler"]');
    await expect(page.locator('#pe-boil-turndown')).toHaveText('1.46:1');
    await expect(page.locator('#pe-boil-plant')).toContainText('1,670 MBH');
    await expect(page.locator('#pe-boil-pill-grade')).toBeVisible();
    await expect(page.locator('#pe-boil-pill-grade')).toHaveClass(/warn/);
    await expect(page.locator('#pe-boil-pill-grade')).toContainText('Poor turndown');
    // Pasting a Riello firing string fills the burner fields, decodes the
    // band, and reads the burner's own turndown (860 ÷ 150 = 5.73:1).
    await page.fill('#pe-boil-riello', '150/350 ÷ 860 kW');
    await expect(page.locator('#pe-boil-min-val')).toHaveValue('150');
    await expect(page.locator('#pe-boil-decode')).toContainText('high-fire 350–860 kW');
    await expect(page.locator('#pe-boil-bturndown')).toHaveText('5.73:1');
    // 350 kW lowest high fire on a 244.7 kW (835 MBH) boiler is oversized.
    await expect(page.locator('#pe-boil-pill-oversize')).toBeVisible();
    // Hand-editing a burner field supersedes the pasted string: the decoded
    // firing line and the burner's own turndown retire so they can't go stale.
    await page.fill('#pe-boil-min-val', '200');
    await expect(page.locator('#pe-boil-decode')).toHaveText('—');
    await expect(page.locator('#pe-boil-bturndown')).toHaveText('—');

    expect(errors, 'power-energy behavioral should log no page / console errors').toEqual([]);
});

test('dew point calculator — default read, coil verdict, and wet-bulb toggle', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/dew-point-calculator.html');

    // Defaults: 75 °F / 55 % RH at sea level → dew point ≈ 57.8 °F, with
    // wet-bulb / grains / enthalpy filled. Parse the number rather than a
    // brittle substring so it survives cosmetic-rounding tweaks.
    const dp = parseFloat((await page.locator('#dew-out-dp').textContent()).replace(/[^0-9.]/g, ''));
    expect(dp, '75 °F / 55 % RH dew point should be ≈ 57–58 °F').toBeGreaterThan(56);
    expect(dp).toBeLessThan(59);
    await expect(page.locator('#dew-out-dp')).toContainText('°F');
    await expect(page.locator('#dew-out-wb')).not.toHaveText('—');
    await expect(page.locator('#dew-out-gr')).not.toHaveText('—');
    // RH is the input in RH mode, so its output row stays hidden.
    await expect(page.locator('#dew-out-rh-row')).toBeHidden();

    // Coil check — supply 55 °F sits below the ~57.8 °F dew point → the
    // coil is dehumidifying (green verdict).
    await page.fill('#dew-surface', '55');
    await expect(page.locator('#dew-verdict')).toBeVisible();
    await expect(page.locator('#dew-verdict')).toHaveClass(/ok/);
    await expect(page.locator('#dew-verdict')).toContainText('below dew point');
    // Supply 62 °F is above it → sensible-only warning.
    await page.fill('#dew-surface', '62');
    await expect(page.locator('#dew-verdict')).toHaveClass(/warn/);
    await expect(page.locator('#dew-verdict')).toContainText('above dew point');
    // Clearing the field retires the verdict.
    await page.fill('#dew-surface', '');
    await expect(page.locator('#dew-verdict')).toBeHidden();

    // Wet-bulb toggle: the second input relabels and the RH output row appears.
    await page.click('#dew-mode-wb');
    await expect(page.locator('#dew-second-label')).toContainText('Wet-bulb');
    await expect(page.locator('#dew-out-rh-row')).toBeVisible();
    // Wet-bulb above dry-bulb is impossible → muted hero + engine error.
    await page.fill('#dew-db', '70');
    await page.fill('#dew-second', '80');
    await expect(page.locator('#dew-out-dp')).toHaveText('—');
    await expect(page.locator('#dew-callout')).toBeVisible();

    expect(errors, 'dew-point behavioral should log no page / console errors').toEqual([]);
});

test.describe('thermistor behavioral', () => {
    // The units flip below can't bleed into other tests: contexts are
    // per-test, so each test starts with empty localStorage (verified
    // empirically by the audit-2026-06 isolation probe — the afterEach
    // that used to live here was dead code with an inverted rationale).

    test('thermistor calculator looks up a known reference value', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto('/tools/thermistor-calculator.html');

        // the inputs + the reference table render on load
        await expect(page.locator('#th-type')).toBeVisible();
        await expect(page.locator('#th-temp')).toBeVisible();
        expect(await page.locator('#th-rt-body tr').count(), 'R/T table should be populated').toBeGreaterThan(40);

        // 10K Type III at 77 °F is the type's defining property — should land on ~10,000 Ω
        await page.selectOption('#th-type', '10k-3');
        await page.fill('#th-temp', '77');
        const r = parseFloat((await page.locator('#th-result').textContent()).replace(/[^0-9.]/g, ''));
        expect(r, '10K-3 @ 77 °F should be ≈ 10,000 Ω').toBeGreaterThan(9700);
        expect(r).toBeLessThan(10300);
        await expect(page.locator('#th-status')).toHaveText('in range');

        // a temperature outside the table range mutes the result
        await page.fill('#th-temp', '400');
        await expect(page.locator('#th-result')).toHaveText('—');

        // flipping the global units toggle rescales the temperature field and label
        // (the local °F/°C buttons were retired when the global selector landed)
        await page.fill('#th-temp', '50');
        await page.click('.units-btn[data-units="metric"]');
        await expect(page.locator('#th-temp-lbl')).toHaveText('Temperature (°C)');
        expect(parseFloat(await page.locator('#th-temp').inputValue())).toBeCloseTo(10, 0);   // 50 °F ≈ 10 °C
        expect(errors, 'thermistor behavioral should log no page / console errors').toEqual([]);
    });

    test('identify mode names the type its points came from', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto('/tools/thermistor-calculator.html');

        // pull three points off the 10K Type III curve using Lookup mode
        await page.selectOption('#th-type', '10k-3');
        const pairs = [];
        for (const t of ['35', '77', '150']) {
            await page.fill('#th-temp', t);
            const r = (await page.locator('#th-result').textContent()).replace(/[^0-9.]/g, '');
            pairs.push([t, r]);
        }

        // enter them in Identify mode — the tool should name 10K Type III
        await page.click('#th-tab-identify');
        const rows = page.locator('#th-id-rows tr');
        await expect(rows).toHaveCount(3);
        for (let i = 0; i < 3; i++) {
            await rows.nth(i).locator('.th-id-t').fill(pairs[i][0]);
            await rows.nth(i).locator('.th-id-r').fill(pairs[i][1]);
        }
        await expect(page.locator('#th-id-best')).toHaveText('10K Type III');

        // the ranked table lists every type, best row first
        expect(await page.locator('#th-id-rank-body tr').count(), 'one ranked row per type').toBe(9);
        await expect(page.locator('#th-id-rank-body tr').first()).toHaveClass(/th-id-top/);

        // add a point row, then remove it
        await page.click('#th-id-add');
        await expect(rows).toHaveCount(4);
        await rows.nth(3).locator('.th-id-del').click();
        await expect(rows).toHaveCount(3);

        // picking a ranked row jumps back to Lookup with that type selected
        await page.locator('#th-id-rank-body .th-id-pick').first().click();
        await expect(page.locator('#tab-lookup')).toHaveClass(/active/);
        await expect(page.locator('#th-type')).toHaveValue('10k-3');

        expect(errors, 'identify behavioral should log no page / console errors').toEqual([]);
    });
});

test('refrigerant p-t — saturation lookup, glide blend, and superheat', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/refrigerant-pt.html');

    // P-T tab, R-410A defaults: 118 psig → bubble/dew ≈ 39.6 / 39.8 °F,
    // near-zero glide (near-azeotropic). Substring matchers absorb
    // cosmetic rounding but fail on a real interpolation drift.
    await expect(page.locator('#rf-pt-bubble')).toContainText('39.');
    await expect(page.locator('#rf-pt-dew'   )).toContainText('39.');
    await expect(page.locator('#rf-pt-status')).toContainText('negligible glide');

    // R-407C at 100 psig is a transcribed chart row: bubble 51.1 °F,
    // dew 61.6 °F — ~10 °F glide, the case a single-column card botches.
    await page.selectOption('#rf-refrigerant', 'r407c');
    await page.fill('#rf-pt-pressure', '100');
    await expect(page.locator('#rf-pt-bubble')).toContainText('51.1');
    await expect(page.locator('#rf-pt-dew'   )).toContainText('61.6');
    await expect(page.locator('#rf-pt-glide' )).toContainText('10.5');
    await expect(page.locator('#rf-pt-status')).toContainText('glide blend');

    // A pressure past the chart range mutes the output.
    await page.fill('#rf-pt-pressure', '9000');
    await expect(page.locator('#rf-pt-bubble')).toHaveText('—');
    await expect(page.locator('#rf-pt-status')).toContainText('Out of range');

    // Superheat / Subcooling tab — R-410A suction defaults: 118 psig,
    // 50 °F line → dew ≈ 39.8 °F, superheat ≈ 10 °F.
    await page.selectOption('#rf-refrigerant', 'r410a');
    await page.click('[data-tab="sc"]');
    await expect(page.locator('#rf-sc-result-lbl')).toHaveText('Superheat');
    await expect(page.locator('#rf-sc-result'    )).toContainText('10.');

    // Liquid line — the label flips to Subcooling; 319 psig bubble
    // ≈ 100 °F, 90 °F line → subcooling ≈ 10 °F.
    await page.click('#rf-sc-liquid');
    await expect(page.locator('#rf-sc-result-lbl')).toHaveText('Subcooling');
    await page.fill('#rf-sc-pressure', '319');
    await page.fill('#rf-sc-temp', '90');
    await expect(page.locator('#rf-sc-result')).toContainText('10.');
    await expect(page.locator('#rf-sc-status')).toContainText('typical range');

    expect(errors, 'refrigerant p-t behavioral should log no page / console errors').toEqual([]);
});

test('function-block editor — examples run, and blocks add and wire up', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/simulators/function-block-editor.html');

    // The economizer example loads by default — six blocks, evaluated.
    await expect(page.locator('.fbe-block')).toHaveCount(6);
    // OAT 55 °F is below the 60 °F changeover setpoint → free cooling
    // available, so the economizer-enable output sits TRUE on first paint
    // (matching the worked illustration on the partner education page).
    await expect(page.locator('.fbe-block[data-id="econ"] .fbe-block-val')).toHaveText('TRUE');

    // Edit the OAT analog input through the inspector — raise it above the
    // setpoint and the enable output flips FALSE on the next tick.
    await page.locator('.fbe-block[data-id="oat"] .fbe-block-head').click();
    await page.fill('#fbe-p-value', '68');
    await expect(page.locator('.fbe-block[data-id="econ"] .fbe-block-val')).toHaveText('FALSE');

    // Freeze-stat example: tripping the freeze contact latches the alarm
    // on and drops the fan — the SR latch holding state.
    await page.click('[data-example="freeze"]');
    await expect(page.locator('.fbe-block[data-id="alarm"] .fbe-block-val')).toHaveText('FALSE');
    await page.locator('.fbe-block[data-id="fz"] .fbe-block-val').click();
    await expect(page.locator('.fbe-block[data-id="alarm"] .fbe-block-val')).toHaveText('TRUE');
    await expect(page.locator('.fbe-block[data-id="fan"] .fbe-block-val')).toHaveText('FALSE');

    // Clear the sheet, add two blocks from the palette, and wire them.
    await page.click('#fbe-clear');
    await expect(page.locator('.fbe-block')).toHaveCount(0);
    await page.locator('.fbe-palette-btn', { hasText: 'CONSTANT' }).click();
    await page.locator('.fbe-palette-btn', { hasText: 'READOUT' }).click();
    await expect(page.locator('.fbe-block')).toHaveCount(2);
    await page.locator('.fbe-block[data-id="b1"] .fbe-pin-out').click();
    await page.locator('.fbe-block[data-id="b2"] .fbe-pin-in').click();
    await expect(page.locator('.fbe-wire')).toHaveCount(1);

    expect(errors, 'function-block editor behavioral should log no page / console errors').toEqual([]);
});

test('education page runs the PID mini-sims and they respond to input', async ({ page }) => {
    const errors = watchErrors(page);

    await page.goto('/education/pid-basics.html');

    // all three mini-sim canvases are present and visible
    for (const id of ['#m1-canvas', '#m2-canvas', '#m3-canvas']) {
        await expect(page.locator(id)).toBeVisible();
    }
    // the shared engine ran on load — the key-metric callouts are filled in
    await expect(page.locator('#m1-offset')).not.toHaveText('—');
    await expect(page.locator('#m2-over')).not.toHaveText('—');
    await expect(page.locator('#m3-settle')).not.toHaveText('—');

    // moving Sim 1's gain slider re-runs the sim — the offset readout changes
    const offsetBefore = await page.locator('#m1-offset').textContent();
    await page.locator('#m1-slider').evaluate((el) => {
        el.value = el.max;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#m1-offset')).not.toHaveText(offsetBefore);

    // a process-speed chip switches the model and takes the .active state
    const slowChip = page.locator('#sim2 .btn-row .copy-btn').filter({ hasText: 'Slow' });
    await slowChip.click();
    await expect(slowChip).toHaveClass(/active/);

    expect(errors, 'education page should log no page / console errors').toEqual([]);
});

test('tools landing — filter chip narrows to one category and All restores', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/');

    // [All] active on a fresh visit; every card visible.
    await expect(page.locator('.filter-chip[data-category="all"]')).toHaveClass(/active/);
    const totalCards = await page.locator('.nav-card').count();
    await expect(page.locator('.nav-card:not([hidden])')).toHaveCount(totalCards);

    // Click HVAC chip → only HVAC-tagged cards remain; chip flips active.
    await page.click('.filter-chip[data-category="hvac"]');
    await expect(page.locator('.filter-chip[data-category="hvac"]')).toHaveClass(/active/);
    await expect(page.locator('.filter-chip[data-category="all"]')).not.toHaveClass(/active/);
    const visibleHvac = await page.locator('.nav-card:not([hidden])').count();
    expect(visibleHvac, 'only HVAC cards should remain visible').toBe(7);
    // hash updates (replaceState — no scroll, no back-history pollution)
    expect(new URL(page.url()).hash).toBe('#hvac');

    // Click [All] → restored.
    await page.click('.filter-chip[data-category="all"]');
    await expect(page.locator('.nav-card:not([hidden])')).toHaveCount(totalCards);
    expect(new URL(page.url()).hash).toBe('');

    expect(errors, 'tools-filter behavioral should log no errors').toEqual([]);
});

test('tools landing — URL hash deep-links to a category on initial load', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/#protocols');

    // Page boots with Protocols active.
    await expect(page.locator('.filter-chip[data-category="protocols"]')).toHaveClass(/active/);
    expect(await page.locator('.nav-card:not([hidden])').count()).toBe(5);

    // Unknown hash falls back to [All].
    await page.goto('/tools/#nonsense');
    await expect(page.locator('.filter-chip[data-category="all"]')).toHaveClass(/active/);
    const total = await page.locator('.nav-card').count();
    await expect(page.locator('.nav-card:not([hidden])')).toHaveCount(total);

    expect(errors, 'tools-hash behavioral should log no errors').toEqual([]);
});

test('education landing — Hydronics chip narrows to the 4 hydronic lessons', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/#hydronics');

    await expect(page.locator('.filter-chip[data-category="hydronics"]')).toHaveClass(/active/);
    expect(await page.locator('.nav-card:not([hidden])').count()).toBe(4);

    expect(errors, 'education-filter behavioral should log no errors').toEqual([]);
});

test('education hub links to its pages', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/');
    const hrefs = await page.locator('.nav-card').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toContain('/education/pid-basics.html');
    expect(hrefs).toContain('/education/hydronic-loops.html');
    expect(hrefs).toContain('/education/load-piping.html');
    expect(hrefs).toContain('/education/vfds.html');
    expect(hrefs).toContain('/education/pump-control.html');
    expect(hrefs).toContain('/education/balancing.html');
    expect(errors, 'education hub behavioral should log no page / console errors').toEqual([]);
});

test('hydronic loops page renders its three SVG schematics', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/hydronic-loops.html');
    const svgs = page.locator('main svg.edu-svg');
    await expect(svgs).toHaveCount(3);
    // each diagram carries a <title> (the accessibility name) and real <text> labels
    for (let i = 0; i < 3; i++) {
        await expect(svgs.nth(i).locator('title')).toHaveCount(1);
        expect(await svgs.nth(i).locator('text').count(), 'diagram should have <text> labels').toBeGreaterThan(3);
    }
    // the named equipment groups are present (the hooks a future animated version would drive)
    await expect(page.locator('#d1-boiler')).toHaveCount(1);
    await expect(page.locator('#d3-injection-pump')).toHaveCount(1);
    // the #d3 anchor on the twin-T subhead is the target for the load-piping page's tie-back
    await expect(page.locator('#d3')).toHaveCount(1);
    expect(errors, 'hydronic-loops behavioral should log no page / console errors').toEqual([]);
});

test('load piping page renders its four SVG schematics and ties back to the twin-T', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/load-piping.html');
    const svgs = page.locator('main svg.edu-svg');
    await expect(svgs).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
        await expect(svgs.nth(i).locator('title')).toHaveCount(1);
        expect(await svgs.nth(i).locator('text').count(), 'diagram should have <text> labels').toBeGreaterThan(3);
    }
    // named equipment groups are present (animation-ready markup hooks) — one per
    // section, plus the tie-back diagram's twin-T-with-both-load-types comparison
    await expect(page.locator('#lp-2w-valve')).toHaveCount(1);
    await expect(page.locator('#lp-3wm-valve')).toHaveCount(1);
    await expect(page.locator('#lp-3wd-valve')).toHaveCount(1);
    await expect(page.locator('#lp-tt-load-a-valve')).toHaveCount(1);
    await expect(page.locator('#lp-tt-load-b-valve')).toHaveCount(1);
    // the closing tie-back actually links back to the twin-T #d3 anchor
    const hrefs = await page.locator('main a').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toContain('/education/hydronic-loops.html#d3');
    expect(errors, 'load-piping behavioral should log no page / console errors').toEqual([]);
});

test('vfd mock — run-source gating works from the keypad', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/simulators/vfd-mock.html');

    // Default config is run-source=TERMINALS. Pressing keypad RUN should
    // NOT start the drive; the LCD's line 4 flashes the ignore msg, which
    // now names the run source AND the fix (press L/R) — ux-audit #5.
    await page.click('#vfdm-key-run');
    await expect(page.locator('#vfdm-state-text')).toHaveText(/STOPPED/);
    const lcdLines = await page.locator('#vfdm-lcd .vfdm-lcd-line').allTextContents();
    expect(lcdLines[3]).toMatch(/IGN: SRC=TERM, L\/R/);

    // BAS-flare LED — neutral when stopped (no .active class).
    await expect(page.locator('#vfdm-state-led')).not.toHaveClass(/active/);

    // L/R into LOCAL — keypad now overrides source params and RUN actually starts the drive.
    await page.click('#vfdm-key-local');
    await page.click('#vfdm-key-run');
    await expect(page.locator('#vfdm-state-text')).toHaveText(/RAMPING UP|AT SPEED/);

    // BAS-flare LED activates as the drive starts running.
    await expect(page.locator('#vfdm-state-led')).toHaveClass(/active/);

    // setHz = 30 (keypad default I01). Poll for actHz to climb to ≥ 1 Hz
    // (deterministic stop condition instead of a hard 300 ms wait) capped
    // at 1.5 s; then read once and assert the ramp stays under setpoint.
    const setHz = 30;
    await expect.poll(
        async () => parseFloat(await page.locator('#vfdm-act-hz').textContent()),
        { timeout: 1500, message: 'drive should be ramping up in LOCAL mode' }
    ).toBeGreaterThanOrEqual(1);
    const actHz = parseFloat(await page.locator('#vfdm-act-hz').textContent());
    expect(actHz, 'drive should not exceed the configured setpoint during ramp').toBeLessThanOrEqual(setHz);
    expect(errors, 'vfd-mock behavioral should log no page / console errors').toEqual([]);
});

test('pump control page renders its diagram and both widgets respond', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/pump-control.html');

    // pipe-flow diagram for DP control is present (the third edu-svg-styled
    // page; the chart inside Widget 1 is .pc-w1-chart, not .edu-svg)
    await expect(page.locator('main svg.edu-svg')).toHaveCount(1);
    await expect(page.locator('#pc-dp-pump')).toHaveCount(1);
    await expect(page.locator('#pc-dp-sensor')).toHaveCount(1);

    // Widget 1 — operating point reads close to design (100 GPM, 50 ft) at default sliders
    await expect(page.locator('#pc-w1-flow')).toHaveText('100');
    await expect(page.locator('#pc-w1-head')).toHaveText('50.0');

    // Move pump-speed slider to 30 Hz and check the operating point shifts
    await page.locator('#pc-w1-hz-slider').evaluate((el) => {
        el.value = '30';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const flowAt30 = parseInt(await page.locator('#pc-w1-flow').textContent(), 10);
    // Design is 100 GPM @ 60 Hz; halving the speed lands ~50 GPM, so the
    // valid envelope is "dropped from 100 but didn't stall to 0".
    expect(flowAt30, 'flow should fall when pump speed drops').toBeGreaterThan(30);
    expect(flowAt30, 'flow should fall when pump speed drops').toBeLessThan(60);
    // Power follows cube law — at half speed, ~12.5% of full power
    const powerAt30 = parseInt(await page.locator('#pc-w1-power').textContent(), 10);
    expect(powerAt30).toBeGreaterThan(8);
    expect(powerAt30).toBeLessThan(20);

    // Widget 2 — fixed-DP at 50% demand should read higher pump Hz than reset-DP
    await page.locator('#pc-w2-demand-slider').evaluate((el) => {
        el.value = '50';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const fixedHz = parseInt(await page.locator('#pc-w2-hz').textContent(), 10);
    await page.click('#pc-w2-mode-reset');
    const resetHz = parseInt(await page.locator('#pc-w2-hz').textContent(), 10);
    expect(resetHz, 'reset DP should run pump slower than fixed DP at part load').toBeLessThan(fixedHz);

    // Anecdote reveal at demand = 0
    await page.locator('#pc-w2-demand-slider').evaluate((el) => {
        el.value = '0';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('.widget-anecdote')).toBeVisible();
    expect(errors, 'pump-control behavioral should log no page / console errors').toEqual([]);
});

test('equipment staging — staging widget stages up, rotation widget equalizes runtime', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/equipment-staging.html');

    // Pipe-flow schematic renders with its named pump groups.
    await expect(page.locator('main svg.edu-svg')).toHaveCount(1);
    await expect(page.locator('#es-fig-p1')).toHaveCount(1);

    // Widget 1 — one pump running at the light default demand.
    await expect(page.locator('#es-w1-running')).toHaveText('1');
    await expect(page.locator('.es-pump')).toHaveCount(3);

    // Push demand to design day; the sequence stages up to all three
    // pumps. Each change waits out its stage delay plus the minimum
    // stage time, so this takes several seconds — poll generously.
    await page.locator('#es-w1-demand-slider').evaluate((el) => {
        el.value = '95';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect.poll(
        async () => parseInt(await page.locator('#es-w1-running').textContent(), 10),
        { timeout: 20000, message: 'all three pumps should stage on at design demand' }
    ).toBe(3);
    await expect(page.locator('.es-pump[data-on="true"]')).toHaveCount(3);

    // Widget 2 — fixed lead piles all runtime onto Pump 1.
    const step = page.locator('#es-w2-step');
    for (let i = 0; i < 3; i++) await step.click();
    await expect(page.locator('#es-w2-weeks')).toHaveText('3');
    await expect(page.locator('.es-runtime').nth(0).locator('.h')).toHaveText('504');
    await expect(page.locator('.es-runtime').nth(1).locator('.h')).toHaveText('0');

    // Runtime-equalized hands the lead to the lowest-hour pump, and
    // stepping spreads the hours instead of concentrating them.
    await page.click('#es-w2-equal');
    await expect(page.locator('.es-runtime').nth(1)).toHaveAttribute('data-lead', 'true');
    await step.click();
    await expect(page.locator('.es-runtime').nth(1).locator('.h')).toHaveText('168');

    expect(errors, 'equipment-staging behavioral should log no page / console errors').toEqual([]);
});

test('vfds page renders its diagrams and the run/speed widget is wired up', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/vfds.html');

    // block diagram + bypass diagram are present
    const svgs = page.locator('main svg.vfd-svg');
    await expect(svgs).toHaveCount(2);
    // named equipment groups present (the block-diagram stages and the bypass topology)
    await expect(page.locator('#vfd-bd-rect')).toHaveCount(1);
    await expect(page.locator('#vfd-bd-inv')).toHaveCount(1);
    await expect(page.locator('#vfd-bp-drive')).toHaveCount(1);
    await expect(page.locator('#vfd-bp-motor')).toHaveCount(1);

    // widget initial state: terminals/network, DI open → STOPPED
    await expect(page.locator('#vfd-state')).toHaveText(/STOPPED/);

    // pressing the network RUN with run-source=terminals shows the classic-mistake anecdote
    await page.click('#vfd-try-classic');
    await page.click('#vfd-net-run');
    await expect(page.locator('#vfd-state')).toHaveText(/STOPPED/);
    await expect(page.locator('.widget-anecdote')).toBeVisible();

    // the all-network preset + a network RUN actually starts the drive
    await page.click('#vfd-try-network');
    await page.click('#vfd-net-run');
    await expect(page.locator('#vfd-state')).toHaveText(/RUNNING/);
    expect(errors, 'vfds behavioral should log no page / console errors').toEqual([]);
});

test('load piping — bypass widget protects pump from deadhead at zero demand', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/load-piping.html');

    // Widget mounts in the default OK state (demand=50, VFD, bypass off).
    await expect(page.locator('#lp-w')).toBeVisible();
    await expect(page.locator('#lp-w')).toHaveAttribute('data-state', 'ok');
    await expect(page.locator('#lp-w-anecdote')).toBeHidden();

    // Drag demand to zero with VFD + bypass off (the deadhead corner).
    // Pump-type / bypass buttons stay at their default 'on' positions;
    // click them anyway to exercise the segmented-group handlers and to
    // be explicit about the asserted scenario.
    await page.locator('#lp-w-demand-slider').evaluate((el) => {
        el.value = '0';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.click('#lp-w-pump-vfd');
    await page.click('#lp-w-bypass-off');
    await expect(page.locator('#lp-w')).toHaveAttribute('data-state', 'deadhead');
    await expect(page.locator('#lp-w-state-text')).toHaveText('DEADHEAD');
    await expect(page.locator('#lp-w-anecdote')).toBeVisible();

    // Flip the bypass on — state clears to OK and bypass flow lands at the
    // floor (25% of 60 GPM = 15 GPM in default US units).
    await page.click('#lp-w-bypass-on');
    await expect(page.locator('#lp-w')).toHaveAttribute('data-state', 'ok');
    await expect(page.locator('#lp-w-bypass-flow')).toHaveText('15');
    await expect(page.locator('#lp-w-sys-flow')).toHaveText('15');

    // Anecdote stays pinned once shown (balancing-style reward semantic).
    await expect(page.locator('#lp-w-anecdote')).toBeVisible();

    // The CS pump-type swap relabels the PUMP readout and bar to "Pump head".
    await page.click('#lp-w-pump-cs');
    await expect(page.locator('#lp-w-pump-readout-label')).toHaveText('Pump head');
    await expect(page.locator('#lp-w-bar-label')).toHaveText('Pump head');

    expect(errors, 'load-piping behavioural should log no page / console errors').toEqual([]);
});

test('balancing page renders riser, widget compares three branches, anecdote reveals at low Δp', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/balancing.html');

    // Riser is the main pipe-flow diagram (.edu-svg + flow-engine animated).
    // Per-valve symbol diagrams below are .bal-valve-fig wrappers, not edu-svg.
    await expect(page.locator('main svg.edu-svg')).toHaveCount(1);
    // Named equipment groups on the riser — four floor valves + the pump.
    await expect(page.locator('#bal-riser-pump')).toHaveCount(1);
    await expect(page.locator('#bal-riser-f1-valve')).toHaveCount(1);
    await expect(page.locator('#bal-riser-f4-valve')).toHaveCount(1);
    await expect(page.locator('#bal-riser-f4-coil')).toHaveCount(1);

    // Widget — initial state at design Δp (20 ft) puts all three branches at design flow.
    await expect(page.locator('#bal-cbv-q')).toHaveText('30.0');
    await expect(page.locator('#bal-abv-q')).toHaveText('30.0');
    await expect(page.locator('#bal-picv-q')).toHaveText('30.0');
    await expect(page.locator('#bal-bch-cbv')).toHaveAttribute('data-state', 'holding');
    await expect(page.locator('#bal-bch-abv')).toHaveAttribute('data-state', 'holding');
    await expect(page.locator('#bal-bch-picv')).toHaveAttribute('data-state', 'holding');

    // Drop Δp to 2 ft — CBV starves (~9.5 GPM, 32% of design), ABV falls into
    // orifice mode and also starves (~24.5 GPM, 82%), PICV holds at exactly
    // its minimum operating Δp (30 GPM, holding).
    await page.locator('#bal-dp-slider').evaluate((el) => {
        el.value = '2';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#bal-bch-cbv')).toHaveAttribute('data-state', 'starved');
    await expect(page.locator('#bal-bch-abv')).toHaveAttribute('data-state', 'starved');
    await expect(page.locator('#bal-bch-picv')).toHaveAttribute('data-state', 'holding');

    // BAS-flare LEDs — color matches state per branch.
    await expect(page.locator('#bal-bch-cbv  .bas-led')).toHaveClass(/fault/);
    await expect(page.locator('#bal-bch-picv .bas-led')).toHaveClass(/active/);

    // Anecdote reveal — Δp ≤ 4 ft triggers it; 2 is already past the threshold.
    await expect(page.locator('#bal-anecdote')).toBeVisible();

    // Push Δp to 60 ft — CBV blows past design (~52 GPM, 173%) and goes OVER;
    // ABV holds (its compensation range covers 3-50, then orifice above; at 60 ft
    // outside compensation ABV is at ~33 GPM / 110% which is still inside the
    // ±15% holding band). PICV holds.
    await page.locator('#bal-dp-slider').evaluate((el) => {
        el.value = '60';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#bal-bch-cbv')).toHaveAttribute('data-state', 'over');
    await expect(page.locator('#bal-bch-picv')).toHaveAttribute('data-state', 'holding');

    // BAS-flare LED on the OVER branch flips to .warn (orange).
    await expect(page.locator('#bal-bch-cbv .bas-led')).toHaveClass(/warn/);

    // Anecdote stays pinned once shown (extreme-state reward semantic).
    await expect(page.locator('#bal-anecdote')).toBeVisible();

    // Boundary check: at Δp = 3 ft, ABV is exactly at the low edge of its
    // compensation range and should hold cleanly at design (no off-by-one
    // into the orifice branch). CBV is still starved (~12 GPM / 39%).
    await page.locator('#bal-dp-slider').evaluate((el) => {
        el.value = '3';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#bal-bch-abv')).toHaveAttribute('data-state', 'holding');
    await expect(page.locator('#bal-abv-q')).toHaveText('30.0');
    await expect(page.locator('#bal-bch-cbv')).toHaveAttribute('data-state', 'starved');

    // Boundary check: at Δp = 50 ft, ABV is at the upper edge — still
    // holding (no off-by-one into the high-side orifice branch). CBV is
    // well into OVER territory by here.
    await page.locator('#bal-dp-slider').evaluate((el) => {
        el.value = '50';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#bal-bch-abv')).toHaveAttribute('data-state', 'holding');
    await expect(page.locator('#bal-abv-q')).toHaveText('30.0');
    await expect(page.locator('#bal-bch-cbv')).toHaveAttribute('data-state', 'over');
    expect(errors, 'balancing behavioral should log no page / console errors').toEqual([]);
});

test('psychrometrics basics — pool widget sweeps surface temp through dry / watch / condensing states', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/psychrometrics-basics.html');

    // Set a slider to a value and fire the `input` event the widget listens on
    // (syncFromSlider) — same idiom as the balancing test above.
    const setSlider = (id, value) => page.locator(id).evaluate((el, v) => {
        el.value = String(v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);

    // On load: defaults DB 82 °F / RH 60% / surface 50 °F. Dew point is
    // 66.8 °F, so the 50 °F surface sits 16.8 °F below it — condensing. The
    // anecdote stays absent: RH 60 is outside the natatorium regime (RH >= 65).
    await expect(page.locator('#pool-dp-val')).toHaveText('66.8');
    await expect(page.locator('#pool-margin-val')).toHaveText('-16.8');
    await expect(page.locator('#pool-status')).toHaveAttribute('data-state', 'bad');
    await expect(page.locator('#pool-readouts')).toHaveAttribute('data-state', 'bad');
    await expect(page.locator('#pool-status-lbl')).toHaveText('CONDENSATION ON GLASS');
    await expect(page.locator('#pool-anecdote-wrap .widget-anecdote')).toHaveCount(0);

    // Hold DB 82 / RH 60 (dew point fixed at 66.8 °F) and sweep only the
    // coldest-surface slider. Surface 80 °F clears dew point by 13.2 °F — dry.
    await setSlider('#pool-tsurf', 80);
    await expect(page.locator('#pool-dp-val')).toHaveText('66.8');  // surface temp doesn't move dew point
    await expect(page.locator('#pool-margin-val')).toHaveText('13.2');
    await expect(page.locator('#pool-status')).toHaveAttribute('data-state', 'ok');
    await expect(page.locator('#pool-status-lbl')).toHaveText('GLASS STAYS DRY');

    // Surface 70 °F — only 3.2 °F of margin, inside the 5 °F watch band.
    await setSlider('#pool-tsurf', 70);
    await expect(page.locator('#pool-margin-val')).toHaveText('3.2');
    await expect(page.locator('#pool-status')).toHaveAttribute('data-state', 'watch');
    await expect(page.locator('#pool-readouts')).toHaveAttribute('data-state', 'watch');
    await expect(page.locator('#pool-status-lbl')).toHaveText('WATCH THE GLASS');

    // Surface 65 °F — 1.8 °F below dew point, condensing again.
    await setSlider('#pool-tsurf', 65);
    await expect(page.locator('#pool-margin-val')).toHaveText('-1.8');
    await expect(page.locator('#pool-status')).toHaveAttribute('data-state', 'bad');
    await expect(page.locator('#pool-status-lbl')).toHaveText('CONDENSATION ON GLASS');

    // Natatorium regime — DB >= 80, RH >= 65, surface <= 55, condensing —
    // reveals the anecdote callout.
    await setSlider('#pool-rh', 90);
    await setSlider('#pool-tsurf', 50);
    await expect(page.locator('#pool-anecdote-wrap .widget-anecdote')).toHaveCount(1);

    // Leaving the regime (RH back to 60) removes it — not pinned, unlike the
    // balancing widget's anecdote.
    await setSlider('#pool-rh', 60);
    await expect(page.locator('#pool-anecdote-wrap .widget-anecdote')).toHaveCount(0);

    expect(errors, 'psychrometrics-basics behavioral should log no page / console errors').toEqual([]);
});

test('air handlers — sensor strip walks the path and the failure preset reveals the anecdote', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/air-handlers.html');

    // Structure: four annotated diagrams with accessible titles, the
    // section anchors the quiz learnMore links target, and the legend.
    await expect(page.locator('main svg.edu-svg')).toHaveCount(4);
    await expect(page.locator('main svg.edu-svg > title')).toHaveCount(4);
    for (const anchor of ['#air-path', '#mixing-box', '#filter-coils', '#supply-fan', '#sensor-strip']) {
        await expect(page.locator(`h2${anchor}`)).toBeVisible();
    }

    // Default state: design cooling day — MA = 0.2·95 + 0.8·75 = 79,
    // coil holds 55, fan adds 1 → DA 56.
    await expect(page.locator('#ah-w-ma-value')).toHaveText('79.0 °F');
    await expect(page.locator('#ah-w-da-value')).toHaveText('56.0 °F');
    await expect(page.locator('#ah-w-status')).toHaveText(/Cooling — coil holding/);
    await expect(page.locator('#ah-w-alert .widget-anecdote')).toHaveCount(0);

    // Winter morning at fixed minimum OA: MA = 0.2·10 + 0.8·75 = 62 —
    // the winter-safe-by-arithmetic point; no warning state.
    await page.locator('[data-ah-preset="winter"]').click();
    await expect(page.locator('#ah-w-ma-value')).toHaveText('62.0 °F');
    await expect(page.locator('#ah-w-status')).not.toHaveClass(/warn|fault/);

    // Damper failure preset: 100% OA at 10 °F → MA 10, freeze fault,
    // anecdote reveals and stays pinned after leaving the state.
    await page.locator('[data-ah-preset="fail"]').click();
    await expect(page.locator('#ah-w-ma-value')).toHaveText('10.0 °F');
    await expect(page.locator('#ah-w-frac')).toContainText('100');
    await expect(page.locator('#ah-w-status')).toHaveClass(/fault/);
    await expect(page.locator('#ah-w-alert .widget-anecdote')).toHaveCount(1);
    await page.locator('[data-ah-preset="design"]').click();
    await expect(page.locator('#ah-w-alert .widget-anecdote')).toHaveCount(1);

    // Coil-mode group keeps aria-pressed in sync.
    await page.locator('[data-ah-mode="off"]').click();
    await expect(page.locator('[data-ah-mode="off"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-ah-mode="cool"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#ah-w-status')).toHaveText(/Fan only/);

    expect(errors, 'air-handlers behavioral should log no page / console errors').toEqual([]);
});

test('economizers — changeover explorer splits the verdicts and reveals the anecdote in the wedge', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/economizers.html');

    // Structure: three annotated diagrams with accessible titles, one
    // flow-animated (D1 — the modulating damper assembly), and the
    // section anchors the quiz learnMore links target.
    await expect(page.locator('main svg.edu-svg')).toHaveCount(3);
    await expect(page.locator('main svg.edu-svg > title')).toHaveCount(3);
    await expect(page.locator('main svg.flow-active')).toHaveCount(1);
    for (const anchor of ['#damper-assembly', '#changeover', '#changeover-explorer', '#first-stage', '#field-failures']) {
        await expect(page.locator(`h2${anchor}`)).toBeVisible();
    }

    // Default state: dry spring morning (55 °F / 40 %) — both verdicts
    // agree on free cooling; return air pins near 28.1 Btu/lb and the
    // derived worst-case limit sits in the low 60s °F.
    await expect(page.locator('#eco-w-ra-h')).toContainText(/^28\.[0-2]/);
    await expect(page.locator('#eco-w-db-pill')).toHaveClass(/ok/);
    await expect(page.locator('#eco-w-h-pill')).toHaveClass(/ok/);
    await expect(page.locator('#eco-w-status')).toHaveText(/genuine free cooling/i);
    await expect(page.locator('#eco-w-limit-v')).toHaveText(/6[12]\.\d °F/);
    await expect(page.locator('#eco-w-alert .widget-anecdote')).toHaveCount(0);

    // Muggy morning (68 °F / 85 %): the deceptive wedge — dry-bulb says
    // economize, enthalpy says lock out, the anecdote reveals.
    await page.locator('[data-eco-preset="muggy"]').click();
    await expect(page.locator('#eco-w-db-pill')).toHaveClass(/ok/);
    await expect(page.locator('#eco-w-h-pill')).toHaveClass(/error/);
    await expect(page.locator('#eco-w-status')).toHaveClass(/warn/);
    await expect(page.locator('#eco-w-status')).toHaveText(/Deceptive air/);
    await expect(page.locator('#eco-w-alert .widget-anecdote')).toHaveCount(1);

    // High-desert evening (78 °F / 15 %): the mirror miss — dry-bulb
    // refuses, enthalpy approves; the anecdote stays pinned.
    await page.locator('[data-eco-preset="desert"]').click();
    await expect(page.locator('#eco-w-db-pill')).toHaveClass(/error/);
    await expect(page.locator('#eco-w-h-pill')).toHaveClass(/ok/);
    await expect(page.locator('#eco-w-status')).toHaveText(/Free cooling missed/);
    await expect(page.locator('#eco-w-alert .widget-anecdote')).toHaveCount(1);

    // Hot afternoon (88 °F / 40 %): both verdicts refuse.
    await page.locator('[data-eco-preset="hot"]').click();
    await expect(page.locator('#eco-w-db-pill')).toHaveClass(/error/);
    await expect(page.locator('#eco-w-h-pill')).toHaveClass(/error/);
    await expect(page.locator('#eco-w-status')).toHaveText(/mechanical cooling/i);

    expect(errors, 'economizers behavioral should log no page / console errors').toEqual([]);
});

test('building pressure — the ledger widget balances, pegs, and reveals the interlock anecdote', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/building-pressure.html');

    // Structure: three annotated diagrams with accessible titles, two
    // flow-animated (D1 ledger + D2 lineup; D3 staging chart is static),
    // and the section anchors the quiz learnMore links target.
    await expect(page.locator('main svg.edu-svg')).toHaveCount(3);
    await expect(page.locator('main svg.edu-svg > title')).toHaveCount(3);
    await expect(page.locator('main svg.flow-active')).toHaveCount(2);
    for (const anchor of ['#air-ledger', '#relief-lineup', '#power-exhaust', '#dampers-pressure', '#pressure-ledger', '#measuring-it']) {
        await expect(page.locator(`h2${anchor}`)).toBeVisible();
    }

    // Default state: minimum OA, restrooms only, staged power exhaust —
    // 2,000 CFM in, 800 out, 1,200 through the envelope, slightly
    // positive, no stages running.
    await expect(page.locator('#bp-w-in')).toHaveText('2,000 CFM');
    await expect(page.locator('#bp-w-ef')).toHaveText('800 CFM');
    await expect(page.locator('#bp-w-leak')).toHaveText('1,200 CFM out');
    await expect(page.locator('#bp-w-dp')).toContainText(/\+0\.02\d/);
    await expect(page.locator('#bp-w-status')).toHaveText(/Slightly positive/);
    await expect(page.locator('#bp-w-status')).toHaveText(/0 of 4 stages/);
    await expect(page.locator('#bp-w-stages .bp-w-stage.on')).toHaveCount(0);
    await expect(page.locator('#bp-w-alert .widget-anecdote')).toHaveCount(0);

    // Economizing with no relief path: the gauge pegs positive.
    await page.locator('[data-bp-preset="econ-open"]').click();
    await expect(page.locator('#bp-w-dp')).toContainText(/> \+0\.250/);
    await expect(page.locator('#bp-w-status')).toHaveClass(/fault/);
    await expect(page.locator('#bp-w-status')).toHaveText(/Strongly positive/);
    await expect(page.locator('#bp-w-stages')).toBeHidden();

    // Big hood at minimum OA on barometric relief: negative building,
    // blades shut — passive relief can't help.
    await page.locator('[data-bp-preset="hood"]').click();
    await expect(page.locator('#bp-w-status')).toHaveClass(/fault/);
    await expect(page.locator('#bp-w-status')).toHaveText(/Strongly negative/);
    await expect(page.locator('#bp-w-status')).toHaveText(/only relieve outward/);
    await expect(page.locator('#bp-w-alert .widget-anecdote')).toHaveCount(0);

    // The interlock mistake: all four stages follow the supply fan at
    // minimum OA, the building pegs negative, the anecdote reveals.
    await page.locator('[data-bp-preset="interlock"]').click();
    await expect(page.locator('#bp-w-dp')).toContainText(/< -0\.250/);
    await expect(page.locator('#bp-w-status')).toHaveClass(/fault/);
    await expect(page.locator('#bp-w-status')).toHaveText(/that’s the mistake/);
    await expect(page.locator('#bp-w-stages .bp-w-stage.on')).toHaveCount(4);
    await expect(page.locator('#bp-w-stages-lbl')).toHaveText(/interlocked to the supply fan/);
    await expect(page.locator('#bp-w-alert .widget-anecdote')).toHaveCount(1);

    // Back to the baseline: the anecdote stays pinned, the ledger heals.
    await page.locator('[data-bp-preset="baseline"]').click();
    await expect(page.locator('#bp-w-status')).toHaveText(/Slightly positive/);
    await expect(page.locator('#bp-w-alert .widget-anecdote')).toHaveCount(1);

    expect(errors, 'building-pressure behavioral should log no page / console errors').toEqual([]);
});

test('unit identification — the lineup walker narrows, grades mysteries, and reveals the anecdote', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/air-unit-identification.html');

    // Structure: three annotated diagrams with accessible titles, two
    // flow-animated (D1 three-questions + D2 fingerprints; D3 paper
    // trail is static), and the section anchors the quiz learnMore
    // links target.
    await expect(page.locator('main svg.edu-svg')).toHaveCount(3);
    await expect(page.locator('main svg.edu-svg > title')).toHaveCount(3);
    await expect(page.locator('main svg.flow-active')).toHaveCount(2);
    for (const anchor of ['#three-questions', '#the-lineup', '#paper-trail', '#paper-lies', '#name-the-box', '#same-stations']) {
        await expect(page.locator(`h2${anchor}`)).toBeVisible();
    }

    // Default state: nothing answered, five families alive, no call,
    // no scene, no anecdote.
    await expect(page.locator('.aid-w-card')).toHaveCount(5);
    await expect(page.locator('.aid-w-card.out')).toHaveCount(0);
    await expect(page.locator('#aid-w-call')).toHaveText('—');
    await expect(page.locator('#aid-w-status')).toHaveText(/Five families standing/);
    await expect(page.locator('#aid-w-scene-liar')).toBeHidden();
    await expect(page.locator('#aid-w-alert .widget-anecdote')).toHaveCount(0);

    // The strongest single answer: 100% OA identifies the MAU alone,
    // and the answer group keeps aria-pressed in sync.
    await page.locator('[data-aid-air="oa"]').click();
    await expect(page.locator('[data-aid-air="oa"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-aid-air="mix"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.aid-w-card.out')).toHaveCount(4);
    await expect(page.locator('#aid-w-card-mau')).toHaveClass(/hit/);
    await expect(page.locator('#aid-w-call')).toHaveText(/MAU/);

    // A combination nothing matches: the field says look again.
    await page.locator('[data-aid-sit="space"]').click();
    await expect(page.locator('.aid-w-card.out')).toHaveCount(5);
    await expect(page.locator('#aid-w-status')).toHaveClass(/warn/);
    await expect(page.locator('#aid-w-status')).toHaveText(/Nothing matches/);

    // A mystery clears the answers, shows its scene, and confirms a
    // correct walk from the clues.
    await page.locator('[data-aid-mystery="curb"]').click();
    await expect(page.locator('#aid-w-scene-curb')).toBeVisible();
    await expect(page.locator('.aid-w-card.out')).toHaveCount(0);
    await page.locator('[data-aid-sit="roof"]').click();
    await page.locator('[data-aid-cab="all"]').click();
    await page.locator('[data-aid-air="mix"]').click();
    await expect(page.locator('#aid-w-call')).toHaveText(/RTU/);
    await expect(page.locator('#aid-w-status')).toHaveText(/Confirmed/);
    await expect(page.locator('#aid-w-alert .widget-anecdote')).toHaveCount(0);

    // A wrong walk gets pointed back at the clues, at the question
    // that contradicts them.
    await page.locator('[data-aid-cab="piped"]').click();
    await expect(page.locator('#aid-w-call')).toHaveText(/AHU/);
    await expect(page.locator('#aid-w-status')).toHaveClass(/warn/);
    await expect(page.locator('#aid-w-status')).toHaveText(/Re-read the scene/);

    // The last mystery: the paperwork lies, the cabinet doesn't —
    // solving it reveals the anecdote.
    await page.locator('[data-aid-mystery="liar"]').click();
    await expect(page.locator('#aid-w-scene-liar')).toBeVisible();
    await expect(page.locator('#aid-w-scene-curb')).toBeHidden();
    await page.locator('[data-aid-sit="space"]').click();
    await page.locator('[data-aid-cab="fan"]').click();
    await page.locator('[data-aid-air="room"]').click();
    await expect(page.locator('#aid-w-call')).toHaveText(/FCU/);
    await expect(page.locator('#aid-w-status')).toHaveText(/Confirmed/);
    await expect(page.locator('#aid-w-alert .widget-anecdote')).toHaveCount(1);

    // Fresh walk: answers clear, the anecdote stays pinned.
    await page.locator('[data-aid-mystery="fresh"]').click();
    await expect(page.locator('.aid-w-card.out')).toHaveCount(0);
    await expect(page.locator('#aid-w-status')).toHaveText(/Five families standing/);
    await expect(page.locator('#aid-w-alert .widget-anecdote')).toHaveCount(1);

    expect(errors, 'unit-identification behavioral should log no page / console errors').toEqual([]);
});

test('vav systems — the box walker holds flow, the interlock protects the coil, the starved preset reveals the anecdote', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/vav-systems.html');

    // Structure: three annotated diagrams with accessible titles, two
    // flow-animated (D1 system + D2 box cutaway; D3 cascade is static),
    // and the section anchors the quiz learnMore links target.
    await expect(page.locator('main svg.edu-svg')).toHaveCount(3);
    await expect(page.locator('main svg.edu-svg > title')).toHaveCount(3);
    await expect(page.locator('main svg.flow-active')).toHaveCount(2);
    for (const anchor of ['#one-to-thirty', '#box-anatomy', '#pressure-independence', '#minimums', '#the-coil-floor', '#drive-the-box', '#loads-throttle']) {
        await expect(page.locator(`h2${anchor}`)).toBeVisible();
    }

    // Default state: mild zone on a mixed day, interlock on — box
    // tracking, one stage running, coil fine, no anecdote.
    await expect(page.locator('#vav-w-flow')).toHaveText('400 CFM');
    await expect(page.locator('#vav-w-vp')).toHaveText('0.16 in. w.c.');
    await expect(page.locator('#vav-w-stages')).toHaveText('1 of 2');
    await expect(page.locator('#vav-w-coil')).toHaveText(/OK/);
    await expect(page.locator('#vav-w-status')).toHaveText(/tracking its zone/);
    await expect(page.locator('#vav-w-alert .widget-anecdote')).toHaveCount(0);

    // Pressure independence: the siblings change, the damper moves,
    // the flow doesn't — and the answer group keeps aria-pressed in
    // sync. With the building nearly satisfied, total flow drops below
    // the stage floor and the interlock sheds the stage.
    const damperBefore = await page.locator('#vav-w-damper').textContent();
    await page.locator('[data-vav-sib="satisfied"]').click();
    await expect(page.locator('[data-vav-sib="satisfied"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-vav-sib="mixed"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#vav-w-flow')).toHaveText('400 CFM');
    await expect(page.locator('#vav-w-damper')).not.toHaveText(damperBefore);
    await expect(page.locator('#vav-w-stages')).toHaveText('0 of 2 — held');
    await expect(page.locator('#vav-w-coil')).toHaveText('protected');
    await expect(page.locator('#vav-w-status')).toHaveClass(/warn/);
    await expect(page.locator('#vav-w-status')).toHaveText(/interlock holds/i);

    // An overcooled zone rides its minimum and reheats (back on the
    // mixed day, so the interlock hold doesn't outrank the story).
    await page.locator('[data-vav-sib="mixed"]').click();
    await page.locator('#vav-w-zone-slider').fill('66');
    await expect(page.locator('#vav-w-flow')).toHaveText('200 CFM');
    await expect(page.locator('#vav-w-reheat')).toHaveText(/100 % open/);
    await expect(page.locator('#vav-w-status')).toHaveText(/reheat carrying the room/i);

    // Design afternoon: everything wide open, both stages, coil happy.
    await page.locator('[data-vav-preset="design"]').click();
    await expect(page.locator('#vav-w-flow')).toHaveText('1,000 CFM');
    await expect(page.locator('#vav-w-total')).toHaveText('30,000 CFM');
    await expect(page.locator('#vav-w-stages')).toHaveText('2 of 2');
    await expect(page.locator('#vav-w-coil')).toHaveText(/OK/);

    // The starved coil: boxes at minimum, no interlock, a stage still
    // running — fault state, and the anecdote reveals.
    await page.locator('[data-vav-preset="starved"]').click();
    await expect(page.locator('#vav-w-stages')).toHaveText('1 of 2');
    await expect(page.locator('#vav-w-coil')).toHaveText(/starving/);
    await expect(page.locator('#vav-w-status')).toHaveClass(/fault/);
    await expect(page.locator('#vav-w-status')).toHaveText(/coil icing/);
    await expect(page.locator('#vav-w-alert .widget-anecdote')).toHaveCount(1);

    // Back to a healthy preset: the fault clears, the anecdote stays
    // pinned.
    await page.locator('[data-vav-preset="design"]').click();
    await expect(page.locator('#vav-w-status')).not.toHaveClass(/fault/);
    await expect(page.locator('#vav-w-alert .widget-anecdote')).toHaveCount(1);

    expect(errors, 'vav-systems behavioral should log no page / console errors').toEqual([]);
});

test('duct static control — the loop holds static while flow moves, the iced coil hides in plain sight, the old fix rails the sensor', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/duct-static-control.html');

    // Structure: three annotated diagrams with accessible titles, two
    // flow-animated (D1 loop + D3 rivers; D2 profile is static), and
    // the section anchors the quiz learnMore links target.
    await expect(page.locator('main svg.edu-svg')).toHaveCount(3);
    await expect(page.locator('main svg.edu-svg > title')).toHaveCount(3);
    await expect(page.locator('main svg.flow-active')).toHaveCount(2);
    for (const anchor of ['#the-signal', '#the-loop', '#reset', '#static-is-not-flow', '#safeties', '#drive-the-loop', '#the-whole-path']) {
        await expect(page.locator(`h2${anchor}`)).toBeVisible();
    }

    // Default state: 12 of 30 calling, fixed setpoint, clean coil,
    // the loop in charge — static on setpoint, no anecdote.
    await expect(page.locator('#ds-w-static')).toHaveText('1.50 in. w.c.');
    await expect(page.locator('#ds-w-sp')).toHaveText('1.50 in. w.c.');
    await expect(page.locator('#ds-w-hz')).toHaveText('42.2 Hz');
    await expect(page.locator('#ds-w-flow')).toHaveText('16,560 CFM');
    await expect(page.locator('#ds-w-status')).toHaveText(/thirty demands/i);
    await expect(page.locator('#ds-w-alert .widget-anecdote')).toHaveCount(0);

    // The mirror invariant: flip the setpoint to reset — static and
    // fan speed move, flow doesn't (the boxes own it) — and the
    // answer group keeps aria-pressed in sync.
    await page.locator('[data-ds-sp="reset"]').click();
    await expect(page.locator('[data-ds-sp="reset"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-ds-sp="fixed"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#ds-w-static')).toHaveText('0.60 in. w.c.');
    await expect(page.locator('#ds-w-flow')).toHaveText('16,560 CFM');
    await expect(page.locator('#ds-w-status')).toHaveText(/cube law/i);

    // Six o'clock: the last page's cliff-hanger, answered — the
    // building empties and the fan backs off while static holds.
    await page.locator('[data-ds-preset="six-oclock"]').click();
    await expect(page.locator('#ds-w-static')).toHaveText('1.50 in. w.c.');
    await expect(page.locator('#ds-w-hz')).toHaveText('33.9 Hz');
    await expect(page.locator('#ds-w-flow')).toHaveText('7,600 CFM');

    // The hidden restriction: iced coil, same flow, same static, more
    // speed — warn, with the honest Hz-at-flow number in the strip.
    await page.locator('[data-ds-preset="restriction"]').click();
    await expect(page.locator('#ds-w-static')).toHaveText('1.50 in. w.c.');
    await expect(page.locator('#ds-w-hz')).toHaveText('57.9 Hz');
    await expect(page.locator('#ds-w-clean')).toHaveText('43.9 Hz');
    await expect(page.locator('#ds-w-status')).toHaveClass(/warn/);
    await expect(page.locator('#ds-w-status')).toHaveText(/hiding a restriction/i);

    // The old fix: fan pinned against pressure-independent boxes —
    // flow doesn't move, the sensor rails at full scale, fault, and
    // the anecdote reveals.
    await page.locator('[data-ds-preset="old-fix"]').click();
    await expect(page.locator('#ds-w-static')).toHaveText('2.50 in. w.c. — railed');
    await expect(page.locator('#ds-w-sp')).toHaveText('overridden');
    await expect(page.locator('#ds-w-hz')).toHaveText('60.0 Hz');
    await expect(page.locator('#ds-w-flow')).toHaveText('7,600 CFM');
    await expect(page.locator('#ds-w-status')).toHaveClass(/fault/);
    await expect(page.locator('#ds-w-status')).toHaveText(/railed/i);
    await expect(page.locator('#ds-w-alert .widget-anecdote')).toHaveCount(1);

    // Back to a healthy preset: the fault clears, the anecdote stays
    // pinned.
    await page.locator('[data-ds-preset="design"]').click();
    await expect(page.locator('#ds-w-hz')).toHaveText('60.0 Hz');
    await expect(page.locator('#ds-w-status')).not.toHaveClass(/fault/);
    await expect(page.locator('#ds-w-alert .widget-anecdote')).toHaveCount(1);

    expect(errors, 'duct-static-control behavioral should log no page / console errors').toEqual([]);
});

test.describe('function-block editor — interactions', () => {
    test('Delete key removes a selected block', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto('/simulators/function-block-editor.html');
        await page.click('#fbe-clear');
        await page.locator('.fbe-palette-btn', { hasText: 'CONSTANT' }).click();
        // newly-added block is auto-selected; Delete (the keyboard path,
        // not the inspector button) removes it.
        await expect(page.locator('.fbe-block')).toHaveCount(1);
        await page.keyboard.press('Delete');
        await expect(page.locator('.fbe-block')).toHaveCount(0);
        expect(errors, 'Delete-key behavioral should log no errors').toEqual([]);
    });

    test('Backspace also deletes a selection', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto('/simulators/function-block-editor.html');
        await page.click('#fbe-clear');
        await page.locator('.fbe-palette-btn', { hasText: 'CONSTANT' }).click();
        await page.keyboard.press('Backspace');
        await expect(page.locator('.fbe-block')).toHaveCount(0);
        expect(errors, 'Backspace behavioral should log no errors').toEqual([]);
    });

    test('Escape cancels a pending wire', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto('/simulators/function-block-editor.html');
        await page.click('#fbe-clear');
        await page.locator('.fbe-palette-btn', { hasText: 'CONSTANT' }).click();
        await page.locator('.fbe-palette-btn', { hasText: 'READOUT' }).click();
        await page.locator('.fbe-block[data-id="b1"] .fbe-pin-out').click();
        // Pending wire — compatible input pins light up as targets.
        await expect(page.locator('.fbe-pin-target')).toHaveCount(1);
        await page.keyboard.press('Escape');
        await expect(page.locator('.fbe-pin-target')).toHaveCount(0);
        await expect(page.locator('.fbe-wire')).toHaveCount(0);
        expect(errors, 'Escape behavioral should log no errors').toEqual([]);
    });

    test('type-mismatch on wire creation leaves no connection', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto('/simulators/function-block-editor.html');
        await page.click('#fbe-clear');
        // BINARY IN emits a bool; READOUT consumes a number — incompatible.
        await page.locator('.fbe-palette-btn', { hasText: 'BINARY IN' }).click();
        await page.locator('.fbe-palette-btn', { hasText: 'READOUT' }).click();
        await page.locator('.fbe-block[data-id="b1"] .fbe-pin-out').click();
        await page.locator('.fbe-block[data-id="b2"] .fbe-pin-in').click();
        await expect(page.locator('.fbe-wire')).toHaveCount(0);
        await expect(page.locator('#fbe-status')).toContainText('Type mismatch');
        expect(errors, 'type-mismatch behavioral should log no errors').toEqual([]);
    });

    test('self-loop on a single block is rejected', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto('/simulators/function-block-editor.html');
        await page.click('#fbe-clear');
        await page.locator('.fbe-palette-btn', { hasText: 'AND' }).click();
        await page.locator('.fbe-block[data-id="b1"] .fbe-pin-out').click();
        await page.locator('.fbe-block[data-id="b1"] .fbe-pin-in').first().click();
        await expect(page.locator('.fbe-wire')).toHaveCount(0);
        await expect(page.locator('#fbe-status')).toContainText('wire to itself');
        expect(errors, 'self-loop behavioral should log no errors').toEqual([]);
    });

    test('pause / run / step toggles the sim status', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto('/simulators/function-block-editor.html');
        // economizer example loads and runs by default.
        await expect(page.locator('#fbe-run')).toHaveText('Pause');
        await expect(page.locator('#fbe-status')).toHaveText('Running');
        await page.click('#fbe-run');
        await expect(page.locator('#fbe-run')).toHaveText('Run');
        await expect(page.locator('#fbe-status')).toHaveText('Paused');
        // Step keeps the sim paused and advances one tick — no exception.
        await page.click('#fbe-step');
        await expect(page.locator('#fbe-run')).toHaveText('Run');
        // Resume — Run label flips back to Pause, status back to Running.
        await page.click('#fbe-run');
        await expect(page.locator('#fbe-run')).toHaveText('Pause');
        await expect(page.locator('#fbe-status')).toHaveText('Running');
        expect(errors, 'sim-bar behavioral should log no errors').toEqual([]);
    });

    test('non-AI inspector edit flows to the output — PID gain to zero zeros the readout', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto('/simulators/function-block-editor.html');
        await page.click('[data-example="pid"]');
        // PID example: sp=72, pv=70, kc=4 — output is non-zero on every
        // tick. Zero the gain via the inspector and the readout collapses.
        await page.locator('.fbe-block[data-id="ctl"] .fbe-block-head').click();
        await page.fill('#fbe-p-kc', '0');
        await expect(page.locator('.fbe-block[data-id="rd"] .fbe-block-val')).toHaveText('0');
        await expect(page.locator('.fbe-block[data-id="out"] .fbe-block-val')).toHaveText('0');
        expect(errors, 'PID-gain behavioral should log no errors').toEqual([]);
    });

    test('mid-wire then delete the source block leaves no ghost wire', async ({ page }) => {
        // Regression test for the BUG-2 fix on fix/fbe-mid-wire-and-prose —
        // deleteSelected() must clear `pending` so a subsequent input-pin
        // click can't form a wire whose source block no longer exists.
        const errors = watchErrors(page);
        await page.goto('/simulators/function-block-editor.html');
        await page.click('#fbe-clear');
        await page.locator('.fbe-palette-btn', { hasText: 'CONSTANT' }).click();
        await page.locator('.fbe-palette-btn', { hasText: 'READOUT' }).click();
        // Start a wire from the CONSTANT output pin.
        await page.locator('.fbe-block[data-id="b1"] .fbe-pin-out').click();
        await expect(page.locator('.fbe-pin-target')).toHaveCount(1);
        // Select the CONSTANT block (the wire's source) and Delete it via
        // the keyboard path — this is where the cancelWire() fix lives.
        await page.locator('.fbe-block[data-id="b1"] .fbe-block-head').click();
        await page.keyboard.press('Delete');
        // Now click the READOUT input pin. Without the fix, a ghost wire
        // would form with a dangling `from` reference.
        await page.locator('.fbe-block[data-id="b2"] .fbe-pin-in').click();
        await expect(page.locator('.fbe-wire')).toHaveCount(0);
        await expect(page.locator('.fbe-pin-target')).toHaveCount(0);
        expect(errors, 'mid-wire-delete behavioral should log no errors').toEqual([]);
    });
});

test('practice landing — Modbus chip collapses sections + filters cards', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/practice/');

    // [All] active on a fresh visit; both sections render with their headings.
    await expect(page.locator('.filter-chip[data-category="all"]')).toHaveClass(/active/);
    await expect(page.locator('.practice-section[data-section="content"] .practice-section-heading')).toBeVisible();
    await expect(page.locator('.practice-section[data-section="field"]   .practice-section-heading')).toBeVisible();
    // Content-quiz cards (two Modbus, three BACnet) and the field drills all
    // visible under [All].
    await expect(page.locator('.nav-card[data-category="modbus"]:not([hidden])')).toHaveCount(2);
    await expect(page.locator('.nav-card[data-category="bacnet"]:not([hidden])')).toHaveCount(3);
    await expect(page.locator('.nav-card[data-category="field"]:not([hidden])')).toHaveCount(5);

    // Click Modbus chip → section headings collapse; non-Modbus cards hide;
    // both Modbus cards stay visible; URL hash updates.
    await page.click('.filter-chip[data-category="modbus"]');
    await expect(page.locator('.filter-chip[data-category="modbus"]')).toHaveClass(/active/);
    await expect(page.locator('.filter-chip[data-category="all"]')).not.toHaveClass(/active/);
    await expect(page.locator('.practice-section[data-section="content"]')).toHaveClass(/filtered/);
    await expect(page.locator('.practice-section[data-section="field"]')).toHaveClass(/filtered/);
    await expect(page.locator('.nav-card[data-category="modbus"]:not([hidden])')).toHaveCount(2);
    await expect(page.locator('.nav-card[data-category="bacnet"]:not([hidden])')).toHaveCount(0);
    await expect(page.locator('.nav-card[data-category="field"]:not([hidden])')).toHaveCount(0);
    expect(new URL(page.url()).hash).toBe('#modbus');

    // Click [All] → restored: cards visible again, sections un-filtered.
    await page.click('.filter-chip[data-category="all"]');
    await expect(page.locator('.practice-section[data-section="content"]')).not.toHaveClass(/filtered/);
    await expect(page.locator('.nav-card[data-category="field"]:not([hidden])')).toHaveCount(5);
    expect(new URL(page.url()).hash).toBe('');

    expect(errors, 'practice-landing behavioral should log no errors').toEqual([]);
});

// Drift guard for audit-2026-06 #21: the Content Quizzes grid is
// hand-ordered in practice/index.html but the canonical curriculum
// sequence lives in html/_data/quizOrder.js (which also drives every
// results-card next-link at build time). If someone adds a quiz card
// without re-ordering — or reorders one source but not the other —
// this catches it.
test('practice landing — Content Quizzes grid matches quizOrder.js', async ({ page }) => {
    const quizOrder = require('../html/_data/quizOrder.js');
    await page.goto('/practice/');
    const hrefs = await page
        .locator('.practice-section[data-section="content"] .nav-card')
        .evaluateAll(cards => cards.map(c => c.getAttribute('href')));
    expect(hrefs).toEqual(quizOrder.map(e => '/practice/' + e.slug + '.html'));
});

// Audit-2026-06 #22: the landing paints a best-score badge on each
// card whose quiz has a recorded best in localStorage. Seed two slugs
// before load — one partial, one perfect — and check the paint.
test('practice landing — best-score badges paint from localStorage', async ({ page }) => {
    const errors = watchErrors(page);
    await page.addInitScript(() => {
        localStorage.setItem('cf_quiz_pid-basics_best', '8');
        localStorage.setItem('cf_quiz_pid-basics_best_total', '10');
        localStorage.setItem('cf_quiz_vfds_best', '5');
        localStorage.setItem('cf_quiz_vfds_best_total', '5');
        // Garbage values must not paint.
        localStorage.setItem('cf_quiz_balancing_best', 'NaN');
    });
    await page.goto('/practice/');

    const pidBadge = page.locator('.nav-card[href="/practice/pid-basics.html"] .quiz-best-pill');
    await expect(pidBadge).toHaveText('Best 8/10');
    await expect(pidBadge).not.toHaveClass(/perfect/);

    const vfdBadge = page.locator('.nav-card[href="/practice/vfds.html"] .quiz-best-pill');
    await expect(vfdBadge).toHaveText('Best 5/5');
    await expect(vfdBadge).toHaveClass(/perfect/);

    await expect(page.locator('.nav-card[href="/practice/balancing.html"] .quiz-best-pill')).toHaveCount(0);
    expect(errors, 'badge paint should log no errors').toEqual([]);
});

test.describe('practice — modbus decoding quiz', () => {
    // Quiz state lives in localStorage under cf_quiz_modbus-decoding_*,
    // but no cleanup is needed: contexts are per-test, so every test
    // (and the page-load smoke assertion above) starts from a clean
    // "Best: —" baseline regardless (audit-2026-06 isolation probe).

    test('answers one correct + one wrong, completes 5 questions, persists best to localStorage', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto('/practice/modbus-decoding.html');

        // Engine mounts: settings row + first question's choices.
        await expect(page.locator('.quiz-settings')).toBeVisible();
        await expect(page.locator('.quiz-best-readout')).toHaveText('Best: —');

        // Shrink to a 5-question run so the test stays fast. Changing the
        // count mid-mount surfaces the dirty notice + a "Restart now"
        // button; click it to apply.
        await page.selectOption('#quiz-modbus-decoding-count', '5');
        await expect(page.locator('.quiz-dirty-notice')).toBeVisible();
        await page.locator('.quiz-restart-now').click();
        await expect(page.locator('.quiz-dirty-notice')).toBeHidden();
        await expect(page.locator('.quiz-progress-text')).toHaveText('Question 1 of 5');

        // Q1: pick the correct choice (the [data-correct="true"] one),
        // submit, and expect the reveal panel to flip to --correct.
        await page.locator('.quiz-choice[data-correct="true"]').click();
        await page.locator('.quiz-action-primary').click();
        await expect(page.locator('.quiz-reveal')).toHaveClass(/quiz-reveal--correct/);
        await expect(page.locator('.quiz-reveal-status')).toHaveText('Correct.');

        // Q2: pick the WRONG choice on purpose (a non-correct .quiz-choice)
        // so the reveal flips to --incorrect and a "Right answer:" line
        // renders.
        await page.locator('.quiz-action-primary').click();   // "Next question →"
        await expect(page.locator('.quiz-progress-text')).toHaveText('Question 2 of 5');
        await page.locator('.quiz-choice[data-correct="false"]').first().click();
        await page.locator('.quiz-action-primary').click();
        await expect(page.locator('.quiz-reveal')).toHaveClass(/quiz-reveal--incorrect/);
        await expect(page.locator('.quiz-reveal-status')).toHaveText('Not quite.');
        await expect(page.locator('.quiz-reveal-right')).toBeVisible();

        // Q3, Q4, Q5: pick the correct choice each time and advance. In
        // the default sequential order the bank's first five questions
        // are mcq/tf/gotcha only — the two numeric questions sit at
        // positions 7–8 and are exercised by the full-run test below.
        for (let i = 3; i <= 5; i++) {
            await page.locator('.quiz-action-primary').click();
            await expect(page.locator('.quiz-progress-text')).toHaveText('Question ' + i + ' of 5');
            await page.locator('.quiz-choice[data-correct="true"]').click();
            await page.locator('.quiz-action-primary').click();
        }

        // Final action: "See results →" — results card appears, question
        // card hides.
        await page.locator('.quiz-action-primary').click();
        await expect(page.locator('.quiz-results')).toBeVisible();
        await expect(page.locator('.quiz-results-headline')).toHaveText('4 / 5 correct');
        await expect(page.locator('.quiz-results-newbest')).toBeVisible();

        // The results card offers the onward path — the next quiz in
        // curriculum order (quizOrder.js: modbus-decoding → BACnet Basics).
        const nextLink = page.locator('.quiz-next-link');
        await expect(nextLink).toHaveText('Next quiz: BACnet Basics →');
        await expect(nextLink).toHaveAttribute('href', '/practice/bacnet-basics.html');

        // localStorage carries the run.
        const best = await page.evaluate(() => localStorage.getItem('cf_quiz_modbus-decoding_best'));
        const bestTotal = await page.evaluate(() => localStorage.getItem('cf_quiz_modbus-decoding_best_total'));
        const attempts = await page.evaluate(() => localStorage.getItem('cf_quiz_modbus-decoding_attempts'));
        expect(best).toBe('4');
        expect(bestTotal).toBe('5');
        expect(attempts).toBe('1');

        // Reload: the "Best:" readout reads from storage.
        await page.reload({ waitUntil: 'load' });
        await expect(page.locator('.quiz-best-readout')).toContainText('Best: 4 / 5');

        // Reset best is a two-step confirm (P-007): the first click only arms
        // the button — it must NOT wipe the record — and the second commits.
        const resetBtn = page.locator('.quiz-reset-best');
        await resetBtn.click();
        await expect(resetBtn).toHaveText('Confirm reset?');
        await expect(page.locator('.quiz-best-readout')).toContainText('Best: 4 / 5');
        expect(await page.evaluate(() => localStorage.getItem('cf_quiz_modbus-decoding_best'))).toBe('4');
        // Second click commits: keys cleared + readout repaints to "Best: —".
        await resetBtn.click();
        await expect(page.locator('.quiz-best-readout')).toHaveText('Best: —');
        expect(await page.evaluate(() => localStorage.getItem('cf_quiz_modbus-decoding_best'))).toBeNull();

        expect(errors, 'modbus-decoding quiz behavioral should log no errors').toEqual([]);
    });

    // Regression for audit-2026-06 #19: reveal() disables the numeric
    // input and tints it, and showQuestion() must undo both. Pre-fix,
    // the bank's back-to-back numerics (Q7 → Q8 in sequential order)
    // left Q8 unanswerable, and a results-card Restart carried the
    // disabled input into the fresh run. A default 10-question
    // sequential run reaches both numerics for free.
    test('numeric input stays answerable across consecutive numerics and a restart', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto('/practice/modbus-decoding.html');
        await expect(page.locator('.quiz-progress-text')).toHaveText('Question 1 of 10');

        let numericsSeen = 0;
        for (let i = 1; i <= 10; i++) {
            if (i > 1) {
                await page.locator('.quiz-action-primary').click();   // "Next question →"
            }
            await expect(page.locator('.quiz-progress-text')).toHaveText('Question ' + i + ' of 10');
            const isNumeric = await page.locator('.quiz-numeric:not([hidden])').count() > 0;
            if (isNumeric) {
                numericsSeen++;
                // The load-bearing assertion: on arrival the input is
                // enabled and untinted even right after a submitted
                // numeric (pre-fix this fails at Q8).
                await expect(page.locator('.quiz-numeric-input')).toBeEnabled();
                await expect(page.locator('.quiz-numeric')).not.toHaveClass(/correct|wrong/);
                // The numeric answers are 52.3 and 202.4 within ±0.05;
                // type the right one for whichever question this is.
                const promptText = await page.locator('.quiz-prompt').textContent();
                const value = /523/.test(promptText) ? '52.3' : '202.4';
                await page.locator('.quiz-numeric-input').fill(value);
            } else {
                await page.locator('.quiz-choice[data-correct="true"]').click();
            }
            await page.locator('.quiz-action-primary').click();       // Submit
            await expect(page.locator('.quiz-reveal')).toHaveClass(/quiz-reveal--correct/);
        }
        expect(numericsSeen, 'the sequential run should hit both numeric questions').toBe(2);

        await page.locator('.quiz-action-primary').click();           // "See results →"
        await expect(page.locator('.quiz-results')).toBeVisible();
        await expect(page.locator('.quiz-results-headline')).toHaveText('10 / 10 correct');

        // Restart: showQuestion() must hand the fresh run a reset
        // numeric widget (hidden on Q1, but already re-enabled).
        await page.locator('.quiz-restart-btn').click();
        await expect(page.locator('.quiz-progress-text')).toHaveText('Question 1 of 10');
        await expect(page.locator('.quiz-numeric-input')).toBeEnabled();

        expect(errors, 'numeric-run behavioral should log no errors').toEqual([]);
    });

    // codebase-issues #89: a perfect short run must NOT displace a
    // longer best — pre-fix, a 5/5 overwrote a 10/10 and celebrated
    // "new best".
    test('a perfect 5-question run cannot replace a 10-question best', async ({ page }) => {
        const errors = watchErrors(page);
        await page.addInitScript(() => {
            localStorage.setItem('cf_quiz_modbus-decoding_best', '10');
            localStorage.setItem('cf_quiz_modbus-decoding_best_total', '10');
            localStorage.setItem('cf_quiz_modbus-decoding_best_time_ms', '90000');
        });
        await page.goto('/practice/modbus-decoding.html');
        await expect(page.locator('.quiz-best-readout')).toContainText('Best: 10 / 10');

        await page.selectOption('#quiz-modbus-decoding-count', '5');
        await page.locator('.quiz-restart-now').click();
        for (let i = 1; i <= 5; i++) {
            await expect(page.locator('.quiz-progress-text')).toHaveText('Question ' + i + ' of 5');
            await page.locator('.quiz-choice[data-correct="true"]').click();
            await page.locator('.quiz-action-primary').click();      // Submit
            await page.locator('.quiz-action-primary').click();      // Next / See results
        }
        await expect(page.locator('.quiz-results')).toBeVisible();
        await expect(page.locator('.quiz-results-headline')).toHaveText('5 / 5 correct');
        // No "new best" celebration and the record is untouched — but a perfect
        // short run still earns the run-length-independent 'flawless' nod (P-006).
        await expect(page.locator('.quiz-results-newbest')).toHaveCount(0);
        await expect(page.locator('.quiz-results-flawless')).toContainText('flawless');
        expect(await page.evaluate(() => localStorage.getItem('cf_quiz_modbus-decoding_best'))).toBe('10');
        expect(await page.evaluate(() => localStorage.getItem('cf_quiz_modbus-decoding_best_total'))).toBe('10');
        await expect(page.locator('.quiz-best-readout')).toContainText('Best: 10 / 10');

        expect(errors, 'short-run guard should log no errors').toEqual([]);
    });

    test('a first all-skipped run is not celebrated or stored as a best (#114)', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto('/practice/modbus-decoding.html');
        await expect(page.locator('.quiz-best-readout')).toHaveText('Best: —');
        await page.selectOption('#quiz-modbus-decoding-count', '5');
        await page.locator('.quiz-restart-now').click();
        for (let i = 1; i <= 5; i++) {
            await expect(page.locator('.quiz-progress-text')).toHaveText('Question ' + i + ' of 5');
            await page.locator('.quiz-action-secondary').click();    // Skip → scores incorrect
            await page.locator('.quiz-action-primary').click();      // Next / See results
        }
        await expect(page.locator('.quiz-results-headline')).toHaveText('0 / 5 correct');
        // The 0-score first run must NOT be announced or persisted as a best.
        await expect(page.locator('.quiz-results-newbest')).toHaveCount(0);
        expect(await page.evaluate(() => localStorage.getItem('cf_quiz_modbus-decoding_best'))).toBeNull();
        expect(errors, 'first-zero run should log no errors').toEqual([]);
    });

    test('Skip reveals "Skipped." and the question lands in the miss-list (#124)', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto('/practice/modbus-decoding.html');
        await page.selectOption('#quiz-modbus-decoding-count', '5');
        await page.locator('.quiz-restart-now').click();
        // Skip Q1 → "Skipped." reveal.
        await page.locator('.quiz-action-secondary').click();
        await expect(page.locator('.quiz-reveal-status')).toHaveText('Skipped.');
        await page.locator('.quiz-action-primary').click();
        // Answer Q2–Q5 correctly.
        for (let i = 2; i <= 5; i++) {
            await expect(page.locator('.quiz-progress-text')).toHaveText('Question ' + i + ' of 5');
            await page.locator('.quiz-choice[data-correct="true"]').click();
            await page.locator('.quiz-action-primary').click();      // Submit
            await page.locator('.quiz-action-primary').click();      // Next / See results
        }
        await expect(page.locator('.quiz-results-headline')).toHaveText('4 / 5 correct');
        // The skipped Q1 scored incorrect, so it shows in the Review (miss) list.
        await expect(page.locator('.quiz-results-misses tbody tr')).toHaveCount(1);
        expect(errors, 'skip flow should log no errors').toEqual([]);
    });

    test('Random order runs to a results card (#124)', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto('/practice/modbus-decoding.html');
        await page.selectOption('#quiz-modbus-decoding-order', 'random');
        await page.selectOption('#quiz-modbus-decoding-count', '5');
        await page.locator('.quiz-restart-now').click();            // applies the new order + count
        await expect(page.locator('.quiz-progress-text')).toHaveText('Question 1 of 5');
        for (let i = 1; i <= 5; i++) {
            await page.locator('.quiz-action-secondary').click();    // Skip to advance fast
            await page.locator('.quiz-action-primary').click();
        }
        await expect(page.locator('.quiz-results-headline')).toContainText('/ 5 correct');
        expect(errors, 'random order should log no errors').toEqual([]);
    });

    test('a gotcha question shows its snippet; non-gotcha questions do not (#124)', async ({ page }) => {
        await page.goto('/practice/modbus-decoding.html');
        await page.selectOption('#quiz-modbus-decoding-count', '5');
        await page.locator('.quiz-restart-now').click();
        // Sequential first-five types are mcq,mcq,tf,mcq,gotcha — only Q5 has a snippet.
        let sawSnippet = false, sawNoSnippet = false;
        for (let i = 1; i <= 5; i++) {
            await expect(page.locator('.quiz-progress-text')).toHaveText('Question ' + i + ' of 5');
            if (await page.locator('.quiz-snippet-slot .quiz-snippet').count() > 0) sawSnippet = true;
            else sawNoSnippet = true;
            await page.locator('.quiz-action-secondary').click();    // Skip to advance
            await page.locator('.quiz-action-primary').click();
        }
        expect(sawSnippet, 'the gotcha rendered its snippet').toBe(true);
        expect(sawNoSnippet, 'non-gotcha questions show no snippet').toBe(true);
    });

    test('a full-bank run repairs a stale best whose total exceeds the bank (#115)', async ({ page }) => {
        // Seed a best recorded at a length LONGER than the current bank (as
        // if the bank was edited down) — the #89 longer-run guard would
        // otherwise lock it forever. A full-bank run must repair it.
        await page.addInitScript(() => {
            localStorage.setItem('cf_quiz_modbus-decoding_best', '99');
            localStorage.setItem('cf_quiz_modbus-decoding_best_total', '999');
        });
        await page.goto('/practice/modbus-decoding.html');
        await page.selectOption('#quiz-modbus-decoding-count', 'all');
        await page.locator('.quiz-restart-now').click();
        await expect(page.locator('.quiz-progress-text')).toHaveText('Question 1 of 10');
        // Q1 correct, skip the rest → a non-zero FULL-bank run (total = 10).
        await page.locator('.quiz-choice[data-correct="true"]').click();
        await page.locator('.quiz-action-primary').click();          // Submit
        await page.locator('.quiz-action-primary').click();          // Next
        for (let i = 2; i <= 10; i++) {
            await page.locator('.quiz-action-secondary').click();    // Skip
            await page.locator('.quiz-action-primary').click();
        }
        await expect(page.locator('.quiz-results')).toBeVisible();
        // The stale 99/999 record is replaced by this full-bank result.
        expect(await page.evaluate(() => localStorage.getItem('cf_quiz_modbus-decoding_best_total'))).toBe('10');
        expect(await page.evaluate(() => localStorage.getItem('cf_quiz_modbus-decoding_best'))).toBe('1');
    });
});

// The styleguide is a noindex dev page (no canonical → absent from the
// sitemap + PAGES), so it isn't covered by the loop above. This standalone
// check loads it (exercising the shared equipment-register .device/.lcd
// classes) and drives the nav theme toggle end-to-end — the one piece of
// brand-new site-wide behavior the smoke loop doesn't otherwise touch.
test('styleguide loads + the theme toggle flips, persists, and repaints meta', async ({ page }) => {
    const errors = watchErrors(page);
    // Pin the OS preference to dark so the first-load default is deterministic
    // (the head bootstrap honors prefers-color-scheme when no cf_theme is set).
    await page.emulateMedia({ colorScheme: 'dark' });
    const res = await page.goto('/styleguide.html');
    expect(res.status(), '/styleguide.html should return 200').toBe(200);
    await expect(page.locator('nav.site-nav')).toBeVisible();
    // noindex dev page: robots noindex, no canonical.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    expect(await page.locator('link[rel="canonical"]').count()).toBe(0);
    // Shared equipment-register CSS actually renders here.
    await expect(page.locator('.device .lcd').first()).toBeVisible();

    const html = page.locator('html');
    const darkBtn = page.locator('.theme-btn[data-theme-set="dark"]');
    const lightBtn = page.locator('.theme-btn[data-theme-set="light"]');

    // Dark is the default when nothing is stored and the OS doesn't prefer light.
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(darkBtn).toHaveAttribute('aria-pressed', 'true');

    // Flip to light: <html data-theme>, aria-pressed, and the theme-color
    // meta all track the choice, and it persists to localStorage.
    await lightBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(lightBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(darkBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#ffffff');
    expect(await page.evaluate(() => localStorage.getItem('cf_theme'))).toBe('light');

    // Reload: the before-paint bootstrap restores light from storage.
    await page.reload({ waitUntil: 'load' });
    await expect(html).toHaveAttribute('data-theme', 'light');

    // Flip back to dark.
    await darkBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#13161b');
    expect(await page.evaluate(() => localStorage.getItem('cf_theme'))).toBe('dark');

    expect(errors, 'styleguide + theme toggle should log no errors').toEqual([]);
});

// Regression for audit-2026-06 #2: units.js used to load only on pages
// that convert, leaving the rendered units pill dead on ~34 pages —
// clicks did nothing, the choice didn't persist, and the hard-coded
// aria-pressed="true" on US never re-synced. Now that page.njk loads
// it site-wide, drive the toggle end-to-end on a lesson page with no
// data-us spans (the audit's own repro page).
test('units toggle works on a non-converting page (units.js site-wide)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/superheat-subcooling.html');

    const html = page.locator('html');
    const usBtn = page.locator('.units-btn[data-units="us"]');
    const metricBtn = page.locator('.units-btn[data-units="metric"]');

    expect(await page.evaluate(() => typeof window.Units)).toBe('object');
    await expect(html).toHaveAttribute('data-units', 'us');
    await expect(usBtn).toHaveAttribute('aria-pressed', 'true');

    // Flip to metric: attribute, aria, and persistence all track.
    await metricBtn.click();
    await expect(html).toHaveAttribute('data-units', 'metric');
    await expect(metricBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(usBtn).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => localStorage.getItem('cf_units'))).toBe('metric');

    // Reload: the before-paint bootstrap restores metric, and the
    // end-of-body re-sync fixes the hard-coded aria-pressed (the
    // permanently-wrong half of audit #2).
    await page.reload({ waitUntil: 'load' });
    await expect(html).toHaveAttribute('data-units', 'metric');
    await expect(metricBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(usBtn).toHaveAttribute('aria-pressed', 'false');

    expect(errors, 'units toggle on lesson page should log no errors').toEqual([]);
});

test('modbus function codes — CRC-16 hits the canonical check value and verifies a frame', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/modbus-functions.html');

    // CRC-16/MODBUS of ASCII "123456789" is the canonical 0x4B37 check
    // value; Modbus appends it low byte first (37 4B).
    await page.click('[data-tab="crc"]');
    await page.fill('#mf-crc-in', '31 32 33 34 35 36 37 38 39');
    await expect(page.locator('#mf-crc-word')).toHaveText('0x4B37');
    await expect(page.locator('#mf-crc-append')).toHaveText('37 4B');

    // The same bytes with their CRC appended verify as a valid frame.
    await page.fill('#mf-crc-in', '31 32 33 34 35 36 37 38 39 37 4B');
    await expect(page.locator('#mf-crc-verify')).toContainText('Valid frame');

    // A wrong trailing CRC is called out, not treated as a valid frame.
    await page.fill('#mf-crc-in', '31 32 33 34 35 36 37 38 39 00 00');
    await expect(page.locator('#mf-crc-verify')).toContainText('not the CRC');

    expect(errors, 'modbus CRC behavioral should log no errors').toEqual([]);
});

// ── audit-2026-06 #44: the only calculation tools with zero math
// assertions — signal-scaling (the site's canonical tab-wiring
// reference, i.e. the page most likely to be touched in a sweep),
// valve-cv, and affinity-laws. All known values audit-verified.

test('signal-scaling — known value, equal-bounds mute, 2-point solver', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/signal-scaling.html');

    // 12 mA on a 4–20 mA / 0–100 span is exactly half scale.
    await page.fill('#sig-val', '12');
    await page.fill('#eu-min', '0');
    await page.fill('#eu-max', '100');
    await expect(page.locator('#scaling-out')).toContainText('50');

    // Equal engineering bounds → 1/(max−min) is Infinity — the exact
    // case the CLAUDE.md validate-and-mute bullet warns about.
    await page.fill('#eu-max', '0');
    await expect(page.locator('#scaling-out')).toHaveText('—');
    await expect(page.locator('#ss-scaling-callout')).toBeVisible();

    // 2-point solver: (4,0) and (20,100) → y = 6.25x − 25.
    await page.click('[data-tab="slopeoffset"]');
    await page.fill('#so-x1', '4');
    await page.fill('#so-y1', '0');
    await page.fill('#so-x2', '20');
    await page.fill('#so-y2', '100');
    await expect(page.locator('#so-slope')).toContainText('6.25');
    await expect(page.locator('#so-offset')).toContainText('-25');

    expect(errors, 'signal-scaling behavioral should log no errors').toEqual([]);
});

test('valve-cv — known Cv and the mute path', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/valve-cv.html');

    // 10 GPM across 4 psi at SG 1: Cv = 10·√(1/4) = 5.0 (Kv ≈ 4.33).
    await page.fill('#cv-flow', '10');
    await page.fill('#cv-dp', '4');
    await page.fill('#cv-sg', '1');
    await expect(page.locator('#cv-out')).toContainText('5');
    await expect(page.locator('#cv-kv')).toContainText('4.3');

    // ΔP of zero can't size a valve — mute + callout.
    await page.fill('#cv-dp', '0');
    await expect(page.locator('#cv-out')).toHaveText('—');
    await expect(page.locator('#cv-callout')).toBeVisible();

    expect(errors, 'valve-cv behavioral should log no errors').toEqual([]);
});

test('affinity-laws — half speed gives 50/25/12.5%', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/affinity-laws.html');

    // N₂/N₁ = 0.5: flow scales linearly (50), head with the square
    // (12.5 from 50), power with the cube (1.25 from 10).
    await page.fill('#af-s-n1', '60');
    await page.fill('#af-s-n2', '30');
    await page.fill('#af-s-q1', '100');
    await page.fill('#af-s-h1', '50');
    await page.fill('#af-s-p1', '10');
    await expect(page.locator('#af-s-ratio')).toContainText('0.5');
    await expect(page.locator('#af-s-q2')).toContainText('50');
    await expect(page.locator('#af-s-h2')).toContainText('12.5');
    await expect(page.locator('#af-s-p2')).toContainText('1.25');

    expect(errors, 'affinity-laws behavioral should log no errors').toEqual([]);
});

test('waterside-load — defaults solve 120 MBH / 10 tons, metric closes on displayed operands', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/waterside-load.html');

    // Defaults: 20 GPM at ΔT 12 °F → 500 × 20 × 12 = 120,000 Btu/h.
    await expect(page.locator('#wl-out')).toContainText('120 MBH');
    await expect(page.locator('#wl-tons')).toContainText('10');

    // Solve for flow: 120 MBH at ΔT 12 → 20 GPM; ΔT 0 is a divisor → mute.
    await page.selectOption('#wl-solve', 'flow');
    await expect(page.locator('#wl-out')).toContainText('20 GPM');
    await page.fill('#wl-dt', '0');
    await expect(page.locator('#wl-out')).toHaveText('—');
    await expect(page.locator('#wl-callout')).toBeVisible();

    expect(errors, 'waterside-load behavioral should log no errors').toEqual([]);
});

test('waterside-load — metric solve uses the 4.187 constant on displayed operands', async ({ page }) => {
    const errors = watchErrors(page);
    await page.addInitScript(() => localStorage.setItem('cf_units', 'metric'));
    await page.goto('/tools/waterside-load.html');

    // Inputs rewrite to 1.26 L/s at 6.7 °C; 4.187 × 1.26 × 6.7 = 35.3 kW —
    // the formula line must reproduce the shown result from the shown
    // operands (metric rounding policy, audit-2026-06 #53).
    await expect(page.locator('#wl-out')).toContainText('35.3 kW');
    await expect(page.locator('#wl-formula')).toContainText('4.187 × 1.26 × 6.7');
    await expect(page.locator('#wl-tons')).toContainText('10');

    expect(errors, 'waterside-load metric behavioral should log no errors').toEqual([]);
});

test('airflow — K-factor both directions and the duct-velocity chain', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/airflow.html');

    // Defaults: K 1000 at VP 0.36 → 1000 × 0.6 = 600 CFM.
    await expect(page.locator('#vp-k-out')).toContainText('600 CFM');

    // Back-solve: hood 800 CFM at VP 0.64 → K = 800 ÷ 0.8 = 1000.
    await page.selectOption('#vp-k-solve', 'k');
    await page.fill('#vp-k-vp', '0.64');
    await expect(page.locator('#vp-k-out')).toHaveText('1000');

    // Negative VP is a swapped-lines teaching mute, not a NaN.
    await page.fill('#vp-k-vp', '-0.1');
    await expect(page.locator('#vp-k-out')).toHaveText('—');
    await expect(page.locator('#vp-k-callout')).toContainText('swapped');

    // Duct tab: VP 0.0625 → 1001 FPM; 24×12 → 2 ft² → 2002 CFM.
    await page.click('[data-tab="velocity"]');
    await expect(page.locator('#vp-d-vel')).toContainText('1001 FPM');
    await expect(page.locator('#vp-d-cfm')).toContainText('2002 CFM');

    // Round duct: 16 in. dia → π × (16/24)² ≈ 1.40 ft².
    await page.selectOption('#vp-d-shape', 'round');
    await expect(page.locator('#vp-d-area')).toContainText('1.4 ft²');

    expect(errors, 'airflow behavioral should log no errors').toEqual([]);
});

test('transformer-sizing — seeded panel totals, fuse ladder, overload pill', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/transformer-sizing.html');

    // Seeded panel: 14 + 7 + 7 + 10 + 2 = 40 VA on a 75 VA → 53 %, 4 A fuse.
    await expect(page.locator('#xf-total')).toContainText('40 VA');
    await expect(page.locator('#xf-pct')).toContainText('53');
    await expect(page.locator('#xf-fuse')).toContainText('4 A');
    await expect(page.locator('#xf-status')).toHaveClass(/ok/);

    // Pile on a 45 VA load → 85 VA on 75 → overloaded.
    await page.fill('#xf-va-6', '45');
    await expect(page.locator('#xf-status')).toHaveClass(/error/);

    // Custom rating reveals its row and recomputes.
    await page.selectOption('#xf-size', 'custom');
    await page.fill('#xf-size-custom', '100');
    await expect(page.locator('#xf-pct')).toContainText('85');

    expect(errors, 'transformer-sizing behavioral should log no errors').toEqual([]);
});

test('voltage-drop — loop margin, 0-10V teaching verdict, sensor asymmetry', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/voltage-drop.html');

    // Defaults: 18 AWG, 500 ft → 6.4 Ω; 24 − 0.020×(6.4+250) = 18.9 V, OK.
    await expect(page.locator('#vd-rwire')).toContainText('6.4');
    await expect(page.locator('#vd-vxmtr')).toContainText('18.9 V');
    await expect(page.locator('#vd-status')).toHaveClass(/ok/);

    // 0-10 V mode: the verdict teaches "not wire resistance".
    await page.selectOption('#vd-type', 'volt');
    await expect(page.locator('#vd-status')).toContainText('ground offset');

    // Sensor mode: same copper, wildly different errors — Pt100 row is
    // degrees while 10K reads under a tenth (slopes pulled live from
    // THERMISTOR_TYPES, so this also guards the data-file coupling).
    await page.selectOption('#vd-type', 'therm');
    await expect(page.locator('#vd-terr-10k')).toContainText('< 0.1');
    await expect(page.locator('#vd-terr-pt100')).toContainText('°F reads cold');
    await expect(page.locator('#vd-status')).toContainText('Pt100');

    expect(errors, 'voltage-drop behavioral should log no errors').toEqual([]);
});

test('electrical-quick-calc — four tabs solve and mute correctly', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/electrical-quick-calc.html');

    // Tab 1 (Ohm's law), seeded V=12, I=3 → R=4 Ω, P=36 W (solved, blue).
    await expect(page.locator('#eq-ohm-out-r')).toContainText('4 Ω');
    await expect(page.locator('#eq-ohm-out-p')).toContainText('36 W');
    await expect(page.locator('#eq-ohm-out-r')).toHaveClass(/live/);
    await expect(page.locator('#eq-ohm-lbl-r')).toContainText('solved');
    // A third value over-determines the wheel → mute with a callout.
    await page.fill('#eq-ohm-r', '4');
    await expect(page.locator('#eq-ohm-callout')).toBeVisible();
    await expect(page.locator('#eq-ohm-out-p')).toHaveText('—');

    // Tab 2 (AC power), seeded 460 V 3φ, 30 A, PF 0.85.
    await page.click('[data-tab="ac"]');
    await expect(page.locator('#eq-ac-kva')).toContainText('23.90');
    await expect(page.locator('#eq-ac-kw')).toContainText('20.32');
    await expect(page.locator('#eq-ac-kvar')).toContainText('12.59');
    // PF out of [0,1] mutes (NaN from acos / √ of a negative) with a callout.
    await page.fill('#eq-ac-pf', '1.5');
    await expect(page.locator('#eq-ac-callout')).toContainText('between 0 and 1');
    await expect(page.locator('#eq-ac-kva')).toHaveText('—');

    // Tab 3 (motor), seeded 10 HP, 460 V, 3φ, PF 0.88, η 0.90 → ~11.8 A.
    await page.click('[data-tab="motor"]');
    await expect(page.locator('#eq-motor-fla')).toContainText('11.8 A');
    await expect(page.locator('#eq-motor-twin')).toContainText('7.46 kW');
    // The NEC "estimate only" disclaimer is always present, not a pill.
    await expect(page.locator('#tab-motor .failure-callout', { hasText: 'not a code value' })).toBeVisible();
    // A measured reading near the estimate drives the verdict pill to OK.
    await page.fill('#eq-motor-meas', '12');
    await expect(page.locator('#eq-motor-status')).toHaveClass(/ok/);

    // Tab 4 (NEMA imbalance), seeded 460/455/450 → 1.10 %, derate (warn).
    await page.click('[data-tab="imbalance"]');
    await expect(page.locator('#eq-imb-pct')).toContainText('1.10');
    await expect(page.locator('#eq-imb-status')).toHaveClass(/warn/);

    expect(errors, 'electrical-quick-calc behavioral should log no errors').toEqual([]);
});

// ── audit-2026-06 Batch G: tool edge cases ─────────────────────────────

// #27: RH 0 used to print a literal "-Infinity °F" hero value with the
// other readouts shown as valid and no callout.
test('dew-point — RH 0 mutes with an honest callout instead of -Infinity', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/dew-point-calculator.html');
    await page.fill('#dew-second', '0');
    await expect(page.locator('#dew-callout')).toBeVisible();
    await expect(page.locator('#dew-callout')).toContainText('dry air has no dew point');
    await expect(page.locator('#dew-out-dp')).toHaveText('—');
    expect(errors, 'dew-point RH 0 should log no errors').toEqual([]);
});

// #28: the by-temperature out-of-range message used to print the chart
// bounds in raw canonical °F while the user is in metric.
test('refrigerant-pt — metric by-temp out-of-range message converts the bounds', async ({ page }) => {
    const errors = watchErrors(page);
    await page.addInitScript(() => localStorage.setItem('cf_units', 'metric'));
    await page.goto('/tools/refrigerant-pt.html');
    await page.selectOption('#rf-refrigerant', 'r22');
    await page.click('#rf-pt-by-t');
    await page.fill('#rf-pt-temp', '90');                  // °C, beyond R-22's 73.3 °C max
    const status = page.locator('#rf-pt-status');
    await expect(status).toContainText('Out of range');
    await expect(status).toContainText('°C');
    await expect(status).not.toContainText('°F');
    expect(errors, 'refrigerant-pt metric bounds should log no errors').toEqual([]);
});

// #60a: the unitschange rewrite used to re-convert the rounded display
// string, permanently mutating typed values (92 → 91.9, 80 → 80.01).
// #60b: metric-first defaults carried 6-significant-figure conversions
// (1699.01 m³/h) next to prose that says 1700.
test('units flip round-trips hand back exactly what was typed (#60a) and metric defaults drop the false precision (#60b)', async ({ page }) => {
    const errors = watchErrors(page);

    // Round-trip on the two tools the audit measured.
    await page.goto('/tools/psychrometric-chart.html');
    await page.fill('#oa-tdb', '92');
    await page.click('.units-btn[data-units="metric"]');
    await expect(page.locator('#oa-tdb')).toHaveValue('33.3');
    await page.click('.units-btn[data-units="us"]');
    await expect(page.locator('#oa-tdb')).toHaveValue('92');

    await page.goto('/tools/coil-sizing.html');
    await page.fill('#cs-cap-ent-tdb', '80');
    await page.click('.units-btn[data-units="metric"]');
    await expect(page.locator('#cs-cap-ent-tdb')).toHaveValue('26.7');
    await page.click('.units-btn[data-units="us"]');
    await expect(page.locator('#cs-cap-ent-tdb')).toHaveValue('80');

    expect(errors, 'round-trip pages should log no errors').toEqual([]);
});

test('air-mixing — metric first paint shows per-quantity decimals and a converted status line', async ({ page }) => {
    const errors = watchErrors(page);
    await page.addInitScript(() => localStorage.setItem('cf_units', 'metric'));
    await page.goto('/tools/air-mixing.html');
    // Airflow defaults rewrite at 0 decimals (1699, not 1699.01)…
    await expect(page.locator('#am-flow-s1-w')).toHaveValue('1699');
    await expect(page.locator('#am-flow-s2-w')).toHaveValue('5097');
    // …and the status line speaks the display pressure unit, not psia.
    await expect(page.locator('.status-pill').first()).toContainText('101.3 kPa');
    expect(errors, 'air-mixing metric paint should log no errors').toEqual([]);
});

// codebase-issues #83 (owner decision): preset-class enums persist
// under cf_* — the cf_psy_range pattern, strict-validated on read.
test('refrigerant and sensor-type choices survive a reload', async ({ page }) => {
    const errors = watchErrors(page);

    await page.goto('/tools/refrigerant-pt.html');
    await page.selectOption('#rf-refrigerant', 'r22');
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('#rf-refrigerant')).toHaveValue('r22');
    expect(await page.evaluate(() => localStorage.getItem('cf_rf_refrigerant'))).toBe('r22');

    await page.goto('/tools/thermistor-calculator.html');
    await page.selectOption('#th-type', '20k');
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('#th-type')).toHaveValue('20k');

    // Garbage in storage falls back to the markup default, never throws.
    await page.evaluate(() => localStorage.setItem('cf_th_type', 'nonsense'));
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('#th-type')).toHaveValue('10k-2');

    expect(errors, 'preset persistence should log no errors').toEqual([]);
});

// E-016: the visible lesson pager, driven by educationSequence.js (the same
// data head.njk uses for rel=prev/next). First lesson has next only, last has
// prev only, a mid lesson has both; tool pages get no pager.
test.describe('lesson sequence pager (E-016)', () => {
    test('first lesson shows only Next', async ({ page }) => {
        await page.goto('/education/pid-basics.html');
        await expect(page.locator('.lesson-seq-prev')).toHaveCount(0);
        const next = page.locator('.lesson-seq-next');
        await expect(next).toHaveAttribute('href', '/education/controller-wiring.html');
        await expect(next).toContainText('Next lesson');
    });

    test('a mid lesson shows both Prev and Next in order', async ({ page }) => {
        await page.goto('/education/hydronic-loops.html');
        await expect(page.locator('.lesson-seq-prev'))
            .toHaveAttribute('href', '/education/controller-wiring.html');
        await expect(page.locator('.lesson-seq-next'))
            .toHaveAttribute('href', '/education/load-piping.html');
    });

    test('last lesson shows only Prev', async ({ page }) => {
        await page.goto('/education/bacnet-mstp.html');
        await expect(page.locator('.lesson-seq-next')).toHaveCount(0);
        await expect(page.locator('.lesson-seq-prev'))
            .toHaveAttribute('href', '/education/bacnet-networking.html');
    });

    test('non-curriculum pages get no pager', async ({ page }) => {
        await page.goto('/tools/signal-scaling.html');
        await expect(page.locator('.lesson-seq')).toHaveCount(0);
    });
});
