import { createRemoteJWKSet, jwtVerify } from 'jose';

let jwks;
let verifierOverride = null;

// Cloudflare Access as a second, verified identity (corpus-console, 2026-09-12). The console
// sits behind an Access app and has no Auth0 login; Cloudflare puts a signed JWT for the
// authenticated user in Cf-Access-Jwt-Assertion on every request that reaches the origin.
// Default-deny: the header is ignored unless BOTH CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD are
// set; the signature is verified against the team JWKS; issuer and audience must match; a token
// with no email (a service token) is refused. The founder is keyed on `cf-access|<email>`.
const CF_ACCESS_HEADER = 'cf-access-jwt-assertion';
let cfJwks;
let cfJwksOverride = null;

function normalizeDomain(domain) {
  if (!domain) return null;
  return domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function authConfig() {
  const domain = normalizeDomain(process.env.AUTH0_DOMAIN);
  const audience = process.env.AUTH0_AUDIENCE;
  if (!domain || !audience) {
    const err = new Error('auth0_not_configured');
    err.code = 'AUTH0_NOT_CONFIGURED';
    throw err;
  }
  return {
    domain,
    audience,
    issuer: `https://${domain}/`,
    jwksUrl: new URL(`https://${domain}/.well-known/jwks.json`),
  };
}

function cfAccessConfig(env = process.env) {
  const team = env.CF_ACCESS_TEAM_DOMAIN;
  const aud = env.CF_ACCESS_AUD;
  if (!team || !aud) return null;
  return {
    audience: aud,
    issuer: `https://${team}.cloudflareaccess.com`,
    jwksUrl: new URL(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`),
  };
}

export async function verifyCfAccessToken(token, env = process.env) {
  const config = cfAccessConfig(env);
  if (!config) {
    const err = new Error('cf_access_not_configured');
    err.code = 'CF_ACCESS_NOT_CONFIGURED';
    throw err;
  }
  const keys = cfJwksOverride || (cfJwks ||= createRemoteJWKSet(config.jwksUrl));
  const { payload } = await jwtVerify(token, keys, {
    issuer: config.issuer,
    audience: config.audience,
  });
  const email = typeof payload.email === 'string' && payload.email.trim() ? payload.email.trim() : null;
  if (!email) {
    const err = new Error('cf_access_no_email');
    err.code = 'CF_ACCESS_NO_EMAIL';
    throw err;
  }
  return {
    sub: `cf-access|${email.toLowerCase()}`,
    email,
    name: payload.name || null,
    raw: payload,
  };
}

function bearerToken(header) {
  const match = String(header || '').match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

// An access token for our API audience carries no email claim (Auth0 puts it in the ID
// token); the founder record used to take `payload.email || null` and so every Auth0
// founder was recorded without an email — which the mailbox door (registered founders
// only, 14 Sept) would then decline. When the token was granted the `email` scope, ask
// /userinfo once and remember the answer by sub. A failed lookup is null, never a refusal.
const userinfoCache = new Map(); // sub → { email, until }
const USERINFO_TTL_MS = 10 * 60 * 1000;
export async function resolveEmail({ payload, token, domain, fetchImpl = fetch, now = Date.now }) {
  if (typeof payload?.email === 'string' && payload.email.trim()) return payload.email.trim().toLowerCase();
  const scopes = String(payload?.scope || '').split(/\s+/);
  if (!scopes.includes('email') || !payload?.sub) return null;
  const hit = userinfoCache.get(payload.sub);
  if (hit && hit.until > now()) return hit.email;
  try {
    const res = await fetchImpl(`https://${domain}/userinfo`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const info = await res.json();
    const email = typeof info?.email === 'string' && info.email.trim() ? info.email.trim().toLowerCase() : null;
    if (email) userinfoCache.set(payload.sub, { email, until: now() + USERINFO_TTL_MS });
    return email;
  } catch {
    return null;
  }
}
export function _resetUserinfoCacheForTests() { userinfoCache.clear(); }

export async function verifyAccessToken(token) {
  if (verifierOverride) return verifierOverride(token);

  const config = authConfig();
  jwks ||= createRemoteJWKSet(config.jwksUrl);
  const { payload } = await jwtVerify(token, jwks, {
    issuer: config.issuer,
    audience: config.audience,
  });

  return {
    sub: payload.sub,
    email: await resolveEmail({ payload, token, domain: config.domain }),
    name: payload.name || payload.nickname || null,
    raw: payload,
  };
}

export async function requireAuth(request, reply) {
  const token = bearerToken(request.headers.authorization);
  const cfToken = cfAccessConfig() ? request.headers[CF_ACCESS_HEADER] : null;
  if (!token && !cfToken) {
    return reply.status(401).send({ error: 'auth_required' });
  }

  try {
    request.authUser = token ? await verifyAccessToken(token) : await verifyCfAccessToken(cfToken);
  } catch (err) {
    request.log?.warn?.({ err }, 'auth verification failed');
    const status = err.code === 'AUTH0_NOT_CONFIGURED' ? 500 : 401;
    return reply.status(status).send({ error: status === 500 ? 'auth_not_configured' : 'invalid_token' });
  }
}

export function _setVerifierForTests(fn) {
  verifierOverride = fn;
}

export function _setCfAccessJwksForTests(keys) {
  cfJwksOverride = keys;
}

export function _resetVerifierForTests() {
  verifierOverride = null;
  jwks = null;
  cfJwksOverride = null;
  cfJwks = null;
}
