import { describe, it, expect, vi, beforeEach } from 'vitest';

// The Claude parse is mocked — the handler wiring (utterance → claims → Record →
// reflect-back → live session the ceremony can continue) is what's under test.
vi.mock('../../src/services/firehose-intake.js', async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    extractFromUtterance: vi.fn(async () => ({
      product_type: 'B2B SaaS', stage: 'Pre-seed', sector: 'fintech',
      infrastructure: 'AWS', company_summary: 'A pre-seed fintech B2B SaaS on AWS.',
    })),
  };
});

import { firehoseHandler } from '../../src/handlers/firehose.js';
import { getSession } from '../../src/services/session-store.js';
import { claimsProjection } from '../../src/services/claims-projection.js';
import { extractFromUtterance } from '../../src/services/firehose-intake.js';

function replyMock() {
  return {
    statusCode: 200, payload: null,
    status(c) { this.statusCode = c; return this; },
    send(p) { this.payload = p; return p; },
  };
}

beforeEach(() => vi.clearAllMocks());

describe('POST /api/v1/firehose — talk, get reflected back', () => {
  it('turns an utterance into a live session Record and reflects it back', async () => {
    const reply = replyMock();
    await firehoseHandler({
      body: { utterance: "it's like Vanta but for fintech, we're pre-seed, thinking AWS" },
    }, reply);

    expect(reply.statusCode).toBe(201);
    expect(reply.payload.session_id).toBeTruthy();
    expect(reply.payload.reflect_back).toMatch(/here's what i caught/i);
    expect(reply.payload.reflect_back).toMatch(/pre-seed/i);

    // the Record is real and on the truth ladder — inferred, founder-utterance provenance
    const session = getSession(reply.payload.session_id);
    const claims = claimsProjection({
      record_claims: session.claim_records, claim_events: session.claim_events,
    });
    expect(claims.length).toBeGreaterThanOrEqual(3);
    expect(claims.every((c) => c.status === 'inferred')).toBe(true);
    expect(claims.find((c) => c.field === 'company.stage').provenance.method).toBe('founder-utterance');
    // session is inference-complete so the chat/confirm ceremony can pick it up
    expect(session.infer_status).toBe('complete');
    expect(session.source).toBe('firehose');
  });

  it('rejects an empty utterance', async () => {
    const reply = replyMock();
    await firehoseHandler({ body: { utterance: '   ' } }, reply);
    expect(reply.statusCode).toBe(400);
    expect(extractFromUtterance).not.toHaveBeenCalled();
  });

  it('an unparseable idea still opens a session, honestly empty, inviting more', async () => {
    extractFromUtterance.mockResolvedValueOnce({});
    const reply = replyMock();
    await firehoseHandler({ body: { utterance: 'hello there' } }, reply);
    expect(reply.statusCode).toBe(201);
    expect(reply.payload.reflect_back).toMatch(/didn'?t (quite )?catch|tell me more/i);
    expect(getSession(reply.payload.session_id).claim_records).toEqual([]);
  });

  it('survives a parse failure without 500 — degrades to an empty invite', async () => {
    extractFromUtterance.mockRejectedValueOnce(new Error('bedrock down'));
    const reply = replyMock();
    await firehoseHandler({ body: { utterance: 'a real idea' } }, reply);
    expect(reply.statusCode).toBe(201);
    expect(reply.payload.reflect_back).toMatch(/tell me more|didn'?t (quite )?catch/i);
  });
});
