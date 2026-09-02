// "Before we read your site" — the jolt beat.
//
// John, 2026-08-26, on what the Sarvesh demo is for: "make it do things that make
// him feel 'wtf — there's some fucking good ideas'... he sits and stews on it for
// a few days, comes back with something 10 times better."
//
// The strongest thing this build has is already true and currently invisible: the
// machine arrives ALREADY KNOWING things about you, gathered before you ever typed
// your domain, and it can name where each one came from. Today that lands as a
// clause in the middle of a paragraph — "our research suggests across 19
// countries" — which a viewer walks straight past.
//
// This surfaces it as its own moment, and every part of the claim has to be
// literally true or the beat is a lie:
//   · only holdings fetched STRICTLY BEFORE this session began — otherwise
//     "already held" is false
//   · only third-party sources — our own notes about a company are not what the
//     world knew about them (see rendering/sensitivity.js)
//   · nothing at all when nothing qualifies (the ABSENCE RULE), never a hedge
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PriorKnowledge } from '../../src/components/chat/PriorKnowledge.jsx';
import { priorHoldings } from '../../src/rendering/priorKnowledge.js';

const SESSION_START = new Date('2026-08-26T08:00:00Z').getTime();
const BEFORE = '2026-08-20T23:23:14.582Z'; // gathered days earlier
const AFTER = '2026-08-26T08:00:30Z';      // gathered during this session

const YAHOO = {
  n: 2,
  layer: 'vendor/cognisys',
  source_url: 'https://finance.yahoo.com/sectors/technology/articles/leeds-cognisys',
  fetched_at: BEFORE,
  excerpt: 'Team of 120 specialists operating across 19 countries.',
};
const SOC2 = {
  n: 1,
  layer: 'vendor/cognisys',
  source_url: 'https://soc2auditors.org/security-firms/cognisys/',
  fetched_at: BEFORE,
  excerpt: 'Cognisys is a SOC 2 support firm in Leeds, UK providing readiness and CREST-accredited penetration testing.',
};
const OUR_OWN = {
  n: 3,
  layer: 'vendor/ethiks360',
  source_url: null,
  fetched_at: BEFORE,
  excerpt: 'DNX\'s response: "Yeah, I do. This is amazing."',
};
const FRESH = { ...YAHOO, n: 4, fetched_at: AFTER };

describe('priorHoldings — only what was genuinely known beforehand', () => {
  it('keeps holdings fetched before the session started', () => {
    const held = priorHoldings([YAHOO, SOC2], SESSION_START);
    expect(held).toHaveLength(2);
  });

  it('drops anything gathered during this session — "already held" must be true', () => {
    const held = priorHoldings([YAHOO, FRESH], SESSION_START);
    expect(held.map((h) => h.n)).toEqual([2]);
  });

  it('drops our own material — this is what the WORLD knew, not what we wrote', () => {
    const held = priorHoldings([YAHOO, OUR_OWN], SESSION_START);
    expect(held.map((h) => h.n)).toEqual([2]);
  });

  it('drops a holding with no fetch date rather than assuming it is old', () => {
    const held = priorHoldings([{ ...YAHOO, fetched_at: null }], SESSION_START);
    expect(held).toHaveLength(0);
  });

  it('groups by publisher so one document does not read as three findings', () => {
    const held = priorHoldings([YAHOO, { ...YAHOO, n: 5 }, SOC2], SESSION_START);
    expect(held).toHaveLength(2);
  });

  // Live 2026-08-26: ranking by excerpt LENGTH surfaced "room with bigger
  // clients, so it really opens doors…" from the Yahoo piece and buried
  // "120 specialists operating across 19 countries" — the line the beat exists
  // for. Length is not relevance; the retrieval already scored each chunk.
  it('keeps the chunk the corpus scored highest, not the longest one', () => {
    const weakButLong = { ...YAHOO, n: 6, score: 0.41,
      excerpt: 'room with bigger clients, so it really opens doors for businesses and they must prove they can handle data responsibly at length.' };
    const strongButShort = { ...YAHOO, n: 7, score: 0.88,
      excerpt: 'Team of 120 specialists operating across 19 countries.' };
    const [held] = priorHoldings([weakButLong, strongButShort], SESSION_START);
    expect(held.excerpt).toMatch(/19 countries/);
  });

  it('never throws on malformed input', () => {
    expect(() => priorHoldings(null, SESSION_START)).not.toThrow();
    expect(priorHoldings(null, SESSION_START)).toEqual([]);
    expect(priorHoldings([{}], SESSION_START)).toEqual([]);
  });
});

describe('PriorKnowledge — the beat itself', () => {
  const props = { hits: [YAHOO, SOC2], sessionStartedAt: SESSION_START, companyName: 'Cognisys' };

  it('says how many things were already held, and names the company', () => {
    const { container } = render(<PriorKnowledge {...props} />);
    expect(container.textContent).toMatch(/before we read your site/i);
    expect(container.textContent).toContain('Cognisys');
  });

  it('names each publisher and when it was gathered', () => {
    const { container } = render(<PriorKnowledge {...props} />);
    expect(container.textContent).toContain('finance.yahoo.com');
    expect(container.textContent).toContain('soc2auditors.org');
    // Derived, not hardcoded: 2026-08-20T23:23Z is 21 Aug in AEST, and the
    // component correctly renders in the VIEWER's timezone, not UTC.
    const localDay = new Date(BEFORE).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
    expect(container.textContent).toContain(localDay);
  });

  it('quotes the holding, so the knowing is shown rather than asserted', () => {
    const { container } = render(<PriorKnowledge {...props} />);
    expect(container.textContent).toMatch(/120 specialists operating across 19 countries/);
  });

  it('lands the point out loud', () => {
    const { container } = render(<PriorKnowledge {...props} />);
    expect(container.textContent).toMatch(/none of this came from your website/i);
  });

  it('every holding is openable at its source — a claim you cannot check is not evidence', () => {
    const { container } = render(<PriorKnowledge {...props} />);
    const links = [...container.querySelectorAll('a[href]')];
    expect(links).toHaveLength(2);
    for (const a of links) {
      expect(a.getAttribute('href')).toMatch(/^https:\/\//);
      expect(a.getAttribute('rel')).toContain('noopener');
    }
  });

  it('renders NOTHING when nothing was known beforehand — no hedge, no empty box', () => {
    const { container } = render(
      <PriorKnowledge hits={[FRESH, OUR_OWN]} sessionStartedAt={SESSION_START} companyName="Cognisys" />
    );
    expect(container.textContent).toBe('');
  });

  it('renders nothing at all when there are no hits', () => {
    const { container } = render(
      <PriorKnowledge hits={[]} sessionStartedAt={SESSION_START} companyName="Cognisys" />
    );
    expect(container.textContent).toBe('');
  });
});

// -----------------------------------------------------------------------------
// The beat fires; the SENTENCE changes (John, 2026-09-02, second pass).
//
// On a typo'd domain the reading correctly refused to write a profile — "we couldn't
// tie those records to this domain" — and this panel, two inches above it, opened
// with "The record already held 3 things about Congisys." It asserted the exact claim
// the reading had just declined to make, because it never saw the identity verdict.
//
// Still showing the material is right: showing what we found and asking whether it is
// them is honest, and it is how the typo gets caught. Asserting it is about them is not.
// -----------------------------------------------------------------------------
describe('when the holdings cannot be tied to this company', () => {
  const props = {
    hits: [YAHOO, SOC2],
    sessionStartedAt: SESSION_START,
    companyName: 'Congisys',
  };

  it('stops claiming the records are about them', () => {
    const { container } = render(<PriorKnowledge {...props} identityConfirmed={false} />);
    expect(container.textContent).toMatch(/under a name close to Congisys/i);
    expect(container.textContent).not.toMatch(/already held .* about Congisys/i);
  });

  it('says plainly that it may be someone else, and asks', () => {
    const { container } = render(<PriorKnowledge {...props} identityConfirmed={false} />);
    expect(container.textContent).toMatch(/may be a different company/i);
    expect(container.textContent).toMatch(/tell us/i);
  });

  it('still shows the material — the beat is not suppressed', () => {
    const { container } = render(<PriorKnowledge {...props} identityConfirmed={false} />);
    expect(container.textContent).toMatch(/gathered/i);
  });

  it('keeps the original sentence when identity holds', () => {
    const { container } = render(<PriorKnowledge {...props} identityConfirmed />);
    expect(container.textContent).toMatch(/already held/i);
    expect(container.textContent).not.toMatch(/different company/i);
  });

  // Older sessions carry no verdict. Absent is not the same as false: without a
  // verdict we have not established a mismatch, and inventing the caveat would be
  // its own dishonesty (ABSENCE RULE).
  it('reads as confirmed when no verdict was recorded at all', () => {
    const { container } = render(<PriorKnowledge {...props} />);
    expect(container.textContent).toMatch(/already held/i);
  });
});
