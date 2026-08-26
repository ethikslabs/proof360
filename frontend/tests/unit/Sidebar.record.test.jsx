// "That could be what exists on the left now — that fills as we confirm?"
// — John, 2026-08-26.
//
// The card was already there, saying the right kind of thing: a company name, a
// fraction, and "Chat to fill this in — it builds as we learn about you." The
// trouble was that it was counting something else entirely. `litCount` folds
// `litTiles` — the six SPACES surfaces — which nothing in the live record ever
// lights. So with six claims confirmed and sitting in the panel, the card read
// COGNISYS 0/6, and the promise on its face ("it builds as we learn about you")
// was the one thing on screen that wasn't true.
//
// It now counts the record, and it is the door to the record's own page.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../../src/components/chat/Sidebar.jsx';

const base = {
  collapsed: false, onToggleCollapse: () => {}, activeSpace: null, onSwitch: () => {},
  litTiles: {}, browserTabs: [], onInject: () => {}, onHiveStageChange: () => {},
  yourCompanyName: 'Cognisys', cers: [], onSignIn: () => {},
  t: { theme: 'pearl', headingFamily: 'serif' },
};

const draw = (props = {}) => render(
  <MemoryRouter><Sidebar {...base} {...props} /></MemoryRouter>
);

describe('Sidebar — the company card is the record', () => {
  it('fills as claims are confirmed, instead of counting surfaces nothing lights', () => {
    const { container } = draw({ record: { confirmed: 4, total: 6 } });
    expect(container.textContent).toContain('4/6');
  });

  // This asserted an href to /record until the full-page version proved wrong:
  // navigating away remounted Chat, which restores no transcript, so "back to the
  // conversation" booted a fresh proof360 and the conversation was gone (John,
  // 2026-08-26). The record now opens OVER the chat like every other projection.
  it('opens the record over the conversation, never navigating away from it', () => {
    const onSwitch = vi.fn();
    const { getByRole } = draw({ record: { confirmed: 4, total: 6 }, onSwitch });
    fireEvent.click(getByRole('button', { name: /open the full record/i }));
    expect(onSwitch).toHaveBeenCalledWith('kept', { company: 'yours' });
  });

  it('keeps its invitation while the record is genuinely empty', () => {
    const { container } = draw({ record: { confirmed: 0, total: 0 } });
    expect(container.textContent).toMatch(/builds as we learn about you/i);
  });

  it('does not offer a door to a record that does not exist yet', () => {
    const { queryByRole } = draw({ record: { confirmed: 0, total: 0 } });
    expect(queryByRole('button', { name: /open the full record/i })).toBeNull();
  });

  it('still renders for callers that pass no record at all', () => {
    const { container } = draw();
    expect(container.textContent).toContain('Cognisys');
  });
});
