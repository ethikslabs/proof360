// api/src/handlers/chat.js
import { buildSystemPrompt } from '../services/persona-prompts.js';
import { notifyJohn } from '../services/john-relay.js';
import { chatStream } from '../lib/inference.js';
import { retrieveCorpusEvidence, evidenceBlock } from '../services/corpus-retrieve.js';
import { getSession } from '../services/session-store.js';
import { appendChatReceipt } from './record.js';

const VALID_PERSONAS = ['sophia', 'leonardo', 'edison'];

export async function chatHandler(request, reply) {
  const { persona, messages, context } = request.body ?? {};

  // Validate
  if (!VALID_PERSONAS.includes(persona)) {
    return reply.status(400).send({ error: 'invalid_persona' });
  }
  if (!Array.isArray(messages)) {
    return reply.status(400).send({ error: 'messages_required' });
  }
  if (!context?.company_name) {
    return reply.status(400).send({ error: 'context_required' });
  }

  // Strip uiOnly messages before sending to Claude
  const apiMessages = messages
    .filter(m => !m.uiOnly)
    .map(({ role, content }) => ({ role, content }));

  // Must have at least one user message
  if (!apiMessages.length || apiMessages[apiMessages.length - 1].role !== 'user') {
    return reply.status(400).send({ error: 'last_message_must_be_user' });
  }

  const systemPrompt = buildSystemPrompt(persona, context);
  const sessionId = context?.session_id || null;
  const correlationId = sessionId || 'proof360';

  // Live corpus retrieval (John go 2026-08-22) — evidence joins the system prompt;
  // null on any failure and the chat proceeds exactly as before.
  const lastUserContent = apiMessages[apiMessages.length - 1]?.content ?? '';
  const corpusHits = await retrieveCorpusEvidence(lastUserContent, context);
  const groundedPrompt = systemPrompt + evidenceBlock(corpusHits);

  // Receipt ("Our working"): record what this exchange retrieved so [n] chips resolve
  // to citation cards. Only when the caller rides a real session; never blocks the chat.
  if (sessionId) {
    const session = getSession(sessionId);
    if (session) appendChatReceipt(session, { query: lastUserContent, hits: corpusHits ?? [] });
  }

  // @john detection — skip inference, notify John via Telegram, return inline response
  const lastUserMsg = apiMessages[apiMessages.length - 1]?.content || '';
  if (/@john\b/i.test(lastUserMsg)) {
    notifyJohn({
      sessionId,
      companyName: context?.company_name,
      score: context?.score,
      message: lastUserMsg.replace(/@john\b/i, '').trim(),
    });
    return reply.type('text/plain').send("📨 John's been notified — he'll reply here shortly.");
  }

  // Delay writeHead until first token — so API failures before streaming begins
  // can still return a clean JSON 500 rather than a broken chunked response.
  let headersWritten = false;

  try {
    const stream = chatStream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'system', content: groundedPrompt }, ...apiMessages],
      correlation_id: correlationId,
    });

    for await (const delta of stream) {
      if (!delta) continue;
      if (!headersWritten) {
        reply.raw.writeHead(200, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
          'Access-Control-Allow-Origin': '*',
        });
        headersWritten = true;
      }
      reply.raw.write(delta);
    }

    if (headersWritten) {
      reply.raw.end();
    } else {
      return reply.status(500).send({ error: 'chat_failed' });
    }
  } catch (err) {
    request.log.error(err, 'persona chat stream error');
    if (!headersWritten) {
      return reply.status(500).send({ error: 'chat_failed' });
    }
    try {
      reply.raw.write('\n\n[error]');
      reply.raw.end();
    } catch {
      // stream already closed
    }
  }
}
