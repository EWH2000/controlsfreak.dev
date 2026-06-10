// Question bank for the Psychrometrics Basics quiz, exposed to Nunjucks
// as `quizzes['psychrometrics-basics']`. Lives in _data/ so two
// consumers read one source: the page's inline JS (mounts the engine in
// the browser) and the FAQPage JSON-LD emitter in head.njk (indexable
// Q&A for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_psychrometrics-basics_* localStorage keys. Pairs with the
// Psychrometrics Basics lesson; learnMore hrefs deep-link its <h2>
// anchors.

module.exports = [
    // ── The seven properties ───────────────────────────────
    {
        type: 'mcq',
        id: 'psy-dew-point-condenses',
        prompt: 'When you\'re worried about water forming on a surface — a window, a duct in a humid ceiling, sweating chilled-water pipe — which property is the controlling number?',
        choices: [
            { id: 'a', text: 'Relative humidity.' },
            { id: 'b', text: 'Dew point — the temperature the air must cool to before vapor condenses. Any surface below it sweats.', correct: true },
            { id: 'c', text: 'Wet-bulb temperature.' },
            { id: 'd', text: 'Dry-bulb temperature.' }
        ],
        explain: 'Dew point is the property that condenses. The glass-of-ice-water model holds everywhere — any surface colder than the air\'s dew point grows water out of the air. RH only tells you condensation risk once you also know the temperature; dew point is the number you can act on directly.',
        learnMore: { href: '/education/psychrometrics-basics.html#properties', label: 'Psychrometrics Basics — The Seven Properties' },
        tags: ['psychrometrics', 'dew-point']
    },
    {
        type: 'mcq',
        id: 'psy-humidity-ratio',
        prompt: 'You need to compare the moisture in two airstreams at different temperatures, or balance a moisture load across a system. Which property is the right one — independent of temperature?',
        choices: [
            { id: 'a', text: 'Relative humidity.' },
            { id: 'b', text: 'Humidity ratio (W) — mass of water vapor per unit mass of dry air.', correct: true },
            { id: 'c', text: 'Dry-bulb temperature.' },
            { id: 'd', text: 'Enthalpy.' }
        ],
        explain: 'Humidity ratio (W), in grains per pound (or g/kg), is the mass-balance quantity: when a coil dehumidifies it\'s what drops, when a humidifier runs it\'s what climbs. Unlike RH it doesn\'t depend on temperature, so it\'s the right number to compare two airstreams at different temperatures or to balance moisture across a system.',
        learnMore: { href: '/education/psychrometrics-basics.html#properties', label: 'Psychrometrics Basics — The Seven Properties' },
        tags: ['psychrometrics', 'humidity-ratio']
    },
    {
        type: 'mcq',
        id: 'psy-specific-volume',
        prompt: 'Specific volume (v, ft³ per pound of dry air) is the translator between which two ways of measuring flow?',
        choices: [
            { id: 'a', text: 'Static pressure and velocity pressure.' },
            { id: 'b', text: 'Volumetric airflow (CFM, what the fan delivers) and mass flow (lb/h, what load calcs run on).', correct: true },
            { id: 'c', text: 'Sensible heat and latent heat.' },
            { id: 'd', text: 'Dry-bulb and wet-bulb.' }
        ],
        explain: 'Fans deliver volume (CFM); coils and energy balances run on mass (lb/h). Specific volume bridges them: ṁ = CFM · 60 / v. Warm, humid air has a larger specific volume, so the same CFM moves less mass on a hot day — one reason coil performance drops at design conditions.',
        learnMore: { href: '/education/psychrometrics-basics.html#properties', label: 'Psychrometrics Basics — The Seven Properties' },
        tags: ['psychrometrics', 'specific-volume']
    },

    // ── Two properties lock the rest ───────────────────────
    {
        type: 'mcq',
        id: 'psy-degrees-of-freedom',
        prompt: 'At a fixed pressure, how many independent properties do you need to fix the complete state of moist air — pinning down all the others?',
        choices: [
            { id: 'a', text: 'One.' },
            { id: 'b', text: 'Two — pick any two independent properties and the other five fall out as arithmetic.', correct: true },
            { id: 'c', text: 'Three.' },
            { id: 'd', text: 'All seven, independently.' }
        ],
        explain: 'At a fixed pressure moist air has two degrees of freedom. Pick any two independent properties — DB and RH, say — and wet-bulb, dew point, humidity ratio, enthalpy, and specific volume all follow. That\'s why a psych chart is two-axis, and why the chart tool\'s "Define by" dropdown lets you pick whichever pair you actually have a reading for.',
        learnMore: { href: '/education/psychrometrics-basics.html#two-lock', label: 'Psychrometrics Basics — Two Properties Lock the Rest' },
        tags: ['psychrometrics', 'state']
    },
    {
        type: 'mcq',
        id: 'psy-saturation-degenerate',
        prompt: 'At saturation (100% RH), which set of properties collapses to a single value?',
        choices: [
            { id: 'a', text: 'Dry-bulb, wet-bulb, and dew point are all equal.', correct: true },
            { id: 'b', text: 'Enthalpy and specific volume are equal.' },
            { id: 'c', text: 'Humidity ratio and relative humidity are equal.' },
            { id: 'd', text: 'Nothing collapses; all seven stay independent.' }
        ],
        explain: 'At saturation, DB = WB = DP — there\'s effectively one temperature, so the pair you\'d normally pick is degenerate. Above saturation isn\'t a valid state at all: the chart\'s heavy saturation curve is a hard ceiling. The drier the air, the further apart DB, WB, and DP spread.',
        learnMore: { href: '/education/psychrometrics-basics.html#two-lock', label: 'Psychrometrics Basics — Two Properties Lock the Rest' },
        tags: ['psychrometrics', 'state']
    },

    // ── Process families ───────────────────────────────────
    {
        type: 'tf',
        id: 'psy-sensible-horizontal',
        prompt: 'In a purely sensible heating or cooling process (no moisture added or removed), the humidity ratio stays constant and the state point slides horizontally on the chart.',
        answer: true,
        explain: 'True. Sensible-only means no moisture changes hands, so humidity ratio (W) holds while dry-bulb moves — a horizontal slide. RH falls on heating (away from saturation) and rises on cooling (toward it), but only because the saturation capacity changes, not because moisture did. Once the coil dips below the entering dew point, you leave the horizontal line and start dehumidifying.',
        learnMore: { href: '/education/psychrometrics-basics.html#processes', label: 'Psychrometrics Basics — Process Families' },
        tags: ['psychrometrics', 'processes']
    },
    {
        type: 'numeric',
        id: 'psy-mixing-fraction',
        prompt: 'An AHU mixing box blends 25 % outdoor air at 95 °F (35.0 °C) dry-bulb with 75 % return air at 75 °F (23.9 °C) dry-bulb. The mixed point lands on the straight line between the two, mass-weighted. What\'s the mixed dry-bulb, in °F?',
        answer: 80,
        tolerance: 0.5,
        unit: '°F',
        explain: 'Mixed DB = 0.25 × 95 + 0.75 × 75 = 23.75 + 56.25 = 80 °F (in SI: 0.25 × 35.0 + 0.75 × 23.9 = 26.7 °C). The mixed state lands on the straight line between the two source points, at the mass-weighted fraction — 25 % of the way from RA toward OA. The chart tool\'s MA node does exactly this, for every property at once, not just dry-bulb.',
        learnMore: { href: '/education/psychrometrics-basics.html#processes', label: 'Psychrometrics Basics — Process Families' },
        tags: ['psychrometrics', 'processes', 'mixing']
    },
    {
        type: 'mcq',
        id: 'psy-adiabatic-humidification',
        prompt: 'An evaporative (wetted-media) humidifier adds moisture to the airstream. Along what line does the state point move on the chart?',
        choices: [
            { id: 'a', text: 'A constant dry-bulb line (straight up).' },
            { id: 'b', text: 'A constant wet-bulb line — W rises, DB drops, total enthalpy essentially unchanged.', correct: true },
            { id: 'c', text: 'A constant humidity-ratio line (horizontal).' },
            { id: 'd', text: 'A constant dew-point line.' }
        ],
        explain: 'Adiabatic (evaporative) humidification takes the water\'s evaporation heat from the airstream itself, so it slides up-and-to-the-left along a constant wet-bulb line: humidity ratio rises, dry-bulb falls, total enthalpy is essentially unchanged — the latent gain is paid for by a sensible drop. (Steam injection is different: it adds enthalpy and sits higher on the chart.)',
        learnMore: { href: '/education/psychrometrics-basics.html#processes', label: 'Psychrometrics Basics — Process Families' },
        tags: ['psychrometrics', 'processes']
    },

    // ── Gotchas ────────────────────────────────────────────
    {
        type: 'gotcha',
        id: 'psy-rh-alone',
        prompt: 'A pool-room spec reads "≤ 60 % RH at design conditions." A colleague says that fully defines the humidity target. What\'s the catch?',
        snippet: '<pre class="quiz-snippet">spec:   ≤ 60% RH at design\nclaim:  "that\'s the whole humidity target"\nmissing: the design dry-bulb it\'s at</pre>',
        choices: [
            { id: 'a', text: 'Nothing — 60 % RH is a complete spec on its own.' },
            { id: 'b', text: 'RH without a temperature is half a spec. 60 % RH at one dry-bulb is a different dew point than at another — the spec is really defending a dew-point ceiling, with RH as shorthand.', correct: true },
            { id: 'c', text: 'The number should be wet-bulb, not RH.' },
            { id: 'd', text: '60 % is too low to be achievable.' }
        ],
        explain: 'RH alone tells you nothing about absolute moisture or condensation risk until you know the dry-bulb. Two airstreams at 60 % RH but different DB carry different moisture and different dew points. When a pool engineer writes "≤ 60 % RH at design," they\'re defending a dew-point ceiling — keep the room\'s dew point below the coldest glazing surface — and RH is just the convenient way to write it.',
        learnMore: { href: '/education/psychrometrics-basics.html#gotchas', label: 'Psychrometrics Basics — Gotchas' },
        tags: ['psychrometrics', 'relative-humidity', 'dew-point']
    },
    {
        type: 'mcq',
        id: 'psy-enthalpy-coil-capacity',
        prompt: 'Why is ṁ·Δh (enthalpy) the right basis for a cooling coil\'s capacity, rather than the sensible-only ṁ·Cp·ΔT?',
        choices: [
            { id: 'a', text: 'Enthalpy is easier to measure than temperature.' },
            { id: 'b', text: 'Sensible-only misses the latent (moisture) share, which can be the bulk of cooling-coil load on a humid day; Δh rolls sensible and latent into one number.', correct: true },
            { id: 'c', text: 'They give identical answers, so either works.' },
            { id: 'd', text: 'Δh applies only to heating coils.' }
        ],
        explain: 'A cooling coil on a humid day does two jobs: drop the temperature (sensible) and wring out moisture (latent). ṁ·Cp·ΔT captures only the sensible part and undersizes the coil. Enthalpy bundles sensible and latent into one number, so ṁ·Δh gives the true total — and it\'s why an enthalpy economizer compares OA vs. RA on total heat, not dry-bulb alone (hot-but-dry air can carry less total heat than cool-but-wet air).',
        learnMore: { href: '/education/psychrometrics-basics.html#gotchas', label: 'Psychrometrics Basics — Gotchas' },
        tags: ['psychrometrics', 'enthalpy']
    }
];
