import { getSession } from '../services/session-store.js';

export async function followupQuestionsHandler(request, reply) {
  const { id } = request.params;
  const session = getSession(id);

  if (!session) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  if (session.infer_status !== 'complete') {
    return reply.status(409).send({
      error: 'Inferences not ready',
      status: session.infer_status,
    });
  }

  return reply.send({
    followup_questions: session.followup_questions || [],
  });
}
