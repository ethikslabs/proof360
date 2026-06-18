import { createRemoteJWKSet, jwtVerify } from 'jose';

let jwks;
let verifierOverride = null;

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

function bearerToken(header) {
  const match = String(header || '').match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

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
    email: payload.email || null,
    name: payload.name || payload.nickname || null,
    raw: payload,
  };
}

export async function requireAuth(request, reply) {
  const token = bearerToken(request.headers.authorization);
  if (!token) {
    return reply.status(401).send({ error: 'auth_required' });
  }

  try {
    request.authUser = await verifyAccessToken(token);
  } catch (err) {
    request.log?.warn?.({ err }, 'auth verification failed');
    const status = err.code === 'AUTH0_NOT_CONFIGURED' ? 500 : 401;
    return reply.status(status).send({ error: status === 500 ? 'auth_not_configured' : 'invalid_token' });
  }
}

export function _setVerifierForTests(fn) {
  verifierOverride = fn;
}

export function _resetVerifierForTests() {
  verifierOverride = null;
  jwks = null;
}
