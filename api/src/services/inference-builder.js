// Inference builder — transforms raw signals into the cold read object
// Pure function. No HTTP awareness, no side effects.

export function buildInferences(signals, sources_read, website_url) {
  const inferences = [];
  const correctable_fields = [];
  const followup_questions = [];

  // Map each raw signal to a display inference
  for (const signal of signals) {
    inferences.push({
      inference_id: `inf_${signal.type}`,
      label: inferenceLabel(signal),
      confidence: signal.confidence,
      category: signalCategory(signal.type),
    });
  }

  // Always include compliance and infrastructure at "probable" when no direct evidence
  const inferredTypes = new Set(signals.map((s) => s.type));
  if (!inferredTypes.has('compliance_status')) {
    inferences.push({
      inference_id: 'inf_compliance',
      label: 'Pre-SOC 2',
      confidence: 'probable',
      category: 'governance',
    });
  }
  if (!inferredTypes.has('infrastructure')) {
    inferences.push({
      inference_id: 'inf_infrastructure',
      label: 'Hosted on AWS',
      confidence: 'probable',
      category: 'infrastructure',
    });
  }

  // Build correctable fields for high-value signals
  const correctableTypes = ['customer_type', 'data_sensitivity', 'infrastructure'];
  for (const type of correctableTypes) {
    const signal = signals.find((s) => s.type === type);
    if (signal) {
      correctable_fields.push({
        key: signal.type,
        label: fieldLabel(signal.type),
        inferred_value: signal.value + (signal.confidence === 'probable' ? ' (probable)' : ''),
      });
    }
  }

  // Always include infrastructure as correctable
  if (!correctable_fields.find((f) => f.key === 'infrastructure')) {
    correctable_fields.push({
      key: 'infrastructure',
      label: 'Infrastructure',
      inferred_value: 'AWS (probable)',
    });
  }

  // Follow-up questions only for signal types NOT inferred
  if (!inferredTypes.has('identity_model')) {
    followup_questions.push({
      question_id: 'q_identity',
      context: "We couldn't detect how your team manages user access.",
      question: 'How do your users log in?',
      options: ['Passwords only', 'Passwords + MFA', 'SSO (Google, Okta, etc.)', 'Not sure'],
    });
  }
  if (!inferredTypes.has('insurance_status')) {
    followup_questions.push({
      question_id: 'q_insurance',
      context: "We couldn't find any mention of cyber insurance.",
      question: 'Do you have cyber insurance?',
      options: ['Yes', 'No', 'In progress', 'Not sure'],
    });
  }
  if (!inferredTypes.has('questionnaire_experience')) {
    followup_questions.push({
      question_id: 'q_questionnaire',
      context: 'Enterprise buyers often send security questionnaires during procurement.',
      question: 'Have you received a security questionnaire from a customer?',
      options: ['Yes, completed it', 'Yes, it stalled a deal', 'No', 'Not sure'],
    });
  }

  const company_name = website_url ? extractCompanyName(website_url) : 'Your company';
  const source_summary = website_url
    ? `Read from: ${new URL(website_url).hostname} · ${sources_read.join(', ')} · ${signals.length} signals`
    : `Read from: uploaded deck · ${sources_read.join(', ')} · ${signals.length} signals`;

  return {
    company_name,
    source_summary,
    inferences,
    correctable_fields,
    followup_questions,
    sources_read,
    signals_detected: signals.length,
  };
}

function inferenceLabel(signal) {
  const labels = {
    product_type: signal.value + ' product',
    customer_type: 'Targeting ' + signal.value.toLowerCase() + ' buyers',
    data_sensitivity: 'Processes ' + signal.value.toLowerCase(),
    stage: signal.value + ' stage',
    use_case: signal.value,
  };
  return labels[signal.type] || signal.value;
}

function signalCategory(type) {
  const map = {
    product_type: 'product', customer_type: 'market', data_sensitivity: 'data',
    stage: 'company', use_case: 'market', identity_model: 'identity',
    infrastructure: 'infrastructure', insurance_status: 'governance',
  };
  return map[type] || 'general';
}

function fieldLabel(type) {
  const map = {
    customer_type: 'Customer type',
    data_sensitivity: 'Data sensitivity',
    infrastructure: 'Infrastructure',
  };
  return map[type] || type;
}

function extractCompanyName(url) {
  try {
    const hostname = new URL(url).hostname;
    const name = hostname.replace(/^www\./, '').split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return 'Your company';
  }
}
