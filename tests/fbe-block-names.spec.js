// Per-instance block names on the function-block wiresheet — the
// `TAG · Name` head.
//
// Two halves, and the second is the one that matters most:
//
//   1. MECHANISM, on the public editor. A block with no name heads with
//      its type's full `label`, exactly as it did before names existed;
//      one named through the inspector heads `TAG · Name` as two spans
//      with a CSS separator; an over-budget name CLIPS rather than
//      wraps; clearing the field restores the label; Reset leaves the
//      name alone (it is authored config, not runtime state). The
//      zero-block-height invariant is asserted at every step —
//      .fbe-block-body sits AFTER the head in DOM order, so a head that
//      grows by one line moves every pin, every wire endpoint, and the
//      workbench comparator banks stack ~89.7px blocks on a 90px row
//      pitch with ~0.3px of clearance.
//
//   2. ANTI-DRIFT, on both workbench pages. Point id === FBE block id is
//      the load-bearing binding invariant, and a point's name already
//      lives in the ROSTER (it drives the statusbar chip and the
//      off-program window). ddcw-shell.js therefore derives the names it
//      hands the editor from `unit.points` instead of the program
//      literals carrying their own copies. This half re-reads the roster
//      off the page's own unit global and requires the rendered head to
//      agree, on EVERY program — so the day someone re-authors a name
//      into a block literal, or the derivation stops covering a program
//      switch, the two sources visibly disagree here.
//
// smoke.spec.js / fbe-wires.spec.js still match palette buttons by their
// full `label`, which is why `tag` was added ALONGSIDE `label` rather
// than replacing it; the palette assertions there are the guard on that.

const { test, expect } = require('@playwright/test');

const PUBLIC_URL = '/simulators/function-block-editor.html';
const WORKBENCHES = [
    { url: '/simulators/ddc-workbench-fcu.html', label: 'FCU' },
    { url: '/simulators/ddc-workbench.html', label: 'AHU' },
];

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    return errors;
}

// Everything about one rendered head, plus the block box it lives in.
function headState(page, id, scope) {
    return page.evaluate(([bid, sel]) => {
        const el = document.querySelector(`${sel} .fbe-block[data-id="${bid}"]`);
        if (!el) return null;
        const h = el.querySelector('.fbe-block-head');
        const tag = h.querySelector('.fbe-block-tag');
        const name = h.querySelector('.fbe-block-name');
        return {
            title: h.getAttribute('title'),
            tag: tag && tag.textContent,
            name: name && name.textContent,
            // A nameless head is ONE text node — the pre-names shape.
            textNodes: [...h.childNodes].filter((n) => n.nodeType === 3).length,
            text: h.textContent,
            // >0 means the head is clipping horizontally (ellipsis);
            // >0 vertically would mean it wrapped, which is the failure.
            clipX: h.scrollWidth - h.clientWidth,
            clipY: h.scrollHeight - h.clientHeight,
            blockH: +el.getBoundingClientRect().height.toFixed(2),
        };
    }, [id, scope || '#fbe-inner']);
}

test.describe('block names — mechanism (public editor)', () => {

    test('an unnamed block keeps the pre-names head exactly', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto(PUBLIC_URL);
        await expect(page.locator('.fbe-block').first()).toBeVisible();

        // No page in this PR authors a name, so every block on every
        // canned example must still head with its type label as a single
        // text node — no spans, no title.
        const heads = await page.evaluate(() =>
            [...document.querySelectorAll('#fbe-inner .fbe-block-head')].map((h) => ({
                text: h.textContent,
                spans: h.querySelectorAll('span').length,
                title: h.getAttribute('title'),
            })));
        expect(heads.length).toBeGreaterThan(0);
        expect(heads.filter((h) => h.spans !== 0 || h.title !== null)).toEqual([]);
        // …and the text is a real catalog label, not an empty string.
        const labels = await page.evaluate(() =>
            Object.values(window.FBE.BLOCKS).map((d) => d.label));
        heads.forEach((h) => expect(labels).toContain(h.text));

        expect(errors).toEqual([]);
    });

    test('every catalog entry has a tag, and no tag can overflow a head', async ({ page }) => {
        await page.goto(PUBLIC_URL);
        const cat = await page.evaluate(() =>
            Object.entries(window.FBE.BLOCKS).map(([t, d]) => [t, d.label, d.tag]));
        expect(cat.length).toBe(28);
        // A missing tag would render `undefined · Name`.
        expect(cat.filter(([, , tag]) => typeof tag !== 'string' || tag === '')).toEqual([]);
        // The head budget is 18 characters including the ' · ' separator,
        // so a tag longer than 5 leaves a constant no usable name at all.
        expect(cat.filter(([, , tag]) => tag.length > 5)).toEqual([]);
    });

    test('naming a block through the inspector heads it TAG · Name, at the same height', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto(PUBLIC_URL);
        await expect(page.locator('.fbe-block').first()).toBeVisible();

        // Drop a fresh block: it has no name, so it heads with the label.
        await page.click('#fbe-palette button:text-is("AND")');
        const id = await page.evaluate(() => {
            const els = document.querySelectorAll('#fbe-inner .fbe-block');
            return els[els.length - 1].dataset.id;
        });
        const bare = await headState(page, id);
        expect(bare.text).toBe('AND');
        expect(bare.textNodes).toBe(1);
        expect(bare.title).toBeNull();

        // The Name row is FIRST in the inspector (it identifies the block
        // rather than tuning it) and its label is properly associated.
        const nameInput = page.locator('#fbe-insp-name');
        await expect(nameInput).toHaveCount(1);
        expect(await page.evaluate(() =>
            document.querySelector('#fbe-inspector .fbe-insp-row').contains(
                document.getElementById('fbe-insp-name')))).toBe(true);
        await expect(page.locator('#fbe-inspector label[for="fbe-insp-name"]')).toHaveText('Name');
        // The name id must not collide with the fbe-p-<param> ids the
        // param rows generate alongside it.
        expect(await page.evaluate(() =>
            [...document.querySelectorAll('#fbe-inspector [id]')].map((e) => e.id)))
            .toEqual(['fbe-insp-name']);

        await nameInput.fill('Y1 Gate');
        const named = await headState(page, id);
        expect(named.tag).toBe('AND');
        expect(named.name).toBe('Y1 Gate');
        expect(named.title).toBe('AND · Y1 Gate');
        // The separator is CSS, not a text node — nothing to select, and
        // the empty alternative text keeps it out of the a11y tree.
        expect(named.textNodes).toBe(0);
        const sep = await page.evaluate((bid) => getComputedStyle(
            document.querySelector(`.fbe-block[data-id="${bid}"] .fbe-block-tag`), '::after').content, id);
        expect(sep).toContain('·');
        // THE invariant.
        expect(named.blockH).toBe(bare.blockH);
        // The inspector caption follows the name.
        await expect(page.locator('#fbe-inspector .fbe-insp-title')).toHaveText('Y1 Gate');

        // A structural edit re-renders the whole sheet — the name rides it.
        await page.click('#fbe-palette button:text-is("OR")');
        expect((await headState(page, id)).name).toBe('Y1 Gate');

        // Reset clears runtime state (timers, latches, the PID integral).
        // A name is authored config and must survive it.
        await page.click('#fbe-reset');
        expect((await headState(page, id)).name).toBe('Y1 Gate');

        expect(errors).toEqual([]);
    });

    test('an over-budget name clips instead of wrapping the block taller', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto(PUBLIC_URL);
        await expect(page.locator('.fbe-block').first()).toBeVisible();

        await page.click('#fbe-palette button:text-is("AND")');
        const id = await page.evaluate(() => {
            const els = document.querySelectorAll('#fbe-inner .fbe-block');
            return els[els.length - 1].dataset.id;
        });
        const bare = await headState(page, id);

        await page.locator('#fbe-insp-name').fill('Stage One Compressor Enable Permissive');
        const long = await headState(page, id);
        // Clipping horizontally is the DESIGNED outcome; clipping
        // vertically means white-space:nowrap stopped applying and the
        // head wrapped — measured at +15.9px on the block when it does.
        expect(long.clipX).toBeGreaterThan(0);
        expect(long.clipY).toBe(0);
        expect(long.blockH).toBe(bare.blockH);
        expect(await page.evaluate((bid) => getComputedStyle(
            document.querySelector(`.fbe-block[data-id="${bid}"] .fbe-block-head`)).textOverflow, id))
            .toBe('ellipsis');
        // Hover recovers what the ellipsis ate.
        expect(long.title).toBe('AND · Stage One Compressor Enable Permissive');

        // Blanking the field clears the name outright — the only way back
        // to the type label.
        await page.locator('#fbe-insp-name').fill('   ');
        const cleared = await headState(page, id);
        expect(cleared.text).toBe('AND');
        expect(cleared.name).toBeNull();
        expect(cleared.textNodes).toBe(1);
        expect(cleared.title).toBeNull();
        expect(cleared.blockH).toBe(bare.blockH);

        expect(errors).toEqual([]);
    });
});

// contrast-sweep.spec.js walks tests/pages.js, which is the sitemap —
// so it reaches function-block-editor.html but NOT the two hidden
// workbench pages, and on the public page no block carries a name yet.
// `.fbe-block-tag` therefore has NO blocking coverage from the site-wide
// sweep. This is that coverage: the tag is a NEW ink token on a
// background (--surface-2) the CLAUDE.md --text-dim figures were not
// measured on, so it gets its own AA assertion in both themes rather
// than a one-time hand measurement.
test.describe('block names — tag ink clears AA on the head background', () => {

    for (const scheme of ['dark', 'light']) {
        test(`${scheme} theme: .fbe-block-tag ≥ 4.5:1 on .fbe-block-head`, async ({ page }) => {
            await page.emulateMedia({ colorScheme: scheme });
            await page.goto(WORKBENCHES[0].url);
            await page.click('.tab-btn[data-tab="wiresheet"]');
            await expect(page.locator('.fbe-block-tag').first()).toBeVisible();

            const m = await page.evaluate(() => {
                const chan = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
                const lum = (p) => 0.2126 * chan(p[0]) + 0.7152 * chan(p[1]) + 0.0722 * chan(p[2]);
                const nums = (s) => s.match(/[\d.]+/g).map(Number);
                // Walk to the first opaque background, exactly as the
                // site-wide sweep resolves an effective background.
                const bgOf = (el) => {
                    let n = el;
                    while (n && n !== document.documentElement) {
                        const c = nums(getComputedStyle(n).backgroundColor);
                        if (c.length < 4 || c[3] > 0.999) return c.slice(0, 3);
                        n = n.parentElement;
                    }
                    return nums(getComputedStyle(document.documentElement).backgroundColor).slice(0, 3);
                };
                const tag = document.querySelector('#ddcw-fbe-inner .fbe-block-tag');
                const head = tag.closest('.fbe-block-head');
                const bg = bgOf(head);
                const ratio = (el) => {
                    const fg = nums(getComputedStyle(el).color);
                    const a = fg.length > 3 ? fg[3] : 1;
                    const over = [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
                    const l1 = lum(over), l2 = lum(bg);
                    return +((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2);
                };
                return {
                    theme: document.documentElement.getAttribute('data-theme'),
                    fontSize: parseFloat(getComputedStyle(tag).fontSize),
                    tag: ratio(tag),
                    name: ratio(document.querySelector('#ddcw-fbe-inner .fbe-block-name')),
                };
            });

            expect(m.theme).toBe(scheme);
            // 9.92px at weight 600 is SMALL text under WCAG — the 4.5:1
            // floor applies, not the 3:1 large-text one.
            expect(m.fontSize).toBeLessThan(18.66);
            expect(m.tag, `tag ink on the head in ${scheme}`).toBeGreaterThanOrEqual(4.5);
            expect(m.name, `name ink on the head in ${scheme}`).toBeGreaterThanOrEqual(4.5);
            // The name must stay the BRIGHTER of the two, or the hierarchy
            // the two spans exist for is inverted.
            expect(m.name).toBeGreaterThan(m.tag);
        });
    }
});

test.describe('block names — roster is the single source (anti-drift)', () => {

    for (const wb of WORKBENCHES) {
        test(`${wb.label}: every point-backed head names the point, on every program`, async ({ page }) => {
            const errors = watchErrors(page);
            await page.goto(wb.url);
            await page.click('.tab-btn[data-tab="wiresheet"]');
            await expect(page.locator('#ddcw-fbe-inner .fbe-block').first()).toBeVisible();

            // The roster, straight off the page's own unit global — the
            // same array the shell reads. (The FCU module exports it as
            // POINTS, the AHU as points.)
            const roster = await page.evaluate(() => {
                const u = window.DDCWAhuUnit || window.DDCWFcuUnit;
                const pts = u.POINTS || u.points;
                const out = {};
                pts.forEach((p) => { out[p.id] = p.name; });
                return out;
            });
            expect(Object.keys(roster).length).toBeGreaterThanOrEqual(10);

            const keys = await page.$$eval('#ddcw-program option',
                (os) => os.filter((o) => !o.disabled).map((o) => o.value));
            expect(keys.length).toBeGreaterThanOrEqual(1);

            let namedTotal = 0;
            for (const key of keys) {
                await page.selectOption('#ddcw-program', key);
                await expect(page.locator('#ddcw-fbe-inner .fbe-block').first()).toBeVisible();

                const rows = await page.evaluate(() =>
                    [...document.querySelectorAll('#ddcw-fbe-inner .fbe-block')].map((el) => {
                        const h = el.querySelector('.fbe-block-head');
                        const tag = h.querySelector('.fbe-block-tag');
                        const name = h.querySelector('.fbe-block-name');
                        return {
                            id: el.dataset.id,
                            tag: tag && tag.textContent,
                            name: name && name.textContent,
                            title: h.getAttribute('title'),
                            clipY: h.scrollHeight - h.clientHeight,
                        };
                    }));

                const mismatched = rows
                    .filter((r) => roster[r.id] !== undefined)
                    .filter((r) => r.name !== roster[r.id]);
                expect(mismatched, `${key}: head name ≠ roster name`).toEqual([]);

                // The converse: nothing that ISN'T a point may carry a
                // name on these sheets today. PR A authors none by hand,
                // so a name appearing on a non-point block means a second
                // source crept in.
                const strays = rows.filter((r) => r.name !== null && roster[r.id] === undefined);
                expect(strays, `${key}: named block with no matching point`).toEqual([]);

                // Every named head must also carry its full string on
                // `title`, and none of them may have wrapped.
                rows.filter((r) => r.name).forEach((r) => {
                    expect(r.title, `${key}/${r.id} title`).toBe(r.tag + ' · ' + r.name);
                    expect(r.clipY, `${key}/${r.id} wrapped`).toBe(0);
                });

                const named = rows.filter((r) => r.name !== null).length;
                // Non-vacuity: each program authors its IO points, so a
                // sheet with no named block means the stamp was lost.
                expect(named, `${key}: no point-backed block got a name`).toBeGreaterThan(0);
                namedTotal += named;
            }
            expect(namedTotal).toBeGreaterThan(0);
            expect(errors).toEqual([]);
        });
    }
});
