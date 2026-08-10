# Session handoff — Phase 9 shipped whole, the glossary arc is decided (2026-08-09)

> **Lifecycle:** written 2026-08-09, evening. The previous file of this
> name was retired earlier the same day (PR #494) when its own condition
> — #275 owner-decided, PR #488 merged — came true; every one of its
> work items then shipped before this file was written, so nothing
> carries over from it. **Retire this file when the glossary arc is
> properly open: the curation rule ratified (accepted or amended) AND
> the pilot-surface design has an owner decision.** At that point the
> arc runs on its own plan and this brief has no job left.

## Read this first

**Every claim in this file is a hypothesis. The repo is the truth.**
Correct it and tell the orchestrator; do not quietly work around a
discrepancy. Today's session re-proved the pattern three times: an
engine-direct refutation overturned PR #488's own fog-recipe story (and
survived an independent re-run before anyone acted on it), a synthesis
lane caught the orchestrator's brief overstating a collision
("register" was never checked), and a verification lane found a
shipping defect (the reset message wiped by its own repaint) that a
full green suite had passed. **Refute before you act; re-run before
you refute.**

## Where things stand

`main` @ `a341878`, **v3.83.0**, working tree clean, **zero open PRs,
zero non-main branches, zero stashes** — the cleanest state this repo
has been in. Counts, measured at `a341878`: **40 education lessons ·
34 content quizzes + 7 field drills · 31 tools · 9 simulators**
(10 files under `html/simulators/`; `ddc-workbench-ahu-mockup.html` is
hidden and carries no canonical — grep-verified).

Thirteen PRs merged today (#488–#500). The five live ships, v3.80.2 →
v3.83.0:

- **#492** — `start-stop-commands` gained the instrumentation-gap beat
  (the safety string's contacts may not be points) with the owner's
  war story, plus a bank question.
- **#488** — Phase 9A: the hardwired low-limit stat the controller
  cannot see (not a roster point — the gap IS the lesson), software
  `LLS Trip` 35 → 41 from field practice, the reset-message ordering
  fix, and the **sustained-cold ramp** (the OA slider writes a target;
  `oaT` walks at 0.5 °F/sim-s; presets snap).
- **#493** — the FCU override drift announces on change-of-value
  (INC = 2 °F canonical), closing #229; the stranded branch and stash
  were retired after triage.
- **#495** — the JUMPERED defeat on the stat's device face: the latch
  keeps setting underneath, it survives presets and program switches,
  and the latch-vs-contacts contrast is taught as two different field
  signatures. The workbench joined the damage-stakes convention (note
  on both tabs) — knowingly reopening the pre-Phase-8 "CLOSED" ruling.
- **#496** — #275 resolved: the workbench remembers the simulation
  across every navigation path (per-tab `cf_ddcw_ahu` / `cf_ddcw_fcu`,
  a shape fingerprint that self-invalidates on model change, a
  one-shot resumed notice with Start fresh, `privacy.html` in the same
  PR). #260's mount reset is deliberately preserved and spec-pinned
  from both sides.

The docs PRs (#489/#490/#491/#494/#497/#498/#499/#500) left the
durable records current: `docs/air-side-sim.md` §Phase 9A (including
the **corrected fog-recipe history**), the #275/#229 resolution blocks,
`docs/warm-climate-freeze-protection.md`,
`docs/tooltip-glossary-scoping.md`, and the friction file's tooltip
entry carrying both the candidacy analysis and the DECIDED note.

## Corrections and traps from this session — do not rediscover these

1. **The fog-recipe history was wrong in PR #488's own body and spec,
   and is now corrected everywhere** — the recorded settled-winter
   reproduction (OAT −15, damper 60 %) SURVIVES the stat, because the
   settled program holds the hot-water valve at 100 %; only the spec's
   arrival-plant recipe was retired. Read `docs/air-side-sim.md`
   §Phase 9A before touching anything fog-adjacent; the ruling-5 entry
   and both LLS backlog entries carry pointers so the stale story
   cannot come back.
2. **The item-5 sheet-note mention counts are STALE.** They were
   re-derived at `b80afe1` (proof 8 · low limit 6 · economizer 6 ·
   latch 5 · differential 2 · PID 1), but #488 and #495 rewrote and
   grew the sheet notes since (11 `ddcw-sheet-note` class hits at
   `a341878` vs 9 paragraphs then). **Re-derive before the pilot
   design, with the recorded counting rule:** strip tags and collapse
   whitespace first, match stems with `[- ]` for compounds, and state
   whether hrefs were excluded.
3. **`gh pr merge` fails on a draft PR** with a GraphQL error, and
   lane-opened PRs are drafts by instruction — `gh pr ready` first.
   This silently killed one watch-and-merge chain today.
4. **Parallel minor bumps git-merge CLEANLY when both sides picked the
   same number** — no conflict, semantically wrong. Whichever PR
   merges second re-bumps from the new base (`npm version` — never
   hand-edit); it happened three times today (3.81.1, 3.82.0, 3.83.0).
5. **Removing a worktree you are standing in** makes every subsequent
   command in the chain fail on `getcwd` — run post-merge steps from
   the main worktree, and treat the trailing error as noise only after
   confirming the push/merge actually landed.

## The work, in order

### 1. Open the glossary arc — ratify the curation rule

**Owner decision (2026-08-09): the glossary/tooltip arc takes the
flagship slot** — over the branching scenario drills and the MS/TP bus
simulator, both parked, neither rejected. The decision record and the
arc's opening shape are the friction file's DECIDED note (PR #500);
the evidence is `docs/tooltip-glossary-scoping.md` (60 terms; 17
single-sense / 14 colliding / 13 multi-benign / **16 honestly
unchecked** — the collision dispatch never sent them; ~2,360 marking
sites as a mechanism-stated estimate, ~1,610 with the quiz banks
scoped out, which they should be — engine-painted DOM plus FAQPage
JSON-LD makes them a `quiz-engine.js` component decision, not a
content pass).

**First move, before any design or code: the owner ratifies, amends or
rejects §8's draft curation rule.** It is explicitly not in force. The
collision tier (deadband, coil, differential, reset, RTU — senses
co-occurring inside single quiz explains) settled hand-marked over any
walker; definitions are written in house voice under the two-senses
discipline; the sixteen unchecked tier-1 terms get their sense check
at definition-writing time, not on faith.

### 2. The pilot surface — the sheet-note pass, reshaped

**Owner direction (2026-08-09): dense pages ship background prose
collapsed, expandable per section** — his idea, now a standing
preference. The old item-5 linking pass is reshaped into the arc's
pilot: inline links to owning lessons (page grain) + collapsible
background sections (section grain) + the first hand-marked glosses
(term grain), one disclosure system. Constraints that survive from the
original ruling: prose answering *"what is this machine doing right
now"* stays always visible — only *"what is this thing"* background
may collapse; and any new collapsed pattern must be added to
`tests/contrast-sweep.spec.js`'s force-open list or its ink is never
measured.

⚠️ **A reconciliation is owed at design time, in front of the owner:**
the tooltip-component analysis rules the first surface must NOT be the
AHU (busiest page, hover already spent on annotation highlighting) —
but the sheet notes ARE the workbench pages. One candidate resolution:
pilot the *collapse* on the sheet notes while the *tooltip component*
pilots on a mid-density page; do not pre-decide it.

### 3. Small open follow-ons (any lane slot, no ordering)

- **#278** — FCU ramp parity, now buildable: #496's first commit moved
  the FCU knobs onto the plant, which is where the target field wants
  to live. Share or identically derive the 0.5 rate.
- **#279** — the FCU stage-button sub-pixel touch-floor flake (fix
  shapes in the entry). **#280** — `--led-*` constants for the
  theme-constant device face. **#281** — the fbe `loadExample` race.
- Older open entries stand: #262 (44×44), #266 (hit-area bleed, design
  call), #274 (simulators-landing chips taxonomy, owner design call),
  plus the #263/#264/#265/#269/#273 candidates.

**Explicitly parked — do not carry as open work:** the scenario drills
and the MS/TP sim (parked by the next-arc decision); #260's mount-reset
fix (its own PR, `fbe-editor.js` reaches three live pages).

## Decisions waiting on the owner

- **The curation rule** (§8 of the scoping record) — the arc's gate;
  nothing in the arc starts before it.
- **The pilot-surface reconciliation** (item 2's ⚠️).
- Neither blocks the item-3 follow-ons.

## Process notes that earned their keep

- **Opus lanes execute; the orchestrator verifies.** Two CPU lanes is
  the ceiling. Every lane is told the brief is a hypothesis — today
  three lanes corrected their briefs and every correction survived
  adversarial re-check before being acted on. The base rate held
  again: refute before acting, **re-run before refuting**.
- One lane → one worktree → one branch → one draft PR; `npm ci` first
  in a fresh worktree; foreground Playwright on a throwaway config
  OUTSIDE the repo on a unique high port (8000–8099 are occupied).
  One flake per full run is normal — isolate before believing it
  (#279 and #281 are the currently-known flake mechanisms).
- **`docs/codebase-issues.md` is orchestrator-only.** Lanes report;
  the orchestrator writes.
- Merge-captain rules: check draft status before merging; version =
  whichever merges second re-bumps; verify CI is green **for the tip
  being merged**; docs-only PRs merge freely and must not pile up.
- Screenshot capture traps are in project memory
  (`mockup-capture-element-screenshot-trap`): smooth-scroll pages
  animate `scrollTo`, state changes move anchors — measure rects live,
  scroll instant, assert the landing.

## One passing note

The flagship slot is filled by decision, not drift, and the arc
arrives unusually well-armed: a measured inventory, a drafted rule
awaiting ratification, a settled mechanism, and a pilot surface that
was already owed its own pass. Honest readiness: **high** — the two
open risks (the creep rule, the pilot reconciliation) are both
owner-gated on purpose, which is where this repo's risks belong.
