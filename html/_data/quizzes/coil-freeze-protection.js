// Question bank for the Coil Freeze Protection quiz, exposed to
// Nunjucks as `quizzes['coil-freeze-protection']`. Lives in _data/ so
// two consumers read one source: the page's inline JS (mounts the
// engine in the browser) and the FAQPage JSON-LD emitter in head.njk
// (indexable Q&A for search).
//
// Schema lives in html/scripts/quiz-engine.js's header. `id`s are
// kebab-case and stable across edits — they namespace the
// cf_quiz_coil-freeze-protection_* localStorage keys. Pairs with the
// Coil Freeze Protection lesson; learnMore hrefs deep-link its <h2>
// anchors. Sequential order is the lesson walk: what actually freezes
// → the three exposure terms → the mass basis → the protection stack
// → the code by climate → reading a trip.
//
// The bank is deliberately larger than the page's defaultCount (10):
// the engine samples an overflowing bank, so each run draws a
// different subset (buildQueue() in quiz-engine.js). Coverage tracks
// the lesson's sections — coil-face air rather than supply air and
// which coils can burst; climate setting one exposure term of three
// (the lesson's own Boston mixing arithmetic against a 100 %-OA unit)
// and stratification against an average; which way the volume-share
// hand number leans; each layer of the stack (the freeze stat's
// element, leaving-side placement and fan-circuit wiring, manual
// reset, the setpoint band as a written choice, the software low
// limit above it, the valve driven wide open, glycol freeze vs burst
// point, blowing out a drained coil, and what eats a winter-safe
// minimum's margin); what the energy code does and does not say by
// climate; and a trip read as evidence.
//
// This is a damage-stakes topic: every keyed answer is the
// conservative one the lesson states, and none tells a reader a layer
// of the stack can be skipped. Every figure is the lesson's own.
//
// Quiz prose is painted post-load (the units walker doesn't reach it),
// so temperatures carry static metric parentheticals per the
// metric-rounding policy — results close on the displayed operands.
// Visible strings spell it "freeze stat" (house spelling); ids may
// use the hyphenated form.

module.exports = [
    // ── What actually freezes ──────────────────────────────
    {
        type: 'mcq',
        id: 'cfp-coil-face-air',
        prompt: 'A January morning, and the graphic shows the unit\'s discharge air holding a steady 55 °F (12.8 °C). What does that reading tell you about the risk to its heating coil?',
        choices: [
            { id: 'a', text: 'The coil is safe — air leaving the unit at that temperature cannot be freezing anything upstream of the fan.' },
            { id: 'b', text: 'Very little — the coil freezes on the air reaching its face, not on the air leaving the unit.', correct: true },
            { id: 'c', text: 'The coil is at risk only once the discharge reading falls to the freeze stat setpoint.' },
            { id: 'd', text: 'It proves the heating valve is open and hot water is moving, so the coil\'s tubes are protected for now.' }
        ],
        explain: 'The hazard is not the supply-air temperature. A unit designed to deliver 55 °F (12.8 °C) air cannot freeze a coil with 55 °F (12.8 °C) air — the coil freezes on the air that reaches its face, which in winter is the mixed air, or, past a preheat coil, whatever that coil left behind. A healthy-looking discharge temperature on the graphic says nothing about what the first row of tubes felt at 6 AM. Watch MA-T, and watch what is in the tubes.',
        learnMore: { href: '/education/coil-freeze-protection.html#the-hazard', label: 'Coil Freeze Protection — What Actually Freezes' },
        tags: ['forced-air', 'freeze-protection', 'mixed-air']
    },
    {
        type: 'mcq',
        id: 'cfp-which-coils-burst',
        prompt: 'Which of these units has no coil that can split from freezing?',
        choices: [
            { id: 'a', text: 'An air handler whose chilled-water coil sits idle through the winter.' },
            { id: 'b', text: 'An air handler with a steam coil behind a throttling valve.' },
            { id: 'c', text: 'A packaged DX rooftop unit with a gas furnace.', correct: true },
            { id: 'd', text: 'An air handler whose hot-water coil runs on a modulating valve.' }
        ],
        explain: 'Freeze-burst protection is written for water and steam coils, because those are the coils with something inside them that expands. A packaged DX rooftop with a gas furnace has no water coil to burst at all — its cold-weather concern is an evaporator icing over and losing airflow, a compressor problem rather than a burst problem. Each of the other three can burst: a hot-water coil is protected only while hot water is moving through it; an idle chilled-water coil has no heat source to rescue it and survives on glycol, on being drained, or on never seeing freezing air; and a throttled steam valve pulls the coil below atmospheric pressure, so the vacuum holds condensate up in the tubes and sub-freezing air does the rest.',
        learnMore: { href: '/education/coil-freeze-protection.html#the-hazard', label: 'Coil Freeze Protection — What Actually Freezes' },
        tags: ['forced-air', 'freeze-protection', 'coils']
    },

    // ── Exposure has three terms ───────────────────────────
    {
        type: 'numeric',
        id: 'cfp-boston-mixed-air',
        prompt: 'Boston\'s design morning: 8 °F (−13.3 °C) outdoors and 75 °F (23.9 °C) return air, on a mixed-air unit at a 20 % outdoor-air minimum. By the volume-share mixing arithmetic, what mixed-air temperature reaches its coil? Enter the answer in °F.',
        answer: 61.6,
        tolerance: 0.5,
        unit: '°F',
        explain: '%OA × OAT + %RA × RAT = 0.2 × 8 + 0.8 × 75 = 1.6 + 60 = 61.6 °F (16.5 °C) (in °C: 0.2 × (−13.3) + 0.8 × 23.9 ≈ 16.5). Now set a 100 %-outdoor-air unit in Atlanta beside it: it has nothing to dilute the intake with, so its 19 °F (−7.2 °C) design temperature is what hits the coil. The Atlanta unit is far more exposed, and the map had nothing to do with it. Exposure multiplies three things — the coldest outdoor air the design plans for, the outdoor-air fraction the mixing box runs, and a wet coil in the path — and climate sets exactly one of them.',
        learnMore: { href: '/education/coil-freeze-protection.html#three-terms', label: 'Coil Freeze Protection — Exposure Has Three Terms' },
        tags: ['forced-air', 'freeze-protection', 'mixed-air']
    },
    {
        type: 'mcq',
        id: 'cfp-stratified-layer',
        prompt: 'An averaging mixed-air sensor reads comfortably above freezing, yet the freeze stat on the coil trips. What explains the disagreement?',
        choices: [
            { id: 'a', text: 'Cold outdoor air is denser and can ride the bottom of the plenum; any short length of the stat\'s element seeing it trips the stat.', correct: true },
            { id: 'b', text: 'They can\'t both be right — an averaging element is the better instrument, so a trip against a warm average is a nuisance trip to reset and log.' },
            { id: 'c', text: 'The averaging sensor lags the capillary by several minutes, so the two readings will agree once the trend catches up with the trip.' },
            { id: 'd', text: 'The stat\'s capillary averages a wider area than the mixed-air element does, so of the two it is the truer average.' }
        ],
        explain: 'Below 100 % outdoor air, the two streams do not blend the instant they meet. Cold outdoor air is denser and tends to stay stratified, so a cold layer can ride along the bottom of the plenum and freeze the bottom rows of a coil while the average mixed air reads comfortably warm. The freeze stat is built for exactly that: it is not averaging but the opposite — any 8–12 in. (20–30 cm) of its element seeing air below setpoint trips it, so it reacts to the coldest spot it crosses. The outdoor-air fraction gives you an average, and coils do not freeze on averages.',
        learnMore: { href: '/education/coil-freeze-protection.html#three-terms', label: 'Coil Freeze Protection — Exposure Has Three Terms' },
        tags: ['forced-air', 'freeze-protection', 'stratification']
    },

    // ── Why the hand math runs warm ────────────────────────
    {
        type: 'mcq',
        id: 'cfp-mass-basis-lean',
        prompt: 'On a 0 °F (−17.8 °C) morning, the volume-share mixing arithmetic puts a 20 % minimum against 75 °F (23.9 °C) return at 60.0 °F (15.6 °C). How does that hand number compare with what actually reaches the coil, and why?',
        choices: [
            { id: 'a', text: 'It reads cold, so the real mix at the coil has a little more margin than the hand number shows.' },
            { id: 'b', text: 'It is exact — the coil responds to the volume share, and the volume share is what the damper sets.' },
            { id: 'c', text: 'It reads warm — cold air is denser, so a 20 % damper share is more than 20 % of the air by mass at the coil.', correct: true },
            { id: 'd', text: 'It reads warm on a 100 % outdoor-air unit only; for a mixed-air unit the arithmetic is exact.' }
        ],
        explain: 'The hand arithmetic weights the streams by volume — the damper or CFM share. The coil cares about how many pounds of cold air arrive per pound of warm, and cold air is denser: at 0 °F (−17.8 °C) and 40 % RH a pound of dry air occupies about 11.6 ft³ (a kilogram, about 0.72 m³), at 75 °F (23.9 °C) and 50 % RH about 13.7 ft³ (0.85 m³) — an 18 % spread — so that 20 % damper share is 22.8 % by mass. On a dry-air mass basis the mix lands near 58.1 °F (14.5 °C), so the hand number reads about 1.9 °F (1.1 °C) warm, on exactly the cold mornings when the margin matters. The hand form is still the one to do on the roof — just know which way it leans.',
        learnMore: { href: '/education/coil-freeze-protection.html#mass-basis', label: 'Coil Freeze Protection — Why the Hand Math Runs Warm on a Cold Day' },
        tags: ['forced-air', 'freeze-protection', 'mixed-air', 'psychrometrics']
    },

    // ── The protection stack: the freeze stat ──────────────
    {
        type: 'gotcha',
        id: 'cfp-freeze-stat-submittal',
        prompt: 'A submittal for the freeze stat on an air handler\'s hot-water coil lands on your desk. Which line, if any, do you send back?',
        snippet: '<pre class="quiz-snippet">FREEZE STAT — HOT-WATER COIL\nElement   vapor-charged capillary, 20 ft (6 m),\n          serpentined across the full coil face\nMounting  entering-air side of the coil\nContact   NC, in series with the supply fan\'s\n          safety string</pre>',
        choices: [
            { id: 'a', text: 'Element — it should be a single-point bulb, not a long capillary.' },
            { id: 'b', text: 'Mounting — the element belongs on the coil\'s leaving-air side.', correct: true },
            { id: 'c', text: 'Contact — it should be normally open, so a trip closes it.' },
            { id: 'd', text: 'None of them — approve it as written.' }
        ],
        explain: 'Mount the element on the leaving-air side. On the entering side, a short length of tube sitting in a cold stratified layer trips it while the coil itself is in no danger. The other two lines are right. A vapor-charged capillary, 20 ft (6 m) or so, serpentined back and forth across the face, trips when any 8–12 in. (20–30 cm) of it sees air below setpoint — it reacts to the coldest spot it crosses rather than averaging. And a normally-closed contact in series with the fan\'s safety string stops the fan without asking the controller\'s permission; the sequence then closes the outdoor dampers and drives the heating valve open.',
        learnMore: { href: '/education/coil-freeze-protection.html#protection-stack', label: 'Coil Freeze Protection — The Protection Stack' },
        tags: ['forced-air', 'freeze-protection', 'freeze-stat']
    },
    {
        type: 'tf',
        id: 'cfp-manual-reset',
        prompt: 'An auto-reset freeze stat is the safer pick: once the air warms back up, the fan restarts on its own and the unit is back in service without anyone driving in.',
        answer: false,
        explain: 'False — insist on manual reset. An auto-reset stat cycles the fan all night while the coil keeps icing, and nobody finds out why until the puddle. The public federal guide spec puts it the same way: hardwired to the fan starter, with manual reset at the device.',
        learnMore: { href: '/education/coil-freeze-protection.html#protection-stack', label: 'Coil Freeze Protection — The Protection Stack' },
        tags: ['forced-air', 'freeze-protection', 'freeze-stat']
    },
    {
        type: 'mcq',
        id: 'cfp-setpoint-band',
        prompt: 'A building engineer asks what the coil freeze stat "should" be set to. Which answer holds up?',
        choices: [
            { id: 'a', text: 'Leave it at the factory 35 °F (1.7 °C) — that is the code-required value, and it should not be adjusted.' },
            { id: 'b', text: 'Lower in the South and higher up north — the published application band is set by climate zone.' },
            { id: 'c', text: 'As low as the dial goes, so the fan only ever stops when ice is certain and never on a marginal morning.' },
            { id: 'd', text: 'Somewhere in the 35–38 °F (1.7–3.3 °C) practical band — a choice to make and write down, not a code line.', correct: true }
        ],
        explain: 'Stats ship set around 35 °F (1.7 °C), adjustable, and the practical band runs 35–38 °F (1.7–3.3 °C). Published application guidance clusters between 35 and 37 °F (1.7 and 2.8 °C) — a national range, not a regional one — and field settings reach 38 °F (3.3 °C) at the top: a deliberate early trip that buys a degree of margin and accepts a few more nuisance trips on marginal mornings. Write the number down; it is a choice, not a code line. And a stat set below the fluid\'s freeze point can only trip after ice is already possible.',
        learnMore: { href: '/education/coil-freeze-protection.html#protection-stack', label: 'Coil Freeze Protection — The Protection Stack' },
        tags: ['forced-air', 'freeze-protection', 'freeze-stat']
    },

    // ── The protection stack: the rest of the layers ───────
    {
        type: 'mcq',
        id: 'cfp-software-limit-above',
        prompt: 'The DDC Workbench\'s air handler stacks a software discharge low-limit at 41 °F (5.0 °C) over its hardwired freeze stat at 38 °F (3.3 °C). Why is the software limit the higher of the two?',
        choices: [
            { id: 'a', text: 'So software acts first and the hardwired stat stays the backstop rather than the first line.', correct: true },
            { id: 'b', text: 'Because the stat reads the mixed air ahead of the coil, while the software limit reads warmer air downstream.' },
            { id: 'c', text: 'So the stat never has to trip at all, which lets it be wired to an alarm input instead of the fan circuit.' },
            { id: 'd', text: 'Because the controller\'s temperature sensors read warm, and the higher number makes up for that error.' }
        ],
        explain: 'Software acts first, and the stat stays the backstop. Before the stat ever has to act, the controller should have seen the dive coming: when MA-T sags toward a low limit, the mixed-air override drives the dampers back toward minimum whatever the free-cooling logic wants. On the Workbench that override is a separate modulating loop that starts throttling the dampers at a 50 °F (10.0 °C) floor. Each layer exists because the one before it can fail — and the software floor can fail quietly. It reads the same mixed-air sensor as everything else, so a single-point sensor parked in the warm half of a stratified plenum defeats it; an averaging element across the plenum is the fix.',
        learnMore: { href: '/education/coil-freeze-protection.html#protection-stack', label: 'Coil Freeze Protection — The Protection Stack' },
        tags: ['forced-air', 'freeze-protection', 'low-limit']
    },
    {
        type: 'tf',
        id: 'cfp-valve-wide-open',
        prompt: 'A heating valve that only cracks open on a freeze trip can be part of the hazard rather than the protection.',
        answer: true,
        explain: 'True. A trickle of hot water through a coil in freezing air freezes before it makes it back out. The strongest protection a water coil has is hot water moving through it, so the trip — or a mixed-air threshold, or outdoor temperature alone; sequences differ on the trigger and the spec says which — starts the coil\'s circulating pump and drives the heating valve wide open. The classic split is the same picture at light load: a modulating valve throttled nearly shut, the coldest air of the morning meeting the slowest water of the day in the same tubes.',
        learnMore: { href: '/education/coil-freeze-protection.html#protection-stack', label: 'Coil Freeze Protection — The Protection Stack' },
        tags: ['forced-air', 'freeze-protection', 'hydronics']
    },
    {
        type: 'mcq',
        id: 'cfp-glycol-burst-point',
        prompt: 'A glycol chart lists both a freeze point and a burst point for each concentration. How do the two relate?',
        choices: [
            { id: 'a', text: 'They are the same temperature — one is quoted for ethylene glycol, the other for propylene.' },
            { id: 'b', text: 'Burst point is the warmer of the two: the tube splits as soon as slush starts to form.' },
            { id: 'c', text: 'Freeze point is where slush first forms; burst point sits far below, because slush still flows.', correct: true },
            { id: 'd', text: 'Freeze point applies to a coil in service; burst point applies only to a coil that has been drained.' }
        ],
        explain: 'Freeze point is where slush first forms. Burst point sits far below it, because slush still flows and absorbs expansion — a 30 % mix can sit in 0 °F (−17.8 °C) air all winter without splitting, which is burst protection, not an operating condition. Two field facts travel with the chart. Glycol protects tubes, not trips: the stat reads air, so a glycol loop trips exactly as often as a water one. And loops drift lean as they get topped off with water, so a refractometer reading of the actual loop outranks the number on the fill tag.',
        learnMore: { href: '/education/coil-freeze-protection.html#protection-stack', label: 'Coil Freeze Protection — The Protection Stack' },
        tags: ['forced-air', 'freeze-protection', 'glycol']
    },
    {
        type: 'mcq',
        id: 'cfp-drain-blow-out',
        prompt: 'A chilled-water coil won\'t run again until spring, so it is being isolated and drained for the winter. Which step decides whether it survives?',
        choices: [
            { id: 'a', text: 'Opening the lowest drain and letting it run until it stops — once gravity has emptied the coil, nothing is left in it to freeze.' },
            { id: 'b', text: 'Leaving the isolation valves cracked, so any water that collects in the coil can drain back to the plant as the loop cools.' },
            { id: 'c', text: 'Closing the vents once it has drained, so no cold air can get into the empty tubes over the winter.' },
            { id: 'd', text: 'Blowing it out with compressed air after the drain — gravity leaves water in the low return bends.', correct: true }
        ],
        explain: 'An empty coil cannot split — but a coil drained by gravity alone still holds water in the low return bends, and that water splits the bend. So a coil that will not run until spring can be isolated, drained, and blown out with compressed air. It costs a refill and an air bleed in the spring; it costs nothing in glycol\'s heat-carrying penalty.',
        learnMore: { href: '/education/coil-freeze-protection.html#protection-stack', label: 'Coil Freeze Protection — The Protection Stack' },
        tags: ['forced-air', 'freeze-protection', 'coils']
    },
    {
        type: 'mcq',
        id: 'cfp-winter-minimum-margin',
        prompt: 'A minimum outdoor-air position was proven on a mild afternoon and left at that commanded percentage. Why might the design morning see a different outdoor-air fraction?',
        choices: [
            { id: 'a', text: 'Return air comes back colder on a cold morning, so the same blade position pulls in a bigger outdoor share.' },
            { id: 'b', text: 'The command is a blade angle, not a flow fraction, and a fixed angle\'s flow moves with pressure.', correct: true },
            { id: 'c', text: 'It won\'t — a minimum position is a share of the airflow, so it holds the same fraction in any weather.' },
            { id: 'd', text: 'The low-limit override drives it — on a cold morning it opens the damper past minimum to protect the coil.' }
        ],
        explain: 'A commanded percentage is a blade angle, not a flow fraction. Flow is not linear with stroke — which is why the floor gets proven with an airflow station or a traverse, not by commanding a number — and the flow a fixed angle delivers moves with the pressure across it: a VAV fan turned down for a January load, wind and stack effect on the intake. The damper is one of three things that eat into a winter-safe minimum\'s margin; the other two are the mass basis (the hand number reads warm) and stratification (the bottom of the coil is colder than the average). The margin is real. Just do not spend all of it.',
        learnMore: { href: '/education/coil-freeze-protection.html#protection-stack', label: 'Coil Freeze Protection — The Protection Stack' },
        tags: ['forced-air', 'freeze-protection', 'dampers']
    },

    // ── Why the sequence looks different by climate ────────
    {
        type: 'gotcha',
        id: 'cfp-climate-and-code',
        prompt: 'On a Houston job, a reviewer marks up the air-handler sequence with the comment below. What\'s the right response?',
        snippet: '<pre class="quiz-snippet">REVIEW COMMENT — AIR-HANDLER SEQUENCE\n"Delete the hardwired freeze stat. The energy code\n handles freeze protection by climate zone, and it\n locks our economizer out early down here anyway."</pre>',
        choices: [
            { id: 'a', text: 'Accept it — the humid-zone economizer lockout keeps cold air off the coil, which makes the stat redundant.' },
            { id: 'b', text: 'Reject it — the energy code requires a hardwired freeze stat on every hydronic coil, in every climate zone.' },
            { id: 'c', text: 'Accept it — Houston\'s design temperature sits above freezing, so coil burst is outside its design envelope.' },
            { id: 'd', text: 'Push back — those limits govern warm-day free cooling; the stat question is answered in this job\'s spec.', correct: true }
        ],
        explain: 'The energy code\'s climate rules constrain the warm end of the economizer band — when free cooling must stop. The only cold-end number it writes is for DX units; for the water coil it says nothing at the cold end at all. Nor does any model building code mandate a coil freeze stat: the mechanical code\'s hydronic chapter has no freeze-protection section, and the energy code\'s one freeze-protection line — shut freeze-protection heating off above 40 °F (4.4 °C) — is an energy rule, not an install mandate. Silence is not a rule. It is not permission to omit the stat and not a requirement to fit one; the answer is on this project\'s drawings and in its sequence. And Houston\'s design temperature is below freezing too, near 28 °F (−2.2 °C) — February 2021 put Texas far outside its design envelope.',
        learnMore: { href: '/education/coil-freeze-protection.html#by-climate', label: 'Coil Freeze Protection — Why the Sequence Looks Different by Climate' },
        tags: ['forced-air', 'freeze-protection', 'codes']
    },

    // ── Reading the trip ───────────────────────────────────
    {
        type: 'mcq',
        id: 'cfp-trip-as-evidence',
        prompt: 'The freeze stat tripped at 6 AM. Before anyone resets it, you pull the hour before: MA-T tracked OA-T down while the outdoor dampers sat commanded to minimum the whole time. What does that trend say?',
        choices: [
            { id: 'a', text: 'The damper was not at minimum — slipped linkage, seized actuator, return damper stuck half closed — and the stat did its job.', correct: true },
            { id: 'b', text: 'The stat tripped early: a commanded minimum means the mix was fine, so reset it and keep an eye on the next cold morning.' },
            { id: 'c', text: 'The outdoor air simply ran colder than the design day planned for; nothing on the unit is wrong, so reset the stat and move on.' },
            { id: 'd', text: 'The low-limit override should have caught it, so the fault is in the controller\'s program and the dampers are cleared.' }
        ],
        explain: 'Treat the trip as evidence — the stat is the one witness that was awake. A mix that tracked outdoors with the dampers commanded to minimum is a damper that was not at minimum: a slipped linkage, a seized actuator, a return damper stuck half closed. The stat did its job. The rest of the walk follows the same logic: find the element and note where it sits, check the heating valve and the pump at the time of the trip, then take the numbers to the Coil Freeze Risk Checker and read the margin against what is actually in the tubes.',
        learnMore: { href: '/education/coil-freeze-protection.html#reading-the-trip', label: 'Coil Freeze Protection — Reading the Trip' },
        tags: ['forced-air', 'freeze-protection', 'troubleshooting']
    },
];
