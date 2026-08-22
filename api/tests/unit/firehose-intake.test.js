// The firehose intake (John go 2026-08-23): no site, no deck — the founder just talks,
// and the system catches fragments and reflects them back BETTER (fire-hose method as
// product). Everything caught is an inferred claim with provenance founder-utterance;
// the reflect-back is what turns a stream of words into something the confirm ceremony
// can confirm. Pure pieces tested deterministically; the Claude parse is a thin wrapper.
import { describe, it, expect } from 'vitest';
import {
  buildUtteranceClaims,
  reflectBack,
} from '../../src/services/firehose-intake.js';
import { claimsProjection } from '../../src/services/claims-projection.js';

function snapshotFrom(records) {
  return {
    record_claims: records.filter((r) => r.primitive === 'record_claim'),
    claim_events: records.filter((r) => r.primitive === 'claim_event'),
  };
}

describe('buildUtteranceClaims — spoken fragments become inferred claims', () => {
  const extracted = {
    product_type: 'B2B SaaS',
    stage: 'Pre-seed',
    sector: 'fintech',
    customer_type: 'Enterprise (B2B)',
    infrastructure: 'AWS',
  };

  it('maps parsed fields to claims with founder-utterance provenance', () => {
    const claims = buildUtteranceClaims(extracted);
    const stage = claims.find((c) => c.field === 'company.stage');
    expect(stage.value).toBe('Pre-seed');
    expect(stage.status).toBe('inferred');
    expect(stage.provenance.method).toBe('founder-utterance');
    expect(stage.provenance.detail).toMatch(/you said|from what you told/i);
  });

  it('every claim folds through the SAME truth ladder as a URL cold read', () => {
    const claims = buildUtteranceClaims(extracted);
    const projected = claimsProjection(snapshotFrom(claims));
    expect(projected.length).toBe(claims.length);
    for (const c of projected) expect(c.status).toBe('inferred');
    expect(projected.find((c) => c.field === 'product.type').value).toBe('B2B SaaS');
  });

  it('skips Unknown/empty fields — never invents a claim from silence', () => {
    const claims = buildUtteranceClaims({
      product_type: 'Unknown', stage: '', sector: 'saas', customer_type: null,
    });
    expect(claims).toHaveLength(1);
    expect(claims[0].field).toBe('company.sector');
  });

  it('returns nothing for an unparseable utterance — honest empty Record', () => {
    expect(buildUtteranceClaims({})).toEqual([]);
    expect(buildUtteranceClaims(null)).toEqual([]);
  });
});

describe('reflectBack — catch fragments, return them better', () => {
  it('reflects a structured read of what was heard, then asks to confirm', () => {
    const claims = buildUtteranceClaims({
      product_type: 'B2B SaaS', stage: 'Pre-seed', sector: 'fintech', infrastructure: 'AWS',
    });
    const projected = claimsProjection(snapshotFrom(claims));
    const text = reflectBack(projected);
    // it plays back the fields in human words
    expect(text).toMatch(/pre-seed/i);
    expect(text).toMatch(/fintech/i);
    expect(text).toMatch(/AWS/);
    // it never claims certainty — this is a read, not a verdict
    expect(text).toMatch(/here'?s what i (heard|caught|got)/i);
    // it hands control back — confirm or fix
    expect(text).toMatch(/right\?|did i (get|catch) that|fix|change/i);
  });

  it('when nothing was caught, it says so honestly and invites more', () => {
    const text = reflectBack([]);
    expect(text).toMatch(/didn'?t catch|tell me more|couldn'?t make out/i);
    expect(text).not.toMatch(/here'?s what i heard/i);
  });
});
