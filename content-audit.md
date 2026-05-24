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

**Resolution (2026-05-21):** Sim 3 caption rewritten. The wrong clause
(Td "is a rounding error" on a slow loop) is gone; the caption now keeps
the true "rate slider's range scales with the loop" and states a useful
Td grows with τ, then attributes "slow HVAC loops mostly run PI" to D
amplifying a noisy, slowly-changing measurement — consistent with the
D callout and the pid-tuner cheat sheet.

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

**Resolution (2026-05-21):** the "clogged filter pushing a fan past its
curve" clause was dropped from the Motor-overload row. The cell still
reads correctly with "Mechanical bind" and "undersized motor for the
actual load" — both accurate causes.

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

**Resolution (2026-05-21):** the 10K Type II `notes` string keeps the
canonical published values and now appends a half-sentence — "Those are
canonical published values; the generated table above differs by up to
~1 °F — see 'About these tables'." — so the note no longer silently
contradicts the table beside it.

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

**Resolution (2026-05-21):** the prose range was changed to match the
widget — "2 to 32 psi" → "1 to 22 psi" (the widget's 3–50 ft-of-head
band ≈ 1.3–21.7 psi). The widget JS is unchanged, so the smoke-test
boundary assertions at 3 ft / 50 ft are untouched.

---

## Minor polish

Phrasing, undefined jargon, and small wording imprecisions. None change
what the page teaches; each is a quick editorial pass.

**Resolution (2026-05-21):** all items below addressed in one minor-polish
pass — glosses added (PV / SP; AV / VAV; RTD / AHU / IAQ / apparatus dew
point / natatorium); the load-piping SVG "system Q" annotations relabelled
"system flow"; the hydronic-loops d3 injection-pump slider capped at 60 Hz
(`MAX_HZ` 75 → 60); the pid-tuner dead-time-ratio sentence reworded to refer
to the presets' nominal operating points rather than the table's full
ranges; the unverifiable "Distech" vendor name dropped from the pid-tuner
prose and the Parameter Style selector (the EBO description was owner-
confirmed and kept); the air-mixing "Mass flow (CFM)" label changed to
"Airflow (CFM)"; the two index.html About-card typos fixed.

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

---

## Audit scope — second pass 2026-05-23

Delta pass against everything that's landed since the first pass. Two
new education pages, two new tools, two new shared scripts (one math
engine, one data table), one new capstone widget on an existing page,
plus the home rebuild and BACnet-object-ref section numbering across
education. Same posture as the first pass: report-only, two lenses
(BMS engineer + newcomer to the industry), substantive findings
numbered (continuing from `#5`), minor polish in a separate list at
the bottom.

### Coverage checklist

New education — [x] function-blocks · [x] equipment-staging
New tools — [x] function-block-editor · [x] refrigerant-pt
New engines — [x] fbe-engine.js · [x] refrigerant-data.js
Delta-only — [x] load-piping (capstone widget) · [x] index (home: hero
+ About) · [x] pid-basics (forward-link + BACnet h2 refs) ·
[x] psychrometrics-basics (BACnet h2 refs) · [x] pump-control
(forward-link to equipment-staging)
Closure on first-pass items — [x] #1 · [x] #2 · [x] #3 · [x] #4 ·
[x] #5 · [x] minor-polish pass

### Engine math — second pass verified

The two new shared scripts checked against in-repo cross-references
and the conventions they document. Findings (carried below as
substantive items) are limited to two: a derivative-on-error choice
in `fbe-engine.js`'s PID block that contradicts pid-basics's guidance,
and an internal field-vs-data inconsistency in `refrigerant-data.js`
on R-410A's `blend` flag.

- **`fbe-engine.js`** — Block semantics match IEC 61131-3 conventions:
  TON (Q only when IN held continuously for PT seconds), TOF (Q stays
  TRUE for PT after IN drops; ET held at PT after expiry), set-
  dominant SR latch, A>B / A<B / A=B (with `Math.abs(A−B) < 1e-9` for
  equality), DIVIDE with /0 guard returning 0, LIMIT clamping to
  [lo, hi]. Topological evaluation is Kahn's algorithm with self-loops
  skipped and cycles broken by appending the unsorted nodes at the
  end in declaration order — feedback edges read the previous tick's
  output via the `prevOut` snapshot in `tick()`. The PID block is
  per-tick with conditional-integration anti-windup (hold the
  integral if the unclamped output would saturate) and a 0–100 %
  clamp. The derivative term is computed on **error**, which is what
  drives finding #8 below.
- **`refrigerant-data.js`** — Tables are transcribed from manufacturer
  P-T charts, every entry marked HIGH confidence with source PDF
  cited. Spot-check against my recollection of published values:
  - R-410A: 0 °F → 48.4 / 48.2 psig (≈48 psig standard); 40 °F →
    118.8 / 118.4 psig; 100 °F → 318.6 / 317.6 psig (~317–318 psig
    standard); 130 °F → 477.9 / 476.8 psig (~474–477 psig standard).
    Bubble-dew gap stays at ~0.2–1.0 psi across the range — matches
    R-410A's stated near-azeotropic ~0.2 °F glide.
  - R-22: at 100 °F → 196 psig (matches standard PT chart); at 75 °F
    interpolates to ~132 psig (standard ~131–132 psig).
  - R-134a: at 95 °F interpolates to ~114.7 psig (standard ~114.7);
    at 32 °F interpolates to ~27.8 psig (standard ~28).
  - R-407C: 50 psig → bubble 19.0 °F / dew 30.3 °F = 11.3 °F glide
    (low pressure); 250 psig → 107.2 / 115.8 = 8.6 °F glide (higher
    pressure). Matches the zeotropic narrowing-at-pressure pattern.
  - R-454B: 100 psig → 34.1 / 36.3 (2.2 °F glide), 200 psig →
    72.8 / 75.1 (2.3 °F glide). Matches the published ~2 °F.
  - Normalization logic: `index === 'temp'` swaps to put pressure on
    the x-axis for both bubble/dew curves; `index === 'pressure'`
    keeps pressure on x and falls back to the bubble column for dew
    when dew is omitted (single-component refrigerants). Correct.
  - One internal inconsistency drives finding #9 below.

### 6. Section-heading `AV:NNN` prefix is BACnet-flavoured decoration that doesn't survive the engineer lens

- **Where:** every `h2.section-label` carrying `data-objref` —
  `index.html` (Start Here / About: AV:001 / AV:002),
  `education/pid-basics.html` (What P, I, and D Actually Do /
  See Each Term in Action: AV:001 / AV:002),
  `education/psychrometrics-basics.html` (Does This Air Sweat the
  Windows?: AV:001). Rendered via the CSS rule
  `h2.section-label[data-objref]::before { content: "AV:" attr(data-objref) " · "; }`
  in `styles.css` (around line 387).
- **Lens:** engineer (flagged).
- **The passage:** rendered headings read e.g. "AV:001 · What P, I,
  and D Actually Do", "AV:001 · Start Here".
- **The issue:** AV is the BACnet Analog Value object — a non-physical
  analog point holding a setpoint, calculated value, or virtual analog
  datum. Section headings aren't analog values. The commit message
  (`61099fe`) names them "BACnet object refs", so the framing is that
  these *are* BACnet refs, just used visually. Two engineer-lens
  notes follow from that:
  1. *Object class.* If the intent is "labeled, programmed entity",
     AV is the closest fit among analog object types but is still a
     category match, not a semantic match — section headings aren't
     numeric values that a controller writes or reads. MV (Multi-state
     Value) would be no better; the category itself doesn't apply.
  2. *Instance numbering.* BACnet instance numbers are unique within
     each object class on a device. Here numbering restarts at `001`
     on each page (home has AV:001/002; pid-basics has AV:001/002),
     so the same `AV:001` identifier appears on multiple pages.
     Treated as a real BACnet ref, that's a duplicate instance; treated
     as decoration, it's fine.
- **Verification:** flagged (engineering-judgment call — is the
  prefix being read as a literal BACnet reference, or as BAS-instrument
  visual flair like the console titlebar's `UPTIME 24×7`?).
- **Direction (a pointer, not a rewrite):** three options. (a) Keep
  AV: and accept that an engineer notices the category mismatch — the
  rest of the visual chrome (titlebar, OK pill, statusline) is
  decorative in the same spirit. (b) Swap to a non-BACnet prefix that
  carries the BAS-instrument feel without claiming object semantics —
  `SEC:001`, `REF:001`, or just `01 ·` would all read cleanly.
  (c) Drop the prefix on the home page (where it sits above plain
  navigation cards rather than education content) and keep it on
  education pages if the BAS flavor is wanted only there. Owner's
  editorial call.

**Resolution (2026-05-23):** option (b) — swapped the rendered prefix
from `AV:NNN` to `SEC:NNN`. Keeps the BAS-instrument `class:instance`
rhythm; `SEC` reads as "section" (the thing the heading actually
marks) without claiming any BACnet object-class semantics, and the
per-page instance numbering now reads as each page's section sequence
rather than a (fake) device-wide instance. Single-file change in
`html/styles.css` — the `::before content` string plus the two
comment blocks (v2.0.0 `.section-line` note and the rule preamble)
that had framed the prefix as a BACnet object ref. The `data-objref`
attribute name on the five h2s stays — it's an internal hook, not
user-visible, and renaming it would touch every consuming page for
no functional gain.

### 7. Function-Block Editor's default econ example loads with the economizer disabled, while the partner lesson illustrates it enabled

- **Where:** `html/tools/function-block-editor.html` line 444 — the
  `EXAMPLES.econ` graph sets the OAT analog-input block to
  `params: { value: 68 }`. The economizer changeover setpoint is 60,
  so 68 < 60 is FALSE and the AND output never goes TRUE; the BO at
  the end of the sheet sits at FALSE on first paint.
- **The partner page:** `html/education/function-blocks.html` lines
  197–205 walk through the economizer-enable worked example using
  OAT=55: "Outdoor air at 55 is below the 60 changeover point and the
  unit is calling for cooling, so both inputs are satisfied and the
  economizer is enabled." The SVG below the prose draws every
  digital wire as TRUE (green) and the BO labelled `ECON ON`. The
  closing CTA (line 281) reads "It ships with the economizer above
  already built, plus a freeze-stat shutdown, a pair of thermostats,
  and a PID loop — load one, poke at the inputs, and see the logic
  respond."
- **Lens:** newcomer.
- **The issue:** a reader who follows the CTA from `function-blocks`
  into the editor expects, on first paint, to see the configuration
  the lesson just walked them through — OAT below setpoint, AND
  output TRUE, `ECON ON`. They land on the same wiring topology but
  with the economizer *disabled*. Nothing is wrong with the wiring or
  the engine; the gap is between the lesson's worked illustration and
  the editor's first paint. A newcomer briefly wonders whether they
  loaded the wrong example.
- **Verification:** confirmed (file inspection of both pages).
- **Direction:** lower `EXAMPLES.econ.blocks[0].params.value` from
  `68` to `55` so the editor's first paint matches the lesson's
  worked illustration on landing. Alternative: leave OAT=68 to give
  the reader an obvious knob to turn, and tweak the lesson's CTA
  paragraph — "the editor loads it disabled; drop OAT below the
  setpoint and watch the AND output flip" — to set the expectation
  explicitly. Either reconciles the two pages.

**Resolution (2026-05-23):** primary direction — lowered
`EXAMPLES.econ.blocks[0].params.value` from `68` to `55` in
`html/tools/function-block-editor.html`. A reader following the CTA
from `function-blocks` into the editor now sees, on first paint, the
exact configuration the lesson's prose and SVG walked them through
(OAT 55 < setpoint 60, AND TRUE, `ECON ON`). The lesson's CTA
wording ("the economizer above already built … load one, poke at
the inputs, and see the logic respond") needs no edit — it now
matches the editor's landing state.

### 8. Function-block PID is derivative-on-error; pid-basics tells the reader to use derivative-on-measurement

- **Where:** `html/scripts/fbe-engine.js` lines 305–326 — the PID
  block's `evaluate()` computes
  `err = action === 'direct' ? pv - sp : sp - pv` and then
  `deriv = s.init ? (err - s.prevErr) / dt : 0`. The derivative term
  is `td * deriv`, where `deriv` is the error's rate of change. That
  is derivative-on-error.
- **The companion page:** `html/education/pid-basics.html` line 42,
  in the D callout: *"Almost always small or zero in HVAC: it
  amplifies sensor noise, so on a twitchy input it does more harm
  than good. If you do use it, derivative-on-measurement (not on
  error) avoids a sudden kick when someone changes the setpoint."*
  Same site, same vocabulary — the engine block does the thing the
  partner education page warns against.
- **Lens:** engineer (confirmed).
- **The issue:** a setpoint change on the function-block PID will
  produce a derivative spike (the "derivative kick" pid-basics names),
  exactly the failure mode the education page tells the reader to
  avoid. Either the engine should be fixed to match the page's
  guidance, or the page-level prose on the editor should call out the
  simplification so a reader who's just been through pid-basics knows
  why the block doesn't follow that rule.
- **Verification:** confirmed (engine code; companion page).
- **Direction:** the cleaner fix is to switch the block to
  derivative-on-PV — keep a `prevPv` in `state`, set
  `deriv = (pv - prevPv) / dt` for direct action and `-(pv - prevPv) / dt`
  for reverse, so the term still adds the right sign to the
  controller output. (Conceptually equivalent to the existing code
  when SP is constant; differs only on SP changes — which is the
  whole point.) Lower-cost alternative: leave the engine as-is and
  add a one-line note on `function-block-editor.html` ("the PID block
  uses derivative-on-error — a textbook simplification; production
  controllers usually do derivative-on-measurement, see pid-basics
  for the reason"). The first option is preferable because the same
  function-block-editor's worked PID example will, if a user nudges
  the SP at the inspector, demonstrate the derivative-kick the
  partner page just warned them about.

**Resolution (2026-05-23):** primary direction — switched the PID
block in `html/scripts/fbe-engine.js` to derivative-on-PV. State now
carries `prevPv` instead of `prevErr`; the derivative term is
`(pv - prevPv) / dt` for direct action and the negation of that for
reverse, so a rising PV still bumps a direct-acting controller's
output up and a reverse-acting one's output down. When SP is
constant the math is identical to the previous derivative-on-error
formulation, so the existing worked PID example (which ships with
`td: 0`) is unaffected; nudging SP at the inspector with `td > 0` no
longer produces the derivative kick that pid-basics warned against.
Block docstring updated to record the choice.

### 9. `refrigerant-data.js` marks R-410A `blend: false` but the file's own header rule says near-azeotropic blends are `blend: true`

- **Where:** `html/scripts/refrigerant-data.js` line 76 — R-410A
  carries `blend: false, glide: 0.2`. Line 175 — R-404A, also a
  near-azeotropic HFC blend (R-125 / R-143a / R-134a), correctly
  carries `blend: true, glide: 1`.
- **The file's classification rule:** the header comment at lines
  47–58 documents the data shape: *"blend: true for zeotropic/near-
  azeotropic blends, false for single component — drives a note only;
  the page always shows bubble+dew"*. By that rule, R-410A
  (R-32 / R-125, 50/50 — a near-azeotropic blend per ASHRAE 34)
  should be `blend: true`.
- **Lens:** engineer (confirmed).
- **The issue:** the data and the header rule disagree, and they
  disagree differently for two refrigerants of the same class
  (R-410A and R-404A are both near-azeotropic HFC blends). The
  `blend` field is currently dormant — no page reads `R.blend` — so
  this isn't user-visible today. But the inconsistency would
  propagate the moment any page (or a future tool) starts surfacing
  the field for an "is this a glide blend?" note or filter.
- **Verification:** confirmed (file lines 76 and 175; ASHRAE 34
  designations of R-410A and R-404A).
- **Direction:** flip R-410A's `blend: false` to `blend: true` —
  it's a near-azeotropic blend, same family as R-404A. Optional
  refinement: update the header rule to add the practical
  distinction the page already cares about — "*near-azeotropic
  with ≤ 1 °F glide is treated as effectively pure for the
  superheat/subcooling math*" — and keep the `glide` field as the
  thing that actually drives any future "is this a glide blend?"
  display logic. Either way: `blend` and the rule should agree.

**Resolution (2026-05-23):** primary direction + the optional
refinement. Flipped R-410A's `blend: false` → `blend: true` in
`html/scripts/refrigerant-data.js` so the field now consistently
follows ASHRAE 34 classification (R-410A, R-404A, R-407C, and
R-454B all carry `blend: true`; R-22 and R-134a stay `false`).
Rewrote the header-comment rule to spell out that `blend` is the
ASHRAE-classification flag while `glide` is the practical "does
the glide matter in the field?" filter — a near-azeotropic blend
with ≤ 1 °F glide behaves effectively pure for superheat /
subcooling math, so a future page that wants to surface "is this
a glide blend you actually have to think about?" should branch on
`glide`, not `blend`. The field is still dormant on the page
today; this is internal-data hygiene against the moment a future
consumer wires it up.

---

## Minor polish (second pass)

Phrasing, undefined jargon, and small wording imprecisions on the
new and changed surface. None change what a page teaches; each is a
quick editorial pass.

- **function-blocks.html** — closing paragraph uses "freeze-stat" as
  an example sequence without a one-line gloss (a coil-temperature
  safety that latches the fan off when supply air drops dangerously
  cold). On a page pitched at PLC-coming or IT-coming readers, a
  parenthetical would land. Same paragraph also drops "reset schedule"
  without explanation. *(newcomer)*
- **function-blocks.html** — the caption under the economizer-enable
  diagram reads "Green wires carry a TRUE digital signal; blue wires
  carry an analog value." The diagram shows no FALSE digital wire, so
  the caption leaves the FALSE case implicit — a newcomer who jumps
  to the editor and sees grey digital wires (the editor's FALSE
  colour) doesn't have the diagram's caption to fall back on.
  Either add "(a FALSE digital wire reads grey)" or drop the colour
  cue and write the caption around the logic only. *(newcomer)*
- **equipment-staging.html** — the Widget 1 timer values
  (`STAGE_DELAY_MS = 2000`, `MIN_STAGE_MS = 4000` in seconds —
  2 s stage delay, 4 s minimum stage time) are theatrical. Real-world
  stage delays and minimum-stage-times for pump/boiler/chiller
  staging are typically several minutes each. The prose says "a
  sustained period" and "a while", which isn't wrong, but a reader
  who notes the widget's 2-second response on a stopwatch and
  generalises it to "real plants stage in seconds" has been
  misinformed by the widget. A one-line caption near the widget
  ("the widget is sped up — real plants use stage delays of several
  minutes") would close the gap. *(engineer)*
- **equipment-staging.html** — "design day" appears as a Try-it
  preset link ("light load (12%) · mid load (50%) · design day
  (95%)") without a one-line gloss. Standard HVAC term for the
  peak design condition; the slider value makes the meaning
  inferable, but an explicit gloss on first use would help a
  newcomer. *(newcomer)*
- **function-block-editor.html** — the PID example chip is labelled
  just "PID loop"; the loaded graph has `action: 'reverse'`, which
  is the heating direction. Either rename the chip to "heating PID"
  / "cooling PID" (matched to the action) so the example's
  controller direction is grounded, or add a tooltip / caption that
  notes the action. *(newcomer)*
- **refrigerant-pt.html** — "TXV" appears in verdict prose ("a TXV
  holds a different value than a fixed orifice") and once more in
  the "About this data" card without expansion. Thermostatic
  Expansion Valve is core refrigeration vocabulary; for a BAS-side
  reader without refrigeration depth, a one-line gloss on first use
  would help. *(newcomer)*
- **refrigerant-pt.html** — metric pressure input label reads
  "Gauge pressure (kPa)". `kPa` alone is ambiguous between absolute
  and gauge in process-engineering contexts. The HVAC convention
  treats manifold kPa as gauge, which matches what the page does,
  but the US-units label is unambiguously "psig" — the metric
  label could match with "(kPa gauge)" or "(kPag)". *(engineer /
  newcomer)*
- **fbe-engine.js** — the `DIVIDE` block returns `0` when the
  divisor is `0` (with a code comment explaining the design choice).
  The function-block-editor page doesn't document this anywhere; a
  user wiring DIVIDE and feeding it a 0 divisor would see a 0
  output, not `Infinity` or `NaN`. Not a bug — but a small note in
  the editor's "How it works" section, or a tooltip on the DIVIDE
  palette entry, would set expectations. *(engineer)*

**Resolution (2026-05-23):** all eight items addressed in one
editorial sweep (matches the first-pass `c8f6544` shape).

- `html/education/function-blocks.html` — glossed "freeze-stat" and
  "reset schedule" inline in the closing paragraph; extended the
  econ-diagram caption to note that a FALSE digital wire reads grey
  in the editor (so the diagram's all-TRUE example lines up with what
  a CTA-follower sees on landing).
- `html/education/equipment-staging.html` — added a `.ref-note.compact`
  caption between Widget 1 and the follow-up prose calling out that
  the 2-second stage delay / 4-second minimum stage time are
  theatrical (real plants run minutes); glossed "design day" inline
  in the next paragraph.
- `html/tools/function-block-editor.html` — renamed the `PID loop`
  preset chip to `heating PID` so the chip text matches the loaded
  graph's `action: 'reverse'`; added a one-line `.ref-note` under
  "How it works" documenting that `DIVIDE` outputs `0` on a `0`
  divisor.
- `html/tools/refrigerant-pt.html` — expanded "TXV" to "TXV
  (thermostatic expansion valve)" on first use in the worked-example
  prose; disambiguated the metric pressure unit from `kPa` to `kPag`
  in input labels, worked-example body spans, the gauge-convention
  sentence, and the runtime suffix helper, matching the unambiguous
  `psig` on the US side.
- `package.json` — version bump `2.3.0` → `2.3.1` (covers the
  whole second-pass audit-fix session: #6–#9 substantive items plus
  this minor-polish sweep, matching the first-pass roll-up cadence).

---

## Audit scope — refinement period, Batch 1: Landings + chrome (2026-05-24)

First batch of a section-at-a-time refinement-period audit. Plan file
`it-s-time-spicy-wolf.md`; running shape recorded in the
`feedback_content_audit` memory as *Shape B*. Three lenses applied
per page (working BMS engineer, *field tech at a panel* — gloves on,
30-sec answer — newcomer to the trade) across four dimensions
(content clarity & voice, visual & layout polish, UX & interaction
friction, cross-page consistency). Findings tagged inline.

Mechanism: dev server + Playwright screenshots at 1440 / 700 / 375
viewports; interactive pass for units toggle, filter chips, deep-link
hash routing, and tab order.

### Coverage checklist

Landings — [x] `/` (home) · [x] `/tools/` · [x] `/simulators/` ·
[x] `/education/`.

Site chrome seen in passing across all four — [x] top nav · [x]
units toggle · [x] footer · [x] schematic-bg (visible only ≥1240 px) ·
[x] hero console-titlebar / statusline · [x] `navCard()` macro shape.

### Interactive behavior — verified clean

Worth recording up front so the substantive findings below stay
focused on what *isn't* working:

- **Units toggle** flips `aria-pressed` cleanly on click (US true →
  false; Metric false → true). Persists across pages.
- **Tools filter chips** (`#all`, `#hvac`, `#protocols`, `#signals`)
  toggle hidden state correctly; counts match (HVAC = 5, Protocols
  = 2, Signals = 2).
- **Education filter chips** likewise correct mechanically (each
  category returns its claimed count — Drives / Control / HVAC /
  Sequencing / Logic each show 1 card, Hydronics 4, Protocols 4).
  Mechanical correctness; the *design* of singleton filtering is
  finding #12.
- **Hash deep-link routing** works (`/tools/#protocols` lands with
  the Protocols chip active and the two cards visible).
- **Tab order** is well-formed on home: skip-to-content link first,
  then site brand, then top nav left-to-right, then units toggle,
  then page content.

### Substantive findings

### 10. Home Browse stage is missing a Simulators card

**[lens: engineer + newcomer | dimension: consistency + content]**

Location: `html/index.html` Stage 2 ("Browse").

Home Stage 2 surfaces two large cards — Tools and Education — that
link to the two corresponding section landings. Simulators is a
peer top-level section (it has a nav slot, its own `/simulators/`
landing, and its own section accent color), but it's *not* in the
Browse row. A visitor scanning home without looking at the top nav
sees the site as two-sectioned, not three.

Pump-control / VFDs / function-blocks Education pages all forward-
link to their paired Simulator, so a newcomer can still get there
indirectly via reading. A returning engineer who knows the site as
"Tools + Education + Sims" notices the asymmetry immediately.

What it would take to fix: add a third `navCard` to the
`.card-grid.two` block on `html/index.html:85`, pointing at
`/simulators/` with parallel framing to the existing two; revisit
whether the grid class stays `.two` or becomes `.three`.

Verification: **confirmed** (screenshot at desktop / tablet / mobile
all show two Browse cards; nav has all three sections).

### 11. "My Most Common Tools" framing is author-centric

**[lens: newcomer + engineer | dimension: content + voice]**

Location: `html/index.html:41` — Stage 1 section header reads "MY
MOST COMMON TOOLS".

The site's About section sits two stages down the page; on first
landing, a visitor doesn't yet know who "I" is. The Stage 1
eyebrow then asks them to read "my most common" without an
antecedent — fine for a personal portfolio, slightly off for a
field-reference site whose value proposition is "useful regardless
of who built it."

The four picked tools (Signal Scaling, BACnet/IP Hex, Thermistor,
Psych Chart) are genuinely the most-reached-for from the catalog,
so the framing isn't wrong — it's just under-justified for someone
who hasn't read the About paragraph yet.

What it would take to fix: rename to a visitor-oriented eyebrow
("Most-reached-for tools" / "Quick access" / "Field favorites") or
add a short subhead under the section label explaining why these
four are surfaced. The first-person framing is consistent across
the home page (About uses "Hi, I'm…"); changing this one wouldn't
break the voice elsewhere.

Verification: **flagged** — this is editorial judgment, not factual.

### 12. Education filter chips for singleton categories are non-features

**[lens: field-tech + newcomer | dimension: UX]**

Location: `html/education/index.html:22-47` — 8 filter chips, of
which 5 (Drives, Control, HVAC, Sequencing, Logic) each tie to
exactly one lesson.

Clicking a singleton chip hides 12 cards and reveals 1. The grid
UI — chips above, multi-card area below — implies "narrow this
collection." Yielding a single card reads as a broken or empty
state, especially on a desktop viewport where the lone card sits
top-left in a 4-col grid of empty space (see
`/tmp/audit-landings-screens/education-filter-drives-singleton.png`).
On mobile the chip row itself takes two lines, which a field-tech
tapping with gloves has to thumb past for what amounts to a
glorified direct link.

The mechanical implementation is correct (deep-linking, hash
sync, aria-pressed all work — see "Interactive behavior verified"
above); the design choice is what's off.

What it would take to fix: a few options, picking one is editorial.
(a) Drop singleton chips, keep only Hydronics (4) and Protocols
(4), promote everything else into an "Other" or "Concepts" bucket.
(b) Drop chips entirely until categories grow — 13 cards browse
fine in one view. (c) Reorganize the grid into category clusters
with subheads (no filtering, visual grouping does the same job).
(d) Keep chips, but switch single-category chips to *highlight in
place* (scroll-to + accent) instead of hide-others.

Verification: **confirmed** — chip counts and visible-card counts
match exactly; the UX issue is the count itself, not the wiring.

### 13. titleShort abbreviation discipline drifts across nav cards

**[lens: engineer | dimension: consistency + visual]**

Locations: `tools/index.html`, `education/index.html`,
`simulators/index.html` `navCard` calls site-wide.

The macro signature reserves `titleShort` for the titlebar's
narrow slot; the long `titleFull` displays as the card title. The
abbreviation discipline is inconsistent across cards:

- Education shortens some lessons (`Hyd Loops`, `Pump Ctrl`,
  `Fn Blocks`, `BACnet Net`) but leaves others full
  (`Load Piping`, `Balancing`, `Equipment Staging`,
  `PID Basics` — same length as the un-shortened ones).
- Tools shortens to genuine clip-needed lengths (`Modbus Reg`,
  `Sig Scaling`, `Refrig P-T`) but `Air Mixing` and `Coil Sizing`
  remain full — they fit fine, but so would `Air-Mix Calc` if the
  rule were "always include the type." There isn't a written rule.
- Simulators uses `Wiresheet` for the Function-Block Editor card.
  The titlebar then reads `SIM :: WIRESHEET` — see finding #14.

The CLAUDE.md "titleShort" bullet under *Schematic-bg chrome*
(line 2718) only says "Trim `titleShort` enough to fit one line"
— a length cap, no normalisation rule.

What it would take to fix: pick a normalisation rule (e.g., "use
the conventional in-trade abbreviation if one exists, otherwise
the full name") and sweep the 25 navCard calls. Or accept the
case-by-case treatment but document that as the rule.

Verification: **confirmed** — pattern is observable from the
landing screenshots.

### 14. Simulators "Wiresheet" titleShort misnames the editor product

**[lens: newcomer + engineer | dimension: content]**

Location: `html/simulators/index.html:42` — third card's
`titleShort: 'Wiresheet'` with `titleFull: 'Function-Block Editor'`.

The titlebar renders as `SIM :: WIRESHEET`, while the
`titleFull` (and the actual tool name, deep-linked from
education/function-blocks and the home nav) is *Function-Block
Editor*. "Wiresheet" is a Niagara-flavored term for the canvas;
it's correct as a description of the surface but isn't the product
name. A newcomer reading "wiresheet" with no prior context has to
infer that the card means "the function-block editor" — the chip
the home nav and the education page both call by a different
phrase.

Adjacent inconsistency on the same card: the pills row reads
`Wiresheet · Logic / Math / Timer / PID · 5 Examples`; the first
pill repeats the titleShort while the card body and titleFull use
"Function-Block." So the page swings between three names for one
thing.

What it would take to fix: rename `titleShort` to one of
`FB Editor`, `Fn Blocks`, or `Block Editor` — all read as
"function-block thing" without using the surface term as the
identifier. Adjust the first pill in lockstep.

Verification: **confirmed** — visible in
`/tmp/audit-landings-screens/simulators-desktop.png`.

### 15. Hero "More coming" badge reads as apologetic

**[lens: engineer + field-tech | dimension: content + voice]**

Location: `html/index.html:27` — hero badges row ends with
`<span class="badge">More coming</span>`.

The site is 25 pages and growing actively (8+ shipped in the last
two weeks). The "More coming" badge framing is from an earlier
era when the catalog was thin enough to need apologising for. To
a first-time visitor scanning the hero, the badge reads as "this
isn't done yet" — undercuts the surrounding badges' confidence
(BACnet/IP Hex, Modbus Register Viewer, etc., each of which names
a shipped, capable thing).

What it would take to fix: drop the badge, or replace with a
concrete next badge ("Psychrometrics" already there; could add
"Refrigerant P-T" or "Function-Block Editor"). The set is
illustrative, not exhaustive — there's no obligation to mark its
incompleteness.

Verification: **flagged** — editorial judgment on tone.

### 16. Hero UPTIME 24×7 statline is the only beat that breaks the field-reference frame

**[lens: engineer | dimension: voice]**

Location: `html/index.html:34` — console-statusline reads
`UPTIME 24×7`.

The hero console-statusline mirrors a BAS device's status frame
(`OK · VERSION v2.8.0 · LAST BUILT 2026-05-24 · UPTIME 24×7`).
The first three carry meaning (the OK pill is the engine-running
metaphor; version + build date are useful provenance markers).
`UPTIME 24×7` is a static-site claim about uptime that the site
doesn't actually measure — it's a gag stat. The other three are
straight; this one swings to joke.

Not a bug; just inconsistent with the otherwise-credible
field-reference frame the site cultivates everywhere else (no
ads, no tracking, accuracy-first content audits, etc.). A real
BAS controller's statline wouldn't claim "24×7"; it'd show an
uptime counter.

What it would take to fix: drop the line, replace with something
verifiable (e.g., `RESPONSE <1S` referencing the lack of network
round-trip for tool answers, or just `PUBLIC` to mirror "no
login"). Editorial.

Verification: **flagged** — judgment on tone consistency.

### 17. Education card ordering tells one story; chip UI invites a different one

**[lens: newcomer | dimension: UX + content]**

Location: `html/education/index.html` card grid.

Cards are ordered as a *curriculum sequence* — PID Basics →
Hydronic Loops → Load Piping → VFDs → Pump Control → Equipment
Staging → Hydronic Balancing → Psychrometrics → Function-Block
Basics → Modbus Basics → Modbus Decoding → BACnet Basics →
BACnet Networking. The friction file's *Education page scope*
section establishes this carefully: pages forward-link, "pay off"
prior callouts, and earn their slot in sequence.

The filter chip row at the top of the page (`All / Hydronics /
Drives / Control / HVAC / Sequencing / Logic / Protocols`) tells
the user *categorical browsing is the way to use this page*. A
newcomer who came in cold and tapped "Hydronics" gets a 4-card
view that doesn't include the prerequisite PID Basics; one who
tapped "Protocols" first gets BACnet/Modbus topics that the
sequence puts *last* on purpose. The chips don't break the
content, but they obscure the curriculum.

What it would take to fix: a few options. (a) Reframe the chip
row as "Already comfortable with X? Jump to:" — explicitly the
shortcut for non-newcomers. (b) Add a small "Read in order" hint
above the grid (`If you're new to this, start at the top and
work down`). (c) If finding #12 (singleton chips are
non-features) gets fixed by dropping chips, this resolves
incidentally — the ordered cards then read as the only
intended path.

Verification: **flagged** — judgment on whether the curriculum
framing is the intended use.

### 18. Same lead-paragraph pattern, three different max-widths and one inline-style copy per landing

**[lens: engineer | dimension: consistency + visual]**

Locations: `tools/index.html:18`, `simulators/index.html:18`,
`education/index.html:18`.

All three section-landing pages open with the same shape: section
h1, then a single-paragraph lead, then either a chip row + grid
or just a grid. The three lead paragraphs are styled with nearly-
matched inline `style="font-weight:300;color:var(--text);max-width:Xpx;margin-bottom:2rem;line-height:1.8;"`
declarations — but `X` is `560` on tools, `560` on simulators,
and `700` on education. The visual cadence between the three
landings is therefore broken: edu has a wider lead, tools/sims
have narrower ones, no visible justification for the difference
beyond edu's longer prose.

This is the same shape codebase-issues #19 promoted to
`.page-intro` on education *content* pages; it never reached the
landing pages because the original pattern sweep didn't
include them.

What it would take to fix: promote a `.landing-intro` (or rename
`.page-intro` to cover both contexts) and sweep the three landing
leads to use the shared class. Pick one max-width — 660 is the
median used by `.page-intro`. Log to `codebase-issues.md` per
the cross-doc convention; this entry stays in `content-audit.md`
to record the *user-visible* inconsistency it caused.

Verification: **confirmed** — three inline-style attributes,
three max-widths, no rationale.

### 19. Education lead asks for "requests or corrections" but doesn't link to contact

**[lens: field-tech + newcomer | dimension: UX + content]**

Location: `html/education/index.html:19` — lead ends with "If you
have any requests or corrections, feel free to reach out."

The page has the site's lone explicit "send me feedback" framing
on the education side, but the phrase "reach out" has no link
behind it. A reader who takes the invitation has to either remember
the top-nav Contact item or scroll to find it. The tools lead just
above says "no login, nothing to install, nothing tracked" — also
field-tech-targeted, also without any actionable next step.

Compare to the lead's other inline anchor: "those live in
[Tools](/tools/)" *is* a link, so the pattern is established
within the same paragraph. The contact CTA just got missed.

What it would take to fix: wrap "reach out" in `<a
href="/contact.html">`, or rephrase to "send a note via the
[Contact page](/contact.html)". One-line edit.

Verification: **confirmed** — the link is missing in source.

### Minor polish

Phrasing, spacing, alignment, undefined-jargon items that don't
rise to a substantive finding but should bundle into one editorial
pass after triage.

- **Home — Stage 1 cards** — the 4-card row is visually tight on
  tablet (700 px) where each card's description wraps to 6–7 lines
  with narrow line-length. Consider tightening descriptions to ~3
  lines on the Sig Scaling and BACnet/IP cards (currently 2–3
  sentences each). *(field-tech)*
- **Home — About card stat-row "Verified: 2026"** — ambiguous what
  was verified. Author identity? Last content audit? Year of activity?
  A one-word clarification ("Active since: 2026" or "Content
  reviewed: 2026") would settle it. *(newcomer)*
- **Home — Footer + console-statusline overlap** — the bottom of
  the page shows a footer ("controlsfreak.dev · OPEN TOOLS FOR
  CONTROLS PROFESSIONALS") plus the same statline-style version /
  build chrome that's already in the hero. Two console frames
  bookend the page; mostly fine, but on a short page (e.g.,
  simulators landing at desktop) the two are very close together
  with little content between. *(engineer)*
- **Tools landing — card order clusters by category except for
  Thermistor** — `signals → protocols → hvac × 5 → signals
  (thermistor)`. With Thermistor moved up next to Signal Scaling,
  the visual clustering matches the categorical taxonomy and the
  trailing-lone-card spot in the 4-col grid stays the same shape
  it does now (the 9-card row count doesn't change). *(engineer)*
- **Tools landing — no eyebrow/identity beyond "Tools" h1** —
  compare to home's stage labels. Could carry a short identity
  framing ("Field calculators & lookups" / "Open it, get the
  number, close it") in the same section-header treatment. *(newcomer)*
- **Simulators landing — 3 cards in 4-col grid at desktop leaves
  an empty fourth column** — currently the schematic-bg motifs
  fill the visual space, but the grid breakpoint could shift to
  3-col for this page specifically so the cards center under the
  lead. *(engineer)*
- **Education landing — chip row at mobile takes two lines** —
  8 chips at 375 px wrap to 2 rows of 4. Functional, but if
  finding #12 trims the chip count this resolves automatically.
  *(field-tech)*
- **Education landing — "Common sense lessons for techs new to
  the industry"** — "common sense" reads as slightly self-
  deprecating (implying the lessons aren't sophisticated). The
  intent is probably "practical / no-nonsense"; consider
  "Practical lessons for techs new to the industry" or
  "Plain-English lessons…". *(newcomer)*
- **Cross-landing consistency — lead paragraph max-widths
  (560/560/700)** — see substantive finding #18; the visual
  inconsistency is observable on mobile especially. *(engineer)*
- **Education lesson card pills — short capitalization mixed** —
  some pills read "Manual / Auto / PICV" (slashes), others read
  "Lead / Lag" (slash with spaces), others "2-Way Valves" (hyphen,
  no slash). Minor visual rhythm break across the grid. *(engineer)*

### Code items split to `codebase-issues.md`

Findings caught during this batch that are code-side rather than
content/UX. Tracked in the partner file per
`feedback_codebase_issues_sweep`:

- Lead-paragraph inline-style duplication across three landing
  pages — `.landing-intro` class promotion candidate. Mirrors
  the prior `.page-intro` extraction (#19 in codebase-issues)
  but for landings. (See finding #18 above for the user-visible
  inconsistency this also caused.)

