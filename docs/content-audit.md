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

**Resolution (2026-05-24):** the Browse stage now carries a third
`navCard` for `/simulators/` alongside Tools and Education
(`773fb8d`); the `.card-grid.two` was kept as-is and CSS grid handles
the three-card row without a class rename. Top-nav parity restored.

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

**Resolution (2026-05-24):** the Stage 1 section header was renamed
from "MY MOST COMMON TOOLS" to "Most-Reached-For Tools" — a
visitor-oriented framing that matches the suggested fix and drops the
first-person "my" antecedent the Stage 1 reader doesn't yet have. The
About section's "Hi, I'm…" voice is unchanged; the eyebrow now reads
true for any visitor regardless of whether they've scrolled to the
author paragraph. Single string edit at `html/index.html:70`.

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

**Resolution (2026-05-24):** the five singleton chips (Drives, Control,
HVAC, Sequencing, Logic) were folded into a new `Fundamentals`
catch-all (`d0f7bc4`); the chip row went from 8 chips to 4 (All /
Fundamentals / Hydronics / Protocols). The chip-row preamble was
reworded to "Know your way around? Jump to:" — framing the chips as
a returning-user shortcut, not a newcomer's filter. Pairs with #17.

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

**Resolution (2026-05-25):** picked the audit's suggested direction
— *use the conventional in-trade abbreviation if one exists (`PID`,
`VFD`, `BACnet`, `P-T`, `FB`); otherwise the full title.* Documented
under CLAUDE.md *Conventions* alongside the eyebrow-shape rule.
Eleven nav cards swept (home / tools / education landings) — the
informal shortenings (`Sig`, `Hyd`, `Pump Ctrl`, `Staging`, `Psych`,
`Fn Blocks`, `Modbus Dec`, `BACnet Net`, `Econ Ratio`, `Modbus Reg`)
all promoted to their fuller forms. Conventional ones (`PID Basics`,
`PID Tuner`, `Mock VFD`, `BACnet`, `Modbus`, `FB Editor`, `Refrig P-T`,
`Psych Chart` — `psych` is in-trade when qualifying *chart*) stayed
in place. Suffix-dropping (`Calculator` / `Converter` / `Interface` /
`Helper`) was preserved as a separate convention, also captured in
the new bullet. Verified at 1920px viewport that the longest titles
(`LESSON :: EQUIPMENT STAGING`, `LESSON :: BACNET NETWORKING`) still
fit the titlebar slot without truncation.

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

**Resolution (2026-05-25):** `titleShort` on the FBE card was renamed
from `'Wiresheet'` to `'FB Editor'` (`3c7cc5c`, 2026-05-24); the
titlebar now reads `SIM :: FB EDITOR`. The first pill at
`html/simulators/index.html:45` was synced from `'Wiresheet'` to
`'Logic Sandbox'` to finish the lockstep call — picked to match the
sibling cards' first-pill shape (subject-domain noun, cf. `'PID Loop'`
/ `'VFD'`) and the card's own `desc` copy. The `desc` keeps
"wiresheet" as a load-bearing descriptor of the canvas type.

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

**Resolution (2026-05-24):** the `<span class="badge">More coming</span>`
slot was dropped from the hero badges row; the trailing slot now carries
a concrete `Latest: …` badge that gets bumped per ship (currently
`Latest: Practice — Modbus Decoding`). The "apologetic" framing is gone
and the bumping pattern reads as a steady stream of new shipped work
rather than an incomplete catalog. Matches the suggested direction
("replace with a concrete next badge"); the surrounding badges keep
their illustrative-not-exhaustive set.

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

**Resolution (2026-05-24):** the `UPTIME 24×7` span was removed from
the console-statusline; final shape is
`OK · VERSION v<X> · LAST BUILT <date>` — three credible status markers
and no gag stat. The OK pill keeps the engine-running metaphor; the
version + build-date pair carries useful provenance. The field-reference
frame the rest of the site cultivates is no longer broken by the one
joke beat at the hero foot.

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

**Resolution (2026-05-24):** the chip refactor in #12 (`d0f7bc4`)
resolved this implicitly — singleton chips collapsed into
`Fundamentals` so chip-jumping no longer skips half the curriculum,
and the chip-row preamble explicitly frames the chips as a
returning-user shortcut. Card-grid sequencing is unchanged; the
prereq chain still tells its story top-to-bottom without competing
chip-UI signals.

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

**Resolution (2026-05-24):** a shared `.landing-intro` class was
promoted to `styles.css` (`365a1b1`); the three landings swept off
their inline `max-width` attributes. A follow-up (`0adbba1`) widened
the class to span the full content column rather than the audit's
suggested ~660px cap, giving the lead paragraphs the breathing room
the page composition needed.

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

**Resolution (2026-05-24):** the "reach out" text on
`html/education/index.html` was wrapped in `<a href="/contact.html">`
(`8e6829f`); the inline CTA is now an actual anchor matching the
other in-page links.

### Minor polish

Phrasing, spacing, alignment, undefined-jargon items that don't
rise to a substantive finding but should bundle into one editorial
pass after triage.

- ~~**Home — Stage 1 cards** — the 4-card row is visually tight on
  tablet (700 px) where each card's description wraps to 6–7 lines
  with narrow line-length. Consider tightening descriptions to ~3
  lines on the Sig Scaling and BACnet/IP cards (currently 2–3
  sentences each). *(field-tech)*~~ — **Skipped — editorial tightening of card descriptions left for a future visual pass; out of audit-impl scope.**
- ~~**Home — About card stat-row "Verified: 2026"** — ambiguous what
  was verified. Author identity? Last content audit? Year of activity?
  A one-word clarification ("Active since: 2026" or "Content
  reviewed: 2026") would settle it. *(newcomer)*~~ — **Resolved in PR #8 (audit-impl) — row is now `REV: 2026-05-24` driven by `site.lastRev`.**
- ~~**Home — Footer + console-statusline overlap** — the bottom of
  the page shows a footer ("controlsfreak.dev · OPEN TOOLS FOR
  CONTROLS PROFESSIONALS") plus the same statline-style version /
  build chrome that's already in the hero. Two console frames
  bookend the page; mostly fine, but on a short page (e.g.,
  simulators landing at desktop) the two are very close together
  with little content between. *(engineer)*~~ — **Skipped — visual nit, no clear single-line fix; rethinking footer/hero relationship is out of audit-impl scope.**
- ~~**Tools landing — card order clusters by category except for
  Thermistor** — `signals → protocols → hvac × 5 → signals
  (thermistor)`. With Thermistor moved up next to Signal Scaling,
  the visual clustering matches the categorical taxonomy and the
  trailing-lone-card spot in the 4-col grid stays the same shape
  it does now (the 9-card row count doesn't change). *(engineer)*~~ — **Resolved in PR #9 (audit-impl) — Thermistor moved to the second slot, right after Signal Scaling.**
- ~~**Tools landing — no eyebrow/identity beyond "Tools" h1** —
  compare to home's stage labels. Could carry a short identity
  framing ("Field calculators & lookups" / "Open it, get the
  number, close it") in the same section-header treatment. *(newcomer)*~~ — **Skipped — landing-page identity-framing is a separate editorial direction (per-section eyebrow shape); not addressed in audit-impl phase.**
- ~~**Simulators landing — 3 cards in 4-col grid at desktop leaves
  an empty fourth column** — currently the schematic-bg motifs
  fill the visual space, but the grid breakpoint could shift to
  3-col for this page specifically so the cards center under the
  lead. *(engineer)*~~ — **Skipped — minor visual nit; nav-card grid revisit is parked as a follow-up after the audit-impl phase per the handoff.**
- ~~**Education landing — chip row at mobile takes two lines** —
  8 chips at 375 px wrap to 2 rows of 4. Functional, but if
  finding #12 trims the chip count this resolves automatically.
  *(field-tech)*~~ — **Resolved in PR #7 (audit-impl) — chip count dropped from 8 to 4 (All · Fundamentals · Hydronics · Protocols); fits one row at 375 px.**
- ~~**Education landing — "Common sense lessons for techs new to
  the industry"** — "common sense" reads as slightly self-
  deprecating (implying the lessons aren't sophisticated). The
  intent is probably "practical / no-nonsense"; consider
  "Practical lessons for techs new to the industry" or
  "Plain-English lessons…". *(newcomer)*~~ — **Resolved in PR #9 (audit-impl) — lead now reads "Practical lessons for techs new to the industry."**
- ~~**Cross-landing consistency — lead paragraph max-widths
  (560/560/700)** — see substantive finding #18; the visual
  inconsistency is observable on mobile especially. *(engineer)*~~ — **Skipped — tracked separately via substantive finding #18; outside the Minor-polish sweep scope.**
- ~~**Education lesson card pills — short capitalization mixed** —
  some pills read "Manual / Auto / PICV" (slashes), others read
  "Lead / Lag" (slash with spaces), others "2-Way Valves" (hyphen,
  no slash). Minor visual rhythm break across the grid. *(engineer)*~~ — **Skipped — visual rhythm nit; canonicalizing pill punctuation across 13 nav-cards is a per-card editorial pass, deferred.**

### Code items split to `codebase-issues.md`

Findings caught during this batch that are code-side rather than
content/UX. Tracked in the partner file per
`feedback_codebase_issues_sweep`:

- Lead-paragraph inline-style duplication across three landing
  pages — `.landing-intro` class promotion candidate. Mirrors
  the prior `.page-intro` extraction (#19 in codebase-issues)
  but for landings. (See finding #18 above for the user-visible
  inconsistency this also caused.)

---

## Audit scope — refinement period, Batch 2: Tools (2026-05-24)

Second batch of the section-at-a-time refinement-period audit. Same
multi-lens Shape B (working BMS engineer / field tech at a panel /
newcomer to the trade × content / visual / UX / consistency) applied
to the 9 tool pages. Numbering continues from Batch 1 (which lives
on `docs/audit-landings` / PR #110 at write time).

### Coverage checklist

Tools — [x] `signal-scaling` · [x] `modbus-register-viewer` ·
[x] `bacnet-ip-converter` · [x] `thermistor-calculator` ·
[x] `psychrometric-chart` · [x] `air-mixing` · [x] `coil-sizing` ·
[x] `economizer-ratio` · [x] `refrigerant-pt`.

Mechanism: dev server + Playwright screenshots at 1440 / 700 / 375
viewports per page (27 captures). Source-read for each page's
input/output structure, initial-state defaults, preamble shape, and
cross-link wiring.

### Substantive findings

### 20. Three tools land cold; six land with a worked example — no rule

**[lens: newcomer + field-tech | dimension: UX + consistency]**

A scan for input `value=` defaults across the 9 tool pages:

```
bacnet-ip-converter      : 0
modbus-register-viewer   : 0
signal-scaling           : 0
thermistor-calculator    : 1   (single temp default)
refrigerant-pt           : 4
economizer-ratio         : 8
psychrometric-chart      : 10
coil-sizing              : 11
air-mixing               : 19
```

The three protocols/signals tools (BACnet/IP, Modbus, Signal Scaling)
land with every input *blank-with-placeholder* — output muted to "—",
no formula rendered, no visible signal of what the tool produces.
The six HVAC tools (psych, mixing, coil, econ, refrig) plus thermistor
land *worked*: their default state is a credible scenario (psych =
summer cooling, econ = OA cooler than setpoint, refrig = R-410A at
118 psig, etc.) so first paint shows a real computed result.

Worked-state landings teach what the tool does in a glance; cold
landings require the visitor to know what to type before they know
what they'll get. The split makes the simpler tools harder to
approach for a newcomer, even though their math is the most
trivial — exactly inverted from where the friction should be.

The cold landings are also inconsistent with the friction-file's
"field-use conditions" rule (gloves on, 30-sec answer). A tech
wanting to convert 12 mA to 0–100 psi has to type four values on
the cold sig-scaling page; on a worked-default version, they'd
override the one input that differs and ignore the rest.

What it would take to fix: add `value=` defaults to the three cold
tools. The picks have to be credible enough to teach the tool's
purpose. Suggested starting points:
- **signal-scaling** — 12 mA on a 4–20 mA signal with 0–100 psi
  span and unit "psi" → 50.0 psi · 50.0 % of span.
- **modbus-register-viewer** — decimal 43981 (0xABCD), which the
  source already uses as the *placeholder* — promote to `value=`.
- **bacnet-ip-converter** — hex `C0A80164BAC0` (the placeholder
  today, decodes to 192.168.1.100 + port 47808).

Verification: **confirmed** — `grep -c '<input[^>]*value="' html/tools/*.html`
gives the counts above.

**Resolution (2026-05-24):** the three cold tools were given credible
`value=` defaults — `signal-scaling` warm-starts all three tabs
(`4c18a50`), `modbus-register-viewer` defaults to `43981` on both
tabs (`dc3879b`), and `bacnet-ip-converter` defaults to a recognizable
hex string (`6407832`). Each tool now lands with a worked example on
the page rather than blank inputs + a muted `—`. Pairs with #21.

### 21. HVAC tools carry preambles; the simpler tools don't

**[lens: newcomer | dimension: content + consistency]**

The five HVAC tools (psychrometric-chart, air-mixing, coil-sizing,
economizer-ratio, refrigerant-pt) each open with a task-framed
preamble paragraph above the inputs:

> *Economizer Ratio Helper:* "How far do I open the outdoor-air
> damper to hit a mixed-air setpoint at these conditions? Dry-bulb
> tab is the calc a tech runs at the panel. Enthalpy tab adds the
> full mixed state and the OA-vs-RA enthalpy-changeover verdict a
> high-end BAS economizer uses to decide whether free cooling is
> worth running in the first place."

These preambles are excellent — they answer "what is this tool
for?" before any input field appears, and they distinguish tabs in
a way that a tech can read once and never revisit.

The four non-HVAC tools (signal-scaling, modbus-register-viewer,
bacnet-ip-converter, thermistor-calculator) have **no preamble at
the top of the tool**. Modbus and thermistor compensate with
reference / "About these tables" cards *below* the calculator;
bacnet has a port-reference card below; signal-scaling has neither.

The asymmetry mirrors the worked-default split from finding #20
and stacks with it: signal-scaling, modbus, and bacnet are
simultaneously the hardest to approach for a newcomer (no
preamble, no worked default) *and* the most mechanical (a one-step
unit conversion or look-up).

What it would take to fix: write a 2–4 sentence task-framed
preamble for each of the four non-HVAC tools, modeled on
economizer-ratio's shape. Pin it above the tabs (or above the
first input section if no tabs). The HVAC tools' existing prose
is a stylebook for this; don't reinvent.

Verification: **confirmed** — visible in
`/tmp/audit-tools-screens/{signal-scaling,modbus-register-viewer,bacnet-ip-converter,thermistor-calculator}-desktop.png`
vs the HVAC tool screenshots in the same directory.

**Resolution (2026-05-24):** the four cold tools without preambles
gained `.tool-preamble` paragraphs in a single editorial pass
(`23a611f`) — task-framed leads in the style of `economizer-ratio`.
Pairs with #20: defaults give the visitor a worked example; the
preambles give them the framing.

### 22. Psychrometric Chart's "New to Psychrometrics?" prereq link sits at the bottom

**[lens: newcomer | dimension: UX + content]**

Location: `html/tools/psychrometric-chart.html` — the
`Psychrometrics Basics` cross-link callout sits at the bottom of
the page, after the chart, the per-stage table, and the detail
property block.

Psychrometric Chart is the densest tool on the site — chart canvas,
step pills for 7 stages, define-by toggles, multiple readout tables,
process delta block. A newcomer landing cold sees the loaded summer-
cooling chart and the seven properties (DB / WB / DP / W / RH / h / v),
many of which they may not yet recognize. The honest move for them
is to read `psychrometrics-basics.html` first — but the link to do so
is only visible after they've scrolled past everything that confused
them.

By contrast, the education-page side of the pair has its CTA to the
chart tool *at the bottom* — which makes sense, because the lesson
walks you through the vocabulary and then offers the practice
surface. The reverse direction needs the opposite placement: the
prereq link should sit *above* the chart, not below.

What it would take to fix: move the `.tool-card` callout that
contains "Psychrometrics Basics" up to immediately under the page's
preamble paragraph, before the chart. Phrase it as a prerequisite
hint rather than a footer ("New to this? Start with
[Psychrometrics Basics](/education/psychrometrics-basics.html)").

Verification: **confirmed** — visible on desktop screenshot
(callout appears in lower third); the source `/education/`
anchor is the last interactive element before the footer.

**Resolution (2026-05-24):** the Psychrometrics Basics prereq link
was moved from the bottom of the page to inline near the preamble
(`0b0b192`); the visitor confused by the chart now reads
"New to psychrometrics? Start with the basics →" before scrolling
past it. Matches the `fbe`/`vfd` placement shape. Pairs with #28.

### 23. Modbus bit-grid cells are below the mobile tap-target threshold

**[lens: field-tech | dimension: UX]**

Location: `html/tools/modbus-register-viewer.html` — bit-grid
(8 cols × 2 rows of clickable bit cells, `id="bit-grid"`).

At 375 px mobile viewport, each bit cell renders at roughly 30 px
square — below Apple's HIG / Material's recommended 44 px minimum
for touch targets and noticeably below thumbable size with gloves
on. The tool's whole pedagogy turns on toggling individual bits to
see how a 16-bit value resolves; a tech in the field who can't
hit individual bits without zooming defeats the affordance.

On desktop and tablet the grid sizes fine — this is a mobile-only
finding.

What it would take to fix: at narrow widths, restructure the grid
to 4 cols × 4 rows (each cell roughly 65 px) instead of 8 × 2,
or accept that bit-grid interaction is desktop-primary and surface
a fallback mobile UI (binary string editor, or dec/hex-input-only
without the grid). The 8×2 choice is documented in source as an
editorial pick — the friction file would track this if it ever
ships a re-pick.

Verification: **confirmed** — `/tmp/audit-tools-screens/modbus-register-viewer-mobile.png`
shows the 8×2 grid at 375 px; the cells span less than 1/8 of the
content width (≈ 30 px after gutters).

**Resolution (2026-05-24):** the Modbus bit-grid gained a media query
that restructures to a 4×4 grid below 700px viewport (`4797e33` /
`05ef25b`), paired with a `.narrow-width-note` callout that flags the
desktop-primary intent (`7c259b0`). The mobile tap-target threshold
is met without giving up the desktop 16-bit row layout. Adopts the
#30 honesty-callout pattern.

### 24. BACnet/IP Converter puts derived "Length" and "Format" readouts in the Input column

**[lens: engineer | dimension: UX + consistency]**

Location: `html/tools/bacnet-ip-converter.html` — Input section
contains `Hex string` (an editable input), then `Length` and
`Format` rows that display "—" until input is provided and become
computed diagnostic values after (length in characters, "address
only" vs "address + port").

The Input / Output convention site-wide is *Input takes what the
user types; Output shows what the tool computes.* Length and
Format are computed from the input — they belong in Output. Today
they sit alongside the Hex string editable field, blurring the
column's semantic.

Functionally fine — users figure it out — but on a 9-tool site
where every other calculator respects the convention rigidly, this
one wobble is noticeable in a side-by-side scan.

What it would take to fix: move the `Length` and `Format` `ps-row`
pairs from the Input `<section>` to the Output `<section>` above
the IP address / UDP port readouts. Or, if they're intended as
inline input validation feedback, restyle them visibly as that
(small italic hint under the Hex string input rather than ps-row
treatment).

Verification: **confirmed** — visible in
`/tmp/audit-tools-screens/bacnet-ip-converter-desktop.png`; source
lines around `<section><h2>Input</h2>...` contain both editable
and readout rows.

**Resolution (2026-05-24):** `Length` and `Format` readouts were moved
from the Input `<section>` to the Output `<section>` on both tabs of
`bacnet-ip-converter.html` (`f97faef`); the site-wide Input/Output
convention is restored, and the editable hex string sits alone in the
Input column with its diagnostics rendered alongside the decoded
address.

### 25. Failure-state UX varies across tools — no shared idiom for "this doesn't compute"

**[lens: field-tech + engineer | dimension: UX + consistency]**

When inputs land in a state the math can't (or shouldn't) resolve,
the tools handle it five different ways:

- **economizer-ratio** — amber callout block with detailed prose
  ("Out of range — OA is cooler than the setpoint, but not cold
  enough to drag RA down on its own. Damper goes 100% OA; the
  cooling coil still has to remove the remaining 33.3 %OA-equivalent
  of load."). Best-in-class — names the failure mode, explains the
  physics, suggests the action.
- **thermistor-calculator** — discreet `Range check` row reading
  "In range" / "Out of range" in the Output ps-rows.
- **signal-scaling / modbus / bacnet** — outputs mute to "—",
  formula blanks. No callout, no diagnostic.
- **psychrometric-chart** — status-line text with red color tint
  when a coil leaving condition is invalid.
- **refrigerant-pt** — green-callout for the *normal* result
  (negligible glide), no special handling for out-of-range
  pressures observed in the default state.

Five tools, four idioms. The economizer-ratio shape is the
strongest by a margin — it teaches *while* it fails, which is
exactly the field-reference angle. A tech who lands an out-of-range
state and only sees "—" learns nothing about why.

What it would take to fix: pick the economizer-ratio amber-callout
shape as canonical for "computed but unphysical / out-of-range"
states, and retrofit the other tools' invalid-state branches to
use it. The shape exists in `styles.css` already (it's the same
class structure as the existing notice/alert chrome).

Verification: **confirmed** by direct inspection of the default
or near-default state across all 9 tool screenshots.

**Resolution (2026-05-24):** a shared `.failure-callout` class was
promoted to `styles.css` (`2566830`); the three cold tools were swept
onto it — `signal-scaling` on all three tabs (`f3d1e11`),
`modbus-register-viewer` on both tabs (`4f12f38`), and
`bacnet-ip-converter` on both tabs (`b9181de`). The amber-callout
idiom now applies wherever a tool says "this doesn't compute"; the
silent `—` mute path is gone from the swept tools.

### 26. Copy-button labels swing between generic and task-specific

**[lens: field-tech | dimension: consistency]**

Copy-button audit across the 9 tools:

| Tool | Copy button label |
|---|---|
| signal-scaling | "Copy value" |
| thermistor-calculator | "Copy value" |
| refrigerant-pt | "Copy value" |
| economizer-ratio | "Copy %OA" |
| air-mixing | "COPY MIXED STATE" |
| bacnet-ip-converter | "COPY IP" / "COPY IP : PORT" (two buttons) |
| coil-sizing | (not surfaced — to confirm) |
| modbus-register-viewer | (no copy button) |
| psychrometric-chart | (no top-level copy — chip-style only) |

Three patterns: generic "Copy value" (3 tools), task-specific
("Copy %OA" / "Copy mixed state" / "Copy IP", 3 tools), and
none (3 tools).

Task-specific labels are clearer for a tech who's checking which
of three open tabs has the value they want — the disambiguation
lives in the button text instead of in muscle memory of which tab
they're on. Generic "Copy value" relies on the user knowing what
the active output is.

Modbus and Psychrometric Chart having no copy is also notable —
on Modbus a tech might want to copy the binary or hex; on
Psychrometric Chart copying the property table for the selected
stage would be useful for pasting into a calc spreadsheet.

What it would take to fix: pick a copy-button labeling convention
(task-specific reads better; generic costs nothing to write) and
either add or rename across the 9 tools. Decide whether Modbus
and Psychrometric Chart need copy primitives at all.

Verification: **confirmed** — labels visible in respective
screenshots.

**Resolution (2026-05-24):** copy-button labels were swept to a
dynamic / task-specific pattern — `signal-scaling` updates per active
unit (`Copy °F`, `Copy psi`, `644a521`); `refrigerant-pt` swaps by
direction mode (`f05655a`); `thermistor-calculator` gained Copy T +
Copy R (`eea00f9`); `modbus-register-viewer` split into Copy decimal /
hex / binary (`a5855a0`); `psychrometric-chart` copies the full
state-point block (`6d72f22`). The literal `Copy value` initial text
in `signal-scaling.html:110` is the empty-state fallback shown only
before a unit is picked — once the warm default from #20 loads, the
dynamic label takes over.

### Minor polish

- ~~**signal-scaling, modbus, bacnet** — no eyebrow phrase distinct
  from the tool title; the section-header label just repeats the
  tool category ("Analog I/O", "Modbus", "BACnet"). HVAC tools'
  eyebrows do the same thing — the issue is the section-label is
  doing the same work as the page title's tag-pill. Could be
  trimmed to just one of them. *(visual)*~~ — **Resolved in PR #2 (audit-impl) — eyebrows standardized to "Tools · <Page>"; they now identify the page, not echo the tag-pill.**
- ~~**modbus-register-viewer "Modbus essentials" lead** — opens with
  the author's voice ("Modbus was the protocol that took me the
  longest to get a handle on"), then the next paragraph reverts to
  third-person impersonal. Voice swing on adjacent sentences.
  *(voice)*~~ — **Resolved in PR #9 (audit-impl) — lead rewritten to match the dry/field-tech voice of the section's other paragraphs.**
- ~~**coil-sizing — Airflow gets its own section header for one CFM
  input.** Three section headers (ENTERING AIR / LEAVING AIR /
  AIRFLOW) where the third is a single-row field. Promote to a
  ps-row at the bottom of LEAVING AIR or use a smaller subhead.
  *(visual)*~~ — **Resolved in PR #9 (audit-impl) — `<h3 class="subhead">Airflow</h3>` deleted on both tabs; row sits as a visual continuation of the preceding section.**
- ~~**signal-scaling "Live zero" footnote at the bottom of the
  reference table** — single sentence with no expansion of *why*
  live-zero detection matters (a broken wire below 4 mA is a
  fault, not a 0 % reading). On a tool whose customer is a tech
  troubleshooting a 4-20 wire, this is the load-bearing concept;
  it could be a small callout, not a footnote. *(content / engineer)*~~ — **Skipped — promoting the live-zero footnote to a callout would need its own design (callout placement, prose expansion); deferred from audit-impl.**
- ~~**Tab-label punctuation drift across tools** — arrows
  (`Signal → Eng. Units`), parens (`P-T (Saturation)`), slashes
  (`Superheat / Subcooling`), word-only (`Single Register`). Each
  feels right in context but the visual rhythm across tools is
  loose. *(consistency)*~~ — **Skipped — site-wide tab-label rethink; each label reads right in context, and a unified punctuation convention would degrade some pages' clarity.**
- ~~**thermistor-calculator — "About these tables" card at the
  bottom** — strong content, but the methodology / data-provenance
  card is structurally similar to the recommended preamble-above-
  inputs shape from #21. Could absorb a one-line "what this tool
  does" framing at the top while the existing card stays as the
  full-provenance section. *(content)*~~ — **Partially resolved in PR #3 (audit-impl) — task-framed preamble added at the top of the tool. The "About these tables" provenance card remains as-is at the bottom (correct outcome per the suggestion).**
- ~~**refrigerant-pt — green callout for the "no glide" R-410A case
  shares colour with the saturation curve on the chart-tool page.**
  Minor cross-tool collision; only visible if you load both pages
  back-to-back. *(visual)*~~ — **Skipped — cross-page visual collision only visible to a back-to-back tab-flipper; not a real-world issue.**
- ~~**psychrometric-chart "Chart range" Standard/Cold toggle** — the
  pair-of-buttons treatment is the canonical "look up by" toggle
  pattern on other pages, but here it controls chart axis bounds,
  not the input define-by. The pattern works either way; if the
  define-by widget shape is canonicalised in `codebase-issues #48`
  (which already did some consolidation), this could carry a different
  treatment to distinguish "view setting" from "input mode." *(visual /
  consistency)*~~ — **Skipped — visual/consistency distinction; works either way, would need a separate canonicalization pass.**
- ~~**All tool pages — section-header label is rendered as `<span class="section-label">`** instead of the `<h1 class="section-label">` shape used on landings, and the page's actual `<h1>` is `.tool-card-title`. The heading hierarchy is fine
  (per codebase-issues #11) but the same class element-swaps depending
  on page archetype. Worth a one-line note in CLAUDE.md if not already
  documented. *(consistency / engineer)*~~ — **Skipped — heading hierarchy already documented in CLAUDE.md `## Conventions`; the class element-swap is the correct shape per archetype, not drift.**

### Code items split to `codebase-issues.md`

- **BACnet/IP Converter readout columns** (substantive #24) — partly
  structural (HTML reshuffle in the Input/Output sections), partly
  semantic (the ps-row treatment for readouts). Logged here in the
  audit; the actual move is a content-page edit not a code item.
  Not logged separately to codebase-issues.
- **Failure-state idiom consolidation** (substantive #25) — if the
  amber-callout shape becomes canonical, it warrants a new shared
  class (or scoped use of existing) in `styles.css` plus a
  CLAUDE.md note. Worth a codebase-issues entry when the editorial
  direction is picked. Not logged today (depends on triage).
- **Mobile bit-grid responsive switch** (substantive #23) — a CSS
  media-query rewrite of `grid-template-columns` at narrow widths.
  Small enough that it can ride along with the editorial response to
  finding #23, no separate codebase-issues entry needed yet.

No standalone codebase-issues entries this batch — the code-side
work all sits downstream of editorial picks the user will make
during triage.

---

## Audit scope — refinement period, Batch 3: Simulators (2026-05-24)

Third batch of the section-at-a-time refinement-period audit. Same
Shape B (3 lenses × 4 dimensions) applied to the 3 simulator pages.
Numbering continues from Batch 2 (which lives on `docs/audit-tools`
/ PR #111 at write time).

### Coverage checklist

Simulators — [x] `pid-tuner` · [x] `vfd-mock` ·
[x] `function-block-editor`.

Mechanism: dev server + Playwright screenshots at 1440 / 700 / 375
viewports (9 captures). Source-read for each page's eyebrow,
preamble, prereq cross-link, presets row, sim-bar, narrow-width
behavior.

### Substantive findings

### 27. Function-Block Editor eyebrow still reads "Tools" — stale from the section move

**[lens: engineer | dimension: content + consistency]**

Location: `html/simulators/function-block-editor.html:12` —
`<span class="section-label">Tools</span>`.

The function-block-editor page moved from `html/tools/` to
`html/simulators/` on 2026-05-23 (recorded in
`site-ideas-and-friction.md` under "Simulators section — split out
from Tools"). Its `nav:` frontmatter was retargeted to
`simulators`, the canonical URL updated, the legacy redirect added
in the Worker — but the page's eyebrow label stayed "Tools."

Live consequence: the page's eyebrow reads `TOOLS` above the title
`Function-Block Editor (LOGIC pill)`, while the top nav has
`Simulators` highlighted as the active section. A visitor sees two
different section names on the same page.

Peer sims for context — `pid-tuner` carries `Loops`, `vfd-mock`
carries `Drives`. Both are nouns naming the conceptual or
equipment category. "Tools" is neither — it's the legacy section
name and reads as a leftover.

What it would take to fix: change `<span class="section-label">Tools</span>`
to a category noun matching the page's content. Candidates:
`Logic` (matches the existing tool-tag pill), `Wiresheet` (the
surface metaphor — same word used in the title-bar of the
`/simulators/` landing card), or `Sequencing` (the application).
`Logic` aligns most cleanly with the pill already on the page.

Verification: **confirmed** — `grep "section-label" html/simulators/*.html`.

**Resolution (2026-05-24):** the FBE eyebrow was changed from `Tools`
to `Logic` (`600a797`); the page header now reads cleanly under the
Simulators nav-active state, and the tool-tag pill on the h1 already
carried `Logic`, so the two markers agree. Stale-after-section-move
artifact fully cleared.

### 28. Prereq cross-link placement varies across sims — two follow fbe/vfd top-of-page model; pid-tuner mirrors the psych-chart bottom-of-page problem

**[lens: newcomer | dimension: UX + consistency]**

The four "tool/sim paired with an Education explainer" surfaces
on the site have the prereq cross-link in two different places:

| Surface | Prereq link placement |
|---|---|
| `simulators/function-block-editor.html` | **Top** — inline in preamble: *"New to it? Start with Function-Block Basics →"* |
| `simulators/vfd-mock.html` | **Top** — inline in preamble: *"New to drives? Start with VFD Basics →"* |
| `simulators/pid-tuner.html` | **Bottom** — `pid-note` paragraph at line 181, after the chart, the symptom→tuning table, and three explanatory notes |
| `tools/psychrometric-chart.html` | **Bottom** — flagged as Batch 1 finding #22 (substantive) |

The function-block-editor and vfd-mock placement is correct — a
newcomer who lands cold sees the prereq link *before* they hit
content that assumes the prereq vocabulary. PID Tuner and Psych
Chart force the newcomer to scroll past the whole tool to find the
explainer that would have made the tool legible.

This is a continuation of Batch 1 finding #22 (psych chart); same
pattern, same fix. The fbe/vfd shape exists on the site already
as the model:

```html
<p class="page-intro">
    A generic drive keypad — not modelled on any specific
    manufacturer's product. The goal is to practice navigating a
    parameter tree, and to feel how the source parameters gate
    every command, before you're standing in front of a live
    drive. <strong>New to drives? <a
    href="/education/vfds.html">Start with VFD Basics →</a></strong>
</p>
```

What it would take to fix: move pid-tuner's prereq link from the
bottom-of-page `pid-note` to inline in the preamble (around line
146–149), matching the fbe/vfd shape. Same edit shape for psych
chart per Batch 1 #22.

Verification: **confirmed** — `grep -n "education" html/simulators/*.html
html/tools/psychrometric-chart.html` shows the placement on each
page.

**Resolution (2026-05-24):** the PID Basics prereq link was moved
from the bottom `.pid-note` paragraph to inline in the preamble
(`880e35f`), matching the `fbe`/`vfd` placement and pairing with #22's
twin fix on the psych chart.

### 29. Sim eyebrow taxonomy is inconsistent — concept / equipment / legacy

**[lens: engineer | dimension: consistency]**

The three sim pages' eyebrow `section-label`:

- `pid-tuner` → **"Loops"** (conceptual category — *control loops*)
- `vfd-mock` → **"Drives"** (equipment category — *the device class*)
- `function-block-editor` → **"Tools"** (legacy section name —
  see finding #27)

After #27 fixes the legacy label, the underlying taxonomy
question remains: do eyebrows name a *concept* (Loops), an
*equipment family* (Drives), or a *surface metaphor / application*
(Logic / Wiresheet / Sequencing)?

Each pick reads fine in isolation. Side-by-side across the three
sims (and across the broader catalog of tool pages where eyebrows
also vary — *Analog I/O / Modbus / BACnet / Sensors / HVAC*), the
discipline reads ad-hoc.

The existing pattern that holds best: eyebrow names the
**conceptual category** the visitor would search for. *Loops* and
*Drives* fit this. *Logic* would fit too. *HVAC* on the chart tool
fits. *Tools* doesn't.

What it would take to fix: pick a taxonomy rule (recommendation:
"conceptual category the visitor would search for; one word
ideally; not a section name") and document in CLAUDE.md under
*Conventions*. Sweep the 12 tool+sim pages for stragglers (most
align already). Specific re-picks needed: function-block-editor
(#27) and possibly the protocol pages (BACnet → BACnet?, Modbus
→ Modbus?, which are arguably fine).

Verification: **confirmed** by the grep in #27 plus the survey
of eyebrows on tool pages from Batch 2.

**Resolution (2026-05-24):** the eyebrow taxonomy was swept to a
uniform `<Section> · <Page Name>` shape across tools and simulators
(`4dbcb16`); paired with `600a797` which cleared the stale `Tools`
eyebrow on the FBE. Different direction than the audit's "conceptual
category, one word" suggestion — the team chose section-name prefix
paired with the page title, which scans predictably and matches
Education's existing pattern. **Documented (2026-05-25):** the rule
landed in CLAUDE.md under *Conventions* alongside the #13 titleShort
sweep so the next session doesn't re-drift.

### 30. Function-Block Editor's narrow-width honesty callout is a positive pattern the rest of the site could borrow

**[lens: field-tech | dimension: UX + content]**

Location: `html/simulators/function-block-editor.html` — at
narrow widths a small callout appears between the preamble and
the sim bar:

> *"This editor is built for a wider screen and a pointer —
> wiring blocks on a phone is cramped. The regions stack below,
> and it still works, but a laptop gives it room to breathe."*

This is the field-tech voice the friction file's *field-use
conditions* rule asks for, applied honestly: instead of
pretending the editor is optimized for mobile, it tells the user
the tradeoff and lets them decide whether to switch devices.
The page still renders functionally at 375 px; it just doesn't
oversell.

Compare to Modbus Register Viewer (Batch 2 finding #23) — the
bit grid falls below tap-target threshold at mobile width but
has no equivalent honesty callout. A user lands at the cramped
state with no signal that the desktop experience is the
intended one.

Compare to Psychrometric Chart at 375 px — chart canvas
compresses substantially, controls dense, no narrow-width
guidance. A user lands at the cramped state, scrolls a 3000 px
mobile page, and probably bounces.

The fbe callout's shape works because:
- It's *above* the cramped affordance, not after.
- It tells the user *what* is cramped and *why*.
- It doesn't apologize or block — the tool still works.

Recommended: canonize this pattern. Any tool/sim with a known
narrow-width tradeoff (modbus bit-grid, psych chart canvas,
PID tuner chart) gets a similarly-styled callout at narrow
widths only. The callout's class could be promoted to
`styles.css` (e.g., `.narrow-width-note { display: none; }
@media (max-width: 700px) { .narrow-width-note { display:
block; ... } }`) and reused.

Verification: **confirmed** — visible in
`/tmp/audit-sims-screens/function-block-editor-tablet.png`
(the callout shows at 700 px); cross-check against the
modbus/psych mobile screenshots from Batch 2's
`/tmp/audit-tools-screens/`.

**Resolution (2026-05-25):** `.narrow-width-note` was promoted to a
shared class in `styles.css` on 2026-05-24 (`2566830`); the FBE
migrated off its page-local `.fbe-narrow-note` (`2a4c4da`) and
`modbus-register-viewer` adopted the callout alongside its #23
bit-grid restructure (`7c259b0`). The remaining two deploys
(`psychrometric-chart` and `pid-tuner`) shipped 2026-05-25, both
gated at `@media (max-width: 700px)` and placed directly above the
cramped affordance — the chart canvas in both cases. Pattern is now
canonized across all four targets the audit named; future tools
with a desktop-primary affordance can reach for the same class.

### Minor polish

- ~~**pid-tuner — preamble line** opens "A fan loop. Set your
  loops..." — the second word `loops` reads almost as a typo for
  `controls` until the visitor parses it as "your control loops."
  Slight stumble on a load-bearing intro sentence. *(content)*~~ — **Already resolved by a prior edit — current preamble opens "A toy loop, not your loop — the process below is a simple first-order model with dead time.", which doesn't have the loops-vs-controls ambiguity.**
- ~~**pid-tuner — TRY A TUNING preset chip styling** doesn't visually
  distinguish *the answer state* (RIGHT) from *the problem states*
  (SLUGGISH, NEEDS DECAY, TOO SOFT). A visitor clicking through
  has to read each label to know which is the target vs the
  starting point. The fbe / vfd / refrig-pt preset chips have a
  similar issue but with less semantic loading. *(visual / UX)*~~ — **Skipped — preset-chip styling redesign is a separate visual pass; deferred from audit-impl.**
- ~~**vfd-mock — "TRY THIS" preset link "the classic mistake"** is
  the configuration that demonstrates the run-source / speed-source
  gating bug from the VFDs explainer. Excellent pedagogy. Worth
  flagging as a *strength* — the discovery-prompt-pattern presets
  could pop up elsewhere (e.g., function-block-editor's
  "freeze-stat shutdown" is conceptually similar). *(strength /
  consistency)*~~ — **N/A — strength flag, no action item. Recorded for posterity.**
- ~~**vfd-mock — preamble link "New to drives? Start with VFD Basics →"**
  styles the `Start with VFD Basics →` as the anchor; on
  function-block-editor the same shape exists. PID Tuner's
  bottom-of-page link uses the same phrase ("Start with the basics
  →") but at the bottom. The phrase is canonical across the three;
  only the placement varies. *(consistency)*~~ — **Skipped — placement variance noted; no clear single-line fix that doesn't degrade per-page flow.**
- ~~**function-block-editor — sim bar uses standard text buttons
  (PAUSE / STEP / RESET / CLEAR) plus a plain-text "Running"
  status pill**. The status pill could carry the same `ok-pill`
  treatment used elsewhere on the site (hero, nav-card titlebar)
  for visual consistency. *(visual / consistency)*~~ — **Skipped — visual consistency tweak; would need styling work to match `.ok-pill` shape without breaking the sim-bar layout.**
- ~~**function-block-editor — Inspector panel says "Select a block
  to edit its parameters, or a wire to remove it. Click a palette
  block to add one."** plus "Press Delete to remove · Escape to
  cancel a wire." A newcomer who's never used a wiresheet might
  not know what "palette" refers to (the left-column block list).
  Add a one-word gloss or use "the left column" in the first
  sentence. *(content / newcomer)*~~ — **Resolved in PR #9 (audit-impl) — Inspector default hint now reads "Click a block in the left-column palette to add one."**
- ~~**All three sims — preset chip rows are inline-styled (variants
  of `.try-chip` or similar inline class shapes).** Codebase-issues
  may already track this; if not, the preset-chip class is a
  shared pattern across all 3 sims + refrigerant-pt + a few tools
  and could promote to `styles.css`. *(consistency / engineer)*~~ — **Skipped — code-side consolidation; tracked separately as a styles.css promotion candidate, not Minor-polish sweep work.**
- ~~**pid-tuner — Parameter Style toggle dropdown ("Gain · Reset
  · Rate (ISA standard)" / "Kp Ti Td (EBO)" / "PB Ti Td (Distech)")**
  is excellent pedagogy but lives in a `<select>` — a button group
  (like the chart-range toggle on psych chart) would invite more
  exploration. *(UX)*~~ — **Skipped — UX-pattern redesign (select → button group); needs its own design pass.**

### Code items split to `codebase-issues.md`

- **Function-Block Editor stale eyebrow** (substantive #27) — pure
  content edit, one-line fix. Not logged separately.
- **Narrow-width honesty callout** (substantive #30) — if the
  pattern is canonized, a `.narrow-width-note` class promotion
  to `styles.css` is the code-side follow-up. Worth a
  codebase-issues entry when the editorial direction is picked
  during triage. Not logged today.
- **Preset-chip class promotion** (minor polish) — same shape: a
  shared `.try-chip` or `.preset-link` class consolidation
  candidate, worth a codebase-issues entry once the convention is
  picked. Not logged today.

No standalone codebase-issues entries this batch — all code work
sits downstream of editorial picks.

---

## Audit scope — refinement period, Batch 4: Education (2026-05-24)

Fourth and final batch of the section-at-a-time refinement-period
audit. Same Shape B (3 lenses × 4 dimensions) applied to the 13
education pages. Numbering continues from Batch 3 (PR #112 at
write time); after this batch the full audit is in-file and
ready for triage.

Two prior content-audit passes (2026-05-21 first pass, 2026-05-23
second pass) already swept these pages for accuracy and clarity.
Batch 4's findings are mostly *cross-page structural* — patterns
in titles, eyebrows, and cross-link wiring that read as drift
when seen side-by-side across the 13 pages.

### Coverage checklist

Hydronics cluster — [x] `hydronic-loops` · [x] `load-piping` ·
[x] `pump-control` · [x] `balancing`.

Drives + sequencing cluster — [x] `vfds` · [x] `equipment-staging` ·
[x] `function-blocks`.

HVAC + control cluster — [x] `pid-basics` ·
[x] `psychrometrics-basics`.

Protocols cluster — [x] `modbus-basics` · [x] `modbus-decoding` ·
[x] `bacnet-basics` · [x] `bacnet-networking`.

Mechanism: dev server + Playwright screenshots at 1440 / 700 / 375
viewports (39 captures, with top/bottom crops). Source-read for
title shapes, eyebrow shapes, preamble patterns, cross-link
wiring, and `data-objref` numbering distribution.

### Substantive findings

### 31. Education page title pattern splits 8/5 — older pages carry an em-dash subtitle, newer ones go bare

**[lens: newcomer | dimension: content + consistency]**

`.tool-card-title` text across the 13 education pages:

**With em-dash subtitle (8 pages):**

| Page | Title |
|---|---|
| hydronic-loops | Hydronic Loops — How Water Gets Around a Building |
| load-piping | Load Piping — How Loads Connect to the Loop |
| pump-control | Pump Control — How a BMS Drives the Pump |
| balancing | Hydronic Balancing — Getting Design Flow to Every Load |
| equipment-staging | Equipment Staging — Running Pumps in Parallel |
| psychrometrics-basics | Psychrometrics Basics — The Words on the Chart and How to Understand Them |
| vfds | VFDs — Variable Frequency Drives (*acronym expansion, not a question* — see polish item below) |

**Bare title (5 pages):**

| Page | Title |
|---|---|
| bacnet-basics | BACnet Basics |
| bacnet-networking | BACnet Networking |
| function-blocks | Function-Block Basics |
| modbus-basics | Modbus Basics |
| modbus-decoding | Modbus Decoding |

(pid-basics is excluded — see #29 from Batch 3; it has no
`.tool-card-title` because the page structure is mini-sim-heavy
rather than tool-card-wrapped.)

The 8 pages with subtitles read as "here's what you'll learn"
on first glance. The 5 bare titles read as "here's the topic;
figure it out from the prose." The pages with subtitles are
older and were shaped during a period where titles got the
"question framing" treatment; the 4 newer protocol/logic pages
(plus the *VFDs* outlier) didn't.

The split tracks chronology, not page type — every old page got
a subtitle, every new page didn't. Suggests the convention drifted
mid-project rather than the newer pages making a deliberate
different call.

What it would take to fix: pick the pattern and sweep. Direction
options:
- *Adopt subtitle pattern across all 13.* Suggested for each bare:
  - `BACnet Basics — Objects, Properties, and the Wire`
  - `BACnet Networking — Three Addresses and How the Frame Travels`
  - `Function-Block Basics — Logic by Wiresheet`
  - `Modbus Basics — What's on the Wire and How a Request Looks`
  - `Modbus Decoding — Why the Register Reads Wrong`
- *Adopt bare pattern across all 13.* Drop the existing em-dash
  clauses; each page's lead sentence does the same job anyway.
- *Keep both, document the rule.* If subtitles are for "narrative"
  pages and bare titles are for "reference" pages, codify the
  distinction in CLAUDE.md.

Verification: **confirmed** — `grep "class=\"tool-card-title\"" html/education/*.html`.

**Resolution (2026-05-24):** the em-dash subtitle pattern was stripped
from the seven older education pages that carried it (`2d1753f`),
unifying all 13 lessons on the bare-title shape. The titlecard
inventory now reads as a single set rather than two cohorts.

### 32. Cross-section eyebrow shape: Education uses `Education · Page Name`; Tools and Simulators use just the category

**[lens: engineer | dimension: consistency]**

Three section types, three eyebrow shapes:

- **Tools** — `<span class="section-label">Analog I/O</span>`,
  `Modbus`, `BACnet`, `Sensors`, `HVAC`. Just the category, one
  to two words.
- **Simulators** — `<span class="section-label">Loops</span>`,
  `Drives`, `Tools` *(stale — Batch 3 #27)*. Just the category.
- **Education** — `<span class="section-label">Education · Pump
  Control</span>`. Two-part: section name + page name.

Education's two-part shape carries useful context for a deep-link
lander ("I'm on an Education page about Pump Control") but
duplicates information already visible in the top-nav active
section, the URL, and the page title. Tools and Simulators get
by without the section name in the eyebrow because the eyebrow's
job is to carry the *category* (the implicit "Education" prefix
is established by being on the page already).

The asymmetry is functional but reads as a third drift pattern
when the three landings are walked back-to-back-to-back.

What it would take to fix: pick a shape and sweep.
- *Drop the "Education · " prefix from education page eyebrows.*
  Each page's eyebrow becomes just the page name (e.g. "Pump
  Control" or "Hydronic Loops"). Matches tools/sims shape;
  active-nav highlight + page title do the rest.
- *Add the section name to tools/sims eyebrows.* e.g.
  `Tools · Signal Scaling`, `Simulators · PID Tuner`. Heavier
  but explicit.
- *Keep both, document the rule.* "Education pages carry their
  section in the eyebrow because the curriculum framing matters;
  tools/sims don't because they're standalone utilities." Same
  shape pickable on a stylebook basis.

Verification: **confirmed** by surveys done for Batch 2 #14
(tools eyebrows), Batch 3 #29 (sims eyebrows), and this batch
(education eyebrows).

**Resolution (2026-05-24):** addressed alongside #29 — `4dbcb16` swept
tools and simulators onto the `<Section> · <Page>` shape that
education was already using. The cross-section inconsistency that
made #29 and #32 a pair is gone. **Documented (2026-05-25):** rule
captured in CLAUDE.md under *Conventions* alongside #29 and #13.

### 33. `data-objref` SEC:NNN numbering lives on 2 pages of 13 — visual signal of "this is a curriculum sequence" doesn't extend to the rest

**[lens: newcomer + engineer | dimension: consistency + content]**

Two education pages carry `data-objref="NNN"` on their h2
subheads, rendered via CSS as `SEC:001 · LABEL` (the rename from
`AV:001` happened in the second-pass audit, finding #6):

- `pid-basics.html` — SEC:001 / SEC:002 on two subheads
- `psychrometrics-basics.html` — SEC:001 on one subhead

The other 11 education pages have no SEC:NNN prefixes — their
subheads are plain text. The prefix is a visual cue that the
page's content is sequenced (sections 1, 2, 3...). On a
curriculum-driven site where every page is one question answered
through ordered sections, the cue arguably belongs everywhere or
nowhere — landing on two of thirteen reads as decoration that
got applied here-and-there rather than a system.

Two possible reads:
- The two pages with `data-objref` are the *paired-with-a-sim*
  cohort (pid-basics ↔ pid-tuner; psychrometrics-basics ↔
  psychrometric-chart) — but function-blocks is also paired with
  a sim and doesn't have the prefix, so the cohort doesn't hold.
- These two were the first education pages shipped with the
  BACnet-flavored numbering experiment and the others simply
  weren't retrofitted.

What it would take to fix: editorial pick.
- *Drop the SEC:NNN prefix on the two pages.* Removes the
  decoration; sub-section ordering is implicit in document order
  already.
- *Add SEC:NNN to all 13 pages.* Commits to the curriculum-
  sequence framing visually. More work; only worth it if the
  cue actually helps a newcomer navigate.
- *Keep limited to the two paired-with-sim pages and add to
  function-blocks (the third such page) for completeness.* If
  the original intent was "the paired-with-sim pages get the
  BACnet-flair," then function-blocks just got missed.

Verification: **confirmed** — `grep -l 'data-objref' html/education/*.html`
returns only the two pages; the rendering rule lives in
`styles.css` (`h2.section-label[data-objref]::before { content:
"SEC:" attr(data-objref) " · "; }`).

**Resolution (2026-05-24):** the SEC:NNN numbering was dropped from
the two education pages that carried it (`1a0f2e8`), matching the
audit's "drop it" option. The two-of-thirteen inconsistency that
made the numbering read as decoration applied arbitrarily is gone;
education pages now scan as a unified set without the
partial-system signal.

### Strengths flagged (cross-page wiring done well)

These aren't problems — they're positive patterns from the
education batch worth recording so subsequent edits don't
inadvertently break them.

- **Hydronics forward-link chain** — load-piping → pump-control →
  equipment-staging → balancing each open with an inline reference
  to the predecessor page and close with a forward-link to the
  next. The chain is intact end-to-end; a newcomer following the
  forward-link discipline reads them in order without ever
  bouncing back to the section landing. Documented in
  `site-ideas-and-friction.md` under "Education page scope" —
  the audit confirms the discipline held across all five
  hydronics+drives pages.
- **Lesson → tool cross-link discipline** — every lesson paired
  with a tool or sim carries the cross-link inline in the
  preamble: modbus-basics → Modbus Register Viewer (inline),
  modbus-decoding → Modbus Register Viewer (inline),
  function-blocks → Function-Block Editor (inline),
  bacnet-basics → BACnet/IP Hex Converter (inline). This is the
  *correct* placement (compare Batch 1 #22 + Batch 3 #28: psych
  chart and pid-tuner have it at the *bottom*, which is the
  wrong direction). The education side does it right; the tool
  side has the drift.
- **Field-voice anecdote density** — pump-control (deadhead at
  0 demand), vfds (the classic-mistake reveal), balancing
  (burst-coil at low ΔP), equipment-staging (worn-lead-pump),
  psychrometrics-basics (the natatorium quote on the pool
  widget). The friction-file's "discovery prompt + reward"
  Education-page idiom holds — most education pages have at least
  one anecdote-driven payoff. The 3 pages without
  (function-blocks, modbus-basics, pid-basics) are mostly
  vocabulary-oriented; the anecdotes wouldn't fit naturally.

### Minor polish

- ~~**vfds — title pattern is acronym-expansion, not question.**
  "VFDs — Variable Frequency Drives" expands the acronym (which
  the lead does anyway in its first sentence) instead of asking
  the page's question. Either drop the subtitle (matches the
  "bare" pattern) or rewrite to the question shape (e.g.,
  *"VFDs — What the Drive Actually Does Between the Wire and
  the Motor"*). *(content)*~~ — **Resolved in PR #2 (audit-impl) — subtitle dropped; H1 is bare "VFDs".**
- ~~**vfds — section-header subhead "RUN COMMAND VS SPEED
  REFERENCE — THE TWO THINGS YOU'VE LEARNED"** — *you've learned*
  presumes the reader is several scrolls in, but the subhead
  also reads as a stand-alone section title for someone arriving
  via the table of contents (which doesn't exist on the site,
  but might land later for long pages). Slightly conversational.
  Drop "— THE TWO THINGS YOU'VE LEARNED" for *"RUN COMMAND VS.
  SPEED REFERENCE."* *(content)*~~ — **Resolved in PR #9 (audit-impl) — subhead trimmed to "Run Command vs. Speed Reference"; the audit-time text was "The Two Things You're Doing" (already edited from "You've Learned").**
- ~~**modbus-basics + modbus-decoding lead paragraphs** — both
  cross-link to each other in the lead, which is good wiring,
  but the duplicated "Modbus Basics covered..." / "Modbus
  Decoding covers..." openings make the pair feel like one
  document split. Could tighten one to lead with "Read [Modbus
  Basics](/education/modbus-basics.html) first." *(content)*~~ — **Partially resolved by prior edit — modbus-basics now opens with a historical/contextual lead ("Modbus is older than most building automation..."), no longer mirroring modbus-decoding's back-reference shape. The remaining `Modbus Basics covered…` opener on modbus-decoding stays — its informative summary of what Basics covered is more useful than a bare "Read [Basics] first" link.**
- ~~**bacnet-networking — page title vs lead voice asymmetry.** Lead
  starts factual ("BACnet Basics covered..."); the page-intro pattern
  on hydronics pages opens with field voice ("On the load-piping
  lesson..." or "Two ways to handle the bypass..."). The protocol
  pages read more clinical. *(voice)*~~ — **Skipped — voice-asymmetry rewrite would need a meaningful editorial pass on the lead prose; out of audit-impl scope.**
- ~~**psychrometrics-basics — title is the longest of any education
  page** (`Psychrometrics Basics — The Words on the Chart and How
  to Understand Them` = 75 chars). Could trim to *"...The Words
  on the Chart"* without losing the framing. *(content)*~~ — **Resolved in PR #2 (audit-impl) — subtitle dropped entirely; H1 is bare "Psychrometrics Basics".**
- ~~**All hydronics pages — SVG flow-diagram styling uses `.edu-svg`
  (per codebase-issues consolidation history)** but the captions
  underneath are still inline-styled across pages. Captions like
  *"← supply main, return main →"* appear inline on hydronic-loops,
  load-piping, pump-control with similar but not identical styling
  — could promote to a shared `.edu-caption` class for consistency.
  *(consistency)*~~ — **Skipped — code-side promotion candidate; tracked separately as a `.edu-caption` class consolidation, not Minor-polish sweep work.**
- ~~**equipment-staging — Widget 1 "stage delay countdown" lacks
  visible scrubber** for the user to drag time forward instead of
  waiting. Not a substantive UX bug (the widget's pedagogy is the
  natural-time experience), but if a tech wants to demo the
  stage-up-then-down cycle quickly, they're waiting 4–6 seconds
  per state. Mentioned for completeness; if widget UX gets
  consolidated, this could ride along. *(UX)*~~ — **Skipped — UX feature add (scrubber control); the audit itself flags it as not a substantive bug. Deferred for a widget UX consolidation pass.**
- ~~**function-blocks — page is the shortest of the 13** (~3300 px
  desktop full-page) and uses no widget, no anecdote. Reads as
  setup material before the simulator, which is exactly its job.
  Worth flagging that this *shape* is itself a valid education-page
  archetype (vocabulary-only, sim-paired) — codify if a future page
  needs the same shape. *(strength / pattern)*~~ — **N/A — strength flag, no action item. Recorded for posterity.**

### Code items split to `codebase-issues.md`

- **`.edu-caption` class promotion** (minor polish bullet) — the
  edu-svg caption styling is currently inline. If the pattern is
  canonized, a class promotion is the codebase-side follow-up.
  Worth a codebase-issues entry once the editorial direction is
  picked. Not logged today.

No standalone codebase-issues entries this batch — same posture
as Batches 2 and 3: code work depends on editorial picks the user
will make during triage.

### End of audit — full picture posture

This is the fourth and final batch of the refinement-period audit.
After all four PRs merge, `content-audit.md` carries:

- **Batch 1 (Landings + chrome)** — findings #10–19 (10 substantive)
- **Batch 2 (Tools)** — findings #20–26 (7 substantive)
- **Batch 3 (Simulators)** — findings #27–30 (4 substantive)
- **Batch 4 (Education)** — findings #31–33 (3 substantive)

24 substantive findings total across the 28-page audit, plus
minor-polish lists, plus one standalone codebase-issues entry
(#72 — landing lead inline-style duplication). Cross-cutting
patterns dominate (worked-default split, preamble presence,
prereq link placement, eyebrow taxonomy, title pattern) over
per-page issues — the site is structurally consistent in many
ways and structurally drifting in a handful of specific shapes.

Per the plan, triage of the full audit is the next step. The
nav-card grid question (parked since the plan kickoff) gets
re-evaluated with the full audit as context.

## Audit scope — UX walkthrough spillover (2026-05-29)

The 2026-05-29 three-persona UX walkthrough (deliverable:
`ux-audit.md`) was an experience pass, not a content pass — but one
finding is a content-clarity issue and is logged here. Numbers
exercised across the calc tools during that walk all checked out
(signal-scaling, coil-sizing, air-mixing, economizer-ratio,
refrigerant-pt glide caveat, modbus byte/word-order, bacnet-ip);
nothing new and confirmed-wrong surfaced.

### 34. PID tuner's tuning cheat-sheet describes failure modes the simulator can't reach

**Location:** `/simulators/pid-tuner.html` — the on-page tuning
guidance ("Overshoots, then recovers → ↓ P") vs. the model's reachable
behavior. **Lens:** working engineer. **Verification status: flagged**
(engineering-judgment, not a wrong number).

The cheat-sheet prose describes ringing / overshoot-then-recover as a
condition the user should tune away. But the three modeled FOPDT
processes sit at low dead-time ratios (≈0.13) and modest process gain,
so even at the slider maxima (Kc=20, Ki=6) the loop stays well-damped:
measured overshoot was `none` (fast), `6.7%` (med), `8.4%` (slow). No
reported value is *wrong* — every readout is internally consistent —
but the guidance points at a behavior the simulator can't demonstrate
within its sliders, so a reader who tries to reproduce the "too much
gain" case can't, and may read the tame response as a broken metric.
Distinct from the existing pid-tuner notes (which cover the dead-time
ratio prose and vendor parameter-style claims, not the reachable
overshoot envelope).

**Suggested direction:** see `ux-audit.md` finding 6 — widen the Kc
range or add a higher-dead-time process preset so the unstable regime
is reachable, or caption that the modeled processes are deliberately
well-behaved and won't ring. The primary fix is the simulator's
reachable envelope, so the finding lives in `ux-audit.md`; this entry
is the content-clarity cross-reference.

**Addressed (2026-05-30).** Added a fourth process preset, **High
dead-time** (dead ÷ τ ≈ 0.5), to `PID_PROC`. Cranking gain on it now
overshoots (~14 % at Kc 8), rings, and won't settle, tripping the >20 %
overshoot warn at the slider maxima — so the cheat-sheet's "Overshoots,
then recovers" / "Oscillates / hunts" rows now describe behavior the user
can actually produce. The pid-note above the cheat-sheet points at the new
preset as the one to pick to *see* the symptoms. The well-behaved buckets
are unchanged. Primary fix logged at `ux-audit.md` #6.

## Audit scope — 2026-06 extensive audit spillover (2026-06-10)

The June 2026 extensive audit (master doc: `docs/audits/2026-06-extensive/findings.md`, PR #205)
raised content-accuracy and wording items that need editorial / domain
decisions rather than mechanical fixes. They're cross-filed here per
the triage handoff; each cites its full evidence in the master doc, so
these entries summarize and point. Unambiguous factual corrections from
the same audit (master #47, #48, #51, #52 + comment-level polish)
shipped separately in the mechanical-fix sweep and are *not* re-listed.

### 35. Refrigeration content cluster (3 lessons + quizzes) is imperial-only while its paired tool converts fully

**Location:** education/superheat-subcooling, refrigerant-cycle-basics,
metering-devices-txv-eev (zero `data-metric` spans between them); quiz
banks superheat-subcooling (numeric answer demands "in °F"),
sequencing-scenarios, psychrometrics-basics, hydronic-loops.
**Lens:** metric. **Verification status: verified**
(`docs/audits/2026-06-extensive/findings.md` #3).

The superheat lesson tells the reader to cross-check in the
refrigerant-pt tool — which in metric shows the same system as
814 kPag / 4.3 °C, so the numbers don't connect. No doc records
imperial-only as a decision (`refrigerant-education-plan.md`'s units
rule is gauge-vs-absolute). Depends on units.js loading site-wide
(master #2, shipped in the mechanical sweep) — the span convention
works on these pages now.

**Suggested direction:** dual-state lesson worked examples with the
existing span convention; for quizzes, at minimum dual-state prompts
("48 °F (8.9 °C)"). Part of the one-decision metric-content-strategy
cluster with #36/#37 below.

**Resolved (2026-06-10):** owner approved dual-stating. All three
refrigeration lessons now carry `data-us`/`data-metric` spans on every
pressure, temperature, and worked-example code line (118 psig →
814 kPag, 40 °F → 4.4 °C, superheat 10 °F → 5.6 °C…), matched to the
P-T tool's own metric values so the cross-check connects. Quiz
prompts in superheat-subcooling, refrigerant-cycle-basics,
sequencing-scenarios, psychrometrics-basics, and hydronic-loops are
dual-stated with static parentheticals (the quiz DOM paints after the
units walker runs); numeric answers stay in their stated unit. The
rounding policy (#37) governs every converted pair.

### 36. Worked-example formula/plug-in steps keep IP-only constants and numbers in metric, contradicting the converted prose around them

**Location:** coil-sizing (`ṁ = CFM × 60 ÷ v` under a dual-stated
intro), economizer-ratio (US plug-in numbers on the metric page),
refrigerant-pt SH/SC tab, air-mixing, psychrometric-chart methodology
note, psychrometrics-basics ("ft³ per pound"). **Lens:** metric.
**Verification status: verified** (`docs/audits/2026-06-extensive/findings.md` #4).

Decision needed: convert whole formula lines (metric cp form
`1.006 + 1.86·W`, m³/h mass-flow form, converted plug-ins) vs caveat
the engine-methodology notes as IP-native ("computed in IP units").

**Suggested direction:** sweep worked-example `<li>` steps and
methodology notes with the same `data-us`/`data-metric` treatment the
intros already have — coordinated with #37's rounding policy so the
dual-stating doesn't introduce new mismatches. The affinity-laws page
is a documented exception (deliberately unit-agnostic/US-framed per
the friction file) — dual-stating its example prose would be a
refinement against that entry, not drift.

**Resolved (2026-06-10):** owner picked the caveat route for
IP-native formula lines: coil-sizing (both tabs), air-mixing, and the
psychrometric-chart methodology note now state that the quoted
formula forms (0.240, 0.444, CFM·60/v) are the engine's native
ASHRAE IP formulation with metric converting at the display boundary.
Unit-agnostic plug-ins converted instead: economizer-ratio's two
worked-example plug-in lines are dual-stated (the ratio formula has
no IP constants), refrigerant-pt's SH/SC walkthrough and glide rules
of thumb are dual-stated, and psychrometrics-basics names m³/kg and
g/kg alongside the IP forms. The affinity-laws exception stands.

### 37. Metric worked-example numbers don't reconcile internally — round-then-convert granularity makes the taught arithmetic fail

**Location:** pid-basics in metric (SP 13 / PV 16 / error 2.8 °C — the
subtraction being taught gives 3, not 2.8); economizer-ratio's default
metric formula line "(18.3 − 23.9) ÷ (15.6 − 23.9) × 100 = 66.7 %"
whose own operands reduce to 67.5 %. **Lens:** units correctness.
**Verification status: verified** (`docs/audits/2026-06-extensive/findings.md` #53; the 56-pair
census referenced there is the sweep list).

**Suggested direction:** a rounding policy so taught arithmetic
closes — round metric temps in worked examples to one decimal
(12.8/15.6/2.8 reconciles); where the tool can replicate an example,
state the result a metric user will actually see. One decision with
#35/#36.

**Resolved (2026-06-10):** policy adopted and recorded as a CLAUDE.md
convention. pid-basics' metric worked example now reads 12.8 / 15.6 /
11.1 / 2.8 (closes); economizer-ratio's live formula line recomputes
its trailing result from the displayed rounded operands (metric
default shows 67.5 %, matching what typing those numbers yields) and
the static worked example states 67.5 % in metric; every pair added
under #35/#36 follows the policy (deltas are differences of displayed
operands — e.g. subcooling 40.6 − 35.0 = 5.6). Census multi-pair
lines audited; the two cited failures were the only ones.

### 38. The 4–20 mA loop is taught as powered from the 24 VAC hot leg — wrong field practice, contradicted by the site's own quiz

**Location:** education/controller-wiring.html (prose, inputs diagram,
capstone loop, legend), the wiring sim's `loop` preset and engine
fault text — vs `field-wiring-sensors.js`, which correctly teaches DC
loop power. **Lens:** content (new surfaces). **Verification status:
verified** (`docs/audits/2026-06-extensive/findings.md` #46 — rated high there).

Real 2-wire transmitters are DC loop-powered (typically 12–30 VDC);
the engine header documents the AC-as-DC abstraction but the caveat
never reaches the lesson or sim UI, so a learner crossing the three
surfaces gets contradicted.

**Suggested direction:** owner picks (a) a two-sentence reality note
in the lesson's 4–20 mA paragraph and the sim preamble, or (b) model a
small 24 VDC supply in the sim and reroute the loop diagrams through
it. Domain call — held for decision.

**Resolved (2026-06-10):** owner picked (a). The lesson's 4–20 mA
paragraph now closes with the DC-loop-power reality note (12–30 VDC,
dedicated supply or loop-power terminal) and names the hot-leg framing
a deliberate one-power-story simplification; the sim preamble carries
the matching two-sentence caveat. Engine and diagrams unchanged.

**Real fix (2026-07-14):** the caveat-only resolution was reopened — a
note over a still-wrong diagram and sim isn't a fix. The loop is now DC
loop-powered everywhere. The controller model gains a `LOOP+` DC
loop-power terminal (wiring-engine.js); the 4–20 mA `+` sources from it,
not `24V~`; and mis-landing the `+` on the AC hot leg now faults with a
teaching message ("a 4-20mA loop needs DC loop power — land + on LOOP+,
not the 24 VAC hot leg"). The lesson prose and both diagrams (inputs,
capstone) redraw the loop from LOOP+ in a distinct teal "DC loop power"
wire family; the simulator surfaces the LOOP+ terminal (new "Loop Power"
group) and repaths the loop preset. New engine-direct tests cover the
loop path (OK from LOOP+, fault on the AC hot leg, fault unpowered, mode
mismatch). This brings the page in line with the site's own
`field-wiring-sensors` drill, which already teaches DC loop power.
PR: fix/4-20ma-dc-loop-power.

### 39. PID fast scene tells a physically wrong story — a "VAV damper" controlling duct static while the fan also tracks the same output

**Location:** simulators/pid-tuner.html — selector option "VAV damper
· duct static pressure"; `updateScene` drives both the damper blades
and the fan speed from the one AO. **Lens:** content (PID cluster).
**Verification status: verified** (`docs/audits/2026-06-extensive/findings.md` #50).

Field reality: duct static is controlled by the supply-fan VFD (or a
reverse-acting bypass damper); a VAV terminal damper controls zone
flow; no standard config drives two actuators from one AO. The page's
own Loop Speed table lists duct static and fan VFD as separate
examples.

**Suggested direction:** owner picks (a) relabel to "Supply fan VFD ·
duct static" and make the fan the actuator, or (b) keep the damper as
actuator and relabel to a direct-acting damper loop. Either way one AO
drives one actuator. Domain call — held for decision.

**Resolved (2026-06-10):** owner picked (a). Selector now reads
"Supply fan VFD · duct static pressure"; the fast scene drops the
damper entirely (duct + fan + Δp sensor), the command wire lands on
the fan, and `updateScene`'s fast branch drives fan speed only — one
AO, one actuator. The Loop Speed table row stands (it lists distinct
fast-loop examples, not one loop). Visual-contract test updated to
assert the fan's one-shot transform instead of a damper-blade angle.

### 40. The 24 VAC leg-swap consequence is told three incompatible ways across drill, lesson, and sim

**Location:** surviving-first-months.js ("Cross-wiring won't damage
equipment"), controller-wiring lesson (correctly scoped to shared
transformers), wiring-engine.js reversed-power fault + spark cue
(fires on an isolated controller where the act is electrically
symmetric). **Lens:** content. **Verification status: flagged**
(scoping/pedagogy, not a wrong number — `docs/audits/2026-06-extensive/findings.md` #49).

The sim's spark is a documented deliberate user ask, so the hard
contradiction is the quiz–sim pair; the fix is scoping copy, not sim
behavior.

**Suggested direction:** scope each claim ("on a single isolated
circuit…"); add the why to the sim's fault text. Pedagogy wording —
held for decision.

**Resolved (2026-06-10):** owner approved the scoping fix. The drill's
explain now scopes the no-damage claim to a single controller on its
own transformer and names the shared-transformer dead-short
consequence; the engine's reversed-power fault text gains the why
("alone … this can even run — the danger is sharing"). Sim behavior
(spark cue) unchanged, as documented. The lesson was already correct.

**Real fix (2026-07-14):** the copy scoping was correct, but the sim
still contradicted it — a *lone* reversed controller was marked an
unpowered fault with a spark, while the drill, lesson, and the fault's
own text all say it "can even run." Owner reversed the 2026-06-10
"keep the teaching spark" call. `wiring-engine.js` now powers a lone
reversed controller (it reads live), downgrades the `reversed` fault to
a **warn advisory**, and drops the spark. The genuine dead-short cases
are unchanged and still spark/blow the fuse: `short-xfmr` (hot tied to
com) and `xfmr-fight` (two transformers crossed) — and a reversed
controller that *shares* a common back to the true COM leg is caught by
that same short pass. The simulator's fault box now shows amber (not
red) for a warn-only advisory, so a running-but-crossed panel reads as a
heads-up rather than a failure. Reversed-polarity engine test rewritten
to the new contract + a shared-common-short test added.
PR: fix/reversed-power-lone-runs.

### 41. "Not 'around 40 °F' — at 40 °F" overshoots the site's own table

**Location:** refrigeration cluster prose; 118 psig interpolates to
39.8 °F in the site's own P-T data, and the sibling lesson correctly
hedges the same lookup. **Lens:** content. **Verification status:
flagged** (rhetoric vs precision trade-off — `docs/audits/2026-06-extensive/findings.md`,
Phases 2–4 minor polish).

**Suggested direction:** soften the rhetoric or use 118.4 psig so the
emphatic claim is exactly true. Editorial — held for decision.

**Resolved (2026-06-10):** owner picked 118.4 psig — the emphatic
sentence in refrigerant-cycle-basics now uses the exact dew value
from the site's own R-410A table ([40, 118.8, 118.4]), so "not
'around 40 °F' — at 40 °F" is literally true. The hedged "about
118 psig" worked-example references elsewhere in the cluster stand —
they were already correctly hedged.

### 42. TXV needle motion described in "turns"

**Location:** metering-devices-txv-eev lesson — "turns" belong to the
adjustment screw (which the lesson states correctly elsewhere); the
needle's motion is linear. **Lens:** content. **Verification status:
flagged** (phrasing — `docs/audits/2026-06-extensive/findings.md`, Phases 2–4 minor polish).

**Suggested direction:** linear language for the needle ("lifts/
modulates"), reserving "turns" for the adjustment screw. Editorial —
held for decision.

**Resolved (2026-06-10):** owner approved linear language. The TXV
walkthrough now reads "a sliver of lift out of the needle's total
travel" with a parenthetical reserving "turns" for the adjustment
screw; the screw paragraph's turn language stands (correct usage).

### 43. Triac output description is imprecise — "won't switch a separate voltage"

**Location:** education/controller-wiring.html (outputs section, triac
paragraph). **Lens:** content. **Verification status: verified**
(2026-07 accuracy-audit workflow, adversarially adjudicated).

The line "a triac isn't a dry contact: it won't switch a separate
voltage" is defensible for the common internally-sourced controller
triac output but not universally true — opto-isolated triac outputs can
switch a separately-supplied AC source. The always-true distinctions
from a dry contact are that a triac is **AC-only** (it latches on and
can't interrupt a DC load) and is **not a galvanically isolated
contact**. Sources: Schneider EBO / KMC controller triac-output docs
(opto-isolated, common terminal to a separate 24 VAC); triac
DC-latching physics (no AC zero-cross to commutate off).

**Resolved (2026-07-14):** rewrote the sentence to anchor on the
always-true properties — AC-only (can't interrupt DC) and not a
floating/isolated contact — keeping the copy vendor-neutral (no product
names, per the vendor-name guardrail). Shipped in
fix/4-20ma-dc-loop-power (same file).

### 44. Hydronic loop builder violates the affinity laws at reduced pump speed

**Location:** simulators/hydronic-loop-builder.html (the "How it works"
formula) + the pump-curve model in scripts/hydronic-engine.js
(`branchHsrc`). **Lens:** content (taught physics). **Verification
status: verified** (2026-07 accuracy-audit workflow, HIGH confidence —
adversarially adjudicated and independently re-derived).

The reduced-speed pump head scaled the *entire* quadratic by speed² —
`H = (H₀ − a·Q²)·(speed/100)²` — which incorrectly scales the a·Q²
curve-steepness term too. The affinity laws scale only the shutoff head:
`H = H₀·(speed/100)² − a·Q²`. On a k·Q² system curve the wrong form
settles at ~57 % of full flow at 50 % speed (and 33 % head) instead of
the affinity-correct 50 % flow / 25 % head — contradicting the site's
own affinity-laws.html (Q₂ = Q₁·N₂/N₁, H₂ = H₁·(N₂/N₁)²), which the page
cross-links. Sources: standard quadratic-pump-curve reduced-speed
coefficient scaling (the Q² coefficient is unchanged, only the constant
term scales with n²); Euler turbomachine H ∝ N².

**Resolved (2026-07-14):** corrected the formula in `branchHsrc`, the
engine header, and the page's "How it works" line to
`H = H₀·(speed/100)² − a·Q²`; added a hydronic-engine spec asserting
Q ∝ speed at reduced speed. PR: fix/hydronic-affinity-head. (This is a
content-accuracy fix from the 2026-07 workflow audit, distinct from the
open hydronic *code-quality* items codebase-issues #134/#135/#137.)

## Audit scope — sim/explainer ↔ tool physics diff (codebase-issues #154, 2026-07-14)

A focused pass diffing every interactive model against the dedicated tool
that computes the same physics — scoped after the 2026-07 workflow found
both its real defects (hydronic affinity #44, 4-20 mA loop power #38)
living in interactive math that had drifted from a companion calculator.
Eight physics clusters were diffed and each shared relation re-derived and
run in node at real operating points. Most surfaces were consistent —
affinity/VFD, hydronic valve/load, signal scaling, staging, psychrometrics,
duct/airflow, refrigerant P-T definitions, electrical — with node-verified
agreement (details in codebase-issues #154). Four content-accuracy items
surfaced and were fixed (#45-#48); two cross-widget cosmetics were logged
to codebase-issues rather than fixed inline.

### 45. pid-basics "P only" sim caption promises ringing the widget can't produce

**Location:** education/pid-basics.html (Sim 1 caption) vs. the reachable
behavior of scripts/pid-engine.js on the fast/med/slow presets. **Lens:**
content (taught behavior). **Verification status: verified** (engine run in
node at Kc 2-20).

The Sim 1 caption read "Raise the gain and the offset shrinks but the loop
starts to ring." The three loops the mini-sim exposes are all low dead-time
(dead÷τ ≈ 0.13), so pure proportional control produces 0 % overshoot and
zero setpoint crossings at every gain up to the slider max (Kc = 20) — the
offset just shrinks monotonically. Ringing under P alone needs the
dead-time-dominant loop (vhigh, dead÷τ = 0.5), which lives only on the full
tuner. A reader dragging the gain slider as instructed never sees the ring
the caption promises. Same root cause as #34 (the tuner cheat-sheet
described unreachable failure modes) — the #34 fix added the vhigh preset to
the tuner but never propagated to this Education mini-sim.

**Resolved (2026-07-14):** reworded the caption to describe what these loops
actually do — the offset tightens but never closes (P needs error to make
output) and the loops stay well-damped — with a forward-reference to the
full PID tuner for the dead-time loop that does ring. Added a pid-engine
spec (`pure P cannot ring on the Sim 1 loops but rings on the dead-time
loop`) pinning 0 overshoot on fast/med/slow at Kc ≤ 20 and > 5 % on vhigh.
PR: issue-154/sim-tool-physics-audit.

### 46. superheat-subcooling worked example claims the P-T tool "reads the same 10 °F back" — it interpolates to 10.2 / 9.6

**Location:** education/superheat-subcooling.html (worked example) vs.
tools/refrigerant-pt.html + scripts/refrigerant-data.js. **Lens:** content
(claim about tool output). **Verification status: verified** (the page's
tempAtP interpolation replicated in node).

The lesson uses whole-degree chart values (R-410A dew ≈ 40 °F @118 psig,
bubble ≈ 105 °F @340 psig → 10 °F superheat and subcooling), then tells the
reader they'll "read the same 10 °F back" from the P-T tool. But the tool
interpolates linearly between chart rows: dew@118 = 39.8 °F → superheat 10.2,
bubble@340 = 104.6 °F → subcooling 9.6. The subcooling side is off by 0.4 °F
from the claimed 10. The site's own metric-rounding policy insists on stating
"the result a … user actually sees," so a checkable claim about tool output
has to match.

**Resolved (2026-07-14):** softened to "you'll read about 10 °F back either
way — the tool interpolates between chart rows, so it lands a couple tenths
off these whole-degree chart values." Added a data-integrity spec pinning the
interpolated 10.2 / 9.6 so the "about" phrasing stays honest if the table is
refined. (metering-devices-txv-eev.html uses the same 10 °F as a narrative
anchor for the TXV-holds-superheat physics but makes no claim about tool
output, so it was left unchanged.) PR: issue-154/sim-tool-physics-audit.

### 47. R-454B's ~2 °F glide is labeled "negligible" by the P-T tool, contradicting the lesson that teaches it as a glide blend

**Location:** tools/refrigerant-pt.html (P-T status pill) vs.
education/superheat-subcooling.html (blend glide). **Lens:** content
(tool/lesson consistency). **Verification status: verified** (glide computed
across the table in node).

The P-T pill had two tiers: glide ≥ 5 °F → "glide blend — superheat
references the dew point, subcooling the bubble point"; else → "negligible
glide; bubble and dew are effectively one saturation temperature." R-454B's
computed glide is ~1.8-2.3 °F, so it fell in the "negligible / effectively
one temperature" bucket — the opposite of superheat-subcooling.html, which
groups R-454B as a zeotropic blend where the dew/bubble distinction matters,
and of the tool's own computation (it references dew for superheat and bubble
for subcooling on R-454B regardless of the pill wording). The data file's own
comment ("≤ 1 °F glide behaves effectively pure") also puts a 2 °F blend
outside the negligible bucket.

**Resolved (2026-07-14):** added a middle "small glide" tier (1.5 ≤ glide < 5)
that names the glide and keeps the dew/bubble guidance, so R-454B (and any
~2 °F blend) is described consistently with the lesson. The 1.5 °F edge sits
cleanly between R-404A (≤ 1.1 °F computed) and R-454B (≥ 1.8 °F). Added a
data-integrity spec pinning each refrigerant into its tier. PR:
issue-154/sim-tool-physics-audit.

### 48. VAV coil-airflow widget's CFM/ton verdict disagrees with the equipment-airflow tool it links to

**Location:** education/vav-systems.html (coil-airflow widget) vs.
tools/equipment-airflow.html (owner-blessed 350/400/500 bands). **Lens:**
content (cross-surface + internal consistency). **Verification status:
verified** (widget math traced; presets recomputed).

The widget banded coil airflow as ≥ 350 → OK, 300-350 → thin, else →
starving. The equipment-airflow tool (the source of truth, owner-blessed
edges dated 2026-07-11) reserves OK for the 400-500 window and calls 350-400
"thin." So a coil at ~389 CFM/ton read "OK" in the widget and "thin — warn"
in the tool — and the same VAV page's own prose calls the floor "near 400
CFM of air per ton" and links to the tool. The physics (CFM/ton = total ÷
(stages × tons)) is identical on both; only the verdict edges drifted.

**Resolved (2026-07-14):** shifted the widget's edges to match the tool
(≥ 400 → OK, 350-400 → thin, < 350 → icing), with a comment tying it to
equipment-airflow.html as the source of truth. The design preset lands at
exactly 400 CFM/ton (still OK); sliding the driving zone down reads "thin,"
matching the tool. Added a behavioral spec pinning the verdict at 400 and 389
CFM/ton. PR: issue-154/sim-tool-physics-audit.

## Fresh accuracy audit — post-forced-air (2026-07-14)

A full-site adversarial accuracy re-verification run after the forced-air
pillar shipped — three specialist auditors (HVAC/psychrometrics/refrigeration
physics; BACnet/Modbus protocol data; electrical/controls/hydronics), each
trying to *falsify* the site's claims against an authoritative source
(ASHRAE Fundamentals + manufacturer datasheets, ASHRAE 135 / BACpypes3 /
BACnet4J, the NEC + the Modbus spec), and Node-verifying physics claims
against the site's own engines. Already-resolved findings #1–#48 were
skipped; the metric-rounding, IP-native-formula, vendor-name, and "plain
English" conventions were honored as non-errors. **Headline: the site
verified overwhelmingly clean — 0 high, 2 medium, 6 low.** All eight below are
now dispositioned: **seven fixed** (five 2026-07-14 in PR #345; L4 and L5 in
the follow-up PR) and **one accepted as-is** (L2, a known/disclosed limitation).
Full evidence, sources, and suggested fixes live in the triage doc:
`docs/audits/2026-07-fresh-accuracy/triage.md`.

### 49. R-32 mislabeled as a zeotropic glide blend in the superheat lesson

**Location:** education/superheat-subcooling.html (~line 154, the glide
footnote). **Lens:** content (refrigeration physics). **Verification status:
verified** (datasheet + ASHRAE 34; the site's own data file treats R-32 as
pure).

The footnote names "R-407C, R-454B, R-32 to some extent" as zeotropic blends
whose saturation curve splits into a bubble curve and a dew curve separated by
glide. R-32 (difluoromethane) is a **pure single-component** refrigerant with
**zero glide** — bubble and dew coincide at every pressure (Arkema Forane 32:
"zero glide"; ASHRAE 34 classifies it single-component A2L). It is a
*constituent* of R-410A (the likely confusion), but stands alone as a pure
refrigerant. The "to some extent" hedge doesn't rescue it. This is the lone
outlier: `html/_data/refrigerant-data.js` and the refrigerant-cycle-basics
quiz already treat R-32 as pure. **Suggested direction:** drop R-32 from the
zeotropic list (R-407C and R-454B belong — R-454B's ~2 °F glide is real per
#47). Severity medium; confidence high. Triage: M1.
**Resolved:** dropped R-32 from the zeotropic-blend footnote, keeping R-407C
and R-454B (R-454B's ~2 °F glide is real). PR: content/fresh-audit-cleancut-fixes.
*(resolved 2026-07-14)*

### 50. voltage-drop.html cites a false resistance-table source and temperature

**Location:** tools/voltage-drop.html (line 158 rendered note, line 199 JS
comment, line 200 `OHMS_PER_KFT`). **Lens:** content (electrical citation).
**Verification status: verified** (NEC 2023 Ch. 9 Table 8).

The reference note and JS comment both read "Solid copper at 25 °C, per NEC
Chapter 9 Table 8." The Ω/kft values (14→2.525, 16→4.016, 18→6.385,
20→10.15, 22→16.14) are the standard ~20 °C AWG copper resistances and are
fine — but the **citation is wrong twice**: NEC Ch. 9 Table 8 tabulates DC
resistance at **75 °C** (14 AWG ≈ 3.14 Ω/kft there, not 2.525), so both the
"Table 8" attribution and the "25 °C" label are incorrect. **Suggested
direction:** relabel "solid copper at 20 °C (standard AWG values)" and drop
the NEC Table 8 attribution, fixing both the rendered note and the JS comment;
the constant itself stays. Severity medium; confidence high. Triage: M2.
**Resolved:** relabeled both the rendered note and the JS comment "solid copper
at 20 °C (standard AWG values)" and dropped the false NEC Ch. 9 Table 8
attribution; the Ω/kft constant is unchanged. PR: content/fresh-audit-cleancut-fixes.
*(resolved 2026-07-14)*

### 51. airside-load.html Denver altitude figure understates the load over-read

**Location:** tools/airside-load.html (line 240, the "where 1.08 / 0.68 / 4.5
come from" note). **Lens:** content (physics figure). **Verification status:
verified** (Node against the engine's own `pressFromAltitude`).

The note says the constants over-read the load "roughly 3 % per thousand feet
of elevation — call it 14 % in Denver." Node-verified at 5,280 ft against the
site's `pressFromAltitude`: density deficit ≈ 17.7 %, load over-read ≈ 21.5 %;
even the page's own 3 %/1,000 ft rule gives ~16 %, not 14 %. The city figure
undershoots by every measure, including the page's own heuristic. **Suggested
direction:** state ~20 % (over-read) or ~18 % (density deficit), or drop the
specific city figure and keep only the per-1,000-ft rule (which is fine).
Severity low; confidence high. Triage: L1.
**Resolved:** changed the Denver figure from "14 %" to "about 20 %" (the load
over-read verified against `pressFromAltitude` at 5,280 ft); kept the 3 %/1,000 ft
rule. PR: content/fresh-audit-cleancut-fixes.
*(resolved 2026-07-14)*

### 52. bacnetUnits.js reactive-energy names use bacnet-stack word order

**Location:** html/_data/bacnetUnits.js (lines 225–227 ids 203/204/205;
264–266 ids 242/243/244); surfaced on tools/bacnet-units.html. **Lens:**
content (BACnet naming). **Verification status: verified** (BACpypes3 /
ASHRAE 135 spelling).

The reactive-energy units read e.g. `watt-reactive-hours` (203),
`volt-ampere-reactive-hours` (242). All integer ids are correct; only the
string order differs from ASHRAE 135 / BACpypes3, which spell hours-then-
reactive: `watt-hours-reactive` (203), `volt-ampere-hours-reactive` (242),
plus kilo/mega siblings. Cosmetic — and the file header already discloses that
long-tail names follow bacnet-stack and "should be verified against ASHRAE
135," so this is a known, disclosed limitation logged for completeness.
**Suggested direction:** optionally rename the six strings to ASHRAE word
order. Severity low; confidence high. Triage: L2.
**Disposition:** owner-accepted as-is (2026-07-14) — the integer ids are all
correct; the display strings follow bacnet-stack's spelling, which the
`bacnetUnits.js` header already discloses and flags for ASHRAE verification. A
genuine 50/50, not worth churning the display strings; revisit only if a
canonical-ASHRAE naming pass is done.
*(accepted — known limitation, 2026-07-14)*

### 53. modbus-functions.html exception-code table omits code 07 (NAK)

**Location:** tools/modbus-functions.html (Exception-codes tab, lines
148–159). **Lens:** content (Modbus completeness). **Verification status:
verified** (Modbus Application Protocol spec).

The exception-code table lists codes 1, 2, 3, 4, 5, 6, 8, 10, 11 and skips
**07 = Negative Acknowledge (NAK)** — returned by the program commands (FC
08/13/14) when the server can't perform the request. Everything shown is
correct; it's a completeness gap. (FC 07 = Read Exception Status in the
*function*-code tab is unrelated — the gap is the *exception* code 07.)
**Suggested direction:** add the `07 · 0x07 Negative Acknowledge` row; leave
modbus-register-viewer.html's deliberately FC-only subset alone. Severity low;
confidence high. Triage: L3.
**Resolved:** added the `7 · 0x07 · Negative Acknowledge (NAK)` row in numeric
order (between 06 and 08); left the register-viewer's FC-only subset alone.
PR: content/fresh-audit-cleancut-fixes.
*(resolved 2026-07-14)*

### 54. bacnet-basics.html MS/TP framing diagram collapses two CRCs into one

**Location:** education/bacnet-basics.html (MS/TP-vs-BACnet/IP framing SVG,
~lines 570–640, and its `<desc>` alt-text ~line 573). **Lens:** content
(BACnet framing). **Verification status: verified** (ASHRAE 135 Clause 9).

The MS/TP frame is drawn and described as Preamble → Frame Type → Destination
→ Source → Length → payload → a single **2-byte CRC**. A real ASHRAE 135 MS/TP
frame carries **two** CRCs: a 1-byte header CRC (after Length, before payload)
and a 2-byte data CRC (after payload). Showing only the data CRC leaves the
header looking unprotected — a pedagogical simplification. **Suggested
direction:** show both CRC fields, or add a one-line "CRC shown simplified —
a real frame also has a 1-byte header CRC" caveat in the caption and `<desc>`.
Severity low; confidence medium-high. Triage: L4.
**Resolved:** drew both CRC fields — the single "CRC" box became two, a 1-byte
`Hdr CRC` right after Length and a 2-byte `Data CRC` at the end of the wrapper
row (the shared payload rides between them), with the wrapper bracket extended
to cover both and the `<desc>` rewritten to enumerate the header and data CRCs
and their positions. PR: content/fresh-audit-l4-l5-l2.
*(resolved 2026-07-14)*

### 55. bacnet-services.html buckets AtomicRead/WriteFile under "Data Sharing"

**Location:** education/bacnet-services.html (service-families table, ~line
114). **Lens:** content (BACnet service taxonomy). **Verification status:
verified** (ASHRAE 135 service categories).

`AtomicReadFile / AtomicWriteFile` sit in the "Data Sharing" interoperability-
area column. In ASHRAE 135 these are **File Access Services** (they underpin
the Device-Management backup/restore BIBB family, DM-BR), not Data Sharing.
Editorial: the page states its table is "the field-relevant set, not the full
three dozen," so it's a curated-subset labeling call — but the bucket as shown
is wrong. **Suggested direction:** relabel that row's area "File Access" (or
"Device Mgmt"). Severity low; confidence medium. Triage: L5.
**Resolved:** relabeled the `AtomicReadFile / …WriteFile` row's Area column from
"Data Sharing" to "File Access", matching the ASHRAE 135 service category.
PR: content/fresh-audit-l4-l5-l2.
*(resolved 2026-07-14)*

### 56. CDAB byte-order nickname inconsistent across tool, lesson, and quiz

**Location:** tools/modbus-register-viewer.html (~line 181) +
education/modbus-decoding.html (~line 292) call CDAB the "Modicon byte-swap";
quiz html/_data/quizzes/modbus-decoding.js (~line 75) calls it "word-swap."
**Lens:** content (site-wide consistency). **Verification status: verified**
(the encoding's own definition).

CDAB swaps the two 16-bit **words** (byte order preserved within each word),
so "word-swap" is the precise term and "byte-swap" is the looser traditional
Modicon label — the two surfaces disagree. The ABCD/CDAB letter notation
itself is unambiguous and correct everywhere; only the parenthetical nickname
drifts. **Suggested direction:** standardize on "word-swap" across all three
surfaces. Severity very low; confidence high. Triage: L6.
**Resolved:** changed "Modicon byte-swap" → "Modicon word-swap" on the tool and
on the lesson (both the heading and the diagram `<desc>` alt-text); the quiz
already read "word-swap." PR: content/fresh-audit-cleancut-fixes.
*(resolved 2026-07-14)*

## Accuracy audit — the eleven post-2026-07-14 lessons (2026-08-07)

An accuracy pass over everything that landed **after** the 2026-07-14
audit above: eleven lessons under `html/education/` (all first committed
2026-07-15 or 2026-07-18, 4,631 lines) plus their ten paired quiz banks
in `html/_data/quizzes/` — exactly 100 questions. The scope basis is
*"landed after the last audit,"* **not** *"never mentioned in an audit
doc"*: a name-mention test returns sixteen lessons, because a clean page
produces no finding and absence of mention proves nothing.

The pass was weighted at the quiz banks, because
`tests/quiz-banks.spec.js` is **shape-only** — it checks the export
shape, kebab-case unique ids, exactly one `correct: true`, and finite
numeric answers, and **nothing anywhere asserts that a marked-correct
answer is factually right or that a numeric answer matches its lesson's
arithmetic**. There are also zero `// user to verify` / `TODO` markers
under `html/`, so nothing was inherited and everything was verified from
first principles: thermistor and RTD figures against
`html/scripts/thermistor-data.js` in Node, timer and latch semantics
against `html/scripts/fbe-engine.js`, and the full 517-pair
`data-us`/`data-metric` population re-classified. Every finding **and
its proposed fix** went through an adversarial refutation stage:
**15 raised, 7 killed, 8 survive** — four of the seven kills would have
made the site worse if acted on.

**Headline: 0 high · 1 medium · 7 low.** Every engineering figure that
could be reproduced was reproduced. The eight survivors are of two kinds
only — metric figures that don't close against operands the same passage
paints (#57, #58, #59: one defect class, three sites), and prose that
describes its own diagram or example slightly wrong (#60–#64). That
second family is the structural result: on these pages the engineering
is sound, and what drifts is **the sentence about the picture** — a
block count, a wire colour, a snippet's addition, a claim about what a
diagram marks. No spec checks those and no build guard reaches them.

**Closed 2026-08-07: 7 fixed, 1 accepted as written** (#64 — see its
disposition). The cycle also shipped a **deliverable**, on the owner's
ruling *"a cheap test that may catch it still decreases what we can miss
ourselves"*: a two-arm metric-conversion guard. Arm 1
(`tests/metric-spans.spec.js`) **blocks** — every °F → °C figure in the
source, in both notations, must be a valid absolute or a valid delta.
Arm 2 (`npm run metric-lint`) is **report-only** and asks whether a
stated delta agrees with the operands its own passage paints. **Arm 1
would not have caught #57** — `1.1 °C` for `2 °F` is a *valid* delta —
so the two are not redundant and neither is sufficient. Design, measured
tolerance, and the honest limits: the *Deliverable* section of the
triage doc.

Full evidence record, the seven refuted findings with their reasoning,
the metric-sweep coverage note, and the guard as built:
`docs/audits/2026-08-accuracy/triage.md`.

### 57. comparators-and-deadband.html deadband swing contradicts its own painted operands

**Location:** education/comparators-and-deadband.html line 419 (the "One
number to be careful with" paragraph). Also logged as codebase-issues
**#232**. **Lens:** engineer (metric worked-example rounding).
**Verification status: confirmed** (arithmetic on the page's own spans).

The paragraph reads "the DB constant here is *half* the band — it's
applied once up and once down, so the space actually swings
`2 °F` / `1.1 °C` from set to reset." `1.1` is the round of the
canonical delta (2 × 5/9 = 1.111), but the same paragraph run paints
every operand a metric reader would use and all of them give **1.2**:
the two band edges `75 °F → 23.9 °C` (line 404) and `73 °F → 22.7 °C`
(line 407) differ by 1.2, and the half-band constant `1 °F → 0.6 °C`
(line 412) doubles to 1.2. So the one paragraph whose entire thesis is
*"the constant is HALF the band"* fails to demonstrate that
relationship in metric — a teaching failure on its own point, not a
rounding nit. **An alternative fix was considered and refuted:**
repainting `73 °F` as the canonical `22.8 °C` would also close the
swing at 1.1, but the passage builds that edge with an explicit
`SUBTRACT` block (SP − DB) and 23.3 − 0.6 = 22.7 — canonicalising the
edge breaks the arithmetic the sheet performs. Severity medium;
confidence high. Triage: M1.
**Resolved:** `data-metric` on line 419 changed `1.1 °C` → `1.2 °C`.
Note the correct resolution of #232 is **two spans, not one** — see #58,
which #232 does not name. PR: docs/audit-2026-08-accuracy.
*(resolved 2026-08-07)*

### 58. comparators-and-deadband.html typical-band range keeps the superseded conversion

**Location:** education/comparators-and-deadband.html line 443 ("How
wide should the band be?"). **Lens:** engineer (on-page consistency).
**Verification status: confirmed.**

"A room thermostat usually lands around `1–2 °F` / `0.6–1.1 °C` of total
band." In isolation `0.6–1.1` is a defensible canonical conversion — no
operands are painted in that sentence. But with #57 fixed the page
states two paragraphs above that a 2 °F band swings **1.2 °C**, so
leaving 1.1 here puts two different metric values for the same 2 °F
quantity on one page *and* drops the page's own worked example outside
the typical range it then recommends. Fixing #57 alone leaves the page
self-contradictory. **Suggested direction:** `0.6–1.2 °C` (or re-cast
the sentence so it doesn't restate the quantity). Severity low;
confidence high on the inconsistency, medium on 1.2 being the preferred
value. Triage: L1.
**Resolved:** changed to `0.6–1.2 °C`. PR: docs/audit-2026-08-accuracy.
*(resolved 2026-08-07)*

### 59. comparators-and-deadband quiz bank carries the same metric defect in two questions

**Location:** html/_data/quizzes/comparators-and-deadband.js —
`cdb-band-edge-set-point` (prompt line 84, explain line 88) and
`cdb-band-too-wide` (prompt line 123). **Lens:** engineer (metric
rounding). **Verification status: confirmed.**

Both questions paint their metric operands in the same breath and
neither total closes. `cdb-band-edge-set-point` states "a 2 °F (1.1 °C)
band" while its own explain paints 22.2 + 0.6 = 22.8 and
22.2 − 0.6 = 21.6 — a difference of **1.2**, and 0.6 doubled is **1.2**.
`cdb-band-too-wide` states "6 °F (3.3 °C) total" while its explain
paints "22.2 ± 1.7 °C displayed-operand: 23.9 and 20.5" — a difference
of **3.4**. The second is the sharper case: it invokes the
displayed-operand rule *by name* and then states a total the rule
contradicts. Found only by reading all 100 questions —
`tests/quiz-banks.spec.js` is shape-only and cannot see this. Severity
low; confidence high. Triage: L2.
**Resolved:** `1.1 °C` → `1.2 °C` (prompt + explain), `3.3 °C` →
`3.4 °C`, and the same bank's "1–2 °F (0.6–1.1 °C)" → `0.6–1.2 °C` for
consistency with #58. PR: docs/audit-2026-08-accuracy.
*(resolved 2026-08-07)*

### 60. timers-and-delays.html calls its own eight-block sheet "seven blocks"

**Location:** education/timers-and-delays.html line 500 (the "Race the
window yourself" capstone). **Lens:** engineer (prose-vs-artifact
drift). **Verification status: confirmed.**

"The proof-of-flow sheet is the whole lesson in **seven blocks**." The
Function-Block Editor's `proof` example carries **eight** — `cmd`,
`sts`, `rst`, `inv`, `fail`, `tmr`, `latch`, `alarm`
(simulators/function-block-editor.html:338-346). The lesson's own
diagram draws all eight and its own `<desc>` at line 260 opens "A
function-block sheet with **eight blocks**," so the page contradicts
itself; and the capstone instructs the reader to load the example, where
they will count eight. Severity low; confidence high. Triage: L3.
**Resolved:** "seven blocks" → "eight blocks".
PR: docs/audit-2026-08-accuracy. *(resolved 2026-08-07)*

### 61. setpoint-math-reset quiz gotcha snippet's ADD output doesn't equal its own operands

**Location:** html/_data/quizzes/setpoint-math-reset.js,
`smr-flipped-slope` — the `snippet` (line 131) and `explain` (line 138).
**Lens:** engineer (arithmetic). **Verification status: confirmed.**

The wire-value snippet reads `MUL out (m × OAT): 56.7`, `intercept
constant: 180`, `ADD out: 237`. But 85 × 0.667 = 56.695 → the displayed
56.7, and 56.7 + 180 = **236.7**; the unrounded 236.695 also rounds to
236.7 at the snippet's own one-decimal precision. No slope value yields
237 from a MUL output displayed as 56.7. The gotcha's whole exercise is
walking a chain of wire values to spot the bug, so a chain whose own
addition is off by 0.3 undercuts it. The *answer* is unaffected — the
LIMIT clamps to 180 either way — which is why this is low rather than
medium. Severity low; confidence high. Triage: L4.
**Resolved:** `ADD out: 237` → `236.7`, and the explain's "≈ 237" /
"reads 237" → "= 236.7" / "reads 236.7".
PR: docs/audit-2026-08-accuracy. *(resolved 2026-08-07)*

### 62. dedicated-outdoor-air.html capstone claims to mark five control points; it marks one

**Location:** education/dedicated-outdoor-air.html lines 313-317 (the
claim) and the `doas-d3` SVG at lines 320-408. **Lens:** engineer +
newcomer (prose-vs-diagram drift). **Verification status: confirmed.**

The paragraph lists five BMS points — leaving-air temperature, leaving
RH/dew point, cooling-coil valve or compressor stage, reheat valve or
stage, and energy-recovery wheel command and status — then says "**The
capstone below marks each of them on the airflow path.**" The capstone
draws the four *stations* in air-path order and carries exactly one
marked control point: the leaving-air RH/dew-point sensor with its
"leaving dew point setpoint" callout (`doas-d3-dpt`, lines 384-390). The
SVG's own `<desc>` confirms the scope, describing one control point and
calling it "the unit's primary control point." The list of five is
correct and useful; only the sentence pointing at the picture
over-promises, sending a reader hunting for four callouts that aren't
there. **Suggested direction — two forms, owner's pick:** (a) soften the
prose to what the drawing does ("puts the stations they attach to in
air-path order, with the leaving dew point — the unit's primary control
point — marked"); or (b) add point callouts for the other four and keep
the sentence. (b) is the better page but is a design change with a real
drawing budget. Severity low; confidence high on the finding, the remedy
is an editorial/design choice. Triage: L5.
**Resolved — the DIAGRAM was reworked, not the prose** (owner ruling
2026-08-07: *"that diagram could use a rework anyway, so let's go that
direction"*). The sentence is now true as written, and the pass went
further than four bolted-on markers:

- **The wheel now straddles two airways.** The old capstone drew one
  casing with the wheel sitting entirely in the supply stream, and a
  return duct that came along the top and **stopped in mid-air** above
  it — the exhaust stream never crossed the wheel at all, which is the
  one thing a recovery wheel does. The cabinet is now a tall recovery
  section carrying both streams, split by a horizontal line with the
  wheel across it; return goes in one face and exhaust comes out the
  other, with the colour change hidden behind the wheel so the wheel is
  visibly what converts one into the other.
- **All five points are marked**, each tied to its station by a dashed
  leader and labelled with its point type: wheel command (AO/BO) and
  rotation status (BI); cooling valve or stage (AO/BO); reheat valve or
  stage (AO/BO); leaving-air temperature (AI) and leaving RH / dew point
  (AI), the latter still called out as the primary control point.
- **Ink follows the house rule** from the owner's own production
  graphics — accent is what the program writes, plain bright is what a
  sensor measured — so the leaving-air sensors moved from accent to
  bright and the accent on the drawing now means "a command reaches in
  here." An in-SVG key states that pair, so the diagram is
  self-contained.
- The two leaving-air sensors sit on **taps off the duct** rather than
  on its centreline: the flow-engine particle layer paints as the SVG's
  last child, so a sensor on the duct had its glyph occluded every time
  a particle passed. Found by looking at the render, not the source.
- The `<desc>` was rewritten to carry the two-airway topology and all
  five points, and a `p.ref-note` under the diagram states the scope —
  five points because those five answer whether the unit is doing its
  job; a real DOAS carries more (fan start/stop and status, filter DP,
  safeties) and none of them answers that question.
- **The exhaust fan is drawn and deliberately NOT marked** (owner
  ruling 2026-08-07, follow-on the same day). The redraw above had left
  it out, and an ERV-equipped DOAS has one on the return path — without
  it nothing pulls air across the wheel's exhaust face, so the machine
  read wrong to a tech who knows what a wheel needs. Asked whether the
  diagram should carry one, the owner ruled: **"draw the exhaust fan, do
  not mark it."** `doas-d3-ef` is therefore plain geometry — no callout,
  no leader, no point, no type label — in the supply fan's neutral ink,
  on the exhaust duct downstream of the wheel with its blade pointing
  toward the exhaust arrow. He explicitly accepted that one drawn
  component would carry no leader while four others do. **The five-point
  story is the diagram's point and a sixth station would dilute it — a
  later reader should not "fix" this by adding one.** Accent was
  off-limits for the same reason: nothing on this drawing writes or
  reads the fan, and accent here means "a command reaches in here." The
  `p.ref-note` now reads "supply and exhaust fan start/stop and status"
  and adds that both fans are drawn and neither is marked, so the
  decision is legible on the page itself.
- **The fan sits OUTSIDE the casing, and that is ruled, not incidental**
  (owner 2026-08-08). The geometry made it convenient — the wheel fills
  the recovery section, so no fan glyph clears both the cabinet wall and
  the wheel edge on the exhaust centreline — but the placement was put to
  the owner as a possible defect, because a packaged ERV DOAS normally
  carries its exhaust fan inside the unit and the drawing therefore shows
  the two fans asymmetrically. He ruled **leave it outside**, on field
  grounds: *"I've seen plenty of DOAS systems in the field where the
  exhaust fan is separate."* **That is the reason of record** — a future
  re-layout that frees room inside the casing is not a reason to move it.
- **The accent on "the dew point is the primary control point" is
  repainted `--text-bright`** (owner 2026-08-08). The key the redraw
  added makes accent mean exactly one thing — *the program writes it* —
  and the dew point is an `AI` the program reads, so the same quantity
  was rendering in two inks three lines apart inside one callout. The
  cause was residue: pre-redraw the text read "leaving dew point
  **setpoint**", and a setpoint genuinely is written. Offered a repaint
  or a reword that would make the green correct, the owner chose the
  repaint — the option that leaves accent unambiguous rather than the one
  that rescues the colour. A source comment records it so the next reader
  does not undo it.

PR: docs/audit-2026-08-accuracy. *(resolved 2026-08-07; exhaust-fan
follow-on 2026-08-07; placement + ink rulings 2026-08-08)*

### 63. comparators-and-deadband.html capstone says the heating example differs only in two wires

**Location:** education/comparators-and-deadband.html line 496 ("Walk
the band yourself"). **Lens:** newcomer (an instruction that falsifies
itself). **Verification status: confirmed.**

"Then load the *heating thermostat* and hunt for what changed — **the
blocks are identical**; only the two wires into S and R have traded
places." Structurally right: both examples carry the same nine block
types in the same layout, and the only *logic* difference is the S/R
swap. But a reader told to hunt for what changed will also find the
setpoint constant (74 → 70), the space AI value (72 → 68), and **seven
of the nine block names** (`Cool SP` → `Heat SP`, `Cool Make` → `Heat
Break`, `Cool Set` → `Heat Reset`, and so on — only `Space` and
`Deadband` are byte-identical in both). Unlike the workbench pages —
where `ddcw-shell.js` derives names from the point roster — the FBE
example names are authored literals and are visibly different on screen.
The hunt returns four kinds of answer and the sentence admits one. The
page's *other* statement of the same idea, at line 433 ("the same nine
blocks are a heating thermostat"), is already correct. Severity low;
confidence high. Triage: L6.
**Resolved:** scoped the claim to the logic — "hunt for what changed in
the *logic* — same nine blocks, same layout, and only the two wires into
S and R have traded places. (Its constants and block names read for
heating; the shape underneath is identical.)"
PR: docs/audit-2026-08-accuracy. *(resolved 2026-08-07)*

### 64. reading-a-wiresheet.html says "every wire on it is grey" of a branch with a green wire

**Location:** education/reading-a-wiresheet.html lines 492-493 (prose)
and line 257 (the `raw-d1-desc` alt text). **Lens:** engineer +
accessibility. **Verification status: confirmed** (SVG source).

"the freeze-trip lamp branch at the bottom … it's the sheet's best trap,
because **every wire on it is grey**" — and the `<desc>` says the same
("with every wire grey"). The branch as drawn has two wires and one is
green: `FRZ OK` reads TRUE, so the tap feeding the NOT is its own
`<path d="M180 576 H390">` painted `var(--accent)` (line 284), with the
NOT's input pin filled to match (line 407); only the NOT → lamp output
wire is `var(--text-dim)`. The pedagogical point survives — a beginner
scanning for grey still lands on the grey output wire — but the sentence
over-claims, and the `<desc>` version is the worse of the two because it
is a blind reader's only access to the picture. **Suggested direction:**
narrow to the output ("because the wire out of it is grey"; in the
`<desc>`, "its output wire grey"). **Not acted on:** "the branch" can be
read as the NOT and everything downstream, in which case the sentence is
loose rather than wrong — a genuine 50/50 on a live page. Severity low;
confidence high that a green wire is in the branch as drawn, medium that
the sentence is wrong rather than loose. Triage: L7.
**Disposition:** owner-accepted as written (2026-08-07) — *"I think it
reads well as is."* The finding's own medium-confidence caveat is the
reason it resolves this way, and re-reading the SVG settles it: the green
`M180 576 H390` runs from the freeze stat's tap junction to the NOT's
**input** pin, so it is the wire *into* the branch, not a wire *on* it.
Everything downstream of the NOT — the one wire the branch actually owns
— is `var(--text-dim)`. Under the reading that scopes "the branch" to
the wires within it, the sentence is correct rather than merely loose,
and narrowing it to "the wire out of it" would trade the trap it teaches
(a healthy branch that scans dead) for a more literal but weaker line.
No page change. The `raw-d1-desc` alt text keeps its wording for the
same reason: it describes the same branch under the same scoping, so
changing one and not the other would be the real inconsistency.
*(accepted — reads correctly as written, 2026-08-07)*

### 88. bacnet-networking lesson attributes the sequential-port convention to Annex J more firmly than the standard supports *(flagged 2026-08-20, quiz-growth wave-1 refutation round)*

**Location:** `html/education/bacnet-networking.html` (the Annex J
paragraph in *Reading the hex blob*, ~L521: "ASHRAE 135 Annex J's
sequential-port convention"), echoed verbatim by the new
`second-network-next-port` quiz question (PR #588), which sources it
faithfully. **Lens:** working engineer. **Issue:** Annex J designates
X'BAC0' (47808) as the default port and *permits* other ports for
additional BACnet/IP networks; the specifically sequential
0xBAC1/0xBAC2 practice is field convention reinforced by the IANA
47808–47823 registration block, not a normative Annex J rule. Nothing
taught is *wrong* — the ports are real, the practice is universal —
the attribution is just one notch firmer than the text of the annex.
**Verification:** flagged (checked against the annex's structure by
the refutation round's technical lane; the owner may want to confirm
against his copy). **Suggested direction:** soften in BOTH places in
one pass — e.g. "Annex J's default 0xBAC0, then 0xBAC1, 0xBAC2 by
convention" — the quiz was deliberately NOT fixed alone, since it must
stay in sync with the lesson it sources.

### 89. MS/TP lesson + one bank explain overstate the steady-state cost of Max_Master = 127 *(flagged 2026-08-21, quiz-growth wave-1 refutation round — mstp lane)*

**Location:** `html/education/bacnet-mstp.html:105` ("the token holder
dutifully Poll-For-Masters its way through a hundred-odd empty
addresses, over and over, forever … spending a chunk of every rotation
talking to nobody") and the `max-info-frames-allowance` explain in
`html/_data/quizzes/bacnet-mstp.js` ("every rotation wastes time
polling a hundred-odd empty addresses" — cite by question id; its line
number moves when PR #592's growth lands). **Lens:** standards
accuracy. **Issue:** Clause 9's maintenance Poll-For-Master is
*amortized* — a token-holding master sends ONE PFM per `Npoll` (50)
token receipts, borne by the master sitting below the address gap —
so 127-everywhere does NOT cost a per-rotation walk of the empty
range. The real costs are occasional ~`Tusage_timeout` stalls as that
single poll goes unanswered, slower discovery of a newcomer, and
slower ring re-formation. The direction taught (lower the ceiling to
a uniform value a little above the highest MAC) is right; the
mechanism is one notch too dramatic, in the same way #88's attribution
was one notch too firm. **Verification:** flagged (technical lane of
the mstp refutation round, against Clause 9's Npoll mechanics; the
owner may want to confirm against his copy of 135). **Suggested
direction:** soften BOTH surfaces in one pass to the amortized story —
the reworked `max-master-where-to-set` explain shipped in PR #592
("spends part of its maintenance polling walking a hundred-odd
addresses nobody owns, over and over, and a newcomer waits longer to
be found") was worded to be compatible with whatever softening these
two get, so the three surfaces can converge on one mechanism.
