import { createSession, updateSession, appendLog } from '../services/session-store.js';
import { extractSignals } from '../services/signal-extractor.js';
import { buildInferences } from '../services/inference-builder.js';
import { buildInferredClaims } from '../services/claims-projection.js';
import { emitPulse } from '../services/pulse-emitter.js';
import { extractReconContext } from '../services/recon-pipeline.js';
import { retrieveCorpusEvidence } from '../services/corpus-retrieve.js';
import { corpusQueryFor } from '../services/cold-reading.js';
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
    const { signals, sources_read, enterprise_signals, competitor_mentions, recon_context, company_summary, pages_read_count, used_web_research, research_engines } =
      await extractSignals({ website_url, deck_file, session_id }, log);

    const reconFlat = extractReconContext(recon_context);
    const inferenceResult = buildInferences(signals, sources_read, website_url, reconFlat);

    // Seed the Record (ETHL-WRK-SPEC-011): every probe/extraction output becomes an
    // inferred claim with named provenance — inferred until the founder confirms.
    const claimRecords = buildInferredClaims({ recon: reconFlat, signals });

    // Act 8 — corpus (John ruling 2026-08-25): scan-time retrieval feeding read-time
    // use, one call, one bill. Same query construction as cold-reading.js's
    // corpusEvidence() (corpusQueryFor) so the cached hits ARE the same retrieval the
    // reading would otherwise do. Cache contract on session.corpus_hits (retrieveCorpusEvidence's
    // three-state contract, corpus-retrieve.js): absent = never attempted (field predates
    // this cache); null = attempted, could NOT look — unreachable/timeout/!ok, or no
    // company to query with (no retry either way); [] = attempted, reached fine, nothing
    // scored (a real, honest zero — distinct from null, ABSENCE RULE); array = hits.
    log({ type: 'act', act: 'corpus', phase: 'start', title: 'Checking our research holdings', note: 'corpus · veritas' });
    const corpusQuery = corpusQueryFor({ company_name: inferenceResult.company_name, website_url });
    let corpus_hits = null;
    if (corpusQuery) {
      log({ act: 'corpus', type: 'act_body', text: corpusQuery, color: 'query' });
      corpus_hits = await retrieveCorpusEvidence(corpusQuery, { company_name: inferenceResult.company_name }).catch(() => null);
    }
    if (corpus_hits?.length) {
      for (const hit of corpus_hits) {
        log({ act: 'corpus', type: 'act_body', text: `↳  ${hit.slug} · ${hit.layer} · score ${Number(hit.score).toFixed(2)}` });
      }
      log({ type: 'act', act: 'corpus', phase: 'done', note: `${corpus_hits.length} holdings` });
    } else if (corpus_hits !== null) {
      // Reached the corpus fine, nothing scored — an honest zero we DID look for,
      // never confused with the could-not-look case below (ABSENCE RULE).
      log({ act: 'corpus', type: 'act_body', text: 'no holdings touch this company yet', color: 'muted' });
      log({ type: 'act', act: 'corpus', phase: 'done', note: '0 holdings' });
    } else {
      // Could not look at all — unreachable/timeout/!ok, or no company identified to
      // query with. No absence body line: we never looked, so we cannot honestly say
      // what we found (ABSENCE RULE — could-not-look ≠ looked-and-found-nothing).
      log({ type: 'act', act: 'corpus', phase: 'skip', note: corpusQuery ? 'corpus unreachable' : 'no company identified' });
    }

    // Success path: no __done__ here — the stream stays open through analyze.js's
    // "reading" act (John ruling 2026-08-25). The extraction-FAILURE catch below keeps
    // its __done__ unchanged — a failed scan must still close the stream.
    updateSession(sessionId, {
      infer_status: 'complete',
      claim_records: claimRecords,
      claim_events: [],
      raw_signals: signals,
      inferences: inferenceResult.inferences,
      correctable_fields: inferenceResult.correctable_fields,
      followup_questions: inferenceResult.followup_questions,
      company_name: inferenceResult.company_name,
      source_summary: inferenceResult.source_summary,
      sources_read: inferenceResult.sources_read,
      pages_read_count: pages_read_count ?? 0,
      signals_detected: inferenceResult.signals_detected,
      enterprise_signals,
      competitor_mentions,
      recon_context: recon_context || null,
      company_summary: company_summary || null,
      used_web_research: !!used_web_research,
      research_engines: research_engines || [],
      corpus_hits,
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
