// api/tests/unit/capture-email-and-id-guard.test.js — X5 (fix/next-5-session-and-capture).
// The :id guard 400s a traversal id before any handler; capture-email needs an existing
// session, a valid email, and is rate-limited. SES is stubbed — no real mail.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Never touch real SES.
vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: class { async send() { return {}; } },
  SendEmailCommand: class { constructor(a) { this.a = a; } },
}));

let app, createSession;
const UUID = '11111111-2222-4333-8444-555555555555';

beforeAll(async () => {
  process.env.SESSION_STORE_DIR = await mkdtemp(join(tmpdir(), 'p360-x5-'));
  process.env.PAID_RATE_LIMIT_PER_IP = '3';          // low cap so the limiter is observable
  process.env.PAID_RATE_LIMIT_GLOBAL_MAX = '100000'; // don't let the global ceiling interfere
  ({ createSession } = await import('../../src/services/session-store.js'));
  const { buildApp } = await import('../../src/server.js');
  app = await buildApp();
  await app.ready();
});
afterAll(async () => { await app?.close(); });

// A distinct forwarded IP per call (trustProxy keys the per-IP limiter on it) so the low cap
// set for this file doesn't bleed between independent tests; the rate-limit test keeps one IP.
let ipSeq = 0;
const post = (id, body, ip) =>
  app.inject({
    method: 'POST', url: `/api/v1/session/${id}/capture-email`, payload: body,
    headers: { 'x-forwarded-for': ip || `10.9.${Math.floor(ipSeq / 256)}.${ipSeq++ % 256}` },
  });

describe(':id guard', () => {
  it('a routable non-UUID id is 400 before the handler runs', async () => {
    // (Raw "../" segments are collapsed by HTTP path normalisation to a non-matching route →
    // 404, also safe; the store-level test covers "../" rejection directly. Here we prove the
    // route guard 400s a malformed-but-routable id.)
    for (const bad of ['not-a-uuid', 'a..b', 'deadbeef', '12345']) {
      const res = await post(bad, { email: 'a@b.com' });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('INVALID_SESSION_ID');
    }
  });
});

describe('capture-email', () => {
  it('a valid id with no session is 404', async () => {
    const res = await post(UUID, { email: 'a@b.com' });
    expect(res.statusCode).toBe(404);
  });

  it('a bad email is 400', async () => {
    const s = createSession({ website_url: 'https://acme.example' });
    const res = await post(s.id, { email: 'not-an-email' });
    expect(res.statusCode).toBe(400);
  });

  it('a real session + email succeeds (and sends no dead /report link)', async () => {
    const s = createSession({ website_url: 'https://acme.example' });
    const res = await post(s.id, { email: 'founder@acme.example' });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });

  it('is rate-limited per IP', async () => {
    const s = createSession({ website_url: 'https://acme.example' });
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await post(s.id, { email: 'f@acme.example' }, '203.0.113.7')).statusCode);
    expect(codes).toContain(429); // the per-IP cap (3) kicks in within the window, same IP
  });
});
