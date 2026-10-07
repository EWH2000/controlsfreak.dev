# Session handoff — fifteen PRs queued for the morning walk; #330 and #331 merged (2026-10-07)

> **Lifecycle:** written 2026-10-07 (early, at the end of the 2026-10-06
> overnight session), superseding the 2026-10-06 brief. Out of that brief,
> items 3 and 4 (the small fixes) and the first half of items 1 and 2
> (quiz wave 3, #228 steps 0–1) shipped as PRs and had their sections
> removed; its *Decisions waiting* block was ruled in full
> (`docs/audits/2026-10-reentry/rulings.md` §19). Retire this file when
> the morning walk has merged or closed the fifteen PRs below **and**
> either #228 step 2 or the next quiz wave has opened; archive it to
> `docs/audits/2026-10-reentry/handoff.md` with a disposition header.

## Read this first

Every claim in this file is a hypothesis. The repo is the truth: `npm run
status` for ledger and content numbers, `npm run dashboard` for the
rendered page, `/verify-handoff` before dispatching anything from here.
The predecessor failed in one specific way, measured: **140 claims, 127
verified, 12 corrected, 1 unverifiable** (workflow `wf_40a4ec5c-c8d`,
two independent refuters on every correction) — and every correction was
a **count or framing carried forward** (stale SHA, "25 PRs" for a 36-PR
window, "three" untested chain PRs for two, "three" ledger collisions
for four). None invalidated the work; all cost a lane time. Separately,
**every overnight lane found at least one drifted line cite** in the
ledger entry it was closing. Cite the commit, derive the count, and tell
the lane the brief is a hypothesis.

## Where things stand

`main` @ `a2ad39f`, **v3.91.0** (3.92.0 arrives with PR #651), clean tree,
**15 open PRs** (all opened overnight; one stacked pair). (Measurements
below cite `a2ad39f`, the commit they were taken at — that is deliberate,
not stale.) Counts, derived: **41 education lessons · 34 content quizzes
+ 7 field drills · 32 tools · 9 canonical simulators** (10 files under
`html/simulators/`; the tenth is the hidden AHU depiction mockup).
Quiz banks: 41, **34 under the 15 target on `main`** (30 at 10, 3 at 11,
1 at 13; `modbus-decoding` frozen by design) — **28 once the six wave-3
PRs merge** (measured on the scratch merge: 28 under — 24 at 10, 3 at 11, 1 at 13; 479 questions in 41 banks; `npm run status` §5 coming-soon candidates 0; 135 canonical pages, `tests/pages.js` in sync).

**Merged overnight on the owner's grant (2026-10-06 rulings §19.2,
§19.15):**

- **#645** — `test.yml` listens for `edited` (gated to base changes) and
  runs on `push: main`; codebase-issues #331 resolved. The first two
  `push: main` suite runs (37556093557 on `6d659c2`, 37556097855 on
  `a2ad39f`) both passed — `main` had never been tested directly before.
- **#646** — `publish-preview.mjs` resolves its default against the home
  directory and guards with three checks (suffix, under `$HOME`, parent
  exists) plus `--dry-run`; codebase-issues #330 resolved. CLAUDE.md's
  LAN-preview bullet rewritten to match.

**Open, for the walk — `docs/audits/2026-10-reentry/walk-2026-10-07.md`
has the per-PR summary and review pointers, in order:**

| PR | What | Merge |
|---|---|---|
| #639 | coil-freeze lesson: practical band 35–38 °F (content-audit #99) | owner |
| #640 | air-handlers: sensor-strip prose → freeze lesson + coil-reading MA-T (#91, #92) | owner |
| #641 | pid-basics `:58` + tuner Fast/cheat-sheet rows + bank retarget (#94 #95, #324 #329) | owner |
| #642 | economizers: "lockout" at both ends, one sentence (#96) | owner |
| #643 | bacnet-networking five bullets + bacnet-basics line → scope statements (#328) | owner |
| #644 | home hero badge → Coil Freeze Protection (seasonal; Workbench anchor kept in a comment) | owner |
| #647 | DDC Workbench `#ahu-filter` → one pleated zigzag path | owner |
| #650 #648 #649 | wave 3 batch 1: building-pressure, duct-static-control, vav-systems → 15 | owner |
| #651 | `Psychro.mixAir` / `mixFraction`, `tests/psychro-mixair.spec.js`, 3.92.0 (#228 step 0) | owner |
| #652 | psychrometric-chart on `mixAir`, "% by mass" (#228 step 1) — **stacked on #651** | owner, after #651 |
| #655 #654 #653 | wave 3 batch 2: psychrometrics-basics, hydronic-loops, load-piping → 15 | owner |

Every PR has its own `test` check SUCCESS on its head (re-check with
`gh pr view N --json statusCheckRollup`; a SKIPPED entry beside it is a
body edit, see *Process notes*). A pairwise `git merge-tree --write-tree`
matrix over all fifteen found **zero** conflicting pairs, and a scratch
merge of all of them built clean and passed the full suite:
**1242 passed, 0 failed, 1 skipped in 8.2 min on `:9661`, 2026-10-07, against the scratch merge `a3cef82` of all fifteen open PRs on `main` @ `a2ad39f`**. The combined preview of that scratch merge is published at
`https://cfdev.home.arpa/` (`_built.txt` names the scratch commit; dirty
by design — it is unmerged work).

**Ledger after the night** (on the docs PR, merged on green):
`codebase-issues.md` to **#337**, `content-audit.md` to **#104**;
rulings.md gains **§19** (the fifteen evening rulings and the overnight
output). `npm run status` on `main` still reports the two
`bacnet-networking.html` coming-soon candidates — they are #643's
change; the scratch merge reports 0.

## Corrections to the previous draft — do not rediscover these

1. **"Three chain PRs merged untested" was two** (#632, #630; #626's
   merged SHA carries a `test` SUCCESS). Fixed in CLAUDE.md *Workflow*,
   codebase-issues #331 and rulings §18 is left as written with the
   correction recorded in #331.
2. **"Shipped 2026-10-05 → 06 (25 PRs)" conflated two sets.** 35 PRs
   (#603–#637) merged in that window plus #638 at 00:03Z on the 7th; the
   25 is rulings §18's walked-with-the-owner set. The 16 PRs the brief
   listed as "sixteen agenda rulings executed" execute **nine** rulings
   (eight PRs); the other eight close unrelated ledger items.
3. **"GitHub's green check on a stacked PR"** — there was no `test` check
   at all on #630/#632 (rollups showed only the Workers Build); the trap
   was a CLEAN merge state with the check absent.
4. **Four ledger collisions, not three** (the fourth: #615 × #634,
   surfaced mid-session).
5. **"Filter racks are pleated site-wide" covered the three lesson racks
   only** — the Workbench `#ahu-filter` still drew the parallel-line rack
   (ruled and redrawn overnight, PR #647).
6. **`grep -L pairedLesson html/practice/*.html` returns eight**
   (index.html matches); derive the drills with
   `grep -l '^category: field'`.
7. **CLAUDE.md's "nine consumers" was trued on #638, not #619.**
8. **The "#88 brief" is content-audit #88**, not codebase-issues #88.
9. **"Bank target 15 (ruled 2026-08-20)"** — the date is not evidenced;
   friction §*Quiz expansion* dates the direction 2026-08-14. Cite the
   friction file, not a date.
10. **content-audit #97/#98 were already accepted 2026-10-05**; the open
    by-catch was #91–#96 (all now ruled and shipped).
11. **`tests/psychro-mixstreams.spec.js` exists** and is the closer
    template for engine-direct specs than `psychro-engine.spec.js` alone.
12. **The #228 design note's cp line cites (`:209/:216/:246/:502`) had
    drifted** to `:224/:231/:261/:517` on `a2ad39f`; `buildState` has
    **no** `P` default (the note's "defaults the way buildState's does"
    had no referent — #651 chose `streams[0].state.P`, spec-pinned).
13. **The dashboard's `dashboard-extra.json` hand-pins `mainSha`** — it
    is a perishable; refresh it on every docs PR.

## The work, in order

### 1. The morning walk — fifteen PRs

**Owner decision (2026-10-06, rulings §19.13 and §18):** PR by PR, in
sequence, on the combined LAN preview; the assistant presents, the owner
approves, the assistant merges on the word.

Order and pointers: `docs/audits/2026-10-reentry/walk-2026-10-07.md`
(small content fixes → badge and Workbench drawing → batch-1 banks →
#651 then #652 → batch-2 banks). Things that need the owner's eye rather
than a diff read: the 38 °F "field settings reach … at the top" claim on
#639 is his, not cited; whether mixed-air temperature belongs in the
tuner's Fast row (#641); the `--text-dim` stroke and the cockpit-scale
legibility on #647; the two quiz explains the fixer rewrote after the
second refute round with no third round (`ds-tube-stuck-high` on #648,
`loads-see-mixed-temp` on #654); the `P` default on #651.

⚠️ **#652 is the first live test of #645's retarget arm.** When #651
merges, GitHub retargets #652 to `main` with an `edited` event; the gate
should now run the suite. If no `test` run appears within a minute,
rebase-push #652 onto `origin/main` (the standing rule) and merge only on
SUCCESS. Record which way it went in codebase-issues #331.

After each merge, `push: main` runs the suite on `main` — check the run
list once at the end rather than per PR.

### 2. Quiz growth after wave 3 — `.claude/workflows/quiz-bank-growth.js`

**Owner decision (2026-10-06, rulings §19.10):** six banks in two
batches; both batches are open. **Verified on the scratch merge:** 28
banks remain under 15 after they merge (derive again post-merge with
`npm run status`). None is BACnet; the remaining set includes the seven
field drills (no `pairedLesson` — name their source lessons in `args`).

Two workflow defects to fix before the next batch (the orchestrator
owns the script; lanes do not touch it):

- **A second refute round's open item is applied by the fixer with no
  third round** — both batch-1 open items and the batch-2 one were
  applied verbatim and correctly, but nothing checked. Add a cheap
  verify-remedy stage after the last fix (Fable, read-only, "does the
  head carry the prescribed text and does the spec still pass").
- **A lane's read of `html/scripts/quiz-engine.js` was refused** by the
  permission classifier (psychrometrics-basics lane); it worked from the
  bank, the spec and the DOM instead. UNVERIFIED — whether this is the
  path or the classifier's mood; allow it or point lanes at
  `tests/quiz-engine*.spec.js` for the schema.

Bank-wide follow-ups the lanes surfaced, logged for the owner's call:
codebase-issues **#335** (several ten-question banks key everything on
one letter and the key is the longest choice; the engine does not shuffle
choices — a reorder sweep, bank by bank) and **#334** (the engine parses
`10,000` as 10 — strip separators in one place).

### 3. #228 steps 2+ — `docs/engine-standardization.md` §4

**Owner decision (2026-10-06, rulings §18.5 and §19.12):** defaults
accepted; steps 0 and 1 are PRs #651 / #652. Next: air-mixing (the page
with three disagreeing forms), then the Workbench last, display-only;
one page per PR with a before/after fixture, fog cases enumerated.

Two doc follow-ups **deliberately left out of the overnight docs PR** so
it would not collide with #651's hunk in `engine-standardization.md`:
the §2 table's stale cp line cites, and a "Landed" line under §4 step 1.
Take them with step 2. By-catch to fold in: codebase-issues **#336**
(`buildState` has no positive-`P` guard) and content-audit **#104** (the
chart's "falls on the straight line" claim is true to ~0.8 °F).

### 4. Small by-catch, each a one-file change once ruled

codebase-issues **#332** (house spelling: *freezestat* vs *freeze-stat*,
22 hyphenated hits), **#333** (`bacnet-services.html:227` and
`bacnet-mstp.html:238` carry the #328 promise shape in words the §5 scan
does not see; widen the regex with `worth its own treatment` / `on the
roadmap`), **#337** (`building-pressure.html` callout `id`, #314 family);
content-audit **#100** (tuner Medium row names valve outputs as loops),
**#101** (bacnet-networking's "out of scope across" vs "now its own
page"), **#102** (coil-freeze-risk `:484` "common default"), **#103**
(the air-handlers widget labels a mixed-air low-limit as the stat; plus
the dangling "when it is" at `:579`). All live pages → owner merges;
bundle by file.

### 5. The F4 case-file mockup lane — friction §*The owner's dev-arc brief* (L6445 @ `a2ad39f`)

**Owner decision (2026-10-06, rulings §19.11): HOLD until wave 3 is
further along.** Wave 3 is now fully open; raise it once the banks have
merged. Mockup-first (hidden page, own spec, merge freely until it
graduates); no placeholder stories.

### 6. After the arc

Unchanged: glossary **§7.2** (`docs/glossary-arc.md`, sequenced after
the arc); the **short sitting** on A1, A4, C4, D2, D4, E2, the §0 N2 gap
and the LON go/no-go (friction §*dev-arc brief*); a **fresh Search
Console export** for the pillar re-read — the late-October timing is the
2026-10-05 agenda's (`state-map.md:120`), the last read was off the
2026-08-07 export.

**Explicitly declined or parked — do not carry as open work:** a
`[future:]`-marker cleanup of the friction file (#629 did the stale
ones); renaming `mixStreams` (Q1: no); a workbench mass-delta readout
(Q3: not now); a southern-setpoint claim in the freeze lesson (research
record §4 — no source); the hero badge's spring revert (a copy-paste from
the comment beside it, when the season turns).

## Decisions waiting on the owner

- **#332** — which spelling, *freezestat* (the lessons) or *freeze-stat*
  (widget strings, banks)? One sweep PR either way.
- **#333** — `bacnet-mstp.html:238` promises a bus *simulator*, not a
  page; narrow it like #328, or keep under the amendment?
- **#335** — go/no-go on the choice-reorder sweep across the one-letter
  banks (bank by bank, each a PR for him to read).
- **content-audit #103** — relabel the air-handlers widget's
  "freeze-stat territory" (it models a mixed-air low-limit) or leave it
  and let the new prose pointer carry the distinction?
- **#651** — confirm the `P` default (`streams[0].state.P`, not sea
  level) and the pass-through of a kernel `ok:false`.
- **#641** — keep mixed-air temperature in the tuner's Fast row, or drop
  it (not move it)?

None of these block the walk.

## Process notes that earned their keep

- **Frontload, then run.** Fifteen rulings in four `AskUserQuestion`
  rounds inside the first hour, then five sequential workflows (A: nine
  small-fix lanes; B and D: `quiz-bank-growth` triples; C: #228 steps 0
  and 1; E: orchestrator wrap-up) with no further questions. Opus
  implemented, Fable refuted every PR, Opus fixed; Sonnet was not needed.
- **A SKIPPED `test` twin is a body edit.** After #645, editing a PR's
  title or body fires `edited`, the gate skips the job, and the rollup
  lists a SKIPPED check beside the real run on the same head. Read
  SUCCESS on the head SHA.
- **The fixer-after-last-refute gap** (item 2 above): a prescribed remedy
  applied with no verification is the *verify the remedy* lesson in a
  new coat.
- **Lane-harness facts, still true:** a fresh worktree has no
  `node_modules` (`npm ci`); another worktree holding a branch name
  blocks `checkout -B` (track `origin/<branch>` under a local name);
  per-lane Playwright on a unique high port via a throwaway config in the
  foreground; the quiz workflow leaves ~14 worktrees per triple — remove
  them and prune the `refute*/` branches after each batch.
- **The orchestrator writes the ledgers.** Nine lanes, three triples and
  one stacked pair produced zero ledger collisions because none of them
  touched `docs/`.

## One passing note

The next flagship candidate is still the **F4 case-file content type**,
mockup-first, and wave 3 being fully open is the "further along" the
owner asked for. Honest read: ready for a mockup lane as soon as the
walk is done — the brief's analysis is banked, the sequencing is ruled,
and nothing else in the arc is waiting on a decision.
