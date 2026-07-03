import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let root;
let store;

async function loadStore() {
  vi.resetModules();
  process.env.MEMORY_STORE_DIR = root;
  store = await import('../../src/services/memory-store-file.js');
}

async function founderAndProfile(sub = 'auth0|founder') {
  const founder = await store.getOrCreateFounder({ sub, email: `${sub}@example.com` });
  const profile = await store.getOrCreateActiveProfile(founder);
  return { founder, profile };
}

describe('file-backed founder memory store', () => {
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'proof360-memory-'));
    await loadStore();
  });

  afterEach(async () => {
    delete process.env.MEMORY_STORE_DIR;
    await rm(root, { recursive: true, force: true });
  });

  it('creates one active profile per founder and stores it outside the repo path', async () => {
    const { founder, profile } = await founderAndProfile();
    const again = await store.getOrCreateActiveProfile(founder);

    expect(profile.id).toBe(again.id);
    expect(store.memoryStoreRoot).toBe(root);

    const founderFile = JSON.parse(await readFile(join(root, 'founders', founder.founder_hash, 'founder.json'), 'utf8'));
    expect(founderFile.auth0_sub).toBe('auth0|founder');
  });

  it('appends immutable transactions and reconstructs current claims from replay', async () => {
    const { profile } = await founderAndProfile();

    await store.appendTransaction(profile.id, [
      { primitive: 'event', source: 'chat', kind: 'chat', content: { message: 'We are seed stage.' } },
      { primitive: 'claim', source: 'founder', field: 'stage', value: 'Seed', actor: 'founder', state: 'believed' },
    ], { source: 'founder' });

    await store.appendTransaction(profile.id, [
      { primitive: 'claim', source: 'cold_read', field: 'stage', value: 'Pre-seed', actor: 'system', state: 'believed' },
      { primitive: 'claim', source: 'cold_read', field: 'sector', value: 'SaaS', actor: 'system', state: 'believed' },
    ], { source: 'cold_read' });

    const snapshot = await store.replayProfile(profile.id);
    expect(snapshot.transactions).toHaveLength(2);
    expect(snapshot.current_claims.stage.value).toBe('Seed');
    expect(snapshot.current_claims.stage.actor).toBe('founder');
    expect(snapshot.current_claims.sector.value).toBe('SaaS');

    const txDir = join(root, 'founders', profile.founder_hash, 'profiles', profile.id, 'transactions');
    expect(await readdir(txDir)).toEqual(expect.arrayContaining([
      expect.stringMatching(/^000001-.+\.json$/),
      expect.stringMatching(/^000002-.+\.json$/),
    ]));
  });

  it('serializes concurrent appends with one profile lock', async () => {
    const { profile } = await founderAndProfile();
    await Promise.all(Array.from({ length: 5 }, (_, index) =>
      store.appendTransaction(profile.id, [
        { primitive: 'event', source: 'chat', kind: 'chat', content: { index } },
      ], { source: 'chat' })
    ));

    const txDir = join(root, 'founders', profile.founder_hash, 'profiles', profile.id, 'transactions');
    expect((await readdir(txDir)).sort().map((name) => name.slice(0, 6))).toEqual([
      '000001', '000002', '000003', '000004', '000005',
    ]);
  });

  it('binds a session to one profile only', async () => {
    const { profile } = await founderAndProfile('auth0|one');
    const { profile: other } = await founderAndProfile('auth0|two');

    await store.claimSessionForProfile(profile, 'session-1');
    await expect(store.claimSessionForProfile(profile, 'session-1')).resolves.toMatchObject({ already_attached: true });
    await expect(store.claimSessionForProfile(other, 'session-1')).rejects.toMatchObject({
      code: 'SESSION_ALREADY_ATTACHED',
    });
  });

  // MEMFILE-RACE-001 (a): concurrent first-touch must not mint duplicate profiles/founders.
  it('mints exactly one profile under concurrent first-touch', async () => {
    const founder = await store.getOrCreateFounder({ sub: 'auth0|race-profile' });
    const results = await Promise.all(
      Array.from({ length: 5 }, () => store.getOrCreateActiveProfile(founder))
    );
    expect(new Set(results.map((p) => p.id)).size).toBe(1);

    // Only one profile directory should exist — no orphaned loser dirs holding lost txns.
    const profilesDir = join(root, 'founders', founder.founder_hash, 'profiles');
    expect(await readdir(profilesDir)).toHaveLength(1);
  });

  it('mints exactly one founder under concurrent first-touch (same auth0 sub)', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => store.getOrCreateFounder({ sub: 'auth0|race-founder' }))
    );
    expect(new Set(results.map((f) => f.id)).size).toBe(1);
  });

  // MEMFILE-RACE-001 (b): a crashed holder's lock must self-heal, not wedge the profile forever.
  it('steals a stale lock instead of wedging the profile permanently', async () => {
    const lockPath = join(root, 'wedge-test', 'profile.lock');
    await mkdir(lockPath, { recursive: true });
    await writeFile(join(lockPath, 'owner.json'), JSON.stringify({
      pid: 999999,
      created_at: new Date(Date.now() - 3600_000).toISOString(), // crashed an hour ago
    }));

    await expect(store._internals.withLock(lockPath, async () => 'recovered')).resolves.toBe('recovered');
  });
});
