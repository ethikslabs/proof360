// "Operational work units": Tokens processed 18,420 · Analysis passes 0 ·
// Sources reviewed 0 · Model correlations 2.
//
// John, logged in and looking at it (2026-08-26): "what is this telling me?"
// Nothing true. Two of the four were hardcoded literals — 18,420 would have read
// 18,420 for every company, every read, forever — one was a boolean dressed as a
// count (`graphNodes.length > 0 ? 2 : 0`), and the fourth counted inferences
// under a label that said sources. It contradicted itself on its face: 18,420
// tokens processed across ZERO passes over ZERO sources.
//
// Standing rule, already ruled: no invented number, live or illustrative. In a
// product whose pitch is provenance, under a heading that says "operational work
// units", a plausible constant is the worst thing on the screen.
//
// So: every row traces to something the read actually measured, and a row with no
// real source does not render at all. Absence over invention.
import { describe, it, expect } from 'vitest';
import { deriveWorkUnits } from '../../src/rendering/workUnits.js';

const LIVE = {
  pages_read_count: 7,
  sources_read: ['https://cognisys.co.uk', 'https://cognisys.co.uk/about', 'https://cognisys.co.uk/services'],
  inferences: [{ field: 'a' }, { field: 'b' }, { field: 'c' }],
  corpus_citations: { query: 'cognisys', hits: [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }] },
  research_engines: ['perplexity', 'gemini'],
};

const labels = (rows) => rows.map((r) => r.label);
const value = (rows, label) => rows.find((r) => r.label === label)?.value;

describe('deriveWorkUnits — every row traces to a measurement', () => {
  it('counts the pages actually read', () => {
    expect(value(deriveWorkUnits(LIVE), 'Pages read')).toBe(7);
  });

  it('counts SOURCES under the label that says sources', () => {
    expect(value(deriveWorkUnits(LIVE), 'Sources read')).toBe(3);
  });

  it('counts corpus holdings actually cited', () => {
    expect(value(deriveWorkUnits(LIVE), 'Corpus holdings cited')).toBe(4);
  });

  it('counts the signals the read drew out', () => {
    expect(value(deriveWorkUnits(LIVE), 'Signals found')).toBe(3);
  });

  it('names the engines that did the work, rather than a count of nothing', () => {
    expect(value(deriveWorkUnits(LIVE), 'Engines')).toBe('perplexity · gemini');
  });

  // The whole point.
  it('invents nothing — no constant survives into the output', () => {
    const rows = deriveWorkUnits(LIVE);
    expect(labels(rows)).not.toContain('Tokens processed');
    expect(labels(rows)).not.toContain('Model correlations');
    expect(labels(rows)).not.toContain('Analysis passes');
  });

  it('omits a row entirely rather than showing a zero it cannot vouch for', () => {
    const thin = { pages_read_count: 2 };
    const rows = deriveWorkUnits(thin);
    expect(labels(rows)).toEqual(['Pages read']);
  });

  // A read that genuinely read nothing is a real answer and must be sayable:
  // zero pages read is a measurement, absent data is not.
  it('shows a measured zero, and hides an absent one', () => {
    expect(value(deriveWorkUnits({ pages_read_count: 0 }), 'Pages read')).toBe(0);
    expect(labels(deriveWorkUnits({}))).toEqual([]);
    expect(labels(deriveWorkUnits(null))).toEqual([]);
  });

  it('tolerates junk shapes without inventing a number', () => {
    const rows = deriveWorkUnits({ sources_read: 'not-an-array', corpus_citations: 'nope', inferences: 7 });
    expect(rows).toEqual([]);
  });
});
