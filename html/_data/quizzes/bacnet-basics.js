// Question bank for the BACnet Basics quiz, exposed to Nunjucks as
// `quizzes['bacnet-basics']`. Lives in _data/ so two consumers can read
// the same source: the page's inline JS (which mounts the quiz engine in
// the browser) and the FAQPage JSON-LD emitter in head.njk (which gives
// search engines an indexable Q&A representation).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_bacnet-basics_* localStorage keys. Pairs with the
// BACnet Basics lesson; learnMore hrefs deep-link its <h2> anchors.

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
