// Vendor catalog — partner data, quadrant positions, distributor routing
// Single source of truth for vendor graph, scoring, and distributor logic.
// distributor: "dicker" | "ingram" | "direct"
// marketplace_aws: true — listed on AWS Marketplace, can bill against AWS commitment
// aws_native: true — built by AWS, no separate vendor relationship needed
// routing(context) — per-vendor routing function for engagement system
//   context shape: { signals, tenant, session, derived_state }
//   returns: { primary: { party, type, label, ... }, alternatives: [] }
//   Three branch types: john (internal), distributor (tenant match), vendor (direct)
// Dicker AU catalog verified 2026-03-18. Ingram AU catalog verified 2026-03-18.

export const VENDORS = {

  // ── GRC & COMPLIANCE AUTOMATION ─────────────────────────────────────────

  aws_security_hub: {
    id: 'aws_security_hub', display_name: 'AWS Security Hub', initials: 'SH',
    closes: ['soc2', 'compliance', 'essential_eight', 'incident_response'],
    distributor: 'direct', aws_native: true, marketplace_aws: false,
    cost_range: 'Included in AWS', timeline: '1 day',
    is_partner: false, deal_label: null,
    best_for: 'AWS-native stacks — aggregates GuardDuty, Inspector, Macie into one compliance view',
    summary: 'Centralised security and compliance visibility across your AWS environment. Maps to CIS, PCI DSS, NIST, and Essential Eight controls out of the box.',
    referral_url: 'https://aws.amazon.com/security-hub/',
    routing: (context) => ({
      primary: {
        party: 'vendor', type: 'direct',
        label: 'Enable in AWS Console',
        url: 'https://aws.amazon.com/security-hub/',
      },
      alternatives: [{
        party: 'john', type: 'internal',
        label: 'Book guided setup via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      }],
    }),
  },

  vanta: {
    id: 'vanta', display_name: 'Vanta', initials: 'V',
    closes: ['soc2', 'incident_response', 'pci_dss', 'hipaa_security', 'essential_eight', 'data_privacy', 'ai_governance', 'penetration_testing', 'backup_dr'],
    distributor: 'direct', marketplace_aws: true,
    cost_range: '$7-15k/yr', timeline: '6-9 months',
    is_partner: true, deal_label: '20% off first year',
    best_for: 'Seed to Series B, AWS-native stacks',
    summary: 'Fastest to SOC 2. Connects to your existing AWS stack in an afternoon. Available on AWS Marketplace.',
    referral_url: 'https://vanta.com/?ref=proof360',
    partnership_reason: "Vanta is what we use ourselves and what we deploy first for every B2B SaaS client heading toward SOC 2. It connects to your AWS stack in an afternoon, maps controls automatically, and generates the evidence your auditor needs continuously — not in a sprint before the audit. It's on AWS Marketplace so enterprise customers can purchase it against their EDP commitment, removing a procurement blocker. We negotiated 20% off the first year for Proof360 clients.",
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Get via Proof360 — 20% off first year',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      managed: {
        party: 'john', type: 'managed_service',
        label: 'Have Ethiks360 manage your Vanta implementation',
        template: 'hubspot_msp',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'vendor', type: 'direct',
        label: 'Go direct to Vanta',
        url: 'https://vanta.com/?ref=proof360',
      }],
    }),
  },
  vanta_msp: {
    id: 'vanta_msp', display_name: 'Vanta (MSP)', initials: 'VM',
    closes: ['soc2', 'incident_response', 'compliance', 'data_privacy', 'ai_governance', 'penetration_testing'],
    distributor: 'direct',
    cost_range: null, timeline: null,
    is_partner: true, deal_label: '20% off first year',
    best_for: 'MSPs and multi-tenant compliance delivery',
    summary: 'Vanta MSP program — manage compliance across multiple client accounts.',
    referral_url: 'https://vanta.com/?ref=proof360',
    partnership_reason: "Ethiks360 runs Vanta across our managed client portfolio. As a Vanta MSP partner we manage compliance posture across multiple accounts — continuously, not in quarterly sprints. If you want SOC 2 managed rather than self-served, this is the path: we own the implementation, track the evidence, and manage the auditor relationship on your behalf.",
    routing: (context) => ({
      primary: {
        party: 'john', type: 'managed_service',
        label: 'Have Ethiks360 manage your compliance via Vanta',
        template: 'hubspot_msp',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'vendor', type: 'direct',
        label: 'Go direct to Vanta MSP',
        url: 'https://vanta.com/?ref=proof360',
      }],
    }),
  },

  drata: {
    id: 'drata', display_name: 'Drata', initials: 'D',
    closes: ['soc2', 'incident_response', 'pci_dss'],
    distributor: 'direct', marketplace_aws: true,
    cost_range: '$8-18k/yr', timeline: '6-12 months',
    is_partner: true, deal_label: '15% off first year',
    best_for: 'Larger teams, complex environments',
    summary: 'More customisation, longer setup. Better for Series B and beyond.',
    referral_url: 'https://drata.com/?ref=proof360',
    partnership_reason: "We recommend Drata when you need more control over the implementation than Vanta offers — typically larger teams, multiple compliance frameworks running in parallel, or an existing security team that wants to own the configuration. It takes longer to set up but gives you more flexibility. We get 15% off the first year for Proof360 clients.",
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Get via Proof360 — 15% off first year',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      managed: {
        party: 'john', type: 'managed_service',
        label: 'Have Ethiks360 manage your Drata implementation',
        template: 'hubspot_msp',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'vendor', type: 'direct',
        label: 'Go direct to Drata',
        url: 'https://drata.com/?ref=proof360',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [],
    }),
  },
  apollo_secure: {
    id: 'apollo_secure', display_name: 'Apollo Secure', initials: 'AP',
    closes: ['soc2', 'compliance', 'security_baseline', 'data_privacy', 'penetration_testing'],
    distributor: 'direct',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Fast compliance for startups and scale-ups, AU-based',
    summary: 'Automated security and compliance for startups. AU-based.',
    referral_url: 'https://www.apollosecure.com/',
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'vendor', type: 'direct',
        label: 'Go direct to Apollo Secure',
        url: 'https://www.apollosecure.com/',
      }],
    }),
  },
  trustwave: {
    id: 'trustwave', display_name: 'Trustwave', initials: 'TW',
    closes: ['soc2', 'compliance', 'penetration_testing'],
    distributor: 'dicker',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Managed security services, compliance',
    summary: 'Managed SOC and compliance services. Strong AU presence.',
    referral_url: null,
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Dicker Data',
        contact: 'partner@dickerdata.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Ingram Micro',
        contact: 'partner@ingrammicro.com.au',
      }],
    }),
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
    partnership_reason: "No other platform addresses the question investors and enterprise buyers actually ask first: who are the founders and can we trust them? ReachLX is the only structured assessment for that. The 10-question snapshot is free in every Proof360 report — the full 100+ question profile is what Series A prep actually requires. We partner with them because the founder trust gap is real, measurable, and almost nobody closes it before they're in the room.",
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Get free 10-question profile via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'vendor', type: 'direct',
        label: 'Go direct to ReachLX',
        url: 'https://lxplatform.io/',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'vendor', type: 'direct',
        label: 'Go direct to CognitiveView',
        url: 'https://www.cognitiveview.com/',
      }],
    }),
  },


  // ── IDENTITY & IAM ───────────────────────────────────────────────────────

  aws_iam_identity_center: {
    id: 'aws_iam_identity_center', display_name: 'AWS IAM Identity Center', initials: 'IC',
    closes: ['mfa', 'sso', 'identity'],
    distributor: 'direct', aws_native: true, marketplace_aws: false,
    cost_range: 'Included in AWS', timeline: '1-2 days',
    is_partner: false, deal_label: null,
    best_for: 'AWS-native stacks — centralised SSO and MFA across AWS accounts and SAML apps',
    summary: 'AWS-native SSO and MFA. If your team is already in AWS, this is the zero-friction path to centralised identity with no additional license cost.',
    referral_url: 'https://aws.amazon.com/iam/identity-center/',
    routing: (context) => ({
      primary: {
        party: 'vendor', type: 'direct',
        label: 'Enable in AWS Console',
        url: 'https://aws.amazon.com/iam/identity-center/',
      },
      alternatives: [{
        party: 'john', type: 'internal',
        label: 'Book guided setup via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      }],
    }),
  },

  okta: {
    id: 'okta', display_name: 'Okta', initials: 'O',
    closes: ['mfa', 'sso', 'identity'],
    distributor: 'direct', marketplace_aws: true,
    cost_range: '$3-8k/yr', timeline: '2-4 weeks',
    is_partner: false, deal_label: null,
    best_for: 'Enterprise identity, broad integrations',
    summary: 'Industry standard for enterprise IAM.',
    referral_url: null,
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [],
    }),
  },
  cisco_duo: {
    id: 'cisco_duo', display_name: 'Cisco Duo', initials: 'CD',
    closes: ['mfa', 'identity'],
    distributor: 'ingram', marketplace_aws: true,
    cost_range: '$2-5k/yr', timeline: '1-2 weeks',
    is_partner: true, deal_label: null,
    best_for: 'Fast MFA rollout, SME-friendly, up and running in a day',
    summary: 'Lightweight MFA that works with whatever you already have. No rip-and-replace.',
    referral_url: null,
    partnership_reason: "Ethiks360 is a Cisco MSP. Duo is what we deploy for MFA at every client — it works alongside whatever identity system you already have, requires no infrastructure changes, and is operational within a day. It's backed by Cisco Talos, the world's largest commercial threat intelligence operation. We route it through our Ingram Micro agreement.",
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Get via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      managed: {
        party: 'john', type: 'managed_service',
        label: 'Have Ethiks360 deploy and manage Cisco Duo',
        template: 'hubspot_msp',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Ingram Micro',
        contact: 'partner@ingrammicro.com.au',
      }],
    }),
  },
  cisco_umbrella: {
    id: 'cisco_umbrella', display_name: 'Cisco Umbrella', initials: 'CU',
    closes: ['network_perimeter', 'dns_security', 'zero_trust'],
    distributor: 'ingram',
    cost_range: '$2-6k/yr', timeline: '1-2 weeks',
    is_partner: true, deal_label: null,
    best_for: 'DNS security, cloud-delivered SASE, remote workforce protection',
    summary: 'Cloud-delivered network security. Blocks threats at the DNS layer before they reach your network.',
    referral_url: null,
    partnership_reason: "Part of our Cisco MSP relationship. Umbrella sits at the DNS layer and blocks malicious traffic before it reaches your network or your users' devices — no hardware, no agents, just a DNS change. It's how we protect remote-first teams and distributed workforces across our managed client base.",
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Get via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      managed: {
        party: 'john', type: 'managed_service',
        label: 'Have Ethiks360 deploy and manage Cisco Umbrella',
        template: 'hubspot_msp',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Ingram Micro',
        contact: 'partner@ingrammicro.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Dicker Data',
        contact: 'partner@dickerdata.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Dicker Data',
        contact: 'partner@dickerdata.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Ingram Micro',
        contact: 'partner@ingrammicro.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Ingram Micro',
        contact: 'partner@ingrammicro.com.au',
      }],
    }),
  },


  // ── NETWORK SECURITY ─────────────────────────────────────────────────────

  aws_waf: {
    id: 'aws_waf', display_name: 'AWS WAF', initials: 'WF',
    closes: ['waf', 'network_perimeter', 'security_headers', 'dmarc'],
    distributor: 'direct', aws_native: true, marketplace_aws: false,
    cost_range: 'Pay-per-use (AWS)', timeline: '1 day',
    is_partner: false, deal_label: null,
    best_for: 'AWS-hosted apps — WAF and response header policies without a separate vendor',
    summary: 'AWS-native WAF with managed rule groups. Add security headers via CloudFront response policies. No separate vendor relationship — billed directly through AWS.',
    referral_url: 'https://aws.amazon.com/waf/',
    routing: (context) => ({
      primary: {
        party: 'vendor', type: 'direct',
        label: 'Enable in AWS Console',
        url: 'https://aws.amazon.com/waf/',
      },
      alternatives: [{
        party: 'john', type: 'internal',
        label: 'Book guided setup via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      }],
    }),
  },

  cloudflare: {
    id: 'cloudflare', display_name: 'Cloudflare', initials: 'CF',
    closes: ['network_perimeter', 'waf', 'ddos', 'zero_trust', 'dmarc', 'security_headers', 'data_privacy', 'ai_governance'],
    distributor: 'ingram',
    cost_range: '$2-6k/yr', timeline: '2-4 weeks',
    is_partner: true, deal_label: null,
    best_for: 'Network security, zero trust access',
    summary: 'Network perimeter, zero trust, and DDoS in one platform.',
    referral_url: null,
    partnership_reason: "Ethiks360 is a Cloudflare MSSP. Every client in our managed portfolio sits behind Cloudflare at the edge. It closes WAF, DDoS protection, zero trust access, DMARC enforcement, security headers, AI Gateway governance, and data privacy controls — in one platform, at a price point that beats assembling those capabilities separately. It's the most cost-effective enterprise security investment a B2B SaaS company can make.",
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Get via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      managed: {
        party: 'john', type: 'managed_service',
        label: 'Have Ethiks360 manage your Cloudflare deployment',
        template: 'hubspot_msp',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Ingram Micro',
        contact: 'partner@ingrammicro.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Ingram Micro',
        contact: 'partner@ingrammicro.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Ingram Micro',
        contact: 'partner@ingrammicro.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Dicker Data',
        contact: 'partner@dickerdata.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Dicker Data',
        contact: 'partner@dickerdata.com.au',
      }],
    }),
  },

  // ── ENDPOINT PROTECTION ──────────────────────────────────────────────────

  crowdstrike: {
    id: 'crowdstrike', display_name: 'CrowdStrike', initials: 'CS',
    closes: ['edr', 'endpoint_protection'],
    distributor: 'dicker', marketplace_aws: true,
    cost_range: '$3-8k/yr', timeline: '2-3 weeks',
    is_partner: false, deal_label: null,
    best_for: 'Enterprise EDR, strong detection',
    summary: 'Leading endpoint protection. Enterprise-grade detection.',
    referral_url: null,
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Dicker Data',
        contact: 'partner@dickerdata.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Ingram Micro',
        contact: 'partner@ingrammicro.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Dicker Data',
        contact: 'partner@dickerdata.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Ingram Micro',
        contact: 'partner@ingrammicro.com.au',
      }],
    }),
  },


  // ── DATA RESILIENCE ──────────────────────────────────────────────────────

  aws_backup: {
    id: 'aws_backup', display_name: 'AWS Backup', initials: 'BK',
    closes: ['backup', 'recovery', 'data_resilience', 'backup_dr'],
    distributor: 'direct', aws_native: true, marketplace_aws: false,
    cost_range: 'Pay-per-use (AWS)', timeline: '1 day',
    is_partner: false, deal_label: null,
    best_for: 'AWS-native stacks — centralised backup across EC2, RDS, S3, EFS with no separate vendor',
    summary: 'Centralised backup across your entire AWS estate. Policy-driven, audit-ready, and billed through your existing AWS account.',
    referral_url: 'https://aws.amazon.com/backup/',
    routing: (context) => ({
      primary: {
        party: 'vendor', type: 'direct',
        label: 'Enable in AWS Console',
        url: 'https://aws.amazon.com/backup/',
      },
      alternatives: [{
        party: 'john', type: 'internal',
        label: 'Book guided setup via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      }],
    }),
  },

  veeam: {
    id: 'veeam', display_name: 'Veeam', initials: 'VE',
    closes: ['backup', 'recovery', 'backup_dr'],
    distributor: 'ingram',
    cost_range: null, timeline: null,
    is_partner: false, deal_label: null,
    best_for: 'Backup and recovery, hybrid and cloud',
    summary: 'Leading backup platform. Covers on-prem, cloud, and hybrid.',
    referral_url: null,
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Ingram Micro',
        contact: 'partner@ingrammicro.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Ingram Micro',
        contact: 'partner@ingrammicro.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Dicker Data',
        contact: 'partner@dickerdata.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Ingram Micro',
        contact: 'partner@ingrammicro.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Dicker Data',
        contact: 'partner@dickerdata.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Dicker Data',
        contact: 'partner@dickerdata.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Ingram Micro',
        contact: 'partner@ingrammicro.com.au',
      }],
    }),
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
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Book via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'distributor', type: 'distributor',
        label: 'Via Ingram Micro',
        contact: 'partner@ingrammicro.com.au',
      }],
    }),
  },

  // ── AWS PROGRAMS ─────────────────────────────────────────────────────────

  aws_programs: {
    id: 'aws_programs', display_name: 'AWS Programs', initials: 'AP',
    closes: ['aws_program_eligibility'],
    distributor: 'direct', aws_native: true, marketplace_aws: false,
    cost_range: 'Free to apply', timeline: '1–2 weeks',
    is_partner: true, deal_label: 'Via Proof360 AWS Partner attribution',
    best_for: 'B2B SaaS on AWS — credits, co-sell pipeline, and Marketplace distribution',
    summary: 'AWS Activate (up to $100k credits), ISV Accelerate (co-sell with AWS sales), and Marketplace listing (sell against enterprise EDP commitments). Applied via Proof360 AWS Partner attribution.',
    referral_url: 'https://aws.amazon.com/partners/',
    partnership_reason: "As an AWS Partner, Ethiks360 routes clients into the right AWS programs at the right time. Activate gives you up to $100k in credits — most B2B SaaS companies leave this on the table. ISV Accelerate gets AWS's own sales team co-selling your product. Marketplace listing lets enterprise buyers purchase you using their committed AWS spend, which removes a procurement blocker that kills deals. We handle the applications and the attribution.",
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Apply via Proof360 AWS Partner link',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      managed: {
        party: 'john', type: 'managed_service',
        label: 'Have Ethiks360 manage your AWS program applications',
        template: 'hubspot_msp',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [{
        party: 'vendor', type: 'direct',
        label: 'Go direct to AWS Partner Network',
        url: 'https://aws.amazon.com/partners/',
      }],
    }),
  },

  // ── CYBER INSURANCE ──────────────────────────────────────────────────────

  austbrokers: {
    id: 'austbrokers', display_name: 'AustBrokers CyberPro', initials: 'AB',
    closes: ['cyber_insurance'],
    distributor: 'direct',
    cost_range: '$3-10k/yr', timeline: '1-2 weeks',
    is_partner: true, deal_label: 'Introduced via Proof360',
    best_for: 'AU-based tech companies — fast quoting, specialist cyber underwriting',
    summary: 'Specialist cyber insurance broker. We make the introduction, they handle everything. Most policies quoted and bound within 2 weeks.',
    referral_url: 'https://meetings.hubspot.com/john3174?embed=true',
    partnership_reason: "AustBrokers CyberPro specialise in cyber insurance for Australian technology companies. They understand your stack, your threat model, and what underwriters actually care about — which means faster quotes and better coverage than a generalist broker. We work with them directly. We make the introduction, they handle the policy. Most clients are quoted and bound within two weeks.",
    routing: (context) => ({
      primary: {
        party: 'john', type: 'internal',
        label: 'Get introduced via Proof360',
        template: 'hubspot_booking',
        url: 'https://meetings.hubspot.com/john3174',
      },
      alternatives: [],
    }),
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
      aws_security_hub: { x: 0.80, y: 0.88 },
      vanta:            { x: 0.72, y: 0.28 },
      vanta_msp:        { x: 0.70, y: 0.30 },
      drata:            { x: 0.62, y: 0.38 },
      secureframe:      { x: 0.55, y: 0.52 },
      apollo_secure:    { x: 0.65, y: 0.65 },
      trustwave:        { x: 0.40, y: 0.45 },
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
      aws_iam_identity_center: { x: 0.45, y: 0.70 },
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
      aws_waf:        { x: 0.62, y: 0.55 },
      cloudflare:     { x: 0.58, y: 0.42 },
      cisco_umbrella: { x: 0.52, y: 0.50 },
      palo_alto:      { x: 0.82, y: 0.25 },
      fortinet:       { x: 0.70, y: 0.30 },
      sonicwall:      { x: 0.30, y: 0.60 },
      juniper:        { x: 0.75, y: 0.35 },
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
      aws_backup: { x: 0.88, y: 0.60 },
      veeam:      { x: 0.55, y: 0.40 },
      cohesity:   { x: 0.65, y: 0.30 },
      netapp:     { x: 0.45, y: 0.25 },
      nutanix:    { x: 0.60, y: 0.35 },
      veritas:    { x: 0.35, y: 0.30 },
    },
  },
};
