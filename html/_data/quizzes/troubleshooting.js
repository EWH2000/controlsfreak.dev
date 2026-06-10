// Question bank for the Troubleshooting field drill, exposed to Nunjucks
// as `quizzes['troubleshooting']`. See the sibling modbus-decoding.js
// header for the data-vs-template rationale.
//
// Field drill (no single paired lesson): symptom → most-likely-cause
// reasoning across the trade — BACnet/Modbus comms, hydronics, refrigerant,
// and VFDs. The skill being drilled is reading a symptom for what it rules
// IN and OUT, not memorizing one fix. Explanations are inline; learnMore
// points only at pages that exist (BACnet Networking, Balancing, Superheat
// & Subcooling, VFDs lessons).

module.exports = [
    // ── Comms: BACnet won't discover ──────────────────────
    {
        type: 'mcq',
        id: 'bacnet-wont-discover-across-router',
        prompt: 'A new BACnet/IP controller is online and pingable from your laptop, but it never appears in a Who-Is discovery run from the supervisor on another subnet. Most likely cause?',
        choices: [
            { id: 'a', text: 'The controller\'s device instance is wrong.' },
            { id: 'b', text: 'Who-Is is a broadcast, and broadcasts don\'t cross subnets — without a BBMD (or the device registered as a Foreign Device), the discovery never reaches it even though IP unicast (ping) does.', correct: true },
            { id: 'c', text: 'The controller\'s MS/TP MAC address collides.' },
            { id: 'd', text: 'The cable is the wrong category.' }
        ],
        explain: 'Ping working proves IP <em>unicast</em> routing is fine — but BACnet discovery (Who-Is) rides on a <strong>broadcast</strong>, and a router won\'t forward a broadcast off its subnet. So a device can be perfectly reachable by ping yet invisible to discovery across the subnet boundary. The fix is a <strong>BBMD</strong> on each subnet (forwarding broadcasts to its peers) or registering the device as a <strong>Foreign Device</strong> to a BBMD. The "pingable but undiscoverable" signature points almost straight at the broadcast/BBMD layer, not at the device\'s own config.',
        learnMore: { href: '/education/bacnet-networking.html#bbmd', label: 'BACnet Networking — BBMDs & Foreign Devices' },
        tags: ['troubleshooting', 'bacnet', 'comms']
    },

    // ── Comms: Modbus exception response ──────────────────
    {
        type: 'mcq',
        id: 'modbus-exception-02',
        prompt: 'Polling a Modbus device, you get a valid response but the function code has its high bit set and the data byte is 0x02. The device is answering — what does that mean?',
        choices: [
            { id: 'a', text: 'The device is offline; retry the poll.' },
            { id: 'b', text: 'It\'s an exception response: the high-bit function code flags an error, and exception code 0x02 means "illegal data address" — the register you asked for doesn\'t exist on that device.', correct: true },
            { id: 'c', text: 'The baud rate is mismatched.' },
            { id: 'd', text: 'The CRC failed.' }
        ],
        explain: 'The device <em>is</em> talking — that already rules out wiring, baud, and address-not-responding. A Modbus exception response echoes the function code with the <strong>high bit set</strong> (e.g. FC 03 → 0x83) and adds an exception code. <code>0x02</code> = <strong>illegal data address</strong>: usually an off-by-one (5-digit "40001" vs the zero-based 0x0000 on the wire) or a register simply not implemented in that map. <code>0x01</code> = illegal function, <code>0x03</code> = illegal data value. A getting-an-answer-but-it\'s-an-exception symptom points at your <em>request</em>, not the link.',
        learnMore: { href: '/education/modbus-decoding.html', label: 'Modbus Decoding' },
        tags: ['troubleshooting', 'modbus', 'comms']
    },

    // ── Comms: garbled Modbus / byte order ────────────────
    {
        type: 'mcq',
        id: 'modbus-float-garbled',
        prompt: 'A Modbus 32-bit float reads as a wildly wrong number — sometimes huge, sometimes tiny — but a nearby 16-bit integer on the same device reads correctly. Best first suspect?',
        choices: [
            { id: 'a', text: 'A failing CRC on the float registers only.' },
            { id: 'b', text: 'Word/byte-order mismatch: the two 16-bit registers making up the float are being assembled in the wrong order (or with swapped bytes), which the single-register integer never exposes.', correct: true },
            { id: 'c', text: 'The device needs a firmware update.' },
            { id: 'd', text: 'The float register is read-only.' }
        ],
        explain: 'A 16-bit value lives in one register and can\'t have a multi-register ordering problem, so its reading correctly tells you the link, baud, and addressing are fine. A 32-bit float spans <strong>two</strong> registers, and Modbus never standardized how to order them — big-endian, little-endian, and the two "byte-swapped" middle-endian variants all exist in the wild. Assemble the words in the order the device <em>didn\'t</em> use and you get garbage that\'s often plausible-looking magnitude-wise. The tell — multi-register values wrong, single-register values right — points straight at word/byte order, the most common Modbus integration bug.',
        learnMore: { href: '/education/modbus-decoding.html#byte-order', label: 'Modbus Decoding — byte order' },
        tags: ['troubleshooting', 'modbus', 'byte-order']
    },

    // ── Hydronics: chilled water won't hit setpoint ───────
    {
        type: 'mcq',
        id: 'chw-low-deltat-syndrome',
        prompt: 'A chilled-water plant can\'t hold setpoint at peak load even though the chillers aren\'t maxed, the pumps run flat-out, and return water comes back only a couple degrees warmer than supply. The classic name and cause?',
        choices: [
            { id: 'a', text: 'Refrigerant undercharge in the chillers.' },
            { id: 'b', text: 'Low-ΔT syndrome: coils/valves passing more flow than design (stuck-open or oversized 3-way valves, fouled coils, bad balance) so the plant moves huge GPM at a small ΔT and runs out of pumping before it runs out of tons.', correct: true },
            { id: 'c', text: 'The chilled-water setpoint is simply too low.' },
            { id: 'd', text: 'The cooling tower fans are undersized.' }
        ],
        explain: 'A narrow supply-to-return ΔT at high load is the signature of <strong>low-ΔT syndrome</strong>: the load side is returning water nearly as cold as it left, so the plant has to push enormous flow to deliver each ton, and it hits a pumping/flow limit long before a capacity limit. Usual culprits: three-way valves (or stuck-open two-ways) bypassing chilled water, coils fouled or undersized, and lost balance. The diagnostic is the ΔT itself — chillers not maxed + pumps maxed + tiny ΔT says "move the investigation to the load side and the valves," not "add chiller capacity."',
        learnMore: { href: '/education/balancing.html', label: 'Hydronic Balancing' },
        tags: ['troubleshooting', 'hydronics', 'chilled-water']
    },

    // ── Hydronics: air-bound coil ─────────────────────────
    {
        type: 'mcq',
        id: 'airbound-coil',
        prompt: 'One reheat coil at the top of a building delivers no heat. Its control valve is commanded and proven open, supply water to the branch is hot, but the coil itself stays cold. Most likely?',
        choices: [
            { id: 'a', text: 'The valve actuator has failed despite the feedback.' },
            { id: 'b', text: 'The coil is air-bound — trapped air at a system high point blocks flow through that coil; it needs to be bled/vented.', correct: true },
            { id: 'c', text: 'The hot-water setpoint is too low.' },
            { id: 'd', text: 'The pump is rotating backward.' }
        ],
        explain: 'Hot supply at the branch + a proven-open valve + a cold coil means water isn\'t actually <em>flowing through that coil</em>, and at a building high point the classic reason is <strong>trapped air</strong>. Air collects at system high points; an air pocket in or just upstream of the coil throttles or blocks flow even though the valve is wide open and hot water is available right there. Crack the coil\'s air vent until water comes; the heat usually returns immediately. The location (top of the building) plus "everything upstream is hot and open but the coil is cold" is what fingers air over a setpoint or pump problem.',
        learnMore: { href: '/education/balancing.html', label: 'Hydronic Balancing' },
        tags: ['troubleshooting', 'hydronics', 'air']
    },

    // ── Refrigerant: low superheat / flooding ─────────────
    {
        type: 'mcq',
        id: 'low-superheat-flooding',
        prompt: 'A DX system shows very low (near-zero) suction superheat and the compressor suction line is sweating/frosting hard and cold. What does this point to?',
        choices: [
            { id: 'a', text: 'Refrigerant undercharge.' },
            { id: 'b', text: 'Overfeeding / flooding: too much liquid reaching the evaporator outlet (metering device feeding too much, or overcharge), risking liquid slugging the compressor.', correct: true },
            { id: 'c', text: 'A dirty condenser.' },
            { id: 'd', text: 'A clogged liquid-line filter-drier.' }
        ],
        explain: 'Superheat is how many degrees the suction gas is above its saturation temperature — it\'s the safety margin proving the refrigerant fully boiled to vapor before reaching the compressor. <strong>Low/near-zero superheat</strong> means liquid is making it to the evaporator outlet (and toward the compressor): the metering device is overfeeding, or the system is overcharged. That\'s a <em>flooding</em> condition, and liquid slugging is how compressors die. Contrast with <em>high</em> superheat (starved evaporator — undercharge or a restriction). The reasoning: superheat reads the evaporator\'s feed, so low = too much liquid, high = too little.',
        learnMore: { href: '/education/superheat-subcooling.html', label: 'Superheat & Subcooling' },
        tags: ['troubleshooting', 'refrigerant', 'superheat']
    },

    // ── Refrigerant: high subcooling / overcharge ─────────
    {
        type: 'mcq',
        id: 'high-subcooling-overcharge',
        prompt: 'Same system, different reading: liquid-line subcooling is much HIGHER than spec and head pressure is elevated. Most likely?',
        choices: [
            { id: 'a', text: 'Undercharge — not enough refrigerant.' },
            { id: 'b', text: 'Overcharge (or a condenser-side restriction): excess liquid backs up in the condenser, raising subcooling and head pressure.', correct: true },
            { id: 'c', text: 'A stuck-open metering device.' },
            { id: 'd', text: 'Low indoor airflow.' }
        ],
        explain: 'Subcooling measures how far the liquid leaving the condenser is below its saturation temperature — it tells you how much of the condenser is backed up with liquid. <strong>High subcooling + high head pressure</strong> says too much liquid is stacking in the condenser, which is the overcharge signature (or a restriction/airflow problem on the condenser that keeps it from rejecting heat). <em>Low</em> subcooling points the other way (undercharge). Reading superheat and subcooling together localizes the fault: superheat watches the evaporator feed, subcooling watches the condenser — one undercharge symptom shows on both (high superheat, low subcooling), and the two numbers cross-check each other.',
        learnMore: { href: '/education/superheat-subcooling.html', label: 'Superheat & Subcooling' },
        tags: ['troubleshooting', 'refrigerant', 'subcooling']
    },

    // ── VFD: overcurrent on accel (gotcha) ────────────────
    {
        type: 'gotcha',
        id: 'vfd-overcurrent-accel',
        prompt: 'A VFD on a big supply fan trips on overcurrent every time it starts, but runs fine if you can nurse it up to speed. The motor and load are known good. What\'s the first parameter to look at?',
        snippet: '<pre class="quiz-snippet">fault:       OC / overcurrent\nwhen:        during acceleration only\nat speed:    runs fine, normal amps\naccel time:  3 s  ← for a high-inertia fan\ncurrent limit / accel-time param:  ?</pre>',
        choices: [
            { id: 'a', text: 'The motor is undersized; replace it with a larger one.' },
            { id: 'b', text: 'The acceleration ramp is too short for the fan\'s inertia — extend the accel time (and/or check the current-limit setting) so the drive doesn\'t demand a current spike spinning the wheel up.', correct: true },
            { id: 'c', text: 'The incoming supply voltage is too high.' },
            { id: 'd', text: 'The carrier frequency is set too low.' }
        ],
        explain: 'Tripping <em>only on acceleration</em> while running fine at speed points at the ramp, not the motor. A large fan wheel has a lot of <strong>inertia</strong>; forcing it from stop to full speed in too few seconds demands a big torque — and therefore a big current — spike that hits the drive\'s overcurrent limit. Lengthening the <strong>acceleration time</strong> (and confirming the current-limit parameter is sane) lets the drive bring the wheel up gently within its current budget. "Runs fine once it\'s there" is the giveaway that capacity is adequate and the problem is the transient, i.e. a tuning parameter — not a hardware swap.',
        learnMore: { href: '/education/vfds.html', label: 'VFDs' },
        tags: ['troubleshooting', 'vfd', 'drives']
    },

    // ── VFD: run command vs speed reference ───────────────
    {
        type: 'mcq',
        id: 'vfd-runs-at-zero-speed',
        prompt: 'A VFD shows "Run" and no faults, but the motor doesn\'t turn. Output frequency reads 0.0 Hz. The BAS proof-of-run input is satisfied. What\'s wrong?',
        choices: [
            { id: 'a', text: 'The motor is seized.' },
            { id: 'b', text: 'The run command is present but the speed reference is 0 — the start signal and the speed signal are separate, and the drive is "running" at zero Hz waiting for a reference it isn\'t getting.', correct: true },
            { id: 'c', text: 'The drive needs a power cycle.' },
            { id: 'd', text: 'The proof input is miswired.' }
        ],
        explain: 'A drive takes two independent commands: a <strong>run/enable</strong> (start) and a <strong>speed reference</strong> (how fast). They come from different places — run might be a hardwired contact or a BACnet binary, while the reference is a 0-10 V / 4-20 mA / network analog. A drive can be commanded to run and faithfully run at <em>0 Hz</em> because its speed reference is zero or missing — and a proof-of-run that just watches the run relay will happily report "running." The fix is to check the <em>reference</em> source and value, not the start logic. This run-vs-reference split is the single most common "it says it\'s on but nothing moves" trap on drives.',
        learnMore: { href: '/education/vfds.html#run-vs-speed', label: 'VFDs — run command vs speed reference' },
        tags: ['troubleshooting', 'vfd', 'drives']
    },

    // ── Method: change-one-thing discipline ───────────────
    {
        type: 'tf',
        id: 'change-one-thing',
        prompt: 'When chasing an intermittent fault, changing several settings at once gets you to a fix faster than changing one variable at a time.',
        answer: false,
        explain: 'Change <strong>one variable at a time</strong>. Flip three settings together and the symptom clears, and you\'ve learned nothing — you don\'t know which change mattered, you can\'t undo just the unnecessary ones, and you may have introduced a second latent problem masked by the first being fixed. Worse on an <em>intermittent</em> fault, where the thing might have not-happened on its own and you\'d credit the wrong change. Single-variable changes with a moment to observe between them are slower per step but far faster to a real root cause — and they leave you able to put back everything that wasn\'t the problem.',
        tags: ['troubleshooting', 'method', 'workflow']
    }
];
