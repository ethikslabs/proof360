import { getSession } from '../services/session-store.js';

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

  return reply.send({
    company_name: session.company_name,
    source_summary: session.source_summary,
    inferences: session.inferences,
    correctable_fields: session.correctable_fields,
    followup_questions: session.followup_questions,
    sources_read: session.sources_read,
    signals_detected: session.signals_detected,
  });
}
