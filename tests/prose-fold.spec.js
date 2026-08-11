// Behavioral tests for the details.prose-fold disclosure — the glossary
// arc's collapse pilot (docs/glossary-arc.md, 2026-08-10).
//
// The pattern is shared (styles.css "PROSE FOLD" + /scripts/prose-fold.js)
// and lands on two pages at once, so it gets its own spec named after the
// script rather than assertions duplicated into each page spec — the
// tests/fullscreen-toggle.spec.js shape, and for the same reason: what is
// under test is the mechanism, not either page's content.
//
// The four things worth pinning:
//   * folds ship CLOSED, with a summary that names what is inside. Ship
//     one open and the pilot has bought the reader nothing; ship one with
//     a generic "more" and the reader cannot tell whether to open it.
//   * the toggle works. Native <details> needs no JS for this, which is
//     exactly why nothing else would notice if a stylesheet rule ever
//     broke the summary's hit area.
//   * print force-opens every CLOSED fold and restores EXACTLY those —
//     the one job /scripts/prose-fold.js has. A shim that closed every
//     fold afterward would silently discard a reader's own open state.
//   * the fullscreen cockpit drops the folds along with the sheet notes
//     inside them. Dropping only the notes leaves orphaned summary bars.
//
// Plus the editorial guard, which is the part a future editor is most
// likely to break: the owner's rule is that "what is this machine doing
// right now" prose stays VISIBLE and only "what is this thing"
// background folds. The live-walkthrough notes are asserted to be
// outside every fold, by their opening phrases. The FCU's proof note is
// the load-bearing one — ddc-workbench-fcu-safeties.spec.js drives the
// reader's path click for click from it.

const { test, expect } = require('@playwright/test');

const AHU = '/simulators/ddc-workbench.html';
const FCU = '/simulators/ddc-workbench-fcu.html';

// The fold inventory as shipped. Pinned by id, not by count: a fold that
// is renamed or dropped fails here, and a NEW fold still has to satisfy
// the closed-on-load sweep below even though it is not listed.
const FOLDS = [
    { url: AHU, id: 'ddcw-fold-econ-permit' },
    { url: AHU, id: 'ddcw-fold-lls-numbers' },
    { url: AHU, id: 'ddcw-fold-lls-defeats' },
    { url: FCU, id: 'ddcw-fold-ao-command' },
];

// Opening phrases of notes that must NOT be folded — the live-reading
// half of the owner's split. Substrings, so a copy edit that does not
// touch the opening clause keeps passing.
const MUST_STAY_VISIBLE = [
    { url: AHU, text: 'The program driving the unit' },
    { url: AHU, text: 'Airflow proof gates both coils' },
    { url: AHU, text: 'The low-limits sample splices two winter protections' },
    { url: AHU, text: 'A trip is the classic freezestat response' },
    { url: AHU, text: 'The cleanest way to see all of it is one lie' },
    // Spec-pinned: ddc-workbench-fcu-safeties.spec.js walks the reader's
    // path from this note. Folding it would move the instructions behind
    // a click the spec never makes.
    { url: FCU, text: 'Why proof has to come first' },
    { url: FCU, text: 'Watch the recovery order' },
    { url: FCU, text: 'Note what that off-timer watches' },
];

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
                notes: d.querySelectorAll(':scope > .prose-fold-body > p.ddcw-sheet-note').length,
            })));

        const ids = folds.map((f) => f.id);
        for (const id of FOLDS.filter((f) => f.url === url).map((f) => f.id)) {
            expect(ids, 'the shipped fold inventory').toContain(id);
        }

        for (const fold of folds) {
            expect(fold.id, 'every fold carries a kebab-case id so specs can reach it')
                .toMatch(/^[a-z0-9-]+$/);
            expect(fold.open, `${fold.id} ships closed`).toBe(false);
            expect(fold.notes, `${fold.id} folds at least one sheet note`).toBeGreaterThan(0);
            // Never "More info": the summary is the only thing a closed
            // fold tells the reader, so it has to be specific enough to
            // decide on.
            expect(fold.summary.length, `${fold.id} summary says something`).toBeGreaterThan(20);
            expect(fold.summary, `${fold.id} summary is not generic filler`)
                .not.toMatch(/^(more|more info|read more|details|learn more)\b/i);
        }
    });

    test(`live-reading sheet notes stay outside every fold — ${url}`, async ({ page }) => {
        await page.goto(url);

        const rows = MUST_STAY_VISIBLE.filter((n) => n.url === url);
        const found = await page.evaluate((texts) => texts.map((t) => {
            const note = [...document.querySelectorAll('p.ddcw-sheet-note')]
                .find((p) => p.textContent.replace(/\s+/g, ' ').includes(t));
            return { t, present: !!note, folded: !!note && !!note.closest('details.prose-fold') };
        }), rows.map((n) => n.text));

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

test('print force-opens the closed folds and restores exactly those', async ({ page }) => {
    await page.goto(AHU);

    // One fold opened by the "reader" first: the shim must leave it open
    // after printing, because it was not the shim that opened it.
    await page.evaluate(() => { document.getElementById('ddcw-fold-econ-permit').open = true; });

    const duringPrint = await page.evaluate(() => {
        window.dispatchEvent(new Event('beforeprint'));
        return [...document.querySelectorAll('details.prose-fold')].every((d) => d.open);
    });
    expect(duringPrint, 'every fold is open inside the print box').toBe(true);

    const afterPrint = await page.evaluate(() => {
        window.dispatchEvent(new Event('afterprint'));
        return Object.fromEntries(
            [...document.querySelectorAll('details.prose-fold')].map((d) => [d.id, d.open]));
    });
    expect(afterPrint['ddcw-fold-econ-permit'], 'the reader-opened fold stays open').toBe(true);
    expect(afterPrint['ddcw-fold-lls-numbers'], 'the shim closes what the shim opened').toBe(false);
    expect(afterPrint['ddcw-fold-lls-defeats'], 'the shim closes what the shim opened').toBe(false);
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
