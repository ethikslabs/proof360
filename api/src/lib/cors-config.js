// CORS allowlist for the public API.
//
// proof360.au is public but holds no real data; the cost risk is a stranger's site
// driving the paid pipeline. `origin: true` reflected ANY origin, so a preflight from
// https://evil.example was answered with that origin. This narrows it to a configured
// allowlist, and keeps the cross-origin guest door (ethiks361-web's /proof360) working
// by adding its origin through CORS_ORIGINS in the deploy env — never by reflecting all.
//
// CORS_ORIGINS: comma-separated absolute origins (scheme + host [+ :port]), added to the
// default. In non-production, localhost dev origins are allowed so the Vite frontend works.

const DEFAULT_ORIGINS = ['https://proof360.au'];
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

/** The resolved set of allowed origins for this environment. */
export function resolveAllowedOrigins(env = process.env) {
  const set = new Set(DEFAULT_ORIGINS);
  if ((env.NODE_ENV || 'development') !== 'production') {
    for (const o of DEV_ORIGINS) set.add(o);
  }
  for (const raw of String(env.CORS_ORIGINS || '').split(',')) {
    const o = raw.trim();
    if (o) set.add(o);
  }
  return [...set];
}

/**
 * @fastify/cors options. The origin callback allows requests with no Origin header
 * (curl, server-to-server, same-origin navigations) and any origin on the allowlist;
 * everything else is denied — no Access-Control-Allow-Origin is sent, so a browser
 * blocks the cross-origin read.
 */
export function corsOptions(env = process.env) {
  const allowed = resolveAllowedOrigins(env);
  return {
    origin(origin, cb) {
      if (!origin || allowed.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: false,
  };
}
