// Question bank for the Timers & Delays quiz, exposed to Nunjucks as
// `quizzes['timers-and-delays']`. Lives in _data/ so two consumers
// read one source: the page's inline JS (mounts the engine in the
// browser) and the FAQPage JSON-LD emitter in head.njk (indexable
// Q&A for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_timers-and-delays_* localStorage keys. Pairs with the
// Timers & Delays lesson; learnMore hrefs deep-link its <h2>
// anchors. Timer questions teach the semantics of the site's FB
// editor (fbe-engine.js is the ground truth): TON's ET zeroes the
// instant the input drops — no credit across attempts; TOF's Q rises
// instantly and its countdown is cancelled, not paused, when the
// input returns.

module.exports = [
    // ── TON / TOF semantics ────────────────────────────────
    {
        type: 'mcq',
        id: 'tdl-ton-short-of-preset',
        prompt: 'A TON on-delay timer has a 10 s preset. Its input goes TRUE, holds for 8 s, then drops. What did the output do?',
        choices: [
            { id: 'a', text: 'Went TRUE at the 8 s mark, when the input dropped.' },
            { id: 'b', text: 'Stayed FALSE the whole time — 8 s never reached the preset, and ET cleared to zero the moment the input dropped.', correct: true },
            { id: 'c', text: 'Went TRUE the instant the input rose and dropped 10 s later.' },
            { id: 'd', text: 'Went TRUE for the final 2 s of the pulse.' }
        ],
        explain: 'A TON is the sentence "the input must stay true this long before I believe it." Eight seconds is short of the 10 s preset, so Q never fired — and the moment the input dropped, ET zeroed. As far as anything downstream knows, that 8 s pulse never happened: the TON is a minimum-duration filter that deletes every TRUE shorter than its preset.',
        learnMore: { href: '/education/timers-and-delays.html#ton-tof', label: 'Timers & Delays — TON and TOF' },
        tags: ['timers-and-delays', 'logic', 'ton']
    },
    {
        type: 'mcq',
        id: 'tdl-tof-ride-through',
        prompt: 'A fan status signal feeds a TOF off-delay timer with a 10 s preset. The status drops out for 6 s, then comes back. What did the TOF\'s output do?',
        choices: [
            { id: 'a', text: 'Dropped for the same 6 s the status was out.' },
            { id: 'b', text: 'Dropped exactly 10 s after the status dropped.' },
            { id: 'c', text: 'Stayed TRUE throughout — the dropout was shorter than the preset, so the countdown was cancelled and ET cleared when the status returned.', correct: true },
            { id: 'd', text: 'Dropped and stayed dropped until something reset it.' }
        ],
        explain: 'A TOF holds its output TRUE for the preset after the input drops. The input came back at 6 s — inside the window — so the countdown was cancelled, not paused: ET zeroed, the output never blinked, and the next dropout gets a fresh, full-length 10 s delay. The TOF is the mirror of the TON: it deletes every FALSE shorter than its preset.',
        learnMore: { href: '/education/timers-and-delays.html#ton-tof', label: 'Timers & Delays — TON and TOF' },
        tags: ['timers-and-delays', 'logic', 'tof']
    },
    {
        type: 'tf',
        id: 'tdl-ton-et-no-credit',
        prompt: 'If a TON\'s input drops before the preset is reached, the elapsed time holds where it was and resumes counting from there when the input comes back.',
        answer: false,
        explain: 'False — ET clears to zero the instant the input drops, and the next attempt starts the count from scratch. A standard TON keeps no credit across attempts. Timers that do accumulate across interruptions exist in some palettes — usually called retentive or accumulating timers — but that\'s a different block; don\'t assume you have one.',
        learnMore: { href: '/education/timers-and-delays.html#ton-tof', label: 'Timers & Delays — TON and TOF' },
        tags: ['timers-and-delays', 'logic', 'ton']
    },
    {
        type: 'tf',
        id: 'tdl-tof-instant-rise',
        prompt: 'A TOF\'s output goes TRUE the instant its input does — the preset delays only the turn-off.',
        answer: true,
        explain: 'True — that\'s what off-delay means. There is no delay on the way up: Q rises with the input. The preset only matters on the drop, when Q hangs on while ET counts up toward it. If the input returns before ET gets there, the countdown is cancelled and the output never blinked. A block that delays the way <em>up</em> is the TON.',
        learnMore: { href: '/education/timers-and-delays.html#ton-tof', label: 'Timers & Delays — TON and TOF' },
        tags: ['timers-and-delays', 'logic', 'tof']
    },
    {
        type: 'mcq',
        id: 'tdl-fan-purge-tof',
        prompt: 'Heating just shut off, and the sequence should keep the supply fan running another 90 s to purge heat from the exchanger. Which timer does the job?',
        choices: [
            { id: 'a', text: 'A TON on the heat call — delay the fan start by 90 s.' },
            { id: 'b', text: 'A TOF on the run call driving the fan — the fan follows the call up instantly and holds on for 90 s after it drops.', correct: true },
            { id: 'c', text: 'A TON on the fan status, so the proof lasts longer.' },
            { id: 'd', text: 'An SR latch set by the heat call.' }
        ],
        explain: 'Say the sentence and the block picks itself: "keep saying run for 90 s after the call drops" — that\'s the TOF\'s sentence exactly. The fan starts with the call (no delay up) and outlives it by the preset, carrying the exchanger\'s residual heat away instead of letting it soak. A TON would do the opposite — delay the start and drop the fan the instant heating stopped, exactly when the purge is needed.',
        learnMore: { href: '/education/timers-and-delays.html#ton-tof', label: 'Timers & Delays — TON and TOF' },
        tags: ['timers-and-delays', 'logic', 'tof']
    },

    // ── The proof window ───────────────────────────────────
    {
        type: 'mcq',
        id: 'tdl-proof-window-too-short',
        prompt: 'A fail-to-start alarm pages on nearly every start of a big return fan — which always proves within about 20 s. The proof TON\'s preset is 10 s. What\'s the right fix?',
        choices: [
            { id: 'a', text: 'Lengthen the preset past the slowest honest start — about 25 s here.', correct: true },
            { id: 'b', text: 'Remove the TON so the alarm reports the instant proof is missing.' },
            { id: 'c', text: 'Set the preset to 5 minutes so it can never nuisance-trip again.' },
            { id: 'd', text: 'Add a NOT to invert the proof signal.' }
        ],
        explain: 'The window is shorter than an honest start, so the alarm cries wolf on every one — and alarms that cry wolf get ignored or disabled. But the 5-minute "fix" just trades nuisance for a blind spot: a start that genuinely failed runs unreported for the whole preset, and everything interlocked on "proven" inherits the blind spot. The rule: as long as the slowest honest start plus a little margin, and no longer.',
        learnMore: { href: '/education/timers-and-delays.html#proof', label: 'Timers & Delays — The proof window' },
        tags: ['timers-and-delays', 'logic', 'proof']
    },
    {
        type: 'mcq',
        id: 'tdl-proof-latch-role',
        prompt: 'In the proof-of-flow alarm sheet (command BI + proof BI → NOT → AND → TON 15 s → SR latch → alarm BO), the TON\'s output already goes TRUE on a confirmed failure. What does the SR latch add?',
        choices: [
            { id: 'a', text: 'It delays the alarm a further 15 s for a second opinion.' },
            { id: 'b', text: 'It holds the alarm after the failure condition goes away — the TON only reports while command-with-no-proof stands, so switching the fan off would otherwise erase the alarm.', correct: true },
            { id: 'c', text: 'It prevents the timer from running when set and reset are both TRUE.' },
            { id: 'd', text: 'It debounces the proof contact so it can\'t chatter.' }
        ],
        explain: 'The timer detects; the latch remembers. The TON\'s Q is only TRUE while the failure condition stands — the moment an operator kills the fan command, the AND drops and the TON releases. Without the latch, that natural response would erase the alarm, evidence and all. Latched, the trip stands until a deliberate reset — a person acknowledging — no matter what the inputs do in the meantime.',
        learnMore: { href: '/education/timers-and-delays.html#proof', label: 'Timers & Delays — The proof window' },
        tags: ['timers-and-delays', 'logic', 'proof', 'latch']
    },
    {
        type: 'mcq',
        id: 'tdl-debounce-chatter',
        prompt: 'A DP status point flutters on and off at marginal airflow, spamming alarms. You want the status believed only after it has held made for 3 s. Which block goes between the raw point and the logic?',
        choices: [
            { id: 'a', text: 'A 3 s TON — the status must stay TRUE for the full preset before it passes.', correct: true },
            { id: 'b', text: 'A 3 s TOF — hold the status TRUE for 3 s after each flicker.' },
            { id: 'c', text: 'A NOT — invert the fluttering signal.' },
            { id: 'd', text: 'A comparator with a wider deadband.' }
        ],
        explain: 'The sentence is "hold made for 3 s before I believe it" — a TON. The flutter never survives the filter, because no single TRUE lasts the preset. A short TOF is the mirror trick — riding <em>through</em> brief dropouts of a signal you already believe. And remember the timer treats the symptom: if the switch flutters because its setpoint has no margin against the operating pressure, the honest fix is the setpoint, not a longer filter.',
        learnMore: { href: '/education/timers-and-delays.html#proof', label: 'Timers & Delays — The proof window' },
        tags: ['timers-and-delays', 'logic', 'debounce']
    },
    {
        type: 'gotcha',
        id: 'tdl-tof-where-ton-needed',
        prompt: 'The sequence narrative says: "alarm only if the filter DP switch stays made for 30 s." A tech wired it as below — and now the alarm fires the <em>instant</em> the switch closes, then lingers for 30 s after it opens. What\'s wrong?',
        snippet: '<pre class="quiz-snippet">FILTER-DP (BI) ──► TOF (PT 30 s) ──► ALARM (BO)\n\nswitch closes → alarm ON immediately\nswitch opens  → alarm holds another 30 s</pre>',
        choices: [
            { id: 'a', text: 'The preset is too long — 30 s should be 3 s.' },
            { id: 'b', text: 'A TOF passes a rising input straight through and delays only the drop. "Stays made this long before I believe it" is the TON\'s sentence — swap the block.', correct: true },
            { id: 'c', text: 'The switch polarity is backwards — it needs a NOT in front.' },
            { id: 'd', text: 'The TOF needs an SR latch after it to hold the alarm.' }
        ],
        explain: 'The symptom is the block\'s signature read back to you: instant rise, delayed fall — that\'s an off-delay doing exactly what it does. The narrative wanted the mirror image: ignore the switch until it has held made for 30 s, which is an on-delay. Same preset, same wiring, opposite sentence. When a timer misbehaves, check which edge the delay is on before touching anything else.',
        learnMore: { href: '/education/timers-and-delays.html#proof', label: 'Timers & Delays — The proof window' },
        tags: ['timers-and-delays', 'logic', 'gotcha']
    },

    // ── Minimum run / minimum off ──────────────────────────
    {
        type: 'numeric',
        id: 'tdl-min-starts-spacing',
        prompt: 'A compressor\'s nameplate allows a maximum of 6 starts per hour. If anti-short-cycle timing spaces the starts evenly, what is the minimum time between one start and the next, in minutes?',
        answer: 10,
        tolerance: 0,
        unit: 'min',
        explain: '60 minutes ÷ 6 starts = <strong>10 minutes</strong> between starts. That whole gap is what the minimum-run and minimum-off timers enforce together: however eagerly the deadband decision flips, the equipment cycles no faster than one start per 10 minutes. Starts are the expensive part — inrush heat in the windings, oil pumped out on short runs, pressures that need the off-time to equalize — which is why the number comes from the manufacturer, not from taste.',
        learnMore: { href: '/education/timers-and-delays.html#min-times', label: 'Timers & Delays — Minimum run, minimum off' },
        tags: ['timers-and-delays', 'logic', 'short-cycle']
    }
];
