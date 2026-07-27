# Session handoff — the full-experience arc, verified and staged (2026-07-27)

> **Lifecycle:** written 2026-07-27, then **fact-checked and rewritten the
> same day by a dedicated pre-verification session.** The prior draft's
> claims were run through `/verify-handoff`: 32 claims, 24 verified, 6
> corrected, 2 unverifiable. Corrections are folded in below rather than
> annotated — read this as current, not as a diff.
>
> **The authoritative arc plan lives OUTSIDE the repo at
> `~/.claude/plans/we-are-working-on-synthetic-gray.md`** — read it FIRST and
> do not re-derive its decisions. ⚠️ It contains **two independently numbered
> lists** and they are easy to conflate: `## OWNER DECISIONS` (line 84,
> items 1–9) and `## ✅ THE EIGHT RULINGS — CLOSED` (line 261, items 1–8).
> When this file cites a ruling number it means the **OWNER DECISIONS** list.
> Ruling 9 (the sensors + ΔT ruling) is at plan line 117.
>
> **Retire this file when the open stack is merged and the Phase-7 AHU design
> round has begun.**

## Ground truth (verified 2026-07-27, `main` @ `20e12ab`)

- `main` @ **v3.74.6**, clean tree. Page is
  `html/simulators/ddc-workbench-fcu.html`.
- **Hidden means crawl-hidden, not undeployed.** `noindex: true` +
  `eleventyExcludeFromCollections: true` + no `canonical`; confirmed absent
  from built `sitemap.xml`, `search-index.json`, every nav dropdown, and
  `tests/pages.js`. It still builds (258 KB) and ships to Cloudflare on every
  merge, reachable at its public URL. It is **not** untested — six specs
  drive it by naming the URL directly; that omission from `tests/pages.js` is
  deliberate, do not "fix" it.
- **Merged this arc:** PRs #436–#442. (The prior draft said "#436–#444
  shipped" — #443/#444 are open drafts, and #445 was omitted entirely.)

## The open PR stack — merge in order, stacked

| PR | Branch | Base | CI | Contents |
|---|---|---|---|---|
| **#443** | `feat/ddcw-safeties-program` | `main` | `test` **SUCCESS** | Fourth program "2-stage + safeties" |
| **#444** | `feat/ddcw-visible-sensors` | #443 | *no `test` run* | Sensor glyphs, `highlightChip`, RAT point + return-duct probe |
| **#445** | `feat/ddcw-signed-coil-dt` | #444 | *no `test` run* | Signed ΔT (DAT − RAT, negative cooling) + min-off teaching beat |

All three are **draft**, all on their original bases — no retarget has
happened yet, so the close/reopen mechanic below is untested this arc.

**Why #444/#445 show no `test` check:** `.github/workflows/test.yml:21-23` is
`pull_request: branches: [main]` with no `types:` key. `gh run list
--workflow=test.yml` confirms **zero** runs ever for those two branches. The
green "Workers Builds: controlsfreak" on all three is a *build*, not the
suite — do not mistake it for a passing test run.

**The retarget trap:** on parent merge GitHub auto-retargets the child, but
retargeting fires the `edited` activity type, which is outside the default
`[opened, synchronize, reopened]` set — so no `test` run. Close and reopen
the retargeted PR to fire it, then watch-then-merge on green. Pushing new
commits also works (`synchronize` is in the default set). Branches
auto-delete on merge (`delete_branch_on_merge: true`).

⚠️ This is the repo's **first stacked PR** — every merged PR #413–#442 was
based on `main`. There is no local precedent for the retarget behavior; the
mechanism above is derived from the workflow config plus GitHub semantics,
not from something this repo has done before.

## Merge gate — screenshots exist now

The owner green-lit these merges **conditional on the feedback round being
addressed and shown to him** (three sensor glyphs + negative ΔT, both
themes). Confirm with him before merging.

The prior draft pointed at a session scratchpad for those screenshots. **That
path is dead** — the scratchpad evaporated with its session. Regenerated
2026-07-27 off `feat/ddcw-signed-coil-dt` (the only branch carrying all three
glyphs *and* signed ΔT together) and captured at
`~/.claude/jobs/bd3a3f96/tmp/shots/`. If that job dir is also gone by the time
you read this, regenerate: build the signeddt worktree, serve `_site` on a
probed high port, drive `#fcu-speed-slider` to 60 until `#fcu-dt` reads
negative, capture with `colorScheme` set explicitly per theme (headless
Chromium defaults to light).

Captured state, both themes, zero console errors: ΔT badge **−17.5 °F** dark /
**−17.6 °F** light, arithmetic closing exactly on the displayed operands
(58.4 − 75.9 = −17.5); all three glyphs visible with `role="button"` +
`tabindex="0"`; clicking the RAT probe highlights the `RAT 76.0 °F` chip.

⚠️ **The LAN preview cannot serve this gate.** `_built.txt` reads
`commit: bb63678 … ahead 5 of origin/main`, but the sensors tip is now
`b5f322e`, 7 ahead — the published snapshot predates both RAT commits.
Verified from the served bytes: `data-point="rat"` → **0 hits**, only `dat`
and `space-temp`. Republishing from `sensors` still would not show signed ΔT.

## ⚠️ Read before merging: the prose audit

`docs/audits/2026-07-ddcw-prose/findings.md` — a four-lens skeptical audit of
this stack's teaching prose, run because the authoring session asked for
fresh eyes on exactly that. **21 findings, 2 killed by refutation, 19 survive
(1 WRONG · 11 MISLEADING · 7 NIT). Nothing has been applied.**

The three that most affect whether this stack should merge as-is:

1. **The "safeties" sheet has no airflow proof.** Its only inputs are
   `space-temp` and `dat`, and `datT = fanOn ? coilLeaveT + FAN_HEAT : zoneT`
   — so with the fan forced off the low limit reads room temp, goes blind,
   self-clears, and the sheet commands both compressors into dead air. Fix is
   prose (name the scope boundary), not a rewire.
2. **"Holds them off until it recovers past the clear constant" mispredicts
   the observable by 110 sim-seconds.** The trip is itself a stop, so it arms
   the min-off TON as it cuts the stages: latch clears at ~10.5 s, stages
   return at 120 s.
3. **The min-off war story points at the trivial failure.** Slot-8-outranks-
   slot-16 is just how priority arrays work. The teachable defect is that the
   TON reads the program's own request instead of the point's
   post-arbitration value — force the stages *off* and the timer never
   starts. **This is the owner's anecdote; his to rewrite.**

## Owner rulings (plan file, OWNER DECISIONS 8–9) — unverifiable from the repo

`gh pr view 441 --json reviews` returns **zero** reviews; the #441 review
happened in conversation. The plan file records these, but that is the same
evidentiary chain as this handoff, not independent corroboration. Confirm
before relying on any of them.

- Two-page architecture approved; `-fcu` rename executed (#442). **The bare
  `ddc-workbench` name must never mean the FCU.** No legacy redirect exists
  for the old URL, which is consistent with that ruling — do not add one.
- AHU page name undecided; owner lean is that the AHU takes the bare name.
  Named agenda item for the Phase-7 round.
- Sensor drawing verdict: "spot on, exactly the mental image I had."
  Focus-ring-on-click stands.
- RAT is a real AI point reading **truth** zone temp (verified: forcing the
  override to 60 splits the chips, `space=60 / rat=74.72`).
- ΔT signed = DAT − RAT, negative cooling. Heat mode is a named future
  direction; **never promise it in page copy** (verified: no promise ships).
- Min-off stays full-stop-only; war story #3 feeds the scope note,
  vendor-agnostic.

## After the stack merges

1. **Housekeeping:** ff the shared tree, remove the three worktrees
   (`safeties` / `sensors` / `signeddt`, all with `node_modules` already
   installed) and their local branches, republish the LAN preview
   (`CF_PREVIEW_DIR=/home/ehill/caddy/dashboard/cfdev npm run publish:preview
   -- --build`).
2. **File the deferred issues.** Adding to `docs/codebase-issues.md` on `main`
   right now would conflict with the stack, which appends to the same file.
   After merge, file: the empty `<script type="application/ld+json"></script>`
   that `nav: simulators` emits on this canonical-less page (latent trap —
   adding a canonical at graduation would silently publish SoftwareApplication
   markup), plus the a11y items from the prose audit (§7, §8, and smaller
   items 17/18/19).
3. **Phase 7 — AHU design round WITH the owner first** (do not build ahead):
   agenda = AHU page name, the ~12-point list, `sel` block in fbe-engine,
   psychro mix helper, econ-dx-2stage + min-oa-dx programs, graphic mockup on
   a hidden page. Plan-file section "AHU v1 sketch" (line 376) has the inputs.
   **Carry prose-audit finding #6 into this round:** `DAT − RAT` is correct
   only on a 100%-recirculating cabinet. The AHU has an OA damper, where the
   coil enters on mixed air — whatever wording lands on the FCU page should be
   one the AHU page does not have to contradict.
4. Phase 8 — graduation per the plan's tiered checklist.

## Known state a next session should not re-derive

- **`codebase-issues` #217–#224** (not #217–#223 — the prior draft
  undercounted). On `main`: 217–221. On all three branches via #443: 222, 223.
  On `signeddt` only: **#224** — the verdict/chevron ΔT thresholds compare
  display-unit values against a bare `-3`, so between −3 and −5.4 °F a metric
  viewer reads "No ΔT across coil" while a US viewer sees healthy cooling.
  #224 is mentioned nowhere else; abandoning the stack loses it.
- **`docs/codebase-issues.md` diverges *within* #222's body** across the
  stack — the sensors branch appended a follow-on paragraph. Merging in stack
  order absorbs it; a cherry-pick or out-of-order merge conflicts inside the
  entry.
- **PR #444's GitHub body is stale.** It says two glyphs and six tests;
  reality is three and seven, and its placement rationale never mentions RAT.
  Reviewing the body instead of the diff hides the entire feedback round.
  Amend it before showing the owner.
- **`docs/air-side-sim.md` contradicts itself.** The section titled "Current
  state" (line 28) still says "the loop is still OPEN," which the same file
  refutes at :126 and :230. Its PR ledger stops at #424. Highest-value doc
  edit before the AHU round, because that block is the first thing a fresh
  session reads.
- **`tests/ddcw-fcu-unit.spec.js:535`** carries `DISPLAY_ONLY_SENSORS =
  new Set(['rat'])`, a self-expiring exemption. It will fail loudly and
  correctly the moment any sheet authors a `rat` block. By design.
- **Do not revert `b5f322e`'s `d.eatT = plant.zoneT`.** It looks like a no-op
  one-liner; it is pinned by an exact-equality assertion and the signed-ΔT
  prose depends on badge == probe.
- **#222 gates the "perf-profile clean" checklist item** — the flagged
  `layoutsPerFrame` row fires on a clean `main` build too, so it is not
  attributable to #443 and cannot be satisfied as written until the baseline
  is re-measured.

## Standing directives (owner, carried across sessions)

Orchestrate via workflows; don't code in the main session. **Route harder
judgment to the strongest agents available to the session** — the previous
handoff's "Opus for mechanical, Fable for design" was written from that
session's seat and should be read as intent, not a literal model list. Draft
PRs only — the owner merges. Stop and talk on low confidence or
contradictions. Never `git checkout` in the shared tree (concurrent sessions
share it) — worktrees only. Unique high ports (94xx, probe first), foreground
waits, adversarial verify on anything measured,
verify-the-remedy-not-just-the-finding. Log noticed-in-passing issues to
`docs/codebase-issues.md`.

**And one this arc earned:** a handoff must not point at anything whose
lifetime is shorter than the handoff's. Five of the six corrections to the
prior draft were claims that were *true when written and perished before the
file was read* — a session scratchpad path, a build stamp, an issue-number
range that grew. Commit SHAs, branch names and PR numbers all survived
perfectly. Prefer them.
