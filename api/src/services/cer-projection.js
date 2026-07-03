import { randomUUID } from 'node:crypto';
import { CER_ROUTES, visibilityPolicyForRoute } from '../config/cer-routes.js';

// A CER (Commercial Engagement Record) is a typed commercial Decision a founder makes
// inside the strategy room. It is NOT a new kernel primitive and NOT a new store: it
// rides the existing append-only founder-memory transaction log as two record kinds —
//   `decision`  : the CER base record (immutable; carries the initial status)
//   `cer_event` : the append-only log (consent-granted | consent-withdrawn | status-updated)
// Current status and consent state are DERIVED by folding the event log at read time —
// never by mutating the decision record. That fold is cerProjection(); it is a pure
// function over the snapshot, exactly like buildProfileProjections().

// §6 status model — five explicit states, no 13-state sprawl.
export const CER_STATUSES = ['Submitted', 'Under review', 'Needs info', 'Booked', 'Closed'];

const TRANSITIONS = {
  Submitted: ['Under review', 'Closed'],
  'Under review': ['Needs info', 'Booked', 'Closed'],
  'Needs info': ['Under review', 'Closed'],
  Booked: ['Under review', 'Closed'],
  Closed: [],
};

export function canTransition(from, to) {
  return Boolean(TRANSITIONS[from]?.includes(to));
}

function iso() {
  return new Date().toISOString();
}

// Build the append-only records for a new CER: one `decision` + one `consent-granted`
// event. Mirrors buildFactRecords' shape. `source` is set on every record because the
// store's normalizeRecord() rejects records without it.
export function buildCerRecords({
  route,
  pathway_type,
  recommendation_id = null,
  evidence_refs = [],
  person_id,
  company_id,
  actor = 'founder',
}) {
  const routeCfg = CER_ROUTES[route];
  if (!routeCfg) throw new Error(`unknown_cer_route:${route}`);
  const resolvedType = pathway_type || routeCfg.pathway_type;
  if (resolvedType !== routeCfg.pathway_type) {
    throw new Error(`pathway_type_route_mismatch:${route} expected ${routeCfg.pathway_type} got ${resolvedType}`);
  }

  const cerId = randomUUID();
  const createdAt = iso();

  const records = [
    {
      primitive: 'decision',
      id: cerId,
      source: actor,
      decision_type: 'commercial_engagement',
      pathway_type: resolvedType,
      route,
      status: 'Submitted',
      person_id,
      company_id,
      recommendation_id,
      evidence_refs,
      visibility_policy: visibilityPolicyForRoute(route),
      created_at: createdAt,
      updated_at: createdAt,
      status_updated_at: createdAt,
    },
    {
      primitive: 'cer_event',
      id: randomUUID(),
      source: actor,
      cer_id: cerId,
      type: 'consent-granted',
      actor,
      ts: createdAt,
    },
  ];

  return { cerId, records };
}

// Append-only event constructors (used by the withdraw / status endpoints).
export function buildConsentWithdrawnRecord(cerId, { actor = 'founder', reason = null } = {}) {
  return {
    primitive: 'cer_event',
    id: randomUUID(),
    source: actor,
    cer_id: cerId,
    type: 'consent-withdrawn',
    actor,
    reason,
    ts: iso(),
  };
}

export function buildStatusUpdatedRecord(cerId, { from, to, actor = 'ethiks360_admin' }) {
  if (!canTransition(from, to)) {
    throw new Error(`illegal_cer_transition:${from}->${to}`);
  }
  return {
    primitive: 'cer_event',
    id: randomUUID(),
    source: actor,
    cer_id: cerId,
    type: 'status-updated',
    from,
    to,
    actor,
    ts: iso(),
  };
}

// The append-only log's ORDER is authoritative — the snapshot's cer_events are already in
// append order (reconstruct() walks transactions in sequence). We must NOT re-sort by wall-clock
// ts: a non-monotonic clock (NTP step, skew, same-ms events) would fold the wrong "latest" event
// and mis-state consent/status (CER-CONSENT-GATES-001). Filter, preserve order.
function eventsForCer(events, cerId) {
  return events.filter((e) => e.cer_id === cerId);
}

// Fold one CER's decision record + its event log into the live projected view.
// Consent-withdrawn OVERRIDES admin status at read time (§7): a withdrawn CER projects
// as Closed with no partner sharing, but the stored admin_status is preserved for audit.
function projectOne(decision, events) {
  const evs = eventsForCer(events, decision.id);

  const consentEvents = evs.filter((e) => e.type === 'consent-granted' || e.type === 'consent-withdrawn');
  const consent_state = consentEvents.at(-1)?.type === 'consent-withdrawn' ? 'withdrawn' : 'granted';

  const admin_status = evs.filter((e) => e.type === 'status-updated').at(-1)?.to || decision.status || 'Submitted';
  const withdrawn = consent_state === 'withdrawn';

  return {
    cer_id: decision.id,
    decision_type: decision.decision_type,
    pathway_type: decision.pathway_type,
    route: decision.route,
    label: CER_ROUTES[decision.route]?.label || null,
    person_id: decision.person_id,
    company_id: decision.company_id,
    recommendation_id: decision.recommendation_id,
    evidence_refs: decision.evidence_refs || [],
    visibility_policy: decision.visibility_policy,
    admin_status,
    status: withdrawn ? 'Closed' : admin_status,
    consent_state,
    partner_sharing: !withdrawn,
    created_at: decision.created_at,
    updated_at: evs.at(-1)?.ts || decision.updated_at,
    events: evs,
  };
}

// Pure function over a reconstructed snapshot → the founder's live CERs.
export function cerProjection(snapshot) {
  const decisions = snapshot?.decisions || [];
  const events = snapshot?.cer_events || [];
  return decisions.map((d) => projectOne(d, events));
}

// Permission-BEFORE-projection (§8). Founder + Ethiks360 admin see everything; a partner
// viewer sees ONLY CERs routed to that partner AND only while consent stands. Withdrawn =
// no further partner sharing. This is the no-leak invariant, proven by test before any
// partner can log in.
export function projectForViewer(cers, viewer) {
  const audience = viewer?.audience;
  if (audience === 'founder' || audience === 'ethiks360_admin') return cers;
  if (audience === 'partner') {
    return cers.filter(
      (c) => CER_ROUTES[c.route]?.partner === viewer.partner && c.consent_state === 'granted'
    );
  }
  return [];
}
