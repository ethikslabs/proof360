// Feature: overnight-v1, Property 10: Confidence chip visibility
// **Validates: Requirements 13.1, 13.2**

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { shouldShowConfidenceChip } from '../../src/components/confidenceUtils.js';

const CONFIDENCE_LEVELS = ['high', 'medium', 'low'];

const confidenceLevelArb = fc.constantFrom(...CONFIDENCE_LEVELS);

describe('Property 10: Confidence chip visibility', () => {
  it('chip is visible iff gap confidence differs from overall confidence', () => {
    fc.assert(
      fc.property(
        confidenceLevelArb,
        confidenceLevelArb,
        (gapConfidence, overallConfidence) => {
          const visible = shouldShowConfidenceChip(gapConfidence, overallConfidence);

          if (gapConfidence !== overallConfidence) {
            assert.equal(visible, true,
              `chip should be visible when gap="${gapConfidence}" differs from overall="${overallConfidence}"`);
          } else {
            assert.equal(visible, false,
              `chip should be hidden when gap="${gapConfidence}" equals overall="${overallConfidence}"`);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('visibility is symmetric — order of difference does not matter', () => {
    fc.assert(
      fc.property(
        confidenceLevelArb,
        confidenceLevelArb,
        (a, b) => {
          // If a differs from b, chip shows regardless of which is gap vs overall
          const visAB = shouldShowConfidenceChip(a, b);
          const visBA = shouldShowConfidenceChip(b, a);

          // Both should agree on whether they differ
          assert.equal(visAB, visBA,
            `visibility should be symmetric: shouldShow("${a}","${b}") = shouldShow("${b}","${a}")`);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('same confidence always hides the chip', () => {
    fc.assert(
      fc.property(
        confidenceLevelArb,
        (level) => {
          assert.equal(shouldShowConfidenceChip(level, level), false,
            `chip should be hidden when both are "${level}"`);
        },
      ),
      { numRuns: 100 },
    );
  });
});
