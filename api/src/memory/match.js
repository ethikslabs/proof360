// proof360 memory v2 — match() is DETERMINISTIC (V1): a requirement check of a capability's
// generic spec against a posture. It carries the posture's input_claim_ids straight through into
// the recommendation's provenance manifest, so a recommendation always walks back to the claims
// (and thus the evidence) that produced it. The engine is directional: entity -> capability.
import { randomUUID } from 'node:crypto';
import { createEdge } from './nodes.js';
import pool from './db.js';

const EXTRACTOR = { tool: 'proof360-memory-v2', code: 'match-deterministic', prompt: null };

export function match(postureResult, capability) {
  const reqs = capability.extensions?.requirements || {};
  const met = [], unmet = [], missing = [];
  for (const [predicate, acceptable] of Object.entries(reqs)) {
    const val = postureResult.fields[predicate];
    if (val === undefined || val === null) missing.push(predicate);
    else if (acceptable.map(String).includes(String(val))) met.push(predicate);
    else unmet.push(predicate);
  }
  const eligible = unmet.length === 0 && missing.length === 0;
  return {
    capability_corpus_id: capability.corpus_id,
    capability_name: capability.name,
    provider: capability.extensions?.provider,
    met, unmet, missing,
    input_claim_ids: postureResult.input_claim_ids, // provenance manifest -> walk-back
    permission_policy: 'customer_safe_summary_ok',
    eligible,
    confidence: eligible ? 'probable' : 'unverified',
  };
}

// Persist the recommendation as a projection + a routes_when edge (company -> capability).
export async function recordRecommendation(companyEntityId, recommendation, client = pool) {
  const id = randomUUID();
  const corpus_id = `pr-${id}`;
  await client.query(
    `INSERT INTO projection (projection_id, corpus_id, entity_id, kind, statement, confidence, output_permission, valid_from, extensions, extractor)
     VALUES ($1,$2,$3,'recommendation',$4,$5,$6,$7,$8,$9)`,
    [id, corpus_id, companyEntityId, recommendation.eligible ? 'eligible' : 'gaps',
     recommendation.confidence, recommendation.permission_policy, new Date().toISOString(),
     JSON.stringify(recommendation), EXTRACTOR]);

  // company --routes_when--> capability (graph form of the route)
  const company = await client.query(`SELECT corpus_id FROM entity WHERE entity_id=$1`, [companyEntityId]);
  await createEdge({
    from: company.rows[0].corpus_id, to: recommendation.capability_corpus_id, kind: 'routes_when',
    output_permission: recommendation.permission_policy, confidence: recommendation.confidence,
    extensions: { recommendation: corpus_id },
  }, client);

  return { projection_id: id, corpus_id };
}
