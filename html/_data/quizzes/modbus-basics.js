// Question bank for the Modbus Basics quiz, exposed to Nunjucks as
// `quizzes['modbus-basics']`. Lives in _data/ so two consumers can read
// the same source: the page's inline JS (which mounts the quiz engine in
// the browser) and the FAQPage JSON-LD emitter in head.njk (which gives
// search engines an indexable Q&A representation).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_modbus-basics_* localStorage keys. Pairs with the
// Modbus Basics lesson; learnMore hrefs deep-link its <h2> anchors.

module.exports = [
    // ── What Modbus is, and isn't ─────────────────────────
    {
        type: 'tf',
        id: 'dumb-on-purpose',
        prompt: 'Nothing in a Modbus response tells you whether a register holds a temperature in tenths of a degree or a packed status word — that meaning lives only in the vendor\'s documentation.',
        answer: true,
        explain: 'Modbus is dumb on purpose. A register is just sixteen bits; the protocol carries no units, scale, or name. The device\'s manual is the contract — lose it and you have data without meaning. (This is the exact opposite of <a href="/education/bacnet-basics.html">BACnet</a>, where the object describes itself.)',
        learnMore: { href: '/education/modbus-basics.html#what-modbus-is', label: 'Modbus Basics — What Modbus is, and isn\'t' },
        tags: ['modbus', 'data-model']
    },
    {
        type: 'mcq',
        id: 'server-never-initiates',
        prompt: 'A sequence needs to catch a status bit on a Modbus server the moment it flips. How does the client find out the bit changed?',
        choices: [
            { id: 'a', text: 'The server pushes a notification when the value changes.' },
            { id: 'b', text: 'The client subscribes once and the server reports changes.' },
            { id: 'c', text: 'The client has to poll fast enough to catch it.', correct: true },
            { id: 'd', text: 'The server raises an interrupt on the bus.' }
        ],
        explain: 'Modbus servers never initiate. Every conversation starts with a client request; the server answers, then waits silently. There is no asynchronous "by the way, this just changed" — if a sequence cares how fast it sees a new value, the client must poll often enough to catch it. (Change-of-Value push is a BACnet feature, not a Modbus one.)',
        learnMore: { href: '/education/modbus-basics.html#what-modbus-is', label: 'Modbus Basics — Client and server' },
        tags: ['modbus', 'client-server']
    },
    {
        type: 'tf',
        id: 'rtu-vs-tcp-crc',
        prompt: 'Modbus TCP drops the two-byte CRC that Modbus RTU puts at the end of every frame, because TCP already handles error detection.',
        answer: true,
        explain: 'Same function codes, same data model — only the envelope changes. Modbus RTU appends a two-byte CRC for line-error detection on the serial wire; Modbus TCP wraps the same function-code-plus-data payload in a small TCP header and drops the CRC, since the TCP stack already detects corruption.',
        learnMore: { href: '/education/modbus-basics.html#function-codes', label: 'Modbus Basics — RTU vs TCP framing' },
        tags: ['modbus', 'rtu', 'tcp']
    },

    // ── The four data tables ──────────────────────────────
    {
        type: 'tf',
        id: 'tables-independent-addressing',
        prompt: 'Input register 0 and holding register 0 are the same storage location, just reached through two different function codes.',
        answer: false,
        explain: 'The four data tables are addressed independently. Register 0 in the input table and register 0 in the holding table are <em>different storage locations</em>. The address alone never tells you which table — the function code (which names the table to act on) is what disambiguates.',
        learnMore: { href: '/education/modbus-basics.html#data-tables', label: 'Modbus Basics — The four data tables' },
        tags: ['modbus', 'data-model', 'addressing']
    },
    {
        type: 'mcq',
        id: 'read-only-16bit-table',
        prompt: 'You need to read a VFD\'s speed <em>feedback</em> — a measured value the controller can\'t write. Which Modbus table is it most likely in?',
        choices: [
            { id: 'a', text: 'Holding registers (16-bit, read/write)' },
            { id: 'b', text: 'Input registers (16-bit, read-only)', correct: true },
            { id: 'c', text: 'Coils (1-bit, read/write)' },
            { id: 'd', text: 'Discrete inputs (1-bit, read-only)' }
        ],
        explain: 'Speed feedback is a measured 16-bit value the client only reads — that\'s an input register (FC04). The speed <em>command</em>, by contrast, is a setpoint the client writes, so it lives in a holding register (FC03 read, FC06/FC16 write). Coils and discrete inputs are single-bit tables.',
        learnMore: { href: '/education/modbus-basics.html#data-tables', label: 'Modbus Basics — The four data tables' },
        tags: ['modbus', 'data-model', 'vfd']
    },

    // ── Function codes ────────────────────────────────────
    {
        type: 'mcq',
        id: 'holding-register-fc-pair',
        prompt: 'Which function codes are the workhorses for holding registers — reading a setpoint and writing a setpoint — in BMS integration?',
        choices: [
            { id: 'a', text: 'FC03 to read, FC16 to write', correct: true },
            { id: 'b', text: 'FC04 to read, FC06 to write' },
            { id: 'c', text: 'FC02 to read, FC05 to write' },
            { id: 'd', text: 'FC01 to read, FC15 to write' }
        ],
        explain: 'FC03 reads holding registers; FC16 writes multiple holding registers (FC06 writes a single one). FC04 reads <em>input</em> registers — read-only sensor values — and the bit-table codes (FC01/FC02/FC05/FC15) act on coils and discrete inputs, which show up more in older industrial gear than in BMS work.',
        learnMore: { href: '/education/modbus-basics.html#function-codes', label: 'Modbus Basics — Function codes' },
        tags: ['modbus', 'function-codes']
    },
    {
        type: 'numeric',
        id: 'max-registers-per-read',
        prompt: 'The Modbus protocol caps a single register read at how many registers? (The protocol ceiling — individual devices often set lower limits.)',
        answer: 125,
        tolerance: 0,
        unit: 'registers',
        explain: 'The protocol caps a register read at 125 and a coil read at 2000 per request. Most devices set tighter limits in their docs, so a poll that reads "everything in one shot" can quietly exceed a device\'s real ceiling even when it\'s under the protocol max.',
        learnMore: { href: '/education/modbus-basics.html#function-codes', label: 'Modbus Basics — Function codes' },
        tags: ['modbus', 'function-codes', 'limits']
    },

    // ── Exception responses ───────────────────────────────
    {
        type: 'mcq',
        id: 'exception-high-bit-marker',
        prompt: 'You send an FC03 read and the server\'s reply comes back with the function-code byte reading <code>0x83</code> instead of <code>0x03</code>. What does that tell you?',
        choices: [
            { id: 'a', text: 'A normal response — <code>0x83</code> is just FC03\'s response code.' },
            { id: 'b', text: 'The request failed; the FC was echoed with its high bit set, so the next byte is an exception code.', correct: true },
            { id: 'c', text: 'The device is on the wrong baud rate.' },
            { id: 'd', text: 'The read succeeded but returned zero registers.' }
        ],
        explain: 'The high-bit-set echo is the universal exception signal: <code>FC 0x03 | 0x80 = 0x83</code>. It means "the request failed — look at the next byte for why." A response with the function code echoed and <em>no</em> high bit set is a normal one, and the bytes after it are the data you asked for.',
        learnMore: { href: '/education/modbus-basics.html#exceptions', label: 'Modbus Basics — Exception responses' },
        tags: ['modbus', 'exceptions']
    },
    {
        type: 'gotcha',
        id: 'exception-decode-wire',
        prompt: 'You poll device #1 and this comes back on the wire (after the address byte). Read it: what happened?',
        snippet: '<pre class="quiz-snippet">request:   01 03 00 31 00 01 ...\nresponse:  01 83 02 ...</pre>',
        choices: [
            { id: 'a', text: 'A normal FC03 response carrying one register of data.' },
            { id: 'b', text: 'FC03 failed with exception <code>0x02</code> — Illegal Data Address; the register isn\'t in this device\'s map.', correct: true },
            { id: 'c', text: 'FC03 failed with exception <code>0x83</code> — server failure.' },
            { id: 'd', text: 'The device returned 0x02 = two registers, value 0x83.' }
        ],
        explain: 'The response FC byte is <code>0x83</code> = <code>0x03 | 0x80</code>, so it\'s an exception, and the byte after it (<code>0x02</code>) is the exception <em>code</em>: Illegal Data Address. The function code was understood, but the requested address isn\'t in the device\'s documented map — most often a 5-digit off-by-one (asking for register <code>0x31</code> = 49 when the map stops short). <code>0x83</code> is the marker, not the reason; the reason is always the byte after it.',
        learnMore: { href: '/education/modbus-basics.html#exceptions', label: 'Modbus Basics — Exception responses' },
        tags: ['modbus', 'exceptions', 'troubleshooting']
    },
    {
        type: 'mcq',
        id: 'illegal-data-value-0x03',
        prompt: 'You write <code>150</code> to a register the manual documents as a <em>0–100 % setpoint</em> and the device returns exception <code>0x03</code> (Illegal Data Value). What is it telling you?',
        choices: [
            { id: 'a', text: 'The register address doesn\'t exist on this device.' },
            { id: 'b', text: 'The function code isn\'t supported.' },
            { id: 'c', text: 'The address is fine, but the value being written is outside the allowed range.', correct: true },
            { id: 'd', text: 'The device is offline.' }
        ],
        explain: '<code>0x03</code> Illegal Data Value means the address was valid but the value isn\'t — writing 150 to a 0–100 % register is the canonical example. Contrast: <code>0x02</code> (Illegal Data Address) is a bad <em>address</em>, and <code>0x01</code> (Illegal Function) is an unsupported function code — often FC03 aimed at a register that only exists in the input-register table.',
        learnMore: { href: '/education/modbus-basics.html#exceptions', label: 'Modbus Basics — Exception responses' },
        tags: ['modbus', 'exceptions']
    }
];
