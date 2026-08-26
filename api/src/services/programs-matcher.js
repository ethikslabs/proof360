// The programs a company actually qualifies for.
//
// 18 AWS programs and 12 Microsoft programs have been sitting in api/src/config
// with real trigger conditions and a tested evaluator since the recompute pipeline
// was written. The AWS and Microsoft panels in the UI used none of it — they
// rendered hardcoded constants asserting things about the founder's own accounts:
// "Startup Credits — $10k unclaimed — already granted · expires Q4 · log in to
// redeem", "Founders Hub is unclaimed — that's $150k in Azure credits sitting
// there." Not an invented number — an invented ENTITLEMENT, about an account
// nobody had looked at (John, 2026-08-26: "add them in if we have the data").
//
// This is the join: session → signals → the same trigger evaluation recompute
// already runs → matches that carry the trigger that earned them.
import { AWS_PROGRAMS, evaluateTrigger } from '../config/aws-programs.js';
import { MICROSOFT_PROGRAMS } from '../config/microsoft-programs.js';
import { claimsProjection } from './claims-projection.js';

// Program triggers speak a flat vocabulary (KNOWN_SIGNAL_FIELDS); the Record
// speaks dotted claim paths. This is the only place the two meet.
const CLAIM_TO_SIGNAL = {
  'company.stage': 'stage',
  'product.type': 'product_type',
  'infrastructure.cloud_provider': 'infrastructure',
  'market.customer_type': 'sector',
};

const RAW_SIGNAL_TO_FIELD = {
  stage: 'stage',
  product_type: 'product_type',
  infrastructure: 'infrastructure',
  customer_type: 'sector',
};

/**
 * The company as the triggers understand it.
 *
 * Read signals form the base; a claim the founder CONFIRMED overwrites it. That
 * ordering is the confirm ceremony's whole point — first-party testimony outranks
 * a probe's guess — and it has to reach the matcher or confirming a claim changes
 * nothing about what gets offered. A rejected claim contributes nothing at all.
 */
export function sessionSignals(session) {
  if (!session || typeof session !== 'object') return {};
  const signals = {};

  for (const sig of session.raw_signals ?? []) {
    const field = RAW_SIGNAL_TO_FIELD[sig?.type];
    if (field && sig.value !== undefined && sig.value !== null && sig.value !== '') {
      signals[field] = sig.value;
    }
  }

  let claims = [];
  try {
    claims = claimsProjection({
      record_claims: session.claim_records || [],
      claim_events: session.claim_events || [],
    });
  } catch {
    claims = [];
  }

  for (const claim of claims) {
    if (claim.status !== 'confirmed' && claim.status !== 'corrected') continue;
    const field = CLAIM_TO_SIGNAL[claim.field];
    if (field && claim.value !== undefined && claim.value !== null && claim.value !== '') {
      signals[field] = claim.value;
    }
  }

  return signals;
}

// Which of a program's triggers this company actually satisfies — carried onto
// the match so the offer is never free-floating. Same discipline as the pathway
// reasons: an offer without the evidence that earned it is an advertisement.
function matchedOn(program, signals) {
  return (program.triggers ?? [])
    .map((t) => (t?.field && signals[t.field] !== undefined
      ? { field: t.field, value: signals[t.field] }
      : null))
    .filter(Boolean);
}

function match(programs, signals) {
  // Absence over invention: know nothing about the company, offer nothing. A
  // trigger that reads an unknown field must not pass — otherwise an empty
  // session matches everything and the catalogue gets dumped on a stranger as if
  // it were personalised.
  if (Object.keys(signals).length === 0) return [];

  return (programs ?? [])
    .filter((p) => Array.isArray(p.triggers) && p.triggers.length > 0
      && p.triggers.every((t) => t?.field && signals[t.field] !== undefined
        && evaluateTrigger(t, signals)))
    .map((p) => ({
      id: p.program_id,
      name: p.name,
      benefit: p.benefit,
      category: p.category ?? null,
      url: p.application_url,
      confidence: p.confidence_when_matched ?? 'medium',
      matched_on: matchedOn(p, signals),
    }));
}

export function matchedPrograms(session) {
  const signals = sessionSignals(session);
  return {
    aws: match(AWS_PROGRAMS, signals),
    microsoft: match(MICROSOFT_PROGRAMS, signals),
    signals,
  };
}

export default matchedPrograms;
