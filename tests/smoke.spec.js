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

test('psychrometric chart computes a state on load', async ({ page }) => {
    await page.goto('http://localhost:8000/tools/psychrometric-chart.html');
    // default 75°F / 50% RH → wet-bulb ≈ 62.6, humidity ratio ≈ 64.6 gr/lb
    await expect(page.locator('#roWb')).toHaveText('62.6');
    await expect(page.locator('#roW')).toHaveText('64.6');
    // an impossible state mutes the readouts
    await page.selectOption('#psyMode', 'wb');
    await page.fill('#psyDb', '70');
    await page.fill('#psySecond', '80');   // wet-bulb above dry-bulb
    await expect(page.locator('#roWb')).toHaveText('—');
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

    // switching units rescales the temperature field in place (no recompute error)
    await page.fill('#thTemp', '50');
    await page.click('#thUnitC');
    await expect(page.locator('#thTempLbl')).toHaveText('Temperature (°C)');
    expect(parseFloat(await page.locator('#thTemp').inputValue())).toBeCloseTo(10, 0);   // 50 °F ≈ 10 °C
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
});

test('hydronic loops page renders its three SVG schematics', async ({ page }) => {
    await page.goto('http://localhost:8000/education/hydronic-loops.html');
    const svgs = page.locator('main svg.hd-svg');
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
    const svgs = page.locator('main svg.lp-svg');
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
