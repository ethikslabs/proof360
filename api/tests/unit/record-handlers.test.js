import { describe, it, expect, beforeEach } from 'vitest';
import { createSession, updateSession, getSession } from '../../src/services/session-store.js';
import { recordHandler, claimAnswerHandler } from '../../src/handlers/record.js';
import { buildInferredClaims } from '../../src/services/claims-projection.js';

function replyMock() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    send(payload) { this.payload = payload; return payload; },
  };
}

function seededSession() {
  const session = createSession({ website_url: 'https://acme.example' });
  const claims = buildInferredClaims({
    recon: { cloud_provider: 'aws' },
    signals: [{ type: 'stage', value: 'Seed', confidence: 'probable' }],
  });
  updateSession(session.id, { infer_status: 'complete', claim_records: claims, claim_events: [] });
  return getSession(session.id);
}

describe('GET /api/v1/session/:id/record', () => {
  it('projects the session claims with truth-ladder status', async () => {
    const session = seededSession();
    const reply = replyMock();
    await recordHandler({ params: { id: session.id } }, reply);
    expect(reply.statusCode).toBe(200);
    expect(reply.payload.record.claims).toHaveLength(2);
    const infra = reply.payload.record.claims.find((c) => c.field === 'infrastructure.cloud_provider');
    expect(infra.status).toBe('inferred');
    expect(infra.provenance.method).toBe('recon-ip');
    expect(reply.payload.record.confirmed_count).toBe(0);
  });

  it('404s an unknown session', async () => {
    const reply = replyMock();
    await recordHandler({ params: { id: 'nope' } }, reply);
    expect(reply.statusCode).toBe(404);
  });
});

describe('POST /api/v1/session/:id/claims/:claimId/answer', () => {
  it('a confirm answer appends a claim_event and flips the projection', async () => {
    const session = seededSession();
    const claimId = session.claim_records[0].claim_id;
    const reply = replyMock();
    await claimAnswerHandler(
      { params: { id: session.id, claimId }, body: { action: 'confirm' } }, reply);
    expect(reply.statusCode).toBe(200);
    const claim = reply.payload.claim;
    expect(claim.status).toBe('confirmed');
    expect(claim.confirmed.by).toBe('founder');
    // append-only: the base record is untouched, the event landed beside it
    expect(getSession(session.id).claim_records[0].status).toBe('inferred');
    expect(getSession(session.id).claim_events).toHaveLength(1);
  });

  it('a correct answer requires a value and retains the inferred original', async () => {
    const session = seededSession();
    const claimId = session.claim_records[0].claim_id;

    const missing = replyMock();
    await claimAnswerHandler(
      { params: { id: session.id, claimId }, body: { action: 'correct' } }, missing);
    expect(missing.statusCode).toBe(400);

    const reply = replyMock();
    await claimAnswerHandler(
      { params: { id: session.id, claimId }, body: { action: 'correct', value: 'gcp' } }, reply);
    expect(reply.payload.claim.status).toBe('corrected');
    expect(reply.payload.claim.value).toBe('gcp');
    expect(reply.payload.claim.inferred_value).toBe('aws');
  });

  it('refuses unknown actions and unknown claims (default-deny)', async () => {
    const session = seededSession();
    const claimId = session.claim_records[0].claim_id;

    const bad = replyMock();
    await claimAnswerHandler(
      { params: { id: session.id, claimId }, body: { action: 'overwrite' } }, bad);
    expect(bad.statusCode).toBe(400);

    const ghost = replyMock();
    await claimAnswerHandler(
      { params: { id: session.id, claimId: 'clm-ghost' }, body: { action: 'confirm' } }, ghost);
    expect(ghost.statusCode).toBe(404);
  });
});
