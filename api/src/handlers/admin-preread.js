import { v4 as uuidv4 } from 'uuid';
import { createSession, getSession, deleteSession, updateSession, appendLog, _getSessionsMap } from '../services/session-store.js';
import { extractSignals } from '../services/signal-extractor.js';
import { buildInferences } from '../services/inference-builder.js';
import { extractReconContext } from '../services/recon-pipeline.js';

// --- Module-level state ---

/** Batch store: batch_id → { batch_id, created_at, reads: [{ url, session_id }] } */
const batches = new Map();
const BATCH_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Rate limit tracker: admin_key → [timestamp, timestamp, ...] */
const rateLimitMap = new Map();
const RATE_WINDOW_MS = 60_000; // 60 seconds
const RATE_MAX_BATCHES = 2;

// --- Auth helper ---

function authenticateAdmin(request, reply) {
  const key = request.headers['x-admin-key'];
  if (!key || key !== process.env.PROOF360_ADMIN_KEY) {
    reply.status(401).send({ error: 'unauthorized' });
    return null;
  }
  return key;
}

// --- Rate limiting ---

function checkRateLimit(adminKey, reply) {
  const now = Date.now();
  let timestamps = rateLimitMap.get(adminKey);
  if (!timestamps) {
    timestamps = [];
    rateLimitMap.set(adminKey, timestamps);
  }

  // Prune timestamps outside the window
  const cutoff = now - RATE_WINDOW_MS;
  while (timestamps.length > 0 && timestamps[0] <= cutoff) {
    timestamps.shift();
  }

  if (timestamps.length >= RATE_MAX_BATCHES) {
    const oldestInWindow = timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + RATE_WINDOW_MS - now) / 1000);
    reply.status(429).send({ error: 'rate_limit', retry_after_seconds: retryAfter });
    return false;
  }

  timestamps.push(now);
  return true;
}

// --- Memory guard ---

/**
 * Enforces the preread memory guard: if preread-sourced sessions >= 100,
 * drops the oldest preread sessions to bring count to 99.
 * Exported for property testing (task 3.8).
 */
export function enforcePrereadMemoryGuard() {
  const sessions = _getSessionsMap();
  const prereads = [];

  for (const [id, session] of sessions) {
    if (session.source === 'preread') {
      prereads.push({ id, created_at: session.created_at });
    }
  }

  if (prereads.length >= 100) {
    // Sort oldest first
    prereads.sort((a, b) => a.created_at - b.created_at);
    const toRemove = prereads.length - 99;
    for (let i = 0; i < toRemove; i++) {
      deleteSession(prereads[i].id);
    }
  }
}

// --- Concurrency-capped cold read execution ---

async function runWithConcurrency(tasks, maxConcurrent = 4) {
  const results = [];
  const executing = new Set();

  for (const task of tasks) {
    const p = task().then(result => {
      executing.delete(p);
      return result;
    });
    executing.add(p);
    results.push(p);

    if (executing.size >= maxConcurrent) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}

// --- Cold read trigger (mirrors session-start.js extractAndInfer) ---

async function triggerColdRead(url, sessionId) {
  try {
    const log = (line) => appendLog(sessionId, line);
    const { signals, sources_read, enterprise_signals, competitor_mentions, recon_context } =
      await extractSignals({ website_url: url }, log);

    const reconFlat = extractReconContext(recon_context);
    const inferenceResult = buildInferences(signals, sources_read, url, reconFlat);

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
  } catch (err) {
    console.error(JSON.stringify({
      event: 'preread_extraction_failed', session_id: sessionId, error: err.message,
    }));
    appendLog(sessionId, { text: `  ✗  Extraction failed: ${err.message}`, type: 'err' });
    appendLog(sessionId, { type: '__done__' });
    updateSession(sessionId, { infer_status: 'failed' });
  }
}

// --- Batch TTL cleanup ---

function cleanExpiredBatches() {
  const now = Date.now();
  for (const [id, batch] of batches) {
    if (now - batch.created_at > BATCH_TTL_MS) {
      batches.delete(id);
    }
  }
}

// --- POST /api/admin/preread ---

export async function adminPrereadHandler(request, reply) {
  const adminKey = authenticateAdmin(request, reply);
  if (!adminKey) return;

  if (!checkRateLimit(adminKey, reply)) return;

  const { urls } = request.body || {};
  if (!Array.isArray(urls) || urls.length === 0) {
    return reply.status(400).send({ error: 'max_20_urls_per_batch' });
  }
  if (urls.length > 20) {
    return reply.status(400).send({ error: 'max_20_urls_per_batch' });
  }

  // Memory guard — enforce preread session cap
  enforcePrereadMemoryGuard();

  // Clean expired batches
  cleanExpiredBatches();

  const batchId = uuidv4();
  const reads = [];

  // Create sessions for each URL
  for (const url of urls) {
    const session = createSession({ website_url: url, source: 'preread' });
    reads.push({ url, session_id: session.id, status: 'queued' });
  }

  // Store batch
  batches.set(batchId, {
    batch_id: batchId,
    created_at: Date.now(),
    reads: reads.map(r => ({ url: r.url, session_id: r.session_id })),
  });

  // Fire cold reads with concurrency cap (don't await — return immediately)
  const tasks = reads.map(r => () => triggerColdRead(r.url, r.session_id));
  runWithConcurrency(tasks, 4).catch(err => {
    console.error(JSON.stringify({ event: 'preread_batch_error', batch_id: batchId, error: err.message }));
  });

  return reply.status(201).send({
    batch_id: batchId,
    reads: reads.map(r => ({ url: r.url, session_id: r.session_id, status: 'queued' })),
  });
}

// --- GET /api/admin/preread/:batch_id ---

export async function adminPrereadStatusHandler(request, reply) {
  const adminKey = authenticateAdmin(request, reply);
  if (!adminKey) return;

  cleanExpiredBatches();

  const { batch_id } = request.params;
  const batch = batches.get(batch_id);

  if (!batch) {
    return reply.status(404).send({ error: 'batch_not_found' });
  }

  const reads = batch.reads.map(r => {
    const session = getSession(r.session_id);

    let status = 'running';
    let shareableUrl = null;
    let confidence = null;

    if (session) {
      if (session.infer_status === 'complete') {
        status = 'complete';
        shareableUrl = `/audit/cold-read?session=${r.session_id}&url=${encodeURIComponent(r.url)}`;
      } else if (session.infer_status === 'failed') {
        status = 'failed';
      } else {
        status = 'running';
      }
      confidence = session.confidence || null;
    } else {
      // Session expired or deleted
      status = 'failed';
    }

    return {
      url: r.url,
      session_id: r.session_id,
      status,
      shareable_url: shareableUrl,
      confidence,
    };
  });

  return reply.send({ batch_id, reads });
}

// Expose internals for testing
export function _getBatchesMap() {
  return batches;
}

export function _getRateLimitMap() {
  return rateLimitMap;
}
