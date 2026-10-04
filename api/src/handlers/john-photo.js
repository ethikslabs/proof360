import { getSession } from '../services/session-store.js';
import { streamTelegramFile } from '../services/john-relay.js';

// Server-side proxy for a photo/video John replied with on Telegram. The browser never
// sees the bot-token URL: it requests /api/v1/session/:id/john-photo/:fileId, and only a
// file_id that belongs to THIS session's own messages is fetched and streamed back.
export async function johnPhotoHandler(request, reply) {
  const { id, fileId } = request.params;

  const session = getSession(id);
  if (!session) return reply.status(404).send({ error: 'session_not_found' });

  const known = (session.john_messages || []).some((m) => m.file_id === fileId);
  if (!known) return reply.status(404).send({ error: 'file_not_found' });

  const res = await streamTelegramFile(fileId);
  if (!res) return reply.status(502).send({ error: 'file_unavailable' });

  reply.header('content-type', res.headers.get('content-type') || 'application/octet-stream');
  reply.header('cache-control', 'private, max-age=86400');
  return reply.send(Buffer.from(await res.arrayBuffer()));
}
