// Receipts for the "Our working" UX (John go 2026-08-23, "CLI level accuracy before
// any fucking web page"): every grounded chat exchange must leave an auditable record
// of what was retrieved, resolvable by the client so [1] chips open citation cards.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/inference.js', () => ({
  chatStream: vi.fn(async function* () { yield 'grounded answer [1]'; }),
}));

import { createSession, updateSession, getSession } from '../../src/services/session-store.js';
import { chatHandler } from '../../src/handlers/chat.js';
import { chatReceiptsHandler } from '../../src/handlers/record.js';
import { retrieveCorpusEvidence } from '../../src/services/corpus-retrieve.js';

const CORPUS_HIT = {
  chunk_id: 'ch-1', object_slug: 'source-001-pitchwise-guide', layer: 'sources',
  evidence_id: 'ev-1', score: 0.71, text: 'Seed rounds in 2026 typically…',
  source_url: 'https://publisher.example/article', fetched_at: '2026-08-21T12:26:00Z',
};

function mockCorpusFetch() {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => [[CORPUS_HIT]] }));
}

function replyMock() {
  const raw = { headers: null, chunks: [], writeHead() {}, write() {}, end() {} };
  return {
    raw, statusCode: 200, payload: null,
    status(c) { this.statusCode = c; return this; },
    send(p) { this.payload = p; return p; },
    type() { return this; },
  };
}

beforeEach(() => vi.clearAllMocks());

describe('retrieveCorpusEvidence — card fields carried through', () => {
  it('hits include source_url and fetched_at from the corpus response', async () => {
    mockCorpusFetch();
    const hits = await retrieveCorpusEvidence('what do seed rounds look like', {});
    expect(hits[0].source_url).toBe('https://publisher.example/article');
    expect(hits[0].fetched_at).toBe('2026-08-21T12:26:00Z');
  });
});

describe('chat receipts — the exchange leaves an auditable trail on the session', () => {
  it('a grounded exchange appends a receipt; the endpoint serves it card-ready', async () => {
    mockCorpusFetch();
    const session = createSession({ website_url: 'https://acme.example' });
    updateSession(session.id, { infer_status: 'complete', company_name: 'Acme' });

    await chatHandler({
      body: {
        persona: 'edison',
        messages: [{ role: 'user', content: 'what do seed rounds look like' }],
        context: { company_name: 'Acme', session_id: session.id },
      },
      log: { error() {} },
    }, replyMock());

    const stored = getSession(session.id).chat_receipts;
    expect(stored).toHaveLength(1);
    expect(stored[0].query).toContain('seed rounds');
    expect(stored[0].hits[0]).toMatchObject({
      n: 1,
      slug: 'source-001-pitchwise-guide',
      layer: 'sources',
      source_url: 'https://publisher.example/article',
      fetched_at: '2026-08-21T12:26:00Z',
    });
    expect(stored[0].hits[0].excerpt).toContain('Seed rounds');

    const reply = replyMock();
    await chatReceiptsHandler({ params: { id: session.id } }, reply);
    expect(reply.payload.receipts).toHaveLength(1);
    expect(reply.payload.receipts[0].hits[0].source_url).toBe('https://publisher.example/article');
  });

  it('an ungrounded exchange (corpus down) leaves an honest empty-hits receipt', async () => {
    global.fetch = vi.fn(async () => { throw new Error('corpus unreachable'); });
    const session = createSession({ website_url: 'https://quiet.example' });
    updateSession(session.id, { infer_status: 'complete', company_name: 'Quiet' });

    await chatHandler({
      body: {
        persona: 'edison',
        messages: [{ role: 'user', content: 'anything' }],
        context: { company_name: 'Quiet', session_id: session.id },
      },
      log: { error() {} },
    }, replyMock());

    const stored = getSession(session.id).chat_receipts;
    expect(stored).toHaveLength(1);
    expect(stored[0].hits).toEqual([]);
  });

  it('receipts endpoint 404s an unknown session; no session_id in context = no receipt, no error', async () => {
    const reply = replyMock();
    await chatReceiptsHandler({ params: { id: 'nope' } }, reply);
    expect(reply.statusCode).toBe(404);

    mockCorpusFetch();
    await chatHandler({
      body: {
        persona: 'edison',
        messages: [{ role: 'user', content: 'hello' }],
        context: { company_name: 'NoSession' },
      },
      log: { error() {} },
    }, replyMock()); // must not throw
  });
});
