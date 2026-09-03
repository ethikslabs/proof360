// The introduction end to end through the two doors: the partner window asks
// (POST /api/v1/partner/:partner/cers/:cerId/introduction) and the founder decides
// (POST /api/v1/profile/current/cers/:cerId/introduction). Both append to the same log;
// the partner sees the contact only while the founder's grant stands.
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let root, cer, partnerCers;

function replyMock() {
  return {
    statusCode: 200, payload: null,
    status(code) { this.statusCode = code; return this; },
    send(payload) { this.payload = payload; return payload; },
  };
}
const DEMO_AUTH = { authUser: { sub: 'demo-founder', email: 'demo@hiveandco.au', name: 'Mel' } };

async function loadModules() {
  vi.resetModules();
  process.env.MEMORY_STORE_DIR = root;
  process.env.DEMO_FOUNDER_MODE = 'true';
  cer = await import('../../src/handlers/cer.js');
  partnerCers = await import('../../src/handlers/partner-cers.js');
}
async function createCer(route) {
  const reply = replyMock();
  await cer.cerCreateHandler({ ...DEMO_AUTH, body: { route, person_id: 'per-1', company_id: 'co-1' } }, reply);
  return reply.payload.cer.cer_id;
}
async function partnerAct(partner, cerId, action) {
  const reply = replyMock();
  await partnerCers.partnerIntroductionHandler({ params: { partner, cerId }, body: { action } }, reply);
  return reply;
}
async function founderAct(cerId, action) {
  const reply = replyMock();
  await cer.cerIntroductionHandler({ ...DEMO_AUTH, params: { cerId }, body: { action } }, reply);
  return reply;
}
async function partnerDetail(partner, cerId) {
  const reply = replyMock();
  await partnerCers.partnerCerDetailHandler({ params: { partner, cerId } }, reply);
  return reply;
}

describe('introduction handlers', () => {
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'proof360-cer-intro-')); await loadModules(); });
  afterEach(async () => { delete process.env.MEMORY_STORE_DIR; delete process.env.DEMO_FOUNDER_MODE; await rm(root, { recursive: true, force: true }); });

  it('ask → grant → contact visible → founder withdraws → contact gone', async () => {
    const cerId = await createCer('ingram_micro_aws');
    const asked = await partnerAct('ingram_micro', cerId, 'request');
    expect(asked.statusCode).toBe(200);
    expect(asked.payload.introduction.state).toBe('asked');
    expect(asked.payload.introduction.contact).toBeNull();

    let detail = await partnerDetail('ingram_micro', cerId);
    expect(detail.payload.record.introduction.state).toBe('asked');
    expect(detail.payload.record.introduction.contact).toBeNull();

    const granted = await founderAct(cerId, 'grant');
    expect(granted.statusCode).toBe(200);
    expect(granted.payload.cer.introduction.state).toBe('granted');

    detail = await partnerDetail('ingram_micro', cerId);
    expect(detail.payload.record.introduction.contact).toEqual({ name: 'Mel', email: 'demo@hiveandco.au' });
    expect(JSON.stringify(detail.payload)).not.toContain('per-1');

    const withdrawn = await founderAct(cerId, 'withdraw');
    expect(withdrawn.payload.cer.introduction.state).toBe('withdrawn');
    detail = await partnerDetail('ingram_micro', cerId);
    expect(detail.payload.record.introduction.contact).toBeNull();
  });

  it('a partner the CER is not routed to cannot ask, and cannot learn the record exists', async () => {
    const cerId = await createCer('ingram_micro_aws');
    const reply = await partnerAct('vanta', cerId, 'request');
    expect(reply.statusCode).toBe(404);
  });

  it('the founder cannot grant an ask that was never made; a second ask while one is open is refused', async () => {
    const cerId = await createCer('ingram_micro_aws');
    expect((await founderAct(cerId, 'grant')).statusCode).toBe(409);
    expect((await partnerAct('ingram_micro', cerId, 'request')).statusCode).toBe(200);
    expect((await partnerAct('ingram_micro', cerId, 'request')).statusCode).toBe(409);
  });

  it('decline is the founder\'s answer, visible to the partner, with no contact', async () => {
    const cerId = await createCer('ingram_micro_aws');
    await partnerAct('ingram_micro', cerId, 'request');
    expect((await founderAct(cerId, 'decline')).payload.cer.introduction.state).toBe('declined');
    const detail = await partnerDetail('ingram_micro', cerId);
    expect(detail.payload.record.introduction).toMatchObject({ state: 'declined', contact: null });
  });

  it('the partner can withdraw its own ask; unknown actions are 400; demo mode off is 404', async () => {
    const cerId = await createCer('ingram_micro_aws');
    await partnerAct('ingram_micro', cerId, 'request');
    expect((await partnerAct('ingram_micro', cerId, 'withdraw')).payload.introduction.state).toBe('withdrawn');
    expect((await partnerAct('ingram_micro', cerId, 'reveal')).statusCode).toBe(400);
    expect((await founderAct(cerId, 'reveal')).statusCode).toBe(400);
    delete process.env.DEMO_FOUNDER_MODE;
    expect((await partnerAct('ingram_micro', cerId, 'request')).statusCode).toBe(404);
  });
});
