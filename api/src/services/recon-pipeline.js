// Passive recon pipeline — runs all intelligence sources in parallel.
// All sources are fire-and-forget safe: any individual failure is swallowed
// and returns a null result, never blocking the session.
//
// Sources (all passive, no target system interaction):
//   dns    — DMARC/SPF/MX/CAA records
//   http   — Security headers, TLS cert, tech fingerprint
//   certs  — CT log subdomain enumeration (crt.sh)
//   ip     — IP/ASN/hosting provider (ipapi.co)
//   github — GitHub org presence, security policy, tech stack
//   jobs   — Careers page hiring signals (via Firecrawl)
//   hibp   — Domain breach history (requires HIBP_API_KEY)

import { reconDns }    from './recon-dns.js';
import { reconHttp }   from './recon-http.js';
import { reconCerts }  from './recon-certs.js';
import { reconIp }     from './recon-ip.js';
import { reconGithub } from './recon-github.js';
import { reconJobs }   from './recon-jobs.js';
import { reconHibp }   from './recon-hibp.js';
import { reconPorts }  from './recon-ports.js';

export async function runReconPipeline(websiteUrl, companyName, options = {}) {
  const { firecrawl = null, hibpKey = process.env.HIBP_API_KEY || null } = options;
  const domain = extractDomain(websiteUrl);

  console.log(`[recon] Starting pipeline for ${domain}`);

  const [dns, http, certs, ip, github, jobs, hibp, ports] = await Promise.allSettled([
    safe('dns',    reconDns(websiteUrl)),
    safe('http',   reconHttp(websiteUrl)),
    safe('certs',  reconCerts(domain)),
    safe('ip',     reconIp(domain)),
    safe('github', reconGithub(domain, companyName)),
    safe('jobs',   firecrawl ? reconJobs(domain, firecrawl) : Promise.resolve({ source: 'jobs', skipped: true })),
    safe('hibp',   reconHibp(domain, hibpKey)),
    safe('ports',  reconPorts(domain)),
  ]);

  const pipeline = {
    dns:    unwrap(dns,    'dns'),
    http:   unwrap(http,   'http'),
    certs:  unwrap(certs,  'certs'),
    ip:     unwrap(ip,     'ip'),
    github: unwrap(github, 'github'),
    jobs:   unwrap(jobs,   'jobs'),
    hibp:   unwrap(hibp,   'hibp'),
    ports:  unwrap(ports,  'ports'),
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
