// Regression tests for /scripts/fullscreen-toggle.js.
//
// #106: the toggle is loaded site-wide and exposes window.Fullscreen.
// targetFor() accepts any data-fullscreen-target selector and setState()
// toggles is-fullscreen on that arbitrary element — but exitActive() (the
// ESC path) used to query the fixed `.tool-card.is-fullscreen`, so a
// non-.tool-card target had no keyboard exit. Generalized to exit
// whatever is-fullscreen.
//
// #163: the fullscreen overlay covers the chrome visually but the nav /
// footer / back-link kept their tab order — Shift+Tab from the card
// landed focus on covered links with no visible indicator. setState()
// now inerts the background (tagged data-fs-inert) on enter and restores
// it exactly on every exit path. The #palette stays live (it layers
// above fullscreen at z-index 1000), and search.js's palette-close skips
// data-fs-inert carriers so it can't strip the containment.
//
// #288: the same walk reached the .gloss-tip panels, which the `gloss`
// build transform injects at BODY END — the level applyInert() always
// reaches. A panel is not covered chrome: its trigger sits in the prose
// INSIDE the fullscreened card and stays live, so inerting the panel
// broke WCAG 1.4.13's hoverable prong. The exemption is the palette's,
// applied to a second overlay.
//
// ── WHY THE #288 ARMS DRIVE FULLSCREEN THROUGH THE API ───────────────
// NO LIVE PAGE CARRIES BOTH TODAY, and that is the whole reason the
// defect was latent: /education/timers-and-delays.html is the only page
// with gloss marks and it has no fullscreen button, while every
// [data-fullscreen-target] page is gloss-free. So these arms run on the
// pilot GLOSS page — real build-injected panels, the real gloss.js
// runtime, real triggers in the card's prose — and supply the missing
// half by calling window.Fullscreen.toggle() on that page's own
// .tool-card. That is one public-API call, the same idiom the #106 arm
// above already uses for its synthetic target, and it models the future
// page exactly: a fullscreened card whose prose holds gloss triggers.
// Nothing here fabricates gloss markup; when a gloss-marked tool page
// does ship, delete the toggle() call and point these at its button.
//
// The arms assert HIT-TESTABILITY rather than choreographing the
// hover→travel gesture, because hit-testability is precisely what
// `inert` removes and precisely what the grace period needs — and it is
// deterministic, where the gesture needs gloss.spec.js's whole park()
// apparatus to be stable. The end-to-end gesture was measured out of
// band on the built site, before and after: pointer travel from the
// trigger onto the open panel drew 0 mouseover events and the panel
// closed after the 200ms grace; with the exemption, 1 mouseover and the
// panel survives. (The aria-describedby DESCRIPTION was measured
// identical in both states — inert never took the screen-reader half.)

const { test, expect } = require('@playwright/test');

const GLOSS_PILOT = '/education/timers-and-delays.html';

// Enter fullscreen on the card that HOLDS the gloss triggers.
const enterFullscreen = (page) => page.evaluate(
    () => window.Fullscreen.toggle(document.querySelector('.tool-card')));

const inertSnapshot = (page) => page.evaluate(() => ({
    nav: document.querySelector('nav.site-nav').hasAttribute('inert'),
    panelsInert: [...document.querySelectorAll('.gloss-tip')]
        .filter((el) => el.hasAttribute('inert')).length,
    panelsTagged: [...document.querySelectorAll('.gloss-tip')]
        .filter((el) => el.hasAttribute('data-fs-inert')).length,
    panelCount: document.querySelectorAll('.gloss-tip').length,
}));

test('ESC exits a non-.tool-card fullscreen target (#106)', async ({ page }) => {
    await page.goto('/');   // fullscreen-toggle.js is loaded site-wide

    const entered = await page.evaluate(() => {
        // A synthetic NON-.tool-card target (a <section>), entered fullscreen
        // through the public toggle the same way a future page would.
        const el = document.createElement('section');
        el.id = 'fs-probe';
        document.body.appendChild(el);
        window.Fullscreen.toggle(el);
        return {
            el: el.classList.contains('is-fullscreen'),
            body: document.body.classList.contains('has-fullscreen-tool'),
        };
    });
    expect(entered.el).toBe(true);
    expect(entered.body).toBe(true);

    // ESC must exit it. The old exitActive() matched only .tool-card, so the
    // section + body class would stay stuck.
    await page.keyboard.press('Escape');

    const after = await page.evaluate(() => ({
        el: document.getElementById('fs-probe').classList.contains('is-fullscreen'),
        body: document.body.classList.contains('has-fullscreen-tool'),
    }));
    expect(after.el, 'the non-.tool-card target exited').toBe(false);
    expect(after.body, 'body.has-fullscreen-tool cleared').toBe(false);
});

test('fullscreen inerts the covered chrome; Shift+Tab stays inside the card (#163)', async ({ page }) => {
    await page.goto('/tools/psychrometric-chart.html');
    const btn = page.locator('.tool-card-fullscreen-btn');
    await btn.click();
    await expect(page.locator('body')).toHaveClass(/has-fullscreen-tool/);

    // Covered chrome behind the z-300 overlay is inert…
    await expect(page.locator('nav.site-nav')).toHaveAttribute('inert', '');
    await expect(page.locator('footer')).toHaveAttribute('inert', '');
    await expect(page.locator('.back-link')).toHaveAttribute('inert', '');
    // …but the palette is NOT — it layers above fullscreen (z-index 1000)
    // so the Ctrl/⌘-K command palette stays usable.
    await expect(page.locator('#palette')).not.toHaveAttribute('inert', /.*/);

    // Shift+Tab from the fullscreen button must never land on covered
    // chrome. Walk far enough to have crossed the whole nav if it were
    // still tabbable; focus stays inside the card (or passes through
    // <body> on its way out to browser chrome).
    await btn.focus();
    const landed = [];
    for (let i = 0; i < 25; i++) {
        await page.keyboard.press('Shift+Tab');
        landed.push(await page.evaluate(() => {
            const a = document.activeElement;
            if (!a || a === document.body || a === document.documentElement) return 'body';
            if (a.closest('.tool-card.is-fullscreen')) return 'card';
            return 'OUTSIDE: ' + (a.id || a.className || a.tagName);
        }));
    }
    expect(landed.filter((w) => w.startsWith('OUTSIDE')),
        'focus never escaped to covered chrome').toEqual([]);

    // Exit restores everything exactly — no attribute bookkeeping left.
    await btn.click();
    await expect(page.locator('body')).not.toHaveClass(/has-fullscreen-tool/);
    const leftovers = await page.evaluate(
        () => document.querySelectorAll('[inert], [data-fs-inert]').length);
    expect(leftovers, 'exit removed every inert it added').toBe(0);
    const navFocusable = await page.evaluate(() => {
        const a = document.querySelector('.site-nav-links a');
        a.focus();
        return document.activeElement === a;
    });
    expect(navFocusable, 'nav is really tabbable again').toBe(true);
});

test('repeated cycles restore exactly; pre-existing inert is untouched (#163)', async ({ page }) => {
    await page.goto('/simulators/refrigerant-loop.html');
    // A page-owned inert (not fullscreen's) must survive a full cycle —
    // applyInert() skips already-inert elements, so exit can't undo it.
    await page.evaluate(() => document.querySelector('footer').setAttribute('inert', ''));

    const btn = page.locator('.tool-card-fullscreen-btn');
    for (let i = 0; i < 2; i++) {
        await btn.click();
        await expect(page.locator('nav.site-nav')).toHaveAttribute('inert', '');
        await btn.click();
        await expect(page.locator('nav.site-nav')).not.toHaveAttribute('inert', /.*/);
    }

    const state = await page.evaluate(() => ({
        markers: document.querySelectorAll('[data-fs-inert]').length,
        footerInert: document.querySelector('footer').hasAttribute('inert'),
    }));
    expect(state.markers, 'no bookkeeping left after two cycles').toBe(0);
    expect(state.footerInert, 'pre-existing inert untouched').toBe(true);
});

test('closing the palette over a fullscreen tool keeps the background inert (#163)', async ({ page }) => {
    await page.goto('/tools/psychrometric-chart.html');
    await page.locator('.tool-card-fullscreen-btn').click();
    await expect(page.locator('nav.site-nav')).toHaveAttribute('inert', '');

    // The palette layers above fullscreen and must stay usable.
    await page.keyboard.press('Control+k');
    await expect(page.locator('#palette')).toBeVisible();
    await expect(page.locator('#palette')).not.toHaveAttribute('inert', /.*/);

    // Escape closes the palette only (search.js claims it, capture phase)…
    await page.keyboard.press('Escape');
    await expect(page.locator('#palette')).toBeHidden();
    await expect(page.locator('body')).toHaveClass(/has-fullscreen-tool/);
    // …and must NOT strip fullscreen's containment — search.js's
    // palette-close skips data-fs-inert carriers.
    await expect(page.locator('nav.site-nav')).toHaveAttribute('inert', '');

    // A second Escape exits fullscreen and restores everything.
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).not.toHaveClass(/has-fullscreen-tool/);
    await expect(page.locator('nav.site-nav')).not.toHaveAttribute('inert', /.*/);
});

test('fullscreen leaves the gloss panels live and hit-testable (#288)', async ({ page }) => {
    await page.goto(GLOSS_PILOT);
    await enterFullscreen(page);
    await expect(page.locator('body')).toHaveClass(/has-fullscreen-tool/);

    const state = await inertSnapshot(page);
    // Anti-vacuity: this whole arm is green against a page whose panels
    // stopped rendering, so prove they are there before proving they are
    // live — and prove the containment it must not have weakened.
    expect(state.panelCount, 'the pilot page ships gloss panels').toBeGreaterThan(0);
    expect(state.nav, 'covered chrome is still contained').toBe(true);
    expect(state.panelsInert, 'no gloss panel is inert').toBe(0);
    expect(state.panelsTagged, 'no gloss panel carries fullscreen bookkeeping').toBe(0);

    // Focus-open is the stable path: it opens PINNED, so no hover-intent
    // or grace timer is in play, and gloss.js's one-rAF arming grace
    // absorbs the instant focus scroll (see gloss.spec.js's park() note).
    const trigger = page.locator('button[data-gloss]').first();
    const id = await trigger.getAttribute('data-gloss');
    const panel = page.locator(`#gloss-tip-${id}`);
    await trigger.focus();
    await expect(panel).toBeVisible();

    // The panel paints above the z-300 card (z-index 900) — but painting
    // above it is not the same as being reachable, and `inert` takes the
    // second without touching the first. elementFromPoint is the direct
    // read on that: an inert panel is absent from hit testing, and a
    // pointer that cannot land on the panel can never cancel the close.
    const box = await panel.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const hit = await page.evaluate(([x, y, pid]) => {
        const el = document.getElementById(pid);
        const top = document.elementFromPoint(x, y);
        return !!(top && (top === el || el.contains(top)));
    }, [cx, cy, `gloss-tip-${id}`]);
    expect(hit, 'the open panel is on top at its own centre').toBe(true);

    // …and a real pointer arriving there is actually delivered to it.
    // This is the event the 1.4.13 grace period exists to receive.
    await page.evaluate(() => {
        window.__glossPanelHits = 0;
        document.querySelectorAll('.gloss-tip').forEach((el) => {
            el.addEventListener('mouseover', () => { window.__glossPanelHits += 1; });
        });
    });
    await page.mouse.move(cx, cy);
    await expect.poll(() => page.evaluate(() => window.__glossPanelHits),
        { message: 'pointer travel onto the panel is delivered' }).toBeGreaterThan(0);

    // Exit restores everything exactly, panels included.
    await page.keyboard.press('Escape');   // gloss.js claims this one (closes the panel)
    await page.keyboard.press('Escape');   // …and this one exits fullscreen
    await expect(page.locator('body')).not.toHaveClass(/has-fullscreen-tool/);
    const leftovers = await page.evaluate(
        () => document.querySelectorAll('[inert], [data-fs-inert]').length);
    expect(leftovers, 'exit removed every inert it added').toBe(0);
});

test('the palette-close arm restores the gloss panels over a fullscreen card (#288)', async ({ page }) => {
    // The inverse direction. Nothing in clearInert() has to un-inert a
    // panel — it is never tagged, exactly like #palette — but a SECOND
    // un-inert path touches body children: search.js's palette close,
    // which holds `inert` on data-fs-inert carriers so it cannot strip
    // fullscreen's containment. An untagged panel has to come back live
    // through that arm, and a tagged one would silently not.
    await page.goto(GLOSS_PILOT);
    await enterFullscreen(page);

    // The palette is aria-modal, so while it is OPEN the panels SHOULD be
    // inert — that is the modal contract, not a regression.
    await page.keyboard.press('Control+k');
    await expect(page.locator('#palette')).toBeVisible();
    const open = await inertSnapshot(page);
    expect(open.panelsInert, 'the open modal contains the panels too')
        .toBe(open.panelCount);
    expect(open.panelsTagged, 'but fullscreen still claims none of them').toBe(0);

    await page.keyboard.press('Escape');
    await expect(page.locator('#palette')).toBeHidden();
    const closed = await inertSnapshot(page);
    expect(closed.nav, 'fullscreen containment survived the palette close').toBe(true);
    expect(closed.panelsInert, 'the panels came back live').toBe(0);
});

test('a page-owned inert on a gloss panel survives a fullscreen cycle (#288)', async ({ page }) => {
    // The exemption is a licence to SKIP a panel, never to clear one.
    // applyInert() leaves a page's own containment alone everywhere else
    // (#163); the skip must not become the one place that doesn't hold.
    //
    // Unlike the two arms above this one passed BEFORE the fix as well —
    // it is not a regression test for the exemption but a boundary on
    // it, against the plausible wrong reading of #288 that "un-inert the
    // panels" means actively removing the attribute on enter or exit.
    await page.goto(GLOSS_PILOT);
    await page.evaluate(() => document.querySelector('.gloss-tip').setAttribute('inert', ''));

    await enterFullscreen(page);
    await page.evaluate(() => window.Fullscreen.exit());

    const kept = await page.evaluate(
        () => document.querySelector('.gloss-tip').hasAttribute('inert'));
    expect(kept, 'a page-owned panel inert is untouched').toBe(true);
});
