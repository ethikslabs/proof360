// api/src/handlers/chat.js
import OpenAI from 'openai';
import { buildSystemPrompt } from '../services/persona-prompts.js';

const client = new OpenAI({
  baseURL: process.env.AI_GATEWAY_URL || 'http://localhost:3003/v1',
  apiKey: 'gateway',
});

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

  // Delay writeHead until first token — so API failures before streaming begins
  // can still return a clean JSON 500 rather than a broken chunked response.
  let headersWritten = false;

  try {
    const stream = await client.chat.completions.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'system', content: systemPrompt }, ...apiMessages],
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
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
