// proof360 memory v2 — posture is LAZY and deterministic in V1: a pure function of the permitted
// claims handed to it (from project()). It holds no standing state and cannot drift from evidence.
// Every posture carries input_claim_ids so a recommendation built on it walks back to evidence, and
// snapshots are RETAINED so trajectory is later a pure function over snapshots (no rebuild).
import { randomUUID } from 'node:crypto';
import pool from './db.js';

const EXTRACTOR = { tool: 'proof360-memory-v2', code: 'posture-lazy', prompt: null };

// Derive entity shape from permitted claims only. Deterministic: subject -> latest statement.
export function posture(permittedClaims) {
  const fields = {};
  const input_claim_ids = [];
  for (const c of permittedClaims) {
    fields[c.subject] = c.statement;
    input_claim_ids.push(c.claim_id);
  }
  const n = Object.keys(fields).length;
  const state = n >= 4 ? 'forming' : n >= 1 ? 'emerging' : 'unknown';
  return { fields, input_claim_ids, state, confidence: n >= 5 ? 'probable' : 'unverified' };
}

// Persist a posture snapshot as a projection (append-only). Returns the projection node.
export async function snapshotPosture(entity_id, postureResult, client = pool) {
  const id = randomUUID();
  const corpus_id = `pr-${id}`;
  await client.query(
    `INSERT INTO projection (projection_id, corpus_id, entity_id, kind, statement, confidence, output_permission, valid_from, extensions, extractor)
     VALUES ($1,$2,$3,'posture',$4,$5,'customer_safe_summary_ok',$6,$7,$8)`,
    [id, corpus_id, entity_id, postureResult.state, postureResult.confidence, new Date().toISOString(),
     JSON.stringify({ input_claim_ids: postureResult.input_claim_ids, fields: postureResult.fields }), EXTRACTOR]);
  return { projection_id: id, corpus_id };
}
