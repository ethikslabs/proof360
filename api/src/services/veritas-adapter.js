// VERITAS adapter — translation layer: proof360 → VERITAS evidence/claim API.
// Two-step flow per gap: evidence ingest → claim generate.
// Retries with exponential backoff (1s, 2s, 4s), 30s per-gap timeout.
// This adapter is the only proof360 component that writes to VERITAS.
// VERITAS owns the claim chain — adapter does not embed claim logic.

import { ingestEvidence, generateClaim } from './veritas-client.js';
import { GAP_DEFINITIONS } from '../config/gaps.js';

const MAX_RETRIES = 3; // 3 retries after initial attempt = 4 total attempts
const BACKOFF_BASE_MS = 1_000; // delays: 1s, 2s, 4s
const PER_GAP_TIMEOUT_MS = parseInt(process.env.VERITAS_TIMEOUT_MS || '30000', 10);

// ── Error class ──────────────────────────────────────────────────────────

export class AttestationError extends Error {
  constructor(message, { gapId, cause } = {}) {
    super(message);
    this.name = 'AttestationError';
    this.gapId = gapId;
    this.cause = cause;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build the VERITAS evidence payload from a gap row and session context.
 */
function buildEvidencePayload(gap, sessionContext) {
  const { signals, recon_evidence, tenant_id } = sessionContext;

  // Resolve the gap definition to get the claimTemplate
  const gapDef = GAP_DEFINITIONS.find((d) => d.id === gap.gap_def_id);

  // Build a context object from signals for the claimTemplate
  const signalCtx = {};
  if (Array.isArray(signals)) {
    for (const s of signals) {
      signalCtx[s.field] = s.current_value ?? s.value;
    }
  }

  const projection = gapDef?.claimTemplate
    ? JSON.stringify(gapDef.claimTemplate(signalCtx))
    : '';

  return {
    predicate: gap.gap_def_id,
    projection,
    content: {
      signals: Array.isArray(signals)
        ? signals.map((s) => ({
            field: s.field,
            value: s.current_value ?? s.value,
            source: s.current_actor ?? s.actor ?? 'system',
            confidence: s.confidence ?? 'medium',
          }))
        : [],
      recon_evidence: recon_evidence || {},
      gap_evidence: gap.evidence || {},
    },
    tenant_id: tenant_id,
    freshness_ttl: 86400,
  };
}

/**
 * Execute a single attestation attempt (ingest + claim generate).
 * No retries — caller handles retry logic.
 */
async function attestOnce(gap, sessionContext) {
  const payload = buildEvidencePayload(gap, sessionContext);

  // Step 1: ingest evidence
  const { evidence_id } = await ingestEvidence(payload);

  // Step 2: generate claim
  const claim = await generateClaim(evidence_id);

  return {
    claim_id: claim.claim_id,
    claim_class: claim.claim_class,
    confidence: claim.confidence,
    reasoning: claim.reasoning,
    attested_at: new Date().toISOString(),
  };
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Attest a single gap against VERITAS.
 * Retries with exponential backoff (1s, 2s, 4s) up to 3 retries.
 * Per-gap timeout: 30s (enforced at the HTTP layer in veritas-client).
 *
 * @param {Object} gap - row from gaps table (must have gap_def_id, evidence)
 * @param {Object} sessionContext - { session, signals, recon_evidence, tenant_id }
 * @returns {Promise<{ claim_id, claim_class, confidence, reasoning, attested_at }>}
 * @throws {AttestationError} when VERITAS unavailable or claim generation fails after retries
 */
export async function attest(gap, sessionContext) {
  let lastError;
  const totalAttempts = MAX_RETRIES + 1; // initial + 3 retries = 4 total

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    try {
      return await attestOnce(gap, sessionContext);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        const delay = BACKOFF_BASE_MS * Math.pow(2, attempt); // 1s, 2s, 4s
        console.warn(
          `[veritas] Attestation failed for gap ${gap.gap_def_id}, retrying in ${delay}ms (retry ${attempt + 1}/${MAX_RETRIES}):`,
          err.message
        );
        await sleep(delay);
      }
    }
  }

  throw new AttestationError(
    `VERITAS attestation failed for gap ${gap.gap_def_id} after ${MAX_RETRIES} retries: ${lastError?.message}`,
    { gapId: gap.gap_def_id, cause: lastError }
  );
}

/**
 * Attest a batch of gaps in parallel via Promise.allSettled.
 * Partial failures preserved — successful attestations retain claim_id.
 *
 * @param {Array<Object>} gaps - rows from gaps table
 * @param {Object} sessionContext - { session, signals, recon_evidence, tenant_id }
 * @returns {Promise<Array<{ gap_id, status: 'attested'|'failed', result?, error? }>>}
 */
export async function attestBatch(gaps, sessionContext) {
  const results = await Promise.allSettled(
    gaps.map((gap) => attest(gap, sessionContext))
  );

  return results.map((settled, i) => {
    const gap = gaps[i];
    if (settled.status === 'fulfilled') {
      return {
        gap_id: gap.gap_def_id ?? gap.id,
        status: 'attested',
        result: settled.value,
      };
    }
    return {
      gap_id: gap.gap_def_id ?? gap.id,
      status: 'failed',
      error: settled.reason?.message || String(settled.reason),
    };
  });
}

/**
 * Identify gaps requiring re-attestation after signal changes.
 * Returns only gaps whose underlying signals changed since last attestation.
 *
 * Each gap definition has a claimTemplate(context) that references specific signal
 * fields — we extract those field references to determine which signals a gap depends on.
 *
 * @param {Array<Object>} allGaps - all gap rows for the session
 * @param {Array<string>} changedSignalIds - field names of signals that changed
 * @returns {Array<Object>} gaps that depend on at least one changed signal
 */
export function gapsRequiringReattestation(allGaps, changedSignalIds) {
  if (!changedSignalIds || changedSignalIds.length === 0) return [];

  const changedSet = new Set(changedSignalIds);

  return allGaps.filter((gap) => {
    const gapDef = GAP_DEFINITIONS.find((d) => d.id === (gap.gap_def_id ?? gap.id));
    if (!gapDef) return false;

    // Extract signal fields from both triggerCondition and claimTemplate.
    // A gap depends on any field either function accesses.
    const triggerFields = gapDef.triggerCondition
      ? extractAccessedFields(gapDef.triggerCondition)
      : [];
    const claimFields = gapDef.claimTemplate
      ? extractAccessedFields(gapDef.claimTemplate)
      : [];

    const allFields = new Set([...triggerFields, ...claimFields]);
    for (const field of allFields) {
      if (changedSet.has(field)) return true;
    }
    return false;
  });
}

/**
 * Extract the field names that a function accesses on its first argument.
 * Uses a Proxy to record property reads on the context object.
 *
 * @param {Function} fn - function that takes a context object
 * @returns {string[]} field names accessed
 */
function extractAccessedFields(fn) {
  const accessed = new Set();
  const proxy = new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop === 'string') accessed.add(prop);
        // Return a safe default so string interpolation and comparisons don't throw
        return undefined;
      },
    }
  );

  try {
    fn(proxy);
  } catch {
    // Function may fail on proxy — that's fine, we captured what we could
  }

  return [...accessed];
}
