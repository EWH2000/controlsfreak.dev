// Question bank for the Boolean Logic & Latches quiz, exposed to
// Nunjucks as `quizzes['boolean-logic-latches']`. Lives in _data/ so
// two consumers read one source: the page's inline JS (mounts the
// engine in the browser) and the FAQPage JSON-LD emitter in head.njk
// (indexable Q&A for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_boolean-logic-latches_* localStorage keys. Pairs with the
// Boolean Logic & Latches lesson; learnMore hrefs deep-link its <h2>
// anchors. Latch questions teach the SET-DOMINANT semantics of the
// site's FB editor (fbe-engine.js: S wins when S and R are both true).

module.exports = [
    // ── The permissive chain: AND, OR, NOT ─────────────────
    {
        type: 'mcq',
        id: 'bll-permissive-combination',
        prompt: 'An AHU enable is wired <code>OCCUPIED AND OAT-OK AND NOT FREEZE-TRIP</code>. Which set of live values enables the unit?',
        choices: [
            { id: 'a', text: 'OCCUPIED TRUE, OAT-OK TRUE, FREEZE-TRIP FALSE.', correct: true },
            { id: 'b', text: 'OCCUPIED TRUE, OAT-OK TRUE, FREEZE-TRIP TRUE.' },
            { id: 'c', text: 'OCCUPIED FALSE, OAT-OK TRUE, FREEZE-TRIP FALSE.' },
            { id: 'd', text: 'OCCUPIED TRUE, OAT-OK FALSE, FREEZE-TRIP FALSE.' }
        ],
        explain: 'Read the chain as a sentence: run only when occupied AND the outdoor air is OK AND the freeze stat is NOT tripped. The AND needs every input TRUE, and the NOT flips the trip signal to OK-sense — so FREEZE-TRIP must be FALSE for its leg to read TRUE. Only the first combination satisfies all three; each of the others has one leg FALSE, and one FALSE anywhere drops the permit.',
        learnMore: { href: '/education/boolean-logic-latches.html#permissives', label: 'Boolean Logic & Latches — The permissive chain' },
        tags: ['boolean-logic-latches', 'logic', 'permissives']
    },
    {
        type: 'mcq',
        id: 'bll-or-common-alarm',
        prompt: 'Three trouble contacts — filter, condensate overflow, smoke — should light one common alarm when any of them trips. Which block combines them?',
        choices: [
            { id: 'a', text: 'AND — every contact must agree before the alarm is real.' },
            { id: 'b', text: 'OR — TRUE when at least one input is TRUE.', correct: true },
            { id: 'c', text: 'XOR — TRUE when the inputs disagree.' },
            { id: 'd', text: 'NOT — invert each contact first.' }
        ],
        explain: 'The sentence is "any one of these is enough" — that\'s OR, which outputs TRUE when at least one input is TRUE. An AND would stay silent until every trouble tripped at once. The permissive chain is the mirror image: AND for "every proof required," OR for "any trip counts."',
        learnMore: { href: '/education/boolean-logic-latches.html#permissives', label: 'Boolean Logic & Latches — The permissive chain' },
        tags: ['boolean-logic-latches', 'logic', 'permissives']
    },
    {
        type: 'mcq',
        id: 'bll-nc-fail-safe',
        prompt: 'Hardwired safeties — freeze stats, high-static switches — are almost always wired normally closed, so the binary input reads TRUE while the device is healthy. Why?',
        choices: [
            { id: 'a', text: 'Normally closed contacts respond faster than normally open ones.' },
            { id: 'b', text: 'A broken wire or dead device then reads FALSE — the same as a trip — so a failed safety circuit stops the equipment instead of silently promising protection.', correct: true },
            { id: 'c', text: 'TRUE signals use less controller memory than FALSE signals.' },
            { id: 'd', text: 'It lets the safety share a wire with the fan command.' }
        ],
        explain: 'It\'s a fail-safe choice: healthy = circuit closed = TRUE, so the safety actively proves itself every scan. If the wire breaks or the device dies, the circuit opens and the point reads FALSE — indistinguishable from a trip — and the permissive chain drops the equipment. Silence is treated as a trip, which is exactly what you want from a circuit whose job is protection.',
        learnMore: { href: '/education/boolean-logic-latches.html#permissives', label: 'Boolean Logic & Latches — The permissive chain' },
        tags: ['boolean-logic-latches', 'logic', 'fail-safe']
    },
    {
        type: 'gotcha',
        id: 'bll-missing-not',
        prompt: 'Every device on this unit is healthy, but the fan will not start. The freeze stat\'s trip signal is wired straight into the run-permit AND. What\'s wrong?',
        snippet: '<pre class="quiz-snippet">FREEZE-TRIP (BI):   FALSE   (stat healthy)\nPROOF OK    (BI):   TRUE\n        │ both wired directly into\n        ▼\nAND → RUN PERMIT:   FALSE   (fan never starts)</pre>',
        choices: [
            { id: 'a', text: 'The AND block is faulty and should be replaced.' },
            { id: 'b', text: 'The AND should be an OR — then the permit would come on.' },
            { id: 'c', text: 'FREEZE-TRIP is a trip-sense signal (TRUE = tripped), so its healthy FALSE reads as a standing trip. It needed a NOT to flip it to OK-sense before the AND.', correct: true },
            { id: 'd', text: 'PROOF OK should read FALSE until the fan is running.' }
        ],
        explain: 'The AND wants OK-sense inputs — TRUE when healthy. FREEZE-TRIP arrives in the opposite polarity (TRUE = tripped), so on a perfectly healthy day it feeds the AND a FALSE and the permit can never rise. One NOT between the trip signal and the AND fixes it. Swapping the AND for an OR would "fix" the symptom while wrecking the logic — the fan would then run on proof alone, freeze trip or not. Signal sense is a classic day-one commissioning bug: everything healthy, nothing runs.',
        learnMore: { href: '/education/boolean-logic-latches.html#permissives', label: 'Boolean Logic & Latches — The permissive chain' },
        tags: ['boolean-logic-latches', 'logic', 'fail-safe', 'gotcha']
    },

    // ── The SR latch ───────────────────────────────────────
    {
        type: 'mcq',
        id: 'bll-why-latch-a-safety',
        prompt: 'A freeze stat trips and stops the fan. With no airflow, the coil warms up and the stat clears itself. Why is the trip wired through an SR latch instead of plain combinational logic?',
        choices: [
            { id: 'a', text: 'A latch evaluates faster than an AND, so the trip lands sooner.' },
            { id: 'b', text: 'Plain logic would restart the fan the moment the stat cleared — cold air hits the coil, the stat trips again, and the unit short-cycles through its own safety with nobody ever finding the cause. The latch holds the trip until a person acknowledges it.', correct: true },
            { id: 'c', text: 'A latch is required whenever a binary input is normally closed.' },
            { id: 'd', text: 'The latch filters electrical noise off the freeze stat wiring.' }
        ],
        explain: 'The fault clearing is not the same thing as the problem being fixed. Combinational logic has no memory: stat clears, permit returns, fan restarts, coil freezes, stat trips — around and around, invisibly. Latching the trip keeps the unit off and the alarm standing until someone resets it deliberately and goes looking for why the coil was freezing in the first place.',
        learnMore: { href: '/education/boolean-logic-latches.html#sr-latch', label: 'Boolean Logic & Latches — The SR latch' },
        tags: ['boolean-logic-latches', 'logic', 'latch']
    },
    {
        type: 'mcq',
        id: 'bll-latch-vs-and',
        prompt: 'A freeze stat trips for 30 seconds, then clears. Sheet A runs the trip through combinational logic straight into the fan permit; sheet B sets an SR latch that drops the fan. After the trip clears, what\'s the difference?',
        choices: [
            { id: 'a', text: 'No difference — both fans stay off until reset.' },
            { id: 'b', text: 'Sheet A restores the fan by itself; sheet B keeps it off until a reset arrives.', correct: true },
            { id: 'c', text: 'Sheet B restores the fan by itself; sheet A keeps it off.' },
            { id: 'd', text: 'Both fans restore automatically after one scan.' }
        ],
        explain: 'Combinational logic is a pure function of the inputs right now — the trip clears and sheet A\'s permit comes straight back. The latch remembers: sheet B\'s Q stays TRUE with both inputs FALSE, holding the fan off until R is pulsed. That flat stretch of Q after the fault clears is the memory, and it\'s the entire difference between a nuisance trip that self-heals and a safety that stands until acknowledged.',
        learnMore: { href: '/education/boolean-logic-latches.html#sr-latch', label: 'Boolean Logic & Latches — The SR latch' },
        tags: ['boolean-logic-latches', 'logic', 'latch']
    },
    {
        type: 'tf',
        id: 'bll-set-dominant',
        prompt: 'On a set-dominant SR latch, if S and R are both TRUE on the same scan, Q is TRUE — the set wins.',
        answer: true,
        explain: 'True — that\'s what set-dominant means, and it\'s the right behavior for a safety: while the fault is still standing (S TRUE), holding the reset does nothing. You cannot reset your way past a live fault; the reset only lands once the fault has cleared. Palettes vary — reset-dominant flavors exist, where R wins — so check which one your palette gives you before trusting it with a safety.',
        learnMore: { href: '/education/boolean-logic-latches.html#sr-latch', label: 'Boolean Logic & Latches — The SR latch' },
        tags: ['boolean-logic-latches', 'logic', 'latch']
    },
    {
        type: 'mcq',
        id: 'bll-manual-reset',
        prompt: 'After a latched freeze trip, the coil warms back up and the freeze stat closes again. In the latch + manual-reset idiom, what actually restores the fan?',
        choices: [
            { id: 'a', text: 'The freeze stat closing again — the latch follows its set input.' },
            { id: 'b', text: 'A deliberate reset on the latch\'s R input — a button on a graphic, a software point, a physical switch. The stat clearing changes nothing on its own.', correct: true },
            { id: 'c', text: 'The fan proof switch closing.' },
            { id: 'd', text: 'The occupancy schedule flipping to occupied.' }
        ],
        explain: 'That\'s the idiom: S comes from the safety, R comes from a person. Once latched, Q holds TRUE with both inputs FALSE — the stat clearing is invisible to the output. Only a pulse on R drops the latch and restores the fan, which is the point: a human acknowledges the trip and looks for the cause before the equipment gets its permit back.',
        learnMore: { href: '/education/boolean-logic-latches.html#sr-latch', label: 'Boolean Logic & Latches — The SR latch' },
        tags: ['boolean-logic-latches', 'logic', 'latch']
    },
    {
        type: 'mcq',
        id: 'bll-reset-held-while-tripped',
        prompt: 'An operator holds RESET (R TRUE) while the freeze stat is still tripped (S TRUE) on a set-dominant latch — and keeps holding it as the stat finally clears. What does Q do?',
        choices: [
            { id: 'a', text: 'Q clears the moment RESET is first pressed.' },
            { id: 'b', text: 'Q stays TRUE while S is TRUE, then clears on the first scan after S drops with R still held.', correct: true },
            { id: 'c', text: 'Q stays TRUE until RESET is released and pressed a second time.' },
            { id: 'd', text: 'Q toggles between TRUE and FALSE every scan while both are held.' }
        ],
        explain: 'Walk it scan by scan with set-dominance: while S is TRUE, S wins and Q holds TRUE no matter what R says. On the first scan where S has dropped and R is still TRUE, the reset finally lands and Q clears. The held reset isn\'t queued or remembered — it simply keeps losing to S until the fault is gone, then takes effect.',
        learnMore: { href: '/education/boolean-logic-latches.html#sr-latch', label: 'Boolean Logic & Latches — The SR latch' },
        tags: ['boolean-logic-latches', 'logic', 'latch']
    },

    // ── Small idioms ───────────────────────────────────────
    {
        type: 'mcq',
        id: 'bll-xor-disagreement',
        prompt: 'A fan\'s command (BO) and its proof contact (BI) are wired into one block whose output should go TRUE exactly when the two don\'t match — commanded with no proof, or proved with no command. Which block?',
        choices: [
            { id: 'a', text: 'AND — TRUE when both agree.' },
            { id: 'b', text: 'OR — TRUE when either is TRUE.' },
            { id: 'c', text: 'XOR — TRUE when the inputs disagree.', correct: true },
            { id: 'd', text: 'An SR latch — set on command, reset on proof.' }
        ],
        explain: 'XOR is the disagreement detector: TRUE only when its inputs differ. Command TRUE with status FALSE catches a broken belt or tripped overload; status TRUE with no command catches a welded contactor or a hand switch left in HAND. The same shape checks any pair of states that must never read alike. In practice the mismatch alarm waits a few seconds before sounding so the equipment has time to actually move — <a href="/education/timers-and-delays.html#proof">that proof window</a> is its own lesson in this chapter.',
        learnMore: { href: '/education/boolean-logic-latches.html#idioms', label: 'Boolean Logic & Latches — Small idioms' },
        tags: ['boolean-logic-latches', 'logic', 'xor']
    }
];
