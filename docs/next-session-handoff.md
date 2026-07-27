# Session handoff — the full-experience arc, mid-flight (2026-07-27)

> **Lifecycle:** written 2026-07-27 at an owner-requested session boundary,
> superseding the 2026-07-26 "#209 is next" brief (git history retains it).
> That brief's route was executed in full this arc — everything it queued
> shipped as PRs #436–#444. **The authoritative arc plan lives OUTSIDE the
> repo at `~/.claude/plans/we-are-working-on-synthetic-gray.md`** — all nine
> owner rulings, the phase map, the unit contract, and the AHU design-round
> inputs are there; read it FIRST and do not re-derive its decisions. This
> file carries only what a fresh session needs to find the live state.
>
> **Retire this file when the open PR stack is merged and the Phase-7 AHU
> design round has begun.**

## Where the arc stands

The goal (owner): **full experience BEFORE public** — arbitration + program
redesign + relayout (all merged), then visible sensors + selectable unit
type, then graduation. Merged this arc: PRs #436–#442 (decision round,
#209 arbitration, sidecars, mono 700, program rewrite + candidate-A
relayout, shell extraction, and the `-fcu` rename). `main` is at
**v3.74.6**; the page is `html/simulators/ddc-workbench-fcu.html` (hidden:
no canonical, noindex, out of sitemap/search/tests-manifest).

**The bare `ddc-workbench` name must never mean the FCU** (owner ruling at
the #441 review). The AHU page name is undecided — owner lean: the AHU
takes the bare name ("most common"); final call is a named agenda item of
the Phase-7 design round.

## The open PR stack (merge in this order, stacked)

1. **#443** — the fourth program, "2-stage + safeties" (latched DAT
   low-limit 42/52, fan rides through; full-stop-only TON min-off —
   deliberate, see rulings; observation-only annunciator verdict line).
   CI green at handoff.
2. **#444** (base = #443's branch) — visible sensor glyphs + the
   `highlightChip` shell hook, **plus the RAT point + return-duct probe**
   commits from the 2026-07-27 feedback round.
3. **A signed-ΔT PR** (base = #444's branch; number unknown at writing —
   `gh pr list` is truth): coil ΔT = DAT − RAT, **signed, negative in
   cooling** (abs() rejected by owner — the sign is the learning), plus
   the min-off war-story teaching beat. May still have been in flight when
   the prior session ended — see *Recovering the in-flight round* below.

**Merge gate:** the owner green-lit these merges **conditional on the
feedback round being addressed and shown to him** (screenshots of the
three probes + negative ΔT, both themes). Confirm with him before merging.
Mechanics that bit before: stacked PRs auto-retarget on parent merge, but
the `test` CI check only fires on PRs based on `main` — **close/reopen the
retargeted PR to trigger it**, then watch-then-merge on green. Branches
auto-delete on merge.

## Recovering the in-flight round (if it didn't finish)

A four-stage workflow (RAT → signed-ΔT → adversarial verify → fix) was
running at handoff. Its lanes push to GitHub as they finish, so ground
truth is: `gh pr list`, `git log` on `feat/ddcw-visible-sensors` and
`feat/ddcw-signed-coil-dt`, and the worktrees under `.claude/worktrees/`
(`safeties`, `sensors`, `signeddt` — reusable, `npm ci` already run).
The full spec for anything unfinished is plan-file ruling 9. Screenshots
land under the session scratchpad `…/scratchpad/signeddt/shots/`.

## Owner rulings collected 2026-07-27 (also in the plan file, ruling 8–9)

- Two-page architecture approved ("fine if selecting a new unit actually
  changes pages"); `-fcu` rename executed (#442).
- Sensor drawing verdict: "spot on, exactly the mental image I had."
  Focus-ring-on-click: no objection — stands.
- RAT is a real AI point reading **truth** zone temp (diverges from an
  overridden wall stat — the real-vs-sensed beat).
- ΔT signed = DAT − RAT, negative cooling. **Heat mode on units is a named
  future direction** — it motivated the convention; never promise it in
  page copy.
- Min-off stays full-stop-only; war story #3 (programs that protect the
  normal stop but short-cycle when an operator forces things) feeds the
  scope note, vendor-agnostic.

## After the stack merges

1. Housekeeping: ff the shared tree, remove the three worktrees + local
   branches, republish the LAN preview
   (`CF_PREVIEW_DIR=/home/ehill/caddy/dashboard/cfdev npm run
   publish:preview -- --build`; it was serving the sensors branch at
   handoff, "ahead 5 of main" per `_built.txt`).
2. **Phase 7 — AHU design round WITH the owner first** (do not build
   ahead): agenda = AHU page name, the ~12-point list, `sel` block in
   fbe-engine, psychro mix helper, econ-dx-2stage + min-oa-dx programs,
   graphic mockup on a hidden page. Plan-file section "AHU v1 sketch" has
   the inputs.
3. Phase 8 — graduation per the plan's tiered checklist.

## Standing directives (owner, verbatim intent — carried across sessions)

Orchestrate via workflows; don't code in the main session. Opus agents for
mechanical lanes, Fable where design judgment matters. Draft PRs only —
the owner merges (this session's merges each had explicit clearance). Stop
and talk on low confidence or contradictions. Never `git checkout` in the
shared tree (concurrent sessions share it) — worktrees only. Unique high
ports (94xx, probe first), foreground waits, adversarial verify on
anything measured, verify-the-remedy-not-just-the-finding. Log
noticed-in-passing issues to `docs/codebase-issues.md` (this arc filed
#217–#223).
