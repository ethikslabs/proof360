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

  // --- Postgres fallback (session evicted from memory) ---
  try {
    const { query } = await import('../db/pool.js');
    const { loadSignals } = await import('../services/signal-store.js');
    const { recompute } = await import('../services/recompute.js');
    const { GAP_DEFINITIONS } = await import('../config/gaps.js');
    const { VENDORS } = await import('../config/vendors.js');

    const sessionRes = await query('SELECT * FROM sessions WHERE id = $1', [id]);
    if (sessionRes.rows.length === 0) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    const row = sessionRes.rows[0];

    const signals      = await loadSignals(id);
    const reconRes     = await query('SELECT * FROM recon_outputs WHERE session_id = $1', [id]);
    const gapsRes      = await query('SELECT * FROM gaps WHERE session_id = $1', [id]);

    const result = recompute({
      signals,
      recon_outputs: reconRes.rows,
      session: row,
      gaps_config: GAP_DEFINITIONS,
      vendors_config: VENDORS,
      gaps_db: gapsRes.rows,
    });

    const company_name = signals.find(s => s.field === 'company_name')?.current_value || '';

    emitPulse({
      type: 'event', severity: 'info', tags: ['trust_score', 'report'],
      payload: { action: 'report_generated', session_id: id, gap_count: result.derived_state?.gaps?.length || 0 },
    });

    return reply.send({
      ...result,
      company_name,
      website:     row.url || '',
      assessed_at: row.created_at || new Date().toISOString(),
    });
  } catch (err) {
    request.log.error(err, 'report fallback (Postgres) failed');
    return reply.status(500).send({ error: 'Report unavailable' });
  }
}
