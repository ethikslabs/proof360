// "Looks like you're on Oracle — right?" — every answer, forever.
//
// Boarded for weeks as persona-prompt polish. It is not a prompt problem. The
// confirm ceremony picks nextConfirmable(claims) each exchange — the highest
// priority claim still marked 'inferred' — and arms it as the pending question.
// If the founder replies with something else (a real question, which is what
// people actually do), the claim is never answered, stays 'inferred', and is
// picked again next turn. And the turn after. Nothing anywhere records that we
// already asked.
//
// So the most impressive answer in the product — a persona citing four corpus
// sources about a six-figure deal the founder never mentioned — ends with the
// same hosting question for the fourth time.
//
// A question asked twice and not answered is an answer: they don't want to
// engage with it. Ask the next thing, or ask nothing. The founder can still
// settle any claim directly in the companion panel, which now lists them all.
import { describe, it, expect } from 'vitest';
import { nextConfirmable } from '../../src/services/claims-projection.js';

const claim = (id, field, status = 'inferred') => ({
  claim_id: id, field, status, label: field, value: 'x',
});

// CONFIRM_PRIORITY order puts customer_type ahead of infrastructure.
const CLAIMS = [
  claim('clm_cust', 'customer_type'),
  claim('clm_infra', 'infrastructure'),
  claim('clm_data', 'data_sensitivity'),
];

describe('nextConfirmable — stops asking a question nobody is answering', () => {
  it('picks the highest-priority open claim when nothing has been asked', () => {
    expect(nextConfirmable(CLAIMS)?.claim_id).toBe('clm_cust');
  });

  // One ask, then move on. Two still surfaced the tic twice inside a three-turn
  // walk, and the companion panel now carries a per-claim "That's right / Not
  // quite", so chat has a second route and does not need to keep pressing.
  it('moves on after a single unanswered ask', () => {
    expect(nextConfirmable(CLAIMS, { clm_cust: 1 })?.claim_id).toBe('clm_infra');
  });

  it('asks NOTHING rather than cycling once every claim has been asked out', () => {
    const asked = { clm_cust: 1, clm_infra: 1, clm_data: 1 };
    expect(nextConfirmable(CLAIMS, asked)).toBeNull();
  });

  it('never re-asks a claim the founder has since answered', () => {
    const answered = [
      claim('clm_cust', 'customer_type', 'confirmed'),
      claim('clm_infra', 'infrastructure'),
    ];
    expect(nextConfirmable(answered, {})?.claim_id).toBe('clm_infra');
  });

  it('is unchanged when no ask history is passed — old callers keep working', () => {
    expect(nextConfirmable(CLAIMS)?.claim_id).toBe('clm_cust');
    expect(nextConfirmable(CLAIMS, undefined)?.claim_id).toBe('clm_cust');
    expect(nextConfirmable([])).toBeNull();
  });

  it('tolerates a junk ask-history without losing the question entirely', () => {
    expect(nextConfirmable(CLAIMS, null)?.claim_id).toBe('clm_cust');
    expect(nextConfirmable(CLAIMS, { clm_cust: 'lots' })?.claim_id).toBe('clm_cust');
  });
});
