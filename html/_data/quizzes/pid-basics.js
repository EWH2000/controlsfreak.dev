// Question bank for the PID Basics quiz, exposed to Nunjucks as
// `quizzes['pid-basics']`. Lives in _data/ so two consumers read one
// source: the page's inline JS (mounts the engine in the browser) and
// the FAQPage JSON-LD emitter in head.njk (indexable Q&A for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_pid-basics_* localStorage keys. Pairs with the PID Basics
// lesson; learnMore hrefs deep-link the P/I/D term callouts.

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
    }
];
