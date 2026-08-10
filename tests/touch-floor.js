// Shared 44px touch-target assertion — the ONE comparison behind every
// WCAG 2.5.5 floor pin on the site, used by touch-floor.spec.js,
// ddc-workbench-ahu-page.spec.js and ddc-workbench-fcu.spec.js. Lives
// outside any *.spec.js for the same reason tests/pages.js does:
// requiring it must not re-register another spec's tests.
//
// WHY A HELPER AND NOT 23 LITERAL `toBeGreaterThanOrEqual(44)` CALLS.
// The controls these specs measure do not reach 44px naturally — every
// one of them is PINNED there by a `min-height: 44px` / `min-width: 44px`
// declaration in the TOUCH-TARGET FLOOR block of styles.css (18 such
// declarations as of 2026-08-10). So the measured box sits EXACTLY on the
// number a bare `>= 44` demands, and the comparison carries no margin at
// all. These specs also run in `isMobile: true` contexts — that is the
// whole point, it is what makes `(hover: none)` match — so a device-scale
// factor is in play and `boundingBox()` comes back through a float path
// that does not always land on 44.0:
//
//   43.99993896484375   a.ddcw-unit-link, GitHub Actions runner, 3 of 3
//                       attempts, on a DOCS-ONLY diff (2026-08-10, PR #502)
//   43.999755859375     #fcu-stage-2, this box, 3 of 8 serial local runs
//                       (codebase-issues #279, 2026-08-09)
//
// Two different elements on two different pages, and the local/CI polarity
// is OPPOSITE between them — CI red while local passed, then local red
// while CI passed. That rules out host load as the cause and identifies it
// as one BOUNDARY that different environments round to different sides.
// Padding the CSS to 45px would "fix" it by changing real layout on ~18
// control families to satisfy a measurement artifact, and 45 is not what
// the success criterion asks for.
//
// WHAT THE TOLERANCE IS, AND WHY IT IS THIS SMALL. WCAG 2.5.5 states its
// floor in CSS pixels: the requirement is that the target IS 44 CSS px,
// which these controls are. The sub-pixel shortfall is an artifact of
// measuring through a device-pixel scale, not a smaller target. So round
// the measurement to 2 dp before comparing — that forgives a shortfall of
// up to 0.005px (20x the largest ever observed, 2.4e-4) and nothing more.
// A control that is genuinely short still fails: 43.99 rounds to 43.99,
// 43.5 to 43.5, and both are < 44. The gate is intact; only the artifact
// is gone.
//
// Deliberately NOT `>= 43.5` (the shape codebase-issues #279 first
// proposed): that gives away half a pixel of a real accessibility floor to
// solve a 6e-5 problem, and it would silently pass a control that missed.
'use strict';

const { expect } = require('@playwright/test');

// The WCAG 2.5.5 floor, in CSS pixels. Keep equal to the `min-height` /
// `min-width` values in the TOUCH-TARGET FLOOR block of styles.css.
const TOUCH_FLOOR_PX = 44;

// Round a `boundingBox()` dimension to 2 dp — see the tolerance note above.
function measured(px) {
    return Math.round(px * 100) / 100;
}

// Assert one dimension. `label` names the control, so a red says which one.
function expectFloorDimension(px, label) {
    expect(measured(px), label).toBeGreaterThanOrEqual(TOUCH_FLOOR_PX);
}

// Height only — for controls floored with `min-height` alone, which is most
// of them (left-aligned text rows, form controls, disclosure summaries).
function expectTouchFloorHeight(box, label) {
    expectFloorDimension(box.height, `${label} height`);
}

// Both dimensions — for square-ish controls that carry a `min-width` too.
function expectTouchFloor(box, label) {
    expectFloorDimension(box.height, `${label} height`);
    expectFloorDimension(box.width, `${label} width`);
}

module.exports = {
    TOUCH_FLOOR_PX,
    measured,
    expectTouchFloor,
    expectTouchFloorHeight,
};
