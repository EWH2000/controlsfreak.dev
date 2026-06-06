# controlsfreak.dev — Quiz Section Planning

> **Status: v1 shipped 2026-05-25 (PR #141); v2 batch shipped
> 2026-05-29/30 (PRs #157 / #158 / #159).** Lane is live at
> `/practice/` (named "Practice" — picked over "Drills" / "Quizzes"
> during scoping). v1 shipped the engine + Modbus Decoding content
> quiz + Surviving Your First Months field drill. v2 added seven more
> content quizzes (Modbus Basics, BACnet Basics, BACnet Networking,
> Pump Control, Hydronic Loops, Load Piping, Hydronic Balancing) and
> the Controller Swap field drill — eight content quizzes and two
> drills now live. Graduating note with the v1 design decisions lives
> in [`site-ideas-and-friction.md`](site-ideas-and-friction.md) under
> *Practice section — quizzes + field drills* (which also tracks the
> v2 ship and the re-scoped v3 list). The **v3 content-quiz arm shipped
> 2026-06-05** across three more PRs (Refrigeration, Controls & Logic,
> Air & Pumps) — all 16 Education lessons now have a 1:1 paired quiz.
> What remains of v3 is the cross-page **Mix quizzes** and the
> **specialized field drills** (plus a Commissioning lesson to parent
> the Controller Swap drill). File stays at root until those land, at
> which point it moves to `docs/audits/quiz/` per the original
> self-direction below.

Planning doc for a new top-level section: quizzes / drills for
building-controls techs. Companion to `site-ideas-and-friction.md`
(general feature ideas) and `codebase-issues.md` (code-quality holds).
Lives at root rather than `docs/` because it's an active plan, not an
archived artifact — once the section ships, this file graduates to a
short note in `site-ideas-and-friction.md` and the file moves to
`docs/audits/quiz/` like other shipped initiatives.

---

## Why a quiz section

Three reasons it fits this site specifically:

1. **Active recall completes the Education loop.** The Education pages
   teach by explanation; quizzes close the loop by asking the reader
   to retrieve. The existing pages already have natural "did you
   catch this?" moments — Modbus 5-digit trap, byte-order swap, VFD
   run-source-vs-speed-reference mistake, BACnet priority-array
   precedence, two-way vs three-way at the load, dew point being the
   number to watch in a pool room. Each is a quiz question waiting
   to be written.
2. **Field-controls culture already runs on drills.** Interview prep,
   Tridium TCP study, BAS Pro Certifications, journeyman exams,
   on-call refreshers. A free, no-login drill site is something techs
   will return to between jobs — different traffic pattern than the
   tools (which get reached for during a job).
3. **Format fits the stack.** A quiz is a JSON-shaped question bank
   + a small classic-script renderer + localStorage for best-score.
   No framework, no backend, no accounts. Same view-source-friendly
   pages that run ten years from now. The reduced-motion / a11y story
   stays simple because there's no animation.

It also opens a new audience lane: someone studying for a cert isn't
necessarily looking for a calculator today, but they'll bookmark a
drill site and come back for weeks.

## The two-audience split

A quiz can either be **a guided tour of the site** (every question
linkable to an existing page) or **a field-knowledge drill** (some
questions reach into topics the site covers in scope but doesn't yet
have pages for). Both are valuable, and they serve different visitors,
so the plan is to ship both — clearly labeled.

- **Site-Content quizzes** — every question is answered by something
  currently on the site. Wrong-answer feedback links to the relevant
  Education or Tool page. Designed for newcomers who want a low-stakes
  way to test whether they absorbed a page, and for the site itself
  to function as a self-paced course. Roughly one quiz per Education
  page, plus a few cross-page mixes (e.g. "All Hydronics", "All
  Protocols").
- **Field-Drill quizzes** — broader scope, can reach into topics the
  site *could* cover but doesn't yet (sequencing details, more
  obscure BACnet services, advanced Modbus quirks, troubleshooting
  scenarios, code questions about commissioning, etc.). Designed for
  experienced techs prepping for interviews or certs. Wrong-answer
  feedback explains the answer inline since there isn't always a page
  to link to — and when a topic recurs in feedback, it becomes a
  candidate for a new Education page (closing the loop with
  `site-ideas-and-friction.md`).

The two flavors share the same engine, same UI, same scoring. They
differ only in the question banks and the "Learn more" footer on
each question's reveal panel.

## Section name — open question

The nav already has Home / Tools / Simulators / Education / Contact.
Adding a sixth lane needs a short, single-word label that fits the
existing typographic weight. Candidates:

- **Quizzes** — clear, generic, low risk. Reads as educational.
- **Drills** — sharp, field-oriented, matches the "field reference"
  tagline and the workstation/BAS visual voice. Slightly more
  personality. Risk: someone unfamiliar with the trade reads it as
  "power drills."
- **Practice** — soft, study-skills coded. Probably too soft for
  the rest of the site's voice.
- **Pop Quiz** — fun but informal; ages poorly.

Leaning **Drills**, with **Quizzes** as the safe fallback. URL would
be `/drills/` (or `/quizzes/`) — pick early, don't change later
(Worker redirect would catch any move, but better to commit).

## Quiz formats

Multiple formats, picked per question rather than per quiz. The engine
should support a small union of question types from day one rather
than just MCQ.

- **Multiple choice (4 options).** The default. One correct, three
  plausible distractors. Reveal explains why the correct answer wins
  *and* why each wrong answer is a common trap (the "trap" is often
  the whole point of the question).
- **True / false with rationale reveal.** Quick-fire. Reveal must
  always show the rationale — a bare "false" doesn't teach.
- **Spot the gotcha — config snippet.** Show a small fragment (a
  Niagara ProxyExt config, a wiresheet wire, a VFD parameter set,
  a Modbus poll definition). Question: what's wrong? MCQ-shaped
  underneath. This format is uniquely on-brand — the site already
  has the visual vocabulary for property sheets and code-like
  surfaces.
- **Read the wire.** Show a BACnet hex blob (already a Tools page!)
  or a Modbus PDU; ask what it is. Could even reuse the
  `bacnet-ip-converter.html` parser to validate. Sister format to
  "spot the gotcha" — both lean on visual fidelity.
- **Numerical answer.** Given 4–20 mA reading + scaling, what's the
  engineering value? Tolerance window (±0.1 or ±1%). Reuses the
  signal-scaling math. Could later cross-link to the calculator
  page as the "show your work" view.
- **Order the steps.** Drag (or arrow-button) re-order: e.g. order a
  BACnet device-discovery sequence, or the boot order of a chilled
  water plant. Higher-effort UI; defer to v2 if it slows v1.
- **Identify on a diagram.** Show a piping schematic (the site
  already has the SVG language for this — load-piping, hydronic-loops,
  pump-control); ask the reader to click the diverting tee, the
  primary loop, the remote DP sensor. Defer to v2; click-on-SVG
  scoring has more edge cases than MCQ.

v1 scope: MCQ + true/false + spot-the-gotcha + numerical. v2 adds
order-the-steps and identify-on-diagram once the engine is proven.

## Initial quiz catalog

Site-content quizzes (one per Education page where it makes sense,
plus a few mixes):

- **Modbus Basics** — 4 data tables, function codes, exception
  responses, request shape
- **Modbus Decoding** — 5-digit trap, signed/unsigned, four byte
  orders, scaling
- **BACnet Basics** — object model, services, priority array, Who-Is
  / I-Am
- **BACnet Networking** — 3 addressing layers, BVLL/NPDU/APDU,
  BBMD/FDR, EBO hex blob reading
- **PID Basics** — what P / I / D each contribute, common tuning
  symptoms, why anti-windup matters
- **VFDs** — cube law, run-source vs speed-reference, parameter
  mistakes that bite
- **Hydronic Loops** — direct vs reverse return, primary/secondary,
  closely-spaced tees
- **Load Piping** — 2-way vs 3-way, variable vs constant flow,
  consequences for the rest of the loop
- **Pump Control** — pump curve / system curve, DP control, DP
  setpoint reset, lead/lag basics
- **Psychrometrics Basics** — seven properties, dew point gotchas,
  pool-room scenario
- **Function Blocks** — wiresheet evaluation order, common patterns
- **Equipment Staging** — stage up / down, lead/lag rotation, runtime
  equalization
- **Hydronic Balancing** — calibrated / auto / PICV, design flow vs
  pressure swings
- **All Protocols Mix** — pulled from Modbus + BACnet question banks
- **All Hydronics Mix** — pulled from loops / load piping / pump
  control / balancing banks
- **Fundamentals Sampler** — light curated set for someone brand-new

Field-Drill quizzes (broader, including future-page topics):

- **Field Wiring & Sensors** — thermistor curves, RTD 2/3/4-wire,
  AI vs AO, transducer wetting current, why a 4–20 mA loop survives
  a wire break differently than 0–10 V
- **Sequencing Scenarios** — chiller plant staging, AHU economizer
  changeover, dehumidification cascades. Forward-links to
  `[future: sequencing.html]`.
- **Troubleshooting** — given a symptom (chilled water won't reach
  setpoint, BACnet device won't appear on discovery, AHU short-
  cycles), what's the most likely cause?
- **Commissioning** — point-to-point checkout, sequence of operations
  verification, balancing reports
- **Tridium / Niagara Quirks** — slot paths, station ↔ supervisor,
  fox vs niagarad
- **EBO Quirks** — graphic bindings, hex blob, server config
- **Interview Prep — Junior** — broad-but-shallow sweep
- **Interview Prep — Mid/Senior** — system-thinking + nuance

Initial ship: 3–4 site-content quizzes (start with the protocol pair
since the existing pages already enumerate the gotchas) + 1
field-drill (Interview Prep — Junior is a good sampler). Grow from
there. Don't ship the index page promising 14 quizzes if only 4 exist
— start with what's good.

## Page architecture

Mirror the existing section shape:

- `html/drills/index.html` (or `/quizzes/`) — landing with filter
  chips (All / Site-Content / Field-Drill / by topic) and a nav-card
  grid. One card per quiz. The same `navCard()` macro the other
  landings use. Cards show question count, est. duration, and a
  source badge ("Newcomer — covered by the site" vs "Field drill").
- `html/drills/<slug>.html` per quiz — single tool-card containing
  the quiz UI. One quiz per page. Frontmatter includes a new
  `nav: drills`.
- The same shared chrome, the same `_includes/layouts/page.njk`, the
  same styles.css vocabulary.

Each quiz page is roughly:

- A title + short intro (one sentence, the framing question or
  scenario the quiz answers).
- A small "settings" row: question count (5 / 10 / all), order
  (sequential / random), reset best-score.
- The question card itself — one question at a time, with a
  progress bar / "Q 3 of 10". Submit reveals the answer panel below
  the question (no jarring page reload). Next button advances.
- A results card at the end — score, time, miss list with "Learn
  more →" links to Education / Tools pages.
- A back-link to `/drills/` like other section pages.

## Tech approach

- **Shared engine: `html/scripts/quiz-engine.js`** — classic script,
  `'use strict'`, exposes a `Quiz` global. Responsibilities: render
  question, score answer, show reveal panel, advance, persist
  best-score + last-seen-index in localStorage, restore on reload.
  No question content — content lives on the page.
- **Per-page question bank** — inline `<script>` in `{% block scripts %}`
  defines a `const questions = [ … ]` array of plain objects, then
  calls `Quiz.mount('#quiz', questions, options)`. Inline keeps the
  questions in the same file as the page that contains them
  (matches how every other page on the site ships logic alongside
  markup), and avoids a build-time JSON-fetching step. The cost is
  larger inline scripts on big quizzes — acceptable given the site's
  no-bundler stance and the fact that 50 questions is maybe 10 KB
  of JSON-shaped JS.
- **Question shape (draft):**

  ```js
  {
      type: 'mcq',                    // 'mcq' | 'tf' | 'gotcha' | 'numeric'
      id: 'modbus-fc-read-holding',   // stable across edits, used by localStorage
      prompt: 'Which function code reads a holding register?',
      choices: [                       // for mcq / gotcha / tf
          { id: 'a', text: 'FC 01' },
          { id: 'b', text: 'FC 03', correct: true },
          { id: 'c', text: 'FC 04' },
          { id: 'd', text: 'FC 15' }
      ],
      // for numeric:
      // answer: 12.5, tolerance: 0.1, unit: 'mA',
      // for gotcha:
      // snippet: '<pre>…</pre>' or a small SVG/HTML block,
      explain: 'FC 03 reads holding registers (4xxxxx). FC 01 reads coils, FC 04 reads input registers, FC 15 writes multiple coils. The most common mix-up is FC 03 vs FC 04 — input registers (3xxxxx) are read-only sensor-like data, holding registers (4xxxxx) are read/write configuration-like data, and a lot of vendor docs are casual about which is which.',
      learnMore: { href: '/education/modbus-basics.html#function-codes', label: 'Modbus Basics — Function Codes' },
      tags: ['modbus', 'function-codes']    // optional, for cross-quiz mixes
  }
  ```

- **localStorage keys.** Namespace `cfd-drills-v1:<quiz-slug>:…` so
  a future schema change can ship behind `v2`. Stored: best-score,
  best-time, attempts count, last completed timestamp. No PII, no
  cross-quiz tracking.
- **Cross-quiz mixes.** A "Mix" quiz page can either inline a curated
  question subset, or import per-quiz banks by reading them from a
  shared `html/_data/quiz-banks/` 11ty data file at build time. Lean
  toward the second once we have 2+ quizzes worth mixing — keeps the
  source of truth in one place.
- **No external deps** — same as everything else on the site. No
  quiz libraries.

## UI sketch

Existing components do most of the work:

- The quiz lives inside a `.tool-card`.
- The question prompt sits at the top in a `.tool-card-title`-style
  `<h2>` (or `<h3>` if the card already has a title above it).
- Answer choices render as a stack of radio-like buttons using the
  property-sheet `.ps-input` styling or a new `.quiz-choice` class
  derived from it. Keyboard-navigable (arrow keys + space). Each
  choice is a `<button>` (not a `<label>`) since it both displays
  and submits — keeps the focus model simple.
- Submit / Skip / Next sit in a `.tool-actions` row at the bottom.
- Reveal panel is a `.callout` (or new `.quiz-reveal` variant)
  beneath the choices, color-coded green for correct / red for
  incorrect using existing semantic colors. Always shows the
  explanation; for incorrect answers, highlights both the user's
  choice and the right one.
- Progress bar at top of card: `Q 3 of 10` text + a thin
  progress-bar element. Same hairline visual language as the
  status lines elsewhere.
- Results card reuses `.callout-success` styling for the headline,
  with a `.ref-table-dense` for the per-question miss list with
  "Learn more →" links.

No new design tokens needed for v1. The "spot the gotcha" format
might reuse the existing property-sheet visual vocabulary inside the
prompt area — promising because it makes the format feel native.

## Accessibility

- Each choice button has visible focus (existing focus-indicator
  rule covers it once `.quiz-choice` is added to the consolidated
  block).
- The reveal panel is announced via `aria-live="polite"` on its
  container — so submitting an answer reads the result + explanation
  for screen reader users.
- Numeric input quizzes use `<input type="number" inputmode="decimal">`
  with `<label for="…">` per the form-input label convention.
- Keyboard-only flow: tab into choices, arrows to move, enter or
  space to select, enter to submit, enter to advance. No mouse-only
  paths.
- Reduced motion respected on any progress-bar animation.

## Visibility into the site

- Add `nav: drills` (or `quizzes`) frontmatter + a new nav entry in
  `_includes/nav.njk`. This makes the nav 6 items wide; check the
  collapse behavior at the existing narrow breakpoints.
- Add the new section's pages to the `PAGES` array in
  `tests/smoke.spec.js`.
- Bump the `package.json.version` minor (it's a section, not a
  patch).
- Cross-link from each Education page to its sibling quiz once it
  exists — "Test yourself →" link near the bottom of the page,
  next to the closing payoff.
- Bump the home-page hero `Latest:` badge to the first quiz when
  it ships.
- Decide whether to add a tools-landing-style "Quizzes" filter chip
  to Education itself (probably no — keep the chip row about content
  category, not format).

## Open questions

- **Section name.** Drills vs Quizzes. (See above.)
- **Site-Content vs Field-Drill — visually distinct or just labeled?**
  Two filter chips on the landing + a small badge on each nav-card
  is probably enough; full visual separation feels heavy.
- **Question difficulty filter** — per-quiz dropdown
  (Newcomer / Journeyman / Senior), or just trust the per-quiz
  scoping? Probably skip for v1; revisit if any single quiz grows
  past 20 questions.
- **Per-question difficulty** — store on the question object so
  Mix quizzes can sample evenly across levels? Defer until the
  first Mix quiz lands.
- **Timing.** Show elapsed time per question? Show best time on
  the results card? Timing turns a study tool into a competition —
  fun for some, stressful for others. v1: show total time on the
  results card, no per-question pressure.
- **Streak / "drill of the day."** Could be cute (one curated
  question per day, anchored to date so it's the same for everyone).
  Probably v2 after the bank is bigger.
- **Sharing.** "I scored 9/10 on Modbus Decoding" share-image? Adds
  a lot of build complexity (OG image generation) for unclear
  payoff. v3 at earliest.
- **Versioning the question bank.** When an explanation is edited,
  should previous best-scores be invalidated? Probably no — the
  question id is the stable handle, and edits to explanations don't
  change the correct answer. If a question's *correct answer*
  changes, bump its id (e.g. `…-v2`).
- **Author-contributed questions** — long term. "Got a good question?
  Send it →" link to the contact form? Could grow the bank without
  growing my workload. Worth thinking about once the format is
  proven.

## Out of scope

- Accounts, logins, user profiles, leaderboards.
- Server-side scoring or storage. localStorage only.
- Adaptive difficulty (questions getting harder as you do well).
  Possible v3 but heavy.
- Spaced-repetition / Anki-style review scheduling. Could be a
  separate `/spaced/` section eventually; not bundled into the
  quiz section.
- PDF / printable cheat-sheet export. Nice-to-have, not load-bearing.
- Quiz authoring UI on-site. Questions are authored in the source
  the same way every other page is.

## Suggested ship plan

Three increments — each ships independently, no big-bang.

1. **v1 — engine + 1 quiz.** ✅ **Shipped 2026-05-25 in PR #141.**
   Built the quiz engine + the landing page + the **Modbus Decoding**
   content quiz. Also shipped the **Surviving Your First Months**
   field drill in the same PR so the Field Drills section opened
   populated rather than carrying an empty-state placeholder. v1
   exercised MCQ + T/F + spot-the-gotcha + numeric formats and
   validated the engine, the styling vocabulary, the `cf_quiz_<slug>_*`
   localStorage shape, and the two-section landing with topic-chip
   refinement. See `site-ideas-and-friction.md` for the design-
   decisions writeup.
2. **v2 — second wave of site-content quizzes.** ✅ **Shipped
   2026-05-29/30 across PRs #157 / #158 / #159.** Landed the protocol
   trio (Modbus Basics, BACnet Basics, BACnet Networking) and the
   four hydronics quizzes (Pump Control, Hydronic Loops, Load Piping,
   Hydronic Balancing), plus the **Controller Swap** field drill — all
   mapped to existing pages, no new question types. PID Basics and VFDs
   slipped to v3 (see below). Also fixed CI to run in the prebuilt
   Playwright container so the browser-download stall stopped blocking
   merges.
3. **v3 — remaining quizzes, field drills + mixes.** The content-quiz
   arm ✅ **shipped 2026-06-05** across three PRs: Refrigeration
   (Refrigerant Cycle Basics, Superheat & Subcooling, TXVs vs. EEVs),
   Controls & Logic (PID Basics, VFDs, Function Blocks), and Air &
   Pumps (Psychrometrics Basics, Equipment Staging) — completing the
   1:1 lesson↔quiz matrix (all 16 lessons paired) and adding the
   `Refrigeration`, `Controls`, and `Psychrometrics` topic chips
   (Equipment Staging filed under `Hydronics`). **Still open:** more
   specialized field drills (Field Wiring & Sensors, Sequencing
   Scenarios, Junior Interview Prep), then the **now-unblocked**
   All-Protocols and All-Hydronics Mix quizzes (cross-page reuse via a
   shared `_data/quiz-banks/` data file — enough banks now exist).
   Defer order-the-steps and identify-on-diagram formats unless one
   becomes clearly necessary. Surviving Your First Months may be
   retired here if the specialized drills cover the same ground better.

Pause for review between each increment so the visual + UX choices
get a real check before propagating.

---

*Last updated 2026-06-05 — v1 shipped in PR #141, v2 in PRs
#157 / #158 / #159; v3 content-quiz arm shipped 2026-06-05 (all 16
lessons now paired). Mix quizzes + specialized field drills still
open.*
