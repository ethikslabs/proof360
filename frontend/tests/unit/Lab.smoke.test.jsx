import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the API client the CER spine depends on.
vi.mock('../../src/api/client.js', () => ({
  getCers: vi.fn(async () => ({ cers: [] })),
  createCer: vi.fn(async ({ route }) => ({ cer: { cer_id: 'lab-cer', route, status: 'Submitted', consent_state: 'granted', evidence_refs: [] } })),
  withdrawCerConsent: vi.fn(async () => ({})),
}));

import { getCers, createCer } from '../../src/api/client.js';
import Lab from '../../src/pages/Lab.jsx';

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

const demoMode = () => vi.stubEnv('VITE_DEMO_FOUNDER_MODE', 'true');

describe('Lab — CER consent gate (CER-CONSENT-GATES-001)', () => {
  // Persisting a CER grants consent server-side, so a one-click Move must never create
  // a partner-shareable Decision on its own. The click opens the SAME agency/consent
  // card the chat flow uses; only its explicit Confirm (checkbox ticked) persists.
  it('a routed Move click does NOT create a CER — the agency card gates it', async () => {
    demoMode();
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
    demoMode();
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
    demoMode();
    render(<Lab />);

    const free = screen.getByRole('button', { name: /use the template/i });
    expect(free).not.toBeDisabled(); // regression: null===null busy-lock
    fireEvent.click(free);

    expect(screen.getByRole('button', { name: /template opened/i })).toBeDisabled();
    expect(createCer).not.toHaveBeenCalled();
  });
});

describe('Lab — reference-lab trust boundary (non-demo builds)', () => {
  // This is Hive & Co's REFERENCE lab. A real (non-demo) build must never write its
  // Moves to a signed-in founder's own record — no consent card, no createCer, just an
  // honest pointer to starting their own lab.
  it('a routed Move never persists outside demo mode', async () => {
    render(<Lab />); // VITE_DEMO_FOUNDER_MODE unset

    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    expect(await screen.findByText(/reference lab — moves here are a walkthrough/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm & create pathway/i })).toBeNull();
    expect(createCer).not.toHaveBeenCalled();
    // Two pointers now: the standing topbar CTA + the notice's own link.
    expect(screen.getAllByRole('link', { name: /start your own lab/i })).toHaveLength(2);
  });
});

describe('Lab — Move state survives reload', () => {
  // A route with a live CER already on record renders done — a returning founder
  // cannot post a duplicate Decision for the same pathway.
  it('seeds done-state from existing CERs', async () => {
    demoMode();
    getCers.mockResolvedValue({ cers: [{ cer_id: 'prior', route: 'ingram_micro_aws', status: 'Submitted', consent_state: 'granted', evidence_refs: [] }] });
    render(<Lab />);

    const done = await screen.findByRole('button', { name: /aws pathway open/i });
    expect(done).toBeDisabled();
    fireEvent.click(done);
    expect(createCer).not.toHaveBeenCalled();
  });

  it('a withdrawn CER does not lock the Move', async () => {
    demoMode();
    getCers.mockResolvedValue({ cers: [{ cer_id: 'prior', route: 'ingram_micro_aws', status: 'Closed', consent_state: 'withdrawn', evidence_refs: [] }] });
    render(<Lab />);

    await waitFor(() => expect(getCers).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /apply/i })).not.toBeDisabled();
  });
});
