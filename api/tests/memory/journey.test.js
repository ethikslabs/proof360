import { afterAll, describe, it, expect } from 'vitest';
import { pool, reachable } from './_setup.js';
import { createFounderAndCompany, createEntity, createEdge, recordEvidence, assertClaim } from '../../src/memory/nodes.js';
import { journey, companyForFounder } from '../../src/memory/journey.js';

const SAFE = { access_layer: 'authenticated_customer_portal', output_permission: 'customer_safe_summary_ok' };
const INTERNAL = { access_layer: 'internal_operator_note', output_permission: 'internal_only' };

afterAll(async () => { await pool.end(); });

async function seedSession(companyEntityId, { session_id, label, collected_at, claims }) {
  const ev = await recordEvidence({ entity_id: companyEntityId, type: 'session', content: label, collected_at, extensions: { session_id, label }, ...SAFE });
  for (const c of claims) {
    await assertClaim({ entity_id: companyEntityId, subject: c.subject, value: c.value, authority: c.authority || 'founder', evidence_ids: [ev.evidence_id], ...(c.perm || SAFE) });
  }
  return ev;
}

describe.skipIf(!reachable)('journey()', () => {
  it('returns sessions oldest -> newest with their claims (self-view unfiltered)', async () => {
    const { person, company } = await createFounderAndCompany({ founderName: 'Jo', companyName: 'Journey Inc' });
    await seedSession(company.entity_id, { session_id: 's2', label: 'Second', collected_at: '2026-02-01T00:00:00.000Z', claims: [{ subject: 'gap:mfa', value: 'no MFA' }] });
    await seedSession(company.entity_id, { session_id: 's1', label: 'First', collected_at: '2026-01-01T00:00:00.000Z', claims: [{ subject: 'stage', value: 'seed' }] });

    const result = await journey(person.entity_id, company.entity_id);
    expect(result.entries.map((e) => e.session_id)).toEqual(['s1', 's2']); // ascending by collected_at
    expect(result.entries[0].label).toBe('First');
    expect(result.entries[0].claims.map((c) => c.subject)).toContain('stage');
  });

  it('member view is permission-gated: internal_only claims are excluded', async () => {
    const { company } = await createFounderAndCompany({ founderName: 'Ow', companyName: 'Gated Inc' });
    const member = await createEntity({ type: 'person', name: 'Member' });
    await createEdge({ from: member.corpus_id, to: company.corpus_id, kind: 'member_of', extensions: { scope: { allowed: ['customer_safe_summary_ok'] } }, ...SAFE });
    await seedSession(company.entity_id, { session_id: 'm1', label: 'Visit', collected_at: '2026-03-01T00:00:00.000Z', claims: [
      { subject: 'stage', value: 'seed', perm: SAFE },
      { subject: 'secret', value: 'internal note', perm: INTERNAL },
    ] });

    const result = await journey(member.entity_id, company.entity_id);
    const subjects = result.entries.flatMap((e) => e.claims.map((c) => c.subject));
    expect(subjects).toContain('stage');
    expect(subjects).not.toContain('secret');
  });

  it('companyForFounder resolves the founded company; empty founder -> empty entries', async () => {
    const { person, company } = await createFounderAndCompany({ founderName: 'Em', companyName: 'Empty Inc' });
    const resolved = await companyForFounder(person.entity_id);
    expect(resolved.entity_id).toBe(company.entity_id);

    const result = await journey(person.entity_id, company.entity_id);
    expect(result.entries).toEqual([]); // no sessions seeded
  });
});
