import { describe, it, expect } from 'vitest';
import { makeOAuthState, verifyOAuthState } from '../../src/utils/oauth-state.js';

// OAUTH-CSRF-NONCE-001: the OAuth `state` was a static constant ('google'/'auth0'), giving
// the implicit (token) flows no CSRF protection at all — a forged /portal/callback with an
// attacker's access_token was accepted. State must be a per-request single-use nonce that
// still carries the provider so the callback can route, and be verified before any token/code
// is trusted.
function storageStub(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
    has: (k) => m.has(k),
    size: () => m.size,
  };
}

describe('makeOAuthState', () => {
  it('returns "<provider>.<nonce>" and stores the pair', () => {
    const s = storageStub();
    const state = makeOAuthState('google', s, () => 'deadbeef');
    expect(state).toBe('google.deadbeef');
    expect(s.has('oauth_state')).toBe(true);
  });

  it('uses a crypto-random nonce by default (no injected fn)', () => {
    const s = storageStub();
    const a = makeOAuthState('auth0', s);
    const b = makeOAuthState('auth0', s);
    expect(a).not.toBe(b);              // two attempts -> two different nonces
    expect(a.startsWith('auth0.')).toBe(true);
    expect(a.length).toBeGreaterThan('auth0.'.length + 16); // real entropy, not a constant
  });
});

describe('verifyOAuthState', () => {
  it('accepts the exact state it issued and returns the provider', () => {
    const s = storageStub();
    const state = makeOAuthState('google', s, () => 'abc123');
    expect(verifyOAuthState(state, s)).toEqual({ ok: true, provider: 'google' });
  });

  it('rejects a forged nonce (right provider, wrong nonce)', () => {
    const s = storageStub();
    makeOAuthState('google', s, () => 'abc123');
    expect(verifyOAuthState('google.WRONG', s)).toEqual({ ok: false, provider: null });
  });

  it('rejects a mismatched provider prefix', () => {
    const s = storageStub();
    makeOAuthState('auth0', s, () => 'abc123');
    expect(verifyOAuthState('google.abc123', s)).toEqual({ ok: false, provider: null });
  });

  it('rejects when nothing was ever issued (no stored state)', () => {
    expect(verifyOAuthState('google.abc123', storageStub())).toEqual({ ok: false, provider: null });
  });

  it('rejects a null / empty / malformed returned state', () => {
    const s = storageStub();
    makeOAuthState('google', s, () => 'abc123');
    expect(verifyOAuthState(null, s).ok).toBe(false);
  });

  it('rejects a state with no provider delimiter', () => {
    const s = storageStub();
    makeOAuthState('google', s, () => 'abc123');
    expect(verifyOAuthState('googleabc123', s).ok).toBe(false);
  });

  it('is single-use — the stored nonce is consumed even on success', () => {
    const s = storageStub();
    const state = makeOAuthState('google', s, () => 'abc123');
    expect(verifyOAuthState(state, s).ok).toBe(true);
    expect(s.has('oauth_state')).toBe(false);          // consumed
    expect(verifyOAuthState(state, s).ok).toBe(false); // replay fails
  });

  it('consumes the stored nonce even on a failed verify (no lingering state to replay)', () => {
    const s = storageStub();
    makeOAuthState('google', s, () => 'abc123');
    verifyOAuthState('google.WRONG', s);
    expect(s.has('oauth_state')).toBe(false);
  });
});
