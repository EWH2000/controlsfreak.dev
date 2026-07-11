// Question bank for the Duct Static Control quiz, exposed to Nunjucks
// as `quizzes['duct-static-control']`. Lives in _data/ so two
// consumers read one source: the page's inline JS (mounts the engine
// in the browser) and the FAQPage JSON-LD emitter in head.njk.
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_duct-static-control_* localStorage keys. Pairs with the
// Duct Static Control lesson; learnMore hrefs deep-link its <h2>
// anchors. Sequential order is the lesson walk: the signal → the
// loop → reset → static-is-not-flow → safeties → the chapter close.
//
// Quiz prose is painted post-load (the units walker doesn't reach
// it), so unit values carry static metric parentheticals per the
// metric-rounding policy — except the transducer's volts-to-inches
// frame and fan Hz, which stay in their IP field frames (the same
// US-native posture the airflow tool takes with K and VP).

module.exports = [
    // ── The signal ─────────────────────────────────────────
    {
        type: 'mcq',
        id: 'ds-why-static',
        prompt: 'An air handler serves thirty pressure-independent VAV boxes. Why does its supply fan hold duct static pressure instead of total airflow?',
        choices: [
            { id: 'a', text: 'Because the boxes own the flow — the fan\'s job is to keep enough pressure at the trunk that every box can take what it needs, and one static reading summarizes all thirty demands.', correct: true },
            { id: 'b', text: 'Because airflow can\'t be measured in a duct — only pressure can.' },
            { id: 'c', text: 'Because holding static protects the ductwork from over-pressure.' },
            { id: 'd', text: 'Because total flow changes too slowly to control a fan with.' }
        ],
        explain: 'The zones decide how much air moves — that was the whole point of VAV — so total flow was never the fan\'s promise to keep. Its promise is pressure: enough static that any box can open into it. The duct does the arithmetic for free (thirty throttles, one trunk, one pressure), which is why one sensor beats thirty totalized flow rings. Airflow is perfectly measurable — flow rings do it all day — it\'s just the wrong setpoint. And duct protection isn\'t the loop\'s job; that\'s the high-static cutout\'s.',
        learnMore: { href: '/education/duct-static-control.html#the-signal', label: 'Duct Static Control — The Duct Answers for the Boxes' },
        tags: ['forced-air', 'duct-static']
    },
    {
        type: 'tf',
        id: 'ds-sign',
        prompt: 'As zones satisfy and their boxes throttle toward minimum, duct static falls — so the supply fan speeds up to compensate.',
        answer: false,
        explain: 'False, and the sign is the whole lesson: boxes <em>closing</em> means the fan is pushing the same effort into less opening, so static <em>rises</em> — and the loop slows the fan. Boxes open, static sags, fan speeds up. It\'s the same sign as the hydronic side: valves close, DP rises, the pump slows. Get the sign backwards and every symptom on a trend reads inside out.',
        learnMore: { href: '/education/duct-static-control.html#the-signal', label: 'Duct Static Control — The Duct Answers for the Boxes' },
        tags: ['forced-air', 'duct-static']
    },

    // ── The loop ───────────────────────────────────────────
    {
        type: 'mcq',
        id: 'ds-sensor-placement',
        prompt: 'Where does the duct-static sensor typically live on a VAV supply trunk, and why there?',
        choices: [
            { id: 'a', text: 'About two-thirds of the way down the trunk — far enough out to resemble what the boxes actually feel, close enough in that one sensor still speaks for several branches.', correct: true },
            { id: 'b', text: 'At the fan discharge, where the pressure is strongest and easiest to measure.' },
            { id: 'c', text: 'Inside the air handler, upstream of the fan.' },
            { id: 'd', text: 'At the inlet of every box, averaged by the BMS.' }
        ],
        explain: 'It\'s the air-side cousin of pump control\'s remote DP sensor. At the fan discharge the loop holds pressure where nobody uses it — on a design day most of that number is spent on duct friction before the far boxes see it, so you\'re forced to hold a high setpoint all day to cover a worst case the sensor can\'t see. Two-thirds out is the field compromise: hold a modest number where it matters instead of a big number where it doesn\'t. Upstream of the fan is negative pressure — a different world entirely — and per-box averaging is thirty sensors doing badly what one does well.',
        learnMore: { href: '/education/duct-static-control.html#the-loop', label: 'Duct Static Control — One Sensor, Two-Thirds Down the Duct' },
        tags: ['forced-air', 'duct-static']
    },
    {
        type: 'numeric',
        id: 'ds-scaling',
        prompt: 'A duct-static transducer spans 0–2.5 in. w.c. over a 0–10 V output. The BMS reads 6.0 V. What static is it reporting? Enter the answer in in. w.c.',
        answer: 1.5,
        tolerance: 0.05,
        unit: 'in. w.c.',
        explain: 'Straight-line scaling: 2.5 × (6.0 ÷ 10) = 1.5 in. w.c. — the setpoint itself, as it happens. The signal-scaling tool runs this both directions, and it\'s worth being fast at, because the arithmetic has a sharp edge: 10.0 V on this sensor does not mean "2.5 in. w.c." — it means "<em>at least</em> 2.5." A signal sitting at full scale is railed, and a railed reading is a ceiling, not a measurement.',
        learnMore: { href: '/education/duct-static-control.html#static-is-not-flow', label: 'Duct Static Control — Static Is Not Flow' },
        tags: ['forced-air', 'duct-static', 'signals']
    },

    // ── Reset ──────────────────────────────────────────────
    {
        type: 'mcq',
        id: 'ds-reset',
        prompt: 'A VAV system runs static-pressure reset (trim & respond). What is the sequence actually doing?',
        choices: [
            { id: 'a', text: 'Walking the static setpoint down until the most-open box damper in the building sits nearly wide open — so the fan makes only the pressure someone is actually using.', correct: true },
            { id: 'b', text: 'Raising the setpoint as boxes close, to keep total airflow constant.' },
            { id: 'c', text: 'Slowing the fan directly off box damper positions, bypassing the static loop.' },
            { id: 'd', text: 'Dropping the setpoint to zero whenever the building is unoccupied.' }
        ],
        explain: 'A fixed setpoint is sized for the worst afternoon of the year, and every other hour the boxes throttle the surplus away across their own dampers — pressure the fan paid cube-law money to make. Trim & respond polls the boxes: nobody near wide open, trim the setpoint down; some box driving toward its stops, respond back up. The steady state parks the most-open damper near fully open, doing no throttling. It\'s pump control\'s most-open-valve reset with air in it. The loop stays a static loop throughout — box positions move the <em>setpoint</em>, never the fan directly — and there\'s a floor, not zero, so far boxes can still make their ventilation minimums.',
        learnMore: { href: '/education/duct-static-control.html#reset', label: 'Duct Static Control — Setpoint Reset' },
        tags: ['forced-air', 'duct-static', 'reset']
    },

    // ── Static is not flow ─────────────────────────────────
    {
        type: 'tf',
        id: 'ds-static-means-flow',
        prompt: 'If duct static is sitting exactly on setpoint, total supply airflow must be somewhere near design.',
        answer: false,
        explain: 'False — 1.5 in. w.c. (375 Pa) at 30,000 CFM (51,000 m³/h) and 1.5 in. w.c. at 7,600 CFM (12,900 m³/h) are indistinguishable at the sensor. That\'s not a flaw; it\'s the design: the loop holds pressure precisely so flow is free to collapse when zones stop asking. Duct static is a pressure promise, not a flow promise — which is why anything that needs proof of <em>airflow</em> (a DX stage, for one) must be interlocked on airflow, never on a healthy static.',
        learnMore: { href: '/education/duct-static-control.html#static-is-not-flow', label: 'Duct Static Control — Static Is Not Flow' },
        tags: ['forced-air', 'duct-static']
    },
    {
        type: 'gotcha',
        id: 'ds-masked-restriction',
        prompt: 'A packaged VAV unit, ordinary weather, no complaints. You pull the month\'s trend anyway — what is it telling you?',
        snippet: '<pre class="quiz-snippet">SUPPLY STATIC    1.50 in. w.c. · ON SETPOINT ALL MONTH\nSUPPLY FAN       58 Hz today · 44 Hz same load last month\nTOTAL SUPPLY     18,000 CFM (30,600 m³/h) · normal for the weather\nZONES            quiet · no calls</pre>',
        choices: [
            { id: 'a', text: 'A restriction is growing upstream — loading filters, a fouling or icing coil — and the static loop is hiding it by spending fan speed to hold the same number.', correct: true },
            { id: 'b', text: 'The static sensor is drifting low, making the fan work harder than it needs to.' },
            { id: 'c', text: 'The VFD is losing calibration and over-speeding the motor.' },
            { id: 'd', text: 'Nothing — fan speed normally varies that much with the seasons.' }
        ],
        explain: 'The loop\'s job is to keep static on setpoint, and it\'s doing that job perfectly — by paying 14 extra Hz to drag the same air through something that\'s choking. You will never find this failure on the static trend, because the static trend is the thing the loop is defending. <strong>Hz at a given flow is the honest number</strong>: same load, +14 Hz, something upstream got harder to breathe through. A drifting sensor changes the <em>static</em> story, not the Hz-at-flow story; "seasonal variation" is killed by the trend\'s own "same load" column. This is the fingerprint that pairs with suction pressure diving on the DX side.',
        learnMore: { href: '/education/duct-static-control.html#static-is-not-flow', label: 'Duct Static Control — Static Is Not Flow' },
        tags: ['forced-air', 'duct-static', 'dx']
    },
    {
        type: 'mcq',
        id: 'ds-old-fix',
        prompt: 'A DX coil is starving for airflow at part load, so someone cranks the supply fan speed to force more air through it. The boxes are pressure-independent. What actually happens?',
        choices: [
            { id: 'a', text: 'Almost nothing moves — every box pinches to hold its own flow setpoint, so total airflow stays where the zones put it and the extra fan just becomes duct pressure.', correct: true },
            { id: 'b', text: 'Airflow rises roughly in proportion to speed, per the affinity laws.' },
            { id: 'c', text: 'The boxes overflow their setpoints and the zones overcool.' },
            { id: 'd', text: 'Duct static falls, because more air is moving through the same duct.' }
        ],
        explain: 'The affinity laws are the trap here: flow follows speed only against a <em>fixed</em> system, and a duct full of pressure-independent boxes is the opposite of fixed — every box re-throttles to hold its CFM the moment inlet pressure rises. The zones already set the flow; no amount of pressure changes what they asked for. <strong>The fan makes pressure; the boxes make flow.</strong> The extra speed goes into static — climbing toward wherever the fan curve tops out, past setpoint, past the sensor\'s range if nothing stops it. A starving coil needs more flow, and more flow lives at the boxes (minimums, bypass, a dump zone) — never at the fan.',
        learnMore: { href: '/education/duct-static-control.html#static-is-not-flow', label: 'Duct Static Control — Static Is Not Flow' },
        tags: ['forced-air', 'duct-static', 'dx']
    },

    // ── Safeties ───────────────────────────────────────────
    {
        type: 'mcq',
        id: 'ds-cutout',
        prompt: 'The high-static cutout on a VAV air handler is a separate mechanical pressure switch, hard-wired to stop the fan. Why isn\'t it just a compare block on the transducer signal in the BMS?',
        choices: [
            { id: 'a', text: 'Because the events it protects against are exactly the ones where that signal is a lie — a railed sensor, a plugged sensing tube, a crashed controller. Hardware has to answer when software\'s number is gone.', correct: true },
            { id: 'b', text: 'Because mechanical switches respond faster than a BMS scan cycle, and speed is the only reason.' },
            { id: 'c', text: 'Because transducers physically can\'t read pressures above their setpoint.' },
            { id: 'd', text: 'Because the BMS isn\'t allowed to stop equipment.' }
        ],
        explain: 'Trace the failure that pops ductwork: a sensing tube plugs and reads low, the loop sees a starving duct, and it drives the fan toward 100% while the <em>real</em> static runs away high — with the transducer swearing everything\'s low the entire time. Logic on that signal protects nothing, because the signal is the thing that failed. The cutout is a separate device on its own tap, set well above setpoint, usually manual-reset so a human has to come find out why. Speed helps, but it\'s not the reason — independence is. A unit without one isn\'t aggressive, it\'s uninsured.',
        learnMore: { href: '/education/duct-static-control.html#safeties', label: 'Duct Static Control — When the Loop Can\'t Save You' },
        tags: ['forced-air', 'duct-static', 'safeties']
    },

    // ── The chapter close ──────────────────────────────────
    {
        type: 'mcq',
        id: 'ds-who-decides',
        prompt: 'Chapter closed — one synthesis question. In a healthy VAV system, who decides total supply airflow, and who decides duct pressure?',
        choices: [
            { id: 'a', text: 'The boxes decide flow — each holding its own zone\'s setpoint — and the fan holds pressure so they can. Loads throttle; the mover responds.', correct: true },
            { id: 'b', text: 'The fan decides both — it\'s the only thing actually moving air.' },
            { id: 'c', text: 'The fan decides flow and the boxes decide pressure at their inlets.' },
            { id: 'd', text: 'The BMS schedules both from the occupancy calendar.' }
        ],
        explain: 'Division of labor is the chapter\'s spine: thirty boxes each chase a CFM for their own room, and the sum of what they take <em>is</em> total flow — nobody upstream commands it. The fan\'s one job is to keep the trunk pressurized enough that every box can take what it wants, which is why its loop watches static and nothing else. It\'s the same division the hydronic arc drew with valves and a pump. Answer (c) is exactly backwards, and it\'s the misread behind half the bad fixes on VAV systems — including cranking a fan to make flow that only the boxes can grant.',
        learnMore: { href: '/education/duct-static-control.html#the-whole-path', label: 'Duct Static Control — The Whole Path, One More Time' },
        tags: ['forced-air', 'duct-static']
    },
];
