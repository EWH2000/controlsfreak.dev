// Question bank for the Load Piping quiz, exposed to Nunjucks as
// `quizzes['load-piping']`. Lives in _data/ so two consumers read one
// source: the page's inline JS (mounts the engine in the browser) and
// the FAQPage JSON-LD emitter in head.njk (indexable Q&A for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_load-piping_* localStorage keys. Pairs with the Load Piping
// lesson; learnMore hrefs deep-link its <h2> anchors. No numeric items —
// the material is qualitative, so the landing card omits the Numeric pill.

module.exports = [
    // ── Two-way valves ────────────────────────────────────
    {
        type: 'mcq',
        id: 'two-way-variable-flow',
        prompt: 'A two-way modulating valve throttles closed at a load. What happens to the flow it was passing?',
        choices: [
            { id: 'a', text: 'It diverts around the coil through a bypass.' },
            { id: 'b', text: 'It simply stops — the branch pulls less, and the system loop\'s total flow drops with it.', correct: true },
            { id: 'c', text: 'It shifts to the other loads, keeping system flow constant.' },
            { id: 'd', text: 'It recirculates within the coil.' }
        ],
        explain: 'A two-way valve has just an in and an out, in the supply to the load. When it throttles, that flow doesn\'t go anywhere else — it stops, and total system flow falls. That\'s variable system flow, and it\'s why two-way valves are the modern default: the pump can slow with the building.',
        learnMore: { href: '/education/load-piping.html#two-way', label: 'Load Piping — Two-way valve' },
        tags: ['hydronics', 'two-way', 'variable-flow']
    },
    {
        type: 'mcq',
        id: 'two-way-pump-pairing',
        prompt: 'Which pump arrangement do all-two-way (variable-flow) loads pair with to actually capture part-load savings?',
        choices: [
            { id: 'a', text: 'A constant-speed pump.' },
            { id: 'b', text: 'A variable-speed (VFD) pump.', correct: true },
            { id: 'c', text: 'Two constant-speed pumps in parallel.' },
            { id: 'd', text: 'A three-way bypass at the pump.' }
        ],
        explain: 'Because every closing two-way valve drops total system flow, a variable-speed pump can slow down with the building — and by the cube law, slowing the pump cuts power hard. A constant-speed pump on all-two-way loads just dumps its surplus pressure across the throttled valves and risks deadhead.',
        learnMore: { href: '/education/load-piping.html#two-way', label: 'Load Piping — Two-way valve' },
        tags: ['hydronics', 'two-way', 'vfd']
    },
    {
        type: 'mcq',
        id: 'two-way-tradeoff',
        prompt: 'What\'s the trade-off of committing a system to all-two-way (variable-flow) loads?',
        choices: [
            { id: 'a', text: 'There is none; it\'s strictly better in every way.' },
            { id: 'b', text: 'The system pressure-control problem gets more involved, and the whole plant — boilers, chillers, the lot — has to be okay with variable flow.', correct: true },
            { id: 'c', text: 'Each coil transfers less heat at design.' },
            { id: 'd', text: 'The valves wear out faster than three-way valves.' }
        ],
        explain: 'Variable flow saves real energy at part load, but it makes the pressure-control story harder (that\'s what DP control and DP reset are for) and demands that every piece of plant tolerate flow swinging up and down — you can\'t bolt variable-flow loads onto equipment that needs constant flow and expect it to be happy.',
        learnMore: { href: '/education/load-piping.html#two-way', label: 'Load Piping — Two-way valve' },
        tags: ['hydronics', 'two-way']
    },

    // ── Three-way valves ──────────────────────────────────
    {
        type: 'mcq',
        id: 'three-way-constant-flow',
        prompt: 'A three-way valve reduces the flow reaching its coil. Where does the water go, and what happens to system flow?',
        choices: [
            { id: 'a', text: 'It stops; system flow drops.' },
            { id: 'b', text: 'It goes around the coil through the bypass; system-side flow stays constant.', correct: true },
            { id: 'c', text: 'It backs up into the supply main.' },
            { id: 'd', text: 'It recirculates through the pump only.' }
        ],
        explain: 'The third port is a bypass that lets water get from supply to return without passing through the coil. When the load needs less, the valve sends flow around the coil instead of choking it off — coil-side flow varies, but the branch\'s total (system-side) flow stays the same. The pump sees constant demand all day.',
        learnMore: { href: '/education/load-piping.html#three-way', label: 'Load Piping — Three-way valve' },
        tags: ['hydronics', 'three-way', 'constant-flow']
    },
    {
        type: 'tf',
        id: 'mixing-vs-diverting',
        prompt: 'A mixing three-way valve (at the coil outlet) and a diverting three-way valve (at the coil inlet) look different but both hold system-side flow constant.',
        answer: true,
        explain: 'Two arrangements, same job. A mixing valve sits at the outlet and recombines coil return with bypass; a diverting valve sits at the inlet and splits incoming supply between coil and bypass. Either way system-side flow stays constant while coil-side flow varies between zero and full — the choice is about valve authority and wear, not the flow outcome.',
        learnMore: { href: '/education/load-piping.html#three-way', label: 'Load Piping — Three-way valve' },
        tags: ['hydronics', 'three-way']
    },
    {
        type: 'tf',
        id: 'three-way-does-not-stop-flow',
        prompt: 'At low demand a three-way valve stops flow to its branch the same way a two-way valve does.',
        answer: false,
        explain: 'No — that\'s the whole distinction. A two-way valve stops the flow (variable system flow); a three-way valve diverts it around the coil through the bypass, so the branch keeps passing roughly the same total flow (constant system flow). Same demand reduction, opposite effect on the loop.',
        learnMore: { href: '/education/load-piping.html#three-way', label: 'Load Piping — Three-way valve' },
        tags: ['hydronics', 'three-way', 'two-way']
    },
    {
        type: 'mcq',
        id: 'three-way-pump-pairing',
        prompt: 'Three-way (constant-flow) loads are the sensible match for which kind of pump?',
        choices: [
            { id: 'a', text: 'A variable-speed pump, to chase the bypass flow.' },
            { id: 'b', text: 'A constant-speed pump — system flow is constant by design, so there\'s nothing for a VFD to modulate against.', correct: true },
            { id: 'c', text: 'No pump at all; three-way loops are gravity-fed.' },
            { id: 'd', text: 'A pump with a minimum-flow bypass valve.' }
        ],
        explain: 'Three-way loads hold the system loop at constant flow, so a constant-speed pump sitting at one operating point all day is the natural fit (older gravity-converted boiler loops are the classic example). Putting a VFD on a constant-flow system gives it nothing to do — the flow never changes for it to follow.',
        learnMore: { href: '/education/load-piping.html#three-way', label: 'Load Piping — Three-way valve' },
        tags: ['hydronics', 'three-way', 'constant-speed']
    },
    {
        type: 'gotcha',
        id: 'three-way-no-partload-savings',
        prompt: 'A retrofit proposal keeps an all-three-way constant-flow system but adds a VFD on the pump, promising big part-load energy savings "from the cube law." What\'s the flaw?',
        snippet: '<pre class="quiz-snippet">existing loads:  all three-way (constant system flow)\nproposed:        add VFD to system pump\nclaim:           large part-load savings via the cube law</pre>',
        choices: [
            { id: 'a', text: 'No flaw — a VFD always cuts pump energy by the cube law.' },
            { id: 'b', text: 'Three-way loads hold system flow constant, so the pump has no reason to slow down — the cube-law savings need the falling flow that only two-way loads provide.', correct: true },
            { id: 'c', text: 'VFDs can\'t be fitted to pumps on three-way systems.' },
            { id: 'd', text: 'The savings are real but the valves would need replacing first.' }
        ],
        explain: 'The cube-law savings come from <em>flow falling</em> at part load, which lets the pump slow down. Three-way valves keep system flow constant by diverting around the coil, so there\'s nothing for the VFD to reduce — and the bypassed water is circulating load-less anyway. To unlock the savings you convert the loads to two-way (variable flow); only then does the falling flow let the pump ramp down.',
        learnMore: { href: '/education/load-piping.html#three-way', label: 'Load Piping — Three-way valve' },
        tags: ['hydronics', 'three-way', 'vfd', 'energy']
    },

    // ── Tying it back ─────────────────────────────────────
    {
        type: 'tf',
        id: 'minimum-flow-bypass',
        prompt: 'A variable-flow (all two-way) system uses a minimum-flow bypass sized to hold a flow floor, rather than a differential-pressure bypass valve set to open on a pressure setpoint.',
        answer: true,
        explain: 'A variable-flow loop carries the same deadhead risk as a constant-speed system, but it answers it differently: a minimum-flow bypass holds a flow floor so the pump never runs dry, while the VFD already caps loop Δp. A DPBV that opens on a pressure setpoint is the constant-speed-pump\'s mechanical guard instead.',
        learnMore: { href: '/education/load-piping.html#tie-back', label: 'Load Piping — Tying it back to the twin-T' },
        tags: ['hydronics', 'minimum-flow', 'deadhead']
    },
    {
        type: 'mcq',
        id: 'load-choice-shapes-loop',
        prompt: 'Why does the choice of load valve (two-way vs three-way) matter far beyond the coil itself?',
        choices: [
            { id: 'a', text: 'It only changes the coil\'s heat output.' },
            { id: 'b', text: 'It decides whether the whole loop is variable- or constant-flow, which dictates the pump strategy for the entire system.', correct: true },
            { id: 'c', text: 'It only affects the valve\'s purchase price.' },
            { id: 'd', text: 'It has no effect outside the branch.' }
        ],
        explain: 'The load-valve type sets the loop\'s entire personality. All two-way → variable flow → pair with a variable-speed pump and DP control. All three-way → constant flow → a constant-speed pump fits. Get the pairing wrong (constant-speed pump fighting two-way valves, or a VFD that can\'t ramp down on three-way loads) and the system never works the way it should.',
        learnMore: { href: '/education/load-piping.html#tie-back', label: 'Load Piping — Tying it back to the twin-T' },
        tags: ['hydronics', 'system-design']
    }
];
