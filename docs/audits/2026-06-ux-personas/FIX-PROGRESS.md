# UX-audit fix progress — handoff

Tracks the implementation of `findings.md` (the 2026-06 ten-persona UX
audit). **`findings.md` is the master finding list; this file is the
live disposition tracker.** Update it as findings land.

## Branch / base — READ FIRST

- **The original audit branch `fix/ux-audit-2026-06` is RETIRED.** Its work
  (the four clusters, ~40/86) merged to `main` as **PR #281 (2026-06-22)** and
  the remote branch was auto-deleted on merge. Don't reuse it — it's fully
  merged and was behind the live `main`.
- **`main` is now at v3.22.0.** **PR #282 (hydronic phase-2)** landed *after*
  #281 (dual-elevation 3D builder, depth editing; it also resolved
  codebase-issue #136). Because #282 substantially rewrote
  `simulators/hydronic-loop-builder.html`, any later audit batch that touches
  it (e.g. **S-005**) **must** branch off current `main`, not the old audit
  branch — editing the pre-phase-2 file would conflict/regress.
- **Each subsequent batch branches fresh off current `origin/main`** under its
  own `fix/ux-audit-<slug>` name with its own PR (the audit is no longer one
  long-lived branch). Current batch: **`fix/ux-audit-methodology`** (the
  methodology one-liners). Bump the version per PR only if a versioned asset
  (`styles.css` / a site-wide script) actually changes.

## Next session — START HERE

State after session 3: the four-cluster batch (~40 of 86) **merged as PR #281
on 2026-06-22**, then the audit branch was retired (see *Branch / base* above).
**PR #282 (hydronic phase-2) merged afterward**, taking `main` to **v3.22.0**.

**The long tail** — methodology/pedagogy/misc polish (see "### Remaining beyond
the four clusters"). The first batch — **methodology one-liners**
(T-018–023/029, S-003/04/05/07, E-005/07/09/10) — **shipped 2026-06-27** on
`fix/ux-audit-methodology` (3 commits, adversarially accuracy-verified, full
suite 369 pass / 1 skip; PR pending owner review, do not merge). **Next:** the
still-open long-tail items — education pedagogy, sim features, E-001 psychro
intro, and the G-/T-/P- misc set. Two owner-call items remain flagged from the
#281 batch, not yet decided: **P-010** (drill format pill) and **P-011** (Field
Drills topic chip).

Prior state (end of session 2): **20 commits, tree clean, branch NOT pushed.**
Two clusters done + adversarially reviewed: **newcomer on-ramp** (G-006/007/008)
and the **full expert-output-UX cluster** (T-005/006/008/009/010/016/025/027).

1. **Two things still want the owner's eyes** (don't silently change — ask or
   leave as-is):
   - **Editorial primary-headline calls** (T-009): affinity-laws reverted to
     no-primary; voltage-drop primary = round-trip resistance; air-mixing
     primary = mixed dry-bulb. All one-line reversible — see the Expert section.
   - A handful of small **minor uncertainties** logged in the commit bodies of
     `9dfb163` / `1d5e4e0` (e.g. signal-scaling "m = …, b = …" copy separator;
     the modbus high-bit hint showing on the teaching default; bacnet-objects
     per-cell tab-stops). All accepted-as-shipped; flip if the owner dislikes.
2. **Next cluster to build: Practice & contact** (concrete, no design gates) —
   see "### Practice & contact" below: G-002, G-016–G-020, P-001, P-008,
   P-010, P-011.
3. Then the **long tail** — methodology/pedagogy/misc polish (see "### Remaining
   beyond the four clusters").
4. **Local test recipe** is unchanged — see "## How to resume (this box)" at the
   bottom. Throwaway pw config on port 18473, full suite 361 pass / 1 skip.
   **NOTE the box gotcha:** `pkill -f "http.server 18473"` self-kills the
   harness's own task shells (their argv contains that string → exit 144); kill
   the server by PID (`SRV=$!; … kill $SRV`) or `fuser -k 18473/tcp` instead.

## Status: ~55 of 86 resolved (4 clusters #281 + methodology batch) · main v3.22.0

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
- `tools: finish expert-output-UX polish` (`9dfb163`) — **T-005, T-006, T-008,
  T-016, T-025, T-027** (copy affordances, full-precision copy, modbus high-bit
  nudge, direction echoes + refrigerant decoy removal, dew-point labels+max,
  hidden-qualifier notes). Closes the expert-output-UX cluster.

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

### Expert output UX & copy — ✅ CLUSTER COMPLETE (T-005/006/008/009/010/016/025/027)
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
✅ **DONE (`9dfb163`) — whole expert cluster closed.** Applied via a workflow
(per-tool agent + adversarial verify), full suite 361/1, every new interaction
browser-verified (clipboard reads included):
- **T-005** copy affordances: signal-scaling "Copy m, b"; modbus-register-viewer
  offset/FC copy; modbus-functions CRC-bytes copy; bacnet-ip-converter
  type,instance copy; bacnet-objects click-to-copy code cells (keyboard-able).
- **T-025** precision-on-copy: signal-scaling copies FULL precision while the
  readout stays 6-dp (verified display 3.333333 / clipboard 3.3333…35); modbus
  f32 column rounds to 7 sig figs.
- **T-006** modbus high-bit nudge (signed reading shown when high-bit+unsigned).
- **T-008** signal-scaling reverse-direction note; refrigerant-pt HIDES the
  inactive lookup field (decoy gone) + active toggle reads selected.
- **T-016** dew-point "Entering-air …" labels + RH max=100/min=0 (cleared for WB).
- **T-027** affinity unit note; coil-sizing "Process change (signed: − = cooling)";
  voltage-drop near-room-temp caveat — the workflow's first voltage-drop note had
  a BACKWARDS NTC physics claim (caught by the adversarial verifier: error =
  R_wire/|dR/dT|, steeper cold curve → smaller error); rewrote it non-directional.

### Practice & contact — ✅ CLUSTER COMPLETE (session 3, 2026-06-20)
Driven straight + put through an adversarial 3-dimension review workflow
(correctness / completeness-vs-findings / conventions) with a refute-by-default
verify pass: **2 candidate issues raised, 0 confirmed** (both self-refuting
non-findings — email pattern parity + name-casing — independently verified
clean). Full suite 363/1 after the #280 merge; email `pattern` browser-verified.
- **G-002** ✅ Practice card added to the home Browse row (now a 2×2);
  Simulators card reworded "Practice on the model" → "Run the models" (+ pill
  "Practice" → "Hands-on") so the word stops colliding; Practice bullet +
  description added to `404.html`; the "new? → Surviving Your First Months"
  on-ramp pointer now rides the home Practice card. (`221f8c8`)
- **G-016–G-020** ✅ contact flow (`b87ad5a`, `contact.html` + `worker.js`):
  mailto fallback (`contact@controlsfreak.dev`), near-form privacy link +
  reassurance, one-shot `clearStale` listener for the stale success banner,
  reply-time reconciled to privacy's "day or two", `Verification failed —`
  recovery hint, and a client `pattern` mirroring `EMAIL_RE` (dot-edge
  addresses caught inline; verified in Chromium, full client/server parity).
- **P-001** ✅ five field drills cross-linked into a connected graph via a
  sibling `quizzes:` group (`8996c5e`); engine/quizOrder untouched (the
  curriculum exclusion is documented intent).
- **P-008** ✅ the two genuinely metric-trapped numerics get an explicit
  "Enter the answer in °F." (`b474ab3`) — `superheat-calc` **and**
  `psy-mixing-fraction` (the audit missed the latter; its
  balancing/pump/staging picks were GPM/%/% with no trap).
- **P-010 / P-011 — OWNER-CALL, left as-is (flag, don't gate):** P-010 (drill
  format pill) — kept the deliberate scope label (`Field Sampler` / `Symptom →
  Cause` etc.); the finding itself allows "accept as deliberate." P-011 (Field
  Drills topic chip) — left no-chip per the documented CLAUDE.md intent
  ("drills hide under any topic-specific chip"). Both are one-line reversible
  if the owner wants the pill/chip — surface in the PR for the preview review.

### Remaining beyond the four clusters

**Methodology one-liners — ✅ DONE (2026-06-27)** — T-018/19/20/21/22/23/29,
S-003/04/05/07, E-005/07/09/10. Fifteen honest-caveat / assumption notes on
`fix/ux-audit-methodology` (tools `09e27a8`, sims `cc19747`, education
`40bf87c`). Each put through an adversarial per-finding accuracy pass
(refute-by-default) that caught + fixed a closed-loop static-head error (T-020)
and a sea-level overclaim (T-021). Prose-only, no versioned-asset change; full
suite 369 pass / 1 skip, build clean.

**Still open (not yet triaged with owner):** education pedagogy
(E-004/06/11/12/15/16), sim features (S-001/02/06/08/09), E-001 psychro intro,
misc (T-004/11/24/26/28, G-005/09/11/12/13, P-002/06/09). Protect-notes (no
action): E-017, G-010, G-014.

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
