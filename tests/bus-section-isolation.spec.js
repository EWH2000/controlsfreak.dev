// The built page /education/bus-section-isolation.html — the lesson a
// reader PLAYS. This file is the page's whole safety net.
//
// WHY: the page is HIDDEN (`noindex`, no `canonical`,
// `eleventyExcludeFromCollections`), so it is deliberately absent from
// tests/pages.js and therefore from smoke.spec.js, responsive.spec.js and
// contrast-sweep.spec.js. No shared sweep loads it, checks its console,
// measures its ink or looks at it at phone width. Everything those sweeps
// would have done for a listed page is done here by hand, and the hidden
// state itself is pinned so that it cannot leak into the sitemap, the
// search index or a menu by accident. Do not "fix" the omission from
// tests/pages.js — the drift test there checks the manifest against the
// sitemap, which this page must stay out of.
//
// WHAT THE GAME TESTS LEAN ON. The rules live in
// /scripts/bus-isolation-engine.js and are proven in
// bus-isolation-engine.spec.js, against an oracle written from the model.
// This file proves the other half: that the PAGE draws what the engine
// says and nothing else. Each played job runs a second copy of the engine
// here in Node (the MIRROR), feeds it the same picks, and compares the
// page to it after every click — every controller's status word, mark and
// accessible name, the count, the trunk marks, and the feedback sentence.
//
// The picks themselves are NOT taken from the engine. `readerPick()` works
// out the next move from what a reader can see on the page (the trunk
// line, the status words, the "?" marks), the way the lesson's prose tells
// them to. That is what makes "played by the method" a claim about the
// lesson rather than about `BusIsolation.method()` — and the two are then
// required to agree.
//
// "New job" draws a seed from Math.random. The tests pin that one call
// (`dealSeed`) so the job is known; nothing else on the page is stubbed.

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');
const PAGES = require('./pages');
const { expectTouchFloorHeight } = require('./touch-floor');

const URL_PATH = '/education/bus-section-isolation.html';
const SLUG     = 'bus-section-isolation';
const SITE     = path.join(__dirname, '..', '_site');
const SOURCE   = path.join(__dirname, '..', 'html', 'education', SLUG + '.html');
const ENGINE   = path.join(__dirname, '..', 'html', 'scripts', 'bus-isolation-engine.js');

const KINDS = ['layout', 'no-layout', 'flaky'];
// Seeds dealt through "New job": small, large and the top of the range.
// The first set tried (1, 2, 3, 11, 42, 1000, 2^32 - 1) happened to put the
// supervisor or router on the high end all seven times — a 1-in-128 draw
// from a fair generator (0.4999 low over 100,000 spread seeds) — which is
// exactly what the both-ends assertion in the deal tests is there to catch.
const SEEDS = [1, 7, 9, 42, 77, 1000, 4294967295];

function loadEngine() {
    return vm.runInNewContext(fs.readFileSync(ENGINE, 'utf8') + '\n; BusIsolation;', {});
}

// ── Opening the page ───────────────────────────────────────────────────
// The theme is chosen through prefers-color-scheme, which the head
// bootstrap falls back to when nothing is stored — so no test has to write
// cf_theme, and the storage test below can demand an untouched store.
//
// MOTION: tests run with no motion preference unless they ask. The site's
// global prefers-reduced-motion rule gives EVERY property a 0.01ms
// transition, and a computed style read between a click and the next
// frame then returns the transition's start value — the first draft of
// this file read a hidden supervisor box as visible and a 2px focus ring
// as the 3px initial value that way. The game itself declares no motion
// (pinned below), so "no preference" is the mode where a read is exact;
// the reduced-motion test plays through retrying assertions instead.
async function open(page, opts) {
    const o = Object.assign({ theme: 'dark', width: 1280, height: 900, motion: 'no-preference' }, opts);
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));
    await page.setViewportSize({ width: o.width, height: o.height });
    await page.emulateMedia({ colorScheme: o.theme, reducedMotion: o.motion });
    const response = await page.goto(URL_PATH);
    await expect(page.locator('#bsi-plan .bsi-room')).toHaveCount(16);
    await expect(page.locator('html')).toHaveAttribute('data-theme', o.theme);
    return { errors, response };
}

const game     = (page) => page.locator('#bsi-game');
const room     = (page, n) => page.locator(`#bsi-plan .bsi-room[data-bsi-room="${n}"]`);
const jobBtn   = (page, kind) => page.locator(`#bsi-game [data-bsi-job="${kind}"]`);
const feedback = (page) => page.locator('#bsi-feedback');
const count    = (page) => page.locator('#bsi-count');

async function selectJob(page, kind) {
    await jobBtn(page, kind).click();
    await expect(game(page)).toHaveAttribute('data-bsi-kind', kind);
}

// Pin the next Math.random() so "New job" draws exactly `seed`.
// (seed + 0.5) / 2^32 survives the page's floor(random * 2^32) exactly:
// both steps are a power-of-two scale of a number with one fractional bit.
async function dealSeed(page, seed) {
    await page.evaluate((v) => { Math.random = () => v; }, (seed + 0.5) / 4294967296);
    await page.locator('#bsi-new').click();
}

// ── What a reader can see ──────────────────────────────────────────────
async function readPlan(page) {
    return page.evaluate(async () => {
        const g = document.getElementById('bsi-game');
        const plan = document.getElementById('bsi-plan');
        // Let anything in flight inside the game land first (see MOTION
        // above: under reduced motion that is every property, briefly).
        await Promise.all(document.getAnimations()
            .filter((a) => a.effect && g.contains(a.effect.target) &&
                a.effect.getComputedTiming().endTime !== Infinity)
            .map((a) => a.finished.catch(() => null)));
        const shown = (el) => !el.hidden && getComputedStyle(el).visibility !== 'hidden' &&
            el.getClientRects().length > 0;
        const text = (id) => document.getElementById(id).textContent;
        return {
            kind: g.getAttribute('data-bsi-kind'),
            countLabel: text('bsi-count-lbl'),
            count: text('bsi-count'),
            feedback: text('bsi-feedback'),
            found: document.getElementById('bsi-feedback').classList.contains('is-found'),
            routeless: plan.classList.contains('is-routeless'),
            headShown: shown(document.getElementById('bsi-head')),
            headAtTop: document.getElementById('bsi-head').classList.contains('at-top'),
            linksShown: Array.from(plan.querySelectorAll('.bsi-link')).filter(shown).length,
            breaks: plan.querySelectorAll('.bsi-link.is-break').length,
            splits: plan.querySelectorAll('.bsi-link.is-split').length,
            trunk: text('bsi-r-trunk'),
            online: text('bsi-r-online'),
            offline: text('bsi-r-offline'),
            flaky: text('bsi-r-flaky'),
            suspectsShown: shown(document.getElementById('bsi-r-suspects')),
            suspects: text('bsi-r-suspects'),
            rooms: Array.from(plan.querySelectorAll('.bsi-room')).map((b) => {
                const badge = b.querySelector('.bsi-badge');
                return {
                    room: Number(b.getAttribute('data-bsi-room')),
                    number: b.querySelector('.bsi-room-no').textContent,
                    mac: b.querySelector('.bsi-room-mac').textContent,
                    word: b.querySelector('.bsi-room-word').textContent,
                    badge: shown(badge) ? badge.textContent : '',
                    label: b.getAttribute('aria-label'),
                    type: b.getAttribute('type'),
                    tag: b.tagName,
                };
            }),
        };
    });
}

// The next move, worked out from the page the way the prose teaches it.
// Returns the rooms the method allows, best first.
function readerPick(seen) {
    const status = (r) => r.word.toLowerCase();
    const up = /then 201 up to 216$/.test(seen.trunk);
    const down = /then 216 down to 201$/.test(seen.trunk);
    const along = (rooms) => rooms.slice().sort((a, b) => (down ? b.room - a.room : a.room - b.room));

    if (seen.kind === 'layout') {
        // "On a drawn route the dead section starts at the break": walk the
        // route from the supervisor or router to the first dead controller.
        // The break is on the near side of it, so that controller and the
        // live one before it are the two that stand beside the break.
        if (!up && !down) throw new Error('job 1 must draw the route: "' + seen.trunk + '"');
        const order = along(seen.rooms);
        const at = order.findIndex((r) => status(r) === 'offline');
        return [order[at].room, order[at - 1].room];
    }
    if (seen.kind === 'no-layout') {
        // "Start at the highest or the lowest" of the offline rooms — the
        // highest first here — minus an end already tried.
        const dead = seen.rooms.filter((r) => status(r) === 'offline');
        const tried = dead.filter((r) => r.badge === '×').map((r) => r.room);
        const numbers = dead.map((r) => r.room);
        const ends = [Math.max(...numbers), Math.min(...numbers)].filter((n) => !tried.includes(n));
        if (!ends.length) throw new Error('no end of the offline list left to try');
        return ends;
    }
    // "Break it at the midpoint": the middle of whatever can still hold the
    // fault, counted from the supervisor or router's end.
    if (!up && !down) throw new Error('job 3 must draw the route: "' + seen.trunk + '"');
    const marked = seen.rooms.filter((r) => r.badge === '?');
    const pool = along(marked.length ? marked : seen.rooms);
    return [pool[Math.floor((pool.length - 1) / 2)].room];
}

// ── The mirror ─────────────────────────────────────────────────────────
// The page must show exactly what the engine's view() says for a job that
// has had the same picks. `said` is the sentence the page should be
// showing (a pick's text, or the prompt).
async function expectPageShows(page, B, job, said) {
    const v = B.view(job);
    const seen = await readPlan(page);
    const where = `${job.kind} seed ${job.seed} after ${job.stops} ${v.unit}(s)`;

    expect(seen.kind, where).toBe(job.kind);
    expect(seen.countLabel, where).toBe(v.unit === 'stop' ? 'Stops' : 'Splits');
    expect(seen.count, where).toBe(String(v.stops));
    expect(seen.feedback, where).toBe(said);
    expect(seen.found, where).toBe(v.solved);

    const want = v.controllers.map((c) => {
        let label = `Room ${c.room}, MAC ${c.mac}, ${c.status}`;
        if (c.cutOff) label += ', cut off by your split';
        if (c.checked) label += ', you stopped here and the break was on neither side';
        if (c.suspect) label += ', may still be the troublemaker';
        if (c.besideBreak) label += ', beside the break';
        if (c.found) label += ', found: this is the troublemaker';
        return {
            room: c.room,
            number: String(c.room),
            mac: 'MAC ' + c.mac,
            word: c.status[0].toUpperCase() + c.status.slice(1),
            badge: c.found ? '!' : c.checked ? '×' : c.suspect ? '?' : '',
            label,
            type: 'button',
            tag: 'BUTTON',
        };
    });
    expect(seen.rooms, where).toEqual(want);

    // The trunk: drawn only when the engine says the route is known.
    expect(seen.routeless, where).toBe(!v.routeShown);
    expect(seen.headShown, where).toBe(v.routeShown);
    expect(seen.linksShown, where).toBe(v.routeShown ? 17 : 0);
    expect(seen.breaks, where).toBe(v.links.filter((l) => l.state === 'break').length);
    expect(seen.splits, where).toBe(v.links.filter((l) => l.state === 'split').length);
    if (v.routeShown) {
        expect(seen.headAtTop, where).toBe(v.headEnd === 'low');
        expect(seen.trunk, where).toBe(v.headEnd === 'low'
            ? 'Supervisor or router, then 201 up to 216'
            : 'Supervisor or router, then 216 down to 201');
    } else {
        // Parked at the default, so the DOM says nothing about the end.
        expect(seen.headAtTop, where).toBe(true);
        expect(seen.trunk, where).toBe('No layout: route and ends not known');
    }
    expect(seen.suspectsShown, where).toBe(v.suspects !== null);
    return seen;
}

// Play the job on the page by the method until it is found. Returns the
// number of picks made.
async function playByMethod(page, B, job) {
    for (let guard = 0; guard < 8 && !job.solved; guard++) {
        const seen = await readPlan(page);
        const picks = readerPick(seen);
        // The reader's reading and the engine's method are the same set.
        expect(picks.slice().sort(), `${job.kind} seed ${job.seed}: method`)
            .toEqual(Array.from(B.method(job)).sort());
        await room(page, picks[0]).click();
        const result = B.pick(job, picks[0]);
        await expectPageShows(page, B, job, result.text);
    }
    expect(job.solved, `${job.kind} seed ${job.seed}: the method finds it`).toBe(true);
    return job.stops;
}

// ══════════════════════════════════════════════════════════════════════
test.describe('bus section isolation: the page loads, hidden', () => {

    test('200, one h1, the house skeleton, and a clean console through a full game', async ({ page }) => {
        const { errors, response } = await open(page);
        expect(response.status()).toBe(200);
        await expect(page).toHaveTitle('Bus Section Isolation — controlsfreak.dev');
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('h1')).toContainText('Bus Section Isolation');
        await expect(page.locator('main#main')).toHaveCount(1);
        await expect(page.locator('.section-label')).toHaveText('Education · Bus Section Isolation');
        await expect(page.locator('body')).toHaveClass(/education-page/);
        await expect(page.locator('.site-nav-links a.active')).toHaveText(/Education/);
        expect(await page.evaluate(() => typeof window.BusIsolation)).toBe('object');

        // Every control touched once, so a script error on any path shows.
        for (const kind of KINDS) {
            await selectJob(page, kind);
            await room(page, 204).click();
            await room(page, 204).click();
            await dealSeed(page, 7);
            await room(page, 216).click();
            await room(page, 201).click();
        }
        expect(errors).toEqual([]);
    });

    test('exactly one robots noindex, no canonical, and a description of the guarded length', async ({ page }) => {
        await open(page);
        await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
        await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
        await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);

        // descriptionLengthGuard walks collections.getAll(), which an
        // excluded page is not in — so the 140-160 rule is checked here.
        const description = await page.locator('meta[name="description"]').getAttribute('content');
        expect(description.length).toBeGreaterThanOrEqual(140);
        expect(description.length).toBeLessThanOrEqual(160);

        // The frontmatter that makes it hidden, read off the source.
        const front = fs.readFileSync(SOURCE, 'utf8').split('\n---')[0];
        expect(front).toMatch(/^noindex: true$/m);
        expect(front).toMatch(/^eleventyExcludeFromCollections: true$/m);
        expect(front).toMatch(/^nav: education$/m);
        expect(front).toMatch(/^category: protocols$/m);
        expect(front).not.toMatch(/^canonical:/m);
    });

    test('absent from the sitemap, the search index, the page manifest and every menu', async ({ page, request }) => {
        const sitemap = await (await request.get('/sitemap.xml')).text();
        const index = await (await request.get('/search-index.json')).text();
        // Anti-vacuity: these are the real files, and a sibling is in both.
        expect(sitemap).toContain('/education/bacnet-mstp');
        expect(index).toContain('/education/bacnet-mstp.html');
        expect(sitemap).not.toContain(SLUG);
        expect(index).not.toContain(SLUG);
        expect(PAGES.some((p) => String(p).includes(SLUG)), 'tests/pages.js must not list a hidden page')
            .toBe(false);

        // The menus, on the page itself and on the pages most likely to
        // grow a link: every anchor in the document, dropdowns included.
        for (const url of [URL_PATH, '/', '/education/', '/bacnet/', '/education/bacnet-mstp.html',
            '/practice/bacnet-mstp.html']) {
            await page.goto(url);
            const menu = page.locator('.site-nav a[href="/education/bacnet-mstp.html"]');
            expect(await menu.count(), `${url}: the Education menu is in the DOM`).toBeGreaterThan(0);
            await expect(page.locator(`a[href*="${SLUG}"]`), `${url} links to the hidden page`).toHaveCount(0);
        }
    });

    // The strongest form of "nothing links to it": no built page, feed or
    // data file so much as mentions its address.
    test('no built page, feed or data file mentions the address', () => {
        const hits = [];
        let scanned = 0;
        const walk = (dir) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) { walk(full); continue; }
                if (!/\.(html|xml|json|txt|webmanifest)$/.test(entry.name)) continue;
                scanned += 1;
                if (fs.readFileSync(full, 'utf8').includes(SLUG)) hits.push(path.relative(SITE, full));
            }
        };
        walk(SITE);
        expect(scanned, 'sanity: the built site was scanned').toBeGreaterThan(100);
        expect(fs.existsSync(path.join(SITE, 'education', SLUG + '.html')), 'the page itself was built').toBe(true);
        // Not even the page: with no canonical and no og:url it never
        // writes its own address. (The engine script's header comment does,
        // which is why scripts are not in the scan.)
        expect(hits).toEqual([]);
    });
});

// ══════════════════════════════════════════════════════════════════════
test.describe('bus section isolation: the three jobs, played by the method', () => {

    test('job 1 opening: the first dead controller on the drawn route finds the break in one stop', async ({ page }) => {
        const { errors } = await open(page);
        const seen = await readPlan(page);
        // Hand-worked from the opening job (engine spec pins the same one).
        expect(seen.kind).toBe('layout');
        expect(seen.feedback).toBe('Rooms 210 to 216 are offline. Pick the controller where you would stop first.');
        expect(seen.trunk).toBe('Supervisor or router, then 201 up to 216');
        expect(seen.online).toBe('201 to 209 · MAC 1 to 9');
        expect(seen.offline).toBe('210 to 216 · MAC 10 to 16');
        expect(seen.flaky).toBe('none');
        expect(readerPick(seen)).toEqual([210, 209]);

        await room(page, 210).click();
        await expect(feedback(page)).toHaveText(
            'Found it. The break is between 209 and 210. Found in 1 stop, the fewest this job takes.');
        await expect(count(page)).toHaveText('1');
        await expect(feedback(page)).toHaveClass(/is-found/);
        await expect(page.locator('#bsi-plan .bsi-link.is-break')).toHaveCount(1);
        await expect(room(page, 209)).toHaveAttribute('aria-label', 'Room 209, MAC 9, online, beside the break');
        await expect(room(page, 210)).toHaveAttribute('aria-label', 'Room 210, MAC 10, offline, beside the break');

        // A finished job stays finished.
        await room(page, 204).click();
        await expect(feedback(page)).toHaveText('This job is finished. New job deals another.');
        await expect(count(page)).toHaveText('1');
        expect(errors).toEqual([]);
    });

    test('job 2 opening: no route drawn, and the highest offline room finds it in one', async ({ page }) => {
        const { errors } = await open(page);
        await selectJob(page, 'no-layout');
        const B = loadEngine();
        const job = B.newJob('no-layout', B.OPENING['no-layout']);
        const seen = await expectPageShows(page, B, job,
            'Rooms 201 to 205 are offline. Pick the controller where you would stop first.');
        expect(seen.offline).toBe('201 to 205 · MAC 1 to 5');
        expect(seen.online).toBe('206 to 216 · MAC 6 to 16');

        // Nothing on the plan gives the end away: no trunk, no end tag, no
        // supervisor box — hidden, and parked where a low-end job has it
        // although this job's supervisor or router is on the HIGH end.
        expect(job.headEnd).toBe('high');
        expect(seen.routeless).toBe(true);
        expect(seen.headShown).toBe(false);
        expect(seen.headAtTop).toBe(true);
        await expect(page.locator('#bsi-end')).toBeHidden();
        await expect(page.locator('#bsi-head')).toHaveClass(/at-top/);
        await expect(page.locator('#bsi-end')).toHaveClass(/at-bottom/);

        expect(readerPick(seen)).toEqual([205, 201]);
        await room(page, 205).click();
        const result = B.pick(job, 205);
        expect(result.text).toBe(
            'Found it. The break is between 205 and 206. Found in 1 stop, the fewest this job takes.');
        await expectPageShows(page, B, job, result.text);
        // Once found, the route is drawn — from the high end.
        await expect(page.locator('#bsi-head')).toBeVisible();
        await expect(page.locator('#bsi-head')).toHaveClass(/at-bottom/);
        await expect(page.locator('#bsi-r-trunk')).toHaveText('Supervisor or router, then 216 down to 201');
        expect(errors).toEqual([]);
    });

    test('job 3 opening: four midpoint splits walk sixteen suspects down to room 212', async ({ page }) => {
        const { errors } = await open(page);
        await selectJob(page, 'flaky');
        await expect(feedback(page)).toHaveText(
            'All 16 controllers are flaky. Pick a controller to split the trunk past it.');
        await expect(page.locator('#bsi-count-lbl')).toHaveText('Splits');
        await expect(page.locator('#bsi-r-flaky')).toHaveText('201 to 216 · MAC 1 to 16');

        // Each line hand-worked: the troublemaker is in 212 and the
        // supervisor or router is at 201.
        const steps = [
            [208, 'Trunk split past 208: 201 to 208 still connected, 209 to 216 cut off. ' +
                'The connected part went stable, so the troublemaker is in the part cut off. ' +
                'Still holding the fault: 209 to 216.'],
            [212, 'Trunk split past 212: 201 to 212 still connected, 213 to 216 cut off. ' +
                'The connected part is still flaky, so the troublemaker is in it. ' +
                'Still holding the fault: 209 to 212.'],
            [210, 'Trunk split past 210: 201 to 210 still connected, 211 to 216 cut off. ' +
                'The connected part went stable, so the troublemaker is in the part cut off. ' +
                'Still holding the fault: 211 to 212.'],
            [211, 'Trunk split past 211: 201 to 211 still connected, 212 to 216 cut off. ' +
                'The connected part went stable, so the troublemaker is in the part cut off. ' +
                'One controller left: 212 is the troublemaker. ' +
                'Found in 4 splits. Splitting at the midpoint each time takes 4, wherever the troublemaker is.'],
        ];
        for (const [pick, sentence] of steps) {
            expect(readerPick(await readPlan(page)), `midpoint before the split past ${pick}`).toEqual([pick]);
            await room(page, pick).click();
            await expect(feedback(page)).toHaveText(sentence);
        }
        await expect(count(page)).toHaveText('4');
        await expect(room(page, 212)).toHaveAttribute('aria-label',
            'Room 212, MAC 12, offline, cut off by your split, found: this is the troublemaker');
        await expect(room(page, 212).locator('.bsi-badge')).toHaveText('!');
        await expect(page.locator('#bsi-r-suspects')).toHaveText('212 · MAC 12, the troublemaker');
        expect(errors).toEqual([]);
    });

    for (const kind of KINDS) {
        test(`new ${kind} jobs: every deal is drawn as the engine has it and solved by the method`, async ({ page }) => {
            const { errors } = await open(page);
            await selectJob(page, kind);
            const B = loadEngine();
            let job = B.newJob(kind, B.OPENING[kind]);
            await expectPageShows(page, B, job, B.view(job).prompt);

            const heads = new Set();
            const tally = [];
            for (const seed of SEEDS) {
                await dealSeed(page, seed);
                job = B.nextJob(kind, seed, job);
                heads.add(job.headEnd);
                await expectPageShows(page, B, job, 'New job. ' + B.view(job).prompt);
                tally.push(await playByMethod(page, B, job));

                const said = await feedback(page).textContent();
                if (kind === 'layout') {
                    expect(said, `seed ${seed}`).toMatch(
                        /^Found it\. The break is between \d+ and \d+\. Found in 1 stop, the fewest this job takes\.$/);
                } else if (kind === 'no-layout') {
                    expect(said, `seed ${seed}`).toMatch(job.stops === 1
                        ? /^Found it\. The break is between \d+ and \d+\. Found in 1 stop, the fewest this job takes\.$/
                        : /^Found it\. The break is between \d+ and \d+\. Found in 2 stops\. Reading the pattern first gets it in 1\.$/);
                } else {
                    expect(said, `seed ${seed}`).toMatch(
                        /One controller left: \d+ is the troublemaker\. Found in 4 splits\. Splitting at the midpoint each time takes 4, wherever the troublemaker is\.$/);
                }
            }
            // The scores the page quotes, held on every deal.
            if (kind === 'layout') expect(tally).toEqual(SEEDS.map(() => 1));
            if (kind === 'flaky') expect(tally).toEqual(SEEDS.map(() => 4));
            if (kind === 'no-layout') {
                expect(Math.max(...tally)).toBeLessThanOrEqual(2);
                // The highest offline room is the wrong end on some deals:
                // the two-stop path really was walked.
                expect(tally).toContain(2);
                expect(tally).toContain(1);
            }
            // Anti-vacuity: the deals covered both ends of the trunk.
            expect([...heads].sort()).toEqual(['high', 'low']);
            expect(errors).toEqual([]);
        });
    }

    test('"New job" never redeals the fault already on the plan, and each job keeps its own place', async ({ page }) => {
        await open(page);
        const B = loadEngine();
        // Deal the opening job's own seed over the opening job.
        const before = await readPlan(page);
        await dealSeed(page, B.OPENING.layout);
        const after = await readPlan(page);
        expect([after.trunk, after.offline]).not.toEqual([before.trunk, before.offline]);
        expect(after.feedback).toMatch(/^New job\. Rooms \d+ to \d+ are offline\. Pick the controller where you would stop first\.$/);
        expect(after.count).toBe('0');

        // One miss on job 1, then away to job 3 and back: nothing lost.
        const live = after.rooms.filter((r) => r.word === 'Online').map((r) => r.room);
        const inside = live.sort((a, b) => a - b)[1];   // second-lowest live room
        await room(page, inside).click();
        const held = await readPlan(page);
        expect(held.count).toBe('1');
        await selectJob(page, 'flaky');
        await expect(count(page)).toHaveText('0');
        await room(page, 208).click();
        await selectJob(page, 'layout');
        expect(await readPlan(page)).toEqual(held);
        await selectJob(page, 'flaky');
        await expect(count(page)).toHaveText('1');
        await expect(feedback(page)).toHaveText(/^Trunk split past 208: /);
    });
});

// ══════════════════════════════════════════════════════════════════════
test.describe('bus section isolation: a wrong pick says what it found, truthfully', () => {

    test('job 1: dead both sides, a second look for free, live both sides, then the count in the score', async ({ page }) => {
        await open(page);
        await room(page, 213).click();
        await expect(feedback(page)).toHaveText('Dead trunk on both sides of 213. The break is not here.');
        await expect(count(page)).toHaveText('1');
        await expect(room(page, 213).locator('.bsi-badge')).toHaveText('×');
        await expect(room(page, 213)).toHaveAttribute('aria-label',
            'Room 213, MAC 13, offline, you stopped here and the break was on neither side');
        await expect(page.locator('#bsi-plan .bsi-link.is-break'), 'a miss marks nothing on the trunk').toHaveCount(0);

        await room(page, 213).click();
        await expect(feedback(page)).toHaveText(
            'You already stopped at 213. Dead trunk on both sides of 213. The break is not here.');
        await expect(count(page), 'looking again is free').toHaveText('1');

        await room(page, 204).click();
        await expect(feedback(page)).toHaveText('Live trunk on both sides of 204. The break is not here.');
        await room(page, 201).click();
        await expect(feedback(page)).toHaveText('201 is the first controller on the trunk: the supervisor or ' +
            'router on one side, live trunk to 202 on the other. The break is not here.');
        await room(page, 216).click();
        await expect(feedback(page)).toHaveText('216 is the end of the run: dead trunk toward 215, and nothing ' +
            'past it. The break is at the other edge of the dead group.');
        await expect(count(page)).toHaveText('4');
        await expect(feedback(page)).not.toHaveClass(/is-found/);

        await room(page, 209).click();
        await expect(feedback(page)).toHaveText(
            'Found it. The break is between 209 and 210. Found in 5 stops. Reading the layout first gets it in 1.');
        await expect(count(page)).toHaveText('5');
    });

    test('job 2: the wrong end of the offline list and the middle of it both say so', async ({ page }) => {
        await open(page);
        await selectJob(page, 'no-layout');
        // 201 to 205 are dark and the break is between 205 and 206.
        await room(page, 201).click();
        await expect(feedback(page)).toHaveText('201 is the end of the run: dead trunk toward 202, and nothing ' +
            'past it. The break is at the other edge of the dead group.');
        await room(page, 203).click();
        await expect(feedback(page)).toHaveText('Dead trunk on both sides of 203. The break is not here.');
        // Two misses in, the route is still not drawn.
        await expect(page.locator('#bsi-plan')).toHaveClass(/is-routeless/);
        await expect(page.locator('#bsi-head')).toBeHidden();
        expect(readerPick(await readPlan(page)), 'only the other end is left to the method').toEqual([205]);

        await room(page, 205).click();
        await expect(feedback(page)).toHaveText(
            'Found it. The break is between 205 and 206. Found in 3 stops. Reading the pattern first gets it in 1.');
        await expect(page.locator('#bsi-plan')).not.toHaveClass(/is-routeless/);
    });

    test('job 3: a split that cuts nothing off, a split that tells nothing new, and a repeat', async ({ page }) => {
        await open(page);
        await selectJob(page, 'flaky');
        await room(page, 216).click();
        await expect(feedback(page)).toHaveText('216 is the last controller on the trunk, so a split past it ' +
            'cuts nothing off. All 16 controllers are still connected and still flaky. ' +
            'Still holding the fault: 201 to 216.');
        await expect(count(page)).toHaveText('1');
        await expect(page.locator('#bsi-plan .bsi-link.is-split')).toHaveCount(0);
        await expect(page.locator('#bsi-plan .bsi-room.is-flaky')).toHaveCount(16);

        await room(page, 208).click();
        await expect(feedback(page)).toHaveText(/The connected part went stable, so the troublemaker is in the part cut off\. Still holding the fault: 209 to 216\.$/);
        // What the plan shows after that split, read off the controllers.
        await expect(page.locator('#bsi-plan .bsi-room.is-online')).toHaveCount(8);
        await expect(page.locator('#bsi-plan .bsi-room.is-offline')).toHaveCount(8);
        await expect(room(page, 208)).toHaveAttribute('aria-label', 'Room 208, MAC 8, online');
        await expect(room(page, 209)).toHaveAttribute('aria-label',
            'Room 209, MAC 9, offline, cut off by your split, may still be the troublemaker');
        await expect(page.locator('#bsi-r-offline')).toHaveText('209 to 216 · MAC 9 to 16 (cut off by your split)');
        await expect(page.locator('#bsi-r-suspects')).toHaveText('209 to 216 (8 still holding the fault)');
        await expect(page.locator('#bsi-plan .bsi-link.is-split')).toHaveCount(1);

        await room(page, 203).click();
        await expect(feedback(page)).toHaveText('Trunk split past 203: 201 to 203 still connected, 204 to 216 ' +
            'cut off. The connected part went stable, which the earlier splits already told you. ' +
            'Still holding the fault: 209 to 216.');
        await expect(count(page), 'a split that tells nothing still costs one').toHaveText('3');

        await room(page, 203).click();
        await expect(feedback(page)).toHaveText(
            'The trunk is already split past 203. Still holding the fault: 209 to 216.');
        await expect(count(page), 'the same split again is free').toHaveText('3');
        // One split at a time: the mark moved, it did not multiply.
        await expect(page.locator('#bsi-plan .bsi-link.is-split')).toHaveCount(1);
    });
});

// ══════════════════════════════════════════════════════════════════════
test.describe('bus section isolation: reachable without a mouse or colour', () => {

    // Press `key` until the focused element matches; fail rather than spin.
    async function tabTo(page, selector, key) {
        for (let i = 0; i < 160; i++) {
            if (await page.evaluate((s) => Boolean(document.activeElement &&
                document.activeElement.matches(s)), selector)) return i;
            await page.keyboard.press(key || 'Tab');
        }
        throw new Error('focus never reached ' + selector);
    }
    const focusedRoom = (page) => page.evaluate(() =>
        document.activeElement && document.activeElement.getAttribute('data-bsi-room'));
    const focusRing = (page) => page.evaluate(() => {
        const cs = getComputedStyle(document.activeElement);
        return {
            style: cs.outlineStyle,
            width: parseFloat(cs.outlineWidth),
            ringed: document.activeElement.matches(':focus-visible'),
        };
    });

    test('keyboard only: job 3 chosen, split four times and found, focus never lost', async ({ page }) => {
        const { errors } = await open(page);
        await tabTo(page, '[data-bsi-job="flaky"]');
        await page.keyboard.press('Enter');
        await expect(jobBtn(page, 'flaky')).toHaveAttribute('aria-pressed', 'true');
        await expect(jobBtn(page, 'flaky')).toBeFocused();
        expect(await focusRing(page)).toEqual({ style: 'solid', width: 2, ringed: true });

        // New job is next, then the controllers in room order.
        expect(await tabTo(page, '#bsi-new')).toBe(1);
        expect(await tabTo(page, '[data-bsi-room="201"]')).toBe(1);

        expect(await tabTo(page, '[data-bsi-room="208"]')).toBe(7);
        expect(await focusRing(page)).toEqual({ style: 'solid', width: 2, ringed: true });
        await page.keyboard.press('Enter');
        await expect(feedback(page)).toHaveText(/^Trunk split past 208: .* Still holding the fault: 209 to 216\.$/);
        expect(await focusedRoom(page), 'the plan is updated in place, so focus stays put').toBe('208');

        expect(await tabTo(page, '[data-bsi-room="212"]')).toBe(4);
        await page.keyboard.press('Space');
        await expect(feedback(page)).toHaveText(/Still holding the fault: 209 to 212\.$/);
        expect(await focusedRoom(page)).toBe('212');

        expect(await tabTo(page, '[data-bsi-room="210"]', 'Shift+Tab')).toBe(2);
        await page.keyboard.press('Enter');
        await expect(feedback(page)).toHaveText(/Still holding the fault: 211 to 212\.$/);

        expect(await tabTo(page, '[data-bsi-room="211"]')).toBe(1);
        await page.keyboard.press('Space');
        await expect(feedback(page)).toHaveText(/One controller left: 212 is the troublemaker\. Found in 4 splits\./);
        await expect(count(page)).toHaveText('4');
        expect(await focusedRoom(page)).toBe('211');

        // And a new deal, still from the keyboard.
        expect(await tabTo(page, '#bsi-new', 'Shift+Tab')).toBe(11);
        await page.keyboard.press('Enter');
        await expect(feedback(page)).toHaveText(/^New job\. All 16 controllers are flaky\./);
        await expect(page.locator('#bsi-new')).toBeFocused();
        expect(errors).toEqual([]);
    });

    test('every control is a real button with a name that carries room, MAC and status', async ({ page }) => {
        await open(page);
        // Read through the accessibility tree, not the attribute.
        await expect(page.getByRole('button', { name: 'Room 201, MAC 1, online', exact: true })).toHaveCount(1);
        await expect(page.getByRole('button', { name: 'Room 216, MAC 16, offline', exact: true })).toHaveCount(1);
        await expect(page.getByRole('button', { name: /^Room 2\d\d, MAC \d{1,2}, (online|offline|flaky)/ })).toHaveCount(16);
        await expect(page.getByRole('button', { name: 'New job', exact: true })).toHaveCount(1);
        await expect(page.getByRole('group', { name: 'Job' }).getByRole('button')).toHaveCount(3);
        await expect(page.getByRole('group', { name: 'Floor plan · pick a controller' }).getByRole('button')).toHaveCount(16);

        // Nothing clickable in the widget is anything but a <button>.
        expect(await game(page).evaluate((g) => Array.from(g.querySelectorAll('*')).filter((el) =>
            el.tagName !== 'BUTTON' && (el.hasAttribute('tabindex') || el.hasAttribute('onclick') ||
                el.getAttribute('role') === 'button' || el.tagName === 'A')).length)).toBe(0);
        expect(await game(page).locator('button').evaluateAll((bs) => bs.every((b) => b.type === 'button'))).toBe(true);

        // Exactly one job pressed, and it is the one whose call is shown.
        for (const kind of KINDS) {
            await selectJob(page, kind);
            await expect(game(page).locator('[data-bsi-job][aria-pressed="true"]')).toHaveCount(1);
            await expect(jobBtn(page, kind)).toHaveAttribute('aria-pressed', 'true');
            await expect(game(page).locator('[data-bsi-brief]:not([hidden])')).toHaveCount(1);
            await expect(game(page).locator(`[data-bsi-brief="${kind}"]`)).toBeVisible();
        }
    });

    test('results go through one polite live region', async ({ page }) => {
        await open(page);
        const live = page.locator('main [aria-live], main [role="status"], main [role="alert"]');
        await expect(live).toHaveCount(1);
        await expect(live).toHaveAttribute('id', 'bsi-feedback');
        await expect(live).toHaveAttribute('aria-live', 'polite');
        await expect(live).toHaveAttribute('role', 'status');
        // The node is updated, never replaced — a swapped node is a region
        // a screen reader has stopped listening to.
        await page.evaluate(() => { document.getElementById('bsi-feedback').dataset.same = 'yes'; });
        await room(page, 213).click();
        await selectJob(page, 'flaky');
        await dealSeed(page, 3);
        await expect(live).toHaveAttribute('data-same', 'yes');
        await expect(live).toHaveText(/^New job\. /);
    });

    test('status is a word, a shape and a border, not only a colour', async ({ page }) => {
        await open(page);
        const cue = (sel) => page.locator(sel).first().evaluate((b) => {
            const glyph = getComputedStyle(b.querySelector('.bsi-glyph'));
            return {
                word: b.querySelector('.bsi-room-word').textContent,
                wordShown: b.querySelector('.bsi-room-word').getClientRects().length > 0,
                border: getComputedStyle(b).borderTopStyle,
                // filled dot / hollow ring / turned square
                shape: [glyph.borderTopLeftRadius, glyph.borderTopWidth, glyph.transform !== 'none'].join('|'),
            };
        });
        const online = await cue('#bsi-plan .bsi-room.is-online');
        const offline = await cue('#bsi-plan .bsi-room.is-offline');
        await selectJob(page, 'flaky');
        const flaky = await cue('#bsi-plan .bsi-room.is-flaky');

        expect([online.word, offline.word, flaky.word]).toEqual(['Online', 'Offline', 'Flaky']);
        expect([online.wordShown, offline.wordShown, flaky.wordShown]).toEqual([true, true, true]);
        expect([online.border, offline.border, flaky.border]).toEqual(['solid', 'dashed', 'dotted']);
        expect(new Set([online.shape, offline.shape, flaky.shape]).size, 'three different glyph shapes').toBe(3);

        // The marks on the trunk differ in shape too: a split is a bordered
        // square, a break is a borderless cross.
        await room(page, 208).click();
        const split = await page.locator('#bsi-plan .bsi-link.is-split').evaluate((el) =>
            getComputedStyle(el, '::after').borderTopWidth);
        await selectJob(page, 'layout');
        await room(page, 210).click();
        const brk = await page.locator('#bsi-plan .bsi-link.is-break').evaluate((el) =>
            getComputedStyle(el, '::after').borderTopWidth);
        expect([split, brk]).toEqual(['2px', '0px']);
        // And the pressed job is marked by more than its border colour.
        expect(await jobBtn(page, 'layout').evaluate((b) => getComputedStyle(b).boxShadow)).not.toBe('none');
        expect(await jobBtn(page, 'flaky').evaluate((b) => getComputedStyle(b).boxShadow)).toBe('none');
    });

    test('nothing in the game moves: no transition, no animation', async ({ page }) => {
        await open(page);
        await selectJob(page, 'flaky');
        await room(page, 208).click();
        const moving = await game(page).evaluate((g) => {
            const out = [];
            for (const el of [g].concat(Array.from(g.querySelectorAll('*')))) {
                for (const pseudo of [null, '::before', '::after']) {
                    const cs = getComputedStyle(el, pseudo);
                    const timed = cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0);
                    if (timed || cs.animationName !== 'none') out.push(el.className + (pseudo || ''));
                }
            }
            const running = document.getAnimations().filter((a) => a.effect && g.contains(a.effect.target));
            return { out, running: running.length, scanned: g.querySelectorAll('*').length };
        });
        expect(moving.scanned).toBeGreaterThan(100);
        expect(moving.out).toEqual([]);
        expect(moving.running).toBe(0);
    });

    // Asked for reduced motion, the site's global rule gives every property
    // a 0.01ms transition. The game has to keep working under it, and
    // still have nothing of its own that moves.
    test('with reduced motion asked for, the jobs play the same and nothing animates', async ({ page }) => {
        const { errors } = await open(page, { motion: 'reduce' });
        expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
        await room(page, 213).click();
        await expect(feedback(page)).toHaveText('Dead trunk on both sides of 213. The break is not here.');
        await room(page, 210).click();
        await expect(feedback(page)).toHaveText(
            'Found it. The break is between 209 and 210. Found in 2 stops. Reading the layout first gets it in 1.');
        await expect(page.locator('#bsi-plan .bsi-link.is-break')).toHaveCount(1);

        await selectJob(page, 'no-layout');
        await expect(page.locator('#bsi-head')).toBeHidden();
        await room(page, 205).click();
        await expect(page.locator('#bsi-head')).toBeVisible();

        await selectJob(page, 'flaky');
        const B = loadEngine();
        expect(await playByMethod(page, B, B.newJob('flaky', B.OPENING.flaky))).toBe(4);

        const motion = await game(page).evaluate((g) => {
            let longest = 0;
            const named = [];
            for (const el of [g].concat(Array.from(g.querySelectorAll('*')))) {
                const cs = getComputedStyle(el);
                for (const d of cs.transitionDuration.split(',')) longest = Math.max(longest, parseFloat(d));
                if (cs.animationName !== 'none') named.push(el.className);
            }
            return { longest, named };
        });
        // 0.01ms, as seconds — the site's rule and nothing longer.
        expect(motion.longest).toBeLessThanOrEqual(0.00001);
        expect(motion.named).toEqual([]);
        expect(errors).toEqual([]);
    });
});

// ══════════════════════════════════════════════════════════════════════
test.describe('bus section isolation: the drawn trunk reads in order', () => {

    // Controllers must snake: each one beside or directly below the one
    // before it, with the link between them drawn in the gap.
    async function geometry(page) {
        return page.evaluate(() => {
            // Measured from the plan's own corner, rounded: a click scrolls
            // the page and each job's call is a different length, so
            // viewport coordinates would compare nothing.
            const plan = document.getElementById('bsi-plan');
            const origin = plan.getBoundingClientRect();
            const px = (n) => Math.round(n * 100) / 100;
            const box = (el) => {
                const r = el.getBoundingClientRect();
                const l = r.left - origin.left;
                const t = r.top - origin.top;
                return { l: px(l), t: px(t), r: px(l + r.width), b: px(t + r.height),
                    cx: px(l + r.width / 2), cy: px(t + r.height / 2) };
            };
            return {
                plan: box(plan),
                rooms: Array.from(plan.querySelectorAll('.bsi-room')).map(box),
                links: Array.from(plan.querySelectorAll('.bsi-link:not(.is-cap)')).map(box),
                headLink: box(plan.querySelector('.bsi-link.is-cap:not(.is-tail)')),
                tailLink: box(plan.querySelector('.bsi-link.is-tail')),
                head: box(document.getElementById('bsi-head')),
                end: box(document.getElementById('bsi-end')),
            };
        });
    }

    function expectSnake(g, perRow) {
        expect(g.rooms).toHaveLength(16);
        expect(g.links).toHaveLength(15);
        const near = (a, b) => Math.abs(a - b) < 1;
        expect(new Set(g.rooms.map((r) => Math.round(r.t))).size, 'rows of controllers').toBe(16 / perRow);
        for (let i = 0; i < 15; i++) {
            const a = g.rooms[i];
            const b = g.rooms[i + 1];
            const link = g.links[i];
            const sameRow = near(a.t, b.t);
            const turn = (i + 1) % perRow === 0;
            expect(sameRow, `room ${201 + i} to ${202 + i}`).toBe(!turn);
            if (sameRow) {
                // Neighbours: the gap between them is one link wide and the
                // link fills it.
                const gapL = Math.min(a.r, b.r);
                const gapR = Math.max(a.l, b.l);
                expect(gapR - gapL, `gap ${201 + i}-${202 + i}`).toBeLessThan(20);
                expect(gapR - gapL).toBeGreaterThan(4);
                expect(near(link.l, gapL) && near(link.r, gapR), `link ${201 + i}-${202 + i} spans the gap`).toBe(true);
                expect(link.cy > a.t && link.cy < a.b).toBe(true);
            } else {
                // A turn: same column, next row down, link in the gap.
                expect(near(a.l, b.l), `turn at ${201 + i}`).toBe(true);
                expect(b.t).toBeGreaterThan(a.b);
                expect(near(link.t, a.b) && near(link.b, b.t), `link ${201 + i}-${202 + i} spans the turn`).toBe(true);
                expect(link.cx > a.l && link.cx < a.r).toBe(true);
            }
        }
        // Every row reads against the one above it.
        for (let i = 0; i + 2 < 16; i += perRow) {
            const first = g.rooms[i];
            const second = g.rooms[i + 1];
            expect(second.l > first.l, `row from ${201 + i}`).toBe((i / perRow) % 2 === 0);
        }
    }

    for (const [width, perRow] of [[1280, 8], [375, 4]]) {
        test(`${width}px: a snake of ${perRow}, the supervisor or router at whichever end the job puts it`, async ({ page }) => {
            await open(page, { width });
            // Opening job 1: the supervisor or router on the low end.
            let g = await geometry(page);
            expectSnake(g, perRow);
            const r201 = g.rooms[0];
            const r216 = g.rooms[15];
            expect(g.head.b).toBeLessThan(r201.t);
            expect(g.headLink.cx > r201.l && g.headLink.cx < r201.r).toBe(true);
            expect(Math.abs(g.headLink.b - r201.t)).toBeLessThan(1);
            expect(Math.abs(g.headLink.t - g.head.b)).toBeLessThan(1);
            expect(g.end.t).toBeGreaterThan(r216.b);
            expect(g.tailLink.cx > r216.l && g.tailLink.cx < r216.r).toBe(true);
            expect(Math.abs(g.tailLink.t - r216.b)).toBeLessThan(1);

            // Job 2 solved: the supervisor or router on the HIGH end, so the
            // two ends swap and the snake itself does not move.
            await selectJob(page, 'no-layout');
            await room(page, 205).click();
            await expect(page.locator('#bsi-head')).toBeVisible();
            const h = await geometry(page);
            expectSnake(h, perRow);
            expect(h.rooms).toEqual(g.rooms);
            expect(h.head.t).toBeGreaterThan(h.rooms[15].b);
            expect(Math.abs(h.headLink.t - h.rooms[15].b)).toBeLessThan(1);
            expect(h.end.b).toBeLessThan(h.rooms[0].t);
            expect(Math.abs(h.tailLink.b - h.rooms[0].t)).toBeLessThan(1);
            // The plan is the same height on every job.
            expect(h.plan.b - h.plan.t).toBeCloseTo(g.plan.b - g.plan.t, 1);
        });
    }

    // Does everything in the game fit at the current viewport width?
    async function expectFits(page, width, state) {
        const m = await page.evaluate(() => {
            const doc = document.documentElement;
            const g = document.getElementById('bsi-game').getBoundingClientRect();
            const shown = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
            const all = Array.from(document.querySelectorAll('#bsi-game *')).filter(shown);
            return {
                scrollWidth: doc.scrollWidth,
                clientWidth: doc.clientWidth,
                bodyScroll: document.body.scrollWidth,
                widget: [g.left, g.right],
                // Anything poking out of the widget's own box.
                outside: all.filter((el) => {
                    const r = el.getBoundingClientRect();
                    return r.left < g.left - 0.5 || r.right > g.right + 0.5;
                }).map((el) => el.className || el.id || el.tagName),
                // A controller whose own text does not stay inside its
                // border, with a hair to spare: text that only just
                // touches the border reads as clipped.
                clipped: Array.from(document.querySelectorAll('#bsi-plan .bsi-room')).filter((b) => {
                    const r = b.getBoundingClientRect();
                    return b.scrollWidth > b.clientWidth || Array.from(b.children).some((c) => {
                        if (c.getClientRects().length === 0) return false;
                        const cr = c.getBoundingClientRect();
                        return cr.right > r.right - 1.5 || cr.bottom > r.bottom - 1.5 || cr.left < r.left + 1.5;
                    });
                }).map((b) => b.getAttribute('data-bsi-room')),
                // The status word of every controller is on screen.
                words: Array.from(document.querySelectorAll('#bsi-plan .bsi-room-word')).filter(shown).length,
                measured: all.length,
            };
        });
        const where = `${width}px, ${state}`;
        expect(m.measured, where).toBeGreaterThan(80);
        expect(m.words, where).toBe(16);
        expect(m.scrollWidth, `${where}: page scrolls sideways`).toBeLessThanOrEqual(m.clientWidth);
        expect(m.bodyScroll, `${where}: body scrolls sideways`).toBeLessThanOrEqual(width);
        expect(m.widget[0], where).toBeGreaterThanOrEqual(0);
        expect(m.widget[1], where).toBeLessThanOrEqual(width);
        expect(m.outside, `${where}: outside the widget`).toEqual([]);
        expect(m.clipped, `${where}: controller text clipped`).toEqual([]);
    }

    test('375px: no sideways scroll and nothing clipped, in every job, before and after it is found', async ({ page }) => {
        const { errors } = await open(page, { width: 375, height: 800 });
        const B = loadEngine();
        for (const kind of KINDS) {
            await selectJob(page, kind);
            const job = B.newJob(kind, B.OPENING[kind]);
            await expectFits(page, 375, `${kind} opening`);
            // The longest sentences and every mark: a miss, then the find.
            await room(page, kind === 'no-layout' ? 201 : 216).click();
            B.pick(job, kind === 'no-layout' ? 201 : 216);
            await expectFits(page, 375, `${kind} after a miss`);
            await playByMethod(page, B, job);
            await expectFits(page, 375, `${kind} found`);
        }
        expect(errors).toEqual([]);
    });

    // OFFLINE is the widest word a controller carries, and the first draft
    // of the page spilled it over the controller's border at 375px — and,
    // once measured, at every width from 721px to about 820px too, where
    // eight across was still in force. So the layout is walked across both
    // breakpoints (900/901 for the snake, 480/481 and 359/360 for the
    // phone rules), not checked at one width.
    test('every width from 320px up: the plan fits, with the widest status word showing', async ({ page }) => {
        await open(page);
        for (const width of [320, 359, 360, 375, 414, 480, 481, 600, 720, 768, 900, 901, 1024, 1280, 1920]) {
            await page.setViewportSize({ width, height: 900 });
            for (const kind of ['layout', 'flaky']) {
                await selectJob(page, kind);
                await expectFits(page, width, `${kind} opening`);
            }
            const perRow = await page.evaluate(() => new Set(Array.from(
                document.querySelectorAll('#bsi-plan .bsi-room')).slice(0, 8)
                .map((b) => Math.round(b.getBoundingClientRect().top))).size);
            expect(perRow, `${width}px: rows taken by the first eight controllers`).toBe(width <= 900 ? 2 : 1);
        }
    });

    test('touch: every control in the game is at least 44px tall', async ({ browser }) => {
        // isMobile + hasTouch is what makes (hover: none) match.
        const context = await browser.newContext({
            isMobile: true, hasTouch: true, viewport: { width: 412, height: 883 }, colorScheme: 'dark',
        });
        const page = await context.newPage();
        await page.goto(URL_PATH);
        await expect(page.locator('#bsi-plan .bsi-room')).toHaveCount(16);
        expect(await page.evaluate(() => matchMedia('(hover: none)').matches)).toBe(true);
        const controls = page.locator('#bsi-game button');
        await expect(controls).toHaveCount(20);
        for (let i = 0; i < 20; i++) {
            const box = await controls.nth(i).boundingBox();
            expectTouchFloorHeight(box, await controls.nth(i).evaluate((b) => b.getAttribute('aria-label') || b.textContent));
        }
        await context.close();
    });
});

// ══════════════════════════════════════════════════════════════════════
test.describe('bus section isolation: the ink is readable in both themes', () => {

    // Every element in the widget that paints its own text, measured the
    // way contrast-sweep.spec.js and quiz-numeric-input.spec.js measure:
    // opacity composited up the ancestor chain, backdrop found by walking
    // out to the first opaque background. This page is in no manifest, so
    // the shared sweep never sees it — this is its sweep.
    async function sweep(page) {
        return page.evaluate(async () => {
            await Promise.all(document.getAnimations()
                .filter((a) => a.effect && a.effect.getComputedTiming().endTime !== Infinity)
                .map((a) => a.finished.catch(() => null)));
            const parse = (s) => {
                const m = /rgba?\(([^)]+)\)/.exec(s || '');
                if (!m) return null;
                const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
                if (p.length < 3 || p.some((n) => !isFinite(n))) return null;
                return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
            };
            const over = (fg, bg) => ({
                r: fg.r * fg.a + bg.r * (1 - fg.a),
                g: fg.g * fg.a + bg.g * (1 - fg.a),
                b: fg.b * fg.a + bg.b * (1 - fg.a),
                a: 1,
            });
            const lum = (c) => {
                const f = (v) => {
                    const s = v / 255;
                    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
                };
                return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
            };
            const ratio = (a, b) => {
                const la = lum(a), lb = lum(b);
                return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
            };
            const hex = (c) => '#' + [c.r, c.g, c.b]
                .map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

            const measure = (el) => {
                const chain = [];
                for (let n = el; n; n = n.parentElement) chain.push(n);
                let opacity = 1;
                for (const n of chain) opacity *= parseFloat(getComputedStyle(n).opacity);
                const layers = [];
                for (const n of chain) {
                    const bg = parse(getComputedStyle(n).backgroundColor);
                    if (bg && bg.a > 0) { layers.push(bg); if (bg.a >= 1) break; }
                }
                let backdrop = { r: 255, g: 255, b: 255, a: 1 };
                for (let i = layers.length - 1; i >= 0; i--) backdrop = over(layers[i], backdrop);
                const raw = parse(getComputedStyle(el).color);
                const ink = over(Object.assign({}, raw, { a: raw.a * opacity }), backdrop);
                return {
                    what: (el.className || el.id || el.tagName) + ' "' + el.textContent.trim().slice(0, 24) + '"',
                    ratio: Math.round(ratio(ink, backdrop) * 100) / 100,
                    ink: hex(ink),
                    backdrop: hex(backdrop),
                    px: parseFloat(getComputedStyle(el).fontSize),
                };
            };
            const g = document.getElementById('bsi-game');
            const owners = Array.from(g.querySelectorAll('*')).filter((el) =>
                el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' &&
                Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim() !== ''));
            return {
                theme: document.documentElement.getAttribute('data-theme'),
                sanity: ratio({ r: 255, g: 255, b: 255, a: 1 }, { r: 0, g: 0, b: 0, a: 1 }),
                widget: hex(parse(getComputedStyle(g).backgroundColor)),
                rows: owners.map(measure),
            };
        });
    }

    for (const theme of ['dark', 'light']) {
        test(`${theme}: every piece of text in the game clears 4.5:1 on its real background`, async ({ page }) => {
            await open(page, { theme });
            const seenWords = new Set();
            const seenMarks = new Set();
            const seenClasses = new Set();
            const failures = [];
            let measured = 0;
            let smallest = Infinity;
            const take = async (state) => {
                const s = await sweep(page);
                expect(s.theme, state).toBe(theme);
                expect(s.sanity).toBeCloseTo(21, 5);
                for (const row of s.rows) {
                    measured += 1;
                    smallest = Math.min(smallest, row.ratio);
                    seenClasses.add(row.what.split(' ')[0]);
                    const text = /"(.*)"$/.exec(row.what)[1];
                    if (['Online', 'Offline', 'Flaky'].includes(text)) seenWords.add(text);
                    if (['×', '?', '!'].includes(text)) seenMarks.add(text);
                    // One floor for everything: nothing here is claimed as
                    // large text, so nothing gets the 3:1 allowance.
                    if (!(row.ratio >= 4.5)) failures.push(`${state}: ${row.what} ${row.ratio}:1 (${row.ink} on ${row.backdrop}, ${row.px}px)`);
                }
            };

            await take('job 1 opening');
            await room(page, 213).click();                 // × on a dead controller
            await room(page, 204).click();                 // × on a live one
            await take('job 1 after two misses');
            await room(page, 210).click();
            await take('job 1 found');
            await selectJob(page, 'no-layout');
            await take('job 2 opening');
            await selectJob(page, 'flaky');
            await take('job 3 opening');                   // flaky words
            await room(page, 208).click();
            await take('job 3 after a split');             // ? marks, cut-off words
            await room(page, 212).click();
            await room(page, 210).click();
            await room(page, 211).click();
            await take('job 3 found');                     // ! mark
            await jobBtn(page, 'flaky').hover();
            await take('job button hovered');
            await page.locator('#bsi-new').hover();
            await take('New job hovered');
            await room(page, 205).hover();
            await take('controller hovered');

            expect(failures).toEqual([]);
            // Anti-vacuity: the sweep saw the things it exists to measure.
            expect(measured).toBeGreaterThan(600);
            expect([...seenWords].sort()).toEqual(['Flaky', 'Offline', 'Online']);
            expect([...seenMarks].sort()).toEqual(['!', '?', '×']);
            for (const cls of ['bsi-room-no', 'bsi-room-mac', 'bsi-room-word', 'bsi-badge', 'bsi-job-btn',
                'bsi-new', 'bsi-job-title', 'bsi-feedback', 'bsi-head', 'bsi-end', 'widget-readout-label',
                'widget-readout-value']) {
                expect([...seenClasses], 'the sweep should have measured .' + cls).toContain(cls);
            }
            expect(smallest).toBeGreaterThanOrEqual(4.5);
        });
    }

    test('the two themes really are two backgrounds', async ({ page }) => {
        const seen = {};
        for (const theme of ['dark', 'light']) {
            await open(page, { theme });
            seen[theme] = await game(page).evaluate((g) => getComputedStyle(g).backgroundColor);
        }
        expect(seen.dark).not.toBe(seen.light);
    });
});

// ══════════════════════════════════════════════════════════════════════
test.describe('bus section isolation: what the page keeps, and what it says', () => {

    test('playing writes nothing to localStorage, sessionStorage or cookies', async ({ page }) => {
        // Record every write, not just what is left afterwards: a key set
        // and then removed would leave both stores empty.
        await page.addInitScript(() => {
            window.__bsiWrites = [];
            for (const method of ['setItem', 'removeItem', 'clear']) {
                const real = Storage.prototype[method];
                Storage.prototype[method] = function (...args) {
                    window.__bsiWrites.push((this === window.sessionStorage ? 'session.' : 'local.') +
                        method + '(' + (args[0] === undefined ? '' : args[0]) + ')');
                    return real.apply(this, args);
                };
            }
        });
        await open(page);
        const B = loadEngine();
        for (const kind of KINDS) {
            await selectJob(page, kind);
            await playByMethod(page, B, B.newJob(kind, B.OPENING[kind]));
            await dealSeed(page, 99);
            await room(page, 207).click();
        }
        const kept = await page.evaluate(() => ({
            hooked: Array.isArray(window.__bsiWrites),
            writes: window.__bsiWrites,
            local: Object.keys(localStorage),
            session: Object.keys(sessionStorage),
            cookie: document.cookie,
        }));
        expect(kept).toEqual({ hooked: true, writes: [], local: [], session: [], cookie: '' });
        // Anti-vacuity: the hook does see a write when one happens.
        await page.evaluate(() => sessionStorage.setItem('bsi-probe', '1'));
        expect(await page.evaluate(() => window.__bsiWrites)).toEqual(['session.setItem(bsi-probe)']);

        // And the source asks for none (comments aside).
        const code = fs.readFileSync(SOURCE, 'utf8').split('{% block scripts %}')[1]
            .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
        for (const banned of ['localStorage', 'sessionStorage', 'cookie', 'setTimeout', 'setInterval',
            'requestAnimationFrame']) {
            expect(code.includes(banned), 'the page script must not use ' + banned).toBe(false);
        }
    });

    test('a reload starts over: nothing was remembered', async ({ page }) => {
        await open(page);
        await room(page, 213).click();
        await dealSeed(page, 5);
        await page.reload();
        await expect(page.locator('#bsi-plan .bsi-room')).toHaveCount(16);
        await expect(count(page)).toHaveText('0');
        await expect(feedback(page)).toHaveText(
            'Rooms 210 to 216 are offline. Pick the controller where you would stop first.');
    });

    // The owner's rules for this page, pinned where a later edit would
    // otherwise have nothing to stop it. His story is told once, in his
    // words; the page never explains what the meter showed or why; and the
    // head of the trunk is only ever "the supervisor or router". (A brand
    // slipping in is not something a word list can catch without naming
    // brands in a public repo, so that one is pinned from the other side:
    // the engine's HEAD_NAME, and the phrase's count in the prose.)
    test('the story is told once, and the page says nothing about the meter beyond his words', async ({ page }) => {
        await open(page);
        const lesson = page.locator('main .tool-card');
        await expect(lesson.locator('.callout')).toHaveCount(1);
        await expect(lesson.locator('.callout strong')).toHaveText('True story.');
        const prose = (await lesson.innerText()).replace(/\s+/g, ' ');
        expect(prose.match(/True story\./g)).toHaveLength(1);
        expect(prose.match(/\bDMM\b/g), 'his word, used once, in his story').toHaveLength(1);
        for (const banned of [/capacit/i, /\bvolt/i, /\bohm/i, /resistan/i, /\bmillivolt/i, /\breading of\b/i,
            /multimeter/i, /oscilloscope/i, /plain.english/i, /coming soon/i,
            /\bcustomer\b/i, /\bschool\b/i, /\bhospital\b/i]) {
            expect(prose, 'the lesson must not say ' + banned).not.toMatch(banned);
        }
        expect(await page.evaluate(() => window.BusIsolation.HEAD_NAME)).toBe('the supervisor or router');
        expect(prose.match(/supervisor or router/gi).length).toBeGreaterThanOrEqual(5);
        // The made-up job is called made up, in the prose and in each call.
        expect(prose).toMatch(/One made-up floor/);
        const briefs = await page.locator('#bsi-game [data-bsi-brief]').evaluateAll((els) =>
            els.map((el) => el.textContent.replace(/\s+/g, ' ').trim()));
        expect(briefs).toHaveLength(3);
        for (const brief of briefs) expect(brief).toMatch(/A made-up call:/);
    });

    test('every link out of the lesson lands on a real page and a real anchor', async ({ page, request }) => {
        await open(page);
        const hrefs = await page.locator('main a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
        expect(hrefs).toContain('/education/bacnet-mstp.html#two-wires');
        expect(hrefs).toContain('/education/bacnet-mstp.html#symptom-layer');
        expect(hrefs).toContain('/bacnet/');
        expect(hrefs).toContain('/practice/bacnet-mstp.html');
        for (const href of new Set(hrefs)) {
            const [file, anchor] = href.split('#');
            const res = await request.get(file);
            expect(res.status(), href).toBe(200);
            if (anchor) expect(await res.text(), href).toContain(`id="${anchor}"`);
        }
    });
});
