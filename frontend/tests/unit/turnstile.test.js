import { describe, it, expect, vi } from 'vitest';
import { resolveTurnstileSitekey, verifyTurnstileServerSide, CF_TEST_SITEKEY } from '../../src/utils/turnstile.js';

describe('resolveTurnstileSitekey (no ghost fallbacks in prod)', () => {
  it('uses the build-injected sitekey when present', () => {
    expect(resolveTurnstileSitekey({ key: '0x4AAAAAADvAsgzBgYeIJXvk', isDev: false }))
      .toBe('0x4AAAAAADvAsgzBgYeIJXvk');
  });

  it('falls back to the CF always-pass TEST sitekey in dev only', () => {
    expect(resolveTurnstileSitekey({ key: undefined, isDev: true })).toBe(CF_TEST_SITEKEY);
    expect(resolveTurnstileSitekey({ key: '', isDev: true })).toBe(CF_TEST_SITEKEY);
  });

  it('returns empty string in prod when no key was baked — config fault, never the test key', () => {
    for (const key of [undefined, null, '', '   ']) {
      expect(resolveTurnstileSitekey({ key, isDev: false })).toBe('');
    }
  });
});

describe('verifyTurnstileServerSide (server is the verifier)', () => {
  function fetchWith(body, { ok = true } = {}) {
    return vi.fn(async () => ({ ok, json: async () => body }));
  }

  it('true ONLY when the API answers ok === true', async () => {
    const f = fetchWith({ ok: true });
    await expect(verifyTurnstileServerSide('tok', f)).resolves.toBe(true);
    const [url, opts] = f.mock.calls[0];
    expect(url).toBe('/api/v1/turnstile/verify');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ token: 'tok' });
  });

  it('false for any non-true ok, non-OK response, or network failure (fail-closed)', async () => {
    await expect(verifyTurnstileServerSide('tok', fetchWith({ ok: 'true' }))).resolves.toBe(false);
    await expect(verifyTurnstileServerSide('tok', fetchWith({ ok: 1 }))).resolves.toBe(false);
    await expect(verifyTurnstileServerSide('tok', fetchWith({}, { ok: false }))).resolves.toBe(false);
    const throwing = vi.fn(async () => { throw new Error('down'); });
    await expect(verifyTurnstileServerSide('tok', throwing)).resolves.toBe(false);
  });

  it('false without calling the API when the token is empty', async () => {
    const f = fetchWith({ ok: true });
    await expect(verifyTurnstileServerSide('', f)).resolves.toBe(false);
    await expect(verifyTurnstileServerSide(null, f)).resolves.toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});
