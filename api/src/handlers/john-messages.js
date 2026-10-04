import { getSession } from '../services/session-store.js';

export async function johnMessagesHandler(request, reply) {
  const { id }  = request.params;
  const after   = parseInt(request.query.after || '0', 10);

  const session = getSession(id);
  if (!session) return reply.status(404).send({ error: 'session_not_found' });

  // Never expose a bot-token URL. An image/video message carries a file_id; hand the
  // client the proxy path (john-photo) instead, which streams it server-side.
  const messages = (session.john_messages || []).filter(m => m.ts > after).map((m) => ({
    id: m.id,
    ts: m.ts,
    type: m.type,
    content: m.content,
    url: (m.type === 'image' || m.type === 'video') && m.file_id
      ? `/api/v1/session/${id}/john-photo/${encodeURIComponent(m.file_id)}`
      : (m.url ?? null),
  }));
  return reply.send({ messages });
}
