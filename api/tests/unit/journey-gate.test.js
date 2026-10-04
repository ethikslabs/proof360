import { describe, it, expect } from 'vitest';
import { selectJourneyGate, demoAuth } from '../../src/handlers/journey.js';
import { requireAuth } from '../../src/lib/auth.js';

describe('selectJourneyGate — DEMO_FOUNDER_MODE is ignored in production', () => {
  it('uses the demo gate only when the flag is set AND not production', () => {
    expect(selectJourneyGate({ DEMO_FOUNDER_MODE: 'true', NODE_ENV: 'development' })).toBe(demoAuth);
    expect(selectJourneyGate({ DEMO_FOUNDER_MODE: 'true', NODE_ENV: undefined })).toBe(demoAuth);
  });

  it('falls back to requireAuth in production even with the flag set', () => {
    expect(selectJourneyGate({ DEMO_FOUNDER_MODE: 'true', NODE_ENV: 'production' })).toBe(requireAuth);
  });

  it('uses requireAuth whenever the flag is not exactly "true"', () => {
    expect(selectJourneyGate({ NODE_ENV: 'development' })).toBe(requireAuth);
    expect(selectJourneyGate({ DEMO_FOUNDER_MODE: 'false', NODE_ENV: 'development' })).toBe(requireAuth);
  });
});
