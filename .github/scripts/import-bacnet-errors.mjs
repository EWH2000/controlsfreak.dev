// BACnet error/reject/abort enumeration importer for controlsfreak.dev.
//
// Fetches the de-facto reference enums (bacnet-stack's bacenum.h) and
// regenerates html/_data/bacnetErrors.js — the enum-truth data source for
// the /tools/bacnet-error-codes.html decoder page. Four enumerations:
//   * BACnetErrorClass  — the 8 error classes (0–7)
//   * BACnetErrorCode   — the ~225 error codes (0–255 standard range)
//   * BACnetRejectReason — the reject reasons (0–63 standard range)
//   * BACnetAbortReason  — the abort reasons (0–63 standard range)
// The generated file is checked in: the site build NEVER fetches; freshness
// is a manual re-run (the data file's `retrieved` date is the contract).
//
// Run modes:
//   npm run import-bacnet-errors              fetch, validate, rewrite the data file
//   npm run import-bacnet-errors -- --dry-run fetch + validate + print stats, don't write
//
// This file carries ONLY the enum truth (id → name). The field-accurate
// human-readable descriptions live in the hand-authored, human-reviewed
// html/_data/bacnetErrorNotes.js and are overlaid by the page at build
// time — the generated/curated split keeps this file regenerable and the
// prose reviewable.
//
// Parse notes (learned the hard way against this header):
//   * The enums are ANONYMOUS typedefs closed with `} BACNET_ERROR_CODE;`
//     etc. — match on the close tag, and constrain the body so it can't
//     cross another `typedef enum` (a lazy match otherwise spans the file).
//   * bacnet-stack leaves COMMENTED-OUT duplicate definitions in the block
//     (`/* ERROR_CODE_READ_ACCESS_DENIED = 27, */`) — strip C comments
//     first or they parse as alias-duplicates.
//   * `MAX_BACNET_ERROR_CLASS` and `ERROR_CODE_DEFAULT = 65535` are
//     sentinels, not real values — filtered with the proprietary markers.
//     The _DEFAULT filter is \b-anchored so it strips ERROR_CODE_DEFAULT
//     but NOT ERROR_CODE_NO_DEFAULT_SCOPE (216) — a real 135-2020cp code
//     the un-anchored pattern silently dropped as a false positive.
// Robustness posture: throw loudly on anything unexpected.

'use strict';

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SOURCE = 'https://raw.githubusercontent.com/bacnet-stack/bacnet-stack/master/src/bacnet/bacenum.h';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_FILE = path.join(ROOT, 'html', '_data', 'bacnetErrors.js');

const dryRun = process.argv.slice(2).includes('--dry-run');

// Each enum: [key, closeTag, macroPrefix, stdMax, anchors]. stdMax is the
// top of the ASHRAE-standard range (proprietary values sit above it).
const ENUMS = [
    ['errorClass', 'BACNET_ERROR_CLASS', 'ERROR_CLASS_', 63,
        { 0: 'device', 2: 'property', 7: 'communication' }],
    ['errorCode', 'BACNET_ERROR_CODE', 'ERROR_CODE_', 255,
        { 0: 'other', 31: 'unknown-object', 32: 'unknown-property', 40: 'write-access-denied' }],
    ['rejectReason', 'BACNET_REJECT_REASON', 'REJECT_REASON_', 63,
        { 0: 'other', 9: 'unrecognized-service' }],
    ['abortReason', 'BACNET_ABORT_REASON', 'ABORT_REASON_', 63,
        { 0: 'other', 11: 'apdu-too-long' }],
];

// --- fetch ------------------------------------------------------------

const res = await fetch(SOURCE, {
    headers: { 'user-agent': 'controlsfreak.dev BACnet-errors importer (+https://controlsfreak.dev/contact.html)' },
});
if (!res.ok) throw new Error(`bacenum.h fetch failed — HTTP ${res.status} for ${SOURCE}`);
let header = await res.text();
header = header.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // strip comments

// --- parse ------------------------------------------------------------

function parseEnum(closeTag, prefix, stdMax) {
    // Body must not cross another `typedef enum`, so the lazy match grabs
    // the nearest preceding one to the close tag.
    const m = header.match(new RegExp(`typedef enum \\{((?:(?!typedef enum)[\\s\\S])*?)\\} ${closeTag};`));
    if (!m) throw new Error(`Could not find the ${closeTag} enum block in bacenum.h`);
    const rows = [];
    const seen = new Set();
    for (const mm of m[1].matchAll(/\b([A-Z][A-Z0-9_]+)\s*=\s*(\d+)/g)) {
        const macro = mm[1];
        const id = Number(mm[2]);
        if (/PROPRIETARY|MAX_BACNET|_MAX\b|_RESERVED|_FIRST|_LAST|_DEFAULT\b/.test(macro)) continue;
        if (id > stdMax) continue;
        if (seen.has(id)) throw new Error(`Duplicate id ${id} in ${closeTag} (${macro}) — comment stripping failed?`);
        seen.add(id);
        rows.push({ id, name: macro.replace(new RegExp('^' + prefix), '').toLowerCase().replace(/_/g, '-') });
    }
    rows.sort((a, b) => a.id - b.id);
    return rows;
}

const data = {};
const stats = [];
for (const [key, closeTag, prefix, stdMax, anchors] of ENUMS) {
    const rows = parseEnum(closeTag, prefix, stdMax);
    if (rows.length < 8) throw new Error(`${key}: only ${rows.length} values — suspiciously few`);
    for (let i = 1; i < rows.length; i++) {
        if (rows[i].id <= rows[i - 1].id) throw new Error(`${key}: ids not strictly ascending at ${rows[i - 1].id} → ${rows[i].id}`);
    }
    for (const [id, name] of Object.entries(anchors)) {
        const row = rows.find((r) => r.id === Number(id));
        if (!row || row.name !== name) throw new Error(`${key} anchor mismatch: id ${id} expected ${name}, got ${row ? row.name : '(missing)'}`);
    }
    data[key] = rows;
    const ids = rows.map((r) => r.id);
    stats.push(`${key}: ${rows.length} values (${Math.min(...ids)}–${Math.max(...ids)})`);
}

// Local date, not toISOString() — UTC stamps "tomorrow" for an evening run
// in US timezones (matches the other importers).
const now = new Date();
const retrieved = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
].join('-');

console.log('Parsed — ' + stats.join(' · '));

if (dryRun) {
    console.log('--dry-run: not writing.');
    process.exit(0);
}

// --- emit -------------------------------------------------------------

function emitArray(name, rows) {
    const body = rows.map((r) => `    { id: ${r.id}, name: ${JSON.stringify(r.name)} },`).join('\n');
    return `const ${name} = [\n${body}\n];`;
}

const out = `// BACnet error / reject / abort enumerations — GENERATED FILE, do not hand-edit.
//
// Source: ${SOURCE}
//   (bacnet-stack's error enums — the de-facto machine-readable form of the
//    ASHRAE 135 error-class / error-code / reject / abort enumerations,
//    which are paywalled)
// Retrieved: ${retrieved} · ${data.errorClass.length} classes · ${data.errorCode.length} codes · ${data.rejectReason.length} reject · ${data.abortReason.length} abort
// Regenerate: npm run import-bacnet-errors
//   (.github/scripts/import-bacnet-errors.mjs — validates before writing)
//
// Enum TRUTH only (id → name). Field-accurate human-readable descriptions
// live in the hand-authored html/_data/bacnetErrorNotes.js and are overlaid
// by /tools/bacnet-error-codes.html at build time. Names are the
// bacnet-stack spellings; the field-common rows should read cleanly, the
// long tail (BACnet/SC transport, HTTP/TLS/DNS, OAuth-scope codes) is
// edition-2020+ and rarely seen — verify exact wording against ASHRAE 135.
//
// Name strings render with \`| safe\` (site-authored, never user input).

${emitArray('errorClass', data.errorClass)}

${emitArray('errorCode', data.errorCode)}

${emitArray('rejectReason', data.rejectReason)}

${emitArray('abortReason', data.abortReason)}

module.exports = {
    errorClass,
    errorCode,
    rejectReason,
    abortReason,
    counts: {
        classes: ${data.errorClass.length},
        codes: ${data.errorCode.length},
        reject: ${data.rejectReason.length},
        abort: ${data.abortReason.length},
    },
    retrieved: '${retrieved}',
    source: '${SOURCE}',
};
`;

writeFileSync(OUT_FILE, out);
console.log(`Wrote ${path.relative(ROOT, OUT_FILE)} (${(out.length / 1024).toFixed(1)} KB)`);
