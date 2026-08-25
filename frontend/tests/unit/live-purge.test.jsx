import { act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useSignals } from '../../src/hooks/useSignals.js';
import { makeObservedSignal } from '../../src/rendering/protocol.js';

// Same mapper as Chat.jsx's live-start swap (Task 2, Step 2) — kept in sync deliberately
// so this test exercises the real shape live sessions produce from `analysis.inferences`.
function mapInferencesToSignals(inferences) {
  return (inferences ?? []).map(inf => makeObservedSignal({
    value: inf.statement ?? inf.text ?? inf.value ?? '',
    domain: inf.domain ?? 'compliance',
    polarity: inf.polarity ?? 'gap',
    source: 'url_scrape',
    confidence: inf.confidence ?? 0.6,
  })).filter(s => s.value);
}

describe('live-purge: replaceSignals wholesale swap', () => {
  it('starts seeded with the non-empty MOCK_SIGNALS default', () => {
    const { result } = renderHook(() => useSignals());
    expect(result.current.signals.length).toBeGreaterThan(0);
  });

  it('replaceSignals([]) wipes the mock seed for a live session', () => {
    const { result } = renderHook(() => useSignals());
    expect(result.current.signals.length).toBeGreaterThan(0);

    act(() => { result.current.replaceSignals([]); });

    expect(result.current.signals).toEqual([]);
  });

  it('replaceSignals replaces wholesale, not additively', () => {
    const { result } = renderHook(() => useSignals());
    const seededCount = result.current.signals.length;
    const nextSignals = [makeObservedSignal({ value: 'one live signal', source: 'url_scrape' })];

    act(() => { result.current.replaceSignals(nextSignals); });

    expect(result.current.signals).toHaveLength(1);
    expect(result.current.signals).not.toHaveLength(seededCount + 1);
    expect(result.current.signals[0].value).toBe('one live signal');
  });

  it('replaceSignals(undefined) defaults to an empty array', () => {
    const { result } = renderHook(() => useSignals());

    act(() => { result.current.replaceSignals(undefined); });

    expect(result.current.signals).toEqual([]);
  });
});

describe('live-purge: analysis.inferences → live signals mapping (Chat.jsx Step 2 shape)', () => {
  it('maps a sample analysis.inferences array to url_scrape-sourced signals', () => {
    const inferences = [
      { statement: 'No SOC 2 detected', domain: 'compliance', polarity: 'gap', confidence: 0.9 },
      { text: 'MFA enforced org-wide', domain: 'security', polarity: 'capability' },
      { value: 'Uses AWS for infra', domain: 'security', polarity: 'capability', confidence: 0.75 },
    ];

    const mapped = mapInferencesToSignals(inferences);

    expect(mapped).toHaveLength(3);
    mapped.forEach(sig => expect(sig.source).toBe('url_scrape'));
    expect(mapped[0].value).toBe('No SOC 2 detected');
    expect(mapped[0].confidence).toBe(0.9);
    expect(mapped[1].value).toBe('MFA enforced org-wide');
    expect(mapped[1].confidence).toBe(0.6); // defensive default when inf.confidence is absent
    expect(mapped[2].value).toBe('Uses AWS for infra');
  });

  it('drops entries with no statement/text/value (empty-string signals filtered)', () => {
    const inferences = [
      { statement: 'Real finding' },
      { domain: 'compliance' }, // no statement/text/value at all
      { statement: '' }, // explicit empty string
    ];

    const mapped = mapInferencesToSignals(inferences);

    expect(mapped).toHaveLength(1);
    expect(mapped[0].value).toBe('Real finding');
  });

  it('defaults domain to compliance and polarity to gap when absent', () => {
    const mapped = mapInferencesToSignals([{ statement: 'Unlabeled finding' }]);

    expect(mapped[0].domain).toBe('compliance');
    expect(mapped[0].polarity).toBe('gap');
  });

  it('handles an empty/undefined inferences array', () => {
    expect(mapInferencesToSignals([])).toEqual([]);
    expect(mapInferencesToSignals(undefined)).toEqual([]);
  });
});
