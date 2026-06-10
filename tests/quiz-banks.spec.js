// Node-side integrity tests for every quiz bank under
// html/_data/quizzes/. Same pattern as psychro-engine.spec.js — the
// Playwright runner's workers are Node processes, so these run under
// the one `npm test` with the `page` fixture unused.
//
// The banks are CommonJS data files with two consumers (the browser
// quiz engine and head.njk's FAQPage JSON-LD emitter). The engine
// validates at mount, but only the questions a given run draws — a
// malformed question in the back half of a bank can ship green. These
// checks mirror quiz-engine.js's runtime validator and add the id
// rules it doesn't enforce (kebab-case, uniqueness within the bank).

const fs   = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const BANK_DIR = path.join(__dirname, '..', 'html', '_data', 'quizzes');
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TYPES = ['mcq', 'tf', 'gotcha', 'numeric'];

const bankFiles = fs.readdirSync(BANK_DIR).filter(f => f.endsWith('.js')).sort();

test('quiz bank directory is populated', () => {
    expect(bankFiles.length).toBeGreaterThan(0);
});

for (const file of bankFiles) {
    test(`bank integrity — ${file}`, () => {
        const bank = require(path.join(BANK_DIR, file));
        expect(Array.isArray(bank), `${file} must export an array`).toBe(true);
        expect(bank.length, `${file} must not be empty`).toBeGreaterThan(0);

        const ids = new Set();
        for (const q of bank) {
            expect(TYPES, `${file}: unknown type on ${q.id}`).toContain(q.type);
            expect(q.id, `${file}: ids are kebab-case`).toMatch(KEBAB);
            expect(ids.has(q.id), `${file}: duplicate id ${q.id}`).toBe(false);
            ids.add(q.id);
            expect(typeof q.prompt, `${file}/${q.id}: prompt`).toBe('string');
            expect(typeof q.explain, `${file}/${q.id}: explain`).toBe('string');

            if (q.type === 'mcq' || q.type === 'gotcha') {
                expect(Array.isArray(q.choices), `${file}/${q.id}: choices`).toBe(true);
                expect(q.choices.length, `${file}/${q.id}: ≥2 choices`).toBeGreaterThanOrEqual(2);
                const correct = q.choices.filter(c => c && c.correct === true);
                expect(correct.length, `${file}/${q.id}: exactly one correct choice`).toBe(1);
                if (q.type === 'gotcha') {
                    expect(typeof q.snippet, `${file}/${q.id}: gotcha snippet`).toBe('string');
                }
            } else if (q.type === 'tf') {
                expect(typeof q.answer, `${file}/${q.id}: tf boolean answer`).toBe('boolean');
            } else if (q.type === 'numeric') {
                expect(Number.isFinite(q.answer), `${file}/${q.id}: finite answer`).toBe(true);
                expect(Number.isFinite(q.tolerance), `${file}/${q.id}: finite tolerance`).toBe(true);
                expect(q.tolerance, `${file}/${q.id}: tolerance ≥ 0`).toBeGreaterThanOrEqual(0);
            }
        }
    });
}
