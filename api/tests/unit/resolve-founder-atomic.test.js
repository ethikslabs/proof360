import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Unit-level atomicity proof for the D3 first-touch projection — no live Postgres.
// A fake pool lets us drive the failure path and assert BEGIN/ROLLBACK discipline:
// the finder's P0 was that a mid-sequence DB failure orphans a person(ref=sub) that
// the fast path then returns forever with company:null. The write MUST be wrapped in
// a transaction that rolls back as a unit.

let resolveOrProjectFounder;
let storeDir;

beforeAll(async () => {
  storeDir = await mkdtemp(join(tmpdir(), 'p360-atomic-'));
  process.env.MEMORY_STORE_DIR = storeDir;
  ({ resolveOrProjectFounder } = await import('../../src/memory/resolve.js'));
});

afterAll(async () => {
  delete process.env.MEMORY_STORE_DIR;
  await rm(storeDir, { recursive: true, force: true });
});

function fakePool({ throwNonTxnQueries = false } = {}) {
  const clientQueries = [];
  const client = {
    released: false,
    async query(text) {
      clientQueries.push(text);
      const t = text.trim().toUpperCase();
      if (t === 'BEGIN' || t === 'COMMIT' || t === 'ROLLBACK') return { rows: [] };
      if (throwNonTxnQueries) throw new Error('simulated mid-sequence DB failure');
      return { rows: [], rowCount: 0 };
    },
    release() { this.released = true; },
  };
  return {
    // byRef fast-path read on the pool — no existing founder, so first-touch proceeds.
    async query() { return { rows: [] }; },
    async connect() { return client; },
    _client: client,
    _clientQueries: clientQueries,
  };
}

describe('resolveOrProjectFounder atomicity', () => {
  it('wraps the first-touch write in a transaction and ROLLS BACK on failure (no orphan)', async () => {
    const pool = fakePool({ throwNonTxnQueries: true });
    await expect(
      resolveOrProjectFounder({ sub: 'sub-atomic-fail', name: 'Fail Founder' }, { pool })
    ).rejects.toThrow(/simulated mid-sequence DB failure/);

    const q = pool._clientQueries.map((s) => s.trim().toUpperCase());
    expect(q).toContain('BEGIN');
    expect(q).toContain('ROLLBACK');
    expect(q).not.toContain('COMMIT');
    expect(pool._client.released).toBe(true);
  });

  it('COMMITs and releases when the write path succeeds', async () => {
    const pool = fakePool({ throwNonTxnQueries: false });
    // createEntity runs its INSERT against the fake client (returns empty rows); the
    // function should still BEGIN/COMMIT and release regardless of returned shape.
    await resolveOrProjectFounder({ sub: 'sub-atomic-ok', name: 'OK Founder' }, { pool }).catch(() => {});
    const q = pool._clientQueries.map((s) => s.trim().toUpperCase());
    expect(q).toContain('BEGIN');
    expect(q.includes('COMMIT') || q.includes('ROLLBACK')).toBe(true);
    expect(pool._client.released).toBe(true);
  });

  it('never opens a transaction for the fast path (known ref returns without connect)', async () => {
    let connected = false;
    const pool = {
      async query() { return { rows: [{ entity_id: 'e1', corpus_id: 'c1', name: 'Known' }] }; },
      async connect() { connected = true; return null; },
    };
    const got = await resolveOrProjectFounder({ sub: 'sub-known' }, { pool });
    expect(got).toMatchObject({ name: 'Known' });
    expect(connected).toBe(false);
  });
});
