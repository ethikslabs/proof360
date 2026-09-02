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
    inferences: [], raw_signals: [], recon_context: {},
    company_summary: null,
    pages_read_count: 0,
    corpus_hits: [YAHOO],
    ...over,
  });

  it('keeps the near-miss holding OUT of the evidence entirely', async () => {
    // Tagging it and asking the model not to use it was tried first and failed: the
    // model appended the caveat AND wrote the profile. There must be nothing to write
    // a profile from.
    const { prompt } = await buildReadingContext(session());
    expect(prompt).not.toMatch(/120 specialists/);
    expect(prompt).not.toMatch(/19 countries/);
  });

  it('overrides the whole shape when identity is not established', async () => {
    const { prompt } = await buildReadingContext(session());
    expect(prompt).toMatch(/IDENTITY NOT ESTABLISHED/);
    expect(prompt).toMatch(/OVERRIDES EVERY OTHER INSTRUCTION/);
    expect(prompt).toMatch(/Do NOT write a profile/);
    expect(prompt).toMatch(/\[IDENTITY\]/);
  });

  it('drops a live-web summary that describes a different company', async () => {
    // The second contaminated stream: asked about congisys.co.uk, the engine silently
    // researched cognisys.co.uk and answered about it.
    const { prompt } = await buildReadingContext(session({
      company_summary: 'Cognisys (cognisys.co.uk) is a UK cybersecurity consultancy operating across 19 countries.',
    }));
    expect(prompt).not.toMatch(/cognisys\.co\.uk/i);
    expect(prompt).toMatch(/IDENTITY NOT ESTABLISHED/);
  });

  it('keeps a live-web summary that actually names them', async () => {
    const { prompt } = await buildReadingContext(session({
      company_summary: 'Congisys is a small UK consultancy.',
    }));
    expect(prompt).toMatch(/Congisys is a small UK consultancy/);
    expect(prompt).not.toMatch(/IDENTITY NOT ESTABLISHED/);
  });

  it('reading their own pages is itself the identity link', async () => {
    // You cannot fetch the wrong company's website.
    const { prompt } = await buildReadingContext(session({ pages_read_count: 3 }));
    expect(prompt).not.toMatch(/IDENTITY NOT ESTABLISHED/);
  });

  it('leaves the correctly-identified company completely alone', async () => {
    const { prompt } = await buildReadingContext(
      session({ company_name: 'Cognisys', website_url: 'https://cognisys.co.uk' }),
    );
    expect(prompt).not.toMatch(/IDENTITY NOT ESTABLISHED/);
    expect(prompt).toMatch(/120 specialists/);
  });
});
