// Question bank for the Sequencing Scenarios field drill, exposed to
// Nunjucks as `quizzes['sequencing-scenarios']`. See the sibling
// modbus-decoding.js header for the data-vs-template rationale.
//
// Field drill (no single paired lesson): how real sequences of operation
// behave — chiller / boiler plant staging and deadbands, AHU economizer
// changeover, dehumidification + reheat cascades, and lead/lag rotation.
// Explanations are inline; learnMore points only at the lessons/tools that
// genuinely cover the concept (Equipment Staging + Psychrometrics lessons,
// Economizer Ratio + Psychrometric Chart tools all exist).

module.exports = [
    // ── Plant staging: why stage at all ───────────────────
    {
        type: 'mcq',
        id: 'why-stage-plant',
        prompt: 'A chilled-water plant has three identical 200-ton chillers. At a 250-ton load, why run two chillers part-loaded instead of one chiller maxed plus a second barely on?',
        choices: [
            { id: 'a', text: 'Chillers are most efficient at 100% load, so you always run as few as possible at full tilt.' },
            { id: 'b', text: 'Centrifugal/screw chillers are often most efficient at part load, and splitting 250 tons across two units keeps both in an efficient band with redundancy — versus one pinned at 100% and stressed.', correct: true },
            { id: 'c', text: 'Running two prevents the pumps from cavitating.' },
            { id: 'd', text: 'It doesn\'t matter; total kW is the same either way.' }
        ],
        explain: 'A common surprise: many chillers post their best kW/ton <em>below</em> full load, not at it, because condenser-water relief and reduced compressor lift help at part load. Splitting 250 tons as 125+125 can land both machines in a sweeter efficiency band than one at 200 and one at 50 — and you gain redundancy and gentler wear. That\'s the trade staging logic manages: the energy cost of an extra running machine vs. the efficiency and reliability of not pinning one unit at its limit. The optimum is plant-specific (read the kW/ton curves), but "fewest machines at full load" is not automatically best.',
        learnMore: { href: '/education/equipment-staging.html', label: 'Equipment Staging' },
        tags: ['sequencing-scenarios', 'staging', 'chiller-plant']
    },

    // ── Plant staging: anti short-cycle deadband ──────────
    {
        type: 'mcq',
        id: 'stage-deadband-purpose',
        prompt: 'A staging sequence stages UP at 95% of running capacity and stages DOWN at 40%. Why the wide gap instead of, say, up at 80% and down at 78%?',
        choices: [
            { id: 'a', text: 'The numbers are arbitrary; any thresholds work.' },
            { id: 'b', text: 'The gap (a deadband) plus minimum stage timers stops the plant from hunting — staging a unit on then immediately off again as load wobbles around a single threshold.', correct: true },
            { id: 'c', text: 'Staging down at 40% keeps the chillers warmer.' },
            { id: 'd', text: 'The wide gap is required to keep the pumps primed.' }
        ],
        explain: 'If stage-up and stage-down sat right next to each other, a load hovering near the threshold would stage a machine on, drop the running %, immediately satisfy stage-down, stage it off, climb back up… short-cycling that wears compressors and never settles. The separation between the two thresholds is a <strong>deadband</strong>, and it\'s reinforced by a <em>minimum stage time</em> (a freshly-started machine must run N minutes before it\'s eligible to stage off) and a <em>stage delay</em> (the load must persist before adding capacity). Together they trade a little tightness for stability.',
        learnMore: { href: '/education/equipment-staging.html', label: 'Equipment Staging' },
        tags: ['sequencing-scenarios', 'staging', 'deadband']
    },

    // ── Plant staging: lead/lag rotation ──────────────────
    {
        type: 'tf',
        id: 'leadlag-rotation-runtime',
        prompt: 'With three equal chillers, always keeping the same unit as "lead" is fine as long as it\'s the newest machine.',
        answer: false,
        explain: 'Rotate the lead. If one machine is always first on and last off, it racks up the runtime hours and wear while its siblings sit; you get one worn-out chiller and two nearly-new ones, and your redundancy quietly erodes because the lead is the one most likely to fail. Lead/lag <strong>rotation</strong> — by runtime hours, by a schedule, or on each start — equalizes wear across the fleet so the machines age together and any one can cover. "Newest machine leads" just guarantees the newest becomes the most-worn first.',
        learnMore: { href: '/education/equipment-staging.html', label: 'Equipment Staging' },
        tags: ['sequencing-scenarios', 'staging', 'lead-lag']
    },

    // ── Economizer: changeover concept ────────────────────
    {
        type: 'mcq',
        id: 'economizer-what-it-does',
        prompt: 'An AHU economizer "changes over" to economizer mode. What is it actually doing?',
        choices: [
            { id: 'a', text: 'Switching the chiller to a more efficient refrigerant.' },
            { id: 'b', text: 'Opening the outdoor-air dampers to use cool outdoor air for free cooling, modulating mechanical cooling back as the outdoor air does the work.', correct: true },
            { id: 'c', text: 'Shutting the AHU off to save energy.' },
            { id: 'd', text: 'Reversing the supply and return fans.' }
        ],
        explain: 'When outdoor air is cool (and, for an enthalpy economizer, dry) enough, the economizer brings in more outdoor air and lets it carry the cooling load instead of the compressor — "free cooling." The outdoor and return dampers modulate together (more OA, less return) while mechanical cooling is held back or staged off. The whole sequence hinges on the <strong>changeover decision</strong>: is outdoor air actually a better source than recirculated return air right now? Get that decision wrong and you either miss free cooling or drag in hot, humid air and pay to recondition it.',
        learnMore: { href: '/tools/economizer-ratio.html', label: 'Economizer Ratio Calculator' },
        tags: ['sequencing-scenarios', 'economizer', 'ahu']
    },

    // ── Economizer: dry-bulb vs enthalpy changeover ───────
    {
        type: 'mcq',
        id: 'economizer-enthalpy-vs-drybulb',
        prompt: 'In a hot-humid climate, a dry-bulb economizer changeover (e.g. "economize below 65°F OA") sometimes still drags the coil into a losing fight. Why does enthalpy changeover do better?',
        choices: [
            { id: 'a', text: 'Enthalpy sensors are simply more accurate thermometers.' },
            { id: 'b', text: 'Dry-bulb ignores moisture: 64°F but very humid outdoor air carries more total heat (enthalpy) than cooler-feeling return air. Enthalpy changeover compares total heat content, so it rejects warm-but-humid air dry-bulb would have admitted.', correct: true },
            { id: 'c', text: 'Enthalpy changeover opens the dampers faster.' },
            { id: 'd', text: 'Dry-bulb only works in winter.' }
        ],
        explain: 'A dry-bulb decision looks only at temperature, but the cooling coil has to remove <em>total</em> heat — sensible plus latent. Outdoor air at 64°F and 90% RH holds a lot of moisture, so its enthalpy can exceed that of warmer-but-drier return air; admit it and the coil now has to wring out all that water (latent load) on top of cooling, which can cost more than just recirculating. <strong>Enthalpy</strong> (or differential-enthalpy) changeover compares total heat content of outdoor vs. return air and only economizes when outdoor air is genuinely the lower-enthalpy source. The cost is humidity sensors, which drift and need care — the classic reason a "smart" enthalpy economizer underperforms a simple dry-bulb one.',
        learnMore: { href: '/tools/psychrometric-chart.html', label: 'Psychrometric Chart' },
        tags: ['sequencing-scenarios', 'economizer', 'enthalpy']
    },

    // ── Economizer: low-limit / freeze (gotcha) ───────────
    {
        type: 'gotcha',
        id: 'economizer-low-limit',
        prompt: 'On a 20°F morning the economizer is commanding the outdoor-air dampers wide open chasing a cool supply-air setpoint, and the mixed-air temperature is dropping toward freezing. What\'s missing from the sequence?',
        snippet: '<pre class="quiz-snippet">OA temp:        20°F\nOA damper:      100% open (economizing)\nmixed-air temp: 38°F and falling →\nlow-limit / mixed-air lockout:  ?</pre>',
        choices: [
            { id: 'a', text: 'Nothing — colder outdoor air just means more free cooling.' },
            { id: 'b', text: 'A low-limit / mixed-air-temperature override (and an OA-temp lockout): below a setpoint the dampers must drive back toward minimum to protect the coil from freezing, regardless of the cooling demand.', correct: true },
            { id: 'c', text: 'The supply fan should run faster to warm the air.' },
            { id: 'd', text: 'The return dampers should also open fully.' }
        ],
        explain: 'Free cooling has a floor. A correct economizer sequence carries a <strong>low-limit</strong>: a mixed-air (or discharge) temperature override that forces the outdoor dampers back toward minimum position when mixed-air drops too low, plus a freeze-stat as the hard backstop, plus an outdoor-air-temperature lockout that disables economizing below a setpoint. Without them, the loop happily drives the dampers wide chasing a cold supply target on a frigid morning and freezes a hydronic coil. The economizer\'s job is "use cool air <em>when safe</em>," and the low-limit is the "when safe" half.',
        tags: ['sequencing-scenarios', 'economizer', 'freeze-protection']
    },

    // ── Dehumidification: overcool-and-reheat ─────────────
    {
        type: 'mcq',
        id: 'dehum-reheat-cascade',
        prompt: 'A space holds 74°F but humidity creeps up. The dehumidification sequence over-cools the supply air, then reheats it. Why deliberately cool past setpoint only to heat back up?',
        choices: [
            { id: 'a', text: 'It\'s a control error — you should never cool and heat at once.' },
            { id: 'b', text: 'Dropping the coil below the air\'s dew point condenses moisture out (latent removal); the air leaves cold and dry, and reheat brings the dry air back to a comfortable temperature without re-adding water.', correct: true },
            { id: 'c', text: 'Reheat is only there to protect the coil from freezing.' },
            { id: 'd', text: 'The space sensor is reading the wrong value.' }
        ],
        explain: 'You can\'t remove moisture without taking the air below its <strong>dew point</strong> — that\'s what makes water condense on the coil and drain away. To dry the air hard you drive the coil colder than comfort temperature needs, which removes latent load but leaves the supply air too cold. <em>Reheat</em> then warms that now-dry air back up to a neutral delivery temperature, so the room gets dehumidified air at a comfortable temperature instead of cold clammy air. It costs energy (you\'re heating air you just paid to cool), which is why reheat is metered carefully and why dew-point-aware control matters — but for humidity control there\'s no way around going below dew point first.',
        learnMore: { href: '/education/psychrometrics-basics.html', label: 'Psychrometrics Basics' },
        tags: ['sequencing-scenarios', 'dehumidification', 'reheat']
    },

    // ── Dehumidification: dew point is the lever ──────────
    {
        type: 'tf',
        id: 'dehum-watch-dewpoint',
        prompt: 'To judge whether a space will feel muggy or condensation will form on cold surfaces, dew point is a more direct number to watch than relative humidity.',
        answer: true,
        explain: 'Dew point is an <em>absolute</em> measure of how much moisture the air actually holds; relative humidity is moisture <em>relative to the current temperature</em>, so the same RH means very different real moisture at 60°F vs 80°F. Condensation forms whenever a surface drops below the air\'s dew point — so dew point directly predicts sweating windows, cold-supply-duct drips, and pool-room fog. Two rooms at "50% RH" can have very different dew points and very different mugginess. Controls that target a dew-point setpoint hold real comfort better than ones chasing RH, which moves every time the temperature does.',
        learnMore: { href: '/education/psychrometrics-basics.html', label: 'Psychrometrics Basics' },
        tags: ['sequencing-scenarios', 'dehumidification', 'dew-point']
    },

    // ── Boiler plant: reset + condensing (numeric-ish mcq) ─
    {
        type: 'mcq',
        id: 'hw-reset-condensing-boiler',
        prompt: 'A condensing boiler plant runs an outdoor-air-reset hot-water schedule: colder outside ⇒ higher supply temp. Why also keep return-water temperature as LOW as the load allows?',
        choices: [
            { id: 'a', text: 'Low return water prevents the pumps from overheating.' },
            { id: 'b', text: 'A condensing boiler only reaches its high efficiency when return water is cool enough (roughly below ~130°F) to condense flue-gas water vapor and reclaim its latent heat; high return water keeps it out of the condensing region.', correct: true },
            { id: 'c', text: 'Low return water is required to satisfy the freeze-stat.' },
            { id: 'd', text: 'It has no effect — efficiency depends only on supply temp.' }
        ],
        explain: 'A condensing boiler earns its name (and its efficiency premium) by cooling the flue gas enough to condense the water vapor in it and capture that latent heat — but that only happens when the <strong>return</strong> water is below the flue-gas dew point, roughly the mid-120s to low-130s °F. Run the return hot and the boiler never condenses; you\'ve bought a condensing boiler and operate it like a conventional one. So the sequence pairs outdoor-air-reset (lowest supply temp that still meets load) with system design that keeps return water low — wide ΔT, no needless bypass — to stay in the condensing band as much of the season as possible.',
        learnMore: { href: '/education/equipment-staging.html', label: 'Equipment Staging' },
        tags: ['sequencing-scenarios', 'boiler-plant', 'reset']
    },

    // ── AHU: supply-air-temp reset interaction ────────────
    {
        type: 'mcq',
        id: 'sat-reset-vs-dehum-conflict',
        prompt: 'A VAV AHU uses supply-air-temperature reset (warm the supply air up when zones aren\'t calling hard, to save energy). On a humid day this can backfire. Why?',
        choices: [
            { id: 'a', text: 'Warmer supply air freezes the cooling coil.' },
            { id: 'b', text: 'Resetting the supply air warmer raises the coil leaving temperature above the air\'s dew point, so the coil stops dehumidifying — zones get cool-enough but humid air, and space RH climbs.', correct: true },
            { id: 'c', text: 'The VAV boxes can\'t open far enough.' },
            { id: 'd', text: 'Warmer supply air always uses more fan energy.' }
        ],
        explain: 'Supply-air-temp reset saves reheat and chiller energy by not over-cooling when the zones don\'t need it — great for <em>sensible</em> load. But dehumidification depends on the coil running <strong>below the dew point</strong>; reset the supply air warm enough and the coil leaving temp rises above dew point and latent removal stops. On a humid day the zones can be satisfied for temperature while space humidity quietly climbs. That\'s why good SAT-reset sequences include a humidity high-limit that suspends or limits the reset when space (or return) RH/dew-point rises — the two objectives, energy and moisture, pull against each other and the sequence has to arbitrate.',
        learnMore: { href: '/education/psychrometrics-basics.html', label: 'Psychrometrics Basics' },
        tags: ['sequencing-scenarios', 'ahu', 'sat-reset']
    }
];
