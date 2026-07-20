---
name: verify-handoff
description: Fact-check an incoming handoff doc or subagent brief against the controlsfreak.dev repo before any work starts — extracts every factual claim, proves or disproves each with a command, and reports corrections with file:line evidence. Use at session start when resuming from a handoff, or before dispatching a brief to a lane.
---

# Verify a handoff or brief

The incoming brief is a **hypothesis**. This skill turns it into a verdict
before a single lane spends effort on it.

Run this **before** acting on a handoff, and **before** dispatching any
brief to a subagent. A wrong premise in a brief multiplies across every
lane it touches and lands in merged history.

## What to verify

Default target: **`docs/next-session-handoff.md`** — the rolling brief,
and the file `/handoff` writes. Read it without being given a path.

Verify something else when the user names a path, pastes a brief inline,
or the work is arc-scoped: an arc with its own multi-session identity uses
`docs/<arc>-handoff.md`, and completed cycles archive to
`docs/audits/<topic>/handoff.md`. Same paths `/handoff` writes to — the
two skills are two ends of one loop, so keep them in step if either moves.

If the default is absent, say so and stop rather than hunting for a
substitute; a missing handoff is itself worth reporting.

## Why this exists

- One draft of `docs/next-session-handoff.md` carried **four claims that
  did not reproduce**. Two would have produced a guard that silently
  passed. Every catch came from an agent opening the file instead of
  executing the brief.
- A `relatedLinks` "cap the lessons column at 4" convention was improvised
  mid-session, restated as fact in **two merged PR bodies**, and exists
  nowhere in the codebase — `related-links.njk` imposes no cap and
  `air-handlers` renders 9 (`codebase-issues` #183).
- A prose-lint regex was measured at 4 true / 1 false. Re-measured: **6
  true / 9+ false**, and it missed its own flagship instance. Two
  successive formulations were each stated confidently and each wrong.

The pattern: confident, specific, structurally plausible — and false.
Plausibility is not evidence.

## Step 1 — Extract the claims

Read the brief and enumerate **every** factual assertion into a numbered
list before verifying anything. Do not verify as you read — extract first,
so the list is complete and you can see its size.

Claim types, each with its own proof obligation:

| Type | Example | How to prove it |
|---|---|---|
| **Existence** | "there is no `html/_data/quizzes/controls-commissioning.js`" | `ls` the exact path. Both directions — absence is a claim too. |
| **Location** | "`quiz-engine.js:771-775` strips prompts to text" | `Read` those lines. Line numbers drift — confirm the *content* is there, not just that the line exists. |
| **Count** | "the All chip is currently 39" | Derive it with a command. Never carry a count forward from the brief. |
| **Convention** | "cap the lessons column at 4" | `grep` site-wide for the rule and for counterexamples. **No grep hit = the convention does not exist.** |
| **Code shape** | "`buildQuestionName` reads only `prompt` and `snippet`" | `Read` the function. Check every reference, not the definition alone. |
| **Test behavior** | "`responsive.spec.js` will catch this" | `Read` the assertion and reason about what it can *fail* on. Most over-claims live here. |
| **Repo state** | "`main` @ `2eb5d5a`, v3.69.5, clean tree" | `git log`, `git status`, `package.json`. |
| **Owner decision** | "Owner decision (2026-07-19): build it as a field drill" | **Unverifiable from the repo.** Flag for owner confirmation; never silently honor or discard. |

## Step 2 — Prove each one

Ground rules:

- **The command wins over the brief.** If they disagree, the brief is
  wrong until the owner says otherwise.
- **The primary source settles it.** Where a verifier disagrees with a
  finder, do not default to either — go read the thing itself.
- **Grep for the real shape, not the shape you expect.** Lesson subheads
  are `<h2 class="subhead" id="…">`; a bare `grep '<h2 id='` returns
  nothing and will wrongly "prove" a lesson has no anchors.
- **Absence needs a positive search.** "There is no X" requires a grep
  broad enough to have found X if it existed. Say which grep you ran.
- **Counts get derived, not copied.** Content quizzes are practice pages
  **minus** field drills:
  ```bash
  drills=$(grep -l '^category: field' html/practice/*.html | wc -l)
  total=$(ls html/practice/*.html | grep -v index.html | wc -l)
  echo "$((total - drills)) content + $drills field"
  ```
- **A claim that a test would catch something** is proven only by reading
  the assertion. `responsive.spec.js` flags an element only when
  `scrollWidth > clientWidth` **and** computed `overflow-x` is
  `hidden`/`clip` — an inline SVG at `width: 100%` can never trip it.
- **Cite the commit** you measured at. Measurements are snapshots.

## Step 3 — Report

Every claim lands in exactly one bucket:

- **VERIFIED** — command output confirms it. Cite the evidence
  (`path:line`, or the command and its output).
- **CORRECTED** — it did not reproduce. State what the brief said, what is
  actually true, and the evidence. This is the highest-value output.
- **UNVERIFIABLE** — not decidable from the repo (owner decisions, intent,
  future plans). List for owner confirmation. Do not guess.

Lead the report with an **error rate** — "17 claims, 13 verified, 3
corrected, 1 unverifiable" — and put the corrections first. If corrections
cluster into a failure type (stale line numbers, invented conventions,
counts carried forward), name the type; that diagnosis is worth more than
the individual fixes.

## Step 4 — Act on the verdict

- **Provably false factual claims** — correct them in the brief in place,
  with the evidence. Same standing as a confirmed bug.
- **Judgment calls, design critiques, and anything touching a decision the
  owner already locked** — report and wait for his pick. Do not
  unilaterally revise a locked decision because a better approach surfaced.
- **A corrected claim that invalidates the planned work** — stop and raise
  it. Do not tune the plan to fit and proceed quietly.
- **Any lane dispatched from this brief** gets told the brief is a
  hypothesis, that correcting it is wanted, and that the orchestrator —
  not the lane — decides what to do about a discrepancy.

## Anti-pattern

Do not "verify" by re-reading the brief and finding it internally
consistent. A brief can be perfectly coherent and entirely false — that is
exactly how all three failures above happened. Every VERIFIED needs a
command behind it.
