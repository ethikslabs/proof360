// shortlist.js — the FORUM moment inside the Record (ETHL-WRK-SPEC-011 P2/D5).
//
// Proposals are DERIVED, never stored: the capability register's triggers evaluated
// over the session's CONFIRMED claims + open gaps, fresh on every read. Accepting one
// mints a Move (§5.6 lifecycle, Submitted) with its reason on its face. Pre-attach,
// Move records buffer on the session exactly like claim records do and graduate into
// the founder-memory log verbatim at session-attach. The shortlist IS the set of Moves.
import { createRequire } from 'node:module';
import { getSession, updateSession } from '../services/session-store.js';
import { claimsProjection } from '../services/claims-projection.js';
import { evaluateRegister } from '../services/trigger-evaluator.js';
import { buildCerRecords, cerProjection } from '../services/cer-projection.js';
import { sessionRecordSnapshot } from './record.js';

const require = createRequire(import.meta.url);
const REGISTER = require('../config/capability-register.json');

function activeRegister() {
  return REGISTER.entries.filter((e) => e.status === 'active');
}

function openGapIds(session) {
  return (session.gaps || [])
    .filter((g) => g.status === 'open' || g.status === undefined)
    .map((g) => g.id);
}

function shortlistSnapshot(session) {
  const records = session.shortlist_records || [];
  return {
    decisions: records.filter((r) => r.primitive === 'decision'),
    cer_events: records.filter((r) => r.primitive === 'cer_event'),
  };
}

export function liveProposals(session) {
  const claims = claimsProjection(sessionRecordSnapshot(session));
  // D4, commercial flavour: no proposal of any kind until the Record holds at least
  // one piece of first-party testimony. Gap triggers alone (derived, not testified)
  // never open the commerce lane — we never pitch before the user has spoken.
  const testified = claims.some((c) => c.status === 'confirmed' || c.status === 'corrected');
  if (!testified) return [];
  const proposals = evaluateRegister(activeRegister(), {
    claims,
    openGaps: openGapIds(session),
  });
  // A proposal already on the shortlist (or declined in chat) is not re-proposed.
  const taken = new Set([
    ...cerProjection(shortlistSnapshot(session)).map((m) => m.reason?.trigger_id).filter(Boolean),
    ...(session.declined_proposals || []),
  ]);
  return proposals.filter((p) => !taken.has(p.id));
}

// GET /api/v1/session/:id/proposals
export async function proposalsHandler(request, reply) {
  const session = getSession(request.params.id);
  if (!session) return reply.status(404).send({ error: 'session_not_found' });
  return reply.send({ proposals: liveProposals(session) });
}

// GET /api/v1/session/:id/shortlist
export async function shortlistHandler(request, reply) {
  const session = getSession(request.params.id);
  if (!session) return reply.status(404).send({ error: 'session_not_found' });
  return reply.send({ shortlist: cerProjection(shortlistSnapshot(session)) });
}

// The accept verb, shared by the endpoint and the chat ceremony.
export function acceptProposal(session, proposalId, { editedReason = null } = {}) {
  // Re-evaluate at point of use — a proposal is only acceptable while its trigger
  // STILL fires on the current Record (default-deny; never book off a stale read).
  const proposal = liveProposals(session).find((p) => p.id === proposalId);
  if (!proposal) return { error: 'proposal_not_open' };

  const { cerId, records } = buildCerRecords({
    route: proposal.cer_route,
    person_id: null,
    company_id: session.company_name || null,
    evidence_refs: proposal.claims_cited.map((c) => c.claim_id),
    actor: 'founder',
    reason: {
      trigger_id: proposal.id,
      trigger: proposal.trigger,
      claims_cited: proposal.claims_cited,
      gaps_cited: proposal.gaps_cited,
      text: proposal.reason,
      user_text: editedReason,
      discussed_in: session.id,
    },
  });

  updateSession(session.id, {
    shortlist_records: [...(session.shortlist_records || []), ...records],
  });
  const move = cerProjection(shortlistSnapshot(getSession(session.id)))
    .find((m) => m.cer_id === cerId);
  return { move };
}

// Universal "Add to shortlist" (John ruling 2026-08-23): discovery's ONE uniform
// action — one tap, no commitment, the founder saves the thing WITH its reason.
// A register match (provider or title, case-insensitive) adopts the entry's
// cer_route so the route's CTA flows to the shortlist page; anything else routes
// shortlist_general (no CTA — never a dead control). Idempotent on item name.
function matchRegisterEntry(name) {
  const needle = String(name).trim().toLowerCase();
  return activeRegister().find(
    (e) => e.provider?.toLowerCase() === needle || e.title?.toLowerCase() === needle
  ) || null;
}

// POST /api/v1/session/:id/shortlist  { name, category?, why?, source? }
export async function shortlistAddHandler(request, reply) {
  const session = getSession(request.params.id);
  if (!session) return reply.status(404).send({ error: 'session_not_found' });

  const name = request.body?.name?.trim();
  if (!name) return reply.status(400).send({ error: 'name_required' });

  const existing = cerProjection(shortlistSnapshot(session))
    .find((m) => m.item?.name?.toLowerCase() === name.toLowerCase());
  if (existing) {
    return reply.status(200).send({ move: existing, already_shortlisted: true });
  }

  const entry = matchRegisterEntry(name);
  const { cerId, records } = buildCerRecords({
    route: entry?.cer_route || 'shortlist_general',
    person_id: null,
    company_id: session.company_name || null,
    evidence_refs: [],
    actor: 'founder',
    item: {
      name,
      category: request.body?.category || entry?.category || null,
      register_id: entry?.id || null,
      url: entry?.url || null,
    },
    reason: {
      trigger_id: null,
      trigger: null,
      claims_cited: [],
      gaps_cited: [],
      text: request.body?.why || `Added from ${request.body?.source || 'discovery'}`,
      user_text: null,
      discussed_in: session.id,
    },
  });

  updateSession(session.id, {
    shortlist_records: [...(session.shortlist_records || []), ...records],
  });
  const move = cerProjection(shortlistSnapshot(getSession(session.id)))
    .find((m) => m.cer_id === cerId);
  return reply.status(201).send({ move });
}

// POST /api/v1/session/:id/proposals/:proposalId/accept  { edited_reason? }
export async function proposalAcceptHandler(request, reply) {
  const session = getSession(request.params.id);
  if (!session) return reply.status(404).send({ error: 'session_not_found' });

  const result = acceptProposal(session, request.params.proposalId, {
    editedReason: request.body?.edited_reason || null,
  });
  if (result.error) return reply.status(409).send({ error: result.error });
  return reply.status(201).send({ move: result.move });
}
