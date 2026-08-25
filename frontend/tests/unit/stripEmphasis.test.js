import { describe, it, expect } from 'vitest';
import { stripEmphasis } from '../../src/rendering/stripEmphasis.js';

describe('stripEmphasis', () => {
  it('strips asterisk emphasis', () => {
    expect(stripEmphasis('accreditation is *current and valid* — despite')).toBe('accreditation is current and valid — despite');
  });
  it('strips bold and underscore markers', () => {
    expect(stripEmphasis('**bold** and __under__')).toBe('bold and under');
  });
  it('strips inline backticks', () => {
    expect(stripEmphasis('no SOC 2 and `p=none` DMARC')).toBe('no SOC 2 and p=none DMARC');
  });
  it('preserves [n] citation markers', () => {
    expect(stripEmphasis('claims CREST [2], and *offering* [1]')).toBe('claims CREST [2], and offering [1]');
  });
  it('leaves multiplication and lone asterisks alone', () => {
    expect(stripEmphasis('5 * 3 = 15')).toBe('5 * 3 = 15');
  });
});
