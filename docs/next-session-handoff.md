# Session handoff — both glossary pilots are live (2026-08-11, overnight)

> **Lifecycle:** written 2026-08-11 in the small hours, at the end of the
> pilot-day session. The previous brief of this name was retired in
> PR #504 when its own conditions were met; nothing carries over from
> it. **Retire this file when the morning quick-fix batch (item 1) is
> dispositioned AND the #283 treatment decision is made** — from there
> the arc runs on `docs/glossary-arc.md` and the ledger, and this brief
> has no job left.

## Read this first

> **Verified 2026-08-11 against `598c1f3` (`/verify-handoff`).** 42
> claims extracted, 38 verified, 4 corrected in place, 5 left as
> owner-side unverifiables. Every correction is marked
> **[corrected 2026-08-11]** at the point of use with its evidence —
> the two that would have cost real work are the mark-density fallback
> (item 1) and #281's merge standing (item 3). The suite baseline was
> re-measured at a *later* tree than it was written against and holds.

**Every claim in this file is a hypothesis. The repo is the truth.**
Two things the morning session must know before touching anything:

1. **The one-night merge grant is EXPIRED.** The owner granted this
   session (2026-08-10, before sleeping) explicit clearance to merge
   live-facing PRs and make bigger decisions, for that session only.
   Everything below shipped under it. From now, the normal rule is back
   in force: live-facing merges only on his explicit word; docs/tests
   merge freely. There are **zero open PRs**, so nothing is waiting on
   a merge anyway.
2. The owner expects to **interact with the pilots at work today** and
   said the session "may start with a quick fix" — item 1 is the
   candidate list, pre-cited. He also gave a standing instruction
   (2026-08-10, in memory as `surface-unanswered-decisions`): open
   decision questions are re-raised to him directly, never left as
   PR-body flags. The current open set is exactly one decision —
   see *Decisions waiting on the owner*.

## Where things stand

`main` @ **`598c1f3`** *(**[corrected 2026-08-11]** — written as
`38af9d8`, which was correct until this file's own PR #510 merged on
top of it. Self-referential drift: a handoff cannot cite the tip it
will itself move. The `38af9d8` measurements below are unaffected —
nothing between the two commits touches anything they measure.)*,
**v3.85.0**, working tree clean, **zero open PRs, zero stashes,
`main` the only local branch, and no stale worktree — `git worktree
list` returns the primary tree alone, so the cleanup this line used to
ask for is already moot.**
Counts, re-derived: **40 education lessons · 34 content quizzes + 7
field drills · 31 tools · 10 non-index simulator files** (9 carry
canonicals; `ddc-workbench-ahu-mockup.html` stays hidden).

Eight PRs merged 2026-08-10/11 (#502–#509). The six from this session:

- **#504** — the glossary arc opened: §8 curation rule RATIFIED AS
  AMENDED (zero-definition terms join the stall criterion), the
  split-pilot ruling, `docs/glossary-arc.md` created, the old handoff
  retired. Also out-of-band: `origin/candidate-b` retired to the
  annotated tag `archive/candidate-b`.
- **#505** (v3.83.1) — the device-face LEDs frozen theme-constant on a
  `--led-*` family; scope grew at fix time to the whole register (run,
  comm, base default). Closed ledger #280.
- **#506** (v3.83.2) — the FCU outdoor-air ramp (target + 0.5 °F/sim-s
  chase, AHU parity). Closed #278 — **whose trip premise was DISPROVED
  at fix time**; the correction is in the ledger entry.
- **#507** (v3.84.0) — the collapse pilot: four `details.prose-fold`
  folds across both workbench pages (owner-ruled fold set), seven
  inline lesson links, and `details-print.js` — **site-wide from
  `layouts/page.njk`** after the owner ruled every details idiom
  prints open (33 pages, not just the folds).
- **#508** (v3.85.0) — the gloss component pilot on
  `education/timers-and-delays.html`: 5 hand-placed
  `button[data-gloss]` marks over 3 terms, build-transform panels +
  guards in `.eleventy.js`, `gloss.js` runtime with **preview/pinned
  semantics** (a verification round found and fixed a blocking
  hover/click race post-green-suite), CLAUDE.md gloss convention
  added.
- **#509** — ledger true-up: #278/#280 closures, #283's design round
  recorded, new entries **#284–#289**.

**Suite baseline: 1174 passed / 1 skipped** — measured by the #508
lane on its merged tree at `14b0f54` (pre-merge of the final bump);
CI green on every merged tip. **Re-verified 2026-08-11 at two later
trees**, so the baseline is good against current `main`'s content, not
just the tree it was taken on: CI run `31454202546` @ `ed25828` (the
3.85.0 bump — the commit that rewrites every `?v=` string site-wide,
the one place a stale baseline could have hidden) and run
`31455027029` @ `e19c4d6` both report **1174 passed / 1 skipped**.
The single skip is still the `contact.spec.js` honeypot fixme
(`test.fixme` at `tests/contact.spec.js:49`). **Production smoke passed** after
the last deploy: gloss triggers/panels live on the pilot page at
`?v=3.85.0`, zero gloss payload on non-pilot pages, folds live on
both workbench pages, `details-print.js` on the tool pages.

## Corrections this session proved in flight — do not rediscover

All durably recorded; pointers so a lane doesn't re-derive them:

1. **#278's premise was wrong** — the FCU OA knob alone cannot latch
   its low limit at any position (44.7 °F settle vs 42 °F trip at the
   55 °F knob floor). The ramp shipped for model-consistency, not trip
   protection. Ledger #278's correction block has the numbers.
2. **"Retrofit is a one-word selector change" was false** —
   `prose-fold.js` was per-page; the honest fix became site-wide
   `details-print.js` (and `tool-preamble` is on **30** pages, not the
   proposal's five). PR #507's body + `docs/glossary-arc.md` carry it.
3. **`change-of-value` is NOT zero-definition** — prose-defined on
   `bacnet-services.html` and `bacnet-vs-modbus.html`, both now its
   suppression `owners[]` in `html/_data/glossary.js`.
4. **The arc doc's raw sheet-note count (11/7/2) was mis-derived** —
   13/7/4 under the recorded rule; corrected in `glossary-arc.md`.

## The work, in order

### 1. The morning quick-fix batch (owner flagged this expectation)

All three are small, all on live surfaces (his merge word needed):

- **`wiresheet` definition wording** — `html/_data/glossary.js:99-103`
  *(**[corrected 2026-08-11]** — written as `:98`, which is the
  `term:` line; the wording actually under review is the `def`, and
  the whole entry spans `:97-105`)*, flagged in PR #508's body under
  *"⚠️ For owner review"*: the panel keeps vendor-neutral alternates;
  the owner may want the wording tuned.
- **The econ fold's swept-in try-it sentence** —
  `ddc-workbench.html:3114-3116` (@ `38af9d8`): "…fault worth trying:
  the damper drops to zero… nothing on the graphic goes red" is
  operating-register prose now inside a fold; verification called it
  "reword to descriptive, or accept," and the fold's summary gives it
  no scent trail. His call.
- **Mark-density feel check** — he picked every-occurrence marking;
  the live pilot page has 5 marks (3× sr-latch, at
  `timers-and-delays.html:67/254/382`, plus `wiresheet` at `:54` and
  `change-of-value` at `:429`). Have him read it and confirm the
  density feels right in situ. The recorded fallback is
  **first-occurrence-per-page** *(**[corrected 2026-08-11]** — written
  as "first-per-section", which appears nowhere. The lever is named
  `docs/tooltip-glossary-scoping.md` §2: *"Every-occurrence vs
  **first-occurrence-per-page** is unset, and it is a
  factor-of-two-or-three lever on its own"*, and
  `glossary-arc.md`'s D2 log records the owner overriding "the
  recommended default was **first-occurrence**". Per *page*, not per
  *section* — on this pilot the two differ: three of the five marks
  are `sr-latch`, so per-page yields 3 marks and per-section would
  yield more.)*

### 2. The #283 treatment decision → its lane

See *Decisions waiting on the owner*. Once he picks, the lane is
fully specified by ledger #283's design-round block.

### 3. The queued mechanical lanes (ledger-specified, none dispatched)

In no required order, **one suite at a time**: **#281** (fbe race —
see the merge-standing correction below), **#264** (pointLabel
collapse), **#266** (grid `padding-right` — owner-decided 2026-08-10),
**#274** (activity-based simulator chips — owner-decided; final labels
ride the PR for his review), **#269** (FCU sr-only provenance
glosses), **#273** (forced-mark rename), **#289** (blown fuse →
`led--off` — owner-ruled). Each entry carries its fix shape.

> **[corrected 2026-08-11] — #281 does not automatically merge
> freely.** This line called it "test-side — merges freely"; the
> ledger does not settle the side. Its fix shape is *"the spec waits
> on a bound signal (or on the example's wire count), **or the page
> binds the example buttons earlier**"* — and
> `simulators/function-block-editor.html` carries a canonical, so the
> page-side branch is a live-facing change needing his merge word.
> Merge-freedom is a **consequence of the branch the lane picks**, not
> a property of the issue. Pick the side first, then read the merge
> rule. Everything else in this list is live-facing either way.

**Explicitly parked — do not carry as open work:** #263 (third-unit
trigger), #265 (needs a perf-profile flag), #262 (needs the
per-selector width audit first), #285's sweep-widening (its own
pass), tier-1 definition drafting (waits on the owner's pilot
feedback).

## Decisions waiting on the owner

- **#283 — the override-indications treatment** (the ONLY open
  decision): T-A group-by-slot now / T-B summary+disclosure / T-C
  per-point markers as destination; plus the marker glyph (how his
  production graphics show a held point) and whether fullscreen and
  normal flow differ. The annotated screenshots + treatment mocks
  were delivered to his panel 2026-08-10 late; the measurements are
  durable in ledger #283. Recommendation on record: T-A now, T-C
  destination. Re-raise this directly per the standing instruction —
  a packet in a panel is *recorded*, not *asked*.

## Process notes that earned their keep

- **One Playwright suite at a time on this box** — two concurrent
  suites pinned it (load 20/6 cores). The staged pattern worked well:
  lanes go code-complete, `npm run build` to prove guards, then HOLD
  for an explicit GO before the suite. Ports: throwaway config
  outside the repo, 94xx range.
- **Verify suite completion from the runner's own exit sentinel,
  never the wrapper shell** — the wrapper reported exit 0 on a
  genuinely red run (its last command was the echo).
- **`gh pr checks --watch`'s exit code false-alarmed once** — read
  the checks TABLE for the verdict, and match the run's head SHA to
  what you pushed before merging.
- **Version bumps stayed captain-only and it worked** — four bumps
  (3.83.1 → 3.85.0), zero collisions. Lanes never touch package.json.
- **The verification workflow earned its cost** — a five-agent
  adversarial + rendered round found a blocking race a green suite
  had passed, two further dismissal defects surfaced while fixing it,
  and one finding was refuted as a test artifact (smooth-scroll in
  the spec helper, not the component). Refute before acting; re-run
  before refuting — both directions fired tonight.

## One passing note

The arc's next phase after pilot feedback is **tier-1 definition
drafting** (17 verified terms + the 16 unchecked-tier greps, per
`glossary-arc.md`'s phasing). The pilots shipped verified and the
record is clean; honest readiness: **high** — the one open risk is
whether the owner's morning read of the live pilots sends the
component back for tuning, which is exactly the feedback loop the
pilot exists to run.
