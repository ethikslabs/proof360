// record.js — the Record (ETHL-WRK-SPEC-011): the customer's evidence record, claim by
// claim, inferred-until-confirmed. Pre-attach the claims buffer on the in-memory session
// (claim_records + claim_events, same record shapes the founder-memory log stores); the
// projection is the same pure fold either way. The explicit answer endpoint is the UI's
// "yes / edit" verb — the chat ceremony writes the same events through the same shapes.
import { getSession, updateSession } from '../services/session-store.js';
import {
  buildClaimEvent,
  claimsProjection,
  nextConfirmable,
} from '../services/claims-projection.js';
import { liveProposals, shortlistSnapshot } from './shortlist.js';
import { matchedPrograms } from '../services/programs-matcher.js';
import { cerProjection } from '../services/cer-projection.js';

export function sessionRecordSnapshot(session) {
  return {
    record_claims: session.claim_records || [],
    claim_events: session.claim_events || [],
  };
}

// A partial record rendered as if it were whole is worse than a missing section:
// the founder reads "nothing is open to you" when the truth is "we could not work
// it out just now". Each derived section is therefore isolated — one that throws
// yields an empty array and the rest of the page still stands.
function safely(label, fn) {
  try {
    const out = fn();
    return Array.isArray(out) ? out : [];
  } catch (err) {
    console.error(JSON.stringify({ event: 'record_section_failed', section: label, error: err.message }));
    return [];
  }
}

// The whole record in one read (John, 2026-08-26: "a pop out to a new page with
// all of that, not just sitting in the bubble"). A page that had to fan out to
// /proposals and /shortlist separately would render three partial truths at three
// different moments — the same fault that put 12, 6 and 0/6 on one screen.
function projectRecord(session) {
  const claims = claimsProjection(sessionRecordSnapshot(session));
  return {
    company_name: session.company_name || null,
    website_url: session.website_url || null,
    claims,
    proposals: safely('proposals', () => liveProposals(session)),
    shortlist: safely('shortlist', () => cerProjection(shortlistSnapshot(session))),
    confirmed_count: claims.filter((c) => c.status === 'confirmed' || c.status === 'corrected').length,
    inferred_count: claims.filter((c) => c.status === 'inferred').length,
    // What the founder has settled, out of what we have noted. A count of your own
    // answers is not a grade — nothing here marks the company out of anything.
    total_count: claims.length,
    next_confirmable: nextConfirmable(claims),
  };
}

// Receipt hit shape — the cross-tree citation contract (chat receipts AND the
// analyze response's corpus_citations use exactly this): text arrives as the
// corpus-retrieve hit's `text`, leaves as `excerpt`.
export function toReceiptHits(hits) {
  return (hits ?? []).map((h) => ({
    n: h.n,
    slug: h.slug,
    layer: h.layer,
    evidence_id: h.evidence_id,
    score: h.score,
    excerpt: h.text,
    source_url: h.source_url ?? null,
    fetched_at: h.fetched_at ?? null,
  }));
}

// The chat's audit trail ("Our working", 2026-08-23): every grounded exchange appends
// one receipt — what was asked, what was retrieved, card-ready fields per hit. Honest
// by construction: corpus down = an empty-hits receipt, never a fabricated line.
const MAX_RECEIPTS = 20;

export function appendChatReceipt(session, { query, hits }) {
  const receipt = {
    ts: new Date().toISOString(),
    query,
    hits: toReceiptHits(hits),
  };
  const receipts = [...(session.chat_receipts || []), receipt].slice(-MAX_RECEIPTS);
  updateSession(session.id, { chat_receipts: receipts });
}

// GET /api/v1/session/:id/chat/receipts
export async function chatReceiptsHandler(request, reply) {
  const session = getSession(request.params.id);
  if (!session) return reply.status(404).send({ error: 'session_not_found' });
  return reply.send({ receipts: session.chat_receipts || [] });
}

// GET /api/v1/session/:id/programs — the AWS and Microsoft programs this company
// actually qualifies for, matched by the same trigger evaluation recompute runs.
// Replaces two hardcoded UI constants that asserted entitlements ("$10k unclaimed
// — already granted") about accounts nobody had looked at (John, 2026-08-26).
export async function programsHandler(request, reply) {
  const session = getSession(request.params.id);
  if (!session) return reply.status(404).send({ error: 'session_not_found' });
  return reply.send(matchedPrograms(session));
}

// GET /api/v1/session/:id/record
export async function recordHandler(request, reply) {
  const session = getSession(request.params.id);
  if (!session) return reply.status(404).send({ error: 'session_not_found' });
  return reply.send({ record: projectRecord(session) });
}

// POST /api/v1/session/:id/claims/:claimId/answer  { action: confirm|correct|reject, value? }
const ACTION_TO_EVENT = { confirm: 'confirmed', correct: 'corrected', reject: 'rejected' };

export async function claimAnswerHandler(request, reply) {
  const session = getSession(request.params.id);
  if (!session) return reply.status(404).send({ error: 'session_not_found' });

  const { claimId } = request.params;
  const type = ACTION_TO_EVENT[request.body?.action];
  if (!type) return reply.status(400).send({ error: 'unknown_action' });

  const claims = session.claim_records || [];
  if (!claims.find((c) => c.claim_id === claimId)) {
    return reply.status(404).send({ error: 'claim_not_found' });
  }

  let event;
  try {
    event = buildClaimEvent(claimId, {
      type,
      value: request.body?.value,
      actor: 'founder',
      via: 'record_ui',
    });
  } catch (err) {
    return reply.status(400).send({ error: err.message });
  }

  updateSession(session.id, { claim_events: [...(session.claim_events || []), event] });
  const updated = getSession(session.id);
  const projected = claimsProjection(sessionRecordSnapshot(updated));
  return reply.send({
    claim: projected.find((c) => c.claim_id === claimId),
    record: {
      confirmed_count: projected.filter((c) => c.status === 'confirmed' || c.status === 'corrected').length,
      inferred_count: projected.filter((c) => c.status === 'inferred').length,
    },
  });
}
