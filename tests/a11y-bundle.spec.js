// Behavioral pins for the audit-2026-06 keyboard/ARIA bundle
// (#7 live regions, #8 tab pattern, #9 bit grid, #10 psy pills,
// #58 scroll regions). The #6 mobile-sheet focus test lives in
// nav-menu.spec.js with the other sheet behavior.

const { test, expect } = require('@playwright/test');

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    return errors;
}

test('tabs expose the ARIA tab pattern and switchTab keeps aria-selected in sync (#8)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/signal-scaling.html');

    const strip = page.locator('.tabs').first();
    await expect(strip).toHaveAttribute('role', 'tablist');
    const active = strip.locator('.tab-btn.active');
    await expect(active).toHaveAttribute('role', 'tab');
    await expect(active).toHaveAttribute('aria-selected', 'true');

    // The active button controls the visible pane; the pane points back.
    const paneId = await active.getAttribute('aria-controls');
    const pane = page.locator('#' + paneId);
    await expect(pane).toHaveAttribute('role', 'tabpanel');
    await expect(pane).toHaveAttribute('aria-labelledby', await active.getAttribute('id'));

    // Switching flips aria-selected along with the classes. Pin the
    // target by data-tab — a live :not(.active) locator would re-resolve
    // to a different button after the click.
    const otherName = await strip.locator('.tab-btn:not(.active)').first().getAttribute('data-tab');
    const other = strip.locator(`.tab-btn[data-tab="${otherName}"]`);
    await other.click();
    await expect(other).toHaveAttribute('aria-selected', 'true');
    await expect(strip.locator('[aria-selected="true"]')).toHaveCount(1);

    expect(errors, 'tab pattern should log no errors').toEqual([]);
});

test('modbus bit grid is keyboard-operable buttons with state names (#9)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/modbus-register-viewer.html');

    // Default register is 0xABCD — bit 0 starts at 1; assert relative to
    // the initial state rather than assuming zeros.
    const bit0 = page.locator('#bit-grid button[data-idx="0"]');
    await expect(bit0).toHaveAttribute('aria-pressed', 'true');
    await expect(bit0).toHaveAttribute('aria-label', 'Bit 0, value 1');
    const before = parseInt(await page.inputValue('#mod-dec'), 10);

    // Keyboard toggle: focus + Enter flips the bit, updates the decimal
    // readout, and focus survives the grid rebuild.
    await bit0.focus();
    await page.keyboard.press('Enter');
    const fresh = page.locator('#bit-grid button[data-idx="0"]');
    await expect(fresh).toHaveAttribute('aria-pressed', 'false');
    await expect(fresh).toHaveAttribute('aria-label', 'Bit 0, value 0');
    await expect(fresh).toBeFocused();
    await expect(page.locator('#mod-dec')).toHaveValue(String(before - 1));

    expect(errors, 'bit grid should log no errors').toEqual([]);
});

test('psy state-point pills carry pressed state and off-stage names (#10)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/psychrometric-chart.html');

    const pills = page.locator('.psy-pills');
    await expect(pills).toHaveAttribute('role', 'group');
    expect(await page.locator('[role="tablist"] .psy-pill').count()).toBe(0);

    await expect(page.locator('.psy-pill[data-step="oa"]')).toHaveAttribute('aria-pressed', 'true');
    await page.click('.psy-pill[data-step="ra"]');
    await expect(page.locator('.psy-pill[data-step="ra"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.psy-pill[aria-pressed="true"]')).toHaveCount(1);

    // Off stages say so in their accessible name and update with the
    // toggle. The HC stage's on/off toggle lives inside the HC editor
    // panel, which only renders while the HC pill is selected — select
    // it first, then flip the styled .psy-toggle label.
    const hc = page.locator('.psy-pill[data-step="hc"]');
    await expect(hc).toHaveAttribute('aria-label', /\(stage off\)$/);
    await hc.click();
    await page.locator('label.psy-toggle:has(#hc-on)').click();
    await expect(hc).not.toHaveAttribute('aria-label', /stage off/);

    expect(errors, 'psy pills should log no errors').toEqual([]);
});

test('tool Output sections are live status regions (#7)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/signal-scaling.html');
    const region = page.locator('section[role="status"]').first();
    await expect(region).toHaveAttribute('aria-atomic', 'false');
    await expect(region.locator('.ps-section-label')).toHaveText('Output');
    expect(errors, 'output live region should log no errors').toEqual([]);
});

test('pid-tuner announces the settled metrics once, debounced (#7)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/simulators/pid-tuner.html');
    const sr = page.locator('#pid-sr-status');
    await expect(sr).toHaveAttribute('aria-live', 'polite');
    // The initial sim populates it after the 800ms debounce.
    await expect(sr).toContainText('Overshoot', { timeout: 3000 });
    await expect(sr).toContainText('steady-state error');
    expect(errors, 'pid live region should log no errors').toEqual([]);
});

test('reference-table scroller and FBE canvas are keyboard-reachable regions (#58)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/tools/thermistor-calculator.html');
    const scroller = page.locator('#th-rt-scroll');
    await expect(scroller).toHaveAttribute('tabindex', '0');
    await expect(scroller).toHaveAttribute('role', 'region');
    await expect(scroller).toHaveAttribute('aria-labelledby', 'th-rt-title');

    await page.goto('/simulators/function-block-editor.html');
    const canvas = page.locator('#fbe-canvas');
    await expect(canvas).toHaveAttribute('tabindex', '0');
    await expect(canvas).toHaveAttribute('role', 'region');
    await expect(canvas).toHaveAttribute('aria-label', /canvas/i);

    expect(errors, 'scroll regions should log no errors').toEqual([]);
});

test('mutually-exclusive chip rows keep aria-pressed in sync (#143)', async ({ page }) => {
    const errors = watchErrors(page);

    // pid-tuner "Try a Tuning" presets: one pressed at a time, synced on click.
    await page.goto('/simulators/pid-tuner.html');
    await expect(page.locator('#pid-preset-decent')).toHaveAttribute('aria-pressed', 'true');
    await page.click('#pid-preset-aggr');
    await expect(page.locator('#pid-preset-aggr')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#pid-preset-decent')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-preset][aria-pressed="true"]')).toHaveCount(1);

    // refrigerant-pt lookup-by toggle syncs the same way.
    await page.goto('/tools/refrigerant-pt.html');
    await expect(page.locator('#rf-pt-by-p')).toHaveAttribute('aria-pressed', 'true');
    await page.click('#rf-pt-by-t');
    await expect(page.locator('#rf-pt-by-t')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#rf-pt-by-p')).toHaveAttribute('aria-pressed', 'false');

    expect(errors, 'chip-row aria sync should log no errors').toEqual([]);
});

test('controller-wiring presets are momentary actions, not aria-pressed toggles (#142)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/simulators/controller-wiring.html');
    // These "Load a panel" buttons have no persistent selection, so they
    // deliberately carry no aria-pressed (the #142 miscategorization call).
    await expect(page.locator('.cw-preset[aria-pressed]')).toHaveCount(0);
    await page.click('.cw-preset[data-preset="ahu"]');
    await expect(page.locator('.cw-preset[aria-pressed]')).toHaveCount(0);
    expect(errors, 'cw presets should log no errors').toEqual([]);
});
