import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the API client the CER spine depends on.
vi.mock('../../src/api/client.js', () => ({
  getCers: vi.fn(async () => ({ cers: [] })),
  createCer: vi.fn(async ({ route }) => ({ cer: { cer_id: 'lab-cer', route, status: 'Submitted', consent_state: 'granted', evidence_refs: [] } })),
  withdrawCerConsent: vi.fn(async () => ({})),
}));

import { createCer } from '../../src/api/client.js';
import Lab from '../../src/pages/Lab.jsx';

beforeEach(() => vi.clearAllMocks());

describe('Lab — CER consent gate (CER-CONSENT-GATES-001)', () => {
  // Persisting a CER grants consent server-side, so a one-click Move must never create
  // a partner-shareable Decision on its own. The click opens the SAME agency/consent
  // card the chat flow uses; only its explicit Confirm (checkbox ticked) persists.
  it('a routed Move click does NOT create a CER — the agency card gates it', async () => {
    render(<Lab />);

    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    // Consent review docked, nothing persisted yet.
    const confirm = await screen.findByRole('button', { name: /confirm & create pathway/i });
    expect(createCer).not.toHaveBeenCalled();
    expect(confirm).toBeDisabled(); // consent checkbox unticked

    fireEvent.click(confirm);
    expect(createCer).not.toHaveBeenCalled(); // still gated

    fireEvent.click(screen.getByRole('checkbox'));
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);

    await waitFor(() => expect(createCer).toHaveBeenCalledTimes(1));
    expect(createCer).toHaveBeenCalledWith(expect.objectContaining({ route: 'ingram_micro_aws' }));
    expect(await screen.findByRole('button', { name: /aws pathway open/i })).toBeDisabled();
  });

  it('Edit dismisses the consent card without persisting', async () => {
    render(<Lab />);

    fireEvent.click(screen.getByRole('button', { name: /get covered/i }));
    await screen.findByRole('button', { name: /confirm & create pathway/i });

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /confirm & create pathway/i })).toBeNull()
    );
    expect(createCer).not.toHaveBeenCalled();
    // Move returns to its resting CTA, re-runnable.
    expect(screen.getByRole('button', { name: /get covered/i })).not.toBeDisabled();
  });

  it('the free (no-route) Move is clickable at rest and completes without a CER', () => {
    render(<Lab />);

    const free = screen.getByRole('button', { name: /use the template/i });
    expect(free).not.toBeDisabled(); // regression: null===null busy-lock
    fireEvent.click(free);

    expect(screen.getByRole('button', { name: /template opened/i })).toBeDisabled();
    expect(createCer).not.toHaveBeenCalled();
  });
});
