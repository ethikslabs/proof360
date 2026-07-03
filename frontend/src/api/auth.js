// No hardcoded tenant fallbacks: the old defaults pointed at dev-ethikslabs.au.auth0.com,
// a tenant that never existed (Auth0 edge answers "Unknown host"). Config comes from the
// build env (deploy.yml resolves it from SSM); an unset domain renders the login page's
// loud config-fault state instead of a broken redirect.
const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN || '';
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || '';
export const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE || 'https://api.proof360.au';

const TOKEN_KEY = 'founder_tokens';

// The retired demo-bypass identity. A founder_auth record carrying it is ghost state from
// the demo era — it short-circuits the login page into the old mock dashboard. Purged on
// login-page load in production builds (the bypass itself is dev-only now).
export const DEMO_FOUNDER_EMAIL = 'demo@startup.com';

export function purgeStaleDemoAuth(storage) {
  const raw = storage.getItem('founder_auth');
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.user?.email === DEMO_FOUNDER_EMAIL) {
      storage.removeItem('founder_auth');
      return true;
    }
    return false;
  } catch {
    storage.removeItem('founder_auth');
    return true;
  }
}

function now() {
  return Date.now();
}

export function storeTokens(tokens) {
  if (!tokens?.access_token) return;
  const expiresIn = Number(tokens.expires_in ?? 0);
  const expiresAt = expiresIn > 0 ? now() + expiresIn * 1000 : now();
  localStorage.setItem(TOKEN_KEY, JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expires_at: expiresAt,
  }));
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function getAccessToken() {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;

  let tokenState;
  try {
    tokenState = JSON.parse(raw);
  } catch {
    clearTokens();
    return null;
  }

  if (tokenState.access_token && tokenState.expires_at - 30_000 > now()) {
    return tokenState.access_token;
  }

  if (!tokenState.refresh_token) {
    clearTokens();
    return null;
  }

  const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: AUTH0_CLIENT_ID,
      refresh_token: tokenState.refresh_token,
    }),
  });

  if (!res.ok) {
    clearTokens();
    return null;
  }

  const next = await res.json();
  storeTokens({
    ...next,
    refresh_token: next.refresh_token ?? tokenState.refresh_token,
  });
  return next.access_token ?? null;
}
