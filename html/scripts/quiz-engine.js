// ──────────────────────────────────────────────────────────────────────
// quiz-engine.js — shared quiz / drill engine.
//
// Loaded as a *classic* script (same convention as ui.js, units.js,
// pid-engine.js) so a page's inline <script> can see the engine as a
// plain global. Include before the page's inline IIFE:
//
//     <script src="/scripts/quiz-engine.js"></script>
//     <script>
//       (function () {
//         'use strict';
//         const questions = [ /* see schema below */ ];
//         Quiz.mount('#quiz', questions, {
//             slug:  'modbus-decoding',     // required, kebab-case
//             title: 'Modbus Decoding',     // optional, used in results
//             defaultCount: 10,             // 5 | 10 | 'all'
//             defaultOrder: 'sequential'    // 'sequential' | 'random'
//         });
//       })();
//     </script>
//
// The engine owns DOM construction for everything inside the mount
// target — settings row, progress, prompt panel, choices/numeric input,
// actions row, reveal panel, results card. The page supplies only the
// empty container, the questions array, and the options.
//
// Question schema:
//   type:      'mcq' | 'tf' | 'gotcha' | 'numeric'
//   id:        kebab-case string, stable across edits
//   prompt:    inline HTML (<code>, <em>, <strong>, <br>)
//   explain:   inline HTML (same)
//   learnMore: { href, label }                     -- optional
//   tags:      string[]                            -- optional, reserved for mixes
//   ── mcq / gotcha ──
//     choices: [{ id, text, correct? }]            -- exactly one `correct`
//   ── gotcha ── (mcq + snippet)
//     snippet: inline HTML (typically a <pre class="quiz-snippet">)
//   ── tf ──
//     answer:  true | false
//   ── numeric ──
//     answer:    number
//     tolerance: number                            -- absolute
//     unit:      string                            -- rendered as a suffix label
//     inputmode: 'decimal' | 'numeric'             -- optional, default 'decimal'
//
// localStorage keys (per the site-wide cf_<feature>_<key> convention):
//   cf_quiz_<slug>_best          integer 0..N
//   cf_quiz_<slug>_best_total    integer N        -- so "8/10" can be reconstructed
//   cf_quiz_<slug>_best_time_ms  integer
//   cf_quiz_<slug>_attempts      integer
//   cf_quiz_<slug>_last_iso      ISO 8601 string
//
// Reads / writes are wrapped in try/catch — private-mode browsers
// silently no-op. There is no in-progress save/restore in v1; refresh
// equals restart.
//
// Accessibility shape:
// - Choices are <button role="radio"> inside <div role="radiogroup">
//   (ARIA radio pattern). aria-checked, NOT aria-pressed (radio
//   semantics, not toggle).
// - Reveal panel is aria-live="polite", lives in the DOM at all times
//   so its content-change is what's announced (not its insertion).
//   Content is built in a DocumentFragment and assigned once so screen
//   readers announce a single update per submit.
// - Focus moves programmatically to the action button after submit.
// ──────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    const ENGINE_VERSION = 1;
    const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

    // ── localStorage helpers ────────────────────────────────────────
    function storeGet(key) {
        try { return localStorage.getItem(key); } catch (_) { return null; }
    }
    function storeSet(key, value) {
        try { localStorage.setItem(key, value); } catch (_) { /* private mode etc. */ }
    }
    function storeDel(key) {
        try { localStorage.removeItem(key); } catch (_) { /* silent */ }
    }

    function storeKeysForSlug(slug) {
        const base = 'cf_quiz_' + slug + '_';
        return {
            best:      base + 'best',
            bestTotal: base + 'best_total',
            bestTime:  base + 'best_time_ms',
            attempts:  base + 'attempts',
            lastIso:   base + 'last_iso'
        };
    }

    // ── Schema validation ───────────────────────────────────────────
    function validateQuestion(q, idx) {
        if (!q || typeof q !== 'object') return 'question ' + idx + ' is not an object';
        if (!q.type) return 'question ' + idx + ' missing type';
        if (!q.id) return 'question ' + idx + ' missing id';
        if (!q.prompt) return 'question ' + idx + ' (' + q.id + ') missing prompt';
        if (!q.explain) return 'question ' + idx + ' (' + q.id + ') missing explain';
        switch (q.type) {
            case 'mcq':
            case 'gotcha': {
                if (!Array.isArray(q.choices) || q.choices.length < 2) {
                    return 'question ' + q.id + ' needs at least 2 choices';
                }
                // Each choice needs a truthy id + text, and ids must be
                // unique within the question: reveal()/submit() match the
                // picked choice by data-choice-id, so a duplicate id would
                // mark two choices wrong on a miss and a missing text would
                // render the literal 'undefined' (codebase-issues #117).
                for (let ci = 0; ci < q.choices.length; ci++) {
                    const c = q.choices[ci];
                    if (!c || !c.id) return 'question ' + q.id + ' has a choice with no id';
                    if (!c.text) return 'question ' + q.id + ' choice "' + c.id + '" has no text';
                }
                const choiceIds = new Set(q.choices.map(function (c) { return c.id; }));
                if (choiceIds.size !== q.choices.length) {
                    return 'question ' + q.id + ' has duplicate choice ids';
                }
                const correct = q.choices.filter(function (c) { return c && c.correct; });
                if (correct.length !== 1) {
                    return 'question ' + q.id + ' needs exactly one correct choice (found ' + correct.length + ')';
                }
                if (q.type === 'gotcha' && !q.snippet) {
                    return 'gotcha question ' + q.id + ' missing snippet';
                }
                break;
            }
            case 'tf': {
                if (typeof q.answer !== 'boolean') {
                    return 'tf question ' + q.id + ' needs a boolean answer';
                }
                break;
            }
            case 'numeric': {
                if (typeof q.answer !== 'number' || !isFinite(q.answer)) {
                    return 'numeric question ' + q.id + ' needs a finite numeric answer';
                }
                if (typeof q.tolerance !== 'number' || !isFinite(q.tolerance) || q.tolerance < 0) {
                    return 'numeric question ' + q.id + ' needs a non-negative finite tolerance';
                }
                break;
            }
            default:
                return 'question ' + q.id + ' has unknown type "' + q.type + '"';
        }
        return null;
    }

    // ── Time formatting ─────────────────────────────────────────────
    function formatMs(ms) {
        if (!isFinite(ms) || ms < 0) return '—';
        const totalSec = Math.round(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec - m * 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    // ── Shuffle (Fisher-Yates) ──────────────────────────────────────
    function shuffleInPlace(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr;
    }

    // ── DOM helpers ─────────────────────────────────────────────────
    function el(tag, attrs, children) {
        const node = document.createElement(tag);
        if (attrs) {
            for (const k in attrs) {
                if (k === 'class') node.className = attrs[k];
                else if (k === 'html') node.innerHTML = attrs[k];
                else if (k === 'text') node.textContent = attrs[k];
                else if (k.indexOf('data-') === 0 || k.indexOf('aria-') === 0 || k === 'role' || k === 'for' || k === 'type' || k === 'id' || k === 'name' || k === 'value') {
                    node.setAttribute(k, attrs[k]);
                } else {
                    node[k] = attrs[k];
                }
            }
        }
        if (children) {
            for (let i = 0; i < children.length; i++) {
                const c = children[i];
                if (c == null) continue;
                node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
            }
        }
        return node;
    }

    // ── Quiz instance ───────────────────────────────────────────────
    function Quiz(rootEl, questions, opts) {
        const slug = opts.slug;
        const title = opts.title || '';
        const storeKeys = storeKeysForSlug(slug);

        const state = {
            count:           opts.defaultCount || 'all',
            order:           opts.defaultOrder || 'sequential',
            queue:           [],       // indices into questions[]
            cursor:          0,
            answers:         [],       // { qi, given, correct }
            phase:           'idle',   // 'idle' | 'asking' | 'revealed' | 'finished'
            startTime:       0,
            settingsDirty:   false
        };

        // ── Build shell ─────────────────────────────────────────────
        rootEl.classList.add('quiz');
        rootEl.innerHTML = '';

        const settingsRow = el('div', { class: 'quiz-settings', role: 'group', 'aria-label': 'Quiz settings' });
        const countSel = el('select', { id: idify('count'), class: 'quiz-settings-select' });
        ['5', '10', 'all'].forEach(function (v) {
            const o = el('option', { value: v });
            o.textContent = v === 'all' ? 'All' : v;
            countSel.appendChild(o);
        });
        countSel.value = String(state.count);
        const countLbl = el('label', { for: idify('count'), class: 'quiz-settings-label' }, [
            'Questions: ', countSel
        ]);

        const orderSel = el('select', { id: idify('order'), class: 'quiz-settings-select' });
        [['sequential', 'Sequential'], ['random', 'Random']].forEach(function (pair) {
            const o = el('option', { value: pair[0] });
            o.textContent = pair[1];
            orderSel.appendChild(o);
        });
        orderSel.value = state.order;
        const orderLbl = el('label', { for: idify('order'), class: 'quiz-settings-label' }, [
            'Order: ', orderSel
        ]);

        const bestReadout = el('span', { class: 'quiz-best-readout', 'aria-live': 'off' }, ['Best: —']);
        const resetBestBtn = el('button', { type: 'button', class: 'quiz-reset-best', id: idify('reset-best') }, ['Reset best']);

        settingsRow.appendChild(countLbl);
        settingsRow.appendChild(orderLbl);
        settingsRow.appendChild(bestReadout);
        settingsRow.appendChild(resetBestBtn);

        const dirtyNotice = el('div', { class: 'quiz-dirty-notice', hidden: true }, [
            'Settings apply on restart. ',
            el('button', { type: 'button', class: 'quiz-restart-now' }, ['Restart now →'])
        ]);

        const progress = el('div', { class: 'quiz-progress' });
        const progressText = el('p', { class: 'quiz-progress-text', 'aria-live': 'off' }, ['']);
        const progressBar = el('div', { class: 'quiz-progress-bar' }, [
            el('div', { class: 'quiz-progress-fill' })
        ]);
        progress.appendChild(progressText);
        progress.appendChild(progressBar);

        const questionPane = el('div', { class: 'quiz-question-pane' });
        const promptEl = el('div', { class: 'quiz-prompt' });
        const snippetSlot = el('div', { class: 'quiz-snippet-slot' });
        const choicesEl = el('div', { class: 'quiz-choices', role: 'radiogroup' });
        const numericEl = el('div', { class: 'quiz-numeric', hidden: true });
        const numericInput = el('input', {
            type: 'number',
            inputmode: 'decimal',
            class: 'quiz-numeric-input',
            id: idify('numeric'),
            'aria-label': 'Numeric answer'
        });
        const numericUnit = el('span', { class: 'quiz-numeric-unit' });
        numericEl.appendChild(numericInput);
        numericEl.appendChild(numericUnit);
        questionPane.appendChild(promptEl);
        questionPane.appendChild(snippetSlot);
        questionPane.appendChild(choicesEl);
        questionPane.appendChild(numericEl);

        // Reveal panel — present in DOM from start, empty until submit.
        const revealEl = el('div', {
            class: 'quiz-reveal',
            'aria-live': 'polite',
            'aria-atomic': 'true'
        });

        const actionsEl = el('div', { class: 'quiz-actions' });
        const submitBtn = el('button', { type: 'button', class: 'quiz-action quiz-action-primary' }, ['Submit']);
        const skipBtn   = el('button', { type: 'button', class: 'quiz-action quiz-action-secondary' }, ['Skip']);
        actionsEl.appendChild(skipBtn);
        actionsEl.appendChild(submitBtn);

        const cardEl = el('div', { class: 'quiz-card' });
        cardEl.appendChild(progress);
        cardEl.appendChild(questionPane);
        cardEl.appendChild(revealEl);
        cardEl.appendChild(actionsEl);

        const resultsEl = el('div', {
            class: 'quiz-results',
            role: 'region',
            'aria-label': 'Quiz results',
            hidden: true
        });

        rootEl.appendChild(settingsRow);
        rootEl.appendChild(dirtyNotice);
        rootEl.appendChild(cardEl);
        rootEl.appendChild(resultsEl);

        // ── Helpers scoped to this instance ─────────────────────────
        function idify(suffix) { return 'quiz-' + slug + '-' + suffix; }

        function paintBest() {
            const best = parseInt(storeGet(storeKeys.best) || '', 10);
            const bestTotal = parseInt(storeGet(storeKeys.bestTotal) || '', 10);
            const bestTime = parseInt(storeGet(storeKeys.bestTime) || '', 10);
            if (isFinite(best) && isFinite(bestTotal) && bestTotal > 0) {
                let txt = 'Best: ' + best + ' / ' + bestTotal;
                if (isFinite(bestTime) && bestTime > 0) txt += ' (' + formatMs(bestTime) + ')';
                bestReadout.textContent = txt;
            } else {
                bestReadout.textContent = 'Best: —';
            }
        }

        function markSettingsDirty() {
            if (state.phase === 'asking' || state.phase === 'revealed') {
                state.settingsDirty = true;
                dirtyNotice.hidden = false;
            }
        }

        function buildQueue() {
            const total = questions.length;
            let count;
            if (state.count === 'all') count = total;
            else count = Math.min(parseInt(state.count, 10) || total, total);

            const indices = [];
            for (let i = 0; i < total; i++) indices.push(i);
            if (state.order === 'random') shuffleInPlace(indices);
            return indices.slice(0, count);
        }

        function startQuiz() {
            state.queue = buildQueue();
            state.cursor = 0;
            state.answers = [];
            state.startTime = Date.now();
            state.settingsDirty = false;
            dirtyNotice.hidden = true;
            resultsEl.hidden = true;
            cardEl.hidden = false;
            showQuestion();
        }

        function showQuestion() {
            state.phase = 'asking';
            const qi = state.queue[state.cursor];
            const q = questions[qi];

            // Progress
            progressText.textContent = 'Question ' + (state.cursor + 1) + ' of ' + state.queue.length;
            const pct = state.queue.length > 1
                ? ((state.cursor) / state.queue.length) * 100
                : 0;
            progressBar.querySelector('.quiz-progress-fill').style.width = pct + '%';

            // Prompt
            promptEl.innerHTML = q.prompt;

            // Snippet (gotcha only)
            snippetSlot.innerHTML = '';
            if (q.type === 'gotcha' && q.snippet) {
                snippetSlot.innerHTML = q.snippet;
                snippetSlot.hidden = false;
            } else {
                snippetSlot.hidden = true;
            }

            // Choices vs numeric. The numeric widget is reused across
            // questions (and across restarts), so undo everything
            // reveal() did to it — not just the value.
            choicesEl.innerHTML = '';
            choicesEl.hidden = true;
            numericEl.hidden = true;
            numericInput.value = '';
            numericInput.disabled = false;
            numericEl.classList.remove('correct', 'wrong');

            if (q.type === 'mcq' || q.type === 'gotcha') {
                renderChoices(q.choices.map(function (c) {
                    return { id: c.id, text: c.text, correct: !!c.correct };
                }));
                choicesEl.hidden = false;
            } else if (q.type === 'tf') {
                renderChoices([
                    { id: 'true',  text: 'True',  correct: q.answer === true },
                    { id: 'false', text: 'False', correct: q.answer === false }
                ]);
                choicesEl.hidden = false;
            } else if (q.type === 'numeric') {
                numericUnit.textContent = q.unit || '';
                // Set deterministically, not only when present — the shared
                // input is reused across questions, so a stale inputmode from
                // an earlier numeric:'numeric' question would otherwise stick
                // on a later default-decimal one (codebase-issues #116).
                numericInput.setAttribute('inputmode', q.inputmode || 'decimal');
                numericEl.hidden = false;
            }

            // Reveal panel: clear, keep present in DOM.
            revealEl.innerHTML = '';
            revealEl.classList.remove('quiz-reveal--correct', 'quiz-reveal--incorrect');

            // Actions
            actionsEl.innerHTML = '';
            actionsEl.appendChild(skipBtn);
            actionsEl.appendChild(submitBtn);
            submitBtn.textContent = 'Submit';
            submitBtn.disabled = true;
            skipBtn.disabled = false;

            // Focus management
            if (q.type === 'numeric') {
                setTimeout(function () { numericInput.focus(); }, 0);
            } else {
                const first = choicesEl.querySelector('.quiz-choice');
                if (first) setTimeout(function () { first.focus(); }, 0);
            }
        }

        function renderChoices(items) {
            // Track the currently focused choice index for keyboard nav.
            items.forEach(function (item, idx) {
                const btn = el('button', {
                    type: 'button',
                    class: 'quiz-choice',
                    role: 'radio',
                    'aria-checked': 'false',
                    'data-choice-id': item.id,
                    'data-correct': item.correct ? 'true' : 'false',
                    tabIndex: idx === 0 ? 0 : -1
                });
                btn.innerHTML = item.text;
                choicesEl.appendChild(btn);
            });
        }

        function selectChoice(btn) {
            const buttons = choicesEl.querySelectorAll('.quiz-choice');
            buttons.forEach(function (b) {
                const on = b === btn;
                b.setAttribute('aria-checked', on ? 'true' : 'false');
                b.classList.toggle('selected', on);
                b.tabIndex = on ? 0 : -1;
            });
            submitBtn.disabled = false;
        }

        function focusChoiceByOffset(currentBtn, delta) {
            const buttons = Array.from(choicesEl.querySelectorAll('.quiz-choice'));
            if (!buttons.length) return;
            const idx = buttons.indexOf(currentBtn);
            const next = (idx + delta + buttons.length) % buttons.length;
            const target = buttons[next];
            target.focus();
            selectChoice(target);
        }

        // ── Event wiring ────────────────────────────────────────────
        choicesEl.addEventListener('click', function (e) {
            if (state.phase !== 'asking') return;
            const btn = e.target.closest('.quiz-choice');
            if (!btn || !choicesEl.contains(btn)) return;
            selectChoice(btn);
        });

        choicesEl.addEventListener('keydown', function (e) {
            if (state.phase !== 'asking') return;
            const btn = e.target.closest('.quiz-choice');
            if (!btn) return;
            const key = e.key;
            if (key === 'ArrowDown' || key === 'ArrowRight') {
                e.preventDefault();
                focusChoiceByOffset(btn, 1);
            } else if (key === 'ArrowUp' || key === 'ArrowLeft') {
                e.preventDefault();
                focusChoiceByOffset(btn, -1);
            } else if (key === ' ' || key === 'Space' || key === 'Spacebar') {
                e.preventDefault();
                selectChoice(btn);
            } else if (key === 'Enter') {
                // Single-keystroke select-and-submit: if this choice isn't
                // selected yet, select it first; then submit. Matches the
                // "Enter submits pre-reveal" plan.
                e.preventDefault();
                if (btn.getAttribute('aria-checked') !== 'true') selectChoice(btn);
                if (!submitBtn.disabled) submit();
            }
        });

        numericInput.addEventListener('input', function () {
            const v = parseFloat(numericInput.value);
            submitBtn.disabled = !isFinite(v);
        });
        numericInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (state.phase === 'asking' && !submitBtn.disabled) submit();
                else if (state.phase === 'revealed') advance();
            }
        });

        submitBtn.addEventListener('click', function () {
            if (state.phase === 'asking') submit();
            else if (state.phase === 'revealed') advance();
        });
        skipBtn.addEventListener('click', function () {
            if (state.phase !== 'asking') return;
            submit(true);
        });

        countSel.addEventListener('change', function () {
            state.count = countSel.value;
            if (state.phase === 'asking' || state.phase === 'revealed') markSettingsDirty();
        });
        orderSel.addEventListener('change', function () {
            state.order = orderSel.value;
            if (state.phase === 'asking' || state.phase === 'revealed') markSettingsDirty();
        });
        dirtyNotice.querySelector('.quiz-restart-now').addEventListener('click', function () {
            startQuiz();
        });
        // Reset best is destructive with no undo — the accumulated best
        // scores ARE the learner's progress record (the landing even badges
        // them). Two-step confirm so a stray click in the settings row can't
        // wipe a hard-won 10/10 silently (P-007): first click arms the button,
        // a second within the window commits, otherwise it reverts on its own.
        let resetArmed = false;
        let resetTimer = null;
        const disarmReset = () => {
            resetArmed = false;
            if (resetTimer) { clearTimeout(resetTimer); resetTimer = null; }
            resetBestBtn.textContent = 'Reset best';
        };
        resetBestBtn.addEventListener('click', function () {
            if (!resetArmed) {
                resetArmed = true;
                resetBestBtn.textContent = 'Confirm reset?';
                resetTimer = setTimeout(disarmReset, 4000);
                return;
            }
            disarmReset();
            storeDel(storeKeys.best);
            storeDel(storeKeys.bestTotal);
            storeDel(storeKeys.bestTime);
            storeDel(storeKeys.attempts);
            storeDel(storeKeys.lastIso);
            paintBest();
        });

        // ── Scoring + reveal ────────────────────────────────────────
        function submit(isSkip) {
            const qi = state.queue[state.cursor];
            const q = questions[qi];
            let given = null;
            let correct = false;

            if (isSkip) {
                given = null;
                correct = false;
            } else if (q.type === 'mcq' || q.type === 'gotcha' || q.type === 'tf') {
                const sel = choicesEl.querySelector('.quiz-choice[aria-checked="true"]');
                if (!sel) return;  // shouldn't happen — submit is disabled
                given = sel.getAttribute('data-choice-id');
                correct = sel.getAttribute('data-correct') === 'true';
            } else if (q.type === 'numeric') {
                const v = parseFloat(numericInput.value);
                if (!isFinite(v)) return;
                given = v;
                correct = Math.abs(v - q.answer) <= q.tolerance;
            }

            state.answers.push({ qi: qi, given: given, correct: correct });
            reveal(q, given, correct, isSkip);
        }

        function reveal(q, given, correct, isSkip) {
            state.phase = 'revealed';

            // Disable choice buttons; mark right/wrong.
            const buttons = choicesEl.querySelectorAll('.quiz-choice');
            buttons.forEach(function (b) {
                b.setAttribute('aria-disabled', 'true');
                b.disabled = true;
                if (b.getAttribute('data-correct') === 'true') b.classList.add('correct');
                if (!correct && b.getAttribute('data-choice-id') === given) b.classList.add('wrong');
            });
            if (q.type === 'numeric') {
                numericInput.disabled = true;
                if (correct) numericEl.classList.add('correct');
                else numericEl.classList.add('wrong');
            }

            // Build reveal contents in a fragment so aria-live announces once.
            const frag = document.createDocumentFragment();
            const statusEl = el('p', {
                class: 'quiz-reveal-status'
            }, [isSkip ? 'Skipped.' : (correct ? 'Correct.' : 'Not quite.')]);
            frag.appendChild(statusEl);

            if (!correct) {
                let rightAnswerText = '';
                if (q.type === 'mcq' || q.type === 'gotcha') {
                    const right = q.choices.filter(function (c) { return c.correct; })[0];
                    if (right) rightAnswerText = right.text;
                } else if (q.type === 'tf') {
                    rightAnswerText = q.answer ? 'True' : 'False';
                } else if (q.type === 'numeric') {
                    rightAnswerText = q.answer + (q.unit ? ' ' + q.unit : '');
                }
                if (rightAnswerText) {
                    const right = el('p', { class: 'quiz-reveal-right' });
                    right.innerHTML = '<strong>Right answer:</strong> ' + rightAnswerText;
                    frag.appendChild(right);
                }
            }

            const exp = el('div', { class: 'quiz-reveal-explain' });
            exp.innerHTML = q.explain;
            frag.appendChild(exp);

            if (q.learnMore && q.learnMore.href) {
                const lm = el('p', { class: 'quiz-reveal-learn-more' });
                lm.innerHTML = 'Learn more → <a href="' + q.learnMore.href + '">' + q.learnMore.label + '</a>';
                frag.appendChild(lm);
            }

            revealEl.classList.add(correct ? 'quiz-reveal--correct' : 'quiz-reveal--incorrect');
            revealEl.innerHTML = '';
            revealEl.appendChild(frag);

            // Action button flips to Next / See results
            submitBtn.disabled = false;
            submitBtn.textContent = (state.cursor === state.queue.length - 1)
                ? 'See results →'
                : 'Next question →';
            skipBtn.disabled = true;
            // Focus the action button so screen-readers announce reveal then button.
            setTimeout(function () { submitBtn.focus(); }, 0);

            // Update progress bar to include the just-answered question.
            const completePct = ((state.cursor + 1) / state.queue.length) * 100;
            progressBar.querySelector('.quiz-progress-fill').style.width = completePct + '%';
        }

        function advance() {
            if (state.cursor < state.queue.length - 1) {
                state.cursor += 1;
                showQuestion();
            } else {
                finish();
            }
        }

        function finish() {
            state.phase = 'finished';
            const elapsed = Date.now() - state.startTime;
            const total = state.queue.length;
            const score = state.answers.filter(function (a) { return a.correct; }).length;

            // Persist best.
            const prevBest = parseInt(storeGet(storeKeys.best) || '', 10);
            const prevBestTotal = parseInt(storeGet(storeKeys.bestTotal) || '', 10);
            const prevTime = parseInt(storeGet(storeKeys.bestTime) || '', 10);
            const prevBestRatio = (isFinite(prevBest) && isFinite(prevBestTotal) && prevBestTotal > 0)
                ? (prevBest / prevBestTotal) : -1;
            const curRatio = total > 0 ? (score / total) : 0;
            const hasPrior = prevBestRatio >= 0;          // a valid stored record exists
            // #89: a shorter run can never replace a longer best — a quick
            // 5/5 used to silently overwrite a 10/10. The record falls only
            // to an equal-or-longer run with a better ratio, the same ratio
            // at a longer total (10/10 upgrades 5/5), or the same ratio and
            // total but faster. A worse ratio never wins, regardless of
            // length.
            const longEnough = total >= prevBestTotal;
            const beatsRecord =
                curRatio > prevBestRatio ||
                (curRatio === prevBestRatio && total > prevBestTotal) ||
                (curRatio === prevBestRatio && total === prevBestTotal &&
                    (!isFinite(prevTime) || elapsed < prevTime));
            // #115: a stored best_total larger than the WHOLE current bank is
            // stale — the bank was edited down, so `total` can never reach it
            // again and the #89 longer-run guard would lock the record
            // forever. Let a full-bank run repair it.
            const fullBank = total === questions.length;
            const staleRecord = hasPrior && fullBank && prevBestTotal > questions.length;
            // #114: the very first run (no prior record) counts as a "best"
            // only with a non-zero score — a 0/N baseline isn't an
            // achievement to celebrate or persist. Same for repairing a
            // stale record.
            const isNewBest = (!hasPrior || staleRecord)
                ? (score > 0)
                : (longEnough && beatsRecord);
            if (isNewBest) {
                storeSet(storeKeys.best, String(score));
                storeSet(storeKeys.bestTotal, String(total));
                storeSet(storeKeys.bestTime, String(elapsed));
            }
            const attempts = parseInt(storeGet(storeKeys.attempts) || '0', 10) || 0;
            storeSet(storeKeys.attempts, String(attempts + 1));
            storeSet(storeKeys.lastIso, new Date().toISOString());
            paintBest();

            // Build results card.
            renderResults(score, total, elapsed, isNewBest);

            if (typeof opts.onFinish === 'function') {
                try {
                    opts.onFinish({ slug: slug, score: score, total: total, elapsedMs: elapsed, isNewBest: isNewBest });
                } catch (_) { /* swallow page-side errors */ }
            }
        }

        function renderResults(score, total, elapsed, isNewBest) {
            cardEl.hidden = true;
            resultsEl.hidden = false;
            resultsEl.innerHTML = '';

            const headline = el('h2', { class: 'quiz-results-headline' });
            headline.textContent = score + ' / ' + total + ' correct';
            const sub = el('p', { class: 'quiz-results-sub' });
            sub.textContent = (title ? title + ' · ' : '') + 'Time ' + formatMs(elapsed);
            if (isNewBest) {
                const tag = el('span', { class: 'quiz-results-newbest' }, [' · new best']);
                sub.appendChild(tag);
            } else if (score === total && total > 0) {
                // P-006: a perfect run that can't dethrone a longer stored best
                // (the #89 longest-run rule) still earns a run-length-independent
                // 'flawless' acknowledgement, so a focused 5/5 re-run after a 10/10
                // isn't met with silence. Its own class (not new-best) keeps the
                // two signals distinct: green 'flawless' vs amber 'new best'.
                const tag = el('span', { class: 'quiz-results-flawless' }, [' · flawless']);
                sub.appendChild(tag);
            }
            resultsEl.appendChild(headline);
            resultsEl.appendChild(sub);

            // Miss list — only show wrong/skipped. (The old `.map` wrapped
            // each answer with its index, but only the answer was ever read;
            // the index was dead — codebase-issues #118.)
            const misses = state.answers.filter(function (a) { return !a.correct; });

            if (misses.length) {
                const heading = el('h3', { class: 'quiz-results-misses-heading' }, ['Review']);
                resultsEl.appendChild(heading);

                const table = el('table', { class: 'ref-table-dense quiz-results-misses' });
                const thead = el('thead', null, [
                    el('tr', null, [
                        el('th', null, ['Question']),
                        el('th', null, ['Learn more'])
                    ])
                ]);
                const tbody = el('tbody');
                misses.forEach(function (a) {
                    const q = questions[a.qi];
                    const promptCell = el('td');
                    // Plain-text prompt: strip HTML for the miss-list view.
                    const tmp = document.createElement('div');
                    tmp.innerHTML = q.prompt;
                    promptCell.textContent = tmp.textContent || '';
                    const linkCell = el('td');
                    if (q.learnMore && q.learnMore.href) {
                        const a = el('a', { href: q.learnMore.href });
                        a.textContent = q.learnMore.label || 'Learn more';
                        linkCell.appendChild(a);
                    } else {
                        linkCell.textContent = '—';
                    }
                    tbody.appendChild(el('tr', null, [promptCell, linkCell]));
                });
                table.appendChild(thead);
                table.appendChild(tbody);
                resultsEl.appendChild(table);
            }

            const restartBtn = el('button', { type: 'button', class: 'quiz-action quiz-action-primary quiz-restart-btn' }, ['Restart →']);
            restartBtn.addEventListener('click', function () { startQuiz(); });
            const actions = el('div', { class: 'quiz-actions quiz-results-actions' }, [restartBtn]);
            // Onward path (owner decision, audit-2026-06 #22): the card
            // used to offer Restart as its ONLY action. Pages pass
            // opts.next ({href, label}, built at build time from the
            // canonical quizOrder data file); field drills pass null —
            // they're not a curriculum — and get no link.
            if (opts.next && opts.next.href) {
                actions.appendChild(el('a', { class: 'quiz-action quiz-next-link', href: opts.next.href },
                    ['Next quiz: ' + opts.next.label + ' →']));
            }
            resultsEl.appendChild(actions);

            setTimeout(function () { restartBtn.focus(); }, 0);
        }

        // ── Public-facing controller (returned to caller) ───────────
        const controller = {
            reset: function (resetOpts) {
                if (resetOpts && resetOpts.clearBest) {
                    storeDel(storeKeys.best);
                    storeDel(storeKeys.bestTotal);
                    storeDel(storeKeys.bestTime);
                    storeDel(storeKeys.attempts);
                    storeDel(storeKeys.lastIso);
                    paintBest();
                }
                startQuiz();
            },
            getState: function () {
                return {
                    slug: slug,
                    phase: state.phase,
                    cursor: state.cursor,
                    queueLength: state.queue.length,
                    score: state.answers.filter(function (a) { return a.correct; }).length
                };
            }
        };

        // ── Boot ────────────────────────────────────────────────────
        paintBest();
        startQuiz();

        return controller;
    }

    function mount(target, questions, opts) {
        opts = opts || {};
        const rootEl = (typeof target === 'string')
            ? document.querySelector(target)
            : target;
        if (!rootEl) {
            console.warn('Quiz.mount: target "' + target + '" not found.');
            return null;
        }
        if (!opts.slug || typeof opts.slug !== 'string' || !KEBAB.test(opts.slug)) {
            console.warn('Quiz.mount: opts.slug must be a kebab-case string.');
            return null;
        }
        if (!Array.isArray(questions) || !questions.length) {
            console.warn('Quiz.mount (' + opts.slug + '): questions array is empty.');
            return null;
        }
        for (let i = 0; i < questions.length; i++) {
            const err = validateQuestion(questions[i], i);
            if (err) {
                console.warn('Quiz.mount (' + opts.slug + '): ' + err);
                return null;
            }
        }
        return new Quiz(rootEl, questions, opts);
    }

    window.Quiz = {
        mount: mount,
        version: ENGINE_VERSION
    };
})();
