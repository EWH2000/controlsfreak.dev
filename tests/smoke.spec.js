const { test, expect } = require('@playwright/test');

// In production the Worker serves clean URLs (/, /tools/, /tools/signal-scaling,
// /education/pid-basics, /contact) via html_handling. The local
// `python -m http.server` only knows real file paths, so the tests below hit
// the .html files directly — a directory like /tools/ still resolves to its
// index.html, so that one stays clean.
const PAGES = [
    { name: 'home',                   url: 'http://localhost:8000/' },
    { name: 'tools landing',          url: 'http://localhost:8000/tools/' },
    { name: 'signal scaling',         url: 'http://localhost:8000/tools/signal-scaling.html' },
    { name: 'modbus register viewer', url: 'http://localhost:8000/tools/modbus-register-viewer.html' },
    { name: 'pid tuner',              url: 'http://localhost:8000/tools/pid-tuner.html' },
    { name: 'bacnet/ip converter',    url: 'http://localhost:8000/tools/bacnet-ip-converter.html' },
    { name: 'psychrometric chart',    url: 'http://localhost:8000/tools/psychrometric-chart.html' },
    { name: 'thermistor calculator',  url: 'http://localhost:8000/tools/thermistor-calculator.html' },
    { name: 'vfd mock',               url: 'http://localhost:8000/tools/vfd-mock.html' },
    { name: 'education hub',          url: 'http://localhost:8000/education/' },
    { name: 'education — pid basics',  url: 'http://localhost:8000/education/pid-basics.html' },
    { name: 'education — hydronic loops', url: 'http://localhost:8000/education/hydronic-loops.html' },
    { name: 'education — load piping', url: 'http://localhost:8000/education/load-piping.html' },
    { name: 'education — vfds',       url: 'http://localhost:8000/education/vfds.html' },
    { name: 'education — pump control', url: 'http://localhost:8000/education/pump-control.html' },
    { name: 'contact',                url: 'http://localhost:8000/contact.html' },
];

for (const { name, url } of PAGES) {
    test(`${name} loads cleanly`, async ({ page }) => {
        const errors = [];
        page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
        page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

        const res = await page.goto(url);
        expect(res.status(), `${url} should return 200`).toBe(200);
        await expect(page).toHaveTitle(/controlsfreak\.dev/);
        await expect(page.locator('nav.site-nav')).toBeVisible();
        expect(errors, `${url} should log no page / console errors`).toEqual([]);
    });
}

test('pid tuner runs the shared simulation engine on load', async ({ page }) => {
    await page.goto('http://localhost:8000/tools/pid-tuner.html');
    // pid-engine.js drives the canvas + metrics on init; the readouts should fill in.
    await expect(page.locator('#pidOver')).not.toHaveText('—');
    await expect(page.locator('#pidSettle')).not.toHaveText('—');
    await expect(page.locator('#pidErr')).not.toHaveText('—');
});

test('bacnet/ip converter converts a hex string', async ({ page }) => {
    await page.goto('http://localhost:8000/tools/bacnet-ip-converter.html');
    await page.fill('#b2i_hex', 'C0A80164BAC0');
    await expect(page.locator('#b2i_ip')).toHaveText('192.168.1.100');
    await expect(page.locator('#b2i_port')).toHaveText('47808');
});

test('psychrometric chart computes the AHU chain on load', async ({ page }) => {
    await page.goto('http://localhost:8000/tools/psychrometric-chart.html');
    // default summer cooling: OA 92 °F DB / 76 °F WB is the focused stage,
    // so the right-hand detail block shows OA's state.
    await expect(page.locator('#roDb')).toHaveText('92.0');
    await expect(page.locator('#roWb')).toHaveText('76.0');
    // stage table includes the active CC row (cooling coil is on by default)
    await expect(page.locator('#psyStageTable tbody tr')).toHaveCount(5);  // OA, RA, MA, CC, SA
    // CC leaving DB = 55 °F at row index 3 (0-based) — col 1 (DB)
    await expect(page.locator('#psyStageTable tbody tr').nth(3).locator('td').nth(1)).toHaveText('55.0');
    // pick RA so the detail block tracks the selection
    await page.click('.psy-pill[data-step="ra"]');
    await expect(page.locator('#roDb')).toHaveText('75.0');
    // an impossible state mutes the readouts and surfaces an error
    await page.selectOption('#ra-mode', 'wb');
    await page.fill('#ra-tdb', '70');
    await page.fill('#ra-second', '80');  // wet-bulb above dry-bulb
    await expect(page.locator('#roWb')).toHaveText('—');
    await expect(page.locator('#psyMsg')).toContainText('Wet-bulb can');
});

test('thermistor calculator looks up a known reference value', async ({ page }) => {
    await page.goto('http://localhost:8000/tools/thermistor-calculator.html');

    // the inputs + the reference table render on load
    await expect(page.locator('#thType')).toBeVisible();
    await expect(page.locator('#thTemp')).toBeVisible();
    expect(await page.locator('#thRtBody tr').count(), 'R/T table should be populated').toBeGreaterThan(40);

    // 10K Type III at 77 °F is the type's defining property — should land on ~10,000 Ω
    await page.selectOption('#thType', '10k-3');
    await page.fill('#thTemp', '77');
    const r = parseFloat((await page.locator('#thResult').textContent()).replace(/[^0-9.]/g, ''));
    expect(r, '10K-3 @ 77 °F should be ≈ 10,000 Ω').toBeGreaterThan(9700);
    expect(r).toBeLessThan(10300);
    await expect(page.locator('#thStatus')).toHaveText('in range');

    // a temperature outside the table range mutes the result
    await page.fill('#thTemp', '400');
    await expect(page.locator('#thResult')).toHaveText('—');

    // flipping the global units toggle rescales the temperature field and label
    // (the local °F/°C buttons were retired when the global selector landed)
    await page.fill('#thTemp', '50');
    await page.click('.units-btn[data-units="metric"]');
    await expect(page.locator('#thTempLbl')).toHaveText('Temperature (°C)');
    expect(parseFloat(await page.locator('#thTemp').inputValue())).toBeCloseTo(10, 0);   // 50 °F ≈ 10 °C
    // flip back so this test doesn't leak metric state into the next page load
    await page.click('.units-btn[data-units="us"]');
});

test('education page runs the PID mini-sims and they respond to input', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

    await page.goto('http://localhost:8000/education/pid-basics.html');

    // all three mini-sim canvases are present and visible
    for (const id of ['#m1Canvas', '#m2Canvas', '#m3Canvas']) {
        await expect(page.locator(id)).toBeVisible();
    }
    // the shared engine ran on load — the key-metric callouts are filled in
    await expect(page.locator('#m1Offset')).not.toHaveText('—');
    await expect(page.locator('#m2Over')).not.toHaveText('—');
    await expect(page.locator('#m3Settle')).not.toHaveText('—');

    // moving Sim 1's gain slider re-runs the sim — the offset readout changes
    const offsetBefore = await page.locator('#m1Offset').textContent();
    await page.locator('#m1Slider').evaluate((el) => {
        el.value = el.max;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#m1Offset')).not.toHaveText(offsetBefore);

    // a process-speed chip switches the model and takes the .active state
    const slowChip = page.locator('#sim2 .btn-row .copy-btn').filter({ hasText: 'Slow' });
    await slowChip.click();
    await expect(slowChip).toHaveClass(/active/);

    expect(errors, 'education page should log no page / console errors').toEqual([]);
});

test('education hub links to its pages', async ({ page }) => {
    await page.goto('http://localhost:8000/education/');
    const hrefs = await page.locator('.nav-card').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toContain('/education/pid-basics.html');
    expect(hrefs).toContain('/education/hydronic-loops.html');
    expect(hrefs).toContain('/education/load-piping.html');
    expect(hrefs).toContain('/education/vfds.html');
    expect(hrefs).toContain('/education/pump-control.html');
});

test('hydronic loops page renders its three SVG schematics', async ({ page }) => {
    await page.goto('http://localhost:8000/education/hydronic-loops.html');
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
});

test('load piping page renders its four SVG schematics and ties back to the twin-T', async ({ page }) => {
    await page.goto('http://localhost:8000/education/load-piping.html');
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
    await expect(page.locator('#lp-tt-loadA-valve')).toHaveCount(1);
    await expect(page.locator('#lp-tt-loadB-valve')).toHaveCount(1);
    // the closing tie-back actually links back to the twin-T #d3 anchor
    const hrefs = await page.locator('main a').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toContain('/education/hydronic-loops.html#d3');
});

test('vfd mock — run-source gating works from the keypad', async ({ page }) => {
    await page.goto('http://localhost:8000/tools/vfd-mock.html');

    // Default config is run-source=TERMINALS. Pressing keypad RUN should
    // NOT start the drive; the LCD's line 4 should flash the ignore msg.
    await page.click('#vfdmKeyRun');
    await expect(page.locator('#vfdmStateText')).toHaveText(/STOPPED/);
    const lcdLines = await page.locator('#vfdmLcd .vfdm-lcd-line').allTextContents();
    expect(lcdLines[3]).toMatch(/IGN: SRC=TERMS/);

    // L/R into LOCAL — keypad now overrides source params and RUN actually starts the drive.
    await page.click('#vfdmKeyLocal');
    await page.click('#vfdmKeyRun');
    await page.waitForTimeout(300);  // let it ramp a bit
    await expect(page.locator('#vfdmStateText')).toHaveText(/RAMPING UP|AT SPEED/);
    const actHz = parseFloat(await page.locator('#vfdmActHz').textContent());
    expect(actHz, 'drive should be ramping up in LOCAL mode').toBeGreaterThan(0);
});

test('pump control page renders its diagram and both widgets respond', async ({ page }) => {
    await page.goto('http://localhost:8000/education/pump-control.html');

    // pipe-flow diagram for DP control is present (the third edu-svg-styled
    // page; the chart inside Widget 1 is .pc-w1-chart, not .edu-svg)
    await expect(page.locator('main svg.edu-svg')).toHaveCount(1);
    await expect(page.locator('#pc-dp-pump')).toHaveCount(1);
    await expect(page.locator('#pc-dp-sensor')).toHaveCount(1);

    // Widget 1 — operating point reads close to design (100 GPM, 50 ft) at default sliders
    await expect(page.locator('#pcW1Flow')).toHaveText('100');
    await expect(page.locator('#pcW1Head')).toHaveText('50.0');

    // Move pump-speed slider to 30 Hz and check the operating point shifts
    await page.locator('#pcW1HzSlider').evaluate((el) => {
        el.value = '30';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const flowAt30 = parseInt(await page.locator('#pcW1Flow').textContent(), 10);
    expect(flowAt30, 'flow should fall when pump speed drops').toBeLessThan(60);
    // Power follows cube law — at half speed, ~12.5% of full power
    const powerAt30 = parseInt(await page.locator('#pcW1Power').textContent(), 10);
    expect(powerAt30).toBeGreaterThan(8);
    expect(powerAt30).toBeLessThan(20);

    // Widget 2 — fixed-DP at 50% demand should read higher pump Hz than reset-DP
    await page.locator('#pcW2DemandSlider').evaluate((el) => {
        el.value = '50';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const fixedHz = parseInt(await page.locator('#pcW2Hz').textContent(), 10);
    await page.click('#pcW2ModeReset');
    const resetHz = parseInt(await page.locator('#pcW2Hz').textContent(), 10);
    expect(resetHz, 'reset DP should run pump slower than fixed DP at part load').toBeLessThan(fixedHz);

    // Anecdote reveal at demand = 0
    await page.locator('#pcW2DemandSlider').evaluate((el) => {
        el.value = '0';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('.pc-w-anecdote')).toBeVisible();
});

test('vfds page renders its diagrams and the run/speed widget is wired up', async ({ page }) => {
    await page.goto('http://localhost:8000/education/vfds.html');

    // block diagram + bypass diagram are present
    const svgs = page.locator('main svg.vfd-svg');
    await expect(svgs).toHaveCount(2);
    // named equipment groups present (the block-diagram stages and the bypass topology)
    await expect(page.locator('#vfd-bd-rect')).toHaveCount(1);
    await expect(page.locator('#vfd-bd-inv')).toHaveCount(1);
    await expect(page.locator('#vfd-bp-drive')).toHaveCount(1);
    await expect(page.locator('#vfd-bp-motor')).toHaveCount(1);

    // widget initial state: terminals/network, DI open → STOPPED
    await expect(page.locator('#vfdState')).toHaveText(/STOPPED/);

    // pressing the network RUN with run-source=terminals shows the classic-mistake anecdote
    await page.click('#vfdTryClassic');
    await page.click('#vfdNetRun');
    await expect(page.locator('#vfdState')).toHaveText(/STOPPED/);
    await expect(page.locator('.vfd-w-anecdote')).toBeVisible();

    // the all-network preset + a network RUN actually starts the drive
    await page.click('#vfdTryNetwork');
    await page.click('#vfdNetRun');
    await expect(page.locator('#vfdState')).toHaveText(/RUNNING/);
});
