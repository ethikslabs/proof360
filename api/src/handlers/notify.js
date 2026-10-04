import { notifyJohn } from '../services/john-relay.js';
import { verifyTurnstileToken } from './turnstile.js';

export async function notifyHandler(request, reply) {
  const { message, name, email, context, turnstileToken } = request.body ?? {};
  if (!message?.trim()) {
    return reply.code(400).send({ error: 'message required' });
  }

  // This posts a message into John's Telegram from an unauthenticated public page.
  // Require a Turnstile token so a script can't flood it (the route is also per-IP
  // rate-limited in server.js). Default-deny: a missing/invalid token is refused with
  // the verifier's own status (503 when Turnstile itself isn't configured).
  const v = await verifyTurnstileToken({ token: turnstileToken, remoteip: request.ip });
  if (!v.ok) {
    return reply.code(v.status).send({ ok: false, error: v.error });
  }

  // Honest when the relay isn't configured: never claim "sent" when nothing was.
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    return reply.code(503).send({ ok: false, error: 'messaging_unavailable' });
  }

  const lines = [
    '📬 *proof360 — direct message*',
    '',
    name  ? `*From:* ${name}${email ? ` · ${email}` : ''}` : '*(anonymous)*',
    context ? `*Context:* ${context}` : null,
    '',
    `_"${message.trim()}"_`,
  ].filter(l => l !== null).join('\n');

  const sent = await notifyJohn({
    sessionId: `direct-${Date.now()}`,
    companyName: name || 'proof360 visitor',
    score: null,
    message: lines,
  });

  if (!sent) {
    return reply.code(502).send({ ok: false, error: 'send_failed' });
  }
  return reply.send({ ok: true });
}
