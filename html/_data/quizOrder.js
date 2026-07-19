// Canonical practice-curriculum order for the CONTENT quizzes — the
// single source the results-card "Next quiz →" links are built from
// (owner decision 2026-06-10, audit-2026-06 #21/#22). Mirrors the
// Education landing's card order (lessons with no quiz yet don't
// appear). The practice landing's Content Quizzes grid is hand-ordered
// to MATCH this list — re-order both together. Field drills are not
// a curriculum and carry no next-link. Labels are the topic names as
// the landing cards show them.
module.exports = [
    { slug: 'pid-basics',               label: 'PID Basics' },
    // ── Signals & Sensing ─ controller-wiring leads the chapter; insert
    // new quiz slugs below it, in curriculum order (mirror the education
    // sequence) ──
    { slug: 'controller-wiring',        label: 'Controller Wiring' },
    { slug: 'analog-sensing',           label: 'Analog Sensing' },
    { slug: 'hydronic-loops',           label: 'Hydronic Loops' },
    { slug: 'load-piping',              label: 'Load Piping' },
    { slug: 'vfds',                     label: 'VFDs' },
    { slug: 'pump-control',             label: 'Pump Control' },
    { slug: 'equipment-staging',        label: 'Equipment Staging' },
    { slug: 'balancing',                label: 'Hydronic Balancing' },
    { slug: 'refrigerant-cycle-basics', label: 'Refrigerant Cycle Basics' },
    { slug: 'superheat-subcooling',     label: 'Superheat & Subcooling' },
    { slug: 'metering-devices-txv-eev', label: 'Metering Devices — TXV & EEV' },
    { slug: 'psychrometrics-basics',    label: 'Psychrometrics Basics' },
    { slug: 'air-handlers',             label: 'Air Handlers' },
    { slug: 'economizers',              label: 'Economizers' },
    { slug: 'building-pressure',        label: 'Building Pressure' },
    { slug: 'air-unit-identification',  label: 'Unit Identification' },
    { slug: 'vav-systems',              label: 'VAV Systems' },
    { slug: 'duct-static-control',      label: 'Duct Static Control' },
    { slug: 'function-blocks',          label: 'Function Blocks' },
    // ── Programming ─ function-blocks leads the chapter; insert new quiz
    // slugs here, in curriculum order (mirror the education sequence) ──
    // Final position for setpoint-math-reset: after the in-flight
    // timers-and-delays quiz, before reading-a-wiresheet (sibling lanes).
    { slug: 'setpoint-math-reset',      label: 'Setpoint Math & Reset' },
    { slug: 'modbus-basics',            label: 'Modbus Basics' },
    { slug: 'modbus-decoding',          label: 'Modbus Decoding' },
    { slug: 'bacnet-basics',            label: 'BACnet Basics' },
    { slug: 'bacnet-networking',        label: 'BACnet Networking' },
    { slug: 'bacnet-mstp',              label: 'BACnet MS/TP' },
];
