// NIM inference client — routes through ai-gateway (port 3003)
// Gateway handles provider routing and credentials. No keys needed here.

const GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:3003/v1';
const NIM_MODEL   = process.env.NIM_MODEL || 'nvidia/llama-3.1-nemotron-ultra-253b-v1';
const TIMEOUT_MS  = 30_000;

// System prompt shaping NIM output to match Trust360 response contract
const SYSTEM_PROMPT = `You are a precise trust and compliance evaluator.
Given a claim and supporting evidence, assess whether the claim is supported.
Respond only with valid JSON in this exact shape:
{
  "supported": true | false,
  "confidence": <number 1–10>,
  "reasoning": "<one sentence>"
}
Do not include any other text.`;

// Evaluate a trust claim via NIM.
// Returns { consensus: { mos, variance, agreement }, traceId } — same shape as Trust360.
export async function nimEvaluateClaim({ question, evidence, metadata, session_id }) {
  const raw = await nimComplete({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: _buildPrompt(question, evidence) },
    ],
    session_id,
  });

  return _parseResponse(raw, metadata);
}

// Check whether the gateway is reachable — used by trust-client.js before routing
export async function isNIMAvailable() {
  try {
    const healthUrl = GATEWAY_URL.replace(/\/v1\/?$/, '') + '/health';
    const res = await fetch(healthUrl, { signal: AbortSignal.timeout(3_000) });
    if (!res.ok) return false;
    const body = await res.json();
    return body.providers?.nim === true;
  } catch {
    return false;
  }
}

// Raw chat completions — routed through gateway
// All VECTOR calls carry { tenant_id, session_id, correlation_id } per v3 contract.
export async function nimComplete({ messages, temperature = 0.1, session_id }) {
  const correlationId = session_id || 'proof360';
  const res = await fetch(`${GATEWAY_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Correlation-ID': correlationId },
    body: JSON.stringify({
      model: NIM_MODEL,
      messages,
      temperature,
      tenant_id: 'proof360',
      session_id: session_id || null,
      correlation_id: session_id || null,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`NIM returned ${res.status}: ${body.slice(0, 100)}`);
  }

  return await res.json();
}

// --- internals ---

function _buildPrompt(question, evidence) {
  return `Claim to evaluate: ${question}\n\nEvidence:\n${evidence}`;
}

function _parseResponse(raw, metadata) {
  const text = raw.choices?.[0]?.message?.content ?? '';

  let parsed;
  try {
    // Nemotron thinking model may wrap output in <think> tags — strip them
    const clean = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`NIM returned non-JSON: ${text.slice(0, 150)}`);
  }

  const mos = typeof parsed.confidence === 'number'
    ? Math.max(1, Math.min(10, parsed.confidence))
    : parsed.supported ? 7 : 4;

  return {
    traceId: `nim-${Date.now()}-${metadata?.gapId ?? 'unknown'}`,
    consensus: {
      mos,
      variance: 0,
      agreement: 'full',
    },
    provider: 'nim-gateway',
    model: NIM_MODEL,
    reasoning: parsed.reasoning ?? null,
  };
}
