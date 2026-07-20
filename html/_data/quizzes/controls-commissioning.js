// Question bank for the Controls Commissioning field drill, exposed to
// Nunjucks as `quizzes['controls-commissioning']`. See the sibling
// modbus-decoding.js header for the data-vs-template rationale.
//
// Field drill (no single paired lesson): controls functional testing —
// point-to-point checkout method per point type, interlock verification
// against design intent, trends as proof over time, and the turnover
// record. Deliberately weighted toward the method / trends / turnover /
// loop sections of education/controls-commissioning.html, because the
// Controller Swap drill already spends the priority-array override
// angle and Field Wiring & Sensors already spends the live zero and the
// mA-to-engineering-units scaling math.
//
// Analog span arithmetic is spent across the corpus and is off-limits
// here: Commanding Actuators owns the 2-10 V actuator both ways
// (span-math-five-volts, span-math-fifty-percent), and Analog Sensing,
// Field Wiring & Sensors, and Duct Static Control each own a
// mA-or-V-to-engineering-units conversion. Check ALL banks, not just
// the drills, before adding a numeric — this bank's first numeric
// duplicated span-math-fifty-percent outright (same 2-10 V actuator,
// same 50 % command, same 6 V answer) and had to be replaced.
//
// This bank holds 11, not the 10 every other bank happens to hold —
// the hardwired-safety question was cut during the build and the owner
// asked for it back. That is fine and needs no page-level special
// casing: the engine draws a random 10 of them per run and presents
// that subset in bank order, so the 11th is reachable and a repeat run
// is a different drill. Grow this bank freely; the page keeps the
// site-wide defaultCount: 10 and the "Ten questions" intro stays
// accurate at any bank size. See buildQueue() in quiz-engine.js.

module.exports = [
    // ── The idea: checkout runs from the field toward the front end ──
    {
        type: 'mcq',
        id: 'checkout-runs-from-the-field',
        prompt: 'Two techs check the same mixed-air sensor. One sees 55 °F (12.8 °C) on the graphic and moves on. The other puts a decade box on the input, dials in the resistance that should read 55 °F (12.8 °C), and confirms the controller agrees. Why is only the second one a checkout?',
        choices: [
            { id: 'a', text: 'The graphic refreshes too slowly to trust for commissioning.' },
            { id: 'b', text: 'A graphic can be right for the wrong reasons — wrong object mapping, wrong range scaling, or swapped wires all report believable numbers. Only a known input at the field end proves the whole chain.', correct: true },
            { id: 'c', text: 'Decade boxes are more accurate than the sensor, so the reading is better data.' },
            { id: 'd', text: 'The graphic reads a cached value, so it can never be used for verification.' }
        ],
        explain: 'Checkout runs <em>from the field toward the front end</em>, because the field is the ground truth and the graphic is the thing on trial. A point mapped to the wrong object reads plausibly. A transmitter scaled on the wrong range tracks in the right direction and lies about the magnitude. Two swapped wires each report a believable number. None of that shows up from the front end — it shows up when you make something known happen at the device and check whether the controller agrees.',
        learnMore: { href: '/education/controls-commissioning.html#ccx-p2p', label: 'Controls Commissioning — Point-to-point checkout' },
        tags: ['commissioning', 'point-to-point', 'method']
    },

    // ── Method, per point type ───────────────────────────
    {
        type: 'mcq',
        id: 'ao-command-proves-direction-and-span',
        prompt: 'Commissioning an AO to a modulating valve actuator, you command 0, 50, and 100 % and go watch the valve. What two things is that three-point command proving?',
        choices: [
            { id: 'a', text: 'Loop gain and integral time.' },
            { id: 'b', text: 'Valve Cv and close-off rating.' },
            { id: 'c', text: 'Direction and span — that the valve strokes the right way, and that it sweeps its full travel.', correct: true },
            { id: 'd', text: 'Actuator hysteresis and stroke time.' }
        ],
        explain: 'Direction catches the reversed action — an actuator wired or configured for the wrong sense strokes backwards, driving wide open on a 0 % command, and the loop fights itself all season. Span catches the actuator that only sweeps part of its travel because its range setting and the software range disagree. Both are invisible from the front end, and both look like a tuning problem later if you skip this. A drive gets the same three commands, plus a confirmation of rotation direction — once, during checkout, before it matters.',
        learnMore: { href: '/education/controls-commissioning.html#ccx-method', label: 'Controls Commissioning — The method, per point type' },
        tags: ['commissioning', 'ao', 'method']
    },
    {
        type: 'tf',
        id: 'bi-state-change-is-not-polarity',
        prompt: 'A binary input\'s checkout is complete once you have actuated the real field contact and watched the point change state.',
        answer: false,
        explain: 'A state change proves the wiring is continuous and the input is alive. It does not prove the <em>sense</em> is right. A normally-closed contact read as normally-open inverts the whole meaning, so "fan running" annunciates as "fan failed" — and the point still changes state obediently every time you exercise it. You have to know which physical condition you created and confirm that OPEN / CLOSED lands where the sequence expects it, not merely that it moved.',
        learnMore: { href: '/education/controls-commissioning.html#ccx-method', label: 'Controls Commissioning — The method, per point type' },
        tags: ['commissioning', 'bi', 'polarity', 'method']
    },
    {
        type: 'gotcha',
        id: 'bo-command-and-watch-the-equipment',
        prompt: 'You are checking out the exhaust-fan BO from the laptop at the panel. You command it on, and the graphic\'s exhaust-fan symbol turns green with proof satisfied. What is still unproven?',
        snippet: '<pre class="quiz-snippet">command:   EF-1 BO2 → ON\ngraphic:   EF-1 running ✓  (proof BI satisfied)\nobserved at the equipment:  ?</pre>',
        choices: [
            { id: 'a', text: 'Nothing — a satisfied proof input is the equipment confirming itself.' },
            { id: 'b', text: 'That the load which actually started is the one the schedule names. Outputs landed backwards drive the wrong equipment, and the graphic reports the command, not the machine.', correct: true },
            { id: 'c', text: 'The fan motor\'s full-load amps against the nameplate.' },
            { id: 'd', text: 'Whether the exhaust fan is correctly sized for the space.' }
        ],
        explain: 'The classic BO catch is the mislabeled or swapped pair: you command the exhaust fan and the supply fan starts, because the two outputs are landed backwards or the panel and the schedule disagree. Note that the proof input does not save you — if the proof BI is landed on the same wrong machine, the pair is self-consistently wrong and the graphic looks perfect. The only thing that settles it is going to the equipment and watching which one spun up.',
        learnMore: { href: '/education/controls-commissioning.html#ccx-method', label: 'Controls Commissioning — The method, per point type' },
        tags: ['commissioning', 'bo', 'method']
    },

    // ── Interlocks against design intent ─────────────────
    {
        type: 'mcq',
        id: 'interlock-is-the-whole-response',
        prompt: 'The sequence says a freeze trip shall stop the supply fan, close the outside-air damper, drive the heating valve open, and annunciate an alarm. You trip the freezestat and the freeze point goes to ALARM on the graphic. Is the interlock verified?',
        choices: [
            { id: 'a', text: 'Yes — the alarm proves the trip point is wired and the logic saw it.' },
            { id: 'b', text: 'No. The alarm is one of four promised reactions; the interlock is the relationship, so every programmed response has to be observed.', correct: true },
            { id: 'c', text: 'Yes, provided the alarm clears when the freezestat resets.' },
            { id: 'd', text: 'No — a freezestat can only be verified by lowering the actual mixed-air temperature.' }
        ],
        explain: 'Proving each point moves is necessary and not sufficient. A sequence is a set of <em>relationships</em>: this condition trips, so those outputs respond. Verifying one means making the triggering condition real and confirming the whole programmed reaction — fan off, damper closed, valve open, alarm annunciated — not confirming that the trigger point merely reads. It is entirely possible for the alarm to annunciate while one of the three output responses was never programmed, and the alarm looks like success.',
        learnMore: { href: '/education/controls-commissioning.html#ccx-interlocks', label: 'Controls Commissioning — Interlocks and sequence logic' },
        tags: ['commissioning', 'interlocks', 'sequence']
    },
    {
        type: 'gotcha',
        id: 'hardwired-trip-must-act-on-its-own',
        prompt: 'A freezestat is hardwired into the supply-fan starter circuit, and it also lands on a BI so the controller can annunciate the alarm and shut the unit down in software. Here is the test that was run to verify it. Why does this not verify the hardwired trip?',
        snippet: '<pre class="quiz-snippet">action:  freezestat tripped by hand at the device\nBI:      FREEZE ALARM   (controller saw it)\nBO:      SF-1 → OFF     (software dropped the fan)\nfan:     stopped ✓</pre>',
        choices: [
            { id: 'a', text: 'It does — the fan stopped, and stopping the fan is the required response.' },
            { id: 'b', text: 'Both paths were live, so the software would have dropped that fan whether or not the hardwired trip was intact. Nothing in the record shows the copper could have stopped it on its own.', correct: true },
            { id: 'c', text: 'A hand trip is not a valid test — the element has to be chilled below its actual setting for the result to count.' },
            { id: 'd', text: 'One freezestat should never serve both a hardwired trip and a BI, so the arrangement itself is the defect.' }
        ],
        explain: 'A hardwired safety exists for exactly the moments the controller cannot be trusted — a railed sensor, a hung program, a value stuck at a number that looks perfectly reasonable and that nothing downstream knows is wrong. A test with both paths live cannot say anything about the one that matters, because the software drops that fan either way — a jumpered-out contact, a broken wire, a trip landed on the wrong terminal, and this record still reads exactly the same. Prove the copper by taking the software out of the path and leaving it watching: hold the fan <em>commanded on</em> from the controller, trip the freezestat, and confirm the fan drops anyway while the BO still reads ON. That is the whole shape of the arrangement — the controller reports the trip, the wiring performs it. Restore the command and verify the software response as its own step, so the record ends with both paths proven instead of one of them assumed.',
        learnMore: { href: '/education/controls-commissioning.html#ccx-interlocks', label: 'Controls Commissioning — Interlocks and sequence logic' },
        tags: ['commissioning', 'interlocks', 'safety']
    },

    // ── Trends: proof over time ──────────────────────────
    {
        type: 'mcq',
        id: 'trends-catch-what-a-walk-cannot',
        prompt: 'A point-to-point walk passed every line of the I/O schedule. Which of these failures is it still most likely to have missed?',
        choices: [
            { id: 'a', text: 'An input scaled to the wrong range.' },
            { id: 'b', text: 'An actuator that only strokes part of its travel.' },
            { id: 'c', text: 'A swapped pair of binary outputs.' },
            { id: 'd', text: 'A loop that settles fine when you nudge it but hunts for twenty minutes after a real load step.', correct: true }
        ],
        explain: 'The first three are exactly what a walk catches — they are all visible the moment you exercise the point. The fourth is not, because it only appears across real operating swings, and a checkout nudge is not a load step. A walk proves a point moved once; it does not prove the loop holds setpoint at three in the morning, that lead/lag actually rotated on schedule, or that staging does not short-cycle on a marginal deadband. That proof lives in trends. A commissioning record that ends at the walk has proven the plumbing — the trends are what prove the sequence.',
        learnMore: { href: '/education/controls-commissioning.html#ccx-trends', label: 'Controls Commissioning — Trend logs, proof over time' },
        tags: ['commissioning', 'trends', 'loops']
    },
    {
        type: 'mcq',
        id: 'reset-that-never-moves',
        prompt: 'A hot-water plant runs outdoor-air reset. A week of trends shows the supply-water setpoint parked at its design value every day, mild ones included. What does the trend tell you that a spot check at the panel would not?',
        choices: [
            { id: 'a', text: 'That the reset schedule\'s slope is set too steep.' },
            { id: 'b', text: 'That the reset is not executing at all — a single reading on any one day looks identical to a reset that never moves.', correct: true },
            { id: 'c', text: 'That the boiler is oversized for the building.' },
            { id: 'd', text: 'That the outdoor-air sensor is reading high.' }
        ],
        explain: 'A snapshot cannot distinguish "correct for today\'s conditions" from "stuck." Design value on a design day is the right answer; design value on a mild day is a failure — and the two look the same in a single reading. Only the record across changing conditions separates them. The usual causes are mundane: the reset block was never enabled, its input was never bound, or the schedule\'s endpoints collapsed onto one value. All three read as a perfectly plausible setpoint at the panel.',
        learnMore: { href: '/education/controls-commissioning.html#ccx-trends', label: 'Controls Commissioning — Trend logs, proof over time' },
        tags: ['commissioning', 'trends', 'reset']
    },
    {
        type: 'numeric',
        id: 'trend-buffer-wrap-hours',
        prompt: 'You set up a trend on a hunting discharge-air loop before leaving Friday, sampling every 1 minute. The controller allocates the log a 600-sample buffer, and it overwrites the oldest sample once full. How many hours of history does it hold before it starts wrapping?',
        answer: 10,
        tolerance: 0,
        unit: 'h',
        inputmode: 'decimal',
        explain: '600 samples × 1 minute = 600 minutes = <strong>10 hours</strong>. That is the whole trap: you left it Friday afternoon to catch a weekend behavior and came back Monday to a log whose oldest sample is Sunday night. The buffer did not fail — it did exactly what it was configured to do, and quietly discarded the swings you set it up to capture. Interval and buffer depth trade against each other: a fast interval resolves a hunting loop but buys you very little history, while a slow one spans the weekend and can miss the oscillation entirely. Size the log against the span you need to observe, or use change-of-value so samples are only spent when the point actually moves.',
        learnMore: { href: '/education/controls-commissioning.html#ccx-trends', label: 'Controls Commissioning — Trend logs, proof over time' },
        tags: ['commissioning', 'trends', 'method']
    },

    // ── The loop, once per point ─────────────────────────
    {
        type: 'tf',
        id: 'document-and-clear-per-point',
        prompt: 'A point\'s checkout is finished once you have confirmed it against the sequence — writing it up and releasing the force can be swept up together at the end of the day.',
        answer: false,
        explain: 'The loop is exercise → watch the field device → confirm against the sequence → document it and clear the force, and it closes once per point. Batching the last step turns it into memory work at the end of a long day, which is precisely when a point gets skipped. The stakes are asymmetric, too: an undocumented pass costs you a re-test, but an uncleared force is a live hazard the logic cannot see — the sequence is executing correctly and being ignored. A forced AO holds a heating valve open into a summer coil; a defeated freeze interlock leaves nothing between a cold night and a burst coil.',
        learnMore: { href: '/education/controls-commissioning.html#ccx-overrides', label: 'Controls Commissioning — Override discipline, the safety spine' },
        tags: ['commissioning', 'overrides', 'workflow']
    },

    // ── Turnover ─────────────────────────────────────────
    {
        type: 'mcq',
        id: 'checkout-record-is-the-deliverable',
        prompt: 'At turnover, what is the actual deliverable of controls functional testing?',
        choices: [
            { id: 'a', text: 'A building that runs correctly on the day of the walkthrough.' },
            { id: 'b', text: 'The backup of the as-built application program.' },
            { id: 'c', text: 'The completed record — every point, what exercised it, the observed result, pass or fail, corrections noted — plus an issues log for whatever is still open.', correct: true },
            { id: 'd', text: 'A signed acceptance letter from the owner\'s representative.' }
        ],
        explain: 'The deliverable is not a working building — it is the <em>proof</em> that the building was verified, point by point, with a name and a date on it. Anything still open goes on the issues log so nothing falls through the seam between "commissioned" and "occupied." The second reason the record matters is the next tech: a year from now, when a sensor drifts or a controller gets swapped, whoever is standing at that panel should be able to read what "right" looked like on the day it was proven. That is what turning a system over means — not "it runs," but "here is the proof it runs, and here is how you will know when it stops."',
        learnMore: { href: '/education/controls-commissioning.html#ccx-turnover', label: 'Controls Commissioning — Documentation and turnover' },
        tags: ['commissioning', 'turnover', 'documentation']
    }
];
