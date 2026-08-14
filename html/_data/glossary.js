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
};
