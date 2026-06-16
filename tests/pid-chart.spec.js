// Engine-direct test for /scripts/pid-chart.js's formatPidDelta
// (codebase-issues #101). Same vm trick as the other engine specs:
// pid-chart.js is a classic script of top-level function declarations
// (drawPidChart / formatPidDelta / pidUnit / …), so a trailing
// `; formatPidDelta;` makes runInNewContext return the formatter. The
// formatter's unit lookups read window.Units, so the context carries a
// bare `window` stub (no Units → the US display path, no DOM needed).
//
// drawPidChart (canvas/getContext) isn't exercised here — it needs a
// real 2D context; its #102 null-guard is a one-line early return
// verified by inspection.

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

function loadFormatPidDelta() {
    const src = fs.readFileSync(
        path.join(__dirname, '..', 'html', 'scripts', 'pid-chart.js'),
        'utf8',
    );
    return vm.runInNewContext(src + '\n; formatPidDelta;', { window: {} });
}

test.describe('pid-chart: formatPidDelta sign', () => {

    test('a small-negative delta that rounds to zero prints "0.0", not "-0.0" (#101)', () => {
        const formatPidDelta = loadFormatPidDelta();
        // simulatePid leaves ssErr ≈ -0.0003 in many ordinary slider cells;
        // the old code kept the minus through toFixed and printed a
        // contradictory '-0.0 °F' (a leading minus on a zero magnitude).
        expect(formatPidDelta(-0.0003, { dec: 1 }, 'med')).toBe('0.0 °F');
    });

    test('genuine signed deltas keep their sign', () => {
        const formatPidDelta = loadFormatPidDelta();
        expect(formatPidDelta(2.34,  { dec: 1 }, 'med')).toBe('+2.3 °F');
        expect(formatPidDelta(-2.34, { dec: 1 }, 'med')).toBe('-2.3 °F');
        expect(formatPidDelta(0,     { dec: 1 }, 'med')).toBe('0.0 °F');
    });
});
