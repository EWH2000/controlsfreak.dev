// Question bank for the Analog Sensing quiz, exposed to Nunjucks as
// `quizzes['analog-sensing']`. See the sibling modbus-decoding.js header
// for the data-vs-template rationale.
//
// Paired 1:1 with education/analog-sensing.html (the Signals & Sensing
// chapter anchor) — every question maps to one of its three sections:
// ranges and scaling (the published-range promise, the span-mismatch
// failure mode), live zero as diagnosis at the graphic, and railed
// signals as ceilings. Deliberately angled at the READING side — what
// the workstation shows and when to disbelieve it. The wiring-side
// story (loop power, landings) lives in field-wiring-sensors.js /
// controller-wiring; the overlapping concepts here (live zero, scaling
// arithmetic) use different numbers and a diagnosis framing so the two
// banks drill different muscles.

module.exports = [
    // ── Ranges: what the nameplate promises ───────────────
    {
        type: 'mcq',
        id: 'published-range-promise',
        prompt: 'A pressure transmitter\'s nameplate reads <strong>0&ndash;250 psi / 4&ndash;20 mA</strong>. What exactly is that line promising?',
        choices: [
            { id: 'a', text: 'The sensor is accurate to within 250 psi.' },
            { id: 'b', text: 'At 0 psi it drives exactly 4 mA, at 250 psi exactly 20 mA, and it holds a straight line in between — the two endpoints of the map the software must copy.', correct: true },
            { id: 'c', text: 'It can survive pressures up to 250 psi without damage.' },
            { id: 'd', text: 'The signal will never leave the 4–20 mA band.' }
        ],
        explain: 'The published range is a <em>contract</em>: two endpoints plus linearity, nothing more. Everything the graphic ever shows for the point is read off that straight line, which is why the software\'s scale has to copy <strong>both</strong> endpoints exactly. Note that (d) is false in a useful way — the signal absolutely can leave the band, and the space outside it (under 4 mA, saturated above 20 mA) is exactly the diagnostic vocabulary the other questions in this quiz drill. Survivable overpressure (c) is a separate spec on the datasheet, not the range.',
        learnMore: { href: '/education/analog-sensing.html#ranges-scaling', label: 'Analog Sensing — ranges and scaling' },
        tags: ['analog-sensing', 'signals', 'scaling']
    },

    // ── Ranges: numeric scaling at the graphic ────────────
    {
        type: 'numeric',
        id: 'graphic-scale-16ma',
        prompt: 'A 4&ndash;20 mA transmitter is spanned 0&ndash;200 psi (0&ndash;1379 kPa). The point\'s raw signal reads <strong>16 mA</strong>. What value should the graphic show, in psi?',
        answer: 150,
        tolerance: 1,
        unit: 'psi',
        explain: '16 mA sits at <code>(16 − 4) / (20 − 4) = 12/16 = 75%</code> of the signal span, and 75% of 0–200 psi is <strong>150 psi</strong> (75% of 0–1379 kPa is 1034 kPa — the same fraction on any scale). The classic slip is dividing by 20 instead of the 16 mA span: <code>16/20 = 80%</code> → 160 psi, wrong by just enough to look right. Subtract the live-zero floor first, then divide by the span.',
        learnMore: { href: '/tools/signal-scaling.html', label: 'Signal Scaling Calculator' },
        tags: ['analog-sensing', 'signals', 'scaling']
    },

    // ── Ranges: the span-mismatch gotcha ──────────────────
    {
        type: 'gotcha',
        id: 'config-span-mismatch',
        prompt: 'A tech commissions a duct-static point. The value tracks smoothly with the fan and looks healthy — but a hand gauge at the sensor tap reads about <em>half</em> what the graphic says. Here\'s the point config. What\'s wrong?',
        snippet: '<pre class="quiz-snippet">point:   SF-1 DUCT STATIC\ninput:   UI4  (0-10 V)\nxmtr:    nameplate 0-2.5 in. w.c., output 0-10 V\nscale:   0 V   →  0.0 in. w.c.\n         10 V  →  5.0 in. w.c.\nsymptom: graphic reads ≈ 2× the hand gauge</pre>',
        choices: [
            { id: 'a', text: 'Nothing is wrong in the config — the transducer has drifted and needs recalibration.' },
            { id: 'b', text: 'The software span (0–5) doesn\'t match the transmitter\'s published range (0–2.5): the sensor means 10 V as 2.5 in. w.c., the software reads it as 5.0 — so every reading is exactly double, plausibly, forever.', correct: true },
            { id: 'c', text: 'The point should be 4–20 mA — 0–10 V can\'t carry a static-pressure signal.' },
            { id: 'd', text: 'The transducer is wired backwards, inverting the signal.' }
        ],
        explain: 'The two endpoints are the whole contract, and here the software broke it: the sensor\'s 10 V means <strong>2.5</strong>, the scale says <strong>5.0</strong>. Nothing alarms, the value moves with the process, and the loop will happily control to a number that\'s twice the truth. The field tell is the <em>ratio</em>: calibration drift is small and uneven, but a reading wrong by an exactly round factor (2×, 10×) is a span mismatch. Fix the scale to the nameplate, then re-check against the gauge.',
        learnMore: { href: '/education/analog-sensing.html#ranges-scaling', label: 'Analog Sensing — ranges and scaling' },
        tags: ['analog-sensing', 'signals', 'scaling', 'range-mismatch']
    },

    // ── Ranges: numeric range-mismatch diagnosis ──────────
    {
        type: 'numeric',
        id: 'span-mismatch-true-static',
        prompt: 'A graphic shows duct static at <strong>1.8 in. w.c.</strong> (450 Pa). You discover the software point is scaled 0&ndash;5 in. w.c., but the transducer nameplate says 0&ndash;2.5 in. w.c. (both sides are 0&ndash;10 V). What is the duct <em>really</em> at, in in. w.c.?',
        answer: 0.9,
        tolerance: 0.05,
        unit: 'in. w.c.',
        explain: 'Work back to the wire, then forward through the <em>right</em> range. The software shows 1.8 on a 0–5 scale, so the signal is <code>1.8 / 5 = 36%</code> of span → 3.6 V. The transducer drives 3.6 V when it measures 36% of <em>its</em> range: <code>0.36 × 2.5 = <strong>0.9 in. w.c.</strong></code> (225 Pa). Same wire, same volts — the graphic is reading the sensor\'s honest answer through the wrong ruler, and every value comes out exactly double.',
        learnMore: { href: '/education/analog-sensing.html#ranges-scaling', label: 'Analog Sensing — ranges and scaling' },
        tags: ['analog-sensing', 'signals', 'scaling', 'range-mismatch']
    },

    // ── Live zero: information content ────────────────────
    {
        type: 'tf',
        id: 'zero-signal-information',
        prompt: 'A 4&ndash;20 mA input reading 0 mA and a 0&ndash;10 V input reading 0 V tell you the same thing.',
        answer: false,
        explain: 'They could not be more different. On a 4–20 mA point, <strong>0 mA is below the live zero</strong> — no real measurement can produce it, so it can only mean a broken loop, lost power, or an open terminal: the value itself testifies to the fault. On a 0–10 V point, 0 V is a <em>legal value</em> — the bottom of the range — so the same reading is ambiguous between "truly at range-min" and "broken wire," and the graphic cannot tell you which. That asymmetry is the entire diagnostic payoff of the live zero.',
        learnMore: { href: '/education/analog-sensing.html#live-zero', label: 'Analog Sensing — live zero' },
        tags: ['analog-sensing', 'signals', 'live-zero']
    },

    // ── Live zero: the impossible number ──────────────────
    {
        type: 'mcq',
        id: 'impossible-negative-reading',
        prompt: 'A chilled-water pressure point on the graphic reads <strong>&minus;62.5 psi</strong>. The point is a 4&ndash;20 mA transmitter scaled 0&ndash;250 psi. What is that number telling you?',
        choices: [
            { id: 'a', text: 'The transmitter is out of calibration and needs a zero trim.' },
            { id: 'b', text: 'The input is at 0 mA — the full 4 mA below the live zero, which scales to −25% of range. The loop is broken, unpowered, or open; it isn\'t measuring anything.', correct: true },
            { id: 'c', text: 'The chilled-water loop is pulling a vacuum.' },
            { id: 'd', text: 'The software span is inverted (250–0 instead of 0–250).' }
        ],
        explain: 'Scale 0 mA through the line and you get <code>(0 − 4) / 16 = −25%</code> of span → −62.5 psi: the <strong>b</strong> in the point\'s y = mx + b, and a number no real gauge could ever read. That impossibility is the feature — a dead 4–20 loop announces itself with a value that can\'t be mistaken for data. Calibration drift (a) is small and plausible-looking, not a quarter of the range negative; a vacuum (c) doesn\'t reach −62.5 psi; an inverted span (d) would read high, not impossible-low.',
        learnMore: { href: '/education/analog-sensing.html#live-zero', label: 'Analog Sensing — live zero' },
        tags: ['analog-sensing', 'signals', 'live-zero', 'failure-modes']
    },

    // ── Live zero: clamped displays / the raw-value habit ─
    {
        type: 'mcq',
        id: 'clamped-min-check-raw',
        prompt: 'You suspect a 4&ndash;20 mA pressure loop is dead, but the graphic just shows <strong>0.0 psi</strong> — the bottom of the range — with no fault flag. This front end clamps under-range values at range-min. How do you confirm from the workstation?',
        choices: [
            { id: 'a', text: 'Trend the scaled value overnight and look for movement.' },
            { id: 'b', text: 'Open the point\'s detail and read the raw signal: the clamped display hides the negative, but a raw value near 0 mA — below the ~3.8 mA under-range threshold — can only be a fault.', correct: true },
            { id: 'c', text: 'Command the point out of service and back to force a refresh.' },
            { id: 'd', text: 'You can\'t — only a meter on the loop can tell.' }
        ],
        explain: 'Scaled values are a <em>presentation</em> — they can clamp, round, or default, and this front end clamps. The raw signal is the wire\'s own testimony: anything below ~3.8 mA sits under the live zero where no real measurement lives, so 0 mA raw settles it without leaving the chair. (A flat trend (a) is consistent with a dead loop but also with a dead-calm process; and note the same trick is weaker on a 0–10 V point, where 0 V raw is still ambiguous — the live-zero advantage restated.)',
        learnMore: { href: '/education/analog-sensing.html#live-zero', label: 'Analog Sensing — live zero' },
        tags: ['analog-sensing', 'signals', 'live-zero', 'diagnosis']
    },

    // ── Live zero: catching a dead 0-10 V sensor anyway ───
    {
        type: 'mcq',
        id: 'catch-dead-0-10v',
        prompt: 'A 0&ndash;10 V input can\'t distinguish a broken wire from a genuine zero — both read 0 V. So how do you ever catch a dead 0&ndash;10 V sensor from the graphic?',
        choices: [
            { id: 'a', text: 'You can\'t — only a meter on the wires can tell.' },
            { id: 'b', text: 'Process knowledge: when range-min is a value the real process can\'t plausibly produce — 0% RH outdoors, zero flow with the fan proven on — a flatlined range-min is a fault wearing a legal costume.', correct: true },
            { id: 'c', text: 'The controller flags any 0 V reading as a fault automatically.' },
            { id: 'd', text: 'Watch for readings that go negative, below range-min.' }
        ],
        explain: 'The signal can\'t tell you, but the physics can: outdoor air is never at 0% RH, a proven-on fan never moves zero air, an occupied space is never at 0 ppm CO2. A 0–10 V point pinned at range-min for hours is a <em>suspicion</em> the graphic can raise even though only a meter can confirm it — which is the half-truth in (a). Choice (d) is the 4–20 mA story, not the 0–10 V one: with no live zero there\'s no below-range space for a fault to land in. This ambiguity is exactly why critical points earn live-zero signals.',
        learnMore: { href: '/education/analog-sensing.html#live-zero', label: 'Analog Sensing — live zero' },
        tags: ['analog-sensing', 'signals', 'live-zero', 'diagnosis']
    },

    // ── Railed: reading the flatline ──────────────────────
    {
        type: 'mcq',
        id: 'flatline-at-range-top',
        prompt: 'A duct-static trend climbs during a fan ramp, then flatlines at exactly <strong>2.5 in. w.c.</strong> (625 Pa) — the top of the sensor\'s 0&ndash;2.5 range — and holds there, perfectly smooth, for hours. What is the trend actually telling you?',
        choices: [
            { id: 'a', text: 'The loop is holding its setpoint unusually well.' },
            { id: 'b', text: 'The static is at least 2.5 — the sensor is railed at full scale, and the real value is somewhere above it, unmeasured.', correct: true },
            { id: 'c', text: 'The sensor has failed and the value is meaningless.' },
            { id: 'd', text: 'The trend\'s sample rate is too slow to catch the variation.' }
        ],
        explain: 'A railed reading carries exactly one bit: <em>the truth is at least this much</em>. It\'s a ceiling, not a measurement. The tells are all there — a round number, sitting exactly at range max, suspiciously smooth (real processes wander; ceilings don\'t). Note (c) misses the point in a dangerous way: the sensor hasn\'t failed, it\'s answering honestly at the edge of what it can say — and whatever pushed the duct past its range is still out there, above the flatline.',
        learnMore: { href: '/education/duct-static-control.html#static-is-not-flow', label: 'Duct Static Control — the railed transducer, in the field' },
        tags: ['analog-sensing', 'signals', 'railed']
    },

    // ── Railed: picking the range ─────────────────────────
    {
        type: 'mcq',
        id: 'range-pick-mid-span',
        prompt: 'You\'re selecting a static-pressure transducer for a duct that will control to <strong>1.5 in. w.c.</strong> (375 Pa). Which range serves the graphic best?',
        choices: [
            { id: 'a', text: '0–1.5 in. w.c. — matched exactly to the setpoint.' },
            { id: 'b', text: '0–10 in. w.c. — it can never rail.' },
            { id: 'c', text: '0–2.5 in. w.c. — the operating point lives mid-span, with resolution to read it and headroom above it to see an abnormal excursion.', correct: true },
            { id: 'd', text: 'Any range works — the software scaling makes them all read correctly.' }
        ],
        explain: 'Both extremes fail, in opposite directions. Range-topped at the setpoint (a), the sensor rails during exactly the events you most need to see — every abnormal excursion vanishes over the ceiling. Oversized (b), normal operation lives in the bottom 15% of the scale, where an accuracy spec written as a percent <em>of full scale</em> becomes a big slice of the reading. Mid-span (c) buys both resolution and headroom. And (d) confuses <em>correct</em> with <em>useful</em>: scaling faithfully maps whatever the sensor can say — it can\'t add precision or extend the ceiling.',
        learnMore: { href: '/education/analog-sensing.html#railed', label: 'Analog Sensing — railed signals' },
        tags: ['analog-sensing', 'signals', 'railed', 'range-selection']
    }
];
