// AbuseIPDB recon — IP reputation for the company's server IP.
// Checks abuse confidence score, usage type, and report history.
// Requires ABUSEIPDB_API_KEY env var (free tier: 1000 checks/day).

import { record as recordConsumption } from './consumption-emitter.js';

export async function reconAbuseIpdb(domain, apiKey, session_id) {
  if (!apiKey) return { source: 'abuseipdb', skipped: true, reason: 'no API key' };

  try {
    const ip = await resolveIp(domain);
    if (!ip) {
      recordConsumption({ session_id, source: 'abuseipdb', units: 1, unit_type: 'api_calls', success: false, error: 'could not resolve IP' });
      return { source: 'abuseipdb', skipped: true, reason: 'could not resolve IP' };
    }

    const res = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`,
      {
        headers: {
          'Key': apiKey,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!res.ok) {
      recordConsumption({ session_id, source: 'abuseipdb', units: 1, unit_type: 'api_calls', success: false, error: `AbuseIPDB HTTP ${res.status}` });
      throw new Error(`AbuseIPDB HTTP ${res.status}`);
    }
    const json = await res.json();
    const d = json.data;

    recordConsumption({ session_id, source: 'abuseipdb', units: 1, unit_type: 'api_calls', success: true, error: null });

    return {
      source:                'abuseipdb',
      ip,
      abuse_confidence_score: d.abuseConfidenceScore ?? 0,
      usage_type:            d.usageType ?? null,
      isp:                   d.isp ?? null,
      is_whitelisted:        d.isWhitelisted ?? false,
      total_reports:         d.totalReports ?? 0,
      distinct_reporters:    d.numDistinctUsers ?? 0,
      last_reported_at:      d.lastReportedAt ?? null,
      country_code:          d.countryCode ?? null,
    };
  } catch (err) {
    recordConsumption({ session_id, source: 'abuseipdb', units: 1, unit_type: 'api_calls', success: false, error: err.message });
    return { source: 'abuseipdb', error: err.message };
  }
}

async function resolveIp(domain) {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${domain}&type=A`, {
      signal: AbortSignal.timeout(5_000),
    });
    const json = await res.json();
    return json.Answer?.find(r => r.type === 1)?.data ?? null;
  } catch {
    return null;
  }
}
