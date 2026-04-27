// early-signal.js — GET /api/v1/session/:id/early-signal
// Transitional read pattern: active pipelines use in-memory,
// completed sessions read from Postgres as canonical source.

import { getSession } from '../services/session-store.js';
import { SEVERITY_WEIGHTS } from '../config/gaps.js';
import { query } from '../db/pool.js';

export async function earlySignalHandler(request, reply) {
  const { id } = request.params;

  // Transitional pattern: check in-memory first for active pipeline state
  const memSession = getSession(id);

  let session = memSession;

  if (!session) {
    // Try Postgres — session may have expired from in-memory TTL
    try {
      const sessRes = await query('SELECT * FROM sessions WHERE id = $1', [id]);
      if (sessRes.rows.length > 0) {
        session = sessRes.rows[0];
        session._fromPg = true;
      }
    } catch (err) {
      console.error(JSON.stringify({
        event: 'pg_read_error', handler: 'early-signal',
        session_id: id, error: err.message,
      }));
    }
  }

  if (!session) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  // For in-memory sessions, check pipeline status directly
  if (memSession && memSession.infer_status !== 'complete') {
    return reply.status(409).send({ error: 'Insufficient signal data', status: memSession.infer_status });
  }

  // For Postgres-only sessions, load signals for score estimation
  let pgSignals = null;
  try {
    const res = await query('SELECT field, current_value FROM signals WHERE session_id = $1', [id]);
    if (res.rows.length > 0) {
      pgSignals = {};
      for (const row of res.rows) {
        pgSignals[row.field] = row.current_value;
      }
    }
  } catch (err) {
    console.error(JSON.stringify({
      event: 'pg_read_error', handler: 'early-signal',
      session_id: id, error: err.message,
    }));
  }

  // Estimate score from inferences without running the full gap pipeline
  const inferences = session.inferences || [];
  let penalty = 0;

  if (inferences.some((i) => i.inference_id === 'inf_compliance')) {
    penalty += SEVERITY_WEIGHTS.critical; // likely no SOC 2
  }
  if (!inferences.some((i) => i.inference_id === 'inf_identity')) {
    penalty += SEVERITY_WEIGHTS.critical; // identity model unknown — assume worst
  }

  const estimated_trust_score = Math.max(20, 100 - penalty);
  const preliminary_deal_readiness =
    estimated_trust_score >= 80 ? 'ready' : estimated_trust_score >= 50 ? 'partial' : 'not_ready';

  const sector = session.correctable_fields?.find((f) => f.key === 'customer_type')?.inferred_value || 'B2B SaaS';
  const message = `Companies like yours typically score around ${estimated_trust_score}. Let's see how you compare.`;

  return reply.send({ estimated_trust_score, preliminary_deal_readiness, message });
}
