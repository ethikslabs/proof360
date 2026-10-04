import { timingSafeEqual } from 'node:crypto';
import { getSessionForMessage } from '../services/john-relay.js';
import { getSession, persistSession } from '../services/session-store.js';

// Default-deny: this webhook writes a message ATTRIBUTED TO JOHN into a founder's
// session, so the gate is a positive condition. Telegram echoes the secret set at
// setWebhook time in the X-Telegram-Bot-Api-Secret-Token header; we require it to match
// /proof360/TELEGRAM_WEBHOOK_SECRET. No secret configured → reject (fail closed), never
// run unauthenticated.
function secretMatches(request) {
  const configured = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!configured) return false;
  const provided = request.headers?.['x-telegram-bot-api-secret-token'];
  if (typeof provided !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(configured);
  if (a.length !== b.length) return false; // length differs → mismatch (constant-time over equal length)
  return timingSafeEqual(a, b);
}

export async function telegramWebhookHandler(request, reply) {
  if (!secretMatches(request)) {
    return reply.status(401).send({ error: 'unauthorized' });
  }

  const msg = request.body?.message;
  if (!msg) return reply.send({ ok: true });

  // Only process replies to our notification messages
  const replyToId = msg.reply_to_message?.message_id;
  if (!replyToId) return reply.send({ ok: true });

  const sessionId = getSessionForMessage(replyToId);
  if (!sessionId) return reply.send({ ok: true });

  const session = getSession(sessionId);
  if (!session) return reply.send({ ok: true });

  // Store the Telegram file_id, NOT a URL — a getFile URL embeds the bot token. Photos
  // are served later through the john-photo proxy, which resolves the token server-side.
  const johnMsg = {
    id:      msg.message_id,
    ts:      Date.now(),
    type:    'text',
    content: msg.text || msg.caption || '',
    file_id: null,
  };

  if (msg.photo) {
    const largest = msg.photo[msg.photo.length - 1];
    johnMsg.type = 'image';
    johnMsg.file_id = largest.file_id;
  } else if (msg.video || msg.video_note) {
    johnMsg.type = 'video';
    johnMsg.file_id = (msg.video || msg.video_note).file_id;
  }

  if (!session.john_messages) session.john_messages = [];
  session.john_messages.push(johnMsg);
  persistSession(session.id); // direct mutation — write through

  return reply.send({ ok: true });
}
