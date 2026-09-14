// CANON-hx-loop R8 (14 Sept 2026): no second-person deficit reaches a founder from
// any UI string. This reads the source, comments stripped, so a new label like
// "Vendors matched to your gaps" fails here before it ships.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const DEFICIT = new RegExp([
  String.raw`\b(?:you|you've|you have)\s+(?:don'?t|do not|haven'?t|have not|lack|have no|never|aren'?t|are not|fail|cannot|can'?t|have limited)\b`,
  String.raw`\byou(?:'re| are)\s+(?:exposed|carrying)\b`,
  String.raw`\byour (?:gap|weakness|failure)s?\b`,
].join('|'), 'i');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?)$/.test(name)) out.push(p);
  }
  return out;
}
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/([^:'"\\])\/\/.*$/gm, '$1');

const ROOTS = ['src'].map((r) => join(process.cwd(), r));

describe('R8 — UI strings never mark the founder', () => {
  for (const file of ROOTS.flatMap((r) => { try { return walk(r); } catch { return []; } })) {
    it(file.replace(process.cwd() + '/', ''), () => {
      const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
      const hits = lines.map((l, i) => (DEFICIT.test(l) ? `${i + 1}: ${l.trim()}` : null)).filter(Boolean);
      expect(hits, hits.join('\n')).toEqual([]);
    });
  }
});
