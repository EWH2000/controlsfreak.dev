// Engine-direct tests for /scripts/point-arbitration.js. Lives under
// tests/*.spec.js so the same `npm test` (Playwright) runner picks it
// up — Playwright workers are Node processes, the `page` fixture is
// just unused here. Same loader trick as fbe-engine.spec.js.
//
// point-arbitration.js is a classic browser script ending in
// `const PriorityArray = (function(){…})();` plus a window guard. A
// trailing `; PriorityArray;` expression makes `runInNewContext`
// return the engine; the window guard is skipped (no `window` in the
// vm context).
//
// The through-line of every case: only null is NULL — false and 0 are
// COMMANDS, and resolve() never coerces a stored value.

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

function loadEngine() {
    const src = fs.readFileSync(
        path.join(__dirname, '..', 'html', 'scripts', 'point-arbitration.js'),
        'utf8',
    );
    return vm.runInNewContext(src + '\n; PriorityArray;', {});
}

test.describe('point-arbitration: create + empty-array resolve', () => {

    test('create returns a length-17 array with slots 1..16 all null', () => {
        const PA = loadEngine();
        const st = PA.create(0);
        expect(st.slots.length).toBe(17);
        for (let n = 1; n <= 16; n++) expect(st.slots[n]).toBe(null);
        expect(st.rd).toBe(0);
    });

    test('all-null resolves to Relinquish_Default, typed — false stays false', () => {
        const PA = loadEngine();
        const r = PA.resolve(PA.create(false));
        expect(r.value).toBe(false);      // NOT undefined, NOT 0, NOT ''
        expect(r.slot).toBe(null);
    });

    test('all-null resolves to Relinquish_Default, typed — 0 stays 0', () => {
        const PA = loadEngine();
        const r = PA.resolve(PA.create(0));
        expect(r.value).toBe(0);          // NOT undefined, NOT false
        expect(r.slot).toBe(null);
    });
});

test.describe('point-arbitration: lowest-non-null wins', () => {

    test('slot 16 alone wins', () => {
        const PA = loadEngine();
        const st = PA.create(0);
        PA.write(st, 16, 42);
        expect(PA.resolve(st)).toEqual({ value: 42, slot: 16 });
    });

    test('8 beats 16', () => {
        const PA = loadEngine();
        const st = PA.create(0);
        PA.write(st, 16, 42);
        PA.write(st, 8, 75);
        expect(PA.resolve(st)).toEqual({ value: 75, slot: 8 });
    });

    test('generality: 6 beats 8 beats 16 — lowest-non-null is real, not special-cased', () => {
        const PA = loadEngine();
        const st = PA.create(0);
        PA.write(st, 16, 10);
        PA.write(st, 8, 20);
        PA.write(st, 6, 30);
        expect(PA.resolve(st)).toEqual({ value: 30, slot: 6 });
        PA.release(st, 6);
        expect(PA.resolve(st)).toEqual({ value: 20, slot: 8 });
    });
});

test.describe('point-arbitration: release semantics', () => {

    test('release 8 falls to 16', () => {
        const PA = loadEngine();
        const st = PA.create(0);
        PA.write(st, 16, 42);
        PA.write(st, 8, 75);
        PA.release(st, 8);
        expect(PA.resolve(st)).toEqual({ value: 42, slot: 16 });
    });

    test('release 16 under an active 8 stays at 8', () => {
        const PA = loadEngine();
        const st = PA.create(0);
        PA.write(st, 16, 42);
        PA.write(st, 8, 75);
        PA.release(st, 16);
        expect(PA.resolve(st)).toEqual({ value: 75, slot: 8 });
    });

    test('release both falls to Relinquish_Default with slot null', () => {
        const PA = loadEngine();
        const st = PA.create(false);
        PA.write(st, 16, true);
        PA.write(st, 8, true);
        PA.release(st, 8);
        PA.release(st, 16);
        const r = PA.resolve(st);
        expect(r.value).toBe(false);
        expect(r.slot).toBe(null);
    });

    test('writing null IS release — the BACnet relinquish idiom', () => {
        const PA = loadEngine();
        const st = PA.create(0);
        PA.write(st, 16, 42);
        PA.write(st, 8, 75);
        PA.write(st, 8, null);
        expect(PA.resolve(st)).toEqual({ value: 42, slot: 16 });
    });
});

test.describe('point-arbitration: false and 0 are COMMANDS, not NULL', () => {

    test('false at slot 8 beats true at slot 16', () => {
        const PA = loadEngine();
        const st = PA.create(false);
        PA.write(st, 16, true);
        PA.write(st, 8, false);
        const r = PA.resolve(st);
        expect(r.value).toBe(false);      // the command, verbatim
        expect(r.slot).toBe(8);           // NOT resting on rd
    });

    test('0 at slot 8 beats 100 at slot 16', () => {
        const PA = loadEngine();
        const st = PA.create(0);
        PA.write(st, 16, 100);
        PA.write(st, 8, 0);
        const r = PA.resolve(st);
        expect(r.value).toBe(0);
        expect(r.slot).toBe(8);
    });

    test('resolve reports slot null iff resting on Relinquish_Default', () => {
        const PA = loadEngine();
        const st = PA.create(0);
        PA.write(st, 8, 0);               // command 0 — rd is ALSO 0
        expect(PA.resolve(st).slot).toBe(8);   // same value, but commanded
        PA.release(st, 8);
        expect(PA.resolve(st).slot).toBe(null); // now genuinely resting
    });
});

test.describe('point-arbitration: bad writes throw', () => {

    // The engine runs in a vm context, so its RangeError/TypeError are
    // that realm's constructors — `toThrow(RangeError)` (an instanceof
    // check against THIS realm) never matches. Match message + .name.

    test('write rejects slot numbers outside 1..16', () => {
        const PA = loadEngine();
        const st = PA.create(0);
        for (const bad of [0, 17, 1.5, -8, '8', NaN, undefined]) {
            expect(() => PA.write(st, bad, 1), 'write n=' + String(bad))
                .toThrow(/slot must be an integer 1\.\.16/);
            expect(() => PA.release(st, bad), 'release n=' + String(bad))
                .toThrow(/slot must be an integer 1\.\.16/);
        }
        try { PA.write(st, 0, 1); } catch (e) {
            expect(e.name).toBe('RangeError');
        }
    });

    test('write rejects undefined as a value — neither command nor NULL', () => {
        const PA = loadEngine();
        const st = PA.create(0);
        expect(() => PA.write(st, 8, undefined))
            .toThrow(/undefined is not a command/);
        try { PA.write(st, 8, undefined); } catch (e) {
            expect(e.name).toBe('TypeError');
        }
        expect(PA.resolve(st)).toEqual({ value: 0, slot: null }); // untouched
    });
});

test.describe('point-arbitration: cross-page consistency anchor', () => {

    // The seeded worked example on html/tools/bacnet-priority.html:
    // a hand override of 0 at slot 8 sitting on a sequence writing 65
    // at slot 16, Relinquish_Default 0. That page's resolver and this
    // engine must tell the same story — PV is 0 AT SLOT 8 (a stale
    // hand, not the resting state), and releasing 8 hands the point
    // back to the sequence at 65.
    test('slot 8 = 0 over slot 16 = 65, rd = 0 — then release 8', () => {
        const PA = loadEngine();
        const st = PA.create(0);
        PA.write(st, 16, 65);
        PA.write(st, 8, 0);
        expect(PA.resolve(st)).toEqual({ value: 0, slot: 8 });
        PA.release(st, 8);
        expect(PA.resolve(st)).toEqual({ value: 65, slot: 16 });
    });
});
