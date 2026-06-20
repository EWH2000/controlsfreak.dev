# UX-audit fix progress — handoff

Tracks the implementation of `findings.md` (the 2026-06 ten-persona UX
audit). **`findings.md` is the master finding list; this file is the
live disposition tracker.** Update it as findings land.

## Branch / base — READ FIRST

- **Working branch:** `fix/ux-audit-2026-06`
- **Base:** `origin/main` (`6f4834e`, Merge #279 electrical-quick-calc).
  **Local `main` is STALE** (`30f9a6c`, #277) — it predates the
  electrical tool and the hydronic review fixes. Do **not** branch off
  local `main`; use `origin/main`.
- The unmerged hydronic phase-2 work lives on `feat/hlb-phase2-3d-view`
  (3 commits on top of `origin/main`). The audit fixes are a **parallel**
  branch off `origin/main` and touch disjoint files — no conflict.
- The audit was "built at v3.21.0" (= the phase-2 tip), but every fix so
  far applies cleanly on `origin/main` (3.20.0).

## Status: ~26 of 86 resolved (incl. T-009/T-010 full) · 17 commits · tree clean

All commits built clean and passed the full Playwright suite (361 pass /
1 skip). Honesty paths, hero on-ramp, palette zero-state, nav affordance,
and the abbr gloss also verified by direct browser drive. The newcomer
cluster (G-006/G-007/G-008) was put through an adversarial review workflow
(4 dimensions → refute-by-default verify): it confirmed one real issue —
EBO miscategorized as a "field controller" in the bacnet-basics opener —
which is fixed (8382120); two other raised findings were correctly rejected.

### Resolved (commit → findings)
- `docs: add … findings` — the audit record.
- `content: resolve mechanical … (counts, labels, typos)` — **G-001,
  T-007, T-017, E-002, E-008, E-013, E-014, P-003**.
- `tools: output-honesty guards + relatedLinks cross-links` — **T-001,
  T-014, T-015, T-013**.
- `content: link lessons to the broader field drill` — **P-004**.
- `quiz: deep-link beginner-drill misses + confirm reset-best` — **P-005,
  P-007**.
- `a11y: announce contact send status via a live region` — **G-015**.
- `content: newcomer on-ramp accommodations` — **G-003** (keep-H1 +
  inclusive line), **T-012**, **E-003**.
- `bacnet: fix swapped Vendor_Identifier/Vendor_Name codes` — **T-003**
  (the bug).
- `tools: clear verified reference-data markers; narrow BACnet caveat` —
  **T-002, T-003** (complete).
- `nav: palette browse zero-state + "Start here" affordance` — **G-006**
  (nav "Start here →" affordance, no reorder), **G-007** (palette browse
  zero-state + no-match Education fallback). Version bumped 3.20.0 → 3.20.1.
- `content: gloss BACnet field acronyms via <abbr> first-use` +
  `bacnet: EBO is a supervisor, not a field controller` — **G-008** (first
  increment: new `abbr[title]` convention + JACE/EBO/MS/TP first-use on
  bacnet-basics; review-fix to the EBO category error).
- `tools: 3-tier result scale + collapsible preamble` (`a4e34cf`) +
  `tools: roll output-UX pattern across the remaining 18 tools` (`1d5e4e0`) —
  **T-009, T-010** complete (3-tier `.ps-value` scale + `.ps-row.primary`,
  verdict-pill-on-top, `details.tool-preamble` collapsible, signal-scaling
  formula precision). See the Expert-output-UX section for the per-tool
  detail + the editorial primary calls flagged for owner review.

## Owner decisions already made (do NOT re-ask)
- Branch off `origin/main`; run the whole quick-wins batch; tackle all
  four clusters (sequence flexible).
- **G-003 headline:** keep the H1 slogan, add one inclusive on-ramp line. ✅ done
- **G-006 nav:** add a "Start here" affordance — **do NOT reorder** the nav. ✅ done
  (accent "Start here →" link after Home → /education/; a700d84).
- **G-008 glossary:** **incremental `<abbr title>` tooltips** — NOT a glossary page.
  ✅ first increment done (abbr[title] convention + JACE/EBO/MS/TP on bacnet-basics).
- **Cheap accommodations approved:** Tools intro (done), palette zero-state
  (✅ done G-007), gloss BACnet vendors (done). **E-001 psychro-intro
  rewrite was NOT selected** — leave it (defer).
- **T-002/T-003 markers:** clear + narrow the BACnet caveat. ✅ done
- Verify-data research (NEC FLC + BACnet enums) ran and is the basis for
  T-002/T-003; full result in the workflow output, summary in `findings.md`
  context. NEC all-correct; BACnet had the one vendor-id/name swap.

## Queued — the four chosen clusters

### Newcomer on-ramp — ✅ DONE (G-006, G-007, G-008 first increment)
- **G-007 palette zero-state** — ✅ `html/scripts/search.js`. Empty open
  renders a curated browse list (newcomer on-ramp → home quick-tools picks →
  a sim, resolved against the live index); no-match offers a "Browse all
  lessons → /education/" row. Implemented as a `mode` state machine
  (browse|results|nomatch|fail|loading). Chose CURATED (not a recents list)
  → no new `cf_*` key → no privacy.html change.
- **G-006 nav "Start here" affordance** — ✅ accent "Start here →" link after
  Home → `/education/` (color+weight, no box, so it inherits the desktop-row
  AND mobile-sheet layout cleanly). Section order unchanged.
- **G-008 incremental `<abbr title>`** — ✅ FIRST INCREMENT: new `abbr[title]`
  CSS convention (dotted underline + cursor:help) + JACE/EBO/MS/TP first-use
  on bacnet-basics. **Scope finding:** the other two named pages need no prose
  gloss — the home hero's acronyms are the deliberate AHU loop (G-009,
  intentional), and the home Browse + Education landing cards carry acronyms
  in `navCard` desc/pills, which the macro **autoescapes**. NEXT INCREMENT
  (open, owner call): (a) decide whether to extend the navCard macro to allow
  `<abbr>` in descriptions (escaping/design call) so card-level acronyms can
  be glossed; (b) roll the `<abbr>` convention to other newcomer lessons with
  bare prose acronyms (controller-wiring UI/BI/AO/BO, pid-basics PB, vfds FLA,
  hydronics ΔT/Cv). Prefer a parenthetical for newcomer-critical first-use
  (mobile has no hover); `<abbr>` carries the incidental load.

### Expert output UX & copy (T-009/T-010 ✅ DONE — rest of cluster queued below)
**Owner design decisions (2026-06-20, do NOT re-ask):**
- **T-009 result hierarchy → option C (primary + lift).** `.ps-value.live`
  lifted 0.92→1.1rem globally; `.ps-row.primary .ps-value.live` → 1.4rem for
  the single headline (marker on the static row — JS rewrites the value's
  className). About-status pinned to 0.92rem (opts out).
- **T-009 verdict pill → promote under the Output header** (triage-first).
- **T-010 preamble → hybrid collapsible:** one orienting sentence as the
  always-visible `<summary>`, the rest behind `▸ more` (native `<details>`,
  `details.tool-preamble`, focus + 44px touch wired).
- **Formula-receipt precision (T-009 sub-c):** align to the readout — just a
  correctness fix per tool, no decision needed.

✅ **DONE — T-009 + T-010 fully resolved.** Foundation/reference (`a4e34cf`,
coil-sizing) + the 18-tool sweep (`1d5e4e0`). Driven by a workflow (one agent
per tool + adversarial per-tool verify); full suite 361/1, build clean, all 18
diffs reviewed, coil-sizing + economizer visually confirmed. Browser-verified
sizing: primary 22.4px > lifted 17.6px > label 13.1px.
  - **Collapsible preamble:** all 19 tools (`details.tool-preamble`).
  - **`primary` headline:** 13 single-answer tools; SKIPPED on 6 uniform
    multi-readout panels (psych-chart, bacnet-ip-converter, bacnet-objects,
    modbus-register-viewer, thermistor, dew-point — its headline is the custom
    `.dew-hero`, not a `.ps-row`).
  - **Verdict pill → top:** economizer-ratio, air-mixing, refrigerant-pt,
    dew-point, transformer-sizing, voltage-drop, electrical-quick-calc.
  - **Formula precision:** signal-scaling receipt toFixed(4)→(2)/(3).
  - **Editorial calls flagged to owner:** affinity-laws reverted to NO primary
    (the N₂/N₁ ratio is an input echo; Q2/H2/P2 co-equal). voltage-drop primary
    = round-trip resistance (always-visible, copied) — defensible, revisitable.
    economizer's 2nd per-section changeover pill left beside its rows (not
    hoisted). air-mixing primary = mixed dry-bulb (a 7-readout panel; judged
    the dominant). All easy to adjust if the owner disagrees.
- **T-008** echo direction/reference into the output (signal-scaling reverse
  tab; refrigerant "Look up by" + hide the disabled-but-populated field).
- **T-006** modbus high-bit nudge; **T-016** dew-point entering/return
  labels + `max=100`; **T-005** copy-button gaps (signal-scaling "m, b";
  bacnet-ip decoded type/instance; modbus offset+FC; CRC bytes); **T-025**
  precision-on-copy; **T-027** hidden-qualifier outputs.

### Practice & contact (partly done)
- **G-002** Practice discoverability — add a Practice card to the home
  Browse row + a Practice bullet to `404.html`; reword the Simulators card
  away from "Practice on the model"; surface "new? start here → Surviving
  First Months".
- **P-001** field-drill onward step (sibling-quizzes group / cycle).
- **G-016** mailto fallback (`contact@controlsfreak.dev` already exists in
  `src/worker.js`, never shown to the visitor); **G-017** privacy link +
  near-form reassurance; **G-018** success message persists after reset;
  **G-019** reconcile contact vs privacy reply-time (24-48h); **G-020**
  contact error strings + `EMAIL_RE`-vs-browser mismatch.
- **P-008** metric numeric grading echo; **P-010** drill card format pill;
  **P-011** field-drill topic chip (INTENTIONAL — owner call).

### Remaining beyond the four clusters (open, not yet triaged with owner)
Methodology one-liners (T-018/19/20/21/22/23/29, S-003/04/05/07,
E-005/07/09/10), education pedagogy (E-004/06/11/12/15/16), sim features
(S-001/02/06/08/09), E-001 psychro intro, misc (T-004/11/24/26/28,
G-005/09/11/12/13, P-002/06/09). Protect-notes (no action): E-017, G-010,
G-014.

## Housekeeping (fold in near the end)
- **Version bump → `3.20.1`** ✅ DONE (a700d84) — `search.js` + `styles.css`
  changed, so the cache-bust param had to move. Used 3.20.1 (not 3.21.0,
  which the phase-2 branch claimed). Further versioned-asset changes this
  PR are already covered by 3.20.1 (one bump per PR).
- Cross-file confirmed dispositions into `codebase-issues.md` /
  `site-ideas-and-friction.md` per the CLAUDE.md convention.
- Open the PR (commit-subject-style title + Summary/Changes/Test-plan
  body). **Do not merge** — owner merges on GitHub.

## How to resume (this box)
- **Tests:** common ports (3000, 8000–8099, 9090) are taken by other
  services. Run Playwright via a throwaway config on an obscure high port
  serving `_site/`:
  ```
  npm run build
  # write pw-throwaway.config.cjs in repo root (NOT /tmp — needs node_modules):
  #   testDir './tests', use.baseURL http://localhost:18473,
  #   webServer python3 -m http.server 18473 --directory _site,
  #   url …/sitemap.xml, reuseExistingServer:false
  npx playwright test --config=pw-throwaway.config.cjs ; rm pw-throwaway.config.cjs
  ```
  Full suite ~1.9 min, **361 pass / 1 skip** on this base. The
  "Resend … unreachable" stack traces are deliberate worker.spec failure
  stubs — not real failures.
- **No sudo** available to Claude on this box (see `~/CLAUDE.md`).
- `quiz-engine.js` loads per-page **unversioned** (revalidates) → no bump
  needed for it; `styles.css` + site-wide scripts (`search.js`, `theme`,
  `units`, `search`, `nav-menu`, …) ARE versioned → bump when changed.
