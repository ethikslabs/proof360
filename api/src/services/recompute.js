// Deterministic recompute kernel. Pure function.
// SHALL NOT make external calls.
// SHALL NOT perform partial recompute.
// Idempotent: same inputs → identical output.
//
// Pipeline: build context → gap evaluation → trust score → AWS programs filter
//           → vendor matrix selection → confidence ribbon
//           → VERITAS render mapping → tier boundary enforcement

import { GAP_DEFINITIONS, SEVERITY_WEIGHTS } from '../config/gaps.js';
import { evaluateTrigger } from '../config/aws-programs.js';
import { selectVendors } from './vendor-selector.js';
import { VENDORS } from '../config/vendors.js';
import { generateFrameworkImpact } from '../config/framework-impact.js';

/**
 * Build a flat context object from signals + recon_outputs.
 * Same shape gap-mapper's triggerCondition expects.
 */
function buildContext(signals, recon_outputs) {
  const ctx = {};

  // Materialise signals: each signal row has { field, current_value }
  for (const sig of signals) {
    if (sig.field && sig.current_value !== undefined && sig.current_value !== null) {
      ctx[sig.field] = sig.current_value;
    }
  }

  // Flatten recon_outputs: each row has { source, payload (jsonb) }
  for (const ro of recon_outputs) {
    if (ro.payload && typeof ro.payload === 'object') {
      Object.assign(ctx, ro.payload);
    }
  }

  return ctx;
}

/**
 * Evaluate gaps: run each gap definition's triggerCondition against context.
 * Returns triggered gap objects with severity, framework_impact, remediation.
 */
function evaluateGaps(context, gaps_config) {
  const defs = gaps_config || GAP_DEFINITIONS;

  const triggered = defs.filter((gap) => {
    try {
      return gap.triggerCondition(context);
    } catch {
      return false;
    }
  });

  return triggered.map((gap) => ({
    id: gap.id,
    gap_def_id: gap.id,
    description: gap.label,
    severity: gap.severity,
    confidence: 'medium',
    evidence_summary: buildEvidenceSummary(gap, context),
    framework_impact: generateFrameworkImpact(gap.id, context),
    remediation: gap.remediation || [],
    why: gap.why || '',
    risk: gap.risk || '',
    time_estimate: gap.time_estimate || '',
  }));
}

/**
 * Build a human-readable evidence summary for a gap from context.
 */
function buildEvidenceSummary(gap, context) {
  try {
    const { question, evidence } = gap.claimTemplate(context);
    return evidence;
  } catch {
    return `Gap ${gap.id} triggered based on current signal state.`;
  }
}

/**
 * Compute trust score: 100 − Σ(severity weights of triggered gaps).
 */
function computeTrustScore(gaps) {
  const totalPenalty = gaps.reduce(
    (sum, gap) => sum + (SEVERITY_WEIGHTS[gap.severity] || 0),
    0
  );
  return Math.max(0, 100 - totalPenalty);
}

/**
 * Compute gap density summary by confidence level.
 */
function computeDensity(gaps) {
  const density = { total: gaps.length, high: 0, medium: 0, low: 0 };
  for (const gap of gaps) {
    if (density[gap.confidence] !== undefined) {
      density[gap.confidence]++;
    }
  }
  return density;
}

/**
 * Generate directional hints from gap analysis.
 */
function generateDirectionalHints(gaps, context) {
  const hints = [];

  const hasCritical = gaps.some((g) => g.severity === 'critical');
  const hasGovernance = gaps.some((g) => {
    const def = GAP_DEFINITIONS.find((d) => d.id === g.id);
    return def?.category === 'governance';
  });
  const hasIdentity = gaps.some((g) => {
    const def = GAP_DEFINITIONS.find((d) => d.id === g.id);
    return def?.category === 'identity';
  });
  const hasInfra = gaps.some((g) => {
    const def = GAP_DEFINITIONS.find((d) => d.id === g.id);
    return def?.category === 'infrastructure';
  });
  const hasHuman = gaps.some((g) => {
    const def = GAP_DEFINITIONS.find((d) => d.id === g.id);
    return def?.category === 'human';
  });

  if (hasCritical) {
    hints.push('Critical gaps detected — these will block enterprise deals and fundraising');
  }
  if (hasGovernance) {
    hints.push('Compliance posture appears partial — governance gaps need attention');
  }
  if (hasIdentity) {
    hints.push('Identity controls are below enterprise baseline');
  }
  if (hasInfra) {
    hints.push('Infrastructure security signals need strengthening');
  }
  if (hasHuman) {
    hints.push('Founder trust signals need strengthening before enterprise or investor conversations');
  }
  if (gaps.length === 0) {
    hints.push('No significant trust gaps detected — strong posture');
  }

  return {
    summary_line: hints[0] || '',
    items: hints,
  };
}

/**
 * Filter AWS programs based on signal triggers.
 */
function filterAWSPrograms(aws_programs_config, signalsMap) {
  const matched = [];

  for (const program of aws_programs_config) {
    const allTriggersMatch = program.triggers.every((trigger) =>
      evaluateTrigger(trigger, signalsMap)
    );

    if (allTriggersMatch) {
      matched.push({
        program_id: program.program_id,
        name: program.name,
        benefit: program.benefit,
        confidence: program.confidence_when_matched || 'medium',
      });
    }
  }

  return matched;
}

/**
 * Apply VERITAS render mapping to gaps.
 * Annotates each gap with veritas_class, veritas_confidence, render_status, and render_caveat.
 * Determines vendor matrix inclusion per the render mapping table:
 *   ATTESTED confidence > 0.85  → included, standard rendering
 *   ATTESTED confidence ≤ 0.85  → included, "attested with moderate confidence"
 *   INFERRED (any)              → excluded, "inferred — not yet attested"
 *   UNKNOWN  (any)              → excluded, "insufficient evidence to attest"
 *   No attestation (null class) → included (pre-VERITAS default)
 *
 * @param {object[]} gaps - evaluated gaps from gap evaluation
 * @param {object[]} gaps_db - persisted gap rows from Postgres with veritas_class, veritas_confidence
 * @returns {object[]} gaps annotated with render mapping fields
 */
function applyVeritasRenderMapping(gaps, gaps_db) {
  if (!gaps_db || gaps_db.length === 0) return gaps;

  // Index persisted gaps by gap_def_id for O(1) lookup
  const attestationMap = {};
  for (const dbGap of gaps_db) {
    if (dbGap.gap_def_id) {
      attestationMap[dbGap.gap_def_id] = dbGap;
    }
  }

  return gaps.map((gap) => {
    const dbGap = attestationMap[gap.id];
    if (!dbGap || !dbGap.veritas_class) {
      // No attestation data — keep gap as-is (pre-VERITAS default)
      return gap;
    }

    const veritas_class = dbGap.veritas_class;
    const veritas_confidence = dbGap.veritas_confidence != null
      ? Number(dbGap.veritas_confidence)
      : null;

    let vendor_matrix_included = false;
    let render_caveat = null;

    if (veritas_class === 'ATTESTED') {
      vendor_matrix_included = true;
      if (veritas_confidence !== null && veritas_confidence <= 0.85) {
        render_caveat = 'attested with moderate confidence';
      }
    } else if (veritas_class === 'INFERRED') {
      vendor_matrix_included = false;
      render_caveat = 'inferred — not yet attested';
    } else if (veritas_class === 'UNKNOWN') {
      vendor_matrix_included = false;
      render_caveat = 'insufficient evidence to attest';
    }

    return {
      ...gap,
      veritas_class,
      veritas_confidence,
      vendor_matrix_included,
      render_caveat,
    };
  });
}

/**
 * Build vendor recommendations with routing options.
 * Uses selectVendors for gap matching, then adds routing from vendor config.
 * Only includes gaps that pass the VERITAS render mapping (vendor_matrix_included).
 */
function buildVendorRecommendations(gaps, context, vendors_config) {
  // Filter to only gaps included in vendor matrix
  // Gaps without vendor_matrix_included field are included by default (pre-VERITAS)
  const matrixGaps = gaps.filter((g) =>
    g.vendor_matrix_included === undefined || g.vendor_matrix_included === true
  );

  // selectVendors expects gaps with gap_id field
  const gapsForSelector = matrixGaps.map((g) => ({
    gap_id: g.id,
    severity: g.severity === 'critical' ? 'critical' : g.severity === 'high' ? 'moderate' : 'low',
  }));

  const selected = selectVendors(gapsForSelector);

  // Build a lookup for gap veritas data
  const gapVeritasMap = {};
  for (const g of gaps) {
    gapVeritasMap[g.id] = { veritas_class: g.veritas_class || null, veritas_confidence: g.veritas_confidence || null };
  }

  // Enrich with routing options and veritas fields
  const vendorCatalog = vendors_config || VENDORS;

  return selected.map((v) => {
    const vendorDef = vendorCatalog[v.vendor_id];
    let routing_options = null;

    if (vendorDef && typeof vendorDef.routing === 'function') {
      try {
        routing_options = vendorDef.routing(context);
      } catch {
        routing_options = null;
      }
    }

    // Derive veritas fields from the gaps this vendor closes
    // Use the highest-confidence attestation among closed gaps
    let vendor_veritas_class = null;
    let vendor_veritas_confidence = null;
    let vendor_render_caveat = null;
    for (const closedGapId of v.closes_gaps) {
      const gapData = gaps.find((g) => g.id === closedGapId);
      if (gapData?.veritas_class) {
        vendor_veritas_class = gapData.veritas_class;
        vendor_veritas_confidence = gapData.veritas_confidence;
        vendor_render_caveat = gapData.render_caveat || null;
        break;
      }
    }

    return {
      vendor_id: v.vendor_id,
      display_name: v.display_name,
      closes_gaps: v.closes_gaps,
      priority: v.priority,
      routing_options,
      veritas_class: vendor_veritas_class,
      veritas_confidence: vendor_veritas_confidence,
      render_caveat: vendor_render_caveat,
    };
  });
}

/**
 * Derive confidence ribbon from recon source coverage.
 */
function deriveConfidenceRibbon(recon_outputs) {
  // Known recon sources the pipeline attempts
  const KNOWN_SOURCES = [
    'dns', 'http', 'certs', 'ip', 'github', 'jobs',
    'hibp', 'ports', 'ssllabs', 'abuseipdb',
  ];

  const sources_attempted = KNOWN_SOURCES.length;
  const succeeded = new Set();

  for (const ro of recon_outputs) {
    if (ro.source && ro.payload) {
      // Normalise source name to match known sources
      const normalised = ro.source.replace(/^recon[-_]/, '').toLowerCase();
      if (KNOWN_SOURCES.includes(normalised)) {
        succeeded.add(normalised);
      } else if (KNOWN_SOURCES.includes(ro.source.toLowerCase())) {
        succeeded.add(ro.source.toLowerCase());
      }
    }
  }

  const sources_succeeded = succeeded.size;
  const ratio = sources_attempted > 0 ? sources_succeeded / sources_attempted : 0;

  let overall;
  if (ratio >= 0.8) overall = 'high';
  else if (ratio >= 0.5) overall = 'medium';
  else overall = 'low';

  return { overall, sources_attempted, sources_succeeded };
}

/**
 * Deterministic recompute kernel. Pure function.
 *
 * Pipeline: build context → gap evaluation → trust score → AWS programs filter
 *           → vendor matrix selection → confidence ribbon
 *           → VERITAS render mapping → tier boundary enforcement
 *
 * @param {{ signals: object[], recon_outputs: object[], session: object, gaps_config?: object[], vendors_config?: object, aws_programs: object[], gaps_db?: object[] }} input
 * @returns {{ derived_state: object }}
 */
export function recompute({ signals, recon_outputs, session, gaps_config, vendors_config, aws_programs, gaps_db }) {
  // 1. Build context from signals + recon_outputs
  const context = buildContext(signals, recon_outputs);

  // 2. Gap evaluation
  const rawGaps = evaluateGaps(context, gaps_config);

  // 3. Apply VERITAS render mapping (annotates gaps with veritas_class, vendor_matrix_included, render_caveat)
  const gaps = applyVeritasRenderMapping(rawGaps, gaps_db);

  // 4. Density (computed over all triggered gaps, not just vendor-matrix-included)
  const density = computeDensity(gaps);

  // 5. Directional hints
  const directional_hints = generateDirectionalHints(gaps, context);

  // 6. Confidence ribbon
  const confidence_ribbon = deriveConfidenceRibbon(recon_outputs);

  // 7. Build render-safe signal list for override UI (NOT Tier-2-gated)
  const signalList = signals.map((s) => ({
    field: s.field,
    current_value: s.current_value,
    inferred_value: s.inferred_value,
    status: s.status,
    current_actor: s.current_actor || null,
  }));

  const tier1Gaps = gaps.map((g) => ({
    id: g.id,
    description: g.description,
    confidence: g.confidence,
    evidence_summary: g.evidence_summary,
  }));

  const tier2Gaps = gaps.map((g) => ({
    id: g.id,
    title: g.description,
    description: g.description,
    severity: g.severity,
    confidence: g.confidence,
    evidence_summary: g.evidence_summary,
    why: g.why,
    risk: g.risk,
    time_estimate: g.time_estimate,
    remediation: g.remediation,
    framework_impact: g.framework_impact,
  }));

  const tier1 = {
    session_id: session.id || session.session_id,
    status: session.status,
    gaps: tier1Gaps,
    density,
    directional_hints,
    confidence_ribbon,
    signals: signalList,
  };

  // Always compute full data — founders see everything immediately
  const trust_score = computeTrustScore(gaps);

  // Build signals map for AWS program evaluation (field → current_value)
  const signalsMap = {};
  for (const sig of signals) {
    if (sig.field && sig.current_value !== undefined && sig.current_value !== null) {
      signalsMap[sig.field] = sig.current_value;
    }
  }

  const aws_programs_matched = filterAWSPrograms(aws_programs || [], signalsMap);

  const routingContext = { signals: signalsMap, tenant: null, session, derived_state: tier1 };
  const vendor_recommendations = buildVendorRecommendations(gaps, routingContext, vendors_config);

  const engagement_router = {
    available: true,
    vendor_count: vendor_recommendations.length,
  };

  if (session.status !== 'tier2_published') {
    return { derived_state: tier1 };
  }

  return {
    derived_state: {
      ...tier1,
      gaps: tier2Gaps,
      trust_score,
      vendor_recommendations,
      aws_programs: aws_programs_matched,
      engagement_router,
    },
  };
}
