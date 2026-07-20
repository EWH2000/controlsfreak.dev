// Question bank for the Wiresheet Traces field drill, exposed to
// Nunjucks as `quizzes['wiresheet-traces']`. Lives in _data/ so two
// consumers read one source: the page's inline JS (mounts the engine in
// the browser) and the FAQPage JSON-LD emitter in head.njk.
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_wiresheet-traces_* localStorage keys.
//
// SCOPE (owner-decided split): the Reading a Wiresheet QUIZ owns the
// CONCEPT + METHOD level — first moves, which leg the trace follows,
// latch state, scan observation, idiom naming. This DRILL owns the hard
// part: multi-block live sheets where the reader has to reject several
// honest-looking candidates before the lying block falls out. Difficulty
// comes from three sources and only three:
//   1. red-herring branches   — blocks that are healthy but look guilty,
//                               and blocks that look irrelevant but are not;
//   2. inverted-safety traps  — chains that permit correctly today and
//                               would fail to protect on the day it matters;
//   3. plausible-but-wrong configuration — arithmetic that is faithful to
//                               the block's label and wrong for the sequence.
// Deliberately NOT feedback loops and NOT execution-order / last-scan
// traps: those are a different and cheaper kind of hard, and the sibling
// banks (function-blocks, reading-a-wiresheet) already own them.
//
// BANK SIZE: intentionally larger than the 10 a default run presents.
// NOTE — the page mounts with defaultOrder: 'sequential', and the engine
// only shuffles when order === 'random', so a default run is always
// questions 1-10 in order and the tail (wst-grey-not-dead,
// wst-permit-proven, wst-prune-with-sibling) renders only when the reader
// sets Questions to All. The replayability this size was chosen for needs
// a sampling change that has NOT landed; until it does, treat the tail as
// opt-in, not as rotation. Open for the owner: sample-then-present-in-order
// in the engine, flip this page to 'random', or present all 13.
//
// FIGURES: three questions carry a `figure` — the kebab-case id of a
// hidden <svg> in the static figure bank on practice/wiresheet-traces.html.
// Reserved for the questions where TOPOLOGY is the puzzle (which pin a
// wire actually lands on, which block sits on which leg); everything
// else uses a <pre class="quiz-snippet">, which reads better on a phone.

module.exports = [
    // ── Red herrings: the block that looks guilty, and the one that
    //    looks irrelevant ─────────────────────────────────────────
    {
        type: 'mcq',
        id: 'wst-orphan-setpoint',
        figure: 'wst-fig-orphan-sp',
        prompt: 'A tenant complains the space runs warm. The operator drops the cooling setpoint on the graphic from 78 to 72 °F (25.6 to 22.2 °C), watches the value change, and goes home. Nothing happens — the space sits at 74 °F (23.3 °C) and cooling never starts. The live sheet reads as shown. What is going on?',
        choices: [
            { id: 'a', text: 'The comparator is configured backwards — a cooling call needs A &lt; B.' },
            { id: 'b', text: 'The graphic writes the SP ADJUST constant, but nothing on the sheet reads it — the comparator is fed by a second, hard-coded constant of 78.', correct: true },
            { id: 'c', text: 'The space-temperature input is stale and needs to be re-polled.' },
            { id: 'd', text: 'The binary output is in a manual OFF state.' }
        ],
        explain: 'Every block on this sheet is honest: 74 is not greater than 78, so FALSE is the right answer, and the output faithfully repeats it. The lie is a wire that is not there. Two constants carry the word "setpoint" and only one of them reaches the comparator — the operator edited a block whose output pin drives nothing, and the graphic dutifully confirmed the edit because a graphic binds to a point, not to a wire. This is the reason a trace ends at a <em>pin</em>, not at a block: the question is never "what does the setpoint say," it is "what value arrives at B." Orphaned blocks accumulate on any sheet that has been revised more than once — the old constant gets unwired and left in place instead of deleted, and it stays there looking authoritative.',
        learnMore: { href: '/education/reading-a-wiresheet.html#raw-backward', label: 'Reading a Wiresheet — trace to the pin' },
        tags: ['wiresheet-traces', 'logic', 'red-herring', 'trace']
    },
    {
        type: 'mcq',
        id: 'wst-select-masks-reset',
        figure: 'wst-fig-hi-select',
        prompt: 'A hot-water reset schedule is supposed to slide the supply setpoint down as it warms outside. It is 55 °F (12.8 °C) out and the plant is still asking for 170 °F (76.7 °C) water. The reset chain checks out block by block. The live sheet reads as shown. Which block is lying?',
        choices: [
            { id: 'a', text: 'The MULTIPLY — a negative slope on a reset chain is a sign error.' },
            { id: 'b', text: 'The LIMIT — its clamp is holding the setpoint up.' },
            { id: 'c', text: 'The MAX — its second input is a 170 minimum-temperature constant, so the reset result only reaches the AO on the days it exceeds 170.', correct: true },
            { id: 'd', text: 'Nothing — 170 is the correct reset output at 55 °F outdoors.' }
        ],
        explain: 'The reset chain is textbook and it is not the problem: &minus;1.0 &times; 55 = &minus;55, plus 190 = 135, and the 130&ndash;180 clamp passes 135 untouched. Then a high-select puts that 135 up against a 170 constant and the constant wins, every hour of every mild day. A minimum-supply-temperature floor is a legitimate thing to want — some plants hold one for domestic-hot-water preheat, and a non-condensing cast-iron or steel boiler wants a floor to keep return water above its flue-gas dew point and off the thermal-shock end of its curve — but at 170 it is set above most of the schedule it is protecting, so it does not floor the reset, it replaces it. The trap is that the four blocks a tech reaches for first are all innocent; the fault is the block <em>after</em> the part of the sheet that has a name. Read the chain to the AO pin, not to the end of the idiom you recognized.',
        learnMore: { href: '/education/setpoint-math-reset.html', label: 'Setpoint Math & Reset — the reset chain' },
        tags: ['wiresheet-traces', 'logic', 'red-herring', 'reset']
    },
    {
        type: 'mcq',
        id: 'wst-not-on-wrong-leg',
        figure: 'wst-fig-not-leg',
        prompt: 'A brand-new AHU will not enable. Both safeties are healthy — the freeze stat is closed and there is no smoke. The live sheet reads as shown. Which block is lying, and what happens if you simply delete the NOT?',
        choices: [
            { id: 'a', text: 'The AND is lying and should be an OR; deleting the NOT would then be harmless.' },
            { id: 'b', text: 'The NOT is on the wrong leg. Deleting it starts the fan today and leaves the smoke input un-inverted — so a real smoke trip would drive the permit TRUE, not FALSE.', correct: true },
            { id: 'c', text: 'The smoke input is lying; a trip-sense contact should read TRUE when healthy.' },
            { id: 'd', text: 'Nothing is lying — a new unit needs a manual reset before it will enable.' }
        ],
        explain: 'The two safeties report in opposite senses, which is normal and is exactly what makes this sheet dangerous. The freeze stat is normally closed, so healthy reads TRUE and it belongs on the AND raw. The smoke detector is a trip-sense contact, so healthy reads FALSE and it is the one that needs inverting. The NOT is on the wrong leg — it turns the freeze stat\'s healthy TRUE into a FALSE and holds the permit down, which is the complaint you were called for. The important half of this question is the fix. Deleting the NOT makes the unit run and makes the complaint go away, and it silently converts the smoke interlock into an <em>enable</em>: healthy FALSE now blocks the permit and a genuine trip reading TRUE would satisfy it. The NOT does not need removing, it needs moving. A safety fault that presents as a nuisance is the most likely one to get "fixed" wrong, because the wrong fix is the one that stops the phone ringing.',
        learnMore: { href: '/education/boolean-logic-latches.html', label: 'Boolean Logic & Latches — permissive chains' },
        tags: ['wiresheet-traces', 'logic', 'inverted-safety', 'trace']
    },

    // ── Inverted safety: chains that permit correctly today ────────
    {
        type: 'gotcha',
        id: 'wst-or-permit-chain',
        prompt: 'You are reviewing a heating sheet on a unit that has <em>no complaint</em> against it — everything runs. The permissive chain reads as below. Is there anything to write up?',
        snippet: '<pre class="quiz-snippet">FAN STATUS (BI):      TRUE\nFRZ STAT NC (BI):     TRUE   (closed = OK)\nHI-LIMIT NC (BI):     TRUE   (closed = OK)\nOR   (3 inputs):      TRUE\nHEAT CALL:            TRUE\nAND  (permit, call):  TRUE\nHEAT VALVE (AO):      100%</pre>',
        choices: [
            { id: 'a', text: 'No — every value is TRUE and the unit is heating on a call. The chain is correct.' },
            { id: 'b', text: 'Yes — the safeties are combined with an OR, so any one of them staying TRUE holds the permit up while the other two are tripped.', correct: true },
            { id: 'c', text: 'Yes — a heat valve should never be driven to 100% from a binary call.' },
            { id: 'd', text: 'Yes — the fan status belongs downstream of the heat call, not upstream.' }
        ],
        explain: 'Every live value on this sheet is TRUE, the arithmetic is faultless, and the unit is doing what the sequence asks. That is the whole trap: a permissive chain built on an OR is indistinguishable from a correct one on the day everything is healthy. Safeties are an AND — <em>all</em> proofs must stand — and this one asks for <em>any</em>. Trip the freeze stat and the fan status alone keeps the permit up; the coil sees full valve with the stat open. You cannot find this by chasing a symptom, because there is no symptom until the day it matters. You find it by reading the chain against the sentence the sequence writes: "heat is permitted when the fan is proven AND the freeze stat is clear AND the high limit is clear." One conjunction, read out loud, and the block is wrong.',
        learnMore: { href: '/education/boolean-logic-latches.html', label: 'Boolean Logic & Latches — permissive chains' },
        tags: ['wiresheet-traces', 'logic', 'inverted-safety']
    },
    {
        type: 'gotcha',
        id: 'wst-forced-reset-leg',
        prompt: 'A freeze stat on a makeup-air unit is latched so a trip must be reset by hand. The alarm history shows it has tripped three times this month, and each time the unit was still running when someone got there. The trip latch reads as below on a healthy afternoon. What explains the self-clearing trips?',
        snippet: '<pre class="quiz-snippet">FRZ TRIP (from stat):   FALSE\nRESET CMD (sw point):   TRUE   [in override]\nSR LATCH   S:           FALSE\nSR LATCH   R:           TRUE\nSR LATCH   Q:           FALSE\nUNIT ENABLE:            TRUE</pre>',
        choices: [
            { id: 'a', text: 'The latch is set-dominant and should be reset-dominant.' },
            { id: 'b', text: 'The reset point is sitting in override at TRUE, so R is held high — the latch is being reset on the very scan it is set, every time.', correct: true },
            { id: 'c', text: 'The freeze stat is chattering and the latch cannot keep up.' },
            { id: 'd', text: 'Nothing — a latch releases on its own once the stat closes again.' }
        ],
        explain: 'The latch is doing precisely what a latch does. Its R input is held TRUE, and a latch whose reset never releases has no memory at all — it is a very expensive AND-NOT. Someone forced the reset point while commissioning the manual-reset button, proved the button worked, and never cleared the force. Every trip since has been reset within one scan of being set, which is why the record shows three trips and no service calls. Two habits catch this. The first is the override rulebook — log every force, clear every force, and sweep for forces before you leave, because a forgotten force is a live hazard wearing a disguise. The second is a reading habit: on a stateful block, do not just read the pins, read the pins <em>and ask what they have been</em>. A reset input that is TRUE right now is a reset input that has probably been TRUE for a while.',
        learnMore: { href: '/education/controls-commissioning.html', label: 'Controls Commissioning — override discipline' },
        tags: ['wiresheet-traces', 'logic', 'inverted-safety', 'forces']
    },
    {
        type: 'gotcha',
        id: 'wst-inverted-bi-config',
        prompt: 'A unit will not enable. The freeze stat is a normally-closed device, it is closed, and you have a meter on it proving continuity. The sheet is flawless. It reads as below. Where is the lie?',
        snippet: '<pre class="quiz-snippet">FRZ STAT (field):     continuity, closed\nFRZ STAT (BI value):  FALSE\nAND  (status, frz):   FALSE\nUNIT ENABLE (BO):     OFF</pre>',
        choices: [
            { id: 'a', text: 'The AND — with one FALSE input it should still pass the healthy one through.' },
            { id: 'b', text: 'Nowhere on the sheet. The lie is under it — the binary input point is configured inverted, so a closed contact publishes FALSE to the wiresheet.', correct: true },
            { id: 'c', text: 'The freeze stat — a normally-closed device reading closed is the fault.' },
            { id: 'd', text: 'The binary output, which is stuck in an OFF override.' }
        ],
        explain: 'Trace it backward and every hop is honest: the BO repeats its input, the AND given FALSE answers FALSE, and the BI faithfully publishes the value it was configured to publish. The trace runs out of sheet with the fault still ahead of it — which is the answer. A wiresheet\'s leftmost blocks are not the beginning of the truth; behind each one sits a point with its own configuration, and a binary input\'s polarity flag lives there, not on the sheet. When the trace reaches an input block and the sequence still disagrees with what that block reports, you have arrived at the boundary between logic and configuration, and the next move is the point properties or a meter at the terminal — not another block. Worth knowing which way this failure points, too: an inverted safety input reads healthy as tripped, so it fails toward nuisance shutdowns. The mirror-image mistake, on a trip-sense contact, fails toward no protection at all.',
        learnMore: { href: '/education/controller-wiring.html', label: 'Controller Wiring — binary inputs' },
        tags: ['wiresheet-traces', 'logic', 'inverted-safety', 'configuration']
    },

    // ── Plausible-but-wrong configuration ─────────────────────────
    {
        type: 'gotcha',
        id: 'wst-limit-clamps-swapped',
        prompt: 'A discharge-air reset drives its AO through a LIMIT block. The AO has read 55 all week — through a cold snap, a mild weekend, and a design-day afternoon. The chain reads as below. Which block is lying?',
        snippet: '<pre class="quiz-snippet">OAT (AI):           38\nreset chain out:    62\nLIMIT   HI:         55\nLIMIT   LO:         65\nLIMIT   out:        55\nDA SETPOINT (AO):   55</pre>',
        choices: [
            { id: 'a', text: 'The reset chain — 62 is wrong for a 38 °F morning.' },
            { id: 'b', text: 'The LIMIT — its HI and LO are entered backwards, so the clamp has no interior and the output pins to a bound no matter what arrives.', correct: true },
            { id: 'c', text: 'The AO — it is in a manual override at 55.' },
            { id: 'd', text: 'Nothing — 55 is the low end of a normal discharge-air range.' }
        ],
        explain: 'A clamp is only a clamp if LO is below HI. Enter them the other way round and the block has no interior left to pass anything through: every input is simultaneously above the ceiling and below the floor, and the output parks on whichever bound the block resolves last. Both numbers here are plausible discharge-air values, which is why the configuration survives a review — nothing about 55 and 65 looks wrong until you notice which field each one is in. The tell is behavioral and it is worth memorizing: <strong>an output that has not moved in a week is not a value, it is a symptom.</strong> A live reset chain that changes upstream and does not change downstream has something between the two that is not passing, and a clamp is the usual suspect. Confirm it by watching the LIMIT input swing while the output sits still.',
        learnMore: { href: '/education/setpoint-math-reset.html', label: 'Setpoint Math & Reset — clamping the line' },
        tags: ['wiresheet-traces', 'logic', 'configuration']
    },
    {
        type: 'gotcha',
        id: 'wst-double-scaled',
        prompt: 'A duct-static high-limit keeps shutting the fan down at a shade over a quarter inch of static. The transducer is a 0&ndash;5 in. w.c. unit and the point is scaled to match; a hand gauge at the tap agrees with the AI. The sheet reads as below. Which block is lying?',
        snippet: '<pre class="quiz-snippet">DUCT STATIC (AI):   0.28   in. w.c.\nMULTIPLY  by:       10\nMULTIPLY  out:      2.80\nHI-LIMIT SP:        2.50\ncomparator A &gt; B:   TRUE\nFAN SHUTDOWN (BO):  ON</pre>',
        choices: [
            { id: 'a', text: 'The analog input — 0.28 must be reading low.' },
            { id: 'b', text: 'The comparator — a high limit should be A &lt; B.' },
            { id: 'c', text: 'The MULTIPLY — the point is already scaled to engineering units, so the &times;10 scales an already-scaled value and pushes it past a setpoint that is in the right units.', correct: true },
            { id: 'd', text: 'The high-limit setpoint — 2.50 in. w.c. is too low for a duct system.' }
        ],
        explain: 'Every block is faithful to its own label. 0.28 &times; 10 really is 2.80, 2.80 really is greater than 2.50, and the output really does repeat TRUE. The block that does not belong is the one doing a job that was already done: the transducer\'s 0&ndash;5 in. w.c. range was applied at the point, so the AI arrives in engineering units and needs no further conversion. Somebody read the value as raw and added the scaling the point was already doing. Look for this whenever a chain mixes a sensible-looking measurement with a sensible-looking setpoint and produces nonsense — the ratio between them is usually a round number, and a round-number error is almost always a units error, not a math error. The cross-check costs nothing: the AI agrees with a hand gauge, so the boundary between honest and dishonest is downstream of the AI and upstream of the comparator, and there is only one block in that span.',
        learnMore: { href: '/education/analog-sensing.html#ranges-scaling', label: 'Analog Sensing — ranges and scaling' },
        tags: ['wiresheet-traces', 'logic', 'configuration', 'scaling']
    },
    {
        type: 'gotcha',
        id: 'wst-shared-constant-fanout',
        prompt: 'A zone ran cold, so a tech raised the occupied heating setpoint constant from 70 to 74 °F (21.1 to 23.3 °C). The zone is comfortable now. A week later the complaint is that the building is roasting overnight. The sheet around that constant reads as below. What happened?',
        snippet: '<pre class="quiz-snippet">OCC HTG SP (constant):   74      ← edited\n  ├─ to SELECT (occupied leg)\n  └─ to SUBTRACT A\nSETBACK (constant):       5\n  └─ to SUBTRACT B\nSUBTRACT out:            69      (unocc htg SP)\nSELECT out:              69      (unoccupied now)</pre>',
        choices: [
            { id: 'a', text: 'The SELECT is stuck on its occupied leg overnight.' },
            { id: 'b', text: 'The setback constant was reset to 5 by the edit.' },
            { id: 'c', text: 'The edited constant fans out to two consumers — the unoccupied setpoint is derived from it, so raising the occupied value raised the night setpoint by the same 4 degrees.', correct: true },
            { id: 'd', text: 'The SUBTRACT block should be an ADD for a setback.' }
        ],
        explain: 'Nothing on this sheet is broken. A derived-setpoint idiom — occupied SP minus a setback constant — is good practice precisely <em>because</em> the two track together, and here they tracked together into a 69 °F (20.6 °C) night setpoint that used to be 65 (18.3 °C). The hazard is not the idiom, it is that a wiresheet lets one block feed many and gives you no warning when you edit it. On a graphic you see one number; on the sheet you see how many wires leave it. So the discipline is: before you change a constant, look at its output pin and count the wires. One wire, edit freely. More than one, you are editing every consumer at once, and the second consumer is the one nobody tests. A fan-out junction dot is a small mark to carry that much consequence, which is exactly why it is worth learning to see.',
        learnMore: { href: '/education/setpoint-math-reset.html', label: 'Setpoint Math & Reset — derived setpoints' },
        tags: ['wiresheet-traces', 'logic', 'red-herring', 'configuration']
    },
    {
        type: 'numeric',
        id: 'wst-crossed-edges',
        prompt: 'A heating thermostat is built band-edge style: setpoint constant 72 °F (22.2 °C), deadband constant 2 °F (1.1 °C), a SUBTRACT making the 70 °F (21.1 °C) lower edge and an ADD making the 74 °F (23.3 °C) upper edge. Both comparators take the space temperature on A. The <strong>set</strong> comparator is A &lt; B with the ADD output landed on its B pin; the <strong>reset</strong> comparator is A &gt; B with the SUBTRACT output landed on its B pin. Falling from a warm space, at what temperature does the heat call first set?',
        answer: 74,
        tolerance: 0,
        unit: '°F',
        inputmode: 'numeric',
        explain: 'The set comparator asks "is the space below B," and B is the upper edge — so it goes TRUE the moment the space drops through <strong>74 °F (23.3 °C)</strong>, two degrees above setpoint. The two B wires are crossed, and the result is worse than a shifted band: between 70 and 74 both comparators are TRUE at once, so on a set-dominant latch the call is held on across the entire band it was supposed to float in. The unit heats until the space clears 74 &mdash; and the reset comparator, watching the 70 edge, will not release it there either. Every block is honest and every constant is right; only the two wires are transposed, and the sheet still looks exactly like the band-edge idiom because it <em>is</em> the band-edge idiom. That is the argument for reading an idiom\'s pins after you name it: recognizing the shape tells you what each pin should be doing, and here the shape is what makes the fault invisible.',
        learnMore: { href: '/education/comparators-and-deadband.html', label: 'Comparators & Deadband — the band edges' },
        tags: ['wiresheet-traces', 'logic', 'configuration', 'deadband']
    },

    // ── Reading habits the traps depend on ────────────────────────
    {
        type: 'tf',
        id: 'wst-grey-not-dead',
        prompt: 'A branch of the sheet whose wires are all showing FALSE is a branch that is not being evaluated this scan.',
        answer: false,
        explain: 'False — and the confusion is worth naming, because a grey FALSE branch is what a red herring looks like. FALSE is a <em>value</em>, not an activity state. Every block on the sheet runs every scan; a chain of blocks correctly reporting FALSE is working exactly as hard as the chain next to it reporting TRUE. Two consequences for a trace. First, a dead-looking branch is not evidence of anything — an alarm lamp that is off is an alarm lamp doing its job, and techs waste real time on those. Second, and more useful in the other direction: a branch showing FALSE can still be the fault, because the fault you are hunting is often a signal that <em>should</em> be TRUE. Colour tells you what a wire carries. It never tells you whether the wire matters.',
        learnMore: { href: '/education/reading-a-wiresheet.html#raw-scan', label: 'Reading a Wiresheet — what the scan means' },
        tags: ['wiresheet-traces', 'logic', 'red-herring']
    },
    {
        type: 'tf',
        id: 'wst-permit-proven',
        prompt: 'A permissive chain that is permitting right now, with every safety reading healthy, has been proven correct.',
        answer: false,
        explain: 'False. A permit that reads TRUE with every input healthy has demonstrated one row of the truth table — the row you were always going to get on a working unit. Everything that makes a safety chain a safety chain lives in the other rows: the ones where an input goes to its trip state and the permit must drop. An OR where an AND belongs, a NOT on the wrong leg, a safety wired to a spare input nobody landed — all three read perfectly healthy on a healthy day, and all three fail to protect on the one day they are needed. So a live sheet cannot verify a permissive chain by observation; you verify it by reading the chain against the sentence in the sequence of operations, and then by exercising each safety and watching the permit drop. That second half is point-to-point checkout, and it is why commissioning is a separate job from troubleshooting rather than the same job with better paperwork.',
        learnMore: { href: '/education/controls-commissioning.html', label: 'Controls Commissioning — proving the sequence' },
        tags: ['wiresheet-traces', 'logic', 'inverted-safety', 'method']
    },
    {
        type: 'mcq',
        id: 'wst-prune-with-sibling',
        prompt: 'An AHU sheet drives two outputs from one shared front end: the outdoor-air temperature feeds both an economizer-enable chain and a hot-water reset chain. The economizer will not enable on a 50 °F (10.0 °C) morning. The hot-water setpoint is tracking outdoor air correctly all day. What does the healthy second output buy you?',
        choices: [
            { id: 'a', text: 'Nothing — two outputs on one sheet can fail independently, so neither tells you about the other.' },
            { id: 'b', text: 'It retires the shared front end — the outdoor-air input and everything both chains read is exonerated, so the fault is inside the economizer branch after the split.', correct: true },
            { id: 'c', text: 'It proves the controller\'s scan is healthy, which rules out a program fault entirely.' },
            { id: 'd', text: 'It means the economizer fault must be in the outdoor-air sensor, since only one chain is affected.' }
        ],
        explain: 'A second output that is behaving is the cheapest pruning move on a sheet, and it is the one most often left on the table. Both chains read the same outdoor-air value; one of them is producing a correct, outdoor-air-dependent result, so that input and every block upstream of the split are honest — no meter, no force, no walk to the sensor. What is left is the economizer branch downstream of the junction, which on a typical sheet is a handful of blocks. The reasoning only holds as far as the <em>shared</em> path, though: it exonerates what both chains consume, not the whole left half of the drawing. Get in the habit of asking "what else on this unit reads the same signal, and is it right?" before you reach for a meter — a healthy sibling is a free measurement someone already took for you.',
        learnMore: { href: '/education/reading-a-wiresheet.html#raw-backward', label: 'Reading a Wiresheet — pruning the sheet' },
        tags: ['wiresheet-traces', 'logic', 'method', 'trace']
    }
];
