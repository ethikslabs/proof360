import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { resolveAllowedOrigins, corsOptions } from '../../src/lib/cors-config.js';

describe('CORS allowlist', () => {
  it('defaults to proof360.au and adds dev origins only outside production', () => {
    const prod = resolveAllowedOrigins({ NODE_ENV: 'production' });
    expect(prod).toContain('https://proof360.au');
    expect(prod).not.toContain('http://localhost:5173');

    const dev = resolveAllowedOrigins({ NODE_ENV: 'development' });
    expect(dev).toContain('http://localhost:5173');
  });

  it('adds extra origins from CORS_ORIGINS (the cross-origin guest door)', () => {
    const origins = resolveAllowedOrigins({
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://e361.ethikslabs.com, https://ethiks361.example',
    });
    expect(origins).toContain('https://e361.ethikslabs.com');
    expect(origins).toContain('https://ethiks361.example');
  });

  async function appWith(env) {
    const app = Fastify();
    await app.register(cors, corsOptions(env));
    app.get('/x', async () => ({ ok: true }));
    return app;
  }

  it('preflight from an allowed origin gets Access-Control-Allow-Origin', async () => {
    const app = await appWith({ NODE_ENV: 'production', CORS_ORIGINS: 'https://e361.ethikslabs.com' });
    for (const origin of ['https://proof360.au', 'https://e361.ethikslabs.com']) {
      const res = await app.inject({
        method: 'OPTIONS',
        url: '/x',
        headers: { origin, 'access-control-request-method': 'GET' },
      });
      expect(res.headers['access-control-allow-origin']).toBe(origin);
    }
    await app.close();
  });

  it('preflight from a disallowed origin gets NO Access-Control-Allow-Origin', async () => {
    const app = await appWith({ NODE_ENV: 'production' });
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/x',
      headers: { origin: 'https://evil.example', 'access-control-request-method': 'GET' },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    await app.close();
  });
});
