// Session-chat grounding — the product surface gets the same engine as /api/v1/chat:
// corpus evidence joins the system prompt, and every exchange leaves a receipt
// ("Our working"). Honest by construction: corpus down = empty-hits receipt.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/inference.js', () => ({
  chatStream: vi.fn(async function* ({ messages }) {
    yield messages.find((m) => m.role === 'system').content;
  }),
}));

const corpusResult = { value: null };
vi.mock('../../src/services/corpus-retrieve.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    retrieveCorpusEvidence: vi.fn(async () => corpusResult.value),
  };
});

import { chatStream } from '../../src/lib/inference.js';
import { createSession, updateSession, getSession } from '../../src/services/session-store.js';
import { sessionChatHandler } from '../../src/handlers/session-chat.js';

function replyMock() {
  const raw = { headers: null, chunks: [], writeHead(c, h) { this.headers = h; }, write(d) { this.chunks.push(d); }, end() {} };
  return {
    raw,
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    send(payload) { this.payload = payload; return payload; },
    type() { return this; },
  };
}

async function say(sessionId, message) {
  const reply = replyMock();
  await sessionChatHandler({ params: { id: sessionId }, body: { message, persona_override: 'edison' }, log: { error() {} } }, reply);
  return reply;
}

function seededSession() {
  const session = createSession({ website_url: 'https://acme.example' });
  updateSession(session.id, { infer_status: 'complete', company_name: 'Acme' });
  return getSession(session.id);
}

describe('session-chat corpus grounding + receipts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    corpusResult.value = null;
  });

  it('grounds the system prompt with retrieved evidence and appends a receipt', async () => {
    corpusResult.value = [
      { n: 1, slug: 'isitagentready-com', layer: 'public', evidence_id: 'ev1', score: 0.91, text: 'Agents need attested rails.', source_url: 'https://example.com/post', fetched_at: '2026-08-20T00:00:00Z' },
    ];
    const session = seededSession();
    await say(session.id, 'what do you hold on agent readiness?');

    const sys = chatStream.mock.calls.at(-1)[0].messages.find((m) => m.role === 'system').content;
    expect(sys).toContain('Agents need attested rails.');

    const receipts = getSession(session.id).chat_receipts;
    expect(receipts).toHaveLength(1);
    expect(receipts[0].query).toBe('what do you hold on agent readiness?');
    expect(receipts[0].hits[0].slug).toBe('isitagentready-com');
  });

  it('appends an honest empty-hits receipt when corpus is unavailable', async () => {
    corpusResult.value = null;
    const session = seededSession();
    await say(session.id, 'anything on SOC 2?');

    const receipts = getSession(session.id).chat_receipts;
    expect(receipts).toHaveLength(1);
    expect(receipts[0].hits).toEqual([]);
  });
});
