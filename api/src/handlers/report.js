import { getSession } from '../services/session-store.js';
import { buildVendorIntelligence } from '../services/vendor-intelligence-builder.js';

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

  // Build context for vendor intelligence
  const context = {
    stage: session.signals?.stage,
    infrastructure: session.corrections?.infrastructure
      || session.correctable_fields?.find((f) => f.key === 'infrastructure')?.inferred_value,
  };

  // Enrich each gap with vendor_intelligence (brief-vendors.md shape)
  const enrichedGaps = gaps.map((gap) => ({
    ...gap,
    vendor_intelligence: buildVendorIntelligence(gap, context) || undefined,
  }));

  // Compute headline
  const criticalCount = gaps.filter((g) => g.severity === 'critical').length;
  const strengths = buildStrengths(gaps);
  const readyCount = strengths.length;

  // Build next steps
  const nextSteps = buildNextSteps(enrichedGaps, session.trust_score);

  const report = {
    session_id: id,
    company_name: session.company_name,
    assessed_at: new Date(session.createdAt).toISOString(),
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
  };

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

function buildStrengths(gaps) {
  // Areas where no gap was found
  const gapCategories = new Set(gaps.map((g) => g.category));
  const allCategories = ['infrastructure', 'identity', 'governance', 'monitoring'];
  return allCategories
    .filter((c) => !gapCategories.has(c))
    .map((c) => ({
      category: c,
      label: strengthLabel(c),
    }));
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
