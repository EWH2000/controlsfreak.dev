// Question bank for the Field Wiring & Sensors field drill, exposed to
// Nunjucks as `quizzes['field-wiring-sensors']`. See the sibling
// modbus-decoding.js header for the data-vs-template rationale.
//
// Field drill (no single paired lesson): the wire-and-sensor layer of a
// controls install — thermistor and RTD curves, lead-wire compensation,
// AI vs AO, loop power and the 4-20 mA live zero, 0-10 V failure modes,
// shielding, and sourcing vs sinking. Explanations are inline; learnMore
// points only at the tools/lessons that genuinely cover the concept
// (Thermistor / Signal Scaling tools exist; BACnet Basics for AI/AO).

module.exports = [
    // ── Sensors: 10K thermistor curve point ───────────────
    {
        type: 'numeric',
        id: 'thermistor-10k-curve-point',
        prompt: 'A 10K Type II thermistor sits at 25°C (77°F). What resistance should the controller see across it?',
        answer: 10000,
        tolerance: 300,
        unit: 'Ω',
        explain: 'The <strong>10K</strong> in the name is the defining curve point: <code>10,000 Ω</code> at 25°C. Type II and Type III both pass through 10 kΩ there and only diverge away from it. "Sensor at room temp reads ~10 kΩ" is the field sanity check — meter the sensor before you trust the controller\'s value, because a reading of <code>3 kΩ</code> or <code>30 kΩ</code> at room temp means a wiring fault or the wrong sensor type long before it means a real temperature.',
        learnMore: { href: '/tools/thermistor-calculator.html', label: 'Thermistor / RTD Calculator' },
        tags: ['field-wiring-sensors', 'sensors', 'thermistors']
    },

    // ── Sensors: thermistor is non-linear ─────────────────
    {
        type: 'tf',
        id: 'thermistor-non-linear',
        prompt: 'A 10K thermistor\'s resistance changes by the same number of ohms per degree across its whole range, so a linear scale converts resistance to temperature accurately.',
        answer: false,
        explain: 'Thermistors are <em>steeply non-linear</em> — the resistance-vs-temperature curve is exponential, with far more ohms-per-degree at cold temperatures than at hot ones. That\'s why a controller stores a lookup curve (or the Steinhart-Hart coefficients) for each thermistor type rather than a single slope. Treat it as linear and your error grows toward the ends of the range. RTDs, by contrast, are close enough to linear that a slope-and-offset gets you most of the way.',
        learnMore: { href: '/tools/thermistor-calculator.html', label: 'Thermistor / RTD Calculator' },
        tags: ['field-wiring-sensors', 'sensors', 'thermistors']
    },

    // ── Sensors: 3-wire RTD lead compensation ─────────────
    {
        type: 'mcq',
        id: 'rtd-three-wire-purpose',
        prompt: 'A 100Ω platinum RTD is run on a long cable. Why is it usually landed as a 3-wire device instead of 2-wire?',
        choices: [
            { id: 'a', text: 'The third wire carries a backup signal if one conductor breaks.' },
            { id: 'b', text: 'The third wire lets the input cancel the resistance of the lead wires, which would otherwise read as added temperature.', correct: true },
            { id: 'c', text: 'The third wire supplies power to the RTD element.' },
            { id: 'd', text: 'Three wires are required by code for any platinum sensor.' }
        ],
        explain: 'An RTD measures temperature <em>as resistance</em>, and the copper lead wires have their own resistance in series with the element — on a long run that\'s real ohms, and the input would read them as extra degrees. The 3-wire arrangement gives the input a way to measure the lead resistance and subtract it, so the reading reflects the element alone. A <strong>4-wire</strong> RTD (true Kelvin sensing) cancels lead resistance even more completely and is used where lab-grade accuracy matters; 2-wire is fine only on short runs.',
        tags: ['field-wiring-sensors', 'sensors', 'rtd']
    },

    // ── Signals: 4-20 mA live zero ────────────────────────
    {
        type: 'mcq',
        id: 'live-zero-broken-wire',
        prompt: 'Two pressure transmitters feed two controllers. One is 0-10 V, one is 4-20 mA. A field wire breaks on each loop. What does each controller read?',
        choices: [
            { id: 'a', text: 'Both read 0 — and both flag a fault automatically.' },
            { id: 'b', text: 'The 0-10 V input reads ~0 V (looks like a valid low pressure); the 4-20 mA input reads 0 mA, which is below the live zero of 4 mA and flags as a fault.', correct: true },
            { id: 'c', text: 'Both hold their last good value until rebooted.' },
            { id: 'd', text: 'The 4-20 mA input reads 4 mA (a valid low pressure); the 0-10 V input faults.' }
        ],
        explain: 'This is the whole argument for 4-20 mA on a field run. A 0-10 V signal uses <em>0 V as a legitimate value</em> (0% of range), so a broken wire reads ~0 V and looks like a real low reading — the controller has no way to tell "zero pressure" from "no wire." 4-20 mA uses a <strong>live zero</strong>: 0% of range is 4 mA, not 0 mA. Anything below ~3.8 mA can only mean a broken loop, lost power, or an open terminal, so the controller flags it instead of believing it.',
        learnMore: { href: '/tools/signal-scaling.html', label: 'Signal Scaling Calculator' },
        tags: ['field-wiring-sensors', 'signals', '4-20ma']
    },

    // ── Signals: numeric scaling ──────────────────────────
    {
        type: 'numeric',
        id: 'scale-12ma-to-eu',
        prompt: 'A 4-20 mA transmitter is scaled 0-250 psi. The controller reads 12 mA. What pressure is that, in psi?',
        answer: 125,
        tolerance: 1,
        unit: 'psi',
        explain: '12 mA is the exact middle of the 4-20 mA span: <code>(12 − 4) / (20 − 4) = 8/16 = 50%</code> of range. 50% of 0-250 psi is <strong>125 psi</strong>. The trap is dividing by 20 instead of by the 16 mA span (which gives 60% → 150 psi) — the live zero means you subtract the 4 mA floor first, then divide by the 16 mA span, not the full 20.',
        learnMore: { href: '/tools/signal-scaling.html', label: 'Signal Scaling Calculator' },
        tags: ['field-wiring-sensors', 'signals', 'scaling']
    },

    // ── I/O: AI vs AO ─────────────────────────────────────
    {
        type: 'mcq',
        id: 'ai-vs-ao-direction',
        prompt: 'On a DDC controller, what\'s the difference between an AI and an AO point?',
        choices: [
            { id: 'a', text: 'AI is for temperature, AO is for pressure.' },
            { id: 'b', text: 'An AI reads an analog signal coming IN from a sensor; an AO drives an analog signal OUT to an actuator or drive.', correct: true },
            { id: 'c', text: 'AI is alternating-current input, AO is alternating-current output.' },
            { id: 'd', text: 'They\'re interchangeable — any analog terminal can do either.' }
        ],
        explain: 'AI = <strong>Analog Input</strong>: a varying signal arriving from the field (a 10K thermistor, a 4-20 mA transmitter, a 0-10 V humidity sensor) that the controller <em>measures</em>. AO = <strong>Analog Output</strong>: a varying signal the controller <em>generates</em> to position something — a 0-10 V damper actuator, a 4-20 mA valve, a VFD speed reference. The terminals are physically different circuits (one senses, one sources), so you can\'t land an actuator on an input. Their digital cousins are BI/BO (binary in/out) for two-state points.',
        learnMore: { href: '/education/bacnet-basics.html#objects', label: 'BACnet Basics — the object model' },
        tags: ['field-wiring-sensors', 'io', 'ai-ao']
    },

    // ── Wiring: loop power / 2-wire vs 3-wire transmitter ──
    {
        type: 'mcq',
        id: 'two-wire-transmitter-power',
        prompt: 'A "2-wire" 4-20 mA transmitter is wired with only two conductors. How does it get powered?',
        choices: [
            { id: 'a', text: 'It runs on a tiny internal battery.' },
            { id: 'b', text: 'It draws its power from the same loop it modulates — the 4-20 mA it sinks is also its supply, so the loop must provide DC power (often 24 VDC).', correct: true },
            { id: 'c', text: 'It is self-powered by the process (pressure or flow spins a generator).' },
            { id: 'd', text: 'It doesn\'t need power — it\'s passive like a thermistor.' }
        ],
        explain: 'A 2-wire (loop-powered) transmitter is clever: it sits in series in the current loop and regulates how much current flows — 4 mA minimum, up to 20 mA — and that same current is what runs its electronics. The minimum is 4 mA partly because the device needs <em>some</em> current just to stay alive, which is another reason the zero is "live." But it only works if the loop actually has a DC supply in it; if the controller\'s input is passive (no loop power) you must add an external 24 VDC supply, or nothing reads. A <strong>3-wire</strong> transmitter takes separate power and signal conductors instead.',
        learnMore: { href: '/education/controller-wiring.html#inputs', label: 'Controller Wiring — inputs & loop power' },
        tags: ['field-wiring-sensors', 'wiring', 'loop-power']
    },

    // ── Wiring: shield grounding (gotcha) ─────────────────
    {
        type: 'gotcha',
        id: 'shield-ground-one-end',
        prompt: 'A tech lands a shielded analog cable and bonds the drain/shield to ground at BOTH the panel end and the field-device end, figuring more grounding is better. The signal gets noisier. What\'s wrong?',
        snippet: '<pre class="quiz-snippet">panel end:  shield → ground  ✓\nfield end:  shield → ground  ✓   ← both ends grounded\nsymptom:    analog value noisier than before</pre>',
        choices: [
            { id: 'a', text: 'Nothing — grounding both ends is the correct practice for shielded cable.' },
            { id: 'b', text: 'Grounding both ends lets a ground-loop current flow through the shield (if the two grounds sit at different potentials), and that current couples noise into the signal. Bond the shield at ONE end only.', correct: true },
            { id: 'c', text: 'The shield should never be grounded at all.' },
            { id: 'd', text: 'The drain wire is too small to carry ground current.' }
        ],
        explain: 'A shield works by giving interference a path to ground, but it should be grounded at <strong>one end only</strong> — conventionally the panel/controller end. Ground both ends and, if those two ground points sit at even slightly different potentials (they usually do across a building), a current flows along the shield itself. That ground-loop current is exactly the noise source the shield was supposed to block, now coupled straight onto your signal pair. Land the drain at the panel, tape back the shield at the device, and the loop is broken.',
        learnMore: { href: '/education/controller-wiring.html#power', label: 'Controller Wiring — power & the shared common' },
        tags: ['field-wiring-sensors', 'wiring', 'shielding', 'noise']
    },

    // ── Wiring: sourcing vs sinking DI ────────────────────
    {
        type: 'mcq',
        id: 'sourcing-sinking-input',
        prompt: 'A binary input won\'t change state no matter what the field contact does. The wiring is continuous. What\'s the most likely configuration mistake?',
        choices: [
            { id: 'a', text: 'The contact is wired to a sourcing input but the controller expects sinking (or vice-versa) — the input\'s common reference is on the wrong side.', correct: true },
            { id: 'b', text: 'The contact needs to be a normally-open type, never normally-closed.' },
            { id: 'c', text: 'Binary inputs can\'t read dry contacts.' },
            { id: 'd', text: 'The input needs a 4-20 mA transmitter to function.' }
        ],
        explain: 'A digital input detects a circuit being completed, but it matters <em>which way the current is meant to flow</em>. A <strong>sinking</strong> input expects the field device to pull the terminal toward the common/0 V rail; a <strong>sourcing</strong> input expects it pulled toward the supply. Wire a dry contact against the input\'s expected polarity — or land the input\'s common on the wrong rail — and the contact closes but the input never sees the transition it\'s looking for. Check the controller\'s input-wiring diagram for which side the shared common belongs on; many inputs are jumper- or config-selectable.',
        learnMore: { href: '/education/controller-wiring.html#inputs', label: 'Controller Wiring — inputs' },
        tags: ['field-wiring-sensors', 'wiring', 'binary-input']
    },

    // ── Sensors: failure mode reasoning ───────────────────
    {
        type: 'mcq',
        id: 'thermistor-open-vs-short',
        prompt: 'A controller input is set up for a 10K thermistor with the curve mapped so cold = high resistance. The wire to the sensor is cut clean (open circuit). Which way does the displayed temperature go?',
        choices: [
            { id: 'a', text: 'It reads a plausible mid-range value.' },
            { id: 'b', text: 'It pins to the cold extreme — an open looks like infinite resistance, and on a 10K curve high resistance means cold.', correct: true },
            { id: 'c', text: 'It pins to the hot extreme.' },
            { id: 'd', text: 'It reads exactly 0°.' }
        ],
        explain: 'A 10K thermistor\'s resistance rises as it gets colder, so an <strong>open</strong> circuit (effectively infinite ohms) drives the reading to the <em>cold</em> rail — a sensor showing −40°F outside on a mild day is the classic "cut wire / loose terminal" signature, not real weather. A <strong>shorted</strong> sensor (near-zero ohms) does the opposite and pins <em>hot</em>. Knowing which rail a fault drives toward lets you read the failure direction off the value: extreme cold ⇒ suspect open, extreme hot ⇒ suspect short. (A 0-10 V or 4-20 mA sensor fails differently — that\'s the live-zero advantage in another question.)',
        learnMore: { href: '/tools/thermistor-calculator.html', label: 'Thermistor / RTD Calculator' },
        tags: ['field-wiring-sensors', 'sensors', 'failure-modes']
    }
];
