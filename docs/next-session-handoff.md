# Session handoff — air-side FCU DDC sim: increment 1 (ducts & space) is next (2026-07-21)

> **Lifecycle:** written 2026-07-21, superseding the "cleanup done, air-side
> simulator is next" handoff — that file's 16-PR batch (#402–#419) all merged,
> and its air-side §1 framing was **overridden by the owner this session** (see
> Corrections). Retire this file when the FCU DDC sim graduates from mockup to a
> shipped, linked page — or the sim line is dropped. The durable design home is
> **`docs/air-side-sim.md`**; this file is only "where we are + next action."

## Read this first

**Every claim here is a hypothesis. The repo is the truth.** This session was
**owner-active, mockup-first, react-and-evolve**: the owner reacts to a live
artifact and scope shifts as he does (his field workflow). The prior handoff's
entire framing of the air-side sim came from a *previous scoping agent* and the
owner **redirected it live** — so treat any inherited framing here with extra
skepticism, and read `docs/air-side-sim.md` (north star, tiered backlog,
decisions, guardrails) before acting.

## Where things stand

`main` @ `08fdb76`, **v3.72.1**, clean tree except one untracked file
(`docs/air-side-sim.md`, the design doc — committed alongside this handoff).
Counts (main, unchanged — all sim work is branch-only + `eleventyExcludeFromCollections`):
**40 education lessons · 34 content quizzes + 7 field drills · 31 tools · 7
simulators.**

Two branches carry the work — **neither merged; owner reviews on GitHub, never
auto-merge:**

- **PR #420 (DRAFT)** — `feat/fcu-ddc-mockup` @ `2dde399` —
  `html/simulators/fcu-ddc.html` (644 lines), the rough interactive **DX
  fan-coil DDC-graphic** mockup. **Verified working this session** (live points,
  the "no ΔT over the coil" fault tell — red compressor LED + collapsed ΔT + red
  verdict pill, metric toggle, drill-downs, quasi-static via
  `Psychro.invertProcess`, zero console errors, LAN-previewed). **This is the
  real sim and the base to build increment 1 on.**
- `feat/fcu-duct-variants` @ `cd58807` — pushed, **no PR** (throwaway) —
  `html/simulators/_fcu-duct-variants.html`, a 3-way duct-look comparison.
  **Owner picked treatment B** (filled duct body + marching chevrons). Reference
  only; discard after B is ported.

## Corrections to the previous draft — do not rediscover these

1. **The north star is NOT "which box is starving," and NOT "Option A vs B."**
   The predecessor handoff framed the go/no-go as *"can a viewer tell which box
   is starving"* and leaned Option A (AHU sequence sim). **The owner overrode all
   of it (2026-07-21):** the north star is **diagnostic fluency reading a DDC
   graphic** (*"there's no ΔT over the coil," "the OA dampers are tanking MAT"*);
   "which box is starving" was the prior agent's idea and is **demoted, not the
   axis**. The sim is a **DX fan coil** as a **DDC supervisory graphic (software
   register)**, growing toward the AHU, and a **hub** whose components drill into
   device sims ("walk up to the unit"). Do not resurrect the starving-box framing
   as the organizing goal.
2. **The 2026-07-19 scoping doc's Option-A-vs-B recommendation is moot.** It was
   never the owner's call; scope now evolves mockup-by-mockup.
   `docs/air-side-sim-scoping.md`'s engine/readiness *findings* still hold
   (psychro coil-core idle + ready; refrigerant-loop ~78% depiction; flow-engine
   air lanes), but its scope *recommendation* is superseded by
   `docs/air-side-sim.md`.

## The work, in order

### 1. Increment 1 — "ductwork & space" depiction pass (owner-decided)

**Owner decision (2026-07-21): build duct treatment B onto the real sim.** Port
**B's filled duct body + marching directional chevrons** (from
`_fcu-duct-variants.html` on `feat/fcu-duct-variants`) onto
`html/simulators/fcu-ddc.html` (`feat/fcu-ddc-mockup`). The full pass, no hard
backend:

- **Two fixes to B when porting (owner notes, 2026-07-21):**
  - **Slow the chevron speed** — too fast even at 100%.
  - **Fix the "duct within a duct."** B's duct body continues *into* the cabinet,
    so it reads as a nested duct. Airflow should extend inside *through* the
    coil/fan **without** a second duct body drawn around them.
- Airflow reads as air and **extends inside the unit** (through coil + fan).
- **Fullscreen** treatment (refrigerant-loop is the reference pattern).
- **Remove the drill-down tiles**; **in-graphic component-click** drill-down
  instead — keyboard-reachable, a quiet "inspectable" affordance that's a small
  discovery but too clear to miss (owner-decided: "the unit itself has the other
  sims").
- Short **fan-heat / calibration callout** — the fan's honest thermal gain reads
  as a bug without it; owner wants it **brief**, doubling as a calibration
  teaching hook.
- Improve the **fan animation** (mostly the fan; coil secondary).
- ⚠️ **Guardrail: all duct/airflow animation is PAGE-LOCAL. Never modify
  `html/scripts/flow-engine.js`** — it's shared by every forced-air + hydronics
  lesson; changing its defaults regresses them. (Variant B is already page-local;
  only A reuses the shared engine.)
- Non-blocking sub-decisions to settle *during* the build: re-add the
  **compressor** glyph (dropped in variants — would sit in the wider airstream)?
  change the **wrap-around-left return routing**? Owner objected to neither.
- ⚠️ **Ship-time gates** (when it graduates from mockup): the **BLOCKING**
  `tests/contrast-sweep.spec.js` (both themes), the `PAGES` manifest,
  sitemap/nav wiring, README, version bump, and the damage-stakes-note question.
  The mockup is `eleventyExcludeFromCollections` + no `canonical` **specifically
  to stay out of all of these** while it's rough — keep it that way until the
  owner says it ships.

### 2. Horizon — dynamic, FBE-driven control (the big arc, behind increment 1)

**Owner decision (2026-07-21): the control strategy should be an FBE program from
the gate, not hand-coded** — so a lead BMS programmer (the owner) verifies the
control logic directly, instead of trusting hand-written JS. **Grounded good
news:** `html/scripts/fbe-engine.js` is already a tick-based execution engine
(`function tick(graph, dt)` at `fbe-engine.js:429`, Kahn topological sort at
`:400`, PID / timers / latches / comparators as stateful blocks, `window.FBE`
exposed at `:478`) — the controls runtime **exists**; FBE↔sim is an in-browser
wiring, no server.

- **Sequencing (owner):** manual **point override** first → owner drives the unit
  by hand to **commission the physics** (confirm it responds correctly, tune the
  feel) → *then* FBE control on the **same** points. The override state is a
  useful deliverable on its own — "you never automate on top of dynamics you
  haven't trusted."
- **Architectural principle to adopt EARLY:** give the sim a clean **IO point
  surface** — named AI/AO/BI/BO with engineering units — so a hand stub now and
  an FBE graph later plug into the same contract. Owner agreed to **add the FBE's
  IO point-blocks early**, not bolt them on last.
- **Dependency:** FBE control needs sim **dynamics** to act on — a **time-step**
  and **zone-temp-as-state** (both quasi-static today). That's the real work; the
  evaluator is done. (This is where the scoping doc's quasi-static-vs-tick
  question finally gets decided.)

**Explicitly deferred — do not carry as active work:** a limited **mobile**
version (the full sim can't be realized on a phone — likely a desktop-gate +
reduced view); **visible sensors** (→ a future meter/sensor sim); zone
**thermographics**; **selectable unit type**.

## Decisions waiting on the owner

None blocking. The duct pick is settled (**B**). The compressor-re-add and
return-routing sub-decisions (§1) are cheap and settle during the build. The
dynamics/FBE arc (§2) is the owner's to sequence, but it sits behind increment 1.

## Process notes that earned their keep

- ⚠️ **LAN preview needs a firewall port opened by the owner (root step).** The
  box runs firewalld; `enp3s0` is in the **FedoraServer** zone, which drops
  arbitrary high ports — so a dev server on a high port is unreachable from the
  owner's other devices *even though it binds `*:PORT`*. The owner opened 41573
  this session with `sudo firewall-cmd --zone=FedoraServer --add-port=41573/tcp`
  (runtime-only; clears on reboot). Any session serving a preview must have the
  owner open its port, or he gets "address unreachable" (his dashboard works
  because it rides Caddy on 443). Give him the **IPv4** URL
  (`http://192.168.8.123:PORT/…`) — the dev server is v4-only.
- **Verify before showing the owner.** Every deliverable this session was checked
  against the *running* page (dark-theme screenshots, state read-back) before
  handoff — it confirmed the fault tell + metric toggle actually work rather than
  trusting the subagent's report. (One subagent's automated metric check
  false-negatived on an ambiguous `.units-btn` selector; the feature was fine.)
- **Delegate builds to worktree subagents, one draft PR each; owner reviews, no
  auto-merge.** A fresh worktree has no `node_modules` — symlink the primary's
  (`ln -s /home/ehill/controlsfreak.dev/node_modules node_modules`) or `npm ci`.
  To preview a branch without disturbing the shared primary checkout, use a
  **detached** worktree at `origin/<branch>` (never `git checkout` in the primary
  — concurrent sessions share it).
- **Nunjucks macros do NOT close over template-level `{% set %}`** — the variants
  subagent hit this (empty `d=""` on duct paths → `getPointAtLength` on an empty
  path); fix is to move the `{% set %}`s *inside* the macro. Watch for it on any
  macro-based SVG-reuse.
- **Tell every lane the brief is a hypothesis**, correcting it is wanted, and the
  orchestrator — not the lane — decides what to do about a discrepancy.

## One passing note

The air-side FCU DDC sim is the flagship-in-progress, and it's off to a strong
start: the owner confirmed the mockup *"looks like the start of my vision,"*
picked a duct direction, and the vision sharpened into something genuinely novel
— a **diagnosable DDC graphic** that's also a **hub** into the device sims, with
an eventual **FBE-programmable** control layer the owner can verify with
real-BMS-programmer accuracy. Honest readiness: the physics core and the duct
direction are settled; the near-term cost is **depiction** (increment 1); the
control horizon is *more* feasible than it first looked, because the FBE runtime
already exists — the missing pieces are the sim's dynamics + an IO surface.
Design home: **`docs/air-side-sim.md`**.
