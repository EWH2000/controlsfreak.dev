// Question bank for the VFDs quiz, exposed to Nunjucks as
// `quizzes['vfds']`. Lives in _data/ so two consumers read one source:
// the page's inline JS (mounts the engine in the browser) and the
// FAQPage JSON-LD emitter in head.njk (indexable Q&A for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_vfds_* localStorage keys. Pairs with the VFDs lesson;
// learnMore hrefs deep-link its <h2> anchors.

module.exports = [
    // ── What a VFD is ──────────────────────────────────────
    {
        type: 'mcq',
        id: 'vfd-three-stages',
        prompt: 'A VFD has three power stages: rectifier, DC bus, inverter. Which stage actually sets the variable output frequency the motor runs on?',
        choices: [
            { id: 'a', text: 'The rectifier — it converts the incoming AC to DC.' },
            { id: 'b', text: 'The DC bus — it smooths and stores the DC.' },
            { id: 'c', text: 'The inverter — it switches the DC back into AC at whatever frequency the controller asks for.', correct: true },
            { id: 'd', text: 'All three set the frequency together.' }
        ],
        explain: 'Fixed-frequency line AC comes in, the rectifier turns it into DC, the DC bus smooths and stores it, and the inverter switches that DC into AC at the commanded frequency — lower frequency, slower motor. Inside, a wall of IGBTs does the switching thousands of times a second, but from a controls view all that matters is the parameter surface above it.',
        learnMore: { href: '/education/vfds.html#what', label: 'VFDs — What a VFD Is' },
        tags: ['vfd', 'drives']
    },
    {
        type: 'mcq',
        id: 'vfd-why-cube-law',
        prompt: 'Why did variable-speed drives take over from fixed-speed equipment with bypass dampers and three-way valves?',
        choices: [
            { id: 'a', text: 'They\'re quieter.' },
            { id: 'b', text: 'Energy: on centrifugal loads, power scales roughly as the cube of speed, so part-load savings are large.', correct: true },
            { id: 'c', text: 'They never need maintenance.' },
            { id: 'd', text: 'They eliminate the need for a controller.' }
        ],
        explain: 'For centrifugal equipment — fans, pumps, most compressors — required power scales roughly as the cube of speed. Slowing down a little saves a lot, so a drive pays for itself on the electric bill at part load. Better controllability is a nice side effect, but the cube law is the why.',
        learnMore: { href: '/education/vfds.html#cube-law', label: 'VFDs — The Cube Law' },
        tags: ['vfd', 'drives', 'cube-law']
    },
    {
        type: 'numeric',
        id: 'vfd-cube-law-calc',
        prompt: 'A centrifugal pump on a VFD is slowed to 50 % of rated speed. By the cube law, roughly what percent of rated power does it now draw?',
        answer: 12.5,
        tolerance: 1.5,
        unit: '%',
        explain: 'Power ≈ speed³, so at 50 % speed it\'s 0.5³ = 0.125 ≈ 13 % of rated power. (Real drives lose a few points to inverter and motor inefficiency, so the meter reads a bit higher — but the shape of the curve is what sells the drive.) At 80 % speed it\'s 0.8³ ≈ 51 %.',
        learnMore: { href: '/education/vfds.html#cube-law', label: 'VFDs — The Cube Law' },
        tags: ['vfd', 'drives', 'cube-law']
    },

    // ── Run command vs. speed reference ────────────────────
    {
        type: 'mcq',
        id: 'vfd-two-commands',
        prompt: 'To make a VFD run a motor you actually give it two separate commands, each with its own independently-configured source parameter. What are the two?',
        choices: [
            { id: 'a', text: 'A run command (on/off) and a speed reference (how fast).', correct: true },
            { id: 'b', text: 'A voltage setpoint and a current limit.' },
            { id: 'c', text: 'A forward command and a reverse command.' },
            { id: 'd', text: 'An accel ramp and a decel ramp.' }
        ],
        explain: 'Run command = should it be running right now (on/off); speed reference = how fast (the frequency). Each has its own source parameter — keypad, terminal digital/analog input, or network — set independently. Treating them as one thing is the mistake that catches more techs than anything else about drives.',
        learnMore: { href: '/education/vfds.html#run-vs-speed', label: 'VFDs — Run Command vs. Speed Reference' },
        tags: ['vfd', 'drives', 'run-speed']
    },
    {
        type: 'gotcha',
        id: 'vfd-wont-run-from-bms',
        prompt: 'The BMS is writing 30 Hz to the drive\'s speed-reference object, the device readout confirms 30 Hz — and the drive just sits there, not running. The motor and wiring are fine. What\'s wrong?',
        snippet: '<pre class="quiz-snippet">speed-ref source:  network  (BMS writing 30 Hz ✓)\nrun-source:        terminals  (factory default)\nDI run terminal:   open, nothing wired\nresult:            drive does not run</pre>',
        choices: [
            { id: 'a', text: 'The speed reference is too low; raise it above the minimum frequency.' },
            { id: 'b', text: 'The run-source parameter is still set to "terminals" from the factory, so the network speed reference is accepted but there\'s no run command. Point the run-source at the network too.', correct: true },
            { id: 'c', text: 'BACnet can\'t command a drive; use Modbus.' },
            { id: 'd', text: 'The drive is faulted.' }
        ],
        explain: 'Two parameters, and only one was changed. The speed-reference source points at the network (so 30 Hz writes through), but the run-source parameter is still "terminals," waiting for a hardwired digital-input run signal that nobody landed. Setting the speed reference is necessary, not sufficient — when a drive "won\'t run from the BMS," the first two parameters to check are both source parameters.',
        learnMore: { href: '/education/vfds.html#run-vs-speed', label: 'VFDs — Run Command vs. Speed Reference' },
        tags: ['vfd', 'drives', 'run-speed', 'troubleshooting']
    },
    {
        type: 'tf',
        id: 'vfd-necessary-not-sufficient',
        prompt: 'Setting a drive\'s speed reference is necessary but not sufficient to make it run — the run command has to be coming from the source you expect, too.',
        answer: true,
        explain: 'True. A clean speed-reference write means nothing if the run-source parameter points somewhere there\'s no run signal. The two source parameters are configured independently, so commissioning a drive "from the BMS" means pointing both of them at the network — not just the speed reference.',
        learnMore: { href: '/education/vfds.html#run-vs-speed', label: 'VFDs — Run Command vs. Speed Reference' },
        tags: ['vfd', 'drives', 'run-speed']
    },

    // ── Network integration ────────────────────────────────
    {
        type: 'mcq',
        id: 'vfd-run-status-feedback',
        prompt: 'Of the three everyday network points on a drive — run command, speed reference, run status — which one should you trust to know the drive actually started?',
        choices: [
            { id: 'a', text: 'Run command — it\'s the value you wrote.' },
            { id: 'b', text: 'Speed reference — if it\'s non-zero the drive is running.' },
            { id: 'c', text: 'Run status — the binary the drive reports back, which is the only one that reflects reality.', correct: true },
            { id: 'd', text: 'Any of the three; they always agree.' }
        ],
        explain: 'Run command and speed reference are setpoints the BMS writes — they say what you asked for, not what happened. Run status is the feedback the drive reports back, and it\'s the only one that tells you the drive actually started. Never trust the BMS\'s own "I just sent the run command" view; read the status back.',
        learnMore: { href: '/education/vfds.html#network', label: 'VFDs — Network Integration' },
        tags: ['vfd', 'drives', 'network']
    },

    // ── Fault codes ────────────────────────────────────────
    {
        type: 'gotcha',
        id: 'vfd-overvoltage-decel',
        prompt: 'A drive on a high-inertia fan trips on DC-bus overvoltage every time it ramps down quickly to a stop. Incoming line voltage is normal. What\'s the cause?',
        snippet: '<pre class="quiz-snippet">fault:        overvoltage (DC bus)\nwhen:         on fast decel to stop\nline voltage: normal\nload:         high-inertia fan</pre>',
        choices: [
            { id: 'a', text: 'The accel ramp is too steep.' },
            { id: 'b', text: 'The decel ramp is too steep — the spinning load regenerates into the DC bus faster than it can absorb, so bus voltage climbs past the trip. Lengthen the decel time (or add a brake resistor).', correct: true },
            { id: 'c', text: 'The motor data is wrong.' },
            { id: 'd', text: 'The cooling fan has failed.' }
        ],
        explain: 'When you decelerate a spinning load faster than it wants to coast down, the motor acts as a generator and pushes energy back into the DC bus, driving its voltage above the trip threshold. The fix is a longer decel ramp so the energy bleeds off gently, or a brake resistor / regenerative front end to dump it. Overcurrent and wrong motor data are accel-side / startup causes, not this decel-to-stop signature.',
        learnMore: { href: '/education/vfds.html#fault-codes', label: 'VFDs — Fault Codes' },
        tags: ['vfd', 'drives', 'faults', 'troubleshooting']
    },
    {
        type: 'mcq',
        id: 'vfd-undervoltage-cause',
        prompt: 'A drive trips on DC-bus undervoltage. Which is the typical cause?',
        choices: [
            { id: 'a', text: 'The decel ramp regenerating into the bus.' },
            { id: 'b', text: 'Incoming line voltage low or dropping out — a brownout, a loose power connection, or a building voltage sag on a big motor start.', correct: true },
            { id: 'c', text: 'A short circuit in the motor cable.' },
            { id: 'd', text: 'The heatsink overheating.' }
        ],
        explain: 'Undervoltage is a supply-side story: the DC bus sagged below its trip threshold because the incoming line dropped — brownout, loose connection, or a sag when a big motor starts nearby. (Overvoltage is the opposite: too-steep decel or high incoming line. A short circuit is overcurrent; an overheating heatsink is drive overtemp.) Knowing the six fault categories lets you read any brand\'s codes even when the integer differs.',
        learnMore: { href: '/education/vfds.html#fault-codes', label: 'VFDs — Fault Codes' },
        tags: ['vfd', 'drives', 'faults']
    },
    {
        type: 'tf',
        id: 'vfd-autoreset-fault',
        prompt: 'A drive that auto-resets and trips again on the same fault every few minutes can be safely left alone as long as it keeps restarting.',
        answer: false,
        explain: 'False. A drive cycling through a fault every few minutes is telling you something is still wrong — reading the fault category and fixing the root cause is the difference between solving the problem and burning the motor. Auto-reset clears the alarm; it does not fix what tripped it.',
        learnMore: { href: '/education/vfds.html#fault-codes', label: 'VFDs — Fault Codes' },
        tags: ['vfd', 'drives', 'faults']
    }
];
