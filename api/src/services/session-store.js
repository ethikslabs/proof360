import { v4 as uuidv4 } from 'uuid';
import { emitPulse } from './pulse-emitter.js';

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STALE_TIMEOUT_MS = 180 * 1000; // 3 minutes
const sessions = new Map();

function isExpired(session) {
  return Date.now() - session.created_at > TTL_MS;
}

export function createSession({ id: providedId, website_url, deck_file, source = 'user' }) {
  const id = providedId || uuidv4();
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


export function updateSession(id, updates) {
  const session = getSession(id);
  if (!session) return null;
  Object.assign(session, updates);
  return session;
}

export function deleteSession(id) {
  sessions.delete(id);
}

export function writeSignal(sessionId, signal) {
  const session = sessions.get(sessionId);
  if (!session) return;
  if (!session.raw_signals) session.raw_signals = [];
  session.raw_signals.push(signal);
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
