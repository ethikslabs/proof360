// frontend/tests/unit/CompanionPanel.smoke.test.jsx
// SPEC-012 §0: the panel is a projection, not a destination — no state of its own
// beyond open/closed; the record count is derived from props on every render.
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompanionPanel } from '../../src/components/chat/CompanionPanel.jsx';

const item = {
  id: 'cer-1', name: 'Vanta', category: 'compliance', synthesis: 'why', timing: 'now',
  context: { at: '2026-08-24T02:00:00.000Z', note: 'Added while discussing SOC 2', note_status: 'inferred' },
  provenance: { added_at: '2026-08-24T02:00:00.000Z' },
};

describe('CompanionPanel', () => {
  it('renders the record count from props (moves + claims), speaking human — not "record/entries"', () => {
    render(<CompanionPanel items={[item]} claims={[{ claim_id: 'c1' }, { claim_id: 'c2' }]}
      isDemoMode={false} onShortlist={() => {}} onDefer={() => {}} />);
    // Cold-human test (John live-walk feedback 2026-08-25): no company name was passed,
    // so it falls back to a neutral "your story so far" label rather than "Your record".
    expect(screen.getByText(/Your story so far · 3 noted/)).toBeTruthy();
    expect(screen.queryByText(/entries/i)).toBeNull();
    expect(screen.getByText('Vanta')).toBeTruthy();
  });

  it('uses the company name in the label when one is passed', () => {
    render(<CompanionPanel items={[item]} claims={[]} isDemoMode={false}
      onShortlist={() => {}} onDefer={() => {}} companyName="Acme" />);
    expect(screen.getByText(/Acme · 1 noted/)).toBeTruthy();
  });

  it('collapses to a chip and reopens', () => {
    render(<CompanionPanel items={[item]} claims={[]} isDemoMode={false}
      onShortlist={() => {}} onDefer={() => {}} />);
    fireEvent.click(screen.getByLabelText('Collapse story panel'));
    expect(screen.queryByText('Vanta')).toBeNull();
    fireEvent.click(screen.getByLabelText('Open story panel'));
    expect(screen.getByText('Vanta')).toBeTruthy();
  });

  it('marks demo mode per the demo/workspace boundary (INVARIANTS §4)', () => {
    render(<CompanionPanel items={[item]} claims={[]} isDemoMode={true}
      onShortlist={() => {}} onDefer={() => {}} />);
    expect(screen.getByText(/Example company/)).toBeTruthy();
  });

  it('renders nothing at all when the record is empty', () => {
    const { container } = render(<CompanionPanel items={[]} claims={[]} isDemoMode={false}
      onShortlist={() => {}} onDefer={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  // This used to assert a second count inside the body — "2 things we've noted so
  // far" — written when the panel held claims and nothing else. Once it also
  // carried the shortlist and the pathway, that line said 6 while the header two
  // rows above said 12: both counting honestly, both counting different things,
  // and a person reading one screen sees a bug (John's screenshots, 2026-08-26).
  // The header keeps the count. The panel keeps a door to the page that can hold
  // the whole record.
  it('counts the record once, and offers the way through to all of it', () => {
    const { container } = render(<CompanionPanel items={[]} claims={[{ claim_id: 'c1' }, { claim_id: 'c2' }]}
      isDemoMode={false} onShortlist={() => {}} onDefer={() => {}} />);
    expect(container.textContent).toMatch(/2 noted/);
    expect(container.textContent).not.toMatch(/things we've noted so far/);
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/record');
  });
});

// Demo boundary on the collapsed chip (review I-1, 2026-08-25): a demo company's
// name must never float unmarked.
import { render as render2, screen as screen2 } from '@testing-library/react';
describe('CompanionPanel collapsed demo boundary', () => {
  it('collapsed chip carries Example marker in demo mode with a company name', () => {
    const { container } = render2(
      <CompanionPanel items={[{ id: 'x', vendor: 'Vanta' }]} claims={[]} isDemoMode={true}
        companyName="Hive & Co" onShortlist={() => {}} onDefer={() => {}} />
    );
    const collapse = screen2.getByLabelText('Collapse story panel');
    collapse.click();
    expect(container.textContent).toContain('Example ·');
  });
});
