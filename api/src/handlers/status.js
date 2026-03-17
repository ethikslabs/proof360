import { getSession } from '../services/session-store.js';

export async function statusHandler(request, reply) {
  const { id } = request.params;
  const session = getSession(id);

  if (!session) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  return reply.send({ status: session.analysis_status || 'not_started' });
}
