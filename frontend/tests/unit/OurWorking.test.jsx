import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { OurWorking } from '../../src/components/chat/OurWorking.jsx';

const HIT = {
  n: 1, slug: 'disc-soc2auditors-org', layer: 'vendor/cognisys',
  evidence_id: 'ev-1', score: 0.86,
  excerpt: 'Cognisys maintains SOC 2 Type II attestation covering its managed detection service.',
  source_url: 'https://soc2auditors.org/security-firms/cognisys/',
  fetched_at: '2026-08-20T23:23:14.582Z',
};

describe('OurWorking citation cards', () => {
  it('collapsed by default, summary names the source count', () => {
    render(<OurWorking receipt={{ query: 'q', hits: [HIT] }} />);
    expect(screen.getByText(/Our working · 1 source$/)).toBeTruthy();
    expect(screen.queryByText(new RegExp(HIT.slug))).toBeNull();
  });

  it('expands to hit rows; expanding a row reveals the excerpt card with quoted excerpt, fetched date, and source link', () => {
    render(<OurWorking receipt={{ query: 'q', hits: [HIT] }} />);
    fireEvent.click(screen.getByText(/Our working · 1 source$/));
    fireEvent.click(screen.getByText(new RegExp(HIT.slug)));
    expect(screen.getByText(new RegExp(HIT.excerpt.slice(0, 30)))).toBeTruthy();
    expect(screen.getByText(/Corpus holding · fetched 2[01] Aug 2026/)).toBeTruthy();
    const link = screen.getByText('Read the original →');
    expect(link.getAttribute('href')).toBe(HIT.source_url);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('a hit without source_url renders the card with no link (honest unlinked reference)', () => {
    render(<OurWorking receipt={{ query: 'q', hits: [{ ...HIT, source_url: null }] }} />);
    fireEvent.click(screen.getByText(/Our working · 1 source$/));
    fireEvent.click(screen.getByText(new RegExp(HIT.slug)));
    expect(screen.queryByText('Read the original →')).toBeNull();
    expect(screen.getByText(/Corpus holding · fetched/)).toBeTruthy();
  });

  it('renders nothing when receipt is null', () => {
    const { container } = render(<OurWorking receipt={null} />);
    expect(container.innerHTML).toBe('');
  });
});
