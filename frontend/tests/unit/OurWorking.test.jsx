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

// The DNX find, at the render layer (John ruling 2026-08-26 — tag it, don't hide
// it). An anonymous read of dnx.solutions returns our own partner-strategy notes,
// quotes from a private call included, as a citation card sitting beside a real
// Yahoo Finance article. Both still appear; only one of them is our own record,
// and the card has to say which.
const OUR_OWN_HIT = {
  n: 1,
  slug: 'ethiks360-ethiks360-ramble-source-pack',
  layer: 'vendor/ethiks360',
  evidence_id: 'ev-ethiks360-ramble',
  score: 0.56,
  access_layer: 'public',
  source_url: null,
  excerpt: 'DNX\'s response: "Yeah, I do. This is amazing."',
};

describe('OurWorking — our own record is marked, never disguised as evidence', () => {
  function openCard(hits, slug) {
    const api = render(<OurWorking receipt={{ ts: Date.now(), query: 'DNX', hits }} />);
    fireEvent.click(screen.getByText(/our working/i));
    const row = api.container.querySelector(`button[data-slug="${slug}"]`)
      || Array.from(api.container.querySelectorAll('button')).find(b => b.textContent.includes(slug.split('-')[0]));
    if (row) fireEvent.click(row);
    return api;
  }

  it('marks our own material as potentially sensitive, and says why', () => {
    const { container } = openCard([OUR_OWN_HIT], OUR_OWN_HIT.slug);
    const marked = container.querySelector('[data-sensitive="true"]');
    expect(marked).not.toBeNull();
    expect(marked.textContent).toMatch(/potentially sensitive/i);
    expect(marked.textContent).toMatch(/our own material/i);
    expect(marked.textContent).toMatch(/no published source/i);
  });

  it('still shows the card — this labels, it does not filter', () => {
    const { container } = openCard([OUR_OWN_HIT], OUR_OWN_HIT.slug);
    expect(container.textContent).toMatch(/this is amazing/i);
  });

  it('leaves a genuine third-party source unmarked', () => {
    const { container } = openCard([HIT], HIT.slug);
    expect(container.querySelector('[data-sensitive="true"]')).toBeNull();
  });
});
