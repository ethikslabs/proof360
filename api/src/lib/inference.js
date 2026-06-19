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

const REGION = process.env.BEDROCK_REGION || process.env.AWS_REGION || 'ap-southeast-2';
const client = new BedrockRuntimeClient({ region: REGION });

// Logical model name -> Bedrock inference-profile id. On-demand Claude in
// ap-southeast-2 requires the `au.` cross-region inference profile.
const MODEL_MAP = {
  'claude-haiku-4-5-20251001': 'au.anthropic.claude-haiku-4-5-20251001-v1:0',
  'haiku':                     'au.anthropic.claude-haiku-4-5-20251001-v1:0',
  'claude-sonnet-4-6':         'au.anthropic.claude-sonnet-4-6',
};
const DEFAULT_MODEL = 'au.anthropic.claude-haiku-4-5-20251001-v1:0';

function resolveBedrockId(model) {
  if (!model) return DEFAULT_MODEL;
  if (/^(au|us|apac|global)\./.test(model)) return model; // already a profile id
  return MODEL_MAP[model] || DEFAULT_MODEL;
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
  const modelId = resolveBedrockId(model);
  const { system, conv } = toConverse(messages);
  const out = await client.send(new ConverseCommand({
    modelId,
    messages: conv,
    ...(system.length ? { system } : {}),
    inferenceConfig: inferenceConfig(max_tokens, temperature),
  }));
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
  const modelId = resolveBedrockId(model);
  const { system, conv } = toConverse(messages);
  const resp = await client.send(new ConverseStreamCommand({
    modelId,
    messages: conv,
    ...(system.length ? { system } : {}),
    inferenceConfig: inferenceConfig(max_tokens, temperature),
  }));
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
