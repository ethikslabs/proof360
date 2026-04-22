// GitHub org passive recon — GitHub public API, no auth required
// Rate limit: 60 req/hr unauthenticated. All calls are fire-and-forget safe.
// Extracts: public repo count, primary language, security policy presence,
// days since last commit, dependabot status.

const GH_API = 'https://api.github.com';
const HEADERS = {
  'User-Agent': 'proof360-recon/1.0',
  'Accept': 'application/vnd.github.v3+json',
};
const TIMEOUT_MS = 8000;

export async function reconGithub(domain, companyName) {
  const orgName = await detectOrgName(domain, companyName);
  if (!orgName) return { source: 'github', found: false };

  const [orgResult, reposResult, secPolicyResult] = await Promise.allSettled([
    ghGet(`/orgs/${orgName}`),
    ghGet(`/orgs/${orgName}/repos?sort=pushed&per_page=30&type=public`),
    checkSecurityPolicy(orgName),
  ]);

  const org    = orgResult.status    === 'fulfilled' && !orgResult.value?.message   ? orgResult.value    : null;
  const repos  = reposResult.status  === 'fulfilled' && Array.isArray(reposResult.value) ? reposResult.value : [];
  const hasSecPolicy = secPolicyResult.status === 'fulfilled' ? secPolicyResult.value : false;

  if (!org && repos.length === 0) return { source: 'github', found: false };

  // Language distribution
  const languages = {};
  for (const repo of repos) {
    if (repo.language && !repo.fork && !repo.archived) {
      languages[repo.language] = (languages[repo.language] || 0) + 1;
    }
  }
  const sortedLangs = Object.entries(languages).sort(([, a], [, b]) => b - a);
  const primaryLanguage = sortedLangs[0]?.[0] || null;

  // Recency
  const lastPushed = repos[0]?.pushed_at || null;
  const daysSinceLastCommit = lastPushed
    ? Math.floor((Date.now() - new Date(lastPushed).getTime()) / 86400000)
    : null;

  // Open source activity signals
  const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
  const hasForkedRepos = repos.some(r => r.fork);
  const archivedCount = repos.filter(r => r.archived).length;
  const activeRepos = repos.filter(r => !r.archived && !r.fork);

  // Dependabot — check if any active repo has it enabled (requires auth for full check,
  // but we can infer from repo topics / description mentions)
  const dependabotHint = activeRepos.some(r =>
    (r.topics || []).some(t => t.includes('dependabot') || t.includes('security'))
  );

  return {
    source:                  'github',
    found:                   true,
    org:                     orgName,
    public_repo_count:       org?.public_repos ?? repos.length,
    primary_language:        primaryLanguage,
    tech_languages:          sortedLangs.map(([lang]) => lang),
    has_security_policy:     hasSecPolicy,
    days_since_last_commit:  daysSinceLastCommit,
    total_stars:             totalStars,
    active_repo_count:       activeRepos.length,
    archived_repo_count:     archivedCount,
    dependabot_signal:       dependabotHint,
    follower_count:          org?.followers ?? 0,
    profile_url:             `https://github.com/${orgName}`,
  };
}

// ── Org name detection ─────────────────────────────────────────────────────

async function detectOrgName(domain, companyName) {
  const candidates = buildCandidates(domain, companyName);

  for (const candidate of candidates) {
    try {
      const data = await ghGet(`/orgs/${candidate}`);
      if (data && !data.message) return candidate;

      // Also try as a user (solo founders)
      const userData = await ghGet(`/users/${candidate}`);
      if (userData && !userData.message && userData.type === 'Organization') return candidate;
    } catch {
      // next candidate
    }
  }
  return null;
}

function buildCandidates(domain, companyName) {
  const candidates = new Set();
  // From domain: acme.io → acme
  const domainBase = domain.split('.')[0].toLowerCase();
  candidates.add(domainBase);

  if (companyName) {
    // Company name variations
    const normalized = companyName.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim();
    candidates.add(normalized.replace(/\s+/g, ''));   // "acme corp" → "acmecorp"
    candidates.add(normalized.replace(/\s+/g, '-'));  // "acme corp" → "acme-corp"
    candidates.add(normalized.split(/\s+/)[0]);       // "acme corp" → "acme"
  }
  return [...candidates].filter(c => c.length >= 2);
}

// ── Security policy detection ──────────────────────────────────────────────

async function checkSecurityPolicy(org) {
  // Check .github repo for SECURITY.md (org-wide policy)
  const res = await ghGetRaw(`/repos/${org}/.github/contents/SECURITY.md`);
  if (res.ok) return true;

  // Check most recently pushed repo for SECURITY.md
  const repos = await ghGet(`/orgs/${org}/repos?sort=pushed&per_page=5`).catch(() => []);
  if (!Array.isArray(repos)) return false;

  for (const repo of repos.slice(0, 3)) {
    const res2 = await ghGetRaw(`/repos/${org}/${repo.name}/contents/SECURITY.md`);
    if (res2.ok) return true;
  }
  return false;
}

// ── HTTP helpers ───────────────────────────────────────────────────────────

async function ghGet(path) {
  const res = await fetch(`${GH_API}${path}`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return null;
  return res.json();
}

async function ghGetRaw(path) {
  return fetch(`${GH_API}${path}`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch(() => ({ ok: false }));
}
