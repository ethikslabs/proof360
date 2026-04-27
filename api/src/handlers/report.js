// report.js — GET /api/v1/session/:id/report
// In-memory first (active sessions). Postgres fallback for expired sessions.

import { getSession } from '../services/session-store.js';
import { emitPulse } from '../services/pulse-emitter.js';

export async function reportHandler(request, reply) {
  const { id } = request.params;

  // --- In-memory path (active sessions) ---
  const session = getSession(id);
  if (session) {
    if (session.analysis_status !== 'complete') {
      return reply.status(404).send({ error: 'Report not ready' });
    }
    emitPulse({
      type: 'event', severity: 'info', tags: ['trust_score', 'report'],
      payload: { action: 'report_generated', session_id: id, gap_count: session.gaps?.length || 0 },
    });
    return reply.send({
      trust_score: session.trust_score,
      gaps:        session.gaps        || [],
      vendors:     session.vendors     || {},
      company_name: session.company_name || '',
      website:     session.website_url || '',
      assessed_at: new Date(session.created_at).toISOString(),
      layer2_locked: session.layer2_locked,
      email:       session.email || null,
      headline:    session.headline || null,
    });
  }

  return reply.status(404).send({ error: 'Session not found or expired' });
}
