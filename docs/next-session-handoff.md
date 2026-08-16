# Session handoff — §5 shipped, §4 collision tier opens next (2026-08-15)

> **Lifecycle:** written 2026-08-15, superseding nothing — the prior
> handoff was retired 2026-08-14 (PR #568) and no new one existed; this
> session reoriented from `docs/glossary-arc.md` + memory, which proved
> sufficient. The §5 multi-benign tier shipped in full this session
> (PRs #576–#581) and appears here only as state, not work. **Retire
> this file when the §4 component ruling is taken and recorded in
> `docs/glossary-arc.md`'s decision log and the §4 lanes are running** —
> the arc doc then carries the state again.

## Read this first

Every claim in this file is a hypothesis. The repo is the truth. This
session's own verification round proved the point twice: 4 of 26
adversarial findings against the §5 drafts were scope misreadings
(fixed by writing scope INTO the data file — the SWEEP-SCOPE ruling),
and the session-start open-items sweep confidently reported a #198
claim that a one-line grep disproved. Correcting this brief is wanted;
the orchestrator — not the lane — decides what to do about a
discrepancy.

## Where things stand

`main` @ `759b396`, **v3.89.0**, clean tree, zero open PRs, zero
worktrees. (Measurements below cite `759b396`, the commit they were
taken at — that is deliberate, not stale.) Counts: **40 education
lessons · 34 content quizzes + 7 field drills · 32 tools · 10
simulators.**

Shipped this session, all merged and live-verified:

- **#576** — ledger marker true-up (#303/#304/#308 headings + #198's
  missing marker; the file's "inline marker is the only authority" rule
  restored).
- **#577** — #311 executed (owner ruled REWRITE): pid-tuner's two
  vendor sites now generic; the BACnet chapter's deliberate EBO
  hex-blob teaching untouched, confirmed in-scope-only by grep.
- **#578** — the §5 drafting PR: `glossary.js` 42 → **63 entries**,
  each §5 entry carrying a **written matching rule** in its leading
  comment (the lane contract), plus the **#312 arm** (owner ruled
  EXTEND): every non-double-quoted `data-gloss` spelling now fails the
  build, fixture-proven.
- **#579 / #580** — the marking fan-out: 38 tools marks + 72 education
  marks. **Measured end state: 369 marks site-wide — 246 education ·
  116 tools · 7 landings** (`grep -ro 'data-gloss="' html/ | wc -l` at
  `759b396`). Lane arithmetic, per-entry inventory comments, and the
  reconciliation grep agree exactly — first pass where that happened.
- **#581** — close-out: arc decision-log entry, #311/#312 resolution
  blocks, two comment-only glossary.js true-ups.

Three entries are **markless by design** (`ui`, `safety-string`,
`ak-factor` — cross-reference targets / future-page surface); do not
"fix" them by hunting for marks.

## Corrections found in flight — do not rediscover these

1. **The open-items sweep's #198 reading was garbled.** It reported
   `data-flow-static="true"` as "set on no page" — 15 education pages
   plus `refrigerant-loop` (15 paths) carry it, guard-enforced since
   `858292d`. The ledger entry now carries the addendum (PR #576).
   Lesson: a sweep agent's compressed claim about a flag is a
   hypothesis like any other — one grep settles it.
2. **Verifiers re-derive scope site-wide unless the scope is written
   down.** Four §5 findings "discovered" markable tokens on simulator
   pages — out of the marking scope, but nothing said so where the
   verifier read. The **SWEEP-SCOPE** ruling now sits in the §5 banner
   (`html/_data/glossary.js`, above `module.exports`); cite it rather
   than re-arguing.
3. **Stacked-lane base branches evaporate on parent merge.** The two
   marking lanes were briefed to open PRs against the drafting branch;
   when #578 merged mid-flight, that branch auto-deleted. A
   SendMessage redirect ("target main — your base commit is in main's
   history") saved both. If lanes stack on a branch, plan the retarget
   message at dispatch time.

## The work, in order

### 1. §4 collision tier — the component design comes FIRST

**Owner-ruled order (2026-08-14 close, reaffirmed at §5 close):**
§4 → §7.2 → re-triage.

Verified state at `759b396`: `kind: 'disambiguation'` exists **only as
a comment** (`html/_data/glossary.js:42` — "deliberately not built");
zero implementation in `.eleventy.js` or `html/scripts/gloss.js`
(grepped). §4 terms are **not eligible for plain entries** — the
glossary header comment pins this.

So the phase's first deliverable is a **design proposal for the
owner's ruling**, not entries: how a disambiguation entry renders
visibly differently, what per-context handling means mechanically
(per-compound sub-entries? context-keyed marks? exclusion), and what
the guard enforces for the new kind. Useful existing affordances: the
panel structure already admits a link line without redesign, and
`owners[]` already carries link targets (D2 decision log,
2026-08-10) — a disambiguation panel linking its canonical page
(e.g. deadband → `comparators-and-deadband.html`) is a component
change, not a data migration.

The 14 §4 term families and their per-term curation notes:
`docs/tooltip-glossary-scoping.md` §4 (starts L283, file last touched
at `3597076`): deadband · coil · differential · reset · dew point ·
low-limit/high-limit · static · head/head pressure · RTU ·
lockout/locked-out · floating · proof · valve authority/bare
authority · direct-acting/reverse-acting. Several notes already lean
"exclude entirely is defensible" (reset above all) — the proposal
should carry a per-term disposition (disambiguation entry vs
compound-split vs exclude), which is exactly the ruling the owner
takes.

⚠️ The scoping record's §4 line cites date to 2026-08-09 — line
numbers have drifted and some cited prose has since gained gloss
marks. Re-derive every cite before a lane uses it
(ledger-decay rule).

⚠️ The §5 banner's named surface rulings (SWEEP-SCOPE, ANCHORED-LINK,
CODE-NOTATION, FAQ-FRONTMATTER, UNITS-SPAN, MIXED-RUN,
COINED-COMPOUND, NAME-REFERENCE, JS-PAINTED-PROSE, DEVICE-NOUN on
enthalpy) all bind §4 marking too — accrete new ones there, don't
re-argue.

Pipeline that worked twice (phase 2, §5): read-only inventory fan-out
sized from per-page prose classification → single-writer drafting →
adversarial refutation round **before** the PR opens → ≤2 concurrent
Opus marking lanes, worktree-isolated, marks table + near-miss ledger
+ density screenshots per PR body. Fable for design/judgment, Opus for
mechanical, per the standing routing rule.

### 2. §7.2 quiz-bank gloss-component lane (after §4)

Ruled IN scope 2026-08-12, sequenced last. A `quiz-engine.js`
component decision: gloss support confined to `explain` / choice
rendering; the FAQPage JSON-LD emitter strips triggers to plain text.
Until that lane exists, **no bank counts as in scope for marking**.

### 3. The dev-arc-brief re-triage (after §7.2)

The brief is PARKED (friction file, triaged 2026-08-12). The
**quiz-expansion candidate carries the CEO signal** (owner direction
2026-08-14). Constraint verified at `759b396`: the engine's
**shuffle-order change is decided but unbuilt** (2026-07-30 — friction
file :6292 area) and should land with or before a bank-growth push.

**Explicitly declined this session — do not carry as open work:**
`bypass-leg` entry (one marginal anaphoric site, deferred to the
re-triage); `vfd-bypass` / `hot-gas-bypass` / `face-and-bypass` / DPBV
entries (reasons in the §5 banner); marking the landings for §5 terms
(structurally empty — navCard macro args).

## Decisions waiting on the owner

None block the work above. The ledger's standing decision-class items
(#268 ahu-desc shape, #283's T-C marker-register detail, #255 option 3
typography lane, #228 engine standardization — scheduled separately)
live in `docs/codebase-issues.md`; the inline marker is the only
authority there, and #303/#304/#308/#311/#312 were all closed this
session.

## Process notes that earned their keep

- **Lane Playwright in a worktree**: throwaway config OUTSIDE the repo
  on a unique high port, `reuseExistingServer: false`, foreground
  only. Both §5 lanes hit the same two traps: ESM ignores
  `NODE_PATH`, and `@playwright/test` is CJS — a capture script needs
  the default-import form.
- **curl the live site with `-L`** — the `.html` → clean-URL 301 makes
  a bare `curl | grep` return empty and read as a failed deploy.
- **The refutation round pays for itself on definitions**: 4 BLOCKING
  catches on 21 drafts, the best being a def that contradicted its own
  designated mark site (AO as "position" under a VFD speed-reference
  sentence). Budget it before every drafting PR.
- **The `owners[]`/marks guard is a working backstop, but don't
  discover suppression by build failure** — lanes read `owners[]`
  first; the education lane's independent owner-self-mark probe came
  back clean because of it.

## One passing note

After the arc: the re-triage's strongest candidate is quiz expansion
(CEO signal, owner appetite already recorded). Readiness is genuinely
good — the banks are the one §7.2-gated surface, so sequencing the
quiz-expansion arc right behind the quiz-bank gloss lane would let one
`quiz-engine.js` review cover both.
