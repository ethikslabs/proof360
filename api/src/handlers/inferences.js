// inferences.js — GET /api/v1/session/:id/inferences
// Transitional read pattern: active pipelines (infer_status=processing) use in-memory,
// completed sessions read from Postgres as canonical source.

import { getSession, updateSession } from '../services/session-store.js';
import { query } from '../db/pool.js';

export function computeConfidence(session) {
  const attempted = session.sources_read?.attempted ?? 0;
  const succeeded = session.sources_read?.succeeded ?? 0;
  const ratio = attempted > 0 ? succeeded / attempted : 0;

  let overall;
  if (attempted === 0) overall = 'partial';
  else if (ratio >= 0.9) overall = 'high';
  else if (ratio >= 0.7) overall = 'medium';
  else if (ratio >= 0.5) overall = 'low';
  else overall = 'partial';

  return {
    overall,
    sources_attempted: attempted,
    sources_succeeded: succeeded,
    missing_sources: session.sources_read?.missing ?? [],
  };
}

export async function inferencesHandler(request, reply) {
  const { id } = request.params;

  // Transitional pattern: check in-memory first for active pipeline state
  const memSession = getSession(id);

  // If in-memory session exists and pipeline is still processing, use in-memory
  // (pipeline state fields like inferences, correctable_fields aren't in Postgres yet)
  if (memSession && memSession.infer_status === 'processing') {
    return reply.status(409).send({
      error: 'Inferences not ready',
      code: 'NOT_READY',
      status: memSession.infer_status,
    });
  }

  // For completed sessions, prefer in-memory if available (has full pipeline state),
  // otherwise fall back to Postgres
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
        event: 'pg_read_error', handler: 'inferences',
        session_id: id, error: err.message,
      }));
    }
  }

  if (!session) {
    return reply.status(404).send({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
  }

  if (session.infer_status && session.infer_status !== 'complete') {
    return reply.status(409).send({
      error: 'Inferences not ready',
      code: 'NOT_READY',
      status: session.infer_status,
    });
  }

  const confidence = computeConfidence(session);

  // Write confidence to in-memory session if available
  if (memSession) {
    updateSession(id, { confidence });
  }

  const response = {
    company_name: session.company_name,
    source_summary: session.source_summary,
    company_summary: session.company_summary || null,
    inferences: session.inferences,
    correctable_fields: session.correctable_fields,
    followup_questions: session.followup_questions,
    sources_read: session.sources_read,
    signals_detected: session.signals_detected,
    confidence,
  };

  // Tier boundary enforcement: strip Tier 2 fields server-side
  if (session.status !== 'tier2_published') {
    delete response.trust_score;
    delete response.vendor_recommendations;
    delete response.vendor_intelligence;
    delete response.aws_programs;
  }

  return reply.send(response);
}
