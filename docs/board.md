# Freeze season

<!-- The owner's one-screen board. Rendered to the home hub by `npm run board`
     (format and rules: .github/scripts/build-board.mjs header). Keep it to
     about 40 visible lines. "The five" are finishable without the owner;
     anything that needs him is a "Your turn" line, three at most. New
     "Shipped" lines go at the TOP, in plain language. -->

**Week:** Nov 27 – Dec 3
**Run:** running — Overnight catch-up. Setting up: locking `main` behind the test suite, then clearing the 15 waiting changes.

## The five

- [ ] Clear the 15 waiting changes
- [ ] Coil Freeze Protection quiz
- [ ] Quizzes you can't game
- [ ] Freeze-season loose ends
- [ ] The case-file format

## Your turn

- **One real callout story** for the case-file format. Tell it your way next session and I'll write it up.
- **One tap:** fix the always-"b" quiz tell by shuffling choices in the engine, or by reordering the banks by hand.
- *Optional:* a freeze stat gotcha of your own to swap into the new quiz.

## Shipped

Nothing yet this week. The first lines land tonight.

### Calls I made

- CI now runs on a pinned Node version, and editing a PR's title or body re-runs the test suite.
- `main` takes changes by pull request only, and only after the tests pass. That applies to you too.
- No nightly timer. Nothing runs unless you say "run it".

### Menu for the next five

- A fresh Search Console export (your account, about ten minutes)
- A lesson of your choosing
- The MS/TP bus simulator
- A second hero demo for the home page
- A public "What's new" page
