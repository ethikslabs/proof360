// publish.js — POST /api/v1/session/:id/publish
// Triggers Tier 2 attestation via VERITAS for all triggered gaps.
// On success (≥1 attested): sets sessions.status = 'tier2_published', returns full derived_state.
// On total failure: returns 503, status unchanged, retains claim_id for any partial successes.
// On republish: re-attests only gaps with changed signals since last attestation.
import { query } from '../db/pool.js';
import { loadSignals } from '../services/signal-store.js';
import { attestBatch, gapsRequiringReattestation } from '../services/veritas-adapter.js';
import { recompute } from '../services/recompute.js';
import { GAP_DEFINITIONS } from '../config/gaps.js';
import { VENDORS } from '../config/vendors.js';
import { AWS_PROGRAMS } from '../config/aws-programs.js';

export async function publishHandler(request, reply) {
  const { id: sessionId } = request.params;

  // 1. Load session
  const sessionRes = await query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
  if (sessionRes.rows.length === 0) {
    return reply.status(404).send({ error: 'Session not found' });
  }
  const session = sessionRes.rows[0];

  // 2. Load all triggered gaps for the session
  const gapsRes = await query(
    'SELECT * FROM gaps WHERE session_id = $1 AND triggered = true',
    [sessionId]
  );
  const allGaps = gapsRes.rows;

  // 2b. Guard: no gaps → 409 (safety net — prevents silent publish-with-no-attestation)
  if (allGaps.length === 0) {
    return reply.status(409).send({
      error: 'no_gaps_to_attest',
      message: 'No triggered gaps found for this session. Submit corrections first.',
    });
  }

  // 3. Load signals and recon_outputs for session context
  const signals = await loadSignals(sessionId);
  const reconRes = await query('SELECT * FROM recon_outputs WHERE session_id = $1', [sessionId]);
  const recon_outputs = reconRes.rows;

  // Build flat recon_evidence from recon_outputs payloads
  const recon_evidence = {};
  for (const ro of recon_outputs) {
    if (ro.payload && typeof ro.payload === 'object') {
      Object.assign(recon_evidence, ro.payload);
    }
  }

  const sessionContext = {
    session,
    signals,
    recon_evidence,
    tenant_id: session.tenant_id || 'proof360',
  };

  // 4. Determine which gaps to attest
  let gapsToAttest;
  if (session.status === 'tier2_published') {
    // Republish: identify changed signals since last attestation
    const changedSignalIds = signals
      .filter((s) => s.status === 'overridden' || s.status === 'conflicted')
      .map((s) => s.field);
    gapsToAttest = gapsRequiringReattestation(allGaps, changedSignalIds);

    // If no gaps need re-attestation, just recompute and return current state
    if (gapsToAttest.length === 0) {
      const result = recompute({
        signals,
        recon_outputs,
        session,
        gaps_config: GAP_DEFINITIONS,
        vendors_config: VENDORS,
        aws_programs: AWS_PROGRAMS,
        gaps_db: allGaps,
      });
      return reply.send(result);
    }
  } else {
    gapsToAttest = allGaps;
  }

  // 5. Call attestBatch
  let batchResults;
  try {
    batchResults = await attestBatch(gapsToAttest, sessionContext);
  } catch (err) {
    // Total VERITAS failure — 503, status unchanged
    return reply.status(503).send({
      error: 'veritas_unavailable',
      message: 'Tier-2 attestation could not complete. Please retry.',
      failed_gaps: gapsToAttest.map((g) => g.gap_def_id),
      partial_results: [],
    });
  }

  // 6. Process results — update gaps rows with claim data
  const attested = [];
  const failed = [];

  for (const br of batchResults) {
    if (br.status === 'attested') {
      attested.push(br);
      // Update the gap row with VERITAS claim data
      await query(
        `UPDATE gaps
         SET veritas_claim_id = $1, veritas_class = $2, veritas_confidence = $3, attested_at = $4
         WHERE session_id = $5 AND gap_def_id = $6`,
        [
          br.result.claim_id,
          br.result.claim_class,
          br.result.confidence,
          br.result.attested_at,
          sessionId,
          br.gap_id,
        ]
      );
    } else {
      failed.push(br);
    }
  }

  // 7. Publish gate: ALL gaps must attest — lock §5, sessions.status does NOT
  //    advance on any failure. Partial claim_ids are retained in gaps table for retry.
  if (attested.length < gapsToAttest.length) {
    return reply.status(503).send({
      error: 'partial_attestation_failure',
      message: 'Tier-2 attestation did not complete for all gaps. Retained claim_ids are preserved for retry.',
      failed_gaps: failed.map((f) => f.gap_id),
      attested_gaps: attested.map((a) => ({ gap_id: a.gap_id, claim_id: a.result.claim_id })),
    });
  }

  // All gaps attested — advance to tier2_published
  await query(
    `UPDATE sessions SET status = 'tier2_published', updated_at = now() WHERE id = $1`,
    [sessionId]
  );
  session.status = 'tier2_published';

  // 8. Recompute full derived_state with updated session status
  //     Re-load gaps from DB to get fresh attestation data
  const updatedGapsRes = await query(
    'SELECT * FROM gaps WHERE session_id = $1',
    [sessionId]
  );

  const result = recompute({
    signals,
    recon_outputs,
    session,
    gaps_config: GAP_DEFINITIONS,
    vendors_config: VENDORS,
    aws_programs: AWS_PROGRAMS,
    gaps_db: updatedGapsRes.rows,
  });

  // If there were partial failures, include them in the response alongside derived_state
  if (failed.length > 0) {
    return reply.send({
      ...result,
      partial_failures: {
        failed_gaps: failed.map((f) => f.gap_id),
        attested_gaps: attested.map((a) => ({
          gap_id: a.gap_id,
          claim_id: a.result.claim_id,
          claim_class: a.result.claim_class,
        })),
      },
    });
  }

  return reply.send(result);
}
