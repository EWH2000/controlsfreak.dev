# Freeze season

<!-- The owner's one-screen board. Rendered to the home hub by `npm run board`
     (format and rules: .github/scripts/build-board.mjs header). Keep it to
     about 40 visible lines. "The five" are finishable without the owner;
     anything that needs him is a "Your turn" line, three at most. New
     "Shipped" lines go at the TOP, in plain language. -->

**Week:** Nov 27 – Dec 3
**Run:** done — Overnight catch-up finished. All 15 waiting changes are merged and live, your About paragraph is updated, and the Coil Freeze Protection quiz is out. Nothing is open. The next run starts when you say "run it".

## The five

- [x] Clear the 15 waiting changes
- [x] Coil Freeze Protection quiz
- [ ] Quizzes you can't game
- [ ] Freeze-season loose ends
- [ ] The case-file format

## Your turn

- **One real callout story** for the case-file format. The dead RS-485 trunk from your troubleshooting notes looks like the one. Tell it your way next session and I'll write it up.
- **One field call:** the PID tuner says fast loops "can take more aggressive gain"; the Duct Static lesson says loops that quick "are tuned gently or they hunt". Which do you teach for duct static?
- *Optional:* a freeze stat gotcha of your own to swap into the new quiz.

## Shipped

- **Nov 27** — New: the Coil Freeze Protection quiz. Fifteen questions drawn from the lesson, linked both ways with it (v3.93.0). [#660](https://github.com/EWH2000/controlsfreak.dev/pull/660)
- **Nov 26–27** — Six quizzes grew from 10 to 15 questions: Duct Static Control (with your "sensor first" call), VAV Systems, Building Pressure, Hydronic Loops, Psychrometrics Basics and Load Piping. [#648](https://github.com/EWH2000/controlsfreak.dev/pull/648) [#649](https://github.com/EWH2000/controlsfreak.dev/pull/649) [#650](https://github.com/EWH2000/controlsfreak.dev/pull/650) [#654](https://github.com/EWH2000/controlsfreak.dev/pull/654) [#655](https://github.com/EWH2000/controlsfreak.dev/pull/655) [#653](https://github.com/EWH2000/controlsfreak.dev/pull/653)
- **Nov 27** — Three lessons corrected: PID Basics and the PID tuner (duct static is not a "clean" loop, mixed-air temperature is not a fast one), Economizers ("lockout" at both ends of the free-cooling range), BACnet Networking (scope statements instead of promised pages). [#641](https://github.com/EWH2000/controlsfreak.dev/pull/641) [#642](https://github.com/EWH2000/controlsfreak.dev/pull/642) [#643](https://github.com/EWH2000/controlsfreak.dev/pull/643)
- **Nov 27** — The home page's About paragraph says plainly how the site is built: your field experience and direction, AI for much of the drafting, code and cross-checking. [#659](https://github.com/EWH2000/controlsfreak.dev/pull/659)
- **Nov 26–27** — Freeze season on the site: the lesson's freeze stat range reads 35–38 °F (your number), Air Handlers points at it from the sensor walk, and the home page features it. [#639](https://github.com/EWH2000/controlsfreak.dev/pull/639) [#640](https://github.com/EWH2000/controlsfreak.dev/pull/640) [#644](https://github.com/EWH2000/controlsfreak.dev/pull/644)
- **Nov 26** — The psych chart's mixing slider now says what it is — outdoor air by mass, not by CFM — and a mix that lands in fog is placed on the saturation curve (v3.92.0). [#651](https://github.com/EWH2000/controlsfreak.dev/pull/651) [#652](https://github.com/EWH2000/controlsfreak.dev/pull/652)
- **Nov 26** — The Workbench air handler's filter rack is drawn as pleated media. [#647](https://github.com/EWH2000/controlsfreak.dev/pull/647)
- **Nov 26** — `main` is locked: nothing reaches the live site without a passing test run. Tests run on a pinned Node version. [#657](https://github.com/EWH2000/controlsfreak.dev/pull/657)

### Calls I made

- CI now runs on a pinned Node version, and editing a PR's title or body re-runs the test suite.
- `main` takes changes by pull request only, and only after the tests pass. That applies to you too.
- No nightly timer. Nothing runs unless you say "run it".
- The psych engine's two defaults ship as built: a missing pressure uses the readings' own, and an engine error passes straight through.
- The Economizers page names the cold-end lockout "low-limit or mixed-air", not "low-ambient" as October's note had it. In the field that phrase usually means the compressor lockout.
- October's handoff document and dashboard are retired. This board replaces both.
- I merged the 15 without the October walk, each after a second agent reviewed its final version. Those reviews caught a real problem in three of them (Economizers, BACnet Networking, the Duct Static quiz), fixed before merge. What they raised and I left alone is logged for the loose-ends run.
- This repository is public, so your remarks about why the project stalled are paraphrased, not quoted, in the rulings file.

### Menu for the next five

- BACnet addressing planner and collision checker (a small tool)
- Trend capacity planner (how many days of history a controller really holds)
- Schedules, calendars and exceptions (lesson, drill, and a "which entry won" simulator)
- The MS/TP bus simulator
- A fresh Search Console export (your account, about ten minutes)
- A public "What's new" page
