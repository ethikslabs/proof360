// test-log.js — No test suite. Writes placeholder to /Projects/logs/test-results/proof360.json
// ESM · No external dependencies

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const outDir = resolve(projectRoot, '..', '..', 'logs', 'test-results');
const outFile = resolve(outDir, 'proof360.json');

const payload = {
  project: 'proof360',
  timestamp: new Date().toISOString(),
  status: 'unknown',
  pass: 0,
  fail: 0,
  skip: 0,
  duration_ms: 0,
  runner: 'none',
  branch: 'unknown',
  commit: 'unknown',
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(payload, null, 2) + '\n');

console.log(`\n✔ wrote ${outFile}`);
console.log(JSON.stringify(payload, null, 2));
