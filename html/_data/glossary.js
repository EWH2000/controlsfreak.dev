// ──────────────────────────────────────────────────────────────────────
// glossary.js — the site glossary. One entry per headword.
//
// The single source every gloss consumer reads. Today that is the
// `gloss` build transform + the `glossaryGuard` collection in
// .eleventy.js; the multi-consumer future (a command-palette definition
// row, gloss support inside quiz-engine.js's `explain` rendering, a
// JSON-LD DefinedTerm emitter) is exactly why the definitions live in
// ONE keyed file rather than inline in page markup. Same reasoning as
// the quiz banks next door: two consumers, one source, no drift.
//
// Shape:
//     'kebab-id': {
//         term:   'display headword',        // panel <dfn> text, PLAIN TEXT
//         def:    'one-to-three sentences',  // limited inline HTML allowed
//         owners: ['/education/….html'],     // pages that TEACH this term
//     }
//
// `term` is HTML-escaped by the transform. `def` is inserted RAW so a
// definition can carry <strong>/<em>/<code> and, when a definition ever
// states a temperature, the site's data-us/data-metric span pair (the
// panels are load-time DOM, so units.js's walker reaches them). Treat
// `def` as trusted authored markup, not as user input.
//
// `owners` is the §7.4 suppression list — the pages where the term is
// TAUGHT, and therefore the pages where a gloss would shadow the site's
// own teaching beat. The build FAILS if a page in this list carries a
// mark for the term, and it fails again if an owners path stops naming
// a real page (the anti-vacuity probe — a stale path would silently
// stop suppressing, exactly the decay EXEMPT_TEMPLATES' stops-resolving
// rule exists to prevent). `owners: []` is legal and means the term is
// used bare everywhere and defined nowhere yet — the zero-definition
// stall the ratified §8 amendment brought into scope.
//
// Entry ids are kebab-case and are the public contract:
//     data-gloss="sr-latch"  ↔  glossary['sr-latch']  ↔  id="gloss-tip-sr-latch"
//
// CURATION: docs/tooltip-glossary-scoping.md §8, RATIFIED AS AMENDED
// 2026-08-10 — that blockquote governs, and no term lands here without
// clearing all three criteria. §4 collision terms are NOT eligible for
// a plain entry; when phase 5 arrives they get a distinct
// `kind: 'disambiguation'` flag so the component can render them
// visibly differently. Deliberately not built now.
//
// ── SENSE-GREPS (criterion 3: single-sense site-wide) ─────────────────
// Run before drafting, per term, over html/ + src/. Verdicts recorded
// here so the next pass re-checks the finding rather than re-deriving
// it. NOTE the scoping record files all three of these headwords in
// §3a (VERIFIED single-sense), not §3b — the greps below are a
// re-confirmation at pilot time, not a §3b graduation.
//
//   sr-latch          — 54 'SR latch' + 12 'sr-latch' + 230 bare 'latch' /
//                       120 'latches' / 32 'latched' / 3 'latching'. Every
//                       one is the hold-until-cleared sense, block or
//                       behaviour. The two JS-comment uses ('one-way
//                       latch', 'anecdote latch' in vav-systems.html) are
//                       the same metaphor applied to a boolean flag, not a
//                       second sense. SINGLE-SENSE. Drafting care, from
//                       §3a: the site deliberately discloses that
//                       reset-dominant flavours exist and matter for
//                       safeties, so this definition stays neutral on
//                       which input wins when both are TRUE — 'set-dominant'
//                       is its own qualifier, not part of this headword.
//                       Bare 'latch' is NOT marked: 'the alarm latches' is
//                       an ordinary verb, and the collocation being marked
//                       is what resolves the sense (criterion 3).
//
//   wiresheet         — 185 'wiresheet' + 78 'Wiresheet' + 7 'wiresheets'
//                       + 2 'WIRESHEET'; 6 'wiresheetVisible' are JS
//                       identifiers, not prose. ZERO spaced 'wire sheet'
//                       anywhere under html/. One sense throughout: the
//                       graphical logic page. SINGLE-SENSE.
//
//   change-of-value   — 11 'change-of-value' + 21 'COV' + 10
//                       'COV_Increment' + the cased variants; zero hits
//                       for 'covariance' or 'coefficient of variation'.
//                       Every occurrence is the BACnet subscribe-and-be-
//                       notified sense. SINGLE-SENSE.
// ──────────────────────────────────────────────────────────────────────

module.exports = {
    'sr-latch': {
        term: 'SR latch',
        def: 'The one block in the boolean family with a memory. A TRUE on '
           + '<strong>S</strong> drives the output TRUE and it stays there on '
           + 'its own — the input can drop, the latch holds — until a TRUE on '
           + '<strong>R</strong> clears it. Wire a trip to S and a momentary '
           + 'fault becomes a standing alarm that waits for a person.',
        owners: ['/education/boolean-logic-latches.html'],
    },

    // Vendor wording, deliberate: the owning lesson names where the word
    // came from as an origin note, which is disclosure. A two-sentence
    // panel has no room to disclose, so it would land as a product
    // reference instead — so this definition names the neutral alternates
    // and skips the etymology. Guardrail: avoid exact vendor names.
    'wiresheet': {
        term: 'wiresheet',
        def: 'The graphical logic page — function blocks with their pins '
           + 'joined by wires, read left to right from the inputs that see '
           + 'the real world through to the outputs that command equipment. '
           + 'Depending on the tool you may hear it called the program or the '
           + 'function diagram instead.',
        owners: ['/education/function-blocks.html'],
    },

    // Prose-defined on TWO pages, both listed. The scoping record's §3a
    // row says the definition lives in the bacnet-basics quiz BANK; that
    // is true and incomplete — bacnet-vs-modbus.html and
    // bacnet-services.html both define it in running prose, so the term
    // is a define-elsewhere stall, not a zero-definition one. The bank
    // copy (html/_data/quizzes/bacnet-basics.js) is not an owner here
    // because quiz surfaces are out of scope entirely until §7.2's
    // component question is answered — the guard cannot suppress on a
    // surface nothing may mark.
    'change-of-value': {
        term: 'change-of-value (COV)',
        def: 'BACnet\'s alternative to polling a point over and over: '
           + 'subscribe once and the device tells you when the value moves — '
           + 'past its <code>COV_Increment</code> for an analog, on any change '
           + 'of state for a binary. On a busy trunk that is the difference '
           + 'between constant chatter and quiet until something happens.',
        owners: [
            '/education/bacnet-vs-modbus.html',
            '/education/bacnet-services.html',
        ],
    },
};
