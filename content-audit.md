# content-audit.md

Running log of **content** issues — engineering accuracy and educational
clarity — found by reviewing the site through two lenses: a working BMS
engineer (is it correct? is the nuance right?) and a newcomer to the
industry (is the jargon explained? does the page answer its question?).

This is the editorial counterpart to `codebase-issues.md`, which covers
code quality. Code issues caught in passing are logged there, not here.

## How this file is used

- Findings are **report-only**. The audit is an extra set of eyes;
  editorial decisions stay with the site owner and human reviewers.
- **Substantive** findings (genuine inaccuracy, oversimplification,
  on-page inconsistency, or a real clarity blocker) are numbered and
  carry: location, lens, the passage, the issue, verification status,
  and a suggested direction (a pointer, not a rewrite).
- **Minor polish** items (phrasing, undefined jargon, small wording
  imprecision) are collected separately at the bottom.
- *Verification status*: **confirmed** = an internal inconsistency or
  arithmetic the audit could check directly; **flagged** = an
  engineering-judgment call the audit surfaces for the owner to settle
  against field experience or a primary source.
- Field-voice content (anecdotes, war stories, rules of thumb) was
  accepted by design — flagged only where actually wrong or misleading,
  not merely unsourced.

## Audit scope — first pass 2026-05-21

First content-focused audit of the site. 21 pages + 4 shared engines.

### Coverage checklist

Education — [x] pid-basics · [x] hydronic-loops · [x] load-piping ·
[x] vfds · [x] pump-control · [x] balancing · [x] psychrometrics-basics

Tools — [x] signal-scaling · [x] bacnet-ip-converter ·
[x] modbus-register-viewer · [x] thermistor-calculator · [x] pid-tuner ·
[x] vfd-mock · [x] psychrometric-chart · [x] air-mixing ·
[x] economizer-ratio · [x] coil-sizing

Landing / chrome — [x] index (home + About) · [x] contact ·
[x] tools/index · [x] education/index

Engines (math = content) — [x] psychro-engine.js · [x] pid-engine.js ·
[x] thermistor-data.js · [x] units.js · [x] psy-widget.js
(`flow-engine.js` / `pid-chart.js` carry no engineering claims —
animation and canvas drawing only.)

### Engine math — verified clean

Worth recording up front, because it's the load-bearing result for a
reference site: the shared math checked out.

- **`psychro-engine.js`** — `satPress` matches the ASHRAE 2017
  Fundamentals Ch. 1 Eq. 5/6 coefficients exactly; `humRatioFromVapPress`,
  `enthalpy`, `specificVolume`, `pressFromAltitude`, `humRatioFromWetBulb`
  (Eq. 35/37) all match the IP equations. `invertProcess` is an exact
  algebraic inverse of `computeProcess`.
- **`pid-engine.js`** — the FOPDT plant + ISA-form PID controller
  (reset in repeats/min, rate in time, conditional-integration
  anti-windup) is internally consistent and correctly labelled a toy
  model.
- **`units.js`** — every conversion factor spot-checked correct
  (Btu/lb→kJ/kg ×2.326, GPM→L/s ×0.0630902, MBH→kW ×0.293071,
  in.w.c.→Pa ×248.84, etc.).
- **`thermistor-data.js`** — the β-model / Callendar–Van Dusen
  generators are correct; the verification-status header is honest
  about the single-β approximation. See finding #4 for one prose
  detail.
- Tool-page math (signal-scaling linear interpolation, bacnet hex↔IP,
  modbus byte-ordering / two's-complement, the psych-tool mixing and
  inversion glue) — all verified correct.

---

## Substantive findings

### 1. pid-basics.html — the derivative-action story contradicts itself

**Location:** the "D — Derivative / Rate" callout vs. the Sim 3 caption.
**Lens:** engineer. **Status:** confirmed.

The D callout says derivative **earns its keep on slow, laggy
processes**: *"A big hot-water reheat coil with several minutes of
lag … a small Td … lets the loop 'see' PV racing toward SP and start
backing off early. On a fast, clean loop (duct pressure, VFD speed),
don't bother."*

The Sim 3 caption says the opposite: *"derivative worth using on a
45-second process is a rounding error on a 4-minute one, which is part
of why slow HVAC loops mostly run PI."* — i.e. derivative matters
*less* as the loop gets slower.

These two framings genuinely conflict. `pid-tuner.html`'s cheat sheet
(*"Overshoots, then recovers → ↓ P slightly · ↑ D on laggy loops"*)
sides with the callout, so the Sim 3 caption is the outlier.

**Suggested direction:** reconcile the Sim 3 caption. The honest reason
slow HVAC loops mostly run PI is sensor-noise amplification (D
amplifies a noisy slow measurement), not that a useful Td shrinks to a
rounding error — Td scales with the loop, and the engine's own
`PID_DMAX` table scales the rate slider up to 2 min for slow loops
precisely so D *can* act there.

### 2. load-piping.html ↔ pump-control.html — the DPBV is framed two different ways

**Location:** load-piping "Tying it back to the twin-T" (DPBV paragraph)
vs. pump-control §1 "Constant-Speed Pumps." **Lens:** engineer.
**Status:** flagged (design-intent call).

`load-piping.html` presents the differential-pressure bypass valve as
essential **variable-flow** plumbing: *"That guaranteed minimum bypass
is the pump protection a variable-flow system needs"* — and draws the
DPBV into the all-two-way twin-T diagram, whose system pump the same
page describes as variable-speed (*"the system pump should slow down
with them"*).

`pump-control.html` frames the DPBV as the **constant-speed-pump** fix:
*"The protection against the constant-speed-pump deadhead is the
differential pressure bypass valve … a mechanical fix for a control
problem that variable-speed pumping solves a different way."*

A ΔP-setpoint DPBV is classically the constant-speed-pump device. On a
VFD pump under DP control the drive itself caps loop ΔP, so a
ΔP-controlled DPBV would rarely open; minimum-flow protection in a
VFD-pumped system is usually a separate, dedicated minimum-flow bypass.
As written, the two pages tell a reader opposite things about when a
DPBV belongs.

**Suggested direction:** reconcile the pair — decide whether
load-piping's twin-T system pump is constant- or variable-speed in that
diagram, and whether the device shown is a ΔP-controlled DPBV (constant
speed) or a minimum-flow bypass (variable speed), then make both pages
agree.

**Resolution (2026-05-21):** the load-piping twin-T device is relabelled
a *minimum-flow bypass* (SVG label `MIN-FLOW`, `<g>` id
`lp-tt-minflow`, `<desc>` and "Tying it back" prose all reworded). It's
now the variable-flow / VFD-pump device — guarantees a flow floor — and
the prose explicitly distinguishes it from the ΔP-setpoint DPBV, linking
pump-control. `pump-control.html` keeps the DPBV as the constant-speed
fix and no longer claims load-piping "covers" it; instead it points at
load-piping's minimum-flow bypass as the variable-flow counterpart.

### 3. vfds.html — "clogged filter" listed as a cause of motor overload

**Location:** Fault-code category table, "Motor overload" row, "usual
cause" column. **Lens:** engineer. **Status:** flagged.

The row gives *"clogged filter pushing a fan past its curve"* as a
usual cause of a motor-overload trip. For most centrifugal fans —
especially backward-inclined / non-overloading designs — a clogged
filter *reduces* airflow, moving the operating point to lower flow,
which generally *lowers* fan brake horsepower. A clogged filter tends
to *unload* the motor, not overload it.

The claim is defensible only indirectly: on a VFD holding a duct-static
setpoint, the controller ramps the fan *up* to compensate for the
clogged filter, and the higher speed raises power. But that chain isn't
stated, and "pushing a fan past its curve" doesn't describe what a
clogged filter does (it moves the system curve, along the fan curve).

**Suggested direction:** either spell out the VFD-compensation chain,
or replace the example with a cleaner motor-overload cause (mechanical
bind, undersized motor — both already in the same cell).

### 4. thermistor — type notes quote values the page's own table doesn't show

**Location:** `thermistor-data.js` 10K Type II `notes` (rendered
on-page under the R/T table on `thermistor-calculator.html`).
**Lens:** engineer. **Status:** flagged (owner controls the
verification methodology).

The Type II note states: *"at 32 °F a Type 2 reads ≈ 32.7 kΩ, a Type 3
≈ 29.5 kΩ; at 185 °F a Type 2 reads ≈ 1.07 kΩ, a Type 3 ≈ 1.26 kΩ"* —
these are canonical published table values.

The page's own generated single-β R/T table produces, at the same
points, ≈ 33.1 kΩ / 30.2 kΩ (32 °F) and ≈ 1.12 kΩ / 1.32 kΩ (185 °F).
That's within the ~1 °F tolerance the verification header documents —
but the *resistances* visibly differ, and the note explicitly invites
the Type II vs. Type III comparison the user can then run against the
table and find a mismatch.

**Suggested direction:** small fix — either quote the generated-table
values in the note, or append a half-sentence ("canonical reference
values; the generated table differs by up to ~1 °F — see *About these
tables*"). The "About these tables" card already explains the
generated-vs-canonical gap in general terms; the note just needs to not
contradict the table beside it.

### 5. balancing.html — ABV compensation range: prose and widget disagree

**Location:** "Automatic Balancing Valves" prose vs. the comparison
widget's ABV model. **Lens:** engineer. **Status:** confirmed.

The prose puts an ABV's compensation range at *"typically something
like 2 to 32 psi of Δp."* The widget's ABV model uses a 3–50 ft-of-head
band — roughly 1.3–21.7 psi. The widget's top end (≈ 21.7 psi) sits
well below the prose's stated typical maximum (32 psi).

Visible impact is low — the slider maxes at 60 ft, and the widget's
above-band orifice behaviour keeps the ABV inside the ±15 % "holding"
band across the whole slider — so a casual user won't notice. But a
reader who converts 32 psi → ~74 ft and expects the widget's ABV to
hold that far is reading a page whose prose and widget state different
numbers.

**Suggested direction:** align the widget's modeled cartridge band with
the prose range, or add a one-line note that the widget models a single
representative cartridge rather than the full "typical" envelope.

---

## Minor polish

Phrasing, undefined jargon, and small wording imprecisions. None change
what the page teaches; each is a quick editorial pass.

- **pid-basics.html** — "process variable" and "setpoint" (PV / SP) are
  used from the intro onward without a one-line definition, on a page
  pitched at PID newcomers. *(newcomer)*
- **vfds.html** — "AV" (BACnet Analog Value object) is used without
  expansion in the run-command section and the anecdote; "VAV" is used
  without expansion. *(newcomer)*
- **load-piping.html** — the SVG diagram annotations say "system Q"
  while the body prose consistently says "flow." "Q" is undefined
  on-page and also commonly reads as heat rate. Match the diagram label
  to the prose. *(newcomer)*
- **hydronic-loops.html** — the d3 injection-pump widget's slider runs
  to 75 Hz (167 % of its 45-Hz "design" speed). 75 Hz is motor-
  overspeed territory not used with standard induction motors, and the
  companion VFDs lesson treats Hz limits carefully — consider capping
  nearer 60 Hz or labelling the over-design range. *(engineer, low)*
- **balancing.html** — "Δp" is used throughout without ever being
  expanded to "differential pressure" (the companion pump-control page
  does expand it); "index circuit" is used in §2 but only defined in
  §7. *(newcomer)*
- **psychrometrics-basics.html** — on a page explicitly aimed at
  newcomers, several terms land without a gloss: "RTD", "AHU", "IAQ",
  "apparatus dew point", "natatorium". Each is small; a single gloss
  pass would help the target reader. *(newcomer)*
- **pid-tuner.html** — "The three buckets above all sit comfortably
  under 0.2" (dead-time ÷ τ) is true for the simulator's preset points
  (~0.125) but not for the corner combinations of the table's stated
  ranges — e.g. the slow bucket's 2-min dead time ÷ 2-min τ = 1.0,
  which the same paragraph calls "fighting transport delay." Wording
  imprecision. *(engineer)*
- **pid-tuner.html** — the vendor parameter-style claims ("EBO uses
  gain with integral and derivative times in seconds"; "Distech uses a
  proportional band") are field knowledge worth a quick self-check
  against direct EBO / Distech experience. *(engineer, flagged)*
- **air-mixing.html** — the "By mass flow" tab labels its input "Mass
  flow (CFM)." CFM is a *volumetric* flow unit; the tool correctly
  derives mass internally (CFM ÷ v), but the label conflates volumetric
  and mass flow. Consider "Airflow (CFM)" or "Volumetric flow (CFM)."
  *(engineer)*
- **index.html** (home, About card) — two typos: "started as just as a
  way" (duplicated "as") and "in once place" (→ "in one place").
  *(polish)*
