# Session handoff — Coil Freeze Protection live, the night-1 queue cleared (2026-10-06)

> **Lifecycle:** written 2026-10-06 at the end of the review-and-merge
> session, superseding nothing in this slot — the previous rolling brief
> was retired 2026-08-21 (`docs/glossary-arc.md`), and the 2026-10-05
> re-entry worked from `docs/audits/2026-10-reentry/` plus `npm run status`
> instead. Retire this file when the owner has ruled the items under
> *Decisions waiting on the owner* **and** quiz wave 3's first PRs are
> open; archive it to `docs/audits/2026-10-reentry/handoff.md` with a
> disposition header when you do.

## Read this first

Every claim in this file is a hypothesis. The repo is the truth: run
`npm run status` for the ledger and content numbers, `npm run dashboard`
for the rendered page, and `/verify-handoff` before dispatching anything
from here. The predecessor records failed this session in a specific way:
**plausible procedural facts that nobody had tested** — GitHub's green
check on a stacked PR, the preview script's "live at" message, a ledger
entry's "no longer reachable" claim. Each cost real time; each is in
*Corrections* below so no lane rediscovers it.

## Where things stand

`main` @ `510d5e6`, **v3.91.0**, clean tree, **0 open PRs**, no remote
branch but `main`. (Measurements below cite `510d5e6`, the commit they
were taken at — that is deliberate, not stale.) Counts: **41 education
lessons · 34 content quizzes + 7 field drills · 32 tools · 9 canonical
simulators** (plus the hidden AHU depiction mockup under
`html/simulators/`).

**Shipped 2026-10-05 → 06** (25 PRs, every one reviewed with the owner
in sequence — `docs/audits/2026-10-reentry/rulings.md` §18 has the list
and his words):

- **The Coil Freeze Protection lesson** (#620) — forced-air step 3,
  written against `docs/warm-climate-freeze-protection.md`, every chapter
  surface plumbed, version → 3.91.0. The owner's one review catch was the
  capstone's filter rack; both Air Handlers racks got the same pleated
  redraw (#636).
- **Quiz wave 2** (#608 #609 #610): pid-basics, air-handlers, economizers
  at 15. The owner replaced one question outright (derivative on a reheat
  coil) and reworded another; both lesson sentences they came from were
  trued up (#635).
- **Sixteen agenda rulings executed** (#612 #613 #615 #616 #617 #618 #619
  #621 #622 #623 #624 #625 #626 #627 #630 #632) plus the ledger-tail
  by-catch (#634), the deps bump (#607), and the #228 design note (#631,
  defaults accepted).
- Ledger after the day: `codebase-issues.md` to **#331**, `content-audit.md`
  to **#99**; `npm run status` reports the open/partial set (the dashboard
  showed 21 at `a7d0d46`; derive it fresh).

**Durable state:** rulings §1–18 · `npm run status` · the dashboard
(`npm run dashboard` renders it to `_dashboard/dashboard.html`; the
standing Artifact is https://claude.ai/artifact/GmJYbFLQMrfPhBXvvniwsz —
from a new conversation the Artifact tool must `read` that URL once before
it can publish to it; the hand-authored narrative it renders lives in
`docs/audits/2026-10-reentry/dashboard/dashboard-extra.json`).

## Corrections to the previous records — do not rediscover these

1. **A stacked PR shows no CI and merges anyway.** `test.yml` runs on
   `pull_request` pushes to a PR whose base is `main`; a child opened
   against its parent's branch never runs, and GitHub's retarget on
   parent-merge is an `edited` event that does not run either. Three
   chain PRs merged untested on 2026-10-06 (a full suite on `main` was
   clean, 1223/0/1). **Rebase the child onto `origin/main` and force-push
   before merging; look for a `test` check reading `SUCCESS`, not a green
   parent.** Fix shape: codebase-issues #331 (owner picks).
2. **GitHub's `mergeable` on a stacked PR is against the PARENT.** Two
   night-1 PRs went CONFLICTING overnight and chain B would have on first
   merge — adjacent-hunk ledger collisions GitHub reports only once the
   parent lands. A pairwise `git merge-tree --write-tree A B` matrix over
   the whole queue found all three before the session started.
3. **`publish-preview.mjs` run from a scratchpad worktree reports "live"
   while publishing to a sibling folder it created** — the default
   destination is `../caddy/dashboard/cfdev` relative to the checkout and
   the guard is suffix-only. Pass
   `CF_PREVIEW_DIR=$HOME/caddy/dashboard/cfdev` from any worktree
   (codebase-issues #330; CLAUDE.md *Local preview & tests*).
4. **Two lanes appended "#325" to the ledger tail.** Any PR that appends a
   new numbered entry conflicts with every other such PR, and two lanes
   can pick the same number. Stack them in entry order or let the
   orchestrator write the ledger (the handoff skill's standing rule).
5. **Ledger entries carried wrong premises** (verify-the-entry-first held
   again): #238 said the AHU no longer reached the above-boiling region —
   its heating coil relied on it at a starved fan (#619 adapted the coil);
   `psychro-engine.js` has **nine** live consumers, not eight (CLAUDE.md
   trued up on this PR); #314 named the wrong second question (one was
   COV and stayed put); the #88 brief's IANA 47808–47823 block does not
   exist (only 47808 is registered); the PID-aside ruling's premise "every
   mini-sim is a heating loop" was wrong (Fast is duct static — still
   reverse-acting, so the aside held); the boiling-guard lane brief's
   altitude case (200 °F at 12.2 psia) was below boiling, not above.
6. **A drawing idiom does not survive a change of aspect.** The two-stroke
   filter hatch read fine in a 70 px rack and as "two lines crossing at an
   odd angle" in a 150 px one. Filter racks are now pleated media
   site-wide (#620, #636); check any copied SVG idiom at the new size.

## The work, in order

### 1. Quiz wave 3 — `docs/site-ideas-and-friction.md` §*Quiz expansion* (L6415 @ `510d5e6`)

**Owner decision (2026-10-05): the arc is "freeze season plus quizzes"; bank target 15 (ruled 2026-08-20); owner merges every bank PR.**

Verified state: 34 of 41 banks are under 15 (`npm run status`, *content*
section lists them; none is a BACnet bank; `modbus-decoding` is frozen at
10 by design and is not in the list). 27 of the 34 pair 1:1 with a lesson
at `html/education/<slug>.html`; **seven are field drills with no paired
lesson** — `controller-swap`, `controls-commissioning`,
`field-wiring-sensors`, `sequencing-scenarios`, `surviving-first-months`,
`troubleshooting`, `wiresheet-traces` (derived: `grep -L pairedLesson
html/practice/*.html`) — and need their source lessons named explicitly.

Shape: the lane is a committed named Workflow,
**`.claude/workflows/quiz-bank-growth.js`** — the wave-2 script
parametrised (`args.banks`, `args.sessionUrl`, `args.target`,
`args.basePort`; header documents it). Opus drafts, Fable refutes up to
twice, Opus fixes, one PR per bank. Suggested first batch, freeze-season
neighbours of the new lesson first: `building-pressure`,
`duct-static-control`, `vav-systems`; then `psychrometrics-basics`,
`hydronic-loops`, `load-piping`. Run **two or three banks at a time** —
four concurrent worktree lanes pinned this box at 99 % CPU. Then walk the
PRs with the owner in sequence (he asked for that format; §18).
⚠️ Refuters catch structure (duplicates, key-letter tells, metric
rounding); the owner catches field truth — budget his read.

### 2. #228 execution — `docs/engine-standardization.md` §4

**Owner decision (2026-10-06): the design note's defaults stand** — add
`Psychro.mixAir` / `mixFraction` and keep `mixStreams`; no caveat text in
the engine; no workbench mass-delta readout for now.

Step 0 adds the two helpers to `psychro-engine.js`, creates
`tests/psychro-mixair.spec.js` (the `psychro-engine.spec.js` vm pattern —
it does not exist yet) and takes a **minor version bump** (shared-script
cache busting); then one page per PR
with a before/after fixture proving zero change clear of saturation, fog
cases enumerated; workbench last and display-only. Every step touches a
live script or page → owner merges each. Background tax lane, not the
arc's headline.

### 3. Small fixes that need no new ruling

- **codebase-issues #330** — `publish-preview.mjs` destination guard
  (resolve against `os.homedir()`, assert under `$HOME`). Script only →
  merge on green.
- **codebase-issues #329** — give `pid-basics.html`'s closing wiresheet
  paragraph an `id` and retarget `pid-block-on-wiresheet`'s `learnMore`
  back to it (it points at `function-blocks.html#families` today). Live
  lesson + bank → owner merges.

### 4. Small fixes once the owner rules (see *Decisions waiting*)

content-audit **#99** (`bandTxt`), codebase-issues **#328**
(bacnet-networking's two "its own page" bullets — the amended coming-soon
rule says narrow, not delete), **#324** (the PID tuner's "flip acting"
row), content-audit **#91–#98** (the wave-2 refuters' by-catch, each a
one-line call). All live pages → owner merges; bundle by file.

### 5. The F4 case-file mockup lane — friction §*The owner's dev-arc brief* (L6445 @ `510d5e6`)

**Owner decision (2026-10-05, rulings §17): ONE mockup lane at the arc's
end; stories owner-supplied only after he has seen a shape.** Mockup-first
means a hidden page (no `canonical`, `noindex`, excluded from
collections) with its own hand-written spec — merge freely until it
graduates. The scenario-engine consumer stays parked. Do not draft
placeholder war stories.

### 6. After the arc

Glossary **§7.2** quiz-bank component (`docs/glossary-arc.md`, sequenced
after the arc 2026-10-05); the **short sitting** on the brief items A1,
A4, C4, D2, D4, E2, the §0 N2 gap and the LON go/no-go (friction §*dev-arc
brief* has the banked analysis); a **fresh Search Console export for the
pillar re-read** — the last read was off the 2026-08-07 export (friction
L7214 @ `510d5e6`); the late-October timing comes from the 2026-10-05
agenda, not from the friction file.

**Explicitly declined or parked — do not carry as open work:** a
`[future:]`-marker cleanup of the friction file (the 2026-10-05 drift PR
#629 did the stale ones); renaming `mixStreams` (Q1 default: no); a
workbench mass-delta readout (Q3: not now); any southern-setpoint claim in
the freeze lesson (research record §4 — no source).

## Decisions waiting on the owner

- **content-audit #99** — the coil-freeze-risk tool says "typical settings
  run 35–38 °F"; the lesson says 35–37 °F is the device band and 38 a
  house choice a degree above. One sentence moves either way; carrying it
  means two numbers for one device on two live pages.
- **codebase-issues #331** — which CI trigger fix: `edited` with a
  base-change gate, `push: branches: [main]`, or both (recommendation:
  both — the second also tests `main` itself after every merge).
- **codebase-issues #328** — the two bacnet-networking bullets: narrow to
  scope statements, or leave under the amended rule.
- **codebase-issues #324** — the PID tuner's "flip acting" cheat-sheet row
  (the tuner has no such control).
- **content-audit #91–#98** — the wave-2 by-catch; each is a one-line
  call (e.g. #97 "Ten questions" is a RUN claim by the standing ruling and
  may just be accepted).
- **Home hero badge** — still *Featured: DDC Workbench*; the lesson lane
  left it per the 2026-07-19 relabel. Say if the lesson should be featured.

None of these block the work above.

## Process notes that earned their keep

- **Walk the PR queue together, in sequence** — assistant presents, owner
  approves, assistant merges on the word. Owner: *"may be the most
  balanced workflow we've used."* Six content rulings came out of one
  walk that the lanes' refuters had not found.
- **Rebase-push stacked children before merging** (Corrections 1–2); run
  the merge-tree matrix first.
- **Give the owner the rendered page, not the diff**, for a lesson: the
  LAN preview (`CF_PREVIEW_DIR=…` from a worktree) and a full-page
  screenshot sent to his phone. The filter catch came from the rendering.
- **Lane-harness facts:** a fresh worktree has no `node_modules` (`npm ci`);
  a bash command containing the literal `.github` is refused by the
  worktree-isolation checker (use `npm run status`); another worktree
  holding a branch name blocks `checkout -B` (use a local name and push
  `local:remote`); `pkill -f <script>` kills its own shell when the pattern
  is in the command line.
- **The orchestrator writes the ledgers.** Two lanes picking the same
  entry number is what that rule prevents.

## One passing note

The next flagship candidate is the **F4 case-file content type** —
diagnostic-method stories in the owner's voice, mockup-first. Readiness:
the brief's analysis is banked in the friction file and the owner has
ruled the sequencing; no story has been collected and no schema exists.
Honest read: ready for a mockup lane after wave 3, not for content.
