// POST /api/v1/session/:id/analyze
// Runs gap analysis on the in-memory session and writes trust_score + gaps back.
// Called by the chat UI immediately after infer-status reaches 'complete'.
// Idempotent: if trust_score is already set, returns cached result immediately.

import { getSession, updateSession } from '../services/session-store.js';
import { normalizeContext } from '../services/context-normalizer.js';
import { runGapAnalysis } from '../services/gap-mapper.js';
import { generateReading } from '../services/cold-reading.js';

export async function analyzeHandler(request, reply) {
  const { id } = request.params;
  const session = getSession(id);

  if (!session) {
    return reply.status(404).send({ error: 'session_not_found' });
  }
  if (session.infer_status !== 'complete') {
    return reply.status(425).send({ error: 'inference_not_complete', status: session.infer_status });
  }

  // Already analyzed — return cached result. `reading`/`reading_anchors` were
  // generated (or honestly attempted and came back null/[]) the first time this
  // session hit the fresh path below — never re-generated here, so a re-analyze never
  // re-bills Bedrock (or the corpus lookup).
  if (session.trust_score != null) {
    return reply.send({
      session_id: session.id,
      company_name: session.company_name,
      trust_score: session.trust_score,
      gaps: session.gaps,
      deal_readiness: session.deal_readiness,
      inferences: session.inferences,
      sources_read: session.sources_read,
      pages_read_count: session.pages_read_count ?? 0,
      reading: session.reading ?? null,
      reading_anchors: session.reading_anchors ?? [],
    });
  }

  const context = normalizeContext(session);
  const { gaps, trust_score, readiness, vendors } = await runGapAnalysis(context, { session_id: id });

  // "The reading" (John ruling 2026-08-25): a synthesized, hedged cold-read paragraph,
  // with a deterministic evidence-anchor trail alongside it. Honest degradation is
  // built into generateReading() — Bedrock failure or empty output resolves to
  // { reading: null, anchors: [] } here, and the frontend opener falls back to the
  // existing bullet list silently (chips disappear with it — the two are atomic).
  // Cached on the session (below) so re-analyze never regenerates either.
  const { reading, anchors: reading_anchors } = await generateReading(session);

  updateSession(id, {
    trust_score,
    gaps,
    deal_readiness: readiness,
    vendors,
    merged_context: context,
    analysis_status: 'complete',
    reading,
    reading_anchors,
  });

  return reply.send({
    session_id: session.id,
    company_name: session.company_name,
    trust_score,
    gaps,
    deal_readiness: readiness,
    inferences: session.inferences,
    sources_read: session.sources_read,
    pages_read_count: session.pages_read_count ?? 0,
    reading,
    reading_anchors,
  });
}
