// Cloudflare's public always-pass TEST sitekey — dev convenience only. In production
// the sitekey is baked at build from SSM (/proof360/TURNSTILE_SITEKEY); an empty
// resolution is a config fault the UI must surface, never silently paper over
// (the ghost-tenant lesson: no invented fallbacks in prod).
export const CF_TEST_SITEKEY = '1x00000000000000000000AA';

export function resolveTurnstileSitekey({ key, isDev }) {
  const trimmed = typeof key === 'string' ? key.trim() : '';
  if (trimmed) return trimmed;
  return isDev ? CF_TEST_SITEKEY : '';
}

// The widget token is only a claim until the API's siteverify confirms it.
// Fail-closed: any transport error, non-OK response, or non-true `ok` is a false.
export async function verifyTurnstileServerSide(token, fetchImpl = fetch) {
  if (typeof token !== 'string' || !token.trim()) return false;
  try {
    const res = await fetchImpl('/api/v1/turnstile/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}
