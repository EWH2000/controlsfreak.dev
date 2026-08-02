# Session handoff — the workbench is fully named; Lane C is next (2026-08-01)

> **Lifecycle:** written 2026-08-01, after the naming arc merged
> (PRs #458–#465). Supersedes the retired 2026-07-27 handoff (deleted by its
> own lifecycle in PR #449 — git history retains it) and the out-of-repo
> lane-cut plan file. Retire this file when Lane C and the 7.5 unit selector
> have both shipped **and** the owner's pre-Phase-8 discussion round has
> happened.

## Read this first

Every claim in this file is a hypothesis; the repo is the truth. This
session's measured failure shape: three orchestrator briefs stated facts
that lane agents disproved by measuring (an FCU row-pitch figure, a
four-vs-five ink count, "the fbe scripts are hidden-page-only"). Tell every
lane the brief is correctable and that the orchestrator — not the lane —
decides what to do about a discrepancy.

## Where things stand

`main` @ `d62ebd5`, **v3.79.0**, clean tree, **zero open PRs**.
(Measurements below cite `d62ebd5`, the commit they were taken at — that is
deliberate, not stale.) Counts: **40 education lessons · 34 content
quizzes + 7 field drills · 31 tools · 10 simulators.**

Shipped this session, all merged: **#458** the `TAG · Name` head mechanism
(amended pre-merge on a 15-agent adversarial review); **#459** the naming
inventory committed to `docs/name-inventory.md` + ledger true-up; **#460**
the low-charge verdict softened to symptom-plus-candidate (#247);
**#461** the `readout` type folded into `ao` + the PID sheet reduced to one
AO (`AO · HW Vlv`); **#462** the fullscreen sticky pin (console/graphic
stays in view while the pane scrolls); **#463** FCU `Fan Spd`; **#464** the
contrast-arm settle guard (ledger #259); **#465** all hand-authored names
across the twelve sheets (adversarially verified — byte-diff vs the
inventory came back empty).

The three workbench pages stay hidden (no `canonical`). The public
`/simulators/function-block-editor.html` **is live** and now ships fully
named example sheets.

## Corrections to prior working assumptions — do not rediscover these

1. **`fbe-engine.js` / `fbe-editor.js` are LIVE code.**
   `html/simulators/function-block-editor.html` (canonical, in
   `tests/pages.js`) loads both. "The workbench is hidden" classifies the
   *pages*, never these scripts — the PR #452 shared-code trap, again.
2. **codebase-issues #256's central scenario was false.** The wiresheet
   gate is `(max-width: 999px), (hover: none) and (pointer: coarse)` — an
   OR — so no touch-primary device reaches the inspector at any width.
   Ruled a written exemption 2026-08-01; the rewritten entry is the record.
3. **The entrance-fade DELAY phase defeats Playwright's actionability
   wait** (ledger #259). The tool-card `fadeUp` starts at `opacity: 0`;
   during the delay the element is stationary, so clicks and visibility
   checks proceed and a computed-style measurement reads a ghost (ratios
   ≈1.0). CI lands inside the window; fast local machines land past it —
   "passes locally" proves nothing about this class. Settle composited
   opacity before measuring.
4. **`strokeChevron()` selects FIVE ink tokens**, not four — teal /
   blue-cool / heat-fill / blue plus the dead-grey `--text-dim` `off` band,
   which is the pedagogically load-bearing "no ΔT" tell. Ledger #257
   blessed the JS-selected `var()` form; any refactor moves all five inks
   together, inside a bigger pass only.
5. **The 90px/0.28px row-pitch criticality is the AHU comparator bank
   only** — measured FCU pitches run 83–125px, none within 5px of the
   18-char head budget.
6. **`docs/name-inventory.md`'s HEADER carries three owner-ruled
   supersessions** (Occ Dmpr → `Proof Dmpr`; `rd` keeps `HW Vlv`; `out`
   deleted). Read the header before trusting any §3 row.

## The work, in order

### 1. Lane C — the AHU program library

**Owner decisions binding it** (dates and detail in `docs/air-side-sim.md`):
the second sheet is the mixed-air / discharge-low-limit program; the
library deliberately includes **flawed programs as teaching material**
(2026-07-26); **war story #4** — customers putting the heating setpoint
above the cooling setpoint — is Lane C's content beat (the verbatim quote
and its two framing corrections are in `docs/air-side-sim.md` §war-story
records and the air-side memory; render in house voice, never paraphrased).

Verified @ `d62ebd5`: `AHU_PROGRAMS` has exactly one key (`econ-2stage`);
`mat` and `dat` are seeded as `ai` blocks (`ddc-workbench.html:2568-2569`)
with **no wire touching either** — the hook is intact. Programs live IN the
page by ruling (sheet layout and canvas move together; specs regex-extract
the literal on an 8-space closing brace — match the FCU page's shape).
Sheet-split decisions want **measured** block counts against the canvas.

**Naming (new since the lane was cut):** a new sheet authors `name:` keys
on its non-point blocks and adds its per-sheet floor row to
`tests/fbe-block-names.spec.js`'s `MIN_HAND_NAMED` map — a sheet with no
floor row ships its names unguarded. Point-backed blocks are stamped from
the roster automatically; author nothing onto them.

### 2. 7.5 — the unit selector

`Unit — FCU | AHU` link pair with `aria-current="page"`, on both
statusbars. Verified @ `d62ebd5`: zero `aria-current` hits in either
workbench page — not started. Small lane.

### 3. ⚠️ STOP — owner discussion before Phase 8

Owner (2026-08-01): *"expect some additional discussion between 7.5 and 8
… I just want to make sure this is the best it can be."* Do **not** roll
from 7.5 into graduation without that session. Candidates he may bring or
want brought: the **full block-name pass in his own voice** (flagged
2026-08-01 — he'd have called `Proof Dmpr` "Fan Sts Check"); the #240
fog-marker verdict (built, on the preview — UNVERIFIED whether he has
looked); the parked items (hover tooltips; mobile Q2; FCU "fix 1"; the
intake-arrow composition); the flawed-programs framing.

### 4. Phase 8 — graduation (only after the discussion)

Gates recorded in `docs/air-side-sim.md` (Backlog/graduation) and
CLAUDE.md's hidden-page rules: `canonical` + `tests/pages.js` manifest +
sitemap/nav/README + the **both-themes contrast sweep will then reach these
pages for the first time — expect new findings**, the damage-stakes-note
question, the empty-JSON-LD trap, the `status-and-proof.html` reverse
cross-link (Phase 8's to pay), version bump. Graduation flips every
merge-freely classification for these pages.

**Explicitly declined / parked with reasons on record — do not carry as
open work:** heating mode on units (named future direction; never promise
in copy) · zone thermographics · guided fault-diagnosis mode · #244 canvas
cost (measured, accepted) · #245 `aria-pressed` (sweep both pages together,
later) · #229 FCU live region · #228 engine standardisation (scheduled
separately, owner-directed).

## Decisions waiting on the owner

- **The full name pass in his voice** — not blocking; bundle with Lane C
  review or the pre-8 discussion rather than reopening names piecemeal.
- **#240 fog marker** — his eye on the preview; the candidate is built and
  deliberately cheap to reverse.
- **Typography-lane timing** (#255 option 3 — six woff2 files, comparators
  plus Δ/≈/→; logged in the friction file).

## Process notes that earned their keep

- **Opus = mechanical, Fable = judgment** (owner 2026-08-01; memory
  `agent-model-routing`). Mixed lanes: Opus executes, a Fable pass refutes —
  the refutation stages caught real defects in every round this session.
- **Decisions-first sessions.** The owner ruled ten decisions in one
  sitting before any work; he wants the full slate with recommendations
  and cascade notes, then execution. He also wants flaws in his own plans
  named before execution.
- **`gh pr update-branch` creates a merge commit on the REMOTE branch** — a
  local worktree resolving conflicts afterwards must `git pull --no-rebase`
  before pushing or the push is rejected (measured on #462).
- **Parallel lanes appending to one spec file will append-append conflict**
  (measured: #460 vs #462) — assign file-ends up front or budget a
  keep-both splice, verified with `node --check` + `npx playwright test
  --list`.
- **Per-lane Playwright:** throwaway config, unique high port (8000–8099
  are held on this box), foreground waits, `npm ci` in fresh worktrees. One
  flake per full run is host-load noise — isolate before reporting; CI is
  the arbiter.
- **`docs/codebase-issues.md` is orchestrator-only.** Lanes report finds;
  the orchestrator writes them. Parallel edits to that file: annotate
  mid-file entries in lanes, append new entries only from one place.

## One passing note

The workbench is mechanism-complete and fully named; what remains is
content (Lane C), chrome (7.5), and the owner's quality bar (the pre-8
discussion). Honest read: this is closer to graduation than the backlog's
length suggests — the discussion round is the real gate now, not the code.
