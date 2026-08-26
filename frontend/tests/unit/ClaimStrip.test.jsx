// The companion panel counted the record and never showed it.
//
// John, 2026-08-26, on first seeing "Cognisys · 6 noted" land after months:
// "Finally!!!!!!! ... ok, now, finally we are doing something... what 6 signals?
// How do you look and change if needed? Where is the shortlist of vendors that
// could take you on a trust/compliance path"
//
// Three fair questions, and two of them were "it doesn't". The panel rendered
// `{claims.length} things we've noted so far` — a number and nothing else — with
// a comment conceding the gap: "No per-claim tap-to-correct handler exists on
// this strip today". Meanwhile the API has had confirm / correct / reject since
// SPEC-011, and every claim already carries label, value, status and provenance.
// The record was accumulating in full and being displayed as an integer.
//
// So: show the six, grade each one, say where it came from, and let the founder
// answer it. A claim the founder confirms is first-party testimony — the highest
// grade of evidence the record holds — which is the whole point of the ceremony.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { ClaimStrip } from '../../src/components/chat/ClaimStrip.jsx';

const CLAIMS = [
  {
    claim_id: 'clm_1',
    field: 'customer_type',
    label: 'Customer type',
    value: 'Enterprise (B2B)',
    status: 'inferred',
    provenance: 'inferred from company research',
  },
  {
    claim_id: 'clm_2',
    field: 'infrastructure',
    label: 'Hosting',
    value: 'Oracle',
    status: 'confirmed',
    provenance: 'live probe',
    confirmed: { by: 'founder', at: Date.now() },
  },
];

describe('ClaimStrip — the record, shown', () => {
  it('names every claim instead of counting them', () => {
    const { container } = render(<ClaimStrip claims={CLAIMS} />);
    expect(container.textContent).toContain('Customer type');
    expect(container.textContent).toContain('Enterprise (B2B)');
    expect(container.textContent).toContain('Hosting');
    expect(container.textContent).toContain('Oracle');
  });

  it('grades each one, so a guess never reads as a fact', () => {
    const { container } = render(<ClaimStrip claims={CLAIMS} />);
    expect(container.textContent).toMatch(/inferred/i);
    expect(container.textContent).toMatch(/confirmed/i);
  });

  // Live shape check: claimsProjection emits provenance as an OBJECT
  // {method, detail, at} — e.g. {method:'recon-ip', detail:'IP → hosting provider
  // lookup'} — not a string. Joining it renders "[object Object]", which is what
  // the first cut of this component would have shown a founder.
  it('reads the real provenance object, never "[object Object]"', () => {
    const realShape = [{
      claim_id: 'clm_r', field: 'infrastructure', label: 'cloud provider',
      value: 'Oracle', status: 'inferred',
      provenance: { method: 'recon-ip', detail: 'IP → hosting provider lookup', at: '2026-08-26T10:11:20.418Z' },
    }];
    const { container } = render(<ClaimStrip claims={realShape} />);
    expect(container.textContent).not.toContain('[object Object]');
    expect(container.textContent).toContain('IP → hosting provider lookup');
  });

  it('falls back to the method when there is no human detail', () => {
    const realShape = [{
      claim_id: 'clm_m', field: 'x', label: 'thing', value: 'v', status: 'inferred',
      provenance: { method: 'recon-dns' },
    }];
    const { container } = render(<ClaimStrip claims={realShape} />);
    expect(container.textContent).toContain('recon-dns');
    expect(container.textContent).not.toContain('[object Object]');
  });

  it('says where each one came from', () => {
    const { container } = render(<ClaimStrip claims={CLAIMS} />);
    expect(container.textContent).toContain('inferred from company research');
    expect(container.textContent).toContain('live probe');
  });

  it('offers an answer on an inferred claim — this is the "change if needed"', () => {
    const { getAllByRole } = render(<ClaimStrip claims={CLAIMS} onAnswer={vi.fn()} />);
    const yes = getAllByRole('button', { name: /that's right/i });
    const no = getAllByRole('button', { name: /not quite/i });
    // Only the inferred claim is answerable; the confirmed one is already settled.
    expect(yes).toHaveLength(1);
    expect(no).toHaveLength(1);
  });

  it('sends confirm with the claim id', async () => {
    const onAnswer = vi.fn().mockResolvedValue({});
    const { getByRole } = render(<ClaimStrip claims={CLAIMS} onAnswer={onAnswer} />);
    fireEvent.click(getByRole('button', { name: /that's right/i }));
    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith('clm_1', 'confirm'));
  });

  it('sends reject when the founder says it is wrong', async () => {
    const onAnswer = vi.fn().mockResolvedValue({});
    const { getByRole } = render(<ClaimStrip claims={CLAIMS} onAnswer={onAnswer} />);
    fireEvent.click(getByRole('button', { name: /not quite/i }));
    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith('clm_1', 'reject'));
  });

  it('offers no buttons at all when nothing can be answered', () => {
    const { queryByRole } = render(<ClaimStrip claims={CLAIMS} />);
    // No handler wired — never invite a tap that does nothing (the exact fault
    // the old comment was working around).
    expect(queryByRole('button', { name: /that's right/i })).toBeNull();
  });

  it('marks a confirmed claim as the founder\'s own word', () => {
    const { container } = render(<ClaimStrip claims={CLAIMS} />);
    expect(container.textContent).toMatch(/your word/i);
  });

  it('renders nothing when the record is empty', () => {
    const { container } = render(<ClaimStrip claims={[]} />);
    expect(container.textContent).toBe('');
  });

  it('survives a malformed claim rather than blanking the panel', () => {
    const { container } = render(<ClaimStrip claims={[{ claim_id: 'x' }, ...CLAIMS]} />);
    expect(container.textContent).toContain('Customer type');
  });
});
