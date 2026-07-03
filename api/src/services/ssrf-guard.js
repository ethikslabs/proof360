// SSRF guard for the recon pipeline. proof360's cold-read takes a user-supplied
// website URL on an UNAUTHENTICATED endpoint and fans it out to DNS/HTTP/port
// recon. Without this, `http://169.254.169.254` (cloud metadata), `localhost`,
// or `10.x` turns the box into a scanner of its own VPC. Every recon target must
// clear assertPublicHost() first; anything not provably public fails closed.

import dns from 'node:dns';

const lookupAll = (hostname) =>
  dns.promises.lookup(hostname, { all: true, verbatim: true });

export class SsrfBlockedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SsrfBlockedError';
    this.code = 'SSRF_BLOCKED';
  }
}

function ipv4ToInt(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const o = Number(p);
    if (!Number.isInteger(o) || o < 0 || o > 255 || !/^\d+$/.test(p)) return null;
    n = n * 256 + o;
  }
  return n >>> 0;
}

function ipv4InCidr(intIp, base, bits) {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (intIp & mask) === (ipv4ToInt(base) & mask);
}

function isBlockedIpv4(ip) {
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  return (
    ipv4InCidr(n, '0.0.0.0', 8) ||        // "this" network / unspecified
    ipv4InCidr(n, '10.0.0.0', 8) ||       // RFC1918
    ipv4InCidr(n, '100.64.0.0', 10) ||    // CGNAT
    ipv4InCidr(n, '127.0.0.0', 8) ||      // loopback
    ipv4InCidr(n, '169.254.0.0', 16) ||   // link-local incl. cloud metadata
    ipv4InCidr(n, '172.16.0.0', 12) ||    // RFC1918
    ipv4InCidr(n, '192.0.0.0', 24) ||     // IETF protocol assignments
    ipv4InCidr(n, '192.168.0.0', 16) ||   // RFC1918
    ipv4InCidr(n, '198.18.0.0', 15) ||    // benchmarking
    ipv4InCidr(n, '224.0.0.0', 4) ||      // multicast
    ipv4InCidr(n, '240.0.0.0', 4)         // reserved
  );
}

export function isBlockedIp(ip) {
  if (typeof ip !== 'string' || !ip.trim()) return false;
  let addr = ip.trim().toLowerCase();

  // Strip an IPv6 zone id (fe80::1%eth0) and brackets.
  addr = addr.replace(/^\[|\]$/g, '').split('%')[0];

  if (addr.includes(':')) {
    // IPv4-mapped/embedded IPv6 (::ffff:127.0.0.1) — classify the wrapped v4.
    const v4 = addr.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (v4 && (addr.startsWith('::ffff:') || addr.startsWith('::'))) {
      return isBlockedIpv4(v4[1]);
    }
    if (addr === '::' || addr === '::1') return true;      // unspecified / loopback
    if (addr.startsWith('fe80') || addr.startsWith('fe9') ||
        addr.startsWith('fea') || addr.startsWith('feb')) return true; // link-local fe80::/10
    if (addr.startsWith('fc') || addr.startsWith('fd')) return true;   // unique-local fc00::/7
    if (addr.startsWith('ff')) return true;                // multicast
    return false;
  }
  return isBlockedIpv4(addr);
}

// Hostnames that must never resolve outward.
const BLOCKED_HOSTNAMES = new Set(['localhost', 'localhost.localdomain', 'ip6-localhost']);

export async function assertPublicHost(hostname, { resolver = lookupAll } = {}) {
  if (typeof hostname !== 'string' || !hostname.trim()) {
    throw new SsrfBlockedError('empty hostname');
  }
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');

  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith('.localhost')) {
    throw new SsrfBlockedError(`blocked hostname: ${host}`);
  }

  // A literal IP is classified directly — never handed to the resolver.
  const looksLikeIp = /^[0-9.]+$/.test(host) || host.includes(':');
  if (looksLikeIp) {
    if (isBlockedIp(host)) throw new SsrfBlockedError(`blocked literal IP: ${host}`);
    return [host];
  }

  let records;
  try {
    records = await resolver(host);
  } catch (err) {
    throw new SsrfBlockedError(`unresolvable host (fail-closed): ${host} — ${err.message}`);
  }
  const addresses = (records || []).map((r) => (typeof r === 'string' ? r : r.address)).filter(Boolean);
  if (addresses.length === 0) {
    throw new SsrfBlockedError(`host resolved to no addresses: ${host}`);
  }
  for (const address of addresses) {
    if (isBlockedIp(address)) {
      throw new SsrfBlockedError(`host ${host} resolves to blocked address ${address}`);
    }
  }
  return addresses;
}
