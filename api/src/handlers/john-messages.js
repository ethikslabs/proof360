import { getSession } from '../services/session-store.js';

export async function johnMessagesHandler(request, reply) {
  const { id }  = request.params;
  const after   = parseInt(request.query.after || '0', 10);

  const session = getSession(id);
  if (!session) return reply.status(404).send({ error: 'session_not_found' });

  const messages = (session.john_messages || []).filter(m => m.ts > after);
  return reply.send({ messages });
}
