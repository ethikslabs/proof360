// proof360 memory v2 — the read side. project(viewer, target) is LAZY and permission-filters
// BEFORE returning, never redacts after. A viewer reaches a target through an edge; the edge's
// kind + scope decides which of the target's live claims are permitted. Founder (founded edge,
// full scope) sees all of the company's claims; a member (member_of edge, partial scope) sees a
// strictly smaller, output-permission-gated set. Separation is structural: a founder-private claim
// lives on the PERSON node, so it is simply never among the COMPANY's claims.
import pool from './db.js';

// What output_permission ceilings a partial-scope member may see. Founder/full scope = no filter.
const MEMBER_DEFAULT_ALLOWED = ['public_ok', 'customer_safe_summary_ok'];

async function corpusIdOf(entity_id, client) {
  const r = await client.query(`SELECT corpus_id, type FROM entity WHERE entity_id=$1`, [entity_id]);
  return r.rows[0] || null;
}

async function liveEdge(fromCorpusId, toCorpusId, client) {
  const r = await client.query(
    `SELECT kind, extensions FROM relationship
     WHERE from_id=$1 AND to_id=$2 AND superseded_by IS NULL
     ORDER BY valid_from DESC LIMIT 1`, [fromCorpusId, toCorpusId]);
  return r.rows[0] || null;
}

function roleFromEdge(edge) {
  if (!edge) return { role: 'none', allowed: [] };
  if (edge.kind === 'founded') return { role: 'founder', allowed: null }; // null = unfiltered
  // member_of / advises / counsel_for: partial scope, output-permission gated
  const scope = edge.extensions?.scope;
  const allowed = Array.isArray(scope?.allowed) ? scope.allowed : MEMBER_DEFAULT_ALLOWED;
  return { role: edge.kind === 'member_of' ? 'member' : edge.kind, allowed };
}

// Returns { viewer_role, claims: [...] } — the permitted live claims of `target` for `viewer`.
export async function project(viewerEntityId, targetEntityId, client = pool) {
  const viewer = await corpusIdOf(viewerEntityId, client);
  const target = await corpusIdOf(targetEntityId, client);
  if (!viewer || !target) throw new Error('project(): unknown viewer or target entity');

  const selfView = viewerEntityId === targetEntityId;
  const edge = selfView ? { kind: 'founded' } : await liveEdge(viewer.corpus_id, target.corpus_id, client);
  const { role, allowed } = selfView ? { role: 'self', allowed: null } : roleFromEdge(edge);

  const { rows } = await client.query(
    `SELECT claim_id, corpus_id, subject, statement, authority, access_layer, output_permission, confidence, valid_from
     FROM claim WHERE entity_id=$1 AND superseded_by IS NULL ORDER BY subject, valid_from`, [targetEntityId]);

  const claims = allowed === null ? rows : rows.filter((c) => allowed.includes(c.output_permission));
  return { viewer_role: role, claims };
}
