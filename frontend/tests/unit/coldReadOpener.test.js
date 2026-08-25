// frontend/tests/unit/coldReadOpener.test.js
// John walk feedback (2026-08-25) item 1+2: kill the score-led opener, make degraded
// reads honest, and present the inferred narrative as a correctable invite rather than
// a verdict. INVARIANTS §6 (lamp register — never grade, never push).
//
// "The reading" (John ruling 2026-08-25, mid-build amendment): when the API hands
// back a synthesized cold-read paragraph, it replaces the bullet list; when it's null
// (honest degradation), behavior is exactly the pre-reading bullet list. readingAnchorLabels
// is the deterministic evidence-anchor trail — chips only ever appear alongside a
// non-empty reading, never without one.
import { describe, it, expect } from 'vitest';
import { coldReadOpener, readingAnchorLabels } from '../../src/rendering/coldReadOpener.js';

describe('coldReadOpener', () => {
  it('a full read never mentions a numeric score and leads with "read complete"', () => {
    const msg = coldReadOpener({
      name: 'Acme',
      sourcesRead: 3,
      inferences: [{ label: 'Software product', confidence: 'probable' }],
    });
    expect(msg).toMatch(/^Acme — read complete\./);
    expect(msg).not.toMatch(/\d+\s*\/\s*100/);
    expect(msg).not.toMatch(/trust score/i);
    expect(msg).not.toMatch(/Ask me anything/i);
    expect(msg).not.toMatch(/!/);
  });

  it('a degraded read (no pages fetched) is honest about the failed scrape, not a score', () => {
    const msg = coldReadOpener({ name: 'Acme', sourcesRead: 0, inferences: [] });
    expect(msg).toMatch(/^Acme — their site wouldn't open for us/);
    expect(msg).toMatch(/perimeter read only/);
    expect(msg).not.toMatch(/\d+\s*\/\s*100/);
    expect(msg).not.toMatch(/trust score/i);
  });

  it('lists inferences as label + confidence word, ending with a correction invite', () => {
    const msg = coldReadOpener({
      name: 'Acme',
      sourcesRead: 2,
      inferences: [
        { label: 'Software product', confidence: 'probable' },
        { label: 'Targeting enterprise buyers', confidence: 'likely' },
      ],
    });
    expect(msg).toContain('What we\'ve inferred so far:');
    expect(msg).toContain('- Software product (probable)');
    expect(msg).toContain('- Targeting enterprise buyers (likely)');
    expect(msg).toContain('Does this sound right? Anything to change?');
  });

  it('zero inferences → honest "couldn\'t infer much" invite, not an empty list', () => {
    const msg = coldReadOpener({ name: 'Acme', sourcesRead: 3, inferences: [] });
    expect(msg).toContain("We couldn't infer much from the outside — tell me about the company and we'll build from your words.");
    expect(msg).not.toContain('What we\'ve inferred so far:');
  });

  it('falls back to a neutral name when none is known', () => {
    const msg = coldReadOpener({ sourcesRead: 0, inferences: [] });
    expect(msg).toMatch(/^This company —/);
  });

  it('inferences missing a label are skipped rather than rendered blank', () => {
    const msg = coldReadOpener({
      name: 'Acme',
      sourcesRead: 1,
      inferences: [{ confidence: 'probable' }, { label: 'Seed stage', confidence: 'probable' }],
    });
    expect(msg).toContain('- Seed stage (probable)');
    expect((msg.match(/^- /gm) || []).length).toBe(1);
  });

  it('a non-empty reading replaces the bullet list — headline kept, reading included, no bullets, no numeric score', () => {
    const reading = "We think you're in fintech, selling to enterprise buyers. How'd we do — anything to correct?";
    const msg = coldReadOpener({
      name: 'Acme',
      sourcesRead: 3,
      inferences: [{ label: 'Software product', confidence: 'probable' }],
      reading,
    });
    expect(msg).toMatch(/^Acme — read complete\./);
    expect(msg).toContain(reading);
    expect(msg).not.toContain('What we\'ve inferred so far:');
    expect(msg).not.toContain('- Software product (probable)');
    expect(msg).not.toContain('Does this sound right? Anything to change?');
    expect(msg).not.toMatch(/\d+\s*\/\s*100/);
  });

  it('a non-empty reading on a degraded read keeps the honest "site wouldn\'t open" headline', () => {
    const reading = "It looks like your site was unreachable, so this is a perimeter read. Anything to correct?";
    const msg = coldReadOpener({ name: 'Acme', sourcesRead: 0, inferences: [], reading });
    expect(msg).toMatch(/^Acme — their site wouldn't open for us/);
    expect(msg).toContain('perimeter read only');
    expect(msg).toContain(reading);
    expect(msg).not.toContain("We couldn't infer much from the outside");
  });

  it('reading === null → exactly current bullet behavior, unchanged', () => {
    const msg = coldReadOpener({
      name: 'Acme',
      sourcesRead: 2,
      inferences: [{ label: 'Software product', confidence: 'probable' }],
      reading: null,
    });
    expect(msg).toContain('What we\'ve inferred so far:');
    expect(msg).toContain('- Software product (probable)');
    expect(msg).toContain('Does this sound right? Anything to change?');
  });

  it('a whitespace-only reading is treated as absent — falls back to bullets', () => {
    const msg = coldReadOpener({
      name: 'Acme',
      sourcesRead: 2,
      inferences: [{ label: 'Software product', confidence: 'probable' }],
      reading: '   \n  ',
    });
    expect(msg).toContain('What we\'ve inferred so far:');
  });
});

describe('readingAnchorLabels', () => {
  const anchors = [
    { label: 'aws hosting', source: 'ip probe' },
    { label: 'Security hiring signal', source: 'jobs scan' },
  ];

  it('returns the anchor labels when a reading is present', () => {
    expect(readingAnchorLabels('We think you sell to enterprise. Anything to correct?', anchors))
      .toEqual(['aws hosting', 'Security hiring signal']);
  });

  it('returns [] when reading is null, even with anchors supplied', () => {
    expect(readingAnchorLabels(null, anchors)).toEqual([]);
  });

  it('returns [] when reading is whitespace-only', () => {
    expect(readingAnchorLabels('   ', anchors)).toEqual([]);
  });

  it('returns [] when there is a reading but no anchors', () => {
    expect(readingAnchorLabels('We think you sell to enterprise.', [])).toEqual([]);
    expect(readingAnchorLabels('We think you sell to enterprise.', undefined)).toEqual([]);
  });

  it('drops anchors with a missing label rather than rendering a blank chip', () => {
    expect(readingAnchorLabels('reading text', [{ source: 'jobs scan' }, { label: 'SSL grade: A', source: 'ssl scan' }]))
      .toEqual(['SSL grade: A']);
  });
});
