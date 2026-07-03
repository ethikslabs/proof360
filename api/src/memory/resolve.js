// Real founder -> atom resolution (D3, ruled Option A 2026-07-03).
// The journey/CER identity is an entity with ref == authUser.sub. The demo founder got one
// from the seed; real founders get one HERE, lazily, on first authenticated touch:
//   fast path  — entity with this ref exists -> return it, create nothing.
//   first touch— project the founder's existing file-kernel profile into atoms via the
//                tested migrateProfile() when it holds a company_name claim; otherwise
//                create the person entity only. No fabricated company names — an empty
//                kernel yields founder + company:null, honestly.
// Idempotency: the ref lookup is the guard; entity.ref is UNIQUE (native, 001_engine.sql),
// so a concurrent first-touch race loses loudly on INSERT and the loser re-reads the fast
// path. The whole first-touch projection runs in one transaction so a partial failure never
// strands an orphan person(ref=sub).
import pool from './db.js';
import { migrateProfile } from './migrate.js';
import { createEntity } from './nodes.js';
import {
  getOrCreateFounder,
  getOrCreateActiveProfile,
  replayProfile,
} from '../services/memory-store-file.js';

const UNIQUE_VIOLATION = '23505';

async function byRef(sub, client) {
  const { rows } = await client.query(
    `SELECT entity_id, corpus_id, name FROM entity WHERE ref = $1 AND type = 'person' LIMIT 1`,
    [sub]);
  return rows[0] || null;
}

export async function resolveOrProjectFounder(authUser, { pool: poolArg = pool } = {}) {
  const sub = authUser?.sub;
  if (!sub) return null;

  // Fast path — a known ref returns without opening a transaction.
  const existing = await byRef(sub, poolArg);
  if (existing) return existing;

  // First authenticated touch: read the founder's file-kernel history. This is file
  // IO (the kernel is the source of truth), done BEFORE we take a DB connection.
  const founder = await getOrCreateFounder(authUser);
  const profile = await getOrCreateActiveProfile(founder);
  const snapshot = await replayProfile(profile.id);

  const founderName = founder.name || founder.email || sub;
  const companyName = snapshot?.current_claims?.company_name?.value || null;

  // The projection writes person + company + founded-edge + claims. These MUST commit
  // as a unit: a mid-sequence failure (connection drop, pool timeout, PM2 restart) would
  // otherwise leave an orphan person(ref=sub) that the fast path returns forever with
  // company:null, and no path re-projects it. Wrap the whole write in one transaction.
  const client = await poolArg.connect();
  try {
    await client.query('BEGIN');
    let result;
    if (companyName) {
      const { person } = await migrateProfile(
        snapshot, { founderName, companyName, founderRef: sub }, client);
      result = { entity_id: person.entity_id, corpus_id: person.corpus_id, name: founderName };
    } else {
      const person = await createEntity(
        { type: 'person', name: founderName, ref: sub, access_layer: 'authenticated_customer_portal' },
        client);
      result = { entity_id: person.entity_id, corpus_id: person.corpus_id, name: founderName };
    }
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    // Concurrent first touch: the unique index on entity.ref made us lose the race.
    // Because the winner committed its whole projection atomically before our INSERT
    // saw the conflict, re-reading the fast path now returns a fully-formed founder
    // (person AND company), not a half-built one.
    if (err?.code === UNIQUE_VIOLATION) return byRef(sub, poolArg);
    throw err;
  } finally {
    client.release();
  }
}
