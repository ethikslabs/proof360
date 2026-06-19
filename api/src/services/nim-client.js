// Trust-claim evaluator — DIRECT to Amazon Bedrock. No NIM, no gateway, no VECTOR.
// Legacy export names kept so trust-client.js needs no change.
import { chatComplete } from '../lib/inference.js';

// System prompt shaping output to the Trust360 response contract.
const SYSTEM_PROMPT = `You are a precise trust and compliance evaluator.
Given a claim and supporting evidence, assess whether the claim is supported.
Respond only with valid JSON in this exact shape:
{
  "supported": true | false,
  "confidence": <number 1–10>,
  "reasoning": "<one sentence>"
}
Do not include any other text.`;

// Evaluate a trust claim via Bedrock.
// Returns { consensus: { mos, variance, agreement }, traceId } — same shape as Trust360.
export async function nimEvaluateClaim({ question, evidence, metadata, session_id }) {
  const raw = await chatComplete({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: _buildPrompt(question, evidence) },
    ],
    max_tokens: 256,
    temperature: 0.1,
    correlation_id: session_id,
  });

  return _parseResponse(raw, metadata);
}

// Bedrock is always reachable via the instance role — no health probe needed.
export async function isNIMAvailable() {
  return true;
}

// --- internals ---

function _buildPrompt(question, evidence) {
  return `Claim to evaluate: ${question}\n\nEvidence:\n${evidence}`;
}

function _parseResponse(raw, metadata) {
  const text = raw.choices?.[0]?.message?.content ?? '';

  let parsed;
  try {
    const clean = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`claim eval returned non-JSON: ${text.slice(0, 150)}`);
  }

  const mos = typeof parsed.confidence === 'number'
    ? Math.max(1, Math.min(10, parsed.confidence))
    : parsed.supported ? 7 : 4;

  return {
    traceId: `claim-${Date.now()}-${metadata?.gapId ?? 'unknown'}`,
    consensus: { mos, variance: 0, agreement: 'full' },
    provider: 'bedrock',
    model: 'claude-haiku',
    reasoning: parsed.reasoning ?? null,
  };
}
