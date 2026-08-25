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

export function sessionRecordSnapshot(session) {
  return {
    record_claims: session.claim_records || [],
    claim_events: session.claim_events || [],
  };
}

function projectRecord(session) {
  const claims = claimsProjection(sessionRecordSnapshot(session));
  return {
    claims,
    confirmed_count: claims.filter((c) => c.status === 'confirmed' || c.status === 'corrected').length,
    inferred_count: claims.filter((c) => c.status === 'inferred').length,
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
