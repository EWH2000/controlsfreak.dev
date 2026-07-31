// The #224 display-unit guard, for EVERY workbench unit module.
//
// ── The rule it enforces ─────────────────────────────────────────────
// A workbench unit's internal model is canonical IP (°F, Btu/h) and
// converts at the display boundary through the shell's Units statics
// (DDCWShell.dispTempNum / tSuffix / dSuffix — codebase-issues #218).
// THRESHOLDS STAY ON THE CANONICAL SIDE OF THAT BOUNDARY: a verdict or
// a paint gate compares a value off `derived` against an IP constant,
// never a display number against a bare literal. A display number drags
// the units toggle into the comparison, which is how a healthy 4 °F coil
// painted "No ΔT across coil" for a metric reader while a US reader saw
// healthy cooling.
//
// ── Why this file exists at all (codebase-issues #235) ───────────────
// The guard shipped inside tests/ddcw-fcu-unit.spec.js and was bound to
// the FCU TWICE: a literal `readFileSync(… 'ddcw-fcu-unit.js')` AND a
// hard-coded alternation of the FCU's own local names,
// `(dtN|eatN|datN|spN|sensedN)`. The second binding is the sharper one —
// copying the spec and changing the path would have left a second unit's
// locals uncovered SILENTLY, because the anti-vacuity probe only checked
// that `const dtN =` still existed in the file being scanned. The AHU
// unit module's DOM half landed 2026-07-30 with its own display locals
// (none of them named dtN-through-sensedN except by coincidence), which
// is the moment that hole would have opened.
//
// So both bindings are gone. The scan walks EVERY ddcw-*-unit.js under
// html/scripts, and it DERIVES each file's display-local set from the
// file itself rather than being told what to look for.
//
// ── Why the derivation is a FIXPOINT, not one regex ──────────────────
// The naive shape rule — "every local assigned from a dispTempNum(…)
// call" — misses `dtN`, which is the very local the original #224 bug
// used. Both units compute it the same way:
//
//     const dtN = Math.round((datN - eatN) * 10) / 10;
//
// There is no dispTempNum call in that initializer; it is a SECOND-ORDER
// display local. So the derivation seeds from the direct calls and then
// repeatedly adds any `const X = …` whose initializer mentions a name
// already in the set, until the set stops growing. On both shipped units
// the direct calls seed on the first pass and the derived deltas join on
// the second.
//
// ── The guard's floor ────────────────────────────────────────────────
// It is a source scan of non-comment lines, so a trailing `// dtN > -3`
// on a code line would trip it and a comparison built by string
// concatenation would not. Read it as "no LITERAL display-unit
// comparison ships", never as "no display-unit comparison ships".

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const SCRIPTS = path.join(__dirname, '..', 'html', 'scripts');

// Every unit module. Derived from the directory rather than listed, so a
// third unit is covered the day its file lands rather than the day
// someone remembers this spec.
function unitFiles() {
    return fs.readdirSync(SCRIPTS)
        .filter((f) => /^ddcw-.*-unit\.js$/.test(f))
        .sort();
}

// Strip whole-line comments only — the same floor the original guard
// documented, kept deliberately rather than upgraded, because a real
// comment stripper would start having opinions about strings.
const codeLines = (src) => src.split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l));

// The fixpoint. Returns the set of names that carry a DISPLAY value in
// this file.
function displayLocals(code) {
    const set = new Set();
    // Seed: assigned directly from a dispTempNum call, however it is
    // reached (bare, or through the DDCWShell namespace).
    const SEED = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:[A-Za-z_$][\w$]*\.)?dispTempNum\s*\(/g;
    for (const m of code.matchAll(SEED)) set.add(m[1]);

    // Grow: any const/let whose INITIALIZER mentions a name already in
    // the set is itself a display value. Repeat until stable — one pass
    // is not enough in general, and both shipped units need two.
    const DECL = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*([^\n;]*)/g;
    let grew = true;
    while (grew) {
        grew = false;
        DECL.lastIndex = 0;
        for (const m of code.matchAll(DECL)) {
            const name = m[1];
            const init = m[2];
            if (set.has(name)) continue;
            for (const known of set) {
                if (new RegExp('\\b' + known + '\\b').test(init)) {
                    set.add(name);
                    grew = true;
                    break;
                }
            }
        }
    }
    return set;
}

// The matcher FACTORY — built from a name set, so the anti-vacuity
// probes below can drive the very same construction the file walk uses
// instead of pinning a private re-implementation.
//
// The comparison operand is deliberately UNCONSTRAINED. An earlier draft
// anchored it to a numeric literal, which would have passed the very
// regression this exists to stop: after the #224 fix the likeliest way
// back in is `dtN <= COOLING_DT_TRIP` — right constant, wrong operand —
// and a digit-anchored pattern cannot see it.
//
// The `(?<!=)` on the reversed form keeps `=>` from reading as the `>`
// operator, so an arrow function returning a display local is not a
// false hit. It is unit-agnostic and stays.
const OPS = '(<=|>=|<|>|===|!==|==|!=)';
function matcherFor(names) {
    const DISP = '(' + [...names].join('|') + ')';
    const CMP = new RegExp('\\b' + DISP + '\\s*' + OPS);
    const REV = new RegExp('(?<!=)' + OPS + '\\s*' + DISP + '\\b');
    return (l) => CMP.test(l) || REV.test(l);
}

test.describe('ddcw unit modules: display numbers never gate a decision (#224)', () => {

    test('the matcher catches the shapes it is for', () => {
        // Anti-vacuity for the PATTERN, tested against a synthetic name
        // set so it cannot decay with either shipped file's locals. This
        // is the probe that used to be four inline assertions bound to
        // the FCU's own names.
        const hits = matcherFor(new Set(['dtN', 'datN']));
        expect(hits('        const cooling = d.capActive && dtN <= -3;'),
            'the original #224 bug shape').toBe(true);
        expect(hits('        const cooling = d.capActive && dtN <= COOLING_DT_TRIP;'),
            'the constant-named relapse — right constant, wrong operand').toBe(true);
        expect(hits('        } else if (COOLING_DT_TRIP < dtN) {'),
            'the reversed form').toBe(true);
        expect(hits('        const pick = (d) => datN;'),
            'an arrow returning a display local is not a comparison').toBe(false);
        expect(hits('        setBoth(out.dt, dtN.toFixed(1));'),
            'painting a display local is the whole point of one').toBe(false);
    });

    test('the fixpoint reaches SECOND-ORDER display locals', () => {
        // The derivation's own anti-vacuity, and the reason it is a
        // fixpoint at all: `dtN` carries no dispTempNum call of its own,
        // and it is the local the original bug used. A one-pass rule
        // would silently leave it out of every scan below.
        const set = displayLocals([
            'const datN = dispTempNum(d.datT);',
            'const matN = DDCWShell.dispTempNum(d.matT);',
            'const dtN  = Math.round((datN - matN) * 10) / 10;',
            'const stage = plant.actuators.y1 ? 1 : 0;',
        ].join('\n'));
        expect([...set].sort()).toEqual(['datN', 'dtN', 'matN']);
    });

    test('every unit module ships with no display-unit comparison', () => {
        const files = unitFiles();

        // Sanity floor: the walk must actually find the modules. Two
        // shipped as of 2026-07-30 (fcu, ahu); this is a floor, not a
        // count, so a third unit does not fail it.
        expect(files.length, 'sanity: the unit-module walk found files')
            .toBeGreaterThanOrEqual(2);

        const skipped = [];
        const bad = [];
        for (const f of files) {
            const code = codeLines(fs.readFileSync(path.join(SCRIPTS, f), 'utf8')).join('\n');

            // A module with no display boundary at all has nothing to
            // guard. That is legitimate — a physics-only module is one —
            // but it must be RECORDED rather than silently passing, or a
            // file that loses its display half drops out of scope
            // unnoticed. The empty-skip assertion below is what makes
            // this a disclosure and not an escape hatch.
            if (!/dispTempNum\s*\(/.test(code)) { skipped.push(f); continue; }

            const names = displayLocals(code);
            expect(names.size, f + ': calls dispTempNum but no display local was derived')
                .toBeGreaterThan(0);

            const hits = matcherFor(names);
            code.split('\n').forEach((l) => {
                if (hits(l)) bad.push(f + ': ' + l.trim());
            });
        }

        // Both shipped modules paint, so nothing should be skipped today.
        // If that ever changes, this assertion is where the change gets
        // read and argued rather than discovered later.
        expect(skipped, 'a unit module was skipped for having no display boundary')
            .toEqual([]);

        expect(bad, 'a display-unit local gates a decision — put the threshold '
            + 'on the canonical side, against a value off `derived`').toEqual([]);
    });
});
