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

## Status: ~21 of 86 findings resolved · 9 commits · working tree clean

All commits built clean and passed the full Playwright suite (361 pass /
1 skip). Honesty paths + hero on-ramp also verified by direct browser drive.

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

## Owner decisions already made (do NOT re-ask)
- Branch off `origin/main`; run the whole quick-wins batch; tackle all
  four clusters (sequence flexible).
- **G-003 headline:** keep the H1 slogan, add one inclusive on-ramp line. ✅ done
- **G-006 nav:** add a "Start here" affordance — **do NOT reorder** the nav.
- **G-008 glossary:** **incremental `<abbr title>` tooltips** — NOT a glossary page.
- **Cheap accommodations approved:** Tools intro (done), palette zero-state
  (queued G-007), gloss BACnet vendors (done). **E-001 psychro-intro
  rewrite was NOT selected** — leave it (defer).
- **T-002/T-003 markers:** clear + narrow the BACnet caveat. ✅ done
- Verify-data research (NEC FLC + BACnet enums) ran and is the basis for
  T-002/T-003; full result in the workflow output, summary in `findings.md`
  context. NEC all-correct; BACnet had the one vendor-id/name swap.

## Queued — the four chosen clusters

### Newcomer on-ramp (approved — build next, in this order)
- **G-007 palette zero-state** — `html/scripts/search.js`. On empty open,
  render a short browse list (sampling across sections / newest pages); on
  "No matches", offer a "browse Education" fallback link. *search.js is a
  site-wide VERSIONED script → triggers the version bump (see Housekeeping).*
- **G-006 nav "Start here" affordance** — `_includes/nav.njk` + a small
  `styles.css` rule. A distinct newcomer entry point in the chrome →
  `/education/`. Keep the section order unchanged.
- **G-008 incremental `<abbr title>`** — first-use tooltips on the acronym
  load (AI/AO/BI/BO, MS/TP, AHU, VAV, RTU, FLA, JACE, EBO, Cv/Kv, ΔT, PB).
  Start with newcomer-facing pages (BACnet Basics, Education landing, hero).
  Note: for newcomer-inline gloss prefer a parenthetical over `<abbr>`
  (mobile has no hover) — `<abbr>` is for the broader incidental load.

### Expert output UX & copy (not started — bring design options)
- **T-009** result-size hierarchy (primary headline size; promote verdict
  pill; align formula-receipt precision to the readout). **Design call —
  show options.**
- **T-010** collapsible preamble (one orienting sentence + collapsible
  "what this does"; reconciles expert-vs-newcomer with T-012). **Design call.**
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
- **Version bump → `3.20.1`** in `package.json` (footer reads
  `site.version`). Needed once a shared/versioned asset changes
  (`search.js`, `styles.css`). **Use 3.20.1, not 3.21.0** — the phase-2
  branch already claimed 3.21.0; 3.20.1 avoids a collision regardless of
  merge order.
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
