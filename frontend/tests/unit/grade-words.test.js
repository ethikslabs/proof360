// Honesty wave item 2 (John walk findings 2026-08-25): grade words, not fake
// percentages. "confidence: 0.6" rendered to a founder as "60%" implies a
// false statistical precision the system doesn't have. Grade language names
// the KIND of evidence instead: observed (a live probe watched it happen),
// confirmed (fairly sure), probable (an inference/guess) — paired with a
// plain-English source description.
import { describe, it, expect } from 'vitest';
import { gradeWord, sourceDescription, gradeLabel } from '../../src/rendering/protocol.js';

describe('gradeWord — maps confidence + source to grade language, never a percentage', () => {
  it('0.9 confidence reads "confirmed"', () => {
    expect(gradeWord({ confidence: 0.9, source: 'url_scrape' })).toBe('confirmed');
  });

  it('0.6 confidence reads "probable"', () => {
    expect(gradeWord({ confidence: 0.6, source: 'url_scrape' })).toBe('probable');
  });

  it('a live-probe-sourced signal always reads "observed", regardless of its numeric confidence', () => {
    expect(gradeWord({ confidence: 0.85, source: 'live_probe' })).toBe('observed');
    expect(gradeWord({ confidence: 0.6, source: 'live_probe' })).toBe('observed');
  });

  it('self-disclosed high-confidence testimony reads "confirmed"', () => {
    expect(gradeWord({ confidence: 0.97, source: 'self_disclosed' })).toBe('confirmed');
  });
});

describe('sourceDescription — plain-English source, never the raw enum value alone', () => {
  it('maps known sources to a human phrase', () => {
    expect(sourceDescription({ source: 'url_scrape' })).toBe('inferred from company research');
    expect(sourceDescription({ source: 'live_probe' })).toBe('live probe');
    expect(sourceDescription({ source: 'self_disclosed' })).toBe('your word');
  });
});

describe('gradeLabel — the full drawer line, worked examples from the spec', () => {
  it('"probable · inferred from company research"', () => {
    expect(gradeLabel({ confidence: 0.6, source: 'url_scrape' })).toBe('probable · inferred from company research');
  });

  it('"observed · live probe"', () => {
    expect(gradeLabel({ confidence: 0.85, source: 'live_probe' })).toBe('observed · live probe');
  });

  it('"confirmed · your word"', () => {
    expect(gradeLabel({ confidence: 0.97, source: 'self_disclosed' })).toBe('confirmed · your word');
  });

  it('never contains a % character', () => {
    for (const signal of [
      { confidence: 0.9, source: 'url_scrape' },
      { confidence: 0.6, source: 'url_scrape' },
      { confidence: 0.85, source: 'live_probe' },
    ]) {
      expect(gradeLabel(signal)).not.toContain('%');
    }
  });
});
