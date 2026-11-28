// Engine-direct tests for /scripts/bus-isolation-engine.js — the rules of
// the find-the-fault game on /education/bus-section-isolation.html. Lives
// under tests/*.spec.js so the same `npm test` (Playwright) runner picks
// it up: Playwright workers are Node processes, and the `page` fixture is
// simply unused here. Same vm loader as psychro-engine.spec.js and
// point-arbitration.spec.js — the engine ends in
// `const BusIsolation = (function () { … })();` plus a window guard, so a
// trailing `; BusIsolation;` makes runInNewContext hand the engine back.
//
// WHY THIS FILE CARRIES SO MUCH OF THE WEIGHT. The page is HIDDEN (no
// canonical, so it is in no manifest and no shared sweep reaches it), and
// every sentence the game prints is instructional prose: "Dead trunk on
// both sides of 212" is a claim about the model's state that a reader will
// act on. The engine writes those sentences beside the rule they report,
// which is what lets this file check them — not by comparing the engine to
// itself, but against an ORACLE written here in room terms, straight from
// the model as the page states it:
//
//   - the trunk visits the rooms in number order, starting at whichever
//     end the supervisor or router is on;
//   - a break puts every room past it, away from the supervisor or router,
//     offline, and leaves the rest online;
//   - a talker makes every connected controller flaky until it is cut off
//     from the supervisor or router's side.
//
// The sweeps are EXHAUSTIVE over the fault space where that is cheap (22
// breaks x 2 kinds, 32 talkers — every job the generator can deal) and
// then repeated over a few hundred seeds, which is the path the page
// actually takes to a job.
//
// The sentence checks PARSE the feedback rather than matching it against
// the template that produced it: a sentence that says "209 to 216 cut off"
// is tested by asking the oracle whether those are the rooms past the
// split. The wording itself is pinned once, by the hand-worked transcripts
// at the bottom.
//
// ONE SPLIT AT A TIME, AND WHAT THAT DOES TO THE WORDS. A new split
// rejoins the trunk and opens it at the new spot, so a room that was cut
// off one move ago can be connected now and a room that read online can
// read flaky. A sentence that says a room is "still connected", or that the
// connected part "went stable" or is "still flaky", is therefore false in
// most second-split states even when its conclusion is right (an earlier
// draft said exactly that on 28 of the 32 jobs played by the midpoint).
// checkSplitSentence() holds every split sentence to the trunk as it is NOW
// — each named room's status, from the oracle — and refuses the continuity
// words outright. The suspects are the one thing that does carry over, and
// "may still hold the fault" is checked as what it claims: the set only
// shrinks and always contains the talker.

const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');
const { test, expect } = require('@playwright/test');

const ENGINE = path.join(__dirname, '..', 'html', 'scripts', 'bus-isolation-engine.js');

function loadEngine() {
    return vm.runInNewContext(fs.readFileSync(ENGINE, 'utf8') + '\n; BusIsolation;', {});
}

// Objects made inside the vm carry that realm's prototypes, which
// toEqual's type check would trip on. Everything the engine returns is
// plain data, so a JSON round trip normalises it.
const plain = (v) => JSON.parse(JSON.stringify(v));

// ── check(): expect()'s shape, without expect()'s bookkeeping ──────────
// Playwright's expect() records every call as a test step and ships it to
// the reporter. That is free in a page spec and ruinous in a sweep: the
// first draft of this file made a few hundred thousand calls, and the
// minimax test below took 4.0 MINUTES with expect() against 1.1 seconds
// with check() (one measurement each, same box, same test body). Thinning
// the seeds until expect() is affordable is not the fix: a sweep cut down
// to fit its assertion library is the opposite of what this file is for.
//
// So the sweeps call check(), which has the same call shape for the
// handful of matchers used here and does nothing but compare and throw.
// A failure still fails the test, with the label naming the case. Each
// sweep then ends on real expect() calls against its own counters, which
// is what proves the loop ran at all.
//
// Equality is by a key-sorted JSON form: everything the engine returns is
// plain data, and this also sidesteps the vm-realm prototype mismatch
// that plain() exists for.
const canon = (v) => JSON.stringify(v, (key, val) => (
    val && typeof val === 'object' && !Array.isArray(val)
        ? Object.keys(val).sort().reduce((o, k) => { o[k] = val[k]; return o; }, {})
        : val));
const show = (v) => (v === undefined ? 'undefined' : canon(v));

// A plain structural comparison, tried first: two JSON passes per check is
// what the enumeration of every flaky state (214,272 picks) spent most of
// its half-minute on. It can only say "equal" where canon() would too, and
// anything it does not call equal still goes to canon(), so the answer is
// canon()'s either way — this is a fast path, not a second definition.
function same(a, b) {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) if (!same(a[i], b[i])) return false;
        return true;
    }
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    for (const k of keys) {
        if (!Object.prototype.hasOwnProperty.call(b, k) || !same(a[k], b[k])) return false;
    }
    return true;
}
const equal = (a, b) => same(a, b) || canon(a) === canon(b);

function check(actual, label) {
    // `label` may be a function, so a sweep does not build a string for
    // every one of its passing checks.
    const fail = (verb, expected) => {
        const name = typeof label === 'function' ? label() : label;
        throw new Error((name ? name + '\n' : '') +
            '  expected ' + verb + ': ' + show(expected) + '\n  actual: ' + show(actual));
    };
    const has = (item) => {
        if (typeof actual === 'string') return actual.includes(item);
        const items = Array.from(actual);
        return items.some((x) => same(x, item)) || items.some((x) => canon(x) === canon(item));
    };
    return {
        toBe(expected) { if (!Object.is(actual, expected)) fail('to be', expected); },
        toEqual(expected) { if (!equal(actual, expected)) fail('to equal', expected); },
        toBeNull() { if (actual !== null) fail('to be', null); },
        toContain(item) { if (!has(item)) fail('to contain', item); },
        toHaveLength(n) { if (actual.length !== n) fail('to have length', n); },
        toBeGreaterThan(n) { if (!(actual > n)) fail('to be greater than', n); },
        toBeGreaterThanOrEqual(n) { if (!(actual >= n)) fail('to be at least', n); },
        toBeLessThanOrEqual(n) { if (!(actual <= n)) fail('to be at most', n); },
        not: {
            toBeNull() { if (actual === null) fail('not to be', null); },
        },
    };
}

const SEEDS = 400;
const HEADS = ['low', 'high'];
const BREAK_KINDS = ['layout', 'no-layout'];

// ── The oracle ─────────────────────────────────────────────────────────
// Rooms in the order the trunk reaches them, from the supervisor or router.
function route(headEnd) {
    const rooms = [];
    for (let r = 201; r <= 216; r++) rooms.push(r);
    return headEnd === 'low' ? rooms : rooms.reverse();
}

// What each room should report, from the model alone. `splitPast` is the
// room the trunk is split past on the flaky job (null: trunk whole).
function expectedStatuses(job, splitPast) {
    const order = route(job.headEnd);
    const out = {};
    if (job.fault.type === 'break') {
        order.forEach((room, i) => { out[room] = i >= job.fault.index ? 'offline' : 'online'; });
        return out;
    }
    const talker = order[job.fault.index];
    const cut = splitPast === null ? order.length : order.indexOf(splitPast) + 1;
    const talkerConnected = order.indexOf(talker) < cut;
    order.forEach((room, i) => {
        out[room] = i >= cut ? 'offline' : (talkerConnected ? 'flaky' : 'online');
    });
    return out;
}

function statuses(B, job) {
    const out = {};
    B.view(job).controllers.forEach((c) => { out[c.room] = c.status; });
    return out;
}

// Every fault the generator can deal, by kind.
function everyJob(B, kind) {
    const jobs = [];
    const flaky = kind === 'flaky';
    const lo = flaky ? 0 : B.BREAK_MIN;
    const hi = flaky ? B.ROOM_COUNT - 1 : B.BREAK_MAX;
    for (const headEnd of HEADS) {
        for (let at = lo; at <= hi; at++) jobs.push(() => B.makeJob(kind, headEnd, at));
    }
    return jobs;
}

const range = (text) => {
    const m = /^(\d+)(?: to (\d+))?$/.exec(text);
    if (!m) throw new Error('not a room range: "' + text + '"');
    const from = Number(m[1]);
    const to = m[2] === undefined ? from : Number(m[2]);
    const rooms = [];
    for (let r = from; r <= to; r++) rooms.push(r);
    return rooms;
};

// ── The feedback sentences, checked against the oracle ─────────────────
// Returns the facts a break-job sentence asserts, each as a boolean the
// oracle decides. Throws on a sentence it does not recognise, so a new
// template cannot slip past unchecked.
function checkStopSentence(text, job, room) {
    const order = route(job.headEnd);
    const pos = order.indexOf(room);
    const toward = pos === 0 ? null : order[pos - 1];
    const away = pos === order.length - 1 ? null : order[pos + 1];
    const st = expectedStatuses(job, null);
    const liveSide = order[job.fault.index - 1];
    const deadSide = order[job.fault.index];
    const body = text.replace(/^You already stopped at (\d+)\. /, (all, r) => {
        check(Number(r), 'the repeat names the room picked').toBe(room);
        return '';
    });

    let m;
    if ((m = /^Found it\. The break is between (\d+) and (\d+)\. (Found in .*)$/.exec(body))) {
        const pair = [Number(m[1]), Number(m[2])];
        check(pair, text).toEqual([Math.min(liveSide, deadSide), Math.max(liveSide, deadSide)]);
        check([liveSide, deadSide], 'a stop finds only a break on one of its own sides')
            .toContain(room);
        checkScoreLine(m[3], job, text);
        return 'found';
    }
    if ((m = /^Live trunk on both sides of (\d+)\. The break is not here\.$/.exec(body))) {
        check(Number(m[1])).toBe(room);
        check(st[room], text).toBe('online');
        check(toward, 'a room with trunk on both sides is not first on the trunk').not.toBeNull();
        check(st[toward], text).toBe('online');
        check(st[away], text).toBe('online');
        return 'miss';
    }
    if ((m = /^(\d+) is the first controller on the trunk: the supervisor or router on one side, live trunk to (\d+) on the other\. The break is not here\.$/.exec(body))) {
        check(Number(m[1])).toBe(room);
        check(toward, text).toBeNull();
        check(Number(m[2]), text).toBe(away);
        check(st[room], text).toBe('online');
        check(st[away], text).toBe('online');
        return 'miss';
    }
    if ((m = /^Dead trunk on both sides of (\d+)\. The break is not here\.$/.exec(body))) {
        check(Number(m[1])).toBe(room);
        check(st[room], text).toBe('offline');
        check(st[toward], text).toBe('offline');
        check(away, 'a room with trunk on both sides is not the end of the run').not.toBeNull();
        check(st[away], text).toBe('offline');
        return 'miss';
    }
    if ((m = /^(\d+) is the end of the run: dead trunk toward (\d+), and nothing past it\. The break is at the other edge of the dead group\.$/.exec(body))) {
        check(Number(m[1])).toBe(room);
        check(away, text).toBeNull();
        check(Number(m[2]), text).toBe(toward);
        check(st[room], text).toBe('offline');
        check(st[toward], text).toBe('offline');
        // "The other edge of the dead group": the dead rooms are one run,
        // this room is one end of it, and the break touches the other end.
        const dead = Object.keys(st).map(Number).filter((r) => st[r] === 'offline');
        const edges = [Math.min(...dead), Math.max(...dead)];
        check(edges, text).toContain(room);
        check(deadSide, text).toBe(edges[0] === room ? edges[1] : edges[0]);
        return 'miss';
    }
    throw new Error('unrecognised stop sentence: "' + text + '"');
}

// The same for the flaky job. `before` is the suspect set the reader could
// already have worked out before this split.
// Words that claim something carried over from the move before. With one
// split open at a time nothing about a room's connection or status does,
// so no split sentence may use them. ("May still hold the fault" is the
// suspects, which do carry over, and is checked on its own terms.)
const CONTINUITY = /\bstill (?:connected|flaky|stable)\b|\bstays?\b|\bstayed\b|\bwent\b|\bremains?\b|\bno longer\b/i;

function checkSplitSentence(text, job, room, before) {
    const order = route(job.headEnd);
    const talker = order[job.fault.index];
    const pos = order.indexOf(room);
    const connectedWant = order.slice(0, pos + 1).sort((a, b) => a - b);
    const cutWant = order.slice(pos + 1).sort((a, b) => a - b);
    check(CONTINUITY.test(text), 'no continuity word in a split sentence: ' + text).toBe(false);
    // The whole of what follows the split's own sentence, nothing before it
    // and nothing after: a template cannot grow a clause this does not read.
    const holding = (s) => {
        const m = /^May still hold the fault: ([\d to]+)\.$/.exec(s);
        check(m, 'an unsolved split ends on what may still hold the fault: ' + text).not.toBeNull();
        const rooms = range(m[1]);
        check(rooms, text).toContain(talker);
        return rooms;
    };
    // The trunk as it is after this pick, from the model alone.
    const now = (splitPast) => expectedStatuses(job, splitPast);

    let m;
    if ((m = /^(\d+) is the last controller on the trunk, so (?:a split past it cuts nothing off\. All 16 controllers are connected and flaky|nothing is cut off past it)\. (.*)$/.exec(text))) {
        check(Number(m[1])).toBe(room);
        check(room, text).toBe(order[order.length - 1]);
        // "Connected and flaky", all sixteen: the trunk is whole, with the
        // talker on it, whatever split was open a move ago.
        check(job.split, text).toBeNull();
        check(Object.values(now(null)).every((st) => st === 'flaky'), text).toBe(true);
        return { after: holding(m[2]), solved: false };
    }
    if ((m = /^The trunk is already split past (\d+)\. (.*)$/.exec(text))) {
        check(Number(m[1])).toBe(room);
        // "Already": the split in place is the one past this room.
        check(job.split === null ? null : order[job.split], text).toBe(room);
        return { after: holding(m[2]), solved: false };
    }
    m = /^Trunk split past (\d+): ([\d to]+) connected, ([\d to]+) cut off\. The connected part is (stable|flaky), (so the troublemaker is in the part cut off|so the troublemaker is in it|which the earlier splits already told you)\. (.*)$/.exec(text);
    if (!m) throw new Error('unrecognised split sentence: "' + text + '"');
    check(Number(m[1])).toBe(room);
    check(range(m[2]), text).toEqual(connectedWant);
    check(range(m[3]), text).toEqual(cutWant);
    const stable = m[4] === 'stable';
    check(stable, text).toBe(cutWant.includes(talker));
    // Room by room, in the present tense: every room the sentence calls
    // connected reports what the sentence says the connected part is, and
    // every room it calls cut off reports offline.
    const st = now(room);
    check(range(m[2]).every((r) => st[r] === (stable ? 'online' : 'flaky')), text).toBe(true);
    check(range(m[3]).every((r) => st[r] === 'offline'), text).toBe(true);
    if (m[5] === 'so the troublemaker is in the part cut off') {
        check(stable, text).toBe(true);
    } else if (m[5] === 'so the troublemaker is in it') {
        check(stable, text).toBe(false);
    } else {
        // "which the earlier splits already told you": every room that
        // could still hold the talker was already on one side of this cut.
        const side = stable ? cutWant : connectedWant;
        check(before.every((r) => side.includes(r)), text).toBe(true);
    }
    const found = /^One controller left: (\d+) is the troublemaker\. (Found in .*)$/.exec(m[6]);
    if (found) {
        check(Number(found[1]), text).toBe(talker);
        checkScoreLine(found[2], job, text);
        return { after: [talker], solved: true };
    }
    const after = holding(m[6]);
    // What is left is exactly what the reader knew, cut down by this split.
    const side = stable ? cutWant : connectedWant;
    check(after, text).toEqual(before.filter((r) => side.includes(r)));
    return { after, solved: false };
}

// A pick after the job is solved. The page prints each result over the
// last, so this sentence has to say again where the fault is and what the
// score was — and say it truly. `first` is the sentence that found it.
const SCORE_TAILS = [
    ', the fewest this job takes.',
    '. Reading the layout first gets it in 1.',
    '. Reading the pattern first gets it in 1.',
    '. Splitting at the midpoint each time gets it in 4.',
    '. Splitting at the midpoint each time takes 4, wherever the troublemaker is.',
    ', on a lucky cut. Splitting at the midpoint each time takes 4, wherever the troublemaker is.',
];

// "Found in N stops…", wherever it is printed: the count is the job's own,
// the unit is the job's, and the rest of the line is the one that count
// earns — 1 is the floor on a break job, 4 is what the midpoint promises on
// the flaky one. Matched to the end of the line.
function checkScoreLine(line, job, text) {
    const m = /^Found in (\d+) (stops?|splits?)(.*)$/.exec(line);
    check(m, 'a score line: ' + text).not.toBeNull();
    const n = Number(m[1]);
    check(n, 'the count quoted is the count: ' + text).toBe(job.stops);
    const unit = job.fault.type === 'break' ? 'stop' : 'split';
    check(m[2], text).toBe(n === 1 ? unit : unit + 's');
    let tail;
    if (job.fault.type === 'break') {
        tail = n === 1 ? SCORE_TAILS[0] : (job.kind === 'layout' ? SCORE_TAILS[1] : SCORE_TAILS[2]);
    } else {
        tail = n > 4 ? SCORE_TAILS[3] : (n === 4 ? SCORE_TAILS[4] : SCORE_TAILS[5]);
    }
    check(m[3], 'the score line fits the count: ' + text).toBe(tail);
}

function checkDoneSentence(text, job, first) {
    const order = route(job.headEnd);
    let m;
    let line;
    if (job.fault.type === 'break') {
        m = /^This job is finished\. The break is between (\d+) and (\d+)\. (Found in .*) New job deals another\.$/.exec(text);
        check(m, 'a finished break job restates the break: ' + text).not.toBeNull();
        const liveSide = order[job.fault.index - 1];
        const deadSide = order[job.fault.index];
        check([Number(m[1]), Number(m[2])], text)
            .toEqual([Math.min(liveSide, deadSide), Math.max(liveSide, deadSide)]);
        line = m[3];
    } else {
        m = /^This job is finished\. (\d+) is the troublemaker\. (Found in .*) New job deals another\.$/.exec(text);
        check(m, 'a finished flaky job restates the troublemaker: ' + text).not.toBeNull();
        check(Number(m[1]), text).toBe(order[job.fault.index]);
        line = m[2];
    }
    checkScoreLine(line, job, text);
    // The whole score line is the one the finding sentence ended on.
    if (first !== undefined) check(first.endsWith(line), text + '\n  vs: ' + first).toBe(true);
    return 'done';
}

// ── Loading ────────────────────────────────────────────────────────────
test.describe('bus-isolation engine: a pure classic script', () => {

    test('loads in a bare vm context and exposes the documented API', () => {
        const B = loadEngine();
        for (const name of ['newJob', 'nextJob', 'makeJob', 'sameFault', 'roomAt', 'indexOf',
            'macOf', 'statusOf', 'view', 'pick', 'method']) {
            expect(typeof B[name], name).toBe('function');
        }
        expect(B.ROOM_COUNT).toBe(16);
        expect(B.FIRST_ROOM).toBe(201);
        expect(B.LAST_ROOM).toBe(216);
        expect(plain(B.KINDS)).toEqual(['layout', 'no-layout', 'flaky']);
        expect(B.HEAD_NAME).toBe('the supervisor or router');
        expect(plain(B.BEST)).toEqual({ 'layout': 1, 'no-layout': 1, 'flaky': 4 });
        expect(plain(B.METHOD_MAX)).toEqual({ 'layout': 1, 'no-layout': 2, 'flaky': 4 });
    });

    test('creates exactly one global on a window, and nothing else', () => {
        const ctx = { window: {} };
        vm.runInNewContext(fs.readFileSync(ENGINE, 'utf8'), ctx);
        expect(Object.keys(ctx.window)).toEqual(['BusIsolation']);
        expect(Object.keys(ctx), 'no property leaks onto the global object').toEqual(['window']);
    });

    // The header promises no DOM, no timers, no storage and no draw the
    // caller did not seed. A reference to any of them is one edit away
    // from a game that cannot be tested or that writes to a reader's
    // device, so the promise is checked against the code itself.
    test('touches no DOM, timer, storage or unseeded random source', () => {
        const code = fs.readFileSync(ENGINE, 'utf8')
            .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
        expect(code.length, 'sanity: the engine source was read').toBeGreaterThan(2000);
        for (const banned of ['document', 'localStorage', 'sessionStorage', 'cookie', 'setTimeout',
            'setInterval', 'requestAnimationFrame', 'Math.random', 'Date', 'navigator', 'fetch']) {
            expect(code.includes(banned), 'the engine must not reference ' + banned).toBe(false);
        }
        // The one sanctioned mention of `window` is the export guard.
        expect(code.match(/\bwindow\b/g)).toHaveLength(2);
    });

    test('a room that is not on the floor is a RangeError, not a move', () => {
        const B = loadEngine();
        const job = B.newJob('layout', 1);
        for (const bad of [200, 217, 0, 209.5, '209', undefined]) {
            expect(() => B.pick(job, bad), String(bad)).toThrow(/no room/);
        }
        expect(job.stops, 'a bad room costs nothing').toBe(0);
        expect(() => B.newJob('nope', 1)).toThrow(/unknown job kind/);
        expect(() => B.makeJob('layout', 'low', 2)).toThrow(/outside/);
        expect(() => B.makeJob('layout', 'low', 14)).toThrow(/outside/);
        expect(() => B.makeJob('flaky', 'middle', 4)).toThrow(/headEnd/);
    });
});

// ── The generator ──────────────────────────────────────────────────────
test.describe('bus-isolation engine: the seeded generator', () => {

    test('the same kind and seed always deal the same job', () => {
        const B = loadEngine();
        let dealt = 0;
        for (const kind of B.KINDS) {
            for (let seed = 0; seed < SEEDS; seed++) {
                const a = B.newJob(kind, seed);
                const b = loadEngine().newJob(kind, seed);
                check(plain(a), `${kind} seed ${seed}`).toEqual(plain(b));
                check(a.seed).toBe(seed);
                check(a.stops).toBe(0);
                check(a.solved, 'no job starts solved').toBe(false);
                dealt += 1;
            }
        }
        expect(dealt, 'the sweep ran').toBe(3 * SEEDS);
    });

    test('faults stay inside the model, and every fault can be dealt', () => {
        const B = loadEngine();
        const reachable = {};
        for (const kind of B.KINDS) {
            const seen = new Set();
            for (let seed = 0; seed < 2000; seed++) {
                const job = B.newJob(kind, seed);
                check(HEADS).toContain(job.headEnd);
                if (kind === 'flaky') {
                    check(job.fault.type).toBe('talker');
                    check(job.fault.index).toBeGreaterThanOrEqual(0);
                    check(job.fault.index).toBeLessThanOrEqual(15);
                } else {
                    check(job.fault.type).toBe('break');
                    check(job.fault.index).toBeGreaterThanOrEqual(3);
                    check(job.fault.index).toBeLessThanOrEqual(13);
                }
                seen.add(job.headEnd + job.fault.index);
            }
            reachable[kind] = seen.size;
        }
        // Both ends, times eleven break positions or sixteen talkers.
        expect(reachable).toEqual({ 'layout': 22, 'no-layout': 22, 'flaky': 32 });
    });

    // Literal pins. If the generator changes, these move — and the page's
    // opening jobs with them, which the page spec plays by hand.
    test('the opening jobs are the ones the page was written against', () => {
        const B = loadEngine();
        expect(plain(B.OPENING)).toEqual({ 'layout': 8, 'no-layout': 5, 'flaky': 28 });

        const one = B.newJob('layout', B.OPENING.layout);
        expect([one.headEnd, one.fault.type, one.fault.index]).toEqual(['low', 'break', 9]);
        expect(B.view(one).prompt)
            .toBe('Rooms 210 to 216 are offline. Pick the controller where you would stop first.');

        const two = B.newJob('no-layout', B.OPENING['no-layout']);
        expect([two.headEnd, two.fault.type, two.fault.index]).toEqual(['high', 'break', 11]);
        expect(B.view(two).prompt)
            .toBe('Rooms 201 to 205 are offline. Pick the controller where you would stop first.');

        const three = B.newJob('flaky', B.OPENING.flaky);
        expect([three.headEnd, three.fault.type, three.fault.index]).toEqual(['low', 'talker', 11]);
        expect(B.roomAt(three, three.fault.index)).toBe(212);
        expect(B.view(three).prompt)
            .toBe('All 16 controllers are flaky. Pick a controller to split the trunk past it.');
    });

    test('"New job" never deals the fault that is already on the plan', () => {
        const B = loadEngine();
        let dealt = 0;
        for (const kind of B.KINDS) {
            let job = B.newJob(kind, 0);
            for (let seed = 0; seed < SEEDS; seed++) {
                const next = B.nextJob(kind, seed, job);
                check(B.sameFault(next, job), `${kind} seed ${seed}`).toBe(false);
                check(plain(next), 'deterministic for the same inputs')
                    .toEqual(plain(B.nextJob(kind, seed, job)));
                job = next;
                dealt += 1;
            }
            // With nothing on the plan it is newJob.
            expect(plain(B.nextJob(kind, 77, null))).toEqual(plain(B.newJob(kind, 77)));
        }
        expect(dealt, 'the sweep ran').toBe(3 * SEEDS);
    });

    test('rooms, MACs and chain positions convert both ways', () => {
        const B = loadEngine();
        for (const headEnd of HEADS) {
            const job = B.makeJob('flaky', headEnd, 0);
            const order = route(headEnd);
            for (let i = 0; i < 16; i++) {
                expect(B.roomAt(job, i)).toBe(order[i]);
                expect(B.indexOf(job, order[i])).toBe(i);
            }
        }
        // MACs were handed out in room order: MAC 1 in 201, MAC 16 in 216.
        for (let room = 201; room <= 216; room++) expect(B.macOf(room)).toBe(room - 200);
    });
});

// ── What the supervisor or router reports ──────────────────────────────
test.describe('bus-isolation engine: statuses match the fault', () => {

    test('a break darkens every room past it and no other', () => {
        const B = loadEngine();
        let jobs = 0;
        for (const kind of BREAK_KINDS) {
            for (const make of everyJob(B, kind)) {
                const job = make();
                const st = statuses(B, job);
                check(st, `${kind} ${job.headEnd} ${job.fault.index}`)
                    .toEqual(expectedStatuses(job, null));
                // In room terms, with no reference to chain positions: the
                // dead rooms are one run that reaches the far end of the
                // floor, and at least three rooms sit on each side.
                const dead = Object.keys(st).map(Number).filter((r) => st[r] === 'offline');
                const live = Object.keys(st).map(Number).filter((r) => st[r] === 'online');
                check(dead.length + live.length).toBe(16);
                check(dead.length).toBeGreaterThanOrEqual(3);
                check(live.length).toBeGreaterThanOrEqual(3);
                check(dead[dead.length - 1] - dead[0], 'the dead rooms are one run').toBe(dead.length - 1);
                check(dead).toContain(job.headEnd === 'low' ? 216 : 201);
                check(live).toContain(job.headEnd === 'low' ? 201 : 216);
                for (const room of Object.keys(st).map(Number)) {
                    check(B.statusOf(job, room)).toBe(st[room]);
                }
                jobs += 1;
            }
        }
        expect(jobs, 'every break on both break jobs').toBe(2 * 22);
    });

    test('a talker makes the whole trunk flaky, and a split sorts it', () => {
        const B = loadEngine();
        let splits = 0;
        for (const make of everyJob(B, 'flaky')) {
            const whole = make();
            check(Object.values(statuses(B, whole)).every((s) => s === 'flaky')).toBe(true);
            for (let room = 201; room <= 216; room++) {
                const job = make();
                B.pick(job, room);
                const lastRoom = route(job.headEnd)[15];
                check(statuses(B, job), `${job.headEnd} talker ${job.fault.index} split past ${room}`)
                    .toEqual(expectedStatuses(job, room === lastRoom ? null : room));
                splits += 1;
            }
        }
        expect(splits, 'every talker, every split').toBe(32 * 16);
    });

    test('the same holds for every job a seed can deal', () => {
        const B = loadEngine();
        let dealt = 0;
        for (const kind of B.KINDS) {
            for (let seed = 0; seed < SEEDS; seed++) {
                const job = B.newJob(kind, seed);
                check(statuses(B, job), `${kind} seed ${seed}`).toEqual(expectedStatuses(job, null));
                dealt += 1;
            }
        }
        expect(dealt, 'the sweep ran').toBe(3 * SEEDS);
    });
});

// ── What the page is allowed to draw ───────────────────────────────────
test.describe('bus-isolation engine: view()', () => {

    test('a no-layout job gives away neither end of the trunk until it is solved', () => {
        const B = loadEngine();
        for (const make of everyJob(B, 'no-layout')) {
            const job = make();
            const before = B.view(job);
            expect(before.routeShown).toBe(false);
            expect(before.headEnd).toBeNull();
            expect(before.links).toHaveLength(0);
            // Nothing else in the view names an end or a chain position.
            expect(Object.keys(before).sort()).toEqual(['best', 'controllers', 'found', 'headEnd',
                'kind', 'links', 'prompt', 'routeShown', 'solved', 'stops', 'suspects', 'unit']);
            expect(Object.keys(before.controllers[0]).sort()).toEqual(['besideBreak', 'checked',
                'cutOff', 'found', 'mac', 'room', 'status', 'suspect']);

            B.pick(job, B.method(job)[0]);
            if (!job.solved) B.pick(job, B.method(job)[0]);
            const after = B.view(job);
            expect(after.solved).toBe(true);
            expect(after.routeShown, 'the route is drawn once the break is found').toBe(true);
            expect(after.headEnd).toBe(job.headEnd);
            expect(after.links).toHaveLength(16);
        }
    });

    test('the drawn route runs from the supervisor or router through the rooms in order', () => {
        const B = loadEngine();
        for (const kind of ['layout', 'flaky']) {
            for (const make of everyJob(B, kind)) {
                const job = make();
                const v = B.view(job);
                const order = route(job.headEnd);
                expect(v.routeShown).toBe(true);
                expect(v.headEnd).toBe(job.headEnd);
                expect(v.links.map((l) => [l.a, l.b])).toEqual(
                    order.map((room, i) => [i === 0 ? 'head' : order[i - 1], room]));
                // Nothing is marked before the reader has done anything —
                // in particular, not the break.
                expect(v.links.every((l) => l.state === 'whole')).toBe(true);
                expect(v.controllers.map((c) => c.room)).toEqual(route('low'));
                expect(v.controllers.map((c) => c.mac)).toEqual(route('low').map((r) => r - 200));
            }
        }
    });

    test('marks appear only where something happened', () => {
        const B = loadEngine();

        // A found break: the open segment, and the two rooms beside it.
        const brk = B.makeJob('layout', 'high', 6);      // 216 … 211 | 210 … 201
        B.pick(brk, 204);                                // a miss, in the dead group
        let v = B.view(brk);
        expect(v.controllers.filter((c) => c.checked).map((c) => c.room)).toEqual([204]);
        expect(v.links.some((l) => l.state !== 'whole'), 'a miss marks no segment').toBe(false);
        B.pick(brk, 211);
        v = B.view(brk);
        expect(plain(v.found)).toEqual({ type: 'break', between: [210, 211] });
        expect(plain(v.links.filter((l) => l.state !== 'whole')))
            .toEqual([{ a: 211, b: 210, state: 'break' }]);
        expect(v.controllers.filter((c) => c.besideBreak).map((c) => c.room)).toEqual([210, 211]);

        // A split: one segment, the rooms past it cut off, suspects flagged.
        const flk = B.makeJob('flaky', 'low', 2);        // talker in 203
        B.pick(flk, 208);
        v = B.view(flk);
        expect(plain(v.links.filter((l) => l.state !== 'whole')))
            .toEqual([{ a: 208, b: 209, state: 'split' }]);
        expect(v.controllers.filter((c) => c.cutOff).map((c) => c.room))
            .toEqual([209, 210, 211, 212, 213, 214, 215, 216]);
        expect(v.controllers.filter((c) => c.suspect).map((c) => c.room))
            .toEqual([201, 202, 203, 204, 205, 206, 207, 208]);
        expect(plain(v.suspects)).toEqual({ from: 201, to: 208, count: 8 });
    });
});

// ── Break jobs: a stop ─────────────────────────────────────────────────
test.describe('bus-isolation engine: a stop never claims what it did not find', () => {

    test('every stop on every break job reports the trunk as it is', () => {
        const B = loadEngine();
        let stops = 0;
        let doubled = 0;
        for (const kind of BREAK_KINDS) {
            for (const make of everyJob(B, kind)) {
                for (let room = 201; room <= 216; room++) {
                    const job = make();
                    const order = route(job.headEnd);
                    const beside = [order[job.fault.index - 1], order[job.fault.index]];
                    const r = B.pick(job, room);
                    stops += 1;
                    const where = `${kind} ${job.headEnd} break ${beside.join('|')} stop ${room}`;

                    // Found if and only if the break is on one of this
                    // controller's own two sides.
                    check(r.code === 'found', where).toBe(beside.includes(room));
                    check(r.solved, where).toBe(beside.includes(room));
                    check(r.counted, where).toBe(true);
                    check(r.stops, where).toBe(1);
                    check(checkStopSentence(r.text, job, room), where)
                        .toBe(beside.includes(room) ? 'found' : 'miss');

                    // The structured sides agree with the oracle too.
                    const pos = order.indexOf(room);
                    const seg = (s) => (s < job.fault.index ? 'live' : s === job.fault.index ? 'break' : 'dead');
                    check(plain(r.sides), where).toEqual({
                        toward: { to: pos === 0 ? 'head' : order[pos - 1], state: seg(pos) },
                        away: pos === 15
                            ? { to: null, state: 'none' }
                            : { to: order[pos + 1], state: seg(pos + 1) },
                    });
                    if (r.solved) {
                        check(plain(r.found), where).toEqual({
                            type: 'break',
                            between: beside.slice().sort((a, b) => a - b),
                        });
                        // The double click: the same controller again, and
                        // any other one, still say where the break is.
                        for (const again of [room, 201, 216]) {
                            const d = B.pick(job, again);
                            check(d.code, where).toBe('done');
                            check(d.counted, where).toBe(false);
                            check(job.stops, where).toBe(1);
                            checkDoneSentence(d.text, job, r.text);
                            doubled += 1;
                        }
                    } else {
                        check(r.found, where).toBeNull();
                    }
                }
            }
        }
        expect(stops, 'the sweep ran').toBe(2 * 22 * 16);
        // Two finding controllers on each of the 44 break jobs, three picks
        // after each find.
        expect(doubled, 'the double click was tried on every finding stop').toBe(2 * 22 * 2 * 3);
    });

    test('a miss costs a stop; the same ceiling again does not; a finished job is finished', () => {
        const B = loadEngine();
        const job = B.makeJob('no-layout', 'low', 8);    // 201 … 208 | 209 … 216
        expect(B.pick(job, 212).code).toBe('dead-both');
        expect(job.stops).toBe(1);

        const again = B.pick(job, 212);
        expect(again.code).toBe('repeat');
        expect(again.counted).toBe(false);
        expect(job.stops, 'looking again is free').toBe(1);
        expect(again.text).toBe('You already stopped at 212. Dead trunk on both sides of 212. The break is not here.');
        checkStopSentence(again.text, job, 212);

        expect(B.pick(job, 203).code).toBe('live-both');
        expect(B.pick(job, 201).code).toBe('first-on-trunk');
        expect(B.pick(job, 216).code).toBe('end-of-run');
        expect(job.stops).toBe(4);
        expect(job.solved).toBe(false);

        const found = B.pick(job, 208);
        expect(found.code).toBe('found');
        expect(job.stops).toBe(5);
        const done = B.pick(job, 204);
        expect(done.code).toBe('done');
        expect(done.counted).toBe(false);
        // Printed over the "Found it" line, so it carries the finding and
        // the score line with it.
        expect(done.text).toBe('This job is finished. The break is between 208 and 209. ' +
            'Found in 5 stops. Reading the pattern first gets it in 1. New job deals another.');
        checkDoneSentence(done.text, job, found.text);
        expect(job.stops, 'nothing counts after the job is solved').toBe(5);
        expect(plain(done.found)).toEqual({ type: 'break', between: [208, 209] });
        // The finding controller itself, picked again: the same sentence.
        expect(B.pick(job, 208).text).toBe(done.text);
        expect(job.stops).toBe(5);
    });

    test('random play: whatever the reader picks, every sentence is true and the count is honest', () => {
        const B = loadEngine();
        let solved = 0;
        let sentences = 0;
        let mostStops = 0;
        for (const kind of BREAK_KINDS) {
            for (let seed = 0; seed < SEEDS; seed++) {
                const job = B.newJob(kind, seed);
                // A tiny LCG of our own — independent of the engine's.
                let x = (seed * 2654435761 + 17) >>> 0;
                const next = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
                let counted = 0;
                for (let guard = 0; guard < 200 && !job.solved; guard++) {
                    const room = 201 + Math.floor(next() * 16);
                    const r = B.pick(job, room);
                    if (r.counted) counted += 1;
                    checkStopSentence(r.text, job, room);
                    check(r.stops).toBe(counted);
                    sentences += 1;
                }
                check(job.solved, `${kind} seed ${seed} is always solvable`).toBe(true);
                // Sixteen rooms, two of them beside the break, and a
                // second look at a room is free: fifteen is the ceiling.
                check(counted).toBeLessThanOrEqual(15);
                // Whatever the count came to, a pick after the find
                // restates the break and that count.
                const finding = job.last.text;
                const done = B.pick(job, 201 + Math.floor(next() * 16));
                check(done.code).toBe('done');
                checkDoneSentence(done.text, job, finding);
                check(done.stops, 'nothing counts after the job is solved').toBe(counted);
                solved += 1;
                mostStops = Math.max(mostStops, counted);
            }
        }
        expect(solved, 'every job dealt was played to the end').toBe(2 * SEEDS);
        // Anti-vacuity: random play really did wander before it found one.
        expect(sentences).toBeGreaterThan(4 * SEEDS);
        expect(mostStops).toBeGreaterThan(8);
    });
});

// ── The owner's method, and the numbers the score quotes ───────────────
test.describe('bus-isolation engine: the method solves at the stated best', () => {

    test('layout in hand: either controller at the start of the dead section finds it in one', () => {
        const B = loadEngine();
        for (const make of everyJob(B, 'layout')) {
            const picks = plain(B.method(make()));
            const order = route(make().headEnd);
            const firstDead = order[make().fault.index];
            const lastLive = order[make().fault.index - 1];
            expect(picks).toEqual([firstDead, lastLive].sort((a, b) => a - b));
            for (const room of picks) {
                const job = make();
                const r = B.pick(job, room);
                expect(r.solved).toBe(true);
                expect(job.stops).toBe(B.BEST.layout);
                expect(job.stops).toBeLessThanOrEqual(B.METHOD_MAX.layout);
                expect(r.text.endsWith('Found in 1 stop, the fewest this job takes.')).toBe(true);
                expect(plain(B.method(job)), 'no pick left once solved').toEqual([]);
            }
        }
    });

    test('no layout: the highest or the lowest offline room never needs more than two stops', () => {
        const B = loadEngine();
        for (const make of everyJob(B, 'no-layout')) {
            const st = statuses(B, make());
            const dead = Object.keys(st).map(Number).filter((r) => st[r] === 'offline');
            const lowest = Math.min(...dead);
            const highest = Math.max(...dead);
            expect(plain(B.method(make())), 'the method is the two ends of the offline list')
                .toEqual([lowest, highest]);

            let solvedInOne = 0;
            for (const [first, other] of [[lowest, highest], [highest, lowest]]) {
                const job = make();
                const r1 = B.pick(job, first);
                if (r1.solved) {
                    solvedInOne += 1;
                    expect(job.stops).toBe(1);
                    continue;
                }
                // The wrong end says what it is, truthfully, and the method
                // then has exactly one room left to try.
                expect(r1.code).toBe('end-of-run');
                expect(checkStopSentence(r1.text, job, first)).toBe('miss');
                expect(plain(B.method(job))).toEqual([other]);
                const r2 = B.pick(job, other);
                expect(r2.solved).toBe(true);
                expect(job.stops).toBe(2);
                expect(r2.text.endsWith('Found in 2 stops. Reading the pattern first gets it in 1.')).toBe(true);
            }
            // One of the two ends is always the right one: BEST is real.
            expect(solvedInOne, 'exactly one end of the dead group is at the break').toBe(1);
            expect(B.BEST['no-layout']).toBe(1);
            expect(B.METHOD_MAX['no-layout']).toBe(2);
        }
    });

    test('no layout: a stop in the middle of the dead group finds dead trunk both ways and costs a stop', () => {
        const B = loadEngine();
        let middles = 0;
        for (const make of everyJob(B, 'no-layout')) {
            const st = statuses(B, make());
            const dead = Object.keys(st).map(Number).filter((r) => st[r] === 'offline');
            for (const room of dead.slice(1, -1)) {
                const job = make();
                const r = B.pick(job, room);
                middles += 1;
                expect(r.code, `${room} inside ${dead[0]}-${dead[dead.length - 1]}`).toBe('dead-both');
                expect(r.text).toBe(`Dead trunk on both sides of ${room}. The break is not here.`);
                expect(r.solved).toBe(false);
                expect(job.stops).toBe(1);
            }
        }
        expect(middles, 'every dead group has a middle to get wrong').toBeGreaterThanOrEqual(22);
    });

    test('whole trunk flaky: the midpoint takes exactly four splits wherever the talker is', () => {
        const B = loadEngine();
        for (const make of everyJob(B, 'flaky')) {
            const job = make();
            const talker = route(job.headEnd)[job.fault.index];
            let known = route('low');
            const sizes = [];
            while (!job.solved) {
                const picks = B.method(job);
                expect(picks).toHaveLength(1);
                const r = B.pick(job, picks[0]);
                const facts = checkSplitSentence(r.text, job, picks[0], known);
                known = facts.after;
                sizes.push(known.length);
                expect(r.narrowed, 'a midpoint split always tells you something').toBe(true);
            }
            expect(sizes, `${job.headEnd} talker ${talker}: sixteen halve to one`).toEqual([8, 4, 2, 1]);
            expect(job.stops).toBe(4);
            expect(job.stops).toBe(B.BEST.flaky);
            expect(plain(job.found)).toEqual({ type: 'talker', room: talker });
            expect(job.last.text.endsWith('Found in 4 splits. Splitting at the midpoint each time ' +
                'takes 4, wherever the troublemaker is.')).toBe(true);
            // The last split again (the double click), then any other room.
            const finding = job.last.text;
            for (const again of [B.roomAt(job, job.lastPick), talker, 201]) {
                const d = B.pick(job, again);
                expect(d.code).toBe('done');
                expect(d.text).toBe(`This job is finished. ${talker} is the troublemaker. Found in 4 ` +
                    'splits. Splitting at the midpoint each time takes 4, wherever the troublemaker ' +
                    'is. New job deals another.');
                checkDoneSentence(d.text, job, finding);
                expect(job.stops).toBe(4);
            }
        }
    });

    // Halving n suspects leaves ceil(n/2) on one side and floor(n/2) on the
    // other, so the midpoint needs at most ceil(log2 n) more splits and at
    // least floor(log2 n) — the two agree exactly when n is a power of two,
    // which is why the opening sixteen always take four.
    test('from any point in a flaky job, the midpoint finishes within ceil(log2(suspects)) more', () => {
        const B = loadEngine();
        let played = 0;
        const counts = new Set();
        for (let seed = 0; seed < SEEDS; seed++) {
            const job = B.newJob('flaky', seed);
            let x = (seed * 40503 + 9) >>> 0;
            const next = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
            // A few arbitrary splits first, then the method to the end.
            for (let i = 0; i < 3 && !job.solved; i++) B.pick(job, 201 + Math.floor(next() * 16));
            if (job.solved) continue;
            const left = B.view(job).suspects.count;
            const start = job.stops;
            for (let guard = 0; guard < 16 && !job.solved; guard++) B.pick(job, B.method(job)[0]);
            check(job.solved, `seed ${seed}: the method always finishes`).toBe(true);
            const took = job.stops - start;
            check(took, `seed ${seed}: ${left} suspects`).toBeLessThanOrEqual(Math.ceil(Math.log2(left)));
            check(took, `seed ${seed}: ${left} suspects`).toBeGreaterThanOrEqual(Math.floor(Math.log2(left)));
            played += 1;
            counts.add(left);
        }
        // Anti-vacuity: most seeds survive three arbitrary splits unsolved,
        // and they leave a spread of suspect counts, not one.
        expect(played).toBeGreaterThan(SEEDS / 2);
        expect(counts.size).toBeGreaterThan(4);
    });
});

test.describe('bus-isolation engine: the stated best cannot be beaten', () => {

    test('a break job is never solved before a stop is made', () => {
        const B = loadEngine();
        for (const kind of BREAK_KINDS) {
            for (const make of everyJob(B, kind)) {
                const job = make();
                expect(job.solved).toBe(false);
                expect(B.view(job).found).toBeNull();
                expect(B.BEST[kind], 'one stop is the floor, and the method reaches it').toBe(1);
            }
        }
    });

    // The flaky job's "4" is a promise, not a lucky minimum. This plays
    // EVERY plan through the engine: from each set of suspects, try every
    // split, sort the talkers by what the engine then says is left, and
    // take the plan whose worst case is smallest. If any plan could
    // promise three, this returns three.
    test('no plan of splits can promise fewer than four from sixteen suspects', () => {
        const B = loadEngine();
        const LAST = B.ROOM_COUNT - 1;
        for (const headEnd of HEADS) {
            const memo = new Map();
            // A job with talker t, driven to suspects [lo, hi] by the two
            // splits that pin those bounds.
            const jobAt = (t, lo, hi) => {
                const job = B.makeJob('flaky', headEnd, t);
                if (lo > 0) B.pick(job, B.roomAt(job, lo - 1));
                if (hi < LAST) B.pick(job, B.roomAt(job, hi));
                check(plain(job.suspects)).toEqual({ lo, hi });
                return job;
            };
            const worstCase = (lo, hi) => {
                if (lo === hi) return 0;
                const key = lo + ':' + hi;
                if (memo.has(key)) return memo.get(key);
                let best = Infinity;
                for (let j = 0; j <= LAST; j++) {
                    const outcomes = new Map();
                    for (let t = lo; t <= hi; t++) {
                        const job = jobAt(t, lo, hi);
                        B.pick(job, B.roomAt(job, j));
                        check(job.suspects.lo <= t && t <= job.suspects.hi,
                            'the talker is never dropped from the suspects').toBe(true);
                        outcomes.set(job.suspects.lo + ':' + job.suspects.hi,
                            [job.suspects.lo, job.suspects.hi]);
                    }
                    // A split that leaves some talker's suspects unchanged
                    // has promised nothing for that case.
                    if (outcomes.has(key)) continue;
                    let worst = 0;
                    for (const [a, b] of outcomes.values()) worst = Math.max(worst, worstCase(a, b));
                    best = Math.min(best, 1 + worst);
                }
                memo.set(key, best);
                return best;
            };
            expect(worstCase(0, LAST), `supervisor or router on the ${headEnd} end`).toBe(4);
            expect(B.BEST.flaky).toBe(4);
            // And the general shape, so the 4 is not a coincidence of 16.
            expect(worstCase(0, 7)).toBe(3);
            expect(worstCase(4, 6)).toBe(2);
            expect(worstCase(9, 10)).toBe(1);
            // Every stretch of the trunk that splits can leave you holding
            // was solved on the way: 16 x 15 / 2 of them.
            expect(memo.size, 'the search covered every run of suspects').toBe(120);
        }
    });

    test('fewer than four is luck, and the score line says so', () => {
        const B = loadEngine();
        // The fewest splits each talker CAN be found in, by breadth-first
        // search over real picks.
        for (const headEnd of HEADS) {
            for (let t = 0; t < 16; t++) {
                let frontier = [[]];
                let found = null;
                for (let depth = 1; depth <= 4 && found === null; depth++) {
                    const nextFrontier = [];
                    for (const picks of frontier) {
                        for (let room = 201; room <= 216 && found === null; room++) {
                            const job = B.makeJob('flaky', headEnd, t);
                            for (const p of picks) B.pick(job, p);
                            const r = B.pick(job, room);
                            if (!r.counted || !r.narrowed) continue;
                            if (job.solved) found = { depth, text: r.text, stops: job.stops };
                            else nextFrontier.push(picks.concat(room));
                        }
                    }
                    frontier = nextFrontier;
                }
                const atAnEnd = t === 0 || t === 15;
                expect(found.depth, `${headEnd} talker at index ${t}`).toBe(atAnEnd ? 1 : 2);
                expect(found.stops).toBe(found.depth);
                expect(found.text).toContain(found.depth === 1
                    ? 'Found in 1 split, on a lucky cut. Splitting at the midpoint each time takes 4, wherever the troublemaker is.'
                    : 'Found in 2 splits, on a lucky cut. Splitting at the midpoint each time takes 4, wherever the troublemaker is.');
            }
        }
    });
});

// ── Flaky job: a split ─────────────────────────────────────────────────
test.describe('bus-isolation engine: a split never claims what it did not show', () => {

    test('every first split on every flaky job reports the trunk as it is', () => {
        const B = loadEngine();
        let splits = 0;
        let foundInOne = 0;
        for (const make of everyJob(B, 'flaky')) {
            for (let room = 201; room <= 216; room++) {
                const job = make();
                const order = route(job.headEnd);
                const talker = order[job.fault.index];
                const r = B.pick(job, room);
                const where = `${job.headEnd} talker ${talker} split past ${room}`;
                const facts = checkSplitSentence(r.text, job, room, route('low'));
                splits += 1;
                if (job.solved) foundInOne += 1;
                check(r.counted, where).toBe(true);
                check(job.stops, where).toBe(1);
                if (room === order[15]) {
                    check(r.code, where).toBe('nothing-past');
                    check(r.narrowed, where).toBe(false);
                    check(B.view(job).links.every((l) => l.state === 'whole'), where).toBe(true);
                    continue;
                }
                // Stable if and only if the talker is past the split.
                const cut = order.slice(order.indexOf(room) + 1);
                check(r.stable, where).toBe(cut.includes(talker));
                check(facts.solved, where).toBe(job.solved);
                // Solved only when one room is left, and it is the talker.
                if (job.solved) {
                    check(facts.after, where).toEqual([talker]);
                    check(plain(r.found), where).toEqual({ type: 'talker', room: talker });
                } else {
                    check(facts.after.length, where).toBeGreaterThan(1);
                    check(r.found, where).toBeNull();
                }
            }
        }
        expect(splits, 'every talker, every split').toBe(32 * 16);
        // One split can only ever isolate a controller at an end of the
        // trunk: two ends, two places for the supervisor or router.
        expect(foundInOne).toBe(4);
    });

    // The enumeration. A flaky job's state is the split in place, the last
    // counted pick and the suspects; this walks EVERY such state each of the
    // 32 faults can reach, makes every pick from it, and holds the sentence
    // to the trunk as it is after that pick. Nothing here is sampled.
    test('every state a flaky job can reach, every pick from it: the sentence is true of the trunk as it is now', () => {
        // About six seconds on the old box this was written on; the
        // headroom is for a loaded CI runner, not for more work.
        test.setTimeout(120_000);
        const B = loadEngine();
        // pick() mutates the job and its suspects, and replaces the rest.
        const copy = (job) => Object.assign({}, job, {
            suspects: Object.assign({}, job.suspects), checked: job.checked.slice(), last: null,
        });
        const key = (j) => [j.split, j.lastPick, j.suspects.lo, j.suspects.hi].join(',');
        let states = 0;
        let transitions = 0;
        let finds = 0;
        let rejoins = 0;      // picks that reconnected a room the split in place had cut off
        let cutOffPicked = 0; // picks of a controller that was cut off when picked
        let views = 0;
        const codes = new Set();
        for (const make of everyJob(B, 'flaky')) {
            const start = make();
            const order = route(start.headEnd);
            const talker = order[start.fault.index];
            const seen = new Set([key(start)]);
            const reported = new Map([[null, statuses(B, start)]]);
            let frontier = [start];
            while (frontier.length) {
                const next = [];
                for (const state of frontier) {
                    states += 1;
                    const known = order.slice(state.suspects.lo, state.suspects.hi + 1).sort((a, b) => a - b);
                    const before = reported.get(state.split);
                    for (let room = 201; room <= 216; room++) {
                        const job = copy(state);
                        const r = B.pick(job, room);
                        transitions += 1;
                        codes.add(r.code);
                        const where = () => `${start.headEnd} talker ${talker}, state ${key(state)}, pick ${room}`;
                        const facts = checkSplitSentence(r.text, job, room, known);
                        check(facts.after, where).toContain(talker);
                        // One split open at a time, and it is past the room
                        // picked — or none at all, at the last controller.
                        const open = job.split === null ? null : order[job.split];
                        check(open, where).toBe(room === order[15] ? null : room);
                        // What the floor reports depends on the fault and
                        // the split in place and on nothing else, so it is
                        // read from the engine once per split and reused.
                        // (Inside the vm every room lookup pays a slow
                        // global read; 214,272 fresh views cost ~5 s here.)
                        let now = reported.get(job.split);
                        if (!now) {
                            const v = B.view(job);
                            now = {};
                            for (const c of v.controllers) {
                                now[c.room] = c.status;
                                check(c.cutOff, where).toBe(c.status === 'offline');
                            }
                            check(now, where).toEqual(expectedStatuses(job, open));
                            check(v.links.filter((l) => l.state === 'split').map((l) => [l.a, l.b]), where)
                                .toEqual(open === null ? [] : [[open, order[job.split + 1]]]);
                            reported.set(job.split, now);
                            views += 1;
                        }
                        if (before[room] === 'offline') cutOffPicked += 1;
                        for (let rm = 201; rm <= 216; rm++) {
                            if (before[rm] === 'offline' && now[rm] !== 'offline') { rejoins += 1; break; }
                        }
                        if (job.solved) {
                            finds += 1;
                            check(facts.solved, where).toBe(true);
                            check(job.found.room, where).toBe(talker);
                            checkDoneSentence(B.pick(job, room).text, job, r.text);
                            continue;
                        }
                        check(facts.solved, where).toBe(false);
                        if (!seen.has(key(job))) { seen.add(key(job)); next.push(job); }
                    }
                }
                frontier = next;
            }
        }
        // Pinned: the size of the space. A change to the rules moves these.
        expect({ states, transitions, finds }).toEqual({ states: 13392, transitions: 214272, finds: 4964 });
        // Fifteen places to split each of the 32 trunks (the whole trunk is
        // read before the walk starts).
        expect(views, 'every split of every trunk was read from the engine').toBe(32 * 15);
        // The states the old wording got wrong are in the walk, in bulk.
        expect(cutOffPicked).toBeGreaterThan(10000);
        expect(rejoins).toBeGreaterThan(10000);
        expect([...codes].sort()).toEqual(['connected-part', 'cut-off-part', 'found',
            'known-flaky', 'known-stable', 'nothing-past', 'repeat']);
    });

    test('random play: every sentence is true, suspects only shrink, and the right room is found', () => {
        const B = loadEngine();
        const seenCodes = new Set();
        let solved = 0;
        for (let seed = 0; seed < SEEDS; seed++) {
            const job = B.newJob('flaky', seed);
            const talker = route(job.headEnd)[job.fault.index];
            let x = (seed * 2246822519 + 3) >>> 0;
            const next = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
            let known = route('low');
            let counted = 0;
            let lastRoom = null;
            for (let guard = 0; guard < 400 && !job.solved; guard++) {
                const room = 201 + Math.floor(next() * 16);
                const r = B.pick(job, room);
                seenCodes.add(r.code);
                // Only an exact repeat of the split in place is free.
                check(r.counted, `seed ${seed} pick ${room}`).toBe(room !== lastRoom);
                if (r.counted) counted += 1;
                lastRoom = room;
                const facts = checkSplitSentence(r.text, job, room, known);
                check(facts.after.every((rm) => known.includes(rm)), 'suspects only shrink').toBe(true);
                check(facts.after).toContain(talker);
                known = facts.after;
                // The view agrees with the sentence.
                const v = B.view(job);
                if (!job.solved) {
                    check(v.controllers.filter((c) => c.suspect).map((c) => c.room)).toEqual(known);
                    check(v.suspects.count).toBe(known.length);
                }
                check(r.stops).toBe(counted);
                check(statuses(B, job)).toEqual(expectedStatuses(job,
                    job.split === null ? null : B.roomAt(job, job.split)));
            }
            check(job.solved, `seed ${seed} is always solvable`).toBe(true);
            check(job.found.room).toBe(talker);
            check(B.view(job).controllers.filter((c) => c.found).map((c) => c.room)).toEqual([talker]);
            check(B.view(job).controllers.some((c) => c.suspect), 'no suspects once found').toBe(false);
            const finding = job.last.text;
            const done = B.pick(job, 205);
            check(done.code).toBe('done');
            checkDoneSentence(done.text, job, finding);
            check(job.stops, 'nothing counts after the job is solved').toBe(counted);
            solved += 1;
        }
        expect(solved, 'every job dealt was played to the end').toBe(SEEDS);
        // Anti-vacuity: the random walk reached every branch a split has.
        expect([...seenCodes].sort()).toEqual(['connected-part', 'cut-off-part', 'found',
            'known-flaky', 'known-stable', 'nothing-past', 'repeat']);
    });
});

// ── The wording, pinned once ───────────────────────────────────────────
// Hand-worked from the model, not copied from engine output: each line
// below was written by reading the fault off the job and asking what a
// stop or a split there must show. The page spec plays the same jobs
// through the built page.
test.describe('bus-isolation engine: hand-worked transcripts', () => {

    test('job 1 opening — 201 to 209 live, break between 209 and 210, supervisor or router at 201', () => {
        const B = loadEngine();
        const job = B.newJob('layout', B.OPENING.layout);
        expect(B.pick(job, 204).text)
            .toBe('Live trunk on both sides of 204. The break is not here.');
        expect(B.pick(job, 201).text)
            .toBe('201 is the first controller on the trunk: the supervisor or router on one side, ' +
                'live trunk to 202 on the other. The break is not here.');
        expect(B.pick(job, 213).text)
            .toBe('Dead trunk on both sides of 213. The break is not here.');
        expect(B.pick(job, 216).text)
            .toBe('216 is the end of the run: dead trunk toward 215, and nothing past it. ' +
                'The break is at the other edge of the dead group.');
        expect(B.pick(job, 210).text)
            .toBe('Found it. The break is between 209 and 210. ' +
                'Found in 5 stops. Reading the layout first gets it in 1.');

        const clean = B.newJob('layout', B.OPENING.layout);
        expect(B.pick(clean, 209).text)
            .toBe('Found it. The break is between 209 and 210. Found in 1 stop, the fewest this job takes.');
    });

    test('job 2 opening — 201 to 205 dark, break between 205 and 206, supervisor or router at 216', () => {
        const B = loadEngine();
        const job = B.newJob('no-layout', B.OPENING['no-layout']);
        expect(plain(B.method(job))).toEqual([201, 205]);
        expect(B.pick(job, 201).text)
            .toBe('201 is the end of the run: dead trunk toward 202, and nothing past it. ' +
                'The break is at the other edge of the dead group.');
        expect(B.pick(job, 203).text)
            .toBe('Dead trunk on both sides of 203. The break is not here.');
        expect(B.pick(job, 216).text)
            .toBe('216 is the first controller on the trunk: the supervisor or router on one side, ' +
                'live trunk to 215 on the other. The break is not here.');
        expect(B.pick(job, 205).text)
            .toBe('Found it. The break is between 205 and 206. ' +
                'Found in 4 stops. Reading the pattern first gets it in 1.');
    });

    test('job 3 opening — talker in 212, supervisor or router at 201', () => {
        const B = loadEngine();
        const job = B.newJob('flaky', B.OPENING.flaky);
        expect(B.pick(job, 208).text)
            .toBe('Trunk split past 208: 201 to 208 connected, 209 to 216 cut off. ' +
                'The connected part is stable, so the troublemaker is in the part cut off. ' +
                'May still hold the fault: 209 to 216.');
        expect(B.pick(job, 203).text)
            .toBe('Trunk split past 203: 201 to 203 connected, 204 to 216 cut off. ' +
                'The connected part is stable, which the earlier splits already told you. ' +
                'May still hold the fault: 209 to 216.');
        // The trunk was split past 203 a move ago, with 204 to 216 cut off.
        // This pick rejoins it: all sixteen are connected, none "still".
        expect(B.pick(job, 216).text)
            .toBe('216 is the last controller on the trunk, so a split past it cuts nothing off. ' +
                'All 16 controllers are connected and flaky. ' +
                'May still hold the fault: 209 to 216.');
        expect(B.pick(job, 216).text)
            .toBe('216 is the last controller on the trunk, so nothing is cut off past it. ' +
                'May still hold the fault: 209 to 216.');
        expect(B.pick(job, 212).text)
            .toBe('Trunk split past 212: 201 to 212 connected, 213 to 216 cut off. ' +
                'The connected part is flaky, so the troublemaker is in it. ' +
                'May still hold the fault: 209 to 212.');
        expect(B.pick(job, 212).text)
            .toBe('The trunk is already split past 212. May still hold the fault: 209 to 212.');
        expect(B.pick(job, 214).text)
            .toBe('Trunk split past 214: 201 to 214 connected, 215 to 216 cut off. ' +
                'The connected part is flaky, which the earlier splits already told you. ' +
                'May still hold the fault: 209 to 212.');
        expect(B.pick(job, 210).text)
            .toBe('Trunk split past 210: 201 to 210 connected, 211 to 216 cut off. ' +
                'The connected part is stable, so the troublemaker is in the part cut off. ' +
                'May still hold the fault: 211 to 212.');
        expect(B.pick(job, 211).text)
            .toBe('Trunk split past 211: 201 to 211 connected, 212 to 216 cut off. ' +
                'The connected part is stable, so the troublemaker is in the part cut off. ' +
                'One controller left: 212 is the troublemaker. ' +
                'Found in 7 splits. Splitting at the midpoint each time gets it in 4.');
        expect(job.stops).toBe(7);
        expect(B.pick(job, 211).text)
            .toBe('This job is finished. 212 is the troublemaker. Found in 7 splits. ' +
                'Splitting at the midpoint each time gets it in 4. New job deals another.');
        expect(job.stops, 'the double click is free').toBe(7);
    });

    // The job-3 method on the opening job, which is where the old wording
    // went wrong: the second split picks a controller the first one had
    // cut off. Before 212 is picked the plan shows 201 to 208 online and
    // 209 to 216 offline; after it, 201 to 212 are connected and flaky.
    // "201 to 212 still connected" and "still flaky" were false of that.
    test('job 3 by the midpoint — a second split rejoins the trunk, and the words say only what is', () => {
        const B = loadEngine();
        const job = B.newJob('flaky', B.OPENING.flaky);
        B.pick(job, 208);
        expect(statuses(B, job)[208]).toBe('online');
        expect(statuses(B, job)[212], '212 is cut off by the first split').toBe('offline');
        const second = B.pick(job, 212);
        expect(second.text)
            .toBe('Trunk split past 212: 201 to 212 connected, 213 to 216 cut off. ' +
                'The connected part is flaky, so the troublemaker is in it. ' +
                'May still hold the fault: 209 to 212.');
        expect(statuses(B, job)[208], '208 read online a move ago').toBe('flaky');
        expect(statuses(B, job)[212], '212 was cut off a move ago').toBe('flaky');
        expect(CONTINUITY.test(second.text)).toBe(false);
        // Anti-vacuity for the word list: it does catch the old sentences.
        for (const old of ['201 to 212 still connected, 213 to 216 cut off.',
            'The connected part is still flaky, so the troublemaker is in it.',
            'The connected part went stable, so the troublemaker is in the part cut off.',
            'that controller and everything nearer stay connected']) {
            expect(CONTINUITY.test(old), old).toBe(true);
        }
    });

    // Every state the method can reach, and every state anything can: one
    // split open at a time is a rule of the floor, so it is pinned as one.
    test('only one split is ever open, and a pick past the last controller rejoins the trunk', () => {
        const B = loadEngine();
        let states = 0;
        let rejoined = 0;
        let regained = 0;
        for (const make of everyJob(B, 'flaky')) {
            for (let a = 201; a <= 216; a++) {
                for (let b = 201; b <= 216; b++) {
                    const job = make();
                    const order = route(job.headEnd);
                    const first = B.pick(job, a);
                    const known = checkSplitSentence(first.text, job, a, route('low')).after;
                    if (job.solved) continue;
                    const before = statuses(B, job);
                    const r = B.pick(job, b);
                    states += 1;
                    const v = B.view(job);
                    const open = v.links.filter((l) => l.state === 'split');
                    const last = order[15];
                    check(open.length, `${a} then ${b}`).toBe(b === last ? 0 : 1);
                    if (b !== last) {
                        // The open segment is the one on b's far side.
                        check([open[0].a, open[0].b], `${a} then ${b}`)
                            .toEqual([b, order[order.indexOf(b) + 1]]);
                    } else if (a !== last) {
                        rejoined += 1;
                    }
                    check(statuses(B, job), `${a} then ${b}`)
                        .toEqual(expectedStatuses(job, b === last ? null : b));
                    // The second split put back rooms the first had cut off.
                    if (Object.keys(before).some((room) =>
                        before[room] === 'offline' && statuses(B, job)[room] !== 'offline')) regained += 1;
                    check(r.code === 'repeat', `${a} then ${b}`).toBe(a === b);
                    checkSplitSentence(r.text, job, b, known);
                }
            }
        }
        // Every pair of picks, less the four jobs one split solves.
        expect(states).toBe(32 * 16 * 16 - 4 * 16);
        expect(rejoined, 'a pick past the last controller closed an open split').toBeGreaterThan(400);
        expect(regained, 'a later split reconnected rooms an earlier one cut off').toBeGreaterThan(3000);
    });

    test('the supervisor or router on the high end reads the same way, mirrored', () => {
        const B = loadEngine();
        const job = B.makeJob('flaky', 'high', 0);       // talker in 216, wired straight to it
        expect(B.pick(job, 209).text)
            .toBe('Trunk split past 209: 209 to 216 connected, 201 to 208 cut off. ' +
                'The connected part is flaky, so the troublemaker is in it. ' +
                'May still hold the fault: 209 to 216.');
        expect(B.pick(job, 216).text)
            .toBe('Trunk split past 216: 216 connected, 201 to 215 cut off. ' +
                'The connected part is flaky, so the troublemaker is in it. ' +
                'One controller left: 216 is the troublemaker. ' +
                'Found in 2 splits, on a lucky cut. Splitting at the midpoint each time takes 4, ' +
                'wherever the troublemaker is.');
    });
});
