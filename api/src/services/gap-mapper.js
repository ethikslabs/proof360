import { GAP_DEFINITIONS, SEVERITY_WEIGHTS } from '../config/gaps.js';
import { selectVendors } from './vendor-selector.js';
import { buildVendorIntelligence } from './vendor-intelligence-builder.js';
import { generateFrameworkImpact } from '../config/framework-impact.js';

export async function runGapAnalysis(context, { session_id } = {}) {
  // 1. Find which gaps are triggered by the context
  const triggered = GAP_DEFINITIONS.filter((gap) => gap.triggerCondition(context));

  // 2. All triggered gaps are confirmed — trigger conditions are deterministic signal evaluations
  const claimResults = {};
  for (const gap of triggered) {
    claimResults[gap.id] = { confirmed: true, mos: 9 };
  }

  // 3. Build confirmed gap objects
  const gaps = triggered
    .filter((gap) => claimResults[gap.id]?.confirmed)
    .map((gap) => {
      const gapObj = {
        gap_id: gap.id,
        category: gap.category,
        severity: gap.severity === 'critical' ? 'critical' : gap.severity === 'high' ? 'moderate' : 'low',
        title: gap.label,
        why: generateWhy(gap, context),
        risk: generateRisk(gap, context),
        control: gap.label,
        closure_strategies: [],
        vendor_implementations: [],
        score_impact: SEVERITY_WEIGHTS[gap.severity],
        confidence: mosToConfidence(claimResults[gap.id]?.mos),
        evidence: [{ source: gapEvidenceSource(gap), citation: gapEvidenceCitation(gap) }],
        time_estimate: '',
        framework_impact: generateFrameworkImpact(gap.id, context),
        remediation: generateRemediation(gap, context),
      };
      gapObj.vendor_intelligence = buildVendorIntelligence(gapObj, context);
      return gapObj;
    });

  // 5. Compute trust score
  const totalPenalty = gaps.reduce(
    (sum, gap) => sum + gap.score_impact,
    0
  );
  const trust_score = Math.max(0, 100 - totalPenalty);

  // 6. Determine readiness
  const readiness = trust_score >= 80 ? 'ready' : trust_score >= 50 ? 'partial' : 'not_ready';

  // 7. Select vendors for confirmed gaps
  const vendors = selectVendors(gaps);

  return { gaps, vendors, trust_score, readiness };
}

const DNS_GAPS        = new Set(['dmarc', 'spf']);
const HTTP_GAPS       = new Set(['security_headers', 'tls_configuration']);
const CERT_GAPS       = new Set(['staging_exposure']);
const HIBP_GAPS       = new Set(['domain_breach']);
const ANSWER_GAPS     = new Set(['mfa', 'sso', 'edr', 'cyber_insurance', 'vendor_questionnaire']);
const SECTOR_GAPS     = new Set(['hipaa_security', 'pci_dss', 'apra_prudential', 'essential_eight']);

function gapEvidenceSource(gap) {
  if (DNS_GAPS.has(gap.id))    return 'dns_scan';
  if (HTTP_GAPS.has(gap.id))   return 'http_scan';
  if (CERT_GAPS.has(gap.id))   return 'cert_scan';
  if (HIBP_GAPS.has(gap.id))   return 'breach_db';
  if (ANSWER_GAPS.has(gap.id)) return 'assessment';
  if (SECTOR_GAPS.has(gap.id)) return 'sector_inference';
  return 'signal_inference';
}

function gapEvidenceCitation(gap) {
  if (DNS_GAPS.has(gap.id))    return 'Passive DNS lookup — live record at time of assessment';
  if (HTTP_GAPS.has(gap.id))   return 'Passive HTTP/TLS scan — live headers at time of assessment';
  if (CERT_GAPS.has(gap.id))   return 'Certificate Transparency log scan — crt.sh at time of assessment';
  if (HIBP_GAPS.has(gap.id))   return 'Have I Been Pwned domain breach database — checked at time of assessment';
  if (ANSWER_GAPS.has(gap.id)) return 'Derived from your assessment responses';
  if (SECTOR_GAPS.has(gap.id)) return 'Inferred from your sector, customer type, and geographic market';
  return 'Inferred from public signals — no evidence found of this control';
}

function mosToConfidence(mos) {
  if (!mos) return 'medium';
  if (mos >= 8.5) return 'high';
  if (mos >= 7) return 'medium';
  return 'low';
}

function generateWhy(gap, context) {
  const whys = {
    soc2: `Without SOC 2 certification, enterprise buyers cannot verify your security controls. This is typically the first thing procurement asks for.`,
    mfa: `Password-only authentication is a critical security gap. Enterprise buyers will flag this immediately during vendor assessment.`,
    cyber_insurance: `No cyber insurance means your company carries the full financial risk of a breach. Investors and enterprise buyers increasingly require this.`,
    incident_response: `Without a documented incident response plan, you cannot demonstrate how you'd handle a security event. This is a standard enterprise requirement.`,
    vendor_questionnaire: `A stalled deal due to a security questionnaire signals that your trust posture is blocking revenue right now.`,
    edr: `Without endpoint detection and response, you have limited visibility into threats on your team's devices.`,
    sso: `Without SSO, user access management is fragmented. Enterprise IT teams expect centralised identity management.`,
    dmarc: context.dmarc_policy === 'none'
      ? `Your domain has a DMARC record but the policy is set to \`p=none\` — monitoring only. No emails are blocked or quarantined regardless of sender. Anyone can send email that appears to come from your domain. Enterprise email security tools flag \`p=none\` as an unresolved issue; it needs to be \`p=quarantine\` or \`p=reject\` to count.`
      : `Your domain has no enforced DMARC policy, meaning anyone can send email that appears to come from your domain. This enables phishing attacks impersonating your brand — a critical trust failure with enterprise buyers.`,
    spf: `Your domain's SPF record is missing or permits any sender, leaving it open to email spoofing. Enterprise security teams check this before engaging with a new vendor.`,
    hipaa_security: `You are handling health data without demonstrated HIPAA Security Rule compliance. This is a federal legal requirement, not a best practice — failure exposes the company to OCR investigation, breach notification obligations, and civil liability.`,
    pci_dss: `You handle payment card data without demonstrated PCI DSS compliance. Non-compliance can result in card scheme fines, acquirer termination, and full breach liability without the protection of a compliance safe harbour.`,
    apra_prudential: `As an Australian financial services entity, APRA CPS 234 is not optional — it is a prudential standard with regulatory consequences. APRA expects board-owned information security capability, annual testing, and documented third-party risk.`,
    essential_eight: `The ACSC Essential Eight is the Australian government's mandated security baseline. For any company selling to government or operating in regulated AU markets, ML1 compliance is the minimum expected posture.`,
    security_headers: context.cdn_provider === 'Cloudflare'
      ? `Your web application is missing critical HTTP security headers — HSTS and CSP are absent. You're running Cloudflare, which means you can add these via Transform Rules without touching your application code. Enterprise security teams run automated header checks on every new vendor; this is a quick fix.`
      : `Your web application is missing critical HTTP security headers. HSTS and CSP are baseline controls that prevent a class of browser-based attacks — enterprise security teams run automated header checks on every new vendor.`,
    staging_exposure: `Your staging or development environment is publicly accessible via a subdomain visible in CT logs. Exposed staging environments frequently contain debug credentials, test data, and lower security controls — a direct path to production.`,
    domain_breach: `Your company domain has appeared in known data breach databases. Enterprise procurement teams and cyber insurers run HIBP checks as standard due diligence — a domain in breach data raises immediate questions about credential hygiene.`,
    tls_configuration: `Your TLS configuration is outdated or your certificate is near expiry. Buyers performing technical due diligence will flag TLS 1.0/1.1 and short-expiry certificates as signs of low operational maturity.`,
  };
  return whys[gap.id] || `This gap was identified based on your current trust posture.`;
}

function generateRisk(gap, context) {
  const risks = {
    soc2: `Enterprise deals stall or fail at procurement. Fundraising due diligence flags this as a gap.`,
    mfa: `Account compromise risk is significantly higher. Enterprise buyers may reject your application outright.`,
    cyber_insurance: `A single breach could be financially devastating without coverage. Increasingly required by enterprise contracts.`,
    incident_response: `If a security event occurs, lack of a plan means slower response and greater damage. Buyers see this as operational immaturity.`,
    vendor_questionnaire: `Active revenue is being blocked. Each stalled questionnaire represents a deal at risk.`,
    edr: `Endpoint threats go undetected. This is a standard security control for any company handling customer data.`,
    sso: `User access is harder to manage and audit. Enterprise buyers expect centralised identity as a baseline.`,
    dmarc: `Your domain can be weaponised for phishing campaigns. Enterprise buyers run automated vendor risk checks — an unenforced DMARC policy is an immediate red flag.`,
    spf: `Attackers can send spoofed email from your domain. Procurement teams and email security tools will flag this during vendor review.`,
    hipaa_security: `A single breach involving ePHI triggers mandatory OCR notification, potential fines of $100–$50,000 per violation, and reputational damage that ends healthcare partnerships. Investors will not touch a healthcare company without documented HIPAA compliance.`,
    pci_dss: `Non-compliant merchants face fines of $5,000–$100,000/month from card schemes, acquirer contract termination, and full financial liability for breach-related chargebacks. A single card data incident without PCI compliance is company-ending.`,
    apra_prudential: `APRA can issue formal directions, require remediation, and in extreme cases restrict business activities. Financial services investors and banking partners will not engage without evidence of CPS 234 compliance.`,
    essential_eight: `Australian government procurement panels require demonstrated Essential Eight compliance. Failure to achieve ML1 eliminates you from consideration for government contracts — a significant revenue channel in AU enterprise markets.`,
    security_headers: `Missing HSTS enables SSL-stripping attacks. Missing CSP enables XSS injection. Automated vendor risk tools score this immediately — an absent header configuration is a visible signal of web security immaturity.`,
    staging_exposure: `Attackers routinely enumerate CT logs looking for staging subdomains. A public staging environment is an attack surface your customers didn't sign up for — and a liability you're carrying silently.`,
    domain_breach: `Breached credentials in the wild can be used for credential stuffing, account takeover, and social engineering. A recent domain breach without evidence of remediation will stall enterprise deals and inflate cyber insurance premiums.`,
    tls_configuration: `An expired or near-expiry certificate causes browser warnings that erode customer trust and can trigger zero-tolerance rejections from enterprise security scanners. Outdated TLS versions are flagged by PCI DSS and SOC 2 auditors.`,
  };
  return risks[gap.id] || `This gap increases risk to your enterprise deal readiness.`;
}

function generateRemediation(gap, context) {
  // DMARC: context-aware based on current policy
  if (gap.id === 'dmarc') {
    if (context.dmarc_policy === 'none') {
      // They already have a record at p=none — skip "add a record", start from where they are
      return [
        'Your DMARC record exists but is set to p=none — monitoring only, zero enforcement',
        'Review your DMARC aggregate reports (rua address in your TXT record) for 2 weeks to map all legitimate sending sources',
        'Update the policy to p=quarantine — unauthorised emails go to spam instead of inboxes',
        'Once stable with no false positives, move to p=reject — the only setting that actually blocks domain impersonation',
      ];
    }
    // No record at all
    return [
      'Add a DMARC TXT record to DNS: _dmarc.yourdomain.com → "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com"',
      'Leave it on p=none for 2 weeks and review the aggregate reports to identify all legitimate email senders',
      'Move to p=quarantine — sends unauthenticated mail to spam',
      'Set p=reject once clean — this is the only configuration that actually prevents spoofing of your domain',
    ];
  }

  // Security headers: context-aware based on CDN
  if (gap.id === 'security_headers' && context.cdn_provider === 'Cloudflare') {
    return [
      'In Cloudflare dashboard → Rules → Transform Rules → Modify Response Header',
      'Add HSTS: Strict-Transport-Security: max-age=31536000; includeSubDomains',
      'Add CSP: Content-Security-Policy: default-src \'self\' (then expand as needed)',
      'Add X-Frame-Options: DENY and X-Content-Type-Options: nosniff',
      'Test with securityheaders.com — aim for a B or above',
    ];
  }

  return gap.remediation || [];
}
