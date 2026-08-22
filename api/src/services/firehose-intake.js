// The firehose intake (ETHL firehose keepers 2026-08-23) — the cold read from nothing:
// no site, no deck, the founder just talks their idea. The probe LISTENS instead of
// scanning. Every fragment caught becomes an inferred claim (provenance
// founder-utterance) on the same truth ladder a URL cold read fills; the reflect-back
// turns the stream into something the confirm ceremony can confirm — "catch fragments,
// return them better." Also the shared front door for the Stripe Projects extension
// (Clara: "where do you go from a Stripe Project?").
import { chatComplete } from '../lib/inference.js';
import { buildClaimRecord } from './claims-projection.js';

// Parsed utterance field → Record field (same target fields as the URL signal map, so
// idea / deck / site all feed ONE Record). Business-identity heavy on purpose: the
// register triggers want stage/sector/geo/raise, which a spoken idea reveals freely.
const UTTERANCE_FIELD_MAP = {
  product_type: 'product.type',
  customer_type: 'market.customer_type',
  data_sensitivity: 'data.sensitivity',
  stage: 'company.stage',
  sector: 'company.sector',
  geo_market: 'company.geo_market',
  has_raised_institutional: 'company.has_raised_institutional',
  infrastructure: 'infrastructure.cloud_provider',
  compliance_status: 'compliance.soc2_status',
  use_case: 'company.use_case',
};

const EMPTY = new Set([undefined, null, '', 'Unknown', 'unknown', 'None', 'none']);

export function buildUtteranceClaims(extracted) {
  if (!extracted || typeof extracted !== 'object') return [];
  const claims = [];
  for (const [key, field] of Object.entries(UTTERANCE_FIELD_MAP)) {
    const value = extracted[key];
    if (EMPTY.has(value)) continue;
    claims.push(buildClaimRecord({
      field,
      value,
      provenance: { method: 'founder-utterance', detail: 'from what you told me' },
    }));
  }
  return claims;
}

// Human label per field for the reflect-back (kept local so the firehose reads in its
// own voice; overlaps claims-projection's labels by intent, not by import coupling).
const SAY = {
  'product.type': (v) => `a ${v}`,
  'market.customer_type': (v) => `selling to ${String(v).toLowerCase()}`,
  'data.sensitivity': (v) => `handling ${String(v).toLowerCase()}`,
  'company.stage': (v) => `around ${v}`,
  'company.sector': (v) => `in ${v}`,
  'company.geo_market': (v) => `focused on ${v}`,
  'company.has_raised_institutional': (v) => (String(v) === 'true' ? 'already raised institutionally' : 'not raised institutionally yet'),
  'infrastructure.cloud_provider': (v) => `leaning on ${v}`,
  'compliance.soc2_status': (v) => `${v} on compliance`,
  'company.use_case': (v) => `${v}`,
};

// Catch fragments, return them better. A plain-English read of what was heard, then
// hands control back: confirm or fix. Never a verdict — it's a read.
export function reflectBack(claims) {
  if (!claims?.length) {
    return "I didn't quite catch enough to work with yet — tell me more about what you're building, who it's for, and where you're at.";
  }
  const parts = claims.map((c) => (SAY[c.field] ? SAY[c.field](c.value) : `${c.field.split('.').pop()}: ${c.value}`));
  const list = parts.length === 1
    ? parts[0]
    : `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`;
  return `Here's what I caught: ${list}. Did I get that right? Correct anything that's off and we'll build from there.`;
}

// The thin Claude wrapper — parse a spoken idea into the same field schema the URL
// path uses. Kept minimal; the pure pieces above carry the logic and the tests.
const UTTERANCE_SCHEMA_KEYS = Object.keys(UTTERANCE_FIELD_MAP);

export async function extractFromUtterance(utterance, { session_id = null } = {}) {
  const prompt = `A founder is describing their startup idea out loud — informal, half-formed, jumping around. Catch what you can. Extract ONLY what they actually said or clearly implied; use "Unknown" for anything not stated. Do not invent.

Founder said:
"""
${utterance}
"""

Respond with ONLY valid JSON (no markdown):
{
  "product_type": "B2B SaaS" | "B2C App" | "Platform" | "API" | "Software product" | "Unknown",
  "customer_type": "Enterprise (B2B)" | "SMB (B2B)" | "Consumer (B2C)" | "Mixed" | "Unknown",
  "data_sensitivity": "PII" | "Financial data" | "Healthcare data" | "Customer data" | "None" | "Unknown",
  "stage": "Pre-seed" | "Seed" | "Series A" | "Series B+" | "Unknown",
  "sector": "healthcare" | "fintech" | "financial_services" | "government" | "legal" | "ecommerce" | "education" | "saas" | "infrastructure" | "unknown",
  "geo_market": "AU" | "US" | "UK" | "SG" | "Global" | "Unknown",
  "has_raised_institutional": true | false | null,
  "infrastructure": "AWS" | "GCP" | "Azure" | "Cloudflare" | "Unknown",
  "compliance_status": "pre-audit" | "in progress" | "certified" | "Unknown",
  "use_case": "one plain-English phrase for what it does, or Unknown",
  "company_summary": "2-3 sentence read of what they're building, who for, where — plain English"
}`;
  const response = await chatComplete({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 700,
    messages: [{ role: 'user', content: prompt }],
    correlation_id: session_id || 'proof360-firehose',
  });
  const text = response.choices[0].message.content.trim();
  const json = text.startsWith('```') ? text.replace(/^```\w*\n?/, '').replace(/```$/, '').trim() : text;
  const parsed = JSON.parse(json);
  // keep only known keys; ignore anything the model added
  const clean = {};
  for (const k of [...UTTERANCE_SCHEMA_KEYS, 'company_summary']) if (k in parsed) clean[k] = parsed[k];
  return clean;
}
