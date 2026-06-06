# controlsfreak.dev — Ideas & Friction

Running list of feature ideas and things that annoy me about the site
as I use it. Drop notes here as they come up; flesh out later. Items
graduate from here into `#roadmap` in `index.html`, then into actual
tools.

---

## Feature ideas



### Practice section — quizzes + field drills *(v1 shipped 2026-05-25)*
*One question: how does someone using the site as a self-paced course
know what they actually absorbed, and how do techs prepping for
interviews / certs get a free no-login drill site?*

Sixth top-level nav lane at `/practice/`. Closes the Education loop
with active recall (read a page → quiz yourself on its gotchas) and
opens a new audience lane (techs studying for interviews, BAS Pro,
journeyman exams). Full planning doc with rationale + the v2/v3
roadmap lives in `quiz-section-plan.md` at the root; this entry is
the friction-doc graduating note.

**v1 ships:**
- **Engine** at `html/scripts/quiz-engine.js` — classic script
  exposing `window.Quiz` with `Quiz.mount(target, questions, opts)`.
  Page provides an empty `<div>` + a `const questions = [...]`
  array; the engine owns every DOM node inside the mount target
  (settings row, progress, prompt, choices/numeric, reveal panel,
  results card). Schema covers `mcq` / `tf` / `gotcha` / `numeric`;
  validated on mount with a single `console.warn` on bad input.
  ARIA radio pattern on choice lists (`aria-checked`, not
  `aria-pressed`); `aria-live="polite"` reveal panel built in a
  `DocumentFragment` so screen readers announce once per submit.
- **Landing** at `/practice/` — two `<h2>` sections (Content
  Quizzes / Field Drills) with a topic chip row above. Chips
  collapse both grids into a flat filtered view; `[All]` restores
  the sectioned layout. Field-drill cards use `category: 'field'`
  (no chip) so they hide under any topic chip.
- **Modbus Decoding quiz** — content quiz, 10 questions exercising
  MCQ + T/F + spot-the-gotcha + numeric in one drill (densest
  gotcha set on the site — chosen to validate all four formats on
  the first quiz).
- **Surviving Your First Months** — field drill, 10-question
  sampler for techs in their first months. Replaced the
  empty-state placeholder so the section ships populated. Topic
  is intentionally broad; may be retired once more specialized
  drills (Field Wiring & Sensors, Sequencing Scenarios, Junior
  Interview Prep) land.

**Design decisions that landed:**
- *Single nav lane, not two* — "Practice" covers both quizzes and
  drills; the landing carries the disambiguation.
- *"Practice" over "Drills"/"Quizzes"* — softer label that covers
  both inner categories without label/content mismatch. URL is
  `/practice/`.
- *Two-section landing with chip refinement* — visual headings make
  the scope difference obvious to a first-time visitor; chips give
  returning visitors topic-filter ergonomics.
- *Amber section accent* — `--amber-dim` / `--amber-glow` triple
  added to `:root`; `.nav-card--practice` follows the existing
  `.nav-card--{section}` pattern.
- *localStorage* — per the site-wide `cf_<feature>_<key>`
  convention: `cf_quiz_<slug>_{best,best_total,best_time_ms,attempts,last_iso}`.
  Quiet failure in private mode. No in-progress save/restore in
  v1; refresh = restart. Mid-quiz setting changes surface a
  "Restart to apply" notice rather than silently reshuffling.
- *Cross-link path* — extended `related-links.njk` macro with a
  fourth optional `quizzes` group rendered as "Test yourself"
  after lessons. Education pages opt in by adding a `quizzes:`
  array to their `relatedLinks()` call (Modbus Decoding lesson
  did this in v1).
- *Stable anchor ids on lesson `<h2>`s* — added to
  `modbus-decoding.html` (`five-digit-trap`, `signed-vs-unsigned`,
  `byte-order`, `scaling`) and `modbus-basics.html`
  (`function-codes`, `exceptions`) so the quiz's per-question
  `learnMore` deep-links land in the right section.
- *nav-card.njk macro extended* — `section: 'practice'` maps to
  prefix word `QUIZ` and status pill `GO`.

**v2 batch shipped 2026-05-29/30** (three PRs):
- Protocol content quizzes — Modbus Basics, BACnet Basics, BACnet
  Networking (joining the v1 Modbus Decoding quiz). New `BACnet`
  topic chip.
- Hydronics content quizzes — Pump Control, Hydronic Loops, Load
  Piping, Hydronic Balancing. New `Hydronics` topic chip.
- Controller Swap field drill — self-contained (no paired lesson),
  hardware + software coverage of replacing a DDC controller.
- All paired lessons gained `pairedQuiz` + a "Test yourself" group,
  and the `<h2>` anchors their `learnMore` deep-links needed.

**Content-quiz matrix completed 2026-06-05** (three PRs — the v3
content-quiz arm): the remaining eight lessons gained paired quizzes,
so all 16 Education pages now have a 1:1 Practice quiz. Refrigeration
(Refrigerant Cycle Basics, Superheat & Subcooling, TXVs vs. EEVs;
new `Refrigeration` chip), Controls & Logic (PID Basics, VFDs,
Function Blocks; new `Controls` chip), and Air & Pumps (Psychrometrics
Basics → new `Psychrometrics` chip; Equipment Staging → joined the
`Hydronics` chip). Each ships the reciprocal FAQPage / `hasPart` /
`isPartOf` JSON-LD off the paired frontmatter, and added the `<h2>`
(or P/I/D callout) anchors its `learnMore` deep-links needed. Topic
chips are now All(21) · Modbus · BACnet · Hydronics(5) ·
Refrigeration(3) · Controls(3) · Psychrometrics(1).

**Three specialized field drills shipped 2026-06-05** (PR #178):
Field Wiring & Sensors, Sequencing Scenarios, and Troubleshooting —
each a 10-question bank in the field-drill mold (no paired lesson,
inline explanations, `learnMore` only to pages that exist,
`category: 'field'` so the cards hide under any topic chip). All chip
count went 18 → 21; no new topic chips (field drills add none). The
Field Drills section now holds five cards (First Months, Controller
Swap, + these three).

> **Friction — the field-card count is hard-coded in the smoke test.**
> `tests/smoke.spec.js`'s "practice landing — Modbus chip collapses
> sections" test asserts a literal field-card count (two `toHaveCount`
> sites, bumped `2 → 5` in PR #178). It's derived from nothing, so the
> next field drill silently fails that test until the number is bumped
> again. Cheap to fix when it bites (search the test for the count);
> noted here so the next drill author expects it. Not worth
> auto-deriving today — the count rarely changes and the explicit
> number doubles as a "did you remember to add the card" check.

**Still parked for v3** (full detail in `quiz-section-plan.md`):
- Remaining field drills (Commissioning, Tridium / EBO quirks, full
  Junior + Senior Interview Prep).
- **Cross-page Mix quizzes (All Protocols, All Hydronics) — now
  unblocked:** 2+ protocol banks and 4 hydronics banks exist. Needs
  the shared `_data/quiz-banks/` aggregation at build time. Good
  next increment.
- A **Commissioning education lesson** would give the Controller
  Swap drill (and a future Commissioning drill) a proper parent to
  pair against — today the drill is self-contained by necessity.
- Order-the-steps + identify-on-diagram question formats — both
  schema additions, deferred until a question genuinely needs them.

**Hard nos** (explicit non-goals in `quiz-section-plan.md`):
accounts / leaderboards / server-side scoring / adaptive difficulty
/ spaced repetition / drill-of-the-day / share images / on-site
authoring UI.

`quiz-section-plan.md` stays at the root for now since v2/v3
increments are still active planning; full file moves to
`docs/audits/quiz/` once v3 ships per the doc's own self-direction.

---

### Pump control — Education page *(shipped 2026-05-15)*
*One question: how does the BMS decide what speed reference to send to
a variable-flow pump?*

Lands the third-leg of the variable-flow story (load piping → VFDs →
pump control). The question framing held through drafting; widened
slightly from the friction-file's narrowest version to also touch
constant-speed pumping (one section), pump-curve / system-curve
theory (Widget 1), affinity laws (cross-ref vfds cube law), DP-based
control + sensor placement (pipe-flow diagram), DP setpoint reset
(Widget 2), and a brief lead/lag note that forward-points to a
future sequencing page. User chose the broader "How to control a
pump" framing during scoping; the page held to a single question
because the broader frame still answers *one* question (how),
just with a longer chain of sub-answers.

In scope (sections shipped):
- *Constant-speed pumps — the simplest case* — the foil for the rest
  of the page; DPBV cross-link to load-piping
- *Pump curve and system curve — the operating point* — explainer
  prose + Widget 1 (interactive pump/system curve chart with
  operating-point dot, two sliders, fan icon)
- *How a VFD moves the operating point — affinity laws* —
  cube-law cross-link to vfds page
- *DP-based control — sensor at the far end of the loop* — local DP
  vs. remote DP tradeoff + a pipe-flow diagram (third Education page
  with pipe-flow diagrams; this is the trigger that finally landed
  the `.edu-svg` consolidation in styles.css — see consolidation
  entry below)
- *DP setpoint reset — squeezing the last bit* — most-open-valve
  reset prose + Widget 2 (mode toggle, demand slider, valve cells,
  readouts, deadhead anecdote at demand=0)
- *Lead/lag and parallel pumps — a note* — short forward-link to
  `[future: sequencing.html]`; user explicitly said "sequencing
  should get a lot of attention" so this page deliberately stays
  shallow on it
- *Tying it together* — closing payoff to load-piping + VFDs

Out of scope (forward links, not content):
- Pump staging / lead-lag rotation / end-of-curve protection /
  bumpless transitions — [future: sequencing.html]
- Hydronic balancing — [future: balancing.html] (reachable from
  load-piping)
- Open-loop systems with static head (cooling towers, sumps) —
  brief mention only; full treatment belongs to a different page
- Specific pump-controller manufacturer parameter trees — keeps the
  cross-manufacturer pattern, same scope discipline as the VFDs page

**Two interactive widgets — Education-page idiom holds.** Per the
"both" answer at scoping. Widget 1 (operating-point chart) introduces
the concept; Widget 2 (DP-reset simulation) is the practitioner pay-
off. Two widgets on one page is a lot, but PID Basics ships three
mini-sims, so there's precedent. The widgets share the visual
vocabulary established by the d3 injection-pump widget on
hydronic-loops and the run/speed widget on vfds: recessed
`--surface-3` background, mono section labels, blue readouts, fan
icon for "the drive is energising something." Class prefix `pc-w-`
inline on the page, mirroring the `vfd-w-` naming used on vfds.

**Widget 1 — operating-point chart.** SVG-based chart (not canvas
this time — the chart is small, the polylines are short, and SVG
layered cleanly with the static axes/legend without a per-frame
redraw cost). Sliders for pump speed (0–60 Hz, matching the VFDs
widget) and valve openness (10–100%). Math is intentionally simple
and recorded inline in the page script: pump curve as a downward
parabola scaled by speed-ratio² per affinity laws, system curve
as a parabola through origin steepening as valves close, operating
point at the analytic intersection. Reference pump curve at 60 Hz
stays drawn as a faded dashed line so the speed scaling reads
visually. Numbers chosen so the design point lands at exactly
(100 GPM, 50 ft) — easy to verify in the readouts and easy to
sanity-check against intuition.

**Widget 2 — DP setpoint reset.** Demand slider drives flow; mode
toggle picks Fixed DP vs. Reset DP; five identical valve cells
visualize valve openness; readouts show DP setpoint, pump Hz, flow,
power-vs-full. Uniform-load model — all five valves at the same
opening — simplifies the reset story (in real systems with
non-uniform demand the reset advantage is even more dramatic).
Approximate physics: pipe-friction coefficient sized so design
operating point matches Widget 1, DP setpoint either fixed at 25 ft
or walked linearly down to a 5 ft floor in reset mode, pump Hz
inverted from the pump curve and clamped to a 10 Hz minimum (real
VFD parameter). Recorded inline in the script for the next reader.

**Deadhead anecdote — extreme-state reward.** Same pattern as the d3
0 Hz failure-state and the vfds widget's classic-mistake reveal. The
trigger here is demand = 0% (slider all the way down) — all valves
closed, nowhere for water to go. The reveal callout is a short prose
description of the deadhead failure mode followed by the user's
own war story (deadheaded a pump on a loop with all 2-way valves,
caught it because they were standing in the mechanical room and the
noise was unmistakable). Frames the rest of the page's content as
"this control story is what protects against this." Same pinned-
once-shown semantic as the other anecdotes — yanking it back on the
next slider tweak would be petty.

**`.edu-svg` consolidation — finally landed.** The load-piping
friction entry called out the *next* Education page with pipe-flow
diagrams as the trigger to fold `.hd-svg` + `.lp-svg` into a shared
`.edu-svg` rule in `styles.css`. The vfds page deferred the trigger
because its diagrams were structurally different (no `data-flow`,
no dashed-return override). Pump-control's Section 5 has a pipe-
flow diagram, so the trigger fired:

- New `.edu-svg` + `.edu-legend` block in `styles.css`, plus the
  `@media screen { svg.flow-active [data-flow="return"] }` override
  that previously lived inline on hydronic-loops and load-piping.
- `hydronic-loops.html` and `load-piping.html` retrofitted: inline
  style blocks shrunk to a one-line "moved to styles.css" comment
  plus the page-specific d3-widget styles for hydronic-loops; class
  attributes swapped from `hd-svg` / `hd-legend` and
  `lp-svg` / `lp-legend` to `edu-svg` / `edu-legend`.
- Smoke-test selectors updated to match (`svg.hd-svg` /
  `svg.lp-svg` → `svg.edu-svg`).
- Pump-control uses `.edu-svg` from day one for its Section 5
  pipe-flow diagram. Widget-internal SVG (the pump-curve chart in
  Widget 1, the fan icons) intentionally stay outside `.edu-svg` —
  the rule is for pipe-flow schematics specifically, not for any
  SVG on an Education page.

The block-diagram-style `.vfd-svg` on vfds.html stays separate, per
the rule recorded in the vfds friction entry (different shape:
no supply/return, no `data-flow`, no dashed-return override). The
`.edu-svg` family is for pipe-flow diagrams; `.vfd-svg` is for the
VFDs page's structural diagrams; future page-specific diagram
classes can follow either precedent depending on what they're
drawing.

**Forward-link debts this page incurred:**
- `equipment-staging.html` — the lead/lag note. **Paid 2026-05-21.**
  The note's plain-prose "a dedicated sequencing lesson will land
  here when it ships" is now a live link to the equipment-staging
  page (staging up/down + lead/lag rotation). The user's flag that
  sequencing should get real attention held — staging got a full
  page with two widgets, and this page stayed deliberately shallow
  on it so it didn't pre-cover ground.
- `[future: sequencing.html]` (the closing) — **partly paid.** The
  closing's staging mention now links to equipment-staging.html;
  the rest of the broader sequence layer — setpoint reset against
  outside-air temperature, mode transitions, morning warm-up —
  stays plain-prose forward-link for future pages.
- `[future: balancing.html]` — not directly forward-linked from
  pump-control (the load-piping page already carries the link),
  but worth noting that pump-control's "DP setpoint reset assumes
  uniform demand" caveat would tie back to the balancing page if
  both ship.

**Forward-link payoffs landed:**
- `vfds.html` closing was previously plain prose ("A pump-control
  lesson will land here when it ships. Forward-link, breadcrumb
  dropped."). Updated to an active anchor pointing at the new page.
- `load-piping.html` two-way section's reference to the variable-
  speed pump still anchors at vfds.html (which then forward-links
  to pump-control); intentionally not retargeted, since load-
  piping's hook is "what pump goes here?" → vfds (the equipment),
  and pump-control is the next-step. The two-page chain reads
  correctly.

### Equipment staging — Education page *(shipped 2026-05-21)*
*One question: when a plant has several identical units, how does the
BMS decide how many to run, and which ones?*

The first **sequencing** page. `sequencing.html` had been a `[future:]`
target since pump-control shipped; the friction file flagged the topic
as deliberately broad (staging, lead/lag rotation, end-of-curve
protection, bumpless mode changes, OAT/setpoint reset, morning warm-up),
and the one-question-per-page rule won't carry all of that. Per the
scope rule's item 4, a *function* like staging is its own page — so
this page is scoped to staging + lead/lag only, and named
`equipment-staging.html` rather than claiming the broad
`sequencing.html` slug. The remaining sequencing topics keep their
`[future:]` markers for later pages.

Worked example: parallel **pumps** (chosen with the user during
scoping), continuing the variable-flow story (load-piping → vfds →
pump-control → balancing) and paying pump-control's lead/lag
forward-link debt directly. One sentence notes the logic is identical
for boilers and chillers.

In scope (sections shipped):
- *Why a plant runs several identical units* — the foil: the turndown
  limits of one pump, N+1 redundancy. Static parallel-pump schematic.
- *Staging up and down — how many to run* — the demand signal, the
  stage-up / stage-down thresholds, the deadband between them
  (anti-hunting), stage-delay timers, minimum-stage-time /
  anti-short-cycle. Widget 1.
- *Lead/lag and rotation — which ones* — lead/lag designation,
  runtime-equalized rotation, standby exercise, failure promotion.
  Widget 2.
- *Tying it together* — pays the pump-control debt; forward-points (as
  plain prose) to the still-future reset / modes / warm-up pages.

Out of scope (forward links, not content):
- Setpoint / OAT reset, mode transitions, optimal / morning warm-up
  start, bumpless transitions — [future: sequencing page(s)]
- End-of-curve protection / deadhead — covered on pump-control;
  linked back, not re-taught
- Manufacturer-specific staging logic — keeps the cross-manufacturer
  discipline of the vfds / pump-control pages
- Chiller / boiler plant-optimization specifics — different systems,
  brief mention only

**Two interactive widgets** (per the user's scoping choice — "two
smaller widgets" over one combined sim). Class prefix `es-` inline on
the page; no styles.css edits — widget internals are page-local, and
the step/reset buttons reuse the shared `.copy-btn`.
- *Widget 1 — staging simulator.* A demand slider drives three pumps;
  stage-up near 90% of online capacity, stage-down with hysteresis
  well below. A stage-delay countdown gates each change; a
  minimum-stage-time lock after a change blocks the next — drag the
  slider fast and the sequence shows a "stage change held" state. The
  100 ms timing loop uses lazy start/stop (codebase-issues #1) so it
  doesn't spin idle.
- *Widget 2 — runtime equalization.* Step the plant forward a week at
  a time; Fixed-lead pins the lead to P1, Runtime-equalized hands it
  to the lowest-hour pump. Runtime bars + spread readout. The
  discovery-reward callout reveals after 12 fixed-lead weeks (the
  worn-lead-pump consequence) and stays pinned. Written as generic
  prose, not a first-person war story — the user can swap in a
  personal anecdote later if they have one.

The intro schematic is an animated pipe-flow diagram — `.edu-svg` +
`flow-engine.js` + `data-flow` annotations, same idiom as the
load-piping / pump-control diagrams (supply solid, return dashed,
particles walking; suction header + from-system drop walk reversed).
The two widgets are the visual capstones of their own sections.

**Forward-link payoffs landed:**
- pump-control's lead/lag note — the plain-prose "a dedicated
  sequencing lesson will land here" is now a live link to this page.
- pump-control's closing — the staging mention now links here; the
  broader sequence-layer breadcrumb (reset, modes, warm-up) stays
  plain prose.

### VFDs — Education page *(shipped 2026-05-14)*
*One question: what is a VFD, and what does a controls tech need to
know about it?*

The original planning entry framed this as a multi-week project
covering both the explainer and a mock-keypad tool. During scoping
the decision was to keep the page broad (the question is "what is a
VFD" not just "the run/speed gotcha") and accept a long page — same
PID-Basics-style structure of gentle ramp into practitioner depth.
The single-question rule still applied; the in-scope list runs longer
than four items because the foundational sections (block diagram,
cube law) and the practitioner sections (parameter groups, network,
fault codes, bypass) each pay off the same question.

In scope (sections delivered):
- *What a VFD Is* — static block diagram (AC IN → Rectifier → DC Bus
  → Inverter → AC OUT variable), labeled boxes only, no waveforms
  (trusts prose to carry "what variable frequency means")
- *Why Drives Are Everywhere — the Cube Law* — prose + a
  `.callout`-style numbers callout showing 80/70/50/30% speed →
  power scaling
- *Run Command vs. Speed Reference — the centerpiece* — explainer
  prose + the page's interactive widget (see below)
- *The Parameter Groups Every Drive Has* — six `.callout` cards
  (motor data, ramps, references/sources, run/stop sources, I/O,
  faults) — one card per group, ALL-CAPS sub-titles, worked
  per-group commentary
- *Network Integration* — small `.ref-table` comparing Modbus RTU /
  BACnet MS/TP / BACnet/IP plus an inline list of the four points a
  BMS reads or writes (run cmd, speed ref, run status, actual Hz);
  inline cross-links to the BACnet/IP converter and Modbus register
  viewer
- *Fault Codes — the Conceptual Categories* — small `.ref-table`
  with six categories (overcurrent, overvoltage, undervoltage,
  ground fault, motor overload, drive overtemp), each with "what's
  happening" and "usual cause"
- *Bypass Arrangements* — short prose + a static SVG of the
  three-position selector topology (LINE IN → selector → either
  through-DRIVE or direct → MOTOR)
- *Tying It Back to Load Piping* — closing payoff section paying
  off the forward-link from `load-piping.html#two-way`; introduces
  the natural follow-up on pump-control as `[future:
  pump-control.html]`

Out of scope (forward links, not content):
- The keypad-and-parameter-tree story — own tool, see Mock VFD
  interface entry below
- Pump-control / DP-setpoint reset / pump curves — [future:
  pump-control.html]
- Specific manufacturer parameter numbers / keypad menu trees — the
  site's angle is the cross-manufacturer pattern; the friction file
  resists this as scope creep
- V/Hz curves, vector control, slip compensation — electrical /
  motor-engineering side, not the controls surface

**Tie-back to load piping landed correctly.** The original forward-
link from `load-piping.html:155` was a `<a href="/education/
vfds.html">variable-speed pump</a>` reference; the new page's
closing section pays it off explicitly with the inverse framing
("on load piping we set up the variable-flow picture from the load
side ... this page is the pump side of that picture"). User chose
"both opening hook + closing payoff" during scoping; the opening
hero paragraph anchors the page in load-piping's setup and the
closing section ties off the loop.

**Run/speed source widget — interactive centerpiece.** A three-by-
three matrix (three source values × three command surfaces). The
user picks Run Source and Speed Source from dropdowns, then attempts
a run from each of the three command surfaces (keypad RUN/STOP
buttons, terminal DI Open/Closed toggle, network Send BACnet
RUN/STOP). The status panel narrates which command was accepted and
which was ignored. Same idiom as the PID-Basics mini-sims and the
hydronic-loops twin-T injection-pump widget — interactive doesn't
only live in Tools.

**Fan animation — visual handle for "the drive is energising
something."** Five-blade SVG fan in the widget status panel,
clockwise rotation. Rate is proportional to the active speed
reference (60 Hz ⇒ ~1 rev/sec); slider moves while running and the
blades visibly speed up or slow down. Blades brighten from
`--blue-cool` to `--blue` when the drive is running, matching the
"active = blue, dim = blue-cool" palette used elsewhere. Honours
`prefers-reduced-motion` (engine short-circuits; colour change
still communicates state). Driven by `setInterval(40 ms)` writing
the rotate transform attribute on the parent `<g>` — CSS-driven
animation would have been simpler but changing animation-duration
mid-animation makes the angle jump on every slider tick. Visual
speed scale picked for *readability*, not realism — a real fan at
60 Hz is invisibly fast; this animation tops out at 1 rev/sec
because the goal is "you can see it spinning," not "this is
accurate." Chosen as cube-law equipment to tie the visual to the
energy-savings story higher up the page.

**Hidden anecdote — the "classic mistake" reveal.** Same Easter-egg
pattern as the d3 widget's failure-state reveal on hydronic-loops.
Trigger: configure run-source = TERMINALS and speed-source =
NETWORK, then press "Send BACnet RUN" with the DI still open. The
state stays STOPPED (correct behavior) and a `.vfd-w-anecdote`
callout appears below with a war-story paragraph about losing an
afternoon to exactly this configuration. Once revealed in a session
it stays pinned — yanking it back on the next slider tweak would
be petty.

**Inputs and styling vocabulary.** Three source-select rows + a
single speed-reference slider (labeled per the active speed source;
single value, source-name follows the dropdown). Three command-
surface rows below for keypad / terminals / network. Same `--surface
-3` recessed background as the d3 widget. Status panel + reserved
anecdote space at the bottom. CSS class prefix `vfd-w-` inline on
the page.

**Diagram CSS decision — defer the `.edu-svg` consolidation.** The
load-piping friction entry flagged the third Education page with
diagrams as the trigger to fold `.hd-svg` + `.lp-svg` into a shared
`.edu-svg` rule. The VFDs page does have diagrams but they are
*structurally different* — no pipes, no `data-flow`, no dashed-
return override, no particle engine. A minimal `.vfd-svg` class
inlined on the page does the job; folding it in with the pipe-
diagram rules would import irrelevant baggage. The consolidation
trigger now belongs to the *next pipe-flow Education page*, not
just the next page with diagrams. Recorded so the rule reads
correctly when someone next reaches for it.

**Forward-link debts this page incurred:**
- `[future: pump-control.html]` — referenced in the closing tie-
  back as the natural follow-up for "how the BMS decides what speed
  reference to send." The pump-control page, when it ships, should
  tie back to VFDs for the parameter-surface context.
- `/simulators/vfd-mock.html` — explicit CTA at the end of the page,
  paid off by the Mock VFD interface entry below.

### Mock VFD interface — tool *(shipped 2026-05-15)*
*One question: what does it feel like to navigate a drive's
parameter tree from the keypad, and what gets ignored when the
source parameters don't agree?*

The friction-file scope discipline ("~10–15 parameters in 3–4
groups, generic interface, minimal motor response, no faults in
v1") held. Final shape: 13 parameters in 4 groups, generic
keypad UI, linear-ramp motor model.

**Layout — two-column on desktop, stacks on mobile.** Keypad +
display on the left, motor response readouts + external inputs
panel on the right. Parameter reference table sits below the
simulator grid. Custom layout, not the `.tool-body-3col` Input/
Output/Reference pattern — same precedent as the PID tuner page,
which also keeps its own stacked layout for its simulator body.
The 3-col pattern doesn't fit a keypad-driven tool any better
than it fit a step-response simulator.

**Display — hybrid LCD: light recessed panel with fixed 20×4
character grid.** Site-on-brand palette (`--surface-3` recessed
background, `--text-bright` mono text, hairline `--border`), but
constrained to exactly 20 mono-character columns × 4 lines via a
`width: 20ch` inner div and `white-space: pre`. The fixed grid
forces drive-style brevity — "RATED VOLT" not "Rated voltage,"
"SRC=TERMS" not "ignored because the run source parameter is set
to TERMINALS." Same affordance a real drive's hardware LCD gives
you. Dark-LCD aesthetic was offered but the on-brand recessed
panel won the readability tradeoff while still feeling drive-y
through the grid constraint.

**Keypad — 7 buttons:** ▲ UP, ▼ DOWN, ↵ ENT, × ESC, ▶ RUN
(styled in `--blue`), ■ STOP, ⇄ L/R (spans two columns to
balance the 4-wide grid). Flat site-style chrome on the buttons
themselves — the drive-keypad feel lives in the LCD grid and the
layout, not in mimicking dark plastic. Real drives' STOP keys are
red; the site's `--red` is reserved for fault/alarm state, so
STOP stays on the neutral text colour. Mouse-clickable only;
keyboard shortcuts would be nice but aren't in v1.

**Parameter tree — 13 params × 4 groups:**
- *Motor Data*: M01 Rated FLA, M02 Rated voltage, M03 Rated
  frequency, M04 Rated speed (RPM)
- *Ramps*: R01 Accel time, R02 Decel time
- *Sources*: S01 Run command source (KEYPAD/TERMINALS/NETWORK),
  S02 Speed reference source, S03 Minimum frequency, S04 Maximum
  frequency
- *I/O*: I01 Keypad speed setpoint, I02 Preset speed 1 (decorative
  — exists for tree-navigation realism, not wired into the
  simulation), I03 DI1 function

Each parameter has a short `lcd` ALL-CAPS name (≤11 chars to fit
the "EDIT PNN XYZ" header) and a long `name` for the reference
table. Numerics carry `{ value, unit, step, min, max }`; enums
carry `{ value: index, options: [labels] }`.

**Motor model — linear ramp using R01/R02.** No V/Hz curve, no
slip, no current limit. `state.actualHz` moves toward `target` at
`rated_freq / accel_time` Hz/s when accelerating and `rated_freq /
decel_time` Hz/s when decelerating. Tick every 50 ms. The friction
file scope said "just enough to make accel/decel feel like they do
something"; this matches that exactly. Resisted the temptation to
add overcurrent, regen-brake, or torque limits.

**LOCAL/REMOTE — universal override semantic.** LOCAL mode forces
the drive to ignore both source parameters (S01 and S02) and run
from the keypad: RUN starts it, STOP stops it, speed reference
comes from I01. REMOTE is the default and is what the rest of the
parameter tree actually configures. Pressing L/R drops both run
latches (keypad and network) so the user doesn't get confused
about "why is it still running?" after the override changes.

**RUN/STOP/L-R always return to HOME.** A small UX fix discovered
during smoke-testing: if the user pressed RUN while navigating a
parameter menu, the IGNORED-flash overwrote the L/R indicator in
the menu header. Cleaner fix: pressing an operate key (RUN, STOP,
L/R) returns the navigation to HOME mode, so the flash lands on
line 4 of the home screen where the user expects "what just
happened" feedback. Real drives behave this way too.

**Keypad STOP can't reach a hardwired DI.** Pressing keypad STOP
clears the keypad-run and network-run latches but does not change
the terminal DI state. If the drive is running because S01 =
TERMINALS and the DI is closed, keypad STOP shows the flash
"STOP IGN: DI HW" — you can't open a hardwired contact from the
keypad. A small but real teaching point preserved in the model.

**Preset chips — same idiom as the d3 widget and the VFDs
Education-page widget.** Four `Try this:` links above the
simulator pre-set the source parameters and LOCAL state to a
named configuration: factory defaults (run=TERMINALS,
speed=NETWORK, REMOTE), keypad commissioning (all KEYPAD, LOCAL),
BAS auto (all NETWORK, REMOTE), the classic mistake (run=TERMS,
speed=NETWORK, REMOTE).

**External inputs panel — contextual visibility.** All three
external surfaces are always present (terminal DI toggle, network
RUN/STOP buttons, external speed slider), but the rows fade to
35% opacity when the configured source parameters aren't
listening to them. They remain operable — the external world is
still asserting them — they're just not what the drive is acting
on. Matches what a real installation looks like (you can keep
toggling the DI even when the drive isn't using it; nothing
unplugs).

**Cube-law and pump-control content stays in the Education page,
not here.** This tool is a parameter-tree navigation trainer.
Adding cube-law demos or DP-setpoint reset sequences would push
it back toward a drive-engineering trainer, which the friction
file explicitly rejects.

**Resist scope creep — validated.** v1 deliberately omitted:
- Fault simulation (friction-file scope said v1 = no faults).
- V/Hz curves, slip comp, current limits.
- Multiple DIs, AIs, AO/DO assignment editing (one DI, one
  external speed input).
- Drive auto-tune.
- Multi-protocol network simulation (one "network" button, not
  separate BACnet vs. Modbus surfaces).
- Keyboard shortcuts for the keypad (clickable buttons only).
- Persistence (state resets on reload).

Any of these can be revisited if the tool gets used and one
specifically comes up as friction. Until then the friction-file
"feels like a drive keypad, not replaces one" rule holds.

**Future synergy** (preserved from the original planning entry).
The PID tuner already simulates a control loop; this tool
simulates a VFD. Eventually a combined demo where the PID loop's
output drives the VFD's frequency reference (pressure control
sequence: PID controls duct static, output → VFD frequency ref →
fan speed) would tie a lot together. Not v1, not v2; the two
engines staying standalone keeps that door open. If it happens,
the integration point is `setExternalSpeedHz()` on the VFD mock
and a new "external write" sink on the PID tuner.


### Refrigerant cycle — Education section, possibly with calculator *(parked 2026-05-29 — revisit when the topic is next picked up)*

**Parked 2026-05-29.** The user is happy with where the refrigerant
section sits. Shipped so far: the P-T / superheat tool
(`/tools/refrigerant-pt.html`) and three Education pages
(`refrigerant-cycle-basics.html`, `superheat-subcooling.html`,
`metering-devices-txv-eev.html`). Everything still open below — the
optional "Refrigerants and their pressures" page, the parked data
follow-ups (R-32 entry, bonus blends R-448A / R-507A / R-422D /
R-407F), and the possible refrigerant-cycle animation sharing
saturation math — is parked until the topic is revisited. Detail
preserved below.

The refrigerant side is where everyone in HVAC has a fuzzy grasp and
few have a clear one — especially controls people, who tend to treat
it as someone else's problem until they're staring at a low-suction
alarm and don't know whether to trust the sensor. The vapor-compression
cycle isn't actually that hard; it's just that nobody walks you through
it end-to-end with the controls-relevant pieces emphasized. I messed
with the TXV on my window unit thinking it was a RaT sensor — the
suction-line bulb plus capillary tube does look the part if you've
never seen one explained — and I know controls guys decades in who'd
make the same mistake. That's the credibility hook for this content:
name the things people actually trip on, including the look-alikes.

**Rough Education scope** (multiple pages, not one mega-page):

- **Refrigerant cycle basics** — the four components (compressor,
  condenser, metering device, evaporator), high side vs. low side,
  what each does and why. The pressure-temperature relationship for
  saturated refrigerant is the load-bearing concept; it's what makes
  every other measurement meaningful.
- **Superheat and subcooling** — the two measurements that prove a
  cycle is running right. What they are (vapor warmer than its
  saturation temp, liquid cooler than its saturation temp), what
  abnormal readings mean (low superheat → liquid floodback risk,
  high superheat → starved evaporator, low subcooling → undercharge
  or restriction, etc.), and how the BMS-visible sensors fit:
  suction temp + suction pressure → superheat; liquid temp + liquid
  pressure → subcooling.
- **TXVs vs. EEVs — the metering devices.** TXV mechanical loop: bulb
  senses suction temp, diaphragm balances bulb pressure vs. evaporator
  pressure vs. spring, modulates flow to hold superheat. EEV: same
  job, stepper-driven, commanded by the unit controller or BMS — which
  is the surface controls people actually interact with. The
  TXV-as-RaT-sensor anecdote lives here.
- Optional later: **refrigerants and their pressures** — common ones
  (R-410A on its way out, R-32 and R-454B as the A2L successors,
  R-134a still common in centrifugal chillers), glide on blends, why
  R-22 retrofits get weird.

**Tool potential — P-T / superheat calculator.** The most-asked-for
refrigerant calculation in the field: given refrigerant + pressure,
get saturation temperature; given pressure + measured line temp, get
superheat or subcooling. Fits the calculator-tool pattern (3-col,
single purpose). Refrigerant select + high/low side + temperature
input + result. Detail to get right: glide on non-azeotropic blends.
R-410A is near-azeotropic so single-temp is fine; R-407C has ~10°F
glide and needs bubble vs. dew handled correctly, or the calculator
will quietly be a few degrees wrong on the systems where being right
matters most. Worth shipping later than ship-with-bugs — this is a
tool whose job is to be more correct than a pocket P-T card, not less.

**P-T / superheat tool — shipped 2026-05-21.** Ships at
`/tools/refrigerant-pt.html` as a two-tab `.tool-body-2col` tool
(page-id prefix `rf-`), the calculator half of this idea; the
Education pages above stay future work (no forward-links, since the
target pages don't exist yet).

Decisions settled during scoping:
- *Two tabs* — P-T (saturation) with a Pressure ↔ Temperature
  "look up by" toggle, and Superheat / Subcooling with a Suction /
  Liquid line toggle. Suction → superheat off the dew point; liquid
  → subcooling off the bubble point — the same procedure printed on
  a manufacturer P-T chart.
- *Gauge pressure (psig / kPa-gauge)* — matches manifold gauges and
  the source charts. Canonical internal unit is psig, not psia: the
  source charts are psig and the input is psig, so no absolute-
  pressure conversion is needed. The site Units `pressure` quantity
  is a pure scale (1 psi = 6.89476 kPa) so it converts psig ↔
  kPa-gauge unchanged; only the suffix label is overridden ('psig' /
  'kPa', not `U.suffix.pressure`'s 'psia' / 'kPa').
- *Always show bubble + dew* on the P-T tab, with the glide between
  them — glide is visible by default, not hidden until a blend is
  picked. Pure refrigerants show the two equal.
- *Number + caveated guidance* on the SH/SC verdict — the pill names
  the likely fault direction (low superheat → floodback, high →
  starved evaporator, etc.) but states plainly that the target is
  system- and metering-device-specific.

Data — `html/scripts/refrigerant-data.js`, a transcribed-table data
file in the `thermistor-data.js` mould (one global,
`REFRIGERANT_TYPES`; raw tables normalized to bubble/dew curves in a
load-time IIFE). v1 covers six refrigerants: R-410A, R-22, R-134a,
R-407C, R-404A, R-454B. **The data is transcribed, not modeled** —
every row is keyed off a published manufacturer P-T chart (Honeywell
Genetron/Solstice for five of them; an iGas chart for R-410A). The
remaining verification step is a row-by-row proofread against the
source PDFs; the smoke suite spot-checks a transcribed R-407C row
(100 psig → 51.1 / 61.6 °F) and the R-410A interpolation.

Out of scope / parked:
- *R-32* — dropped from v1; no good full-range P-T chart sourced yet.
  Slots in as one more data entry when a chart turns up.
- *Bonus refrigerants* — the Honeywell chart also covers R-448A,
  R-507A, R-422D, R-407F and older blends; not added, but each is a
  cheap follow-up data entry.
- *Sourcing lesson* — manufacturer P-T PDFs don't parse via WebFetch
  (binary streams) and chart-site HTML 403s; a *charging* chart
  (subcooling grid) is not a P-T chart and can't substitute. The
  user supplied the source PDFs directly. The PDFs are authoring
  inputs only — deleted before the PR, never committed.

**Open questions for the design chat when this gets closer:**
- The P-T calculator and a future refrigerant-cycle animation might
  share saturation-curve / state-point math. Or not — wait until the
  second piece exists before deciding, same logic as the engines
  question.

### PID tuner — explicit loop speed numbers *(shipped 2026-05-16)*
The original ask was to put concrete time-constant numbers somewhere
the user encounters them *before* picking a Process Type. Done in two
places that now share a single source of truth:

1. **Dropdown options carry τ ranges inline** — `Fast (τ ~5–15 s) —
   e.g. duct static pressure`, `Medium (τ ~30 s – 2 min) — e.g.
   discharge air temp`, `Slow (τ ~2–10 min) — e.g. space temperature`.
   The calibration shows up at the moment of selection, not 800 px
   down the page in the Reference column.
2. **Loop Speed Reference table at the bottom of the Reference column**
   (already in place) shows the same τ ranges + dead-time + fuller
   HVAC examples + the dead-time/τ controllability ratio note.

Numbers match between the two surfaces — if the table is ever
retuned, the dropdown labels should follow. Kept the brief
selector labels short enough that the τ range and one canonical
HVAC example still fit on a single line at the rendered widths.

### BACnet/IP hex ↔ dotted-decimal converter *(shipped)*
EBO displays BACnet/IP device addresses in hex (e.g. `C0A80164`)
instead of the IPv4 form (`192.168.1.100`), so a hex-to-IP converter
was needed every time. Shipped at `/tools/bacnet-ip-converter.html`:
converts both directions, paste hex → dotted decimal and vice versa.
Also handles the optional 2-byte UDP port EBO often appends to the
hex string (default `BAC0` = 47808). Sits under the BACnet category
alongside the BACnet object reference tool (shipped — see below).

### BACnet object reference *(shipped)*
The companion the BACnet/IP converter pointed at. A controller, a
packet capture, or a workstation hands you numbers where you want
names — object type 1, property 85, units enum 62. Three tabbed
`.ref-table-dense` tables (the `Object_Type`, `Property_Identifier`,
and a common slice of the `Units` enumerations) sit behind one filter
box that hides non-matching rows across **all three at once** and
writes a live match count into each tab — so a search for `85` from
the Object Types tab still points you at `Property IDs · 1`. Scope:
object types 0–30 plus 54/55/56 (lighting + network-port), with a note
that 31–53 cover access control and the value-object family; the
property list is the common read/override slice; the units tab is the
HVAC slice of the ~200-value enumeration. The data carries
`// user to verify` placeholder markers and a visible caveat, since
enum codes shift by edition and a device may expose vendor extensions.
Sits under Protocols at `/tools/bacnet-objects.html`; cross-linked from
both BACnet lessons. First of the v3.1 tools batch closing the
protocols/hydronics tooling gap.

### Valve Cv sizing *(shipped)*
Hydronics had five education pages and zero tools — the worst
content-to-tooling gap on the site. This is the cluster's first tool.
Two tabs on the property-sheet shell: a `Cv = Q√(SG/ΔP)` solver with a
"solve for" select (Cv / flow / ΔP, hiding whichever quantity is the
output — the signal-scaling custom-row idiom) and a valve-authority
check (`β = ΔP_valve,open ÷ total`) with an ok / marginal / poor
verdict pill mirroring the economizer feasibility line. Kept US-native
(Cv, GPM, psi — Cv's defining units) rather than wiring the global
US/Metric toggle, because the coefficient itself changes name and
meaning across unit systems (Cv vs Kv); instead it carries a permanent
`Kv ≈ 0.865 · Cv` readout. The authority tab is unit-agnostic (a
ratio). Introduces a new **Hydronics** tools chip at
`/tools/valve-cv.html`; cross-linked from Balancing + Load Piping.
Future refinement: metric flow/pressure inputs alongside the Kv
readout, if a metric user asks.

### Pump & fan affinity laws *(shipped)*
The second Hydronics-chip tool, pairing with Pump Control + VFDs.
Scales one operating point (Q, H, P — each optional) by a ratio: by
speed (the VFD case, exact) or by impeller diameter (trim, approximate
for modest cuts of the same casing). Flow ∝ ratio, head ∝ ratio²,
power ∝ ratio³ — the cube on power is the headline, the energy case for
variable-speed pumping. Like valve authority it's pure ratios, so the
tool is unit-agnostic: speeds/diameters take any consistent unit and
Q/H/P pass through in whatever the visitor enters (head ft for pumps,
static pressure in. w.c. for fans, power bhp or kW). One shared calc
factory drives both tabs; the only difference is the ratio's source
field. Tagged "Pumps & Fans" (the tag/category split is already the
norm — Analog I/O vs signals) while sitting under the Hydronics chip.
At `/tools/affinity-laws.html`.

### Thermistor calculator *(both modes shipped + curves verified)*
Two modes, tabs à la Signal Scaling. Both are shipped and the curves
are datasheet-verified.

- **Lookup mode** *(shipped).* Pick a thermistor type, enter either
  temp or resistance, get the other. Types live in
  `html/scripts/thermistor-data.js`: 10K Type II, 10K Type III, 10K
  + 8.7K (Johnson), 10K Type 5 with 11K shunt (Schneider/EBO
  convention — Type 3 linearized with a shunt resistor, common in
  older TAC/Andover gear), 20K, 3K, 1K Balco (nickel-iron alloy,
  RTD-style — still appears in retrofits on older Honeywell/Johnson
  jobs), plus Pt100 / Pt1000 RTDs (not strictly thermistors but used
  the same way on the troubleshooting side, labeled "RTD" in the
  card tag). Page shows the full R/T table for the selected type
  alongside the single answer — techs often want to scan the curve,
  not just one value.
- **Identify mode** *(shipped).* A second tab. The user enters
  measured (temp, resistance) pairs from an unknown sensor — three
  blank rows by default, add/remove as needed, two filled minimum —
  and the tool ranks every standard type by fit. Each type carries
  two error figures: an equivalent-temperature error (the ranking
  key — push the measured resistance through the type's curve,
  compare the implied temperature to the measured one, RMS across
  points) and a resistance percent error shown alongside. A type
  whose curve can't span every entered point is listed but flagged
  "out of range" rather than scored. The winner gets a confidence
  verdict (strong / likely / ambiguous / weak — heuristic
  thresholds on the °F error and the gap to the runner-up) plus a
  per-point fit breakdown. Each ranked row is a button that opens
  that type in Lookup mode. An accuracy disclaimer under the
  breakdown covers sensor tolerance, meter noise, and the fact that
  two close points often can't separate similar curves. Open
  follow-up: the dropped pieces from the original sketch were a
  per-input out-of-range marker (a complete row outside −40–250 °F
  is silently counted in the "ignored" tally instead) and a
  resistance-error column in the per-point table (the aggregate %
  lives in the ranked table; the breakdown shows the temp residual
  only).

**Implementation question — settled.** The original open question was
lookup tables vs. Steinhart-Hart coefficients. The codebase landed on
a hybrid: each type carries a small `curve:` block (β, R25, shunt for
the linearized 10K curves, R0 + temperature coefficient for the RTDs,
Callendar–Van Dusen for Pt100/Pt1000), and the displayed R/T table is
*generated* from that — single-β model for the NTC curves, linear for
Balco, IEC 60751 polynomial for the platinum RTDs, then linear
interpolation between displayed table rows for the page lookup. This
means auditing the small parameter set covers all 500+ table cells.
Trade-off documented in the data file header.

**Verification pass — done (2026-05).** The 2026-05 pass cross-checked
every type against published datasheets: BAPI 10K-2 / 10K-3 / 10K-3(11K)
output tables, US Sensor "Curve G", Sontay's Compatibility Chart,
Vector Controls' multi-curve reference, Schneider EBO's Balco chart,
the ACI BALCO datasheet, IEC 60751:2008. The biggest finding was that
the original Type III β (3976) was off by ~15 % at the cold end — the
canonical Type III curve has effective β25/85 ≈ 3693 and is the
*shallower* of the two common 10K curves, not the steeper one. Type
III dragged Type 5 (TAC) with it (shunted Type III element). Both
retuned. 1K Balco TCR was also 30 % too high; retuned to ACI's 2.2 Ω/°F.
Pt100/Pt1000 confirmed exact against the international standard. JCI
10K + 8.7K remains the one PENDING type — its canonical TE-6300
Product Bulletin URL redirects to a docs-portal landing page and no
public R/T table for the 8.7K-shunted variant has been located.
The thermistor page now carries an "About these tables" tool-card
surfacing the methodology and disclaimers to end users.

### Interactive psychrometric chart *(phase 3 shipped 2026-05-17)*
Phase 1 (v0.6) shipped the state-point calculator + draggable dot on an
altitude-adjustable ASHRAE IP-unit chart. Phase 2 (v1.3, shipped 2026-05-15)
turned the single-point surface into an air-handler process chain: outdoor
air + return air mix to mixed air, then a cooling coil, a heating coil,
and a humidifier walk the state toward supply air. Each stage is a labelled
node on the chart connected by a color-coded process segment; everything
downstream of the source nodes is computed from the editor's process
parameters and updates live as you type or drag.

Phase 3 (shipped 2026-05-17) added three things, in two PRs:

- **PR 1 — math extraction.** Pure psych math moved to
  `html/scripts/psychro-engine.js` with a two-tier API (ASHRAE primitives
  flat, `Psychro.solveState` / `buildState` / `computeProcess` namespaced)
  so the chip lands on a smaller page. See codebase-issues #6 for the
  resolution note.
- **PR 2 — chart-side interactions.** Three changes:
  - *Floating state-point chip.* Small monospace tooltip that follows the
    OA / RA / MA dot on hover and during drag, showing DB / WB / RH at
    current display units. Absolutely positioned over the canvas, anchored
    to `.sim-canvas-wrap` (which now carries `position: relative`).
    Edge-flipped in JS so it never leaves the wrapper. Opacity 0.88 — high
    enough to read clearly, low enough that process lines still show
    through. The full property table on the right still owns the complete
    state; the chip is the at-the-cursor glance aid.
  - *MA draggable along the OA-RA line.* The mixed-air dot now slides
    along the canvas-pixel mix line between OA and RA; the projection's
    OA-fraction parameter writes back to `ma-pct`, clamped to [0, 100].
    OA / RA still drag freely; MA's drag is constrained by the chain's
    own geometry. MA gets the same outer drag-handle ring OA and RA carry,
    so the affordance reads from the chart alone.
  - *Click-to-select on every visible node.* Clicking any rendered dot
    (OA / RA / MA / CC / HC / HUM / SA) activates that stage's pill — the
    chart and the pill row stay in sync regardless of which one the user
    drives. CC / HC / HUM / SA stay non-draggable (they're chain-derived);
    they're click-to-select only and don't get the outer ring.
- **`.psy-toggle` polish.** Dropped the static "On" text from the CC / HC
  / HUM checkboxes; replaced with a `::after { content }` rule keyed on
  `:has(input:checked)` so the label reads "Off" when unchecked, "On"
  when checked. Added `line-height: 1` to the label so the text aligns
  vertically against the checkbox glyph instead of riding above it.

The "Floating state-point chip" and "`.psy-toggle` polish" deferred items
that lived in this section below have shipped under the PR 2 summary
above; their detail blocks have been removed.

In scope (shipped):
- *AHU chain* — fixed canonical sequence `OA + RA → MA → CC → HC → HUM
  → SA`. CC / HC / HUM each carry a per-stage off-toggle so a job
  without (say) a humidifier just disables that stage and the chain
  collapses cleanly to `OA + RA → MA → CC → HC → SA`.
- *Step pills + single editor* — a horizontal pills row at the top of
  the Inputs column picks the focused stage; the editor below swaps to
  match. Same idea as Niagara's object inspector. Pills for disabled
  stages render dim. Selected pill shows the accent.
- *Hybrid editor inputs per stage* — each stage's editor takes the
  inputs that match how a tech thinks about it:
    - OA, RA — full v1 "DB + define-by {RH, WB, DP, W, h}" surface
    - MA — single % OA field (mass-weighted mix), plus live readouts
      for the resulting MA DB / W / RH so the user can sanity-check
    - CC — leaving DB + the same "define-by" dropdown
    - HC — toggle between `Leaving DB` and `ΔT rise`, single value field
    - HUM — leaving RH %, adiabatic only (constant wet-bulb)
- *Optional AHU airflow (CFM)* — when set, the per-stage table grows a
  Q (MBH) column and the process-delta block adds Q total / Q sensible
  / Q latent for each coil. Mass flow ṁ = CFM × 60 / v_inlet (lb_da/h);
  Q_sens = ṁ × (0.240 + 0.444·W_in) × ΔT. Optional by design — the
  per-lb-dry-air math reads cleanly without it.
- *Process segments on the chart, color-coded by type* — mixing in
  `--text-dim` gray, cooling/dehumidification in `--blue`, heating in
  a new `--heat` orange, adiabatic humidification in `--accent` green
  dashed. Caption under the chart names the four colors. Source nodes
  (OA, RA) carry a faint outer ring as a drag-affordance cue.
- *Node labels* — OA, RA, SA always labelled; intermediate stages
  (MA / CC / HC / HUM) only labelled when their pill is selected.
  Keeps the chart legible when all coils are on.
- *Drag scope* — OA and RA only. Everything downstream is deterministic
  from the editor. Hit-test radius 18 px; the drag preserves the
  source's current "define by" mode (so dragging a state defined by RH
  rewrites the RH input, not WB).
- *Per-stage results table on the right* — compact `.ref-table-dense`
  with one row per active stage (Leaving DB / W / RH / h), plus Q MBH
  when CFM is set. Selected row gets the `--accent-dim` highlight.
- *Selected-step detail block* — the full nine-property table from v1,
  now driven by the selected pill rather than a single static point.
  Label reads `OA — Outdoor air` / `MA — Mixed air` / etc.
- *Process-delta block* — appears under the detail block only when a
  coil/humidifier stage is selected AND on. Shows ΔDB, ΔW, Δh, SHR
  (cool only), and Q total / Q sens / Q lat when CFM is set.
- *Defaults open in summer cooling* — OA 92/76 WB, RA 75/63 WB, 20% OA,
  CC on at 55/54 WB, HC off, HUM off. The visitor sees a coloured
  process train on first paint, not an empty chart.

The chain solver lives inline in the page (one consumer; no point
factoring out a `psychro-engine.js` until a second tool needs the
math). Algorithm walks each stage in order, threading the running
`current` state and pushing successful coil/hum legs into a `stages[]`
array used by the chart and the per-stage table. Failures are localised
— if CC is on but its leaving condition is invalid, OA/RA/MA still
render and the error surfaces in the status line; everything downstream
mutes to "—".

**Design decisions (locked during pre-build consultation, in order):**
1. *Conceptual model* — AHU-style chain over "two-point + process" or
   free-form points. Mirrors how a controls engineer reads an air
   handler.
2. *Process types* — mixing, sensible heat/cool, cooling+dehum, and
   humidification (adiabatic only). Light treatment for humidification
   per "less common on commercial jobs."
3. *Input style* — hybrid per process: mixing by % OA, sensible by
   ΔT or leaving DB, cooling by leaving DB + define-by, humidification
   by leaving RH.
4. *Chain shape* — fixed canonical with per-stage off-toggles, not
   add/remove/reorder. Builder-style UI was out of scope for v1.3;
   reconsider if DOAS / makeup-air / lab-exhaust use cases come up.
5. *Editor layout* — step pills + single editor below, not a stack
   of cards. Keeps the Inputs column tidy.
6. *Airflow input* — optional CFM, primary readouts stay per-lb-dry-
   air; MBH appears when filled. Tool works either way.
7. *Drag scope* — OA + RA only. Downstream stages tweak by typing.
8. *Initial state* — worked summer cooling example, not empty.
9. *CC editor* — "Leaving DB + define-by" mirrors v1 (general,
   familiar) over fixed leaving DB/WB pair or coil ADP + bypass.
10. *HC editor* — `Leaving DB ↔ ΔT` toggle, both mental models
    covered for tiny UI cost.
11. *HUM editor* — adiabatic only with leaving RH %; steam left
    deferred.
12. *Segment colors* — per-process, with a new `--heat` orange added
    to `:root` in `styles.css`. Reusing `--red` for heating risked
    confusion with the fault/alarm semantics already established
    elsewhere on the site.
13. *Node labels* — always-on for chain endpoints (OA, RA, SA);
    selected-only for intermediates.

**Friction caught in the post-build audit:**
- *SA label vanishing.* The initial dedup logic skipped drawing SA
  entirely when SA coincided with the last upstream node, which is the
  common case (default summer cooling: SA = CC leaving; all coils off:
  SA = MA). The supply-air callout disappeared from the chart. Fixed
  by folding `/ SA` into the coincident node's label rather than
  dropping it — default now shows `SA` at the CC dot, all-off shows
  `SA` at the MA dot, and HC-on shows `HC / SA`.
- *Bypass detail label.* Clicking the CC / HC / HUM pill with the
  stage toggled off kept the detail-block label as `CC — After cooling
  coil` (etc.) while displaying the pass-through (= entering) values.
  Reads like the coil is doing something. Fixed: when a selected
  coil/humidifier is off, the detail label becomes
  `CC — bypassed (pass-through)`.
- *Default coil values assume the canonical chain.* HC's default
  leaving DB of 75 °F and HUM's default leaving RH of 50 % only make
  sense downstream of an active CC. Toggle CC off without adjusting
  HC, and the chain errors because MA (~78 °F) > HC leaving (75 °F).
  Decided to leave this as-is — the red error message is a teaching
  moment about coil-stage dependencies, and "smart defaults" that
  always pass would hide the lesson.
- *Adiabatic-humidifier segment shares colour with the saturation
  curve.* Both are `--accent` green; dashes-vs-solid is the only
  distinction. Acceptable in practice — adiabatic humidification *is*
  motion toward saturation, so the colour affinity is even thematically
  apt.

### Psychrometric chart — Cold-climate range preset *(shipped 2026-05-18)*

Triggered by the user working in a climate where outdoor air stays
below 20 °F for months. The chart was hardcoded to TDB 30–120 °F, so
sub-30 °F state points simply didn't render. Adds a two-button "Chart
range" toggle in the Air handler input column:

- **Standard** — 30–120 °F (0–50 °C), the original.
- **Cold** — −20–100 °F (−30–40 °C). Trims the top by 20 °F so the
  wider DB span doesn't squash vertically — aspect ratio reads close
  to Standard.

Preset persists across sessions in `localStorage` under
`cf_psy_range`. Same sticky-once-picked semantics as the units toggle.

**Design choice that held — binary preset over dynamic.** Three
options were considered: binary preset (Standard/Cold), three-preset
(adds a "Wide" or "chilled-water" variant), and dynamic min/max DB
inputs. Picked binary because:

- The mental model is binary at heart — "my chart" vs. "the other
  chart." Field techs pick one for where they work and leave it.
- Each preset can be hand-tuned (gridline density, wb contour set,
  label placement) — looks intentional at both zoom levels rather
  than math-derived.
- Dynamic adds real edge cases (axis re-tuning, validation of
  `max > min + something`, a user entering 50–55 producing a chart
  that's mostly empty space). High complexity for low usage.

Third preset (chilled-water 0–80 °F or similar) waits for a second
user to ask. The `setRangeBounds()` helper extends cleanly with a new
case if it earns its keep.

**Implementation — single-let swap is the whole story.** `TDB_MIN /
TDB_MAX` flipped from `const` to `let`, set from a small helper at
init and on toggle. Every existing call site (X-mapping, in-bounds
filters, curve sample ranges, drag clamp, drag inverse) reads them
dynamically — no other math changed. Tick arrays for both axes and wb
contours / labels gain a per-preset variant. RH labels stay shared
across presets. Redraw runs through the same `psyRecompute()` entry
the units toggle already uses, so no new redraw plumbing.

**Out of scope (parked):**
- *Dynamic / user-defined min/max DB* — see "Design choice."
- *Auto-detect from a setting or IP geolocate* — the user picks.
- *Per-preset W_MAX tuning* — `W_MAX` stays shared. Cold air is drier,
  so a bit of extra W headroom at the top of the cold chart reads
  correctly and reinforces the "this air can't hold much water"
  intuition.

### Psychrometrics — paired Education page *(shipped 2026-05-18)*

**The page's one question:** "What are the seven properties on a
psychrometric chart, and which combinations of them actually let a
controls engineer hold a space?"

`html/education/psychrometrics-basics.html` ships as the lesson half of
the `psychrometric-chart.html` pairing, matching the
`pid-tuner.html` ↔ `pid-basics.html` model. Page lead is the natatorium
anecdote in the user's voice (high-stakes humidity control on a real
pool job), establishing credibility before any equations show up; the
rest is the vocabulary for that fight.

**What shipped (in document order):**
- *Two properties lock the rest* — the Mollier intuition (moist air
  has 2 DOF at fixed P), with a short pairwise-source table (DB+RH,
  DB+WB, DB+DP, DB+W, DB+h — where each one comes from in the field).
- *The seven properties* — a `.callout-grid` of seven `.callout`s
  (DB, WB, DP, W, RH, h, v), each with what it physically is, which
  instrument measures it, and the controls relevance.
- *Pool-space condensation widget* — three sliders (space DB, space
  RH, coldest surface temp), live readouts for W, dew point,
  enthalpy, and the safety margin (surface − dew-point), plus a
  three-state status panel (green / orange / red) keyed off canonical
  IP margin. Reuses `humRatioFromRH`, `vapPressFromHumRatio`,
  `dewPointFromVapPress`, `enthalpy`, plus `P_STD` and `GR_PER_LB`
  from `psychro-engine.js`. Discovery-payoff anecdote fires at the
  natatorium corner of the slider space (warm DB + high RH + cold
  surface + condensation state).
- *Process families on the chart* — four short paragraphs on
  sensible heat / cooling+dehum / mixing / adiabatic humidification,
  naming what each one changes and what it leaves alone. Forward-
  links to the chart tool's interactive surface rather than re-doing
  the visualisation in prose.
- *Gotchas* — a four-callout grid: RH alone tells you nothing; dew
  point is the property that condenses; enthalpy is the right basis
  for coil capacity; specific volume is the CFM-to-mass-flow bridge.

**Cross-links wired both directions:**
- Chart tool → lesson via a small `.tool-card` callout below the main
  chart card, above the back-link.
- Lesson → chart via the `.cta-button` at the bottom and inline
  anchors in the two-properties / process-families / gotchas sections.

**Scope decisions during build:**
- Single page, not a two-page split. The friction-file scope sketch
  (properties + processes + gotchas) was three sections; scoped tight
  with one widget and one short process-families section, it fits the
  "one question per page" rule. Process families get prose only — the
  chart tool already does the visual heavy lifting, so prose-then-
  forward-link beats a redundant mini-diagram.
- Widget pick: pool / condensation guard rather than a same-RH
  comparator or a coil sensible-vs-latent split. The pool widget
  replays the lead anecdote, hammers the dew-point lesson viscerally,
  and ties the whole page to the controls problem the user actually
  fought.
- Anecdote handled in the lead (verbatim, in the user's voice). A
  smaller discovery payoff fires in the widget at the natatorium
  regime, callback rather than repeat.
- Slider canonicalisation: state stays in IP throughout; sliders
  rebuild on `unitschange` with unit-system-specific step sizes
  (1 °F / 0.5 °C; 1 % RH in both). Same pattern as
  `tools/psychrometric-chart.html`'s `buildSecondProp`.

**Out-of-scope (parked, forward-linked where the lesson touches them):**
- Air-mixing N-stream calculator *(tracked as candidate tool below)*
- Coil-sizing calculator *(tracked)*
- Economizer-ratio helper *(tracked)*
- Comfort zone overlay / ASHRAE 55 — different question (comfort vs.
  process control); not added.
- DOAS / ERV / makeup-air psychrometrics — different question; not
  added.
- A second, deeper "Psychrometric Processes" Education page if the
  one-paragraph process-families treatment ever feels insufficient.
  Not promoted today — the chart tool plus the lesson's process
  section read coherently together.

**Reframed 2026-05-18** — same day as ship, after a re-read on a
cold open. The natatorium anecdote opened the page with confidence
but also opened it with a *pool job*, which is one of the hardest
applications on the chart. A tech meeting psychrometrics for the
first time was being shown the deep end before the words on the
chart even resolved. Three changes shipped in this pass:

- *Lead quote replaced.* The natatorium quote moved down to the
  pool widget where it pays for itself against the simulator.
  The new lead is the page's actual mission statement — the
  chart looks intimidating; this page makes it approachable.
- *Section reorder — vocabulary → elegance → processes → gotchas
  → widget.* The seven properties come first so the words on the
  chart resolve before any 2-DOF intuition or process-families
  prose. The pool widget becomes the page's applied capstone
  instead of a mid-page demo.
- *Structural alignment with peer Education pages.* The page now
  uses the single `.tool-card` shape that `vfds`, `pump-control`,
  `balancing`, `hydronic-loops`, and `load-piping` all use:
  eyebrow section-header on top, one outer card with
  `h1.tool-card-title` + `<span class="tool-tag">HVAC</span>` +
  `.page-intro` + `h2.subhead` subsections inside. The pool
  widget is broken out as a second `.tool-card` capstone (a
  small departure from the strict peer pattern, but it lets the
  widget read as the page's deliverable rather than another
  inline diagram).

### Air-mixing calculator *(shipped 2026-05-18)*

Ships at `/tools/air-mixing.html` as a two-tab `.tool-body-2col` tool
with a worked-example row beneath the grid (second consumer of
economizer-ratio's `.er-example` pattern, per codebase-issues #29 step
1). Generalizes the chart's and economizer's two-stream mix to three
streams. Tab 1 (by mass flow) takes a CFM and a full Define-by state
per stream; tab 2 (by mass fraction) takes percentages that must sum
to 100 % (±0.1 tolerance). Output column shows the mixed-air state —
DB, WB, DP, W, RH, h, v — plus a Copy button. Per-stream `solveState`
errors surface inline below the bad stream; tab-level warnings
(fraction-sum drift, zero total mass, mixed-state out of range) land
in a status pill above the readouts. Shared altitude input above the
tabs feeds `pressFromAltitude` into both tabs.

**Framing decisions settled during build:**
- *Three streams, not dynamic.* The use cases that actually surface
  in practice (OA + RA + ERV exhaust; economizer + return + makeup;
  recovery-wheel sanity check) are all three-stream. A 4th-stream ask
  hasn't come up, and dynamic add/remove buttons would add an
  interaction pattern not used elsewhere on the site for no current
  payoff. Zeroing a stream's weight drops it from the mix cleanly.
- *Altitude shared, not per-stream.* One input above the tabs feeds
  both. Streams "mixing under different pressures" don't physically
  mix without flow work — single pressure is the honest model.
- *Mass-fraction tab surfaces the percentage check.* `|Σ − 100| > 0.1`
  surfaces a tab-level warning rather than silently renormalizing.
  Renormalize-on-input would hide the bug class where a tech mistypes
  one digit and doesn't notice.

**Engine API review — `psychro-engine.js` flat primitives (second
audit).** Second second-consumer landed; the API survived again:
- `Psychro.solveState` covered all three per-stream Define-by call
  sites without modification. Same `.ok` branching as economizer.
- `Psychro.buildState` materialized the mixed state from the recovered
  `(T_mix, W_mix)` cleanly. The "build from two scalars at pressure"
  shape is the right one for this kind of derived state.
- `pressFromAltitude` is the first non-namespaced primitive a tool has
  called directly other than the chart (economizer hardcoded `P_STD`).
  Worked fine as a top-level `const` reachable from a later inline
  script — the classic-script global pattern holds.
- The only new math was the algebraic inversion of `enthalpy(tdb, W)`
  to recover `T_mix` from `(W_mix, h_mix)`. One inline line — not
  engine surface; the algebra is shape-of-tool, not shape-of-air.
- No new primitives added. Two of two predicted second-consumers
  (economizer-ratio, air-mixing) shipped without touching the engine.
  Two-tier API is now validated across three pages. Coil-sizing
  remains the next probe; if its solve-for-leaving-state shape wants
  a `Psychro.invertProcess` sibling, that's the trigger.

**Out of scope (deliberate, parked):**
- *4th stream / dynamic stream count* — see "Framing decisions."
- *By-volume-flow without specific-volume adjustment* — not exposed.
  CFM is volumetric; the tool derives mass from `CFM ÷ v` per stream,
  which is the right thing.
- *Different pressures per stream* — see "Framing decisions."
- *localStorage persistence of last-entered values* — no tool persists
  input state today; not changing that pattern for this one. The
  controller-commissioner entry is the right place to start that
  conversation.
- *Promote `.am-example` and `.er-example` to a shared
  `.tool-body-row` utility in `styles.css`* — **shipped 2026-05-18**
  in the codebase-issues #29 PR. Both pages now apply
  `class="tool-body-row"` directly; the page-local rules dropped from
  each page's `{% block head %}`. Same PR retrofitted
  `signal-scaling.html` (3-col → 2-col + shared row) and PR #33
  added a third consumer on `modbus-register-viewer.html`.

### Coil-sizing calculator *(shipped 2026-05-21)*

Ships at `/tools/coil-sizing.html` as a two-tab `.tool-body-2col` tool
with a worked-example `.tool-body-row` beneath each tab — same shell as
`economizer-ratio.html` and `air-mixing.html`. Page-id prefix `cs-`. A
single coil in isolation: the math the psychrometric chart runs on its
CC / HC stages, surfaced on its own so a quick capacity check doesn't
need a whole AHU chain.

In scope (shipped):
- *Coil-type toggle* — Cooling / Heating, shared above the tabs in a
  thin `.cs-type-strip` band (mirrors air-mixing's altitude strip).
  Humidifying was dropped from the v1 sketch — humidifier sizing is a
  different question and a rare ask; coil sizing is the cooling/heating
  pair. Cooling-only rows carry `.cs-cool-only`, heating-only rows
  `.cs-heat-only`; the toggle shows/hides them and recomputes.
- *Capacity tab (forward)* — entering state + leaving state (both the
  "Define by" pattern) + airflow → total / sensible / latent MBH, SHR
  (cooling only), ΔDB / ΔW / Δh. For a heating coil the leaving editor
  collapses to a single dry-bulb field — humidity ratio rides through
  unchanged, so the define-by rows hide. Straight `Psychro.solveState`
  ×2 → `Psychro.computeProcess` — no new engine math.
- *Leaving-state tab (inverse)* — entering state + airflow + the load
  the coil carries → the leaving-air state. Cooling takes sensible +
  latent MBH as two fields (a load calc hands you both); heating takes
  one capacity field.
- *Sea-level pressure for v1* — same call as economizer-ratio; the
  worked example forward-links to the chart tool for altitude.

**Engine — `Psychro.invertProcess` added.** The friction-file note on
this entry and the air-mixing entry both flagged the coil-sizing
inverse as the trigger for a `Psychro.invertProcess` sibling. It
landed: `invertProcess(inlet, { type, cfm, qSens, qLat })` is the
exact algebraic inverse of `computeProcess`'s q-formulas — feed a
result of one into the other and it round-trips. Loads are positive
magnitudes; `type` sets the sign. The returned state carries an extra
`saturated` flag — true when the requested latent load drives the
leaving point onto the saturation curve (its apparatus dew point),
which the leaving-state tab surfaces as a `warn` status. Heating is
the clean case (pure sensible, W constant); cooling needs the latent
split, hence the two load fields. No other engine surface changed —
`solveState` / `buildState` / `computeProcess` were untouched.

**Friction caught in build:**
- *Coil type vs. what the numbers say.* Entering a leaving dry-bulb
  warmer than the entering air on a coil set to "Cooling" (or cooler,
  on "Heating") is a real mistake a tech can make. Rather than error,
  the Capacity tab's status pill warns and names the actual process —
  a teaching nudge, same spirit as the chart's coil-stage error
  messages.
- *Cooling that adds moisture.* If the leaving state on the Capacity
  tab is more humid than entering, the status warns — a cooling coil
  removes water, it can't add it.

### Economizer-ratio helper *(shipped 2026-05-18)*

Ships at `/tools/economizer-ratio.html` as a two-tab `.tool-body-3col`
tool. Tab 1 (dry-bulb) is the calc a tech runs at the panel — three
temperature inputs, one %OA out, feasibility verdict. Tab 2 (enthalpy /
full state) takes full OA + RA states via the chart-page Define-by
pattern and adds two things on top of the dry-bulb answer: the
**resulting mixed-air state** (DB, WB, W, RH, h — what the coil actually
sees) and an **OA-vs-RA enthalpy-changeover verdict** (favorable /
wash / unfavorable), which is the high-limit gate a real enthalpy
economizer uses to decide whether free cooling is worth running before
any dry-bulb modulation runs. Both tabs follow the global Units toggle
with input-value conversion on flip; sea-level pressure for v1 (an
altitude field would have leaked from chart-tool surface for marginal
gain, see "Out of scope" below).

**Framing decision settled during build.** The friction-file scope
sketch read as "OA enthalpy + RA enthalpy + MA enthalpy setpoint → %OA"
for the enthalpy tab. In practice no controls engineer specifies an MA
enthalpy setpoint — they specify an MA *dry-bulb* setpoint, and a
high-end BAS uses enthalpy only as the changeover criterion (not the
modulating variable). The tool reflects that: %OA on both tabs is a
DB mass balance; enthalpy buys you the full mixed-state readouts plus
the changeover comparison.

**Engine API review — `psychro-engine.js` flat primitives.** First
second-consumer landed; the API survived as-is:
- `Psychro.solveState(mode, tdb, second, P)` was the ergonomic call on
  the OA / RA editors — three lookups (Define-by selector, dry-bulb
  input, second value) feed straight in, error path is uniform.
- `Psychro.buildState(tdb, W, P)` was the right shape for the mixed
  state once %OA was known; humidity ratio is a clean mix variable
  alongside dry-bulb.
- No new primitives needed; the existing `enthalpy`, `humRatioFromRH`,
  etc. flat exports weren't touched directly because solveState covers
  every Define-by mode behind one function.
- One small drag: `solveState` returns `{ ok, error }` *or* the state
  object, and consumers have to keep both shapes in mind. Not a redesign
  trigger — three of three call sites in this tool branch on `.ok`
  cleanly — but if a fourth consumer wants a "just throw on bad input"
  variant, that'd be the time to add a sibling rather than refactor.
- `computeProcess` wasn't needed (no coil-process delta to compute);
  appropriately namespace-only.

Verdict: **the two-tier API holds.** Air-mixing calculator and
coil-sizing calculator can land against the current surface without
preliminary refactor; flag a re-audit when one of those exposes a
real shape mismatch.

**Out of scope (deliberate, parked):**
- *Altitude / pressure input* — kept sea-level for v1. Chart tool has
  altitude and that's the right place for it; this tool's job is the
  fast panel calc. Pulling altitude over would have meant a wider
  Input column and rebuilt-on-flip pressure plumbing for no
  daily-use payoff. The "atmospheric pressure fixed at sea level"
  note in the enthalpy tab forward-points to the chart for an
  altitude-adjusted answer.
- *MA enthalpy setpoint input* — see framing decision above.
- *Economizer-changeover threshold reference table* (ASHRAE 90.1 by
  climate zone) — would have made the Reference column denser without
  changing the math. Worked-example walkthrough won the slot; the
  changeover-verdict pill in the enthalpy tab is the live equivalent.

### Mock function-block editor *(shipped 2026-05-22)*
*One question: what does it feel like to build a control sequence
out of function blocks, and how does a wiresheet actually evaluate?*

Ships at `/simulators/function-block-editor.html` as a custom-layout simulator
(palette · canvas with a full-width inspector strip below), page-id
prefix `fbe-`. The graphical wiresheet half of the BAS programming
story — same `mock` framing as `vfd-mock.html`: feels like the real
thing, doesn't replace it. Paired with the
`/education/function-blocks.html` explainer (entry below), matching
the `vfd-mock ↔ vfds` and `pid-tuner ↔ pid-basics` precedents.

**Engine extraction landed day-one** — `html/scripts/fbe-engine.js`
holds the block catalog and the per-tick evaluator as a pure classic
script (`window.FBE`, no DOM); the page owns canvas / drag / wiring /
tick loop. Codebase-issues #6's "extract before the page becomes a
monolith" lesson applied directly: the paired Education page is the
near-certain second consumer, and the engine is a clean boundary
(block registry + topological evaluator). Mirrors pid-engine.js /
psychro-engine.js. Engine-direct unit tests
(`tests/fbe-engine.spec.js`) cover catalog shape, combinational
settling, set-dominant SR latch, TON delay, PID step, and
feedback-cycle one-tick delay.

**Block roster — 28 blocks** across six palette categories. Boolean:
AND / OR / NOT / XOR / SR latch (set-dominant). Comparators:
= / ≠ / > / < / ≥ / ≤. Math: add / sub / mul / div / min / max
(divide guards `/0 → 0`). Timers: TON / TOF, both stateful with a
preset-time param. Selection: select (boolean switch) and limit
(clamp). I/O: constant, AI / BI / AO / BO point stubs, and a
generic readout sink. Control: a real per-tick PID. Friction-file
long-tail (pulse timer, average) parked — trivial registry entries
to add later if a real use case asks.

**Real working PID in v1 — architectural argument.** The pre-build
sketch on this entry said "no actual PID block" for scope discipline
(echoing the VFD-mock posture). Re-evaluated during planning:
TON / TOF and SR latch already force a *stateful-block* engine, so
a real per-tick PID is the same category — retrofit cost ≈ build-in
cost. Built it in, with the PID-loop example program (PV + SP → PID
→ AO + readout) as the tie-back to `pid-tuner.html`. Implementation
is a fresh ~20-line per-tick controller with conditional-integration
anti-windup, output clamped 0–100 %; distinct from `pid-engine.js`'s
`simulatePid`, which is a whole step-response simulation (different
shape). The pid-tuner / pid-basics pages remain the place for PID
internals; this tool just lets you wire the loop into a sequence.

**Five canned example programs** load via a `widget-try` chip row:
1. *Freeze-stat shutdown chain* — freeze BI sets an SR latch, the
   latch drops the fan via NOT and lights an alarm BO.
2. *Economizer enable* — AI(OAT) `<` const(setpoint) AND BI(cool
   mode) → BO. Six blocks; default-loaded on first paint as the
   most immediately legible sheet.
3. *Direct-acting (cooling) thermostat* — AI(temp), const(SP),
   const(deadband); add / sub build the band edges; GT/LT feed an
   SR latch (set on over-temp, reset on under-temp); output drives
   a cooling BO. Output rises with temperature = direct-acting.
4. *Reverse-acting (heating) thermostat* — same nine-block shape,
   the SR latch's S and R inputs swapped — output rises as
   temperature falls = reverse-acting. The two thermostats
   deliberately ship as a pair to teach the direct / reverse-acting
   vocabulary.
5. *PID loop* — AI(PV), const(SP), PID block, AO + readout. The
   loop visibly climbs toward setpoint once running.

**Tick semantics — one-tick delay for cycles.** Kahn topological
sort on the wire DAG; combinational chains settle in dependency
order within a single tick (a comparator's result reaches the
downstream AND in the same tick). Cycles (feedback edges) read the
*previous* tick's value — so an SR latch holds, a NOT wired back to
itself toggles each tick instead of looping forever, and the engine
never hangs. Stateful blocks carry their own state across ticks.
Tested explicitly in `fbe-engine.spec.js`. Tick rate: 100 ms (10 Hz),
a fixed dt the page passes to `FBE.tick(graph, dt)` — fixed dt
matters for the PID integrator and timer resolution (same reasoning
as codebase-issues #1's motor-tick decision). The page's
`setInterval` is captured and paused on `visibilitychange` hidden,
honouring #1's "no idle background work" posture.

**Interaction settled during build:**
- *Click-to-add from palette*, not drag-from-palette. Simpler,
  keyboard- and touch-friendly, robust. New blocks cascade into a
  tidy 5-column grid so they don't stack.
- *Pin wiring is two clicks*: click an output pin, then a compatible
  input pin. Kind-checked (analog can't feed digital). One wire per
  input pin — wiring a second wire to the same input replaces the
  first.
- *Drag blocks by their title bar* via pointer events (works on
  touch). Pin clicks short-circuit drag, so a click on a pin always
  reaches the wiring handler.
- *Inspector* is a full-width strip below the canvas — not a third
  column, which left the canvas too narrow. Horizontal row of
  stacked label / field pairs for the selected block's params; live
  edits feed back on the next tick.
- *Delete / Backspace* removes the selected block (and its wires) or
  the selected wire. *Escape* cancels a pending wire.
- *Run / Pause / Step / Reset / Clear* sit above the workspace.
  Reset clears every block's state without altering the graph
  (timers restart, PID integral zeroes, latches drop).
- *Wire colours encode pin kind* — analog = `--blue`, digital TRUE
  = `--accent`, digital FALSE = `--border` (gray). No new `:root`
  token needed.

**Layout — desktop-first interaction, intentionally.** The
friction-file pre-accepted desktop-only ("drag-wiring on a touch
device is its own design problem"). Below the 860 px breakpoint the
palette stacks above the canvas, a `.fbe-narrow-note` sets
expectations, and the tool still functions (pointer events cover
touch for both dragging and click-wiring) — the real cost on small
screens is screen real estate. Canvas inner is 900×480 with
horizontal scroll; examples lay out left-to-right within it.
Wiresheet scrolling is the expected behaviour for this kind of tool
— every real wiresheet scrolls.

**Out of scope (deliberate, parked):**
- *Persistence / save / load / JSON export.* Session-only — same as
  every other tool on the site. The Controller-commissioner entry
  remains the place to start the persistence conversation.
- *Touch-optimised drag-wiring.* Pre-accepted desktop-first.
- *Pulse timer, average, additional comparators.* Trivial registry
  entries; add when a real use case asks.
- *Deeper pid-tuner ↔ editor integration.* The PID block stands on
  its own; deeper PID pedagogy stays on `pid-basics.html` (cross-
  linked from the lesson, accessible via the PID block's behaviour).
- *Multi-pass settling beyond one tick.* One-tick-delay is
  sufficient for v1 and matches how real controllers behave.

### Function-block programming — paired Education page *(shipped 2026-05-22)*

**One question:** *what is function-block programming, and why do
controls people use it?* Ships at
`html/education/function-blocks.html` as the lesson half of the
Function-Block Editor pairing, mirroring `vfd-mock ↔ vfds` and
`pid-tuner ↔ pid-basics`.

In scope (sections shipped):
- *Blocks and wiresheets* — what a block is (pins, body, output),
  what a wiresheet is, the digital / analog distinction. Anchored
  by a static SVG annotating a single AND block (inputs ·
  behavior · output).
- *Why controls people work this way* — the diagram is the program,
  you can watch it run, the vocabulary travels across vendors.
- *The block families* — a six-callout grid (I/O · Boolean ·
  Comparator · Math · Timer · Control), one paragraph each. The
  Control card forward-links to `pid-basics.html` for PID
  internals.
- *How a wiresheet runs* — the scan, combinational settling in
  dependency order, the one-tick-delay for feedback. The same
  semantics the editor's engine implements; the lesson explains the
  *why* the editor demonstrates.
- *A worked sheet — economizer enable* — capstone walkthrough of
  the same six-block sequence the editor ships as a default
  example. A full static SVG wiresheet with blue analog wires and
  green digital-TRUE wires.
- *Build one yourself* — `.cta-button` to the editor as the closing.

Out of scope (forward-links, not content):
- The editor itself — full hands-on lives in the tool (closing CTA;
  the tool's preamble links back).
- *PID internals* — `pid-basics.html` cross-link.
- *Vendor-specific environments* — cross-manufacturer discipline,
  brief mention only.
- *An embedded live mini-demo using `fbe-engine.js`* — considered
  during scoping, parked: the editor is the interactivity, one
  click away, and a redundant demo would dilute it. Same logic the
  psychrometrics-basics page applied (forward-link to the chart
  tool rather than re-doing the visualisation).

**Diagram CSS — page-local `.fb-svg` class** (precedent: `.vfd-svg`).
Block-diagram structural drawings get their own page-local class;
the `.edu-svg` family stays scoped to pipe-flow diagrams with
`data-flow` annotations. Two SVGs ship on the page: the
anatomy-of-a-block schematic and the economizer-enable wiresheet.

**Cross-links wired both directions:**
- Tool → lesson: the editor's `.tool-preamble` carries "New to it?
  Start with Function-Block Basics →" from day one.
- Lesson → tool: inline anchors plus the closing `.cta-button`.

**Forward-link debts this page incurred:** none net-new — the
related future page (`pid-basics.html`) already exists, so the
lesson cross-links to it for PID internals without a `[future:]`
marker.

### Controller commissioner *(larger build — may span multiple sessions)*
A point-by-point commissioning workbench. User defines the controller's
IO list (AI / AO / BI / BO, with name, type, range/units, expected
behavior), then walks through each point on a job site, marking it
commissioned, adding observed values + notes, and flagging anomalies.

Open design questions to think about:
- **Persistence:** localStorage at minimum (so a job survives a tab
  reload). Multiple jobs at once? Probably yes — needs a job
  picker / list.
- **Sanity checks:** auto-warn on obvious issues — AI reading outside
  range, AO commanded but no feedback movement, BI stuck, units that
  don't match the configured type, etc. Keep the rules conservative;
  false positives kill trust fast.
- **Input shape:** type-in is fine for v1, but eventually a CSV / point-
  list paste would be huge (most controllers have an exportable point
  list from the tool — Niagara, EBO, etc.).
- **Export pipeline (the interesting part):** CSV for sure. PDF
  commissioning report is the dream — date, tech, controller ID, every
  point with status + notes + anomalies. Worth investigating: can it be
  done client-side with something like jsPDF, or does it need the
  Worker? Keeping it client-side preserves "no login, no backend" — feels
  right for the site.
- **Scope creep risk:** this could turn into a full CMMS-lite. Resist.
  Goal is "better than a clipboard," not "replace Niagara."

This is the first tool on the site that's stateful + persistent. Worth
thinking about whether that pattern should generalize (e.g. PID tuner
saves last sliders, Modbus viewer remembers last register) before
hardcoding localStorage just for this one tool.

### Education page conventions

**Engine conventions.** When functionality benefits from a shared
script (the PID simulator, the flow animation engine, future
thermo/mixing models for Twin-T or similar), it lives under
`html/scripts/` as a classic script (no `type="module"`) named
`<purpose>-engine.js`, exposing plain globals — `PID_PROC` /
`simulatePid` for the PID engine, `FlowEngine.init()` for the flow
engine — that inline page scripts (loaded after the engine) consume.
Engines don't share code with each other; the shared *convention*
(location, naming, classic-script + globals) is the integration. If a
third engine appears that genuinely shapes like one of the existing
two, revisit then — don't pre-abstract a "core."

The Education explainer pages land harder if the schematics move — flow
pulsing around a loop, the injection pump speeding up and the supply
temperature creeping up. The framing that anchors this work: a tech on
a roof on limited cell service should still get full value from the
page. That sets the bar — static SVG carries the full meaning, motion
is additive only, page renders usefully on a phone with two bars.

**Per-diagram scope on `education/hydronic-loops.html`:**
- *2-Pipe Direct Return* — illustrative ambient motion. Same particle
  behavior on every branch (constant velocity, equal spacing); because
  path length to near vs. far loads is unequal, the near load's round
  trip visibly completes sooner than the far load's. That asymmetry is
  the contrast Reverse Return cancels.
- *Reverse Return* — illustrative ambient motion. Return-main flow
  direction matches supply (the contrast with Direct is the point),
  load-branch speeds roughly equal.
- *Twin-T Primary-Secondary* — graduates to a small **interactive
  widget**: slider on injection-pump speed, system supply temperature
  shifts color in response, worked-example flow numbers update live.
  Same precedent as the PID mini-sims — interactive doesn't only live
  in Tools, it lives wherever it teaches. See "Where interactive
  widgets live" below.
- **viewBox empty space ≠ CSS whitespace.** If a diagram's pipework
  doesn't fill the rendered SVG width, check the content's bounding
  box against the viewBox before reaching for CSS. Content should
  fill its viewBox so `.hd-svg { width: 100% }` does what it looks
  like it should.

**Progressive-enhancement baseline.**
The static inline SVGs are
deliberately the baseline this layers onto: every equipment element is
a named `<g>` (`#d3-boiler`, `#d3-injection-pump`, `#d3-load-A`, …),
every pipe run is a named `<path>` / `<line>` (`#d3-inject-pipe`,
`#d3-system-return`, …), labels are real `<text>`, and flow arrows are
grouped (`#d3-flow-arrows`). The animated version is *additive* — a
small JS particle engine (`/scripts/flow-engine.js`) walks discrete
`<circle>` particles along the named paths via `getPointAtLength()`,
keyed off `data-flow="supply"|"return"` attributes on each path; the
static flow arrows stay on as the motion-off direction cue. The Twin-T
section adds a small `<script>` for the injection-pump slider — not a
rewrite. Anything new under `education/` keeps that habit: clean named
groups, semantic ids, equipment as separately-targetable elements. The
dashed return is the static-state encoding; in the animated state the
engine drops the dashes and direction-of-motion carries the redundant cue.

**Prose-above-diagrams convention** *(Education pages)*

All prose for a section sits above its diagram; the diagram is the
visual capstone after the explanation rather than the centerpiece
that prose flows around. Includes intro, mechanism explanation,
worked examples, and synthesis paragraphs. The legend stays
immediately below the diagram. Interactive widgets (where present)
sit below the diagram with any associated callouts.

Driven by the d3 case where the diagram + widget pair has to fit
in a single viewport for the interactive feedback loop to work.
Below-diagram prose pushed the widget too far down to see the
particle response while dragging the slider. Lighter fixes (sticky
positioning, viewBox trim, side-by-side layout) didn't fully solve
it; the convention change does, and it stays predictable for AHU
and future Education pages.

Tradeoff knowingly accepted: d1 and d2 lose their below-diagram
synthesis paragraphs (now above), which slightly changes the
rhythm of those sections. The diagram becomes punctuation rather
than centerpiece. Reads naturally; not a loss.

Consequence worth knowing for future Education pages: prose-above
produces tall sections. d3 lands at ~1700px total because the
worked-example aside and the synthesis prose both sit above the
diagram. Worth a pull-through at the bottom of every section —
d3 has the widget, future sections should either keep prose tight
or earn the length with a payoff at the bottom worth scrolling
for.

**Animation policy.**
- No JS framework or animation lib (Mermaid, D3, GSAP, Lottie) —
  hand-written, same "no build step" property as everything else.
- Flow indication is a vanilla JS particle engine
  (`html/scripts/flow-engine.js`), driven by `requestAnimationFrame`,
  walking `<circle>` particles along `data-flow`-annotated paths via
  `getPointAtLength()`. CSS for static styling only.
- Constant particle velocity globally — longer paths take longer to
  traverse. Intentional and pedagogical: the contrast between Direct
  Return (unequal cycle times to near vs. far loads) and Reverse
  Return (equal cycle times) depends on it.
- Per-segment particle pools, no path-stitching at branches. Each
  path cycles its own pool independently; flow continuity at tees
  reads correctly as long as the rates match.
- Ambient continuous motion (peripheral, slow) is in-bounds — matches
  what a live BAS graphic does. The test is "would this distract a
  tech reading on bad cell." If yes, don't.
- Demanding-attention motion is out: full-screen takeovers, video-
  style flourishes, bouncy easing. That's the spirit of "no autoplay."
- Honor `prefers-reduced-motion: reduce` — engine short-circuits at
  init, no alternate render path; the static SVG is already the
  correct reduced-motion state.
- The page must still teach with the animation off and on any device.
- The dashed-stroke-vs-moving-particle perceptual issue and the 
screen-only toggle that fixed it. Future animations on any 
dashed-encoded element will hit this; recording the resolution saves 
the rediscovery.
- The path/line/circle/etc. selector convention — return-flow markup
uses mixed element types, so attribute selectors should be 
[data-flow="return"] not path[data-flow="return"]. Small but exactly the 
kind of catch that costs an afternoon next time.
- **Animating a diagram audits its static markup.** Latent
  inconsistencies that survive prose review — a flow arrow
  pointing the wrong way, a path drawn against direction, a label
  placed near the wrong element — surface immediately once
  particles contradict them. Hit on d3 (a return-flow arrow apex
  pointing right while the engine demonstrably moved particles
  left). Expect more on future diagrams; the audit is a feature
  of the work, not noise.
- **Edge case: state-dependent callout reserved height.**
  Widgets whose callout text changes between states should
  reserve space for the worst-case content. d3's failure-state
  anecdote exceeds the 4.5rem reserved alert min-height on
  narrow viewports (~7 lines on a 375px column), pushing
  subsequent content down. Documented limitation rather than a
  bug — the back-link below shifts but nothing overlaps. Future
  state-dependent widgets should either reserve for the longest
  state or accept the same reflow.

**Engine attribute conventions.** Three opt-in attributes on
annotated paths. New surface bubbles up to this list first so the
engine's API doesn't grow ad-hoc — `flow-engine.js` is a small
file and the cost of an unrecorded attribute is that the next
page invents its own variant.
- `data-flow="supply"|"return"` — required marker that attaches
  an element to the engine. Picks particle color (`SUPPLY_FILL` /
  `RETURN_FILL`) and is the selector future CSS hooks key off
  (see the screen-only dashed-return override above).
- `data-flow-reverse="true"` — optional, default false. Walks the
  path end-to-start instead of start-to-end. Use when a path is
  drawn against flow direction and rewriting the `d` /
  `x1,y1→x2,y2` would scramble adjacent geometry semantics. d1
  and d2 needed none; we'll see whether d3's bridge needs it.
- `data-flow-density="<float>"` — optional, default 1.0, range
  (0, 1.0]. Per-path multiplier on the engine's baseline particle
  spacing — `density 0.4` ⇒ particles spaced `SPACING / 0.4`
  viewBox units apart (sparser). For diagrams where uniform
  density misreads: Twin-T's bridge at baseline injection should
  visibly carry less particle traffic than the primary or system
  loops, since the whole point of the diagram is that most of
  the building's water never passes through the boiler. Immediate
  downstream consumer is the Twin-T injection-pump slider, which
  mutates the attribute live as the user drags.

Three rules ride with `data-flow-density` and are worth recording
alongside it:
- **Velocity stays global.** Density changes spacing only, never
  speed. This is what protects the direct-vs-reverse-return
  pedagogy (constant velocity, cycle time varies with path
  length) from getting muddied by a third axis on d3.
- **Engine caps at 1.0 on the upper end.** Densities above 1.0
  would imply pipes carrying *more* than the "main flow"
  baseline, which has no physical reading on any current diagram
  and would invite misuse later. Cleaner to clamp at the engine
  than to police it from the page.
- **Density is a visual encoding of relative flow, not absolute
  GPM.** The engine has no concept of hydraulics; page-level code
  (the slider) maps GPM → density before mutating the attribute.
  Keeping that translation outside `flow-engine.js` preserves the
  rule that the engine knows only paths, particles, and time.

**Engine public API.** Two methods on `window.FlowEngine`, named
to keep extension predictable without the surface growing ad-hoc:
- `init()` — scan the document, build particle pools for every
  annotated element, start the rAF loop. Idempotent for
  already-built pools (a second call rebuilds them in place).
  Pages call it from an inline `<script>` at the bottom of
  `<body>`, after the engine's `<script src=...>` tag.
- `refreshPath(el)` — rebuild one element's pool from its current
  attribute values. Pages call this after mutating
  `data-flow-density` (or any future engine attribute) so the
  engine picks up the change live. No-op under reduced motion,
  since `init()` never built any pools to refresh.

The refresh path is explicit rather than a MutationObserver inside
the engine. The page already knows when it just changed an
attribute, so an explicit call keeps the data flow easy to reason
about; a watcher would have the engine constantly checking DOM
for changes the page itself made, and would silently re-fire if
any other code touched the attribute. Explicit beats observed
when the page already knows what it did. New methods (if a future
engine extension needs one) bubble to this list before
implementation, same as new attributes.

### Load piping — Education page *(shipped 2026-05-14)*
*One question: what does the connection between a load and a
hydronic loop look like, and what does that connection point
have to decide?*

In scope: two-way valve at the load (variable system flow);
three-way valve at the load (constant system flow, mixing and
diverting); the tie-back to the twin-T's forward-reference
callout — which valve type the secondary loop is built around
determines whether secondary flow varies or stays constant.

Out of scope (forward links, not content):
- VFD pumping — [future: vfds.html]
- Hydronic balancing, circuit setters, PICVs — [future:
  balancing.html]
- Heat-pump loops, geothermal loops, condenser water/cooling
  towers — these are different *systems*, each its own future
  page
- Coil-specific behavior (chilled vs. hot water control
  direction) — brief mention only; full treatment is in coil-
  specific or sequence content

Pays off the twin-T (`hydronic-loops.html#d3`) discovery callout.
The closing section ties back explicitly. The twin-T subhead now
carries `id="d3"` as the cross-link anchor; the
"Find out what it is" callout on hydronic-loops is now a real
link to `load-piping.html` rather than a "coming soon"
placeholder.

**Balancing decision (recorded for the scope rule).** The
friction-file entry had originally floated balancing as a
possible in-page section if it stayed tight. During drafting it
was pulled out and replaced with a one-sentence forward link to
`[future: balancing.html]` instead. Reason: the page's one
question is about *valve choice at the connection point*;
balancing is a different function (making each load see its
design flow) on the same system, and a 3-paragraph treatment
would be a tease that opens more questions than it answers —
with no balancing page to absorb them yet. The "Education page
scope — one question per page" rule says different function =
its own page, and that was the trigger. The forward link
preserves the option without committing to the treatment.

**Forward-link debts this page incurred** (so the next pages
know what they're inheriting):
- `[future: vfds.html]` — referenced in the two-way section as
  the natural pairing for variable-flow systems. The VFDs page,
  when it ships, should tie back to load piping with the
  inverse framing ("here's the pump side of the variable-flow
  picture we set up there").
- `[future: balancing.html]` — referenced once in the three-way
  section, as a closing aside on why "constant flow" only means
  each load sees its design flow if the loop is balanced. The
  balancing page should tie back to load piping for the
  two-way/three-way context, since the balancing strategy
  differs between the two.

**Diagram-markup conventions (now animated).** Named `<g>`
groups, semantic id prefixes (`lp-2w-`, `lp-3wm-`, `lp-3wd-`,
`lp-tt-` for the tie-back diagram), real `<text>` labels,
grouped flow-arrow polygons, and `data-flow="supply"|"return"`
attributes on every pipe segment. The animation-ready markup
the page shipped with paid off in a follow-up pass: adding
`flow-engine.js` + the `@media screen` dashed-return override
+ a `FlowEngine.init()` call was the whole integration. No
markup retrofit needed except the one tee-split gotcha below.
Style classes (`.lp-svg`, `.lp-legend`) are inlined in the page
mirroring `hydronic-loops.html`'s `.hd-svg`/`.hd-legend`; if a
third Education page with diagrams appears, that's the trigger
to fold both into a shared `.edu-svg` rule in `styles.css`.

**Diverting-valve tee gotcha — converging flows need two
segments.** The horizontal at the bottom of the diverting-valve
diagram (and analogous geometry in any future converging-flow
diagram) carries two flows meeting at a tee: coil-out arrives
from the LEFT, bypass arrives from the RIGHT, combined output
leaves DOWNWARD. Drawn naively as a single `<line>` from
(coil-out point) to (bypass-down corner), the engine walks
particles in one direction along the whole line, which
animates one of the two converging flows backwards. Fix is to
split the horizontal at the tee into two segments — one per
incoming flow — each drawn in its own flow direction, and
coloured by its origin (return-dashed for coil-out side,
supply-solid for bypass side). The mixing-valve geometry on
this same page is already split correctly (`coil-out-h` and
`bypass-cross` are separate lines), which is why this only
surfaced on `lp-3wd-`. Rule for future diagrams: anywhere two
flows converge at a tee, draw each contributing leg as its
own `data-flow` element. Single lines are fine only where flow
is unidirectional along the whole segment.

**Diagram annotation layout — don't split sentences across
corners, don't dangle parentheticals far from their referent.**
Two specific failure modes caught on a label-review pass after
the diagrams shipped:

- A small dim-italic annotation pair like "total flow Q" at
  top-right + "varies with valve" at bottom-right reads as
  one sentence but forces the eye to jump between opposite
  corners of the diagram to assemble it. Fix: consolidate to a
  single short line in one place (top-right, paired
  horizontally with the existing "supply main →" label on
  the left, both in the same horizontal band — no eye-jump).
- A parenthetical sub-label like "(at coil outlet)" placed
  *below* the valve body, while its referent "3-WAY MIXING"
  sits *above*, reads as a dangling fragment. Fix: either
  drop the parenthetical entirely if the geometry already
  conveys what it says (valve at coil outlet vs. coil inlet
  is visible from where the valve is drawn), or stack it
  immediately next to its referent.
- When a sub-label is genuinely useful (e.g. "diverting"
  disambiguating Load B's 3-way valve type on the tie-back),
  parens around it are redundant: italic + dim colour already
  reads as a subtitle. Drop the parens.
- A valve label that floats in empty space far from its valve
  reads as orphaned, even when there's nothing it would collide
  with closer in. `lp-3wd`'s `3-WAY DIVERTING` originally sat at
  `x=190 anchor-end` while the valve started at `x=240` — a 50px
  gap with nothing in it — because the available horizontal
  real estate to the left of the valve was empty and the label
  drifted into it. An audit pass caught it and pulled it to
  `x=235 anchor-end` (~5px from valve). Rule: spacing should be
  governed by the valve, not by the size of the empty band the
  label happens to be drawn into.

The combined effect on `load-piping.html`'s annotations was
the loss of "(modulating)", "(at coil outlet)", "(at coil
inlet)", and four orphan halves of split-corner pairs — about
seven labels removed, all redundant or confusing — plus the
3-WAY DIVERTING reseat. Diagrams read cleaner. Rule for future
Education diagrams: write the labels last, then prune them;
every annotation should earn its real estate by saying something
the geometry can't, and sit snug to its referent.

**Label-audit maintenance pattern.** Screenshot every diagram on
a page in one pass, scan for orphaned labels / split-corner
sentences / dangling parentheticals / valve labels that drifted
into empty space, fix in a single edit cycle. Cheaper than
catching label drift one-by-one across unrelated PRs, and the
visual comparison side-by-side makes outliers obvious. Worth
re-doing periodically when the diagrams on a page have shifted.

**Tie-back diagrams mirror their referent's layout.** The page
closes with a fourth diagram (`lp-tt-…` prefix) that pays off
the twin-T discovery callout. It deliberately reuses d3's
equipment positions (boiler at the same x/y, bridge in the
same place, system loop on the right, loads at x=540 and x=680
to match d3 exactly) so the visual mapping is unmistakable —
the reader recognises the topology instantly and the new
content is just "what's INSIDE each load box." Cheap discipline
with a real payoff: don't redraw a referent diagram from
scratch when the tie-back is the whole point of the new
diagram. The rule generalises: any future Education tie-back
diagram should copy the referent's coordinate system as a
starting point and only diverge where the new content forces
it. Added in response to "the closing section is prose-only,
it doesn't *show* the connection" feedback — the prose-only
version of the tie-back was reading as commentary rather than
resolution.

**DPBV addition — system-level component the page was missing.**
Follow-up pass after the page first shipped: the tie-back
diagram showed the valve-at-load detail for both Load A and
Load B but didn't include the *differential pressure bypass
valve* at the far end of the system loop. User flagged the
omission ("there's still one component missing, the balancing
valve at the far end of the loop"); consultation confirmed DPBV
was the intent (not a CBV — the "far end of the loop" phrasing
was the giveaway, since DPBVs live opposite the pump where
head climbs highest) and the user preferred "just add it to
the tie-back + prose" over a separate two-state diagram. Added
as a bowtie symbol (`lp-tt-dpbv`) on the right-edge vertical
at (760, 115), label `DPBV` snug to its left, plus a prose
paragraph between the two-way and three-way paragraphs in the
closing section. The right-edge vertical is already part of
the `system-return` animated path, so no topology or animation
changes were needed — the valve is just a discrete symbol on
the existing pipe. The SVG `<desc>` was updated for
accessibility. Symbol is identical to the 2-way control-valve
bowtie; disambiguation is by label + prose.

*Future expansion possibilities for the page.* User noted "we
may add a full diagram, and maybe more about DP later on" —
recorded here so options stay on the table. Grouped by topic:

DPBV-related:
- A small two-state inline diagram showing the DPBV closed at
  high demand (all flow through loads) vs. open at low demand
  (minimum bypass keeps pump alive). DPBV behavior is a
  feedback-loop concept that doesn't read from one static
  drawing; the two-state view would let the prose shorten from
  ~95 words to ~40.
- A distinct DPBV symbol (e.g. bowtie with a spring or Δp-sense
  indicator) so it's not visually identical to the 2-way
  control valve at Load A. Optional even with the current label
  disambiguation, but cleaner if the page expands its DP
  content.
- More on differential pressure as a general controls topic
  (pump curves, system curves, where the operating point lives,
  why ΔP-based pump control is increasingly common). That's
  likely its own Education page rather than load-piping
  expansion — VFDs page or a dedicated pump-control page.

Loop-level coverage (carried forward from the pre-ship
"Load-piping strategies" planning entry, since the shipped page
deliberately scoped narrower — just valve choice at the load —
than the original planning):
- **Decoupler approach** as an alternative to the
  closely-spaced-tees / DPBV story. Some installations use a
  hydraulic separator (decoupler tank or large-diameter common
  pipe) instead of tees + DPBV; functionally similar but the
  visual schematic is different and the failure modes differ.
- **Terminal-unit piping families** — fan-coil units, radiant
  manifolds, AHU coils, baseboard, induction units, chilled
  beams. Each load type carries its own piping conventions that
  the current "generic coil box" abstraction flattens. Could
  become its own page if it gets long, or a short addendum
  here.
- **The broader bypass-strategy landscape** — pairing valve
  type (2-way vs 3-way) with system type (constant-flow vs
  variable-flow) with pumping strategy (constant-speed vs VFD)
  in a single decision table or matrix. The current page
  threads this implicitly through prose; a synthesis aid could
  help job-site readers map their plant onto the lesson.

Closing widget *(shipped 2026-05-23)*:
- **"See what the bypass does"** — capstone widget at the end
  of `.tool-body`, after the closing prose at the bottom of the
  twin-T tie-back section. Closes out the load-piping page's
  former "no interactive payoff" gap and brings the page into
  line with the rest of the variable-flow quartet (`vfds` /
  `pump-control` / `balancing`), each of which already closes
  on a widget.
- **Job — make the MIN-FLOW callout vivid.** Section 3's
  prose introduces the bypass as a fixture that protects a
  system pump from dead-heading when 2-way loads throttle
  down, but the reader was only *told*. The widget lets them
  watch the floor disappear and reappear under one toggle.
- **Three knobs, four readouts, one schematic.** Slider on
  *building demand* (0–100%, throttles all three loads in
  unison); segmented toggle for *pump type* (`vfd` / `cs`);
  segmented toggle for *min-flow bypass* (`off` / `on`).
  Readouts: a PUMP state pill (`OK` / `WARN` / `DEADHEAD`,
  color-shifted via `data-state` on `#lp-w`, mirroring
  balancing's per-row idiom), SYS FLOW (GPM/L·s), PUMP SPEED
  or PUMP HEAD (% only — label swaps with mode), BYPASS FLOW.
  Full-width head/speed bar under the columns with a design
  tick at 100% (CSS `::after` cribbed from
  `.bal-w-bch-bar::after`); the bar dual-codes — in VFD mode
  it tracks pump speed (shrinks below 100%), in CS mode it
  tracks pump head (grows past 100% toward shutoff at 140%).
  Small SVG schematic on the left: 3 loads with bowtie 2-way
  valves on a supply/return main, system pump at the bottom
  left, MIN-FLOW crossover at the far right. Bypass-leg
  particles toggle via `FlowEngine.setPathColor()` (the engine
  can't tear down particle pools when `data-flow` is removed —
  `flow-engine.js:178` / `:149` — so recolouring to
  `transparent` is the honest workaround; pipe stroke stays
  visible since the bypass is a present-but-closed fixture).
  CSS prefix `lp-w-`, matching the `pc-w-` / `bal-w-` / `vfd-w-`
  family.
- **Easter-egg anecdote — pinned once shown.** Reveals when
  `data-state="deadhead"` with VFD selected and bypass off
  (the canonical failure-mode corner); forward-links
  `vfds.html` and `pump-control.html`, paying off two of the
  page's existing forward-link debts. Same pinned-once-shown
  semantic as the balancing / pump-control / vfds anecdotes.
- **Presets — `design day` (50% / CS / off) and `quiet night`
  (10% / VFD / off).** One-click path to the deadhead corner
  for keyboard or time-strapped readers; standard `.widget-try`
  row at the top of the widget.
- **Deliberately deferred (scope discipline).** No H-Q curve
  canvas (that's `pump-control.html` widget 1's job). No Hz
  or ft anywhere — only `%` on PUMP SPEED / PUMP HEAD.
  Pump-control owns the dimensioned pump-curve teaching. The
  VFD/CS toggle is the *only* place this widget flexes the
  page's "one question" scope — it does so because the bypass
  means very different things on the two pump types and the
  MIN-FLOW lesson collapses if only one type is shown. Future
  reviewers: don't "fix" the absent Hz axis. It's absent on
  purpose.

### Balancing — Education page *(shipped 2026-05-16)*
*One question: how do you make sure every load in a hydronic
system actually receives the design flow it was sized for — and
how do you know when it isn't?*

Closes out the variable-flow trilogy as a quartet (load piping →
VFDs → pump control → balancing). The page inherits forward-link
debts from THREE prior pages — `hydronic-loops.html` (d1 direct-
return "every load needs a balancing valve" callout; d2 reverse-
return self-balancing claim), `load-piping.html` (three-way
constant-flow claim being conditional on balancing), and
`pump-control.html` (DP setpoint reset depending on each load
holding its own flow at low Δp) — and the closing section pays
off all three explicitly.

In scope (sections shipped):
- *A real riser, with balance valves at every branch* — opening
  hook quoting the hydronic-loops d1 half-sentence, plus the
  page's main pipe-flow diagram (4-floor riser, CBV at every
  branch, `.edu-svg` + flow-engine animated, pump in the basement
  with near/far hydraulic-distance callouts)
- *Calibrated Balancing Valves (CBVs)* — what they are, the √Δp
  orifice behaviour, the proportional balancing procedure, where
  they fit (constant-flow good, variable-flow awkward), failure
  modes (trim drift, port clogging, system-change invalidation)
- *Automatic Balancing Valves (ABVs)* — spring-loaded cartridge,
  compensation range, sizing as the load-bearing detail, where
  they fit, failure modes (cartridge stuck, sizing mismatch)
- *Pressure-Independent Control Valves (PICVs)* — control valve
  wrapped around an ABV cartridge, modern default for variable-
  flow, pairing with DP setpoint reset, overkill on constant-
  flow, actuator-failure mode
- *See it side-by-side under varying Δp* — the page's interactive
  widget (Widget structure below)
- *How do you know when the loop isn't balanced?* — diagnostics
  section, `.ref-table` of symptom → meaning → how-to-confirm,
  plus one narrative walkthrough (CBV system + post-descale
  refill drift starves floor 4)
- *Tying it back to the rest of the story* — explicit closing
  tie-backs to hydronic-loops, load-piping, and pump-control,
  plus a forward-pointing callout to the future commissioning page

Out of scope (forward links, not content):
- The commissioning procedure itself — proportional-balancing
  walk-through, sign-off documentation, tooling — [future:
  commissioning.html], referenced in the closing forward callout
- System-level DPBV — covered on `load-piping.html` (cross-link)
- Reverse return as a passive balancing approach — covered on
  `hydronic-loops.html` d2 (cross-link from closing section)
- Coil sizing / mass-flow design ("where does the design flow
  number come from") — [future: coil-selection.html], mentioned
  in the diagnostics section
- Specific manufacturer cartridge curves / Cv math / authority
  algebra — keeps the cross-manufacturer pattern, same scope
  discipline as the vfds page

**Widget — three branches, one slider.** Single slider on
"available Δp across the load branches" (1–60 ft of head; design
point = 20 ft). Three parallel rows — CBV / ABV / PICV — each
sized for the same design flow (30 GPM @ 20 ft Δp) so the only
difference between branches is the valve behaviour. Each row
displays live flow (with US/metric toggle), % of design, a fill
bar with a design-tick at 66.6 % of the 0–150 % scale, and a
state pill (HOLDING / STARVED / OVER) that color-shifts via
`data-state` on the row container. CBV uses pure √Δp orifice
law calibrated at design; ABV holds within a 3–50 ft Δp
compensation range and behaves as orifice outside; PICV holds
above 2 ft Δp and linearly ramps to zero below. CSS prefix
`bal-w-` inline on the page, matching the `pc-w-` pattern from
pump-control.

**Anecdote — extreme-low-pressure reveal.** Trigger fires at
Δp ≤ 4 ft (CBV branch clearly starving, PICV still comfortably
holding). The reveal is the user's actual war story: multi-floor
CBV-balanced heating system, pumps got knocked off setpoint
seasonally, available Δp at the far branches dropped, far-end
coil froze and burst. Once shown in a session, stays pinned (same
semantic as the d3 widget anecdote, pump-control deadhead
anecdote, and vfds classic-mistake reveal). Border-left is `--red`
on the callout rather than `--blue` — heavier visual weight,
because the failure mode under discussion is also more severe
than the gentler "missed-setting" stories on prior pages.

**Per-valve symbol diagrams.** Three small static SVGs (~360 ×
120-150), one above each valve section, showing the distinguishing
feature: CBV gets the handle wheel + position-lock indicator + P/T
ports; ABV gets the spring cartridge inside the body; PICV gets
the cartridge + actuator on top. Not `.edu-svg` — these are
reference schematic snippets, not pipe-flow diagrams, so they
carry a page-local `.bal-valve-fig` wrapper instead.

**Tone — practitioner-heavy, as planned.** Each valve section
follows the same internal rhythm: what it is mechanically / how
it behaves / where it fits (variable-flow vs constant-flow
context handled inside the section, per the valve-type spine
decision) / how the trade actually uses it / what goes wrong.
Section depth ~5 paragraphs each, matching pump-control's
rhythm. Diagnostics section uses the symptoms-table-plus-narrative
format (Round 3 answer); narrative case is a CBV system whose
post-descale refill silently invalidated the original balance,
caught on a manometer walk.

**Forward-link debts this page incurred:**
- `[future: commissioning.html]` — the explicit scope cut. Closing
  callout names it as "Coming later: a lesson on commissioning."
  When that page ships, it should tie back here for the
  conceptual half ("balancing as equipment-and-procedure" lives
  here; "balancing as job-site activity" lives there).
- `[future: coil-selection.html]` — mentioned in the diagnostics
  intro as the upstream source of the design-flow number. When
  it ships, the balancing page can be cross-linked back.

**CSS / pattern notes for the next Education page:**
- Widget chrome is yet another instance of the
  `recessed --surface-3 panel` + `mono section labels` + `blue
  readouts` + `anecdote callout with min-height reservation`
  pattern. Third Education widget after pump-control's two, plus
  vfds's run/speed widget and hydronic-loops' d3 injection-pump
  widget. The five widgets now share enough visual vocabulary
  that promoting `.pc-w-*` / `.bal-w-*` / `.vfd-w-*` to a shared
  `.edu-w-*` rule set in `styles.css` is starting to look like a
  next-restructure-pass candidate. Not urgent (each page's prefix
  reads cleanly); flag for when the sixth widget shows up.
  *(Followed up 2026-05-16: shared shell extracted to `.widget-*`
  in `styles.css` as Block C #5 — see codebase-issues.md. Each
  page's `.pc-w-*` / `.bal-w-*` / `.vfd-w-*` / `.vfdm-*` /
  `.d3-w-*` prefixes still cover the page-unique internals — LCDs,
  keypads, branch rows, valve pills, fan icons, temp swatches,
  pump-curve canvases. The "sixth widget" trigger above is
  effectively retired.)*
- The `data-state` attribute on the branch row, swapping border /
  bar fill / state-pill colour, is a clean idiom worth reusing
  for future state-driven widgets. Same idea as the
  `flow-engine`'s `flow-active` CSS hook.

**Forward-link payoffs landed (this session).** Same convention as
pump-control's "Forward-link payoffs landed" subsection — when a
new page ships, sweep prior pages that forward-linked to it (or
naturally mentioned the topic) and convert plain-prose mentions to
active anchors per the "anchor only if the target exists today"
rule. Three prior pages updated in this pass:
- `load-piping.html` (the strongest debt) — the section-3 callout
  was previously plain prose ("...will get its own lesson here when
  it's written"). Now anchors to `balancing.html` with a one-sentence
  frame of what the lesson covers.
- `hydronic-loops.html` d1 and d2 — both naturally mention
  "balancing valve(s)" in their closing prose. The phrase is now
  an active anchor on each. No prose rewriting needed; just the
  anchor.
- `pump-control.html` "Tying It Together" closing — extended with
  a one-sentence addition framing balancing as the load-side detail
  underneath the variable-flow trio, and explicitly noting that
  PICVs are the natural pairing for aggressive DP-reset. Threads
  balancing into the variable-flow story without rebuilding the
  closing paragraph.

**Review-pass findings (post-ship 2026-05-16).** A focused review
after the page first shipped surfaced four issues, all fixed in
the same session:
1. *Missing CSS classes referenced in prose.* The widget intro
   paragraph used `<span class="bal-w-tag-design">HOLDING</span>`
   (and the starved/over equivalents) to colour-prime the reader
   on the state vocabulary they were about to encounter — but
   those classes were never defined, so the spans rendered as
   plain inline text. Added `.bal-w-tag-holding` /
   `.bal-w-tag-starved` / `.bal-w-tag-over` to the widget style
   block, mirroring the per-state colours used by
   `.bal-w-branch[data-state="*"]` further down. Lesson: every
   class name written into prose has to exist in the stylesheet,
   and visual prose review (without rendering) can miss this.
2. *Grammar in the same paragraph.* "Hold each branch at design
   (HOLDING) is the goal" parses as a broken sentence. Rewritten
   to lead with the state definitions: "HOLDING means flow is
   within ±15 % of design; STARVED is below 85 %; OVER is above
   115 %." Same information, sentence works.
3. *Slider foot labels weren't unit-toggle aware.* The "1" and
   "60" min/max labels under the slider were hardcoded ft values
   — switching the global units toggle to metric would have left
   them at "1" and "60" while the live readout above moved to m.
   Added `data-us` / `data-metric` attributes so the units walker
   rewrites them ("1 ft" ↔ "0.3 m", "60 ft" ↔ "18 m"). **General
   lesson for future widgets:** every visible unit-bearing number
   needs the toggle hooks, not just the live readout. Audit
   widget chrome for absolute axis / range labels alongside the
   live values.
4. *One flow arrow drawn the wrong way.* The pump-to-supply leg
   at the bottom of the riser (line `bal-riser-pump-to-supply`)
   is drawn right-to-left (from x=385 to x=200) since flow leaves
   the pump and enters the supply riser. The corresponding arrow
   polygon at (300, 460) was authored with apex at x=309 (pointing
   right) instead of x=300 (pointing left). A single-coord swap
   fixed it. Same pattern as the "animating a diagram audits its
   static markup" lesson recorded in the animation policy — even
   without an animation pass, every arrow on a complex diagram
   benefits from a tracing-the-flow walk-through during review.

### Protocol education pages — Modbus shipping, BACnet to follow

The site's education footprint was HVAC + hydronics heavy through
2026-05; building-controls work is at least as protocol-heavy. The
protocol-side tools (BACnet/IP converter, Modbus register viewer)
shipped first; this section is where their paired explainers live.
**Nav-placement open question settled (2026-05-23):** pages land
under `/education/` alongside the HVAC pages. Reading-order argument
won — adding a third top-nav hub would crowd Tools / Education /
Contact, and discoverability is paid by tool-page cross-links.
A new `Protocols` filter-chip was added to `/education/` so the
chip grid still gives the protocol pages a one-click pull-out.

### Modbus Basics — Education page *(shipped 2026-05-23)*
*One question: what is Modbus, and what shape does a request on the
wire actually take?*

The first protocol explainer, paying the Modbus Register Viewer
tool's forward-link debt — its five-bullet "essentials" row closed
with *"A fuller Modbus education page is on the roadmap"* and now
points at this page. Scoped per the friction file's two-page split
(decided during this scoping pass): page 1 covers the message shape
and the data model; page 2 (`modbus-decoding.html`, future) will
cover what the sixteen bits returned in a successful response
actually mean.

In scope (sections shipped):

- *What Modbus is, and isn't* — Modicon 1979, function codes + data
  model, the RTU-vs-TCP framing-only difference, the "dumb on
  purpose" framing, client/server polling pattern (modernizing the
  master/slave terminology in one parenthetical). Static SVG of the
  client→request, server→response flow.
- *The four data tables* — coils / discrete inputs / input registers
  / holding registers, sorted along read/write × 1-bit/16-bit.
  Rendered as a `.callout-grid` of four cards in the
  function-blocks-page idiom rather than a 2×2 matrix SVG — the
  callout-grid carries the same information with less custom markup
  and matches the precedent.
- *Function codes — reading and writing* — FC01–06/15/16 pattern
  (single vs multiple, coil vs register), with FC03/04/06/16 named
  as the BMS-frequent quartet. Defers the full FC table to the
  Modbus tool's reference panel rather than reprinting it. Static
  SVG of an FC03 request frame (eight labeled byte cells: server,
  FC, starting address ×2, quantity ×2, CRC ×2) with grouping
  brackets and a worked caption.
- *When something goes wrong — exception responses* — the high-bit-
  set FC echo (`0x03` → `0x83`), the one-byte exception code, the
  four most-common codes in BMS work (`0x01`–`0x04`) explained with
  a typical scenario each. Static SVG of a three-byte exception
  frame with the high-bit byte highlighted in `--red` and an
  annotation arrow.

Out of scope (forward links):

- Byte order / 32-bit pairs / scaling / signed vs unsigned / 5-digit
  vendor numbering — `modbus-decoding.html`, the second page of this
  pair (forward-linked in the closing section as plain prose since
  the target page doesn't exist yet; the closing also anchors back
  to the Modbus Register Viewer tool as the practitioner cheat
  sheet).
- BACnet's object-property model as the *anti*-Modbus design choice
  — `[future: bacnet-basics.html]`, contrasted only by a single
  parenthetical ("A BACnet object knows its own type, units, scale,
  and name; a Modbus register is just sixteen bits") rather than a
  scoped section.
- Modbus RTU CRC computation, RS-485 multidrop wiring, baud-rate
  config — `[future: modbus-wire.html]` if demand surfaces. v1 stays
  protocol-logic-only; the wire details are a different question.

**Widget decision — drafted out.** The framing-widget candidate
(pick an FC, see the request/response frame shape) was considered
during scoping and not built. The static FC03 request-frame SVG +
the exception-frame SVG carry the byte-structure story on first
read; the practitioner-grade interactive lives one click away on
the Modbus Register Viewer tool already. The friction-file's
Education/Tools-split idiom — the page can defer to the tool rather
than ship a stripped-down twin — held here.

**Page-local CSS — `.mb-svg`.** Block-and-byte schematic class, in
the `.fb-svg` / `.vfd-svg` precedent (labeled-box diagrams, not
pipe-flow). Separate from the `.edu-svg` family. Local
`.callout-grid.loose` selector reuses the function-blocks-page
idiom for the families grid; not promoted to `styles.css` since
two pages share it and a third would be the consolidation trigger
(same posture as `.fb-svg` taking its time before earning a shared
class).

**Forward-link debts this page incurred:**
- `modbus-decoding.html` — **paid 2026-05-23.** The closing section's
  plain-prose forward-link is now an active anchor; see the next
  entry for the companion page.
- `bacnet-basics.html` — **paid 2026-05-23.** The "A BACnet object
  knows its own type, units, scale, and name" parenthetical now
  anchors to the shipped BACnet Basics page; same paragraph stays
  short on this page since the contrast grew into a section over
  there rather than expanding here.
- `modbus-wire.html` — sketched here as the third Modbus page if
  demand surfaces (RS-485 / CRC / timing). No prose mention on
  the page itself — the topic is parked entirely in this entry.

**Forward-link payoffs landed:**
- Modbus Register Viewer tool — the *"A fuller Modbus education
  page is on the roadmap"* paragraph (`html/tools/modbus-register-viewer.html:179–184`)
  becomes an active anchor to this page. After the decoding page
  shipped, the same paragraph now anchors *both* pages — Basics
  for the protocol shape, Decoding for the bit-interpretation
  gotchas.

### Modbus Decoding — Education page *(shipped 2026-05-23)*
*One question: I read a Modbus value successfully — why don't the
numbers make sense?*

The companion to Modbus Basics. Pays the second half of the Modbus
tool's five-bullet "essentials" forward-link debt — the bullets on
register addressing, signed/unsigned, byte order, and the implicit
scaling that vendor docs encode. Together with Modbus Basics, this
closes the Modbus integration loop from "how do I form a request"
through "how do I trust the number on the graphic."

In scope (sections shipped):

- *The 5-digit numbering trap* — the prefix names the table, the
  remaining four digits are 1-based, wire address = documented − 1.
  Static SVG with the leading digit (table prefix) highlighted in
  `--accent` and the offset rows showing the translation. Side note
  on the 6-digit extended form and the Modicon-style "wire-address"
  docs that drop the prefix entirely.
- *Signed vs unsigned interpretation* — two's complement in one
  paragraph, the canonical `0xFFF3` example (`65523` unsigned vs
  `−13` signed), the "negative-as-unsigned misread" failure signal
  (values jumping near 65535), and where each interpretation tends
  to live in HVAC kit.
- *32-bit values and the four byte orders* — bytes labeled A/B/C/D
  in the standard transmission order, four orderings (ABCD / CDAB /
  BADC / DCBA) shown as a four-row SVG of which bytes land in which
  register, followed by a four-card `.callout-grid` naming each.
  Cross-links the Modbus Register Viewer tool's 32-bit Pair tab as
  the practitioner-grade interactive — "figure out once per device,
  document it" framing.
- *Scaling and engineering units* — the raw-integer-to-engineering-
  value jump. Static SVG of `523 × 0.1 = 52.3 °F`, then a four-
  pattern list (implicit decimal, offset + scale, native unit,
  packed multi-field). Closes with the "wrong scale tag is worse
  than meaningless" failure: a 0.1-scaled signed register read
  unsigned reads `6553.5` when the truth is `−0.1`.

Out of scope (forward links):

- Modbus RTU on the wire (RS-485, CRC, framing timeout) —
  `[future: modbus-wire.html]`. Same parking spot as on the Basics
  page; named on this page in the closing "what this page didn't
  cover" section.
- The integration story (Niagara / EBO point-mapping, poll rates,
  stale-data flags) — platform-specific, belongs on the eventual
  Niagara / EBO pages.

**Widget decision — drafted out (same as Basics).** The framing-
widget candidate was considered and not built. The byte-order
interactive already lives on the Modbus Register Viewer tool's
32-bit Pair tab; per the Education/Tools-split idiom, the teaching
page diagrams the four orderings statically and cross-links the
tool for the interactive form. Four static SVGs carry the page
(5-digit translation, signed/unsigned branching, byte-order matrix,
scaling arrow).

**Page-local CSS — `.mb-svg` reused.** Same `.fb-svg` / `.vfd-svg`
precedent as Modbus Basics; class is now defined on two Modbus
pages (and not consolidated to `styles.css`). The third page —
either `modbus-wire.html` or a future BACnet-side equivalent —
would be the consolidation trigger.

**Forward-link debts this page incurred:**
- `modbus-wire.html` — the third Modbus page, sketched in the
  closing section. Named, not anchored, since the page doesn't
  exist yet. Carries the RS-485 / CRC / timing story.
- Niagara / EBO integration pages — named in the closing section
  as plain prose. No `[future:]` marker because these are
  larger-arc Tridium / Schneider pages, not pinpoint forward-link
  targets.

**Forward-link payoffs landed:**
- `modbus-basics.html` closing — the plain-prose "a second Modbus
  page on decoding will land here" forward-link is now an active
  anchor to this page.
- Modbus Register Viewer tool — the `ref-note` beneath the
  essentials row now anchors both Modbus pages, framing them as the
  paired explainer for the five-bullet field cheat sheet.

### BACnet Basics — Education page *(shipped 2026-05-23)*
*One question: what is BACnet, and what does a conversation between
a controller and a device actually look like?*

The third protocol explainer (after the Modbus pair), paying the
BACnet/IP Hex Converter tool's forward-link debt. Scoped per the
"one question per page" rule (decided during this scoping pass): the
BACnet surface is large enough that a single page exceeds the four-
item in-scope ceiling, so the protocol explainer ships as a pair —
this page covers the object model + services + priority array +
discovery; the companion (`bacnet-networking.html`) covers the
addressing / BBMD / hex-blob side. The modbus-basics "one
parenthetical comparison" grew into the `What BACnet is, and isn't`
section here rather than staying parenthetical.

In scope (sections shipped):

- *What BACnet is, and isn't* — ASHRAE 135 since 1987, the self-
  describing object model as the defining contrast with Modbus
  (parenthetical from modbus-basics grew to a paragraph), the
  multiple-data-links framing (MS/TP / IP / SC / Ethernet — protocol
  logic identical across them).
- *Devices, objects, properties* — the three-layer nesting; device
  instance numbers (0–4,194,302); Object_Identifier encoded as
  10-bit type + 22-bit instance but written human-readable
  (`AI:3`); the property list as where actual data lives. Static
  SVG of a device box containing object boxes with one object
  exploded to its property list. Four-card `.callout-grid` for the
  object-type families (Analog / Binary / Multi-state / Device).
- *The services you'll see* — `ReadProperty`, `WriteProperty`,
  `ReadPropertyMultiple` / `WritePropertyMultiple`, the
  `SubscribeCOV` + `ConfirmedCOV-Notification` push pair (with the
  push-vs-poll contrast to Modbus), `Who-Is` / `I-Am` named here
  and expanded in §5. The thirty-five-services-in-the-standard
  number called out so the reader knows the listed five are a
  practitioner shortlist, not the full set.
- *The priority array — BACnet's command stack* — dedicated H2,
  per scoping decision. 16-slot array, lowest-non-null wins,
  `Relinquish_Default` as the floor, conventional slot ownership
  (life-safety = 1, manual override = 8, BMS sequence = 16, slots
  9–15 free, slots 6/7 reserved). Worked example: BMS at slot 16
  writes 65 %, tech overrides at slot 8 with 0 %, resolved value
  is 0 %; writing null to slot 8 releases the override and value
  drops to 65 %. Tall static SVG of the 16-slot stack with slot 8
  and slot 16 highlighted and an arrow to the resolved
  Present_Value. Closes with the "value on the graphic is the
  resolved value, not what the sequence writes" practitioner trap.
- *Who-Is / I-Am — how devices announce themselves* — the
  broadcast / reply pair, optional device-instance range on
  Who-Is, what I-Am carries (instance + max APDU + segmentation
  + vendor ID). Static SVG of one client → three-device fan-out
  with Who-Is broadcast and three I-Am replies. Closes by setting
  up `bacnet-networking.html`'s BBMD section as "what happens
  when discovery has to cross a router."
- *MS/TP vs BACnet/IP — same protocol, different transport* —
  short H2 acknowledging both data links. RS-485 token ring vs
  UDP/47808 (0xBAC0). Defers token-rotation / `Max_Master` /
  `Max_Info_Frames` / baud / cable limits to
  `[future: bacnet-mstp.html]`. Static SVG of the two framing
  stacks side-by-side, with the shared NPDU+APDU payload below a
  bracket marking the data-link wrapper.

Out of scope (forward links):

- BBMD / Foreign Device Registration / the three layers of
  addressing / the BVLL+NPDU+APDU frame breakdown / the EBO hex
  blob — `bacnet-networking.html`, the second page of this pair
  (forward-linked from the closing "what this page didn't cover"
  section and from the MS/TP-vs-IP section as a live anchor).
- MS/TP deep mechanics — `[future: bacnet-mstp.html]`. Token
  rotation, master polling, baud rates, segment limits. Named in
  both the MS/TP-vs-IP section and the closing.
- Priority-array deeper mechanics (writeable `Relinquish_Default`,
  command prioritization under heavy override, the standard's
  full slot reservation table) — `[future: bacnet-priority.html]`
  if demand surfaces. The current section names slots 1 / 8 / 16
  and waves at the rest.
- Alarms / event notifications, schedules, calendars, trend logs,
  file / group / loop / notification-class objects — named in the
  closing as out-of-scope. Each likely its own future page.

**Widget decision — drafted out (same as Modbus pages).** A priority-
array interactive (16-slot panel, type values into slots, watch
Present_Value resolve) was considered during scoping. The static
16-slot SVG with the worked-example arrow carries the concept on
first read; consistency with the Modbus pages' pure-prose +
static-SVG posture wins. Revisitable if the section reads weak in
review.

**Page-local CSS — `.bac-svg`.** Block-and-byte schematic class
following the `.mb-svg` / `.fb-svg` / `.vfd-svg` precedent.
Currently defined on both BACnet pages (and not consolidated to
`styles.css`); a third BACnet-side page would be the consolidation
trigger.

**Forward-link debts this page incurred:**
- `bacnet-networking.html` — **paid 2026-05-23.** The closing
  section's forward-link to the companion page is an active anchor;
  see the next entry.
- `bacnet-mstp.html` — named in §6 (MS/TP vs IP) and in the closing.
  The page doesn't exist yet; topic parked entirely in this entry.
- `bacnet-priority.html` — named in the closing as the eventual
  destination for deeper priority-array mechanics.

**Forward-link payoffs landed:**
- BACnet/IP Hex Converter tool — the `BACnet/IP Port Reference`
  card's `ref-note` paragraph (`html/tools/bacnet-ip-converter.html`)
  gained a second `ref-note` that anchors both BACnet pages: this
  one for the object-model side, BACnet Networking for the BBMD /
  hex-blob context.
- `modbus-basics.html` — the parenthetical "A BACnet object knows
  its own type, units, scale, and name" is now an active anchor to
  this page; the parenthetical itself stayed short here since the
  contrast grew into a full paragraph in §1.
- `vfds.html` — the "speed-reference AV (a BACnet Analog Value
  object)" sentence in the run-vs-speed-source section now anchors
  to BACnet Basics, paying the long-standing debt of naming a
  BACnet-specific object type without an explainer to back it up.
  (Single-link policy held: the other seven BACnet mentions on
  vfds.html stay plain prose.)

### BACnet Networking — Education page *(shipped 2026-05-23)*
*One question: how do BACnet devices find each other on real
networks, and why does discovery sometimes silently fail?*

The companion to BACnet Basics. Pays the BACnet/IP Hex Converter
tool's primary forward-link debt by explaining the EBO hex blob in
context — what each byte is doing, why the port suffix is usually
omitted, and what makes the converter exist in the first place.
Together with BACnet Basics, this closes the BACnet integration
loop from "what is an object" through "why doesn't this device show
up in my discovery scan."

In scope (sections shipped):

- *Three addresses, one device* — device instance (application
  layer, 22-bit identifier, the only one that's forever), network
  number (network-layer 16-bit segment ID; `0` = local, `65535` =
  broadcast-everywhere), MAC (data-link: 6 bytes on BACnet/IP =
  IPv4+UDP-port, 1 byte on MS/TP = station address). Static SVG of
  a controller box with three labeled arrows pointing inward, each
  identifier at its layer.
- *The BACnet/IP frame — BVLL + NPDU + APDU* — the three nested
  layers. BVLL: type byte `0x81`, function (`0x0A` Original-Unicast,
  `0x0B` Original-Broadcast, `0x04` Forwarded-NPDU), length, and
  the originating IP+port on a Forwarded-NPDU. NPDU: version,
  control, optional dest/src network-number + MAC fields, hop
  count. APDU: PDU type + service body. Static SVG of an annotated
  Forwarded-NPDU Who-Is frame with the BVLL function byte
  highlighted in `--accent` and a bracket explanation.
- *BBMDs — broadcasts across an L3 boundary* — the practitioner
  meat. Routers drop UDP broadcasts; BBMDs capture local broadcasts
  and unicast Forwarded-NPDUs to peer BBMDs whose IPs sit in the
  BDT (Broadcast Distribution Table); peer BBMDs re-broadcast
  locally. Static SVG of two subnets + router + two BBMDs + BDTs +
  the four-step path of a Who-Is from subnet A reaching a device
  on subnet B. Closes with the symmetric-BDT discipline rule and
  the "one BBMD per subnet" loop-prevention rule.
- *Foreign Device Registration — joining from outside* — when a
  device has no local BBMD, it registers with one on another
  subnet via `Register-Foreign-Device` (carrying a TTL) and the
  BBMD's FDT (Foreign Device Table) gains an entry; forwarded
  broadcasts then unicast to the foreign device. Static SVG of a
  remote workstation across a WAN registering with a BBMD; the
  FDT entry; subsequent forwarded-broadcasts back. Closes with
  the TTL-expiry trap (the "I could see this yesterday and now I
  can't" failure mode).
- *Reading the hex blob EBO shows you* — the converter-tool
  forward-link payoff in section form. Walks `C0A80164BAC0` as a
  side-by-side decode: `C0 A8 01 64` → `192.168.1.100`,
  `BA C0` → `0xBAC0` = port `47808`. Notes the 8-vs-12 character
  convention (port suffix omitted on default; present when on a
  non-default port per Annex J's sequential-port convention).
  Cross-links the converter tool as the live decoder.
- *When discovery silently fails* — bulleted-paragraph list of
  what to check in roughly the field-incidence order: no remote
  BBMD; asymmetric BDT; UDP-47808 firewall block; network-number
  collision; BBMD on wrong VLAN; expired FDR TTL; two BBMDs on
  one subnet (the storm condition); Max APDU mismatch on
  segmented replies. Modbus-Decoding's closing-section
  practitioner-trap energy.

Out of scope (forward links):

- MS/TP on the wire — `[future: bacnet-mstp.html]`. Token rotation,
  `Max_Master`, `Max_Info_Frames`, baud rates, cable / device-count
  limits. Named in the closing.
- Segmentation of long messages — `[future: bacnet-segmentation.html]`
  if it earns a page. The discovery-fails list mentions it; depth
  belongs elsewhere.
- BACnet/SC (Secure Connect) — `[future: bacnet-sc.html]`. Different
  framing, different (hub-and-spoke) discovery story; deserves its
  own page once it's common enough in BAS work.
- Capture-driven troubleshooting — `[future: bacnet-wireshark.html]`.
  Walking a Wireshark capture, naming Forwarded-NPDU vs
  Original-Broadcast on the wire, reading Abort / Reject PDUs.
  Named in the closing.
- Alarms and event notifications — their own future page; touches
  the largest object-model surface outside the analog/binary/multi-
  state core (Notification Class object, recipient lists,
  confirmed/unconfirmed alarm services).
- Vendor profile differences (Niagara / EBO / Distech / Honeywell
  exposing the same object types differently) — platform-specific,
  belongs on the eventual per-platform pages.

**Widget decision — drafted out (same as Modbus + BACnet Basics).**
A live BBMD-topology visualizer was considered (drag two BBMDs into
a network, watch a Who-Is fan out) and not built. Five static SVGs
carry the page (three-addresses, Forwarded-NPDU frame, BBMD
worked-example, FDR workstation, hex-blob decode). The Education /
Tools-split idiom holds: the interactive form for the hex-blob
decode lives on the BACnet/IP converter already.

**Page-local CSS — `.bac-svg` reused.** Same definition as
`bacnet-basics.html`; the class is now defined on two BACnet pages
in addition to the two Modbus pages defining `.mb-svg`. The
consolidation trigger for both class families is a third page in
either family — at that point both classes likely move to
`styles.css` together as one block-and-byte-diagram block.

**Forward-link debts this page incurred:**
- `bacnet-mstp.html` — sketched in the closing section. Carries the
  MS/TP wire story.
- `bacnet-segmentation.html` — named in the discovery-fails list
  and in the closing. Segmentation deserves its own treatment.
- `bacnet-sc.html` — named in the closing. The transport is rare
  enough today that this page can wait.
- `bacnet-wireshark.html` — named in the closing. A capture-driven
  troubleshooting walkthrough is more pedagogically dense than the
  current discovery-fails list can carry.

**Forward-link payoffs landed:**
- `bacnet-basics.html` closing — the forward-link to this page is
  now an active anchor.
- BACnet/IP Hex Converter tool — same `ref-note` paragraph as the
  Basics entry's payoff: this page anchors there for the BBMD /
  three-addresses / frame-breakdown context that the hex-blob
  decoding sits inside.

Lower-priority candidates still parked here for completeness:

- *Niagara Fox / Niagara N4* — tighter audience (Tridium
  ecosystem), but field reality is that many BAS techs see Fox
  more often than BACnet on the wire.
- *LonWorks / KNX* — sketched only. Possibly a single "legacy and
  European protocols" page at tour-level depth, deeper pages
  following if demand surfaces.

---

## Redesign — dark-industrial two-register language

### Phase 1b — design-language distillation *(shipped 2026-06-06)*

The whole-site redesign (agreed 2026-06-05) commits *harder* to the
operator-console / BAS identity instead of modernizing toward generic
SaaS. The **language is locked** ("spike v4", iterated live with the
user): **two registers used semantically.**

- **Software register = the default chrome** — "Niagara AX with a dark
  mode": cool blue-slate, AX-sharp (square corners via `--rail: 0`, hard
  1px seams, flat fills, no floating shadows). Green = brand/action,
  blue = data/selection. Carries the whole site.
- **Equipment register** — warm device face + positive-mode dot-matrix
  character LCD (lit olive backlight, dark ink, 3px pixel mesh; no
  scanlines, no glow). Used ONLY where a page depicts real hardware.
  Constant across both themes.
- **Dual theme, dark-default.** `:root` = dark; `[data-theme="light"]`
  ≈ the old look. Honors `prefers-color-scheme` on first load; a nav
  toggle mirrors the units pattern (`cf_theme`, before-paint bootstrap,
  `theme.js` loaded site-wide). Note: the AX-sharp *shape* (square
  corners) is theme-independent, so the light theme is now also
  square-cornered — the one deliberate divergence from "light = exactly
  the old look."

What shipped in Phase 1b (this branch): the dual-theme token system +
the AX-sharp shape sweep in `styles.css`; the `EQUIPMENT REGISTER`
component block (`.device` / `.lcd` / `.gauge.eq` / `.keypad` / `.led`);
the nav theme toggle + `theme.js` + head bootstrap; the token-driven
body graticule; and `/styleguide.html` — a noindex living reference
that exercises both registers in both themes. The token flip carried
essentially the whole site automatically because pages already
reference `var(--*)` (only two inline-style pages hardcode colours).

**Held back from this phase (Phase 3, per the lock):**

- **Home hero was on hold** (now SHIPPED — see "Phase 2 — the home hero"
  below). The living control-loop was set aside; the merge *intent* (one
  image spanning software↔equipment) survived and became "the seam."
- **Per-page dark polish** is deferred (logged in `codebase-issues.md`):
  `vfd-mock` adopting the shared `.device`/`.lcd` classes (its LCD still
  reads as a software panel, not the olive equipment look — it themes
  fine via tokens, just isn't the new register yet); the two
  hardcoded-colour inline-style pages (`psychrometric-chart`,
  `function-block-editor`); the hardcoded-rgba tints in `styles.css`
  that lose effect on dark; the legacy `.lcd-scanline` (one consumer);
  and promoting the styleguide-local `.tree` / `.wiresheet` / `.trend`
  to shared once a production page adopts them.

Authoritative spec: the `project_site_redesign_dark_industrial` memory.

### Phase 3 — dark polish *(shipped 2026-06-06)*

The per-page fit-and-finish deferred from Phase 1b (`codebase-issues.md`
#77; branch `issue-77/dark-theme-polish`). Nothing was broken on dark —
this was the polish pass that made every page *feel* finished on the new
default theme.

- **vfd-mock is the first production page to adopt the equipment
  register.** Its left "Drive Front Panel" column is now a real device
  face — `.device` bezel, positive-mode olive dot-matrix `.vfdm-lcd`
  (the `--lcd-*` tokens + 3px multiply-blended pixel mesh), embossed
  plastic keypad (green RUN / red STOP). The right "Motor Response"
  column stays software register. That left/right split *is* the
  software↔equipment seam the redesign is built around — the VFD page
  now demonstrates it in miniature. The equipment face is identical in
  light and dark (a device is a device).
- **Off-palette washes tokenized.** Three breathing/lift box-shadows
  (`.psy-chip`, `.fbe-block`, the shared `.bas-breathe`) hardcoded the
  *light* green and faint-black; re-expressed via `--accent-*` /
  `--bevel-lo`. The static tints (`.ref-table` row hover → `--blue-dim`;
  quiz wrong-answer → the new `--red-dim` token, parallel to
  `.correct`'s `--accent-dim`; `.ref-table-dense` zebra →
  `--surface-2`) now flip with the theme.
- **Canvas pages redraw on theme toggle.** `theme.js` had broadcast a
  `themechange` event since Phase 1b, but nothing listened — so the
  three `<canvas>` surfaces (psychrometric, pid-tuner, pid-basics),
  which read tokens at *draw* time, kept the old palette until a
  resize/reload. Each now subscribes, mirroring its existing
  resize→redraw (the unit handlers only refresh text — the engines are
  canonical — so resize, not `unitschange`, is the right mirror).
- **Legacy `.lcd-scanline` removed** (vfd-mock was its only consumer;
  the locked language uses the dot-matrix mesh instead). `.lcd-flicker`
  kept — it's the live value-change refresh cue (motion = data).
- **Education diagrams verified on dark** — clean. The "literal-hex
  fallbacks" the issue worried about were already gone (Phase 1b's
  `var(--x)` canonicalization removed every `var(--x,#hex)`).

Deferred (unused / no-consumer shared rules → `codebase-issues.md`
#78): consolidating `.bas-breathe` with the psy-chip variant;
tokenizing the unused `.bas-led.fault`/`.warn`; promoting the
styleguide-local `.wiresheet` (the function-block editor has its own
complete `.fbe-*` wiresheet, so no consumer). *(The `.tree`/`.trend`
half of #78 was resolved by Phase 2 — the hero is their first
production consumer.)*

### Phase 2 — the home hero, "the seam" *(shipped 2026-06-06)*

The redesign capstone (v3.0.0), and the last phase to land even though
it carries the lower number — the hero concept stayed open while the
language + polish shipped first, by design. Three concepts were
sketched (live operator workbench / interactive controller with
tooltips / "the seam"); the user picked **the seam**: the site's whole
premise as one live instrument — a **software supervisor** (Niagara
point-tree + PV-vs-SP trend, software register) on the left reading a
**field controller** (olive dot-matrix LCDs + valve gauge + LEDs,
equipment register) on the right, a dashed conductor with a feedback
packet crossing between them. It says *this site spans the software AND
the equipment it controls* in one image — and it's the merge-intent
that survived the abandoned control-loop hero.

Key decisions (live design dialogue, screenshot-driven):
- **Runs a real loop, not a looping animation.** A small AHU
  supply-air loop: the **setpoint steps at randomized intervals** and
  the supply-air temp chases it while the cooling valve modulates
  proportionally (colder target → more valve; off-setpoint → drive
  harder). The trend plots **PV (blue) vs setpoint (green dashed)** so
  the chase reads as a control loop to an engineer and as cause→effect
  to a newcomer. Tree, LCDs, gauge, trend, and the packet all read one
  shared state. Motion = process (the hard rule); reduced-motion gets a
  static, already-populated frame; the stage is `aria-hidden` and the
  copy carries the accessible content.
- **An inner labeled frame** (`LIVE · AHU-1 SUPPLY-AIR TEMPERATURE
  LOOP` head + a one-line legend) gives a newcomer context without the
  home page becoming a lesson.
- **Copy ditches the generic shape** — the old eyebrow → 2-color H1 →
  centered paragraph → badge row is gone. Now: a single-weight mono H1
  (still the page's one `<h1>`), the "tight & blunt" paragraph, and a
  full-width copy grid (title spans; paragraph + CTAs side by side;
  Latest on its own full-width line below).
- **Built from the existing kit** — the equipment classes (vfd-mock's
  register) + the promoted `.tree`/`.trend`; no new framework, vanilla
  inline IIFE, ~no perf cost. Removed the now-dead legacy hero CSS
  (`.hero-body`/`-eyebrow`/`-onramp`/`-badges`/`.badge`); that stray
  `.badge` had also been leaking a box onto the equipment device
  badges (now correctly borderless).

This closes the four-phase redesign (1a spike → 1b distill → 3 polish →
2 hero). Authoritative spec: the `project_site_redesign_dark_industrial`
memory.

---

## Site structure / organization
### Where interactive widgets live

Three sections, three jobs:

Tools = calculators, converters, lookups. Pull-it-up-and-use-it
utilities. Standalone, get a Tools-landing card, show up in "Coming
Soon" while pending.

Simulators = running models you can play with. PID Tuning Helper,
Mock VFD Interface, Function-Block Editor. They sit in their own
section rather than under Tools because they're for *playing with
a model*, not *looking something up*. Each one is paired with an
Education explainer (`pid-basics`, `vfds`, `function-blocks`).

Education = prose + diagrams + sometimes interactive widgets that exist
to teach a specific concept. The PID mini-sims (P only → P+I → P+I+D)
and the Twin-T injection-pump widget on Hydronic Loops are on Education
pages on purpose — the widget *is part of the explanation*, not a
standalone simulator, and it gets read in sequence with the prose
around it.

The rule: standalone "open it and use it" cases go to Tools.
Standalone "open it and play with the model" cases go to Simulators.
Teaching widgets stay in Education and don't get their own landing
card. If a piece of interactive content is useful both ways, the
full simulator goes to Simulators and a stripped-down teaching
version goes to Education (the PID tuner is the worked example of
this split).

### Simulators section — split out from Tools *(2026-05-23)*

Originally `/tools/` was the home for everything interactive, simulators
included. With three sims shipped (PID tuner, Mock VFD, Function-Block
Editor) the Tools landing started reading as two unrelated lists
stapled together — utilities you check numbers in, vs. models you
play with. Moving the sims to `/simulators/` sharpens the conceptual
split, lines up the new section's pages with their Education partners,
and gives the future refrigerant-loop sim a clear home.

The move:
- `git mv` of the three pages from `html/tools/` to `html/simulators/`;
  canonicals and `nav:` frontmatter retargeted.
- New `html/simulators/index.html` landing — same `.nav-card` grid as
  `tools/index.html` minus the filter-chip row (three cards don't
  warrant filtering; add it back if the section grows past ~6).
- Nav slot inserted between Tools and Education — keeps the two
  "doing" sections adjacent.
- `LEGACY_TOOL_REDIRECTS` block in `src/worker.js` 301s the three
  old `/tools/<slug>.html` URLs to their new `/simulators/`
  equivalents so any inbound links keep working.

Next sim on the radar is a refrigerant-loop sim, paired with the
refrigerant-cycle Education page (entry above under "Refrigerant cycle
— Education section, possibly with calculator"). When it ships, the
filter-chip question on the landing will resurface — re-evaluate then.

### Schematic-bg chrome — gutter as-builts, hero-frame nav cards, discrete-pulse mode *(shipped 2026-05-23)*

A major chrome overhaul on top of the existing v2.0 workstation
aesthetic — not a new tool or page, but a new visual identity that
runs across every page. Four shipped pieces:

**1. Gutter schematic-collage.** Two narrow SVG strips, one in each
side gutter (`_includes/schematic-bg.njk`), each holding ~60
inline-SVG motifs drawn from a six-element library. Original library
shipped 2026-05 as: pipe-valve, pump-coil, AI/AO terminals, BI/BO
terminals, logic-chain (TMR / AND / PID blocks), BACnet/IP node;
sweep-refreshed 2026-05-24 (PRs #126–132) to: 3-way diverting valve
+ coil + bypass, closed-loop pump-coil with supply + return,
compare-bo (AI₁ > AI₂ → BO1), and-bo (BI₁ AND BI₂ → BO1),
current-loop (PSU/TX/AI 2-wire 4-20mA), supervisor (JACE + AHU/VAV/BLR
star). Motifs cycle through a sequence with a 270px stride (bumped
from 230 to accommodate the taller pipe-valve), two staggered
sequences (left vs right) so a wide viewport never shows a mirrored
pair. The strips sit at `z-index: -1` inside body's stacking context —
above the blueprint grid background, below every content surface.

*Why gutter, not background.* The blueprint grid was already
established (v2.0.1) for the body background; a second decorative
layer there would have competed with content legibility. Putting
the motifs in the side gutters keeps them as "as-builts in the
margin" — decoration that reads as part of the workshop, not as
chrome cluttering the work.

*Why inlined SVG, not `<use>` shadow trees.* The motifs need to be
animated by `flow-engine.js` via `getTotalLength()` /
`getPointAtLength()`, and those calls don't pierce `<use>` shadow
trees reliably in Chromium (same root cause that bit an earlier
attempt at `fill:none` inheritance). The trade-off — ~360 SVG
elements inlined into every page's DOM — is acceptable because
the engine's IntersectionObserver gates per-frame work to motifs
currently in the viewport, and the markup gzips well anyway. See
`codebase-issues#70` for the revisit trigger.

*Draw-in via stroke-dashoffset.* Three length-normalization
approaches all hit Chromium quirks:

- `--sbg-len` CSS var driven by `getTotalLength()` — broken on
  Bezier paths and circles (the AI/AO amber trace, the pump-coil
  circle), which refused to draw fully even at offset=0.
- `pathLength="1"` site-wide normalization — same class of bug
  on the same elements.
- Case-split `pathLength="1"` on safe straight elements only
  (`<line>` + L-only `<path>`), with Beziers/circles/rects falling
  through to a fixed default. Shipped in commit `b8dae2b`,
  reverted same-PR in commit `98223a5` after in-browser inspection
  showed every pathLength element rendering as broken speckle.
  Chromium honors `pathLength="1"` for the JS API
  (`getTotalLength()` returns the geometric length, 104 on a sample
  line) but NOT for `stroke-dasharray` — a CSS value of `1` is
  treated as 1 actual pixel rather than 1 normalized path unit,
  rendering a 104px line as ~50 tiny dashes that visually read as
  invisible. This is the most subtle of the three quirks because
  the path-length API works correctly; only the dasharray side
  effect breaks.

Permanent fallback (commit `e700c2a`): a single fixed dasharray
(600, well above any motif's ~200 user units) applied to every
`[data-sbg-stroke]`. Safe across every element type and every
browser. Trade-off accepted: drawing is no longer proportional
to path length — short signal wires finish in ~10% of the
transition and then sit still while long pipe runs continue.
The ease-out timing softens the disparity; correctness beats
uniformity here. Tracked in `codebase-issues#69` with a revisit
trigger (Chromium ships proper pathLength/dasharray support, or
a per-element JS-driven CSS-variable approach proves worth the
bootstrap complexity).

*1240px viewport cutoff.* Below 1240px both gutter strips drop
out via `@media (max-width: 1240px) { display: none; }`. That
covers most laptops 13"-and-smaller and every phone / tablet — the
"field device" segment where load weight and battery outrank
decoration. Print also drops them; reduced-motion keeps them but
snaps to drawn state.

**2. Hero-frame nav cards.** All 27 nav cards (9 tools, 13 education,
3 simulators, 2 home) moved from the old `.nav-card-tag` + body shape
to a three-part instrument frame mirroring the hero's
`.console-titlebar`:

- `.nav-card-titlebar` — mono small-caps prefix word (TOOL / LESSON
  / SIM / SECTION) + ellipsis-clipped title + status pill (LIVE /
  READ / RUN / OK)
- `.nav-card-body` — the card's existing description / dot grid
- `.nav-card-statusline` — bullet-separated `.nav-card-pill` spans
  carrying semantic tags (e.g., a hydronic lesson's pills read
  "Hydronics • Direct Return • Reverse Return • Primary / Secondary")

A `navCard()` macro in `_includes/nav-card.njk` takes all 27
through a single signature. Section drives an accent-color
cascade via `.nav-card--{home,tools,education,simulators}` and the
three `--section-accent{,-dim,-glow}` tokens.

*Why mirror the hero on every nav card.* The hero already
established the instrument-frame shape (titlebar + body +
statusline) as the page's "thing with an identity strip" element.
Carrying that shape into the nav cards makes the landings read as
indices of instruments rather than as link grids — and turns the
two landings (Tools, Education) into instrument racks. The pills
also encode more than a category: instead of a single category
tag, they sketch the *scope* of the page.

*titleShort trimming.* The titlebar single-lines at the 4-col
1920px breakpoint with ~195px of room beside the status pill.
Long names ("Modbus Register Viewer", "Function-Block Editor")
needed manual `titleShort` values ("Modbus Reg", "FB Editor");
CSS adds ellipsis safety via `min-width: 0` on the flex child
(commit `8cfedff`).

*`.nav-card-tag` is gone.* The old single-category-pill class
was deprecated when the new shape landed; commit `5ee8f50`
removed the dead rule.

**3. Discrete-pulse animation mode.** `flow-engine.js` grew a second
motion primitive alongside the existing continuous particle flow:

- `data-flow="supply|return"` — the original. Continuous stream of
  particles along the path, constant velocity. Encoding: physical
  media moving (water through pipes, air through ducts).
- `data-pulse="signal"` — new. A pulse head + four-circle trail
  launches from the path start, travels at fixed pixel-speed
  (default 220 px/sec), and retires at the end. Encoding: a
  control signal just updated (an analog wire sampling, a logic
  block firing, a BACnet/IP comm trace delivering).

Auto-fires on a per-path `data-pulse-interval` (default 4000ms,
±30% jitter so paths don't synchronize); external code calls
`FlowEngine.pulse(el)` for on-demand firing. The function-block
editor uses the external call to flash a wire when its source
block updates — the visual primitive for "this signal just changed."
Auto-firing is gated by an IntersectionObserver
(`rootMargin: 120px`) so the 60-deep gutter doesn't churn
pulses off-screen; explicit `FlowEngine.pulse()` bypasses the
gate.

Trail tuning constants (`PULSE_HEAD_RADIUS = 3.2px`,
`PULSE_TRAIL_LEN = 4`, `PULSE_TRAIL_GAP = 5px`, taper steps
`0.18` radius / `0.22` opacity) are module-level — no per-wire
knob. Pulse colour reads from `data-pulse-color`, then the
element's `stroke` attribute, then `var(--accent)` as ultimate
fallback (same cascade as `data-flow` colours).

**4. Control-vocabulary color family — teal / amber / plum.** Three
new desaturated hues added to `:root` for the *control* side of a
schematic:

- `--teal` (`#4a8a8a`) — BACnet/IP comm traces; the wire that
  carries packets, not water.
- `--amber` (`#c9a14a`) — energized analog control wiring (AI / AO
  signal paths); the wire that carries 4-20mA or 0-10V.
- `--plum` (`#8a5e7e`) — logic-block signal lines (AND / OR / PID
  / TMR chains); the wire inside a wiresheet.

Each carries `--*-dim` and `--*-glow` companions (10% / 22% alpha)
matching the `--accent-dim` / `--accent-glow` pattern, so the
section-accent cascade on nav cards reaches into background tints
and focus rings cleanly. The split with the physical-media palette
(`--blue`, `--blue-cool`, `--red` / `--accent`, `--heat`) is
deliberate: physical media palette = "water, air, energy moving";
control palette = "comm, wiring, logic." Diagrams that show both
read in two registers without color clashes.

*Section-accent cascade.* Each nav-card section gets one of these
hues as its primary: tools = `--accent` (existing green),
education = `--plum`, simulators = `--teal`, home = `--accent`.
Setting `.nav-card--education { --section-accent: var(--plum); }`
and consuming `var(--section-accent)` in `.nav-card:hover` /
`.nav-card-name` / `.ok-pill` flows the colour through every
themed element without per-section duplication.

**What didn't make it into this round.** Per-pulse-trail knob
(`data-pulse-trail`) — not needed by any current consumer; left
for the function-block editor to ask for if the per-wire-type
distinction becomes useful (currently all wires use the same
trail shape). Adjustable Bezier-path dashoffset draw — gave up
on this when the Chromium quirk proved durable; the fixed-600
fallback for curved elements is permanent until that bug closes.

### Discovery prompt + reward — Education page idiom

Two patterns appearing together on d3 (twin-T), establishing the
recognizable shape going forward:
- **Forward-pointing callout** — flag a deliberate gap in the
  explanation, name the discrepancy, point to where it gets
  resolved later. The d3 callout under the diagram ("Do you see
  a difference with this system I didn't mention?") forward-
  links to the planned load-piping page. Reader notices oddity
  → callout validates the noticing → future page rewards them.
- **Inward-pointing Easter egg** — reward exploring a widget's
  extreme state with content that wouldn't appear otherwise. The
  d3 widget's failure-state anecdote (the forgot-to-enable-the-
  injection-pump story) reveals only at 0 Hz. Reader drags out
  of curiosity → hits the failure state → discovers the war
  story → lesson sticks harder than prose would have made it.

Both work because they invite curiosity rather than demanding
attention. Use where the diagram or widget has a natural
question-shaped thing the page hasn't answered yet; don't
manufacture artificial gaps to fit the pattern.

### Education page scope — one question per page

Every new Education page declares its one question in the friction
file before drafting begins. The question goes at the top of the
page's entry, and it's the standard the page is held to: every
section either answers it or it doesn't belong. Vague scopes
("load piping," "refrigerant," "VFDs") drift into mega-pages
because nothing inside the scope says no to adjacent material.
A declared question does.

**Mechanics:**

1. **Declare the question first.** One sentence, in the friction-
   file entry, before any prose drafting. "What does the connection
   between a load and a hydronic loop look like, and what does that
   connection point have to decide?" is a question. "Load piping"
   is a topic. Topics drift; questions don't.

2. **In scope = what answers the question directly.** Usually two
   or three real sub-topics, each getting one section. If the in-
   scope list is longer than four items, the question is probably
   too broad and the page is two pages.

3. **Out of scope = explicit list of adjacent topics, with
   forward-link targets.** Each item gets `[future: <page name>]`
   or `[future: section in <page>]`. The marker is the discipline
   — it acknowledges the connection, drops a breadcrumb, and
   creates a record of what future page earns the topic. The
   prose draws the link with a sentence; the page doesn't *become*
   the link.

4. **Distinguish different systems from different functions when
   the question is ambiguous.** A different system (heat pumps,
   geothermal, cooling towers vs. hydronic distribution) is its
   own page. A different function (balancing, sequences, VFD
   pumping) is its own page. The current page is one system + one
   function, scoped tight.

5. **One adjacent topic may stay as a section if a budget is
   set before drafting.** Sometimes a small adjacent piece is too
   short to deserve a page but too connected to ignore. Set a hard
   length budget on it before the day session ("three paragraphs
   and one diagram, max"). If it grows past the budget during
   drafting, it gets pulled into its own page and a forward link
   replaces it. The budget is the trigger, not the judgment call
   at the end.

6. **Earn payoffs from forward references on prior pages.** If a
   previous page made a forward-pointing callout (discovery-prompt
   pattern, "find out on the load-piping page"), the new page ties
   back to it explicitly in a closing section. Don't ship the page
   without paying that debt — the discovery pattern only stays
   credible if it delivers.

**Why this isn't pre-architecting.** The rule isn't about
predicting every future page. It's about giving each page a single
question it has to answer well, and a written boundary for what
isn't its job. The forward links cost nothing — they're a record
of what's been promised, used as input when the friction file is
reviewed for what to build next. Topics surface organically as
they come up in drafting and get parked with markers; they're not
invented to fill a category tree.

**Applies retroactively as pages get extended.** PID Basics,
Hydronic Loops, and any other existing pages don't need re-
scoping today, but if they get substantially extended in a future
session, that's the moment to declare their question retroactively
and check that the additions answer it.

### Field-use conditions for reference tools

When building a calculator / converter / lookup that techs will
pull up on a job site, design for the conditions: gloves on, bad
cell signal, 30-second answer. Practical implications: tap-friendly
inputs, client-side compute (no network round-trip for the answer),
conservative external-resource weight, single-purpose tools that
beat kitchen-sink ones for the "open it, get the number, close it"
flow.

This is a *content-and-feature* consideration, not a page-architecture
rule. Pages render responsively (3-col grids collapse at ≤1000px,
2-col at ≤900px) and there's no "mobile subset" or "hide on
mobile" framework — every tool is the same tool on every device.
Use this when picking *what to build* and *how the inputs flow*, not
when deciding how the page itself is structured.

---

## Site architecture — the "no build step" question

> **Note (2026-05-16):** This section is preserved as the
> historical record of the earlier stance, when "no build step"
> was load-bearing and a static site generator was considered
> future-cleanup. After the page count grew to 17 and the
> head / nav duplication cost stopped being tolerable, the
> decision was revised: Eleventy (11ty) was adopted as a thin
> templating layer. See `codebase-issues.md` entry #4 for the
> revised decision and migration progress. The text below
> documents the stance at the time it was written.

`CLAUDE.md` describes the project as "no framework, no build step,
hand-written" — which is two separate properties tangled together.

**"No build step"** is the valuable property: no transpilation, no
bundling, no tooling that can drift or break. View-source shows the
real code. Browsers ten years from now will still run it.

**"Everything inlined per page"** is a *stylistic* choice that's been
behaving as if it were part of that property. It isn't. External
`styles.css` and external `.js` files loaded via `<link>` and
`<script src>` are still no build step.

**Stance moving forward (Level 2):** shared CSS and shared JS live in
real external files in the repo. Per-page logic can still be inline
when it's truly page-specific. Drivers pushing this way:

- The duplicated `<style>` between `index.html` and `contact.html` is
  already flagged in `CLAUDE.md` as the first motivator for cleanup;
  adding more pages multiplies the cost.
- The shared PID sim engine (above) wants to be a real file.
- Education mini-sims will reuse that engine — same argument.

What's *not* being adopted: bundlers, transpilers, frameworks, npm
build steps, or a static site generator. Those stay future-cleanup
items, appropriate when the page count reaches 15–20 and the
nav/header copying genuinely hurts. Today's move is just letting the
browser load shared files instead of duplicating them.

**Action during restructure:**
- Extract shared CSS to `html/styles.css`. Both existing pages link
  it. Page-specific CSS (the `contact.html` extras) can stay inline
  or move to its own file — pick whichever ages better.
- Create `html/scripts/` (or similar) for shared JS. First inhabitant
  is the PID sim engine.
- Update `CLAUDE.md` to reflect the new stance — strike the
  "everything in one file per page" framing, keep the "no build step"
  framing, and add a brief note on where shared assets live.

---

## Friction log

*(Both 2026-05 entries — PID tuner integral-slider direction in Ti
mode, and the `.pid-term` → `.callout` rename — were cleared on
2026-05-17. The slider-direction concern was retired without code
changes; the class rename landed across `styles.css` and the five
pages that used it.)*

