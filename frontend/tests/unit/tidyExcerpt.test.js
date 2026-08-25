import { describe, it, expect } from 'vitest';
import { tidyExcerpt } from '../../src/rendering/tidyExcerpt.js';

describe('tidyExcerpt — honest excerpt windowing', () => {
  it('strips a leading navigation-breadcrumb run and marks the trim with an ellipsis', () => {
    const raw = 'Home/ Service Firms/ Readiness Firms/ Cognisys Cognisys is a SOC 2 support firm in Leeds, UK.';
    expect(tidyExcerpt(raw)).toBe('… Cognisys Cognisys is a SOC 2 support firm in Leeds, UK.');
  });

  it('cuts a mid-sentence tail at the last sentence boundary and marks it', () => {
    const raw = 'Cognisys is a SOC 2 support firm in Leeds, UK founded in 2019. Facts come from the';
    expect(tidyExcerpt(raw)).toBe('Cognisys is a SOC 2 support firm in Leeds, UK founded in 2019. …');
  });

  it('leaves a clean excerpt untouched', () => {
    const raw = 'Cognisys provides penetration testing. Their clients span the UK.';
    expect(tidyExcerpt(raw)).toBe(raw);
  });

  it('never cuts when no sentence boundary exists past the minimum window (verbatim over polish)', () => {
    const raw = 'a fragment with no terminal punctuation that keeps going and going without a full stop anywhere';
    expect(tidyExcerpt(raw)).toBe(raw);
  });

  it('collapses internal whitespace runs', () => {
    expect(tidyExcerpt('Two  spaces\n and a newline.')).toBe('Two spaces and a newline.');
  });

  it('passes through null/empty', () => {
    expect(tidyExcerpt('')).toBe('');
    expect(tidyExcerpt(null)).toBe(null);
  });
});
