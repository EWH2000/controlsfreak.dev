// Question bank for the Controller Wiring quiz, exposed to Nunjucks as
// `quizzes['controller-wiring']`. Lives in _data/ so two consumers read
// one source: the page's inline JS (mounts the engine in the browser)
// and the FAQPage JSON-LD emitter in head.njk.
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_controller-wiring_* localStorage keys. Pairs with the
// Controller Wiring lesson; learnMore hrefs deep-link its <h2>
// anchors. Sequential order is the lesson walk: power & the shared
// common → inputs → outputs.
//
// Deliberate scope split: the field-wiring-sensors drill already owns
// sensor identification — thermistor/RTD curves, the live-zero meaning,
// mA→EU scaling, shield practice. This bank stays on the LANDINGS —
// the shared COM reference, transformer phasing, LOOP+ vs the AC hot
// leg (which terminal and why), wet vs dry contacts, and the
// output-side power-vs-signal traps. Don't drift questions across
// that line when editing either bank.

module.exports = [
    // ── Power & the shared common ─────────────────────────
    {
        type: 'mcq',
        id: 'com-shared-reference',
        prompt: 'A controller gives you a whole row of COM terminals next to its inputs, all internally bonded to 24COM. Why does every sensor return, every AO common, and the far leg of every contact come back to this same point?',
        choices: [
            { id: 'a', text: 'COM is the controller\'s 0 V reference — an input measures its signal between its own terminal and COM, so a return that never reaches COM leaves the reading meaningless.', correct: true },
            { id: 'b', text: 'Each COM terminal is individually fused, so spreading the returns across the row protects each field circuit.' },
            { id: 'c', text: 'The returns carry the controller\'s own operating current, and many small common wires beat one large one.' },
            { id: 'd', text: 'It\'s a housekeeping convention only — any continuous wire back to the panel would read the same.' }
        ],
        explain: 'This is the single most important idea in the whole panel: <strong>COM is the shared reference for everything.</strong> A measurement is always a difference between two points, and the controller takes every one of them against its 0 V — the voltage across a transmitter\'s output, the resistance pushed through a thermistor, the wetting circuit through a contact. The COM row exists purely so you have somewhere to land all those returns; the screws are the <em>same node</em> as 24COM, just more of it. No fuses, no current-sharing trick — reference, not plumbing.',
        learnMore: { href: '/education/controller-wiring.html#power', label: 'Controller Wiring — power & the shared common' },
        tags: ['signals', 'controller-wiring', 'power']
    },
    {
        type: 'mcq',
        id: 'shared-transformer-crossed-legs',
        prompt: 'Two controllers share one 24 VAC transformer to save space and VA. Controller A\'s 24COM lands on one secondary leg; controller B\'s 24COM lands on the other. Each controller powers up and runs fine on its own bench test. What\'s waiting to happen in the panel?',
        choices: [
            { id: 'a', text: 'Any wire that\'s supposed to be "common" to both — a shared sensor, a shield, a jumper — bridges the two legs of the secondary: a dead short, a blown fuse, or a fried input.', correct: true },
            { id: 'b', text: 'Nothing — 24 VAC is alternating, so neither leg is "positive" and the leg choice can\'t matter.' },
            { id: 'c', text: 'Both controllers see 48 VAC and burn out the moment power is applied.' },
            { id: 'd', text: 'The controllers run normally, but every analog reading on both is inverted.' }
        ],
        explain: 'It\'s true that neither AC leg is "positive" — but many controllers <strong>half-wave rectify</strong> their 24 VAC internally, which makes them polarity-sensitive: whichever leg lands on 24COM becomes that device\'s 0 V. Cross the legs between two devices and their two "commons" sit a full 24 V apart, so the first genuinely shared conductor completes a short across the secondary. The blown fuse is the panel telling you, loudly, that the circuit is wrong — by design, since the fuse is cheaper than the controller. The rule is simple and absolute: <strong>on a shared transformer, every COM lands on the same leg.</strong> (The 48 V answer belongs to a different fault — see the numeric question.)',
        learnMore: { href: '/education/controller-wiring.html#power', label: 'Controller Wiring — power & the shared common' },
        tags: ['signals', 'controller-wiring', 'power']
    },
    {
        type: 'numeric',
        id: 'crossed-commons-voltage',
        prompt: 'Two devices share one 24 VAC transformer, but one device\'s COM is tied to one secondary leg and the other device\'s COM to the opposite leg. Before anything bridges them, about how many volts sit between the two "commons"?',
        answer: 24,
        tolerance: 1,
        unit: 'V',
        explain: 'The two "commons" are the two ends of the same secondary winding, so they sit the <strong>full secondary voltage</strong> apart — 24 V. The famous <em>"almost 48 volts"</em> war story is a different animal: that one needs <strong>two separate transformers wired out of phase</strong>, where the two commons really can sit nearly twice the secondary voltage apart. On one shared secondary the answer is 24, and either way the fix is the same phasing rule — every COM on the same leg; phase them, or fuse and separate them, never cross them.',
        learnMore: { href: '/education/controller-wiring.html#power', label: 'Controller Wiring — power & the shared common' },
        tags: ['signals', 'controller-wiring', 'power']
    },

    // ── Inputs ────────────────────────────────────────────
    {
        type: 'mcq',
        id: 'ui-vs-bi-roles',
        prompt: 'A field controller\'s point list shows eight UIs and four BIs. What\'s the difference between the two input types?',
        choices: [
            { id: 'a', text: 'A UI (universal input) is configured per point to read one of several electrical quantities — resistance, voltage, or current; a BI (binary input) is dedicated to reading an on/off contact.', correct: true },
            { id: 'b', text: 'UIs read AC signals; BIs read DC signals.' },
            { id: 'c', text: 'UIs can be written to by the BMS as outputs; BIs are read-only.' },
            { id: 'd', text: 'UIs accept only powered transmitters; BIs accept only thermistors.' }
        ],
        explain: 'A universal input is one set of terminals with several personalities: configured for <strong>resistance</strong> it reads a thermistor, for <strong>voltage</strong> a 0–10 V transmitter, for <strong>current</strong> a 4–20 mA loop. The wiring and the configuration have to agree — a UI set for the wrong quantity (or the wrong thermistor curve) reads confidently and wrongly. A BI is simpler by design: it watches a contact make or break the circuit back to COM. Neither type is an output, and neither cares about AC vs DC as a category — that\'s set by what the point is configured to read.',
        learnMore: { href: '/education/controller-wiring.html#inputs', label: 'Controller Wiring — inputs' },
        tags: ['signals', 'controller-wiring', 'inputs']
    },
    {
        type: 'mcq',
        id: 'two-wire-loop-terminal',
        prompt: 'You\'re landing a 2-wire 4-20 mA transmitter on a controller. Which terminal should feed the transmitter\'s + lead, and why that one?',
        choices: [
            { id: 'a', text: 'The controller\'s LOOP+ terminal (or a dedicated 24 VDC supply) — the transmitter\'s electronics ride on the loop and need DC to regulate; the 24 VAC hot leg gives them nothing to regulate.', correct: true },
            { id: 'b', text: 'The 24V~ hot terminal — the loop should run off the same 24 VAC that powers the controller.' },
            { id: 'c', text: 'An AO terminal — analog outputs source current, so one can double as loop power.' },
            { id: 'd', text: 'COM — the loop draws its power from the controller\'s common.' }
        ],
        explain: 'A 2-wire transmitter regulates the current flowing through the loop it sits in, and because its own electronics ride on that loop, the loop must be powered with <strong>DC</strong> — typically 12–30 VDC from the controller\'s loop-power terminal or a separate 24 VDC supply. The path: DC out of <strong>LOOP+</strong>, into the transmitter\'s +, through the transmitter, and back into the input (configured for current) on the − side, where a small internal resistor turns the current into a voltage read against COM. Land the + on the AC hot leg instead and there\'s no DC to regulate — the point reads 0 mA, dead, exactly as if you\'d never powered it at all.',
        learnMore: { href: '/education/controller-wiring.html#inputs', label: 'Controller Wiring — inputs' },
        tags: ['signals', 'controller-wiring', 'inputs', 'loop-power']
    },
    {
        type: 'tf',
        id: 'wet-vs-dry-contact',
        prompt: 'A binary input just watches a contact open and close, so it makes no difference whether the field contact is dry or externally powered ("wet") — the BI reads it correctly either way.',
        answer: false,
        explain: 'The BI isn\'t a passive observer — it supplies its own low-voltage <strong>wetting current</strong> out the terminal, and a <strong>dry</strong> contact (a relay, a switch, a proof-of-flow paddle) simply completes that circuit back to COM or doesn\'t. A <strong>wet</strong> contact already carries a voltage from another panel; land it as if it were dry and you back-feed one panel from another — the controller\'s manual calls out how externally powered contacts must be landed. Know which kind you have <em>before</em> you land it. (And either way, the return has to actually reach COM — a contact with its far leg floating can never make the circuit and reads OPEN no matter what the equipment does.)',
        learnMore: { href: '/education/controller-wiring.html#inputs', label: 'Controller Wiring — inputs' },
        tags: ['signals', 'controller-wiring', 'inputs']
    },

    // ── Outputs ───────────────────────────────────────────
    {
        type: 'mcq',
        id: 'ao-signal-not-power',
        prompt: 'A tech lands a 0-10 V damper actuator with two conductors: AO1 to the actuator\'s signal input, and the actuator\'s signal common back to the controller\'s COM. The controller commands 60% and the actuator never moves. What\'s missing?',
        choices: [
            { id: 'a', text: 'The actuator\'s own 24 VAC power — the AO is a signal, not a power source, and 10 V at a few milliamps won\'t swing a damper. Power, signal, and common: all three, every time.', correct: true },
            { id: 'b', text: 'Nothing — two conductors is correct, so the actuator itself has failed and should be replaced.' },
            { id: 'c', text: 'The AO should be reconfigured for 4-20 mA, which carries enough current to drive the motor.' },
            { id: 'd', text: 'The signal common should be lifted — tying it to COM shorts out the command signal.' }
        ],
        explain: 'The recurring output-side mistake: <strong>the controller\'s signal is not the load\'s power.</strong> A 0–10 V actuator needs three things, and a tech in a hurry lands two of them — 24 VAC to run the motor, the control signal from the AO, and the signal common back to the controller\'s COM so both devices measure that 0–10 V against the same reference. Skip the power and it sits dead while the controller cheerfully commands 60%; land power and signal but float the common and the command has no shared reference and drifts. Neither mA re-configuration nor lifting the common fixes a missing motor supply.',
        learnMore: { href: '/education/controller-wiring.html#outputs', label: 'Controller Wiring — outputs' },
        tags: ['signals', 'controller-wiring', 'outputs']
    },
    {
        type: 'gotcha',
        id: 'bo-c-never-fed',
        prompt: 'The controller commands a fan on. The BO relay audibly clicks — and the contactor never pulls in. The landing sheet reads:',
        snippet: '<pre class="quiz-snippet">BO1  → contactor coil        ✓\ncoil return → 24COM          ✓\nBO-C → (nothing landed)\ncommand ON → relay clicks, fan never starts</pre>',
        choices: [
            { id: 'a', text: 'The BO is a dry relay contact — it switches nothing of its own. BO-C was never fed from the 24 VAC hot leg, so the relay is closing onto a leg with no power on it.', correct: true },
            { id: 'b', text: 'The contactor coil is wired backwards — swap its two leads.' },
            { id: 'c', text: 'A relay output can\'t switch 24 VAC — this load needs a triac BO.' },
            { id: 'd', text: 'The coil\'s return should land on the hot leg instead of 24COM.' }
        ],
        explain: 'The click is the relay doing its job perfectly — closing two terminals together and switching <em>nothing of its own</em>. To make a BO do something you pass a circuit <strong>through</strong> it: 24 VAC hot to <strong>BO-C</strong> (the relay\'s source terminal), the switched side out BO1 to the load, and the load back to 24COM. With BO-C left empty, the relay closes onto dead copper. A 24 VAC coil has no polarity, so "backwards" isn\'t a thing here; relays switch 24 VAC all day; and moving the return to the hot leg just guarantees a different wrong circuit. Feed BO-C from the hot leg, or the relay clicks and nothing runs — the classic head-scratcher.',
        learnMore: { href: '/education/controller-wiring.html#outputs', label: 'Controller Wiring — outputs' },
        tags: ['signals', 'controller-wiring', 'outputs']
    },
    {
        type: 'mcq',
        id: 'triac-vs-relay-bo',
        prompt: 'Some controllers\' binary outputs are triacs instead of relay contacts. Which loads is a triac BO the wrong choice for?',
        choices: [
            { id: 'a', text: 'DC circuits, and anything that needs a truly isolated contact or must be provably de-energized — a triac is an AC-only solid-state switch that latches on with DC, isn\'t a floating dry contact, and leaks a small current even when "off".', correct: true },
            { id: 'b', text: '24 VAC contactor coils — triacs can\'t switch inductive loads.' },
            { id: 'c', text: 'Floating actuators — those require relay outputs.' },
            { id: 'd', text: 'Every load — triacs only work as inputs, not outputs.' }
        ],
        explain: 'The wiring intent is the same as a relay — switch a 24 VAC leg to a load — and with no moving contacts to wear out, triacs are a good fit for loads that cycle constantly. But a triac is not a dry contact: it handles <strong>24 VAC only</strong> (it latches on and can\'t interrupt a DC load), it isn\'t a floating, isolated contact, and its small off-state leakage can hold a sensitive load partly energized. Between those three, it\'s the wrong switch for a DC circuit and the wrong proof that a circuit is truly dead. Switching 24 VAC coils is exactly what triacs are built for — including, very commonly, floating actuators.',
        learnMore: { href: '/education/controller-wiring.html#outputs', label: 'Controller Wiring — outputs' },
        tags: ['signals', 'controller-wiring', 'outputs']
    },
    {
        type: 'mcq',
        id: 'floating-actuator-triacs',
        prompt: 'How does a controller drive a floating (tristate) actuator?',
        choices: [
            { id: 'a', text: 'With two binary outputs — one inches the actuator open, the other inches it closed; with neither output on, it holds position.', correct: true },
            { id: 'b', text: 'With one AO — the actuator follows a 0-10 V position signal.' },
            { id: 'c', text: 'With one BO — on is full open, off is full closed.' },
            { id: 'd', text: 'With a 4-20 mA loop, where 12 mA means half open.' }
        ],
        explain: 'A floating actuator has no analog position input — the controller nudges it with <strong>two outputs</strong>, an <em>open</em> command and a <em>close</em> command, inching it in each direction and letting it sit when neither is driven. That\'s why triac pairs are so common here: the two outputs cycle constantly in small pulses, and solid-state switches don\'t wear. The 0–10 V position signal is the <em>modulating</em> actuator story from the AO side — a different device with a different landing (power + signal + common). One BO open/closed is a two-position damper, not floating; and 4–20 mA positioning is again the analog world, not tristate.',
        learnMore: { href: '/education/controller-wiring.html#outputs', label: 'Controller Wiring — outputs' },
        tags: ['signals', 'controller-wiring', 'outputs']
    }
];
