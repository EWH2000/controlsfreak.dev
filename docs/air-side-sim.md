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

## Current state — Increment 0 (shipped as a rough mockup, 2026-07-21)

`html/simulators/fcu-ddc.html` — draft **PR #420**, branch `feat/fcu-ddc-mockup`,
`eleventyExcludeFromCollections` (unlinked throwaway). A DX fan coil as a DDC
graphic: live points (EAT / DAT / **ΔT across coil** / zone temp+setpoint / fan /
compressor), three knobs, four fault presets, the **"no ΔT over the coil"** tell
(red compressor LED + collapsed ΔT + red verdict), metric toggle, drill-downs to
the VFD + heat-pump sims. Quasi-static via `Psychro.invertProcess`. Verified
working, LAN-previewed. **This is the react-baseline, not a shipped page.**

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

### Near-term — depiction & space (one coherent increment)
Duct **width** + realistic-ish DDC ductwork (our style) · airflow animation that
reads as **air** and extends **inside** the unit · **fullscreen** · **remove the
tiles** · short **fan-heat/calibration callout** · **improved fan animation**
(and coil, but mostly the fan).

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

1. **Duct width — how wide, what style?** Needs the owner's eye on 2–3 concrete
   options (double-line duct, filled duct body, chevron-vs-particle airflow).
2. **Limited mobile version** — desktop-gate + read-only view, or a genuinely
   reduced interactive layout? Later.

## Next increment — "ductwork & space" (Increment 1) — DECIDED

Apply **duct treatment B** (owner pick, 2026-07-21): a **filled duct body with
marching directional chevrons** (from the variants comparison
`html/simulators/_fcu-duct-variants.html` on branch `feat/fcu-duct-variants` — a
throwaway; the *real* target is `html/simulators/fcu-ddc.html` on
`feat/fcu-ddc-mockup`). The full depiction pass, no hard backend:

- Port B's filled-body + chevron ducts onto the **real sim** (`fcu-ddc.html`),
  keeping all page-local (never touch shared `flow-engine.js`).
- **Two fixes to B when porting (owner notes, 2026-07-21):**
  - **Slow the chevron speed** — too fast even at 100%.
  - **Fix the "duct within a duct."** B's duct body continues *into* the
    AHU/cabinet, so it reads as a duct nested inside the unit. The airflow should
    extend inside the cabinet *through* the coil/fan **without** drawing a second
    duct body around them.
- Airflow reads as air and **extends inside the unit** (through coil + fan).
- **Fullscreen** treatment (refrigerant-loop pattern).
- **Remove the drill-down tiles**; **in-graphic component-click** drill-down
  instead (keyboard-reachable, discoverable-but-not-missed).
- Short **fan-heat / calibration callout**.
- Improve the **fan animation**.
- Open sub-decisions carried in: whether to re-add the **compressor** glyph
  (dropped in the variants; would sit in the wider airstream) and whether the
  **wrap-around-left return routing** should change (owner didn't object).

Everything else (visible sensors, zone thermographics, selectable unit type, and
the dynamics + manual-override commissioning + FBE-driven control arc) stays in
the backlog.
