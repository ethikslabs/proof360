// CT log subdomain enumeration via crt.sh (free, no auth)
// Passive intelligence: infrastructure breadth, staging/dev exposure,
// related domains the company owns.

const CRTSH_URL = 'https://crt.sh/?q=%25.{DOMAIN}&output=json';
const TIMEOUT_MS = 10000;

// Subdomains that signal exposed non-production infrastructure
const SENSITIVE_PREFIXES = new Set([
  'staging', 'stage', 'stg',
  'dev', 'develop', 'development',
  'test', 'testing', 'qa', 'uat',
  'admin', 'internal', 'intranet',
  'beta', 'preprod', 'preview',
  'api-internal', 'api-dev', 'api-staging',
  'db', 'database', 'redis', 'mysql',
  'jenkins', 'ci', 'cd', 'build',
  'vpn', 'bastion', 'jump',
]);

export async function reconCerts(domain) {
  const url = CRTSH_URL.replace('{DOMAIN}', domain);
  let certs;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'proof360-recon/1.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { source: 'certs', error: `crt.sh ${res.status}` };
    certs = await res.json();
  } catch (err) {
    return { source: 'certs', error: err.message };
  }

  // Deduplicate and clean subdomain list
  const seen = new Set();
  for (const cert of certs) {
    for (const name of (cert.name_value || '').split('\n')) {
      const clean = name.trim().toLowerCase().replace(/^\*\./, '');
      // Only keep names that are actual subdomains of the target domain
      if (clean.endsWith(`.${domain}`) && clean !== domain) {
        seen.add(clean);
      }
    }
  }

  const subdomains = [...seen];

  // Classify exposed sensitive subdomains
  const exposed = subdomains.filter(sub => {
    const prefix = sub.replace(`.${domain}`, '').split('.').pop();
    return SENSITIVE_PREFIXES.has(prefix);
  });

  // Detect related domains from SANs (same org owns other TLDs etc.)
  const relatedDomains = new Set();
  for (const cert of certs) {
    for (const name of (cert.name_value || '').split('\n')) {
      const clean = name.trim().toLowerCase().replace(/^\*\./, '');
      // Not a subdomain of the target but shares cert (sibling domain)
      if (!clean.endsWith(domain) && !clean.endsWith('.') && clean.includes('.') && cert.name_value.includes(domain)) {
        relatedDomains.add(clean);
      }
    }
  }

  // Count distinct cert issuers to gauge cert management maturity
  const issuers = new Set(certs.map(c => (c.issuer_name || '').split('O=')[1]?.split(',')[0]?.trim()).filter(Boolean));

  return {
    source: 'certs',
    subdomain_count:               subdomains.length,
    subdomains:                    subdomains.slice(0, 60),
    has_staging_exposure:          exposed.length > 0,
    exposed_sensitive_subdomains:  exposed,
    related_domains:               [...relatedDomains].slice(0, 10),
    cert_count:                    certs.length,
    distinct_issuers:              [...issuers],
    infrastructure_breadth:
      subdomains.length === 0   ? 'none'    :
      subdomains.length < 5     ? 'minimal' :
      subdomains.length < 25    ? 'standard':
      subdomains.length < 100   ? 'broad'   : 'extensive',
  };
}
