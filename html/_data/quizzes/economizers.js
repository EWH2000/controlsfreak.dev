// Question bank for the Economizers quiz, exposed to Nunjucks as
// `quizzes['economizers']`. Lives in _data/ so two consumers read one
// source: the page's inline JS (mounts the engine in the browser) and
// the FAQPage JSON-LD emitter in head.njk (indexable Q&A for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_economizers_* localStorage keys. Pairs with the Economizers
// lesson; learnMore hrefs deep-link its <h2> anchors. Sequential order
// is the lesson walk: damper assembly → changeover → staging → failures.
//
// Quiz prose is painted post-load (the units walker doesn't reach it),
// so temperatures carry static metric parentheticals per the
// metric-rounding policy — results close on the displayed operands.

module.exports = [
    // ── The damper assembly ────────────────────────────────
    {
        type: 'mcq',
        id: 'eco-what-it-is',
        prompt: 'What is an air handler actually doing when it "economizes"?',
        choices: [
            { id: 'a', text: 'Opening the outside-air dampers past minimum so cool outdoor air carries the cooling load, with mechanical cooling held back.', correct: true },
            { id: 'b', text: 'Running the supply fan slower to save motor energy.' },
            { id: 'c', text: 'Closing the outside-air damper to stop conditioning unnecessary outdoor air.' },
            { id: 'd', text: 'Bypassing the filter section to reduce pressure drop.' }
        ],
        explain: 'Economizing is free cooling: when outdoor air is a better deal than return air, the damper assembly modulates past its ventilation minimum and lets outside air do the coil\'s job, saving the compressor or chilled-water plant for weather that needs them. Everything else on this page — the changeover gate, the staging, the failure modes — hangs off that one move.',
        learnMore: { href: '/education/economizers.html#damper-assembly', label: 'Economizers — One Signal, Three Dampers' },
        tags: ['forced-air', 'economizer']
    },
    {
        type: 'mcq',
        id: 'eco-linked-assembly',
        prompt: 'During economizer operation the outside-air, return-air, and relief dampers move together as one linked assembly. Why?',
        choices: [
            { id: 'a', text: 'To reduce the number of actuators the BMS has to power.' },
            { id: 'b', text: 'They answer one question — what fraction of supply air should be outdoor air — so as OA opens, RA closes to match and relief opens so the extra air can leave.', correct: true },
            { id: 'c', text: 'Because code requires all dampers in a unit to share one signal.' },
            { id: 'd', text: 'To keep the filter loading evenly across its face.' }
        ],
        explain: 'The three dampers are three faces of a single decision. More outdoor air in means less return air reused — and that displaced air has to exit the building, which is the relief damper\'s job. One signal drives the set so the recipe changes while total airflow through the unit stays roughly constant. What happens when the relief half of that bargain fails is the building-pressure story, next in the chapter.',
        learnMore: { href: '/education/economizers.html#damper-assembly', label: 'Economizers — One Signal, Three Dampers' },
        tags: ['forced-air', 'economizer', 'dampers']
    },
    {
        type: 'numeric',
        id: 'eco-modulation-math',
        prompt: 'A mild morning: 55 °F (12.8 °C) outside, return air at 75 °F (23.9 °C), and the economizer loop wants 60 °F (15.6 °C) mixed air. What outside-air percentage do the dampers need? Enter the answer in %.',
        answer: 75,
        tolerance: 1,
        unit: '%',
        explain: 'The modulation is the mixing equation run backwards: % OA = (MA − RA) ÷ (OA − RA) × 100 = (60 − 75) ÷ (55 − 75) × 100 = 75 % (in °C: (15.6 − 23.9) ÷ (12.8 − 23.9) × 100 ≈ 75 %). Three-quarters outdoor air, and the cooling coil never opens. The Economizer Ratio Helper runs this calculation, including the cases where the answer comes back impossible.',
        learnMore: { href: '/education/economizers.html#damper-assembly', label: 'Economizers — One Signal, Three Dampers' },
        tags: ['forced-air', 'economizer', 'mixed-air']
    },
    {
        type: 'mcq',
        id: 'eco-controlled-variable',
        prompt: 'While an economizer is free-cooling, what is its damper loop actually controlling?',
        choices: [
            { id: 'a', text: 'The building static pressure.' },
            { id: 'b', text: 'The outside-air temperature.' },
            { id: 'c', text: 'The mixed-air temperature — the dampers find whatever blend lands on setpoint.', correct: true },
            { id: 'd', text: 'The return-air humidity.' }
        ],
        explain: 'Free cooling is a plain temperature loop: modulate the blend until mixed air hits setpoint — typically the same 55 °F-ish (12.8 °C) number the cooling coil would otherwise be asked to make. OA-T is an input to the decision, not the controlled variable; the loop watches MA-T. That\'s also why MA-T is the sensor that exposes economizer failures: it\'s the one the loop lives and dies by.',
        learnMore: { href: '/education/economizers.html#damper-assembly', label: 'Economizers — One Signal, Three Dampers' },
        tags: ['forced-air', 'economizer', 'mixed-air']
    },

    // ── The changeover decision ────────────────────────────
    {
        type: 'gotcha',
        id: 'eco-deceptive-air',
        prompt: 'A humid summer morning after overnight rain. The space is warm and sticky, and the occupants are complaining. The BMS shows the readings below. What\'s the story?',
        snippet: '<pre class="quiz-snippet">OA-T           68.2 °F  (20.1 °C)\nRA-T           74.9 °F  (23.8 °C)\nMA-T           68.5 °F  (20.3 °C)\nOA DAMPER CMD   100 %  — economizing\nCLG COIL VALVE  100 %\nSA-T           58.9 °F  (14.9 °C)\nSPACE          75.8 °F  (24.3 °C) and rising</pre>',
        choices: [
            { id: 'a', text: 'The cooling coil valve has failed closed — that\'s why the space is rising.' },
            { id: 'b', text: 'Normal operation — the economizer just needs more time to pull the space down.' },
            { id: 'c', text: 'The dry-bulb changeover is admitting humid air that\'s cooler on the thermometer but carries more total heat than the return — the economizer is importing load.', correct: true },
            { id: 'd', text: 'The OA-T sensor is reading low and should be replaced.' }
        ],
        explain: 'Every reading is consistent — and this time the witnesses prove it, not just the commands: MA-T sitting on top of OA-T shows the damper really is open, and an SA-T of 58.9 °F (14.9 °C) — a valve at 100 % still missing a 55 °F (12.8 °C)-class leaving-air target — shows the coil genuinely working and genuinely losing. The problem is the decision itself. Near-saturated air at 68.2 °F (20.1 °C) carries more total heat than 74.9 °F (23.8 °C) return air at indoor humidity — a dry-bulb sensor can\'t see the moisture, so the unit hauls in latent load all morning and pays the coil to remove it. The fix is the changeover, not the coil: an enthalpy high limit, or a worst-case dry-bulb limit if the building has no humidity sensor.',
        learnMore: { href: '/education/economizers.html#changeover', label: 'Economizers — The Changeover Decision' },
        tags: ['forced-air', 'economizer', 'enthalpy']
    },
    {
        type: 'mcq',
        id: 'eco-what-enthalpy-compares',
        prompt: 'An enthalpy changeover approves free cooling when h_OA < h_RA. What is it actually comparing?',
        choices: [
            { id: 'a', text: 'The relative humidity of the two airstreams.' },
            { id: 'b', text: 'Total heat per pound of air — sensible temperature and the latent heat riding in the moisture, counted together.', correct: true },
            { id: 'c', text: 'The dew points of the two airstreams.' },
            { id: 'd', text: 'The temperature difference corrected for fan heat.' }
        ],
        explain: 'Enthalpy is the property that counts both loads at once: the sensible heat a thermometer sees plus the latent heat in the water vapor, which the cooling coil must also remove. Comparing h_OA against h_RA asks the only question that matters — will this air, taken as a whole, reduce the load or add to it? That\'s why enthalpy changeover wins in humid climates, at the price of humidity sensors that need to be kept honest.',
        learnMore: { href: '/education/economizers.html#changeover', label: 'Economizers — The Changeover Decision' },
        tags: ['forced-air', 'economizer', 'enthalpy']
    },
    {
        type: 'mcq',
        id: 'eco-no-humidity-sensor',
        prompt: 'A building has no outdoor humidity sensor — dry-bulb is all the changeover will ever have. What\'s the defensible way to set it in a humid climate?',
        choices: [
            { id: 'a', text: 'Set the limit equal to the return-air temperature — cooler than return is always a win.' },
            { id: 'b', text: 'Disable the economizer entirely — it can\'t be trusted without humidity data.' },
            { id: 'c', text: 'Set the limit at the worst case: the dry-bulb where even saturated outside air carries less total heat than the return.', correct: true },
            { id: 'd', text: 'Set it as high as possible to maximize free-cooling hours.' }
        ],
        explain: 'Do the psychrometrics once, on paper: find the dry-bulb temperature where even 100 %-RH outside air matches the return\'s total heat — 62.4 °F (16.9 °C) for a 75 °F (23.9 °C) / 50 % return — and set the changeover there. Below that line, no amount of humidity can make outside air a bad deal. You give up some warm-but-dry free-cooling hours, but the economizer can never be tricked into importing load it claims to be removing.',
        learnMore: { href: '/education/economizers.html#changeover', label: 'Economizers — The Changeover Decision' },
        tags: ['forced-air', 'economizer', 'enthalpy']
    },

    // ── First stage of cooling ─────────────────────────────
    {
        type: 'mcq',
        id: 'eco-integrated',
        prompt: 'On an "integrated" economizer, what happens when 100 % outside air still can\'t meet the cooling load?',
        choices: [
            { id: 'a', text: 'The dampers snap back to minimum and mechanical cooling takes over alone.' },
            { id: 'b', text: 'Mechanical cooling stages on while the dampers stay wide open — outdoor air keeps carrying its share and the compressor makes up the difference.', correct: true },
            { id: 'c', text: 'The supply fan speeds up until the load is met.' },
            { id: 'd', text: 'The unit trips on a high-limit lockout.' }
        ],
        explain: 'Integration is the difference between an economizer that helps all day and one that quits at the first compressor start. Non-integrated units force an either/or: the moment mechanical cooling starts, the dampers return to minimum — throwing away free cooling exactly when the building wants cooling most. Integrated sequencing keeps the outdoor air working and staged mechanical cooling only tops up the remainder.',
        learnMore: { href: '/education/economizers.html#first-stage', label: 'Economizers — First Stage of Cooling' },
        tags: ['forced-air', 'economizer', 'staging']
    },
    {
        type: 'tf',
        id: 'eco-high-limit-action',
        prompt: 'When the changeover high limit trips mid-morning — the day heats up, the air goes muggy — the economizer drives its outside-air dampers fully closed.',
        answer: false,
        explain: 'False — the dampers ride back to minimum position, not closed. The ventilation floor is not negotiable while the building is occupied: the code-required fresh-air dose still has to come in, even when that air costs cooling energy. The high limit ends free cooling; it doesn\'t end ventilation. Fully closed is a fault state (or an unoccupied mode), never a changeover response.',
        learnMore: { href: '/education/economizers.html#first-stage', label: 'Economizers — First Stage of Cooling' },
        tags: ['forced-air', 'economizer', 'ventilation']
    },

    // ── Field failures ─────────────────────────────────────
    {
        type: 'mcq',
        id: 'eco-stuck-damper-tell',
        prompt: 'You suspect an economizer\'s dampers are seized. It\'s a cool day. Which trend evidence proves the blades never actually moved when commanded to 100 %?',
        choices: [
            { id: 'a', text: 'The damper command reads 100 % on the graphics.' },
            { id: 'b', text: 'MA-T stays sitting on top of RA-T after the command — the mix is still almost all return air.', correct: true },
            { id: 'c', text: 'The actuator\'s feedback signal reads 100 %.' },
            { id: 'd', text: 'OA-T doesn\'t change after the command.' }
        ],
        explain: 'The command is a wish, and even actuator feedback only proves the motor turned — a stripped coupling or broken linkage leaves the blades behind. MA-T is the witness that can\'t be argued with: on a cool day, 100 % outside air must drag the mixed-air temperature toward OA-T. If MA-T keeps reading like return air, the blend never changed, so the blades never moved. Same arithmetic as the mixing box, doing forensic duty.',
        learnMore: { href: '/education/economizers.html#field-failures', label: 'Economizers — Where Economizers Fail in the Field' },
        tags: ['forced-air', 'economizer', 'dampers']
    },
];
