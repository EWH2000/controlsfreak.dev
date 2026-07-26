# Session handoff — VERIFICATION PASS COMPLETE (2026-07-25)

> **Archived 2026-07-26.** The cycle this file governed is closed: PR #430
> merged, the verification pass ran (§14 is its ledger), the host-hygiene
> cleanup finished (§12), §13's preview idea shipped as PRs #431/#434, and
> §10's item 1 plus the whole #211 / #212 arc are done. Every finding that
> still has work attached was written into `docs/codebase-issues.md` as
> **#205–#216** — that file, not this one, is the live record.
>
> Kept for two things. **§14 is the only full account of the verification
> pass** — 82 claims, 45 verified / 7 corrected / 25 partial / 5
> unverifiable, and 31 proposed corrections of which 7 were themselves
> refuted. And **§6 / §7 are the raw diagnosis of the DDC Workbench
> layout and its three control programs**, at a level of detail the
> codebase-issues entries summarize rather than reproduce — worth reading
> before the polish arc, with §6's own ⚠️ CORRECTED markers respected.
>
> Read the inline ⚠️ markers as part of the text, not as footnotes: this
> file's headline finding was that **the work was sound and the record of
> it was not**, and the markers are where that shows.

> **Lifecycle:** written 2026-07-25, superseding the 2026-07-24 "static-print
> background is next" handoff. That arc was **parked by the owner** — see
> *§0 What changed*. This file's job is different from a normal handoff: it is a
> **verification request**, not a work brief. Retire it when the owner has
> merged or closed PR #430 and ruled on the DDC Workbench decisions.
>
> ## ✅ THE REQUESTED VERIFICATION RAN — 2026-07-25, at `b80111e` / PR head `702b616`
>
> **82 claims extracted: 45 VERIFIED · 7 CORRECTED · 25 PARTIAL · 5
> UNVERIFIABLE.** Six independent lanes, each followed by an adversarial
> refutation stage over its own corrections. Of **31 proposed corrections, 26
> survived refutation and 7 were themselves wrong** (23% — close to the 7-of-19
> rate this repo measured before, and the reason the refutation stage exists).
>
> **Headline: the WORK is sound; the RECORD of the work was not.** Nothing found
> makes PR #430 wrong — the sweep's substance is confirmed (197 paths flagged,
> all correct, no unrefreshed geometry write anywhere). What failed was the
> description: 26 real errors, concentrated in numbers that were never written to
> a repo artifact.
>
> **Full ledger in §14.** Corrections are also applied inline below, marked
> **⚠️ CORRECTED**. Claims verified as written carry no marker.
>
> **Three findings that bear on a pending decision — read before ruling:**
> 1. **C12 is wrong in a way that would ship a bad fix** (§6, decision #4).
> 2. **D6's second half is false** (§7, decision #5) — a shipped page's failure
>    mode is not what this file says.
> 3. **C15's two candidate layouts have no coordinates**, so their headline
>    numbers are unfalsifiable (§6). You are being asked to choose between two
>    layouts that do not exist yet.
>
> **And one thing this file was RIGHT about, against a browser that said
> otherwise:** §8's arithmetic. A lane measured the page and "corrected" E1–E4;
> the refutation stage found the lane had measured under headless Chromium's
> `hinting=full` glyph quantization, while this box's fontconfig
> (`/etc/fonts/conf.d/10-hinting-slight.conf`) selects `hintslight` — which is
> what a *headed* browser uses. Under `slight`, §8's numbers reproduce **to three
> decimals**. **The owed confirming sweep is now done and the bug is real** — see
> §14.

## 0 — Read this first

**The owner has frozen everything pending an independent second pass.** His
words, 2026-07-25:

> *"before anything merges or I approve anything, I want you to hand off to an
> independent verification session… I just want to be sure everything is right
> here and gets a second pass."*

So:

- **Do not merge PR #430.** Do not mark it ready for review. Do not push to its
  branch unless a verification finding requires it, and say so first.
- **Do not act on the DDC Workbench decisions.** Nothing there has shipped;
  eight design questions are waiting on the owner and must not be pre-empted.
- **Do not treat any number in this file as established.** Every claim below is
  a hypothesis. The repo is the truth.

**Why this exists, stated plainly.** The producing session self-corrected
repeatedly — sometimes catching itself, sometimes being caught by its own
verification lanes. The owner noticed:

> *"good work but you caught yourself a lot, and it looks like I should have
> caught some things earlier on too."*

That is a fair read and it is the reason for this pass. §2 is a register of
every place the producing session was demonstrably wrong, because **that is the
risk map** — weight verification toward those areas rather than spreading effort
evenly.

**Recommended entry point:** `/verify-handoff` against this file. It will
extract the claims in §4–§9 and bucket each as VERIFIED / CORRECTED /
UNVERIFIABLE. Everything needed is in the repo; you do not need the producing
session.

**The tmux question is CLOSED — do not re-investigate.** The producing session
appeared missing on his terminal because `tmux a` attached him to
`AirSimScope-5` (created Jul 20, a plain `bash` pane on pts/1) while the Claude
session was window `0:claude` in `WebDev-0` on pts/2. Both sessions were marked
attached, so `tmux a` picked the most-recently-used one. `tmux a -t WebDev-0`
reaches it directly. Nothing was wrong.

## 0b — This session's mandate is four things, not one

The owner scoped the next session (this one) explicitly, 2026-07-25:

> *"next session… will be dedicated to verification, cleanup, lessons learned,
> and getting me back on track."*

1. **Verification** — §2–§9 below. The reason the freeze exists. Do this first;
   the rest is worthless if a claim collapses.
2. **Cleanup** — host process hygiene, see §12. Deferred deliberately: *"The ol
   AMD6300 can handle it a little longer."* He also wants a **deeper look at
   background processes and how the server is hosted on this box**, which is
   broader than reaping strays.
3. **Lessons learned** — §2 is the raw material. The two patterns worth
   generalising are named there: *a stated remedy is narrower than its mechanism
   more often than it is wrong*, and *a later fix can silently obsolete an
   earlier fix's justification*. Both produced real false records this arc.
4. **Getting back on track** — the DDC Workbench buildout (§10, §11), which is
   the thread a small amount of browser lag interrupted.

## 1 — Exact state to pin against

| | |
|---|---|
| `main` | ✅ **NOW `ab8720b`** — PR #430 **MERGED by the owner 2026-07-25**. `package.json` **3.74.2** (lockfile agrees). `git diff --name-only 702b616 ab8720b -- ':(exclude)docs/'` is **empty**, so main's code tree is byte-identical to the CI-validated PR head — the suite was not re-run on main for that reason. A clean `rm -rf _site && npm run build` on merged main exits **0**, writes 136 files, and `flowStaticGuard` passes; built output stamps `?v=3.74.2` and shows 197 flagged education content paths against `41 × 360` gutter paths (= 14,957 total, confirming the A2 correction's arithmetic). |
| ~~Open PR~~ | ~~#430~~ — merged as `ab8720b`; branch auto-deleted on merge, along with three others from earlier merges (`fix/ddcw-idle-raf-gating`, `fix/gutter-idle-cpu`, `fix/rl-flow-static-optin`) |
| Historical (pre-merge) | `main` was `b80111e`; PR #430 head was `702b616`, draft, 11 commits, `+1228 / −215` across 24 files |
| PR CI | GitHub Actions `test` **pass**; `Workers Builds: controlsfreak` **pass** |
| Branch version | **3.74.2** (patch bump, both `package.json` and `package-lock.json`) |

⚠️ **The working tree at `/home/ehill/controlsfreak.dev` is shared with other
live sessions, and this branch is checked out in a `.claude/worktrees/` worktree.
Never `git checkout` in the shared tree.**

> ⚠️ **CORRECTED — that worktree is a TRAP, do not read it.**
> `.claude/worktrees/wf_c5ad8caf-414-5` is on branch
> `issue-202/education-flow-static` but sits at **`8e0c2f1`**, a stale
> pre-rewrite tip that is **neither an ancestor nor a descendant** of the real PR
> head `702b616` (the branch was rewritten; `8e0c2f1` and `da92029` share a
> commit message and differ in content). A session that follows the sentence
> above would verify the wrong content while believing it was reading PR #430.
> **Use the `git archive` recipe below, or `git worktree add --detach <scratch>
> 702b616`.** Also note `_site` inside any shared worktree may carry orphaned
> output from another lane's build (Eleventy never prunes) — one such phantom,
> `_site/education/zzverify-scratch.html` with an unflagged `data-flow` path, was
> present during this pass.

Read branch content with `gh pr diff 430`, or
`git fetch origin issue-202/education-flow-static && git archive origin/issue-202/education-flow-static | tar -x -C <scratch>`.

⚠️ **`npm test` cannot run as-is on this box.** `playwright.config.js`'s
webServer binds `:8000`, which the household stack holds →
`OSError: [Errno 98] Address already in use`. Use a throwaway config **at the
repo/worktree root** (Playwright resolves `require` against the config's own
directory) on a 9400+ port, and delete it after. Ports `8000`–`8006`, `8080`,
`8099` are listening; check with `ss -ltn` before picking.

⚠️ **`sudo` is unavailable to the agent.** If a step needs root, stop and hand
the owner the exact commands.

### ⚠️ Read every CPU number in this file against the host that produced it

`command.home.arpa` is an **AMD FX-6300** — a 2012 Piledriver, 6 cores (3
modules), 3.5 GHz, 27 GB RAM. Single-thread performance is a fraction of a
modern desktop or laptop core. **Every browser measurement in this arc ran
headless Chromium on that CPU**, which has three consequences the producing
session did not state:

1. **Absolute CPU figures overstate what a real visitor pays.** F4's
   "326.3 ms/s ≈ a third of a core" is a third of an *FX-6300* core. The same
   work on current client hardware is a substantially smaller share. The
   **ratio** (326.3 vs 0.3) is what travels; the absolute number is not.
2. **It strengthens the owner's decision to park the gutter work, rather than
   weakening it.** ⚠️ **CORRECTED (S6): "the worst idle cost … still held ~60 fps"
   is FALSE.** That holds for the plain-calculator control (signal-scaling, 326.3
   ms/s at ~60 fps) and for hydronic-loops (164.5 at 59.6 fps). The **actual worst
   measurement is `refrigerant-loop` as shipped: 55.5% CPU at 26 fps** — visibly
   saturated — and codebase-issues #198 records it worse still, "pinned near 98%
   either way" at **20.9–24.1 fps**. So **pages on this site DO drop frames**, and
   they are the simulators — which is precisely §11's own "on some pages the motion
   is the content" caveat. Scope the sentence to *the gutter's cost on a page with
   headroom*; the unscoped version would let a session conclude nothing on the
   site drops frames. The parking decision still stands on the owner's grounds,
   but not on this one.
3. **A CPU-throttle sweep on this box is harsher than intended.** The producing
   session proposed 4×/6× throttling to model "a 2018 jobsite laptop." 4× on an
   FX-6300 lands well below any laptop a tech would actually carry, so that test
   as specified would measure a machine nobody owns. Re-derive the multiplier
   from a target device, or drop the test.

`tests/perf-profile.mjs`'s own header already warns that CPU numbers are
machine-dependent and do not travel. This is the concrete reason. The
**layouts-per-rendered-frame** column is the load-independent detector and is the
one that survives the hardware — prefer it, and rank by fps, never by CPU.

## 2 — The self-catch register: where the producing session was wrong

Not a confession list — a **targeting guide**. Six of these were caught before
shipping; two reached a PR body and had to be corrected after.

1. **Metric was assumed to be the text-overflow risk. It is the opposite.**
   The producing session predicted metric strings would overflow; measurement
   showed **US is the worse case** on this page (zone clamps 40–120 °F →
   4.4–48.9 °C, so metric renders *shorter*, and both temperature suffixes are
   two characters). ⇒ *Distrust any directional intuition in §8.*
2. **A stated remedy was narrower than the mechanism — twice.**
   (a) "Widen the regex to `/\sdata-flow(?![\w-])/`" traded a false negative for
   a false positive (a bare `data-flow` inside another attribute's quoted
   value). (b) "Scan every `.njk` reachable from cwd" left the identical hole
   one extension away — a `.html` partial reproduces it, because the Nunjucks
   loader ignores the extension. Both were caught by the implementing lane, not
   by the orchestrator. ⇒ *Check §5's remedies against their mechanisms, not
   against their descriptions.*
3. **A false claim was passed along as verified.** The orchestrator told a lane
   the guard's comment mask was load-bearing ("12 of the 15 lessons mention
   `data-flow=` in prose"). Measured: replacing `maskComments` with the identity
   function **still builds clean**, and **0 of 145** scanned files change
   verdict. The claim was inherited from an earlier lane's code comment and
   repeated without measurement. Logged as **#203**.
4. **A PR body asserted a test result that never reproduced.** #430's Test plan
   claimed the H3 comment-mask construction went RED after a fix. It did not —
   the `//` pass is line-anchored, so only the *line-start* variant was closed.
   Corrected in `702b616`. ⇒ *§5 claim B8 is the live residue of this.*
5. **A "latent bug" was reported that does not exist.** One lane claimed
   `cool-1stage`'s unwired `y2` BO leaves `plant.actuators.y2` stale. Refuted by
   running the real engine in a Node `vm`: `fbe-engine.js` fills an undriven bool
   input with `false` before the actuator loop, so Y2 is correctly written.
   ⇒ *§7 claim D4 is the corrected version; verify the correction, not the
   original.*
6. **A false correction was nearly filed on a count.** `grep -oE 'data-flow="[a-z]+"'`
   returned 15 for `refrigerant-loop.html` against a stated 14. The 15th is
   inside an HTML comment. ⇒ **Never use a bare `grep -c` for element counts in
   this repo**; read `grep -n` output, or parse start tags.
7. **Four lane over-claims were caught during synthesis** of the workbench
   diagnosis (two proposals measured better than claimed, one worse, one
   mechanism assertion wrong in both halves). The synthesis lane caught them by
   re-deriving independently. ⇒ *Numbers in §6 survived one adversarial pass;
   they have not survived a browser.*
8. **A verification lane nearly reproduced the very defect it was fixing** — it
   drafted "pre-reorder exit 0, 137 files" for a build it had not run (it had
   replayed the pass order instead, which is a different thing). Self-caught and
   reported.

**The pattern behind #3 and #4, worth carrying:** a second fix in the same area
**silently obsoleted the first fix's stated justification**, and nobody
re-checked. Round 1 built the guard with a substring probe and correctly
documented masking as load-bearing; round 2 replaced the probe with an attribute
parser, which neutralised the prose case — and the round-1 comment survived, got
copied into the PR body, and became two false records. **When verifying a
multi-round fix, re-check whether each round invalidated an earlier round's
reasoning.**

## 3 — What NOBODY has verified

Read this before deciding where to spend effort.

1. **No browser has ever run against the DDC Workbench findings.** Every pixel
   number in §6 and §8 is **computed from CSS source** — the 171.6px threshold,
   the 58% hidden-wire figure, the badge-overflow percentages, the off-screen
   column. The producing session deliberately kept browsers off this box while a
   CPU-sensitive perf measurement was running, and never went back. **This is
   the single largest unverified surface and the highest-value place to start.**
   Two figures are explicitly flagged as boundary cases that could flip on
   sub-pixel rounding or a non-16px root font: a **170px** pitch computes to
   34.4px clearance against a 36px test (fails by 1.6px), and `cool-1stage`'s
   **175px** passes by only 3.4px.
2. **The full-page screenshot sweep for text-overflow was never run.** It is
   owed, in **both themes and both unit systems**.
   ⚠️ **CORRECTED (S19) — the gap is worse than stated, and the stated fix would
   not work.** `npm run screenshots` is a **sitemap walker**
   (`tests/screenshot-diagrams.mjs:48` — `fetch(BASE + '/sitemap.xml')`), and
   `ddc-workbench` is deliberately **absent from the sitemap**
   (`grep -c ddc-workbench _site/sitemap.xml` → **0**). So the script **never
   visits the page at all**, and adding `svg.fcu-svg` to `DIAGRAM_SELECTOR` would
   change nothing. The owed sweep needs its own driver or a hand-picked manifest,
   exactly as `tests/perf-profile.mjs` already does for the same reason.
   ✅ **Partially discharged during this pass**: the badge band was captured at
   `deviceScaleFactor 3` at 1600px and 700px. **The bug is real** — see §14.
3. **The `ddc-workbench-unit` profiler baseline still does not reproduce.** It
   flagged over-tolerance on 2 of 2 runs (4.34 and 4.67 layouts/frame against a
   recorded 2.23 whose own capture samples were 2.20 / 2.44 / 1.87). Noise
   explains the magnitude but **not the inverted ordering** against the control.
   The baseline was captured at `5b9c457`, which **is** the #426 idle-gate merge,
   so a missing gate is not the explanation. Most likely a page-state
   precondition difference. Unresolved. Do not trust a DRIFT reading on that row.
4. **Claim B8 (`#204a`) is a known-live hole that was deliberately not fixed.**
   See §5. It fails in the *silent* direction.
5. **Whether a page carrying `data-flow-static` is *entitled* to it** is not
   machine-checkable. The guard enforces presence, never entitlement. The
   sweep's semantic correctness rests on a per-page audit plus a particle-geometry
   harness — see A3.

## 4 — Claims: PR #430, the sweep

- **A1.** 15 education pages carry `[data-flow]` elements, holding **197** flow
  paths total, and all 197 carry `data-flow-static="true"` on the branch.
- **A2.** ⚠️ **CORRECTED — "19" is wrong and matches no metric.** **17** pages
  carry `[data-flow]` elements in source (15 education + `simulators/pid-tuner.html`
  + `simulators/refrigerant-loop.html`); an 18th, `hydronic-loop-builder.html`,
  creates them only at runtime. Site-wide source total is **230 elements, 211
  flagged** on the branch. Every alternative metric was tried — `grep -rl`, the
  whitespace-anchored form, `.html`-only, runtime-inclusive, mention-only — and
  **nothing reaches 19**; the figure appears in no commit body and no PR body, so
  it is handoff-only. **The number that actually matters is different again: at
  RENDER time all ~134 built pages carry `[data-flow]`**, because
  `_includes/schematic-bg.njk` injects **360** gutter flow paths into every page.
  So this PR's 197 content paths are ~0.4% of the site's flow-path population —
  which is the quantitative backing for the "gutter burns ~40% of a core on every
  page" finding. The prose-only sub-claim IS verified (`coil-selection.html:18`,
  `vfds.html:18`, both zero elements) — though site-wide the prose-only set is
  three files, not two (`_includes/layouts/page.njk:80`), and both education
  mentions sit in **CSS** block comments, which `maskComments` does strip.
  ⚠️ "The non-education ones needed no change" is true for *correctness* but
  understates a perf residual: **`simulators/pid-tuner.html` is a safe, unclaimed
  opt-in candidate** — 4 flow paths with literal static `d`, zero geometry writes,
  and it already calls `refreshPath` on every path when it mutates density
  (`:755`, `:803-804`). It is the one page still paying `getPointAtLength()` per
  particle per frame on geometry that never moves.
- **A3.** None of the 15 pages mutates a flow path's `d` without an immediate
  `FlowEngine.refreshPath()`. Claimed evidence: the only geometry writes under
  `html/education/` are `pump-control`'s `setAttribute('points')` + `cx`/`cy`
  (targeting `<polyline>`/`<circle>` in a *different* SVG), `building-pressure`'s
  needle `transform` (a `<polygon>` in a separate `<svg>`), and
  `analog-sensing`'s `x1` (page has no `data-flow`). Zero `@keyframes`, zero SMIL
  `<animate>`, no CSS `d:` property. `hydronic-loops`' `data-flow-density` writes
  do call `refreshPath` immediately (`:819-823`). A review lane additionally
  drove all 15 pages in Playwright — every button, every range to min/mid/max,
  every select option — and measured each particle against its own SVG's live
  geometry: **worst 0.20 units, 643 particles**, which is the engine's coordinate
  rounding floor. ⚠️ **Its own stated residual: it did not enumerate button
  *combinations*, cannot reach a state gated on a specific sequence, a resize
  across a breakpoint, or the fullscreen toggle.**
- **A4.** `simulators/hydronic-loop-builder.html` does **not** carry the flag and
  must never — it rewrites `d` on every `pointermove` and refreshes only on
  pointer-up.
- **A5.** `education/hydronic-loops.html`: **49.87 → 4.69** layouts per rendered
  frame (−90.6%), measured before and after on one server in one session at the
  merge base, not against the recorded baseline.
- **A6.** Liveness **byte-identical** before and after: `main 46/160 · gutter
  47/552`, on all three after-runs. This is the load-bearing check — it is what
  rules out a suspended loop reading as an optimisation. (46/160 is the correct
  partial: the other diagrams are off screen and IntersectionObserver freezes
  them.)
- **A7.** ⚠️ **UNVERIFIABLE — and this is the file's own worst instance of the
  pattern it warns about.** The pair **50.48 → 3.90** appears in **no file on the
  branch, no commit body, and no part of the PR body.** This handoff is its only
  carrier. CLAUDE.md warns "PR bodies are not a reliable debt ledger"; this is one
  step worse — not even a PR body holds it, and re-running the profiler would
  produce a third pair rather than confirm these two. **Either land the numbers in
  `tests/perf-profile.mjs` / the PR body, or strike the claim.** The first
  sentence ("no other row moved beyond its rep spread") IS in the PR body, but
  with no per-row table behind it to check.
- **A8.** `tests/perf-profile.mjs` re-based the `hydronic-loops` row **only**
  (50.97 → 4.02 layouts/frame), with three capture samples recorded and **no
  tolerance widened**. The superseded 2026-07-24 spread line is annotated, not
  overwritten.
- **A9.** `npm test`: **783 passed, 1 skipped, 0 failed**, run via a throwaway
  config on a 9400+ port (see §1). CI ran the real `npm test` and passed.
- **A10.** Version **3.74.1 → 3.74.2** in both `package.json` and
  `package-lock.json`.

## 5 — Claims: PR #430, the build guard

`flowStaticGuard` in `.eleventy.js`, new in this PR.

- **B1.** It fails the build when a `nav: education` page has a `data-flow`
  element lacking `data-flow-static="true"`, naming the file and counting **per
  element** (`1 of 3`). A review lane confirmed it fires on a **brand-new**
  education page, which is the case it exists for.
- **B2.** It rejects any value other than exactly `"true"` — `flow-engine.js:616`
  string-compares, so `"1"` / `""` / a bare attribute is a **silent
  non-opt-in**. Single-quoted `'true'` correctly passes.
- **B3.** It scans templates reachable from `process.cwd()`, splitting on
  **page vs template** rather than by extension: `.njk` always scanned; `.html`
  scanned only when *not* an 11ty page (outside `html/`, or inside
  `html/_includes/`). Rationale: taking every `.html` would drag the pages in and
  silently extend page scope to simulators, where a markup rule passes
  **vacuously** (see B6). Skips `node_modules`, `_site`, `.git`, `.claude`.
- **B4.** `html/_includes/schematic-bg.njk` is the sole exemption, keyed on
  **path relative to the scan root** (an earlier revision keyed on basename,
  which let any same-named file inherit the pass). The gutter is exempt because
  `pool.gutter` tables it unconditionally.
- **B5.** ⚠️ **CORRECTED — "both arms fire in one run" is not what was proved.**
  The gutter-move run proves the **exempt-resolution** arm plus the moved partial
  being caught as an ordinary offender — two *messages*, one arm. **The
  empty-scan arm (`.eleventy.js:467-469`) is unproven and cannot be triggered by
  any single-file move.** The PR body states this correctly; the handoff
  compressed "both messages" into "both anti-vacuity arms."
- **B6.** The guard does **not** reach simulators, deliberately.
  `hydronic-loop-builder.html` creates its flow paths from JS and contains zero
  `data-flow=` attributes, so a markup rule would pass it vacuously — *silent
  false assurance about the one page that must never carry the flag is worse than
  no rule.*
- **B7.** `flowGeometryLive: true` frontmatter is the opt-out. Nothing uses it
  today. ⚠️ **Known limitation awaiting the owner's ruling:** it is
  all-or-nothing at **page** scope for an assertion whose natural granularity is
  per-**element**. A future lesson with 20 static runs plus one re-routed path
  cannot express itself — the guard rejects an opted-out page that carries the
  flag anywhere, so the author must strip all 21 and lose the whole win.
  **Do not change this; it is the owner's call.**
- **B8. ⚠️ LIVE HOLE, deliberately left open — `codebase-issues #204(a)`.** The
  `//`-blanking pass is **line-anchored** (`line.trimStart().startsWith("//")`),
  so it never fires on a *trailing* comment. An unbalanced `/*` in one trailing
  `//` comment still pairs with a `*/` in a later one and blanks the markup
  between — including an unflagged `data-flow` path. Reproduced on head
  `702b616`: exit 0, 137 files, path shipped. **This fails in the silent
  direction** — the guard hides a real offender rather than inventing a phantom.
  Risk today: **0 of 145** scanned files are near it, and hitting it takes three
  coincidences. Not fixed because a stop was declared and because the obvious
  remedy is a trap: **`//` appears inside every `https://` URL**, so a naive
  first-`//`-to-EOL rule would blank the rest of any line carrying a link.
  Recommended remedy is a **header amendment** claiming only what the mask
  defends, shipped with #203.
- **B9. `#204(b)`.** The pass reorder also changed the **under**-masking
  direction (`/* css */ // js` on one line). Zero files affected today, and it
  fails **loudly** (a phantom offender and a build break, never a shipped path).
  Noted because the safety argument tested one direction only.
- **B10. `#203`.** The mask is **measurably inert** on this tree: identity
  function still builds clean at 136 files; 0 of 145 files change verdict. Root
  cause is a stale justification, not a wrong design — round 2's attribute parser
  neutralised the prose case a sentence about `data-flow=` used to trip. The mask
  remains live insurance against a comment containing a full example start tag;
  none exists today.
- **B11.** `codebase-issues #201` was **already fully paid** by `6c02ce1` — the
  attribute entry, both de-enumerated intros, `setPathColor` / `pulse`, and the
  profiler re-baseline note. Only the disposition marker was missing, and its
  absence is what let a later lane read a closed issue as open and write a false
  deviation. The marker is added on this branch.

## 6 — Claims: DDC Workbench layout diagnosis

⚠️ **All of §6 is arithmetic from CSS source. No browser ran.** Owner review
material for these findings, including the three control sequences in reader
form, is published at
`https://claude.ai/code/artifact/14f4d864-4f54-4699-bea6-13394e703907`
(supplementary — every claim is restated here so this file stands alone).
Subject: `html/simulators/ddc-workbench.html`, hidden
(`eleventyExcludeFromCollections` + `noindex` at L5–L6), `FCU_PROGRAMS` at
`:1740`.

- **C1.** `wirePath` (`html/scripts/fbe-editor.js:279-290`) is a 12-line
  two-point function with **no obstacle avoidance and no waypoint support**. It
  takes the clean single-elbow forward route only when
  `b.x >= a.x + 2 * stub`, `stub = 18`.
- **C2.** Pin dots sit at `blockX + 135.8` (out) and `blockX + 0.2` (in), so the
  test reduces to **column pitch ≥ 171.6px**. (`.fbe-block` is `8.5rem` = 136px,
  matching `BLOCK_W = 136` at `:90`.)
- **C3.** Below **153.8px** pitch, both vertical legs of the fallback route land
  *inside* the source and destination blocks.
- **C4.** `cool-2stage` / `cool-2stage-fanon` pitches: **150, 150, 150, 145,
  145** — below both thresholds. `cool-1stage`: **175** throughout, clearing by
  3.4px. This asymmetry is the whole reason the complaint lands on the two-stage
  sheets.
- **C5.** In `cool-2stage`, **18 of 24** wires take the backward branch
  (including `y1on → y2on`, a same-column edge); the remaining 6 take the forward
  branch but every one spans an intervening column, and the forward route pins
  its vertical leg to `(a.x + b.x) / 2` — for an **even** span that is exactly
  68px into the intervening column, the horizontal centre of a 136px block, at
  any pitch. **Zero wires render as a clean forward elbow.**
- **C6.** `cool-2stage`: **2,205px** hidden behind non-endpoint blocks across 33
  wire/block pairs, plus 461px inside its own endpoints = **58.1% of 4,590px** of
  drawn wire invisible. `cool-2stage-fanon`: 2,370px / 37 pairs.
  `cool-1stage`: 200px / 2 pairs.
- **C7.** Wire crossings: **8 / 8 / 0**. ⇒ Congestion is **not** the defect;
  occlusion is. A fix aimed at crossings misses.
- **C8.** Blocks paint **over** wires: `renderAll` appends the wire `<svg>`
  (`:153-159`) then the block `<div>`s (`:161`), neither carrying `z-index`, both
  `position: absolute` in one stacking context. And `.fbe-wire-sel`
  (`styles.css:4219`) only recolours — **clicking a wire does not lift it**, so
  the one affordance for tracing a wire does not defeat the occlusion.
- **C9.** `.fbe-canvas-inner` is a fixed **900px**. Six 136px blocks with the
  last right edge inside 900 caps pitch at **152.8px — 1.0px below the
  buried-wire cliff.** Non-uniform spacing does not rescue it: 816px of block
  plus five 17.8px minimum gutters is 905px.
- **C10.** The longest dependency chain is **7 nodes**
  (`cooling-setpoint → y1on → y2on → gt2 → sr2 → and1 → y2`), so the graph needs
  7 columns and has 6 — which is why `y1on → y2on` is a same-column edge. Seven
  columns of block alone is **952px**; it does not fit at any pitch.
- **C11.** Visible canvas is **717.6px** at the 1000px gate and **837.6px** at a
  ≥1184px viewport, against an 896px sheet ⇒ **58–178px off-screen at every
  supported width**, and that is the Y1 / Y2 / fan-enable output column the
  page's own prose at `:738-743` sends the reader to.
- **C12. ⚠️ CORRECTED — HIGH. Three of seven sub-claims are wrong, and acting on
  this as written would ship a threshold change believing all seven sheets were
  clean.** The bug IS live on the public page and the five named sheets do have
  sub-threshold hops. But:
  - ❌ **"20px fixes the public page completely" is FALSE.** `proof` stays at
    **2/7 forward at 20px** — and at 16px and at 14px. Its hops are 145, 142,
    142, 149 and 140px; the threshold would have to fall to **≤4.4px**. So 20px
    fixes **four** of the five sheets.
  - ❌ **`proof` is probably not a defect at all.** `function-block-editor.html:287-290`
    documents its layout as deliberate — the chain alternates top/bottom rows so
    "every link gets a long visible vertical run instead of a near-zero horizontal
    stub" — and it measures **0px hidden, 1 crossing**. It is the one sheet
    already designed around the fallback route.
  - ❌ **"does nothing for the workbench" is too strong.** At 20px the branch
    split is unchanged (6/24), but the fallback **stub shortens**, moving every
    leg into the column gutter: `cool-2stage` occlusion drops **2204.5 → 1481px**
    (33 → 16 pairs), `fanon` 2369 → 1622px, while crossings rise **8 → 18**. **A
    shared-threshold change is NOT workbench-neutral and needs a visual check
    there too.**
  - ⚠️ The 14px crossing figure is **13** (`cool-2stage`) and **15** (`fanon`),
    not 14 — and at 14px occlusion *improves* (2204 → 1312px, 33 → 11 pairs), so
    "worse" holds only on the crossings metric that **C7 itself declares is not
    the defect.** That tension is worth resolving before ruling on decision #4.
  - ✅ Better than claimed in one respect: 36 → 20px does not merely add "zero new
    crossings" — it **removes 8**, as tstat-cool and tstat-heat each go 4 → 0.
  - 📐 **Record the crossing convention next to any crossing number.** These are
    *intersection points*, not wire pairs; the two conventions coincide at 36px
    and 14px, which is exactly why a correct figure looks wrong at 20px.
- **C13.** The palette's own drop grid uses a **150px x-pitch**
  (`fbe-editor.js:136-139`), so a visitor building a sheet by hand gets the
  buried-wire shape by default.
- **C14.** **Nothing anywhere parses `FCU_PROGRAMS`.** `tests/fbe-engine.spec.js:576-582`
  bounds-checks the *sibling* page's `EXAMPLES`, regex-extracted from
  `function-block-editor.html`. `ddc-workbench` is absent from `tests/pages.js`
  and from `sim-desktop-only.spec.js`. ⇒ Coordinates may be re-placed with no
  test to update, and no safety net either.
- **C15. Recommended remedy, for the owner to rule on.** Hand-place coordinates
  + a ~4-line `canvasSize: {w, h}` option on `createEditor` + a **geometry spec**
  (parse both `FCU_PROGRAMS` and the sibling's `EXAMPLES`, replicate `wirePath`,
  assert every wire takes the forward branch and no segment passes behind a
  non-endpoint block). **Not** an auto-layout: a 40-restart hill-climb produced a
  numerically decent sheet by squeezing blocks to a 17.5px gap and leaving a wire
  on the backward branch — an unsupervised optimizer produces exactly the
  auto-generated-upload look being complained about. Owner sub-decision: **7
  columns @ 175px in a 1196px canvas** (0px hidden, 3 crossings, scrolls
  358–478px in normal flow, fits fullscreen) vs **6 columns @ 152px** in the
  existing canvas (needs the shared router threshold ≤16px, still ~269px hidden).
  The producing session recommends 7-column. **Undecided.**

## 7 — Claims: the three FCU control programs

Owner is a working BMS programmer and will verify these himself; the value of
checking them here is catching an arithmetic or semantic error before he reads
them.

- **D1.** With shipped constants (SP 72, deadband 3, sep 2): `y1on` = **75.0 °F**,
  `y2on` = **77.0 °F**. Stage 1 makes at 75.0, breaks at 72.0 (**3.0 °F**
  differential). Stage 2 makes at 77.0, breaks at `y1on` = 75.0 — **the stage-1
  MAKE point, not the setpoint** (**2.0 °F** differential). Comparators are bare
  strict `>` / `<` with no hysteresis; all differential comes from the SR pair,
  which is set-dominant. Strict comparison makes the band edges dead, so there is
  no boundary chatter.
- **D2.** `or1` and `and1` are **provably redundant** at the shipped constants.
  Verified by running the real engine over a 70 → 82 → 70 °F sweep at 0.25 °F
  steps (98 ticks): `or1.Q ≡ sr1.Q` and `and1.Q ≡ sr2.Q` with **zero
  mismatches**; the state `(sr1 false, sr2 true)` is **unreachable**. They state
  the Y2-implies-Y1 interlock and would earn their keep only if `sep` went to zero
  or negative. Removing them takes the graph 7 → 6 ranks — still 994px, so it
  does not rescue the canvas.
- **D3.** `cool-2stage-fanon` differs from `cool-2stage` by **exactly one block
  and one wire**: all 20 shared blocks identical in id / type / x / y / params;
  `fanon` (a `bi` hard-set true) added at (615, 380); `or1.Q → fan-enable.IN`
  replaced by `fanon.O → fan-enable.IN`.
- **D4.** `cool-1stage`'s unwired `y2` BO is **load-bearing, not disposable** —
  `loadProgram` (`:962-974`) never resets `plant.actuators`, so the orphan block
  is what forces stage 2 off after switching from `cool-2stage`. (An earlier lane
  claimed the opposite — that the binding leaves Y2 stale. **Refuted** by running
  the engine: `fbe-engine.js:463` fills an undriven bool input with `false` and
  the tick runs before the actuator loop.)
- **D5.** The comment at `:1730-1739` heads all three programs but is accurate
  for **`cool-2stage` only** — `cool-1stage` has one latch, no OR, no AND and no
  Y2 logic, and "fan enabled on the cooling call" is false in `fanon`.
- **D6. ⚠️ CORRECTED — HIGH. First half verified; SECOND HALF IS FALSE.** The
  `deadband = 0` analysis is exactly right. But a **negative** deadband does
  **not** hold Y1 on permanently — it **erases the hysteresis entirely** and turns
  stage 1 into a bare `temp > SP + deadband` comparator. At `deadband = -2` the
  make point is 70 and the break point 72, so set-dominance forces Y1 ON *inside
  the 70–72 overlap* — but **below 70, `gt1` is false while `lt1` is still true,
  so the latch resets and Y1 goes OFF.** Measured with the real engine in a Node
  `vm`: Y1 off at 60 / 50 / 40 / 0 / **−50 °F**; **0 mismatches over 20,000 random
  ticks** against a bare comparator; 399/400 dither flips at the make point; Y1
  OFF on 3,273 of 5,000 random-walk ticks. Restricting to the reachable sensor
  domain does not rescue it either — `FCU_POINTS` clamps `space-temp` to a 70
  minimum and `sr1` already resets at exactly 70.
  **The real failure mode is the `deadband = 0` case relocated: zero hysteresis
  and chatter at tick rate, not a stuck output.** That is also the *better*
  teaching hook — it shows set-dominance in the overlap band converting hysteresis
  into a bare threshold. Corollary the brief misses: a negative `deadband` also
  breaks the `or1`/`and1` redundancy (see D2), and at exactly `t = SP + deadband`
  the "provably redundant" `or1` actively **masks** the `sr1` reset.
- **D7.** `sep` and `hundred` are **not** in `FCU_POINTS` (`:1720-1728`) while
  `cooling-setpoint` and `deadband` are — so two of four tuning numbers appear on
  the IO chip strip and two are reachable only by selecting a block.
- **D8.** No minimum on-time, minimum off-time, or interstage delay on any of the
  three sheets. `ton` / `tof` are in the catalog and used by none of them.
- **D9.** `fan-speed` is a `const 100` straight to the AO on all three. In
  `cool-1stage` the AO reads **100% while the fan is stopped** — the Unit tab
  prints the raw AO (`:1396`).
- **D10.** `fanon` renders as a **click-to-toggle** and is not an FCU point, so a
  reader can drop fan-enable while Y1/Y2 stay commanded — landing on the unit
  graphic's own alarm at `:1343`.

## 8 — Claims: text outside boxes

⚠️ **Arithmetic only. No browser ran. This is the owner's originally reported
bug and the confirming sweep is still owed.**

- **E1.** `DAT · DISCHARGE` (`:566`): 15 chars × 6.8 units ≈ **102 units** of ink
  in a **90-unit** box ⇒ ~6 units past *each* edge, ~13% over.
- **E2.** `EAT · ENTERING` (`:558`): ≈ **95.2 units** in an **86-unit** box ⇒
  ~4.6 past each edge, ~11% over.
- **E3.** `ΔT ACROSS COIL` (`:562`): ≈ 95.2 in **96** — fits by ~0.4 units per
  side. ⚠️ `Δ` (U+0394) is **outside the `unicode-range` on all four IBM Plex
  Mono `@font-face` rules**, so that one glyph renders from the platform's
  generic monospace ⇒ **this caption's verdict is machine-dependent.**
- **E4.** SVG `<text>` does not wrap and there is **no `clip-path`,
  `textLength`, or `overflow`** anywhere in the file ⇒ overflow always paints
  outside the frame, at every rendered size, invariant to the viewBox scale.
- **E5.** `.fcu-pt-val { font-size: 14px }` (`:34`) beats a presentation
  attribute in the cascade, so the authored `font-size="13"` on the EAT / ΔT /
  DAT readouts and `"12"` on the zone setpoint are **dead** — everything renders
  ~8% larger than authored. The page already documents this exact species for
  `text-anchor` at `:47-51`.
- **E6. Correctness bug.** `FCU_POINTS` hard-codes `unit: '°F'` (`:1721-1728`)
  and `updateChips` (`:911-935`) reads the raw canonical Fahrenheit value with no
  `Units` call ⇒ **with the site in metric, the IO chip strip shows Fahrenheit
  numbers labelled °F.**
- **E7.** Metric is **not** the length-growth vector on this page (see §2 item 1).
  The real ones are the OA slider at its 110 max, the load slider at
  `10000 Btu/h`, the `Force sensor` → `Release` label swap, and above all the
  **unbounded** const values a user can type into the FBE inspector — a path a
  sweep that only loads the three sample programs will never see.

## 9 — Claims already merged to `main` (`db88b7a`)

Lower priority — already shipped, docs-only, and reversible. Verify if effort
allows.

- **F1.** `db88b7a` records a `/verify-handoff` pass over the previous brief: 47
  claims, 38 verified, 5 corrected, 4 unverifiable. The five corrections and
  their shared failure mode (a number or location carried forward from an ad-hoc
  measurement without re-derivation) are in the commit body.
- **F2.** The `<symbol>`/`<use>` gutter architecture holds in every particular,
  including the one the draft flagged UNVERIFIED: **the scroll draw-in animates
  through `<use>`, it does not snap.** Method matters — `document.getAnimations()`
  reports **nothing** and `useEl.shadowRoot` is `null`, so an API check reads as
  a confident false negative; it was settled by **pixel differencing** (four
  distinct intermediate frames, none byte-equal to either endpoint reference).
- **F3.** The gutter holds **1,610 static markup nodes** (counted with JS
  disabled) plus **624 injected at runtime** = **2,234 live**.
- **F4.** Post-arc gutter cost, same page and same run:
  `tools/signal-scaling.html` normal **326.3 ms/s**, under
  `prefers-reduced-motion` **0.3 ms/s**, both at ~60 fps. ⇒ The gutter still
  costs ~a third of a core on every wide-viewport page, and #427's 15× layout cut
  bought only ~9 percentage points of CPU because the remaining cost is not
  layout. Also: 1,610 static nodes render for ~0.3 ms/s, so **node count is not
  the idle cost** — going static is, and `<use>` is an authoring/load-time win.
- **F5.** The `ddc-workbench-unit` profiler baseline anomaly — see §3 item 3.
  **Unresolved.**

## 10 — Owner decisions pending (do not pre-empt any of these)

1. ~~**Merge or close PR #430**~~ — ✅ **MERGED 2026-07-25** as `ab8720b`, after
   the verification pass. Post-merge cleanup done: strays reaped (§12), worktrees
   pruned, `_site` rebuilt clean, and the owed `codebase-issues` entries paid
   (§11).
2. **`flowGeometryLive` granularity** — page-scope as built, or per-element? (B7)
3. **`#204` header amendment** — ride along on #430, or ship separately? (B8)
4. **Wiresheet layout: 7-column vs 6-column.** (C15)
5. **Eight program design questions** — the artifact's §7. In the producing
   session's order of interest: **D1** (the setpoint is the cut-out, not the band
   centre, while the chip reads "Cool SP" — the convention a reader absorbs
   without noticing) and **D2** (the two provably dead gate blocks). Then the
   `dat` low-limit hook, whether the third sheet earns its place, guarding
   `deadband`, surfacing `sep`, and whether fan speed should follow the stage.

## 11 — Parked, not forgotten

- **The static-print gutter background is parked.** The owner's read, 2026-07-25:
  nobody he knows has issues, battery drain is acceptable from his own use, 60 fps
  on real hardware — *"I think I may be pushing this too hard."* A **motion / eco
  toggle** (he prefers "eco" framing over "low performance") is deferred to a
  post-workbench housekeeping pass. ⚠️ **Scope question to settle before it is
  built:** on some pages the motion *is* the content — kill motion on
  `refrigerant-loop` or the workbench and the thing being taught stops.
- **The DDC Workbench buildout is the live thread** the owner was interrupted
  from when a small amount of lag sent the session down the perf path.
- ✅ **PAID 2026-07-25, once #430 merged.** C12 landed as `codebase-issues`
  **#205** (with the three verification corrections folded in — 20px fixes four
  of five sheets not five, `proof` is deliberate, and a threshold change is not
  workbench-neutral) and C13 as **#206**. The same pass logged the defects
  adversarial verification turned up: **#207** (the guard's symlink blind spot
  and its `cwd` scan scope), **#208** (rem/px coupling — the 171.6px threshold
  is not a constant and `cool-1stage` breaks at enlarged text), **#209**
  (actuator points have no relinquish path — **reframed by the owner as the
  EBO/BACnet failure it is, and its design decided 2026-07-25**: three real
  slots, 8 / 16 / `Relinquish_Default`, with a null checkbox and a "points not
  following program" window), **#215** (unbounded const inputs, split out of
  #209), **#210** (the stale HAND-override comment), **#211** (the badge
  caption overflow — the owner's original bug — plus the dead presentation
  font-sizes), **#212** (`updateChips` ignores units), **#213** (`pid-tuner`'s
  perf residual) and **#214** (the untrustworthy profiler baseline). Two
  existing entries were amended in place where verification disproved a number:
  **#203**'s "145 scanned files" (the guard scans **52**) and **#202**'s
  Resolution note (`12 of 15` holds only for `data-flow=` *with* the equals
  sign; the pasted command gives 15 of 15).

## 12 — Cleanup: host process hygiene (mandate item 2) — ✅ DONE 2026-07-25

> **All nine were reaped 2026-07-25.** Every stray port (`8761`, `8768`, `8793`,
> `8794`, `8931`, `9137`, `9402`, `9500`, `41573`) released; the household stack
> verified intact afterwards (80, 443, 3000, 8000–8006, 8080, 8123, 9090 still
> listening, all eight containers healthy, hub answering 200). Orphaned
> `.claude/worktrees/` worktrees from this arc were removed, and the stale
> pre-rewrite branch archived as `archive/issue-202-pre-rewrite` — its unique
> content is only superseded drafts of comments (verified), but the ref is kept
> rather than discarded.
>
> ⚠️ **One correction to item 3 below, learned by doing it wrong.**
> `pkill -f 'http\.server'` **matched the invoking shell's own command line**
> (which carried the pattern as an argument) and killed it mid-run. The wrapper
> trap cuts both ways: `-f` matches *any* process whose cmdline contains the
> string, including the process doing the killing. **Collect PIDs first and kill
> by PID**, filtered to real interpreters:
> `pgrep -a -f 'http\.server|eleventy' | awk '$2 ~ /(^|\/)(python3|node|npm)$/ {print $1}'`
> then `kill -TERM` those, escalating to `-KILL` only for survivors.
>
> The broader ask at the end of this section — *what launches these and why
> nothing reaps them* — is **still open**, and is the strongest argument for the
> quadlet pattern in the `~/caddy` preview brief.

**Nine stale servers were running, the oldest for 8+ days.** They were leftovers
from previous Claude sessions on this box, not services. PIDs change — **match on
the pattern, not the numbers**:

```
pgrep -af 'http\.server|eleventy'
```

Ports seen 2026-07-25: `8761`, `8768`, `8793`, `8794`, `8931`, `9137`, `9402`,
`9500`, plus an `eleventy --serve` on `41573`. Ages ranged 14h to **8d 14h**.

Three things to know before reaping them:

1. **`8794` and `9500` are bound to `0.0.0.0`.** They have been serving `_site`
   builds out of scratch worktrees under `.claude/` to the whole LAN for a
   day-plus. Nothing sensitive in a static build, but it is not intended, and it
   is the strongest argument for fixing the pattern rather than just the
   instances.
2. **This is the root cause of the recurring port-collision friction.** It is why
   `npm test` cannot bind `:8000` and why every lane in this arc had to probe
   `ss -ltn` before choosing a port. The collisions are self-inflicted
   accumulation, not a crowded box.
3. ⚠️ **Kill the server, not the wrapper.** The producing session got this wrong
   in front of the owner: the PIDs from a `ps | grep claude` listing are the
   `/bin/bash -c … eval '…'` wrappers. Killing those leaves the real `python3` /
   `node` children alive and reparented to init. Target the `http.server` /
   `eleventy` processes themselves, then confirm `pgrep -af` comes back empty.

**Do not blind-kill by port range.** Ports `8000`–`8006`, `8080`, `8099`,
`8123`, `9090` are the household stack (rootless podman quadlets, grafana,
clickhouse, cockpit) — see `~/CLAUDE.md`. A `pgrep` on `http.server|eleventy`
does not match them, which is why that is the safe discriminator.

**Owner's broader ask, larger than reaping strays:** *"we can take a deeper look
at background processes and how we host the server on this box."* Worth treating
as its own scoped piece of work rather than folding into the cleanup — the
question is what launches these, why nothing reaps them, and whether the
`nohup … &` idiom the lanes use should be replaced with something that dies with
its session.

## 13 — New idea from the owner: local preview on the service dash

> *"I may want to add a local preview to my custom service dash so it's more
> streamlined."*

The dash is the **home hub / launcher page at `~/caddy/`** (http://command.home.arpa),
which has **its own CLAUDE.md** — so this is a cross-project change and the hub
repo's conventions govern, not this one's. Scoped but not started; no design
decisions made.

Two things worth raising with him before building anything, both learned the hard
way this session:

- **A long-lived preview server is the exact thing §12 is cleaning up.** A hub
  tile pointing at an ad-hoc `python3 -m http.server` recreates the stray-process
  problem by design. The rootless-podman-quadlet pattern that every other hub
  service uses (`~/.config/containers/systemd/*.container`, linger enabled, starts
  at boot) is the house answer, and it makes the preview reapable and restartable
  instead of orphaned.
- **The `~/CLAUDE.md` wording is RESOLVED — there was never a contradiction.** The
  producing session read "**Not run locally** — dev only… don't expect a local
  service or hub tile" as blocking a preview tile. The owner corrected that,
  2026-07-25: *"I run locally as 'hosted locally for public use'. The local server
  would still be dev only in the way it would only be used for dev work
  (previewing/testing/etc)."* The note meant *no household-facing service*; a dev
  preview was always fine. `~/CLAUDE.md` is updated — **that file is not
  version-controlled, so there is no commit to cite**: its subproject line now
  reads "not hosted locally for public use", and a new **two-senses convention**
  at the bottom separates *hosted locally for public use* (quadlet, a port in
  *What's running*, hub tile, linger, Caddy-proxied) from *run locally for dev*
  (ephemeral, scratch port, absent from the table), and states that giving a dev
  preview a hub tile does **not** promote it or create an uptime expectation. That
  convention also carries §12's reaping guidance, since it is where a future
  session will look before starting a long-lived server.
- **The one real design question left:** does the tile serve a **built `_site`**
  (static, cheap, stale until rebuilt) or a **live `eleventy --serve`** (always
  fresh, but a permanently running node process — exactly how the 2-day-old stray
  on `:41573` came to exist)? If the answer is "live", the quadlet pattern is what
  keeps it reapable.

## 14 — Verification results (2026-07-25)

Six lanes over `main` @ `b80111e` and PR head `702b616`, each followed by an
adversarial refutation stage. **82 claims: 45 VERIFIED · 7 CORRECTED · 25
PARTIAL · 5 UNVERIFIABLE.** Of **31 corrections, 26 held and 7 were refuted.**

### 14.1 — The refutation stage earned its place: 7 corrections were wrong

**E1–E4 (all four refuted).** A lane ran a browser against §8 and reported the
arithmetic as substantially overstated (DAT 93.82 units, not 102; EAT "does not
read as broken"). The refutation found the lane had measured under **headless
Chromium's default `hinting=full`**, which rounds the web font's glyph advance to
an integer CSS pixel. This box's fontconfig
(`/etc/fonts/conf.d/10-hinting-slight.conf`) selects `hintslight` — which headless
overrides and **a headed browser does not**. Under `--font-render-hinting=slight`,
`DAT · DISCHARGE` measures **101.87–101.98 units at every viewport from 400 to
1600px**, and forcing integer SVG scale under the lane's own flags gives exactly
**102.000 / 6.00 per edge / 13.33%**. **§8's numbers are right to three decimals,
for all three captions.** E4's "invariant to viewBox scale" is correct *as
geometry*; the variation the lane saw is non-monotonic rasterizer noise (97.90 at
one scale, *below* the geometric 102), not a desktop-vs-phone gradient. Design
any fix against **~102 units as a FLOOR**, and verify under both render paths.

**✅ THE OWED SWEEP IS DONE AND THE BUG IS REAL.** Captures at
`deviceScaleFactor 3`: at 1600px all three captions' first and last glyphs sit
**on** the frame stroke; at 700px **all three plainly break their frames** —
EAT's leading `E` and DAT's leading `D` are outside the left border. Artifacts:
`scratchpad/badges-vw{1600,700}.png`, `scratchpad/refute-etext/badges-hint-{full,slight}.png`.

**F3 (refuted).** The residual 72 nodes are **not** pulses in flight — they are 72
`<g class="flow-particles">` layers, one per gutter SVG holding ≥1 `[data-flow]`
element (`ensureParticleLayer()` at `flow-engine.js:593` runs *before* the
`if (!count)` return at `:637`). 552 + 72 = 624 exactly, deterministic structure.
Two independent kills: pulses come in bundles of 5 and 72 is not a multiple of 5.
**F3 stands as written**, and the live count is **≥ 2,234 drifting upward**, not
"about 2,230" — the lane's rewrite pointed the error the wrong way.

**F4 (refuted on both limbs).** `#426` touches only `ddc-workbench.html` and
`#429` only `refrigerant-loop.html`, so neither can move `signal-scaling`'s
number — the whole-arc delta on that page **is** #427's delta. And the 326.3/0.3
pair is not unrecorded: `perf-profile.mjs:493` pins the gap as
`deltaTask: -321.1`, re-derivable in one command.

**S18 (refuted).** Restates a limitation §3 exists to disclose. Should be
VERIFIED. The refuter went further: `wirePath()` works on pin centres, so C2's
offsets imply `135.8 − 0.2 + 36 = 171.6px` — the brief's own separately-stated
figure, which **corroborates** C2.

### 14.2 — Corrections that held (beyond those applied inline)

- **A3 (MEDIUM).** Conclusion **confirmed** — `setAttribute('d')` appears **zero
  times** anywhere under `html/education/`, and SMIL / CSS `d:` / education
  `@keyframes` all return empty on positive searches. But the inventory presented
  as exhaustive **misses six writes**: `pump-control.html:813` and `vfds.html:931`
  (`transform` on a `<g>` of fan blades), `air-handlers.html:640`,
  `hydronic-loops.html:679-681` (`style.transform` on `<rect>`), and
  `analog-sensing.html:302-303,305` (`cx`, `x2` — the brief listed only `x1`). All
  harmless. **The information was already in the repo** —
  `hydronic-loops.html:222` documents its own case in a source comment — which is
  a recurrence of self-catch #3's pattern, not a new one.
- **A6 (LOW).** The pair `46/160 · 47/552` and the IntersectionObserver rationale
  are fully verified. **"On all three after-runs" is supported nowhere** — every
  artifact states liveness once, as before-vs-after. Strike as unrecorded.
- **B2 (LOW).** `flow-engine.js:616` is correct on **main**; on the branch the
  string compare is at **`:625`** (this PR adds 15 lines above it).
- **C5 (LOW).** "Exactly 68px into the intervening column **at any pitch**" holds
  for 5 of the 6 forward wires; the sixth (`hundred.O → fan-speed.IN`) spans four
  non-uniform hops and lands at **63.0px**. Cause is pitch **non-uniformity**, not
  hop count. Still buried — the substantive point survives.
- **C8 (LOW).** `.fbe-wire-sel` is `styles.css:`**`4220`**; `:4219` is
  `.fbe-wire-hit`. Everything else exact.
- **C11 (LOW).** Both canvas widths and the 58–178px range are **exact**. The
  plateau begins at a **1120px** layout viewport, not 1184 (`main`'s `max-width:
  1120px` is border-box, so 1184 = 1120 + 64 is a content-box misreading). Scope:
  **fullscreen is NOT clipped at any supported width** — `onFullscreenChange`
  (`fbe-editor.js:689-701`) grows `INNER_W`, and the fullscreen canvas is
  ~958px even at the 1000px gate.
- **D2 (MEDIUM).** Redundancy confirmed. But "earn their keep only if `sep` went
  to zero or negative" is wrong twice: at **`sep = 0` they are still fully
  redundant** (0 mismatches / 50,000 ticks) — only `sep < 0` breaks it; and a
  **negative `deadband`** also breaks it at the single point `t = SP + deadband`.
  Correct condition: **`deadband >= 0 AND sep >= 0`**. The 7 → 6 rank figure holds
  **only if the removal rewires** `sr1.Q → y1.IN`/`fan-enable.IN` and
  `sr2.Q → y2.IN`; deleting without rewiring gives 5.
- **D4 (LOW).** Both halves hold. The undriven-bool default is
  `fbe-engine.js:`**`465`**, not `:463`.
- **D5 (LOW).** The comment occupies **`:1731-1739`** (`:1730` is blank).
  Substance fully correct. Note only `:1733` is accurate for all three programs.
- **D9 (MEDIUM).** Substance holds, scoping is wrong in a way that would send a
  fix to the wrong place: **`cool-2stage` does this identically** (its fan-enable
  also comes off `or1.Q`) — the one program where it *cannot* happen is
  `cool-2stage-fanon`. And `:1396` is the **HAND slider's value label**
  (`#fcu-fan-sval`); the unit graphic and point row gate on `fanOn` and print
  `'OFF'` (`:1309-1311`).
- **F2 (MEDIUM).** Holds, and matters: **nothing in the repo implements
  `<symbol>`/`<use>` for the gutter** — `schematic-bg.njk:10` documents the
  opposite. F2 is a claim about an **unshipped spike** for the parked static-print
  background. As written it reads as a property of the shipped gutter.
  (Sub-nit: `<use href>` *does* appear elsewhere — 18 in `refrigerant-loop.html` —
  so don't paste "nothing in the repo uses `<use>`".)
- **S3 (LOW).** "Must live at the repo root" is over-strong: an out-of-tree config
  works if `require`, `testDir` **and** `webServer.cwd` are absolute.
- **S8 / S9 (LOW).** The script's actual claim is narrower than the brief's:
  `perf-profile.mjs:771` names the **Δ-control column** as "the only
  machine-portable number in the report". The header argues layouts/frame is
  independent of **load on one machine**, never of the machine. The advice is fine;
  don't attribute it to the script.
- **S12 (LOW).** The `.html`-partial hole is currently **prophylactic** —
  `find html/_includes -name '*.html'` is empty; all 11 scanned templates are
  `.njk`.
- **S20 (MEDIUM).** The 4.34 / 4.67 observations live **only in this file** — not
  even in `db88b7a`'s body. And `perf-profile.mjs`'s own protocol for a flagging
  row ("widen the floor and add the observation here") **was applied to
  `hydronic-loops` and not to `ddc-workbench-unit`**, so the next reader of that
  file finds an untrustworthy baseline with no note attached.
- **S7 (UNVERIFIABLE, material addition).** `perf-profile.mjs:207-213` already
  **refuses** CPU throttling on stronger grounds than the multiplier: Chromium's
  `Emulation.setCPUThrottlingRate` "does not slow tasks down; it idles the
  scheduler BETWEEN them … throttling can make a page look CHEAPER, the same sign
  error as the saturation inversion." So "re-derive the multiplier" must first
  overcome a documented objection about the metric's **direction**.

### 14.3 — Real defects found that this file does not claim

1. **⚠️ `flowStaticGuard` is blind to symlinks — SILENT direction, same as
   #204(a).** `walkTemplates` uses `entry.isDirectory()` / `entry.isFile()`
   (`.eleventy.js:440-446`), which do not follow symlinks, so a symlinked template
   **file** and a symlinked **directory** are both skipped. Proved by construction
   at `702b616`: a root-level `zzlinkfile.njk` symlinked outside the tree holding
   one unflagged `data-flow` path, included by a `nav: education` page → **build
   exit 0, 137 files, no offender, unflagged path shipped.** This is the same hole
   the guard's own header calls out as the reason the scan root is `process.cwd()`
   — defeated by a symlink instead of by a directory or an extension. The comment
   at `:441-444` frames the symlink skip purely as a benefit and never as a
   coverage gap. **Worth a header sentence and an entry.**
2. **Root-font fragility invalidates C2's threshold as a constant, and breaks the
   one sheet C4 calls clean.** Everything about the block is rem-sized while every
   coordinate is a px literal, so pin separation = `8.6·F − 2` and the forward
   threshold = **`8.6·F + 34`** (171.6 only at F=16). **`cool-1stage`'s 175px pitch
   fails as soon as F ≥ 16.40px.** MEASURED: forcing the root font, `cool-1stage`
   goes from **0/11 fallback wires at 16px to 7/11 at 20px** — and Chrome's
   built-in "Large" setting *is* 20px while the site sets no `html` font-size. A
   user with enlarged text sees the buried-wire shape on the sheet the brief calls
   clean. C15's geometry spec should assert the **relationship**, not 171.6, and
   derive `BLOCK_W` from a measured rect (`fbe-editor.js:90`'s literal 136 also
   under-restricts the drag clamp at `:526` at any non-16px root).
3. **Actuator freeze on block delete.** `ddc-workbench.html:869-870` is
   `blk = byId[p.id]; if (!blk) continue;` — no else-branch. Any deleted actuator
   IO block **strands its plant actuator at its last commanded value**, and
   `fbe-editor.js:498` puts a "Delete block" button in the inspector. Proved:
   load `cool-2stage` at 80 °F, switch to `cool-1stage`, delete the unwired Y2
   block → `plant.actuators.y2` frozen `true` for the session, with the unit
   graphic showing a compressor the program is no longer commanding. This is the
   general form of the mechanism **D4 depends on** — D4 is load-bearing and
   nothing defends it.
4. **Stale/false code comment at `ddc-workbench.html:1336-1340`,** falsified by
   D10's own measurement: it says fan-off with a stage energized is "**only
   reachable by a HAND override**". Measured — loading `cool-2stage-fanon` and
   toggling the `fanon` bi to false fires the `:1343` alarm **in AUTO**, no
   override. The comment predates the `fanon` program.
5. **Every const is editable through an unbounded `<input type="number">`**
   (`fbe-editor.js:479-494` — no `min`/`max`/`step`), and `hundred` feeds the
   fan-speed AO with no clamp, so `1e9` or `−500` goes straight into
   `plant.actuators['fan-speed']` (`:871`). This is E7's "unbounded const values"
   made concrete, and it is the same path D6 uses.
6. **`#203`'s "145 scanned files" conflates two populations.** The guard scans
   **52** files (41 `nav: education` pages + 11 `.njk` templates, one exempt) —
   measured by instrumenting the config (`templatesScanned = 11`). 145 is the full
   `.html`+`.njk` population under `html/`, i.e. the hand-run differential's
   scope. Both give 0 verdict changes so the conclusion is untouched, **but this is
   a file whose whole point is that a claim about the guard must not outrun the
   guard**, and it overstates the guard's reach by ~2.8×.
7. **`#202`'s Resolution note (`codebase-issues.md:7416-7418`)** says a naive
   `grep -c data-flow` over-counts on "12 of the 15". For the command **as
   written** (no `=`) it is **15 of 15**; 12 is reproducible only for
   `data-flow=`. Number right, pasted command looser than the number — the same
   defect shape #204 flags for the guard header's own pasted grep.
8. **The guard scans all of `cwd`, skipping only four literal dir names**
   (`.eleventy.js:422`). `npx eleventy --output=_site_probe` makes it fail with
   ~130 phantom offenders (360 gutter elements per built page). Fails **loudly**,
   so low severity — but it makes `--output` overrides and side-by-side build
   comparisons unusable. A `_site*` prefix test or scanning `INPUT_DIR` closes it.
9. **E6 is confirmed and narrower than the brief's framing suggests** — the page
   converts units correctly nearly everywhere (SVG readouts `:1128-1134`, HTML
   mirror, OA readout `:1412`, sensor override `:1480-1512` with a `unitschange`
   listener). `updateChips` is the **single** missed path. Consequence: in metric,
   two HTML surfaces on the same page disagree — the mirror reads **24.4 °C**
   while the chip strip directly below reads **75.9 °F**.
10. **The `<symbol>`/`<use>` gutter collapse is still BLOCKED**, and F2–F4 read as
    if it were cleared. `codebase-issues` #70 blocks it on `getTotalLength()` /
    `getPointAtLength()` not piercing `<use>` shadow trees, with revisit trigger 3
    = "flow-engine moves off `getTotalLength()`". **That trigger has NOT fired** —
    #427 moved the calls off the per-frame path, but `flow-engine.js` still calls
    both at init (`:380`, `:568`, `:792`, `:821`, `:947`). `<use>` becomes viable
    only if the gutter **also** goes static, which is the parked item.
11. **`E5` design cost the brief doesn't draw out:** the dead `font-size="12"` on
    `fcu-zone-sp` renders at 14 — **+16.7%**, not ~8% — so the deliberate
    zone-temp-loud / setpoint-quiet hierarchy inside the ZONE box is **flattened**.
    `Δ` is also the widest glyph in its caption (6.801 vs 6.273); adding U+0394 to
    the mono subset is a **cross-page** decision, since the same glyph appears in
    this page's HTML mirror at `:600` and in prose elsewhere.

### 14.4 — Bearing directly on the pending decisions in §10

- **Decision #4 (7-col vs 6-col).** ⚠️ **C15's headline numbers are not
  reproducible from this file.** "0px hidden / 3 crossings" (7×175) and "~269px
  hidden" (6×152) both depend on a y/row re-assignment the brief never publishes;
  with the shipped rows and a pure x re-columning the figures are **1171.8px / 16
  crossings** and **1316.8px / 12 crossings**. That is a **gap, not a
  refutation** — but you are being asked to choose between two layouts whose
  coordinates do not exist yet. Two further constraints the brief omits: **6×152
  does not fit from the shipped `x0 = 20`** (right edge 916 > 900; needs `x0 ≤ 4`),
  and **"fits fullscreen" for the 7-col option is only true above ~1238px** — at
  the 1000px gate a 1196px sheet still scrolls ~238px. C15's normal-flow figures
  *do* cross-validate exactly (1196 − 837.6 = 358.4; 1196 − 717.6 = 478.4).
- **Decision #4, second constraint.** C15's spec as worded ("assert every wire
  takes the forward branch" across both `FCU_PROGRAMS` and `EXAMPLES`) is
  **unimplementable** — `proof` can never satisfy it and per its own source
  comment should not. Use **"no segment passes behind a non-endpoint block"**
  instead: it passes `proof` today and is the assertion that actually encodes the
  defect.
- **Decision #5 (program design).** D1 is verified — **and the page already
  documents it**, at `:1734`: `// Y2 ON temp > 77 (Y1-on + sep)  Y2 OFF temp < 75
  (Y1-on)`. So this is a question about the **design**, not about undocumented
  behaviour. D2's redundancy is confirmed but its boundary condition is corrected
  (see 14.2), and D6's negative-deadband hook is a **different and better** lesson
  than the one this file described.
- **Not a blocker for merging #430.** The sweep's substance is confirmed end to
  end: 197 paths, all flagged, zero unrefreshed geometry writes, no page wrongly
  flagged. B8's live hole reproduces exactly as described (exit 0, 137 files). The
  errors were in the *record*, not the code — plus the new symlink gap (14.3 #1),
  which is a robustness item, not a regression.

### 14.5 — Process note for the "lessons learned" mandate

The §2 register named two patterns. This pass adds a third, and it is the most
expensive one:

**A measurement is not a verification if you don't control the measurement's
configuration.** The E-lane ran a real browser against real markup and produced
four confident, internally-consistent, wrong corrections — because headless
Chromium's default glyph quantization differs from the path a headed browser
takes. It looked *more* authoritative than the arithmetic it overturned. The
refutation stage caught it only by asking "what would make this measurement
disagree with that one," then finding
`/etc/fonts/conf.d/10-hinting-slight.conf`. **When a browser contradicts
arithmetic, suspect the browser's configuration before the arithmetic** — and
record the render path next to any px figure, the same way a crossing count needs
its convention recorded (14.2, C12).

Two of the seven refuted corrections (F3, F4) failed the same way in miniature: a
lane attributed a residual to a plausible transient mechanism without checking
whether the number was divisible by that mechanism's quantum. 72 is not a multiple
of 5.
