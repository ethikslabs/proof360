// Trust evaluation client
// Routing: NIM (Nemotron) → Trust360; all failures return confirmed=false.
// NIM is preferred when NVIDIA_API_KEY is set. Silent fallback on failure.
// All VECTOR calls carry { tenant_id, session_id, correlation_id } per v3 contract.

import { nimEvaluateClaim, isNIMAvailable } from './nim-client.js';

const TRUST360_URL = process.env.TRUST360_URL || 'http://localhost:3000';
const TIMEOUT_MS = 20_000;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1_000; // 1s, 2s, 4s

/**
 * Sleep helper for exponential backoff.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff for 429 (rate-limit) responses.
 * Throws "service capacity reached, retry shortly" after max retries exhausted.
 */
async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });

      // Handle 429 rate-limit — retry with exponential backoff
      if (res.status === 429) {
        clearTimeout(timeout);
        if (attempt < retries) {
          const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
          console.warn(`[trust] 429 rate-limited, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
          await sleep(delay);
          continue;
        }
        throw new Error('service capacity reached, retry shortly');
      }

      // Surface sovereignty blocks — do NOT silently downgrade
      if (res.status === 451 || res.status === 403) {
        clearTimeout(timeout);
        const body = await res.json().catch(() => ({}));
        const reason = body.reason || body.message || `sovereignty policy blocked request (HTTP ${res.status})`;
        throw new Error(`VECTOR sovereignty block: ${reason}`);
      }

      clearTimeout(timeout);
      return res;
    } catch (err) {
      clearTimeout(timeout);
      // Re-throw our own errors (429 exhausted, sovereignty block)
      if (err.message.startsWith('service capacity reached') || err.message.startsWith('VECTOR sovereignty block')) {
        throw err;
      }
      // On last attempt, throw the underlying error
      if (attempt >= retries) throw err;
      // Network/abort errors — retry with backoff
      const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
      console.warn(`[trust] Request failed (${err.message}), retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
      await sleep(delay);
    }
  }
}

export async function evaluateClaim({ question, evidence, metadata, session_id }) {
  // Try NIM first
  if (await isNIMAvailable()) {
    try {
      return await nimEvaluateClaim({ question, evidence, metadata, session_id });
    } catch (err) {
      // Surface sovereignty blocks — do not silently fall back
      if (err.message?.startsWith('VECTOR sovereignty block')) throw err;
      console.warn('[trust] NIM failed, falling back to Trust360:', err.message);
    }
  }

  // Trust360 fallback — with VECTOR contract fields + retry logic
  const body = {
    question,
    evidence,
    metadata,
    tenant_id: 'proof360',
    session_id: session_id || null,
    correlation_id: session_id || null,
  };

  const res = await fetchWithRetry(`${TRUST360_URL}/trust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok && res.status !== 206) {
    throw new Error(`Trust360 returned ${res.status}`);
  }

  return await res.json();
}

// Evaluate multiple claims in parallel, return results keyed by gap ID
export async function evaluateClaims(claims, session_id) {
  const results = {};
  const promises = claims.map(async (claim) => {
    try {
      const result = await evaluateClaim({ ...claim, session_id });
      results[claim.metadata.gapId] = {
        confirmed: result.consensus.mos >= 7,
        mos: result.consensus.mos,
        variance: result.consensus.variance,
        agreement: result.consensus.agreement,
        traceId: result.traceId,
        provider: result.provider ?? 'trust360',
      };
    } catch (err) {
      // Surface capacity/sovereignty errors — don't swallow them into fallback
      if (err.message?.startsWith('service capacity reached') || err.message?.startsWith('VECTOR sovereignty block')) {
        results[claim.metadata.gapId] = {
          confirmed: false,
          error: err.message,
          blocked: true,
        };
        return;
      }
      // All paths failed — surface error, do NOT fallback-confirm-all
      results[claim.metadata.gapId] = {
        confirmed: false,
        error: err.message,
        unavailable: true,
      };
    }
  });

  await Promise.all(promises);
  return results;
}
