import { makeObservedSignal } from '../../rendering/protocol.js';

const NOW = new Date().toISOString();
const TURN_0 = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 min ago

// Gap signals — deficiencies that drive vendor recommendations
export const MOCK_GAP_SIGNALS = [
  makeObservedSignal({
    id: 'no_soc2_detected',
    type: 'compliance_gap',
    polarity: 'gap',
    domain: 'compliance',
    value: 'No SOC 2 detected',
    source: 'github_scan',
    confidence: 0.82,
    observed_at: TURN_0,
    last_verified: TURN_0,
    conversation_turn: 0,
    disprovable_by: 'Link to existing SOC 2 certificate, SOC 2 report URL, or say "we have SOC 2 in progress"',
  }),
  makeObservedSignal({
    id: 'no_ir_controls',
    type: 'security_gap',
    polarity: 'gap',
    domain: 'security',
    value: 'No IR controls in repo',
    source: 'github_scan',
    confidence: 0.78,
    observed_at: TURN_0,
    last_verified: TURN_0,
    conversation_turn: 0,
    disprovable_by: 'Link to incident response policy doc or runbook',
  }),
  makeObservedSignal({
    id: 'au_healthcare_enterprise',
    type: 'market_context',
    polarity: 'gap',
    domain: 'compliance',
    value: 'AU healthcare enterprise target',
    source: 'conversation',
    confidence: 0.95,
    observed_at: NOW,
    last_verified: NOW,
    conversation_turn: 1,
    disprovable_by: 'Clarify if healthcare is not your primary market',
  }),
];

// Capability signals — existing strengths
export const MOCK_CAPABILITY_SIGNALS = [
  makeObservedSignal({
    id: 'seed_stage',
    type: 'stage',
    polarity: 'capability',
    domain: 'financial',
    value: 'Seed stage — AU Pty Ltd',
    source: 'conversation',
    confidence: 0.95,
    observed_at: NOW,
    last_verified: NOW,
    conversation_turn: 0,
    disprovable_by: 'Clarify if company structure is different',
  }),
  makeObservedSignal({
    id: 'cloudflare_active',
    type: 'capability',
    polarity: 'capability',
    domain: 'security',
    value: 'Cloudflare active on domain',
    source: 'url_scrape',
    confidence: 0.91,
    observed_at: TURN_0,
    last_verified: TURN_0,
    conversation_turn: 0,
    disprovable_by: 'Domain scan — if you believe this is wrong, let us know',
  }),
];

export const MOCK_SIGNALS = [...MOCK_GAP_SIGNALS, ...MOCK_CAPABILITY_SIGNALS];
