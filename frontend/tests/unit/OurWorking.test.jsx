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

const HIT2A = {
  n: 2, slug: 'disc-finance-yahoo-com-sectors-technology-fc3d8252', layer: 'vendor/cognisys',
  evidence_id: 'ev-2', score: 0.86, excerpt: 'Yahoo Finance excerpt one.',
  source_url: 'https://finance.yahoo.com/sectors/technology/', fetched_at: '2026-08-20T23:23:14.582Z',
};
const HIT2B = { ...HIT2A, n: 4, evidence_id: 'ev-4', score: 0.75, excerpt: 'Yahoo Finance excerpt two.' };

describe('OurWorking citation cards', () => {
  it('collapsed by default, summary names the source count', () => {
    render(<OurWorking receipt={{ query: 'q', hits: [HIT] }} />);
    expect(screen.getByText(/Our working · 1 source$/)).toBeTruthy();
    expect(screen.queryByText(new RegExp(HIT.slug))).toBeNull();
  });

  it('expands to hit rows; expanding a row reveals the excerpt card with quoted excerpt, fetched date, and source link', () => {
    render(<OurWorking receipt={{ query: 'q', hits: [HIT] }} />);
    fireEvent.click(screen.getByText(/Our working · 1 source$/));
    fireEvent.click(screen.getByText(/soc2auditors\.org/));
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

  it('labels reference rows by publisher domain, slug demoted to the card fine print', () => {
    render(<OurWorking receipt={{ query: 'q', hits: [HIT] }} />);
    fireEvent.click(screen.getByText(/Our working · 1 source$/));
    expect(screen.getByText(/soc2auditors\.org/)).toBeTruthy();          // row label
    expect(screen.queryByText(new RegExp(HIT.slug))).toBeNull();         // slug not in the row
    fireEvent.click(screen.getByText(/soc2auditors\.org/));
    expect(screen.getByText(new RegExp(HIT.slug))).toBeTruthy();         // slug in card fine print
  });

  it('falls back to the slug as the row label when source_url is null', () => {
    render(<OurWorking receipt={{ query: 'q', hits: [{ ...HIT, source_url: null }] }} />);
    fireEvent.click(screen.getByText(/Our working · 1 source$/));
    expect(screen.getByText(new RegExp(HIT.slug))).toBeTruthy();
  });

  it('groups multiple chunks of one document into a single row, preserving chunk numbers', () => {
    render(<OurWorking receipt={{ query: 'q', hits: [HIT, HIT2A, HIT2B] }} />);
    fireEvent.click(screen.getByText(/Our working · 2 sources$/));       // 2 documents, 3 chunks
    expect(screen.getByText(/\[2\]\[4\]/)).toBeTruthy();                 // both chunk numbers on the row
    expect(screen.getByText(/2 excerpts/)).toBeTruthy();
    fireEvent.click(screen.getByText(/finance\.yahoo\.com/));
    expect(screen.getByText(/Yahoo Finance excerpt one\./)).toBeTruthy(); // both cards revealed
    expect(screen.getByText(/Yahoo Finance excerpt two\./)).toBeTruthy();
  });
});
