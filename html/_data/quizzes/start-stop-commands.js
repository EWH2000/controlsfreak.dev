// Question bank for the Start/Stop Commands quiz, exposed to Nunjucks
// as `quizzes['start-stop-commands']`. Lives in _data/ so two consumers
// read one source: the page's inline JS (mounts the engine in the
// browser) and the FAQPage JSON-LD emitter in head.njk.
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_start-stop-commands_* localStorage keys. Pairs with the
// Start/Stop Commands lesson; learnMore hrefs deep-link its <h2>
// anchors. Sequential order is the lesson walk: the command path →
// HOA semantics → finding the break.
//
// Deliberate scope split: the controller-wiring bank already owns the
// WIRING side of the BO — relay vs triac, feeding BO-C from the hot
// leg, floating-actuator triac pairs. This bank stays on the
// DOWNSTREAM PATH — the interposing relay's reason for existing, HOA
// authority and command-vs-status agreement, safety-string vs software
// interlocks, and Hand-vs-Auto fault localization. Don't drift
// questions across that line when editing either bank.

module.exports = [
    // ── The command path ──────────────────────────────────
    {
        type: 'mcq',
        id: 'command-path-order',
        prompt: 'A BMS commands a supply fan to start. Put the hardware between that decision and the motor in the order the circuit sees it.',
        choices: [
            { id: 'a', text: 'BO dry contact → interposing relay → HOA switch (Auto leg) → safety string → contactor coil → motor.', correct: true },
            { id: 'b', text: 'BO dry contact → HOA switch → interposing relay → contactor coil → safety string → motor.' },
            { id: 'c', text: 'BO dry contact → contactor coil → interposing relay → HOA switch → safety string → motor.' },
            { id: 'd', text: 'BO dry contact → safety string → HOA switch → motor → interposing relay → contactor coil.' }
        ],
        explain: 'The chain, left to right: the <strong>BO</strong> is the decision — a small dry contact that closes when the program says run. It drives the <strong>interposing relay</strong>\'s coil; the relay\'s heavier contact enters the starter\'s control circuit on the <strong>HOA\'s Auto leg</strong>. From the HOA the circuit runs through the <strong>safety string</strong> — freeze stat, firestat, overload aux, in series, downstream of the HOA on purpose so Hand can\'t bypass them — and finally to the <strong>contactor coil</strong>, whose line-side contacts put three-phase power to the motor. Every troubleshooting split on this page falls out of holding that order in your head.',
        learnMore: { href: '/education/start-stop-commands.html#command-path', label: 'Start/Stop Commands — the command path' },
        tags: ['signals', 'start-stop-commands', 'command-path']
    },
    {
        type: 'mcq',
        id: 'why-interposing-relay',
        prompt: 'The BO is already a relay contact. Why does the command path put a second, interposing relay between the BO and the starter?',
        choices: [
            { id: 'a', text: 'Contact rating and voltage class — the BO\'s pilot-duty contact is rated for a small 24 VAC load, while the starter\'s control circuit is commonly 120 VAC feeding an inductive coil with real inrush, and line-class wiring has no business on a DDC terminal strip.', correct: true },
            { id: 'b', text: 'Redundancy — two relays in series halve the chance of a welded contact starting the motor.' },
            { id: 'c', text: 'Timing — the interposing relay adds the anti-short-cycle delay the sequence needs.' },
            { id: 'd', text: 'Polarity — the BO switches DC and the interposing relay converts it to the AC the coil needs.' }
        ],
        explain: 'Both reasons are on the nameplates. <strong>Rating:</strong> a BO contact is pilot duty — built to switch a small relay coil, not a contactor coil\'s inductive inrush. <strong>Voltage class:</strong> the starter\'s control circuit commonly runs at 120 VAC, and you don\'t land line-class conductors on a DDC terminal strip. So the BO switches a small 24 VAC relay it can handle, and that relay\'s heavier contact switches the circuit the BO never could. It isn\'t redundancy (series contacts add failure points, not safety), it adds no timing (that\'s the program\'s job), and there\'s no DC conversion in the story.',
        learnMore: { href: '/education/start-stop-commands.html#command-path', label: 'Start/Stop Commands — the command path' },
        tags: ['signals', 'start-stop-commands', 'command-path']
    },
    {
        type: 'mcq',
        id: 'coil-in-motor-dead',
        prompt: 'You command the fan, the interposing relay clicks, and the contactor pulls in with an audible clunk — but the motor never turns. Whose territory is the fault in now?',
        choices: [
            { id: 'a', text: 'The line side — power fuses, the overload elements, the motor itself. The controls side of the circuit ends at the contactor coil; a coil that pulls in has done everything the command path asked of it.', correct: true },
            { id: 'b', text: 'The BO — it must be commanding intermittently for the motor to stay still.' },
            { id: 'c', text: 'The safety string — an open freeze stat would let the contactor close but hold the motor off.' },
            { id: 'd', text: 'The HOA — the Auto leg is open, so the contactor is closing on a dead circuit.' }
        ],
        explain: 'Trace what the clunk proves: the BO commanded, the relay closed, the HOA passed it, every safety was closed, and the coil energized — the <em>entire control circuit</em> just testified for itself. What\'s left is the line side: blown power fuses, tripped or failed overload elements, a seized or burned motor — the electrician\'s territory. The safety string and the Auto leg sit <em>in series with the coil</em>; had either been open, the contactor could never have pulled in at all. This boundary is worth knowing precisely, because it\'s also where your meter stops belonging in the cabinet.',
        learnMore: { href: '/education/start-stop-commands.html#command-path', label: 'Start/Stop Commands — the command path' },
        tags: ['signals', 'start-stop-commands', 'command-path']
    },

    // ── HOA semantics ─────────────────────────────────────
    {
        type: 'mcq',
        id: 'hand-command-status-disagree',
        prompt: 'A tech flips an AHU fan to Hand and leaves for lunch. The BMS schedule has the fan commanded OFF. What does the graphic show while the tech eats?',
        choices: [
            { id: 'a', text: 'Command OFF, status ON — the unit runs while the BMS asks it not to, and the status point is the one telling the truth.', correct: true },
            { id: 'b', text: 'Command ON, status ON — the BMS senses the running fan and updates its command to match.' },
            { id: 'c', text: 'Command OFF, status OFF — Hand runs the fan physically but the BMS can no longer see it.' },
            { id: 'd', text: 'An error state — command and status points cannot disagree on a healthy controller.' }
        ],
        explain: 'A <em>command</em> point records a request; a <em>status</em> point reports a fact — and Hand makes them split by design, because Hand wires the coil circuit around everything the BO touches. The command stays wherever the program left it (OFF, per the schedule); the status follows the physical machine (ON). Nothing "updates the command to match" — the BMS doesn\'t change its request because reality disagrees — and the disagreement is not an error but a <em>message</em>: it\'s the exact mirror of the broken-belt call, where the BMS commands ON and the proof point reports nothing moving. A command/status split is where troubleshooting starts, not something to explain away.',
        learnMore: { href: '/education/start-stop-commands.html#hoa', label: 'Start/Stop Commands — HOA semantics' },
        tags: ['signals', 'start-stop-commands', 'hoa']
    },
    {
        type: 'tf',
        id: 'off-beats-everyone',
        prompt: 'With the HOA in Off, a BMS operator with sufficient priority can still start the fan through the BO — software authority outranks the switch.',
        answer: false,
        explain: 'Off breaks the control circuit <em>ahead of both legs</em> — it beats the BO, and it beats Hand. No point, no priority, no seat outranks it, and that\'s deliberate: the person standing at the equipment has to be able to make it stop, no matter what any program thinks it knows. Software priority settles arguments <em>between software</em> — it never reaches into copper. One caution rides along: an HOA in Off is <strong>not lockout/tagout</strong>. The starter\'s line side is still hot, and nothing about a selector switch protects anyone working inside the machine.',
        learnMore: { href: '/education/start-stop-commands.html#hoa', label: 'Start/Stop Commands — HOA semantics' },
        tags: ['signals', 'start-stop-commands', 'hoa']
    },

    // ── Finding the break ─────────────────────────────────
    {
        type: 'mcq',
        id: 'hand-works-auto-dead',
        prompt: 'The classic call: the fan runs fine in Hand but is dead in Auto. Where is the fault?',
        choices: [
            { id: 'a', text: 'Upstream of the HOA\'s Auto leg — the BO, the interposing relay, or the wiring between them. Hand just proved the safeties, coil, control power, and motor in one move.', correct: true },
            { id: 'b', text: 'The safety string — a tripped freeze stat blocks Auto but not Hand.' },
            { id: 'c', text: 'The contactor coil — it has enough turns left for Hand but not for Auto.' },
            { id: 'd', text: 'The motor overload — it trips only under automatic control.' }
        ],
        explain: 'This is the whole reason the HOA is a diagnostic instrument and not just an override. Hand enters the chain <em>downstream</em> of everything the controller owns — so a unit that runs in Hand has just testified for the safety string, the contactor coil, control power, the starter, and the motor, all at once. What Hand <em>didn\'t</em> test is the Auto leg: the BO (check the point is actually commanding before touching a wire), the interposing relay (coil voltage, the click, the contact), and the wire between. The distractors all name devices <em>shared</em> by both positions — the safety string sits downstream of the HOA precisely so Hand can\'t bypass it, so an open safety would kill Hand too.',
        learnMore: { href: '/education/start-stop-commands.html#finding-the-break', label: 'Start/Stop Commands — finding the break' },
        tags: ['signals', 'start-stop-commands', 'troubleshooting']
    },
    {
        type: 'mcq',
        id: 'dead-in-hand-and-auto',
        prompt: 'Same fan, worse day: dead in Hand and dead in Auto. Where do you hunt now?',
        choices: [
            { id: 'a', text: 'Downstream of the HOA — walk the safety string contact by contact, then the contactor coil, then control power itself. Nothing the controller does or doesn\'t do explains a unit that won\'t run in Hand.', correct: true },
            { id: 'b', text: 'The BO — a failed binary output blocks both positions.' },
            { id: 'c', text: 'The interposing relay — its contact carries the Hand leg too.' },
            { id: 'd', text: 'The BMS schedule — an unoccupied period locks out Hand as well as Auto.' }
        ],
        explain: 'Dead-in-both flips the localization: Hand bypasses the BO and the interposing relay entirely, so neither can be the reason Hand fails — the upstream half is exonerated without lifting a wire. The suspects are what both positions <em>share</em>: the safety string (walk it — one open contact kills everything, and freeze stats are commonly manual-reset, so an overnight trip stays tripped until someone presses the button), the contactor coil, and control power. No schedule, program, or software lockout reaches the Hand leg — that\'s the entire point of Hand.',
        learnMore: { href: '/education/start-stop-commands.html#finding-the-break', label: 'Start/Stop Commands — finding the break' },
        tags: ['signals', 'start-stop-commands', 'troubleshooting']
    },
    {
        type: 'mcq',
        id: 'freeze-trip-morning-after',
        prompt: 'A freeze stat on an AHU tripped at 38 °F (3.3 °C) overnight. By morning the mixed-air temp is back to normal, but the fan is still down — dead in Hand and Auto — and the BMS command has been sitting at ON for hours. What is going on?',
        choices: [
            { id: 'a', text: 'Freeze stats are commonly manual-reset — the trip opened the hardwired string and stays open until someone presses the reset at the unit, no matter what the temperature or the BMS says now.', correct: true },
            { id: 'b', text: 'The BO failed during the night; the freeze event and the dead fan are coincidence.' },
            { id: 'c', text: 'The BMS software interlock is still latched and needs the point released from its seat.' },
            { id: 'd', text: 'The contactor coil burned out when the freeze stat tripped.' }
        ],
        explain: 'A manual-reset safety is a design decision, not an inconvenience: a coil that got close enough to freezing to trip deserves a human standing in front of the unit before it runs again. The contact opened in <em>copper</em>, so no software action — no release, no override, no command — closes it, and dead-in-Hand-and-Auto is exactly the signature of an open safety string. The command sitting at ON for hours against a status of OFF is the graphic faithfully reporting the disagreement. If the BMS never alarmed, that\'s the follow-up item: a hardwired trip should be <em>reported</em> to the BMS through a status or alarm point, even though the BMS gets no vote in it.',
        learnMore: { href: '/education/start-stop-commands.html#finding-the-break', label: 'Start/Stop Commands — finding the break' },
        tags: ['signals', 'start-stop-commands', 'troubleshooting']
    },
    {
        type: 'mcq',
        id: 'copper-vs-code',
        prompt: 'The controller already reads the discharge-air temperature, so a freeze condition could stop the fan in software. Why does the freeze stat still get hardwired into the safety string?',
        choices: [
            { id: 'a', text: 'Because the trip has to work when software can\'t be trusted — controller dead, program mid-download, network dark, point overridden. Trips that protect people or destroy equipment when missed live in copper; software interlocks handle sequencing and coordination.', correct: true },
            { id: 'b', text: 'Because a hardwired contact reacts faster than a program scan, and speed is the whole reason.' },
            { id: 'c', text: 'Because codes prohibit any software from ever stopping a fan.' },
            { id: 'd', text: 'Tradition — modern controllers are reliable enough that the hardwired string is vestigial.' }
        ],
        explain: 'A software freeze routine is a fine <em>first</em> line — many sequences have one. But count the moments it silently isn\'t there: the controller powered down, the program half-downloaded, the network offline, the point overridden by someone troubleshooting from another floor. A trip that guards a coil full of water — or people — has to outrank <em>every one of those states</em>, and a contact in series with the contactor coil is the only authority that does. Scan speed is a minor bonus, not the reason; no code bans software stops; and "vestigial" gets a coil replaced the first time a download coincides with a cold snap. The dividing line: life-safety and equipment-destroying trips in copper, polite coordination in code.',
        learnMore: { href: '/education/start-stop-commands.html#finding-the-break', label: 'Start/Stop Commands — finding the break' },
        tags: ['signals', 'start-stop-commands', 'interlocks']
    },
    {
        type: 'gotcha',
        id: 'ir-coil-hot-wired',
        prompt: 'An exhaust fan in Auto runs constantly — the BMS commands OFF and nothing changes. The tech before you left this landing sheet on the interposing relay:',
        snippet: '<pre class="quiz-snippet">24V~ hot → IR coil (+)       ✓  "powered and verified"\nIR coil (−) → 24COM          ✓\nIR contact → HOA "A" term    ✓\nBO1 → (not landed)\nHOA in AUTO → fan runs · BMS command OFF → still runs</pre>',
        choices: [
            { id: 'a', text: 'The relay coil is fed straight from the 24 VAC hot leg instead of through the BO\'s switched contact — the relay is permanently energized, so Auto means always-on and the BO was never in the circuit at all.', correct: true },
            { id: 'b', text: 'The HOA is mislabeled and the switch is actually sitting in Hand.' },
            { id: 'c', text: 'The safety string has failed shorted, forcing the fan to run.' },
            { id: 'd', text: 'The controller\'s BO has welded closed and is latching the relay on.' }
        ],
        explain: 'The sheet\'s own checkmark is the confession: "24V~ hot → IR coil" means the coil is wired to the <em>always-hot</em> leg — "powered and verified," permanently. The relay picked the moment the panel got power and will never drop, so the Auto leg is live around the clock and the BO\'s opinion is irrelevant — <strong>BO1 → (not landed)</strong> says the switched leg never entered the circuit. The coil belongs on the BO\'s <em>switched</em> terminal, so the relay follows the command. A welded BO can\'t latch anything through a wire that was never landed; safeties fail <em>open</em> and can only stop a fan, never run one — they\'re vetoes, not commands; and blaming the HOA label doesn\'t survive the sheet either. (What feeds BO-C and how the switched leg leaves the controller is the wiring lesson\'s story.)',
        learnMore: { href: '/education/start-stop-commands.html#finding-the-break', label: 'Start/Stop Commands — finding the break' },
        tags: ['signals', 'start-stop-commands', 'troubleshooting']
    }
];
