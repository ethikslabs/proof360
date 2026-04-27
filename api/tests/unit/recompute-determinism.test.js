// Recompute determinism tests
// Tests: same input → identical output, idempotent (no side effects)

import { describe, it, expect } from 'vitest';
import { recompute } from '../../src/services/recompute.js';
import { GAP_DEFINITIONS } from '../../src/config/gaps.js';
import { AWS_PROGRAMS } from '../../src/config/aws-programs.js';

const baseInput = {
  signals: [
    { field: 'compliance_status', current_value: 'none', inferred_value: 'none', status: 'inferred', current_actor: null },
    { field: 'identity_model', current_value: 'password_only', inferred_value: 'password_only', status: 'inferred', current_actor: null },
    { field: 'insurance_status', current_value: 'none', inferred_value: 'none', status: 'inferred', current_actor: null },
    { field: 'stage', current_value: 'Seed', inferred_value: 'Seed', status: 'inferred', current_actor: null },
    { field: 'sector', current_value: 'saas', inferred_value: 'saas', status: 'inferred', current_actor: null },
    { field: 'infrastructure', current_value: 'aws', inferred_value: 'aws', status: 'inferred', current_actor: null },
  ],
  recon_outputs: [
    { source: 'dns', payload: { dmarc_policy: 'none', spf_policy: 'missing' } },
    { source: 'http', payload: { has_hsts: false, has_csp: false } },
  ],
  session: { id: 'test-session-1', status: 'analysis_complete' },
  gaps_config: GAP_DEFINITIONS,
  aws_programs: AWS_PROGRAMS,
  gaps_db: [],
};

describe('Recompute Determinism', () => {
  it('same input → identical output across 100 calls', () => {
    const first = recompute(baseInput);

    for (let i = 0; i < 100; i++) {
      const result = recompute(baseInput);
      expect(result).toEqual(first);
    }
  });

  it('idempotent — no side effects on input', () => {
    const inputCopy = JSON.parse(JSON.stringify(baseInput));
    // Restore non-serializable triggerCondition/claimTemplate functions
    inputCopy.gaps_config = GAP_DEFINITIONS;

    recompute(inputCopy);
    recompute(inputCopy);

    // Input signals should be unchanged
    expect(inputCopy.signals).toEqual(baseInput.signals);
    expect(inputCopy.recon_outputs).toEqual(baseInput.recon_outputs);
    expect(inputCopy.session).toEqual(baseInput.session);
  });
});
