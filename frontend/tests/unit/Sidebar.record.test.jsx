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
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
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

  it('opens the full record', () => {
    const { container } = draw({ record: { confirmed: 4, total: 6 } });
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/record');
  });

  it('keeps its invitation while the record is genuinely empty', () => {
    const { container } = draw({ record: { confirmed: 0, total: 0 } });
    expect(container.textContent).toMatch(/builds as we learn about you/i);
  });

  it('does not offer a door to a record that does not exist yet', () => {
    const { container } = draw({ record: { confirmed: 0, total: 0 } });
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).not.toContain('/record');
  });

  it('still renders for callers that pass no record at all', () => {
    const { container } = draw();
    expect(container.textContent).toContain('Cognisys');
  });
});
