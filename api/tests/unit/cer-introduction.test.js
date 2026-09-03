// CONSENT-BOTH-ENDS-001 on the one edge proof360 creates between a founder and a partner:
// the introduction. An edge exists only if both ends consent, both see it, and either can
// revoke. The partner consents by asking; the founder consents by granting; the founder's
// contact is projected to the partner ONLY while the grant stands. Built in the Sarvesh Lab
// workshop round 3 (2026-09-03) — the lab's "Ask for an introduction" had the partner's own
// second click standing in for the founder; this is the founder's side made real.
import { describe, it, expect } from 'vitest';
import {
  buildCerRecords,
  buildConsentWithdrawnRecord,
  buildIntroductionEvent,
  cerProjection,
  projectForViewer,
  introductionForPartner,
  canRequestIntroduction,
  canDecideIntroduction,
  canWithdrawIntroduction,
} from '../../src/services/cer-projection.js';

function snapshotFrom(records) {
  return {
    profile: { id: 'p1' },
    decisions: records.filter((r) => r.primitive === 'decision'),
    cer_events: records.filter((r) => r.primitive === 'cer_event'),
  };
}
const FOUNDER = { name: 'Mel', email: 'mel@hiveandco.au' };
function fresh() {
  const { cerId, records } = buildCerRecords({ route: 'ingram_micro_aws', person_id: 'per-1', company_id: 'co-1' });
  return { cerId, records };
}
function project(records, cerId) {
  return cerProjection(snapshotFrom(records)).find((c) => c.cer_id === cerId);
}

describe('introduction — the fold', () => {
  it('starts as none; a request makes it asked; a grant makes it granted', () => {
    const { cerId, records } = fresh();
    expect(project(records, cerId).introduction).toEqual({ state: 'none', partner: null, asked_at: null, decided_at: null, withdrawn_by: null });
    records.push(buildIntroductionEvent(cerId, { type: 'introduction-requested', actor: 'partner', partner: 'ingram_micro' }));
    let intro = project(records, cerId).introduction;
    expect(intro.state).toBe('asked');
    expect(intro.partner).toBe('ingram_micro');
    expect(intro.asked_at).toBeTruthy();
    records.push(buildIntroductionEvent(cerId, { type: 'introduction-granted', actor: 'founder' }));
    intro = project(records, cerId).introduction;
    expect(intro.state).toBe('granted');
    expect(intro.decided_at).toBeTruthy();
  });

  it('decline and withdraw are terminal for that ask; a new ask restarts, history kept', () => {
    const { cerId, records } = fresh();
    records.push(buildIntroductionEvent(cerId, { type: 'introduction-requested', actor: 'partner', partner: 'ingram_micro' }));
    records.push(buildIntroductionEvent(cerId, { type: 'introduction-declined', actor: 'founder' }));
    expect(project(records, cerId).introduction.state).toBe('declined');
    records.push(buildIntroductionEvent(cerId, { type: 'introduction-requested', actor: 'partner', partner: 'ingram_micro' }));
    records.push(buildIntroductionEvent(cerId, { type: 'introduction-granted', actor: 'founder' }));
    records.push(buildIntroductionEvent(cerId, { type: 'introduction-withdrawn', actor: 'partner', partner: 'ingram_micro' }));
    const intro = project(records, cerId).introduction;
    expect(intro.state).toBe('withdrawn');
    expect(intro.withdrawn_by).toBe('partner');
    expect(project(records, cerId).events.filter((e) => e.type.startsWith('introduction-'))).toHaveLength(5);
  });

  it('every event carries a source (the store rejects records without one)', () => {
    const e = buildIntroductionEvent('cer-x', { type: 'introduction-granted', actor: 'founder' });
    expect(e.primitive).toBe('cer_event');
    expect(e.source).toBe('founder');
    expect(() => buildIntroductionEvent('cer-x', { type: 'introduction-revealed', actor: 'partner' })).toThrow(/unknown_introduction_event/);
  });
});

describe('introduction — the gates are positive conditions', () => {
  it('a partner may ask only on a CER routed to them, with consent standing, and not while one is open', () => {
    const { cerId, records } = fresh();
    let cer = project(records, cerId);
    expect(canRequestIntroduction(cer, 'ingram_micro')).toBe(true);
    expect(canRequestIntroduction(cer, 'vanta')).toBe(false);
    expect(canRequestIntroduction(cer, undefined)).toBe(false);
    records.push(buildIntroductionEvent(cerId, { type: 'introduction-requested', actor: 'partner', partner: 'ingram_micro' }));
    cer = project(records, cerId);
    expect(canRequestIntroduction(cer, 'ingram_micro')).toBe(false);
    records.push(buildConsentWithdrawnRecord(cerId));
    cer = project(records, cerId);
    expect(canRequestIntroduction(cer, 'ingram_micro')).toBe(false);
  });

  it('the founder may decide only a standing ask; either end may withdraw only its own live edge', () => {
    const { cerId, records } = fresh();
    expect(canDecideIntroduction(project(records, cerId))).toBe(false);
    records.push(buildIntroductionEvent(cerId, { type: 'introduction-requested', actor: 'partner', partner: 'ingram_micro' }));
    let cer = project(records, cerId);
    expect(canDecideIntroduction(cer)).toBe(true);
    expect(canWithdrawIntroduction(cer, { actor: 'founder' })).toBe(true);
    expect(canWithdrawIntroduction(cer, { actor: 'partner', partner: 'ingram_micro' })).toBe(true);
    expect(canWithdrawIntroduction(cer, { actor: 'partner', partner: 'vanta' })).toBe(false);
    records.push(buildIntroductionEvent(cerId, { type: 'introduction-declined', actor: 'founder' }));
    cer = project(records, cerId);
    expect(canDecideIntroduction(cer)).toBe(false);
    expect(canWithdrawIntroduction(cer, { actor: 'founder' })).toBe(false);
  });
});

describe('introduction — what the partner sees', () => {
  it('the contact is projected only while the grant stands, and never person_id', () => {
    const { cerId, records } = fresh();
    const partnerView = () => {
      const cer = projectForViewer(cerProjection(snapshotFrom(records)), { audience: 'partner', partner: 'ingram_micro' })[0];
      return cer ? introductionForPartner(cer, FOUNDER) : null;
    };
    expect(partnerView()).toEqual({ state: 'none', asked_at: null, decided_at: null, contact: null });
    records.push(buildIntroductionEvent(cerId, { type: 'introduction-requested', actor: 'partner', partner: 'ingram_micro' }));
    expect(partnerView().state).toBe('asked');
    expect(partnerView().contact).toBeNull();
    records.push(buildIntroductionEvent(cerId, { type: 'introduction-granted', actor: 'founder' }));
    expect(partnerView().contact).toEqual({ name: 'Mel', email: 'mel@hiveandco.au' });
    expect(JSON.stringify(partnerView())).not.toContain('per-1');
    records.push(buildIntroductionEvent(cerId, { type: 'introduction-withdrawn', actor: 'founder' }));
    expect(partnerView().state).toBe('withdrawn');
    expect(partnerView().contact).toBeNull();
  });

  it('CER consent withdrawn removes the edge entirely — the partner no longer sees the record', () => {
    const { cerId, records } = fresh();
    records.push(buildIntroductionEvent(cerId, { type: 'introduction-requested', actor: 'partner', partner: 'ingram_micro' }));
    records.push(buildIntroductionEvent(cerId, { type: 'introduction-granted', actor: 'founder' }));
    records.push(buildConsentWithdrawnRecord(cerId));
    expect(projectForViewer(cerProjection(snapshotFrom(records)), { audience: 'partner', partner: 'ingram_micro' })).toEqual([]);
  });

  it('a founder with no email projects an honest null, not a throw', () => {
    const { cerId, records } = fresh();
    records.push(buildIntroductionEvent(cerId, { type: 'introduction-requested', actor: 'partner', partner: 'ingram_micro' }));
    records.push(buildIntroductionEvent(cerId, { type: 'introduction-granted', actor: 'founder' }));
    const cer = project(records, cerId);
    expect(introductionForPartner(cer, null).contact).toBeNull();
    expect(introductionForPartner(cer, { name: 'Mel' }).contact).toEqual({ name: 'Mel', email: null });
  });
});
