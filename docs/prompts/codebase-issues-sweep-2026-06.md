# Handoff: codebase-issues sweep (2026-06)

Pick up the open items in `codebase-issues.md`. As of 2026-06-09 there
are **4 genuinely open** items (#73, #75, #76, #77) plus a small
**marker-drift cleanup** in the issues file itself. Work them in the
order below.

## Working conventions (do not skip)

- **One issue per branch + PR.** Branch name `issue-NN/<slug>` (the
  number is load-bearing). Never bundle two issues in one PR.
- **Plan-mode first** for anything beyond a trivial copy/marker edit:
  enter plan mode, confirm the approach, then implement.
- **Top-to-bottom** by the order in this file (urgency-sorted, not
  issue-number-sorted).
- Branch → edit → commit → push → open PR. **Do not merge** — the owner
  merges on GitHub after review.
- After each ship, run the *Sweep on convention shifts* check from
  CLAUDE.md if the change touched a shared rule/token/pattern.
- `npm test` must stay green; `npm run build` must pass the
  `descriptionLengthGuard`.

---

## 0. Marker-drift cleanup in `codebase-issues.md` (trivial, do first)

Two items carry a decision/resolution in their body but never got the
heading marker, so a `grep '^### [0-9]'` over-counts open work:

- **#70** (`Schematic-bg motif library inlines ~360 SVGs…`) — body says
  *"Decision (2026-05-23): defer / accept."* Add `*(deferred
  2026-05-23)*` to the heading and move the whole entry under the
  `### Deferred / Won't fix (with revisit trigger)` subsection (it has a
  proper revisit trigger already).
- **#72** (`Landing-page lead paragraphs…`) — body has a full
  *"Resolution (2026-05-24)"* (the `.landing-intro` class shipped). Add
  `*(addressed 2026-05-24)*` to the heading.

Docs-only; one `docs:` PR. This is bookkeeping, not a behavior change.

---

## 1. #77 — Actions on deprecated Node 20 → bump to `@v5` (TIME-BOXED)

**Deadline: 2026-06-16** (GitHub forces these actions to Node 24; full
removal 2026-09-16). Do this first of the real fixes.

Bump both workflow files:
- `.github/workflows/test.yml` — `actions/checkout@v4` → `@v5`,
  `actions/setup-node@v4` → `@v5`.
- `.github/workflows/indexnow.yml` — same two bumps.

The inputs in use (`fetch-depth: 0`, `node-version: lts/*`) are
unchanged across v4→v5. Verify: open a throwaway PR and confirm the
`test` workflow goes green on v5; confirm `indexnow.yml` still resolves
its diff range (it only runs on push to `main`, so eyeball the YAML, or
`workflow_dispatch` it once post-merge). `ci:` PR, closes
codebase-issues#77.

## 2. #76 — Privacy "no cookies" heading wording (editorial)

`html/privacy.html` — the storage-section `.subhead` reads "no cookies"
but the section now also covers localStorage. Reword to name both ideas
(entry suggests e.g. *"No tracking; what the site stores on your
device"*). Pure copy edit — check it reads cleanly against sibling
`.subhead`s and doesn't overflow on narrow viewports. **Owner decision:
exact wording.** `docs:`/copy PR, closes codebase-issues#76.

## 3. #75 — coil-sizing metric mass-flow formula display

`html/tools/coil-sizing.html`, `calcCapacity()` — the worked `ṁ`
formula string is dimensionally incoherent in **metric** mode (keeps the
`× 60` min/h factor against an already-per-hour `m³/h` airflow, and the
result stays hard-coded `lb dry air/h`). Headline readouts are all
correct and unit-aware — **display string only**.

**Owner decision** between the two fixes the entry lays out:
- (a) render the metric form properly (`m³/h ÷ (m³/kg)` → `kg dry
  air/h`, drop the `× 60`) — consistent with the rest of the page, but
  needs an airflow→per-hour helper + a metric mass-flow display unit
  that don't exist yet; or
- (b) keep the formula in canonical IP regardless of toggle and label it
  as such — cheaper.

`coil-sizing:` PR, closes codebase-issues#75. Add/extend a behavioral
assertion if you touch the formula output.

## 4. #73 — Failure-pill DRY across 4 tools (TRIGGER-GATED — decide first)

`economizer-ratio.html` (`.er-feas`), `air-mixing.html` (`.am-status`),
`coil-sizing.html` (`.cs-status`), `refrigerant-pt.html` (`.rf-status`)
each define near-identical warn/error/ok pill chrome in their
`{% block head %}`. The entry's **revisit trigger is "a 5th tool needs
failure chrome OR a palette refresh ships"** — neither has happened.

**Owner decision before touching:** either
- mark it `*(deferred …)*` and move it under the Deferred subsection
  (consistent with the trigger not having fired), **or**
- proactively DRY it now: grow `.failure-callout` into a multi-state
  pill (`.ok` / `.warn` / `.error`), sweep the four tools to drop their
  page-local blocks + rename markup and `setStatus()` calls (~30 LOC out
  per page, ~25 LOC into `styles.css`). If you do this, it's a single
  `styles:`/sweep PR and you must visually diff all four tools' pill
  states (use `npm run screenshots`).

Recommendation: defer unless the owner wants the DRY now — the payoff is
modest and the trigger hasn't fired.

---

## Quick reference

- Open-item enumeration that *excludes* false positives:
  `grep -nE '^### [0-9]+\.' codebase-issues.md | grep -viE '\(addressed|\(deferred'`
  then hand-check each body for a `Decision`/`Resolution` paragraph
  (that's the marker-drift trap #70/#72 fell into).
- Sweep workflow + git conventions: CLAUDE.md `## Workflow` and
  `## Git conventions`.
