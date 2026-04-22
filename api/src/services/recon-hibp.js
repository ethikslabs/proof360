// Have I Been Pwned — domain breach check
// API key required: https://haveibeenpwned.com/API/Key (~$3.50/mo)
// Set HIBP_API_KEY in api/.env when ready.
//
// What this tells us:
// - Has the company domain appeared in known data breaches?
// - How many employee/customer accounts from this domain are in breach databases?
// - Which breaches? (LastPass breach = critical; LinkedIn = moderate)
// - Most recent breach date — is this historical or recent?
//
// Why this matters for trust posture:
// - A domain in recent breach data is a hard blocker for enterprise procurement
// - Investors run HIBP checks as standard due diligence
// - Cyber insurers price premiums partly based on breach history
// - An old breach that was disclosed + remediated is recoverable — a hidden one is not

const HIBP_BASE = 'https://haveibeenpwned.com/api/v3';
const TIMEOUT_MS = 10000;

// Breaches considered high-severity (credential/password exposure)
const HIGH_SEVERITY_BREACHES = new Set([
  'LastPass', 'LinkedIn', 'Adobe', 'Dropbox', 'Slack',
  'GitHub', 'Twitch', 'Okta', 'Atlassian', 'Cloudflare',
  'Heroku', 'MailChimp', 'SendGrid', 'Stripe', 'Twilio',
]);

export async function reconHibp(domain, apiKey) {
  if (!apiKey) {
    return {
      source: 'hibp',
      skipped: true,
      reason: 'Set HIBP_API_KEY in .env — $3.50/mo at haveibeenpwned.com/API/Key',
    };
  }

  const headers = {
    'hibp-api-key': apiKey,
    'User-Agent':   'proof360-recon/1.0',
  };

  // Run both checks in parallel: breached accounts + domain-level breaches
  const [accountsResult, breachesResult] = await Promise.allSettled([
    hibpGet(`${HIBP_BASE}/breacheddomain/${domain}`, headers),
    hibpGet(`${HIBP_BASE}/breaches?domain=${domain}`, headers),
  ]);

  // breacheddomain returns array of email addresses or 404 if clean
  const accounts = accountsResult.status === 'fulfilled'
    ? (Array.isArray(accountsResult.value) ? accountsResult.value : [])
    : [];

  // breaches?domain returns array of breach objects
  const breaches = breachesResult.status === 'fulfilled'
    ? (Array.isArray(breachesResult.value) ? breachesResult.value : [])
    : [];

  const highSeverityBreaches = breaches.filter(b => HIGH_SEVERITY_BREACHES.has(b.Name));

  const mostRecentDate = breaches
    .map(b => b.BreachDate)
    .sort()
    .pop() || null;

  const mostRecentDaysAgo = mostRecentDate
    ? Math.floor((Date.now() - new Date(mostRecentDate).getTime()) / 86400000)
    : null;

  return {
    source:                   'hibp',
    domain_in_breach:         breaches.length > 0 || accounts.length > 0,
    breach_count:             breaches.length,
    breached_account_count:   accounts.length,
    breach_names:             breaches.map(b => b.Name).slice(0, 15),
    high_severity_breaches:   highSeverityBreaches.map(b => b.Name),
    most_recent_breach_date:  mostRecentDate,
    most_recent_breach_days:  mostRecentDaysAgo,
    breach_is_recent:         mostRecentDaysAgo !== null && mostRecentDaysAgo < 365,
    // Risk classification
    breach_severity:
      highSeverityBreaches.length > 0       ? 'critical' :
      breaches.length > 3                   ? 'high'     :
      breaches.length > 0 || accounts.length > 50 ? 'moderate' :
      accounts.length > 0                   ? 'low'      : 'none',
  };
}

async function hibpGet(url, headers) {
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (res.status === 404) return [];   // clean — not in breach data
  if (res.status === 401) throw new Error('HIBP API key invalid');
  if (res.status === 429) throw new Error('HIBP rate limited — retry after 1500ms');
  if (!res.ok) throw new Error(`HIBP ${res.status}`);

  return res.json();
}
