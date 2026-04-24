// Feature: overnight-v1, Property 2: Confidence level mapping
// **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 12.2, 12.3, 12.4, 12.5**

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { confidenceLevelToText } from '../../src/components/report/ConfidenceRibbon.jsx';

const EXPECTED_MAPPING = {
  medium:  'High-confidence read with some gaps',
  low:     'Directional read — additional signals recommended',
  partial: 'Limited data — treat as early signal',
  high:    null,
};

const ALL_LEVELS = ['high', 'medium', 'low', 'partial'];
const confidenceLevelArb = fc.constantFrom(...ALL_LEVELS);

describe('Property 2: Confidence level mapping', () => {
  it('every valid level maps to the correct display string (non-high) or null (high)', () => {
    fc.assert(
      fc.property(confidenceLevelArb, (level) => {
        const result = confidenceLevelToText(level);
        const expected = EXPECTED_MAPPING[level];

        assert.equal(result, expected,
          `confidenceLevelToText("${level}") should return ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
      }),
      { numRuns: 200 },
    );
  });

  it('mapping is total — every valid input produces a defined output', () => {
    fc.assert(
      fc.property(confidenceLevelArb, (level) => {
        const result = confidenceLevelToText(level);

        // For non-high levels the result must be a non-empty string
        if (level !== 'high') {
          assert.equal(typeof result, 'string',
            `non-high level "${level}" must produce a string`);
          assert.ok(result.length > 0,
            `non-high level "${level}" must produce a non-empty string`);
        } else {
          assert.equal(result, null,
            '"high" must produce null');
        }
      }),
      { numRuns: 200 },
    );
  });

  it('"high" always returns null', () => {
    // Deterministic check reinforced through property repetition
    fc.assert(
      fc.property(fc.constant('high'), (level) => {
        assert.equal(confidenceLevelToText(level), null,
          'confidenceLevelToText("high") must always be null');
      }),
      { numRuns: 100 },
    );
  });
});
