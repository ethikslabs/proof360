// Rate limiting for the paid, unauthenticated routes.
//
// proof360.au is public and these routes spend money (Postgres, Firecrawl, Bedrock,
// Perplexity) with no auth. Two ceilings, both enforced in onRequest BEFORE any handler
// body runs, so a throttled request costs nothing downstream:
//   - per-IP   (@fastify/rate-limit, keyed on the real client IP via trustProxy)
//   - global   (this module: one fixed-window counter across ALL IPs, so a botnet that
//               spreads load over many IPs still can't exceed a whole-service ceiling)
//
// Both limits are env-tunable. Defaults are generous enough for a human doing several
// reads, tight enough that a script can't run the bill up.

export const PAID_ROUTES = [
  { method: 'POST', re: /^\/api\/v1\/session\/start\/?$/ },
  { method: 'POST', re: /^\/api\/v1\/firehose\/?$/ },
  { method: 'POST', re: /^\/api\/v1\/chat\/?$/ },
  { method: 'POST', re: /^\/api\/v1\/session\/[^/]+\/chat\/?$/ },
  { method: 'POST', re: /^\/api\/v1\/session\/[^/]+\/analyze\/?$/ },
  { method: 'GET', re: /^\/api\/v1\/session\/[^/]+\/followups\/?$/ },
];

const int = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};

export function rateLimitSettings(env = process.env) {
  return {
    perIpMax: int(env.PAID_RATE_LIMIT_PER_IP, 30),
    timeWindow: env.PAID_RATE_LIMIT_TIME_WINDOW || '1 minute',
    globalMax: int(env.PAID_RATE_LIMIT_GLOBAL_MAX, 600),
    globalWindowMs: int(env.PAID_RATE_LIMIT_GLOBAL_WINDOW_MS, 60_000),
  };
}

/** Per-route config for @fastify/rate-limit (per-IP). Attach as `config: { rateLimit }`. */
export function perIpRateLimit(env = process.env) {
  const { perIpMax, timeWindow } = rateLimitSettings(env);
  return { max: perIpMax, timeWindow };
}

/** True when (method, pathname) is one of the paid routes the ceilings protect. */
export function isPaidRoute(method, pathname) {
  const path = String(pathname || '').split('?')[0];
  return PAID_ROUTES.some((r) => r.method === method && r.re.test(path));
}

/**
 * The global ceiling as a Fastify onRequest hook. Fixed window, in-memory — matches the
 * single-fork deployment (ecosystem.config.cjs: exec_mode fork, instances 1). `now` is
 * injectable for tests.
 */
export function createGlobalCap(env = process.env, now = () => Date.now()) {
  const { globalMax, globalWindowMs } = rateLimitSettings(env);
  let windowStart = now();
  let count = 0;

  async function hook(request, reply) {
    if (!isPaidRoute(request.method, request.url)) return;
    const t = now();
    if (t - windowStart >= globalWindowMs) {
      windowStart = t;
      count = 0;
    }
    count += 1;
    if (count > globalMax) {
      return reply.code(429).send({
        error: 'Service is busy. Try again shortly.',
        code: 'RATE_LIMITED_GLOBAL',
      });
    }
  }

  hook._state = () => ({ windowStart, count });
  return hook;
}
