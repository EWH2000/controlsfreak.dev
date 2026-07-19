// Question bank for the Commanding Actuators quiz, exposed to Nunjucks
// as `quizzes['commanding-actuators']`. Lives in _data/ so two consumers
// read one source: the page's inline JS (mounts the engine in the
// browser) and the FAQPage JSON-LD emitter in head.njk.
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_commanding-actuators_* localStorage keys. Pairs with the
// Commanding Actuators lesson; learnMore hrefs deep-link its <h2>
// anchors. Sequential order is the lesson walk: command spans →
// direction & fail posture → feedback & floating, gotcha capstone.
//
// Deliberate scope split: the controller-wiring bank owns the
// LANDING side of the same devices — the 3-wire power/signal/common
// trap (`ao-signal-not-power`) and how a floating actuator is wired
// (`floating-actuator-triacs`). This bank stays on BEHAVIOR — what
// the actuator does with a landed, powered signal: span math,
// direction, fail posture, feedback disagreement, floating drift and
// re-sync. Don't drift questions across that line when editing
// either bank.

module.exports = [
    // ── Command spans ─────────────────────────────────────
    {
        type: 'numeric',
        id: 'span-math-five-volts',
        prompt: 'A controller AO scaled 0-100% → 0-10 V puts out 5.0 V. The damper actuator on the other end is configured for a 2-10 V input, direct acting. What stroke does the actuator drive to, in percent?',
        answer: 37.5,
        tolerance: 0.5,
        unit: '%',
        explain: 'The actuator only knows <em>its own</em> span: stroke = (5.0 − 2) ÷ (10 − 2) = <strong>37.5%</strong>. The controller\'s 50% never arrives — the 2 V offset at the bottom of the actuator\'s range eats an eighth of the signal, and no amount of clean wiring fixes arithmetic. This is THE span-mismatch number: the graphics say 50, the damper sits at 37.5, and both devices are working perfectly. You can replicate it in the Signal Scaling tool — signal type 2–10 V, signal value 5, engineering range 0 to 100.',
        learnMore: { href: '/education/commanding-actuators.html#command-spans', label: 'Commanding Actuators — the command spans' },
        tags: ['signals', 'commanding-actuators', 'spans']
    },
    {
        type: 'numeric',
        id: 'span-math-fifty-percent',
        prompt: 'Same actuator — 2-10 V input, direct acting. What voltage does the AO have to put on the wire to land the actuator at exactly 50% stroke, in volts?',
        answer: 6,
        tolerance: 0.1,
        unit: 'V',
        explain: 'Run the span forward: signal = 2 + 0.5 × (10 − 2) = <strong>6.0 V</strong>. On an AO scaled 0–10 V that\'s a <em>60%</em> command — the offset never cancels; it just moves to whichever side you solve from. This is the same reverse calculation the Signal Scaling tool\'s Eng. Units → Signal tab does, and the reason a mismatched pair tracks all day while every number on the graphics sits shifted.',
        learnMore: { href: '/education/commanding-actuators.html#command-spans', label: 'Commanding Actuators — the command spans' },
        tags: ['signals', 'commanding-actuators', 'spans']
    },
    {
        type: 'mcq',
        id: 'why-2-10-exists',
        prompt: 'Why would a spec call for 2-10 V actuator inputs instead of plain 0-10 V?',
        choices: [
            { id: 'a', text: 'Live zero — 2 V is a real, alive "0%," so a dead wire (0 V) is distinguishable from an honest fully-closed command. And it\'s the voltage twin of 4-20 mA: a 500 Ω resistor across the loop gives exactly 2-10 V.', correct: true },
            { id: 'b', text: 'A 2-10 V signal draws less current, so it can share smaller-gauge wire over longer runs.' },
            { id: 'c', text: 'Spring-return actuators need the constant 2 V floor to keep the spring wound.' },
            { id: 'd', text: 'The narrower span gives finer positioning resolution than 0-10 V.' }
        ],
        explain: 'Both reasons live at the bottom of the span. A <strong>live zero</strong> means "no signal" and "command 0%" are different voltages, so a broken conductor announces itself instead of quietly closing the damper. And 4 mA × 500 Ω = 2 V, 20 mA × 500 Ω = 10 V — the 2–10 V span is what a 4–20 mA loop looks like across a 500 Ω resistor, which is why so many actuators list both on one input. The distractors invert reality: a voltage signal\'s current draw doesn\'t meaningfully change with the span, springs are wound by the motor (not the signal), and a <em>narrower</em> span spread over the same stroke gives slightly coarser volts-per-percent, not finer.',
        learnMore: { href: '/education/commanding-actuators.html#command-spans', label: 'Commanding Actuators — the command spans' },
        tags: ['signals', 'commanding-actuators', 'spans']
    },
    {
        type: 'mcq',
        id: 'whole-floor-sits-low',
        prompt: 'Every reheat valve on the floor tracks its command — moves when the command moves — but each one sits visibly below where the graphics say, all day. Near-closed commands do nothing at all, then the loops hunt. Most likely cause?',
        choices: [
            { id: 'a', text: 'A span mismatch — AOs scaled 0-10 V driving actuators configured (or factory-defaulted) to 2-10 V. The offset shifts every position low, and commands below 2 V fall in a dead zone the loops wind up through.', correct: true },
            { id: 'b', text: 'Undersized actuators — the motors stall against the valve springs before full stroke.' },
            { id: 'c', text: 'PID gains are too hot on every loop — retune each one with more proportional band.' },
            { id: 'd', text: 'Supply water pressure is forcing the valves partly closed against their motors.' }
        ],
        explain: 'Read the pattern, not the point: <em>one</em> device sitting low is a hardware suspect; a <em>whole floor</em> sitting low the same way is a configuration. A 0–10 V command into a 2–10 V input lands every position at (V − 2)/8 — offset low everywhere — and every command under 2 V says the same thing: nothing. The loop pushes into that silence, the integral winds, and when the signal finally crosses 2 V the valve jumps — hunting near the end of travel, exactly where mismatched spans always hunt. Stalled motors and pressure problems don\'t produce a clean, consistent offset, and retuning loops to compensate for arithmetic just buries the real fault. Check the actuator\'s span DIP against the AO scaling first.',
        learnMore: { href: '/education/commanding-actuators.html#command-spans', label: 'Commanding Actuators — the command spans' },
        tags: ['signals', 'commanding-actuators', 'spans', 'diagnosis']
    },

    // ── Direction & fail posture ──────────────────────────
    {
        type: 'mcq',
        id: 'actuator-direction-vs-loop-action',
        prompt: 'A damper actuator has a direct/reverse (CW/CCW) switch on its body. Your PID loop configuration also has a direct/reverse-acting setting. Same setting in two places?',
        choices: [
            { id: 'a', text: 'No — the actuator switch maps signal to stroke (does 10 V mean open or closed); the loop\'s action is which way the controller\'s output moves as the measurement rises. Different layers, different problems.', correct: true },
            { id: 'b', text: 'Yes — they\'re the same inversion, so flip whichever one is easier to reach.' },
            { id: 'c', text: 'The loop setting is transmitted down the 0-10 V wire, so the actuator switch is ignored when a controller is attached.' },
            { id: 'd', text: 'The actuator switch only matters on floating actuators, where it swaps the open and close windings.' }
        ],
        explain: 'An analog wire carries a <em>level</em>, not a meaning — nothing about the loop\'s configuration travels down it. The actuator\'s switch answers "which end of my stroke is 10 V?"; the loop\'s action answers "when the temperature rises, should my output rise or fall?" — that one is PID Basics\' ground. Flipping either inverts motion, and flipping <em>both</em> cancels out: the loop appears to control correctly while every position readout is backwards. That\'s why "flip whichever is easier" is the trap answer — fix the mapping at the layer that\'s actually wrong, or the graphics lie forever after.',
        learnMore: { href: '/education/commanding-actuators.html#direction-and-fail', label: 'Commanding Actuators — direction and fail posture' },
        tags: ['signals', 'commanding-actuators', 'direction']
    },
    {
        type: 'mcq',
        id: 'no-hot-water-valve-power-loss',
        prompt: 'An AHU\'s hot-water heating valve is specified as normally open (NO), spring return. The building loses power on a January night. What does the valve do — and why was it specified that way?',
        choices: [
            { id: 'a', text: 'The spring drives it fully open — hot water floods the coil so freezing air in the dead unit can\'t burst the tubes. The fail posture was chosen for the failure, not for normal operation.', correct: true },
            { id: 'b', text: 'It closes — with no occupants calling for heat, the design conserves boiler water during an outage.' },
            { id: 'c', text: 'It holds its last position — "normally open" describes where it usually operates during the day.' },
            { id: 'd', text: 'Nothing happens until the controller commands it — the valve waits for the BMS to restart.' }
        ],
        explain: '<em>Normally</em> means the position with <strong>no power and no signal</strong> — the spring position — not "the usual position." With power gone the controller is gone too, which is exactly why the answer has to be mechanical: the spring opens the valve, the coil fills with hot water, and the freezing outdoor air that\'s left in the cabinet has nothing it can burst. The outdoor-air damper makes the mirror-image choice — spring <em>closed</em>, stop feeding cold air in. The cost of an NO heating valve is a possibly overheated space during the outage; the cost of the alternative is a burst coil and a flooded mechanical room. Fail posture is a design decision made for the worst five minutes of the year.',
        learnMore: { href: '/education/commanding-actuators.html#direction-and-fail', label: 'Commanding Actuators — direction and fail posture' },
        tags: ['signals', 'commanding-actuators', 'fail-posture']
    },
    {
        type: 'tf',
        id: 'fail-position-set-in-software',
        prompt: 'The fail position of a spring-return actuator is a software setting — change the controller\'s program and you change where the damper lands on power loss.',
        answer: false,
        explain: 'It\'s mechanical. The spring winds one way as the motor strokes, and it unwinds to its end of travel precisely when the electronics — controller, program, and all — are gone. That\'s the entire point: the fail posture is the one behavior that must survive the death of the software, so it can\'t live there. It\'s chosen when the hardware is selected and mounted (and for a valve, by which port the spring closes against). The nearest true version of the claim: some electronic-fail-safe actuators — capacitor-backed, no spring — do have a <em>configurable</em> fail position, but that\'s set on the actuator itself, still not in the controller\'s program.',
        learnMore: { href: '/education/commanding-actuators.html#direction-and-fail', label: 'Commanding Actuators — direction and fail posture' },
        tags: ['signals', 'commanding-actuators', 'fail-posture']
    },

    // ── Feedback & floating ───────────────────────────────
    {
        type: 'mcq',
        id: 'feedback-disagrees-fork',
        prompt: 'You command a damper to 50% and its position-feedback AI reads 34%. What\'s the right order of checks?',
        choices: [
            { id: 'a', text: 'Wait a full stroke time (90-150 s is ordinary) — if it\'s still climbing, that\'s transit. Then verify the span/scaling on both the feedback output and the AI. Only then go after mechanics — jam, seized stem, stalled motor.', correct: true },
            { id: 'b', text: 'Condemn the actuator — any disagreement between command and feedback means the motor is failing.' },
            { id: 'c', text: 'Force the AO to 100%; if the feedback moves at all, the actuator is fine and the 34% was a graphics glitch.' },
            { id: 'd', text: 'Ignore it — position feedback is a reference signal and routinely reads 15-20 points off by design.' }
        ],
        explain: 'Work the fork in order of cheapness: <strong>time → configuration → mechanics</strong>. Actuators are slow on purpose, so a fresh command and its feedback disagree for a while by design. Next, the feedback is a scaled signal like any other — a 2–10 V feedback landed on an AI scaled 0–10 V misreports a perfectly healthy actuator, the same span arithmetic as the command side running in reverse. Feedback that stops short and <em>holds</em> while the command climbs is the mechanical tell — something physically can\'t get there. And remember the inverse: command and feedback agreeing while the temperature never moves points at a slipped linkage — the actuator turns, the shaft doesn\'t. Healthy feedback doesn\'t read "15–20 points off"; that folklore just hides real faults.',
        learnMore: { href: '/education/commanding-actuators.html#feedback-and-floating', label: 'Commanding Actuators — position feedback' },
        tags: ['signals', 'commanding-actuators', 'feedback', 'diagnosis']
    },
    {
        type: 'mcq',
        id: 'floating-morning-full-travel',
        prompt: 'A floating-actuator damper drives fully closed every morning at schedule start, then reopens to its normal position. The mechanic wants to replace "the failing actuator." What\'s actually happening?',
        choices: [
            { id: 'a', text: 'Re-synchronization. A floating actuator reports no position — the controller estimates it from run time, the estimate drifts, and overdriving to a hard stop re-zeroes the count. Designed behavior, not a fault.', correct: true },
            { id: 'b', text: 'The spring return is briefly engaging at every schedule transition — the spring needs replacement.' },
            { id: 'c', text: 'Triac leakage drives the actuator closed until the outputs warm up each morning.' },
            { id: 'd', text: 'The morning ventilation purge requires all dampers proven closed before the fan starts.' }
        ],
        explain: 'A floating actuator is command without position: two outputs inch it open and closed, and the controller\'s "position" is arithmetic — seconds driven versus stroke time. Pulses round off, power blips restart the count, manual cranks never report themselves, so assumed and actual position walk apart. The cure is built in: periodically overdrive toward one end for longer than the full stroke, land on a hard stop the controller can trust as 0%, and start the count clean. Schedule start is the classic moment. Drift is the disease, the morning full-travel drive is the medicine — and neither one is a broken actuator. (How the two triacs are landed is the wiring lesson\'s ground.)',
        learnMore: { href: '/education/commanding-actuators.html#feedback-and-floating', label: 'Commanding Actuators — floating actuators' },
        tags: ['signals', 'commanding-actuators', 'floating']
    },

    // ── Gotcha capstone ───────────────────────────────────
    {
        type: 'gotcha',
        id: 'dip-span-sits-high',
        prompt: 'A space overcools all night. The graphics show the outdoor-air damper commanded to 0% — but it\'s visibly cracked open. The config sheet reads:',
        snippet: '<pre class="quiz-snippet">ACTUATOR (OA damper, direct acting)\n  DIP 1  input span   [ 0-10 V ]   &larr; factory default\n  DIP 2  direction    [ CW / direct ]\nCONTROLLER\n  AO1 scaling         2-10 V  (0-100%)\ncommand 0% &rarr; damper sits ~20% open, never closes</pre>',
        choices: [
            { id: 'a', text: 'The spans are crossed the other way around: the AO\'s "0%" is 2 V, and a 0-10 V actuator reads 2 V as 20% stroke. Match the spans — flip DIP 1 to 2-10 V (or rescale the AO) — and 0% closes the damper.', correct: true },
            { id: 'b', text: 'DIP 2 is backwards — flip the actuator to reverse acting so the damper closes at 0%.' },
            { id: 'c', text: 'The damper linkage is out of adjustment — re-stroke the blades to the actuator.' },
            { id: 'd', text: 'The actuator has failed with its spring partially wound and should be replaced.' }
        ],
        explain: 'The lesson\'s worked example, mirrored. There the actuator had the offset span and everything sat <em>low</em>; here the <em>controller</em> speaks 2–10 V into an actuator listening on 0–10 V, so the lowest voltage the AO ever produces — 2 V at "0%" — reads as 20% stroke, and the damper physically cannot close from the signal side. Same arithmetic, opposite side, opposite symptom. Flipping the direction DIP would make 0% close it — and 100% would then close it too; it inverts the whole map instead of removing the offset. The linkage and the spring are innocent: a damper that holds a clean, consistent 20% at "closed" is doing exactly what its input tells it. Fix the agreement, not the hardware.',
        learnMore: { href: '/education/commanding-actuators.html#command-spans', label: 'Commanding Actuators — the command spans' },
        tags: ['signals', 'commanding-actuators', 'spans', 'gotcha']
    }
];
