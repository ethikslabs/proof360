// proof360 inference — DIRECT to Amazon Bedrock. No gateway, no VECTOR, no keys.
//
// proof360 ships direct (ruling, repeated): inference goes straight to Bedrock via
// the EC2 instance role (or local AWS creds in dev). VECTOR is a future product and
// is NEVER a runtime dependency or carrier. There is no INFERENCE_URL, no
// localhost:3003, no Authorization header to manage — the AWS SDK signs with the
// instance role.
//
// Two entry points, both used estate-style:
//   chatComplete()  -> non-streaming, returns an OpenAI-shaped object so existing
//                      callers keep reading choices[0].message.content.
//   chatStream()    -> async generator of text deltas for the streaming chat surfaces.

import { BedrockRuntimeClient, ConverseCommand, ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import * as meter from './meter.mjs';

// PRIMARY ap-southeast-2, OVERFLOW us-east-1 (John ruling 2026-09-01). This replaces
// the 2026-07-14 us-east-1 pin, which existed to dodge regional volume limits: with a
// throttle-triggered overflow the limit is still covered and the ~1s cross-Pacific
// round trip is no longer paid on every call. The au.* residency lane the old comment
// called "dormant" IS what the primary profile wraps.
const REGION = process.env.BEDROCK_REGION || 'ap-southeast-2';
const FALLBACK_REGION = process.env.BEDROCK_FALLBACK_REGION || 'us-east-1';

// One client per region, constructed once and reused (keep-alive).
const _clients = new Map();
function clientFor(region) {
  let c = _clients.get(region);
  if (!c) { c = new BedrockRuntimeClient({ region }); _clients.set(region, c); }
  return c;
}

// Logical model name -> TAGGED application inference profile ARN (created 2026-09-01,
// EthiksLabs:* tags). Invoking through a profile is what makes Bedrock spend appear in
// Cost Explorer per service — a bare model id carries no resource tag. A profile ARN is
// REGION-SCOPED, so each lane needs both an AU and a US ARN.
const AIP = (region, id) => `arn:aws:bedrock:${region}:905418067035:application-inference-profile/${id}`;
const PROFILES = {
  haiku:  { 'ap-southeast-2': AIP('ap-southeast-2', 'i5gejhkam1p8'), 'us-east-1': AIP('us-east-1', '05e8gnx4ah1u') },
  sonnet: { 'ap-southeast-2': AIP('ap-southeast-2', '5zcajz7l57e0'), 'us-east-1': AIP('us-east-1', '6at71z07cvex') },
};
const MODEL_MAP = {
  'claude-haiku-4-5-20251001': 'haiku',
  'haiku':                     'haiku',
  'claude-sonnet-4-6':         'sonnet',
};
const DEFAULT_LANE = 'haiku';

// Returns the profile ARN for a lane in a region. A caller that passes a raw profile id
// (us./au./apac./global.) or a full ARN keeps using it verbatim in BOTH regions — only
// the named lanes swap ARNs on overflow.
function resolveBedrockId(model, region = REGION) {
  if (model && /^(arn:|au\.|us\.|apac\.|global\.)/.test(model)) return model;
  const lane = (model && MODEL_MAP[model]) || DEFAULT_LANE;
  return PROFILES[lane][region] || PROFILES[lane][REGION];
}

const THROTTLE = new Set([
  'ThrottlingException', 'TooManyRequestsException', 'ServiceQuotaExceededException',
  'ServiceUnavailableException', 'ModelNotReadyException',
]);
// Volume faults only. A credential/permission/model fault must NOT be retried in another
// region: it would fail twice as slowly and read as a regional problem in the logs.
function isThrottle(err) {
  if (!err) return false;
  if (THROTTLE.has(err.name)) return true;
  const status = err.$metadata?.httpStatusCode;
  return status === 429 || status === 503;
}

// Run `send` against the primary region; on a throttle only, retry in the overflow
// region with that region's profile ARN. Returns what was actually used so the meter
// records the real region and profile rather than the intended one.
async function withOverflow(model, send) {
  const primaryId = resolveBedrockId(model, REGION);
  try {
    return { out: await send(clientFor(REGION), primaryId), region: REGION, modelId: primaryId };
  } catch (err) {
    if (!isThrottle(err) || FALLBACK_REGION === REGION) throw err;
    const fbId = resolveBedrockId(model, FALLBACK_REGION);
    process.stderr.write(`[bedrock] throttled in ${REGION} (${err.name}) — overflowing to ${FALLBACK_REGION}\n`);
    return { out: await send(clientFor(FALLBACK_REGION), fbId), region: FALLBACK_REGION, modelId: fbId };
  }
}

// OpenAI-style messages -> Bedrock Converse. System messages are hoisted into the
// `system` field; the rest become alternating user/assistant turns.
function toConverse(messages) {
  const system = [];
  const conv = [];
  for (const m of messages || []) {
    if (m.role === 'system') { system.push({ text: String(m.content ?? '') }); continue; }
    conv.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: [{ text: String(m.content ?? '') }] });
  }
  return { system, conv };
}

function inferenceConfig(max_tokens, temperature) {
  const cfg = { maxTokens: max_tokens };
  if (temperature != null) cfg.temperature = temperature;
  return cfg;
}

// Non-streaming completion. Returns OpenAI-shaped { choices, model, usage }.
export async function chatComplete({ messages, model, max_tokens = 512, temperature, correlation_id }) {
  const { system, conv } = toConverse(messages);
  const { out, modelId } = await withOverflow(model, (c, id) => c.send(new ConverseCommand({
    modelId: id,
    messages: conv,
    ...(system.length ? { system } : {}),
    inferenceConfig: inferenceConfig(max_tokens, temperature),
  })));
  const text = (out.output?.message?.content || []).map((c) => c.text).filter(Boolean).join('');
  const usage = {
    prompt_tokens: out.usage?.inputTokens ?? 0,
    completion_tokens: out.usage?.outputTokens ?? 0,
    total_tokens: out.usage?.totalTokens ?? 0,
  };
  emitMeter(modelId, usage, correlation_id);
  return { choices: [{ message: { content: text } }], model: modelId, usage };
}

// Streaming completion. Yields text deltas; emits a meter event when usage arrives.
export async function* chatStream({ messages, model, max_tokens = 512, temperature, correlation_id }) {
  const { system, conv } = toConverse(messages);
  const { out: resp, modelId } = await withOverflow(model, (c, id) => c.send(new ConverseStreamCommand({
    modelId: id,
    messages: conv,
    ...(system.length ? { system } : {}),
    inferenceConfig: inferenceConfig(max_tokens, temperature),
  })));
  let usage = null;
  for await (const ev of resp.stream || []) {
    const delta = ev.contentBlockDelta?.delta?.text;
    if (delta) yield delta;
    if (ev.metadata?.usage) usage = ev.metadata.usage;
  }
  if (usage) {
    emitMeter(modelId, { prompt_tokens: usage.inputTokens ?? 0, completion_tokens: usage.outputTokens ?? 0 }, correlation_id);
  }
}

function emitMeter(model, usage, correlation_id) {
  try {
    meter.emit({
      provider: 'bedrock',
      model,
      correlation_id: correlation_id || 'proof360',
      ...meter.extractUsage({ usage }),
    });
  } catch {
    // metering is best-effort; never block inference on it
  }
}
