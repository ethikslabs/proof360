// proof360 memory v2 — the capability catalog. Provider-agnostic from day one: the architecture
// must NEVER hard-know "AWS". A capability is an entity(type='capability') whose extensions carry
// a generic spec: { provider, requirements, evidence_required, expected_outcome, commercial_route }.
// AWS Activate is the FIRST INSTANCE, not the category. Adding Ingram/Vanta/etc. is more rows.
import { createEntity } from './nodes.js';
import pool from './db.js';

// requirements: predicate -> array of acceptable values (read generically by match()).
export const AWS_ACTIVATE = {
  name: 'AWS Activate',
  provider: 'aws',
  requirements: { stage: ['pre-seed', 'seed', 'series-a'], cloud_provider: ['aws'] },
  evidence_required: ['website', 'stage'],
  expected_outcome: 'credits_granted',
  commercial_route: 'aws_marketplace_via_ingram',
};

// Idempotent: the capability catalog is reference data, keyed by ref. Re-seeding returns the
// existing node rather than colliding on the unique ref.
export async function seedCapability(spec = AWS_ACTIVATE, client = pool) {
  const ref = `capability:${spec.provider}:${spec.name}`.toLowerCase().replace(/\s+/g, '-');
  const existing = await client.query(`SELECT entity_id, corpus_id FROM entity WHERE ref=$1`, [ref]);
  if (existing.rows[0]) return existing.rows[0];
  return createEntity({
    type: 'capability', name: spec.name, ref,
    access_layer: 'public', output_permission: 'public_ok', extensions: spec,
  }, client);
}

export async function getCapability(entity_id, client = pool) {
  const r = await client.query(`SELECT entity_id, corpus_id, name, extensions FROM entity WHERE entity_id=$1 AND type='capability'`, [entity_id]);
  return r.rows[0] || null;
}
