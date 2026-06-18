// Journey (HRR v1) read side. Delegates permission filtering to project() — no filter duplication —
// then groups the permitted claims by their session-evidence, ordered by evidence.collected_at.
import pool from './db.js';
import { project, corpusIdOf } from './project.js';

// Resolve the company a founder founded (the 'founded' edge). Returns { entity_id, corpus_id, name }.
export async function companyForFounder(founderEntityId, client = pool) {
  const founder = await corpusIdOf(founderEntityId, client);
  if (!founder) throw new Error('companyForFounder(): unknown founder entity');
  const { rows } = await client.query(
    `SELECT e.entity_id, e.corpus_id, e.name
     FROM relationship r JOIN entity e ON e.corpus_id = r.to_id
     WHERE r.from_id = $1 AND r.kind = 'founded' AND r.superseded_by IS NULL
     ORDER BY r.valid_from DESC LIMIT 1`, [founder.corpus_id]);
  return rows[0] || null;
}

// journey(viewer, company): permitted claims (via project) grouped per session-evidence, oldest first.
export async function journey(viewerEntityId, companyEntityId, client = pool) {
  const { viewer_role, claims } = await project(viewerEntityId, companyEntityId, client);
  const byId = new Map(claims.map((c) => [c.claim_id, c]));
  if (claims.length === 0) return { viewer_role, entries: [] };

  const { rows } = await client.query(
    `SELECT ce.claim_id, e.collected_at, e.extensions
     FROM claim_evidence ce JOIN evidence e ON e.evidence_id = ce.evidence_id
     WHERE ce.claim_id = ANY($1::uuid[]) AND e.type = 'session'`,
    [[...byId.keys()]]);

  const sessions = new Map(); // session_id -> { session_id, occurred_at, label, claims: [] }
  for (const row of rows) {
    const sid = row.extensions?.session_id;
    if (!sid) continue;
    if (!sessions.has(sid)) {
      sessions.set(sid, { session_id: sid, occurred_at: row.collected_at, label: row.extensions?.label || null, claims: [] });
    }
    const claim = byId.get(row.claim_id);
    if (claim) sessions.get(sid).claims.push({
      statement: claim.statement, authority: claim.authority, subject: claim.subject,
      confidence: claim.confidence, output_permission: claim.output_permission,
    });
  }

  const entries = [...sessions.values()].sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at));
  return { viewer_role, entries };
}
