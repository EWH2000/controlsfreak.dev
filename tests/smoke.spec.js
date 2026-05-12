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
    { name: 'education — pid basics',  url: 'http://localhost:8000/education/pid-basics.html' },
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
