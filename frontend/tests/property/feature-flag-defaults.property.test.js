// Feature: overnight-v1, Property 9: Feature flag safe defaults
// **Validates: Requirements 11.6, 17.4**

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { SAFE_DEFAULTS } from '../../src/contexts/FeatureFlagContext.jsx';

describe('Property 9: Feature flag safe defaults', () => {
  it('SAFE_DEFAULTS has correct structure and values', () => {
    // Verify the three top-level keys exist
    assert.ok(SAFE_DEFAULTS.surfaces, 'surfaces key must exist');
    assert.ok(SAFE_DEFAULTS.layer2_cards, 'layer2_cards key must exist');
    assert.ok(SAFE_DEFAULTS.cold_read, 'cold_read key must exist');

    // Pre-existing surfaces: founder and admin must be true
    assert.equal(SAFE_DEFAULTS.surfaces.founder, true,
      'surfaces.founder must default to true');
    assert.equal(SAFE_DEFAULTS.surfaces.admin, true,
      'surfaces.admin must default to true');

    // Pre-existing layer2 card: vendor_route must be true
    assert.equal(SAFE_DEFAULTS.layer2_cards.vendor_route, true,
      'layer2_cards.vendor_route must default to true');

    // All overnight-v1 features must be false
    assert.equal(SAFE_DEFAULTS.layer2_cards.program_match, false,
      'layer2_cards.program_match must default to false');
    assert.equal(SAFE_DEFAULTS.cold_read.shareable_url, false,
      'cold_read.shareable_url must default to false');
    assert.equal(SAFE_DEFAULTS.cold_read.preread_tool, false,
      'cold_read.preread_tool must default to false');

    // All non-founder/non-admin surfaces must be false
    assert.equal(SAFE_DEFAULTS.surfaces.buyer, false,
      'surfaces.buyer must default to false');
    assert.equal(SAFE_DEFAULTS.surfaces.investor, false,
      'surfaces.investor must default to false');
    assert.equal(SAFE_DEFAULTS.surfaces.broker, false,
      'surfaces.broker must default to false');
    assert.equal(SAFE_DEFAULTS.surfaces.aws_seller, false,
      'surfaces.aws_seller must default to false');
    assert.equal(SAFE_DEFAULTS.surfaces.distributor, false,
      'surfaces.distributor must default to false');
  });

  it('for any arbitrary feature flag object, SAFE_DEFAULTS always satisfies safety invariants', () => {
    // Arbitrary feature flag shape generator — simulates what a server might return
    const featureFlagArb = fc.record({
      surfaces: fc.record({
        founder: fc.boolean(),
        buyer: fc.boolean(),
        investor: fc.boolean(),
        broker: fc.boolean(),
        aws_seller: fc.boolean(),
        distributor: fc.boolean(),
        admin: fc.boolean(),
      }),
      layer2_cards: fc.record({
        program_match: fc.boolean(),
        risk_heatmap: fc.boolean(),
        vendor_route: fc.boolean(),
        quote: fc.boolean(),
      }),
      cold_read: fc.record({
        shareable_url: fc.boolean(),
        preread_url: fc.boolean(),
      }),
    });

    fc.assert(
      fc.property(featureFlagArb, (_serverFlags) => {
        // Regardless of what the server might return, SAFE_DEFAULTS must always
        // preserve these invariants (used when server is unreachable):

        // Pre-existing personas remain enabled
        assert.equal(SAFE_DEFAULTS.surfaces.founder, true,
          'SAFE_DEFAULTS.surfaces.founder must always be true');
        assert.equal(SAFE_DEFAULTS.surfaces.admin, true,
          'SAFE_DEFAULTS.surfaces.admin must always be true');

        // Pre-existing layer2 card remains enabled
        assert.equal(SAFE_DEFAULTS.layer2_cards.vendor_route, true,
          'SAFE_DEFAULTS.layer2_cards.vendor_route must always be true');

        // New overnight-v1 features always disabled in fallback
        assert.equal(SAFE_DEFAULTS.layer2_cards.program_match, false,
          'SAFE_DEFAULTS.layer2_cards.program_match must always be false');
        assert.equal(SAFE_DEFAULTS.cold_read.shareable_url, false,
          'SAFE_DEFAULTS.cold_read.shareable_url must always be false');
        assert.equal(SAFE_DEFAULTS.cold_read.preread_tool, false,
          'SAFE_DEFAULTS.cold_read.preread_tool must always be false');

        // Non-founder/non-admin surfaces always disabled in fallback
        const nonCorePersonas = ['buyer', 'investor', 'broker', 'aws_seller', 'distributor'];
        for (const persona of nonCorePersonas) {
          assert.equal(SAFE_DEFAULTS.surfaces[persona], false,
            `SAFE_DEFAULTS.surfaces.${persona} must always be false`);
        }
      }),
      { numRuns: 100 },
    );
  });
});
