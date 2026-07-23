// Function-Block Editor — behavioral coverage for the shared editor module
// (window.FBEEditor.createEditor, /scripts/fbe-editor.js) once the tool was
// extracted out of the page's inline IIFE. These are the interactions the
// two existing FBE specs don't already exercise:
//
//   - dragging a block by its title bar re-routes the wires attached to it
//     (the drawWires-on-pointermove path, driven by real mouse events);
//   - Escape cancels a pending wire WITHOUT exiting fullscreen (the FB
//     handler stopPropagation()s so the window-level fullscreen listener
//     never sees it), but a second Escape with nothing pending bubbles and
//     DOES exit — the codebase-issues #110 / fullscreen-toggle.js contract;
//   - every canned example loads with no console error (the module reads
//     the page-owned EXAMPLES literal through createEditor);
//   - Reset re-zeros a stateful block (an SR latch holding state with no
//     held input drops back to its initial output).
//
// Same posture as fbe-wires.spec.js: drive the real handlers via
// dispatched events / real mouse input against the built page, and assert
// on observable DOM state, not internals. smoke.spec.js and
// fbe-wires.spec.js cover block-id sequencing, param editing, wire counts,
// type-mismatch rejection, and the run/pause/step bar, so those aren't
// repeated here.

const { test, expect } = require('@playwright/test');

const URL = '/simulators/function-block-editor.html';

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    return errors;
}

// The 'd' geometry of every visible wire, joined — a cheap fingerprint of
// the wire routing that changes when any endpoint moves.
function wireRouting(page) {
    return page.evaluate(() =>
        [...document.querySelectorAll('path.fbe-wire')]
            .map((p) => p.getAttribute('d'))
            .join('|'));
}

test('dragging a block by its head re-routes its wires', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(URL);
    // Economizer loads by default — six blocks, five wires. The comparator
    // (cmp) has both an incoming pair (oat.O, oasp.O) and an outgoing wire
    // (cmp.Q → gate.A), so moving it must re-route several segments.
    await expect(page.locator('.fbe-block')).toHaveCount(6);
    await expect(page.locator('path.fbe-wire')).toHaveCount(5);

    const before = await wireRouting(page);

    const box = await page.locator('.fbe-block[data-id="cmp"] .fbe-block-head').boundingBox();
    // Real mouse drag: pointerdown on the head, move well past the 3px
    // threshold so it registers as a drag (not a select-click), release.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 70, { steps: 8 });
    await page.mouse.up();

    // The wire endpoints followed the block, so the routing fingerprint
    // must differ — and no wire may have vanished in the process.
    await expect.poll(() => wireRouting(page)).not.toBe(before);
    await expect(page.locator('path.fbe-wire')).toHaveCount(5);

    expect(errors, 'block drag should log no page / console errors').toEqual([]);
});

test('Escape cancels a pending wire without exiting fullscreen, then bubbles', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(URL);
    await expect(page.locator('.fbe-block')).toHaveCount(6);

    // Enter fullscreen through the site toggle's own API (class-based, no
    // Fullscreen API) so body.has-fullscreen-tool is set — that's the flag
    // the window-level Escape listener gates on.
    await page.evaluate(() => window.Fullscreen.toggle(document.querySelector('.tool-card')));
    await expect(page.locator('.tool-card.is-fullscreen')).toHaveCount(1);

    // Start a wire from an output pin — the module marks compatible input
    // pins with .fbe-pin-target and holds a pending source.
    await page.evaluate(() => {
        document.querySelector('.fbe-block[data-id="oat"] .fbe-pin-out')
            .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await expect(page.locator('.fbe-pin-target').first()).toBeVisible();

    // Escape #1: a wire is pending, so the editor claims the keypress
    // (stopPropagation) — the wire cancels and fullscreen SURVIVES.
    await page.keyboard.press('Escape');
    await expect(page.locator('.fbe-pin-target')).toHaveCount(0);
    await expect(page.locator('.tool-card.is-fullscreen')).toHaveCount(1);

    // Escape #2: nothing pending, so the press bubbles to the window
    // listener and exits fullscreen.
    await page.keyboard.press('Escape');
    await expect(page.locator('.tool-card.is-fullscreen')).toHaveCount(0);

    expect(errors, 'fullscreen Escape handling should log no page / console errors').toEqual([]);
});

test('every canned example loads without a console error', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(URL);

    const keys = await page.evaluate(() =>
        [...document.querySelectorAll('#fbe-examples [data-example]')]
            .map((a) => a.dataset.example));
    // The page ships seven programs; assert the set is non-trivial so a
    // silently-empty chip row can't make this pass vacuously.
    expect(keys.length).toBeGreaterThanOrEqual(7);

    for (const key of keys) {
        await page.evaluate((k) => {
            document.querySelector(`#fbe-examples [data-example="${k}"]`)
                .dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }, key);
        // Each example is a non-empty sheet — wait for it to render before
        // loading the next, so a per-example throw is attributed correctly.
        await expect(page.locator('.fbe-block').first()).toBeVisible();
    }

    expect(errors, 'loading every example should log no page / console errors').toEqual([]);
});

test('Reset re-zeros a stateful block (SR latch drops its held state)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(URL);

    // Freeze-stat: a freeze contact SETS an SR latch that drives the alarm
    // and (inverted) the fan. The latch is set-dominant and holds Q with no
    // held input, so it's the clean case for exercising Reset.
    await page.click('[data-example="freeze"]');
    await expect(page.locator('.fbe-block[data-id="alarm"] .fbe-block-val')).toHaveText('FALSE');
    await expect(page.locator('.fbe-block[data-id="fan"] .fbe-block-val')).toHaveText('TRUE');

    // Trip the freeze contact → latch sets → alarm TRUE, fan FALSE.
    await page.locator('.fbe-block[data-id="fz"] .fbe-block-val').click();
    await expect(page.locator('.fbe-block[data-id="alarm"] .fbe-block-val')).toHaveText('TRUE');
    await expect(page.locator('.fbe-block[data-id="fan"] .fbe-block-val')).toHaveText('FALSE');

    // Release the contact → S drops but the latch HOLDS its state, so the
    // alarm stays latched with no live input driving it.
    await page.locator('.fbe-block[data-id="fz"] .fbe-block-val').click();
    await expect(page.locator('.fbe-block[data-id="alarm"] .fbe-block-val')).toHaveText('TRUE');

    // Reset clears every block's runtime state and re-scans: the latch's
    // stored Q is wiped, S and R are both false, so Q returns to its
    // initial FALSE — alarm FALSE, fan TRUE again.
    await page.click('#fbe-reset');
    await expect(page.locator('.fbe-block[data-id="alarm"] .fbe-block-val')).toHaveText('FALSE');
    await expect(page.locator('.fbe-block[data-id="fan"] .fbe-block-val')).toHaveText('TRUE');

    expect(errors, 'reset should log no page / console errors').toEqual([]);
});
