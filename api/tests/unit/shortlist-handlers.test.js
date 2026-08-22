import { describe, it, expect } from 'vitest';
import { createSession, updateSession, getSession } from '../../src/services/session-store.js';
import { proposalsHandler, proposalAcceptHandler, shortlistHandler } from '../../src/handlers/shortlist.js';
import { buildClaimRecord, buildClaimEvent } from '../../src/services/claims-projection.js';

function replyMock() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    send(payload) { this.payload = payload; return payload; },
  };
}

// A session where the acceptance walk has happened: AWS confirmed, stage confirmed,
// no institutional raise confirmed, soc2 gap open.
function walkSession() {
  const session = createSession({ website_url: 'https://acme.example' });
  const claims = [
    buildClaimRecord({ field: 'infrastructure.cloud_provider', value: 'aws', provenance: { method: 'recon-ip', detail: 'ASN AS16509 Amazon' } }),
    buildClaimRecord({ field: 'company.stage', value: 'Seed', provenance: { method: 'claude-inference' } }),
    buildClaimRecord({ field: 'company.has_raised_institutional', value: 'false', provenance: { method: 'claude-inference' } }),
  ];
  const events = claims.map((c) => buildClaimEvent(c.claim_id, { type: 'confirmed', actor: 'founder', via: 'chat' }));
  updateSession(session.id, {
    infer_status: 'complete',
    claim_records: claims,
    claim_events: events,
    gaps: [{ id: 'soc2', status: 'open' }],
  });
  return getSession(session.id);
}

describe('GET /api/v1/session/:id/proposals', () => {
  it('surfaces AWS Activate off the confirmed claims, trigger cited', async () => {
    const session = walkSession();
    const reply = replyMock();
    await proposalsHandler({ params: { id: session.id } }, reply);
    expect(reply.statusCode).toBe(200);
    const activate = reply.payload.proposals.find((p) => p.id === 'aws-activate-founders');
    expect(activate).toBeTruthy();
    expect(activate.trigger).toContain('has_raised_institutional = false');
    expect(activate.claims_cited.length).toBeGreaterThan(0);
    expect(activate.reason).toContain('confirmed');
  });

  it('surfaces Vanta off the open soc2 gap', async () => {
    const session = walkSession();
    const reply = replyMock();
    await proposalsHandler({ params: { id: session.id } }, reply);
    const vanta = reply.payload.proposals.find((p) => p.id === 'cap-vanta');
    expect(vanta).toBeTruthy();
    expect(vanta.gaps_cited).toContain('soc2');
  });

  it('proposes nothing when no claims are confirmed (never off a guess)', async () => {
    const session = createSession({ website_url: 'https://quiet.example' });
    updateSession(session.id, {
      infer_status: 'complete',
      claim_records: [buildClaimRecord({ field: 'company.stage', value: 'Seed', provenance: { method: 'claude-inference' } })],
      claim_events: [],
      gaps: [],
    });
    const reply = replyMock();
    await proposalsHandler({ params: { id: session.id } }, reply);
    expect(reply.payload.proposals).toEqual([]);
  });
});

describe('POST /api/v1/session/:id/proposals/:proposalId/accept — the Move', () => {
  it('accept creates a Submitted Move whose reason sits on its face', async () => {
    const session = walkSession();
    const reply = replyMock();
    await proposalAcceptHandler(
      { params: { id: session.id, proposalId: 'aws-activate-founders' }, body: {} }, reply);
    expect(reply.statusCode).toBe(201);
    const move = reply.payload.move;
    expect(move.status).toBe('Submitted');
    expect(move.route).toBe('ingram_micro_aws');
    expect(move.reason.trigger_id).toBe('aws-activate-founders');
    expect(move.reason.claims_cited.length).toBeGreaterThan(0);
    expect(move.reason.text).toContain('confirmed');

    // the shortlist IS the set of open Moves
    const list = replyMock();
    await shortlistHandler({ params: { id: session.id } }, list);
    expect(list.payload.shortlist).toHaveLength(1);
    expect(list.payload.shortlist[0].reason.trigger_id).toBe('aws-activate-founders');
  });

  it('the user can edit the reason — their words retained beside the generated one', async () => {
    const session = walkSession();
    const reply = replyMock();
    await proposalAcceptHandler(
      { params: { id: session.id, proposalId: 'cap-vanta' }, body: { edited_reason: 'we promised SOC 2 to a customer by Q4' } },
      reply);
    expect(reply.payload.move.reason.user_text).toBe('we promised SOC 2 to a customer by Q4');
    expect(reply.payload.move.reason.text).toBeTruthy();
  });

  it('refuses a proposal whose trigger does not currently fire (default-deny)', async () => {
    const session = walkSession();
    const reply = replyMock();
    await proposalAcceptHandler(
      { params: { id: session.id, proposalId: 'cap-blancco' }, body: {} }, reply);
    expect(reply.statusCode).toBe(409);
  });

  it('accepting twice does not duplicate the Move', async () => {
    const session = walkSession();
    await proposalAcceptHandler(
      { params: { id: session.id, proposalId: 'aws-activate-founders' }, body: {} }, replyMock());
    const second = replyMock();
    await proposalAcceptHandler(
      { params: { id: session.id, proposalId: 'aws-activate-founders' }, body: {} }, second);
    expect(second.statusCode).toBe(409);
    const list = replyMock();
    await shortlistHandler({ params: { id: session.id } }, list);
    expect(list.payload.shortlist).toHaveLength(1);
  });
});
