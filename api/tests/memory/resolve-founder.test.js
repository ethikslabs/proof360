import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pool, reachable } from './_setup.js';

// resolveOrProjectFounder imports the file-kernel store, which reads MEMORY_STORE_DIR at call
// time — point it at a scratch dir BEFORE importing the module under test.
let resolveOrProjectFounder;
let migrateProfile;
let createEntity;
let getOrCreateFounder;
let getOrCreateActiveProfile;
let appendTransaction;

beforeAll(async () => {
  process.env.MEMORY_STORE_DIR = await mkdtemp(join(tmpdir(), 'p360-resolve-'));
  ({ resolveOrProjectFounder } = await import('../../src/memory/resolve.js'));
  ({ migrateProfile } = await import('../../src/memory/migrate.js'));
  ({ createEntity } = await import('../../src/memory/nodes.js'));
  ({ getOrCreateFounder, getOrCreateActiveProfile, appendTransaction } =
    await import('../../src/services/memory-store-file.js'));
  // Schema reset + migrations happen ONCE in tests/memory/global-setup.js — suites never reset
  // (parallel workers would deadlock on DROP SCHEMA). This suite only inserts unique rows.
});

afterAll(async () => { await pool.end(); });

const count = async (sql, params = []) =>
  Number((await pool.query(sql, params)).rows[0].count);

describe.skipIf(!reachable)('resolveOrProjectFounder', () => {
  // NOTE: parallel suites share the test DB (globalSetup resets once) — every assertion is
  // scoped to this suite's own refs/names, never a global COUNT(*).
  it('fast path: returns the existing entity for a known ref without creating anything', async () => {
    await createEntity({ type: 'person', name: 'Existing Founder', ref: 'sub-existing' });
    const got = await resolveOrProjectFounder({ sub: 'sub-existing', name: 'Existing Founder' });
    expect(got?.name).toBe('Existing Founder');
    expect(await count(`SELECT COUNT(*) FROM entity WHERE ref = $1`, ['sub-existing'])).toBe(1);
    expect(await count(`SELECT COUNT(*) FROM entity WHERE name = 'Existing Founder'`)).toBe(1);
  });

  it('first touch with a kernel company claim projects person+company+claims, ref = sub', async () => {
    const authUser = { sub: 'sub-kernel', email: 'k@x.io', name: 'Kernel Founder' };
    const founder = await getOrCreateFounder(authUser);
    const profile = await getOrCreateActiveProfile(founder);
    await appendTransaction(profile.id, [
      { primitive: 'claim', field: 'company_name', value: 'Kernelworks', actor: 'founder', source: 'founder', state: 'believed' },
    ], { route: 'test', source: 'test' });

    const got = await resolveOrProjectFounder(authUser);
    expect(got).toBeTruthy();

    const { rows: [person] } = await pool.query(
      `SELECT entity_id, name FROM entity WHERE ref = $1 AND type = 'person'`, ['sub-kernel']);
    expect(person.name).toBe('Kernel Founder');
    const companies = await count(
      `SELECT COUNT(*) FROM entity WHERE type = 'company' AND name = 'Kernelworks'`);
    expect(companies).toBe(1);
  });

  it('first touch with an empty kernel creates the person only — no fabricated company', async () => {
    const authUser = { sub: 'sub-empty', email: 'e@x.io', name: 'Empty Founder' };
    const got = await resolveOrProjectFounder(authUser);
    expect(got).toBeTruthy();
    const { rows: [person] } = await pool.query(
      `SELECT name FROM entity WHERE ref = $1`, ['sub-empty']);
    expect(person.name).toBe('Empty Founder');
    // No company was fabricated for this founder: no 'founded' edge from their corpus_id.
    expect(await count(
      `SELECT COUNT(*) FROM relationship r JOIN entity e ON e.corpus_id = r.from_id
       WHERE e.ref = $1 AND r.kind = 'founded'`, ['sub-empty'])).toBe(0);
  });

  it('second call for the same sub is a no-op (idempotent via ref)', async () => {
    const authUser = { sub: 'sub-twice', email: 't@x.io', name: 'Twice Founder' };
    await resolveOrProjectFounder(authUser);
    await resolveOrProjectFounder(authUser);
    expect(await count(`SELECT COUNT(*) FROM entity WHERE ref = $1`, ['sub-twice'])).toBe(1);
    expect(await count(`SELECT COUNT(*) FROM entity WHERE name = 'Twice Founder'`)).toBe(1);
  });

  it('returns null for an unauthenticated caller', async () => {
    expect(await resolveOrProjectFounder(null)).toBeNull();
    expect(await resolveOrProjectFounder({})).toBeNull();
  });
});

describe.skipIf(!reachable)('migrateProfile founderRef passthrough + ref uniqueness', () => {
  it('stamps founderRef onto the person entity when given', async () => {
    const { person } = await migrateProfile(
      { current_claims: { company_name: { value: 'Refco', actor: 'founder' } } },
      { founderName: 'Ref Person', companyName: 'Refco', founderRef: 'sub-ref-stamp' });
    const { rows: [row] } = await pool.query(
      `SELECT ref FROM entity WHERE entity_id = $1`, [person.entity_id]);
    expect(row.ref).toBe('sub-ref-stamp');
  });

  it('leaves ref null for existing callers (no founderRef)', async () => {
    const { person } = await migrateProfile(
      { current_claims: {} },
      { founderName: 'Legacy Person', companyName: 'Legacyco' });
    const { rows: [row] } = await pool.query(
      `SELECT ref FROM entity WHERE entity_id = $1`, [person.entity_id]);
    expect(row.ref).toBeNull();
  });

  it('a duplicate non-null ref is rejected by the engine (001: entity.ref UNIQUE)', async () => {
    await createEntity({ type: 'person', name: 'First', ref: 'sub-dupe' });
    await expect(createEntity({ type: 'person', name: 'Second', ref: 'sub-dupe' }))
      .rejects.toThrow();
  });
});
