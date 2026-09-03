import { randomUUID } from 'node:crypto';
import { CER_ROUTES, visibilityPolicyForRoute } from '../config/cer-routes.js';

// A CER (Customer Engagement Record — renamed from Commercial 2026-07-16; the stored
// decision_type 'commercial_engagement' stays as accepted residue) is a typed commercial Decision a founder makes
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
  // ETHL-WRK-SPEC-011 D5: a Move born from a register trigger carries its reason on
  // its face — { trigger_id, claims_cited, gaps_cited, text, user_text, discussed_in }.
  reason = null,
  // Universal add-to-shortlist (John 2026-08-23): the shortlisted thing's display
  // identity — { name, category, register_id, url }. null for trigger-born Moves
  // whose identity is the route itself.
  item = null,
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
      reason,
      item,
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

// --- Introduction: the one person-edge proof360 creates (CONSENT-BOTH-ENDS-001) ---
// A partner asks; the founder grants or declines; either end can withdraw. Four more
// cer_event types on the same log, folded at read time like consent and status. The
// founder's contact is projected to the partner ONLY while a grant stands — see
// introductionForPartner(). Nothing is revealed by a partner-side click, ever.
export const INTRODUCTION_EVENTS = [
  'introduction-requested', // actor: partner  (carries `partner`)
  'introduction-granted',   // actor: founder
  'introduction-declined',  // actor: founder
  'introduction-withdrawn', // actor: founder | partner
];

export function buildIntroductionEvent(cerId, { type, actor, partner = null, note = null }) {
  if (!INTRODUCTION_EVENTS.includes(type)) throw new Error(`unknown_introduction_event:${type}`);
  return {
    primitive: 'cer_event',
    id: randomUUID(),
    source: actor,
    cer_id: cerId,
    type,
    actor,
    partner,
    note,
    ts: iso(),
  };
}

const EMPTY_INTRODUCTION = Object.freeze({ state: 'none', partner: null, asked_at: null, decided_at: null, withdrawn_by: null });

// Fold in append order. Each request opens a fresh ask; decline/withdraw close it; the
// history stays in the log. `state` is always one of none|asked|granted|declined|withdrawn.
function foldIntroduction(evs) {
  let intro = { ...EMPTY_INTRODUCTION };
  for (const e of evs) {
    switch (e.type) {
      case 'introduction-requested':
        intro = { state: 'asked', partner: e.partner || null, asked_at: e.ts, decided_at: null, withdrawn_by: null };
        break;
      case 'introduction-granted':
        if (intro.state === 'asked') intro = { ...intro, state: 'granted', decided_at: e.ts };
        break;
      case 'introduction-declined':
        if (intro.state === 'asked') intro = { ...intro, state: 'declined', decided_at: e.ts };
        break;
      case 'introduction-withdrawn':
        if (intro.state === 'asked' || intro.state === 'granted') intro = { ...intro, state: 'withdrawn', withdrawn_by: e.actor || null };
        break;
      default:
        break;
    }
  }
  return intro;
}

// Gates are positive conditions (write gates default-deny). Absent fields fail closed.
export function canRequestIntroduction(cer, partner) {
  if (!cer || typeof partner !== 'string' || !partner) return false;
  if (cer.consent_state !== 'granted') return false;
  if (CER_ROUTES[cer.route]?.partner !== partner) return false;
  const state = cer.introduction?.state;
  return state !== 'asked' && state !== 'granted';
}

export function canDecideIntroduction(cer) {
  return Boolean(cer) && cer.consent_state === 'granted' && cer.introduction?.state === 'asked';
}

export function canWithdrawIntroduction(cer, { actor, partner = null } = {}) {
  if (!cer) return false;
  const state = cer.introduction?.state;
  if (state !== 'asked' && state !== 'granted') return false;
  if (actor === 'founder') return true;
  if (actor === 'partner') return typeof partner === 'string' && partner === cer.introduction?.partner;
  return false;
}

// The partner's view of the edge. Contact only while granted; never person_id.
export function introductionForPartner(cer, founder) {
  const intro = cer?.introduction || EMPTY_INTRODUCTION;
  const granted = intro.state === 'granted';
  const contact = granted && founder
    ? { name: founder.name ?? null, email: founder.email ?? null }
    : null;
  return { state: intro.state, asked_at: intro.asked_at, decided_at: intro.decided_at, contact };
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
    // Per-item CTA for the shortlist (John 2026-08-23): the real next action —
    // apply for a program, request an insurance quote — surfaced from the route's
    // external_action seam. null routes render no button (never a dead control).
    cta: CER_ROUTES[decision.route]?.external_action || null,
    person_id: decision.person_id,
    company_id: decision.company_id,
    recommendation_id: decision.recommendation_id,
    evidence_refs: decision.evidence_refs || [],
    reason: decision.reason ?? null,
    item: decision.item ?? null,
    visibility_policy: decision.visibility_policy,
    admin_status,
    status: withdrawn ? 'Closed' : admin_status,
    consent_state,
    partner_sharing: !withdrawn,
    introduction: foldIntroduction(evs),
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
