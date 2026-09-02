// The interview: three answers, not two. John, 2026-09-02 — "you have the ability to
// say 'i don't know, yes, correct' - or skip the lot... but would keep the tiles you
// have". The point is that it compounds: every answer permanently improves the record,
// and nothing is lost by stopping.
import { describe, it, expect } from 'vitest';
import {
  CLAIM_STATUSES, buildClaimEvent, claimsProjection, nextConfirmable, interviewQueue,
} from '../../src/services/claims-projection.js';

const project = (claims, events) =>
  claimsProjection({ record_claims: claims, claim_events: events });

const claim = (id, field, value) => ({
  claim_id: id, field, value, status: 'inferred', provenance: 'inferred',
});
const CLAIMS = [
  claim('c1', 'infrastructure.cloud_provider', 'AWS'),
  claim('c2', 'product.type', 'Software product'),
  claim('c3', 'market.customer_type', 'Mixed'),
  claim('c4', 'governance.cyber_insurance', 'none'),
];

describe('"I don\'t know" is a first-class answer', () => {
  it('is a real status, distinct from inferred and rejected', () => {
    expect(CLAIM_STATUSES).toContain('unknown');
    expect(CLAIM_STATUSES).toContain('inferred');
    expect(CLAIM_STATUSES).toContain('rejected');
  });

  it('is an accepted event type', () => {
    expect(() => buildClaimEvent('c1', { type: 'unknown', actor: 'founder' })).not.toThrow();
  });

  it('still rejects a genuinely unknown event type', () => {
    expect(() => buildClaimEvent('c1', { type: 'shrug', actor: 'founder' }))
      .toThrow(/unknown_claim_event_type/);
  });

  it('folds to unknown and mints no evidence — not-knowing is not testimony', () => {
    const [c] = project(
      [claim('c1', 'infrastructure.cloud_provider', 'AWS')],
      [buildClaimEvent('c1', { type: 'unknown', actor: 'founder' })],
    );
    expect(c.status).toBe('unknown');
    expect(c.confirmed).toBeNull();
    expect(c.value).toBe('AWS');       // the inference survives, unchanged
  });

  it('does not overwrite the inferred value the way a correction does', () => {
    const [unknown] = project(
      [claim('c1', 'infrastructure.cloud_provider', 'AWS')],
      [buildClaimEvent('c1', { type: 'unknown', actor: 'founder' })],
    );
    const [corrected] = project(
      [claim('c1', 'infrastructure.cloud_provider', 'AWS')],
      [buildClaimEvent('c1', { type: 'corrected', value: 'Oracle', actor: 'founder' })],
    );
    expect(unknown.value).toBe('AWS');
    expect(corrected.value).toBe('Oracle');
  });
});

describe('an answered claim is never asked again', () => {
  for (const type of ['confirmed', 'corrected', 'rejected', 'unknown']) {
    it(`treats "${type}" as answered`, () => {
      const claims = claimsProjection({ record_claims: CLAIMS, claim_events: [
        buildClaimEvent('c1', { type, value: 'Oracle', actor: 'founder' }),
      ] });
      expect(interviewQueue(claims).map((c) => c.claim_id)).not.toContain('c1');
      expect(nextConfirmable(claims)?.claim_id).not.toBe('c1');
    });
  }
});

describe('ask order', () => {
  const queue = interviewQueue(claimsProjection({ record_claims: CLAIMS, claim_events: [] }));

  it('opens on the gimme — the question that earns the first yes', () => {
    expect(queue[0].field).toBe('infrastructure.cloud_provider');
  });

  it('puts position ahead of posture, so stopping early still pays', () => {
    const at = (f) => queue.findIndex((c) => c.field === f);
    expect(at('product.type')).toBeLessThan(at('governance.cyber_insurance'));
    expect(at('market.customer_type')).toBeLessThan(at('governance.cyber_insurance'));
  });

  it('agrees with nextConfirmable — one queue, one order', () => {
    expect(queue[0].claim_id).toBe(nextConfirmable(claimsProjection({ record_claims: CLAIMS, claim_events: [] })).claim_id);
  });

  it('carries no count and no total — never "3 of 12"', () => {
    expect(Array.isArray(queue)).toBe(true);
    expect(queue).not.toHaveProperty('total');
    expect(queue).not.toHaveProperty('step');
  });
});

describe('skipping loses nothing', () => {
  it('answering some and stopping keeps every claim in the record', () => {
    const claims = claimsProjection({ record_claims: CLAIMS, claim_events: [
      buildClaimEvent('c1', { type: 'confirmed', actor: 'founder' }),
      buildClaimEvent('c2', { type: 'unknown', actor: 'founder' }),
    ] });
    expect(claims).toHaveLength(4);                       // all tiles survive
    expect(interviewQueue(claims)).toHaveLength(2);       // only the unanswered remain
    expect(claims.find((c) => c.claim_id === 'c1').status).toBe('confirmed');
    expect(claims.find((c) => c.claim_id === 'c2').status).toBe('unknown');
  });

  it('leaves the queue empty rather than erroring when everything is answered', () => {
    const claims = project(CLAIMS, CLAIMS.map(
      (c) => buildClaimEvent(c.claim_id, { type: 'unknown', actor: 'founder' }),
    ));
    expect(interviewQueue(claims)).toEqual([]);
    expect(nextConfirmable(claims)).toBeNull();
  });
});
