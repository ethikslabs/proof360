// Honesty wave item 1 (John walk findings 2026-08-25): a signal seen two ways
// carries a distinct marker right in the strip, before the founder even opens the
// evidence drawer.
//
// The MARKER stays; the WORDS changed (John ruling 2026-09-02). It used to read
// "⚡ sources disagree" in alarm red, which adjudicates the founder's record — the
// one thing this product never does. "Every human knows that the internet is full
// of falsehoods, out of date information... we just have a point in time record."
// So these now assert the rule rather than the old copy: the count is shown, the
// verdict vocabulary can never come back.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ObservationStrip } from '../../src/components/chat/ObservationStrip.jsx';

const baseSignal = {
  id: 'sig-1', polarity: 'capability', source: 'live_probe', confidence: 0.85,
  domain: 'security', conversation_turn: 1,
};

describe('ObservationStrip — conflicted chip marker', () => {
  it('marks a signal that was seen two ways', () => {
    render(
      <ObservationStrip
        signals={[{ ...baseSignal, value: 'Hosted on Oracle', conflicted: true, conflict: { probe_says: 'Oracle', source_says: 'AWS' } }]}
        isDemoMode={false} onCorrect={() => {}} onIgnore={() => {}} onAddContext={() => {}}
      />
    );
    expect(screen.getByText('Hosted on Oracle')).toBeInTheDocument();
    expect(screen.getByText(/two readings/i)).toBeInTheDocument();
    // The rule, not the copy: never adjudicate, never call a record a liar.
    expect(screen.queryByText(/disagree|conflict|contradict|wrong|unverified/i)).not.toBeInTheDocument();
  });

  it('does not render the marker on a non-conflicted signal', () => {
    render(
      <ObservationStrip
        signals={[{ ...baseSignal, value: 'Works with AWS', conflicted: false }]}
        isDemoMode={false} onCorrect={() => {}} onIgnore={() => {}} onAddContext={() => {}}
      />
    );
    expect(screen.getByText('Works with AWS')).toBeInTheDocument();
    expect(screen.queryByText(/sources disagree/i)).not.toBeInTheDocument();
  });
});
