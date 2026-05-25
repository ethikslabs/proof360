// Microsoft program catalogue — mirrors aws-programs.js structure.
// Triggers evaluated against the same signals_object fields.

export const MICROSOFT_PROGRAMS = [
  // ── A. Startup credits + programs ──────────────────────────────────────

  {
    program_id: 'founders_hub',
    name: 'Microsoft for Startups Founders Hub',
    benefit: 'Up to $150k Azure credits + GitHub Enterprise + Microsoft 365 + LinkedIn Premium',
    application_url: 'https://www.microsoft.com/en-us/startups',
    category: 'startup_credits',
    triggers: [
      { field: 'stage', op: 'in', values: ['Pre-seed', 'Seed', 'Series A'] },
    ],
    confidence_when_matched: 'high',
  },

  {
    program_id: 'azure_for_startups',
    name: 'Azure for Startups',
    benefit: 'Azure credits, architecture guidance, and go-to-market support',
    application_url: 'https://azure.microsoft.com/en-us/free/startups/',
    category: 'startup_credits',
    triggers: [
      { field: 'stage', op: 'in', values: ['Pre-seed', 'Seed', 'Series A', 'Series B+'] },
      { field: 'infrastructure', op: 'exists' },
    ],
    confidence_when_matched: 'high',
  },

  {
    program_id: 'ai_cloud_partner',
    name: 'Microsoft AI Cloud Partner Program',
    benefit: 'AI co-pilot access, Azure OpenAI credits, solution designations',
    application_url: 'https://partner.microsoft.com/en-us/partnership/ai-cloud-partner-program',
    category: 'startup_credits',
    triggers: [
      { field: 'sector', op: 'in', values: ['saas', 'infrastructure', 'ai'] },
      { field: 'stage', op: 'in', values: ['Seed', 'Series A', 'Series B+'] },
    ],
    confidence_when_matched: 'medium',
  },

  // ── B. Partner programs ────────────────────────────────────────────────

  {
    program_id: 'isv_success',
    name: 'Microsoft ISV Success Program',
    benefit: 'Co-sell support, marketplace listing, Azure Marketplace CPPO, technical enablement',
    application_url: 'https://www.microsoft.com/en-us/isv/program-benefits',
    category: 'partner_programs',
    triggers: [
      { field: 'product_type', op: 'in', values: ['B2B SaaS', 'Platform', 'API', 'Software product'] },
      { field: 'stage', op: 'in', values: ['Series A', 'Series B+'] },
    ],
    confidence_when_matched: 'high',
  },

  {
    program_id: 'cloud_partner_program',
    name: 'Microsoft Cloud Partner Program (MCPP)',
    benefit: 'Solution designations, co-sell eligibility, MDF access, partner incentives',
    application_url: 'https://partner.microsoft.com/en-us/partnership',
    category: 'partner_programs',
    triggers: [
      { field: 'product_type', op: 'in', values: ['B2B SaaS', 'Platform', 'API', 'Software product'] },
    ],
    confidence_when_matched: 'medium',
  },

  {
    program_id: 'azure_marketplace_seller',
    name: 'Azure Marketplace Seller',
    benefit: 'Transact listing, private offers, co-sell signals, 10% marketplace reward',
    application_url: 'https://partner.microsoft.com/en-us/partnership/azure-marketplace',
    category: 'partner_programs',
    triggers: [
      { field: 'product_type', op: 'in', values: ['B2B SaaS', 'Platform', 'Software product'] },
      { field: 'has_raised_institutional', op: 'eq', value: true },
    ],
    confidence_when_matched: 'high',
  },

  // ── C. Customer funding + migration ───────────────────────────────────

  {
    program_id: 'azure_migrate_modernize',
    name: 'Azure Migrate & Modernize',
    benefit: 'Funded migration assessment + Azure credits for migration workloads',
    application_url: 'https://azure.microsoft.com/en-us/solutions/migration/migration-journey/',
    category: 'customer_funding',
    triggers: [
      { field: 'infrastructure', op: 'exists' },
      { field: 'stage', op: 'not_eq', value: 'Pre-seed' },
    ],
    confidence_when_matched: 'medium',
  },

  {
    program_id: 'azure_innovate',
    name: 'Azure Innovate',
    benefit: 'Azure credits + FastTrack for Azure onboarding + solution architecture reviews',
    application_url: 'https://azure.microsoft.com/en-us/solutions/startups/',
    category: 'customer_funding',
    triggers: [
      { field: 'stage', op: 'in', values: ['Series A', 'Series B+'] },
      { field: 'infrastructure', op: 'exists' },
    ],
    confidence_when_matched: 'medium',
  },

  // ── D. Ingram Micro channel programs (Microsoft) ──────────────────────

  {
    program_id: 'ingram_amp_azure',
    name: 'Ingram Micro AMP — Azure Assessment',
    benefit: 'Free Azure assessment + migration planning via Ingram channel (AMP program)',
    application_url: 'https://www.ingrammicro.com/en-AU/services/microsoft',
    category: 'channel_programs',
    triggers: [
      { field: 'infrastructure', op: 'exists' },
      { field: 'geo_market', op: 'in', values: ['Australia', 'ANZ', 'Asia Pacific'] },
    ],
    confidence_when_matched: 'high',
  },

  {
    program_id: 'ingram_xvantage_csp',
    name: 'Ingram Micro Xvantage — CSP / Microsoft 365',
    benefit: 'Microsoft 365 licensing via CSP, bundled with Ingram cloud management tooling',
    application_url: 'https://xvantage.ingrammicro.com',
    category: 'channel_programs',
    triggers: [
      { field: 'stage', op: 'in', values: ['Pre-seed', 'Seed', 'Series A'] },
      { field: 'geo_market', op: 'in', values: ['Australia', 'ANZ', 'Asia Pacific'] },
    ],
    confidence_when_matched: 'medium',
  },

  // ── E. Sector / compliance accelerators ───────────────────────────────

  {
    program_id: 'govtech_accelerator',
    name: 'Microsoft GovTech Accelerator (AU)',
    benefit: 'Azure Government credits, protected-level architecture review, Canberra team access',
    application_url: 'https://www.microsoft.com/en-au/industry/government',
    category: 'sector_accelerators',
    triggers: [
      { field: 'sector', op: 'in', values: ['government', 'govtech', 'defence', 'public sector'] },
      { field: 'geo_market', op: 'in', values: ['Australia', 'ANZ'] },
    ],
    confidence_when_matched: 'high',
  },

  {
    program_id: 'nonprofit_azure',
    name: 'Microsoft Nonprofits — Azure Grant',
    benefit: 'Up to $3,500 Azure credits/year + M365 Business Premium free',
    application_url: 'https://www.microsoft.com/en-us/nonprofits/azure',
    category: 'nonprofit',
    triggers: [
      { field: 'abn_entity_type', op: 'in', values: ['nonprofit', 'nfp', 'charity', 'foundation'] },
    ],
    confidence_when_matched: 'high',
  },
];

export function filterMicrosoftPrograms(programs_config, signalsMap) {
  const matched = [];
  for (const program of programs_config) {
    const allMatch = program.triggers.every((t) => {
      const { evaluateTrigger } = { evaluateTrigger: _evaluateTrigger };
      return evaluateTrigger(t, signalsMap);
    });
    if (allMatch) matched.push(program);
  }
  return matched;
}

function _evaluateTrigger(trigger, signals) {
  const signalValue = signals[trigger.field];
  switch (trigger.op) {
    case 'eq':      return signalValue === trigger.value;
    case 'not_eq':  return signalValue !== undefined && signalValue !== trigger.value;
    case 'in':      return Array.isArray(trigger.values) && trigger.values.includes(signalValue);
    case 'exists':  return signalValue !== undefined && signalValue !== null && signalValue !== '';
    default:        return false;
  }
}
