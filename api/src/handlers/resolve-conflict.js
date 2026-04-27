// resolve-conflict.js — POST /api/v1/session/:id/resolve-conflict
// Explicit conflict resolution surface. When two human actors set conflicting
// values for the same signal field, this endpoint resolves the conflict by
// choosing one value and recording the resolution in signal_events.
import { query } from '../db/pool.js';
import { resolveConflict, loadSignals } from '../services/signal-store.js';
import { recompute } from '../services/recompute.js';
import { GAP_DEFINITIONS } from '../config/gaps.js';
import { VENDORS } from '../config/vendors.js';
import { AWS_PROGRAMS } from '../config/aws-programs.js';

export async function resolveConflictHandler(request, reply) {
  const { id: sessionId } = request.params;
  const { field, chosen_value, actor, reason } = request.body || {};

  // --- Validate required fields ---
  const missing = [];
  if (!field) missing.push('field');
  if (chosen_value === undefined || chosen_value === null) missing.push('chosen_value');
  if (!actor) missing.push('actor');

  if (missing.length > 0) {
    return reply.status(400).send({
      error: `Missing required field: ${missing.join(', ')}`,
    });
  }

  // --- Check session exists ---
  const sessionRes = await query(
    'SELECT * FROM sessions WHERE id = $1',
    [sessionId]
  );

  if (sessionRes.rows.length === 0) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  // --- Resolve conflict via signal-store ---
  try {
    await resolveConflict(sessionId, {
      field,
      chosen_value,
      actor,
      reason: reason || null,
    });

    // Recompute derived_state after conflict resolution
    const signals = await loadSignals(sessionId);
    const reconRes = await query('SELECT * FROM recon_outputs WHERE session_id = $1', [sessionId]);
    const gapsRes = await query('SELECT * FROM gaps WHERE session_id = $1', [sessionId]);
    const session = sessionRes.rows[0];

    const recomputeResult = recompute({
      signals,
      recon_outputs: reconRes.rows,
      session,
      gaps_config: GAP_DEFINITIONS,
      vendors_config: VENDORS,
      aws_programs: AWS_PROGRAMS,
      gaps_db: gapsRes.rows,
    });

    return reply.status(200).send(recomputeResult);
  } catch (err) {
    if (err.code === 'NOT_CONFLICTED') {
      return reply.status(409).send({ error: 'Signal is not in conflicted status' });
    }
    throw err;
  }
}
