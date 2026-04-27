// Preservation Property Tests — Unchanged Behaviors for Non-Remediation Paths
// **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**
//
// These tests MUST PASS on unfixed code to establish the baseline.
// They capture behavior that must NOT change during remediation.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recompute } from '../../src/services/recompute.js';
import { AWS_PROGRAMS } from '../../src/config/aws-programs.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Concrete signals that trigger multiple gaps for a realistic session */
function makeConcreteSignals() {
  return [
    { field: 'compliance_status', current_value: 'none', inferred_value: 'none', status: 'inferred' },
    { field: 'identity_model', current_value: 'password_only', inferred_value: 'password_only', status: 'inferred' },
    { field: 'insurance_status', current_value: 'none', inferred_value: 'none', status: 'inferred' },
    { field: 'customer_type', current_value: 'enterprise', inferred_value: 'enterprise', status: 'inferred' },
    { field: 'stage', current_value: 'Seed', inferred_value: 'Seed', status: 'inferred' },
    { field: 'sector', current_value: 'saas', inferred_value: 'saas', status: 'inferred' },
    { field: 'infrastructure', current_value: 'aws', inferred_value: 'aws', status: 'inferred' },
    { field: 'geo_market', current_value: 'AU', inferred_value: 'AU', status: 'inferred' },
    { field: 'product_type', current_value: 'B2B SaaS', inferred_value: 'B2B SaaS', status: 'inferred' },
    { field: 'has_raised_institutional', current_value: false, inferred_value: false, status: 'inferred' },
  ];
}

/** Concrete recon_outputs with DNS and HTTP data */
function makeConcreteReconOutputs() {
  return [
    { source: 'dns', payload: { dmarc_policy: 'none', spf_policy: 'missing', mx_provider: 'google' } },
    { source: 'http', payload: { has_hsts: false, has_csp: false, security_headers_score: 2 } },
    { source: 'certs', payload: { tls_version: '1.3', tls_is_current: true, cert_expiry_days: 90 } },
    { source: 'ip', payload: { ip_is_abusive: false } },
  ];
}

/** Tier 2 published session */
function makeTier2Session() {
  return { id: 'test-preservation-t2', session_id: 'test-preservation-t2', status: 'tier2_published' };
}

/** Standard recompute input for determinism tests */
function makeRecomputeInput() {
  return {
    signals: makeConcreteSignals(),
    recon_outputs: makeConcreteReconOutputs(),
    session: { id: 'test-determinism', status: 'active' },
    aws_programs: AWS_PROGRAMS,
    gaps_db: [],
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Preservation Property 2: Unchanged Behaviors for Non-Remediation Paths', () => {

  // Test 1: Recompute Determinism
  // Call recompute with the same inputs 10 times. Assert all outputs are identical.
  // This verifies the recompute kernel is a pure function with no side effects.
  it('Test 1: Recompute determinism — same inputs produce identical outputs across 10 calls', () => {
    const input = makeRecomputeInput();

    const results = [];
    for (let i = 0; i < 10; i++) {
      const result = recompute(input);
      results.push(JSON.stringify(result));
    }

    const first = results[0];
    for (let i = 1; i < results.length; i++) {
      assert.strictEqual(
        results[i],
        first,
        `Recompute call ${i + 1} produced different output than call 1. ` +
        `Recompute must be deterministic (pure function, no side effects).`
      );
    }
  });

  // Test 3: Tier 2 Full Shape Preserved
  // Call recompute with a tier2_published session. Assert the response contains
  // trust_score, vendor_recommendations, aws_programs, engagement_router.
  // This verifies Tier 2 output isn't broken by any changes.
  // **Validates: Requirement 3.3**
  it('Test 3: Tier 2 full shape preserved — tier2_published returns trust_score, vendor_recommendations, aws_programs, engagement_router', () => {
    const result = recompute({
      signals: makeConcreteSignals(),
      recon_outputs: makeConcreteReconOutputs(),
      session: makeTier2Session(),
      aws_programs: AWS_PROGRAMS,
      gaps_db: [],
    });

    const ds = result.derived_state;
    assert.ok(ds, 'derived_state should exist');

    // trust_score must be a number
    assert.ok(
      typeof ds.trust_score === 'number',
      `Tier 2 derived_state.trust_score should be a number. Got: ${typeof ds.trust_score} (${ds.trust_score})`
    );
    assert.ok(
      ds.trust_score >= 0 && ds.trust_score <= 100,
      `trust_score should be between 0 and 100. Got: ${ds.trust_score}`
    );

    // vendor_recommendations must be an array
    assert.ok(
      Array.isArray(ds.vendor_recommendations),
      `Tier 2 derived_state.vendor_recommendations should be an array. Got: ${typeof ds.vendor_recommendations}`
    );

    // aws_programs must be an array
    assert.ok(
      Array.isArray(ds.aws_programs),
      `Tier 2 derived_state.aws_programs should be an array. Got: ${typeof ds.aws_programs}`
    );

    // engagement_router must exist with expected shape
    assert.ok(
      ds.engagement_router && typeof ds.engagement_router === 'object',
      `Tier 2 derived_state.engagement_router should be an object. Got: ${typeof ds.engagement_router}`
    );
    assert.ok(
      typeof ds.engagement_router.available === 'boolean',
      `engagement_router.available should be a boolean. Got: ${typeof ds.engagement_router.available}`
    );

    // Tier 1 fields should also be present
    assert.ok(Array.isArray(ds.gaps), 'Tier 2 should also contain gaps');
    assert.ok(ds.density && typeof ds.density === 'object', 'Tier 2 should also contain density');
    assert.ok(Array.isArray(ds.directional_hints), 'Tier 2 should also contain directional_hints');
    assert.ok(ds.session_id, 'Tier 2 should contain session_id');
  });
});
