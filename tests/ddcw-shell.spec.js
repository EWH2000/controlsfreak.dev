// Engine-direct smoke tests for /scripts/ddcw-shell.js — the DDC
// Workbench shell the extraction produced. Same vm pattern as
// psychro-engine.spec.js; Playwright workers are Node processes and
// the `page` fixture is just unused.
//
// What this file pins is the shell's OWN header claims, the ones a
// second unit page (ddc-workbench-ahu.html) will lean on:
//
//   1. "The FACTORY touches the DOM; the FILE does not" — the source
//      loads in a bare vm (no window, no document) without throwing,
//      and hands back the full API. If a future edit moves a document
//      read to load time, the load itself fails here.
//   2. formatPointValue is pure on its Units-free paths, and converts
//      through window.Units — read at CALL time — on the conv paths,
//      including the deadband-as-delta distinction the contract's
//      −16.1 °C worked example exists for.
//   3. "Grep-provable: a case-insensitive grep for the FCU prefix over
//      this file hits ONLY this header's contract prose" — asserted,
//      so the unit-agnostic boundary can't erode silently.
//
// The full behavioral surface (binding, arbitration, statusbar, the
// editor mount) is covered on the built page by ddc-workbench.spec.js
// and ddc-workbench-priority.spec.js.

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

const SHELL_PATH = path.join(__dirname, '..', 'html', 'scripts', 'ddcw-shell.js');

// `sandbox` becomes the context bag — pass { window: { Units: … } } to
// exercise the display-boundary paths; pass nothing for the bare load.
function loadShell(sandbox) {
    const src = fs.readFileSync(SHELL_PATH, 'utf8');
    return vm.runInNewContext(src + '\n; DDCWShell;', sandbox || {});
}

// A minimal window.Units test double: mode-switchable, with the two
// conversions formatPointValue reaches (absolute temp vs delta temp)
// and distinct suffix strings so the output pins which path ran.
function unitsStub() {
    let mode = 'us';
    return {
        setMode(m) { mode = m; },
        Units: {
            current: () => mode,
            display: {
                temp: (f) => (f - 32) / 1.8,
                deltaTemp: (d) => d / 1.8,
            },
            suffix: {
                temp: () => (mode === 'us' ? '°F' : '°C'),
                deltaTemp: () => (mode === 'us' ? 'Δ°F' : 'Δ°C'),
            },
        },
    };
}

test.describe('ddcw-shell: vm smoke (the loadability claim)', () => {

    test('the file loads in a bare vm — no window, no document — with the full API', () => {
        // The bare context IS the assertion: nothing outside
        // createWorkbench may read the DOM, so the factory provably
        // did not run at load (there was no document to survive).
        const Shell = loadShell();
        ['createWorkbench', 'formatPointValue', 'dispTempNum', 'tSuffix', 'dSuffix']
            .forEach((m) => {
                expect(typeof Shell[m], m).toBe('function');
            });
    });

    test('formatPointValue is pure on its Units-free paths', () => {
        // Binary rendering and plain analog rounding never touch
        // window.Units — callable in the same bare context the file
        // loaded into.
        const Shell = loadShell();
        expect(Shell.formatPointValue({ kind: 'bo' }, true)).toBe('ON');
        expect(Shell.formatPointValue({ kind: 'bo' }, false)).toBe('OFF');
        expect(Shell.formatPointValue({ kind: 'bi' }, true)).toBe('ON');
        // ao rounds to an integer and carries the unit label…
        expect(Shell.formatPointValue({ kind: 'ao', unit: '%' }, 42.4)).toBe('42 %');
        // …other analogs keep one decimal; no unit = no suffix.
        expect(Shell.formatPointValue({ kind: 'ai' }, 42.44)).toBe('42.4');
        // Validate-and-mute: a non-finite raw renders the em-dash.
        expect(Shell.formatPointValue({ kind: 'ai', unit: '°F' }, NaN)).toBe('— °F');
    });

    test('formatPointValue converts temp absolutely and deadband as a DELTA', () => {
        // window.Units is read at CALL time, so one load serves both
        // modes. The metric rows pin the contract's own worked example:
        // a 3 °F DEADBAND is 1.7 °C of band — running it through the
        // absolute formula is what printed −16.1 °C.
        const stub = unitsStub();
        const Shell = loadShell({ window: { Units: stub.Units } });

        expect(Shell.formatPointValue({ kind: 'ai', conv: 'temp', unit: '°F' }, 75.25))
            .toBe('75.3 °F');
        expect(Shell.formatPointValue({ kind: 'param', conv: 'deltaTemp', unit: '°F' }, 3))
            .toBe('3.0 Δ°F');

        stub.setMode('metric');
        expect(Shell.formatPointValue({ kind: 'param', conv: 'deltaTemp', unit: '°F' }, 3))
            .toBe('1.7 Δ°C');
        // The absolute path on the same raw value IS −16.1 °C — the two
        // conv values must stay distinguishable or the trap returns.
        expect(Shell.formatPointValue({ kind: 'ai', conv: 'temp', unit: '°F' }, 3))
            .toBe('-16.1 °C');
    });

    test('grep proof: no FCU identifier outside comment prose', () => {
        // The shell's unit-agnostic boundary, made mechanical: every
        // line mentioning the FCU prefix must be a full-line comment
        // (the header's contract prose). A code identifier — a
        // getElementById('fcu-…'), a key, a variable — fails here.
        const src = fs.readFileSync(SHELL_PATH, 'utf8');
        const offenders = src.split('\n')
            .map((line, i) => ({ line, n: i + 1 }))
            .filter(({ line }) => /fcu/i.test(line) && !/^\s*\/\//.test(line));
        expect(
            offenders.map(({ n, line }) => n + ': ' + line.trim()),
        ).toEqual([]);
    });
});
