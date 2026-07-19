# Session handoff — two content items, three parked decisions (2026-07-19)

> **Lifecycle:** written 2026-07-19, superseding the first draft of the same
> name. That draft covered three items; **item 1 (guards) shipped as PR #398**
> and its section is gone. Retire this file when items 1 and 2 below ship.

## Read this first

**Every claim in this file is a hypothesis. The repo is the truth.**

The previous draft of this file was measured against the tree before any of it
was built, and **four of its claims did not reproduce** (all recorded below).
Two of them would have produced a guard that silently passed. Every catch came
from an agent opening the file instead of executing the brief. Verify before
you act, and tell every lane you spawn to do the same.

## Where things stand

`main` @ `30bec2c`, **v3.69.4** (v3.69.5 pending on PR #398), clean tree.
Counts: **40 education lessons · 34 content quizzes + 5 field drills · 31
tools · 7 simulators.**

**PR #398 — `test/structural-drift-guards`** ships three ratchets and closes
two of `codebase-issues` #182's three sub-items. Check its state before
assuming; it was a draft awaiting owner review when this was written:

- `tests/link-integrity.spec.js` — fragment + internal-link integrity over
  `_site/`, **plus** the ~358 `learnMore.href` deep links in
  `html/_data/quizzes/*.js` that are injected as JSON and rendered
  client-side, and are therefore invisible to any scan of built HTML. Includes
  a content-based staleness check on `_site/` and a derived (never hardcoded)
  hash-route allowlist.
- `quizOrderGuard` in `.eleventy.js` — **fails the build** when a content quiz
  is absent from `quizOrder.js` or a slug is unclaimed. `category !== 'field'`
  is the discriminator.
- `tests/landing-completeness.spec.js` — every non-index page under
  `html/<section>/` must carry a `.nav-card` on its section landing.

`codebase-issues` **#182 stays open** for its third sub-item, the prose lint.

## Corrections to the previous draft — do not rediscover these

1. **Hash-route allowlist: three landings, not one.** The draft said the
   `location.hash` filter-chip router was only on `html/tools/index.html`
   (6 values). `html/education/index.html` and `html/practice/index.html` run
   the identical router — **25 chip values across three pages**. PR #398
   derives the allowlist by scraping each page's own `.filter-chip`
   `data-category` values, the same way the page JS builds `validSlugs`.
   Education's *card* categories (`control`, `drives`, `hvac`, `sequencing`,
   `commissioning`) are **not** chip values — never derive from card
   `data-category`.
2. **`.card-grid` scoping does not work.** The draft's fix for the
   nav-dropdown double-count was to scope the selector to the landing's card
   grid. Only practice's grid is followed by `</section>`, so a block-slice
   matches 1 of 4 landings. The working approach is the card **anchor**
   (`/<a class="nav-card nav-card--[a-z-]+"[^>]*?href="([^"]+)"/g`) — exact
   counts on all four, and the nav-dropdown duplicates don't carry `nav-card`,
   so they're excluded for free. Also: practice has **two** `.card-grid`
   blocks (content + field), which the anchor approach makes moot.
3. **mtime cannot detect a stale `_site/`.** On a clean tree, source files are
   routinely newer than the newest build output with no content change. PR
   #398 uses a content check instead: every non-templated source `id="…"` must
   appear in the built counterpart.
4. **The prose-lint counts were wrong again** — see below.

## The work, in order

### 1. Prose lint — `codebase-issues` #182 sub-item 3

**Owner decision (2026-07-19): redesign the pattern, ship report-only.**

The draft's replacement regex (terminal/ordinal word **plus** an explicit
chapter qualifier: "of this chapter" / "chapter's" / "this chapter") is the
*second* proposed shape for this lint, and it is **also disproven**. Measured
at `30bec2c`:

- **6 true / 9+ false**, not the claimed 4/1.
- It **misses its own flagship instance**.
  `html/education/metering-devices-txv-eev.html:303` reads *"That closes the
  three-page chapter"* — which contains none of the three qualifier strings.
- It cannot see **9 unqualified "the last page" hits** in
  `duct-static-control.html` and `vav-systems.html`, which are equally
  stale-prone.

The real defect class is **terminal and ordinal claims going stale on append**.
Direction for the redesign: drop the qualifier requirement; match
terminal/ordinal claims (last / first / closes / final / *N*-page) near
"chapter" *or* "page"; then subtract the two provably-safe classes — **opener
claims** (stable when a chapter grows at the end) and **existence claims**
("has its own page in this chapter", which never go stale). Re-measure before
tuning; this is the third formulation, and the first two were both stated
confidently and were both wrong.

The 6 true positives at `30bec2c`: `metering-devices-txv-eev.html:303`,
`reading-a-wiresheet.html:54`, `duct-static-control.html:184`,
`economizers.html:397` and `:115`, `air-unit-identification.html:494`.

Report-only means it does **not** fail CI, so the noise floor is visible before
anything can block `main`. That also means the `metering-devices-txv-eev.html`
line does not have to be fixed in the same PR — but it should be, since it is
a genuine live instance.

**Explicitly declined, with named blockers — do not carry these as open work:**
README tour guard (blocked on README bullets carrying page hrefs — a
docs-format decision, not a test); `privacy.html` storage-key guard (blocked on
a `html/_data/storageKeys.js` manifest existing first — `privacy.html`
describes keys in prose and contains zero literal `cf_*` strings); hub-cluster
completeness (membership is undeclared and may be deliberately curated per the
sharp-shelves preference).

### 2. The commissioning quiz

**Owner decision (2026-07-19): build it, as a `category: field` drill.**

This overrides the deferral recorded at `docs/site-ideas-and-friction.md:2580`
("reopen only on a real demand signal, not on tidiness"). Update that entry
when the drill ships so the two records agree.

Verified state: `html/education/controls-commissioning.html` exists
(`category: fundamentals`, no `pairedQuiz`); there is **no**
`html/_data/quizzes/controls-commissioning.js` and no
`html/practice/controls-commissioning.html`;
`html/practice/controller-swap.html` has no `pairedLesson`.

Shape, matching all five existing drills:

- `category: field` — **no** `quizOrder.js` entry, **no** chip bump on the
  practice landing, **no** `pairedQuiz`/`pairedLesson`. Consequence accepted by
  the owner: the reciprocal `hasPart`/`isPartOf` JSON-LD stays unclaimed. The
  FAQPage JSON-LD still emits, since `head.njk:36` keys off
  `quizzes[page.fileSlug]` existing.
- **Why `field` and not a content quiz:** `NAV_CATEGORIES.practice`
  (`.eleventy.js:59`) has no `commissioning` key, and `navCategoryGuard` fails
  the build on an unknown category. A content quiz would mean a new taxonomy
  category plus a new chip for one page.
- Bank in its own `html/_data/quizzes/controls-commissioning.js`, slug matching
  the filename, **exactly 10 questions**, navCard in the **Field Drills** H2
  section with the 4-pill convention.
- The lesson's anchors are `<h2 class="subhead" id="ccx-*">`, **not** bare
  `<h2 id=>`: `#ccx-p2p`, `#ccx-method`, `#ccx-overrides`, `#ccx-interlocks`,
  `#ccx-trends`, `#ccx-turnover`, `#ccx-loop`. A grep for `<h2 id=` finds
  nothing and will wrongly suggest the lesson has no anchors.
- **Content is genuinely additive.** Only 1 of `controller-swap`'s 10 questions
  touches commissioning (`points-read-is-not-commissioned`), and its own
  explain text frames commissioning as what lies *beyond* the drill. Steer
  around the override/priority-array angle, which is the one real collision.
- The lesson already forward-links `controller-swap` and `field-wiring-sensors`
  in its `relatedLinks()` `quizzes:` group — add the new drill there.

Follow the *Adding a new quiz / drill* checklist in `CLAUDE.md`. Note the
**All** chip on the practice landing (currently 39) and the home Browse-card
`39 Total` pill both need bumping; `tests/landing-chip-counts.spec.js` and
`tests/home-hero.spec.js` derive their assertions at runtime and will catch a
miss. Recent quizzes landed in **two phases** (bank + page first, then landing
cards / counts / README) — see `199478d` for the 8-file Phase B shape.

### 3. Wiresheet Traces drill

**Owner decision (2026-07-19): text-first, with 2–3 real SVGs.**

A drill after `reading-a-wiresheet`: intentionally hard function-block programs
with live values, ~10 questions. Difficulty from **red-herring branches,
inverted-safety traps, and plausible-but-wrong configuration** — deliberately
*not* feedback/last-scan traps.

Most questions use `<pre class="quiz-snippet">`: 44 uses site-wide, 1:1 with
every `gotcha` question, the most consistent pattern in the quiz layer.
`raw-gotcha-low-limit` in `reading-a-wiresheet.js` is the model. **Reserve real
SVGs for the questions where topology — red herrings especially — is the
point.** Render those 2–3 statically in the page and have questions clone them
by id: payload is paid once, they stay in crawlable source, and the
`npm run screenshots` diagram audit reaches them.

Earlier decisions that still hold: `category: field` (no topic chip, no
next-quiz link); no `pairedLesson` — structurally forced, since
`reading-a-wiresheet` already pairs 1:1 with its own quiz and a lesson cannot
carry two.

**The engine dependency, verified empirically.** An SVG in `q.prompt` renders
but leaks into two consumers that strip prompts to text: the Review/miss table
(`quiz-engine.js:771-775`, `innerHTML` → `textContent`, no truncation) and the
FAQPage JSON-LD `Question.name` (`buildQuestionName`/`stripHtml` at
`.eleventy.js:425-428`, invoked from `head.njk:36`) — the latter *publishing*
every `<title>`, `<desc>` and `<text>` node as structured data. Fix: an
optional `figure` field plus a `.quiz-figure` slot. Touch points mirror the
snippet path exactly — `quiz-engine.js:262-263`, `:276-279`, `:374-381`; CSS
beside `.quiz-snippet` at `styles.css:2809-2820`. **`buildQuestionName` reads
only `prompt` and `snippet`, so `figure` is inherently leak-proof for the
JSON-LD — no stripping logic changes.** `validateQuestion` ignores unknown
fields (precedent: `tags` is documented, present on real questions, and
consumed by nothing), so a `figure` key silently no-ops until the engine
change lands.

**Two constraints worth carrying:**

- ⚠️ **`tests/responsive.spec.js` cannot catch the real mobile problem.** It
  flags an element only when `scrollWidth > clientWidth` **and** computed
  `overflow-x` is `hidden`/`clip`; an inline SVG at `width: 100%` can never
  trip it. The lesson SVG is `viewBox="0 0 980 710"` with **8.5px** smallest
  labels, which render at **~3.3px** on a 375px phone. An unreadable figure
  ships green. Legibility is a manual judgment call — `.table-scroll` with a
  `min-width` is the likely answer (its descendants are exempt via
  `closest()`, a separate mechanism from the `INTENTIONAL` selector list).
- **The existing bank's collision surface is wider than "feedback/last-scan."**
  `reading-a-wiresheet.js` (10 questions) also owns the **backward-trace
  method** (`raw-first-move`, `raw-false-leg`) and **idiom recognition**
  (`raw-idiom-reset-chain`, `raw-idiom-band-edge`). Backward-trace is the most
  likely overlap for a trace-oriented drill — steer around it.

Also note `.raw-svg` is styled **page-locally** in
`reading-a-wiresheet.html:20-24`, not in `styles.css`. A quiz figure inherits
nothing from it. Only `.edu-svg` is global (`styles.css:3412-3417`).

Open question for the owner, worth settling before authoring: on a drill
figure, a genuinely descriptive `<desc>` **is the answer** — the lesson's names
the fault outright. The figures need descriptions complete enough to answer
from without stating the verdict.

## Decisions waiting on the owner

Raise these when convenient; none blocks the work above.

- **#177** — the home Practice Browse-card desc names "Surviving Your First
  Months". Reads as a deliberate editorial entry-point, but it is an unguarded
  page-name-in-a-desc surface. One question with a five-minute answer either
  way; carrying it in a backlog costs more than either answer.
- **#168** — the shared `label, .field-label` rule dims scan targets across ~46
  pages. Explicitly *not* a WCAG fail (5.67:1 dark / 5.27:1 light) — it is a
  visual-hierarchy judgment. **Real risk if left un-annotated:** it reads like
  a bug, so someone eventually "fixes" it site-wide and destroys a deliberate
  quiet-label/loud-value hierarchy. The refrigerant-loop sim's page-local
  override is the sanctioned escape hatch and should be recorded as the
  standing answer.
- **#179** — missing follow-on-paragraph margin rhythm on `function-blocks` and
  `setpoint-math-reset`. **The two-page patch is the worst available option** —
  it re-fixes the class and lets page three drift. The shared `p + p` rule is
  correct but is a site-wide prose-rhythm change. Pick shared-rule or won't-fix;
  do not take the middle.

## Process notes that earned their keep

- **Orchestrator stays high-level.** Every code lane is a worktree-isolated
  subagent → one branch → one **draft** PR. The owner reviews on GitHub and
  gives an explicit green light; never merge without it. A worktree starts with
  no `node_modules` — the lane runs `npm ci` first.
- **Tell every lane the brief is a hypothesis.** PR #398's lane reproduced all
  the plan's measurements, then reported three discrepancies rather than tuning
  its code to match — including one case where the plan's own resolver would
  have produced 131 false positives against the plan's own stated result. That
  only happens if the lane is explicitly told that correcting the brief is
  wanted and that the orchestrator, not the lane, decides what to do about it.
- **Captain procedure and its three traps** are in project memory
  (`merge-captain-pattern`): stale green CI runs (match the run's head SHA
  against what you pushed), counts that auto-merge stale without conflicting,
  and masked git exit codes from piping through `tail` inside an `&&` chain.
- **Branches are deleted on merge.** Owner confirmed 2026-07-19.
- **Per-lane Playwright suites** need throwaway configs on unique high ports
  with `reuseExistingServer: false`, run in the **foreground**. PR #398 used
  8801; start above that. ⚠️ **Port 8000 is held by a non-responsive rootless
  podman `pasta` listener**, so the repo's default `webServer` command cannot
  bind — a throwaway config is not optional on this host. One flake per full
  run is normal; isolate the single spec before reporting a failure.
- **`docs/codebase-issues.md` is orchestrator-only** (anti-treadmill): lanes
  report finds, the orchestrator writes them.
- **"Where the verifier disagrees with the finder, the verifier wins" is a bad
  heuristic.** Both layers are fallible; the primary source settles it.
- **An invented convention will propagate as if it were real.** A "cap the
  `relatedLinks` lessons column at 4" rule was improvised mid-session, restated
  as fact in two PR bodies, and **exists nowhere in the codebase** —
  `related-links.njk` imposes no cap and `air-handlers` renders 9. **If a brief
  states a numeric convention, grep for it before honoring it.** See
  `codebase-issues` #183.

## One passing note

The **air-side simulator** remains the named next flagship and gets its own
session. Readiness is substantially higher than "flagship greenfield" implies —
`psychro-engine.js` already provides the mixed-air/coil core, and five of the
eight forced-air lessons contain working models with owner-blessed constants.
Closer to a consolidation job. Full brief in `docs/air-side-sim-scoping.md`.
