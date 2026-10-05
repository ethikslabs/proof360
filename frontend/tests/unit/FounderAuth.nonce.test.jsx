import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { verifyOAuthState } from '../../src/utils/oauth-state.js';

// This env's global localStorage is non-functional (a stray --localstorage-file). Give the
// component real Map-backed storage; the nonce round-trips through this same sessionStorage.
function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
  };
}

// N3 step 1: FounderAuth sent state:'auth0' (static), which the callback's
// verifyOAuthState (OAUTH-CSRF-NONCE-001) always rejects — so founder login silently
// failed at /portal/callback. It must now send a per-request <provider>.<nonce> state,
// the same as Portal.jsx, which the callback accepts.
describe('FounderAuth sends a CSRF nonce state the callback accepts', () => {
  let sess;
  beforeEach(() => {
    sess = memStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: memStorage(), configurable: true, writable: true });
    Object.defineProperty(globalThis, 'sessionStorage', { value: sess, configurable: true, writable: true });
    vi.resetModules();
    vi.stubEnv('VITE_AUTH0_DOMAIN', 'test.auth0.com');
    vi.stubEnv('VITE_AUTH0_CLIENT_ID', 'client-123');
  });

  it('puts <provider>.<nonce> on the authorize URL, not the static "auth0"', async () => {
    const loc = { origin: 'https://proof360.au', href: '' };
    Object.defineProperty(window, 'location', { value: loc, writable: true, configurable: true });

    const { default: FounderAuth } = await import('../../src/pages/FounderAuth.jsx');
    render(<MemoryRouter><FounderAuth /></MemoryRouter>);

    await userEvent.click(screen.getByRole('button', { name: /Continue with Auth0/i }));
    await waitFor(() => expect(loc.href).toContain('/authorize'));

    expect(loc.href).toContain('https://test.auth0.com/authorize');
    const state = new URL(loc.href).searchParams.get('state');
    expect(state).not.toBe('auth0');
    expect(state.startsWith('auth0.')).toBe(true);
    // The callback trusts exactly this state (single use).
    expect(verifyOAuthState(state, sessionStorage)).toEqual({ ok: true, provider: 'auth0' });
  });
});
