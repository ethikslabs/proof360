import { getSession } from '../services/session-store.js';

export async function inferStatusHandler(request, reply) {
  const { id } = request.params;
  const session = getSession(id);

  if (!session) {
    return reply.status(404).send({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
  }

  // 'address_not_found' is a terminal state with something useful to say, not a
  // failure: the domain does not resolve, so nothing ran. The suggestions ride along
  // here so the client can offer "did you mean…" without a second round trip.
  if (session.infer_status === 'address_not_found') {
    return reply.send({
      status: session.infer_status,
      address_suggestions: session.address_suggestions ?? [],
    });
  }

  return reply.send({ status: session.infer_status });
}
