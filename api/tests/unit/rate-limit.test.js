import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { isPaidRoute, perIpRateLimit, createGlobalCap } from '../../src/lib/rate-limit.js';

describe('paid-route classification', () => {
  it('matches the six paid routes and nothing adjacent', () => {
    expect(isPaidRoute('POST', '/api/v1/session/start')).toBe(true);
    expect(isPaidRoute('POST', '/api/v1/firehose')).toBe(true);
    expect(isPaidRoute('POST', '/api/v1/chat')).toBe(true);
    expect(isPaidRoute('POST', '/api/v1/session/abc-123/chat')).toBe(true);
    expect(isPaidRoute('POST', '/api/v1/session/abc-123/analyze')).toBe(true);
    expect(isPaidRoute('GET', '/api/v1/session/abc-123/followups')).toBe(true);
    // query string tolerated
    expect(isPaidRoute('POST', '/api/v1/chat?x=1')).toBe(true);
    // NOT the adjacent read routes
    expect(isPaidRoute('GET', '/api/v1/session/abc-123/chat/history')).toBe(false);
    expect(isPaidRoute('GET', '/api/v1/session/abc-123/record')).toBe(false);
    expect(isPaidRoute('GET', '/health')).toBe(false);
  });
});

describe('global ceiling (createGlobalCap)', () => {
  it('429s a paid route once the global max is exceeded, within the window', async () => {
    let t = 0;
    const cap = createGlobalCap({ PAID_RATE_LIMIT_GLOBAL_MAX: '2', PAID_RATE_LIMIT_GLOBAL_WINDOW_MS: '1000' }, () => t);
    const app = Fastify();
    let handlerCalls = 0;
    app.addHook('onRequest', cap);
    app.post('/api/v1/chat', async () => { handlerCalls += 1; return { ok: true }; });
    app.get('/health', async () => ({ ok: true }));

    const hit = () => app.inject({ method: 'POST', url: '/api/v1/chat' });
    expect((await hit()).statusCode).toBe(200);
    expect((await hit()).statusCode).toBe(200);
    const blocked = await hit();
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().code).toBe('RATE_LIMITED_GLOBAL');
    // the handler never ran for the blocked request — limit fired before the body
    expect(handlerCalls).toBe(2);

    // a non-paid route is unaffected even over the cap
    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);

    // window rolls over → allowed again
    t = 1001;
    expect((await hit()).statusCode).toBe(200);
    await app.close();
  });
});

describe('per-IP ceiling (@fastify/rate-limit as wired)', () => {
  it('429s after the per-IP max, before the handler runs', async () => {
    const app = Fastify({ trustProxy: true });
    await app.register(rateLimit, { global: false });
    let handlerCalls = 0;
    const paid = { config: { rateLimit: perIpRateLimit({ PAID_RATE_LIMIT_PER_IP: '3', PAID_RATE_LIMIT_TIME_WINDOW: '1 minute' }) } };
    app.post('/api/v1/chat', paid, async () => { handlerCalls += 1; return { ok: true }; });

    const hit = () => app.inject({ method: 'POST', url: '/api/v1/chat', headers: { 'x-forwarded-for': '203.0.113.9' } });
    for (let i = 0; i < 3; i++) expect((await hit()).statusCode).toBe(200);
    const blocked = await hit();
    expect(blocked.statusCode).toBe(429);
    expect(handlerCalls).toBe(3); // 4th request blocked before the handler

    // a different IP is independent
    const other = await app.inject({ method: 'POST', url: '/api/v1/chat', headers: { 'x-forwarded-for': '198.51.100.7' } });
    expect(other.statusCode).toBe(200);
    await app.close();
  });
});
