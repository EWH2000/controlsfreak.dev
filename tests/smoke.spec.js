const { test, expect } = require('@playwright/test');

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

// In production the Worker serves clean URLs (/, /tools/, /tools/signal-scaling,
// /education/pid-basics, /contact) via html_handling. The local
// `python -m http.server` only knows real file paths, so the tests below hit
// the .html files directly — a directory like /tools/ still resolves to its
// index.html, so that one stays clean.
const PAGES = [
    { name: 'home',                   url: '/' },
    { name: 'tools landing',          url: '/tools/' },
    { name: 'signal scaling',         url: '/tools/signal-scaling.html' },
    { name: 'modbus register viewer', url: '/tools/modbus-register-viewer.html' },
    { name: 'bacnet/ip converter',    url: '/tools/bacnet-ip-converter.html' },
    { name: 'bacnet object reference', url: '/tools/bacnet-objects.html' },
    { name: 'psychrometric chart',    url: '/tools/psychrometric-chart.html' },
    { name: 'economizer ratio',       url: '/tools/economizer-ratio.html' },
    { name: 'air mixing',             url: '/tools/air-mixing.html' },
    { name: 'coil sizing',            url: '/tools/coil-sizing.html' },
    { name: 'dew point calculator',   url: '/tools/dew-point-calculator.html' },
    { name: 'thermistor calculator',  url: '/tools/thermistor-calculator.html' },
    { name: 'refrigerant p-t',        url: '/tools/refrigerant-pt.html' },
    { name: 'valve cv sizing',        url: '/tools/valve-cv.html' },
    { name: 'affinity laws',          url: '/tools/affinity-laws.html' },
    { name: 'modbus function codes',  url: '/tools/modbus-functions.html' },
    { name: 'simulators landing',     url: '/simulators/' },
    { name: 'pid tuner',              url: '/simulators/pid-tuner.html' },
    { name: 'vfd mock',               url: '/simulators/vfd-mock.html' },
    { name: 'function-block editor',  url: '/simulators/function-block-editor.html' },
    { name: 'staging sequencer',      url: '/simulators/staging-sequencer.html' },
    { name: 'controller wiring',      url: '/simulators/controller-wiring.html' },
    { name: 'education hub',          url: '/education/' },
    { name: 'education — pid basics',  url: '/education/pid-basics.html' },
    { name: 'education — controller wiring', url: '/education/controller-wiring.html' },
    { name: 'education — hydronic loops', url: '/education/hydronic-loops.html' },
    { name: 'education — load piping', url: '/education/load-piping.html' },
    { name: 'education — vfds',       url: '/education/vfds.html' },
    { name: 'education — pump control', url: '/education/pump-control.html' },
    { name: 'education — equipment staging', url: '/education/equipment-staging.html' },
    { name: 'education — balancing',   url: '/education/balancing.html' },
    { name: 'education — refrigerant cycle basics', url: '/education/refrigerant-cycle-basics.html' },
    { name: 'education — superheat & subcooling', url: '/education/superheat-subcooling.html' },
    { name: 'education — txv vs eev', url: '/education/metering-devices-txv-eev.html' },
    { name: 'education — psychrometrics basics', url: '/education/psychrometrics-basics.html' },
    { name: 'education — function blocks', url: '/education/function-blocks.html' },
    { name: 'education — modbus basics', url: '/education/modbus-basics.html' },
    { name: 'education — modbus decoding', url: '/education/modbus-decoding.html' },
    { name: 'education — bacnet basics', url: '/education/bacnet-basics.html' },
    { name: 'education — bacnet networking', url: '/education/bacnet-networking.html' },
    { name: 'practice landing',       url: '/practice/' },
    { name: 'practice — modbus basics', url: '/practice/modbus-basics.html' },
    { name: 'practice — modbus decoding', url: '/practice/modbus-decoding.html' },
    { name: 'practice — bacnet basics', url: '/practice/bacnet-basics.html' },
    { name: 'practice — bacnet networking', url: '/practice/bacnet-networking.html' },
    { name: 'practice — pump control', url: '/practice/pump-control.html' },
    { name: 'practice — hydronic loops', url: '/practice/hydronic-loops.html' },
    { name: 'practice — load piping', url: '/practice/load-piping.html' },
    { name: 'practice — balancing', url: '/practice/balancing.html' },
    { name: 'practice — refrigerant cycle basics', url: '/practice/refrigerant-cycle-basics.html' },
    { name: 'practice — superheat & subcooling', url: '/practice/superheat-subcooling.html' },
    { name: 'practice — metering devices txv/eev', url: '/practice/metering-devices-txv-eev.html' },
    { name: 'practice — pid basics', url: '/practice/pid-basics.html' },
    { name: 'practice — vfds', url: '/practice/vfds.html' },
    { name: 'practice — function blocks', url: '/practice/function-blocks.html' },
    { name: 'practice — psychrometrics basics', url: '/practice/psychrometrics-basics.html' },
    { name: 'practice — equipment staging', url: '/practice/equipment-staging.html' },
    { name: 'practice — surviving first months', url: '/practice/surviving-first-months.html' },
    { name: 'practice — controller swap', url: '/practice/controller-swap.html' },
    { name: 'practice — field wiring & sensors', url: '/practice/field-wiring-sensors.html' },
    { name: 'practice — sequencing scenarios', url: '/practice/sequencing-scenarios.html' },
    { name: 'practice — troubleshooting', url: '/practice/troubleshooting.html' },
    { name: 'contact',                url: '/contact.html' },
    { name: 'privacy',                url: '/privacy.html' },
];

test('PAGES array stays in sync with the generated sitemap', () => {
    // sitemap.xml is built from html/sitemap.njk (the sitemapPages
    // collection), so read the build output, not a source file. The
    // webServer in playwright.config.js builds _site/ before the run.
    const fs = require('fs');
    const sitemap = fs.readFileSync('_site/sitemap.xml', 'utf8');
    const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map(m => m[1].replace(/^https?:\/\/[^/]+/, ''))
        .sort();
    const pagesPaths = PAGES
        .map(p => p.url.replace(/^https?:\/\/[^/]+/, ''))
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

test('bacnet/ip converter converts a hex string', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/bacnet-ip-converter.html');
    await page.fill('#b2i-hex', 'C0A80164BAC0');
    await expect(page.locator('#b2i-ip')).toHaveText('192.168.1.100');
    await expect(page.locator('#b2i-port')).toHaveText('47808');
    expect(errors, 'bacnet behavioral should log no page / console errors').toEqual([]);
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
    expect(visibleHvac, 'only HVAC cards should remain visible').toBe(6);
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
    expect(await page.locator('.nav-card:not([hidden])').count()).toBe(4);

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
    // Content-quiz cards (two Modbus, two BACnet) and the field drills all
    // visible under [All].
    await expect(page.locator('.nav-card[data-category="modbus"]:not([hidden])')).toHaveCount(2);
    await expect(page.locator('.nav-card[data-category="bacnet"]:not([hidden])')).toHaveCount(2);
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

        // Reset best clears the keys + repaints to "Best: —".
        await page.locator('.quiz-reset-best').click();
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
        // No "new best" celebration, record untouched.
        await expect(page.locator('.quiz-results-newbest')).toHaveCount(0);
        expect(await page.evaluate(() => localStorage.getItem('cf_quiz_modbus-decoding_best'))).toBe('10');
        expect(await page.evaluate(() => localStorage.getItem('cf_quiz_modbus-decoding_best_total'))).toBe('10');
        await expect(page.locator('.quiz-best-readout')).toContainText('Best: 10 / 10');

        expect(errors, 'short-run guard should log no errors').toEqual([]);
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
