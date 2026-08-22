// firehose.js — the cold read from nothing (ETHL firehose 2026-08-23). The founder
// talks their idea; we catch fragments, build the Record on the same truth ladder a URL
// cold read fills, and reflect it back so the confirm ceremony has something to confirm.
// The session lands inference-complete so /chat picks it straight up — one Record, three
// intake pressures (idea / deck / site).
import { createSession, updateSession, getSession } from '../services/session-store.js';
import { extractFromUtterance, buildUtteranceClaims, reflectBack } from '../services/firehose-intake.js';
import { claimsProjection } from '../services/claims-projection.js';

// POST /api/v1/firehose  { utterance }
export async function firehoseHandler(request, reply) {
  const utterance = (request.body?.utterance || '').trim();
  if (!utterance) return reply.status(400).send({ error: 'utterance_required' });

  // Parse is best-effort: a Bedrock failure or an unreadable idea must still open a
  // session and invite more — never a 500, never a dead end (show-the-work, honest).
  let extracted = {};
  try {
    extracted = await extractFromUtterance(utterance, {});
  } catch (err) {
    request.log?.error?.(err, 'firehose parse failed');
    extracted = {};
  }

  const claims = buildUtteranceClaims(extracted);

  const session = createSession({ source: 'firehose' });
  updateSession(session.id, {
    infer_status: 'complete',
    company_name: extracted.company_summary ? null : 'Your idea',
    company_summary: extracted.company_summary || null,
    firehose_utterance: utterance,
    claim_records: claims,
    claim_events: [],
  });

  const projected = claimsProjection({ record_claims: claims, claim_events: [] });
  return reply.status(201).send({
    session_id: session.id,
    reflect_back: reflectBack(projected),
    caught: projected.length,
    company_summary: extracted.company_summary || null,
  });
}
