// proof360 memory v2 — the atom write path over the CORPUS engine.
// Stamp-and-project: every utterance is stored ONCE as evidence + claim(s) stamped with authority
// and an access ceiling at capture time. Which view a claim reads into is derived later by
// project() — never bucketed at capture. Append-only: supersede, never edit (invariant #5).
import { randomUUID, createHash } from 'node:crypto';
import pool from './db.js';

const EXTRACTOR = { tool: 'proof360-memory-v2', code: 'atom-write', prompt: null };

// Authority precedence — a founder claim is never superseded by a system claim (kernel rule).
const AUTHORITY_RANK = { reality: 5, legal: 4, founder: 4, cto: 3, provider: 3, operator: 2, system: 1 };
const rank = (a) => AUTHORITY_RANK[a] ?? 0;

function nodeId(prefix) { const id = randomUUID(); return { id, corpus_id: `${prefix}-${id}` }; }
function hash(parts) { return createHash('sha256').update(JSON.stringify(parts)).digest('hex'); }

export async function createEntity({ type, name, ref = null, access_layer = null, output_permission = null, extensions = null }, client = pool) {
  const { id, corpus_id } = nodeId('en');
  await client.query(
    `INSERT INTO entity (entity_id, corpus_id, type, name, ref, access_layer, output_permission, extensions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, corpus_id, type, name, ref, access_layer, output_permission, extensions]);
  return { entity_id: id, corpus_id };
}

// On first login a founder is a PERSON; the startup is a COMPANY. They are distinct nodes from day
// one, joined by a `founded` edge — even with one user. The merged-looking founder view is a
// projection, not a schema collapse (no migration when member #2 arrives).
export async function createFounderAndCompany({ founderName, companyName }, client = pool) {
  const person = await createEntity({ type: 'person', name: founderName, access_layer: 'authenticated_customer_portal' }, client);
  const company = await createEntity({ type: 'company', name: companyName, access_layer: 'authenticated_customer_portal' }, client);
  const edge = await createEdge({
    from: person.corpus_id, to: company.corpus_id, kind: 'founded',
    access_layer: 'authenticated_customer_portal', output_permission: 'customer_safe_summary_ok',
    extensions: { scope: 'full' },
  }, client);
  return { person, company, edge };
}

export async function recordEvidence({ entity_id, type = 'turn', content, source_type = 'operator_entry', access_layer = null, output_permission = null, collected_at = null, extensions = null }, client = pool) {
  const { id, corpus_id } = nodeId('ev');
  const h = hash({ entity_id, content, source_type, nonce: id });
  await client.query(
    `INSERT INTO evidence (evidence_id, corpus_id, entity_id, hash, type, uri, source_type, access_layer, output_permission, collected_at, extensions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, corpus_id, entity_id, h, type, `content://${h}`, source_type, access_layer, output_permission, collected_at, extensions]);
  return { evidence_id: id, corpus_id, hash: h };
}

// Assert an atom. Supersede-not-edit: a new claim on the same (entity, subject) supersedes the
// prior live one when its authority outranks-or-ties; a WEAKER claim (e.g. system vs a live
// founder claim) is still recorded but immediately marked superseded so it never becomes believed.
export async function assertClaim({
  entity_id, subject, value, authority, evidence_ids = [],
  access_layer, output_permission, confidence = 'probable',
  valid_from = new Date().toISOString(),
}, client = pool) {
  const live = await client.query(
    `SELECT claim_id, authority FROM claim WHERE entity_id=$1 AND subject=$2 AND superseded_by IS NULL
     ORDER BY valid_from DESC LIMIT 1`, [entity_id, subject]);
  const prior = live.rows[0] || null;
  const newWins = !prior || rank(authority) >= rank(prior.authority);

  const { id, corpus_id } = nodeId('cl');
  await client.query(
    `INSERT INTO claim (claim_id, corpus_id, entity_id, subject, statement, confidence, supersedes, valid_from, extractor, authority, access_layer, output_permission)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [id, corpus_id, entity_id, subject, String(value), confidence,
     newWins && prior ? prior.claim_id : null, valid_from, EXTRACTOR, authority, access_layer, output_permission]);

  for (const ev of evidence_ids) {
    await client.query(`INSERT INTO claim_evidence (claim_id, evidence_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [id, ev]);
  }

  if (prior) {
    if (newWins) await client.query(`UPDATE claim SET superseded_by=$2 WHERE claim_id=$1`, [prior.claim_id, id]);
    else await client.query(`UPDATE claim SET superseded_by=$2 WHERE claim_id=$1`, [id, prior.claim_id]); // founder>system: new recorded, not live
  }
  return { claim_id: id, corpus_id, believed: newWins };
}

export async function createEdge({ from, to, kind, from_type = 'Entity', to_type = 'Entity', access_layer = null, output_permission = null, statement = null, confidence = null, extensions = null, valid_from = new Date().toISOString() }, client = pool) {
  const { id, corpus_id } = nodeId('rel');
  await client.query(
    `INSERT INTO relationship (relationship_id, corpus_id, from_id, from_type, to_id, to_type, kind, statement, confidence, access_layer, output_permission, valid_from, extractor, extensions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [id, corpus_id, from, from_type, to, to_type, kind, statement, confidence, access_layer, output_permission, valid_from, EXTRACTOR, extensions]);
  return { relationship_id: id, corpus_id };
}

export { rank as _authorityRank };
