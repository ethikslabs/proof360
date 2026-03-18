// Vendor catalog — partner data, quadrant positions, distributor routing
// Single source of truth for vendor graph, scoring, and distributor logic.
// distributor: "dicker" | "ingram" | "direct"
// Dicker AU catalog verified 2026-03-18. Ingram AU catalog verified 2026-03-18.

export const VENDORS = {

  // ── GRC & COMPLIANCE AUTOMATION ─────────────────────────────────────────

  vanta: {
    id: 'vanta', display_name: 'Vanta', initials: 'V',
    closes: ['soc2', 'incident_response'],
    distributor: 'direct',
    cost_range: '$7-15k/yr', timeline: '6-9 months',
    is_partner: true, deal_label: '20% off first year',
    best_for: 'Seed to Series B, AWS-native stacks',
    summary: 'Fastest to SOC 2. Connects to your existing stack in an afternoon.',
    referral_url: 'https://vanta.com/?ref=proof360',
  },
  vanta_msp: {
    id: 'vanta_msp', display_name: 'Vanta (MSP)', initials: 'VM',
    closes: ['soc2', 'incident_response', 'compliance'],
    distributor: 'direct',
    cost_range: null, timeline: null,
    is_partner: true, deal_label: '20% off first year',
    best_for: 'MSPs and multi-tenant compliance delivery',
    summary: 'Vanta MSP program — manage compliance across multiple client accounts.',
    referral_url: 'https://vanta.com/?ref=proof360',
  },
  drata: {
    id: 'drata', display_name: 'Drata', initials: 'D',
    closes: ['soc2', 'incident_response'],
    distributor: 'direct',
    cost_range: '$8-18k/yr', timeline: '6-12 months',
    is_partner: true, deal_label: '15% off first year',
    best_for: 'Larger teams, complex environments',
    summary: 'More customisation, longer setup. Better for Series B and beyond.',
    referral_url: 'https://drata.com/?ref=proof360',
  },
  secureframe: {
    id: 'secureframe', display_name: 'Secureframe', initials: 'SF',
    closes: ['soc2'],
    distributor: 'direct',
    cost_range: '$8-15k/yr', timeline: '6-9 months',
    is_partner: false, deal_label: null,
    best_for: 'Mid-market, broader framework coverage',
    summary: 'Good mid-market option. Strong for companies needing multiple frameworks.',
    referral_url: null,
  },
  apollo_secure: {
    id: 'apollo_secure', display_name: 'Apollo Secure', initials: 'AP',
    closes: ['soc2', 'compliance', 'security_baseline'],
    distributor: 'direct',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Fast compliance for startups and scale-ups, AU-based',
    summary: 'Automated security and compliance for startups. AU-based.',
    referral_url: 'https://www.apollosecure.com/',
  },
  trustwave: {
    id: 'trustwave', display_name: 'Trustwave', initials: 'TW',
    closes: ['soc2', 'compliance'],
    distributor: 'dicker',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Managed security services, compliance',
    summary: 'Managed SOC and compliance services. Strong AU presence.',
    referral_url: null,
  },
  docusign: {
    id: 'docusign', display_name: 'DocuSign', initials: 'DS',
    closes: ['audit_trail', 'compliance'],
    distributor: 'ingram',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Audit trail, contract compliance',
    summary: 'eSignature and agreement cloud. Closes audit trail gaps.',
    referral_url: null,
  },

  // ── FOUNDER TRUST ────────────────────────────────────────────────────────
  // Surfaces the human factor — what investors and enterprise buyers assess
  // but no other trust tool measures. 10-question free teaser in report,
  // 100+ question deep profile as paid upsell via ReachLX.

  reachlx: {
    id: 'reachlx', display_name: 'ReachLX', initials: 'RL',
    closes: ['founder_trust'],
    distributor: 'direct',
    cost_range: null, timeline: null,
    is_partner: true, deal_label: 'Free 10-question profile in report',
    best_for: 'Founders preparing for investor due diligence or enterprise sales',
    summary: 'Leadership and founder trust profiling. 10-question snapshot free in report. Full 100+ question profile available as paid deep-dive.',
    referral_url: 'https://lxplatform.io/',
  },

  // ── AI GOVERNANCE ────────────────────────────────────────────────────────

  cognitiveview: {
    id: 'cognitiveview', display_name: 'CognitiveView', initials: 'CG',
    closes: ['ai_governance', 'ai_risk', 'ai_compliance'],
    distributor: 'direct',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'AI startups needing governance, EU AI Act, NIST AI RMF compliance',
    summary: 'AI governance platform — AI registry, risk controls, responsible AI compliance. NIST, EU AI Act, OAIC aligned.',
    referral_url: 'https://www.cognitiveview.com/',
  },

  // ── IDENTITY & IAM ───────────────────────────────────────────────────────

  okta: {
    id: 'okta', display_name: 'Okta', initials: 'O',
    closes: ['mfa', 'sso', 'identity'],
    distributor: 'direct',
    cost_range: '$3-8k/yr', timeline: '2-4 weeks',
    is_partner: false, deal_label: null,
    best_for: 'Enterprise identity, broad integrations',
    summary: 'Industry standard for enterprise IAM.',
    referral_url: null,
  },
  cisco_duo: {
    id: 'cisco_duo', display_name: 'Cisco Duo', initials: 'CD',
    closes: ['mfa', 'identity'],
    distributor: 'dicker',
    cost_range: '$2-5k/yr', timeline: '1-2 weeks',
    is_partner: true, deal_label: null,
    best_for: 'Fast MFA rollout, startup-friendly',
    summary: 'Lightweight MFA. Up and running in a day.',
    referral_url: null,
  },
  microsoft: {
    id: 'microsoft', display_name: 'Microsoft', initials: 'MS',
    closes: ['mfa', 'sso', 'identity', 'endpoint_protection'],
    distributor: 'dicker',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Microsoft 365 environments, Entra ID',
    summary: 'Entra ID covers identity, MFA, and SSO for M365 stacks.',
    referral_url: null,
  },
  rsa: {
    id: 'rsa', display_name: 'RSA', initials: 'RS',
    closes: ['mfa', 'identity'],
    distributor: 'dicker',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Enterprise MFA, regulated industries',
    summary: 'Enterprise-grade MFA and identity assurance.',
    referral_url: null,
  },
  keeper: {
    id: 'keeper', display_name: 'Keeper', initials: 'KP',
    closes: ['credential_security', 'identity'],
    distributor: 'ingram',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Credential security, password management',
    summary: 'Enterprise password manager and secrets vault.',
    referral_url: null,
  },
  jamf: {
    id: 'jamf', display_name: 'Jamf', initials: 'JF',
    closes: ['device_identity', 'endpoint_protection'],
    distributor: 'ingram',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Apple-first environments, device identity',
    summary: 'Device management and identity for Apple fleets.',
    referral_url: null,
  },

  // ── NETWORK SECURITY ─────────────────────────────────────────────────────

  cloudflare: {
    id: 'cloudflare', display_name: 'Cloudflare', initials: 'CF',
    closes: ['network_perimeter', 'waf', 'ddos', 'zero_trust'],
    distributor: 'dicker',
    cost_range: '$2-6k/yr', timeline: '2-4 weeks',
    is_partner: true, deal_label: null,
    best_for: 'Network security, zero trust access',
    summary: 'Network perimeter, zero trust, and DDoS in one platform.',
    referral_url: null,
  },
  fortinet: {
    id: 'fortinet', display_name: 'Fortinet', initials: 'FT',
    closes: ['network_perimeter', 'firewall'],
    distributor: 'ingram',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Firewall, SD-WAN, enterprise network security',
    summary: 'Broad network security platform. Strong in AU enterprise.',
    referral_url: null,
  },
  palo_alto: {
    id: 'palo_alto', display_name: 'Palo Alto', initials: 'PA',
    closes: ['network_perimeter', 'firewall', 'edr'],
    distributor: 'ingram',
    cost_range: '$3-8k/yr', timeline: '2-3 weeks',
    is_partner: false, deal_label: null,
    best_for: 'Broader security suite, enterprise',
    summary: 'Full security platform. Better for larger environments.',
    referral_url: null,
  },
  sonicwall: {
    id: 'sonicwall', display_name: 'SonicWall', initials: 'SW',
    closes: ['network_perimeter', 'firewall'],
    distributor: 'dicker',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'SMB firewall, cost-effective network security',
    summary: 'Firewall and network security for SMB and mid-market.',
    referral_url: null,
  },
  juniper: {
    id: 'juniper', display_name: 'Juniper', initials: 'JN',
    closes: ['network_perimeter'],
    distributor: 'dicker',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Enterprise networking, campus and cloud',
    summary: 'Enterprise network infrastructure with security integration.',
    referral_url: null,
  },

  // ── ENDPOINT PROTECTION ──────────────────────────────────────────────────

  crowdstrike: {
    id: 'crowdstrike', display_name: 'CrowdStrike', initials: 'CS',
    closes: ['edr', 'endpoint_protection'],
    distributor: 'dicker',
    cost_range: '$3-8k/yr', timeline: '2-3 weeks',
    is_partner: false, deal_label: null,
    best_for: 'Enterprise EDR, strong detection',
    summary: 'Leading endpoint protection. Enterprise-grade detection.',
    referral_url: null,
  },
  trellix: {
    id: 'trellix', display_name: 'Trellix', initials: 'TX',
    closes: ['endpoint_protection', 'threat_detection'],
    distributor: 'ingram',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Endpoint and XDR, enterprise',
    summary: 'Extended detection and response across endpoints and email.',
    referral_url: null,
  },
  trendmicro: {
    id: 'trendmicro', display_name: 'Trend Micro', initials: 'TM',
    closes: ['endpoint_protection', 'email_security'],
    distributor: 'dicker',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Cloud and endpoint security, SMB to enterprise',
    summary: 'Layered endpoint and email security. Strong AU support.',
    referral_url: null,
  },
  sophos: {
    id: 'sophos', display_name: 'Sophos', initials: 'SP',
    closes: ['endpoint_protection', 'network_perimeter'],
    distributor: 'ingram',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'SMB endpoint + firewall, managed detection',
    summary: 'Unified endpoint and network security. Good SMB fit.',
    referral_url: null,
  },

  // ── DATA RESILIENCE ──────────────────────────────────────────────────────

  veeam: {
    id: 'veeam', display_name: 'Veeam', initials: 'VE',
    closes: ['backup', 'recovery'],
    distributor: 'dicker',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Backup and recovery, hybrid and cloud',
    summary: 'Leading backup platform. Covers on-prem, cloud, and hybrid.',
    referral_url: null,
  },
  cohesity: {
    id: 'cohesity', display_name: 'Cohesity', initials: 'CH',
    closes: ['backup', 'recovery'],
    distributor: 'ingram',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Data management, ransomware recovery',
    summary: 'Modern data management and backup with ransomware protection.',
    referral_url: null,
  },
  netapp: {
    id: 'netapp', display_name: 'NetApp', initials: 'NA',
    closes: ['backup', 'data_resilience'],
    distributor: 'dicker',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Enterprise storage, hybrid cloud data',
    summary: 'Enterprise data storage and protection.',
    referral_url: null,
  },
  nutanix: {
    id: 'nutanix', display_name: 'Nutanix', initials: 'NX',
    closes: ['infra_resilience'],
    distributor: 'ingram',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'HCI, infrastructure resilience',
    summary: 'Hyperconverged infrastructure with built-in resilience.',
    referral_url: null,
  },
  veritas: {
    id: 'veritas', display_name: 'Veritas', initials: 'VR',
    closes: ['backup', 'recovery'],
    distributor: 'dicker',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Enterprise backup, compliance archiving',
    summary: 'Enterprise backup and compliance data management.',
    referral_url: null,
  },

  // ── SECURITY OPERATIONS ──────────────────────────────────────────────────

  opentext: {
    id: 'opentext', display_name: 'OpenText Cybersecurity', initials: 'OT',
    closes: ['siem', 'email_security', 'compliance'],
    distributor: 'dicker',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'SIEM, email security, compliance signals',
    summary: 'Cybersecurity operations and email threat protection.',
    referral_url: null,
  },
  proofpoint: {
    id: 'proofpoint', display_name: 'ProofPoint', initials: 'PP',
    closes: ['email_security', 'threat_detection'],
    distributor: 'ingram',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Email security, phishing protection',
    summary: 'Leading email security and threat intelligence.',
    referral_url: null,
  },
  blancco: {
    id: 'blancco', display_name: 'Blancco', initials: 'BL',
    closes: ['data_sanitisation', 'compliance'],
    distributor: 'ingram',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Data erasure, device lifecycle compliance',
    summary: 'Certified data erasure for compliance and device disposal.',
    referral_url: null,
  },

  // ── CYBER INSURANCE ──────────────────────────────────────────────────────

  austbrokers: {
    id: 'austbrokers', display_name: 'AustBrokers CyberPro', initials: 'AB',
    closes: ['cyber_insurance'],
    distributor: 'direct',
    cost_range: '$3-10k/yr', timeline: '1-2 weeks',
    is_partner: false, deal_label: null,
    best_for: 'AU-based startups, fast quoting',
    summary: 'Specialist cyber insurance broker. Quick turnaround.',
    referral_url: null,
  },

};

// ── VENDOR CATEGORIES & QUADRANT POSITIONS ───────────────────────────────────
// Frontend renders coordinates from here — do not hardcode positions in components.
// Full quadrant data to be populated in Phase 3 (task 5.5).

export const VENDOR_CATEGORIES = {
  'GRC & compliance automation': {
    quadrant_axes: {
      x_left: 'Slower to audit-ready', x_right: 'Faster to audit-ready',
      y_top: 'More expensive', y_bottom: 'Cheaper',
    },
    vendor_positions: {
      vanta:         { x: 0.72, y: 0.28 },
      vanta_msp:     { x: 0.70, y: 0.30 },
      drata:         { x: 0.62, y: 0.38 },
      secureframe:   { x: 0.55, y: 0.52 },
      apollo_secure: { x: 0.65, y: 0.65 },
      trustwave:     { x: 0.40, y: 0.45 },
    },
  },
  'Founder trust': {
    quadrant_axes: {
      x_left: 'Surface level', x_right: 'Deep profile',
      y_top: 'Investor-focused', y_bottom: 'Self-development focused',
    },
    vendor_positions: {
      reachlx: { x: 0.60, y: 0.35 },
    },
  },
  'AI governance': {
    quadrant_axes: {
      x_left: 'Manual / advisory', x_right: 'Automated / continuous',
      y_top: 'Enterprise-focused', y_bottom: 'Startup-focused',
    },
    vendor_positions: {
      cognitiveview: { x: 0.65, y: 0.60 },
    },
  },
  'Identity & IAM': {
    quadrant_axes: {
      x_left: 'Developer-led', x_right: 'IT / admin-led',
      y_top: 'Enterprise-focused', y_bottom: 'Startup-focused',
    },
    vendor_positions: {
      okta:      { x: 0.75, y: 0.25 },
      cisco_duo: { x: 0.35, y: 0.65 },
      microsoft: { x: 0.70, y: 0.35 },
      rsa:       { x: 0.80, y: 0.20 },
    },
  },
  'Network security': {
    quadrant_axes: {
      x_left: 'SMB-focused', x_right: 'Enterprise-focused',
      y_top: 'Broader platform', y_bottom: 'Point solution',
    },
    vendor_positions: {
      cloudflare: { x: 0.55, y: 0.40 },
      palo_alto:  { x: 0.82, y: 0.25 },
      fortinet:   { x: 0.70, y: 0.30 },
      sonicwall:  { x: 0.30, y: 0.60 },
      juniper:    { x: 0.75, y: 0.35 },
    },
  },
  'Endpoint protection': {
    quadrant_axes: {
      x_left: 'Reactive', x_right: 'Proactive / predictive',
      y_top: 'Enterprise-focused', y_bottom: 'SMB-focused',
    },
    vendor_positions: {
      crowdstrike: { x: 0.85, y: 0.20 },
      trellix:     { x: 0.70, y: 0.30 },
      trendmicro:  { x: 0.60, y: 0.55 },
      sophos:      { x: 0.50, y: 0.65 },
    },
  },
  'Data resilience': {
    quadrant_axes: {
      x_left: 'On-prem focused', x_right: 'Cloud-native',
      y_top: 'Enterprise-focused', y_bottom: 'SMB-focused',
    },
    vendor_positions: {
      veeam:    { x: 0.55, y: 0.40 },
      cohesity: { x: 0.65, y: 0.30 },
      netapp:   { x: 0.45, y: 0.25 },
      nutanix:  { x: 0.60, y: 0.35 },
      veritas:  { x: 0.35, y: 0.30 },
    },
  },
};
