# Session handoff — two content items, three parked decisions (2026-07-19)

> **Lifecycle:** written 2026-07-19, superseding the first draft of the same
> name. That draft covered three items; **item 1 (guards) shipped as PR #398**
> and its section is gone. Fact-checked and corrected in place 2026-07-19
> (`/verify-handoff` — see *Read this first*). Retire this file when **all
> three** items under *The work, in order* have shipped. *(The retirement
> condition previously read "items 1 and 2," which silently orphaned item 3 —
> the wiresheet drill — from the retirement test.)*

## Read this first

**Every claim in this file is a hypothesis. The repo is the truth.**

The previous draft of this file was measured against the tree before any of it
was built, and **four of its claims did not reproduce** (all recorded below).
Two of them would have produced a guard that silently passed. Every catch came
from an agent opening the file instead of executing the brief. Verify before
you act, and tell every lane you spawn to do the same.

**This draft was itself fact-checked on 2026-07-19** (`/verify-handoff`, 53
claims extracted, every one proved or disproved by command at `ab73ebb`).
**40 verified, 12 corrected, 1 unverifiable.** The corrections are applied in
place below — this file is the corrected copy, not a log of what was wrong.
Two findings from that pass are worth carrying as method:

- **The corrections clustered into one block, not evenly.** Six of the twelve
  were in the prose-lint item, and they shared a single root defect (below).
  A brief's error rate is not uniform — the block with the most confident
  numbers was the block that was wrong.
- **7 of 19 proposed corrections were themselves wrong.** An adversarial
  re-check against the primary source overturned them and restored the
  original claim. Had the verifier's output been applied unread, it would have
  introduced 7 new errors while fixing 12. *"The verifier wins over the finder"
  remains a bad heuristic in both directions.*

## Where things stand

`main` @ `ab73ebb`, **v3.69.5**, clean tree. (Measurements below cite `30bec2c`
or `ab73ebb`, the commit each was taken at — that is deliberate, not stale.
`html/` is byte-identical across those two commits: `git diff --stat 30bec2c
ab73ebb -- html/` is empty, so both are directly comparable.)
Counts: **40 education lessons · 34 content quizzes + 5 field drills · 31
tools · 7 simulators.**

**PR #398 — `test/structural-drift-guards`** shipped three ratchets and closed
two of `codebase-issues` #182's three sub-items:

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

**Owner decision (2026-07-19): rebuild the pattern and commit it to the repo,
ship report-only.** Updated the same day, after the verification pass found the
evidence base for the first two formulations unreproducible. Both prior numbers
(`4/1` and `6/9+`) are **void** — do not carry either forward.

⚠️ **Why the first two formulations failed, and why a third will too unless
this changes: no regex was ever committed anywhere.** `grep -rn regex` across
`docs/`, `.eleventy.js`, and `.github/` finds only prose glosses. Both
measurements were taken with a pattern nobody can re-run, so neither could be
audited, reproduced, or corrected — only re-asserted. **The first deliverable
is the runnable script, not the number.** Land the pattern in the repo (a
`.mjs` under `.github/scripts/` or `tests/`, invocable by `npm run`), then
measure. A number without a committed pattern behind it is not a measurement.

**The root defect in the previous draft: one label, two different things.** It
used "true positives" for both *regex output* and *hand-picked real defects*,
which made the block self-contradictory — it said the regex "misses its own
flagship instance" at `metering-devices-txv-eev.html:303`, then listed `:303`
first among that same regex's true positives. A line the regex provably cannot
match cannot be one of its true positives. **The redesign must state, per line,
whether it is a hit, a miss, or a hand-pick.**

Corrected measurements, all at `ab73ebb` (`html/` unchanged since `30bec2c`):

- **The 6/9+ split does not reproduce.** A good-faith reconstruction of the
  qualifier-requiring regex gives **13 hits at 7 true / 6 false**. Treat this
  as no more authoritative than its predecessors: the split swings hard on four
  choices the prose never pins down — whether *next* is in the terminal/ordinal
  vocabulary (dropping it takes true positives to **zero**), whether
  *opening/opener* is, the proximity window, and whether the lint runs over raw
  HTML or extracted prose. **Pin all four in the committed script.**
- **The flagship-miss claim holds.** `metering-devices-txv-eev.html:303` reads
  *"That closes the three-page chapter"* and contains none of the three
  qualifier strings — a real defect the qualifier-requiring shape cannot see.
- **10 unqualified "the last page" hits, not 9** — `duct-static-control.html`
  has 9, `vav-systems.html` adds a 10th at `:137`. **3 of the 10 are inside
  JavaScript**, not HTML prose: `:683` is a code comment (arguably out of
  scope), but `:860` and `:884` are string literals painted into the DOM at
  runtime, so they *are* reader-facing and **a lint that scans only HTML text
  nodes will miss them**. Decide that scope deliberately. Note also that 6 of
  the 10 wrap an explicit `<a href>` to the named page, which makes them
  lower-severity — they break on *insertion*, not on append.

The real defect class is **terminal and ordinal claims going stale on append**.
Direction for the redesign: drop the qualifier requirement; match
terminal/ordinal claims (last / first / closes / final / *N*-page) near
"chapter" *or* "page"; then subtract the two provably-safe classes — **opener
claims** (stable when a chapter grows at the end) and **existence claims**
("has its own page in this chapter", which never go stale).

**The previous draft's "6 true positives" list, relabeled.** Every line number
is accurate; the *label* was wrong for half of them. Against the
qualifier-requiring regex:

| Line | Actually is |
|---|---|
| `metering-devices-txv-eev.html:303` | **false negative** — real defect, no qualifier string, regex cannot hit it |
| `duct-static-control.html:184` | **false negative** — same |
| `reading-a-wiresheet.html:54` | **not a hit and not a defect** — has a qualifier but no terminal/ordinal word, and on content it is an *existence claim*, the class the redesign explicitly subtracts as provably safe |
| `economizers.html:397`, `:115` | genuine hits |
| `air-unit-identification.html:494` | genuine hit |

So the list is **3 genuine hits + 2 false negatives + 1 non-instance** — not
six of anything. Rebuild it from the committed script's output rather than
carrying this table forward.

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
Re-confirmed 2026-07-19 after the verification pass surfaced an unused
`controls` key in `NAV_CATEGORIES.practice` — `field` stands as decided.

⚠️ **This overrides nothing — it discharges an already-open item.** The
previous draft cited a deferral at `docs/site-ideas-and-friction.md:2580`
("reopen only on a real demand signal, not on tidiness") and framed the build
as reopening it. **That citation was wrong twice.** The quoted sentence is at
`:2583-2584`, and — materially — **it belongs to a different item**:
*Cross-page Mix quizzes*, which was **dropped 2026-07-19**. The commissioning
bank was never deferred. It sits at `docs/site-ideas-and-friction.md:2590-2595`
under *"Residual scope, still open:"*, carrying
`[future: practice/controls-commissioning.html]`. So there is no deferral to
justify overriding, and no reopening to argue for. When the drill ships,
retire that `[future:]` marker per the *Adding a new tool* checklist step 5 —
that is the only friction-file edit this needs.

Verified state: `html/education/controls-commissioning.html` exists
(`category: fundamentals`, no `pairedQuiz`); there is **no**
`html/_data/quizzes/controls-commissioning.js` and no
`html/practice/controls-commissioning.html`;
`html/practice/controller-swap.html` has no `pairedLesson`.

Shape, matching all five existing drills:

- `category: field` — **no** `quizOrder.js` entry, **no** chip bump on the
  practice landing, **no** `pairedQuiz`/`pairedLesson`. Consequence accepted by
  the owner: the reciprocal `hasPart`/`isPartOf` JSON-LD stays unclaimed. The
  FAQPage JSON-LD still emits, since the condition at **`head.njk:35`**
  (`{% if nav == "practice" and quizzes[page.fileSlug] %}`; `:36` is the emitted
  `<script>`) keys off `quizzes[page.fileSlug]` existing and does **not**
  consult `category` at all. Confirmed empirically — `_site/practice/
  controller-swap.html`, a field drill, carries FAQPage JSON-LD today.
- **Why `field` and not a content quiz:** `NAV_CATEGORIES.practice`
  (`.eleventy.js:59`) has no `commissioning` key, and `navCategoryGuard` fails
  the build on an unknown category. A content quiz would mean a new taxonomy
  category plus a new chip for one page.
  **Considered and declined 2026-07-19:** that same config *does* carry an
  unused `controls` key, which would have avoided a new category. The owner
  kept `field` — the drill's scope is broader than one topic, which is what
  `field` is for. Recorded so the next reader does not re-litigate it.
- Bank in its own `html/_data/quizzes/controls-commissioning.js`, slug matching
  the filename, **exactly 10 questions**, navCard in the **Field Drills** H2
  section with the 4-pill convention.
- The lesson's anchors are `<h2 class="subhead" id="ccx-*">`, **not** bare
  `<h2 id=>`: `#ccx-p2p`, `#ccx-method`, `#ccx-overrides`, `#ccx-interlocks`,
  `#ccx-trends`, `#ccx-turnover`, `#ccx-loop`. A grep for `<h2 id=` finds
  nothing and will wrongly suggest the lesson has no anchors.
- **Content is additive, but the collision surface is wider than one question —
  and the previous draft's steer was backwards.** `controller-swap` has 10
  questions and only `points-read-is-not-commissioned` is *tagged*
  commissioning, whose explain text does frame commissioning as what lies
  *beyond* the drill. But by content, three more overlap:
  - ⚠️ **`points-read-is-not-commissioned` already teaches the
    priority-array/override point** ("priority arrays reset… any slot you leave
    written will quietly fight the sequence"). The previous draft said to steer
    *toward* `#ccx-overrides` as the additive angle and treat overrides as "the
    one real collision" to avoid — those are contradictory, and the second is
    right. **A new override question risks near-duplicate coverage, not a gap.**
  - `dont-disturb-balancing` — "a calibrated balancing valve's position is the
    result of a commissioning procedure"; maps onto the lesson's own three-jobs
    callout (`controls-commissioning.html:32`).
  - `sensors-are-dumb` — point-to-point checkout of an AI in all but name.

  Richest genuinely-unspent anchors: `#ccx-method`, `#ccx-trends`,
  `#ccx-turnover`, `#ccx-loop`.
- The lesson already forward-links `controller-swap` and `field-wiring-sensors`
  in its `relatedLinks()` `quizzes:` group — add the new drill there.

Follow the *Adding a new quiz / drill* checklist in `CLAUDE.md`. Note the
**All** chip on the practice landing (currently 39, `html/practice/
index.html:79-81`) and the home Browse-card `39 Total` pill (`html/
index.html:623`) both need bumping. `tests/landing-chip-counts.spec.js` is
fully runtime-derived and will catch a miss; **`home-hero.spec.js` is derived
only in its drift-guard test at `:97`** — a different test in the same file
hardcodes `toHaveCount(8)` at `:64`, so "that file derives its assertions" is
false as a blanket statement (harmless here, but do not generalize it).

⚠️ **Neither spec covers the non-count obligations.** A miss on `tests/
pages.js`, on `README.md`'s Practice group + count sentence, or on the
friction-file `[future:]` retirement ships **green**. README and friction-file
prose have no guard at all — per `CLAUDE.md`, README once drifted 24 bullets
behind. Work those three by checklist, not by test.

Recent quizzes landed in **two phases** (bank + page first, then landing
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
next-quiz link); no `pairedLesson` — `reading-a-wiresheet` already pairs 1:1
with its own quiz. **Framing correction:** the previous draft called this
"structurally forced… a lesson cannot carry two." It is not forced. The
emitter at `.eleventy.js:626-628` assigns a single scalar `@id` and
`cleanCanonical` would throw on a list — but schema.org `hasPart` accepts an
array, so supporting two would be a small filter change. Say **"the emitter
takes one scalar"**, not "cannot". The decision stands on its merits; only the
justification was overstated.

**The engine dependency, verified empirically.** An SVG in `q.prompt` renders
but leaks into two consumers that strip prompts to text: the Review/miss table
(`quiz-engine.js:771-775`, `innerHTML` → `textContent`, no truncation) and the
FAQPage JSON-LD `Question.name` (`stripHtml` at **`.eleventy.js:474-475`**,
`buildQuestionName` at **`:476-477`** — the previous draft's `425-428` went
stale at commit `56f9125`). `head.njk:36` does not name `buildQuestionName`
directly; it calls `faqPageJsonLd`, which reaches it internally at
`.eleventy.js:500`. The leak is real: that path *publishes* every `<title>`,
`<desc>` and `<text>` node as structured data.

Fix: an optional `figure` field plus a `.quiz-figure` slot.
**`buildQuestionName` reads only `prompt` and `snippet`, so `figure` is
inherently leak-proof for the JSON-LD — no stripping logic changes.**

⚠️ **The snippet touch-point list was incomplete — two were missing, and one
of them is a decision, not a copy-paste.** The full set:

- `quiz-engine.js:36-37` — the schema doc header (missed by the draft).
- **`quiz-engine.js:127-128` — the validation guard that *enforces* the
  gotcha→snippet invariant** (missed by the draft). This is the one that needs
  a judgment call: **does `figure` get a matching required-field check?** Note
  the invariant is enforced one-way only — a gotcha without a snippet fails
  mount, but nothing stops a non-gotcha carrying a snippet, and the render
  guard at `:376` (`q.type === 'gotcha' && q.snippet`) would silently drop it
  from the page while `buildQuestionName` still published it. Don't reproduce
  that asymmetry for `figure`.
- `quiz-engine.js:262-263`, `:276-279`, `:374-381` — as the draft had them.
- CSS beside `.quiz-snippet` at **`styles.css:2809-2821`** (the draft's `2820`
  stops one line short of the closing brace).

`validateQuestion` ignores unknown fields, so a `figure` key silently no-ops
until the engine change lands. The `tags` precedent holds — documented,
present, consumed by nothing. **`inputmode` is not a second example**: it looks
like one but *is* consumed (`quiz-engine.js:410`).

**Two constraints worth carrying:**

- ⚠️ **`tests/responsive.spec.js` cannot catch the real mobile problem.** It
  flags an element only when `scrollWidth > clientWidth` **and** computed
  `overflow-x` is `hidden`/`clip`; an inline SVG at `width: 100%` can never
  trip it. The lesson SVG is `viewBox="0 0 980 710"` with **8.5px** smallest
  labels, which render at **~3.3px** on a 375px phone. An unreadable figure
  ships green. Legibility is a manual judgment call — `.table-scroll` with a
  `min-width` is the likely answer (its descendants are exempt via
  `closest()`, a separate mechanism from the `INTENTIONAL` selector list).
  ⚠️ **Second gap, found 2026-07-19:** `reading-a-wiresheet.html` is swept at
  375px but is **absent from `PHONE_SE_PAGES`** (`responsive.spec.js:24-35`),
  so it has **no 320px coverage at all** — and every other education page in
  that list is there because it previously clipped. This page carries the
  chapter's largest SVG (880px cap vs siblings' 740px). 320px is exactly where
  it would be worst, and it is unguarded. Add it while you are in there.
- **The existing bank's collision surface is wider than "feedback/last-scan."**
  `reading-a-wiresheet.js` (10 questions) also owns the **backward-trace
  method** (`raw-first-move`, `raw-false-leg`) and **idiom recognition**
  (`raw-idiom-reset-chain`, `raw-idiom-band-edge`). Backward-trace is the most
  likely overlap for a trace-oriented drill — steer around it.

Also note `.raw-svg` is styled **page-locally** in
`reading-a-wiresheet.html:20-24`, not in `styles.css` (grep for `raw-svg` in
`styles.css` returns nothing). A quiz figure inherits nothing from it.
`.edu-svg` is global (`styles.css:3412-3417`) — but the previous draft's
"**only** `.edu-svg` is global" is wrong: `.bac-svg` / `.mb-svg` are a second
global SVG family (`styles.css:3475-3482`, plus a `.wide` variant at
`:3484-3485`). Correct statement: `.edu-svg` is the only global class
`.raw-svg` *composes with*. (`.fb-svg` / `.hd-svg` / `.lp-svg` / `.vfd-svg`
are comment-only mentions and genuinely page-local.)

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
  with `reuseExistingServer: false`, run in the **foreground**. ⚠️ **Port 8000
  is held by a non-responsive rootless podman `pasta` listener**, so the repo's
  default `webServer` command cannot bind — a throwaway config is not optional
  on this host. One flake per full run is normal; isolate the single spec
  before reporting a failure. *(`UNVERIFIED` — the previous draft said "PR #398
  used 8801; start above that." The number 8801 appears nowhere in the repo, so
  it cannot be confirmed. The actionable part checks out independently: 8801
  and everything through 8930 is currently unbound.)*
- **`docs/codebase-issues.md` is orchestrator-only** (anti-treadmill): lanes
  report finds, the orchestrator writes them.
- **"Where the verifier disagrees with the finder, the verifier wins" is a bad
  heuristic.** Both layers are fallible; the primary source settles it. The
  2026-07-19 pass put a number on it: **7 of 19 proposed corrections were
  themselves wrong** and an adversarial re-check restored the original claim.
  Budget a refutation stage whenever a verification pass will be acted on.
- **Two traps found 2026-07-19, both of which would waste a lane:**
  - `html/_data/educationSequence.js` **does not export `.order`.** It exports
    the URL-keyed lookup object; `order` is a module-local `const` (`:27`) that
    is transformed before export. A lane told to "read `educationSequence.
    order`" gets a `TypeError`. Also note `educationSequenceGuard` checks set
    membership **only, not order** — keeping the array in step with the
    `education/index.html` grid is unguarded by-hand discipline.
  - **`656ae15` is not part of PR #398**, despite sitting directly under it in
    `git log --oneline` (`git merge-base --is-ancestor 656ae15 2eb5d5a` → no;
    it landed via #399). It carries the authoritative record of the shipped
    guard shapes in `docs/codebase-issues.md`. Consequence: reviewing #398 in
    isolation shows the guards without the reasoning, and **reverting #398
    would leave the docs describing guards that no longer exist.**
- **An invented convention will propagate as if it were real.** A "cap the
  `relatedLinks` lessons column at **5**" rule was improvised mid-session,
  restated as fact in two PR bodies, and **exists nowhere in the codebase** —
  `related-links.njk` has no cap of any value (the lessons group is an
  unconditional `{% for %}` at `:74`, guarded only on emptiness) and
  `air-handlers` renders 9. **If a brief states a numeric convention, grep for
  it before honoring it.** See `codebase-issues` #183.
  🙃 **The previous draft of this very bullet said "at 4."** #183's actual
  phantom value is **five**. A note whose entire purpose is to kill an invented
  number reproduced it with a *different* invented number — the failure mode
  demonstrating itself one level up. Corrected 2026-07-19.

## One passing note

The **air-side simulator** remains the named next flagship and gets its own
session. Readiness is substantially higher than "flagship greenfield" implies —
`psychro-engine.js` already provides the mixed-air/coil core, and **five** of
the eight forced-air lessons contain working models with owner-blessed
constants — while **six** carry an interactive widget. Closer to a
consolidation job. Full brief in `docs/air-side-sim-scoping.md`.

⚠️ ***Those two numbers are not a contradiction, and this file previously got
that wrong.** The 2026-07-19 pass read `docs/air-side-sim-scoping.md`'s "five"
at `:14` against its "the other six" at `:141-143`, called it a self-
contradiction, and "corrected" the five to six — **turning a true statement
false.** They count different properties. Six lessons have an interactive
widget (all but `air-balancing` and `dedicated-outdoor-air`). Five of those six
have a physics model with owner-blessed constants: `air-handlers`,
`building-pressure`, `duct-static-control`, `economizers`, `vav-systems`. The
odd one out is `air-unit-identification` — 15 controls and 228 script lines,
but **zero physical constants**; it is a constraint-satisfaction identification
game (`FAMILIES` / `MYSTERIES` / `QUESTIONS` / `survivors` / `firstMismatch`),
so a physics sim has nothing to consolidate from it. Reverted 2026-07-20 after
a scoping session actually opened the file and checked. **An apparent internal
contradiction may be two true statements measuring different properties —
establish what each number counts before reconciling them.*** 
