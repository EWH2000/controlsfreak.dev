const { test, expect } = require('@playwright/test');

// Runtime-derived chip-count guard for the education, practice and
// simulators landings — the section-landing sibling of the /tools/
// chip cross-check in home-hero.spec.js (same drift rationale:
// hand-pinned counts rot silently, so derive every count from the page
// itself and cross-check it against the cards the chip actually
// filters to — a wrong chip can't quietly validate itself).
//
// Two properties per landing:
//   1. COUNT — for every non-All chip, clicking it shows exactly the
//      number of cards its own printed count claims.
//   2. PARTITION — no card is claimed by two chips, and the chips
//      (plus any deliberately chip-less cards) account for every card
//      and for the All chip's printed count.
//
// Coverage is measured by what each click actually shows, not by
// comparing data-category strings — education's Fundamentals chip is
// a JS-level catch-all over several granular card categories, and
// this stays correct however that Set evolves.
//
// The tools landing is deliberately NOT duplicated here — the
// home-count drift guard in home-hero.spec.js already runs this exact
// cross-check on /tools/ as its authoritative-count source.
//
// Simulators joined the chip landings 2026-08-11 (codebase-issues
// #274, activity-based taxonomy). Its counts have no other guard —
// home-hero.spec.js reads /simulators/ for the Browse pill's CARD
// total only and never touches its chips — so it enrolls here.

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    return errors;
}

// Click every non-All chip on the current landing and record what it
// shows. Returns { allCount, totalCards, perChip: [{cat, count, hrefs}] }.
async function auditChips(page) {
    const allCount = parseInt(
        (await page.locator('.filter-chip[data-category="all"] .filter-chip-count').textContent()).trim(), 10);
    const totalCards = await page.locator('.nav-card').count();

    const cats = [];
    for (const chip of await page.locator('.filter-chip[data-category]').all()) {
        const cat = await chip.getAttribute('data-category');
        if (cat === 'all') continue;
        cats.push([cat, parseInt((await chip.locator('.filter-chip-count').textContent()).trim(), 10)]);
    }

    const perChip = [];
    for (const [cat, count] of cats) {
        await page.click(`.filter-chip[data-category="${cat}"]`);
        await expect(page.locator('.nav-card:not([hidden])'),
            `chip "${cat}" count should equal the cards it filters to`).toHaveCount(count);
        const hrefs = await page.locator('.nav-card:not([hidden])')
            .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
        perChip.push({ cat, count, hrefs });
    }

    // [All] restores the full grid.
    await page.click('.filter-chip[data-category="all"]');
    await expect(page.locator('.nav-card:not([hidden])')).toHaveCount(totalCards);

    return { allCount, totalCards, perChip };
}

// Assert no card is shown under two different chips; return the set of
// hrefs claimed by any chip.
function claimedOnce(perChip) {
    const claimed = new Map();
    for (const { cat, hrefs } of perChip) {
        for (const href of hrefs) {
            expect(claimed.has(href),
                `${href} should be claimed by one chip, not both "${claimed.get(href)}" and "${cat}"`).toBe(false);
            claimed.set(href, cat);
        }
    }
    return claimed;
}

test('education landing — every chip count matches its cards and the chips partition All', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/education/');

    const { allCount, totalCards, perChip } = await auditChips(page);
    const claimed = claimedOnce(perChip);

    // Every lesson card is claimed by exactly one chip, and the All
    // chip's printed count is the real card total.
    expect(claimed.size, 'every education card should be claimed by a chip').toBe(totalCards);
    expect(allCount, 'the All chip count should equal the card total').toBe(totalCards);

    expect(errors, 'education chip audit should log no errors').toEqual([]);
});

test('simulators landing — every chip count matches its cards and the chips partition All', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/simulators/');

    const { allCount, totalCards, perChip } = await auditChips(page);
    const claimed = claimedOnce(perChip);

    // Unlike practice, every simulator is claimed — there is no
    // chip-less bucket here, so the activity chips must partition the
    // grid exactly.
    expect(claimed.size, 'every simulator card should be claimed by a chip').toBe(totalCards);
    expect(allCount, 'the All chip count should equal the card total').toBe(totalCards);

    expect(errors, 'simulators chip audit should log no errors').toEqual([]);
});

test('practice landing — every chip count matches its cards and chips + field drills partition All', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/practice/');

    const { allCount, totalCards, perChip } = await auditChips(page);
    const claimed = claimedOnce(perChip);

    // Field drills deliberately carry no chip (a zero-count chip is a
    // UX bug; drills hide under every topic chip) — they are the only
    // cards allowed to go unclaimed.
    const unclaimed = await page.locator('.nav-card').evaluateAll((els) =>
        els.filter((e) => e.getAttribute('data-category') !== null)
            .map((e) => ({ href: e.getAttribute('href'), cat: e.getAttribute('data-category') })));
    for (const { href, cat } of unclaimed) {
        if (claimed.has(href)) continue;
        expect(cat, `${href} has no chip — only field drills may go chip-less`).toBe('field');
    }

    const fieldCount = await page.locator('.nav-card[data-category="field"]').count();
    expect(claimed.size + fieldCount, 'chips + field drills should partition the card total').toBe(totalCards);
    expect(allCount, 'the All chip count should equal the card total').toBe(totalCards);

    expect(errors, 'practice chip audit should log no errors').toEqual([]);
});
