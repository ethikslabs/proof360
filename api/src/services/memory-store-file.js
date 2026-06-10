import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const STORE_VERSION = 'founder-memory-file-v1';
const LOCK_TIMEOUT_MS = 5000;
const LOCK_RETRY_MS = 25;

export const memoryStoreRoot =
  process.env.MEMORY_STORE_DIR ||
  join(homedir(), '.ethikslabs', 'proof360', 'memory');

function nowIso() {
  return new Date().toISOString();
}

function founderHash(auth0Sub) {
  return createHash('sha256').update(String(auth0Sub)).digest('hex').slice(0, 32);
}

function founderDir(hash) {
  return join(memoryStoreRoot, 'founders', hash);
}

function activeProfilePath(hash) {
  return join(founderDir(hash), 'active-profile.json');
}

function profileDir(hash, profileId) {
  return join(founderDir(hash), 'profiles', profileId);
}

function sessionBindingPath(sessionId) {
  return join(memoryStoreRoot, 'session-bindings', `${sessionId}.json`);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fsyncFile(path) {
  const handle = await open(path, 'r');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function fsyncDir(path) {
  let handle;
  try {
    handle = await open(path, 'r');
    await handle.sync();
  } catch {
    // Some filesystems do not allow opening directories. Atomic rename still
    // protects readers from partial files; directory fsync is best-effort.
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const body = `${JSON.stringify(value, null, 2)}\n`;
  let handle;
  try {
    handle = await open(tmp, 'wx');
    await handle.writeFile(body, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(tmp, path);
    await fsyncDir(dirname(path));
  } catch (err) {
    await handle?.close().catch(() => {});
    await rm(tmp, { force: true }).catch(() => {});
    throw err;
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function withLock(lockPath, fn) {
  const started = Date.now();
  await mkdir(dirname(lockPath), { recursive: true });

  while (true) {
    try {
      await mkdir(lockPath);
      await writeFile(join(lockPath, 'owner.json'), JSON.stringify({
        pid: process.pid,
        created_at: nowIso(),
      }));
      break;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      if (Date.now() - started > LOCK_TIMEOUT_MS) {
        throw new Error(`memory_lock_timeout:${lockPath}`);
      }
      await sleep(LOCK_RETRY_MS);
    }
  }

  try {
    return await fn();
  } finally {
    await rm(lockPath, { recursive: true, force: true });
  }
}

async function ensureProfileDirs(hash, profileId) {
  const base = profileDir(hash, profileId);
  await mkdir(join(base, 'transactions'), { recursive: true });
  await mkdir(join(base, 'snapshots'), { recursive: true });
  await mkdir(join(base, 'locks'), { recursive: true });
  return base;
}

function normalizeAuthUser(authUser) {
  const auth0Sub = authUser?.sub || authUser?.auth0_sub;
  if (!auth0Sub) {
    throw new Error('auth_user_sub_required');
  }
  return {
    auth0_sub: auth0Sub,
    email: authUser.email || null,
    name: authUser.name || authUser.nickname || null,
  };
}

export async function getOrCreateFounder(authUser) {
  const normalized = normalizeAuthUser(authUser);
  const hash = founderHash(normalized.auth0_sub);
  const dir = founderDir(hash);
  const path = join(dir, 'founder.json');

  if (existsSync(path)) {
    const existing = await readJson(path);
    const updated = {
      ...existing,
      email: normalized.email || existing.email || null,
      name: normalized.name || existing.name || null,
      last_seen_at: nowIso(),
    };
    await writeJsonAtomic(path, updated);
    return updated;
  }

  await mkdir(dir, { recursive: true });
  const founder = {
    store_version: STORE_VERSION,
    id: randomUUID(),
    founder_hash: hash,
    auth0_sub: normalized.auth0_sub,
    email: normalized.email,
    name: normalized.name,
    created_at: nowIso(),
    last_seen_at: nowIso(),
  };
  await writeJsonAtomic(path, founder);
  return founder;
}

export async function getOrCreateActiveProfile(founder) {
  const hash = founder.founder_hash;
  const path = activeProfilePath(hash);
  if (existsSync(path)) {
    return readJson(path);
  }

  const profileId = randomUUID();
  const base = await ensureProfileDirs(hash, profileId);
  const profile = {
    store_version: STORE_VERSION,
    id: profileId,
    founder_id: founder.id,
    founder_hash: hash,
    name: null,
    status: 'active',
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  await writeJsonAtomic(join(base, 'manifest.json'), profile);
  await writeJsonAtomic(path, profile);
  return profile;
}

async function resolveProfile(profileId) {
  const foundersRoot = join(memoryStoreRoot, 'founders');
  const founderHashes = await readdir(foundersRoot).catch(() => []);
  for (const hash of founderHashes) {
    const candidate = profileDir(hash, profileId);
    if (existsSync(join(candidate, 'manifest.json'))) {
      return { hash, dir: candidate, manifest: await readJson(join(candidate, 'manifest.json')) };
    }
  }
  throw new Error(`profile_not_found:${profileId}`);
}

function normalizeRecord(record, txMeta) {
  if (!record?.primitive) throw new Error('record_primitive_required');
  if (!record.source) throw new Error('record_source_required');
  return {
    id: record.id || randomUUID(),
    created_at: record.created_at || txMeta.created_at,
    ...record,
  };
}

async function nextTransactionName(transactionsDir) {
  const files = (await readdir(transactionsDir).catch(() => []))
    .filter((name) => /^\d{6}-.+\.json$/.test(name))
    .sort();
  const last = files.at(-1);
  const seq = last ? Number(last.slice(0, 6)) + 1 : 1;
  return String(seq).padStart(6, '0');
}

export async function appendTransaction(profileId, records, metadata = {}) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('transaction_records_required');
  }

  const resolved = await resolveProfile(profileId);
  await ensureProfileDirs(resolved.hash, profileId);
  const txId = randomUUID();
  const createdAt = nowIso();
  const txMeta = {
    tx_id: txId,
    profile_id: profileId,
    created_at: createdAt,
    source: metadata.source || 'founder',
  };
  const transaction = {
    store_version: STORE_VERSION,
    ...txMeta,
    metadata,
    records: records.map((record) => normalizeRecord(record, txMeta)),
  };

  return withLock(join(resolved.dir, 'locks', 'profile.lock'), async () => {
    const seq = await nextTransactionName(join(resolved.dir, 'transactions'));
    const path = join(resolved.dir, 'transactions', `${seq}-${txId}.json`);
    await writeJsonAtomic(path, transaction);
    await writeSnapshot(profileId);
    return { ...transaction, path, sequence: Number(seq) };
  });
}

function applyClaim(currentClaims, claim) {
  const field = claim.field;
  if (!field) return;
  const existing = currentClaims[field];

  if (claim.state === 'retracted') {
    if (existing?.id === claim.retracts) delete currentClaims[field];
    return;
  }

  if (claim.state === 'superseded') return;

  if (existing?.actor === 'founder' && claim.actor !== 'founder') {
    return;
  }
  currentClaims[field] = claim;
}

function reconstruct(profile, transactions) {
  const events = [];
  const evidence = [];
  const observations = [];
  const claims = [];
  const current_claims = {};

  for (const transaction of transactions) {
    for (const record of transaction.records || []) {
      if (record.primitive === 'event') events.push(record);
      if (record.primitive === 'evidence') evidence.push(record);
      if (record.primitive === 'observation') observations.push(record);
      if (record.primitive === 'claim') {
        claims.push(record);
        applyClaim(current_claims, record);
      }
    }
  }

  return {
    store_version: STORE_VERSION,
    profile,
    reconstructed_at: nowIso(),
    transactions: transactions.map(({ tx_id, created_at, source, metadata }) => ({ tx_id, created_at, source, metadata })),
    events,
    evidence,
    observations,
    claims,
    current_claims,
  };
}

export async function replayProfile(profileId) {
  const resolved = await resolveProfile(profileId);
  const txDir = join(resolved.dir, 'transactions');
  const files = (await readdir(txDir).catch(() => []))
    .filter((name) => /^\d{6}-.+\.json$/.test(name))
    .sort();
  const transactions = [];
  for (const file of files) {
    transactions.push(await readJson(join(txDir, file)));
  }
  return reconstruct(resolved.manifest, transactions);
}

export async function writeSnapshot(profileId) {
  const resolved = await resolveProfile(profileId);
  const snapshot = await replayProfile(profileId);
  await writeJsonAtomic(join(resolved.dir, 'snapshots', 'current.json'), snapshot);
  return snapshot;
}

export async function claimSessionForProfile(profile, sessionId) {
  const bindingPath = sessionBindingPath(sessionId);
  const lockPath = join(memoryStoreRoot, 'session-bindings', 'locks', `${sessionId}.lock`);
  return withLock(lockPath, async () => {
    if (existsSync(bindingPath)) {
      const binding = await readJson(bindingPath);
      if (binding.profile_id !== profile.id || binding.founder_hash !== profile.founder_hash) {
        const err = new Error('session_already_attached');
        err.code = 'SESSION_ALREADY_ATTACHED';
        err.binding = binding;
        throw err;
      }
      return { binding, already_attached: true };
    }

    const binding = {
      store_version: STORE_VERSION,
      session_id: sessionId,
      profile_id: profile.id,
      founder_hash: profile.founder_hash,
      created_at: nowIso(),
    };
    await writeJsonAtomic(bindingPath, binding);
    return { binding, already_attached: false };
  });
}

export async function storeStats() {
  const rootStat = await stat(memoryStoreRoot).catch(() => null);
  return {
    root: memoryStoreRoot,
    exists: Boolean(rootStat),
  };
}

export const _internals = {
  founderHash,
  readJson,
  writeJsonAtomic,
  withLock,
  reconstruct,
};
