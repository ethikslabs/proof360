// POST /api/v1/session/:id/analyze
// Runs gap analysis on the in-memory session and writes trust_score + gaps back.
// Called by the chat UI immediately after infer-status reaches 'complete'.
// Idempotent: if trust_score is already set, returns cached result immediately.

import { getSession, updateSession } from '../services/session-store.js';
import { normalizeContext } from '../services/context-normalizer.js';
import { runGapAnalysis } from '../services/gap-mapper.js';

export async function analyzeHandler(request, reply) {
  const { id } = request.params;
  const session = getSession(id);

  if (!session) {
    return reply.status(404).send({ error: 'session_not_found' });
  }
  if (session.infer_status !== 'complete') {
    return reply.status(425).send({ error: 'inference_not_complete', status: session.infer_status });
  }

  // Already analyzed — return cached result
  if (session.trust_score != null) {
    return reply.send({
      session_id: session.id,
      company_name: session.company_name,
      trust_score: session.trust_score,
      gaps: session.gaps,
      deal_readiness: session.deal_readiness,
      inferences: session.inferences,
    });
  }

  const context = normalizeContext(session);
  const { gaps, trust_score, readiness, vendors } = await runGapAnalysis(context, { session_id: id });

  updateSession(id, {
    trust_score,
    gaps,
    deal_readiness: readiness,
    vendors,
    merged_context: context,
    analysis_status: 'complete',
  });

  return reply.send({
    session_id: session.id,
    company_name: session.company_name,
    trust_score,
    gaps,
    deal_readiness: readiness,
    inferences: session.inferences,
  });
}
