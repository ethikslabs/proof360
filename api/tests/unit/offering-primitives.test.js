// The offering model: physical / software / services, three independent primitives.
// John, 2026-09-02: "you either sell a physical thing, a software thing, or a
// services thing - or any combination of those 3". This exists because the old flat
// enum had no value for a consultancy, so a 120-person services firm was extracted
// as "Software product" — and services-vs-product sets the valuation multiple.
import { describe, it, expect } from 'vitest';
import { offeringLabel, SIGNAL_CLASS, mapToSignals } from '../../src/services/signal-extractor.js';

describe('offeringLabel', () => {
  it('names a single primitive', () => {
    expect(offeringLabel({ services: true })).toBe('Services');
    expect(offeringLabel({ software: true })).toBe('Software');
    expect(offeringLabel({ physical: true })).toBe('Physical');
  });

  it('combines two — the case the old enum had to fudge as "Hybrid"', () => {
    expect(offeringLabel({ software: true, services: true })).toBe('Software + services');
    expect(offeringLabel({ physical: true, software: true })).toBe('Physical + software');
  });

  it('names all three without listing them as a sum', () => {
    expect(offeringLabel({ physical: true, software: true, services: true }))
      .toBe('Physical, software and services');
  });

  it('returns null rather than guessing when nothing is set', () => {
    expect(offeringLabel({})).toBeNull();
    expect(offeringLabel(null)).toBeNull();
    expect(offeringLabel(undefined)).toBeNull();
    expect(offeringLabel('services')).toBeNull();
  });
});

describe('signal classing', () => {
  it('classes position signals as position', () => {
    for (const t of ['offering', 'revenue_model', 'positioning_claim', 'concentration']) {
      expect(SIGNAL_CLASS[t]).toBe('position');
    }
  });

  it('classes security fields as posture so they can be buried, not dropped', () => {
    for (const t of ['data_sensitivity', 'handles_personal_data', 'pen_test_completed', 'has_backup']) {
      expect(SIGNAL_CLASS[t]).toBe('posture');
    }
  });

  it('attaches a class to every signal, defaulting to context', () => {
    const signals = mapToSignals({
      offering: { services: true },
      product_type: 'Professional services',
      data_sensitivity: 'PII',
      confidence: 'confident',
    });
    expect(signals.length).toBeGreaterThan(0);
    for (const s of signals) expect(s.signal_class).toBeTruthy();
  });
});

describe('a services company is read as services', () => {
  // The Cognisys case: a consultancy previously extracted as "Software product".
  const signals = mapToSignals({
    offering: { services: true },
    product_type: 'Professional services',
    revenue_model: 'Project fees',
    delivery_model: 'Consultant-delivered',
    positioning_claim: "Vanta's #1 Global Service Partner",
    claim_conferred_by: 'Self-asserted',
    concentration: ['Vanta'],
    confidence: 'confident',
  });
  const find = (t) => signals.find((s) => s.type === t);

  it('sells services, not software', () => {
    expect(find('offering').value).toBe('Services');
    expect(find('product_type').value).toBe('Professional services');
  });

  it('carries the position claim as a first-class signal, not a clause', () => {
    expect(find('positioning_claim').value).toBe("Vanta's #1 Global Service Partner");
  });

  it('records who stands behind the claim', () => {
    expect(find('claim_conferred_by').value).toBe('Self-asserted');
  });

  it('names what the positioning depends on', () => {
    const dep = find('concentration');
    expect(dep.value).toBe('Vanta');
    expect(dep.claim_type).toBe('dependency');
  });

  it('puts every one of those in the position class', () => {
    for (const t of ['offering', 'revenue_model', 'positioning_claim', 'concentration']) {
      expect(find(t).signal_class).toBe('position');
    }
  });
});
