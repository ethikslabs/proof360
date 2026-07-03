import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock the API client the hook depends on.
vi.mock('../../src/api/client.js', () => ({
  getCers: vi.fn(async () => ({ cers: [] })),
  createCer: vi.fn(async ({ route }) => ({ cer: { cer_id: 'new-cer', route, status: 'Submitted', consent_state: 'granted', evidence_refs: [] } })),
  withdrawCerConsent: vi.fn(async () => ({ cer: { cer_id: 'new-cer', consent_state: 'withdrawn', status: 'Closed' } })),
}));

import { getCers, createCer, withdrawCerConsent } from '../../src/api/client.js';
import { useCer } from '../../src/hooks/useCer.js';

const CTX = { companyName: 'Acme Robotics', contactName: 'Dana O.', evidenceRefs: ['e1'] };

beforeEach(() => vi.clearAllMocks());

describe('useCer', () => {
  it('proposes a route (unconfirmed) — not agency-ready until confirmed', async () => {
    const { result } = renderHook(() => useCer(CTX));
    await waitFor(() => expect(getCers).toHaveBeenCalled());

    act(() => result.current.proposeRoute('ingram_micro_aws', { need: 'cloud spend' }));
    expect(result.current.forming.route).toBe('ingram_micro_aws');
    expect(result.current.forming.routeConfirmed).toBe(false);
    expect(result.current.agencyReady).toBe(false);

    act(() => result.current.confirmRoute());
    expect(result.current.agencyReady).toBe(true);
  });

  it('proposeRoute does not clobber an already-forming CER', () => {
    const { result } = renderHook(() => useCer(CTX));
    act(() => result.current.startRoute('vanta'));
    act(() => result.current.proposeRoute('ingram_micro_aws'));
    expect(result.current.forming.route).toBe('vanta'); // kept
  });

  it('startRoute confirms immediately and is agency-ready', () => {
    const { result } = renderHook(() => useCer(CTX));
    act(() => result.current.startRoute('vanta'));
    expect(result.current.forming.routeConfirmed).toBe(true);
    expect(result.current.agencyReady).toBe(true);
  });

  it('confirmCer creates the CER, clears forming, and refreshes the list', async () => {
    getCers
      .mockResolvedValueOnce({ cers: [] }) // initial
      .mockResolvedValueOnce({ cers: [{ cer_id: 'new-cer', route: 'ingram_micro_aws', status: 'Submitted', consent_state: 'granted' }] }); // after create

    const { result } = renderHook(() => useCer(CTX));
    act(() => result.current.startRoute('ingram_micro_aws'));

    await act(async () => { await result.current.confirmCer(); });

    expect(createCer).toHaveBeenCalledWith({ route: 'ingram_micro_aws', evidence_refs: ['e1'] });
    expect(result.current.forming).toBeNull();
    expect(result.current.createdCers).toHaveLength(1);
  });

  it('withdrawCer calls the endpoint and refreshes', async () => {
    const { result } = renderHook(() => useCer(CTX));
    await act(async () => { await result.current.withdrawCer('new-cer'); });
    expect(withdrawCerConsent).toHaveBeenCalledWith('new-cer', {});
  });
});

describe('useCer awaitingField', () => {
  it('awaitField sets it and clearAwaiting resets it', () => {
    const { result } = renderHook(() => useCer(CTX));
    act(() => result.current.awaitField('company'));
    expect(result.current.awaitingField).toBe('company');
    act(() => result.current.clearAwaiting());
    expect(result.current.awaitingField).toBeNull();
  });

  it('dismissForming clears an awaiting field', () => {
    const { result } = renderHook(() => useCer(CTX));
    act(() => result.current.startRoute('vanta'));
    act(() => result.current.awaitField('company'));
    act(() => result.current.dismissForming());
    expect(result.current.awaitingField).toBeNull();
  });
});
