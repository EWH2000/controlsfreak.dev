// Question bank for the BACnet MS/TP quiz, exposed to Nunjucks as
// `quizzes['bacnet-mstp']`. Lives in _data/ so two consumers can read
// the same source: the page's inline JS (which mounts the quiz engine
// in the browser) and the FAQPage JSON-LD emitter in head.njk (which
// gives search engines an indexable Q&A representation).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_bacnet-mstp_* localStorage keys. Pairs with the BACnet
// MS/TP lesson; learnMore hrefs deep-link its <h2> anchors.

module.exports = [
    // ── The token ring ────────────────────────────────────
    {
        type: 'mcq',
        id: 'why-a-token',
        prompt: 'MS/TP runs on an RS-485 pair, and only the device holding the token may initiate a message. What problem does the token solve?',
        choices: [
            { id: 'a', text: 'RS-485 has no collision arbitration — if two devices transmit at once, both messages die, so the token decides whose turn it is.', correct: true },
            { id: 'b', text: 'It encrypts each frame so devices can trust the sender.' },
            { id: 'c', text: 'It carries the trunk\'s time synchronization so every device shares a clock.' },
            { id: 'd', text: 'It regenerates the signal on long trunks, like a repeater.' }
        ],
        explain: 'RS-485 is a shared pair with no referee — simultaneous transmitters corrupt each other. BACnet\'s answer is a token passed around a logical ring of masters ordered by MAC address: hold the token, talk; pass it to the next master up; the highest address wraps back to the lowest. On a healthy trunk the token makes hundreds of rotations a minute.',
        learnMore: { href: '/education/bacnet-mstp.html#token-ring', label: 'BACnet MS/TP — The token ring' },
        tags: ['bacnet', 'mstp', 'token-ring']
    },
    {
        type: 'gotcha',
        id: 'max-master-ceiling',
        prompt: 'A new controller is added to a working trunk — wired correctly, right baud, unique MAC — and it simply never shows up, while everything else stays healthy. The trunk looks like this. Why is the new device invisible?',
        snippet: '<pre class="quiz-snippet">existing devices:  MAC 1–23,  Max_Master = 40 (all)\nnew controller:    MAC 45,   powered, polarity verified</pre>',
        choices: [
            { id: 'a', text: 'Its transceiver failed in shipping.' },
            { id: 'b', text: 'MAC 45 sits above the trunk\'s Max_Master of 40 — no token holder ever sends Poll-For-Master that high, so it is never invited into the ring.', correct: true },
            { id: 'c', text: 'MAC 45 duplicates an existing address.' },
            { id: 'd', text: 'Twenty-four devices exceeds the segment limit.' }
        ],
        explain: 'A token holder searches for newcomers by sending Poll-For-Master to addresses between itself and the next known master — but never above its own <code>Max_Master</code>. With every device capped at 40, MAC 45 can\'t be polled into the ring. Nothing is broken, so nothing fixes it: not a power cycle, not a new transceiver, not reterminating the same two wires a third time. Readdress the controller below the ceiling, or raise <code>Max_Master</code> on every device on the trunk.',
        learnMore: { href: '/education/bacnet-mstp.html#token-ring', label: 'BACnet MS/TP — The token ring' },
        tags: ['bacnet', 'mstp', 'token-ring', 'troubleshooting']
    },
    {
        type: 'mcq',
        id: 'max-info-frames-allowance',
        prompt: 'A trunk is fully online but sluggish, and the router that funnels the whole segment\'s traffic to the front end is set to <code>Max_Info_Frames = 1</code>. What does raising it to 10–20 change?',
        choices: [
            { id: 'a', text: 'The router may send that many messages per token visit, instead of waiting a full rotation for each one.', correct: true },
            { id: 'b', text: 'The router polls for new devices more often.' },
            { id: 'c', text: 'The router can reach MAC addresses above the Max_Master ceiling.' },
            { id: 'd', text: 'The router holds the token permanently until its queue empties.' }
        ],
        explain: '<code>Max_Info_Frames</code> is the talking allowance — how many messages a device may initiate each time it holds the token. Field controllers are fine at 1; the supervisor or router carrying everyone\'s traffic wants 10–20, or it spends most of the day waiting for its next turn. The other classic sluggish-trunk miss is <code>Max_Master</code> left at the factory 127 on a small trunk: every rotation wastes time polling a hundred-odd empty addresses.',
        learnMore: { href: '/education/bacnet-mstp.html#token-ring', label: 'BACnet MS/TP — The token ring' },
        tags: ['bacnet', 'mstp', 'token-ring']
    },

    // ── Two addresses ─────────────────────────────────────
    {
        type: 'mcq',
        id: 'duplicate-mac-flicker',
        prompt: 'After a controller swap, two devices on the trunk — nowhere near each other in the device list — start taking turns flickering offline, and retry and CRC counts climb trunk-wide. Most likely cause?',
        choices: [
            { id: 'a', text: 'The replacement shipped at a factory-default MAC that duplicates an existing device — both transmit on the same token turn and the frames collide.', correct: true },
            { id: 'b', text: 'The replacement\'s device instance collides with a graphic binding.' },
            { id: 'c', text: 'The trunk lost one of its EOL terminators during the swap.' },
            { id: 'd', text: 'The replacement\'s Max_Info_Frames is set too high.' }
        ],
        explain: 'Two devices sharing a MAC both believe it\'s their turn when the token reaches that address; both transmit, the frames corrupt, and depending on timing one wins for a while before they trade — so the front end shows two controllers <em>taking turns</em> offline, often far apart in the device list because their instances are nothing alike. Fresh controllers commonly default to MAC 0 or 1, which is usually the router. And a duplicate degrades everyone, not just the twins: MAC and device instance are independent — the MAC only has to be unique on this segment, the instance across the whole site.',
        learnMore: { href: '/education/bacnet-mstp.html#two-addresses', label: 'BACnet MS/TP — Two addresses' },
        tags: ['bacnet', 'mstp', 'addressing', 'troubleshooting']
    },

    // ── The two wires ─────────────────────────────────────
    {
        type: 'tf',
        id: 'baud-mismatch-mute',
        prompt: 'Every device on an MS/TP segment must run the same baud rate — a device set to 9600 on a 38400 trunk doesn\'t just run slower, it never joins the ring at all.',
        answer: true,
        explain: 'MS/TP has no per-device rate negotiation: 9600, 19200, 38400, and 76800 are the standard set (38400 and 76800 the common field picks), and the whole segment runs one of them. A device at the wrong baud is simply mute — it can\'t parse the traffic, never answers a Poll-For-Master, and its own transmissions read as garbage on everyone else\'s scope. "One device never appears" with good wiring and a legal MAC is a wrong-baud suspect right after the Max_Master ceiling.',
        learnMore: { href: '/education/bacnet-mstp.html#two-wires', label: 'BACnet MS/TP — The two wires' },
        tags: ['bacnet', 'mstp', 'baud']
    },
    {
        type: 'mcq',
        id: 'eol-two-ends',
        prompt: 'Where do the 120 Ω EOL terminators belong on an MS/TP trunk?',
        choices: [
            { id: 'a', text: 'Across the pair at each physical end of the trunk — exactly two, nowhere else.', correct: true },
            { id: 'b', text: 'At every device, switched on.' },
            { id: 'c', text: 'At the router only.' },
            { id: 'd', text: 'One at each end, plus one mid-trunk on long runs.' }
        ],
        explain: 'Termination absorbs reflections where they start — the two physical ends of the daisy chain. Most controllers carry the resistor onboard behind an EOL switch or jumper, which is exactly why the field failure is three or four flipped on by habit, or none at all. An EOL switched on mid-trunk is also a quiet way to make one device "never appear" while everything else limps along.',
        learnMore: { href: '/education/bacnet-mstp.html#two-wires', label: 'BACnet MS/TP — The two wires' },
        tags: ['bacnet', 'mstp', 'wiring']
    },
    {
        type: 'tf',
        id: 'ab-polarity-trap',
        prompt: 'RS-485 "A" and "B" terminal labels mean the same thing on every manufacturer\'s gear, so landing A-to-A and B-to-B down the trunk is always safe.',
        answer: false,
        explain: 'The cruel joke of RS-485: A and B aren\'t defined the same way by every manufacturer, so two vendors\' "A" terminals can be opposite polarities. Trust the + and − markings, or the wire colors of a consistent install, over the letters. The pair is polarity-sensitive at every single device — and one swapped device can drag the whole segment down, not just itself, because its transceiver actively drives the pair inverted.',
        learnMore: { href: '/education/bacnet-mstp.html#two-wires', label: 'BACnet MS/TP — The two wires' },
        tags: ['bacnet', 'mstp', 'wiring', 'polarity']
    },
    {
        type: 'mcq',
        id: 'fail-safe-bias',
        prompt: 'Between transmissions, nothing drives the RS-485 pair. What keeps receivers from chattering on noise during the idle gaps?',
        choices: [
            { id: 'a', text: 'Fail-safe bias at one point on the trunk — weak pull-aparts that hold the pair at a defined idle state.', correct: true },
            { id: 'b', text: 'The 120 Ω terminators at each end.' },
            { id: 'c', text: 'The token itself — it never stops circulating.' },
            { id: 'd', text: 'The cable shield, grounded at both ends.' }
        ],
        explain: 'Bias resistors gently pull the two conductors apart so an idle bus rests at a defined state instead of floating where any noise flips receivers. One point on the trunk provides it — conventionally the supervisor or router. Termination is a different job (absorbing reflections at the ends), and the shield lands on ground at <em>one</em> end only, the same rule as sensor wiring. Missing bias reads as a whole trunk gone garbage-prone, the pair left floating.',
        learnMore: { href: '/education/bacnet-mstp.html#two-wires', label: 'BACnet MS/TP — The two wires' },
        tags: ['bacnet', 'mstp', 'wiring']
    },
    {
        type: 'numeric',
        id: 'segment-unit-loads',
        prompt: 'ASHRAE 135 rates an MS/TP segment for up to 4000 ft (1200 m) of proper cable and how many full unit loads of transceivers?',
        answer: 32,
        tolerance: 0,
        unit: 'unit loads',
        explain: 'The standard\'s budget is 4000 ft (1200 m) of shielded twisted pair and <strong>32 full unit loads</strong> — modern ⅛-load transceivers stretch the device count, though many vendors still draw the line near 32 devices per segment without a repeater. The budgets read in two tiers: past the <em>vendor\'s</em> figure it could be a problem; past the <em>standard\'s</em> figure it is a problem — that\'s a repeater or a second segment, not another reterminating pass.',
        learnMore: { href: '/education/bacnet-mstp.html#two-wires', label: 'BACnet MS/TP — The two wires' },
        tags: ['bacnet', 'mstp', 'wiring']
    },

    // ── Reading the symptom ───────────────────────────────
    {
        type: 'gotcha',
        id: 'symptom-layer-afternoon-drops',
        prompt: 'A service call reads like this. Per the symptom → layer table, which layer is failing?',
        snippet: '<pre class="quiz-snippet">complaint:  random devices drop offline and return,\n            noticeably worse mid-afternoon\nchecked:    all MACs legal and unique, baud matches,\n            Max_Master clears every address</pre>',
        choices: [
            { id: 'a', text: 'Ring tuning — Max_Info_Frames too low on the router.' },
            { id: 'b', text: 'Addressing — a duplicate MAC.' },
            { id: 'c', text: 'Electrical — marginal termination or bias drifting with temperature, EMI from a VFD sharing conduit, or a star tap reflecting under load.', correct: true },
            { id: 'd', text: 'Application — colliding device instances.' }
        ],
        explain: 'Random drops that track time of day are the electrical layer\'s signature: marginal termination or bias drifting as the building heats up, a VFD\'s EMI arriving with the afternoon load, or the star tap someone added on the last retrofit doing its reflection work. Addressing failures are consistent (the same two devices trade places); ring-tuning failures are steady sluggishness, not random drops. The complaint usually names its layer before the meter comes out — and a freshly extended trunk is often carrying several failures at once, so walk all three layers.',
        learnMore: { href: '/education/bacnet-mstp.html#symptom-layer', label: 'BACnet MS/TP — Reading the symptom' },
        tags: ['bacnet', 'mstp', 'troubleshooting']
    }
];
