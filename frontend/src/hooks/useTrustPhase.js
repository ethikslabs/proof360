import { useMemo } from 'react';

export function useTrustPhase({ phase, inputReady, userMessageCount, companyData }) {
  return useMemo(() => {
    if (!inputReady || phase !== 'active') return 't0';
    if (userMessageCount === 0) return 't05';
    if (companyData === null) return 't1';
    if (userMessageCount <= 1) return 't2';
    return 'tn';
  }, [phase, inputReady, userMessageCount, companyData]);
}
