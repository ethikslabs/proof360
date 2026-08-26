// "Where is the AWS stuff?" — John, 2026-08-26.
//
// Fair question with an embarrassing answer: nowhere you can see it. The
// capability register holds 70 active entries — 32 AWS/Microsoft/Ingram programs,
// 36 vendors, 2 services — and evaluateRegister derives live proposals from them
// against confirmed claims and open gaps. Confirming one claim about Cognisys
// produced AWS Well-Architected Partner Program and AWS POC Funding, each with
// its worth, its URL, its commercial route and the exact claim that earned it.
//
// None of it had a surface. Proposals were offered ONE at a time, woven into a
// persona reply, and the companion panel only ever showed what had already been
// accepted. So the entire supply side was invisible unless the conversation
// happened to wander past it.
//
// This is the pathway: what's open to you, why, and what it's worth — derived
// fresh every read, never stored, and never shown before evidence earns it (the
// D4 rule that keeps the commerce lane shut until the founder has spoken).
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { PathwaySuggestions } from '../../src/components/chat/PathwaySuggestions.jsx';

const PROPOSALS = [
  {
    id: 'aws-well-architected-partner',
    kind: 'program',
    title: 'AWS Well-Architected Partner Program',
    description: '$5,000 funded per qualified review',
    url: 'https://aws.amazon.com/architecture/well-architected/',
    cer_route: 'ingram_micro_aws',
    claims_cited: [{ claim_id: 'clm_1', field: 'infrastructure.cloud_provider', value: 'Oracle' }],
    reason: 'AWS Well-Architected Partner Program proposed because your cloud provider is confirmed as Oracle.',
  },
  {
    id: 'vanta',
    kind: 'vendor',
    title: 'Vanta',
    description: 'Continuous compliance automation',
    url: 'https://www.vanta.com/',
    gaps_cited: [{ id: 'soc2' }],
    reason: 'Vanta proposed because SOC 2 certification is an open gap.',
  },
];

describe('PathwaySuggestions — the supply side, finally visible', () => {
  it('names every open pathway rather than surfacing one at a time in chat', () => {
    const { container } = render(<PathwaySuggestions proposals={PROPOSALS} />);
    expect(container.textContent).toContain('AWS Well-Architected Partner Program');
    expect(container.textContent).toContain('Vanta');
  });

  it('says what each one is worth', () => {
    const { container } = render(<PathwaySuggestions proposals={PROPOSALS} />);
    expect(container.textContent).toContain('$5,000 funded per qualified review');
  });

  it('says WHY it is offered — the claim that earned it', () => {
    const { container } = render(<PathwaySuggestions proposals={PROPOSALS} />);
    expect(container.textContent).toMatch(/because your cloud provider is confirmed as Oracle/i);
    expect(container.textContent).toMatch(/because SOC 2 certification is an open gap/i);
  });

  it('separates a program from a vendor — they are different kinds of thing', () => {
    const { container } = render(<PathwaySuggestions proposals={PROPOSALS} />);
    expect(container.textContent).toMatch(/program/i);
    expect(container.textContent).toMatch(/vendor/i);
  });

  it('every pathway is openable at source', () => {
    const { container } = render(<PathwaySuggestions proposals={PROPOSALS} />);
    const links = [...container.querySelectorAll('a[href]')];
    expect(links).toHaveLength(2);
    for (const a of links) expect(a.getAttribute('rel')).toContain('noopener');
  });

  it('adding one calls through with its id', async () => {
    const onAccept = vi.fn().mockResolvedValue({});
    const { getAllByRole } = render(<PathwaySuggestions proposals={PROPOSALS} onAccept={onAccept} />);
    fireEvent.click(getAllByRole('button', { name: /add to shortlist/i })[0]);
    await waitFor(() => expect(onAccept).toHaveBeenCalledWith('aws-well-architected-partner'));
  });

  it('offers no add button when nothing can act on it', () => {
    const { queryByRole } = render(<PathwaySuggestions proposals={PROPOSALS} />);
    expect(queryByRole('button', { name: /add to shortlist/i })).toBeNull();
  });

  it('renders nothing when no pathway is open — the lane is shut until evidence earns it', () => {
    const { container } = render(<PathwaySuggestions proposals={[]} />);
    expect(container.textContent).toBe('');
  });

  it('survives a malformed proposal instead of blanking the panel', () => {
    const { container } = render(<PathwaySuggestions proposals={[{ id: 'x' }, ...PROPOSALS]} />);
    expect(container.textContent).toContain('Vanta');
  });
});
