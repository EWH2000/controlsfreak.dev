# Accuracy audit — the eleven post-2026-07-14 lessons (2026-08-07)

> **CLOSED 2026-08-07 — 8 of 8 dispositioned: 7 fixed, 1 accepted as
> written.** Six clean-cut items (**M1, L1, L2, L3, L4, L6**) were fixed
> first; the owner then ruled on the two whose *remedy* was an editorial
> or design choice — **L5** by reworking the DOAS capstone diagram rather
> than softening the prose, **L7** by accepting the wiresheet sentence as
> written. Cross-filed into `content-audit.md` as findings **#57–#64**.
> The audit also shipped a **deliverable**: the two-arm metric-conversion
> guard proposed at the foot of this file, built on the owner's ruling
> (*"a cheap test that may catch it still decreases what we can miss
> ourselves"*) — see *Recommendation* below for what was actually built
> and where it differs from the sketch. This doc is the durable evidence
> record.
>
> **Method:** 15 findings raised, 7 killed by refutation, 8 survive.
> Final severities: **0 high · 1 medium · 7 low.**
>
> **Measured at `main` @ `bd0ac38`** (the Phase 8 wrap-up merge), branch
> `docs/audit-2026-08-accuracy`. Every engine figure was reproduced in
> Node against the site's own `html/scripts/thermistor-data.js`,
> `html/scripts/fbe-engine.js`, and `html/scripts/units.js`; every quiz
> answer was checked against its lesson and against the arithmetic.
> Quoted prose is the pre-fix text where a fix has since landed.

## How this file is used

- Findings are **report-only** as a class; the *fix policy* is what
  moved six of them. Confirmed mechanical bugs were fixed on the branch
  (the owner reviews the diff on GitHub); anything whose remedy is a
  judgement call the owner owns stays here and waits.
- **Severity**: **high** = a wrong number/enum a field engineer could
  act on and be misled; **medium** = a false citation or a figure that
  materially over/understates, values otherwise sound; **low** =
  cosmetic naming, completeness gaps, pedagogical simplifications, and
  consistency nits.
- **Confidence**: **high** = reproduced against a primary source or the
  site's own engine in Node; **medium** = a defensible
  editorial/standards read.
- Each finding carries, in order: page/location, the claim as written,
  the verdict, evidence + source, a suggested fix, severity +
  confidence, and its disposition.

## Scope

**Basis: everything that landed *after* the 2026-07-14 accuracy audit**
(`content-audit.md:2615`, post-forced-air, 0 high / 2 medium / 6 low).
Eleven lessons under `html/education/`, all first committed 2026-07-15
or 2026-07-18, plus their ten paired quiz banks in
`html/_data/quizzes/` (exactly 10 questions each = **100 questions**):

| lesson | lines | category | paired bank |
|---|---|---|---|
| `dedicated-outdoor-air.html` | 491 | forced-air | **none** |
| `analog-sensing.html` | 324 | signals | yes |
| `boolean-logic-latches.html` | 393 | programming | yes |
| `commanding-actuators.html` | 384 | signals | yes |
| `comparators-and-deadband.html` | 528 | programming | yes |
| `reading-a-wiresheet.html` | 563 | programming | yes |
| `setpoint-math-reset.html` | 472 | programming | yes |
| `start-stop-commands.html` | 344 | signals | yes |
| `status-and-proof.html` | 319 | signals | yes |
| `temperature-sensors.html` | 273 | signals | yes |
| `timers-and-delays.html` | 540 | programming | yes |

⚠️ **The scope basis is "landed after the 2026-07-14 audit," NOT "never
mentioned in an audit doc."** A name-mention test over the audit docs
returns *sixteen* lessons, not eleven — because a clean page produces no
finding, so absence of mention proves nothing about whether a page was
read. Read the eleven as *the set no audit has had the chance to
examine*, and the other five as *examined and clean*.

**Where the risk actually was, and why the audit was weighted there:**
`tests/quiz-banks.spec.js` is **shape-only**. It checks the array
export, a known `type`, kebab-case unique ids, exactly one
`correct: true`, boolean `tf` answers, and a finite numeric
answer + tolerance. **Nothing anywhere asserts that a quiz's
marked-correct answer is factually right, or that a numeric answer
matches its lesson's arithmetic.** One hundred questions with zero
correctness coverage was the largest unexamined surface in scope, and
two of the eight surviving findings came out of it. There are also
**zero `// user to verify` / `TODO` / `FIXME` / `XXX` markers anywhere
under `html/`**, so the pass got no free leads and verified from first
principles throughout.

**Guardrails respected** (each treated as a non-error, per `CLAUDE.md`):

- The **metric worked-example rounding policy** (`CLAUDE.md:376-389`):
  metric temperatures round to one decimal, and a stated delta/result is
  the arithmetic of the **displayed** operands, never the unrounded
  canonical value. This guardrail *killed* a finding (see *Killed by
  refutation* #1) and *created* three (M1, L1, L2) — it cuts both ways,
  which is the point.
- **Quiz prompts are governed by a different rule than lesson prose.**
  They paint after the units walker runs, so they use static
  parentheticals (`48 °F (8.9 °C)`), not `data-us` spans. A quiz prompt
  without spans is correct, not a finding.
- **IP-native formula lines** with IP constants stay IP-native with a
  display-boundary caveat. Not a finding.
- The **exact-vendor-name** guardrail and the **"plain English"** ban.
- **Field variation is content, not noise.** A disclosed divergence
  (the deadband half-vs-full-width convention split, the
  set-dominant-vs-reset-dominant latch split) is the site teaching
  pattern-reading, not an inconsistency to harmonise.

## Headline

**Tally: 0 high · 1 medium · 7 low.**

Eleven lessons (4,631 lines), 100 quiz questions, and the shared
Function-Block Editor they all instruct against — and **nothing a field
engineer could act on and be misled by**. Every engineering figure that
could be reproduced was reproduced: the thermistor and RTD numbers land
on the site's own curve tables to the digit, the reset-schedule algebra
closes in both unit systems, the TON/TOF timing traces are exact against
`fbe-engine.js`'s implementation, and the chatter diagram's
single-comparator trace is *derived* from its own plotted samples,
transition for transition.

The eight surviving findings are of two kinds and no others: **metric
figures that do not close against operands the same passage paints**
(M1, L1, L2 — one defect class, three sites, the reason the rounding
policy exists), and **prose that describes its own diagram or example
slightly wrong** (L3, L4, L5, L6, L7). That second family is the
audit's most useful structural result: on these eleven pages the
*engineering* is sound and what drifts is the **sentence about the
picture** — a block count, a wire colour, a snippet's addition, a claim
about what a diagram marks. Those are exactly the claims no spec
checks and no build guard reaches.

---

## Medium

### M1 — the deadband paragraph's metric swing contradicts its own painted operands

- **Page / location:** `html/education/comparators-and-deadband.html`,
  line 419 — the "One number to be careful with" paragraph. Logged
  independently as **codebase-issues #232**.
- **Claim as written:** "the DB constant here is *half* the band — it's
  applied once up and once down, so the space actually swings
  `<span data-us="2 °F" data-metric="1.1 °C">2 °F</span>` from set to
  reset."
- **Verdict:** **WRONG for a metric reader.** `1.1` is the round of the
  canonical delta (2 × 5/9 = 1.111). But the same paragraph run paints
  every operand a metric reader would use, and every one of them gives
  **1.2**:
  - the two band edges — `75 °F → 23.9 °C` (line 404) and
    `73 °F → 22.7 °C` (line 407): 23.9 − 22.7 = **1.2**;
  - the half-band constant one sentence earlier —
    `1 °F → 0.6 °C` (line 412): doubled = **1.2**.

  So the one paragraph on the site whose entire thesis is *"the constant
  is HALF the band"* fails to demonstrate that relationship in metric:
  a reader who doubles the stated half-band gets a number the sentence
  contradicts. That is a teaching failure on the sentence's own point,
  not a rounding nit.
- **Evidence + source:** the metric worked-example rounding policy
  (`CLAUDE.md:376-389`, from audit-2026-06 #53) — *a stated
  delta/result is the arithmetic of the displayed operands, never the
  unrounded canonical value.* Re-derived by re-running the bounded
  `data-us`/`data-metric` classifier over all **517** pairs in **41**
  files (see *Coverage note*).
- **Suggested fix:** `1.1 °C` → `1.2 °C`.
  **An alternative fix was considered and refuted:** repainting
  `73 °F` as the canonical `22.8 °C` would also make the swing close at
  1.1 — but the passage builds that edge with an explicit `SUBTRACT`
  block (`SP − DB`), and 23.3 − 0.6 = 22.7, so canonicalising the edge
  breaks the arithmetic the sheet performs. The edge is right; the
  swing is what must move.
- **Severity:** medium. **Confidence:** high.
- **Fixed 2026-08-07.** `data-metric` on line 419 changed to `1.2 °C`.
  Closes codebase-issues #232 — and note the resolution is **two spans,
  not one** (see L1); #232 names only this line.

---

## Low

### L1 — the same page's typical-band range keeps the old conversion

- **Page / location:** `html/education/comparators-and-deadband.html`,
  line 443 — "How wide should the band be?"
- **Claim as written:** "A room thermostat usually lands around
  `<span data-us="1–2 °F" data-metric="0.6–1.1 °C">1–2 °F</span>` of
  total band."
- **Verdict:** **INCONSISTENT once M1 lands, and codebase-issues #232
  does not name it.** In isolation `0.6–1.1` is a defensible canonical
  conversion of a standalone range — no operands are painted in that
  sentence. But the page now states, two paragraphs above, that a
  2 °F band swings **1.2 °C**; leaving 1.1 here puts two different
  metric values for the same 2 °F quantity on one page, and drops the
  page's own worked example (1.2) *outside* the typical range it then
  recommends (0.6–1.1). Fixing M1 alone leaves the page
  self-contradictory.
- **Evidence + source:** the page's own line 419 after M1; the same
  half-band `1 °F → 0.6 °C` convention at lines 287 and 412, which
  doubles to 1.2.
- **Suggested fix:** `0.6–1.1 °C` → `0.6–1.2 °C`.
- **Severity:** low. **Confidence:** high on the inconsistency,
  medium on 1.2 being the preferred value (an owner who prefers
  canonical standalone ranges could instead re-cast the sentence to
  avoid restating the same quantity).
- **Fixed 2026-08-07.**

### L2 — the paired quiz bank carries the same defect, in two questions

- **Page / location:** `html/_data/quizzes/comparators-and-deadband.js`
  — `cdb-band-edge-set-point` (prompt + `explain`, lines 84 and 88) and
  `cdb-band-too-wide` (prompt, line 123).
- **Claim as written:**
  - "a 72 °F (22.2 °C) setpoint with a **2 °F (1.1 °C)** band centered
    on it"; and, in the same question's `explain`, "Half of the
    **2 °F (1.1 °C)** band sits each side of setpoint … (in °C:
    22.2 + 0.6 = 22.8, and 22.2 − 0.6 = **21.6**)."
  - "deadband gets widened to **6 °F (3.3 °C)** total"; the `explain`
    then paints "(22.2 ± 1.7 °C displayed-operand: **23.9 and 20.5**)."
- **Verdict:** **WRONG, same class as M1, previously unflagged.** Both
  questions paint the metric operands *in the same breath* and neither
  total closes:
  - 22.8 − 21.6 = **1.2**, and 0.6 doubled = **1.2** — the stated band
    is 1.1.
  - 23.9 − 20.5 = **3.4**, and 1.7 doubled = **3.4** — the stated band
    is 3.3.

  The second is the sharper case: its `explain` *explicitly invokes the
  displayed-operand rule by name* ("22.2 ± 1.7 °C displayed-operand")
  and then states a total that the rule contradicts.
- **Evidence + source:** arithmetic on the bank's own painted figures;
  the rounding policy as above. Found by reading all 100 questions —
  `tests/quiz-banks.spec.js` is shape-only and cannot see this.
- **Suggested fix:** `1.1 °C` → `1.2 °C` (prompt + explain);
  `3.3 °C` → `3.4 °C`; and, for consistency with L1, the same bank's
  "1–2 °F (0.6–1.1 °C) of total band" → `0.6–1.2 °C`.
- **Severity:** low. **Confidence:** high.
- **Fixed 2026-08-07.** All four figures updated.

### L3 — Timers & Delays calls its own eight-block sheet "seven blocks"

- **Page / location:** `html/education/timers-and-delays.html`, line 500
  — the *"Race the window yourself"* capstone.
- **Claim as written:** "The proof-of-flow sheet is the whole lesson in
  **seven blocks**, and it's already built."
- **Verdict:** **WRONG, and self-contradicted on the same page.** The
  Function-Block Editor's `proof` example carries **eight** blocks —
  `cmd`, `sts`, `rst`, `inv`, `fail`, `tmr`, `latch`, `alarm`
  (`html/simulators/function-block-editor.html:338-346`). The lesson's
  own diagram draws all eight, and its own `<desc>` at line 260 opens
  "A function-block sheet with **eight blocks**." A reader who follows
  the capstone's instruction and loads the example counts eight.
- **Evidence + source:** the `EXAMPLES.proof.blocks` array in
  `function-block-editor.html`; the page's own `tdl-d2-desc`.
- **Suggested fix:** "seven blocks" → "eight blocks".
- **Severity:** low. **Confidence:** high.
- **Fixed 2026-08-07.**

### L4 — the Setpoint Math gotcha snippet's ADD output does not equal its own operands

- **Page / location:** `html/_data/quizzes/setpoint-math-reset.js`,
  `smr-flipped-slope` — the `snippet` (line 131) and the `explain`
  (line 138).
- **Claim as written:** the wire-value snippet reads
  `MUL out (m × OAT): 56.7` / `intercept constant: 180` /
  `ADD out: 237`; the `explain` says "85 × 0.667 + 180 ≈ 237".
- **Verdict:** **WRONG arithmetic on a snippet whose whole purpose is
  reading wire values.** 85 × 0.667 = 56.695 → the displayed **56.7**;
  56.7 + 180 = **236.7**, and the unrounded 236.695 rounds to 236.7 at
  the snippet's own one-decimal precision. There is no slope value that
  yields 237 from a MUL output displayed as 56.7. The gotcha asks the
  reader to walk a chain of wire values and spot the bug; a chain whose
  own addition is off by 0.3 undercuts that exercise. (The *answer* is
  unaffected — the LIMIT clamps to 180 either way — which is why this is
  low, not medium.)
- **Evidence + source:** arithmetic; the IP-native analogue of the
  displayed-operand rule.
- **Suggested fix:** `ADD out: 237` → `236.7`, and the `explain`'s
  "≈ 237" / "reads 237" → "= 236.7" / "reads 236.7".
- **Severity:** low. **Confidence:** high.
- **Fixed 2026-08-07.**

### L5 — the DOAS capstone claims to mark five control points; it marks one

- **Page / location:** `html/education/dedicated-outdoor-air.html`,
  lines 313-317 (the claim) and the `doas-d3` SVG at lines 320-408.
- **Claim as written:** "the BMS points that tell the whole story are a
  short list: *leaving-air temperature* and *leaving-air RH / dew point*
  …, the *cooling coil valve or compressor stage*, the *reheat valve or
  stage*, and the *energy-recovery wheel* command and status. Read those
  five in order and you are watching the unit do its one job. **The
  capstone below marks each of them on the airflow path.**"
- **Verdict:** **IMPRECISE — the diagram marks one of the five.** The
  capstone draws the four *stations* in air-path order (wheel, deep
  coil, reheat, fan) and carries exactly one accent-coloured control
  point: the leaving-air RH/dew-point sensor with its "leaving dew point
  setpoint" callout (`doas-d3-dpt`, lines 384-390). Leaving-air
  temperature, the cooling-coil valve/stage, the reheat valve/stage, and
  the wheel command/status are not marked as points. The SVG's own
  `<desc>` (line 322) confirms the scope: it describes exactly one
  control point, calling it "the unit's primary control point." The list
  of five is itself correct and useful; only the sentence pointing at
  the picture over-promises, and it sends a reader hunting for four
  callouts that are not there.
- **Evidence + source:** the `doas-d3` SVG source and its `<desc>`.
- **Suggested fix:** **two forms — the owner picks.** (a) *Prose*:
  soften to what the drawing does, e.g. "The capstone below puts the
  stations they attach to in air-path order, with the leaving dew point
  — the unit's primary control point — marked." (b) *Diagram*: add
  point callouts for the other four and keep the sentence. (b) is the
  better page but is a design change on a live page with a real
  drawing budget, so it is not an audit's call to make.
- **Severity:** low. **Confidence:** high on the finding; the *remedy*
  is an editorial/design choice.
- **Resolved 2026-08-07 — the owner picked (b), the diagram.** His words:
  *"that diagram could use a rework anyway, so let's go that direction."*
  Read as licence for a real pass rather than four minimum-viable markers,
  and the pass found a second defect the finding had not: **the wheel was
  in the wrong place.** The old `doas-d3` drew one casing with the wheel
  sitting entirely in the supply airway and a return duct that came along
  the top and stopped in mid-air above it — so the exhaust stream never
  crossed the wheel, which is the one thing a recovery wheel does. The
  redraw makes the recovery section a tall cabinet carrying both airways
  with a split line between them and the wheel across it; return enters one
  face and exhaust leaves the other, the colour change hidden behind the
  wheel so the wheel is visibly what converts one into the other. On top of
  that: all five points marked, each on a dashed leader to its station and
  labelled with its type (wheel command AO/BO + rotation status BI; cooling
  valve or stage AO/BO; reheat valve or stage AO/BO; leaving-air temperature
  AI; leaving RH / dew point AI, still called out as the primary control
  point); ink follows the owner's own house rule (accent = the program
  writes it, plain bright = a sensor measured it), with an in-SVG key so the
  drawing is self-contained; the two leaving-air sensors moved onto taps off
  the duct because the flow-particle layer paints above everything and was
  occluding their glyphs; the `<desc>` rewritten for the new topology and
  all five points; and a `p.ref-note` stating the scope — five points
  because those five answer whether the unit is doing its job.
  **Verified in pixels, not coordinates** (`npm run screenshots` plus a
  text-bbox overlap probe: 39 text nodes, zero overlaps, nothing outside the
  viewBox) and eyeballed in both themes.
- **Follow-on 2026-08-07 — the exhaust fan is DRAWN and DELIBERATELY NOT
  MARKED.** The redraw above left the exhaust fan out entirely, and an
  ERV-equipped DOAS has one on the return path — without it the wheel has
  nothing pulling air across its exhaust face, so the machine read wrong to
  anyone who knows what a wheel needs. Put to the owner, who builds
  equipment graphics professionally: **"draw the exhaust fan, do not mark
  it."** So `doas-d3-ef` is plain geometry — no callout, no leader, no
  point, no type label — in the supply fan's neutral ink (`--surface` fill,
  `--text-dim` stroke and blade), on the exhaust duct downstream of the
  wheel with its blade pointing toward the exhaust arrow. He explicitly
  accepted the asymmetry: one drawn component with no leader while four
  others have one. **The five-point story is the point of the diagram and
  a sixth station would dilute it — do not "finish" the fan by adding a
  leader.** Ink discipline is the trap here: the fan is neither commanded
  nor read on this drawing, so accent would have broken the rule the
  redraw had just made uniform (accent = the program writes it). It sits
  just outside the casing because the wheel fills the recovery section —
  between the cabinet wall (x=48) and the wheel's edge on the exhaust
  centreline (x≈78) no fan clears both. The `<desc>` names it; the
  `p.ref-note` now reads "supply and exhaust fan start/stop and status" and
  says both fans are drawn and neither is marked, so the omission is legible
  on the page and not just in this file. Re-verified in pixels: `npm run
  screenshots`, plus the bbox probe re-run — still 39 text nodes, zero
  overlaps at 0.5-unit tolerance, nothing outside the viewBox, the fan's
  bbox intersecting no text and no other geometry (nearest neighbour is the
  "exhaust" label, 6.7 units clear), and the flow-particle layer still the
  SVG's last child with particles crossing over the fan rather than under
  it. Eyeballed in both themes.

### L6 — the Comparators capstone says the heating example differs only in two wires

- **Page / location:** `html/education/comparators-and-deadband.html`,
  line 496 — *"Walk the band yourself."*
- **Claim as written:** "Then load the *heating thermostat* and hunt for
  what changed — **the blocks are identical**; only the two wires into
  S and R have traded places."
- **Verdict:** **IMPRECISE — falsifiable by doing exactly what the
  sentence instructs.** Structurally the claim is right: both examples
  carry the same nine block types in the same layout, and the only
  *logic* difference is the S/R swap. But a reader told to "hunt for
  what changed" and then told the blocks are identical will also find:
  the setpoint constant (74 → 70), the space AI value (72 → 68), and
  **all nine block names** (`Cool SP` → `Heat SP`, `Cool Make` →
  `Heat Break`, `Cool Set` → `Heat Reset`, `Cool Latch` → `Heat Latch`,
  `Cool Cmd` → `Heat Cmd`, …). Unlike the workbench pages — where
  `ddcw-shell.js` derives names from the point roster — the FBE example
  names are authored literals, so they are visibly different on screen.
  The hunt returns four kinds of answer and the sentence admits one.
- **Evidence + source:** `EXAMPLES['tstat-cool']` vs
  `EXAMPLES['tstat-heat']` in
  `html/simulators/function-block-editor.html:238-300`.
- **Suggested fix:** scope the claim to the logic — "hunt for what
  changed in the *logic* — same nine blocks, same layout, and only the
  two wires into S and R have traded places. (Its constants and block
  names read for heating; the shape underneath is identical.)" Note the
  page's *other* statement of the same idea, at line 433 ("the same nine
  blocks are a heating thermostat"), is already correct and needs no
  change.
- **Severity:** low. **Confidence:** high.
- **Fixed 2026-08-07.**

### L7 — "every wire on it is grey" describes a branch that has a green wire

- **Page / location:** `html/education/reading-a-wiresheet.html`,
  lines 492-493 (the prose) and line 257 (the `raw-d1-desc` alt text).
- **Claim as written:** "the freeze-trip lamp branch at the bottom:
  never on the path at all — and it's the sheet's best trap, because
  **every wire on it is grey**." The `<desc>` says the same: "the freeze
  stat also branches through a NOT to a freeze-trip lamp binary output,
  currently off, **with every wire grey** — a healthy branch that only
  looks dead."
- **Verdict:** **IMPRECISE.** The branch as drawn has two wires and one
  of them is green. `FRZ OK` reads TRUE, so the tap that feeds the NOT
  — a `<path d="M180 576 H390">` drawn as its own element, in
  `var(--accent)` (line 284) — is green, and the NOT's input pin
  (line 407) is filled `var(--accent)` to match. Only the NOT → lamp
  output wire (line 280) is `var(--text-dim)`. The pedagogical point
  survives — a beginner scanning for grey still lands on the grey output
  wire — but the sentence over-claims, and the `<desc>` version is the
  worse of the two because it is a blind reader's only access to the
  picture.
- **Evidence + source:** the `raw-d1` SVG source, lines 280-285 and 407.
- **Suggested fix:** narrow to the output, e.g. "because the wire out of
  it is grey" / in the `<desc>`, "its output wire grey". **Not acted
  on:** a reader could take "the branch" to mean the NOT and everything
  downstream of it, in which case the sentence is merely loose rather
  than wrong — that is a genuine 50/50 on a live page, and per the fix
  policy a critique that turns on a reading belongs here, not in a
  diff.
- **Severity:** low. **Confidence:** high that a green wire is in the
  branch as drawn; medium that the sentence is wrong rather than loose.
- **Accepted as written 2026-08-07 — no page change.** Owner: *"I think it
  reads well as is."* The medium half of this finding's own confidence is
  what carries: "the branch" scopes to the wires WITHIN it, and re-reading
  the SVG settles which those are. The green `M180 576 H390` runs from the
  freeze stat's tap junction to the NOT's **input** pin — the wire *into*
  the branch — while the one wire the branch owns, NOT → lamp, is
  `var(--text-dim)`. Under that scoping the sentence is correct rather than
  loose, and narrowing it to "the wire out of it" would trade the trap it
  teaches (a healthy branch that scans dead) for a more literal, weaker
  line. The `raw-d1-desc` alt text keeps its wording for the same reason:
  it describes the same branch under the same scoping, so changing one and
  not the other would be the real inconsistency.

---

## Killed by refutation

Seven findings were raised and then killed by adversarially re-checking
them — and their proposed fixes — against the primary source. They are
recorded because this repo has twice measured its own correction error
rate at roughly one in four (7 of 19, then 7 of 31), and because
**four of these seven would have made the site worse.**

1. **`comparators-and-deadband.html:291,407` — `73 °F → 22.7 °C`.**
   Raised because the canonical conversion is 22.778 → **22.8**, and the
   bounded classifier files 22.7 as neither a clean absolute nor a clean
   delta. **Killed:** 22.7 *is* the arithmetic of the displayed operands
   — the passage builds that edge with a `SUBTRACT` block, and
   23.3 − 0.6 = 22.7. This is the rounding policy working exactly as
   written. "Correcting" it to 22.8 would have broken the closure the
   policy exists to protect *and* silently repaired M1's symptom while
   leaving its cause.
2. **`analog-sensing.html:55,188,192` — in. w.c. → Pa at a flat 250.**
   Raised as an undocumented deviation from the exact 248.84 (~0.47%
   high). **Killed:** it is a **site-wide prose convention**, not a
   page-local slip — `building-pressure.html` (5, 12, 7.5, 375),
   `duct-static-control.html` (375, 625, 1000) and `air-balancing.html`
   (5–12) all use the same flat 250, while `units.js:97` carries the
   exact `248.84` for everything the engines actually compute. Round
   prose figures over an exact engine is a deliberate split, the error
   is well inside the "about" precision of the surrounding sentences,
   and all six of analog-sensing's spans are internally consistent
   (0.9 → 225 doubles to 1.8 → 450, which is the paragraph's whole
   point).
3. **`setpoint-math-reset.html:47` — "four math blocks".** Raised
   because the drawn chain has three operating blocks (MUL, ADD, LIMIT),
   or seven counting sources and constants — never four. **Killed:** the
   page frames the schedule as **"y = mx + b *plus a clamp*"**
   throughout, and the y = mx + b half is exactly four blocks: the slope
   constant, the MUL, the intercept constant, and the ADD, with the
   LIMIT named separately every time. A defensible editorial read.
4. **`temperature-sensors.js` gotcha — "35.2 °F on a morning the airport
   reports 32 °F".** Raised because the site's own curve tables give
   35.12. **Killed:** the 0.08 °F gap is inside linear-interpolation
   noise between table rows, the bank's own header hedges it as "≈35.2",
   and no real sensor resolves 0.08 °F. The neighbouring figures in the
   same question (≈3 °F at 40 °F, ≈5 °F at 0 °F) reproduce at 2.65 and
   5.13 — both correctly hedged.
5. **`reading-a-wiresheet.html:526` — "set the deadband constant to 5
   and watch the heat go quiet on a cool space".** Raised as an untested
   runtime claim: on a freshly loaded `tstat-heat` (temp 68, SP 70,
   DB 1) the latch is already SET, and moving DB to 5 leaves S and R
   both FALSE, so a set-dominant latch **holds** and the heat does *not*
   go quiet. **Killed:** the drill is a three-pass sequence, and pass 1
   explicitly ends "out the top" — above the upper edge — which resets
   the latch. Entering pass 2 from that state, DB = 5 does produce the
   described silence. The instruction is self-consistent as written.
6. **`temperature-sensors.html:61,163` — `240 Ω/°F` twinned as
   `440 Ω/°C`.** Raised because 240 × 1.8 = 432, not 440. **Killed:**
   both figures are independently grounded in the site's own Type II
   table — the tight 76-78 °F window gives 240.0 Ω/°F (= 432 Ω/°C) and
   the wider 72-82 °F window gives 246.0 Ω/°F (= 443 Ω/°C). Two
   round "about" figures read off slightly different windows, not a
   conversion error.
7. **`dedicated-outdoor-air.html` psychrometric diagram — the coil
   process drawn as ending *at* the apparatus dew point.** Raised as
   conflating the leaving-air state with the ADP (they differ by the
   coil's bypass factor). **Killed:** the prose defines ADP correctly
   *before* the diagram — "the effective cold-surface temperature the
   leaving air is **pulled toward**" — the diagram is introduced as a
   "stripped-down psychrometric path", and a deep DOAS dehumidifying
   coil genuinely has a low enough bypass factor that "cold, nearly
   saturated" is accurate. A licensed pedagogical simplification.

---

## Coverage note — the metric sweep, verified not redone

The bounded `data-us` / `data-metric` classifier was **re-run**, not
re-derived. Method: parse the leading number `F` from `data-us` and `C`
from `data-metric` (normalising `&minus;` / U+2212 / `&nbsp;` first —
without that normalisation the parser mis-signs every negative span and
manufactures false hand-inspects); classify **absolute** if
`|C − (F−32)·5/9| ≤ tol`, **delta** if `|C − F·5/9| ≤ tol`, with
`tol = max(0.5 × 10^(−decimals(C)), 0.06)`. The two tests can never both
match except at F = 32.

**Population confirmed: 517 `data-us`/`data-metric` pairs across 41
files** — 2 of which are doc-comment examples in
`html/scripts/units.js`, leaving **515 content spans in 40 files**. Of
the °F→°C spans, 55 are label-only (`Dry-bulb (°F)` → `Dry-bulb (°C)`,
no numeral) and **199 carry numbers**: **141 absolute, 45 delta,
13 hand-inspect**.

⚠️ **Correcting the record.** The parent plan for this lane stated
"27 delta spans in 11 files." **That is wrong, and no slicing of the
population produces it** — the delta set is **45 spans in 17 files**
under the normalised classifier (41 in 16 under an un-normalised one,
which is the likely origin of the smaller figure but still not 27/11).

**A delta conversion is not itself a defect** — it is the *correct*
conversion for a difference. The #232 defect is one level in: a delta
span is wrong when the same passage **also paints the two metric
operands and they don't close**. Forty of the forty-five are correct on
that test. The five live ones and their dispositions:

| item | disposition |
|---|---|
| `education/comparators-and-deadband.html:419` — `2 °F` → `1.1 °C` | 🔴 **M1 — confirmed, FIXED** → `1.2 °C`. Closes codebase-issues #232. |
| `education/comparators-and-deadband.html:443` — `1–2 °F` → `0.6–1.1 °C` | 🔴 **L1 — confirmed, FIXED** → `0.6–1.2 °C`. #232 does not name this line; the fix is two spans, not one. |
| `education/coil-selection.html:170` — `30 °F` → `16.7 °C` | 🟢 **Not a defect today — accepted as-is.** The 180/150 schedule it references is plain prose and renders identically for a metric reader, so no metric operands are painted for 16.7 to close against; 16.7 is the correct canonical delta round of 16.667. It becomes a defect only if someone later dual-states 180/150 (82.2 − 65.6 = 16.6). Recorded so a future sweep sees the trip-wire. |
| `simulators/pid-tuner.html:430` — `an 8 °F rise on a 0–100 °F span` → `a 4 °C rise on a 0–50 °C span` | 🟢 **Working as designed — accepted as-is.** This is a metric-native **re-instantiation**, not a conversion: the sentence teaches a *ratio* ("Enter the PV change as a percentage of the loop's span … is 8 %"), and 4/50 = 8 % exactly as 8/100 = 8 %. `0–50 °C` is a real metric sensor span; the exact conversion (4.4 °C on a 0–55.6 °C span) would give the same 8 % with numbers no instrument has. Recorded explicitly so a later sweep does not "fix" it. |
| `tools/thermistor-calculator.html:320` — `1 °F` → `0.5 °C`, `150 °F` → `65 °C` | 🟢 **Accepted as-is.** An accuracy *disclaimer* about a curve-fit error, stated with "roughly" and as ranges (`2–5 °F` → `1–3 °C`, `−40 °F` → `−40 °C`, which is exact). Deliberate coarse round figures in both systems; nothing here is a worked-example operand, so there is no arithmetic to close. |

**Both live workbench pages are clean** and were not skipped:
`simulators/ddc-workbench.html` carries 2 spans and
`simulators/ddc-workbench-fcu.html` 1, none with operand pairs nearby;
`simulators/ddc-workbench-ahu-mockup.html` carries **zero** spans.

**`html/education/setpoint-math-reset.html` is the standard, and it
holds under audit.** Fifty spans — the densest metric page on the site —
carrying a full y = mx + b reset-schedule derivation twinned in °C, and
it closes at **every** step: the slope (60.0 − 82.2) ÷ (15.6 − (−17.8))
= −22.2 ÷ 33.4 = −0.665; the intercept 82.2 − 11.8 = 70.4; the worked
point −0.665 × (−1.1) + 70.4 = 71.1, which is also the exact conversion
of the IP answer 160 °F; and the clamp case 15.5 + 70.4 = 85.9, which
is likewise the exact conversion of 186.7 °F. Line 216 (`run: 60 °F` →
`33.4 °C`) is the policy in miniature — it uses the *displayed* operands
(15.6 − (−17.8) = 33.4) rather than the canonical 33.33, and that is
precisely why the derivation closes two steps later.

---

## Verified clean

Recorded because it is the load-bearing result for a reference site.

- **Thermistor / RTD data — reproduced to the digit** against
  `html/scripts/thermistor-data.js` in Node: Type II vs Type III at
  40 °F = 26,300 Ω / 24,500 Ω (page says 26.3 k / 24.5 k); the
  curve-mismatch error 2.65 °F at 40 °F ("about 3"); JCI shunted
  4,652 Ω and TAC Type 5 5,242 Ω ("≈4.7 k", "≈5.2 k"); Type II at 70 °F
  = 11,900 Ω ("near 11.9 kΩ"); Pt100 slope 0.2137 Ω/°F and 0.3846 Ω/°C
  ("about 0.22", "0.39"); 1.3 Ω of lead = 6.08 °F on a Pt100, 0.607 °F
  on a Pt1000, 0.0041 °F on a 10K thermistor ("about 6", "about 0.6",
  "a few thousandths"); 100 ft of 18 AWG pair = 1.277 Ω ("about 1.3").
  The quiz bank's own numerics land the same way: 20.0 kΩ on Type II →
  **50.00 °F** against an answer of 50; 150 ft of 18 AWG = 1.915 Ω →
  8.96 °F ("about 1.9 Ω", "roughly 9 °F"); Pt1000 at 77 °F = 1,097 Ω
  ("near 1.1 kΩ").
- **Function-Block Editor semantics — exact against `fbe-engine.js`.**
  The SR latch is set-dominant as the lessons claim
  (`if (S) q = true; else if (R) q = false`), and
  `bll-reset-held-while-tripped`'s scan-by-scan answer matches the
  implementation exactly. TON parks ET at PT while IN holds and zeroes
  on the drop (`et = Math.min(et + dt, pt)`); TOF freezes ET at ~PT
  after expiry and zeroes when IN returns — which is what
  `timers-and-delays.html:209-211` asserts, verbatim. Wire colours check
  out against `styles.css:4316-4321` (`--blue` numeric, `--accent`
  bool-on, `--text-dim` bool-off). Every example the lessons name by
  title exists under that exact title, and every topology they describe
  wire-by-wire matches its literal: the freeze-stat shutdown, the
  cooling and heating thermostats, the proof-of-flow alarm (TON preset
  15 s, as drawn), and the hot-water reset chain.
- **The diagrams' derived traces are genuinely derived.** The chatter
  diagram in `comparators-and-deadband.html` plots ~290 temperature
  samples and then draws the single-comparator output beneath them —
  and every one of its **eight** transitions falls exactly where the
  sample trace crosses the setpoint line (rise at x = 316 where y goes
  120.9 → 116.9; drop at 322 where y returns to exactly 120.0; and so
  on through 638), with the caption's "flips eight times" matching the
  path's transition count. The set/reset trace switches at x = 370 and
  670, the first samples to cross the upper and lower band lines. The
  TON/TOF panels in `timers-and-delays.html` are likewise consistent
  with the engine on every edge, including ET's park-and-clear
  behaviour.
- **The reset-schedule algebra** in `setpoint-math-reset.html` and its
  bank: every interpolation, slope, intercept and clamp reproduces in
  both unit systems (see *Coverage note*). The bank's endpoints are
  deliberately *different* from the lesson's, so a pass proves the
  method rather than a memorised answer — and all three worked
  interpolations (140 °F at 35 °F OA; 61 °F at 58 °F OA; slope −1.0
  across −5 to 55 °F) are correct, including the negative-run trap.
- **All 100 quiz questions read against their lessons and against the
  primary source.** Every `correct: true` is factually right; every
  `numeric` answer matches its stated arithmetic (37.5 % stroke on a
  2-10 V span, 6.0 V for 50 %, 3 A unloaded on a 10 A nameplate,
  10 minutes between 6 starts/hour, 150 psi at 16 mA, 0.9 in. w.c.
  behind a doubled span, 1 scan of feedback age); every `tf` answer is
  right; every gotcha's snippet supports its own verdict, with the two
  exceptions logged as L2 and L4. Eight of the ten banks are clean
  outright.
- **The signals-chapter field content** — the status-source ladder and
  what each rung proves, the broken-belt three-verdict bracket, the
  command-path order and its HOA semantics (Hand downstream of the BO
  and *upstream* of the safety string, Off beating both), the
  fail-to-start vs running-unexpectedly split, the live-zero and railed
  diagnostics, the NAMUR ~3.8 mA under-range threshold, the 2-10 V /
  4-20 mA × 500 Ω identity, and the fail-posture reasoning — all check
  out against field practice and against each other across pages.
- **DOAS** — the latent/sensible split, the deep-coil-plus-reheat
  process, the 55 °F leaving dew-point target, the enthalpy-vs-sensible
  recovery distinction and the 70-80 % total-energy-wheel figure, and
  the cold-air-DOAS carve-out are all sound. L5 is a sentence about the
  drawing, not a physics error.

**Net:** eleven never-audited lessons, a hundred never-verified quiz
answers, and the engines they all instruct against — and the worst
thing found is a metric band that rounds to 1.1 where its own operands
say 1.2, plus five sentences that describe their own pictures slightly
wrong. Nothing a field engineer could act on and be misled by.

---

## Deliverable — the two-arm metric guard (BUILT 2026-08-07)

> **Owner ruling 2026-08-07: build it.** *"A cheap test that may catch it
> still decreases what we can miss ourselves."* Both arms shipped on
> `docs/audit-2026-08-accuracy`. What landed differs from the sketch below
> in four places, each of them measured rather than argued:
>
> 1. **One parser, two consumers.** `tests/metric-spans.js` holds the
>    extraction, the normalisation, the two tests and the tolerance; the
>    gate and the lint both read it. A second copy of this arithmetic is
>    the drift generator this repo keeps re-finding.
> 2. **Both notations, not just spans.** The sketch scanned `data-us`
>    pairs. Half of this audit's instances of the defect were in a quiz
>    bank, which paints `48 °F (8.9 °C)` parentheticals because those
>    render after the units walker — so a spans-only guard is blind to the
>    surface `quiz-banks.spec.js` is already shape-only about. All 121
>    parenthetical figures classify cleanly, so the extra coverage cost
>    zero exemptions.
> 3. **The tolerance is 0.15, not 0.06, and it was measured.** Scoring
>    every paired number against the nearer test gives a flat plateau:
>    0.10 / 0.15 / 0.20 / 0.25 all leave the same 20 over-tolerance
>    numbers, because the legitimate residuals top out at 0.222 and the
>    next is 0.260 (an IP-native formula constant). 0.06 — the value used
>    for this audit's one-shot, human-reviewed sweep — **rejects the M1
>    and L1 fixes this very branch shipped**, because `1.2 °C` for `2 °F`
>    is the displayed-operand arithmetic the rounding policy requires and
>    sits 0.089 off the canonical 1.111. A gate at war with a house policy
>    gets muted.
> 4. **No agreement rule.** The sketch would have required every number in
>    one span to classify the same way. Legitimate spans mix —
>    `50 − 40 = 10 °F` → `10.0 − 4.4 = 5.6 °C` is two absolutes and a
>    delta — so that rule flags every worked equation twin on the site
>    (raising the exemption list from 15 to 28) and buys one contrived
>    catch in return.
>
> **Final shape.** Arm 1, `tests/metric-spans.spec.js`: blocking, in
> `npm test`, 515 spans in 40 files plus 121 parentheticals in 20,
> **15 allowlist entries** each with a written reason, an entry that stops
> matching fails its own test, sanity floors per notation (including one
> that fails if the parenthetical walk stops reaching the quiz banks), and
> a known-answer test verified by mutation — flipping the `32` or the
> `5/9` turns both it and the corpus sweep red. Arm 2,
> `npm run metric-lint` (`.github/scripts/metric-lint.mjs`): report-only,
> **deliberately not in `test.yml`**, 20 candidates today.
>
> **The honest limitation, restated because it is the whole point.** Arm 1
> would **not** have caught M1. `1.1 °C` for `2 °F` is a *valid* delta; it
> fails only against operands painted elsewhere. Arm 1 closes *the
> conversion is outright wrong*; arm 2 is the only thing that reaches *the
> conversion is valid but contradicts the page's own numbers*, and it is
> advisory. Measured by reverting the three fixed figures in place: arm 2
> reports two of them (the lesson paragraph, nearest candidate 1.2 off by
> 0.1; and the bank's `cdb-band-too-wide`, nearest 3.4 off by 0.1) and
> misses the third, whose operands are written as one metric expression
> with the unit stated once — "(in °C: 22.2 + 0.6 = 22.8 …)" — which a
> scan for `<number> °C` cannot see. Two of three from a heuristic, on the
> exact defect class.

### The original proposal, as written before the ruling

**Proposal only. Not built, and not to be built without the owner's
yes.** codebase-issues #232 says outright that nothing guards this
defect class, and this audit found it at **three** more sites after
#232 named one — two of them in a quiz bank that a shape-only spec
walks right past. That is the signature of a class worth a guard rather
than another round of hand-fixes.

**Shape** (~40 lines, `tests/metric-spans.spec.js`, pure-Node in a
Playwright worker like `psychro-engine.spec.js`):

1. Walk every `.html` / `.njk` under `html/`, extracting
   `data-us`/`data-metric` pairs in both attribute orders.
2. Normalise `&minus;`, U+2212 and `&nbsp;` **before** parsing — this
   is load-bearing, not hygiene: without it the parser mis-signs every
   negative span and manufactures ~5 false findings, which is exactly
   how this audit's first classifier run went wrong.
3. For each °F→°C pair with a numeral on both sides, assert it matches
   the **absolute** test or the **delta** test within
   `tol = max(0.5 × 10^(−decimals(C)), 0.06)`. Anything matching
   neither fails.
4. An **allowlist** keyed on `path:line` with a written reason, for the
   13 hand-inspect spans: the metric equation twins in
   `setpoint-math-reset.html` (132, 137, 216, 356), the preset strings
   mixing CFM/m³/h with °F/°C in `air-mixing.html` (199-201) and
   `coil-freeze-risk.html:172`, the IP-native formula lines in
   `airside-load.html` (99, 237) and `waterside-load.html:94`, and the
   prose-to-prose span in `dedicated-outdoor-air.html:195`. Follow the
   `contrast-sweep.spec.js` precedent: an allowlist entry that stops
   matching **fails its own test**, so it cannot decay into a silent
   permanent exemption.

**What it would and would not catch — state this plainly before
adopting it.** It catches a span that is neither a valid absolute nor a
valid delta conversion. It does **not** catch M1 itself: `1.1 °C` for
`2 °F` is a *perfectly valid delta*, and only fails against operands
painted elsewhere in the passage. Closing the real defect needs a second
arm — a proximity check that, where a passage paints a half-band and a
total, asserts the total equals twice the displayed half — and that arm
is heuristic, so it should be **report-only**, not a gate. Recommend
shipping arm 1 as a gate and arm 2 as a `npm run metric-lint`
report alongside `prose-lint`, if the owner wants it at all.
