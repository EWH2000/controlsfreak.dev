# Freeze season

<!-- The owner's one-screen board. Rendered to the home hub by `npm run board`
     (format and rules: .github/scripts/build-board.mjs header). Keep it to
     about 40 visible lines. "The five" are finishable without the owner;
     anything that needs him is a "Your turn" line, three at most. New
     "Shipped" lines go at the TOP, in plain language. -->

**Week:** Nov 27 – Dec 3
**Run:** done — Quiz answers now come up in a different order every time, and your two answers from this evening are on the site. Next on your green light: the quiz number box (the other half of item 3), then the dead-trunk lesson.

## The five

- [x] Clear the 15 waiting changes
- [x] Coil Freeze Protection quiz
- [ ] Quizzes you can't game (the shuffle is done; the number box is next)
- [x] Freeze-season loose ends
- [ ] Finding a break in a dead trunk (your story and your method, as a lesson)

## Your turn

- Nothing is waiting on you. Both optional questions are answered and on the site.

## Shipped

- **Nov 27** — Your two answers from this evening are on the site. Coil Freeze Protection says the outdoor and exhaust dampers fail closed and the return damper fails open. Start/Stop Commands no longer calls a safety with no input "the common case": it says the freeze stat most often has an input, or the whole circuit does, and that it is more common for the controller not to know the status of the duct smoke detector. The Workbench said an unlanded stat was "extremely common"; it now says "sometimes". [#670](https://github.com/EWH2000/controlsfreak.dev/pull/670)
- **Nov 27** — Quiz answers come up in a different order every time a question is shown, so "it's always b" stops working. True/False still reads True, then False. Sixteen explanations that pointed at a choice by its letter or position now name it by what it says (v3.93.1). [#668](https://github.com/EWH2000/controlsfreak.dev/pull/668) [#669](https://github.com/EWH2000/controlsfreak.dev/pull/669)
- **Nov 27** — "Freeze stat" is spelled one way across the site, two words, as you ruled, in lessons, tools, simulators, quizzes and the glossary. The old spellings stay as keywords for the site's own search. [#666](https://github.com/EWH2000/controlsfreak.dev/pull/666)
- **Nov 27** — Your two answers from this afternoon are on the site. Coil Freeze Protection says the trip "may look like a fan failure" when the stat is not on an input, and that on a proper safety circuit the dampers and heating valve lose 24 V: dampers fail closed, heating valve fails open. Your reset-after-a-cold-night calls are the story in Start/Stop Commands. A handful of small fixes went with it: two BACnet lessons no longer promise unbuilt work, and the PID tuner's table names loops, not valves. [#665](https://github.com/EWH2000/controlsfreak.dev/pull/665)
- **Nov 27** — Your freeze stat gotcha is on the site: the Coil Freeze Protection lesson and its quiz now cover the trip that can show up as a fan failure, because the stat is wired into the safety circuit and not landed on a DI. [#662](https://github.com/EWH2000/controlsfreak.dev/pull/662)
- **Nov 27** — Duct static is tuned gently, and the PID tuner and the Duct Static lesson now both say why in your terms: a second of sag is not ideal but not generally a problem, where a water-source heat-pump loop's differential pressure dropping too low trips the heat pumps. The tuner no longer says fast loops can take more gain. [#663](https://github.com/EWH2000/controlsfreak.dev/pull/663)
- **Nov 27** — New: the Coil Freeze Protection quiz. Fifteen questions drawn from the lesson, linked both ways with it (v3.93.0). [#660](https://github.com/EWH2000/controlsfreak.dev/pull/660)
- **Nov 26–27** — Six quizzes grew from 10 to 15 questions: Duct Static Control (with your "sensor first" call), VAV Systems, Building Pressure, Hydronic Loops, Psychrometrics Basics and Load Piping. [#648](https://github.com/EWH2000/controlsfreak.dev/pull/648) [#649](https://github.com/EWH2000/controlsfreak.dev/pull/649) [#650](https://github.com/EWH2000/controlsfreak.dev/pull/650) [#654](https://github.com/EWH2000/controlsfreak.dev/pull/654) [#655](https://github.com/EWH2000/controlsfreak.dev/pull/655) [#653](https://github.com/EWH2000/controlsfreak.dev/pull/653)
- **Nov 27** — Three lessons corrected: PID Basics and the PID tuner (duct static is not a "clean" loop, mixed-air temperature is not a fast one), Economizers ("lockout" at both ends of the free-cooling range), BACnet Networking (scope statements instead of promised pages). [#641](https://github.com/EWH2000/controlsfreak.dev/pull/641) [#642](https://github.com/EWH2000/controlsfreak.dev/pull/642) [#643](https://github.com/EWH2000/controlsfreak.dev/pull/643)
- **Nov 27** — The home page's About paragraph says plainly how the site is built: your field experience and direction, AI for much of the drafting, code and cross-checking. [#659](https://github.com/EWH2000/controlsfreak.dev/pull/659)
- **Nov 26–27** — Freeze season on the site: the lesson's freeze stat range reads 35–38 °F (your number), Air Handlers points at it from the sensor walk, and the home page features it. [#639](https://github.com/EWH2000/controlsfreak.dev/pull/639) [#640](https://github.com/EWH2000/controlsfreak.dev/pull/640) [#644](https://github.com/EWH2000/controlsfreak.dev/pull/644)
- **Nov 26** — Earlier this week: the psych chart labels its mixed-air input by mass and corrects a mix that fogs (v3.92.0); the Workbench filter rack is drawn as pleated media; `main` is locked behind a passing test run. [#651](https://github.com/EWH2000/controlsfreak.dev/pull/651) [#652](https://github.com/EWH2000/controlsfreak.dev/pull/652) [#647](https://github.com/EWH2000/controlsfreak.dev/pull/647) [#657](https://github.com/EWH2000/controlsfreak.dev/pull/657)

### Calls I made

- Standing from the catch-up night: tests run on a pinned Node version; `main` takes changes by pull request only, after the tests pass, for you too; no nightly timer; the psych engine's two defaults ship as built; Economizers calls the cold-end lockout "low-limit or mixed-air"; October's handoff and dashboard are retired.
- I merged the 15 without the October walk, each after a second agent reviewed its final version. Those reviews caught a real problem in three of them (Economizers, BACnet Networking, the Duct Static quiz), fixed before merge. What they raised and I left alone is in the ledgers; the loose-ends run took the ones scheduled for it.
- This repository is public, so your remarks about why the project stalled are paraphrased, not quoted, in the rulings file.
- Your gotcha went in as a sixteenth question instead of replacing one. Nothing in the bank had earned its way out.
- The Duct Static lesson told readers to drive the tuner's fan scene and feel how little gain it wants. I ran the tuner: on gain and reset alone that scene never overshoots, however hot you set it. I changed the lesson's wording now; fixing the scene itself is on the Menu, with your answer on what can make a real one hunt.
- Item 5 was "The case-file format". Your answer pointed at a lesson instead, and you approved that shape, so that is what it now says.
- The trunk lesson will say "the supervisor or router" where you named one vendor's controller. That is what the MS/TP lesson already calls it, and it keeps the page vendor-neutral.
- A second agent reviewed both changes and this record before they merged. Most of what it caught was me saying more than you had: "rarely a problem" where you said "not generally", a check order you never gave. It also caught a tuner sentence that pointed the wrong way. Those were fixed before merge. What it raised and I left alone is in the ledgers. The two spots where the freeze lesson said a little more than you did ("shows up", "the only place it is wired") are fixed now.
- Your story went into Start/Stop Commands in first person, lightly recast from your message, under a lead-in I wrote: "True story, many times over." No fact is added. Say so if you want it word for word, or the lead-in gone.
- One "freeze-stat" stays hyphenated: the freeze lesson quotes ASHRAE Guideline 36 there, and a quotation keeps its source's spelling.
- The MS/TP lesson no longer says a bus simulator is "on the roadmap". It is still on the Menu below; the page just does not announce it.
- The freeze tool's blank-field hint says "this tool starts at 38 °F" instead of calling 38 "the common default".
- The glossary tip is headed "freeze stat" and says "Also written freezestat".
- True/False is not shuffled. One question whose choices climb in order (the Air Handlers cooling-coil target: about 45 / 55 / 65 / 72 °F) now comes up out of order like the rest. Say so if you want ladders kept in order.
- A test now fails if a quiz explanation points at a choice by its letter. It cannot catch "the first three"; that stays a rule for whoever writes the question.
- The freeze quiz question built from your gotcha had the right answer as its longest choice. I trimmed it.

### Menu for the next five

- BACnet addressing planner and collision checker (a small tool)
- Trend capacity planner (how many days of history a controller really holds)
- Schedules, calendars and exceptions (lesson, drill, and a "which entry won" simulator)
- The MS/TP bus simulator
- Make the PID tuner's scenes behave like the loops they name. The fan scene first: it will not overshoot or keep cycling on gain or reset today, and you confirmed what can make a real one hunt (a noisy transducer, the boxes reacting or the drive's ramp; the drive probably least likely). Also "Decent PI" does not settle inside the chart on the opening scene.
- A fresh Search Console export (your account, about ten minutes)
- A public "What's new" page
