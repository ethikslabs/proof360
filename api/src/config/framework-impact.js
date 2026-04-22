// Dynamic framework impact — maps gap + context to the frameworks actually relevant
// for this company. Replaces hardcoded framework_impact arrays on gap definitions.

// Base frameworks every gap touches, regardless of sector
const BASE_IMPACT = {
  soc2:               [{ framework: 'SOC 2', control: 'Trust Services Criteria', blocker: true }],
  mfa:                [{ framework: 'SOC 2', control: 'CC6.1 — Logical access controls', blocker: true },
                       { framework: 'ISO 27001', control: 'A.8.5 — Secure authentication', blocker: true }],
  cyber_insurance:    [{ framework: 'Enterprise contracts', control: 'Vendor risk clause — common in F500 MSAs', blocker: true }],
  incident_response:  [{ framework: 'SOC 2', control: 'CC7.3–CC7.5 — Incident response', blocker: true },
                       { framework: 'ISO 27001', control: 'A.5.24–A.5.26 — Incident management', blocker: true }],
  vendor_questionnaire:[{ framework: 'Enterprise procurement', control: 'Vendor security review — standard in F500 onboarding', blocker: true }],
  edr:                [{ framework: 'SOC 2', control: 'CC6.8 — Preventing unauthorised access', blocker: true },
                       { framework: 'ISO 27001', control: 'A.8.7 — Protection against malware', blocker: true }],
  sso:                [{ framework: 'SOC 2', control: 'CC6.1 — Access management', blocker: false },
                       { framework: 'Enterprise procurement', control: 'Required for most enterprise IT integration', blocker: true }],
  founder_trust:      [{ framework: 'Fundraising due diligence', control: 'Founder background — standard in Series A+', blocker: true }],
  dmarc:              [{ framework: 'SOC 2', control: 'CC6.7 — Transmission of information', blocker: true },
                       { framework: 'ISO 27001', control: 'A.8.21 — Security of network services', blocker: true }],
  spf:                [{ framework: 'ISO 27001', control: 'A.8.21 — Security of network services', blocker: false }],
  hipaa_security:     [{ framework: 'HIPAA', control: 'Security Rule — §164.308–§164.312', blocker: true }],
  pci_dss:            [{ framework: 'PCI DSS', control: 'Requirements 1–12', blocker: true }],
  apra_prudential:    [{ framework: 'APRA CPS 234', control: 'Information security capability', blocker: true }],
  essential_eight:    [{ framework: 'Essential Eight', control: 'ACSC baseline — all maturity levels', blocker: true }],
  security_headers:   [{ framework: 'SOC 2', control: 'CC6.6 — Logical access from outside boundaries', blocker: false },
                       { framework: 'ISO 27001', control: 'A.8.23 — Web filtering', blocker: false }],
  staging_exposure:   [{ framework: 'SOC 2', control: 'CC6.1 — Restrict access to authorised users', blocker: true },
                       { framework: 'ISO 27001', control: 'A.8.31 — Separation of dev/test/prod', blocker: true }],
  domain_breach:      [{ framework: 'SOC 2', control: 'CC9.2 — Vendor and third-party risk', blocker: true },
                       { framework: 'Enterprise procurement', control: 'Credential hygiene — standard in security questionnaires', blocker: true }],
  tls_configuration:  [{ framework: 'PCI DSS', control: 'Req 4.2 — Protect transmission with strong cryptography', blocker: true },
                       { framework: 'SOC 2', control: 'CC6.7 — Encryption in transit', blocker: false }],
};

// Sector overlays — additional frameworks stacked on top of base
const SECTOR_OVERLAYS = {
  healthcare: {
    mfa:               [{ framework: 'HIPAA', control: '§164.312(d) — Person authentication', blocker: true }],
    incident_response: [{ framework: 'HIPAA', control: '§164.308(a)(6) — Security incident procedures', blocker: true },
                        { framework: 'HIPAA', control: '§164.404 — Breach notification (72hr)', blocker: true }],
    soc2:              [{ framework: 'HIPAA', control: '§164.308(a)(1) — Risk analysis required', blocker: true }],
    dmarc:             [{ framework: 'HIPAA', control: '§164.312(e) — Transmission security', blocker: true }],
    edr:               [{ framework: 'HIPAA', control: '§164.312(a)(2)(iv) — Encryption and decryption', blocker: true }],
    cyber_insurance:   [{ framework: 'HIPAA', control: 'PHI breach liability — class action exposure', blocker: true }],
  },
  fintech: {
    mfa:               [{ framework: 'PCI DSS', control: 'Req 8.4 — MFA for all access to CDE', blocker: true }],
    incident_response: [{ framework: 'PCI DSS', control: 'Req 12.10 — Incident response plan', blocker: true }],
    soc2:              [{ framework: 'PCI DSS', control: 'Req 6 — Develop secure systems', blocker: false }],
    edr:               [{ framework: 'PCI DSS', control: 'Req 5 — Anti-malware protection', blocker: true }],
    cyber_insurance:   [{ framework: 'PCI DSS', control: 'Req 12.3 — Risk management', blocker: false }],
  },
  financial_services: {
    mfa:               [{ framework: 'APRA CPS 234', control: 'Para 15 — Strong authentication', blocker: true }],
    incident_response: [{ framework: 'APRA CPS 234', control: 'Para 36–45 — Incident response', blocker: true }],
    soc2:              [{ framework: 'APRA CPS 234', control: 'Para 21 — Third-party assessment', blocker: false }],
    edr:               [{ framework: 'APRA CPS 234', control: 'Para 27 — Detection controls', blocker: true }],
    dmarc:             [{ framework: 'APRA CPS 234', control: 'Para 27 — Email channel security', blocker: true }],
  },
  government: {
    mfa:               [{ framework: 'Essential Eight', control: 'MFA — mandatory from ML1', blocker: true },
                        { framework: 'IRAP', control: 'ISM-0974 — Authentication', blocker: true }],
    edr:               [{ framework: 'Essential Eight', control: 'Malicious code prevention — ML1', blocker: true }],
    incident_response: [{ framework: 'Essential Eight', control: 'Incident response plan — ML2', blocker: true },
                        { framework: 'IRAP', control: 'ISM-0140 — Incident management', blocker: true }],
    soc2:              [{ framework: 'IRAP', control: 'PROTECTED assessment required', blocker: true }],
    dmarc:             [{ framework: 'Essential Eight', control: 'Email filtering — ML1', blocker: true },
                        { framework: 'ACSC', control: 'DMARC enforcement — mandated for .gov.au', blocker: true }],
    spf:               [{ framework: 'Essential Eight', control: 'Email filtering — ML1', blocker: true }],
  },
  ecommerce: {
    mfa:               [{ framework: 'PCI DSS', control: 'Req 8.4 — MFA for admin access', blocker: true }],
    incident_response: [{ framework: 'PCI DSS', control: 'Req 12.10 — Incident response plan', blocker: true }],
    cyber_insurance:   [{ framework: 'PCI DSS', control: 'Cardholder data breach liability', blocker: true }],
  },
  legal: {
    incident_response: [{ framework: 'Privacy Act 1988 (AU)', control: 'NDB Scheme — 30-day notification', blocker: true }],
    mfa:               [{ framework: 'Legal Professional Privilege', control: 'Data access controls — regulatory expectation', blocker: true }],
    cyber_insurance:   [{ framework: 'Legal sector', control: 'Client data breach — professional indemnity exposure', blocker: true }],
  },
  education: {
    incident_response: [{ framework: 'Privacy Act 1988 (AU)', control: 'NDB Scheme — student data', blocker: true }],
    mfa:               [{ framework: 'FERPA', control: 'Student data access controls', blocker: false }],
  },
};

// Geo overlays — geography-specific frameworks
const GEO_OVERLAYS = {
  AU: {
    incident_response: [{ framework: 'Privacy Act 1988', control: 'NDB Scheme — 30-day notification obligation', blocker: true }],
    dmarc:             [{ framework: 'ACSC', control: 'DMARC enforcement — recommended baseline', blocker: false }],
    edr:               [{ framework: 'Essential Eight', control: 'Malicious code prevention — ML1', blocker: true }],
    mfa:               [{ framework: 'Essential Eight', control: 'MFA — required from ML1', blocker: true }],
  },
  SG: {
    incident_response: [{ framework: 'PDPA (Singapore)', control: 'Breach notification — 3 days', blocker: true }],
    mfa:               [{ framework: 'MAS TRM', control: 'Technology Risk Management — access controls', blocker: false }],
  },
  UK: {
    incident_response: [{ framework: 'UK GDPR', control: 'Art 33 — 72-hour breach notification', blocker: true }],
    mfa:               [{ framework: 'UK GDPR', control: 'Art 25 — Security by design', blocker: false }],
    cyber_insurance:   [{ framework: 'UK GDPR', control: 'Art 83 — Fines up to £17.5M or 4% global revenue', blocker: true }],
  },
  US: {
    incident_response: [{ framework: 'State breach notification laws', control: 'Varies by state — fastest is 30 days', blocker: true }],
  },
};

// Payments overlay — triggered if handles_payments === true
const PAYMENTS_OVERLAY = {
  mfa:               [{ framework: 'PCI DSS v4', control: 'Req 8.4 — MFA for all CDE access', blocker: true }],
  incident_response: [{ framework: 'PCI DSS v4', control: 'Req 12.10 — Incident response plan', blocker: true }],
  edr:               [{ framework: 'PCI DSS v4', control: 'Req 5 — Anti-malware for all systems', blocker: true }],
  sso:               [{ framework: 'PCI DSS v4', control: 'Req 8 — Identification and authentication', blocker: false }],
  cyber_insurance:   [{ framework: 'PCI DSS v4', control: 'Cardholder data breach — acquirer liability', blocker: true }],
};

// Data sensitivity overlay
const DATA_SENSITIVITY_OVERLAYS = {
  'Healthcare data': {
    // Treat as healthcare sector even if sector wasn't detected
    mfa:               [{ framework: 'HIPAA', control: '§164.312(d) — Person authentication', blocker: true }],
    incident_response: [{ framework: 'HIPAA', control: '§164.308(a)(6) — Security incident procedures', blocker: true }],
    edr:               [{ framework: 'HIPAA', control: '§164.312(a)(2)(iv) — Encryption controls', blocker: true }],
    dmarc:             [{ framework: 'HIPAA', control: '§164.312(e) — Transmission security', blocker: true }],
  },
  'Financial data': {
    mfa:               [{ framework: 'PCI DSS', control: 'Req 8.4 — MFA for financial data access', blocker: true }],
    incident_response: [{ framework: 'PCI DSS', control: 'Req 12.10 — Incident response', blocker: true }],
  },
};

function dedupe(impacts) {
  const seen = new Set();
  return impacts.filter(fi => {
    const key = `${fi.framework}::${fi.control}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function generateFrameworkImpact(gapId, context) {
  const impacts = [];

  // 1. Base
  impacts.push(...(BASE_IMPACT[gapId] || []));

  // 2. Sector overlay
  const sector = context.sector;
  if (sector && SECTOR_OVERLAYS[sector]?.[gapId]) {
    impacts.push(...SECTOR_OVERLAYS[sector][gapId]);
  }

  // 3. Data sensitivity overlay (catches sector misses)
  const dataSensitivity = context.data_sensitivity;
  if (dataSensitivity && DATA_SENSITIVITY_OVERLAYS[dataSensitivity]?.[gapId]) {
    impacts.push(...DATA_SENSITIVITY_OVERLAYS[dataSensitivity][gapId]);
  }

  // 4. Geo overlay
  const geo = context.geo_market;
  if (geo && GEO_OVERLAYS[geo]?.[gapId]) {
    impacts.push(...GEO_OVERLAYS[geo][gapId]);
  }

  // 5. Payments overlay
  if (context.handles_payments === true || context.handles_payments === 'true') {
    if (PAYMENTS_OVERLAY[gapId]) impacts.push(...PAYMENTS_OVERLAY[gapId]);
  }

  return dedupe(impacts);
}
