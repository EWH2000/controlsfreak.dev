# Session handoff — Phase 9 shipped whole, the glossary arc is decided (2026-08-09)

> **Lifecycle:** written 2026-08-09, evening. The previous file of this
> name was retired earlier the same day (PR #494) when its own condition
> — #275 owner-decided, PR #488 merged — came true; every one of its
> work items then shipped before this file was written, so nothing
> carries over from it. **Retire this file when the glossary arc is
> properly open: the curation rule ratified (accepted or amended) AND
> the pilot-surface design has an owner decision.** At that point the
> arc runs on its own plan and this brief has no job left.

> **VERIFIED 2026-08-10 at `340cf06`** by a standalone `/verify-handoff`
> session that did no other work. 41 factual claims extracted; **34
> verified, 4 corrected, 3 unverifiable** (the owner decisions, and two
> environment traps with nothing to reproduce against). Every correction
> is applied **in place below** and marked `⟨corrected 2026-08-10⟩`, so
> read the file as it stands rather than diffing it against the
> corrections. Six findings the brief did not contain are in
> *Found during verification* at the end. **The corrections were all
> imprecision, not invention** — no claim in this file pointed at
> something that does not exist, and no planned work was invalidated.
>
> **Suite baseline at `340cf06`: 1147 passed, 1 skipped, 0 failed,
> 7.9 min** (full local run, 3 workers, Chromium). **Zero flakes on this
> run** — worth knowing, because the brief warns that one flake per full
> run is normal, so a failure the next session sees is more likely real
> than the base rate suggests. Re-isolate anyway before believing it.
> The single skip is the long-standing `tests/contact.spec.js:49`
> honeypot `test.fixme` (needs `POST /api/contact`, which only the
> Worker serves) — see *Found during verification* #5, because it is
> **not** the fixme the air-side-sim record talks about.

## Read this first

**Every claim in this file is a hypothesis. The repo is the truth.**
Correct it and tell the orchestrator; do not quietly work around a
discrepancy. Today's session re-proved the pattern three times: an
engine-direct refutation overturned PR #488's own fog-recipe story (and
survived an independent re-run before anyone acted on it), a synthesis
lane caught the orchestrator's brief overstating a collision
("register" was never checked), and a verification lane found a
shipping defect (the reset message wiped by its own repaint) that a
full green suite had passed. **Refute before you act; re-run before
you refute.**

## Where things stand

`main` @ **`340cf06`** ⟨corrected 2026-08-10 — the file said `a341878`,
which was true when written and stopped being true when this file's own
PR (#501) merged 7 minutes later; a handoff cannot name the commit that
contains it, so read a commit in a handoff as *"at least this"*⟩,
**v3.83.0**, working tree clean, **zero open PRs, zero stashes, one
worktree, one local branch (`main`)**.

⟨corrected 2026-08-10 — "zero non-main branches" was **false**:
`origin/candidate-b` still exists, tip `0548d66` *"ddc-workbench:
candidate B — squeezed 900x480 layout, for comparison (#205)"*, dated
2026-07-26, **288 behind / 1 ahead** of `origin/main`. Local branches
are indeed `main` only. **Owner call owed:** delete it, or keep it
deliberately as an archival depiction record the way the AHU mockup is
kept. Until then it is a branch point a lane could pick up by
accident.⟩

Counts, **re-derived at `340cf06`** and all four matching: **40
education lessons · 34 content quizzes + 7 field drills · 31 tools ·
9 simulators** (10 non-index files under `html/simulators/`;
`ddc-workbench-ahu-mockup.html` is hidden and carries no canonical —
re-verified: 9 of the 10 carry one).

Thirteen PRs merged today (#488–#500). The five live ships, v3.80.2 →
v3.83.0:

- **#492** — `start-stop-commands` gained the instrumentation-gap beat
  (the safety string's contacts may not be points) with the owner's
  war story, plus a bank question.
- **#488** — Phase 9A: the hardwired low-limit stat the controller
  cannot see (not a roster point — the gap IS the lesson), software
  `LLS Trip` 35 → 41 from field practice, the reset-message ordering
  fix, and the **sustained-cold ramp** (the OA slider writes a target;
  `oaT` walks at 0.5 °F/sim-s; presets snap).
- **#493** — the FCU override drift announces on change-of-value
  (INC = 2 °F canonical), closing #229; the stranded branch and stash
  were retired after triage.
- **#495** — the JUMPERED defeat on the stat's device face: the latch
  keeps setting underneath, it survives presets and program switches,
  and the latch-vs-contacts contrast is taught as two different field
  signatures. The workbench joined the damage-stakes convention (note
  on both tabs) — knowingly reopening the pre-Phase-8 "CLOSED" ruling.
- **#496** — #275 resolved: the workbench remembers the simulation
  across every navigation path (per-tab `cf_ddcw_ahu` / `cf_ddcw_fcu`,
  a shape fingerprint that self-invalidates on model change, a
  one-shot resumed notice with Start fresh, `privacy.html` in the same
  PR). #260's mount reset is deliberately preserved and spec-pinned
  from both sides.

The docs PRs (#489/#490/#491/#494/#497/#498/#499/#500) left the
durable records current: `docs/air-side-sim.md` §Phase 9A (including
the **corrected fog-recipe history**), the #275/#229 resolution blocks,
`docs/warm-climate-freeze-protection.md`,
`docs/tooltip-glossary-scoping.md`, and the friction file's tooltip
entry carrying both the candidacy analysis and the DECIDED note.

## Corrections and traps from this session — do not rediscover these

1. **The fog-recipe history was wrong in PR #488's own body and spec,
   and is now corrected everywhere** — the recorded settled-winter
   reproduction (OAT −15, damper 60 %) SURVIVES the stat, because the
   settled program holds the hot-water valve at 100 %; only the spec's
   arrival-plant recipe was retired. Read `docs/air-side-sim.md`
   §Phase 9A before touching anything fog-adjacent.
   ⟨corrected 2026-08-10 — the file claimed "the ruling-5 entry and
   both LLS backlog entries carry pointers so the stale story cannot
   come back." **Only ruling 5 does.** `docs/air-side-sim.md:388-392`
   carries an explicit fog pointer ("this recipe SURVIVES PR #488
   unchanged … See the Phase 9A section's fog correction"). The two LLS
   backlog entries (`:859-865` trip annunciation, `:866-875` the defeat
   preset) do carry 2026-08-09 pointers, but about the **hardwired-stat
   vs software-latch** scope split — neither mentions fog. So the fog
   story is fenced in **two** places (ruling 5 + §Phase 9A's own
   correction block at `:720`), not three. Adding the pointer to the two
   backlog entries is cheap if you want the third fence.⟩
2. **The item-5 sheet-note mention counts are STALE.** They were
   re-derived at `b80afe1` (proof 8 · low limit 6 · economizer 6 ·
   latch 5 · differential 2 · PID 1), but #488 and #495 rewrote and
   grew the sheet notes since. **Re-derive before the pilot design,
   with the recorded counting rule:** strip tags and collapse
   whitespace first, match stems with `[- ]` for compounds, and state
   whether hrefs were excluded.
   ⟨corrected 2026-08-10 — the file said "11 `ddcw-sheet-note` class
   hits at `a341878`". That is **the AHU page alone**. Measured at
   `340cf06`, `class=` uses are **11 on `ddc-workbench.html` + 6 on
   `ddc-workbench-fcu.html` = 17 site-wide** (raw string occurrences:
   11 / 7 / 2, the last two in `styles.css`). The pilot is sized off
   this number, so state which page a count is for — someone
   re-deriving "11" against `html/` gets 17 and concludes the figure
   moved again.⟩
3. **`gh pr merge` fails on a draft PR** with a GraphQL error, and
   lane-opened PRs are drafts by instruction — `gh pr ready` first.
   This silently killed one watch-and-merge chain today.
4. **Parallel minor bumps git-merge CLEANLY when both sides picked the
   same number** — no conflict, semantically wrong. Whichever PR
   merges second re-bumps from the new base (`npm version` — never
   hand-edit); it happened three times today (3.81.1, 3.82.0, 3.83.0).
5. **Removing a worktree you are standing in** makes every subsequent
   command in the chain fail on `getcwd` — run post-merge steps from
   the main worktree, and treat the trailing error as noise only after
   confirming the push/merge actually landed.

## The work, in order

### 1. Open the glossary arc — ratify the curation rule

**Owner decision (2026-08-09): the glossary/tooltip arc takes the
flagship slot** — over the branching scenario drills and the MS/TP bus
simulator, both parked, neither rejected. The decision record and the
arc's opening shape are the friction file's DECIDED note (PR #500);
the evidence is `docs/tooltip-glossary-scoping.md` (60 terms; 17
single-sense / 14 colliding / 13 multi-benign / **16 honestly
unchecked** — the collision dispatch never sent them; ~2,360 marking
sites as a mechanism-stated estimate, ~1,610 with the quiz banks
scoped out, which they should be — engine-painted DOM plus FAQPage
JSON-LD makes them a `quiz-engine.js` component decision, not a
content pass).

**First move, before any design or code: the owner ratifies, amends or
rejects §8's draft curation rule.** It is explicitly not in force. The
collision tier (deadband, coil, differential, reset, RTU — senses
co-occurring inside single quiz explains) settled hand-marked over any
walker; definitions are written in house voice under the two-senses
discipline; the sixteen unchecked tier-1 terms get their sense check
at definition-writing time, not on faith.

### 2. The pilot surface — the sheet-note pass, reshaped

**Owner direction (2026-08-09): dense pages ship background prose
collapsed, expandable per section** — his idea, now a standing
preference. The old item-5 linking pass is reshaped into the arc's
pilot: inline links to owning lessons (page grain) + collapsible
background sections (section grain) + the first hand-marked glosses
(term grain), one disclosure system. Constraints that survive from the
original ruling: prose answering *"what is this machine doing right
now"* stays always visible — only *"what is this thing"* background
may collapse; and any new collapsed pattern must be added to
`tests/contrast-sweep.spec.js`'s force-open list or its ink is never
measured. ⟨verified 2026-08-10 — the list is the `COLLAPSED_CHROME`
const at `tests/contrast-sweep.spec.js:418`, currently
`.nav-menu, .nav-submenu, .tab-pane, .palette, .ddcw-resumed`. A
`<details>`-based collapse would need its selector added there **and**
`settle()` checked, since forcing a `<details>` open is an `open`
attribute, not a style — the same shape as the note at `:421` about the
nav dropdowns being closed with the `hidden` ATTRIBUTE.⟩

⚠️ **A reconciliation is owed at design time, in front of the owner:**
the tooltip-component analysis rules the first surface must NOT be the
AHU (busiest page, hover already spent on annotation highlighting) —
but the sheet notes ARE the workbench pages. One candidate resolution:
pilot the *collapse* on the sheet notes while the *tooltip component*
pilots on a mid-density page; do not pre-decide it.

⟨sharpened 2026-08-10, verification — **the exclusion is wider than
this paragraph implies, and it closes the obvious escape hatch.**
Both halves check out, but they are written at different scopes:
`docs/tooltip-glossary-scoping.md` §7.3 excludes **the AHU** by name
(and its citation `ddc-workbench.html:617-627` is exact — the four
`:has([data-point=…]:hover)` callout selectors), while **§9's phasing
line excludes "the workbench pages", plural**: *"the workbench pages —
densest surface, spent hover gesture — are the last place the pattern
should land, not the first."* The FCU page carries 6 of the 17 sheet
notes, so "pilot on the FCU instead" is open under §7.3 and **closed
under §9**. Take it to the owner as: does §9's plural bind, or was it
§7.3's AHU argument loosely restated? That is the real question under
the ⚠️, and it is worth settling before the design conversation rather
than inside it.⟩

### 3. Small open follow-ons (any lane slot, no ordering)

- **#278** — FCU ramp parity, now buildable: #496's first commit
  (`57cdf3a`, *"fcu: move the commissioning knobs onto the plant"*)
  moved the FCU knobs onto the plant, which is where the target field
  wants to live. Share or identically derive the 0.5 rate.
  ⟨verified 2026-08-10 — genuinely open, and the code already marks the
  seam: `html/scripts/ddcw-fcu-unit.js:235-240` says *"No `oaTarget`
  twin here … this unit has no [ramp]"* and points at the AHU's
  `OA_RAMP_RATE`. The AHU side is `ddcw-ahu-unit.js:405` (the constant)
  and `:576-581` (the chase, which clamps to the target instead of
  asymptoting). Start from that comment.⟩
- **#279** — the FCU stage-button sub-pixel touch-floor flake (fix
  shapes in the entry). **#280** — `--led-*` constants for the
  theme-constant device face. **#281** — the fbe `loadExample` race.
- Older open entries stand: #262 (44×44), #266 (hit-area bleed, design
  call), #274 (simulators-landing chips taxonomy, owner design call),
  plus the #263/#264/#265/#269/#273 candidates.

**Explicitly parked — do not carry as open work:** the scenario drills
and the MS/TP sim (parked by the next-arc decision); #260's mount-reset
fix (its own PR, `fbe-editor.js` reaches three live pages).

## Decisions waiting on the owner

- **The curation rule** (§8 of the scoping record) — the arc's gate;
  nothing in the arc starts before it.
- **The pilot-surface reconciliation** (item 2's ⚠️) — which now has a
  sharper sub-question in front of it ⟨added 2026-08-10⟩: **does §9's
  plural "the workbench pages" bind, or was it §7.3's AHU-only argument
  loosely restated?** If the plural binds, the FCU is excluded too and
  the sheet notes cannot host the pilot at all; if it does not, the FCU
  page and its 6 sheet notes are the obvious candidate. Settle this
  first — it decides whether the ⚠️ is a real conflict or a wording
  slip.
- **`origin/candidate-b`** ⟨added 2026-08-10⟩ — delete, or keep
  deliberately as an archival record? One line either way; see *Where
  things stand*.
- None of the three blocks the item-3 follow-ons.

## Process notes that earned their keep

- **Opus lanes execute; the orchestrator verifies.** Two CPU lanes is
  the ceiling. Every lane is told the brief is a hypothesis — today
  three lanes corrected their briefs and every correction survived
  adversarial re-check before being acted on. The base rate held
  again: refute before acting, **re-run before refuting**.
- One lane → one worktree → one branch → one draft PR; `npm ci` first
  in a fresh worktree; foreground Playwright on a throwaway config
  OUTSIDE the repo on a unique high port. One flake per full run is
  normal — isolate before believing it (#279 and #281 are the
  currently-known flake mechanisms).
  ⟨refined 2026-08-10 — the file said "8000–8099 are occupied." What is
  actually bound on this box right now is **8000–8006, 8080, 8099**
  (plus 3000, 8123, 9090); the rest of the band is free. Avoid the band
  anyway — other household services own it and come and go — but state
  it as *steer clear of 8000–8099*, not as a fact about every port in
  it, or a lane that finds 8007 free starts discounting the brief.
  A working throwaway config is recorded under *Found during
  verification* #4; note the base `playwright.config.js` hardcodes
  :8000 with `reuseExistingServer` on, so a plain `npm test` here waits
  on the sitemap probe and then fails to bind.⟩
- **`docs/codebase-issues.md` is orchestrator-only.** Lanes report;
  the orchestrator writes.
- Merge-captain rules: check draft status before merging; version =
  whichever merges second re-bumps; verify CI is green **for the tip
  being merged**; docs-only PRs merge freely and must not pile up.
- Screenshot capture traps are in project memory
  (`mockup-capture-element-screenshot-trap`): smooth-scroll pages
  animate `scrollTo`, state changes move anchors — measure rects live,
  scroll instant, assert the landing.

## Found during verification (2026-08-10) — not in the original brief

Item 6 blocks CI for every PR and wants an owner pick; the rest
block nothing. They are recorded here because the
verification session did no other work, so this file is the only place
they exist.

1. **`tests/ddc-workbench-session.spec.js:442` cites
   `codebase-issues.md:11589` for #260. #260 is at line 11694.** Line
   11589 is inside a different entry (the FCU roster `Fan Spd` rename
   ruling), so the citation now points a reader at unrelated text. It is
   the only `codebase-issues.md:<line>` citation under `tests/` — the
   others live in archived `docs/audits/` files, where staleness is
   expected and harmless. A hardcoded line number into an append-only
   markdown file cannot survive; cite `#260` by number, or by its
   heading text. **Not yet logged in `codebase-issues.md`** — the
   verification session deliberately wrote nothing there (that file is
   orchestrator-only, and a standalone verifier is not the orchestrator
   of the work it precedes). Log it or fix it in whichever PR next
   touches that spec.

2. **The FCU workbench page carries no damage-stakes scope note; the
   AHU does. Checked deliberately — it reads as correct scope, not a
   gap.** `ddc-workbench.html:3323` holds the `.tool-body-row` sibling
   note ("Nothing here replaces the manufacturer's data or the unit's
   own safeties"), and CLAUDE.md's damage-stakes set names only
   `ddc-workbench`. The AHU's hook is the two safety **defeats** it now
   ships; the FCU has none. Recorded so the next session does not
   re-open it as an oversight — and so that if the FCU ever gains a
   defeat, the note goes with it.

3. **`origin/candidate-b` needs an owner disposition** — see the
   correction under *Where things stand*. It is the only loose end in
   what the brief called the cleanest state this repo has been in, and
   it is a one-line decision.

4. **A throwaway Playwright config that works on this box**, since the
   brief asks every lane to build one and the base config's :8000
   assumption is the trap. Written outside the repo, `NODE_PATH` set so
   `require('@playwright/test')` resolves from the repo's
   `node_modules`:

   ```js
   const { defineConfig } = require('@playwright/test');
   const base = require('/home/ehill/controlsfreak.dev/playwright.config.js');
   module.exports = defineConfig({
       ...base,
       testDir: '/home/ehill/controlsfreak.dev/tests',
       use: { ...(base.use || {}), baseURL: 'http://127.0.0.1:9473' },
       webServer: {
           command: 'npm run build && python3 -m http.server 9473 --directory _site',
           cwd: '/home/ehill/controlsfreak.dev',
           url: 'http://127.0.0.1:9473/sitemap.xml',
           reuseExistingServer: false,
           timeout: 180000,
       },
   });
   ```

   ```
   NODE_PATH=/home/ehill/controlsfreak.dev/node_modules \
     npx playwright test --config=<path> --reporter=line
   ```

   Keep the `/sitemap.xml` readiness probe rather than `/` — that is
   the documented reason the base config uses it, and it is what turns
   a squatted port into an explicit bind error instead of 100+ opaque
   failures.

6. **⚠️ CI IS RED, AND IT IS NOT THIS PR'S DOING — the 44px
   touch-floor assertions have ZERO tolerance and CI now lands on the
   wrong side of the boundary.** This is the highest-value thing this
   session found, and it blocks merging anything.

   `tests/ddc-workbench-ahu-page.spec.js:1894` read
   `a.ddcw-unit-link` height as **43.99993896484375** against
   `toBeGreaterThanOrEqual(44)` and failed the docs-only verification PR
   (#502) — **3 of 3 attempts, initial plus both retries**, so on that
   runner it is deterministic, not flaky. The nine CI runs before it were
   all green, including a docs-only PR 22 hours earlier.

   **The mechanism, measured.** Locally the same element measures
   **exactly 44.0** and passes. Its height is not natural — it is pinned
   by `min-height: 44px` in the `TOUCH-TARGET FLOOR` block, with the
   content shorter than the floor. So the box sits *exactly on* the
   number the assertion demands, and the comparison has **no margin at
   all**: one float step down in any environment that rounds differently
   (these are `isMobile: true` contexts, so a device-scale factor is in
   play) turns a correct layout into a red build. The shortfall is
   **6 × 10⁻⁵ px**.

   **The exposure is 23 assertions, not one.**
   `grep -rn 'toBeGreaterThanOrEqual(44)' tests/` →
   `touch-floor.spec.js` 12, `ddc-workbench-fcu.spec.js` 6,
   `ddc-workbench-ahu-page.spec.js` 5 — every one of them pointed at a
   control whose size comes from one of the **18** `min-height: 44px` /
   `min-width: 44px` declarations. Every pair is zero-margin by
   construction.

   **This reframes #279, which is understated.** #279 records
   `#fcu-stage-2` at `43.999755859375`, isolated at 3-of-8 *local* runs,
   and concludes *"CI on the same tree passed, which is the flake
   signature."* Today is the mirror image — a different element, a
   different page, **CI red 3/3 while local passes cleanly**. Two
   observations with opposite local/CI polarity are not two flakes; they
   are one **boundary** that different environments round to different
   sides. Update #279 accordingly, and widen it beyond `#fcu-stage-2`.

   **Fix shapes — this needs an owner pick, and the two are not
   equivalent:**
   - *Relax the assertion* (tests-only, merges freely). #279 proposed
     `>= 43.5`; that is looser than the problem — it would let a
     genuinely 43.5px control pass and gives away half a pixel of a real
     accessibility gate. An epsilon sized to the artifact
     (`>= 43.99`, or round to 2dp before comparing) kills the false red
     while keeping the gate. Best done **once in a shared helper** all
     23 sites call, with the reason written there, so the next touch
     assertion inherits it instead of re-litigating it.
   - *Pad the CSS floor to 45px* (touches `styles.css` → every live
     page → **needs approval**). This changes real layout on ~18 control
     families to satisfy a measurement artifact, and 45px is not what
     WCAG 2.5.5 asks for. Recommend against.

   The substantive point either way: **WCAG 2.5.5's 44×44 is a CSS-pixel
   intent.** The page genuinely lays out at 44 CSS px; the
   43.99993896484375 is the measurement's device-pixel rounding, not a
   smaller target. The assertion should encode that, and today it does
   not.

5. **`docs/air-side-sim.md:714-718` reads as if the "already near
   freezing" verdict row is still `test.fixme`'d. It is not — #495
   un-fixme'd it, and it passed in this run.** The paragraph says
   *"Kept, `test.fixme` with the argument written above it. The
   defeat/jumper follow-on … makes it sittable again,"* which is an
   accurate history but an ambiguous present tense; a reader could go
   looking for a row to re-enable that was re-enabled five hours
   earlier. The live assertions are
   `tests/ddc-workbench-ahu-page.spec.js:1073` and `:1086`, under the
   OWNER RULING 2026-08-09 comment block at `:1030-1040`. **There is
   exactly one `test.fixme` left in `tests/`** and it is
   `contact.spec.js:49` — grep-verified across the whole directory, and
   corroborated by the suite's single skip. Worth one word ("was
   `test.fixme`'d") next time that file is touched.

## One passing note

The flagship slot is filled by decision, not drift, and the arc
arrives unusually well-armed: a measured inventory, a drafted rule
awaiting ratification, a settled mechanism, and a pilot surface that
was already owed its own pass. Honest readiness: **high** — the two
open risks (the creep rule, the pilot reconciliation) are both
owner-gated on purpose, which is where this repo's risks belong.
