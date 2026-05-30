// Question bank for the BACnet Networking quiz, exposed to Nunjucks as
// `quizzes['bacnet-networking']`. Lives in _data/ so two consumers can
// read the same source: the page's inline JS (which mounts the quiz
// engine in the browser) and the FAQPage JSON-LD emitter in head.njk
// (which gives search engines an indexable Q&A representation).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_bacnet-networking_* localStorage keys. Pairs with the
// BACnet Networking lesson; learnMore hrefs deep-link its <h2> anchors.

module.exports = [
    // ── Three addresses ───────────────────────────────────
    {
        type: 'mcq',
        id: 'device-instance-is-forever',
        prompt: 'You re-IP a controller and move it to a different subnet. Which of its three identifiers is unchanged afterward?',
        choices: [
            { id: 'a', text: 'Its MAC address (IP + port)' },
            { id: 'b', text: 'Its network number' },
            { id: 'c', text: 'Its device instance number', correct: true },
            { id: 'd', text: 'All three change together.' }
        ],
        explain: 'The device instance is the application-layer identity — the number the BMS graphic remembers and the sequence programs against. It doesn\'t encode topology, so a re-IP or a move can shift the MAC (the data-link IP + port) and the network number, but the instance number stays the same instance number. Only the device instance is forever.',
        learnMore: { href: '/education/bacnet-networking.html#three-addresses', label: 'BACnet Networking — Three addresses, one device' },
        tags: ['bacnet', 'addressing']
    },
    {
        type: 'mcq',
        id: 'mstp-mac-size',
        prompt: 'On an MS/TP bus, a device\'s MAC address is…',
        choices: [
            { id: 'a', text: 'a single byte — the station address, 0 to 127', correct: true },
            { id: 'b', text: 'six bytes — four of IP plus two of UDP port' },
            { id: 'c', text: 'a 16-bit network number' },
            { id: 'd', text: 'the 22-bit device instance' }
        ],
        explain: 'An MS/TP MAC is one byte: the device\'s RS-485 station address, in the range 0–127. A BACnet/IP MAC, by contrast, is six bytes (four of IPv4 address plus two of UDP port). Both are <em>data-link</em> addresses — the network number and device instance live at higher layers.',
        learnMore: { href: '/education/bacnet-networking.html#three-addresses', label: 'BACnet Networking — Three addresses, one device' },
        tags: ['bacnet', 'mstp', 'addressing']
    },
    {
        type: 'numeric',
        id: 'bacnet-ip-mac-bytes',
        prompt: 'How many bytes is a BACnet/IP MAC address (the IPv4 address plus the UDP port)?',
        answer: 6,
        tolerance: 0,
        unit: 'bytes',
        explain: 'Four bytes of IPv4 address plus two bytes of UDP port = six. That\'s why an EBO hex address of 8 characters (4 bytes) is the IP alone, and 12 characters (6 bytes) carries the port too — <code>C0A80164BAC0</code> is 192.168.1.100 : 47808.',
        learnMore: { href: '/education/bacnet-networking.html#three-addresses', label: 'BACnet Networking — Three addresses, one device' },
        tags: ['bacnet', 'bacnet-ip', 'addressing']
    },
    {
        type: 'mcq',
        id: 'network-number-broadcast-all',
        prompt: 'Which BACnet network number means "broadcast to every network"?',
        choices: [
            { id: 'a', text: '0' },
            { id: 'b', text: '1' },
            { id: 'c', text: '65535', correct: true },
            { id: 'd', text: '47808' }
        ],
        explain: 'Network <code>65535</code> is the global-broadcast network number; network <code>0</code> means "the local network, wherever this message originated." Useful, assignable network numbers run 1 to 65534. (47808 is the BACnet/IP UDP <em>port</em>, not a network number — different layer entirely.)',
        learnMore: { href: '/education/bacnet-networking.html#three-addresses', label: 'BACnet Networking — Three addresses, one device' },
        tags: ['bacnet', 'addressing']
    },

    // ── BBMDs ─────────────────────────────────────────────
    {
        type: 'mcq',
        id: 'routers-drop-broadcasts',
        prompt: 'A Who-Is sent on subnet A never reaches devices on subnet B, even though a router connects them. Why?',
        choices: [
            { id: 'a', text: 'Routers, by design, do not forward UDP broadcasts.', correct: true },
            { id: 'b', text: 'BACnet broadcasts are encrypted and the router can\'t read them.' },
            { id: 'c', text: 'The Who-Is TTL expires before it crosses the router.' },
            { id: 'd', text: 'Subnet B devices have to send Who-Is first.' }
        ],
        explain: 'BACnet leans on UDP broadcasts (Who-Is, I-Am, time-sync), and routers don\'t forward UDP broadcasts — that\'s normal IP behavior, not a fault. The fix is a BBMD on each subnet, carrying broadcasts across the L3 boundary as unicast Forwarded-NPDUs and re-broadcasting them on the far side.',
        learnMore: { href: '/education/bacnet-networking.html#bbmd', label: 'BACnet Networking — BBMDs' },
        tags: ['bacnet', 'bbmd', 'broadcast']
    },
    {
        type: 'gotcha',
        id: 'asymmetric-bdt',
        prompt: 'Discovery from subnet A finds subnet B\'s devices, but B can\'t find A\'s — no errors anywhere. The two BBMDs\' Broadcast Distribution Tables look like this. What\'s wrong?',
        snippet: '<pre class="quiz-snippet">BDT of BBMD A (192.168.1.10):  [ 10.0.5.10 : 47808 ]\nBDT of BBMD B (10.0.5.10):     [ (empty) ]</pre>',
        choices: [
            { id: 'a', text: 'BBMD B is on the wrong UDP port.' },
            { id: 'b', text: 'The BDTs are asymmetric — B\'s BDT must list A, or B\'s forwards never reach A.', correct: true },
            { id: 'c', text: 'A network-number collision between the two subnets.' },
            { id: 'd', text: 'Nothing — one BDT entry is enough for both directions.' }
        ],
        explain: 'BDTs have to be symmetric: every BBMD\'s BDT needs every other BBMD. A\'s BDT lists B, so A\'s broadcasts reach B — but B\'s BDT is empty, so nothing B sees (including the I-Am replies that answer A\'s Who-Is) ever gets forwarded back. The reverse "silently fails" with no error to grep for. The asymmetric-BDT trap is one of the most common BBMD misconfigurations in the field.',
        learnMore: { href: '/education/bacnet-networking.html#bbmd', label: 'BACnet Networking — BBMDs' },
        tags: ['bacnet', 'bbmd', 'troubleshooting']
    },
    {
        type: 'tf',
        id: 'two-bbmds-one-subnet',
        prompt: 'Adding a second BBMD to a subnet that already has one gives you useful redundancy.',
        answer: false,
        explain: 'One BBMD per subnet — no more. Two BBMDs on the same subnet create a broadcast loop: every Forwarded-NPDU arriving from a peer gets re-broadcast by both, each of which the other captures and re-forwards. It\'s a quiet, persistent storm that scales with the number of peers, usually only caught once a Wireshark capture shows the duplicate frames.',
        learnMore: { href: '/education/bacnet-networking.html#bbmd', label: 'BACnet Networking — BBMDs' },
        tags: ['bacnet', 'bbmd']
    },
    {
        type: 'mcq',
        id: 'forwarded-npdu-meaning',
        prompt: 'In a Wireshark capture you see a BVLL function byte of <code>0x04</code> (Forwarded-NPDU). What does its presence tell you?',
        choices: [
            { id: 'a', text: 'A device is sending a malformed packet.' },
            { id: 'b', text: 'A BBMD captured a local broadcast and unicast it across to a peer BBMD.', correct: true },
            { id: 'c', text: 'A normal local Who-Is on this segment.' },
            { id: 'd', text: 'A foreign device is registering.' }
        ],
        explain: 'Healthy local traffic is mostly Original-Unicast-NPDU (<code>0x0A</code>) and Original-Broadcast-NPDU (<code>0x0B</code>). A Forwarded-NPDU (<code>0x04</code>) is the giveaway that a BBMD is doing its job — it captured a broadcast on one subnet and unicast it across the router, carrying the originating IP and port in the BVLL so the source survives. Byte 1 of any BACnet/IP BVLL header is always <code>0x81</code>.',
        learnMore: { href: '/education/bacnet-networking.html#bvll-npdu-apdu', label: 'BACnet Networking — The BACnet/IP frame' },
        tags: ['bacnet', 'bvll', 'capture']
    },

    // ── Foreign Device Registration ───────────────────────
    {
        type: 'mcq',
        id: 'fdr-ttl-expired',
        prompt: 'A VPN-connected workstation could discover devices right after connecting, then quietly stopped a few minutes later — no error message. Most likely cause?',
        choices: [
            { id: 'a', text: 'The workstation\'s IP changed.' },
            { id: 'b', text: 'Its Foreign Device Registration TTL expired and wasn\'t renewed, so the BBMD dropped its FDT entry.', correct: true },
            { id: 'c', text: 'A second BBMD came online.' },
            { id: 'd', text: 'The devices went offline simultaneously.' }
        ],
        explain: 'A device with no local BBMD joins via Foreign Device Registration: it sends <code>Register-Foreign-Device</code> with a Time-to-Live, and the BBMD forwards broadcasts to it until the TTL lapses. If the client doesn\'t re-register before then, the BBMD silently drops the FDT entry and broadcasts stop — no error, no notification. "Worked right after connecting, then stopped" is the signature. Most engineering tools auto-renew; ad-hoc scripts often don\'t.',
        learnMore: { href: '/education/bacnet-networking.html#fdr', label: 'BACnet Networking — Foreign Device Registration' },
        tags: ['bacnet', 'fdr', 'troubleshooting']
    },

    // ── Reading the hex blob ──────────────────────────────
    {
        type: 'gotcha',
        id: 'hex-blob-decode',
        prompt: 'An EBO discovery dialog shows a device\'s BACnet/IP address as this hex string. What is it?',
        snippet: '<pre class="quiz-snippet">C0A8010A</pre>',
        choices: [
            { id: 'a', text: '192.168.1.10 at the default port (8 hex chars = IP only)', correct: true },
            { id: 'b', text: '192.168.1.10 on port 47809' },
            { id: 'c', text: '10.1.168.192 at the default port' },
            { id: 'd', text: 'Network number 49320' }
        ],
        explain: 'Eight hex characters = four bytes = the IPv4 address alone, with the default port assumed. Byte by byte: <code>C0</code>=192, <code>A8</code>=168, <code>01</code>=1, <code>0A</code>=10 → <strong>192.168.1.10</strong>, port 47808 (<code>0xBAC0</code>). A 12-character string would append the port; one ending in <code>BAC1</code> would mean a non-default port (47809). The <a href="/tools/bacnet-ip-converter.html">BACnet/IP Hex Converter</a> does this both ways.',
        learnMore: { href: '/education/bacnet-networking.html#hex-blob', label: 'BACnet Networking — Reading the hex blob' },
        tags: ['bacnet', 'bacnet-ip', 'hex']
    }
];
