// Real founder -> atom resolution (D3, ruled Option A 2026-07-03).
// The journey/CER identity is an entity with ref == authUser.sub. The demo founder got one
// from the seed; real founders get one HERE, lazily, on first authenticated touch:
//   fast path  — entity with this ref exists -> return it, create nothing.
//   first touch— project the founder's existing file-kernel profile into atoms via the
//                tested migrateProfile() when it holds a company_name claim; otherwise
//                create the person entity only. No fabricated company names — an empty
//                kernel yields founder + company:null, honestly.
// Idempotency: the ref lookup is the guard; migration 004's partial unique index makes a
// concurrent first-touch race lose loudly, and the loser re-reads the fast path.
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

export async function resolveOrProjectFounder(authUser, client = pool) {
  const sub = authUser?.sub;
  if (!sub) return null;

  const existing = await byRef(sub, client);
  if (existing) return existing;

  // First authenticated touch: read the founder's file-kernel history.
  const founder = await getOrCreateFounder(authUser);
  const profile = await getOrCreateActiveProfile(founder);
  const snapshot = await replayProfile(profile.id);

  const founderName = founder.name || founder.email || sub;
  const companyName = snapshot?.current_claims?.company_name?.value || null;

  try {
    if (companyName) {
      const { person } = await migrateProfile(
        snapshot, { founderName, companyName, founderRef: sub }, client);
      return { entity_id: person.entity_id, corpus_id: person.corpus_id, name: founderName };
    }
    const person = await createEntity(
      { type: 'person', name: founderName, ref: sub, access_layer: 'authenticated_customer_portal' },
      client);
    return { entity_id: person.entity_id, corpus_id: person.corpus_id, name: founderName };
  } catch (err) {
    // Concurrent first touch: the unique index on entity.ref made us lose the race.
    // The winner's projection is the truth — return it.
    if (err?.code === UNIQUE_VIOLATION) return byRef(sub, client);
    throw err;
  }
}
