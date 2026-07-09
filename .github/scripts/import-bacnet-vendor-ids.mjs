// BACnet vendor-ID registry importer for controlsfreak.dev.
//
// Fetches the official ASHRAE-assigned vendor-ID registry and regenerates
// html/_data/bacnetVendorIds.js — the single data source for the
// /tools/bacnet-vendor-ids.html lookup page. The generated file is checked
// in: the site build NEVER fetches the registry; freshness is a manual
// re-run of this script (the data file's `retrieved` date is the contract).
//
// Run modes:
//   npm run import-vendor-ids              fetch, validate, rewrite the data file
//   npm run import-vendor-ids -- --dry-run fetch + validate + print stats, don't write
//
// Privacy call (deliberate): the registry lists a contact person and
// mailing address per vendor. Only the vendor ID and organization name
// are republished — the other two columns are dropped at parse time and
// never written anywhere.
//
// Robustness posture: throw loudly on anything unexpected (unknown row
// shape, unknown HTML entity, non-ascending IDs, suspiciously low count)
// rather than shipping a silently truncated or mojibake table. The
// registry markup has at least one missing </tr> in the wild (row 1500),
// so rows are split on <tr> openings, not matched as balanced pairs.

'use strict';

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SOURCE = 'https://bacnet.org/assigned-vendor-ids/';
// The seven IDs ASHRAE holds and never assigns (they appear in the
// registry as "Reserved for ASHRAE" rows). Validated against the fetch.
const RESERVED = [555, 666, 777, 888, 911, 999, 1111];
// Floor guard: the registry had 1,628 assignments on 2026-07-08 and only
// grows (IDs are never reassigned). A parse under this line means a
// truncated fetch or markup drift, not a smaller registry.
const MIN_COUNT = 1600;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_FILE = path.join(ROOT, 'html', '_data', 'bacnetVendorIds.js');

const dryRun = process.argv.slice(2).includes('--dry-run');

// --- string cleanup ---------------------------------------------------

const NAMED_ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '–', mdash: '—',
    lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
    laquo: '«', raquo: '»',
};

// Tags out, entities decoded to plain Unicode, whitespace collapsed.
// Unknown named entities throw — never ship mojibake.
function cleanCell(raw) {
    let s = raw.replace(/<[^>]*>/g, ' ');
    s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
    s = s.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
    s = s.replace(/&([a-zA-Z]+);/g, (m, name) => {
        if (!(name in NAMED_ENTITIES)) throw new Error(`Unknown HTML entity ${m} in: ${raw.slice(0, 120)}`);
        return NAMED_ENTITIES[name];
    });
    return s.replace(/\s+/g, ' ').trim();
}

// --- fetch + parse ----------------------------------------------------

const res = await fetch(SOURCE, {
    headers: { 'user-agent': 'controlsfreak.dev vendor-ID importer (+https://controlsfreak.dev/contact.html)' },
});
if (!res.ok) throw new Error(`Registry fetch failed — HTTP ${res.status} for ${SOURCE}`);
const html = await res.text();

const tables = html.match(/<table[\s\S]*?<\/table>/g);
if (!tables || tables.length !== 1) {
    throw new Error(`Expected exactly one <table> in the registry page, found ${tables ? tables.length : 0}`);
}

// Split on <tr> openings: the registry markup has at least one missing
// </tr> (row 1500 on 2026-07-08), which balanced-pair matching would
// silently merge into its neighbor, dropping a vendor.
const segments = tables[0].split(/<tr[^>]*>/).slice(1);

const vendors = [];
for (const seg of segments) {
    const row = seg.split('</tr>')[0];
    const ths = [...row.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => cleanCell(m[1]));
    if (ths.length) {
        const header = ths.join(' | ');
        if (!/Vendor ID/i.test(header)) throw new Error(`Unexpected header row: ${header}`);
        continue;
    }
    const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    if (tds.length === 0) {
        if (cleanCell(row) !== '') throw new Error(`Cell-less row with content: ${row.slice(0, 160)}`);
        continue;   // spacer row
    }
    const id = cleanCell(tds[0]);
    if (!/^\d+$/.test(id)) throw new Error(`Non-numeric vendor ID "${id}" in: ${row.slice(0, 160)}`);
    const org = cleanCell(tds[1] ?? '');
    if (tds.length === 4) {
        // id | org | contact person | address — keep the first two only.
        vendors.push({ id: Number(id), org });
    } else if (tds.length === 2 && /Reserved for ASHRAE/i.test(org)) {
        vendors.push({ id: Number(id), org: 'Reserved for ASHRAE', reserved: true });
    } else {
        throw new Error(`Unexpected row shape (${tds.length} cells): ${row.slice(0, 160)}`);
    }
}

// --- validate ---------------------------------------------------------

if (vendors.length < MIN_COUNT) {
    throw new Error(`Only ${vendors.length} vendors parsed — below the ${MIN_COUNT} floor (truncated fetch or markup drift?)`);
}
for (let i = 1; i < vendors.length; i++) {
    if (vendors[i].id <= vendors[i - 1].id) {
        throw new Error(`IDs not strictly ascending at ${vendors[i - 1].id} → ${vendors[i].id}`);
    }
}
if (vendors[0].id !== 0 || vendors[0].org !== 'ASHRAE') {
    throw new Error(`Expected id 0 = ASHRAE, got ${vendors[0].id} = ${vendors[0].org}`);
}
for (const v of vendors) {
    if (!v.org) throw new Error(`Empty organization name at id ${v.id}`);
}
const flagged = vendors.filter((v) => v.reserved).map((v) => v.id);
if (flagged.join(',') !== RESERVED.join(',')) {
    throw new Error(`Reserved-ID mismatch — expected ${RESERVED.join(',')}, parsed ${flagged.join(',')}`);
}

const maxId = vendors[vendors.length - 1].id;
// Local date, not toISOString() — that's UTC and stamps "tomorrow" for an
// evening run in US timezones, which reads as a typo in a provenance line.
const now = new Date();
const retrieved = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
].join('-');
const gaps = [];
{
    const present = new Set(vendors.map((v) => v.id));
    for (let i = 0; i <= maxId; i++) if (!present.has(i)) gaps.push(i);
}

console.log(`Parsed ${vendors.length} vendor IDs (0–${maxId}), ${flagged.length} reserved, ${gaps.length} gap(s): ${gaps.join(', ') || 'none'}`);

if (dryRun) {
    console.log('--dry-run: not writing. Sample rows:');
    for (const v of [vendors[0], vendors[1], vendors[2], vendors[vendors.length - 1]]) {
        console.log(`  ${v.id} → ${v.org}${v.reserved ? ' (reserved)' : ''}`);
    }
    process.exit(0);
}

// --- emit -------------------------------------------------------------

const rows = vendors.map((v) =>
    `    { id: ${v.id}, org: ${JSON.stringify(v.org)}${v.reserved ? ', reserved: true' : ''} },`
).join('\n');

const out = `// BACnet vendor IDs — GENERATED FILE, do not hand-edit.
//
// Source: ${SOURCE} (the official ASHRAE registry)
// Retrieved: ${retrieved} · ${vendors.length} entries · highest ID ${maxId}
// Regenerate: npm run import-vendor-ids
//   (.github/scripts/import-bacnet-vendor-ids.mjs — validates before writing)
//
// Republishes ONLY id + organization. The registry also lists a contact
// person and mailing address per vendor — deliberately dropped at import.
// IDs are assigned once and never reassigned; numbers missing from the
// sequence are withdrawn registrations, and IDs above ${maxId} postdate
// this snapshot.
//
// Org strings are entity-DECODED plain text; the lookup page renders them
// with Nunjucks autoescaping (no \`| safe\`) — the opposite of the
// site-authored bacnetEnums.js, whose strings render \`| safe\`.

const vendors = [
${rows}
];

module.exports = {
    vendors,
    // The IDs ASHRAE holds and never assigns (flagged reserved above).
    reserved: [${RESERVED.join(', ')}],
    maxId: ${maxId},
    retrieved: '${retrieved}',
    source: '${SOURCE}',
};
`;

writeFileSync(OUT_FILE, out);
console.log(`Wrote ${path.relative(ROOT, OUT_FILE)} (${(out.length / 1024).toFixed(1)} KB)`);
