# Air-side simulator — scoping brief (2026-07-19)

> **Lifecycle:** groundwork parked for the air-side simulator's own session.
> Produced by a read-only feasibility pass at `main` @ `2ddd7d0` (v3.69.4), not
> a plan and not owner-approved. Verify every claim before acting — line numbers
> and counts drift. Retire this file when the sim ships or the scope is decided
> some other way.

## The headline

**Readiness is higher than "next flagship" implies — this is substantially a
consolidation job, not greenfield physics.** The psychrometric core exists and
is spec-covered, the animated air-lane rendering exists and is in production,
and five of the eight forced-air lessons already contain working models with
owner-blessed constants. The genuinely new work is one solver and the
consolidation itself.

<!-- // DO NOT "reconcile" this five against the six below — they count
     different things, and both are correct. Measured at ab73ebb:

       6 lessons have an INTERACTIVE WIDGET  (all but air-balancing and
         dedicated-outdoor-air) — that is the "other six" at L141-143.
       5 of those 6 have a PHYSICS MODEL with owner-blessed constants —
         air-handlers, building-pressure, duct-static-control,
         economizers, vav-systems. That is this line's five.

     The odd one out is air-unit-identification: 15 controls and 228
     script lines, but zero physical constants. It is a
     constraint-satisfaction identification game (FAMILIES / MYSTERIES /
     QUESTIONS / survivors / firstMismatch), not a model — so it has
     nothing for a physics sim to consolidate.

     This was "corrected" from five to six on 2026-07-19 by a session
     that read the two numbers as a contradiction. That change made a
     true statement false; reverted 2026-07-20 after a scoping session
     checked air-unit-identification for physics constants and found
     none. Check what each number counts before reconciling them. -->


## What already exists to build on

**`psychro-engine.js` (258 lines) is the decisive asset.** Full ASHRAE 2017
Fundamentals IP moist-air math (`satPress`, `humRatioFromRH`, `rhFromHumRatio`,
`enthalpy`, `specificVolume`, `wetBulbFromHumRatio`, `dewPointFromVapPress`)
plus a namespaced solver: `Psychro.solveState` / `buildState` /
`computeProcess(stage, cfm)` / `invertProcess(inlet, opts)`. `computeProcess`
already returns per-stage sensible/latent/total from CFM and inlet/outlet
states; `invertProcess` already solves a leaving-air state back from a known
load. **That is the mixed-air and coil core.** Spec-covered
(`tests/psychro-engine.spec.js`, pure-Node vm pattern), already consumed in
production, and its own header names air-mixing / coil-sizing /
economizer-ratio as intended consumers — an air sim is the one it was shaped
for.

**`flow-engine.js` (716 lines)** already supports `data-flow="air"` with
particle color read from each element's stroke attribute, so OA/RA/SA/EA lanes
color from markup by construction. All eight forced-air lessons already drive
it. The animated duct rendering layer is done.

**`hydronic-engine.js` (1,021 lines) is the structural template** for the one
genuinely new solver needed: a nonlinear resistor network solved as a
linearized nodal system, iterated to convergence, then a one-pass thermal sweep
on settled flows. An air duct network is the same mathematics with a fan curve
as the source instead of a pump. The water constants don't port; the
architecture does — `COMPONENTS` catalog, `createComponent`, `makeSystem` (deep
clone so literals are never mutated), `tick(system, dt)`, and a `solve()` that
returns hydraulics-only for tests.

**Also reusable:** `duct-engine.js` (Altshul-Tsal friction, Huebscher rect↔round,
bisection solvers) if real duct geometry is modeled; `pid-engine.js` +
`pid-chart.js` if actual loops run rather than quasi-static solves; `units.js`
(`Units.display.airflow` / `.enthalpy` / `.temp` — the metric boundary already
exists for every air quantity).

**Five of eight lessons already carry tuned models.** Most notably
`duct-static-control.html` is already a fan/duct hydraulic solver — fan curve
`5.5 − K·Q²`, affinity `r²`/`r³`, split coil/trunk resistances, SP reset to a
0.5 floor, iced coil ×4, a transducer that rails at 2.5 in. w.c.

## Two architectural calls that must be made before any code

Both are cheap now and expensive later.

**1. The numeric-agreement contract with the existing lesson widgets.** They
carry specific owner-blessed numbers — 30,000 CFM design and 5.5 in. w.c.
shutoff in `duct-static-control`; a 200/1000 CFM box with `k=1000` and a
400 CFM/ton coil floor in `vav-systems`; a 0.5 Btu/lb enthalpy wash band in
`economizers`. Three options: the sim adopts them and the widgets are later
refactored onto the shared engine; the sim adopts them and both stand
independently; or the sim re-derives and the widgets drift. **The repo has
already been bitten by this class.** Decide before freezing constants.

**2. Time-step vs quasi-static.** `refrigerant-loop` set the precedent
explicitly — deterministic, no time step, recompute-on-change — and that suits
a mixing-box/economizer/coil sim fine. But a duct-static loop *finding* its fan
speed, and a fan ramping against boxes that are repositioning, want a tick. The
in-repo precedent for that is `staging-sequencer.html`'s `step(dtSimSec)`. This
determines whether the public API is `solve(inputs)→state` or
`tick(system, dt)`, **and the two are not cheaply interconvertible.**

## Scope options

**Option A — "AHU sequence sim"** (mixing box + economizer + coils,
single-zone/CV). OA/RA/EA dampers on one linked signal, filter, preheat and
cooling coil, supply fan. Knobs: OAT and OA humidity, return conditions, MAT
setpoint, changeover type, minimum-OA position, coil valve or DX stage.
*Teaches:* economizer changeover and integration, mixed-air control, the
heat/cool sequence and deadband, freeze risk at low MAT, the minimum-OA floor —
closing lessons 1, 2, 8 and part of 3.
*Physics:* almost entirely `psychro-engine` (mix by mass fraction, then coil via
`computeProcess`/`invertProcess`) plus a damper/valve sequence table. No duct
network.
*Shape:* quasi-static, the refrigerant-loop pattern exactly.
*Size:* engine ~400–600 lines, ~35–45 spec tests.
*Risk:* overlaps `psychrometric-chart` hardest. **Must lead with the
sequence/fault/verdict layer — if a reviewer can call it "the psych chart with
sliders," the scope has failed.**

**Option B — "Air-side system sim"** (AHU + trunk + VAV boxes) — the true
capstone. Everything in A plus a trunk, N VAV boxes with min/max/reheat, a
duct-static loop driving fan speed, and building pressure via return/relief.
*Teaches:* lessons 1–8 end to end.
*The honesty guard writes itself, and is the strongest argument for B:*
**"STATIC IS NOT FLOW"** — a healthy duct static hiding collapsed airflow. That
is already the duct-static lesson's thesis and it already models it (iced coil
×4 resistance, fan saturating at 60 Hz). It is the direct structural analog of
refrigerant-loop's "starved coil freezes at normal superheat." Second guard
candidate: a box pinned at minimum with reheat while the zone is still cold, and
the 62.1 ventilation floor at low load.
*Physics:* `psychro-engine` for states + a small nodal air network
(hydronic-engine's pattern, fan curve as source) + the fan-curve/affinity math
already in `duct-static-control` + the flow-ring math already in `vav-systems` +
the air ledger from `building-pressure`.
*Size:* the true flagship — engine plausibly 900–1,200 lines, ~60–90 spec tests,
roughly 2.5–3× option A.
*Risk:* highest numeric-agreement burden (touches all five existing widgets), and
the option most likely to need a time step.

A middle "distribution-only" option (VAV/duct-static without the AHU
psychrometrics) was also sketched but its detail was lost in the pass — worth
re-deriving if A and B bracket the choice unhelpfully. Note the friction file
independently names exactly two acceptable payoffs, *"mixed-air/economizer or
VAV/duct-static,"* which is a useful outside check on the scoping.

## Constraints and consequences easy to miss

- **The hero demo placement is already specified.** If an air-side sim ships,
  the second live hero demo must be **a toggle/tab on the existing
  `.hero-seam-stage`, not a second stacked widget** — the home hero was composed
  with one loop as the single payoff.
- **`codebase-issues` #175 comes due inside this PR by prior decision** if the
  sim reuses the refrigerant-loop gauge component — that is the exact revisit
  trigger recorded on the deferral.
- **#174 binds only** if the sim shares or refactors RL's air-lane SVG rather
  than building its own. Decide deliberately either way.
- **Drag-to-place inherits the desktop gate.** If the sim takes the
  hydronic-loop-builder / function-block-editor shape rather than sliders, it
  needs a `.desktop-only-sim` tips panel below 1000px and on touch-primary
  devices, plus its entry in `tests/sim-desktop-only.spec.js`. A slider-driven
  sim in the refrigerant-loop mold avoids this entirely — **a scope consequence
  to choose, not discover.**
- **Two lessons have nothing to consolidate.** `air-balancing.html` and
  `dedicated-outdoor-air.html` are the only forced-air lessons with **no
  interactive widget** (0 controls vs 150–290 lines of script in the other six).
  They are also **the only two without a paired quiz** (chapter coverage is 6/8).
  If the sim is positioned as the chapter capstone, both gaps are worth
  annotating on the plan rather than discovering at cross-link time — and any
  physics those two need is genuinely new work.

## The standard it must clear

Set by `refrigerant-loop`: pure engine as a frozen global; engine-owned
`CLAMPS`/`DEFAULTS`/`PRESETS` read by the page's slider mirror; flags+verdict
return shape; `asNum` NaN-proofing; a visible "About this model" honesty card;
a pure-Node engine spec; an adversarial verification round; and the
equipment-depiction lens — *would a tech read this machine as operating
correctly* (rotation sense vs geometry, port/connection fixity, physically
impossible state changes). **The refrigerant-loop engine spec pins its SVG
geometry at source level** — flow direction, IN/OUT lane pairing, coil tube
rows, serpentine endpoint joins, gradient `userSpaceOnUse`, frost-crystal
seating — **and it is the only simulator with that coverage**, so that
lens is machine-checked rather than only reviewed. The owner builds equipment
graphics professionally and his eye is the final QA — bring screenshot sets at
review time.
