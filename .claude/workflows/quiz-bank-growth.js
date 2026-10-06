// quiz-bank-growth.js — the quiz-growth lane as a named Workflow.
//
//   Workflow({ name: 'quiz-bank-growth', args: { banks: ['building-pressure', 'vav-systems'], sessionUrl: 'https://claude.ai/code/session_…' } })
//
// Grows each named bank from its current size toward the ruled target of
// 15 questions (owner, 2026-08-20; wave 2 shipped 2026-10-06 as PRs #608,
// #609, #610). One bank → one worktree-isolated Opus drafter → up to two
// Fable refute rounds with an Opus fixer → one PR per bank. The owner
// merges every bank PR (a bank renders into a live practice page).
//
// args.banks        required — bank slugs (html/_data/quizzes/<slug>.js), or
//                   objects { slug, lesson?, why?, port? }. A slug whose
//                   paired lesson is html/education/<slug>.html needs no
//                   `lesson`; a FIELD DRILL (no such lesson — controller-swap,
//                   controls-commissioning, field-wiring-sensors,
//                   sequencing-scenarios, surviving-first-months,
//                   troubleshooting, wiresheet-traces as of 2026-10-06)
//                   must name its source lessons in `lesson` (a
//                   comma-separated list of /education/*.html paths).
// args.target       optional — bank size to reach (default 15).
// args.sessionUrl   optional — appended as the Claude-Session line in
//                   commits and PR bodies; omit it and only the
//                   Co-Authored-By line is written.
// args.basePort     optional — first local port (default 9601; each bank
//                   uses basePort+i for the drafter, +10 and +20 for the
//                   refuter and fixer). Ports 8000–8099 and 9474–9498 are
//                   taken on the owner's box.
//
// Owner stances the drafter and refuter are told (rulings.md §18): no Td
// on reheat coils as a teaching default; coil valves are two-way or
// three-way; say "modulating" before claiming a 0–100 % command; pills on
// the practice landing describe the RUN, not the bank; owner field-gotchas
// beat invented questions, so every PR body invites a swap.
export const meta = {
  name: 'quiz-bank-growth',
  description: 'Grow named quiz banks toward the ruled 15-question target: Opus drafts, Fable refutes, one PR per bank for owner review',
  whenToUse: 'When the quiz-growth arc needs another wave of banks grown; pass the slugs in args.banks',
  phases: [
    { title: 'Draft', detail: 'Opus writes the new questions per bank from the paired lesson(s)', model: 'opus' },
    { title: 'Refute', detail: 'Fable adversarially checks every new question', model: 'fable' },
    { title: 'Fix', detail: 'Opus applies must-fix findings', model: 'opus' },
  ],
}

if (!args || !Array.isArray(args.banks) || args.banks.length === 0) {
  throw new Error("quiz-bank-growth needs args.banks — e.g. { banks: ['building-pressure', { slug: 'troubleshooting', lesson: '/education/status-and-proof.html, /education/controls-commissioning.html' }], sessionUrl: '…' }")
}
const TARGET = args.target || 15
const BASE_PORT = args.basePort || 9601
const SESSION = args.sessionUrl ? `\nClaude-Session: ${args.sessionUrl}` : ''
const ATTR_COMMIT = `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>${SESSION}`
const ATTR_PR = `🤖 Generated with [Claude Code](https://claude.com/claude-code)${args.sessionUrl ? `\n\n${args.sessionUrl}` : ''}`

const BANKS = args.banks.map((b, i) => {
  const o = typeof b === 'string' ? { slug: b } : { ...b }
  o.lesson = o.lesson || `/education/${o.slug}.html`
  o.why = o.why || 'next bank in the quiz-growth arc'
  o.port = o.port || BASE_PORT + i
  return o
})

const COMMON = `
GROUND RULES: you are worktree-isolated — run 'git rev-parse --show-toplevel' and 'git worktree list' first and never touch the primary checkout. A fresh worktree has no node_modules: run 'npm ci' first. 'git fetch origin' before branching. Absolute paths; no 'cd' in compound commands. Ports 8000–8099 and 9474–9498 are taken on this box; use only the PORT given. Any throwaway Playwright config lives in your worktree root and is never committed; it requires the repo's playwright.config.js, sets use.baseURL to http://localhost:<PORT>, testDir to your worktree's tests dir, and webServer { command: 'npm run build && python3 -m http.server <PORT> --directory _site', url: 'http://localhost:<PORT>/sitemap.xml', cwd: <worktree> }. Run Playwright in the foreground. Leave no server running ('pgrep -af "http.server <PORT>"' empty) when you finish.
OWNER STANCES (docs/audits/2026-10-reentry/rulings.md §18 — honour them in prompts and explains): derivative is almost always zero in HVAC and is never the first knob on a lagging coil; a coil or terminal valve may be two-way OR three-way (mixing or diverting); say "modulating" before you imply a 0–100 % command, because two-position valves exist; 'deadband' has two senses — disambiguate; no vendor product names; never the phrase 'plain English'; no coming-soon promises; the practice landing's pills describe the RUN (defaultCount), not the bank, so do not touch them.
This brief is a hypothesis: if the repo disagrees with it, the repo wins — report the discrepancy in your notes rather than forcing the brief.
Commit messages end with exactly:
${ATTR_COMMIT}
PR bodies have '## Summary', '## Changes', '## Test plan' (checkboxes with the specs you ran and counts), '## Merge authority' ('Quiz bank renders into a live practice page → owner merges'), and end with exactly:
${ATTR_PR}
Never merge. Do not delete your worktree.
`

function draftPrompt(b) {
  return `${COMMON}
LANE: grow the '${b.slug}' quiz bank to ${TARGET} questions (ruled bank target; one bank per PR; owner merges). Branch 'feat/quiz-${b.slug}-${TARGET}' from origin/main, PORT ${b.port}. Why this bank now: ${b.why}.

Read first, in this order: html/scripts/quiz-engine.js's header (the question schema and the four types mcq / tf / gotcha / numeric), html/_data/quizzes/${b.slug}.js (the existing questions — header comment, id style, tags, learnMore anchors, tone; count them, that is your starting size), the source lesson(s) IN FULL: html${b.lesson} — if that path does not exist this bank is a FIELD DRILL, so read html/practice/${b.slug}.html's intro and relatedLinks plus the existing bank's learnMore hrefs to find its source lessons and read those instead; every question must be answerable from a page the practice page already points at. Then one grown bank for the house shape ('git log --oneline -- html/_data/quizzes/air-handlers.js' and 'git show' the growth commit from PR #609: how the questions were added, how the header's coverage sentence was updated, how learnMore anchors were chosen). Also read tests/quiz-banks.spec.js and tests/metric-spans.js's header so you know what the shape and metric guards check.

Write the questions needed to reach ${TARGET}, covering sections the existing bank does not test (name the coverage in the bank header's coverage sentence and keep that sentence countable-but-uncounted — never 'these fifteen questions'). Mix types: at least one 'gotcha' (the field-trap shape — the thing a tech believes that is wrong), at least one 'numeric' if the source has arithmetic, the rest mcq/tf. Rules: ids kebab-case, stable, unique in the file; prompts are plain prose + inline <code>/<em>/<strong> only (NO SVG — prompts are stripped to text for the FAQPage JSON-LD); every learnMore.href points at an id that EXISTS on the lesson ('grep -n 'id="' on the lesson; lesson subheads are <h2 class="subhead" id="…">); if the right section has no id, anchor the nearest parent section and say so in the header comment — do not add ids to the lesson in this lane); any °F figure with a metric twin uses the static parenthetical form '48 °F (8.9 °C)', metric to one decimal, deltas computed from the displayed operands (tests/metric-spans.spec.js checks these); distractors are plausible field answers; keep the keyed choice no longer than the distractors and spread the key across a/b/c/d (count the bank's existing key letters first); 'explain' teaches the why in two to four sentences and never contradicts the lesson. Tags follow the existing bank's vocabulary. Do NOT change defaultCount on the practice page, the landing card or its pills, README counts, or the lesson. The FAQPage JSON-LD grows automatically.

Verify: 'npm run build'; run tests/quiz-banks.spec.js, tests/metric-spans.spec.js and tests/link-integrity.spec.js in full, then the smoke spec filtered to /practice/${b.slug}.html; also load the built practice page with a tiny Playwright script and confirm it mounts without console errors and the Review table can show a new question (mount, answer, reveal). Report counts.

Commit ('quiz: grow ${b.slug} bank to ${TARGET}'; subject under 72 chars), push, open the PR with 'gh pr create' (title 'quiz: grow ${b.slug} bank <from> → ${TARGET} [S]'); in the body list each new question's id, type and the section it tests, and add a line inviting the owner to swap any question for a field gotcha of his own. Return: branch, prNumber, prUrl, the new ids with type + anchor, specs run with counts, and any lesson gap or brief discrepancy you noticed (notes).`
}

const DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    branch: { type: 'string' }, prNumber: { type: 'integer' }, prUrl: { type: 'string' },
    newQuestions: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, type: { type: 'string' }, anchor: { type: 'string' } }, required: ['id', 'type', 'anchor'] } },
    specsRun: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' },
  },
  required: ['branch', 'prNumber', 'newQuestions', 'specsRun'],
}

function refutePrompt(b, d) {
  return `${COMMON}
You are the adversarial REFUTER for the '${b.slug}' quiz-bank growth (PR #${d.prNumber}, branch ${d.branch}). Default stance: every new question is wrong until you fail to break it. Own worktree only; 'git fetch origin' then 'git checkout -B ${d.branch} origin/${d.branch}'. PORT ${b.port + 10}.
The new question ids: ${JSON.stringify(d.newQuestions)}.
For EACH new question, in html/_data/quizzes/${b.slug}.js, check against the source lesson(s) (html${b.lesson}, or the pages the practice page points at for a drill) and your own domain knowledge of building controls / HVAC:
1. Is the keyed answer actually correct? Could a competent tech defend a different choice? (A defensible alternative = must-fix: reword or re-key.)
2. Does the explain contradict the lesson, the site's other lessons, physics, or the OWNER STANCES above? Any number wrong? Any metric parenthetical mis-rounded or a delta not computed from the displayed operands?
3. Does the prompt leak the answer, or does a 'gotcha' name the trap in the prompt? Does the question duplicate an existing one in this bank or a neighbouring bank in substance? Is the keyed choice the longest, or does the key letter distribution give a test-wiseness tell?
4. Does the learnMore anchor resolve to an id on the built lesson page, and is it the RIGHT section?
5. Vendor product names, 'plain English', coming-soon promises, 'deadband' used ambiguously, HTML in prompts beyond <code>/<em>/<strong>?
6. Did the header's coverage sentence stay countable-but-uncounted? Was anything outside the bank file changed (it must not be — 'git diff origin/main --stat')?
7. Run tests/quiz-banks.spec.js, tests/metric-spans.spec.js and tests/link-integrity.spec.js yourself; confirm pass.
Return mustFix (question id, exact problem, exact fix) and advisory (style nits), clean=true only when mustFix is empty.`
}

const REFUTE_SCHEMA = {
  type: 'object',
  properties: {
    clean: { type: 'boolean' },
    mustFix: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } }, required: ['id', 'problem', 'fix'] } },
    advisory: { type: 'array', items: { type: 'string' } },
  },
  required: ['clean', 'mustFix', 'advisory'],
}

function fixPrompt(b, d, v) {
  return `${COMMON}
Fix the '${b.slug}' bank (branch ${d.branch}, PR #${d.prNumber}) per the refuter. Own worktree; 'git fetch origin' then 'git checkout -B ${d.branch} origin/${d.branch}'. PORT ${b.port + 20}. Apply EXACTLY these must-fix items:
${JSON.stringify(v.mustFix, null, 2)}
Keep ids stable unless a fix says to re-key. Re-run tests/quiz-banks.spec.js, tests/metric-spans.spec.js and tests/link-integrity.spec.js, commit ('quiz: refuter fixes to the ${b.slug} bank'), push, and 'gh pr edit ${d.prNumber}' to add a '## Refuter fixes applied' section to the body. Return headSha and notes.`
}

const results = await pipeline(
  BANKS,
  (b) => agent(draftPrompt(b), { label: `draft:${b.slug}`, phase: 'Draft', model: 'opus', isolation: 'worktree', schema: DRAFT_SCHEMA }),
  async (d, b) => {
    if (!d) return { slug: b.slug, status: 'draft-failed' }
    let v = null
    for (let round = 1; round <= 2; round++) {
      v = await agent(refutePrompt(b, d), { label: `refute:${b.slug}:r${round}`, phase: 'Refute', model: 'fable', isolation: 'worktree', schema: REFUTE_SCHEMA })
      if (!v || v.clean) break
      const f = await agent(fixPrompt(b, d, v), { label: `fix:${b.slug}:r${round}`, phase: 'Fix', model: 'opus', isolation: 'worktree', schema: { type: 'object', properties: { headSha: { type: 'string' }, notes: { type: 'string' } } } })
      if (!f) break
    }
    return { slug: b.slug, status: 'opened', pr: d.prNumber, url: d.prUrl, newQuestions: d.newQuestions, verified: v ? v.clean : null, open: v && !v.clean ? v.mustFix : [], advisory: v ? v.advisory : [], notes: d.notes }
  },
)
log(`${results.filter(Boolean).length} bank lane(s) finished; every PR waits for the owner`)
return { results: results.filter(Boolean) }
