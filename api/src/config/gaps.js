// Gap definitions — severity weights and inference-to-gap mapping
// triggerCondition and claimTemplate stubs for Phase 1; fully populated in Phase 3 (task 5.4)

export const SEVERITY_WEIGHTS = {
  critical: 20,
  high: 10,
  medium: 5,
  low: 2,
};

export const GAP_DEFINITIONS = [
  {
    id: 'soc2',
    severity: 'critical',
    label: 'SOC 2 certification gap',
    category: 'governance',
    triggerCondition: (ctx) => ['none', 'unknown'].includes(ctx.compliance_status),
    claimTemplate: (ctx) => ({
      question: 'Does this company have SOC 2 Type II certification?',
      evidence: `Compliance status: ${ctx.compliance_status}. Customer type: ${ctx.customer_type}. Infrastructure: ${ctx.infrastructure}.`,
    }),
    framework_impact: [
      { framework: 'SOC 2', control: 'Trust Services Criteria', blocker: true },
      { framework: 'ISO 27001', control: 'A.5.35 — Independent review', blocker: false },
    ],
    remediation: [
      'Engage a compliance platform (Vanta, Drata, Secureframe) to map your current control state',
      'Prioritise CC6 (logical access) and CC7 (system operations) — these are the most common audit failures',
      'Target SOC 2 Type I first (3–4 months) to unblock deals while Type II audit runs',
    ],
  },
  {
    id: 'mfa',
    severity: 'critical',
    label: 'Multi-factor authentication gap',
    category: 'identity',
    triggerCondition: (ctx) => ctx.identity_model === 'password_only',
    claimTemplate: (ctx) => ({
      question: 'Does this company enforce multi-factor authentication?',
      evidence: `Identity model: ${ctx.identity_model}. Infrastructure: ${ctx.infrastructure}.`,
    }),
    framework_impact: [
      { framework: 'SOC 2', control: 'CC6.1 — Logical access controls', blocker: true },
      { framework: 'ISO 27001', control: 'A.8.5 — Secure authentication', blocker: true },
      { framework: 'Essential Eight', control: 'MFA — required from ML1', blocker: true },
      { framework: 'APRA CPS 234', control: 'Para 15 — Strong authentication', blocker: true },
    ],
    remediation: [
      'Enable MFA in your identity provider (Google Workspace, Microsoft 365, or Okta) — takes under an hour',
      'Enforce for admin accounts first, then roll out company-wide within 30 days',
      'Document the policy and test quarterly — this evidence is required for SOC 2 audits',
    ],
  },
  {
    id: 'cyber_insurance',
    severity: 'critical',
    label: 'Cyber insurance gap',
    category: 'governance',
    triggerCondition: (ctx) => ['none', 'unknown'].includes(ctx.insurance_status),
    claimTemplate: (ctx) => ({
      question: 'Does this company have cyber insurance coverage?',
      evidence: `Insurance status: ${ctx.insurance_status}. Data sensitivity: ${ctx.data_sensitivity}.`,
    }),
    framework_impact: [
      { framework: 'Enterprise contracts', control: 'Vendor risk clause — common in F500 MSAs', blocker: true },
      { framework: 'ISO 27001', control: 'A.5.31 — Legal and contractual requirements', blocker: false },
    ],
    remediation: [
      'Obtain a quote from a cyber insurer (Coalition, Cowbell, or through your broker) — most policies close within 2 weeks',
      'You will need to evidence MFA and basic security controls during the underwriting process',
      'A $1M policy typically costs $3–8k/yr at seed stage — price rises sharply without MFA in place',
    ],
  },
  {
    id: 'incident_response',
    severity: 'high',
    label: 'Incident response documentation gap',
    category: 'governance',
    triggerCondition: (ctx) => ['none', 'planning'].includes(ctx.compliance_status),
    claimTemplate: (ctx) => ({
      question: 'Does this company have a documented incident response plan?',
      evidence: `Compliance status: ${ctx.compliance_status}. Customer type: ${ctx.customer_type}.`,
    }),
    framework_impact: [
      { framework: 'SOC 2', control: 'CC7.3–CC7.5 — Incident response', blocker: true },
      { framework: 'ISO 27001', control: 'A.5.24–A.5.26 — Incident management', blocker: true },
      { framework: 'APRA CPS 234', control: 'Para 36–45 — Incident response', blocker: true },
    ],
    remediation: [
      'Draft a 1-page incident response runbook: detection → containment → notification → recovery',
      'Define who gets called first, who owns customer notification, and what the 72-hour regulatory clock means for your data',
      'Test it once with a tabletop exercise — auditors will ask if you have rehearsed it',
    ],
  },
  {
    id: 'vendor_questionnaire',
    severity: 'high',
    label: 'Vendor questionnaire readiness gap',
    category: 'governance',
    triggerCondition: (ctx) => ctx.questionnaire_experience === 'stalled_deal',
    claimTemplate: (ctx) => ({
      question: 'Can this company complete a vendor security questionnaire?',
      evidence: `Questionnaire experience: ${ctx.questionnaire_experience}. Compliance: ${ctx.compliance_status}.`,
    }),
    framework_impact: [
      { framework: 'Enterprise procurement', control: 'Vendor security review — standard in F500 onboarding', blocker: true },
      { framework: 'SOC 2', control: 'Completing this report closes most questionnaire gaps', blocker: false },
    ],
    remediation: [
      'Build a security one-pager: what data you hold, who can access it, how it is encrypted, your incident contact',
      'Maintain a self-assessment document mapped to SIG Lite or CAIQ — most enterprise questionnaires are a subset of these',
      'Once SOC 2 Type I is in place, use the report to answer 80% of questionnaire questions automatically',
    ],
  },
  {
    id: 'edr',
    severity: 'high',
    label: 'Endpoint detection & response gap',
    category: 'infrastructure',
    triggerCondition: (ctx) => ['password_only', 'mfa_only'].includes(ctx.identity_model),
    claimTemplate: (ctx) => ({
      question: 'Does this company have endpoint detection and response?',
      evidence: `Identity model: ${ctx.identity_model}. Infrastructure: ${ctx.infrastructure}.`,
    }),
    framework_impact: [
      { framework: 'SOC 2', control: 'CC6.8 — Preventing unauthorised access', blocker: true },
      { framework: 'ISO 27001', control: 'A.8.7 — Protection against malware', blocker: true },
      { framework: 'Essential Eight', control: 'Malicious code prevention — ML1', blocker: true },
    ],
    remediation: [
      'Deploy an EDR agent on all endpoints — CrowdStrike Falcon Go, SentinelOne Singularity, or Sophos Intercept X all offer SMB tiers',
      'Enable cloud management so you have a single console showing all device health',
      'Set up automated alerting — enterprise buyers will ask if you have 24/7 visibility on endpoint threats',
    ],
  },
  {
    id: 'sso',
    severity: 'medium',
    label: 'Single sign-on gap',
    category: 'identity',
    triggerCondition: (ctx) => ['mfa_only', 'password_only'].includes(ctx.identity_model),
    claimTemplate: (ctx) => ({
      question: 'Does this company use SSO for user access management?',
      evidence: `Identity model: ${ctx.identity_model}. Customer type: ${ctx.customer_type}.`,
    }),
    framework_impact: [
      { framework: 'SOC 2', control: 'CC6.1 — Access management', blocker: false },
      { framework: 'ISO 27001', control: 'A.8.2 — Privileged access rights', blocker: false },
      { framework: 'Enterprise procurement', control: 'Required for most enterprise IT integration', blocker: true },
    ],
    remediation: [
      'Connect your SaaS tools to Google Workspace or Microsoft 365 SSO — most apps support this natively at no extra cost',
      'For enterprise-grade SAML/OIDC across all tools, evaluate Okta or Microsoft Entra',
      'SSO also means instant offboarding — a key risk control that auditors check',
    ],
  },
  {
    id: 'founder_trust',
    severity: 'high',
    label: 'Founder & leadership trust gap',
    category: 'human',
    // Always surfaces — every founder has an unassessed human factor.
    // Severity is 'high' because investors and enterprise buyers consistently
    // rate founder risk as a top concern. Not scrapeable — requires self-assessment.
    triggerCondition: (ctx) => ctx.founder_profile_completed !== true,
    claimTemplate: (ctx) => ({
      question: 'Has the founding team completed a structured leadership trust assessment?',
      evidence: `Founder profile completed: ${ctx.founder_profile_completed ?? false}. Stage: ${ctx.stage}. Customer type: ${ctx.customer_type}.`,
    }),
    framework_impact: [
      { framework: 'Fundraising due diligence', control: 'Founder background — standard in Series A+', blocker: true },
      { framework: 'ISO 27001', control: 'A.6.1 — Responsibilities and segregation of duties', blocker: false },
    ],
    remediation: [
      'Complete a structured leadership trust profile — covers background, decision history, and accountability structures',
      'Establish a documented conflict of interest policy and an independent advisor or board observer',
      'Investors and enterprise buyers want to see that the founder has governance around them, not just competence',
    ],
  },
  {
    id: 'dmarc',
    severity: 'high',
    label: 'Email domain protection gap (DMARC)',
    category: 'infrastructure',
    // Triggered when DMARC is missing or set to monitor-only (p=none).
    // p=quarantine or p=reject means the domain is actually protected.
    // Source: passive DNS lookup — definitive, not inferred.
    triggerCondition: (ctx) => ['missing', 'none'].includes(ctx.dmarc_policy),
    claimTemplate: (ctx) => ({
      question: 'Does this company have DMARC email authentication enforced on their domain?',
      evidence: `DMARC policy: ${ctx.dmarc_policy ?? 'not checked'}. SPF policy: ${ctx.spf_policy ?? 'not checked'}. MX provider: ${ctx.mx_provider ?? 'unknown'}.`,
    }),
    framework_impact: [
      { framework: 'SOC 2', control: 'CC6.7 — Transmission of information', blocker: true },
      { framework: 'ISO 27001', control: 'A.8.21 — Security of network services', blocker: true },
      { framework: 'Essential Eight', control: 'Email filtering — required from ML1', blocker: true },
      { framework: 'ACSC Guidelines', control: 'DMARC enforcement — recommended baseline', blocker: false },
    ],
    remediation: [
      'Add a DMARC TXT record to your DNS: start with p=none to monitor (zero impact on mail flow)',
      'Review the daily DMARC reports for 2 weeks to identify legitimate senders — then move to p=quarantine',
      'Set p=reject once clean — this is the only configuration that actually prevents spoofing of your domain',
    ],
  },
  {
    id: 'spf',
    severity: 'medium',
    label: 'Email spoofing protection gap (SPF)',
    category: 'infrastructure',
    // Triggered when SPF is missing or configured to pass all senders (+all / ?all).
    // Soft fail (~all) is weak but better than nothing — only flag missing or open.
    triggerCondition: (ctx) => ['missing', 'open'].includes(ctx.spf_policy),
    claimTemplate: (ctx) => ({
      question: 'Does this company have SPF email authentication configured correctly?',
      evidence: `SPF policy: ${ctx.spf_policy ?? 'not checked'}. DMARC policy: ${ctx.dmarc_policy ?? 'not checked'}. MX provider: ${ctx.mx_provider ?? 'unknown'}.`,
    }),
    framework_impact: [
      { framework: 'SOC 2', control: 'CC6.7 — Transmission of information', blocker: false },
      { framework: 'ISO 27001', control: 'A.8.21 — Security of network services', blocker: false },
      { framework: 'Essential Eight', control: 'Email filtering — required from ML1', blocker: true },
    ],
    remediation: [
      'Add a TXT record to your DNS: v=spf1 include:your-mail-provider.com -all (replace with your actual provider)',
      'Use -all (hard fail) not ~all (soft fail) — soft fail does not prevent spoofing, it just marks it',
      'If you use Google Workspace: v=spf1 include:_spf.google.com -all  — takes effect within minutes',
    ],
  },
  // ── Sector-specific gaps ────────────────────────────────────────────────
  {
    id: 'hipaa_security',
    severity: 'critical',
    label: 'HIPAA Security Rule compliance gap',
    category: 'governance',
    triggerCondition: (ctx) =>
      ctx.sector === 'healthcare' || ctx.data_sensitivity === 'Healthcare data',
    claimTemplate: (ctx) => ({
      question: 'Does this company comply with the HIPAA Security Rule for electronic protected health information?',
      evidence: `Sector: ${ctx.sector}. Data sensitivity: ${ctx.data_sensitivity}. Compliance status: ${ctx.compliance_status}.`,
    }),
    remediation: [
      'Conduct a formal HIPAA Security Risk Analysis — this is a legal requirement under §164.308(a)(1), not optional',
      'Document all systems that touch ePHI and implement access controls, audit logging, and encryption at rest and in transit',
      'Establish a Business Associate Agreement (BAA) process for every vendor that accesses patient data',
    ],
  },
  {
    id: 'pci_dss',
    severity: 'critical',
    label: 'PCI DSS compliance gap',
    category: 'governance',
    triggerCondition: (ctx) =>
      ctx.handles_payments === true || ctx.handles_payments === 'true' ||
      ctx.sector === 'fintech' || ctx.sector === 'ecommerce',
    claimTemplate: (ctx) => ({
      question: 'Does this company meet PCI DSS requirements for handling payment card data?',
      evidence: `Sector: ${ctx.sector}. Handles payments: ${ctx.handles_payments}. Compliance status: ${ctx.compliance_status}.`,
    }),
    remediation: [
      'Determine your PCI DSS scope — the fewer systems that touch cardholder data, the smaller the audit surface',
      'Use a payment processor (Stripe, Braintree) that handles card data directly, reducing your scope to SAQ A',
      'Complete a Self-Assessment Questionnaire (SAQ) annually — your acquirer will require it',
    ],
  },
  {
    id: 'apra_prudential',
    severity: 'critical',
    label: 'APRA CPS 234 compliance gap',
    category: 'governance',
    triggerCondition: (ctx) =>
      ctx.sector === 'financial_services' &&
      (ctx.geo_market === 'AU' || ctx.geo_market === 'Global'),
    claimTemplate: (ctx) => ({
      question: 'Does this company meet APRA CPS 234 information security requirements for Australian financial services?',
      evidence: `Sector: ${ctx.sector}. Geo market: ${ctx.geo_market}. Compliance status: ${ctx.compliance_status}.`,
    }),
    remediation: [
      'Establish an Information Security Policy that satisfies APRA CPS 234 Para 19 — board-level ownership is required',
      'Implement capability testing under Para 32 — APRA expects annual penetration testing and incident simulation',
      'Review third-party (vendor) information security arrangements — CPS 234 Para 22–25 requires documented due diligence',
    ],
  },
  {
    id: 'essential_eight',
    severity: 'high',
    label: 'Essential Eight baseline gap',
    category: 'governance',
    triggerCondition: (ctx) =>
      ctx.sector === 'government' || ctx.geo_market === 'AU',
    claimTemplate: (ctx) => ({
      question: 'Does this company meet the ACSC Essential Eight Maturity Level 1 baseline?',
      evidence: `Sector: ${ctx.sector}. Geo market: ${ctx.geo_market}. Identity model: ${ctx.identity_model}. Compliance status: ${ctx.compliance_status}.`,
    }),
    remediation: [
      'Run the ACSC Essential Eight self-assessment tool to establish your current maturity level across all eight controls',
      'ML1 priority: application control, patch applications, configure Microsoft Office macros, MFA, daily backups',
      'Government procurement in AU increasingly requires ML2 — plan the roadmap even if ML1 is the immediate target',
    ],
  },

  // ── Recon-derived gaps (HTTP/TLS/CT/HIBP) ───────────────────────────────
  {
    id: 'security_headers',
    severity: 'medium',
    label: 'Web security headers gap',
    category: 'infrastructure',
    triggerCondition: (ctx) => ctx.has_hsts === false || ctx.has_csp === false,
    claimTemplate: (ctx) => ({
      question: 'Does this company have HTTP security headers correctly configured?',
      evidence: `HSTS: ${ctx.has_hsts}. CSP: ${ctx.has_csp}. Security headers score: ${ctx.security_headers_score ?? 'unknown'}/6.`,
    }),
    remediation: [
      'Add Strict-Transport-Security (HSTS) with max-age=31536000 — this forces HTTPS and is required by SOC 2 CC6.7',
      'Add a Content-Security-Policy header — even a basic policy blocks the most common XSS attack vectors',
      'Use securityheaders.com to scan your domain and get a prioritised fix list — takes 10 minutes to get from F to A',
    ],
  },
  {
    id: 'staging_exposure',
    severity: 'high',
    label: 'Staging/dev environment exposure gap',
    category: 'infrastructure',
    triggerCondition: (ctx) => ctx.has_staging_exposure === true,
    claimTemplate: (ctx) => ({
      question: 'Does this company have staging or development environments publicly accessible on subdomains?',
      evidence: `Exposed subdomains: ${(ctx.exposed_sensitive_subdomains || []).join(', ')}. Found via CT log scan.`,
    }),
    remediation: [
      'Move staging environments behind authentication or a VPN — public staging is a common route for data exfiltration',
      'Audit your CT logs at crt.sh for all subdomains your domain has ever had a certificate issued for',
      'Implement a subdomain inventory process — any subdomain that exists should be intentional and documented',
    ],
  },
  {
    id: 'domain_breach',
    severity: 'critical',
    label: 'Domain credentials in breach data',
    category: 'infrastructure',
    triggerCondition: (ctx) => ctx.domain_in_breach === true,
    claimTemplate: (ctx) => ({
      question: 'Has this company\'s domain appeared in known data breach datasets?',
      evidence: `Breach count: ${ctx.breach_count}. Severity: ${ctx.breach_severity}. Recent breach: ${ctx.breach_is_recent}.`,
    }),
    remediation: [
      'Force a password reset for all accounts on the affected domain — treat all credentials as compromised',
      'Enable MFA immediately if not already in place — breached passwords with MFA are significantly less exploitable',
      'Check haveibeenpwned.com/domain-search to see the full scope — and monitor it on an ongoing basis',
    ],
  },
  {
    id: 'tls_configuration',
    severity: 'medium',
    label: 'TLS/certificate configuration gap',
    category: 'infrastructure',
    triggerCondition: (ctx) =>
      ctx.tls_is_current === false ||
      ctx.has_old_tls === true ||
      (ctx.ssl_grade_num !== null && ctx.ssl_grade_num < 8) ||
      (ctx.cert_expiry_days !== null && ctx.cert_expiry_days < 14),
    claimTemplate: (ctx) => ({
      question: 'Does this company have TLS correctly configured with a current protocol version?',
      evidence: [
        ctx.ssl_grade ? `SSL Labs grade: ${ctx.ssl_grade}.` : '',
        ctx.has_old_tls ? 'TLS 1.0/1.1 still enabled.' : '',
        `TLS version: ${ctx.tls_version}.`,
        `Cert expiry days: ${ctx.cert_expiry_days}.`,
      ].filter(Boolean).join(' '),
    }),
    remediation: [
      'Disable TLS 1.0 and 1.1 — they are deprecated and flagged in every security audit. TLS 1.2 is the minimum, 1.3 is preferred',
      'Set up automatic certificate renewal — Let\'s Encrypt with certbot or any modern hosting platform handles this for free',
      'Test your TLS configuration at ssllabs.com/ssltest — aim for A or A+',
    ],
  },
  {
    id: 'ip_reputation',
    severity: 'high',
    label: 'Server IP flagged for abuse',
    category: 'infrastructure',
    triggerCondition: (ctx) => ctx.ip_is_abusive === true,
    claimTemplate: (ctx) => ({
      question: 'Has this company\'s server IP been flagged for malicious activity?',
      evidence: [
        `Abuse confidence score: ${ctx.abuse_confidence_score ?? 0}%.`,
        ctx.ip_total_reports ? `${ctx.ip_total_reports} abuse reports filed against this IP.` : '',
      ].filter(Boolean).join(' '),
    }),
    remediation: [
      'Rotate to a clean IP address — if you\'re on a shared host, move to a dedicated instance or a different cloud provider range',
      'Review server logs for signs of compromise — an abusive IP often means the server has been used for spam or attacks',
      'Check AbuseIPDB for the full report history at abuseipdb.com',
    ],
  },
];

// Enterprise signals schema — collected on every session for dataset moat
export const ENTERPRISE_SIGNALS_SCHEMA = {
  security_page_detected: false,
  trust_centre_detected: false,
  soc2_mentioned: false,
  pricing_enterprise_tier: false,
};
