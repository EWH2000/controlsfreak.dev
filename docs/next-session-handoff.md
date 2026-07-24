# Session handoff — closed-loop physics is live; polish + public decision next (2026-07-24)

> **Lifecycle:** written 2026-07-24, superseding the "physics (closed-loop)
> session is next" handoff — that whole arc shipped (**PR #425**, merged) and its
> sections are removed. This file sets up the **polish arc**: fix the browser
> lag, clean up the look, then decide whether the DDC Workbench goes public.
> Retire it when the page **graduates from hidden** (or the owner parks the
> polish arc). Durable design home: **`docs/air-side-sim.md`** (*Horizon*).
> This file is only "where we are + next action."

## Read this first

**Every claim here is a hypothesis. The repo is the truth.** The predecessor
brief handed the build lane a **dimensionally wrong** Euler formula
(`(Q_gain − Q_cool)/C_zone × dt` with loads in Btu/**hour** and `dt` in
**seconds** — missing the `/3600`); the lane caught it and fixed it, but a lane
that trusted the brief would have shipped a zone that integrated ~3600× too
fast. Tell every lane the brief is a hypothesis, correcting it is wanted, and
the orchestrator — not the lane — decides on a discrepancy. **The verification
that mattered was driving the running page, not CI** (green proved nothing
broke; the drive caught a frozen-on-arrival default that read as broken — §
Corrections).

## Where things stand

`main` @ `3cd2538`, **v3.73.0**, clean tree. No open PRs. (Line numbers below
cite `3cd2538`, the commit they were taken at — deliberate, not stale.)
Counts: **40 education lessons · 34 content quizzes + 7 field drills · 31 tools ·
8 simulators** — the 8th, `html/simulators/ddc-workbench.html`, is still the
**hidden** Workbench (`eleventyExcludeFromCollections: true` L5 + `noindex: true`
L6; out of nav / search / sitemap / landing / `tests/pages.js` / README).

**Shipped this arc — PR #425 (merged `3cd2538`), three commits:**
- `a8574a6` — **closed the loop**: `plant.zoneT` is now an integrated real zone
  temperature; the coil solve reads the *actual* zone, the program reads a
  *sensed* value, and a **sensor override** (`plant.override.spaceTemp`, forced
  via a box+toggle) lets you hand the program a wrong number while the real zone
  drifts away — the real-vs-sensed commissioning teaching moment. Hybrid gain
  `Q_gain = UA_ENV*(T_oa − zoneT) + Q_internal` (envelope + a live load knob, plus
  an OA-temp control). `Q_cool` via `Psychro.computeProcess(...).qSens` (magnitude,
  sensible-only) to the **post-fan** `datT`. A speed slider (1–60×) scales one
  `dtSim` that drives **both** the zone integrator and `FBE.tick`. RH-ready seam
  at `zoneInletState()` (`:1169`).
- `1b9bac2` — **working-baseline retune** (orchestrator, from driving the page):
  `C_ZONE` 800→**200** (`:1060`), default OA 90→**80** (`:1063` region). The
  as-built defaults left arrival frozen/creeping the wrong way; retuned so stage 1
  pulls the zone to setpoint and cycles.
- `f9f2576` — **first-order coil/DAT response lag** (`COIL_TAU=30` `:1064`;
  `coilLeaveTarget` vs lagged `plant.coilLeaveT` at `:1196`–`:1222`): DAT ramps
  instead of stepping, cooling ramps in, and residual cooling persists after the
  compressor stops. Verified by driving at 1× (max 0.2 °F/500ms step).

**All physics constants are labelled `TUNE BY FEEL` (`:1047`–`:1068`):** `C_ZONE`
200, `UA_ENV` 300 (`:1061`), `COIL_TAU` 30, `SPEED_DEF` 20 (`:1065`),
`MAX_DT_SIM` 5 (`:1068`). These are tune-in-place — **no code change needed to
recommission the feel.**

## Corrections carried out of the physics build — do not rediscover

1. **Delivered cooling is `computeProcess(...).qSens` to `datT`, NOT
   `cfm × 1.08 × (zoneT − coilLeaveT)`.** The engine has no `1.08` constant; it
   works from live specific volume (`psychro-engine.js` `computeProcess`
   ~`:199`). And it must measure to the **post-fan** `datT` (the fan's 0.6 °F
   re-enters the zone), not `coilLeaveT`, or cooling is over-counted. This is how
   the shipped code does it (`:1222` onward).
2. **The Euler step needs `/3600`** (Btu/**hour** loads, `dt` in **seconds**) —
   shipped at `:1220`-area. The predecessor brief dropped it.
3. **"Recovery in a few seconds at 20×" was unachievable** at any realistic zone
   time constant — a real zone moves in minutes. The speed slider (up to ~50×
   effective; see minor item) is how you fast-forward; 1× is real building time.

## The work, in order — the polish arc

**Owner plan (2026-07-24): lag → cleanup → maybe public. Deliberate pace —**
*"Most of my adds to the site have been public so quick, it's nice to take my
time with one."* Feel-tuning may continue along the way; the constants above are
tune-in-place.

### 1. Fix the browser lag (owner's first task)

**Owner-observed 2026-07-24:** intermittent browser lag, "nothing crazy,"
noticeable mainly through the gutter animations, and it **settles once the page
has been loaded a little.** Owner is on a 12th-gen i7 and worries about low-end
field laptops.

- **⚠️ Cause is a HYPOTHESIS, not measured:** likely the gutter `schematic-bg`
  draw-in animations + the workbench's own rAF loops (fan blade, chevron travel)
  + the 10 Hz physics `setInterval` all competing on first paint. "Settles after
  load" is consistent with the `schematic-bg` draw-in completing. **Profile it
  first** (DevTools performance trace on a throttled CPU) before choosing a fix —
  don't assume the cause.
- **Levers (owner's steer + options):** force **fullscreen-from-start** (the
  fullscreen tool mode drops the gutter motifs entirely — owner floated this);
  or gate the workbench rAF loops on `document.hidden` / an IntersectionObserver;
  or lean harder on the `prefers-reduced-motion` path. The gutter
  `schematic-bg` is already hidden below 1240px and on reduced-motion.

### 2. Cleanup — make it look nicer (visual, NOT a logic rewrite)

Two owner-named problems:

- **Text extending outside boxes.** ⚠️ **Locations UNVERIFIED** — owner-observed,
  not yet pinpointed. Sweep with **full-page screenshots** of the page in both
  themes and both unit systems (the driver pattern used this session:
  `colorScheme` context + read the built page on a throwaway high port).
  `npm run screenshots` (`tests/screenshot-diagrams.mjs`) covers *diagram SVGs*,
  which is a subset — the workbench UI overflow needs whole-page shots.
- **Jumbled / messy sample-program layout** — the "uploaded WPT that lands all
  jumbled" feeling that makes the control logic hard to verify. **Grounded:** the
  FBE sample programs (`FCU_PROGRAMS` `:1664`) place blocks by **explicit `x/y`
  coordinates** (e.g. `space-temp` at `x:20,y:20`, `:1667`), so tidying is
  primarily **repositioning those coordinates** so wires don't cross/overlap.
  `html/scripts/fbe-editor.js` also has layout-related logic (grep `layout` — a
  few hits) worth a look, but the block placement itself is data. **Owner wants
  to review the existing programs first** and is interested in that review.

**Explicitly declined this arc — do not carry as open work:**
- **Rewriting the FBE programs from scratch** — owner deferred: *"more function
  block work on a Friday night after doing it for real all week isn't
  appealing."* Cleanup = tidy layout + fix overflow, not re-author logic.
- **Feel-tuning as a blocking task** — it's ongoing/owner-driven, tune-in-place,
  no code.
- **Future AHU + economizer** (the OA-temp point is already there for it) and
  **zone-RH modelling** (the `zoneInletState` seam is in) — backlog,
  `air-side-sim.md`.

### 3. Evaluate going public (graduate from hidden) — only after 1 + 2

Its own ship task, **gated on the owner's call** — and on an open scope decision
(below). When it happens, the ship gates (`air-side-sim.md` *Ship-time gates*):
the blocking `contrast-sweep` in **both themes**, add to `tests/pages.js` +
sitemap/nav/README, a version bump, and the damage-stakes-note question. Flip
`eleventyExcludeFromCollections`/`noindex` off (`:5`-`:6`).

## Decisions waiting on the owner

- **Launch scope — FCU-only vs. build more units first?** Owner undecided
  (*"I'm not sure if I want to launch with just FCU or build more"*). Blocks the
  go-public timing, nothing else. The shell is unit-generic (the seam held —
  no `fcu`/`fan`/`stage` id leaks into the shell), so a second unit is additive.
- **Minor: the speed slider's top end is dead.** `MAX_DT_SIM = 5` (`:1068`) caps
  the effective clock at 50×, but the slider goes to 60× — so ~51–60× all feel
  identical. Cosmetic; lift `MAX_DT_SIM` to 6 (still Euler-stable) or cap the
  slider at 50 whenever it's touched. Not blocking.

## Process notes that earned their keep

- **Drive the running page to verify — CI green ≠ works.** The frozen-arrival
  tuning passed CI and the lane's own smoke; only sampling DOM readouts over wall
  time caught it. For this page, verify by **watching the zone move / DAT ramp**,
  not by asserting a number.
- **One lane → one worktree → one branch → one draft PR; orchestrator drives the
  page and verifies before showing the owner; never `gh pr merge` without an
  explicit "merge it."** #425 was built by a lane, retuned + lag-fixed by the
  orchestrator on the same branch, verified by driving, then merged on the
  owner's explicit go-ahead.
- **Fresh worktree has no `node_modules`** → `ln -s
  /home/ehill/controlsfreak.dev/node_modules node_modules`. Serve the built
  `_site` on a **unique high port** (8000–8099 are held); Playwright headless
  needs `colorScheme: 'dark'` on the context and an init-script forcing
  `document.hidden = false` or the `setInterval` won't tick.
- **⚠️ `pkill -f "http.server <port>"` self-matches** — the pkill's own shell
  command line contains the pattern, so it kills itself (exit 144). Use the
  bracket trick (`[h]ttp.server`) or just serve on a fresh port. **Foreground
  `sleep` is also blocked** in this environment (exit 144) — use `curl --retry`
  or a background job, not `sleep`.
- **LAN preview for owner review:** `python3 -m http.server <port> --directory
  _site --bind 0.0.0.0`, give `http://192.168.8.123:<port>/simulators/ddc-workbench.html`;
  if unreachable, the firewall port is the fix (a **root** step:
  `sudo firewall-cmd --zone=FedoraServer --add-port=<port>/tcp`). Ephemeral.

## One passing note

The Workbench is now genuinely what it set out to be: **write (or load) an FBE
control program and watch it hold a real-feeling zone** — control logic a BMS
programmer can verify, driving a live thermal model, with a real-vs-sensed
override that teaches a commissioning hazard. The physics is **done and
verified**. What's left is not more physics — it's **polish** (lag, overflow,
program legibility) and a **product decision** (FCU-only vs. more, then public).
The owner is deliberately taking his time here, and that's the right call for
the flagship. Design home: **`docs/air-side-sim.md`** (*Horizon*).
