// C1 (2026-08-14) — the PID Parameter Translator's pivot math IS the tool:
// every readout is derived in the page IIFE (no shared engine), so an
// inverted ratio or a dropped unit conversion would ship silently through
// smoke's load check. Pin the behavior DOM-driven, with a pageerror watch:
// the seed pivot, the series round-trip (the page's worked example run
// forward), a mixed-unit entry landing on the same pivot, the Td > Ti/4
// no-series boundary (and the exact-quarter edge just inside it), and the
// integral-off / negative-entry handling. Display assertions pin the
// parseFloat(v.toPrecision(4)) format the page renders with.

const { test, expect } = require('@playwright/test');

const URL = '/tools/pid-parameter-translator.html';

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    return errors;
}

test('seed computes the ISA pivot on load (the worked example in reverse)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(URL);

    // Pivot readouts: ISA Kc 2.5 · reset 0.2 rep/min · Td 0.8 min.
    await expect(page.locator('#ppt-out-kc')).toHaveText('2.5');
    await expect(page.locator('#ppt-out-pb')).toHaveText('40');
    await expect(page.locator('#ppt-out-rep')).toHaveText('0.2');
    await expect(page.locator('#ppt-out-ti-min')).toHaveText('5');
    await expect(page.locator('#ppt-out-ti-s')).toHaveText('300');
    await expect(page.locator('#ppt-out-td-min')).toHaveText('0.8');
    await expect(page.locator('#ppt-out-td-s')).toHaveText('48');

    // Cross-form table: the seed's series and parallel restatements.
    await expect(page.locator('#ppt-c-p-ser')).toHaveText('Kc′ 2');
    await expect(page.locator('#ppt-c-i-ser')).toHaveText('Ti′ 4 min');
    await expect(page.locator('#ppt-c-d-ser')).toHaveText('Td′ 1 min');
    await expect(page.locator('#ppt-c-p-par')).toHaveText('Kp 2.5');
    await expect(page.locator('#ppt-c-i-par')).toHaveText('Ki 0.5 /min · 0.008333 /s');
    await expect(page.locator('#ppt-c-d-par')).toHaveText('Kd 2 min · 120 s');

    // A representable tuning shows no series-impossible note, no callout.
    await expect(page.locator('#ppt-series-note')).toBeHidden();
    await expect(page.locator('#ppt-callout')).toBeHidden();

    expect(errors, 'no page errors').toEqual([]);
});

test('series entry and mixed-unit standard entry land on the same pivot', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(URL);

    // The worked example forward: interacting-form gain 2.0 · Ti′ 4.0 min
    // · Td′ 1.0 min → ISA Kc 2.5 · 0.2 rep/min · Td 0.8 min.
    await page.selectOption('#ppt-form', 'series');
    await page.selectOption('#ppt-i-unit', 'timin');
    await page.fill('#ppt-p-val', '2');
    await page.fill('#ppt-i-val', '4');
    await page.fill('#ppt-d-val', '1');
    await expect(page.locator('#ppt-out-kc')).toHaveText('2.5');
    await expect(page.locator('#ppt-out-rep')).toHaveText('0.2');
    await expect(page.locator('#ppt-out-td-min')).toHaveText('0.8');
    // The assumption line names the form the entries are being read as.
    await expect(page.locator('#ppt-assume-form')).toContainText('series (interacting)');

    // Same loop entered as standard-form PB 40 % + Ti 300 s + Td 48 s —
    // every dialect knob moved at once, same pivot out.
    await page.selectOption('#ppt-form', 'isa');
    await page.selectOption('#ppt-p-unit', 'pb');
    await page.selectOption('#ppt-i-unit', 'tisec');
    await page.selectOption('#ppt-d-unit', 'tdsec');
    await page.fill('#ppt-p-val', '40');
    await page.fill('#ppt-i-val', '300');
    await page.fill('#ppt-d-val', '48');
    await expect(page.locator('#ppt-out-kc')).toHaveText('2.5');
    await expect(page.locator('#ppt-out-pb')).toHaveText('40');
    await expect(page.locator('#ppt-out-rep')).toHaveText('0.2');
    await expect(page.locator('#ppt-out-ti-min')).toHaveText('5');
    await expect(page.locator('#ppt-out-td-min')).toHaveText('0.8');

    expect(errors, 'no page errors').toEqual([]);
});

test('Td past Ti/4 has no series equivalent; Td at exactly Ti/4 does', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(URL);

    // Kc 1 · Ti 2 min · Td 1 min → 4·Td/Ti = 2, past the series ceiling:
    // series cells dash out, the note shows, ISA + parallel stay live.
    await page.selectOption('#ppt-i-unit', 'timin');
    await page.fill('#ppt-p-val', '1');
    await page.fill('#ppt-i-val', '2');
    await page.fill('#ppt-d-val', '1');
    await expect(page.locator('#ppt-c-p-ser')).toHaveText('—');
    await expect(page.locator('#ppt-c-i-ser')).toHaveText('—');
    await expect(page.locator('#ppt-c-d-ser')).toHaveText('—');
    await expect(page.locator('#ppt-series-note')).toBeVisible();
    await expect(page.locator('#ppt-out-kc')).toHaveText('1');
    await expect(page.locator('#ppt-out-td-min')).toHaveText('1');
    await expect(page.locator('#ppt-c-i-par')).toHaveText('Ki 0.5 /min · 0.008333 /s');
    await expect(page.locator('#ppt-c-d-par')).toHaveText('Kd 1 min · 60 s');

    // Ti 4 min puts Td at exactly Ti/4 — the boundary is valid (F′ = ½):
    // Kc′ 0.5 · Ti′ 2 min · Td′ 2 min, and the note hides again.
    await page.fill('#ppt-i-val', '4');
    await expect(page.locator('#ppt-c-p-ser')).toHaveText('Kc′ 0.5');
    await expect(page.locator('#ppt-c-i-ser')).toHaveText('Ti′ 2 min');
    await expect(page.locator('#ppt-c-d-ser')).toHaveText('Td′ 2 min');
    await expect(page.locator('#ppt-series-note')).toBeHidden();

    expect(errors, 'no page errors').toEqual([]);
});

test('integral off reads "off" everywhere; negative entries mute with a callout', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(URL);

    // Reset 0 → integral off: 'off' in the Ti/reset rows, Ki 0, and the
    // series column collapses onto the ISA numbers (no interaction left).
    await page.fill('#ppt-i-val', '0');
    await expect(page.locator('#ppt-out-rep')).toHaveText('off');
    await expect(page.locator('#ppt-out-ti-min')).toHaveText('off');
    await expect(page.locator('#ppt-out-ti-s')).toHaveText('off');
    await expect(page.locator('#ppt-c-i-std')).toHaveText('off');
    await expect(page.locator('#ppt-c-i-ser')).toHaveText('off');
    await expect(page.locator('#ppt-c-i-par')).toHaveText('Ki 0');
    await expect(page.locator('#ppt-c-p-ser')).toHaveText('Kc′ 2.5');
    await expect(page.locator('#ppt-c-d-ser')).toHaveText('Td′ 0.8 min');

    // Negative derivative → everything mutes and the callout explains.
    await page.fill('#ppt-d-val', '-1');
    await expect(page.locator('#ppt-out-kc')).toHaveText('—');
    await expect(page.locator('#ppt-out-td-min')).toHaveText('—');
    await expect(page.locator('#ppt-c-p-std')).toHaveText('—');
    await expect(page.locator('#ppt-callout')).toBeVisible();
    await expect(page.locator('#ppt-series-note')).toBeHidden();

    expect(errors, 'no page errors').toEqual([]);
});
