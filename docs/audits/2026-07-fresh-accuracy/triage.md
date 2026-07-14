# Fresh accuracy audit — post-forced-air (2026-07-14)

> **TRIAGE — 5 of 8 fixed 2026-07-14 (this PR); 3 awaiting owner
> disposition.** The audit pass itself was strictly read-only — no page,
> engine, or CSS source was touched during triage. Disposition since: the
> five clean-cut findings (**M1, M2, L1, L3, L6**) were fixed 2026-07-14
> in PR `content/fresh-audit-cleancut-fixes` and are annotated
> **Fixed 2026-07-14** below; the three judgment-call findings
> (**L2, L4, L5**) still await the owner to decide (accept / fix / reword
> / defer). Cross-filed into `content-audit.md` as findings #49–#56 — the
> five fixed now carry *(resolved 2026-07-14)*, the three open still carry
> *(open — awaiting owner disposition, 2026-07-14)*. This doc is the
> durable evidence record.

Master findings document for the **fresh post-forced-air accuracy
audit** — a full-site adversarial re-verification of the engineering
content run after the forced-air pillar shipped (PR #332). Successor in
spirit to `docs/audits/2026-06-extensive/findings.md`, but narrower in
lens: this pass was accuracy-only (are the numbers, enums, citations,
and physics right?), not a UX/persona walk.

## How this file is used

- Findings are **report-only**. The audit is an extra set of eyes;
  editorial and domain decisions stay with the site owner. Suggested
  fixes are pointers, not finished rewrites.
- **Severity**: **high** = a wrong number/enum a field engineer could
  act on and be misled; **medium** = a false citation or a figure that
  materially overstates/understates, values otherwise sound; **low** =
  cosmetic naming, completeness gaps, pedagogical simplifications, and
  consistency nits.
- **Confidence**: **high** = reproduced against a primary source or
  the site's own engine in Node; **medium** = a defensible
  editorial/standards read where the page discloses it's a curated
  subset.
- Each finding carries: id, page + location, the claim as written, the
  verdict, evidence + source, a suggested fix, severity, and confidence.

## Scope

Three specialist auditors re-verified the whole site in parallel,
adversarially — each trying to *falsify* the site's claims rather than
confirm them, then citing an authoritative source for every call:

- **HVAC / psychrometrics / refrigeration physics** — the airside/coil/
  psychrometric/refrigerant tools and their lessons, checked against
  ASHRAE Fundamentals and manufacturer datasheets, and **Node-verified
  against the site's own engines** (e.g. `pressFromAltitude`,
  `refrigerant-data.js`) so a claim about tool output is checked against
  what the tool actually computes.
- **BACnet / Modbus protocol data** — object/property/unit enumerations,
  service families, function/exception codes, byte-order encodings,
  cross-checked against **ASHRAE 135**, **BACpypes3**, and **BACnet4J**
  (independent of bacnet-stack), plus the Modbus Application Protocol
  spec.
- **Electrical / controls / hydronics** — conductor tables, voltage-drop
  constants, FLC data, PID/affinity/valve math, checked against the NEC,
  motor tables, and the governing equations.

**Guardrails respected** (each treated as a non-error, per `CLAUDE.md`
and the standing docs):

- **Already-resolved content-audit findings #1–#48 were skipped** — the
  refrigeration metric-dual-stating, the sim/tool physics diffs, the P-T
  glide tiers, etc. are settled and were not re-litigated.
- The **metric worked-example rounding policy** (round-then-display, IP-
  native formula lines with a display-boundary caveat) was honored — a
  formula line computing in IP is not a finding.
- The **exact-vendor-name** guardrail and the **"plain English"** ban
  were honored — deliberate platform-agnostic phrasing is not an error.
- Field-voice content (rules of thumb, anecdotes) was accepted by design
  and flagged only where actually wrong.

## Headline

**The site verified overwhelmingly clean. Zero high-severity findings.**
Only **2 medium + 6 low** items surfaced across the whole audit — and
both mediums are *false citations / overstated figures wrapped around
otherwise-correct data*, not wrong physics. On a young reference site
whose whole value proposition is being right, a broad three-domain
adversarial pass turning up nothing a field engineer could act on and be
misled by is the load-bearing result.

Tally: **0 high · 2 medium · 6 low.**

---

## Medium

### M1 — R-32 mislabeled as a zeotropic glide blend

- **Page / location:** `html/education/superheat-subcooling.html`, ~line
  154 — the glide footnote in "Where they sit on the saturation curve."
- **Claim as written:** "…on a *zeotropic* blend (R-407C, R-454B, R-32
  to some extent), the saturation 'curve' is actually two curves close
  together … separated by the refrigerant's *glide*."
- **Verdict:** **WRONG.** R-32 (difluoromethane) is a **pure,
  single-component** refrigerant with **zero temperature glide** — bubble
  and dew temperatures coincide at every pressure. It is a *constituent*
  of R-410A (the likely source of the confusion), but on its own it
  behaves as a pure refrigerant, not a zeotrope. The "to some extent"
  hedge does not rescue it — the glide is not "some," it is nil.
- **Evidence + source:** Arkema **Forane 32** datasheet — "Forane® 32 has
  zero glide." **ASHRAE Standard 34** classifies R-32 as a
  single-component A2L. The site is already internally consistent the
  *other* way: `html/_data/refrigerant-data.js` and the
  `refrigerant-cycle-basics` quiz both treat R-32 as pure — this sentence
  is the lone outlier.
- **Suggested fix:** drop R-32 from the zeotropic list. R-407C and
  R-454B belong there (R-454B's ~2 °F glide is real — the P-T tool's
  "small glide" tier already recognizes it, per content-audit #47), so
  the sentence survives with R-32 removed.
- **Severity:** medium. **Confidence:** high.
- **Fixed 2026-07-14.** Dropped R-32 from the zeotropic-blend footnote;
  the list now reads "(R-407C, R-454B)".

### M2 — voltage-drop.html false resistance-table citation ("NEC Ch. 9 Table 8, 25 °C")

- **Page / location:** `html/tools/voltage-drop.html` — line 158 (the
  rendered reference-table note), line 199 (the JS comment), and line 200
  (the `OHMS_PER_KFT` constant).
- **Claim as written:** "Solid copper at 25 °C, per NEC Chapter 9 Table
  8." The tabulated values: 14 → 2.525, 16 → 4.016, 18 → 6.385, 20 →
  10.15, 22 → 16.14 Ω/kft.
- **Verdict:** **IMPRECISE — values valid, citation false.** The Ω/kft
  numbers are the standard AWG copper resistances at ~20 °C and are fine
  to use. But the **attribution is wrong on two counts**: NEC 2023 Ch. 9
  Table 8 tabulates **DC resistance at 75 °C**, not 25 °C (its 14 AWG
  entry is ≈ 3.14 Ω/kft, not 2.525), so both the "Table 8" source and the
  "25 °C" temperature label are incorrect. The values are simply standard
  20 °C AWG resistances from a different reference lineage.
- **Evidence + source:** **NEC 2023, Chapter 9, Table 8** (Conductor
  Properties) — DC resistance column is at 75 °C; 14 AWG solid uncoated
  copper ≈ 3.14 Ω/1000 ft there, materially higher than the 2.525 shown.
- **Suggested fix:** relabel as "solid copper at 20 °C (standard AWG
  values)" and **drop the NEC Table 8 attribution**. Fix **both** the
  rendered note (line 158) and the JS comment (line 199) — the constant
  itself (line 200) is correct and stays.
- **Severity:** medium. **Confidence:** high.
- **Fixed 2026-07-14.** Rendered note + JS comment both relabeled "solid
  copper at 20 °C (standard AWG values)"; the false NEC Ch. 9 Table 8
  attribution is dropped and the Ω/kft constant is unchanged.

---

## Low

### L1 — airside-load.html Denver altitude figure understates

- **Page / location:** `html/tools/airside-load.html`, line 240 — the
  "where 1.08, 0.68, 4.5 come from" note.
- **Claim as written:** "…every constant on this page over-reads the load
  by roughly 3 % per thousand feet of elevation — call it 14 % in
  Denver."
- **Verdict:** **IMPRECISE.** Node-verified against the engine's own
  `pressFromAltitude` at 5,280 ft: the **density deficit ≈ 17.7 %** and
  the **load over-read ≈ 21.5 %**. Even the page's *own* 3 %/1,000 ft
  rule of thumb, applied to 5,280 ft, gives ~16 %, not 14 %. The "14 %"
  city figure undershoots by every measure — including the page's own
  heuristic.
- **Evidence + source:** the site's `psychro-engine.js` `pressFromAltitude`
  (barometric-pressure standard atmosphere), evaluated at Denver
  elevation in Node.
- **Suggested fix:** state ~20 % (load over-read) or ~18 % (density
  deficit), or drop the specific city number and keep only the per-
  1,000-ft rule (which is a fine approximation).
- **Severity:** low. **Confidence:** high.
- **Fixed 2026-07-14.** Denver figure changed from "14 %" to "about 20 %"
  (the load over-read); the 3 %/1,000 ft rule is kept as-is.

### L2 — bacnetUnits.js reactive-energy names use bacnet-stack word order

- **Page / location:** `html/_data/bacnetUnits.js`, lines 225–227 (ids
  203/204/205) and 264–266 (ids 242/243/244); surfaced on
  `/tools/bacnet-units.html`.
- **Claim as written:** e.g. id 203 → `"watt-reactive-hours"`, id 242 →
  `"volt-ampere-reactive-hours"`.
- **Verdict:** **IMPRECISE — cosmetic.** All integer enum ids are
  **correct**; only the string spelling differs. The ASHRAE 135 /
  BACpypes3 canonical order is hours-then-reactive:
  `watt-hours-reactive` (203), `volt-ampere-hours-reactive` (242), and
  their kilo/mega siblings. The file header already discloses that its
  long-tail names follow bacnet-stack and "should be verified against
  ASHRAE 135" — so this is a **known, disclosed limitation**, logged here
  only for completeness.
- **Evidence + source:** **BACpypes3** `EngineeringUnits` enumeration;
  ASHRAE 135 unit names.
- **Suggested fix:** optionally rename the six strings to ASHRAE word
  order. Low priority given the header's standing disclaimer.
- **Severity:** low. **Confidence:** high.

### L3 — modbus-functions.html omits exception code 07 (NAK)

- **Page / location:** `html/tools/modbus-functions.html`, the
  Exception-codes tab, lines 148–159.
- **Claim as written:** the exception-code table lists codes 1, 2, 3, 4,
  5, 6, 8, 10, 11 — and skips **07**.
- **Verdict:** **IMPRECISE — completeness gap.** Everything shown is
  correct; exception code **07 = Negative Acknowledge (NAK)** is simply
  missing. NAK is returned by the program commands (FC 08/13/14) when the
  server cannot perform the requested function. (Note: FC 07 = Read
  Exception Status appears in the *function*-code tab and is unrelated —
  the gap is specifically the *exception*-code 07.)
- **Evidence + source:** **Modbus Application Protocol Specification**
  v1.1b3, §7 (exception responses) — code 07 Negative Acknowledge.
- **Suggested fix:** add the `07 · 0x07 Negative Acknowledge` row to the
  exception-codes table. Leave `modbus-register-viewer.html` alone — its
  code subset is deliberately FC-only.
- **Severity:** low. **Confidence:** high.
- **Fixed 2026-07-14.** Added the `7 · 0x07 · Negative Acknowledge (NAK)`
  row in numeric order (between 06 and 08); register-viewer untouched.

### L4 — bacnet-basics.html MS/TP framing diagram collapses two CRCs into one

- **Page / location:** `html/education/bacnet-basics.html`, the MS/TP-vs-
  BACnet/IP framing SVG (~lines 570–640) and its `<desc>` alt-text
  (~line 573).
- **Claim as written:** the MS/TP frame is drawn (and described in the
  `<desc>`) as Preamble → Frame Type → Destination → Source → Length →
  payload → **a single 2-byte CRC**.
- **Verdict:** **IMPRECISE — pedagogical simplification.** A real ASHRAE
  135 MS/TP frame carries **two** CRCs: a **1-byte header CRC** (after
  the Length field, before the payload) and a **2-byte data CRC** (after
  the payload). The diagram shows only the data CRC, so a learner comes
  away thinking the header is unprotected.
- **Evidence + source:** **ASHRAE 135**, MS/TP frame format (Clause 9) —
  HeaderCRC (1 octet) + DataCRC (2 octets).
- **Suggested fix:** show both CRC fields, or add a one-line "CRC shown
  simplified — a real frame also has a 1-byte header CRC" caveat in the
  caption and `<desc>`.
- **Severity:** low. **Confidence:** medium-high.

### L5 — bacnet-services.html file-access services mis-bucketed

- **Page / location:** `html/education/bacnet-services.html`, the
  service-families table (~line 114).
- **Claim as written:** `AtomicReadFile / AtomicWriteFile` are placed in
  the **"Data Sharing"** interoperability-area column.
- **Verdict:** **IMPRECISE — editorial.** In ASHRAE 135 these are **File
  Access Services** (they underpin the Device-Management backup/restore
  BIBB family, DM-BR), not Data Sharing. The page states up front that
  its table is "the field-relevant set, not the full three dozen," so
  this is a curated-subset labeling call rather than a hard error — but
  the bucket as shown is wrong.
- **Evidence + source:** **ASHRAE 135** service categories (File Access
  Services); BIBB DM-BR (Device Management — Backup & Restore).
- **Suggested fix:** relabel that row's area "File Access" (or "Device
  Mgmt").
- **Severity:** low. **Confidence:** medium.

### L6 — CDAB byte-order term inconsistent site-wide

- **Page / location:** `html/tools/modbus-register-viewer.html` (~line
  181) and `html/education/modbus-decoding.html` (~line 292) call CDAB
  the **"Modicon byte-swap"**; the quiz
  `html/_data/quizzes/modbus-decoding.js` (~line 75) calls it
  **"word-swap."**
- **Claim as written:** two labels for one encoding — "byte-swap" on the
  tool + lesson, "word-swap" in the quiz.
- **Verdict:** **CONSISTENCY NIT (very low).** CDAB swaps the two 16-bit
  **words** (byte order is preserved *within* each word), so "word-swap"
  is the precise term; "byte-swap" is the looser traditional Modicon
  label. The `ABCD` / `CDAB` letter notation itself is unambiguous and
  correct on every surface — only the parenthetical nickname drifts.
- **Evidence + source:** the encoding's own definition (CDAB = word
  order reversed, intra-word byte order intact).
- **Suggested fix:** standardize on "word-swap" across all three
  surfaces.
- **Severity:** very low. **Confidence:** high.
- **Fixed 2026-07-14.** "Modicon byte-swap" → "Modicon word-swap" on the
  tool and the lesson (heading + diagram `<desc>`); the quiz already read
  "word-swap."

---

## Verified clean

Recorded because it is the load-bearing result for a reference site: the
audit was **broad, not shallow**, and the following surfaces passed
adversarial re-verification with no findings.

- **Shared engines** — `psychro-engine.js` (satPress, humidity-ratio,
  enthalpy, specific volume, `pressFromAltitude`, wet-bulb inversion),
  `pid-engine.js`, `refrigerant-data.js` interpolation, and the
  units-conversion tables all reproduced clean in Node against their
  governing equations. (L1 is a *prose* figure about `pressFromAltitude`,
  not an engine-math error — the engine itself is correct.)
- **Tool constants** — the airside/coil sensible-latent-total constants
  (1.08 / 0.68 / 4.5 and their metric twins), psychrometric coefficients,
  affinity-law exponents, and valve-authority math all check out. The
  voltage-drop **values** are correct (M2 is a citation error, not a
  value error).
- **BACnet data** — object-type, property-identifier, and
  engineering-unit **integer enums** verified against BACpypes3 /
  BACnet4J; every id checked was correct (L2 is a cosmetic *string*
  spelling on otherwise-correct ids). Priority-array, Who-Is/I-Am, and
  object/property model content on the BACnet pages verified clean.
- **Modbus data** — function codes, data-model / address-space content,
  and the ABCD/CDAB/BADC/DCBA byte-order letter notation are all correct
  (L3 is one missing exception row; L6 is a naming nit — neither is a
  wrong value).
- **Electrical / controls** — motor FLC tables, conductor Ω/kft values,
  and the electrical-quick-calc math verified against the NEC and motor
  tables.
- **PID / affinity / valve math** — the tuner engine, affinity-law
  relationships, and valve-characteristic/authority calculations all
  reproduce correctly.

**Net:** three domains, the full page/tool/engine/data-file set, an
adversarial falsification posture — and the worst thing found was two
mislabeled citations and a handful of naming/completeness nits. Nothing
a field engineer could act on and be misled by.
