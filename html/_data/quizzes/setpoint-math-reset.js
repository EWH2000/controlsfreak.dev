// Question bank for the Setpoint Math & Reset quiz, exposed to Nunjucks
// as `quizzes['setpoint-math-reset']`. Lives in _data/ so two consumers
// read one source: the page's inline JS (mounts the engine in the
// browser) and the FAQPage JSON-LD emitter in head.njk (indexable Q&A
// for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_setpoint-math-reset_* localStorage keys. Pairs with the
// Setpoint Math & Reset Schedules lesson; learnMore hrefs deep-link its
// <h2> anchors. The two interpolation numerics deliberately use
// DIFFERENT endpoints than the lesson's 180-at-0 / 140-at-60 schedule,
// so a pass proves the method rather than the memorized answer. Metric
// figures are static parentheticals (the units walker doesn't reach
// engine-painted prompts), one decimal, per the worked-example rounding
// policy.

module.exports = [
    // ── The linear reset — interpolation ───────────────────
    {
        type: 'numeric',
        id: 'smr-interpolate-hw',
        prompt: 'A hot-water reset schedule calls for 160 °F (71.1 °C) water at 10 °F (−12.2 °C) outdoors, sliding to 120 °F (48.9 °C) at 60 °F (15.6 °C). What setpoint does the schedule compute on a 35 °F (1.7 °C) day? Enter the answer in °F.',
        answer: 140,
        tolerance: 0.5,
        unit: '°F',
        explain: 'Two points make the line: m = (120 − 160) ÷ (60 − 10) = −40 ÷ 50 = −0.8 °F of water per °F outdoors. From the cold endpoint: SP = 160 + (−0.8) × (35 − 10) = 160 − 20 = 140 °F (60.0 °C). Sanity check without algebra: 35 °F sits exactly halfway through the 10-to-60 outdoor span, so the setpoint sits exactly halfway down the 160-to-120 water span.',
        learnMore: { href: '/education/setpoint-math-reset.html#reset', label: 'Setpoint Math — The Linear Reset' },
        tags: ['setpoint-math-reset', 'programming', 'reset']
    },
    {
        type: 'numeric',
        id: 'smr-interpolate-sat',
        prompt: 'A discharge-air reset on a small AHU supplies 65 °F (18.3 °C) air at 50 °F (10.0 °C) outdoors, sliding to 55 °F (12.8 °C) at 70 °F (21.1 °C). What discharge setpoint does it compute at 58 °F (14.4 °C) outdoors? Enter the answer in °F.',
        answer: 61,
        tolerance: 0.5,
        unit: '°F',
        explain: 'Same method, different equipment: m = (55 − 65) ÷ (70 − 50) = −10 ÷ 20 = −0.5. From the 50 °F endpoint: SP = 65 + (−0.5) × (58 − 50) = 65 − 4 = 61 °F (16.1 °C). Once you can derive m from any two endpoints, every linear reset — hot water, discharge air, DP — is the same three lines of arithmetic.',
        learnMore: { href: '/education/setpoint-math-reset.html#reset', label: 'Setpoint Math — The Linear Reset' },
        tags: ['setpoint-math-reset', 'programming', 'reset']
    },
    {
        type: 'mcq',
        id: 'smr-derive-slope',
        prompt: 'A boiler reset schedule runs 190 °F (87.8 °C) water at −5 °F (−20.6 °C) outdoors and 130 °F (54.4 °C) at 55 °F (12.8 °C). What is the slope of the schedule?',
        choices: [
            { id: 'a', text: '−1.0 — the setpoint drops one degree of water per degree of outdoor rise.', correct: true },
            { id: 'b', text: '+1.0 — the setpoint climbs one degree per degree of outdoor rise.' },
            { id: 'c', text: '−0.5 — half a degree of water per outdoor degree.' },
            { id: 'd', text: '−60 — the full water span.' }
        ],
        explain: 'Rise over run: m = (130 − 190) ÷ (55 − (−5)) = −60 ÷ 60 = −1.0. Watch the run when an endpoint is negative — 55 − (−5) is 60, not 50. The sign is the sanity check: water slides down as outdoor air climbs, so a reset slope is negative. (A slope of −1 is one of the few that reads the same in metric: −33.4 ÷ 33.4 °C is −1.0 too, because it is a ratio of deltas.)',
        learnMore: { href: '/education/setpoint-math-reset.html#reset', label: 'Setpoint Math — The Linear Reset' },
        tags: ['setpoint-math-reset', 'programming', 'reset', 'slope']
    },

    // ── The chain, block by block ──────────────────────────
    {
        type: 'mcq',
        id: 'smr-chain-roles',
        prompt: 'In the reset chain <code>AI → MUL → ADD → LIMIT → AO</code>, what does the ADD block contribute?',
        choices: [
            { id: 'a', text: 'The intercept b — it shifts the sloped value up to the schedule\'s anchor so the line passes through the design endpoints.', correct: true },
            { id: 'b', text: 'The slope m — it scales the outdoor temperature.' },
            { id: 'c', text: 'The clamp — it keeps the result inside the design band.' },
            { id: 'd', text: 'It averages the outdoor sensor with the setpoint.' }
        ],
        explain: 'The chain is y = mx + b read left to right: the MUL applies the slope m to the outdoor temperature, the ADD adds the intercept b, and the LIMIT clamps the result to the design band. Without the ADD, the sheet computes m × OAT alone — a line through zero that has nothing to do with the design water temperatures.',
        learnMore: { href: '/education/setpoint-math-reset.html#reset', label: 'Setpoint Math — The Linear Reset' },
        tags: ['setpoint-math-reset', 'programming', 'reset', 'blocks']
    },
    {
        type: 'mcq',
        id: 'smr-limit-cold-snap',
        prompt: 'The lesson\'s schedule (180 °F at 0 °F outdoors, slope −0.667) is running WITHOUT its LIMIT block. A cold snap drops the outdoor air to −10 °F (−23.3 °C). What does the chain command?',
        choices: [
            { id: 'a', text: 'About 186.7 °F (85.9 °C) — the line keeps extrapolating past the design endpoint, and the deeper the cold, the hotter the request.', correct: true },
            { id: 'b', text: '180 °F — a reset schedule stops at its endpoints on its own.' },
            { id: 'c', text: '140 °F — the schedule fails to its low end.' },
            { id: 'd', text: 'The MUL block errors out on the negative input.' }
        ],
        explain: 'A straight line doesn\'t know where the design range ends: −0.667 × (−10) + 180 = 6.7 + 180 = 186.7 °F (85.9 °C), and colder weather asks for more still. The endpoints live only in the LIMIT block — that clamp is what keeps a math chain from commanding water the boiler, piping, and high-limit were never sized for. Negative numbers are ordinary inputs to a MUL; nothing errors.',
        learnMore: { href: '/education/setpoint-math-reset.html#reset', label: 'Setpoint Math — The Linear Reset' },
        tags: ['setpoint-math-reset', 'programming', 'reset', 'limit']
    },

    // ── Offsets and selects ────────────────────────────────
    {
        type: 'mcq',
        id: 'smr-offset-follows',
        prompt: 'A sheet computes its unoccupied heating setpoint as occupied SP 70 °F (21.1 °C) minus a 5 °F (2.8 °C) setback constant, through a SUB block — rather than storing 65 °F (18.3 °C) as its own constant. What does the computed version buy?',
        choices: [
            { id: 'a', text: 'One edit updates every mode — change the occupied setpoint and the setback value follows automatically.', correct: true },
            { id: 'b', text: 'The SUB block evaluates faster than a constant.' },
            { id: 'c', text: 'Nothing — the two are identical in every way.' },
            { id: 'd', text: 'It lets the setpoint go below the controller\'s minimum.' }
        ],
        explain: 'Maintenance arithmetic: one number should drive many decisions. When "make it a degree warmer" arrives, the computed sheet takes one constant edit and every derived value — band edges, setbacks, mode setpoints — follows. Two independent constants drift apart the first time someone edits one and forgets the other. The outputs are numerically identical today; the difference shows up at the next change.',
        learnMore: { href: '/education/setpoint-math-reset.html#offsets', label: 'Setpoint Math — Setpoints Are Computed, Not Typed' },
        tags: ['setpoint-math-reset', 'programming', 'offsets']
    },
    {
        type: 'mcq',
        id: 'smr-high-low-select',
        prompt: 'Five zone controllers each publish a heating demand (this hour: 20%, 45%, 30%, 65%, 10%), and the plant setpoint should satisfy the neediest zone. Separately, a computed setpoint must never exceed a hard equipment ceiling. Which blocks do those two jobs?',
        choices: [
            { id: 'a', text: 'MAX for the neediest zone (high-select), MIN against the ceiling (low-select).', correct: true },
            { id: 'b', text: 'MIN for the neediest zone, MAX against the ceiling.' },
            { id: 'c', text: 'ADD for the zones, SUB for the ceiling.' },
            { id: 'd', text: 'A SELECT block for both.' }
        ],
        explain: 'Ask what should win. Across zone demands the biggest request must win so every zone is satisfied — MAX passes the 65%: a high-select. Against a ceiling the limit must win — MIN of the computed value and the ceiling constant can never output more than the ceiling: a low-select. Swap them and the plant serves the laziest zone while the "ceiling" waves everything through.',
        learnMore: { href: '/education/setpoint-math-reset.html#offsets', label: 'Setpoint Math — Setpoints Are Computed, Not Typed' },
        tags: ['setpoint-math-reset', 'programming', 'offsets', 'select']
    },
    {
        type: 'tf',
        id: 'smr-select-passthrough',
        prompt: 'A SELECT block has the unoccupied setpoint 65 °F (18.3 °C) on one analog input, the occupied setpoint 72 °F (22.2 °C) on the other, and the occupancy schedule bit on its boolean selector. While the schedule bit is TRUE (occupied), the block\'s output is 72.',
        answer: true,
        explain: 'True — that\'s the whole block: two analog inputs, one boolean selector, and the selector picks which input passes through. When the schedule drops to FALSE the output snaps to 65 on the next scan, and the comparator or PID downstream just sees its setpoint wire change value. Chain two SELECTs and two boolean wires walk the output through three modes.',
        learnMore: { href: '/education/setpoint-math-reset.html#select', label: 'Setpoint Math — Switching Setpoints' },
        tags: ['setpoint-math-reset', 'programming', 'select']
    },

    // ── The gotcha ─────────────────────────────────────────
    {
        type: 'gotcha',
        id: 'smr-flipped-slope',
        prompt: 'A hot-water reset chain reads as below on an 85 °F (29.4 °C) summer afternoon, and the boiler loop is holding its maximum water temperature on the hottest day of the year. What went wrong?',
        snippet: '<pre class="quiz-snippet">OAT (analog in):      85\nslope constant:       +0.667\nMUL out (m × OAT):    56.7\nintercept constant:   180\nADD out:              237\nLIMIT 140–180 out:    180\nHW setpoint (AO):     180</pre>',
        choices: [
            { id: 'a', text: 'The LIMIT\'s high clamp is set too low for summer.' },
            { id: 'b', text: 'The slope\'s sign is flipped — at +0.667 the setpoint climbs as the outdoor air warms, so summer asks for the hottest water and the LIMIT pins it at 180.', correct: true },
            { id: 'c', text: 'The intercept should be 140, not 180.' },
            { id: 'd', text: 'The outdoor sensor must be reading in °C.' }
        ],
        explain: 'A reset slope is negative — water slides DOWN as outdoor air rises. With +0.667 the line runs the wrong direction: 85 × 0.667 + 180 ≈ 237, and the LIMIT does its job on a bad request, clamping to 180 — which is why the symptom is "pinned at max," not "reads 237." The tell is the season: max heat on a design cooling day. Check the sign before you suspect the clamp; the LIMIT masked the bug, it didn\'t cause it.',
        learnMore: { href: '/education/setpoint-math-reset.html#reset', label: 'Setpoint Math — The Linear Reset' },
        tags: ['setpoint-math-reset', 'programming', 'reset', 'gotcha']
    },

    // ── The cross-chapter beat ─────────────────────────────
    {
        type: 'tf',
        id: 'smr-two-point-same-math',
        prompt: 'The 2-point slope/offset math used to scale a 4–20 mA signal into engineering units will also solve a reset schedule — feed the two design endpoints into a 2-point solver and the schedule\'s m and b drop out.',
        answer: true,
        explain: 'True. Both are the same straight line through two points — for a signal the points are the range endpoints (4 mA → range min, 20 mA → range max); for a reset they are the design days (0 °F → 180 °F, 60 °F → 140 °F). The signal-scaling tool\'s 2-Point → Slope/Offset tab computes m and b for either job; only the meaning of x and y changes.',
        learnMore: { href: '/education/setpoint-math-reset.html#reset', label: 'Setpoint Math — The Linear Reset' },
        tags: ['setpoint-math-reset', 'programming', 'reset', 'signals']
    }
];
