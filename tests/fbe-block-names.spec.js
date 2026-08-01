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
//      name alone (it is authored config, not runtime state). Every
//      canned example is swept, and the zero-block-height invariant is
//      asserted at every step — .fbe-block-body sits AFTER the head in
//      DOM order, so a head that grows by one line moves every pin and
//      every wire endpoint, and the AHU workbench stacks ~89.72px
//      blocks on a 90px row pitch — 0.28px of clearance, the tightest
//      column on any workbench sheet (no FCU column comes within 5px,
//      so the AHU is the binding case).
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
// The matchers differ and both hold the same rule: fbe-wires.spec.js
// compares `textContent === label` and this file uses `:text-is()` (both
// exact), smoke.spec.js uses `{ hasText: … }` (substring).
//
// ── How "the head did not grow" is asserted, and why not with clipY ──
// A head is auto-height. If `white-space: nowrap` ever stopped applying,
// the head would GROW to fit its second line rather than overflow it, so
// `scrollHeight - clientHeight` stays 0 through exactly the failure it
// looks like it is watching. Two assertions replace it, and each can
// actually go red:
//   • HEAD HEIGHT. Every head on a sheet renders one line, so all of
//     them share a clientHeight — and a named head keeps the height its
//     unnamed self had. Serving a styles.css with `white-space: normal`
//     appended takes the over-budget head 23 → 55px and its block
//     72.97 → 121.47px, failing both forms.
//   • HORIZONTAL CLIP. On the workbench sheets no head clips at all —
//     every roster name fits — and that is what keeps the height
//     invariant true there whatever `white-space` does. Which means the
//     height check alone would be VACUOUS on those pages: the same
//     override leaves them at a uniform 23px. The clip assertion is the
//     one with teeth there, firing the day a point is renamed past the
//     18-character head budget, long before anything could wrap.
//     (Non-vacuity measured by narrowing `.fbe-block` to 5rem: three
//     FCU heads clip on cool-2stage, and with nowrap knocked out too the
//     sheet's heights split 23 / 39.)

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
            // >0 means the head is clipping horizontally (ellipsis) —
            // the designed outcome for an over-budget name.
            clipX: h.scrollWidth - h.clientWidth,
            // The one-line invariant. See the header note.
            headH: h.clientHeight,
            blockH: +el.getBoundingClientRect().height.toFixed(2),
        };
    }, [id, scope || '#fbe-inner']);
}

// Every head on one sheet, reduced to the shape the invariants read.
function sheetHeads(page, scope) {
    return page.evaluate((sel) =>
        [...document.querySelectorAll(`${sel} .fbe-block-head`)].map((h) => ({
            text: h.textContent,
            spans: h.querySelectorAll('span').length,
            title: h.getAttribute('title'),
            headH: h.clientHeight,
            clipX: h.scrollWidth - h.clientWidth,
        })), scope || '#fbe-inner');
}

test.describe('block names — mechanism (public editor)', () => {

    test('an unnamed block keeps the pre-names head exactly, on every canned example', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto(PUBLIC_URL);
        await expect(page.locator('.fbe-block').first()).toBeVisible();

        const labels = await page.evaluate(() =>
            Object.values(window.FBE.BLOCKS).map((d) => d.label));
        const keys = await page.$$eval('#fbe-examples [data-example]',
            (as) => as.map((a) => a.dataset.example));
        expect(keys.length).toBeGreaterThanOrEqual(5);

        // The sheet the page opens on, then each chip in turn. Nothing on
        // the public editor authors a name, so every head must still be
        // its type label as a single text node — no spans, no title.
        const sheets = [['(initial)', await sheetHeads(page)]];
        for (const key of keys) {
            await page.click(`#fbe-examples [data-example="${key}"]`);
            await expect(page.locator('.fbe-block').first()).toBeVisible();
            sheets.push([key, await sheetHeads(page)]);
        }

        for (const [key, heads] of sheets) {
            expect(heads.length, `${key}: no blocks rendered`).toBeGreaterThan(0);
            expect(heads.filter((h) => h.spans !== 0 || h.title !== null),
                `${key}: a head split into spans or grew a title`).toEqual([]);
            // …and the text is a real catalog label, not an empty string.
            heads.forEach((h) => expect(labels, `${key}: head text`).toContain(h.text));
            // One line each, so one height across the sheet.
            expect([...new Set(heads.map((h) => h.headH))],
                `${key}: head heights are not uniform — a head wrapped`).toHaveLength(1);
        }

        expect(errors).toEqual([]);
    });

    test('every catalog entry has a tag, and no tag can overflow a head', async ({ page }) => {
        await page.goto(PUBLIC_URL);
        const cat = await page.evaluate(() =>
            Object.entries(window.FBE.BLOCKS).map(([t, d]) => [t, d.label, d.tag]));
        // A floor, not a pin: the catalog is expected to grow and fold
        // (a readout-type fold is queued), and the real invariants — tag
        // present, tag short enough — are asserted per entry below. The
        // floor only keeps a catalog that failed to load from passing
        // both of those vacuously.
        expect(cat.length).toBeGreaterThanOrEqual(20);
        // A missing tag would render `undefined · Name`.
        expect(cat.filter(([, , tag]) => typeof tag !== 'string' || tag === '')).toEqual([]);
        // The head budget is 18 characters including the ' · ' separator,
        // so a tag longer than 5 leaves a constant no usable name at all.
        expect(cat.filter(([, , tag]) => tag.length > 5)).toEqual([]);
        // A tag renders in the head, where a codepoint outside the
        // bundled mono's subset would be drawn by the visitor's system
        // fallback face. ge / le / ne are why this is pinned: their
        // labels keep ≥ / ≤ / ≠ and their tags spell them >= / <= / !=
        // (codebase-issues #255).
        expect(cat.filter(([, , tag]) => /[^\x20-\x7e]/.test(tag))).toEqual([]);
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
        // The separator is CSS, not a text node — nothing to select. Its
        // alt text is a SPACE, not empty: the two spans are adjacent with
        // no whitespace between them, so an empty alt would leave a
        // screen reader (and a copy) with "ANDY1 Gate". Pinned to the
        // exact computed pair rather than "contains a dot", because
        // dropping the alt is the regression this is here for.
        expect(named.textNodes).toBe(0);
        const sep = await page.evaluate((bid) => getComputedStyle(
            document.querySelector(`.fbe-block[data-id="${bid}"] .fbe-block-tag`), '::after').content, id);
        expect(sep).toBe('"·" / " "');
        // THE invariant, in both forms — see the header note on clipY.
        expect(named.headH).toBe(bare.headH);
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

    test('typing a name does not advance the simulation', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto(PUBLIC_URL);
        await expect(page.locator('.fbe-block').first()).toBeVisible();

        await page.click('#fbe-palette button:text-is("TON")');
        // Step pauses the loop and ticks exactly once, so the sheet is
        // now stopped at a known point.
        await page.click('#fbe-step');

        // The editor calls engine.tick() by property lookup, so counting
        // here counts every tick the editor asks for. A param edit is
        // SUPPOSED to tick (that is how a change propagates while
        // paused); a name edit must not, because nothing in evaluate()
        // reads a name and a TON / TOF / PID would age 0.1s per
        // keystroke.
        await page.evaluate(() => {
            window.__fbeTicks = 0;
            const orig = window.FBE.tick;
            window.FBE.tick = function (...args) {
                window.__fbeTicks += 1;
                return orig.apply(this, args);
            };
        });

        await page.locator('#fbe-insp-name').pressSequentially('Y1 Delay');
        expect(await page.evaluate(() => window.__fbeTicks),
            'a name edit ticked the engine').toBe(0);
        // The edit did land — otherwise zero ticks proves nothing.
        const named = await headState(page, await page.evaluate(() => {
            const els = document.querySelectorAll('#fbe-inner .fbe-block');
            return els[els.length - 1].dataset.id;
        }));
        expect(named.name).toBe('Y1 Delay');

        // The counter has teeth: a param edit on the same open inspector
        // still propagates, and Step still steps.
        await page.locator('#fbe-p-pt').fill('7');
        await page.click('#fbe-step');
        expect(await page.evaluate(() => window.__fbeTicks)).toBeGreaterThanOrEqual(2);

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
        // Clipping horizontally is the DESIGNED outcome. The failure is
        // the head growing extra lines instead, which shows up as a
        // taller head and a taller block — measured 23 → 55px and
        // 72.97 → 121.47px when `white-space: nowrap` is overridden.
        expect(long.clipX).toBeGreaterThan(0);
        expect(long.headH).toBe(bare.headH);
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
//
// The measurement below is the site-wide sweep's, not a simplification
// of it: effective opacity is the product from the sample up to <html>,
// and the backdrop is every TRANSLUCENT background layer composited in
// turn until an opaque one terminates the walk. Both matter here — the
// selected head paints `--accent-dim`, which is rgba at 0.14 (dark) /
// 0.10 (light), so a walk that skipped to the first OPAQUE ancestor
// would measure the ink against the wrong colour entirely and report a
// ratio the reader never sees. (Compositing a separate `opacity` is the
// exact blind spot contrast-sweep.spec.js's header records as having
// hidden `.bit-idx` at 1.83:1 behind a declared 4.83:1.)
const MEASURE_HEAD = ({ scope, wantSelected }) => {
    const parse = (s) => {
        const m = (s || '').match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
        if (p.length < 3 || p.some((n) => !isFinite(n))) return null;
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const over = (fg, bg) => ({
        r: fg.r * fg.a + bg.r * (1 - fg.a),
        g: fg.g * fg.a + bg.g * (1 - fg.a),
        b: fg.b * fg.a + bg.b * (1 - fg.a),
        a: 1,
    });
    const lum = (c) => {
        const f = (v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const ratio = (a, b) => {
        const la = lum(a), lb = lum(b);
        return +(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)).toFixed(2));
    };

    const sel = wantSelected ? '.fbe-block-sel ' : '';
    const name = document.querySelector(`${scope} ${sel}.fbe-block-name`);
    if (!name) return { error: `no ${sel || 'unselected '}named head under ${scope}` };
    const head = name.closest('.fbe-block-head');
    const tag = head.querySelector('.fbe-block-tag');

    const chain = [];
    for (let n = head; n && n.nodeType === 1; n = n.parentElement) chain.unshift(n);

    // Effective opacity at each link, and the cumulative product.
    let opacity = 1;
    const opacityAt = [];
    for (const n of chain) {
        const o = parseFloat(getComputedStyle(n).opacity);
        opacity *= isFinite(o) ? o : 1;
        opacityAt.push(opacity);
    }

    // Backdrop: head outward, stacking translucent layers, stopping at
    // the first effectively opaque one.
    const stack = [];
    for (let i = chain.length - 1; i >= 0; i--) {
        const c = parse(getComputedStyle(chain[i]).backgroundColor);
        const eff = c ? c.a * opacityAt[i] : 0;
        if (eff > 0) stack.push({ ...c, a: eff });
        if (eff >= 0.999) break;
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) bg = over(stack[i], bg);

    const inkRatio = (el) => {
        const fg = parse(getComputedStyle(el).color);
        return ratio(over({ ...fg, a: fg.a * opacity }, bg), bg);
    };

    return {
        theme: document.documentElement.getAttribute('data-theme'),
        fontSize: parseFloat(getComputedStyle(tag).fontSize),
        selected: head.closest('.fbe-block').classList.contains('fbe-block-sel'),
        // The compositing factor this sample was taken through. Reported
        // so the arm can assert it — anything under 1 means the page was
        // still animating and the ratios below describe a frame no
        // reader ever sits on. See HEAD_SETTLED.
        opacity,
        // How many layers the backdrop needed — 1 means nothing
        // translucent was composited, which would make the selected arm
        // below a copy of the unselected one.
        layers: stack.length,
        bg: [bg.r, bg.g, bg.b].map(Math.round),
        tag: inkRatio(tag),
        name: inkRatio(name),
    };
};

// ── the measurement has to wait for PAINT, and toBeVisible() does not ──
// MEASURE_HEAD is a paint measurement, and paint on this page is not
// settled at the moment the sheet becomes visible. `.tool-card` carries
// `animation: fadeUp 0.5s <delay> ease both` (styles.css:1188-1191 — the
// FCU workbench's card resolves to the 0.16s step, so a 0.66s window
// from first render) and fadeUp's first keyframe is `opacity: 0`
// (styles.css:1719). Playwright's
// visibility is a non-empty box plus `visibility`/`display` — it says
// NOTHING about opacity — so the arm was free to sample mid-ramp, where
// the ink composites down onto its own backdrop and the ratio collapses
// toward 1.0.
//
// Which is not a CI-hardware story, and reading it as one sends you
// looking in the wrong place. It is measurement-time versus fade-window:
// the arm reaches the sample at ~1.7-1.9s on this box (past the window,
// green) and at ~430-930ms on a CI runner (inside it, red). Slower
// hardware is SAFER here; a fast one is what loses. Measured on the
// undoctored local build, 5 of 12 raw samples still landed inside —
// 1.10 / 1.20 / 1.35 / 1.78 against the 4.81 the settled page reads —
// so the margin was always thin, CI just spends it.
//
// contrast-sweep.spec.js hit this already and settles for it — see its
// header ("~20,000 'failures' that were nav dropdowns and reveal
// animations caught in flight") and its `settle()`, which finishes or
// cancels every running animation before walking. This arm exists
// BECAUSE that sweep cannot reach a hidden page, and it inherited the
// measurement without the settle. It does not simply copy `settle()`
// though: `finish()` throws
// on an infinite animation and the sweep falls back to `cancel()`, and
// this page runs an infinite `fbe-signal-flow` while the sim is live.
// A sweep that is done with the page can cancel its animations; this
// arm goes on to click a block and measure the SELECTED state, so it
// waits the reveal out instead of editing it away.
//
// Nothing else in this file needs the guard, and that was measured
// rather than assumed: the other arms read clientHeight, scrollWidth −
// clientWidth and getBoundingClientRect().height, fadeUp animates only
// `opacity` and a `translateY`, and neither touches a layout metric or
// the HEIGHT of a rect. Sampled at effective opacity 0.030 and at 1.0,
// every one of those numbers is identical (23 / 0 / 72.97).
const SETTLE_MS = 10000;
const HEAD_SETTLED = ({ scope, wantSelected }) => {
    const sel = wantSelected ? '.fbe-block-sel ' : '';
    const name = document.querySelector(`${scope} ${sel}.fbe-block-name`);
    if (!name) return false;
    for (let n = name.closest('.fbe-block-head'); n && n.nodeType === 1; n = n.parentElement) {
        // The exact quantity MEASURE_HEAD composites, link by link.
        if (parseFloat(getComputedStyle(n).opacity) < 1) return false;
        // …and nothing still in flight that could move a number the
        // measurement reads. Deliberately narrowed to the three paint
        // properties it consumes rather than "any running animation":
        // this page runs an INFINITE wire-flow animation while the sim
        // is live (`fbe-signal-flow`), and a blanket check would either
        // hang on it or have to special-case it by name.
        const busy = n.getAnimations().some((a) => a.playState === 'running' && a.effect
            && a.effect.getKeyframes().some((k) =>
                'opacity' in k || 'color' in k || 'backgroundColor' in k));
        if (busy) return false;
    }
    return true;
};

// Settle, then measure REGARDLESS. The catch is load-bearing: a guard
// that threw on timeout would convert "the page never finished
// animating" into a skipped measurement wearing a failure's clothes,
// and a guard that silently returned would let a genuinely bad ink
// colour pass whenever the settle stalled. Falling through keeps the
// assertions the only thing that can pass or fail this arm — and
// MEASURE_HEAD now reports the `opacity` it composited, which the arm
// pins at 1, so an un-settled sample names itself instead of arriving
// disguised as a contrast defect.
async function settleHead(page, opts) {
    await page.waitForFunction(HEAD_SETTLED, opts, { timeout: SETTLE_MS }).catch(() => {});
}

test.describe('block names — head ink clears AA in both themes and both states', () => {

    for (const scheme of ['dark', 'light']) {
        test(`${scheme} theme: tag and name ≥ 4.5:1, unselected and selected`, async ({ page }) => {
            await page.emulateMedia({ colorScheme: scheme });
            await page.goto(WORKBENCHES[0].url);
            await page.click('.tab-btn[data-tab="wiresheet"]');
            await expect(page.locator('.fbe-block-tag').first()).toBeVisible();

            const scope = '#ddcw-fbe-inner';
            await settleHead(page, { scope, wantSelected: false });
            const idle = await page.evaluate(MEASURE_HEAD, { scope, wantSelected: false });

            expect(idle.error).toBeUndefined();
            expect(idle.theme).toBe(scheme);
            expect(idle.selected).toBe(false);
            expect(idle.opacity, 'sampled mid-animation — the ratios below are a frame, not the page').toBe(1);
            // 9.92px at weight 600 is SMALL text under WCAG — the 4.5:1
            // floor applies, not the 3:1 large-text one.
            expect(idle.fontSize).toBeLessThan(18.66);
            expect(idle.tag, `tag ink on the head in ${scheme}`).toBeGreaterThanOrEqual(4.5);
            expect(idle.name, `name ink on the head in ${scheme}`).toBeGreaterThanOrEqual(4.5);
            // The name must stay the BRIGHTER of the two, or the hierarchy
            // the two spans exist for is inverted.
            expect(idle.name).toBeGreaterThan(idle.tag);

            // ── selected ──
            // `.fbe-block-sel .fbe-block-head` repaints to --accent on a
            // translucent --accent-dim wash, and the tag gives up its dim
            // step (`color: inherit`) rather than put a second ink on the
            // wash. So both spans land on the SAME ratio here, and the
            // margin is thin in light — measured ≈4.81 dark / ≈4.62 light
            // against the 4.5 floor. This is the arm that turns those two
            // hand computations into something CI re-runs.
            const id = await page.evaluate((s) =>
                document.querySelector(`${s} .fbe-block-name`).closest('.fbe-block').dataset.id, scope);
            await page.click(`${scope} .fbe-block[data-id="${id}"] .fbe-block-head`);
            await expect(page.locator(`${scope} .fbe-block[data-id="${id}"]`)).toHaveClass(/fbe-block-sel/);

            // Same guard on this side. The class landing is a DOM fact
            // and says nothing about the repaint it triggers, so if the
            // selected head ever grows a colour/background transition
            // this arm would race it exactly as the idle one raced the
            // card fade — and would race it INVISIBLY, since both spans
            // still resolve to a plausible ratio part-way through a
            // colour interpolation. Cheap now, and it is the assertion
            // that would otherwise be written after the next flake.
            await settleHead(page, { scope, wantSelected: true });
            const picked = await page.evaluate(MEASURE_HEAD, { scope, wantSelected: true });
            expect(picked.error).toBeUndefined();
            expect(picked.selected).toBe(true);
            expect(picked.opacity, 'sampled mid-animation — the ratios below are a frame, not the page').toBe(1);
            // Non-vacuity for the compositing: the selected backdrop is
            // built from more than one layer, so a walk that stopped at
            // the first opaque ancestor would have measured something
            // else.
            expect(picked.layers, 'selected head backdrop is not composited').toBeGreaterThan(1);
            expect(picked.bg).not.toEqual(idle.bg);
            expect(picked.tag, `selected tag ink in ${scheme}`).toBeGreaterThanOrEqual(4.5);
            expect(picked.name, `selected name ink in ${scheme}`).toBeGreaterThanOrEqual(4.5);
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
                            headH: h.clientHeight,
                            clipX: h.scrollWidth - h.clientWidth,
                        };
                    }));

                const mismatched = rows
                    .filter((r) => roster[r.id] !== undefined)
                    .filter((r) => r.name !== roster[r.id]);
                expect(mismatched, `${key}: head name ≠ roster name`).toEqual([]);

                // The converse: nothing that ISN'T a point may carry a
                // name on these sheets today. The workbench program
                // literals author no `name:` keys as of this change — the
                // shell stamps roster names onto point-backed blocks and
                // nothing else — so a name on a non-point block means a
                // second source crept in. (Hand-authored names on the
                // non-IO logic are a queued follow-up; this assertion is
                // what that lane will have to update deliberately.)
                const strays = rows.filter((r) => r.name !== null && roster[r.id] === undefined);
                expect(strays, `${key}: named block with no matching point`).toEqual([]);

                // Every named head carries its full string on `title`.
                rows.filter((r) => r.name).forEach((r) => {
                    expect(r.title, `${key}/${r.id} title`).toBe(r.tag + ' · ' + r.name);
                });

                // ── the head must stay one line ──
                // Uniform heights across the sheet: a head that wrapped
                // would be the tall one among its neighbours.
                expect([...new Set(rows.map((r) => r.headH))],
                    `${key}: head heights are not uniform — a head wrapped`).toHaveLength(1);
                // And the property that keeps that true here regardless
                // of `white-space`: no roster name overruns its head. This
                // is the assertion with teeth on these pages — it fires
                // the day a point is renamed past the 18-character head
                // budget, well before anything can wrap.
                expect(rows.filter((r) => r.clipX > 0).map((r) => `${r.id}: ${r.title}`),
                    `${key}: a roster name overran the head budget`).toEqual([]);

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
