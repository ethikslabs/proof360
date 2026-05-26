# DESIGN-004 Implementation Plan — Contextual Guidance Rendering

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the three-content-class rendering model (CanonicalClaim / ObservedSignal / GuidanceBlock) across the proof360 chat UI — signal chips, evidence drawer with correction loop, vendor ranking by signals, demo boundary label, and domain-gated CTAs.

**Architecture:** A new `useSignals` hook owns all session signal state and exposes correction actions. `ObservationStrip` renders signal chips above the chat. `SignalEvidenceDrawer` is the per-signal reasoning ledger. `DiscoveryView` (inside `CompanyProfile`) ranks vendors by signal count and shows always-visible reason lines. All text surfaces remain in their existing components — this plan adds the provenance layer underneath them, not new UI chrome.

**Tech Stack:** React 18 / Vite · No test suite — verify by running `npm run dev` and checking in browser · Lint: `npm run lint` · Deploy: `git push origin main` triggers GitHub Actions → EC2

**Spec:** `proof360/docs/specs/2026-05-27-contextual-guidance-rendering.md`

**Temporal narrative UI** (delta surface on return sessions, AC-12) is deferred to DESIGN-004-B. The SessionSnapshot data model (AC-11) is in scope — it is a `beforeunload` write to `sessionStorage` and is required by the spec even if the render surface is deferred.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `frontend/src/rendering/protocol.js` | Type factories and scoring logic for all three content classes |
| Create | `frontend/src/data/mock/signals.js` | Mock ObservedSignals in new schema — gap + capability, both polarities |
| Create | `frontend/src/hooks/useSignals.js` | Session signal store: signals state, corrections, domain_turns |
| Create | `frontend/src/components/chat/ObservationStrip.jsx` | "Observed this session" row of signal chips above chat |
| Create | `frontend/src/components/chat/SignalEvidenceDrawer.jsx` | Sliding evidence drawer per signal — full reasoning ledger + correction loop |
| Modify | `frontend/src/data/mock/vendors.js` | Add `signal_ids[]` per vendor + `rankBySignals()` function |
| Modify | `frontend/src/components/chat/CompanyProfile.jsx` | Demo boundary label + accept ranked vendors + signal chips from hook |
| Modify | `frontend/src/pages/Chat.jsx` | Wire `useSignals` hook; pass `isDemoMode` + signals down to children |
| Modify | `frontend/src/components/chat/VendorShortlist.jsx` | Add provenance fields to shortlisted items |
| Create | `frontend/src/components/chat/GuidanceBlock.jsx` | Edison three-beat render: Observed → Why it matters → Next move |
| Modify | `frontend/src/pages/Chat.jsx` (AC-11) | Write `SessionSnapshot` to sessionStorage on session close |

---

## Task 1: Signal schema and rendering protocol

**Files:**
- Create: `frontend/src/rendering/protocol.js`

This file is the type system. Every other file imports from it. It defines the three content classes as factory functions, the confidence semantics, and the freshness decay calculation.

- [ ] **Step 1: Create the file**

```js
// frontend/src/rendering/protocol.js

// Confidence represents observation confidence — how certain we are this signal
// is currently true. It is NOT predictive confidence about recommendation outcomes.

export function makeObservedSignal(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type: 'unknown',
    polarity: 'gap',           // 'gap' | 'capability'
    domain: 'compliance',      // 'compliance' | 'security' | 'financial' | 'identity' | 'legal' | 'team'
    value: '',
    source: 'conversation',    // 'github_scan' | 'conversation' | 'url_scrape' | 'self_disclosed'
    confidence: 0.8,
    observed_at: now,
    last_verified: now,
    freshness_weight: 1.0,
    conversation_turn: 0,
    disprovable_by: '',
    ...overrides,
  };
}

export function makeCanonicalClaim(overrides = {}) {
  return {
    id: '',
    statement: '',
    domain: 'compliance',
    sources: [],
    confidence: 0.95,
    valid_from: null,
    valid_until: null,
    ...overrides,
  };
}

export function makeGuidanceBlock(overrides = {}) {
  return {
    claims: [],
    signals: [],
    persona: 'edison',
    synthesis: '',
    next_move: '',
    confidence: 0.8,
    generated_at: new Date().toISOString(),
    temporal_context: null,
    ...overrides,
  };
}

// Freshness decay: 1.0 → 0 over 14 days from last_verified.
// Self-disclosed signals never decay (they are current until corrected).
export function computeFreshnessWeight(signal) {
  if (signal.source === 'self_disclosed') return 1.0;
  const ageMs = Date.now() - new Date(signal.last_verified).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - ageDays / 14);
}

// Returns 'current' | 'stale'
export function signalFreshness(signal) {
  return computeFreshnessWeight(signal) >= 0.5 ? 'current' : 'stale';
}

// Format freshness label for the evidence drawer.
export function freshnessLabel(signal) {
  if (signalFreshness(signal) === 'current') {
    const t = new Date(signal.observed_at);
    return `Current · observed ${t.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} AEST`;
  }
  const d = new Date(signal.last_verified);
  return `Stale · last verified ${d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;
}
```

- [ ] **Step 2: Verify lint passes**

```bash
cd /Users/johncoates/Library/CloudStorage/Dropbox/Projects/proof360/frontend
npm run lint 2>&1 | head -20
```

Expected: exit 0 (or only pre-existing warnings, none from `rendering/protocol.js`)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/rendering/protocol.js
git commit -m "feat(rendering): signal schema + protocol factories — CanonicalClaim/ObservedSignal/GuidanceBlock"
git push origin main
```

---

## Task 2: Mock signals data

**Files:**
- Create: `frontend/src/data/mock/signals.js`

Mock ObservedSignals for the Hive & Code demo. Two polarities: gap (green chips) and capability (amber chips). These are what the ObservationStrip and CompanyProfile chips will render.

- [ ] **Step 1: Create the file**

```js
// frontend/src/data/mock/signals.js
import { makeObservedSignal } from '../../rendering/protocol.js';

const NOW = new Date().toISOString();
const TURN_0 = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 min ago

// Gap signals — deficiencies that drive vendor recommendations
export const MOCK_GAP_SIGNALS = [
  makeObservedSignal({
    id: 'no_soc2_detected',
    type: 'compliance_gap',
    polarity: 'gap',
    domain: 'compliance',
    value: 'No SOC 2 detected',
    source: 'github_scan',
    confidence: 0.82,
    observed_at: TURN_0,
    last_verified: TURN_0,
    conversation_turn: 0,
    disprovable_by: 'Link to existing SOC 2 certificate, SOC 2 report URL, or say "we have SOC 2 in progress"',
  }),
  makeObservedSignal({
    id: 'no_ir_controls',
    type: 'security_gap',
    polarity: 'gap',
    domain: 'security',
    value: 'No IR controls in repo',
    source: 'github_scan',
    confidence: 0.78,
    observed_at: TURN_0,
    last_verified: TURN_0,
    conversation_turn: 0,
    disprovable_by: 'Link to incident response policy doc or runbook',
  }),
  makeObservedSignal({
    id: 'au_healthcare_enterprise',
    type: 'market_context',
    polarity: 'gap',        // gap in the sense of "requirement gap for this market"
    domain: 'compliance',
    value: 'AU healthcare enterprise target',
    source: 'conversation',
    confidence: 0.95,
    observed_at: NOW,
    last_verified: NOW,
    conversation_turn: 1,
    disprovable_by: 'Clarify if healthcare is not your primary market',
  }),
];

// Capability signals — existing strengths
export const MOCK_CAPABILITY_SIGNALS = [
  makeObservedSignal({
    id: 'seed_stage',
    type: 'stage',
    polarity: 'capability',
    domain: 'financial',
    value: 'Seed stage — AU Pty Ltd',
    source: 'conversation',
    confidence: 0.95,
    observed_at: NOW,
    last_verified: NOW,
    conversation_turn: 0,
    disprovable_by: 'Clarify if company structure is different',
  }),
  makeObservedSignal({
    id: 'cloudflare_active',
    type: 'capability',
    polarity: 'capability',
    domain: 'security',
    value: 'Cloudflare active on domain',
    source: 'url_scrape',
    confidence: 0.91,
    observed_at: TURN_0,
    last_verified: TURN_0,
    conversation_turn: 0,
    disprovable_by: 'Domain scan — if you believe this is wrong, let us know',
  }),
];

export const MOCK_SIGNALS = [...MOCK_GAP_SIGNALS, ...MOCK_CAPABILITY_SIGNALS];
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/data/mock/signals.js
git commit -m "feat(signals): mock ObservedSignals — gap + capability polarities, new schema"
git push origin main
```

---

## Task 3: useSignals hook

**Files:**
- Create: `frontend/src/hooks/useSignals.js`

Central signal store for a session. Owns: signals array, user corrections, domain_turns counter. Exposes actions: addSignal, correctSignal, ignoreSignal, addContextSignal. This hook is session-scoped (no persistence — matches existing session-store behaviour).

- [ ] **Step 1: Create the file**

```js
// frontend/src/hooks/useSignals.js
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
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useSignals.js
git commit -m "feat(signals): useSignals hook — session signal store, corrections, domain_turns, CTA gating"
git push origin main
```

---

## Task 4: ObservationStrip component

**Files:**
- Create: `frontend/src/components/chat/ObservationStrip.jsx`

Renders the "Observed this session" chip row above the first chat exchange. Gap signals = green chips. Capability signals = amber chips. Clicking a chip opens the evidence drawer. Does not render in demo mode (demo signals show reduced opacity, no interaction).

- [ ] **Step 1: Create the file**

```jsx
// frontend/src/components/chat/ObservationStrip.jsx
import { useState } from 'react';
import { SignalEvidenceDrawer } from './SignalEvidenceDrawer.jsx';

export function ObservationStrip({ signals, isDemoMode, onCorrect, onIgnore, onAddContext, tk }) {
  const [activeSignal, setActiveSignal] = useState(null);

  if (!signals || signals.length === 0) return null;

  const gap  = signals.filter(s => s.polarity === 'gap');
  const caps = signals.filter(s => s.polarity === 'capability');

  function Chip({ signal }) {
    const isGap = signal.polarity === 'gap';
    return (
      <button
        onClick={() => !isDemoMode && setActiveSignal(signal)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: isGap ? '#dcfce7' : '#fef3c7',
          border: `1px solid ${isGap ? '#86efac' : '#fcd34d'}`,
          borderRadius: 4,
          padding: '2px 8px',
          fontSize: 10.5,
          fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
          color: isGap ? '#15803d' : '#92400e',
          fontWeight: 600,
          cursor: isDemoMode ? 'default' : 'pointer',
          opacity: isDemoMode ? 0.6 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        <span style={{ fontSize: 7 }}>◆</span>
        {signal.value}
      </button>
    );
  }

  return (
    <>
      <div style={{
        margin: '0 0 14px',
        padding: '10px 14px',
        background: '#f0fdf4',
        border: '1px solid #86efac44',
        borderRadius: 8,
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      }}>
        <div style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 8.5, fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: '#15803d',
          marginBottom: 7,
        }}>
          Observed this session
          {isDemoMode && (
            <span style={{ marginLeft: 8, color: '#a8651e', fontWeight: 400, fontStyle: 'italic', textTransform: 'none' }}>
              · example company
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {gap.map(s => <Chip key={s.id} signal={s} />)}
          {caps.map(s => <Chip key={s.id} signal={s} />)}
        </div>
        {!isDemoMode && (
          <div style={{ fontSize: 9, color: '#64748b', marginTop: 6 }}>
            Click any signal to see evidence and reasoning
          </div>
        )}
      </div>

      {activeSignal && (
        <SignalEvidenceDrawer
          signal={activeSignal}
          onClose={() => setActiveSignal(null)}
          onCorrect={(id) => { onCorrect(id); setActiveSignal(null); }}
          onIgnore={(id) => { onIgnore(id); setActiveSignal(null); }}
          onAddContext={(id, text, domain) => { onAddContext(id, text, domain); setActiveSignal(null); }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/chat/ObservationStrip.jsx
git commit -m "feat(ui): ObservationStrip — gap/capability signal chips, demo mode, evidence drawer trigger"
git push origin main
```

---

## Task 5: SignalEvidenceDrawer + correction loop

**Files:**
- Create: `frontend/src/components/chat/SignalEvidenceDrawer.jsx`

The reasoning ledger. Shows full signal provenance: source, observation confidence (labelled precisely), freshness, how inferred, what would disprove it, next action. Includes the three correction actions: Wrong, Ignore, Add context.

- [ ] **Step 1: Create the file**

```jsx
// frontend/src/components/chat/SignalEvidenceDrawer.jsx
import { useState } from 'react';
import { freshnessLabel, signalFreshness } from '../../rendering/protocol.js';

const SOURCE_LABELS = {
  github_scan: 'GitHub public repo scan',
  conversation: 'Conversation — what you told us',
  url_scrape:   'Website scan',
  self_disclosed: 'You told us directly',
};

export function SignalEvidenceDrawer({ signal, onClose, onCorrect, onIgnore, onAddContext }) {
  const [addingContext, setAddingContext] = useState(false);
  const [contextText, setContextText] = useState('');
  const isStale = signalFreshness(signal) === 'stale';
  const isGap = signal.polarity === 'gap';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(20,16,28,0.5)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fbf8f1',
          borderRadius: '14px 14px 0 0',
          width: 'min(560px, 100vw)',
          maxHeight: '80vh',
          overflowY: 'auto',
          padding: '22px 24px 28px',
          fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 3, background: '#e0d8c9', borderRadius: 2, margin: '0 auto 18px' }} />

        {/* Signal label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: isGap ? '#dcfce7' : '#fef3c7',
            border: `1px solid ${isGap ? '#86efac' : '#fcd34d'}`,
            borderRadius: 4, padding: '3px 10px',
            fontSize: 11, fontWeight: 700,
            color: isGap ? '#15803d' : '#92400e',
          }}>
            <span style={{ fontSize: 8 }}>◆</span>
            {signal.value}
          </span>
          {isStale && (
            <span style={{ fontSize: 10, color: '#b0956e', fontStyle: 'italic' }}>stale</span>
          )}
        </div>

        {/* Provenance fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '6px 12px', marginBottom: 16 }}>
          {[
            ['Source', SOURCE_LABELS[signal.source] || signal.source],
            ['Confidence', `${Math.round(signal.confidence * 100)}% (observation confidence — how certain we are this is true)`],
            ['Freshness', freshnessLabel(signal)],
            ['Domain', signal.domain],
            ['Observed', `Turn ${signal.conversation_turn}`],
          ].map(([label, value]) => (
            <>
              <span style={{ fontSize: 9.5, fontFamily: '"IBM Plex Mono", monospace', color: '#8c8499', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', alignSelf: 'start', paddingTop: 2 }}>
                {label}
              </span>
              <span style={{ fontSize: 12, color: '#241f31', lineHeight: 1.5 }}>{value}</span>
            </>
          ))}
        </div>

        {/* What would disprove this */}
        {signal.disprovable_by && (
          <div style={{ marginBottom: 16, padding: '10px 13px', background: '#f7f1e6', borderRadius: 8, border: '1px solid #e0d8c9' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8c8499', marginBottom: 5 }}>
              What would update this
            </div>
            <div style={{ fontSize: 12, color: '#5a5267', lineHeight: 1.55 }}>{signal.disprovable_by}</div>
          </div>
        )}

        {/* Add context input */}
        {addingContext ? (
          <div style={{ marginBottom: 14 }}>
            <textarea
              autoFocus
              value={contextText}
              onChange={e => setContextText(e.target.value)}
              placeholder="Tell us more — this becomes a high-confidence signal…"
              style={{
                width: '100%', minHeight: 72, padding: '10px 12px',
                border: '1px solid #e0d8c9', borderRadius: 8, resize: 'vertical',
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                fontSize: 13, color: '#241f31', background: '#fbf8f1',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => contextText.trim() && onAddContext(signal.id, contextText.trim(), signal.domain)}
                disabled={!contextText.trim()}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 7,
                  background: '#b0956e', border: 'none', color: '#fff',
                  fontSize: 12, fontWeight: 600, cursor: contextText.trim() ? 'pointer' : 'not-allowed',
                  opacity: contextText.trim() ? 1 : 0.5,
                }}
              >
                Save context
              </button>
              <button
                onClick={() => { setAddingContext(false); setContextText(''); }}
                style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #e0d8c9', background: 'none', fontSize: 12, color: '#8c8499', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Correction loop */
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onCorrect(signal.id)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 7,
                border: '1px solid #fca5a5', background: '#fff7f7',
                fontSize: 11, fontWeight: 600, color: '#b91c1c', cursor: 'pointer',
              }}
            >
              Wrong?
            </button>
            <button
              onClick={() => onIgnore(signal.id)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 7,
                border: '1px solid #e0d8c9', background: '#f7f1e6',
                fontSize: 11, fontWeight: 600, color: '#8c8499', cursor: 'pointer',
              }}
            >
              Ignore
            </button>
            <button
              onClick={() => setAddingContext(true)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 7,
                border: '1px solid #c4b8a8', background: '#fbf8f1',
                fontSize: 11, fontWeight: 600, color: '#5a5267', cursor: 'pointer',
              }}
            >
              Add context
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/chat/SignalEvidenceDrawer.jsx
git commit -m "feat(ui): SignalEvidenceDrawer — reasoning ledger, correction loop (Wrong/Ignore/Add context)"
git push origin main
```

---

## Task 6: Wire useSignals into Chat.jsx

**Files:**
- Modify: `frontend/src/pages/Chat.jsx`

Add `useSignals` hook alongside `useChatSession`. Pass signals + correction actions down to `ObservationStrip` and `CompanyProfile`. Derive `isDemoMode` from the active stage source. Render `ObservationStrip` in the chat area after the MorningBrief and before the first user message.

- [ ] **Step 1: Add import for useSignals and ObservationStrip**

At the top of `frontend/src/pages/Chat.jsx`, add:

```js
import { useSignals }        from '../hooks/useSignals.js';
import { ObservationStrip }  from '../components/chat/ObservationStrip.jsx';
```

- [ ] **Step 2: Instantiate useSignals inside the Chat component**

Find the block of `useState` declarations at the top of the `Chat` component function body (before the first event handler). `Chat.jsx` does NOT use a `useChatSession` hook — there is no such call. Add `useSignals` alongside the other state calls:

```js
const {
  activeSignals, gapSignals, capabilitySignals,
  regeneratingDomains, recordDomainTurn, ctaEarned,
  correctSignal, ignoreSignal, addContextSignal,
} = useSignals();
```

- [ ] **Step 3: Derive isDemoMode**

Find where `DEMO_STAGES` or `DEFAULT_STAGE_ID` is used. After the active stage is resolved, add:

```js
// isDemoMode is true when the active content comes from the demo dataset
const isDemoMode = activeStageId === DEFAULT_STAGE_ID || !hasMessages;
```

Adjust the condition to match how the stage is tracked in the component.

- [ ] **Step 4: Render ObservationStrip in the message area**

Find where `MorningBrief` is rendered in the chat scroll area. Insert `ObservationStrip` directly below it (it renders nothing if signals is empty):

```jsx
<ObservationStrip
  signals={activeSignals}
  isDemoMode={isDemoMode}
  onCorrect={correctSignal}
  onIgnore={ignoreSignal}
  onAddContext={addContextSignal}
  tk={tk}
/>
```

- [ ] **Step 5: Pass isDemoMode and ctaEarned to CompanyProfile**

Find the `<CompanyProfile ... />` render. Add:

```jsx
isDemoMode={isDemoMode}
ctaEarned={ctaEarned}
activeSignals={activeSignals}
```

- [ ] **Step 6: Start dev server and verify**

```bash
cd /Users/johncoates/Library/CloudStorage/Dropbox/Projects/proof360/frontend
npm run dev
```

Open http://localhost:5173/chat. Verify:
- ObservationStrip appears with signal chips
- Clicking a chip opens SignalEvidenceDrawer
- Wrong/Ignore/Add context buttons are present in drawer

- [ ] **Step 7: Lint**

```bash
npm run lint 2>&1 | head -20
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/Chat.jsx
git commit -m "feat(chat): wire useSignals — ObservationStrip wired, isDemoMode derived, signals passed to CompanyProfile"
git push origin main
```

---

## Task 7: CompanyProfile — demo label + signal chips

**Files:**
- Modify: `frontend/src/components/chat/CompanyProfile.jsx`

Add the amber demo boundary label when `isDemoMode` is true. Update the "Signals read" section to use signal chips from `activeSignals` instead of the plain text list, to match the new schema.

- [ ] **Step 1: Add isDemoMode + activeSignals to CompanyProfile props**

Update the component signature:

```jsx
export function CompanyProfile({ profile, isBuilding, hasMessages, tk, onAsk, focusedProgram, onVendorSelect, isDemoMode, activeSignals, ctaEarned }) {
```

- [ ] **Step 2: Add demo boundary label at the top of the panel**

Inside the component, immediately after the opening `<div>` wrapper and before the Header section, add:

```jsx
{isDemoMode && (
  <div style={{
    padding: '7px 16px',
    background: '#fef3c7',
    borderBottom: `1px solid #fcd34d`,
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 9, fontWeight: 700, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: '#92400e',
  }}>
    Example · Hive &amp; Code
  </div>
)}
```

- [ ] **Step 3: Replace the "Signals read" plain-text list with signal chips**

Find the `profile.signals.slice(-5).map(...)` block inside the signals section. Replace it with:

```jsx
{(activeSignals?.length > 0 ? activeSignals : profile.signals.map(s => ({ value: s, polarity: 'gap', id: s }))).slice(-5).map((sig, i) => {
  const isGap = sig.polarity === 'gap';
  return (
    <div key={sig.id || i} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'flex-start' }}>
      <span style={{ color: isGap ? '#15803d' : '#92400e', fontSize: 9, marginTop: 2, flexShrink: 0 }}>◆</span>
      <span style={{
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
        fontSize: 10.5, color: tk.inkSoft, lineHeight: 1.4,
      }}>{sig.value}</span>
    </div>
  );
})}
```

This is backwards-compatible: if `activeSignals` is not provided, it falls back to the existing `profile.signals` string array.

- [ ] **Step 4: Smoke test in browser**

With `npm run dev` still running, reload http://localhost:5173/chat. Verify:
- Amber "EXAMPLE · Hive & Code" label appears at top of right panel
- Signals section shows coloured diamond markers (green for gap, amber for capability)

- [ ] **Step 5: Lint + commit**

```bash
npm run lint 2>&1 | head -20
git add frontend/src/components/chat/CompanyProfile.jsx
git commit -m "feat(ui): CompanyProfile — demo boundary label, signal chips with polarity colouring"
git push origin main
```

---

## Task 8: Vendor ranking by signals + reason line

**Files:**
- Modify: `frontend/src/data/mock/vendors.js`
- Modify: `frontend/src/components/chat/CompanyProfile.jsx` (DiscoveryView)

Add `signal_ids[]` to each vendor in the mock data. Add `rankBySignals()` scoring function. Update `DiscoveryView` to accept ranked vendors and show a reason line under each vendor name.

- [ ] **Step 1: Update mock/vendors.js**

The file currently exports `getMockVendors()`. Replace the entire file contents:

```js
// frontend/src/data/mock/vendors.js

// signal_ids maps this vendor to signals that increase its relevance score.
// Each signal_id must match an ObservedSignal.id in data/mock/signals.js.
const VENDOR_CATALOG = [
  {
    id: 'v1', name: 'Vanta',
    category: 'compliance_evidence',
    timing: 'now',
    synthesis: 'SOC 2 — the cert that unlocks B2B deals',
    signal_ids: ['no_soc2_detected', 'no_ir_controls', 'au_healthcare_enterprise'],
    routeability: 'ethiks', regionFit: 'AU',
  },
  {
    id: 'v2', name: 'AWS',
    category: 'cloud',
    timing: 'now',
    synthesis: '$220k+ in credits — most founders claim a fraction',
    signal_ids: ['seed_stage'],
    routeability: 'self_serve', regionFit: 'Global',
  },
  {
    id: 'v3', name: 'Microsoft',
    category: 'cloud',
    timing: 'soon',
    synthesis: 'Sell into enterprise through the Microsoft channel',
    signal_ids: ['au_healthcare_enterprise', 'seed_stage'],
    routeability: 'partner', regionFit: 'Global',
  },
  {
    id: 'v4', name: 'Cisco',
    category: 'security',
    timing: 'soon',
    synthesis: 'Security stack enterprise buyers recognise on sight',
    signal_ids: ['no_ir_controls', 'au_healthcare_enterprise'],
    routeability: 'partner', regionFit: 'AU',
  },
  {
    id: 'v5', name: 'Cloudflare',
    category: 'security',
    timing: 'now',
    synthesis: 'Edge security — already active on your domain',
    signal_ids: ['cloudflare_active'],
    routeability: 'self_serve', regionFit: 'Global',
  },
];

// Rank vendors by how many active signals map to them.
// Returns vendors sorted by score descending, with signalCount and reasonLine attached.
export function rankVendorsBySignals(activeSignals = []) {
  const activeIds = new Set(activeSignals.map(s => s.id));
  return VENDOR_CATALOG
    .map(v => {
      const matchedSignals = (v.signal_ids || []).filter(id => activeIds.has(id));
      const matchedValues = matchedSignals
        .map(id => activeSignals.find(s => s.id === id)?.value)
        .filter(Boolean);
      return {
        ...v,
        signalCount: matchedSignals.length,
        reasonLine: matchedValues.length > 0
          ? `Ranked because: ${matchedValues.join(' · ')}`
          : null,
      };
    })
    .sort((a, b) => b.signalCount - a.signalCount);
}

// Legacy export for any existing usage
export function getMockVendors() {
  return VENDOR_CATALOG;
}
```

- [ ] **Step 2: Update DiscoveryView in CompanyProfile.jsx to accept ranked vendors**

**Schema compatibility warning:** The existing `DISCOVERY_VENDORS` constant in `CompanyProfile.jsx` has fields like `logoUrl`, `programs`, `chatQ`. The new `VENDOR_CATALOG` in `mock/vendors.js` has `name`, `synthesis`, `signal_ids`. These schemas are incompatible — you cannot drop-swap them. The fix is to update `DiscoveryView` to render from the new schema (using `v.name`, `v.synthesis`, `v.reasonLine`) and keep the fallback path using a `DISCOVERY_VENDORS` adapter.

Update the `DiscoveryView` signature and render loop:

```jsx
function DiscoveryView({ tk, onVendorSelect, rankedVendors, isDemoMode }) {
  // rankedVendors uses the new schema: { id, name, synthesis, reasonLine, signalCount }
  // DISCOVERY_VENDORS uses the old schema: { id, name, programs[], chatQ, logoUrl }
  // When rankedVendors is provided, use it (new schema). Otherwise fall back.
  const useNewSchema = !!rankedVendors;
  const vendors = rankedVendors || DISCOVERY_VENDORS;

  return (
    <div>
      {vendors.map(v => (
        <div key={v.id || v.name} style={{ padding: '11px 16px', borderBottom: `1px solid ${tk.hairline}` }}>
          {/* Vendor name row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: tk.inkSoft }}>{v.name}</span>
            {/* CTA: demo mode replaces action with orientation link */}
            {isDemoMode
              ? <span style={{ fontSize: 9.5, color: '#b0956e', cursor: 'pointer' }}>See how this applies →</span>
              : <span style={{ fontSize: 10, color: tk.inkGhost, cursor: 'pointer' }}>›</span>
            }
          </div>
          {/* Description: use synthesis (new schema) or programs[0] (old schema) */}
          <div style={{ fontSize: 10.5, color: tk.inkSoft, lineHeight: 1.4, marginTop: 2 }}>
            {useNewSchema ? v.synthesis : (v.programs?.[0] || '')}
          </div>
          {/* Reason line: new schema only, always visible when present */}
          {v.reasonLine && (
            <div style={{
              fontSize: 9.5, color: '#8c8499', fontStyle: 'italic',
              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
              lineHeight: 1.4, marginTop: 3,
            }}>
              {v.reasonLine}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

Pass `isDemoMode` to `DiscoveryView` from the parent `CompanyProfile`.

- [ ] **Step 3: Pass rankedVendors from Chat.jsx to CompanyProfile**

In `Chat.jsx`, import `rankVendorsBySignals` and compute ranked vendors:

```js
import { rankVendorsBySignals } from '../data/mock/vendors.js';
// ...
const rankedVendors = rankVendorsBySignals(activeSignals);
```

Pass to CompanyProfile:
```jsx
<CompanyProfile ... rankedVendors={rankedVendors} />
```

In `CompanyProfile`, pass `rankedVendors` down to `DiscoveryView`:
```jsx
<DiscoveryView tk={tk} onVendorSelect={onVendorSelect} rankedVendors={rankedVendors} />
```

- [ ] **Step 4: Verify in browser**

Reload http://localhost:5173/chat. The vendor list should:
- Show Vanta first (3 signals map to it)
- Show a reason line under Vanta: "Ranked because: No SOC 2 detected · No IR controls in repo · AU healthcare enterprise target"
- Show vendors with 0 signal matches at the bottom with no reason line

- [ ] **Step 5: Lint + commit**

```bash
npm run lint 2>&1 | head -20
git add frontend/src/data/mock/vendors.js frontend/src/components/chat/CompanyProfile.jsx frontend/src/pages/Chat.jsx
git commit -m "feat(ui): vendor ranking by signals — reason line always visible, Vanta floats to #1 by evidence"
git push origin main
```

---

## Task 9: Regeneration UX + VendorShortlist provenance

**Files:**
- Modify: `frontend/src/components/chat/VendorShortlist.jsx`
- Modify: `frontend/src/components/chat/ObservationStrip.jsx` (regeneration indicator)

When a signal is corrected, show a soft `↻ Updating based on your correction…` line in the ObservationStrip. Update VendorShortlist to store provenance when an item is shortlisted.

- [ ] **Step 1: Add regeneration indicator to ObservationStrip**

In `ObservationStrip.jsx`, accept a `regeneratingDomains` prop. Add a regeneration line when any domain is regenerating:

```jsx
export function ObservationStrip({ signals, isDemoMode, onCorrect, onIgnore, onAddContext, tk, regeneratingDomains }) {
  // ...inside the return, after the chips row:
  {regeneratingDomains?.size > 0 && (
    <div style={{
      marginTop: 8, fontSize: 10, color: '#8c8499', fontStyle: 'italic',
      display: 'flex', alignItems: 'center', gap: 5,
    }}>
      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>↻</span>
      Updating based on your correction…
    </div>
  )}
```

Add the spin keyframe to the ObservationStrip file (inline style block via a `<style>` tag at component level or use a CSS class):

```jsx
<style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
```

Pass `regeneratingDomains` from Chat.jsx to ObservationStrip.

- [ ] **Step 2: Update VendorShortlist to stamp provenance on shortlist**

In `VendorShortlist.jsx`, update the `+ Add to shortlist` onClick to pass the full vendor object (not just the id). The old call was `onShortlist(v.id)` — this must become a full object:

```jsx
// In VendorShortlist.jsx, change:
<button onClick={() => onShortlist(v.id)} ...>
// To:
<button onClick={() => onShortlist({ ...v, provenance: { ...v.provenance, added_at: new Date().toISOString() } })} ...>
```

Add provenance display under shortlisted items:

```jsx
{v.provenance?.added_at && (
  <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 5, fontStyle: 'italic' }}>
    Added {new Date(v.provenance.added_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
    {v.provenance?.triggered_by && ` · ${v.provenance.triggered_by}`}
  </div>
)}
```

- [ ] **Step 2b: Update the onShortlist handler in Chat.jsx**

`VendorShortlist` now passes a full vendor object to `onShortlist`. The handler in `Chat.jsx` that receives this call currently stores/checks vendor IDs. Find the `onShortlist` handler (or wherever `shortlist` state is managed) and update it to accept the full object:

```js
// Before (expected old shape):
const handleShortlist = (vendorId) => {
  setShortlist(prev => [...prev, vendorId]);
};

// After (new shape — full vendor object with provenance):
const handleShortlist = (vendorObj) => {
  setShortlist(prev => {
    // Avoid duplicates by id
    const alreadyIn = prev.some(v => (v.id || v) === vendorObj.id);
    return alreadyIn ? prev : [...prev, vendorObj];
  });
};
```

Also update any `v.status === 'shortlisted'` checks in VendorShortlist — these should now compare `shortlist.some(s => (s.id || s) === v.id)` to handle both old string IDs and new objects gracefully during the transition.
```

- [ ] **Step 3: End-to-end smoke test**

With dev server running:
1. Open /chat
2. Click a signal chip → evidence drawer opens
3. Click "Wrong?" → drawer closes, chip fades, "↻ Updating…" appears briefly
4. Vendor list re-renders (Vanta may move if the corrected signal was one of its 3)
5. Open the shortlist panel → click "+ Add to shortlist" on a vendor → timestamp appears on the shortlisted item

- [ ] **Step 4: Lint + final commit**

```bash
npm run lint 2>&1 | head -20
git add frontend/src/components/chat/ObservationStrip.jsx frontend/src/components/chat/VendorShortlist.jsx
git commit -m "feat(ui): regeneration UX soft transition, shortlist provenance timestamp"
git push origin main
```

---

## Task 10: GuidanceBlock component — Edison three-beat render (AC-4)

**Files:**
- Create: `frontend/src/components/chat/GuidanceBlock.jsx`
- Modify: `frontend/src/data/mock/signals.js` (add one mock GuidanceBlock)
- Modify: `frontend/src/pages/Chat.jsx` (render GuidanceBlock in message area)

The spec requires every GuidanceBlock to end with a concrete next move (AC-4). This task creates the render component and a demo instance so AC-4 is verifiable in the browser. The mock GuidanceBlock is the Edison three-beat structure: Observed → Why it matters → Next move.

- [ ] **Step 1: Create GuidanceBlock.jsx**

```jsx
// frontend/src/components/chat/GuidanceBlock.jsx

export function GuidanceBlock({ block, isRegenerating }) {
  if (!block) return null;

  return (
    <div style={{
      background: '#ecfeff',
      border: '1px solid #9dccd655',
      borderRadius: '4px 16px 16px 16px',
      padding: '12px 16px',
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      fontSize: 13,
      lineHeight: 1.7,
      color: '#241f31',
      position: 'relative',
    }}>
      {isRegenerating && (
        <div style={{ fontSize: 10, color: '#8c8499', fontStyle: 'italic', marginBottom: 8 }}>
          ↻ Updating based on your correction…
        </div>
      )}

      {/* Beat 2: Why it matters (synthesis) */}
      <p style={{ margin: '0 0 12px' }}>{block.synthesis}</p>

      {/* Beat 3: Next move — always required */}
      {block.next_move && (
        <div style={{
          borderTop: '1px solid #e0d8c9',
          paddingTop: 10,
          marginTop: 4,
          fontSize: 12,
          color: '#5a5267',
        }}>
          <span style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 8.5, fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            color: '#176577', marginRight: 8,
          }}>
            Next
          </span>
          {block.next_move}
        </div>
      )}

      {/* Provenance */}
      <div style={{ fontSize: 9, color: '#b8b1c0', marginTop: 10, fontStyle: 'italic' }}>
        {block.persona} lens · {block.signals.length} signal{block.signals.length !== 1 ? 's' : ''} ·{' '}
        {new Date(block.generated_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add MOCK_GUIDANCE_BLOCK to mock/signals.js**

**Import hoisting required:** ES modules enforce that `import` statements appear at the top of the file. Add `makeGuidanceBlock` to the existing import at the top of the file:

```js
// At the top of frontend/src/data/mock/signals.js — update the existing import line:
import { makeObservedSignal, makeGuidanceBlock } from '../../rendering/protocol.js';
```

Then add the export at the **bottom** of the file (after `MOCK_SIGNALS`):

```js
export const MOCK_GUIDANCE_BLOCK = makeGuidanceBlock({
  persona: 'edison',
  signals: [
    { id: 'au_healthcare_enterprise' },
    { id: 'no_soc2_detected' },
    { id: 'no_ir_controls' },
  ],
  synthesis: 'Healthcare enterprise procurement commonly requires SOC 2 Type II. Your public repo shows no access controls or incident response documentation — three checklist items that will stall a deal. Vanta closes this in 90 days.',
  next_move: 'Add an incident response policy to your repo this week (template in Vanta docs, free). That clears one checklist item independently of any vendor spend. Then evaluate Vanta for audit automation if an enterprise deal is in the next 6 months.',
  confidence: 0.87,
});
```

- [ ] **Step 3: Render GuidanceBlock in Chat.jsx message area**

In `frontend/src/pages/Chat.jsx`, add the import:

```js
import { GuidanceBlock }   from '../components/chat/GuidanceBlock.jsx';
import { MOCK_GUIDANCE_BLOCK } from '../data/mock/signals.js';
```

In the chat message area (after `ObservationStrip`, before the user input), render the mock GuidanceBlock to satisfy AC-4 during development:

```jsx
{/* Demo GuidanceBlock — Edison three-beat render */}
<div style={{ alignSelf: 'flex-start', maxWidth: '72%' }}>
  <div style={{
    fontSize: 11, fontWeight: 700, letterSpacing: '0.5px',
    textTransform: 'uppercase', color: '#176577', marginBottom: 4,
  }}>
    Edison · operational lens
  </div>
  <GuidanceBlock
    block={MOCK_GUIDANCE_BLOCK}
    isRegenerating={regeneratingDomains.size > 0}
  />
</div>
```

- [ ] **Step 4: Verify in browser**

Reload /chat. Verify:
- Edison response shows synthesis paragraph
- "Next" section appears below with concrete next move (not a vendor pitch)
- Correcting a signal shows "↻ Updating…" inside the GuidanceBlock

- [ ] **Step 5: Lint + commit**

```bash
npm run lint 2>&1 | head -20
git add frontend/src/components/chat/GuidanceBlock.jsx frontend/src/data/mock/signals.js frontend/src/pages/Chat.jsx
git commit -m "feat(ui): GuidanceBlock — Edison three-beat render, next_move always present (AC-4)"
git push origin main
```

---

## Task 11: SessionSnapshot on session close (AC-11)

**Files:**
- Modify: `frontend/src/pages/Chat.jsx`

AC-11 requires a `SessionSnapshot` written on session close. This is the data foundation for the temporal narrative — even though the delta UI (AC-12) is deferred to DESIGN-004-B, the snapshot must exist in v2. Implementation: write to `sessionStorage` on `beforeunload`, keyed by entity ID.

- [ ] **Step 1: Add SessionSnapshot write to Chat.jsx**

In `frontend/src/pages/Chat.jsx`, add a `useEffect` that registers a `beforeunload` handler:

```js
import { useEffect } from 'react'; // already imported if Chat uses it

// Session snapshot — written on close for temporal narrative (AC-11)
useEffect(() => {
  const writeSnapshot = () => {
    const snapshot = {
      session_id: sessionStorage.getItem('proof360_session_id') || crypto.randomUUID(),
      entity_id:  'hive_and_code_demo',   // replace with real entity ID when auth exists
      timestamp:  new Date().toISOString(),
      signals:    activeSignals,
      domain_scores: Object.fromEntries(
        Object.entries(domainTurns).map(([d, turns]) => [d, Math.min(100, turns * 20)])
      ),
      guidance_blocks_rendered: [],        // populated by GuidanceBlock when real IDs exist
    };
    try {
      sessionStorage.setItem('proof360_last_snapshot', JSON.stringify(snapshot));
    } catch (_) {}                         // sessionStorage unavailable — silent no-op
  };

  window.addEventListener('beforeunload', writeSnapshot);
  return () => window.removeEventListener('beforeunload', writeSnapshot);
}, [activeSignals, domainTurns]);
```

Note: `domainTurns` comes from `useSignals()` which was wired in Task 6. Add it to the destructured return if not already present.

- [ ] **Step 2: Verify snapshot writes**

```
1. Open /chat in browser
2. Open DevTools → Application → Session Storage
3. Reload the page (beforeunload fires)
4. Check for `proof360_last_snapshot` key in sessionStorage
5. Verify it contains signals[], domain_scores{}, timestamp
```

- [ ] **Step 3: Lint + commit**

```bash
npm run lint 2>&1 | head -20
git add frontend/src/pages/Chat.jsx
git commit -m "feat(session): write SessionSnapshot to sessionStorage on close — temporal narrative data model (AC-11)"
git push origin main
```

---

## Acceptance criteria verification

After all tasks complete, run through this checklist manually in the browser at http://localhost:5173/chat:

- [ ] ObservationStrip appears with green (gap) and amber (capability) chips (AC-9)
- [ ] Clicking a chip opens SignalEvidenceDrawer with source, confidence, freshness, disprovable_by (AC-3)
- [ ] "Confidence" label reads "observation confidence — how certain we are this is true" (AC-3)
- [ ] Wrong? → chip fades, "↻ Updating…" appears, vendor list may reorder (AC-7)
- [ ] Ignore → chip stays but is visually dimmed; does not affect vendor ranking
- [ ] Add context → text input, save → new amber chip appears
- [ ] Vanta is ranked #1 in vendor list with reason line showing matching signals (AC-2)
- [ ] GuidanceBlock renders Edison three-beat structure; "Next" section present and decoupled from vendor CTAs (AC-4)
- [ ] Demo mode: amber "EXAMPLE · Hive & Code" label at top of right panel (AC-5)
- [ ] Demo mode: signal chips have reduced opacity, no correction loop (AC-5)
- [ ] Demo mode: vendor cards show "See how this applies to your company →" not standard CTAs (AC-5)
- [ ] Shortlisted vendor shows "Added [date]" timestamp
- [ ] DevTools → Session Storage → `proof360_last_snapshot` key exists after page reload (AC-11)
- [ ] Snapshot contains `signals[]`, `domain_scores{}`, `timestamp` fields

Then deploy:

```bash
git push origin main
# GitHub Actions → EC2 deploy runs automatically
# Verify at https://proof360.au/chat after ~3 min
```
