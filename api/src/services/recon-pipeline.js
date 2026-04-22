// Passive recon pipeline — runs all intelligence sources in parallel.
// All sources are fire-and-forget safe: any individual failure is swallowed
// and returns a null result, never blocking the session.
//
// Sources (all passive, no target system interaction):
//   dns       — DMARC/SPF/MX/CAA/DKIM/DNSSEC/BIMI records
//   http      — Security headers, TLS cert, tech fingerprint
//   certs     — CT log subdomain enumeration (crt.sh)
//   ip        — IP/ASN/hosting provider (ipapi.co)
//   github    — GitHub org presence, security policy, tech stack
//   jobs      — Careers page hiring signals (via Firecrawl)
//   hibp      — Domain breach history (requires HIBP_API_KEY)
//   ssllabs   — Official TLS grade (Qualys SSL Labs, no key required)
//   abuseipdb — IP abuse confidence score, usage type (requires ABUSEIPDB_API_KEY)

import { reconDns }      from './recon-dns.js';
import { reconHttp }     from './recon-http.js';
import { reconCerts }    from './recon-certs.js';
import { reconIp }       from './recon-ip.js';
import { reconGithub }   from './recon-github.js';
import { reconJobs }     from './recon-jobs.js';
import { reconHibp }     from './recon-hibp.js';
import { reconPorts }    from './recon-ports.js';
import { reconSslLabs }  from './recon-ssllabs.js';
import { reconAbuseIpdb } from './recon-abuseipdb.js';

export async function runReconPipeline(websiteUrl, companyName, options = {}) {
  const {
    firecrawl        = null,
    hibpKey          = process.env.HIBP_API_KEY       || null,
    abuseIpdbKey     = process.env.ABUSEIPDB_API_KEY  || null,
    onSourceComplete = null,
  } = options;
  const domain = extractDomain(websiteUrl);

  console.log(`[recon] Starting pipeline for ${domain}`);

  // Jobs has two branches (firecrawl present or skipped); both resolve through
  // safe() then the shared .then() below — no special handling needed.
  const jobsPromise = firecrawl
    ? reconJobs(domain, firecrawl)
    : Promise.resolve({ source: 'jobs', skipped: true, reason: 'no firecrawl' });

  const [dns, http, certs, ip, github, jobs, hibp, ports, ssllabs, abuseipdb] =
    await Promise.allSettled([
      safe('dns',       reconDns(websiteUrl)).then(r      => { onSourceComplete?.('dns',       formatReconLine('dns',       r)); return r; }),
      safe('http',      reconHttp(websiteUrl)).then(r     => { onSourceComplete?.('http',      formatReconLine('http',      r)); return r; }),
      safe('certs',     reconCerts(domain)).then(r        => { onSourceComplete?.('certs',     formatReconLine('certs',     r)); return r; }),
      safe('ip',        reconIp(domain)).then(r           => { onSourceComplete?.('ip',        formatReconLine('ip',        r)); return r; }),
      safe('github',    reconGithub(domain, companyName)).then(r => { onSourceComplete?.('github',   formatReconLine('github',   r)); return r; }),
      safe('jobs',      jobsPromise).then(r               => { onSourceComplete?.('jobs',      formatReconLine('jobs',      r)); return r; }),
      safe('hibp',      reconHibp(domain, hibpKey)).then(r       => { onSourceComplete?.('hibp',      formatReconLine('hibp',      r)); return r; }),
      safe('ports',     reconPorts(domain)).then(r        => { onSourceComplete?.('ports',     formatReconLine('ports',     r)); return r; }),
      safe('ssllabs',   reconSslLabs(websiteUrl)).then(r  => { onSourceComplete?.('ssllabs',  formatReconLine('ssllabs',  r)); return r; }),
      safe('abuseipdb', reconAbuseIpdb(domain, abuseIpdbKey)).then(r => { onSourceComplete?.('abuseipdb', formatReconLine('abuseipdb', r)); return r; }),
    ]);

  const pipeline = {
    dns:       unwrap(dns,       'dns'),
    http:      unwrap(http,      'http'),
    certs:     unwrap(certs,     'certs'),
    ip:        unwrap(ip,        'ip'),
    github:    unwrap(github,    'github'),
    jobs:      unwrap(jobs,      'jobs'),
    hibp:      unwrap(hibp,      'hibp'),
    ports:     unwrap(ports,     'ports'),
    ssllabs:   unwrap(ssllabs,   'ssllabs'),
    abuseipdb: unwrap(abuseipdb, 'abuseipdb'),
    domain,
    scanned_at: new Date().toISOString(),
  };

  logSummary(pipeline);
  return pipeline;
}

// ── Context extraction ─────────────────────────────────────────────────────
// Flatten the pipeline result into the flat key-value context shape
// that gap trigger conditions expect.

export function extractReconContext(pipeline) {
  if (!pipeline) return {};
  const ctx = {};

  // DNS
  if (pipeline.dns) {
    const d = pipeline.dns;
    if (d.dmarc_policy) ctx.dmarc_policy = d.dmarc_policy;
    if (d.spf_policy)   ctx.spf_policy   = d.spf_policy;
    if (d.mx_provider)  ctx.mx_provider  = d.mx_provider;
    if (d.has_caa !== undefined) ctx.has_caa = d.has_caa;
  }

  // HTTP
  if (pipeline.http) {
    const h = pipeline.http;
    ctx.has_hsts          = h.has_hsts ?? null;
    ctx.has_csp           = h.has_csp  ?? null;
    ctx.security_headers_score = h.security_headers_score ?? null;
    ctx.tls_version       = h.tls_version ?? null;
    ctx.tls_is_current    = h.tls_is_current ?? null;
    ctx.cert_issuer_type  = h.cert_issuer_type ?? null;
    ctx.cert_expiry_days  = h.cert_expiry_days ?? null;
    ctx.cdn_provider      = h.cdn_provider ?? null;
    ctx.waf_detected      = h.waf_detected ?? null;
    ctx.has_security_txt  = h.has_security_txt ?? null;
    ctx.tech_stack        = h.tech_stack ?? [];
    ctx.frontend_framework = h.frontend_framework ?? null;
    ctx.backend_language  = h.backend_language ?? null;
    ctx.has_admin_exposure = h.has_admin_exposure ?? false;
    ctx.robots_sensitive_paths = h.robots_sensitive_paths ?? [];
  }

  // Certs
  if (pipeline.certs) {
    const c = pipeline.certs;
    ctx.subdomain_count          = c.subdomain_count ?? 0;
    ctx.has_staging_exposure     = c.has_staging_exposure ?? false;
    ctx.exposed_sensitive_subdomains = c.exposed_sensitive_subdomains ?? [];
    ctx.infrastructure_breadth   = c.infrastructure_breadth ?? null;
  }

  // IP
  if (pipeline.ip) {
    const i = pipeline.ip;
    ctx.hosting_provider  = i.hosting_provider ?? null;
    ctx.cloud_provider    = i.cloud_provider   ?? null;
    ctx.is_cloud_hosted   = i.is_cloud_hosted  ?? null;
    ctx.hosting_country   = i.hosting_country  ?? null;
  }

  // GitHub
  if (pipeline.github?.found) {
    const g = pipeline.github;
    ctx.github_found         = true;
    ctx.github_primary_lang  = g.primary_language ?? null;
    ctx.github_has_security_policy = g.has_security_policy ?? false;
    ctx.github_days_stale    = g.days_since_last_commit ?? null;
  }

  // Jobs
  if (pipeline.jobs?.found) {
    const j = pipeline.jobs;
    ctx.security_hire_signal     = j.security_hire_signal     ?? false;
    ctx.compliance_hire_signal   = j.compliance_hire_signal   ?? false;
    ctx.security_team_gap_signal = j.security_team_gap_signal ?? false;
    ctx.job_tech_stack           = j.tech_stack_signals       ?? [];
  }

  // HIBP
  if (pipeline.hibp && !pipeline.hibp.skipped) {
    const b = pipeline.hibp;
    ctx.domain_in_breach    = b.domain_in_breach    ?? false;
    ctx.breach_count        = b.breach_count        ?? 0;
    ctx.breach_severity     = b.breach_severity     ?? 'none';
    ctx.breach_is_recent    = b.breach_is_recent    ?? false;
  }

  // SSL Labs
  if (pipeline.ssllabs && !pipeline.ssllabs.skipped) {
    const s = pipeline.ssllabs;
    ctx.ssl_grade       = s.ssl_grade       ?? null;
    ctx.ssl_grade_num   = s.ssl_grade_num   ?? null;
    ctx.has_old_tls     = s.has_old_tls     ?? null;
    ctx.hsts_preloaded  = s.hsts_preloaded  ?? false;
    ctx.heartbleed      = s.heartbleed      ?? false;
    ctx.poodle          = s.poodle          ?? false;
  }

  // Ports
  if (pipeline.ports && !pipeline.ports.error) {
    const p = pipeline.ports;
    ctx.open_ports           = p.open_ports          ?? [];
    ctx.risky_port_count     = p.risky_port_count    ?? 0;
    ctx.critical_port_count  = p.critical_port_count ?? 0;
    ctx.has_exposed_db       = p.has_exposed_db      ?? false;
    ctx.has_ssh              = p.has_ssh             ?? false;
    ctx.has_telnet           = p.has_telnet          ?? false;
  }

  // AbuseIPDB
  if (pipeline.abuseipdb && !pipeline.abuseipdb.skipped && !pipeline.abuseipdb.error) {
    const a = pipeline.abuseipdb;
    ctx.abuse_confidence_score = a.abuse_confidence_score ?? 0;
    ctx.ip_usage_type          = a.usage_type             ?? null;
    ctx.ip_total_reports       = a.total_reports          ?? 0;
    ctx.ip_is_abusive          = (a.abuse_confidence_score ?? 0) >= 25;
  }

  return ctx;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function extractDomain(url) {
  try {
    const u = url.startsWith('http') ? url : `https://${url}`;
    return new URL(u).hostname;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0];
  }
}

const TASK_TIMEOUT = 12000; // 12s per recon source — hung fetches silently killed

async function safe(name, promise) {
  try {
    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error(`${name} timed out after ${TASK_TIMEOUT / 1000}s`)), TASK_TIMEOUT)
    );
    return await Promise.race([promise, timeout]);
  } catch (err) {
    console.warn(`[recon:${name}] failed:`, err.message);
    return { source: name, error: err.message };
  }
}

function unwrap(result, name) {
  if (result.status === 'fulfilled') return result.value;
  console.warn(`[recon:${name}] rejected:`, result.reason?.message);
  return { source: name, error: result.reason?.message || 'unknown' };
}

function logSummary(p) {
  const sources = ['dns', 'http', 'certs', 'ip', 'github', 'jobs', 'hibp', 'ports'];
  const ok    = sources.filter(s => p[s] && !p[s].error && !p[s].skipped).length;
  const skip  = sources.filter(s => p[s]?.skipped).length;
  const fail  = sources.filter(s => p[s]?.error).length;
  console.log(`[recon] Complete — ${ok} ok, ${skip} skipped, ${fail} failed | domain: ${p.domain}`);
}

// ── Recon SSE line formatter ────────────────────────────────────────────────
// Used by onSourceComplete callback to format each source result into
// a right-pane terminal line before emitting over SSE.

function tag(source) {
  // Right-pad the [source] label to column 12 so text aligns across all sources.
  // [abuseipdb] is exactly 11 chars — gets 1 space. Shorter sources get more.
  return `[${source}]`.padEnd(12);
}

export function formatReconLine(source, result) {
  // Error / skipped guards — applies to all sources
  if (!result || result.error) {
    return { type: 'recon', source, text: `${tag(source)}error · skipped`,   color: 'muted' };
  }
  if (result.skipped) {
    return { type: 'recon', source, text: `${tag(source)}skipped · no key`,  color: 'muted' };
  }

  switch (source) {
    case 'dns': {
      const p = result.dmarc_policy;
      if (!p || p === 'missing' || p === 'none') {
        return { type: 'recon', source, text: `${tag(source)}DMARC not enforced · spoofing risk`, color: 'err' };
      }
      return { type: 'recon', source, text: `${tag(source)}DMARC enforced · SPF ${result.spf_policy || 'present'}`, color: 'ok' };
    }

    case 'http': {
      const score = result.security_headers_score ?? 0;
      if (score >= 5) {
        return { type: 'recon', source, text: `${tag(source)}${score}/6 headers set`, color: 'ok' };
      }
      const missing = !result.has_csp ? 'CSP missing' : 'HSTS missing';
      return { type: 'recon', source, text: `${tag(source)}${score}/6 headers · ${missing}`, color: 'err' };
    }

    case 'certs': {
      const count   = result.subdomain_count ?? 0;
      const exposed = result.exposed_sensitive_subdomains?.length ?? 0;
      if (exposed > 0) {
        return { type: 'recon', source, text: `${tag(source)}${count} subdomains · ${exposed} staging exposed`, color: 'query' };
      }
      return { type: 'recon', source, text: `${tag(source)}${count} subdomains · none exposed`, color: 'ok' };
    }

    case 'ip': {
      const provider = result.cloud_provider || result.hosting_provider || 'unknown';
      const country  = result.hosting_country ? ` · ${result.hosting_country}` : '';
      return { type: 'recon', source, text: `${tag(source)}${provider}${country} · clean`, color: 'ok' };
    }

    case 'github': {
      if (!result.found) {
        return { type: 'recon', source, text: `${tag(source)}no org found`, color: 'muted' };
      }
      if (!result.has_security_policy) {
        return { type: 'recon', source, text: `${tag(source)}no security policy`, color: 'err' };
      }
      return { type: 'recon', source, text: `${tag(source)}org found · security policy set`, color: 'ok' };
    }

    case 'jobs': {
      if (!result.found) {
        return { type: 'recon', source, text: `${tag(source)}no careers page found`, color: 'muted' };
      }
      if (result.security_hire_signal || result.compliance_hire_signal) {
        return { type: 'recon', source, text: `${tag(source)}active security hiring detected`, color: 'query' };
      }
      return { type: 'recon', source, text: `${tag(source)}no security hiring signals`, color: 'ok' };
    }

    case 'hibp': {
      const count = result.breach_count ?? 0;
      if (count === 0 && !result.domain_in_breach) {
        return { type: 'recon', source, text: `${tag(source)}no breaches on record`, color: 'ok' };
      }
      return { type: 'recon', source, text: `${tag(source)}${count} breach${count !== 1 ? 'es' : ''} on record`, color: 'err' };
    }

    case 'ports': {
      const risky = result.risky_port_count ?? 0;
      if (risky === 0) {
        return { type: 'recon', source, text: `${tag(source)}no risky ports exposed`, color: 'ok' };
      }
      const notable = (result.open_ports || [])
        .filter(p => p.risk === 'critical' || p.risk === 'high')
        .map(p => p.port)
        .slice(0, 2)
        .join(' · ');
      return { type: 'recon', source, text: `${tag(source)}${notable || `${risky} risky`} exposed`, color: 'err' };
    }

    case 'ssllabs': {
      const grade = result.ssl_grade || '?';
      const proto = (result.protocols || []).includes('TLS1.3') ? 'TLS 1.3' : 'TLS 1.2';
      if (result.has_old_tls) {
        return { type: 'recon', source, text: `${tag(source)}grade ${grade} · TLS 1.0 enabled`, color: 'err' };
      }
      if (['A+', 'A', 'A-'].includes(grade)) {
        return { type: 'recon', source, text: `${tag(source)}grade ${grade} · ${proto}`, color: 'ok' };
      }
      return { type: 'recon', source, text: `${tag(source)}grade ${grade} · review needed`, color: 'err' };
    }

    case 'abuseipdb': {
      const score   = result.abuse_confidence_score ?? 0;
      const reports = result.total_reports ?? 0;
      if (score >= 25) {
        return { type: 'recon', source, text: `${tag(source)}score ${score}% · ${reports} reports`, color: 'err' };
      }
      return { type: 'recon', source, text: `${tag(source)}IP clean · ${reports} reports`, color: 'ok' };
    }

    default:
      return { type: 'recon', source, text: `${tag(source)}done`, color: 'ok' };
  }
}
