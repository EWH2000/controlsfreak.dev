# DDC Workbench teaching-prose audit — the open #443/#444/#445 stack

> **Disposition: owner-dispositioned 2026-07-27.** Three outcomes:
>
> - **§1, §2, §5 and the other program-level items — DEFERRED**, by owner
>   decision, to a single pre-live sweep. Rationale: the AHU programs land
>   next and carry more of this class, so both get swept together rather than
>   patched piecemeal now. Not merge blockers for #443. Logged as
>   `codebase-issues` **#225** and **#226** so the sweep inherits them.
> - **§3 (the min-off war story) — REFRAMED AND APPLIED** on
>   `feat/ddcw-signed-coil-dt`. The owner supplied the lesson: *"make sure you
>   know how your override is affecting the logic"* — better than the original
>   beat and it drops the "authors don't always succeed" fatalism. Written in
>   house voice from that direction, mechanism re-verified first.
> - **§6 (`DAT − RAT` does not survive the AHU) — RESOLVED by the owner's
>   architecture call:** the AHU will read **MAT** as entering, so the
>   leaving-minus-entering convention holds unchanged across both units. The
>   FCU prose was generalized to state the rule rather than the bare identity.
> - **§7 and §8 (a11y) — still open**, not covered by the program-sweep
>   deferral. Logged as `codebase-issues` **#227**.
>
> **Update 2026-07-27 (`fix/ddcw-pre-ahu-hygiene`): §7 and item 18 SHIPPED.**
> #227 split — (a) closed, (b) still an owner decision. The pill lost its
> `aria-live`, `#fcu-verdict-sr` (an `.sr-only` live region outside both
> panes) carries the announcement, and one signature-guarded writer
> `setVerdict()` owns both. Item 18 could not be left behind: measured
> ~40 mutation records on the pill in a 2 s steady window, which is a
> screen reader talking over itself ten times a second the moment a live
> region carries that text. Full record at `codebase-issues` #227(a). One
> adjacent element found and NOT bundled — `#fcu-ovr-state` has the same
> unguarded-10 Hz defect and does announce a drifting number; logged as
> `codebase-issues` **#229**.
>
> Measured at `main` @ `20e12ab`, stack tip `feat/ddcw-signed-coil-dt` @
> `20ddf39`. Prose quoted from the signeddt worktree as audited — §3 and §6
> have since been edited, so those quotes are the pre-fix text.

## Why this audit ran

The 2026-07-27 handoff was written by the session that authored this stack.
Its own closing note asked the next session to read the diffs on #443/#444
**skeptically rather than inheriting my framing — the teaching prose
especially, since that's where a second perspective is worth most.** This is
that pass.

The earlier `/verify-handoff` run in the same session checked the stack
*mechanically* — does the latch latch, does the fan ride through, is ΔT
signed. All of that held. This audit asks the different question: **is the
prose right, and does it teach what the code actually does?**

## Method and error rate

Four lenses in parallel — field accuracy, prose-vs-behavior drift, pedagogy
and house voice, SVG description and a11y prose — each followed by an
adversarial refutation stage instructed to attack both the finding *and* its
proposed fix.

**21 findings raised, 2 killed by refutation, 19 survive.** Five surviving
findings had their proposed fix corrected or replaced by the refuter, and
four had their severity revised down. That ratio is why the refutation stage
exists: a correct finding does not imply a correct fix.

Final severities: **1 WRONG · 11 MISLEADING · 7 NIT.**

## The findings that matter

### 1. The "safeties" sheet has no airflow proof, and the DAT low-limit goes blind with the fan off

`html/simulators/ddc-workbench-fcu.html:982` · MISLEADING · **highest-value item**

The sheet is presented as the protected sequence. Its only external inputs
are `space-temp` and `dat` — verified by dumping the shipped literal;
`fan-enable` and `fan-speed` are outputs, not inputs. Nothing reads fan
status, current, or DP.

`ddcw-fcu-unit.js:242` is `const datT = fanOn ? coilLeaveT + FAN_HEAT : zoneT;`
— so with the fan commanded off the discharge probe reports **room
temperature**. Simulated with `dat` held at 76, the sheet commands
`{y1:true, y2:true, okrun:true, permit:true}`. An operator who forces
fan-enable off with the thermostat calling gets both compressors commanded
into dead air, on the sample named "safeties" — the exact condition the
page's own top verdict line paints red. The low limit does not merely fail
to catch it; it goes blind and self-clears.

On real gear the fan-proof interlock is first in a DX sequence and the low
limit sits behind it. A tech who learns the ladder in the other order will
trust a discharge limit to protect a coil it cannot see.

**The fix is prose, not a rewire** — name the missing interlock as a
deliberate scope boundary. Field footnote for whoever writes it: in a real
duct the probe would not jump to room temp, it would sit cold and drift up,
so reality goes blind slowly rather than instantly. It still goes blind.

### 2. "Holds them off until it recovers past the clear constant" mispredicts the observable by 110 sim-seconds

`:984` · MISLEADING (raised WRONG)

Measured closed-loop against the real unit module (fan forced to 25% at slot
8, otherwise defaults): the trip fires, `okrun` goes false, and `okrun` is
back **true 10.5 sim-seconds later** — but the stages do not restart for
**120.0 sim-seconds**. The trip is itself a full stop of `y1gate`, so it
*arms the min-off TON at the same instant it cuts the stages*. Of the lockout
the reader watches, ~11 s is the low limit and ~110 s is the off-timer.

The page instructs the reader to "Force the fan slow under a heavy call and
watch the safety act." A reader who follows that instruction and times the
recovery will conclude the clear constant is wrong. The two protections
stack, and the prose describes only one of them.

### 3. The min-off war story points at the trivial failure and away from the teachable one

`:988`, `:991`, `:993` · MISLEADING ×2 + NIT · **owner's anecdote — his to rewrite**

The prose frames the gap as "a hand forcing stages at slot 8 outranks the
whole permit chain." That is just how a priority array works: slot 8
outranks slot 16 on every point in every program, no author can prevent it,
and none should try. The closing clause — authors "do not always succeed" —
teaches that this is an unfixable fact of life.

The actually-teachable defect is one wire and it is fixable. The TON is fed
from `y1gate.Q`, the program's own **request**, not from the point. So the
reachable failure is the opposite of the one described: force the stages
**off** at slot 8 (the Off button at `:796` writes slot 8), the compressor
stops while the logic still thinks it is running, the timer never starts,
and releasing the force restarts it the same tick with min-off at zero. That
is a real short cycle, demonstrable in this sim today, produced by a force
that was not even trying to defeat the timer. The remedy is concrete and
vendor-free: **time the point's post-arbitration present value, not the
internal request.**

One further correction (`:991`): as written the subject is "programs" and the
predicate is "short-cycle." On real DX gear the anti-recycle timer normally
lives on the unit's own board, downstream of anything the DDC layer commands
— which is precisely why this gap stays invisible in the field. Hedge the
equipment claim rather than asserting it.

### 4. Positive ΔT with the compressor off is fan heat, not a heating coil

`:948`, `:950` · MISLEADING ×2

The page teaches "a coil that heats it reads positive under the same
convention," and then produces a positive badge with the compressor off:
measured EAT 76.0 / DAT 76.6 → **+0.6 °F**, settling to +0.4. That is
`FAN_HEAT` (`ddcw-fcu-unit.js:96`), the draw-through motor work — and the
note *directly above* is entirely about that fan heat. The two notes are
adjacent and never reference each other. Apply the taught rule to the page's
most common non-cooling state and you conclude the coil is heating the air.

Merging the two beats fixes it in one clause and converts the page's most
reachable wrong-model into its clearest demonstration of why the sign exists.

### 5. The 120-sim-second power-up hold is unexplained and reads as a fault

`:982` · MISLEADING

The TON starts at `et=0` on load, so selecting the safeties sample holds the
stages off for a full 120 sim-seconds. The default sample (`cool-2stage`)
arrives **running**, so picking safeties *stops a running unit and keeps it
stopped* — at the default 20× clock that is six real seconds; at 1× (which
the slider invites) it is two real minutes. Throughout, the verdict paints
amber "Compressor off — fan only, no ΔT across the coil," which reads as a
fault. Nothing in reader-facing prose accounts for it.

It is defensible behavior — a real board serves a minimum off-time on
power-up too — but it has to be said.

### 6. `DAT − RAT` does not survive the AHU

`:947` · MISLEADING · **roadmap-relevant**

Stated as a bare identity next to a badge captioned "ΔT ACROSS COIL," and the
surrounding paragraph generalizes the convention explicitly. It is correct
only because this cabinet is 100% recirculating (`d.eatT = plant.zoneT`).
On anything with an OA damper the coil enters on **mixed** air and
`DAT − RAT` is wrong by the whole OA fraction — a tech computes a fat delta
on an economizing AHU on a 45 °F morning and concludes the coil is working.

**Phase 7 draws exactly that unit.** Whatever wording lands here should be
one the AHU page does not have to contradict. Secondary: "RAT" is not the
caption on the badge row — the operand prints as "EAT · ENTERING" on the
graphic and in the mirror, so the equation names a term the reader cannot see.

### 7. The safety annunciation is silent to screen readers on the Wiresheet tab

`:777` · **WRONG** — the only WRONG in the set · **FIXED 2026-07-27**
(`fix/ddcw-pre-ahu-hygiene`), exactly as prescribed below — see
`codebase-issues` #227(a)

`#fcu-verdict` carries `aria-live="polite"` but sits inside
`<div id="tab-unit" class="tab-pane">`, and `styles.css:1349` is
`.tab-pane { display: none; }`. A live region in a `display:none` subtree is
not in the accessibility tree. So the branch this stack adds —
`ddcw-fcu-unit.js:524`, "DAT low-limit annunciator latched" — announces
nothing the entire time the Wiresheet tab is up, **which is exactly where you
sit while studying the program this stack exists to teach.** Nothing else
annunciates it: `renderOffProgram` early-returns on slot 16, and `updateChips`
writes plain spans.

The container is inherited from main; the load-bearing content is new here.

**Do not move the pill** — the refuter caught this. `.tool-card.is-fullscreen
#tab-unit.active` declares a `grid-template-areas` including a `verdict` row,
and `.fcu-verdict { grid-area: verdict; }` only resolves while the pill is a
grid child of that pane. Moving it silently breaks the fullscreen layout.
Instead: strip `aria-live` from the pill and add a persistent `sr-only`
mirror outside both panes. The house shape already exists —
`pid-tuner.html:339` is `<p class="sr-only" id="pid-sr-status" aria-live="polite">`.

### 8. `role="img"` now wraps five focusable descendants

`:543`, `:547` · MISLEADING · **owner decision, not a drive-by fix**

The comment says the graphic uses "the education idiom (`role="img"` +
`aria-labelledby`)." That idiom is for *static* diagrams:
`grep -c tabindex html/education/*.html` returns **zero** across every lesson.
This graphic now nests five focusable elements — two `.fcu-link` drill-downs
and three new `role="button"` sensor groups — inside `<svg role="img">`.
`img` is a presentational-children role: user agents are told to prune the
subtree.

**The naive `role="group"` swap is worse than the problem** (refuter catch):
`img` is what currently prunes the subtree, so swapping un-hides all 19
`<text>` nodes — every one already duplicated in the `.fcu-points` mirror
that exists *because* the graphic is an image. Two honest paths: pair the
swap with `aria-hidden` on the mirrored content (not a one-liner), or keep
`role="img"` and move the activation affordance to real HTML buttons outside
the SVG. Either way the stale comment must be corrected.

## Smaller surviving items

| # | Where | Severity | Item |
|---|---|---|---|
| 9 | `:707`/`:724`/`:738` | MISLEADING | Glyphs are `role="button"` named with noun phrases ("Return-air temperature sensor…"), announcing as objects not actions — while the two sibling drill-down links on the same drawing use verb-first `aria-label`s. Fix wording must survive whatever happens to the desc's chip-callout clause. |
| 10 | `:550` | MISLEADING | "a wall plate mounted inside the zone on its **far** wall" — "far" has no referent; every other spatial anchor in the desc is absolute. |
| 11 | `:550` | MISLEADING | The desc promises activation "flags its matching live-value chip in the statusbar." True but uncashable by its audience: the highlight is `border-color` + `box-shadow` only, no live region, no focus move. Also "statusbar" appears nowhere on screen. |
| 12 | `:985` | NIT | Min-off described by symptom ("keeps a stopped unit from restaging straight back in") not mechanism — high/low side equalization, inrush winding heat. An author who thinks it is cosmetic deletes it under schedule pressure. |
| 13 | `:983` | NIT | The 42/52 band's *reason* is never given, leaving both constants arbitrary. Drop the stages and discharge air rebounds through the trip line in seconds; the wide band makes the unit prove the condition cleared. |
| 14 | `:995` | NIT | "The fan is deliberately outside the permit path" stops one beat short — the *speed* reference also rides through, and on the raw `sr2.Q` call, so the graphic can read Fan 100% · ON / Compressor OFF. |
| 15 | `:998` | NIT | "watch **the safety** act" — definite article on a DX fan coil, where the real protections are the hardwired LP switch and manufacturer freeze sensing. "the low-limit" costs nothing and removes the hierarchy claim. |
| 16 | `:150` | NIT | CSS comment still enumerates two sensing devices; three ship. `e70fc28` rewrote the reader-facing desc and skipped the comment. |
| 17 | `sensors.spec.js` | NIT | Test named "exposes an accessible name via a native SVG `<title>`" only does a DOM-presence check. Note: `toHaveAccessibleName` would **not** catch the pruning risk in item 8 — Playwright's accname implementation does not model ancestor `role="img"` pruning. |
| 18 | `ddcw-fcu-unit.js:540` | NIT | ~~Verdict `textContent` rewritten unguarded at 10 Hz~~ — **SHIPPED 2026-07-27** with §7, because item 7's mirror is exactly what made it load-bearing. `setVerdict()` now carries the `offprogSig` signature guard (`ddcw-shell.js:372`), class included in the signature. Measured before: ~40 mutation records in a 2 s steady window; after: 0. |
| 19 | `:507`, `:1023` | NIT | `aria-label` on a bare `<div>` (maps to `generic`, naming prohibited, attribute dropped). Two instances; fix both or neither. |

## Killed by refutation — do not re-raise

- **RAT/EAT identity missing from the desc.** Argued as an a11y parity defect
  on the premise that "a sighted reader recovers the link from proximity."
  Geometrically false: the EAT badge is at x=139 and the RAT stem at x=342,
  ~200 user units apart with the ΔT badge between them; the badge nearest the
  probe is DAT. No reader recovers it from proximity, so there is no
  asymmetry to correct — and `:946-947` already states the identity in prose.
- **"Cooling — but ΔT is high / airflow low (coil-freeze watch)" contradicts
  the sign convention.** The prose it supposedly contradicts is the prose that
  licenses it: `:950-951` explicitly splits sign (direction) from magnitude
  ("before you ask how hard").

## Checked and found sound — do not re-audit

- The latch mechanics, the fan-rides-through wiring, and the full-stop-only
  TON are all correctly described *as mechanisms*; every numeric constant in
  prose matches the shipped literal.
- The signed-ΔT math, the metric scale conversion, and the absence of any
  `abs()` on the path.
- Vendor-agnosticism throughout; no "plain English"; no coming-soon copy; no
  heat-mode promise anywhere in page copy despite heat mode motivating the
  convention.
- The `<desc>` leaks no verdict — it describes what is drawn, per the owner's
  2026-07-20 ruling.
- Keyboard mechanics on the glyphs: `keydown` not `keyup`, Enter and Space,
  `preventDefault()` on Space, `tabindex="0"`, predictable DOM order pinned by
  test, and two independent focus signals (`:focus-visible` outline plus an
  accent stroke recolor) so the indicator survives a UA that will not paint
  `outline` on SVG geometry.
- The `.fcu-points` mirror is the right answer to "a static desc cannot carry
  10 Hz values."
