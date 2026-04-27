// engage.js — POST /api/v1/session/:id/engage
// Accepts { vendor_id, selected_branch }, validates session is tier2_published,
// routes via engagement-router, returns { engagement_id, status, routed_to }.

import { query } from '../db/pool.js';
import { routeEngagement } from '../services/engagement-router.js';

const VALID_BRANCHES = ['john', 'distributor', 'vendor'];

export async function engageHandler(request, reply) {
  const { id: sessionId } = request.params;
  const { vendor_id, selected_branch } = request.body || {};

  // ── Input validation ─────────────────────────────────────────────────
  if (!vendor_id || !selected_branch) {
    return reply.status(400).send({
      error: 'Missing required fields: vendor_id, selected_branch',
    });
  }

  if (!VALID_BRANCHES.includes(selected_branch)) {
    return reply.status(400).send({
      error: `Invalid selected_branch: must be one of ${VALID_BRANCHES.join(', ')}`,
    });
  }

  // ── Load session ─────────────────────────────────────────────────────
  const sessionRes = await query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
  if (sessionRes.rows.length === 0) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  const session = sessionRes.rows[0];

  // ── Tier gate: must be tier2_published ────────────────────────────────
  if (session.status !== 'tier2_published') {
    return reply.status(409).send({ error: 'Session not yet published to Tier 2' });
  }

  // ── Route engagement ─────────────────────────────────────────────────
  const result = await routeEngagement(sessionId, { vendor_id, selected_branch });

  return reply.send({
    engagement_id: result.engagement_id,
    status: result.status,
    routed_to: result.routed_to,
  });
}
