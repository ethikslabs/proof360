// Seeds one LABELLED demo founder ("Demo Founder" / "Acme") into proof360_memory with 3 sessions.
// Idempotent: keyed on the fixed sentinel entity.ref 'demo-founder' — re-running is a no-op.
import pool from '../src/memory/db.js';
import { createEntity, createEdge, recordEvidence, assertClaim } from '../src/memory/nodes.js';

const SAFE = { access_layer: 'authenticated_customer_portal', output_permission: 'customer_safe_summary_ok' };
const DEMO_REF = 'demo-founder';

const SESSIONS = [
  { session_id: 'demo-s1', label: 'First read — cold read', collected_at: '2026-04-01T09:00:00.000Z',
    claims: [{ subject: 'stage', value: 'seed' }, { subject: 'gap:mfa', value: 'No MFA enforced' }, { subject: 'gap:soc2', value: 'No SOC 2 evidence' }] },
  { session_id: 'demo-s2', label: 'Reviewed gaps — vendor match', collected_at: '2026-04-15T09:00:00.000Z',
    claims: [{ subject: 'match:vanta', value: 'Vanta recommended for SOC 2' }] },
  { session_id: 'demo-s3', label: 'Outcome — closed a gap', collected_at: '2026-05-01T09:00:00.000Z',
    claims: [{ subject: 'gap:mfa', value: 'MFA enforced org-wide', authority: 'reality' }] },
];

async function main() {
  const existing = await pool.query(`SELECT entity_id FROM entity WHERE ref=$1`, [DEMO_REF]);
  if (existing.rows.length) { console.log('demo founder already seeded — no-op'); return; }

  const person = await createEntity({ type: 'person', name: 'Demo Founder', ref: DEMO_REF, ...SAFE });
  const company = await createEntity({ type: 'company', name: 'Acme', ...SAFE });
  await createEdge({ from: person.corpus_id, to: company.corpus_id, kind: 'founded', extensions: { scope: 'full' }, ...SAFE });

  for (const s of SESSIONS) {
    const ev = await recordEvidence({ entity_id: company.entity_id, type: 'session', content: s.label, collected_at: s.collected_at, extensions: { session_id: s.session_id, label: s.label }, ...SAFE });
    for (const c of s.claims) {
      await assertClaim({ entity_id: company.entity_id, subject: c.subject, value: c.value, authority: c.authority || 'founder', evidence_ids: [ev.evidence_id], valid_from: s.collected_at, ...SAFE });
    }
  }
  console.log('seeded demo founder + 3 sessions');
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
