// Tokens in the read (John ruling 2026-09-13, R7): every provider call a read makes is tallied on
// the session, per act, tokens only — no cost, no price table here. Numbers about what we did,
// never about the company.
import { describe, it, expect, beforeEach } from 'vitest';
import { createSession, getSession, updateSession } from '../../src/services/session-store.js';
import { tallyUsage, usageSummary, actTokens, sumUsage, usageEvent } from '../../src/services/session-usage.js';

describe('session-usage', () => {
  let sid;
  beforeEach(() => {
    sid = createSession({ website_url: 'https://acme.com' }).id;
  });

  it('usageEvent normalises heterogeneous fields and never produces NaN', () => {
    expect(usageEvent({ provider: 'bedrock', model: 'm', act: 'correlate', in: '120', out: 30 })).toMatchObject({ provider: 'bedrock', model: 'm', act: 'correlate', in: 120, out: 30 });
    expect(usageEvent({ in: 'x', out: -5 })).toMatchObject({ in: 0, out: 0, provider: 'unknown', model: 'unknown', act: null });
    expect(typeof usageEvent({}).at).toBe('string');
  });

  it('tallies calls on the session, per act, and summarises tokens only', () => {
    tallyUsage(sid, { provider: 'bedrock', model: 'nova-lite', act: 'correlate', in: 900, out: 300 });
    tallyUsage(sid, { provider: 'perplexity', model: 'sonar', act: 'research', in: 80, out: 350 });
    tallyUsage(sid, { provider: 'gemini', model: 'gemini-2.5-flash', act: 'research', in: 70, out: 300 });
    tallyUsage(sid, { provider: 'bedrock', model: 'haiku', act: 'reading', in: 1500, out: 200 });
    const s = usageSummary(getSession(sid));
    expect(s.calls).toBe(4);
    expect(s.tokens).toEqual({ in: 2550, out: 1150, total: 3700 });
    expect(s.by_provider.bedrock).toEqual({ calls: 2, in: 2400, out: 500, total: 2900 });
    expect(s.by_act.research).toEqual({ calls: 2, in: 150, out: 650, total: 800 });
    expect(actTokens(getSession(sid), 'reading')).toEqual({ in: 1500, out: 200, total: 1700, calls: 1 });
    expect(actTokens(getSession(sid), 'nothing')).toBeNull();
    // no price anywhere in the summary
    expect(JSON.stringify(s)).not.toMatch(/cost|usd|price/i);
  });

  it('is silent and safe for an unknown session or bad input', () => {
    expect(tallyUsage('not-a-session', { in: 1, out: 1 })).toBeNull();
    expect(tallyUsage(null, { in: 1, out: 1 })).toBeNull();
    expect(usageSummary(null)).toEqual({ calls: 0, tokens: { in: 0, out: 0, total: 0 }, by_provider: {}, by_act: {} });
    expect(usageSummary({ usage_events: 'garbage' }).calls).toBe(0);
  });

  it('caps the per-session event list', () => {
    for (let i = 0; i < 230; i++) tallyUsage(sid, { provider: 'bedrock', model: 'm', act: 'chat', in: 1, out: 1 });
    expect(getSession(sid).usage_events.length).toBe(200);
  });

  it('sums across sessions for the account total', () => {
    const sid2 = createSession({ website_url: 'https://beta.com' }).id;
    tallyUsage(sid, { provider: 'bedrock', model: 'm', act: 'chat', in: 10, out: 5 });
    tallyUsage(sid2, { provider: 'bedrock', model: 'm', act: 'chat', in: 20, out: 5 });
    updateSession(sid2, {});
    const total = sumUsage([getSession(sid), getSession(sid2), null]);
    expect(total).toEqual({ sessions: 3, calls: 2, tokens: { in: 30, out: 10, total: 40 } });
  });
});
