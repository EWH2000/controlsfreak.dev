// The fullscreen button's phone-width clearance (codebase-issues #272).
//
// `.tool-card-fullscreen-btn` is `position: absolute` in the card's
// top-right corner. Nothing reserves its footprint by default, so on a
// narrow viewport it paints OVER the title row where the two meet. With
// the shared rule disabled, at 375: the AHU workbench's "Air handler" tag
// runs 8.7px under the button, the FCU's "Air-side" clears by 11.4px.
//
// ⚠ `responsive.spec.js` CANNOT catch this, in principle. Its 375 arm
// asserts nothing scrolls or clips sideways; an absolutely-positioned
// element painting over text produces NO OVERFLOW AT ALL, so that sweep
// is not weak here — it measures a different property. This spec is the
// one that measures OVERLAP.
//
// It is shared rather than page-local for the same reason the CSS rule
// is: #272 replaced two duplicated page-head copies of the clearance
// with one `styles.css` rule scoped by `:has()`, and the contract now
// has three arms no single page owns — the two consumers that KEEP the
// button at phone width, and the `.fs-desktop-only` consumers that must
// NOT pay a reservation for a button they hide. This file supersedes
// the two page-local `does not paint over the title tag` tests that
// lived in `ddc-workbench-ahu-page.spec.js` and
// `ddc-workbench-fcu.spec.js`; both measured only the `.tool-tag`, and
// both passed VACUOUSLY if the button ever went `display: none` (a zero
// rect intersects nothing). The anti-vacuity rows below are the reason
// for the move.
//
// Touch emulation is deliberate, and it is the HARSHER case: under
// `(hover: none)` the TOUCH-TARGET FLOOR block pads the button from
// 26px to >=44px, so it reaches further down into the title row than it
// does on a narrow desktop window.

const { test, expect } = require('@playwright/test');

const PHONE = { width: 375, height: 667 };

// The consumers that KEEP the button at phone width — the Unit tab is
// the mobile surface on both, so the button has to stay reachable.
const KEEPS_BUTTON = [
    { name: 'DDC Workbench (AHU)', url: '/simulators/ddc-workbench.html' },
    { name: 'DDC Workbench (FCU)', url: '/simulators/ddc-workbench-fcu.html' },
];

function intersects(a, b) {
    return Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0
        && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0;
}

test.describe('the fullscreen button never paints over the card title', () => {
    test.use({ isMobile: true, hasTouch: true, viewport: PHONE });

    for (const target of KEEPS_BUTTON) {
        test(`${target.name} clears its title at 375`, async ({ page }) => {
            await page.goto(target.url);

            const m = await page.evaluate(() => {
                const box = el => {
                    const r = el.getBoundingClientRect();
                    return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height };
                };
                const btnEl = document.querySelector('.tool-card-fullscreen-btn');
                const cardEl = btnEl.closest('.tool-card');
                const hdrEl = cardEl.querySelector('.tool-card-header');
                const titleEl = hdrEl.querySelector('.tool-card-title');

                // Every painted rect the title row produces — its own text
                // nodes AND the .tool-tag's. Measuring the ELEMENT box would
                // understate the question: the header's reserved padding
                // shrinks the title's box, so that box can clear the button
                // while a wrapped glyph still sits under it. Ranges over text
                // nodes measure what the reader actually sees.
                const walker = document.createTreeWalker(titleEl, NodeFilter.SHOW_TEXT);
                const rects = [];
                let text = '';
                for (let n = walker.nextNode(); n; n = walker.nextNode()) {
                    if (!n.nodeValue.trim()) continue;
                    text += n.nodeValue.trim() + ' ';
                    const range = document.createRange();
                    range.selectNodeContents(n);
                    for (const r of range.getClientRects()) {
                        if (r.width === 0 || r.height === 0) continue;
                        rects.push({ l: r.left, r: r.right, t: r.top, b: r.bottom });
                    }
                }

                return {
                    rects,
                    text: text.trim(),
                    display: getComputedStyle(btnEl).display,
                    btn: box(btnEl),
                    hdr: box(hdrEl),
                    headerPadRight: getComputedStyle(hdrEl).paddingRight,
                };
            });

            // ── Anti-vacuity. A hidden button has a zero rect, and a zero
            // rect intersects nothing — the overlap assertion below would
            // pass while measuring nothing at all. Same for a title whose
            // text never rendered.
            expect(m.display, 'the button is not display:none at phone width').not.toBe('none');
            expect(m.btn.w, 'the button has real width').toBeGreaterThan(0);
            expect(m.btn.h, 'the button has real height').toBeGreaterThan(0);
            expect(m.text.length, 'the title renders text').toBeGreaterThan(0);
            expect(m.rects.length, 'the title paints at least one text rect').toBeGreaterThan(0);

            // ── The collision is REAL, not avoided by the button sitting
            // somewhere else entirely: it still spans the header band. If
            // this ever fails, the no-overlap row below has stopped being a
            // statement about the corner the bug lives in.
            expect(
                intersects(m.btn, m.hdr),
                'the button still occupies the header band it overlaps into',
            ).toBe(true);

            // ── The outcome, asserted BEFORE the mechanism below it on
            // purpose: this is the row a reader would file the bug about,
            // and a source-level check that fires first would mask it with
            // a less actionable message.
            const collisions = m.rects
                .filter(r => intersects(r, m.btn))
                .map(r => `[${Math.round(r.l)},${Math.round(r.t)} → ${Math.round(r.r)},${Math.round(r.b)}]`);
            expect(collisions, `title text under the fullscreen button (${m.text})`).toEqual([]);

            // ── The mechanism that buys it, so a regression says WHY.
            expect(m.headerPadRight, 'the shared :has() rule reserves the button footprint')
                .toBe('136px');   // 8.5rem at the 16px root
        });
    }

    // The other side of the `:not(.fs-desktop-only)` scope. Four live
    // consumers hide the button below 1000px; if the clearance were scoped
    // to `:has(.tool-card-fullscreen-btn)` alone they would reserve 8.5rem
    // of header for a button that is not there.
    test('a .fs-desktop-only card hides the button and pays no reservation', async ({ page }) => {
        await page.goto('/simulators/refrigerant-loop.html');
        const m = await page.evaluate(() => {
            const btn = document.querySelector('.tool-card-fullscreen-btn.fs-desktop-only');
            const hdr = btn && btn.closest('.tool-card').querySelector('.tool-card-header');
            const cs = hdr && getComputedStyle(hdr);
            return {
                present: !!btn,
                display: btn ? getComputedStyle(btn).display : null,
                padRight: cs ? cs.paddingRight : null,
                padLeft: cs ? cs.paddingLeft : null,
            };
        });
        expect(m.present, 'the button is in the DOM — the modifier hides it CSS-side').toBe(true);
        expect(m.display, 'the button is hidden at phone width').toBe('none');
        // Read against the header's OWN left padding rather than a literal:
        // the reservation only ever touches the right side, so a symmetric
        // header is exactly the claim "nothing was reserved here" — and it
        // survives a retune of the base .tool-card-header padding, which a
        // hard-coded 24px would fail against for an unrelated reason.
        expect(m.padRight, 'no dead space reserved for a hidden button').toBe(m.padLeft);
    });
});
