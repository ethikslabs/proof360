// frontend/src/rendering/protocol.js

// Confidence represents observation confidence — how certain we are this signal
// is currently true. It is NOT predictive confidence about recommendation outcomes.

export function makeObservedSignal(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type: 'unknown',
    polarity: 'gap',           // 'gap' | 'capability'
    domain: 'compliance',      // 'compliance' | 'security' | 'financial' | 'identity' | 'legal' | 'team'
    value: '',
    source: 'conversation',    // 'github_scan' | 'conversation' | 'url_scrape' | 'live_probe' | 'self_disclosed'
    confidence: 0.8,
    observed_at: now,
    last_verified: now,
    freshness_weight: 1.0,  // frozen at 1.0 at creation — always call computeFreshnessWeight(signal) for live value
    conversation_turn: 0,
    disprovable_by: '',
    // Evidence-conflict shape (honesty wave, item 1): true only when a live
    // probe fact disagrees with a text-derived claim about the SAME thing
    // (currently wired for hosting/cloud-provider only). `conflict` names both
    // witnesses so the drawer can ask "which is right?" instead of silently
    // picking one.
    conflicted: false,
    conflict: null,           // { probe_says, source_says } when conflicted
    ...overrides,
  };
}

export function makeCanonicalClaim(overrides = {}) {
  return {
    id: '',
    statement: '',
    domain: 'compliance',
    sources: [],
    confidence: 0.95,
    valid_from: null,
    valid_until: null,
    ...overrides,
  };
}

export function makeGuidanceBlock(overrides = {}) {
  return {
    claims: [],
    signals: [],
    persona: 'edison',
    synthesis: '',
    next_move: '',
    confidence: 0.8,
    generated_at: new Date().toISOString(),
    temporal_context: null,
    ...overrides,
  };
}

// Freshness decay: 1.0 → 0 over 14 days from last_verified.
// Self-disclosed signals never decay (they are current until corrected).
export function computeFreshnessWeight(signal) {
  if (signal.source === 'self_disclosed') return 1.0;
  const ageMs = Date.now() - new Date(signal.last_verified).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - ageDays / 14);
}

// Returns 'current' | 'stale'
export function signalFreshness(signal) {
  return computeFreshnessWeight(signal) >= 0.5 ? 'current' : 'stale';
}

// Grade words, not fake percentages (honesty wave item 2). A signal's numeric
// `confidence` is a real internal weight (used for freshness decay, ranking,
// etc.) but showing it to a founder as "60%" implies false statistical
// precision the system doesn't have. Grade language is honest about what kind
// of claim this is: something we watched happen (observed), something we're
// fairly sure of (confirmed), or something we're guessing at (probable).
//
// `live_probe` always reads 'observed' regardless of its numeric confidence —
// a technical scan is a different KIND of evidence than an inference, not
// just a more-confident one. Everything else falls back to the numeric
// threshold: >=0.85 reads 'confirmed', below that reads 'probable'.
export function gradeWord(signal) {
  if (signal?.source === 'live_probe') return 'observed';
  return (signal?.confidence ?? 0) >= 0.85 ? 'confirmed' : 'probable';
}

const SOURCE_DESCRIPTIONS = {
  github_scan: 'GitHub scan',
  conversation: 'from conversation',
  url_scrape: 'inferred from company research',
  live_probe: 'live probe',
  self_disclosed: 'your word',
};

export function sourceDescription(signal) {
  return SOURCE_DESCRIPTIONS[signal?.source] || signal?.source || 'unknown source';
}

// The full grade line for the evidence drawer, e.g. "probable · inferred from
// company research" or "confirmed · your word". Never a percentage.
export function gradeLabel(signal) {
  return `${gradeWord(signal)} · ${sourceDescription(signal)}`;
}

// Format freshness label for the evidence drawer.
export function freshnessLabel(signal) {
  if (signalFreshness(signal) === 'current') {
    const t = new Date(signal.observed_at);
    const SYD = { timeZone: 'Australia/Sydney' };
    const time = t.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', ...SYD });
    const tzAbbr = new Intl.DateTimeFormat('en-AU', { timeZoneName: 'short', ...SYD })
      .formatToParts(t).find(p => p.type === 'timeZoneName')?.value ?? 'AEST';
    return `Current · observed ${time} ${tzAbbr}`;
  }
  const d = new Date(signal.last_verified);
  return `Stale · last verified ${d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;
}
