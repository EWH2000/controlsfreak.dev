const { test, expect } = require('@playwright/test');

// Shared with the other specs: capture pageerror + console.error.
function watchErrors(page) {
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    return errors;
}

const URL = '/simulators/pid-tuner.html';

test('Equipment selector swaps the process scene', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(URL);

    // med is the default
    await expect(page.locator('#pid-eq-scene-med')).toBeVisible();
    await expect(page.locator('#pid-eq-scene-fast')).toBeHidden();

    await page.selectOption('#pid-proc', 'fast');
    await expect(page.locator('#pid-eq-scene-fast')).toBeVisible();
    await expect(page.locator('#pid-eq-scene-med')).toBeHidden();
    await expect(page.locator('#pid-eq-scene-slow')).toBeHidden();
    await expect(page.locator('#pid-eq-scene-vhigh')).toBeHidden();
    // exactly one scene visible at a time
    await expect(page.locator('.pid-eq-scene:visible')).toHaveCount(1);

    expect(errors, 'scene swap should log no errors').toEqual([]);
});

test('spoiler gate hides the cheat sheets while metrics + chart stay visible', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(URL);

    // Collapsed by default: the reference table + symptom table live inside the
    // closed <details> and are not rendered…
    await expect(page.locator('.pid-spoiler .ref-table')).toBeHidden();
    await expect(page.locator('.pid-spoiler .ref-table-dense')).toBeHidden();
    // …but the chart and the metrics — feedback on your own tuning, not the
    // answer key — stay visible regardless.
    await expect(page.locator('#pid-canvas')).toBeVisible();
    await expect(page.locator('.bit-readouts')).toBeVisible();

    // Reveal opens the cheat sheets.
    await page.locator('.pid-spoiler summary').click();
    await expect(page.locator('.pid-spoiler .ref-table')).toBeVisible();
    await expect(page.locator('.pid-spoiler .ref-table-dense')).toBeVisible();

    expect(errors, 'spoiler toggle should log no errors').toEqual([]);
});

test('loop-detail sidenote reports the right loop speed per equipment', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(URL);

    // Deterministic (not animation-dependent): the sidenote reads τ/dead/ratio
    // from the engine's process preset for whichever equipment is selected.
    await page.selectOption('#pid-proc', 'med');
    await expect(page.locator('#pid-loop-detail')).toContainText('medium loop');
    await expect(page.locator('#pid-loop-detail')).toContainText('dead ÷ τ ≈ 0.13');

    await page.selectOption('#pid-proc', 'vhigh');
    await expect(page.locator('#pid-loop-detail')).toContainText('dead-time-dominant');
    await expect(page.locator('#pid-loop-detail')).toContainText('dead ÷ τ ≈ 0.50');

    expect(errors, 'loop-detail update should log no errors').toEqual([]);
});

test('playhead drives the live sensor readout over time', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(URL);

    // An aggressive tune makes the response swing hard, so the sensor LCD takes
    // several distinct values as the playhead sweeps — proof the loop animates.
    await page.click('#pid-preset-aggr');
    const seen = new Set();
    for (let i = 0; i < 12; i++) {
        seen.add((await page.locator('#pid-eq-sensor-v').textContent()).trim());
        await page.waitForTimeout(200);
    }
    expect(seen.size, 'sensor readout should change as the playhead sweeps').toBeGreaterThan(1);

    expect(errors, 'playhead should log no errors').toEqual([]);
});

// audit-2026-06 #41: the feature's core contract — "the actuator tracks
// the commanded output" — was asserted nowhere. Reduced motion gives a
// deterministic one-shot frame (the rAF playhead never schedules and
// now=0 forces the throttled text readout through), so the gauge text,
// the gauge fill, and the actuator geometry can be compared exactly.
// (Deliberately NO units-flip assertion on the sensor LCD — it is
// documented as staying canonical.)
test('output gauge text matches the fill, and the actuator opens with the output', async ({ page }) => {
    const errors = watchErrors(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(URL);

    // med (default) = chilled/hot-water valve scene. The settled frame
    // carries a real nonzero output for the default tune.
    const pct = parseInt(await page.locator('#pid-eq-out-pct').textContent(), 10);
    expect(Number.isInteger(pct)).toBe(true);
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);
    expect(pct).toBeGreaterThan(0);

    // Gauge fill --pct and the text readout are the same number.
    const fillPct = await page.locator('#pid-eq-out-fill')
        .evaluate(el => el.style.getPropertyValue('--pct'));
    expect(fillPct).toBe(pct + '%');

    // Valve actuator: fill height is proportional to output — open
    // (height > 0) while output > 0, and never taller than its track.
    const valve = page.locator('#pid-eq-med-valve');
    const h = parseFloat(await valve.getAttribute('height'));
    const H = parseFloat(await valve.evaluate(el => el.dataset.h));
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThanOrEqual(H);
    expect(h / H).toBeCloseTo(pct / 100, 1);

    expect(errors, 'gauge/actuator contract should log no errors').toEqual([]);
});

test('animated output percent stays within 0–100 across the sweep', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(URL);
    await page.click('#pid-preset-aggr');
    for (let i = 0; i < 8; i++) {
        const pct = parseInt(await page.locator('#pid-eq-out-pct').textContent(), 10);
        expect(pct).toBeGreaterThanOrEqual(0);
        expect(pct).toBeLessThanOrEqual(100);
        await page.waitForTimeout(150);
    }
    expect(errors, 'animated sweep should log no errors').toEqual([]);
});

test('every equipment option shows exactly one visible scene', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(URL);
    for (const key of ['fast', 'med', 'slow', 'vhigh']) {
        await page.selectOption('#pid-proc', key);
        await expect(page.locator('#pid-eq-scene-' + key)).toBeVisible();
        await expect(page.locator('.pid-eq-scene:visible')).toHaveCount(1);
    }
    expect(errors, 'scene loop should log no errors').toEqual([]);
});

test('reduced motion — scene paints one static final frame, no animation', async ({ page }) => {
    const errors = watchErrors(page);
    // Emulate the OS preference directly (Playwright forces 'no-preference' by
    // default, and test.use({reducedMotion}) doesn't reach matchMedia in this
    // runner version — emulateMedia does, before the page's load-time read).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(URL);
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
        'page should emulate prefers-reduced-motion').toBe(true);
    await page.selectOption('#pid-proc', 'fast');     // fan-VFD scene
    await page.click('#pid-preset-aggr');

    // The sensor is populated (not the '—' placeholder) and the fan got its
    // one-shot transform write (parked, not spinning)…
    await expect(page.locator('#pid-eq-sensor-v')).not.toHaveText('—');
    await expect(page.locator('#pid-eq-fast-fan'))
        .toHaveAttribute('transform', /rotate/);

    // …and nothing moves: the output gauge reads the same across a beat (the
    // playhead rAF never schedules under reduced motion).
    const pctAt = () => page.locator('#pid-eq-out-fill').evaluate(el => el.style.getPropertyValue('--pct'));
    const a = await pctAt();
    await page.waitForTimeout(600);
    expect(await pctAt(), 'output should be static under reduced motion').toBe(a);

    expect(errors, 'reduced-motion render should log no errors').toEqual([]);
});
