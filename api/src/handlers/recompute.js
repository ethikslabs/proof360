// recompute.js — POST /api/v1/session/:id/recompute
// Endpoint wrapper for the deterministic recompute kernel.
// Loads signals, recon_outputs, and session from Postgres,
// calls the pure recompute function, returns derived_state.
import { query } from '../db/pool.js';
import { loadSignals } from '../services/signal-store.js';
import { recompute } from '../services/recompute.js';
import { GAP_DEFINITIONS } from '../config/gaps.js';
import { VENDORS } from '../config/vendors.js';
import { AWS_PROGRAMS } from '../config/aws-programs.js';

export async function recomputeHandler(request, reply) {
  const { id: sessionId } = request.params;

  // Load session
  const sessionRes = await query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
  if (sessionRes.rows.length === 0) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  // Load signals
  const signals = await loadSignals(sessionId);

  // Load recon_outputs
  const reconRes = await query('SELECT * FROM recon_outputs WHERE session_id = $1', [sessionId]);

  // Load persisted gaps (with VERITAS attestation data)
  const gapsRes = await query('SELECT * FROM gaps WHERE session_id = $1', [sessionId]);

  // Recompute
  const result = recompute({
    signals,
    recon_outputs: reconRes.rows,
    session: sessionRes.rows[0],
    gaps_config: GAP_DEFINITIONS,
    vendors_config: VENDORS,
    aws_programs: AWS_PROGRAMS,
    gaps_db: gapsRes.rows,
  });

  return reply.send(result);
}
