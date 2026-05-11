// Context normalizer — merges inferred signals, corrections, and follow-up answers
// into a single NormalizedContext object for gap analysis.
// Corrections override inferred values. Follow-up answers are normalised to internal enums.

import { extractReconContext } from './recon-pipeline.js';

export function normalizeContext(session, corrections = {}, followup_answers = {}) {
  const context = {};

  // Apply correctable fields — correction overrides inferred value
  for (const field of session.correctable_fields || []) {
    context[field.key] = corrections[field.key] || field.inferred_value;
  }

  // Map follow-up answers to context fields
  const answerMap = {
    q_infrastructure: 'infrastructure',
    q_identity: 'identity_model',
    q_insurance: 'insurance_status',
    q_questionnaire: 'questionnaire_experience',
    q_pen_test: 'pen_test_completed',
    q_backup: 'has_backup',
    q_aws_program: 'aws_program_enrolled',
  };

  for (const [qid, answer] of Object.entries(followup_answers)) {
    const key = answerMap[qid];
    if (key) context[key] = normalizeAnswer(key, answer);
  }

  // Derive compliance_status from inferences when not explicitly provided
  if (!context.compliance_status) {
    const preSOC2 = (session.inferences || []).find(
      (i) => i.inference_id === 'inf_compliance'
    );
    if (preSOC2) context.compliance_status = 'none';
  }

  // Pass through sector signals from raw extraction — these inform industry-specific gaps
  const PASSTHROUGH_SIGNALS = [
    'sector', 'geo_market', 'handles_payments', 'data_sensitivity', 'stage', 'infrastructure', 'customer_type',
    'uses_ai', 'handles_personal_data', 'pen_test_completed', 'has_backup', 'aws_program_enrolled',
  ];
  for (const sig of session.raw_signals || []) {
    if (PASSTHROUGH_SIGNALS.includes(sig.type)) {
      if (context[sig.type] === undefined) context[sig.type] = sig.value;
    }
  }

  // Merge full passive recon context — facts from the pipeline, never overridden by inferences
  if (session.recon_context) {
    const reconCtx = extractReconContext(session.recon_context);
    Object.assign(context, reconCtx);
  }

  return context;
}

function normalizeAnswer(key, answer) {
  const normalizers = {
    identity_model: {
      'Passwords only': 'password_only',
      'Passwords + MFA': 'mfa_only',
      'SSO (Google, Okta, etc.)': 'sso',
      'Not sure': 'unknown',
    },
    insurance_status: {
      'Yes': 'active',
      'No': 'none',
      'In progress': 'planning',
      'Not sure': 'unknown',
    },
    questionnaire_experience: {
      'Yes, completed it': 'completed',
      'Yes, it stalled a deal': 'stalled_deal',
      'No': 'none',
      'Not sure': 'unknown',
    },
    pen_test_completed: {
      'Yes': true,
      'No': false,
      'In progress': false,
      'Not sure': null,
    },
    has_backup: {
      'Yes': true,
      'No': false,
      'Partial': false,
      'Not sure': null,
    },
    aws_program_enrolled: {
      'Yes': true,
      'No': false,
      'Not sure': null,
    },
  };

  return normalizers[key]?.[answer] ?? answer;
}
