import { getSession, updateSession } from '../services/session-store.js';
import { runGapAnalysis } from '../services/gap-mapper.js';
import { normalizeContext } from '../services/context-normalizer.js';

export async function submitHandler(request, reply) {
  const { id } = request.params;
  const session = getSession(id);

  if (!session) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  if (session.infer_status !== 'complete') {
    return reply.status(409).send({ error: 'Inferences not ready yet' });
  }

  if (session.analysis_status === 'processing') {
    return reply.status(409).send({ error: 'Analysis already in progress', code: 'ALREADY_PROCESSING' });
  }

  const { corrections, followup_answers } = request.body || {};

  // Store corrections and answers
  updateSession(id, {
    corrections: corrections || {},
    followup_answers: followup_answers || {},
    analysis_status: 'processing',
  });

  // Kick off gap analysis async
  analyzeAsync(id, session, corrections || {}, followup_answers || {});

  return reply.send({ status: 'processing' });
}

async function analyzeAsync(sessionId, session, corrections, followup_answers) {
  try {
    // Merge inferred signals + corrections + follow-up answers into a context object
    const context = normalizeContext(session, corrections, followup_answers);

    const result = await runGapAnalysis(context);

    // Build the non-negotiable signals object (brief-strategy.md)
    const signals = {
      session_id: sessionId,
      company_name: session.company_name,
      website: session.website_url,
      deck_uploaded: !!session.deck_file,
      stage: context.stage || 'unknown',
      sector: context.sector || 'unknown',
      primary_use_case: context.use_case || 'enterprise_sales',
      questions_answered: Object.entries(followup_answers).map(([qid, answer]) => ({
        question_id: qid,
        answer,
      })),
      gaps: result.gaps,
      trust_score: result.trust_score,
      deal_readiness: result.readiness,
      email_captured: false,
      timestamp: new Date().toISOString(),
      source: 'website',
    };

    updateSession(sessionId, {
      analysis_status: 'complete',
      gaps: result.gaps,
      vendors: result.vendors,
      trust_score: result.trust_score,
      readiness: result.readiness,
      signals,
    });
  } catch (err) {
    console.error(`Gap analysis failed for session ${sessionId}:`, err);
    updateSession(sessionId, { analysis_status: 'failed' });
  }
}

