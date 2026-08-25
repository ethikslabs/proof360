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

import { chatComplete } from '../../src/lib/inference.js';
import { createSession, updateSession, getSession } from '../../src/services/session-store.js';
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

  // I-2 (billing regression guard): the comment on analyzeHandler's cached branch
  // claims re-analyzing a session never re-bills Bedrock (or the corpus lookup) — the
  // fresh path is the only one that calls generateReading()/chatComplete(). Assert it,
  // don't just trust the comment: call analyze twice on the same session and confirm
  // the second (cached) call adds zero chatComplete invocations.
  it('a second analyze call on an already-analyzed session never re-bills chatComplete (no-re-bill guarantee)', async () => {
    const session = seededSession();
    const before = chatComplete.mock.calls.length;

    const reply1 = replyMock();
    await analyzeHandler({ params: { id: session.id } }, reply1);
    const afterFresh = chatComplete.mock.calls.length;
    expect(afterFresh).toBe(before + 1); // fresh path: generateReading() calls chatComplete once

    const reply2 = replyMock();
    await analyzeHandler({ params: { id: session.id } }, reply2);
    const afterCached = chatComplete.mock.calls.length;
    expect(afterCached).toBe(afterFresh); // cached path: zero additional chatComplete calls
  });

  // R-3 (synthetic page pollutes pages_read_count): a session where recon-company.js's
  // web research contributed (used_web_research true) but the site itself returned zero
  // real pages must still report pages_read_count 0 — the synthetic research "page"
  // must never be counted as a site page read, and the frontend's degraded-read framing
  // (coldReadOpener) keys off exactly this field being honestly 0.
  it('a research-page-only session (engines ran, no real site pages) reports pages_read_count 0 — degraded framing preserved', async () => {
    const session = seededSession({
      sources_read: ['company research · web'],
      pages_read_count: 0,
      used_web_research: true,
    });
    const reply = replyMock();
    await analyzeHandler({ params: { id: session.id } }, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.pages_read_count).toBe(0);
  });
});

describe('corpus_citations (PROOF360-CORPUS-CITATION-CARDS-001)', () => {
  const HIT = {
    n: 1, slug: 'disc-soc2auditors-org', layer: 'vendor/cognisys',
    evidence_id: 'ev-1', score: 0.86,
    text: 'Cognisys maintains SOC 2 Type II attestation…',
    source_url: 'https://soc2auditors.org/security-firms/cognisys/',
    fetched_at: '2026-08-20T23:23:14.582Z',
  };

  it('fresh path: non-empty corpus_hits → corpus_citations with receipt-shaped hits (text renamed excerpt)', async () => {
    const session = seededSession({ corpus_hits: [HIT] });
    const reply = replyMock();
    await analyzeHandler({ params: { id: session.id } }, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.corpus_citations).toBeTruthy();
    expect(reply.payload.corpus_citations.hits[0]).toMatchObject({
      n: 1, slug: HIT.slug, layer: HIT.layer, evidence_id: 'ev-1', score: 0.86,
      excerpt: HIT.text, source_url: HIT.source_url, fetched_at: HIT.fetched_at,
    });
    expect(typeof reply.payload.corpus_citations.query).toBe('string');
    expect(reply.payload.corpus_citations.query.length).toBeGreaterThan(0);

    expect(getSession(session.id).corpus_citations).toEqual(reply.payload.corpus_citations);
  });

  it('fresh path: corpus_hits [] (looked, nothing scored) → corpus_citations null', async () => {
    const session = seededSession({ corpus_hits: [] });
    const reply = replyMock();
    await analyzeHandler({ params: { id: session.id } }, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.corpus_citations).toBeNull();
  });

  it('fresh path: corpus_hits null (could not look) → corpus_citations null', async () => {
    const session = seededSession({ corpus_hits: null });
    const reply = replyMock();
    await analyzeHandler({ params: { id: session.id } }, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.corpus_citations).toBeNull();
  });

  it('fresh path: corpus_hits absent (pre-cache session) → corpus_citations null', async () => {
    const session = seededSession();
    const reply = replyMock();
    await analyzeHandler({ params: { id: session.id } }, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.corpus_citations).toBeNull();
  });

  it('cached path: serves stored corpus_citations without recomputation', async () => {
    const storedCitations = {
      query: 'Acme',
      hits: [{ n: 1, slug: HIT.slug, layer: HIT.layer, evidence_id: HIT.evidence_id, score: HIT.score, excerpt: HIT.text, source_url: HIT.source_url, fetched_at: HIT.fetched_at }],
    };
    const session = seededSession({ trust_score: 72, gaps: [], deal_readiness: 'partial', corpus_citations: storedCitations });
    const reply = replyMock();
    await analyzeHandler({ params: { id: session.id } }, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.corpus_citations).toEqual(storedCitations);
  });

  it('cached path: legacy cached session without corpus_citations → null, not undefined', async () => {
    const session = seededSession({ trust_score: 72, gaps: [], deal_readiness: 'partial' });
    const reply = replyMock();
    await analyzeHandler({ params: { id: session.id } }, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.corpus_citations).toBeNull();
    expect(reply.payload).toHaveProperty('corpus_citations');
  });
});
