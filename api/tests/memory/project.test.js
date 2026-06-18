// Slice 2 verification: the atom write path + Person/Company split + project().
// Covers acceptance test #2 (separation) and #3 (extensibility) from the approved plan.
import { afterAll, describe, it, expect } from 'vitest';
import { pool, reachable } from './_setup.js';
import { createFounderAndCompany, createEntity, createEdge, recordEvidence, assertClaim } from '../../src/memory/nodes.js';
import { project } from '../../src/memory/project.js';

const COMPANY_SAFE = { access_layer: 'authenticated_customer_portal', output_permission: 'customer_safe_summary_ok' };
const INTERNAL = { access_layer: 'internal_operator_note', output_permission: 'internal_only' };
const FOUNDER_PRIVATE = { access_layer: 'private_relationship_signal', output_permission: 'do_not_share' };

async function tableNames() {
  const { rows } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1`);
  return rows.map((r) => r.table_name);
}

afterAll(async () => { await pool.end(); });

describe.skipIf(!reachable)('atom write path + project()', () => {
  it('round-trips a stamped atom: turn -> evidence -> claim -> project(founder, company)', async () => {
    const { person, company } = await createFounderAndCompany({ founderName: 'Ada', companyName: 'Roundtrip Inc' });
    const ev = await recordEvidence({ entity_id: company.entity_id, content: 'we are seed stage', ...COMPANY_SAFE });
    await assertClaim({ entity_id: company.entity_id, subject: 'stage', value: 'seed', authority: 'founder', evidence_ids: [ev.evidence_id], ...COMPANY_SAFE });

    const view = await project(person.entity_id, company.entity_id);
    expect(view.viewer_role).toBe('founder');
    const stage = view.claims.find((c) => c.subject === 'stage');
    expect(stage).toMatchObject({ statement: 'seed', authority: 'founder' });
  });

  it('TEST #2 separation: a founder-private claim never appears in the company-view projection', async () => {
    if (!reachable) return;
    const { person, company } = await createFounderAndCompany({ founderName: 'Bo', companyName: 'Sep Inc' });
    // founder-private: a preference ABOUT THE FOUNDER (person node), stamped do_not_share
    await assertClaim({ entity_id: person.entity_id, subject: 'preference:lock_in', value: 'hates lock-in', authority: 'founder', ...FOUNDER_PRIVATE });
    // company claim
    await assertClaim({ entity_id: company.entity_id, subject: 'stage', value: 'seed', authority: 'founder', ...COMPANY_SAFE });

    const companyView = await project(person.entity_id, company.entity_id);
    expect(companyView.claims.map((c) => c.subject)).not.toContain('preference:lock_in');

    // but the founder DOES see their own private claim in their self-view
    const selfView = await project(person.entity_id, person.entity_id);
    expect(selfView.claims.map((c) => c.subject)).toContain('preference:lock_in');
  });

  it('TEST #3 extensibility: add a second person (partial scope), ZERO schema changes, strictly smaller claim set', async () => {
    if (!reachable) return;
    const before = await tableNames();
    const { person, company } = await createFounderAndCompany({ founderName: 'Cy', companyName: 'Ext Inc' });
    await assertClaim({ entity_id: company.entity_id, subject: 'stage', value: 'seed', authority: 'founder', ...COMPANY_SAFE });
    await assertClaim({ entity_id: company.entity_id, subject: 'internal_note', value: 'cap table messy', authority: 'founder', ...INTERNAL });

    const founderView = await project(person.entity_id, company.entity_id);
    expect(founderView.claims.length).toBe(2); // founder (full scope) sees both

    // add a CTO as a second person with a partial-scope member_of edge — no DDL
    const cto = await createEntity({ type: 'person', name: 'Dee', access_layer: 'authenticated_customer_portal' });
    await createEdge({ from: cto.corpus_id, to: company.corpus_id, kind: 'member_of', ...COMPANY_SAFE, extensions: { scope: { allowed: ['public_ok', 'customer_safe_summary_ok'] } } });

    const memberView = await project(cto.entity_id, company.entity_id);
    expect(memberView.viewer_role).toBe('member');
    expect(memberView.claims.length).toBeLessThan(founderView.claims.length); // strictly smaller
    expect(memberView.claims.map((c) => c.output_permission)).not.toContain('internal_only');

    const after = await tableNames();
    expect(after).toEqual(before); // an alter table here means an invariant broke
  });

  it('supersede-not-edit: founder claim is NOT superseded by a later system claim', async () => {
    if (!reachable) return;
    const { company } = await createFounderAndCompany({ founderName: 'Ed', companyName: 'Super Inc' });
    await assertClaim({ entity_id: company.entity_id, subject: 'stage', value: 'series-a', authority: 'founder', ...COMPANY_SAFE });
    const sys = await assertClaim({ entity_id: company.entity_id, subject: 'stage', value: 'seed', authority: 'system', ...COMPANY_SAFE });
    expect(sys.believed).toBe(false); // system did not win
    const { rows } = await pool.query(
      `SELECT statement, authority FROM claim WHERE entity_id=$1 AND subject='stage' AND superseded_by IS NULL`, [company.entity_id]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ statement: 'series-a', authority: 'founder' });
  });
});
