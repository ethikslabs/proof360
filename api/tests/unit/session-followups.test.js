// Live persona follow-up questions (docs/plans/2026-08-25-persona-chips-and-proposal-cards.md
// Task 1): three record-grounded questions, one per persona (sofia/edison/leonardo),
// generated fresh from THIS session's claims/gaps/last exchange. Honest degradation —
// inference failure or unparseable model output never 500s and never falls back to
// canned text; it returns an empty list. Cached per chat turn so repeated GETs for the
// same turn don't re-bill Bedrock.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/inference.js', () => ({
  chatComplete: vi.fn(),
}));

import { chatComplete } from '../../src/lib/inference.js';
import { createSession, updateSession, getSession } from '../../src/services/session-store.js';
import { buildInferredClaims } from '../../src/services/claims-projection.js';
import { sessionFollowupsHandler } from '../../src/handlers/session-followups.js';

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
  updateSession(session.id, {
    infer_status: 'complete',
    company_name: 'Acme',
    claim_records: claims,
    claim_events: [],
    gaps: [{ id: 'soc2_report', severity: 'high', status: 'open' }],
    chat_history: [
      { role: 'user', content: 'what should I fix first?', ts: Date.now() - 1000 },
      { role: 'assistant', content: 'Your SOC 2 status is the biggest open gap.', ts: Date.now() },
    ],
  });
  return getSession(session.id);
}

const VALID_MODEL_JSON = JSON.stringify({
  followups: [
    { persona: 'sofia', question: 'How does the Seed stage shape the story you tell investors?' },
    { persona: 'edison', question: 'What would it take to close the SOC 2 report gap this month?' },
    { persona: 'leonardo', question: 'Does your AWS footprint change how you position for a raise?' },
  ],
});

function mockInferenceOnce(text) {
  chatComplete.mockResolvedValueOnce({ choices: [{ message: { content: text } }] });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/session/:id/followups', () => {
  it('valid model JSON → 3 validated followups, one per persona', async () => {
    mockInferenceOnce(VALID_MODEL_JSON);
    const session = seededSession();
    const reply = replyMock();
    await sessionFollowupsHandler({ params: { id: session.id } }, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.followups).toHaveLength(3);
    const personas = reply.payload.followups.map((f) => f.persona).sort();
    expect(personas).toEqual(['edison', 'leonardo', 'sofia']);
    for (const f of reply.payload.followups) {
      expect(typeof f.question).toBe('string');
      expect(f.question.length).toBeGreaterThan(0);
      expect(f.question.length).toBeLessThanOrEqual(120);
    }
  });

  it('malformed model output → honest empty, never 500', async () => {
    mockInferenceOnce('not json at all, sorry');
    const session = seededSession();
    const reply = replyMock();
    await sessionFollowupsHandler({ params: { id: session.id } }, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.followups).toEqual([]);
  });

  it('inference throwing → honest empty, never 500', async () => {
    chatComplete.mockRejectedValueOnce(new Error('bedrock unreachable'));
    const session = seededSession();
    const reply = replyMock();
    await sessionFollowupsHandler({ params: { id: session.id } }, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.followups).toEqual([]);
  });

  it('missing/invalid persona ids or empty questions → honest empty', async () => {
    mockInferenceOnce(JSON.stringify({
      followups: [
        { persona: 'sofia', question: 'ok question here' },
        { persona: 'not-a-persona', question: 'bad id' },
        { persona: 'leonardo', question: '' },
      ],
    }));
    const session = seededSession();
    const reply = replyMock();
    await sessionFollowupsHandler({ params: { id: session.id } }, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.followups).toEqual([]);
  });

  it('404s an unknown session', async () => {
    const reply = replyMock();
    await sessionFollowupsHandler({ params: { id: 'nope' } }, reply);
    expect(reply.statusCode).toBe(404);
    expect(chatComplete).not.toHaveBeenCalled();
  });

  it('second GET for the same turn is served from cache — inference called once', async () => {
    mockInferenceOnce(VALID_MODEL_JSON);
    const session = seededSession();

    const reply1 = replyMock();
    await sessionFollowupsHandler({ params: { id: session.id } }, reply1);
    expect(reply1.payload.followups).toHaveLength(3);

    const reply2 = replyMock();
    await sessionFollowupsHandler({ params: { id: session.id } }, reply2);
    expect(reply2.payload.followups).toHaveLength(3);
    expect(reply2.payload.followups).toEqual(reply1.payload.followups);

    expect(chatComplete).toHaveBeenCalledTimes(1);
  });

  it('a new chat turn busts the cache — inference called again', async () => {
    mockInferenceOnce(VALID_MODEL_JSON);
    const session = seededSession();
    await sessionFollowupsHandler({ params: { id: session.id } }, replyMock());
    expect(chatComplete).toHaveBeenCalledTimes(1);

    updateSession(session.id, {
      chat_history: [
        ...getSession(session.id).chat_history,
        { role: 'user', content: 'and what about the deck?', ts: Date.now() },
      ],
    });

    mockInferenceOnce(VALID_MODEL_JSON);
    await sessionFollowupsHandler({ params: { id: session.id } }, replyMock());
    expect(chatComplete).toHaveBeenCalledTimes(2);
  });
});
