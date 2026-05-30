# ux-audit.md

Running log of **usability / experience** findings — where the site
trips, confuses, slows, or under-delivers for a real visitor — found
by walking the whole site three times, once in each of three personas
(see *Personas* below). This is the experience counterpart to
`content-audit.md` (engineering accuracy / editorial clarity) and
`codebase-issues.md` (code quality). It is **not** a redesign and not
a content-accuracy pass: a confusing *flow* is a UX finding here; a
wrong *number* goes to `content-audit.md`; a bug or a11y defect goes to
`codebase-issues.md`.

## How this file is used

- Findings are **report-only**. The audit is an extra set of eyes;
  editorial and design decisions stay with the site owner and human
  reviewers. Record, don't rewrite — suggested directions are pointers,
  not finished rewrites.
- **Substantive** findings are numbered and carry: *persona lens ·
  location (page + region) · the issue · severity · suggested
  direction*.
- **Severity**: **blocker** = the persona can't accomplish what they
  came for; **friction** = they can, but it costs them time, taps, or
  confidence; **polish** = a rough edge that doesn't block the task.
- **Minor polish** items are collected separately at the bottom.
- When an observation spans axes, it's filed where its primary fix
  lives and cross-referenced (e.g. a display-value rail that's really a
  code change references `codebase-issues.md`).
- The audit deliberately leans toward **fewer, well-grounded findings**
  over an exhaustive nitpick list, and quotes the exact page + region so
  each is actionable without a treasure hunt. Where it's unsure whether
  something is intentional, it says so and points at where it looked.

## Personas

1. **Newcomer** — new to building controls (apprentice, career-changer,
   trade-school student, green tech). Doesn't yet know what BACnet *is*;
   "MS/TP," "priority array," "superheat" aren't words yet. Deciding in
   ~10 seconds whether the site is for them.
2. **Field tech** — comfortable with BACnet / Modbus / Niagara / EBO,
   years in the field, **on a phone or tablet** at a panel, maybe gloved,
   bad lighting. Wants an answer in seconds. **Mobile is the primary
   surface for this persona.**
3. **Engineer** — designs sequences, specs equipment, reviews
   submittals. Wants depth, precision, correctness; on a desktop with
   three other tabs of manufacturer data open.

## Audit scope — first UX pass 2026-05-29

First experience-focused (vs. content-focused) audit of the site. All
45 canonical pages, walked three times — once per persona — in a real
browser (Chromium via Playwright) at real viewports, with machine-check
passes layered on top (console errors, `<h1>` count, skip-target
presence, in-page anchor integrity, internal-link status, horizontal
overflow, sub-44px touch targets, `inputmode`/`type` on inputs,
schematic-bg render).

### Coverage checklist

All 45 pages were walked by all three personas. Viewport per persona:
newcomer at desktop 1280px (+ home / a lesson re-checked at 390px);
field tech at phone 390×844 (iPhone 13, touch) + tablet 820×1180;
engineer at desktop 1440×900.

Home / chrome — [x] index · [x] privacy · [x] contact

Tools — [x] signal-scaling · [x] bacnet-ip-converter ·
[x] modbus-register-viewer · [x] thermistor-calculator ·
[x] psychrometric-chart · [x] air-mixing · [x] coil-sizing ·
[x] economizer-ratio · [x] refrigerant-pt · [x] tools/index

Simulators — [x] pid-tuner · [x] vfd-mock · [x] function-block-editor ·
[x] simulators/index

Education — [x] bacnet-basics · [x] bacnet-networking · [x] balancing ·
[x] equipment-staging · [x] function-blocks · [x] hydronic-loops ·
[x] load-piping · [x] metering-devices-txv-eev · [x] modbus-basics ·
[x] modbus-decoding · [x] pid-basics · [x] psychrometrics-basics ·
[x] pump-control · [x] refrigerant-cycle-basics ·
[x] superheat-subcooling · [x] vfds · [x] education/index

Practice — [x] bacnet-basics · [x] bacnet-networking · [x] balancing ·
[x] controller-swap · [x] hydronic-loops · [x] load-piping ·
[x] modbus-basics · [x] modbus-decoding · [x] pump-control ·
[x] surviving-first-months · [x] practice/index

### Structural pass — verified clean

Across all 45 pages: every page returns 200; exactly one `<h1>` each;
`#main` skip-target present on every page; zero broken in-page anchors;
zero dead internal links (every forward-link resolves to an existing
page); nav `.active` state correct on all 45 (`privacy.html` correctly
carries none); related-links blocks present on all deep pages;
schematic-bg renders in the gutters at ≥1240px and is correctly hidden
below. The only console error site-wide is the **documented, expected**
Turnstile 400 on `/contact.html` (CLAUDE.md → Gotchas; localhost can't
reach `challenges.cloudflare.com`). All 41 quiz `learnMore` / inline
explain deep-links resolve 200 **with valid section anchors** — no dead
ends in the quiz → lesson path.

### Substantive findings

#### 1. Home page has no beginner "start here" onramp; the hero badges and first stage are jargon-first

**Persona:** newcomer. **Location:** Home (`/`) — hero region,
`.hero-badges`, and the "Most-Reached-For Tools" stage.

The hero subhead reads "A reference site for building-controls
**people**," then the first thing a visitor sees is a row of badge
links — `AI / AO Scaling`, `Modbus Register Viewer`, `PID Tuning`,
`BACnet/IP Hex`, `Psychrometric Chart`, `Thermistor / RTD Lookup` —
every one of which is vocabulary a first-week apprentice can't yet
parse (`AI / AO Scaling` is the most opaque; "AI/AO" is defined nowhere
a newcomer sees before clicking). The Education landing is genuinely
excellent for this persona ("Practical lessons for techs new to the
industry… based on things I struggled with when I was new"), but
nothing on the home page routes a beginner there as *the* beginner
door — the badges and Browse stage read as "pick a tool," which
presumes you already know which tool you need.

**Severity:** friction. **Suggested direction:** add one
beginner-facing affordance near the hero — e.g. a "New to controls?
Start with the explainers →" link pointing at `/education/`. The site
clearly *intends* Education as the newcomer lane; the home page just
doesn't signpost it. (Checked against `site-ideas-and-friction.md`:
the home-page entries #10/#11/#15/#16 cover the Browse cards, the
"Most-Reached-For" eyebrow, and badge tone, but none address a beginner
onramp — this isn't a parked-and-rejected idea.)

**Addressed (2026-05-30).** Added a one-line onramp in the hero, above the
badge row so the beginner door is read before the expert quick-access:
"New to building controls? Start with the explainers →" linking
`/education/`. New `p.hero-onramp` rule in `styles.css` (element-qualified
to win over the centered `.hero p`); the badges keep their expert-shortcut
role.

#### 2. BACnet Basics opens by front-loading undefined acronyms before BACnet itself is defined

**Persona:** newcomer. **Location:** `/education/bacnet-basics.html` —
opening paragraph under "What BACnet is, and isn't."

This is the page a newcomer is most likely to open first to answer
"what *is* BACnet." The lead sentence names "ASHRAE," "MS/TP," "a PLC,
an EBO field controller, a Distech wireless sensor" before BACnet has
been defined — four pieces of jargon (MS/TP, PLC, EBO, Distech) up
front. The page *does* define BACnet well a sentence later, but the
lead makes the reader feel behind before the payoff. (MS/TP is
specifically a term this persona doesn't have yet, and it appears here
pre-gloss.)

**Severity:** friction. **Suggested direction:** lead with the
plain-English "what it is" sentence, then bring in the vendor/protocol
examples as illustration. The terms are technically correct — this is a
flow/ordering issue, not an accuracy one, which is why it's logged here
and not in `content-audit.md`.

**Addressed (2026-05-30).** Calibration note: the lead already *opened*
plain-English ("BACnet is the protocol most modern building automation
runs on") — the friction was that the dense ASHRAE/ASHRAE-135 standards
history landed in sentence 2, before the relatable "if you touch X you're
talking to BACnet" payoff. Light reorder within the intro: definition →
where you meet it → the standards history (now flagged "for background")
→ why this page exists. No content added or removed, and the "devices
describe themselves" framing stays the job of the next section rather than
being duplicated up here.

#### 3. Top-nav links and the units toggle fall below the 44px touch target, site-wide

**Persona:** field tech / mobile. **Location:** every page — top nav
(`.site-nav-links a`) and the units toggle (`.units-btn`) in
`nav.njk` / `styles.css`.

Measured at 390px: nav links render 26–29px tall ("Home" 42×29, "Tools"
37×29) — text-only, no vertical padding; the units toggle buttons are
**34×21px (US) and 64×21px (Metric)** — `.units-btn` carries only
`padding: 0.22rem 0.6rem`. The units toggle is the control this persona
reaches for most on a US/metric mixed site, and 21px tall is a hard
target with a thumb, harder gloved.

**Severity:** friction (the units toggle specifically edges toward
blocker for a metric user). **Suggested direction:** raise the
interactive hit area on the nav-link and units-toggle families toward
40–44px (vertical padding, or a `@media (hover: none)` floor). The nav
already `flex-wrap`s on phone, so taller rows cost little. This shares a
root cause with findings 8 and 9 and is logged once as a code-quality
convention in `codebase-issues.md` #74; the per-control UX cost is
recorded here.

**Addressed (2026-05-29, `codebase-issues.md` #74).** `.site-nav-links a`
and `.units-btn` now hit `min-height: 44px` on touch via the consolidated
`@media (hover: none)` `TOUCH-TARGET FLOOR` block in `styles.css`; desktop
density unchanged.

#### 4. Psychrometric chart's touch-drag is fiddly on a phone, and the typed-input fallback isn't signposted there

**Persona:** field tech / mobile. **Location:**
`/tools/psychrometric-chart.html` — `<canvas id="psy-canvas">` drag +
`hitTestNode` (18px grab radius).

On a phone the chart renders ~330px wide; OA/RA/MA/SA dots can sit
within a few °F of each other, and an 18px grab tolerance over an ~80°F
span is ~5°F — finger-fiddly, and a wrong grab moves the wrong state.
The mitigation is real and good: every state also has a `type=number`
input in the Input column, so a tech *can* key in the states without
dragging — but a tech who reads "drag OA on the chart" and tries it
first hits the fiddly path before discovering the inputs.

**Severity:** friction. **Suggested direction:** no rework needed —
either enlarge the touch hit radius (e.g. 24px) when `hasTouch`, or add
a one-line note near the chart on narrow viewports ("on a phone, type
the states in the panel above — dragging is easier on a wide screen").
(Related but distinct from `content-audit.md` #23, which is about the
Modbus bit-grid tap targets.)

**Addressed (2026-05-29).** Did both. The existing `.narrow-width-note`
now leads with the typed-input fallback ("the fastest path on a phone is
typing each state into the Input column"), and `hitTestNode`'s grab
tolerance widens from 18px to 24px on coarse pointers
(`matchMedia('(pointer: coarse)')`), so a finger has more slack while the
mouse keeps the tighter target.

#### 5. VFD mock — pressing the keypad RUN button in REMOTE silently does nothing

**Persona:** engineer. **Location:** `/simulators/vfd-mock.html` —
"DRIVE FRONT PANEL" keypad + "MOTOR RESPONSE" panel.

On first paint the drive is in **REMOTE** with run source = **TERMINALS
(S01)**. Pressing the prominent green keypad **RUN** and waiting ~4.5s:
`ACTUAL` stays `0.0 Hz`, state stays `STOPPED`, no message. Only after
pressing **L/R** to go LOCAL does RUN ramp the motor (`ACTUAL 16.0 Hz,
RAMPING UP`). The realism is *correct* and is the page's teaching point
— but a silent no-op on the single most obvious control is a friction
wall: the engineer can't tell whether the sim is broken or whether the
press was correctly ignored, and why.

**Severity:** friction. **Suggested direction:** on a keypad RUN/STOP
press that's gated by the active run source, flash a one-line LCD/status
note ("RUN ignored — run source is TERMINALS; press L/R for keypad
control") instead of absorbing the press. Turns a dead-end into the
exact lesson the page wants to teach.

**Addressed (2026-05-29).** Calibration note: the press wasn't *fully*
silent — `onRun()` already flashed `IGN: SRC=TERMS` on LCD line 4 — but
the code was cryptic and gave no next step, which is why it read as a
dead button. Reworded to name the source **and** the fix within the
20-char LCD line (`IGN: SRC=TERM, L/R` for terminals, `IGN: SRC=NET, L/R`
for network) and held a beat longer (3500 ms) so the press doesn't look
swallowed. The keypad-STOP gated case (`STOP IGN: DI HW`) is a separate,
rarer path and was left as-is.

#### 6. PID tuner can't be driven into overshoot/instability, so the headline tuning lesson is unreachable

**Persona:** engineer. **Location:** `/simulators/pid-tuner.html` —
overshoot / settle readouts; the on-page tuning cheat-sheet.

Cranking gain and reset to the slider maxima (Kc=20, Ki=6) produced
only modest overshoot: **fast = `none`**, med = `6.7%`, slow = `8.4%`.
The engine is a correct FOPDT plant with a real transport-delay queue,
but all three presets sit at low dead-time ratios (≈0.13) and modest
process gain, so the closed loop stays well-damped even at max
controller gain. An engineer who reaches for the slider to *see the
loop ring and go unstable* — the canonical "too much gain"
demonstration — never gets there; the worst case is a gentle 8% bump.
The cheat-sheet prose ("Overshoots, then recovers → ↓ P") describes a
behavior the sim can't actually exhibit at its presets.

**Severity:** friction (the math is right; the *reachable envelope* is
the issue). **Suggested direction:** either widen the Kc range / add a
"high dead-time" (or "noisy") process preset with dead/tau closer to
0.5–1.0 so the unstable regime is reachable, or add a one-line caption
that the modeled processes are deliberately well-behaved and won't ring
— so the absence of oscillation isn't read as a broken metric.
Cross-referenced as a flagged clarity item in `content-audit.md` #34
(the prose describes a behavior the model can't show); the primary fix
is the sim envelope, so it's filed here.

**Addressed (2026-05-30).** Took the "add a high dead-time preset" path.
A fourth process, **High dead-time** (dead ÷ τ ≈ 0.5, `tau: 40, dead: 20`),
joins `PID_PROC`; its ultimate gain lands near Kc 8, well inside the 0–20
slider, so cranking gain on it overshoots (~14 % at Kc 8, ~21 % at the
maxima), rings, and won't settle — tripping the existing >20 % overshoot
warn. The cheat-sheet note now points at it as the process to pick to see
the symptoms. The three well-behaved buckets are unchanged, and
`content-audit.md` #34 is resolved by the same change.

#### 7. Content quizzes don't cue a cold visitor to read the lesson first, and there's no "easiest first" nudge

**Persona:** newcomer. **Location:** `/practice/` landing + each content
quiz page (e.g. `/practice/modbus-decoding.html` intro: "Ten questions
on the **gotchas** from the Modbus Decoding lesson").

The Practice landing intro is good ("the self-check after reading a
page"), and the paired-lesson link is present in each quiz's intro line.
But a newcomer who clicks in from search lands on Question 1 ("A
vendor's Modbus table lists the supply-air temperature at 40123. What
address do you put on the wire?") with no prominent nudge to read the
paired lesson first — and the quizzes are framed as *gotcha* drills. A
beginner could start with the hardest material (BACnet Networking,
Modbus Decoding) and feel punished. (The reveal/explain panel itself is
a strength — see *Strengths confirmed*.)

**Severity:** polish. **Suggested direction:** make "Read the lesson
first" more prominent for first-time / zero-score visitors, and/or
surface the gentler field drill (`Surviving Your First Months`) as the
recommended newcomer starting point on the Practice landing.

**Addressed (2026-05-30).** Both. The Practice landing intro now points a
newcomer at the gentler `Surviving Your First Months` drill as the place
to start. Each of the eight content-quiz intros was reworded to *lead*
with the paired-lesson link and the read-it-first frame ("Read the
<Lesson> lesson first, then test yourself — …"), instead of burying the
link mid-sentence — so a cold visitor landing on Question 1 sees the
lesson door first. The question banks and the FAQPage JSON-LD (sourced
from `_data/quizzes/*`) are untouched.

#### 8. Quiz settings-row controls render ~24px tall

**Persona:** field tech / mobile. **Location:** all 10 `/practice/*`
pages — quiz settings row (`.quiz-settings-select`, the reset button).

Measured: the count select ("5 / 10 / All") renders **39×24px**, the
order select 88×24, "Reset best" 98×24. They sit above the question.
Low-stakes — these are tapped once at setup, and the *answer* flow is
excellent (True/False/MCQ choices and Skip/Submit are full-width ~308×39
targets, ideal gloved) — but they're the first thing on every Practice
page.

**Severity:** polish. **Suggested direction:** pad
`.quiz-settings-select` / the reset button to ~36–40px tall to match the
generous answer buttons below. (Same root cause as findings 3 and 9 →
`codebase-issues.md` #74.)

**Addressed (2026-05-29, `codebase-issues.md` #74).** `.quiz-settings-select`
and `.quiz-reset-best` now hit `min-height: 44px` on touch via the
`TOUCH-TARGET FLOOR` block in `styles.css`.

#### 9. Tool tab buttons render ~34–35px tall

**Persona:** field tech / mobile. **Location:** tabbed tools —
bacnet-ip-converter ("Hex→IP" 99×35), modbus-register-viewer ("Single
Register" 155×34 / "32-bit Pair" 123×34), thermistor-calculator,
coil-sizing, economizer-ratio, air-mixing, refrigerant-pt (`.tab-btn`).

Width is fine; height is the issue — `.tab-btn` lands at 34–35px, under
44px. These switch the tool's whole mode (e.g. single vs. 32-bit
register), so a missed tap is a real interruption.

**Severity:** polish (borderline friction on modbus, where tab-switching
is core to the workflow). **Suggested direction:** a few px more
vertical padding on `.tab-btn` clears 40px without disturbing the
desktop layout. (Same root cause as findings 3 and 8 →
`codebase-issues.md` #74.)

**Addressed (2026-05-29, `codebase-issues.md` #74).** `.tab-btn` now hits
`min-height: 44px` on touch via the `TOUCH-TARGET FLOOR` block in
`styles.css`.

#### 10. Function-Block Editor gives a tablet user no "this wants a laptop" signal

**Persona:** field tech / tablet. **Location:**
`/simulators/function-block-editor.html` — `.fbe-inner` / inner `svg`
(a 900px horizontal-scroll wiresheet inside a fixed-width wrapper; no
*page* overflow).

The desktop-first drag-wiring below 860px is a **known, deliberate
call** (`site-ideas-and-friction.md`), so the layout itself isn't a new
finding. The gap is the *experience*: on a tablet — a plausible field
surface — the canvas is a touch-drag wiresheet that assumes mouse drag,
and nothing on the page tells a tablet user it's built for a laptop.
(The editor's narrow-width honesty callout is praised in
`content-audit.md` #30 as a positive pattern — this is the same idea,
extended to the touch/drag mismatch specifically.)

**Severity:** polish. **Suggested direction:** an optional small-viewport
banner ("the wiresheet is built for a mouse — best on a laptop"); no
layout change.

#### 11. Economizer-ratio surfaces an out-of-range (>100%) mix fraction as the headline value

**Persona:** engineer. **Location:** `/tools/economizer-ratio.html` —
dry-bulb tab, `#er-db-pct`.

With OA 55 / RA 75 / MA 40 (MA below OA — physically impossible for a
simple two-stream mix) the tool returns **`175.0 %` OA**. The feasibility
prose below it is genuinely good and explains the damper goes 100% and
the coil makes up the rest — but the bare "175.0 %" as the *primary*
output is a value an engineer can't physically interpret (you can't have
175% outdoor air) and reads at a glance as a calc artifact. The sibling
tools already rail or mute this case: signal-scaling shows `125.0% ⚠`,
air-mixing mutes the output entirely when fractions don't sum.

**Severity:** polish. **Suggested direction:** when the computed
fraction lands outside 0–100%, clamp or mute the displayed *percentage*
(let the existing feasibility callout carry the explanation) rather than
surfacing an out-of-physical-range number as the headline. This is the
same failure-state-idiom inconsistency tracked editorially in
`content-audit.md` #25 and at the CSS layer in `codebase-issues.md` #73;
the display-value rail itself is the fix here.

**Addressed (2026-05-29).** Both tabs now mute `#er-db-pct` / `#er-h-pct`
to `—` (the air-mixing nonsensical-input idiom) when the fraction lands
outside 0–100 %, letting the feasibility callout carry the why; the
formula line still shows the raw computation so the >100 % math is
visible. The dry-bulb default was retuned to a feasible case
(OA 60 / RA 75 / MA 65 → 66.7 %) so the page loads with a confident
number and the worked example leads feasible, with the out-of-range
behavior described below it (this also fixed a latent worked-example
slip: the old default, MA 55, was labelled "feasible" but sits below OA).

#### 12. Coil-sizing doesn't print the entering-air specific-volume basis in the worked output

**Persona:** engineer. **Location:** `/tools/coil-sizing.html` — capacity
tab, `#cs-cap-formula`.

The formula line reads `ṁ = 2000 CFM × 60 ÷ v = 8665 lb dry air/h`. The
`v` is the *entering*-air specific volume (verified: 2000×60÷13.85 ≈
8664) — the right convention — but it's shown only as a solved divisor;
its value and which state it's taken at aren't printed. An engineer
reconciling this against a manufacturer's coil-selection program (the
three-tabs-open scenario) wants to see the assumed `v` to confirm the
mass-flow basis matches.

**Severity:** polish. **Suggested direction:** print the `v` value and
its basis inline (`v = 13.85 ft³/lb at entering 80/67`), the way the
formula already spells out the other terms.

**Addressed (2026-05-29).** The capacity-tab formula now prints
`(v = 13.85 ft³/lb at entering 80.0/67.0 °F)` inline (new `dispV` / `vU`
display helpers off `U.display.specificVolume` / `U.suffix.specificVolume`),
unit-aware in metric. Surfacing the divisor exposed a separate, pre-existing
display incoherence in the *metric* formula line (mass flow stays in `lb/h`
and the `× 60` is the IP minutes-per-hour) — logged as `codebase-issues.md`
#75, not fixed here.

### Strengths confirmed

Recorded so the audit's silence on these areas isn't read as "didn't
check" — and so they aren't "fixed" away in a later pass:

- **Quiz reveal / explain experience (all personas).** Wrong answers
  read "Not quite." (not "WRONG"), show the right answer, give a
  thorough plain-English *why* ("the leading 4 names the holding-register
  table — it's not part of the wire address… the classic off-by-one"),
  and end with a working "Learn more →" deep-link. The LOTO field-drill
  explanation even teaches the safety reasoning ("a dead reading on dead
  conductors will lie to you"). Exactly right for the newcomer.
- **Quiz `learnMore` deep-links (newcomer).** All 41 unique deep-links
  resolve 200 *and* land on a valid section anchor — verified by
  navigating each. No dead ends in the quiz → lesson path.
- **Speed-to-answer on the core lookup tools (field tech).** signal-
  scaling, bacnet-ip-converter, modbus, refrigerant-pt, thermistor,
  economizer are 2–4 taps to the number on a phone: inputs stack
  directly above a prominent colored Output block, prose sits *below*
  the tool card, and `type=number` inputs trigger the numeric keypad.
  Hex inputs are correctly `type=text` (hex needs A–F). The dense
  reference tables (thermistor R/T, Modbus 32-bit byte-order, psychro
  stages) reflow and stay readable — **zero horizontal page overflow on
  any of the 45 pages at 390px.**
- **Field drills ring true (field tech).** `surviving-first-months` and
  `controller-swap` were read in full against "does this ring true to
  someone who's done the work" — the known-live-meter LOTO step, the
  4-20 mA live-zero break signature, the "2 hours is the escalation
  budget," reuse-the-device-instance, EOL-at-the-two-physical-ends, and
  the "don't disturb the balancing valve" trap all land convincingly.
- **Cross-linking / references (engineer).** Zero broken or missing
  forward-links to existing pages site-wide. The refrigerant cluster
  (cycle-basics → superheat-subcooling → metering-devices, all pointing
  at the P-T tool) is exemplary; modbus-register-viewer → Modbus Basics
  / Modbus Decoding is reciprocal. The reference-following engineer is
  well served.

### Minor polish

- **Home `.hero-badges` ordering (newcomer).** If a beginner onramp
  lands (finding 1), the badges can stay as the expert quick-access
  they're designed to be; otherwise consider leading with the badge most
  legible to a beginner ("Psychrometric Chart" reads as a real thing;
  "AI / AO Scaling" does not).
