import { getSession } from '../services/session-store.js';
import { buildVendorIntelligence } from '../services/vendor-intelligence-builder.js';
import { emitPulse } from '../services/pulse-emitter.js';
import { extractReconContext } from '../services/recon-pipeline.js';

export async function reportHandler(request, reply) {
  const { id } = request.params;
  const session = getSession(id);

  if (!session) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  if (session.analysis_status !== 'complete') {
    return reply.status(409).send({
      error: 'Analysis not complete',
      status: session.analysis_status || 'not_started',
    });
  }

  const gaps = session.gaps || [];
  const vendors = session.vendors || [];

  // Extract recon context first — needed by both vendor intelligence and strengths
  const recon = extractReconContext(session.recon_context);

  // Build context for vendor intelligence
  // Check corrections, then follow-up answers (q_infrastructure), then correctable field inferred value
  const infrastructure = session.corrections?.infrastructure
    || session.followup_answers?.q_infrastructure
    || session.correctable_fields?.find((f) => f.key === 'infrastructure')?.inferred_value;

  // Derive cloud_provider: recon IP lookup wins, but falls back to founder's infrastructure correction.
  // Needed because Cloudflare proxies hide the real hosting provider from IP-based detection.
  const infraStr = (infrastructure || '').toLowerCase();
  const cloudProviderFromInfra = infraStr.includes('aws') ? 'AWS'
    : infraStr.includes('gcp') ? 'GCP'
    : infraStr.includes('azure') ? 'Azure'
    : null;

  const context = {
    stage: session.signals?.stage,
    infrastructure,
    cdn_provider: recon.cdn_provider || null,
    waf_detected: recon.waf_detected || null,
    cloud_provider: recon.cloud_provider || cloudProviderFromInfra,
  };

  // Enrich each gap with vendor_intelligence.
  // Always include the data — the frontend gates visibility on the email capture.
  // Server-side gating requires a live session on re-fetch which breaks on restart.
  const enrichedGaps = gaps.map((gap) => {
    const enriched = { ...gap };
    enriched.vendor_intelligence = buildVendorIntelligence(gap, context) || undefined;
    return enriched;
  });

  // Compute headline
  const criticalCount = gaps.filter((g) => g.severity === 'critical').length;
  const strengths = buildStrengths(gaps, recon);
  const readyCount = strengths.length;

  // Build next steps
  const nextSteps = buildNextSteps(enrichedGaps, session.trust_score);

  const report = {
    session_id: id,
    company_name: session.company_name,
    website: session.website_url || null,
    assessed_at: new Date(session.created_at).toISOString(),
    trust_score: session.trust_score,
    deal_readiness_label: readinessLabel(session.readiness),
    deal_readiness_score: session.trust_score,
    headline: {
      ready_count: readyCount,
      blocking_count: criticalCount,
      summary_line: `Enterprise-ready in ${readyCount} areas. ${criticalCount} gaps blocking deals now.`,
    },
    snapshot: {
      deal_blockers: criticalCount,
      fundraising_risk: gaps.filter((g) => g.severity === 'moderate').length,
      strengths: readyCount,
    },
    gaps: enrichedGaps,
    strengths,
    next_steps: nextSteps,
    layer2_locked: session.layer2_locked,
    recon_summary: buildReconSummary(recon),
    aws_activate: buildAwsActivate(context, enrichedGaps),
    signals: buildSignals(session, recon),
  };

  emitPulse({
    type: 'event',
    severity: 'info',
    tags: ['trust_score', 'report'],
    payload: {
      action: 'report_generated',
      session_id: id,
      trust_score: session.trust_score,
      gap_count: session.gaps?.length || 0,
      deal_readiness: session.readiness,
    },
  });

  return reply.send(report);
}

function readinessLabel(readiness) {
  const labels = {
    ready: 'Enterprise deal ready',
    partial: 'Partially ready — gaps to close',
    not_ready: 'Not enterprise ready',
  };
  return labels[readiness] || 'Assessment complete';
}

// Build a small flat object for the frontend — just what it needs to render context-aware copy
function buildReconSummary(recon) {
  if (!recon || Object.keys(recon).length === 0) return null;
  return {
    cloud_provider:  recon.cloud_provider  || null,
    cdn_provider:    recon.cdn_provider    || null,
    waf_detected:    recon.waf_detected    || null,
    tls_version:     recon.tls_version     || null,
    dmarc_policy:    recon.dmarc_policy    || null,
    spf_policy:      recon.spf_policy      || null,
    mx_provider:     recon.mx_provider     || null,
    frontend_framework:   recon.frontend_framework   || null,
    open_ports:           recon.open_ports           || [],
    risky_port_count:     recon.risky_port_count     ?? 0,
    critical_port_count:  recon.critical_port_count  ?? 0,
    has_exposed_db:       recon.has_exposed_db       ?? false,
    has_ssh:              recon.has_ssh              ?? false,
  };
}

function buildStrengths(gaps, recon) {
  const gapIds = new Set(gaps.map((g) => g.gap_id));
  const gapCategories = new Set(gaps.map((g) => g.category));

  // Category-level strengths (areas with no gaps)
  const allCategories = ['infrastructure', 'identity', 'governance', 'monitoring'];
  const categoryStrengths = allCategories
    .filter((c) => !gapCategories.has(c))
    .map((c) => ({ category: c, label: strengthLabel(c) }));

  // Recon-detected positives — only things that aren't already flagged as gaps
  const reconStrengths = [];
  if (recon) {
    // WAF / CDN
    if (recon.waf_detected && recon.waf_detected !== 'none') {
      reconStrengths.push({ category: 'waf', label: `${recon.waf_detected} active` });
    } else if (recon.cdn_provider) {
      reconStrengths.push({ category: 'cdn', label: `${recon.cdn_provider} CDN and edge protection` });
    }
    // Cloud provider
    if (recon.cloud_provider) {
      reconStrengths.push({ category: 'cloud', label: `Hosted on ${recon.cloud_provider}` });
    }
    // TLS
    if (recon.tls_is_current && !gapIds.has('tls_configuration')) {
      reconStrengths.push({ category: 'tls', label: `${recon.tls_version || 'Current TLS'} — modern encryption` });
    }
    // SPF
    if (recon.spf_policy === 'strict' && !gapIds.has('spf')) {
      reconStrengths.push({ category: 'spf', label: 'SPF strict — email authentication enforced' });
    }
    // HSTS
    if (recon.has_hsts && !gapIds.has('security_headers')) {
      reconStrengths.push({ category: 'hsts', label: 'HSTS enforced — HTTPS required' });
    }
    // DMARC (only if enforced, i.e. not a gap)
    if (!gapIds.has('dmarc') && recon.dmarc_policy && recon.dmarc_policy !== 'none') {
      reconStrengths.push({ category: 'dmarc', label: `DMARC ${recon.dmarc_policy} — email impersonation blocked` });
    }
    // No breach history
    if (recon.domain_in_breach === false && recon.breach_count === 0) {
      reconStrengths.push({ category: 'hibp', label: 'No known domain breach history' });
    }
  }

  return [...categoryStrengths, ...reconStrengths];
}

function strengthLabel(category) {
  const labels = {
    infrastructure: 'Infrastructure security baseline met',
    identity: 'Identity and access controls in place',
    governance: 'Governance and compliance foundations present',
    monitoring: 'Monitoring and incident response capability',
  };
  return labels[category] || `${category} baseline met`;
}

const FIELD_LABELS = {
  sector: 'Sector', stage: 'Stage', customer_type: 'Customer type',
  infrastructure: 'Infrastructure', compliance_status: 'Compliance status',
  identity_model: 'Identity model', insurance_status: 'Cyber insurance',
  data_sensitivity: 'Data sensitivity', geo_market: 'Market',
  handles_payments: 'Handles payments',
};

function buildSignals(session, recon) {
  const signals = [];
  const corrections = session.corrections || {};
  const followupAnswers = session.followup_answers || {};

  // Correctable fields — the main assessed signals
  const correctable = session.correctable_fields || [];
  for (const field of correctable) {
    const corrected = corrections[field.key];
    const followup = followupAnswers[`q_${field.key}`] || followupAnswers[`q_identity`];
    const value = corrected || (field.key === 'infrastructure' ? followupAnswers.q_infrastructure : null) || field.inferred_value;
    if (!value) continue;
    signals.push({
      key: field.key,
      label: field.label || FIELD_LABELS[field.key] || field.key,
      value: String(value).replace(' (probable)', ''),
      type: 'assessed',
    });
  }

  // Fill gaps from raw_signals not already in correctable
  const existingKeys = new Set(signals.map(s => s.key));
  for (const sig of session.raw_signals || []) {
    if (existingKeys.has(sig.type)) continue;
    if (!FIELD_LABELS[sig.type]) continue;
    signals.push({
      key: sig.type,
      label: FIELD_LABELS[sig.type],
      value: String(sig.value),
      type: 'assessed',
    });
    existingKeys.add(sig.type);
  }

  // DNS signals from recon — always authoritative
  if (recon.dmarc_policy) signals.push({ key: 'dmarc_policy', label: 'DMARC', value: recon.dmarc_policy, type: 'dns' });
  if (recon.spf_policy)   signals.push({ key: 'spf_policy',   label: 'SPF',   value: recon.spf_policy,   type: 'dns' });
  if (recon.mx_provider)  signals.push({ key: 'mx_provider',  label: 'MX provider', value: recon.mx_provider, type: 'dns' });
  if (recon.ssl_grade)    signals.push({ key: 'ssl_grade',    label: 'SSL grade',   value: recon.ssl_grade,   type: 'tls' });

  return signals;
}

function buildAwsActivate(context, gaps) {
  const isAWS = context.cloud_provider === 'AWS';

  // Check vendors list (not just pick) so this fires regardless of cloud detection
  const marketplaceGaps = gaps.filter((g) => {
    const vi = g.vendor_intelligence;
    if (!vi) return false;
    return vi.vendors?.some((v) => v.marketplace_aws || v.aws_native);
  });
  const hasMarketplacePicks = marketplaceGaps.length > 0;

  if (!isAWS && !hasMarketplacePicks) return null;

  if (isAWS) {
    return {
      eligible: true,
      headline: 'You\'re on AWS — your credits can close these gaps',
      body: 'As a proof360 user, you qualify for AWS Activate credits. Every vendor recommendation marked "AWS Marketplace" can be purchased against your existing AWS commitment or offset with Activate credits.',
      marketplace_gap_count: marketplaceGaps.length,
      cta_label: 'Apply for AWS Activate credits via proof360',
      cta_type: 'activate',
    };
  }

  return {
    eligible: true,
    headline: 'These fixes are available on AWS Marketplace',
    body: `${marketplaceGaps.length} of your recommended tools are listed on AWS Marketplace. If you\'re running on AWS, you can purchase them against your existing commitment — and AWS Activate credits can offset the cost.`,
    marketplace_gap_count: marketplaceGaps.length,
    cta_label: 'Learn about AWS Activate',
    cta_type: 'marketplace',
  };
}

function buildNextSteps(gaps, trustScore) {
  // Sort by score_impact descending — fix highest impact first
  const sorted = [...gaps]
    .filter((g) => g.score_impact > 0)
    .sort((a, b) => b.score_impact - a.score_impact);

  return sorted.map((gap, i) => ({
    step_number: i + 1,
    title: `Fix: ${gap.title}`,
    score_trajectory: `${trustScore} → ${trustScore + gap.score_impact} (+${gap.score_impact})`,
    description: gap.why,
  }));
}
