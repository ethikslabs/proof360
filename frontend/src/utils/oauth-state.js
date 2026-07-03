// OAuth CSRF nonce (OAUTH-CSRF-NONCE-001).
//
// The `state` parameter was a static constant ('google' / 'microsoft' / 'auth0'), which for
// the implicit (response_type=token) flows meant NO CSRF protection — a forged
// /portal/callback carrying an attacker's access_token was accepted verbatim. State must be a
// per-request, single-use random nonce, verified before any token or code is trusted.
//
// The nonce still has to carry the provider (the callback routes on it), so the wire format is
// `<provider>.<nonce>`. The nonce is stored in the caller's storage (sessionStorage, which
// survives the OAuth redirect within the tab) and consumed on the first verify — success OR
// failure — so nothing lingers to replay.

const STORE_KEY = 'oauth_state';

function cryptoNonce() {
  const bytes = new Uint8Array(16);
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    // No CSPRNG available — fail closed rather than emit a guessable nonce. An empty nonce
    // makes verifyOAuthState reject, so a broken environment cannot silently drop CSRF cover.
    return '';
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Issue a fresh state, persist {provider, nonce}, and return the `<provider>.<nonce>` string
// to put on the authorize URL. nonceFn is injectable for tests.
export function makeOAuthState(provider, storage, nonceFn = cryptoNonce) {
  const nonce = nonceFn();
  storage.setItem(STORE_KEY, JSON.stringify({ provider, nonce }));
  return `${provider}.${nonce}`;
}

// Verify a returned state against the stored one. Always consumes the stored value (single
// use). Returns { ok, provider }: ok:true + the provider only on an exact match.
export function verifyOAuthState(returnedState, storage) {
  let stored = null;
  try {
    stored = JSON.parse(storage.getItem(STORE_KEY) || 'null');
  } catch {
    stored = null;
  }
  storage.removeItem(STORE_KEY); // consume unconditionally — no lingering nonce to replay

  if (!stored || !stored.nonce || typeof returnedState !== 'string') {
    return { ok: false, provider: null };
  }
  const dot = returnedState.indexOf('.');
  if (dot < 0) return { ok: false, provider: null };

  const provider = returnedState.slice(0, dot);
  const nonce = returnedState.slice(dot + 1);
  if (provider !== stored.provider || nonce !== stored.nonce) {
    return { ok: false, provider: null };
  }
  return { ok: true, provider };
}
