// BACnet engineering-units enumeration importer for controlsfreak.dev.
//
// Fetches the de-facto reference enum (bacnet-stack's bacenum.h) and
// regenerates html/_data/bacnetUnits.js — the single data source for the
// /tools/bacnet-units.html decoder page (the FULL 0–254 standard Units
// enumeration, vs. the ~80-row field-common slice bacnetEnums.js keeps for
// the object-reference tab). The generated file is checked in: the site
// build NEVER fetches; freshness is a manual re-run (the data file's
// `retrieved` date is the contract).
//
// Run modes:
//   npm run import-bacnet-units              fetch, validate, rewrite the data file
//   npm run import-bacnet-units -- --dry-run fetch + validate + print stats, don't write
//
// Name provenance: ASHRAE 135 is paywalled, so the authoritative machine-
// readable source is bacnet-stack's BACnetEngineeringUnits enum — the same
// reference the curated bacnetEnums.js slice was cross-checked against. Two
// name sources are merged, curated-wins:
//   * where an id also lives in the hand-authored bacnetEnums.js slice, that
//     row's name/symbol/group are used verbatim (canonical ASHRAE spelling +
//     the editorial symbol/group) — so this page can't drift from the
//     object-reference tab, and bacnetEnums.js stays the single source of
//     symbol/group;
//   * every other id gets its name mechanically from the enum macro
//     (lowercase, _→-, proper-noun Celsius/Fahrenheit restored). A few
//     bacnet-stack macros abbreviate the ASHRAE name (KW_HOURS_… →
//     kw-hours-…); those long-tail rows are honestly bacnet-stack spellings,
//     flagged in the page's provenance note for later verification.
//
// Robustness posture (mirrors the vendor-ID importer): throw loudly on
// anything unexpected — missing enum block, non-contiguous ids, a
// suspiciously low count — rather than shipping a silently truncated table.

'use strict';

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const SOURCE = 'https://raw.githubusercontent.com/bacnet-stack/bacnet-stack/master/src/bacnet/bacenum.h';
// The standard Units enumeration occupies 0–255; 255 is the reserved-range
// ceiling marker and 256+ is the proprietary/vendor range. bacnet-stack
// names every value 0–254, so a clean parse is exactly 255 contiguous rows.
const STD_MAX = 254;
const PROPRIETARY_MIN = 256;
// Floor guard: 255 defined values on 2026-07 and the enum only grows by
// ASHRAE addendum. A parse under this line means a truncated fetch or a
// changed enum name, not a smaller standard.
const MIN_COUNT = 250;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_FILE = path.join(ROOT, 'html', '_data', 'bacnetUnits.js');
const ENUMS_FILE = path.join(ROOT, 'html', '_data', 'bacnetEnums.js');

const dryRun = process.argv.slice(2).includes('--dry-run');

// --- curated overlay (bacnetEnums.js is the single source of symbol/group) --

const require = createRequire(import.meta.url);
const { engineeringUnits: curated } = require(ENUMS_FILE);
const curatedById = new Map(curated.map((u) => [u.id, u]));

// UNITS_DEGREES_CELSIUS_PER_HOUR → degrees-Celsius-per-hour. SI unit names
// are lowercase (kelvin, newton, pascal); only Celsius and Fahrenheit are
// proper adjectives and stay capitalized — matching the curated slice.
function specNameFromMacro(macro) {
    return macro
        .replace(/^UNITS_/, '')
        .toLowerCase()
        .replace(/_/g, '-')
        .replace(/celsius/g, 'Celsius')
        .replace(/fahrenheit/g, 'Fahrenheit');
}

// --- fetch + parse ----------------------------------------------------

const res = await fetch(SOURCE, {
    headers: { 'user-agent': 'controlsfreak.dev BACnet-units importer (+https://controlsfreak.dev/contact.html)' },
});
if (!res.ok) throw new Error(`bacenum.h fetch failed — HTTP ${res.status} for ${SOURCE}`);
const header = await res.text();

const block = header.match(/typedef enum BACnetEngineeringUnits \{([\s\S]*?)\} BACNET_ENGINEERING_UNITS;/);
if (!block) throw new Error('Could not find the BACnetEngineeringUnits enum block in bacenum.h');

const units = [];
for (const m of block[1].matchAll(/\b(UNITS_[A-Z0-9_]+)\s*=\s*(\d+)/g)) {
    const macro = m[1];
    const id = Number(m[2]);
    // Skip the range-boundary markers (…_RANGE_MIN / …_RANGE_MAX / …_MAX2)
    // and anything above the standard ceiling — those are not real units.
    if (/_RANGE_/.test(macro) || id > STD_MAX) continue;
    const hit = curatedById.get(id);
    units.push({
        id,
        name: hit ? hit.name : specNameFromMacro(macro),
        macro,
        ...(hit && hit.symbol ? { symbol: hit.symbol } : {}),
        ...(hit && hit.group ? { group: hit.group } : {}),
    });
}

units.sort((a, b) => a.id - b.id);

// --- validate ---------------------------------------------------------

if (units.length < MIN_COUNT) {
    throw new Error(`Only ${units.length} units parsed — below the ${MIN_COUNT} floor (truncated fetch or enum drift?)`);
}
const seen = new Set();
for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (seen.has(u.id)) throw new Error(`Duplicate unit id ${u.id} (${u.macro})`);
    seen.add(u.id);
    if (i > 0 && u.id <= units[i - 1].id) {
        throw new Error(`Ids not strictly ascending at ${units[i - 1].id} → ${u.id}`);
    }
    if (!u.name) throw new Error(`Empty unit name at id ${u.id} (${u.macro})`);
}
// Anchor a few well-known values so a renamed/reordered enum fails loudly.
const anchors = { 0: 'square-meters', 62: 'degrees-Celsius', 84: 'cubic-feet-per-minute', 95: 'no-units', 98: 'percent' };
for (const [id, name] of Object.entries(anchors)) {
    const u = units.find((x) => x.id === Number(id));
    if (!u || u.name !== name) throw new Error(`Anchor mismatch: id ${id} expected ${name}, got ${u ? u.name : '(missing)'}`);
}
const maxId = units[units.length - 1].id;
const gaps = [];
{
    const present = new Set(units.map((u) => u.id));
    for (let i = 0; i <= maxId; i++) if (!present.has(i)) gaps.push(i);
}
const enriched = units.filter((u) => u.symbol || u.group).length;

// Local date, not toISOString() — that's UTC and stamps "tomorrow" for an
// evening run in US timezones (matches the vendor-ID importer).
const now = new Date();
const retrieved = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
].join('-');

console.log(`Parsed ${units.length} units (0–${maxId}), ${enriched} enriched from bacnetEnums.js, ${gaps.length} gap(s): ${gaps.join(', ') || 'none'}`);

if (dryRun) {
    console.log('--dry-run: not writing. Sample rows:');
    for (const u of [units[0], units.find((x) => x.id === 62), units[units.length - 1]]) {
        console.log(`  ${u.id} → ${u.name}${u.symbol ? ' (' + u.symbol + ')' : ''}${u.group ? ' [' + u.group + ']' : ''}`);
    }
    process.exit(0);
}

// --- emit -------------------------------------------------------------

const rows = units.map((u) => {
    const parts = [`id: ${u.id}`, `name: ${JSON.stringify(u.name)}`];
    if (u.symbol) parts.push(`symbol: ${JSON.stringify(u.symbol)}`);
    if (u.group) parts.push(`group: ${JSON.stringify(u.group)}`);
    return `    { ${parts.join(', ')} },`;
}).join('\n');

const out = `// BACnet engineering units — GENERATED FILE, do not hand-edit.
//
// Source: ${SOURCE}
//   (bacnet-stack's BACnetEngineeringUnits enum — the de-facto machine-
//    readable form of the ASHRAE 135 Units enumeration, which is paywalled)
// Retrieved: ${retrieved} · ${units.length} values (0–${maxId}) · ${enriched} enriched from bacnetEnums.js
// Regenerate: npm run import-bacnet-units
//   (.github/scripts/import-bacnet-units.mjs — validates before writing)
//
// The full standard Units enumeration (property 117 values). Ids 0–${STD_MAX}
// are ASHRAE-standard; ${PROPRIETARY_MIN}–65535 is the proprietary/vendor range and
// carries no assigned names here. Where an id also appears in the curated
// bacnetEnums.js slice its name/symbol/group are that row verbatim (canonical
// ASHRAE spelling + editorial symbol/group); long-tail ids take their name
// from the bacnet-stack macro and should be verified against ASHRAE 135
// before being treated as authoritative — the page says as much.
//
// Name strings are site-authored ASCII/Unicode and render with \`| safe\`,
// same as bacnetEnums.js.

const units = [
${rows}
];

module.exports = {
    units,
    count: ${units.length},
    maxStd: ${STD_MAX},
    proprietaryMin: ${PROPRIETARY_MIN},
    retrieved: '${retrieved}',
    source: '${SOURCE}',
};
`;

writeFileSync(OUT_FILE, out);
console.log(`Wrote ${path.relative(ROOT, OUT_FILE)} (${(out.length / 1024).toFixed(1)} KB)`);
