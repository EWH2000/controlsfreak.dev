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
//      outside-dismiss, the preview/pinned split and the scroll rules,
//      driven against the built page. Every gesture test PARKS its
//      trigger mid-viewport first; see park() for why that is
//      correctness rather than hygiene.
//   3. DATA FILE — glossary.js's shape, checked pure-Node the way
//      data-integrity.spec.js checks the hand-touched data tables.
//
// WHAT IS DELIBERATELY NOT HERE: an arm that runs Eleventy with a
// broken input to prove the guards throw. There is NO repo precedent
// for that — navCategoryGuard, educationSequenceGuard, flowStaticGuard
// and quizOrderGuard are none of them covered by a spec; a build guard
// is proven by the build, and `npm run build` is what CI and the
// Cloudflare deploy both run. All SEVEN gloss guard arms (unknown id,
// non-button trigger, missing type="button", mark on an owning page,
// gloss-tip-<id> namespace collision, stale owners path, non-kebab
// entry id) were exercised by hand against this branch and each one
// failed the build with a named offender; the comment-masking arm was
// verified in the other direction, by confirming a commented-out
// trigger builds clean and injects nothing. Arm 1's
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

// Park the trigger mid-viewport BEFORE interacting. Two reasons, both
// real rather than defensive: focusing or clicking an offscreen trigger
// makes the browser scroll it into view, and a page scroll is a
// deliberate dismissal in this component — so without this a "click
// twice" assertion is really measuring whether Playwright happened to
// re-scroll between the clicks. Centering first makes every gesture
// below scroll-free and therefore deterministic.
//
// `behavior: 'instant'` is LOAD-BEARING: styles.css sets
// `html { scroll-behavior: smooth }`, so the default animates, and an
// in-flight smooth scroll keeps emitting scroll events straight through
// the click that follows — dismissing the panel that click just opened.
// That is the component behaving correctly against a test that hadn't
// finished scrolling; it cost one suite run to see. The settle wait is
// belt to that braces.
//
// And ONE PARK IS NOT ENOUGH — hardened 2026-08-12 after this file
// failed 5-for-5 on one full-suite run, 1-in-11 isolated, and 25 of
// 110 under `--repeat-each=10` load. Instrumented timelines split the
// mechanism in two, and both halves end the same way — a scroll event
// the reader never made, arriving after gloss.js's one-frame arming
// grace, dismissing the panel the gesture just opened. Permanently:
// nothing reopens it, so the assert sees `hidden` for its whole 5s.
//
//   A. The park itself raced layout. At domcontentloaded+150ms the
//      page can still be GROWING; the trigger measures in-viewport,
//      scrollIntoView no-ops (a probe caught scrollY still 0 after
//      parking), late layout pushes the trigger below the fold, and
//      the CLICK inherits the scrolling — smooth, per styles.css, and
//      one captured timeline shows it emitting scroll events for
//      ~270ms: panel SHOWN at +287ms, dismissed at +310ms, easing
//      curve settling ~250ms later. The settle loop below closes this
//      half: re-scroll until the rect is stable across two frames AND
//      fully in-viewport, so the gesture that follows needs no scroll.
//   B. The ENVIRONMENT scrolled mid-test. Under worker load, font
//      swaps and other late reflow land seconds after navigation;
//      content growing above the parked trigger makes Chromium's
//      scroll anchoring adjust scrollTop, which fires a native scroll
//      event mid-gesture — indistinguishable by design from a reader
//      scroll, so the component correctly closes. That one mechanism
//      explained EVERY failing row in the repeat-load profile, hover
//      and tap included. The style tag below closes this half:
//      `overflow-anchor: none` stops anchoring from ever moving
//      scrollTop under the test, and `scroll-behavior: auto` makes any
//      residual scroll single-frame (inside the arming grace) instead
//      of a 20-frame animation. Neither un-tests the component — the
//      scroll-dismissal contract is asserted with DISPATCHED events
//      ("a scroll inside the panel", below), which a frozen scroll
//      ecology does not touch; what the freeze removes is the
//      environment's ability to fire that contract into unrelated
//      gesture assertions.
//
// The REAL keyboard path was probed the same day and survives without
// any of this: a Tab-focus scroll is instant and lands inside the
// one-rAF grace exactly as gloss.js's armDismiss() comment intends.
// Everything here is test hygiene, not a page workaround.
async function park(trigger) {
    const page = trigger.page();
    await page.addStyleTag({
        content: 'html { scroll-behavior: auto !important; overflow-anchor: none !important; }',
    });
    await page.evaluate(() => document.fonts.ready);
    for (let i = 0; i < 20; i++) {
        await trigger.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await new Promise((resolve) => setTimeout(resolve, 100));
        const settled = await trigger.evaluate((el) => {
            const before = el.getBoundingClientRect();
            return new Promise((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    const after = el.getBoundingClientRect();
                    resolve(Math.abs(after.top - before.top) < 1
                        && after.top >= 0
                        && after.bottom <= window.innerHeight);
                }));
            });
        });
        if (settled) return;
    }
    throw new Error('park(): trigger never settled fully in-viewport');
}

test('focus opens a gloss and Escape dismisses it in place', async ({ page }) => {
    await page.goto(PILOT);
    const trigger = page.locator('button[data-gloss]').first();
    await park(trigger);
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

// The toggle is asserted on a TOUCH context, deliberately. Tap is the
// whole touch story for this component, and a touch device emits no
// mouseover at all — so there is no hover-intent timer in play and the
// two taps are decided purely by the pre-gesture state. Asserting the
// same thing with a mouse click means asserting against a pointer that
// is also, unavoidably, hovering: the gesture is real and covered (see
// the pin test below, which hovers ON PURPOSE), but it is the wrong
// instrument for pinning toggle semantics.
test.describe('touch', () => {
    test.use({ hasTouch: true });

    test('tap toggles a gloss open and closed', async ({ page }) => {
        await page.goto(PILOT);
        const trigger = page.locator('button[data-gloss]').first();
        await park(trigger);
        const id = await trigger.getAttribute('data-gloss');
        const panel = page.locator(`#gloss-tip-${id}`);

        // The click-after-focus trap: focus fires first and opens the
        // panel, so a naive toggle would close it on the same gesture.
        await trigger.tap();
        await expect(panel).toBeVisible();

        // Settle past HOVER_CLOSE_MS before the second tap. A tap MUST
        // leave the panel pinned — open and staying open — and under
        // host load the synthesized compatibility mouse events a touch
        // tap generates can leave a preview-close pending. Asserting the
        // settled state is the real contract and is deterministic;
        // tapping again mid-flight measures the scheduler instead. If a
        // tap ever failed to pin, this wait turns that into a reliable
        // failure rather than a load-dependent one.
        await page.waitForTimeout(350);
        await expect(panel).toBeVisible();

        await trigger.tap();
        await expect(panel).toBeHidden();
    });
});

// The regression test for the hover/click race. Before the preview/
// pinned split, a click was decided against LIVE state, so a pointer
// that dwelled past the 120ms hover-intent delay opened a preview and
// the click then closed it — the same gesture that opened the panel
// when the user was quick. Measured both ways on this page before the
// fix. Dwelling well past the threshold is the whole point of the test,
// so it must not be shortened into insignificance.
test('a click on a hover-opened gloss pins it rather than closing it', async ({ page }) => {
    await page.goto(PILOT);
    const trigger = page.locator('button[data-gloss]').first();
    await park(trigger);
    const id = await trigger.getAttribute('data-gloss');
    const panel = page.locator(`#gloss-tip-${id}`);

    await trigger.hover();
    await expect(panel).toBeVisible();          // the hover PREVIEW

    await trigger.click();
    await expect(panel).toBeVisible();          // pinned, not toggled shut

    // Pinned means the pointer wandering off no longer dismisses it —
    // that is exactly what separates a pin from a preview.
    await page.mouse.move(2, 2);
    await page.waitForTimeout(400);             // longer than HOVER_CLOSE_MS
    await expect(panel).toBeVisible();

    await trigger.click();                      // and a second click still closes
    await expect(panel).toBeHidden();
});

test('a hover preview closes on its own when the pointer leaves', async ({ page }) => {
    await page.goto(PILOT);
    const trigger = page.locator('button[data-gloss]').first();
    await park(trigger);
    const id = await trigger.getAttribute('data-gloss');
    const panel = page.locator(`#gloss-tip-${id}`);

    await page.mouse.move(2, 2);                // start off the trigger
    await trigger.hover();
    await expect(panel).toBeVisible();

    await page.mouse.move(2, 2);
    await expect(panel).toBeHidden();
});

test('a scroll inside the panel does not dismiss it', async ({ page }) => {
    await page.goto(PILOT);
    const trigger = page.locator('button[data-gloss]').first();
    await park(trigger);
    const id = await trigger.getAttribute('data-gloss');
    const panel = page.locator(`#gloss-tip-${id}`);

    await trigger.click();
    await expect(panel).toBeVisible();

    // .gloss-tip provisions overflow-y:auto and place() can hand it a
    // max-height, so this is reachable markup: a reader scrolling the
    // definition is using the panel, not dismissing it.
    await panel.evaluate((el) => el.dispatchEvent(new Event('scroll', { bubbles: true })));
    await expect(panel).toBeVisible();

    // A PAGE scroll still dismisses — that is the design.
    await page.evaluate(() => document.dispatchEvent(new Event('scroll', { bubbles: true })));
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

    await park(first);
    await first.click();
    await expect(page.locator(`#gloss-tip-${ids[0]}`)).toBeVisible();

    await park(second);
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

    await park(trigger);
    await trigger.click();
    await expect(panel).toBeVisible();

    await page.locator('h1').click();
    await expect(panel).toBeHidden();
});

test('the panel is positioned inside the viewport', async ({ page }) => {
    await page.goto(PILOT);
    const trigger = page.locator('button[data-gloss]').first();
    await park(trigger);
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
