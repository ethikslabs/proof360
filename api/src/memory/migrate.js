// proof360 memory v2 — supersede the file-backed JSON kernel by replaying its reconstructed
// claims into atoms. Historically founder == company (one merged profile), so every current_claim
// migrates onto the COMPANY node (the "projected-as-merged" view holds; no person/company split to
// reverse-engineer from v1 data). The tile engine (services/profile-projections.js) is REUSED
// unchanged over the atoms, so the migration is proven by tile-for-tile parity, not asserted.
import { createFounderAndCompany, assertClaim } from './nodes.js';
import { buildProfileProjections } from '../services/profile-projections.js';
import pool from './db.js';

const SAFE = { access_layer: 'authenticated_customer_portal', output_permission: 'customer_safe_summary_ok' };

// v1 claim.actor -> v2 claim.authority
const authorityOf = (actor) => (actor === 'founder' ? 'founder' : 'system');

// Replay one v1 reconstructed snapshot (its current_claims) into atoms on a fresh company.
// founderRef (optional) stamps the external identity (Auth0 sub) onto the person entity so
// the journey resolver can find it; existing callers pass nothing and get ref = null.
export async function migrateProfile(snapshot, { founderName, companyName, founderRef = null }, client = pool) {
  const { person, company } = await createFounderAndCompany({ founderName, companyName, founderRef }, client);
  for (const [field, c] of Object.entries(snapshot.current_claims || {})) {
    await assertClaim({
      entity_id: company.entity_id, subject: field, value: c.value,
      authority: authorityOf(c.actor), confidence: 'probable', ...SAFE,
    }, client);
  }
  return { person, company };
}

// Re-shape permitted atoms back into the snapshot shape the existing tile engine expects, so the
// SAME buildProfileProjections() produces the SAME tiles from atoms as it did from the file kernel.
export function atomsToSnapshot(claims, profileId) {
  const current_claims = {};
  for (const c of claims) {
    current_claims[c.subject] = { id: c.claim_id, field: c.subject, value: c.statement, actor: c.authority };
  }
  return { profile: { id: profileId }, reconstructed_at: new Date().toISOString(), current_claims, observations: [] };
}

export function tilesFromClaims(claims, profileId) {
  return buildProfileProjections(atomsToSnapshot(claims, profileId));
}
