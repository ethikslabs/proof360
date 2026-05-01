import { createSession, updateSession, appendLog } from '../services/session-store.js';
import { extractSignals } from '../services/signal-extractor.js';
import { buildInferences } from '../services/inference-builder.js';
import { emitPulse } from '../services/pulse-emitter.js';
import { extractReconContext } from '../services/recon-pipeline.js';
import { query } from '../db/pool.js';

const RECON_SOURCES = ['dns', 'http', 'certs', 'ip', 'github', 'jobs', 'hibp', 'ports', 'ssllabs', 'abuseipdb'];

export async function sessionStartHandler(request, reply) {
  const { website_url, deck_file, source } = request.body || {};

  if (!website_url && !deck_file) {
    return reply.status(400).send({
      error: 'Provide a website_url or deck_file',
      code: 'INVALID_INPUT',
    });
  }

  // Create session in Postgres — canonical UUID source
  const pgRes = await query(
    `INSERT INTO sessions (url, status) VALUES ($1, 'active') RETURNING id`,
    [website_url || null]
  );
  const sessionId = pgRes.rows[0].id;

  // Mirror into in-memory store with the Postgres UUID (pipeline state adapters read from here)
  const session = createSession({ id: sessionId, website_url, deck_file, source: source || 'user' });

  emitPulse({
    type: 'event',
    severity: 'info',
    tags: ['assessment', 'started'],
    payload: { action: 'assessment_started', session_id: session.id, website_url: session.website_url },
  });

  extractAndInfer(session.id, { website_url, deck_file, session_id: session.id }, (line) => appendLog(session.id, line));

  return reply.status(201).send({ session_id: session.id });
}

async function extractAndInfer(sessionId, { website_url, deck_file, session_id }, log) {
  try {
    const { signals, sources_read, enterprise_signals, competitor_mentions, recon_context, company_summary } =
      await extractSignals({ website_url, deck_file, session_id }, log);

    const reconFlat = extractReconContext(recon_context);
    const inferenceResult = buildInferences(signals, sources_read, website_url, reconFlat);

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
      company_summary: company_summary || null,
    });

    // Persist signals and recon to Postgres — non-blocking, failures don't affect in-memory pipeline
    persistExtractionResults(sessionId, { signals, recon_context }).catch((err) => {
      console.error(JSON.stringify({ event: 'pg_persist_failed', session_id: sessionId, error: err.message }));
    });
  } catch (err) {
    console.error(JSON.stringify({
      event: 'extraction_failed', session_id: sessionId, error: err.message,
    }));
    emitPulse({
      type: 'alert',
      severity: 'warning',
      tags: ['pipeline', 'error'],
      payload: { action: 'extraction_failed', session_id: sessionId, error: err.message },
    });
    log({ text: `  ✗  Extraction failed: ${err.message}`, type: 'err' });
    log({ type: '__done__' });
    updateSession(sessionId, { infer_status: 'failed' });
  }
}

async function persistExtractionResults(sessionId, { signals, recon_context }) {
  const now = new Date().toISOString();

  for (const signal of signals) {
    await query(
      `INSERT INTO signals (session_id, field, inferred_value, inferred_source, inferred_at, status)
       VALUES ($1, $2, $3, $4, $5, 'inferred')
       ON CONFLICT (session_id, field) DO NOTHING`,
      [sessionId, signal.type, String(signal.value), 'extractor', now]
    );
  }

  if (recon_context) {
    for (const source of RECON_SOURCES) {
      const payload = recon_context[source];
      if (payload && !payload.error) {
        await query(
          `INSERT INTO recon_outputs (session_id, source, payload, fetched_at, ttl_seconds)
           VALUES ($1, $2, $3, now(), 3600)
           ON CONFLICT (session_id, source) DO NOTHING`,
          [sessionId, source, JSON.stringify(payload)]
        );
      }
    }
  }
}
