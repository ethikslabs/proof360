import { describe, it, expect } from 'vitest';
import { socialProviderEnabled } from '../../src/utils/social-login.js';

// DEAD-SOCIAL-LOGIN-001: a Google/Microsoft login button may only render when its OAuth
// client id is actually baked into the build. Absent/blank -> the provider is unconfigured
// and the control must be HIDDEN, never shipped as a permanently-dead greyed-out button.
describe('socialProviderEnabled', () => {
  it('is false for an unset client id (empty string — the prod default)', () => {
    expect(socialProviderEnabled('')).toBe(false);
  });

  it('is false for whitespace-only, undefined, or null', () => {
    expect(socialProviderEnabled('   ')).toBe(false);
    expect(socialProviderEnabled(undefined)).toBe(false);
    expect(socialProviderEnabled(null)).toBe(false);
  });

  it('is true for a real client id', () => {
    expect(socialProviderEnabled('123-abc.apps.googleusercontent.com')).toBe(true);
  });
});
