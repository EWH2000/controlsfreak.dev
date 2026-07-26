# Session handoff — the FCU-graphic arc is closed, #209 is next (2026-07-26)

> **Lifecycle:** written 2026-07-26, superseding the 2026-07-25 "VERIFICATION
> PASS COMPLETE" handoff, which is **archived at
> `docs/audits/2026-07-verification/handoff.md`** with a disposition header.
> That file was a verification request, not a work brief; its request was
> answered and the arc it guarded shipped. Its §6 / §7 are still the raw DDC
> Workbench diagnosis and worth reading before the polish arc.
>
> Everything that had work attached moved into `docs/codebase-issues.md` as
> **#205–#216**. That file is the live record — this one is a route through it.
>
> **Retire this file when #209 has shipped and the workbench polish arc has a
> merged PR.**

## Read this first

**Every claim in this file is a hypothesis. The repo is the truth.** Run the
grep. If the grep disagrees with this file, the grep wins, and the correction is
wanted — report it rather than working around it. The orchestrator, not the lane,
decides what a discrepancy means.

That instruction is not ceremonial here. The predecessor's verification pass
extracted **82 claims from one handoff: 45 verified, 7 corrected, 25 partial, 5
unverifiable** — and of **31 proposed corrections, 7 were themselves wrong**
(23%). Two of the corrections that held were HIGH severity and would have
shipped a bad fix. The standing lesson: *the work was sound, the record of the
work was not.*

**This session added two more instances. Both are the cheap kind to avoid.**

1. The `codebase-issues` **#211** entry established that `.fcu-pt-val`'s
   `font-size` beat the zone setpoint's `font-size` attribute — then asserted in
   the next sentence that the setpoint's `fill` attribute "still works." It did
   not. `.fcu-pt-val` sets `fill` too, in the same four-line rule the entry had
   just cited. **Check the whole rule body, not the one declaration you came
   for.**
2. While repointing a stale citation in **#196**, this session drafted an
   amendment saying the wire-cache decoupling "was carried over as-is rather
   than decoupled" — reasoning from a shipped extraction to an unpaid follow-on.
   Wrong: #196 is already marked *(addressed 2026-07-22)* and its own Resolution,
   twenty lines below the text being amended, records the `wireEls` side map that
   PR #422 introduced. **Read to the end of the entry before amending its
   middle**, and treat a PR title that names the fix (`decouple wire cache
   (#196)`) as evidence rather than coincidence.

Both were caught by running a command instead of trusting the draft. That is the
whole method; there is no substitute for it in this repo.

## Where things stand

`origin/main` @ **`3f330a4`**, **v3.74.2** on `main` (**v3.74.3** rides in the
open PR). Measurements below cite `3f330a4`, the commit they were taken at —
deliberate, not stale.

Counts at `3f330a4`: **40 education lessons · 34 content quizzes + 7 field
drills · 31 tools · 8 simulators.** (Derived: `html/practice` holds 42 `.html`
including `index.html`; 7 carry `category: field`. Corroborated against the
landings' own chips — `/tools/` All reads 31, `/practice/` All reads 41.)

**Shipped since the last handoff:**

- **PR #431** — `npm run publish:preview`, a LAN dev preview of the built site
  at `https://cfdev.home.arpa/` served from the hub's Caddy. Answers §13 of the
  archived handoff (*built snapshot vs live `eleventy --serve`*) in favour of the
  **snapshot**: no long-running node process to orphan, and the box was already
  carrying nine of those.
- **PR #432** — `codebase-issues` **#211** (FCU badge captions overflowing their
  frames — the owner's originally reported bug) and **#212** (`updateChips`
  showing Fahrenheit numbers under a °F label in metric). Captions to 8px;
  `FCU_POINTS` gained a `conv` field and the chip painter dispatches on it.
- **PR #433** — the captions to `font-weight: 600`. Owner's call: *"that's what
  I do with those boxes."*
- **PR #434 — OPEN, CI green, not merged.** Closes the arc: the zone setpoint's
  size step restored as a real class, git provenance in the preview's
  `_built.txt`, and the patch bump to v3.74.3. `test` passed in 4m22s, which also
  settles the two local failures below as host-load flakes. Its own §Out-of-band
  lists what it touched outside the diff.

**⚠️ Two repo-state traps, both real at `3f330a4`:**

1. **The shared checkout at `~/controlsfreak.dev` is parked on
   `tooling/publish-preview-script` @ `4b03bae`, which is NOT an ancestor of
   `origin/main`** (`git merge-base --is-ancestor` says no). It is an unmerged,
   divergent draft of the same publisher, and its `ddc-workbench.html` predates
   #432 — so **reading files from that working tree gives you pre-#432 content**
   while `git log origin/main` shows the merges. This session read the CSS out of
   it and briefly took 10px for the live caption size. Cut a worktree off
   `origin/main`; do not `git checkout` in the shared tree (other sessions live
   there).
2. **The local `main` ref was three merges stale** at `84c6ab8` while
   `origin/main` was at `3f330a4`. Fast-forwarded this session after verifying
   ancestry. A PR cut from a stale local `main` silently omits merged work —
   always branch from `origin/main` explicitly.

**The preview currently serves PR #434's build, not `main`.** Its
`_built.txt` says so: `origin: ahead 3 of origin/main`. Republish from a
`main` checkout after the merge — `CF_PREVIEW_DIR=/home/ehill/caddy/dashboard/cfdev
npm run publish:preview -- --build`.

## The work, in order

### 1. `codebase-issues` #209 — 3-slot priority arbitration on the workbench

**The design is decided and the owner's four verdicts are CLOSED (2026-07-25).**
Read **#209 in `docs/codebase-issues.md`** for it — the full spec lives there and
restating it here would create exactly the two-source drift this repo keeps
paying for. In brief: three real BACnet slots (**8** Manual Operator / **16**
sequence / `Relinquish_Default`), a **null checkbox** beside the override, the
sensor override left alone, and a **"points not following program:"** window.

What that entry leaves genuinely open, and what a lane must not decide alone:

- **The AUTO / HAND toggle probably collapses into the null checkbox.** In BACnet
  terms there is no HAND mode, only whether slot 8 is null. That is more faithful
  and less chrome, but **it removes existing UI** — needs an explicit sign-off,
  not an inference from the design.
- **`Relinquish_Default` per point.** Verified absent: `git grep -c 'Relinquish'
  html/simulators/ddc-workbench.html` returns **0** at `3f330a4`, so the field
  does not exist yet. `y1` / `y2` / `fan-enable` → `false`; **`fan-speed` needs a
  call** (0, or a minimum).
- **The checkbox's interaction detail** — grey the slider or show the resolved
  value; write on uncheck or arm.

⚠️ **The distinction this exists to teach is invisible without the window.**
"Commanded off at slot 16" and "relinquished to `Relinquish_Default`" resolve to
the same displayed number for every point on this graphic. A lane that builds the
arbitration and defers the window has built something no reader can observe — and
every test still passes.

**Do not ship the one-line `else` as a stopgap**; it would be ripped out. One
trigger overrides that: if the workbench goes public first, put the one-liner in
first — a graphic showing a compressor nobody commanded is not publishable.

**Cross-links owed when it ships** (both verified present at `3f330a4`):
`html/education/bacnet-basics.html#priority-array` and
`html/tools/bacnet-priority.html`. The window is effectively a three-slot
instance of that resolver; the two should present consistently. **#210** (a stale
comment claiming the no-airflow fault needs a HAND override,
`html/simulators/ddc-workbench.html:1394`) sits in code this touches — fold it in
rather than tracking it separately.

### 2. The DDC Workbench polish arc — **not** more physics

**Owner's standing direction:** through Increment 3 the physics is done and live
but hidden; next is **browser lag → cleanup → maybe public**. *Feel is
tune-in-place.* Design home `docs/air-side-sim.md`.

- **#205** is the layout bug this arc has to fix, with the verification
  corrections already folded in. **#208** is its companion: the wire-routing
  threshold is `8.6·F + 34`, **not** a 171.6px constant, so it moves with the
  reader's font size and `cool-1stage` breaks at enlarged text.
- ⚠️ **Build the candidate layouts; do not choose between them on paper.** The
  archived §6's two candidates (7-column vs 6-column) **have no coordinates** —
  their headline numbers are unfalsifiable as written. This is also the owner's
  general preference: *scope evolves through interaction with a working
  artifact.*
- **#214** — the profiler's `ddc-workbench-unit` baseline is known-untrustworthy
  and **carries no note in the script**, so the next reader cannot tell. It has
  flagged over-tolerance on both runs since. Cheapest honest fix is to annotate
  the row with the two observations and the open question.
- ⚠️ **"Fix the workbench lag" is partly a site-wide problem, not a workbench
  one.** Per **#70** (recorded in `codebase-issues`, not just in a handoff):
  `tools/signal-scaling.html` — no rAF, no `setInterval`, no `setTimeout` of its
  own — idles at **43.6% of a core** at 1920×1080 and **0.13%** at 1100×900,
  where `.schematic-bg` is `display: none`. That is the gutter, on every page.
  Every lever that keeps it animating plateaus around **20–24%** (#200). Don't
  attribute that share to the workbench.
- **Run `npm run perf-profile` before merging anything that touches an animation
  loop, a rAF/setInterval gate, `schematic-bg`, or an animation rule.** Idle cost
  has regressed silently four times through a green `npm test`.

### 3. Small, contained, unblocked

Each is independent of the two above.

- **#213** — `simulators/pid-tuner.html` is a safe, unclaimed candidate for
  `data-flow-static="true"`; the last page paying live path reads on geometry
  that never moves.
- **#215** — unbounded const inputs in the FBE inspector. ⚠️ **Measure before
  choosing.** The question that decides it — can an absurd value wedge the
  integrator until reload? — is unmeasured, and needs a browser. **Do not clamp
  on suspicion**: an unnecessary clamp removes exploration from a teaching tool,
  and a negative `deadband` collapsing hysteresis into a bare comparator is a
  *better* teaching hook than a bug.
- **#216** — new this session. Nine rules site-wide request mono `font-weight:
  700` when the site ships only 400 / 400i / 500 / 600. Measured, not reasoned:
  700 renders **pixel-identical** to 600, with 500-vs-600 as the control at 595
  differing pixels. Nothing renders wrong; the CSS names a weight that cannot
  happen. Option (a) — rewrite the nine to 600 — is the obvious call and needs
  only the owner's word that he doesn't actually want heavier mono somewhere.
- **#207** — the `flowStaticGuard`'s symlink blind spot and its `cwd` scan scope.
- **#204** — the `flowStaticGuard` header's comment-pairing claim holds for one
  comment shape, not all of them. Measured effect on the real tree is **zero**,
  in either direction; what is at stake is that the header is the designated
  explanation of the guard and a reader who trusts it will believe the hole is
  closed. The pending call is only whether the amendment rides along on another
  PR or ships alone.

**Explicitly declined, with named blockers — do not carry these as open work:**
the static-print gutter background (parked by the owner — *"I think I may be
pushing this too hard"*); a motion/**eco** toggle (deferred to a post-workbench
housekeeping pass, and it has an unsettled scope question: on `refrigerant-loop`
and the workbench the motion *is* the content, so killing it stops the teaching);
publishing the workbench (gated on #209 and the polish arc).

## Decisions waiting on the owner

None of these blocks the work above.

- **#209's three open consequences** — the AUTO/HAND collapse (removes UI),
  `fan-speed`'s `Relinquish_Default`, and the checkbox interaction detail.
- **#216** — rewrite the nine to 600, or ship a mono 700 face.
- **`flowGeometryLive` granularity** — page-scope as built, or per-element?
- **The wiresheet layout** — 7-column vs 6-column, once both are built.
- **The eight FCU program design questions** — archived handoff §7. The producing
  session's order of interest: **D1** (the setpoint is the cut-out, not the band
  centre, while the chip reads "Cool SP" — a convention a reader absorbs without
  noticing) and **D2** (two provably dead gate blocks), then the `dat` low-limit
  hook, whether the third sheet earns its place, guarding `deadband`, surfacing
  `sep`, and whether fan speed should follow the stage.
- **`tooling/publish-preview-script`** — dead or not? If dead:
  `git checkout main` in the shared tree, then `git branch -D` it. Left alone
  this session because another session may still want it.
  (`archive/issue-202-pre-rewrite` is the deliberate one — keep it.)

## Process notes that earned their keep

Only notes that changed an outcome. Everything else was pruned.

- **`npm test` cannot run here as configured.** `playwright.config.js` serves on
  `:8000`, which is pantryapp. Use a throwaway config on a unique high port with
  the server started by hand, run in the **foreground**. Full-suite result this
  session: **781 passed, 2 failed, 1 skipped**, and **both failures passed in
  isolation at `--workers=1`** — the known host-load flake. Isolate before
  reporting a failure; CI is the arbiter.
- **`pkill -f '<pattern>'` matches the killing shell's own command line** and
  will kill it mid-run. Collect PIDs and kill by PID, filtered to real
  interpreters:
  `pgrep -a -f 'http\.server|eleventy' | awk '$2 ~ /(^|\/)(python3|node|npm)$/ {print $1}'`.
  A bare `pkill -f python3` takes out bms-web on `:8080`.
- **Headless Chromium diverges from what the owner sees, twice.** It reports
  `prefers-color-scheme: light` (pass `colorScheme: 'dark'` or you measure the
  wrong tokens), and it quantizes glyph advances to integer CSS px, which is what
  made a lane "correct" arithmetic that was right to three decimals. **A
  measurement is not a verification if you don't control the measurement's
  configuration.**
- **Every measurement needs a control.** #216's "0 differing pixels" only means
  something because 500-vs-600 differed by 595 in the same harness — otherwise it
  equally well means the diff was broken. Same shape as the `contain: strict`
  reading that looked like a 140× win because it had silently suspended the loop.
- **Read `_built.txt` before trusting the preview as "the site."** Its `origin:`
  and `tree:` lines now disclose unmerged and dirty work; a timestamp alone
  cannot tell *stale* from *showing work that exists nowhere else*.
- **Verify the remedy, not just the finding.** A correct defect does not imply a
  correct fix — both of the 2026-07-20 catches were fixes, not findings.

## One passing note

The named next flagship is the **DDC Workbench going public**, and the honest
readiness read is: **not yet, and #209 is why.** The physics closes the loop, the
graphic reads correctly, and the arc just spent three PRs on the unit graphic's
type — but a visitor can still delete a block and watch a compressor run that
nothing is commanding, on a page whose own sibling lesson calls that *"the most
common way priority-array logic goes wrong in the field."* Fixing it well is also
the most teachable thing on the roadmap, which is the unusual case where the bug
and the feature are the same work.
