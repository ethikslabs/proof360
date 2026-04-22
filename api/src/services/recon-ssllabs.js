// SSL Labs passive recon — official TLS grade for a domain.
// Uses the public Qualys SSL Labs API (no key required).
// Requests a cached result first; triggers a fresh scan only if none exists.
// Full scan takes 60–90s — this module is designed to run in parallel
// with other recon sources so the latency is absorbed.

const API_BASE = 'https://api.ssllabs.com/api/v3';
const POLL_INTERVAL_MS = 8000;
const MAX_WAIT_MS = 120_000;

export async function reconSslLabs(websiteUrl) {
  const domain = extractDomain(websiteUrl);
  if (!domain) return { source: 'ssllabs', skipped: true, reason: 'invalid domain' };

  try {
    // Request cached result first — avoids triggering a full scan on every session
    let result = await fetchAnalysis(domain, false);

    // If no cache or still running, start a fresh scan and poll
    if (result.status === 'ERROR' || !result.status) {
      result = await fetchAnalysis(domain, true);
    }

    if (result.status !== 'READY') {
      result = await pollUntilReady(domain, MAX_WAIT_MS);
    }

    if (result.status !== 'READY') {
      return { source: 'ssllabs', skipped: true, reason: `scan did not complete (${result.status})` };
    }

    return parseResult(domain, result);
  } catch (err) {
    return { source: 'ssllabs', skipped: true, reason: err.message };
  }
}

// ── Fetch / poll ───────────────────────────────────────────────────────────

async function fetchAnalysis(domain, startNew) {
  const params = new URLSearchParams({ host: domain, all: 'done' });
  if (startNew) params.set('startNew', 'on');
  else params.set('fromCache', 'on');

  const res = await fetch(`${API_BASE}/analyze?${params}`, {
    headers: { 'User-Agent': 'proof360-recon/1.0' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`SSL Labs HTTP ${res.status}`);
  return res.json();
}

async function pollUntilReady(domain, maxWaitMs) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const result = await fetchAnalysis(domain, false);
    if (result.status === 'READY' || result.status === 'ERROR') return result;
  }
  return { status: 'TIMEOUT' };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Parse ──────────────────────────────────────────────────────────────────

function parseResult(domain, data) {
  const endpoints = data.endpoints || [];

  // Use the worst grade across all endpoints (most conservative)
  const grades = endpoints.map(ep => ep.grade).filter(Boolean);
  const grade = worstGrade(grades);

  // Use details from the first endpoint with details available
  const ep = endpoints.find(e => e.details) || endpoints[0] || {};
  const det = ep.details || {};

  const protocols = (det.protocols || []).map(p => p.name + p.version);
  const hasOldTls = protocols.some(p => p === 'TLS1.0' || p === 'TLS1.1');
  const hasHstsHeader = det.hstsPolicy?.status === 'present';
  const hstsPreloaded = (det.hstsPreloads || []).some(
    p => ['Chrome', 'Firefox', 'Edge'].includes(p.source) && p.status === 'present'
  );

  return {
    source:           'ssllabs',
    domain,
    ssl_grade:        grade || null,           // A+ / A / A- / B / C / D / F
    ssl_grade_num:    gradeToNum(grade),       // 0–10 for scoring
    has_old_tls:      hasOldTls,               // true if TLS 1.0 or 1.1 enabled
    protocols,                                 // ['TLS1.0','TLS1.1','TLS1.2','TLS1.3']
    hsts_header:      hasHstsHeader,
    hsts_preloaded:   hstsPreloaded,
    heartbleed:       det.heartbleed ?? false,
    poodle:           det.poodle ?? false,
    rc4_only:         det.rc4Only ?? false,
    forward_secrecy:  det.forwardSecrecy ?? null,  // 0=none 1=partial 2=modern 4=robust
    cert_issues:      (ep.certChains?.[0]?.issues ?? 0) > 0,
    endpoint_count:   endpoints.length,
  };
}

// ── Grade helpers ──────────────────────────────────────────────────────────

const GRADE_ORDER = ['A+', 'A', 'A-', 'B', 'C', 'D', 'E', 'F', 'T', 'M'];

function worstGrade(grades) {
  if (!grades.length) return null;
  return grades.reduce((worst, g) => {
    const wi = GRADE_ORDER.indexOf(worst);
    const gi = GRADE_ORDER.indexOf(g);
    return gi > wi ? g : worst;
  });
}

function gradeToNum(grade) {
  const map = { 'A+': 10, 'A': 9, 'A-': 8, 'B': 7, 'C': 5, 'D': 3, 'F': 0, 'T': 0, 'M': 0 };
  return map[grade] ?? null;
}

function extractDomain(url) {
  try {
    const u = url.startsWith('http') ? url : `https://${url}`;
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
