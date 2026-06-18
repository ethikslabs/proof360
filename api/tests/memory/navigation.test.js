// Slice 3 verification: posture -> capability -> match -> recommendation -> outcome.
// Covers acceptance test #1 (walk-back) and #4 (outcome) from the approved plan, plus the
// mandatory data-model constraint (posture snapshot retained with input_claim_ids).
import { afterAll, describe, it, expect } from 'vitest';
import { pool, reachable } from './_setup.js';
import { createFounderAndCompany, recordEvidence, assertClaim } from '../../src/memory/nodes.js';
import { project } from '../../src/memory/project.js';
import { posture, snapshotPosture } from '../../src/memory/posture.js';
import { seedCapability, getCapability, AWS_ACTIVATE } from '../../src/memory/capability.js';
import { match, recordRecommendation } from '../../src/memory/match.js';
import { recordOutcome } from '../../src/memory/outcome.js';

const SAFE = { access_layer: 'authenticated_customer_portal', output_permission: 'customer_safe_summary_ok' };

afterAll(async () => { await pool.end(); });

async function navScenario() {
  const { person, company } = await createFounderAndCompany({ founderName: 'Nav', companyName: 'Nav Inc' });
  const e1 = await recordEvidence({ entity_id: company.entity_id, content: 'seed stage', ...SAFE });
  await assertClaim({ entity_id: company.entity_id, subject: 'stage', value: 'seed', authority: 'founder', evidence_ids: [e1.evidence_id], ...SAFE });
  const e2 = await recordEvidence({ entity_id: company.entity_id, content: 'runs on aws', ...SAFE });
  await assertClaim({ entity_id: company.entity_id, subject: 'cloud_provider', value: 'aws', authority: 'founder', evidence_ids: [e2.evidence_id], ...SAFE });

  const view = await project(person.entity_id, company.entity_id);
  const p = posture(view.claims);
  await snapshotPosture(company.entity_id, p);
  const capRef = await seedCapability(AWS_ACTIVATE);
  const cap = await getCapability(capRef.entity_id);
  const rec = match(p, cap);
  const recNode = await recordRecommendation(company.entity_id, rec, pool);
  return { person, company, p, rec, recNode };
}

describe.skipIf(!reachable)('navigation: posture -> match -> recommendation -> outcome', () => {
  it('TEST #1 walk-back: recommendation.input_claim_ids -> claims -> evidence resolves fully', async () => {
    const { rec, recNode } = await navScenario();
    expect(rec.eligible).toBe(true); // seed in [pre-seed,seed,series-a] AND cloud aws in [aws]

    // read the persisted recommendation's manifest
    const { rows } = await pool.query(`SELECT extensions FROM projection WHERE corpus_id=$1`, [recNode.corpus_id]);
    const manifest = rows[0].extensions;
    expect(manifest.input_claim_ids.length).toBe(2);

    // every input claim resolves to a real claim that resolves to real evidence
    for (const claimId of manifest.input_claim_ids) {
      const c = await pool.query(`SELECT claim_id FROM claim WHERE claim_id=$1`, [claimId]);
      expect(c.rows).toHaveLength(1);
      const ev = await pool.query(
        `SELECT e.evidence_id FROM claim_evidence ce JOIN evidence e ON e.evidence_id=ce.evidence_id WHERE ce.claim_id=$1`,
        [claimId]);
      expect(ev.rows.length).toBeGreaterThan(0); // walk-back to evidence holds
    }
  });

  it('mandatory constraint: posture snapshot is retained with its input_claim_ids', async () => {
    if (!reachable) return;
    const { company } = await navScenario();
    const snap = await pool.query(
      `SELECT extensions, valid_from FROM projection WHERE entity_id=$1 AND kind='posture' ORDER BY valid_from DESC LIMIT 1`,
      [company.entity_id]);
    expect(snap.rows[0].extensions.input_claim_ids.length).toBe(2);
    expect(snap.rows[0].valid_from).toBeTruthy();
  });

  it('TEST #4 outcome: stored as a claim(authority=reality), linked to its recommendation', async () => {
    if (!reachable) return;
    const { company, recNode } = await navScenario();
    const outcome = await recordOutcome(company.entity_id, recNode.corpus_id, 'accepted');

    const c = await pool.query(`SELECT authority, statement, subject FROM claim WHERE claim_id=$1`, [outcome.claim_id]);
    expect(c.rows[0]).toMatchObject({ authority: 'reality', statement: 'accepted' });

    // the loop closes: outcome claim --derives_from--> recommendation projection
    const edge = await pool.query(
      `SELECT from_type, to_type, kind FROM relationship WHERE from_id=$1 AND to_id=$2 AND superseded_by IS NULL`,
      [outcome.corpus_id, recNode.corpus_id]);
    expect(edge.rows[0]).toMatchObject({ from_type: 'Claim', to_type: 'Projection', kind: 'derives_from' });
  });
});
