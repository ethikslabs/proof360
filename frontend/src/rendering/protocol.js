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
    source: 'conversation',    // 'github_scan' | 'conversation' | 'url_scrape' | 'self_disclosed'
    confidence: 0.8,
    observed_at: now,
    last_verified: now,
    freshness_weight: 1.0,  // frozen at 1.0 at creation — always call computeFreshnessWeight(signal) for live value
    conversation_turn: 0,
    disprovable_by: '',
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
