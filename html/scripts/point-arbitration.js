// ──────────────────────────────────────────────────────────────────────
// point-arbitration.js — a real, sparse BACnet-style 16-slot priority
// array: the command-arbitration core behind commandable points.
//
// Loaded as a *classic* script (no type="module"), same convention as
// /scripts/fbe-engine.js and /scripts/pid-engine.js: a consuming page
// adds
//
//     <script src="/scripts/point-arbitration.js"></script>
//
// inside its {% block scripts %}, BEFORE its own inline IIFE, and
// reaches the API through the window.PriorityArray global. The 11ty
// build copies this file through unchanged — nothing transpiles or
// bundles.
//
// PURE — no DOM, no timers. The page owns which slots mean what and
// when to write them; this file owns only the array and the resolve
// rule.
//
// API (window.PriorityArray):
//
//   PriorityArray.create(relinquishDefault)
//       → state { slots, rd }. `slots` is a length-17 array indexed
//       1..16 (index 0 is unused padding so slot numbers read
//       naturally); every slot starts null (relinquished). `rd` is the
//       Relinquish_Default, stored typed — false and 0 are meaningful
//       resting values, not "empty".
//
//   PriorityArray.write(state, n, value)
//       Command slot n (an integer 1..16) with a typed value. THROWS a
//       RangeError on any other n — a bad slot number is a shell-code
//       bug, not user input, and a silent no-op would teach the wrong
//       lesson (the write "succeeding" while the point ignores it).
//       Writing `null` is legal and identical to release(state, n):
//       in BACnet, relinquishing IS a NULL write to the slot. Writing
//       `undefined` THROWS a TypeError — it is neither a command nor
//       a NULL, only a bug.
//
//   PriorityArray.release(state, n)
//       Write NULL to slot n (same RangeError rule). The slot stops
//       commanding; it does NOT write a zero.
//
//   PriorityArray.resolve(state)
//       → { value, slot }. The lowest-numbered non-null slot wins:
//       `value` is that slot's stored value verbatim and `slot` is its
//       number. If every slot is null, `value` is state.rd and `slot`
//       is null — so `slot === null` if and only if the point is
//       resting on Relinquish_Default.
//
// THE NULL-vs-FALSE CONTRACT (this distinction is the lesson):
// only `null` is NULL. `false` and `0` are COMMANDS — a slot holding
// false outranks a lower-priority slot holding true, and a hand
// override of 0 % holds the point at zero until the slot is released.
// Values are stored typed and resolve() never coerces: false stays
// false, 0 stays 0, and neither ever becomes undefined or "".
//
// The DDC Workbench commands each actuator point on three levels —
// slot 8 (Manual Operator), slot 16 (the sequence), and the
// Relinquish_Default fallback when both are NULL. Only the two slots
// are ever written; Relinquish_Default is a separate property, not a
// "slot 17" (the distinction tools/bacnet-priority teaches). The
// array underneath is the full sixteen, which is why resolve() scans
// rather than special-casing those two numbers.
//
// Consumers: simulators/ddc-workbench.html.
// Tests: tests/point-arbitration.spec.js (pure-Node vm loader).
// ──────────────────────────────────────────────────────────────────────

'use strict';

const PriorityArray = (function () {
    'use strict';

    const SLOT_MIN = 1;
    const SLOT_MAX = 16;

    // Shared slot-number gate for write/release. Rejects anything that
    // is not an integer 1..16 — see the header for why this throws.
    function checkSlot(n) {
        if (typeof n !== 'number' || !Number.isInteger(n) ||
                n < SLOT_MIN || n > SLOT_MAX) {
            throw new RangeError(
                'PriorityArray: slot must be an integer 1..16, got ' +
                String(n));
        }
    }

    // Fresh state: all sixteen slots relinquished, resting on the
    // given Relinquish_Default. `rd` is stored typed — pass false for
    // a binary point, 0 for an analog one; no default is supplied
    // here, because the right resting value is point config, not
    // arbitration logic.
    function create(relinquishDefault) {
        const slots = new Array(SLOT_MAX + 1).fill(null);
        return { slots: slots, rd: relinquishDefault };
    }

    // Command slot n. `null` relinquishes (identical to release);
    // `undefined` is a bug and throws.
    function write(state, n, value) {
        checkSlot(n);
        if (value === undefined) {
            throw new TypeError(
                'PriorityArray: undefined is not a command — write a ' +
                'typed value, or null to release');
        }
        state.slots[n] = value;
    }

    // Relinquish slot n — write NULL, never zero.
    function release(state, n) {
        checkSlot(n);
        state.slots[n] = null;
    }

    // The whole arbitration rule: scan from slot 1 and take the first
    // non-null value, verbatim. No coercion, no averaging, no
    // special-cased slot numbers.
    function resolve(state) {
        for (let n = SLOT_MIN; n <= SLOT_MAX; n++) {
            if (state.slots[n] !== null) {
                return { value: state.slots[n], slot: n };
            }
        }
        return { value: state.rd, slot: null };
    }

    return { create: create, write: write, release: release, resolve: resolve };
})();

if (typeof window !== 'undefined') { window.PriorityArray = PriorityArray; }
