# Session handoff — the workbench is live and its navigation eats its own state (2026-08-08)

> **Lifecycle:** written 2026-08-08. This supersedes nothing — the previous
> file of this name was retired at Phase 8 graduation (PR #479) once its
> lifecycle condition was met, and the four references to it in
> `docs/air-side-sim.md` (`:177`, `:599`, `:666`, `:880` @ `2ea9a31`) are
> correct as written: they describe *that* file, historically, and this one
> does not make them false. **Retire this file when codebase-issues #275 has
> an owner decision and PR #488 is either merged or closed.**

## Read this first

**Every claim in this file is a hypothesis. The repo is the truth.** Correct
it and tell the orchestrator; do not quietly work around a discrepancy.

> **Fact-checked 2026-08-09 at `b80afe1`** (`/verify-handoff`, six lanes plus
> an adversarial refutation stage over every proposed correction). 56 claims:
> **48 verified, 4 corrected, 2 unverifiable, 2 owner-decision.** The four
> corrections are marked ⚠️ inline at the point of use — sheet-note mention
> counts (item 5), the "named next flagship" designation (passing note), "two
> live scripts" (item 2), and the flake attribution (process notes). Ten
> further corrections were *proposed and then refuted* on re-check; the claims
> they targeted stand as written. **The corrected numbers above are re-derived,
> not carried forward.**

Two concrete failures from the session that wrote this, both worth
internalising:

- **A survey agent's report went stale inside one session.** It reported the
  air-side sim's program library as "one sheet, `mat`/`dat` unwired." Both
  were false — it had read a superseded section of `docs/air-side-sim.md`.
  The AHU has carried *two* programs since before the session started. A
  roadmap was nearly scoped on it.
- **A stale local `main` produced two wrong conclusions.** `gh pr merge` does
  not update the local branch. Measuring "unique commits vs `main`" against a
  25-commit-behind local made four branches look like they carried unmerged
  work, and later made four correctly-fixed doc pointers look unfixed. **`git
  fetch && git merge --ff-only origin/main` before any comparison against
  `main`.**

## Where things stand

`main` @ `2ea9a31`, **v3.80.1**, working tree clean. (Line citations below
were taken at `2ea9a31` — that is deliberate, not stale.) Counts:
**40 education lessons · 34 content quizzes + 7 field drills · 31 tools ·
9 simulators** (10 files under `html/simulators/`; `ddc-workbench-ahu-mockup.html`
is the hidden one and carries no `canonical`).

Shipped this session, all merged:

- **#481** — DDC Workbench discoverability; paid codebase-issues #183/#184 and
  #209's deferred cross-links. Caught in pre-merge review: it had
  re-introduced the exact wording **#217** removed on 2026-07-26 (calling
  `Relinquish_Default` one of "three of the sixteen slots", on the page that
  teaches "it is not 'slot 17'"). Repaired to the ruled "on three levels"
  shape in `80d4b0d`. Also added the `/forced-air/` hub's simulator group,
  which had linked zero simulators.
- **#482** — the 2026-08 accuracy audit plus a two-arm metric-conversion
  guard. Pre-merge review closed two holes in the new **blocking** gate: a
  quiz-bank sanity floor sized at `>30` against a real population of 113, and
  a `||` that should have been `&&` in `tests/metric-spans.js`, which let a
  span with a dropped metric numeral pass silently.
- **#483** — closed ledger entries #183/#184/#209/#232.
- **#484** — made the two parenthetical floors in `tests/metric-spans.spec.js`
  disjoint; the fix in #482 had made the outer one logically redundant.
- **#485** — `aria-label="Site"` on the site nav landmark; closes #261.
- **#486** — closed #261 in the ledger, retired four decayed pointers,
  deleted the spent `docs/air-side-sim-scoping.md`.
- **#487** — logged **codebase-issues #275**, the subject of this handoff.

Branch hygiene: 28 local branches → 5 (two of those are merged and
deletable). `archive/issue-202-pre-rewrite` was converted to a **git tag** of
the same name, pushed to origin, and its branch deleted — owner call,
2026-08-08. `origin/candidate-b` was deliberately **kept**.

Three follow-ons, verified at `b80afe1`:

- **Local branches are now 3, not 5** — the two flagged as merged-and-deletable
  (`docs/close-261-and-retire-decayed-pointers`, `docs/log-workbench-state-loss`)
  have since been deleted. That is the advice executed, not drift. Their stale
  `origin/*` tracking refs survive, so `git branch -a` over-counts by two until
  `git remote prune origin`.
- ⚠️ **There is un-pushed work in a stash that no branch listing surfaces:**
  `stash@{0}: WIP on issue-229/fcu-override-live-region`. That branch is
  1 ahead / 34 behind `main` and its tip is an emergency snapshot. **Anyone
  told to "clean up the remaining branches" would destroy both silently** —
  check the stash before deleting the branch (item 4 depends on that work).
- The `archive/issue-202-pre-rewrite` **tag is load-bearing, not decorative**:
  it resolves to `8e0c2f1`, which is *not* an ancestor of `main`, so the tag is
  the only thing keeping that history reachable from gc.

## Corrections that cost real time — do not rediscover these

1. **The `relatedLinks` "cap of four" does not exist.** Re-confirmed this
   session: `html/_includes/related-links.njk` imposes no cap. Two merged PR
   bodies assert one. Nothing in the codebase does.
2. **`docs/air-side-sim.md`'s "still open" list was partly stale.** The
   program library is **two** sheets (`econ-2stage` and
   `econ-2stage-lowlimits`), and `mat`/`dat` **are** wired on the low-limits
   sheet — deliberately unwired on the starter. Verify against
   `html/simulators/ddc-workbench.html` before scoping anything from that
   list.
3. **There are three `ddcw-*` scripts, not four** (`ddcw-shell`,
   `ddcw-ahu-unit`, `ddcw-fcu-unit`).
4. **`.eleventy.js` defines five named `*Guard` collections, not six** —
   `descriptionLength`, `navCategory`, `educationSequence`, `flowStatic`,
   `quizOrder`. Two PR bodies said "all six build guards pass." Prefer naming
   the mechanism over the count.
5. **Sheet-note length is an AHU problem, not both pages.** Measured at
   `2ea9a31`: AHU `p.ddcw-sheet-note` ≈ **1,253 words / 1 inline link**; FCU
   ≈ **638 / 1**. For contrast `html/education/status-and-proof.html` runs
   ≈ 1 link per 218 words.

## The work, in order

### 1. codebase-issues #275 — the state-loss design decision — **FIRST FOCUS**

**Owner instruction (2026-08-08): this gets a fresh session's first
attention, and it is why this handoff exists.** He found it: *"One interested
click on the fan wipes sim config."*

The workbench holds its entire simulation in memory. There is **no**
`localStorage` / `sessionStorage` / history / hash / `URLSearchParams`
reference in any of the three `ddcw-*` scripts, in the other five scripts
either workbench page loads, or in either page's inline IIFE. Meanwhile the
arc's chosen navigation model is **in-graphic component links that navigate
away** — three drill-downs on the AHU (`hydronic-loop-builder`,
`refrigerant-loop`, `vfd-mock`), two on the FCU. Each is reachable **two**
ways: the SVG anchor plus a required HTML twin for WCAG 2.5.5/2.5.8. The
AHU↔FCU unit selector is a third destructive pair.

**Why this is architectural rather than a papercut** — and this is the line
to lead with. `html/scripts/ddcw-shell.js:280-285` says the priority arrays
are *"Deliberately NEVER reset… a slot-8 hand value survives a program
download exactly as it does in the field. **That persistence IS the lesson
this page teaches** (the months-old stale override)."* The page goes to
deliberate lengths to make a stale override outlive a program download, and
one click on the fan erases it. Separately, `docs/air-side-sim.md` names
in-graphic component click as the "hub of sims / walk up to the unit" north
star, and the 2026-07-21 ruling removed the redundant tile UI *in favour of*
it.

**#275 enumerates precisely what is lost vs survives.** Read it rather than
re-deriving. Only `cf_theme` and the units choice survive; nothing
simulation-related does.

**Four axes, none pre-picked — the owner decides:** what state is worth
persisting; where it lives (`sessionStorage` vs URL state vs making the
drill-downs in-page so they never navigate); whether a returning reader lands
back in their configuration or is told it reset; whether the drill-downs
should be navigations at all.

⚠️ **`UNVERIFIED` — the browser back/forward-cache path.** Playwright launches
Chromium with `--disable-back-forward-cache`, so the Back path could not be
measured. *Every fresh load reboots* is proven; whether Back restores is not,
and it would only ever cover one return path.

⚠️ **PR #488 raises the stakes here.** It adds a *latched* trip that takes
deliberate driving to reach, so a stray click now costs more than it did.

### 2. PR #488 — Phase 9A, awaiting the owner's screenshot review

`feat/ahu-physical-low-limit-stat` @ `6dac14d`. CI green; full suite 1105
passed / 2 skipped; `npm run perf-profile` flat (AHU Unit 60.3 → 59.7 fps,
CPU 488.9 → 489.2 ms/s, liveness 30/30). Four files. **Owner chose to hand it
off unreviewed so he reviews the screenshots with fresh eyes** — do not merge
before he does.

What it builds, from owner rulings on 2026-08-08:

- A **hardwired low-limit stat modelled in the plant**, latched, tripping at
  DAT < 38 °F and dropping the fan on both sheets. **Not a roster point** —
  which preserves the existing ruling that the physical LLS "exists in prose
  only." The instrumentation gap *is* the lesson: his field experience is
  units carrying an LLS safety circuit that is not a point, so the unit stops
  and the program cannot say why.
- ⚠️ **No verdict branch names the trip, deliberately.** The ladder must
  report only the consequence. A future edit that "helpfully" names the cause
  destroys the lesson and passes every other test; the PR adds an assertion
  pinning it.
- The stat is **drawn on the graphic, unmarked** — owner ruling, same shape
  as his DOAS exhaust-fan ruling. It reuses the drawing's existing
  neutral-no-point category (filter rack, intake louver); no new ink
  convention was established.
- Reset lives on a `.device` equipment-register face — the physical button on
  the machine, matching the page's existing framing at
  `ddc-workbench.html:2761`.
- **`LLS Trip` 35 → 41**, with the hardwired stat at 38. Owner's Northeast US
  practice: hardware ~38, program limit 40–42, 3 °F spread. The comment
  scopes the numbers to the Northeast and separates the *field setting* from
  the *model-derived engagement figures*.

**Headline finding (lane measurement, driven headless on the real sheet — I
did not independently reproduce it):** at 35 the software limit was
**effectively dead code**. Across the whole −20…110 °F slider the coldest
discharge any drive produced was 38.8 °F, so it never fired once. At 41 it
engages properly and the hardware stat never sees the air on ordinary
driving.

**Three decisions owed, all detailed in the PR body:**

1. A verdict branch went **unreachable** — *"Compressor running on air already
   near freezing"* structurally needs `stage > 0 && matT < 38` with air
   moving, which forces DAT < 39 and trips the 38 °F stat. Branch kept, its
   page row is `test.fixme` with the argument written above it. The lane
   recommends a defeat/jumper on the device face. **`UNVERIFIED` by the
   orchestrator — check the reasoning before acting on it.**
2. **Version bump owed: 3.80.1 → 3.81.0.** New behaviour on a live page plus
   **one** live script, so it also cache-busts `ddcw-ahu-unit.js`. Deliberately
   not done. ⚠️ **An earlier draft said "two live scripts," and so does PR
   #488's own test-plan line — both are wrong; fix the PR body before the owner
   reads it, since that sentence is what justifies the bump.** The diff is four
   files: `html/scripts/ddcw-ahu-unit.js`, the live page
   `html/simulators/ddc-workbench.html`, and two specs. **`ddcw-shell.js` — the
   only ddcw script both live workbench pages load — is untouched**, so the
   blast radius is one page and its one script, not two pages. That distinction
   is exactly the shared-code trap CLAUDE.md's merge-authority section warns
   about (PR #452 / `psychro-engine.js`).
3. The recorded **#240 fog recipe** (OA −15, damper 60 %) no longer reaches;
   the lane found damper 50 % + HW valve 80 %. `docs/air-side-sim.md` needs
   the line — the lane did not touch `docs/`.

### 3. Warm-climate freeze protection — a real research task

**Owner decision (2026-08-08): do this properly, with sources — not as a
hedge in prose.** He raised it: whether warmer climates run lower supply
temps, better-insulated duct, or skip the LLS entirely.

Reasoned but **`UNVERIFIED`, and must not ship as fact**: freeze exposure
tracks design OA temperature + outdoor air + a wet coil; warm *humid*
climates run lower supply-air temps for **latent** reasons (dehumidification,
often with reheat), not insulation; duct insulation there is driven by
**condensation** — the same sweating the owner named as the consequence of a
38 °F trip. That inversion is the teaching frame worth keeping: *the same low
supply temp is a freeze problem up north and a sweating problem down south.*

**Not known, do not assert:** whether southern jobs commonly omit the LLS;
any specific southern setpoint; code requirements by jurisdiction.

Method: follow the BACnet-enum verification precedent — independent sources,
cited, with a refutation stage over the findings. Output must **name the
variation** rather than legislate a second house answer. PR #488 already
scopes its numbers to the Northeast and invents no other-climate figures, so
the page is safe meanwhile.

### 4. codebase-issues #229 — the FCU fix, design settled, unbuilt

**Owner decision (2026-08-08): use COV-style reporting with an increment, NOT
the guard-plus-settle-debounce the issue currently prescribes.** Announce when
the drift has moved more than an increment since the last announcement.
Reasoning: no silence risk (a debounce on a signal that never stops moving can
wait forever and announce nothing), immune to the 1–60× `simSpeed` multiplier
because the announcement rate tracks the physical rate of change, and it
replaces a wall-clock timing assertion that would have been a CI flake source.

⚠️ **Prerequisite:** `#fcu-ovr-state` is **one node doing two jobs** — a
visible amber line and the live region. Split it first: visible `<p>` keeps
updating with no `aria-live`, plus a separate `sr-only` live region. House
precedent already ships on both pages (`#fcu-verdict-sr`, `#ahu-verdict-sr`).
Debouncing the shared node would freeze the visible drift readout, which is
the hazard the line exists to surface.

**Measure first:** #229 recorded 4 distinct strings in 5 s but not whether
they were monotonic. Monotonic → pure drift, COV alone suffices. Any repeat →
rounding chatter near a display boundary, and the increment must exceed it.

**The spec already exists** and is stranded on local branch
`issue-229/fcu-override-live-region` (single commit `a13be01`, `wip: emergency
snapshot before host instability`, never pushed). It is a spec written *ahead
of* its fix — it asserts ≤2 mutations over 5 s where `main` produces ~50, so
it fails today by design. Its ceiling was deliberately set where only
guard-plus-settle can pass, so **adopting COV means rewriting part of it** to
assert meaningful announcements rather than wall-clock counts. Update #229's
2026-08-03 note, which now prescribes the superseded fix.

### 5. The sheet-note linking pass — **BLOCKED by #275**

**Owner's idea (2026-08-08), and it is the right shape:** hyperlink terms
inline so the prose itself gets shorter, rather than extracting sections.
Keep what is true of *this machine and this sheet*; link the concept an
existing lesson already owns.

Headroom is large — see correction 5 above. Concepts the AHU notes explain
that lessons already own, with mention counts **re-derived at `b80afe1`**
across the 9 `p.ddcw-sheet-note` paragraphs (1,254 flowed words), counted on
what a reader sees and stem-inclusive throughout: **proof 8 · low limit 6
(across 3 notes) · economizer 6 · latch 5 · differential 2 · PID 1**. All
six owning lessons exist and are legally linkable under the forward-link
convention: `status-and-proof`, `economizers`, `boolean-logic-latches`,
`comparators-and-deadband`, `pid-basics`, `start-stop-commands`.

⚠️ **An earlier draft of this list said `proof (9)` and `low limit (2)`; both
were counting artifacts and the second inverted the ranking.** They came from
grepping the raw, hard-wrapped HTML rather than the flowed text: `proof` hit 9
only because line 2684 is `href="/education/status-and-proof.html"` and the
slug contains the word, and `low limit` hit 2 only because a literal
single-space pattern misses one instance split across a line break *and* all
three `low-limit(s)` hyphenations. Low limit is the **second** most-mentioned
concept, not the least — do not deprioritise it. The list was also internally
inconsistent (`economizer 5` required excluding the stem while `latch 5`
required including it), which is why the numbers above are stem-inclusive
throughout. **Rule for any future mention count in this repo: strip tags and
collapse whitespace first, then match a stem with `[- ]` for compounds, and
say whether hrefs were excluded.**

⚠️ **Why it is blocked, and the constraint that survives even after #275 is
fixed:** every added link is another way to leave mid-experiment. So the
terse prose must stay **self-sufficient in the moment** — the link is for
depth, not for comprehension. Prose answering *"what is this thing"* can go
behind a link; prose answering *"what is this machine doing right now"*
cannot.

### 6. The instrumentation-gap lesson — proposed, not confirmed

`html/education/start-stop-commands.html` already carries the material: it
describes the safety string as *"a freeze stat… a firestat or duct-detector
shutdown contact, and the motor overload's auxiliary contact… Any one of them
opens and the circuit is dead, no matter who is commanding"*, **draws** those
three contacts, and gives failure signatures *"seen from the BMS seat"*. Its
keywords already include `safety string freeze stat firestat overload`.

It is **one beat short**: it never says that none of those contacts may be a
*point*, so the front end cannot tell you which veto opened. That is the
owner's whole observation, and it is a paragraph, not a section. Its
`pairedQuiz` is `/practice/start-stop-commands.html`, so his "eventually in
practice" is a question added to an existing bank.

**The owner engaged with this but never explicitly approved the placement** —
confirm before building.

## Decisions waiting on the owner

- **#275** — the four axes above. Everything in item 5 waits on it, and item 2
  raises its stakes.
- **PR #488** — the screenshots, plus the three decisions in its body.
- **Item 6** — is `start-stop-commands` the right home.

## Process notes that earned their keep

- **One lane → one worktree → one branch → one draft PR.** A fresh worktree
  has **no `node_modules`**; without `npm ci` its `npx` silently resolves
  against the owner's main worktree.
- **Per-lane Playwright** needs a throwaway config **outside the repo** on a
  unique high port, run in the **foreground**. Ports 8000–8099 are occupied on
  this box. A config outside the package root needs an **absolute `require`
  path** for `@playwright/test`. One flake per full run is normal — isolate
  the spec before reporting a failure (`.claude/skills/handoff/SKILL.md:168`).
  ⚠️ **An earlier draft named `ddc-workbench-ahu-page.spec.js` as "the usual
  offender." Nothing in the repo records that, and the durable records say the
  opposite shape** — a *different* test flakes each run (`docs/codebase-issues.md`
  `:3739` flow-engine gutter teardown + modbus reset-best, `:4736`
  `worker.spec.js`, `:2816` `contact.spec.js`). Every one of the nine other
  mentions of the AHU page spec cites it as the spec that **pins** a behaviour.
  Do **not** wave off a red run of it as presumptively a flake.
- **Two concurrent worktree lanes is the ceiling** on this box; four pinned it
  at 99 % CPU.
- **`docs/codebase-issues.md` is orchestrator-only.** Two lanes were told to
  stay off it this session precisely to avoid a conflict.
- **Tell every lane the brief is a hypothesis.** Three lanes corrected briefs
  this session — the FCU word count, the guard count, the "four ddcw scripts"
  claim — and each correction was worth more than the compliance would have
  been.
- **Ask the owner for field numbers rather than deriving them.** A constant
  chosen to make the *model* behave can ship rendered on screen as if it were
  field practice; `LLS Trip: 35` was exactly that. The tell is a comment
  justifying a setpoint from other model constants.

## One passing note

A candidate next arc is the **branching diagnostic scenario drills** (a
`scenario-engine.js` sibling to `quiz-engine.js`), opened as a future arc
2026-06-10 and scoped at concept level in `docs/site-ideas-and-friction.md`
(`:51-72`) — never built. Honest readiness read:
**not yet.** #275 is a design decision about how the workbench holds state,
and a branching scenario engine is *also* a design about how a session holds
state. Settling #275 first will inform it; opening both at once would mean
deciding the same question twice, in two places, with two answers.

⚠️ **An earlier draft called this "the named next flagship." It is not.** That
phrase is a term of art in this repo and it designates the **air-side
simulator** (`docs/site-ideas-and-friction.md:721`, `:6804`) — which has now
graduated at Phase 8, leaving the slot vacant with **no designated successor**.
The repo also parks a competing flagship-scale candidate the draft did not
mention: the **BACnet MS/TP bus simulator** (`:3685-3686`, explicitly described
as having been sequenced behind the air-side sim). So the next arc is an open
choice between at least two candidates, not a decision the repo already made.
