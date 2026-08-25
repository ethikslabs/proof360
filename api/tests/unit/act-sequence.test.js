// The narrated-act SSE sequence (commit f4af95f) is a cross-task contract with
// the frontend: {type:'act', act, phase:'start'|'done'|'skip'|'fail', title?, note?} /
// {type:'act_body', act, text, color?} / {type:'__done__'} / an untagged
// {type:'cmd'} header line. Act ids: perimeter, site, perplexity, gemini,
// correlate, corpus, reading. 'fail' (whole-wave review finding 2) is terminal
// and means "ran and failed" — distinct from 'skip' ("didn't run") — emitted
// by the act's own emitter site, never inferred by the renderer from a note.
//
// This file runs the REAL pipeline code (signal-extractor.js's extractSignals,
// session-start.js's sessionStartHandler) with externals mocked at the same
// seams the neighbouring suites use (Firecrawl, Bedrock/chatComplete, recon,
// Postgres) — never a hand-invented fixture shape.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@mendable/firecrawl-js', () => ({
  default: vi.fn().mockImplementation(() => ({
    scrapeUrl: vi.fn(async (url) => ({
      success: true,
      statusCode: 200,
      markdown: `# content for ${url}\n\nWe are a B2B SaaS company.`,
    })),
  })),
}));

// Only stub the network-hitting export — extractReconContext (used by
// session-start.js downstream of extraction) stays real.
vi.mock('../../src/services/recon-pipeline.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    runReconPipeline: vi.fn(() => new Promise((resolve) => setTimeout(() => resolve(null), 5))),
  };
});

vi.mock('../../src/lib/inference.js', () => ({
  chatComplete: vi.fn(),
}));

vi.mock('../../src/db/pool.js', () => ({
  query: vi.fn(),
}));

vi.mock('../../src/services/corpus-retrieve.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    retrieveCorpusEvidence: vi.fn(),
  };
});

// gap-mapper's runGapAnalysis hits a real CORPUS HTTP call (3s AbortSignal
// timeout) when unmocked — an external, so it's stubbed here the same way
// analyze-read-quality.test.js keeps its suite hermetic and fast.
vi.mock('../../src/services/gap-mapper.js', () => ({
  runGapAnalysis: vi.fn(async () => ({ gaps: [], trust_score: 80, readiness: 'ready', vendors: [] })),
}));

// Controllable throw point for the "extraction-failure closes the stream"
// test below — buildInferences runs downstream of extractSignals inside
// session-start.js's extractAndInfer, so throwing here is the honest way to
// exercise that catch block without touching src.
const inferenceBuilderBehavior = { throwError: null };
vi.mock('../../src/services/inference-builder.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    buildInferences: (...args) => {
      if (inferenceBuilderBehavior.throwError) throw inferenceBuilderBehavior.throwError;
      return real.buildInferences(...args);
    },
  };
});

import { chatComplete } from '../../src/lib/inference.js';
import { query } from '../../src/db/pool.js';
import { retrieveCorpusEvidence } from '../../src/services/corpus-retrieve.js';
import { runGapAnalysis } from '../../src/services/gap-mapper.js';
import { extractSignals } from '../../src/services/signal-extractor.js';
import { researchQuery } from '../../src/services/recon-company.js';
import { sessionStartHandler } from '../../src/handlers/session-start.js';
import { analyzeHandler } from '../../src/handlers/analyze.js';
import { getSession, getLogs, createSession, updateSession, _getSessionsMap } from '../../src/services/session-store.js';

const EXTRACTION_JSON = {
  product_type: 'B2B SaaS',
  customer_type: 'Enterprise (B2B)',
  data_sensitivity: 'Customer data',
  stage: 'Seed',
  sector: 'saas',
  geo_market: 'AU',
  handles_payments: false,
  use_case: 'trust readiness for founders',
  competitor_mentions: [],
  enterprise_signals: {
    security_page_detected: false,
    trust_centre_detected: false,
    soc2_mentioned: false,
    pricing_enterprise_tier: false,
  },
  uses_ai: true,
  handles_personal_data: false,
  pen_test_completed: null,
  has_backup: null,
  aws_program_enrolled: null,
  microsoft_program_enrolled: null,
  own_hosting_provider: 'AWS',
  vendor_relationships: [],
  confidence: 'confident',
  company_summary: 'Acme builds trust tooling for enterprise SaaS buyers.',
};

// Validates every line against the fixed contract shape — never lets a stray
// or malformed event through unnoticed.
function assertContractShape(line) {
  switch (line.type) {
    case 'act':
      expect(line.act, `act event missing 'act': ${JSON.stringify(line)}`).toBeTruthy();
      expect(['start', 'done', 'skip', 'fail'], `bad phase: ${JSON.stringify(line)}`).toContain(line.phase);
      if (line.phase === 'start') {
        expect(typeof line.title, `start event missing title: ${JSON.stringify(line)}`).toBe('string');
      }
      return;
    case 'act_body':
      expect(line.act, `act_body missing 'act': ${JSON.stringify(line)}`).toBeTruthy();
      expect(typeof line.text, `act_body missing text: ${JSON.stringify(line)}`).toBe('string');
      return;
    case '__done__':
      return;
    case 'cmd':
      expect(line.act, `cmd line must be untagged (no act): ${JSON.stringify(line)}`).toBeUndefined();
      expect(typeof line.text).toBe('string');
      return;
    default:
      throw new Error(`line does not match the narrated-act contract: ${JSON.stringify(line)}`);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.PERPLEXITY_API_KEY;
  delete process.env.GEMINI_API_KEY;
  process.env.FIRECRAWL_API_KEY = 'test-firecrawl-key';
  chatComplete.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(EXTRACTION_JSON) } }] });
});

describe('extractSignals — the narrated act sequence (fresh success path)', () => {
  it('emits only contract-shaped lines, no __done__, correct act ordering, and honest engine skips', async () => {
    const log = [];
    const result = await extractSignals(
      { website_url: 'https://acme.example', session_id: null },
      (line) => log.push(line)
    );

    expect(result.signals.length).toBeGreaterThan(0);

    // 1. Every emitted line matches one of the contract shapes exactly.
    for (const line of log) assertContractShape(line);

    // Untagged cmd header line, first out.
    expect(log[0]).toMatchObject({ type: 'cmd', text: '$ proof360 --url acme.example' });

    const idx = (pred) => log.findIndex(pred);
    const isAct = (act, phase) => (l) => l.type === 'act' && l.act === act && l.phase === phase;

    const perimeterStart = idx(isAct('perimeter', 'start'));
    const siteStart = idx(isAct('site', 'start'));
    const siteDone = idx(isAct('site', 'done'));
    const perplexityStart = idx(isAct('perplexity', 'start'));
    const perplexitySkip = idx(isAct('perplexity', 'skip'));
    const geminiStart = idx(isAct('gemini', 'start'));
    const geminiSkip = idx(isAct('gemini', 'skip'));
    // The recon-pipeline mock (top of file) always resolves null — recon never
    // actually completes in this suite, so perimeter honestly closes 'fail'
    // (not 'done') here. This is the exact shape finding 2 fixed: a failed
    // closure must never render as a plain 'done'.
    const perimeterFail = idx(isAct('perimeter', 'fail'));
    const correlateStart = idx(isAct('correlate', 'start'));
    const correlateDone = idx(isAct('correlate', 'done'));

    // 2. Act ordering on the success path.
    expect(perimeterStart).toBeGreaterThanOrEqual(0);
    expect(perimeterStart).toBeLessThan(siteStart);
    expect(siteStart).toBeLessThan(siteDone);
    expect(siteDone).toBeLessThan(perplexityStart);
    expect(perplexityStart).toBeLessThan(perplexitySkip);
    expect(perplexitySkip).toBeLessThan(geminiStart);
    expect(geminiStart).toBeLessThan(geminiSkip);
    expect(geminiSkip).toBeLessThan(perimeterFail);
    expect(perimeterFail).toBeLessThan(correlateStart);
    expect(correlateStart).toBeLessThan(correlateDone);
    // Never rendered as a plain success closure.
    expect(log.find(isAct('perimeter', 'done'))).toBeUndefined();

    // correlate's 'done' is the true last emission on the success path (it
    // fires after every per-signal act_body line correlate writes).
    expect(correlateDone).toBe(log.length - 1);

    // 3. Engine skip honesty: no keys configured → both skip, never 'done'.
    expect(log.find(isAct('perplexity', 'done'))).toBeUndefined();
    expect(log.find(isAct('gemini', 'done'))).toBeUndefined();

    // 4. No __done__ anywhere on extractSignals' success path.
    expect(log.find((l) => l.type === '__done__')).toBeUndefined();

    // 5. Verbatim query transparency: the perplexity act_body carries the
    // exact research query text, even though the engine itself was skipped
    // (runResearchAct logs the "we asked" query before calling the engine).
    const expectedQuery = researchQuery('acme.example');
    const perplexityBody = log
      .filter((l) => l.type === 'act_body' && l.act === 'perplexity')
      .map((l) => l.text)
      .join(' ');
    expect(perplexityBody.replace(/\s+/g, ' ')).toContain(expectedQuery.slice(0, 60));
    expect(perplexityBody).toContain('we asked:');
  });
});

describe('extractSignals — extraction failure never reaches __done__ itself', () => {
  it('a pipeline throw resolves to the honest fallback, not a __done__ emission (that belongs to the caller)', async () => {
    chatComplete.mockRejectedValue(new Error('bedrock unreachable'));
    const log = [];
    const result = await extractSignals(
      { website_url: 'https://acme.example', session_id: null },
      (line) => log.push(line)
    );

    // Honest degradation: the caller (session-start.js) still gets a usable
    // fallback result, never a thrown rejection — that's what lets its own
    // outer try/catch stay reserved for genuinely unexpected failures.
    expect(result.pages_read_count).toBe(0);
    expect(log.find((l) => l.type === '__done__')).toBeUndefined();

    // Finding 2 (whole-wave review): the correlate act ran and threw (chatComplete
    // rejected) — that closes 'fail', never a bare 'done' with a 'failed' note
    // hiding behind a green checkmark.
    const correlateClose = log.find(
      (l) => l.type === 'act' && l.act === 'correlate' && (l.phase === 'done' || l.phase === 'fail')
    );
    expect(correlateClose).toMatchObject({ phase: 'fail', note: 'failed' });
  });
});

// Finding 3 (live rehearsal): the Gemini act skipped with note "no answer" when the
// actual response was HTTP 429 "prepayment credits depleted" — recon-company.js was
// swallowing the status code. A 429 must narrate as 'quota exhausted', never the
// generic 'no answer' (that class stays reserved for a genuine timeout/network throw).
describe('extractSignals — engine skip honesty (real failure class, not a swallowed status)', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('perplexity 429 → skip note "quota exhausted", not "no answer"', async () => {
    process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('perplexity.ai')) {
        return { ok: false, status: 429, json: async () => ({}) };
      }
      return originalFetch(url);
    });

    const log = [];
    await extractSignals(
      { website_url: 'https://acme.example', session_id: null },
      (line) => log.push(line)
    );

    const perplexitySkip = log.find(
      (l) => l.type === 'act' && l.act === 'perplexity' && l.phase === 'skip'
    );
    expect(perplexitySkip).toBeTruthy();
    expect(perplexitySkip.note).toBe('quota exhausted');
  });

  it('perplexity non-429 error status → skip note "engine error (NNN)"', async () => {
    process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('perplexity.ai')) {
        return { ok: false, status: 503, json: async () => ({}) };
      }
      return originalFetch(url);
    });

    const log = [];
    await extractSignals(
      { website_url: 'https://acme.example', session_id: null },
      (line) => log.push(line)
    );

    const perplexitySkip = log.find(
      (l) => l.type === 'act' && l.act === 'perplexity' && l.phase === 'skip'
    );
    expect(perplexitySkip.note).toBe('engine error (503)');
  });
});

describe('session-start.js — the corpus act + the extraction-failure __done__', () => {
  beforeEach(() => {
    _getSessionsMap().clear();
    query.mockResolvedValue({ rows: [{ id: 'sess-fixed-1' }] });
    inferenceBuilderBehavior.throwError = null;
  });

  function replyMock() {
    return {
      statusCode: 200,
      payload: null,
      status(code) { this.statusCode = code; return this; },
      send(payload) { this.payload = payload; return payload; },
    };
  }

  it('corpus holdings found → act done with a holdings count and per-hit body lines', async () => {
    retrieveCorpusEvidence.mockResolvedValue([
      { slug: 'acme-raise', layer: 'evidence', score: 0.87 },
    ]);
    const reply = replyMock();
    await sessionStartHandler({ body: { website_url: 'https://acme.example' } }, reply);
    const sessionId = reply.payload.session_id;

    await vi.waitFor(() => {
      expect(getSession(sessionId).infer_status).toBe('complete');
    });

    const log = getLogs(sessionId);
    for (const line of log) assertContractShape(line);

    const corpusDone = log.find((l) => l.type === 'act' && l.act === 'corpus' && l.phase === 'done');
    expect(corpusDone).toMatchObject({ note: '1 holdings' });
    const hitLine = log.find((l) => l.type === 'act_body' && l.act === 'corpus' && l.text.includes('acme-raise'));
    expect(hitLine.text).toContain('evidence');
  });

  // Finding 1 (live rehearsal, cognisys.co.uk, session ed51d850): corpus-retrieve.js
  // used to return null for BOTH "unreachable" and "reached fine, zero hits" — the
  // body line said "no holdings touch this company yet" while the skip note said
  // "corpus unreachable" even though corpus was up. null must now mean ONLY
  // "could not look" (ABSENCE RULE: could-not-look ≠ looked-and-found-nothing).
  it('corpus unreachable (null) → act skip, honest note, NO absence body line — we could not look', async () => {
    retrieveCorpusEvidence.mockResolvedValue(null);
    const reply = replyMock();
    await sessionStartHandler({ body: { website_url: 'https://acme.example' } }, reply);
    const sessionId = reply.payload.session_id;

    await vi.waitFor(() => {
      expect(getSession(sessionId).infer_status).toBe('complete');
    });

    const log = getLogs(sessionId);
    for (const line of log) assertContractShape(line);

    const corpusEvent = log.find((l) => l.type === 'act' && l.act === 'corpus' && (l.phase === 'done' || l.phase === 'skip'));
    expect(corpusEvent.phase).toBe('skip');
    expect(corpusEvent.note).toBe('corpus unreachable');
    // ABSENCE RULE: we never looked, so we must never claim "no holdings" —
    // that would be stating a finding we don't have.
    const corpusBodies = log.filter((l) => l.type === 'act_body' && l.act === 'corpus');
    expect(corpusBodies.some((l) => l.text.includes('no holdings touch this company yet'))).toBe(false);
  });

  // The other half of finding 1: corpus reached fine, nothing scored ([]) — a real,
  // honest zero, distinct from "could not look". This is the case the live
  // rehearsal's contradictory body line was ACTUALLY describing, and it must read
  // as 'done', not 'skip'.
  it('corpus reached, zero holdings ([]) → act done, "0 holdings" note, honest absence body line', async () => {
    retrieveCorpusEvidence.mockResolvedValue([]);
    const reply = replyMock();
    await sessionStartHandler({ body: { website_url: 'https://acme.example' } }, reply);
    const sessionId = reply.payload.session_id;

    await vi.waitFor(() => {
      expect(getSession(sessionId).infer_status).toBe('complete');
    });

    const log = getLogs(sessionId);
    for (const line of log) assertContractShape(line);

    const corpusEvent = log.find((l) => l.type === 'act' && l.act === 'corpus' && (l.phase === 'done' || l.phase === 'skip'));
    expect(corpusEvent.phase).toBe('done');
    expect(corpusEvent.note).toBe('0 holdings');
    const corpusBodies = log.filter((l) => l.type === 'act_body' && l.act === 'corpus');
    expect(corpusBodies.some((l) => l.text.includes('no holdings touch this company yet'))).toBe(true);

    // Session cache carries the real empty array through, not null (three-state
    // contract on session.corpus_hits — corpus-retrieve.js / cold-reading.js).
    expect(getSession(sessionId).corpus_hits).toEqual([]);
  });

  it('the extraction-failure catch — and only that catch — emits __done__', async () => {
    // Drive a real throw downstream of extractSignals inside extractAndInfer
    // (session-start.js) — this is the one path documented to still close
    // the stream on failure, unlike the success path's open-ended handoff
    // to analyze.js's "reading" act.
    inferenceBuilderBehavior.throwError = new Error('inference-builder blew up');
    const reply = replyMock();
    await sessionStartHandler({ body: { website_url: 'https://acme.example' } }, reply);
    const sessionId = reply.payload.session_id;

    await vi.waitFor(() => {
      expect(getSession(sessionId).infer_status).toBe('failed');
    });

    const log = getLogs(sessionId);
    expect(log.find((l) => l.type === '__done__')).toBeTruthy();
    // Nothing downstream of the throw (corpus act) ever ran.
    expect(log.find((l) => l.type === 'act' && l.act === 'corpus')).toBeUndefined();
  });
});

describe('analyze.js — the "reading" act closes the whole-thinking stream', () => {
  beforeEach(() => {
    _getSessionsMap().clear();
  });

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
    updateSession(session.id, {
      infer_status: 'complete',
      company_name: 'Acme',
      inferences: [],
      correctable_fields: [],
      raw_signals: [],
      sources_read: ['homepage'],
      pages_read_count: 1,
    });
    return session;
  }

  it('fresh analyze: act start → body lines → act done → __done__, and __done__ is the true last line', async () => {
    const session = seededSession();
    const reply = replyMock();
    await analyzeHandler({ params: { id: session.id } }, reply);

    expect(reply.statusCode).toBe(200);
    const log = getLogs(session.id);
    for (const line of log) assertContractShape(line);

    const isReading = (phase) => (l) => l.type === 'act' && l.act === 'reading' && l.phase === phase;
    const startIdx = log.findIndex(isReading('start'));
    const doneIdx = log.findIndex(isReading('done'));
    const doneMarkerIdx = log.findIndex((l) => l.type === '__done__');

    expect(startIdx).toBe(0); // first thing analyze.js appends
    expect(log[startIdx].title).toBe('Writing your read');
    expect(startIdx).toBeLessThan(doneIdx);
    expect(doneIdx).toBeLessThan(doneMarkerIdx);
    // __done__ is the final line — analyze.js's fresh path is what closes the stream.
    expect(doneMarkerIdx).toBe(log.length - 1);

    // Every act_body line in between is honestly act-tagged 'reading'.
    const bodies = log.filter((l) => l.type === 'act_body');
    expect(bodies.length).toBeGreaterThan(0);
    for (const b of bodies) expect(b.act).toBe('reading');
  });

  // Finding 2 (whole-wave review): the "reading" act ran and threw — that closes
  // 'fail', never a bare 'done' with a 'failed' note rendering as a green ✓.
  it('a throw inside the reading act closes it \'fail\' (not \'done\'), then __done__, then a 500', async () => {
    runGapAnalysis.mockRejectedValueOnce(new Error('gap analysis blew up'));
    const session = seededSession();
    const reply = replyMock();
    await analyzeHandler({ params: { id: session.id } }, reply);

    expect(reply.statusCode).toBe(500);
    const log = getLogs(session.id);
    for (const line of log) assertContractShape(line);

    const readingFail = log.find((l) => l.type === 'act' && l.act === 'reading' && l.phase === 'fail');
    expect(readingFail).toMatchObject({ note: 'failed' });
    expect(log.find((l) => l.type === 'act' && l.act === 'reading' && l.phase === 'done')).toBeUndefined();

    // __done__ still closes the stream on failure — never strand the frontend mid-open.
    const doneMarkerIdx = log.findIndex((l) => l.type === '__done__');
    expect(doneMarkerIdx).toBe(log.length - 1);
    expect(log.findIndex((l) => l === readingFail)).toBeLessThan(doneMarkerIdx);
  });

  // Finding 4 (live rehearsal, cosmetic): the reading act's anchor body line printed
  // "↳ Company research · perplexity · perplexity" — cold-reading.js's single-engine
  // anchor already ends the label with the source (`Company research · ${engine}`,
  // source: engine — see buildReadingContext), so appending "· source" doubled it.
  it('reading act anchor body line: label already containing the source prints once, not doubled', async () => {
    retrieveCorpusEvidence.mockResolvedValue(null);
    const session = createSession({ website_url: 'https://acme.example' });
    updateSession(session.id, {
      infer_status: 'complete',
      company_name: 'Acme',
      inferences: [],
      correctable_fields: [],
      raw_signals: [],
      sources_read: ['homepage'],
      pages_read_count: 1,
      company_summary: 'Acme builds trust tooling for enterprise SaaS buyers.',
      research_engines: ['perplexity'],
    });
    const reply = replyMock();
    await analyzeHandler({ params: { id: session.id } }, reply);

    expect(reply.statusCode).toBe(200);
    const log = getLogs(session.id);
    const anchorLine = log.find(
      (l) => l.type === 'act_body' && l.act === 'reading' && l.text.includes('Company research')
    );
    expect(anchorLine).toBeTruthy();
    expect(anchorLine.text).toBe('↳  Company research · perplexity');
    // The exact bug: the source must never appear twice in one line.
    expect(anchorLine.text.match(/perplexity/g)?.length).toBe(1);
  });
});
