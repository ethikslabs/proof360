import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let root;
let cer;

function replyMock() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(payload) {
      this.payload = payload;
      return payload;
    },
  };
}

const AUTH = { authUser: { sub: 'auth0|founder', email: 'founder@example.com' } };

async function loadModules() {
  vi.resetModules();
  process.env.MEMORY_STORE_DIR = root;
  cer = await import('../../src/handlers/cer.js');
}

async function createCer(route, extra = {}) {
  const reply = replyMock();
  await cer.cerCreateHandler({ ...AUTH, body: { route, person_id: 'p', company_id: 'c', ...extra } }, reply);
  return reply;
}

describe('CER route handlers', () => {
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'proof360-cer-handlers-'));
    await loadModules();
  });

  afterEach(async () => {
    delete process.env.MEMORY_STORE_DIR;
    await rm(root, { recursive: true, force: true });
  });

  it('creates a CER and lists it back for the founder', async () => {
    const created = await createCer('ingram_micro_aws', { evidence_refs: ['claim-1'] });
    expect(created.statusCode).toBe(201);
    expect(created.payload.cer).toMatchObject({
      route: 'ingram_micro_aws',
      pathway_type: 'cloud_program',
      status: 'Submitted',
      consent_state: 'granted',
    });

    const list = replyMock();
    await cer.cersListHandler(AUTH, list);
    expect(list.payload.cers).toHaveLength(1);
    expect(list.payload.cers[0].cer_id).toBe(created.payload.cer.cer_id);
  });

  it('rejects an unknown route with 400', async () => {
    const reply = await createCer('made_up_route');
    expect(reply.statusCode).toBe(400);
    expect(reply.payload.error).toMatch(/route/);
  });

  it('advances status through a legal transition and rejects an illegal one with 409', async () => {
    const { payload } = await createCer('vanta');
    const cerId = payload.cer.cer_id;

    const ok = replyMock();
    await cer.cerStatusHandler({ ...AUTH, params: { cerId }, body: { status: 'Under review' } }, ok);
    expect(ok.statusCode).toBe(200);
    expect(ok.payload.cer.status).toBe('Under review');

    const bad = replyMock();
    await cer.cerStatusHandler({ ...AUTH, params: { cerId }, body: { status: 'Booked' } }, bad);
    // Under review -> Booked is legal; do an illegal one instead: Submitted-only path
    expect(bad.statusCode).toBe(200); // Under review -> Booked is allowed

    const illegal = replyMock();
    await cer.cerStatusHandler({ ...AUTH, params: { cerId }, body: { status: 'Needs info' } }, illegal);
    // Booked -> Needs info is illegal
    expect(illegal.statusCode).toBe(409);
    expect(illegal.payload.error).toMatch(/illegal_cer_transition/);
  });

  it('withdraws consent (append-only) and the projection flips to Closed / no sharing', async () => {
    const { payload } = await createCer('vanta');
    const cerId = payload.cer.cer_id;

    const reply = replyMock();
    await cer.cerConsentWithdrawHandler({ ...AUTH, params: { cerId }, body: { reason: 'user_requested' } }, reply);
    expect(reply.statusCode).toBe(200);
    expect(reply.payload.cer.consent_state).toBe('withdrawn');
    expect(reply.payload.cer.status).toBe('Closed');
    expect(reply.payload.cer.partner_sharing).toBe(false);
    // original consent-granted preserved
    expect(reply.payload.cer.events.filter((e) => e.type === 'consent-granted')).toHaveLength(1);
  });

  it('404s on consent-withdraw / status for an unknown CER id', async () => {
    const w = replyMock();
    await cer.cerConsentWithdrawHandler({ ...AUTH, params: { cerId: 'nope' }, body: {} }, w);
    expect(w.statusCode).toBe(404);

    const s = replyMock();
    await cer.cerStatusHandler({ ...AUTH, params: { cerId: 'nope' }, body: { status: 'Closed' } }, s);
    expect(s.statusCode).toBe(404);
  });

  it("one founder's CERs never appear in another founder's list (tenant isolation)", async () => {
    await createCer('ingram_micro_aws');

    const otherList = replyMock();
    await cer.cersListHandler({ authUser: { sub: 'auth0|other', email: 'other@example.com' } }, otherList);
    expect(otherList.payload.cers).toHaveLength(0);
  });
});
