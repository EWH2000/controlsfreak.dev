// Question bank for the Status & Proof quiz, exposed to Nunjucks as
// `quizzes['status-and-proof']`. Lives in _data/ so two consumers read
// one source: the page's inline JS (mounts the engine in the browser)
// and the FAQPage JSON-LD emitter in head.njk.
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_status-and-proof_* localStorage keys. Pairs with the
// Status & Proof lesson; learnMore hrefs deep-link its <h2> anchors.
// Sequential order is the lesson walk: the status-source menu →
// proof logic → binary fault signatures (the gotcha closes as the
// capstone).
//
// Deliberate scope split: controller-wiring owns the LANDINGS (shared
// COM, wetting current, wet vs dry contacts, LOOP+); the
// field-wiring-sensors drill owns sensor curves, scaling math,
// shielding, and sourcing/sinking. This bank stays on WHAT A STATUS
// POINT PROVES and the command-vs-status logic — which source proves
// what, the broken-belt verdicts, trip points, proof windows, and the
// binary fault signatures. Don't drift questions across those lines
// when editing any of the three banks.

module.exports = [
    // ── The status-source menu ────────────────────────────
    {
        type: 'mcq',
        id: 'aux-contact-proves',
        prompt: 'A supply fan\'s status point is wired to the starter\'s auxiliary contact. The graphic shows the fan ON. Which of these has actually been proven?',
        choices: [
            { id: 'a', text: 'That the contactor closed — the aux contact rides the starter armature, so it confirms the power poles pulled in and nothing more: not amps, not the belt, not airflow.', correct: true },
            { id: 'b', text: 'That the motor is drawing current — closed poles mean current is flowing.' },
            { id: 'c', text: 'That air is moving — the aux contact only closes once the fan builds pressure.' },
            { id: 'd', text: 'Nothing — an aux contact just echoes the software command back into a BI.' }
        ],
        explain: 'The aux contact is a spare contact ganged to the contactor\'s armature: coil pulls in, poles close, aux closes with them. It proves a real hardware fact — <strong>the starter answered</strong> — which already catches a dead coil, a blown control fuse, or a switch left OFF, so it\'s one honest step above echoing the command (that\'s why "nothing" is wrong). But its knowledge stops at the contactor: an open motor lead or a failed winding draws nothing behind perfectly closed poles, and a snapped belt moves no air behind a perfectly running motor. Contactor closed ≠ motor drawing amps ≠ air moving — the aux proves only the first claim.',
        learnMore: { href: '/education/status-and-proof.html#sap-sources', label: 'Status & Proof — the status-source menu' },
        tags: ['signals', 'status-and-proof', 'status-sources']
    },
    {
        type: 'mcq',
        id: 'heater-interlock-source',
        prompt: 'A sequence interlocks an electric duct heater so it can never run without airflow. Which status source actually proves the condition that interlock cares about?',
        choices: [
            { id: 'a', text: 'A DP or paddle switch across the fan — it senses the moving air itself, which is the delivered effect the heater interlock needs proven.', correct: true },
            { id: 'b', text: 'The starter auxiliary contact — if the contactor is closed, the fan is running.' },
            { id: 'c', text: 'A current switch on the motor lead — amps mean the motor is turning, and a turning motor means air.' },
            { id: 'd', text: 'The fan\'s own BO command point — commanded ON is proof enough for an interlock.' }
        ],
        explain: 'Each rung of the status ladder proves more than the one below it: a command proves only intent, an aux contact proves the starter answered, a current switch proves electrical work at the motor — and only the air-side switch proves <strong>air</strong>. For an interlock protecting a heater that cooks itself (or trips its high limit) without airflow, every proxy upstream of the air has a failure mode that defeats it: the broken belt leaves a drawing motor and a dead duct, so "amps means air" is exactly the assumption the belt breaks. Prove the thing the interlock actually needs — the moving air.',
        learnMore: { href: '/education/status-and-proof.html#sap-sources', label: 'Status & Proof — the status-source menu' },
        tags: ['signals', 'status-and-proof', 'status-sources']
    },
    {
        type: 'mcq',
        id: 'broken-belt-verdicts',
        prompt: 'A belt-driven supply fan carries all three status sources. Ten minutes after a commanded start: aux contact ON, current switch ON, DP switch OFF. What most likely failed?',
        choices: [
            { id: 'a', text: 'The belt (or coupling) — the contactor closed and the motor is drawing amps, but nothing is moving air: the failure sits between the motor shaft and the fan wheel.', correct: true },
            { id: 'b', text: 'The contactor coil — it never pulled in.' },
            { id: 'c', text: 'Line power to the starter was lost.' },
            { id: 'd', text: 'The motor windings failed open.' }
        ],
        explain: 'Read the three verdicts as a bracket around the fault. Aux ON clears the control circuit and the contactor — the coil pulled in, so that\'s out. Current switch ON means real amps are flowing, which clears line power and the motor\'s electrical side — an open winding draws nothing. The only territory left is mechanical, between the shaft and the wheel: the belt. One more clue hides in the middle verdict: a <em>correctly set</em> current switch (trip above the unloaded draw) would have gone OFF too — that it still proves is itself a finding about its trip point.',
        learnMore: { href: '/education/status-and-proof.html#sap-sources', label: 'Status & Proof — the status-source menu' },
        tags: ['signals', 'status-and-proof', 'status-sources', 'broken-belt']
    },

    // ── Proof logic ───────────────────────────────────────
    {
        type: 'mcq',
        id: 'proof-window-tradeoff',
        prompt: 'A fail-to-start alarm runs on a proof window: command the fan, wait, then expect status. What is the real trade-off when choosing the window length?',
        choices: [
            { id: 'a', text: 'Too short trips nuisance fail-to-starts on every honest start (the fan is still spinning up); too long leaves a genuinely failed start unreported for the whole delay — and everything interlocked to "proven" inherits that blind spot.', correct: true },
            { id: 'b', text: 'Too short wears out the contactor; too long overheats the motor.' },
            { id: 'c', text: 'Window length only changes how the alarm is logged, not whether it fires.' },
            { id: 'd', text: 'There is no trade-off — the window should always be as short as the controller\'s scan rate allows.' }
        ],
        explain: 'A real fan takes seconds to pull in, come up to speed, and build enough pressure to close a DP switch — a window shorter than that alarms on every legitimate start, and an operator who sees enough false fail-to-starts stops believing the real ones. But every second of window is also a second of blindness: a start that truly failed runs unalarmed until the timer expires, and any interlock waiting on "proven" waits just as long. The rule: as long as the slowest honest start, and no longer. The window changes <em>whether and when</em> the alarm fires — it isn\'t cosmetic, and neither length stresses the hardware.',
        learnMore: { href: '/education/status-and-proof.html#sap-proof', label: 'Status & Proof — proof logic' },
        tags: ['signals', 'status-and-proof', 'proof-logic']
    },
    {
        type: 'mcq',
        id: 'commanded-on-status-off',
        prompt: 'A fan is commanded ON, and after the proof window the status still reads OFF. Which family of causes are you in?',
        choices: [
            { id: 'a', text: 'Fail-to-start: control power, coil, or overload trouble at the starter; a mechanical failure the status source can see — or a status setup that can\'t prove an honest start (window too short, trip too high, polarity backwards).', correct: true },
            { id: 'b', text: 'The equipment is running without the controller\'s permission — a HAND switch, a welded contactor, or a leftover jumper.' },
            { id: 'c', text: 'A chattering termination on the BI.' },
            { id: 'd', text: 'Nothing — commanded-ON with status-OFF is a normal standby condition.' }
        ],
        explain: 'Commanded ON / status OFF means the start didn\'t happen — or happened and couldn\'t be proven. Walk the ladder from the starter forward: control fuse, coil, overload, then the mechanical territory (belt, coupling), and keep one eye on the status setup itself, because a too-short window, a trip set above the running draw, or inverted polarity all manufacture this exact picture around a perfectly healthy fan. The HAND-switch / welded-contactor family is the <em>opposite</em> direction — commanded OFF, status ON — and a status that never changes isn\'t chatter, which is rapid flipping.',
        learnMore: { href: '/education/status-and-proof.html#sap-proof', label: 'Status & Proof — proof logic' },
        tags: ['signals', 'status-and-proof', 'proof-logic']
    },
    {
        type: 'mcq',
        id: 'commanded-off-status-on',
        prompt: 'A fan is commanded OFF; an hour later its status still reads ON. The status point checked out fine at commissioning. What kind of problem is this?',
        choices: [
            { id: 'a', text: 'An authority problem, not a proof problem — something outside the program is running the fan: an HOA switch left in HAND, a welded contactor, or a jumper left over from troubleshooting.', correct: true },
            { id: 'b', text: 'A proof-window problem — the stop delay is set too long.' },
            { id: 'c', text: 'A broken belt.' },
            { id: 'd', text: 'Normal behavior — status is only compared to command during starts.' }
        ],
        explain: 'Commanded OFF with status ON means the machine is running and the controller isn\'t the one running it — which quietly defeats every schedule, interlock, and safety the sequence thinks it\'s enforcing. The suspects are the paths that bypass the program: a hand-off-auto switch in HAND, contactor poles welded closed, a troubleshooting jumper nobody removed. Proof windows are measured in seconds, not hours; a broken belt makes status prove <em>less</em> than commanded, not more; and a good sequence compares both directions precisely because this direction is the more urgent one.',
        learnMore: { href: '/education/status-and-proof.html#sap-proof', label: 'Status & Proof — proof logic' },
        tags: ['signals', 'status-and-proof', 'proof-logic']
    },

    // ── Binary fault signatures ───────────────────────────
    {
        type: 'tf',
        id: 'inverted-polarity-easy-to-spot',
        prompt: 'A status point with inverted NO/NC polarity never changes state, so it is one of the easier wiring faults to spot from the graphic.',
        answer: false,
        explain: 'Both halves are wrong. An inverted point isn\'t frozen — it <strong>tracks perfectly, backwards</strong>: every real transition shows up on the graphic, just as the opposite state. And it isn\'t easy to spot from the value, because most equipment holds one state for hours, so the point sits at a plausible-looking (wrong) value — perpetual ON on a unit that\'s off, perpetual OFF on one that runs around the clock. The tell is the alarm pattern at the transitions: fail-to-start on every start of a fan you can hear running, running-unexpectedly the moment it legitimately stops. A genuinely dead point never changes; an inverted one changes exactly when it shouldn\'t.',
        learnMore: { href: '/education/status-and-proof.html#sap-signatures', label: 'Status & Proof — binary fault signatures' },
        tags: ['signals', 'status-and-proof', 'fault-signatures', 'polarity']
    },
    {
        type: 'mcq',
        id: 'chattering-dp-status',
        prompt: 'An AHU\'s fan status comes from a DP switch. The point flips ON/OFF several times a minute — worst in the afternoon when the VAV boxes throttle back and the fan slows, gone when the fan runs full out. Most likely cause?',
        choices: [
            { id: 'a', text: 'The switch\'s trip sits right at the fan\'s low-load operating pressure — normal swings walk the DP back and forth across it. Add margin: set the trip so the honest operating point clears it comfortably.', correct: true },
            { id: 'b', text: 'A loose termination on the BI — vibration is bouncing the wire.' },
            { id: 'c', text: 'The point\'s polarity is inverted.' },
            { id: 'd', text: 'The controller\'s BI is scanning too fast and needs a slower scan rate.' }
        ],
        explain: 'Chatter has two usual families, and the pattern separates them. Chatter that tracks the <em>system</em> — worse at low load, gone at full speed — points at a marginal setpoint: as the fan slows, its pressure rise falls toward the trip, and the switch is asked to make its call exactly where the system actually lives. Chatter that tracks the <em>machine</em> — a loose lug, a contact bouncing with vibration — doesn\'t care what the VAV boxes are doing. Inverted polarity tracks state changes (backwards) rather than flipping rapidly, and the scan rate isn\'t generating transitions, just reporting them. The fix is margin: put the trip well below the worst-case honest operating point and let the switch\'s built-in differential do its job.',
        learnMore: { href: '/education/status-and-proof.html#sap-signatures', label: 'Status & Proof — binary fault signatures' },
        tags: ['signals', 'status-and-proof', 'fault-signatures', 'chatter']
    },
    {
        type: 'numeric',
        id: 'unloaded-motor-draw',
        prompt: 'A fan motor\'s nameplate full-load current is 10 A; running loaded it draws 8 A. The belt snaps and the motor spins freely — unloaded, an induction motor draws roughly 30% of nameplate. About how many amps is the motor drawing now?',
        answer: 3,
        tolerance: 0.5,
        unit: 'A',
        explain: 'A motor that loses its load does not stop drawing current — most of an unloaded induction motor\'s draw is magnetizing current, roughly a quarter to a third of nameplate, so a 10 A nameplate leaves about <strong>3 A</strong> humming through a motor doing no useful work. That number is why current-switch trip points matter: a trip set below 3 A still "proves" this dead fan ON forever, and a trip at or above the 8 A running draw never proves (or chatters) on a healthy one. The trip belongs in the window between the unloaded draw (~3 A) and the running draw (8 A) — above the lie, below the truth.',
        learnMore: { href: '/education/status-and-proof.html#sap-signatures', label: 'Status & Proof — binary fault signatures' },
        tags: ['signals', 'status-and-proof', 'current-switch', 'broken-belt']
    },
    {
        type: 'gotcha',
        id: 'inverted-polarity-config',
        prompt: 'A brand-new fan status point alarms on every single start — while the fan audibly runs — and flags "running unexpectedly" the moment the fan stops. The point config reads:',
        snippet: '<pre class="quiz-snippet">BI3   SF-STATUS\ndevice:  current switch — contact\n         closes on motor run (NO)\nconfig:  polarity = INVERTED\nwindow:  proof delay 30 s</pre>',
        choices: [
            { id: 'a', text: 'The polarity flag is inverting an already-correct contact — a close-on-run NO device speaks the default language, so INVERTED makes the point read exactly backwards on both transitions.', correct: true },
            { id: 'b', text: 'The proof delay is too short for this fan.' },
            { id: 'c', text: 'The current switch trip is set below the motor\'s unloaded draw.' },
            { id: 'd', text: 'The BI needs an externally powered (wet) contact instead of a dry one.' }
        ],
        explain: 'The polarity setting exists for devices that open on run (or NC safety contacts) — it flips what open and closed <em>mean</em>. This current switch already closes on run, so INVERTED turns every honest closure into "OFF" and every honest opening into "ON": fail-to-start on each start, running-unexpectedly on each stop. Alarming on <strong>both transitions</strong> is the inverted-polarity signature. A too-short window nuisances only on starts; a low trip point fails to alarm (it proves a broken belt — it doesn\'t cry wolf); and the point demonstrably changes state, so the landing isn\'t the problem. Flip the polarity to NORMAL and the point tells the truth.',
        learnMore: { href: '/education/status-and-proof.html#sap-signatures', label: 'Status & Proof — binary fault signatures' },
        tags: ['signals', 'status-and-proof', 'fault-signatures', 'polarity']
    }
];
