// Question bank for the Reading a Wiresheet quiz, exposed to Nunjucks
// as `quizzes['reading-a-wiresheet']`. Lives in _data/ so two consumers
// read one source: the page's inline JS (mounts the engine in the
// browser) and the FAQPage JSON-LD emitter in head.njk (indexable Q&A
// for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_reading-a-wiresheet_* localStorage keys. Pairs with the
// Reading a Wiresheet lesson; learnMore hrefs deep-link its <h2>
// anchors.
//
// SCOPE (owner-decided split): this bank stays CONCEPT + METHOD level
// — first moves, trace-order reasoning, feedback/scan observation,
// idiom identification, one LIGHT one-lie gotcha. The intentionally
// hard multi-block trace programs belong to the dedicated "Wiresheet
// Traces" practice DRILL that ships right after this lesson — do NOT
// add them here.

module.exports = [
    // ── Work backward from the wrong output ────────────────
    {
        type: 'mcq',
        id: 'raw-first-move',
        prompt: 'You are called to a unit you have never seen: the heat will not run, and the wiresheet on the controller is live in front of you. What is the fastest first move?',
        choices: [
            { id: 'a', text: 'Start at the inputs on the left and verify each block forward, in the order the sheet evaluates.' },
            { id: 'b', text: 'Find the heat output on the sheet and step upstream from it, one wire at a time.', correct: true },
            { id: 'c', text: 'Reboot the controller and see if the fault clears.' },
            { id: 'd', text: 'Force the heat output ON to confirm the equipment works, then read the sheet.' }
        ],
        explain: 'A broken sheet is still mostly healthy — one block is lying and the rest are doing their jobs. Reading forward from the inputs inspects the whole healthy majority before touching the fault; starting at the wrong output and tracing upstream prunes everything that is not on the fault path. Forward is how you learn a sheet; backward is how you fix one. (Forcing the output has its place as an experiment — but as a first move it proves the equipment, not the logic, and an undisciplined force on an occupied building is its own hazard.)',
        learnMore: { href: '/education/reading-a-wiresheet.html#raw-backward', label: 'Reading a Wiresheet — work backward' },
        tags: ['reading-a-wiresheet', 'logic', 'method']
    },
    {
        type: 'mcq',
        id: 'raw-false-leg',
        prompt: 'Tracing backward from an OFF heat output, you reach the gate AND. Its permit leg reads TRUE; its call leg reads FALSE. Where does the trace go next?',
        choices: [
            { id: 'a', text: 'Up the permit leg — verify every proof in the permissive chain individually.' },
            { id: 'b', text: 'Up the FALSE call leg — the TRUE permit leg just retired its whole upstream chain in one glance.', correct: true },
            { id: 'c', text: 'Back to the physical inputs to rule out sensors first.' },
            { id: 'd', text: 'Both legs, in parallel, to be thorough.' }
        ],
        explain: 'The AND is honest — given TRUE and FALSE, FALSE is the right output — so the fault is upstream of one of its legs. A TRUE leg makes sense, which retires the entire subtree that built it: the permissive chain is cleared without being walked. The FALSE leg is the one that fails to match what the sequence needs (there is a call for heat), so the trace follows it. Backward tracing is a pruning strategy — the sheet gets smaller at every hop.',
        learnMore: { href: '/education/reading-a-wiresheet.html#raw-worked', label: 'Reading a Wiresheet — the worked trace' },
        tags: ['reading-a-wiresheet', 'logic', 'trace-order']
    },

    // ── What the scan means for what you see ───────────────
    {
        type: 'mcq',
        id: 'raw-latch-s-false',
        prompt: 'A live sheet shows an SR latch with Q reading TRUE while its S input reads FALSE. Is the latch broken?',
        choices: [
            { id: 'a', text: 'Yes — an output cannot be TRUE with nothing setting it.' },
            { id: 'b', text: 'No — Q is state: S only needed to be TRUE once, possibly thousands of scans ago, and the latch has held since.', correct: true },
            { id: 'c', text: 'Yes — S and Q must always match on a healthy latch.' },
            { id: 'd', text: 'Only if R is also FALSE.' }
        ],
        explain: 'A latch remembering is the idiom working, not a fault. Q is state, held across scans; S is a momentary cause that may be long gone. At a stateful block the hop question shifts tense: not "given these inputs, is this output right?" but "given these inputs and a legitimate past, is it right?" — so you ask what could have fired S, not just what S says now. A latched trip whose cause has cleared looks exactly like this, on purpose, until someone resets it.',
        learnMore: { href: '/education/reading-a-wiresheet.html#raw-scan', label: 'Reading a Wiresheet — feedback and state' },
        tags: ['reading-a-wiresheet', 'logic', 'feedback']
    },
    {
        type: 'numeric',
        id: 'raw-feedback-scans',
        prompt: 'On a sheet with a feedback loop — a wire carrying a block\'s output back into its own chain — the value on that feedback wire is how many scans old?',
        answer: 1,
        tolerance: 0,
        unit: 'scan(s)',
        inputmode: 'numeric',
        explain: 'Exactly one. The controller evaluates blocks in dependency order within each scan, and a wire that loops back cannot be fresh and be an input at the same time — so it carries the previous scan\'s value, one scan stale, by design. That one-scan memory is why a latch can hold, why a loop resolves instead of chasing itself, and why a feedback wire\'s display can legitimately disagree with the value you would compute from this scan\'s inputs.',
        learnMore: { href: '/education/reading-a-wiresheet.html#raw-scan', label: 'Reading a Wiresheet — the scan, observed' },
        tags: ['reading-a-wiresheet', 'logic', 'scan']
    },
    {
        type: 'tf',
        id: 'raw-values-crawl',
        prompt: 'On a live wiresheet you can watch a signal work its way across the sheet — the comparator updates, then the AND a moment later, then the output.',
        answer: false,
        explain: 'False — a whole combinational chain settles within one scan, in dependency order, and the controller scans far faster than the display repaints. Live values move together between paints; you never see a value in flight. The diagnostic corollary: a chain that disagrees with itself — TRUE and TRUE into an AND showing FALSE — is not propagation delay, because there is none to see. That block is your NO.',
        learnMore: { href: '/education/reading-a-wiresheet.html#raw-scan', label: 'Reading a Wiresheet — values move together' },
        tags: ['reading-a-wiresheet', 'logic', 'scan']
    },
    {
        type: 'mcq',
        id: 'raw-force-ripple',
        prompt: 'You suspect a fault somewhere between a temperature input and the heat output, several blocks deep. What is the fastest experiment a live sheet offers?',
        choices: [
            { id: 'a', text: 'Swap the temperature sensor for a known-good one and watch for a change.' },
            { id: 'b', text: 'Force the temperature input to a value that should demand heat and watch the ripple — every downstream block confesses within a scan.', correct: true },
            { id: 'c', text: 'Wait for the space to drift to a value that exercises the logic naturally.' },
            { id: 'd', text: 'Download a fresh copy of the program.' }
        ],
        explain: 'Because the whole sheet settles every scan, a forced input ripples through everything downstream before the next repaint — comparators, latch, gate, and output all answer at once. A yes moves the fault upstream of your force; a no keeps it downstream — a binary search that converges in a few forces. The discipline that keeps it safe is commissioning\'s override rulebook: log every force, clear every force. A forgotten force is a live hazard wearing a disguise.',
        learnMore: { href: '/education/reading-a-wiresheet.html#raw-scan', label: 'Reading a Wiresheet — forcing an input' },
        tags: ['reading-a-wiresheet', 'logic', 'method']
    },
    {
        type: 'tf',
        id: 'raw-commissioning-boundary',
        prompt: 'Point-to-point checkout and live-wiresheet troubleshooting are the same activity under two names.',
        answer: false,
        explain: 'False — they answer different questions. Commissioning proves a CORRECT program was installed: point-to-point checkout walks every physical point against the sequence, with override discipline and a signed record. Troubleshooting a live sheet assumes the install and asks which block is lying now. They share tools — forces, live values, the sequence of operations — but checkout is systematic proof over every point, and a trace is targeted pursuit of one fault. Knowing which job you are doing tells you whether to walk everything or prune everything.',
        learnMore: { href: '/education/reading-a-wiresheet.html#raw-backward', label: 'Reading a Wiresheet — the boundary' },
        tags: ['reading-a-wiresheet', 'logic', 'commissioning']
    },

    // ── Idiom recognition ──────────────────────────────────
    {
        type: 'mcq',
        id: 'raw-idiom-reset-chain',
        prompt: 'An unfamiliar sheet shows the outdoor-air temperature feeding a MULTIPLY with a negative constant, then an ADD, then a LIMIT clamped between two values, and out to a hot-water setpoint. What are you looking at?',
        choices: [
            { id: 'a', text: 'A band-edge cluster — a deadband built around the setpoint.' },
            { id: 'b', text: 'A reset chain — a setpoint computed from a condition: y = mx + b with a clamp.', correct: true },
            { id: 'c', text: 'A mode switch — two setpoints selected by a boolean.' },
            { id: 'd', text: 'A proof window — a patience timer on an honest start.' }
        ],
        explain: 'MUL → ADD → LIMIT fed by a condition is the reset chain: the multiply is the slope, the add is the intercept, and the limit clamps the line to a sane band — a hot-water setpoint that slides down as the day warms. Recognize it and the trace collapses: if the setpoint looks wrong, check the input, the two constants, and the clamp values — four numbers, not four blocks of mystery. A setpoint that appears typed-in but keeps moving is almost always one of these.',
        learnMore: { href: '/education/reading-a-wiresheet.html#raw-idioms', label: 'Reading a Wiresheet — idiom recognition' },
        tags: ['reading-a-wiresheet', 'logic', 'idiom']
    },
    {
        type: 'mcq',
        id: 'raw-idiom-band-edge',
        prompt: 'On an unfamiliar sheet you find: an ADD and a SUBTRACT building setpoint-plus and setpoint-minus values, a greater-than and a less-than comparing the space temperature against them, and an SR latch fed by both comparators. What are you looking at?',
        choices: [
            { id: 'a', text: 'A reset chain — a setpoint computed from a condition.' },
            { id: 'b', text: 'A band-edge cluster — a deadband thermostat that switches once per crossing instead of chattering.', correct: true },
            { id: 'c', text: 'A permissive chain — proofs ANDed into a run permit.' },
            { id: 'd', text: 'A proof window — a fail-to-start alarm with a patience timer.' }
        ],
        explain: 'SP ± DB → GT/LT → SR latch is the band-edge cluster: math builds the two edges, the comparators watch them, and the latch holds between crossings — hysteresis built from stock blocks. Naming it collapses five blocks into one word, and the word tells you what every pin should be doing: set fires past one edge, reset past the other, and anything else is your NO. Reading idioms first means the trace hops between patterns, not between blocks.',
        learnMore: { href: '/education/reading-a-wiresheet.html#raw-idioms', label: 'Reading a Wiresheet — idiom recognition' },
        tags: ['reading-a-wiresheet', 'logic', 'idiom']
    },

    // ── One LIGHT trace gotcha ─────────────────────────────
    {
        type: 'gotcha',
        id: 'raw-gotcha-low-limit',
        prompt: 'A mixed-air low-limit should trip when the mixed-air temperature falls below 45 °F (7.2 °C). The live sheet reads as below — and the unit is tripped on a healthy 55 °F (12.8 °C) morning. Which block is lying?',
        snippet: '<pre class="quiz-snippet">MA TEMP (analog in):   55\nLIMIT SP (constant):   45\ncomparator  A > B:     TRUE\nLOW LIMIT TRIP (BO):   ON</pre>',
        choices: [
            { id: 'a', text: 'The analog input — 55 must be a bad reading.' },
            { id: 'b', text: 'The comparator — every value on the sheet is honest arithmetic, but its sentence is backwards: the low-limit needs A < B.', correct: true },
            { id: 'c', text: 'The binary output — it should not repeat a TRUE input.' },
            { id: 'd', text: 'Nothing — the sheet is behaving correctly.' }
        ],
        explain: 'Walk it backward: the BO honestly repeats its TRUE input; the comparator honestly computes 55 > 45 = TRUE. The first hop where an output stops matching what the sequence needs is the comparator — a low-limit must answer "has the temperature fallen BELOW the limit?", which is A < B. Someone configured a greater-than where a less-than belongs, so the trip is on whenever the air is comfortably warm and would clear in a freeze — the exact backwards behavior a swapped comparison always produces. The config is the lie; the arithmetic never was.',
        learnMore: { href: '/education/reading-a-wiresheet.html#raw-worked', label: 'Reading a Wiresheet — cornering a config lie' },
        tags: ['reading-a-wiresheet', 'logic', 'trace']
    }
];
