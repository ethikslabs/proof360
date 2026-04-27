// override.js — POST /api/v1/session/:id/override
// The single mutation surface for signal state. Every write — founder edit,
// partner correction, MCP agent submission — uses this identical shape.
import { query } from '../db/pool.js';
import { applyOverride, loadSignals } from '../services/signal-store.js';
import { recompute } from '../services/recompute.js';
import { GAP_DEFINITIONS } from '../config/gaps.js';
import { VENDORS } from '../config/vendors.js';
import { AWS_PROGRAMS } from '../config/aws-programs.js';

/**
 * Resolve actor from auth context.
 * Founder → 'founder', partner portal → 'partner:<tenant_id>', MCP → 'mcp:<agent_id>'.
 * Falls back to the actor field in the request body when auth context is absent (pre-Auth0 only).
 */
function resolveActor(request, bodyActor) {
  // Auth0 middleware sets request.user when available
  if (request.user) {
    if (request.user.tenant_id) return `partner:${request.user.tenant_id}`;
    if (request.user.agent_id) return `mcp:${request.user.agent_id}`;
    return 'founder';
  }
  // Fallback: trust body actor (pre-Auth0 only)
  console.warn(JSON.stringify({ event: 'actor_from_body', actor: bodyActor, session_id: request.params.id }));
  return bodyActor;
}

export async function overrideHandler(request, reply) {
  const { id: sessionId } = request.params;
  const { field, value, actor, reason } = request.body || {};

  // --- Validate required fields ---
  const missing = [];
  if (!field) missing.push('field');
  if (value === undefined || value === null) missing.push('value');
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

  // --- Resolve actor from auth context ---
  const resolvedActor = resolveActor(request, actor);

  // --- Apply override via signal-store ---
  const result = await applyOverride(sessionId, {
    field,
    value,
    actor: resolvedActor,
    reason: reason || null,
  });

  // Recompute derived_state after override
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
}
