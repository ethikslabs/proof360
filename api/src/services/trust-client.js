// Trust360 engine client — POST /trust
// Each gap gets one call. High MOS (>= 7) = gap confirmed.

const TRUST360_URL = process.env.TRUST360_URL || 'http://localhost:3000';
const TIMEOUT_MS = 20_000;

export async function evaluateClaim({ question, evidence, metadata }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${TRUST360_URL}/trust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, evidence, metadata }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const status = res.status;
      // 206 = partial consensus — still usable
      if (status !== 206) {
        throw new Error(`Trust360 returned ${status}`);
      }
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
      };
    } catch (err) {
      // If Trust360 fails for a claim, mark as unconfirmed
      results[claim.metadata.gapId] = {
        confirmed: false,
        mos: 0,
        error: err.message,
      };
    }
  });

  await Promise.all(promises);
  return results;
}
