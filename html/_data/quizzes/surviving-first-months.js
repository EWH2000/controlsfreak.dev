// Question bank for the Surviving Your First Months field drill,
// exposed to Nunjucks as `quizzes['surviving-first-months']`. See the
// sibling modbus-decoding.js header for the data-vs-template rationale.

module.exports = [
    // ── Safety: LOTO + verify dead ────────────────────────
    {
        type: 'mcq',
        id: 'loto-verify-dead',
        prompt: 'You need to land a wire inside the disconnect on a packaged RTU. The right sequence is:',
        choices: [
            { id: 'a', text: 'Open the disconnect, verify the conductors are dead with a meter, do the work.' },
            { id: 'b', text: 'Open the disconnect, lock it out, verify the meter on a <em>known-live</em> circuit first, verify the conductors dead, then do the work.', correct: true },
            { id: 'c', text: 'Tell the GC the equipment is off; they\'ll deal with it.' },
            { id: 'd', text: 'Pull the breaker only at the main electrical panel — disconnects are belt-and-suspenders.' }
        ],
        explain: 'The OSHA LOTO sequence is <strong>open → lock → verify the meter on a known-live source → verify the conductors dead</strong>. The known-live step is the one juniors skip and the one that bites: if the meter is broken, a dead reading on dead conductors will lie to you and look identical to a dead reading on live conductors. Verifying the meter against a circuit you know is hot first is what catches a broken meter before it kills somebody.',
        tags: ['safety', 'loto']
    },

    // ── Sensors: 4-20 mA live zero ────────────────────────
    {
        type: 'mcq',
        id: 'live-zero-wire-break',
        prompt: 'An outdoor-air-temperature sensor is wired as a 4-20 mA loop. The controller reads exactly <code>0 mA</code>. Most likely cause:',
        choices: [
            { id: 'a', text: 'The sensor is reading the bottom of its calibrated range.' },
            { id: 'b', text: 'The loop wiring is broken, the sensor isn\'t powered, or the loop has no return path.', correct: true },
            { id: 'c', text: 'The sensor needs to be recalibrated.' },
            { id: 'd', text: 'The controller\'s analog input is configured for 0-10V.' }
        ],
        explain: '4-20 mA uses a <em>live zero</em>. A sensor reading 0% of its calibrated range produces <code>4 mA</code>, not <code>0 mA</code>. A wire break, lost loop power, or an open terminal produces <code>0 mA</code> — and the controller can tell the difference. That\'s the whole reason 4-20 mA beats 0-10 V on a field run: a broken wire reads as a fault, not as a plausible-but-wrong measurement.',
        learnMore: { href: '/education/controller-wiring.html#inputs', label: 'Controller Wiring — inputs & loop power' },
        tags: ['sensors', '4-20mA']
    },

    // ── Tools: DMM continuity mode ────────────────────────
    {
        type: 'mcq',
        id: 'dmm-continuity-mode',
        prompt: 'You need to verify that a control wire between two terminal blocks isn\'t broken. The right DMM setting:',
        choices: [
            { id: 'a', text: 'DC voltage.' },
            { id: 'b', text: 'Resistance, low range.' },
            { id: 'c', text: 'Continuity (the beeper icon).', correct: true },
            { id: 'd', text: 'Capacitance.' }
        ],
        explain: 'Continuity mode pushes a small test current through the leads and <em>beeps</em> when resistance is low enough to count as "continuous" (typically under ~50 Ω). You get an audible confirmation without looking at the screen — the right ergonomic for tracing wires in a panel when your eyes are on the conductors and one hand is on a ladder. Resistance mode works too, but you have to glance at the screen. Slower, and you lose the foot-on-ladder advantage.',
        tags: ['tools', 'dmm']
    },

    // ── Electrical: 24VAC convention vs polarity ──────────
    {
        type: 'tf',
        id: '24vac-polarity',
        prompt: 'On a 24VAC control circuit, the <code>R</code> and <code>C</code> terminals on the transformer must be wired with <code>R</code> as positive and <code>C</code> as negative.',
        answer: false,
        explain: '24V<em>AC</em> alternates — the voltage reverses 60 times a second, so there\'s no fixed positive or negative. <code>R</code> (red, hot) and <code>C</code> (black/blue, common) are <em>panel conventions</em>, not polarity. Common is the leg bonded to ground at the transformer; hot is the switched leg. On a single controller with its own transformer, cross-wiring won\'t damage anything — the swap is electrically symmetric — but it breaks the convention every other tech expects and makes future troubleshooting a nightmare. Scope matters, though: the moment that controller shares a transformer or a common wire with a device referenced the other way, the crossed commons bridge the two secondary legs — a dead short. Respect the convention. (24V<em>DC</em> equipment, by contrast, <em>is</em> polarity-sensitive — and there the labels matter literally.)',
        learnMore: { href: '/education/controller-wiring.html#power', label: 'Controller Wiring — power & the shared common' },
        tags: ['electrical', '24vac']
    },

    // ── Panel anatomy: control transformer primary ────────
    {
        type: 'mcq',
        id: 'panel-transformer-primary',
        prompt: 'What\'s the most common power source for a small BAS control panel\'s 24VAC transformer?',
        choices: [
            { id: 'a', text: '480V three-phase, stepped directly to 24VAC.' },
            { id: 'b', text: '120V single-phase, stepped to 24VAC.', correct: true },
            { id: 'c', text: '277V single-phase off the lighting branch.' },
            { id: 'd', text: '12VDC from a wall-wart adapter.' }
        ],
        explain: 'The dominant pattern: a dedicated 120V circuit (often labeled "BMS" or "controls" on the panel schedule) feeds the BAS panel, and a small VA-class transformer inside the panel steps that down to 24VAC for the field side. You\'ll occasionally see direct 480V → 24V transformers on packaged equipment, and 277V → 24V on some commercial setups — but a 120V primary is by far the most common in BAS work.',
        learnMore: { href: '/education/controller-wiring.html#power', label: 'Controller Wiring — power & the shared common' },
        tags: ['panel', 'electrical']
    },

    // ── Workflow: photo before changing ───────────────────
    {
        type: 'tf',
        id: 'photo-before-changing',
        prompt: 'Before disconnecting a wire on a panel that\'s been working for years, you should photograph the existing wiring.',
        answer: true,
        explain: 'Always. Photo of the existing landing, photo of the new landing. It takes ten seconds, costs nothing, and saves the future-you (or the next tech) from staring at a half-changed panel wondering what the original looked like. Memory and notes degrade fast on a busy job; the photo doesn\'t. The phone in your pocket is the cheapest piece of test equipment you own.',
        tags: ['workflow']
    },

    // ── Equipment: VFD whine ──────────────────────────────
    {
        type: 'mcq',
        id: 'vfd-carrier-whine',
        prompt: 'A VFD on a fan motor makes an audible whine whose pitch <em>doesn\'t</em> change with the motor speed. What is it?',
        choices: [
            { id: 'a', text: 'Motor bearings are failing — schedule a replacement.' },
            { id: 'b', text: 'The VFD\'s switching carrier frequency exciting the motor windings — normal, and sometimes adjustable via a carrier-frequency parameter on the drive.', correct: true },
            { id: 'c', text: 'Wrong supply voltage to the drive.' },
            { id: 'd', text: 'Static charge buildup in the line filter.' }
        ],
        explain: 'VFDs build their output sine wave by switching DC fast — typically 2-16 kHz. That switching frequency leaks into the motor windings as an audible tone (humans hear up to ~20 kHz). It\'s perfectly normal, and the pitch tracks the carrier-frequency parameter on the drive, NOT the output frequency — that\'s the giveaway. Many drives let you raise the carrier to quiet the motor at the cost of more heat in the drive. A bearing fault sounds rougher, less pure-tone, and tracks motor speed instead.',
        learnMore: { href: '/education/vfds.html', label: 'VFDs' },
        tags: ['vfd', 'equipment']
    },

    // ── Sensors: 10K thermistor at room temp ──────────────
    {
        type: 'numeric',
        id: 'thermistor-10k-room-temp',
        prompt: 'A 10K Type III thermistor at room temperature (about 77°F / 25°C) reads approximately how many ohms?',
        answer: 10000,
        tolerance: 500,
        unit: 'Ω',
        explain: 'The <strong>10K</strong> in the type name is the resistance at 25°C — that\'s the defining curve point. 10K Type II and Type III both hit exactly <code>10,000 Ω</code> at 25°C; they diverge at higher and lower temperatures. "Sensor at room temp reads ~10 kΩ" is the sanity check that tells you the sensor isn\'t dead before you bother running calibration math against the curve.',
        learnMore: { href: '/tools/thermistor-calculator.html', label: 'Thermistor / RTD Calculator' },
        tags: ['sensors', 'thermistors']
    },

    // ── Controls: setpoint ≠ actual ───────────────────────
    {
        type: 'tf',
        id: 'setpoint-vs-actual',
        prompt: 'A space-temperature setpoint of <code>72°F</code> means the controller will drive the room to <em>exactly</em> <code>72°F</code>.',
        answer: false,
        explain: 'The setpoint is a <em>target</em> the controller tries to maintain, not the value the room will sit at. Real sequences add a deadband (say <code>70-74°F</code>) so heating and cooling don\'t fight each other; the PID loop has a steady-state offset proportional to the load; and the sensor itself has noise. A space-temp reading of <code>73.5°F</code> at a <code>72°F</code> setpoint isn\'t a fault — it\'s a system doing its job. Setpoint chasers (techs trying to drive the actual to within <code>0.1°F</code> of setpoint) are usually fighting deadband and PID behavior, not solving anything.',
        learnMore: { href: '/education/pid-basics.html', label: 'PID Basics' },
        tags: ['controls', 'pid']
    },

    // ── Workflow: stuck — when to escalate ────────────────
    {
        type: 'mcq',
        id: 'stuck-escalation',
        prompt: 'You\'ve been on the same problem for two hours — the sequence reads correct in the controller, but the equipment isn\'t responding the way it should. The best next move:',
        choices: [
            { id: 'a', text: 'Stay solo — asking for help looks like you can\'t do the job.' },
            { id: 'b', text: 'Pause, write out what you\'ve checked and what you expect vs. what\'s happening, then call your senior or open the project submittals.', correct: true },
            { id: 'c', text: 'Tell the customer there\'s nothing you can do and step away.' },
            { id: 'd', text: 'Reboot the controller and retry — sometimes that fixes it.' }
        ],
        explain: 'Two hours on a stuck problem is the budget — past that, the odds of solving it solo without new information drop fast. Writing out what you\'ve checked is itself a debugging move: rubber-ducking surfaces assumptions you didn\'t realize you were making. Senior techs would <em>much</em> rather hear from you at hour 2 than at hour 8 — that\'s when they have time to help, instead of running damage control on a missed deadline. Reboot-and-retry without new information is the antipattern; you\'ll burn another two hours doing the same wrong thing.',
        tags: ['workflow', 'escalation']
    }
];
