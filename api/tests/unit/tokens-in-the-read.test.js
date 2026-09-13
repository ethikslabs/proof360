// Tokens in the read (John ruling 2026-09-13, R7): the count is visible per act, per turn, per
// session — tokens only. These pin the seams: the research tally, the receipt stamp, the door.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSession, getSession } from '../../src/services/session-store.js';
import { appendChatReceipt, stampLastReceiptTokens, usageHandler } from '../../src/handlers/record.js';
import { fetchPerplexityResearch, fetchGeminiResearch } from '../../src/services/recon-company.js';
import { usageSummary } from '../../src/services/session-usage.js';

function replyMock() {
  const r = { code: 200, body: null };
  r.status = (c) => { r.code = c; return r; };
  r.send = (b) => { r.body = b; return r; };
  return r;
}

describe('tokens in the read', () => {
  let sid;
  beforeEach(() => { sid = createSession({ website_url: 'https://acme.com' }).id; });

  it('a research engine call is tallied on the session under its act, even when the answer is thin', async () => {
    process.env.PERPLEXITY_API_KEY = 'k';
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'short' } }], usage: { prompt_tokens: 80, completion_tokens: 12 } }) }));
    const r = await fetchPerplexityResearch('acme.com', { session_id: sid, act: 'perplexity' });
    expect(r.skip).toBe('too thin');
    const s = usageSummary(getSession(sid));
    expect(s.by_act.perplexity).toEqual({ calls: 1, in: 80, out: 12, total: 92 });
    expect(s.by_provider.perplexity.calls).toBe(1);
  });

  it('gemini reports usageMetadata; the tally reads it', async () => {
    process.env.GEMINI_API_KEY = 'k';
    const long = 'x'.repeat(500);
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: long }] } }], usageMetadata: { promptTokenCount: 70, candidatesTokenCount: 300 } }) }));
    const r = await fetchGeminiResearch('acme.com', { session_id: sid, act: 'gemini' });
    expect(r.content).toBeTruthy();
    expect(r.usage).toMatchObject({ in: 70, out: 300, provider: 'gemini' });
    expect(usageSummary(getSession(sid)).by_act.gemini.total).toBe(370);
  });

  it('a chat receipt is written before the answer and stamped with tokens after', () => {
    appendChatReceipt(getSession(sid), { query: 'q1', hits: [] });
    appendChatReceipt(getSession(sid), { query: 'q2', hits: null });
    stampLastReceiptTokens(sid, { in: 1200, out: 140, model: 'claude-haiku-4-5-20251001' });
    const receipts = getSession(sid).chat_receipts;
    expect(receipts[0].tokens).toBeUndefined();
    expect(receipts[1].tokens).toEqual({ in: 1200, out: 140, model: 'claude-haiku-4-5-20251001' });
    expect(receipts[1].hits).toBeNull(); // could-not-look survives the stamp
    // stamping with nothing to stamp is a no-op, never a throw
    stampLastReceiptTokens('nope', { in: 1, out: 1 });
    stampLastReceiptTokens(sid, null);
  });

  it('GET /session/:id/usage answers tokens only, 404 for an unknown session', async () => {
    const r404 = replyMock();
    await usageHandler({ params: { id: 'missing' } }, r404);
    expect(r404.code).toBe(404);
    const r = replyMock();
    await usageHandler({ params: { id: sid } }, r);
    expect(r.code).toBe(200);
    expect(r.body.usage).toEqual({ calls: 0, tokens: { in: 0, out: 0, total: 0 }, by_provider: {}, by_act: {} });
    expect(JSON.stringify(r.body)).not.toMatch(/cost|usd|price/i);
  });
});
