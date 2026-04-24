// Trust evaluation client
// Routing: NIM (Nemotron) → Trust360 → confirmed=true fallback
// NIM is preferred when NVIDIA_API_KEY is set. Silent fallback on failure.

import { nimEvaluateClaim, isNIMAvailable } from './nim-client.js';

const TRUST360_URL = process.env.TRUST360_URL || 'http://localhost:3000';
const TIMEOUT_MS = 20_000;

export async function evaluateClaim({ question, evidence, metadata }) {
  // Try NIM first
  if (await isNIMAvailable()) {
    try {
      return await nimEvaluateClaim({ question, evidence, metadata });
    } catch (err) {
      console.warn('[trust] NIM failed, falling back to Trust360:', err.message);
    }
  }

  // Trust360 fallback
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${TRUST360_URL}/trust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, evidence, metadata }),
      signal: controller.signal,
    });

    if (!res.ok && res.status !== 206) {
      throw new Error(`Trust360 returned ${res.status}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// Evaluate multiple claims in parallel, return results keyed by gap ID
export async function evaluateClaims(claims) {
  const results = {};
  const promises = claims.map(async (claim) => {
    try {
      const result = await evaluateClaim(claim);
      results[claim.metadata.gapId] = {
        confirmed: result.consensus.mos >= 7,
        mos: result.consensus.mos,
        variance: result.consensus.variance,
        agreement: result.consensus.agreement,
        traceId: result.traceId,
        provider: result.provider ?? 'trust360',
      };
    } catch (err) {
      // All paths failed — confirm gap as fallback (spec: brief-api.md)
      results[claim.metadata.gapId] = {
        confirmed: true,
        mos: 8,
        fallback: true,
        error: err.message,
      };
    }
  });

  await Promise.all(promises);
  return results;
}
