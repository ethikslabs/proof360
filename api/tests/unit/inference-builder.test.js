// Honesty wave (John walk findings 2026-08-25), items 1 + 3:
//
// Item 1 — hosting conflicts are surfaced as a question, never a silent pick.
// The live rehearsal bug: an extraction-derived "Hosted on AWS" claim and the
// live IP probe's "Oracle" finding both rendered with no reconciliation. Fix:
// the probe (truth ladder: live probe > extracted text) becomes the primary
// `inf_infrastructure` inference, but the extracted claim is kept visible as
// the conflicting witness via `conflicted: true` + `conflict: {probe_says,
// source_says}` — never dropped, never silently picked.
//
// Mid-build amendment (John ruling): AWS-vs-Oracle is usually NOT a conflict —
// it's two different claim TYPES. "Hosted on X" (their own infra — the only
// thing the probe can testify about) vs "works with X" (a business
// relationship read off marketing text, e.g. a consultancy that implements
// AWS for clients while hosting its own site on Oracle). signal-extractor.js
// re-types text-derived cloud mentions accordingly: only an EXPLICIT
// self-hosting statement becomes `type: 'infrastructure'`; everything else is
// `type: 'works_with'`, which never competes with the probe.
//
// Item 3 — label hygiene: no "Software product product" doubling, no bare
// boolean chips ("True"/empty), every boolean signal type gets a human label.
import { describe, it, expect } from 'vitest';
import { buildInferences } from '../../src/services/inference-builder.js';

function infra(inferences) {
  return inferences.find((i) => i.inference_id === 'inf_infrastructure');
}

describe('buildInferences — hosting conflict (probe vs extracted text)', () => {
  it('marks a true conflict: explicit self-hosting claim disagrees with the live probe', () => {
    const signals = [{ type: 'infrastructure', value: 'AWS', confidence: 'probable', claim_type: 'hosting' }];
    const recon = { cloud_provider: 'Oracle' };

    const result = buildInferences(signals, ['homepage'], 'https://cognisys.example', recon);
    const hosting = infra(result.inferences);

    expect(hosting).toBeTruthy();
    expect(hosting.conflicted).toBe(true);
    expect(hosting.conflict).toEqual({ probe_says: 'Oracle', source_says: 'AWS' });
    // Truth ladder: the probe is primary — the label states what we can see live.
    expect(hosting.label).toBe('Hosted on Oracle');
    expect(hosting.confidence).toBe('observed');
  });

  it('the Cognisys case: a vendor RELATIONSHIP claim never conflicts with the probe\'s hosting fact', () => {
    const signals = [{ type: 'works_with', value: 'AWS', confidence: 'probable', claim_type: 'relationship' }];
    const recon = { cloud_provider: 'Oracle' };

    const result = buildInferences(signals, ['homepage'], 'https://cognisys.example', recon);
    const hosting = infra(result.inferences);
    const relationship = result.inferences.find((i) => i.inference_id.startsWith('inf_works_with_'));

    // Two true chips, no conflict.
    expect(hosting.label).toBe('Hosted on Oracle');
    expect(hosting.confidence).toBe('observed');
    expect(hosting.conflicted).toBe(false);
    expect(relationship.label).toBe('Works with AWS');
    expect(relationship.conflicted).toBe(false);
  });

  it('probe fact alone (no text-derived hosting claim): observed, not conflicted', () => {
    const result = buildInferences([], ['homepage'], 'https://example.com', { cloud_provider: 'Oracle' });
    const hosting = infra(result.inferences);
    expect(hosting.label).toBe('Hosted on Oracle');
    expect(hosting.confidence).toBe('observed');
    expect(hosting.conflicted).toBe(false);
    expect(hosting.conflict).toBeUndefined();
  });

  it('text-derived hosting claim alone (no probe): rendered at its own confidence, not conflicted', () => {
    const signals = [{ type: 'infrastructure', value: 'AWS', confidence: 'probable', claim_type: 'hosting' }];
    const result = buildInferences(signals, ['homepage'], 'https://example.com', {});
    const hosting = infra(result.inferences);
    expect(hosting.label).toBe('Hosted on AWS');
    expect(hosting.confidence).toBe('probable');
    expect(hosting.conflicted).toBe(false);
  });

  it('agreement (aliased spelling): probe and text-derived claim naming the same provider — no conflict', () => {
    const signals = [{ type: 'infrastructure', value: 'Amazon Web Services', confidence: 'probable', claim_type: 'hosting' }];
    const result = buildInferences(signals, ['homepage'], 'https://example.com', { cloud_provider: 'aws' });
    const hosting = infra(result.inferences);
    expect(hosting.conflicted).toBe(false);
    expect(hosting.label).toBe('Hosted on aws');
  });

  it('nothing known: no canned "Hosted on AWS" guess — honest omission', () => {
    const result = buildInferences([], ['homepage'], 'https://example.com', {});
    expect(infra(result.inferences)).toBeUndefined();
    expect(result.inferences.some((i) => i.label === 'Hosted on AWS')).toBe(false);
  });
});

describe('buildInferences — label hygiene (item 3)', () => {
  it('does not double "product" when the extracted value already ends with it', () => {
    const result = buildInferences(
      [{ type: 'product_type', value: 'Software product', confidence: 'probable' }],
      ['homepage'], 'https://example.com', {},
    );
    const inf = result.inferences.find((i) => i.inference_id === 'inf_product_type');
    expect(inf.label).toBe('Software product');
    expect(inf.label).not.toMatch(/product product/i);
  });

  it('still appends "product" for values that need it', () => {
    const result = buildInferences(
      [{ type: 'product_type', value: 'B2B SaaS', confidence: 'probable' }],
      ['homepage'], 'https://example.com', {},
    );
    const inf = result.inferences.find((i) => i.inference_id === 'inf_product_type');
    expect(inf.label).toBe('B2B SaaS product');
  });

  it('every boolean signal type gets a human label — no bare "True" chip', () => {
    const boolTypes = [
      'handles_payments', 'uses_ai', 'handles_personal_data', 'pen_test_completed',
      'has_backup', 'aws_program_enrolled', 'microsoft_program_enrolled',
    ];
    // compliance_status is absent from these signals, so buildInferences also
    // adds its own default "Pre-SOC 2" inference — expected and unrelated to
    // the boolean labels under test, so filter to just the boolean chips.
    const signals = boolTypes.map((type) => ({ type, value: true, confidence: 'probable' }));
    const result = buildInferences(signals, ['homepage'], 'https://example.com', {});
    const boolInferences = result.inferences.filter((i) => boolTypes.includes(i.inference_id.replace('inf_', '')));

    expect(boolInferences).toHaveLength(boolTypes.length);
    for (const inf of boolInferences) {
      expect(typeof inf.label).toBe('string');
      expect(inf.label.trim().length).toBeGreaterThan(0);
      expect(inf.label).not.toMatch(/^true$/i);
    }
    expect(boolInferences.map((i) => i.label)).toEqual(
      expect.arrayContaining(['Handles payments', 'Uses AI', 'Handles personal data']),
    );
  });

  it('filters out any inference whose synthesized label is empty or a bare boolean', () => {
    // A signal type with no label mapping at all would otherwise fall through
    // to `signal.value` (the literal boolean `true`) — the exact bug closed.
    const signals = [{ type: 'unmapped_boolean_type', value: true, confidence: 'probable' }];
    const result = buildInferences(signals, ['homepage'], 'https://example.com', {});
    expect(result.inferences.some((i) => i.label === true || i.label === 'true')).toBe(false);
  });
});
