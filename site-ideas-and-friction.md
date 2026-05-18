# controlsfreak.dev — Ideas & Friction

Running list of feature ideas and things that annoy me about the site
as I use it. Drop notes here as they come up; flesh out later. Items
graduate from here into `#roadmap` in `index.html`, then into actual
tools.

---

## Feature ideas



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
- `[future: sequencing.html]` — referenced in the lead/lag note
  (heavy traffic going there: rotation, staging transitions,
  end-of-curve protection, bumpless mode changes — a meaningful
  page in its own right). User flagged sequencing should get a lot
  of attention when it's its own page; the brief on this page is
  deliberately shallow so it doesn't pre-cover ground.
- `[future: sequencing.html]` (again, in the closing) — broader
  scope: setpoint reset against outside-air temperature, mode
  transitions, morning warm-up sequences, etc.
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
- `/tools/vfd-mock.html` — explicit CTA at the end of the page,
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


### Refrigerant cycle — Education section, possibly with calculator

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
alongside the future BACnet object reference tool.

### Thermistor calculator *(lookup mode shipped + curves verified)*
Two related modes were planned (probably tabs, à la Signal Scaling).
Lookup is shipped and the curves are now datasheet-verified; identify
mode is still future work.

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
- **Identify mode** *(still future).* User enters 2+ (temp, resistance)
  pairs from an unknown sensor and the tool reports which standard
  type best fits, with a confidence indicator. Useful when there's an
  unlabeled sensor in the field. Needs a clear accuracy disclaimer —
  sensor tolerance, measurement noise, and the fact that 2 points
  often can't distinguish between similar curves all matter. More
  points = better answer; maybe require 3 minimum and surface
  per-point residuals so the user can see how clean the fit is.

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

### Interactive psychrometric chart *(phase 3 in progress — math extracted 2026-05-17; chip + toggle polish next)*
Phase 1 (v0.6) shipped the state-point calculator + draggable dot on an
altitude-adjustable ASHRAE IP-unit chart. Phase 2 (v1.3, shipped 2026-05-15)
turned the single-point surface into an air-handler process chain: outdoor
air + return air mix to mixed air, then a cooling coil, a heating coil,
and a humidifier walk the state toward supply air. Each stage is a labelled
node on the chart connected by a color-coded process segment; everything
downstream of the source nodes is computed from the editor's process
parameters and updates live as you type or drag.

Phase 3 ships in two PRs: PR 1 (2026-05-17) extracted the pure psych math
to `html/scripts/psychro-engine.js` ahead of the chip work so the chip
lands on a smaller surface (page is now 1262 lines, down from 1384).
PR 2 — still in flight — adds the floating state-point chip and the
`.psy-toggle` polish noted below.

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

**Floating state-point chip — still deferred (now phase 3).** A small
tooltip-style readout that follows the dragged dot, ~75 % opacity so
process lines stay visible underneath, offset 12–15 px up-and-right so
the dot itself isn't obscured. Shows 2–3 key values (DB, WB, RH); the
full property table on the right still owns the complete state.
Direct-manipulation feedback pattern. Build in a focused follow-up so
the opacity / offset / property selection can be tuned without
process-lines work distracting.

Implementation note carried forward from phase 1: canvas was the right
call (matches the PID plot's approach). The chip would be an absolutely
positioned HTML element over the canvas, updated on each drag event.

**`.psy-toggle` polish — bundle into phase 3.** Two small fixes on the
CC / HC / HUM on/off rows surfaced when reviewing the #25 aria-wiring
PR visually:

- *"On" text reads as top-aligned against the checkbox.*
  `<label class="psy-toggle">` already declares
  `display: inline-flex; align-items: center;`, yet the text rides
  higher than the checkbox glyph — probably a baseline-vs-flex-center
  quirk or a line-height mismatch between 0.78rem sans text and the
  checkbox's intrinsic height. Want it vertically centered.
- *Dynamic "On" / "Off" label.* The visible text is static "On"; it
  should read "Off" when the checkbox is unchecked, matching the
  state. Two viable shapes: wrap the text in a `<span>` and toggle
  alongside the existing cc/hc/hum state plumbing, or use a
  `::after` content + `:checked` sibling pattern (CSS-only).

### Psychrometrics — paired Education page

Promoted from a follow-up note during phase-3 planning: the chart page is
dense even for someone fluent in psychrometrics (the chip's "DB / WB / RH"
readout assumes the reader knows what those mean), and learning more about
psychrometrics is one of the explicit personal goals of building the page.
Pair the tool with a lesson in the spirit of `pid-tuner.html` ↔
`pid-basics.html`.

Scope sketch:
- The seven properties — DB, WB, DP, W, RH, h, v — what each means
  physically, which measurement instrument tells you which, and the
  pairwise relationships ("DB + RH gives you everything; DB + WB also
  gives you everything; but DB alone gives you nothing about moisture
  content"). The Mollier intuition: at constant pressure you only need
  two independent properties to lock the state.
- The process families on the chart — sensible heat vs. latent vs.
  mixing vs. adiabatic humidification. Why dew point shifts under
  cooling+dehumidification but not under sensible heating; why mixing
  lands on the straight line between sources; why adiabatic
  humidification follows the wet-bulb line.
- Common gotchas — what RH actually measures at saturation (and why
  RH alone tells you almost nothing without a temperature), why
  enthalpy is the right basis for "how much heat is the coil moving,"
  and the dew-point ≈ glass-of-ice-water mental model.

Cross-link both ways: tool page → "Learn the psychrometrics behind this
chart" link in a `.tool-card` callout; lesson page → "Try this on the
interactive chart" link at the relevant sections.

Working title: `education/psychrometrics-basics.html`.

### Air-mixing calculator *(candidate psych-tool follow-up)*

Generalize the chart's OA + RA mass-weighted mix to N streams: mix two
or more known states by mass flow (or by mass fraction) into a single
mixed state. Useful any time a tech is sizing an outside-air mixing
plenum, blending economizer plus return, or sanity-checking an energy-
recovery wheel's output state.

In scope (sketch):
- Two-tab UI: by-mass-flow (each stream gets a CFM or a lb/h) vs.
  by-fraction (each stream gets a %, must sum to 100).
- Per-stream input row using the chart page's "Define by" pattern —
  DB + (RH / WB / DP / W / h).
- Output: mixed-air DB, W, h, RH, v, plus optional altitude/pressure.
- Reuses `humRatioFromRH`, `humRatioFromWetBulb`, `enthalpy`,
  `pressFromAltitude` from `psychro-engine.js` (flat primitives) and
  `Psychro.buildState` to materialize the result. No new math.

First second-consumer that lands triggers a review of the engine's
two-tier API — if it wants its own solver methods, those become the
test of whether `Psychro.*` is the right namespace shape.

### Coil-sizing calculator *(candidate psych-tool follow-up)*

A single-stage calculator: given entering state + leaving state +
airflow, return total / sensible / latent capacity and SHR. Or invert —
given entering + airflow + target capacity, solve for leaving state.
Same math as the chart's CC stage in isolation, surfaced as its own
tool so a tech sizing a coil doesn't have to build a whole AHU chain
just to check one capacity.

In scope (sketch):
- Coil type toggle: cooling, heating, humidifying.
- Entering and leaving state editors (the "Define by" pattern again).
- Airflow input (CFM or m³/h).
- Output: total MBH, sensible MBH, latent MBH, SHR (cooling only),
  ΔDB / ΔW / Δh.
- Solve-for mode: lock any three of {entering, leaving, airflow,
  capacity}, the fourth falls out.
- Reuses `Psychro.solveState`, `Psychro.buildState`, and
  `Psychro.computeProcess` — the last one being the exact math the
  chart's per-stage table runs today.

Same "first second-consumer triggers API review" note as air-mixing.

### Economizer-ratio helper *(candidate psych-tool follow-up — small)*

Given OA temp + RA temp + mixed-air setpoint (or OA enthalpy + RA
enthalpy + mixed-air setpoint for an enthalpy-economizer surface),
return the required % OA. The single-knob version of the chart's MA
stage. Tiny tool — fits in a `.tool-body-3col` with about six rows of
inputs and one readout — but it's the calculation a controls tech
actually runs at the panel ("how far do I open the OA damper to hit
55 °F mixed at these conditions?") more often than they'd build out a
full chain.

In scope (sketch):
- Dry-bulb mode and enthalpy mode toggle. Dry-bulb mode is most of the
  daily use; enthalpy mode is the more correct calc and the one a
  high-end BAS economizer actually performs.
- OA, RA, and mixed-setpoint inputs.
- Output: required % OA, plus a "feasibility" annotation (whether the
  setpoint sits between OA and RA — outside that range, no mix gets
  you there).
- Reuses `humRatioFromRH`, `humRatioFromWetBulb`, `enthalpy` for the
  enthalpy-mode case. Dry-bulb mode is pure mass-balance (no engine
  call needed); enthalpy mode wants the engine's primitives.

Same "first second-consumer triggers API review" note. Of the three
candidates, this is the lightest — and would be the cleanest test of
whether the engine's flat primitives are ergonomic for a tool that
doesn't need the full solver.

### Mock function-block editor *(larger build — may span multiple sessions)*
A graphical function-block sandbox in the spirit of Niagara's wiresheet
/ EBO function diagrams / Distech graphical programming — a teaching
surface for newer techs who've never wired a logic diagram before, and
a "what does this language even look like" sample for people coming in
from PLC or line-code backgrounds. Same `mock` framing as
`vfd-mock.html`: feels like the real thing, doesn't replace it.

**Rough scope (provisional, settle when this enters the queue):**

- *Block palette — basic logic and math.* Boolean: AND, OR, NOT, XOR,
  RS latch. Comparators: =, ≠, >, <, ≥, ≤. Math: add, subtract,
  multiply, divide, min, max, average. Timers: TON (on-delay), TOF
  (off-delay), pulse. Selection: select (boolean switch), limit
  (clamp). Sources/sinks: constant value, AI/AO/BI/BO point stubs,
  display readout.
- *Canvas + wiring.* Drag blocks from a palette onto a canvas; click
  output pin → click input pin to wire. Live tick simulation runs in
  the background so wires light up with their current value and
  outputs update as inputs change. Probably no save/load in v1
  (state survives the session, not a reload — same as the VFD mock).
- *Example programs — canned scenarios that load with one click.*
  Few candidates worth considering: start/stop interlock with
  hand-off-auto, freeze-stat shutdown chain, occupancy override with
  timed bypass, simple economizer enable (OAT < setpoint AND mode =
  cool), pump alternation latch, simple PID-style cascade (the PID
  block lives in the Tuner, but a placeholder block here could
  consume its output). The examples are the value — palette without
  worked programs is just a toy.
- *No actual PID block here.* Same scope discipline as the VFD mock —
  this tool is the wiring/logic surface, not the control-loop surface.
  If the user wants a PID, the Tuner is one click away (cross-link).
  A `PID` block stub can appear in the palette as a black box (inputs
  for SP/PV, output 0–100%), with prose saying "see the Tuner" and
  no actual loop math under the hood.

**Open design questions for when this gets closer:**
- *Pairing with an Education page.* "What is function-block
  programming, and why do controls people use it?" might be a peer
  Education page that this tool pays off. Same precedent as
  vfds.html ↔ vfd-mock.html. Or the explainer prose lives on the
  tool page itself if it stays short.
- *Visual grammar.* Niagara wiresheet (boxes-on-grid, orthogonal
  wires) vs. EBO function diagrams (similar, slightly different
  chrome) vs. an on-brand "controlsfreak look" that isn't a copy of
  either. Probably the third, drawing from the site's existing
  palette and the recessed `--surface-3` panel idiom.
- *Tick semantics.* Real controllers run blocks in a defined
  evaluation order (often topologically sorted on the wires). v1
  can probably get away with "evaluate every block every tick,
  combinational logic settles in one pass," but feedback loops
  (the RS latch wired through an OR with itself) will need a
  one-tick-delay convention so they don't infinite-loop. Worth
  thinking about up front so the engine isn't retrofitted.
- *Persistence.* Same question the Controller commissioner entry
  raises — does this tool save programs across sessions
  (localStorage)? Does it export to a sharable JSON? Both add real
  scope; v1 can probably ship without either.
- *Mobile.* Almost certainly desktop-only. Drag-and-drop wiring on
  a touch device is its own design problem, and the audience for
  this tool overlaps heavily with the "at-a-desk learning" mode
  rather than the "on-a-roof" mode.

This entry is brief on purpose — flesh it out in the design chat
when it enters the queue. Sits in the same "larger build, multiple
sessions" bucket as the Controller commissioner below; if both ship,
they might share a bit of visual vocabulary (block-palette + canvas
layout, point-stub representation) but they're independent tools.

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

---

## Site structure / organization
### Where interactive widgets live

Tools = calculators, converters, lookups. Pull-it-up-and-use-it
utilities. Standalone, get a Tools-landing card, show up in "Coming
Soon" while pending.

Education = prose + diagrams + sometimes interactive widgets that exist
to teach a specific concept. The PID mini-sims (P only → P+I → P+I+D)
and the Twin-T injection-pump widget on Hydronic Loops are on Education
pages on purpose — the widget *is part of the explanation*, not a
standalone tool, and it gets read in sequence with the prose around it.

The rule: standalone "open it and use it" cases go to Tools. Teaching
widgets stay in Education and don't get a Tools-landing card. If a
piece of interactive content is useful both ways, the simulator goes
to Tools and a stripped-down teaching version goes to Education (the
PID tuner is the worked example of this split).

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
rule. Pages render responsively (`≤900px` triggers the 3-col → stack
collapse uniformly) and there's no "mobile subset" or "hide on
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

