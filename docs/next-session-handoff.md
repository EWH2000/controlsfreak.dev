# Session handoff — cleanup done, air-side simulator is next (2026-07-21)

> **Lifecycle:** written 2026-07-20, updated 2026-07-21. The 16-PR
> accessibility + practice batch and the #194 contrast-guard work all
> shipped (PRs #402–#418); the #186 prose-lint residual is triaged, with
> its one genuine fix in **PR #419** (merged). What's left is the **air-side
> simulator** (§1) — the next flagship, and the reason this file still
> exists. Retire it when the sim ships.

## Read this first

**Every claim in this file is a hypothesis. The repo is the truth.** The
batch retrospective's measurements were taken at `cc5856b`; the
current-state figures at `a74f27d` — both grounded by command, not
recalled.

The lesson the 2026-07-20 → 07-21 cleanup arc drove home the hard way,
worth carrying into every lane: **a correction needs the same burden of
proof as the claim it replaces, and the *remedy* needs it as much as the
*finding*.** Concretely, the arc's own failures:

- A "correction" that **made a true statement false.** The predecessor said
  "five of the eight forced-air lessons contain working models"; a
  verification pass read that against a "the other six" elsewhere in the
  same doc, called it a contradiction, and changed five→six. Both numbers
  were right — they count *different things* (6 lessons have a widget, 5
  have a *physics model*; `air-unit-identification` has 15 controls but zero
  physics constants — it's a decision tree). Reverted in #402. **Before
  reconciling two numbers, establish what each counts.**
- **Scope was understated seven times running** — "37 banks" (39), "two
  pages" (13), "~46 pages" (47), "one token" (three), "two selectors" (47
  shapes / 600 elements), "concentrated in hydronics" (three chapters),
  "~205 mechanical removals" (would have stripped 50 load-bearing ones as a
  regex). Every one was caught by a lane checking rather than trusting.
  **Assume the real scope is larger than the brief states.**
- **Two fixes shipped that were wrong while their findings were right** —
  the `#194` styleguide fix (the *hidden-specimen* first proposal, since
  corrected and shipped in #418) and a `keep-both` conflict resolution
  that would have duplicated a comment. A fix inherits the credibility of
  its finding and lands when attention is spent. **Verify the remedy against
  the mechanism, not just the defect.**
- **A direct-to-main handoff commit got bundled into a PR** (2026-07-21):
  committed to local `main` but not pushed, then a PR was cut off local
  main — so it silently carried the handoff diff. A **single-agent
  fresh-eyes review** caught it (plus a separate overstated guard claim)
  that the author hadn't. **Push `main` before cutting a PR from it, and
  take a review agent's findings seriously — they catch what you
  rationalised.**

## Where things stand

`main` @ `a74f27d`, **v3.72.1**, clean tree, **0 open PRs**. The batch
retrospective below cites
`cc5856b`, where those measurements were taken — deliberate, not stale.
Counts: **40 education lessons · 34 content quizzes + 7 field drills ·
31 tools · 7 simulators.**

**The batch — 16 PRs, all merged, in dependency order:**

- **#402** — corrected 12 disproven claims in the predecessor handoff, then
  reverted one of its own (the five/six above).
- **#403** — Controls Commissioning field drill (11-question bank; the
  11th, a hardwired-freezestat-vs-software point, was the owner's restore).
- **#404** — optional `figure` field on quiz questions for inline SVG
  diagrams, kept out of the two text-stripping paths (`buildQuestionName`
  JSON-LD, the Review/miss table). Validation enforces *resolution*, not
  presence. Plus the 320px `PHONE_SE_PAGES` coverage gap.
- **#405** — `.github/scripts/prose-lint.mjs` + `npm run prose-lint`.
  **Report-only** (exits 0, not in `test.yml`). Flags terminal/ordinal
  claims that go stale on append, split into append-fragile (HIGH) vs
  insertion-fragile (MEDIUM) classes that are **never summed** — the
  conflation is what broke its two prior formulations.
- **#406** — logged `codebase-issues` #185–#195.
- **#407** — recorded the label-hierarchy standing answer (#168) as
  working-as-designed. **Zero-pixel** — comment + docs only.
- **#408** — de-counted the four hub-landing intros and the ordinal recaps
  (#186/#187), and narrowed the count-rule in `CLAUDE.md`.
- **#409** — home Practice desc drift guard (#177): derives the named page
  from the desc, fails if it stops existing.
- **#410** — lesson-prose paragraph rhythm (#179) via a new
  `body.education-page` body class emitted from `nav: education`
  frontmatter (`layouts/page.njk`); shared rule scoped to `.tool-body`.
- **#411** — quiz random **sampling** (#189): `buildQueue()` samples an
  oversized bank instead of slicing its head. Gate is
  `bankOverflows && count < total` (`quiz-engine.js:503`), deliberately not
  `count < total`, so the 39 exact-count banks behave bit-identically.
- **#412** — light `--text-dim` → `#636b63` (#188), clearing AA on the
  recessed `#e8ece4` surfaces. Dark untouched.
- **#413** — `.bit-idx` → `color: var(--text)` at full opacity (#192).
- **#414** — `tests/contrast-sweep.spec.js`: a **BLOCKING** WCAG-AA sweep
  over every manifest page in **both themes**, compositing `opacity` and
  resolving effective backgrounds by ancestor walk (#193). Sub-threshold
  shapes were fixed via the `-ink` token family; the spec's `ALLOWLIST`
  carries **two** measured-ratio exceptions (`.psy-pill.off`,
  `.vfdm-ext-row.inactive`). Its walker math is pinned against a self-test
  of known-answer ratios. *(The "114 / 71 / 43" split is not reproducible
  from the tree — no such counts live in the spec and the `ALLOWLIST` holds
  two entries, not 43.)*
- **#415** — stripped 201 redundant inline paragraph margins (#190),
  converging hydronics' 1.1rem to the 1.25rem house rhythm. Per-occurrence,
  not regex — classed prose and out-of-selector paragraphs kept their
  load-bearing inline margins.
- **#416** — Wiresheet Traces field drill (13-question bank, 3 static SVG
  figures cloned by id; the first real consumer of #404's `figure` field).
- **#417** — reconciled six `codebase-issues` statuses that shipped but
  still read "open / fix in flight."

**Post-batch, in the 2026-07-21 cleanup arc:**

- **#418** — closed the #194 contrast-guard blind spots: grafted
  `/styleguide.html` onto the sweep (`SWEEP_PAGES`, as `responsive.spec.js`
  does) and added visible `.status-pill` verdict specimens, so the
  `.warn`/`.error` inks (runtime-only elsewhere) are now measured in both
  themes. Falsifiability proven by mutation. **v3.72.1.**
- **#419** (merged) — the one genuine append-fragile prose fix from the #186
  triage (the building-pressure intro's "Two pages… have now made the same
  promise"); the other four HIGH candidates pass the falsifiability rule
  and were left as-is (owner-confirmed on the live site).

## Corrections to the previous draft — do not rediscover these

1. **The air-side-sim scoping output is *lost*, not owner-held.** The
   2026-07-20 draft's first action was "capture that scoping-session output
   into `docs/air-side-sim-scoping.md` — owner has it." He does **not** —
   it was lost in the merge shuffle (owner, 2026-07-21). The load-bearing
   findings survive (§1); **six of the seven open questions did not.** Don't
   spend a lane hunting the artifact — re-derive scope *with* the owner,
   mockup-first (§1).
2. **`npm run prose-lint`'s HIGH list over-flags — close-read to dismiss.**
   Of the five HIGH append-fragile candidates triaged 2026-07-21, **only
   one was genuine** (fixed in #419); the other four pass the falsifiability
   rule — named pairs/triples and "last page" *backward-reference*
   homographs the lint can't disambiguate (owner re-checked on the live
   site). Read the sentence before rewriting; don't churn prose that already
   passes.

## Standing constraints now live on `main` — design new work around these

- ⚠️ **The contrast guard blocks.** `tests/contrast-sweep.spec.js` runs in
  `npm test` and fails the build on any text element under 4.5:1 (small) /
  3:1 (large), **in either theme**. A new page — the air-side sim
  especially — must clear it. **A new gradient device face is a specific
  trap:** the guard excludes the equipment register (`.device`, `.lcd`,
  `.keypad`, `.gauge.eq`, `.cw-term`) *by name*, so reusing those classes
  buys exemption — and a *new* gradient surface is only **partly**
  covered: the sweep flattens each backdrop to one colour, so it flags a
  gradient face only where the text *also* fails that flattened
  approximation; text that clears it passes silently and the gradient's
  own light/dark spread is never assessed. What the guard cannot see is
  tracked as **#194** — do not read it as complete coverage.
- **Banks can exceed the presented count.** `#411`'s sampling means a
  15-question bank presents a random 10 per run. Author bigger banks for
  replayability; keep `defaultCount: 10`.
- **`figure` field exists** for quiz diagrams. Owner-ratified `<desc>`
  shape (2026-07-20): describe topology and live values **fully**, never
  name the fault — the verdict lives in `explain`. See `CLAUDE.md` under the
  quiz/drill checklist.
- **`npm run prose-lint`** is the input to any future prose/format session.
- **`CLAUDE.md` gained several conventions this session** (all on `main`):
  the count-rule narrowing (a count is a violation only if appending can
  falsify it), the lesson-prose-rhythm hook, the `-ink` contrast-fix
  guidance, and the figure `<desc>` ruling. Inherit them as settled. (The
  per-widget-opacity standing answer #195 lives in
  `docs/codebase-issues.md`, not `CLAUDE.md`.)

## The work, in order

### 1. Air-side simulator — the next flagship, owner-active from the start

**This is the next flagship, and the owner is hands-on in it** (his call,
2026-07-21) — not "supply a brief and hand off," but scope and design it
*with* him. That's the right shape for two reasons pointing the same way:
the go/no-go axis is *can a viewer tell at a glance which box is
starving*, and the owner builds equipment graphics professionally. So the
first session **leads with mockups and his eye, not engine code.**

**Scope will evolve — don't over-lock it up front.** The owner's own
framing (2026-07-21): he'd love to lock scope before building, but knows
ideas will come as he interacts with a working artifact — *the same way
they do working in his field.* Treat the initial scope as a starting
point, not a contract; budget for it to grow and shift once there's
something on screen to react to. That is a reason to get a rough
interactive mockup in front of him **early**, not late.

**Concrete first move — the mockup-first test.** Build 2–3 static
air-side SVGs at refrigerant-loop fidelity (an AHU with OA/RA/coils/fan;
a starved zone vs a satisfied one) and put the question to him directly:
can you tell, at a glance, which box is starving? His visual read decides
Option A (AHU sequence sim) vs a fuller air-side system — and whether
it's worth building at all — before a line of engine code.

⚠️ **The detailed 2026-07-20 scoping doc was lost in the merge shuffle;
its load-bearing findings survive here and in `codebase-issues`, so this
is not a restart:** ~78% of a refrigerant-loop-class sim is *depiction*,
not engine (787 vs 2,843 lines); the mockup-first test above; the lean
toward **Option A, held loosely** (a "must-be-new-physics" bar would have
killed refrigerant-loop itself); and the one load-bearing open question —
is zone temperature **state or input** (the "which box is starving"
honesty guard can only be *simulated*, not asserted, if it's state).
What's gone is the working doc — **six of the seven open questions were
never written down.** Re-deriving them *with* the owner is a natural first
step, not a recovery job.

**Readiness is real.** `psychro-engine.js` provides the mixed-air/coil
core, and **five of the eight forced-air lessons carry physics models
with owner-blessed constants** (all but `air-balancing`,
`dedicated-outdoor-air`, and `air-unit-identification`).
`docs/air-side-sim-scoping.md` is still the **2026-07-19** version — the
next session updates it *with* the owner as scoping is rebuilt, not as a
spec to capture.

### 2. Prose-lint residual list — `codebase-issues` #186 (largely worked)

The lint (#405) is report-only and on `main`. The five HIGH append-fragile
candidates around the forced-air chapter were triaged 2026-07-21: **one
genuine fix shipped in PR #419** (the building-pressure intro), the other
four pass the falsifiability rule and were left as-is — named
pairs/triples and backward-reference homographs, owner-confirmed on the
live site. **Eight more HIGH `npm run prose-lint` items remain
untriaged**; expect a similar hit rate (mostly homographs to dismiss, a
genuine count here and there). Run the lint, read the append-fragile
section, reword by *naming the set* rather than counting it — and dismiss
the homographs by reading the sentence. The owner is the editor of site
prose; propose, don't unilaterally reword voice-carrying lines.

### 3. Explicitly declined / left open — do not carry as active work

(#194 contrast-guard blind spots **shipped** in PR #418 — see the
post-batch note above.)

- **#185** — the quiz `snippet` path enforces `gotcha→snippet` one-way, so a
  non-gotcha carrying a snippet is dropped from the page but still published
  to JSON-LD. **Latent — no shipped bank trips it.** Fix only if authoring a
  bank that would.
- **#191** — link *text* that names a page is unguarded even where the href
  is (`practice/index.html:72`). **Low priority** — a stale label, not a
  broken link. Only worth it if the #177 guard generalizes cheaply.

## Decisions waiting on the owner

None blocking. The air-side sim's open questions (§1) are now **live design
work done *with* the owner**, not a queue to hand him — the mockup-first
test is how they get answered. The #186 prose-lint fix (PR #419) has merged.

## Process notes that earned their keep

- **The multi-checker loop caught real errors at every layer** — in the
  incoming handoff, in lane output, in review-agent *diagnoses*, and in the
  orchestrator's own claims more than once. Budget an adversarial
  re-check of any correction before acting: this session, **7 of 19 proposed
  corrections in one pass, and 8 of 9 in another, were themselves wrong.**
- **"Keep both" is a heuristic for parallel *additions* only.** When both
  sides change the *same* line or comment, keeping both duplicates or
  contradicts — keep one. It flipped three times this session (a bit-idx
  note, one-off docs, an `.eleventy.js` comment). The tell: "did both sides
  touch the same thing, or add different things in different places?"
- **Reconcile against the built site, not a prose ledger.** Six issues
  shipped but read "open" until #417 trued them — that's how phantom work
  propagates. `docs/codebase-issues.md` is orchestrator-only; the
  orchestrator flips statuses when PRs land.
- **The one working tree is shared.** Lanes and even a separate merge
  session must never `git checkout` in the primary checkout at
  `/home/ehill/controlsfreak.dev`; use a detached worktree at
  `origin/<branch>` and `push HEAD:<branch>`. A stacked PR merged via merge
  commit auto-retargets its child to `main` (no manual retarget, no branch
  deletion needed). ⚠️ **Stacked children never ran the Playwright suite** —
  `test.yml` fires on PRs targeting `main`, so a child gets its first suite
  run only after retarget; wait for it before merging.
- **Per-lane Playwright** needs a throwaway config on a unique high port,
  `reuseExistingServer: false`, run in the foreground. Port 8000 is held by
  a rootless podman `pasta` listener. One flake per full run is normal.
- **Tell every lane the brief is a hypothesis**, that correcting it is
  wanted, and that the orchestrator — not the lane — decides what to do
  about a discrepancy. This session's lanes reported dozens of brief-vs-repo
  discrepancies rather than silently accommodating them; that is why the
  merged history is correct.
- **A single-agent fresh-eyes review earns its cost on a finished PR.**
  (2026-07-21) One general-purpose agent, given only the PR plus the repo's
  own conventions — no author reasoning — reproduced every load-bearing
  number and caught two real issues the author had missed: a mis-scoped PR
  (the bundled handoff) and an overstated guard comment. Give it the
  conventions so it doesn't false-positive; withhold your conclusions so it
  stays independent.

## One passing note

The air-side sim is the flagship and it earns its own session — an
owner-active one. The honest readiness read: the physics core exists and
five lessons already model it, but the real cost is the *depiction* (~78%
of refrigerant-loop was page, not engine), and an air system has no
natural closed frame the way a refrigeration loop does. The owner builds
equipment graphics professionally and wants to be hands-on, so the
go/no-go rides on his eye — **start with mockups, expect the scope to
evolve as he interacts with them, and don't write engine code until the
"which box is starving" test passes in front of him.**
