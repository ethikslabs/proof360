// Register advisory — the "guide, not upsell" join between the estate registers and
// the proof360 conversation (PROOF360-REGISTER-ADVISORY-JOIN-001).
//
// Four ratified advisory laws (John "Guide" ruling 2026-07-15) are encoded in the
// RESPONSE SHAPE, not left to the UI's discretion:
//   1. Advisory speaks only inside the conversation — this service returns data for
//      an in-stream card + thinking lines; there is no banner/module payload.
//   2. An honest zero is an ANSWER: match_count 0 still carries total/sources/derived_at
//      so the customer sees what WAS searched ("0 of 631 models · 9 sources · derived
//      14 Jul"), never an apology or a bluffed match.
//   3. Free sorts first: ordering is enforced HERE from the register's own
//      `commercial` field — the UI cannot re-rank a paid item above a free one.
//   4. The paid lane is a separate `paid_rail` field rendered BELOW the free answer,
//      framed in the customer's own AWS billing, margin disclosed at quote.
//
// The registers are verbatim projection snapshots (see ../data/registers/PROVENANCE.md).
// Register, NOT router: nothing here routes inference.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REGISTER_DIR = path.join(HERE, '..', 'data', 'registers');

let cache = null;

function loadRegisters() {
  if (cache) return cache;
  const models = JSON.parse(readFileSync(path.join(REGISTER_DIR, 'models.register.json'), 'utf8'));
  const data = JSON.parse(readFileSync(path.join(REGISTER_DIR, 'data.register.json'), 'utf8'));

  const modelEntries = [];
  for (const [source, entries] of Object.entries(models)) {
    if (source === '_meta' || !Array.isArray(entries)) continue;
    for (const e of entries) modelEntries.push(e);
  }
  const modelSources = Object.keys(models).filter((k) => k !== '_meta' && Array.isArray(models[k]));

  cache = {
    models: { entries: modelEntries, sources: modelSources, meta: models._meta || {} },
    data: {
      entries: data['aws-open-data'] || [],
      paidRail: data['aws-data-exchange'] || null,
      meta: data._meta || {},
    },
  };
  return cache;
}

// Terms: lowercase words minus stopwords. Short function words never match register text.
// Ask-shape and register-generic words are stopped too — "find open data" must not
// match OpenAI/OpenOrca on "open"; the ask words describe the ASK, not the domain.
const STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'for', 'of', 'in', 'on', 'to', 'with', 'about',
  'what', 'which', 'is', 'are', 'there', 'any', 'do', 'does', 'we', 'our', 'my',
  'i', 'you', 'can', 'could', 'should', 'me', 'us', 'that', 'this', 'need', 'want',
  'data', 'dataset', 'datasets', 'model', 'models', 'ai', 'ml', 'help', 'have',
  'use', 'used', 'using', 'open', 'public', 'available', 'free', 'paid',
  'find', 'recommend', 'suggest', 'look', 'looking', 'search', 'source', 'sources',
  'best', 'good', 'new', 'get', 'give', 'show', 'set', 'sets', 'train', 'training',
]);

export function extractTerms(query) {
  return [...new Set(
    String(query || '')
      .toLowerCase()
      .split(/[^a-z0-9-]+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
  )];
}

function scoreText(terms, ...fields) {
  let score = 0;
  for (const [weight, text] of fields) {
    if (!text) continue;
    const lc = String(Array.isArray(text) ? text.join(' ') : text).toLowerCase();
    for (const t of terms) if (lc.includes(t)) score += weight;
  }
  return score;
}

// ── models ─────────────────────────────────────────────────────────────────────
// Model entries carry no industry/domain tags, so domain queries ("soil", "vineyard")
// honestly zero — that is the register telling the truth, not a search failure.
//
// Capability words DO live in the register (input/output modalities), so an ask like
// "which models can process images" must match them — a zero there would be a FALSE
// zero, which the honest-zero law forbids in both directions: never bluff a match,
// never bluff a miss.
const CAPABILITY_TERMS = {
  image: 'IMAGE', images: 'IMAGE', vision: 'IMAGE', visual: 'IMAGE', multimodal: 'IMAGE',
  photo: 'IMAGE', photos: 'IMAGE',
  audio: 'AUDIO', speech: 'AUDIO', voice: 'AUDIO', transcribe: 'AUDIO', transcription: 'AUDIO',
  video: 'VIDEO', videos: 'VIDEO',
  embedding: 'EMBEDDING', embeddings: 'EMBEDDING',
};

function capabilityScore(terms, entry) {
  const modalities = new Set([...(entry.input || []), ...(entry.output || [])].map((m) => String(m).toUpperCase()));
  let score = 0;
  for (const t of terms) {
    const cap = CAPABILITY_TERMS[t];
    if (cap && modalities.has(cap)) score += 3;
  }
  return score;
}

export function adviseModels(query, { limit = 5 } = {}) {
  const { models } = loadRegisters();
  const terms = extractTerms(query);
  const scored = terms.length
    ? models.entries
        .map((e) => ({
          e,
          s: scoreText(terms, [2, e.name], [2, e.provider], [1, e.model_id]) + capabilityScore(terms, e),
        }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
    : [];
  const matches = scored.slice(0, limit).map(({ e }) => ({
    source: e.source,
    model_id: e.model_id,
    // Sparse register rows (e.g. openai-direct tts-1/whisper-1) carry only an id —
    // fall back so the card never renders an undefined name or dangling provider.
    name: e.name || e.model_id,
    provider: e.provider || e.source,
    input: e.input,
    output: e.output,
  }));
  return {
    matches,
    // Honest count: TOTAL hits, not the display page — "5 fit" when 150 do is a lie.
    match_count: scored.length,
    total: models.meta.total_entries ?? models.entries.length,
    sources: models.sources.length,
    derived_at: models.meta.generated_at || null,
  };
}

// ── data ───────────────────────────────────────────────────────────────────────
export function adviseData(query, { limit = 5 } = {}) {
  const { data } = loadRegisters();
  const terms = extractTerms(query);
  const scored = terms.length
    ? data.entries
        .map((e) => ({ e, s: scoreText(terms, [3, e.tags], [2, e.name], [1, e.description]) }))
        .filter((x) => x.s > 0)
    : [];

  // Law 3: free sorts first — from the register's own commercial field, then by score.
  scored.sort((a, b) => {
    const freeA = a.e.commercial === 'free' ? 0 : 1;
    const freeB = b.e.commercial === 'free' ? 0 : 1;
    return freeA - freeB || b.s - a.s;
  });

  const page = scored.slice(0, limit);
  const matches = page.map(({ e }) => ({
    dataset_id: e.dataset_id,
    name: e.name,
    commercial: e.commercial,
    tags: (e.tags || []).slice(0, 6),
    description: (e.description || '').replace(/\s+/g, ' ').slice(0, 220),
    license: e.license ? String(e.license).slice(0, 120) : null,
    // Checkable provenance — the public registry page for this exact dataset.
    link: e.dataset_id ? `https://registry.opendata.aws/${e.dataset_id}/` : null,
  }));

  // Law 4: the paid lane is a rail below the answer, in the CUSTOMER'S billing frame.
  const rail = data.paidRail || {};
  return {
    matches,
    // Honest count: TOTAL hits, not the display page (matches carries the top slice).
    match_count: scored.length,
    total: data.meta.counts?.['aws-open-data'] ?? data.entries.length,
    derived_at: data.meta.generated_at || null,
    paid_rail: {
      label: 'AWS Data Exchange',
      commercial: rail.commercial || 'paid',
      billing_frame: rail.rail
        || "bills to the customer's AWS account (EDP commit burn-down; marketplace margin) — FORUM",
      enumeration: rail.enumeration || 'search per customer need',
      margin: 'disclosed at quote',
    },
  };
}

export function registerAdvisory(query, opts = {}) {
  return {
    query: String(query || ''),
    models: adviseModels(query, opts),
    data: adviseData(query, opts),
  };
}

// Test seam.
export function _resetRegisterCache() {
  cache = null;
}
