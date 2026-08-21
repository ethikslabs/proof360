import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let root;
let cer;
let partnerCers;

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

// The demo founder is the ONLY profile the partner window can ever serve.
const DEMO_AUTH = { authUser: { sub: 'demo-founder' } };

async function loadModules() {
  vi.resetModules();
  process.env.MEMORY_STORE_DIR = root;
  cer = await import('../../src/handlers/cer.js');
  partnerCers = await import('../../src/handlers/partner-cers.js');
}

async function createCer(route, extra = {}) {
  const reply = replyMock();
  await cer.cerCreateHandler({ ...DEMO_AUTH, body: { route, ...extra } }, reply);
  return reply;
}

async function partnerList(partner) {
  const reply = replyMock();
  await partnerCers.partnerCersListHandler({ params: { partner } }, reply);
  return reply;
}

async function partnerDetail(partner, cerId) {
  const reply = replyMock();
  await partnerCers.partnerCerDetailHandler({ params: { partner, cerId } }, reply);
  return reply;
}

describe('partner CER window (demo-grade)', () => {
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'proof360-partner-cers-'));
    await loadModules();
    process.env.DEMO_FOUNDER_MODE = 'true';
    // Hermetic: never fall through to the real snapshot in the developer's home dir.
    process.env.PORTFOLIO_SNAPSHOT_PATH = join(root, 'absent-snapshot.json');
  });

  afterEach(async () => {
    delete process.env.MEMORY_STORE_DIR;
    delete process.env.DEMO_FOUNDER_MODE;
    delete process.env.PORTFOLIO_SNAPSHOT_PATH;
    await rm(root, { recursive: true, force: true });
  });

  it('fails closed when DEMO_FOUNDER_MODE is absent', async () => {
    delete process.env.DEMO_FOUNDER_MODE;
    const reply = await partnerList('ingram_micro');
    expect(reply.statusCode).toBe(404);
  });

  it('fails closed when DEMO_FOUNDER_MODE is any value other than the string true', async () => {
    process.env.DEMO_FOUNDER_MODE = '1';
    const reply = await partnerList('ingram_micro');
    expect(reply.statusCode).toBe(404);
  });

  it('404s an unknown partner id with the SAME error as demo-mode-off (no enumeration signal)', async () => {
    const unknown = await partnerList('acme_partner');
    expect(unknown.statusCode).toBe(404);
    expect(unknown.payload.error).toBe('not_found');

    delete process.env.DEMO_FOUNDER_MODE;
    const gated = await partnerList('ingram_micro');
    expect(gated.payload).toEqual(unknown.payload);
  });

  it('serves only CERs routed to the requesting partner (no-leak across partners)', async () => {
    await createCer('ingram_micro_aws', { evidence_refs: ['aws-pc-sandbox:O123'], company_id: 'hiveandco' });
    await createCer('vanta');

    const ingram = await partnerList('ingram_micro');
    expect(ingram.statusCode).toBe(200);
    expect(ingram.payload.engagements).toHaveLength(1);
    expect(ingram.payload.engagements[0]).toMatchObject({
      route: 'ingram_micro_aws',
      consent_state: 'granted',
    });

    const vanta = await partnerList('vanta');
    expect(vanta.payload.engagements).toHaveLength(1);
    expect(vanta.payload.engagements[0].route).toBe('vanta');
  });

  it('drops a CER from the partner view the moment consent is withdrawn', async () => {
    const created = await createCer('ingram_micro_aws');
    const cerId = created.payload.cer.cer_id;

    const before = await partnerList('ingram_micro');
    expect(before.payload.engagements).toHaveLength(1);

    const withdraw = replyMock();
    await cer.cerConsentWithdrawHandler(
      { ...DEMO_AUTH, params: { cerId }, body: {} },
      withdraw
    );

    const after = await partnerList('ingram_micro');
    expect(after.payload.engagements).toHaveLength(0);
  });

  it('degrades honestly when no portfolio snapshot exists (records render, book is empty)', async () => {
    process.env.PORTFOLIO_SNAPSHOT_PATH = join(root, 'no-such-snapshot.json');
    await createCer('ingram_micro_aws', { evidence_refs: ['aws-pc-sandbox:O999'] });
    const reply = await partnerList('ingram_micro');
    expect(reply.statusCode).toBe(200);
    expect(reply.payload.engagements).toHaveLength(1);
    expect(reply.payload.engagements[0].opportunity).toBeNull();
    expect(reply.payload.book).toMatchObject({ total: 0, consented: 0, unbitten: 0 });
    delete process.env.PORTFOLIO_SNAPSHOT_PATH;
  });

  describe('with a portfolio snapshot', () => {
    beforeEach(async () => {
      const snap = {
        catalog: 'Sandbox',
        captured_at: '2026-08-04T04:00:00.000Z',
        opportunities: [
          { id: 'O-CONSENTED', company_name: 'Hive & Co', stage: 'Prospect', review_status: 'Submitted', amount: 4500, currency: 'USD', frequency: 'Monthly' },
          { id: 'O-UNBITTEN-1', company_name: 'Someone Else', stage: 'Prospect', review_status: 'Approved', amount: 1000, currency: 'USD', frequency: 'Monthly' },
          { id: 'O-UNBITTEN-2', company_name: 'Another Co', stage: 'Prospect', review_status: 'Approved', amount: 2500, currency: 'USD', frequency: 'Monthly' },
        ],
        companies: { hiveandco: { name: 'Hive & Co', industry: 'Consumer Goods', country: 'Australia', domain: 'hiveandco.au' } },
      };
      const p = join(root, 'snapshot.json');
      await writeFile(p, JSON.stringify(snap));
      process.env.PORTFOLIO_SNAPSHOT_PATH = p;
    });

    afterEach(() => { delete process.env.PORTFOLIO_SNAPSHOT_PATH; });

    it('joins the opportunity and the customer onto a consented engagement', async () => {
      await createCer('ingram_micro_aws', {
        evidence_refs: ['aws-pc-sandbox:O-CONSENTED'],
        company_id: 'hiveandco',
        recommendation_id: 'aws_program_eligibility',
      });
      const reply = await partnerList('ingram_micro');
      const e = reply.payload.engagements[0];
      expect(e.customer).toMatchObject({ name: 'Hive & Co', country: 'Australia' });
      expect(e.opportunity).toMatchObject({ id: 'O-CONSENTED', amount: 4500, review_status: 'Submitted' });
      expect(e.gap).toBe('aws_program_eligibility');
    });

    it('renders un-bitten book entries as aggregate only — never named', async () => {
      await createCer('ingram_micro_aws', { evidence_refs: ['aws-pc-sandbox:O-CONSENTED'], company_id: 'hiveandco' });
      const reply = await partnerList('ingram_micro');
      expect(reply.payload.book).toMatchObject({
        total: 3, consented: 1, unbitten: 2, unbitten_monthly_value: 3500,
      });
      const body = JSON.stringify(reply.payload);
      expect(body).not.toContain('Someone Else');
      expect(body).not.toContain('Another Co');
      expect(body).not.toContain('O-UNBITTEN-1');
    });

    it('serves one record with its event trail and partner-scoped siblings', async () => {
      const aws = await createCer('ingram_micro_aws', { evidence_refs: ['aws-pc-sandbox:O-CONSENTED'], company_id: 'hiveandco' });
      await createCer('ingram_micro_cisco', { company_id: 'hiveandco', recommendation_id: 'mfa' });
      await createCer('vanta', { company_id: 'hiveandco' });

      const reply = await partnerDetail('ingram_micro', aws.payload.cer.cer_id);
      expect(reply.statusCode).toBe(200);
      expect(reply.payload.record.customer.name).toBe('Hive & Co');
      expect(reply.payload.record.events.length).toBeGreaterThan(0);
      // Siblings are the same customer's OTHER routes visible to THIS partner — never Vanta's.
      expect(reply.payload.siblings).toHaveLength(1);
      expect(reply.payload.siblings[0].route).toBe('ingram_micro_cisco');
    });

    it('404s a record belonging to another partner, identically to a nonexistent id', async () => {
      const vanta = await createCer('vanta', { company_id: 'hiveandco' });
      const crossPartner = await partnerDetail('ingram_micro', vanta.payload.cer.cer_id);
      const nonexistent = await partnerDetail('ingram_micro', 'no-such-cer-id');
      expect(crossPartner.statusCode).toBe(404);
      expect(crossPartner.payload).toEqual(nonexistent.payload);
    });

    it('does not show an AWS book to a partner with no AWS route', async () => {
      await createCer('vanta');
      const reply = await partnerList('vanta');
      expect(reply.payload.book).toMatchObject({ unbitten: 0, unbitten_monthly_value: 0 });
    });
  });
});
