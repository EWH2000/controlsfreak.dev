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
//
// ── PHASE 2 PASS (2026-08-14) ─────────────────────────────────────────
// Convention for every block below: counts are OCCURRENCES (grep -oE),
// not lines, over html/ + src/ on this branch. Surface tags: TOOLS /
// EDU (pages minus each index), LANDINGS (home + section indexes + the
// four topic hubs + guides), SIMS (simulator pages incl. both workbench
// pages + the hidden AHU mockup), BANKS (html/_data/quizzes/), SCRIPTS
// (html/scripts/). Phases 2–3 mark PROSE on tools, education pages and
// landings only, so SIMS / BANKS / SCRIPTS counts are sense evidence,
// never marking scope. §3a rows are re-confirmations (the pilot's
// convention); §3b rows are graduations — each carries the in-scope
// stall test as well as the sense verdict.
//
// §3a re-confirmations (the 14 unshipped rows, drafted this pass):
//
//   priority-array    — 26 TOOLS + 25 EDU + 14 LANDINGS + 17 SIMS +
//                       9 BANKS + 9 SCRIPTS + 6 data ('priority array' /
//                       'Priority_Array' / 'commandable'). Near-misses,
//                       both excluded by full-phrase matching: 'top-
//                       priority fault' (refrigerant-loop.html) and the
//                       abort reason 'preempted-by-higher-priority-task'
//                       (bacnetErrors.js). SINGLE-SENSE. Never mark bare
//                       'priority'.
//
//   relinquish-default — 15 TOOLS (all bacnet-priority) + 4 EDU +
//                       2 LANDINGS + 5 SIMS + 10 SCRIPTS + 1 BANK, both
//                       the spaced and underscored spellings. Bare
//                       'default' is ordinary English and unmatched.
//                       SINGLE-SENSE.
//
//   bbmd family       — 119 EDU (118 on bacnet-networking, the definer)
//                       + 5 TOOLS + 9 LANDINGS + 45 BANKS for BBMD /
//                       'Broadcast Distribution' / BDT / 'foreign
//                       device'. No competing sense anywhere.
//                       SINGLE-SENSE (each headword).
//
//   ddc               — 128 total, every surface class. ZERO prose hits
//                       for 'direct digital' site-wide — the purest
//                       zero-definition stall in the corpus, exactly as
//                       §3a recorded. SINGLE-SENSE. The proper name
//                       'DDC Workbench' is a fixed compound (§8) — not
//                       a marking site.
//
//   dx                — 8 TOOLS + 24 EDU + 8 LANDINGS + 68 SIMS +
//                       8 BANKS + 25 SCRIPTS. 'Direct expansion' is
//                       spelled out ONLY inside SVG <desc> text and
//                       source comments (AT-only / non-prose surfaces);
//                       visible prose never expands it. SINGLE-SENSE.
//
//   mat/oat/rat/dat   — 23 TOOLS + 35 EDU + 1 LANDING + 169 SIMS +
//                       30 BANKS + 92 SCRIPTS across the four acronyms
//                       + 'MA-T' variants. air-handlers.html teaches the
//                       HYPHENATED point-name spellings (RA-T / OA-T /
//                       MA-T / DA-T, L506); the workbenches use the
//                       solid forms. One sense per station. SAT is NOT
//                       in this family — two-sensed (supply-air vs
//                       saturation temperature), per §3a. SINGLE-SENSE
//                       (each headword).
//
//   hoa               — 20 EDU (all start-stop-commands, the definer) +
//                       3 LANDINGS + 25 BANKS. One meaning throughout.
//                       SINGLE-SENSE.
//
//   interposing-relay — 15 EDU (all start-stop-commands) + 2 TOOLS
//                       (transformer-sizing's VA table + worked example)
//                       + 1 LANDING + 17 BANKS. SINGLE-SENSE.
//
//   permissive        — 25 EDU + 3 LANDINGS + 27 BANKS ('permissive' /
//                       'run permit'). Noun/adjective uses only; bare
//                       'permitted' is ordinary English and unmatched.
//                       reading-a-wiresheet (12 uses) LEANS on the term
//                       from its first use (L119) without defining it —
//                       checked for ownership, ruled a non-owner.
//                       SINGLE-SENSE.
//
//   superheat/subcooling — 74 TOOLS + 135 EDU + 61 LANDINGS + 63 SIMS +
//                       168 BANKS + 66 SCRIPTS. Always the refrigerant-
//                       circuit quantities. metering-devices-txv-eev
//                       (50 uses) defers by back-link at its page-intro
//                       — the canonical NON-owner shape — and
//                       refrigerant-cycle-basics defers forward at L257.
//                       SINGLE-SENSE (each headword).
//
//   glide             — 26 TOOLS (all refrigerant-pt) + 8 EDU +
//                       3 LANDINGS + 10 SIMS + 7 BANKS + 24 SCRIPTS.
//                       Near-miss confirmed exactly as §3a warned: the
//                       ordinary VERB on three air-side prose sites
//                       ('dampers glide toward minimum',
//                       vav-systems.html:631, duct-static-control.html
//                       :139/:185). The noun is refrigeration-only.
//                       SINGLE-SENSE for the noun; mark in refrigeration
//                       context only, hand-placed.
//
//   deadhead          — 14 EDU + 11 BANKS, noun and verb ('deadheads',
//                       pump-control.html:678) both the no-flow-path
//                       failure. Defined in prose at pump-control
//                       L249 (the §3a cite of L193 had drifted).
//                       SINGLE-SENSE.
//
//   mbh               — 83 TOOLS (6 tools) + 1 EDU + 2 LANDINGS +
//                       6 SCRIPTS + 2 data. All the thousands-of-BTU/hr
//                       unit; MMBtu is a distinct token and a distinct
//                       unit. SINGLE-SENSE.
//
//   economizer family — 36 TOOLS + 132 EDU + 32 LANDINGS + 71 SIMS +
//                       119 BANKS for 'economiz*' / 'free cooling' /
//                       'enthalpy changeover'. No waterside economizer
//                       anywhere under html/, re-confirming the §2
//                       downgrade to single-sense. SINGLE-SENSE. The
//                       disable half is called 'high-limit lockout' on
//                       the lesson — that collocation resolves to the
//                       economizer sense, never to a generic high-limit
//                       (§4 collision term).
//
// §3b graduations (the 16 never-checked rows — 14 pass, 2 fail):
//
//   apdu              — 8 TOOLS + 22 EDU + 6 LANDINGS + 1 BANK +
//                       17 data. Every hit is the BACnet Application
//                       Protocol Data Unit (incl. 'max APDU length').
//                       No lowercase-identifier near-miss. Defined in
//                       bacnet-networking.html's frame-anatomy bullet
//                       list (L154) — so a DEFINE-ELSEWHERE stall, not
//                       the zero-definition one §3a grouped it with.
//                       Bare on both BACnet tools + bacnet-basics.
//                       SINGLE-SENSE. PASSES in-scope.
//
//   tsm               — 1 TOOLS prose hit (bacnet-error-codes.html:264,
//                       bare) + the 'tsm-timeout' enum ids/notes in
//                       _data/bacnetErrors.js / bacnetErrorNotes.js.
//                       The only expansion lives in a data-file note
//                       string rendered per-decode — no page prose
//                       defines it, so zero-definition. SINGLE-SENSE.
//                       PASSES in-scope (one site, extreme stall).
//
//   bibb              — 27 EDU + 5 LANDINGS + 1 data. Defined at length
//                       in bacnet-services.html §bibbs (L124–L167);
//                       used BEFORE definition on bacnet-basics.html
//                       :266 and bare on bacnet-vs-modbus (3 anchored
//                       uses). SINGLE-SENSE. PASSES in-scope.
//
//   holding/input register — 'holding register' 13 TOOLS + 18 EDU +
//                       10 BANKS; 'input register' 10 TOOLS + 4 EDU +
//                       6 BANKS. Compound-only matching is load-bearing:
//                       bare 'register' also carries the BVLL verb
//                       (Register-Foreign-Device, bacnet-networking,
//                       the flagged hazard — confirmed) AND the design-
//                       system 'equipment register' sense in comments /
//                       class names (refrigerant-loop.html ×28,
//                       styleguide). On the compounds: one sense, the
//                       Modbus data tables. SINGLE-SENSE (compounds).
//                       PASSES in-scope (modbus-decoding leans bare).
//
//   dry/wet contact   — 12 EDU + 1 LANDING + 2 practice shells + 1 SIM
//                       + 15 BANKS + 1 SCRIPT for 'dry contact' / 'wet
//                       contact' / 'wetting current'. Defined IN PROSE
//                       at controller-wiring.html:156 (the full family
//                       in one passage) — the §3b row's 'defined in the
//                       bank' claim was incomplete. status-and-proof:58
//                       defers by back-link (non-owner shape). Bare
//                       'dry'/'wet' are ordinary and unmatched
//                       (dry-bulb/wet-bulb are separate compounds).
//                       SINGLE-SENSE (compounds). PASSES in-scope
//                       (start-stop-commands:68, status-and-proof).
//
//   y1/y2/g           — 17 SIMS + 12 SCRIPTS, zero anywhere else. The
//                       thermostat-terminal dialect is WORKBENCH-ONLY.
//                       FAILS the in-scope test (no prose occurrence on
//                       tools / education / landings) — exactly the
//                       §3b-predicted casualty. No entry.
//
//   make/break/cut-out — 'makes at' / 'breaks at' / 'cut-out' / 'cut-in':
//                       18 SIMS + 10 SCRIPTS + 1 BANK, zero on in-scope
//                       surfaces. Near-miss accounted: the education
//                       'cutout' hits (duct-static-control ×4 etc.) are
//                       the HIGH-STATIC CUTOUT — §4's high-limit family,
//                       not this staging-relay dialect. FAILS the
//                       in-scope test (workbench-only). No entry.
//
//   floodback         — 3 TOOLS + 1 EDU + 7 SIMS + 5 BANKS + 8 SCRIPTS.
//                       One sense everywhere (liquid to the compressor).
//                       Defined em-led at superheat-subcooling.html:164;
//                       bare in refrigerant-pt MARKUP prose at L235 (its
//                       other two tool hits are JS status strings, which
//                       marking cannot reach anyway). SINGLE-SENSE.
//                       PASSES in-scope.
//
//   cv/kv             — 66 TOOLS (59 on valve-cv) + 5 EDU + 15 LANDINGS
//                       + 12 SCRIPTS. Most non-tool hits are the tool's
//                       own NAME in relatedLinks labels; true bare prose
//                       sits on valve-authority (L18/L172) and the
//                       hydronics hub intro (L21). Near-miss found:
//                       uppercase 'CV' = CONSTANT VOLUME (air-unit-
//                       identification:334, vav-systems:149) — matching
//                       must stay case-sensitive on the 'Cv'/'Kv'
//                       tokens. SINGLE-SENSE (case-sensitive). PASSES
//                       in-scope.
//
//   inherent/installed characteristic + equal-percentage — 15 TOOLS
//                       (valve-authority 10, valve-cv 5) + 2 LANDINGS.
//                       Bare 'characteristic' is ordinary English and
//                       unmatched. One sense: valve flow-vs-travel
//                       curves. valve-authority's §Installed
//                       characteristic (L127) teaches the contrast;
//                       equal-percentage is used-by-role everywhere and
//                       mechanically defined NOWHERE — a zero-definition
//                       stall. SINGLE-SENSE (both). PASSES in-scope
//                       (valve-cv L139 leans bare; landing descs).
//
//   velocity-pressure — 46 TOOLS + 19 EDU + 13 LANDINGS + 9 BANKS for
//                       'velocity pressure' / 'VP'. Near-miss checked:
//                       'vapor pressure' exists on the psych surfaces
//                       but NEVER abbreviates to VP, so the token is
//                       safe. Defined em-led at air-balancing.html:54;
//                       bare on airflow / duct-traverse / vav-systems.
//                       SINGLE-SENSE. PASSES in-scope.
//
//   dry-bulb/wet-bulb — 222 TOOLS + 90 EDU + 12 LANDINGS + 46 BANKS +
//                       43 SCRIPTS for the compounds + 'DB'/'WB'. THE
//                       ABBREVIATIONS ARE NOT SAFE: 'DB' = DEADBAND on
//                       comparators-and-deadband.html (SP + DB in prose
//                       L289 and SVG text L342/L351, 'the DB constant'
//                       L417), and lowercase 'db' is the FBE's deadband
//                       block id. Marks match the SPELLED compounds
//                       only — the sr-latch collocation principle.
//                       SINGLE-SENSE (spelled compounds). PASSES
//                       in-scope.
//
//   turndown          — 23 TOOLS (power-energy-converter, incl. its
//                       'Sizing & turndown' section) + 1 EDU prose use
//                       (equipment-staging:266, bare) + landings. The
//                       verb 'turn down' (equipment-staging:262) is the
//                       same capacity sense; the geometric 'turns down'
//                       lives only in workbench SVG <desc> text
//                       (AT-only, non-prose). Noun is one sense.
//                       SINGLE-SENSE. PASSES in-scope.
//
//   short-cycling     — 12 EDU + 2 TOOLS + 14 BANKS + SIMS, noun /
//                       verb / gerund / 'anti-short-cycle' compound.
//                       One sense (rapid start-stop beyond equipment
//                       rest needs). NO page defines the headword —
//                       comparators-and-deadband teaches the mechanism
//                       as CHATTER (L150–L165) and timers-and-delays
//                       teaches the cure as MIN ON/OFF TIMES (§min-
//                       times) — so zero-definition. Don't mark inside
//                       the compound 'anti-short-cycle timer'.
//                       SINGLE-SENSE. PASSES in-scope.
//
//   inrush/holding VA — 14 TOOLS (all transformer-sizing) + 3 EDU +
//                       5 BANKS. transformer-sizing's FAQ defines the
//                       pair outright ('What is inrush versus holding
//                       VA?'). The lessons' 'locked-rotor inrush'
//                       (timers:448, comparators:157) is the same
//                       energization-surge concept at motor scale — one
//                       definition at that shared abstraction is right
//                       everywhere. 'holding'/'sealed VA' appear only
//                       on the owning tool. SINGLE-SENSE. PASSES
//                       in-scope.
//
//   primary-secondary — 11 EDU + 5 LANDINGS + 16 BANKS + 1 SIM for
//                       'primary-secondary' / 'closely-spaced tees'.
//                       Compound-only matching is load-bearing: bare
//                       'primary'/'secondary' collide with transformer
//                       windings on the electrical surfaces. Defined in
//                       full at hydronic-loops.html:375–392 (the twin-T
//                       passage); load-piping defers by back-link at
//                       L488 (non-owner shape). SINGLE-SENSE
//                       (compounds). PASSES in-scope.
//
//   service-factor    — exactly ONE occurrence site-wide:
//                       tools/affinity-laws.html:220, inside the
//                       damage-stakes scope note, bare, defined
//                       nowhere. Trivially SINGLE-SENSE; zero-
//                       definition. PASSES in-scope (one site, high
//                       stakes — the §3b row's own words).
// ──────────────────────────────────────────────────────────────────────

// ── §5 MULTI-BENIGN PASS (2026-08-15) ─────────────────────────────────
// The third content tier (scoping record §5): senses differ but context
// always disambiguates, so a plain entry is safe IF it is written at
// the shared abstraction AND matched on the right token. What makes
// that safe is a WRITTEN MATCHING RULE PER TERM — it lives in each §5
// entry's leading comment below, next to the data it governs, and the
// marking lanes read it as the contract (briefs are hypotheses; this
// file is the contract). Inventory: a 13-family read-only fan-out over
// education / tools / guides / landings prose (2026-08-15), every
// occurrence classified per page. The §5 premise HELD in all 13
// families — no §4 demotion anywhere — and the tier is thinner than
// the scoping record guessed (raw-count overshoot again: ~121 markable
// sites survive out of ~1,100 raw hits; three families nearly emptied
// once their teach pages were suppressed).
//
// Families inventoried and NOT earning an entry, with the reason:
//   vfd bypass       — zero markable sites; every electrical-bypass
//                      occurrence sits on vfds.html §7, its teacher.
//   hot-gas bypass   — zero occurrences of any kind in scope.
//   face-and-bypass  — one prose site (coil-freeze-risk:252) whose
//                      sentence self-defines; an entry would exist only
//                      to shadow it. NOT foldable into bypass-damper —
//                      a different device (coil-face modulation vs
//                      supply-to-return spill).
//   bypass leg (hyd) — one marginal anaphoric site, already anchored to
//                      its teacher in the same sentence; deferred to
//                      the re-triage rather than shipped markless.
//   DPBV             — its sole occurrence IS its teaching beat
//                      (pump-control:253).
//
// Cross-family surface rulings the fan-out surfaced, recorded once so
// the per-entry rules can cite them by name:
//   SWEEP-SCOPE      — §5 marks land on education / tools / guides /
//                      landings prose ONLY, the phase-2 surface set.
//                      Simulator pages (workbenches included) and deep
//                      practice pages are OUT of marking scope; §5
//                      occurrences there (fcu fold prose, the desktop
//                      controller-wiring explainer, refrigerant-loop's
//                      P-h disclaimer at :1354) are sense evidence,
//                      never mark sites, and the per-entry inventory
//                      counts are counts WITHIN this scope. The
//                      verification round re-derived several of them
//                      site-wide and read the gap as an undercount —
//                      this line is why it isn't.
//   ANCHORED-LINK    — text inside an <a> is unmarkable: a button
//                      cannot nest inside an anchor (invalid HTML,
//                      interactive-in-interactive). Both standing picv
//                      cases already anchor into the owner's #picv
//                      section, so the reader's route to the
//                      definition exists.
//   CODE-NOTATION    — FBE block-tag chains inside <code> ('AI → MUL →
//                      ADD → LIMIT → AO', setpoint-math-reset:256) are
//                      block-type notation, not the term of trade in
//                      prose; never marked, and the surrounding
//                      paragraph spells the types out in full.
//   FAQ-FRONTMATTER  — `faqs:` strings render via faqBlock() AND feed
//                      head.njk's FAQPage JSON-LD; permanently
//                      unmarkable on both grounds (dual consumer).
//   UNITS-SPAN       — data-us/data-metric span interiors are
//                      unmarkable: units.js rewrites the span's
//                      textContent on toggle and would destroy a
//                      spliced button.
//   MIXED-RUN        — an enumeration mixing entry terms with
//                      non-entry siblings ('AI / AO / AV and BI / BO /
//                      BV') is skipped whole; a half-buttoned list is
//                      worse than none. Homogeneous runs mark normally.
//   COINED-COMPOUND  — a hyphenated coinage embedding a term
//                      ('overshoot-and-hunt', 'regenerative front
//                      end', 'high-latent designs') is a different
//                      lexical item; never marked.
//   NAME-REFERENCE   — a proper-name reference to a page's own example
//                      ('load its freeze-stat example') is a name, not
//                      a use; never marked.
//   JS-PAINTED PROSE — widget-anecdote innerHTML strings render real
//                      prose the build-time transform can never reach
//                      (vav-systems:832, air-handlers:782,
//                      duct-static-control:893). Known floor, per the
//                      transform header — never "fix" by writing a
//                      button into a JS string.
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

    // ── BACnet ──────────────────────────────────────────────────────

    // ONE id for the priority-array/commandable pair: the two words are
    // one story (a commandable point IS a point with the array), so one
    // definition serves every collocation. Marks may match 'priority
    // array' / 'Priority_Array' / 'commandable' — never bare 'priority'
    // (the corpus also carries 'top-priority fault' and the abort reason
    // 'preempted-by-higher-priority-task'; see the sense-grep).
    'priority-array': {
        term: 'priority array',
        def: 'The 16-slot arbitration list behind every commandable BACnet '
           + 'output. Writers don\'t overwrite each other — each claims a '
           + 'slot (life safety near the top, the program in the middle, the '
           + 'operator override at 8) and the lowest-numbered slot holding a '
           + 'value wins. Release yours and the next one down takes over; a '
           + 'point that works this way is what the trade calls '
           + '<em>commandable</em>.',
        owners: [
            '/tools/bacnet-priority.html',
            '/education/bacnet-basics.html',
        ],
    },

    // Owner is the tool only: bacnet-basics uses the property in passing
    // (L284, L454 — 'falls through to') while bacnet-priority.html:252
    // carries the canonical 'not slot 17' framing this definition echoes
    // on purpose — the workbench preambles and point-arbitration.js
    // repeat it too, so the glossary cannot drift from them.
    'relinquish-default': {
        term: 'relinquish default',
        def: 'The value a commandable point falls back to when every slot in '
           + 'its priority array is empty — the answer to what this output '
           + 'should do when nobody is commanding it. It is its own property, '
           + 'not slot 17, and it is why a fully released point settles '
           + 'somewhere deliberate instead of wherever the last writer left '
           + 'it.',
        owners: ['/tools/bacnet-priority.html'],
    },

    // The BBMD family ships as THREE ids (bbmd / broadcast-distribution-
    // table / foreign-device): the definitions genuinely differ — a
    // device role, its peer table, and a registration mode — the MAT-vs-
    // OAT granularity case, not the wiresheet one. Care point from §3a,
    // carried here for all three: bacnet-ip-converter's mention is about
    // the six-byte address FORMAT a BDT entry carries, and no definition
    // may imply any tool on this site configures BBMDs — none does.
    'bbmd': {
        term: 'BBMD',
        def: 'The BACnet/IP Broadcast Management Device — the thing that '
           + 'carries BACnet broadcasts across IP routers, which otherwise '
           + 'drop them. One BBMD per subnet, each re-sending its local '
           + 'broadcasts to its peers as unicasts, so a Who-Is on one subnet '
           + 'is heard on all of them; which peers it forwards to is its '
           + 'Broadcast Distribution Table, and the tables have to agree.',
        owners: ['/education/bacnet-networking.html'],
    },

    'broadcast-distribution-table': {
        term: 'Broadcast Distribution Table (BDT)',
        def: 'The peer list inside a BBMD — the address of every other BBMD '
           + 'it forwards local broadcasts to. The tables are kept symmetric '
           + '(every BBMD lists the full set), and an entry missing on one '
           + 'end shows up in the field as a subnet that never hears '
           + 'discovery.',
        owners: ['/education/bacnet-networking.html'],
    },

    'foreign-device': {
        term: 'foreign device',
        def: 'A BACnet/IP device with no BBMD on its own subnet — an '
           + 'engineering workstation across a WAN, say — that registers '
           + 'with a remote BBMD instead: a Register-Foreign-Device message '
           + 'with a time-to-live, renewed before it expires, buys it '
           + 'broadcast visibility without being local.',
        owners: ['/education/bacnet-networking.html'],
    },

    // Seed correction, per the sense-grep: the arc brief grouped APDU
    // with the zero-definition terms, but bacnet-networking.html:154
    // defines it in the frame-anatomy bullet list — a define-elsewhere
    // stall with a real owner. The tools (error-codes, ip-converter) are
    // the bare stall sites.
    'apdu': {
        term: 'APDU',
        def: 'The Application Protocol Data Unit — the slice of a BACnet '
           + 'frame that carries the actual service: the ReadProperty '
           + 'request, the I-Am, the SubscribeCOV. The layers wrapped around '
           + 'it (BVLL, NPDU) are addressing and transport; when a decoder '
           + 'blames a malformed APDU, it means the service payload itself.',
        owners: ['/education/bacnet-networking.html'],
    },

    // owners: [] — the only expansion on the site lives in a
    // bacnetErrorNotes.js note string rendered per-decode, and no page
    // prose defines the term. Wording stays consistent with that note
    // deliberately (the relinquish-default reasoning: repetition is what
    // keeps two surfaces from drifting).
    'tsm': {
        term: 'TSM',
        def: 'The Transaction State Machine — the bookkeeping a BACnet '
           + 'device keeps for each confirmed request in flight while it '
           + 'waits on the ACK, the next segment, or the reply. An abort '
           + 'naming a TSM timeout means that bookkeeping gave up waiting — '
           + 'usually a dropped packet, an offline peer, or MS/TP token '
           + 'trouble.',
        owners: [],
    },

    'bibb': {
        term: 'BIBB',
        def: 'A BACnet Interoperability Building Block — one service paired '
           + 'with one role, named area-service-role: DS-RP-B is Data '
           + 'Sharing, ReadProperty, B for the side that answers (an A '
           + 'initiates). A device\'s BIBB list is its real capability '
           + 'statement — "it\'s BACnet" means nothing until the BIBBs say '
           + 'which services it speaks, and from which side.',
        owners: ['/education/bacnet-services.html'],
    },

    // ── Modbus ──────────────────────────────────────────────────────

    // Two ids — the definitions genuinely differ (read/write vs read-
    // only, 4xxxx vs 3xxxx). THREE owners each: modbus-basics teaches
    // the tables (L121), modbus-functions defines them in its closing
    // prose (L129: 'holding and input registers are 16-bit words') and
    // per-FC table cells, and modbus-register-viewer's 'Modbus
    // essentials' mini-glossary (L294/L331) does it again — on all
    // three, a panel would show the reader a sentence they can already
    // see. bacnet-vs-modbus was checked and ruled a NON-owner: its
    // '(16-bit words)' parenthetical (L33) is a courtesy inside a
    // comparison page, not the page's teaching beat. Matching is
    // compound-only — see the sense-grep for the two bare-'register'
    // near-misses (the BVLL verb; the design-system register).
    'holding-register': {
        term: 'holding register',
        def: 'Modbus\'s read/write 16-bit table — where setpoints and '
           + 'commands live, read with FC03, written with FC06 or FC16. The '
           + '4xxxx prefix in a vendor manual names this table (40001 on '
           + 'paper is holding register 0 on the wire), and what the sixteen '
           + 'bits mean is entirely the register map\'s business.',
        owners: [
            '/education/modbus-basics.html',
            '/tools/modbus-functions.html',
            '/tools/modbus-register-viewer.html',
        ],
    },

    'input-register': {
        term: 'input register',
        def: 'Modbus\'s read-only 16-bit table — sensor and status values, '
           + 'read with FC04 and never written. The 3xxxx prefix names this '
           + 'table; the same sixteen anonymous bits as a holding register, '
           + 'minus the write path.',
        owners: [
            '/education/modbus-basics.html',
            '/tools/modbus-functions.html',
            '/tools/modbus-register-viewer.html',
        ],
    },

    // ── Controls & electrical ───────────────────────────────────────

    // owners: [] — 128 occurrences, zero definitions; the highest
    // frequency-to-effort entry in the inventory. The proper name 'DDC
    // Workbench' is a fixed compound and never a marking site (§8).
    'ddc': {
        term: 'DDC',
        def: 'Direct digital control — the trade\'s name for microprocessor-'
           + 'based building controls, where the sequence runs as software '
           + 'in a field controller rather than in pneumatics or relay '
           + 'logic. The DDC system on a job means the controllers, their '
           + 'programs, and the network between them, as distinct from the '
           + 'equipment they command.',
        owners: [],
    },

    'hoa': {
        term: 'HOA (Hand-Off-Auto)',
        def: 'The Hand-Off-Auto selector on a starter or drive — the switch '
           + 'that says who is in charge. Hand runs the equipment right at '
           + 'the panel, Off stops it there, and only Auto gives the '
           + 'controller its say: a BO commanding a motor whose switch sits '
           + 'in Hand or Off changes nothing, so check the switch before '
           + 'you doubt the program.',
        owners: ['/education/start-stop-commands.html'],
    },

    // Carries the two-reason definition (contact rating + voltage class)
    // per the §3a care note — both reasons are the entry, not trivia.
    'interposing-relay': {
        term: 'interposing relay',
        def: 'The small relay between a controller\'s BO and the starter '
           + 'circuit it ultimately runs, there for two nameplate reasons: '
           + '<strong>contact rating</strong> — a BO\'s pilot-duty contact '
           + 'is no match for a contactor coil\'s inductive draw — and '
           + '<strong>voltage class</strong> — starter circuits commonly '
           + 'run at 120 VAC, which has no business on a DDC terminal '
           + 'strip. The BO switches a relay it can handle; the relay '
           + 'switches the circuit the BO never could.',
        owners: ['/education/start-stop-commands.html'],
    },

    // Noun uses only ('run permit' resolves here too); bare 'permitted'
    // is ordinary English. reading-a-wiresheet leans on the chain from
    // its first use without defining it — checked, non-owner.
    'permissive': {
        term: 'permissive',
        def: 'A condition that must be TRUE before equipment is allowed to '
           + 'run — proof made, no fault standing, damper proven open. '
           + 'ANDed together they form the permissive chain whose output is '
           + 'the run permit: the sequence decides when it <em>wants</em> '
           + 'to run, the permissives decide whether it <em>may</em>.',
        owners: ['/education/boolean-logic-latches.html'],
    },

    // ONE id for the dry/wet/wetting-current family — one wiring story,
    // one definition serves every collocation (the wiresheet-side call,
    // vs the MAT-side split). Marks match the compounds 'dry contact' /
    // 'wet contact' / 'wetting current' only. Owner is the LESSON:
    // controller-wiring.html:156 defines the whole family in one
    // passage — the §3b row's 'defined in the controller-wiring bank'
    // undersold the disk. status-and-proof defers by back-link at L58
    // and is deliberately not an owner.
    'dry-contact': {
        term: 'dry vs. wet contact',
        def: 'A dry contact carries no voltage of its own — it is just a '
           + 'switch, sensed by the small <em>wetting current</em> the '
           + 'binary input supplies and completed back to COM. A wet '
           + 'contact arrives already powered from another panel, and '
           + 'landing it as if it were dry back-feeds one panel from the '
           + 'other — know which kind you have before you land it.',
        owners: ['/education/controller-wiring.html'],
    },

    // ONE id for the inrush / holding (sealed) VA pair — the contrast IS
    // the definition (the §3b row's framing). 'Locked-rotor inrush' in
    // the lessons is the same energization-surge concept at motor scale,
    // so the definition is written at that shared abstraction. Owner:
    // transformer-sizing's FAQ defines the pair verbatim on-page.
    'inrush': {
        term: 'inrush vs. holding VA',
        def: 'Inrush is the momentary surge as a coil or motor first '
           + 'energizes — a contactor pulling in or a spring-return '
           + 'actuator driving draws several times its resting figure '
           + '(locked-rotor inrush is the motor-scale version). The resting '
           + 'figure is the holding, or sealed, VA: budget the continuous '
           + 'load on holding VA, then confirm the transformer and fuse '
           + 'ride out everything inrushing at once on a cold-morning '
           + 'power-up.',
        owners: ['/tools/transformer-sizing.html'],
    },

    // owners: [] — no page defines the headword: comparators-and-
    // deadband teaches the mechanism as CHATTER and timers-and-delays
    // teaches the cure as minimum on/off times, each under its own name.
    // Marking care: never inside the compound 'anti-short-cycle timer'.
    'short-cycling': {
        term: 'short-cycling',
        def: 'Equipment starting and stopping in rapid succession, faster '
           + 'than its own recovery needs — a compressor rated for a '
           + 'handful of starts an hour being asked for ten a minute, oil '
           + 'never returning, windings never cooling. It is a symptom, '
           + 'not a disease: an oversized stage, a too-narrow deadband, or '
           + 'poor turndown is usually the actual defect.',
        owners: [],
    },

    // owners: [] — one occurrence site-wide (affinity-laws' damage-
    // stakes note), defined nowhere; the §3b row's 'one site, high
    // stakes'. The entry exists so the sentence that decides whether a
    // motor survives a speed increase stops pivoting on an undefined
    // term.
    'service-factor': {
        term: 'service factor',
        def: 'The nameplate multiplier saying how far past rated horsepower '
           + 'a motor can run continuously under standard conditions — 1.15 '
           + 'means 15% headroom. It is margin for the unplanned, not '
           + 'capacity to plan on: a motor living inside its service factor '
           + 'runs hotter and ages faster.',
        owners: [],
    },

    // ── Air side ────────────────────────────────────────────────────

    // owners: [] — 'direct expansion' is spelled out only in SVG <desc>
    // text and comments; visible prose never expands it. Zero-definition.
    'dx': {
        term: 'DX',
        def: 'Direct expansion — cooling done by refrigerant evaporating in '
           + 'a coil sitting right in the airstream, as opposed to chilled '
           + 'water made elsewhere and piped over. A DX coil is that '
           + 'evaporator; DX stage 1 is the compressor stage feeding it.',
        owners: [],
    },

    // FOUR ids for the temperature-station family — the brief's own
    // granularity example (definitions genuinely differ per station).
    // Each definition names both spellings (air-handlers teaches the
    // hyphenated point names, the workbenches use the solid forms) —
    // the §3a unify-the-spellings care point, answered in the panel
    // text. SAT deliberately has NO entry: two-sensed (supply-air vs
    // saturation), per §3a. Owner for all four: air-handlers.html,
    // which defines the stations in air-path order (L506) and whose
    // whole page is the walk through them.
    'mat': {
        term: 'MAT (mixed-air temperature)',
        def: 'The reading after return and outdoor air blend in the mixing '
           + 'box, ahead of the coils — written MAT or MA-T. It should sit '
           + 'at the damper-weighted average of return and outdoor, which '
           + 'makes it the honesty check on the mixing section: a mixed-air '
           + 'reading that doesn\'t match the command is telling you where '
           + 'the blades really are.',
        owners: ['/education/air-handlers.html'],
    },

    'oat': {
        term: 'OAT (outdoor-air temperature)',
        def: 'The outdoor-air temperature at the unit\'s intake — written '
           + 'OAT or OA-T. Half the air-side sequence keys off it: '
           + 'economizer changeover, low-ambient lockouts, and reset '
           + 'schedules all lean on this one sensor, which is why its '
           + 'shielding and placement matter more than most.',
        owners: ['/education/air-handlers.html'],
    },

    'rat': {
        term: 'RAT (return-air temperature)',
        def: 'The temperature of the air coming back from the zones — '
           + 'written RAT or RA-T. It is the building\'s blended report of '
           + 'what happened to the supply air, and the reference side of a '
           + 'differential economizer changeover.',
        owners: ['/education/air-handlers.html'],
    },

    'dat': {
        term: 'DAT (discharge-air temperature)',
        def: 'The temperature of the air leaving the unit, downstream of '
           + 'the coils and fan — written DAT or DA-T. It is the proof of '
           + 'what the coil bank just did: discharge minus mixed is the '
           + 'unit\'s temperature work, and a discharge that doesn\'t move '
           + 'while a valve strokes is a service call.',
        owners: ['/education/air-handlers.html'],
    },

    // TWO ids for the economizer family: 'free cooling' folds into this
    // one (it names the job the machinery does — one definition serves
    // both collocations), while enthalpy changeover is its own
    // mechanism and gets its own entry below. The disable half is
    // deliberately phrased 'the changeover gate says no' — the lesson's
    // 'high-limit lockout' collocation resolves to the economizer
    // sense, and this panel must never read as a generic high-limit
    // (§4 collision term).
    'economizer': {
        term: 'economizer (free cooling)',
        def: 'The damper assembly and logic that cool with outside air '
           + 'instead of the coil when outside air is the cheaper source — '
           + 'the free cooling everyone means by the word. While the '
           + 'changeover gate says yes, the mixing dampers modulate past '
           + 'minimum to hold the discharge target; when it says no, they '
           + 'ride at minimum and the coil does the work.',
        owners: ['/education/economizers.html'],
    },

    // Second sentence deliberately echoes the owning lesson (L225) —
    // the relinquish-default reasoning: the panel appears only off the
    // owning page, and repeating the lesson's framing is what keeps the
    // two surfaces from drifting.
    'enthalpy-changeover': {
        term: 'enthalpy changeover',
        def: 'An economizer changeover that compares total heat rather than '
           + 'temperature alone — economize only when the outside air '
           + 'carries less enthalpy than the return, latent load included. '
           + 'In a humid climate it is the difference between an economizer '
           + 'that saves energy and one that costs it; the price is '
           + 'humidity sensors, and humidity sensors drift.',
        // economizer-ratio added at the Phase 2 close (owner ruling
        // 2026-08-14): its enthalpy-tab notes restate this definition
        // in-viewport, so the M4 lane marked zero occurrences there by
        // judgment — listing it makes the guard enforce that judgment
        // instead of leaving it to the next lane's read.
        owners: [
            '/education/economizers.html',
            '/tools/economizer-ratio.html',
        ],
    },

    // dry-bulb / wet-bulb: TWO ids (the definitions differ — plain
    // temperature vs evaporative floor). MARKING IS COMPOUND-ONLY and
    // the entry comments are the record of why: 'DB' means DEADBAND on
    // comparators-and-deadband.html (prose and SVG text), so the
    // abbreviations are never matched — see the sense-grep.
    'dry-bulb': {
        term: 'dry-bulb temperature',
        def: 'The plain air temperature — what an ordinary thermistor or '
           + 'RTD reads, no moisture in the story; the DB axis on a psych '
           + 'chart. On its own it says nothing about how much water the '
           + 'air carries — pinning that down takes a second, independent '
           + 'property beside it.',
        owners: ['/education/psychrometrics-basics.html'],
    },

    'wet-bulb': {
        term: 'wet-bulb temperature',
        def: 'The temperature a wetted sensor falls to as water evaporates '
           + 'off it — the evaporative floor for the current air, the WB '
           + 'lines on a psych chart. The drier the air, the further '
           + 'wet-bulb sits below dry-bulb, which is why the pair together '
           + 'fixes the air\'s moisture when dry-bulb alone can\'t.',
        owners: ['/education/psychrometrics-basics.html'],
    },

    // Formula stays IP-native per the house metric policy (an engine-
    // methodology line with an IP constant, not a worked example).
    'velocity-pressure': {
        term: 'velocity pressure (VP)',
        def: 'The pressure the air\'s motion carries — total minus static '
           + 'at the probe, written VP. It rises with the square of air '
           + 'speed, which is why airflow math lives under square roots: '
           + 'in the IP frame, duct velocity is V = 4005 × √VP and a VAV '
           + 'pickup reads CFM = K × √VP.',
        owners: ['/education/air-balancing.html'],
    },

    // ── Hydronics ───────────────────────────────────────────────────

    'deadhead': {
        term: 'deadhead',
        def: 'A pump running against a closed loop — every two-way valve '
           + 'shut, no bypass anywhere, the impeller churning the same '
           + 'trapped water with nowhere for the energy to go but heat, '
           + 'noise, and wear. The cures are a differential-pressure '
           + 'bypass valve on a constant-speed loop, or a minimum-flow '
           + 'floor in the program on a variable-speed one.',
        owners: ['/education/pump-control.html'],
    },

    // ONE id for primary-secondary / closely-spaced tees / twin-T — one
    // piping story, one definition serves every collocation. Marks
    // match the full compounds only: bare 'primary'/'secondary' collide
    // with transformer windings on the electrical surfaces.
    'primary-secondary': {
        term: 'primary-secondary (closely-spaced tees)',
        def: 'Two hydronic loops that touch only at a pair of closely-'
           + 'spaced tees — the twin-T — set so close there is essentially '
           + 'no pressure drop between them, so each loop\'s pump runs as '
           + 'if the other didn\'t exist. It is how a boiler that insists '
           + 'on constant flow serves a building whose demand swings all '
           + 'day; the little stub between the tees looks like a piping '
           + 'mistake and is the entire mechanism.',
        owners: ['/education/hydronic-loops.html'],
    },

    // ONE id for Cv / Kv (metric twin, same quantity). Matching is
    // CASE-SENSITIVE on the tokens: uppercase 'CV' is constant volume
    // on the air-side pages (see the sense-grep). The 60 °F in the
    // definition is part of Cv's actual definition, dual-stated with
    // the site's span pair.
    'cv': {
        term: 'Cv / Kv (flow coefficient)',
        def: 'A valve\'s capacity rating: the GPM of <span data-us="60 °F" '
           + 'data-metric="15.6 °C">60 °F</span> water it passes wide open '
           + 'at a 1 psi drop; Kv is the metric twin (m³/h at 1 bar). It '
           + 'rates the wide-open valve only — how flow behaves across the '
           + 'stroke is the valve\'s characteristic, a separate '
           + 'conversation from its size.',
        owners: ['/tools/valve-cv.html'],
    },

    // TWO ids for the characteristic family: the inherent-vs-installed
    // CONTRAST is one definition (this entry), while equal-percentage
    // is a specific curve shape with its own entry. Owner for the
    // contrast is valve-authority (its §Installed characteristic +
    // chart ARE the teaching); valve-cv leans and back-links, ruled a
    // non-owner.
    'installed-characteristic': {
        term: 'inherent vs. installed characteristic',
        def: 'The inherent characteristic is the flow-versus-travel curve a '
           + 'valve was machined with, measured at a constant drop on a '
           + 'bench; the installed characteristic is what that curve '
           + 'becomes in a real branch, where the drop shifts onto the '
           + 'valve as it closes. The two only resemble each other at high '
           + 'valve authority — as authority falls, the installed curve '
           + 'bows away and the first quarter of travel ends up doing all '
           + 'the work.',
        owners: ['/tools/valve-authority.html'],
    },

    // owners: [] — used by role on both valve tools, mechanically
    // defined nowhere on the site: a zero-definition stall under the
    // ratified §8 amendment.
    'equal-percentage': {
        term: 'equal-percentage',
        def: 'An inherent valve characteristic where each equal step of '
           + 'travel multiplies flow by roughly the same ratio — stingy '
           + 'off the seat, steep near wide open. It is the usual pick for '
           + 'control valves precisely because, distorted by a real '
           + 'circuit\'s falling drop, it lands near the linear response '
           + 'the control loop wants.',
        owners: [],
    },

    // ── Refrigeration ───────────────────────────────────────────────

    // superheat / subcooling: TWO ids (different measurements, different
    // reference curves, different lines of the circuit). Both owners per
    // the seed, confirmed on disk: the lesson defines both crisply
    // (L47) and refrigerant-pt's reference list teaches the dew/bubble
    // reference split in-viewport. metering-devices-txv-eev (50 uses)
    // is deliberately NOT an owner — its page-intro defers by back-link
    // ('Superheat &amp; Subcooling showed that…'), the canonical
    // non-owner shape — and that single call swings ~50 marks, so it is
    // flagged in the PR's contested-calls table for the owner to
    // confirm. refrigerant-cycle-basics defers forward the same way
    // (L257) and is likewise not an owner.
    'superheat': {
        term: 'superheat',
        def: 'How many degrees warmer the suction-line vapor runs than its '
           + 'saturation (dew) temperature at the measured suction pressure '
           + '— superheat = line T − dew T. Real superheat proves the '
           + 'evaporator finished the boil; too little means liquid is '
           + 'headed for the compressor, too much means the coil is running '
           + 'starved.',
        owners: [
            '/education/superheat-subcooling.html',
            '/tools/refrigerant-pt.html',
        ],
    },

    'subcooling': {
        term: 'subcooling',
        def: 'How many degrees cooler the liquid line runs than its '
           + 'saturation (bubble) temperature at the measured liquid '
           + 'pressure — subcooling = bubble T − line T. It proves the '
           + 'condenser fully condensed the vapor, so solid liquid — not '
           + 'bubbles — reaches the metering device.',
        owners: [
            '/education/superheat-subcooling.html',
            '/tools/refrigerant-pt.html',
        ],
    },

    // THREE owners — one more than the seed (refrigerant-pt only, with
    // a check note): on disk the term is bold-defined in refrigerant-
    // pt's reference list, em-defined in refrigerant-cycle-basics:93,
    // and em-defined again in superheat-subcooling:154, each with the
    // surrounding passage leaning on it. Marking care (§3a): the noun
    // only, in refrigeration context — 'the dampers glide' on the
    // air-side pages is the standing exhibit for why there is no
    // walker.
    'glide': {
        term: 'glide',
        def: 'On a zeotropic blend, the spread between the bubble point '
           + '(saturated liquid) and the dew point (saturated vapor) at '
           + 'one pressure — the blend boils across that small range '
           + 'instead of at one temperature. It is why superheat '
           + 'references dew and subcooling references bubble; average '
           + 'them on a high-glide blend and every reading is off by half '
           + 'the glide.',
        owners: [
            '/tools/refrigerant-pt.html',
            '/education/refrigerant-cycle-basics.html',
            '/education/superheat-subcooling.html',
        ],
    },

    'floodback': {
        term: 'floodback',
        def: 'Liquid refrigerant reaching the compressor — a pump for '
           + 'vapor that does not compress liquid — which is how slugged '
           + 'valves and washed-out bearings happen. Persistent low or '
           + 'zero superheat is the warning sign; find out why the '
           + 'evaporator isn\'t finishing the boil before running the '
           + 'machine hard.',
        owners: ['/education/superheat-subcooling.html'],
    },

    // ── Capacity & units ────────────────────────────────────────────

    // Carries the 1000× trap per the §3a care note — the trap IS what a
    // confused reader hovers for.
    'mbh': {
        term: 'MBH',
        def: 'Thousands of BTU per hour — the M is the Roman-numeral '
           + 'thousand, <em>not</em> mega. Misread it and you are off by '
           + '1000×: a 400 MBH boiler is 400,000 BTU/hr, and MMBtu/hr — '
           + 'the true million — is its own, bigger unit. Equipment '
           + 'schedules live in MBH; gas bills tend to live in therms and '
           + 'MMBtu.',
        owners: ['/tools/power-energy-converter.html'],
    },

    // Owner: power-energy-converter — its 'Sizing & turndown' section
    // plus the worked example (835 ÷ 570 ≈ 1.46:1) teach the ratio
    // in-viewport; this definition reuses that example so the two
    // surfaces cannot disagree.
    'turndown': {
        term: 'turndown',
        def: 'How far equipment can throttle below full fire before it '
           + 'must stop instead — stated as a ratio of maximum to minimum '
           + 'input: a burner that fires 835 MBH down to 570 has 1.46:1, '
           + 'nearly none. Poor turndown against a light load means the '
           + 'equipment cannot run low, so it cycles — turndown trouble '
           + 'reads as short-cycling on a trend.',
        owners: ['/tools/power-energy-converter.html'],
    },

    // ── §5 multi-benign (2026-08-15) — supervisory & points ─────────

    // MATCHING RULE: mark the two-word compound "front end" / "head
    // end" — space or hyphen, any case, singular or plural — where it
    // names the supervisory workstation; a "head end" token carries
    // THIS id (one entry, synonym pair — the def supplies the other
    // name immediately, so the panel heading never whiplashes the
    // reader). Bare "front"/"head" never mark. Exclusions:
    // COINED-COMPOUND 'regenerative front end' (drive input stage —
    // quiz-bank only today, but check the word before the match);
    // the wiresheet sense — the shared upstream segment of a logic
    // chain — lives in the quiz banks on the same footing and is
    // equally never this entry; FAQ-FRONTMATTER
    // (bacnet-ip-converter:16 — its prose twin at :102 is the
    // markable copy). owners: [] — no page teaches the term;
    // the nearest thing to a definition is a B-OWS table cell
    // (bacnet-services:210) that uses it as the familiar explanans.
    // Inventory 2026-08-15: 8 markable across 6 pages (the marking
    // lanes' measured count; the fan-out's "7 pages" was one high).
    'front-end': {
        term: 'front end',
        def: 'The supervisory workstation where a building\'s points, '
           + 'graphics, alarms and trends come together — the screen '
           + 'the operator lives in. The trade says <em>front end</em> '
           + 'and <em>head end</em> interchangeably; both name the same '
           + 'machine, and neither says anything about whose software '
           + 'is running on it.',
        owners: [],
    },

    // The five point-type acronyms share one MATCHING RULE: mark the
    // bare uppercase acronym at word boundaries, case-sensitive —
    // \b(AI|AO|BI|BO|UI)\b — including parenthesized "(AO)" and
    // homogeneous slash runs ("AI / AO"). NEVER mark a tag/terminal
    // shape — the acronym with an attached designator (UI3, AO1, AI:3,
    // "AI 3", BO-C) names a specific terminal or schedule point, not
    // the term of trade; both live in real prose
    // (controls-commissioning:40, start-stop-commands:62). MIXED-RUN
    // applies: bacnet-objects:124's "AI / AO / AV and BI / BO / BV"
    // skips whole (AV/BV have no entry). CODE-NOTATION applies
    // (setpoint-math-reset:256's block chain). FAQ-FRONTMATTER applies
    // (bacnet-objects:25 — its :150 body copy is the markable
    // surface). ANCHORED-LINK and SWEEP-SCOPE apply — the workbench
    // fold prose and the desktop controller-wiring explainer carry
    // family tokens and are simulator surfaces, out of marking scope.
    // Plurals (AIs) would mark but zero exist in scope. Inventory
    // 2026-08-15: 12 markable after the mixed-run skip (4
    // commanding-actuators AI + 2 duct-static + 2 status-and-proof +
    // 1 vfds + 2 bacnet-objects:150 + 1 voltage-drop).
    'ai': {
        term: 'AI (analog input)',
        def: 'A controller input that reads a continuously varying '
           + 'signal — a temperature, a pressure, a position feedback — '
           + 'as a number, typically arriving as resistance, voltage or '
           + 'milliamps. The AI is where the physical world becomes a '
           + 'value the program can do math on.',
        owners: [
            '/education/controls-commissioning.html',
            '/education/bacnet-basics.html',
        ],
    },

    'ao': {
        term: 'AO (analog output)',
        def: 'A controller output that commands <em>how much</em> '
           + 'rather than a state — typically 0–10 V or 4–20 mA '
           + 'driving a valve or damper to a fraction of its stroke, '
           + 'or a drive to a speed. An AO says <em>how far</em>, '
           + 'where a binary output only says <em>run</em>.',
        owners: [
            '/education/controller-wiring.html',
            '/education/controls-commissioning.html',
            '/education/commanding-actuators.html',
            '/education/bacnet-basics.html',
        ],
    },

    'bi': {
        term: 'BI (binary input)',
        def: 'A controller input that reads a two-state signal — a '
           + 'contact open or closed: a status, a proof, an alarm. No '
           + 'magnitude, no scaling — just which of two states the '
           + 'field device is in, and the wiring convention that decides '
           + 'what open means.',
        owners: [
            '/education/controller-wiring.html',
            '/education/controls-commissioning.html',
            '/education/bacnet-basics.html',
        ],
    },

    // start-stop-commands is an owner on its L68 beat ('The BO is the
    // decision: a dry contact inside the controller that closes when
    // the program says run') — it re-defines the BO despite deferring
    // wiring detail to Controller Wiring, and ~16 prose BO tokens ride
    // that call.
    'bo': {
        term: 'BO (binary output)',
        def: 'A controller output that switches rather than modulates — '
           + 'start/stop, open/close, enable/disable — usually a relay '
           + 'contact or a triac driving a starter or a two-position '
           + 'device. The decision is one bit; the horsepower comes '
           + 'from the circuit it switches.',
        owners: [
            '/education/controller-wiring.html',
            '/education/controls-commissioning.html',
            '/education/start-stop-commands.html',
            '/education/bacnet-basics.html',
        ],
    },

    // UNIVERSAL input, not user interface — the id reads wrong to a
    // developer, so saying it twice: this is the point type. The
    // sense-grep verified the user-interface sense never reaches
    // rendered prose (JS comments only: dew-point-calculator:237,
    // psychrometric-chart:518/780/972).
    'ui': {
        term: 'UI (universal input)',
        def: 'A controller input that can be software-configured to '
           + 'read the common input types — a thermistor\'s '
           + 'resistance, a transducer\'s voltage or milliamps, and on '
           + 'many controllers a dry contact as well. Universal inputs '
           + 'are why the same terminal block can land a thermistor '
           + 'today and a transmitter tomorrow.',
        owners: ['/education/controller-wiring.html'],
    },

    // ── §5 multi-benign — devices & safeties ────────────────────────

    // MATCHING RULE: complete device compounds only, case-insensitive,
    // across space/hyphen/closed spellings and plurals —
    // /freeze[-\s]?stats?\b/, /low[-\s]limit (thermo)?stat\b/,
    // /frost[-\s]?stat\b/ (last is zero-in-scope, kept for future
    // prose). NEVER stem to bare 'low-limit' — that stem is a
    // three-referent §4 collision (software MA-T override, BACnet
    // Low_Limit, this device), and four in-scope sentences carry the
    // device and a bare 'low-limit' side by side (coil-freeze-risk:277,
    // economizers:398, minimum-outdoor-air:289-290,
    // economizer-ratio:239). Never mark anaphoric 'the stat'.
    // NAME-REFERENCE applies (function-blocks:196 'its freeze-stat
    // example' skips). Owners: coil-freeze-risk (the tool's whole
    // frame), start-stop-commands (defines it inside the safety-string
    // beat + manual-reset teaching), boolean-logic-latches (the
    // device's trip/clear behaviour is the lesson's central motivating
    // case). Inventory 2026-08-15: 11 markable across 8 pages after
    // the name-reference skip.
    'freezestat': {
        term: 'freezestat',
        def: 'The hardwired coil-protection safety — a stat whose long '
           + 'capillary element snakes across the coil face and trips '
           + 'on the coldest foot of it, stopping the fan and closing '
           + 'dampers before a water coil can freeze and burst. Also '
           + 'called a freeze stat or low-limit stat, and commonly '
           + 'manual-reset: a trip stays tripped until a person finds '
           + 'out why.',
        owners: [
            '/tools/coil-freeze-risk.html',
            '/education/start-stop-commands.html',
            '/education/boolean-logic-latches.html',
        ],
    },

    // MATCHING RULE: the NOUN only — bare 'interlock'/'interlocks' and
    // the head of a modified noun phrase ('airflow interlock',
    // 'software interlocks' — mark just the word 'interlock(s)').
    // Verb and participle uses never mark ('the sequence interlocks
    // against', 'staging interlocked to proven airflow' — five live
    // cases, all flagged in the inventory). Owner: boolean-logic-
    // latches — it teaches the mechanism an interlock IS (the run
    // permit / permissive chain / fail-safe NC arc), naming interlocks
    // in its framing question; start-stop-commands draws the
    // copper-vs-software line (L313) without defining the word, so its
    // two tokens there stay markable — the non-owner shape.
    // vav-systems teaches ONE specific interlock as applied design and
    // stays a non-owner (the velocity-pressure precedent). Inventory
    // 2026-08-15: 7 markable across 5 pages.
    'interlock': {
        term: 'interlock',
        def: 'A tie between equipment and a condition it must not run '
           + 'without — proof of flow before a heater draws, an end '
           + 'switch before a fan starts — arranged so that losing the '
           + 'condition drops the equipment, not just blocks the '
           + 'start. One idea realized two ways: in copper for the '
           + 'trips that protect life and machines, in software for '
           + 'the polite coordination.',
        owners: ['/education/boolean-logic-latches.html'],
    },

    // ZERO markable sites today — every rendered-prose occurrence of
    // the phrase sits on its own owner page. The entry ships anyway:
    // it is the natural target the moment a future page says 'safety
    // string' in passing, and the palette / JSON-LD consumers read
    // this file too (the ak-factor shape). MATCHING RULE for that
    // future page: the exact phrase 'safety string(s)' (hyphenated
    // accepted). Do NOT auto-match 'safety circuit' — two senses in
    // scope (a device's wire+contact circuit at boolean-logic-
    // latches:130 vs the drive enable chain at start-stop-commands:321)
    // — and do NOT auto-match 'safety chain(s)' (function-blocks:148):
    // DIFFERENT referent — there it names the software boolean/latch
    // family the wiresheet builds (quizzes/function-blocks.js q71/78
    // use it the same way), not the hardwired starter-circuit string
    // this entry defines; marking it would contradict the sentence it
    // sits in.
    'safety-string': {
        term: 'safety string',
        def: 'The hardwired series circuit of safety contacts — freeze '
           + 'stat, high-static switch, firestat, overloads — wired in '
           + 'line with a starter\'s control power, so any one of them '
           + 'opening kills the equipment no matter what any software '
           + 'commands. The string is why a tripped safety outranks '
           + 'every override on the graphic.',
        owners: ['/education/start-stop-commands.html'],
    },

    // ONE combined entry, not two: the poles appear paired or adjacent
    // at two of the three markable sites (controls-commissioning:63
    // holds both in one sentence; status-and-proof:196 is the single
    // token 'NO/NC', which no single-pole entry could resolve), and
    // the house has combined-abstraction precedent (dry-contact,
    // installed-characteristic, inrush). MATCHING RULE: the spelled
    // forms 'normally open'/'normally closed' (space or hyphen, any
    // case) and the paired token 'NO/NC'. NEVER match bare 'NO' or
    // 'NC': every bare prose 'NO' outside the owner page is the
    // English word in emphatic caps (reading-a-wiresheet's trace
    // idiom — 'The first NO is your block'; the one abbreviation-sense
    // bare NO, commanding-actuators:280, is suppressed by ownership
    // anyway), and the dotted forms N.O./N/C have zero
    // corpus occurrences (do not pre-authorize; verify by hand if one
    // ever appears). Owner: commanding-actuators — L277-289 IS the
    // definition ('the word normally is the trap…'). boolean-logic-
    // latches:126 teaches the NC-safety fail-safe CONVENTION, not the
    // at-rest abstraction — non-owner, mark stands (the
    // velocity-pressure shape; flagged to the owner on the drafting
    // PR). Inventory 2026-08-15: 4 markable across 3 pages.
    'normally-open-closed': {
        term: 'normally open / normally closed (NO/NC)',
        def: 'The at-rest state — what a contact or a valve does with '
           + 'no actuation. <em>Normally</em> means the position with '
           + 'no power and no signal, not the position it usually '
           + 'operates in: a normally-open contact sits open until '
           + 'driven closed, a normally-closed valve springs shut the '
           + 'moment control disappears. Which way a device rests is a '
           + 'design decision about what failure should look like.',
        owners: ['/education/commanding-actuators.html'],
    },

    // ── §5 multi-benign — signals ───────────────────────────────────

    // MATCHING RULE: 'live zero' / 'live-zero', any case, wherever it
    // appears in rendered body prose. Owners: analog-sensing (the
    // dedicated H2, id=live-zero — the page other pages link into) and
    // signal-scaling (its ref-note at :242 IS a one-line definition —
    // the page teaches the term in miniature, so suppression costs
    // nothing and encodes the relationship). commanding-actuators:76
    // self-defines in apposition and stays a NON-owner — the page
    // teaches command spans and points at analog-sensing#live-zero in
    // the same sentence; its mark stands. Inventory 2026-08-15: the
    // live-zero half of 7 family marks.
    'live-zero': {
        term: 'live zero',
        def: 'A signal range whose bottom is a real, non-zero value — '
           + '4 mA in a 4–20 loop, 2 V in 2–10 — so a dead circuit '
           + 'reads <em>below range</em> instead of as a legitimate '
           + 'zero. The offset is the diagnostic: a broken wire and an '
           + 'honest bottom-of-scale reading stop looking identical.',
        owners: [
            '/education/analog-sensing.html',
            '/tools/signal-scaling.html',
        ],
    },

    // MATCHING RULE — by PART OF SPEECH, not sense: mark the verbal /
    // participial family only ('railed', verb 'rails', 'hard-rail')
    // where a signal, reading or commanded position is pinned at an
    // extremity of its range — EITHER end (metering-devices:269 rails
    // a valve command at 0% or 100%). The NOUN 'rail(s)' is NEVER
    // marked: every noun use in the SWEEP-SCOPE is a drawing-metaphor
    // number-line rail, a power rail in comments, one guardrail
    // metaphor (setpoint-math-reset:363) — or the pinned-state concept
    // in noun form ('pins the reading to a rail',
    // temperature-sensors:73), which the PoS rule excludes cleanly, so
    // that line never reads as a missed mark. (Outside the sweep
    // scope the workbench pages add more noun senses — the
    // parameter-rail UI region, more guardrail metaphors — all equally
    // excluded by part of speech.) The last def sentence reuses the analog-sensing
    // quiz's own correction ('flatline-at-range-top') so the two
    // surfaces cannot disagree: railed is NOT a failed sensor.
    'railed': {
        term: 'railed',
        def: 'Pinned at the end of its range — either end. A railed '
           + 'reading is a ceiling or a floor, not a measurement: it '
           + 'says the truth is <em>at least</em> (or at most) this '
           + 'much, and nothing more. A railed sensor hasn\'t failed — '
           + 'it is answering honestly at the edge of what it can say.',
        owners: ['/education/analog-sensing.html'],
    },

    // ── §5 multi-benign — air, psychrometrics & TAB ─────────────────

    // MATCHING RULE: mark bare 'enthalpy' (case-insensitive; plural
    // included, zero prose instances today) in rendered body prose,
    // including adjectival uses that still denote the moist-air
    // quantity ('enthalpy economizer logic', 'an enthalpy high
    // limit'). COMPOUND BOUNDARY: when the next word across a space or
    // hyphen is 'changeover', the occurrence belongs to the existing
    // enthalpy-changeover entry, never this one — /enthalpy[- ]
    // changeover/i. Tab-NAME references in prose ('the Enthalpy tab')
    // never mark — the unglossed 'Dry-bulb tab' in the same
    // economizer-ratio:31 sentence is the standing precedent. Owners:
    // psychrometrics-basics (the definitional callout the rest of the
    // site defers to) and economizers — its L222 defines inline while
    // deferring ('total heat per pound of air (Psychrometrics Basics
    // defines it properly)'), and owners[] is the only mechanism that
    // can protect that beat: the economizer-ratio/enthalpy-changeover
    // ruling (2026-08-14, M4) is the precedent, applied here the same
    // way. psychrometric-chart is NOT an owner — its one prose
    // occurrence is a methodology footnote using the term (the
    // scoping-record guess did not reproduce). The refrigerant P-h
    // sense appears nowhere in SWEEP-SCOPE (its one instance is
    // refrigerant-loop:1354's disclaimer, a simulator surface), so no
    // page exclusion is needed — the def stays air-primary with the
    // moist-air frame stated. DEVICE-NOUN EXCLUSION (verification
    // ruling 2026-08-15): when 'enthalpy' names an energy-recovery
    // device class rather than the quantity — the head noun is
    // device, wheel, core, plate, kind, exchanger
    // (dedicated-outdoor-air:297-300 is the standing cluster) — it
    // never marks; the quantity def under a device name is the wrong
    // panel, the sensible/latent COINED-COMPOUND parallel.
    // Inventory 2026-08-15: 19 markable across 9 pages after the
    // device-noun exclusion (dedicated-outdoor-air drops to its :217
    // quantity use).
    'enthalpy': {
        term: 'enthalpy',
        def: 'Total heat content per pound of dry air — sensible and '
           + 'latent rolled into one number, the h on a psych chart, '
           + 'in Btu/lb. It is the property to compare when moisture '
           + 'matters: two air streams at the same dry-bulb can carry '
           + 'very different loads, and enthalpy is the number that '
           + 'says so.',
        owners: [
            '/education/psychrometrics-basics.html',
            '/education/economizers.html',
        ],
    },

    // sensible-heat + latent-heat share one MATCHING RULE: mark (1)
    // the exact compound 'sensible heat' / 'latent heat' — including
    // the hyphenated-modifier form ('sensible-heat ratio', wrapping
    // 'sensible heat' inside 'sensible heat ratio' until SHR ever gets
    // its own entry) and an intervening <em> inside the button — and
    // (2) the adjective immediately preceding a thermal-quantity noun
    // (heat, load, capacity, cooling, heating, gain, removal, share,
    // split, duty, penalty), wrapping the ADJECTIVE only — the
    // dry-bulb precedent. NEVER mark: ordinary 'sensible' = reasonable
    // (tell: non-thermal head noun — order, point, match, tightening,
    // size; 'reasonable' substitutes cleanly); the adverb 'sensibly'
    // (thermal but compoundless — and NOTE any scan must stem on
    // 'sensib', the adverb is invisible to a 'sensible' grep);
    // bare/elliptical uses with no head noun ('Latent is whatever's
    // left'); distributed enumerations sharing one head ('total /
    // sensible / latent capacity' — MIXED-RUN's sibling: no clean wrap
    // exists); COINED-COMPOUND ('high-latent designs',
    // 'sensible-only wheel'); UNITS-SPAN interiors (airside-load:226,
    // :237). 'Latent defect'-style non-thermal latent: zero instances
    // in scope. Owners (both entries): psychrometrics-basics (defines
    // both as the halves of enthalpy), dedicated-outdoor-air (the
    // Latent/Sensible Split H2 — the definition beat), economizers
    // (the deceptive-wedge beat defines both emphatically). The
    // methodology surfaces — the airside-load and coil-sizing TOOLS,
    // and the coil-selection EDUCATION page's 1.08-constant
    // scaffolding — stay NON-owners by the dry-bulb calibration: a
    // methodology note or scaffolding clause doesn't confer
    // ownership. Inventory 2026-08-15: 16 markable across 7 pages,
    // the two entries jointly.
    'sensible-heat': {
        term: 'sensible heat',
        def: 'The heat a thermometer sees — energy that moves dry-bulb '
           + 'temperature when air gains or loses it. Sensible load is '
           + 'the part ΔT captures, and the word covers sensible '
           + 'heating, cooling and capacity alike: always the dry-bulb '
           + 'half of the story, with the moisture half kept separate.',
        owners: [
            '/education/psychrometrics-basics.html',
            '/education/dedicated-outdoor-air.html',
            '/education/economizers.html',
        ],
    },

    'latent-heat': {
        term: 'latent heat',
        def: 'The heat riding in water vapor — energy spent evaporating '
           + 'moisture, which no thermometer in the airstream sees, '
           + 'paid back when the vapor condenses on a cold coil. Latent '
           + 'load is why a muggy day works a cooling coil far harder '
           + 'than the dry-bulb reading alone suggests.',
        owners: [
            '/education/psychrometrics-basics.html',
            '/education/dedicated-outdoor-air.html',
            '/education/economizers.html',
        ],
    },

    // Cross-referenced pair with ak-factor; the two defs each name the
    // other so a reader landing on either gets the fork. MATCHING
    // RULE, tested longest-match first: the Ak pattern
    // \bAk\b(?:[ -][Ff]actors?)? runs FIRST (capital-A lowercase-k
    // exactly — case is the exclusion mechanism, lowercase 'ak' lives
    // only in ids and JS); then \bK[ -][Ff]actors?\b where Ak did not
    // already consume the text. The left boundary before K is
    // load-bearing twice: it excludes 'risK FACTORs'
    // (coil-freeze-risk) and the K-factor substring inside
    // 'AK-FACTOR'. Bare single-letter 'K' is NEVER marked, even in
    // flow-equation prose ('CFM = K × √VP') — that is the variable
    // symbol, not the term. Owners: the three pages that teach K's
    // definition near-verbatim ('literally the CFM it reads at exactly
    // 1.0 in. w.c.') — airflow (the tool), air-balancing §1,
    // vav-systems' box-anatomy beat. Inventory 2026-08-15: exactly ONE
    // markable site survives suppression (equipment-airflow:35);
    // airside-load:229 renders the term only inside a data-metric
    // attribute (UNITS-SPAN — structurally unreachable, flagged not
    // fixed).
    'k-factor': {
        term: 'K-factor',
        def: 'A VAV box\'s flow coefficient: the CFM its '
           + 'velocity-pressure pickup reads at exactly 1.0 in. w.c., '
           + 'so flow = K × √VP. It is the whole personality of the '
           + 'box\'s flow reading — and a different animal from a '
           + 'diffuser\'s Ak factor, which multiplies a measured '
           + 'velocity, not √VP.',
        owners: [
            '/tools/airflow.html',
            '/education/air-balancing.html',
            '/education/vav-systems.html',
        ],
    },

    // ZERO markable sites today — duct-traverse owns the entire
    // corpus. Ships as k-factor's cross-reference target and for the
    // palette / JSON-LD consumers (the safety-string shape). Matching
    // rule above under k-factor (the Ak pattern runs first; bare
    // prose 'Ak' wraps just 'Ak').
    'ak-factor': {
        term: 'Ak factor',
        def: 'A diffuser\'s effective flow area in square feet — for a '
           + 'stated instrument held in a stated position — so flow = '
           + 'Ak × the velocity that instrument reads. It is a '
           + 'calibration artifact, not geometry: not the neck\'s πr², not the face '
           + 'dimensions, and not the VAV-box K-factor, which '
           + 'multiplies √VP instead.',
        owners: ['/tools/duct-traverse.html'],
    },

    // MATCHING RULE: the air-side compound only — /bypass (damper|
    // box)(e?s)?/i where the sentence moves air. The other bypass
    // domains earned no entry (see the §5 pass banner), the verb never
    // marks in any inflection, the bare anaphoric noun never marks,
    // and 'face-and-bypass' is a different device excluded by the
    // entry-set decision. Cross-domain trap on the record: 'bypass
    // leg' occurs once meaning an AIR stream
    // (psychrometrics-basics:183, face-and-bypass mixing) — medium
    // must be verified before marking, which is exactly why marks are
    // hand-placed. Owner: air-balancing §3 (defines bypass systems,
    // the box and the damper). Inventory 2026-08-15: 2 markable
    // (vfds:359, vav-systems:509).
    'bypass-damper': {
        term: 'bypass damper',
        def: 'An air-side spill path — a damper from supply to return '
           + 'that opens as VAV boxes throttle down, relieving duct '
           + 'static so the fan keeps moving air without '
           + 'over-pressurizing the trunk. A different device from '
           + 'face-and-bypass dampers, which modulate how much air '
           + 'crosses a coil.',
        owners: ['/education/air-balancing.html'],
    },

    // ── §5 multi-benign — staging & loops ───────────────────────────

    // MATCHING RULE: three shapes, prose only — (a) the compound in
    // any spelling ('lead/lag', 'lead-lag', 'lead lag'), always the
    // staging sense; (b) role-attributive 'lead <unit>' / 'lag <unit>'
    // where <unit> is staged equipment (pump, boiler, chiller, unit,
    // stage); (c) anaphoric 'the lead' / 'the lag' only inside a
    // passage the page has already established as staging via (a) or
    // (b). Bare tokens NEVER mark: bare 'lead' is a sensor or motor
    // conductor (temperature-sensors, voltage-drop, status-and-proof)
    // or the ordinary verb; bare 'lag' is process lag on pid-basics or
    // the ordinary verb; 'lagging' is the power-factor sense
    // (electrical-quick-calc:192); 'leading' is digit-position or
    // ordinary English. Owner: equipment-staging §3 ('The one that
    // runs first is the lead; the next to come on is the lag').
    // pump-control §6 is headed 'Lead/Lag and Parallel Pumps' but
    // explicitly disclaims teaching and defers by link — the recorded
    // non-owner shape (the primary-secondary/load-piping precedent),
    // so its line-689 tokens stay markable. Note pump-control carries
    // element id="lead-lag" — no collision with the transform's
    // gloss-tip-lead-lag namespace, verified distinct. Inventory
    // 2026-08-15: 5 markable across 3 pages.
    'lead-lag': {
        term: 'lead/lag',
        def: 'The staging roles in a multiple-unit plant: the '
           + '<em>lead</em> runs first, the <em>lag</em> comes on when '
           + 'the lead can\'t carry the load alone — with three pumps, '
           + 'first lag and second lag. A good sequence rotates the '
           + 'roles on runtime or a schedule so the hours spread '
           + 'across the machines instead of piling onto one.',
        owners: ['/education/equipment-staging.html'],
    },

    // MATCHING RULE — the SUBJECT test, corpus-verified with zero
    // ambiguous cases: mark \b[Hh]unt(s|ing|ed)?\b only where the
    // thing hunting is equipment or a control entity (loop, valve,
    // damper, sequence, stage, plant, RTU), used intransitively or
    // reflexively ('hunts itself to an early grave'), including bare
    // gerund nominals ('prone to hunting', 'overshoot and hunting').
    // The ordinary fault-search register always has a human subject
    // and usually an object or for/in complement ('hunt for what
    // changed', 'which half to hunt in', 'Hunt downstream') — never
    // marked. COINED-COMPOUND: pid-basics:92's 'overshoot-and-hunt'
    // skips (same footing as 'regenerative front end'). Owner:
    // equipment-staging — L368 introduces the term em-marked with the
    // full mechanism ('the sequence would <em>hunt</em>, cycling a
    // pump on and off indefinitely'); pid-basics USES the word twice
    // but teaches the phenomenon under 'oscillation'/'ringing' and
    // never defines 'hunting', so its L47 mark is exactly where a
    // novice wants the definition — non-owner (the scoping-record
    // guess did not reproduce). economizers:398's apposition
    // complements rather than shadows — non-owner, mark stands.
    // Inventory 2026-08-15: 15 markable across 10 pages after the
    // coined-compound skip.
    'hunting': {
        term: 'hunting',
        def: 'A control loop oscillating instead of settling — the '
           + 'valve, damper or staging sequence overshoots, corrects, '
           + 'overshoots the other way, and never comes to rest on '
           + 'setpoint. Chronic hunting means something in the loop is '
           + 'wrong — tuning pushed too hard, a deadband too thin, a '
           + 'valve with poor authority, a sensor reading the wrong '
           + 'spot — and it wears actuators and equipment on top of '
           + 'whatever comfort complaint it causes.',
        owners: ['/education/equipment-staging.html'],
    },

    // MATCHING RULE: the word-bounded acronym 'PICV'/'PICVs' and the
    // full compound 'pressure-independent control valve(s)' (space
    // accepted for the hyphen). When the compound is immediately
    // followed by its parenthetical acronym — 'pressure-independent
    // control valves (PICVs)' — that is ONE gloss site: wrap the
    // compound, leave the parenthetical bare (load-piping:481 and
    // pump-control:696 are the standing cases). Bare
    // 'pressure-independent' NEVER marks: it overwhelmingly modifies
    // VAV boxes (the air-side flow-metering sense those pages teach
    // themselves) and once relief fans (building-pressure:504).
    // ANCHORED-LINK applies twice (air-balancing:187 and
    // vav-systems:383 carry PICV inside <a> tags pointing at the
    // owner's #picv section). Owner: balancing — the dedicated PICV
    // section (id=picv) every other mention on the site links into.
    // Inventory 2026-08-15: 3 markable; coil-selection:305's bare
    // acronym is the highest-value mark (the other two self-expand in
    // place).
    'picv': {
        term: 'PICV',
        def: 'A pressure-independent control valve: a modulating valve '
           + 'with an internal ΔP-compensating cartridge, so a '
           + 'commanded position maps to a fraction of design '
           + '<em>flow</em> rather than a fraction of orifice — and '
           + 'holds that flow as system pressure swings, down to the '
           + 'cartridge\'s minimum ΔP. The balancing and the control '
           + 'live in one valve body.',
        owners: ['/education/balancing.html'],
    },
};
