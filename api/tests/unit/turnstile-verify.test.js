import { describe, it, expect, vi } from 'vitest';
import { createTurnstileVerifyHandler } from '../../src/handlers/turnstile.js';

function replyMock() {
  return {
    statusCode: 200,
    payload: null,
    code(c) {
      this.statusCode = c;
      return this;
    },
    send(payload) {
      this.payload = payload;
      return payload;
    },
  };
}

function cfFetch(body, { ok = true, status = 200 } = {}) {
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => body,
  }));
}

const REQ = (token) => ({ body: { token }, ip: '203.0.113.7' });

describe('turnstileVerifyHandler (default-deny siteverify gate)', () => {
  it('passes ONLY when Cloudflare answers success === true', async () => {
    const fetchImpl = cfFetch({ success: true });
    const handler = createTurnstileVerifyHandler({ secret: 's3cret', fetchImpl });
    const reply = replyMock();
    await handler(REQ('tok-abc'), reply);
    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({ ok: true });
  });

  it('sends secret + response + remoteip to the CF siteverify endpoint', async () => {
    const fetchImpl = cfFetch({ success: true });
    const handler = createTurnstileVerifyHandler({ secret: 's3cret', fetchImpl });
    await handler(REQ('tok-abc'), replyMock());
    const [url, opts] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const params = new URLSearchParams(opts.body);
    expect(params.get('secret')).toBe('s3cret');
    expect(params.get('response')).toBe('tok-abc');
    expect(params.get('remoteip')).toBe('203.0.113.7');
  });

  it('rejects (403) when CF answers success false, surfacing error codes', async () => {
    const fetchImpl = cfFetch({ success: false, 'error-codes': ['invalid-input-response'] });
    const handler = createTurnstileVerifyHandler({ secret: 's3cret', fetchImpl });
    const reply = replyMock();
    await handler(REQ('tok-bad'), reply);
    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toMatchObject({ ok: false, codes: ['invalid-input-response'] });
  });

  it('rejects (403) any non-true success value — truthy is not enough (fail-closed)', async () => {
    for (const success of [1, 'true', {}, [], 'yes']) {
      const handler = createTurnstileVerifyHandler({ secret: 's3cret', fetchImpl: cfFetch({ success }) });
      const reply = replyMock();
      await handler(REQ('tok'), reply);
      expect(reply.statusCode, `success=${JSON.stringify(success)}`).toBe(403);
      expect(reply.payload.ok).toBe(false);
    }
  });

  it('400s when the token is missing or not a usable string', async () => {
    const fetchImpl = cfFetch({ success: true });
    const handler = createTurnstileVerifyHandler({ secret: 's3cret', fetchImpl });
    for (const token of [undefined, null, '', '   ', 42, {}]) {
      const reply = replyMock();
      await handler({ body: { token }, ip: '203.0.113.7' }, reply);
      expect(reply.statusCode, `token=${JSON.stringify(token)}`).toBe(400);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('503s loudly when no secret is configured — never passes through', async () => {
    const fetchImpl = cfFetch({ success: true });
    for (const secret of [undefined, null, '', '   ']) {
      const handler = createTurnstileVerifyHandler({ secret, fetchImpl });
      const reply = replyMock();
      await handler(REQ('tok'), reply);
      expect(reply.statusCode, `secret=${JSON.stringify(secret)}`).toBe(503);
      expect(reply.payload).toMatchObject({ ok: false, error: 'turnstile_not_configured' });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails closed (502) when siteverify is unreachable or non-OK', async () => {
    const throwing = vi.fn(async () => { throw new Error('network down'); });
    const handler = createTurnstileVerifyHandler({ secret: 's3cret', fetchImpl: throwing });
    const reply = replyMock();
    await handler(REQ('tok'), reply);
    expect(reply.statusCode).toBe(502);
    expect(reply.payload.ok).toBe(false);

    const non200 = cfFetch({}, { ok: false, status: 500 });
    const handler2 = createTurnstileVerifyHandler({ secret: 's3cret', fetchImpl: non200 });
    const reply2 = replyMock();
    await handler2(REQ('tok'), reply2);
    expect(reply2.statusCode).toBe(502);
    expect(reply2.payload.ok).toBe(false);
  });
});
