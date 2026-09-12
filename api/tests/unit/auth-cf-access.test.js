// requireAuth accepts a Cloudflare Access identity (Cf-Access-Jwt-Assertion) as a second,
// verified way in — for the corpus-console, which sits behind Access and has no Auth0 login.
// Default-deny: the header is ignored unless CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD are both
// set, the signature is checked against the team's JWKS, and a token without an email (a
// service token) is refused. A Bearer token still takes precedence.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet } from 'jose';
import { requireAuth, _setCfAccessJwksForTests, _resetVerifierForTests } from '../../src/lib/auth.js';

const TEAM = 'ethikslabs';
const AUD = '364a83405731fd02c728a58d12afcc80725934a20f553b6d38040a3df4f32525';
const ISS = `https://${TEAM}.cloudflareaccess.com`;

let privateKey;
async function mint(claims, { aud = AUD, iss = ISS } = {}) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
    .setIssuer(iss).setAudience(aud).setIssuedAt().setExpirationTime('1h')
    .sign(privateKey);
}
function fakeReply() {
  return { code: 200, body: null, status(c) { this.code = c; return this; }, send(b) { this.body = b; return this; } };
}
function req(headers) { return { headers, log: { warn() {} } }; }

beforeEach(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  const jwk = await exportJWK(pair.publicKey);
  _setCfAccessJwksForTests(createLocalJWKSet({ keys: [{ ...jwk, kid: 'test-kid', alg: 'RS256', use: 'sig' }] }));
  process.env.CF_ACCESS_TEAM_DOMAIN = TEAM;
  process.env.CF_ACCESS_AUD = AUD;
});
afterEach(() => {
  _resetVerifierForTests();
  delete process.env.CF_ACCESS_TEAM_DOMAIN;
  delete process.env.CF_ACCESS_AUD;
});

describe('requireAuth via Cloudflare Access', () => {
  it('ignores the header when CF_ACCESS_* is not configured (fail-closed)', async () => {
    delete process.env.CF_ACCESS_AUD;
    const token = await mint({ email: 'john@ethiks360.com' });
    const reply = fakeReply();
    const r = req({ 'cf-access-jwt-assertion': token });
    await requireAuth(r, reply);
    expect(reply.code).toBe(401);
    expect(reply.body).toEqual({ error: 'auth_required' });
    expect(r.authUser).toBeUndefined();
  });

  it('accepts a signed token for the console AUD and keys the founder on the email', async () => {
    const token = await mint({ email: 'John@ethiks360.com', name: 'John' });
    const reply = fakeReply();
    const r = req({ 'cf-access-jwt-assertion': token });
    const out = await requireAuth(r, reply);
    expect(out).toBeUndefined();
    expect(reply.code).toBe(200);
    expect(r.authUser).toMatchObject({ sub: 'cf-access|john@ethiks360.com', email: 'John@ethiks360.com', name: 'John' });
  });

  it('refuses a token minted for a different Access application', async () => {
    const token = await mint({ email: 'john@ethiks360.com' }, { aud: 'some-other-app' });
    const reply = fakeReply();
    const r = req({ 'cf-access-jwt-assertion': token });
    await requireAuth(r, reply);
    expect(reply.code).toBe(401);
    expect(reply.body).toEqual({ error: 'invalid_token' });
    expect(r.authUser).toBeUndefined();
  });

  it('refuses a token with no email (service tokens are not a founder)', async () => {
    const token = await mint({ common_name: 'svc-token' });
    const reply = fakeReply();
    const r = req({ 'cf-access-jwt-assertion': token });
    await requireAuth(r, reply);
    expect(reply.code).toBe(401);
    expect(reply.body).toEqual({ error: 'invalid_token' });
  });

  it('a Bearer token still takes precedence over the Access header', async () => {
    const { _setVerifierForTests } = await import('../../src/lib/auth.js');
    _setVerifierForTests(async () => ({ sub: 'auth0|abc', email: 'a@b.c', name: null, raw: {} }));
    const token = await mint({ email: 'john@ethiks360.com' });
    const reply = fakeReply();
    const r = req({ authorization: 'Bearer x.y.z', 'cf-access-jwt-assertion': token });
    await requireAuth(r, reply);
    expect(reply.code).toBe(200);
    expect(r.authUser.sub).toBe('auth0|abc');
  });
});
