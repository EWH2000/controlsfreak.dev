// Question bank for the Pump Control quiz, exposed to Nunjucks as
// `quizzes['pump-control']`. Lives in _data/ so two consumers read one
// source: the page's inline JS (mounts the engine in the browser) and
// the FAQPage JSON-LD emitter in head.njk (indexable Q&A for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_pump-control_* localStorage keys. Pairs with the Pump Control
// lesson; learnMore hrefs deep-link its <h2> anchors.

module.exports = [
    // ── Constant-speed pumps ──────────────────────────────
    {
        type: 'tf',
        id: 'constant-speed-deadhead',
        prompt: 'A constant-speed pump feeding a building of all two-way valves needs a differential-pressure bypass valve (or a switch to variable speed) so it doesn\'t deadhead when the valves close in.',
        answer: true,
        explain: 'A constant-speed pump pushes the same volume at the same head all day. When two-way valves throttle closed, the excess pressure dumps across them as noise and wear — and if enough close with no bypass anywhere, the pump <em>deadheads</em>: spinning against a closed loop with no flow path. A DPBV that cracks open on a Δp setpoint is the mechanical guard; variable-speed control solves it by not making the unwanted pressure in the first place.',
        learnMore: { href: '/education/pump-control.html#constant-speed', label: 'Pump Control — Constant-speed pumps' },
        tags: ['pump', 'constant-speed', 'deadhead']
    },

    // ── Operating point ───────────────────────────────────
    {
        type: 'mcq',
        id: 'operating-point-crossing',
        prompt: 'On a pump-curve / system-curve chart, where does the pump actually run?',
        choices: [
            { id: 'a', text: 'Wherever the engineer sets the speed reference.' },
            { id: 'b', text: 'Where the pump curve and the system curve cross — the operating point.', correct: true },
            { id: 'c', text: 'At the pump\'s shutoff head.' },
            { id: 'd', text: 'At the far right of the pump curve (maximum flow).' }
        ],
        explain: 'The operating point is where the two curves intersect — it\'s not a number anyone picks, it\'s where physics settles. Open the valves and the system curve flattens, so the intersection slides right and down (more flow, less head); close them and it climbs left and up. The pump rides its curve as the building demands.',
        learnMore: { href: '/education/pump-control.html#operating-point', label: 'Pump Control — The operating point' },
        tags: ['pump', 'operating-point']
    },
    {
        type: 'mcq',
        id: 'pump-has-a-curve',
        prompt: 'Why is "a 100-GPM pump" a misleading way to describe a centrifugal pump?',
        choices: [
            { id: 'a', text: 'Pumps are rated in head, never in flow.' },
            { id: 'b', text: 'A pump has a whole curve — the flow it delivers depends on the system resistance in front of it, not a single rating.', correct: true },
            { id: 'c', text: 'Real pumps never reach their rated flow.' },
            { id: 'd', text: 'The rating only applies at shutoff head.' }
        ],
        explain: 'A pump produces a curve of head-versus-flow, from shutoff head at zero flow down to runout at the right. It can sit anywhere along that line; what it actually delivers is set by where the system curve crosses it. "100 GPM at this specific curve and this specific system" is the honest statement — change the system resistance and the same pump delivers a different flow.',
        learnMore: { href: '/education/pump-control.html#operating-point', label: 'Pump Control — Pump curve vs system curve' },
        tags: ['pump', 'operating-point']
    },

    // ── Affinity laws ─────────────────────────────────────
    {
        type: 'mcq',
        id: 'affinity-head-squared',
        prompt: 'By the affinity laws, flow scales directly with pump speed. How do head and power scale?',
        choices: [
            { id: 'a', text: 'Head with speed squared, power with speed cubed.', correct: true },
            { id: 'b', text: 'Head with speed cubed, power with speed squared.' },
            { id: 'c', text: 'Both scale directly with speed.' },
            { id: 'd', text: 'Both scale with speed squared.' }
        ],
        explain: 'Flow ∝ N, head ∝ N², power ∝ N³. The cube law on power is the entire energy case for variable-speed pumping — and it works cleanly on a closed loop because the head is all friction (which itself scales as flow²), with no static elevation term to spoil the math.',
        learnMore: { href: '/education/pump-control.html#affinity-laws', label: 'Pump Control — Affinity laws' },
        tags: ['pump', 'affinity-laws', 'vfd']
    },
    {
        type: 'numeric',
        id: 'affinity-power-70',
        prompt: 'You slow a pump to 70 % of full speed. By the affinity laws, the power it draws falls to roughly what percent of full-speed power?',
        answer: 34,
        tolerance: 3,
        unit: '%',
        explain: 'Power scales with the cube of speed: 0.70³ ≈ 0.343, so about 34 %. Flow only drops to 70 % and head to about 49 % (0.70²), but power collapses — which is why trimming a little speed off a pump saves a lot of energy.',
        learnMore: { href: '/education/pump-control.html#affinity-laws', label: 'Pump Control — Affinity laws' },
        tags: ['pump', 'affinity-laws', 'cube-law']
    },

    // ── DP-based control ──────────────────────────────────
    {
        type: 'gotcha',
        id: 'local-dp-hides-starvation',
        prompt: 'A variable-speed pump holds its DP setpoint perfectly and the pump-mounted gauge reads dead-on — but the offices at the far end of the building can\'t hold temperature. The DP sensor is wired across the pump\'s own discharge and suction. What\'s the problem?',
        snippet: '<pre class="quiz-snippet">DP sensor location:  at the pump (discharge − suction)\nDP setpoint:         held on target ✓\nFar-end loads:        starving ✗</pre>',
        choices: [
            { id: 'a', text: 'The DP setpoint is set too low; raise it.' },
            { id: 'b', text: 'Local (at-pump) DP measures pump head, not what the far loads feel — loop friction can climb while local DP looks fine. Move the sensor to the hydraulically most-remote point.', correct: true },
            { id: 'c', text: 'The pump is undersized and must be replaced.' },
            { id: 'd', text: 'The far loads need three-way valves.' }
        ],
        explain: 'A local DP sensor reads pump discharge minus suction — basically the head the pump is making — and says nothing about the far end of the loop. If loop friction rises (dirty strainer, valves throttling) the worst-case load starves while local DP looks perfect. A <em>remote</em> DP sensor wired across supply and return beyond the last big load measures the pressure the worst-case load actually has, which is the variable that matters.',
        learnMore: { href: '/education/pump-control.html#dp-control', label: 'Pump Control — DP-based control' },
        tags: ['pump', 'dp-control', 'troubleshooting']
    },
    {
        type: 'mcq',
        id: 'remote-dp-placement',
        prompt: 'On anything bigger than a small system, where is the better place to wire the differential-pressure sensor that controls pump speed?',
        choices: [
            { id: 'a', text: 'Across the pump\'s discharge and suction.' },
            { id: 'b', text: 'At the hydraulically most-remote point — across supply and return beyond the last big load.', correct: true },
            { id: 'c', text: 'At the boiler or chiller outlet.' },
            { id: 'd', text: 'Anywhere convenient; placement doesn\'t affect control.' }
        ],
        explain: 'Remote DP makes the pump\'s job "give the worst-case load at least this much pressure," which is what the building actually cares about. Local (at-pump) DP is cheaper — no field wiring beyond the panel — but it can\'t see far-end starvation. Almost always worth the field-mounted remote sensor on a system of any size.',
        learnMore: { href: '/education/pump-control.html#dp-control', label: 'Pump Control — DP sensor placement' },
        tags: ['pump', 'dp-control']
    },

    // ── DP setpoint reset ─────────────────────────────────
    {
        type: 'mcq',
        id: 'dp-reset-target',
        prompt: 'DP setpoint reset (most-open-valve reset) walks the DP setpoint downward until what condition is met?',
        choices: [
            { id: 'a', text: 'Every valve in the building is at least 50 % open.' },
            { id: 'b', text: 'The most-open valve in the building reaches about 95 % open.', correct: true },
            { id: 'c', text: 'The pump reaches its minimum-speed floor.' },
            { id: 'd', text: 'All valves are fully closed.' }
        ],
        explain: 'The sequence reads back every modulating valve\'s position and drops the DP setpoint until the most-open valve sits near 95 % — meaning that valve is barely throttling and the pump is making just enough pressure for the worst-case load <em>right now</em>. Every other valve opens wider, the pump slows, and the cube law cuts power again. (Floors apply: the setpoint can\'t go below what pushes design flow through pipe friction, and a minimum holds so the loop never deadheads.)',
        learnMore: { href: '/education/pump-control.html#dp-reset', label: 'Pump Control — DP setpoint reset' },
        tags: ['pump', 'dp-reset']
    },
    {
        type: 'tf',
        id: 'dp-reset-why',
        prompt: 'Fixed-DP control wastes energy at part load because the setpoint is sized for the worst case, so most hours the pump makes more pressure than any load needs and the excess drops across throttled valves.',
        answer: true,
        explain: 'Exactly the gap DP reset closes. A fixed setpoint is sized for peak demand with every valve open enough to pass design flow; the rest of the time the valves are throttled and the surplus pressure is burned across them. Resetting the setpoint down with demand means the pump makes only what\'s needed — slower pump, less head, far less power.',
        learnMore: { href: '/education/pump-control.html#dp-reset', label: 'Pump Control — DP setpoint reset' },
        tags: ['pump', 'dp-reset', 'energy']
    },

    // ── Lead/lag ──────────────────────────────────────────
    {
        type: 'mcq',
        id: 'parallel-pumps-same-speed',
        prompt: 'Two variable-speed pumps run in parallel on a single DP control loop. How are they driven, and when does the second one come on?',
        choices: [
            { id: 'a', text: 'Each runs its own DP loop; the second starts on a schedule.' },
            { id: 'b', text: 'Both run from the same speed reference; the lag pump stages on when the lead runs near full speed for an extended period.', correct: true },
            { id: 'c', text: 'The lead runs full speed and the lag trims the remainder.' },
            { id: 'd', text: 'They alternate every few minutes regardless of load.' }
        ],
        explain: 'Parallel variable-speed pumps share one DP loop and one speed reference — two motors, same command. A staging sequence brings the lag pump online when the lead has been near full speed long enough that one pump can\'t keep up, and rotates the lead over time for even wear. The staging logic itself is sequencing, covered by the equipment-staging lesson.',
        learnMore: { href: '/education/pump-control.html#lead-lag', label: 'Pump Control — Lead/lag and parallel pumps' },
        tags: ['pump', 'lead-lag', 'staging']
    }
];
