# Session handoff — the 16-PR accessibility + practice batch shipped (2026-07-20)

> **Lifecycle:** written 2026-07-20, superseding the 2026-07-19 draft in
> full. That draft carried three work items — prose lint, commissioning
> drill, wiresheet drill — **all three shipped this session** (PRs #405,
> #403, #416), along with the three parked decisions it listed (#177, #168,
> #179 → PRs #409, #407, #410). Nothing from it remains open, so its
> sections are gone rather than stale. Retire this file when the air-side
> simulator ships, or sooner if a session clears the four open
> `codebase-issues` items below without starting the sim.

## Read this first

**Every claim in this file is a hypothesis. The repo is the truth.** All
measurements below were taken at `cc5856b` (grounded by command, not
recalled).

The lesson this session drove home the hard way, worth carrying into every
lane: **a correction needs the same burden of proof as the claim it
replaces, and the *remedy* needs it as much as the *finding*.** Concretely,
this session's own failures:

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
  the `#194` styleguide fix (below) and a `keep-both` conflict resolution
  that would have duplicated a comment. A fix inherits the credibility of
  its finding and lands when attention is spent. **Verify the remedy against
  the mechanism, not just the defect.**

## Where things stand

`main` @ `cc5856b`, **v3.72.0**, clean tree, **0 open PRs**. (Measurements
cite `cc5856b` — deliberate, not stale.) Counts: **40 education lessons ·
34 content quizzes + 7 field drills · 31 tools · 7 simulators.**

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

### 1. Air-side simulator — the named next flagship

**Owner direction (2026-07-19, reaffirmed by a scoping session
2026-07-20): scope it before writing engine code; decide A-vs-C on the
axis the owner actually arbitrates — can a viewer tell at a glance which
box is starving.**

⚠️ **The scoping brief on disk is stale relative to the analysis that
exists.** `docs/air-side-sim-scoping.md` is the **2026-07-19** version — it
carries the Scope options (A: AHU sequence sim; B: full air-side system;
and a dropped middle option), the two architectural calls, and "STATIC IS
NOT FLOW" as the honesty-guard concept. **It does NOT contain the
2026-07-20 scoping session's findings**, which live only in that session's
report:

- the **engine/page split** — refrigerant-loop is 787 engine lines against
  2,843 page lines, so ~78% of the cost is the page and the depiction, and
  every prior estimate sized only the engine;
- the **mockup-first test** — build 2–3 static SVGs at RL fidelity and ask
  "can you tell which box is starving" before committing scope;
- **seven open questions**, the load-bearing one being whether zone
  temperature is *state* or *input* (the second honesty guard can't be
  simulated without it, only asserted);
- the lean toward **Option A, held loosely** (the "must-be-new-physics" test
  would have killed refrigerant-loop itself, whose physics shipped first as
  `tools/refrigerant-pt.html`).

**First action for whoever takes this: capture that scoping-session output
into `docs/air-side-sim-scoping.md`** (owner has it), or the next session
re-derives it. Readiness is real — `psychro-engine.js` provides the
mixed-air/coil core and **five of the eight forced-air lessons carry
physics models with owner-blessed constants** (all but `air-balancing`,
`dedicated-outdoor-air`, and `air-unit-identification` — the last has a
widget but no physics). But the honest read from the scoping session is
that the sim is **substantially a depiction job, not a physics job**, and
that is where refrigerant-loop's cost actually went.

### 2. Prose-lint residual list — `codebase-issues` #186

The lint (#405) is report-only and on `main`. Its HIGH list beyond the two
instances #408 fixed is unworked editorial cleanup — terminal/ordinal
claims across the education chapters. **Run `npm run prose-lint`, read the
append-fragile section, and rewrite by naming the set rather than counting
it.** The owner is the editor of site prose; propose rewrites, don't
unilaterally reword voice-carrying sentences.

### 3. Contrast-guard blind spots — `codebase-issues` #194

Three boundaries, one unbounded and worth closing:

- ⚠️ **`.status-pill.warn` / `.status-pill.error` have never been
  contrast-measured.** They're shared tool-output chrome across **17 tool
  pages (20 pages in all)**, applied at runtime, so the static-page sweep
  never reaches the warn/error state, and the one static warn instance
  (`simulators/hydronic-loop-builder.html:356`) carries `hidden`.
  (`education/economizers.html` also hardcodes two static `status-pill ok`
  pills, but those aren't the verdict-colour risk.) Verdict colours are
  where contrast matters most.
- **The guard never sweeps `/styleguide.html`** — the one page whose purpose
  is exercising both registers in both themes. It's `noindex`, so absent
  from `tests/pages.js`; `responsive.spec.js:18` grafts it on explicitly,
  the contrast sweep does not.
- **The corrected fix is on the #194 entry.** ⚠️ Its *first* proposal
  ("hidden specimens on styleguide") was wrong and would have shipped a
  green test measuring nothing — the sweep never reaches styleguide (graft
  it, as `responsive.spec.js` does), and `hidden` specimens are skipped
  three ways (`:254` closest-`[hidden]`, `:263` self visibility/display,
  `:312`/`:317` ancestor-chain). Specimens must be **visible**;
  `settle()`'s `COLLAPSED_CHROME` force-reveal (`:403-409`, inside the
  `:397-415` function) is the sanctioned mechanism if visible ones read as
  noise.

**Explicitly declined / left open, do not carry as active work:**
- **#185** — the quiz `snippet` path enforces `gotcha→snippet` one-way, so a
  non-gotcha carrying a snippet is dropped from the page but still published
  to JSON-LD. **Latent — no shipped bank trips it.** Fix only if authoring a
  bank that would.
- **#191** — link *text* that names a page is unguarded even where the href
  is (`practice/index.html:72`). **Low priority** — a stale label, not a
  broken link. Only worth it if the #177 guard generalizes cheaply.

## Decisions waiting on the owner

None blocking. The three parked last session (#177, #168, #179) all shipped.
The air-side sim's seven open questions (§1) are pre-work for that flagship,
not standing decisions — surface them when that session starts.

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

## One passing note

The air-side sim is the flagship and it earns its own session. The honest
readiness read from the scoping pass: the physics core exists and five
lessons already model it, but the real cost is the *depiction* (~78% of
refrigerant-loop was page, not engine), and an air system has no natural
closed frame the way a refrigeration loop does. The owner builds equipment
graphics professionally — the mockup-first test (§1) routes the go/no-go
decision to the axis he actually arbitrates. Capture the scoping session's
output into the brief before anyone writes engine code.
