// Question bank for the Unit Identification quiz, exposed to Nunjucks
// as `quizzes['air-unit-identification']`. Lives in _data/ so two
// consumers read one source: the page's inline JS (mounts the engine
// in the browser) and the FAQPage JSON-LD emitter in head.njk.
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_air-unit-identification_* localStorage keys. Pairs with the
// Unit Identification lesson; learnMore hrefs deep-link its <h2>
// anchors. Sequential order is the lesson walk: three questions →
// the lineup → the paper trail → when the paper lies.
//
// Quiz prose is painted post-load (the units walker doesn't reach it),
// so unit values carry static metric parentheticals per the
// metric-rounding policy — results close on the displayed operands.

module.exports = [
    // ── Three questions before the nameplate ───────────────
    {
        type: 'mcq',
        id: 'aid-three-questions',
        prompt: 'You\'re standing in front of an air-side unit you\'ve never seen, and the nameplate is behind a locked panel. Which three questions does the lesson say you can answer from ten feet away?',
        choices: [
            { id: 'a', text: 'Where does it sit, what\'s in the cabinet, and where does its air come from and go.', correct: true },
            { id: 'b', text: 'What brand it is, how old it is, and who installed it.' },
            { id: 'c', text: 'What its design CFM, external static, and coil capacities are.' },
            { id: 'd', text: 'Whether it\'s heating or cooling right now, and at what setpoint.' }
        ],
        explain: 'Siting, cabinet contents, and connections are readable with your hands in your pockets — and between them they corner nearly everything on a commercial roof or in a mechanical room. Design numbers live on the schedule, brand and age on the nameplate; both are paper, and paper is step two — sometimes a lying step two.',
        learnMore: { href: '/education/air-unit-identification.html#three-questions', label: 'Unit Identification — Three Questions' },
        tags: ['forced-air', 'identification']
    },

    // ── The lineup ─────────────────────────────────────────
    {
        type: 'mcq',
        id: 'aid-pipes-vs-compressors',
        prompt: 'One cabinet observation separates a built-up air handler from packaged DX equipment faster than anything else. What is it?',
        choices: [
            { id: 'a', text: 'Insulated pipe pairs entering the casing vs compressors and condenser fans onboard.', correct: true },
            { id: 'b', text: 'The size of the supply fan.' },
            { id: 'c', text: 'Whether the cabinet is indoors or outdoors.' },
            { id: 'd', text: 'Single-wall vs double-wall cabinet construction.' }
        ],
        explain: 'An air handler is a borrower: bare coils fed by pipe pairs from a plant that lives elsewhere. Packaged equipment brought its own plant along — compressors, a condenser section, often a burner. Location is only a habit (built-up units turn up on roofs too), and the pipes outrank the address.',
        learnMore: { href: '/education/air-unit-identification.html#the-lineup', label: 'Unit Identification — The Lineup' },
        tags: ['forced-air', 'identification', 'rtu']
    },
    {
        type: 'mcq',
        id: 'aid-no-return-duct',
        prompt: 'A rooftop unit has an intake hood, a burner section, and a supply duct into the building — but you walk around it twice and there is no return duct at all. What is it?',
        choices: [
            { id: 'a', text: 'A makeup-air unit (or DOAS) — a 100% outside-air machine.', correct: true },
            { id: 'b', text: 'A packaged RTU whose return connection is hidden inside the curb.' },
            { id: 'c', text: 'A built-up AHU that happens to be outdoors.' },
            { id: 'd', text: 'An oversized exhaust fan.' }
        ],
        explain: 'No return duct means nothing recirculates: the unit conditions outside air only, replacing what hoods and exhaust fans throw away. An RTU\'s return does drop through the curb — but you\'d still find a mixing section behind the hood, and the MAU has none. The missing duct is the whole identification.',
        learnMore: { href: '/education/air-unit-identification.html#the-lineup', label: 'Unit Identification — The Lineup' },
        tags: ['forced-air', 'identification', 'makeup-air']
    },
    {
        type: 'mcq',
        id: 'aid-lineset',
        prompt: 'Two copper lines — one fat and insulated, one skinny and bare — run from a fan unit above a ceiling, out through the wall, to a boxy fan-equipped unit on a pad outside. What are you looking at?',
        choices: [
            { id: 'a', text: 'A split system — that\'s the refrigerant lineset between the indoor and outdoor halves.', correct: true },
            { id: 'b', text: 'A fan coil — those are its chilled-water supply and return.' },
            { id: 'c', text: 'Condensate and makeup-water piping.' },
            { id: 'd', text: 'A ducted connection to a rooftop unit.' }
        ],
        explain: 'A chilled-water pair would both be insulated and would head for a plant, not a fan-equipped box on a pad. Fat-insulated plus skinny-bare is the refrigerant signature — suction line insulated, liquid line bare. Follow the lineset and you\'ve identified both ends at once.',
        learnMore: { href: '/education/air-unit-identification.html#the-lineup', label: 'Unit Identification — The Lineup' },
        tags: ['forced-air', 'identification', 'split-system']
    },
    {
        type: 'tf',
        id: 'aid-vav-tell',
        prompt: 'A VFD on the supply fan is enough, by itself, to call a unit VAV.',
        answer: false,
        explain: 'False. The VAV signature is a conjunction: a drive on the fan, AND terminal boxes with actuators out along the supply duct, AND a duct-static setpoint the fan serves. Modern constant-volume units carry drives too — for balancing and soft starts — so follow the supply duct: boxes say VAV; diffusers straight off the trunk usually say constant volume, though newer single-zone units often vary fan speed to the zone\'s own load with no boxes at all (single-zone VAV).',
        learnMore: { href: '/education/air-unit-identification.html#the-lineup', label: 'Unit Identification — The Lineup' },
        tags: ['forced-air', 'identification', 'vav']
    },
    {
        type: 'tf',
        id: 'aid-heat-pump-tell',
        prompt: 'You can reliably tell a heat-pump RTU from a straight-cooling RTU by walking around the cabinet.',
        answer: false,
        explain: 'False. Same curb, same hood, same cabinet — the reversing valve that makes it a heat pump lives inside the refrigerant circuit. The tell is paper: a model code one letter off its cooling-only sibling, a nameplate whose heating section names the compressor instead of a burner. Some questions only the nameplate can answer.',
        learnMore: { href: '/education/air-unit-identification.html#the-lineup', label: 'Unit Identification — The Lineup' },
        tags: ['forced-air', 'identification', 'heat-pump']
    },

    // ── The paper trail ────────────────────────────────────
    {
        type: 'numeric',
        id: 'aid-tonnage',
        prompt: 'A packaged unit\'s model string carries the digits 060, following the common thousands-of-BTU/h convention (60,000 BTU/h ≈ 17.6 kW). What nominal cooling capacity is that in tons? Enter the answer in tons.',
        answer: 5,
        tolerance: 0.1,
        unit: 'tons',
        explain: '60,000 BTU/h ÷ 12,000 BTU/h per ton = 5 tons (about 17.6 kW). It\'s a convention, not a law — placements differ by manufacturer and some strings encode airflow instead — so treat the digits as a hypothesis and the mechanical schedule as the arbiter.',
        learnMore: { href: '/education/air-unit-identification.html#paper-trail', label: 'Unit Identification — The Paper Trail' },
        tags: ['forced-air', 'identification', 'nameplate']
    },
    {
        type: 'mcq',
        id: 'aid-which-schedule',
        prompt: 'Over the phone: "RTU-3\'s design airflow? Check the schedule." Where do you actually look?',
        choices: [
            { id: 'a', text: 'The equipment schedule — a table on the mechanical (M-series) drawings, one row per unit.', correct: true },
            { id: 'b', text: 'The BACnet Schedule object in the unit\'s controller.' },
            { id: 'c', text: 'The time-of-day occupancy schedule in the BMS.' },
            { id: 'd', text: 'The filter-change schedule in the maintenance log.' }
        ],
        explain: 'Three unrelated things share the word. Design data — airflow, static, coil capacities, electrical, location, serves — lives in the mechanical schedule on the drawings. The BACnet Schedule object and the occupancy calendar are runtime artifacts; neither knows what the unit was designed to do.',
        learnMore: { href: '/education/air-unit-identification.html#paper-trail', label: 'Unit Identification — The Paper Trail' },
        tags: ['forced-air', 'identification', 'drawings']
    },

    // ── When the paper lies ────────────────────────────────
    {
        type: 'gotcha',
        id: 'aid-paper-lies-gotcha',
        prompt: 'A service call in an unfamiliar building. The BMS and the drawings say one thing; the ceiling bay says another. What\'s the story?',
        snippet: '<pre class="quiz-snippet">BMS GRAPHIC      AHU-2\nM-SCHEDULE       AHU-2 · PENTHOUSE · 30,000 CFM (51,000 m³/h)\nIN FRONT OF YOU  2 ft (0.6 m) box · fan + piped coil\n                 condensate pan · grille in the tile below</pre>',
        choices: [
            { id: 'a', text: 'The graphic and schedule are right — this is AHU-2\'s terminal section.' },
            { id: 'b', text: 'The box is a fan coil; the graphic filed it under the wrong family and the paper never caught up.', correct: true },
            { id: 'c', text: 'The penthouse unit was relocated into the ceiling during a renovation.' },
            { id: 'd', text: 'The schedule row is a typo — a 30,000 CFM unit fits in a ceiling bay.' }
        ],
        explain: 'A two-foot (0.6 m) box with a fan and a piped coil is a fan coil, whatever the graphic says. Thirty thousand CFM (51,000 m³/h) is a built-up unit the size of a small room — it cannot hide in a ceiling bay. When the name, the prints, and the box disagree, believe the box; then start auditing the paper.',
        learnMore: { href: '/education/air-unit-identification.html#paper-lies', label: 'Unit Identification — When the Paper Lies' },
        tags: ['forced-air', 'identification', 'documentation']
    },
    {
        type: 'mcq',
        id: 'aid-announce-itself',
        prompt: 'Documentation has failed you completely, and you need to match BMS points to real cabinets in July without disturbing the building. The lesson\'s method?',
        choices: [
            { id: 'a', text: 'Command the heating valve — the off-season output — and watch the controller\'s output LED (or meter the terminals) at the cabinet.', correct: true },
            { id: 'b', text: 'Command the supply fan off and listen for which unit spins down.' },
            { id: 'c', text: 'Pull disconnects one at a time until a complaint call locates the unit.' },
            { id: 'd', text: 'Command the OA dampers full open and watch which space drifts warm.' }
        ],
        explain: 'Command the season that\'s asleep — after checking it really is: with the boiler verified off and the loop cold, a heating-valve command moves a signal, not the building (plenty of plants run hot water all summer for reheat, so confirm before you trust it). Killing fans and pulling disconnects announce themselves to the occupants, not just to you. Keep it brief, command a specific output rather than a demand, skip life-safety and freeze-risk paths, and release every override — then watch it actually return to auto.',
        learnMore: { href: '/education/air-unit-identification.html#paper-lies', label: 'Unit Identification — When the Paper Lies' },
        tags: ['forced-air', 'identification', 'overrides']
    },
];
