import { getSession, updateSession, appendLog } from '../services/session-store.js';
import { extractSignals } from '../services/signal-extractor.js';
import { buildInferences } from '../services/inference-builder.js';
import { runGapAnalysis } from '../services/gap-mapper.js';
import { normalizeContext } from '../services/context-normalizer.js';
import { extractReconContext } from '../services/recon-pipeline.js';
import { emitPulse } from '../services/pulse-emitter.js';

export async function resumeHandler(request, reply) {
  const { id } = request.params;
  const session = getSession(id);

  if (!session) {
    return reply.status(404).send({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
  }

  // Stage 1: extraction failed — re-run signal extraction + inference build
  if (session.infer_status === 'failed') {
    updateSession(id, {
      infer_status: 'processing',
      infer_started_at: Date.now(),
    });

    resumeExtraction(id, session);

    return reply.send({ resumed: 'extraction', session_id: id });
  }

  // Stage 2: analysis failed — re-run gap analysis
  if (session.analysis_status === 'failed') {
    updateSession(id, {
      analysis_status: 'processing',
      analysis_started_at: Date.now(),
    });

    resumeAnalysis(id, session);

    return reply.send({ resumed: 'analysis', session_id: id });
  }

  // Nothing to resume
  return reply.status(409).send({
    error: 'Session has no failed stage to resume',
    infer_status: session.infer_status,
    analysis_status: session.analysis_status,
  });
}

async function resumeExtraction(sessionId, session) {
  const log = (line) => appendLog(sessionId, line);
  try {
    const { signals, sources_read, enterprise_signals, competitor_mentions, recon_context } =
      await extractSignals(
        { website_url: session.website_url, deck_file: session.deck_file, session_id: sessionId },
        log,
      );

    const reconFlat = extractReconContext(recon_context);
    const inferenceResult = buildInferences(signals, sources_read, session.website_url, reconFlat);

    log({ type: '__done__' });
    updateSession(sessionId, {
      infer_status: 'complete',
      raw_signals: signals,
      inferences: inferenceResult.inferences,
      correctable_fields: inferenceResult.correctable_fields,
      followup_questions: inferenceResult.followup_questions,
      company_name: inferenceResult.company_name,
      source_summary: inferenceResult.source_summary,
      sources_read: inferenceResult.sources_read,
      signals_detected: inferenceResult.signals_detected,
      enterprise_signals,
      competitor_mentions,
      recon_context: recon_context || null,
    });

    emitPulse({
      type: 'event',
      severity: 'info',
      tags: ['pipeline', 'resumed'],
      payload: { action: 'extraction_resumed_ok', session_id: sessionId },
    });
  } catch (err) {
    console.error(JSON.stringify({
      event: 'resume_extraction_failed', session_id: sessionId, error: err.message,
    }));
    log({ text: `  ✗  Resume extraction failed: ${err.message}`, type: 'err' });
    log({ type: '__done__' });
    updateSession(sessionId, { infer_status: 'failed' });
  }
}

async function resumeAnalysis(sessionId, session) {
  try {
    const corrections = session.corrections || {};
    const followup_answers = session.followup_answers || {};
    const context = normalizeContext(session, corrections, followup_answers);

    const result = await runGapAnalysis(context, { session_id: sessionId });

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
      email_captured: !!session.email,
      timestamp: new Date().toISOString(),
      source: session.source || 'website',
    };

    updateSession(sessionId, {
      analysis_status: 'complete',
      gaps: result.gaps,
      vendors: result.vendors,
      trust_score: result.trust_score,
      readiness: result.readiness,
      signals,
    });

    emitPulse({
      type: 'event',
      severity: 'info',
      tags: ['pipeline', 'resumed'],
      payload: { action: 'analysis_resumed_ok', session_id: sessionId },
    });
  } catch (err) {
    console.error(JSON.stringify({
      event: 'resume_analysis_failed', session_id: sessionId, error: err.message,
    }));
    updateSession(sessionId, { analysis_status: 'failed' });
  }
}
