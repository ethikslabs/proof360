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

  it('renders a claims strip when only claims exist (no items yet), speaking human', () => {
    render(<CompanionPanel items={[]} claims={[{ claim_id: 'c1' }, { claim_id: 'c2' }]}
      isDemoMode={false} onShortlist={() => {}} onDefer={() => {}} />);
    // No per-claim tap handler exists yet, so the honest copy is "so far", not
    // a tap invite (John live-walk feedback 2026-08-25).
    expect(screen.getByText(/2 things we've noted so far/)).toBeTruthy();
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
