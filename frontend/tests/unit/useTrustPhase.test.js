import { renderHook } from '@testing-library/react';
import { useTrustPhase } from '../../src/hooks/useTrustPhase.js';

describe('useTrustPhase', () => {
  it('returns t0 when inputReady is false', () => {
    const { result } = renderHook(() =>
      useTrustPhase({ phase: 'active', inputReady: false, userMessageCount: 0, companyData: null })
    );
    expect(result.current).toBe('t0');
  });

  it('returns t0 when phase is not active, even if inputReady is true', () => {
    const { result } = renderHook(() =>
      useTrustPhase({ phase: 'triage', inputReady: true, userMessageCount: 0, companyData: null })
    );
    expect(result.current).toBe('t0');
  });

  it('returns t05 when phase is active, inputReady is true, and no user messages', () => {
    const { result } = renderHook(() =>
      useTrustPhase({ phase: 'active', inputReady: true, userMessageCount: 0, companyData: null })
    );
    expect(result.current).toBe('t05');
  });

  it('returns t1 when user has submitted but companyData is null', () => {
    const { result } = renderHook(() =>
      useTrustPhase({ phase: 'active', inputReady: true, userMessageCount: 1, companyData: null })
    );
    expect(result.current).toBe('t1');
  });

  it('returns t2 when companyData arrives after first message', () => {
    const { result } = renderHook(() =>
      useTrustPhase({ phase: 'active', inputReady: true, userMessageCount: 1, companyData: { inferences: [] } })
    );
    expect(result.current).toBe('t2');
  });

  it('returns tn on subsequent messages with companyData', () => {
    const { result } = renderHook(() =>
      useTrustPhase({ phase: 'active', inputReady: true, userMessageCount: 3, companyData: { inferences: [] } })
    );
    expect(result.current).toBe('tn');
  });
});
