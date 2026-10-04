const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Server-side Turnstile verification — the widget token means nothing until CF's
// siteverify confirms it with the account secret. Default-deny throughout: a missing
// secret is a loud config fault (503), never a pass-through; only a strict
// `success === true` from Cloudflare verifies.
//
// Reusable so any write door (the siteverify route, /notify) requires the same proof.
// Returns a verdict { ok, status, error?, codes? } — the caller decides the HTTP shape.
export async function verifyTurnstileToken({ token, secret = process.env.TURNSTILE_SECRET, remoteip, fetchImpl = fetch } = {}) {
  if (typeof secret !== 'string' || !secret.trim()) {
    return { ok: false, status: 503, error: 'turnstile_not_configured' };
  }
  if (typeof token !== 'string' || !token.trim()) {
    return { ok: false, status: 400, error: 'token_required' };
  }
  let data;
  try {
    const params = new URLSearchParams({ secret, response: token });
    if (remoteip) params.set('remoteip', remoteip);
    const res = await fetchImpl(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) return { ok: false, status: 502, error: 'siteverify_unreachable' };
    data = await res.json();
  } catch {
    return { ok: false, status: 502, error: 'siteverify_unreachable' };
  }
  if (data.success === true) return { ok: true, status: 200 };
  return {
    ok: false,
    status: 403,
    error: 'verification_failed',
    codes: Array.isArray(data['error-codes']) ? data['error-codes'] : [],
  };
}

export function createTurnstileVerifyHandler({
  secret = process.env.TURNSTILE_SECRET,
  fetchImpl = fetch,
} = {}) {
  return async function turnstileVerifyHandler(request, reply) {
    const v = await verifyTurnstileToken({ token: request.body?.token, secret, remoteip: request.ip, fetchImpl });
    const body = v.ok ? { ok: true } : { ok: false, error: v.error, ...(v.codes ? { codes: v.codes } : {}) };
    return reply.code(v.status).send(body);
  };
}
