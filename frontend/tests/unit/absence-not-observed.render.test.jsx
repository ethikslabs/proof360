// HX loop fix 1 (beat 4 · Uneasy · Law 5 observed-not-confirmed), frontend half.
// The API now carries an absence as `confidence: 'not_observed', state:
// 'not_observed'` (inference-builder.js) and a could-not-look retrieval as
// `hits: null` on the receipt (record.js). Both registers must survive the
// frontend: the story panel says "not seen", never a confidence guess; the
// Our working panel says "could not look", never "no sources retrieved".
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { inferencesToSignals } from '../../src/rendering/live-signals.js';
import { gradeWord } from '../../src/rendering/protocol.js';
import { OurWorking } from '../../src/components/chat/OurWorking.jsx';

describe('live-signals: a not_observed inference keeps its register', () => {
  const ABSENT = { inference_id: 'inf_compliance', label: 'SOC 2: not seen on the pages read', confidence: 'not_observed', state: 'not_observed', category: 'governance' };
  const READ = { inference_id: 'inf_customer_type', label: 'B2B SaaS', confidence: 'probable', category: 'market' };

  it('maps to a signal whose grade word is "not seen", not "probable"', () => {
    const [sig] = inferencesToSignals([ABSENT]);
    expect(sig).toBeDefined();
    expect(gradeWord(sig)).toBe('not seen');
  });

  it('a read inference still grades as before', () => {
    const [sig] = inferencesToSignals([READ]);
    expect(gradeWord(sig)).toBe('probable');
  });
});

describe('OurWorking: could-not-look is not found-nothing', () => {
  it('hits null renders "could not look"', () => {
    const { container } = render(<OurWorking receipt={{ query: 'q', hits: null }} />);
    expect(container.textContent).toMatch(/could not look/i);
    expect(container.textContent).not.toMatch(/no sources retrieved/i);
  });

  it('hits [] still renders "no sources retrieved"', () => {
    const { container } = render(<OurWorking receipt={{ query: 'q', hits: [] }} />);
    expect(container.textContent).toMatch(/no sources retrieved/i);
  });
});

// Round 2 (independent review, 2026-09-13): two more render paths carried the
// absence as a reasoned, weighted finding.
import { readingInspection } from '../../src/components/chat/HowWeReadThis.jsx';
import { coldReadOpener } from '../../src/rendering/coldReadOpener.js';

describe('How we read this: an absence never "carried weight"', () => {
  it('a not_observed gap is not counted even if a stale score_impact rides on it', () => {
    const gaps = [
      { gap_id: 'soc2', title: 'SOC 2 certification gap', why: 'Without SOC 2 Type II…', severity: 'critical', state: 'not_observed', score_impact: 20 },
      { gap_id: 'dmarc', title: 'Email domain protection gap (DMARC)', why: 'p=none', severity: 'moderate', state: 'observed', score_impact: 10 },
    ];
    const r = readingInspection({ gaps, trustScore: undefined });
    expect(r.observations.map((o) => o.value)).toEqual(['Email domain protection gap (DMARC)']);
    expect(JSON.stringify(r)).not.toContain('SOC 2');
    expect(r.subject.value).toBe('1 gap carried weight. 1 thing we looked for and couldn\'t spot carried no weight.');
  });
});

describe('cold read opener: an absence is listed as not seen, without the raw enum', () => {
  it('renders the label alone, never "(not_observed)"', () => {
    const msg = coldReadOpener({
      name: 'Cognisys', sourcesRead: 3,
      inferences: [
        { label: 'B2B SaaS', confidence: 'probable' },
        { label: 'SOC 2: not seen on the pages read', confidence: 'not_observed', state: 'not_observed' },
      ],
    });
    expect(msg).toContain('SOC 2: not seen on the pages read');
    expect(msg).not.toContain('not_observed');
    expect(msg).toContain('B2B SaaS (probable)');
  });
});

describe('cold read opener: R6 — an absence with a peer line speaks it', () => {
  it('renders the peer line instead of the short label', () => {
    const line = "Companies like yours usually go for SOC 2 to get through enterprise procurement, and use Vanta (an EthiksLabs partner, 20% off first year) to get there. Looking at your site and around the web, we couldn't spot one. Do you have it?";
    const msg = coldReadOpener({
      name: 'Cognisys', sourcesRead: 3,
      inferences: [{ label: 'SOC 2: not seen on the pages read', confidence: 'not_observed', state: 'not_observed', peer_line: line }],
    });
    expect(msg).toContain(line);
    expect(msg).not.toContain('SOC 2: not seen on the pages read');
  });
});
