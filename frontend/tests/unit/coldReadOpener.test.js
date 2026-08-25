// frontend/tests/unit/coldReadOpener.test.js
// John walk feedback (2026-08-25) item 1+2: kill the score-led opener, make degraded
// reads honest, and present the inferred narrative as a correctable invite rather than
// a verdict. INVARIANTS §6 (lamp register — never grade, never push).
import { describe, it, expect } from 'vitest';
import { coldReadOpener } from '../../src/rendering/coldReadOpener.js';

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
});
