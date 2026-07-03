import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildCerRecords,
  buildConsentWithdrawnRecord,
  buildStatusUpdatedRecord,
  cerProjection,
  projectForViewer,
  canTransition,
} from '../../src/services/cer-projection.js';

// Build a snapshot the way the store's reconstruct() would, from raw records.
function snapshotFrom(records) {
  return {
    profile: { id: 'p1' },
    decisions: records.filter((r) => r.primitive === 'decision'),
    cer_events: records.filter((r) => r.primitive === 'cer_event'),
  };
}

describe('buildCerRecords', () => {
  it('emits a decision + a consent-granted event, each with a source (store requires it)', () => {
    const { cerId, records } = buildCerRecords({
      route: 'ingram_micro_aws',
      person_id: 'person-1',
      company_id: 'company-1',
      evidence_refs: ['claim-9'],
    });
    const decision = records.find((r) => r.primitive === 'decision');
    const consent = records.find((r) => r.primitive === 'cer_event');

    expect(decision).toMatchObject({
      id: cerId,
      decision_type: 'commercial_engagement',
      pathway_type: 'cloud_program',
      route: 'ingram_micro_aws',
      status: 'Submitted',
      person_id: 'person-1',
      company_id: 'company-1',
      evidence_refs: ['claim-9'],
    });
    expect(decision.visibility_policy.partner).toBe('ingram_micro');
    expect(consent).toMatchObject({ cer_id: cerId, type: 'consent-granted' });
    // normalizeRecord() throws without source — assert both carry one.
    expect(decision.source).toBeTruthy();
    expect(consent.source).toBeTruthy();
  });

  it('rejects an unknown route and a route/pathway_type mismatch', () => {
    expect(() => buildCerRecords({ route: 'nope' })).toThrow(/unknown_cer_route/);
    expect(() =>
      buildCerRecords({ route: 'vanta', pathway_type: 'cloud_program', person_id: 'p', company_id: 'c' })
    ).toThrow(/pathway_type_route_mismatch/);
  });
});

describe('cerProjection — folding status + consent', () => {
  it('a fresh CER projects as Submitted, consent granted, partner sharing on', () => {
    const { records } = buildCerRecords({ route: 'ingram_micro_aws', person_id: 'p', company_id: 'c' });
    const [cer] = cerProjection(snapshotFrom(records));
    expect(cer).toMatchObject({ status: 'Submitted', consent_state: 'granted', partner_sharing: true });
  });

  it('folds the latest status-updated event into status', () => {
    const { cerId, records } = buildCerRecords({ route: 'vanta', person_id: 'p', company_id: 'c' });
    records.push(buildStatusUpdatedRecord(cerId, { from: 'Submitted', to: 'Under review' }));
    records.push(buildStatusUpdatedRecord(cerId, { from: 'Under review', to: 'Booked' }));
    const [cer] = cerProjection(snapshotFrom(records));
    expect(cer.status).toBe('Booked');
    expect(cer.admin_status).toBe('Booked');
  });

  // CER-CONSENT-GATES-001 (a): the append-only log's order is authoritative, NOT wall-clock ts.
  // A non-monotonic clock (NTP step, skew) must not reorder the fold.
  it('folds status by append order, not wall-clock ts', () => {
    const { cerId, records } = buildCerRecords({ route: 'vanta', person_id: 'p', company_id: 'c' });
    // Appended Under review -> Booked, but the clock ran BACKWARDS so Booked has an EARLIER ts.
    records.push({ primitive: 'cer_event', id: 'e1', source: 'ethiks360_admin', cer_id: cerId, type: 'status-updated', from: 'Submitted', to: 'Under review', actor: 'ethiks360_admin', ts: '2026-07-04T10:00:02.000Z' });
    records.push({ primitive: 'cer_event', id: 'e2', source: 'ethiks360_admin', cer_id: cerId, type: 'status-updated', from: 'Under review', to: 'Booked', actor: 'ethiks360_admin', ts: '2026-07-04T10:00:01.000Z' });
    const [cer] = cerProjection(snapshotFrom(records));
    expect(cer.admin_status).toBe('Booked'); // last APPENDED wins, not latest-ts
  });

  it('folds consent by append order — a withdraw appended after grant wins even with an earlier ts', () => {
    const { cerId, records } = buildCerRecords({ route: 'vanta', person_id: 'p', company_id: 'c' });
    // consent-granted was stamped "now" by buildCerRecords; the withdraw is appended AFTER but
    // carries a far-earlier ts. Append order must still yield withdrawn.
    records.push({ primitive: 'cer_event', id: 'w1', source: 'founder', cer_id: cerId, type: 'consent-withdrawn', actor: 'founder', ts: '2000-01-01T00:00:00.000Z' });
    const [cer] = cerProjection(snapshotFrom(records));
    expect(cer.consent_state).toBe('withdrawn');
  });

  it('consent-withdrawn OVERRIDES admin status at read time, preserving audit', () => {
    const { cerId, records } = buildCerRecords({ route: 'vanta', person_id: 'p', company_id: 'c' });
    records.push(buildStatusUpdatedRecord(cerId, { from: 'Submitted', to: 'Under review' }));
    records.push(buildConsentWithdrawnRecord(cerId, { actor: 'founder' }));
    const [cer] = cerProjection(snapshotFrom(records));
    expect(cer.consent_state).toBe('withdrawn');
    expect(cer.status).toBe('Closed'); // withdrawn overrides
    expect(cer.admin_status).toBe('Under review'); // stored status preserved for admin
    expect(cer.partner_sharing).toBe(false);
    // the original consent-granted is never erased
    expect(cer.events.filter((e) => e.type === 'consent-granted')).toHaveLength(1);
  });

  it('withdrawing one CER does not touch another', () => {
    const aws = buildCerRecords({ route: 'ingram_micro_aws', person_id: 'p', company_id: 'c' });
    const vanta = buildCerRecords({ route: 'vanta', person_id: 'p', company_id: 'c' });
    const records = [...aws.records, ...vanta.records, buildConsentWithdrawnRecord(vanta.cerId)];
    const byId = Object.fromEntries(cerProjection(snapshotFrom(records)).map((c) => [c.cer_id, c]));
    expect(byId[vanta.cerId].consent_state).toBe('withdrawn');
    expect(byId[aws.cerId].consent_state).toBe('granted');
  });
});

describe('status transition machine (§6)', () => {
  it('allows the legal transitions and rejects the rest', () => {
    expect(canTransition('Submitted', 'Under review')).toBe(true);
    expect(canTransition('Under review', 'Booked')).toBe(true);
    expect(canTransition('Needs info', 'Booked')).toBe(false); // must go via Under review
    expect(canTransition('Closed', 'Under review')).toBe(false); // terminal
    expect(() => buildStatusUpdatedRecord('x', { from: 'Closed', to: 'Booked' })).toThrow(/illegal_cer_transition/);
  });
});

describe('projectForViewer — the no-leak proof (§8, the success condition)', () => {
  function fourPathwayCers() {
    const records = [
      ...buildCerRecords({ route: 'ingram_micro_aws', person_id: 'p', company_id: 'c' }).records,
      ...buildCerRecords({ route: 'austbrokers_cyberpro', person_id: 'p', company_id: 'c' }).records,
      ...buildCerRecords({ route: 'vanta', person_id: 'p', company_id: 'c' }).records,
      ...buildCerRecords({ route: 'ingram_micro_cisco', person_id: 'p', company_id: 'c' }).records,
    ];
    return cerProjection(snapshotFrom(records));
  }

  it('an Ingram-scoped viewer sees ONLY the two Ingram routes, never Vanta/Austbrokers', () => {
    const cers = fourPathwayCers();
    const ingramView = projectForViewer(cers, { audience: 'partner', partner: 'ingram_micro' });
    const routes = ingramView.map((c) => c.route).sort();
    expect(routes).toEqual(['ingram_micro_aws', 'ingram_micro_cisco']);
    expect(routes).not.toContain('vanta');
    expect(routes).not.toContain('austbrokers_cyberpro');
  });

  it('founder and admin see all four; an unknown audience sees nothing', () => {
    const cers = fourPathwayCers();
    expect(projectForViewer(cers, { audience: 'founder' })).toHaveLength(4);
    expect(projectForViewer(cers, { audience: 'ethiks360_admin' })).toHaveLength(4);
    expect(projectForViewer(cers, { audience: 'mystery' })).toHaveLength(0);
  });

  it('a withdrawn Ingram CER drops out of the partner view (no further sharing)', () => {
    const aws = buildCerRecords({ route: 'ingram_micro_aws', person_id: 'p', company_id: 'c' });
    const cisco = buildCerRecords({ route: 'ingram_micro_cisco', person_id: 'p', company_id: 'c' });
    const records = [...aws.records, ...cisco.records, buildConsentWithdrawnRecord(aws.cerId)];
    const cers = cerProjection(snapshotFrom(records));
    const ingramView = projectForViewer(cers, { audience: 'partner', partner: 'ingram_micro' });
    expect(ingramView.map((c) => c.route)).toEqual(['ingram_micro_cisco']);
  });
});

// End-to-end proof that the reconstruct() extension actually carries CER records through a
// real write + replay cycle — the silent-drop landmine, guarded against regression.
describe('CER records survive a real store round-trip (reconstruct fix)', () => {
  let root;
  let store;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'proof360-cer-'));
    vi.resetModules();
    process.env.MEMORY_STORE_DIR = root;
    store = await import('../../src/services/memory-store-file.js');
  });

  afterEach(async () => {
    delete process.env.MEMORY_STORE_DIR;
    await rm(root, { recursive: true, force: true });
  });

  it('appended decision + cer_event reappear in the replayed snapshot', async () => {
    const founder = await store.getOrCreateFounder({ sub: 'auth0|cer', email: 'cer@example.com' });
    const profile = await store.getOrCreateActiveProfile(founder);

    const { cerId, records } = buildCerRecords({
      route: 'ingram_micro_aws',
      person_id: 'person-1',
      company_id: 'company-1',
    });
    await store.appendTransaction(profile.id, records, { source: 'founder' });

    const snapshot = await store.replayProfile(profile.id);
    expect(snapshot.decisions).toHaveLength(1);
    expect(snapshot.cer_events).toHaveLength(1);
    expect(snapshot.decisions[0].id).toBe(cerId);

    const [cer] = cerProjection(snapshot);
    expect(cer).toMatchObject({ cer_id: cerId, status: 'Submitted', consent_state: 'granted' });
  });
});
