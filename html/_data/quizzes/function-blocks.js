// Question bank for the Function Blocks quiz, exposed to Nunjucks as
// `quizzes['function-blocks']`. Lives in _data/ so two consumers read
// one source: the page's inline JS (mounts the engine in the browser)
// and the FAQPage JSON-LD emitter in head.njk (indexable Q&A for
// search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_function-blocks_* localStorage keys. Pairs with the
// Function-Block Basics lesson; learnMore hrefs deep-link its <h2>
// anchors.

module.exports = [
    // ── Blocks and wiresheets ──────────────────────────────
    {
        type: 'mcq',
        id: 'fb-what-is-a-block',
        prompt: 'What is a function block?',
        choices: [
            { id: 'a', text: 'A small box that does one job — values come in on left-edge pins, a result leaves on right-edge pins.', correct: true },
            { id: 'b', text: 'A line of structured-text code.' },
            { id: 'c', text: 'A physical terminal on the controller.' },
            { id: 'd', text: 'A rung of ladder logic.' }
        ],
        explain: 'A function block is a box that does one job: inputs on the left pins, output on the right. An AND outputs TRUE only when both inputs are TRUE; an ADD outputs the sum of its two inputs. A wiresheet is a page of these blocks joined by wires, and reading one is most of what it takes to understand what a controller is doing.',
        learnMore: { href: '/education/function-blocks.html#blocks', label: 'Function Blocks — Blocks and wiresheets' },
        tags: ['function-blocks', 'logic']
    },
    {
        type: 'tf',
        id: 'fb-runs-once',
        prompt: 'A function block runs once and finishes, like a line of a script.',
        answer: false,
        explain: 'False. A block is re-evaluated continuously — many times a second — so its output always reflects whatever its inputs are right now. That continuous evaluation is what lets a live wiresheet track the real world moment to moment, and it\'s the key difference from sequential script that runs top-to-bottom once.',
        learnMore: { href: '/education/function-blocks.html#blocks', label: 'Function Blocks — Blocks and wiresheets' },
        tags: ['function-blocks', 'logic']
    },
    {
        type: 'mcq',
        id: 'fb-signal-flavors',
        prompt: 'Wires on a sheet carry two flavors of signal that a tool won\'t let you cross-connect. What are they?',
        choices: [
            { id: 'a', text: 'Input and output.' },
            { id: 'b', text: 'Digital (binary/boolean — a true/false) and analog (a number — a temperature, percent, or setpoint).', correct: true },
            { id: 'c', text: 'Fast and slow.' },
            { id: 'd', text: 'High-voltage and low-voltage.' }
        ],
        explain: 'A digital (binary/boolean) wire carries a plain true/false; an analog wire carries a number. The editor won\'t let you wire one into the other — they\'re different data types. Data flows left to right across the sheet: inputs that read the real world, through the logic, to outputs that command equipment.',
        learnMore: { href: '/education/function-blocks.html#blocks', label: 'Function Blocks — Blocks and wiresheets' },
        tags: ['function-blocks', 'logic']
    },

    // ── The block families ─────────────────────────────────
    {
        type: 'mcq',
        id: 'fb-comparator-bridge',
        prompt: 'Which block family is the bridge from the analog world to the digital one — watching a number against a threshold and outputting a true/false?',
        choices: [
            { id: 'a', text: 'Math blocks.' },
            { id: 'b', text: 'Comparators (greater-than, less-than, equal).', correct: true },
            { id: 'c', text: 'Timers.' },
            { id: 'd', text: 'Boolean logic blocks.' }
        ],
        explain: 'A comparator watches a number against a threshold and outputs a true/false the logic blocks can use — that\'s the analog-to-digital bridge in a sequence. Math blocks compute a value (a number out); boolean blocks combine true/false signals; timers delay or hold a signal. Naming the families is most of reading any new sheet.',
        learnMore: { href: '/education/function-blocks.html#families', label: 'Function Blocks — The block families' },
        tags: ['function-blocks', 'logic', 'comparators']
    },
    {
        type: 'mcq',
        id: 'fb-sr-latch',
        prompt: 'Interlocks, permissives, and safety chains lean on one boolean block that remembers a state — once set, it stays set until something resets it. Which block?',
        choices: [
            { id: 'a', text: 'An AND block.' },
            { id: 'b', text: 'An SR latch.', correct: true },
            { id: 'c', text: 'A comparator.' },
            { id: 'd', text: 'An on-delay timer.' }
        ],
        explain: 'An SR latch remembers: once set, it holds until a reset arrives. That memory is what builds interlocks, permissives, and safety chains — a freeze-stat that latches the fan off, for instance, and won\'t un-latch on its own. AND/OR/NOT/XOR are combinational (their output is purely a function of the present inputs); the latch is the one with state.',
        learnMore: { href: '/education/function-blocks.html#families', label: 'Function Blocks — The block families' },
        tags: ['function-blocks', 'logic', 'boolean']
    },
    {
        type: 'mcq',
        id: 'fb-on-delay-timer',
        prompt: 'What does an on-delay timer (TON) do?',
        choices: [
            { id: 'a', text: 'Holds a signal true for a while after its input drops.' },
            { id: 'b', text: 'Waits a set time before passing a true signal through.', correct: true },
            { id: 'c', text: 'Inverts a true/false signal.' },
            { id: 'd', text: 'Counts the number of times an input goes true.' }
        ],
        explain: 'An on-delay (TON) waits before passing a true through — good for debouncing a noisy input or enforcing a minimum-off before a restart. The mirror is the off-delay (TOF), which holds a signal true for a while after its input drops. Together they debounce, enforce minimum run times, and stop short-cycling.',
        learnMore: { href: '/education/function-blocks.html#families', label: 'Function Blocks — The block families' },
        tags: ['function-blocks', 'logic', 'timers']
    },

    // ── How a wiresheet runs ───────────────────────────────
    {
        type: 'mcq',
        id: 'fb-feedback-previous-scan',
        prompt: 'A wire loops a block\'s output back into its own chain (exactly what an SR latch is). How does the controller resolve this each scan without chasing itself or freezing?',
        choices: [
            { id: 'a', text: 'It evaluates that block thousands of times until it stabilizes.' },
            { id: 'b', text: 'The feedback wire carries the previous scan\'s value — the block reads where it was last scan, decides where it is now, and the loop resolves cleanly.', correct: true },
            { id: 'c', text: 'Feedback wires are not allowed on a wiresheet.' },
            { id: 'd', text: 'The controller skips the block entirely.' }
        ],
        explain: 'A feedback wire carries the value from the previous scan. The latch reads where it was last scan, decides where it is now, and the loop resolves in one pass instead of recursing. That one-scan memory is why a latch can hold a state and why a sheet with a loop in it never freezes.',
        learnMore: { href: '/education/function-blocks.html#scan', label: 'Function Blocks — How a wiresheet runs' },
        tags: ['function-blocks', 'logic', 'scan']
    },
    {
        type: 'tf',
        id: 'fb-dependency-order',
        prompt: 'In a plain (non-looping) chain, a comparator\'s result reaches the AND block downstream of it within the same scan, because the controller evaluates blocks in dependency order — sources first.',
        answer: true,
        explain: 'True. The controller evaluates in dependency order: sources first, then whatever depends on them, so a plain chain settles all at once within one scan. Only a feedback loop needs the previous-scan trick — a straight left-to-right chain resolves in a single pass.',
        learnMore: { href: '/education/function-blocks.html#scan', label: 'Function Blocks — How a wiresheet runs' },
        tags: ['function-blocks', 'logic', 'scan']
    },

    // ── The worked sheet + why this way ────────────────────
    {
        type: 'gotcha',
        id: 'fb-economizer-and',
        prompt: 'On the economizer-enable sheet (OAT < changeover setpoint, AND cooling mode on), the live values read OAT = 62, setpoint = 60, cooling = ON. Is the economizer enabled?',
        snippet: '<pre class="quiz-snippet">OAT (analog in):     62\nchangeover SP:       60\ncomparator OAT<SP:   ?\ncooling mode (DI):   ON\nAND → econ enable:   ?</pre>',
        choices: [
            { id: 'a', text: 'Yes — cooling mode is on, which is enough.' },
            { id: 'b', text: 'No — 62 is not less than 60, so the comparator is FALSE; with one AND input false, the economizer stays off.', correct: true },
            { id: 'c', text: 'Yes — outdoor air is always usable for free cooling.' },
            { id: 'd', text: 'It depends on the scan rate.' }
        ],
        explain: 'The AND needs both inputs TRUE. The OAT < SP comparator asks "is it cool enough?" — 62 is not below the 60 changeover, so that input is FALSE, and the AND output is false no matter what cooling mode says. The economizer only enables when outdoor air is genuinely cool enough AND the unit is calling for cooling; here the first condition fails.',
        learnMore: { href: '/education/function-blocks.html#worked-sheet', label: 'Function Blocks — A worked sheet' },
        tags: ['function-blocks', 'logic', 'worked-sheet']
    },
    {
        type: 'mcq',
        id: 'fb-watch-it-run',
        prompt: 'Why is "the diagram is the program" such an advantage when troubleshooting a function-block controller?',
        choices: [
            { id: 'a', text: 'It runs faster than scripted code.' },
            { id: 'b', text: 'A live wiresheet shows the current value on every wire, so you follow the wire back from a wrong output until the value stops making sense.', correct: true },
            { id: 'c', text: 'It uses less memory.' },
            { id: 'd', text: 'It hides the logic from other technicians.' }
        ],
        explain: 'There\'s no gap between documentation and code — the wiresheet is both, and it\'s live: every wire shows its current value. Troubleshooting becomes "follow the wire back from the wrong output until the value stops making sense." That, plus a vocabulary that travels across platforms (an AND, a comparator, a PID block mean the same everywhere), is why function blocks won the building-automation world.',
        learnMore: { href: '/education/function-blocks.html#why', label: 'Function Blocks — Why controls people work this way' },
        tags: ['function-blocks', 'logic']
    }
];
