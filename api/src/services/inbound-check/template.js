// The shape a domain generator leaves behind. Two senders with one shape is the
// finding a single lookup cannot see (brief: pattern memory, the first node in the ocean).
const TWO_PART_TLDS = new Set(['co.uk', 'com.au', 'co.nz', 'co.jp', 'com.br']);

export function splitDomain(domain) {
  const parts = domain.toLowerCase().split('.');
  const two = parts.slice(-2).join('.');
  const tld = TWO_PART_TLDS.has(two) ? two : parts[parts.length - 1];
  const label = TWO_PART_TLDS.has(two) ? parts[parts.length - 3] : parts[parts.length - 2];
  return { label: label || '', tld };
}

// Known generator families. Each returns a signature or null.
const FAMILIES = [
  // the<name><initials>vc.co / the<name>caps.co — "the" + a name + a venture-ish suffix
  ({ label, tld }) => (/^the.+(vc|vcaps|caps|capital|ventures|partners|fund)$/i.test(label) ? `the*vc*.${tld}` : null),
  // <name>-<name>-partners.co style with hyphens and a venture-ish tail
  ({ label, tld }) => (/^[a-z]+(-[a-z]+){1,3}-(vc|capital|ventures|partners|fund)$/i.test(label) ? `*-*-vc.${tld}` : null),
];

export function templateSignature(local, domain) {
  const parts = splitDomain(domain);
  for (const f of FAMILIES) {
    const sig = f(parts);
    if (sig) return `${local.toLowerCase()}@${sig}`;
  }
  return `${local.toLowerCase()}@${domain.toLowerCase()}`;
}

export function isShaped(signature) {
  return /\*/.test(signature);
}
