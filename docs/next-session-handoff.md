# Session handoff — air-side FCU sim: PR-2 "DDC Workbench" build is next (2026-07-22)

> **Lifecycle:** written 2026-07-22, superseding the "the FBE DDC Workbench
> build is next" handoff — its **PR-1** (extract the shared editor + fix #196)
> shipped (**PR #422, merged**) and its Step 0 (land the wire-cache fix) is done.
> This file sets up **PR-2, the DDC Workbench build itself**, on the FCU sim.
> Retire it when the Workbench's two-view, FBE-driven runtime is built and the
> *physics* session (closed-loop dynamics + psychro tuning) begins — or the FBE
> direction is dropped. Durable design home is **`docs/air-side-sim.md`**; the
> full approved PR-2 implementation plan is
> **`~/.claude/plans/steady-crafting-yao.md`**; this file is only "where we are
> + next action."

## Read this first

**Every claim here is a hypothesis. The repo is the truth.** This arc is
owner-active and react-and-evolve: the plan below came out of a back-and-forth
with the owner, and those **owner decisions are the source of truth**, not any
inherited framing. Read `docs/air-side-sim.md` and the plan file before acting.

## Where things stand

`main` @ `b9e2270`, **v3.73.0**, clean tree.
Counts (at `b9e2270`): **40 education lessons · 34 content quizzes + 7 field
drills · 31 tools · 7 simulators surfaced** (the directory holds 8 `.html`: the
8th, `html/simulators/fcu-ddc.html`, is the **hidden** Workbench-in-progress —
`eleventyExcludeFromCollections: true` + `noindex: true`, out of nav / search /
sitemap / landing / PAGES / README, reachable at its URL. **PR-2 renames it to
`ddc-workbench.html`.**)

Shipped:
- **PR #420 (MERGED)** — the DX fan-coil **DDC-graphic mockup**, live-but-hidden
  at `.../simulators/fcu-ddc.html`. The reference point the Workbench is built on.
- **PR #421 (MERGED, `d0478bb`)** — the fbe wire-cache visibility fix + a
  regression spec (`tests/fbe-wires.spec.js`). Deleting one wire had blanked the
  rest (a render-cache `_lastCls` surviving `renderAll()`).
- **PR #422 (MERGED, `b9e2270`) — PR-1 of the Workbench arc.** Extracted the
  drag-wire editor out of `function-block-editor.html` into a shared module
  **`html/scripts/fbe-editor.js`** (`window.FBEEditor.createEditor(config)`
  factory), fixed **codebase-issues #196** (render/cache state decoupled from the
  wire *data* objects → a module-scoped `wireEls[w.id]` side map keyed by wire id,
  cleared in `renderAll` beside the block `els` map), moved the ~354-line `.fbe-*`
  CSS block into `styles.css` (load-bearing cache-bust → version 3.72.1 →
  **3.73.0**), migrated `function-block-editor.html` to consume the module (1358 →
  380 lines), and added `tests/fbe-editor.spec.js`. **Independently verified:**
  full local suite 778/0, CI green, `fbe-engine.js` byte-identical, #196 confirmed
  visually + geometrically. **#197 logged** — a `.fbe-palette-btn:focus-visible`
  rule landed outside the consolidated FOCUS INDICATORS block (behavior-correct;
  deferred consolidation cleanup).

The **"wires detach on delete"** the owner saw during PR-1 review was determined
**transient / client-side** — an exhaustive delete-sweep (every wire, every
example, main vs branch, exact endpoints via `getPointAtLength`) found **zero**
geometry detachment. Not a regression, not a systematic geometry defect.

## The factory contract PR-2 consumes (from PR-1)

```
window.FBEEditor.createEditor({
  engine = window.FBE,
  elements: { canvas, inner, palette, inspector, status, runButton },
  examples, initialExampleKey | initialGraph,
  dt = 0.1, autoloop = true, keyScope = document, onChange,
}) → { getGraph, setGraph, loadExample, clearCanvas, addBlock,
       tick(dt), step, refresh, setRunning, isRunning,
       onFullscreenChange(isFs), relayout, destroy }
```

- **`autoloop:false`** → the module creates no `setInterval`; the HOST drives
  `tick(dt)`. `refresh()` is a tick-free repaint of the shared graph. The
  Workbench uses this — the host owns the single ~10 Hz loop.
- **`loadExample`/`setGraph` REPLACE the graph reference** — the host must
  reassign + reindex on `onChange`.
- Engine (`fbe-engine.js`, `window.FBE`) is pure and **DO-NOT-MODIFY**: `ai`/
  `const` inject via `params.value`; `bi` via `params.state === true`; `ao`/`bo`/
  `readout` are sinks read via `block.in.IN` (guard `.in === {}` before first tick).

## Next action — PR-2: the DDC Workbench

Full approved plan: **`~/.claude/plans/steady-crafting-yao.md`**. Design home:
**`docs/air-side-sim.md`**. The seam + the load-bearing invariants:

**Architecture (unit-agnostic seam — owner steer: "don't tunnel-vision on the
FCU; AHUs later are a config + physics + programs + graphic swap, not a rewrite"
— but NO speculative plugin framework):**
- **Shared editor module** (PR-1, done) — both the live editor page and the
  Workbench consume it.
- **Unit-agnostic shell** (in the renamed page) — two tabs, the single host tick
  loop, HAND/AUTO, the lazy editor mount, and one **generic binding driver**
  walking a `POINTS` config. Contains **no** FCU-specific identifier.
- **FCU unit plug-in** (same file, `UNIT: FCU` comment banners) — the physics
  `update()`, the `POINTS` config, the sample `PROGRAMS`, the `fcu-*` graphic.
  Extract to `/scripts/units/fcu.js` only when a 2nd unit lands.

**Mechanics:**
- `git mv html/simulators/fcu-ddc.html html/simulators/ddc-workbench.html`
  (keeps history + the hidden-page exemptions; **no canonical** → auto-out of
  sitemap / search-index / nav-card / `tests/pages.js` / README). **No**
  `LEGACY_TOOL_REDIRECTS` entry (zero inbound links). Prefixes: shell **`ddcw-*`**,
  unit graphic keeps **`fcu-*`**. *(Preview URL changes to
  `.../simulators/ddc-workbench.html`.)*
- **Two-tab `.tool-card`** (`.tabs.tabs-flush`, Unit | Wiresheet); a persistent
  `#ddcw-statusbar` (live IO chips + running-program name + HAND/AUTO toggle) sits
  **outside** the panes, inside the card. **Lazy-mount** the editor on first
  Wiresheet open (net-new pattern — mirror `search.js:98` built-flag + in-flight
  guard): show pane → `ensureEditor()` mounts `createEditor({ graph,
  autoloop:false, examples:unit.programs, onGraphChange })` on the host div →
  `editor.refresh()`.
- **Binding contract (load-bearing invariant): point id === seed FBE-block id ===
  the IO block id the sample programs author.** Generic `bindingTick(graph, dt,
  mode)`: write sensors → `byId[block].params.value|state`; write params;
  `FBE.tick(graph,dt)`; if AUTO, read actuators ← `byId[block].in.IN` (guard
  `.in==={}`). The graph ticks in **both** modes (HAND shows what the program
  *would* command vs. the hand override). `byId` rebuilt by `reindex(graph)` on
  every graph swap/structural edit.
- **Host loop (sole ticker, ~10 Hz):** `bindingTick → unit.update(plant,dt) →
  unit.renderUnit(plant) → renderIoControls → (if editor built & wiresheet
  visible) editor.refresh()`. The editor is **never** the ticker.
- **HAND/AUTO:** AUTO actuator sliders read-only, re-rendered each tick to show
  the graph's command; HAND enables them (write `plant.actuators` directly).
  **Bumpless** on AUTO→HAND (seed sliders from current `plant.actuators`). Sensor
  (space-temp) slider always live.

**FCU plug-in** (interface `{ id, prefix:'fcu', points, programs, defaultProgram,
update(plant,dt), renderUnit(plant), onResize(plant,fs), conditions }`):
- **`update()` refactor (`fcu-ddc:589-683`):** read a `plant` object, not the DOM.
  `zoneT = plant.sensors['space-temp']`, `fanPct = plant.actuators['fan-speed']`;
  **`stage = plant.actuators.y2 ? 2 : (plant.actuators.y1 ? 1 : 0)`** (Y2-implies-
  Y1 interlock, FCU-local); **`fanOn = plant.actuators['fan-enable'] && fanPct>0`**
  (fan-enable is now a **real BO gate**, not `speed>0`). Psychro math preserved
  verbatim; `stage` still indexes `STAGE_QSENS`/`STAGE_QLAT`. Promote `dat`/`eat`/
  `deltaT`/`coilLeaveT`/`verdict`/`fanFrac` onto `plant.derived`; `SETPOINT=72` →
  `plant.params['cooling-setpoint']`. Split the DOM painting out of `update()` into
  `renderUnit(plant)`. `fault` stays **observe-only** (not a point). rAF loops read
  `plant.anim.fanFrac`.
- **POINTS (8):** AI `space-temp`, `dat`; AO `fan-speed`; BO `fan-enable`, `y1`,
  `y2`; param `cooling-setpoint`, `deadband`. Each point id === its seed block id.
- **PROGRAMS (default `cool-2stage`, loads in AUTO):** `cool-2stage` (space-temp
  vs a `cooling-setpoint` const ± `deadband` → thresholds → `gt`/`lt` → two `sr`
  latches → `or`/`and` interlock → `y1`/`y2` `bo`; fan enabled on any cooling call;
  stage 2 on a wider error), `cool-1stage` (drop stage 2), `cool-2stage-fanon`
  (continuous fan via a `bi state:true`).
- **HAND mapping:** existing `#fcu-fan-slider` → `fan-speed`; `data-stage 0/1/2`
  buttons → (y1,y2) = (F,F)/(T,F)/(T,T); a new toggle → `fan-enable`;
  `#fcu-zone-slider` → `space-temp` (always hand).

**The loop stays OPEN this session** — space temp is a hand-nudged **INPUT**; NO
zone dynamics (that's the next, physics session). Do **not** "fix" it by bolting
on dynamics here.

**Resolved decisions worth an eye:** the compressor stays **two BOs (Y1/Y2)**,
not a single 0–100 modulating `cool-cmd` (rejected — deviates from the owner's
point spec and is *less* field-accurate for a staged DX unit; **flag if
modulating capacity is wanted instead**). Faults stay observe-only. **Not being
built this session:** a unit-selector UI / registry / plugin loader, a generalized
SVG engine, a pluggable physics interface, zone dynamics.

## Verification (PR-2)

- Build **omits** `ddc-workbench` from `_site/sitemap.xml`, `search-index.json`,
  and `simulators/index.html`; page has `robots noindex`, no canonical. Full
  `npm test` green (the rename broke nothing).
- LAN preview: (a) on arrival the default program runs in **AUTO** and the Unit
  tab shows live IO with the wiresheet never opened; (b) nudging space-temp up
  stages **Y1 (~75.6)** then **Y2 (~77.6)**, the fan holding on, DAT dropping and
  ΔT widening, and space temp does **not** self-regulate (loop open); (c) opening
  Wiresheet builds the editor **once** and edits there react on the Unit graphic
  (shared graph); (d) AUTO sliders read-only/tracking, HAND takes over bumplessly,
  `fan-enable:false` with `fan-speed:100` physically stops the fan; (e) fullscreen
  lays out wires correctly incl. first-build-while-fullscreen.

## Process notes that earned their keep

- **Delegate builds to worktree-isolated subagents, one draft PR each; the
  orchestrator verifies independently before showing the owner; never
  auto-merge.** Tell every lane the brief is a hypothesis and correcting it is
  wanted.
- **`git worktree add -b <branch> origin/main` makes the new branch TRACK
  `origin/main`** — a footgun where a bare `git push` targets `main`. Unset it
  (`git branch --unset-upstream`) and push with `git push -u origin <branch>`.
  The worktree also needs `ln -s <primary>/node_modules` to run tests.
- **Compound `git commit … && git push` with an inline heredoc can be blocked by
  the auto-mode classifier.** Split into atomic steps: write the message to a
  file, `git add <paths>`, `git commit -F <file>`, then `git push` on its own.
- **Concurrent sessions share the primary tree** — use `git worktree add`, never
  `checkout` / branch-switch in the primary tree. Another session (`c0feb607`)
  currently holds a `feat/fcu-ddc-mockup` worktree + a detached one — leave them
  alone.
- **Live LAN preview** (owner reviews on his devices): serve the built `_site`
  with `eleventy --serve --port=41573` from a **detached** worktree at the branch
  tip (bind is `*:PORT`); firewall port **41573** must be open
  (`sudo firewall-cmd --zone=FedoraServer --add-port=41573/tcp`, runtime-only).
  Give him the **IPv4** URL (`http://192.168.8.123:41573/…`). Ephemeral — dies
  with the session that starts it.
- **Local Playwright:** port 8000 is squatted on this box; use a throwaway config
  on a unique high port with `reuseExistingServer:false`, foreground, `NODE_PATH`
  at the primary's `node_modules` + `colorScheme: 'dark'` for scratchpad capture.
  CI's full `npm test` is the real gate.

## Decisions waiting / deferred

- **Upper-left composition of the Unit graphic — parked (owner: "no fix" for
  now).** Return-duct box crowds the EAT/ΔT/DAT badges; eventual "fix 1" =
  re-route the return so it drops into the cabinet *top*.
- **Two tiny mockup items** (non-blocking): the `−0.6 °F` ΔT shown on a
  fan-running fault (honest fan-heat artifact, or clamp the display to ≥0); and
  `role="img"` on the graphic SVG possibly suppressing SR announcement of the
  drill-down `<a>` links.
- **codebase-issues #197** (fbe `:focus-visible` consolidation) — deferred cleanup.
- **Next (physics) session:** closed-loop dynamics (zone-temp-as-state + a time
  step), psychro tuning, the quasi-static-vs-tick decision. Also deferred: mobile
  view, visible sensors, zone thermographics, selectable unit type.
