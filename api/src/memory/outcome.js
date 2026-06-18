// proof360 memory v2 — the loop closes to the atom. An outcome is just a claim with
// authority='reality' whose subject is the recommendation; reality attests what happened. No new
// machinery. A derives_from edge (Claim -> Projection) links the outcome back to its recommendation.
import { assertClaim, createEdge } from './nodes.js';
import pool from './db.js';

const RESULTS = ['accepted', 'rejected', 'ignored'];

export async function recordOutcome(companyEntityId, recommendationCorpusId, result, client = pool) {
  if (!RESULTS.includes(result)) throw new Error(`outcome must be one of ${RESULTS.join('|')}`);
  const claim = await assertClaim({
    entity_id: companyEntityId,
    subject: `outcome:${recommendationCorpusId}`,
    value: result,
    authority: 'reality',
    access_layer: 'internal_operator_note',
    output_permission: 'internal_only',
    confidence: 'confirmed',
  }, client);

  await createEdge({
    from: claim.corpus_id, from_type: 'Claim',
    to: recommendationCorpusId, to_type: 'Projection',
    kind: 'derives_from',
    output_permission: 'internal_only',
  }, client);

  return claim;
}
