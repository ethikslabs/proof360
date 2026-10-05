import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The webhook appends a message attributed to John into a founder's session.
// Without a secret-header check anyone who can reach the route and guess a mapped
// reply message_id can forge that. These tests pin the secret gate: the session is
// mutated ONLY when Telegram's own secret-token header matches the configured secret.

const session = { id: 'sess-1', john_messages: [] };

vi.mock('../../src/services/john-relay.js', () => ({
  getSessionForMessage: vi.fn(() => 'sess-1'),
  getTelegramFileUrl: vi.fn(async () => 'https://example/file'),
}));
vi.mock('../../src/services/session-store.js', () => ({
  getSession: vi.fn(() => session),
  persistSession: vi.fn(),
}));

import { telegramWebhookHandler } from '../../src/handlers/telegram-webhook.js';
import { persistSession } from '../../src/services/session-store.js';

function replyMock() {
  return {
    statusCode: 200, payload: null,
    status(c) { this.statusCode = c; return this; },
    send(p) { this.payload = p; return p; },
  };
}
function req({ secret, text = 'forged reply' } = {}) {
  return {
    headers: secret === undefined ? {} : { 'x-telegram-bot-api-secret-token': secret },
    body: { message: { message_id: 10, reply_to_message: { message_id: 7 }, text } },
  };
}

const REAL = 's3cr3t-token-value';

beforeEach(() => {
  session.john_messages = [];
  vi.clearAllMocks();
  process.env.TELEGRAM_WEBHOOK_SECRET = REAL;
});
afterEach(() => { delete process.env.TELEGRAM_WEBHOOK_SECRET; });

describe('telegram webhook secret gate', () => {
  it('rejects a request with no secret header and does not mutate the session', async () => {
    const reply = replyMock();
    await telegramWebhookHandler(req({ secret: undefined }), reply);
    expect(reply.statusCode).toBe(401);
    expect(session.john_messages).toHaveLength(0);
    expect(persistSession).not.toHaveBeenCalled();
  });

  it('rejects a request with a wrong secret and does not mutate the session', async () => {
    const reply = replyMock();
    await telegramWebhookHandler(req({ secret: 'wrong-token' }), reply);
    expect(reply.statusCode).toBe(401);
    expect(session.john_messages).toHaveLength(0);
    expect(persistSession).not.toHaveBeenCalled();
  });

  it('fails closed when no secret is configured, even with a header present', async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    const reply = replyMock();
    await telegramWebhookHandler(req({ secret: 'anything' }), reply);
    expect(reply.statusCode).toBe(401);
    expect(session.john_messages).toHaveLength(0);
    expect(persistSession).not.toHaveBeenCalled();
  });

  it('processes a request whose secret matches the configured token', async () => {
    const reply = replyMock();
    await telegramWebhookHandler(req({ secret: REAL }), reply);
    expect(reply.payload).toEqual({ ok: true });
    expect(session.john_messages).toHaveLength(1);
    expect(session.john_messages[0].content).toBe('forged reply');
    expect(persistSession).toHaveBeenCalledWith('sess-1');
  });
});
