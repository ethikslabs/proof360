import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const SCAN_ROOTS = ['src', 'scripts'];
const EXTRA_FILES = ['package.json', 'vitest.config.js'];
const FORBIDDEN = [
  /\bVECTOR_URL\b/,
  /http:\/\/localhost:3003/,
  /localhost:3003\/v1/,
];

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full));
    if (entry.isFile() && /\.(js|mjs|cjs|json)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function stripJsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('inference direct guard', () => {
  it('keeps live proof360 API code/config off VECTOR and localhost:3003', async () => {
    const files = [
      ...(await Promise.all(SCAN_ROOTS.map((dir) => listFiles(join(ROOT, dir))))).flat(),
      ...EXTRA_FILES.map((file) => join(ROOT, file)),
    ];

    const offenders = [];
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      const executableText = file.endsWith('.json') ? source : stripJsComments(source);
      for (const pattern of FORBIDDEN) {
        if (pattern.test(executableText)) {
          offenders.push(`${relative(ROOT, file)} matched ${pattern}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
