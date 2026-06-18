import { describe, it, expect } from 'vitest';
import { selectJourneyGate, demoAuth } from '../../src/handlers/journey.js';
import { requireAuth } from '../../src/lib/auth.js';

describe('selectJourneyGate (fail-closed demo gate)', () => {
  it('returns demoAuth only when DEMO_FOUNDER_MODE is exactly "true"', () => {
    expect(selectJourneyGate({ DEMO_FOUNDER_MODE: 'true' })).toBe(demoAuth);
  });
  it('falls back to requireAuth when the flag is unset', () => {
    expect(selectJourneyGate({})).toBe(requireAuth);
  });
  it('falls back to requireAuth for any non-"true" value (fail-closed)', () => {
    for (const v of ['false', 'TRUE', '1', 'yes', ' true', 'true ', undefined, null]) {
      expect(selectJourneyGate({ DEMO_FOUNDER_MODE: v })).toBe(requireAuth);
    }
  });
});
