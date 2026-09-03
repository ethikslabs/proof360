// Inline [n] citations: the join between what the persona SAID and what was RETRIEVED.
//
// The chat has always had both halves and never connected them. The model is told to
// cite inline as [1], [2] (api/src/services/corpus-retrieve.js). The receipt carries the
// source, publisher and fetch date, and renders as "Our working" — collapsed, below the
// answer. So the founder reads a bare "[1]" with no affordance, and the provenance sits
// one click away in a drawer they have no reason to open.
//
// INVARIANTS.md §2: every text surface is context + evidence + synthesis + provenance.
// The bubble was rendering synthesis and orphaning its evidence. This resolves the two.
//
// The hard rule under test: a marker only becomes a citation when a real hit backs it.
// An unmatched [n] stays literal text. We never invent a source to make a link work.

import { describe, it, expect } from 'vitest';
import { resolveCitations } from '../../src/rendering/citations.js';

const receipt = {
  query: 'do I need SOC 2 to sell to enterprise?',
  hits: [
    {
      n: 1,
      slug: 'founder-journey-perplexity-2026-08-21',
      layer: 'answer-surface',
      excerpt: 'Most enterprise buyers ask for SOC 2 Type II before procurement.',
      source_url: 'https://www.pitchwise.se/blog/the-complete-guide',
      fetched_at: '2026-08-21T04:00:00.000Z',
    },
    {
      n: 2,
      slug: 'vanta-state-of-trust',
      layer: 'vendor/vanta',
      excerpt: 'Third-party networks bring more risk and more reviews.',
      source_url: null,
      fetched_at: null,
    },
  ],
};

describe('resolveCitations', () => {
  it('splits a reply into text and resolved citation parts', () => {
    const parts = resolveCitations('Buyers usually ask for SOC 2 [1].', receipt);
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('Buyers usually ask for SOC 2 ');
    expect(parts[1]).toMatchObject({ n: 1, slug: 'founder-journey-perplexity-2026-08-21' });
    expect(parts[2]).toBe('.');
  });

  it('carries the publisher through, derived from the source url', () => {
    const [, cite] = resolveCitations('x [1]', receipt);
    expect(cite.publisher).toBe('pitchwise.se');
  });

  it('has no publisher when the holding has no url — and does not invent one', () => {
    const [, cite] = resolveCitations('x [2]', receipt);
    expect(cite.publisher).toBeNull();
    expect(cite.source_url).toBeNull();
  });

  it('renders an unmatched marker as an unsourced mark — never as text that passes for a citation', () => {
    // Workshop 2026-09-03: literal "[7]" LOOKS like a citation, which is the invented-
    // provenance failure moved to the page. The mark says the source is missing.
    const parts = resolveCitations('Claimed without support [7].', receipt);
    expect(parts).toEqual(['Claimed without support ', { n: 7, unresolved: true }, '.']);
    expect(parts.some((p) => typeof p !== 'string' && p.source_url)).toBe(false); // no source invented
  });

  it('resolves every marker in a reply, repeats included', () => {
    const parts = resolveCitations('One [1], two [2], one again [1].', receipt);
    const cites = parts.filter((p) => typeof p !== 'string');
    expect(cites.map((c) => c.n)).toEqual([1, 2, 1]);
  });

  it('with no receipt at all, every marker is unsourced — and plain text stays untouched', () => {
    for (const empty of [null, undefined, {}, { hits: [] }]) {
      expect(resolveCitations('No grounding this turn [1].', empty))
        .toEqual(['No grounding this turn ', { n: 1, unresolved: true }, '.']);
      expect(resolveCitations('No markers here.', empty)).toEqual(['No markers here.']);
    }
  });

  it('ignores bracketed text that is not a citation marker', () => {
    const parts = resolveCitations('An aside [see below] and [SOC 2].', receipt);
    expect(parts.every((p) => typeof p === 'string')).toBe(true);
  });

  it('handles empty and missing content without throwing', () => {
    expect(resolveCitations('', receipt)).toEqual([]);
    expect(resolveCitations(null, receipt)).toEqual([]);
  });

  it('keeps the excerpt verbatim — the card may window it, never reword it', () => {
    const [, cite] = resolveCitations('x [1]', receipt);
    expect(cite.excerpt).toBe(receipt.hits[0].excerpt);
  });
});
