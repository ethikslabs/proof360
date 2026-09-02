// The door check. John, 2026-09-02: "it should be before anything... we read it, check
// the site, and go 'that does not exist, did you mean something else, here is what could
// be close' — no reads, no searches, nothing."
//
// Reading congisys.co.uk (a typo) ran four corpus retrievals, a billed live-web search, a
// second research engine, an 11-signal correlation, an infrastructure probe and an LLM
// write — against a domain that does not exist. One DNS lookup answers it for free.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const resolve4 = vi.fn(); const resolveMx = vi.fn(); const resolveNs = vi.fn();
vi.mock('node:dns', () => ({
  promises: {
    resolve4: (...a) => resolve4(...a),
    resolveMx: (...a) => resolveMx(...a),
    resolveNs: (...a) => resolveNs(...a),
  },
}));

const {
  domainResolves, domainIsReal, nearbyLabels, splitDomain, nearbyDomains, preflight,
} = await import('../../src/services/domain-preflight.js');

const NX = () => Promise.reject(new Error('ENOTFOUND'));
const REAL = { a: ['1.2.3.4'], mx: [{ exchange: 'smtp.google.com' }], ns: ['ns1'] };

/** Only `live` hosts answer; everything else is NXDOMAIN. */
function dnsWorld(live = {}) {
  resolve4.mockImplementation((h) => (live[h] ? Promise.resolve(live[h].a) : NX()));
  resolveMx.mockImplementation((h) => (live[h] ? Promise.resolve(live[h].mx) : NX()));
  resolveNs.mockImplementation((h) => (live[h] ? Promise.resolve(live[h].ns) : NX()));
}

beforeEach(() => { vi.clearAllMocks(); });

describe('splitDomain', () => {
  it('separates label from suffix, including multi-part suffixes', () => {
    expect(splitDomain('congisys.co.uk')).toEqual({ label: 'congisys', suffix: 'co.uk' });
    expect(splitDomain('www.congisys.co.uk')).toEqual({ label: 'congisys', suffix: 'co.uk' });
  });
  it('refuses anything that is not a domain', () => {
    expect(splitDomain('congisys')).toBeNull();
    expect(splitDomain('')).toBeNull();
    expect(splitDomain(null)).toBeNull();
  });
});

describe('nearbyLabels', () => {
  it('includes the transposition — the commonest typo, and the real case', () => {
    expect(nearbyLabels('congisys')).toContain('cognisys');
  });
  it('includes single deletions', () => {
    expect(nearbyLabels('acmee')).toContain('acme');
  });
  it('never suggests the original back', () => {
    expect(nearbyLabels('congisys')).not.toContain('congisys');
  });
  it('drops stubs too short to mean anything', () => {
    expect(nearbyLabels('abc').every((l) => l.length >= 3)).toBe(true);
  });
});

describe('domainResolves — the typed address, FAILS OPEN', () => {
  it('true when it has an address', async () => {
    dnsWorld({ 'cognisys.co.uk': REAL });
    expect(await domainResolves('cognisys.co.uk')).toBe(true);
  });
  it('false when nothing answers', async () => {
    dnsWorld();
    expect(await domainResolves('congisys.co.uk')).toBe(false);
  });
  it('ignores a www prefix', async () => {
    dnsWorld({ 'cognisys.co.uk': REAL });
    expect(await domainResolves('www.cognisys.co.uk')).toBe(true);
  });
  it('refuses input that is not a domain', async () => {
    expect(await domainResolves('')).toBe(false);
    expect(await domainResolves('notadomain')).toBe(false);
  });
});

describe('domainIsReal — a suggestion, FAILS CLOSED', () => {
  it('accepts an address plus delegation or mail', async () => {
    dnsWorld({ 'cognisys.co.uk': REAL });
    expect(await domainIsReal('cognisys.co.uk')).toBe(true);
  });
  it('rejects an address with no mail and no nameservers', async () => {
    dnsWorld({ 'parked.co.uk': { a: ['1.2.3.4'], mx: [], ns: [] } });
    expect(await domainIsReal('parked.co.uk')).toBe(false);
  });
  it('rejects mail with no address', async () => {
    dnsWorld({ 'mailonly.co.uk': { a: [], mx: [{ exchange: 'x' }], ns: ['ns1'] } });
    expect(await domainIsReal('mailonly.co.uk')).toBe(false);
  });
});

describe('preflight — the whole door check', () => {
  it('the real bug: the typo does not exist, and the one real neighbour is offered', async () => {
    dnsWorld({ 'cognisys.co.uk': REAL });
    const out = await preflight('congisys.co.uk');
    expect(out.exists).toBe(false);
    expect(out.suggestions).toEqual(['cognisys.co.uk']);
  });

  it('offers NOTHING when no neighbour is real — silence beats a guess', async () => {
    // The first version shared one deadline across 24 parallel lookups, so most timed
    // out, took the fail-open path, and were offered as suggestions: seven domains,
    // including ocngisys.co.uk, none of which exist.
    dnsWorld();
    const out = await preflight('congisys.co.uk');
    expect(out.exists).toBe(false);
    expect(out.suggestions).toEqual([]);
  });

  it('a live domain passes straight through with nothing to say', async () => {
    dnsWorld({ 'cognisys.co.uk': REAL });
    expect(await preflight('cognisys.co.uk')).toEqual({ exists: true, suggestions: [] });
  });

  it('caps the suggestions rather than listing every near miss', async () => {
    dnsWorld(Object.fromEntries(
      nearbyLabels('congisys').map((l) => [`${l}.co.uk`, REAL]),
    ));
    expect((await nearbyDomains('congisys.co.uk')).length).toBeLessThanOrEqual(3);
  });

  it('nothing to check means proceed — never block on absence of input', async () => {
    expect(await preflight(null)).toEqual({ exists: true, suggestions: [] });
  });
});
