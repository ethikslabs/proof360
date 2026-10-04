import { describe, it, expect } from 'vitest';
import { sessionStartHandler } from '../../src/handlers/session-start.js';

// A fake reply that records the first status/body without any server or DB.
function fakeReply() {
  return {
    _status: 200,
    _body: undefined,
    status(n) { this._status = n; return this; },
    send(b) { this._body = b; return this; },
  };
}

describe('session start refuses an obviously-private target before spending anything', () => {
  for (const url of ['http://169.254.169.254/', 'http://127.0.0.1/', 'http://10.0.0.5/', 'http://localhost:3002/']) {
    it(`400s ${url} without creating a session`, async () => {
      const reply = fakeReply();
      await sessionStartHandler({ body: { website_url: url } }, reply);
      expect(reply._status).toBe(400);
      expect(reply._body.code).toBe('BLOCKED_TARGET');
    });
  }

  it('still 400s a request with neither website_url nor deck_file', async () => {
    const reply = fakeReply();
    await sessionStartHandler({ body: {} }, reply);
    expect(reply._status).toBe(400);
    expect(reply._body.code).toBe('INVALID_INPUT');
  });
});
