# Session handoff — air-side FCU sim: the FBE "DDC Workbench" build is next (2026-07-22)

> **Lifecycle:** written 2026-07-22, superseding the "increment 1 (ducts &
> space) is next" handoff — that increment shipped (PR #420, merged) and its
> §1 was removed. This file sets up the **all-FBE-work session** on the FCU
> sim. Retire it when the DDC Workbench's FBE layer is built and the *physics*
> session (dynamics + psychro tuning) begins — or the FBE direction is dropped.
> Durable design home is **`docs/air-side-sim.md`**; this file is only "where
> we are + next action."

## Read this first

**Every claim here is a hypothesis. The repo is the truth.** This session was
owner-active and react-and-evolve: the FCU mockup was iterated live against a
LAN preview, and the FBE plan below came out of a back-and-forth with the owner
this session — those **owner decisions are the source of truth**, not any
inherited framing. Read `docs/air-side-sim.md` before acting.

## Where things stand

`main` @ `2230d4a`, **v3.72.1**, clean tree. (Measurements below cite `2230d4a`,
the commit they were taken at — deliberate, not stale.)
Counts: **40 education lessons · 34 content quizzes + 7 field drills · 31 tools ·
7 simulators surfaced** (the directory holds 8 `.html`: the 8th,
`html/simulators/fcu-ddc.html`, is the **hidden** DDC mockup —
`eleventyExcludeFromCollections: true` + `noindex: true`, so it's out of nav /
search / sitemap / landing but reachable at its URL).

Shipped this session:
- **PR #420 (MERGED)** — the DX fan-coil **DDC-graphic mockup** graduated from
  branch to `main`, **live but hidden** at
  `https://controlsfreak.dev/simulators/fcu-ddc.html`. It carries: page-local
  rAF chevron airflow that crosses the open cabinet (no flow-engine dependency),
  filled exterior ducts, air recolor across the coil, the compressor-LED fault
  tell, a quasi-static psychro model (`Psychro.invertProcess`), presets /
  sliders / verdict pill, fullscreen, in-graphic keyboard-reachable SVG-`<a>`
  drill-downs (coil→refrigerant-loop, fan→vfd-mock), and a fan-heat note. Owner
  reviewed it live and merged it as a **reference point** before the FBE work.
  Upper-left composition (duct/badge crowding) was **parked by owner decision**
  — see *Decisions waiting*.
- **PR #421 (OPEN, DRAFT)** — `fbe: reset wire class cache so re-rendered wires
  stay visible`. A **live production bug** in the Function-Block Editor
  (`html/simulators/function-block-editor.html`): deleting one wire made all
  others vanish, and adding a wire blanked the previous one. Root cause was a
  render-cache (`_lastCls`) surviving `renderAll()` so rebuilt wire `<path>`s
  kept the colourless base class → invisible (elements were always present; the
  data model was correct). One-line fix + a regression spec
  (`tests/fbe-wires.spec.js`). **Verified independently this session** (the guard
  passes with the fix, fails without it; 25 fbe-engine tests still green).
  **Awaiting owner review — not merged.**

## Corrections to carry — do not rediscover these

1. **`eleventyExcludeFromCollections` does NOT hide a page from every CI gate.**
   It keeps a page out of collections (nav / search / sitemap), but
   `tests/landing-completeness.spec.js` enumerates **source files** on the
   filesystem (`html/<section>/*.html`), so the hidden mockup tripped its
   "every page has a landing card" assertion. Fixed in PR #420 by making that
   test **skip `eleventyExcludeFromCollections` pages** (it targets *accidental*
   orphans; an intentionally-excluded page absent from the sitemap isn't one).
   **Implication for this session:** if you rename/create a hidden Workbench
   page, that exemption keys off the **frontmatter, not the filename**, so it
   still applies — but re-run `npm test` before assuming any new hidden page is
   green.
2. **The FBE stack is bigger than the prior handoff implied — reuse it, don't
   rebuild.** Verified on `2230d4a`: `html/scripts/fbe-engine.js` is a tick
   engine with a full block library (Boolean AND/OR/XOR/NOT/SR-LATCH,
   comparators, math, TON/TOF, SELECT/LIMIT, PID, and **I/O blocks**: ANALOG
   IN/OUT, BINARY IN/OUT, CONSTANT, READOUT). There is already a working
   **`html/simulators/function-block-editor.html`** (drag-wire editor with
   loadable example programs via `#fbe-examples` / `data-example="…"`), plus
   `controller-wiring.html`, `staging-sequencer.html`, and
   `html/scripts/wiring-engine.js`. So "the FBE work" is mostly **wiring the FCU
   sim to infrastructure that exists**, not building an engine or editor.
   ⚠️ The editor's logic is **inline in `function-block-editor.html`**, not a
   shared module — embedding it in the Workbench likely means **extracting a
   reusable editor module** into `html/scripts/` (or making the Workbench the
   generalized editor). That extraction is the first real architectural task.

## The work, in order — ALL the FBE work, one focused session

**Owner decision (2026-07-22): do ALL the FBE work in one session so the *next*
session is pure sim physics — "get the bouncing out of the way," then focus
uninterrupted on psychro/dynamics.** Everything below stays on the ONE FCU sim.

### 0. Land PR #421 first (the FBE editor is the tool you're about to build on)

The wire-visibility fix is verified and open as a draft. Get owner sign-off and
merge it **before** building the Workbench — you'll be embedding this editor, so
it must be correct first. (Owner already flagged it urgent; it's a live regression.)

### 1. Reframe `fcu-ddc.html` into the "DDC Workbench Sim" — model A

**Owner decision (2026-07-22): one page, one runtime, two tabbed views** — a
**Unit** view (the current DDC graphic) and a **Wiresheet** view (the FBE
editor). The editor view is **lazy-built** (nothing renders until you open its
tab) so the Unit tab stays light. This is "model A" (one runtime, two views), NOT
two separate documents synced over a channel — the owner rejected the
cross-document approach as fragile. Rebrand the combined artifact **"DDC
Workbench Sim."**
- Renaming the file/route (`fcu-ddc.html` → e.g. `ddc-workbench.html`) is a
  build-time call and **low-cost while hidden** (no inbound links; keep
  `eleventyExcludeFromCollections` + `noindex`; the landing-completeness
  exemption follows the frontmatter). If renamed, add the old path to
  `LEGACY_TOOL_REDIRECTS` in `src/worker.js` only if you think anyone bookmarked
  it — probably unnecessary.
- ⚠️ Keep it a **hidden mockup** throughout (`eleventyExcludeFromCollections` +
  `noindex`, no `canonical`, not in PAGES/sitemap/nav/README, no version-bump-
  for-release). It's a reference point, not a shipped page.

### 2. Data-driven IO point surface

**Owner decision (2026-07-22): the point list is fine for now, but build it so
it's a config change, not a rewrite — bigger units are coming.** Declare the
FCU's points as **data** (a point-config object), not hardcoded, so a larger
unit is a config edit. Starting set (cooling-only DX — owner did not add a
reversing valve):
- **AI:** Space Temp, Discharge Air Temp (DAT).
- **AO:** Supply-Fan Speed (0–100 %).
- **BO:** Fan Enable, Compressor Stage 1 (Y1), Compressor Stage 2 (Y2).
- **Setpoints/params:** Cooling Setpoint, Deadband.

These map onto the FBE I/O blocks (ANALOG IN reads a sensor, ANALOG/BINARY OUT
drives an actuator).

### 3. Embed the editor + sample programs + the Unit-tab affordance

- Embed the wiresheet editor on the **Wiresheet** tab (reuse / extract from
  `function-block-editor.html` — see correction #2).
- Ship a few **sample programs** for users who don't want to author their own;
  selecting one **loads its logic onto the wiresheet**. (The existing editor's
  `#fbe-examples` loadable-program pattern is the model to reuse.)
- The **Unit** tab's control affordance shows the **live IO values + the running
  program's name** — a compact status, not the whole editor.

### 4. Wire FBE ↔ sim each tick + manual HAND/AUTO override

- Each tick: read the sim's sensors into the FBE graph's ANALOG/BINARY IN
  blocks, `FBE.tick(graph, dt)`, apply the graph's OUT blocks to the sim's
  actuators. `fbe-engine.js` exposes `window.FBE` with a `tick(graph, dt)`
  evaluator (Kahn topo-sort; PID/timers/latches stateful, comparators
  stateless) — verified present on `2230d4a`; **re-check the exact API surface
  in the file header before wiring** (don't cite line numbers from memory).
- **Manual HAND/AUTO override:** in HAND you drive AO/BO by hand; in AUTO the
  FBE graph drives them. Owner's "commission-by-hand" affordance.

### 5. ⚠️ The loop stays OPEN this session — confirmed and intended

**Owner decision (2026-07-22): closed-loop dynamics are the NEXT session, not
this one.** So in this session the FBE program **runs and drives the unit** and
you watch the air state (ΔT/DAT) react — but the **zone temp stays an INPUT you
nudge by hand** to test the control's response. It will NOT self-regulate until
the physics session adds zone-temp-as-a-state + a time step. This is a
deliberate split (owner and orchestrator both confirmed it), not an oversight —
do not "fix" it by bolting on dynamics here.

**Explicitly deferred to the NEXT (physics) session — do not carry as open work
here:** closed-loop **dynamics** (zone-temp-as-state, time-step), **psychro
tuning**, and the quasi-static-vs-tick decision. Also still deferred (from the
prior handoff, owner-confirmed): mobile view, visible sensors, zone
thermographics, selectable unit type.

## Decisions waiting on the owner

- **Upper-left composition of the Unit graphic — parked, not dropped (owner
  decision 2026-07-22).** The return-duct box crowds the EAT/ΔT/DAT badges and
  the cabinet corner. Owner said **"no fix" for now** ("I build similar boxes in
  my graphics"; canvas headroom shrinks with bigger units), and named the
  eventual fix as **"fix 1" — re-route the return so it drops into the cabinet
  *top*** instead of wrapping the whole left side. Revisit in a later
  depiction pass, not this one.
- **Editor: generalize `function-block-editor.html` vs. a new FCU control page?**
  Owner leaned toward embedding the existing editor (model A). The reuse-vs-
  reimplement call is a build-time decision (correction #2 flags the inline-code
  extraction cost). Not blocking.
- **Two tiny open items from the mockup** (non-blocking, whenever): the
  `−0.6 °F` ΔT shown on a fan-running fault (honest fan-heat artifact, or clamp
  the display to ≥0), and `role="img"` on the graphic SVG possibly suppressing
  screen-reader announcement of the drill-down `<a>` links.

## Process notes that earned their keep

- **Delegate builds to worktree-isolated subagents, one draft PR each; the
  orchestrator verifies independently before showing the owner.** This session:
  the FCU depiction agent and the FBE-fix agent both self-reported clean; the
  orchestrator re-verified with its own screenshots / test runs / a
  revert-check, and the reports held — but the discipline is what makes "verified"
  mean something. Tell every lane the brief is a hypothesis.
- **`git worktree add -b <branch> origin/main` sets the new branch to TRACK
  `origin/main`** — a footgun where a bare `git push` targets `main`. Unset the
  upstream (`git branch --unset-upstream`) and have the lane push with
  `git push -u origin <branch>`.
- **Compound `git commit … && git push` with an inline heredoc can be blocked by
  the auto-mode classifier.** Split into atomic steps: write the message to a
  file, `git add <paths>`, `git commit -F <file>`, then `git push` on its own.
- **Live LAN preview** (owner reviews on his devices): serve the built `_site`
  with `eleventy --serve --port=41573` from a **detached** worktree at the branch
  tip (bind is `*:PORT`); the owner must have firewall port **41573** open
  (`sudo firewall-cmd --zone=FedoraServer --add-port=41573/tcp`, runtime-only,
  clears on reboot). Give him the **IPv4** URL (`http://192.168.8.123:41573/…`).
  The server is ephemeral — it dies with the session that starts it.
- **Local Playwright:** port 8000 is squatted on this box; use a throwaway
  config on a unique high port, foreground, `NODE_PATH` pointed at the primary's
  `node_modules` for scratchpad capture scripts, `colorScheme: 'dark'` on the
  context for dark screenshots. CI's full `npm test` is the real gate.

## One passing note

The FCU sim is the flagship-in-progress, and the FBE session is where it becomes
genuinely novel — a **DDC Workbench** where you load or *author* a control
program on a live wiresheet and watch it drive a real-feeling unit, with the
control logic verifiable by an actual BMS programmer. Honest readiness: the
depiction is settled and merged; the FBE runtime, block library, and a working
editor **already exist** (the reuse story is strong); the near-term cost is the
**editor-extraction + two-view plumbing + IO surface + FBE↔sim wiring**, all on
one page with the loop deliberately open. Closed-loop physics is the session
after. Design home: **`docs/air-side-sim.md`**.
