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
// Coverage spans the lesson's sections — Three addresses; the BACnet/IP
// frame (BVLL + NPDU + APDU); BBMDs; Foreign Device Registration;
// Reading the hex blob — with scenario questions also drawing on its
// "When discovery silently fails" checklist (that subhead carries no
// id, so those questions deep-link the section that teaches the
// underlying mechanism instead).

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
    {
        type: 'mcq',
        id: 'network-number-collision',
        prompt: 'Two buildings\' BAS systems, built years apart, get joined by an IP link. Soon after, the front end starts losing polls to both buildings\' MS/TP trunks unpredictably — and both trunks turn out to be configured as network <code>2001</code>. What rule did the integration break?',
        choices: [
            { id: 'a', text: 'Device instance numbers must not repeat between the buildings.' },
            { id: 'b', text: 'MS/TP trunks must use network numbers of 127 or below.' },
            { id: 'c', text: 'Trunks joined by IP need a BBMD before their traffic can mix.' },
            { id: 'd', text: 'Every network number must be unique across the joined internetwork.', correct: true }
        ],
        explain: 'A network number is what routing runs on: a message bound for network <code>2001</code> goes wherever the routers believe 2001 lives, and with two segments claiming the same name the choice is ambiguous — messages get thrown away or sent the wrong way, which reads on a graphic as points that come and go. Renumber one trunk. The device-instance rule is real, but nothing here points at it — instances are application-layer names and don\'t steer routing. There\'s no 127 ceiling either: that one-byte limit is the MS/TP <em>station address</em>\'s (masters run 0–127), not the network number\'s, which is a 16-bit value (1–65534) on any medium. And a BBMD manages BACnet/IP broadcast distribution — it plays no part in delivering an addressed message to a trunk.',
        learnMore: { href: '/education/bacnet-networking.html#three-addresses', label: 'BACnet Networking — Three addresses, one device' },
        tags: ['bacnet', 'addressing', 'troubleshooting']
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
    {
        type: 'tf',
        id: 'bdt-vs-fdt',
        prompt: 'A BBMD\'s Broadcast Distribution Table builds itself automatically as devices come online and register.',
        answer: false,
        explain: 'The BDT is static configuration — a hand-entered list of the peer BBMDs, one per participating subnet, that a person builds and maintains. Registration fills a different table: foreign devices land in the <strong>FDT</strong> (Foreign Device Table), which is the dynamic one. Conflating the two has a real field cost — expecting the BDT to populate itself is how a freshly stood-up BBMD ends up with an empty BDT, and absent from every peer\'s, so its subnet\'s broadcasts go nowhere in either direction.',
        learnMore: { href: '/education/bacnet-networking.html#bbmd', label: 'BACnet Networking — BBMDs' },
        tags: ['bacnet', 'bbmd']
    },
    {
        type: 'gotcha',
        id: 'tcp-firewall-rule',
        prompt: 'Cross-subnet discovery between two BAS subnets finds nothing. The network team points to the firewall rule below — added just for BACnet — and notes its hit counter has never left zero. What\'s wrong?',
        snippet: '<pre class="quiz-snippet">permit tcp any any eq 47808</pre>',
        choices: [
            { id: 'a', text: 'The port must be written in hex — <code>0xBAC0</code> — for the rule to match.' },
            { id: 'b', text: 'Replies need a second rule opening port 47809.' },
            { id: 'c', text: 'The rule covers one direction only; the return path needs a mirror rule.' },
            { id: 'd', text: 'BACnet/IP is UDP — a TCP rule can never match its traffic.', correct: true }
        ],
        explain: 'Everything BACnet/IP sends — Who-Is and I-Am broadcasts, <code>ReadProperty</code> unicasts, the Forwarded-NPDUs BBMDs exchange across exactly this kind of boundary — rides <strong>UDP</strong> port 47808. A TCP rule matches none of it, which is what the zero hit counter is saying: the BACnet datagrams arrive as UDP and fall through to the default deny. The counter also acquits the mirror-rule guess — a rule that merely missed the return path would still count outbound matches — and replies come back on the port the request used, so there is nothing to open at 47809. Hex versus decimal is a non-issue: <code>0xBAC0</code> and 47808 are the same number written two ways. Rewrite the rule for UDP and the Forwarded-NPDUs start arriving.',
        learnMore: { href: '/education/bacnet-networking.html#bvll-npdu-apdu', label: 'BACnet Networking — The BACnet/IP frame' },
        tags: ['bacnet', 'bacnet-ip', 'troubleshooting']
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
    {
        type: 'mcq',
        id: 'fdr-all-unicast',
        prompt: 'A remote monitoring server on a subnet with no BBMD registers as a foreign device with a BBMD at the main plant, several router hops away. Broadcasts can\'t cross those routers — so how does the plant\'s broadcast traffic reach the server at all?',
        choices: [
            { id: 'a', text: 'It never crosses the routers as a broadcast — every router-crossing leg is a unicast, which routes normally.', correct: true },
            { id: 'b', text: 'The routers between them carry a UDP broadcast-relay (helper) entry aimed at the server.' },
            { id: 'c', text: 'The BBMD adds the server\'s subnet to its Broadcast Distribution Table.' },
            { id: 'd', text: 'Registration temporarily promotes the server to a BBMD for its own subnet.' }
        ],
        explain: 'Foreign-device machinery is built so nothing ever needs to cross a router as a broadcast. <code>Register-Foreign-Device</code> is a unicast to the BBMD; once the FDT entry exists, each broadcast the BBMD would re-broadcast locally is sent to the server as a <em>unicast copy</em>, and a broadcast the server itself originates travels to the BBMD the same way — as a unicast (<code>Distribute-Broadcast-To-Network</code>) the BBMD re-broadcasts at the plant. Plain routed IP delivery does all the work — no router configuration, no helper entries. The BDT guess confuses the tables: the BDT lists peer <em>BBMDs</em>, and the server isn\'t one — registration makes it a table <em>entry</em>, not a BBMD; it forwards nothing for anyone. That\'s the design point of FDR: it turns a broadcast problem into ordinary unicast traffic.',
        learnMore: { href: '/education/bacnet-networking.html#fdr', label: 'BACnet Networking — Foreign Device Registration' },
        tags: ['bacnet', 'fdr', 'broadcast']
    },

    // ── Reading the hex blob ──────────────────────────────
    {
        type: 'mcq',
        id: 'second-network-next-port',
        prompt: 'An integrator needs a second, fully separate BACnet/IP network on a subnet that already carries one — same switches, same IP range. What makes the second network distinct from the first?',
        choices: [
            { id: 'a', text: 'Its own network number — that alone keeps the two apart.' },
            { id: 'b', text: 'A reserved device-instance block for its devices.' },
            { id: 'c', text: 'The next UDP port up — it runs on 47809 (<code>0xBAC1</code>) instead of 47808.', correct: true },
            { id: 'd', text: 'Nothing can — one subnet supports only one BACnet/IP network.' }
        ],
        explain: 'A BACnet/IP network is a broadcast domain <em>on a port</em>: every device bound to 47808 on that wire hears every 47808 broadcast, so as long as both groups share the port they are one network, whatever the configuration sheet says. The separation that works is the sequential-port convention from ASHRAE 135 Annex J — the second network takes <code>0xBAC1</code> (47809), the next <code>0xBAC2</code>, and devices on one port neither hear nor answer Who-Is on another. Each network still gets its own network number, but that\'s the network-layer <em>name</em>, not the separator — and a reserved device-instance block organizes names too: instances are application-layer labels, so every device on the shared port would still hear every broadcast. It\'s also why a discovered hex address can end in <code>BAC1</code> instead of <code>BAC0</code>.',
        learnMore: { href: '/education/bacnet-networking.html#hex-blob', label: 'BACnet Networking — Reading the hex blob' },
        tags: ['bacnet', 'bacnet-ip', 'addressing']
    },
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
