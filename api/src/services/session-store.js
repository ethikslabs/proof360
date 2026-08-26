import { v4 as uuidv4 } from 'uuid';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { emitPulse } from './pulse-emitter.js';

// The Map is a CACHE over a file-per-session store ("simple to return to" —
// the twin survives a restart; the return path is the session link, no login).
//   - create/update write through (coalesced) to SESSION_STORE_DIR/<id>.json
//   - getSession hydrates from disk on a Map miss (restart / cache eviction)
//   - CACHE_TTL_MS only evicts from the Map; RETENTION_MS (last_active_at)
//     is when a session actually dies, Map and file both.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — Map eviction only
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — real expiry
const STALE_TIMEOUT_MS = 180 * 1000; // 3 minutes
const FLUSH_DELAY_MS = 250; // coalesce write bursts (pipeline signals, chat stream)
const sessions = new Map();

// --- persistence ---------------------------------------------------------

// Resolved per call so tests can point SESSION_STORE_DIR at a tmpdir.
function storeDir() {
  return process.env.SESSION_STORE_DIR
    || join(homedir(), '.ethikslabs', 'proof360', 'sessions');
}

function sessionPath(id) {
  return join(storeDir(), `${id}.json`);
}

const dirty = new Set();
let flushTimer = null;
let inFlight = Promise.resolve();

async function writeSessionFile(session) {
  const path = sessionPath(session.id);
  const tmp = `${path}.${process.pid}.tmp`;
  await mkdir(storeDir(), { recursive: true });
  await writeFile(tmp, JSON.stringify(session), 'utf8');
  await rename(tmp, path);
}

function flushDirty() {
  const ids = [...dirty];
  dirty.clear();
  const batch = Promise.allSettled(ids.map((id) => {
    const session = sessions.get(id);
    if (!session) return Promise.resolve();
    return writeSessionFile(session).catch((err) => {
      console.error(JSON.stringify({ event: 'session_persist_failed', session_id: id, error: err.message }));
    });
  }));
  inFlight = inFlight.then(() => batch);
  return batch;
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushDirty();
  }, FLUSH_DELAY_MS);
  flushTimer.unref?.();
}

// Mark a session for write-through. Handlers that mutate the session object
// directly (session-chat pattern) call this once at the end of the request.
export function persistSession(id) {
  if (!sessions.has(id)) return;
  dirty.add(id);
  scheduleFlush();
}

// Force all pending writes to disk and await them (shutdown + tests).
export async function flushSessionsNow() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flushDirty();
  await inFlight;
}

function deleteSessionFile(id) {
  const removal = rm(sessionPath(id), { force: true }).catch(() => {});
  inFlight = inFlight.then(() => removal);
}

function hydrateSession(id) {
  const path = sessionPath(id);
  if (!existsSync(path)) return null;
  let session;
  try {
    session = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null; // corrupt file — fail safe, treat as absent
  }
  if (!session || session.id !== id) return null;
  if (isExpired(session)) {
    deleteSessionFile(id);
    return null;
  }
  // Any pipeline that was mid-flight died with the old process — its worker
  // is gone, so an honest 'failed' beats a forever-'processing'.
  if (session.infer_status === 'processing') session.infer_status = 'failed';
  if (session.analysis_status === 'processing') session.analysis_status = 'failed';
  sessions.set(id, session);
  persistSession(id);
  return session;
}

// --- lifecycle -----------------------------------------------------------

function lastActive(session) {
  return session.last_active_at || session.created_at;
}

function isExpired(session) {
  return Date.now() - lastActive(session) > RETENTION_MS;
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
    last_active_at: Date.now(),
  };
  sessions.set(id, session);
  persistSession(id);
  return session;
}

export function getSession(id) {
  const session = sessions.get(id);
  if (!session) return hydrateSession(id);
  if (isExpired(session)) {
    sessions.delete(id);
    deleteSessionFile(id);
    return null;
  }
  return session;
}


export function updateSession(id, updates) {
  const session = getSession(id);
  if (!session) return null;
  Object.assign(session, updates, { last_active_at: Date.now() });
  persistSession(id);
  return session;
}

export function deleteSession(id) {
  sessions.delete(id);
  deleteSessionFile(id);
}

export function writeSignal(sessionId, signal) {
  const session = sessions.get(sessionId);
  if (!session) return;
  if (!session.raw_signals) session.raw_signals = [];
  session.raw_signals.push(signal);
  persistSession(sessionId);
}

// Boot-time reaper — the restart case checkStaleSessions structurally cannot see.
//
// checkStaleSessions walks the in-memory Map. After a restart the Map is empty,
// so the sessions the restart just orphaned are invisible to it: the watchdog is
// blind to exactly the failures it exists to catch. deploy.yml runs `pm2 delete`
// then `pm2 start`, and extractAndInfer is fire-and-forget inside the process
// that was deleted — the RECORD rehydrates from disk, the WORK does not. The
// session then sits on infer_status:'processing' forever and the browser polls
// for 150s before telling the founder to check a URL that was never wrong.
// (Diagnosed 2026-08-26 from John's three failed reads during a deploy window.)
//
// A process that has just started has nothing in flight, by definition. So every
// persisted session still marked 'processing' at boot is provably orphaned.
// Synchronous on purpose: it must finish before the first request is served, or
// a poll can still catch a session mid-reap.
export function reapOrphanedSessions() {
  const dir = storeDir();
  let reaped = 0;
  let unreadable = 0;

  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return { reaped: 0, unreadable: 0 }; // first boot — nothing persisted yet
  }

  for (const name of entries) {
    if (!name.endsWith('.json')) continue;
    const path = join(dir, name);
    let session;
    try {
      session = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      // Never delete on a guess — an unreadable file is reported, not destroyed.
      unreadable++;
      continue;
    }

    let changed = false;
    if (session.infer_status === 'processing') {
      session.infer_status = 'failed';
      session.infer_failure_reason = 'interrupted by a restart — the scan was still running when the service was replaced';
      changed = true;
    }
    if (session.analysis_status === 'processing') {
      session.analysis_status = 'failed';
      session.analysis_failure_reason = 'interrupted by a restart — the read was still being written when the service was replaced';
      changed = true;
    }
    if (!changed) continue;

    try {
      writeFileSync(path, JSON.stringify(session), 'utf8');
      reaped++;
      console.error(JSON.stringify({
        event: 'session_reaped_on_boot',
        session_id: session.id ?? name.replace(/\.json$/, ''),
        reason: 'orphaned_by_restart',
      }));
    } catch (err) {
      console.error(JSON.stringify({
        event: 'session_reap_failed', session_id: session.id, error: err.message,
      }));
    }
  }

  if (reaped || unreadable) {
    console.error(JSON.stringify({ event: 'session_reap_complete', reaped, unreadable }));
  }
  return { reaped, unreadable };
}

// Pipeline timeout utility — scan all sessions and fail any stuck in "processing"
// for longer than STALE_TIMEOUT_MS. Called on a 30-second interval from server.js.
// Also evicts idle sessions from the Map (file survives) and expires dead ones.
export function checkStaleSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (
      session.infer_status === 'processing' &&
      session.infer_started_at &&
      now - session.infer_started_at > STALE_TIMEOUT_MS
    ) {
      session.infer_status = 'failed';
      persistSession(id);
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
      persistSession(id);
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
      // Past retention — the session is dead everywhere.
      sessions.delete(id);
      deleteSessionFile(id);
    } else if (now - lastActive(session) > CACHE_TTL_MS) {
      // Idle — drop from the cache only. The file remains; getSession
      // rehydrates on return. Flush any pending write for it first.
      if (dirty.has(id)) {
        dirty.delete(id);
        const snapshot = session;
        const write = writeSessionFile(snapshot).catch(() => {});
        inFlight = inFlight.then(() => write);
      }
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
  persistSession(id);
}

export function getLogs(id) {
  return sessions.get(id)?._log || [];
}

// Expose for testing
export function _getSessionsMap() {
  return sessions;
}
