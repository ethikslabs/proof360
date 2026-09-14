// An Auth0 access token for our API audience carries no email claim; the email lives in
// the ID token or behind /userinfo. The founder record took `payload.email || null` and
// so every Auth0 founder was recorded with no email, which the mailbox door (registered
// founders only, 14 Sept) would then decline. Resolve it once per sign-in at the seam.
import { describe, it, expect, beforeEach } from 'vitest';
import { resolveEmail, _resetUserinfoCacheForTests } from '../../src/lib/auth.js';

beforeEach(() => _resetUserinfoCacheForTests());

describe('resolveEmail — the email behind an access token', () => {
  it('a token that already carries email needs no call', async () => {
    let calls = 0;
    const email = await resolveEmail({ payload: { sub: 'a|1', email: 'x@y.com', scope: 'openid email' }, token: 't', domain: 'd.auth0.com', fetchImpl: async () => { calls += 1; } });
    expect(email).toBe('x@y.com');
    expect(calls).toBe(0);
  });

  it('with the email scope and no claim, /userinfo is asked once and the answer is cached by sub', async () => {
    const seen = [];
    const fetchImpl = async (url, opts) => { seen.push({ url: String(url), auth: opts.headers.Authorization }); return new Response(JSON.stringify({ sub: 'a|2', email: 'John@Ethiks360.com' }), { status: 200 }); };
    const payload = { sub: 'a|2', scope: 'openid email profile' };
    expect(await resolveEmail({ payload, token: 'tok', domain: 'd.auth0.com', fetchImpl })).toBe('john@ethiks360.com');
    expect(await resolveEmail({ payload, token: 'tok', domain: 'd.auth0.com', fetchImpl })).toBe('john@ethiks360.com');
    expect(seen).toEqual([{ url: 'https://d.auth0.com/userinfo', auth: 'Bearer tok' }]);
  });

  it('no email scope means no call and no email', async () => {
    let calls = 0;
    expect(await resolveEmail({ payload: { sub: 'a|3', scope: 'openid' }, token: 't', domain: 'd', fetchImpl: async () => { calls += 1; } })).toBeNull();
    expect(calls).toBe(0);
  });

  it('a failing /userinfo never breaks sign-in: null, and not cached', async () => {
    let calls = 0;
    const fetchImpl = async () => { calls += 1; return new Response('nope', { status: 500 }); };
    const payload = { sub: 'a|4', scope: 'openid email' };
    expect(await resolveEmail({ payload, token: 't', domain: 'd', fetchImpl })).toBeNull();
    expect(await resolveEmail({ payload, token: 't', domain: 'd', fetchImpl })).toBeNull();
    expect(calls).toBe(2);
  });
});
