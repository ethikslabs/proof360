import { createSession, updateSession } from '../services/session-store.js';
import { extractSignals } from '../services/signal-extractor.js';
import { buildInferences } from '../services/inference-builder.js';
import { emitPulse } from '../services/pulse-emitter.js';

export async function sessionStartHandler(request, reply) {
  const { website_url, deck_file } = request.body || {};

  if (!website_url && !deck_file) {
    return reply.status(400).send({
      error: 'Provide a website_url or deck_file',
      code: 'INVALID_INPUT',
    });
  }

  const session = createSession({ website_url, deck_file });

  emitPulse({
    type: 'event',
    severity: 'info',
    tags: ['assessment', 'started'],
    payload: { action: 'assessment_started', session_id: session.id, website_url: session.website_url },
  });

  // Fire async signal extraction pipeline — don't block the response
  extractAndInfer(session.id, { website_url, deck_file });

  return reply.status(201).send({ session_id: session.id });
}

async function extractAndInfer(sessionId, { website_url, deck_file }) {
  try {
    const { signals, sources_read, enterprise_signals, competitor_mentions } =
      await extractSignals({ website_url, deck_file });

    const inferenceResult = buildInferences(signals, sources_read, website_url);

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
    });
  } catch (err) {
    console.error(JSON.stringify({
      event: 'extraction_failed', session_id: sessionId, error: err.message,
    }));
    updateSession(sessionId, { infer_status: 'failed' });
  }
}
