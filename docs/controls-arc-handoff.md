# Controls-spine arc — session handoff (2026-07-18)

> **Lifecycle:** written 2026-07-18 by the outgoing session as the incoming
> session's starting brief. Spent once the arc ships — fold durable decisions
> into `docs/site-ideas-and-friction.md` and retire this file (git history is
> the archive, same lifecycle as the retired nav-redesign scope doc). Left
> untracked at handoff; commit it with the arc's first PR if it earns keeping.

## Where we're coming from

On 2026-07-18 a 16-PR wave shipped and merged (main now v3.57.1): the
refrigeration wrap-up — **heat-pump mode** on the refrigerant-loop sim (full
heating model with real ambient capacity fade, hardened by a 3-agent
adversarial verification round), the **/refrigeration/ hub** (pillar #4), the
owner's three design-call fixes (#161 blue-cool retune / #164 touch floor /
#166 accent-ink), a seven-issue cleanup set, and a follow-on
**compressor-direction cycle** (owner-caught from the live sim: the scroll
orbit ran in the expander sense and the compressor's ports swapped between
modes — fixed with a true 4-port reversing-valve re-plumb, plus a frost-crystal
rebuild, all pinned by new spec guards). The nav-redesign scope doc was
retired into the friction file; the root tracking markdowns now live under
`docs/`. Everything is merged, deployed, and verified stable (local suite +
live drive).

## The priority directive (owner, strongly worded, 2026-07-18)

> "Our number one goal is to build a top tier site with accurate, reliable,
> and fun (when applicable) tools, edu pages, and sims. Not that I want to
> ignore SEO, but I want to make SEO work with what we build… SEO and GSC
> pulls should not be 'steering the ship'."

Quality-first picks the arcs. SEO rides along as small adjuncts (breadcrumbs,
hubs, structured data) fitted to what's built. GSC pulls inform *specific
gated decisions* (the topic-primary nav rewrite) — they never pick the next
arc. Memory `utility-over-seo-page-selection` carries this; do not re-derive
roadmap framing from the SEO-plan memory alone.

## The decided arc: controls education spine + issue appetizer

**Why:** recent months were mechanical-heavy (forced-air, hydronics,
refrigeration) while the site's identity is controls-first. The thinnest shelf
for the core audience is signals/IO and function-block education — telling
detail: the function-block wiresheet sim exists with **no education chapter
behind it** (a capstone with no lessons), and the analog-sensing lesson has
sat as a `[future:]` marker since the forced-air buildout. Lessons are cheap
relative to a flagship sim and run well as parallel lanes.

### Part 1 — the controls spine

- **IO & Signals chapter:** start from the seeded
  `[future: education/analog-sensing.html]` marker (ranges/scaling, live-zero,
  railed signals as ceilings-not-measurements) and shape the chapter around
  it — signal types (AI/AO/BI/BO vocabulary per the site convention),
  4-20 mA vs 0-10 V vs thermistor/RTD sensing. Existing tools
  (signal-scaling, thermistor-calculator) become the tool cross-links.
- **Function-block chapter:** lessons that lead into the FB wiresheet sim as
  capstone (logic fundamentals → common blocks → reading a real wiresheet).
  The controller-wiring sim is the adjacent capstone for the wiring side.
- **Conventions that bite:** one-question-per-page scope rule (friction
  file); the *Adding a new education lesson* checklist — including the
  `educationSequence.js` order array (build fails without it); paired quizzes
  per lesson (separate `_data/quizzes/<slug>.js` bank, `pairedQuiz`/
  `pairedLesson` frontmatter); `category` in `NAV_CATEGORIES.education`;
  vendor-name and "plain English" guardrails (memories).
- **Possible culmination:** a `/controls/` hub (would be pillar #5). Note the
  interplay honestly: more hubs strengthen the topic-primary-nav trigger, but
  per the directive the hub is built only if the cluster earns it on utility.
- The owner picks the exact lesson list at arc planning — bring him a
  utility-led menu, not a fait accompli.

### Part 2 — the issue appetizer (fixed-size, parallel lanes)

Open ledger: **#170–#176** in `docs/codebase-issues.md` (all logged
2026-07-18).

- **Decision batch** (one options brief → owner picks → fix PRs — the
  visual-brief pattern from this wave worked in a single morning):
  #176 deep-cold high-head masking under the droop (design call),
  #171 section-accent pill contrast (needs a measurement pass),
  #172 touch-parity tail scope (vfds/contact controls).
- **Mechanical batch** (delegated lanes): #170 home Education/Tools desc
  de-enumeration, #173 worker.spec expected-error stack-trace noise.
- **Probably defer** (owner confirms): #174 (air-heads selector family, low),
  #175 (per-mode gauge range, someday).
- **THE ANTI-TREADMILL RULE (owner-endorsed):** new finds during this arc are
  **logged only** and feed the *next* arc's appetizer — discovery never
  extends the current cycle. Keep converting recurring issue classes into
  spec guards (this wave added ~6 and they already caught real regressions).

## The named next flagship: air-side simulator (after this arc)

Deliberately second: it inherits field feedback on the days-old heat-pump
mode, and enters on a clean board. It satisfies the parked
`[future: air-side simulator → second hero demo]` gate (carried in the
friction file). Run it to the flagship standard: pure-Node engine spec,
adversarial verification round, and the equipment-depiction lens the
compressor episode taught — *"would a tech read this machine as operating
correctly"* (rotation sense vs geometry, port/connection fixity, physically
impossible state changes), not just element-motion checks. The owner builds
equipment graphics professionally; his eye is the final QA — bring him
screenshot sets at review time.

## Process notes that worked (keep)

- Orchestrator stays high-level; every code lane is a worktree-isolated
  subagent → one branch + draft PR; owner reviews on GitHub; **never merge
  without his explicit green light** (a merge-captain agent runs owner-cleared
  sequences: CI gates, merge commits, rebase-and-re-bump on version
  collisions, no branch deletion).
- Parallel Playwright suites need per-agent throwaway configs on unique high
  ports (this wave used 8761+); `reuseExistingServer` on a shared port
  silently tests the wrong worktree's build. See memory
  `local-test-port-conflict`.
- Verification-fix policy: confirmed bugs get fixed on the branch
  immediately; judgment calls go to the owner **with visuals**.
- Bumps via `npm version <minor|patch> --no-git-tag-version` (lockfile stays
  in step); serialize bump-carrying merges.

## Where things live now

- Trackers: `docs/codebase-issues.md`, `docs/site-ideas-and-friction.md`,
  `docs/content-audit.md`, `docs/quiz-section-plan.md`. Repo root keeps only
  `CLAUDE.md` + `README.md`.
- Carried `[future:]` markers (friction file): topic-primary nav rewrite
  (hub-count half fired; waits only on the mid-Aug GSC half — a data point to
  collect, not a rudder), multi-membership taxonomy remainder, air-side sim →
  second hero demo.
- `docs/quiz-section-plan.md` residual scope: Mix quizzes (+ optional
  interview-prep drill) — a candidate for a retirement pass during this arc,
  especially if the controls chapters add their paired quizzes.
- Project memory auto-loads (see `MEMORY.md`) — most load-bearing for this
  arc: `utility-over-seo-page-selection` (the directive),
  `owner-equipment-graphics-eye`, `delegate-coding-to-subagents`,
  `rl-sim-flagship-standard`, `verification-fix-policy`.
