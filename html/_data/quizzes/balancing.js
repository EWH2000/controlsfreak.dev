// Question bank for the Hydronic Balancing quiz, exposed to Nunjucks as
// `quizzes['balancing']`. Lives in _data/ so two consumers read one
// source: the page's inline JS (mounts the engine in the browser) and
// the FAQPage JSON-LD emitter in head.njk (indexable Q&A for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_balancing_* localStorage keys. Pairs with the Hydronic
// Balancing lesson; learnMore hrefs deep-link its <h2> anchors.

module.exports = [
    // ── CBVs ──────────────────────────────────────────────
    {
        type: 'mcq',
        id: 'cbv-orifice',
        prompt: 'A calibrated balancing valve (CBV) is, in physics terms, a fancy orifice. Once its handle is set, the flow it passes is proportional to what?',
        choices: [
            { id: 'a', text: 'The differential pressure across it, directly.' },
            { id: 'b', text: 'The square root of the differential pressure across it.', correct: true },
            { id: 'c', text: 'A fixed flow, regardless of pressure.' },
            { id: 'd', text: 'The square of the differential pressure.' }
        ],
        explain: 'A set CBV follows the orifice law: flow ∝ √Δp. Double the Δp and you get about 41 % more flow; halve it and you get about 71 % of the flow. There\'s no spring, actuator, or compensation — it passes whatever its fixed orifice and the available Δp allow.',
        learnMore: { href: '/education/balancing.html#cbv', label: 'Hydronic Balancing — Calibrated balancing valves' },
        tags: ['hydronics', 'balancing', 'cbv']
    },
    {
        type: 'tf',
        id: 'cbv-no-compensation',
        prompt: 'If system pressure changes — another zone closes, the pump curve shifts — a CBV\'s flow changes with it, because the valve has no compensation.',
        answer: true,
        explain: 'A CBV doesn\'t know what flow it\'s "supposed" to pass; it just obeys its orifice equation. So any Δp change from elsewhere in the system moves its flow. That\'s exactly why CBVs suit constant-flow (three-way) systems, where the operating point holds still, and why they\'re awkward on variable-flow loops where the Δp moves all day.',
        learnMore: { href: '/education/balancing.html#cbv', label: 'Hydronic Balancing — Calibrated balancing valves' },
        tags: ['hydronics', 'balancing', 'cbv']
    },
    {
        type: 'mcq',
        id: 'cbv-proportional-procedure',
        prompt: 'Why can\'t you balance a system of CBVs by walking the riser once and dialing each valve to its design flow?',
        choices: [
            { id: 'a', text: 'The valves have no flow markings.' },
            { id: 'b', text: 'The loads interact — throttling one branch shifts pressure to the others, changing their readings — so balancing is iterative (proportional balancing).', correct: true },
            { id: 'c', text: 'The pump must be off during balancing.' },
            { id: 'd', text: 'CBVs can only be set in pairs.' }
        ],
        explain: 'Because the branches share the loop, restricting the near load pushes pressure to the far loads, which then read differently. Proportional balancing picks a reference branch (often the index circuit — the longest, most-restricted), measures its flow as a fraction of design, and brings the others to the same fraction — then repeats, because each pass moves the reference. Two or three iterations is typical; it\'s a real day-or-more of work.',
        learnMore: { href: '/education/balancing.html#cbv', label: 'Hydronic Balancing — Calibrated balancing valves' },
        tags: ['hydronics', 'balancing', 'cbv', 'commissioning']
    },
    {
        type: 'numeric',
        id: 'cbv-sqrt-flow',
        prompt: 'A CBV is trimmed to pass 10 GPM at 4 psi of differential pressure. With nothing else touched, the Δp across it rises to 16 psi. Roughly what flow does it pass now, in GPM?',
        answer: 20,
        tolerance: 0.5,
        unit: 'GPM',
        explain: 'Flow ∝ √Δp. The Δp went up 4× (4 → 16 psi), and √4 = 2, so flow doubles: 10 × 2 = 20 GPM. This is exactly the lack of compensation that bites on variable-flow systems — the trim that was perfect at the design Δp is wrong the moment system pressure moves.',
        learnMore: { href: '/education/balancing.html#cbv', label: 'Hydronic Balancing — Calibrated balancing valves' },
        tags: ['hydronics', 'balancing', 'cbv']
    },

    // ── ABVs ──────────────────────────────────────────────
    {
        type: 'mcq',
        id: 'abv-cartridge',
        prompt: 'How does an automatic balancing valve (ABV) hold design flow without a technician setting it?',
        choices: [
            { id: 'a', text: 'A motor modulates it from the BMS.' },
            { id: 'b', text: 'A spring-loaded cartridge closes the orifice as Δp rises and opens it as Δp falls, holding flow roughly constant within its compensation range.', correct: true },
            { id: 'c', text: 'It senses flow directly with an internal meter.' },
            { id: 'd', text: 'It uses a fixed orifice exactly like a CBV.' }
        ],
        explain: 'Inside the ABV is a spring-loaded cartridge in the flow path. Rising Δp pushes it toward closed, falling Δp lets it open, and within the cartridge\'s compensation range (often ~1–22 psi) the through-flow stays approximately constant. You pick the body and cartridge for the design flow, install it, and walk away — no trim, no manometer, no procedure.',
        learnMore: { href: '/education/balancing.html#abv', label: 'Hydronic Balancing — Automatic balancing valves' },
        tags: ['hydronics', 'balancing', 'abv']
    },
    {
        type: 'gotcha',
        id: 'abv-outside-comp-range',
        prompt: 'An ABV that\'s supposed to hold a flat design flow is instead passing a flow that swings with system pressure. The cartridge isn\'t stuck. What\'s going on?',
        snippet: '<pre class="quiz-snippet">expected:  flat flow across the Δp range\nobserved:  flow rising/falling with system Δp\ncartridge: free, not jammed</pre>',
        choices: [
            { id: 'a', text: 'The ABV is installed backwards.' },
            { id: 'b', text: 'The system Δp is outside the cartridge\'s compensation range, so it\'s bottomed out (fully open) or maxed out (fully closed) and behaves like a plain orifice — flow follows √Δp again.', correct: true },
            { id: 'c', text: 'ABVs never hold flat flow; that\'s normal.' },
            { id: 'd', text: 'The pump is oversized.' }
        ],
        explain: 'Below the cartridge\'s minimum design Δp the spring can\'t open it any further (fully open); above the maximum it\'s fully compressed (as closed as it gets). At either extreme the flat-flow behaviour disappears and the valve reverts to a √Δp orifice. The fix is sizing: pick a cartridge whose compensation range comfortably brackets the Δp the system actually sees — too narrow and it spends its life outside the band where it works.',
        learnMore: { href: '/education/balancing.html#abv', label: 'Hydronic Balancing — Automatic balancing valves' },
        tags: ['hydronics', 'balancing', 'abv', 'troubleshooting']
    },
    {
        type: 'tf',
        id: 'abv-no-test-ports',
        prompt: 'A stuck ABV cartridge is hard to diagnose because the valve has no P/T test ports — you usually need an external flow meter or added ports on the branch to confirm it.',
        answer: true,
        explain: 'That\'s the ABV\'s blind spot. Scale, debris, or age can leave the cartridge half-closed and unresponsive, and there\'s no way to see it from outside and no P/T ports to read Δp across the trim. Diagnosis means adding the very metering — an external flow meter or P/T ports — that an ABV was bought to avoid needing.',
        learnMore: { href: '/education/balancing.html#abv', label: 'Hydronic Balancing — Automatic balancing valves' },
        tags: ['hydronics', 'balancing', 'abv']
    },

    // ── PICVs ─────────────────────────────────────────────
    {
        type: 'mcq',
        id: 'picv-combination',
        prompt: 'A pressure-independent control valve (PICV) combines which two functions in one body?',
        choices: [
            { id: 'a', text: 'Two fixed orifices in series.' },
            { id: 'b', text: 'A modulating control actuator on top plus a pressure-compensating cartridge that caps flow regardless of system Δp.', correct: true },
            { id: 'c', text: 'A check valve and a strainer.' },
            { id: 'd', text: 'A CBV handle and a pair of P/T ports.' }
        ],
        explain: 'A PICV stacks a control actuator (modulates 0–100 % on command) over a pressure-compensating cartridge (holds the design flow maximum regardless of system pressure). The result: the valve tells the pump exactly how much to flow and doesn\'t fight the changing system pressure — control and balancing in one device.',
        learnMore: { href: '/education/balancing.html#picv', label: 'Hydronic Balancing — Pressure-independent control valves' },
        tags: ['hydronics', 'balancing', 'picv']
    },
    {
        type: 'mcq',
        id: 'picv-dp-reset-pairing',
        prompt: 'Why do PICVs pair so well with aggressive DP setpoint reset on a variable-flow system?',
        choices: [
            { id: 'a', text: 'They force the pump to run at constant speed.' },
            { id: 'b', text: 'They hold each load\'s design flow across a wide Δp range, so the pump can drop its DP setpoint far without starving the worst-case load.', correct: true },
            { id: 'c', text: 'They eliminate the need for a DP sensor entirely.' },
            { id: 'd', text: 'They convert the loads to constant flow.' }
        ],
        explain: 'PICVs are pressure-independent, so each load keeps its design flow even as loop Δp swings widely. That lets the BMS push the DP setpoint down aggressively (most-open-valve reset) without far loads losing flow — which is where the cube-law pump savings live. CBVs can\'t do this; their flow drifts with every Δp change.',
        learnMore: { href: '/education/balancing.html#picv', label: 'Hydronic Balancing — Pressure-independent control valves' },
        tags: ['hydronics', 'balancing', 'picv', 'dp-reset']
    },

    // ── Diagnosing imbalance ──────────────────────────────
    {
        type: 'mcq',
        id: 'diagnose-after-maintenance',
        prompt: 'A loop that was balanced and stable starts starving its far loads right after a boiler swap — but nobody touched a balancing valve. What most likely happened?',
        choices: [
            { id: 'a', text: 'The balancing valves all failed at once.' },
            { id: 'b', text: 'The system curve moved (new equipment changed the resistance), so the original CBV calibration is silently invalid — the loop needs re-balancing.', correct: true },
            { id: 'c', text: 'The far loads\' coils are undersized.' },
            { id: 'd', text: 'Air in the loop, which always clears itself.' }
        ],
        explain: 'A boiler swap, pump-impeller trim, system refill, or a newly tied-in load all shift the system curve. The CBVs never moved, but the operating point did, so the trim set at the old condition no longer delivers the design flows — the loop is "self-unbalanced" again with nobody having touched it. The fix is to re-walk the loop with a manometer, not to chase the symptom in the occupied space.',
        learnMore: { href: '/education/balancing.html#diagnose', label: 'Hydronic Balancing — When the loop isn\'t balanced' },
        tags: ['hydronics', 'balancing', 'troubleshooting']
    }
];
