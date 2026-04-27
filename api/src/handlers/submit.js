import { getSession, updateSession } from '../services/session-store.js';
import { runGapAnalysis } from '../services/gap-mapper.js';
import { normalizeContext } from '../services/context-normalizer.js';
import { emitPulse } from '../services/pulse-emitter.js';
import { query } from '../db/pool.js';

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

  emitPulse({
    type: 'event',
    severity: 'info',
    tags: ['assessment', 'submitted'],
    payload: { action: 'assessment_submitted', session_id: id },
  });

  return reply.send({ status: 'processing' });
}

async function analyzeAsync(sessionId, session, corrections, followup_answers) {
  try {
    // Merge inferred signals + corrections + follow-up answers into a context object
    const context = normalizeContext(session, corrections, followup_answers);

    const result = await runGapAnalysis(context, { session_id: sessionId });

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

    // Parallel Postgres writes — fire-and-forget (Phase 1: write-only)
    writeSignalsToPostgres(sessionId, signals);
    writeReconOutputsToPostgres(sessionId, session.recon_context);
    writeGapsToPostgres(sessionId, result.gaps);
  } catch (err) {
    console.error(`Gap analysis failed for session ${sessionId}:`, err);
    emitPulse({
      type: 'alert',
      severity: 'warning',
      tags: ['pipeline', 'error'],
      payload: { action: 'gap_analysis_failed', session_id: sessionId, error: err.message },
    });
    updateSession(sessionId, { analysis_status: 'failed' });
  }
}

// ── Parallel Postgres writes (Phase 1: write-only, fire-and-forget) ────────

// Signal fields from the signals object that map to the signals table.
// Scalar fields only — arrays/objects are skipped.
const SIGNAL_FIELDS = [
  'company_name', 'website', 'stage', 'sector', 'primary_use_case',
  'customer_type', 'data_sensitivity', 'geo_market', 'handles_payments',
  'infrastructure', 'compliance_status', 'identity_model', 'insurance_status',
  'use_case',
];

function writeSignalsToPostgres(sessionId, signals) {
  if (!signals) return;

  for (const field of SIGNAL_FIELDS) {
    const value = signals[field];
    if (value == null) continue;

    query(
      `INSERT INTO signals (session_id, field, inferred_value, inferred_source, inferred_at, current_value, status)
       VALUES ($1, $2, $3, 'submit', now(), $3, 'inferred')
       ON CONFLICT (session_id, field) DO UPDATE
         SET inferred_value = EXCLUDED.inferred_value,
             inferred_source = EXCLUDED.inferred_source,
             inferred_at = EXCLUDED.inferred_at,
             current_value = EXCLUDED.current_value`,
      [sessionId, field, String(value)]
    ).catch(err => {
      console.error(JSON.stringify({
        event: 'pg_write_error', table: 'signals', op: 'upsert',
        session_id: sessionId, field, error: err.message,
      }));
    });
  }

  // Also persist deal_readiness and trust_score as signal fields
  if (signals.deal_readiness != null) {
    query(
      `INSERT INTO signals (session_id, field, inferred_value, inferred_source, inferred_at, current_value, status)
       VALUES ($1, 'deal_readiness', $2, 'submit', now(), $2, 'inferred')
       ON CONFLICT (session_id, field) DO UPDATE
         SET inferred_value = EXCLUDED.inferred_value,
             inferred_source = EXCLUDED.inferred_source,
             inferred_at = EXCLUDED.inferred_at,
             current_value = EXCLUDED.current_value`,
      [sessionId, String(signals.deal_readiness)]
    ).catch(err => {
      console.error(JSON.stringify({
        event: 'pg_write_error', table: 'signals', op: 'upsert',
        session_id: sessionId, field: 'deal_readiness', error: err.message,
      }));
    });
  }

  if (signals.trust_score != null) {
    query(
      `INSERT INTO signals (session_id, field, inferred_value, inferred_source, inferred_at, current_value, status)
       VALUES ($1, 'trust_score', $2, 'submit', now(), $2, 'inferred')
       ON CONFLICT (session_id, field) DO UPDATE
         SET inferred_value = EXCLUDED.inferred_value,
             inferred_source = EXCLUDED.inferred_source,
             inferred_at = EXCLUDED.inferred_at,
             current_value = EXCLUDED.current_value`,
      [sessionId, String(signals.trust_score)]
    ).catch(err => {
      console.error(JSON.stringify({
        event: 'pg_write_error', table: 'signals', op: 'upsert',
        session_id: sessionId, field: 'trust_score', error: err.message,
      }));
    });
  }
}

// Valid recon sources matching the CHECK constraint on recon_outputs.source
const RECON_SOURCES = [
  'dns', 'http', 'certs', 'ip', 'github', 'jobs', 'hibp', 'ports', 'ssllabs', 'abuseipdb',
];

function writeReconOutputsToPostgres(sessionId, reconContext) {
  if (!reconContext) return;

  for (const source of RECON_SOURCES) {
    const payload = reconContext[source];
    if (payload == null) continue;

    query(
      `INSERT INTO recon_outputs (session_id, source, payload, fetched_at, ttl_seconds)
       VALUES ($1, $2, $3, now(), 3600)
       ON CONFLICT (session_id, source) DO UPDATE
         SET payload = EXCLUDED.payload,
             fetched_at = EXCLUDED.fetched_at`,
      [sessionId, source, JSON.stringify(payload)]
    ).catch(err => {
      console.error(JSON.stringify({
        event: 'pg_write_error', table: 'recon_outputs', op: 'upsert',
        session_id: sessionId, source, error: err.message,
      }));
    });
  }
}


function writeGapsToPostgres(sessionId, gaps) {
  if (!gaps || !gaps.length) return;

  for (const gap of gaps) {
    query(
      `INSERT INTO gaps (session_id, gap_def_id, triggered, severity, framework_impact, evidence)
       VALUES ($1, $2, true, $3, $4, $5)
       ON CONFLICT (session_id, gap_def_id) DO UPDATE
         SET triggered = true,
             severity = EXCLUDED.severity,
             framework_impact = EXCLUDED.framework_impact,
             evidence = EXCLUDED.evidence`,
      [
        sessionId,
        gap.gap_id,
        gap.severity || null,
        gap.framework_impact ? JSON.stringify(gap.framework_impact) : null,
        gap.evidence ? JSON.stringify(gap.evidence) : null,
      ]
    ).catch(err => {
      console.error(JSON.stringify({
        event: 'pg_write_error', table: 'gaps', op: 'upsert',
        session_id: sessionId, gap_def_id: gap.gap_id, error: err.message,
      }));
    });
  }
}
