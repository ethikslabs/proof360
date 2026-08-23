// Session persistence — the twin survives a restart (ETHL "simple to return to").
//
// The in-memory Map becomes a cache over a file-per-session store:
//   - create/update write through (coalesced) to SESSION_STORE_DIR/<id>.json
//   - getSession hydrates from disk on a Map miss (restart / cache eviction)
//   - retention moves to last_active_at + 30 days; the 24h TTL is now only
//     Map eviction (the file survives, return path = the session link)
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createSession,
  getSession,
  updateSession,
  persistSession,
  flushSessionsNow,
  checkStaleSessions,
  _getSessionsMap,
} from '../../src/services/session-store.js';

let dir;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'p360-sess-'));
  process.env.SESSION_STORE_DIR = dir;
  _getSessionsMap().clear();
});

function sessionPath(id) {
  return join(dir, `${id}.json`);
}

describe('write-through', () => {
  it('persists a created session to disk after flush', async () => {
    const session = createSession({ website_url: 'https://acme.example' });
    await flushSessionsNow();
    expect(existsSync(sessionPath(session.id))).toBe(true);
    const onDisk = JSON.parse(await readFile(sessionPath(session.id), 'utf8'));
    expect(onDisk.id).toBe(session.id);
    expect(onDisk.website_url).toBe('https://acme.example');
  });

  it('persists updates made through updateSession', async () => {
    const session = createSession({ website_url: 'https://acme.example' });
    updateSession(session.id, { infer_status: 'complete', company_name: 'Acme' });
    await flushSessionsNow();
    const onDisk = JSON.parse(await readFile(sessionPath(session.id), 'utf8'));
    expect(onDisk.infer_status).toBe('complete');
    expect(onDisk.company_name).toBe('Acme');
  });

  it('persistSession captures direct mutations (session-chat pattern)', async () => {
    const session = createSession({ website_url: 'https://acme.example' });
    await flushSessionsNow();
    session.chat_history = [{ role: 'user', content: 'hello', ts: 1 }];
    session.pending_confirm = 'claim-1';
    persistSession(session.id);
    await flushSessionsNow();
    const onDisk = JSON.parse(await readFile(sessionPath(session.id), 'utf8'));
    expect(onDisk.chat_history).toHaveLength(1);
    expect(onDisk.pending_confirm).toBe('claim-1');
  });

  it('refreshes last_active_at on update', async () => {
    const session = createSession({ website_url: 'https://acme.example' });
    const t0 = session.last_active_at;
    expect(typeof t0).toBe('number');
    await new Promise((r) => setTimeout(r, 5));
    updateSession(session.id, { company_name: 'Acme' });
    expect(getSession(session.id).last_active_at).toBeGreaterThan(t0);
  });
});

describe('hydration (the return path)', () => {
  it('rehydrates a session from disk after a restart', async () => {
    const session = createSession({ website_url: 'https://acme.example' });
    updateSession(session.id, {
      infer_status: 'complete',
      claim_records: [{ claim_id: 'c1', field: 'infrastructure.cloud_provider' }],
      shortlist_records: [{ primitive: 'decision', id: 'd1' }],
    });
    await flushSessionsNow();

    _getSessionsMap().clear(); // simulate process restart

    const back = getSession(session.id);
    expect(back).not.toBeNull();
    expect(back.claim_records).toHaveLength(1);
    expect(back.shortlist_records).toHaveLength(1);
    expect(_getSessionsMap().has(session.id)).toBe(true); // re-cached
  });

  it('marks an in-flight pipeline failed on hydrate (its worker died with the process)', async () => {
    const session = createSession({ website_url: 'https://acme.example' });
    // created with infer_status 'processing' by default
    await flushSessionsNow();
    _getSessionsMap().clear();

    const back = getSession(session.id);
    expect(back.infer_status).toBe('failed');
  });

  it('returns null for a corrupt file without throwing', async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'broken.json'), '{not json');
    expect(getSession('broken')).toBeNull();
  });

  it('returns null and removes the file past 30-day retention', async () => {
    const session = createSession({ website_url: 'https://acme.example' });
    await flushSessionsNow();
    // age the on-disk copy past retention
    const onDisk = JSON.parse(await readFile(sessionPath(session.id), 'utf8'));
    onDisk.last_active_at = Date.now() - 31 * 24 * 60 * 60 * 1000;
    await writeFile(sessionPath(session.id), JSON.stringify(onDisk));
    _getSessionsMap().clear();

    expect(getSession(session.id)).toBeNull();
    await flushSessionsNow(); // file removal is async — let it settle
    expect(existsSync(sessionPath(session.id))).toBe(false);
  });
});

describe('cache eviction vs retention', () => {
  it('evicts an idle session from the Map but keeps its file', async () => {
    const session = createSession({ website_url: 'https://acme.example' });
    updateSession(session.id, { infer_status: 'complete' });
    await flushSessionsNow();

    // age in-memory activity past the 24h cache TTL but inside 30d retention
    const live = _getSessionsMap().get(session.id);
    live.last_active_at = Date.now() - 25 * 60 * 60 * 1000;
    checkStaleSessions();

    expect(_getSessionsMap().has(session.id)).toBe(false);
    expect(existsSync(sessionPath(session.id))).toBe(true);
    // and the return path still works
    const back = getSession(session.id);
    expect(back).not.toBeNull();
    expect(back.website_url).toBe('https://acme.example');
  });

  it('deletes Map entry AND file past 30-day retention', async () => {
    const session = createSession({ website_url: 'https://acme.example' });
    updateSession(session.id, { infer_status: 'complete' });
    await flushSessionsNow();

    const live = _getSessionsMap().get(session.id);
    live.last_active_at = Date.now() - 31 * 24 * 60 * 60 * 1000;
    checkStaleSessions();
    await flushSessionsNow(); // let the async file delete settle

    expect(_getSessionsMap().has(session.id)).toBe(false);
    expect(existsSync(sessionPath(session.id))).toBe(false);
  });
});
