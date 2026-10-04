import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/handlers/turnstile.js', () => ({ verifyTurnstileToken: vi.fn() }));
vi.mock('../../src/services/john-relay.js', () => ({ notifyJohn: vi.fn() }));

import { notifyHandler } from '../../src/handlers/notify.js';
import { verifyTurnstileToken } from '../../src/handlers/turnstile.js';
import { notifyJohn } from '../../src/services/john-relay.js';

function fakeReply() {
  return {
    _status: 200, _body: undefined,
    code(n) { this._status = n; return this; },
    send(b) { this._body = b; return this; },
  };
}

const okTurnstile = () => verifyTurnstileToken.mockResolvedValue({ ok: true, status: 200 });

describe('POST /notify — Message John is gated', () => {
  const saved = {};
  beforeEach(() => {
    vi.clearAllMocks();
    saved.bot = process.env.TELEGRAM_BOT_TOKEN;
    saved.chat = process.env.TELEGRAM_CHAT_ID;
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
  });
  afterEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = saved.bot;
    process.env.TELEGRAM_CHAT_ID = saved.chat;
  });

  it('400s with no message, before any Turnstile check', async () => {
    const reply = fakeReply();
    await notifyHandler({ body: {} }, reply);
    expect(reply._status).toBe(400);
    expect(verifyTurnstileToken).not.toHaveBeenCalled();
  });

  it('refuses when Turnstile is missing/invalid, with the verifier status — no send', async () => {
    verifyTurnstileToken.mockResolvedValue({ ok: false, status: 403, error: 'verification_failed' });
    const reply = fakeReply();
    await notifyHandler({ body: { message: 'hi' } }, reply);
    expect(reply._status).toBe(403);
    expect(notifyJohn).not.toHaveBeenCalled();
  });

  it('503s honestly (not {ok:true}) when Telegram is not configured', async () => {
    okTurnstile();
    delete process.env.TELEGRAM_BOT_TOKEN;
    const reply = fakeReply();
    await notifyHandler({ body: { message: 'hi', turnstileToken: 't' } }, reply);
    expect(reply._status).toBe(503);
    expect(reply._body.error).toBe('messaging_unavailable');
    expect(notifyJohn).not.toHaveBeenCalled();
  });

  it('502s when the Telegram send actually fails', async () => {
    okTurnstile();
    notifyJohn.mockResolvedValue(false);
    const reply = fakeReply();
    await notifyHandler({ body: { message: 'hi', turnstileToken: 't' } }, reply);
    expect(reply._status).toBe(502);
    expect(reply._body.error).toBe('send_failed');
  });

  it('200 {ok:true} only when it was actually sent', async () => {
    okTurnstile();
    notifyJohn.mockResolvedValue(true);
    const reply = fakeReply();
    await notifyHandler({ body: { message: 'hi', turnstileToken: 't' } }, reply);
    expect(reply._status).toBe(200);
    expect(reply._body).toEqual({ ok: true });
  });
});
