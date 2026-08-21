// ──────────────────────────────────────────────────────────────────────
// glossaryExcluded.js — the §4 reserved-headword map.
//
// One row per bare headword the 2026-08-20 §4 collision-tier ruling
// RESERVED: the word may never gain a glossary entry, under its own id
// or under any entry whose kebab-normalized `term` equals it, on any
// surface — page marks today, the §7.2 quiz-bank surface when its
// component lands. The governing record is
// docs/glossary-s4-collision-proposal.md (RATIFIED block + per-family
// sections; draft PR #587, ratification PR #590); the §4 banner in
// glossary.js carries the summary. Kept separate from glossary.js
// because glossaryGuard iterates Object.keys(glossary) and lints every
// key as an entry.
//
// Enforcement: the glossaryExcludedGuard collection in .eleventy.js —
// three legs, ruled build-enforced (proposal Q4). A future lane that
// wants one of these words as an entry must edit its row here, which
// cites the ruling it would be overturning — never work around the
// guard.
//
// Scope of a row (proposal §5, stated once): a row binds ENTRY
// DEFINITION on every surface, and each reason names its hazard (which
// travels) ahead of its arithmetic (which may not) — several reasons
// below lean on page-transform mechanics (owners-emptying, MIXED-RUN)
// whose force does not transfer to a surface with no owners[]
// mechanism. The whole map is therefore re-examined when the §7.2
// quiz-bank lane opens; per-row `reopen` strings record the standing
// triggers, and their only watcher is a human — the friction file
// carries the reminder where page-adding lanes look.
//
// Shape:
//     'kebab-headword': {
//         reason: 'hazard first, then the arithmetic',  // required
//         ruled:  'YYYY-MM-DD',                          // required
//         reopen: 'the recorded re-open trigger',        // optional
//     }
// ──────────────────────────────────────────────────────────────────────

module.exports = {
    // ── The five whole-family exclusions ────────────────────────────
    'coil': {
        reason: 'Three senses — heat-exchange (~92 % of the pool, the '
              + 'trade\'s default reading, which needs no tooltip), '
              + 'Modbus coil, electromagnet winding — and '
              + 'start-stop-commands:313 puts heat-exchange and winding '
              + 'eleven words apart in one sentence: the standing '
              + 'exhibit for why no walker may ever touch the word. '
              + 'Compounds pre-paid (dx, freezestat, interposing-relay, '
              + 'inrush); the winding leg ships as contactor-coil (the '
              + 'one owner amendment); the Modbus leg self-defines '
              + 'where it appears and \'Modbus coil\' occurs zero times '
              + 'site-wide.',
        ruled: '2026-08-20',
    },
    'reset': {
        reason: 'The site\'s worst homograph — eight sense-classes, and '
              + '\'a reset input\' means opposite things two lessons '
              + 'apart (controls-commissioning:128, the OAT input to a '
              + 'schedule, vs timers-and-delays:255, the latch\'s R '
              + 'pin). duct-sizer:117\'s ordinary-English \'resetting '
              + 'expectations\' sits immediately before an anchor to '
              + 'the static-reset lesson, so the false positive is not '
              + 'hypothetical. manual-reset was priced (~2 marks) and '
              + 'declined — both surviving sentences already explain '
              + 'the idiom in their own clause.',
        ruled: '2026-08-20',
    },
    'lockout': {
        reason: 'HAZARD FIRST: never mark any occurrence adjacent to '
              + '\'tagout\' — start-stop-commands:220\'s whole content '
              + 'is a safety negation (\'an HOA in Off is not '
              + 'lockout/tagout\'). Verb forms (\'locks out\', \'locked '
              + 'out\') are the same family. Marks-side: both in-scope '
              + 'markable sites already share their sentence with a '
              + 'correct shipped panel (economizer/oat at '
              + 'temperature-sensors:73, interlock at vav-systems:508), '
              + 'so an entry would ship for readers who can already '
              + 'resolve the word.',
        ruled: '2026-08-20',
    },
    'authority': {
        reason: 'Five readings share the bare token, and two are '
              + 'traps: the regulatory sense sits inside a '
              + 'damage-stakes scope note (minimum-outdoor-air:266, '
              + '\'the authority having jurisdiction\') and the command '
              + 'sense sits inside the site\'s OSHA fence '
              + '(start-stop-commands:220). Under the collocation rule '
              + 'Q2 requires, a valve-authority entry yields zero '
              + 'marks — every off-owner bigram is a page name, URL, '
              + 'navCard or keywords occurrence — and '
              + 'installed-characteristic\'s shipped def already '
              + 'carries the β ground.',
        ruled: '2026-08-20',
        reopen: 'The honest-B valve-authority entry (0–1 marks) was '
              + 'priced and declined for the consumer future alone — '
              + 're-pitch it at the §7.2 quiz-bank lane, not before.',
    },
    'direct-acting': {
        reason: 'Two senses, each taught on exactly one page — actuator '
              + 'stroke-vs-signal (commanding-actuators:184-190) vs '
              + 'loop output-vs-measurement (comparators-and-deadband\'s '
              + 'action paragraph) — and the site already discloses '
              + 'the fork in prose at the teach moment '
              + '(commanding-actuators:186: \'One disambiguation, '
              + 'because the words collide\'). After owners[] the '
              + 'markable count in scope is zero.',
        ruled: '2026-08-20',
        reopen: 'Two-armed (ratified 3.14): (1) a third PAGE uses '
              + 'either compound without defining it, or (2) the §7.2 '
              + 'quiz-bank component lane opens (the site\'s own drill '
              + 'lives on that surface — '
              + 'quizzes/commanding-actuators.js:79) — at which point '
              + 'the family returns as a disambiguation entry whose '
              + 'panel leads with the fork.',
    },
    'reverse-acting': {
        reason: 'Same family as direct-acting — one row per headword '
              + 'so the term-equality leg catches either pole; the '
              + 'evidence and the ruling are the direct-acting row\'s.',
        ruled: '2026-08-20',
        reopen: 'The direct-acting row\'s two-armed trigger covers both '
              + 'poles.',
    },

    // ── The B families' reserved bare headwords ─────────────────────
    'rtu': {
        reason: 'Two senses with no shared abstraction — packaged '
              + 'rooftop unit vs Modbus serial framing — colliding '
              + 'bare across sibling landings (education/index:259 vs '
              + 'tools/index:88). The protocol sense ships '
              + 'collocation-keyed as modbus-rtu; the rooftop leg is '
              + 'markless by structure (every prose occurrence sits on '
              + 'its two teach pages or inside navCard args, '
              + 'unmarkable twice over).',
        ruled: '2026-08-20',
    },
    'static': {
        reason: 'The pressure fork is the reader hazard — duct static '
              + 'and building static sit an order of magnitude apart '
              + 'and the conflation is the classic field mistake '
              + '(building-pressure:515\'s callout exists to kill it); '
              + 'duct-static ships compound-keyed and carries the fork '
              + 'in its closing clause. The rest of the pool is noise: '
              + '46 % is the data-flow-static build attribute, and the '
              + 'not-animated homograph lives entirely in comments.',
        ruled: '2026-08-20',
        reopen: 'A building-static entry stays declined while all its '
              + 'occurrences sit on its teacher (building-pressure) — '
              + 're-open if the compound spreads to pages that do not '
              + 'teach it.',
    },
    'head': {
        reason: 'Hydronic pump head, refrigerant head pressure, sensor '
              + 'heads, \'head end\' and ordinary English all share the '
              + 'token — and 46 % of the raw pool can never be the '
              + 'term of trade (template blocks, CSS, JS identifiers). '
              + 'The refrigerant compound ships as head-pressure; the '
              + 'hydronic half took C (pump-head declined at one '
              + 'honest mark under the stated collocation rule); '
              + '\'head end\' already marks via front-end.',
        ruled: '2026-08-20',
    },
    'proof': {
        reason: 'Two registers, not two technical senses — the device '
              + 'noun vs ordinary evidentiary English, and the '
              + 'ordinary register dominates (controls-commissioning '
              + 'runs 18-to-2 ordinary-vs-device on a page already '
              + 'carrying 18 gloss buttons). The device compound ships '
              + 'collocation-keyed as proof-window; bare proof / '
              + 'proven never mark.',
        ruled: '2026-08-20',
    },
    'floating': {
        reason: 'Five senses at the highest density-per-occurrence in '
              + 'the tier — tri-state actuation, IEEE-754 floating '
              + 'point, electrically floating conductors, physical '
              + 'buoyancy, layout homographs — with '
              + 'controller-wiring:243 running two of them about the '
              + 'same device in one sentence. The actuator sense ships '
              + 'collocation-keyed as floating-actuator; '
              + 'balancing:497\'s \'floating-point input\' is a routed '
              + 'owner question, unresolved.',
        ruled: '2026-08-20',
    },
    'differential': {
        reason: 'The ΔP quantity, the switch\'s built-in hysteresis, '
              + 'the changeover arm and the zone setpoint-separation '
              + 'all share the bare token — status-and-proof stops '
              + 'mid-sentence at :200 to disambiguate itself, and '
              + 'comparators-and-deadband\'s #which-sense paragraph is '
              + 'the canonical disambiguation the panels defer to. The '
              + 'ΔP compound ships as differential-pressure; the other '
              + 'arms are pre-paid (enthalpy-changeover, rat) or '
              + 'self-defining in situ.',
        ruled: '2026-08-20',
    },
    'low-limit': {
        reason: 'A modifier pattern, not a term — \'<adjective> limit\' '
              + 'attaches to six-plus referents taught on different '
              + 'pages, plus the BACnet Low_Limit property (rendered '
              + 'from bacnetEnums.js). The freezestat sense is pre-paid '
              + 'by freezestat\'s own def (\'Also called a freeze stat '
              + 'or low-limit stat\'); the economizer floor ships '
              + 'compound-keyed as mixed-air-low-limit.',
        ruled: '2026-08-20',
    },
    'high-limit': {
        reason: 'The same modifier pattern as low-limit — a comfort '
              + 'gate and a freeze floor share the token on one page '
              + '(economizer-ratio:222 vs :235). \'economizer high '
              + 'limit\' is pre-paid (economizer + enthalpy-changeover '
              + 'own both its pages); \'high-limit lockout\' must never '
              + 'get an entry — two reserved families in one phrase '
              + '(resolution recorded at the economizer entry\'s '
              + 'comment in glossary.js); the duct device ships '
              + 'compound-keyed as high-static-cutout.',
        ruled: '2026-08-20',
    },
};
