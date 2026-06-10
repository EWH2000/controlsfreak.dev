// Question bank for the Controller Swap field drill, exposed to Nunjucks
// as `quizzes['controller-swap']`. See the sibling modbus-decoding.js
// header for the data-vs-template rationale.
//
// Field drill (no single paired lesson): broad coverage of replacing a
// DDC controller — the hardware work (wiring, addressing, terminations)
// and the software work (backup, download, graphics, commissioning).
// Explanations are inline; learnMore points at the existing lessons only
// where they genuinely cover the underlying concept.

module.exports = [
    // ── Hardware: before you pull anything ────────────────
    {
        type: 'tf',
        id: 'photograph-before-pulling',
        prompt: 'Before de-terminating a failed controller, the first move is to photograph and label every wire and terminal — even when you\'re sure you\'ll remember the landings.',
        answer: true,
        explain: 'Always. A controller swap is mostly a re-landing job, and the field wiring is the part nobody documented well. Photos plus tape flags on each conductor turn "which wire went to UI-3?" from an afternoon of buzzing-out into a two-minute reference. Memory is the thing that fails an hour later when half the bundle is out of the panel and they all look the same.',
        learnMore: { href: '/education/controller-wiring.html#putting-together', label: 'Controller Wiring — the whole controller, landed' },
        tags: ['controller-swap', 'hardware', 'field-practice']
    },
    {
        type: 'mcq',
        id: 'sensors-are-dumb',
        prompt: 'You\'ve landed the field sensors (a 10K thermistor, an RTD, a 4-20 mA transmitter) on the new controller. What do they need before they\'ll read right?',
        choices: [
            { id: 'a', text: 'Each sensor must be reprogrammed to match the new controller.' },
            { id: 'b', text: 'Nothing on the sensor side — they\'re dumb. But the controller\'s input must be configured for the right type/range, and you verify wiring and loop power.', correct: true },
            { id: 'c', text: 'They need new calibration certificates.' },
            { id: 'd', text: 'They must be matched to the new controller\'s firmware version.' }
        ],
        explain: 'Field sensors carry no configuration — a thermistor is a resistor, a 4-20 mA transmitter just pushes current. The intelligence is in the controller\'s input: it has to know "UI-3 is a 10K type-2 thermistor" or "AI-5 is 4-20 mA, 0-250 °F" to turn the raw signal into a value. Land the wire, set the input type/range, confirm loop power and scaling — the sensor itself needs nothing.',
        learnMore: { href: '/education/controller-wiring.html#inputs', label: 'Controller Wiring — inputs & loop power' },
        tags: ['controller-swap', 'hardware', 'sensors']
    },
    {
        type: 'mcq',
        id: 'eol-resistor-placement',
        prompt: 'The new controller sits on an MS/TP (RS-485) trunk. Where do end-of-line termination resistors belong?',
        choices: [
            { id: 'a', text: 'At every device on the trunk.' },
            { id: 'b', text: 'Only at the two physical ends of the trunk.', correct: true },
            { id: 'c', text: 'Only at the supervisor / JACE.' },
            { id: 'd', text: 'Nowhere — RS-485 doesn\'t use termination.' }
        ],
        explain: 'RS-485 wants exactly two terminations: one at each physical end of the daisy-chain, matched to the cable impedance to kill reflections. A device in the middle of the run is not terminated. If the controller you removed happened to be an end-of-line device, the new one needs its EOL jumper/resistor set the same way — and if you\'ve mid-spanned a device that used to be the end, you\'ve now got the wrong count and a flaky bus.',
        tags: ['controller-swap', 'hardware', 'mstp', 'rs485']
    },

    // ── Hardware: addressing ──────────────────────────────
    {
        type: 'mcq',
        id: 'mstp-station-address-match',
        prompt: 'Swapping an MS/TP controller, what should the new unit\'s MAC (station) address be set to?',
        choices: [
            { id: 'a', text: 'Any free address on the trunk — the supervisor rediscovers it.' },
            { id: 'b', text: 'The same station address the old unit used (via dip switch or config), so the supervisor and bus still find it where they expect.', correct: true },
            { id: 'c', text: 'Always 0, the master default.' },
            { id: 'd', text: 'It doesn\'t matter as long as the device instance is right.' }
        ],
        explain: 'Reuse the old station address. The supervisor\'s polling, the trunk\'s token-passing order, and any hard-coded references all expect the device at its known MAC. Pick a fresh address and you may collide with another master, fall outside Max_Master, or simply not appear where the integration looks for it. Set it on the new unit the same way the old one was set — dip switches or a config parameter.',
        learnMore: { href: '/education/bacnet-networking.html#three-addresses', label: 'BACnet Networking — Three addresses, one device' },
        tags: ['controller-swap', 'hardware', 'mstp', 'addressing']
    },
    {
        type: 'numeric',
        id: 'mstp-master-address-max',
        prompt: 'Valid MS/TP master station addresses run from 0 up to what maximum?',
        answer: 127,
        tolerance: 0,
        unit: '',
        explain: 'An MS/TP MAC is a single byte, and masters live in the range 0–127 (128–254 are reserved for slaves; 255 is the broadcast address). The practical ceiling on how high you should go is the bus\'s Max_Master setting — the token only passes up to Max_Master, so an address above it is invisible no matter how valid it looks.',
        learnMore: { href: '/education/bacnet-networking.html#three-addresses', label: 'BACnet Networking — Three addresses, one device' },
        tags: ['controller-swap', 'hardware', 'mstp', 'addressing']
    },
    {
        type: 'mcq',
        id: 'device-instance-reuse',
        prompt: 'The replacement is a BACnet/IP controller. What should its device-instance number be?',
        choices: [
            { id: 'a', text: 'A brand-new unique number; update the graphics to match afterward.' },
            { id: 'b', text: 'The same device instance the old controller had — it\'s the network-wide identity the graphics and sequences reference.', correct: true },
            { id: 'c', text: 'The same as its IP address\'s last octet.' },
            { id: 'd', text: 'Left at the factory default; the BMS reassigns it.' }
        ],
        explain: 'The device instance is the controller\'s application-layer identity — what every graphic binding and inter-device reference points at, and what survives a re-IP or a move. Reuse the old instance and the rest of the system keeps working untouched. Pick a new one and you\'re re-binding everything that referenced the old device — and if the old instance is still claimed elsewhere, a duplicate-instance conflict is its own miserable afternoon.',
        learnMore: { href: '/education/bacnet-networking.html#three-addresses', label: 'BACnet Networking — Three addresses, one device' },
        tags: ['controller-swap', 'hardware', 'bacnet-ip', 'addressing']
    },
    {
        type: 'tf',
        id: 'dont-disturb-balancing',
        prompt: 'While you\'re working in the mechanical room on a controller swap, it\'s fine to back off a nearby balancing valve that\'s in your way and set it back "about where it was" after.',
        answer: false,
        explain: 'Leave balancing valves alone. A calibrated balancing valve\'s position is the result of a commissioning procedure, and "about where it was" is not a setting — disturb it and you\'ve silently re-unbalanced that branch, with the complaint showing up weeks later in some occupied space. If a valve genuinely has to move, note its exact position first and restore it precisely, or flag it for re-balancing.',
        learnMore: { href: '/education/balancing.html#cbv', label: 'Hydronic Balancing — Calibrated balancing valves' },
        tags: ['controller-swap', 'hardware', 'balancing']
    },

    // ── Software ──────────────────────────────────────────
    {
        type: 'mcq',
        id: 'backup-before-removal',
        prompt: 'The controller is failing but still communicates. What\'s the highest-value software move before you pull it?',
        choices: [
            { id: 'a', text: 'Factory-reset it so the new unit starts clean.' },
            { id: 'b', text: 'Pull a full backup of its configuration and application program while it can still talk.', correct: true },
            { id: 'c', text: 'Nothing — the new controller ships with the program.' },
            { id: 'd', text: 'Clear its alarms so the swap starts quiet.' }
        ],
        explain: 'Get the backup first. A controller that still communicates is the easiest place to recover the as-built program, point list, tuning, schedules, and trims — all the site-specific work that isn\'t in any vendor default. Once the unit is dead or pulled, you\'re rebuilding from drawings and memory. A new controller ships blank; the value is in the configuration you\'re about to lose.',
        tags: ['controller-swap', 'software', 'backup']
    },
    {
        type: 'mcq',
        id: 'graphics-rebind',
        prompt: 'After you download the application to the new controller, the BMS graphic for it still shows stale values or red ✗ marks. Likely reason?',
        choices: [
            { id: 'a', text: 'The graphic is cached; it always clears itself in a few hours.' },
            { id: 'b', text: 'The graphic\'s bindings point at device/point references that changed — they need re-pointing at the new controller\'s identity and point IDs.', correct: true },
            { id: 'c', text: 'The new controller is faster than the graphic can handle.' },
            { id: 'd', text: 'Graphics never work after a controller swap; rebuild from scratch.' }
        ],
        explain: 'Graphics bind to specific references — device instance plus object/point identifiers. If the swap changed the device instance, or the point IDs/names came out different after the download, every binding that resolved before now dangles. Reusing the old device instance avoids most of this; where IDs still moved, the bindings get re-pointed. Stale values and ✗ marks are the binding layer telling you it can\'t find what it used to.',
        tags: ['controller-swap', 'software', 'graphics']
    },
    {
        type: 'gotcha',
        id: 'points-read-is-not-commissioned',
        prompt: 'New controller in, program downloaded, and the graphic shows every point live with believable numbers. The tech calls the swap done. What did they likely skip?',
        snippet: '<pre class="quiz-snippet">points on graphic:  all reading, values look sane ✓\nsequence verified:  ?\noverrides / priority: ?</pre>',
        choices: [
            { id: 'a', text: 'Nothing — points reading correctly means the swap is complete.' },
            { id: 'b', text: 'Verifying the sequence actually runs and re-checking commanded outputs: points reading ≠ logic working, and priority-array overrides / releases don\'t survive a swap.', correct: true },
            { id: 'c', text: 'Re-calibrating every sensor against a reference.' },
            { id: 'd', text: 'Replacing the field wiring.' }
        ],
        explain: 'Points reading values only proves the inputs are wired and scaled — it says nothing about whether the control logic does the right thing. You have to exercise the sequence: command outputs, watch the equipment respond, confirm interlocks and setpoints. And commandable outputs come up with their priority arrays reset — any operator override or hand-off that was holding a point before the swap is gone, and any slot you leave written will quietly fight the sequence. "It reads" is the start of commissioning, not the end.',
        learnMore: { href: '/education/bacnet-basics.html#priority-array', label: 'BACnet Basics — The priority array' },
        tags: ['controller-swap', 'software', 'commissioning']
    }
];
