// Question bank for the BACnet Basics quiz, exposed to Nunjucks as
// `quizzes['bacnet-basics']`. Lives in _data/ so two consumers can read
// the same source: the page's inline JS (which mounts the quiz engine in
// the browser) and the FAQPage JSON-LD emitter in head.njk (which gives
// search engines an indexable Q&A representation).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_bacnet-basics_* localStorage keys. Pairs with the
// BACnet Basics lesson; learnMore hrefs deep-link its <h2> anchors
// (the Who-Is / I-Am section has no anchor of its own, so discovery
// questions land on #services, where the pair is introduced).
//
// The bank is deliberately larger than the page's defaultCount (10):
// the engine samples an overflowing bank, so each run draws a
// different subset (buildQueue() in quiz-engine.js). Coverage tracks
// the lesson's sections — the object model (families, the I/O-vs-
// Value split, 1-based multi-state enumeration, identifiers), the
// everyday services (RPM, COV and its subscription lifetime, ranged
// Who-Is discovery), the priority array (resolution, release, the
// all-null fallback to Relinquish_Default), and the MS/TP-vs-IP
// transport split.

module.exports = [
    // ── What BACnet is, and isn't ─────────────────────────
    {
        type: 'tf',
        id: 'self-describing',
        prompt: 'A BACnet Analog Input object carries its own <code>Object_Name</code>, <code>Units</code>, and <code>Present_Value</code> — so a client can read what a point is and means without a separate vendor document.',
        answer: true,
        explain: 'Self-description is the defining BACnet idea. Each object exposes named, typed properties — name, units, description, present value, limits — so a client can walk into a building it has never seen, query a controller, and build a working point list. That\'s the opposite of <a href="/education/modbus-basics.html">Modbus</a>, where the vendor\'s manual is the only thing that knows what the bits mean.',
        learnMore: { href: '/education/bacnet-basics.html#what-bacnet-is', label: 'BACnet Basics — What BACnet is, and isn\'t' },
        tags: ['bacnet', 'object-model']
    },
    {
        type: 'mcq',
        id: 'device-instance-unique',
        prompt: 'Which identifier must be globally unique across the entire BACnet internetwork?',
        choices: [
            { id: 'a', text: 'The device instance number (e.g. <code>device:1001</code>)', correct: true },
            { id: 'b', text: 'Each object\'s instance number' },
            { id: 'c', text: 'The object name string' },
            { id: 'd', text: 'The COV_Increment' }
        ],
        explain: 'The device instance number (0 to 4,194,302) uniquely identifies a controller across the whole network. An <em>object</em> instance number only has to be unique <em>within its device</em> — <code>AI:1</code> can exist on every controller. Two devices that both claim <code>device:1001</code> is a classic, hard-to-spot integration fault.',
        learnMore: { href: '/education/bacnet-basics.html#objects', label: 'BACnet Basics — Devices, objects, properties' },
        tags: ['bacnet', 'addressing']
    },
    {
        type: 'mcq',
        id: 'multistate-family',
        prompt: 'A thermostat exposes a mode point with the states AUTO / HEAT / COOL / OFF. Which BACnet object family fits?',
        choices: [
            { id: 'a', text: 'Binary (BI / BO / BV)' },
            { id: 'b', text: 'Analog (AI / AO / AV)' },
            { id: 'c', text: 'Multi-state (MSI / MSO / MSV)', correct: true },
            { id: 'd', text: 'Schedule' }
        ],
        explain: 'Three or more named states means multi-state. The state names live in the object\'s <code>State_Text</code> property and are addressed by a 1-based integer (1 = AUTO, 2 = HEAT, …). Binary objects hold exactly two states (ACTIVE / INACTIVE); analog objects hold a 32-bit float.',
        learnMore: { href: '/education/bacnet-basics.html#objects', label: 'BACnet Basics — Object families' },
        tags: ['bacnet', 'object-model']
    },
    {
        type: 'mcq',
        id: 'av-software-setpoint',
        prompt: 'A zone\'s occupied cooling setpoint lives only in the controller\'s program — no sensor behind it, no output terminal driven by it. Which object type should expose it to the network?',
        choices: [
            { id: 'a', text: 'Analog Input (AI)' },
            { id: 'b', text: 'Analog Output (AO)' },
            { id: 'c', text: 'Analog Value (AV)', correct: true },
            { id: 'd', text: 'Multi-state Value (MSV)' }
        ],
        explain: 'The <em>Value</em> members of each family — AV, BV, MSV — are the software-only points: same properties, no hardware terminal behind them. A setpoint is the textbook AV — a 32-bit float a client can read and write that exists only in the program. AO is the tempting wrong answer: an AO means the controller <em>drives a physical output</em> with that number, so exposing a setpoint as one misstates what the point is and sends an integrator hunting for a terminal that doesn\'t exist. Reading the I/O-versus-Value split is half of reading a point list correctly.',
        learnMore: { href: '/education/bacnet-basics.html#objects', label: 'BACnet Basics — Object families' },
        tags: ['bacnet', 'object-model']
    },

    // ── Services ──────────────────────────────────────────
    {
        type: 'mcq',
        id: 'read-many-service',
        prompt: 'You\'re polling a controller for one graphic\'s worth of points — thirty properties across several objects. Which service does this in a single request?',
        choices: [
            { id: 'a', text: 'Thirty separate <code>ReadProperty</code> calls' },
            { id: 'b', text: '<code>ReadPropertyMultiple</code>', correct: true },
            { id: 'c', text: '<code>SubscribeCOV</code>' },
            { id: 'd', text: '<code>Who-Is</code>' }
        ],
        explain: '<code>ReadPropertyMultiple</code> (and its write twin <code>WritePropertyMultiple</code>) fetch many properties in one request — the network overhead is the same for one property or thirty. A real graphic poll uses RPM, not a thousand individual <code>ReadProperty</code> calls, which is why a chatty integration that does one-at-a-time reads loads a network far harder than it needs to.',
        learnMore: { href: '/education/bacnet-basics.html#services', label: 'BACnet Basics — The services you\'ll see' },
        tags: ['bacnet', 'services']
    },
    {
        type: 'tf',
        id: 'cov-push',
        prompt: '<code>SubscribeCOV</code> lets a device notify the client whenever a value changes by more than its <code>COV_Increment</code> — push instead of poll.',
        answer: true,
        explain: 'Change-of-Value flips the polling model: the client subscribes once and the device sends a notification each time the value moves enough to matter. Where Modbus forces a client to poll fast enough to catch a change, BACnet lets the device announce it. Subscriptions have a lifetime, so the client re-subscribes before it expires.',
        learnMore: { href: '/education/bacnet-basics.html#services', label: 'BACnet Basics — The services you\'ll see' },
        tags: ['bacnet', 'services', 'cov']
    },
    {
        type: 'mcq',
        id: 'cov-subscription-stale',
        prompt: 'A supply-air temperature on a graphic is fed by a <code>SubscribeCOV</code> subscription. It hasn\'t moved in hours — but a manual <code>ReadProperty</code> of the same point returns a fresh value, well past the <code>COV_Increment</code>. Most likely cause?',
        choices: [
            { id: 'a', text: 'The sensor has failed.' },
            { id: 'b', text: 'The subscription\'s lifetime expired and the client never re-subscribed.', correct: true },
            { id: 'c', text: '<code>COV_Increment</code> is set too small.' },
            { id: 'd', text: 'Someone overrode the point at priority 8.' }
        ],
        explain: 'A COV subscription carries a lifetime, and when it lapses the device simply stops sending — nothing errors, the graphic just keeps the last value it was ever pushed. That\'s why the fresh manual read is the tell: the point is alive on the wire and frozen only on the subscription path. Well-behaved clients re-subscribe before the lifetime runs out. The sensor-failure guess fails the same test — a dead input wouldn\'t return a fresh, moving value — and a too-<em>small</em> <code>COV_Increment</code> would flood notifications, not silence them. Frozen on the graphic, alive on a read: suspect the subscription.',
        learnMore: { href: '/education/bacnet-basics.html#services', label: 'BACnet Basics — The services you\'ll see' },
        tags: ['bacnet', 'services', 'cov', 'troubleshooting']
    },
    {
        type: 'gotcha',
        id: 'whois-outside-range',
        prompt: 'A discovery scan on a single IP subnet comes back one device short: the rooftop unit at <code>device:2050</code> never appears, though it answers a direct <code>ReadProperty</code> without complaint. What happened?',
        snippet: '<pre class="quiz-snippet">discovery scan:  Who-Is 1000..1999   (same subnet as all three)\nnetwork has:     device:1001   device:1002   device:2050\nscan returns:    device:1001   device:1002</pre>',
        choices: [
            { id: 'a', text: 'The RTU has dropped off the network.' },
            { id: 'b', text: '<code>Who-Is</code> carried a device-instance range, and 2050 sits outside 1000–1999 — the RTU never replied because it was never asked.', correct: true },
            { id: 'c', text: 'A router between the scan tool and the RTU is dropping the broadcast.' },
            { id: 'd', text: '<code>I-Am</code> is a confirmed service, and the RTU\'s acknowledgment was lost.' }
        ],
        explain: 'A <code>Who-Is</code> can go out with no range — "everybody speak up" — or with low and high device-instance bounds, and a device answers only when its instance falls inside them. This scan asked for 1000–1999, so <code>device:2050</code> stayed silent by design: nothing is offline, blocked, or broken. On the <em>same</em> subnet, check the scan\'s range before suspecting the device. (Across subnets, "missing from discovery" really is a broadcast problem — that story belongs to <a href="/education/bacnet-networking.html">BACnet Networking</a>.) And neither service acknowledges anything: Who-Is and I-Am are both unconfirmed broadcasts.',
        learnMore: { href: '/education/bacnet-basics.html#services', label: 'BACnet Basics — The services you\'ll see' },
        tags: ['bacnet', 'services', 'troubleshooting']
    },

    // ── Priority array ────────────────────────────────────
    {
        type: 'mcq',
        id: 'priority-lowest-non-null',
        prompt: 'On a commandable AO, slot 8 (manual override) holds <code>0 %</code>, slot 16 (BMS sequence) holds <code>65 %</code>, and every other slot is null. What is the object\'s <code>Present_Value</code>?',
        choices: [
            { id: 'a', text: '65 % — the sequence at slot 16 wins.' },
            { id: 'b', text: '0 % — the lowest-numbered non-null slot wins.', correct: true },
            { id: 'c', text: 'The average of the two, 32.5 %.' },
            { id: 'd', text: 'Whichever was written most recently.' }
        ],
        explain: '<code>Present_Value</code> resolves to the value in the <em>lowest-numbered non-null slot</em>. Slot 8 sits below slot 16, so the manual override wins and the output reads 0 %. Slot 1 is highest priority, slot 16 lowest; if every slot were null the object would fall back to <code>Relinquish_Default</code>.',
        learnMore: { href: '/education/bacnet-basics.html#priority-array', label: 'BACnet Basics — The priority array' },
        tags: ['bacnet', 'priority-array']
    },
    {
        type: 'mcq',
        id: 'release-with-null',
        prompt: 'A damper is pinned by a months-old hand override at slot 8 while the sequence keeps writing slot 16. How do you hand control back to the sequence?',
        choices: [
            { id: 'a', text: 'Write the sequence\'s value into slot 8 too.' },
            { id: 'b', text: 'Write <em>null</em> to slot 8.', correct: true },
            { id: 'c', text: 'Write the new value at slot 1.' },
            { id: 'd', text: 'Power-cycle the controller.' }
        ],
        explain: 'Writing null to slot 8 <em>releases</em> it — the slot goes empty, the lowest non-null slot becomes slot 16, and the sequence takes over with nothing else changed. Writing a value (even the right one) into slot 8 just leaves the override in place at a different number. Forgetting to release is the most common way priority-array logic looks "broken": the graphic shows the resolved value, not what the sequence is writing.',
        learnMore: { href: '/education/bacnet-basics.html#priority-array', label: 'BACnet Basics — The priority array' },
        tags: ['bacnet', 'priority-array', 'troubleshooting']
    },
    {
        type: 'tf',
        id: 'relinquish-default-fallback',
        prompt: 'Release every slot of a commandable object\'s <code>Priority_Array</code> — all sixteen null — and <code>Present_Value</code> simply holds the last value it was commanded to.',
        answer: false,
        explain: 'With the whole array empty the object falls back to its <code>Relinquish_Default</code> property — a configured resting value, not a memory of the last command. That matters at commissioning: release the only override holding a point and, with nothing else writing, it doesn\'t stay put — it goes wherever <code>Relinquish_Default</code> points, which is the classic answer to "why did the valve move overnight when nobody was commanding it?" To watch the fallback happen slot by slot, the <a href="/tools/bacnet-priority.html">Priority Array resolver</a> lets you empty the array and see what wins.',
        learnMore: { href: '/education/bacnet-basics.html#priority-array', label: 'BACnet Basics — The priority array' },
        tags: ['bacnet', 'priority-array']
    },

    // ── Object families (gotcha) ──────────────────────────
    {
        type: 'gotcha',
        id: 'multistate-mapped-as-binary',
        prompt: 'An integration maps a three-state fan command into the BMS like this. What breaks?',
        snippet: '<pre class="quiz-snippet">source object:  MSV:4  Fan_Mode  (1=OFF, 2=LOW, 3=HIGH)\nmapped as:      BV:21  Fan_Cmd   (INACTIVE / ACTIVE)</pre>',
        choices: [
            { id: 'a', text: 'Nothing — a Binary Value can hold any number of states.' },
            { id: 'b', text: 'A Binary Value only holds two states, so LOW and HIGH collapse into one — the third state is unreachable.', correct: true },
            { id: 'c', text: 'Multi-state objects can\'t be mapped across devices.' },
            { id: 'd', text: 'The instance numbers must match for the map to work.' }
        ],
        explain: 'A Binary object is strictly two-state (ACTIVE / INACTIVE). A three-state multi-state command can\'t round-trip through it — you lose the distinction between LOW and HIGH, and the BMS can never command the third state. The fix is to map it to a Multi-state Value and carry the <code>State_Text</code>, or expose the states some other faithful way. Matching the object <em>family</em> to the data is part of reading a point list correctly.',
        learnMore: { href: '/education/bacnet-basics.html#objects', label: 'BACnet Basics — Object families' },
        tags: ['bacnet', 'object-model', 'integration']
    },
    {
        type: 'gotcha',
        id: 'multistate-one-based',
        prompt: 'An integration commands a three-state fan from a map built the way a programmer counts. What breaks?',
        snippet: '<pre class="quiz-snippet">target object:   MSV:4  Fan_Mode   State_Text: ["OFF", "LOW", "HIGH"]\nintegration map: OFF=0   LOW=1   HIGH=2      ← values it writes</pre>',
        choices: [
            { id: 'a', text: 'Nothing — 0, 1, and 2 are valid states for a three-state object.' },
            { id: 'b', text: 'Multi-state states are numbered 1 to N, so there is no state 0 — the OFF write fails, and the LOW and HIGH writes land one state low.', correct: true },
            { id: 'c', text: 'The integration must write the state <em>names</em> ("OFF", "LOW", "HIGH") — numbers are never valid.' },
            { id: 'd', text: 'MSV objects aren\'t commandable, so none of the writes will take.' }
        ],
        explain: 'Multi-state <code>Present_Value</code> is a 1-based enumeration: a three-state object holds state 1, 2, or 3, and <em>there is no state 0</em>. <code>State_Text</code> entry 1 names state 1 — the names are labels, the integer is what you write. A map built on the 0-based habit fails twice: the write of 0 is rejected as out of range, and every remaining command lands one state low — writing 1 for LOW actually selects OFF. Off-by-one enum maps are a classic integration bug precisely because most of the writes "work"; the fan just does the wrong thing.',
        learnMore: { href: '/education/bacnet-basics.html#objects', label: 'BACnet Basics — Object families' },
        tags: ['bacnet', 'object-model', 'integration']
    },

    // ── Transport ─────────────────────────────────────────
    {
        type: 'numeric',
        id: 'bacnet-ip-port',
        prompt: 'What UDP port does BACnet/IP use by default? (It\'s <code>0xBAC0</code> in hex — the source of the "BACnet" port mnemonic.)',
        answer: 47808,
        tolerance: 0,
        unit: '',
        explain: 'The IANA-registered BACnet/IP port is UDP <strong>47808</strong>, which is <code>0xBAC0</code> in hex. Knowing the hex form is what lets you recognize a device address that ends in <code>BAC0</code> — and spot one ending in <code>BAC1</code> (47809) as a device on a second, non-default BACnet/IP network.',
        learnMore: { href: '/education/bacnet-basics.html#mstp-vs-ip', label: 'BACnet Basics — MS/TP vs BACnet/IP' },
        tags: ['bacnet', 'bacnet-ip', 'ports']
    },
    {
        type: 'tf',
        id: 'mstp-ip-same-object-model',
        prompt: 'Move a controller from an MS/TP bus to BACnet/IP and its object model, property names, services, and priority array all stay identical — only the framing around each message changes.',
        answer: true,
        explain: 'MS/TP and BACnet/IP are two data-link options for the same protocol logic. The objects, properties, services, and priority array are defined once in ASHRAE 135 and don\'t care what\'s underneath; only the wrapper differs — RS-485 token-passing frames versus UDP datagrams on port 47808. What does change across the boundary is the <em>broadcast</em> story, which is BACnet Networking\'s subject.',
        learnMore: { href: '/education/bacnet-basics.html#mstp-vs-ip', label: 'BACnet Basics — MS/TP vs BACnet/IP' },
        tags: ['bacnet', 'mstp', 'bacnet-ip']
    }
];
