#!/usr/bin/env node
// Projects the ratified Capital Rosetta register (markdown, the truth) into
// src/data/capital-register.json (a derived file, committed with the source hash so a
// stale projection is detectable). Re-run whenever the register changes:
//   node scripts/project-register.mjs [path-to-register.md]
// Derive, don't author: nothing is added here; records that fail validation stop the run.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRegister } from '../src/utils/capitalRegister.js';
import { validateInstrument } from '../src/utils/capitalJoin.js';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(process.argv[2] || resolve(here, '../../../_working/2026-08-28-capital-rosetta-register.md'));
const out = resolve(here, '../src/data/capital-register.json');

const md = readFileSync(src, 'utf8');
const records = parseRegister(md);
const problems = records.map((r) => [r.id, validateInstrument(r)]).filter(([, v]) => !v.ok);
if (problems.length) {
  for (const [id, v] of problems) console.error(`✗ ${id}: ${v.errors.join(', ')}`);
  process.exit(1);
}
const rumours = records.filter((r) => !r.evidence.last_verified).map((r) => r.id);
const notes = records.filter((r) => r.irrelevant_notes.length).map((r) => `${r.id}: ${r.irrelevant_notes.join(' · ')}`);

writeFileSync(out, JSON.stringify({
  source: 'capital-rosetta-register.md',
  source_sha256: createHash('sha256').update(md).digest('hex'),
  projected_at: new Date().toISOString(),
  record_count: records.length,
  unverified: rumours,
  records,
}, null, 2) + '\n');

console.log(`${records.length} records → ${out}`);
if (rumours.length) console.log(`no last_verified (rumours by the schema's own rule): ${rumours.length}\n  ${rumours.join(', ')}`);
if (notes.length) console.log(`irrelevant entries the schema has no notation for:\n  ${notes.join('\n  ')}`);
