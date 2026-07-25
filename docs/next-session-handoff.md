# Session handoff — site-wide animation perf shipped; background rework is next (2026-07-24)

> **Lifecycle:** written 2026-07-24, superseding the "polish arc" handoff.
> That file's entire **§1 Fix the browser lag** is done and its section is
> removed — along with the framing that put it on the DDC Workbench, which was
> wrong (see *Corrections*). Its §2 (cleanup) and §3 (go-public) were **not**
> touched by this arc and are carried forward below, verbatim in substance.
> Retire this file when the **static-print background ships** (or the owner
> parks it). Durable design home for the sim: **`docs/air-side-sim.md`**.

## Read this first

**Every claim here is a hypothesis. The repo is the truth.** The predecessor
brief's headline task was scoped to one page; measurement showed the defect
was site-wide chrome costing ~40% of a CPU core on **all 135 pages**, and that
the page it blamed was not even an outlier. Three of its mechanism claims did
not reproduce. Tell every lane the brief is a hypothesis, that correcting it
is wanted, and that the orchestrator — not the lane — decides on a
discrepancy.

**The measurement discipline below is not optional.** Two separate experiments
this session produced confident numbers that were *inverted* or *vacuous*
until a precondition and a liveness check were asserted. Read *Process notes*
before taking a single measurement.

## Where things stand

`main` @ `6c02ce1`, **v3.74.1**, clean tree, **zero open PRs**, remote is
`main` only. (Line numbers below cite `6c02ce1`, the commit they were taken
at — deliberate, not stale. Several moved during this arc: `FCU_PROGRAMS` was
`:1664`, it is now `:1740`.)
Counts: **40 education lessons · 34 content quizzes + 7 field drills ·
31 tools · 8 simulators** — the 8th is still the hidden
`html/simulators/ddc-workbench.html` (`eleventyExcludeFromCollections: true`
L5, `noindex: true` L6; out of nav / search / sitemap / `tests/pages.js` /
README).

**Shipped this arc — four PRs plus a closeout commit:**

- **#427** `flow-engine: cut per-frame cost` — a runtime-built sampled point
  table replaces per-particle `getPointAtLength()`, plus cheaper writes,
  a `visiblePools` array instead of a ~360-pool per-frame scan, and the
  `data-flow-static="true"` opt-in. Carried the **3.74.0 minor bump**, which
  was load-bearing: `flow-engine.js` is served immutable with
  `?v={{ site.version }}`, so merging unbumped would have stranded returning
  visitors on the cached old engine.
- **#429** `refrigerant: opt the loop's flow paths into the point table` —
  `data-flow-static` on all 14 `[data-flow]` elements. @4× CPU: **24.9 → 38.0
  fps**, layouts/frame **81.7 → 4.0**.
- **#426** `ddc: idle-gate the workbench's own rAF loops` — the fan-blade and
  chevron loops merged into one self-suspending loop
  (`flow-engine.js:285-303` idiom). Gated states drop to the page's floor;
  arrival is unchanged **by design** (that is genuine visible motion).
- **#428** `tests: report-only idle-animation profiler` — `npm run
  perf-profile` (`tests/perf-profile.mjs`). Report-only by owner ruling
  (2026-07-24): CPU numbers are machine-dependent and a threshold would flake.
- **`6c02ce1`** closeout — profiler re-baseline, `codebase-issues` **#198–#202**
  batched from the PR bodies, and two doc drifts fixed.

**Verified in production**, not just in CI — `tools/signal-scaling`:

| | before arc | live now |
|---|---|---|
| layouts / rendered frame | 46.47 | **3.03** |
| gutter particles moving | 44/552 | **44/552** |

A 15× cut in layout work per frame on every page, with the gutter animating
identically. Nothing looks different; that was the requirement.

## Corrections to the previous draft — do not rediscover these

1. **The lag was NOT a DDC Workbench defect.** It was the site-wide
   `.schematic-bg` gutter. `tools/signal-scaling.html` — a plain calculator
   with zero animation of its own — idled at **41.7% of a core**, and **0.1%**
   with the gutter hidden. The workbench was **#3 of 84** pages by weight
   (3.5% above #4) and had *lower* idle CPU than the public
   `simulators/refrigerant-loop.html`. Both "unusually heavy page" and
   "workbench-specific" were false.
2. **"Ceiling is ~10-15%, don't chase zero" was wrong.** That was measured
   from levers that *keep animating*. A fully suspended loop reaches **0.4%**,
   because with no visible flow pool and no auto-firing pulse path there is no
   per-frame style/layout pass at all.
3. **CSS cannot fix this class.** `contain` and `content-visibility` on the
   motifs did nothing; `visibility:hidden` (ticking, zero painting) still cost
   full price. Paint was never the cost — it was script + forced style/layout.
4. **`refrigerant-loop.html:2593` is NOT the same defect as the workbench's.**
   That loop writes *three attributes per frame* and is negligible. Its real
   cost was `flow-engine` on its content pools, fixed by #427/#429.
5. **`tests/pages.js` is required by THREE specs**, not two —
   `contrast-sweep.spec.js:128` as well as `smoke` and `responsive`. CLAUDE.md
   said two in three places; fixed in `6c02ce1`.

## The work, in order

### 1. Background rework — static building "prints"

**Owner decision (2026-07-24): replace the 120 animated gutter motifs with
static *prints* on the blueprint graticule that is already there** — a uniform
office building, mirrored left/right so the two gutters read as opposite
wings, with a small tile pool plus labels for a sense of place.

**Owner explicitly REJECTED shipping a merely-static gutter** (the V3 variant
of #427, measured best of the three): *a background that suddenly stops moving
would read as broken to returning visitors.* So **keeping the scroll draw-in
is load-bearing**, not decorative — it is what keeps the page from reading
dead.

Architecture is **settled and spike-verified** (all measured in Chromium this
session):

- **`<symbol>` + `<use>`.** `<use>` content stays out of the light DOM —
  measured **22 elements for 4 tiles + 4 labels**, against **120 `sbg-motif`
  wrappers and ~1,677 nodes** in the gutters today (`_site/tools/signal-scaling.html`).
  The 120× inline repetition exists *only* because `flow-engine` reads geometry
  via `getTotalLength()`/`getPointAtLength()`, which do not pierce `<use>`
  shadow trees (`html/_includes/schematic-bg.njk:10-12` says so). Going static
  removes that constraint entirely.
- **Mirror** the right gutter with `<g transform="translate(W,0) scale(-1,1)">`.
- **⚠️ Labels MUST live outside the mirror transform** or the text reverses.
- **⚠️ GOVERNING RULE — per-instance variation must be an INHERITED CSS
  property set on the `<use>`.** Simple selectors *do* reach shadow content but
  apply **uniformly to every instance**; descendant selectors rooted in the
  light DOM do **not** cross the boundary at all. Verified both directions.
- **⚠️ The current draw-in rule FAILS through `<use>`.**
  `html/styles.css:454` is `.sbg-motif.is-drawn [data-sbg-stroke]` — a
  descendant selector, so it never applies. Use
  `stroke-dashoffset: var(--sbg-dash)` *inside* the symbol with `.is-drawn`
  setting `--sbg-dash: 0` on the `<use>`. The `transition` must be declared
  **inside** the symbol (`transition` is not inherited).
- **UNVERIFIED —** that the draw-in **animates rather than snaps** when
  `--sbg-dash` changes. The spike used `transition: none` to isolate the state
  change, so per-instance switching is proven and the *animation* is not.
  Low risk (`stroke-dashoffset` is normally animatable; only its input
  changes) but confirm on the first real tile.
- **Repetition is authentic here.** Real drawing sets repeat typical floors —
  land the repeat on a floor line and it reads as *levels*, not tiling.

**Owner owns the artwork** (he builds equipment graphics professionally).
Build the tiling / mirroring / labelling frame with **stubbed tiles** so he
drops art into a working frame rather than starting cold.

**⚠️ Static is not automatically free.** The win is DOM nodes and per-frame
work, **not transfer bytes** — the page gzips to **13.0 KB** because the
repetition compresses almost perfectly. A hand-inlined dense print would spend
the win back.

**Open, and it drives everything else:** does the print **tile, crop, or
repeat with a deliberate seam**, and is it **one drawing across both gutters
or two sheets**? Not yet answered.

### 2. `codebase-issues` #202 — opt the education lessons into the point table

Post-arc, every `npm run perf-profile` row sits at 2–5 layouts/frame **except
`education/hydronic-loops.html` at ~51**, because the ~40 lessons — the widest
consumer of in-content particle flow — were never opted in. Tabled pages
improved ~93%; that one improved ~48%. Verified: `grep -c data-flow-static
html/education/hydronic-loops.html` → **0**.

**ASSUMPTION —** that this is near-mechanical. Lesson SVGs are *probably* drawn
once and never re-pathed, but `data-flow-static` is an **assertion** that every
`d` mutation is followed by `refreshPath()`, and the failure mode is silent and
visual (particles stranded on pre-mutation geometry). **Verify per page.**
`simulators/hydronic-loop-builder.html` is the standing counter-example that
must never set it.

**Use the negative control that #429 used:** stub `refreshPath` to a no-op and
confirm the check goes red. Without it you cannot tell a passing check from a
vacuous one.

### 3. DDC Workbench polish — items 2 and 3, still open

Confirmed untouched: `git log 12b5df3..HEAD -- html/simulators/ddc-workbench.html`
returns only the idle-gate commit.

- **Text extending outside boxes. ⚠️ Locations still UNVERIFIED** —
  owner-observed, never pinpointed. Sweep with **full-page** screenshots in
  both themes and both unit systems; `npm run screenshots` covers *diagram
  SVGs* only, a subset.
- **Jumbled sample-program layout.** Grounded: `FCU_PROGRAMS`
  (`html/simulators/ddc-workbench.html:1740`) places blocks by **explicit
  `x`/`y`**, so tidying is repositioning data, not rewriting logic. Note there
  are **three** programs, not one — `space-temp` at `x:20,y:20` appears at
  `:1743`, `:1793` and `:1823`. **Owner wants to review the existing programs
  first.**
- **Then** the go-public decision (ship gates in `docs/air-side-sim.md`
  *Ship-time gates*; flip `eleventyExcludeFromCollections`/`noindex` at L5–L6).

**Explicitly declined — do not carry as open work:** rewriting the FBE programs
from scratch (owner deferred — *"more function block work on a Friday night
after doing it for real all week isn't appealing"*); feel-tuning as a blocking
task (ongoing, tune-in-place, no code).

## Decisions waiting on the owner

- **Print topology** — tile / crop / seam, and one drawing or two. Blocks the
  background rework's frame; nothing else.
- **Launch scope — FCU-only vs. build more units first?** Still undecided from
  the previous arc. Blocks go-public timing only. The shell is unit-generic, so
  a second unit is additive.

## Process notes that earned their keep

- **⚠️ CPU% INVERTS on a saturated page.** Removing work took
  `refrigerant-loop` from **55.5% → 65.0% CPU** *while fps went 26 → 57* — the
  freed thread rendered frames it had been dropping. **Rank by fps.** Read
  **layouts per rendered frame** as the load-independent detector: across runs
  where fps ranged 31.5–58.7, layouts/frame held to 1.4%.
- **⚠️ Assert the PRECONDITION, not just the outcome.** A `<style>` injected
  via `addInitScript` can be discarded when the real document parses — a lane's
  first three runs read 49% where the truth was 15.6%. Use
  `page.addStyleTag()` *after* `goto` and assert `getComputedStyle(...)`.
- **⚠️ Liveness probes: population, by ELEMENT IDENTITY.** Index comparison
  misaligns when in-flight pulse circles churn in the same layer; filter to
  `circle[r="3"]` so the gutter total reads exactly **552**. And a
  `contain: strict` experiment read a spectacular **0.3%** purely because size
  containment collapsed the motifs, IntersectionObserver reported nothing
  visible, and the loop suspended — **a disabled animation reads exactly like
  a brilliant optimisation.**
- **Two runs cannot characterise noise on this box.** A layouts/frame tolerance
  derived from two runs was falsified by a third, and two rows still flagged on
  a fourth because they animate convergently rather than steady-state (they now
  carry a per-row floor). The full derivation, including the wrong first
  answer, is in `tests/perf-profile.mjs`'s BASELINE header.
- **Adversarial verification pays.** The pre-merge review raised 8 findings;
  **5 did not survive refutation.** The 3 that did were all real, and one
  (a liveness probe watching a `display:none` pane) would have made the new
  profiler declare this arc's own fix a broken animation.
- **`ln -s <repo>/node_modules node_modules` in a fresh worktree** was faster
  and worked across all five lanes — no `npm ci` needed.
- **Ports 8000–8099 are occupied** on this box. Serve on 9400+. `pkill -f
  "http.server <port>"` **self-matches** — use the bracket trick
  (`[h]ttp.server`). Foreground `sleep` is blocked.

## One passing note

The site got materially faster everywhere and nobody can see it, which is the
best possible outcome for chrome. The flagship still saturates under CPU
throttle, so **#202 is the highest-leverage next perf item** — but the
owner-directed background rework is the one that retires this whole defect
class, because a static gutter cannot regress into an animation loop. The
frame for it is specified and the traps are written down; what it needs now is
drawings.
