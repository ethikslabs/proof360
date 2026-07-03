import { describe, it, expect } from 'vitest';
import { purgeStaleDemoAuth, DEMO_FOUNDER_EMAIL } from '../../src/api/auth.js';

// Minimal Storage stub — purgeStaleDemoAuth takes the storage explicitly so tests never
// touch the real localStorage.
function stub(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    removeItem: (k) => m.delete(k),
    has: (k) => m.has(k),
  };
}

describe('purgeStaleDemoAuth', () => {
  it('removes a leftover demo-founder auth record and reports it', () => {
    const s = stub({ founder_auth: JSON.stringify({ user: { name: 'Demo Founder', email: DEMO_FOUNDER_EMAIL } }) });
    expect(purgeStaleDemoAuth(s)).toBe(true);
    expect(s.has('founder_auth')).toBe(false);
  });

  it('leaves a real founder auth record alone', () => {
    const s = stub({ founder_auth: JSON.stringify({ user: { name: 'Jo Real', email: 'jo@realco.io' } }) });
    expect(purgeStaleDemoAuth(s)).toBe(false);
    expect(s.has('founder_auth')).toBe(true);
  });

  it('purges a corrupt record (unparseable JSON must not wedge the login page)', () => {
    const s = stub({ founder_auth: '{not json' });
    expect(purgeStaleDemoAuth(s)).toBe(true);
    expect(s.has('founder_auth')).toBe(false);
  });

  it('is a no-op when nothing is stored', () => {
    expect(purgeStaleDemoAuth(stub())).toBe(false);
  });
});
