// frontend/tests/unit/SignalEvidenceDrawer.portal.test.jsx
// John live-walk feedback (2026-08-25) item 3: clicking an ObservationStrip chip opened
// a drawer that rendered clipped/behind the pinned composer. Root cause: the drawer's
// caller (ObservationStrip) lives inside the scrollable message list, which sets its own
// zIndex as a flex item — that establishes a local stacking context that caps any
// position:fixed descendant's paint order, no matter how high its own z-index is set.
// Fix: portal the drawer straight to document.body so it escapes the ancestor stacking
// chain entirely, the same pattern React recommends for modals/sheets.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SignalEvidenceDrawer } from '../../src/components/chat/SignalEvidenceDrawer.jsx';

const signal = {
  id: 'sig-1', value: 'Software product', polarity: 'capability',
  source: 'url_scrape', confidence: 0.6, domain: 'compliance', conversation_turn: 1,
};

describe('SignalEvidenceDrawer', () => {
  it('portals its content to document.body, not the caller-supplied container', () => {
    // A stand-in for ObservationStrip's ancestor: a container with its own zIndex,
    // the exact shape that caps position:fixed descendants in the live bug.
    const { container } = render(
      <div style={{ position: 'relative', zIndex: 2 }}>
        <SignalEvidenceDrawer signal={signal} onClose={() => {}} onCorrect={() => {}} onIgnore={() => {}} onAddContext={() => {}} />
      </div>
    );

    // Not rendered inside the local container...
    expect(container.textContent).not.toContain('Software product');
    // ...but is findable on the page, parented directly under <body>.
    const chip = screen.getByText('Software product');
    expect(document.body.contains(chip)).toBe(true);
    expect(container.contains(chip)).toBe(false);
  });

  it('still renders the correction actions', () => {
    render(<SignalEvidenceDrawer signal={signal} onClose={() => {}} onCorrect={() => {}} onIgnore={() => {}} onAddContext={() => {}} />);
    expect(screen.getByText('Wrong?')).toBeInTheDocument();
    expect(screen.getByText('Ignore')).toBeInTheDocument();
    expect(screen.getByText('Add context')).toBeInTheDocument();
  });
});
