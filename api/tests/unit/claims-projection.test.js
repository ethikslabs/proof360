import { describe, it, expect } from 'vitest';
import {
  CLAIM_STATUSES,
  buildClaimRecord,
  buildClaimEvent,
  buildInferredClaims,
  claimsProjection,
  nextConfirmable,
} from '../../src/services/claims-projection.js';

// Build a snapshot the way the store's reconstruct() would, from raw records —
// same idiom as cer-projection.test.js.
function snapshotFrom(records) {
  return {
    profile: { id: 'p1' },
    record_claims: records.filter((r) => r.primitive === 'record_claim'),
    claim_events: records.filter((r) => r.primitive === 'claim_event'),
  };
}

describe('buildClaimRecord', () => {
  it('mints an inferred claim with provenance, and a source (store requires it)', () => {
    const claim = buildClaimRecord({
      field: 'infrastructure.cloud_provider',
      value: 'aws',
      provenance: { method: 'recon-ip', detail: 'ASN AS16509 Amazon' },
    });
    expect(claim).toMatchObject({
      primitive: 'record_claim',
      field: 'infrastructure.cloud_provider',
      value: 'aws',
      status: 'inferred',
    });
    expect(claim.claim_id).toBeTruthy();
    expect(claim.source).toBeTruthy(); // normalizeRecord() throws without source
    expect(claim.provenance.method).toBe('recon-ip');
    expect(claim.provenance.detail).toBe('ASN AS16509 Amazon');
    expect(claim.provenance.at).toBeTruthy();
    expect(claim.confirmed).toBeNull();
  });

  it('rejects a claim without a field, value, or provenance method (default-deny)', () => {
    expect(() => buildClaimRecord({ value: 'aws', provenance: { method: 'recon-ip' } }))
      .toThrow(/claim_field_required/);
    expect(() => buildClaimRecord({ field: 'x', provenance: { method: 'recon-ip' } }))
      .toThrow(/claim_value_required/);
    expect(() => buildClaimRecord({ field: 'x', value: 'y' }))
      .toThrow(/claim_provenance_method_required/);
    expect(() => buildClaimRecord({ field: 'x', value: 'y', provenance: { method: 'made-up' } }))
      .toThrow(/unknown_provenance_method/);
  });
});

describe('buildClaimEvent', () => {
  it('builds a confirmed event carrying who/when/via', () => {
    const ev = buildClaimEvent('clm-1', { type: 'confirmed', actor: 'founder', via: 'chat' });
    expect(ev).toMatchObject({
      primitive: 'claim_event',
      claim_id: 'clm-1',
      type: 'confirmed',
      actor: 'founder',
      via: 'chat',
    });
    expect(ev.source).toBeTruthy();
    expect(ev.ts).toBeTruthy();
  });

  it('a corrected event requires the new value; unknown event types refuse (positive list)', () => {
    expect(() => buildClaimEvent('clm-1', { type: 'corrected', actor: 'founder', via: 'chat' }))
      .toThrow(/corrected_value_required/);
    expect(() => buildClaimEvent('clm-1', { type: 'overwritten', actor: 'founder', via: 'chat' }))
      .toThrow(/unknown_claim_event_type/);
    const ev = buildClaimEvent('clm-1', { type: 'corrected', value: 'gcp', actor: 'founder', via: 'chat' });
    expect(ev.value).toBe('gcp');
  });
});

describe('claimsProjection — the truth ladder fold', () => {
  it('a fresh claim projects as inferred with its provenance intact', () => {
    const claim = buildClaimRecord({
      field: 'infrastructure.cloud_provider',
      value: 'aws',
      provenance: { method: 'recon-ip', detail: 'ASN AS16509 Amazon' },
    });
    const [projected] = claimsProjection(snapshotFrom([claim]));
    expect(projected).toMatchObject({
      claim_id: claim.claim_id,
      field: 'infrastructure.cloud_provider',
      value: 'aws',
      status: 'inferred',
    });
    expect(projected.provenance.detail).toBe('ASN AS16509 Amazon');
    expect(projected.confirmed).toBeNull();
    // The projection serves the human label — the UI never renders a raw path tail.
    expect(projected.label).toBe('cloud provider');
  });

  it('a confirmed event flips status and records first-party testimony', () => {
    const claim = buildClaimRecord({
      field: 'infrastructure.cloud_provider',
      value: 'aws',
      provenance: { method: 'recon-ip', detail: 'ASN AS16509 Amazon' },
    });
    const ev = buildClaimEvent(claim.claim_id, { type: 'confirmed', actor: 'founder', via: 'chat' });
    const [projected] = claimsProjection(snapshotFrom([claim, ev]));
    expect(projected.status).toBe('confirmed');
    expect(projected.value).toBe('aws');
    expect(projected.confirmed).toMatchObject({ by: 'founder', via: 'chat' });
    expect(projected.confirmed.at).toBeTruthy();
  });

  it('a corrected event replaces the value but the original stays in the event log', () => {
    const claim = buildClaimRecord({
      field: 'infrastructure.cloud_provider',
      value: 'azure',
      provenance: { method: 'claude-inference', detail: 'logo on site' },
    });
    const ev = buildClaimEvent(claim.claim_id, {
      type: 'corrected', value: 'aws', actor: 'founder', via: 'chat',
    });
    const [projected] = claimsProjection(snapshotFrom([claim, ev]));
    expect(projected.status).toBe('corrected');
    expect(projected.value).toBe('aws');
    // A user correction IS first-party testimony — it counts as confirmed-grade.
    expect(projected.confirmed).toMatchObject({ by: 'founder', via: 'chat' });
    // The original inferred value survives, append-only.
    expect(projected.inferred_value).toBe('azure');
    expect(projected.events).toHaveLength(1);
  });

  it('folds by append order, not wall-clock ts (same law as the CER fold)', () => {
    const claim = buildClaimRecord({
      field: 'compliance.soc2_status',
      value: 'pre-audit',
      provenance: { method: 'claude-inference', detail: 'no trust page found' },
    });
    // Appended confirmed THEN rejected, but the clock ran backwards on the second event.
    const first = { ...buildClaimEvent(claim.claim_id, { type: 'confirmed', actor: 'founder', via: 'chat' }), ts: '2026-08-22T10:00:05.000Z' };
    const second = { ...buildClaimEvent(claim.claim_id, { type: 'rejected', actor: 'founder', via: 'chat' }), ts: '2026-08-22T10:00:01.000Z' };
    const [projected] = claimsProjection(snapshotFrom([claim, first, second]));
    expect(projected.status).toBe('rejected');
  });

  it('handles multiple claims independently and ignores events for unknown claims', () => {
    const a = buildClaimRecord({ field: 'f.a', value: '1', provenance: { method: 'recon-dns' } });
    const b = buildClaimRecord({ field: 'f.b', value: '2', provenance: { method: 'recon-http' } });
    const ev = buildClaimEvent(a.claim_id, { type: 'confirmed', actor: 'founder', via: 'chat' });
    const orphan = buildClaimEvent('clm-nonexistent', { type: 'confirmed', actor: 'founder', via: 'chat' });
    const projected = claimsProjection(snapshotFrom([a, b, ev, orphan]));
    expect(projected).toHaveLength(2);
    expect(projected.find((c) => c.field === 'f.a').status).toBe('confirmed');
    expect(projected.find((c) => c.field === 'f.b').status).toBe('inferred');
  });
});

describe('buildInferredClaims — cold read → inferred claims', () => {
  it('maps recon cloud_provider to a recon-ip claim with named provenance', () => {
    const claims = buildInferredClaims({
      recon: { cloud_provider: 'aws', cdn_provider: 'cloudflare', mx_provider: 'Google Workspace' },
      signals: [],
    });
    const infra = claims.find((c) => c.field === 'infrastructure.cloud_provider');
    expect(infra).toBeTruthy();
    expect(infra.value).toBe('aws');
    expect(infra.status).toBe('inferred');
    expect(infra.provenance.method).toBe('recon-ip');
    const cdn = claims.find((c) => c.field === 'infrastructure.cdn_provider');
    expect(cdn.value).toBe('cloudflare');
    const mail = claims.find((c) => c.field === 'infrastructure.email_provider');
    expect(mail.value).toBe('Google Workspace');
    expect(mail.provenance.method).toBe('recon-dns');
  });

  it('maps extraction signals to claude-inference claims and skips unknowns', () => {
    const claims = buildInferredClaims({
      recon: {},
      signals: [
        { type: 'customer_type', value: 'Enterprise', confidence: 'probable' },
        { type: 'stage', value: 'Seed', confidence: 'probable' },
        { type: 'unmapped_mystery', value: 'x', confidence: 'probable' },
      ],
    });
    const customer = claims.find((c) => c.field === 'market.customer_type');
    expect(customer.value).toBe('Enterprise');
    expect(customer.provenance.method).toBe('claude-inference');
    const stage = claims.find((c) => c.field === 'company.stage');
    expect(stage.value).toBe('Seed');
    expect(claims.find((c) => c.field?.includes('unmapped_mystery'))).toBeUndefined();
  });

  it('emits nothing for empty inputs — never invents a claim', () => {
    expect(buildInferredClaims({ recon: {}, signals: [] })).toEqual([]);
    expect(buildInferredClaims({})).toEqual([]);
  });
});

describe('buildInferredClaims — reconcile, never drop the conflicting witness (I3, review 2026-08-25)', () => {
  it('a disagreeing text-derived hosting claim is attached as .conflict, not silently dropped', () => {
    const claims = buildInferredClaims({
      recon: { cloud_provider: 'Oracle' },
      signals: [{ type: 'infrastructure', value: 'AWS', confidence: 'probable' }],
    });
    // Still exactly one claim on the field — recon wins the field itself —
    // but the disagreeing witness is visible, not vanished.
    const infraClaims = claims.filter((c) => c.field === 'infrastructure.cloud_provider');
    expect(infraClaims).toHaveLength(1);
    const infra = infraClaims[0];
    expect(infra.value).toBe('Oracle');
    expect(infra.provenance.method).toBe('recon-ip');
    expect(infra.conflicted).toBe(true);
    expect(infra.conflict).toEqual({ probe_says: 'Oracle', source_says: 'AWS' });
  });

  it('agreement (fuzzy provider match) never manufactures a conflict', () => {
    const claims = buildInferredClaims({
      recon: { cloud_provider: 'Oracle' },
      signals: [{ type: 'infrastructure', value: 'Oracle', confidence: 'probable' }],
    });
    const infra = claims.find((c) => c.field === 'infrastructure.cloud_provider');
    expect(infra.conflicted).toBe(false);
    expect(infra.conflict).toBeNull();
  });

  it('the conflict survives the claimsProjection fold', () => {
    const claims = buildInferredClaims({
      recon: { cloud_provider: 'Oracle' },
      signals: [{ type: 'infrastructure', value: 'AWS', confidence: 'probable' }],
    });
    const [projected] = claimsProjection(snapshotFrom(claims));
    expect(projected.conflicted).toBe(true);
    expect(projected.conflict).toEqual({ probe_says: 'Oracle', source_says: 'AWS' });
  });
});

describe('store reconstruct() carries Record primitives', () => {
  it('record_claim and claim_event ride the transaction log into the snapshot verbatim', async () => {
    const { _internals } = await import('../../src/services/memory-store-file.js');
    const claim = buildClaimRecord({
      field: 'infrastructure.cloud_provider', value: 'aws',
      provenance: { method: 'recon-ip', detail: 'ASN AS16509 Amazon' },
    });
    const ev = buildClaimEvent(claim.claim_id, { type: 'confirmed', actor: 'founder', via: 'chat' });
    const snapshot = _internals.reconstruct({ id: 'p1' }, [
      { tx_id: 't1', created_at: 'x', source: 'cold_read', metadata: {}, records: [claim] },
      { tx_id: 't2', created_at: 'y', source: 'founder', metadata: {}, records: [ev] },
    ]);
    expect(snapshot.record_claims).toHaveLength(1);
    expect(snapshot.claim_events).toHaveLength(1);
    const [projected] = claimsProjection(snapshot);
    expect(projected.status).toBe('confirmed');
  });
});

describe('nextConfirmable — one confirm prompt per exchange', () => {
  const mk = (field, value, status = 'inferred') => {
    const c = buildClaimRecord({ field, value, provenance: { method: 'recon-ip' } });
    if (status === 'inferred') return c;
    return [c, buildClaimEvent(c.claim_id, {
      type: status, value: status === 'corrected' ? value : undefined, actor: 'founder', via: 'chat',
    })];
  };

  it('picks the highest-priority inferred claim and never a confirmed/corrected/rejected one', () => {
    const records = [
      mk('company.stage', 'Seed'),
      mk('infrastructure.cloud_provider', 'aws'),
      mk('market.customer_type', 'Enterprise', 'confirmed'),
    ].flat();
    const claims = claimsProjection(snapshotFrom(records));
    const next = nextConfirmable(claims);
    // infrastructure outranks company stage in the confirm order
    expect(next.field).toBe('infrastructure.cloud_provider');
  });

  it('returns null when nothing is left to confirm — personas never re-ask', () => {
    const records = [
      mk('infrastructure.cloud_provider', 'aws', 'confirmed'),
      mk('company.stage', 'Series A', 'corrected'),
      mk('market.customer_type', 'SMB', 'rejected'),
    ].flat();
    const claims = claimsProjection(snapshotFrom(records));
    expect(nextConfirmable(claims)).toBeNull();
  });
});
