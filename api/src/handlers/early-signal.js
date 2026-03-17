import { getSession } from '../services/session-store.js';
import { SEVERITY_WEIGHTS } from '../config/gaps.js';

export async function earlySignalHandler(request, reply) {
  const { id } = request.params;
  const session = getSession(id);

  if (!session) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  if (session.infer_status !== 'complete') {
    return reply.status(409).send({ error: 'Insufficient signal data', status: session.infer_status });
  }

  // Estimate score from inferences without running the full gap pipeline
  const inferences = session.inferences || [];
  let penalty = 0;

  if (inferences.some((i) => i.inference_id === 'inf_compliance')) {
    penalty += SEVERITY_WEIGHTS.critical; // likely no SOC 2
  }
  if (!inferences.some((i) => i.inference_id === 'inf_identity')) {
    penalty += SEVERITY_WEIGHTS.critical; // identity model unknown — assume worst
  }

  const estimated_trust_score = Math.max(20, 100 - penalty);
  const preliminary_deal_readiness =
    estimated_trust_score >= 80 ? 'ready' : estimated_trust_score >= 50 ? 'partial' : 'not_ready';

  // Message matches the frontend brief tone (brief-frontend.md)
  const sector = session.correctable_fields?.find((f) => f.key === 'customer_type')?.inferred_value || 'B2B SaaS';
  const message = `Companies like yours typically score around ${estimated_trust_score}. Let's see how you compare.`;

  return reply.send({ estimated_trust_score, preliminary_deal_readiness, message });
}
