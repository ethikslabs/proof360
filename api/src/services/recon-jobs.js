// Job listing passive recon — uses Firecrawl (already in stack)
// Extracts security/compliance hiring signals from careers pages.
// The question being answered: "Is this company investing in security?
// Are they actively closing compliance gaps? What stack are they on?"

import { record as recordConsumption } from './consumption-emitter.js';

const CAREER_PATHS = [
  '/careers', '/jobs', '/join', '/work-with-us',
  '/about/careers', '/company/jobs', '/company/careers',
  '/en/careers', '/en/jobs',
];

// Keywords that indicate active security investment
const SECURITY_ROLES = [
  'security engineer', 'security analyst', 'ciso', 'infosec',
  'information security', 'devsecops', 'appsec', 'application security',
  'penetration test', 'pen test', 'vulnerability', 'threat',
  'soc analyst', 'incident response',
];

// Keywords that indicate compliance work in progress
const COMPLIANCE_SIGNALS = [
  'soc 2', 'soc2', 'iso 27001', 'iso27001', 'hipaa', 'pci dss', 'pcidss',
  'gdpr', 'compliance', 'grc', 'risk and compliance', 'information security manager',
  'privacy officer', 'dpo', 'data protection',
];

// Tech stack signals from JDs
const TECH_SIGNALS = [
  'aws', 'gcp', 'google cloud', 'azure', 'kubernetes', 'k8s', 'docker',
  'terraform', 'ansible', 'ci/cd', 'github actions', 'jenkins',
  'react', 'next.js', 'vue', 'angular', 'typescript', 'node.js', 'node',
  'python', 'go', 'rust', 'java', 'kotlin', 'swift',
  'postgres', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
  'microservices', 'serverless', 'lambda',
];

// Leadership/seniority signals
const LEADERSHIP_SIGNALS = [
  'vp of engineering', 'vp engineering', 'head of engineering',
  'director of engineering', 'engineering manager', 'head of security',
  'chief security', 'chief technology', 'cto',
];

export async function reconJobs(domain, firecrawl, session_id) {
  if (!firecrawl) return { source: 'jobs', skipped: true, reason: 'no_firecrawl' };

  let content = null;
  let foundPath = null;

  // Try career paths until we find content
  for (const path of CAREER_PATHS) {
    try {
      const result = await firecrawl.scrapeUrl(`https://${domain}${path}`, {
        formats: ['markdown'],
        timeout: 8000,
      });
      if (result?.success && result.markdown && result.markdown.length > 300) {
        content = result.markdown;
        foundPath = path;
        break;
      }
    } catch {
      // path not found or timed out — try next
    }
  }

  recordConsumption({ session_id, source: 'jobs', units: 1, unit_type: 'api_calls', success: !!content, error: content ? null : 'no_careers_page' });

  if (!content) return { source: 'jobs', found: false };

  return analyzeJobContent(content, domain, foundPath);
}

function analyzeJobContent(text, domain, foundPath) {
  const lower = text.toLowerCase();

  // Security role detection
  const securityRolesFound  = SECURITY_ROLES.filter(k => lower.includes(k));
  const complianceSignals   = COMPLIANCE_SIGNALS.filter(k => lower.includes(k));
  const techSignals         = TECH_SIGNALS.filter(k => lower.includes(k));
  const leadershipSignals   = LEADERSHIP_SIGNALS.filter(k => lower.includes(k));

  // Estimate open role count from heading patterns
  // Job listings typically use ## Role Title or # Role Title
  const headingMatches = text.match(/^#{1,3}\s+.{10,80}$/gm) || [];
  const listMatches    = text.match(/^[\*\-]\s+.{10,80}$/gm) || [];
  const estimatedRoles = Math.max(headingMatches.length, Math.floor(listMatches.length / 5));

  // Engineering vs non-engineering ratio
  const engKeywords    = ['engineer', 'developer', 'architect', 'devops', 'sre', 'data scientist'];
  const engMentions    = engKeywords.filter(k => lower.includes(k)).length;
  const isEngineeringHeavy = engMentions >= 2;

  // Remote work signals (relevant for endpoint/MDM gap)
  const hasRemote = lower.includes('remote') || lower.includes('work from home') || lower.includes('distributed');

  return {
    source:                  'jobs',
    found:                   true,
    careers_path:            foundPath,
    // Security investment signals
    security_hire_signal:    securityRolesFound.length > 0,
    security_roles_found:    securityRolesFound,
    security_hire_count:     securityRolesFound.length,
    // Compliance signals
    compliance_hire_signal:  complianceSignals.length > 0,
    compliance_keywords:     complianceSignals,
    // Tech stack
    tech_stack_signals:      techSignals,
    // Operational
    estimated_open_roles:    Math.min(estimatedRoles, 100),
    is_engineering_heavy:    isEngineeringHeavy,
    leadership_hiring:       leadershipSignals.length > 0,
    has_remote_roles:        hasRemote,
    // Derived: if no security roles and >10 estimated open roles, that's a gap signal
    security_team_gap_signal: securityRolesFound.length === 0 && estimatedRoles > 8,
  };
}
