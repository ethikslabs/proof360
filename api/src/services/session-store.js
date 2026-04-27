// Write-through cache. Postgres is canonical for completed sessions.
// In-memory serves active pipeline state only (infer_status, inferences,
// correctable_fields, followup_questions, etc. that aren't persisted to Postgres yet).
// Read handlers query Postgres directly for completed sessions.
// getSession() remains for active pipeline reads during extraction/analysis.
import { v4 as uuidv4 } from 'uuid';
import { emitPulse } from './pulse-emitter.js';
import { query } from '../db/pool.js';

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STALE_TIMEOUT_MS = 180 * 1000; // 3 minutes
const sessions = new Map();

function isExpired(session) {
  return Date.now() - session.created_at > TTL_MS;
}

export function createSession({ website_url, deck_file, source = 'user' }) {
  const id = uuidv4();
  const session = {
    id,
    website_url: website_url || null,
    deck_file: deck_file || null,

    // Inference phase
    infer_status: 'processing',
    infer_started_at: Date.now(),
    raw_signals: [],
    inferences: null,
    correctable_fields: null,
    followup_questions: null,
    company_name: null,
    source_summary: null,

    // Submission phase
    corrections: null,
    followup_answers: null,

    // Analysis phase
    analysis_status: null,
    analysis_started_at: null,
    merged_context: null,
    gaps: null,
    trust_score: null,
    deal_readiness: null,

    // Vendor data
    vendor_intelligence: null,

    // Report
    layer2_locked: true,

    // Signals object (non-negotiable — brief-strategy.md)
    signals_object: null,

    // Email gate
    email: null,

    // Source tracking (overnight-v1)
    source,

    // Confidence (overnight-v1 — populated after extraction)
    confidence: null,

    // John relay — @john messages injected from Telegram
    john_messages: [],

    // Metadata
    created_at: Date.now(),
  };
  sessions.set(id, session);

  // Parallel Postgres write — fire-and-forget (Phase 1: write-only)
  query(
    `INSERT INTO sessions (id, tenant_id, url, created_at, updated_at, status)
     VALUES ($1, $2, $3, to_timestamp($4::double precision / 1000), now(), 'active')`,
    [id, null, website_url || null, session.created_at]
  ).catch(err => {
    console.error(JSON.stringify({
      event: 'pg_write_error', table: 'sessions', op: 'insert',
      session_id: id, error: err.message,
    }));
  });

  return session;
}

export function getSession(id) {
  const session = sessions.get(id);
  if (!session) return null;
  if (isExpired(session)) {
    sessions.delete(id);
    return null;
  }
  return session;
}

/**
 * Phase 8: Read a session from Postgres.
 * Returns a minimal session object with Postgres-persisted fields.
 * Used as fallback when in-memory session has expired or been evicted.
 */
export async function getSessionFromDb(id) {
  try {
    const sessRes = await query('SELECT * FROM sessions WHERE id = $1', [id]);
    if (sessRes.rows.length === 0) return null;

    const row = sessRes.rows[0];
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      website_url: row.url,
      status: row.status,
      created_at: row.created_at instanceof Date ? row.created_at.getTime() : row.created_at,
      _fromPg: true,
    };
  } catch (err) {
    console.error(JSON.stringify({
      event: 'pg_read_error', table: 'sessions', op: 'select',
      session_id: id, error: err.message,
    }));
    return null;
  }
}

/**
 * @deprecated Use direct Postgres queries for completed sessions.
 * In-memory is only for active pipeline state. This function implies
 * in-memory is primary, which is no longer true for completed sessions.
 *
 * Phase 8: Try in-memory first, fall back to Postgres.
 * In-memory carries full pipeline state (infer_status, inferences, etc.)
 * that isn't persisted to Postgres yet. Postgres is the fallback for
 * sessions that have expired from the in-memory TTL.
 */
export async function getSessionWithDbFallback(id) {
  const session = getSession(id);
  if (session) return session;
  return getSessionFromDb(id);
}

export function updateSession(id, updates) {
  const session = getSession(id);
  if (!session) return null;
  Object.assign(session, updates);

  // Parallel Postgres write — fire-and-forget (Phase 1: write-only)
  query(
    `UPDATE sessions SET updated_at = now() WHERE id = $1`,
    [id]
  ).catch(err => {
    console.error(JSON.stringify({
      event: 'pg_write_error', table: 'sessions', op: 'update',
      session_id: id, error: err.message,
    }));
  });

  return session;
}

export function deleteSession(id) {
  sessions.delete(id);
}

// Write a signal to both in-memory session and Postgres signals table.
// In-memory: appends to session.raw_signals (existing behaviour).
// Postgres: upserts into signals table (fire-and-forget, Phase 1 write-only).
export function writeSignal(sessionId, signal) {
  const session = sessions.get(sessionId);
  if (!session) return;

  // In-memory write (preserve existing behaviour)
  if (!session.raw_signals) session.raw_signals = [];
  session.raw_signals.push(signal);

  // Parallel Postgres write — fire-and-forget
  query(
    `INSERT INTO signals (session_id, field, inferred_value, inferred_source, inferred_at, current_value, status)
     VALUES ($1, $2, $3, $4, now(), $3, 'inferred')
     ON CONFLICT (session_id, field) DO UPDATE
       SET inferred_value = EXCLUDED.inferred_value,
           inferred_source = EXCLUDED.inferred_source,
           inferred_at = EXCLUDED.inferred_at,
           current_value = EXCLUDED.current_value`,
    [sessionId, signal.type || signal.field, signal.value, signal.source || 'extraction']
  ).catch(err => {
    console.error(JSON.stringify({
      event: 'pg_write_error', table: 'signals', op: 'upsert',
      session_id: sessionId, field: signal.type || signal.field,
      error: err.message,
    }));
  });
}

// Pipeline timeout utility — scan all sessions and fail any stuck in "processing"
// for longer than STALE_TIMEOUT_MS. Called on a 30-second interval from server.js.
export function checkStaleSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (
      session.infer_status === 'processing' &&
      session.infer_started_at &&
      now - session.infer_started_at > STALE_TIMEOUT_MS
    ) {
      session.infer_status = 'failed';
      const elapsed_ms = now - session.infer_started_at;
      console.error(JSON.stringify({
        event: 'pipeline_timeout', session_id: id,
        pipeline: 'signal_extraction', reason: 'timeout',
        elapsed_ms,
      }));
      emitPulse({
        type: 'alert',
        severity: 'warning',
        tags: ['pipeline', 'timeout'],
        payload: { action: 'pipeline_timeout', session_id: id, pipeline: 'signal_extraction', elapsed_ms },
      });
    }

    if (
      session.analysis_status === 'processing' &&
      session.analysis_started_at &&
      now - session.analysis_started_at > STALE_TIMEOUT_MS
    ) {
      session.analysis_status = 'failed';
      const elapsed_ms = now - session.analysis_started_at;
      console.error(JSON.stringify({
        event: 'pipeline_timeout', session_id: id,
        pipeline: 'gap_analysis', reason: 'timeout',
        elapsed_ms,
      }));
      emitPulse({
        type: 'alert',
        severity: 'warning',
        tags: ['pipeline', 'timeout'],
        payload: { action: 'pipeline_timeout', session_id: id, pipeline: 'gap_analysis', elapsed_ms },
      });
    }

    if (isExpired(session)) {
      sessions.delete(id);
    }
  }
}

// Real-time log for SSE streaming — appended by signal-extractor during pipeline
export function appendLog(id, line) {
  const session = sessions.get(id);
  if (!session) return;
  if (!session._log) session._log = [];
  session._log.push(line);
}

export function getLogs(id) {
  return sessions.get(id)?._log || [];
}

// Expose for testing
export function _getSessionsMap() {
  return sessions;
}
