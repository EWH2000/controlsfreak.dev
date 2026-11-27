---
name: handoff
description: End-of-run wrap-up for controlsfreak.dev — update the owner's board (docs/board.md → npm run board) and the agent-facing brief in memory, grounded against the repo. Use when a run or session is wrapping up, or when the user asks for a handoff / where-are-we.
---

# Wrap-up: the board and the brief

There is **no handoff document** any more (owner ruling 2026-11-26;
`docs/next-session-handoff.md` was retired). State lives in exactly two
places, for two readers:

- **`docs/board.md`** — for the owner. One screen: the week's five, *Your
  turn* (three lines at most), what shipped in plain language. Rendered to
  his home hub by `npm run board`.
- **`operating-brief.md` in the memory directory** — for the next agent
  session: the operating model, the run journal, the resume recipe.

Do not write a third. If something seems to need its own document, it
belongs in one of these two, in a ledger that already exists, or nowhere.

## The governing rule

**Every claim is a hypothesis until a command proves it.** Run the check
that confirms each fact before you write it, or leave it out. Never carry
a count, a SHA or a "done" forward from memory or from the previous brief.

## Step 1 — Ground the state (run these, don't recall them)

```bash
git fetch --prune
git status -sb
git log --oneline -5 origin/main
node -p "require('./package.json').version"
gh pr list --state open --limit 30
gh run list --workflow test.yml --branch main --event push --limit 1
git worktree list
pgrep -af 'http\.server|eleventy'
```

End-of-run targets (owner ruling 2026-11-26): **zero open PRs**, one
worktree, no stray dev server, `main` green. An open PR at wrap-up is a
defect to resolve — merge it behind the gate, or close it with a one-line
reason — not a line to report. The only exception is a launch PR for a new
lesson / simulator / tool, and that is cut *after* the owner's yes, so it
is never open while waiting on him.

## Step 2 — Update `docs/board.md`

- **Run:** set the state (`running` / `idle` / `done` / `stopped`) and one
  plain sentence. If the run stopped early, say where and why, first.
- **The five:** tick what is finished. Never add a sixth, and never put an
  item there that needs the owner — that is a *Your turn* line.
- **Your turn:** three at most. Each is a short question or a single tap,
  never a diff to review. A reversible call is not asked here: make it and
  list it under *Calls I made*.
- **Shipped:** new lines at the TOP, one per theme rather than one per PR,
  in the words a visitor would use ("the freeze lesson's trip range now
  reads 35–38 °F"), each with a link to the live page or the PR.
- Keep the whole file to about 40 visible lines. When the week closes, fold
  it to one line under a collapsed *Earlier weeks* section.

`docs/board.md` changes land by pull request like everything else (`main`
is locked). During a run, edit it on the run's branch and rebuild from
there; the wrap-up PR lands the final text.

Then `npm run board` and confirm it:

```bash
curl -sk --resolve command.home.arpa:443:127.0.0.1 https://command.home.arpa/cfboard/stamp.json
```

## Step 3 — Update the brief in memory

Rewrite `operating-brief.md` in the memory directory (do not append a
second file): what the next session should do first, what was ruled this
session (owner's words, dated), and anything a lane learned the hard way.
Delete the finished run's journal section. Nothing in it may be
shorter-lived than the brief itself — no scratchpad paths, no open-ended
counts.

## Step 4 — Self-check, then tell the owner

- [ ] `gh pr list --state open` is empty (or the exception above applies).
- [ ] Every "shipped" line names something that is actually on `main`.
- [ ] *Your turn* has three lines or fewer and no diffs.
- [ ] The board on the hub shows the build you just made.
- [ ] Superseded ledger entries (`docs/codebase-issues.md`,
      `docs/content-audit.md`) agree with what merged.

Final note to the owner: fifteen lines or fewer — what shipped, what is his
turn, the board's URL. No tables of PR numbers.

## Standing context for any lane a run spawns

- **Tell every lane its brief is a hypothesis**; correcting it is wanted,
  and the orchestrator decides what to do about a discrepancy.
- **One lane → one worktree → one branch → one PR.** Lanes never merge.
  The orchestrator merges behind the gate in `CLAUDE.md` §Workflow: green
  `test` on the final head, a blind review of that head by an agent that
  did not write it, scope as stated. A fresh worktree has no
  `node_modules` — the lane runs `npm ci` first.
- **Per-lane Playwright** needs a throwaway config on a unique high port
  with `reuseExistingServer: false`, run in the **foreground**. Port 8000
  is taken on this box. One flake per full run is normal — isolate the
  spec before reporting a failure.
- **The ledgers are orchestrator-only.** Lanes report finds; the
  orchestrator writes them.
- **Edit a PR's body before the last push, not after** — any title or body
  edit starts a full test run on the current head.
- **"The verifier wins over the finder" is a bad heuristic.** Both layers
  are fallible; the primary source settles it.
