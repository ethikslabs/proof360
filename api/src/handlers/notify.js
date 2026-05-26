import { notifyJohn } from '../services/john-relay.js';

export async function notifyHandler(request, reply) {
  const { message, name, email, context } = request.body ?? {};
  if (!message?.trim()) {
    return reply.code(400).send({ error: 'message required' });
  }

  const lines = [
    '📬 *proof360 — direct message*',
    '',
    name  ? `*From:* ${name}${email ? ` · ${email}` : ''}` : '*(anonymous)*',
    context ? `*Context:* ${context}` : null,
    '',
    `_"${message.trim()}"_`,
  ].filter(l => l !== null).join('\n');

  await notifyJohn({
    sessionId: `direct-${Date.now()}`,
    companyName: name || 'proof360 visitor',
    score: null,
    message: lines,
  });

  return reply.send({ ok: true });
}
