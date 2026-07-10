// Question bank for the Air Handlers quiz, exposed to Nunjucks as
// `quizzes['air-handlers']`. Lives in _data/ so two consumers read one
// source: the page's inline JS (mounts the engine in the browser) and
// the FAQPage JSON-LD emitter in head.njk (indexable Q&A for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_air-handlers_* localStorage keys. Pairs with the Air Handlers
// lesson; learnMore hrefs deep-link its <h2> anchors. Sequential order
// is the lesson walk: air path → mixing box → filter/coils → fan.
//
// Quiz prose is painted post-load (the units walker doesn't reach it),
// so temperatures carry static metric parentheticals per the
// metric-rounding policy — results close on the displayed operands.

module.exports = [
    // ── The air path ───────────────────────────────────────
    {
        type: 'mcq',
        id: 'ah-air-path-order',
        prompt: 'Walking the air path through a typical draw-through air handler, which order does the air actually see?',
        choices: [
            { id: 'a', text: 'Mixing box → filter → coils → supply fan.', correct: true },
            { id: 'b', text: 'Filter → mixing box → coils → supply fan.' },
            { id: 'c', text: 'Mixing box → coils → filter → supply fan.' },
            { id: 'd', text: 'Supply fan → mixing box → filter → coils.' }
        ],
        explain: 'Return and outside air are traded and blended first (mixing box), the blend is cleaned (filter) before it can foul anything expensive, the coils change its state, and the draw-through supply fan sits last — pulling air across everything upstream and pushing it into the duct.',
        learnMore: { href: '/education/air-handlers.html#air-path', label: 'Air Handlers — The Air Path' },
        tags: ['forced-air', 'air-path']
    },

    // ── The mixing box ─────────────────────────────────────
    {
        type: 'mcq',
        id: 'ah-min-oa-why',
        prompt: 'An air handler brings in outside air at its minimum damper position even on a freezing January morning, when that air costs real heating energy. Why?',
        choices: [
            { id: 'a', text: 'To keep the mixed-air temperature from rising too high.' },
            { id: 'b', text: 'Ventilation — the code-required fresh-air dose for the people in the building.', correct: true },
            { id: 'c', text: 'Free cooling — outdoor air is cheaper than running the coil.' },
            { id: 'd', text: 'To keep positive pressure on the outside-air damper blades.' }
        ],
        explain: 'Minimum outside air is for occupants, not temperature: codes set a required ventilation rate, and the minimum damper position delivers it regardless of season. Free cooling — opening the dampers past minimum because the outdoor air happens to be useful — is the economizer\'s decision, a separate sequence.',
        learnMore: { href: '/education/air-handlers.html#mixing-box', label: 'Air Handlers — The Mixing Box' },
        tags: ['forced-air', 'ventilation']
    },
    {
        type: 'mcq',
        id: 'ah-relief-air-why',
        prompt: 'If an air handler pulls in outside air but the building has no working relief or exhaust path, what happens?',
        choices: [
            { id: 'a', text: 'Nothing — the return duct absorbs the difference.' },
            { id: 'b', text: 'The building pressurizes — doors stand open and push back against their closers, because more air is coming in than leaving.', correct: true },
            { id: 'c', text: 'The supply fan speeds up to compensate.' },
            { id: 'd', text: 'The outside-air damper closes automatically.' }
        ],
        explain: 'Air is a mass balance: what comes in must go out, through relief dampers, exhaust fans, or — when those fail — door cracks and elevator shafts. A building with intake and no relief inflates until leakage balances it, and the doors tell you first. How buildings manage that ledger is the Building Pressure page of this chapter.',
        learnMore: { href: '/education/air-handlers.html#mixing-box', label: 'Air Handlers — The Mixing Box' },
        tags: ['forced-air', 'building-pressure']
    },
    {
        type: 'numeric',
        id: 'ah-ma-mix-calc',
        prompt: 'A 35 °F (1.7 °C) morning; return air comes back at 75 °F (23.9 °C); the dampers are held at a 20 % minimum outside-air position. What should the MA-T sensor read? Enter the answer in °F.',
        answer: 67,
        tolerance: 0.5,
        unit: '°F',
        explain: 'Mixed air is the mass-weighted average: 0.8 × 75 + 0.2 × 35 = 60 + 7 = 67 °F (in SI: 0.8 × 23.9 + 0.2 × 1.7 ≈ 19.5 °C). Worth internalizing, because the expected MA-T is your check on where the dampers really are — when the sensor disagrees with this arithmetic, believe the arithmetic and go look at the dampers.',
        learnMore: { href: '/education/air-handlers.html#mixing-box', label: 'Air Handlers — The Mixing Box' },
        tags: ['forced-air', 'mixed-air']
    },
    {
        type: 'gotcha',
        id: 'ah-ma-reads-like-oa',
        prompt: 'A winter service call. The BMS shows the readings below. What\'s the story?',
        snippet: '<pre class="quiz-snippet">RA-T          72.1 °F  (22.3 °C)\nOA-T          20.4 °F  (−6.4 °C)\nMA-T          24.9 °F  (−3.9 °C)\nOA DAMPER CMD   20 %</pre>',
        choices: [
            { id: 'a', text: 'MA-T sensor has failed low — replace it.' },
            { id: 'b', text: 'Normal winter operation for a 20 % minimum.' },
            { id: 'c', text: 'The OA damper is physically wide open despite the 20 % command — the mix is almost all outdoor air.', correct: true },
            { id: 'd', text: 'OA-T is miswired and reading the mixed-air plenum.' }
        ],
        explain: 'At a true 20 % outside air the mix should read about 0.8 × 72.1 + 0.2 × 20.4 ≈ 61.8 °F (16.6 °C). An MA-T of 24.9 °F sits nearly on top of OA-T — the blend is almost pure outdoor air, which means the damper isn\'t where the command says it is. Linkage, actuator, or a stripped coupling: go look. The command is a wish; MA-T is the witness.',
        learnMore: { href: '/education/air-handlers.html#mixing-box', label: 'Air Handlers — The Mixing Box' },
        tags: ['forced-air', 'mixed-air', 'dampers']
    },

    // ── Filter, then coils ─────────────────────────────────
    {
        type: 'mcq',
        id: 'ah-filter-first-why',
        prompt: 'Why does the filter sit upstream of the coils instead of after them?',
        choices: [
            { id: 'a', text: 'So the fan can pull harder across the coils.' },
            { id: 'b', text: 'To protect the coils — dust packed into tight fin spacing wrecks heat transfer and pressure drop.', correct: true },
            { id: 'c', text: 'Because filters only work on unconditioned air.' },
            { id: 'd', text: 'To keep condensate off the filter media.' }
        ],
        explain: 'A coil is a dense stack of thin fins — exactly the geometry that loads up with dust and is miserable to clean. The filter takes the dirt hit first so the expensive heat-transfer surfaces stay clear. Everything about filter placement follows from "cheap sacrificial surface before expensive permanent one."',
        learnMore: { href: '/education/air-handlers.html#filter-coils', label: 'Air Handlers — Filter, Then Coils' },
        tags: ['forced-air', 'filters']
    },
    {
        type: 'mcq',
        id: 'ah-dirty-filter-signal',
        prompt: 'The ΔP reading across a filter bank has been creeping upward for weeks. What is it telling you?',
        choices: [
            { id: 'a', text: 'Airflow through the unit is increasing.' },
            { id: 'b', text: 'The filter is loading up with dirt — its flow resistance is rising.', correct: true },
            { id: 'c', text: 'The supply fan is slowing down.' },
            { id: 'd', text: 'The sensor is drifting and needs recalibration.' }
        ],
        explain: 'As media loads, its resistance rises, and the pressure drop across it climbs at a given airflow. That\'s the whole design of the dirty-filter alarm: the ΔP sensor straddling the rack turns "how dirty is it?" into a number. Trust the trend more than the calendar — a filter in a dusty renovation month loads faster than the schedule assumes.',
        learnMore: { href: '/education/air-handlers.html#filter-coils', label: 'Air Handlers — Filter, Then Coils' },
        tags: ['forced-air', 'filters']
    },
    {
        type: 'tf',
        id: 'ah-cooling-coil-latent',
        prompt: 'A cooling coil can remove moisture from the air as well as heat — which is why there\'s a drain pan and condensate line underneath it.',
        answer: true,
        explain: 'True. When the fin surface runs colder than the air\'s dew point, water condenses out of the airstream onto the fins and has to go somewhere — the pan and drain line. The heating coil has no pan because heating never condenses moisture; it warms the air and leaves the water vapor alone.',
        learnMore: { href: '/education/air-handlers.html#filter-coils', label: 'Air Handlers — Filter, Then Coils' },
        tags: ['forced-air', 'coils', 'dew-point']
    },

    // ── The supply fan ─────────────────────────────────────
    {
        type: 'mcq',
        id: 'ah-fan-moves-not-cools',
        prompt: 'What does the supply fan itself contribute to the air passing through it?',
        choices: [
            { id: 'a', text: 'Movement, plus a slight temperature rise — the motor\'s work ends up in the airstream.', correct: true },
            { id: 'b', text: 'Movement and a slight cooling effect from the moving air.' },
            { id: 'c', text: 'Nothing — the fan is thermally neutral.' },
            { id: 'd', text: 'Dehumidification, from the pressure rise across the wheel.' }
        ],
        explain: 'The fan is the only mover in the box, and it isn\'t free: the work it does on the air becomes heat, so discharge air runs about 1 °F (0.6 °C) warmer than the air leaving the coil. That\'s why DA-T never quite matches the coil math — the difference is the fan announcing itself.',
        learnMore: { href: '/education/air-handlers.html#supply-fan', label: 'Air Handlers — The Supply Fan' },
        tags: ['forced-air', 'fans']
    },

    // ── Capstone: the RTU is the same drawing ──────────────
    {
        type: 'mcq',
        id: 'ah-rtu-same-drawing',
        prompt: 'How does a packaged rooftop unit (RTU) relate to the built-up air-handler drawing in the lesson?',
        choices: [
            { id: 'a', text: 'Same air path in a weatherproof box — with a DX coil and its own refrigerant cycle instead of plant-fed water coils.', correct: true },
            { id: 'b', text: 'An RTU has no mixing box — it runs 100 % outside air.' },
            { id: 'c', text: 'An RTU reverses the order: coils before the filter.' },
            { id: 'd', text: 'They\'re unrelated equipment families with different air paths.' }
        ],
        explain: 'An RTU is the same anatomy folded into a factory cabinet: mixing dampers behind the intake hood, filter rack, coils, supply fan, in the same order. The big difference is the coils — usually a gas heat exchanger and a DX evaporator with the compressor and condenser onboard, instead of hot- and chilled-water coils fed from a plant. Learn the path once and it transfers.',
        learnMore: { href: '/education/air-handlers.html#air-path', label: 'Air Handlers — The Air Path' },
        tags: ['forced-air', 'rtu']
    },
];
