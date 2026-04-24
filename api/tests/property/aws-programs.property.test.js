// Feature: overnight-v1, Property 8: AWS programmes catalogue schema validity
// **Validates: Requirements 9.2, 9.4**

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { AWS_PROGRAMS, KNOWN_SIGNAL_FIELDS } from '../../src/config/aws-programs.js';

const REQUIRED_FIELDS = [
  'program_id',
  'name',
  'benefit',
  'application_url',
  'category',
  'triggers',
  'confidence_when_matched',
];

const VALID_CATEGORIES = [
  'startup_credits',
  'partner_programs',
  'customer_funding',
  'sector_accelerators',
  'nonprofit',
];

const VALID_CONFIDENCE_LEVELS = ['high', 'medium', 'low'];

const VALID_OPS = ['eq', 'in', 'exists', 'not_eq'];

describe('Property 8: AWS programmes catalogue schema validity', () => {
  // Use fast-check to pick any program index and validate required fields
  it('every program has all required fields', () => {
    assert.ok(AWS_PROGRAMS.length >= 15, `Catalogue must have >= 15 programs, got ${AWS_PROGRAMS.length}`);

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: AWS_PROGRAMS.length - 1 }),
        (index) => {
          const program = AWS_PROGRAMS[index];
          for (const field of REQUIRED_FIELDS) {
            assert.ok(
              field in program && program[field] !== undefined && program[field] !== null,
              `Program "${program.program_id ?? index}" missing required field "${field}"`,
            );
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('all trigger conditions reference known signal fields', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: AWS_PROGRAMS.length - 1 }),
        (index) => {
          const program = AWS_PROGRAMS[index];
          assert.ok(Array.isArray(program.triggers), `Program "${program.program_id}" triggers must be an array`);
          assert.ok(program.triggers.length > 0, `Program "${program.program_id}" must have at least one trigger`);

          for (const trigger of program.triggers) {
            assert.ok(
              KNOWN_SIGNAL_FIELDS.includes(trigger.field),
              `Program "${program.program_id}" trigger references unknown field "${trigger.field}". Known: ${KNOWN_SIGNAL_FIELDS.join(', ')}`,
            );
            assert.ok(
              VALID_OPS.includes(trigger.op),
              `Program "${program.program_id}" trigger has unknown op "${trigger.op}". Valid: ${VALID_OPS.join(', ')}`,
            );
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('categories are from the valid set', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: AWS_PROGRAMS.length - 1 }),
        (index) => {
          const program = AWS_PROGRAMS[index];
          assert.ok(
            VALID_CATEGORIES.includes(program.category),
            `Program "${program.program_id}" has invalid category "${program.category}". Valid: ${VALID_CATEGORIES.join(', ')}`,
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it('confidence_when_matched is one of high/medium/low', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: AWS_PROGRAMS.length - 1 }),
        (index) => {
          const program = AWS_PROGRAMS[index];
          assert.ok(
            VALID_CONFIDENCE_LEVELS.includes(program.confidence_when_matched),
            `Program "${program.program_id}" has invalid confidence_when_matched "${program.confidence_when_matched}". Valid: ${VALID_CONFIDENCE_LEVELS.join(', ')}`,
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});
