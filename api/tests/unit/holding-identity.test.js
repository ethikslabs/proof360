// Identity resolved ONCE, upstream (John, 2026-09-02, second pass).
//
// The first pass gated the reading and the reading alone. It worked — a read on
// congisys.co.uk correctly refused to write a profile from Cognisys holdings — while
// three other surfaces published the same material anyway: the prior-knowledge panel
// asserted it was about Congisys, the observation strip turned it into twelve signals,
// and every advisor answer reasoned from it. These tests hold the seam shut at the
// point the hits are born, so a NEW consumer cannot reopen it by simply not knowing.
import { describe, it, expect } from 'vitest';
import {
  normaliseName, holdingIdentity, domainOf,
  resolveSessionIdentity, confirmedHoldings,
} from '../../src/services/holding-identity.js';

// The three holdings from the live read. All are about Cognisys; the founder typed
// congisys.co.uk. None of them names the company that was actually asked about.
const YAHOO = {
  slug: 'cognisys-yahoo', source_url: 'https://finance.yahoo.com/news/cognisys',
  text: 'Cognisys is a UK-founded cybersecurity consultancy. Team of 120 specialists across 19 countries.',
};
const LEADIQ = {
  slug: 'cognisys-leadiq', source_url: 'https://www.leadiq.com/c/cognisys',
  text: 'IT Services and IT Consulting, England, 51-200 Employees. Vanta’s #1 Global Service Partner.',
};
const OWN_SITE = {
  slug: 'their-own-page', source_url: 'https://congisys.co.uk/about',
  text: 'We help organisations become regulator-ready.',
};

const TYPO = { company_name: 'Congisys', website_url: 'congisys.co.uk' };

describe('normaliseName', () => {
  it('compares company names past punctuation and case', () => {
    expect(normaliseName('Cognisys Ltd.')).toBe('cognisysltd');
    expect(normaliseName('COGNISYS')).toBe(normaliseName('cognisys'));
  });
});

describe('holdingIdentity', () => {
  it('confirms a holding published on their own domain', () => {
    expect(holdingIdentity(OWN_SITE, { company_name: 'Congisys', domain: 'congisys.co.uk' }))
      .toBe('confirmed');
  });

  it('does not confirm a near-miss name — the whole bug in one assertion', () => {
    expect(holdingIdentity(YAHOO, { company_name: 'Congisys', domain: 'congisys.co.uk' }))
      .toBe('unconfirmed');
  });

  // Fail closed: nothing to check against is not permission to speak.
  it('is unconfirmed when there is no name and no domain to check', () => {
    expect(holdingIdentity(YAHOO, {})).toBe('unconfirmed');
  });
});

describe('resolveSessionIdentity', () => {
  it('stamps every holding in place, so the verdict travels with the array', () => {
    const hits = [{ ...YAHOO }, { ...LEADIQ }, { ...OWN_SITE }];
    resolveSessionIdentity({ ...TYPO, hits });
    expect(hits.map((h) => h.identity))
      .toEqual(['unconfirmed', 'unconfirmed', 'confirmed']);
  });

  it('reports the session unconfirmed when nothing ties to the domain', () => {
    const hits = [{ ...YAHOO }, { ...LEADIQ }];
    const v = resolveSessionIdentity({ ...TYPO, hits, pages_read_count: 0 });
    expect(v).toMatchObject({ domain: 'congisys.co.uk', any_confirmed: false, confirmed: false });
  });

  // You cannot fetch the wrong company's website.
  it('treats reading their own pages as the identity link', () => {
    const hits = [{ ...YAHOO }];
    expect(resolveSessionIdentity({ ...TYPO, hits, pages_read_count: 4 }).confirmed).toBe(true);
  });

  // The live-web summary is the other contaminated stream: asked to research a typo'd
  // domain, an engine silently corrects it and answers about a different company.
  it('checks the live-web summary the same way it checks a holding', () => {
    const about_them = resolveSessionIdentity({
      ...TYPO, hits: [], company_summary: 'Congisys provides GRC consulting.',
    });
    const about_someone_else = resolveSessionIdentity({
      ...TYPO, hits: [], company_summary: 'Cognisys is a Leeds-based security consultancy.',
    });
    expect(about_them.summary_confirmed).toBe(true);
    expect(about_someone_else.summary_confirmed).toBe(false);
    expect(about_someone_else.confirmed).toBe(false);
  });

  it('survives a null retrieval without inventing a verdict', () => {
    const v = resolveSessionIdentity({ ...TYPO, hits: null });
    expect(v.any_confirmed).toBe(false);
    expect(v.confirmed).toBe(false);
  });
});

describe('confirmedHoldings', () => {
  it('drops what we cannot tie to this company', () => {
    const hits = [{ ...YAHOO }, { ...OWN_SITE }];
    resolveSessionIdentity({ ...TYPO, hits });
    expect(confirmedHoldings(hits).map((h) => h.slug)).toEqual(['their-own-page']);
  });

  // An unstamped hit means no resolution ran at all — unit fixtures and sessions
  // recorded before the stamp existed. Dropping real material over a missing stamp
  // would be its own honesty failure; the pipeline closes at session-start instead.
  it('passes unstamped holdings through rather than silently binning them', () => {
    expect(confirmedHoldings([{ slug: 'no-stamp' }])).toHaveLength(1);
  });

  it('leaves the three-state absence contract alone', () => {
    expect(confirmedHoldings(null)).toBeNull();
    expect(confirmedHoldings([])).toEqual([]);
  });
});

describe('domainOf', () => {
  it('reads a host with or without a scheme', () => {
    expect(domainOf({ website_url: 'congisys.co.uk' })).toBe('congisys.co.uk');
    expect(domainOf({ website_url: 'https://www.congisys.co.uk/about' })).toBe('www.congisys.co.uk');
    expect(domainOf({})).toBeNull();
  });
});
