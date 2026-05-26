import { useState, useCallback } from 'react';
import { makeObservedSignal } from '../rendering/protocol.js';
import { MOCK_SIGNALS } from '../data/mock/signals.js';

export function useSignals(initialSignals = MOCK_SIGNALS) {
  const [signals, setSignals] = useState(initialSignals);
  // domain_turns: how many user messages touched each domain
  const [domainTurns, setDomainTurns] = useState({});
  // signals being regenerated (for soft-transition UX)
  const [regeneratingDomains, setRegeneratingDomains] = useState(new Set());

  // Call after each user message to track domain engagement
  const recordDomainTurn = useCallback((domains) => {
    setDomainTurns(prev => {
      const next = { ...prev };
      domains.forEach(d => { next[d] = (next[d] || 0) + 1; });
      return next;
    });
  }, []);

  // CTA is earned when user has sent ≥1 message in that domain
  const ctaEarned = useCallback((domain) => {
    return (domainTurns[domain] || 0) >= 1;
  }, [domainTurns]);

  const addSignal = useCallback((overrides) => {
    const sig = makeObservedSignal(overrides);
    setSignals(prev => [...prev, sig]);
    return sig;
  }, []);

  // User says signal is wrong — confidence → 0, triggers soft regeneration
  const correctSignal = useCallback((signalId) => {
    setSignals(prev => prev.map(s =>
      s.id === signalId ? { ...s, confidence: 0, _corrected: true } : s
    ));
    // Mark the domain as regenerating for soft-transition UX
    const sig = signals.find(s => s.id === signalId);
    if (sig) {
      setRegeneratingDomains(prev => new Set([...prev, sig.domain]));
      setTimeout(() => {
        setRegeneratingDomains(prev => { const n = new Set(prev); n.delete(sig.domain); return n; });
      }, 1800);
    }
  }, [signals]);

  // User ignores signal — weight → 0 but signal stays
  const ignoreSignal = useCallback((signalId) => {
    setSignals(prev => prev.map(s =>
      s.id === signalId ? { ...s, _ignored: true } : s
    ));
  }, []);

  // User adds context — becomes a self_disclosed signal with high confidence
  const addContextSignal = useCallback((forSignalId, contextText, domain) => {
    const sig = makeObservedSignal({
      type: 'self_disclosed',
      polarity: 'capability',
      domain,
      value: contextText,
      source: 'self_disclosed',
      confidence: 0.97,
      disprovable_by: 'User can update or remove this context at any time',
    });
    setSignals(prev => [...prev, sig]);
    // Also mark the original signal as superseded
    setSignals(prev => prev.map(s =>
      s.id === forSignalId ? { ...s, _superseded: true } : s
    ));
  }, []);

  // Active signals: not corrected, not ignored, not superseded
  const activeSignals = signals.filter(s => !s._corrected && !s._ignored && !s._superseded);

  // Signals that drive vendor ranking (active, polarity=gap)
  const gapSignals = activeSignals.filter(s => s.polarity === 'gap');
  const capabilitySignals = activeSignals.filter(s => s.polarity === 'capability');

  return {
    signals,
    activeSignals,
    gapSignals,
    capabilitySignals,
    domainTurns,
    regeneratingDomains,
    recordDomainTurn,
    ctaEarned,
    addSignal,
    correctSignal,
    ignoreSignal,
    addContextSignal,
  };
}
