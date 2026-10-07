// Question bank for the Building Pressure quiz, exposed to Nunjucks as
// `quizzes['building-pressure']`. Lives in _data/ so two consumers read
// one source: the page's inline JS (mounts the engine in the browser)
// and the FAQPage JSON-LD emitter in head.njk (indexable Q&A for
// search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_building-pressure_* localStorage keys. Pairs with the
// Building Pressure lesson; learnMore hrefs deep-link its <h2>
// anchors. Sequential order is the lesson walk: air ledger → relief
// lineup → power exhaust → dampers and pressure → measuring it.
//
// Quiz prose is painted post-load (the units walker doesn't reach it),
// so measurements carry static metric parentheticals per the
// metric-rounding policy — results close on the displayed operands.
//
// The bank is deliberately larger than the page's defaultCount (10):
// the engine samples an overflowing bank, so each run draws a
// different subset (buildQueue() in quiz-engine.js). Coverage tracks
// the lesson's sections — the ledger and the positive setpoint, the
// relief lineup down to return-fan tracking (why the offset is held
// in flow, and what the offset is made of), power exhaust and its
// enable, the two ways the dampers break the ledger plus the VAV
// wrinkle, and the measuring section: probe placement, a windward
// outdoor reference, and building static versus duct static. The
// duct-static question tests the "Not the same pressure" callout,
// which carries no id of its own, so it deep-links #measuring-it, the
// section that hosts it.

module.exports = [
    // ── The air ledger ─────────────────────────────────────
    {
        type: 'mcq',
        id: 'bp-pressure-residual',
        prompt: 'What actually sets a building\'s static pressure?',
        choices: [
            { id: 'a', text: 'The supply fan\'s speed — faster fan, more positive building.' },
            { id: 'b', text: 'The residual of the air ledger: whatever imbalance is left between the air brought in and the air taken out, pushed through the envelope\'s leaks.', correct: true },
            { id: 'c', text: 'The duct static pressure, transmitted through the diffusers into the space.' },
            { id: 'd', text: 'The outdoor barometric pressure on the weather side of the walls.' }
        ],
        explain: 'Building pressure is bookkeeping: outside air in (the deposit), exhaust plus relief plus exfiltration out (the withdrawals), and pressure is the tiny residual it takes to force the leftover air through the envelope\'s cracks. Supply and return never appear on the ledger — they circulate inside the envelope without crossing it — so a bigger supply fan doesn\'t pressurize the building directly; it only moves the ledger by dragging more outside air in through whatever opening the dampers allow.',
        learnMore: { href: '/education/building-pressure.html#air-ledger', label: 'Building Pressure — The Air Ledger' },
        tags: ['forced-air', 'building-pressure']
    },
    {
        type: 'mcq',
        id: 'bp-why-positive',
        prompt: 'Building-pressure setpoints sit slightly positive — around +0.02 to +0.05 in. w.c. (+5 to +12 Pa) — rather than at zero. Why?',
        choices: [
            { id: 'a', text: 'Positive pressure helps the supply fan move air with less effort.' },
            { id: 'b', text: 'So the envelope leakage always flows outward — conditioned air seeping out instead of unfiltered, unconditioned, humid air seeping in.', correct: true },
            { id: 'c', text: 'Codes require positive pressure in all commercial buildings.' },
            { id: 'd', text: 'To keep exterior doors firmly closed against wind.' }
        ],
        explain: 'A neutral building has no margin: any gust, stack effect, or exhaust fan tips the leakage inward, dragging in dust, pollen, and — worst in humid weather — moisture that condenses inside wall cavities. Held slightly positive, every crack leaks conditioned air outward instead. The number is deliberately small; much past +0.05 in. w.c. (+12 Pa) and the doors start fighting their closers.',
        learnMore: { href: '/education/building-pressure.html#air-ledger', label: 'Building Pressure — The Air Ledger' },
        tags: ['forced-air', 'building-pressure']
    },
    {
        type: 'numeric',
        id: 'bp-minimum-oa-sizing',
        prompt: 'A large AHU\'s floors are served by dedicated exhaust fans — gang restrooms plus a janitor closet — pulling a total of 2,200 CFM (3,740 m³/h) that never returns to the unit. The designer wants an 800 CFM (1,360 m³/h) surplus to hold the building positive. What is the smallest outside-air flow the minimum position must deliver? Enter the answer in CFM.',
        answer: 3000,
        tolerance: 100,
        unit: 'CFM',
        explain: 'The ledger, run in the design direction: minimum outside air must cover everything the exhaust fans steal from the unit\'s territory plus the pressurization surplus — 2,200 + 800 = 3,000 CFM (3,740 + 1,360 = 5,100 m³/h). Size the minimum below that and the building opens every morning already negative, with the dampers sitting innocently at their commanded position. The return duct never brings back everything the supply duct delivered.',
        learnMore: { href: '/education/building-pressure.html#air-ledger', label: 'Building Pressure — The Air Ledger' },
        tags: ['forced-air', 'building-pressure', 'ventilation']
    },

    // ── The relief lineup ──────────────────────────────────
    {
        type: 'tf',
        id: 'bp-barometric-negative',
        prompt: 'A barometric relief damper can pull an over-negative building back toward neutral.',
        answer: false,
        explain: 'False — barometric relief is strictly a one-way valve. Its weighted blades are opened by inside pressure winning against gravity; a negative building pulls them tighter shut. It can bleed off a positive building (slowly, riding a standing pressure error), but against a negative one it does exactly nothing. A negative building needs more air in — a higher OA minimum or makeup air — and no relief device of any kind can supply that.',
        learnMore: { href: '/education/building-pressure.html#relief-lineup', label: 'Building Pressure — The Relief Lineup' },
        tags: ['forced-air', 'building-pressure', 'relief']
    },
    {
        type: 'mcq',
        id: 'bp-tracking-in-flow',
        prompt: 'A built-up unit\'s return fan is set to <em>track</em> the supply fan at an offset. Why should that offset be held in measured flow rather than as a fixed speed difference?',
        choices: [
            { id: 'a', text: 'A fixed speed offset holds no particular CFM gap — the two fans ride different curves against resistances that drift independently.', correct: true },
            { id: 'b', text: 'Drive speed feedback is too coarse to hold an offset that small — a few percent of speed disappears into the drive\'s own rounding and motor slip.' },
            { id: 'c', text: 'A speed offset only works on constant-volume units; once the supply fan rides a VFD, the return fan has to match the supply fan\'s speed exactly.' },
            { id: 'd', text: 'Flow is what the BMS trends and alarms on, so holding the offset in flow keeps the commissioning report and the sequence of operations in agreement.' }
        ],
        explain: 'The ledger is written in CFM, not RPM. The supply and return fans sit on different fan curves, pushing against resistances — filters loading, dampers moving — that change independently, so a fixed speed offset holds no particular flow difference at all; speed-offset tracking is the classic way this scheme gets botched. Measure both flows and hold the difference, and that difference <em>is</em> the ledger\'s balance, continuously, with no stages and no waiting for a pressure error to develop.',
        learnMore: { href: '/education/building-pressure.html#relief-lineup', label: 'Building Pressure — The Relief Lineup' },
        tags: ['forced-air', 'building-pressure', 'relief']
    },
    {
        type: 'numeric',
        id: 'bp-tracking-offset-sizing',
        prompt: 'A return fan tracks its supply fan in measured flow. The floors the unit serves lose 1,500 CFM (2,550 m³/h) to restroom and janitor-closet exhaust that never returns to the unit, and the design wants a 500 CFM (850 m³/h) surplus to hold the building positive. How far below the supply flow should the return fan be commissioned to run? Enter the answer in CFM.',
        answer: 2000,
        tolerance: 50,
        unit: 'CFM',
        explain: 'The tracking offset is not a fudge factor — it is the ledger again: the exhaust the dedicated fans steal from the unit\'s territory plus the surplus that keeps the building positive, 1,500 + 500 = 2,000 CFM (2,550 + 850 = 3,400 m³/h). Commission it lazily and the fan balances a ledger nobody wrote down; and a fixed offset stays fixed when the ledger moves, so an exhaust load added later (a kitchen hood switching on) leaves the old number short.',
        learnMore: { href: '/education/building-pressure.html#relief-lineup', label: 'Building Pressure — The Relief Lineup' },
        tags: ['forced-air', 'building-pressure', 'relief']
    },

    // ── Power exhaust ──────────────────────────────────────
    {
        type: 'mcq',
        id: 'bp-pe-vs-return-fan',
        prompt: 'A power-exhaust fan and a return fan can look alike on a drawing — a fan near the return side of the unit. What actually separates them?',
        choices: [
            { id: 'a', text: 'Power exhaust is always larger, since it must move the whole supply airflow.' },
            { id: 'b', text: 'A return fan lives in the airstream and runs whenever the unit runs; power exhaust lives in the relief opening and only has a job when there\'s surplus air to throw away.', correct: true },
            { id: 'c', text: 'Nothing — they\'re two names for the same fan.' },
            { id: 'd', text: 'A return fan exhausts air; power exhaust recirculates it.' }
        ],
        explain: 'Opposite rules for neighbors. Every cubic foot returning to the mixing box passes through a return fan, so it\'s interlocked to the unit — on with the supply fan, always. Power exhaust sits in the side door off the return path, and at minimum outside air there is almost no surplus to relieve: run it there and it isn\'t relieving the building, it\'s evacuating it. Confusing the two is how a correct-looking program drags a building negative all winter.',
        learnMore: { href: '/education/building-pressure.html#power-exhaust', label: 'Building Pressure — Power Exhaust' },
        tags: ['forced-air', 'building-pressure', 'power-exhaust']
    },
    {
        type: 'mcq',
        id: 'bp-pe-signal',
        prompt: 'On the classic staged scheme, what tells a power-exhaust fan to start?',
        choices: [
            { id: 'a', text: 'The supply-fan status point — exhaust runs whenever the unit runs.' },
            { id: 'b', text: 'The outside-air temperature dropping below the economizer changeover.' },
            { id: 'c', text: 'Outside-air damper position crossing a threshold — the fan infers the surplus from where the dampers are.', correct: true },
            { id: 'd', text: 'A timer, so the stages share runtime evenly.' }
        ],
        explain: 'The classic scheme is open-loop: as the economizer drives the dampers past a threshold, stage one starts; further open, stage two joins; back down the same ladder as they close. The fan never measures building pressure — it follows the dampers, which is coarse but honest. Smarter systems close the loop with a building static sensor modulating the exhaust fan on a VFD. Either way the enable answers to the dampers or the pressure they create — the supply fan\'s status is at most a run-permissive, never the trigger.',
        learnMore: { href: '/education/building-pressure.html#power-exhaust', label: 'Building Pressure — Power Exhaust' },
        tags: ['forced-air', 'building-pressure', 'power-exhaust']
    },
    {
        type: 'gotcha',
        id: 'bp-interlock-gotcha',
        prompt: 'A January morning. The front doors are heavy, and the vestibule whistles. The BMS shows the readings below. What\'s the story?',
        snippet: '<pre class="quiz-snippet">OA DAMPER CMD     20 %  — minimum\nSF-1 STATUS       ON\nEF-1 (PWR EXH)    ON\nBLDG STATIC     −0.08 in. w.c.  (−20 Pa)\nOA-T             18.0 °F  (−7.8 °C)</pre>',
        choices: [
            { id: 'a', text: 'The envelope is leaky — new weatherstripping on the entrance doors will fix it.' },
            { id: 'b', text: 'The building static sensor is misplaced and reading a door transient — the pressure is probably fine.' },
            { id: 'c', text: 'The power exhaust is running against minimum outside air — its enable is interlocked to the supply fan instead of following the damper.', correct: true },
            { id: 'd', text: 'The OA damper minimum is set slightly too low for the restroom exhaust load.' }
        ],
        explain: 'Read the witnesses. The doors and the whistle corroborate the sensor — the building really is negative, so it isn\'t (b). Weatherstripping (a) changes how loudly a negative building complains, not whether it\'s negative — leakage is where the pressure shows up, not why. And a slightly-low minimum (d) can\'t produce −0.08 in. w.c. (−20 Pa) on its own. The smoking gun is the pairing: EF-1 running while the dampers sit at 20 %. Power exhaust has no job at minimum position — there\'s no surplus to relieve — so if it\'s on whenever SF-1 is on, someone applied the return-fan rule to the wrong fan. Fix the enable: call the fan with the damper, not with the unit.',
        learnMore: { href: '/education/building-pressure.html#power-exhaust', label: 'Building Pressure — Power Exhaust' },
        tags: ['forced-air', 'building-pressure', 'power-exhaust']
    },

    // ── Dampers and pressure ───────────────────────────────
    {
        type: 'mcq',
        id: 'bp-econ-no-relief',
        prompt: 'An economizer drives to 100 % outside air on a mild morning — but the relief damper\'s actuator seized shut last month and nobody noticed. What does the building do?',
        choices: [
            { id: 'a', text: 'Nothing — the supply fan simply moves less air until things balance.' },
            { id: 'b', text: 'It goes strongly positive: the unit force-feeds its whole supply airflow in as outside air, and the building inflates until doors stand open and its own leakage carries the flow.', correct: true },
            { id: 'c', text: 'It goes negative, because the return fan is now starved.' },
            { id: 'd', text: 'The economizer automatically reverts to minimum position.' }
        ],
        explain: 'At 100 % outside air, everything the supply fan moves is a deposit — and with the relief path seized, the ledger has no working withdrawal except the envelope itself. Pressure climbs until the leakage (and the standing-open doors, which are just very large leaks) carries the whole surplus. This is the promise the Economizers lesson filed: the relief damper opens in step with the OA damper because every extra cubic foot admitted has to leave. Nothing reverts automatically — no controller is watching a point that would reveal the failure unless someone trends building static.',
        learnMore: { href: '/education/building-pressure.html#dampers-pressure', label: 'Building Pressure — When the Dampers Move' },
        tags: ['forced-air', 'building-pressure', 'economizer']
    },
    {
        type: 'mcq',
        id: 'bp-relief-cant-add',
        prompt: 'A kitchen hood at full draw against an AHU sitting at minimum outside air has pulled the building negative. What category of fix actually works?',
        choices: [
            { id: 'a', text: 'Stage on the power exhaust to rebalance the ledger.' },
            { id: 'b', text: 'Open the relief damper wider so the pressure can equalize.' },
            { id: 'c', text: 'More air in — raise the OA minimum during hood operation, or provide dedicated makeup air.', correct: true },
            { id: 'd', text: 'Stronger door closers on the exterior doors.' }
        ],
        explain: 'Note the asymmetry the lesson keeps returning to: relief devices can only take air out. A negative building is a ledger short on deposits, and every relief-side move fails its own way: more power exhaust makes it worse, barometric blades just seal harder, and a relief damper driven open becomes a backwards infiltration path — unfiltered outside air sneaking in through a bigger hole, which is not a fix. The fix is on the intake side: interlock a higher OA minimum with the hood, or give the hood its own makeup-air unit. Door hardware treats the symptom while the building keeps sucking its makeup air backwards through every crack in the envelope.',
        learnMore: { href: '/education/building-pressure.html#dampers-pressure', label: 'Building Pressure — When the Dampers Move' },
        tags: ['forced-air', 'building-pressure', 'ventilation']
    },
    {
        type: 'tf',
        id: 'bp-vav-deposit-moves',
        prompt: 'On a VAV air handler with the outside-air damper parked at its minimum position, the outside air deposited on the building\'s ledger stays the same as the supply fan slows down.',
        answer: false,
        explain: 'False. On a VAV system the supply fan itself speeds up and slows down, so the ledger\'s deposit column moves with fan speed as well as with damper position — a damper parked at minimum is passing a share of a flow that is shrinking. The dedicated exhaust fans keep withdrawing exactly what they always did, so a building balanced at full flow can drift toward negative as the fan turns down. How VAV minimums handle that is covered in the VAV Systems lesson.',
        learnMore: { href: '/education/building-pressure.html#dampers-pressure', label: 'Building Pressure — When the Dampers Move' },
        tags: ['forced-air', 'building-pressure', 'vav']
    },

    // ── Measuring it ───────────────────────────────────────
    {
        type: 'mcq',
        id: 'bp-probe-placement',
        prompt: 'Where does the indoor probe of a building-pressure sensor belong?',
        choices: [
            { id: 'a', text: 'In the entrance vestibule — that\'s where the pressure symptoms show up.' },
            { id: 'b', text: 'In a large, representative space mid-building — a corridor or open office — away from exterior doors, elevator lobbies, and anything that swings or gusts.', correct: true },
            { id: 'c', text: 'In the supply duct, downstream of the fan.' },
            { id: 'd', text: 'On the roof, next to the outdoor reference tip.' }
        ],
        explain: 'The signal is a whisper — a setpoint of +0.03 in. w.c. (+7.5 Pa) is fifty times smaller than a supply duct\'s static — so placement is most of the craft. Every door transit is a pressure spike the loop must not chase, which rules out the vestibule even though that\'s where the symptoms live; you want the average building, not its noisiest corner. The supply duct is a different pressure entirely (that\'s duct static), and the roof is the outdoor reference\'s side of the measurement, not the indoor\'s.',
        learnMore: { href: '/education/building-pressure.html#measuring-it', label: 'Building Pressure — Measuring a Whisper' },
        tags: ['forced-air', 'building-pressure', 'sensors']
    },
    {
        type: 'gotcha',
        id: 'bp-windward-reference',
        prompt: 'A gusty afternoon, wind out of the west. A building-static loop modulates the exhaust fan\'s VFD, and the outdoor reference is a short open tube through the west wall. The tech on site wants to retune the loop: <em>it can\'t keep up.</em> The trend is below. What\'s the story?',
        snippet: '<pre class="quiz-snippet">BLDG STATIC   +0.06 → −0.03 → +0.05 in. w.c.\n              (+15 → −7.5 → +12.5 Pa)  every few seconds\nEF-2 VFD       38 % → 92 % → 41 %\nOA DAMPER CMD  35 %\nSF-1 STATUS    ON</pre>',
        choices: [
            { id: 'a', text: 'The loop is tuned too slowly — raise the gain so the exhaust fan catches each swing before it grows.' },
            { id: 'b', text: 'The envelope is too leaky to hold a setpoint — those swings are the building\'s real pressure.' },
            { id: 'c', text: 'The exhaust fan\'s drive is hunting on its own, and the pressure reading is just following the fan.' },
            { id: 'd', text: 'The bare tube on the windward wall reads gusts, not pressure — the loop is chasing weather.', correct: true }
        ],
        explain: 'The tell is how crisply it moves. Real building pressure is a whisper that shifts slowly with the ledger, and a breath of wind on the wrong wall face is bigger than the whole setpoint — so a bare tube on the windward wall reads wind, and the loop dutifully chases it with the fan. More gain (a) chases it harder. The fix starts at the reference: a shielded static-averaging tip, ideally sampling more than one face, then heavy filtering, a wide deadband (a band around setpoint where the loop holds still), slow loop action, and patient alarms. A pressure point that swings confidently is usually reporting on its own placement, not the building.',
        learnMore: { href: '/education/building-pressure.html#measuring-it', label: 'Building Pressure — Measuring a Whisper' },
        tags: ['forced-air', 'building-pressure', 'sensors']
    },
    {
        type: 'mcq',
        id: 'bp-duct-static-not-building',
        prompt: 'The supply fan holds its duct static rock-steady at a 1.5 in. w.c. (375 Pa) setpoint, while the front doors stand open against their closers. What does the steady duct static tell you about the building pressure?',
        choices: [
            { id: 'a', text: 'Nothing — duct static is the fan\'s loop inside the ductwork; building static is space-to-outdoors.', correct: true },
            { id: 'b', text: 'That the building is fine — a fan holding setpoint is delivering design air, so the ledger balances.' },
            { id: 'c', text: 'That the building is positive by a similar amount, since the diffusers bleed duct pressure into the space.' },
            { id: 'd', text: 'That the building sits near a fiftieth of it, about +0.03 in. w.c. (+7.5 Pa) — the usual ratio.' }
        ],
        explain: 'Two different pressures: duct static is the supply fan\'s control variable, measured inside the ductwork in whole inches; building static is the envelope\'s residual, measured space-to-outdoors in hundredths. Different magnitude, different sensor, different loop, different failure symptoms — a healthy duct static says nothing about the ledger. The doors are the witness here, and they say positive: look at the relief path and the dampers, not the fan\'s loop. (The lesson\'s fifty-to-one comparison shows how small the building signal is; it is not a relationship between the two.)',
        learnMore: { href: '/education/building-pressure.html#measuring-it', label: 'Building Pressure — Measuring a Whisper' },
        tags: ['forced-air', 'building-pressure', 'sensors', 'duct-static']
    },
];
