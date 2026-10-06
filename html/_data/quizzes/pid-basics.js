// Question bank for the PID Basics quiz, exposed to Nunjucks as
// `quizzes['pid-basics']`. Lives in _data/ so two consumers read one
// source: the page's inline JS (mounts the engine in the browser) and
// the FAQPage JSON-LD emitter in head.njk (indexable Q&A for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_pid-basics_* localStorage keys. Pairs with the PID Basics
// lesson; learnMore hrefs deep-link the P/I/D term callouts (and the
// Sim 1 card, #sim1, for the raise-the-gain droop trap). The
// wiresheet paragraph near the end of the lesson has no anchor of its
// own, so its question deep-links Function-Block Basics' block-families
// section (#families), whose Control callout makes the same point.
//
// The bank is deliberately larger than the page's defaultCount (10):
// the engine samples an overflowing bank, so each run draws a
// different subset (buildQueue() in quiz-engine.js). Coverage tracks
// the lesson's sections — P (what it answers to, droop, proportional
// band, the error-as-percent-of-span worked example, and why raising
// the gain never closes the droop), I (erasing the offset, too-fast
// reset, integral time vs repeats per minute, why it does the real
// work), D (noise, derivative-on-measurement, the overshoot sweet
// spot, the Td-from-Ti starting point, and why fast clean loops skip
// it), and where the loop lives in a controller — one block on the
// wiresheet.

module.exports = [
    // ── P — Proportional ───────────────────────────────────
    {
        type: 'mcq',
        id: 'p-proportional-to',
        prompt: 'The proportional term produces an output that is proportional to what?',
        choices: [
            { id: 'a', text: 'The current error — how far the PV is from setpoint right now.', correct: true },
            { id: 'b', text: 'The accumulated error over time.' },
            { id: 'c', text: 'How fast the PV is changing.' },
            { id: 'd', text: 'The setpoint value itself.' }
        ],
        explain: 'P responds to the present error: twice as far off, twice as much push. Accumulated error is integral; rate of change is derivative. Higher gain means a stronger, faster proportional response — but push too hard and the loop overshoots and hunts.',
        learnMore: { href: '/education/pid-basics.html#p-term', label: 'PID Basics — P, Proportional' },
        tags: ['pid', 'proportional']
    },
    {
        type: 'mcq',
        id: 'p-droop',
        prompt: 'Why does proportional-only control always settle a little short of setpoint — the steady-state offset called droop?',
        choices: [
            { id: 'a', text: 'The sensor reads low at steady state.' },
            { id: 'b', text: 'P needs some error to produce any output, so the loop can\'t hold a non-zero output at zero error — it settles where a small residual error sustains the output it needs.', correct: true },
            { id: 'c', text: 'The gain is always set too low.' },
            { id: 'd', text: 'Droop only happens on fast loops.' }
        ],
        explain: 'Proportional output is gain × error. To hold a valve part-open at steady state, P needs a non-zero error to multiply — at exactly zero error it would command zero output. So the loop parks a hair short of setpoint, where the residual error produces just enough output to hold position. Closing that last gap is exactly what integral is for.',
        learnMore: { href: '/education/pid-basics.html#p-term', label: 'PID Basics — P, Proportional' },
        tags: ['pid', 'proportional']
    },
    {
        type: 'numeric',
        id: 'proportional-band',
        prompt: 'A loop has a proportional gain (Kc) of 5. Proportional band is 100 ÷ gain. What\'s the proportional band, in percent?',
        answer: 20,
        tolerance: 0.5,
        unit: '%',
        explain: 'PB = 100 ÷ gain = 100 ÷ 5 = 20 %. A 20 % proportional band means the output swings across its full range as the input moves across 20 % of its span — the narrower the band, the more aggressive the loop. PB and gain are just two ways of expressing the same knob (PB = 100/gain), and different vendors prefer different ones.',
        learnMore: { href: '/education/pid-basics.html#p-term', label: 'PID Basics — P, Proportional' },
        tags: ['pid', 'proportional']
    },

    {
        type: 'numeric',
        id: 'p-output-percent-of-span',
        prompt: 'A chilled-water valve loop runs proportional-only with a gain of 3. SP = 55 °F (12.8 °C), PV = 61 °F (16.1 °C), and the input span is 20 °F (11.1 °C). Working the error as a percent of span, then multiplying by the gain, what\'s the proportional output, in percent?',
        answer: 90,
        tolerance: 1,
        unit: '%',
        explain: 'The error is 61 − 55 = 6 °F (3.3 °C) — PV above SP, which is the error that drives a cooling (direct-acting) loop open. 6 ÷ 20 = 30 % of span. Output = gain × error = 3 × 30 % = 90 % — the valve is driven most of the way open. As the supply cools and PV falls toward 55 °F (12.8 °C), the error shrinks and the output backs off in proportion; with P alone it parks a hair short of setpoint.',
        learnMore: { href: '/education/pid-basics.html#p-term', label: 'PID Basics — P, Proportional' },
        tags: ['pid', 'proportional']
    },
    {
        type: 'gotcha',
        id: 'raise-gain-to-kill-droop',
        prompt: 'A proportional-only space-temperature loop keeps parking just under setpoint. A tech doubles the gain to push it the rest of the way. What happens?',
        snippet: '<pre class="quiz-snippet">before:  P only, PV settles 1 °F (0.6 °C) under SP\nchange:  gain doubled\nhope:    PV lands right on setpoint</pre>',
        choices: [
            { id: 'a', text: 'PV lands on setpoint — twice the gain is twice the push, which covers the last bit of error.' },
            { id: 'b', text: 'The offset shrinks but never closes; push the gain far enough and the loop hunts instead. Integral is what closes the gap.', correct: true },
            { id: 'c', text: 'The offset grows, because a higher gain makes the loop more sluggish.' },
            { id: 'd', text: 'Nothing changes at steady state — gain only sets how fast the loop gets there.' }
        ],
        explain: 'Doubling the gain roughly halves the residual error — it never zeroes it. On Sim 1\'s Medium loop, going from gain 2 to gain 4 takes the offset from about 7.7 °F (4.3 °C) to 5.1 °F (2.8 °C): tighter, still there. Push the gain far enough on a real loop with dead time and it overshoots and hunts. The droop is integral\'s job, not a reason to crank P.',
        learnMore: { href: '/education/pid-basics.html#sim1', label: 'PID Basics — Sim 1, P only' },
        tags: ['pid', 'proportional']
    },

    // ── I — Integral / Reset ───────────────────────────────
    {
        type: 'mcq',
        id: 'integral-erases-offset',
        prompt: 'What does the integral (reset) term do that proportional alone cannot?',
        choices: [
            { id: 'a', text: 'React faster to a sudden disturbance.' },
            { id: 'b', text: 'Keep nudging the output for as long as any error remains, driving the steady-state offset to zero.', correct: true },
            { id: 'c', text: 'Prevent the loop from ever overshooting.' },
            { id: 'd', text: 'Filter noise out of the measurement.' }
        ],
        explain: 'Integral accumulates error over time and keeps moving the output in the same direction while any error remains — so it erases the droop that P leaves behind. On most slow HVAC loops it\'s the term doing the real work. The cost is that it can overshoot if it acts too fast.',
        learnMore: { href: '/education/pid-basics.html#i-term', label: 'PID Basics — I, Integral / Reset' },
        tags: ['pid', 'integral']
    },
    {
        type: 'mcq',
        id: 'integral-too-fast',
        prompt: 'You set the integral term too fast (too many repeats per minute). What\'s the characteristic symptom?',
        choices: [
            { id: 'a', text: 'A permanent offset the loop never closes.' },
            { id: 'b', text: 'Overshoot and a slow rolling oscillation around setpoint instead of a clean approach.', correct: true },
            { id: 'c', text: 'The output never moves at all.' },
            { id: 'd', text: 'The measurement gets noisier.' }
        ],
        explain: 'Too-fast integral keeps cranking before the process has caught up, so the loop sails past setpoint and rolls back, hunting around the line you were trying to hold. Too slow and it takes forever to close the last bit of the gap. That trade-off is the heart of tuning the reset term.',
        learnMore: { href: '/education/pid-basics.html#i-term', label: 'PID Basics — I, Integral / Reset' },
        tags: ['pid', 'integral']
    },
    {
        type: 'numeric',
        id: 'integral-time',
        prompt: 'Integral time (minutes per repeat) is the inverse of reset rate (repeats per minute). A loop is set to 0.2 repeats per minute. What\'s the integral time, in minutes?',
        answer: 5,
        tolerance: 0.1,
        unit: 'min',
        explain: 'Ti = 1 ÷ reset rate = 1 ÷ 0.2 = 5 min. Repeats-per-minute and minutes-per-repeat are reciprocals — the same knob expressed two ways, and vendors split on which they show. A reset of 0.2 rep/min is a fairly gentle 5-minute integral, suited to a slow loop; bumping it toward 2 rep/min (Ti = 30 s) is where overshoot starts.',
        learnMore: { href: '/education/pid-basics.html#i-term', label: 'PID Basics — I, Integral / Reset' },
        tags: ['pid', 'integral']
    },
    {
        type: 'tf',
        id: 'integral-does-the-work',
        prompt: 'On most slow HVAC loops, integral (reset) is the term doing the real work of holding the process at setpoint.',
        answer: true,
        explain: 'True. P gets the output into the neighborhood but leaves droop; on slow HVAC processes integral is what actually closes the gap and holds it. Derivative is usually small or off. That\'s why the everyday HVAC loop is PI, not full PID.',
        learnMore: { href: '/education/pid-basics.html#i-term', label: 'PID Basics — I, Integral / Reset' },
        tags: ['pid', 'integral']
    },

    // ── D — Derivative / Rate ──────────────────────────────
    {
        type: 'mcq',
        id: 'derivative-noise',
        prompt: 'Why is the derivative term usually small or zero on HVAC loops?',
        choices: [
            { id: 'a', text: 'It slows the loop down too much.' },
            { id: 'b', text: 'It acts on the rate of change of the measurement, and on a slow, noisy sensor that\'s mostly amplified noise.', correct: true },
            { id: 'c', text: 'It causes permanent offset.' },
            { id: 'd', text: 'Controllers don\'t support it.' }
        ],
        explain: 'Derivative reacts to how fast the PV is moving — useful for braking early on a laggy process. But it amplifies sensor noise, so on a twitchy input it does more harm than good. Most HVAC loops are slow and a little noisy, so they run PI and leave D at zero. Where it earns its keep is a big, laggy coil with a clean signal.',
        learnMore: { href: '/education/pid-basics.html#d-term', label: 'PID Basics — D, Derivative / Rate' },
        tags: ['pid', 'derivative']
    },
    {
        type: 'gotcha',
        id: 'derivative-on-measurement',
        prompt: 'A loop runs fine until an operator changes the setpoint — at which point the output kicks hard for an instant. The derivative term is enabled. What\'s going on, and what\'s the fix?',
        snippet: '<pre class="quiz-snippet">event:   operator steps the setpoint\noutput:  sharp momentary spike\nD term:  enabled (derivative on error)</pre>',
        choices: [
            { id: 'a', text: 'The integral term wound up; lower the reset rate.' },
            { id: 'b', text: 'Derivative acting on error sees the setpoint step as an instantaneous huge rate of change. Switch to derivative-on-measurement, which only reacts to the PV moving.', correct: true },
            { id: 'c', text: 'The proportional gain is too low; raise it.' },
            { id: 'd', text: 'Nothing is wrong — a setpoint kick is unavoidable.' }
        ],
        explain: 'Error = setpoint − measurement. If derivative acts on error, a step change in setpoint looks like an infinite rate of change for one instant, and D slams the output. Derivative-on-measurement computes the rate from the PV alone, which doesn\'t jump when the operator moves the setpoint — so the kick disappears while you keep D\'s braking benefit. Most controllers offer this as a configuration option.',
        learnMore: { href: '/education/pid-basics.html#d-term', label: 'PID Basics — D, Derivative / Rate' },
        tags: ['pid', 'derivative']
    },
    {
        type: 'mcq',
        id: 'derivative-overshoot',
        prompt: 'On an overshooting, ringing P + I loop with a clean signal, what does adding a little derivative do — and what happens if you keep cranking it up?',
        choices: [
            { id: 'a', text: 'It removes the steady-state offset; more is always better.' },
            { id: 'b', text: 'A little D brakes as the PV races toward setpoint and crushes the overshoot; too much and the loop just turns sluggish.', correct: true },
            { id: 'c', text: 'It speeds the loop up without limit.' },
            { id: 'd', text: 'It has no effect until the gain is also raised.' }
        ],
        explain: 'Derivative sees PV racing toward setpoint and starts backing off early, so a small amount collapses the overshoot at almost no cost. But it\'s a brake — pile on too much and the loop becomes sluggish, and on a real noisy sensor it would start jittering. The sweet spot is small; beyond it you trade overshoot for slowness.',
        learnMore: { href: '/education/pid-basics.html#d-term', label: 'PID Basics — D, Derivative / Rate' },
        tags: ['pid', 'derivative']
    },
    {
        type: 'mcq',
        id: 'derivative-starting-td',
        prompt: 'A big hot-water reheat coil with several minutes of lag runs PI with an integral time (Ti) of 8 min, and it still overshoots. The sensor signal is clean, so rather than slow the reset or drop the gain, the tech decides to add a little derivative. What is a reasonable starting Td?',
        choices: [
            { id: 'a', text: 'About 1 to 2 min — roughly a quarter to an eighth of Ti.', correct: true },
            { id: 'b', text: '8 min — match Td to Ti so the two terms balance.' },
            { id: 'c', text: '16 to 32 min — derivative has to look further ahead than integral looks back.' },
            { id: 'd', text: 'A few seconds — on HVAC, derivative should only ever be a token amount.' }
        ],
        explain: 'A common starting point is Td of roughly ¼ to ⅛ of Ti, so 8 ÷ 4 = 2 min down to 8 ÷ 8 = 1 min. That is enough for the loop to see PV racing toward setpoint and back off early while heat is still on its way through the coil. Start there and trim on the real loop — too much D and the response turns sluggish.',
        learnMore: { href: '/education/pid-basics.html#d-term', label: 'PID Basics — D, Derivative / Rate' },
        tags: ['pid', 'derivative']
    },
    {
        type: 'tf',
        id: 'fast-loop-skips-derivative',
        prompt: 'On a fast, clean loop such as duct static pressure or VFD speed, adding derivative is the usual way to tighten control.',
        answer: false,
        explain: 'False. Derivative earns its keep on a process with a lot of lag, where P + I keeps pushing while the effect is still on its way. A fast loop has little lag to anticipate, so D buys almost nothing and still amplifies whatever noise the sensor carries. Fast, clean loops run PI.',
        learnMore: { href: '/education/pid-basics.html#d-term', label: 'PID Basics — D, Derivative / Rate' },
        tags: ['pid', 'derivative']
    },

    // ── Where the loop lives ───────────────────────────────
    {
        type: 'mcq',
        id: 'pid-block-on-wiresheet',
        prompt: 'In a building-automation controller, how does the PID loop you tune usually appear on the wiresheet?',
        choices: [
            { id: 'a', text: 'As a single block: setpoint and measurement wired in on the left, a 0–100 % command leaving on the right.', correct: true },
            { id: 'b', text: 'As three separate P, I and D blocks whose outputs you sum by hand.' },
            { id: 'c', text: 'It doesn\'t appear — the loop is a fixed routine set only from the controller\'s front panel.' },
            { id: 'd', text: 'As a block that outputs the raw error, which the actuator integrates into a position.' }
        ],
        explain: 'The whole PID — all three terms — lives in one block. A setpoint and a measurement come in, the 0–100 % command goes out to the valve or damper, and the rest of the sequence is the supporting blocks that feed and gate it. Knowing that shape is what lets you find the loop on an unfamiliar sheet.',
        learnMore: { href: '/education/function-blocks.html#families', label: 'Function-Block Basics — The block families' },
        tags: ['pid', 'function-blocks']
    }
];
