// frontend/tests/unit/iframe-sandbox.test.jsx — X5 (fix/next-5-session-and-capture).
// The in-product browser frames arbitrary founder-supplied sites. allow-scripts WITH
// allow-same-origin lets a framed page run in our origin and defeat the sandbox, so
// allow-same-origin must stay off. Guarded at the source so it can't quietly return.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

// Read from the project root (vitest's cwd is frontend/); import.meta.url is an http URL under
// jsdom, so fileURLToPath can't be used here.
const chatSrc = readFileSync(resolve(process.cwd(), 'src/pages/Chat.jsx'), 'utf8');

describe('in-product browser iframe sandbox', () => {
  it('keeps allow-scripts but never allow-same-origin', () => {
    const m = chatSrc.match(/sandbox="([^"]*)"/);
    expect(m, 'an iframe sandbox attribute must be present').not.toBeNull();
    expect(m[1]).toContain('allow-scripts');
    expect(m[1]).not.toContain('allow-same-origin');
  });
});
