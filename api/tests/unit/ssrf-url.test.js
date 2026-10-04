import { describe, it, expect } from 'vitest';
import {
  isObviouslyPrivateHost,
  assertPublicUrl,
  hostnameOf,
  SsrfBlockedError,
} from '../../src/services/ssrf-guard.js';

describe('hostnameOf', () => {
  it('pulls the host from a URL or a bare host', () => {
    expect(hostnameOf('https://acme.com.au/path')).toBe('acme.com.au');
    expect(hostnameOf('acme.com.au')).toBe('acme.com.au');
    expect(hostnameOf('http://169.254.169.254/latest/meta-data')).toBe('169.254.169.254');
  });
});

describe('isObviouslyPrivateHost (sync, no DNS)', () => {
  it('refuses literal metadata / loopback / RFC1918 and localhost', () => {
    expect(isObviouslyPrivateHost('http://169.254.169.254/')).toBe(true); // cloud metadata
    expect(isObviouslyPrivateHost('127.0.0.1')).toBe(true);               // loopback
    expect(isObviouslyPrivateHost('http://10.0.0.5')).toBe(true);         // RFC1918
    expect(isObviouslyPrivateHost('192.168.1.1')).toBe(true);
    expect(isObviouslyPrivateHost('172.16.5.5')).toBe(true);
    expect(isObviouslyPrivateHost('localhost')).toBe(true);
    expect(isObviouslyPrivateHost('foo.localhost')).toBe(true);
  });

  it('allows a normal public hostname (no DNS done here)', () => {
    expect(isObviouslyPrivateHost('acme.com.au')).toBe(false);
    expect(isObviouslyPrivateHost('https://proof360.au')).toBe(false);
    expect(isObviouslyPrivateHost('8.8.8.8')).toBe(false);
  });
});

describe('assertPublicUrl (resolves, fails closed)', () => {
  const resolveTo = (addr) => async () => [{ address: addr, family: addr.includes(':') ? 6 : 4 }];
  const timeout = async () => { throw new Error('ETIMEOUT'); };

  it('passes a host that resolves to a public address', async () => {
    await expect(assertPublicUrl('https://acme.com.au', { resolver: resolveTo('203.0.113.10') }))
      .resolves.toEqual(['203.0.113.10']);
  });

  it('blocks a literal metadata / loopback / RFC1918 IP', async () => {
    await expect(assertPublicUrl('http://169.254.169.254/')).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(assertPublicUrl('http://127.0.0.1/')).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(assertPublicUrl('http://10.1.2.3/')).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it('blocks DNS rebinding — a public host that resolves to a private address', async () => {
    await expect(assertPublicUrl('https://rebind.example', { resolver: resolveTo('169.254.169.254') }))
      .rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it('fails closed on a DNS timeout (unresolvable host)', async () => {
    await expect(assertPublicUrl('https://slow.example', { resolver: timeout }))
      .rejects.toBeInstanceOf(SsrfBlockedError);
  });
});
