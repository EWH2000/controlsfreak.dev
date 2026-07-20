---
name: handoff
description: Write the end-of-session handoff doc for controlsfreak.dev — grounds every claim against the repo first, then writes docs/next-session-handoff.md in the house format. Use when the session is wrapping up with unfinished work, or when the user asks for a handoff / next-session brief.
---

# Session handoff

Write the outgoing session's brief for the incoming one. The incoming
session executes this file, so **a wrong claim here costs a whole lane** —
grounding comes before writing, always.

## The governing rule

**Every claim is a hypothesis until a command proves it.** The recurring
failure mode this skill exists to stop: a convention or count gets stated
confidently in a brief, subagents honor it, and it propagates into merged
PR bodies. A `relatedLinks` "cap of 4" was improvised mid-session, restated
as fact in two PR bodies, and exists nowhere in the codebase
(`codebase-issues` #183). Four claims in one draft of the handoff did not
reproduce; two would have produced a guard that silently passed.

So: run the read/grep that confirms each fact, or write it as
**`UNVERIFIED —`** / **`ASSUMPTION —`**. Never state it flat.

## Step 1 — Ground the state (run these, don't recall them)

```bash
git log --oneline -8
git status --short
git branch --show-current
node -p "require('./package.json').version"
gh pr list --state open --limit 20
gh pr list --state merged --limit 10
```

Counts, derived — these are the numbers the handoff's *Where things stand*
line carries. Note content quizzes are **total practice minus field
drills**, not a directory count:

```bash
cd "$(git rev-parse --show-toplevel)"
echo "lessons:   $(ls html/education/*.html | grep -v index.html | wc -l)"
echo "tools:     $(ls html/tools/*.html | grep -v index.html | wc -l)"
echo "sims:      $(ls html/simulators/*.html | grep -v index.html | wc -l)"
drills=$(grep -l '^category: field' html/practice/*.html | wc -l)
total=$(ls html/practice/*.html | grep -v index.html | wc -l)
echo "quizzes:   $((total - drills)) content + $drills field drills"
```

Then, for **each** factual claim you intend to write:

- **A file, function, or data file exists** → `ls` / `Read` it. Don't infer
  from a naming pattern.
- **A line number or code shape** → `Read` the actual lines and cite
  `path:line`. Line numbers drift; cite the commit they were taken at.
- **A count or a convention** → `grep` for it site-wide. If the grep
  disagrees with your memory, the grep wins.
- **An anchor or id** → grep the real attribute shape. Lesson subheads are
  `<h2 class="subhead" id="…">`, so a bare `grep '<h2 id='` finds nothing
  and will wrongly report "no anchors."
- **A test would catch X** → read the spec's assertion. `responsive.spec.js`
  only flags `scrollWidth > clientWidth` **and** `overflow-x:
  hidden|clip` — an inline SVG at `width: 100%` can never trip it.

Measurements cite the commit they were taken at. That is deliberate, not
stale — say so in the file.

## Step 2 — Check what the predecessor got wrong

Read the outgoing `docs/next-session-handoff.md` (or the arc-specific
handoff). For any claim the session **disproved in flight**, that
correction is the highest-value content in the new file — the incoming
session must not spend a lane rediscovering it. These go in their own
numbered section.

## Step 3 — Write it

Path: `docs/next-session-handoff.md` for the rolling brief. An arc with its
own multi-session identity gets `docs/<arc>-handoff.md`. Completed cycles
archive to `docs/audits/<topic>/handoff.md` with a disposition header.

Sections, in this order. Drop one only if it is genuinely empty.

```markdown
# Session handoff — <what's live, in a phrase> (YYYY-MM-DD)

> **Lifecycle:** written <date>, superseding <what>. <What shipped out of
> the predecessor and had its section removed.> Retire this file when
> <explicit condition>.

## Read this first

Every claim in this file is a hypothesis. The repo is the truth.
<How the predecessor failed, concretely, and what that implies for lanes.>

## Where things stand

`main` @ `<sha>`, **v<version>**, <tree state>. (Measurements below cite
`<sha>`, the commit they were taken at — that is deliberate, not stale.)
Counts: **N education lessons · N content quizzes + N field drills · N
tools · N simulators.**

<What shipped, by PR number, with what each piece actually does. Name what
stayed open and why.>

## Corrections to the previous draft — do not rediscover these

1. **<Claim that failed>.** <What the draft said, what is actually true,
   and the evidence.> <What the working approach turned out to be.>

## The work, in order

### 1. <Item> — <tracking ref if any>

**Owner decision (YYYY-MM-DD): <the call, verbatim in spirit>.**

<Verified state: what exists, what does not — cite the check.>
<Shape of the work. Constraints that bite. Named blockers.>
<⚠️ for traps that will silently pass.>

**Explicitly declined, with named blockers — do not carry these as open
work:** <item — blocker; item — blocker.>

## Decisions waiting on the owner

<Issue # — the question, the stakes, and why carrying it costs more than
either answer. None of these should block the work above.>

## Process notes that earned their keep

<Only notes that changed an outcome this session. Prune the rest.>

## One passing note

<The named next flagship, and an honest readiness read.>
```

## Step 4 — Self-check before you hand it over

- [ ] Every file path in the doc was opened or `ls`'d this session.
- [ ] Every line-number citation carries the commit it was measured at.
- [ ] Every count came from the Step 1 commands, not from the predecessor.
- [ ] Every numeric or structural **convention** was grepped for. If the
      grep found nothing, the convention does not exist — say so.
- [ ] Anything unproven is labeled `UNVERIFIED` / `ASSUMPTION`.
- [ ] Owner decisions carry their date and are stated as decisions, not
      as suggestions.
- [ ] The predecessor's shipped sections are **deleted**, not left stale.
- [ ] The Lifecycle header names an explicit retirement condition.
- [ ] Superseded records elsewhere (`site-ideas-and-friction.md` entries,
      `codebase-issues.md` items) are updated so the two records agree.

Then report to the owner: the path, the retirement condition, and a
one-line list of anything you had to label UNVERIFIED.

## Standing context for any lane this brief spawns

Carry these into the file when relevant — they are the process notes that
keep re-earning their place:

- **Tell every lane the brief is a hypothesis**, that correcting it is
  wanted, and that the orchestrator — not the lane — decides what to do
  about a discrepancy.
- **One lane → one worktree → one branch → one draft PR.** Owner reviews on
  GitHub and green-lights explicitly. Never merge without it. A fresh
  worktree has no `node_modules` — the lane runs `npm ci` first.
- **Per-lane Playwright** needs a throwaway config on a unique high port
  with `reuseExistingServer: false`, run in the **foreground**. Port 8000 is
  held by a non-responsive rootless podman `pasta` listener. One flake per
  full run is normal — isolate the spec before reporting a failure.
- **`docs/codebase-issues.md` is orchestrator-only.** Lanes report finds;
  the orchestrator writes them.
- **"The verifier wins over the finder" is a bad heuristic.** Both layers
  are fallible; the primary source settles it.
