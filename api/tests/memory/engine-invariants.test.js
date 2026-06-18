// Slice 1 verification: the engine's plpgsql invariants actually fire on real Postgres.
// These are the guarantees the whole floor rests on; mocks/pg-mem cannot validate plpgsql triggers.
import { afterAll, describe, it, expect } from 'vitest';
import { pool, reachable } from './_setup.js';

const ts = '2026-06-18T00:00:00Z';
const EXT = JSON.stringify({ model: 'test', code: 'slice1' });

async function newEntity(type, name) {
  const r = await pool.query(
    `INSERT INTO entity (entity_id, corpus_id, type, name) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING entity_id, corpus_id`,
    [`en-${name}-${Math.floor(performance.now() * 1000)}`, type, name]);
  return r.rows[0];
}
async function newEvidence(entity_id) {
  const r = await pool.query(
    `INSERT INTO evidence (evidence_id, entity_id, hash, type, uri) VALUES (gen_random_uuid(), $1, $2, 'turn', 'content://x') RETURNING evidence_id`,
    [entity_id, `h-${performance.now()}`]);
  return r.rows[0];
}
async function newClaim(entity_id, { subject = 'stage', statement = 'seed', authority = 'founder', access = 'authenticated_customer_portal', out = 'customer_safe_summary_ok' } = {}) {
  const r = await pool.query(
    `INSERT INTO claim (claim_id, corpus_id, entity_id, subject, statement, confidence, valid_from, extractor, authority, access_layer, output_permission)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 'probable', $5, $6, $7, $8, $9) RETURNING claim_id`,
    [`cl-${performance.now()}`, entity_id, subject, statement, ts, EXT, authority, access, out]);
  return r.rows[0];
}

afterAll(async () => { await pool.end(); });

describe.skipIf(!reachable)('memory engine invariants (real Postgres)', () => {
  it('has the canonical tables incl the proof360 projection primitive', async () => {
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
    const names = rows.map((r) => r.table_name);
    for (const t of ['entity', 'evidence', 'claim', 'relationship', 'projection']) expect(names).toContain(t);
  });

  it('accepts the widened entity kinds (company, capability) and edge kinds (founded, member_of)', async () => {
    if (!reachable) return;
    const person = await newEntity('person', 'jane');
    const company = await newEntity('company', 'acme');
    const cap = await newEntity('capability', 'aws-activate');
    expect(company.entity_id).toBeTruthy();
    expect(cap.entity_id).toBeTruthy();
    await expect(pool.query(
      `INSERT INTO relationship (relationship_id, from_id, from_type, to_id, to_type, kind, valid_from, extractor)
       VALUES (gen_random_uuid(), $1, 'Entity', $2, 'Entity', 'founded', $3, $4)`,
      [person.corpus_id, company.corpus_id, ts, EXT])).resolves.toBeTruthy();
  });

  it('stamps the atom: claim carries authority + access columns', async () => {
    if (!reachable) return;
    const c = await newEntity('company', 'atomco');
    const claim = await newClaim(c.entity_id, { authority: 'founder' });
    const { rows } = await pool.query(
      `SELECT authority, access_layer, output_permission FROM claim WHERE claim_id=$1`, [claim.claim_id]);
    expect(rows[0]).toMatchObject({ authority: 'founder', access_layer: 'authenticated_customer_portal' });
  });

  it('INVARIANT #1: evidence is immutable (UPDATE and DELETE rejected)', async () => {
    if (!reachable) return;
    const c = await newEntity('company', 'evco');
    const e = await newEvidence(c.entity_id);
    await expect(pool.query(`UPDATE evidence SET uri='content://hacked' WHERE evidence_id=$1`, [e.evidence_id]))
      .rejects.toThrow(/append-only/);
    await expect(pool.query(`DELETE FROM evidence WHERE evidence_id=$1`, [e.evidence_id]))
      .rejects.toThrow(/append-only/);
  });

  it('INVARIANT #5: claim is append-only (edit rejected, supersede allowed)', async () => {
    if (!reachable) return;
    const c = await newEntity('company', 'claimco');
    const a = await newClaim(c.entity_id, { statement: 'seed' });
    // editing a content column is rejected
    await expect(pool.query(`UPDATE claim SET statement='series-a' WHERE claim_id=$1`, [a.claim_id]))
      .rejects.toThrow(/append-only/);
    // editing authority (write-once provenance) is rejected
    await expect(pool.query(`UPDATE claim SET authority='system' WHERE claim_id=$1`, [a.claim_id]))
      .rejects.toThrow(/append-only/);
    // a superseding claim, then marking the old superseded_by (NULL->value) is allowed
    const b = await newClaim(c.entity_id, { statement: 'series-a' });
    await expect(pool.query(`UPDATE claim SET superseded_by=$2 WHERE claim_id=$1`, [a.claim_id, b.claim_id]))
      .resolves.toBeTruthy();
  });

  it('one live edge per (from,to,kind) triple', async () => {
    if (!reachable) return;
    const p = await newEntity('person', 'dup');
    const co = await newEntity('company', 'dupco');
    const ins = () => pool.query(
      `INSERT INTO relationship (relationship_id, from_id, from_type, to_id, to_type, kind, valid_from, extractor)
       VALUES (gen_random_uuid(), $1, 'Entity', $2, 'Entity', 'founded', $3, $4)`,
      [p.corpus_id, co.corpus_id, ts, EXT]);
    await ins();
    await expect(ins()).rejects.toThrow(/rel_one_live_per_triple|duplicate key/);
  });

  it('projection is append-only', async () => {
    if (!reachable) return;
    const co = await newEntity('company', 'projco');
    const r = await pool.query(
      `INSERT INTO projection (projection_id, corpus_id, entity_id, kind, statement, valid_from, extensions, extractor)
       VALUES (gen_random_uuid(), $1, $2, 'posture', 'forming', $3, $4, $5) RETURNING projection_id`,
      [`pr-${performance.now()}`, co.entity_id, ts, JSON.stringify({ input_claim_ids: [] }), EXT]);
    await expect(pool.query(`UPDATE projection SET statement='ready' WHERE projection_id=$1`, [r.rows[0].projection_id]))
      .rejects.toThrow(/append-only/);
  });
});
