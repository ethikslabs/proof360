import { describe, it, expect, beforeEach } from 'vitest';
import * as spine from '../../src/api/spine.js';

// This env's global localStorage is non-functional (a stray --localstorage-file). Give
// spine real Map-backed storage so the round-trip is deterministic.
function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
  };
}

// N3 step 3: Chat.jsx's cold-read failure log used spine.sessionId — a property that does
// not exist, so it was always undefined and every failure log carried session_id:null. The
// real value is spine.storedSessionId(). This pins that the value is real.
describe('spine session id for the cold-read failure log', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: memStorage(), configurable: true, writable: true });
    Object.defineProperty(globalThis, 'sessionStorage', { value: memStorage(), configurable: true, writable: true });
  });

  it('storedSessionId() returns the remembered id (what the failure log now records)', () => {
    spine.rememberSessionId('sess-xyz');
    expect(spine.storedSessionId()).toBe('sess-xyz');
  });

  it('has no bare `sessionId` export — the old log value was always undefined', () => {
    expect(spine.sessionId).toBeUndefined();
  });
});
