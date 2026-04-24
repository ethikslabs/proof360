// Feature: overnight-v1, Property 3: Confidence computation from source counts
// **Validates: Requirements 14.2, 14.3, 14.4, 14.5**

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { computeConfidence } from '../../src/handlers/inferences.js';

describe('Property 3: Confidence computation from source counts', () => {
  it('maps (attempted, succeeded) pairs to correct confidence level', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 200 }),
        fc.integer({ min: 0, max: 200 }),
        (attempted, succeededRaw) => {
          // Ensure succeeded <= attempted
          const succeeded = Math.min(succeededRaw, attempted);

          const session = {
            sources_read: {
              attempted,
              succeeded,
              missing: [],
            },
          };

          const result = computeConfidence(session);

          if (attempted === 0) {
            assert.equal(result.overall, 'partial',
              `attempted=0 should yield 'partial', got '${result.overall}'`);
          } else {
            const ratio = succeeded / attempted;
            if (ratio >= 0.9) {
              assert.equal(result.overall, 'high',
                `ratio=${ratio.toFixed(3)} (${succeeded}/${attempted}) should yield 'high', got '${result.overall}'`);
            } else if (ratio >= 0.7) {
              assert.equal(result.overall, 'medium',
                `ratio=${ratio.toFixed(3)} (${succeeded}/${attempted}) should yield 'medium', got '${result.overall}'`);
            } else if (ratio >= 0.5) {
              assert.equal(result.overall, 'low',
                `ratio=${ratio.toFixed(3)} (${succeeded}/${attempted}) should yield 'low', got '${result.overall}'`);
            } else {
              assert.equal(result.overall, 'partial',
                `ratio=${ratio.toFixed(3)} (${succeeded}/${attempted}) should yield 'partial', got '${result.overall}'`);
            }
          }

          // Verify structural fields
          assert.equal(result.sources_attempted, attempted);
          assert.equal(result.sources_succeeded, succeeded);
          assert.deepEqual(result.missing_sources, []);
        },
      ),
      { numRuns: 200 },
    );
  });
});
