import { GAP_DEFINITIONS, SEVERITY_WEIGHTS } from '../config/gaps.js';
import { evaluateClaims } from './trust-client.js';
import { selectVendors } from './vendor-selector.js';

export async function runGapAnalysis(context) {
  // 1. Find which gaps are triggered by the context
  const triggered = GAP_DEFINITIONS.filter((gap) => gap.triggerCondition(context));

  // 2. Build Trust360 claims for each triggered gap
  const claims = triggered.map((gap) => {
    const { question, evidence } = gap.claimTemplate(context);
    return {
      question,
      evidence,
      metadata: { gapId: gap.id, severity: gap.severity },
    };
  });

  // 3. Evaluate claims via Trust360 (parallel)
  let claimResults = {};
  if (claims.length > 0) {
    try {
      claimResults = await evaluateClaims(claims);
    } catch (err) {
      // If Trust360 is unavailable, confirm all triggered gaps as fallback
      console.warn('Trust360 unavailable, confirming all triggered gaps:', err.message);
      for (const gap of triggered) {
        claimResults[gap.id] = { confirmed: true, mos: 8, fallback: true };
      }
    }
  }

  // 4. Build confirmed gap objects
  const gaps = triggered
    .filter((gap) => claimResults[gap.id]?.confirmed)
    .map((gap) => ({
      gap_id: gap.id,
      category: gap.category,
      severity: gap.severity === 'critical' ? 'critical' : gap.severity === 'high' ? 'moderate' : 'low',
      title: gap.label,
      why: generateWhy(gap, context),
      risk: generateRisk(gap, context),
      control: gap.label,
      closure_strategies: [],
      vendor_implementations: [],
      score_impact: SEVERITY_WEIGHTS[gap.severity],
      confidence: mosToConfidence(claimResults[gap.id]?.mos),
      evidence: [{ source: 'self-reported', citation: `Inferred from session signals` }],
      time_estimate: '',
    }));

  // 5. Compute trust score
  const totalPenalty = gaps.reduce(
    (sum, gap) => sum + gap.score_impact,
    0
  );
  const trust_score = Math.max(0, 100 - totalPenalty);

  // 6. Determine readiness
  const readiness = trust_score >= 80 ? 'ready' : trust_score >= 50 ? 'partial' : 'not_ready';

  // 7. Select vendors for confirmed gaps
  const vendors = selectVendors(gaps);

  return { gaps, vendors, trust_score, readiness };
}

function mosToConfidence(mos) {
  if (!mos) return 'medium';
  if (mos >= 8.5) return 'high';
  if (mos >= 7) return 'medium';
  return 'low';
}

function generateWhy(gap, context) {
  const whys = {
    soc2: `Without SOC 2 certification, enterprise buyers cannot verify your security controls. This is typically the first thing procurement asks for.`,
    mfa: `Password-only authentication is a critical security gap. Enterprise buyers will flag this immediately during vendor assessment.`,
    cyber_insurance: `No cyber insurance means your company carries the full financial risk of a breach. Investors and enterprise buyers increasingly require this.`,
    incident_response: `Without a documented incident response plan, you cannot demonstrate how you'd handle a security event. This is a standard enterprise requirement.`,
    vendor_questionnaire: `A stalled deal due to a security questionnaire signals that your trust posture is blocking revenue right now.`,
    edr: `Without endpoint detection and response, you have limited visibility into threats on your team's devices.`,
    sso: `Without SSO, user access management is fragmented. Enterprise IT teams expect centralised identity management.`,
  };
  return whys[gap.id] || `This gap was identified based on your current trust posture.`;
}

function generateRisk(gap, context) {
  const risks = {
    soc2: `Enterprise deals stall or fail at procurement. Fundraising due diligence flags this as a gap.`,
    mfa: `Account compromise risk is significantly higher. Enterprise buyers may reject your application outright.`,
    cyber_insurance: `A single breach could be financially devastating without coverage. Increasingly required by enterprise contracts.`,
    incident_response: `If a security event occurs, lack of a plan means slower response and greater damage. Buyers see this as operational immaturity.`,
    vendor_questionnaire: `Active revenue is being blocked. Each stalled questionnaire represents a deal at risk.`,
    edr: `Endpoint threats go undetected. This is a standard security control for any company handling customer data.`,
    sso: `User access is harder to manage and audit. Enterprise buyers expect centralised identity as a baseline.`,
  };
  return risks[gap.id] || `This gap increases risk to your enterprise deal readiness.`;
}
