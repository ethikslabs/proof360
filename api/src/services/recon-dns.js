import { promises as dns } from 'dns';

function extractDomain(url) {
  try {
    const normalized = url.startsWith('http') ? url : 'https://' + url;
    return new URL(normalized).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

async function lookupTxt(hostname) {
  try {
    const records = await dns.resolveTxt(hostname);
    return records.map((r) => r.join(''));
  } catch {
    return [];
  }
}

async function lookupMx(domain) {
  try {
    const records = await dns.resolveMx(domain);
    return records.sort((a, b) => a.priority - b.priority);
  } catch {
    return [];
  }
}

async function lookupCaa(domain) {
  try {
    const records = await dns.resolveCaa(domain);
    return records;
  } catch {
    return [];
  }
}

function parseDmarcPolicy(records) {
  const dmarc = records.find((r) => r.startsWith('v=DMARC1'));
  if (!dmarc) return 'missing';
  const match = dmarc.match(/p=(\w+)/i);
  return match ? match[1].toLowerCase() : 'missing';
}

function parseSpfPolicy(records) {
  const spf = records.find((r) => r.startsWith('v=spf1'));
  if (!spf) return 'missing';
  if (spf.includes('-all')) return 'strict';
  if (spf.includes('~all')) return 'soft';
  if (spf.includes('+all') || spf.includes('?all')) return 'open';
  return 'present';
}

function inferMxProvider(mxRecords) {
  if (mxRecords.length === 0) return 'none';
  const exchange = mxRecords[0].exchange.toLowerCase();
  if (exchange.includes('google') || exchange.includes('gmail') || exchange.includes('googlemail')) return 'google';
  if (exchange.includes('outlook') || exchange.includes('microsoft') || exchange.includes('hotmail')) return 'microsoft';
  if (exchange.includes('protonmail') || exchange.includes('proton.me')) return 'proton';
  if (exchange.includes('mimecast')) return 'mimecast';
  if (exchange.includes('barracuda')) return 'barracuda';
  return 'custom';
}

export async function reconDns(url) {
  const domain = extractDomain(url);
  if (!domain) return null;

  const [rootTxt, dmarcTxt, mxRecords, caaRecords] = await Promise.allSettled([
    lookupTxt(domain),
    lookupTxt(`_dmarc.${domain}`),
    lookupMx(domain),
    lookupCaa(domain),
  ]);

  const root = rootTxt.status === 'fulfilled' ? rootTxt.value : [];
  const dmarc = dmarcTxt.status === 'fulfilled' ? dmarcTxt.value : [];
  const mx = mxRecords.status === 'fulfilled' ? mxRecords.value : [];
  const caa = caaRecords.status === 'fulfilled' ? caaRecords.value : [];

  const dmarc_policy = parseDmarcPolicy(dmarc);
  const spf_policy = parseSpfPolicy(root);
  const mx_provider = inferMxProvider(mx);
  const has_caa = caa.length > 0;

  return {
    domain,
    dmarc_policy,       // 'missing' | 'none' | 'quarantine' | 'reject'
    spf_policy,         // 'missing' | 'open' | 'soft' | 'strict' | 'present'
    mx_provider,        // 'google' | 'microsoft' | 'proton' | 'mimecast' | 'barracuda' | 'custom' | 'none'
    has_caa,            // boolean — certificate authority authorisation record present
    source: 'dns',
  };
}
