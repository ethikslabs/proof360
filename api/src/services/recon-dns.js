import { promises as dns } from 'dns';
import { record as recordConsumption } from './consumption-emitter.js';

function extractDomain(url) {
  try {
    const normalized = url.startsWith('http') ? url : 'https://' + url;
    return new URL(normalized).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// A record that genuinely does not exist (NXDOMAIN / no-data) is a real finding —
// keep it as an empty result. An infrastructure failure (SERVFAIL / timeout / refused)
// means we could NOT determine the record; it must surface as 'unknown', never as a
// false 'missing' that fires a critical gap and corrupts trust_score.
const ABSENCE_CODES = new Set(['ENOTFOUND', 'ENODATA', 'ENONAME']);

// Each lookup returns { ok, records }: ok:true means we know the answer (records may be
// empty = genuinely absent); ok:false means the lookup failed and the answer is unknown.
async function guardedLookup(fn) {
  try {
    return { ok: true, records: await fn() };
  } catch (err) {
    if (ABSENCE_CODES.has(err?.code)) return { ok: true, records: [] };
    return { ok: false, records: [] };
  }
}

async function lookupTxt(resolveTxt, hostname) {
  const { ok, records } = await guardedLookup(() => resolveTxt(hostname));
  return { ok, records: records.map((r) => r.join('')) };
}

async function lookupMx(resolveMx, domain) {
  const { ok, records } = await guardedLookup(() => resolveMx(domain));
  return { ok, records: records.sort((a, b) => a.priority - b.priority) };
}

async function lookupCaa(resolveCaa, domain) {
  return guardedLookup(() => resolveCaa(domain));
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

export async function reconDns(url, session_id, { resolver } = {}) {
  const domain = extractDomain(url);
  if (!domain) return null;

  const { resolveTxt, resolveMx, resolveCaa } = resolver || {
    resolveTxt: (h) => dns.resolveTxt(h),
    resolveMx: (d) => dns.resolveMx(d),
    resolveCaa: (d) => dns.resolveCaa(d),
  };

  const [rootTxt, dmarcTxt, mxRecords, caaRecords] = await Promise.all([
    lookupTxt(resolveTxt, domain),
    lookupTxt(resolveTxt, `_dmarc.${domain}`),
    lookupMx(resolveMx, domain),
    lookupCaa(resolveCaa, domain),
  ]);

  // 'unknown' when the lookup failed on infrastructure — NOT 'missing' (which is a real
  // absent-record finding and fires a gap). Genuine NXDOMAIN keeps records:[] with ok:true.
  const dmarc_policy = dmarcTxt.ok ? parseDmarcPolicy(dmarcTxt.records) : 'unknown';
  const spf_policy   = rootTxt.ok  ? parseSpfPolicy(rootTxt.records)   : 'unknown';
  const mx_provider  = mxRecords.ok ? inferMxProvider(mxRecords.records) : 'unknown';
  const has_caa      = caaRecords.ok ? caaRecords.records.length > 0 : null;

  const anyFailed = [rootTxt, dmarcTxt, mxRecords, caaRecords].some(r => !r.ok);
  recordConsumption({ session_id, source: 'dns', units: 1, unit_type: 'api_calls', success: !anyFailed, error: null });

  return {
    domain,
    dmarc_policy,       // 'missing' | 'none' | 'quarantine' | 'reject' | 'unknown'
    spf_policy,         // 'missing' | 'open' | 'soft' | 'strict' | 'present' | 'unknown'
    mx_provider,        // 'google' | 'microsoft' | ... | 'none' | 'unknown'
    has_caa,            // boolean, or null when the CAA lookup could not be determined
    dns_resolved: !anyFailed,
    source: 'dns',
  };
}
