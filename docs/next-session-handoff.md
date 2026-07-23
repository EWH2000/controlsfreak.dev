# Session handoff — DDC Workbench is live; the physics (closed-loop) session is next (2026-07-23)

> **Lifecycle:** written 2026-07-23, superseding the "PR-2 DDC Workbench is
> next" handoff — that whole arc shipped (PRs **#421–#424**, all merged) and its
> sections are removed. This file sets up the **physics session**: closing the
> loop (zone-temp-as-state + a time step) and psychro tuning on the DDC
> Workbench. Retire it when the loop is closed (the FBE program stabilizes the
> space on its own) and the psychro feel is tuned — or the physics direction is
> dropped. Durable design home: **`docs/air-side-sim.md`** (*Horizon* section).
> This file is only "where we are + next action."

## Read this first

**Every claim here is a hypothesis. The repo is the truth.** This line is
owner-active and react-and-evolve: the owner wants to **commission the physics by
hand/feel** — drive the unit, confirm it responds correctly, tune the *response
feel* — before finalizing. So this session's model is an **iterable structure to
get in front of him early on the LAN preview**, not a spec to implement blind.
The predecessor arc's one real trap was a plan sketch with the IO param-binding
backwards (see *Corrections*). Read `docs/air-side-sim.md` before acting.

## Where things stand

`main` @ `de93ece`, **v3.73.0**, clean tree. No open PRs. (Line numbers below
cite `de93ece`, the commit they were taken at — deliberate, not stale.)
Counts: **40 education lessons · 34 content quizzes + 7 field drills · 31 tools ·
8 simulators** — the 8th, `html/simulators/ddc-workbench.html`, is the **hidden**
Workbench (`eleventyExcludeFromCollections` + `noindex`, out of nav / search /
sitemap / landing / `tests/pages.js` / README).

Shipped this arc (all merged):
- **#420** — the DX fan-coil DDC-graphic mockup (the depiction).
- **#421** — the FBE editor wire-visibility fix.
- **#422** — extracted the drag-wire editor into `html/scripts/fbe-editor.js`
  (`window.FBEEditor.createEditor`) + fixed codebase-issues **#196**; v3.72.1 →
  **3.73.0**.
- **#423** — the **DDC Workbench**: `git mv fcu-ddc.html → ddc-workbench.html`,
  two tabs (Unit | Wiresheet), a host-owned 10 Hz tick loop, a generic binding
  driver, the FCU unit plug-in, 3 sample programs (`cool-2stage` default,
  `cool-1stage`, `cool-2stage-fanon`).
- **#424** — the verdict pill reads idle (neutral), not a red fault, when the
  program satisfies the space.

**What the Workbench does today** (`ddc-workbench.html` @ `de93ece`): an FBE
control program drives the FCU each tick. `hostTick()` (`:793`, fired by
`setInterval(…, 100)` at `:1578`) runs the binding driver → `unit.update(plant,
dt)` → `unit.renderUnit(plant)` → repaint. In AUTO the program's Y1 / Y2 /
fan-enable / fan-speed outputs drive the unit; in HAND you drive them. **The loop
is OPEN:** `zoneT = plant.sensors['space-temp']` (`:1024`) is exogenous — set by
the space-temp slider (`:1224`) or presets (`:1185`), NOT computed. The comment
at `:732` / `:1011` says so outright.

## Corrections to the previous draft — do not rediscover these

1. **IO param binding is block→plant, NOT plant→block.** The prior handoff's PR-2
   sketch (and the plan) wrote the driver as `block.params.value =
   plant.params[key]` each tick (plant→block). As **built and shipped** it is the
   reverse — `plant.params[p.plantKey] = blk.params.value`
   (`ddc-workbench.html:774`, comment `:766-773`, @ `de93ece`): the **setpoint
   and deadband live in the FBE program's `const` blocks** (the program's own
   config) and the driver READS them into `plant.params`. That is what makes
   editing the setpoint const on the wiresheet actually change staging (verified
   live during #423 verification). A future plant-side setpoint *schedule* would
   seed the block at load and keep this read for display — **do not flip the
   direction back.**
2. **The `!fanOn` verdict split (#424) is intentional — don't collapse it.**
   `renderUnit`'s verdict branches fan-off two ways (`ddc-workbench.html:1122` @
   `de93ece`): stage energized + fan off = red no-airflow fault; no stage called
   + fan off = neutral "No cooling call — fan off (idle)". A refactor of
   `renderUnit` must preserve both.
3. **The shell carries NO fcu identifier; `unit.syncControls`
   (`fcuSyncControls`, `:1506`) owns fcu control sync.** The seam is real — no
   `fcu` / `fan` / `stage` id appears before the `UNIT: FCU` banner (`:937`). The
   shell walks `unit.points` generically so a future AHU is a config swap; keep
   it that way.

## The work, in order — the physics (closed-loop) session

**Owner decision (2026-07-21, reaffirmed 2026-07-22): the session after the FBE
build is pure sim physics — close the loop and tune the psychro feel.** He wants
to **commission by hand** (drive the unit, confirm it responds right, tune the
*feel*) before finalizing — so build the model as an iterable structure and get
it on the LAN preview early; don't finalize blind.

### 1. Close the loop — zone temp becomes a state

Today `zoneT` is exogenous (`:1024`, written from the slider `:1224` / presets
`:1185`). Closing the loop = **integrating `zoneT` each `hostTick`** from a zone
heat balance, so the FBE staging program stabilizes the space instead of you
hand-holding it. The pieces, none of which exist today:

- **Zone thermal capacitance** `C_zone` (Btu/°F) — bigger = slower/smoother.
- **Heat-gain model** `Q_gain` (Btu/h) — the load pushing zone temp UP. Simplest:
  one adjustable "load" knob. Richer: outdoor-temp-driven (adds an OA-temp point).
- **Sensible cooling removed** `Q_cool` (Btu/h) — the zone heat SINK. ⚠️ Derive it
  from the **air side actually delivered** (`cfm × 1.08 × (zoneT − coilLeaveT)`),
  **NOT** from the fixed `STAGE_QSENS` constant (`:950`). The model already
  computes `cfm` (`:1044`) and `coilLeaveT` (`:1048`, clamped at `COIL_FLOOR`), and
  at reduced airflow the delivered sensible is LESS than nameplate
  `STAGE_QSENS[stage]`. Using the constant would double-count and decouple fan
  speed from the loop.
- **Integration:** `zoneT += (Q_gain − Q_cool) / C_zone × dt_sim`, each tick.

### 2. ⚠️ The time-scaling decision — the load-bearing open question

`hostTick` fires at **10 Hz wall-clock** (`DT = 0.1s`, `:738`, `:1578`). Building
thermal dynamics move over **minutes** — a 1:1 integration would take real
minutes to see the space move (a dead sim). So the session must pick a
**sim-time-vs-wall-time** scheme:
- **Time compression** — each 0.1s tick advances N sim-seconds (e.g. 1 tick = 30
  sim-s → a 10-minute recovery plays in ~2 wall-seconds). One constant.
- **Separate slower thermal integrator** — keep 10 Hz for animation, integrate the
  zone on a coarser sim clock.

This is the plan's **"quasi-static vs tick" decision** (`air-side-sim.md`
*Horizon*). **It is an owner-feel call** — the response *feel* is exactly what he
wants to commission by hand. Bring a first compression factor to the LAN preview
and tune it live.

### 3. What the space-temp slider BECOMES

Once the loop closes, the slider (`:1224`) is no longer the live driver. It
becomes one of: an **initial condition**, a **disturbance injection** (bump the
load), or a **load proxy**. Decide with the owner — HAND/AUTO still applies (in
HAND you override actuators; the zone still integrates).

### 4. Psychro tuning (the deferred item rides here)

Cooling is quasi-static via `Psychro.invertProcess` (`:1047`). The deferred
"tune the psychro feel" work rides along — make the ΔT / DAT response read right
as the loop settles.

**Explicitly declined / deferred — do NOT carry as open work here:**
visible-sensor glyphs, zone thermographics, selectable unit type (backlog,
`air-side-sim.md`); the limited **mobile** view; the upper-left graphic
composition (owner-parked "fix 1"); **graduating the page from hidden** (its own
ship-time task — `contrast-sweep` both themes, `PAGES`, sitemap / nav / README,
version bump, damage-stakes-note question — see `air-side-sim.md` *Ship-time
gates*).

## Decisions waiting on the owner

- **Time-scaling scheme + factor** (§2) — the feel call; blocks nothing but shapes
  everything. Bring a first cut to the LAN preview.
- **Gain-model shape** — fixed adjustable load vs outdoor-temp-driven (the latter
  adds an OA-temp point).
- **What the space-temp slider becomes** (§3).
- **Latent / humidity as a state?** — today `RA_RH` is a fixed assumption;
  modeling zone humidity is a stretch. Owner's call whether it's in scope.
- **codebase-issues #197** — `.fbe-palette-btn:focus-visible` sits outside the
  consolidated FOCUS INDICATORS block (behaviour-correct; a deferred consolidation
  cleanup, not physics).

## Process notes that earned their keep

- **One lane → one worktree → one branch → one draft PR; owner reviews on GitHub
  and merges; never `gh pr merge` without an explicit "merge it."** #423 shipped
  as a draft the orchestrator verified independently — **driving the running
  page** (arrival cooling, the Y1/Y2 staging ladder with hysteresis, the
  setpoint-edit-propagation test through the wiresheet, HAND fan-cutoff) — before
  showing the owner. Tell every lane the brief is a hypothesis; the orchestrator
  decides on discrepancies.
- **The verification that mattered was driving the app, not the test suite.** CI
  green proves nothing *broke*; the runtime drive proved the sim *works*. For the
  physics session especially, verify by **watching the zone settle**, not by
  asserting a number.
- **A fresh worktree has no `node_modules`** → `ln -s
  /home/ehill/controlsfreak.dev/node_modules node_modules` (Playwright browsers
  live in a shared user cache). **Port 8000 is squatted** — copy
  `playwright.config.js` to a throwaway on a unique high port with
  `reuseExistingServer:false`, run **foreground**, delete before committing.
- **LAN preview for owner review:** serve the built `_site` bound to all
  interfaces on a high port (`python3 -m http.server <port> --directory _site
  --bind 0.0.0.0`), give him `http://192.168.8.123:<port>/simulators/ddc-workbench.html`;
  firewall the port (`sudo firewall-cmd --zone=FedoraServer --add-port=<port>/tcp`,
  a root step) if his device can't reach it. Ephemeral — dies with the session.
- **Concurrent sessions share the primary tree** — `git worktree add`, never
  `checkout` / branch-switch in the primary. Other sessions' worktrees may be
  present — leave them alone.

## One passing note

The Workbench is the flagship-in-progress, and the physics session is where it
becomes genuinely novel: **write (or load) an FBE control program and watch it
hold a real-feeling zone** — control logic a BMS programmer can verify, driving a
live thermal model. Honest readiness: the *FBE-drives-the-unit* half is **done
and verified**; the hard remaining half is **building zone thermal dynamics from
scratch** (a capacitance + a gain model + the air-side heat sink) and **picking a
time-scaling that feels right** — genuinely the hard part, which is why it earns
its own session. Design home: **`docs/air-side-sim.md`** (*Horizon*).
