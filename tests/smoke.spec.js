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
    { name: 'psychrometric chart',    url: '/tools/psychrometric-chart.html' },
    { name: 'economizer ratio',       url: '/tools/economizer-ratio.html' },
    { name: 'air mixing',             url: '/tools/air-mixing.html' },
    { name: 'coil sizing',            url: '/tools/coil-sizing.html' },
    { name: 'thermistor calculator',  url: '/tools/thermistor-calculator.html' },
    { name: 'refrigerant p-t',        url: '/tools/refrigerant-pt.html' },
    { name: 'simulators landing',     url: '/simulators/' },
    { name: 'pid tuner',              url: '/simulators/pid-tuner.html' },
    { name: 'vfd mock',               url: '/simulators/vfd-mock.html' },
    { name: 'function-block editor',  url: '/simulators/function-block-editor.html' },
    { name: 'education hub',          url: '/education/' },
    { name: 'education — pid basics',  url: '/education/pid-basics.html' },
    { name: 'education — hydronic loops', url: '/education/hydronic-loops.html' },
    { name: 'education — load piping', url: '/education/load-piping.html' },
    { name: 'education — vfds',       url: '/education/vfds.html' },
    { name: 'education — pump control', url: '/education/pump-control.html' },
    { name: 'education — equipment staging', url: '/education/equipment-staging.html' },
    { name: 'education — balancing',   url: '/education/balancing.html' },
    { name: 'education — psychrometrics basics', url: '/education/psychrometrics-basics.html' },
    { name: 'education — function blocks', url: '/education/function-blocks.html' },
    { name: 'education — modbus basics', url: '/education/modbus-basics.html' },
    { name: 'education — modbus decoding', url: '/education/modbus-decoding.html' },
    { name: 'education — bacnet basics', url: '/education/bacnet-basics.html' },
    { name: 'education — bacnet networking', url: '/education/bacnet-networking.html' },
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
        expect(errors, `${url} should log no page / console errors`).toEqual([]);
    });
}

test('pid tuner runs the shared simulation engine on load', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/simulators/pid-tuner.html');
    // pid-engine.js drives the canvas + metrics on init; the readouts should fill in.
    await expect(page.locator('#pid-over')).not.toHaveText('—');
    await expect(page.locator('#pid-settle')).not.toHaveText('—');
    await expect(page.locator('#pid-err')).not.toHaveText('—');
    expect(errors, 'pid tuner behavioral should log no page / console errors').toEqual([]);
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
    // CC leaving DB = 55 °F at row index 3 (0-based) — col 1 (DB)
    await expect(page.locator('#psy-stage-table tbody tr').nth(3).locator('td').nth(1)).toHaveText('55.0');
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
    // The preset persists in localStorage; clean up so other tests
    // (including the on-load chart test above) see the default Standard.
    test.afterEach(async ({ page }) => {
        await page.goto('/tools/psychrometric-chart.html');
        await page.evaluate(() => localStorage.removeItem('cf_psy_range'));
    });

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

    // Dry-bulb tab loads with the worked-example defaults: 60 / 75 / 55 °F.
    // (55 − 75) / (60 − 75) × 100 = 133.3 % — flagged as out-of-range.
    await expect(page.locator('#er-db-pct')).toHaveText('133.3 %');
    await expect(page.locator('#er-db-feas')).toContainText('100 % OA');

    // Switch to feasible case: setpoint between OA and RA.
    await page.fill('#er-db-oa', '50');
    await page.fill('#er-db-ma', '65');
    // (65 − 75) / (50 − 75) × 100 = 40 %
    await expect(page.locator('#er-db-pct')).toHaveText('40.0 %');
    await expect(page.locator('#er-db-feas')).toContainText('Feasible');

    // Infeasible — OA hotter than the setpoint AND than RA.
    await page.fill('#er-db-oa', '85');
    await page.fill('#er-db-ma', '60');
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

test.describe('thermistor behavioral', () => {
    // The test below mutates the global units preference (persisted in
    // localStorage as `cf_units`). Without an afterEach, a failed mid-
    // test assertion would leave the worker in metric mode and bleed
    // into every subsequent page test. Clear the key directly so the
    // cleanup runs regardless of test outcome.
    test.afterEach(async ({ page }) => {
        await page.goto('/tools/thermistor-calculator.html');
        await page.evaluate(() => localStorage.removeItem('cf_units'));
    });

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
        // Units restore handled by the afterEach above — no manual click needed.
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
    expect(visibleHvac, 'only HVAC cards should remain visible').toBe(5);
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
    expect(await page.locator('.nav-card:not([hidden])').count()).toBe(2);

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
    // NOT start the drive; the LCD's line 4 should flash the ignore msg.
    await page.click('#vfdm-key-run');
    await expect(page.locator('#vfdm-state-text')).toHaveText(/STOPPED/);
    const lcdLines = await page.locator('#vfdm-lcd .vfdm-lcd-line').allTextContents();
    expect(lcdLines[3]).toMatch(/IGN: SRC=TERMS/);

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
