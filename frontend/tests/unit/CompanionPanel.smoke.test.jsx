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
  it('renders the record count from props (moves + claims)', () => {
    render(<CompanionPanel items={[item]} claims={[{ claim_id: 'c1' }, { claim_id: 'c2' }]}
      isDemoMode={false} onShortlist={() => {}} onDefer={() => {}} />);
    expect(screen.getByText(/Your record · 3 entries/)).toBeTruthy();
    expect(screen.getByText('Vanta')).toBeTruthy();
  });

  it('collapses to a chip and reopens', () => {
    render(<CompanionPanel items={[item]} claims={[]} isDemoMode={false}
      onShortlist={() => {}} onDefer={() => {}} />);
    fireEvent.click(screen.getByLabelText('Collapse record panel'));
    expect(screen.queryByText('Vanta')).toBeNull();
    fireEvent.click(screen.getByLabelText('Open record panel'));
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
});
