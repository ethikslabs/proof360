// The [n] marker is the join between a claim and its source — the strongest thing
// this product does, and the one John flagged on 2026-09-02 as unclear on screen.
//
// The behaviour was already right: rendering/citations.js resolves the marker against
// THIS answer's receipt and Bubble renders a link with a hover card. What was wrong was
// that it did not LOOK like anything — body-ink text with a dotted underline the colour
// of a hairline, on a cream ground, reads as a stray number. These tests hold the
// affordance visible and the language plain.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Bubble } from '../../src/components/chat/Bubble.jsx';
import { tokens } from '../../src/tokens.js';

const tk = tokens('parallel');

// jsdom normalises hex to rgb() in inline styles.
const rgb = (hex) => {
  const [r, g, b] = hex.match(/\w\w/g).map((h) => parseInt(h, 16));
  return `rgb(${r}, ${g}, ${b})`;
};

const receipt = {
  hits: [
    { n: 1, slug: 'aws-guidance', layer: 'doctrine', excerpt: 'Exposure restriction.', source_url: null },
    { n: 2, slug: 'cognisys-leadiq', layer: 'market', excerpt: 'Vanta’s #1 Global Service Partner.', source_url: 'https://www.leadiq.com/c/cognisys' },
  ],
};

const msg = {
  role: 'assistant', persona: 'leonardo',
  content: 'A third-party directory record names them as a top partner [2].',
  working: receipt,
};

const t = { theme: 'parallel' };

describe('the inline citation marker', () => {
  it('renders as a link, not as prose', () => {
    render(<Bubble msg={msg} t={t} isLatest />);
    const marker = screen.getByLabelText(/Source 2:/i);
    expect(marker.tagName).toBe('A');
    expect(marker).toHaveTextContent('[2]');
  });

  it('points at the actual source', () => {
    render(<Bubble msg={msg} t={t} isLatest />);
    expect(screen.getByLabelText(/Source 2:/i))
      .toHaveAttribute('href', 'https://www.leadiq.com/c/cognisys');
  });

  // The defect: it was styled in body ink against a hairline underline, so a real
  // affordance read as a stray number. It has to be visibly distinct from prose.
  it('is visibly distinct from the surrounding text', () => {
    render(<Bubble msg={msg} t={t} isLatest />);
    const marker = screen.getByLabelText(/Source 2:/i);
    expect(marker).toHaveStyle({ color: tk.plum });
    expect(marker.style.borderBottom).toContain(rgb(tk.plum));
    expect(marker.style.borderBottom).not.toContain(rgb(tk.hairline));
  });

  it('names the publisher rather than an internal system', () => {
    render(<Bubble msg={msg} t={t} isLatest />);
    expect(screen.getByLabelText(/Source 2:/i).getAttribute('aria-label'))
      .toMatch(/leadiq\.com/);
  });

  // "Corpus holding" was the fallback when no URL could name a publisher — an internal
  // codename in the one line whose whole job is telling a founder where a fact came from.
  it('never names the corpus to the reader when it cannot name a publisher', () => {
    render(<Bubble msg={{ ...msg, content: 'AWS frames this as exposure restriction [1].' }} t={t} isLatest />);
    const label = screen.getByLabelText(/Source 1:/i).getAttribute('aria-label');
    expect(label).not.toMatch(/corpus/i);
    expect(label).toMatch(/record we already held/i);
  });

  // An unmatched marker must stay literal: a link to a source that did not ground the
  // sentence is the invented-provenance failure this product exists to refuse.
  it('leaves a marker with no matching source as plain text', () => {
    render(<Bubble msg={{ ...msg, content: 'Something unbacked [7].' }} t={t} isLatest />);
    expect(screen.queryByLabelText(/Source 7:/i)).toBeNull();
  });
});
