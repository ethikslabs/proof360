import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/services/john-relay.js', () => ({ getSessionForMessage: vi.fn() }));
vi.mock('../../src/services/session-store.js', () => ({ getSession: vi.fn(), persistSession: vi.fn() }));

import { telegramWebhookHandler } from '../../src/handlers/telegram-webhook.js';
import { getSessionForMessage } from '../../src/services/john-relay.js';
import { getSession, persistSession } from '../../src/services/session-store.js';

function fakeReply() {
  return {
    _status: 200, _body: undefined,
    status(n) { this._status = n; return this; },
    send(b) { this._body = b; return this; },
  };
}
const req = (headers, body) => ({ headers, body });

describe('telegram webhook secret (default-deny)', () => {
  const saved = {};
  beforeEach(() => { vi.clearAllMocks(); saved.s = process.env.TELEGRAM_WEBHOOK_SECRET; });
  afterEach(() => { process.env.TELEGRAM_WEBHOOK_SECRET = saved.s; });

  it('401s when no secret is configured (fail closed)', async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    const reply = fakeReply();
    await telegramWebhookHandler(req({ 'x-telegram-bot-api-secret-token': 'anything' }, {}), reply);
    expect(reply._status).toBe(401);
  });

  it('401s on a wrong or missing secret header', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'right-secret';
    for (const headers of [{}, { 'x-telegram-bot-api-secret-token': 'wrong' }]) {
      const reply = fakeReply();
      await telegramWebhookHandler(req(headers, {}), reply);
      expect(reply._status).toBe(401);
    }
  });

  it('accepts the correct secret and processes the update', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'right-secret';
    const reply = fakeReply();
    await telegramWebhookHandler(req({ 'x-telegram-bot-api-secret-token': 'right-secret' }, {}), reply);
    expect(reply._status).toBe(200);
    expect(reply._body).toEqual({ ok: true });
  });

  it('stores a photo reply as a file_id, never a tokenised URL', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'right-secret';
    getSessionForMessage.mockReturnValue('sess-1');
    const session = { id: 'sess-1', john_messages: [] };
    getSession.mockReturnValue(session);

    const body = { message: { message_id: 9, reply_to_message: { message_id: 1 }, photo: [{ file_id: 'small' }, { file_id: 'FILE_BIG' }] } };
    await telegramWebhookHandler(req({ 'x-telegram-bot-api-secret-token': 'right-secret' }, body), fakeReply());

    expect(session.john_messages).toHaveLength(1);
    const stored = session.john_messages[0];
    expect(stored.type).toBe('image');
    expect(stored.file_id).toBe('FILE_BIG');     // largest photo
    expect(stored.url).toBeUndefined();          // no URL stored at all
    expect(JSON.stringify(stored)).not.toContain('api.telegram.org');
    expect(persistSession).toHaveBeenCalledWith('sess-1');
  });
});
