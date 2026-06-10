// Question bank for the Refrigerant Cycle Basics quiz, exposed to
// Nunjucks as `quizzes['refrigerant-cycle-basics']`. Lives in _data/ so
// two consumers read one source: the page's inline JS (mounts the
// engine in the browser) and the FAQPage JSON-LD emitter in head.njk
// (indexable Q&A for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_refrigerant-cycle-basics_* localStorage keys. Pairs with the
// Refrigerant Cycle Basics lesson; learnMore hrefs deep-link its <h2>
// anchors.

module.exports = [
    // ── The four components ────────────────────────────────
    {
        type: 'mcq',
        id: 'compressor-boundary',
        prompt: 'Cool low-pressure vapor arrives at one component and leaves it as hot high-pressure vapor — and that component is the dividing line between the low side and the high side. Which one is it?',
        choices: [
            { id: 'a', text: 'The condenser.' },
            { id: 'b', text: 'The compressor.', correct: true },
            { id: 'c', text: 'The evaporator.' },
            { id: 'd', text: 'The metering device.' }
        ],
        explain: 'The compressor is the pump of the loop. Suction-line vapor (low side) comes in; it squeezes that vapor and pushes it out the discharge line (high side) as hot, high-pressure vapor. Pressure rises across it, so it\'s one of the two boundaries between the pressure zones — the metering device is the other.',
        learnMore: { href: '/education/refrigerant-cycle-basics.html#components', label: 'Refrigerant Cycle Basics — The four components' },
        tags: ['refrigeration', 'cycle']
    },
    {
        type: 'mcq',
        id: 'where-it-boils',
        prompt: 'In cooling mode, where does the refrigerant boil — absorbing heat from the air being conditioned?',
        choices: [
            { id: 'a', text: 'The condenser.' },
            { id: 'b', text: 'The evaporator.', correct: true },
            { id: 'c', text: 'The compressor.' },
            { id: 'd', text: 'The liquid line.' }
        ],
        explain: 'The evaporator is the cold coil. Cold low-pressure refrigerant inside is colder than the return air blown across it, so heat moves from the air into the refrigerant and the refrigerant boils (liquid → vapor). That phase change is the actual cooling work. By the outlet it\'s cool low-pressure vapor — exactly what the compressor wants on its suction line.',
        learnMore: { href: '/education/refrigerant-cycle-basics.html#components', label: 'Refrigerant Cycle Basics — The four components' },
        tags: ['refrigeration', 'cycle']
    },
    {
        type: 'tf',
        id: 'condenser-high-side',
        prompt: 'The condenser sits on the high side: the refrigerant stays at the high (discharge) pressure all the way from the compressor outlet to the inlet of the metering device.',
        answer: true,
        explain: 'True. From the compressor discharge, through the condenser, down to the metering device inlet is all high side — one pressure zone at discharge pressure. The refrigerant changes state there (vapor → liquid as it sheds heat to outdoor air), but the pressure stays high until it reaches the metering device.',
        learnMore: { href: '/education/refrigerant-cycle-basics.html#high-low-side', label: 'Refrigerant Cycle Basics — High side vs. low side' },
        tags: ['refrigeration', 'cycle']
    },
    {
        type: 'mcq',
        id: 'metering-device-job',
        prompt: 'What does the metering device do to the refrigerant passing through it?',
        choices: [
            { id: 'a', text: 'Raises its pressure so the condenser can reject heat.' },
            { id: 'b', text: 'Drops its pressure sharply through a restriction — warm high-pressure liquid in, cold low-pressure mix out.', correct: true },
            { id: 'c', text: 'Boils it into vapor before the evaporator.' },
            { id: 'd', text: 'Pumps it around the loop.' }
        ],
        explain: 'The metering device is a deliberate restriction — a small orifice (TXV or EEV). High-pressure liquid squeezes through and drops to a cold, low-pressure mix of liquid and flash vapor heading into the evaporator. It\'s the second pressure boundary: the compressor jumps refrigerant low→high, the metering device drops it back high→low.',
        learnMore: { href: '/education/refrigerant-cycle-basics.html#components', label: 'Refrigerant Cycle Basics — The four components' },
        tags: ['refrigeration', 'cycle', 'metering']
    },
    {
        type: 'mcq',
        id: 'high-side-span',
        prompt: 'The high side of the loop spans from which point to which point?',
        choices: [
            { id: 'a', text: 'From the metering device outlet, across the evaporator, to the compressor suction.' },
            { id: 'b', text: 'From the compressor discharge, through the condenser, to the metering device inlet.', correct: true },
            { id: 'c', text: 'Only the condenser itself.' },
            { id: 'd', text: 'From the evaporator outlet to the condenser inlet.' }
        ],
        explain: 'The compressor and metering device split the loop into two pressure zones. The high side runs from the compressor discharge, around through the condenser, down to the metering device inlet — all at discharge pressure. The low side is the mirror: metering outlet, across the evaporator, back to the compressor suction, all at suction pressure.',
        learnMore: { href: '/education/refrigerant-cycle-basics.html#high-low-side', label: 'Refrigerant Cycle Basics — High side vs. low side' },
        tags: ['refrigeration', 'cycle']
    },

    // ── The pressure-temperature lock ──────────────────────
    {
        type: 'mcq',
        id: 'saturation-lock',
        prompt: 'When a refrigerant is at saturation — actively boiling or condensing — what is the relationship between its pressure and its temperature?',
        choices: [
            { id: 'a', text: 'They\'re independent; you need to measure both.' },
            { id: 'b', text: 'They\'re locked together — given one, the refrigerant\'s P-T chart gives you the other.', correct: true },
            { id: 'c', text: 'Temperature leads pressure by a few seconds.' },
            { id: 'd', text: 'The relationship is the same for every refrigerant.' }
        ],
        explain: 'At saturation, pressure and temperature are pinned to each other by that refrigerant\'s published P-T table. R-410A at 118.4 psig (816 kPag) is boiling at 40 °F (4.4 °C) — not "about 40," at 40. That\'s what makes a suction-pressure reading meaningful: it tells you the saturation temperature inside the evaporator without measuring temperature directly. The lock is per-refrigerant, though — each one has its own table.',
        learnMore: { href: '/education/refrigerant-cycle-basics.html#pt-lock', label: 'Refrigerant Cycle Basics — The pressure-temperature relationship' },
        tags: ['refrigeration', 'pt-relationship']
    },
    {
        type: 'gotcha',
        id: 'sat-temp-not-line-temp',
        prompt: 'A tech reads 118 psig (814 kPag) on the suction gauge of an R-410A unit, looks up the saturation temperature (40 °F / 4.4 °C), and concludes the suction LINE is at 40 °F. What\'s wrong with that?',
        snippet: '<pre class="quiz-snippet">refrigerant:  R-410A\nsuction P:    118 psig / 814 kPag  →  sat T = 40 °F / 4.4 °C\nconclusion:   "the suction line is at 40 °F"</pre>',
        choices: [
            { id: 'a', text: 'Nothing — at 118 psig (814 kPag) the suction line is exactly 40 °F (4.4 °C).' },
            { id: 'b', text: 'The saturation lock only holds where the refrigerant is mid-phase-change. The suction line carries pure (superheated) vapor, so its temperature is warmer than the 40 °F saturation value.', correct: true },
            { id: 'c', text: 'The gauge should read absolute pressure, so the temperature is really lower.' },
            { id: 'd', text: 'R-410A doesn\'t have a saturation temperature at that pressure.' }
        ],
        explain: '40 °F (4.4 °C) is the saturation temperature — the temperature of refrigerant boiling inside the evaporator at 118 psig (814 kPag). But by the time the refrigerant reaches the suction line it\'s pure vapor, past saturation, and pressure and temperature have drifted apart. The gap between the measured line temperature and the 40 °F saturation value is exactly what the next page turns into superheat. Mixing up "saturation temperature" with "line temperature" is the classic beginner trap.',
        learnMore: { href: '/education/refrigerant-cycle-basics.html#pt-lock', label: 'Refrigerant Cycle Basics — The pressure-temperature relationship' },
        tags: ['refrigeration', 'pt-relationship', 'superheat']
    },
    {
        type: 'mcq',
        id: 'glide-blend',
        prompt: 'Which of these refrigerants has noticeable glide — a saturation temperature that\'s a range (bubble point to dew point) rather than a single value at a given pressure?',
        choices: [
            { id: 'a', text: 'R-410A (a near-azeotropic blend).' },
            { id: 'b', text: 'R-407C (a zeotropic blend).', correct: true },
            { id: 'c', text: 'Any pure refrigerant.' },
            { id: 'd', text: 'Glide is the same for all of them.' }
        ],
        explain: 'Zeotropic blends like R-407C have glide: at one pressure the saturation temperature isn\'t a single number but a small range between a bubble point (liquid side) and a dew point (vapor side). Pure refrigerants and near-azeotropic blends like R-410A or R-404A collapse that range to (effectively) one value. The P-T tool always shows both bubble and dew so the glide is visible whenever it matters.',
        learnMore: { href: '/education/refrigerant-cycle-basics.html#pt-lock', label: 'Refrigerant Cycle Basics — The pressure-temperature relationship' },
        tags: ['refrigeration', 'pt-relationship', 'glide']
    },

    // ── Two pressures, end to end ──────────────────────────
    {
        type: 'numeric',
        id: 'compressor-lift',
        prompt: 'An R-410A unit reads 340 psig (2344 kPag) on the discharge gauge and 118 psig (814 kPag) on the suction gauge. The compressor has to lift the refrigerant across that pressure difference. How big is the difference, in psi?',
        answer: 222,
        tolerance: 1,
        unit: 'psi',
        explain: 'High side minus low side: 340 − 118 = 222 psi. That\'s the pressure rise the compressor produces — low side to high side — and it\'s the work the system spends to move heat from a cold indoor coil to a hot outdoor coil. Both pressures move together as outdoor temperature, indoor load, and charge change; the gap between them is the compressor\'s job.',
        learnMore: { href: '/education/refrigerant-cycle-basics.html#cycle', label: 'Refrigerant Cycle Basics — The cycle, end to end' },
        tags: ['refrigeration', 'cycle']
    },
    {
        type: 'tf',
        id: 'two-pressures',
        prompt: 'A unit controller reads two refrigerant pressures — suction (low side) and discharge (high side) — because each one reports on a different half of the system.',
        answer: true,
        explain: 'True. Suction pressure tells you what\'s happening on the cold half; discharge pressure tells you what\'s happening on the hot half. The two are coupled — change one and the other reacts within seconds — but they\'re separately measurable and separately informative. High suction with a normal discharge means something very different from high discharge with a normal suction.',
        learnMore: { href: '/education/refrigerant-cycle-basics.html#high-low-side', label: 'Refrigerant Cycle Basics — High side vs. low side' },
        tags: ['refrigeration', 'cycle']
    }
];
