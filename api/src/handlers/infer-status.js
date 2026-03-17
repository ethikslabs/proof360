import { getSession } from '../services/session-store.js';

export async function inferStatusHandler(request, reply) {
  const { id } = request.params;
  const session = getSession(id);

  if (!session) {
    return reply.status(404).send({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
  }

  return reply.send({ status: session.infer_status });
}
