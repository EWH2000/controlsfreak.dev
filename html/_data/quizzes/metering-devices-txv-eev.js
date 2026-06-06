// Question bank for the TXVs vs. EEVs quiz, exposed to Nunjucks as
// `quizzes['metering-devices-txv-eev']`. Lives in _data/ so two
// consumers read one source: the page's inline JS (mounts the engine in
// the browser) and the FAQPage JSON-LD emitter in head.njk (indexable
// Q&A for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_metering-devices-txv-eev_* localStorage keys. Pairs with the
// TXVs vs. EEVs (Metering Devices) lesson; learnMore hrefs deep-link its
// <h2> anchors.

module.exports = [
    // ── What the metering device does ──────────────────────
    {
        type: 'mcq',
        id: 'controlled-variable',
        prompt: 'Both a TXV and an EEV modulate how wide-open their port is. What variable are they modulating against — the thing they\'re trying to hold at a target?',
        choices: [
            { id: 'a', text: 'Discharge (head) pressure.' },
            { id: 'b', text: 'Evaporator-outlet superheat.', correct: true },
            { id: 'c', text: 'Condenser subcooling.' },
            { id: 'd', text: 'Compressor current.' }
        ],
        explain: 'Both valves modulate to hold evaporator-outlet superheat. Too little feed and the coil starves (superheat climbs); too much and liquid escapes the coil (superheat falls toward zero, then negative — floodback). The valve\'s whole job is keeping that number sitting at the target as load drifts. A fixed orifice can\'t — it has no feedback.',
        learnMore: { href: '/education/metering-devices-txv-eev.html#what-it-does', label: 'TXVs vs. EEVs — What the metering device does' },
        tags: ['refrigeration', 'metering']
    },

    // ── The TXV ────────────────────────────────────────────
    {
        type: 'mcq',
        id: 'txv-opens',
        prompt: 'Inside a TXV, three forces act on the diaphragm. Which force pushes the port OPEN?',
        choices: [
            { id: 'a', text: 'The adjustable spring.' },
            { id: 'b', text: 'The sensing-bulb pressure, fed to the top of the diaphragm through the capillary.', correct: true },
            { id: 'c', text: 'The evaporator pressure from the external equalizer.' },
            { id: 'd', text: 'The high-side liquid pressure at the inlet.' }
        ],
        explain: 'The sensing bulb, strapped to the suction line, holds a refrigerant charge whose saturation pressure tracks the line temperature. That pressure pushes DOWN on the top of the diaphragm — the opening force. A warmer bulb means more downward force, so the port opens and feeds more. The spring and the evaporator pressure on the bottom are the closing forces.',
        learnMore: { href: '/education/metering-devices-txv-eev.html#txv', label: 'TXVs vs. EEVs — The TXV' },
        tags: ['refrigeration', 'metering', 'txv']
    },
    {
        type: 'mcq',
        id: 'txv-closes',
        prompt: 'Which forces push a TXV\'s port toward CLOSED?',
        choices: [
            { id: 'a', text: 'The sensing-bulb pressure alone.' },
            { id: 'b', text: 'The adjustable spring plus the evaporator pressure (fed to the lower chamber).', correct: true },
            { id: 'c', text: 'The capillary tube\'s own weight.' },
            { id: 'd', text: 'The discharge pressure.' }
        ],
        explain: 'On the bottom of the diaphragm, two forces push up (closing): the adjustable spring and the evaporator pressure fed to the lower chamber through the equalizer. The diaphragm settles where the bulb pressure on top balances the spring-plus-evaporator pressure on the bottom, and the needle settles into a matching port position. The whole thing is a control loop made of metal.',
        learnMore: { href: '/education/metering-devices-txv-eev.html#txv', label: 'TXVs vs. EEVs — The TXV' },
        tags: ['refrigeration', 'metering', 'txv']
    },
    {
        type: 'tf',
        id: 'txv-no-power',
        prompt: 'A TXV needs no power supply, controller, or setpoint entry — it does its modulating continuously and silently as a self-contained mechanical loop.',
        answer: true,
        explain: 'True. The bulb, capillary, diaphragm, spring, and needle form a complete feedback loop with no electronics. Load drifts, the bulb temperature follows, the force balance shifts, the port repositions — all mechanically. That self-sufficiency is the TXV\'s charm and also its limit: there\'s nothing to put on a network, so a BMS watching a TXV unit sees only suction and discharge pressure.',
        learnMore: { href: '/education/metering-devices-txv-eev.html#txv', label: 'TXVs vs. EEVs — The TXV' },
        tags: ['refrigeration', 'metering', 'txv']
    },
    {
        type: 'mcq',
        id: 'txv-spring-sets-target',
        prompt: 'On a TXV, what sets the TARGET superheat the valve holds?',
        choices: [
            { id: 'a', text: 'The length of the capillary tube.' },
            { id: 'b', text: 'The spring tension, set with an adjustment screw at install.', correct: true },
            { id: 'c', text: 'The size of the sensing bulb.' },
            { id: 'd', text: 'The external equalizer line\'s diameter.' }
        ],
        explain: 'The spring sets the target. More spring force means a higher superheat target, because the bulb has to get warmer — more downward force — to balance it. Techs turn an adjustment screw in fractions of a turn to change it; the data sheet gives the degrees of superheat per turn. There\'s no keypad — adjusting a TXV target is a wrench job, which is exactly where the EEV\'s changeable setpoint becomes an advantage.',
        learnMore: { href: '/education/metering-devices-txv-eev.html#txv', label: 'TXVs vs. EEVs — The TXV' },
        tags: ['refrigeration', 'metering', 'txv']
    },
    {
        type: 'mcq',
        id: 'txv-external-equalizer',
        prompt: 'What does a TXV\'s external equalizer line do?',
        choices: [
            { id: 'a', text: 'It bleeds off excess head pressure on the high side.' },
            { id: 'b', text: 'It routes the suction-line pressure (at the bulb) back to the lower diaphragm chamber, so the force balance reflects conditions at the coil outlet — needed when there\'s meaningful evaporator pressure drop.', correct: true },
            { id: 'c', text: 'It equalizes pressure between the high and low sides during the off cycle.' },
            { id: 'd', text: 'It fills the sensing bulb with charge.' }
        ],
        explain: 'Without the equalizer, the lower chamber feels the pressure right at the valve outlet — which, on a system with much evaporator pressure drop (a multi-circuit distributor, say), is meaningfully different from the pressure where the bulb actually lives. The external equalizer taps the suction line near the bulb and feeds that pressure to the lower chamber, so the force balance reflects the coil outlet. Tiny systems may use internally-equalized TXVs and skip it.',
        learnMore: { href: '/education/metering-devices-txv-eev.html#txv', label: 'TXVs vs. EEVs — The TXV' },
        tags: ['refrigeration', 'metering', 'txv']
    },
    {
        type: 'gotcha',
        id: 'txv-bulb-lookalike',
        prompt: 'On a packaged unit you spot a small bulb strapped tight to a line, fed by a thin tube into a body lower down. It looks like a duct-mounted return-air temperature sensor. What tells you it\'s a TXV sensing bulb instead?',
        snippet: '<pre class="quiz-snippet">seen:  small bulb strapped to a line\n       thin tube → body below\nlooks: like a strap-on temp sensor</pre>',
        choices: [
            { id: 'a', text: 'Nothing — they\'re functionally the same thing.' },
            { id: 'b', text: 'The line it\'s clamped to is bare copper (a refrigerant suction line), and the body\'s other connections are refrigerant pipes, not low-voltage wires.', correct: true },
            { id: 'c', text: 'A TXV bulb is always painted red.' },
            { id: 'd', text: 'The bulb would be on the liquid line, not the suction line.' }
        ],
        explain: 'The silhouette really is the same as a strap-on temperature sensor — bulb on a line, thin lead into a box. The cue is what the bulb touches and what the body connects to: bare copper suction line (not duct wrap) and refrigerant pipe connections (not low-voltage wiring). The TXV bulb sits on the suction line just downstream of the evaporator. People who\'ve lived in BMS land but not in mechanical rooms mistake it once — and never again.',
        learnMore: { href: '/education/metering-devices-txv-eev.html#txv', label: 'TXVs vs. EEVs — The TXV' },
        tags: ['refrigeration', 'metering', 'txv', 'field']
    },

    // ── The EEV ────────────────────────────────────────────
    {
        type: 'mcq',
        id: 'eev-computes-superheat',
        prompt: 'How does an EEV\'s controller know the superheat it\'s controlling to?',
        choices: [
            { id: 'a', text: 'A sensing bulb feeds it directly, same as a TXV.' },
            { id: 'b', text: 'It reads a suction-line pressure transducer and a suction-line temperature sensor, looks up the saturation temperature for the measured pressure, and subtracts: SH = T − T_sat(P).', correct: true },
            { id: 'c', text: 'It measures the valve position and infers superheat from it.' },
            { id: 'd', text: 'It reads discharge pressure only.' }
        ],
        explain: 'The EEV replaces the mechanical force balance with a digital loop. A pressure transducer and a temperature sensor on the suction line wire into the controller; it computes saturation temperature from the pressure, subtracts from the measured temperature to get superheat, compares to a setpoint parameter, and commands the stepper a few steps wider or tighter. From the BMS you see superheat actual, superheat setpoint, and valve position as points.',
        learnMore: { href: '/education/metering-devices-txv-eev.html#eev', label: 'TXVs vs. EEVs — The EEV' },
        tags: ['refrigeration', 'metering', 'eev']
    },
    {
        type: 'tf',
        id: 'eev-holds-position',
        prompt: 'When power is removed, an EEV\'s stepper motor holds its last commanded position rather than springing fully open or fully closed.',
        answer: true,
        explain: 'True. The stepper holds position with no power — last commanded step stays put. That\'s worth knowing during troubleshooting: an EEV doesn\'t fail to a default opening the way some actuators do, so "where is it parked" depends on what it was last told. A typical EEV port has anywhere from a few hundred to a few thousand discrete steps from fully closed to fully open — that\'s the resolution the control loop works with.',
        learnMore: { href: '/education/metering-devices-txv-eev.html#eev', label: 'TXVs vs. EEVs — The EEV' },
        tags: ['refrigeration', 'metering', 'eev']
    },
    {
        type: 'gotcha',
        id: 'eev-out-of-authority',
        prompt: 'On a trend graphic, an EEV\'s valve position is pinned hard at 100% open while superheat stays stubbornly above setpoint. The stepper is moving fine on command. What does this say?',
        snippet: '<pre class="quiz-snippet">valve position:  100%  (hard rail)\nsuperheat:       above setpoint, not falling\nstepper:         responds to commands</pre>',
        choices: [
            { id: 'a', text: 'The EEV is feeding too much refrigerant.' },
            { id: 'b', text: 'The loop has run out of authority — feed isn\'t the limiting factor anymore. Suspect undercharge, a wrong/low coil load, or a lying sensor, not the valve.', correct: true },
            { id: 'c', text: 'Normal — EEVs sit at 100% most of the time.' },
            { id: 'd', text: 'The stepper has failed closed.' }
        ],
        explain: 'When valve position hard-rails at 0% or 100% with superheat still off-target, the loop is out of authority: it has opened (or closed) as far as it can and the process variable still won\'t come to setpoint, so the problem is no longer the metering device\'s opening. Wide open + high superheat means the coil simply isn\'t getting enough refrigerant for reasons upstream of the valve — undercharge, a restriction, a mis-measured load, or a drifting sensor. Chasing the valve is the wrong move.',
        learnMore: { href: '/education/metering-devices-txv-eev.html#eev', label: 'TXVs vs. EEVs — The EEV' },
        tags: ['refrigeration', 'metering', 'eev', 'troubleshooting']
    }
];
