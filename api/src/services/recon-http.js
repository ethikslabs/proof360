// HTTP/TLS passive recon — zero dependencies, Node built-ins only
// Extracts: security headers, TLS version, cert issuer/expiry/SANs,
// CDN/WAF detection, tech stack fingerprint, security.txt, robots.txt

import https from 'https';
import { URL } from 'url';
import { record as recordConsumption } from './consumption-emitter.js';

const TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 32768; // 32KB — enough for tech fingerprinting

export async function reconHttp(websiteUrl, session_id) {
  const base = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
  const parsed = new URL(base);
  const domain = parsed.hostname;

  let success = true;
  let error = null;

  const [mainResult, secTxtResult, robotsResult] = await Promise.allSettled([
    fetchWithCert(`https://${domain}/`),
    lightFetch(`https://${domain}/.well-known/security.txt`),
    lightFetch(`https://${domain}/robots.txt`),
  ]);

  const main   = mainResult.status   === 'fulfilled' ? mainResult.value   : null;
  const secTxt = secTxtResult.status === 'fulfilled' ? secTxtResult.value : null;
  const robots = robotsResult.status === 'fulfilled' ? robotsResult.value : null;

  if (!main) {
    success = false;
    error = mainResult.reason?.message || 'main fetch failed';
  }

  recordConsumption({ session_id, source: 'http', units: 1, unit_type: 'api_calls', success, error });

  const headers = main?.headers || {};

  return {
    source: 'http',
    // ── Security headers ──────────────────────────────────────────────────
    has_hsts:                !!headers['strict-transport-security'],
    hsts_max_age:            parseHstsMaxAge(headers['strict-transport-security']),
    hsts_includes_subdomains: (headers['strict-transport-security'] || '').includes('includeSubDomains'),
    has_csp:                 !!headers['content-security-policy'],
    csp_is_report_only:      !!headers['content-security-policy-report-only'] && !headers['content-security-policy'],
    has_x_frame_options:     !!headers['x-frame-options'],
    has_x_content_type:      headers['x-content-type-options'] === 'nosniff',
    has_referrer_policy:     !!headers['referrer-policy'],
    has_permissions_policy:  !!headers['permissions-policy'],
    security_headers_score:  computeHeaderScore(headers),
    // ── TLS / Certificate ─────────────────────────────────────────────────
    tls_version:             main?.tls?.protocol || null,
    tls_is_current:          isTlsCurrent(main?.tls?.protocol),
    cert_issuer:             main?.tls?.issuer || null,
    cert_issuer_type:        classifyCertIssuer(main?.tls?.issuer),
    cert_expiry_days:        main?.tls?.expiryDays ?? null,
    cert_expiry_ok:          (main?.tls?.expiryDays ?? 999) > 14,
    cert_sans:               main?.tls?.sans || [],
    cert_is_wildcard:        (main?.tls?.sans || []).some(s => s.startsWith('*.')),
    // ── Infrastructure ────────────────────────────────────────────────────
    cdn_provider:            detectCdn(headers),
    waf_detected:            detectWaf(headers),
    forces_https:            main?.wasRedirectedToHttps ?? false,
    server_software:         sanitiseServerHeader(headers['server'] || null),
    // ── Tech stack ────────────────────────────────────────────────────────
    tech_stack:              detectTechStack(headers, main?.body || ''),
    frontend_framework:      detectFrontendFramework(main?.body || ''),
    backend_language:        detectBackendLanguage(headers, main?.body || ''),
    // ── Operational signals ───────────────────────────────────────────────
    has_security_txt:        !!secTxt?.ok && (secTxt.body || '').length > 10,
    security_txt_contact:    parseSecurityTxtContact(secTxt?.body || ''),
    has_disclosure_policy:   parseHasDisclosure(secTxt?.body || ''),
    robots_sensitive_paths:  parseRobotsSensitivePaths(robots?.body || ''),
    has_admin_exposure:      hasAdminExposure(robots?.body || ''),
  };
}

// ── Fetch helpers ──────────────────────────────────────────────────────────

function fetchWithCert(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    let body = '';
    let wasRedirectedToHttps = url.startsWith('https');

    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname || '/',
      method: 'GET',
      timeout: TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; proof360-recon/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      // Don't fail on self-signed certs — just record the finding
      rejectUnauthorized: false,
    }, (res) => {
      // Follow one redirect
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        const loc = res.headers.location;
        if (loc.startsWith('https://')) wasRedirectedToHttps = true;
        res.resume();
        req.destroy();
        return fetchWithCert(loc.startsWith('http') ? loc : `https://${parsed.hostname}${loc}`)
          .then(result => resolve({ ...result, wasRedirectedToHttps }))
          .catch(reject);
      }

      res.on('data', chunk => { if (body.length < MAX_BODY_BYTES) body += chunk.toString(); });
      res.on('end', () => {
        const socket = req.socket;
        const peerCert = socket?.getPeerCertificate?.(false);
        resolve({
          headers: res.headers,
          status: res.statusCode,
          body,
          wasRedirectedToHttps,
          tls: parseCertInfo(peerCert, socket),
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function lightFetch(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'proof360-recon/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    const body = res.ok ? await res.text() : '';
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, body: '' };
  }
}

// ── TLS / cert parsing ─────────────────────────────────────────────────────

function parseCertInfo(cert, socket) {
  if (!cert || !cert.subject) return null;
  try {
    const expiryMs = new Date(cert.valid_to).getTime() - Date.now();
    const expiryDays = Math.floor(expiryMs / 86400000);
    const issuerO = cert.issuer?.O || cert.issuer?.CN || '';
    const sans = (cert.subjectaltname || '')
      .split(', ')
      .filter(s => s.startsWith('DNS:'))
      .map(s => s.slice(4).toLowerCase());
    return {
      protocol:   socket?.getProtocol?.() || null,
      issuer:     issuerO,
      expiryDays,
      validFrom:  cert.valid_from,
      validTo:    cert.valid_to,
      sans,
    };
  } catch {
    return null;
  }
}

function classifyCertIssuer(issuer = '') {
  if (!issuer) return 'unknown';
  const s = issuer.toLowerCase();
  if (s.includes("let's encrypt") || s.includes('letsencrypt')) return 'lets_encrypt';
  if (s.includes('digicert'))     return 'digicert';
  if (s.includes('sectigo') || s.includes('comodo')) return 'sectigo';
  if (s.includes('globalsign'))   return 'globalsign';
  if (s.includes('entrust'))      return 'entrust';
  if (s.includes('godaddy'))      return 'godaddy';
  if (s.includes('amazon') || s.includes('aws')) return 'aws_acm';
  if (s.includes('google'))       return 'google';
  if (s.includes('cloudflare'))   return 'cloudflare';
  return 'other';
}

function isTlsCurrent(protocol) {
  if (!protocol) return null;
  const p = protocol.toLowerCase();
  if (p.includes('1.3')) return true;
  if (p.includes('1.2')) return true;  // acceptable
  return false; // 1.0 or 1.1
}

// ── Header parsing ─────────────────────────────────────────────────────────

function parseHstsMaxAge(header = '') {
  if (!header) return null;
  const match = header.match(/max-age=(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

function computeHeaderScore(headers = {}) {
  const checks = [
    !!headers['strict-transport-security'],
    !!headers['content-security-policy'],
    !!headers['x-frame-options'] || (headers['content-security-policy'] || '').includes('frame-ancestors'),
    headers['x-content-type-options'] === 'nosniff',
    !!headers['referrer-policy'],
    !!headers['permissions-policy'],
  ];
  return checks.filter(Boolean).length; // 0–6
}

// ── CDN / WAF detection ────────────────────────────────────────────────────

function detectCdn(headers = {}) {
  if (headers['cf-ray'] || headers['server'] === 'cloudflare') return 'Cloudflare';
  if (headers['x-amz-cf-id'] || headers['x-amz-cf-pop'] || (headers['via'] || '').includes('CloudFront')) return 'AWS CloudFront';
  if (headers['fastly-restarts'] !== undefined || (headers['x-served-by'] || '').includes('cache')) return 'Fastly';
  if (headers['x-akamai-transformed'] || (headers['server'] || '').toLowerCase().includes('akamai')) return 'Akamai';
  if (headers['x-azure-ref']) return 'Azure CDN';
  if ((headers['x-cache'] || '').toLowerCase().includes('hit')) return 'CDN (unknown)';
  return null;
}

function detectWaf(headers = {}) {
  if (headers['x-sucuri-id']) return 'Sucuri';
  if ((headers['x-cdn'] || '').toLowerCase().includes('imperva') || headers['x-iinfo']) return 'Imperva';
  if (headers['cf-ray']) return 'Cloudflare WAF';
  if (headers['x-waf-status']) return 'WAF (unknown)';
  return false;
}

// ── Tech stack fingerprinting ──────────────────────────────────────────────

function sanitiseServerHeader(server) {
  if (!server) return null;
  // Strip version numbers for output (nginx/1.18.0 → nginx)
  return server.split('/')[0].toLowerCase();
}

function detectTechStack(headers = {}, body = '') {
  const stack = new Set();
  const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).toLowerCase()]));

  // From headers
  if (h.server?.includes('nginx'))    stack.add('nginx');
  if (h.server?.includes('apache'))   stack.add('apache');
  if (h.server?.includes('iis'))      stack.add('iis');
  if (h['x-powered-by']?.includes('php'))     stack.add('php');
  if (h['x-powered-by']?.includes('express')) stack.add('nodejs');
  if (h['x-powered-by']?.includes('asp.net')) stack.add('dotnet');
  if (h['x-powered-by']?.includes('ruby'))    stack.add('ruby_on_rails');

  // From cookies
  const cookies = (Array.isArray(headers['set-cookie']) ? headers['set-cookie'] : [headers['set-cookie'] || '']).join(';');
  if (cookies.toLowerCase().includes('phpsessid'))       stack.add('php');
  if (cookies.toLowerCase().includes('jsessionid'))      stack.add('java');
  if (cookies.toLowerCase().includes('asp.net_session')) stack.add('dotnet');
  if (cookies.toLowerCase().includes('_rails_session') || cookies.toLowerCase().includes('_session_id')) stack.add('ruby_on_rails');
  if (cookies.toLowerCase().includes('laravel_session')) stack.add('laravel');
  if (cookies.toLowerCase().includes('django'))          stack.add('django');

  // From HTML body
  if (body.includes('wp-content') || body.includes('wp-includes')) stack.add('wordpress');
  if (body.includes('X-Shopify') || body.includes('Shopify.theme')) stack.add('shopify');
  if (body.includes('__NEXT_DATA__') || body.includes('_next/static')) stack.add('nextjs');
  if (body.includes('__nuxt') || body.includes('data-n-head')) stack.add('nuxtjs');
  if (body.includes('window.__GATSBY')) stack.add('gatsby');
  if (body.includes('data-reactroot') || body.includes('react-dom')) stack.add('react');
  if (body.includes('ng-version') || body.includes('ng-app')) stack.add('angular');
  if (body.includes('window.Ember') || body.includes('data-ember')) stack.add('ember');

  return [...stack];
}

function detectFrontendFramework(body = '') {
  if (body.includes('__NEXT_DATA__') || body.includes('_next/static'))  return 'Next.js';
  if (body.includes('__nuxt'))                                           return 'Nuxt.js';
  if (body.includes('window.__GATSBY'))                                  return 'Gatsby';
  if (body.includes('data-reactroot') || body.includes('_react'))       return 'React';
  if (body.includes('ng-version'))                                       return 'Angular';
  if (body.includes('data-v-') || body.includes('__vue_'))              return 'Vue.js';
  return null;
}

function detectBackendLanguage(headers = {}, body = '') {
  const xpb = (headers['x-powered-by'] || '').toLowerCase();
  if (xpb.includes('php'))    return 'PHP';
  if (xpb.includes('express') || xpb.includes('node')) return 'Node.js';
  if (xpb.includes('asp.net')) return 'ASP.NET';
  if (xpb.includes('ruby'))    return 'Ruby';
  if (body.includes('phpsessid') || body.includes('<?php')) return 'PHP';
  return null;
}

// ── security.txt parsing ───────────────────────────────────────────────────

function parseSecurityTxtContact(body = '') {
  const match = body.match(/^Contact:\s*(.+)$/im);
  return match ? match[1].trim() : null;
}

function parseHasDisclosure(body = '') {
  return body.toLowerCase().includes('contact:') || body.toLowerCase().includes('policy:');
}

// ── robots.txt parsing ─────────────────────────────────────────────────────

const SENSITIVE_PATH_PATTERNS = [
  /\/admin/i, /\/wp-admin/i, /\/phpmyadmin/i, /\/cpanel/i,
  /\/api\/internal/i, /\/internal/i, /\/staging/i, /\/dev\//i,
  /\/\.git/i, /\/\.env/i, /\/backup/i, /\/config/i,
  /\/dashboard\/internal/i, /\/manage/i,
];

function parseRobotsSensitivePaths(body = '') {
  const disallowed = [];
  for (const line of body.split('\n')) {
    const match = line.match(/^Disallow:\s*(.+)$/i);
    if (match) disallowed.push(match[1].trim());
  }
  return disallowed.filter(p => SENSITIVE_PATH_PATTERNS.some(rx => rx.test(p)));
}

function hasAdminExposure(body = '') {
  return parseRobotsSensitivePaths(body).some(p =>
    /\/admin|\/wp-admin|\/phpmyadmin|\/cpanel|\/manage/i.test(p)
  );
}
