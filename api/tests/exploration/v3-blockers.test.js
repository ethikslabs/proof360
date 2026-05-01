// Regression Tests — v3 Session Lifecycle Structural Blockers
// **Validates: Requirements 1.1, 1.4, 1.6, 1.7**
//
// These tests encode the EXPECTED (correct) behavior.
// They preserve previously fixed v3 blocker behavior.

import { describe, it, vi } from 'vitest';
import assert from 'node:assert/strict';
import { recompute } from '../../src/services/recompute.js';
import { evaluateClaims } from '../../src/services/trust-client.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal mock session for Tier 1 (not published) */
function makeTier1Session(overrides = {}) {
  return { id: 'test-session-1', status: 'active', ...overrides };
}

/** Minimal mock signals that trigger at least one gap */
function makeSignals() {
  return [
    { field: 'compliance_status', current_value: 'none', inferred_value: 'none', status: 'inferred' },
    { field: 'identity_model', current_value: 'password_only', inferred_value: 'password_only', status: 'inferred' },
    { field: 'insurance_status', current_value: 'none', inferred_value: 'none', status: 'inferred' },
    { field: 'customer_type', current_value: 'enterprise', inferred_value: 'enterprise', status: 'inferred' },
    { field: 'stage', current_value: 'seed', inferred_value: 'seed', status: 'inferred' },
    { field: 'sector', current_value: 'saas', inferred_value: 'saas', status: 'inferred' },
  ];
}

/** Minimal mock recon_outputs */
function makeReconOutputs() {
  return [
    { source: 'dns', payload: { dmarc_policy: 'none', spf_policy: 'missing' } },
    { source: 'http', payload: { has_hsts: false, has_csp: false } },
  ];
}

// Tier 1 locked shape: ONLY these keys are allowed per gap
const TIER1_ALLOWED_GAP_KEYS = new Set(['id', 'description', 'confidence', 'evidence_summary']);

// Tier 1 FORBIDDEN keys — these must NOT appear on Tier 1 gaps
const TIER1_FORBIDDEN_GAP_KEYS = [
  'severity', 'framework_impact', 'remediation',
  'veritas_class', 'veritas_confidence', 'render_caveat',
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Regression: v3 Structural Blockers', () => {

  // Test 1: Tier 1 Field Leak
  // Blocker 1.6 — recompute leaks severity, framework_impact, remediation,
  // veritas_class, veritas_confidence, render_caveat into Tier 1 gaps.
  // Expected: Tier 1 gaps contain ONLY { id, description, confidence, evidence_summary }
  it('Test 1: Tier 1 gaps contain ONLY locked shape fields (no severity/framework_impact/remediation leak)', () => {
    const result = recompute({
      signals: makeSignals(),
      recon_outputs: makeReconOutputs(),
      session: makeTier1Session(),
      aws_programs: [],
      gaps_db: [],
    });

    const gaps = result.derived_state.gaps;
    assert.ok(Array.isArray(gaps), 'derived_state.gaps should be an array');
    assert.ok(gaps.length > 0, 'should have at least one triggered gap');

    for (const gap of gaps) {
      const gapKeys = Object.keys(gap);
      for (const forbidden of TIER1_FORBIDDEN_GAP_KEYS) {
        assert.ok(
          !gapKeys.includes(forbidden),
          `Tier 1 gap "${gap.id}" leaks forbidden field "${forbidden}". ` +
          `Allowed keys: ${[...TIER1_ALLOWED_GAP_KEYS].join(', ')}. ` +
          `Actual keys: ${gapKeys.join(', ')}`
        );
      }
    }
  });

  // Test 2: Signal List Missing
  // Blocker 1.7 — recompute does not return a signals array in derived_state.
  // Expected: derived_state.signals is a non-empty array with correct shape.
  it('Test 2: derived_state.signals is a non-empty array with { field, current_value, inferred_value, status }', () => {
    const result = recompute({
      signals: makeSignals(),
      recon_outputs: makeReconOutputs(),
      session: makeTier1Session(),
      aws_programs: [],
      gaps_db: [],
    });

    const signals = result.derived_state.signals;
    assert.ok(Array.isArray(signals), 'derived_state.signals should be an array');
    assert.ok(signals.length > 0, 'derived_state.signals should be non-empty');

    for (const sig of signals) {
      assert.ok('field' in sig, `signal entry missing "field": ${JSON.stringify(sig)}`);
      assert.ok('current_value' in sig, `signal entry missing "current_value": ${JSON.stringify(sig)}`);
      assert.ok('inferred_value' in sig, `signal entry missing "inferred_value": ${JSON.stringify(sig)}`);
      assert.ok('status' in sig, `signal entry missing "status": ${JSON.stringify(sig)}`);
    }
  });

  // Test 3: Fallback Confirm All
  // Blocker 1.4 — trust-client.js returns { confirmed: true, mos: 8, fallback: true }
  // when all paths fail. Expected: should return { confirmed: false }.
  it('Test 3: trust-client returns { confirmed: false } when all paths fail (no fallback-confirm-all)', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const claims = [
        {
          question: 'Test claim',
          evidence: 'Test evidence',
          metadata: { gapId: 'test_gap_1' },
        },
      ];

      const resultsPromise = evaluateClaims(claims, 'test-session');
      await vi.runAllTimersAsync();
      const results = await resultsPromise;
      const result = results['test_gap_1'];

      assert.ok(result, 'should have a result for test_gap_1');
      assert.strictEqual(
        result.confirmed,
        false,
        `When VERITAS/Trust360 is unavailable, confirmed should be false. ` +
        `Got: ${JSON.stringify(result)}`
      );
      // Must NOT have fallback: true
      assert.ok(
        result.fallback !== true,
        `Result should not have fallback: true. Got: ${JSON.stringify(result)}`
      );
    } finally {
      warnSpy.mockRestore();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  // Test 4: Density uses confidence not severity
  // The locked Tier 1 shape specifies density counts by confidence level
  // (high/medium/low), not severity level (critical/high/medium/low).
  // Expected: density has { total, high, medium, low } — no "critical" key.
  it('Test 4: density counts by confidence level (high/medium/low), not severity (critical/high/medium/low)', () => {
    const result = recompute({
      signals: makeSignals(),
      recon_outputs: makeReconOutputs(),
      session: makeTier1Session(),
      aws_programs: [],
      gaps_db: [],
    });

    const density = result.derived_state.density;
    assert.ok(density, 'derived_state.density should exist');
    assert.ok(typeof density.total === 'number', 'density.total should be a number');
    assert.ok(typeof density.high === 'number', 'density.high should be a number');
    assert.ok(typeof density.medium === 'number', 'density.medium should be a number');
    assert.ok(typeof density.low === 'number', 'density.low should be a number');

    // The critical key should NOT exist — density is by confidence, not severity
    assert.ok(
      !('critical' in density),
      `density should NOT have a "critical" key (severity-based). ` +
      `Density should count by confidence level (high/medium/low). ` +
      `Got: ${JSON.stringify(density)}`
    );

    // Verify counts add up
    assert.strictEqual(
      density.high + density.medium + density.low,
      density.total,
      `Confidence counts should sum to total. ` +
      `high(${density.high}) + medium(${density.medium}) + low(${density.low}) != total(${density.total})`
    );
  });

  // Test 5: Tier 1 does not return trust_score (sanity check)
  // This should already pass — recompute strips trust_score for non-tier2 sessions.
  it('Test 5: Tier 1 (non-tier2_published) does not return trust_score (sanity check)', () => {
    const result = recompute({
      signals: makeSignals(),
      recon_outputs: makeReconOutputs(),
      session: makeTier1Session(),
      aws_programs: [],
      gaps_db: [],
    });

    assert.ok(
      result.derived_state.trust_score === undefined || result.derived_state.trust_score === null,
      `Tier 1 derived_state should not contain trust_score. ` +
      `Got: ${result.derived_state.trust_score}`
    );
  });
});
