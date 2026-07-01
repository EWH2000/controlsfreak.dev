// Question bank for the Equipment Staging quiz, exposed to Nunjucks as
// `quizzes['equipment-staging']`. Lives in _data/ so two consumers read
// one source: the page's inline JS (mounts the engine in the browser)
// and the FAQPage JSON-LD emitter in head.njk (indexable Q&A for
// search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_equipment-staging_* localStorage keys. Pairs with the
// Equipment Staging lesson; learnMore hrefs deep-link its <h2> anchors.

module.exports = [
    // ── Why several units ──────────────────────────────────
    {
        type: 'mcq',
        id: 'es-why-not-one-pump',
        prompt: 'Why can\'t one big variable-speed pump, sized for peak load, just turn down to cover light load too?',
        choices: [
            { id: 'a', text: 'A single pump can\'t be controlled by a BMS.' },
            { id: 'b', text: 'Every VFD has a minimum speed; below the flow that minimum produces you\'re back to dumping pressure across throttled valves, and at the extreme, deadheading.', correct: true },
            { id: 'c', text: 'One pump always fails faster than several.' },
            { id: 'd', text: 'Variable-speed pumps can\'t run at full speed.' }
        ],
        explain: 'A variable-speed pump follows the building gracefully — down to a point. Every drive has a minimum speed, and below the flow that produces you\'re back to the problems variable-speed pumping was meant to solve: pressure dumped across throttled valves, and at the extreme the deadhead. One pump can only turn down so far, which is why the duty gets split across several smaller pumps.',
        learnMore: { href: '/education/equipment-staging.html#why-parallel', label: 'Equipment Staging — Why several units' },
        tags: ['staging', 'pumps']
    },
    {
        type: 'mcq',
        id: 'es-n-plus-one',
        prompt: 'A plant is built "N+1." What does that mean?',
        choices: [
            { id: 'a', text: 'One more pump than the peak load needs, so the plant keeps running when a pump fails or is pulled for service.', correct: true },
            { id: 'b', text: 'The pumps run one at a time, in sequence.' },
            { id: 'c', text: 'There is exactly one pump and one standby valve.' },
            { id: 'd', text: 'The lead pump runs at 100 % plus one increment.' }
        ],
        explain: 'N+1 means one more unit than the peak load actually requires — redundancy. When a pump fails at 2 a.m. or gets pulled for service, the spare picks up the load and the building never notices; a tech deals with it in daylight. Redundancy is the second reason to run several units, alongside the turndown problem.',
        learnMore: { href: '/education/equipment-staging.html#why-parallel', label: 'Equipment Staging — Why several units' },
        tags: ['staging', 'redundancy']
    },
    {
        type: 'numeric',
        id: 'es-online-capacity',
        prompt: 'Three identical pumps share the plant duty equally. The sequence has two of them running. What\'s the online capacity, as a percent of the three-pump nameplate?',
        answer: 67,
        tolerance: 1.5,
        unit: '%',
        explain: 'With N of 3 equal pumps online, nameplate capacity is N/3: 2/3 ≈ 67 %. That fraction is what the staging logic compares demand against — when two pumps near their limit can\'t keep up, the third stages on to bring online capacity to 100 %. (Delivered flow is a separate story: two of three pumps in parallel against a fixed system curve actually push more than two-thirds of the design flow, because the curve steepens as flow rises — but the staging math reasons in nameplate fractions.)',
        learnMore: { href: '/education/equipment-staging.html#staging', label: 'Equipment Staging — Staging up and down' },
        tags: ['staging', 'capacity']
    },

    // ── Staging up and down ────────────────────────────────
    {
        type: 'mcq',
        id: 'es-staging-signal',
        prompt: 'On a variable-speed pumping plant, what signal does the staging sequence usually watch to decide whether to add or drop a pump?',
        choices: [
            { id: 'a', text: 'The outdoor-air temperature.' },
            { id: 'b', text: 'The speed reference the DP loop is producing — running pumps pinned near full speed for a while means add one; sitting low means drop one.', correct: true },
            { id: 'c', text: 'The suction pressure alone.' },
            { id: 'd', text: 'The number of valves that are open.' }
        ],
        explain: 'The speed reference the DP control loop produces already stands in for "how hard is the building working." When the running pumps have been pinned near full speed for a while, they\'re out of room — add a pump. When the speed reference has been sitting low, they\'re loafing — drop one. (A central plant uses heating or cooling load the same way to stage boilers and chillers.)',
        learnMore: { href: '/education/equipment-staging.html#staging', label: 'Equipment Staging — Staging up and down' },
        tags: ['staging']
    },
    {
        type: 'gotcha',
        id: 'es-deadband-hunting',
        prompt: 'A staging sequence uses a single threshold for both adding and dropping a pump. It cycles a pump on and off endlessly at steady load. What\'s wrong, and what\'s the fix?',
        snippet: '<pre class="quiz-snippet">stage-up at:    50%\nstage-down at:  50%   (same line)\nbehavior:       add → load/pump drops →\n                demand falls below 50% →\n                drop → demand climbs → add …</pre>',
        choices: [
            { id: 'a', text: 'The stage delay is too long; shorten it.' },
            { id: 'b', text: 'One threshold can\'t do both jobs — adding a pump drops the load on each running pump, pushing demand back below the line. Separate stage-up and stage-down with a deadband so the two conditions are clearly different.', correct: true },
            { id: 'c', text: 'The pumps are undersized.' },
            { id: 'd', text: 'The DP setpoint is wrong.' }
        ],
        explain: 'With one shared threshold, a demand hovering at the line adds a pump, which drops the per-pump load, which pushes demand back below the line, which drops the pump — the sequence hunts, cycling a pump indefinitely. The fix is a deadband: the stage-down point sits well below the stage-up point, so the conditions that bring a pump on are clearly different from the conditions that take one off, and the plant settles.',
        learnMore: { href: '/education/equipment-staging.html#staging', label: 'Equipment Staging — Staging up and down' },
        tags: ['staging', 'deadband', 'hunting']
    },
    {
        type: 'mcq',
        id: 'es-stage-delay',
        prompt: 'What is the job of the stage delay (sometimes "stage timer")?',
        choices: [
            { id: 'a', text: 'It blocks the next stage change after one has just happened.' },
            { id: 'b', text: 'It requires demand to stay across the threshold for a sustained period before acting, so a brief swing doesn\'t churn the whole plant.', correct: true },
            { id: 'c', text: 'It sets how long each pump runs as lead.' },
            { id: 'd', text: 'It ramps the pump speed up slowly.' }
        ],
        explain: 'A crossed threshold doesn\'t act immediately. The stage delay makes demand hold across the line for a sustained period first, so a single zone slamming open or a momentary pressure dip doesn\'t add or drop a pump. It\'s distinct from the minimum stage time, which acts after a change rather than before.',
        learnMore: { href: '/education/equipment-staging.html#staging', label: 'Equipment Staging — Staging up and down' },
        tags: ['staging', 'timers']
    },
    {
        type: 'mcq',
        id: 'es-minimum-stage-time',
        prompt: 'After a stage change happens, a minimum stage time blocks the next change for a while. What is it protecting against?',
        choices: [
            { id: 'a', text: 'Deadheading the pump.' },
            { id: 'b', text: 'Short-cycling — a pump that just started being asked to stop seconds later, which is hard on the windings, the starter, and the pump.', correct: true },
            { id: 'c', text: 'Running two pumps at once.' },
            { id: 'd', text: 'The deadband collapsing.' }
        ],
        explain: 'The minimum stage time locks out the next change for a period after any change, so a pump that just started isn\'t asked to stop sixty seconds later. Short-cycling is hard on motor windings, on the starter, and on the pump itself. The stage delay rides out brief swings before acting; the minimum stage time spaces out the changes that do happen.',
        learnMore: { href: '/education/equipment-staging.html#staging', label: 'Equipment Staging — Staging up and down' },
        tags: ['staging', 'timers']
    },

    // ── Lead/lag and rotation ──────────────────────────────
    {
        type: 'mcq',
        id: 'es-why-rotate-lead',
        prompt: 'Why does a good sequence rotate the lead pump instead of always starting the same one?',
        choices: [
            { id: 'a', text: 'It makes the BMS programming simpler.' },
            { id: 'b', text: 'A nailed-down lead logs every running hour and wears out, while the "redundant" standbys never earn their keep — rotation spreads the wear so the set ages together.', correct: true },
            { id: 'c', text: 'Rotation increases the plant\'s capacity.' },
            { id: 'd', text: 'It lets the pumps run at lower speed.' }
        ],
        explain: 'If the lead is pinned to one physical pump, that pump runs every hour the plant runs and logs thousands of hours while its siblings log almost none — so the lead wears out and the standbys haven\'t shared the load. Rotation hands the lead role around so the whole set wears down together, which is the point of having several units in the first place.',
        learnMore: { href: '/education/equipment-staging.html#rotation', label: 'Equipment Staging — Lead/lag and rotation' },
        tags: ['staging', 'rotation']
    },
    {
        type: 'mcq',
        id: 'es-runtime-equalization',
        prompt: 'Under runtime-equalized rotation, which pump does the BMS hand the lead role to?',
        choices: [
            { id: 'a', text: 'Whichever pump has the most accumulated run-hours.' },
            { id: 'b', text: 'Whichever pump has the fewest accumulated run-hours.', correct: true },
            { id: 'c', text: 'Always Pump 1.' },
            { id: 'd', text: 'A random pump each cycle.' }
        ],
        explain: 'Runtime equalization tracks accumulated run-hours per pump and gives the lead to the one with the fewest, so the bars pull back together over time instead of one pump running away. A fixed weekly swap is the simpler version; equalizing on actual hours is the better one, because real duty isn\'t evenly spread across a fixed schedule.',
        learnMore: { href: '/education/equipment-staging.html#rotation', label: 'Equipment Staging — Lead/lag and rotation' },
        tags: ['staging', 'rotation']
    },
    {
        type: 'tf',
        id: 'es-idle-standby',
        prompt: 'A standby pump that never runs is being well preserved for the day it\'s needed.',
        answer: false,
        explain: 'False. A pump that never runs deteriorates a different way — bearings take a set, seals dry out — so the day it\'s finally called on is the day you discover it doesn\'t work. That\'s why sequences add a standby exercise (running an idle pump briefly on a schedule to keep it limber) and why rotation keeps the standby honest. Redundancy is only real if the automatic swap to a standby on a lead fault actually works.',
        learnMore: { href: '/education/equipment-staging.html#rotation', label: 'Equipment Staging — Lead/lag and rotation' },
        tags: ['staging', 'rotation', 'redundancy']
    }
];
