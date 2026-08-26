// The record deserves a page, not a bubble.
//
// John, 2026-08-26, on the companion panel finally carrying real derived state:
// "I can collapse that — but what we need is a pop out to a new page with all of
// that, not just sitting in the bubble."
//
// He is right, and the panel proves it: the header counted 12 (claims + shortlist
// + proposals) while the body directly beneath said "6 things we've noted so far"
// (claims alone), and the left rail said 0/6 — three different numbers for one
// record, on one screen. The record had outgrown the only surface that held it.
//
// A page needs the WHOLE record in one read: the claims, what they opened up,
// what was kept, and how much of it the founder has actually settled. Until now
// GET /record returned claims and two counts, so a page would have to fan out to
// /proposals and /shortlist and stitch them — three round trips and three chances
// to render a partial record as if it were the whole one.
import { describe, it, expect } from 'vitest';
import { createSession, updateSession, getSession } from '../../src/services/session-store.js';
import { recordHandler } from '../../src/handlers/record.js';
import { buildInferredClaims } from '../../src/services/claims-projection.js';

function replyMock() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    send(payload) { this.payload = payload; return payload; },
  };
}

function seeded(extra = {}) {
  const session = createSession({ website_url: 'https://cognisys.example' });
  const claims = buildInferredClaims({
    recon: { cloud_provider: 'aws' },
    signals: [{ type: 'stage', value: 'Seed', confidence: 'probable' }],
  });
  updateSession(session.id, {
    infer_status: 'complete',
    claim_records: claims,
    claim_events: [],
    company_name: 'Cognisys',
    ...extra,
  });
  return getSession(session.id);
}

async function record(session) {
  const reply = replyMock();
  await recordHandler({ params: { id: session.id } }, reply);
  return reply.payload.record;
}

describe('GET /record — the whole record, in one read', () => {
  it('names the company, so a page opened cold knows whose record it is', async () => {
    expect((await record(seeded())).company_name).toBe('Cognisys');
  });

  it('carries what is open — the pathway, not just the claims', async () => {
    const r = await record(seeded());
    expect(Array.isArray(r.proposals)).toBe(true);
  });

  it('carries what was kept — the shortlist', async () => {
    const r = await record(seeded());
    expect(Array.isArray(r.shortlist)).toBe(true);
  });

  it('says how far along it is, without grading anyone', async () => {
    const r = await record(seeded());
    expect(r.total_count).toBe(r.claims.length);
    expect(r.confirmed_count + r.inferred_count).toBeLessThanOrEqual(r.total_count);
    // No score, no percentage, no mark out of anything (John's no-numbers ruling
    // covers grades — a count of what you have settled is not a grade).
    expect(r.score).toBeUndefined();
  });

  it('still answers for a session that never got past the read', async () => {
    const session = createSession({ website_url: 'https://x.example' });
    const r = await record(getSession(session.id));
    expect(r.claims).toEqual([]);
    expect(r.proposals).toEqual([]);
    expect(r.shortlist).toEqual([]);
    expect(r.total_count).toBe(0);
  });

  it('survives a shortlist or proposal projection that throws, rather than 500ing the page', async () => {
    const session = seeded({ shortlist_records: [{ junk: true }] });
    const r = await record(session);
    expect(r.claims.length).toBeGreaterThan(0);
    expect(Array.isArray(r.shortlist)).toBe(true);
  });

  it('404s an unknown session', async () => {
    const reply = replyMock();
    await recordHandler({ params: { id: 'nope' } }, reply);
    expect(reply.statusCode).toBe(404);
  });
});
