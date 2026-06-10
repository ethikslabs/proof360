import { describe, it, expect } from 'vitest';
import { buildProfileProjections } from '../../src/services/profile-projections.js';

function snapshot(current_claims = {}) {
  return {
    profile: { id: 'profile-1' },
    reconstructed_at: '2026-06-10T00:00:00.000Z',
    current_claims,
    observations: Object.values(current_claims).map((claim) => ({
      id: `obs-${claim.id}`,
      field: claim.field,
      source: claim.source,
    })),
  };
}

describe('profile projections', () => {
  it('returns the explainable projection contract for every tile', () => {
    const projections = buildProfileProjections(snapshot({
      company_name: { id: 'claim-company', field: 'company_name', value: 'Hive & Co', source: 'founder' },
      website: { id: 'claim-website', field: 'website', value: 'https://example.com', source: 'cold_read' },
      stage: { id: 'claim-stage', field: 'stage', value: 'Seed', source: 'founder' },
      sector: { id: 'claim-sector', field: 'sector', value: 'Food', source: 'cold_read' },
    }));

    for (const key of ['investor', 'vendors', 'aws', 'microsoft', 'posture', 'spv']) {
      expect(projections.projections[key]).toMatchObject({
        key,
        state: expect.any(String),
        confidence: expect.any(String),
        contributing_claims: expect.any(Array),
        contributing_observations: expect.any(Array),
        missing_inputs: expect.any(Array),
      });
    }
    expect(projections.lit_tiles.investor).toBe(true);
    expect(projections.lit_tiles.spv).toBe(true);
  });

  it('keeps projections as unknown when memory has no support', () => {
    const projections = buildProfileProjections(snapshot());
    expect(projections.projections.investor.state).toBe('unknown');
    expect(projections.projections.investor.contributing_claims).toEqual([]);
    expect(projections.lit_tiles.investor).toBe(false);
  });
});
