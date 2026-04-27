// Tier boundary enforcement tests
// Tests: Tier 1 locked shape, Tier 1 excludes restricted fields, Tier 2 full shape

import { describe, it, expect } from 'vitest';
import { recompute } from '../../src/services/recompute.js';
import { GAP_DEFINITIONS } from '../../src/config/gaps.js';
import { AWS_PROGRAMS } from '../../src/config/aws-programs.js';

const signals = [
  { field: 'compliance_status', current_value: 'none', inferred_value: 'none', status: 'inferred', current_actor: null },
  { field: 'identity_model', current_value: 'password_only', inferred_value: 'password_only', status: 'inferred', current_actor: null },
  { field: 'insurance_status', current_value: 'none', inferred_value: 'none', status: 'inferred', current_actor: null },
  { field: 'stage', current_value: 'Seed', inferred_value: 'Seed', status: 'inferred', current_actor: null },
];

const recon_outputs = [
  { source: 'dns', payload: { dmarc_policy: 'none' } },
];

describe('Tier Boundary Enforcement', () => {
  it('Tier 1 response contains ONLY locked shape fields per gap', () => {
    const input = {
      signals,
      recon_outputs,
      session: { id: 'tier1-test', status: 'analysis_complete' },
      gaps_config: GAP_DEFINITIONS,
      aws_programs: AWS_PROGRAMS,
      gaps_db: [],
    };

    const { derived_state } = recompute(input);

    // Tier 1 should have these top-level keys
    expect(derived_state).toHaveProperty('session_id');
    expect(derived_state).toHaveProperty('status');
    expect(derived_state).toHaveProperty('gaps');
    expect(derived_state).toHaveProperty('density');
    expect(derived_state).toHaveProperty('directional_hints');
    expect(derived_state).toHaveProperty('signals');
    expect(derived_state).toHaveProperty('confidence_ribbon');

    // Each gap should have ONLY the locked shape fields
    for (const gap of derived_state.gaps) {
      const keys = Object.keys(gap);
      expect(keys).toContain('id');
      expect(keys).toContain('description');
      expect(keys).toContain('confidence');
      expect(keys).toContain('evidence_summary');
      expect(keys).toHaveLength(4);
    }
  });

  it('Tier 1 SHALL NOT contain trust_score, vendor_recommendations, aws_programs', () => {
    const input = {
      signals,
      recon_outputs,
      session: { id: 'tier1-no-leak', status: 'analysis_complete' },
      gaps_config: GAP_DEFINITIONS,
      aws_programs: AWS_PROGRAMS,
      gaps_db: [],
    };

    const { derived_state } = recompute(input);

    expect(derived_state).not.toHaveProperty('trust_score');
    expect(derived_state).not.toHaveProperty('vendor_recommendations');
    expect(derived_state).not.toHaveProperty('aws_programs');
    expect(derived_state).not.toHaveProperty('engagement_router');

    // Gaps should not leak restricted fields
    for (const gap of derived_state.gaps) {
      expect(gap).not.toHaveProperty('severity');
      expect(gap).not.toHaveProperty('framework_impact');
      expect(gap).not.toHaveProperty('remediation');
    }
  });

  it('Tier 2 response contains full shape', () => {
    const input = {
      signals,
      recon_outputs,
      session: { id: 'tier2-test', status: 'tier2_published' },
      gaps_config: GAP_DEFINITIONS,
      aws_programs: AWS_PROGRAMS,
      gaps_db: [],
    };

    const { derived_state } = recompute(input);

    // Tier 2 should have all Tier 1 fields plus Tier 2 fields
    expect(derived_state).toHaveProperty('session_id');
    expect(derived_state).toHaveProperty('gaps');
    expect(derived_state).toHaveProperty('density');
    expect(derived_state).toHaveProperty('directional_hints');
    expect(derived_state).toHaveProperty('signals');
    expect(derived_state).toHaveProperty('confidence_ribbon');
    expect(derived_state).toHaveProperty('trust_score');
    expect(derived_state).toHaveProperty('vendor_recommendations');
    expect(derived_state).toHaveProperty('aws_programs');
    expect(derived_state).toHaveProperty('engagement_router');
    expect(typeof derived_state.trust_score).toBe('number');
  });
});
