// VERITAS render mapping tests
// Tests: ATTESTED >0.85 → included in vendor matrix, ATTESTED ≤0.85 → caveat,
//        INFERRED → excluded, UNKNOWN → excluded
// The render mapping is applied internally by recompute and affects vendor_recommendations.

import { describe, it, expect } from 'vitest';
import { recompute } from '../../src/services/recompute.js';
import { GAP_DEFINITIONS } from '../../src/config/gaps.js';
import { AWS_PROGRAMS } from '../../src/config/aws-programs.js';

// Signals that trigger the 'soc2' gap (compliance_status = 'none')
// and 'mfa' gap (identity_model = 'password_only')
const signals = [
  { field: 'compliance_status', current_value: 'none', inferred_value: 'none', status: 'inferred', current_actor: null },
  { field: 'identity_model', current_value: 'password_only', inferred_value: 'password_only', status: 'inferred', current_actor: null },
  { field: 'insurance_status', current_value: 'none', inferred_value: 'none', status: 'inferred', current_actor: null },
];

function makeInput(gaps_db) {
  return {
    signals,
    recon_outputs: [],
    // Must be tier2_published to get vendor_recommendations in output
    session: { id: 'test-veritas', status: 'tier2_published' },
    gaps_config: GAP_DEFINITIONS,
    aws_programs: AWS_PROGRAMS,
    gaps_db,
  };
}

describe('VERITAS Render Mapping', () => {
  it('ATTESTED confidence > 0.85 → included in vendor matrix', () => {
    const input = makeInput([
      { gap_def_id: 'soc2', veritas_class: 'ATTESTED', veritas_confidence: 0.92 },
    ]);
    const { derived_state } = recompute(input);

    // soc2 gap is ATTESTED with high confidence — vendors that close soc2 should appear
    const soc2Vendors = derived_state.vendor_recommendations.filter(v =>
      v.closes_gaps.includes('soc2')
    );
    expect(soc2Vendors.length).toBeGreaterThan(0);
    // High-confidence ATTESTED should have no render_caveat on the vendor
    const vendorWithSoc2 = soc2Vendors[0];
    expect(vendorWithSoc2.veritas_class).toBe('ATTESTED');
    expect(vendorWithSoc2.render_caveat).toBeNull();
  });

  it('ATTESTED confidence ≤ 0.85 → included with caveat', () => {
    const input = makeInput([
      { gap_def_id: 'soc2', veritas_class: 'ATTESTED', veritas_confidence: 0.72 },
    ]);
    const { derived_state } = recompute(input);

    const soc2Vendors = derived_state.vendor_recommendations.filter(v =>
      v.closes_gaps.includes('soc2')
    );
    expect(soc2Vendors.length).toBeGreaterThan(0);
    const vendorWithSoc2 = soc2Vendors[0];
    expect(vendorWithSoc2.veritas_class).toBe('ATTESTED');
    expect(vendorWithSoc2.render_caveat).toBe('attested with moderate confidence');
  });

  it('INFERRED → excluded from vendor matrix', () => {
    // Mark ALL triggered gaps as INFERRED so no gaps pass the vendor matrix filter
    const allGapIds = GAP_DEFINITIONS.map(g => g.id);
    const gaps_db = allGapIds.map(id => ({
      gap_def_id: id, veritas_class: 'INFERRED', veritas_confidence: 0.5,
    }));

    const input = makeInput(gaps_db);
    const { derived_state } = recompute(input);

    // All gaps are INFERRED → vendor_recommendations should be empty
    // (no gaps pass the vendor_matrix_included filter)
    expect(derived_state.vendor_recommendations).toEqual([]);
  });

  it('UNKNOWN → excluded from vendor matrix', () => {
    const allGapIds = GAP_DEFINITIONS.map(g => g.id);
    const gaps_db = allGapIds.map(id => ({
      gap_def_id: id, veritas_class: 'UNKNOWN', veritas_confidence: null,
    }));

    const input = makeInput(gaps_db);
    const { derived_state } = recompute(input);

    // All gaps are UNKNOWN → vendor_recommendations should be empty
    expect(derived_state.vendor_recommendations).toEqual([]);
  });
});
