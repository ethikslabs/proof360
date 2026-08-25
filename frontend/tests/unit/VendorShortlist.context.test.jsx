// frontend/tests/unit/VendorShortlist.context.test.jsx
// INVARIANTS §3: the shortlist is reasoning provenance — "why this mattered at the
// moment you saw it", with inferred honestly labelled.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VendorShortlist } from '../../src/components/chat/VendorShortlist.jsx';

const move = {
  id: 'cer-1',
  name: 'Vanta',
  category: 'compliance',
  synthesis: 'Closes the SOC 2 gap',
  timing: 'now',
  context: {
    at: '2026-08-24T02:00:00.000Z',
    note: 'Added while discussing "HIPAA for hospitals in Uganda"',
    note_status: 'inferred',
  },
  provenance: { added_at: '2026-08-24T02:00:00.000Z' },
};

describe('VendorShortlist context line', () => {
  it('renders the derived note with an INFERRED pill', () => {
    render(<VendorShortlist vendors={[move]} shortlistedIds={[move]} onShortlist={() => {}} />);
    expect(screen.getByText(/HIPAA for hospitals in Uganda/)).toBeTruthy();
    expect(screen.getByText('INFERRED')).toBeTruthy();
  });

  it('renders nothing extra when a move has no context', () => {
    const bare = { ...move, id: 'cer-2', name: 'Duo', context: null };
    render(<VendorShortlist vendors={[bare]} shortlistedIds={[bare]} onShortlist={() => {}} />);
    expect(screen.queryByText('INFERRED')).toBeNull();
  });
});
