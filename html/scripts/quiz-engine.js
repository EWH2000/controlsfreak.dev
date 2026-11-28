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
// defaultCount must be one of the settings select's own options —
// '5', 10, or 'all' — since the select is painted from it. A bank may
// hold MORE questions than defaultCount presents: such a bank is
// SAMPLED, so a 15-question bank under defaultCount: 10 presents a
// different 10 each run and never strands its tail. A bank that fits
// its defaultCount is never sampled — it presents its head in bank
// order, exactly as it always has, including when the reader picks a
// shorter run from the Questions select. Every practice page uses
// defaultCount: 10; grow a bank rather than raising the count.
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
//   figure:    kebab-case element id               -- optional, any type
//     References an element ALREADY IN THE PAGE'S STATIC DOM (a "figure
//     bank" near the quiz mount: <svg class="edu-svg hidden" id="…">).
//     The engine clones it into the .quiz-figure slot on render; it does
//     NOT carry markup on the question object. Three reasons for the
//     indirection: the payload is paid once no matter how often the
//     question is drawn, the markup stays in crawlable page source, and
//     `npm run screenshots` (the diagram audit) can reach it — the same
//     class="hidden" un-hide the pid-eq-scene family already relies on.
//     Keeping the SVG off the question object also keeps it out of the
//     two consumers that strip questions to text: the Review/miss table
//     below and head.njk's FAQPage JSON-LD (whose buildQuestionName in
//     .eleventy.js reads only `prompt` + `snippet`), either of which
//     would otherwise publish every <title>/<desc>/<text> node.
//     Accessibility contract: the figure names itself natively —
//     role="img" + <title> (+ <desc>). A DRILL figure's <desc> describes
//     the topology and live values fully, but never names the fault or
//     states the verdict (owner, settled 2026-07-20 — CLAUDE.md, quiz).
//     The clone must NOT rely on aria-labelledby/aria-describedby;
//     validateQuestion rejects a figure that carries either, because the
//     accessible name would be recomputed from the renamed ids (see
//     below) and a title+desc pair fed through aria-labelledby collapses
//     the whole description into the graphic's NAME.
//     Id handling: the root id is dropped and every descendant id is
//     RENAMED with a per-render prefix, with all internal references
//     (url(#…) on fill/stroke/marker-*/clip-path/mask/filter, and
//     #fragment on <use href>) rewritten to match — so the clone stays
//     self-contained without duplicating ids that are live in the
//     document. Do not "simplify" this to stripping the ids: that
//     leaves url(#…) dangling and the arrowheads / gradients / hatches
//     silently paint nothing.
//   ── mcq / gotcha ──
//     choices: [{ id, text, correct? }]            -- exactly one `correct`
//     Choices are SHOWN in a random order, drawn fresh on every render
//     (each time a question is shown, restarts included). The array's
//     order is authoring order only — the engine shuffles a copy and
//     never reorders the bank. Why: authors had keyed the right answer
//     on one letter far more often than chance, and some banks on a
//     single letter throughout, so a test-wise reader could learn the
//     letter instead of the answer. True/False is NOT shuffled (it
//     always reads True, then False). Consequence for authors: never
//     refer to a choice by letter or position — "(c)", "answer b",
//     "the first option", "both of the above" — in a prompt, an
//     explanation or a choice.
//     Identify choices by `id`, never by index.
//   ── gotcha ── (mcq + snippet)
//     snippet: inline HTML (typically a <pre class="quiz-snippet">)
//   ── tf ──
//     answer:  true | false
//   ── numeric ──
//     answer:    number
//     tolerance: number                            -- absolute
//     unit:      string                            -- rendered as a suffix label
//     inputmode: 'decimal' | 'numeric'             -- optional, default 'decimal'
//     The answer box is a TEXT input (inputmode still picks the phone
//     keypad), read by parseNumericInput — also exposed as
//     Quiz.parseNumericInput(raw, decimalMark). It is NOT
//     <input type="number">, because a number input parses by the
//     browser's own locale. Measured 2026-11-27 in headless Chromium, a
//     bare number input, real keystrokes: an English-locale browser
//     turns a typed "61,6" into 616 and reads "10.000" as 10, and one
//     running under a German process locale turns "10,000" into 10.
//     Each time, a reader who knew the answer was marked wrong with no
//     hint why.
//     What is accepted. First the entry is normalised: NFKC (full-width
//     digits and separators, and the no-break / narrow / thin spaces,
//     become ASCII), U+2212 MINUS SIGN becomes '-', and every space is
//     removed. Then: an optional single leading '+' or '-', and a body of
//     digits, '.' and ',' only, with at least one digit.
//       - No separator: the digits.
//       - Both '.' and ',': whichever comes LAST is the decimal mark and
//         occurs once; the other groups thousands in well-formed groups of
//         three. "10,000.5" and "10.000,5" both read 10000.5.
//       - One kind, twice or more: thousands grouping, well-formed
//         ("1,000,000"; "1.2.3" is not a number).
//       - One kind, once: a decimal mark with digits on at least one
//         side — "12,5" is 12.5, "0,500" is 0.5, "1234,567" is
//         1234.567 — EXCEPT the AMBIGUOUS shape: 1-3 digits not starting
//         with 0, the mark, exactly three digits ("10,000", "47.808").
//         Those keystrokes mean ten thousand under one number convention
//         and ten under the other, so they are read by the reader's
//         browser's convention: a separator equal to `decimalMark` is a
//         decimal point, the other one is a thousands separator. On an
//         English-locale browser "10,000" is 10000 and "10.000" is 10; on
//         a German one, the reverse.
//       - The sign applies to the value.
//     None of these rules but the ambiguous one depends on decimalMark.
//     `decimalMark` is '.' or ','. Omitted (or anything else), it is the
//     browser's: localeDecimalMark() asks new Intl.NumberFormat() for the
//     decimal part of 1.5 — ',' if that is a comma, '.' for anything
//     else, '.' if Intl is missing or throws. A mount computes it once.
//     Every entry has ONE reading or none: parseNumericInput returns
//     null, or { value, ambiguous } — plus `sep` (the separator typed)
//     and `readAs` ('decimal' | 'group') when `ambiguous` is true. The
//     answer is correct iff |value - answer| <= tolerance, and `given`
//     is the value.
//     The browser's number convention stands in for the reader's habit;
//     it is not a measurement of it. A reader whose browser language
//     differs from their own habit can still be read the other way on
//     the ambiguous shape, the one rule the convention decides. For that
//     case the reveal adds one line saying how the separator was read
//     ("The comma in your entry was read as a thousands separator."), on
//     every submitted ambiguous entry, graded right or wrong, never on a
//     Skip.
//     Not a number. An entry with no reading keeps Submit disabled. The
//     format hint ("Enter a number, like 1250 or 12.5.") and
//     aria-invalid="true" appear only when (a) the normalised entry holds
//     a character no number can contain — anything but ASCII digits, '.',
//     ',', '+', '-' and whitespace — or (b) the reader presses Enter on
//     a non-empty entry with no reading. A number still being typed ("-",
//     ".", "1,000,0") is never flagged before (b). Every input event
//     re-evaluates by (a) alone, so the next keystroke after (b) clears
//     the hint unless it adds a foreign character; the hint also clears
//     on reveal and whenever a question is shown. What the reader typed
//     is never stripped or rewritten.
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
// - Keyboard follows the RENDERED (shuffled) order, never the bank's:
//   the first choice drawn carries tabindex 0 and takes initial focus,
//   and the arrow keys walk the choices in the order they appear.
// - Reveal panel is aria-live="polite", lives in the DOM at all times
//   so its content-change is what's announced (not its insertion).
//   Content is built in a DocumentFragment and assigned once so screen
//   readers announce a single update per submit.
// - Focus moves programmatically to the action button after submit.
// - The numeric box's format hint is one element per mount, inside
//   .quiz-numeric under the box + unit row (so it hides with it),
//   referenced by the input's aria-describedby and aria-live="polite".
//   It is `hidden` and EMPTY until rule (a) or (b) above shows it: a
//   description is computed even from a hidden node, so leaving the
//   text in place would read the hint out on every numeric question
//   while a sighted reader sees nothing — the two must hear and see the
//   same thing.
// ──────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    const ENGINE_VERSION = 1;
    const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    const NUMERIC_HINT_TEXT = 'Enter a number, like 1250 or 12.5.';

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
        // `figure` is optional on EVERY type — deliberately not mirroring
        // the gotcha/snippet invariant below, which is one-way (a gotcha
        // without a snippet fails mount, but a non-gotcha carrying one
        // renders nothing while the JSON-LD still publishes it). What is
        // enforced instead is that a declared figure always resolves: a
        // typo'd or missing id fails mount loudly rather than leaving an
        // empty slot, so a `figure` can never silently no-op.
        if (q.figure !== undefined) {
            if (typeof q.figure !== 'string' || !KEBAB.test(q.figure)) {
                return 'question ' + q.id + ' figure must be a kebab-case element id';
            }
            const figureEl = document.getElementById(q.figure);
            if (!figureEl) {
                return 'question ' + q.id + ' figure references missing element #' + q.figure;
            }
            // The accessibility contract in the header is enforced here
            // rather than left to prose. Nearly every diagram SVG on the
            // site names itself with role="img" aria-labelledby="<x>-title
            // <x>-desc", so copying a lesson SVG into a figure bank is the
            // path of least resistance — and it degrades silently: a
            // title+desc pair routed through aria-labelledby becomes the
            // graphic's NAME, so a screen reader announces the entire
            // topology description every time the figure is encountered
            // and the <desc> stops being a separate description. Fail
            // loudly at mount instead; the figure should name itself with
            // native <title> / <desc>.
            if (figureEl.hasAttribute('aria-labelledby') || figureEl.hasAttribute('aria-describedby')) {
                return 'question ' + q.id + ' figure #' + q.figure +
                    ' must name itself with native <title>/<desc>, not aria-labelledby/aria-describedby';
            }
        }
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

    // ── Numeric answer parsing ──────────────────────────────────────
    // Pure: the text a reader typed → its one reading, or null when it is
    // not a number at all. The grammar, the ambiguous shape and why the
    // browser's number convention decides it are in the numeric section
    // of the header. Exposed as Quiz.parseNumericInput so a spec can
    // table-test it.
    const NUMERIC_GROUPED = {
        '.': /^\d{1,3}(\.\d{3})+$/,
        ',': /^\d{1,3}(,\d{3})+$/
    };
    const NUMERIC_AMBIGUOUS = /^[1-9]\d{0,2}[.,]\d{3}$/;
    // A character no number can contain, tested on the NORMALISED entry
    // (whitespace already removed). Drives the format hint's rule (a).
    const NUMERIC_FOREIGN = /[^0-9.,+-]/;

    function normaliseNumericEntry(raw) {
        if (raw === null || raw === undefined) return '';
        return String(raw)
            .normalize('NFKC')
            .replace(/\u2212/g, '-')
            .replace(/\s+/g, '');
    }

    // The browser's decimal mark: ',' or '.', never anything else. A
    // locale whose decimal part is neither (Arabic U+066B, say) gets '.',
    // and so does a browser without Intl or formatToParts.
    function localeDecimalMark() {
        try {
            const parts = new Intl.NumberFormat().formatToParts(1.5);
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].type === 'decimal') return parts[i].value === ',' ? ',' : '.';
            }
        } catch (_) { /* no Intl, or no formatToParts */ }
        return '.';
    }

    function parseNumericInput(raw, decimalMark) {
        const s = normaliseNumericEntry(raw);
        const m = /^([+-]?)([0-9.,]+)$/.exec(s);
        if (!m || !/[0-9]/.test(m[2])) return null;
        const sign = m[1] === '-' ? -1 : 1;
        const body = m[2];
        const dots = body.split('.').length - 1;
        const commas = body.split(',').length - 1;
        let value;
        let ambiguousSep = null;
        let readAs = null;

        if (!dots && !commas) {
            value = Number(body);
        } else if (dots && commas) {
            // The kind that comes last is the decimal mark; every
            // grouping mark therefore sits in front of it.
            const mark = body.lastIndexOf('.') > body.lastIndexOf(',') ? '.' : ',';
            const group = mark === '.' ? ',' : '.';
            if ((mark === '.' ? dots : commas) !== 1) return null;
            const at = body.indexOf(mark);
            const whole = body.slice(0, at);
            if (!NUMERIC_GROUPED[group].test(whole)) return null;
            value = Number(whole.split(group).join('') + '.' + body.slice(at + 1));
        } else {
            const sep = dots ? '.' : ',';
            const parts = body.split(sep);
            if (dots + commas > 1) {
                if (!NUMERIC_GROUPED[sep].test(body)) return null;
                value = Number(parts.join(''));
            } else if (NUMERIC_AMBIGUOUS.test(body)) {
                // The one shape the keystrokes alone cannot settle: read
                // it by the reader's own number convention. Resolved
                // lazily, so an unambiguous entry never asks Intl.
                const mark = (decimalMark === '.' || decimalMark === ',')
                    ? decimalMark
                    : localeDecimalMark();
                ambiguousSep = sep;
                readAs = sep === mark ? 'decimal' : 'group';
                value = Number(readAs === 'decimal'
                    ? parts[0] + '.' + parts[1]
                    : parts[0] + parts[1]);
            } else {
                value = Number((parts[0] || '0') + '.' + (parts[1] || '0'));
            }
        }
        if (!isFinite(value)) return null;
        if (value !== 0) value = sign * value;   // "-0" reads 0, never -0
        if (ambiguousSep) {
            return { value: value, ambiguous: true, sep: ambiguousSep, readAs: readAs };
        }
        return { value: value, ambiguous: false };
    }

    // ── Shuffle (Fisher-Yates) ──────────────────────────────────────
    function shuffleInPlace(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr;
    }

    // ── Figure helpers ──────────────────────────────────────────────
    // Attributes that can carry a same-document reference. `fill` and
    // `stroke` take a url(#…) paint server; the marker family, clip-path,
    // mask and filter take url(#…) too; <use> takes a bare #fragment in
    // href / xlink:href. This is the set the site's own diagram SVGs use
    // (markers in bacnet-*.html, <pattern> in commanding-actuators.html,
    // <linearGradient> + <use> in refrigerant-loop.html).
    const FIGURE_URL_ATTRS = [
        'fill', 'stroke', 'clip-path', 'mask', 'filter',
        'marker', 'marker-start', 'marker-mid', 'marker-end'
    ];
    const FIGURE_HREF_ATTRS = ['href', 'xlink:href'];
    let figureCloneSeq = 0;

    // Rename every id in a cloned figure and rewrite the references that
    // point at them. Stripping the ids instead (the obvious move, since
    // the source stays live in the document) breaks the clone silently:
    // the clone keeps marker-end="url(#x)" while its own <marker> has
    // lost id="x", and Chromium does NOT fall through to the still-live
    // hidden source — the arrowhead / gradient / hatch simply paints
    // nothing, with no error and no console warning. Renaming keeps the
    // clone self-contained AND collision-free (the source's ids and any
    // other mounted copy's are untouched).
    function uniquifyFigureIds(root) {
        const prefix = 'qfig' + (++figureCloneSeq) + '-';
        const renamed = Object.create(null);
        root.querySelectorAll('[id]').forEach(function (node) {
            const oldId = node.getAttribute('id');
            const newId = prefix + oldId;
            renamed[oldId] = newId;
            node.setAttribute('id', newId);
        });
        if (!Object.keys(renamed).length) return root;

        const all = [root].concat(Array.prototype.slice.call(root.querySelectorAll('*')));
        all.forEach(function (node) {
            FIGURE_URL_ATTRS.forEach(function (attr) {
                const val = node.getAttribute && node.getAttribute(attr);
                if (!val || val.indexOf('url(') === -1) return;
                const next = val.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, function (whole, quote, id) {
                    return renamed[id] ? 'url(' + quote + '#' + renamed[id] + quote + ')' : whole;
                });
                if (next !== val) node.setAttribute(attr, next);
            });
            FIGURE_HREF_ATTRS.forEach(function (attr) {
                const val = node.getAttribute && node.getAttribute(attr);
                if (!val || val.charAt(0) !== '#') return;
                const target = renamed[val.slice(1)];
                if (target) node.setAttribute(attr, '#' + target);
            });
        });
        return root;
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
        // The browser's decimal mark, asked once per mount — every
        // keystroke and the grading read the ambiguous shape by it.
        const decimalMark = localeDecimalMark();

        // Does this bank hold more questions than the page's configured run
        // presents? That — not the runtime Questions select — is what
        // enables sampling (see buildQueue). Fixed at mount: both operands
        // are.
        const presentedCount = (opts.defaultCount === 'all' || !opts.defaultCount)
            ? questions.length
            : Math.min(parseInt(opts.defaultCount, 10) || questions.length, questions.length);
        const bankOverflows = questions.length > presentedCount;

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
        const figureSlot = el('div', { class: 'quiz-figure', hidden: true });
        const snippetSlot = el('div', { class: 'quiz-snippet-slot' });
        const choicesEl = el('div', { class: 'quiz-choices', role: 'radiogroup' });
        const numericEl = el('div', { class: 'quiz-numeric', hidden: true });
        // A TEXT input, not type="number" — see the numeric section of the
        // header: a number input hands over what the browser locale made
        // of the keystrokes, and parseNumericInput reads the text itself.
        const numericInput = el('input', {
            type: 'text',
            class: 'quiz-numeric-input',
            id: idify('numeric'),
            'aria-label': 'Numeric answer',
            'aria-describedby': idify('numeric-hint')
        });
        // Set as attributes, never through el()'s property fallback: the
        // property is `inputMode`, so a lowercase `inputmode` key only
        // made an expando, and `spellcheck` is a boolean property that
        // reads the STRING 'false' as true.
        numericInput.setAttribute('inputmode', 'decimal');
        numericInput.setAttribute('autocomplete', 'off');
        numericInput.setAttribute('autocapitalize', 'off');
        numericInput.setAttribute('spellcheck', 'false');
        const numericUnit = el('span', { class: 'quiz-numeric-unit' });
        // Format hint: shown only by rule (a) or (b) in the header, hidden
        // AND empty otherwise — see the accessibility notes for why the
        // text is not left in place. .quiz-numeric holds the box + unit
        // ROW and, under it, the hint (styles.css, .quiz-numeric-row): the
        // hint sits just under the box, out of reach of the question
        // pane's gap, hides along with .quiz-numeric on a non-numeric
        // question, and never touches the row's own flex layout.
        const numericHint = el('p', {
            class: 'quiz-numeric-hint',
            id: idify('numeric-hint'),
            'aria-live': 'polite',
            hidden: true
        });
        const numericRow = el('div', { class: 'quiz-numeric-row' });
        numericRow.appendChild(numericInput);
        numericRow.appendChild(numericUnit);
        numericEl.appendChild(numericRow);
        numericEl.appendChild(numericHint);
        questionPane.appendChild(promptEl);
        questionPane.appendChild(figureSlot);
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

        // Show or clear the numeric format hint and the input's
        // aria-invalid together. The text is written only on the
        // hidden → shown edge, so a polite live region announces it once
        // per bad entry rather than on every keystroke.
        function setNumericHint(on) {
            if (on) {
                if (numericHint.hidden) {
                    numericHint.textContent = NUMERIC_HINT_TEXT;
                    numericHint.hidden = false;
                }
                numericInput.setAttribute('aria-invalid', 'true');
            } else {
                numericHint.hidden = true;
                numericHint.textContent = '';
                numericInput.removeAttribute('aria-invalid');
            }
        }

        // On every input event: Submit is enabled exactly when the box
        // holds a number, and the hint follows rule (a) ALONE — a foreign
        // character. A number still being typed ("-", ".", "1,000,0") has
        // no reading yet but is not flagged, so the hint never flashes
        // mid-entry; rule (b) lives in the Enter handler. Never edits what
        // the reader typed.
        function paintNumericEntry() {
            submitBtn.disabled = !parseNumericInput(numericInput.value, decimalMark);
            setNumericHint(NUMERIC_FOREIGN.test(normaliseNumericEntry(numericInput.value)));
        }

        function markSettingsDirty() {
            if (state.phase === 'asking' || state.phase === 'revealed') {
                state.settingsDirty = true;
                dirtyNotice.hidden = false;
            }
        }

        // Sample, then order — but ONLY for a bank that overflows the
        // page's configured run (`bankOverflows`). That is the whole
        // problem this solves: under the old `indices.slice(0, count)`,
        // a bank grown past its defaultCount stranded its tail — every
        // question past the count was unreachable in a default run.
        //
        // The gate is deliberately `bankOverflows`, NOT `count < total`.
        // The runtime Questions select offers '5', so `count < total`
        // fires on every bank that sits exactly at its count — which is
        // all 39 shipped banks — and would silently turn "5" from "the
        // first five" into "a random five" site-wide. That is a real
        // product question (arguably a nicer behavior), but it is not
        // this change's to make, and it broke three smoke tests that
        // rely on the shipped meaning. A bank that fits its count keeps
        // the pre-sampling code path verbatim.
        //
        // Within an overflowing bank, order stays independent of the
        // draw: the draw picks WHICH questions, 'sequential' then
        // restores the bank's own order inside the sampled subset (the
        // build-up within a bank is deliberate — a random subset is
        // wanted, a scrambled sequence is not unless asked for), and
        // 'random' scrambles it.
        function buildQueue() {
            const total = questions.length;
            let count;
            if (state.count === 'all') count = total;
            else count = Math.min(parseInt(state.count, 10) || total, total);

            const indices = [];
            for (let i = 0; i < total; i++) indices.push(i);

            if (bankOverflows && count < total) {
                shuffleInPlace(indices);
                indices.length = count;
                if (state.order === 'random') shuffleInPlace(indices);
                else indices.sort(function (a, b) { return a - b; });
                return indices;
            }

            // Bank fits its configured run — byte-identical to the
            // pre-sampling engine.
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

            // Figure (any type). Cloned from the page's static figure
            // bank; mount() already proved the id resolves. Ids are
            // RENAMED (not stripped) with a per-render prefix and every
            // internal reference is rewritten to match — see
            // uniquifyFigureIds. Stripping alone silently broke every
            // marker / gradient / pattern / <use> in the clone.
            figureSlot.innerHTML = '';
            if (q.figure) {
                const figureSrc = document.getElementById(q.figure);
                const figureClone = figureSrc.cloneNode(true);
                figureClone.classList.remove('hidden');
                figureClone.removeAttribute('id');
                uniquifyFigureIds(figureClone);
                figureSlot.appendChild(figureClone);
                figureSlot.hidden = false;
            } else {
                figureSlot.hidden = true;
            }

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
            setNumericHint(false);

            if (q.type === 'mcq' || q.type === 'gotcha') {
                // Display order is drawn fresh on every render (owner
                // ruling, #335): authors had keyed the right answer on
                // one letter far more than chance, so a test-wise
                // reader could learn the letter instead of the trade.
                // The map() builds new item objects, so the shuffle
                // runs on a copy: the bank's own q.choices is never
                // reordered, and every render draws afresh from the
                // authored order. Nothing downstream may read a choice
                // by position — submit() and reveal() match on
                // data-choice-id / data-correct, and the "Right answer"
                // line finds the keyed choice by its `correct` mark.
                renderChoices(shuffleInPlace(q.choices.map(function (c) {
                    return { id: c.id, text: c.text, correct: !!c.correct };
                })));
                choicesEl.hidden = false;
            } else if (q.type === 'tf') {
                // Deliberately NOT shuffled: True-then-False is a
                // convention readers expect, and a two-item order
                // carries no letter to learn.
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
            // Roving tabindex over the RENDERED order: the first item
            // drawn is the group's single Tab stop, whatever its
            // position in the bank, and the arrow keys walk DOM order
            // (focusChoiceByOffset), so keyboard order always matches
            // what the reader sees.
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

        numericInput.addEventListener('input', paintNumericEntry);
        numericInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (state.phase === 'asking') {
                    if (parseNumericInput(numericInput.value, decimalMark)) submit();
                    // Rule (b): the reader tried to submit something that
                    // is not a number — now, and only now, say so.
                    else if (normaliseNumericEntry(numericInput.value) !== '') setNumericHint(true);
                } else if (state.phase === 'revealed') {
                    advance();
                }
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
            let numericRead = null;

            if (isSkip) {
                given = null;
                correct = false;
            } else if (q.type === 'mcq' || q.type === 'gotcha' || q.type === 'tf') {
                const sel = choicesEl.querySelector('.quiz-choice[aria-checked="true"]');
                if (!sel) return;  // shouldn't happen — submit is disabled
                given = sel.getAttribute('data-choice-id');
                correct = sel.getAttribute('data-correct') === 'true';
            } else if (q.type === 'numeric') {
                // ONE reading (header): the ambiguous shape was already
                // settled by the browser's number convention.
                numericRead = parseNumericInput(numericInput.value, decimalMark);
                if (!numericRead) return;  // shouldn't happen — submit is disabled
                given = numericRead.value;
                correct = Math.abs(numericRead.value - q.answer) <= q.tolerance;
            }

            state.answers.push({ qi: qi, given: given, correct: correct });
            reveal(q, given, correct, isSkip, numericRead);
        }

        // `numericRead` is the submitted entry's reading (null on a Skip
        // and for every non-numeric question); an ambiguous one earns the
        // line saying how its separator was read.
        function reveal(q, given, correct, isSkip, numericRead) {
            state.phase = 'revealed';
            // A Skip can land while the format hint is up ("12abc", then
            // Skip): it must not stay on screen under "Skipped.".
            setNumericHint(false);

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

            // How an ambiguous entry ("10,000", "47.808") was read — right
            // or wrong, so a reader whose browser language differs from
            // their own number habit can see why (header, numeric). It
            // wears the "Right answer" line's class. Inside .tool-body,
            // where every quiz ships, `.tool-body p` (0,1,1) out-specifies
            // that single-class rule on colour and size, so the line
            // renders in `.tool-body p`'s --text at 0.95rem with
            // .quiz-reveal-right's margin — exactly what the "Right
            // answer" line renders in — and needs no CSS of its own.
            // .quiz-reveal-read is the marker the specs find it by.
            if (!isSkip && numericRead && numericRead.ambiguous) {
                const sepName = numericRead.sep === ',' ? 'comma' : 'period';
                const readName = numericRead.readAs === 'group'
                    ? 'a thousands separator'
                    : 'a decimal point';
                frag.appendChild(el('p', { class: 'quiz-reveal-right quiz-reveal-read' }, [
                    'The ' + sepName + ' in your entry was read as ' + readName + '.'
                ]));
            }

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
        parseNumericInput: parseNumericInput,
        version: ENGINE_VERSION
    };
})();
