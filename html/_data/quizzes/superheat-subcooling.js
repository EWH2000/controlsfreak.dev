// Question bank for the Superheat & Subcooling quiz, exposed to
// Nunjucks as `quizzes['superheat-subcooling']`. Lives in _data/ so two
// consumers read one source: the page's inline JS (mounts the engine in
// the browser) and the FAQPage JSON-LD emitter in head.njk (indexable
// Q&A for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_superheat-subcooling_* localStorage keys. Pairs with the
// Superheat & Subcooling lesson; learnMore hrefs deep-link its <h2>
// anchors.

module.exports = [
    // ── What each measures ─────────────────────────────────
    {
        type: 'mcq',
        id: 'superheat-where',
        prompt: 'Superheat is measured on which line of the system?',
        choices: [
            { id: 'a', text: 'The liquid line, leaving the condenser.' },
            { id: 'b', text: 'The suction line, leaving the evaporator.', correct: true },
            { id: 'c', text: 'The discharge line, leaving the compressor.' },
            { id: 'd', text: 'It doesn\'t matter which line.' }
        ],
        explain: 'Superheat is a vapor-side number — how many degrees warmer the refrigerant vapor is than its saturation temperature. You read it on the suction line, the cool vapor leaving the evaporator on its way back to the compressor. Subcooling is the mirror, read on the liquid line.',
        learnMore: { href: '/education/superheat-subcooling.html#definitions', label: 'Superheat & Subcooling — Two measurements' },
        tags: ['refrigeration', 'superheat']
    },
    {
        type: 'mcq',
        id: 'superheat-formula',
        prompt: 'How do you compute superheat from field readings?',
        choices: [
            { id: 'a', text: 'Measured suction-line temperature minus the saturation (dew) temperature for the suction pressure.', correct: true },
            { id: 'b', text: 'Saturation temperature minus the measured line temperature.' },
            { id: 'c', text: 'Suction pressure minus discharge pressure.' },
            { id: 'd', text: 'Liquid-line temperature minus suction-line temperature.' }
        ],
        explain: 'superheat = line T − dew T. Take the suction-line pressure, look up its saturation temperature (the dew column, because it\'s vapor), and subtract that from the measured suction-line temperature. A healthy system reads a positive number — the vapor is warmer than saturation.',
        learnMore: { href: '/education/superheat-subcooling.html#definitions', label: 'Superheat & Subcooling — Two measurements' },
        tags: ['refrigeration', 'superheat']
    },
    {
        type: 'numeric',
        id: 'superheat-calc',
        prompt: 'A suction-line thermometer reads 48 °F (8.9 °C). The refrigerant\'s P-T table gives a dew temperature of 40 °F (4.4 °C) at the measured suction pressure. What\'s the superheat? Enter the answer in °F.',
        answer: 8,
        tolerance: 0.5,
        unit: '°F',
        explain: 'superheat = line T − dew T = 48 − 40 = 8 °F (in SI: 8.9 − 4.4 = 4.5 °C). The suction-line vapor is 8 degrees warmer than the saturation temperature — a healthy, modest superheat for a typical system. Both the gauge and the thermometer have to agree on units (°F here) for the subtraction to mean anything.',
        learnMore: { href: '/education/superheat-subcooling.html#definitions', label: 'Superheat & Subcooling — Two measurements' },
        tags: ['refrigeration', 'superheat']
    },
    {
        type: 'mcq',
        id: 'subcooling-formula',
        prompt: 'Subcooling measures how many degrees the refrigerant is below saturation. On which line, and which way does the subtraction go?',
        choices: [
            { id: 'a', text: 'On the suction line: dew T minus line T.' },
            { id: 'b', text: 'On the liquid line: bubble (saturation) T minus the measured line T.', correct: true },
            { id: 'c', text: 'On the discharge line: line T minus bubble T.' },
            { id: 'd', text: 'On the liquid line: line T minus bubble T.' }
        ],
        explain: 'subcooling = bubble T − line T, on the liquid line leaving the condenser. It\'s how many degrees cooler the liquid is than its saturation temperature (the bubble column, because it\'s liquid). Healthy systems read positive on both: vapor warmer than saturation (superheat), liquid cooler than saturation (subcooling).',
        learnMore: { href: '/education/superheat-subcooling.html#definitions', label: 'Superheat & Subcooling — Two measurements' },
        tags: ['refrigeration', 'subcooling']
    },
    {
        type: 'tf',
        id: 'both-positive',
        prompt: 'On a healthy running system, both superheat and subcooling are positive numbers.',
        answer: true,
        explain: 'True. Superheat positive means the suction vapor is warmer than saturation (no liquid sneaking back to the compressor). Subcooling positive means the liquid leaving the condenser is cooler than saturation (a solid liquid seal, no flash gas in the liquid line). Either one going to zero or negative is a fault direction.',
        learnMore: { href: '/education/superheat-subcooling.html#definitions', label: 'Superheat & Subcooling — Two measurements' },
        tags: ['refrigeration', 'superheat', 'subcooling']
    },

    // ── Abnormal readings ──────────────────────────────────
    {
        type: 'gotcha',
        id: 'high-superheat-starved',
        prompt: 'A running unit shows a superheat of 50 °F (27.8 °C) — far above any normal target. The subcooling is also low. Which direction does this point?',
        snippet: '<pre class="quiz-snippet">superheat:   50 °F / 27.8 °C   (target ~ 10 °F / 5.6 °C)\nsubcooling:  low\nsymptom:     unit underperforming</pre>',
        choices: [
            { id: 'a', text: 'Overcharge — too much refrigerant in the system.' },
            { id: 'b', text: 'A starved evaporator — not enough refrigerant reaching the coil. With low subcooling too, undercharge is the leading suspect.', correct: true },
            { id: 'c', text: 'Floodback — liquid reaching the compressor.' },
            { id: 'd', text: 'Nothing — 50 °F (27.8 °C) superheat is normal at light load.' }
        ],
        explain: 'High superheat means the coil is starved: too little refrigerant boiling in the evaporator, so most of the coil carries superheated vapor instead of boiling liquid. Causes are undercharge, a restricted liquid line (clogged filter-drier), or a metering device underfeeding. Low subcooling alongside it tilts the read toward undercharge — you\'d confirm with discharge pressure before adding refrigerant.',
        learnMore: { href: '/education/superheat-subcooling.html#abnormal', label: 'Superheat & Subcooling — What abnormal readings tell you' },
        tags: ['refrigeration', 'superheat', 'troubleshooting']
    },
    {
        type: 'mcq',
        id: 'negative-superheat-floodback',
        prompt: 'Why is a low or negative superheat reading on a running system treated as an emergency direction?',
        choices: [
            { id: 'a', text: 'It means the condenser is overheating.' },
            { id: 'b', text: 'It means liquid refrigerant may be reaching the compressor (floodback) — and compressors pump vapor, not liquid, so it kills them.', correct: true },
            { id: 'c', text: 'It means the system is overcharged but otherwise fine.' },
            { id: 'd', text: 'It means the metering device is feeding too little.' }
        ],
        explain: 'Negative superheat means liquid is surviving past the evaporator into the suction line. Liquid reaching the compressor — floodback — damages it, because a compressor is a vapor pump and liquid doesn\'t compress. The usual cause is a metering device feeding too much, or the evaporator load dropping faster than the valve can throttle back. Even a chronically low reading (under ~5 °F on most equipment) is asking for trouble.',
        learnMore: { href: '/education/superheat-subcooling.html#abnormal', label: 'Superheat & Subcooling — What abnormal readings tell you' },
        tags: ['refrigeration', 'superheat', 'troubleshooting']
    },
    {
        type: 'mcq',
        id: 'low-subcooling-undercharge',
        prompt: 'A system that otherwise looks healthy reads a consistently low subcooling. What does that most commonly mean?',
        choices: [
            { id: 'a', text: 'It\'s overcharged.' },
            { id: 'b', text: 'It probably needs more refrigerant — undercharge, or a condenser not rejecting enough heat.', correct: true },
            { id: 'c', text: 'The compressor is failing.' },
            { id: 'd', text: 'The suction line is restricted.' }
        ],
        explain: 'Low subcooling means too little liquid cooling below saturation — there isn\'t a solid column of subcooled liquid leaving the condenser. On an otherwise healthy system that usually means undercharge. The other cause is a condenser not rejecting enough heat (dirty coil, weak fan, bypass air, high outdoor temperature). Negative subcooling is worse: flash gas in the liquid line, which the metering device can\'t handle correctly.',
        learnMore: { href: '/education/superheat-subcooling.html#abnormal', label: 'Superheat & Subcooling — What abnormal readings tell you' },
        tags: ['refrigeration', 'subcooling', 'troubleshooting']
    },
    {
        type: 'gotcha',
        id: 'restricted-liquid-line',
        prompt: 'A unit shows HIGH subcooling together with HIGH discharge (head) pressure. What\'s the classic signature here?',
        snippet: '<pre class="quiz-snippet">subcooling:        high\ndischarge press:   high\nsuperheat:         high (starved coil)</pre>',
        choices: [
            { id: 'a', text: 'Undercharge.' },
            { id: 'b', text: 'A restricted liquid line — the restriction backs liquid up into the condenser (raising subcooling and head pressure) while starving the coil downstream.', correct: true },
            { id: 'c', text: 'A loose sensing bulb.' },
            { id: 'd', text: 'Normal operation on a cold day.' }
        ],
        explain: 'High discharge pressure alongside high subcooling is the restricted-liquid-line signature. A restriction downstream of the condenser (a plugged filter-drier is classic) backs liquid up into the condenser, which raises subcooling and head pressure — while the coil downstream goes hungry, driving superheat up too. Overcharge also raises subcooling, but it doesn\'t starve the evaporator the same way; the high head + high subcooling + high superheat combination points at the restriction.',
        learnMore: { href: '/education/superheat-subcooling.html#abnormal', label: 'Superheat & Subcooling — What abnormal readings tell you' },
        tags: ['refrigeration', 'subcooling', 'troubleshooting']
    },

    // ── How the cycle holds it ─────────────────────────────
    {
        type: 'mcq',
        id: 'metering-holds-superheat',
        prompt: 'A TXV or EEV reacts to a high superheat differently than a fixed orifice or capillary tube does. How?',
        choices: [
            { id: 'a', text: 'A TXV/EEV actively modulates to hold a target superheat; a fixed orifice has no feedback and runs whatever superheat conditions force on it.', correct: true },
            { id: 'b', text: 'A fixed orifice holds superheat tighter than a TXV.' },
            { id: 'c', text: 'They behave identically — both are just restrictions.' },
            { id: 'd', text: 'A TXV controls subcooling, not superheat.' }
        ],
        explain: 'A TXV and an EEV are feedback elements — they modulate their opening to keep evaporator-outlet superheat at a target as the cycle moves. So a chronically high superheat on a TXV system usually means the valve isn\'t getting what it needs (loose or lost-charge bulb) or can\'t keep up. A fixed orifice or cap tube has no such feedback; its superheat just floats with outdoor temperature, indoor load, and design assumptions. Page 3 of the chapter opens up that mechanism.',
        learnMore: { href: '/education/superheat-subcooling.html#abnormal', label: 'Superheat & Subcooling — What abnormal readings tell you' },
        tags: ['refrigeration', 'superheat', 'metering']
    }
];
