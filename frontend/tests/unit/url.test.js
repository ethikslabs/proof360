import { describe, it, expect } from 'vitest';
import { extractUrl, extractAwaitedUrl } from '../../src/utils/url.js';

// extractUrl is the general chat-message URL detector, moved verbatim from Chat.jsx.
// Its behaviour must NOT broaden: a schemeless domain inside a sentence stays null here,
// so ordinary messages that merely mention a domain never trigger a cold-read.
describe('extractUrl — general message URL detection (unchanged behaviour)', () => {
  it('normalises a bare domain', () => {
    expect(extractUrl('northwind.io')).toBe('https://northwind.io');
  });
  it('passes through a full URL', () => {
    expect(extractUrl('https://northwind.io')).toBe('https://northwind.io');
  });
  it('finds a scheme-ful URL embedded in a sentence', () => {
    expect(extractUrl('go have a look at https://acme.io today')).toBe('https://acme.io');
  });
  it('does NOT match a schemeless domain inside a sentence', () => {
    expect(extractUrl("we're at northwind.io")).toBeNull();
  });
  it('returns null for a plain company name', () => {
    expect(extractUrl('Northwind Traders')).toBeNull();
  });
});

// extractAwaitedUrl is the broader matcher used ONLY when a lens has asked for the
// company and the founder replies. Here "we're at northwind.io" must read as a website.
describe('extractAwaitedUrl — awaited-reply URL detection', () => {
  it('matches everything extractUrl matches', () => {
    expect(extractAwaitedUrl('northwind.io')).toBe('https://northwind.io');
    expect(extractAwaitedUrl('https://northwind.io')).toBe('https://northwind.io');
    expect(extractAwaitedUrl('see https://acme.io please')).toBe('https://acme.io');
  });
  it('recognises a schemeless domain embedded in a sentence', () => {
    expect(extractAwaitedUrl("we're at northwind.io")).toBe('https://northwind.io');
  });
  it('strips trailing punctuation from the matched domain', () => {
    expect(extractAwaitedUrl('our site is www.acme.com.au, have a look')).toBe('https://www.acme.com.au');
  });
  it('returns null for a plain company name', () => {
    expect(extractAwaitedUrl('Northwind Traders')).toBeNull();
  });
  it('does not treat abbreviation dots or version numbers as domains', () => {
    expect(extractAwaitedUrl('Northwind Traders Pty. Ltd')).toBeNull();
    expect(extractAwaitedUrl('we shipped v2.0 yesterday')).toBeNull();
    expect(extractAwaitedUrl('raising our Series A. soon')).toBeNull();
  });
});
