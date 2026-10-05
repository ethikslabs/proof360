// api/tests/unit/session-id-hardening.test.js — X5 (fix/next-5-session-and-capture).
// Session ids are used to build file paths. A client-supplied id that isn't a UUID — a
// traversal fragment, a slash, "" — must never reach the filesystem, on read, write OR delete.
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  isValidSessionId, createSession, getSession, deleteSession,
  persistSession, flushSessionsNow, _getSessionsMap,
} from '../../src/services/session-store.js';

let dir;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'p360-idguard-'));
  process.env.SESSION_STORE_DIR = dir;
  _getSessionsMap().clear();
});

const TRAVERSAL = ['../etc/passwd', '..', 'a/b', 'x.json', '', '  ', 'not-a-uuid', '../../../../tmp/x', 'id/../../escape'];

describe('isValidSessionId', () => {
  it('accepts a UUID and rejects everything else', () => {
    expect(isValidSessionId('11111111-2222-4333-8444-555555555555')).toBe(true);
    for (const bad of [...TRAVERSAL, null, undefined, 42, {}]) {
      expect(isValidSessionId(bad)).toBe(false);
    }
  });
});

describe('read / write / delete reject a non-UUID id', () => {
  it('getSession returns null for a traversal id and never reads a file', () => {
    for (const bad of TRAVERSAL) expect(getSession(bad)).toBeNull();
  });

  it('createSession throws on a seeded non-UUID id (no file written)', async () => {
    for (const bad of TRAVERSAL.filter((x) => x.trim() !== '')) {
      expect(() => createSession({ id: bad, website_url: 'https://x.example' })).toThrow(/invalid session id/);
    }
    await flushSessionsNow();
    expect(readdirSync(dir)).toEqual([]); // nothing landed on disk
  });

  it('deleteSession on a traversal id is a no-op, never a filesystem delete', () => {
    expect(() => deleteSession('../../etc/passwd')).not.toThrow();
  });

  it('a normal (generated) session still round-trips through the store', async () => {
    const s = createSession({ website_url: 'https://acme.example' });
    expect(isValidSessionId(s.id)).toBe(true);
    persistSession(s.id);
    await flushSessionsNow();
    expect(existsSync(join(dir, `${s.id}.json`))).toBe(true);
    _getSessionsMap().clear();
    expect(getSession(s.id)?.id).toBe(s.id); // hydrates from disk
  });
});
