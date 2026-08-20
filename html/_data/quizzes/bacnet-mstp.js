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
//
// The bank is deliberately larger than the page's defaultCount (10):
// the engine samples an overflowing bank, so each run draws a
// different subset (buildQueue() in quiz-engine.js). Coverage tracks
// the lesson's sections — the token ring, the two addresses, the two
// wires, and reading the symptom.

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
        type: 'tf',
        id: 'router-port-is-a-node',
        prompt: 'The router that links an MS/TP trunk to the rest of the BMS doesn\'t occupy a station address of its own — its trunk port just listens and forwards, so it never takes a turn holding the token.',
        answer: false,
        explain: 'The router\'s MS/TP port is a master on the trunk like everything else: it owns a MAC (conventionally a low one — 0 or 1 is typical), joins the token ring, and must hold the token to speak, exactly like the smallest zone controller. Plan the trunk\'s address map with the router\'s port in it, and set its station address at commissioning the same as any device on the pair.',
        learnMore: { href: '/education/bacnet-mstp.html#token-ring', label: 'BACnet MS/TP — The token ring' },
        tags: ['bacnet', 'mstp', 'token-ring', 'addressing']
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
    {
        type: 'mcq',
        id: 'max-master-where-to-set',
        prompt: 'Commissioning a fresh trunk: the router\'s port at MAC 0, fourteen controllers at MACs 1–14. Where does <code>Max_Master</code> belong?',
        choices: [
            { id: 'a', text: 'Left at the factory 127 on every device — that\'s the legal ceiling, and lowering it risks stranding a device someone adds later.' },
            { id: 'b', text: 'Exactly 14 everywhere — the highest MAC in use, so not one poll is wasted on an empty address.' },
            { id: 'c', text: 'One value on every device, a little above the highest MAC — say 20 — so a controller can join later without touching the whole trunk.', correct: true },
            { id: 'd', text: 'Set on the router only — the field controllers pick the ceiling up from the token as it circulates.' }
        ],
        explain: '<code>Max_Master</code> is a per-device property and nothing propagates it — each device searches only up to its <em>own</em> ceiling, which is why the healthy trunk sets one uniform value everywhere. 127 works, but every rotation then Poll-For-Masters through a hundred-odd addresses nobody owns — the trunk runs, it just spends a chunk of every rotation talking to nobody. Pinning the ceiling exactly at the highest MAC is clean today and a trunk-wide reconfiguration the day MAC 15 shows up. Compact MACs starting low, one ceiling a little above the highest: the search stays short and the trunk stays extendable.',
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
    {
        type: 'gotcha',
        id: 'instance-names-no-mac',
        prompt: 'The graphics know the unit; you need the trunk device. What\'s the reliable way to get RTU-4\'s MAC?',
        snippet: '<pre class="quiz-snippet">graphics binding:  RTU-4 = device 200304\ntrunk 3:           MACs 1–18 in use\nneeded:            RTU-4\'s MAC address</pre>',
        choices: [
            { id: 'a', text: 'Read it out of the instance — sites number instances to encode the MAC, and 200304 ends in 4.' },
            { id: 'b', text: 'Count boxes down the trunk from the router — station addresses follow the physical daisy-chain order.' },
            { id: 'c', text: 'Look it up — the front end\'s device properties or the as-builts record the MAC; nothing in the protocol ties it to the instance.', correct: true },
            { id: 'd', text: 'Drop the site\'s numbering prefix from 200304 — the protocol derives the station address from the digits that remain.' }
        ],
        explain: 'The pairing is arbitrary at the protocol level — MAC 5 can be device 100503 — and BACnet derives nothing in either direction. Plenty of sites <em>do</em> run a numbering convention that encodes trunk and MAC in the instance, and it\'s worth learning the local one — but it\'s a habit, not a rule, and it drifts a little with every controller that got replaced in a hurry. Assuming the pattern is how the wrong controller gets reprogrammed. Physical order proves nothing either: MACs come off DIP switches or a vendor-tool field, set in whatever order commissioning visited the boxes. When it matters, read the MAC from where it\'s recorded and verify at the device.',
        learnMore: { href: '/education/bacnet-mstp.html#two-addresses', label: 'BACnet MS/TP — Two addresses' },
        tags: ['bacnet', 'mstp', 'addressing']
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
        type: 'gotcha',
        id: 'bench-fine-stub',
        prompt: 'The tee saved pulling the daisy chain apart. Why do the errors climb in service when the controller itself tests clean?',
        snippet: '<pre class="quiz-snippet">install:   new controller tee-tapped mid-trunk on a 30 ft stub\nbench:     same controller, wired direct — runs clean\nin place:  trunk-wide CRC + retry counts climbing at 76800 baud</pre>',
        choices: [
            { id: 'a', text: 'The controller\'s transceiver is marginal — the errors track the new hardware, so swap it and the counts settle.' },
            { id: 'b', text: 'The stub is an unterminated branch — it reflects the signal back into the trunk, corrupting frames in proportion to stub length and baud.', correct: true },
            { id: 'c', text: '76800 baud is beyond what MS/TP is specified to run; the trunk needs to come down to 38400 or slower.' },
            { id: 'd', text: 'One more transceiver pushed the segment past its unit-load budget, and the whole trunk pays for it.' }
        ],
        explain: 'A branch line looks harmless and works on the bench; electrically it\'s an unterminated reflection generator, corrupting frames in proportion to its length and the baud rate — which is exactly why the bench test (no stub) came up clean and the trunk (30 ft of stub at 76800) didn\'t. The bench run also clears the transceiver, and 76800 is in the standard rate set — a common field pick, not an overreach. Unit loads don\'t care how a device connects: if the budget were the story, landing the same controller in-line would fail the same way, and that swap is the test that separates the two. The fix is the topology rule — break the chain and land the trunk in-and-out at the new controller\'s terminals, stubs as close to zero as the terminal block allows.',
        learnMore: { href: '/education/bacnet-mstp.html#two-wires', label: 'BACnet MS/TP — The two wires' },
        tags: ['bacnet', 'mstp', 'wiring', 'troubleshooting']
    },
    {
        type: 'mcq',
        id: 'trunk-cable-choice',
        prompt: 'What does an MS/TP trunk actually ask of its cable?',
        choices: [
            { id: 'a', text: 'Any twisted pair — the twist does the work, and impedance is a radio-frequency concern, not a 76800-baud one.' },
            { id: 'b', text: 'Ordinary thermostat wire on short runs — the cable budgets only start to bite as a trunk approaches 4000 ft.' },
            { id: 'c', text: 'Shielded twisted pair with the shield bonded to ground at both ends, so induced noise has two paths out.' },
            { id: 'd', text: 'Shielded twisted pair in the 100–130 Ω impedance class, low capacitance — the cable the segment ratings assume.', correct: true }
        ],
        explain: 'The standard\'s budgets are rated for proper cable — shielded twisted pair, 100–130 Ω characteristic impedance, low capacitance — and run on anything else, every budget shrinks by an amount nobody publishes. The impedance class isn\'t an RF nicety: it\'s why the 120 Ω terminators match the line and actually absorb reflections. Thermostat wire — no shield, no controlled impedance — may limp through a short bench run, but the ratings were never about it, and a wrong-cable trunk lives in the marginal territory where cable quality, temperature, and one forgotten stub decide whether it holds. And the shield lands on ground at one end only, same rule as sensor wiring — bond both ends and the shield becomes a ground-loop path instead of a drain.',
        learnMore: { href: '/education/bacnet-mstp.html#two-wires', label: 'BACnet MS/TP — The two wires' },
        tags: ['bacnet', 'mstp', 'wiring']
    },
    {
        type: 'mcq',
        id: 'extension-moves-the-end',
        prompt: 'A trunk ends at AHU-4, its EOL switched on. An electrician extends the run past AHU-4 to three new VAVs. What does the extension demand of the termination?',
        choices: [
            { id: 'a', text: 'Nothing — termination is a device setting, and AHU-4 keeps the one it was commissioned with.' },
            { id: 'b', text: 'AHU-4\'s EOL switches off — it\'s mid-trunk now — and the new last VAV terminates instead.', correct: true },
            { id: 'c', text: 'Keep AHU-4\'s and terminate the new end as well — three terminators beats a missing one.' },
            { id: 'd', text: 'Add a repeater at AHU-4 — an extension is a new segment, and segments don\'t share terminators.' }
        ],
        explain: 'An EOL marks a position, not a device: the resistors belong across the pair at the two physical ends of the trunk, and the extension just moved one of those ends. Leave AHU-4\'s switch on and the trunk has a terminator mid-run plus, if nobody terminates the last VAV, a floating far end — the count is wrong twice. Three terminators isn\'t insurance either — over-terminating loads the pair down, the classic three-or-four-flipped-on-by-habit failure. And a repeater answers a budget problem, length or device count, not a moved end; three VAVs on the same run is the same segment it always was. Two terminators, at the ends, wherever the ends are today.',
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
    {
        type: 'tf',
        id: 'budgets-tighten-with-baud',
        prompt: 'The distance budget isn\'t one number: vendor field guides quote shorter maximum runs at the higher baud rates, so a trunk that\'s comfortable at 19200 can be marginal at 76800.',
        answer: true,
        explain: 'The 4000 ft (1200 m) figure is the standard\'s ceiling for proper cable; the working numbers are the vendor\'s, and they tighten as the baud climbs — shorter quoted runs, stricter device counts. Everything marginal on a trunk bites harder at speed: the borderline cable, the temperature swing, the one stub nobody remembers. Worth knowing which side of the two-tier line a trunk sits on before raising its baud — past the vendor\'s figure it could be a problem; past the standard\'s, it is one.',
        learnMore: { href: '/education/bacnet-mstp.html#two-wires', label: 'BACnet MS/TP — The two wires' },
        tags: ['bacnet', 'mstp', 'wiring', 'baud']
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
    },
    {
        type: 'gotcha',
        id: 'whole-trunk-dead-shape',
        prompt: 'Which cause fits an everything-at-once outage?',
        snippet: '<pre class="quiz-snippet">complaint:  every device on the trunk offline since this morning\nchecked:    router up and healthy on its IP side\nhistory:    panel work over the weekend</pre>',
        choices: [
            { id: 'a', text: 'One controller\'s MAC got bumped above the trunk\'s Max_Master ceiling during the work.' },
            { id: 'b', text: 'Two controllers came back up on the same station address when the panel went back together.' },
            { id: 'c', text: 'The router restarted with Max_Info_Frames at 1 and is starving the trunk\'s traffic.' },
            { id: 'd', text: 'A fault the whole pair shares — a polarity swap introduced mid-trunk, a wrong termination count, missing bias, or a dead short.', correct: true }
        ],
        explain: 'When the whole trunk goes down together, suspect what every frame has in common: the pair itself. A polarity swap introduced mid-trunk, no termination at all (or three of them), missing bias leaving the pair floating, a pinched jacket\'s dead short — each one takes everybody out at once. The other three fail the shape test: a MAC above the ceiling silences that one device and nothing else; a duplicate MAC makes a pair of devices take turns flickering while error counts climb; a starved router makes the trunk slow, not silent. Symptom shape is the first sort — one device, two devices, sluggish, or everything — and everything-at-once is an electrical-layer word.',
        learnMore: { href: '/education/bacnet-mstp.html#symptom-layer', label: 'BACnet MS/TP — Reading the symptom' },
        tags: ['bacnet', 'mstp', 'troubleshooting']
    }
];
