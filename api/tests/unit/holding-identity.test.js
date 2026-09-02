// The typo bug, 2026-09-02. Reading `congisys.co.uk` — one transposition from
// cognisys.co.uk — found a site that would not open (0 pages readable) and still
// produced a confident profile: 120 people, 19 countries, Vanta's #1 global service
// partner. Every fact was real. None of it was about the domain that was typed.
//
// Corpus retrieval is semantic on purpose and should stay that way; finding near
// material is the point. The missing piece was any check that a holding is ABOUT the
// company being read before speaking about it in the second person.
import { describe, it, expect } from 'vitest';
import { holdingIdentity, normaliseName, buildReadingContext } from '../../src/services/cold-reading.js';

const YAHOO = {
  slug: 'cognisys-yahoo',
  source_url: 'https://finance.yahoo.com/news/cognisys',
  text: 'Cognisys is a UK-founded cybersecurity and compliance consultancy. Team of 120 specialists operating across 19 countries.',
};

describe('normaliseName', () => {
  it('ignores case, spacing and punctuation', () => {
    expect(normaliseName('Cognisys Ltd.')).toBe('cognisysltd');
    expect(normaliseName('  CO-GNISYS  ')).toBe('cognisys');
  });
  it('survives nothing', () => {
    expect(normaliseName(null)).toBe('');
    expect(normaliseName(undefined)).toBe('');
  });
});

describe('holdingIdentity — the bug that started it', () => {
  it('will NOT claim a Cognisys holding is about Congisys', () => {
    expect(holdingIdentity(YAHOO, { company_name: 'Congisys', domain: 'congisys.co.uk' }))
      .toBe('unconfirmed');
  });

  it('still confirms the holding for the company it is actually about', () => {
    expect(holdingIdentity(YAHOO, { company_name: 'Cognisys', domain: 'cognisys.co.uk' }))
      .toBe('confirmed');
  });

  it('confirms anything published on their own domain', () => {
    const own = { text: 'We do things.', source_url: 'https://www.congisys.co.uk/about' };
    expect(holdingIdentity(own, { company_name: 'Congisys', domain: 'congisys.co.uk' }))
      .toBe('confirmed');
    const sub = { text: 'x', source_url: 'https://blog.congisys.co.uk/post' };
    expect(holdingIdentity(sub, { company_name: 'Congisys', domain: 'congisys.co.uk' }))
      .toBe('confirmed');
  });

  it('confirms on the slug when the text does not name them', () => {
    expect(holdingIdentity({ slug: 'cognisys-profile', text: 'A consultancy.' },
      { company_name: 'Cognisys' })).toBe('confirmed');
  });

  it('matches on the domain label when no company name was extracted', () => {
    // The unreadable-site case: name comes from the domain, nothing else.
    expect(holdingIdentity(YAHOO, { domain: 'cognisys.co.uk' })).toBe('confirmed');
    expect(holdingIdentity(YAHOO, { domain: 'congisys.co.uk' })).toBe('unconfirmed');
  });

  it('fails CLOSED when there is nothing to check against', () => {
    expect(holdingIdentity(YAHOO, {})).toBe('unconfirmed');
    expect(holdingIdentity(YAHOO, { company_name: '', domain: '' })).toBe('unconfirmed');
  });

  it('ignores names too short to be evidence of anything', () => {
    expect(holdingIdentity({ text: 'abc corp' }, { company_name: 'ab' })).toBe('unconfirmed');
  });

  it('survives a malformed source_url instead of throwing', () => {
    const bad = { ...YAHOO, source_url: 'not a url' };
    expect(holdingIdentity(bad, { company_name: 'Cognisys', domain: 'cognisys.co.uk' }))
      .toBe('confirmed');   // falls through to the text check
  });
});

describe('the prompt carries the gate', () => {
  const session = (over) => ({
    website_url: 'https://congisys.co.uk',
    company_name: 'Congisys',
    inferences: [], raw_signals: [], recon_context: {}, company_summary: null,
    pages_read_count: 0,
    corpus_hits: [YAHOO],
    ...over,
  });

  it('marks a near-miss holding as identity-not-confirmed', async () => {
    const { prompt } = await buildReadingContext(session());
    expect(prompt).toMatch(/CORPUS-UNCONFIRMED/);
    expect(prompt).toMatch(/IDENTITY NOT CONFIRMED/);
  });

  it('forbids writing an unconfirmed holding as "you"', async () => {
    const { prompt } = await buildReadingContext(session());
    expect(prompt).toMatch(/never say 'you' about it/);
    expect(prompt).toMatch(/do not write a profile at all/);
  });

  it('leaves a correctly-identified holding on the ordinary corpus tag', async () => {
    const { prompt } = await buildReadingContext(
      session({ company_name: 'Cognisys', website_url: 'https://cognisys.co.uk' }),
    );
    expect(prompt).not.toMatch(/IDENTITY NOT CONFIRMED/);
  });
});
