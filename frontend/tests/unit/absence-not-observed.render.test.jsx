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
