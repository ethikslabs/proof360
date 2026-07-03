const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Server-side Turnstile verification — the widget token means nothing until CF's
// siteverify confirms it with the account secret. Default-deny throughout: a missing
// secret is a loud config fault (503), never a pass-through; only a strict
// `success === true` from Cloudflare verifies.
export function createTurnstileVerifyHandler({
  secret = process.env.TURNSTILE_SECRET,
  fetchImpl = fetch,
} = {}) {
  return async function turnstileVerifyHandler(request, reply) {
    if (typeof secret !== 'string' || !secret.trim()) {
      return reply.code(503).send({ ok: false, error: 'turnstile_not_configured' });
    }

    const token = request.body?.token;
    if (typeof token !== 'string' || !token.trim()) {
      return reply.code(400).send({ ok: false, error: 'token_required' });
    }

    let data;
    try {
      const params = new URLSearchParams({ secret, response: token });
      if (request.ip) params.set('remoteip', request.ip);
      const res = await fetchImpl(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      if (!res.ok) {
        return reply.code(502).send({ ok: false, error: 'siteverify_unreachable' });
      }
      data = await res.json();
    } catch {
      return reply.code(502).send({ ok: false, error: 'siteverify_unreachable' });
    }

    if (data.success === true) {
      return reply.code(200).send({ ok: true });
    }
    return reply.code(403).send({
      ok: false,
      error: 'verification_failed',
      codes: Array.isArray(data['error-codes']) ? data['error-codes'] : [],
    });
  };
}
