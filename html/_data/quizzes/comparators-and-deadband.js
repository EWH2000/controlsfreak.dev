// Question bank for the Comparators & Deadband quiz, exposed to
// Nunjucks as `quizzes['comparators-and-deadband']`. Lives in _data/
// so two consumers read one source: the page's inline JS (mounts the
// engine in the browser) and the FAQPage JSON-LD emitter in head.njk
// (indexable Q&A for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_comparators-and-deadband_* localStorage keys. Pairs with the
// Comparators & Deadband lesson; learnMore hrefs deep-link its <h2>
// anchors. Metric parentheticals are static text (the units walker
// doesn't reach engine-painted DOM) and follow the displayed-operand
// rounding policy.

module.exports = [
    // ── The comparator family ──────────────────────────────
    {
        type: 'mcq',
        id: 'cdb-which-comparator',
        prompt: 'The sequence reads: <em>trip low-limit protection when the mixed-air temperature falls below 38 °F (3.3 °C).</em> Which comparator is that sentence?',
        choices: [
            { id: 'a', text: 'A > B — TRUE above the line.' },
            { id: 'b', text: 'A < B — TRUE below the line.', correct: true },
            { id: 'c', text: 'A = B — equal within a tolerance.' },
            { id: 'd', text: 'A ≠ B — TRUE whenever the values differ.' }
        ],
        explain: '"Falls below" is a less-than: mixed-air temperature into A, the 38 °F (3.3 °C) limit into B, and A < B goes TRUE on the cold side of the line. Direction is the part of a comparator that deserves your attention — which side of the threshold reads TRUE — because on a measured value the boundary case itself is a knife-edge that never matters.',
        learnMore: { href: '/education/comparators-and-deadband.html#comparators', label: 'Comparators & Deadband — The comparator family' },
        tags: ['comparators-and-deadband', 'logic', 'comparators']
    },
    {
        type: 'tf',
        id: 'cdb-eq-on-analog',
        prompt: 'An EQ (A = B) comparator is a dependable way to detect a space temperature reaching exactly 72.0 °F (22.2 °C).',
        answer: false,
        explain: 'False. A measured value is a float that never holds still, and computed decimals rarely match bit-for-bit — a value can display 72.0 while being 71.999999 underneath. That is why the Function-Block Editor\'s EQ tests "within a tiny tolerance" rather than exact equality, and production palettes do the same. Even then, equality on a moving measurement is true for a scan or two while the value passes through. Save EQ for genuinely discrete values — mode numbers, stage counts.',
        learnMore: { href: '/education/comparators-and-deadband.html#comparators', label: 'Comparators & Deadband — The comparator family' },
        tags: ['comparators-and-deadband', 'logic', 'comparators']
    },
    {
        type: 'tf',
        id: 'cdb-gt-vs-ge',
        prompt: 'On a measured analog value like a space temperature, swapping A > B for A ≥ B changes the behavior in a way you would notice in the field.',
        answer: false,
        explain: 'False. The two differ in exactly one case — the values precisely equal — and on a continuously varying measurement that case is one value out of a continuum, gone by the next scan. Nothing observable changes. What does matter is the comparison\'s direction and where the line sits; that is where a review of the sheet should spend its time.',
        learnMore: { href: '/education/comparators-and-deadband.html#comparators', label: 'Comparators & Deadband — The comparator family' },
        tags: ['comparators-and-deadband', 'logic', 'comparators']
    },

    // ── Chatter ────────────────────────────────────────────
    {
        type: 'mcq',
        id: 'cdb-chatter-mechanism',
        prompt: 'A cooling call is a single comparator: space temperature > setpoint. The space has settled right at the setpoint. Why does the output flip on and off, over and over?',
        choices: [
            { id: 'a', text: 'The comparator block is faulty and needs replacing.' },
            { id: 'b', text: 'The sheet re-evaluates several times a second, and sensor noise jitters the value back and forth across the line — each scan honestly re-answers the question, and the answer keeps changing.', correct: true },
            { id: 'c', text: 'The setpoint constant is drifting.' },
            { id: 'd', text: 'The comparator should have been A ≥ B instead of A > B.' }
        ],
        explain: 'The comparator is doing its job: every scan it re-asks "above the line?", and a value riding the line with a few tenths of noise keeps changing the answer. The trap is structural — a controlled variable spends its life near its setpoint, so a single threshold at the setpoint guarantees the value hovers exactly where the comparison is least stable. The fix is a deadband, not a different comparator.',
        learnMore: { href: '/education/comparators-and-deadband.html#chatter', label: 'Comparators & Deadband — Chatter' },
        tags: ['comparators-and-deadband', 'logic', 'chatter']
    },
    {
        type: 'mcq',
        id: 'cdb-band-too-narrow',
        prompt: 'A tech tightens a compressor stage\'s deadband to 0.2 °F (0.1 °C) "for accuracy." What shows up next?',
        choices: [
            { id: 'a', text: 'Nothing — a narrower band is strictly more accurate.' },
            { id: 'b', text: 'Short-cycling: the band is now inside the sensor noise and the normal swing, so the compressor starts and stops constantly — contactor wear, inrush heating, no oil return.', correct: true },
            { id: 'c', text: 'The space temperature drifts further from setpoint.' },
            { id: 'd', text: 'The comparators stop evaluating.' }
        ],
        explain: 'A band narrower than the noise riding the signal is barely a band at all — set and reset sit close enough that ordinary jitter and the space\'s natural swing walk the value across both lines continuously. A compressor rated for a handful of starts an hour gets asked for far more, and every start is inrush current, contactor arcing, and an oil-return cycle that never completes. The anti-short-cycle timer will fight back, but a sequence that leans on the safety timer to clean up its own chatter has a bug in it.',
        learnMore: { href: '/education/comparators-and-deadband.html#chatter', label: 'Comparators & Deadband — Chatter' },
        tags: ['comparators-and-deadband', 'logic', 'chatter', 'short-cycling']
    },

    // ── Building the deadband ──────────────────────────────
    {
        type: 'numeric',
        id: 'cdb-band-edge-set-point',
        prompt: 'A cooling thermostat is built set/reset style around a 72 °F (22.2 °C) setpoint with a 2 °F (1.2 °C) band centered on it — half above, half below. Where is the set line — the temperature the space must rise above before the cooling call latches ON? Enter the answer in °F.',
        answer: 73,
        tolerance: 0,
        unit: '°F',
        explain: 'Half of the 2 °F (1.2 °C) band sits each side of setpoint: set at 72 + 1 = 73 °F, reset at 72 − 1 = 71 °F (in °C: 22.2 + 0.6 = 22.8, and 22.2 − 0.6 = 21.6). Cooling latches on above 73 °F, holds straight through the band, and releases only below 71 °F. The 2 °F between the two lines is the deadband — the space the latch\'s memory covers.',
        learnMore: { href: '/education/comparators-and-deadband.html#deadband', label: 'Comparators & Deadband — Building the deadband' },
        tags: ['comparators-and-deadband', 'logic', 'deadband']
    },
    {
        type: 'mcq',
        id: 'cdb-inside-band-memory',
        prompt: 'In the deadband thermostat (set above SP + ½ band, reset below SP − ½ band), the space temperature is sitting between the two lines. Both comparators read FALSE. Why doesn\'t the cooling call drop?',
        choices: [
            { id: 'a', text: 'The comparators\' outputs are ignored inside the band.' },
            { id: 'b', text: 'An SR latch that is neither being set nor reset simply holds its last state — inside the band the latch\'s memory is the deadband.', correct: true },
            { id: 'c', text: 'The greater-than block keeps outputting TRUE until the less-than fires.' },
            { id: 'd', text: 'The binary output holds the value on its own.' }
        ],
        explain: 'Between the lines, neither S nor R is true — and a latch with both inputs FALSE holds wherever it was. That hold is the whole trick: plain comparators can only answer "right now," so the "stay put" between the edges has to come from the one boolean block with memory. If the call was on when the space entered the band, it stays on until the reset line fires; if it was off, it stays off until the set line fires.',
        learnMore: { href: '/education/comparators-and-deadband.html#deadband', label: 'Comparators & Deadband — Building the deadband' },
        tags: ['comparators-and-deadband', 'logic', 'deadband', 'latch']
    },
    {
        type: 'mcq',
        id: 'cdb-reverse-acting',
        prompt: 'A thermostat\'s output rises when the measured temperature falls below the band and drops when it climbs above. What is that called?',
        choices: [
            { id: 'a', text: 'Direct-acting — the output follows the measurement up.' },
            { id: 'b', text: 'Reverse-acting — the output rises as the measurement falls. It is a heating thermostat.', correct: true },
            { id: 'c', text: 'Fail-safe action.' },
            { id: 'd', text: 'Proportional action.' }
        ],
        explain: 'Output rising as the measurement falls is reverse-acting — heating. Output rising with the measurement is direct-acting — cooling. In the set/reset construction the difference is nothing but which comparator feeds S and which feeds R: under-temp sets a heating call, over-temp sets a cooling call. The comparators themselves never change.',
        learnMore: { href: '/education/comparators-and-deadband.html#deadband', label: 'Comparators & Deadband — Building the deadband' },
        tags: ['comparators-and-deadband', 'logic', 'deadband', 'direct-reverse']
    },
    {
        type: 'mcq',
        id: 'cdb-band-too-wide',
        prompt: 'A room thermostat\'s deadband gets widened to 6 °F (3.4 °C) total to "protect the equipment." The equipment is certainly resting now. What is the cost?',
        choices: [
            { id: 'a', text: 'The sequence stops working entirely.' },
            { id: 'b', text: 'Comfort: around a 72 °F (22.2 °C) setpoint the space free-floats between roughly 69 and 75 °F (20.5 and 23.9 °C), and the occupants feel the whole swing.', correct: true },
            { id: 'c', text: 'The comparators chatter more.' },
            { id: 'd', text: 'The latch loses its memory over a band that wide.' }
        ],
        explain: 'Band width is a straight trade: narrow is tight comfort and busy equipment, wide is rested equipment and a swing the occupants ride. Six degrees centered on 72 °F puts the set line near 75 °F and the reset near 69 °F (22.2 ± 1.7 °C displayed-operand: 23.9 and 20.5 °C) — nobody\'s idea of comfort. Room stats usually land around 1–2 °F (0.6–1.2 °C) of total band; and the same trade repeats at plant scale in equipment staging\'s stage-up/stage-down gap.',
        learnMore: { href: '/education/comparators-and-deadband.html#deadband', label: 'Comparators & Deadband — Building the deadband' },
        tags: ['comparators-and-deadband', 'logic', 'deadband', 'comfort']
    },
    {
        type: 'gotcha',
        id: 'cdb-swapped-latch-not-a-bug',
        prompt: 'Reviewing a thermostat sheet, a tech flags a bug: "the latch is wired backwards — the under-temperature comparator hits SET and the over-temperature comparator hits RESET, the opposite of the cooling stat we just looked at." What\'s the verdict?',
        snippet: '<pre class="quiz-snippet">TEMP &gt; SP + DB  ──→  SR latch R (reset)\nTEMP &lt; SP − DB  ──→  SR latch S (set)\nSR latch Q      ──→  HEAT CALL (binary out)</pre>',
        choices: [
            { id: 'a', text: 'Confirmed bug — set must always come from the greater-than.' },
            { id: 'b', text: 'Not a bug. The output is a HEAT call: cold sets it, warm resets it — this is a reverse-acting heating thermostat, wired exactly as it should be.', correct: true },
            { id: 'c', text: 'Both wires should feed S; R should be a manual reset.' },
            { id: 'd', text: 'The comparators are swapped, not the latch wires.' }
        ],
        explain: 'Read the output before judging the latch. Q drives a HEAT call, so the space being cold is the reason to turn on — under-temperature is the set condition, over-temperature the reset. A "swapped-looking" S/R pair is simply what reverse action looks like in this construction; the Function-Block Editor\'s heating-thermostat example ships wired exactly this way, and it differs from the cooling example by nothing but those two wires. The bug hunt starts with "what does the output mean?", not with pattern-matching against the last sheet.',
        learnMore: { href: '/education/comparators-and-deadband.html#try-it', label: 'Comparators & Deadband — Walk the band yourself' },
        tags: ['comparators-and-deadband', 'logic', 'deadband', 'direct-reverse']
    }
];
