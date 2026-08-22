import { randomUUID } from 'node:crypto';

// The Record (ETHL-WRK-SPEC-011 D0/D1) — the customer's evidence record, claim by claim.
// NOT a new store: claims ride the founder-memory append-only transaction log as two
// record kinds, exactly the pattern the Move (cer-projection.js) already uses —
//   `record_claim` : the claim base record (immutable; born `inferred` with provenance)
//   `claim_event`  : the append-only truth ladder (confirmed | corrected | rejected)
// Live status is DERIVED by folding events at read time — never by mutating the claim.
// Pre-attach, the same records buffer on the in-memory session (session.claim_records)
// and flow into the log verbatim at session-attach, like cold-read facts already do.

export const CLAIM_STATUSES = ['inferred', 'confirmed', 'corrected', 'rejected'];

// Positive lists — default-deny. A provenance method or event type not named here refuses.
const PROVENANCE_METHODS = [
  'recon-ip', 'recon-dns', 'recon-http', 'recon-certs', 'recon-ports', 'recon-ssllabs',
  'recon-hibp', 'recon-abuseipdb', 'recon-github', 'recon-company',
  'claude-inference', 'user-confirm', 'user-edit', 'register-deposit',
];
const CLAIM_EVENT_TYPES = ['confirmed', 'corrected', 'rejected'];

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
    value,
    inferred_value: claim.value,
    status,
    provenance: claim.provenance,
    confirmed,
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

export function buildInferredClaims({ recon = {}, signals = [] } = {}) {
  const claims = [];
  const claimedFields = new Set();

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
    claimedFields.add(cfg.field);
  }

  for (const signal of signals) {
    const field = SIGNAL_CLAIM_MAP[signal.type];
    if (!field || claimedFields.has(field)) continue;
    if (signal.value === undefined || signal.value === null || signal.value === '') continue;
    claims.push(buildClaimRecord({
      field,
      value: signal.value,
      provenance: {
        method: 'claude-inference',
        detail: `website extraction (${signal.confidence || 'unstated'} confidence)`,
      },
    }));
    claimedFields.add(field);
  }

  return claims;
}

// ---------------------------------------------------------------------------
// The confirm ceremony picker (D3): at most ONE confirm prompt per exchange,
// never a claim the user already ruled on. Priority is commercial: the fields
// that unlock register triggers come first.
// ---------------------------------------------------------------------------
const CONFIRM_PRIORITY = [
  'infrastructure.cloud_provider',
  'compliance.soc2_status',
  'company.stage',
  'market.customer_type',
  'data.sensitivity',
  'identity.model',
  'governance.cyber_insurance',
];

export function nextConfirmable(claims) {
  const open = claims.filter((c) => c.status === 'inferred');
  if (!open.length) return null;
  for (const field of CONFIRM_PRIORITY) {
    const hit = open.find((c) => c.field === field);
    if (hit) return hit;
  }
  return open[0];
}
