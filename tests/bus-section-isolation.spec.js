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
// page to it after every click — every controller's status word, mark,
// classes and accessible name, the count, the four report rows, the
// feedback sentence, and the trunk marks: not how many there are but WHICH
// two controllers each one is drawn between, measured off the screen as the
// two rooms whose shared wall the mark sits on.
//
// THE PLAN. The page draws the floor as a plan: rooms round a corridor
// loop, a core in the middle, the supervisor or router in the electrical
// room. The room numbers walk the ring, so 201 and 216 share a wall, and
// they are the two ends of the trunk, which never joins them. Two of the
// engine's sentences on the no-layout job say exactly that ("On the plan
// 201 is next to 216, but the trunk does not join them"), so the block
// "the floor plan" below pins it on the drawn page, at both layouts and
// for both ends: every pair of consecutive rooms shares a wall and its own
// link, 201 and 216 share a wall and no link, and no other two rooms that
// are not consecutive share one.
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

// Measuring the drawn plan, installed into every page the tests open (an
// init script, so it survives a navigation). Everything is measured from
// the plan's own corner: a click scrolls the page, and each job's call is
// a different length, so viewport coordinates would compare nothing.
//   box(el)   an element's border box
//   line(el)  the line a link DRAWS: its ::before, which the CSS lays along
//             one edge of the link's box. `ends` are its two ends, 2px in
//             (the line overhangs its box by 1px to close the corners).
//   mark(el)  the centre of a link's ::after, where a break or split is drawn
//   roomAt(p) the one room whose box holds point p, or null
//   near(p)   every room whose box comes within 1.5px of p
function installGeometry() {
    window.__bsiGeo = (() => {
        const px = (v) => parseFloat(v) || 0;
        const box = (el) => {
            const o = document.getElementById('bsi-plan').getBoundingClientRect();
            const r = el.getBoundingClientRect();
            const l = r.left - o.left;
            const t = r.top - o.top;
            return { l, t, r: l + r.width, b: t + r.height, w: r.width, h: r.height,
                cx: l + r.width / 2, cy: t + r.height / 2 };
        };
        const line = (el) => {
            const b = box(el);
            const cs = getComputedStyle(el, '::before');
            const l = b.l + px(cs.left);
            const t = b.t + px(cs.top);
            const w = px(cs.width);
            const h = px(cs.height);
            const out = { l, t, r: l + w, b: t + h, w, h, cx: l + w / 2, cy: t + h / 2 };
            out.ends = w >= h ? [[l + 2, out.cy], [l + w - 2, out.cy]] : [[out.cx, t + 2], [out.cx, t + h - 2]];
            return out;
        };
        const mark = (el) => {
            const b = box(el);
            const cs = getComputedStyle(el, '::after');
            return [b.l + px(cs.left) + px(cs.marginLeft) + px(cs.width) / 2,
                b.t + px(cs.top) + px(cs.marginTop) + px(cs.height) / 2];
        };
        const rooms = () => Array.from(document.querySelectorAll('#bsi-plan .bsi-room'))
            .map((el) => ({ room: Number(el.getAttribute('data-bsi-room')), box: box(el) }));
        const within = (p, r, m) => p[0] > r.l + m && p[0] < r.r - m && p[1] > r.t + m && p[1] < r.b - m;
        const roomAt = (p) => {
            const hit = rooms().filter((x) => within(p, x.box, 0.5));
            return hit.length === 1 ? hit[0].room : null;
        };
        const near = (p) => rooms().filter((x) => within(p, x.box, -1.5)).map((x) => x.room).sort((a, b) => a - b);
        return { box, line, mark, rooms, within, roomAt, near };
    })();
}

// The wall two boxes share, or null: they touch along an edge for more than
// 4px. Rooms tile the plan with no gap, so neighbours touch exactly.
function sharedWall(a, b) {
    const touch = (x, y) => Math.abs(x - y) < 1;
    const span = (a1, a2, b1, b2) => [Math.max(a1, b1), Math.min(a2, b2)];
    if (touch(a.r, b.l) || touch(b.r, a.l)) {
        const [from, to] = span(a.t, a.b, b.t, b.b);
        const x = touch(a.r, b.l) ? (a.r + b.l) / 2 : (b.r + a.l) / 2;
        return to - from > 4 ? { axis: 'x', at: x, from, to } : null;
    }
    if (touch(a.b, b.t) || touch(b.b, a.t)) {
        const [from, to] = span(a.l, a.r, b.l, b.r);
        const y = touch(a.b, b.t) ? (a.b + b.t) / 2 : (b.b + a.t) / 2;
        return to - from > 4 ? { axis: 'y', at: y, from, to } : null;
    }
    return null;
}

// Is point p on that wall: within 1.5px of its line, and inside its length.
function onWall(p, wall) {
    const [across, along] = wall.axis === 'x' ? [p[0], p[1]] : [p[1], p[0]];
    return Math.abs(across - wall.at) <= 1.5 && along > wall.from && along < wall.to;
}

function loadEngine() {
    return vm.runInNewContext(fs.readFileSync(ENGINE, 'utf8') + '\n; BusIsolation;', {});
}

// WHY the break had to be where it is, on the two opening break jobs,
// hand-worked: job 1 (break between 209 and 210, the supervisor or router
// at 201) argues from the drawn route; job 2 (201 to 205 offline, break
// between 205 and 206) from the offline list alone: the trunk ends inside
// the section, at 201, so the break is at its other edge, 205. (Not "the
// edge with an online room next to it": on the plan 201 is next to 216, so
// both edges have one.) Every finding, and every pick after it, carries
// its job's reason.
const JOB1_WHY = 'Follow the drawn route from the supervisor or router: every controller as far as ' +
    '209 is online, and every one from 210 to the end of the run is offline. On this floor a break ' +
    'cuts off everything past it on the trunk and nothing before it, so it had to be in the span ' +
    'between those two.';
const JOB2_WHY = 'On this made-up floor the trunk runs in room order, so the offline rooms, 201 to ' +
    '205, are one section, and a break cuts off every controller past it, out to the end of the ' +
    'trunk. So the trunk ends inside that section, at 201, and the break is at the section\'s other ' +
    'edge, at 205.';

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
    await page.addInitScript(installGeometry);
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
        const geo = window.__bsiGeo;
        // Where a mark on the trunk is DRAWN: the rooms whose boxes come
        // within 1.5px of the mark's centre. A mark on the partition between
        // two rooms is within reach of exactly those two, so this is the
        // pair a reader sees it between — read off the layout, not off the
        // script's own bookkeeping.
        const roomLinks = Array.from(plan.querySelectorAll('.bsi-link:not(.is-cap)'));
        const marks = roomLinks.map((el, i) => {
            const brk = el.classList.contains('is-break');
            const split = el.classList.contains('is-split');
            if (!brk && !split) return null;
            return { mark: brk && split ? 'both' : brk ? 'break' : 'split', index: i, between: geo.near(geo.mark(el)) };
        }).filter(Boolean);
        // Where the two ends of the trunk are drawn, hidden or not: the room
        // the drop from the supervisor or router lands in, the room the stub
        // that ends the trunk lies in, and which side of the 201 | 216 wall
        // the end tag is on (216 sits right of 201 at both layouts).
        const headLine = geo.line(plan.querySelector('.bsi-link.is-cap:not(.is-tail)'));
        const tailLine = geo.line(plan.querySelector('.bsi-link.is-tail'));
        const tailRooms = tailLine.ends.map(geo.roomAt);
        const wall = geo.box(plan.querySelector('[data-bsi-room="201"]')).r;
        return {
            kind: g.getAttribute('data-bsi-kind'),
            countLabel: text('bsi-count-lbl'),
            count: text('bsi-count'),
            feedback: text('bsi-feedback'),
            // The part of the result that says why, on its own line (break
            // jobs), and whatever follows it (the score line).
            why: (() => {
                const w = document.querySelector('#bsi-feedback .bsi-why');
                return w ? w.textContent : null;
            })(),
            after: (() => {
                const a = document.querySelector('#bsi-feedback .bsi-after');
                return a ? a.textContent : null;
            })(),
            found: document.getElementById('bsi-feedback').classList.contains('is-found'),
            routeless: plan.classList.contains('is-routeless'),
            headShown: shown(document.getElementById('bsi-head')),
            endShown: shown(document.getElementById('bsi-end')),
            headLands: geo.roomAt(headLine.ends[1]),
            tailIn: tailRooms[0] === tailRooms[1] ? tailRooms[0] : null,
            endSide: geo.box(document.getElementById('bsi-end')).cx > wall ? 216 : 201,
            linksShown: Array.from(plan.querySelectorAll('.bsi-link')).filter(shown).length,
            breaks: plan.querySelectorAll('.bsi-link.is-break').length,
            splits: plan.querySelectorAll('.bsi-link.is-split').length,
            marks,
            roomLinks: roomLinks.length,
            caps: plan.querySelectorAll('.bsi-link.is-cap').length,
            capMarks: plan.querySelectorAll('.bsi-link.is-cap.is-break, .bsi-link.is-cap.is-split').length,
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
                    classes: Array.from(b.classList).filter((c) => c.startsWith('is-')).sort(),
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
// showing (a pick's text, or the prompt), and `reason` the part of it that
// says why (a break-job pick's reason; undefined for a prompt or a split).
async function expectPageShows(page, B, job, said, reason) {
    const v = B.view(job);
    const seen = await readPlan(page);
    const where = `${job.kind} seed ${job.seed} after ${job.stops} ${v.unit}(s)`;

    expect(seen.kind, where).toBe(job.kind);
    expect(seen.countLabel, where).toBe(v.unit === 'stop' ? 'Stops' : 'Splits');
    expect(seen.count, where).toBe(String(v.stops));
    expect(seen.feedback, where).toBe(said);
    // The reason is drawn on its own line, verbatim, and only when there is
    // one: never on a prompt, never on the flaky job.
    expect(seen.why, `${where}: the reason line`).toBe(reason === undefined ? null : reason);
    if (reason !== undefined) {
        const rest = said.slice(said.indexOf(reason) + reason.length);
        expect(seen.after, `${where}: the line after the reason`).toBe(rest.trim() === '' ? null : rest);
    }
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
            // The only visual cue on the two controllers beside a found
            // break is a class (no badge), so the classes are mirrored too.
            classes: ['is-' + c.status, c.suspect && 'is-suspect', c.found && 'is-found',
                c.besideBreak && 'is-beside'].filter(Boolean).sort(),
            label,
            type: 'button',
            tag: 'BUTTON',
        };
    });
    expect(seen.rooms, where).toEqual(want);

    // The trunk: drawn only when the engine says the route is known. The
    // supervisor or router's box is drawn on every job: it has one place,
    // whichever end the trunk leaves it from.
    expect(seen.routeless, where).toBe(!v.routeShown);
    expect(seen.headShown, where).toBe(true);
    expect(seen.endShown, where).toBe(v.routeShown);
    expect(seen.linksShown, where).toBe(v.routeShown ? 17 : 0);
    expect(seen.breaks, where).toBe(v.links.filter((l) => l.state === 'break').length);
    expect(seen.splits, where).toBe(v.links.filter((l) => l.state === 'split').length);
    // WHICH link carries the mark. A count alone would pass with the break
    // or the split drawn one gap over. The engine names the two rooms the
    // open segment joins; the page must draw the mark between those two,
    // and on the link the script files under the lower of them.
    const wantMarks = v.links.filter((l) => l.state !== 'whole').map((l) => {
        if (l.a === 'head') throw new Error(where + ': the engine never opens the first segment');
        const between = [l.a, l.b].sort((a, b) => a - b);
        return { mark: l.state, index: between[0] - 201, between };
    });
    expect(seen.marks, `${where}: which link is marked`).toEqual(wantMarks);
    for (const m of wantMarks) expect(m.between[1] - m.between[0], where).toBe(1);
    expect([seen.roomLinks, seen.caps], where).toEqual([15, 2]);
    expect(seen.capMarks, `${where}: neither end of the trunk is ever marked`).toBe(0);
    if (v.routeShown) {
        // The drop lands in the first room on the trunk, and the stub and
        // the tag are at the last.
        const [first, last] = v.headEnd === 'low' ? [201, 216] : [216, 201];
        expect([seen.headLands, seen.tailIn, seen.endSide], `${where}: the ends of the trunk`)
            .toEqual([first, last, last]);
        expect(seen.trunk, where).toBe(v.headEnd === 'low'
            ? 'Supervisor or router, then 201 up to 216'
            : 'Supervisor or router, then 216 down to 201');
    } else {
        // Hidden, and parked at the default (the 201 end) whichever end
        // the job really has, so the DOM says nothing about it.
        expect([seen.headLands, seen.tailIn, seen.endSide], `${where}: the ends, parked`)
            .toEqual([201, 216, 216]);
        // True until the job is solved, a stop at either end included: it
        // claims the route is not drawn, and nothing about the ends.
        expect(seen.trunk, where).toBe('No layout: route not drawn');
    }

    // The report rows are the drawing in words, so they are held to the
    // engine on every pick and deal — worked out here from the statuses,
    // not read back from the page's own helper.
    const runsOf = (status) => {
        const parts = [];
        let run = [];
        const close = () => {
            if (run.length === 1) parts.push(`${run[0].room} · MAC ${run[0].mac}`);
            if (run.length > 1) {
                const last = run[run.length - 1];
                parts.push(`${run[0].room} to ${last.room} · MAC ${run[0].mac} to ${last.mac}`);
            }
            run = [];
        };
        for (const c of v.controllers) {
            if (c.status === status) run.push(c); else close();
        }
        close();
        return parts.length ? parts.join(', ') : 'none';
    };
    expect(seen.online, `${where}: Online row`).toBe(runsOf('online'));
    expect(seen.offline, `${where}: Offline row`).toBe(runsOf('offline') +
        (v.controllers.some((c) => c.cutOff) ? ' (cut off by your split)' : ''));
    expect(seen.flaky, `${where}: Flaky row`).toBe(runsOf('flaky'));
    // Every controller is in exactly one of the three rows.
    expect(v.controllers.filter((c) => !['online', 'offline', 'flaky'].includes(c.status)), where).toEqual([]);
    expect(seen.suspectsShown, where).toBe(v.suspects !== null);
    if (v.suspects === null) {
        expect(seen.suspects, `${where}: no stale suspects on a break job`).toBe('');
    } else if (v.solved) {
        expect(seen.suspects, `${where}: Suspects row`)
            .toBe(`${v.found.room} · MAC ${v.found.room - 200}, the troublemaker`);
    } else {
        const span = v.suspects.from === v.suspects.to
            ? String(v.suspects.from) : `${v.suspects.from} to ${v.suspects.to}`;
        expect(seen.suspects, `${where}: Suspects row`)
            .toBe(`${span} (${v.suspects.count} may still hold the fault)`);
        expect(v.suspects.count, where).toBe(v.controllers.filter((c) => c.suspect).length);
    }
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
        await expectPageShows(page, B, job, result.text, result.reason);
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

    // No canonical means no address to describe, so the hidden page ships
    // no structured data at all — not a TechArticle, not a breadcrumb, and
    // not an empty script element (which is what it shipped before
    // head.njk's education block learned to ask for a canonical).
    test('ships no JSON-LD script element', async ({ page }) => {
        await open(page);
        await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
        expect(fs.readFileSync(path.join(SITE, 'education', SLUG + '.html'), 'utf8'))
            .not.toContain('application/ld+json');
        // Anti-vacuity: the selector does find the blocks on a listed lesson.
        await page.goto('/education/bacnet-mstp.html');
        expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0);
    });

    test('absent from the sitemap, the search index, the page manifest and every menu', async ({ page, request }) => {
        const sitemap = await (await request.get('/sitemap.xml')).text();
        const index = await (await request.get('/search-index.json')).text();
        // Anti-vacuity: these are the real files, and a sibling is in both.
        expect(sitemap).toContain('/education/bacnet-mstp');
        expect(index).toContain('/education/bacnet-mstp.html');
        expect(sitemap).not.toContain(SLUG);
        expect(index).not.toContain(SLUG);
        // The manifest holds { name, url } objects, so the address is
        // compared, not the object (String(object) is "[object Object]" and
        // matches nothing — the first form of this line could not fail).
        const listed = (needle) => PAGES.some((p) => String(p.url).includes(needle));
        expect(PAGES.length, 'sanity: the manifest was loaded').toBeGreaterThan(100);
        expect(PAGES.every((p) => typeof p.url === 'string'), 'every manifest entry has a url').toBe(true);
        expect(listed('/education/bacnet-mstp.html'), 'anti-vacuity: a listed sibling IS found').toBe(true);
        expect(listed(SLUG), 'tests/pages.js must not list a hidden page').toBe(false);

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
        await expect(feedback(page)).toHaveText('Found it. The break is between 209 and 210. ' + JOB1_WHY +
            ' Found in 1 stop, the fewest this job takes.');
        await expect(count(page)).toHaveText('1');
        await expect(feedback(page)).toHaveClass(/is-found/);
        await expect(page.locator('#bsi-plan .bsi-link.is-break')).toHaveCount(1);
        await expect(room(page, 209)).toHaveAttribute('aria-label', 'Room 209, MAC 9, online, beside the break');
        await expect(room(page, 210)).toHaveAttribute('aria-label', 'Room 210, MAC 10, offline, beside the break');

        // The mark is drawn between the two controllers the sentence names.
        expect((await readPlan(page)).marks).toEqual([{ mark: 'break', index: 8, between: [209, 210] }]);

        // A finished job stays finished, and still says where the break is
        // and why.
        await room(page, 204).click();
        await expect(feedback(page)).toHaveText('This job is finished. The break is between 209 and 210. ' +
            JOB1_WHY + ' Found in 1 stop, the fewest this job takes. New job deals another.');
        await expect(count(page)).toHaveText('1');
        await expect(feedback(page)).toHaveClass(/is-found/);
        expect(errors).toEqual([]);
    });

    // A double click, a double tap or a held Enter on the controller that
    // finds the fault fires two picks. The second result is printed over
    // the first, so it has to carry the finding and the score line: the
    // first draft answered "This job is finished. New job deals another."
    // and the reader never saw where the break was.
    test('a double click on the finding controller leaves the finding and the score on screen', async ({ page }) => {
        const { errors } = await open(page);
        await room(page, 210).dblclick();
        await expect(feedback(page)).toHaveText('This job is finished. The break is between 209 and 210. ' +
            JOB1_WHY + ' Found in 1 stop, the fewest this job takes. New job deals another.');
        await expect(page.locator('#bsi-feedback .bsi-why')).toHaveText(JOB1_WHY);
        await expect(count(page), 'the second click of the pair is free').toHaveText('1');
        await expect(feedback(page)).toHaveClass(/is-found/);
        expect((await readPlan(page)).marks).toEqual([{ mark: 'break', index: 8, between: [209, 210] }]);

        // Job 2, the slow way, then the double click on the finding stop.
        await selectJob(page, 'no-layout');
        await room(page, 201).click();
        await room(page, 205).dblclick();
        await expect(feedback(page)).toHaveText('This job is finished. The break is between 205 and 206. ' +
            JOB2_WHY + ' Found in 2 stops. Reading the pattern first gets it in 1. New job deals another.');
        await expect(page.locator('#bsi-feedback .bsi-why')).toHaveText(JOB2_WHY);
        await expect(count(page)).toHaveText('2');

        // Job 3: three splits, then the fourth double-clicked; and a held
        // Enter, which is the same thing from the keyboard.
        await selectJob(page, 'flaky');
        for (const pick of [208, 212, 210]) await room(page, pick).click();
        await room(page, 211).dblclick();
        const done = 'This job is finished. 212 is the troublemaker. Found in 4 splits. Splitting at the ' +
            'midpoint each time takes 4, wherever the troublemaker is. New job deals another.';
        await expect(feedback(page)).toHaveText(done);
        await expect(count(page)).toHaveText('4');
        await room(page, 211).focus();
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await expect(feedback(page)).toHaveText(done);
        await expect(count(page)).toHaveText('4');
        await expect(room(page, 212).locator('.bsi-badge')).toHaveText('!');
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

        // Nothing on the plan gives the end away: no trunk and no end tag,
        // hidden, and parked where a low-end job has them although this
        // job's supervisor or router feeds the HIGH end. Its box stays in
        // its one place in the electrical room.
        expect(job.headEnd).toBe('high');
        expect(seen.routeless).toBe(true);
        expect(seen.headShown).toBe(true);
        expect([seen.headLands, seen.tailIn, seen.endSide]).toEqual([201, 216, 216]);
        await expect(page.locator('#bsi-end')).toBeHidden();
        await expect(page.locator('#bsi-head')).toBeVisible();

        expect(readerPick(seen)).toEqual([205, 201]);
        await room(page, 205).click();
        const result = B.pick(job, 205);
        expect(result.text).toBe('Found it. The break is between 205 and 206. ' + JOB2_WHY +
            ' Found in 1 stop, the fewest this job takes.');
        const solved = await expectPageShows(page, B, job, result.text, result.reason);
        // Once found, the route is drawn: into 216, ending at 201.
        await expect(page.locator('#bsi-end')).toBeVisible();
        expect([solved.headLands, solved.tailIn, solved.endSide]).toEqual([216, 201, 201]);
        await expect(page.locator('#bsi-r-trunk')).toHaveText('Supervisor or router, then 216 down to 201');
        expect(errors).toEqual([]);
    });

    // The owner played the first draft and found the job 1 break first try,
    // by instinct, and said that "doesn't drive home the point since one may
    // not understand why picking that worked". So a first-try find on job 1
    // or job 2 must say WHY, on screen, on a line of its own, naming the
    // rooms it argues from (job 1: the two rooms beside the break; job 2:
    // the section, the room the trunk ends in, and the room at the break,
    // the section's other edge); a screen reader must hear it once, with the
    // result; and it must stay up for as long as the finding does. At phone
    // width too, where the longer result sits under the plan and must not
    // move it or spill out of its box.
    const FIRST_TRY = [
        { kind: 'layout', pick: 209, why: JOB1_WHY,
            names: ['every controller as far as 209 is online', 'every one from 210 to the end of the run is offline'] },
        { kind: 'no-layout', pick: 205, why: JOB2_WHY,
            names: ['the offline rooms, 201 to 205, are one section', 'So the trunk ends inside that section, at 201,',
                'the break is at the section\'s other edge, at 205.'] },
    ];
    for (const [width, height] of [[1280, 900], [375, 800]]) {
        for (const c of FIRST_TRY) {
            test(`${width}px, ${c.kind}: a first-try find says why, naming the two rooms, and keeps saying it`, async ({ page }) => {
                const { errors } = await open(page, { width, height });
                if (c.kind !== 'layout') await selectJob(page, c.kind);
                // Where the plan sits on the page. The site's entrance
                // animation slides every .tool-card up 14px after load, so
                // anything finite in flight is let land before it is read.
                const planTop = () => page.locator('#bsi-plan').evaluate(async (el) => {
                    await Promise.all(document.getAnimations()
                        .filter((a) => a.effect && a.effect.getComputedTiming().endTime !== Infinity)
                        .map((a) => a.finished.catch(() => null)));
                    return el.getBoundingClientRect().top + window.scrollY;
                });
                const before = await planTop();
                await expect(page.locator('#bsi-feedback .bsi-why'), 'no reason before a stop').toHaveCount(0);

                await room(page, c.pick).click();
                await expect(count(page)).toHaveText('1');
                await expect(feedback(page)).toHaveText('Found it. The break is between ' +
                    (c.kind === 'layout' ? '209 and 210. ' : '205 and 206. ') + c.why +
                    ' Found in 1 stop, the fewest this job takes.');
                const why = page.locator('#bsi-feedback .bsi-why');
                await expect(why).toBeVisible();
                await expect(why).toHaveText(c.why);
                for (const name of c.names) await expect(why).toContainText(name);

                const look = () => page.evaluate(() => {
                    const f = document.getElementById('bsi-feedback');
                    const w = f.querySelector('.bsi-why');
                    const plan = document.getElementById('bsi-plan');
                    const fr = f.getBoundingClientRect();
                    const wr = w.getBoundingClientRect();
                    const pr = plan.getBoundingClientRect();
                    const times = (text, part) => text.split(part).length - 1;
                    return {
                        // innerText is what is rendered, not what is in the DOM.
                        rendered: f.innerText.replace(/\s+/g, ' '),
                        clipped: f.scrollHeight > f.clientHeight + 1 || f.scrollWidth > f.clientWidth + 1,
                        inside: wr.left >= fr.left - 0.5 && wr.right <= fr.right + 0.5 &&
                            wr.top >= fr.top && wr.bottom <= fr.bottom + 0.5,
                        // Below the first line of the result, not run on after it.
                        ownLine: wr.top >= fr.top + 20,
                        underPlan: fr.top >= pr.bottom,
                        // Said once: in the live region, and nowhere else in <main>.
                        inRegion: times(f.textContent, w.textContent),
                        inMain: times(document.querySelector('main').textContent, w.textContent),
                        regions: document.querySelectorAll('main [aria-live], main [role="status"]').length,
                    };
                });
                const found = await look();
                expect(found.rendered, 'the reason is rendered').toContain(c.why);
                expect(found.clipped, 'the result line is not clipped').toBe(false);
                expect(found.inside, 'the reason sits inside the result line').toBe(true);
                expect(found.ownLine, 'the reason has a line of its own').toBe(true);
                expect(found.underPlan, 'the result sits under the plan').toBe(true);
                expect([found.inRegion, found.inMain, found.regions], 'heard once, from the one live region').toEqual([1, 1, 1]);
                if (c.kind === 'layout') {
                    // Job 1's report rows do not change on a find, so nothing
                    // above the plan moved, and the longer result did not.
                    expect(await planTop(), 'the plan did not move').toBeCloseTo(before, 1);
                }
                const atFind = await planTop();

                // A later pick on the finished job: the reason stays up, and
                // so does the plan.
                await room(page, 216).click();
                await expect(feedback(page)).toHaveText(/^This job is finished\. The break is between /);
                await expect(why).toHaveText(c.why);
                await expect(count(page)).toHaveText('1');
                const done = await look();
                expect(done.rendered).toContain(c.why);
                expect([done.clipped, done.inside, done.ownLine, done.underPlan]).toEqual([false, true, true, true]);
                expect([done.inRegion, done.inMain]).toEqual([1, 1]);
                expect(await planTop(), 'a later pick does not move the plan').toBeCloseTo(atFind, 1);

                // Away to job 3, which draws no reason, and back: still there.
                await selectJob(page, 'flaky');
                await expect(page.locator('#bsi-feedback .bsi-why')).toHaveCount(0);
                await selectJob(page, c.kind);
                await expect(why).toHaveText(c.why);
                // Until "New job" deals another, which clears it with the finding.
                await dealSeed(page, 7);
                await expect(page.locator('#bsi-feedback .bsi-why')).toHaveCount(0);
                await expect(feedback(page)).toHaveText(/^New job\. /);
                expect(errors).toEqual([]);
            });
        }
    }

    // The result line is the one live region, and a result with a reason
    // is up to three nodes (the sentence, the why, the score line). They
    // go in with ONE change to the paragraph, so a screen reader is never
    // handed half a result. An earlier draft wrote them one at a time.
    test('the result line changes once per pick, never in pieces', async ({ page }) => {
        const { errors } = await open(page);
        await page.evaluate(() => {
            window.__bsiChanges = [];
            window.__bsiObserver = new MutationObserver((records) => {
                window.__bsiChanges.push(...records);
            });
            window.__bsiObserver.observe(document.getElementById('bsi-feedback'),
                { childList: true, characterData: true, subtree: true });
        });
        // Every change to the paragraph since the last call, as
        // "type:nodes added", delivered or still queued.
        const changes = () => page.evaluate(() => {
            const all = window.__bsiChanges.concat(window.__bsiObserver.takeRecords());
            window.__bsiChanges = [];
            return all.map((r) => r.type + ':' + r.addedNodes.length);
        });
        await room(page, 213).click();                  // job 1 miss: sentence + why
        expect(await changes(), 'a miss').toEqual(['childList:2']);
        await room(page, 209).click();                  // the find: sentence + why + score
        expect(await changes(), 'the find').toEqual(['childList:3']);
        await room(page, 216).click();                  // after the find: the same three
        expect(await changes(), 'a pick after the find').toEqual(['childList:3']);
        await selectJob(page, 'flaky');                 // the prompt: one text node
        expect(await changes(), 'a job change').toEqual(['childList:1']);
        await room(page, 208).click();                  // a split: no reason, one text node
        expect(await changes(), 'a split').toEqual(['childList:1']);
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
            [208, 'Trunk split past 208: 201 to 208 connected, 209 to 216 cut off. ' +
                'The connected part is stable, so the troublemaker is in the part cut off. ' +
                'May still hold the fault: 209 to 216.'],
            [212, 'Trunk split past 212: 201 to 212 connected, 213 to 216 cut off. ' +
                'The connected part is flaky, so the troublemaker is in it. ' +
                'May still hold the fault: 209 to 212.'],
            [210, 'Trunk split past 210: 201 to 210 connected, 211 to 216 cut off. ' +
                'The connected part is stable, so the troublemaker is in the part cut off. ' +
                'May still hold the fault: 211 to 212.'],
            [211, 'Trunk split past 211: 201 to 211 connected, 212 to 216 cut off. ' +
                'The connected part is stable, so the troublemaker is in the part cut off. ' +
                'One controller left: 212 is the troublemaker. ' +
                'Found in 4 splits. Splitting at the midpoint each time takes 4, wherever the troublemaker is.'],
        ];
        for (const [pick, sentence] of steps) {
            expect(readerPick(await readPlan(page)), `midpoint before the split past ${pick}`).toEqual([pick]);
            await room(page, pick).click();
            await expect(feedback(page)).toHaveText(sentence);
            // What the sentence says is what the plan shows at that moment,
            // read off the controllers: the rooms it calls connected all
            // carry one word (the one it names), the rest read Offline, and
            // the one open split is drawn past the room just picked.
            const seen = await readPlan(page);
            const [, from, to, part] = /: (\d+) to (\d+) connected, .* The connected part is (stable|flaky),/.exec(sentence);
            const words = (lo, hi) => [...new Set(seen.rooms.filter((r) => r.room >= lo && r.room <= hi)
                .map((r) => r.word))];
            expect(words(Number(from), Number(to)), sentence).toEqual([part === 'stable' ? 'Online' : 'Flaky']);
            expect(words(Number(to) + 1, 216), sentence).toEqual(['Offline']);
            expect(seen.marks, sentence).toEqual([{ mark: 'split', index: pick - 201, between: [pick, pick + 1] }]);
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
                // The two rooms of the finding, which job 1's reason must
                // name again (as far as / from). Job 2's names where the
                // trunk ends and the room at the break, one of the two.
                const pair = /^Found it\. The break is between (\d+) and (\d+)\. /.exec(said);
                const why = (await readPlan(page)).why;
                if (kind === 'layout') {
                    expect(said, `seed ${seed}`).toMatch(
                        /^Found it\. The break is between \d+ and \d+\. Follow the drawn route from the supervisor or router: every controller as far as \d+ is online, and every one from \d+ to the end of the run is offline\. On this floor a break cuts off everything past it on the trunk and nothing before it, so it had to be in the span between those two\. Found in 1 stop, the fewest this job takes\.$/);
                    const [, asFar, from] = /as far as (\d+) is online, and every one from (\d+) /.exec(why);
                    expect([asFar, from].sort(), `seed ${seed}: the reason names the finding's two rooms`)
                        .toEqual([pair[1], pair[2]].sort());
                } else if (kind === 'no-layout') {
                    expect(said, `seed ${seed}`).toMatch(new RegExp('^Found it\\. The break is between \\d+ and \\d+\\. ' +
                        'On this made-up floor the trunk runs in room order, so the offline rooms, \\d+ to \\d+, are one section, ' +
                        'and a break cuts off every controller past it, out to the end of the trunk\\. ' +
                        'So the trunk ends inside that section, at \\d+, and the break is at the section\'s other edge, at \\d+\\. ' +
                        (job.stops === 1
                            ? 'Found in 1 stop, the fewest this job takes\\.$'
                            : 'Found in 2 stops\\. Reading the pattern first gets it in 1\\.$')));
                    const [, end, last] = /So the trunk ends inside that section, at (\d+), and the break is at the section's other edge, at (\d+)\.$/.exec(why);
                    // The section named is what the Offline row shows.
                    const [, lo, hi] = /the offline rooms, (\d+) to (\d+), are one section/.exec(why);
                    const now = await readPlan(page);
                    expect(now.offline, `seed ${seed}`).toMatch(new RegExp(`^${lo} to ${hi} · MAC `));
                    // Where the trunk ends: the edge of the section that is
                    // room 201 or room 216, and the end of the trunk as the
                    // page now draws it (solved, so the route is shown): the
                    // stub that ends the trunk lies in it, and the Trunk row
                    // runs out to it. That is chain index 15.
                    expect([lo, hi], `seed ${seed}: the trunk ends at an edge of the section`).toContain(end);
                    expect([lo, hi].filter((r) => r === '201' || r === '216'), `seed ${seed}: the edge at 201 or 216`)
                        .toEqual([end]);
                    expect(now.tailIn, `seed ${seed}: the drawn trunk ends in the room named`).toBe(Number(end));
                    expect(now.trunk, `seed ${seed}`).toMatch(new RegExp(` to ${end}$`));
                    expect(B.roomAt(job, 15), `seed ${seed}: chain index 15`).toBe(Number(end));
                    // The room at the break: the section's other edge, and
                    // one of the two rooms the finding names, the offline
                    // one; the other room of the pair reads Online.
                    expect(last, `seed ${seed}: the other edge`).toBe(end === lo ? hi : lo);
                    expect([pair[1], pair[2]], `seed ${seed}: the break is at the room named`).toContain(last);
                    const across = pair[1] === last ? pair[2] : pair[1];
                    expect(now.rooms.find((r) => r.room === Number(across)).word, `seed ${seed}`).toBe('Online');
                    expect(now.rooms.find((r) => r.room === Number(last)).word, `seed ${seed}`).toBe('Offline');
                } else {
                    expect(said, `seed ${seed}`).toMatch(
                        /One controller left: \d+ is the troublemaker\. Found in 4 splits\. Splitting at the midpoint each time takes 4, wherever the troublemaker is\.$/);
                    expect(why, `seed ${seed}: the flaky job draws no reason line`).toBeNull();
                }

                // A pick once it is over: free, and the finding (and why)
                // stays put.
                const after = 201 + (seed % 16);
                await room(page, after).click();
                const done = B.pick(job, after);
                expect(done.code, `seed ${seed}`).toBe('done');
                await expectPageShows(page, B, job, done.text, done.reason);
                expect(done.text, `seed ${seed}`).toMatch(kind === 'flaky'
                    ? /^This job is finished\. \d+ is the troublemaker\. Found in 4 splits\. .* New job deals another\.$/
                    : /^This job is finished\. The break is between \d+ and \d+\. .* Found in [12] stops?[.,] .* New job deals another\.$/);
                if (kind !== 'flaky') expect((await readPlan(page)).why, `seed ${seed}`).toBe(why);
                // The score line of the finding sentence is carried whole.
                expect(done.text, `seed ${seed}`).toContain(/(Found in .*)$/.exec(said)[1]);
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
        // Each miss says which way along the drawn route the break lies,
        // and why; the why is drawn on its own line.
        const dead213 = 'The trunk was already dead when it got to 213, so the break is back along the ' +
            'route, toward the supervisor or router.';
        await room(page, 213).click();
        await expect(feedback(page)).toHaveText('Dead trunk on both sides of 213. The break is not here. ' + dead213);
        await expect(page.locator('#bsi-feedback .bsi-why')).toHaveText(dead213);
        await expect(count(page)).toHaveText('1');
        await expect(room(page, 213).locator('.bsi-badge')).toHaveText('×');
        await expect(room(page, 213)).toHaveAttribute('aria-label',
            'Room 213, MAC 13, offline, you stopped here and the break was on neither side');
        await expect(page.locator('#bsi-plan .bsi-link.is-break'), 'a miss marks nothing on the trunk').toHaveCount(0);

        await room(page, 213).click();
        await expect(feedback(page)).toHaveText(
            'You already stopped at 213. Dead trunk on both sides of 213. The break is not here. ' + dead213);
        await expect(count(page), 'looking again is free').toHaveText('1');

        await room(page, 204).click();
        await expect(feedback(page)).toHaveText('Live trunk on both sides of 204. The break is not here. ' +
            'The trunk is still live past 204, so the break is farther along the route, away from the ' +
            'supervisor or router.');
        await room(page, 201).click();
        await expect(feedback(page)).toHaveText('201 is the first controller on the trunk: the supervisor or ' +
            'router on one side, live trunk to 202 on the other. The break is not here. ' +
            'The trunk is still live past 201, so the break is farther along the route, away from the ' +
            'supervisor or router.');
        await room(page, 216).click();
        await expect(feedback(page)).toHaveText('216 is the end of the run: dead trunk toward 215, and nothing ' +
            'past it. The trunk was already dead when it got to 216, so the break is back along the route, ' +
            'toward the supervisor or router, where the dead section starts.');
        await expect(count(page)).toHaveText('4');
        await expect(feedback(page)).not.toHaveClass(/is-found/);
        // A miss ends on its reason: nothing after it.
        await expect(page.locator('#bsi-feedback .bsi-after')).toHaveCount(0);

        await room(page, 209).click();
        await expect(feedback(page)).toHaveText('Found it. The break is between 209 and 210. ' + JOB1_WHY +
            ' Found in 5 stops. Reading the layout first gets it in 1.');
        await expect(page.locator('#bsi-feedback .bsi-after')).toHaveText(' Found in 5 stops. Reading the layout first gets it in 1.');
        await expect(count(page)).toHaveText('5');
    });

    test('job 2: the wrong end of the offline list and the middle of it both say so', async ({ page }) => {
        await open(page);
        await selectJob(page, 'no-layout');
        // 201 to 205 are dark and the break is between 205 and 206. Each
        // stop says why from the offline list, the plan and what the stop
        // itself shows: no route is drawn. 201 and 216 share a wall on the
        // plan, and the two stops at them say the trunk does not join them.
        await room(page, 201).click();
        await expect(feedback(page)).toHaveText('201 is the end of the run: dead trunk toward 202, and nothing ' +
            'past it. On the plan 201 is next to 216, but the trunk does not join them. The trunk reaches ' +
            '201 through the offline section, so the break is at the other edge of the section, next to 205.');
        // The why is on its own line, after the line that already said this
        // is the end of the run.
        await expect(page.locator('#bsi-feedback .bsi-why')).toHaveText('On the plan 201 is next to 216, but ' +
            'the trunk does not join them. The trunk reaches 201 through the offline section, so the break ' +
            'is at the other edge of the section, next to 205.');
        // The result line has just named an end of the trunk. The Trunk
        // row beside it claims only that the route is not drawn — an
        // earlier draft said "route and ends not known" at this moment.
        await expect(page.locator('#bsi-r-trunk')).toHaveText('No layout: route not drawn');
        await room(page, 216).click();
        await expect(feedback(page)).toHaveText('216 is the first controller on the trunk: the supervisor ' +
            'or router on one side, live trunk to 215 on the other. The break is not here. The trunk comes ' +
            'in at 216 and runs in room order. On the plan 216 is next to 201, but the trunk does not join ' +
            'them. The first offline room it reaches is 205, so the break is next to 205.');
        await expect(page.locator('#bsi-r-trunk')).toHaveText('No layout: route not drawn');
        await expect(page.locator('#bsi-r-trunk')).not.toHaveText(/not known|ends/);
        await room(page, 210).click();
        await expect(feedback(page)).toHaveText('Live trunk on both sides of 210. The break is not here. ' +
            'The break sits between an online room and an offline one, so it is at an edge of the offline ' +
            'section, 201 to 205. 210 is not next to that section.');
        await room(page, 203).click();
        await expect(feedback(page)).toHaveText('Dead trunk on both sides of 203. The break is not here. ' +
            'A stop inside the offline section cannot say which way the supervisor or router is. A stop at ' +
            'either edge of it, 201 or 205, can.');
        // Four misses in, the route is still not drawn.
        await expect(page.locator('#bsi-plan')).toHaveClass(/is-routeless/);
        await expect(page.locator('#bsi-end')).toBeHidden();
        expect(readerPick(await readPlan(page)), 'only the other end is left to the method').toEqual([205]);

        await room(page, 205).click();
        await expect(feedback(page)).toHaveText('Found it. The break is between 205 and 206. ' + JOB2_WHY +
            ' Found in 5 stops. Reading the pattern first gets it in 1.');
        await expect(page.locator('#bsi-plan')).not.toHaveClass(/is-routeless/);
        // Found: the route is drawn now, and the call above the plan said
        // "until you find the break" rather than "is not drawn".
        await expect(page.locator('#bsi-r-trunk')).toHaveText('Supervisor or router, then 216 down to 201');
        await expect(page.locator('[data-bsi-brief="no-layout"]')).toContainText(
            'The route is not drawn until you find the break, and the call does not say which way the ' +
            'trunk leaves the electrical room, into 201 or into 216. What you have is the floor plan and ' +
            'the offline list: room numbers and MAC addresses.');
    });

    test('job 3: a split that cuts nothing off, a split that tells nothing new, and a repeat', async ({ page }) => {
        await open(page);
        await selectJob(page, 'flaky');
        await room(page, 216).click();
        await expect(feedback(page)).toHaveText('216 is the last controller on the trunk, so a split past it ' +
            'cuts nothing off. All 16 controllers are connected and flaky. ' +
            'May still hold the fault: 201 to 216.');
        await expect(count(page)).toHaveText('1');
        await expect(page.locator('#bsi-plan .bsi-link.is-split')).toHaveCount(0);
        await expect(page.locator('#bsi-plan .bsi-room.is-flaky')).toHaveCount(16);

        await room(page, 208).click();
        await expect(feedback(page)).toHaveText(/The connected part is stable, so the troublemaker is in the part cut off\. May still hold the fault: 209 to 216\.$/);
        // What the plan shows after that split, read off the controllers.
        await expect(page.locator('#bsi-plan .bsi-room.is-online')).toHaveCount(8);
        await expect(page.locator('#bsi-plan .bsi-room.is-offline')).toHaveCount(8);
        await expect(room(page, 208)).toHaveAttribute('aria-label', 'Room 208, MAC 8, online');
        await expect(room(page, 209)).toHaveAttribute('aria-label',
            'Room 209, MAC 9, offline, cut off by your split, may still be the troublemaker');
        await expect(page.locator('#bsi-r-offline')).toHaveText('209 to 216 · MAC 9 to 16 (cut off by your split)');
        await expect(page.locator('#bsi-r-suspects')).toHaveText('209 to 216 (8 may still hold the fault)');
        await expect(page.locator('#bsi-plan .bsi-link.is-split')).toHaveCount(1);

        await room(page, 203).click();
        await expect(feedback(page)).toHaveText('Trunk split past 203: 201 to 203 connected, 204 to 216 ' +
            'cut off. The connected part is stable, which the earlier splits already told you. ' +
            'May still hold the fault: 209 to 216.');
        await expect(count(page), 'a split that tells nothing still costs one').toHaveText('3');

        await room(page, 203).click();
        await expect(feedback(page)).toHaveText(
            'The trunk is already split past 203. May still hold the fault: 209 to 216.');
        await expect(count(page), 'the same split again is free').toHaveText('3');
        // One split at a time: the mark moved, it did not multiply.
        await expect(page.locator('#bsi-plan .bsi-link.is-split')).toHaveCount(1);
        expect((await readPlan(page)).marks).toEqual([{ mark: 'split', index: 2, between: [203, 204] }]);

        // The last controller with a split open: the pick rejoins the
        // trunk. A moment ago 201 to 203 read Online and 204 to 216 were cut
        // off; now all sixteen are connected and flaky, and the sentence
        // says so without a "still".
        await room(page, 216).click();
        await expect(feedback(page)).toHaveText('216 is the last controller on the trunk, so a split past it ' +
            'cuts nothing off. All 16 controllers are connected and flaky. ' +
            'May still hold the fault: 209 to 216.');
        await expect(page.locator('#bsi-plan .bsi-room.is-flaky')).toHaveCount(16);
        await expect(page.locator('#bsi-plan .bsi-link.is-split')).toHaveCount(0);
        await expect(page.locator('#bsi-r-offline')).toHaveText('none');
        // And the call says the rule out loud.
        await expect(page.locator('[data-bsi-brief="flaky"]')).toContainText(
            'Only one split is open at a time: a new pick rejoins the trunk and splits it at the new spot.');
    });

    // Every state a second split can reach on the opening job, on the page:
    // sixteen first picks, then one second pick each, mirrored. This is
    // where "still connected" and "still flaky" used to be false of the
    // plan the reader was looking at.
    test('job 3: after any second split, the sentence, the rows and the mark all describe the trunk as it is', async ({ page }) => {
        const { errors } = await open(page);
        await selectJob(page, 'flaky');
        const B = loadEngine();
        let job = B.newJob('flaky', B.OPENING.flaky);
        let regained = 0;
        let played = 0;
        for (let first = 201; first <= 216; first++) {
            // A second pick well away from the first, on either side of it.
            const second = first <= 208 ? first + 6 : first - 6;
            await room(page, first).click();
            const r1 = B.pick(job, first);
            const before = await expectPageShows(page, B, job, r1.text);
            await room(page, second).click();
            const r2 = B.pick(job, second);
            const after = await expectPageShows(page, B, job, r2.text);
            expect(r2.text, `${first} then ${second}`).not.toMatch(/still connected|still flaky|went stable|\bstays?\b/);
            const was = Object.fromEntries(before.rooms.map((r) => [r.room, r.word]));
            if (after.rooms.some((r) => was[r.room] === 'Offline' && r.word !== 'Offline')) regained += 1;
            played += 1;
            // Deal the opening fault again for the next pair.
            await dealSeed(page, B.OPENING.flaky + 1);
            await dealSeed(page, B.OPENING.flaky);
            job = B.nextJob('flaky', B.OPENING.flaky,
                B.nextJob('flaky', B.OPENING.flaky + 1, job));
            expect(B.sameFault(job, B.newJob('flaky', B.OPENING.flaky)), 'the opening fault is back').toBe(true);
            await expectPageShows(page, B, job, 'New job. ' + B.view(job).prompt);
        }
        expect(played).toBe(16);
        // Anti-vacuity: in half of them the second split reconnected rooms
        // the first had cut off — the case the old wording got wrong.
        expect(regained).toBeGreaterThanOrEqual(8);
        expect(errors).toEqual([]);
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
        await expect(feedback(page)).toHaveText(/^Trunk split past 208: .* May still hold the fault: 209 to 216\.$/);
        expect(await focusedRoom(page), 'the plan is updated in place, so focus stays put').toBe('208');

        expect(await tabTo(page, '[data-bsi-room="212"]')).toBe(4);
        await page.keyboard.press('Space');
        await expect(feedback(page)).toHaveText(/May still hold the fault: 209 to 212\.$/);
        expect(await focusedRoom(page)).toBe('212');

        expect(await tabTo(page, '[data-bsi-room="210"]', 'Shift+Tab')).toBe(2);
        await page.keyboard.press('Enter');
        await expect(feedback(page)).toHaveText(/May still hold the fault: 211 to 212\.$/);

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
        // What may still hold the fault is the "?" on a solid tile, and
        // nothing drawn along a wall: a bar there would read as a stretch
        // of trunk, which is a line along a wall too.
        const suspects = await page.locator('#bsi-plan .bsi-room.is-suspect').evaluateAll((els) => els.map((b) => {
            const badge = b.querySelector('.bsi-badge');
            return {
                bar: getComputedStyle(b).boxShadow,
                before: getComputedStyle(b, '::before').content,
                glyph: badge.textContent,
                tile: getComputedStyle(badge).backgroundColor === getComputedStyle(badge).borderTopColor,
            };
        }));
        expect(suspects).toHaveLength(8);
        for (const s of suspects) expect(s).toEqual({ bar: 'none', before: 'none', glyph: '?', tile: true });
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
        await expect(feedback(page)).toHaveText('Dead trunk on both sides of 213. The break is not here. ' +
            'The trunk was already dead when it got to 213, so the break is back along the route, toward ' +
            'the supervisor or router.');
        await room(page, 210).click();
        await expect(feedback(page)).toHaveText('Found it. The break is between 209 and 210. ' + JOB1_WHY +
            ' Found in 2 stops. Reading the layout first gets it in 1.');
        await expect(page.locator('#bsi-plan .bsi-link.is-break')).toHaveCount(1);

        await selectJob(page, 'no-layout');
        await expect(page.locator('#bsi-end')).toBeHidden();
        await room(page, 205).click();
        await expect(page.locator('#bsi-end')).toBeVisible();

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
test.describe('bus section isolation: the floor plan', () => {

    // Everything the plan draws, measured from its own corner (see
    // installGeometry). Rooms in room order, links in room order (link i
    // joins 201 + i and 202 + i), then the two ends of the trunk.
    async function geometry(page) {
        return page.evaluate(() => {
            const geo = window.__bsiGeo;
            const plan = document.getElementById('bsi-plan');
            const q = (sel) => plan.querySelector(sel);
            const ends = (el) => geo.line(el).ends.map(geo.roomAt);
            return {
                plan: geo.box(plan),
                rooms: geo.rooms().map((r) => r.box),
                links: Array.from(plan.querySelectorAll('.bsi-link:not(.is-cap)')).map((el) => ({
                    line: geo.line(el), ends: ends(el) })),
                headLink: { line: geo.line(q('.bsi-link.is-cap:not(.is-tail)')),
                    ends: ends(q('.bsi-link.is-cap:not(.is-tail)')) },
                tailLink: { line: geo.line(q('.bsi-link.is-tail')), ends: ends(q('.bsi-link.is-tail')) },
                head: geo.box(document.getElementById('bsi-head')),
                end: geo.box(document.getElementById('bsi-end')),
                hall: geo.box(q('.bsi-space.is-hall')),
                core: geo.box(q('.bsi-space.is-core')),
            };
        });
    }

    const overlaps = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 &&
        Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5;
    const inBox = (p, r) => p[0] > r.l + 0.5 && p[0] < r.r - 0.5 && p[1] > r.t + 0.5 && p[1] < r.b - 0.5;

    // What makes the two plan sentences of the no-layout job true of the
    // page: consecutive rooms are neighbours on the plan and on the trunk;
    // 201 and 216 are neighbours on the plan and NOT on the trunk; and that
    // is the only pair of plan neighbours the trunk does not join.
    function expectPlan(g, headEnd, where) {
        const [first, last] = headEnd === 'low' ? [201, 216] : [216, 201];
        const R = (n) => g.rooms[n - 201];
        expect(g.rooms, where).toHaveLength(16);
        expect(g.links, where).toHaveLength(15);
        for (let i = 0; i < 15; i++) {
            const pair = `${201 + i}-${202 + i}`;
            const wall = sharedWall(g.rooms[i], g.rooms[i + 1]);
            expect(wall, `${where}: ${pair} share a wall`).not.toBeNull();
            expect(wall.to - wall.from, `${where}: ${pair}, a real length of wall`).toBeGreaterThan(20);
            // Its own link: one end of the drawn line in each room.
            expect(g.links[i].ends.slice().sort(), `${where}: link ${i} joins ${pair}`)
                .toEqual([201 + i, 202 + i]);
        }
        // 201 and 216: one wall between them, a long one...
        const wall = sharedWall(R(201), R(216));
        expect(wall, `${where}: 201 and 216 share a wall`).not.toBeNull();
        expect(wall.to - wall.from, where).toBeGreaterThan(20);
        // ...and nothing the trunk draws joins them. No line has an end in
        // each, and no line so much as crosses into both.
        const every = g.links.concat([g.headLink, g.tailLink]);
        for (const [k, l] of every.entries()) {
            expect(l.ends.slice().sort(), `${where}: line ${k} joins 201 and 216`).not.toEqual([201, 216]);
            expect(overlaps(l.line, R(201)) && overlaps(l.line, R(216)), `${where}: line ${k} crosses both`)
                .toBe(false);
        }
        // The one false neighbour: no other two rooms that are not
        // consecutive share a wall.
        const extra = [];
        for (let a = 201; a <= 216; a++) {
            for (let b = a + 2; b <= 216; b++) {
                if (sharedWall(R(a), R(b)) && !(a === 201 && b === 216)) extra.push(`${a}|${b}`);
            }
        }
        expect(extra, `${where}: plan neighbours the trunk does not join`).toEqual([]);

        // The drop from the supervisor or router: from inside its box into
        // the first room on the trunk.
        const [top, bottom] = g.headLink.line.ends;
        expect(inBox(top, g.head), `${where}: the drop starts in the supervisor or router's box`).toBe(true);
        expect(g.headLink.ends[1], `${where}: the drop lands in ${first}`).toBe(first);
        expect(bottom[1]).toBeGreaterThan(top[1]);
        // The box sits over both drops, so its place says nothing about
        // which one is in use: over the middle of 201 and of 216.
        expect(g.head.l < R(201).cx && g.head.r > R(216).cx, `${where}: the box spans both drops`).toBe(true);
        // The stub that ends the trunk lies in the last room, and stops
        // short of the 201 | 216 wall.
        expect(g.tailLink.ends, `${where}: the stub lies in ${last}`).toEqual([last, last]);
        const gap = Math.min(...g.tailLink.line.ends.map((p) => Math.abs(p[0] - wall.at)));
        expect(gap, `${where}: the stub stops short of the wall`).toBeGreaterThan(6);
        // The tag: in the corridor, clear of the core, all on the last
        // room's side of the wall.
        expect(g.end.l >= g.hall.l - 0.5 && g.end.r <= g.hall.r + 0.5 &&
            g.end.t >= g.hall.t - 0.5 && g.end.b <= g.hall.b + 0.5, `${where}: the end tag is in the corridor`)
            .toBe(true);
        expect(overlaps(g.end, g.core), `${where}: the end tag is clear of the core`).toBe(false);
        expect(last === 216 ? g.end.l >= wall.at - 0.5 : g.end.r <= wall.at + 0.5,
            `${where}: the end tag is on ${last}'s side`).toBe(true);
    }

    for (const width of [1280, 768, 375, 320]) {
        test(`${width}px: neighbours share a wall and a link, 201 and 216 share a wall and nothing else, both ends`, async ({ page }) => {
            const { errors } = await open(page, { width });
            // Job 1 opening: the supervisor or router feeds 201.
            const low = await geometry(page);
            expectPlan(low, 'low', `${width}px job 1`);
            // Job 3 opening: also the 201 end, nothing found yet.
            await selectJob(page, 'flaky');
            const three = await geometry(page);
            expectPlan(three, 'low', `${width}px job 3`);
            // Job 2 open: route hidden, the ends parked at the 201 end.
            await selectJob(page, 'no-layout');
            const parked = await geometry(page);
            expectPlan(parked, 'low', `${width}px job 2, unsolved`);
            // Job 2 solved: it feeds 216, so the drop, the stub and the tag
            // move, and nothing else does.
            await room(page, 205).click();
            await expect(page.locator('#bsi-end')).toBeVisible();
            const high = await geometry(page);
            expectPlan(high, 'high', `${width}px job 2, solved`);

            for (const [name, g] of [['job 3', three], ['job 2 unsolved', parked], ['job 2 solved', high]]) {
                expect(g.rooms, `${width}px ${name}: the rooms do not move`).toEqual(low.rooms);
                expect(g.head, `${width}px ${name}: the supervisor or router's box does not move`).toEqual(low.head);
                expect(g.plan.b - g.plan.t, `${width}px ${name}: the plan is the same height`)
                    .toBeCloseTo(low.plan.b - low.plan.t, 1);
                expect(g.hall, `${width}px ${name}`).toEqual(low.hall);
            }
            expect(errors).toEqual([]);
        });
    }

    // While job 2 is unsolved, two deals that feed opposite ends must draw
    // the same plan. They cannot be identical — their offline rooms differ —
    // so every room's status (its class, its name, its word and its badge) is
    // set aside, and the rest of the plan must match to the character: no
    // class, attribute, inline style or position may say which way the trunk
    // leaves the electrical room. The drop, the stub and the tag must also be
    // exactly what job 1's opening (the 201 end) has, and hidden.
    test('job 2, unsolved: nothing on the plan says which way the trunk leaves the electrical room', async ({ page }) => {
        const { errors } = await open(page);
        const B = loadEngine();
        const ends = () => page.evaluate(() => {
            const plan = document.getElementById('bsi-plan');
            return ['.bsi-link.is-cap:not(.is-tail)', '.bsi-link.is-tail', '#bsi-end', '#bsi-head']
                .map((sel) => plan.querySelector(sel).outerHTML);
        });
        const look = () => page.evaluate(() => {
            const plan = document.getElementById('bsi-plan');
            const copy = plan.cloneNode(true);
            for (const el of copy.querySelectorAll('.bsi-room')) {
                el.removeAttribute('class');
                el.removeAttribute('aria-label');
            }
            for (const el of copy.querySelectorAll('.bsi-room-word')) el.textContent = '';
            for (const el of copy.querySelectorAll('.bsi-badge')) {
                el.removeAttribute('hidden');
                el.textContent = '';
            }
            const geo = window.__bsiGeo;
            const vis = (sel) => getComputedStyle(plan.querySelector(sel)).visibility;
            return {
                dom: copy.outerHTML,
                boxes: Array.from(plan.children).filter((el) => !el.classList.contains('bsi-room'))
                    .map((el) => geo.box(el)),
                hidden: ['.bsi-link.is-cap:not(.is-tail)', '.bsi-link.is-tail', '#bsi-end'].map(vis),
                links: Array.from(plan.querySelectorAll('.bsi-link')).map((el) => getComputedStyle(el).visibility),
                head: vis('#bsi-head'),
                routeless: plan.classList.contains('is-routeless'),
            };
        });

        const fromJob1 = await ends();
        await selectJob(page, 'no-layout');
        let job = B.newJob('no-layout', B.OPENING['no-layout']);
        expect(job.headEnd, 'the opening job feeds 216').toBe('high');
        const high = await look();
        expect(await ends(), 'parked exactly where job 1 has them').toEqual(fromJob1);
        // A stop that finds nothing does not unpark anything.
        await room(page, 210).click();
        expect((await look()).dom).toBe(high.dom);

        // A deal that feeds 201.
        const seed = SEEDS.find((s) => B.nextJob('no-layout', s, job).headEnd === 'low');
        expect(seed, 'a seed among SEEDS deals a job fed from 201').toBeDefined();
        await dealSeed(page, seed);
        job = B.nextJob('no-layout', seed, job);
        expect(job.headEnd).toBe('low');
        const low = await look();
        expect(low.dom, 'the plan, statuses set aside, is the same for both ends').toBe(high.dom);
        expect(low.boxes, 'and every space, link, box and tag is in the same place').toEqual(high.boxes);
        expect(await ends()).toEqual(fromJob1);
        for (const v of [high, low]) {
            expect(v.routeless).toBe(true);
            expect(v.hidden, 'the drop, the stub and the tag are hidden').toEqual(['hidden', 'hidden', 'hidden']);
            expect(v.links.every((x) => x === 'hidden'), 'no link is visible').toBe(true);
            expect(v.links).toHaveLength(17);
            expect(v.head, 'the box itself stays drawn').toBe('visible');
        }
        // Anti-vacuity: the comparison reads what it should (the places of
        // the rooms and links are in it), and it does see the ends move
        // once a job fed from 216 is solved.
        expect(high.dom).toContain('data-bsi-room="216"');
        expect(high.dom).toContain('--bsi-cw: 6 / 8');
        expect(high.dom.match(/class="bsi-link/g)).toHaveLength(17);
        await dealSeed(page, B.OPENING['no-layout']);
        job = B.nextJob('no-layout', B.OPENING['no-layout'], job);
        expect(job.headEnd).toBe('high');
        expect((await look()).dom).toBe(high.dom);
        for (let guard = 0; guard < 2 && !job.solved; guard++) {
            const pick = B.method(job)[0];
            await room(page, pick).click();
            B.pick(job, pick);
        }
        expect(job.solved).toBe(true);
        expect(await ends(), 'solved and fed from 216: the ends are no longer parked').not.toEqual(fromJob1);
        expect(errors).toEqual([]);
    });

    test('the spaces that are not rooms are aria-hidden, unfocusable and not picks', async ({ page }) => {
        const { errors } = await open(page);
        const spaces = page.locator('#bsi-plan .bsi-space');
        await expect(spaces).toHaveCount(7);
        const facts = await spaces.evaluateAll((els) => els.map((el) => {
            el.focus();
            return {
                kind: el.className,
                tag: el.tagName,
                hidden: el.getAttribute('aria-hidden'),
                tabindex: el.getAttribute('tabindex'),
                role: el.getAttribute('role'),
                focused: document.activeElement === el,
                focusables: el.querySelectorAll('a, button, input, select, textarea, [tabindex]').length,
                label: el.textContent,
            };
        }));
        expect(facts.map((f) => f.kind)).toEqual(['bsi-space is-hall', 'bsi-space is-core', 'bsi-space is-stair',
            'bsi-space is-elev', 'bsi-space is-wc', 'bsi-space is-stair', 'bsi-space is-elec']);
        expect(facts.map((f) => f.label)).toEqual(['Corridor', '', 'Stair', 'Elev.', 'Restrooms', 'Stair', 'Elec.']);
        for (const f of facts) {
            expect([f.tag, f.hidden, f.tabindex, f.role, f.focused, f.focusables], f.kind)
                .toEqual(['SPAN', 'true', null, null, false, 0]);
        }
        // The links are decoration to a screen reader too.
        expect(await page.locator('#bsi-plan .bsi-link').evaluateAll((els) =>
            els.every((el) => el.getAttribute('aria-hidden') === 'true'))).toBe(true);
        // Out of the accessibility tree: the plan's group holds the box,
        // the sixteen rooms and nothing a space says.
        const tree = await page.getByRole('group', { name: 'Floor plan · pick a controller' }).ariaSnapshot();
        for (const word of ['Corridor', 'Stair', 'Elev.', 'Restrooms', 'Elec.']) expect(tree).not.toContain(word);
        expect(tree).toContain('Supervisor or router');
        // Clicking a space is not a pick.
        const before = await feedback(page).textContent();
        await page.locator('#bsi-plan .bsi-space.is-elec').click({ position: { x: 6, y: 6 } });
        await page.locator('#bsi-plan .bsi-space.is-hall').click({ position: { x: 4, y: 4 } });
        await expect(count(page)).toHaveText('0');
        await expect(feedback(page)).toHaveText(before);
        expect(errors).toEqual([]);
    });

    // A break or a split is drawn ON the partition between the two rooms the
    // link joins, at every width: not at the middle of the link's box, which
    // on a link beside a corner room is off the wall. On a job 3 fed from
    // 201 a split past room r marks the link between r and r + 1. With the
    // troublemaker in 216 every one of those splits leaves it cut off, so
    // the job stays open until the last of them, and fifteen picks put a
    // mark on every link in turn. (The opening job's troublemaker is in 212:
    // the split past 212 would solve it and stop the walk there.)
    for (const width of [1280, 768, 375, 320]) {
        test(`${width}px: every mark sits on the wall between the two rooms its link joins`, async ({ page }) => {
            const { errors } = await open(page, { width });
            await selectJob(page, 'flaky');
            const B = loadEngine();
            const seed = 24;
            const job = B.nextJob('flaky', seed, B.newJob('flaky', B.OPENING.flaky));
            expect([job.headEnd, B.roomAt(job, job.fault.index)], 'fed from 201, troublemaker in 216')
                .toEqual(['low', 216]);
            await dealSeed(page, seed);
            for (let r = 201; r <= 215; r++) {
                await room(page, r).click();
                const said = B.pick(job, r);
                expect(said.solved, `split past ${r}`).toBe(r === 215);
                const m = await page.evaluate(() => {
                    const geo = window.__bsiGeo;
                    const el = document.querySelector('#bsi-plan .bsi-link.is-split');
                    const links = Array.from(document.querySelectorAll('#bsi-plan .bsi-link:not(.is-cap)'));
                    return { index: links.indexOf(el), at: geo.mark(el), rooms: geo.rooms().map((x) => x.box) };
                });
                expect(m.index, `${width}px split past ${r}`).toBe(r - 201);
                const wall = sharedWall(m.rooms[r - 201], m.rooms[r - 200]);
                expect(onWall(m.at, wall), `${width}px: the mark for ${r}-${r + 1} at ` +
                    `${m.at.map((n) => n.toFixed(1))} is on their wall ${JSON.stringify(wall)}`).toBe(true);
            }
            expect(errors).toEqual([]);
        });
    }

    // Does everything in the game fit at the current viewport width?
    async function expectFits(page, width, state) {
        const m = await page.evaluate(() => {
            const doc = document.documentElement;
            const g = document.getElementById('bsi-game').getBoundingClientRect();
            const shown = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
            const all = Array.from(document.querySelectorAll('#bsi-game *')).filter(shown);
            const rect = (el) => el.getBoundingClientRect();
            const inside = (a, b) => a.left >= b.left - 0.5 && a.right <= b.right + 0.5 &&
                a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5;
            const head = document.getElementById('bsi-head');
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
                // Every label of a space inside its space; the supervisor or
                // router's name inside its box; the end tag inside the
                // corridor and clear of the core (hidden or not: it has the
                // same place either way).
                labels: Array.from(document.querySelectorAll('#bsi-plan .bsi-space-label'))
                    .filter((el) => !inside(rect(el), rect(el.parentElement))).map((el) => el.textContent),
                headFits: head.scrollWidth <= head.clientWidth && head.scrollHeight <= head.clientHeight,
                endInHall: inside(rect(document.getElementById('bsi-end')),
                    rect(document.querySelector('#bsi-plan .bsi-space.is-hall'))),
                endClearOfCore: (() => {
                    const a = rect(document.getElementById('bsi-end'));
                    const b = rect(document.querySelector('#bsi-plan .bsi-space.is-core'));
                    return a.top >= b.bottom - 0.5 || a.bottom <= b.top + 0.5;
                })(),
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
        expect(m.labels, `${where}: a space's label spills out of it`).toEqual([]);
        expect(m.headFits, `${where}: the supervisor or router's name fits its box`).toBe(true);
        expect([m.endInHall, m.endClearOfCore], `${where}: the end tag fits the corridor`).toEqual([true, true]);
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

    // OFFLINE is the widest word a controller carries, and the side rooms
    // are the narrowest, so the layout is walked across every breakpoint
    // (700/701 for the two plans, 480/481 and 359/360 for the phone rules),
    // not checked at one width. At each width the plan is checked fed from
    // 201 (jobs 1 and 3) and from 216 (job 2, solved on the first width and
    // solved from then on), which puts the end tag on both sides of the
    // 201 | 216 wall: at 320px it has only the corridor beside that wall.
    test('every width from 320px up: the plan fits, with the widest status word showing', async ({ page }) => {
        await open(page);
        for (const width of [320, 359, 360, 375, 414, 480, 481, 600, 700, 701, 720, 768, 900, 901, 1024, 1280, 1920]) {
            await page.setViewportSize({ width, height: 900 });
            for (const kind of ['layout', 'flaky', 'no-layout']) {
                await selectJob(page, kind);
                if (kind === 'no-layout' && width === 320) await room(page, 205).click();
                await expect(page.locator('#bsi-plan')).not.toHaveClass(/is-routeless/);
                await expectFits(page, width, `${kind} opening`);
            }
            // Which plan is in force: four rooms along the top at 700px and
            // below, six above.
            const top = await page.evaluate(() => {
                const rooms = Array.from(document.querySelectorAll('#bsi-plan .bsi-room'));
                const first = Math.min(...rooms.map((b) => b.getBoundingClientRect().top));
                return rooms.filter((b) => Math.abs(b.getBoundingClientRect().top - first) < 1)
                    .map((b) => Number(b.getAttribute('data-bsi-room')));
            });
            expect(top, `${width}px: the rooms along the top`)
                .toEqual(width <= 700 ? [207, 208, 209, 210] : [206, 207, 208, 209, 210, 211]);
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
            const seenTexts = new Set();
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
                    seenTexts.add(text);
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
                'bsi-new', 'bsi-job-title', 'bsi-feedback', 'bsi-head', 'bsi-end', 'bsi-space-label',
                'widget-readout-label', 'widget-readout-value']) {
                expect([...seenClasses], 'the sweep should have measured .' + cls).toContain(cls);
            }
            // The plan's own words: every space's label, the box, the tag,
            // and the key's item for the trunk line.
            for (const text of ['Corridor', 'Stair', 'Elev.', 'Restrooms', 'Elec.', 'Supervisor or router',
                'End of trunk', 'the trunk, where it is d']) {
                expect([...seenTexts], 'the sweep should have measured "' + text + '"').toContain(text);
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
    //
    // WHAT IS SWEPT. Not the text on screen at one moment — that leaves
    // out the two calls that are hidden, every result sentence not being
    // shown, and every accessible name. Four things, which between them are
    // everything the page and the engine CAN say:
    //   1. the lesson's textContent (hidden calls included);
    //   2. the text and the accessible names in <main>, gathered at every
    //      step of all three jobs played through a miss, a repeat, the
    //      find, a pick after the find and a new deal;
    //   3. every sentence the engine returns, enumerated in Node over
    //      every fault it can deal;
    //   4. the two source files themselves, comments and all — the closure:
    //      a string neither file contains cannot reach the reader.
    const BANNED = [/capacit/i, /\bvolt/i, /\bohm/i, /resistan/i, /\bmillivolt/i, /\breading of\b/i,
        /multimeter/i, /oscilloscope/i, /plain.english/i, /coming soon/i,
        /\bcustomers?\b/i, /\bschool\b/i, /\bhospital\b/i];
    const offenders = (text) => BANNED.filter((re) => re.test(text)).map(String);

    // Every sentence the engine can hand the page, by playing every fault:
    // each first pick and its repeat, each second pick and its repeat, the
    // method to the end, the slowest way to the end, and a pick after each.
    function everyEngineSentence(B) {
        const said = new Set();
        const codes = new Set();
        const pick = (job, room) => {
            const r = B.pick(job, room);
            said.add(r.text);
            // The reason is inside the text; listed on its own as well, so
            // the checks below see it as the page lays it out.
            if (r.reason !== undefined) said.add(r.reason);
            codes.add(job.fault.type + ':' + r.code);
            return r;
        };
        for (const kind of B.KINDS) {
            const flaky = kind === 'flaky';
            for (const headEnd of B.HEAD_ENDS) {
                for (let at = flaky ? 0 : B.BREAK_MIN; at <= (flaky ? B.ROOM_COUNT - 1 : B.BREAK_MAX); at++) {
                    const fresh = () => B.makeJob(kind, headEnd, at);
                    said.add(B.view(fresh()).prompt);
                    said.add('New job. ' + B.view(fresh()).prompt);
                    for (let a = B.FIRST_ROOM; a <= B.LAST_ROOM; a++) {
                        for (let b = B.FIRST_ROOM; b <= B.LAST_ROOM; b++) {
                            const job = fresh();
                            pick(job, a);
                            pick(job, a);
                            pick(job, b);
                            pick(job, b);
                        }
                    }
                    const byMethod = fresh();
                    while (!byMethod.solved) pick(byMethod, B.method(byMethod)[0]);
                    pick(byMethod, B.FIRST_ROOM);
                    // The long way round: every controller in turn, from the
                    // far end of the trunk inward.
                    const slow = fresh();
                    for (let i = B.ROOM_COUNT - 1; i >= 0 && !slow.solved; i--) pick(slow, B.roomAt(slow, i));
                    pick(slow, B.LAST_ROOM);
                }
            }
        }
        return { said: [...said], codes: [...codes].sort() };
    }

    test('the story is told once, and nothing the page or the engine can say goes past his words', async ({ page }) => {
        await open(page);
        const lesson = page.locator('main .tool-card');
        await expect(lesson.locator('.callout')).toHaveCount(1);
        await expect(lesson.locator('.callout strong')).toHaveText('True story.');
        // textContent, not innerText: the calls that are hidden right now
        // are still things the page says.
        const prose = (await lesson.evaluate((el) => el.textContent)).replace(/\s+/g, ' ');
        expect(prose.match(/True story\./g)).toHaveLength(1);
        expect(prose.match(/\bDMM\b/g), 'his word, used once, in his story').toHaveLength(1);
        expect(prose.match(/A made-up call:/g), 'all three calls are in the text swept').toHaveLength(3);
        expect(offenders(prose), 'the lesson text').toEqual([]);
        expect(await page.evaluate(() => window.BusIsolation.HEAD_NAME)).toBe('the supervisor or router');
        expect(prose.match(/supervisor or router/gi).length).toBeGreaterThanOrEqual(5);
        // The made-up job is called made up, in the prose and in each call.
        expect(prose).toMatch(/One made-up floor/);
        const briefs = await page.locator('#bsi-game [data-bsi-brief]').evaluateAll((els) =>
            els.map((el) => el.textContent.replace(/\s+/g, ' ').trim()));
        expect(briefs).toHaveLength(3);
        for (const brief of briefs) expect(brief).toMatch(/A made-up call:/);

        // 2. Everything <main> shows or names, at every step of every job.
        const everything = () => page.evaluate(() => {
            const main = document.querySelector('main');
            const named = [];
            for (const el of main.querySelectorAll('*')) {
                for (const name of ['aria-label', 'title', 'alt', 'placeholder']) {
                    if (el.hasAttribute(name)) named.push(el.getAttribute(name));
                }
            }
            return (main.textContent + ' ' + named.join(' ')).replace(/\s+/g, ' ');
        });
        const shown = [await everything()];
        for (const kind of KINDS) {
            await selectJob(page, kind);
            shown.push(await everything());
            for (const pick of [216, 216, 203, 201, 208, 208]) {
                await room(page, pick).click();
                shown.push(await everything());
            }
            for (let guard = 0; guard < 8; guard++) {
                const seen = await readPlan(page);
                if (seen.found) break;
                await room(page, readerPick(seen)[0]).click();
                shown.push(await everything());
            }
            expect((await readPlan(page)).found, `${kind}: played to the find`).toBe(true);
            await room(page, 204).click();
            shown.push(await everything());
            await dealSeed(page, 7);
            shown.push(await everything());
        }
        const all = shown.join(' ');
        expect(offenders(all), 'everything shown or named while playing').toEqual([]);
        // Anti-vacuity: the walk reached the states it was sent to.
        for (const reached of ['you stopped here and the break was on neither side', 'beside the break',
            'cut off by your split', 'may still be the troublemaker', 'found: this is the troublemaker',
            'You already stopped at', 'is the end of the run', 'is the first controller on the trunk',
            'This job is finished. The break is between', 'is the troublemaker. Found in', 'New job. ',
            'which the earlier splits already told you', 'may still hold the fault)',
            'No layout: route not drawn', 'Key to the marks on the plan',
            // The why on jobs 1 and 2, each kind of it.
            'so the break is farther along the route', 'so the break is back along the route',
            'where the dead section starts', 'Follow the drawn route from the supervisor or router',
            'are one section', 'So the trunk ends inside that section, at',
            'cannot say which way the supervisor or router is',
            'is not next to that section', 'The first offline room it reaches',
            'through the offline section, so the break is at the other edge of the section',
            'On the plan 201 is next to 216, but the trunk does not join them.',
            'On the plan 216 is next to 201, but the trunk does not join them.']) {
            expect(all, 'the walk should have shown: ' + reached).toContain(reached);
        }

        // 3. Every sentence the engine can return.
        const engine = everyEngineSentence(loadEngine());
        expect(engine.codes).toEqual([
            'break:dead-both', 'break:done', 'break:end-of-run', 'break:first-on-trunk', 'break:found',
            'break:live-both', 'break:repeat',
            'talker:connected-part', 'talker:cut-off-part', 'talker:done', 'talker:found',
            'talker:known-flaky', 'talker:known-stable', 'talker:nothing-past', 'talker:repeat']);
        expect(engine.said.length, 'distinct engine sentences').toBeGreaterThan(1500);
        const bad = engine.said.filter((text) => offenders(text).length > 0);
        expect(bad, 'engine sentences past his words').toEqual([]);
        // On top of the word list, and for the engine's sentences only (the
        // lesson prose legitimately says what to check at the spot is a
        // different question): every result describes THIS made-up floor.
        // No claim about how real jobs tend to go, nothing about what to do
        // at a controller, no meter, no cause, no building or site. And the
        // plain shape the results keep: no dashes, no semicolons.
        const OFF_FLOOR = [/\busually\b/i, /\btypically\b/i, /\boften\b/i, /\bin the field\b/i,
            /\bmeters?\b/i, /\bcauses?\b/i, /\bcheck/i, /\bbuildings?\b/i, /\bsites?\b/i, /[—–;]/];
        const offFloor = (text) => OFF_FLOOR.filter((re) => re.test(text)).map(String);
        expect(engine.said.filter((text) => offFloor(text).length > 0), 'engine sentences off this floor')
            .toEqual([]);
        // Anti-vacuity for that list: a sample for every pattern, in the
        // list's own order, and each pattern fires on its own sample. A
        // pattern added without a sample fails the length check. (The last
        // pattern is a character class, so each of its three characters
        // gets a sample.)
        const OFF_FLOOR_SAMPLES = [
            ['A good tech usually finds it.'],
            ['The break is typically near the end.'],
            ['Seen often enough.'],
            ['Learned in the field.'],
            ['Read it with the meter.', 'Two meters.'],
            ['The cause of a dead trunk.', 'Two causes.'],
            ['Check the wiring at the controller.'],
            ['The whole building went dark.', 'Two buildings.'],
            ['Walk the site first.', 'Two sites.'],
            ['Live trunk — dead trunk.', 'Live trunk – dead trunk.', 'Live trunk; dead trunk.'],
        ];
        expect(OFF_FLOOR_SAMPLES, 'one row of samples per pattern').toHaveLength(OFF_FLOOR.length);
        OFF_FLOOR.forEach((re, i) => {
            for (const sample of OFF_FLOOR_SAMPLES[i]) {
                expect(offFloor(sample), String(re) + ' fires on: ' + sample).toContain(String(re));
            }
        });
        // The reasons themselves were in the list swept.
        for (const part of ['so it had to be in the span between those two.',
            'are one section, and a break cuts off every controller past it, out to the end of the trunk.',
            'So the trunk ends inside that section, at', 'and the break is at the section\'s other edge, at',
            'A stop at either edge of it,', 'so the break is next to',
            'through the offline section, so the break is at the other edge of the section, next to',
            'On the plan 201 is next to 216, but the trunk does not join them.',
            'On the plan 216 is next to 201, but the trunk does not join them.']) {
            expect(engine.said.some((text) => text.includes(part)), 'swept: ' + part).toBe(true);
        }
        // The same list, held to the one-split rule: nothing the engine says
        // about a split claims a room's connection or status carried over.
        expect(engine.said.filter((text) => /still connected|still flaky|still stable|went stable|\bstays?\b/.test(text)))
            .toEqual([]);
        // Every score line the engine can print, by its tail.
        for (const tail of [', the fewest this job takes.', 'Reading the layout first gets it in 1.',
            'Reading the pattern first gets it in 1.', 'Splitting at the midpoint each time gets it in 4.',
            'on a lucky cut. Splitting at the midpoint each time takes 4, wherever the troublemaker is.',
            'splits. Splitting at the midpoint each time takes 4, wherever the troublemaker is.']) {
            expect(engine.said.some((text) => text.endsWith(tail)), 'a finding sentence ends: ' + tail).toBe(true);
            expect(engine.said.some((text) => text.endsWith(tail + ' New job deals another.')),
                'a finished-job sentence carries: ' + tail).toBe(true);
        }

        // 4. The sources, comments and all.
        const sources = {
            page: fs.readFileSync(SOURCE, 'utf8'),
            engine: fs.readFileSync(ENGINE, 'utf8'),
        };
        for (const [name, text] of Object.entries(sources)) {
            expect(text.length, name + ' source was read').toBeGreaterThan(20000);
            expect(offenders(text), name + ' source').toEqual([]);
        }
        // Anti-vacuity for the word list itself.
        expect(offenders('volt / reading of / customer'))
            .toEqual([String(/\bvolt/i), String(/\breading of\b/i), String(/\bcustomers?\b/i)]);
        expect(offenders('his customers'), 'the plural is caught too').toEqual([String(/\bcustomers?\b/i)]);
    });

    // What review took OUT of the prose, pinned so it stays out. Each of
    // these said more than the owner did, or said something the page's own
    // next paragraph contradicted.
    test('the method section gives one split, and the made-up floor owns the arithmetic', async ({ page }) => {
        await open(page);
        // The three steps: the paragraphs between the two subheads.
        const steps = await page.locator('main .tool-body').evaluate((body) => {
            const heads = Array.from(body.querySelectorAll('h2.subhead'));
            const from = heads.find((h) => h.textContent.trim() === 'The order of attack');
            const out = [];
            for (let el = from.nextElementSibling; el && el.tagName !== 'H2'; el = el.nextElementSibling) {
                if (el.tagName === 'P') out.push(el.textContent.replace(/\s+/g, ' ').trim());
            }
            return out;
        });
        expect(steps).toHaveLength(3);
        expect(steps[0]).toMatch(/^First, try to find a bus layout/);
        expect(steps[1]).toMatch(/^No layout\? /);
        // His one split, with both of his hedges, and nothing after it: no
        // repeat, no count, no floor the reader has not met yet.
        expect(steps[2]).toBe('Whole trunk flaky? Break it at the midpoint and see whether the half nearer ' +
            'the supervisor or router becomes stable, since sometimes a device can be transmitting ' +
            'when it should not and take others down.');
        for (const step of steps) expect(step).not.toMatch(/\b(sixteen|four|halve[sd]?|each)\b/i);

        // The arithmetic lives in the Job 3 call, scoped to the made-up
        // floor in so many words, beside the rule that makes it true.
        const call = (await page.locator('[data-bsi-brief="flaky"]').evaluate((el) => el.textContent))
            .replace(/\s+/g, ' ');
        expect(call).toContain('On this made-up floor, where one controller is the whole cause, splitting ' +
            'what may still hold the fault at its midpoint halves it each time: sixteen controllers, four splits.');
        expect(call).toContain('Only one split is open at a time: a new pick rejoins the trunk and splits ' +
            'it at the new spot.');
        expect(call).not.toMatch(/stay connected|still connected|still flaky|went stable/);

        // "Simpler than a real one", with no count of the ways, and the
        // room-number order named as a given of the made-up floor.
        const prose = (await page.locator('main .tool-body').evaluate((el) => el.textContent)).replace(/\s+/g, ' ');
        expect(prose).toContain('The floor in the game below is made up, and it is simpler than a real one. ');
        expect(prose).not.toMatch(/\b(?:two|three|four|\d+) ways\b/i);
        expect(prose).toContain('that order is a given of this made-up floor, and the job with no layout depends on it.');
        expect(prose).toContain('the score is how many stops or splits it took');
        // The report list is named by its caption.
        await expect(page.locator('#bsi-report')).toHaveAttribute('aria-labelledby', 'bsi-report-lbl');
        await expect(page.locator('#bsi-report-lbl')).toHaveText('What you have to go on');
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
