// IP / ASN / hosting provider recon — zero dependencies
// Uses dns.promises (built-in) for resolution, ipapi.co free tier for enrichment.
// 1000 req/day free, no key required.

import dns from 'dns/promises';

const IPAPI_URL = 'https://ipapi.co/{IP}/json/';
const TIMEOUT_MS = 6000;

export async function reconIp(domain) {
  // Resolve to IPv4
  let addresses;
  try {
    addresses = await dns.resolve4(domain);
  } catch {
    return { source: 'ip', error: 'dns_resolution_failed' };
  }

  if (!addresses || addresses.length === 0) {
    return { source: 'ip', error: 'no_a_record' };
  }

  const ip = addresses[0];

  // Check if Cloudflare-proxied (IP will be in Cloudflare's range)
  const isCfProxy = isCloudflareIp(ip);

  let enrichment = null;
  try {
    const res = await fetch(IPAPI_URL.replace('{IP}', ip), {
      headers: { 'User-Agent': 'proof360-recon/1.0' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) {
      const data = await res.json();
      if (!data.error) enrichment = data;
    }
  } catch {
    // enrichment unavailable — continue with just IP
  }

  const org  = enrichment?.org  || '';
  const asn  = enrichment?.asn  || '';

  return {
    source:           'ip',
    ip,
    ip_count:         addresses.length,
    asn,
    org,
    hosting_provider: classifyHosting(org, asn, isCfProxy),
    hosting_country:  enrichment?.country_code || null,
    hosting_city:     enrichment?.city || null,
    is_cloudflare_proxy: isCfProxy,
    is_cloud_hosted:  isCloudHosted(org, asn),
    // Cloud provider signals feed infrastructure gap analysis
    cloud_provider:   detectCloudProvider(org, asn),
  };
}

// Cloudflare published IP ranges (abbreviated — covers the vast majority)
const CF_RANGES = [
  [0x67090000, 0x6709FFFF], // 103.9.0.0/16
  [0x67220000, 0x6722FFFF], // 103.34.0.0/16
  [0xAC400000, 0xAC40FFFF], // 172.64.0.0/16 (partial)
  [0xC7000000, 0xC7FFFFFF], // 199.0.0.0/8 (broad)
  [0x68000000, 0x68FFFFFF], // 104.0.0.0/8 (partial CF)
];

function isCloudflareIp(ip) {
  // Heuristic — check org name after enrichment is preferable
  // This is a quick pre-check
  const parts = ip.split('.').map(Number);
  const n = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
  return CF_RANGES.some(([lo, hi]) => n >= lo && n <= hi);
}

function classifyHosting(org = '', asn = '', isCfProxy = false) {
  if (isCfProxy) return 'Cloudflare';
  const s = `${org} ${asn}`.toLowerCase();
  if (s.includes('amazon') || s.includes('aws') || s.includes('as16509') || s.includes('as14618')) return 'AWS';
  if (s.includes('google') || s.includes('as15169') || s.includes('as396982'))                    return 'GCP';
  if (s.includes('microsoft') || s.includes('azure') || s.includes('as8075'))                     return 'Azure';
  if (s.includes('cloudflare') || s.includes('as13335'))                                           return 'Cloudflare';
  if (s.includes('fastly') || s.includes('as54113'))                                               return 'Fastly';
  if (s.includes('digitalocean') || s.includes('as14061'))                                         return 'DigitalOcean';
  if (s.includes('hetzner') || s.includes('as24940'))                                              return 'Hetzner';
  if (s.includes('linode') || s.includes('as63949'))                                               return 'Linode/Akamai';
  if (s.includes('ovh') || s.includes('as16276'))                                                  return 'OVH';
  if (s.includes('vultr') || s.includes('as20473'))                                                return 'Vultr';
  return org || null;
}

function detectCloudProvider(org = '', asn = '') {
  const s = `${org} ${asn}`.toLowerCase();
  if (s.includes('amazon') || s.includes('aws') || s.includes('as16509') || s.includes('as14618')) return 'AWS';
  if (s.includes('google') || s.includes('as15169') || s.includes('as396982'))                    return 'GCP';
  if (s.includes('microsoft') || s.includes('azure') || s.includes('as8075'))                     return 'Azure';
  return null;
}

function isCloudHosted(org = '', asn = '') {
  const provider = classifyHosting(org, asn);
  return ['AWS', 'GCP', 'Azure', 'Cloudflare', 'Fastly', 'DigitalOcean', 'Linode/Akamai', 'Vultr'].includes(provider);
}
