// "The short list / what you have kept, should be the thing, context around it,
// and that 'engagement portal' gives you the CTAs. Like you can see for the other
// part of the left side of the screen." — John, 2026-08-26.
//
// The first cut of the record got the content right and the form wrong. It was a
// black full-page route that took over the tab; "← Back to the conversation"
// remounted Chat, which restores no transcript, so it booted a fresh proof360 and
// the conversation was gone. And it led with the claims when the thing worth
// leading with is what the founder has KEPT.
//
// The estate already had the answer on screen: the Vendors projection — kicker,
// serif headline, whose lens it is, a numbered sequence, the reason beside each
// item, and one real action per row. Same shell, same idiom, live data. It opens
// over the conversation like every other projection, so nothing is navigated
// away from and nothing is lost.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { KeptProjection } from '../../src/components/chat/Projections.jsx';

const T = { theme: 'pearl' };

const RECORD = {
  company_name: 'Cognisys',
  shortlist: [
    { cer_id: 'm1', route: 'ingram_micro_aws', label: 'AWS pathway via Ingram Micro',
      item: { title: 'AWS Well-Architected Partner Program', category: 'cloud program' },
      reason: { text: 'proposed because your cloud provider is confirmed as Oracle.',
                context: 'while discussing the Australian launch' },
      cta: { label: 'Book a conversation', url: 'https://example.com/book' },
      consent_state: 'granted' },
    { cer_id: 'm2', route: 'ingram_micro_aws', label: 'AWS pathway via Ingram Micro',
      item: { title: 'AWS POC Funding', category: 'cloud program' },
      reason: { text: 'proposed because SOC 2 is an open gap.' },
      cta: null, consent_state: 'granted' },
  ],
  proposals: [
    { id: 'vanta', kind: 'vendor', title: 'Vanta', description: 'Continuous compliance',
      url: 'https://vanta.com', reason: 'because SOC 2 certification is an open gap.' },
  ],
  claims: [
    { claim_id: 'c1', label: 'cloud provider', value: 'Oracle', status: 'confirmed', confirmed: { by: 'founder' } },
  ],
  confirmed_count: 1, total_count: 1,
};

const draw = (props = {}) =>
  render(<KeptProjection record={RECORD} t={T} {...props} />);

describe('KeptProjection — what you have kept, and what it opens', () => {
  it('leads with what was kept, not with the claims', () => {
    const { container } = draw();
    const text = container.textContent;
    expect(text.indexOf('AWS Well-Architected Partner Program'))
      .toBeLessThan(text.indexOf('cloud provider'));
  });

  // Five rows reading "AWS pathway via Ingram Micro" is what John saw, because the
  // row was titled by the ROUTE's label — every AWS offer routes ingram_micro_aws,
  // so five different programs rendered as five identical lines. The item is the
  // thing kept; the route is only how it gets there.
  it('names the thing kept, never five copies of the route it travels', () => {
    const { container } = draw();
    expect(container.textContent).toContain('AWS Well-Architected Partner Program');
    expect(container.textContent).toContain('AWS POC Funding');
    const routeMentions = container.textContent.match(/AWS pathway via Ingram Micro/g) ?? [];
    expect(routeMentions.length).toBeLessThanOrEqual(2);
  });

  it('carries the context — why each one was kept', () => {
    const { container } = draw();
    expect(container.textContent).toMatch(/because your cloud provider is confirmed as Oracle/i);
    expect(container.textContent).toMatch(/while discussing the Australian launch/i);
  });

  it('gives the engagement CTA where there is a real one to give', () => {
    const { container } = draw();
    const links = [...container.querySelectorAll('a[href]')];
    expect(links.some((a) => a.getAttribute('href') === 'https://example.com/book')).toBe(true);
  });

  it('never renders a dead control on a route with no action', () => {
    const { container } = render(
      <KeptProjection t={T} record={{ ...RECORD, shortlist: [RECORD.shortlist[1]], proposals: [], claims: [] }} />
    );
    expect(container.querySelectorAll('a[href]')).toHaveLength(0);
  });

  it('still shows what is open but not yet kept', () => {
    const { container } = draw();
    expect(container.textContent).toContain('Vanta');
    expect(container.textContent).toMatch(/because SOC 2 certification is an open gap/i);
  });

  it('accepting an open pathway calls through with its id', () => {
    const onAccept = vi.fn();
    const { getByRole } = draw({ onAccept });
    fireEvent.click(getByRole('button', { name: /add to shortlist/i }));
    expect(onAccept).toHaveBeenCalledWith('vanta');
  });

  it('says something human when nothing has been kept yet', () => {
    const { container } = render(
      <KeptProjection t={T} record={{ company_name: 'X', shortlist: [], proposals: [], claims: [], confirmed_count: 0, total_count: 0 }} />
    );
    expect(container.textContent).toMatch(/nothing kept yet|as you keep/i);
  });

  it('survives a malformed move rather than blanking the projection', () => {
    const { container } = render(
      <KeptProjection t={T} record={{ ...RECORD, shortlist: [{ cer_id: 'junk' }, ...RECORD.shortlist] }} />
    );
    expect(container.textContent).toContain('AWS POC Funding');
  });
});
