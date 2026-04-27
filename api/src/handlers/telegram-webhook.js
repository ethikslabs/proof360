import { getSessionForMessage, getTelegramFileUrl } from '../services/john-relay.js';
import { getSession } from '../services/session-store.js';

export async function telegramWebhookHandler(request, reply) {
  const msg = request.body?.message;
  if (!msg) return reply.send({ ok: true });

  // Only process replies to our notification messages
  const replyToId = msg.reply_to_message?.message_id;
  if (!replyToId) return reply.send({ ok: true });

  const sessionId = getSessionForMessage(replyToId);
  if (!sessionId) return reply.send({ ok: true });

  const session = getSession(sessionId);
  if (!session) return reply.send({ ok: true });

  const johnMsg = {
    id:      msg.message_id,
    ts:      Date.now(),
    type:    'text',
    content: msg.text || msg.caption || '',
    url:     null,
  };

  if (msg.photo) {
    const largest = msg.photo[msg.photo.length - 1];
    johnMsg.type = 'image';
    johnMsg.url  = await getTelegramFileUrl(largest.file_id);
  } else if (msg.video || msg.video_note) {
    johnMsg.type = 'video';
    johnMsg.url  = await getTelegramFileUrl((msg.video || msg.video_note).file_id);
  }

  if (!session.john_messages) session.john_messages = [];
  session.john_messages.push(johnMsg);

  return reply.send({ ok: true });
}
