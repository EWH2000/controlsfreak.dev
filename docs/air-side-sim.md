# Air-side equipment DDC simulator — design & backlog

> Living design doc for the air-side / equipment DDC simulator line. Owner-active,
> scope evolves through interaction (mockup → react → refine). Supersedes the
> *decided direction* portion of `docs/air-side-sim-scoping.md` (that file stays
> as the 2026-07-19 feasibility pass; its engine/readiness findings are still
> valid). Started 2026-07-21.

## North star

Take a tech from a rough idea of how an AHU works to **reading a DDC graphic and
diagnosing it** — seeing how the air flows and changes through the machine
(temperature, enthalpy, MAT, sometimes CO₂/OA) and naming the fault: *"there's
no ΔT over the coil,"* *"the OA dampers aren't feeding back right and it's tanking
MAT."* The coil physics, control sequence, and psychrometrics are all **means to
that diagnostic end**, not the point.

- **Look = DDC supervisory graphic (software register)** — the BAS front-end a
  tech reads, not a hardware device face.
- **Hub of sims ("walk up to the unit")** — components on the graphic drill into
  device-level sims (fan → VFD sim, DX coil → heat-pump sim), which unifies the
  existing sims and gives future ones a front door. *(See "drill-down" under open
  questions — the redundant tile UI is out; the in-graphic click may stay.)*
- **FCU first, grow toward the AHU.** The fan coil is the smallest diagnosable
  unit; the owner's own fault examples are AHU faults, so the structure grows
  toward OA/mixing → MAT and beyond.

## Current state — Increment 2 (DDC Workbench) shipped, live-but-hidden (2026-07-23)

`html/simulators/ddc-workbench.html` (renamed from `fcu-ddc.html`) — **merged to
`main`**, `eleventyExcludeFromCollections` + `noindex` (reachable at its URL, out
of nav / search / sitemap / landing). Two tabbed views on one runtime: a **Unit**
view (the DX fan-coil DDC graphic from Increment 1) and a **Wiresheet** view (the
Function-Block Editor, lazy-mounted). An **FBE control program drives the unit
every 10 Hz tick** through a generic binding driver, with **HAND/AUTO** override.
The default `cool-2stage` program stages Y1/Y2 off space-temp vs a
wiresheet-editable setpoint. **The loop is still OPEN** — space temp is a
hand-nudged input; no zone thermal dynamics yet (the physics session, next).
Shipped across:
- **PR #420** — the DX fan-coil DDC-graphic mockup (Increment 1's depiction:
  live points EAT / DAT / ΔT / zone / fan / compressor, chevron airflow, fault
  presets, the "no ΔT over the coil" tell, fullscreen, in-graphic drill-downs).
- **PR #421** — the FBE editor wire-visibility fix (delete-one-blanked-all).
- **PR #422** — extracted the drag-wire editor into the shared module
  `html/scripts/fbe-editor.js` (`window.FBEEditor.createEditor`) + fixed
  codebase-issues #196 (render/cache decoupled from the wire data objects);
  version 3.72.1 → 3.73.0.
- **PR #423** — the Workbench itself (two tabs, the host tick loop, the generic
  binding driver, the FCU unit plug-in, 3 sample programs).
- **PR #424** — the verdict pill reads idle (neutral), not a red fault, when the
  program satisfies the space (auto-fan cycles the fan off).

Still quasi-static via `Psychro.invertProcess`. **The react-baseline / reference
point, not a surfaced page.**

## Confirmed decisions (owner)

- Interactive from the start; **FCU-DX first**; **DDC / software register**; grow
  toward the AHU.
- **Zone temp is an input for now** (a slider); simulating it as driven state is
  a *later* step — good to defer.
- The **fan's thermal gain is honest and kept** (a real draw-through pickup); it
  just needs a short callout so it doesn't read as a bug (below).
- The **"which box is starving"** framing is *not* the north star (a prior
  agent's idea). Diagnostic fluency is.

## Live-look feedback → refinements (2026-07-21)

### Depiction & space — the pressing cluster
- **Ductwork needs width.** The flow-engine's "liquid-through-a-pipe on a
  centerline" reads wrong for air. Real DDC graphics show ducts with visible
  **width** (realistic-ish, still in our AX-sharp style). Air is a fluid, but it
  shouldn't read like liquid in a line.
- **Airflow animation should extend *inside* the unit** — through the coil and
  fan, not stop at the cabinet boundary.
- **Fullscreen treatment.** Wider ducts need room; adopt the fullscreen pattern
  the other sims already use (refrigerant-loop is the reference).
- **Remove the drill-down tiles below the graphic** (redundant with top-nav +
  the command-palette **search** — the owner's most-used QOL feature — and the
  direction needs the real estate). **Keep the in-graphic component-click**
  "walk up to the unit" (owner, 2026-07-21): the sub-sims live *in the unit*,
  **keyboard-reachable**, a small delight to discover when inspecting a
  component — but a clear-enough affordance that it isn't missed.
- **Mobile can't fully realize this sim.** Plan a **limited mobile version**;
  figure out the shape later (likely a desktop-gate + a reduced read-only view —
  see guardrails).

### Honesty & teaching
- **Fan thermal-gain callout.** Keep the gain; add a **short, explicit** callout
  so it doesn't look buggy, and use it as a hook to talk **calibration** (offset
  a real DAT sensor carries). Keep it brief — not longwinded.

### Confirmed defers (from this look)
- Zone-temp-as-simulated-state → later (see Horizon).
- Airflow-on-fault animation → folded into the ductwork/airflow rework above
  (an airflow fault should visibly starve the air, not keep it flowing full).

## Backlog — tiered (owner brain-dump 2026-07-21, refined)

### Near-term — depiction & space *(SHIPPED 2026-07-22 as Increment 1)*
Duct **width** + realistic-ish DDC ductwork (our style) · airflow animation that
reads as **air** and extends **inside** the unit · **fullscreen** · **remove the
tiles** · short **fan-heat/calibration callout** · **improved fan animation**
(and coil, but mostly the fan). *(One item held back: the upper-left composition
— parked as "fix 1", see Increment 1 below.)*

### Mid-term — features
- **Visible sensors** on the graphic (temp/pressure/flow points as real sensor
  glyphs) → seeds a future **meter & sensor sim** the graphic could drill into.
- **Thermographics on the zone** — a thermal-image-style temperature read of the
  zone (gradient/color), so the zone's condition is legible at a glance.
- **Selectable unit type** (FCU / AHU / …) — the concrete form of "grow toward
  the AHU" and the hub's "show different units."

### Horizon — dynamic, FBE-driven control (ambitious, coupled)
The unit runs a **closed-loop control strategy** — zone temp becomes driven
state and the equipment operates on its own, not just manual knobs. Per the owner
(2026-07-21), that control strategy should be an **FBE program from the gate**,
not a bespoke hand-coded sequence — because a **lead BMS programmer can verify
the control logic with real-programmer accuracy** instead of trusting hand-written
JS. Verifiability by the domain expert is the whole argument, and it makes the sim
a genuinely novel teaching tool (write a program, watch it run the model).

- **Feasibility is strong — the runtime already exists.** `html/scripts/fbe-engine.js`
  is a **tick-based execution engine** (`FBE.tick(graph, dt)`): PURE / no DOM,
  topologically evaluates a `{blocks, wires}` graph each tick, with PID / timers
  (`ton`/`tof`) / latches (`sr`) / comparators as stateful blocks. It's a real
  controls runtime, not a drawing tool, and everything is client-side — so
  FBE↔sim is an **in-browser** wiring, no server.
- **Architectural principle to adopt EARLY (even before control lands):** design
  the sim around a clean **IO point surface** — named AI/AO/BI/BO points with
  engineering units (sensors in, commands out). Then *whatever* drives the unit
  — a trivial hand stub now, an FBE graph later — plugs into the same contract.
  That makes FBE-first a wiring job, not a rewrite.
- **Real remaining work / dependency:** FBE control needs the sim to have
  **dynamics** to act on — a **time-step** (today it's quasi-static) and
  **zone-temp-as-state**. So the increment is: sim dynamics + the IO surface +
  input/output "point" blocks that bind an FBE graph to the sim's points. The
  FBE *evaluator* is done. This is one coupled increment (the old "auto-run" and
  "FBE tie-in" are the same thing now), and it stays behind the near-term
  depiction work.
- **Sequencing — manual override FIRST, then FBE (owner, 2026-07-21).** Build the
  dynamics + IO surface with **manual point override** (force a command/value,
  the way a tech overrides an AO/BO at a controller). The owner then **drives the
  unit by hand to commission the physics** — confirm it responds correctly and
  tune the response *feel* — **before** finalizing, *then* layers FBE control on
  the *same* points. The override state is the commissioning bench and a useful
  deliverable on its own. **Add the FBE's IO point-blocks early** (owner-agreed)
  so the binding surface exists before the control work, not bolted on last.
  - ⚠️ **Refined 2026-07-22 (see "DDC Workbench" below):** the owner set the
    strict override-first order aside *for focus* — do **all** the FBE build in
    one session with the loop **open** (zone temp stays an input you nudge by
    hand), then a dedicated **physics** session for closed-loop dynamics +
    psychro tuning. HAND/AUTO override still ships in the FBE session; the
    commission-by-hand payoff arrives once the physics session lands dynamics.

## Engineering guardrails (carry into any increment)

- **`flow-engine.js` is shared site-wide** (every forced-air + hydronics lesson
  drives it). Duct-width / air-animation changes must be **page-local or opt-in**
  — do not regress the lessons by changing the shared engine's default behavior.
- **Desktop gate.** A fullscreen, duct-heavy sim that can't work on a phone
  likely needs the `.desktop-only-sim` tips panel below ~1000px + an entry in
  `tests/sim-desktop-only.spec.js` (same pattern as the drag-to-place sims),
  unless the "limited mobile version" gives it a genuine reduced view instead.
- **Ship-time gates** (when it graduates from mockup): the blocking
  `contrast-sweep` (both themes), `PAGES` manifest, sitemap/nav wiring, README,
  version bump, and the damage-stakes note question.

## Open questions

1. ~~**Duct width — how wide, what style?**~~ *(answered — filled duct body +
   marching chevrons, treatment B; shipped in Increment 1, 2026-07-22.)*
2. **Limited mobile version** — desktop-gate + read-only view, or a genuinely
   reduced interactive layout? Later.

## Increment 1 — "ductwork & space" — SHIPPED (2026-07-22)

Duct treatment **B** (filled body + marching chevrons) ported onto `fcu-ddc.html`
and **merged (PR #420)**. Delivered: page-local chevron airflow crossing the
open cabinet through coil+fan (flow-engine dependency dropped), filled
**exterior-only** ducts (the "duct within a duct" fixed — no body inside the
cabinet), fan-speed-coupled chevron speed with smooth sub-sample interpolation,
air recolor across the coil, fullscreen, in-graphic keyboard-reachable
SVG-`<a>` drill-downs (tiles removed), fan-heat / calibration note, a fuller fan
impeller, compressor LED moved to the cabinet base off the airstream. Owner's
two porting fixes (slow chevrons, kill duct-in-duct) both applied; a fix-up
round fattened the ducts and cleared label overlaps.

- **Parked by owner (2026-07-22): the upper-left composition** (the return-duct
  box crowds the EAT/ΔT/DAT badges + the cabinet corner). Owner: **"no fix" for
  now** — he builds similar nested boxes in his own graphics, and canvas
  headroom shrinks as units get bigger. Eventual fix named **"fix 1": re-route
  the return so it drops into the cabinet *top*** rather than wrap the whole left
  side. Revisit in a later depiction pass, not now.

## Increment 2 — the FBE "DDC Workbench" — SHIPPED (2026-07-23)

> Shipped across PRs #421–#424 (see *Current state*). The design below is as
> decided; two deviations from it, as built: (1) the editor was **extracted to a
> shared module** (`fbe-editor.js`, PR #422) rather than generalizing the editor
> page in place; (2) the IO-point **param binding is block→plant** — setpoint /
> deadband live in the FBE program's `const` blocks and are read INTO the plant,
> so editing the setpoint on the wiresheet changes staging (the reverse of an
> early plan sketch; it's what makes the wiresheet-editable-setpoint behaviour
> work). **The immediate next increment is the physics session (closed-loop
> dynamics + psychro tuning) — see *Horizon* and `docs/next-session-handoff.md`.**

**ALL the FBE work in one focused session** (owner: "get the bouncing out of the
way"), so the session *after* is pure sim physics. The FCU sim is reframed as the
**"DDC Workbench Sim."**

- **Model A — one page, one runtime, two tabbed views:** a **Unit** view (the DDC
  graphic) and a **Wiresheet** view (the FBE editor), the editor view
  **lazy-built** so the Unit tab stays light. The owner rejected truly-separate
  documents synced over a channel as fragile.
- **Two-tier program model:** a few **sample programs** for non-authors + a
  **live editable wiresheet** to write your own and watch it run; picking a
  sample loads its logic onto the wiresheet. The **Unit** tab's control
  affordance shows the **live IO values + the running program's name**.
- **Data-driven IO point surface** (owner: build it so bigger units are a config
  change, not a rewrite): cooling-only DX to start — AI Space Temp + DAT; AO
  Supply-Fan Speed; BO Fan-Enable / Y1 / Y2; params Cooling SP + Deadband. Maps
  onto the FBE I/O blocks.
- **HAND/AUTO override** on the points (HAND drives by hand, AUTO lets the FBE
  graph drive).
- **The loop stays OPEN this session** (owner-confirmed): the program runs and
  drives the unit and you watch the air state react, but **zone temp stays an
  input you nudge by hand** — closed-loop dynamics + psychro tuning are the
  SESSION AFTER (see Horizon). A deliberate split, not an oversight.
- **Reuse the existing FBE stack:** `fbe-engine.js` (tick runtime + block library
  incl. I/O blocks + PID) and `function-block-editor.html` (a working drag-wire
  editor with loadable example programs). ⚠️ The editor's logic is **inline** in
  that page, not a shared module — embedding it likely means **extracting a
  reusable editor module** into `html/scripts/` (or making the Workbench the
  generalized editor). First real architectural task.
- **Precondition met:** the FBE editor's wire-visibility bug (delete-one-blanks-
  all; new-wire-blanks-previous) was a live production bug — fixed, verified, and
  **PR #421 merged 2026-07-22**. Its deeper root (render cache on the wire data
  objects) is logged as codebase-issues **#196** — a good decoupling target if
  the editor is being extracted anyway.

Everything else (visible sensors, zone thermographics, selectable unit type, and
the closed-loop dynamics + psychro tuning) stays in the backlog / the physics
session.
