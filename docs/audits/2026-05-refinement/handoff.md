# Refinement-phase handoff

> **Archived 2026-05-27.** The refinement phase closed when all three
> tiers of `priorities.md` shipped (PRs #142–#150 + the tidy-up PR
> that retired this folder). Kept as a record of the cadence used
> during the cycle; future refinement phases can borrow the per-item
> lifecycle and tracker-hygiene shape from here.

Operating doc for picking up the refinement backlog one item at a
time. Built 2026-05-25 alongside `priorities.md`, which
is the source of truth for what to work on.

This handoff is the *how*; `priorities.md` is the *what*.

---

## Start here

1. **Open `priorities.md`.** Pick the top unchecked
   item in the highest tier you have time for (Tier 1 = quick
   wins, Tier 2 = medium lifts, Tier 3 = structural).
2. **Check the source.** Each item carries a `[content-audit #N]`
   or `[SEO]` tag — open that source file (or the relevant
   template) to confirm the finding is still applicable. The
   audit is a 2026-05-24 snapshot; ground may have shifted.
3. **Enter plan mode (`/plan`).** Every item — even the
   one-string Tier 1 ones — runs through the per-item lifecycle
   below. Plan-mode-first is the established cadence (see
   `feedback_codebase_issues_sweep` memory).

---

## Per-item lifecycle

Same shape as the codebase-issues sweep workflow. Canonical
reference: `feedback_codebase_issues_sweep` memory + CLAUDE.md
`## Git conventions`. Short version:

1. **Plan mode** — Explore → design → AskUserQuestion on any
   open decisions → write plan file → ExitPlanMode for approval.
2. **One item, one branch, one PR.** Branch off updated `main`
   (`git checkout main && git pull --ff-only` first).
3. **Branch naming** — for content-audit items, use
   `fix/<slug>` or `refactor/<slug>` (these aren't tracked in
   `codebase-issues.md`, so the `issue-NN/` prefix doesn't apply
   — they cite their source in the PR body instead).
4. **Commit subject** — semantic-area prefix for code changes
   (`landings:`, `tools:`, `simulators:`, `education:`, `head:`,
   etc.); Conventional Commits prefix (`docs:` / `chore:`) for
   non-code.
5. **Commit body** — *why* (cite the source finding by number)
   + *what changed, per file* when 3+ files touched.
6. **PR body** — `## Summary` / `## Changes` / `## Test plan`.
   Cite the source finding in the Summary (e.g. *"Closes
   content-audit #11 — Home 'My Most Common Tools' framing"*).
7. **Push → `gh pr create` → stop and surface the PR URL.** The
   user reviews on GitHub + the Cloudflare Workers Build preview
   (~60s after push). Do not pick up the next item until they
   sign off.

Reminder: Claude drives the full cycle through PR creation;
**only merging is manual** (the user merges on GitHub after
review).

---

## Batching pairs

Most items ship as their own branch/PR. A few in
`priorities.md` are explicitly noted to batch — when
those, ship them as one branch with multiple commits (one per
finding) so each fix is independently bisectable but the design
context lands together:

- **Voice cluster** — `#11` + `#15` + `#16` (Home/hero voice).
  One branch (suggest `fix/home-voice-cluster`), three commits.
- **Prereq link placement** — `#22` + `#28` (psych chart + PID
  tuner). One branch (suggest `fix/prereq-link-placement`), two
  commits, identical fix shape.
- **Cold tools + missing preambles** — `#20` + `#21` (signal-
  scaling / modbus / bacnet-ip get defaults *and* preambles).
  One branch (suggest `fix/simple-tools-onboarding`), 3–6
  commits depending on how you split.
- **Chips + curriculum on /education/** — `#12` + `#17`. One
  branch (suggest `refactor/education-chips-curriculum`),
  commits per concern. **This one needs an explicit design
  decision first** — use AskUserQuestion in plan mode to pick
  between drop-singletons / reframe-as-jump / drop-chips-entirely.

When in doubt, prefer one PR per finding — small PRs review
faster.

---

## Tracker hygiene as items land

Every PR should include the bookkeeping for what it closed:

- **Check the item off in `priorities.md`** (turn
  `- [ ]` into `- [x]` in the same commit that lands the fix, or
  a final commit on the PR). Keeps the file functional as a
  tracker.
- **Add a Resolution line to `content-audit.md`** under the
  finding being closed, matching the existing pattern:
  `**Resolution (YYYY-MM-DD):** <one paragraph on what landed>.`
  See findings #1–#9 for the canonical shape.
- **If a new code-quality issue surfaces in passing** — append
  it to `codebase-issues.md` under *Open* and mention it in the
  PR body. Don't silently fix inline (scope creep) and don't
  drop it (gets lost). Same rule as the codebase-issues sweep.
- **If a new content/editorial finding surfaces** — append to
  the appropriate audit batch's *Substantive findings* or *Minor
  polish* section with the next sequential number (current
  ceiling: #33).

---

## AI-codebase pitfalls to push back on

The user is a building-automation programmer learning software
dev workflows. If you catch yourself drifting toward any of
these on a refinement item, surface it explicitly:

- **Inconsistent conventions across sessions** — the refinement
  items often touch shared patterns (eyebrows, titleShort,
  copy-button labels). When picking a rule, document it in
  CLAUDE.md under *Conventions* so the next session doesn't
  re-drift.
- **Stale comments / CLAUDE.md drift** — after any refactor,
  audit comments + CLAUDE.md + README for places that still
  describe the old shape.
- **Dead code / dead CSS** — when a new pattern lands, sweep
  for old call sites and remove. The `[data-sbg-stroke]` and
  `pathLength` gotchas in CLAUDE.md are the cautionary tales.
- **Over-engineering** — many items here are one-string changes.
  Don't reach for a new helper or abstraction when a literal
  edit will do.
- **Backwards-compat shims for code that isn't called.** No
  removed-export comments, no renamed-var aliases. Delete it.
- **Tests that pass without verifying behavior.** When adding
  schema or new templating, the smoke test should actually
  assert the rendered output, not just status 200.

---

## Sweep convention reminder

CLAUDE.md `## Workflow` calls this out: when a convention shifts
(new CLAUDE.md bullet, new shared rule, new `:root` token,
renamed pattern), **grep site-wide before closing the PR.** Two
directions:

- *Convention → consumers.* Grep existing pages for the old
  pattern and update in the same PR.
- *New page → conventions.* Re-run the *Adding a new tool*
  checklist against any new page.

Several Tier 2/3 items in `priorities.md` are
convention shifts (eyebrow taxonomy, titleShort discipline,
failure-state idiom, narrow-width callout pattern, copy-button
labels). Each is a sweep-on-close candidate.

---

## What's NOT in scope

The "Deferred / out-of-scope" tail of `priorities.md`
enumerates these. Headline: **wishlist features stay parked**
(refrigerant cycle education, controller commissioner sim, more
quizzes, multi-select question type). Those are v2/v3
expansion, not refinement. If a wishlist item starts feeling
load-bearing during the refinement phase, raise it explicitly
with the user — don't quietly pull it into a refinement PR.

---

## When to retire this doc + the priorities file

Retire when Tier 1 of `priorities.md` is empty. At
that point either:

- **The refinement phase is done** — close the file, update the
  README/CLAUDE.md if any conventions changed during the sweep,
  and start a fresh chapter (probably the next wishlist item).
- **A fresh survey is warranted** — the audit is from
  2026-05-24; if it's been weeks of work, re-run the four-bucket
  survey to catch new drift before declaring done.

---

## Quick reference

- **Source of truth:** `priorities.md`.
- **Per-item workflow:** `feedback_codebase_issues_sweep` memory
  + CLAUDE.md `## Git conventions` + `## Workflow`.
- **What lands in this PR vs. gets logged:** code-quality
  issues → `codebase-issues.md`; new content findings →
  `content-audit.md`; resolutions → check off the item in
  `priorities.md` AND add a Resolution line to the
  source audit finding.
- **Stop point:** every PR ends at `gh pr create` + URL
  surfaced — never auto-pick the next item.
