// POST /api/v1/session/:id/analyze — read-quality pass-through (John walk feedback
// 2026-08-25, item 1). The frontend cold-read opener needs to distinguish a full
// scrape from a degraded one (site wouldn't open, fallback signals only). analyze.js
// must expose `sources_read` and `pages_read_count` from the session record on both
// the fresh-analysis path and the cached-result path — anything less and the client
// can't tell honest from guessed.
import { describe, it, expect, vi } from 'vitest';

// analyzeHandler now calls generateReading() (cold-reading.js) on the fresh-analysis
// path, which otherwise means a real Bedrock call + real corpus HTTP call per test.
// Mock both so this suite stays hermetic and fast — read-quality pass-through is what
// it's actually testing, not "the reading" itself (that's cold-reading.test.js).
vi.mock('../../src/lib/inference.js', () => ({
  chatComplete: vi.fn().mockResolvedValue({ choices: [{ message: { content: '' } }] }),
}));
vi.mock('../../src/services/corpus-retrieve.js', () => ({
  retrieveCorpusEvidence: vi.fn().mockResolvedValue(null),
}));

import { createSession, updateSession } from '../../src/services/session-store.js';
import { analyzeHandler } from '../../src/handlers/analyze.js';

function replyMock() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    send(payload) { this.payload = payload; return payload; },
  };
}

function seededSession(overrides = {}) {
  const session = createSession({ website_url: 'https://acme.example' });
  updateSession(session.id, {
    infer_status: 'complete',
    company_name: 'Acme',
    inferences: [],
    correctable_fields: [],
    raw_signals: [],
    sources_read: ['homepage', 'pricing page'],
    pages_read_count: 2,
    ...overrides,
  });
  return session;
}

describe('analyzeHandler read-quality pass-through', () => {
  it('a fresh analysis carries sources_read and pages_read_count from the session', async () => {
    const session = seededSession();
    const reply = replyMock();
    await analyzeHandler({ params: { id: session.id } }, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.sources_read).toEqual(['homepage', 'pricing page']);
    expect(reply.payload.pages_read_count).toBe(2);
  });

  it('a degraded read (no pages fetched) reports pages_read_count 0, not lost', async () => {
    const session = seededSession({ sources_read: ['homepage'], pages_read_count: 0 });
    const reply = replyMock();
    await analyzeHandler({ params: { id: session.id } }, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.pages_read_count).toBe(0);
  });

  it('the cached-result path (trust_score already set) also carries read-quality fields', async () => {
    const session = seededSession({ trust_score: 72, gaps: [], deal_readiness: 'partial' });
    const reply = replyMock();
    await analyzeHandler({ params: { id: session.id } }, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.trust_score).toBe(72);
    expect(reply.payload.sources_read).toEqual(['homepage', 'pricing page']);
    expect(reply.payload.pages_read_count).toBe(2);
  });

  it('missing pages_read_count on an old session record defaults honestly to 0', async () => {
    const session = seededSession({ pages_read_count: undefined });
    const reply = replyMock();
    await analyzeHandler({ params: { id: session.id } }, reply);

    expect(reply.payload.pages_read_count).toBe(0);
  });
});
