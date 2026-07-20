// Guards for quiz-engine.js's question SELECTION — buildQueue().
//
// Why this file exists: every bank shipped at exactly the presented
// count (10) for the section's whole life, so `indices.slice(0, count)`
// under the default 'sequential' order never truncated anything. The
// first bank to reach 11 questions would have had its 11th silently
// dropped from every default run — no error, no visible symptom, the
// quiz just works and one question never appears. buildQueue() now
// SAMPLES the bank instead of taking its head; these tests keep that
// property, and the reachability test below fails on the pre-fix
// slice-the-head code (verified by reverting buildQueue and running it).
//
// The engine is browser-side and its queue lives in a closure, so the
// probes drive a real mount on a real page rather than requiring the
// module. `walkRun` steps a mounted quiz to the end via Skip → Next and
// returns the prompts it presented, in presentation order.

const fs   = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const PRACTICE_DIR = path.join(__dirname, '..', 'html', 'practice');
const BANK_DIR     = path.join(__dirname, '..', 'html', '_data', 'quizzes');

// The settings select is painted from defaultCount (`countSel.value =
// String(state.count)`), so a value outside the option set silently
// blanks the control. These are the only legal values.
const COUNT_OPTIONS = ['5', '10', 'all'];

// Mount a synthetic bank of `bankSize` true/false questions, run it
// `runs` times, and return every run's presented prompts (prompt text is
// the question's 1-based bank position, so a run reads as its indices).
async function probe(page, { bankSize, count, order, runs }) {
    return page.evaluate(({ bankSize, count, order, runs }) => {
        // Step one mounted run to the end and collect what it presented.
        // The engine's click handlers are synchronous, so this needs no
        // awaiting: Skip moves 'asking' -> 'revealed', the primary button
        // moves 'revealed' -> next question (or finishes and hides the
        // card, which is the loop's exit).
        function walkRun(host) {
            const prompts  = [];
            const promptEl = host.querySelector('.quiz-prompt');
            const skip     = host.querySelector('.quiz-action-secondary');
            const primary  = host.querySelector('.quiz-action-primary');
            for (let guard = 0; guard < 500; guard++) {
                if (host.querySelector('.quiz-card').hidden) break;
                prompts.push(promptEl.textContent);
                skip.click();
                primary.click();
            }
            return prompts;
        }

        const questions = [];
        for (let i = 0; i < bankSize; i++) {
            questions.push({
                type: 'tf',
                id: 'probe-q' + (i + 1),
                prompt: String(i + 1),
                explain: 'probe',
                answer: true
            });
        }
        const host = document.createElement('div');
        host.id = 'quiz-probe';
        document.body.appendChild(host);

        const controller = window.Quiz.mount('#quiz-probe', questions, {
            slug: 'probe-bank',
            title: 'Probe',
            defaultCount: count,
            defaultOrder: order
        });
        const runsOut = [];
        for (let r = 0; r < runs; r++) {
            if (r > 0) controller.reset();
            runsOut.push(walkRun(host));
        }
        host.remove();
        Object.keys(localStorage)
            .filter(function (k) { return k.indexOf('cf_quiz_probe-bank_') === 0; })
            .forEach(function (k) { localStorage.removeItem(k); });
        return runsOut;
    }, { bankSize, count, order, runs });
}

// A bank BIGGER than the presented count must still be able to show
// every one of its questions. This is the assertion that fails on the
// pre-fix engine: with `indices.slice(0, count)` under 'sequential',
// prompts 11 and 12 never appear in any run, so the union stalls at 10.
test('a bank larger than the presented count reaches every question', async ({ page }) => {
    await page.goto('/practice/modbus-decoding.html');
    const runs = await probe(page, { bankSize: 12, count: 10, order: 'sequential', runs: 40 });

    for (const run of runs) {
        expect(run.length, 'each run presents exactly the configured count').toBe(10);
        expect(new Set(run).size, 'no question repeats within a run').toBe(10);
    }
    const seen = new Set(runs.flat());
    expect([...seen].map(Number).sort((a, b) => a - b),
        'every question in the bank is reachable across runs').toEqual(
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

// Sampling must not become scrambling: the draw picks WHICH questions,
// defaultOrder decides the sequence. Under 'sequential' the sampled
// subset stays in the bank's own order.
test('sampled questions are presented in bank order under sequential', async ({ page }) => {
    await page.goto('/practice/modbus-decoding.html');
    const runs = await probe(page, { bankSize: 15, count: 10, order: 'sequential', runs: 15 });

    for (const run of runs) {
        const nums = run.map(Number);
        expect(nums, 'presented subset is ascending in bank order')
            .toEqual([...nums].sort((a, b) => a - b));
    }
    // Sanity: the draw is actually varying, or the ordering assertion
    // above would pass trivially on a frozen head-of-bank slice.
    const distinct = new Set(runs.map((r) => r.join(',')));
    expect(distinct.size, 'repeat runs draw different subsets').toBeGreaterThan(1);
});

// The no-change guarantee. Every shipped bank today is exactly the
// presented count, so there is nothing to sample and behavior must be
// bit-identical to the pre-sampling engine: all questions, bank order,
// every run.
test('a bank equal to the presented count is unchanged — all questions, bank order', async ({ page }) => {
    await page.goto('/practice/modbus-decoding.html');
    const runs = await probe(page, { bankSize: 10, count: 10, order: 'sequential', runs: 8 });

    const expected = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    for (const run of runs) {
        expect(run, 'identical to the pre-sampling sequential run').toEqual(expected);
    }
});

// 'random' still scrambles the whole bank when the bank fits the count.
test('random order still shuffles a bank that equals the presented count', async ({ page }) => {
    await page.goto('/practice/modbus-decoding.html');
    const runs = await probe(page, { bankSize: 10, count: 10, order: 'random', runs: 20 });

    for (const run of runs) {
        expect(run.slice().sort(), 'random order presents the whole bank')
            .toEqual(['1', '10', '2', '3', '4', '5', '6', '7', '8', '9']);
    }
    expect(new Set(runs.map((r) => r.join(','))).size,
        'random order actually varies').toBeGreaterThan(1);
});

// Static guard on the pages themselves: defaultCount has to be a value
// the settings select can represent. `countSel.value = String(count)`
// against an absent option leaves the select blank, and the next
// restart then reads '' as the count.
test('every practice page uses a defaultCount the settings select offers', () => {
    const pages = fs.readdirSync(PRACTICE_DIR)
        .filter((f) => f.endsWith('.html') && f !== 'index.html')
        .sort();
    expect(pages.length, 'sanity: practice pages exist').toBeGreaterThan(0);

    for (const file of pages) {
        const src = fs.readFileSync(path.join(PRACTICE_DIR, file), 'utf8');
        const m = src.match(/defaultCount:\s*'?([^,'\n]+)'?/);
        expect(m, `${file}: mounts with an explicit defaultCount`).not.toBe(null);
        expect(COUNT_OPTIONS, `${file}: defaultCount ${m[1]} is not a select option`)
            .toContain(m[1].trim());

        // And the bank it pairs with must exist — the slug/filename tie
        // the JSON-LD emitter also depends on.
        const slug = file.replace(/\.html$/, '');
        expect(fs.existsSync(path.join(BANK_DIR, slug + '.js')),
            `${file}: has a bank at _data/quizzes/${slug}.js`).toBe(true);
    }
});
