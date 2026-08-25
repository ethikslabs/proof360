// Honesty wave item 1 (mid-build amendment, John ruling): a cloud-provider
// mention in extracted marketing text is re-typed BEFORE it ever reaches
// inference-builder.js — `infrastructure` only for an explicit statement
// about the company's OWN hosting, `works_with` for everything else (a
// vendor/technology relationship, e.g. a consultancy implementing AWS for
// clients). This is deterministic post-processing over the extraction JSON
// (mapToSignals), not the live Bedrock call — testable without a model.
import { describe, it, expect } from 'vitest';
import { mapToSignals } from '../../src/services/signal-extractor.js';

describe('mapToSignals — hosting vs relationship re-typing', () => {
  it('an explicit self-hosting statement becomes an "infrastructure" (hosting) signal', () => {
    const signals = mapToSignals({
      own_hosting_provider: 'Oracle',
      vendor_relationships: [],
      confidence: 'confident',
    });
    const hosting = signals.find((s) => s.type === 'infrastructure');
    expect(hosting).toBeTruthy();
    expect(hosting.value).toBe('Oracle');
    expect(hosting.claim_type).toBe('hosting');
  });

  it('a vendor mentioned as a relationship becomes a "works_with" signal, never "infrastructure"', () => {
    const signals = mapToSignals({
      own_hosting_provider: 'Unknown',
      vendor_relationships: ['AWS'],
      confidence: 'probable',
    });
    expect(signals.find((s) => s.type === 'infrastructure')).toBeUndefined();
    const relationship = signals.find((s) => s.type === 'works_with');
    expect(relationship.value).toBe('AWS');
    expect(relationship.claim_type).toBe('relationship');
  });

  it('the Cognisys case: both can be present at once, distinctly typed', () => {
    const signals = mapToSignals({
      own_hosting_provider: 'Oracle',
      vendor_relationships: ['AWS', 'Azure'],
      confidence: 'confident',
    });
    expect(signals.filter((s) => s.type === 'infrastructure')).toHaveLength(1);
    expect(signals.filter((s) => s.type === 'works_with')).toHaveLength(2);
    expect(signals.find((s) => s.type === 'infrastructure').value).toBe('Oracle');
    expect(signals.map((s) => s.value)).toEqual(expect.arrayContaining(['AWS', 'Azure']));
  });

  it('"Unknown" own_hosting_provider and empty vendor_relationships produce neither signal', () => {
    const signals = mapToSignals({ own_hosting_provider: 'Unknown', vendor_relationships: [] });
    expect(signals.find((s) => s.type === 'infrastructure')).toBeUndefined();
    expect(signals.find((s) => s.type === 'works_with')).toBeUndefined();
  });

  it('dedupes repeated vendor relationships case-insensitively', () => {
    const signals = mapToSignals({ vendor_relationships: ['AWS', 'aws', 'Aws'] });
    expect(signals.filter((s) => s.type === 'works_with')).toHaveLength(1);
  });

  it('missing extraction fields (older/degraded extraction) never throw', () => {
    expect(() => mapToSignals({})).not.toThrow();
    const signals = mapToSignals({});
    expect(signals.find((s) => s.type === 'infrastructure')).toBeUndefined();
    expect(signals.find((s) => s.type === 'works_with')).toBeUndefined();
  });
});
