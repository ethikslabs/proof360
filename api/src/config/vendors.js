// Vendor catalog — partner data, quadrant positions, deal details
// Scaffold for Phase 1. Full vendor_intelligence data populated in Phase 3 (task 5.5)

export const VENDORS = {
  vanta: {
    id: 'vanta', display_name: 'Vanta', initials: 'V',
    closes: ['soc2', 'incident_response'],
    cost_range: '$7-15k/yr', timeline: '6-9 months',
    is_partner: true, deal_label: '20% off first year',
    best_for: 'Seed to Series B, AWS-native stacks',
    summary: 'Fastest to SOC 2. Connects to your existing stack in an afternoon.',
    referral_url: 'https://vanta.com/?ref=proof360',
  },
  drata: {
    id: 'drata', display_name: 'Drata', initials: 'D',
    closes: ['soc2', 'incident_response'],
    cost_range: '$8-18k/yr', timeline: '6-12 months',
    is_partner: true, deal_label: '15% off first year',
    best_for: 'Larger teams, complex environments',
    summary: 'More customisation, longer setup. Better for Series B and beyond.',
    referral_url: 'https://drata.com/?ref=proof360',
  },
  secureframe: {
    id: 'secureframe', display_name: 'Secureframe', initials: 'S',
    closes: ['soc2'],
    cost_range: '$8-15k/yr', timeline: '6-9 months',
    is_partner: false, deal_label: null,
    best_for: 'Mid-market, broader framework coverage',
    summary: 'Good mid-market option. Strong for companies needing multiple frameworks.',
    referral_url: null,
  },
  okta: {
    id: 'okta', display_name: 'Okta', initials: 'O',
    closes: ['mfa', 'sso'],
    cost_range: '$3-8k/yr', timeline: '2-4 weeks',
    is_partner: false, deal_label: null,
    best_for: 'Enterprise identity, broad integrations',
    summary: 'Industry standard for enterprise IAM.',
    referral_url: null,
  },
  cisco_duo: {
    id: 'cisco_duo', display_name: 'Cisco Duo', initials: 'CD',
    closes: ['mfa'],
    cost_range: '$2-5k/yr', timeline: '1-2 weeks',
    is_partner: true, deal_label: null,
    best_for: 'Fast MFA rollout, startup-friendly',
    summary: 'Lightweight MFA. Up and running in a day.',
    referral_url: null,
  },
  austbrokers: {
    id: 'austbrokers', display_name: 'AustBrokers CyberPro', initials: 'AB',
    closes: ['cyber_insurance'],
    cost_range: '$3-10k/yr', timeline: '1-2 weeks',
    is_partner: false, deal_label: null,
    best_for: 'AU-based startups, fast quoting',
    summary: 'Specialist cyber insurance broker. Quick turnaround.',
    referral_url: null,
  },
  cloudflare: {
    id: 'cloudflare', display_name: 'Cloudflare', initials: 'CF',
    closes: ['network_perimeter'],
    cost_range: '$2-6k/yr', timeline: '2-4 weeks',
    is_partner: true, deal_label: null,
    best_for: 'Network security, zero trust access',
    summary: 'Network perimeter and zero trust in one platform.',
    referral_url: null,
  },
  crowdstrike: {
    id: 'crowdstrike', display_name: 'CrowdStrike', initials: 'CS',
    closes: ['edr'],
    cost_range: '$3-8k/yr', timeline: '2-3 weeks',
    is_partner: false, deal_label: null,
    best_for: 'Enterprise EDR, strong detection',
    summary: 'Leading endpoint protection. Enterprise-grade detection.',
    referral_url: null,
  },
  palo_alto: {
    id: 'palo_alto', display_name: 'Palo Alto', initials: 'PA',
    closes: ['edr'],
    cost_range: '$3-8k/yr', timeline: '2-3 weeks',
    is_partner: false, deal_label: null,
    best_for: 'Broader security suite, enterprise',
    summary: 'Full security platform. Better for larger environments.',
    referral_url: null,
  },
};

// Quadrant positioning per vendor category — full data in Phase 3
export const VENDOR_CATEGORIES = {
  'GRC & compliance automation': {
    quadrant_axes: {
      x_left: 'Slower to audit-ready', x_right: 'Faster to audit-ready',
      y_top: 'More expensive', y_bottom: 'Cheaper',
    },
    vendor_positions: {
      vanta: { x: 0.72, y: 0.28 },
      drata: { x: 0.62, y: 0.38 },
      secureframe: { x: 0.55, y: 0.52 },
    },
  },
  'Identity & IAM': {
    quadrant_axes: {
      x_left: 'Developer-led', x_right: 'IT / admin-led',
      y_top: 'Enterprise-focused', y_bottom: 'Startup-focused',
    },
    vendor_positions: {
      okta: { x: 0.75, y: 0.25 },
      cisco_duo: { x: 0.35, y: 0.65 },
    },
  },
};
