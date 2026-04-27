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
    why: "Without SOC 2 Type II, enterprise buyers can't verify your security controls. It's the first question in vendor assessment — and a deal blocker above $50k ACV.",
    risk: 'Enterprise deals stall at procurement. Fundraising due diligence flags this immediately. Cyber insurers may decline or charge significantly higher premiums.',
    time_estimate: '6–9 months with a compliance platform',
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
      'Prioritise CC6 (logical access) and CC7 (system operations) — the most common audit failures',
      'Target SOC 2 Type I first (3–4 months) to unblock deals while the Type II audit runs',
    ],
  },
  {
    id: 'mfa',
    severity: 'critical',
    label: 'Multi-factor authentication gap',
    category: 'identity',
    why: "Multi-factor authentication is the first thing enterprise buyers check. Without it, a single stolen password becomes a full breach of your systems.",
    risk: 'Cyber insurers require it. Enterprise contracts mandate it. A single compromised credential becomes a company-wide breach.',
    time_estimate: 'Under 1 hour to enable, 30 days to enforce company-wide',
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
      'Document the policy and test quarterly — evidence required for SOC 2 audits',
    ],
  },
  {
    id: 'cyber_insurance',
    severity: 'critical',
    label: 'Cyber insurance gap',
    category: 'governance',
    why: "Enterprise MSAs routinely require vendors to carry cyber insurance. Without it, you can't sign contracts — your deal dies at legal review, not product review.",
    risk: "You can't close enterprise deals. Incidents have no financial backstop. Your personal and company liability is uncapped.",
    time_estimate: '2 weeks for a basic $1M policy',
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
      'Get a quote from Coalition, Cowbell, or your broker — most policies close within 2 weeks',
      "You'll need to demonstrate MFA and basic security controls during underwriting",
      'A $1M policy costs $3–8k/yr at seed stage — price rises sharply without MFA',
    ],
  },
  {
    id: 'incident_response',
    severity: 'high',
    label: 'Incident response plan gap',
    category: 'governance',
    why: "Enterprise buyers and auditors will ask for your incident response plan in every security review. Without one, you're improvising during your worst day.",
    risk: 'A breach without a plan means chaos, missed regulatory notification deadlines, and fines. Auditors treat it as a fundamental control failure.',
    time_estimate: '1–2 days to draft a basic runbook',
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
      'Draft a 1-page runbook: detection → containment → notification → recovery',
      'Define who gets called first, who owns customer notification, what the 72-hour regulatory clock means',
      'Run one tabletop exercise — auditors will ask if you have rehearsed it',
    ],
  },
  {
    id: 'vendor_questionnaire',
    severity: 'high',
    label: 'Vendor questionnaire readiness gap',
    category: 'governance',
    why: "Enterprise procurement teams send security questionnaires to every vendor. If you can't complete one confidently, deals stall in procurement for months.",
    risk: 'Deals die in vendor review queues. Security teams flag you as high-risk. You lose to competitors who have their paperwork ready.',
    time_estimate: '1–2 weeks to build a baseline response library',
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
      'Build a security one-pager: what data you hold, who accesses it, how it is encrypted, your incident contact',
      'Maintain a self-assessment mapped to SIG Lite or CAIQ — most enterprise questionnaires are a subset of these',
      'Once SOC 2 Type I is in place, use the report to answer 80% of questions automatically',
    ],
  },
  {
    id: 'edr',
    severity: 'high',
    label: 'Endpoint detection & response gap',
    category: 'infrastructure',
    why: "Endpoint detection catches attackers on your laptops and servers before they reach your data. Without it, breaches can run undetected for months.",
    risk: 'Ransomware, data exfiltration, and credential theft go undetected. Enterprise contracts and cyber insurance increasingly mandate endpoint protection.',
    time_estimate: 'Same-day deployment with a cloud-managed agent',
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
      'Deploy an EDR agent on all endpoints — CrowdStrike Falcon Go, SentinelOne, or Sophos Intercept X all have SMB tiers',
      'Enable cloud management for a single console showing all device health',
      'Set up automated alerting — enterprise buyers ask if you have 24/7 visibility on endpoint threats',
    ],
  },
  {
    id: 'sso',
    severity: 'medium',
    label: 'Single sign-on gap',
    category: 'identity',
    why: "SSO means you control access to every tool from one place. Without it, you have dozens of separate passwords — and you can't offboard someone instantly.",
    risk: 'A departed employee retains access to SaaS tools for days. Enterprise IT teams require SSO before onboarding vendors.',
    time_estimate: '1–2 days if using Google Workspace or Microsoft 365',
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
      'Connect your SaaS tools to Google Workspace or Microsoft 365 SSO — most apps support this natively',
      'For enterprise-grade SAML/OIDC, evaluate Okta or Microsoft Entra ID',
      'SSO also means instant offboarding — a key risk control auditors check',
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
    why: "Investors and enterprise buyers don't just buy the product — they're betting on you. Without documented governance around the founding team, you're asking for blind trust.",
    risk: 'Fundraising due diligence stalls at "tell me about the founders". Series A investors ask directly about accountability structures and co-founder agreements.',
    time_estimate: '1–2 weeks for a structured leadership profile',
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
      'Complete a structured leadership trust profile — covers background, decision history, accountability structures',
      'Establish a documented conflict of interest policy and an independent advisor or board observer',
      'Investors and enterprise buyers want governance around the founder, not just competence',
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
    why: "Without DMARC enforcement, anyone can send email pretending to be you. Your customers, investors, and partners are one spoofed email away from being scammed.",
    risk: 'Brand damage, phishing attacks against your customers, and failed enterprise security reviews that check email authentication as standard.',
    time_estimate: '30 minutes to add the DNS record',
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
      'Review aggregate DMARC reports for 2 weeks to identify legitimate senders',
      'Move to p=reject once clean — the only setting that actually prevents domain spoofing',
    ],
  },
  {
    id: 'spf',
    severity: 'medium',
    label: 'Email spoofing protection gap (SPF)',
    category: 'infrastructure',
    // Triggered when SPF is missing or configured to pass all senders (+all / ?all).
    // Soft fail (~all) is weak but better than nothing — only flag missing or open.
    why: "SPF tells receiving mail servers which servers are allowed to send email from your domain. Without it, spammers can impersonate your company freely.",
    risk: 'Your domain reputation deteriorates. Legitimate emails start landing in spam. Enterprise IT teams reject you as a vendor.',
    time_estimate: '10 minutes to add the DNS record',
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
      'Add a TXT record to your DNS: v=spf1 include:your-mail-provider.com -all',
      'Use -all (hard fail) not ~all (soft fail) — soft fail does not prevent spoofing',
      'For Google Workspace: v=spf1 include:_spf.google.com -all — takes effect within minutes',
    ],
  },
  // ── Sector-specific gaps ────────────────────────────────────────────────
  {
    id: 'hipaa_security',
    severity: 'critical',
    label: 'HIPAA Security Rule compliance gap',
    category: 'governance',
    why: "If you touch patient health data, HIPAA compliance is not optional — it's a legal requirement with criminal penalties for violations.",
    risk: 'Fines of up to $1.9M per violation category. Criminal charges for willful neglect. Loss of contracts with healthcare providers and insurers.',
    time_estimate: '3–6 months for a formal compliance program',
    triggerCondition: (ctx) =>
      ctx.sector === 'healthcare' || ctx.data_sensitivity === 'Healthcare data',
    claimTemplate: (ctx) => ({
      question: 'Does this company comply with the HIPAA Security Rule for electronic protected health information?',
      evidence: `Sector: ${ctx.sector}. Data sensitivity: ${ctx.data_sensitivity}. Compliance status: ${ctx.compliance_status}.`,
    }),
    remediation: [
      'Conduct a formal HIPAA Security Risk Analysis — required under §164.308(a)(1), not optional',
      'Document all systems that touch ePHI and implement access controls, audit logging, and encryption',
      'Establish a Business Associate Agreement (BAA) process for every vendor that accesses patient data',
    ],
  },
  {
    id: 'pci_dss',
    severity: 'critical',
    label: 'PCI DSS compliance gap',
    category: 'governance',
    why: "If you handle payment card data, PCI DSS compliance is mandatory. Card brands and acquirers require it — and they can terminate your ability to process payments.",
    risk: 'Loss of ability to process payments. Fines from card brands. Liability for fraudulent charges if you suffer a breach.',
    time_estimate: '1–3 months depending on scope',
    triggerCondition: (ctx) =>
      ctx.handles_payments === true || ctx.handles_payments === 'true' ||
      ctx.sector === 'fintech' || ctx.sector === 'ecommerce',
    claimTemplate: (ctx) => ({
      question: 'Does this company meet PCI DSS requirements for handling payment card data?',
      evidence: `Sector: ${ctx.sector}. Handles payments: ${ctx.handles_payments}. Compliance status: ${ctx.compliance_status}.`,
    }),
    remediation: [
      'Determine your PCI DSS scope — the fewer systems that touch cardholder data, the smaller the audit surface',
      'Use a payment processor (Stripe, Braintree) that handles card data directly, reducing scope to SAQ A',
      'Complete a Self-Assessment Questionnaire (SAQ) annually — your acquirer will require it',
    ],
  },
  {
    id: 'apra_prudential',
    severity: 'critical',
    label: 'APRA CPS 234 compliance gap',
    category: 'governance',
    why: "Australian financial services companies are legally required to meet APRA CPS 234. APRA has enforcement powers including licence suspension.",
    risk: 'Regulatory enforcement action, significant fines, and reputational damage. Loss of AFSL or banking licence in extreme cases.',
    time_estimate: '6–12 months for full compliance',
    triggerCondition: (ctx) =>
      ctx.sector === 'financial_services' &&
      (ctx.geo_market === 'AU' || ctx.geo_market === 'Global'),
    claimTemplate: (ctx) => ({
      question: 'Does this company meet APRA CPS 234 information security requirements for Australian financial services?',
      evidence: `Sector: ${ctx.sector}. Geo market: ${ctx.geo_market}. Compliance status: ${ctx.compliance_status}.`,
    }),
    remediation: [
      'Establish an Information Security Policy satisfying APRA CPS 234 Para 19 — board-level ownership required',
      'Implement capability testing under Para 32 — APRA expects annual penetration testing and incident simulation',
      'Review third-party security arrangements — CPS 234 Para 22–25 requires documented vendor due diligence',
    ],
  },
  {
    id: 'essential_eight',
    severity: 'high',
    label: 'Essential Eight baseline gap',
    category: 'governance',
    why: "The ACSC Essential Eight is the Australian government's baseline security framework. Government procurement increasingly requires ML2 — if you sell to government, this is a gate.",
    risk: 'Disqualified from government contracts. Flagged in enterprise security reviews. Increasingly required by regulated-sector buyers.',
    time_estimate: '2–4 months to achieve ML1',
    triggerCondition: (ctx) =>
      ctx.sector === 'government' || ctx.geo_market === 'AU',
    claimTemplate: (ctx) => ({
      question: 'Does this company meet the ACSC Essential Eight Maturity Level 1 baseline?',
      evidence: `Sector: ${ctx.sector}. Geo market: ${ctx.geo_market}. Identity model: ${ctx.identity_model}. Compliance status: ${ctx.compliance_status}.`,
    }),
    remediation: [
      'Run the ACSC Essential Eight self-assessment tool to establish your current maturity level',
      'ML1 priority: application control, patch applications, MFA, restrict macros, daily backups',
      'Government procurement in AU increasingly requires ML2 — plan the roadmap even if ML1 is the immediate target',
    ],
  },
  // ── Recon-derived gaps (HTTP/TLS/CT/HIBP) ───────────────────────────────
  {
    id: 'security_headers',
    severity: 'medium',
    label: 'Web security headers gap',
    category: 'infrastructure',
    why: "Security headers tell browsers how to protect your users. Missing headers show up immediately in enterprise security scans — and they signal poor hygiene.",
    risk: 'Failed vendor security reviews. XSS and clickjacking vulnerabilities. Your site scores an F on securityheaders.com — visible to any buyer who checks.',
    time_estimate: '1–2 hours to configure',
    triggerCondition: (ctx) => ctx.has_hsts === false || ctx.has_csp === false,
    claimTemplate: (ctx) => ({
      question: 'Does this company have HTTP security headers correctly configured?',
      evidence: `HSTS: ${ctx.has_hsts}. CSP: ${ctx.has_csp}. Security headers score: ${ctx.security_headers_score ?? 'unknown'}/6.`,
    }),
    remediation: [
      'Add Strict-Transport-Security (HSTS) with max-age=31536000 — forces HTTPS, required by SOC 2 CC6.7',
      'Add a Content-Security-Policy header — even a basic policy blocks the most common XSS vectors',
      'Use securityheaders.com to get a prioritised fix list — 10 minutes to go from F to A',
    ],
  },
  {
    id: 'staging_exposure',
    severity: 'high',
    label: 'Staging/dev environment exposure gap',
    category: 'infrastructure',
    why: "Public staging environments often have weaker security and real data. They're a common attack vector — and they signal poor security hygiene to buyers.",
    risk: 'Data exfiltration via staging environments. Real customer data exposed. Automated scanners find these within hours.',
    time_estimate: '1 day to restrict access',
    triggerCondition: (ctx) => ctx.has_staging_exposure === true,
    claimTemplate: (ctx) => ({
      question: 'Does this company have staging or development environments publicly accessible on subdomains?',
      evidence: `Exposed subdomains: ${(ctx.exposed_sensitive_subdomains || []).join(', ')}. Found via CT log scan.`,
    }),
    remediation: [
      'Move staging environments behind authentication or a VPN — public staging is a common route for data exfiltration',
      'Audit your CT logs at crt.sh for all subdomains your domain has ever had a certificate issued for',
      'Implement a subdomain inventory — any subdomain should be intentional and documented',
    ],
  },
  {
    id: 'domain_breach',
    severity: 'critical',
    label: 'Domain credentials in breach data',
    category: 'infrastructure',
    why: "Your company's email addresses and passwords have appeared in known data breaches. Attackers actively use this data to compromise accounts.",
    risk: 'Account takeovers, lateral movement through your systems, data theft. Breached credentials + no MFA = a trivially easy breach.',
    time_estimate: '24–48 hours for immediate remediation',
    triggerCondition: (ctx) => ctx.domain_in_breach === true,
    claimTemplate: (ctx) => ({
      question: "Has this company's domain appeared in known data breach datasets?",
      evidence: `Breach count: ${ctx.breach_count}. Severity: ${ctx.breach_severity}. Recent breach: ${ctx.breach_is_recent}.`,
    }),
    remediation: [
      'Force a password reset for all accounts on the affected domain — treat all credentials as compromised',
      'Enable MFA immediately if not already in place — breached passwords + MFA stops most exploitation',
      'Check haveibeenpwned.com/domain-search to see full scope — monitor it ongoing',
    ],
  },
  {
    id: 'tls_configuration',
    severity: 'medium',
    label: 'TLS/certificate configuration gap',
    category: 'infrastructure',
    why: "Outdated TLS versions (1.0, 1.1) are deprecated and flagged in every security audit. Expired certificates take your service offline with zero warning.",
    risk: 'Failed enterprise security reviews. Browser warnings for your users. Service outages from expired certificates.',
    time_estimate: '1–2 hours to reconfigure',
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
      'Disable TLS 1.0 and 1.1 — deprecated and flagged in every audit. TLS 1.2 minimum, 1.3 preferred',
      "Set up automatic certificate renewal — Let's Encrypt with certbot handles this for free",
      'Test at ssllabs.com/ssltest — aim for A or A+',
    ],
  },
  {
    id: 'ip_reputation',
    severity: 'high',
    label: 'Server IP flagged for abuse',
    category: 'infrastructure',
    why: "Your server's IP address has been flagged for malicious activity. This may indicate compromise, or you're on a shared host with bad neighbours.",
    risk: 'Email deliverability blocked. Enterprise network security tools automatically reject traffic from flagged IPs. Signals potential server compromise.',
    time_estimate: '1–2 days to rotate to a clean IP',
    triggerCondition: (ctx) => ctx.ip_is_abusive === true,
    claimTemplate: (ctx) => ({
      question: "Has this company's server IP been flagged for malicious activity?",
      evidence: [
        `Abuse confidence score: ${ctx.abuse_confidence_score ?? 0}%.`,
        ctx.ip_total_reports ? `${ctx.ip_total_reports} abuse reports filed against this IP.` : '',
      ].filter(Boolean).join(' '),
    }),
    remediation: [
      'Rotate to a clean IP — if on a shared host, move to a dedicated instance or different cloud provider range',
      'Review server logs for signs of compromise — an abusive IP often means the server has been used for spam or attacks',
      'Check the full report history at abuseipdb.com',
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
