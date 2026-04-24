// Feature: overnight-v1, Property 6: Program match returns only eligible programs
// **Validates: Requirements 8.1**

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { evaluatePrograms } from '../../src/handlers/program-match.js';
import { AWS_PROGRAMS, evaluateTrigger, KNOWN_SIGNAL_FIELDS } from '../../src/config/aws-programs.js';

/**
 * Arbitrary that generates a random signals object with fields drawn from
 * KNOWN_SIGNAL_FIELDS. Each field is randomly present or absent, and when
 * present holds a value sampled from the realistic domain for that field.
 */
const signalFieldValues = {
  stage: fc.constantFrom('Pre-seed', 'Seed', 'Series A', 'Series B+', 'Growth', 'Public'),
  sector: fc.constantFrom('saas', 'infrastructure', 'fintech', 'financial_services', 'healthcare', 'energy', 'government', 'education', 'retail'),
  infrastructure: fc.constantFrom('on_prem', 'legacy_hosted', 'multi_cloud_fragmented', 'aws', 'azure', 'gcp'),
  geo_market: fc.constantFrom('AU', 'US', 'UK', 'EU', 'APAC'),
  product_type: fc.constantFrom('B2B SaaS', 'Platform', 'API', 'Software product', 'Hardware', 'Services'),
  has_raised_institutional: fc.boolean(),
  abn_entity_type: fc.constantFrom('not_for_profit', 'proprietary_limited', 'public_company', 'sole_trader'),
};

const signalsArbitrary = fc.record(
  Object.fromEntries(
    KNOWN_SIGNAL_FIELDS.map((field) => [
      field,
      signalFieldValues[field]
        ? fc.option(signalFieldValues[field], { nil: undefined })
        : fc.option(fc.string(), { nil: undefined }),
    ]),
  ),
);

describe('Property 6: Program match returns only eligible programs', () => {
  it('every returned program has all triggers satisfied by the input signals', () => {
    fc.assert(
      fc.property(signalsArbitrary, (signals) => {
        // Strip undefined keys to simulate a real sparse signals_object
        const cleanSignals = {};
        for (const [k, v] of Object.entries(signals)) {
          if (v !== undefined) cleanSignals[k] = v;
        }

        const results = evaluatePrograms(cleanSignals, AWS_PROGRAMS);

        for (const matched of results) {
          // Find the original program definition
          const program = AWS_PROGRAMS.find((p) => p.program_id === matched.program_id);
          assert.ok(program, `Returned program_id "${matched.program_id}" must exist in catalogue`);

          // Every trigger on the matched program must be satisfied
          for (const trigger of program.triggers) {
            assert.ok(
              evaluateTrigger(trigger, cleanSignals),
              `Program "${matched.program_id}" was returned but trigger { field: "${trigger.field}", op: "${trigger.op}" } is NOT satisfied by signals ${JSON.stringify(cleanSignals)}`,
            );
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('no program with an unsatisfied trigger appears in the result', () => {
    fc.assert(
      fc.property(signalsArbitrary, (signals) => {
        const cleanSignals = {};
        for (const [k, v] of Object.entries(signals)) {
          if (v !== undefined) cleanSignals[k] = v;
        }

        const results = evaluatePrograms(cleanSignals, AWS_PROGRAMS);
        const returnedIds = new Set(results.map((r) => r.program_id));

        // For every program NOT returned, at least one trigger must fail
        for (const program of AWS_PROGRAMS) {
          if (!returnedIds.has(program.program_id)) {
            const allSatisfied = program.triggers.every((t) => evaluateTrigger(t, cleanSignals));
            assert.ok(
              !allSatisfied,
              `Program "${program.program_id}" has all triggers satisfied but was NOT returned`,
            );
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});

// Feature: overnight-v1, Property 7: Program match confidence assignment
// **Validates: Requirements 8.4**

import { computeProgramConfidence } from '../../src/handlers/program-match.js';

/**
 * Arbitrary that generates a realistic program definition with configurable
 * trigger count and confidence ceiling.
 */
const triggerFieldArb = fc.constantFrom(...KNOWN_SIGNAL_FIELDS);

const triggerArb = triggerFieldArb.chain((field) => {
  if (field === 'has_raised_institutional') {
    return fc.record({
      field: fc.constant(field),
      op: fc.constant('eq'),
      value: fc.boolean(),
    });
  }
  return fc.oneof(
    fc.record({ field: fc.constant(field), op: fc.constant('exists') }),
    fc.record({
      field: fc.constant(field),
      op: fc.constant('eq'),
      value: fc.constantFrom('Pre-seed', 'Seed', 'saas', 'on_prem', 'AU', 'B2B SaaS', 'not_for_profit'),
    }),
  );
});

const ceilingArb = fc.constantFrom('high', 'medium', 'low');

const programArb = fc.record({
  program_id: fc.constant('test_program'),
  name: fc.constant('Test Program'),
  benefit: fc.constant('Test benefit'),
  application_url: fc.constant('https://example.com'),
  category: fc.constant('startup_credits'),
  triggers: fc.array(triggerArb, { minLength: 1, maxLength: 4 }),
  confidence_when_matched: ceilingArb,
});

/**
 * Generate a signals object where we control which fields are populated.
 * Takes a set of field names that should be present and fills them with
 * realistic values; remaining fields are absent.
 */
function buildSignals(presentFields, triggerSpecs) {
  const signals = {};
  const valueMap = {
    stage: 'Pre-seed',
    sector: 'saas',
    infrastructure: 'on_prem',
    geo_market: 'AU',
    product_type: 'B2B SaaS',
    has_raised_institutional: false,
    abn_entity_type: 'not_for_profit',
  };

  for (const field of presentFields) {
    // For trigger fields with eq op, use the trigger's expected value so the trigger is satisfied
    const matchingTrigger = triggerSpecs?.find((t) => t.field === field && t.op === 'eq');
    if (matchingTrigger) {
      signals[field] = matchingTrigger.value;
    } else {
      signals[field] = valueMap[field] ?? 'present';
    }
  }
  return signals;
}

describe('Property 7: Program match confidence assignment', () => {
  const RANK = { high: 3, medium: 2, low: 1 };

  it('confidence is "high" when all trigger fields present and >=70% of known fields populated', () => {
    fc.assert(
      fc.property(programArb, (program) => {
        // Build signals with all trigger fields + enough extra fields to reach >=70%
        const triggerFields = new Set(program.triggers.map((t) => t.field));
        const allFields = new Set(KNOWN_SIGNAL_FIELDS);
        const presentFields = new Set(triggerFields);

        // Add fields until we have >=70% of known fields
        const threshold = Math.ceil(KNOWN_SIGNAL_FIELDS.length * 0.7);
        for (const f of allFields) {
          if (presentFields.size >= threshold) break;
          presentFields.add(f);
        }

        const signals = buildSignals(presentFields, program.triggers);
        const confidence = computeProgramConfidence(program, signals);

        // Computed would be "high", but capped by ceiling
        const expectedRaw = 'high';
        const expected = RANK[expectedRaw] > RANK[program.confidence_when_matched]
          ? program.confidence_when_matched
          : expectedRaw;

        assert.equal(
          confidence,
          expected,
          `With all triggers present + >=70% fields, expected "${expected}" (ceiling: ${program.confidence_when_matched}), got "${confidence}"`,
        );
      }),
      { numRuns: 200 },
    );
  });

  it('confidence is "medium" when all trigger fields present but <70% of known fields populated', () => {
    fc.assert(
      fc.property(programArb, (program) => {
        const triggerFields = program.triggers.map((t) => t.field);
        const triggerFieldSet = new Set(triggerFields);

        // Only include trigger fields — if that alone is >=70%, skip this case
        const threshold = Math.ceil(KNOWN_SIGNAL_FIELDS.length * 0.7);
        if (triggerFieldSet.size >= threshold) return; // vacuously true, can't test this case

        const signals = buildSignals(triggerFieldSet, program.triggers);
        const confidence = computeProgramConfidence(program, signals);

        const expectedRaw = 'medium';
        const expected = RANK[expectedRaw] > RANK[program.confidence_when_matched]
          ? program.confidence_when_matched
          : expectedRaw;

        assert.equal(
          confidence,
          expected,
          `With all triggers present but <70% fields, expected "${expected}" (ceiling: ${program.confidence_when_matched}), got "${confidence}"`,
        );
      }),
      { numRuns: 200 },
    );
  });

  it('confidence is "low" when not all trigger fields are present in signals', () => {
    fc.assert(
      fc.property(programArb, (program) => {
        // Deliberately omit at least one unique trigger field
        const uniqueTriggerFields = [...new Set(program.triggers.map((t) => t.field))];
        if (uniqueTriggerFields.length === 0) return;

        // Remove the last unique trigger field from the signals
        const fieldToOmit = uniqueTriggerFields[uniqueTriggerFields.length - 1];
        const presentFields = new Set(uniqueTriggerFields.filter((f) => f !== fieldToOmit));

        const signals = buildSignals(presentFields, program.triggers);
        const confidence = computeProgramConfidence(program, signals);

        const expectedRaw = 'low';
        const expected = RANK[expectedRaw] > RANK[program.confidence_when_matched]
          ? program.confidence_when_matched
          : expectedRaw;

        assert.equal(
          confidence,
          expected,
          `With missing trigger field "${fieldToOmit}", expected "${expected}" (ceiling: ${program.confidence_when_matched}), got "${confidence}"`,
        );
      }),
      { numRuns: 200 },
    );
  });

  it('confidence never exceeds the program confidence_when_matched ceiling', () => {
    fc.assert(
      fc.property(programArb, signalsArbitrary, (program, signals) => {
        const cleanSignals = {};
        for (const [k, v] of Object.entries(signals)) {
          if (v !== undefined) cleanSignals[k] = v;
        }

        const confidence = computeProgramConfidence(program, cleanSignals);
        const ceiling = program.confidence_when_matched;

        assert.ok(
          RANK[confidence] <= RANK[ceiling],
          `Confidence "${confidence}" (rank ${RANK[confidence]}) exceeds ceiling "${ceiling}" (rank ${RANK[ceiling]}) for program with ceiling "${ceiling}"`,
        );
      }),
      { numRuns: 200 },
    );
  });

  it('confidence is always one of high/medium/low', () => {
    fc.assert(
      fc.property(programArb, signalsArbitrary, (program, signals) => {
        const cleanSignals = {};
        for (const [k, v] of Object.entries(signals)) {
          if (v !== undefined) cleanSignals[k] = v;
        }

        const confidence = computeProgramConfidence(program, cleanSignals);
        assert.ok(
          ['high', 'medium', 'low'].includes(confidence),
          `Confidence "${confidence}" is not one of high/medium/low`,
        );
      }),
      { numRuns: 200 },
    );
  });
});
