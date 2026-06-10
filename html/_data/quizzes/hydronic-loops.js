// Question bank for the Hydronic Loops quiz, exposed to Nunjucks as
// `quizzes['hydronic-loops']`. Lives in _data/ so two consumers read one
// source: the page's inline JS (mounts the engine in the browser) and
// the FAQPage JSON-LD emitter in head.njk (indexable Q&A for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_hydronic-loops_* localStorage keys. Pairs with the Hydronic
// Loops lesson; learnMore hrefs deep-link its #d1 / #d2 / #d3 anchors.

module.exports = [
    // ── Direct return ─────────────────────────────────────
    {
        type: 'tf',
        id: 'direct-return-unbalanced',
        prompt: 'Left alone, a 2-pipe direct-return loop self-unbalances — the nearest load gets too much flow and the farthest load too little.',
        answer: true,
        explain: 'In direct return, each load goes "back the way it came," so the near load has a short total trip and the far load crosses the whole building and back. Water takes the path of least resistance, so flow favours the near loads. Every load needs a balancing valve and someone to set them — cheap to pipe, fussy to commission.',
        learnMore: { href: '/education/hydronic-loops.html#d1', label: 'Hydronic Loops — 2-pipe direct return' },
        tags: ['hydronics', 'direct-return']
    },
    {
        type: 'mcq',
        id: 'path-least-resistance',
        prompt: 'In a direct-return loop, why does the nearest load tend to hog flow?',
        choices: [
            { id: 'a', text: 'Its valve is always commanded further open.' },
            { id: 'b', text: 'Its total pipe path is shorter, so it has less resistance — and water takes the path of least resistance.', correct: true },
            { id: 'c', text: 'The pump is closer to it.' },
            { id: 'd', text: 'It is always the largest coil.' }
        ],
        explain: 'Shorter loop = less resistance, and like current, water splits toward the path of least resistance. The near load over-draws and the far load is left short until balancing valves add restriction to the near branches to even it out.',
        learnMore: { href: '/education/hydronic-loops.html#d1', label: 'Hydronic Loops — 2-pipe direct return' },
        tags: ['hydronics', 'direct-return']
    },

    // ── Reverse return ────────────────────────────────────
    {
        type: 'mcq',
        id: 'reverse-return-mechanism',
        prompt: 'How does a 2-pipe reverse-return loop come out roughly self-balancing?',
        choices: [
            { id: 'a', text: 'It uses larger pipe on the far loads.' },
            { id: 'b', text: 'The return main runs the same direction as the supply, past every load, then loops back — so the first load supplied is the last to return and each load\'s total path length is about equal.', correct: true },
            { id: 'c', text: 'A balancing valve on each load does all the work.' },
            { id: 'd', text: 'The pump modulates flow to each branch individually.' }
        ],
        explain: 'The trick is in the return: instead of heading straight back, it continues past every load and only then doubles home. First-supplied is last-to-return, so everyone\'s total pipe path — and therefore resistance — comes out roughly equal, and flow splits close to evenly on its own.',
        learnMore: { href: '/education/hydronic-loops.html#d2', label: 'Hydronic Loops — 2-pipe reverse return' },
        tags: ['hydronics', 'reverse-return']
    },
    {
        type: 'tf',
        id: 'reverse-return-cost',
        prompt: 'Reverse return\'s self-balancing comes for free — it uses the same amount of pipe as direct return.',
        answer: false,
        explain: 'It costs an extra full run of pipe: the return doubles back the whole length of the building, so you\'re essentially doubling the return run. The trade is real — you spend pipe and labour to save commissioning effort. (You\'ll still fit balancing valves, but they\'re trimming, not heavy lifting.)',
        learnMore: { href: '/education/hydronic-loops.html#d2', label: 'Hydronic Loops — 2-pipe reverse return' },
        tags: ['hydronics', 'reverse-return']
    },

    // ── Primary-secondary / twin-T ────────────────────────
    {
        type: 'mcq',
        id: 'twin-t-flow-through-boiler',
        prompt: 'In a primary-secondary "twin-T" system, how much of the building\'s water actually flows through the boiler?',
        choices: [
            { id: 'a', text: 'All of it — the boiler is where the loop gets heated.' },
            { id: 'b', text: 'Only the slice the injection pump diverts from the primary loop; most of the building\'s water never touches the boiler.', correct: true },
            { id: 'c', text: 'Exactly half, split at the tees.' },
            { id: 'd', text: 'None — the boiler heats by radiation across the common pipe.' }
        ],
        explain: 'The boiler sits on its own short <em>primary</em> loop with a dedicated pump holding constant flow through it. A separate injection pump taps hot water off the primary into the <em>system</em> loop. Only that injected slice ever touches the boiler; the rest of the building\'s water circulates the loads and mixes with the injection downstream. That decoupling is why a 100-GPM boiler can serve a 200-GPM building.',
        learnMore: { href: '/education/hydronic-loops.html#d3', label: 'Hydronic Loops — Primary-secondary twin-T' },
        tags: ['hydronics', 'primary-secondary']
    },
    {
        type: 'gotcha',
        id: 'closely-spaced-tees',
        prompt: 'Walking a plant, you find two tees piped right next to each other with a short stub between them — it looks like a short-circuit straight across the boiler. The pipefitter swears it\'s correct. Who\'s right?',
        snippet: '<pre class="quiz-snippet">primary loop ──┬──┐  (closely-spaced tees)\n               │  │   short common pipe\nsystem loop ───┴──┘  injection pump on the bridge</pre>',
        choices: [
            { id: 'a', text: 'You are — that\'s a bypass that short-circuits the boiler and must be re-piped.' },
            { id: 'b', text: 'The pipefitter — those are the "closely-spaced tees," a common pipe with near-zero Δp that decouples the loops so the three pumps don\'t fight each other.', correct: true },
            { id: 'c', text: 'Both — it works but is bad practice.' },
            { id: 'd', text: 'Neither — it only works if the tees are far apart.' }
        ],
        explain: 'The closely-spaced tees are the entire mechanism, not a mistake. With essentially no pressure drop across that little stub, the boiler, injection, and system pumps each do their own thing instead of fighting one another\'s discharge pressure. That common pipe is the whole reason a building with swinging demand can be served by a boiler that wants a steady diet. Recognise the twin-T and the plant snaps into focus.',
        learnMore: { href: '/education/hydronic-loops.html#d3', label: 'Hydronic Loops — Primary-secondary twin-T' },
        tags: ['hydronics', 'primary-secondary', 'twin-t']
    },
    {
        type: 'mcq',
        id: 'injection-control-point',
        prompt: 'In a twin-T system, what sets the supply temperature delivered to the loads?',
        choices: [
            { id: 'a', text: 'The boiler pump\'s flow rate.' },
            { id: 'b', text: 'The injection pump\'s speed — it controls how much hot primary water mixes into the system loop.', correct: true },
            { id: 'c', text: 'The system pump\'s speed.' },
            { id: 'd', text: 'The boiler\'s firing rate only.' }
        ],
        explain: 'The injection pump is the control point. Colder outside, building wants more heat → the injection pump speeds up, pulling more hot water from the primary into the system, and supply temperature to the loads climbs. The boiler\'s own flow rate never changes — that constant flow is what protects it.',
        learnMore: { href: '/education/hydronic-loops.html#d3', label: 'Hydronic Loops — Primary-secondary twin-T' },
        tags: ['hydronics', 'primary-secondary', 'injection']
    },
    {
        type: 'tf',
        id: 'boiler-constant-flow',
        prompt: 'In a twin-T arrangement the boiler pump holds constant flow through the boiler no matter what the building demand does, and that constant flow is what protects the boiler.',
        answer: true,
        explain: 'Right. The dedicated boiler pump keeps a steady flow through the boiler always — shielding it from the low-flow and thermal-shock conditions a variable building would otherwise impose. The building\'s demand swings are absorbed by the injection pump and the system pump, not by the boiler\'s flow.',
        learnMore: { href: '/education/hydronic-loops.html#d3', label: 'Hydronic Loops — Primary-secondary twin-T' },
        tags: ['hydronics', 'primary-secondary']
    },
    {
        type: 'numeric',
        id: 'twin-t-primary-recirc',
        prompt: 'A boiler pump holds 100 GPM (6.3 L/s) through the boiler. The injection pump is pulling 40 GPM (2.5 L/s) from the primary into the system loop. How many GPM stay in the primary and go straight back to the boiler to be reheated?',
        answer: 60,
        tolerance: 0,
        unit: 'GPM',
        explain: '100 GPM circulates the boiler; the injection pump diverts 40 GPM into the system, so 100 − 40 = 60 GPM stays in the primary (in SI: 6.3 − 2.5 = 3.8 L/s) and returns directly to the boiler. The system loop, meanwhile, moves its own (larger) flow through the loads — most of which never touches the boiler.',
        learnMore: { href: '/education/hydronic-loops.html#d3', label: 'Hydronic Loops — Primary-secondary twin-T' },
        tags: ['hydronics', 'primary-secondary']
    },
    {
        type: 'mcq',
        id: 'reverse-return-still-trim',
        prompt: 'On a reverse-return loop, do you still install balancing valves?',
        choices: [
            { id: 'a', text: 'No — reverse return is perfectly balanced, so they\'re pointless.' },
            { id: 'b', text: 'Yes, but only for fine trimming — the geometry already does the heavy lifting.', correct: true },
            { id: 'c', text: 'Only on the nearest load.' },
            { id: 'd', text: 'Only if the pump is constant-speed.' }
        ],
        explain: 'Reverse return gets you <em>close</em> to balanced for free, but real loops still want balancing valves for the last bit of trim. The difference from direct return is that here they\'re polishing an already-even split, not fighting a strong near/far imbalance.',
        learnMore: { href: '/education/hydronic-loops.html#d2', label: 'Hydronic Loops — 2-pipe reverse return' },
        tags: ['hydronics', 'reverse-return', 'balancing']
    }
];
