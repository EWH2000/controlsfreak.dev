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
  Candidate pages: to be proposed (2–3) for the owner's pick —
  **open question**.

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
- **Any new collapsed pattern joins the contrast sweep's force-open
  list** — the `COLLAPSED_CHROME` const in
  `tests/contrast-sweep.spec.js` — or its ink is never measured. A
  `<details>`-based collapse needs its selector added there **and**
  `settle()` checked: forcing `<details>` open is an `open`
  ATTRIBUTE, not a style, the same shape as the spec's note about
  the nav dropdowns being closed with the `hidden` attribute.
- **Re-derive the sheet-note mention counts before pilot design.**
  Last measured at `340cf06`: 11 `class=` uses on
  `ddc-workbench.html` + 6 on `ddc-workbench-fcu.html` = 17
  site-wide (raw string occurrences 11 / 7 / 2, the last two in
  `styles.css`). Always state which page a count is for. The
  recorded counting rule: strip tags and collapse whitespace first,
  match stems with `[- ]` for compounds, and state whether hrefs
  were excluded.
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

## Open questions

- **Mid-density pilot page for the tooltip component** — candidates
  to be proposed for the owner's pick.
- **§7.2 quiz-bank component question** — deferred until the tooltip
  component exists; decide before any bank counts as in scope.
