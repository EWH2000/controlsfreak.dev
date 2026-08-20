# The glossary / tooltip arc — living design doc

> **Living design doc — owner-active, scope evolves.** Opened
> 2026-08-10, when both of the arc's gates closed (curation rule
> ratified as amended; pilot surface decided). Lineage: the friction
> file's *Hover tooltips* entry (raised 2026-07-28, deferred
> 2026-08-03, DECIDED as the next arc 2026-08-09) →
> `docs/tooltip-glossary-scoping.md` (the frozen measurement record,
> 2026-08-09) → this file. The scoping record stays the evidence base
> and the single live copy of the curation rule; this file is the
> plan and the decision log. When the two disagree, this file
> supersedes by date — the air-side arc's "carried forward" pattern.

## The rule in force

**§8 of `docs/tooltip-glossary-scoping.md`, RATIFIED AS AMENDED
2026-08-10 — read it there; it is deliberately not copied here**
(one live copy, pointers everywhere else — the two-source-drift
rule). The one amendment: the stall criterion covers *used bare
where it isn't defined* in both shapes — defined on one other page
(the define-elsewhere idiom) or defined nowhere on the site yet (the
zero-definition terms). The eleventh-tooltip test and its two guards
(phase 1 capped at the verified tier-1 set; §4 collision terms get
disambiguation entries, never definitions) govern throughout.
Definitions are written in house voice under the two-senses
discipline.

## The pilot decision (2026-08-10) — split across surfaces

The §7.3-vs-§9 conflict the 2026-08-09 handoff flagged resolved on
evidence: **the FCU page has zero `:has()` hover callouts** (the four
callout selectors live only in `ddc-workbench.html`), so §9's plural
"the workbench pages" was a loose restatement of §7.3's AHU-only
argument — and the collapse pattern is click-driven, so the
spent-hover argument never applied to it on either page. The owner's
ruling:

- **The collapse + inline-lesson-links half pilots on the workbench
  sheet notes, both pages.** This reshapes the former "item-5 sheet-
  note linking pass" (#275's resolution notes point here) into the
  arc's pilot: links to owning lessons at the page grain, collapsible
  background prose at the section grain, one disclosure system.
- **The tooltip/gloss component pilots on a mid-density page** —
  NOT a workbench page (§7.3's argument does bind tooltips on the
  AHU, and pattern-proving belongs on a calmer surface first).
  Candidate pages: three were proposed and the owner picked
  `education/timers-and-delays.html` (2026-08-10 — see the decision
  log). **Settled.**

## Phasing (derived from §9 of the scoping record; live copy here)

1. **Pilot** — the split pilot above. Design proposals + a rough
   interactive mockup go to the owner before any page ships;
   scope is expected to evolve through his interaction with it.
2. **Tier 1** — the verified single-sense set (§3a), on the prose
   surfaces (tools, education, landings). One definition each.
3. **The §3b unchecked terms** join tier 1 after a per-term sense
   grep — cheap, and several are the purest stall candidates.
4. **Multi-benign (§5)** — a written matching rule per term.
5. **The collision tier (§4) only with per-context handling** —
   disambiguation entries or exclusion; never gates earlier phases.

The quiz banks stay out of scope until §7.2's component question is
answered (engine-painted DOM + FAQPage JSON-LD make bank marking a
`quiz-engine.js` component decision, not a content pass). The
suppression-on-owning-page constraint (§7.4) is a **component
requirement**: the gloss machinery needs per-page (or per-section)
suppression support, designed in from the start.

## Standing constraints for the collapse pilot

Carried forward from the retired 2026-08-09 handoff so they don't
evaporate with it:

- **Only "what is this thing" background may collapse.** Prose
  answering *"what is this machine doing right now"* stays always
  visible — that split is per-note editorial judgment and part of
  the design deliverable. The workbench's damage-stakes scope note
  is always-visible by its own convention (it must show on every
  tab) and is not a sheet note.
- **Any new collapsed pattern must be reachable by the contrast
  sweep** — or its ink is never measured. The instrument depends on
  HOW the pattern hides: `COLLAPSED_CHROME` in
  `tests/contrast-sweep.spec.js` is right for `hidden`/`display`
  collapses, and **wrong for `<details>`**, whose closed state is an
  absent `open` ATTRIBUTE that both of that list's arms no-op
  against. RESOLVED for `<details>` by the collapse pilot: a third
  `settle()` arm setting `open` on `details.prose-fold` (see the
  2026-08-10 decision-log entry). A future non-`<details>` collapse
  is still a `COLLAPSED_CHROME` case.
- **Re-derive the sheet-note mention counts before pilot design.**
  Done, and the recorded raw figure was wrong. Element counts are
  confirmed **unchanged** from the `340cf06` record: 11
  `class="ddcw-sheet-note"` uses on `ddc-workbench.html` + 6 on
  `ddc-workbench-fcu.html` = 17 site-wide (plus 2 rule selectors in
  `styles.css`). But the recorded raw-string figure **11 / 7 / 2 does
  not reproduce under the rule it was recorded with** — the `[- ]`
  stem gives **13 AHU / 7 FCU / 4 `styles.css`**, at `340cf06` and at
  `ab695ca` alike. 11 / 7 / 2 is what hyphen-only matching
  (`sheet-note`) returns, so the prior measure did not follow its own
  rule. The four extra hits are all space-form and non-element: AHU
  L2753 (HTML comment) and L3431 (JS comment) are "wire**sheet
  note**s" — the stem reaching inside the compound *wiresheet*, the
  matching hazard the scoping record predicts for other terms — and
  `styles.css` L4949 / L4971 are prose comments beside the fullscreen
  rules. **No content drifted; only the number was mis-derived.**
  Always state which page a count is for. The counting rule, stated
  in full: match the stem `sheet[- ]note` over the **raw source
  text** with whitespace collapsed, hrefs included (the string never
  occurs inside an `href` value, so inclusion does not move any
  number); counts are occurrences, not matching lines. Note that
  strip-tags-first — the earlier phrasing of this rule — measures a
  different thing entirely, since the class attribute lives inside a
  tag: it returns **0 / 0** for the pages, which is the correct
  answer to "how often does a visitor READ the phrase" and useless
  as an inventory.
- **Forward-link convention:** inline links to owning lessons anchor
  only pages that exist today.
- **New `cf_*` storage keys (if the disclosure system persists
  state) update `privacy.html` in the same PR**, stating the
  storage area's lifetime per key.

## Process notes (arc lanes)

- One lane → one worktree → one branch → one draft PR; `npm ci`
  first; full suite before push; foreground waits only. Lane briefs
  are hypotheses — lanes report discrepancies, the orchestrator
  verifies. Version bumps are merge-captain-only.
- Playwright in a worktree needs a throwaway config OUTSIDE the repo
  on a unique high port (steer clear of 8000–8099 — household
  services own that band). The base `playwright.config.js` hardcodes
  :8000 with `reuseExistingServer` on, so a plain `npm test` in a
  second tree waits on the sitemap probe and then fails to bind.
  Working shape, with `NODE_PATH=<tree>/node_modules` set:

  ```js
  const { defineConfig } = require('@playwright/test');
  const base = require('<tree>/playwright.config.js');
  module.exports = defineConfig({
      ...base,
      testDir: '<tree>/tests',
      use: { ...(base.use || {}), baseURL: 'http://127.0.0.1:<port>' },
      webServer: {
          command: 'npm run build && python3 -m http.server <port> --directory _site',
          cwd: '<tree>',
          url: 'http://127.0.0.1:<port>/sitemap.xml',
          reuseExistingServer: false,
          timeout: 180000,
      },
  });
  ```

  Keep the `/sitemap.xml` readiness probe — it turns a squatted port
  into an explicit bind error instead of 100+ opaque failures.

## Decision log

- **2026-08-09** — the arc takes the flagship slot (owner pick, over
  the scenario drills and the MS/TP sim, both parked; friction-file
  DECIDED note).
- **2026-08-10** — §8 ratified as amended (the zero-definition
  amendment; scoping record carries the marked text). Split pilot
  ruled (above). `origin/candidate-b` retired to the annotated tag
  `archive/candidate-b` in the same session's housekeeping.
- **2026-08-10 — the collapse pilot's fold rulings** (owner, on the
  D1 design proposal). Stated goal: *a less overwhelming, cleaner
  page.*
  - **Fold set, and nothing else:** AHU sheet notes **2, 3, 7, 8, 10**
    — the economizer-permit pair, the 38 / 41 commissioning pair, and
    the two-defeats note — plus **FCU note 2**. Every other sheet
    note stays visible. Two of these overrode the proposal's own
    lean: it argued #10 should stay visible (both defeats are
    performable live) and that the FCU had zero clear candidates
    under a strict reading of the background-versus-live rule. The
    owner folded both. Read the rule as *background may fold*, with
    the reader's page-weight the tie-breaker — not as a classifier
    that decides on its own.
  - **The disclosure system:** `details.prose-fold`, a shared
    `styles.css` block and the third member of the
    `details.tool-preamble` / `.pid-spoiler` ▸/▾ family. Native
    `<details>`, ships closed, no transitions, **no persistence** —
    so no `cf_*` key and no `privacy.html` surface.
  - **Print: every `<details>` on the site prints open** (owner ruling,
    same day, on the pilot's flagged divergence — the retrofit was
    taken, not deferred). `html/scripts/details-print.js` force-opens
    each closed disclosure on `beforeprint` and restores **exactly
    those** on `afterprint`, so a reader's own open one survives.
    It is **site-wide from `layouts/page.njk`**, and that was not a
    selector widening: the pilot loaded its script per-page on the two
    workbench pages, while `<details>` lives on **33** — 30
    `details.tool-preamble` tool pages (the design proposal said five;
    it was wrong), `.pid-spoiler` on pid-tuner, and the two fold
    pages. A per-page tag would have to be remembered 33 times and the
    34th page would print closed silently. The selector is bare
    `details` so a future disclosure inherits the behaviour. A
    disclosure that must stay off paper hides its body with
    `@media print`, never with an exception in that script.
  - **Contrast guard:** a third `settle()` arm setting the `open`
    ATTRIBUTE on `details.prose-fold`, **not** a `COLLAPSED_CHROME`
    entry — membership there would read as "handled" while both of
    that list's arms silently no-op against a closed `<details>`.
    Scoped to `.prose-fold` rather than bare `details` so the older
    idioms keep whatever standing they have today.
  - **Inline lesson links** land at point of use in the same pass —
    including the **two-sense `latch` split** the proposal flagged:
    the safety SR-latch sense anchors
    `education/boolean-logic-latches.html` on both pages, while the
    existing staging-hold "latch" keeps
    `education/comparators-and-deadband.html`. Two anchors on one
    word, two targets, each to its own owner.
- **2026-08-10 — the D2 gloss-component rulings.** Owner decisions on
  the six questions the D2 design proposal put to him, taken against
  the interactive mockup:
  - **Pilot page: `education/timers-and-delays.html`**, terms
    `sr-latch` / `wiresheet` / `change-of-value` — candidate A of the
    three proposed. A calm mid-chapter lesson whose own prose states
    the lean-on-neighbors convention outright and then uses the terms
    bare for the rest of the page, and Education is the archetype
    phase 2 mostly lives on, so the pattern gets proven on its main
    future surface.
  - **Mark EVERY prose occurrence**, not the first per page — the
    recommended default was first-occurrence. Marking stays
    hand-placed in the source; there is no walker and the pilot
    deliberately ships none. The density lever named in §2 of the
    scoping record is therefore live at its wider setting, and the
    eleventh-tooltip control is entirely the curation rule, not the
    styling.
  - **Definitions only** — no owning-lesson link inside the panel
    yet. The panel is structured so a link line can be added without
    a markup redesign, and `glossary.js`'s `owners` already carries
    the target, so this stays a component change rather than a data
    migration. The runtime's blur path already treats focus moving
    INTO the panel as not-a-dismissal; what a linked panel would add
    is Enter/Space moving focus in.
  - The three minor calls all adopted as recommended: **120 ms
    hover-intent delay**, a **2 px `--blue` left rule** on the panel,
    and **no `aria-roledescription`** — the trigger announces as a
    plain button, which is an honest earcon for a thing that is
    operable.
  - Falling out of the build, not decided: **no `cf_*` storage key**,
    so no `privacy.html` change; and the panels join
    `contrast-sweep.spec.js`'s `COLLAPSED_CHROME` force-open list
    rather than taking an `ALLOWLIST` entry — which is what makes the
    panel's opaque `--surface-2` background load-bearing for the
    guard rather than a styling choice.

- **2026-08-10, late (the night grant)** — both pilots SHIPPED live
  by the session under the owner's explicit one-night merge
  clearance: PR #507 (collapse, v3.84.0 — print shim retrofitted
  site-wide to every details idiom at owner ruling) and PR #508
  (gloss, v3.85.0), each through a five-agent adversarial + rendered
  verification round before merge (one blocking hover/click race
  found and fixed with preview/pinned semantics, four guards
  hardened, one finding refuted as a smooth-scroll test artifact).
  Morning items: wiresheet definition wording, the econ fold's
  try-it sentence, an every-occurrence density feel-check on the
  live pilot page.

- **2026-08-11 — the morning pilot verdict** (owner, reading the live
  pilots at work). The feedback loop the pilots existed to run,
  closed:
  - **The gloss component is confirmed as built.** His words: he
    didn't comment on the tooltips *"because they were so good"* —
    the only issue, *"if you want to call it that"*: he was *"left
    wanting more of them."* No tuning round.
  - **Every-occurrence density is confirmed from the demand side** —
    the feel-check morning item closes as *density right, appetite
    for more terms*. The factor-of-two-or-three lever named in the
    scoping record's §2 stays at its wider setting.
  - **Tier-1 definition drafting (phase 2) is unblocked.** The one
    recorded readiness risk — pilot feedback sending the component
    back for tuning — did not materialize; the opposite. When to open
    the phase is the owner's timing call.
  - **The one affordance gap is the fold, not the gloss:** the
    collapsed `details.prose-fold` summary lacks a this-is-clickable
    cue — the deliberately-quiet register (hairline seam, dim mono
    summary, small green ▸) receded past inviting the click it needs.
    Owner levers: bigger marker / bolder outline. Runs as its own
    lane (`fix/prose-fold-affordance`), variants → his pick; the
    styles.css register comment inherits the amended rationale there.
  - The other two morning items (wiresheet definition wording, the
    econ fold's swept-in try-it sentence) were re-raised directly and
    remain open.

- **2026-08-11, later — the rapid-fire rulings** (owner, working the
  re-raised list one by one, same morning; every morning item now
  CLOSED and `docs/next-session-handoff.md` retired this PR — both of
  its lifecycle conditions met):
  - **Fold affordance: the control-bar variant** (loudest of four
    mocks — `--surface-2` fill, `--text` ink, `--border` seam,
    1.05rem marker). "Your logic sold me": the argument that landed
    was that only the filled bar reads as UI rather than
    inferred-interactive. Ships as PR #514.
  - **`wiresheet` definition: KEPT as shipped, no tuning round.** His
    reasoning, worth keeping because it is a curation precedent: he
    says *program* and *wiresheet* interchangeably and picked
    wiresheet as the headword because "program reads too generic to a
    non-BMS user who is expecting something closer to a language like
    C" — then dismissed his own concern as an edge case and further
    term-hunting as *pedantic*: "the language you used more than gets
    the job done." Precedent: definitions need to clear *good enough
    in the trade's ear*, not *perfect term* — don't burn owner review
    cycles polishing headword alternates.
  - **The econ fold's try-it sentence: ACCEPTED in the fold** — and
    the concern inverted into a direction: **"I'm fine folding even
    more, that way someone can read the specific section of prose
    they want while seeing the unit work, without having to scroll."**
    With the control-bar affordance, folds are not a place prose goes
    to be skipped — they are the page's sectional reading mechanism
    beside the live unit. The pilot's owner-ruled fold set (AHU notes
    2/3/7/8/10 + FCU note 2) now *understates* the intent; a
    **fold-set widening pass is queued** (proposal → his ruling;
    per-note editorial judgment still applies, and the damage-stakes
    note stays always-visible by its own convention).
  - **Tier-1 drafting: HELD until the backlog clears** (owner word,
    same morning). The phase stays unblocked; the queued mechanical
    lanes and the new design passes go first.

- **2026-08-12 — §7.2 answered; the hold's lift condition set** (owner
  rulings from the clear-the-decks decision batch):
  - **The quiz banks (750 of ~2,360 sites, 32 %) are IN scope via a
    future `quiz-engine.js` gloss-component lane, sequenced AFTER
    phases 2–3** prove the density on prose surfaces. The FAQPage
    JSON-LD emitter strips triggers to plain text.
  - The 2026-08-11 hold ruling's "new design passes" meant **the
    flagged design calls** (#245 / #272 / #302 and kin) — worked and
    ruled in that same batch, their fixes queued as lanes.
  - **Phase 2 (tier-1 drafting) opens NEXT SESSION**, assuming the
    arc's mechanical queue lands clean.

- **2026-08-12, later — the Phase 2 arc gains its build lane: the PID
  parameter translator (C1).** Owner ruling at the dev-arc-brief
  triage (the brief itself is PARKED for re-triage after phases 2–3;
  the durable record is the friction file's new brief-triage entry).
  The next session's arc shape is therefore the house default —
  content lanes (tier-1 drafting) plus one build lane (the tool).
  Constraints travel with it: vendor-free framing (repeats-per-minute
  ↔ integral time ↔ proportional band ↔ gain; ISA / parallel / series
  algorithm forms named generically), the algorithm-form assumption
  stated in the tool's output, a damage-stakes-adjacent
  verify-at-the-bench note, and it hangs off the PID Tuner.
  `[future: tools/pid-parameter-translator.html]` *(shipped 2026-08-14)*

- **2026-08-11 — the fold-widening ruling: ACCEPT ALL, flags as
  called.** The owner approved the full widening proposal built from
  the two-page prose inventory, unmodified — his words: *"Accept all,
  keep the flags as you called them. Close enough to where I'm happy
  to approve so I can scope it live right as it builds."* The ruled
  after-state, per tab (visible prose blocks outside folds):
  - AHU unit 15 → 4 visible + **5 new folds** (reading-the-graphic ·
    ΔT well · setpoints/deadband/customer · the unseen stat+jumper ·
    overrides); AHU wiresheet 6 → 1 visible + **5 new folds** (proof ·
    heating valve · low-limits drive · trip · one-lie walkthrough),
    existing three folds unchanged.
  - FCU unit 9 → 3 visible + **4 new folds** (overrides · setpoint
    convention · blocked-condenser · fan-heat/ΔT-sign); FCU wiresheet
    5 → 1 visible + **4 new folds** (safeties contents · proof-first ·
    recovery order · off-timer), parked-AO fold unchanged.
  - Flags kept: drill-downs paragraph, the four control captions, one
    orientation anchor per wiresheet, and the FCU directional-scope
    note all STAY VISIBLE; both page preambles convert to the
    standard `details.tool-preamble` disclosure.
  - Consequences the lane carries: `prose-fold.spec.js`'s
    MUST_STAY_VISIBLE list re-derives from this ruling (it encoded
    the superseded background-only rule), its fold-body shape
    assertion widens beyond `p.ddcw-sheet-note`, and the fold-id
    inventory extends. No version bump owed (page HTML + specs only).
    He scopes the built result live before merge (cfdev preview +
    screenshots).
  - **Scoped 2026-08-11, same day (owner, on the cfdev preview +
    screenshots): approved.** The AHU teach-section reorder (the one
    DOM-contiguity deviation) accepted — "not too particular there."
    And the summary register is now UNIFORM: **the "Background — "
    prefix is stripped from the four pilot-generation fold summaries**
    (owner ruling — the control-bar styling does that word's job), so
    every `details.prose-fold` summary site-wide opens with a bare
    title. Shipped on the same PR (#520) as the widening.

- **2026-08-14 — Phase 2 OPENS** (the drafting lanes are running; this
  entry rides the tier-1 drafting PR). Owner rulings banked at the
  arc's opening:
  - **The §3b sense-greps fold into this arc — phases 2 and 3 are
    merged.** The 16 never-checked rows got their per-term greps in
    the drafting pass itself (verdicts recorded in `glossary.js`'s
    SENSE-GREPS block: 14 graduated, 2 failed the in-scope test —
    Y1/Y2/G and make/break/cut-out, both workbench-only), so there is
    no separate phase-3 lane to sequence. The §9 phasing above reads
    accordingly: multi-benign (§5) is the next content tier.
  - **#308 (the two contradictory focus-ring conventions): consolidate.**
    Rides Lane H.
  - **The gloss single-quote guard arm: approved.** Rides Lane H.
  - **C1 ships at full-PID scope**, category `signals` for now — his
    words: "if we build more similar we may start the new 'controls'
    category." The tuner's vendor-dialect prose gets a pointer
    sentence to C1; the vendor-name ruling itself is deferred to the
    ledger.
  - **`docs/next-session-handoff.md` retired on this PR** — both of
    its lifecycle conditions met (the owner worked the morning review
    2026-08-14; this PR opens the Phase 2 arc). Git history retains
    it; its standing constraints were already carried into this file.

- **2026-08-14 — Phase 2+3 SHIPPED: the marking fan-out is live.**
  One session, eight merged PRs: #567 (the #308 focus-ring ruling +
  the single-quote guard arm), #568 (drafting — glossary.js 3 → 42
  entries, §3b greps 14 pass / 2 fail, the handoff retired), #569
  (the C1 PID Parameter Translator, the arc's build lane) + #570
  (v3.89.0), and the four marking lanes #571–#574. **Measured end
  state: 259 marks site-wide — 174 education · 78 tools · 7 hub
  landings** (lane-summary arithmetic disagreed by a few; the grep is
  the record). Marking landed far under the raw-count sizing
  (~253 new vs the ~500–800 budget) — owners[] suppression and the
  prose-only discipline ate most raw hits, which is §7.4 doing its
  job; each PR body carries the per-page marks table and a near-miss
  ledger accounting for every unmarked occurrence.
  Owner rulings at the close, all applied:
  - **Widget UI captions are NEVER-markable** (readout labels,
    line-names, option text — UI-chrome label register, not prose).
    Now in CLAUDE.md's gloss bullet; ~31 lane flags close as correct
    near-misses.
  - **vav-systems stays a non-owner of velocity-pressure** (the 5
    marks stand); **economizer-ratio joins enthalpy-changeover's
    owners** (guard now enforces the M4 judgment; zero rendered
    change).
  - The three conservative curation calls (raw-sig notation lines,
    commandable-surfaced priority-array marks, the DEADHEAD
    state-pill) accepted as shipped.
  Open ledger items spawned: #311 (tuner vendor-name rewrite —
  deferred to its own ruling), #312 (unquoted data-gloss floor —
  extend the arm vs accept). Remaining arc phases per §9: multi-benign
  (§5) with written matching rules, then the collision tier (§4) with
  per-context handling, then the §7.2 quiz-bank component lane — the
  brief re-triage follows.

- **2026-08-15 — §5 multi-benign SHIPPED; the close's decision batch
  cleared.** One session, five merged PRs: #576 (ledger marker
  true-up — four headings contradicted their bodies), #577 (the #311
  ruling executed — tuner rewritten vendor-free), #578 (drafting:
  glossary 42 → 63, a WRITTEN MATCHING RULE per term recorded in
  glossary.js as the lane contract, plus the #312 arm widening), and
  the marking fan-out #579 (tools — 38 marks, 15 pages) / #580
  (education — 72 marks, 22 pages). **Measured end state: 369 marks
  site-wide — 246 education · 116 tools · 7 landings** (+110 over the
  phase-2 close; the first pass where lane arithmetic, the per-entry
  inventory comments, and the reconciliation grep all agree exactly).
  Decision-batch rulings taken in-session: **#311 → REWRITE
  vendor-free**; **#312 → EXTEND the arm** (every non-double-quoted
  `data-gloss` spelling now fails the build).
  Process notes banked:
  - The 13-family inventory fan-out sized from per-page prose
    classification, per the phase-2 lesson — ~1,100 raw hits reduced
    to 110 shipped marks (the §5 premise held in all 13 families; no
    §4 demotion anywhere).
  - A 7-checker adversarial round before the drafting PR: 26
    findings, 19 applied — 4 BLOCKING, best catch the AO definition
    narrowed to position commands while its own designated mark site
    is a VFD speed reference. 4 findings refuted as sweep-scope
    ambiguity, which became the named **SWEEP-SCOPE** ruling.
  - New named surface rulings in the §5 banner: SWEEP-SCOPE,
    ANCHORED-LINK, CODE-NOTATION, plus the **DEVICE-NOUN** exclusion
    on enthalpy (energy-recovery device-class uses never mark).
  - **Three entries ship markless by design** (ui, safety-string,
    ak-factor — cross-reference targets / future-page surface), and
    the **landings yield zero §5 marks structurally**: landing prose
    is almost entirely navCard() macro args. Both recorded for the
    next tier's sizing.
  - Owner cleared the two lane judgment calls at review:
    controls-commissioning:128 carries one trigger (freezestat), not
    two adjacent ones on the same panel; lead-lag's anaphoric marks
    wrap the role word, not the article.
  Remaining arc phases per §9: **the collision tier (§4) with
  per-context handling** (the `kind: 'disambiguation'` component is
  still deliberately unbuilt — that design is the next phase's first
  deliverable) → **the §7.2 quiz-bank component lane** → the brief
  re-triage (the friction file's quiz-expansion entry — owner
  direction 2026-08-14 — carries the CEO signal into that pick).

- **2026-08-20 — the §4 collision tier RULED; the disambiguation
  component will NOT be built.** One session: the 4-lane inventory
  fan-out over all 14 families → the disposition proposal (PR #587,
  merged after a 5-checker adversarial refutation round — 7
  BLOCKING applied, 2 findings partially refuted; the full
  applied/refuted ledger is the proposal's §9.1) → the owner's
  per-family ruling, in-session. The ratified record lives as the
  governing block atop `docs/glossary-s4-collision-proposal.md`;
  the shape:
  - **11 plain entries, glossary 63 → 74, expected ~45–75 marks**
    (~25–35 outside dew-point's band): modbus-rtu, duct-static,
    head-pressure, dew-point (bare, plain register — apparatus dew
    point folded into its closing clause), proof-window,
    floating-actuator, deadband, differential-pressure,
    high-static-cutout, mixed-air-low-limit, plus
    **contactor-coil** — the one owner amendment: bare `coil`
    stays excluded AND the priced compound option is taken (1–2
    marks, motivated by the panel-free winding sites on
    electrical-quick-calc the refutation round surfaced).
  - **deadband: AMENDED-PLAIN over the kind panel.** The owner was
    initially leaning C; the deciding argument was that the corpus
    shows one idea at two scales — his own lesson's framing at
    comparators-and-deadband:450 — so a plain geometric-register
    def is true at every surviving site, with the width-convention
    disclosure fitting a closing clause. **Zero A survives ⇒ the
    `kind: 'disambiguation'` component is NOT built** — the
    proposal's §4 stands as the record of the unbuilt design, and
    `glossary.js:42`'s deferral comment stays.
  - **5 family-level exclusions, build-enforced** (bare coil,
    reset, lockout, authority, direct/reverse-acting — plus every
    B family's reserved bare headword): the EXCLUDED map ships
    machine-readable with the three-legged guard arm (non-empty
    once the tier ships, kebab lint, term-equality leg). Q2's
    restated principle — never a sense-ambiguous visible token
    under a sense-scoped id — governs the B compounds' written
    matching rules; Q1/Q3/Q5/Q6 closed as MOOT by the zero-A
    consequence.
  - By-catch approved: the commanding-actuators:190 loop-action
    anchor retarget (a small live-page PR in the execution wave);
    the electrical-quick-calc coil sites are served by
    contactor-coil.
  - **Execution sequence opened:** entry drafting + the EXCLUDED
    map + guard arm in one PR (which also carries the proposal's
    §8-rider items — the glossary.js header true-up, the markless
    annotations, the friction-file re-open marker) → a refutation
    round on the drafts → the ≤2 concurrent marking lanes. The
    standing handoff's retirement condition is half-met by this
    entry; the lanes running satisfies the rest.

## Open questions

- ~~**Mid-density pilot page for the tooltip component**~~ — settled
  2026-08-10: `education/timers-and-delays.html`, decision log above.
- ~~**§7.2 quiz-bank component question**~~ — settled 2026-08-12
  (owner, the clear-the-decks decision batch): **the banks are IN
  scope, sequenced last.** A `quiz-engine.js` gloss-component lane
  runs only after phases 2–3 prove the density on the prose
  surfaces; the FAQPage JSON-LD emitter strips triggers to plain
  text so the structured data never carries gloss markup. Until
  that lane exists, no bank counts as in scope for marking.
  Decision log below.
- ~~**Fold-set widening pass**~~ — settled 2026-08-11 same day:
  ACCEPT ALL on the 18-fold proposal, decision log above;
  implementation lane merged 2026-08-11 as PR #520 (v3.86.0).
