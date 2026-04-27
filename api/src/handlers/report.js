// report.js — GET /api/v1/session/:id/report
// Thin wrapper around the recompute kernel.
// Reads all data from Postgres (canonical source), calls recompute(),
// returns derived_state. Demo report is frontend-only (/report/demo renders
// from demo-report.js without hitting this API endpoint).

import { query } from '../db/pool.js';
import { loadSignals } from '../services/signal-store.js';
import { recompute } from '../services/recompute.js';
import { emitPulse } from '../services/pulse-emitter.js';
import { GAP_DEFINITIONS } from '../config/gaps.js';
import { VENDORS } from '../config/vendors.js';
import { AWS_PROGRAMS } from '../config/aws-programs.js';

export async function reportHandler(request, reply) {
  const { id } = request.params;

  // 1. Load session from Postgres (canonical source)
  const sessionRes = await query('SELECT * FROM sessions WHERE id = $1', [id]);
  if (sessionRes.rows.length === 0) {
    return reply.status(404).send({ error: 'Session not found' });
  }
  const session = sessionRes.rows[0];

  // 2. Load signals from Postgres
  const signals = await loadSignals(id);

  // 3. Load recon_outputs from Postgres
  const reconRes = await query('SELECT * FROM recon_outputs WHERE session_id = $1', [id]);

  // 4. Load persisted gaps (with VERITAS attestation data)
  const gapsRes = await query('SELECT * FROM gaps WHERE session_id = $1', [id]);

  // 5. Call recompute kernel — single source of derived state
  const result = recompute({
    signals,
    recon_outputs: reconRes.rows,
    session,
    gaps_config: GAP_DEFINITIONS,
    vendors_config: VENDORS,
    aws_programs: AWS_PROGRAMS,
    gaps_db: gapsRes.rows,
  });

  // 6. Emit pulse for observability
  emitPulse({
    type: 'event',
    severity: 'info',
    tags: ['trust_score', 'report'],
    payload: {
      action: 'report_generated',
      session_id: id,
      gap_count: result.derived_state?.gaps?.length || 0,
    },
  });

  // 7. Augment with metadata the frontend needs for rendering the hero/header.
  //    company_name lives in signals; website and assessed_at come from the session row.
  const company_name = signals.find((s) => s.field === 'company_name')?.current_value || '';

  return reply.send({
    ...result,
    company_name,
    website: session.url || '',
    assessed_at: session.created_at || new Date().toISOString(),
  });
}
