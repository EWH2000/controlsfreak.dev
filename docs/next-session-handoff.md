# Session handoff — INDEPENDENT VERIFICATION REQUESTED (2026-07-25)

> **Lifecycle:** written 2026-07-25, superseding the 2026-07-24 "static-print
> background is next" handoff. That arc was **parked by the owner** — see
> *§0 What changed*. This file's job is different from a normal handoff: it is a
> **verification request**, not a work brief. Retire it when the owner has
> merged or closed PR #430 and ruled on the DDC Workbench decisions.

## 0 — Read this first

**The owner has frozen everything pending an independent second pass.** His
words, 2026-07-25:

> *"before anything merges or I approve anything, I want you to hand off to an
> independent verification session… I just want to be sure everything is right
> here and gets a second pass."*

So:

- **Do not merge PR #430.** Do not mark it ready for review. Do not push to its
  branch unless a verification finding requires it, and say so first.
- **Do not act on the DDC Workbench decisions.** Nothing there has shipped;
  eight design questions are waiting on the owner and must not be pre-empted.
- **Do not treat any number in this file as established.** Every claim below is
  a hypothesis. The repo is the truth.

**Why this exists, stated plainly.** The producing session self-corrected
repeatedly — sometimes catching itself, sometimes being caught by its own
verification lanes. The owner noticed:

> *"good work but you caught yourself a lot, and it looks like I should have
> caught some things earlier on too."*

That is a fair read and it is the reason for this pass. §2 is a register of
every place the producing session was demonstrably wrong, because **that is the
risk map** — weight verification toward those areas rather than spreading effort
evenly.

**Recommended entry point:** `/verify-handoff` against this file. It will
extract the claims in §4–§9 and bucket each as VERIFIED / CORRECTED /
UNVERIFIABLE. Everything needed is in the repo; you do not need the producing
session.

**The tmux question is CLOSED — do not re-investigate.** The producing session
appeared missing on his terminal because `tmux a` attached him to
`AirSimScope-5` (created Jul 20, a plain `bash` pane on pts/1) while the Claude
session was window `0:claude` in `WebDev-0` on pts/2. Both sessions were marked
attached, so `tmux a` picked the most-recently-used one. `tmux a -t WebDev-0`
reaches it directly. Nothing was wrong.

## 0b — This session's mandate is four things, not one

The owner scoped the next session (this one) explicitly, 2026-07-25:

> *"next session… will be dedicated to verification, cleanup, lessons learned,
> and getting me back on track."*

1. **Verification** — §2–§9 below. The reason the freeze exists. Do this first;
   the rest is worthless if a claim collapses.
2. **Cleanup** — host process hygiene, see §12. Deferred deliberately: *"The ol
   AMD6300 can handle it a little longer."* He also wants a **deeper look at
   background processes and how the server is hosted on this box**, which is
   broader than reaping strays.
3. **Lessons learned** — §2 is the raw material. The two patterns worth
   generalising are named there: *a stated remedy is narrower than its mechanism
   more often than it is wrong*, and *a later fix can silently obsolete an
   earlier fix's justification*. Both produced real false records this arc.
4. **Getting back on track** — the DDC Workbench buildout (§10, §11), which is
   the thread a small amount of browser lag interrupted.

## 1 — Exact state to pin against

| | |
|---|---|
| `main` | **`db88b7a`** — clean tree, `package.json` **3.74.1** |
| Open PR | **#430**, branch `issue-202/education-flow-static`, head **`702b616`** |
| PR state | **draft**, 11 commits, `+1228 / −215` across 24 files |
| PR CI | GitHub Actions `test` **pass**; `Workers Builds: controlsfreak` **pass** |
| Branch version | **3.74.2** (patch bump, both `package.json` and `package-lock.json`) |

⚠️ **The working tree at `/home/ehill/controlsfreak.dev` is shared with other
live sessions, and this branch is checked out in a `.claude/worktrees/` worktree.
Never `git checkout` in the shared tree.** Read branch content with
`gh pr diff 430`, or
`git fetch origin issue-202/education-flow-static && git archive origin/issue-202/education-flow-static | tar -x -C <scratch>`.

⚠️ **`npm test` cannot run as-is on this box.** `playwright.config.js`'s
webServer binds `:8000`, which the household stack holds →
`OSError: [Errno 98] Address already in use`. Use a throwaway config **at the
repo/worktree root** (Playwright resolves `require` against the config's own
directory) on a 9400+ port, and delete it after. Ports `8000`–`8006`, `8080`,
`8099` are listening; check with `ss -ltn` before picking.

⚠️ **`sudo` is unavailable to the agent.** If a step needs root, stop and hand
the owner the exact commands.

### ⚠️ Read every CPU number in this file against the host that produced it

`command.home.arpa` is an **AMD FX-6300** — a 2012 Piledriver, 6 cores (3
modules), 3.5 GHz, 27 GB RAM. Single-thread performance is a fraction of a
modern desktop or laptop core. **Every browser measurement in this arc ran
headless Chromium on that CPU**, which has three consequences the producing
session did not state:

1. **Absolute CPU figures overstate what a real visitor pays.** F4's
   "326.3 ms/s ≈ a third of a core" is a third of an *FX-6300* core. The same
   work on current client hardware is a substantially smaller share. The
   **ratio** (326.3 vs 0.3) is what travels; the absolute number is not.
2. **It strengthens the owner's decision to park the gutter work, rather than
   weakening it.** The worst idle cost measured anywhere in this arc was taken on
   2012 silicon and still held ~60 fps. A modern machine has more headroom, not
   less.
3. **A CPU-throttle sweep on this box is harsher than intended.** The producing
   session proposed 4×/6× throttling to model "a 2018 jobsite laptop." 4× on an
   FX-6300 lands well below any laptop a tech would actually carry, so that test
   as specified would measure a machine nobody owns. Re-derive the multiplier
   from a target device, or drop the test.

`tests/perf-profile.mjs`'s own header already warns that CPU numbers are
machine-dependent and do not travel. This is the concrete reason. The
**layouts-per-rendered-frame** column is the load-independent detector and is the
one that survives the hardware — prefer it, and rank by fps, never by CPU.

## 2 — The self-catch register: where the producing session was wrong

Not a confession list — a **targeting guide**. Six of these were caught before
shipping; two reached a PR body and had to be corrected after.

1. **Metric was assumed to be the text-overflow risk. It is the opposite.**
   The producing session predicted metric strings would overflow; measurement
   showed **US is the worse case** on this page (zone clamps 40–120 °F →
   4.4–48.9 °C, so metric renders *shorter*, and both temperature suffixes are
   two characters). ⇒ *Distrust any directional intuition in §8.*
2. **A stated remedy was narrower than the mechanism — twice.**
   (a) "Widen the regex to `/\sdata-flow(?![\w-])/`" traded a false negative for
   a false positive (a bare `data-flow` inside another attribute's quoted
   value). (b) "Scan every `.njk` reachable from cwd" left the identical hole
   one extension away — a `.html` partial reproduces it, because the Nunjucks
   loader ignores the extension. Both were caught by the implementing lane, not
   by the orchestrator. ⇒ *Check §5's remedies against their mechanisms, not
   against their descriptions.*
3. **A false claim was passed along as verified.** The orchestrator told a lane
   the guard's comment mask was load-bearing ("12 of the 15 lessons mention
   `data-flow=` in prose"). Measured: replacing `maskComments` with the identity
   function **still builds clean**, and **0 of 145** scanned files change
   verdict. The claim was inherited from an earlier lane's code comment and
   repeated without measurement. Logged as **#203**.
4. **A PR body asserted a test result that never reproduced.** #430's Test plan
   claimed the H3 comment-mask construction went RED after a fix. It did not —
   the `//` pass is line-anchored, so only the *line-start* variant was closed.
   Corrected in `702b616`. ⇒ *§5 claim B8 is the live residue of this.*
5. **A "latent bug" was reported that does not exist.** One lane claimed
   `cool-1stage`'s unwired `y2` BO leaves `plant.actuators.y2` stale. Refuted by
   running the real engine in a Node `vm`: `fbe-engine.js` fills an undriven bool
   input with `false` before the actuator loop, so Y2 is correctly written.
   ⇒ *§7 claim D4 is the corrected version; verify the correction, not the
   original.*
6. **A false correction was nearly filed on a count.** `grep -oE 'data-flow="[a-z]+"'`
   returned 15 for `refrigerant-loop.html` against a stated 14. The 15th is
   inside an HTML comment. ⇒ **Never use a bare `grep -c` for element counts in
   this repo**; read `grep -n` output, or parse start tags.
7. **Four lane over-claims were caught during synthesis** of the workbench
   diagnosis (two proposals measured better than claimed, one worse, one
   mechanism assertion wrong in both halves). The synthesis lane caught them by
   re-deriving independently. ⇒ *Numbers in §6 survived one adversarial pass;
   they have not survived a browser.*
8. **A verification lane nearly reproduced the very defect it was fixing** — it
   drafted "pre-reorder exit 0, 137 files" for a build it had not run (it had
   replayed the pass order instead, which is a different thing). Self-caught and
   reported.

**The pattern behind #3 and #4, worth carrying:** a second fix in the same area
**silently obsoleted the first fix's stated justification**, and nobody
re-checked. Round 1 built the guard with a substring probe and correctly
documented masking as load-bearing; round 2 replaced the probe with an attribute
parser, which neutralised the prose case — and the round-1 comment survived, got
copied into the PR body, and became two false records. **When verifying a
multi-round fix, re-check whether each round invalidated an earlier round's
reasoning.**

## 3 — What NOBODY has verified

Read this before deciding where to spend effort.

1. **No browser has ever run against the DDC Workbench findings.** Every pixel
   number in §6 and §8 is **computed from CSS source** — the 171.6px threshold,
   the 58% hidden-wire figure, the badge-overflow percentages, the off-screen
   column. The producing session deliberately kept browsers off this box while a
   CPU-sensitive perf measurement was running, and never went back. **This is
   the single largest unverified surface and the highest-value place to start.**
   Two figures are explicitly flagged as boundary cases that could flip on
   sub-pixel rounding or a non-16px root font: a **170px** pitch computes to
   34.4px clearance against a 36px test (fails by 1.6px), and `cool-1stage`'s
   **175px** passes by only 3.4px.
2. **The full-page screenshot sweep for text-overflow was never run.** It is
   owed, in **both themes and both unit systems**. `npm run screenshots` covers
   only the `DIAGRAM_SELECTOR` class list — a subset that does not include the
   unit graphic's badges.
3. **The `ddc-workbench-unit` profiler baseline still does not reproduce.** It
   flagged over-tolerance on 2 of 2 runs (4.34 and 4.67 layouts/frame against a
   recorded 2.23 whose own capture samples were 2.20 / 2.44 / 1.87). Noise
   explains the magnitude but **not the inverted ordering** against the control.
   The baseline was captured at `5b9c457`, which **is** the #426 idle-gate merge,
   so a missing gate is not the explanation. Most likely a page-state
   precondition difference. Unresolved. Do not trust a DRIFT reading on that row.
4. **Claim B8 (`#204a`) is a known-live hole that was deliberately not fixed.**
   See §5. It fails in the *silent* direction.
5. **Whether a page carrying `data-flow-static` is *entitled* to it** is not
   machine-checkable. The guard enforces presence, never entitlement. The
   sweep's semantic correctness rests on a per-page audit plus a particle-geometry
   harness — see A3.

## 4 — Claims: PR #430, the sweep

- **A1.** 15 education pages carry `[data-flow]` elements, holding **197** flow
  paths total, and all 197 carry `data-flow-static="true"` on the branch.
- **A2.** **19** pages site-wide carry `[data-flow]`; the non-education ones
  needed no change. Two education pages mention `data-flow=` in prose only, to
  say they have none: `coil-selection.html` and `vfds.html`.
- **A3.** None of the 15 pages mutates a flow path's `d` without an immediate
  `FlowEngine.refreshPath()`. Claimed evidence: the only geometry writes under
  `html/education/` are `pump-control`'s `setAttribute('points')` + `cx`/`cy`
  (targeting `<polyline>`/`<circle>` in a *different* SVG), `building-pressure`'s
  needle `transform` (a `<polygon>` in a separate `<svg>`), and
  `analog-sensing`'s `x1` (page has no `data-flow`). Zero `@keyframes`, zero SMIL
  `<animate>`, no CSS `d:` property. `hydronic-loops`' `data-flow-density` writes
  do call `refreshPath` immediately (`:819-823`). A review lane additionally
  drove all 15 pages in Playwright — every button, every range to min/mid/max,
  every select option — and measured each particle against its own SVG's live
  geometry: **worst 0.20 units, 643 particles**, which is the engine's coordinate
  rounding floor. ⚠️ **Its own stated residual: it did not enumerate button
  *combinations*, cannot reach a state gated on a specific sequence, a resize
  across a breakpoint, or the fullscreen toggle.**
- **A4.** `simulators/hydronic-loop-builder.html` does **not** carry the flag and
  must never — it rewrites `d` on every `pointermove` and refreshes only on
  pointer-up.
- **A5.** `education/hydronic-loops.html`: **49.87 → 4.69** layouts per rendered
  frame (−90.6%), measured before and after on one server in one session at the
  merge base, not against the recorded baseline.
- **A6.** Liveness **byte-identical** before and after: `main 46/160 · gutter
  47/552`, on all three after-runs. This is the load-bearing check — it is what
  rules out a suspended loop reading as an optimisation. (46/160 is the correct
  partial: the other diagrams are off screen and IntersectionObserver freezes
  them.)
- **A7.** No other profiler row moved beyond its own REP SPR. A review lane
  independently reproduced on different hardware: main **50.48** → branch
  **3.90**, liveness identical on both.
- **A8.** `tests/perf-profile.mjs` re-based the `hydronic-loops` row **only**
  (50.97 → 4.02 layouts/frame), with three capture samples recorded and **no
  tolerance widened**. The superseded 2026-07-24 spread line is annotated, not
  overwritten.
- **A9.** `npm test`: **783 passed, 1 skipped, 0 failed**, run via a throwaway
  config on a 9400+ port (see §1). CI ran the real `npm test` and passed.
- **A10.** Version **3.74.1 → 3.74.2** in both `package.json` and
  `package-lock.json`.

## 5 — Claims: PR #430, the build guard

`flowStaticGuard` in `.eleventy.js`, new in this PR.

- **B1.** It fails the build when a `nav: education` page has a `data-flow`
  element lacking `data-flow-static="true"`, naming the file and counting **per
  element** (`1 of 3`). A review lane confirmed it fires on a **brand-new**
  education page, which is the case it exists for.
- **B2.** It rejects any value other than exactly `"true"` — `flow-engine.js:616`
  string-compares, so `"1"` / `""` / a bare attribute is a **silent
  non-opt-in**. Single-quoted `'true'` correctly passes.
- **B3.** It scans templates reachable from `process.cwd()`, splitting on
  **page vs template** rather than by extension: `.njk` always scanned; `.html`
  scanned only when *not* an 11ty page (outside `html/`, or inside
  `html/_includes/`). Rationale: taking every `.html` would drag the pages in and
  silently extend page scope to simulators, where a markup rule passes
  **vacuously** (see B6). Skips `node_modules`, `_site`, `.git`, `.claude`.
- **B4.** `html/_includes/schematic-bg.njk` is the sole exemption, keyed on
  **path relative to the scan root** (an earlier revision keyed on basename,
  which let any same-named file inherit the pass). The gutter is exempt because
  `pool.gutter` tables it unconditionally.
- **B5.** Two anti-vacuity arms: an empty scan reports itself, and an exempt path
  that stops resolving becomes an offender. Proved end-to-end by moving the real
  gutter partial — **both arms fire in one run**.
- **B6.** The guard does **not** reach simulators, deliberately.
  `hydronic-loop-builder.html` creates its flow paths from JS and contains zero
  `data-flow=` attributes, so a markup rule would pass it vacuously — *silent
  false assurance about the one page that must never carry the flag is worse than
  no rule.*
- **B7.** `flowGeometryLive: true` frontmatter is the opt-out. Nothing uses it
  today. ⚠️ **Known limitation awaiting the owner's ruling:** it is
  all-or-nothing at **page** scope for an assertion whose natural granularity is
  per-**element**. A future lesson with 20 static runs plus one re-routed path
  cannot express itself — the guard rejects an opted-out page that carries the
  flag anywhere, so the author must strip all 21 and lose the whole win.
  **Do not change this; it is the owner's call.**
- **B8. ⚠️ LIVE HOLE, deliberately left open — `codebase-issues #204(a)`.** The
  `//`-blanking pass is **line-anchored** (`line.trimStart().startsWith("//")`),
  so it never fires on a *trailing* comment. An unbalanced `/*` in one trailing
  `//` comment still pairs with a `*/` in a later one and blanks the markup
  between — including an unflagged `data-flow` path. Reproduced on head
  `702b616`: exit 0, 137 files, path shipped. **This fails in the silent
  direction** — the guard hides a real offender rather than inventing a phantom.
  Risk today: **0 of 145** scanned files are near it, and hitting it takes three
  coincidences. Not fixed because a stop was declared and because the obvious
  remedy is a trap: **`//` appears inside every `https://` URL**, so a naive
  first-`//`-to-EOL rule would blank the rest of any line carrying a link.
  Recommended remedy is a **header amendment** claiming only what the mask
  defends, shipped with #203.
- **B9. `#204(b)`.** The pass reorder also changed the **under**-masking
  direction (`/* css */ // js` on one line). Zero files affected today, and it
  fails **loudly** (a phantom offender and a build break, never a shipped path).
  Noted because the safety argument tested one direction only.
- **B10. `#203`.** The mask is **measurably inert** on this tree: identity
  function still builds clean at 136 files; 0 of 145 files change verdict. Root
  cause is a stale justification, not a wrong design — round 2's attribute parser
  neutralised the prose case a sentence about `data-flow=` used to trip. The mask
  remains live insurance against a comment containing a full example start tag;
  none exists today.
- **B11.** `codebase-issues #201` was **already fully paid** by `6c02ce1` — the
  attribute entry, both de-enumerated intros, `setPathColor` / `pulse`, and the
  profiler re-baseline note. Only the disposition marker was missing, and its
  absence is what let a later lane read a closed issue as open and write a false
  deviation. The marker is added on this branch.

## 6 — Claims: DDC Workbench layout diagnosis

⚠️ **All of §6 is arithmetic from CSS source. No browser ran.** Owner review
material for these findings, including the three control sequences in reader
form, is published at
`https://claude.ai/code/artifact/14f4d864-4f54-4699-bea6-13394e703907`
(supplementary — every claim is restated here so this file stands alone).
Subject: `html/simulators/ddc-workbench.html`, hidden
(`eleventyExcludeFromCollections` + `noindex` at L5–L6), `FCU_PROGRAMS` at
`:1740`.

- **C1.** `wirePath` (`html/scripts/fbe-editor.js:279-290`) is a 12-line
  two-point function with **no obstacle avoidance and no waypoint support**. It
  takes the clean single-elbow forward route only when
  `b.x >= a.x + 2 * stub`, `stub = 18`.
- **C2.** Pin dots sit at `blockX + 135.8` (out) and `blockX + 0.2` (in), so the
  test reduces to **column pitch ≥ 171.6px**. (`.fbe-block` is `8.5rem` = 136px,
  matching `BLOCK_W = 136` at `:90`.)
- **C3.** Below **153.8px** pitch, both vertical legs of the fallback route land
  *inside* the source and destination blocks.
- **C4.** `cool-2stage` / `cool-2stage-fanon` pitches: **150, 150, 150, 145,
  145** — below both thresholds. `cool-1stage`: **175** throughout, clearing by
  3.4px. This asymmetry is the whole reason the complaint lands on the two-stage
  sheets.
- **C5.** In `cool-2stage`, **18 of 24** wires take the backward branch
  (including `y1on → y2on`, a same-column edge); the remaining 6 take the forward
  branch but every one spans an intervening column, and the forward route pins
  its vertical leg to `(a.x + b.x) / 2` — for an **even** span that is exactly
  68px into the intervening column, the horizontal centre of a 136px block, at
  any pitch. **Zero wires render as a clean forward elbow.**
- **C6.** `cool-2stage`: **2,205px** hidden behind non-endpoint blocks across 33
  wire/block pairs, plus 461px inside its own endpoints = **58.1% of 4,590px** of
  drawn wire invisible. `cool-2stage-fanon`: 2,370px / 37 pairs.
  `cool-1stage`: 200px / 2 pairs.
- **C7.** Wire crossings: **8 / 8 / 0**. ⇒ Congestion is **not** the defect;
  occlusion is. A fix aimed at crossings misses.
- **C8.** Blocks paint **over** wires: `renderAll` appends the wire `<svg>`
  (`:153-159`) then the block `<div>`s (`:161`), neither carrying `z-index`, both
  `position: absolute` in one stacking context. And `.fbe-wire-sel`
  (`styles.css:4219`) only recolours — **clicking a wire does not lift it**, so
  the one affordance for tracing a wire does not defeat the occlusion.
- **C9.** `.fbe-canvas-inner` is a fixed **900px**. Six 136px blocks with the
  last right edge inside 900 caps pitch at **152.8px — 1.0px below the
  buried-wire cliff.** Non-uniform spacing does not rescue it: 816px of block
  plus five 17.8px minimum gutters is 905px.
- **C10.** The longest dependency chain is **7 nodes**
  (`cooling-setpoint → y1on → y2on → gt2 → sr2 → and1 → y2`), so the graph needs
  7 columns and has 6 — which is why `y1on → y2on` is a same-column edge. Seven
  columns of block alone is **952px**; it does not fit at any pitch.
- **C11.** Visible canvas is **717.6px** at the 1000px gate and **837.6px** at a
  ≥1184px viewport, against an 896px sheet ⇒ **58–178px off-screen at every
  supported width**, and that is the Y1 / Y2 / fan-enable output column the
  page's own prose at `:738-743` sends the reader to.
- **C12. ⚠️ The same router bug is live on the PUBLIC page.** Five of seven
  sheets on `html/simulators/function-block-editor.html` have sub-threshold hops
  (econ, tstat-cool, tstat-heat, reset, proof); only freeze and pid are clean.
  Lowering the threshold **36 → 20px** fixes the public page completely
  (tstat-cool/heat 3/11 → 11/11 forward, econ 4/5 → 5/5, reset 4/6 → 6/6, zero
  new crossings) and does **nothing** for the workbench. Going to 14px makes the
  workbench *worse* (16/24 forward but crossings 8 → 14). **Separate bug,
  separately worth fixing — not the workbench's fix.**
- **C13.** The palette's own drop grid uses a **150px x-pitch**
  (`fbe-editor.js:136-139`), so a visitor building a sheet by hand gets the
  buried-wire shape by default.
- **C14.** **Nothing anywhere parses `FCU_PROGRAMS`.** `tests/fbe-engine.spec.js:576-582`
  bounds-checks the *sibling* page's `EXAMPLES`, regex-extracted from
  `function-block-editor.html`. `ddc-workbench` is absent from `tests/pages.js`
  and from `sim-desktop-only.spec.js`. ⇒ Coordinates may be re-placed with no
  test to update, and no safety net either.
- **C15. Recommended remedy, for the owner to rule on.** Hand-place coordinates
  + a ~4-line `canvasSize: {w, h}` option on `createEditor` + a **geometry spec**
  (parse both `FCU_PROGRAMS` and the sibling's `EXAMPLES`, replicate `wirePath`,
  assert every wire takes the forward branch and no segment passes behind a
  non-endpoint block). **Not** an auto-layout: a 40-restart hill-climb produced a
  numerically decent sheet by squeezing blocks to a 17.5px gap and leaving a wire
  on the backward branch — an unsupervised optimizer produces exactly the
  auto-generated-upload look being complained about. Owner sub-decision: **7
  columns @ 175px in a 1196px canvas** (0px hidden, 3 crossings, scrolls
  358–478px in normal flow, fits fullscreen) vs **6 columns @ 152px** in the
  existing canvas (needs the shared router threshold ≤16px, still ~269px hidden).
  The producing session recommends 7-column. **Undecided.**

## 7 — Claims: the three FCU control programs

Owner is a working BMS programmer and will verify these himself; the value of
checking them here is catching an arithmetic or semantic error before he reads
them.

- **D1.** With shipped constants (SP 72, deadband 3, sep 2): `y1on` = **75.0 °F**,
  `y2on` = **77.0 °F**. Stage 1 makes at 75.0, breaks at 72.0 (**3.0 °F**
  differential). Stage 2 makes at 77.0, breaks at `y1on` = 75.0 — **the stage-1
  MAKE point, not the setpoint** (**2.0 °F** differential). Comparators are bare
  strict `>` / `<` with no hysteresis; all differential comes from the SR pair,
  which is set-dominant. Strict comparison makes the band edges dead, so there is
  no boundary chatter.
- **D2.** `or1` and `and1` are **provably redundant** at the shipped constants.
  Verified by running the real engine over a 70 → 82 → 70 °F sweep at 0.25 °F
  steps (98 ticks): `or1.Q ≡ sr1.Q` and `and1.Q ≡ sr2.Q` with **zero
  mismatches**; the state `(sr1 false, sr2 true)` is **unreachable**. They state
  the Y2-implies-Y1 interlock and would earn their keep only if `sep` went to zero
  or negative. Removing them takes the graph 7 → 6 ranks — still 994px, so it
  does not rescue the canvas.
- **D3.** `cool-2stage-fanon` differs from `cool-2stage` by **exactly one block
  and one wire**: all 20 shared blocks identical in id / type / x / y / params;
  `fanon` (a `bi` hard-set true) added at (615, 380); `or1.Q → fan-enable.IN`
  replaced by `fanon.O → fan-enable.IN`.
- **D4.** `cool-1stage`'s unwired `y2` BO is **load-bearing, not disposable** —
  `loadProgram` (`:962-974`) never resets `plant.actuators`, so the orphan block
  is what forces stage 2 off after switching from `cool-2stage`. (An earlier lane
  claimed the opposite — that the binding leaves Y2 stale. **Refuted** by running
  the engine: `fbe-engine.js:463` fills an undriven bool input with `false` and
  the tick runs before the actuator loop.)
- **D5.** The comment at `:1730-1739` heads all three programs but is accurate
  for **`cool-2stage` only** — `cool-1stage` has one latch, no OR, no AND and no
  Y2 logic, and "fan enabled on the cooling call" is false in `fanon`.
- **D6.** `deadband` is a user-editable const feeding an ADD with no `limit`
  block: at **0** the make and break points collapse and the strict comparators
  leave a zero-width band (chatter at tick rate); at **negative** the make point
  falls below the break point and the set-dominant latch holds Y1 **on
  permanently**.
- **D7.** `sep` and `hundred` are **not** in `FCU_POINTS` (`:1720-1728`) while
  `cooling-setpoint` and `deadband` are — so two of four tuning numbers appear on
  the IO chip strip and two are reachable only by selecting a block.
- **D8.** No minimum on-time, minimum off-time, or interstage delay on any of the
  three sheets. `ton` / `tof` are in the catalog and used by none of them.
- **D9.** `fan-speed` is a `const 100` straight to the AO on all three. In
  `cool-1stage` the AO reads **100% while the fan is stopped** — the Unit tab
  prints the raw AO (`:1396`).
- **D10.** `fanon` renders as a **click-to-toggle** and is not an FCU point, so a
  reader can drop fan-enable while Y1/Y2 stay commanded — landing on the unit
  graphic's own alarm at `:1343`.

## 8 — Claims: text outside boxes

⚠️ **Arithmetic only. No browser ran. This is the owner's originally reported
bug and the confirming sweep is still owed.**

- **E1.** `DAT · DISCHARGE` (`:566`): 15 chars × 6.8 units ≈ **102 units** of ink
  in a **90-unit** box ⇒ ~6 units past *each* edge, ~13% over.
- **E2.** `EAT · ENTERING` (`:558`): ≈ **95.2 units** in an **86-unit** box ⇒
  ~4.6 past each edge, ~11% over.
- **E3.** `ΔT ACROSS COIL` (`:562`): ≈ 95.2 in **96** — fits by ~0.4 units per
  side. ⚠️ `Δ` (U+0394) is **outside the `unicode-range` on all four IBM Plex
  Mono `@font-face` rules**, so that one glyph renders from the platform's
  generic monospace ⇒ **this caption's verdict is machine-dependent.**
- **E4.** SVG `<text>` does not wrap and there is **no `clip-path`,
  `textLength`, or `overflow`** anywhere in the file ⇒ overflow always paints
  outside the frame, at every rendered size, invariant to the viewBox scale.
- **E5.** `.fcu-pt-val { font-size: 14px }` (`:34`) beats a presentation
  attribute in the cascade, so the authored `font-size="13"` on the EAT / ΔT /
  DAT readouts and `"12"` on the zone setpoint are **dead** — everything renders
  ~8% larger than authored. The page already documents this exact species for
  `text-anchor` at `:47-51`.
- **E6. Correctness bug.** `FCU_POINTS` hard-codes `unit: '°F'` (`:1721-1728`)
  and `updateChips` (`:911-935`) reads the raw canonical Fahrenheit value with no
  `Units` call ⇒ **with the site in metric, the IO chip strip shows Fahrenheit
  numbers labelled °F.**
- **E7.** Metric is **not** the length-growth vector on this page (see §2 item 1).
  The real ones are the OA slider at its 110 max, the load slider at
  `10000 Btu/h`, the `Force sensor` → `Release` label swap, and above all the
  **unbounded** const values a user can type into the FBE inspector — a path a
  sweep that only loads the three sample programs will never see.

## 9 — Claims already merged to `main` (`db88b7a`)

Lower priority — already shipped, docs-only, and reversible. Verify if effort
allows.

- **F1.** `db88b7a` records a `/verify-handoff` pass over the previous brief: 47
  claims, 38 verified, 5 corrected, 4 unverifiable. The five corrections and
  their shared failure mode (a number or location carried forward from an ad-hoc
  measurement without re-derivation) are in the commit body.
- **F2.** The `<symbol>`/`<use>` gutter architecture holds in every particular,
  including the one the draft flagged UNVERIFIED: **the scroll draw-in animates
  through `<use>`, it does not snap.** Method matters — `document.getAnimations()`
  reports **nothing** and `useEl.shadowRoot` is `null`, so an API check reads as
  a confident false negative; it was settled by **pixel differencing** (four
  distinct intermediate frames, none byte-equal to either endpoint reference).
- **F3.** The gutter holds **1,610 static markup nodes** (counted with JS
  disabled) plus **624 injected at runtime** = **2,234 live**.
- **F4.** Post-arc gutter cost, same page and same run:
  `tools/signal-scaling.html` normal **326.3 ms/s**, under
  `prefers-reduced-motion` **0.3 ms/s**, both at ~60 fps. ⇒ The gutter still
  costs ~a third of a core on every wide-viewport page, and #427's 15× layout cut
  bought only ~9 percentage points of CPU because the remaining cost is not
  layout. Also: 1,610 static nodes render for ~0.3 ms/s, so **node count is not
  the idle cost** — going static is, and `<use>` is an authoring/load-time win.
- **F5.** The `ddc-workbench-unit` profiler baseline anomaly — see §3 item 3.
  **Unresolved.**

## 10 — Owner decisions pending (do not pre-empt any of these)

1. **Merge or close PR #430** — after this verification pass.
2. **`flowGeometryLive` granularity** — page-scope as built, or per-element? (B7)
3. **`#204` header amendment** — ride along on #430, or ship separately? (B8)
4. **Wiresheet layout: 7-column vs 6-column.** (C15)
5. **Eight program design questions** — the artifact's §7. In the producing
   session's order of interest: **D1** (the setpoint is the cut-out, not the band
   centre, while the chip reads "Cool SP" — the convention a reader absorbs
   without noticing) and **D2** (the two provably dead gate blocks). Then the
   `dat` low-limit hook, whether the third sheet earns its place, guarding
   `deadband`, surfacing `sep`, and whether fan speed should follow the stage.

## 11 — Parked, not forgotten

- **The static-print gutter background is parked.** The owner's read, 2026-07-25:
  nobody he knows has issues, battery drain is acceptable from his own use, 60 fps
  on real hardware — *"I think I may be pushing this too hard."* A **motion / eco
  toggle** (he prefers "eco" framing over "low performance") is deferred to a
  post-workbench housekeeping pass. ⚠️ **Scope question to settle before it is
  built:** on some pages the motion *is* the content — kill motion on
  `refrigerant-loop` or the workbench and the thing being taught stops.
- **The DDC Workbench buildout is the live thread** the owner was interrupted
  from when a small amount of lag sent the session down the perf path.
- **Owed once #430 merges:** `codebase-issues` entries for C12 (the public
  page's router bug) and C13 (the palette drop grid). Held only to avoid
  conflicting with #430's own edits to that file.

## 12 — Cleanup: host process hygiene (mandate item 2)

**Nine stale servers are running, the oldest for 8+ days.** They are leftovers
from previous Claude sessions on this box, not services. PIDs will have changed
by the time you read this — **match on the pattern, not the numbers**:

```
pgrep -af 'http\.server|eleventy'
```

Ports seen 2026-07-25: `8761`, `8768`, `8793`, `8794`, `8931`, `9137`, `9402`,
`9500`, plus an `eleventy --serve` on `41573`. Ages ranged 14h to **8d 14h**.

Three things to know before reaping them:

1. **`8794` and `9500` are bound to `0.0.0.0`.** They have been serving `_site`
   builds out of scratch worktrees under `.claude/` to the whole LAN for a
   day-plus. Nothing sensitive in a static build, but it is not intended, and it
   is the strongest argument for fixing the pattern rather than just the
   instances.
2. **This is the root cause of the recurring port-collision friction.** It is why
   `npm test` cannot bind `:8000` and why every lane in this arc had to probe
   `ss -ltn` before choosing a port. The collisions are self-inflicted
   accumulation, not a crowded box.
3. ⚠️ **Kill the server, not the wrapper.** The producing session got this wrong
   in front of the owner: the PIDs from a `ps | grep claude` listing are the
   `/bin/bash -c … eval '…'` wrappers. Killing those leaves the real `python3` /
   `node` children alive and reparented to init. Target the `http.server` /
   `eleventy` processes themselves, then confirm `pgrep -af` comes back empty.

**Do not blind-kill by port range.** Ports `8000`–`8006`, `8080`, `8099`,
`8123`, `9090` are the household stack (rootless podman quadlets, grafana,
clickhouse, cockpit) — see `~/CLAUDE.md`. A `pgrep` on `http.server|eleventy`
does not match them, which is why that is the safe discriminator.

**Owner's broader ask, larger than reaping strays:** *"we can take a deeper look
at background processes and how we host the server on this box."* Worth treating
as its own scoped piece of work rather than folding into the cleanup — the
question is what launches these, why nothing reaps them, and whether the
`nohup … &` idiom the lanes use should be replaced with something that dies with
its session.

## 13 — New idea from the owner: local preview on the service dash

> *"I may want to add a local preview to my custom service dash so it's more
> streamlined."*

The dash is the **home hub / launcher page at `~/caddy/`** (http://command.home.arpa),
which has **its own CLAUDE.md** — so this is a cross-project change and the hub
repo's conventions govern, not this one's. Scoped but not started; no design
decisions made.

Two things worth raising with him before building anything, both learned the hard
way this session:

- **A long-lived preview server is the exact thing §12 is cleaning up.** A hub
  tile pointing at an ad-hoc `python3 -m http.server` recreates the stray-process
  problem by design. The rootless-podman-quadlet pattern that every other hub
  service uses (`~/.config/containers/systemd/*.container`, linger enabled, starts
  at boot) is the house answer, and it makes the preview reapable and restartable
  instead of orphaned.
- **The `~/CLAUDE.md` wording is RESOLVED — there was never a contradiction.** The
  producing session read "**Not run locally** — dev only… don't expect a local
  service or hub tile" as blocking a preview tile. The owner corrected that,
  2026-07-25: *"I run locally as 'hosted locally for public use'. The local server
  would still be dev only in the way it would only be used for dev work
  (previewing/testing/etc)."* The note meant *no household-facing service*; a dev
  preview was always fine. `~/CLAUDE.md` is updated — **that file is not
  version-controlled, so there is no commit to cite**: its subproject line now
  reads "not hosted locally for public use", and a new **two-senses convention**
  at the bottom separates *hosted locally for public use* (quadlet, a port in
  *What's running*, hub tile, linger, Caddy-proxied) from *run locally for dev*
  (ephemeral, scratch port, absent from the table), and states that giving a dev
  preview a hub tile does **not** promote it or create an uptime expectation. That
  convention also carries §12's reaping guidance, since it is where a future
  session will look before starting a long-lived server.
- **The one real design question left:** does the tile serve a **built `_site`**
  (static, cheap, stale until rebuilt) or a **live `eleventy --serve`** (always
  fresh, but a permanently running node process — exactly how the 2-day-old stray
  on `:41573` came to exist)? If the answer is "live", the quadlet pattern is what
  keeps it reapable.
