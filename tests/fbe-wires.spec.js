// Function-Block Editor — wire render lifecycle. Regression guard for the
// bug where deleting one wire, or drawing a second one, left the OTHER wires
// present in the DOM but colourless (bare `.fbe-wire`, which sets no stroke)
// and therefore invisible. Root cause: refreshValues() cached the last-written
// wire class in `_lastCls` and skipped the write when it matched, but renderAll
// rebuilds each wire's `<path>` at the bare base class while `_lastCls` survived
// on the wire object — so the colour write was suppressed on every re-render.
//
// The assertion that catches the bug is the *visible-stroke* count, not the
// element count: the elements were always present (the data model was correct),
// they just had no stroke colour. We drive the same event handlers the UI uses
// (a plain `click` on pins / the inspector button) via dispatchEvent, which is
// deterministic against overlapping SVG geometry.

const { test, expect } = require('@playwright/test');

const URL = '/simulators/function-block-editor.html';

// { total: wire <path> elements, visible: those with a real stroke colour }
async function wireInfo(page) {
    return page.evaluate(() => {
        const vis = [...document.querySelectorAll('path.fbe-wire')];
        const visible = vis.filter((p) => {
            const s = getComputedStyle(p).stroke;
            return s && s !== 'none' && s !== 'rgba(0, 0, 0, 0)' && s !== 'transparent';
        }).length;
        return { total: vis.length, visible };
    });
}

test('deleting one wire keeps every remaining wire visible', async ({ page }) => {
    await page.goto(URL);
    await page.click('[data-example="freeze"]');
    await expect.poll(() => wireInfo(page)).toEqual({ total: 5, visible: 5 });

    // Select the first wire (click its hit path) and delete it via the
    // inspector button.
    await page.evaluate(() => {
        document.querySelector('.fbe-wire-hit')
            .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await expect(page.locator('.fbe-insp-del')).toHaveText('Delete wire');
    await page.click('.fbe-insp-del');

    // Four wires remain — and all four must still be drawn with a colour.
    // Before the fix this read { total: 4, visible: 0 }.
    await expect.poll(() => wireInfo(page)).toEqual({ total: 4, visible: 4 });
});

test('each new wire persists and stays visible as more are added', async ({ page }) => {
    await page.goto(URL);
    await page.click('[data-action="clear"]');
    await expect.poll(() => wireInfo(page)).toEqual({ total: 0, visible: 0 });

    // Two number sources (ANALOG IN, CONSTANT — both output pin 'O') feeding
    // the two inputs (A, B) of an ADD block.
    const addBlock = (label) => page.evaluate((l) => {
        [...document.querySelectorAll('.fbe-palette-btn')]
            .find((b) => b.textContent === l)
            .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }, label);
    await addBlock('ANALOG IN');
    await addBlock('CONSTANT');
    await addBlock('ADD');

    const ids = await page.evaluate(() =>
        [...document.querySelectorAll('.fbe-block')].map((e) => e.dataset.id));

    const clickPin = (blockId, pin, dir) => page.evaluate(({ blockId, pin, dir }) => {
        const blk = [...document.querySelectorAll('.fbe-block')]
            .find((e) => e.dataset.id === blockId);
        blk.querySelector('.fbe-pin-' + dir + '[data-pin="' + pin + '"]')
            .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }, { blockId, pin, dir });

    // Wire 1: source-0.O -> ADD.A
    await clickPin(ids[0], 'O', 'out');
    await clickPin(ids[2], 'A', 'in');
    await expect.poll(() => wireInfo(page)).toEqual({ total: 1, visible: 1 });

    // Wire 2: source-1.O -> ADD.B. Both wires must remain visible.
    // Before the fix wire 1 dropped to a bare `.fbe-wire` here → { total: 2, visible: 1 }.
    await clickPin(ids[1], 'O', 'out');
    await clickPin(ids[2], 'B', 'in');
    await expect.poll(() => wireInfo(page)).toEqual({ total: 2, visible: 2 });
});
