// ──────────────────────────────────────────────────────────────────────
// bus-isolation-engine.js — the rules of the find-the-fault game on
// /education/bus-section-isolation.html: one made-up floor, one MS/TP
// trunk, one fault per job.
//
// Loaded as a *classic* script (no type="module"), same convention as
// /scripts/point-arbitration.js and /scripts/wiring-engine.js: the page
// adds
//
//     <script src="/scripts/bus-isolation-engine.js"></script>
//
// inside its {% block scripts %}, BEFORE its own inline IIFE, and
// reaches the API through the window.BusIsolation global — the only
// global this file creates. The 11ty build copies it through unchanged;
// nothing transpiles or bundles.
//
// PURE — no DOM, no timers, no storage, no Math.random. Every draw
// comes from a seed the caller passes in, so a job is a pure function
// of (kind, seed) and the specs can reason about any job the page can
// show. The page owns the drawing and the event wiring and nothing
// else: fault placement, what each controller reports, what a stop or
// a split shows, when a job is solved, the score and every sentence of
// feedback are decided here, so one Node spec can check them over
// hundreds of seeds.
//
// ── THE MODEL (synthetic, and the page says so) ──────────────────────
// One made-up floor: ROOM_COUNT (16) zone controllers in rooms
// FIRST_ROOM..LAST_ROOM (201..216) on ONE daisy-chained MS/TP trunk
// that starts at "the supervisor or router" (HEAD_NAME — the phrase
// education/bacnet-mstp.html uses; no vendor or product name belongs in
// this file). The trunk runs in room-number order and the MAC addresses
// were handed out the same way: macOf(room) = room − 200, so MAC 1 is
// room 201 and MAC 16 is room 216.
//
// THE PLAN the page draws: the sixteen rooms round the outside of a
// corridor loop, with a core in the middle (stairs, elevator, restrooms
// and the electrical room that holds the supervisor or router). The room
// numbers walk the ring, so FIRST_ROOM and LAST_ROOM, 201 and 216, are
// plan neighbours, wall to wall under the electrical room, and they are
// also the two ENDS of the trunk, which never joins them. That one false
// neighbour is what the no-layout job tests, and two of its sentences
// name it (the end-of-run stop and the first-on-trunk stop, both of
// which are always at 201 or 216 on that job). They are true only of a
// plan that draws 201 and 216 side by side with no link between them;
// tests/bus-section-isolation.spec.js pins that on the built page.
//
// Which END the supervisor or router sits on is part of each job:
// headEnd 'low' puts it before room 201, 'high' puts it after room 216.
// Positions along the trunk are CHAIN INDEXES, 0..15, counted from the
// supervisor or router: index 0 is the controller wired straight to it
// and index 15 is the end of the run. roomAt() / indexOf() convert.
// SEGMENT s is the length of trunk arriving at index s from the
// supervisor or router's side: segment 0 joins the supervisor or router
// to index 0, segment s joins index s−1 to index s.
//
// What the reader sees is what the supervisor or router reports about
// each controller: 'online', 'offline', or 'flaky' (dropping in and
// out). There is exactly ONE fault per job, of one of two types:
//
//   break   Segment b is open. Every controller past it, away from the
//           supervisor or router, is offline (indexes b..15); the rest
//           are online. b is drawn from BREAK_MIN..BREAK_MAX (3..13),
//           so at least three rooms stay online and at least three go
//           dark — the dead group is always a section, never the whole
//           floor and never a lone controller.
//   talker  One controller (any index) is transmitting when it should
//           not. The whole trunk is flaky for as long as that
//           controller is still connected to the supervisor or router's
//           side, and stable the moment it is cut off from it.
//
// WHAT THE MODEL LEAVES OUT, on purpose: a real trunk can carry more
// than one fault at once, and a real break also leaves the
// still-connected section without the terminator that sat at the far
// end. Neither is modelled. Nothing electrical is: no meter, no
// reading, no cable. Do not add any — the page's field-practice
// statements are capped at what the site's owner said, and he said
// nothing about them.
//
// ── THE THREE JOB KINDS (KINDS) ──────────────────────────────────────
//   'layout'     a break; the trunk route is drawn on the plan.
//   'no-layout'  a break; the route is NOT drawn and view() withholds
//                which end the supervisor or router is on until the
//                job is solved.
//   'flaky'      a talker; the route is drawn.
//
// Every move is the same gesture — pick(job, room) — and means:
//
//   On a break job, a STOP at that controller. A stop looks at the
//   trunk on both sides of the controller, as far as the next
//   controller each way, and reports each side as 'live' (still tied to
//   the supervisor or router), 'dead' (whole, but past the break),
//   'break' (the open segment itself) or 'none' (the end of the run has
//   no far side). The stop FINDS the break if the break is on either
//   side — that is, at index b or at index b−1.
//
//   On the flaky job, a SPLIT past that controller. The trunk is opened
//   on the controller's far side: it and everything nearer the
//   supervisor or router are connected, everything past it is cut off
//   and reports offline. The connected part is stable if the talker is
//   in the part cut off, and flaky if it is not.
//
//   ONLY ONE SPLIT IS OPEN AT A TIME. A new pick rejoins the trunk and
//   splits it at the new spot, so a controller that was cut off a move
//   ago can be connected now, and one that read online can read flaky.
//   That is why no sentence about a split says "still" or "stays" of a
//   controller's connection or status: after a second split those words
//   are false about half the floor. The sentences state what the trunk
//   is NOW. The one thing that does carry over is the SUSPECTS — the
//   chain-index range that may still hold the talker given every split
//   so far — which only ever shrinks. The job is solved when one
//   suspect is left.
//
// SCORING. Every pick costs one, except picking the same controller
// again on a break job, repeating the split that is already in place,
// and any pick after the job is solved. (A split past the last
// controller costs one although it cuts nothing off.) BEST is the
// number the score line quotes, and METHOD_MAX is the most picks the
// owner's method can take:
//
//   layout     BEST 1, METHOD_MAX 1 — the layout shows where the dead
//              section starts; that controller or the live one before
//              it finds the break.
//   no-layout  BEST 1, METHOD_MAX 2 — his method starts at the highest
//              or the lowest offline room. One of those two is always
//              the end of the run and the other always finds the break,
//              so it is two stops at most. Reading which edge of the
//              dead group is the end of the run gets it in one: a break
//              cuts off everything out to the end of the trunk, so that
//              edge is the one at 201 or 216, and the break is at the
//              other. (Reading for the edge with a live room next to it
//              works along the trunk only. On the plan both edges have
//              one: the end of the run is 201 or 216, wall to wall with
//              the other.) The find's reason argues it this way.
//   flaky      BEST 4, METHOD_MAX 4 — splitting the suspects at their
//              midpoint takes exactly ceil(log2(16)) = 4 splits wherever
//              the talker is. Here BEST is the fewest splits any plan
//              can PROMISE, not the fewest a lucky guess can take: a
//              first split past index 0 solves the job in one when the
//              talker happens to be index 0. No plan can promise fewer
//              than four (three yes/no answers tell eight cases apart,
//              not sixteen), and the score line calls a sub-four result
//              a lucky cut.
//
// ── API (window.BusIsolation) ────────────────────────────────────────
//
//   Constants
//     ROOM_COUNT, FIRST_ROOM, LAST_ROOM   16, 201, 216
//     KINDS        ['layout', 'no-layout', 'flaky']
//     HEAD_ENDS    ['low', 'high']
//     HEAD_NAME    'the supervisor or router'
//     BREAK_MIN, BREAK_MAX   3, 13 — the chain-index range a break's
//                  first dead controller is drawn from
//     BEST, METHOD_MAX       { layout, 'no-layout', flaky } → number
//     OPENING      { kind: seed } — the job each kind opens on, so the
//                  first paint is the same for every reader and a spec
//                  can play it without stubbing anything
//
//   Making a job
//     newJob(kind, seed)   → job. Deterministic: the same (kind, seed)
//         always yields the same fault. seed is any integer; it is read
//         as an unsigned 32-bit value.
//     nextJob(kind, seed, previous)   → job. newJob(kind, seed), but
//         steps the seed (seed+1, seed+2, …) until the fault differs
//         from `previous`, so "New job" never deals the same fault
//         twice running. Deterministic for a given (kind, seed, previous).
//     makeJob(kind, headEnd, at[, seed])   → job with an explicit fault:
//         `at` is the chain index of the first DEAD controller on a
//         break job (BREAK_MIN..BREAK_MAX) or of the talker on the
//         flaky job (0..15). For specs that sweep every fault.
//     sameFault(a, b)   → boolean (kind, headEnd and fault all equal)
//
//   A job is plain data, and pick() MUTATES it:
//     { kind, seed, headEnd,
//       fault: { type: 'break' | 'talker', index },
//       stops, solved,
//       found:    null | { type: 'break', between: [roomLo, roomHi] }
//                      | { type: 'talker', room },
//       checked:  [chain index, …]   stops that found nothing (break)
//       split:    null | chain index the trunk is split past (flaky)
//       lastPick: null | chain index of the last counted split (flaky)
//       suspects: null | { lo, hi } chain-index range (flaky)
//       last:     null | the last result pick() returned }
//
//   Reading the floor
//     roomAt(job, index) → room      indexOf(job, room) → chain index
//     macOf(room) → MAC              statusOf(job, room) → 'online' |
//                                    'offline' | 'flaky'
//     view(job) → everything the page draws, built fresh each call:
//       { kind, unit ('stop' | 'split'), stops, solved, best,
//         routeShown, headEnd (null while the route is hidden),
//         controllers: 16 × { room, mac, status, cutOff, checked,
//             suspect, found, besideBreak }   in ROOM order,
//         links: 16 × { a: 'head' | room, b: room,
//             state: 'whole' | 'break' | 'split' }   in chain order —
//             an EMPTY array while the route is hidden, and the open
//             segment reads 'break' only once the job is solved,
//         suspects: null | { from, to, count }   (rooms, low to high),
//         found, prompt (the opening instruction for this job) }
//       view() is the only thing the page should read on a 'no-layout'
//       job: it is what keeps the hidden end of the trunk out of the DOM.
//
//   Playing
//     pick(job, room) → result. THROWS a RangeError for a room that is
//         not on the floor — that is a page bug, not a player's move.
//         result: { code, text, counted, room, stops, solved, found,
//           sides (break jobs: { toward: { to, state }, away: { to,
//             state } }, "toward" being the supervisor or router's side),
//           reason (break jobs: the part of `text` that says why),
//           stable, narrowed, connected, cutOff, suspects (flaky job) }
//         `text` is the sentence the page prints. It is written here,
//         next to the rule it reports, because it is instructional
//         prose: every sentence has to be TRUE of the job's state, and
//         tests/bus-isolation-engine.spec.js checks each one against
//         the fault for every job the generator can make.
//         On a break job every result says WHY (see "Break jobs: why"
//         below), and `reason` is that part of `text`, verbatim: the
//         end of it on a miss or a repeat, the middle of it (before the
//         score line) on a find or a 'done'. The page lays it out on a
//         line of its own. The flaky job's results carry no reason.
//         Break-job codes:  found · live-both · first-on-trunk ·
//                           dead-both · end-of-run · repeat · done
//         Flaky-job codes:  found · cut-off-part · connected-part ·
//                           known-stable · known-flaky · nothing-past ·
//                           repeat · done
//         A 'done' result (any pick after the job is solved) RESTATES
//         what was found. On the two break jobs that is the finding, its
//         reason and the score line. On the flaky job it is the finding
//         and the score line, and the result carries no reason. The page
//         prints each result over the last, so a double click on the
//         controller that finds the fault would otherwise wipe out where
//         the fault is (and, on a break job, why).
//     method(job) → [room, …] — the pick(s) the owner's method makes
//         next, low room first; any of them follows the method. Empty
//         once the job is solved.
//           layout     the two controllers either side of where the
//                      dead section starts on the drawn route
//           no-layout  the lowest and the highest offline room, less
//                      any already stopped at
//           flaky      the midpoint of the suspects: the split that
//                      leaves ceil(n/2) of them connected
//
// Consumers: education/bus-section-isolation.html.
// Tests: tests/bus-isolation-engine.spec.js (pure-Node vm loader) and
// tests/bus-section-isolation.spec.js (drives the built page).
// ──────────────────────────────────────────────────────────────────────

'use strict';

const BusIsolation = (function () {
    'use strict';

    const ROOM_COUNT = 16;
    const FIRST_ROOM = 201;
    const LAST_ROOM = FIRST_ROOM + ROOM_COUNT - 1;
    const LAST_INDEX = ROOM_COUNT - 1;
    const FIRST_MAC = 1;
    const KINDS = ['layout', 'no-layout', 'flaky'];
    const HEAD_ENDS = ['low', 'high'];
    const HEAD_NAME = 'the supervisor or router';
    // A break's first dead controller. Three rooms stay online and three
    // go dark at the least, so the wrong picks the page teaches against —
    // a live room well short of the break, the middle of the dead group,
    // the end of the run — exist on every job.
    const BREAK_MIN = 3;
    const BREAK_MAX = ROOM_COUNT - 3;

    // Yes/no answers needed to tell n cases apart: the smallest k with
    // 2^k >= n. Counted with integers so 16 is exactly 4.
    function splitsFor(n) {
        let k = 0;
        let span = 1;
        while (span < n) { span *= 2; k += 1; }
        return k;
    }

    const BEST = { 'layout': 1, 'no-layout': 1, 'flaky': splitsFor(ROOM_COUNT) };
    const METHOD_MAX = { 'layout': 1, 'no-layout': 2, 'flaky': splitsFor(ROOM_COUNT) };

    // The job each kind opens on. Chosen, not drawn: a break between 209
    // and 210 with the supervisor or router on the 201 end (210-216
    // dark); a break between 205 and 206 with it on the 216 end (201-205
    // dark); and a talker in room 212 with it on the 201 end. Pinned by
    // tests/bus-isolation-engine.spec.js, so a change to the generator
    // that moves them fails there instead of silently changing the page.
    const OPENING = { 'layout': 8, 'no-layout': 5, 'flaky': 28 };

    // mulberry32 — a small seeded generator, enough to place one fault.
    function rng(seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function isBreakKind(kind) { return kind === 'layout' || kind === 'no-layout'; }

    function checkRoom(room) {
        if (!Number.isInteger(room) || room < FIRST_ROOM || room > LAST_ROOM) {
            throw new RangeError('BusIsolation: no room ' + room + ' on this floor (' +
                FIRST_ROOM + '-' + LAST_ROOM + ')');
        }
    }

    function roomAt(job, index) {
        return job.headEnd === 'low' ? FIRST_ROOM + index : LAST_ROOM - index;
    }

    function indexOf(job, room) {
        checkRoom(room);
        return job.headEnd === 'low' ? room - FIRST_ROOM : LAST_ROOM - room;
    }

    function macOf(room) {
        checkRoom(room);
        return room - FIRST_ROOM + FIRST_MAC;
    }

    function makeJob(kind, headEnd, at, seed) {
        if (KINDS.indexOf(kind) === -1) {
            throw new RangeError('BusIsolation: unknown job kind "' + kind + '"');
        }
        if (HEAD_ENDS.indexOf(headEnd) === -1) {
            throw new RangeError('BusIsolation: headEnd must be "low" or "high"');
        }
        const breakJob = isBreakKind(kind);
        const min = breakJob ? BREAK_MIN : 0;
        const max = breakJob ? BREAK_MAX : LAST_INDEX;
        if (!Number.isInteger(at) || at < min || at > max) {
            throw new RangeError('BusIsolation: fault index ' + at + ' is outside ' +
                min + '-' + max + ' for a "' + kind + '" job');
        }
        return {
            kind: kind,
            seed: seed === undefined ? null : seed,
            headEnd: headEnd,
            fault: { type: breakJob ? 'break' : 'talker', index: at },
            stops: 0,
            solved: false,
            found: null,
            checked: [],
            split: null,
            lastPick: null,
            suspects: breakJob ? null : { lo: 0, hi: LAST_INDEX },
            last: null,
        };
    }

    function newJob(kind, seed) {
        if (KINDS.indexOf(kind) === -1) {
            throw new RangeError('BusIsolation: unknown job kind "' + kind + '"');
        }
        const s = seed >>> 0;
        const next = rng(s);
        const headEnd = next() < 0.5 ? 'low' : 'high';
        const at = isBreakKind(kind)
            ? BREAK_MIN + Math.floor(next() * (BREAK_MAX - BREAK_MIN + 1))
            : Math.floor(next() * ROOM_COUNT);
        return makeJob(kind, headEnd, at, s);
    }

    function sameFault(a, b) {
        return !!a && !!b && a.kind === b.kind && a.headEnd === b.headEnd &&
            a.fault.type === b.fault.type && a.fault.index === b.fault.index;
    }

    // The generator has 22 distinct breaks and 32 distinct talkers, so a
    // different one turns up within a step or two; the bound only keeps
    // the loop finite.
    function nextJob(kind, seed, previous) {
        const start = seed >>> 0;
        let job = newJob(kind, start);
        for (let i = 1; i < 64 && sameFault(job, previous); i++) {
            job = newJob(kind, (start + i) >>> 0);
        }
        return job;
    }

    // What the supervisor or router reports about the controller at a
    // chain index. This is the whole status rule.
    function statusAt(job, index) {
        if (job.fault.type === 'break') {
            return index >= job.fault.index ? 'offline' : 'online';
        }
        if (job.split === null) return 'flaky';
        if (index > job.split) return 'offline';
        return job.fault.index <= job.split ? 'flaky' : 'online';
    }

    function statusOf(job, room) { return statusAt(job, indexOf(job, room)); }

    // A chain-index range as rooms, low room first.
    function roomRange(job, lo, hi) {
        const a = roomAt(job, lo);
        const b = roomAt(job, hi);
        return { from: Math.min(a, b), to: Math.max(a, b), count: hi - lo + 1 };
    }

    function rangeText(r) { return r.from === r.to ? String(r.from) : r.from + ' to ' + r.to; }

    // The other end of the room numbering: 216 for 201, 201 for 216. On
    // the plan the page draws, the two are wall to wall.
    function otherEnd(room) { return room === FIRST_ROOM ? LAST_ROOM : FIRST_ROOM; }

    function copyFound(found) {
        if (!found) return null;
        return found.type === 'break'
            ? { type: 'break', between: found.between.slice() }
            : { type: 'talker', room: found.room };
    }

    // ── Score ────────────────────────────────────────────────────────
    function scoreText(job) {
        const n = job.stops;
        if (job.kind === 'flaky') {
            const par = BEST.flaky;
            const head = 'Found in ' + n + (n === 1 ? ' split' : ' splits');
            if (n > par) {
                return head + '. Splitting at the midpoint each time gets it in ' + par + '.';
            }
            const always = 'Splitting at the midpoint each time takes ' + par +
                ', wherever the troublemaker is.';
            return n === par ? head + '. ' + always : head + ', on a lucky cut. ' + always;
        }
        const head = 'Found in ' + n + (n === 1 ? ' stop' : ' stops');
        if (n === 1) return head + ', the fewest this job takes.';
        return head + (job.kind === 'layout'
            ? '. Reading the layout first gets it in 1.'
            : '. Reading the pattern first gets it in 1.');
    }

    // Any pick after the job is solved. The page prints this over the
    // "Found it" line, so it says again where the fault is, WHY it had to
    // be there (break jobs), and what the score was: a double click on the
    // finding controller must not cost the reader the one sentence the job
    // was played for, nor the reason that makes it worth playing.
    function doneText(job) {
        const where = job.found.type === 'break'
            ? 'The break is between ' + job.found.between[0] + ' and ' + job.found.between[1] +
                '. ' + foundReason(job)
            : job.found.room + ' is the troublemaker.';
        return 'This job is finished. ' + where + ' ' + scoreText(job) + ' New job deals another.';
    }

    // ── Break jobs: why ──────────────────────────────────────────────
    // Every result on a break job says WHY, not only what. The owner
    // played the first draft, found the job 1 break first try by
    // instinct, and said that did not drive the point home, since a
    // player may not see why the pick worked. So every stop carries a
    // reason, argued from what that job gives the player to go on:
    //
    //   layout     the drawn route. A miss says which way the break lies
    //              along it (away from the supervisor or router, or back
    //              toward it) and why; the find says why the break had to
    //              be in that one span.
    //   no-layout  the offline list, the plan, and what the stop itself
    //              shows: no route, and no word on which end the
    //              supervisor or router is on. The reasons argue from the
    //              offline rooms as ONE SECTION, which they always are
    //              here because this made-up floor runs its trunk in room
    //              order. A break cuts off every controller past it, out
    //              to the end of the trunk, so the end of the run is one
    //              edge of the section (always 201 or 216 here) and the
    //              break is at the other edge. The find says exactly that
    //              and uses no "next to": on the plan both edges have an
    //              online room next to them, since the end of the run is
    //              wall to wall with the other end of the numbering, the
    //              first controller on the trunk, which is online. "The
    //              edge with an online room next to it" was true only
    //              along the trunk. Two reasons also argue from
    //              what the stop shows: at the end of the run (dead trunk
    //              one way, nothing past it) and at the first controller
    //              on the trunk (the supervisor or router on one side).
    //              Both of those stops are at 201 or 216, the pair the
    //              plan draws wall to wall, so both reasons say that the
    //              trunk does not join them: that is the misreading the
    //              plan invites. (The printed word is "section", the
    //              lesson's own word, never "block". offlineBlock() keeps
    //              its name: it is internal.)
    //
    // A reason is a function of the fault, the job kind and the room
    // picked, never of the picks before it, so it holds in every pick
    // order. Each one states facts about THIS floor (one trunk, one daisy
    // chain, one break) and nothing about real buildings: no "usually",
    // nothing about what to do at a controller. The spec parses every
    // reason back into the rooms, direction, section and neighbour it names
    // and checks each against the fault, for every job the generator can
    // deal. Plain words, short sentences, no dashes or semicolons.
    //
    // result.reason carries the reason on its own; it is also inside
    // result.text, which is what the page prints and announces, so a
    // screen reader hears it once, with the result it belongs to.

    // The offline rooms, low room first. On a break job they are always
    // one section: the trunk runs in room order and everything past the
    // break is offline.
    function offlineBlock(job) { return roomRange(job, job.fault.index, LAST_INDEX); }

    // Why the break had to be where it was found.
    function foundReason(job) {
        const b = job.fault.index;
        const live = roomAt(job, b - 1);
        const dead = roomAt(job, b);
        if (job.kind === 'layout') {
            // "On this floor": the second sentence is the rule of this
            // made-up floor (one trunk, one break), not a claim about
            // every trunk there is.
            return 'Follow the drawn route from ' + HEAD_NAME + ': every controller as far as ' +
                live + ' is online, and every one from ' + dead + ' to the end of the run is ' +
                'offline. On this floor a break cuts off everything past it on the trunk and ' +
                'nothing before it, so it had to be in the span between those two.';
        }
        // No "next to" here. On the plan BOTH edges of the section have an
        // online room next to them (the end of the run is 201 or 216, wall
        // to wall with the other end, which is online), so "the edge with
        // an online room next to it" was true only along the trunk. The
        // reason argues from where the trunk ENDS instead: everything out
        // to the end of the trunk is cut off, so the end of the run, chain
        // index LAST_INDEX, is one edge of the section, and the break is at
        // the other, the offline room beside it.
        const end = roomAt(job, LAST_INDEX);
        return 'On this made-up floor the trunk runs in room order, so the offline rooms, ' +
            rangeText(offlineBlock(job)) + ', are one section, and a break cuts off every ' +
            'controller past it, out to the end of the trunk. So the trunk ends inside that ' +
            'section, at ' + end + ', and the break is at the section\'s other edge, at ' + dead + '.';
    }

    // What a stop that did not find the break tells the player.
    function missReason(job, index) {
        const room = roomAt(job, index);
        const code = missCode(job, index);
        if (job.kind === 'layout') {
            if (code === 'first-on-trunk' || code === 'live-both') {
                return 'The trunk is still live past ' + room + ', so the break is farther along ' +
                    'the route, away from ' + HEAD_NAME + '.';
            }
            return 'The trunk was already dead when it got to ' + room + ', so the break is back ' +
                'along the route, toward ' + HEAD_NAME +
                (code === 'end-of-run' ? ', where the dead section starts.' : '.');
        }
        const block = offlineBlock(job);
        // The offline room beside the break: the section's edge that the
        // trunk reaches first.
        const edge = roomAt(job, job.fault.index);
        // The first controller on the trunk and the end of the run are
        // always 201 and 216 here, one each. The plan draws the two wall
        // to wall (see THE PLAN in the header), so both reasons name the
        // other one and say the trunk does not join them.
        const besideOnPlan = function () {
            return 'On the plan ' + room + ' is next to ' + otherEnd(room) +
                ', but the trunk does not join them.';
        };
        if (code === 'first-on-trunk') {
            return 'The trunk comes in at ' + room + ' and runs in room order. ' + besideOnPlan() +
                ' The first offline room it reaches is ' + edge + ', so the break is next to ' +
                edge + '.';
        }
        if (code === 'live-both') {
            return 'The break sits between an online room and an offline one, so it is at an ' +
                'edge of the offline section, ' + rangeText(block) + '. ' + room +
                ' is not next to that section.';
        }
        if (code === 'end-of-run') {
            // The line before it has already said this room is the end of
            // the run, with dead trunk on its one side. So the reason opens
            // on the plan neighbour that stop did NOT find trunk toward,
            // then says where the break is.
            return besideOnPlan() + ' The trunk reaches ' + room + ' through the offline section, ' +
                'so the break is at the other edge of the section, next to ' + edge + '.';
        }
        return 'A stop inside the offline section cannot say which way ' + HEAD_NAME + ' is. ' +
            'A stop at either edge of it, ' + block.from + ' or ' + block.to + ', can.';
    }

    // ── Break jobs: a stop ───────────────────────────────────────────
    function segmentState(job, segment) {
        const b = job.fault.index;
        if (segment < b) return 'live';
        return segment === b ? 'break' : 'dead';
    }

    function sidesAt(job, index) {
        return {
            toward: {
                to: index === 0 ? 'head' : roomAt(job, index - 1),
                state: segmentState(job, index),
            },
            away: index === LAST_INDEX
                ? { to: null, state: 'none' }
                : { to: roomAt(job, index + 1), state: segmentState(job, index + 1) },
        };
    }

    // The code for a stop that does NOT find the break. BREAK_MIN keeps
    // index 0 clear of the break and BREAK_MAX keeps the end of the run
    // clear of it, so those two are never the finding stop.
    function missCode(job, index) {
        if (index < job.fault.index) return index === 0 ? 'first-on-trunk' : 'live-both';
        return index === LAST_INDEX ? 'end-of-run' : 'dead-both';
    }

    // What the stop shows, then why it matters. The reason always ends
    // the sentence on a miss.
    function missText(job, index) {
        const room = roomAt(job, index);
        const code = missCode(job, index);
        let shows;
        if (code === 'first-on-trunk') {
            shows = room + ' is the first controller on the trunk: ' + HEAD_NAME +
                ' on one side, live trunk to ' + roomAt(job, 1) +
                ' on the other. The break is not here.';
        } else if (code === 'live-both') {
            shows = 'Live trunk on both sides of ' + room + '. The break is not here.';
        } else if (code === 'end-of-run') {
            shows = room + ' is the end of the run: dead trunk toward ' +
                roomAt(job, LAST_INDEX - 1) + ', and nothing past it.';
        } else {
            shows = 'Dead trunk on both sides of ' + room + '. The break is not here.';
        }
        return shows + ' ' + missReason(job, index);
    }

    function stopAt(job, index) {
        if (job.solved) {
            return { code: 'done', counted: false, reason: foundReason(job), text: doneText(job) };
        }
        const room = roomAt(job, index);
        const sides = sidesAt(job, index);
        if (job.checked.indexOf(index) !== -1) {
            return {
                code: 'repeat',
                counted: false,
                sides: sides,
                reason: missReason(job, index),
                text: 'You already stopped at ' + room + '. ' + missText(job, index),
            };
        }
        job.stops += 1;
        const b = job.fault.index;
        if (index === b || index === b - 1) {
            const live = roomAt(job, b - 1);
            const dead = roomAt(job, b);
            job.solved = true;
            job.found = { type: 'break', between: [Math.min(live, dead), Math.max(live, dead)] };
            const reason = foundReason(job);
            return {
                code: 'found',
                counted: true,
                sides: sides,
                reason: reason,
                text: 'Found it. The break is between ' + job.found.between[0] + ' and ' +
                    job.found.between[1] + '. ' + reason + ' ' + scoreText(job),
            };
        }
        job.checked.push(index);
        return {
            code: missCode(job, index),
            counted: true,
            sides: sides,
            reason: missReason(job, index),
            text: missText(job, index),
        };
    }

    // ── Flaky job: a split ───────────────────────────────────────────
    function suspectRange(job) { return roomRange(job, job.suspects.lo, job.suspects.hi); }

    function splitPast(job, index) {
        if (job.solved) return { code: 'done', counted: false, text: doneText(job) };
        const room = roomAt(job, index);
        // "May": the range is every controller the splits so far have
        // not ruled out. One of them holds the fault, not all of them.
        const holding = function () {
            return ' May still hold the fault: ' + rangeText(suspectRange(job)) + '.';
        };
        if (job.lastPick === index) {
            return {
                code: 'repeat',
                counted: false,
                suspects: suspectRange(job),
                text: (index === LAST_INDEX
                    ? room + ' is the last controller on the trunk, so nothing is cut off past it.'
                    : 'The trunk is already split past ' + room + '.') + holding(),
            };
        }
        job.stops += 1;
        job.lastPick = index;
        if (index === LAST_INDEX) {
            // Nothing lies past the end of the run, so this pick only
            // rejoins the trunk: it is whole, and the talker is on it.
            job.split = null;
            return {
                code: 'nothing-past',
                counted: true,
                stable: false,
                narrowed: false,
                connected: roomRange(job, 0, LAST_INDEX),
                cutOff: null,
                suspects: suspectRange(job),
                text: room + ' is the last controller on the trunk, so a split past it cuts ' +
                    'nothing off. All ' + ROOM_COUNT + ' controllers are connected and ' +
                    'flaky.' + holding(),
            };
        }
        job.split = index;
        const stable = job.fault.index > index;
        let narrowed;
        if (stable) {
            narrowed = index + 1 > job.suspects.lo;
            job.suspects.lo = Math.max(job.suspects.lo, index + 1);
        } else {
            narrowed = index < job.suspects.hi;
            job.suspects.hi = Math.min(job.suspects.hi, index);
        }
        const connected = roomRange(job, 0, index);
        const cutOff = roomRange(job, index + 1, LAST_INDEX);
        // Present tense, no "still", no "went": an earlier split may have
        // had these rooms cut off, or reading online, one move ago.
        let text = 'Trunk split past ' + room + ': ' + rangeText(connected) +
            ' connected, ' + rangeText(cutOff) + ' cut off.';
        if (stable) {
            text += narrowed
                ? ' The connected part is stable, so the troublemaker is in the part cut off.'
                : ' The connected part is stable, which the earlier splits already told you.';
        } else {
            text += narrowed
                ? ' The connected part is flaky, so the troublemaker is in it.'
                : ' The connected part is flaky, which the earlier splits already told you.';
        }
        let code;
        if (job.suspects.lo === job.suspects.hi) {
            job.solved = true;
            job.found = { type: 'talker', room: roomAt(job, job.suspects.lo) };
            code = 'found';
            text += ' One controller left: ' + job.found.room + ' is the troublemaker. ' +
                scoreText(job);
        } else {
            code = stable
                ? (narrowed ? 'cut-off-part' : 'known-stable')
                : (narrowed ? 'connected-part' : 'known-flaky');
            text += holding();
        }
        return {
            code: code,
            counted: true,
            stable: stable,
            narrowed: narrowed,
            connected: connected,
            cutOff: cutOff,
            suspects: suspectRange(job),
            text: text,
        };
    }

    function pick(job, room) {
        const index = indexOf(job, room);
        const result = job.fault.type === 'break' ? stopAt(job, index) : splitPast(job, index);
        result.room = room;
        result.stops = job.stops;
        result.solved = job.solved;
        result.found = copyFound(job.found);
        job.last = result;
        return result;
    }

    // ── The owner's method, as picks ─────────────────────────────────
    // Worked out from what the reader can see — the reported statuses,
    // the stops already made, the suspects — never from the fault itself.
    function method(job) {
        if (job.solved) return [];
        let picks;
        if (job.kind === 'flaky') {
            const lo = job.suspects.lo;
            const hi = job.suspects.hi;
            picks = [roomAt(job, lo + Math.floor((hi - lo) / 2))];
        } else if (job.kind === 'layout') {
            // Walk the drawn route out from the supervisor or router to
            // the first offline controller: the dead section starts there.
            let firstDead = 0;
            while (statusAt(job, firstDead) !== 'offline') firstDead += 1;
            picks = [roomAt(job, firstDead - 1), roomAt(job, firstDead)];
        } else {
            const dead = [];
            for (let room = FIRST_ROOM; room <= LAST_ROOM; room++) {
                if (statusOf(job, room) === 'offline') dead.push(room);
            }
            picks = [dead[0], dead[dead.length - 1]].filter(function (room) {
                return job.checked.indexOf(indexOf(job, room)) === -1;
            });
        }
        return picks.sort(function (a, b) { return a - b; });
    }

    // ── What the page draws ──────────────────────────────────────────
    function promptFor(job) {
        if (job.fault.type === 'talker') {
            return 'All ' + ROOM_COUNT + ' controllers are flaky. Pick a controller to split ' +
                'the trunk past it.';
        }
        const dead = roomRange(job, job.fault.index, LAST_INDEX);
        return 'Rooms ' + rangeText(dead) + ' are offline. Pick the controller where you ' +
            'would stop first.';
    }

    function view(job) {
        const breakJob = job.fault.type === 'break';
        const routeShown = job.kind !== 'no-layout' || job.solved;
        const controllers = [];
        for (let room = FIRST_ROOM; room <= LAST_ROOM; room++) {
            const index = indexOf(job, room);
            const found = job.found;
            controllers.push({
                room: room,
                mac: macOf(room),
                status: statusAt(job, index),
                cutOff: !breakJob && job.split !== null && index > job.split,
                checked: breakJob && job.checked.indexOf(index) !== -1,
                suspect: !breakJob && !job.solved &&
                    index >= job.suspects.lo && index <= job.suspects.hi,
                found: !!found && found.type === 'talker' && found.room === room,
                besideBreak: !!found && found.type === 'break' &&
                    found.between.indexOf(room) !== -1,
            });
        }
        const links = [];
        if (routeShown) {
            for (let s = 0; s <= LAST_INDEX; s++) {
                let state = 'whole';
                if (breakJob && job.solved && s === job.fault.index) state = 'break';
                if (!breakJob && job.split !== null && s === job.split + 1) state = 'split';
                links.push({ a: s === 0 ? 'head' : roomAt(job, s - 1), b: roomAt(job, s), state: state });
            }
        }
        return {
            kind: job.kind,
            unit: breakJob ? 'stop' : 'split',
            stops: job.stops,
            solved: job.solved,
            best: BEST[job.kind],
            routeShown: routeShown,
            headEnd: routeShown ? job.headEnd : null,
            controllers: controllers,
            links: links,
            suspects: breakJob ? null : suspectRange(job),
            found: copyFound(job.found),
            prompt: promptFor(job),
        };
    }

    return {
        ROOM_COUNT: ROOM_COUNT,
        FIRST_ROOM: FIRST_ROOM,
        LAST_ROOM: LAST_ROOM,
        KINDS: KINDS,
        HEAD_ENDS: HEAD_ENDS,
        HEAD_NAME: HEAD_NAME,
        BREAK_MIN: BREAK_MIN,
        BREAK_MAX: BREAK_MAX,
        BEST: BEST,
        METHOD_MAX: METHOD_MAX,
        OPENING: OPENING,
        newJob: newJob,
        nextJob: nextJob,
        makeJob: makeJob,
        sameFault: sameFault,
        roomAt: roomAt,
        indexOf: indexOf,
        macOf: macOf,
        statusOf: statusOf,
        view: view,
        pick: pick,
        method: method,
    };
})();

if (typeof window !== 'undefined') { window.BusIsolation = BusIsolation; }
