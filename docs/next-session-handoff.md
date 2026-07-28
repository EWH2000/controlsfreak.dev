# Session handoff — the stack is merged; Phase 7 (AHU design round) is next (2026-07-27)

> **Lifecycle:** the full-experience arc is **complete and merged**. This file
> was fact-checked, then rewritten again after the merge. Its predecessor's
> whole job — get the open stack landed — is done, so what follows is a
> **Phase-7 launchpad**, not a status report.
>
> **The authoritative arc plan lives OUTSIDE the repo at
> `~/.claude/plans/we-are-working-on-synthetic-gray.md`.** ⚠️ It contains **two
> independently numbered lists** and they are easy to conflate:
> `## OWNER DECISIONS` (line 84, items 1–9) and `## ✅ THE EIGHT RULINGS`
> (line 261, items 1–8). Cite the list, never a bare "ruling N."
>
> **Retire this file once the Phase-7 AHU design round has happened with the
> owner.**

## Where things stand

`main` @ **`015a319`**, v3.74.6, clean tree, **zero open PRs**, no leftover
worktrees or branches.

The full-experience arc merged 2026-07-27 as **PRs #436–#445**. The hidden
workbench at `html/simulators/ddc-workbench-fcu.html` now has: 3-slot BACnet
priority arbitration, a relaid-out wiresheet, **four** sample programs
(including *2-stage + safeties*), the unit-agnostic shell extracted to
`html/scripts/ddcw-shell.js` with the FCU plug-in in `ddcw-fcu-unit.js`,
**three sensor glyphs** (RAT + DAT insertion probes, a space-temp wall plate),
and a **signed coil ΔT** — leaving minus entering, negative while cooling.

Post-merge verification: **871 passed / 1 skipped / 0 failed** against merged
`main`. No version bump was owed and this was checked, not assumed — the stack
touched only `ddcw-shell.js` and `ddcw-fcu-unit.js`, both loaded **unversioned**
from the page's `{% block scripts %}` (revalidate default, no cache-bust
dependency), and `styles.css` was untouched.

**Hidden means crawl-hidden, not undeployed.** `noindex` +
`eleventyExcludeFromCollections` + no `canonical`; verified absent from the
built sitemap, search index, every nav dropdown, and `tests/pages.js`. It still
builds and ships to Cloudflare on every merge. It is **not** untested — several
specs drive it by naming the URL directly; that `tests/pages.js` omission is
deliberate, do not "fix" it.

## Phase 7 — the AHU design round (do this WITH the owner, do not build ahead)

Agenda, from the plan file's *AHU v1 sketch* (line 376):

1. **The AHU page name** — a named agenda item. Owner lean: the AHU takes the
   bare `ddc-workbench.html`, "since that's most common." ⚠️ Standing ruling:
   **the bare `ddc-workbench` name must never mean the FCU.** No legacy
   redirect exists for the old URL and none should be added.
2. The ~12-point list, `sel` block in fbe-engine, psychro mix helper,
   `econ-dx-2stage` + `min-oa-dx` programs, graphic mockup on a hidden page.

Three things the last arc learned that bear directly on this round:

- **`DAT − RAT` becomes `DAT − MAT`.** Owner call 2026-07-27: the AHU reads
  **MAT** as entering, so leaving-minus-entering holds unchanged across both
  units. The FCU prose was already generalized to state the rule rather than
  the bare identity, so the AHU page will not have to contradict it.
- **The program sweep rides with this round.** `codebase-issues` **#225** and
  **#226** were deferred by owner decision to a single pre-live sweep, on the
  reasoning that the AHU programs carry more of the same class and a piecemeal
  patch now would just be swept again. Read both before authoring an AHU
  sequence — **#225** in particular (a discharge-temp limit cannot see a
  stopped fan; the fan-proof interlock belongs first in a DX sequence).
- **Mockup-first.** The owner's scope evolves through interaction with a
  working artifact. Get something clickable in front of him early rather than
  locking the spec up front.

Then **Phase 8 — graduation** per the plan's tiered checklist.

## Open, and not covered by the program-sweep deferral

- **`codebase-issues` #227(b) — FCU graphic a11y. RULED 2026-07-28, scheduled,
  not done.** `role="img"` **stays** and the activation affordance moves out of
  the SVG onto real HTML buttons, with the point-mirror chips as the
  activators — so the focusable elements simply leave the pruned subtree. The
  naive `role="group"` swap is **closed**: it un-hides 19 `<text>` nodes
  already duplicated in the `.fcu-points` mirror. The ruling also settles the
  *glyph names announce as objects, not actions* finding from the same audit.
  It rides with **agenda item 2 above** (the graphic work of this round), as
  one change across the FCU and AHU pages rather than two divergent ones; the
  stale in-file comment it names is corrected there, with the rest of it. Full
  ruling in `codebase-issues` #227 — do not re-litigate.
  **(a) is closed** — shipped on `fix/ddcw-pre-ahu-hygiene` as an `.sr-only`
  mirror outside both panes, with prose-audit item 18's signature guard.
- **`codebase-issues` #229** — `#fcu-ovr-state` is the same unguarded-10 Hz
  live region on a different element, and unlike the verdict it announces a
  drifting number. Found while fixing #227(a); deliberately not bundled.
  ⚠️ Its signature MUST include the unit suffix (the verdict's need not).
- ~~**`codebase-issues` #224**~~ — **closed** on `fix/ddcw-pre-ahu-hygiene`:
  `COOLING_DT_TRIP` (°F) plus a canonical `datDeltaT(d)` on the physics-half
  threshold shelf. The rule the AHU inherits is written into the file header
  and pinned by a source-scan guard in `tests/ddcw-fcu-unit.spec.js`.
- ~~**`codebase-issues` #223**~~ — **closed** on the same branch: the wiresheet
  review rig un-clips the canvas before shooting, so the matrix stops cropping
  tall/wide sheets. Pinned by `fbe-geometry.spec.js` layer C.
- **`codebase-issues` #228 — engine standardisation** (owner direction, not
  this arc). Air mixing has three disagreeing forms across four call sites and
  `psychro-engine.js` has no mixing helper. It rises the moment the AHU lands,
  because an AHU has a mixing box — that page should call a helper rather than
  become the fifth implementation.
- **`codebase-issues` #222 gates the "perf-profile clean" checklist item** —
  the flagged `layoutsPerFrame` row fires on a clean `main` build too, so it is
  not attributable to any one PR and the item cannot be satisfied as written
  until the baseline is re-measured.
- **The empty JSON-LD trap.** `nav: simulators` makes `head.njk` emit
  `<script type="application/ld+json"></script>` on this canonical-less page.
  Harmless now; **adding a canonical at graduation would silently publish
  SoftwareApplication markup for it.** Not yet filed — file it when touched.
- The smaller a11y items (glyph names announce as objects not actions; "far
  wall" has no referent; `aria-label` on two bare `<div>`s; unguarded verdict
  `textContent` at 10 Hz) are itemised in
  `docs/audits/2026-07-ddcw-prose/findings.md`.

## The prose audit — read the disposition before reopening anything

`docs/audits/2026-07-ddcw-prose/findings.md`. 21 findings, 2 killed by
adversarial refutation, 19 survived; **owner-dispositioned 2026-07-27**. The
doc records the two refuted findings so they are not re-raised, and what was
checked and found sound so it is not re-audited. Its §3 and §6 quotes are the
**pre-fix** text — both shipped in #445.

## Environment notes that keep biting

- **Port 8000 is occupied on this box.** `npm test` cannot bind it. Run the
  suite through a throwaway config on a probed high port (94xx), pointing
  `testDir`, `baseURL`, `webServer.command`, `webServer.url` and `webServer.cwd`
  at the tree under test.
- **Headless Chromium defaults to `prefers-color-scheme: light`.** Set
  `colorScheme` explicitly per context when capturing, or you will screenshot
  the wrong theme and not notice.
- **Never `git checkout` in the shared tree** — concurrent sessions share it.
  Worktrees only.
- **Reap your dev servers.** `pgrep -af 'http\.server|eleventy'`, and note that
  a `pkill` pattern matching your own command string will kill the shell
  running it.
- The **LAN preview** at `https://cfdev.home.arpa/` is a snapshot, not a
  server, and it cannot exercise the Worker. Republish with
  `CF_PREVIEW_DIR=/home/ehill/caddy/dashboard/cfdev npm run publish:preview -- --build`.
  Check `_built.txt` for provenance — but verify from the **served bytes**, not
  the stamp (see the standing directive below).

## Merge mechanics — now proven, not theorized

The stacked-PR path was exercised for the first time in this repo and behaved
exactly as documented:

- On parent merge GitHub **auto-retargets** the child to `main`.
- The retarget fires the `edited` activity type, which is **outside** the
  default `[opened, synchronize, reopened]` set, so `test` does **not** run —
  `.github/workflows/test.yml:21-23` is `pull_request: branches: [main]` with
  no `types:` key.
- **Close and reopen the retargeted PR** to fire it. Confirmed working on both
  #444 and #445. Pushing a commit also works (`synchronize`).
- Drafts must be `gh pr ready` before merging. Branches auto-delete on merge.
- The Cloudflare "Workers Builds" check runs on every PR regardless of base —
  **it is a build, not the suite.** Never read it as a passing test run.

## Standing directives (owner, carried across sessions)

Orchestrate via workflows; don't code in the main session. **Route harder
judgment to the strongest agents available to the session** — an older handoff's
"Opus for mechanical, Fable for design" was written from that session's seat and
is intent, not a literal model list. Draft PRs only — the owner merges, on
explicit clearance. Stop and talk on low confidence or contradictions. Unique
high ports (probe first), foreground waits, adversarial verify on anything
measured, verify-the-remedy-not-just-the-finding. Log noticed-in-passing issues
to `docs/codebase-issues.md`.

**A handoff must not point at anything whose lifetime is shorter than the
handoff's.** Five of the six corrections to this file's predecessor were claims
that were *true when written and perished before the file was read* — a session
scratchpad holding the merge-gate screenshots, a build stamp that the branch
outran, an issue range that grew by one. Commit SHAs, branch names and PR
numbers all survived perfectly. Prefer them, and where a perishable pointer is
genuinely needed, write the regeneration recipe beside it.
