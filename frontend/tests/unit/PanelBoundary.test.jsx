// A projection took the whole application down.
//
// One object in one text slot threw React #31, the app-level ErrorBoundary
// caught it, and John's entire chat — the read, the personas, the record, the
// conversation he was mid-way through — was replaced by a black RENDER ERROR
// screen with a "Back to home" button (2026-08-26). The shape bug is fixed, but
// the blast radius is the real defect: an overlay is a leaf, and a leaf must not
// be able to destroy the room it opened over.
//
// The conversation is the thing the founder cannot afford to lose. Anything that
// flies in over it gets its own boundary: the sheet fails, says so plainly, and
// closes back to a conversation that is still there.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { PanelBoundary } from '../../src/components/chat/PanelBoundary.jsx';

function Exploder() {
  throw new Error('Objects are not valid as a React child');
}

afterEach(() => vi.restoreAllMocks());

describe('PanelBoundary — the overlay fails alone', () => {
  it('contains the crash instead of letting it reach the app', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<PanelBoundary onClose={() => {}}><Exploder /></PanelBoundary>)).not.toThrow();
  });

  it('says what happened in human words, and does not blame the founder', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<PanelBoundary onClose={() => {}}><Exploder /></PanelBoundary>);
    expect(container.textContent).toMatch(/couldn't (open|render)|on us/i);
    expect(container.textContent).toMatch(/conversation is still|nothing.*lost/i);
  });

  it('offers the way back to the conversation', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    const { getByRole } = render(<PanelBoundary onClose={onClose}><Exploder /></PanelBoundary>);
    fireEvent.click(getByRole('button', { name: /back to the conversation/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('is invisible when nothing is wrong', () => {
    const { container } = render(<PanelBoundary onClose={() => {}}><div>the projection</div></PanelBoundary>);
    expect(container.textContent).toBe('the projection');
  });
});
