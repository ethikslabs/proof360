#!/usr/bin/env node
// Compile the capability register (ETHL-WRK-SPEC-011 D4).
//
// AUTHORED SSOT: _working/2026-08-07-capability-register-v1.csv (workspace root).
// This script is the ONE writer of api/src/config/capability-register.json — a
// build-time projection, committed so the API never reads outside its repo.
// Re-run after editing the CSV:  node scripts/compile-register.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DEFAULT_CSV = resolve(HERE, '../../../_working/2026-08-07-capability-register-v1.csv');
const OUT = resolve(HERE, '../src/config/capability-register.json');

// Minimal RFC4180 parser — the register uses quoted fields with embedded commas.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

// Register entry → CER route (cer-routes.js). Unmapped providers shortlist under the
// general route — partner-invisible by construction (no partner id 'unrouted' exists).
function cerRoute(entry) {
  const p = entry.provider.toLowerCase();
  if (p === 'aws' || p.startsWith('aws-')) return 'ingram_micro_aws';
  if (p === 'vanta' || p === 'vanta-msp') return 'vanta';
  if (p === 'austbrokers' || entry.category === 'cyber_insurance') return 'austbrokers_cyberpro';
  if (p.startsWith('cisco')) return 'ingram_micro_cisco';
  return 'shortlist_general';
}

const csvPath = process.argv[2] || DEFAULT_CSV;
const rows = parseCsv(await readFile(csvPath, 'utf8'));

const entries = rows.map((r) => ({
  id: r.id,
  kind: r.kind,
  category: r.category,
  provider: r.provider,
  title: r.title,
  description: r.description,
  url: r.url,
  trigger: r.trigger,
  deposits: r.deposits,
  routes: r.routes,
  status: r.status,
  cer_route: cerRoute(r),
}));

const artifact = {
  compiled_from: '_working/2026-08-07-capability-register-v1.csv',
  compiled_at: new Date().toISOString(),
  entries,
};

await writeFile(OUT, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`compiled ${entries.length} entries → ${OUT}`);
const byRoute = {};
for (const e of entries) byRoute[e.cer_route] = (byRoute[e.cer_route] || 0) + 1;
console.log(JSON.stringify(byRoute, null, 2));
