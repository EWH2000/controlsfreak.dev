# implementation.md

A handoff prompt for executing the 15 decisions captured during audit triage.

This document is a **process script**, not a spec — paste / point a Claude Code session at it (or read top-to-bottom yourself). The actual decisions live in `triage-decisions.md`; the per-finding rationale and rejected alternatives live in `triage.md`; the source observations from the audit live in `../../content-audit.md`. Nothing in this file is acted on by reading it.

## Inputs

Read these in order before starting:

1. **`triage-decisions.md`** — source of truth for what to do. Each H2 is a finding; under it is the pick + a note explaining intent and (where applicable) implementation hints. Sub-picks live under H3s within the parent finding.
2. **`triage.md`** — the triage script that produced the decisions doc. Reach for it only when a decision-doc note feels ambiguous and you need the original options + pros/cons.
3. **`../../content-audit.md`** — the raw audit findings (PRs #110–113). Reach for it when you need page-level observations the decision doc doesn't include (e.g., which specific tools fall in the "9 tools" cohort for the failure-state sweep).
4. **`../../CLAUDE.md`** — project conventions. The git workflow, frontmatter shape, kebab-case ids, indentation, `'use strict'`, validate-and-mute, etc., all apply to every commit in this implementation phase.
5. **`../../codebase-issues.md`** — open code-quality holds. Cross-reference before touching shared CSS or shared scripts (especially the failure-state pattern work — there may already be an open issue for related chrome).

## Instructions for the assistant reading this

1. **Use plan mode at the start of each PR.** Per `feedback_codebase_issues_sweep` in user memory, sweep-style work runs plan-mode-first per item. A PR groups one or more decisions, so the plan is "what's the diff shape for this batch, what files get touched, what's the verification."
2. **One branch per PR group.** Use the suggested groupings below; if a group is genuinely large (e.g., the failure-state callout sweep touching 9 tools), split into commits within the same branch, not separate branches.
3. **Commit cadence.** One commit per logical chunk inside a PR — see ../../CLAUDE.md `## Git conventions` for subject/body shape and the per-file body rule. Don't squash mid-development.
4. **User merges.** Never `gh pr merge`. Open the PR and stop; the user reviews on GitHub.
5. **Log incidental findings.** Anything code-quality you notice in passing goes to `../../codebase-issues.md` under *Open*, not inline fix. Mention the append to the user.
6. **Verification per PR.** Run `npm test` and an `npm run build` before pushing. For UI-touching PRs (failure-state sweep, narrow-width callouts, bit-grid restructure, education landing changes, home hero polish), also use the `verify` skill or a manual Playwright screenshot pass to confirm the visual lands as intended.
7. **Pause for engineering-credibility review.** Before shipping PR #3 (cold-tool defaults), surface the proposed `value=` defaults to the user as a confirmation step — the triage doc explicitly flagged that wrong defaults teach the wrong intuition on first paint.

## Suggested PR grouping

Order matters — groups 1 and 2 set up chrome that later groups consume.

### PR #1 — Class scaffolding

**Decisions:** prerequisites only (no specific finding).

- Add `.narrow-width-note` class to `styles.css` (per #6). Default `display: none`; show at the same `max-width` cutoff the schematic-bg uses (1240px) or a tighter mobile-only cutoff if the bit-grid restructure dictates one — verify against #7's breakpoint pick during implementation.
- Add the failure-state amber-callout class to `styles.css` if not already present (per #1). Reuse existing notice/alert chrome if it's close; otherwise add a new `.failure-callout` or similar. Cross-check `styles.css` for what's already there before adding.

**Verification.** Class additions only; visual change should be zero. `npm test` + a smoke build.

### PR #2 — Eyebrows + titles

**Decisions:** #2 cross-section rule, #2 FB Editor `titleShort`, #9 bare titles across 13 education pages, #10 drop SEC:NNN.

- **Tools / sims eyebrows:** add section prefix ("Tools · <name>" / "Simulators · <name>") everywhere a `.section-label` carries just the category today. Grep `styles.css` and the page set for the current shape before sweeping.
- **Education eyebrows:** unchanged (already two-part).
- **FB Editor sim card:** `titleShort: FB Editor` on `simulators/index.html`'s `navCard()` invocation.
- **Bare education titles:** strip the "— …" tail from the 8 older pages' frontmatter `title` AND `canonical` shape (`canonical` keeps the URL; only the `title` text changes). Pages: `pump-control`, `hydronic-loops`, `load-piping`, `balancing`, `equipment-staging`, `pid-basics`, `psychrometrics-basics`, `vfds`.
- **Drop SEC:NNN:** remove `data-objref` attributes on h2s in `pid-basics.html` and `psychrometrics-basics.html`. Confirm no CSS or JS still keys off `data-objref` before deleting.
- **Description guard.** Title changes don't touch `description`, but if you edit any description for tone consistency in the same pass, the `descriptionLengthGuard` in `.eleventy.js` enforces 140–160 chars — verify each change.

**Verification.** Eyeball the eyebrow change across one tool and one sim page; eyeball the education landing card titles after the bare-title sweep. `npm test`.

### PR #3 — Cold-tool defaults + non-HVAC preambles

**Decisions:** #3 `value=` defaults on 3 cold tools, #4 preambles on 4 non-HVAC tools (modbus links to its lessons).

- **Defaults (pause for review first).** Before editing, surface the audit-suggested defaults to the user for engineering-credibility confirmation:
  - signal-scaling: 12 mA on 4–20 mA, 0–100 psi span, unit "psi" → 50.0 psi · 50.0 % of span
  - modbus-register-viewer: decimal 43981 / hex 0xABCD
  - bacnet-ip-converter: hex `C0A80164BAC0` → 192.168.1.100:47808
- **Preambles.** Use econ-ratio's preamble as the voice reference. Each preamble is a task-framed lead sentence + a sentence per tab if tabs differ. Add to: `signal-scaling`, `modbus-register-viewer`, `bacnet-ip-converter`, `thermistor-calculator`. Wrap in `<p class="tool-preamble">` (the existing class per ../../CLAUDE.md `## Design system`).
- **Prereq links.** Only modbus's preamble gets inline anchor links — to `/education/modbus-basics.html` and `/education/modbus-decoding.html`. The other 3 stay tool-only.

**Verification.** Visit each of the 3 cold tools and verify the computed result on first paint matches the expected value. Visit each of the 4 tools and verify the preamble reads well. `npm test`.

### PR #4 — Failure-state amber-callout sweep

**Decisions:** #1 (canonize amber-callout pattern across all 9 tools).

The 9 tools are the audit cohort — cross-reference `../../content-audit.md` if the list isn't obvious from `tools/` directory contents. For each tool:

- Identify every invalid-input branch where the current output is `—` (validate-and-mute, per ../../CLAUDE.md `## JS patterns`).
- Add an amber callout (the class from PR #1) below the result row, with prose naming **the failure mode AND the action**. Econ-ratio's existing callout is the voice reference.
- Some failure modes are harder to write than others — signal-scaling's equal-bounds / divide-by-zero in particular doesn't have a clean physical explanation. Write the best plain-English description you can ("Span is zero — pick a different high or low value to compute a slope"); flag to the user if any tool's failure mode genuinely defies a teaching callout, and decide together whether to fall back to the leaner pill (Option B from triage) for just that case.
- Result-row stays muted (`class="result-value muted"`, text `—`) per existing convention; the callout sits below, not in place of.

**Verification.** For each tool: trigger every invalid-state branch in the browser and confirm the callout renders and reads correctly. `npm test`.

### PR #5 — Copy-button sweep

**Decisions:** #5 task-specific labels everywhere, #5 add copy primitives to modbus / psych chart / thermistor.

- **Relabel existing generic "Copy value" buttons** to task-specific labels (e.g., "Copy %OA", "Copy mixed-air T", etc.). Per-tool editorial work; voice should match existing task-specific examples (`COPY IP`, `COPY MIXED STATE`).
- **Add copy buttons** to:
  - `modbus-register-viewer`: copy hex / decimal / binary forms of the current register value (3 buttons, scoped per output).
  - `psychrometric-chart`: copy the property table for the selected state-point (one button; copies all 7 properties as a small text block).
  - `thermistor-calculator`: copy the lookup row (T, R, V at chosen pull-up) for the current temperature.
- **Per-tab placement stays.** Copy buttons sit next to the values they produce, not consolidated globally.

**Verification.** Click each copy button on a representative scenario and paste somewhere to confirm the right text lands on the clipboard. `npm test`.

### PR #6 — Bit-grid restructure + narrow-width callouts

**Decisions:** #7 4×4 grid + mental-model orientation callout on modbus, #6 narrow-width-note class deployment on other tools that warrant it.

- **Bit-grid 4×4.** Media-query the modbus bit-grid: `grid-template-columns` from 8 cols to 4 cols below ~700px. Verify cell size lands ≥44px square at 375px viewport. Adjust bit-label positioning if needed.
- **Bit-grid callout.** Add a `.narrow-width-note` above the bit-grid (`display: none` desktop; visible at the same narrow-width breakpoint). Copy must frame the layout shift as **mental-model orientation, not apology** — e.g., "Layout shifts to 4×4 on narrow screens — bit 8 wraps next to bit 11 instead of next to bit 0." See `triage-decisions.md` #7 note for the framing trap to avoid.
- **Other narrow-width deployments.** Per #6, deploy `.narrow-width-note` to other tools with real mobile UX trade-offs — psych chart canvas and PID tuner are the candidates flagged in triage. Skip if the trade-off doesn't have a clean one-sentence explanation; don't force a callout just to use the class.

**Verification.** Resize a browser to 375px and walk modbus + each narrow-width-callout target. Confirm the bit-grid is thumbable and the callouts read correctly. `npm test`.

### PR #7 — Education landing

**Decisions:** #8 drop singleton chips + add `Fundamentals` catch-all, #14 `Know your way around? Jump to:` preamble above chip row.

- **Chip row.** Final shape: `All · Fundamentals · Hydronics · Protocols`. Wire `Fundamentals` to filter to the 5 singleton-category pages (Drives, Control, HVAC, Sequencing, Logic). Update the chip counts to match current page counts.
- **Preamble.** Add `Know your way around? Jump to:` above the chip row. Use a small `.chip-row-preamble` class (add to `styles.css`) or reuse an existing utility class if one fits — grep `styles.css` for what's there.

**Verification.** Visit `/education/`, walk every chip, confirm each yields a meaningful subset. Confirm the preamble reads cleanly above the chips. `npm test`.

### PR #8 — Home hero polish

**Decisions:** #11 `Most-reached-for tools` eyebrow, #12 `Latest: <newest tool>` badge, #13 drop UPTIME line, #15 `REV: <date>` About-card label.

- **Stage 1 eyebrow:** rename "MY MOST COMMON TOOLS" → "MOST-REACHED-FOR TOOLS".
- **Hero badge:** replace `<span class="badge">More coming</span>` with `<span class="badge">Latest: <name></span>`. Pick the newest catalog item at implementation time (currently likely `Function-Block Editor` based on recent commits — verify against `git log`).
- **UPTIME drop:** remove the `UPTIME 24×7` element from the hero console-statusline. Final shape: `OK · VERSION v<X> · LAST BUILT <date>`.
- **About card `REV:`:**
  - Add a `lastRev` field to `html/_data/site.js` (sibling of `version`). Value: the most recent content-review date (currently ~2026-05-24 from the audit). **Manual update — not git-derived.**
  - Replace the existing "Verified: 2026" line with `REV: <lastRev>` rendered via `{{ site.lastRev }}`.

**Verification.** Visit home, walk the hero + About card, confirm all 4 changes land. `npm test`.

### PR #9 — Editorial sweep + minor polish

**Decisions:** #15 sub-picks (lead word, modbus voice, coil-sizing AIRFLOW) + the rolling Minor-polish lists in `../../content-audit.md`.

- **Education landing lead:** replace "common sense" → "practical".
- **Modbus Essentials lead:** tighten to single voice (read the existing lead, identify the swing, rewrite for consistency toward the dry/field-tech end).
- **Coil-sizing AIRFLOW:** collapse the single-input section to a `.ps-row` inside LEAVING AIR labeled "Airflow."
- **Minor-polish lists.** Walk each batch's *Minor polish* section in `../../content-audit.md`. Each item: fix inline OR strike through with a one-line reason for skipping. One commit per batch (or per page if each stays clean).

**Verification.** Eyeball the touched pages. `npm test`.

## Cross-cutting reminders

These apply to every PR in this implementation phase:

- **Update `tests/smoke.spec.js` `PAGES` array** only if a new page lands (no new pages in this triage — but if one is added incidentally, the drift test fails until `PAGES` updates).
- **`descriptionLengthGuard`** in `.eleventy.js` enforces 140–160 char descriptions and fails the build out-of-range. Any frontmatter `description` edit must verify length.
- **`.html` extension convention.** New anchors use explicit `.html`. See ../../CLAUDE.md `## Conventions`.
- **Kebab-case ids.** Every new `id="…"` is lowercase + digits + hyphens, no underscores or camelCase. See ../../CLAUDE.md `## Conventions`.
- **`'use strict';`** first inside every page-inline IIFE and every shared classic script.
- **Validate-and-mute** for any new numeric input (use `!isFinite(x)`, not `isNaN(x)`).
- **Bump `package.json.version`** when shipping something notable — the footer reads it via `html/_data/site.js`. Most of these PRs are minor bumps (`1.X.0`); a pure copy-only sweep is a patch bump.
- **Update the "Adding a new tool" checklist in ../../CLAUDE.md** when PR #8 lands to include "set `Latest: <name>` in the hero badge" alongside the existing PAGES-array + chip-count steps.
- **Sweep on convention shifts.** When a PR introduces a new convention (e.g., section-prefix eyebrows in PR #2, amber-callout pattern in PR #4), grep site-wide for old patterns and update in the same PR. See ../../CLAUDE.md `## Workflow` for the sweep rule.

## Risk callouts

- **PR #3 cold-tool defaults.** Wrong defaults teach the wrong intuition on first paint. Surface the proposed values for confirmation before editing.
- **PR #4 failure-state callouts.** Some tools' failure modes don't have clean physical explanations (signal-scaling equal-bounds is the canonical example). Flag any genuinely defiant case for a fall-back-to-leaner-pill discussion rather than ship a forced explanation.
- **PR #6 bit-grid callout copy.** The mental-model-orientation framing is load-bearing — re-read `triage-decisions.md` #7 note before writing the copy. The trap is the "this is cramped on mobile" voice.
- **PR #8 `REV:` field.** `lastRev` is editorial cadence, NOT git-derived. Don't wire it to `gitLastmod` — that defeats the point and recreates the duplication-with-hero issue the user explicitly rejected during triage.

## Out of scope for this implementation

- No merges. User merges on GitHub.
- No restructuring of triage docs (`triage.md`, `triage-decisions.md`, `../../content-audit.md`) — user said they'll clean up later.
- No nav-card grid revisit — parked from earlier; comes back as a separate task after these PRs land.

## Definition of done

- All 9 PRs opened (or fewer if some genuinely bundle without losing review clarity).
- Each PR's verification has been run + reported in the PR description's *Test plan* section.
- `../../codebase-issues.md` updated for any incidental findings that surfaced during implementation.
- `../../content-audit.md` *Minor polish* lists struck through for items resolved inline.
- A short closing note to the user listing PR URLs in the order they should be reviewed, with a flag on any PR that hit a decision that needed re-confirmation mid-implementation.
