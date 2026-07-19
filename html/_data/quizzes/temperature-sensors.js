// Question bank for the Temperature Sensors quiz, exposed to Nunjucks
// as `quizzes['temperature-sensors']`. See the sibling
// modbus-decoding.js header for the data-vs-template rationale.
//
// Paired 1:1 with education/temperature-sensors.html: curve families
// and the wrong-pick symptom, RTDs vs thermistors and lead resistance,
// and the meter-and-table verification workflow. Overlap discipline
// against the field-wiring-sensors drill (which owns the defining-point
// lookup, generic non-linearity, the direct 3-wire purpose, and the
// open-vs-short display signature): every question here takes a
// different angle — R→T instead of T→R, consequence instead of purpose,
// localization instead of signature. Zero clones by design.
//
// Curve numbers verified against /scripts/thermistor-data.js (10K
// Type II β=3900, Type III β=3600, JCI 10K + 8.7 kΩ shunt, Pt100 per
// IEC 60751): Type II reads 20.0 kΩ at 50 °F; a Type III part on a
// Type II config reads ≈35.2 °F at a true 32 °F; Pt100 moves
// ≈0.22 Ω/°F; 18 AWG ≈ 6.4 Ω per 1000 ft of conductor.

module.exports = [
    // ── Curves: the wrong-pick symptom ────────────────────
    {
        type: 'mcq',
        id: 'curve-mismatch-symptom',
        prompt: 'A 10K space sensor is wired perfectly, but the software point has <strong>10K Type II</strong> selected and the sensor is actually a <strong>Type III</strong> part. What does the point look like on the graphic?',
        choices: [
            { id: 'a', text: 'It rails to full-scale cold — the input can\'t read a sensor on the wrong curve.' },
            { id: 'b', text: 'It reads a live, plausible temperature that\'s a few degrees off — worst far from 77 °F (25.0 °C), exactly right at it — and it never alarms.', correct: true },
            { id: 'c', text: 'It reads exactly double the true temperature.' },
            { id: 'd', text: 'It jumps erratically between the hot and cold rails.' }
        ],
        explain: 'Both curves pass through <code>10 kΩ</code> at 77 °F (25.0 °C) — that shared point is what the "10K" name promises — and they diverge everywhere else. A Type III part on a Type II config reads about 3 °F (1.7 °C) high when the truth is near 40 °F (4.4 °C), less near the crossover, more further from it. Nothing rails, nothing alarms, the trend looks alive — which is why this failure survives for years. Contrast the loud faults: an open pins the cold rail, a short pins hot, and anyone can see those. Nobody hunts a 3° lie.',
        learnMore: { href: '/education/temperature-sensors.html#curve-families', label: 'Temperature Sensors — One Name, Several Curves' },
        tags: ['temperature-sensors', 'curves']
    },

    // ── Curves: ohms → temperature lookup ─────────────────
    {
        type: 'numeric',
        id: 'ohms-to-temperature-lookup',
        prompt: 'You disconnect a 10K Type II duct sensor and your meter reads <strong>20.0 kΩ</strong>. Per the Type II curve table, about what temperature is that sensor sitting at? Enter the answer in °F.',
        answer: 50,
        tolerance: 3,
        unit: '°F',
        explain: 'An NTC\'s resistance rises as it cools, so 20 kΩ — double the 10 kΩ defining point at 77 °F (25.0 °C) — means well below 77. On the Type II curve it lands at <strong>50 °F (10.0 °C)</strong>. The direction check is worth automating in your head: above 10 kΩ always means below 77 °F on a 10K sensor, and vice versa. The thermistor-calculator\'s R/T table is this exact lookup, both directions, for every common curve.',
        learnMore: { href: '/tools/thermistor-calculator.html', label: 'Thermistor / RTD Calculator' },
        tags: ['temperature-sensors', 'curves', 'lookup']
    },

    // ── RTDs: which family for the job ────────────────────
    {
        type: 'mcq',
        id: 'rtd-or-thermistor-pick',
        prompt: 'A chilled-water plant needs supply and return pipe sensors for an energy (BTU) measurement, where the answer rides on a small ΔT — maybe 10 °F (5.6 °C) — between the two. Which sensor choice fits best?',
        choices: [
            { id: 'a', text: 'Two 10K Type II thermistors — the huge signal makes the small ΔT easier to read.' },
            { id: 'b', text: 'A matched pair of platinum RTDs — pair-matching and long-term stability keep a small ΔT honest for years.', correct: true },
            { id: 'c', text: 'One thermistor and one RTD, so their error curves average out.' },
            { id: 'd', text: 'Any two sensors on the same curve — curve agreement is all that matters.' }
        ],
        explain: 'Energy is flow × ΔT, so a single degree of disagreement between the pair is a 10% error on a 10 °F (5.6 °C) ΔT — forever, on a number that may feed a bill. That\'s the RTD\'s home turf: matched platinum pairs hold their <em>difference</em> accurately, and platinum drifts far less over years than a thermistor. Thermistors own space and duct sensing, where their big signal and low cost win and a degree of absolute error is invisible. Same-curve agreement (d) doesn\'t help — two sensors can share a curve and still each drift.',
        learnMore: { href: '/education/temperature-sensors.html#rtds-vs-thermistors', label: 'Temperature Sensors — RTDs, the Other Family' },
        tags: ['temperature-sensors', 'rtd', 'selection']
    },

    // ── RTDs: what fails without the third wire ───────────
    {
        type: 'mcq',
        id: 'rtd-two-wire-consequence',
        prompt: 'A Pt100 was designed as a 3-wire landing on a 150 ft (46 m) run, but the third conductor got damaged and the input is temporarily reconfigured as 2-wire. Nothing else changed. What happens to the reading?',
        choices: [
            { id: 'a', text: 'Nothing — the third wire only matters if one of the other leads breaks.' },
            { id: 'b', text: 'It reads several degrees high, steadily: with the compensation gone, the copper leads\' resistance counts as element resistance, and on a Pt100 every 0.22 Ω reads as another 1 °F.', correct: true },
            { id: 'c', text: 'It reads several degrees low — the lost wire drops part of the signal.' },
            { id: 'd', text: 'It gets noisy but still averages to the correct temperature.' }
        ],
        explain: 'The third wire exists so the input can measure a lead-only loop and subtract it. Take it away and the subtraction stops: 150 ft of 18 AWG pair is about 1.9 Ω of copper in series, which a 2-wire Pt100 input reads as roughly <strong>9 °F (5 °C) of extra temperature</strong> — constant, plausible, and wrong. Resistance in series always <em>adds</em>, so the error is always high, never low or noisy. This is also why the fault is invisible on a thermistor: the same 1.9 Ω against a 10K element\'s ≈240 Ω/°F (≈440 Ω/°C) is thousandths of a degree.',
        learnMore: { href: '/education/temperature-sensors.html#rtds-vs-thermistors', label: 'Temperature Sensors — the 3-wire landing' },
        tags: ['temperature-sensors', 'rtd', 'lead-resistance']
    },

    // ── RTDs: lead resistance in degrees ──────────────────
    {
        type: 'numeric',
        id: 'pt100-lead-error-degrees',
        prompt: 'A 2-wire Pt100 run adds <strong>1.3 Ω</strong> of total lead resistance (both conductors). A Pt100 moves about 0.22 Ω per °F. About how many °F high does the point read? Enter the answer in °F.',
        answer: 6,
        tolerance: 1,
        unit: '°F',
        explain: 'The input can\'t tell lead ohms from element ohms, so the whole 1.3 Ω reads as temperature: <code>1.3 / 0.22 ≈ 6 °F</code> high (in SI: 1.3 Ω ÷ 0.39 Ω/°C ≈ 3.3 °C). That\'s the entire lead-resistance problem in one division — small ohms over a small ohms-per-degree is a big error. The fixes, in order of bluntness: a 3-wire landing that cancels the leads, a 4-wire landing that removes them from the measurement entirely, or a Pt1000, whose tenfold base resistance shrinks the same 1.3 Ω to about 0.6 °F (0.3 °C).',
        learnMore: { href: '/education/temperature-sensors.html#rtds-vs-thermistors', label: 'Temperature Sensors — RTDs and lead resistance' },
        tags: ['temperature-sensors', 'rtd', 'lead-resistance']
    },

    // ── Verification: the workflow order ──────────────────
    {
        type: 'mcq',
        id: 'verification-workflow-order',
        prompt: 'A zone sensor reads 80 °F (26.7 °C) but the room feels cold, and you want a verdict before anyone swaps parts. Which sequence is the verification workflow?',
        choices: [
            { id: 'a', text: 'Disconnect the sensor at the input → meter the ohms → convert ohms to temperature with the R/T table for the sensor\'s type → compare against a reference thermometer at the sensor.', correct: true },
            { id: 'b', text: 'Compare the graphic to a reference thermometer → replace the sensor if they disagree → re-check the graphic.' },
            { id: 'c', text: 'Meter the ohms with the sensor still landed on the input, so you don\'t disturb the wiring, then look the value up.' },
            { id: 'd', text: 'Enter a calibration offset that makes the graphic match the reference thermometer, and close the call.' }
        ],
        explain: 'Order matters. Disconnect <em>first</em>: landed, the meter reads the sensor in parallel with the input\'s own circuit, and the number lies. The ohms are the sensor\'s honest testimony; the table (the thermistor-calculator carries it for every common curve) turns them into a temperature; the reference thermometer closes the loop. Swapping first (b) can replace a good sensor to fix a config problem, and an offset (d) that papers over a curve mismatch fixes one temperature while the error keeps moving everywhere else.',
        learnMore: { href: '/education/temperature-sensors.html#verification', label: 'Temperature Sensors — Prove It With a Meter' },
        tags: ['temperature-sensors', 'verification', 'workflow']
    },

    // ── Verification: localizing an open ──────────────────
    {
        type: 'mcq',
        id: 'open-reading-localize',
        prompt: 'An OAT point reads −38 °F (−38.9 °C) on a mild fall morning — the classic open-circuit signature. At the controller you disconnect the pair and the meter reads OL (open). What\'s the fastest way to split "bad sensor" from "bad run"?',
        choices: [
            { id: 'a', text: 'Replace the sensor — an open circuit is always the element itself.' },
            { id: 'b', text: 'Meter again across the sensor at the sensor head: plausible ohms there means the run or a termination is broken; OL at the head convicts the sensor.', correct: true },
            { id: 'c', text: 'Change the configured curve type and watch whether the reading recovers.' },
            { id: 'd', text: 'Switch the input between resistance and voltage modes to reset it.' }
        ],
        explain: 'The display signature told you <em>what</em> (open circuit → cold rail); metering at both ends tells you <em>where</em>. The circuit is sensor + run + terminations in series, so one measurement at each end splits it: healthy ohms at the head with OL back at the panel means the break is between them — and loose terminations and damaged splices fail far more often than elements do. A curve change (c) can\'t fix an open — no curve maps infinite ohms to a mild morning.',
        learnMore: { href: '/education/temperature-sensors.html#verification', label: 'Temperature Sensors — reading the verdict' },
        tags: ['temperature-sensors', 'verification', 'failure-modes']
    },

    // ── Gotcha: the curve-mismatch config ─────────────────
    {
        type: 'gotcha',
        id: 'wrong-curve-config',
        prompt: 'An outdoor-air sensor was replaced a while back. Since then the OAT point tracks the weather smoothly — but it runs a few degrees high in cold weather and dead-on in mild weather. Here\'s the point config next to the new part\'s label. What\'s wrong?',
        snippet: '<pre class="quiz-snippet">point:         OA-T   (universal input, resistance mode)\nsensor label:  10K NTC thermistor — curve: Type III\npoint config:  sensor type = 10K Type II\nobserved:      35.2 °F on a morning the airport reports 32 °F;\n               read dead-on through the mild weeks after the swap</pre>',
        choices: [
            { id: 'a', text: 'The replacement sensor is defective — return it for another of the same part.' },
            { id: 'b', text: 'The configured curve doesn\'t match the part: Type II is selected for a Type III sensor. Both read 10 kΩ at 77 °F, so mild weather looked perfect — but near freezing the mismatch reads ≈3 °F high. Select the matching curve.', correct: true },
            { id: 'c', text: 'Lead resistance on the long outdoor run is adding 3 °F — re-land it as a 3-wire input.' },
            { id: 'd', text: 'It\'s within normal sensor tolerance — enter a −3 °F calibration offset and move on.' }
        ],
        explain: 'The mild-weather clue is the tell: near the 77 °F (25.0 °C) crossover the two curves agree, so the mismatch hid until the weather left the crossover — the signature of a curve problem, not a hardware one. The offset (d) is the tempting wrong fix: the error <em>varies</em> with temperature (zero at 77 °F, ≈3 °F near freezing, ≈5 °F at 0 °F / −17.8 °C), so a constant offset just relocates the lie. And (c) is the RTD failure mode — a 10K thermistor shrugs off a couple of ohms of leads. Match the config to the label; the wire can\'t do it for you.',
        learnMore: { href: '/education/temperature-sensors.html#curve-families', label: 'Temperature Sensors — the quiet failure' },
        tags: ['temperature-sensors', 'curves', 'configuration']
    },

    // ── Curves: the shunted vendor conventions ────────────
    {
        type: 'mcq',
        id: 'shunted-10k-room-reading',
        prompt: 'You meter a known-working space sensor at about <strong>4.7 kΩ</strong> with the room near 77 °F (25.0 °C). The job standard says "10K sensors everywhere." What\'s the most likely story?',
        choices: [
            { id: 'a', text: 'The sensor is failing toward a short and should be replaced.' },
            { id: 'b', text: 'It\'s a shunted vendor convention — a 10K element with a parallel resistor (the JCI 10K + 8.7 kΩ pattern), which reads roughly half of 10K at room temperature. The name is not the curve.', correct: true },
            { id: 'c', text: 'Lead resistance on the run is subtracting the other 5 kΩ.' },
            { id: 'd', text: 'It\'s actually a Pt1000 RTD.' }
        ],
        explain: 'Several vendors flatten the 10K curve with a parallel shunt — the JCI convention (8.7 kΩ) reads ≈4.7 kΩ at 77 °F (25.0 °C), the TAC Type 5 (11 kΩ) ≈5.2 kΩ — and both still get called "10K sensors." A real short reads near 0 Ω, not 4.7 kΩ; leads <em>add</em> ohms (and only a couple); and a Pt1000 sits near 1.1 kΩ at that temperature. The action item: the input must have the vendor\'s shunted curve selected, not bare Type II or III — and the calculator\'s Identify mode ranks every curve when the label is gone.',
        learnMore: { href: '/tools/thermistor-calculator.html', label: 'Thermistor / RTD Calculator' },
        tags: ['temperature-sensors', 'curves', 'vendor-conventions']
    },

    // ── Families: direction as a field ID ─────────────────
    {
        type: 'tf',
        id: 'ntc-rtd-direction',
        prompt: 'Hold a 10K thermistor in your fist and its resistance falls as it warms; do the same with an RTD and its resistance rises.',
        answer: true,
        explain: 'True — and it\'s a free identification trick. NTC means <em>negative temperature coefficient</em>: resistance falls as temperature rises, steeply. RTDs run the other way — platinum and Balco both rise with temperature, and nearly linearly. With an unlabeled sensor on the bench, warming it by hand and watching which way the ohms walk sorts the family in ten seconds; the resistance neighborhood (10-ish kΩ vs ≈100 / ≈1,000 Ω at room temperature) then narrows the type before the R/T table settles it.',
        learnMore: { href: '/education/temperature-sensors.html#rtds-vs-thermistors', label: 'Temperature Sensors — RTDs, the Other Family' },
        tags: ['temperature-sensors', 'rtd', 'thermistors']
    }
];
