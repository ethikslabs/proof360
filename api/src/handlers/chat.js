// api/src/handlers/chat.js
import { buildSystemPrompt } from '../services/persona-prompts.js';
import { notifyJohn } from '../services/john-relay.js';

const GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:3003/v1';
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

  // @john detection — skip VECTOR, notify John via Telegram, return inline response
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
    const res = await fetch(`${GATEWAY_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
        'X-Tenant-ID': 'proof360',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'system', content: systemPrompt }, ...apiMessages],
        stream: true,
        tenant_id: 'proof360',
        session_id: sessionId,
        correlation_id: sessionId,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      request.log.error({ status: res.status, body: body.slice(0, 200) }, 'VECTOR gateway error');
      return reply.status(500).send({ error: 'chat_failed' });
    }

    // Parse SSE stream from fetch response
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last partial line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;

        try {
          const chunk = JSON.parse(payload);
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
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
        } catch {
          // skip malformed SSE chunks
        }
      }
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
