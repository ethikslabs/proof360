import { describe, it, expect } from 'vitest';
import { isBlockedIp, assertPublicHost, SsrfBlockedError } from '../../src/services/ssrf-guard.js';

describe('isBlockedIp (IP classification — pure)', () => {
  it('blocks loopback', () => {
    for (const ip of ['127.0.0.1', '127.1.2.3', '::1']) expect(isBlockedIp(ip), ip).toBe(true);
  });
  it('blocks the cloud metadata + link-local range', () => {
    for (const ip of ['169.254.169.254', '169.254.0.1', 'fe80::1']) expect(isBlockedIp(ip), ip).toBe(true);
  });
  it('blocks RFC1918 private ranges', () => {
    for (const ip of ['10.0.0.5', '10.255.255.255', '172.16.0.1', '172.31.255.1', '192.168.1.1']) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });
  it('does NOT block the public edges just outside private ranges', () => {
    for (const ip of ['172.15.255.255', '172.32.0.1', '11.0.0.1', '192.167.255.255', '192.169.0.1']) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });
  it('blocks CGNAT, unspecified, and IPv6 unique-local', () => {
    for (const ip of ['100.64.0.1', '100.127.255.255', '0.0.0.0', '::', 'fc00::1', 'fd12:3456::1']) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });
  it('allows ordinary public addresses', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '13.55.1.1', '2606:4700:4700::1111']) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });
  it('blocks IPv4-mapped IPv6 that wraps a private address', () => {
    for (const ip of ['::ffff:127.0.0.1', '::ffff:169.254.169.254', '::ffff:10.0.0.1']) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });
});

describe('assertPublicHost (resolve + classify, fail-closed)', () => {
  const resolverThatReturns = (addrs) => async () =>
    addrs.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));

  it('rejects a hostname that resolves to a blocked address', async () => {
    await expect(assertPublicHost('metadata.evil.test', { resolver: resolverThatReturns(['169.254.169.254']) }))
      .rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it('rejects when ANY resolved address is blocked (DNS returns mixed set)', async () => {
    await expect(assertPublicHost('mixed.test', { resolver: resolverThatReturns(['8.8.8.8', '10.0.0.1']) }))
      .rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it('rejects a literal blocked IP without resolving', async () => {
    let called = false;
    const spy = async () => { called = true; return []; };
    await expect(assertPublicHost('127.0.0.1', { resolver: spy })).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(assertPublicHost('169.254.169.254', { resolver: spy })).rejects.toBeInstanceOf(SsrfBlockedError);
    expect(called).toBe(false);
  });

  it('rejects the bare hostname "localhost" without a network call', async () => {
    const spy = async () => { throw new Error('resolver should not be called'); };
    await expect(assertPublicHost('localhost', { resolver: spy })).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it('fails closed when resolution throws (host unresolvable = not provably public)', async () => {
    const throwing = async () => { throw new Error('ENOTFOUND'); };
    await expect(assertPublicHost('nope.invalid', { resolver: throwing })).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it('fails closed on empty/garbage hostnames', async () => {
    const spy = async () => [];
    for (const h of ['', '   ', null, undefined]) {
      await expect(assertPublicHost(h, { resolver: spy }), String(h)).rejects.toBeInstanceOf(SsrfBlockedError);
    }
  });

  it('resolves clean for a public host and returns the checked addresses', async () => {
    const res = await assertPublicHost('example.com', { resolver: resolverThatReturns(['93.184.216.34']) });
    expect(res).toEqual(['93.184.216.34']);
  });
});
