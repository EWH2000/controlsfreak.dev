// The gloss / glossary component — html/scripts/gloss.js, the `gloss`
// transform + `glossaryGuard` collection in .eleventy.js, and the
// GLOSS TOOLTIP block in styles.css.
//
// Three arms, split by what each one can actually see:
//
//   1. BUILD OUTPUT — the transform's contract on the pilot page:
//      every mark wired to a panel by aria-describedby, one panel per
//      DISTINCT term, the runtime injected, and nothing shipped to
//      pages with no marks. Includes an anti-vacuity floor, because
//      every behavioral assertion below would pass vacuously against a
//      page whose marks silently stopped rendering.
//   2. BEHAVIOR — focus-open, tap-toggle, one-at-a-time, Escape,
//      outside-dismiss, driven against the built page.
//   3. DATA FILE — glossary.js's shape, checked pure-Node the way
//      data-integrity.spec.js checks the hand-touched data tables.
//
// WHAT IS DELIBERATELY NOT HERE: an arm that runs Eleventy with a
// broken input to prove the guards throw. There is NO repo precedent
// for that — navCategoryGuard, educationSequenceGuard, flowStaticGuard
// and quizOrderGuard are none of them covered by a spec; a build guard
// is proven by the build, and `npm run build` is what CI and the
// Cloudflare deploy both run. All five gloss guard arms (unknown id,
// non-button trigger, mark on an owning page, stale owners path,
// non-kebab entry id) were exercised by hand against this branch and
// each one failed the build with a named offender. Arm 1's
// anti-vacuity floor is what keeps the guards from decaying into a
// silent pass between those hand checks.

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const PILOT = '/education/timers-and-delays.html';
const glossary = require('../html/_data/glossary.js');

// ── 1. Build output ──────────────────────────────────────────────────

test('every gloss mark is wired to a rendered panel', async ({ page }) => {
    await page.goto(PILOT);

    const triggers = page.locator('button[data-gloss]');
    const count = await triggers.count();
    // Anti-vacuity: the pilot page carries marks. If a marking pass or a
    // regex regression silently stopped rendering them, every assertion
    // below would still be green against zero elements.
    expect(count, 'pilot page carries gloss triggers').toBeGreaterThan(0);

    const terms = new Set();
    for (let i = 0; i < count; i++) {
        const trigger = triggers.nth(i);
        const id = await trigger.getAttribute('data-gloss');
        expect(glossary[id], `data-gloss="${id}" resolves in the glossary`).toBeTruthy();
        terms.add(id);
        // The build owns this attribute — it is the whole no-JS
        // accessibility story, so it is not optional on any trigger.
        await expect(trigger).toHaveAttribute('aria-describedby', `gloss-tip-${id}`);
        await expect(trigger).toHaveAttribute('type', 'button');
    }

    // One panel per DISTINCT term, not one per mark.
    const panels = page.locator('.gloss-tip');
    await expect(panels).toHaveCount(terms.size);
    for (const id of terms) {
        const panel = page.locator(`#gloss-tip-${id}`);
        await expect(panel).toHaveAttribute('role', 'tooltip');
        await expect(panel).toBeHidden();
        // The headword is the <dfn> — the panel is the definition, so
        // that is where the element belongs (the trigger marks a USE).
        await expect(panel.locator('.gloss-tip-term dfn'))
            .toHaveText(glossary[id].term);
    }

    // Panels live at body end, outside <main>: position:fixed must never
    // inherit a future ancestor transform.
    const outsideMain = await page.evaluate(() =>
        [...document.querySelectorAll('.gloss-tip')].every((el) => !el.closest('main')));
    expect(outsideMain, 'panels sit outside <main>').toBe(true);

    const script = page.locator('script[src^="/scripts/gloss.js"]');
    await expect(script).toHaveCount(1);
});

test('a page with no marks ships no gloss payload', async ({ page }) => {
    // The transform returns unmarked pages byte-identical, so the other
    // ~90 pages pay nothing — not even a no-op parse.
    await page.goto('/tools/signal-scaling.html');
    await expect(page.locator('.gloss-tip')).toHaveCount(0);
    await expect(page.locator('script[src^="/scripts/gloss.js"]')).toHaveCount(0);
    await expect(page.locator('button[data-gloss]')).toHaveCount(0);
});

// ── 2. Behavior ──────────────────────────────────────────────────────

test('focus opens a gloss and Escape dismisses it in place', async ({ page }) => {
    await page.goto(PILOT);
    const trigger = page.locator('button[data-gloss]').first();
    const id = await trigger.getAttribute('data-gloss');
    const panel = page.locator(`#gloss-tip-${id}`);

    await trigger.focus();
    await expect(panel).toBeVisible();
    await expect(trigger).toHaveClass(/gloss-open/);

    // 1.4.13 dismissible: Escape closes without moving pointer OR focus.
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    const stillFocused = await trigger.evaluate((el) => document.activeElement === el);
    expect(stillFocused, 'Escape leaves focus on the trigger').toBe(true);
});

test('tap toggles a gloss open and closed', async ({ page }) => {
    await page.goto(PILOT);
    const trigger = page.locator('button[data-gloss]').first();
    const id = await trigger.getAttribute('data-gloss');
    const panel = page.locator(`#gloss-tip-${id}`);

    // The click-after-focus trap: focus fires first and opens the panel,
    // so a naive toggle would close it on the very same gesture.
    await trigger.click();
    await expect(panel).toBeVisible();

    await trigger.click();
    await expect(panel).toBeHidden();
});

test('only one gloss is open at a time', async ({ page }) => {
    await page.goto(PILOT);
    const ids = await page.evaluate(() =>
        [...new Set([...document.querySelectorAll('button[data-gloss]')]
            .map((el) => el.dataset.gloss))]);
    expect(ids.length, 'pilot page carries more than one distinct term')
        .toBeGreaterThan(1);

    const first = page.locator(`button[data-gloss="${ids[0]}"]`).first();
    const second = page.locator(`button[data-gloss="${ids[1]}"]`).first();

    await first.click();
    await expect(page.locator(`#gloss-tip-${ids[0]}`)).toBeVisible();

    await second.click();
    await expect(page.locator(`#gloss-tip-${ids[1]}`)).toBeVisible();
    await expect(page.locator(`#gloss-tip-${ids[0]}`)).toBeHidden();
    await expect(page.locator('.gloss-tip:visible')).toHaveCount(1);
});

test('a pointerdown outside the gloss closes it', async ({ page }) => {
    await page.goto(PILOT);
    const trigger = page.locator('button[data-gloss]').first();
    const id = await trigger.getAttribute('data-gloss');
    const panel = page.locator(`#gloss-tip-${id}`);

    await trigger.click();
    await expect(panel).toBeVisible();

    await page.locator('h1').click();
    await expect(panel).toBeHidden();
});

test('the panel is positioned inside the viewport', async ({ page }) => {
    await page.goto(PILOT);
    const trigger = page.locator('button[data-gloss]').first();
    await trigger.click();

    const fits = await page.evaluate(() => {
        const el = document.querySelector('.gloss-tip:not([hidden])');
        const r = el.getBoundingClientRect();
        return {
            left: r.left >= 0,
            right: r.right <= document.documentElement.clientWidth,
            top: r.top >= 0,
            bottom: r.bottom <= document.documentElement.clientHeight,
        };
    });
    expect(fits).toEqual({ left: true, right: true, top: true, bottom: true });
});

// ── 3. Data file ─────────────────────────────────────────────────────

test('glossary entries hold their shape', () => {
    const ids = Object.keys(glossary);
    expect(ids.length, 'the glossary is populated').toBeGreaterThan(0);

    for (const id of ids) {
        const entry = glossary[id];
        // Kebab-case: these ids become DOM ids (gloss-tip-<id>), so the
        // house id rule is a hard constraint, not a style preference.
        expect(id, `${id} is kebab-case`).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        expect(typeof entry.term, `${id}.term is a string`).toBe('string');
        expect(entry.term.trim().length, `${id}.term is non-empty`).toBeGreaterThan(0);
        expect(typeof entry.def, `${id}.def is a string`).toBe('string');
        expect(entry.def.trim().length, `${id}.def is non-empty`).toBeGreaterThan(0);
        expect(Array.isArray(entry.owners), `${id}.owners is an array`).toBe(true);

        for (const owner of entry.owners) {
            // The §7.4 suppression list has to name real files or it stops
            // suppressing silently. The build resolves these against the
            // page collection; here they are resolved against the tree, so
            // a rename fails at both altitudes.
            expect(owner, `${id} owner ${owner} is a rooted .html path`)
                .toMatch(/^\/[a-z0-9/-]+\.html$/);
            const file = path.join(__dirname, '..', 'html', owner.replace(/^\//, ''));
            expect(fs.existsSync(file), `${id} owner ${owner} exists on disk`).toBe(true);
        }
    }
});
