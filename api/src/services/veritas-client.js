// Thin HTTP wrapper for VERITAS endpoints.
// No retry logic here — the adapter handles retries.
// Config from env: VERITAS_URL, VERITAS_API_KEY, VERITAS_TIMEOUT_MS (default 30000).

const VERITAS_URL = process.env.VERITAS_URL || 'https://veritas.ethikslabs.com';
const VERITAS_API_KEY = process.env.VERITAS_API_KEY || '';
const VERITAS_TIMEOUT_MS = parseInt(process.env.VERITAS_TIMEOUT_MS || '30000', 10);

function headers() {
  return {
    'content-type': 'application/json',
    'x-api-key': VERITAS_API_KEY,
  };
}

/**
 * POST /evidence/ingest — submit evidence for a gap.
 * @param {{ predicate: string, projection: string, content: object, tenant_id: string, freshness_ttl?: number }} payload
 * @returns {Promise<{ evidence_id: string }>}
 */
export async function ingestEvidence(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERITAS_TIMEOUT_MS);

  try {
    const res = await fetch(`${VERITAS_URL}/evidence/ingest`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`VERITAS /evidence/ingest returned ${res.status}: ${body}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * POST /claim/generate — generate a claim from ingested evidence.
 * @param {string} evidenceId
 * @returns {Promise<{ claim_id: string, claim_class: string, confidence: number, reasoning: string }>}
 */
export async function generateClaim(evidenceId) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERITAS_TIMEOUT_MS);

  try {
    const res = await fetch(`${VERITAS_URL}/claim/generate`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ evidence_id: evidenceId }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`VERITAS /claim/generate returned ${res.status}: ${body}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}
