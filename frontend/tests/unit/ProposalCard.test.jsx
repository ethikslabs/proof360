// frontend/tests/unit/ProposalCard.test.jsx
// Proposal cards in-stream (docs/plans/2026-08-25-persona-chips-and-proposal-cards.md,
// Task 3). Lamp register: reason on the face, no imperatives. Card verb is EXACTLY
// "Add to shortlist" — "Buy"/"Subscribe" must never appear (ANTI-SELL).
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProposalCard } from '../../src/components/chat/ProposalCard.jsx';

const tk = {
  ink: '#1a1d24', inkMid: '#4a4f5c', inkSoft: '#94a3b8',
  hairline: '#e6e8ec', surface: '#ffffff', bg: '#f5f6f8',
};

// Realistic proposal shapes — as returned by GET /api/v1/session/:id/proposals
// (api/src/services/trigger-evaluator.js evaluateRegister): id, kind, title,
// description, url, cer_route, trigger, claims_cited, gaps_cited, reason (string,
// already human-readable — built server-side by proposalReason()).
const SECURITY_PROPOSAL = {
  id: 'cap-aws-security-hub',
  kind: 'vendor',
  title: 'AWS Security Hub',
  description: 'Centralised security and compliance visibility across your AWS environment.',
  url: 'https://aws.amazon.com/security-hub/',
  cer_route: 'ingram_micro_aws',
  trigger: 'Surfaces when CER shows open gaps: soc2, compliance, essential_eight, incident_response',
  claims_cited: [],
  gaps_cited: ['soc2', 'compliance', 'essential_eight', 'incident_response'],
  reason: 'AWS Security Hub proposed because the soc2, compliance, essential_eight, incident_response gaps are open on your read.',
};

const FUNDING_PROPOSAL = {
  id: 'aws-activate-founders',
  kind: 'program',
  title: 'AWS Activate Founders',
  description: '$1,000 AWS credits + Developer Support',
  url: 'https://aws.amazon.com/activate/',
  cer_route: 'ingram_micro_aws',
  trigger: 'stage in [Pre-seed, Seed, Series A] AND has_raised_institutional = false',
  claims_cited: [{ claim_id: 'c1', field: 'company.stage', value: 'Seed' }],
  gaps_cited: [],
  reason: 'AWS Activate Founders proposed because your company stage is confirmed as Seed.',
};

const NARRATIVE_PROPOSAL = {
  id: 'cap-reachlx',
  kind: 'vendor',
  title: 'ReachLX',
  description: 'Leadership and founder trust profiling.',
  url: 'https://lxplatform.io/',
  cer_route: 'shortlist_general',
  trigger: 'Surfaces when CER shows open gaps: founder_trust',
  claims_cited: [],
  gaps_cited: ['founder_trust'],
  reason: 'ReachLX proposed because the founder_trust gap is open on your read.',
};

describe('ProposalCard', () => {
  it('renders vendor name, persona attribution (security → Edison), and reason on the face', () => {
    render(<ProposalCard proposal={SECURITY_PROPOSAL} onAccept={() => {}} onDefer={() => {}} busy={false} tk={tk} />);
    expect(screen.getByText('AWS Security Hub')).toBeTruthy();
    expect(screen.getByText('Edison')).toBeTruthy();
    expect(screen.getByText(/Technical & execution/)).toBeTruthy();
    expect(screen.getByText(/soc2, compliance, essential_eight, incident_response gaps are open/)).toBeTruthy();
  });

  it('maps a funding/credits trigger to Leonardo (Strategy & market)', () => {
    render(<ProposalCard proposal={FUNDING_PROPOSAL} onAccept={() => {}} onDefer={() => {}} busy={false} tk={tk} />);
    expect(screen.getByText('AWS Activate Founders')).toBeTruthy();
    expect(screen.getByText('Leonardo')).toBeTruthy();
    expect(screen.getByText(/Strategy & market/)).toBeTruthy();
  });

  it('maps a narrative/trust trigger to Sophia (Narrative & trust)', () => {
    render(<ProposalCard proposal={NARRATIVE_PROPOSAL} onAccept={() => {}} onDefer={() => {}} busy={false} tk={tk} />);
    expect(screen.getByText('ReachLX')).toBeTruthy();
    expect(screen.getByText('Sophia')).toBeTruthy();
    expect(screen.getByText(/Narrative & trust/)).toBeTruthy();
  });

  it('"Add to shortlist" fires onAccept once with the proposal id, and disables while busy', () => {
    const onAccept = vi.fn();
    const { rerender } = render(
      <ProposalCard proposal={SECURITY_PROPOSAL} onAccept={onAccept} onDefer={() => {}} busy={false} tk={tk} />
    );
    fireEvent.click(screen.getByText('Add to shortlist'));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onAccept).toHaveBeenCalledWith('cap-aws-security-hub');

    rerender(<ProposalCard proposal={SECURITY_PROPOSAL} onAccept={onAccept} onDefer={() => {}} busy tk={tk} />);
    const btn = screen.getAllByRole('button')[0];
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onAccept).toHaveBeenCalledTimes(1); // still 1 — busy click did not fire again
  });

  it('"Not now" fires onDefer with the proposal id', () => {
    const onDefer = vi.fn();
    render(<ProposalCard proposal={SECURITY_PROPOSAL} onAccept={() => {}} onDefer={onDefer} busy={false} tk={tk} />);
    fireEvent.click(screen.getByText('Not now'));
    expect(onDefer).toHaveBeenCalledTimes(1);
    expect(onDefer).toHaveBeenCalledWith('cap-aws-security-hub');
  });

  it('copy: contains "Add to shortlist" and never "Buy" or "Subscribe" (ANTI-SELL, lamp register)', () => {
    const { container } = render(
      <ProposalCard proposal={SECURITY_PROPOSAL} onAccept={() => {}} onDefer={() => {}} busy={false} tk={tk} />
    );
    const text = container.textContent;
    expect(text).toContain('Add to shortlist');
    expect(text).not.toMatch(/\bBuy\b/i);
    expect(text).not.toMatch(/\bSubscribe\b/i);
  });

  it('renders nothing when proposal is null', () => {
    const { container } = render(<ProposalCard proposal={null} onAccept={() => {}} onDefer={() => {}} busy={false} tk={tk} />);
    expect(container.firstChild).toBeNull();
  });
});
