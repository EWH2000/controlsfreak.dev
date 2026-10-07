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
//
// Quiz prose is painted post-load (the units walker doesn't reach it),
// so temperatures carry static metric parentheticals per the
// metric-rounding policy — results close on the displayed operands.
//
// The bank is deliberately larger than the page's defaultCount (10):
// the engine samples an overflowing bank, so each run draws a
// different subset (buildQueue() in quiz-engine.js). Coverage tracks
// the lesson's sections — the seven properties (wet-bulb as the
// evaporative floor among them), why two lock the rest and which
// field pair earns trust at a coil, the process families including
// cooling with dehumidification, the gotchas with the CFM-to-mass-flow
// arithmetic worked by hand, and the pool-room condensation widget.
// That capstone sits under a section heading with no id, so its
// question deep-links #pool-widget, the widget container itself —
// the nearest id that exists (no ids are added to the lesson here).

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
    {
        type: 'mcq',
        id: 'psy-wet-bulb-floor',
        prompt: 'A cooling tower rejects heat by evaporating some of its water into the outdoor air. Which property of that air sets the lowest temperature the tower could ever cool its water to?',
        choices: [
            { id: 'a', text: 'Dew point — the temperature where the air\'s vapor starts to condense.' },
            { id: 'b', text: 'Dry-bulb — the outdoor temperature the thermometer reads.' },
            { id: 'c', text: 'Relative humidity — the percent on the outdoor-air sensor.' },
            { id: 'd', text: 'Wet-bulb — the evaporative limit of that air.', correct: true }
        ],
        explain: 'Wet-bulb is the evaporative-cooling floor: water evaporating off a wet sock pulls the thermometer down to the air\'s evaporative limit, and that is the lowest temperature you can ever cool water to with that air — the number the cooling-tower industry lives on. Dew point sits below wet-bulb in unsaturated air, which is what makes it the tempting wrong answer, but evaporation pulls water toward wet-bulb. WB equals DB only at saturation; the drier the air, the bigger the depression and the more cooling the air can do.',
        learnMore: { href: '/education/psychrometrics-basics.html#properties', label: 'Psychrometrics Basics — The Seven Properties' },
        tags: ['psychrometrics', 'wet-bulb']
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
    {
        type: 'tf',
        id: 'psy-coil-leaving-pair',
        prompt: 'For a trustworthy cooling-coil leaving-air reading, the DB + RH pair from a duct humidity probe is the gold standard — wet-bulb readings are a holdover from the sling-psychrometer days.',
        answer: false,
        explain: 'False. DB + WB — from a sling psychrometer or an aspirated wet/dry pair — is the original field measurement and still the gold standard for a coil leaving-air reading. DB + RH is the everyday pair because almost every sensor reports it, and it is also the pair with the most footguns. Either pair locks the state, since any two independent properties fix the other five; the question is which pair you trust at the coil.',
        learnMore: { href: '/education/psychrometrics-basics.html#two-lock', label: 'Psychrometrics Basics — Two Properties Lock the Rest' },
        tags: ['psychrometrics', 'state', 'wet-bulb']
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
        prompt: 'An AHU mixing box blends 25 % outdoor air at 95 °F (35.0 °C) dry-bulb with 75 % return air at 75 °F (23.9 °C) dry-bulb. The mixed point lands on the straight line between the two, mass-weighted. What\'s the mixed dry-bulb? Enter the answer in °F.',
        answer: 80,
        tolerance: 0.5,
        unit: '°F',
        explain: 'Mixed DB = 0.25 × 95 + 0.75 × 75 = 23.75 + 56.25 = 80 °F (in SI: 0.25 × 35.0 + 0.75 × 23.9 = 26.7 °C). The mixed state lands on the straight line between the two source points, at the mass-weighted fraction — 25 % of the way from RA toward OA. The chart tool\'s MA node does exactly this, for every property at once, not just dry-bulb.',
        learnMore: { href: '/education/psychrometrics-basics.html#processes', label: 'Psychrometrics Basics — Process Families' },
        tags: ['psychrometrics', 'processes', 'mixing']
    },
    {
        type: 'mcq',
        id: 'psy-cooling-dehumidification',
        prompt: 'A cooling coil\'s surface runs below the entering air\'s dew point. Compared with the entering air, what happens to the air leaving the coil?',
        choices: [
            { id: 'a', text: 'Dry-bulb drops; humidity ratio and dew point hold steady while RH climbs.' },
            { id: 'b', text: 'Dry-bulb drops; humidity ratio rises as the wet coil adds moisture.' },
            { id: 'c', text: 'Dry-bulb, humidity ratio and dew point all fall together.', correct: true },
            { id: 'd', text: 'Dry-bulb holds steady while humidity ratio drops — the coil removes moisture only.' }
        ],
        explain: 'Below the entering dew point the coil condenses moisture out of the air and it drains away, so the leaving air carries less water — lower humidity ratio, lower dew point — as well as a lower dry-bulb. On the chart the path bends down-and-to-the-left toward the coil\'s apparatus dew point, the effective coil-surface temperature the leaving air is pulled toward. A steady humidity ratio is the sensible line, which only holds while the coil stays above the entering dew point.',
        learnMore: { href: '/education/psychrometrics-basics.html#processes', label: 'Psychrometrics Basics — Process Families' },
        tags: ['psychrometrics', 'processes', 'dew-point']
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
    },
    {
        type: 'numeric',
        id: 'psy-cfm-to-mass-flow',
        prompt: 'A cooling coil handles 10,000 CFM (17,000 m³/h) of entering air with a specific volume of 13.5 ft³/lb (0.84 m³/kg). Using <code>ṁ = CFM · 60 / v</code>, what mass flow does the coil actually see? Enter the answer in lb/h.',
        answer: 44444,
        tolerance: 50,
        unit: 'lb/h',
        explain: '10,000 × 60 / 13.5 = 600,000 / 13.5 ≈ 44,444 lb/h — the 60 turns per-minute into per-hour, and dividing by v turns volume into mass. (The formula computes in IP; a metric reader lands on the same mass, about 20,200 kg/h.) Push the same 10,000 CFM through warmer, wetter entering air at v = 14.0 ft³/lb (0.87 m³/kg) and the coil sees 600,000 / 14.0 ≈ 42,857 lb/h — about 3.6 % less mass, one reason coil performance drops off at design conditions.',
        learnMore: { href: '/education/psychrometrics-basics.html#gotchas', label: 'Psychrometrics Basics — Gotchas' },
        tags: ['psychrometrics', 'specific-volume']
    },

    // ── Does this air sweat the windows? ───────────────────
    {
        type: 'gotcha',
        id: 'psy-pool-glass-at-spec',
        prompt: 'A pool room is holding its humidity spec exactly. On a cold winter day the tech reads the BAS and says the windows can\'t be sweating. The readings are below. What\'s the catch?',
        snippet: '<pre class="quiz-snippet">SPACE DB     82 °F (27.8 °C)\nSPACE RH     60 %        spec: ≤ 60 % RH\nGLASS SURF   50 °F (10.0 °C)\nclaim: "humidity is at spec, so the glass stays dry"</pre>',
        choices: [
            { id: 'a', text: 'The glass sweats — this room\'s dew point sits near 67 °F (19.4 °C), well above the glass.', correct: true },
            { id: 'b', text: 'Nothing — the room is holding its RH spec, so the glass stays dry and the claim is correct.' },
            { id: 'c', text: 'The glass is fine; 60 % RH is a comfort limit and says nothing about condensation on surfaces.' },
            { id: 'd', text: 'The glass only starts sweating once the room climbs past its 60 % RH limit, so it is dry today.' }
        ],
        explain: 'Meeting the RH spec says nothing about the glass until you back out the dew point: 82 °F (27.8 °C) at 60 % RH has a dew point near 67 °F (19.4 °C), so the 50 °F (10.0 °C) glass sits about 17 °F (9.4 °C) below it and grows water. The control target is dew point below the coldest surface in the room, with margin to spare — the lesson\'s widget opens on exactly this case and reads condensation. The fight is won at the coil, by driving leaving-air dew point well below the glass.',
        learnMore: { href: '/education/psychrometrics-basics.html#pool-widget', label: 'Psychrometrics Basics — Does This Air Sweat the Windows?' },
        tags: ['psychrometrics', 'dew-point', 'relative-humidity']
    }
];
