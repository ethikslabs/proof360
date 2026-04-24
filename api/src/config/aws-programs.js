// AWS funding program catalogue — structured from docs/aws-funding-program-mapping.md
// Each program has trigger conditions evaluated against session signals_object.
// Pure function evaluateTrigger(trigger, signals) handles all op types.

/**
 * Known signal fields that the Signal_Extractor produces or that exist
 * on the session signals_object. Trigger conditions must reference these.
 */
export const KNOWN_SIGNAL_FIELDS = [
  'stage',
  'sector',
  'infrastructure',
  'geo_market',
  'product_type',
  'has_raised_institutional',
  'abn_entity_type',
];

/**
 * Pure trigger evaluator. Each trigger has { field, op, value?, values? }.
 * Ops: eq, in, exists, not_eq
 */
export function evaluateTrigger(trigger, signals) {
  const signalValue = signals[trigger.field];

  switch (trigger.op) {
    case 'eq':
      return signalValue === trigger.value;

    case 'not_eq':
      return signalValue !== undefined && signalValue !== trigger.value;

    case 'in':
      if (Array.isArray(trigger.values)) {
        return trigger.values.includes(signalValue);
      }
      return false;

    case 'exists':
      return signalValue !== undefined && signalValue !== null && signalValue !== '';

    default:
      return false;
  }
}

/**
 * Categories:
 *   startup_credits, partner_programs, customer_funding, sector_accelerators, nonprofit
 */
export const AWS_PROGRAMS = [
  // ── A. Startup credits + programs ──────────────────────────────────────

  {
    program_id: 'activate_founders',
    name: 'AWS Activate Founders',
    benefit: '$1,000 AWS credits + Developer Support',
    application_url: 'https://aws.amazon.com/activate/',
    category: 'startup_credits',
    triggers: [
      { field: 'stage', op: 'in', values: ['Pre-seed', 'Seed', 'Series A'] },
      { field: 'has_raised_institutional', op: 'eq', value: false },
    ],
    confidence_when_matched: 'high',
  },

  {
    program_id: 'activate_portfolio',
    name: 'AWS Activate Portfolio',
    benefit: 'Up to $100,000 AWS credits + Business Support',
    application_url: 'https://aws.amazon.com/activate/',
    category: 'startup_credits',
    triggers: [
      { field: 'has_raised_institutional', op: 'eq', value: true },
    ],
    confidence_when_matched: 'high',
  },

  {
    program_id: 'global_startup_program',
    name: 'AWS Global Startup Program',
    benefit: 'PDM + PSA + MDF + co-sell support',
    application_url: 'https://aws.amazon.com/startups/',
    category: 'startup_credits',
    triggers: [
      { field: 'stage', op: 'in', values: ['Series A', 'Series B+'] },
      { field: 'has_raised_institutional', op: 'eq', value: true },
    ],
    confidence_when_matched: 'medium',
  },

  {
    program_id: 'genai_accelerator',
    name: 'AWS Generative AI Accelerator',
    benefit: 'Up to $1M AWS credits + 8-week program',
    application_url: 'https://aws.amazon.com/startups/accelerators/generative-ai',
    category: 'startup_credits',
    triggers: [
      { field: 'stage', op: 'in', values: ['Seed', 'Series A'] },
      { field: 'sector', op: 'in', values: ['saas', 'infrastructure'] },
    ],
    confidence_when_matched: 'medium',
  },

  {
    program_id: 'saas_spotlight',
    name: 'AWS SaaS Spotlight',
    benefit: '4-week accelerator program',
    application_url: 'https://aws.amazon.com/startups/accelerators',
    category: 'startup_credits',
    triggers: [
      { field: 'product_type', op: 'eq', value: 'B2B SaaS' },
      { field: 'stage', op: 'in', values: ['Pre-seed', 'Seed'] },
    ],
    confidence_when_matched: 'high',
  },

  // ── B. Partner programs ────────────────────────────────────────────────

  {
    program_id: 'isv_accelerate',
    name: 'AWS ISV Accelerate',
    benefit: 'Co-sell incentives + AWS seller credit',
    application_url: 'https://aws.amazon.com/partners/programs/isv-accelerate/',
    category: 'partner_programs',
    triggers: [
      { field: 'product_type', op: 'in', values: ['B2B SaaS', 'Platform', 'API', 'Software product'] },
    ],
    confidence_when_matched: 'high',
  },

  {
    program_id: 'well_architected_partner',
    name: 'AWS Well-Architected Partner Program',
    benefit: '$5,000 funded per qualified review',
    application_url: 'https://aws.amazon.com/architecture/well-architected/',
    category: 'partner_programs',
    triggers: [
      { field: 'infrastructure', op: 'exists' },
    ],
    confidence_when_matched: 'medium',
  },

  {
    program_id: 'marketplace_seller',
    name: 'AWS Marketplace Seller',
    benefit: 'CPPO + private offers + AWS billing integration',
    application_url: 'https://aws.amazon.com/marketplace/management/tour',
    category: 'partner_programs',
    triggers: [
      { field: 'product_type', op: 'in', values: ['B2B SaaS', 'Platform', 'API', 'Software product'] },
    ],
    confidence_when_matched: 'high',
  },

  {
    program_id: 'solution_provider',
    name: 'AWS Solution Provider Program',
    benefit: 'Resale margin structure + partner tier progression',
    application_url: 'https://aws.amazon.com/partners/programs/solution-provider/',
    category: 'partner_programs',
    triggers: [
      { field: 'product_type', op: 'exists' },
    ],
    confidence_when_matched: 'low',
  },

  // ── C. Customer-funding programs ───────────────────────────────────────

  {
    program_id: 'migration_acceleration',
    name: 'Migration Acceleration Program (MAP)',
    benefit: '$50K–$1M+ migration funding',
    application_url: 'https://aws.amazon.com/migration-acceleration-program/',
    category: 'customer_funding',
    triggers: [
      { field: 'infrastructure', op: 'in', values: ['on_prem', 'legacy_hosted', 'multi_cloud_fragmented'] },
    ],
    confidence_when_matched: 'high',
  },

  {
    program_id: 'poc_funding',
    name: 'AWS POC Funding',
    benefit: 'Proof-of-concept compute credits',
    application_url: 'https://aws.amazon.com/startups/',
    category: 'customer_funding',
    triggers: [
      { field: 'infrastructure', op: 'exists' },
    ],
    confidence_when_matched: 'low',
  },

  // ── D. Nonprofit / mission-driven ────────────────────────────────────

  {
    program_id: 'imagine_grant',
    name: 'AWS IMAGINE Grant',
    benefit: 'Up to $50,000 unrestricted funding + AWS credits + technical support',
    application_url: 'https://aws.amazon.com/government-education/nonprofits/aws-imagine-grant-program/',
    category: 'nonprofit',
    triggers: [
      { field: 'abn_entity_type', op: 'eq', value: 'not_for_profit' },
    ],
    confidence_when_matched: 'high',
  },

  {
    program_id: 'nonprofit_credit',
    name: 'AWS Nonprofit Credit Program',
    benefit: 'Up to $5,000 AWS credits per year',
    application_url: 'https://aws.amazon.com/government-education/nonprofits/',
    category: 'nonprofit',
    triggers: [
      { field: 'abn_entity_type', op: 'eq', value: 'not_for_profit' },
    ],
    confidence_when_matched: 'high',
  },

  // ── E. Sector / vertical accelerators ──────────────────────────────────

  {
    program_id: 'clean_energy_accelerator',
    name: 'AWS Clean Energy Accelerator',
    benefit: 'Accelerator program for clean energy startups',
    application_url: 'https://aws.amazon.com/startups/accelerators',
    category: 'sector_accelerators',
    triggers: [
      { field: 'sector', op: 'eq', value: 'energy' },
    ],
    confidence_when_matched: 'medium',
  },

  {
    program_id: 'public_sector',
    name: 'AWS Public Sector Programs',
    benefit: 'Government-specific partner programs + procurement access',
    application_url: 'https://aws.amazon.com/government-education/',
    category: 'sector_accelerators',
    triggers: [
      { field: 'sector', op: 'eq', value: 'government' },
    ],
    confidence_when_matched: 'high',
  },

  {
    program_id: 'financial_services',
    name: 'AWS for Financial Services',
    benefit: 'Financial services compliance programs + partner access',
    application_url: 'https://aws.amazon.com/financial-services/',
    category: 'sector_accelerators',
    triggers: [
      { field: 'sector', op: 'in', values: ['fintech', 'financial_services'] },
    ],
    confidence_when_matched: 'high',
  },

  {
    program_id: 'healthcare_programs',
    name: 'AWS for Healthcare',
    benefit: 'Healthcare compliance programs + HIPAA-eligible services',
    application_url: 'https://aws.amazon.com/health/',
    category: 'sector_accelerators',
    triggers: [
      { field: 'sector', op: 'eq', value: 'healthcare' },
    ],
    confidence_when_matched: 'high',
  },

  {
    program_id: 'cybersecurity_accelerator',
    name: 'CrowdStrike + AWS + NVIDIA Cybersecurity Startup Accelerator',
    benefit: '8-week program + funding + mentorship + RSAC pitch day',
    application_url: 'https://aws.amazon.com/startups/accelerators',
    category: 'sector_accelerators',
    triggers: [
      { field: 'sector', op: 'in', values: ['saas', 'infrastructure'] },
      { field: 'stage', op: 'in', values: ['Pre-seed', 'Seed', 'Series A'] },
    ],
    confidence_when_matched: 'medium',
  },
];
