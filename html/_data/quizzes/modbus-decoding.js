// Question bank for the Modbus Decoding quiz, exposed to Nunjucks as
// `quizzes['modbus-decoding']`. Lives in _data/ so two consumers can
// read the same source: the page's inline JS (which mounts the quiz
// engine in the browser) and the FAQPage JSON-LD emitter in head.njk
// (which gives search engines an indexable Q&A representation).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_modbus-decoding_* localStorage keys.

module.exports = [
    // ── 5-digit trap ──────────────────────────────────────
    {
        type: 'mcq',
        id: 'five-digit-wire-address',
        prompt: 'A vendor\'s Modbus table lists the supply-air temperature at <code>40123</code>. What address do you put on the wire?',
        choices: [
            { id: 'a', text: '<code>40123</code>' },
            { id: 'b', text: '<code>123</code>' },
            { id: 'c', text: '<code>122</code>', correct: true },
            { id: 'd', text: '<code>124</code>' }
        ],
        explain: 'The leading <code>4</code> names the holding-register table — it\'s not part of the wire address. The remaining four digits are 1-based, so <code>40123</code> means "the 123rd holding register" — and the wire is 0-based, so the actual address is <code>123 − 1 = 122</code>. Reading <code>40123</code> straight gets you an exception; reading <code>123</code> is the classic off-by-one.',
        learnMore: { href: '/education/modbus-decoding.html#five-digit-trap', label: 'Modbus Decoding — The 5-digit numbering trap' },
        tags: ['modbus', 'addressing']
    },
    {
        type: 'mcq',
        id: 'five-digit-table-prefix',
        prompt: 'You see <code>30005</code> in a vendor manual. Which function code reads it, and what is the wire address?',
        choices: [
            { id: 'a', text: 'FC 03, wire address <code>5</code>' },
            { id: 'b', text: 'FC 04, wire address <code>4</code>', correct: true },
            { id: 'c', text: 'FC 03, wire address <code>4</code>' },
            { id: 'd', text: 'FC 04, wire address <code>5</code>' }
        ],
        explain: 'Leading <code>3</code> = input-register table = FC 04. The remaining <code>0005</code> is 1-based, so the wire address is <code>4</code>. FC 03 reads holding registers (leading <code>4</code>). The classic mix-up is reaching for FC 03 on a leading-<code>3</code> address and getting an exception.',
        learnMore: { href: '/education/modbus-basics.html#function-codes', label: 'Modbus Basics — Function codes' },
        tags: ['modbus', 'function-codes', 'addressing']
    },

    // ── Signed vs unsigned ───────────────────────────────
    {
        type: 'tf',
        id: 'signed-high-bit',
        prompt: 'A 16-bit register returns <code>0xFFF3</code>. If the docs say the value is an <code>INT16</code>, the high bit being 1 means the decoded value is negative.',
        answer: true,
        explain: 'Two\'s complement: high bit set on a signed type means negative. <code>0xFFF3</code> as INT16 is <code>−13</code>; as UINT16 it\'s <code>65523</code>. The bit pattern is identical — the interpretation choice is yours, and the docs are what tell you which is right.',
        learnMore: { href: '/education/modbus-decoding.html#signed-vs-unsigned', label: 'Modbus Decoding — Signed vs unsigned' },
        tags: ['modbus', 'signed']
    },
    {
        type: 'mcq',
        id: 'signed-misread-signature',
        prompt: 'An outdoor-air temperature sensor occasionally reads ≈ <code>65521</code> when the weather is cold. What\'s the most likely cause?',
        choices: [
            { id: 'a', text: 'A flaky sensor — replace the probe.' },
            { id: 'b', text: 'A wrap-around bug in the BMS.' },
            { id: 'c', text: 'The register is signed (INT16), being read as unsigned.', correct: true },
            { id: 'd', text: 'A wrong scale factor in the integration table.' }
        ],
        explain: 'Values pinned near <code>65535</code> on a sensor that physically can\'t reach that magnitude are the unmistakable signature of a signed value being read unsigned. <code>65521</code> as UINT16 is <code>−15</code> as INT16 — a believable cold outdoor reading. Fix the type tag in the integration, not the sensor.',
        learnMore: { href: '/education/modbus-decoding.html#signed-vs-unsigned', label: 'Modbus Decoding — Signed vs unsigned' },
        tags: ['modbus', 'signed', 'troubleshooting']
    },

    // ── Byte order ───────────────────────────────────────
    {
        type: 'gotcha',
        id: 'byte-order-identify',
        prompt: 'A vendor\'s docs say a 32-bit float at register <code>40101</code> reads <code>50.24 °F</code>. You pull the two registers and see this on the wire. Which byte ordering is this device using?',
        snippet: '<pre class="quiz-snippet">register 40101 (N+0):  0xF5C3\nregister 40102 (N+1):  0x4248</pre>',
        choices: [
            { id: 'a', text: 'ABCD (strict-Modbus)' },
            { id: 'b', text: 'CDAB (Modicon word-swap)', correct: true },
            { id: 'c', text: 'BADC (byte-in-word)' },
            { id: 'd', text: 'DCBA (full reverse)' }
        ],
        explain: 'Reassemble what came off the wire: <code>F5 C3 42 48</code>. The IEEE-754 big-endian float of <code>0x4248F5C3</code> is ≈ 50.24, which means the bytes <em>should</em> be <code>42 48 F5 C3</code> in network order — and they\'re not. Swapping the two registers gives <code>4248 F5C3</code>, which decodes correctly: that\'s CDAB. (Legacy Modicon PLCs forwarded their internal little-endian word layout to the wire this way.)',
        learnMore: { href: '/education/modbus-decoding.html#byte-order', label: 'Modbus Decoding — The four byte orders' },
        tags: ['modbus', 'byte-order', '32-bit']
    },
    {
        type: 'tf',
        id: 'byte-order-consistency',
        prompt: 'Once you\'ve identified a device\'s 32-bit byte ordering, you can trust it to be the same across every 32-bit value on that device.',
        answer: true,
        explain: 'Manufacturers don\'t mix orderings within a product. Figure it out once at commissioning (the <a href="/tools/modbus-register-viewer.html">Modbus Register Viewer</a>\'s 32-bit Pair tab is built for this), document it on the job, and move on. Don\'t re-test every register.',
        learnMore: { href: '/education/modbus-decoding.html#byte-order', label: 'Modbus Decoding — The four byte orders' },
        tags: ['modbus', 'byte-order']
    },

    // ── Scaling ──────────────────────────────────────────
    {
        type: 'numeric',
        id: 'scaling-tenths',
        prompt: 'A holding register returns <code>523</code>. The vendor docs say <em>scale 0.1, units °F</em>. What\'s the engineering value, in °F?',
        answer: 52.3,
        tolerance: 0.05,
        unit: '°F',
        explain: 'Implicit decimal point: the register stores the value × 10 to preserve one decimal place in an integer. <code>523 × 0.1 = 52.3 °F</code>. The most common Modbus scaling pattern.',
        learnMore: { href: '/education/modbus-decoding.html#scaling', label: 'Modbus Decoding — Scaling' },
        tags: ['modbus', 'scaling']
    },
    {
        type: 'numeric',
        id: 'scaling-offset',
        prompt: 'A register returns <code>1024</code>. The docs say the encoding is <em>(actual − 100) × 10</em>. What\'s the actual engineering value?',
        answer: 202.4,
        tolerance: 0.05,
        unit: '',
        explain: 'Reverse the encoding: <code>actual = (raw / 10) + 100 = (1024 / 10) + 100 = 102.4 + 100 = 202.4</code>. Offset-and-scale patterns name both numbers in the docs; both have to be applied. Older equipment that exposed calibration values directly tends to use this shape.',
        learnMore: { href: '/education/modbus-decoding.html#scaling', label: 'Modbus Decoding — Scaling' },
        tags: ['modbus', 'scaling']
    },

    // ── Exceptions + FC confusion ────────────────────────
    {
        type: 'mcq',
        id: 'exception-illegal-address',
        prompt: 'You read register <code>40050</code> on a device and get back exception code <code>0x02</code> (Illegal Data Address). The device responded — what\'s most likely going on?',
        choices: [
            { id: 'a', text: 'The device is offline; <code>0x02</code> is a connection-level error.' },
            { id: 'b', text: 'The register exists but the value can\'t be read right now.' },
            { id: 'c', text: 'The wire address is outside the device\'s implemented map (often an off-by-one on 5-digit numbering).', correct: true },
            { id: 'd', text: 'The function code <code>0x03</code> isn\'t supported by the device.' }
        ],
        explain: '<code>0x02</code> = the function code was understood and the device responded, but the requested address (or address range) doesn\'t exist on this device. The most common cause on a freshly-integrated device is reading <code>40050</code> as wire address <code>50</code> instead of <code>49</code> — the 5-digit numbering trap, surfacing as an exception. Unsupported function code is <code>0x01</code> (Illegal Function), not <code>0x02</code>.',
        learnMore: { href: '/education/modbus-basics.html#exceptions', label: 'Modbus Basics — Exception responses' },
        tags: ['modbus', 'exceptions']
    },
    {
        type: 'gotcha',
        id: 'fc03-vs-fc04-poll',
        prompt: 'A poll definition on a Niagara integration looks like this. What\'s wrong?',
        snippet: '<pre class="quiz-snippet">Device:        AHU-1\nFunction:      ReadInputRegisters (FC 04)\nStart address: 0\nQuantity:      10\nPoint maps:    40001..40010 → AI_01..AI_10</pre>',
        choices: [
            { id: 'a', text: 'FC 04 with start address <code>0</code> reads device firmware data, not point data.' },
            { id: 'b', text: 'The point map uses 5-digit holding addresses (<code>4xxxx</code>) but the function code reads input registers — the function code and the table prefix have to match.', correct: true },
            { id: 'c', text: 'The quantity (<code>10</code>) exceeds the per-frame limit for FC 04.' },
            { id: 'd', text: 'Nothing — this is a valid Niagara ProxyExt config.' }
        ],
        explain: 'Leading <code>4</code> in the point names = holding registers = FC 03. Leading <code>3</code> = input registers = FC 04. This poll is asking for input registers but mapping them to addresses that document themselves as holding. Either change the function to <code>ReadHoldingRegisters (FC 03)</code>, or change the point map to <code>30001..30010</code>. Reading the wrong table is the #2 cause of "the read works but the value is garbage" — #1 being the 5-digit off-by-one above.',
        learnMore: { href: '/education/modbus-basics.html#function-codes', label: 'Modbus Basics — Function codes' },
        tags: ['modbus', 'function-codes', 'integration']
    }
];
