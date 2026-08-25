// Inference builder — transforms raw signals into the cold read object
// Pure function. No HTTP awareness, no side effects.

export function buildInferences(signals, sources_read, website_url, recon = {}) {
  const inferences = [];
  const correctable_fields = [];
  const followup_questions = [];

  // Map each raw signal to a display inference — skip 'infrastructure' and
  // 'works_with' here, they need the recon-reconciliation pass below (a hosting
  // claim can conflict with the live probe; a works_with claim never does).
  for (const signal of signals) {
    if (signal.type === 'infrastructure' || signal.type === 'works_with') continue;
    inferences.push({
      inference_id: `inf_${signal.type}`,
      label: inferenceLabel(signal),
      confidence: signal.confidence,
      category: signalCategory(signal.type),
    });
  }

  // Always include compliance at "probable" when no direct evidence
  const inferredTypes = new Set(signals.map((s) => s.type));
  if (!inferredTypes.has('compliance_status')) {
    inferences.push({
      inference_id: 'inf_compliance',
      label: 'Pre-SOC 2',
      confidence: 'probable',
      category: 'governance',
    });
  }

  // Hosting: truth ladder says the live probe outranks any text-derived claim
  // (INVARIANTS honest degradation + lamp register — surface conflicts as
  // questions, never silent picks). recon.cloud_provider/hosting_provider is an
  // IP lookup, not a guess; a text-derived 'infrastructure' signal is only ever
  // an EXPLICIT self-hosting statement (signal-extractor re-types anything else
  // as 'works_with'). When both exist and disagree, the probe becomes primary
  // and the extracted claim is kept visible as the conflicting witness — never
  // silently dropped, never silently picked.
  const reconInfra = recon.cloud_provider || recon.hosting_provider || null;
  const reconInfraLabel = reconInfra ? canonicalProviderLabel(reconInfra) : null;
  const hostingSignal = signals.find((s) => s.type === 'infrastructure');

  if (reconInfra && hostingSignal && !sameProvider(reconInfra, hostingSignal.value)) {
    inferences.push({
      inference_id: 'inf_infrastructure',
      label: `Hosted on ${reconInfraLabel}`,
      confidence: 'observed',
      category: 'infrastructure',
      conflicted: true,
      conflict: { probe_says: reconInfraLabel, source_says: canonicalProviderLabel(hostingSignal.value) },
    });
  } else if (reconInfra) {
    inferences.push({
      inference_id: 'inf_infrastructure',
      label: `Hosted on ${reconInfraLabel}`,
      confidence: 'observed',
      category: 'infrastructure',
      conflicted: false,
    });
  } else if (hostingSignal) {
    inferences.push({
      inference_id: 'inf_infrastructure',
      label: `Hosted on ${canonicalProviderLabel(hostingSignal.value)}`,
      confidence: hostingSignal.confidence,
      category: 'infrastructure',
      conflicted: false,
    });
  }
  // Neither a probe fact nor an explicit self-hosting statement: say nothing —
  // no canned "Hosted on AWS" guess (this WAS the bug: a hardcoded default that
  // fired unconditionally and rendered next to the probe's real finding with no
  // reconciliation).

  // Vendor relationships ("works with AWS") are business facts, not hosting —
  // they never conflict with the probe and always render. Own category
  // 'relationship' (M6, review 2026-08-25): 'infrastructure' put this in the
  // frontend's security bucket, next to actual hosting/security posture
  // signals, which misrepresented a business relationship as a security
  // fact. See live-signals.js DOMAIN_MAP for where this lands on the frontend.
  for (const signal of signals.filter((s) => s.type === 'works_with')) {
    inferences.push({
      inference_id: `inf_works_with_${slugify(signal.value)}`,
      label: `Works with ${signal.value}`,
      confidence: signal.confidence,
      category: 'relationship',
      conflicted: false,
    });
  }

  // No blank/bare-boolean chips ever reach the wire — filter at the source so
  // the frontend never has to guess what an empty or `true` label meant.
  const validInferences = inferences.filter((inf) => isRenderableLabel(inf.label));

  // Build correctable fields for high-value signals
  const correctableTypes = ['customer_type', 'data_sensitivity'];
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

  // Infrastructure correctable field: same resolution as the inference above —
  // probe wins when both exist, otherwise whichever we have, otherwise honest "Unknown".
  // If we know the CDN/edge layer (e.g. Cloudflare) but not the underlying host, surface that.
  const edgeProvider = recon.cdn_provider || recon.waf_detected || null;
  const infraDisplay = reconInfraLabel
    || (hostingSignal ? canonicalProviderLabel(hostingSignal.value) + (hostingSignal.confidence === 'probable' ? ' (probable)' : '') : null)
    || (edgeProvider ? `Behind ${edgeProvider}` : 'Unknown');
  correctable_fields.push({
    key: 'infrastructure',
    label: 'Infrastructure',
    inferred_value: infraDisplay,
  });

  // Follow-up questions only for signal types NOT inferred
  // Ask about infrastructure when recon couldn't detect it (Cloudflare proxy hides cloud provider)
  if (!reconInfra) {
    const edgeContext = edgeProvider
      ? `Your site is behind ${edgeProvider} — we can see the edge layer but not the underlying host.`
      : "We couldn't detect your hosting provider — it may be behind a proxy.";
    followup_questions.push({
      question_id: 'q_infrastructure',
      context: edgeContext,
      question: 'Where is your application hosted?',
      options: ['AWS', 'GCP', 'Azure', 'Cloudflare Workers', 'Multi-cloud', 'On-premise', 'Not sure'],
    });
  }
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
  if (!inferredTypes.has('pen_test_completed')) {
    followup_questions.push({
      question_id: 'q_pen_test',
      context: 'Penetration tests are increasingly required by enterprise buyers and insurers.',
      question: 'Have you had an independent penetration test in the last 12 months?',
      options: ['Yes', 'No', 'In progress', 'Not sure'],
    });
  }
  if (!inferredTypes.has('has_backup')) {
    followup_questions.push({
      question_id: 'q_backup',
      context: 'Automated backups and a tested recovery procedure are baseline expectations for B2B SaaS.',
      question: 'Do you have automated backups with a tested recovery procedure?',
      options: ['Yes', 'No', 'Partial', 'Not sure'],
    });
  }
  if (!inferredTypes.has('aws_program_enrolled') && recon.cloud_provider === 'aws') {
    followup_questions.push({
      question_id: 'q_aws_program',
      context: "Your infrastructure appears to be on AWS. AWS Activate gives startups up to $100k in credits.",
      question: 'Are you enrolled in the AWS Activate startup program?',
      options: ['Yes', 'No', 'Not sure'],
    });
  }

  const company_name = website_url ? extractCompanyName(website_url) : 'Your company';
  const source_summary = website_url
    ? `Read from: ${new URL(website_url).hostname} · ${sources_read.join(', ')} · ${signals.length} signals`
    : `Read from: uploaded deck · ${sources_read.join(', ')} · ${signals.length} signals`;

  return {
    company_name,
    source_summary,
    inferences: validInferences,
    correctable_fields,
    followup_questions,
    sources_read,
    signals_detected: signals.length,
  };
}

// Boolean signals only ever carry the literal value `true` (mapToSignals only
// pushes them when explicitly true) — so their label is a static human phrase,
// never a value-based template. Every boolean signal type signal-extractor.js
// can emit must have an entry here, or it falls through to `signal.value` (the
// bare boolean `true`) — the exact bug this closes.
const BOOLEAN_LABELS = {
  handles_payments: 'Handles payments',
  uses_ai: 'Uses AI',
  handles_personal_data: 'Handles personal data',
  pen_test_completed: 'Penetration tested',
  has_backup: 'Has backup / DR',
  aws_program_enrolled: 'AWS program enrolled',
  microsoft_program_enrolled: 'Microsoft program enrolled',
};

function inferenceLabel(signal) {
  const labels = {
    product_type: productTypeLabel(signal.value),
    customer_type: 'Targeting ' + String(signal.value).toLowerCase() + ' buyers',
    data_sensitivity: 'Processes ' + String(signal.value).toLowerCase(),
    stage: signal.value + ' stage',
    use_case: signal.value,
    ...BOOLEAN_LABELS,
  };
  return labels[signal.type] || signal.value;
}

// "Software product" + " product" doubled to "Software product product" — only
// append the word when the value doesn't already end with it.
function productTypeLabel(value) {
  const v = String(value ?? '').trim();
  return /\bproduct$/i.test(v) ? v : `${v} product`;
}

function signalCategory(type) {
  const map = {
    product_type: 'product', customer_type: 'market', data_sensitivity: 'data',
    stage: 'company', use_case: 'market', identity_model: 'identity',
    infrastructure: 'infrastructure', insurance_status: 'governance',
    handles_payments: 'data', uses_ai: 'product', handles_personal_data: 'data',
    pen_test_completed: 'governance', has_backup: 'infrastructure',
    aws_program_enrolled: 'company', microsoft_program_enrolled: 'company',
    // Dead entry in practice — buildInferences() skips 'works_with' in the loop
    // this map serves and assigns its category directly (see the vendor
    // relationships block below); kept in sync here so this map stays a
    // truthful reference of every signal type's category.
    works_with: 'relationship',
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

// A rendered chip must never be blank or a bare boolean — filter at the source
// so the frontend never has to guess what an empty/`true` label meant.
function isRenderableLabel(label) {
  if (label === null || label === undefined) return false;
  if (typeof label === 'boolean') return false;
  if (typeof label === 'string' && label.trim() === '') return false;
  return true;
}

// Loose provider-name equality: case/whitespace-insensitive, with the common
// long-form ↔ short-form aliases a probe and marketing copy might disagree on
// spelling rather than fact.
const PROVIDER_ALIASES = {
  'amazon web services': 'aws',
  'google cloud platform': 'google cloud',
  'gcp': 'google cloud',
  'microsoft azure': 'azure',
  'oracle cloud infrastructure': 'oracle',
  'oracle cloud': 'oracle',
};

function normalizeProvider(value) {
  const s = String(value ?? '').toLowerCase().trim();
  return PROVIDER_ALIASES[s] || s;
}

// Canonical display names, matched by substring against ANY raw text — a live
// probe's raw org string ("Oracle Corporation"), a mis-cased alias ("aws"),
// or the signal-extractor's own_hosting_provider enum (already clean). Most
// specific pattern first so "oracle cloud infrastructure" doesn't fall
// through to a generic match. Unrecognised text (DigitalOcean, Hetzner, a raw
// ASN string, ...) renders exactly as given — never invent a name for
// something we can't classify.
const CANONICAL_PROVIDERS = [
  { pretty: 'AWS', patterns: ['amazon web services', 'amazon', 'aws'] },
  { pretty: 'GCP', patterns: ['google cloud platform', 'google cloud', 'gcp', 'google'] },
  { pretty: 'Azure', patterns: ['microsoft azure', 'azure', 'microsoft'] },
  { pretty: 'Oracle', patterns: ['oracle cloud infrastructure', 'oracle cloud', 'oracle'] },
  { pretty: 'Cloudflare', patterns: ['cloudflare'] },
];

// Display labels use the canonical pretty name, never a raw probe org string
// or a mis-cased alias — a rendered "Hosted on Oracle Corporation" or "Hosted
// on aws" is a cosmetic honesty gap the same way a fake percentage is (review
// M7).
function canonicalProviderLabel(value) {
  const s = String(value ?? '').toLowerCase().trim();
  if (!s) return String(value ?? '');
  for (const { pretty, patterns } of CANONICAL_PROVIDERS) {
    if (patterns.some((p) => s.includes(p))) return pretty;
  }
  return String(value);
}

// Loose provider equality: exact normalized match first, then a fuzzy
// fallback that recognises a known provider name embedded in either raw
// string (a probe's "Oracle Corporation" vs a text claim's "Oracle") and
// compares canonical names. A raw org string must MATCH a shorter text claim
// naming the same provider — never manufacture a conflict over spelling or
// verbosity alone.
export function sameProvider(a, b) {
  if (!a || !b) return false;
  if (normalizeProvider(a) === normalizeProvider(b)) return true;
  return canonicalProviderLabel(a) === canonicalProviderLabel(b);
}

export { canonicalProviderLabel };

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'unknown';
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
