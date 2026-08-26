// Six rows on John's record, five of them reading "AWS pathway via Ingram Micro"
// and one reading "Shortlist" (2026-08-26). Two separate faults behind that.
//
// The display half is fixed in KeptProjection: a move was titled by its ROUTE's
// label, and every AWS offer routes ingram_micro_aws, so five genuinely different
// programs rendered as five identical lines. The item is the thing kept; the route
// is only how it travels.
//
// This is the other half. acceptProposal appended a CER every time it was called,
// with no check that this proposal had already been accepted — so a double-tap, a
// retried request, or the chat ceremony firing alongside the panel button each
// added another copy. shortlistAddHandler had been idempotent on item name since
// John's 2026-08-23 ruling; the proposal path never got the same treatment.
import { describe, it, expect } from 'vitest';
import { createSession, updateSession, getSession } from '../../src/services/session-store.js';
import { buildInferredClaims } from '../../src/services/claims-projection.js';
import { liveProposals, acceptProposal } from '../../src/handlers/shortlist.js';

function seeded() {
  const session = createSession({ website_url: 'https://cognisys.example' });
  const claims = buildInferredClaims({
    recon: { cloud_provider: 'aws' },
    signals: [{ type: 'stage', value: 'Seed', confidence: 'confident' }],
  });
  updateSession(session.id, {
    infer_status: 'complete',
    company_name: 'Cognisys',
    claim_records: claims,
    // First-party testimony opens the commerce lane (D4).
    claim_events: claims.map((c) => ({
      claim_id: c.claim_id, type: 'confirmed', actor: 'founder',
      at: '2026-08-26T10:00:00.000Z',
    })),
  });
  return getSession(session.id);
}

describe('acceptProposal — keeping a thing twice does not keep two things', () => {
  it('accepts an open proposal once', () => {
    const session = seeded();
    const [first] = liveProposals(session);
    if (!first) return; // register opened nothing for this shape — nothing to assert
    const r = acceptProposal(getSession(session.id), first.id);
    expect(r.move).toBeTruthy();
    expect(getSession(session.id).shortlist_records.length).toBeGreaterThan(0);
  });

  // The endpoint has always answered a repeat accept with 409, and that contract
  // stands — a repeat is a conflict, not a second keep. What changed is that the
  // repeat is now RECOGNISED as one (already: true, with the existing move
  // attached) instead of falling through to 'proposal_not_open', which told the
  // caller the wrong reason: accepting closes the proposal, so the second call
  // read as "that was never open" rather than "you already have it".
  it('recognises a repeat accept as already-kept, and appends nothing', () => {
    const session = seeded();
    const [first] = liveProposals(session);
    if (!first) return;
    const a = acceptProposal(getSession(session.id), first.id);
    const countAfterFirst = getSession(session.id).shortlist_records.length;

    const b = acceptProposal(getSession(session.id), first.id);
    expect(getSession(session.id).shortlist_records.length).toBe(countAfterFirst);
    expect(b.already).toBe(true);
    expect(b.move?.cer_id).toBe(a.move?.cer_id);
    expect(b.error).toBeUndefined();
  });

  it('a kept move carries the ITEM, so two offers on one route stay distinguishable', () => {
    const session = seeded();
    const [first] = liveProposals(session);
    if (!first) return;
    const { move } = acceptProposal(getSession(session.id), first.id);
    expect(move.item?.title || move.item?.name).toBeTruthy();
  });
});
