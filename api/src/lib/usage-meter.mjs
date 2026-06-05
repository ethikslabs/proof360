// VENDORED COPY — do not edit here. Source of truth: meter/index.js. Re-sync: node meter/sync.mjs
// @ethikslabs/meter — capture one provider call's token usage at the DIRECT call site.
//
// Atomic-append to the unified usage ledger. Fire-and-forget: never throws, never blocks
// inference. This is the estate's usage SSOT capture point — every direct provider call
// (Bedrock, NVIDIA, OpenAI, Azure, Anthropic, Gemini, xAI, Perplexity) emits one event.
// It is NOT a tollgate: the meter does not sit in the request path, it only records.
//
// Polyglot twin: meter.py (same record shape, same ledger path).
// Schema: CONTROL/standards/usage-event.v1.json.
//
// A repo declares its identity once via env (ETHIKS_ACTOR, ETHIKS_SPV) or passes it per call.
// Ledger path: $USAGE_LEDGER, else ~/.ethikslabs/usage/usage.ndjson  (EC2 -> /home/ec2-user/...).

import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

export const ledgerPath = process.env.USAGE_LEDGER || join(homedir(), '.ethikslabs', 'usage', 'usage.ndjson');
const DEFAULT_ACTOR = process.env.ETHIKS_ACTOR || 'unknown';
const DEFAULT_SPV = process.env.ETHIKS_SPV || null;
let dirReady = false;

// Normalise heterogeneous provider response shapes to { in, out }.
// Covers OpenAI-compatible (prompt_tokens/completion_tokens), Anthropic (input_tokens/output_tokens),
// and Bedrock Converse (inputTokens/outputTokens).
export function extractUsage(response) {
  const u = response?.usage || response?.Usage || {};
  const inT = u.prompt_tokens ?? u.input_tokens ?? u.inputTokens ?? u.promptTokens ?? 0;
  const outT = u.completion_tokens ?? u.output_tokens ?? u.outputTokens ?? u.completionTokens ?? 0;
  return { in: Number(inT) || 0, out: Number(outT) || 0 };
}

// Best-effort provider inference from a model id, for call sites that only know the model
// (e.g. via-VECTOR responses). Bedrock inference-profile prefixes (au./us./global.) and
// amazon./anthropic. resolve to bedrock. Order matters — specific providers before the broad rule.
export function providerForModel(model = '') {
  const m = String(model).toLowerCase();
  if (/nemotron|nim|nvidia/.test(m)) return 'nvidia';
  if (/gpt-|^o1|^o3|text-embedding/.test(m)) return 'openai';
  if (/gemini/.test(m)) return 'gemini';
  if (/grok/.test(m)) return 'xai';
  if (/sonar|perplexity/.test(m)) return 'perplexity';
  if (/claude|anthropic|nova|titan|amazon\.|^au\.|^us\.|^global\.|llama|mistral|deepseek|cohere/.test(m)) return 'bedrock';
  return 'unknown';
}

// Build a usage-event.v1 record. Accepts either { tokens: {in,out,total} } or flat { in, out }.
export function buildRecord(fields = {}) {
  const tok = fields.tokens || { in: fields.in ?? 0, out: fields.out ?? 0 };
  const inT = tok.in ?? 0;
  const outT = tok.out ?? 0;
  return {
    schema: 'usage-event.v1',
    ts: new Date().toISOString(),
    actor: fields.actor || DEFAULT_ACTOR,
    spv: fields.spv || DEFAULT_SPV,
    source_repo: fields.source_repo || fields.spv || DEFAULT_SPV,
    provider: fields.provider || 'unknown',
    model: fields.model || 'unknown',
    region: fields.region ?? null,
    tokens: { in: inT, out: outT, total: tok.total ?? (inT + outT) },
    latency_ms: fields.latency_ms ?? null,
    correlation_id: fields.correlation_id ?? null,
    measurement_source: fields.measurement_source || 'call-site',
  };
}

// Returns the record (for inspection/tests). Swallows all errors — metering must never crash
// inference. The write is a synchronous O_APPEND of one JSON line (<4KB): atomic across processes
// (no lock) and durable (no lost-on-exit race for short-lived scripts). The cost is a sub-ms local
// syscall, negligible next to the seconds-long LLM call it follows, and it runs AFTER the response.
export function emit(fields) {
  let rec;
  try {
    rec = buildRecord(fields);
  } catch {
    return null;
  }
  try {
    if (!dirReady) {
      mkdirSync(dirname(ledgerPath), { recursive: true });
      dirReady = true;
    }
    appendFileSync(ledgerPath, JSON.stringify(rec) + '\n', { flag: 'a' });
  } catch {
    /* never throw from metering */
  }
  return rec;
}

export default { emit, buildRecord, extractUsage, providerForModel, ledgerPath };
