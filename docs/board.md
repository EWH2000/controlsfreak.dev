# Freeze season

<!-- The owner's one-screen board. Rendered to the home hub by `npm run board`
     (format and rules: .github/scripts/build-board.mjs header). Keep it to
     about 40 visible lines. "The five" are finishable without the owner;
     anything that needs him is a "Your turn" line, three at most. New
     "Shipped" lines go at the TOP, in plain language. -->

**Week:** Nov 27 – Dec 3
**Run:** running — Overnight catch-up. Thirteen of the 15 are merged and live, plus your About paragraph. The last two are on a final re-review. The Coil Freeze Protection quiz is built and tested, and a second agent is checking every answer.

## The five

- [ ] Clear the 15 waiting changes
- [ ] Coil Freeze Protection quiz
- [ ] Quizzes you can't game
- [ ] Freeze-season loose ends
- [ ] The case-file format

## Your turn

- **One real callout story** for the case-file format. The dead RS-485 trunk from your troubleshooting notes looks like the one. Tell it your way next session and I'll write it up.
- **One field call:** the PID tuner says fast loops "can take more aggressive gain"; the Duct Static lesson says loops that quick "are tuned gently or they hunt". Which do you teach for duct static?
- *Optional:* a freeze stat gotcha of your own to swap into the new quiz.

## Shipped

- **Nov 27** — The home page's About paragraph says plainly how the site is built: your field experience and direction, AI for much of the drafting, code and cross-checking. [#659](https://github.com/EWH2000/controlsfreak.dev/pull/659)
- **Nov 27** — VAV Systems and Building Pressure quizzes grew from 10 to 15 questions each. [#649](https://github.com/EWH2000/controlsfreak.dev/pull/649) [#650](https://github.com/EWH2000/controlsfreak.dev/pull/650)
- **Nov 27** — Economizers: a sentence on how the field uses "lockout" at both ends of the free-cooling range. [#642](https://github.com/EWH2000/controlsfreak.dev/pull/642)
- **Nov 27** — PID Basics and the PID tuner no longer call duct static a "clean" loop or list mixed-air temperature as a fast one. [#641](https://github.com/EWH2000/controlsfreak.dev/pull/641)
- **Nov 27** — Coil Freeze Protection lesson: the freeze stat trip range reads 35–38 °F, your number. [#639](https://github.com/EWH2000/controlsfreak.dev/pull/639)
- **Nov 27** — Air Handlers now points at the freeze lesson from the sensor walk. [#640](https://github.com/EWH2000/controlsfreak.dev/pull/640)
- **Nov 27** — Hydronic Loops and Psychrometrics Basics quizzes grew from 10 to 15 questions each. [#654](https://github.com/EWH2000/controlsfreak.dev/pull/654) [#655](https://github.com/EWH2000/controlsfreak.dev/pull/655)
- **Nov 26** — The psych chart now mixes outdoor and return air by mass, so the mixed-air point stays honest on cold mornings (v3.92.0). [#651](https://github.com/EWH2000/controlsfreak.dev/pull/651) [#652](https://github.com/EWH2000/controlsfreak.dev/pull/652)
- **Nov 26** — Load Piping quiz grew from 10 to 15 questions. [#653](https://github.com/EWH2000/controlsfreak.dev/pull/653)
- **Nov 26** — The home page now features the Coil Freeze Protection lesson for freeze season. [#644](https://github.com/EWH2000/controlsfreak.dev/pull/644)
- **Nov 26** — The Workbench air handler's filter rack is drawn as pleated media. [#647](https://github.com/EWH2000/controlsfreak.dev/pull/647)
- **Nov 26** — `main` is locked: nothing reaches the live site without a passing test run. Tests run on a pinned Node version. [#657](https://github.com/EWH2000/controlsfreak.dev/pull/657)

### Calls I made

- CI now runs on a pinned Node version, and editing a PR's title or body re-runs the test suite.
- `main` takes changes by pull request only, and only after the tests pass. That applies to you too.
- No nightly timer. Nothing runs unless you say "run it".
- The psych engine's two defaults ship as built: a missing pressure uses the readings' own, and an engine error passes straight through.
- The Economizers page names the cold-end lockout "low-limit or mixed-air", not "low-ambient" as October's note had it. In the field that phrase usually means the compressor lockout.
- October's handoff document and dashboard are retired. This board replaces both.

### Menu for the next five

- BACnet addressing planner and collision checker (a small tool)
- Trend capacity planner (how many days of history a controller really holds)
- Schedules, calendars and exceptions (lesson, drill, and a "which entry won" simulator)
- The MS/TP bus simulator
- A fresh Search Console export (your account, about ten minutes)
- A public "What's new" page
