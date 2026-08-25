import { act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useSignals } from '../../src/hooks/useSignals.js';
import { makeObservedSignal } from '../../src/rendering/protocol.js';
import { inferencesToSignals } from '../../src/rendering/live-signals.js';

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

// Fixtures below are API-shaped: `/analyze` returns session.inferences items
// as { inference_id, label, confidence: 'confirmed'|'probable', category }
// (api/src/services/inference-builder.js). Exercising the real exported
// mapper (rendering/live-signals.js) against this shape — not a hand-rolled
// stand-in — is the point: it's the same function Chat.jsx imports.
describe('live-purge: analysis.inferences → live signals mapping (rendering/live-signals.js)', () => {
  it('maps API-shaped inferences to url_scrape-sourced signals', () => {
    const inferences = [
      { inference_id: 'inf_compliance', label: 'Pre-SOC 2', confidence: 'probable', category: 'governance' },
      { inference_id: 'inf_identity_model', label: 'SSO (Google, Okta, etc.)', confidence: 'confirmed', category: 'identity' },
      { inference_id: 'inf_infrastructure', label: 'Hosted on AWS', confidence: 'probable', category: 'infrastructure' },
    ];

    const mapped = inferencesToSignals(inferences);

    expect(mapped).toHaveLength(3);
    mapped.forEach(sig => expect(sig.source).toBe('url_scrape'));
    expect(mapped[0].value).toBe('Pre-SOC 2');
    expect(mapped[0].confidence).toBe(0.6); // probable → 0.6
    expect(mapped[0].domain).toBe('compliance'); // governance → compliance
    expect(mapped[1].value).toBe('SSO (Google, Okta, etc.)');
    expect(mapped[1].confidence).toBe(0.9); // confirmed → 0.9
    expect(mapped[1].domain).toBe('identity');
    expect(mapped[2].value).toBe('Hosted on AWS');
    expect(mapped[2].domain).toBe('security'); // infrastructure → security
  });

  it('drops entries with no label (empty-string signals filtered)', () => {
    const inferences = [
      { inference_id: 'inf_1', label: 'Real finding', confidence: 'confirmed', category: 'identity' },
      { inference_id: 'inf_2', category: 'governance', confidence: 'probable' }, // no label at all
      { inference_id: 'inf_3', label: '', confidence: 'probable', category: 'governance' }, // explicit empty string
    ];

    const mapped = inferencesToSignals(inferences);

    expect(mapped).toHaveLength(1);
    expect(mapped[0].value).toBe('Real finding');
  });

  it('unmapped categories default to the compliance domain', () => {
    const mapped = inferencesToSignals([
      { inference_id: 'inf_x', label: 'Targeting enterprise buyers', confidence: 'probable', category: 'market' },
    ]);

    expect(mapped[0].domain).toBe('compliance');
  });

  it('defaults confidence to 0.6 for an unrecognized confidence value', () => {
    const mapped = inferencesToSignals([
      { inference_id: 'inf_y', label: 'Unlabeled finding', category: 'governance' },
    ]);

    expect(mapped[0].confidence).toBe(0.6);
  });

  it('handles an empty/undefined inferences array', () => {
    expect(inferencesToSignals([])).toEqual([]);
    expect(inferencesToSignals(undefined)).toEqual([]);
  });
});

// Honesty wave (John walk findings 2026-08-25), item 1: a hosting conflict
// (probe vs extracted text) travels from the API's inference shape through to
// the chip/drawer shape unchanged, so the frontend can render the "sources
// disagree" marker without re-deriving anything.
describe('live-purge: conflict + probe-derived confidence passthrough (item 1)', () => {
  it('a conflicted inference carries conflicted:true and both witnesses through to the signal', () => {
    const mapped = inferencesToSignals([{
      inference_id: 'inf_infrastructure',
      label: 'Hosted on Oracle',
      confidence: 'observed',
      category: 'infrastructure',
      conflicted: true,
      conflict: { probe_says: 'Oracle', source_says: 'AWS' },
    }]);
    expect(mapped[0].conflicted).toBe(true);
    expect(mapped[0].conflict).toEqual({ probe_says: 'Oracle', source_says: 'AWS' });
    expect(mapped[0].source).toBe('live_probe');
  });

  it('a non-conflicted inference defaults to conflicted:false and conflict:null', () => {
    // Real shape (M6, review 2026-08-25): works_with inferences carry
    // category 'relationship', not 'infrastructure' — a vendor relationship
    // is a business fact, never a hosting/security claim.
    const mapped = inferencesToSignals([{
      inference_id: 'inf_x', label: 'Works with AWS', confidence: 'probable', category: 'relationship',
    }]);
    expect(mapped[0].conflicted).toBe(false);
    expect(mapped[0].conflict).toBeNull();
    expect(mapped[0].source).toBe('url_scrape');
    // relationship → financial (business-context bucket), never security.
    expect(mapped[0].domain).toBe('financial');
  });

  it('confidence "observed" (probe-derived) maps to a distinct number and live_probe source', () => {
    const mapped = inferencesToSignals([{
      inference_id: 'inf_infrastructure', label: 'Hosted on Oracle', confidence: 'observed', category: 'infrastructure',
    }]);
    expect(mapped[0].confidence).toBe(0.85);
    expect(mapped[0].source).toBe('live_probe');
  });
});

// Honesty wave item 3(b): bare-boolean/empty labels must never reach the chip
// strip, even as a belt-and-braces guard alongside the API-side filter.
describe('live-purge: bare-boolean/empty label guard (item 3)', () => {
  it('drops an inference whose label is the literal boolean true', () => {
    const mapped = inferencesToSignals([
      { inference_id: 'inf_bad', label: true, confidence: 'probable', category: 'governance' },
      { inference_id: 'inf_ok', label: 'Uses AI', confidence: 'probable', category: 'product' },
    ]);
    expect(mapped).toHaveLength(1);
    expect(mapped[0].value).toBe('Uses AI');
  });

  it('drops an inference with a whitespace-only label', () => {
    const mapped = inferencesToSignals([
      { inference_id: 'inf_blank', label: '   ', confidence: 'probable', category: 'governance' },
    ]);
    expect(mapped).toHaveLength(0);
  });
});
