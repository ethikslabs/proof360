// Honesty wave item 1 (John walk findings 2026-08-25): a conflicted signal
// chip renders with a distinct marker ("⚡ sources disagree") right in the
// strip, before the founder even opens the evidence drawer.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ObservationStrip } from '../../src/components/chat/ObservationStrip.jsx';

const baseSignal = {
  id: 'sig-1', polarity: 'capability', source: 'live_probe', confidence: 0.85,
  domain: 'security', conversation_turn: 1,
};

describe('ObservationStrip — conflicted chip marker', () => {
  it('renders the "sources disagree" marker on a conflicted signal', () => {
    render(
      <ObservationStrip
        signals={[{ ...baseSignal, value: 'Hosted on Oracle', conflicted: true, conflict: { probe_says: 'Oracle', source_says: 'AWS' } }]}
        isDemoMode={false} onCorrect={() => {}} onIgnore={() => {}} onAddContext={() => {}}
      />
    );
    expect(screen.getByText('Hosted on Oracle')).toBeInTheDocument();
    expect(screen.getByText(/sources disagree/i)).toBeInTheDocument();
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
