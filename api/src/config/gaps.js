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
  },
];

// Enterprise signals schema — collected on every session for dataset moat
export const ENTERPRISE_SIGNALS_SCHEMA = {
  security_page_detected: false,
  trust_centre_detected: false,
  soc2_mentioned: false,
  pricing_enterprise_tier: false,
};
