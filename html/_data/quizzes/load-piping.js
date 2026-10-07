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
//
// The bank is deliberately larger than the page's defaultCount (10):
// the engine samples an overflowing bank, so each run draws a
// different subset (buildQueue() in quiz-engine.js). Coverage tracks
// the lesson's sections — the two-way valve and variable system flow,
// the three-way valve (mixing vs diverting and how to tell them apart
// in the piping, the part-load cost of the bypass, and why constant
// flow still needs balancing), and the twin-T tie-back (pump pairing,
// what modulates on a three-way loop, and the minimum-flow bypass).
// The VFD-and-bypass gotcha draws on the closing widget ("See what the
// bypass does"), whose heading carries no id, so it deep-links
// #tie-back — the section just above the widget, whose prose
// introduces the minimum-flow bypass the widget exercises.

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

    {
        type: 'mcq',
        id: 'three-way-part-load-waste',
        prompt: 'At part load, what\'s the energy downside of a building full of three-way (constant-flow) loads?',
        choices: [
            { id: 'a', text: 'The coils overshoot at low load and dump surplus heat into the space.' },
            { id: 'b', text: 'Each actuator draws extra power holding its valve at mid-stroke all day.' },
            { id: 'c', text: 'The pump does full work pushing bypass water that moves no heat.', correct: true },
            { id: 'd', text: 'Constant flow erodes the coil tubes faster once the load drops off.' }
        ],
        explain: 'The bypass moves water around the building for no thermal reason — it never picks up or drops off heat. At part load, which is most of the day, the system pump is still doing full work to push water past coils that don\'t want it. That wasted pumping energy is exactly the argument that pushed the industry toward two-way valves and variable-speed pumps.',
        learnMore: { href: '/education/load-piping.html#three-way', label: 'Load Piping — Three-way valve' },
        tags: ['hydronics', 'three-way', 'constant-flow', 'energy']
    },
    {
        type: 'mcq',
        id: 'identify-diverting-arrangement',
        prompt: 'Tracing a coil in the field, you find a three-way valve at the coil\'s <em>inlet</em>. One outlet feeds the coil; the other feeds a bypass that rejoins the coil\'s leaving water at a plain tee on the return side. What are you looking at?',
        choices: [
            { id: 'a', text: 'A three-way mixing valve arrangement.' },
            { id: 'b', text: 'A two-way valve with a minimum-flow bypass.' },
            { id: 'c', text: 'A differential-pressure bypass valve.' },
            { id: 'd', text: 'A three-way diverting valve arrangement.', correct: true }
        ],
        explain: 'A diverting valve sits at the coil\'s inlet and splits incoming supply between the coil and the bypass; the two paths reunite at a passive tee on the return side. A mixing valve flips the geometry — it sits at the coil outlet and does the combining itself. From the system\'s point of view the two are functionally identical (constant system-side flow); the difference shows up in valve authority and in how the valve body wears.',
        learnMore: { href: '/education/load-piping.html#three-way', label: 'Load Piping — Three-way valve' },
        tags: ['hydronics', 'three-way']
    },
    {
        type: 'tf',
        id: 'three-way-still-needs-balancing',
        prompt: 'Because a three-way system holds its system flow constant, every load on it automatically receives its design flow — no balancing required.',
        answer: false,
        explain: 'False. Constant <em>total</em> flow says nothing about how that flow splits between branches. Even on a constant-flow setup, each load only sees its design flow if the loop is balanced — circuit setters, automatic balancing valves, or pressure-independent control valves (PICVs) at each branch. The Hydronic Balancing lesson covers each of the three and how to tell when a loop has drifted.',
        learnMore: { href: '/education/load-piping.html#three-way', label: 'Load Piping — Three-way valve' },
        tags: ['hydronics', 'three-way', 'balancing']
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
    },
    {
        type: 'mcq',
        id: 'three-way-injection-modulates',
        prompt: 'On the twin-T with every system load piped three-way, the system pump runs fixed-speed all day. Apart from the three-way valves at the coils themselves, what modulates in response to load?',
        choices: [
            { id: 'a', text: 'The injection pump across the bridge.', correct: true },
            { id: 'b', text: 'The boiler pump on the primary loop.' },
            { id: 'c', text: 'The minimum-flow bypass at the far end.' },
            { id: 'd', text: 'Nothing else; the whole loop runs fixed.' }
        ],
        explain: 'With three-way loads the system loop is constant-flow, so a fixed-speed system pump runs all day and the injection pump becomes the only thing modulating in response to load. The boiler doesn\'t care either way — it stays on its own primary loop, decoupled by the closely-spaced tees. And a three-way loop needs no minimum-flow bypass at all: the per-load bypasses already keep flow through the pump constant.',
        learnMore: { href: '/education/load-piping.html#tie-back', label: 'Load Piping — Tying it back to the twin-T' },
        tags: ['hydronics', 'three-way', 'constant-flow', 'system-design']
    },
    {
        type: 'gotcha',
        id: 'vfd-does-not-replace-min-flow',
        prompt: 'A retrofit on an all-two-way system adds a VFD to the system pump and, in the same breath, deletes the minimum-flow bypass at the far end of the main. What\'s wrong with the reasoning?',
        snippet: '<pre class="quiz-snippet">loads:            all two-way, modulating\nsystem pump:      add VFD\nmin-flow bypass:  REMOVE\nrationale:        "the drive slows to match the load, so the bypass is redundant"</pre>',
        choices: [
            { id: 'a', text: 'Nothing — with a VFD the pump just slows to match whatever flow the loads want.' },
            { id: 'b', text: 'The bypass should stay, but as a DPBV set to open on a pressure setpoint.' },
            { id: 'c', text: 'Two-way loads need a constant-speed pump, so the VFD itself is the mistake.' },
            { id: 'd', text: 'A drive only slows so far — with every valve shut, the pump dead-heads.', correct: true }
        ],
        explain: 'A VFD lets the pump slow with the building, but not to zero — the lesson\'s widget drive can\'t go below about 25 % speed. With every two-way valve modulated shut there\'s nowhere for the water to go, and a pump still turning against a closed loop dead-heads, heating the water in its volute. The minimum-flow bypass is the floor that catches this; a DPBV opening on a Δp setpoint is the constant-speed-pump fix instead, since under VFD pressure control the drive already caps loop Δp.',
        learnMore: { href: '/education/load-piping.html#tie-back', label: 'Load Piping — Tying it back to the twin-T' },
        tags: ['hydronics', 'two-way', 'vfd', 'minimum-flow', 'deadhead']
    }
];
