#!/usr/bin/env node
// proof360 inbound trust check — `npm run check -- <file.eml>` or `node bin/check.mjs <file.eml>`
// Three lines, then the evidence table. Read-only. Under 30 seconds or it says what it couldn't check.
import { readFileSync } from 'node:fs';
import { runInboundCheck, renderCheck } from '../src/services/inbound-check/index.js';
import { liveDeps } from '../src/services/inbound-check/lookups.js';

const file = process.argv[2];
if (!file) { console.error('usage: check <file.eml>'); process.exit(2); }
const eml = readFileSync(file, 'utf8');
const started = Date.now();
const budget = setTimeout(() => { console.error('check: over the 30 s budget, stopping'); process.exit(3); }, 30_000);
try {
  const r = await runInboundCheck(eml, liveDeps());
  clearTimeout(budget);
  console.log(renderCheck(r));
  console.log(`\nchecked ${r.checked_at} · ${((Date.now() - started) / 1000).toFixed(1)} s · template ${r.memory.template_signature} · ${r.memory.prior_matches} prior`);
} catch (err) {
  clearTimeout(budget);
  console.error(`check: ${err.message}`);
  process.exit(1);
}
