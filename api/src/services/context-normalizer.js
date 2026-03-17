// Context normalizer — merges inferred signals, corrections, and follow-up answers
// into a single NormalizedContext object for gap analysis.
// Corrections override inferred values. Follow-up answers are normalised to internal enums.

export function normalizeContext(session, corrections = {}, followup_answers = {}) {
  const context = {};

  // Apply correctable fields — correction overrides inferred value
  for (const field of session.correctable_fields || []) {
    context[field.key] = corrections[field.key] || field.inferred_value;
  }

  // Map follow-up answers to context fields
  const answerMap = {
    q_identity: 'identity_model',
    q_insurance: 'insurance_status',
    q_questionnaire: 'questionnaire_experience',
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
  };

  return normalizers[key]?.[answer] ?? answer;
}
