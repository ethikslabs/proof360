import { randomUUID } from 'node:crypto';
import { sameProvider } from './inference-builder.js';

// The Record (ETHL-WRK-SPEC-011 D0/D1) — the customer's evidence record, claim by claim.
// NOT a new store: claims ride the founder-memory append-only transaction log as two
// record kinds, exactly the pattern the Move (cer-projection.js) already uses —
//   `record_claim` : the claim base record (immutable; born `inferred` with provenance)
//   `claim_event`  : the append-only truth ladder (confirmed | corrected | rejected)
// Live status is DERIVED by folding events at read time — never by mutating the claim.
// Pre-attach, the same records buffer on the in-memory session (session.claim_records)
// and flow into the log verbatim at session-attach, like cold-read facts already do.

export const CLAIM_STATUSES = ['inferred', 'confirmed', 'corrected', 'rejected', 'unknown'];

// Positive lists — default-deny. A provenance method or event type not named here refuses.
const PROVENANCE_METHODS = [
  'recon-ip', 'recon-dns', 'recon-http', 'recon-certs', 'recon-ports', 'recon-ssllabs',
  'recon-hibp', 'recon-abuseipdb', 'recon-github', 'recon-company',
  'claude-inference', 'user-confirm', 'user-edit', 'register-deposit',
  // The firehose (2026-08-23): a fact caught from the founder speaking their idea —
  // no site, no deck, just words. Inferred-until-confirmed like any other claim.
  'founder-utterance',
];
// 'unknown' = we asked and the founder could not say. Deliberately NOT the same as
// 'inferred' (never asked) and NOT the same as 'rejected' (asked, and it is wrong).
// John, 2026-09-02: the three answers are yes / correct it / I don't know. A founder
// who cannot say whether they are on AWS or behind Cloudflare has told us something
// true about the company — it is a finding, not a blank — and we must never ask again
// as though we never asked. It mints no evidence: not-knowing is not testimony.
const CLAIM_EVENT_TYPES = ['confirmed', 'corrected', 'rejected', 'unknown'];

function iso() {
  return new Date().toISOString();
}

export function buildClaimRecord({ field, value, provenance = {}, actor = 'system' }) {
  if (!field) throw new Error('claim_field_required');
  if (value === undefined || value === null || value === '') throw new Error('claim_value_required');
  if (!provenance.method) throw new Error('claim_provenance_method_required');
  if (!PROVENANCE_METHODS.includes(provenance.method)) {
    throw new Error(`unknown_provenance_method:${provenance.method}`);
  }
  return {
    primitive: 'record_claim',
    claim_id: `clm_${randomUUID()}`,
    source: actor,
    field,
    value,
    status: 'inferred',
    provenance: {
      method: provenance.method,
      detail: provenance.detail ?? null,
      at: provenance.at || iso(),
    },
    confirmed: null,
    // Whether a second witness disagrees with this claim (I3, review
    // 2026-08-25) — always present as a boolean, never left undefined, so
    // every consumer can assert `conflicted` directly instead of guessing
    // whether absence means false or means "not evaluated yet".
    conflicted: false,
    conflict: null,
  };
}

export function buildClaimEvent(claimId, { type, value, actor = 'founder', via = 'chat' }) {
  if (!CLAIM_EVENT_TYPES.includes(type)) throw new Error(`unknown_claim_event_type:${type}`);
  if (type === 'corrected' && (value === undefined || value === null || value === '')) {
    throw new Error('corrected_value_required');
  }
  return {
    primitive: 'claim_event',
    id: randomUUID(),
    source: actor,
    claim_id: claimId,
    type,
    ...(type === 'corrected' ? { value } : {}),
    actor,
    via,
    ts: iso(),
  };
}

// The append-only log's ORDER is authoritative — never re-sort by wall-clock ts
// (same law the CER fold proved: CER-CONSENT-GATES-001). Filter, preserve order.
function foldOne(claim, events) {
  const evs = events.filter((e) => e.claim_id === claim.claim_id);
  const last = evs.at(-1);

  const status = last?.type || claim.status || 'inferred';
  const lastCorrection = [...evs].reverse().find((e) => e.type === 'corrected');
  const value = lastCorrection ? lastCorrection.value : claim.value;

  // A user "yes" or edit is first-party testimony — both mint confirmed-grade evidence.
  const testimony = [...evs].reverse().find((e) => e.type === 'confirmed' || e.type === 'corrected');
  const confirmed = testimony && (status === 'confirmed' || status === 'corrected')
    ? { by: testimony.actor, at: testimony.ts, via: testimony.via }
    : null;

  return {
    claim_id: claim.claim_id,
    field: claim.field,
    label: fieldLabel(claim.field),
    value,
    inferred_value: claim.value,
    status,
    provenance: claim.provenance,
    confirmed,
    // A second witness disagreeing with this claim (I3, review 2026-08-25) —
    // never dropped, carried through the fold so the confirm ceremony can
    // ask the both-witnesses question instead of a single-value confirm.
    conflicted: !!claim.conflicted,
    conflict: claim.conflict ?? null,
    events: evs,
  };
}

// Pure function over a reconstructed snapshot (or a session buffer shaped like one)
// → the live Record: every claim with its folded truth-ladder status.
export function claimsProjection(snapshot) {
  const claims = snapshot?.record_claims || [];
  const events = snapshot?.claim_events || [];
  return claims.map((c) => foldOne(c, events));
}

// ---------------------------------------------------------------------------
// Cold read → inferred claims. Maps what the probes and the extraction layer
// already produce (recon-pipeline output + signal-extractor signals) onto Record
// fields with NAMED provenance. Unmapped signal types are skipped, never guessed.
// ---------------------------------------------------------------------------

// recon key → { field, method, detail(recon) }
const RECON_CLAIM_MAP = {
  cloud_provider: {
    field: 'infrastructure.cloud_provider',
    method: 'recon-ip',
    detail: (r) => r.asn_description ? `ASN ${r.asn_description}` : 'IP → hosting provider lookup',
  },
  cdn_provider: {
    field: 'infrastructure.cdn_provider',
    method: 'recon-http',
    detail: () => 'response headers / edge fingerprint',
  },
  waf_detected: {
    field: 'infrastructure.waf',
    method: 'recon-http',
    detail: () => 'WAF fingerprint on live responses',
  },
  mx_provider: {
    field: 'infrastructure.email_provider',
    method: 'recon-dns',
    detail: () => 'MX records',
  },
  dmarc_policy: {
    field: 'security.dmarc_policy',
    method: 'recon-dns',
    detail: () => 'DMARC TXT record',
  },
};

// signal type → Record field (claude-inference provenance)
const SIGNAL_CLAIM_MAP = {
  customer_type: 'market.customer_type',
  data_sensitivity: 'data.sensitivity',
  stage: 'company.stage',
  product_type: 'product.type',
  compliance_status: 'compliance.soc2_status',
  identity_model: 'identity.model',
  infrastructure: 'infrastructure.cloud_provider',
  insurance_status: 'governance.cyber_insurance',
};

// Two witnesses claiming the same field disagree — the field precedent is
// provider identity (infrastructure.cloud_provider), so reuse the same
// fuzzy provider match inference-builder.js uses to avoid manufacturing a
// conflict over spelling/verbosity alone (e.g. probe "Oracle Corporation" vs
// text claim "Oracle" is agreement, not a conflict). Any other field that
// might someday collide falls back to plain case-insensitive inequality.
function valuesConflict(field, existingValue, newValue) {
  if (field === 'infrastructure.cloud_provider') return !sameProvider(existingValue, newValue);
  return String(existingValue).trim().toLowerCase() !== String(newValue).trim().toLowerCase();
}

export function buildInferredClaims({ recon = {}, signals = [] } = {}) {
  const claims = [];
  const claimedFields = new Map(); // field -> value already claimed (by recon)

  // Recon first — an IP lookup is a fact-grade read; it outranks a Claude guess
  // for the same field (inference-builder already applies this precedence).
  for (const [key, cfg] of Object.entries(RECON_CLAIM_MAP)) {
    const value = recon[key];
    if (!value) continue;
    claims.push(buildClaimRecord({
      field: cfg.field,
      value,
      provenance: { method: cfg.method, detail: cfg.detail(recon) },
    }));
    claimedFields.set(cfg.field, value);
  }

  for (const signal of signals) {
    const field = SIGNAL_CLAIM_MAP[signal.type];
    if (!field) continue;
    if (signal.value === undefined || signal.value === null || signal.value === '') continue;

    if (claimedFields.has(field)) {
      // Recon already claimed this field. Reconcile, don't drop: when the
      // two witnesses disagree, attach the conflict to the already-minted
      // recon claim so the confirm ceremony can ask "our probe sees X; your
      // materials say Y — which is right?" instead of silently keeping only
      // the probe's value with the text claim vanishing unseen (the exact
      // bug closed here — I3, review 2026-08-25).
      const existingValue = claimedFields.get(field);
      if (valuesConflict(field, existingValue, signal.value)) {
        const reconClaim = claims.find((c) => c.field === field);
        if (reconClaim) {
          reconClaim.conflicted = true;
          reconClaim.conflict = { probe_says: existingValue, source_says: signal.value };
        }
      }
      continue; // recon still wins the field itself — the witness is kept via .conflict, never a second claim
    }

    claims.push(buildClaimRecord({
      field,
      value: signal.value,
      provenance: {
        method: 'claude-inference',
        // signal.confidence is a WORD from the extractor ('confident', 'probable'),
        // not a number — so the old template rendered "website extraction
        // (confident confidence)" on John's screen. Say it once, in plain words.
        detail: signal.confidence
          ? `website extraction · ${signal.confidence}`
          : 'website extraction',
      },
    }));
    claimedFields.set(field, signal.value);
  }

  return claims;
}

// ---------------------------------------------------------------------------
// The confirm ceremony picker (D3): at most ONE confirm prompt per exchange,
// never a claim the user already ruled on. Priority is commercial: the fields
// that unlock register triggers come first.
// ---------------------------------------------------------------------------
// Ask order — optimised for ANSWER RATE, which is not the same problem as display
// order. Cloud provider opens because it is a gimme: concrete, quick, and it earns the
// first yes, which is what starts the ratchet. It is also the flow John described from
// memory (2026-09-02): "we think you are on aws/azure/gcp/behind cloudflare", then "we
// think b2b blah". Position fields follow; posture trails, because those are
// instruments rather than the product. A first reorder that led with position broke the
// acceptance walk and was the wrong read of the direction — position-not-posture
// governs what the read SAYS, not which question is easiest to answer first.
const CONFIRM_PRIORITY = [
  'infrastructure.cloud_provider',
  'product.type',
  'market.customer_type',
  'company.stage',
  'compliance.soc2_status',
  'data.sensitivity',
  'identity.model',
  'governance.cyber_insurance',
];

// Human label per Record field — user-facing copy (reasons, prompts) reads
// "product type", never a raw path tail like "type". Fallback: last path
// segment with underscores spaced.
const FIELD_LABELS = {
  'infrastructure.cloud_provider': 'cloud provider',
  'infrastructure.cdn_provider': 'CDN provider',
  'infrastructure.email_provider': 'email provider',
  'infrastructure.waf': 'WAF',
  'security.dmarc_policy': 'DMARC policy',
  'product.type': 'product type',
  'market.customer_type': 'customer type',
  'company.stage': 'stage',
  'company.sector': 'sector',
  'company.geo_market': 'market',
  'company.has_raised_institutional': 'institutional raise',
  'compliance.soc2_status': 'SOC 2 status',
  'data.sensitivity': 'data sensitivity',
  'identity.model': 'identity model',
  'governance.cyber_insurance': 'cyber insurance',
};

export function fieldLabel(field) {
  return FIELD_LABELS[field] || String(field).split('.').pop().replace(/_/g, ' ');
}

// How many times one claim may be put to the founder before we let it go. A
// question asked twice and not answered IS an answer — they do not want to
// engage with it. Set to ONE from 2026-08-26: two asks still surfaced the tic
// twice in a three-turn walk, and the companion panel now lists every claim with
// its own "That's right / Not quite", so chat no longer needs to keep pressing.
// Asking again is the "Looks like you're on Oracle —
// right?" tic that closed every single persona reply for weeks (John, 2026-08-26)
// and it was never a prompt fault: the claim stayed 'inferred', so the ceremony
// re-picked it forever. Nothing recorded that it had already been asked.
const MAX_ASKS_PER_CLAIM = 1;

/**
 * @param {Array} claims projected claims
 * @param {Record<string, number>} [askedCounts] claim_id -> times already asked
 * @returns {object|null} the claim to put to the founder, or null to ask nothing
 */
export function nextConfirmable(claims, askedCounts) {
  const asked = (askedCounts && typeof askedCounts === 'object') ? askedCounts : {};
  const timesAsked = (c) => {
    const n = asked[c.claim_id];
    return Number.isFinite(n) ? n : 0;
  };

  const open = (claims ?? []).filter(
    (c) => c.status === 'inferred' && timesAsked(c) < MAX_ASKS_PER_CLAIM,
  );
  // Nothing left worth asking — say nothing. The founder can still settle any
  // claim directly in the companion panel, which lists them all with their grade.
  if (!open.length) return null;

  for (const field of CONFIRM_PRIORITY) {
    const hit = open.find((c) => c.field === field);
    if (hit) return hit;
  }
  return open[0];
}

/**
 * The whole interview, in ask order — nextConfirmable's ordering applied to every
 * open claim rather than just the head of the queue.
 *
 * Only 'inferred' claims are open. Confirmed, corrected, rejected AND unknown are all
 * answered: once a founder has said "I don't know", asking again is the exact failure
 * ask-fatigue exists to prevent.
 *
 * Deliberately returns a plain ordered array with no count and no total. The UI must
 * never render "3 of 12" — a progress bar turns a conversation into a form and
 * manufactures the feeling of abandoning something (standing beat-count ruling:
 * entries accumulate, uncapped, never "step N of N").
 */
export function interviewQueue(claims, askedCounts) {
  const asked = (askedCounts && typeof askedCounts === 'object') ? askedCounts : {};
  const timesAsked = (c) => {
    const n = asked[c.claim_id];
    return Number.isFinite(n) ? n : 0;
  };
  const open = (claims ?? []).filter(
    (c) => c.status === 'inferred' && timesAsked(c) < MAX_ASKS_PER_CLAIM,
  );
  const rank = (c) => {
    const i = CONFIRM_PRIORITY.indexOf(c.field);
    return i === -1 ? CONFIRM_PRIORITY.length : i;
  };
  return [...open].sort((a, b) => {
    const d = rank(a) - rank(b);
    return d !== 0 ? d : open.indexOf(a) - open.indexOf(b);   // stable within a rank
  });
}
