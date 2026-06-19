import { getSession, updateSession } from '../services/session-store.js';
import { buildSystemPrompt } from '../services/persona-prompts.js';
import { notifyJohn } from '../services/john-relay.js';
import { normalizeContext } from '../services/context-normalizer.js';
import { runGapAnalysis } from '../services/gap-mapper.js';
import { chatStream } from '../lib/inference.js';

const MODEL = 'claude-haiku-4-5-20251001';

const INTENT_RULES = [
  {
    persona: 'leonardo',
    keywords: ['investor', 'funding', 'raise', 'term sheet', 'valuation', 'due diligence',
               'board', 'vc', 'lp', 'fundraise', 'capital', 'pitch', 'round', 'dilution'],
  },
  {
    persona: 'edison',
    keywords: ['technical', 'security', 'architecture', 'infrastructure', 'api', 'code',
               'fix', 'ssl', 'tls', 'dns', 'firewall', 'dmarc', 'spf', 'certificate',
               'deploy', 'implementation', 'configuration', 'vulnerability', 'patch'],
  },
  {
    persona: 'sophia',
    keywords: ['story', 'narrative', 'customer', 'brand', 'message', 'communicate',
               'explain', 'perception', 'tell', 'describe', 'position', 'trust'],
  },
];

function classifyIntent(message) {
  const lower = message.toLowerCase();

  // @mention override — strip it and route
  const mention = lower.match(/@(sophia|leonardo|edison)\b/);
  if (mention) {
    return {
      persona: mention[1],
      cleanMessage: message.replace(/@(sophia|leonardo|edison)\b/gi, '').trim(),
    };
  }

  // Keyword classifier
  const scores = { sophia: 0, leonardo: 0, edison: 0 };
  for (const { persona, keywords } of INTENT_RULES) {
    for (const kw of keywords) {
      if (lower.includes(kw)) scores[persona]++;
    }
  }
  const [best] = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return {
    persona: best[1] > 0 ? best[0] : 'sophia',
    cleanMessage: message,
  };
}

export async function sessionChatHandler(request, reply) {
  const { id } = request.params;
  const { message, persona_override } = request.body ?? {};

  if (!message?.trim()) {
    return reply.status(400).send({ error: 'message_required' });
  }

  const session = getSession(id);
  if (!session) {
    return reply.status(404).send({ error: 'session_not_found' });
  }

  // Auto-analyze if inference is done but gap analysis hasn't run yet
  if (session.trust_score == null) {
    if (session.infer_status !== 'complete') {
      return reply.status(425).send({ error: 'analysis_not_ready', infer_status: session.infer_status });
    }
    const context = normalizeContext(session);
    const { gaps, trust_score, readiness, vendors } = await runGapAnalysis(context, { session_id: id });
    updateSession(id, { trust_score, gaps, deal_readiness: readiness, vendors, merged_context: context, analysis_status: 'complete' });
    session.trust_score = trust_score;
    session.gaps = gaps;
    session.merged_context = context;
  }

  // Persona selection: explicit override → @mention → keyword classifier
  let persona, cleanMessage;
  if (persona_override && ['sophia', 'leonardo', 'edison'].includes(persona_override)) {
    persona = persona_override;
    cleanMessage = message;
  } else {
    ({ persona, cleanMessage } = classifyIntent(message));
  }

  // Maintain chat history on the session
  if (!session.chat_history) session.chat_history = [];
  session.chat_history.push({ role: 'user', content: cleanMessage, ts: Date.now() });

  // Build context from session data
  const context = {
    company_name: session.company_name,
    website: session.website_url,
    score: session.trust_score,
    gaps: session.gaps,
    recon: session.merged_context?.recon,
    session_id: session.id,
  };

  const systemPrompt = buildSystemPrompt(persona, context);

  // Last 20 turns (10 pairs) to keep context cost bounded
  const apiMessages = session.chat_history
    .slice(-20)
    .map(({ role, content }) => ({ role, content }));

  // @john passthrough — notify, skip inference
  if (/@john\b/i.test(cleanMessage)) {
    notifyJohn({
      sessionId: id,
      companyName: context.company_name,
      score: context.score,
      message: cleanMessage.replace(/@john\b/i, '').trim(),
    });
    const johnReply = "📨 John's been notified — he'll reply here shortly.";
    session.chat_history.push({ role: 'assistant', content: johnReply, persona, ts: Date.now() });
    return reply.type('text/plain').send(johnReply);
  }

  let headersWritten = false;
  let fullResponse = '';

  try {
    const stream = chatStream({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: 'system', content: systemPrompt }, ...apiMessages],
      correlation_id: id,
    });

    for await (const delta of stream) {
      if (!delta) continue;
      if (!headersWritten) {
        reply.raw.writeHead(200, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
          'X-Persona': persona,
          'X-Model': MODEL,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'X-Persona, X-Model',
        });
        headersWritten = true;
      }
      fullResponse += delta;
      reply.raw.write(delta);
    }

    if (fullResponse) {
      session.chat_history.push({ role: 'assistant', content: fullResponse, persona, ts: Date.now() });
    }

    if (headersWritten) {
      reply.raw.end();
    } else {
      return reply.status(500).send({ error: 'chat_failed' });
    }
  } catch (err) {
    request.log.error(err, 'session chat stream error');
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

export function sessionChatHistoryHandler(request, reply) {
  const { id } = request.params;
  const session = getSession(id);
  if (!session) return reply.status(404).send({ error: 'session_not_found' });
  return reply.send({ history: session.chat_history || [] });
}
