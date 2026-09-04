import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Chat.jsx is not rendered whole in tests, so a hook that reads state declared later in
// the component body is invisible to the suite and fatal in the browser (useMemo runs
// during render; a `const` from useState is in the temporal dead zone until its line).
// This took /chat down on 2026-09-03 with "Cannot access 'qt' before initialization".
// Source-level guard, same precedent as demoFixtureCopy.test.js.
const src = readFileSync(path.resolve(fileURLToPath(import.meta.url), '../../../src/pages/Chat.jsx'), 'utf8');

function lineOf(re) {
  const i = src.search(re);
  expect(i, `pattern not found: ${re}`).toBeGreaterThan(-1);
  return src.slice(0, i).split('\n').length;
}

describe('Chat.jsx hook order — no state read before its declaration', () => {
  it('the commands memo is declared after the Record-spine state it reads', () => {
    const recordClaims = lineOf(/const \[recordClaims, setRecordClaims\]\s*=\s*useState/);
    const commandsMemo = lineOf(/const commands = useMemo\(/);
    expect(commandsMemo).toBeGreaterThan(recordClaims);
  });

  it('no useMemo/useCallback in the component reads a useState const declared later', () => {
    const lines = src.split('\n');
    const declared = new Map();
    lines.forEach((l, i) => {
      const m = l.match(/const \[([A-Za-z_$][\w$]*),\s*set[A-Za-z_$][\w$]*\]\s*=\s*useState/);
      if (m && !declared.has(m[1])) declared.set(m[1], i);
    });
    const offenders = [];
    lines.forEach((l, i) => {
      const m = l.match(/=\s*use(Memo|Callback)\(\(\)?\s*=>/);
      if (!m) return;
      let j = i;
      while (j < lines.length && !/^\s*\}, \[.*\]\);\s*$/.test(lines[j])) j++;
      const body = lines.slice(i, j + 1).join('\n');
      for (const [name, at] of declared) {
        if (at > j && new RegExp(`(?<![\\w$.])${name}(?![\\w$])`).test(body)) offenders.push(`${name} (declared L${at + 1}) read by hook at L${i + 1}`);
      }
    });
    expect(offenders).toEqual([]);
  });
});
