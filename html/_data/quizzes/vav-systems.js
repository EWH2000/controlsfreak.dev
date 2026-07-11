// Question bank for the VAV Systems quiz, exposed to Nunjucks as
// `quizzes['vav-systems']`. Lives in _data/ so two consumers read one
// source: the page's inline JS (mounts the engine in the browser) and
// the FAQPage JSON-LD emitter in head.njk.
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_vav-systems_* localStorage keys. Pairs with the VAV Systems
// lesson; learnMore hrefs deep-link its <h2> anchors. Sequential order
// is the lesson walk: the shape → box anatomy → pressure independence
// → the floors → the coil floor → the cliff-hanger.
//
// Quiz prose is painted post-load (the units walker doesn't reach it),
// so unit values carry static metric parentheticals per the
// metric-rounding policy — except velocity pressure and CFM-per-ton,
// which stay in their IP field frames (the airflow tool's US-native
// posture: a metric K is a different number on a different label).

module.exports = [
    // ── One trunk, thirty claims ───────────────────────────
    {
        type: 'mcq',
        id: 'vav-what-varies',
        prompt: 'Thirty zones, one air handler, one supply temperature. What does each zone\'s VAV box actually vary to keep its zone comfortable?',
        choices: [
            { id: 'a', text: 'Airflow — how much constant-temperature supply air the zone receives.', correct: true },
            { id: 'b', text: 'Supply temperature — the box re-cools or re-warms the air for its zone.' },
            { id: 'c', text: 'Duct static pressure — the box throttles to hold pressure at its inlet.' },
            { id: 'd', text: 'Nothing continuously — it cycles airflow on and off with the thermostat.' }
        ],
        explain: 'A VAV box throttles volume, not temperature: the air handler holds its supply cold and steady — around 55 °F (12.8 °C) — and each box meters how much of it its zone takes. More load, more cold air. (Reheat boxes do warm the air, but only pinned at minimum flow — the exception that proves the rule.) Duct static belongs to the supply fan\'s loop, not to any box.',
        learnMore: { href: '/education/vav-systems.html#one-to-thirty', label: 'VAV Systems — One Trunk, Thirty Claims' },
        tags: ['forced-air', 'vav']
    },
    {
        type: 'tf',
        id: 'vav-colder-air',
        prompt: 'When a VAV zone gets too warm, its box responds by delivering colder air.',
        answer: false,
        explain: 'False. It delivers <em>more</em> of the same air — the trunk temperature barely moves all day. The volume knob is the box\'s only knob, which is the load-piping story with the fluid swapped: two-way valves throttle water, boxes throttle air, and in both systems something upstream has to answer for the throttling.',
        learnMore: { href: '/education/vav-systems.html#one-to-thirty', label: 'VAV Systems — One Trunk, Thirty Claims' },
        tags: ['forced-air', 'vav']
    },

    // ── Inside the box ─────────────────────────────────────
    {
        type: 'mcq',
        id: 'vav-flow-ring',
        prompt: 'The ring or cross of ported tubing across a VAV box\'s inlet — two small lines running back to the controller — measures what?',
        choices: [
            { id: 'a', text: 'Velocity pressure, which the controller turns into airflow via CFM = K × √VP.', correct: true },
            { id: 'b', text: 'Duct static pressure, for the supply fan\'s control loop.' },
            { id: 'c', text: 'Discharge air temperature after the reheat coil.' },
            { id: 'd', text: 'Filter loading across the box.' }
        ],
        explain: 'The pickup compares upstream-facing ports against downstream-facing ones; the difference is velocity pressure, which rises with the square of air speed — so flow follows the square root. That one sensor means the box measures its own airflow, which is what makes everything else on the page possible. Duct static is measured out in the trunk for the fan — different sensor, different loop, different page.',
        learnMore: { href: '/education/vav-systems.html#box-anatomy', label: 'VAV Systems — Inside the Box' },
        tags: ['forced-air', 'vav', 'airflow']
    },
    {
        type: 'numeric',
        id: 'vav-k-solve',
        prompt: 'A box\'s controller is configured with K = 1000, and its flow pickup reads a velocity pressure of 0.25 in. w.c. What airflow is the box reporting? Enter the answer in CFM.',
        answer: 500,
        tolerance: 5,
        unit: 'CFM',
        explain: 'CFM = K × √VP = 1000 × √0.25 = 1000 × 0.5 = 500 CFM (about 850 m³/h). K is the manufacturer\'s coefficient for the pickup — literally the CFM it reads at exactly 1.0 in. w.c. — and the whole frame is US-native: a metric K is a different number on a different label. The airflow tool runs this math both directions, including back-solving K from a balancer\'s hood reading, which is how commissioning calibrates a box.',
        learnMore: { href: '/education/vav-systems.html#box-anatomy', label: 'VAV Systems — Inside the Box' },
        tags: ['forced-air', 'vav', 'airflow']
    },

    // ── Pressure independence ──────────────────────────────
    {
        type: 'mcq',
        id: 'vav-neighbors',
        prompt: 'Mid-afternoon, half the building\'s boxes throttle back and the pressure at your box\'s inlet rises. Your zone\'s load hasn\'t changed. What does a pressure-independent box do?',
        choices: [
            { id: 'a', text: 'Holds its airflow — the flow loop pinches the damper further closed until measured CFM is back on setpoint.', correct: true },
            { id: 'b', text: 'Delivers more air, since more pressure pushes more air through the same opening.' },
            { id: 'c', text: 'Nothing — the damper holds the position it was commanded to.' },
            { id: 'd', text: 'Trips its high-pressure safety and shuts.' }
        ],
        explain: 'The zone loop asked for a CFM, not a degrees-open. When inlet pressure rises, the ring reads rising flow and the flow loop closes the damper until the reading sits back on setpoint — the disturbance dies at the box, before the zone feels it. Answers (b) and (c) describe a pressure-<em>dependent</em> box: position fixed, airflow at the mercy of the neighbors. That machine needs rebalancing every time the building changes its mind.',
        learnMore: { href: '/education/vav-systems.html#pressure-independence', label: 'VAV Systems — Why the Box Chases Flow' },
        tags: ['forced-air', 'vav']
    },
    {
        type: 'tf',
        id: 'vav-damper-cmd',
        prompt: 'In a pressure-independent VAV box, 50 % cooling demand means the controller drives the damper to 50 % open.',
        answer: false,
        explain: 'False. Demand maps to a <em>flow setpoint</em> — 50 % demand is a CFM target halfway between the box\'s minimum and maximum. The damper then lands wherever the flow loop needs it to make the ring read that number: 30 % open on a high-pressure morning, 60 % on a starved branch, nobody cares. Damper position is nobody\'s setpoint; it\'s the leftover after the flow loop wins.',
        learnMore: { href: '/education/vav-systems.html#pressure-independence', label: 'VAV Systems — Why the Box Chases Flow' },
        tags: ['forced-air', 'vav']
    },

    // ── The floors ─────────────────────────────────────────
    {
        type: 'mcq',
        id: 'vav-min-why',
        prompt: 'A zone has been satisfied all afternoon, yet its box never closes below 200 CFM (340 m³/h). What is the minimum there for?',
        choices: [
            { id: 'a', text: 'Ventilation — the zone\'s share of the code-required fresh air rides the supply air, cooling call or not.', correct: true },
            { id: 'b', text: 'To keep the damper from slamming shut and hammering the ductwork.' },
            { id: 'c', text: 'The flow ring can\'t read velocity pressure below that flow.' },
            { id: 'd', text: 'To keep the supply fan from overspeeding.' }
        ],
        explain: 'Fresh air arrives riding the supply air, so a box at zero starves the zone of ventilation even while the thermostat reads perfect — and the ventilation floor is not negotiable while the building is occupied. At the box scale, minimum CFM <em>is</em> that floor. It also creates the next problem: minimum air is still 55 °F (12.8 °C) air, arriving wanted or not — which is what reheat is for.',
        learnMore: { href: '/education/vav-systems.html#minimums', label: 'VAV Systems — The Floors' },
        tags: ['forced-air', 'vav', 'ventilation']
    },
    {
        type: 'mcq',
        id: 'vav-reheat-seq',
        prompt: 'An interior conference room sits at minimum flow and keeps drifting colder. What does a proper reheat sequence do?',
        choices: [
            { id: 'a', text: 'Hold airflow at minimum and open the reheat valve — warming the air on its way out, discharge capped near 90 °F (32.2 °C).', correct: true },
            { id: 'b', text: 'Close the box below its minimum until the zone recovers.' },
            { id: 'c', text: 'Raise the flow setpoint so the zone gets more supply air.' },
            { id: 'd', text: 'Ask the air handler to raise its supply temperature.' }
        ],
        explain: 'Flow stays on the ventilation floor; heat rides on top of it. The better sequences run it as a cascade — the zone loop asks for a discharge temperature and the DAT sensor closes that loop on the valve — with the cap keeping warm air mixing down into the room instead of pooling at the ceiling. Closing below minimum trades a comfort complaint for a ventilation violation; more 55-degree air makes a cold room colder; and the trunk serves twenty-nine other zones that didn\'t ask for warmer supply.',
        learnMore: { href: '/education/vav-systems.html#minimums', label: 'VAV Systems — The Floors' },
        tags: ['forced-air', 'vav', 'reheat']
    },

    // ── The coil floor ─────────────────────────────────────
    {
        type: 'gotcha',
        id: 'vav-starved-gotcha',
        prompt: 'A mild-day service call on a packaged VAV unit: warm complaints from the few zones still calling. The trend tells the story — what is it?',
        snippet: '<pre class="quiz-snippet">MILD AFTERNOON   TREND · PACKAGED VAV UNIT\nTOTAL SUPPLY     7,600 CFM (12,900 m³/h) · design 30,000 (51,000)\nDX STAGE 1       RUNNING · suction pressure falling all hour\nZONES            27 of 30 satisfied · boxes at minimum</pre>',
        choices: [
            { id: 'a', text: 'The boxes have throttled total airflow below the running stage\'s floor — the coil is starving and headed for ice.', correct: true },
            { id: 'b', text: 'The suction transducer is drifting — supply flow that low is impossible on a running unit.' },
            { id: 'c', text: 'The economizer is stuck open, flooding the coil with mild outside air.' },
            { id: 'd', text: 'Loaded filters — change them and the suction will recover.' }
        ],
        explain: 'Every box is doing its job — that\'s the trap. Thirty minimums sum to a quarter of design flow, one stage is still running on somebody\'s cooling call, and a compressor moves refrigerant whether or not there\'s warm air to boil it: suction dives, the coil surface drops below freezing, and ice ratchets the airflow lower still. A DX-VAV design needs somewhere for that mismatch to go — generous minimums, staging interlocked to proven airflow, a bypass, or a dump zone. Flow collapsing on a trend while a stage keeps running is the fingerprint.',
        learnMore: { href: '/education/vav-systems.html#the-coil-floor', label: 'VAV Systems — The Machine Has a Minimum Too' },
        tags: ['forced-air', 'vav', 'dx']
    },

    // ── The cliff-hanger ───────────────────────────────────
    {
        type: 'mcq',
        id: 'vav-every-box',
        prompt: 'Six o\'clock: the building empties and all thirty boxes glide toward their minimums within the same half hour. What does the supply duct feel?',
        choices: [
            { id: 'a', text: 'Static pressure climbs — the fan is still pushing into a duct that\'s closing like a fist.', correct: true },
            { id: 'b', text: 'Static pressure falls, since less air is moving.' },
            { id: 'c', text: 'Nothing — the boxes\' flow loops hold the duct pressure constant.' },
            { id: 'd', text: 'The return duct pressurizes instead.' }
        ],
        explain: 'Thirty throttles closing against a fan still pushing means trunk pressure rises — the loads throttled, and now the mover has to respond. How the fan finds out, and how gracefully it backs off, is duct static control — the next page of this chapter. The boxes are no help: each one holds its own zone\'s <em>flow</em>, and nobody at the box level is minding the trunk.',
        learnMore: { href: '/education/vav-systems.html#loads-throttle', label: 'VAV Systems — Loads Throttle; the Mover Responds' },
        tags: ['forced-air', 'vav']
    },
];
