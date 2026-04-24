import { getSession, updateSession } from '../services/session-store.js';

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
  const session = getSession(id);

  if (!session) {
    return reply.status(404).send({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
  }

  if (session.infer_status !== 'complete') {
    return reply.status(409).send({
      error: 'Inferences not ready',
      code: 'NOT_READY',
      status: session.infer_status,
    });
  }

  const confidence = computeConfidence(session);

  // Write confidence to session so report handler can access it
  updateSession(id, { confidence });

  return reply.send({
    company_name: session.company_name,
    source_summary: session.source_summary,
    inferences: session.inferences,
    correctable_fields: session.correctable_fields,
    followup_questions: session.followup_questions,
    sources_read: session.sources_read,
    signals_detected: session.signals_detected,
    confidence,
  });
}
