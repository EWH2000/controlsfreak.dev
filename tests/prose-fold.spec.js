// Behavioral tests for the details.prose-fold disclosure — the glossary
// arc's collapse pilot (docs/glossary-arc.md, 2026-08-10).
//
// The pattern is shared (the "PROSE FOLD" block in styles.css) and lands
// on two pages at once, so it gets its own spec rather than assertions
// duplicated into each page spec — the tests/fullscreen-toggle.spec.js
// shape, and for the same reason: what is under test is the mechanism,
// not either page's content.
//
// The three things worth pinning here:
//   * folds ship CLOSED, with a summary that names what is inside. Ship
//     one open and the pilot has bought the reader nothing; ship one with
//     a generic "more" and the reader cannot tell whether to open it.
//   * the toggle works. Native <details> needs no JS for this, which is
//     exactly why nothing else would notice if a stylesheet rule ever
//     broke the summary's hit area.
//   * the fullscreen cockpit drops the folds along with the sheet notes
//     inside them. Dropping only the notes leaves orphaned summary bars.
//
// PRINT behaviour is NOT here — it moved to details-print.spec.js when
// the owner ruled the shim covers all three disclosure idioms
// (2026-08-10), because it stopped being a property of this pattern and
// became a property of <details> site-wide.
//
// Plus the editorial guard, which is the part a future editor is most
// likely to break: an explicit list of the prose the owner ruled must
// stay OUT of every fold, asserted by opening phrase.
//
// ── WHAT THAT GUARD ENCODES, AND WHAT IT NO LONGER ENCODES ───────────
// The pilot's rule was background-versus-live: "what is this thing"
// prose could fold, "what is this machine doing right now" prose could
// not. The fold-widening ruling (owner, 2026-08-11 — glossary-arc.md
// D-log) SUPERSEDED it, in his words: "I'm fine folding even more, that
// way someone can read the specific section of prose they want while
// seeing the unit work, without having to scroll." With the control-bar
// affordance shipped, a fold is where a reader GOES to read a section
// beside the running unit — not where prose goes to be skipped. So
// live-walkthrough notes fold now, and four of this list's original
// eight rows moved into the fold inventory above.
//
// What survives is a SHORTER, ruled list rather than a derivable one,
// and that is the point: it is the owner's flag set, not a classifier.
// Each row below has its own reason, written beside it. A future editor
// who folds one of these is changing a decision, not tidying a page.

const { test, expect } = require('@playwright/test');

const AHU = '/simulators/ddc-workbench.html';
const FCU = '/simulators/ddc-workbench-fcu.html';

// The fold inventory as shipped. Pinned by id, not by count: a fold that
// is renamed or dropped fails here, and a NEW fold still has to satisfy
// the closed-on-load sweep below even though it is not listed.
//
// The four pilot folds head each page's block; the rest landed with the
// 2026-08-11 widening. `ddcw-fold-overrides` deliberately appears on
// BOTH pages — the two override notes are twins and carry one id per
// page, which is legal because ids are page-scoped.
const FOLDS = [
    // ── AHU · pilot ──
    { url: AHU, id: 'ddcw-fold-econ-permit' },
    { url: AHU, id: 'ddcw-fold-lls-numbers' },
    { url: AHU, id: 'ddcw-fold-lls-defeats' },
    // ── AHU · unit tab (widening) ──
    { url: AHU, id: 'ddcw-fold-reading-graphic' },
    { url: AHU, id: 'ddcw-fold-dt-well' },
    { url: AHU, id: 'ddcw-fold-setpoints' },
    { url: AHU, id: 'ddcw-fold-stat-jumper' },
    { url: AHU, id: 'ddcw-fold-overrides' },
    // ── AHU · wiresheet tab (widening) ──
    { url: AHU, id: 'ddcw-fold-airflow-proof' },
    { url: AHU, id: 'ddcw-fold-heating-valve' },
    { url: AHU, id: 'ddcw-fold-low-limits-drive' },
    { url: AHU, id: 'ddcw-fold-trip-latch' },
    { url: AHU, id: 'ddcw-fold-one-lie' },
    // ── FCU · pilot ──
    { url: FCU, id: 'ddcw-fold-ao-command' },
    // ── FCU · unit tab (widening) ──
    { url: FCU, id: 'ddcw-fold-overrides' },
    { url: FCU, id: 'ddcw-fold-setpoint-convention' },
    { url: FCU, id: 'ddcw-fold-blocked-condenser' },
    { url: FCU, id: 'ddcw-fold-fan-heat-dt' },
    // ── FCU · wiresheet tab (widening) ──
    { url: FCU, id: 'ddcw-fold-safeties-contents' },
    { url: FCU, id: 'ddcw-fold-proof-first' },
    { url: FCU, id: 'ddcw-fold-recovery-order' },
    { url: FCU, id: 'ddcw-fold-off-timer' },
];

// Opening phrases of prose the owner flagged to stay VISIBLE, with the
// reason per row. Substrings, so a copy edit that does not touch the
// opening clause keeps passing. Re-derived from the 2026-08-11 ruling —
// the pilot's background-only list is gone (see the header).
const MUST_STAY_VISIBLE = [
    // One orientation anchor per wiresheet: the first thing on the tab
    // says what the sheet IS. Fold it and the tab opens on a stack of
    // summary bars with nothing naming the drawing below them.
    { url: AHU, text: 'The program driving the unit' },
    { url: FCU, text: 'The program driving the unit' },
    // The drill-downs paragraph carries all three of the AHU's HTML
    // twins for the SVG links (WCAG 2.5.5/2.5.8 equivalent controls),
    // and ddc-workbench-session.spec.js CLICKS the VFD one.
    { url: AHU, text: 'Drill-downs.' },
    // The four control captions — prose that sits with a control and
    // explains what the control in front of it will do. Each page words
    // its pair differently (five points / three points, every field /
    // both fields), so the substrings are per-page rather than shared.
    { url: AHU, text: 'Every field clamps' },
    { url: AHU, text: 'The five points with a sensing device' },
    { url: FCU, text: 'Both fields clamp' },
    { url: FCU, text: 'The three points with a sensing device' },
    // Scope disclaimer on the FCU's coil model: a reader must not have
    // to open anything to learn how far the depiction is meant to go.
    { url: FCU, text: 'Directional only' },
];

// The visible-prose selector set. Wider than the pilot's
// `p.ddcw-sheet-note` because the widening reached prose that never
// carried that class — the AHU teach block (p.ahu-teach-p), both param
// rails (p.ahu-param-note / p.fcu-param-note), the .ref-note family and
// the FCU's p.fcu-note.
const PROSE = 'p.ddcw-sheet-note, p.ahu-teach-p, p.ref-note, p.fcu-note, '
    + 'p.ahu-param-note, p.fcu-param-note';

const wiresheet = async (page, url) => {
    await page.goto(url);
    await page.click('button[data-tab="wiresheet"]');
};

for (const url of [AHU, FCU]) {
    test(`prose folds ship closed and name what they hold — ${url}`, async ({ page }) => {
        await page.goto(url);

        const folds = await page.evaluate(() =>
            [...document.querySelectorAll('details.prose-fold')].map((d) => ({
                id: d.id,
                open: d.open,
                summary: (d.querySelector(':scope > summary')?.textContent || '').trim(),
                // Widened from `p.ddcw-sheet-note` with the 2026-08-11
                // ruling: the fold set reached the AHU teach block, the
                // .ref-note family and p.fcu-note, none of which carry
                // the sheet-note class. The honest generalisation is
                // "at least one paragraph" — the shape claim the
                // assertion was always making.
                notes: d.querySelectorAll(':scope > .prose-fold-body > p').length,
            })));

        const ids = folds.map((f) => f.id);
        for (const id of FOLDS.filter((f) => f.url === url).map((f) => f.id)) {
            expect(ids, 'the shipped fold inventory').toContain(id);
        }

        for (const fold of folds) {
            expect(fold.id, 'every fold carries a kebab-case id so specs can reach it')
                .toMatch(/^[a-z0-9-]+$/);
            expect(fold.open, `${fold.id} ships closed`).toBe(false);
            expect(fold.notes, `${fold.id} folds at least one paragraph`).toBeGreaterThan(0);
            // Never "More info": the summary is the only thing a closed
            // fold tells the reader, so it has to be specific enough to
            // decide on.
            expect(fold.summary.length, `${fold.id} summary says something`).toBeGreaterThan(20);
            expect(fold.summary, `${fold.id} summary is not generic filler`)
                .not.toMatch(/^(more|more info|read more|details|learn more)\b/i);
        }
    });

    test(`the owner's flagged prose stays outside every fold — ${url}`, async ({ page }) => {
        await page.goto(url);

        const rows = MUST_STAY_VISIBLE.filter((n) => n.url === url);
        expect(rows.length, `${url} has flagged prose to check`).toBeGreaterThan(0);

        const found = await page.evaluate(([texts, sel]) => texts.map((t) => {
            const note = [...document.querySelectorAll(sel)]
                .find((p) => p.textContent.replace(/\s+/g, ' ').includes(t));
            return { t, present: !!note, folded: !!note && !!note.closest('details.prose-fold') };
        }), [rows.map((n) => n.text), PROSE]);

        for (const row of found) {
            expect(row.present, `the note opening "${row.t}" still exists`).toBe(true);
            expect(row.folded, `the note opening "${row.t}" is not behind a fold`).toBe(false);
        }
    });
}

test('a fold opens on click and closes again', async ({ page }) => {
    await wiresheet(page, AHU);

    const fold = page.locator('#ddcw-fold-lls-numbers');
    const body = fold.locator('.prose-fold-body');
    const summary = fold.locator('summary');

    await expect(body, 'the folded prose is not on screen at load').toBeHidden();
    await summary.click();
    await expect(body, 'clicking the summary reveals it').toBeVisible();
    await expect(body).toContainText('two low-limit stats on this machine');
    await summary.click();
    await expect(body, 'and clicking again puts it away').toBeHidden();
});

test('the fullscreen cockpit drops the folds with the notes inside them', async ({ page }) => {
    await wiresheet(page, AHU);

    const fold = page.locator('#ddcw-fold-lls-numbers');
    await expect(fold, 'the fold is on the page before fullscreen').toBeVisible();

    // The real path — the card's own button, which carries
    // data-fullscreen-target and lets the toggle resolve its own target.
    await page.click('.tool-card-fullscreen-btn');
    await expect(page.locator('p.ddcw-sheet-note').first(), 'reading prose drops out')
        .toBeHidden();
    await expect(fold, 'and so does its summary bar — no orphaned toggle').toBeHidden();
});
