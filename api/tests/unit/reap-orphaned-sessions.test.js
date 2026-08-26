// A restart orphans every in-flight read, permanently.
//
// Found 2026-08-26 after John's cold read failed three times — fresh tab, then
// incognito — while the API answered 200 through the public edge every time. The
// cause was a deploy landing mid-scan:
//
//   deploy.yml runs `pm2 delete proof360` then `pm2 start`, so the process is
//   REPLACED. `sessions` is a `new Map()` and extractAndInfer is fire-and-forget
//   inside the old process, so the scan dies with it. getSession rehydrates the
//   RECORD from disk — which is why "kill the server and bring it back" genuinely
//   works for a finished session — but nothing resumes the WORK. The record comes
//   back on infer_status:'processing' and stays there forever.
//
// checkStaleSessions should have caught it. It can't: it iterates the in-memory
// Map, and after a restart the Map is empty. The watchdog is blind to exactly the
// sessions the restart orphaned. So the browser polls 60 x 2.5s and throws at
// 150 seconds, and the founder is told to check a URL that was never wrong.
//
// A fresh process cannot have work in flight, by definition. So at boot, any
// persisted session still marked 'processing' is provably orphaned and must be
// failed honestly rather than left to hang.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('../../src/services/pulse-emitter.js', () => ({ emitPulse: vi.fn() }));
vi.mock('../../src/db/pool.js', () => ({ query: vi.fn() }));

let dir;

function writeSession(id, patch = {}) {
  const session = {
    id,
    website_url: 'https://cognisys.co.uk',
    infer_status: 'processing',
    infer_started_at: Date.now() - 5000,
    analysis_status: 'idle',
    created_at: Date.now() - 5000,
    last_active_at: Date.now() - 5000,
    ...patch,
  };
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(session), 'utf8');
  return session;
}

function readSession(id) {
  return JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8'));
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'p360-sessions-'));
  process.env.SESSION_STORE_DIR = dir;
  vi.resetModules();
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.SESSION_STORE_DIR;
});

describe('reapOrphanedSessions — a fresh process has nothing in flight', () => {
  it('fails a session left mid-scan by a restart', async () => {
    writeSession('sess-orphan');
    const { reapOrphanedSessions } = await import('../../src/services/session-store.js');

    const result = reapOrphanedSessions();

    expect(result.reaped).toBe(1);
    expect(readSession('sess-orphan').infer_status).toBe('failed');
  });

  it('says WHY it failed, so the record does not read as a scan that found nothing', async () => {
    writeSession('sess-orphan');
    const { reapOrphanedSessions } = await import('../../src/services/session-store.js');

    reapOrphanedSessions();

    const s = readSession('sess-orphan');
    expect(s.infer_failure_reason).toMatch(/restart|interrupted/i);
  });

  it('reaps a session stuck mid-analysis too', async () => {
    writeSession('sess-analysis', {
      infer_status: 'complete',
      analysis_status: 'processing',
      analysis_started_at: Date.now() - 5000,
    });
    const { reapOrphanedSessions } = await import('../../src/services/session-store.js');

    expect(reapOrphanedSessions().reaped).toBe(1);
    expect(readSession('sess-analysis').analysis_status).toBe('failed');
  });

  it('leaves a completed session untouched — the restart-survival beat must keep working', async () => {
    writeSession('sess-done', {
      infer_status: 'complete',
      analysis_status: 'complete',
      trust_score: 25,
    });
    const { reapOrphanedSessions } = await import('../../src/services/session-store.js');

    expect(reapOrphanedSessions().reaped).toBe(0);
    const s = readSession('sess-done');
    expect(s.infer_status).toBe('complete');
    expect(s.trust_score).toBe(25);
  });

  it('leaves an already-failed session alone rather than re-reaping it', async () => {
    writeSession('sess-failed', { infer_status: 'failed' });
    const { reapOrphanedSessions } = await import('../../src/services/session-store.js');
    expect(reapOrphanedSessions().reaped).toBe(0);
  });

  it('survives a corrupt session file instead of taking the boot down with it', async () => {
    writeFileSync(join(dir, 'sess-corrupt.json'), '{not json', 'utf8');
    writeSession('sess-orphan');
    const { reapOrphanedSessions } = await import('../../src/services/session-store.js');

    const result = reapOrphanedSessions();

    expect(result.reaped).toBe(1);
    expect(result.unreadable).toBe(1);
    // The corrupt file is left where it is — never deleted on a guess.
    expect(readdirSync(dir)).toContain('sess-corrupt.json');
  });

  it('is a no-op when the store directory does not exist yet (first boot)', async () => {
    process.env.SESSION_STORE_DIR = join(dir, 'nope');
    const { reapOrphanedSessions } = await import('../../src/services/session-store.js');
    expect(() => reapOrphanedSessions()).not.toThrow();
    expect(reapOrphanedSessions().reaped).toBe(0);
  });
});
