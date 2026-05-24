# audit-triage-decisions.md

Decisions captured during the triage walkthrough of `audit-triage.md`. Source of truth for the implementation phase.

---

## 1 — Failure-state idiom (#25)

**Pick:** Option A — Canonize the amber-callout pattern across all 9 tools.

**Note:** Audit recommendation. Sets the visual base for downstream picks (#20, #26).

---

## 2 — Eyebrow taxonomy rule (#29, #32, #14)

### Cross-section rule

**Pick:** Option B — Add section name to tools/sims eyebrows ("Tools · Signal Scaling", "Simulators · PID Tuner"). Keep education's existing two-part shape.

**Note:** Diverged from audit (which preferred dropping "Education ·" everywhere). User picked the heavier-but-explicit direction — every eyebrow names both section and self, mirroring the breadcrumb pattern.

### Function-Block Editor sim-card `titleShort` (#14)

**Pick:** `FB Editor`.

**Note:** Audit recommendation. Direct abbreviation; matches the home nav's "Function-Block Editor" reference.

---

## 3 — Initial-state policy for cold tools (#20)

**Pick:** Option A — Add `value=` defaults to the 3 cold tools (signal-scaling, modbus-register-viewer, bacnet-ip-converter).

**Note:** Audit recommendation. Suggested defaults from triage doc:
- signal-scaling: 12 mA on 4–20 mA, 0–100 psi span, unit "psi" → 50.0 psi · 50.0 % of span
- modbus-register-viewer: decimal 43981 / hex 0xABCD
- bacnet-ip-converter: hex `C0A80164BAC0` → 192.168.1.100:47808

Defaults need an engineering-credibility review during implementation.

---

## 4 — Preamble policy for protocol/signals tools (#21)

### Preamble adoption

**Pick:** Option A — Write task-framed preambles for the 4 non-HVAC tools (signal-scaling, modbus-register-viewer, bacnet-ip-converter, thermistor-calculator).

**Note:** Audit recommendation. Modeled on econ-ratio shape: task-lead sentence + per-tab sentence where tabs differ.

### Prereq cross-link policy

**Pick:** Link only where the lesson exists today — modbus preamble gets inline links to `modbus-basics` and `modbus-decoding`; the other 3 stay tool-only.

**Note:** Matches the site's forward-link convention (anchor only if the target exists). When `analog-i-o-basics`, `bacnet-ip-framing`, or `thermistors` lessons ship later, retrofit the inline links in a follow-up sweep.

---

## 5 — Copy-button labeling convention (#26)

### Label convention

**Pick:** Option A — Task-specific labels everywhere.

**Note:** Audit recommendation. Matches the BAS instrument-feel where every readout names what it is. Multi-output tools may need multiple buttons or scope-naming.

### Copy-primitive coverage

**Pick:** Add copy buttons to all three currently-missing tools — modbus-register-viewer, psychrometric-chart, thermistor-calculator.

**Note:**
- modbus: copy hex / decimal / binary forms of the current register
- psych chart: copy the property table for the selected state-point
- thermistor: copy the lookup row (T, R, V at chosen pull-up) for the current temperature

### Multi-tab placement

**Pick:** Keep per-tab buttons (status quo).

**Note:** Each copy button sits next to the value it produces. Reviewed and kept.

---

## 6 — Narrow-width honesty callout (#30)

**Pick:** Option A — Canonize the pattern; add a `.narrow-width-note` class to `styles.css`; deploy where needed.

**Note:** Audit recommendation. Class chrome shared; per-tool copy is the editorial work. Risk to watch: over-use (every page apologizing for itself). Anchored against fbe's existing copy as the voice reference.

---

## 7 — Mobile bit-grid (#23)

**Pick:** Option D — Structural fix (4×4 at narrow widths) + callout (both).

**Note:** Chrome cost is small (~5–10 lines CSS + one sentence). The callout's job is **mental-model orientation, not apology** — it explains that the layout shifts to 4×4 on narrow screens so bit 8 wraps next to bit 11 instead of next to bit 0 (vs. the desktop 8×2 high-byte/low-byte alignment). Don't repeat the "this is cramped on mobile" framing — that's the trap the user flagged. The structural fix removes the tap-target problem; the callout covers the mental-model shift the fix introduces.

---

## 8 — Education filter chips (#12)

### Chip behavior

**Pick:** Option A — Drop singleton chips; keep multi-card categories (Hydronics, Protocols) + a catch-all chip for the remaining 5.

**Note:** Audit recommendation. Every chip click now yields a meaningful subset.

### Catch-all chip noun

**Pick:** `Fundamentals`.

**Note:** Frames the 5 singleton-category pages (Drives, Control, HVAC, Sequencing, Logic) as foundational material rather than leftovers. Final chip row: **All · Fundamentals · Hydronics · Protocols**.

**Cascade implication:** #14's curriculum-vs-chip tension is NOT auto-resolved (chips remain). #14 still needs a real decision.

---

## 9 — Education title pattern (#31)

**Pick:** Option B — Adopt bare pattern across all 13. Strip em-dash subtitles from the 8 older pages.

**Note:** Diverged from audit. User picked the tighter direction — page lead sentences do the work subtitles would have done. Implementation: strip the "— …" tail from `pump-control`, `hydronic-loops`, `load-piping`, `balancing`, `equipment-staging`, `pid-basics`, `psychrometrics-basics`, `vfds` titles + canonicals.

**Cascade for minor-polish #2:** VFDs subtitle drops entirely (was "VFDs — Variable Frequency Drives" → becomes "VFDs"). Resolved by this pick; no separate ask in the polish sweep.

---

## 10 — SEC:NNN numbering (#33)

**Pick:** Option A — Drop the `SEC:NNN` prefix on pid-basics and psychrometrics-basics.

**Note:** Cleanest direction. Sub-section ordering stays implicit in document order. Removes inconsistent decoration without retrofitting 11 pages.

---

## 11 — Home "My Most Common Tools" framing (#11)

### Direction

**Pick:** Option A — Rename to a visitor-oriented eyebrow.

### Label

**Pick:** `Most-reached-for tools`.

**Note:** Carries the "reaching for it on the job" physicality without first-person framing. Closest to the original spirit while welcoming a first-time visitor.

---

## 12 — Hero "More coming" badge (#15)

**Pick:** Replace with `Latest: <newest tool>` (e.g., currently `Latest: Function-Block Editor`).

**Note:** Diverged from audit options (none fit the user's stated intent). User wanted to signify active project elegantly, without repeating the version number and without sounding apologetic. `Latest:` carries both activity AND catalog growth in one beat. Manual-update trade-off accepted — needs a refresh each time something new ships. Implementation note: bake into the new-tool / new-sim checklist alongside the existing PAGES-array + chip-count steps.

---

## 13 — Hero UPTIME 24×7 statline (#16)

**Pick:** Option A — Drop the UPTIME line.

**Note:** Removes the only non-verifiable claim from the statline. Final shape: `OK · VERSION v<X> · LAST BUILT <date>`.

---

## 14 — Curriculum vs chip-browse tension (#17)

### Direction

**Pick:** Option A — Reframe the chip row with a preamble that flags it as the shortcut for non-newcomers.

### Preamble copy

**Pick:** `Know your way around? Jump to:`.

**Note:** Warmer + shorter than the audit's literal phrasing. Sits above the chip row; the curriculum order remains the default top-to-bottom reading path. Implementation: small `.chip-row-preamble` (or reuse an existing class) above the chips on `/education/index.html`.

---

## 15 — Minor-polish sweep

All four bundled sub-questions resolved explicitly during triage (the fifth — VFDs subtitle — was already resolved by #9).

### Education landing lead word

**Pick:** `Practical` (replaces "common sense").

**Note:** Names the value plainly without self-deprecation.

### Home About card label (was "Verified: 2026")

**Pick:** `REV: <date>` — engineering drawing convention.

**Note:** Diverged from all audit-suggested options. User initially picked Niagara-style "Last OK time" but pushed back on the stale-point connotation; then proposed "Last update time" with git lastmod, but that duplicated the hero's `LAST BUILT`. `REV:` landed because (a) it's the engineering-drawing/P&ID/submittal convention — strongest in-domain precedent for the BAS audience, (b) it doesn't say "audit" directly, and (c) drawing REVs don't read stale across multi-year cycles, so the maintenance commitment is gentler than "Last OK time." Date source: the most recent content-review pass (currently ~2026-05-24 from the audit). Implementation: store as a `lastRev` field in `_data/site.js` and render in the About card; **not** auto-derived from git (that would defeat the point — the value tracks editorial review cadence, not commit cadence).

### Modbus Essentials lead voice

**Pick:** Tighten to single voice.

**Note:** Rewrite the lead so the voice stays consistent (likely toward the dry/field-tech end that matches the rest of the page).

### Coil-sizing AIRFLOW section header

**Pick:** Collapse the single-input AIRFLOW section to a ps-row inside LEAVING AIR.

**Note:** Tighter visual; one fewer section header. AIRFLOW becomes a row labeled "Airflow."

### Remaining sweep items

The Minor-polish lists in each batch of `content-audit.md` (phrasing nits, undefined jargon, alignment, voice-swing items not flagged here) roll into the same editorial sweep with implementation judgment — fix inline or strike through with a one-line reason.

---

## Handoff to implementation

Implementation phase happens in a fresh session with this doc as input. Suggested PR grouping (per the triage doc's "Phase 5" notes):

1. **Chrome / class additions** — `.narrow-width-note` class + amber-callout class (if not already present); these are needed before per-tool deployment.
2. **Eyebrow + title sweep** — section-prefix eyebrows across tools/sims; bare titles across all 13 education pages; drop SEC:NNN on the two pages.
3. **Cold-tool defaults + preambles** — `value=` defaults on the 3 cold tools; preambles on the 4 non-HVAC tools (modbus links to its lessons).
4. **Failure-state callouts** — deploy the amber-callout pattern across the 9 tools' invalid-state branches.
5. **Copy-button sweep** — task-specific labels everywhere; add copy primitives to modbus, psych chart, thermistor.
6. **Bit-grid + narrow-width callouts** — 4×4 mobile layout + mental-model orientation callout for modbus; any other tools that warrant a narrow-width-note.
7. **Education landing** — drop singleton chips + add `Fundamentals` catch-all + `Know your way around? Jump to:` preamble.
8. **Home hero polish** — `Most-reached-for tools` eyebrow, `Latest: <newest tool>` badge, drop UPTIME line, `REV: <date>` About-card label (with `lastRev` field in `_data/site.js`).
9. **Function-Block Editor sim card** — `titleShort: FB Editor`.
10. **Editorial sweep** — modbus lead voice, coil-sizing AIRFLOW collapse, plus the rolling Minor-polish lists in `content-audit.md`.

Group #1 is a prerequisite for #4 and #6. The rest can land in any order; some can bundle if the diffs stay scannable.

After the implementation PR(s) merge, revisit the nav-card grid question parked since the plan kickoff.
