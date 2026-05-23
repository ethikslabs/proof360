# Observable Trust Graph — MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the proof360 chat frontend as a three-layer operational intelligence surface — familiar ChatGPT shell on top, TrustRail that crystallises after first analysis, and MachineDrawer (bottom drawer) that grows as the graph builds beneath the conversation.

**Architecture:** `useTrustPhase` derives materialisation state from existing session signals; `TrustRail` renders ghost→solid based on that phase; `MachineDrawer` is a 45vh overlay drawer with a live handle. `Chat.jsx` is refactored to remove `Sidebar`, `Projection`, `TweaksPanel`, and `activeSpace` — replaced by the new three-layer structure. All `+` menu items are stubs for MVP.

**Tech stack:** React 19, Vite 8, Tailwind CSS 3, vitest + @testing-library/react, existing `/api/session/*` endpoints. No new dependencies.

**Spec:** `docs/specs/2026-05-23-observable-trust-graph-design.md`

---

## File map

| Status | File | Responsibility |
|--------|------|---------------|
| **Create** | `frontend/src/hooks/useTrustPhase.js` | Derives t0/t05/t1/t2/tn from session signals |
| **Create** | `frontend/src/components/chat/TrustRail.jsx` | Left rail — ghost at t1, solid at t2+ |
| **Create** | `frontend/src/components/chat/MachineDrawer.jsx` | Bottom drawer — handle + collapsible body |
| **Create** | `frontend/src/components/chat/GraphView.jsx` | Node list (not force-graph) inside drawer |
| **Create** | `frontend/src/utils/deriveGraphNodes.js` | Maps inferences + report data → graph nodes |
| **Create** | `frontend/src/components/chat/ProvenanceAccordion.jsx` | Per-conclusion expandable source/model trail |
| **Create** | `frontend/src/components/chat/DrawerStats.jsx` | Token/model/source stats in drawer |
| **Create** | `frontend/src/components/chat/EscalationCTA.jsx` | Warm escalation block in drawer |
| **Create** | `frontend/src/components/chat/PlusMenu.jsx` | Context modifier menu (all stubs for MVP) |
| **Create** | `frontend/src/components/chat/ProfileSelector.jsx` | Analysis profile intent selector |
| **Modify** | `frontend/src/pages/Chat.jsx` | Remove Sidebar/Projection/TweaksPanel/activeSpace; wire TrustRail, MachineDrawer, PlusMenu, ProfileSelector; pass `analysis_profile` to session start |
| **Modify** | `frontend/src/api/client.js` | Add `analysis_profile` param to `startSession` |
| **Create** | `frontend/tests/unit/useTrustPhase.test.js` | Phase derivation logic tests |
| **Create** | `frontend/tests/unit/MachineDrawer.test.jsx` | Drawer open/close + handle render tests |
| **Create** | `frontend/tests/unit/TrustRail.test.jsx` | Ghost/solid/error state render tests |

---

## Task 1: `useTrustPhase` — materialisation phase derivation

The single source of truth for which layer state the UI is in. All three layers (main surface, TrustRail, MachineDrawer) read from this.

**Phase values:**
- `'t0'` — before triage (`phase !== 'active'` OR `inputReady === false`)
- `'t05'` — triage complete, input ready, no user message yet (`phase === 'active' && inputReady === true && userMessageCount === 0`)
- `'t1'` — first user message submitted, analysis pending (`userMessageCount > 0 && companyData === null`)
- `'t2'` — first inference complete (`companyData !== null && userMessageCount <= 1`)
- `'tn'` — ongoing multi-turn (`companyData !== null && userMessageCount > 1`)

**Important:** `phase` (from `useChatSession`) must be passed to this hook. The hook gates t05+ behind `phase === 'active'` so the TrustRail cannot ghost-shimmer during the theatrical opening (before the user has selected a triage intent). Chat.jsx uses `'intro' | 'triage' | 'active'` as its phase values — only `'active'` unblocks materialisation.

**Files:**
- Create: `frontend/src/hooks/useTrustPhase.js`
- Create: `frontend/tests/unit/useTrustPhase.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// frontend/tests/unit/useTrustPhase.test.js
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|useTrustPhase)"
```
Expected: FAIL — `useTrustPhase` not found.

- [ ] **Step 3: Implement `useTrustPhase`**

```js
// frontend/src/hooks/useTrustPhase.js
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|useTrustPhase)"
```
Expected: all 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useTrustPhase.js frontend/tests/unit/useTrustPhase.test.js
git commit -m "feat(chat): useTrustPhase — derives materialisation phase from session signals"
```

---

## Task 2: `TrustRail` — left rail component

The left rail that is invisible at t0, ghost-shimmers at t1, and crystallises to solid at t2+. New component — replaces `Sidebar` entirely.

**Files:**
- Create: `frontend/src/components/chat/TrustRail.jsx`
- Create: `frontend/tests/unit/TrustRail.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// frontend/tests/unit/TrustRail.test.jsx
import { render, screen } from '@testing-library/react';
import { TrustRail } from '../../src/components/chat/TrustRail.jsx';

const nullData = null;
const mockData = {
  inferences: [
    { field: 'company_name', value: 'Hive & Co', confidence: 0.9 },
    { field: 'stage', value: 'pre-seed', confidence: 0.75 },
  ],
};

describe('TrustRail', () => {
  it('renders nothing at t0', () => {
    const { container } = render(<TrustRail trustPhase="t0" companyData={nullData} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders ghost state at t1', () => {
    render(<TrustRail trustPhase="t1" companyData={nullData} />);
    expect(screen.getByTestId('trust-rail-ghost')).toBeInTheDocument();
    expect(screen.queryByTestId('trust-rail-solid')).not.toBeInTheDocument();
  });

  it('renders solid state at t2 with company data', () => {
    render(<TrustRail trustPhase="t2" companyData={mockData} />);
    expect(screen.getByTestId('trust-rail-solid')).toBeInTheDocument();
    expect(screen.getByText('Hive & Co')).toBeInTheDocument();
  });

  it('renders error indicator when trustPhase is t1 and inferenceError is true', () => {
    render(<TrustRail trustPhase="t1" companyData={nullData} inferenceError />);
    expect(screen.getByTestId('trust-rail-error')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|TrustRail)"
```
Expected: FAIL.

- [ ] **Step 3: Implement `TrustRail`**

```jsx
// frontend/src/components/chat/TrustRail.jsx

// Ghost state: low opacity, blurred placeholder bars — signals "structure exists, not confident yet"
// Solid state: full opacity, real data from inferences — "structure has crystallised"
// Error state: ghost stays, placeholder bars replaced by a muted error pulse
// Animation: NOT a slide-in. Opacity + filter:blur transition — resolves like a photograph developing.

const RAIL_WIDTH = 220;

function GhostBar({ width = '80%', error = false }) {
  return (
    <div style={{
      height: 6, borderRadius: 3, marginBottom: 8,
      width,
      background: error ? '#fca5a5' : '#e5e7eb',
      animation: error ? 'errorPulse 2s ease-in-out infinite' : 'ghostPulse 1.8s ease-in-out infinite',
    }} />
  );
}

function PanelSection({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function InferenceRow({ label, value }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{value}</div>
    </div>
  );
}

function GhostRail({ error }) {
  return (
    <div data-testid={error ? 'trust-rail-error' : 'trust-rail-ghost'}
      style={{
        width: RAIL_WIDTH,
        padding: '20px 14px',
        opacity: 0.22,
        filter: 'blur(0.5px)',
        transition: 'opacity 0.8s ease, filter 0.8s ease',
      }}
    >
      <style>{`
        @keyframes ghostPulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes errorPulse  { 0%,100%{opacity:0.5} 50%{opacity:0.9} }
      `}</style>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 10 }}>
        {error ? 'Analysis paused' : 'Building…'}
      </div>
      <GhostBar width="90%" error={error} />
      <GhostBar width="65%" error={error} />
      <GhostBar width="80%" error={error} />
      <div style={{ marginTop: 16 }}>
        <GhostBar width="100%" error={error} />
        <GhostBar width="55%" error={error} />
      </div>
    </div>
  );
}

function SolidRail({ companyData }) {
  const name = companyData?.inferences?.find(i => i.field === 'company_name')?.value ?? '—';
  const stage = companyData?.inferences?.find(i => i.field === 'stage')?.value ?? '—';
  const type = companyData?.inferences?.find(i => i.field === 'product_type')?.value ?? '—';

  return (
    <div data-testid="trust-rail-solid"
      style={{
        width: RAIL_WIDTH,
        padding: '20px 14px',
        opacity: 1,
        filter: 'none',
        transition: 'opacity 1.2s ease, filter 1.2s ease',
      }}
    >
      <PanelSection title="Company">
        <InferenceRow label="Name" value={name} />
        <InferenceRow label="Stage" value={stage} />
        <InferenceRow label="Type" value={type} />
      </PanelSection>

      {companyData?.readiness && (
        <PanelSection title="Readiness">
          {Object.entries(companyData.readiness).map(([k, v]) => (
            <InferenceRow key={k} label={k.replace(/_/g, ' ')} value={`${v}%`} />
          ))}
        </PanelSection>
      )}

      {companyData?.gaps?.length > 0 && (
        <PanelSection title="Gaps">
          {companyData.gaps.slice(0, 4).map(g => (
            <div key={g.id} style={{
              fontSize: 11, color: '#dc2626', padding: '3px 0',
              borderBottom: '1px solid #fee2e2',
            }}>
              {g.label ?? g.id}
            </div>
          ))}
        </PanelSection>
      )}
    </div>
  );
}

export function TrustRail({ trustPhase, companyData, inferenceError = false }) {
  if (trustPhase === 't0') return null;

  const isGhost = trustPhase === 't1' || (trustPhase === 't05');
  const isSolid = trustPhase === 't2' || trustPhase === 'tn';

  return (
    <div style={{
      width: RAIL_WIDTH,
      flexShrink: 0,
      borderRight: '1px solid #f3f4f6',
      overflowY: 'auto',
      background: '#fafafa',
    }}>
      {isGhost && <GhostRail error={inferenceError} />}
      {isSolid && companyData && <SolidRail companyData={companyData} />}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|TrustRail)"
```
Expected: all 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/chat/TrustRail.jsx frontend/tests/unit/TrustRail.test.jsx
git commit -m "feat(chat): TrustRail — ghost/solid left rail materialisation"
```

---

## Task 3: `MachineDrawer` — bottom drawer shell

The organism beneath the conversation. Handle is visible from t1. Drawer is closed by default. Opens 45vh as an overlay when handle is clicked. Contains the graph, provenance, stats, and escalation (wired in later tasks).

**Files:**
- Create: `frontend/src/components/chat/MachineDrawer.jsx`
- Create: `frontend/tests/unit/MachineDrawer.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// frontend/tests/unit/MachineDrawer.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MachineDrawer } from '../../src/components/chat/MachineDrawer.jsx';

const mockStats = { nodes: 4, edges: 6, models: 2, sources: 3 };

describe('MachineDrawer', () => {
  it('renders nothing at t0', () => {
    const { container } = render(
      <MachineDrawer trustPhase="t0" stats={mockStats}>{null}</MachineDrawer>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders handle at t1 with building state', () => {
    render(<MachineDrawer trustPhase="t1" stats={null}>{null}</MachineDrawer>);
    expect(screen.getByTestId('drawer-handle')).toBeInTheDocument();
    expect(screen.getByText(/building/i)).toBeInTheDocument();
  });

  it('renders live counts in handle at t2', () => {
    render(<MachineDrawer trustPhase="t2" stats={mockStats}>{null}</MachineDrawer>);
    expect(screen.getByText(/4 nodes/)).toBeInTheDocument();
    expect(screen.getByText(/6 edges/)).toBeInTheDocument();
  });

  it('drawer body is hidden by default', () => {
    render(<MachineDrawer trustPhase="t2" stats={mockStats}>{null}</MachineDrawer>);
    expect(screen.queryByTestId('drawer-body')).not.toBeInTheDocument();
  });

  it('opens drawer body on handle click', () => {
    render(<MachineDrawer trustPhase="t2" stats={mockStats}><div>content</div></MachineDrawer>);
    fireEvent.click(screen.getByTestId('drawer-handle'));
    expect(screen.getByTestId('drawer-body')).toBeInTheDocument();
  });

  it('closes drawer body on second handle click', () => {
    render(<MachineDrawer trustPhase="t2" stats={mockStats}><div>content</div></MachineDrawer>);
    fireEvent.click(screen.getByTestId('drawer-handle'));
    expect(screen.getByTestId('drawer-body')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('drawer-handle'));
    expect(screen.queryByTestId('drawer-body')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|MachineDrawer)"
```
Expected: FAIL.

- [ ] **Step 3: Implement `MachineDrawer`**

```jsx
// frontend/src/components/chat/MachineDrawer.jsx
import { useState } from 'react';

// Handle is always closed by default.
// Opens 45vh as a position:fixed overlay — does NOT push/reflow the chat above.
// Closes on second handle click.

function HandleDots({ count }) {
  return Array.from({ length: Math.min(count, 6) }, (_, i) => (
    <span key={i} style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: i < 2 ? '#6366f1' : i < 4 ? '#0891b2' : '#f59e0b',
      margin: '0 2px',
    }} />
  ));
}

export function MachineDrawer({ trustPhase, stats, children }) {
  const [open, setOpen] = useState(false);

  if (trustPhase === 't0') return null;

  const hasStats = stats && stats.nodes > 0;
  const isBuilding = !hasStats;

  const handleLabel = isBuilding
    ? '↑ Graph · building…'
    : `↑ Graph`;

  const handleStats = hasStats
    ? `${stats.nodes} nodes · ${stats.edges} edges · ${stats.models} models · ${stats.sources} sources`
    : '';

  return (
    <>
      {/* Fixed handle — always at bottom of viewport */}
      <div
        data-testid="drawer-handle"
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: '#f9fafb',
          borderTop: '1.5px solid #e5e7eb',
          padding: '8px 20px',
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background 0.15s',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6366f1' }}>
          {handleLabel}
        </span>
        {hasStats && <HandleDots count={stats.nodes} />}
        {hasStats && (
          <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>
            {handleStats}
          </span>
        )}
        {isBuilding && (
          <span style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>building…</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
          {open ? '↓' : '↑'}
        </span>
      </div>

      {/* Drawer body — 45vh overlay, slides up over chat */}
      {open && (
        <div
          data-testid="drawer-body"
          style={{
            position: 'fixed', bottom: 37, left: 0, right: 0, zIndex: 49,
            height: '45vh',
            background: '#ffffff',
            borderTop: '1.5px solid #e5e7eb',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.08)',
            overflowY: 'auto',
            padding: '20px 24px 24px',
          }}
        >
          {children}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|MachineDrawer)"
```
Expected: all 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/chat/MachineDrawer.jsx frontend/tests/unit/MachineDrawer.test.jsx
git commit -m "feat(chat): MachineDrawer — bottom drawer shell with live handle"
```

> **MVP scope note:** The spec lists "click outside the drawer" as a close trigger. This is explicitly deferred to post-MVP. For MVP, only the handle-toggle close is implemented. Post-MVP: add a `useEffect` with a `document.addEventListener('mousedown', handler)` that checks `!drawerRef.current.contains(e.target)` and calls `setOpen(false)`.

---

## Task 4: `GraphView` + `deriveGraphNodes` — node list

The basic graph view for MVP — a structured node list, not a force-directed graph. `deriveGraphNodes` maps inference data to the node format.

**Files:**
- Create: `frontend/src/utils/deriveGraphNodes.js`
- Create: `frontend/src/components/chat/GraphView.jsx`

- [ ] **Step 1: Write the failing tests for `deriveGraphNodes`**

```js
// Add to a new file: frontend/tests/unit/deriveGraphNodes.test.js
import { deriveGraphNodes } from '../../src/utils/deriveGraphNodes.js';

describe('deriveGraphNodes', () => {
  it('returns empty array for null inputs', () => {
    expect(deriveGraphNodes(null, null)).toEqual([]);
  });

  it('creates a company node from inferences', () => {
    const inferences = [{ field: 'company_name', value: 'Hive & Co', confidence: 0.9 }];
    const nodes = deriveGraphNodes(inferences, null);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe('company');
    expect(nodes[0].label).toBe('Hive & Co');
  });

  it('creates gap nodes from report gaps', () => {
    const gaps = [{ id: 'no_ssl', label: 'No SSL', severity: 'critical' }];
    const nodes = deriveGraphNodes(null, { gaps });
    const gapNodes = nodes.filter(n => n.type === 'gap');
    expect(gapNodes).toHaveLength(1);
    expect(gapNodes[0].label).toBe('No SSL');
  });

  it('creates vendor nodes from report vendors', () => {
    const vendors = [{ id: 'vanta', name: 'Vanta', closes_gaps: ['no_ssl'] }];
    const nodes = deriveGraphNodes(null, { vendors });
    const vendorNodes = nodes.filter(n => n.type === 'vendor');
    expect(vendorNodes).toHaveLength(1);
    expect(vendorNodes[0].label).toBe('Vanta');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|deriveGraphNodes)"
```

- [ ] **Step 3: Implement `deriveGraphNodes`**

```js
// frontend/src/utils/deriveGraphNodes.js

// Maps inference + report data to a flat node list.
// Each node: { id, type, label, confidence?, severity?, meta? }
// Types: company | claim | gap | vendor | program | risk

export function deriveGraphNodes(inferences, reportData) {
  const nodes = [];

  if (inferences) {
    const nameInf = inferences.find(i => i.field === 'company_name');
    if (nameInf) {
      nodes.push({ id: 'company-0', type: 'company', label: nameInf.value, confidence: nameInf.confidence });
    }
    inferences
      .filter(i => i.field !== 'company_name')
      .forEach((inf, idx) => {
        nodes.push({ id: `claim-${idx}`, type: 'claim', label: `${inf.field}: ${inf.value}`, confidence: inf.confidence });
      });
  }

  if (reportData?.gaps) {
    reportData.gaps.forEach(g => {
      nodes.push({ id: `gap-${g.id}`, type: 'gap', label: g.label ?? g.id, severity: g.severity });
    });
  }

  if (reportData?.vendors) {
    reportData.vendors.forEach(v => {
      nodes.push({ id: `vendor-${v.id}`, type: 'vendor', label: v.name ?? v.id });
    });
  }

  return nodes;
}
```

- [ ] **Step 4: Implement `GraphView`**

```jsx
// frontend/src/components/chat/GraphView.jsx

const TYPE_COLOR = {
  company: '#6366f1',
  claim:   '#0891b2',
  gap:     '#dc2626',
  vendor:  '#059669',
  program: '#d97706',
  risk:    '#ea580c',
};

const TYPE_LABEL = {
  company: 'Company',
  claim:   'Signal',
  gap:     'Gap',
  vendor:  'Vendor',
  program: 'Program',
  risk:    'Risk',
};

function NodeRow({ node }) {
  const color = TYPE_COLOR[node.type] ?? '#9ca3af';
  const typeLabel = TYPE_LABEL[node.type] ?? node.type;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 0', borderBottom: '1px solid #f3f4f6',
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: color, flexShrink: 0, display: 'inline-block',
      }} />
      <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 48 }}>{typeLabel}</span>
      <span style={{ fontSize: 13, color: '#111827', flex: 1 }}>{node.label}</span>
      {node.confidence != null && (
        <span style={{ fontSize: 10, color: '#9ca3af' }}>{Math.round(node.confidence * 100)}%</span>
      )}
    </div>
  );
}

export function GraphView({ nodes = [] }) {
  if (nodes.length === 0) {
    return (
      <div style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic', padding: '12px 0' }}>
        Graph building…
      </div>
    );
  }

  const grouped = nodes.reduce((acc, n) => {
    (acc[n.type] = acc[n.type] ?? []).push(n);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12 }}>
        Observable Trust Graph — {nodes.length} nodes
      </div>
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: TYPE_COLOR[type] ?? '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            {TYPE_LABEL[type] ?? type}
          </div>
          {items.map(n => <NodeRow key={n.id} node={n} />)}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Run tests**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|deriveGraphNodes)"
```
Expected: all 4 PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/deriveGraphNodes.js frontend/src/components/chat/GraphView.jsx frontend/tests/unit/deriveGraphNodes.test.js
git commit -m "feat(chat): GraphView + deriveGraphNodes — node list from inference/report data"
```

---

## Task 5: `ProvenanceAccordion` — expandable source/model trail

Every visible conclusion is explainable. Per-conclusion accordion — click to expand sources, models used, confidence basis.

**Files:**
- Create: `frontend/src/components/chat/ProvenanceAccordion.jsx`

No tests required for MVP — pure presentational, manually verified.

- [ ] **Step 1: Implement `ProvenanceAccordion`**

```jsx
// frontend/src/components/chat/ProvenanceAccordion.jsx
import { useState } from 'react';

function SourceRow({ label, url }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '3px 0', fontSize: 12, color: '#374151' }}>
      <span style={{ color: '#9ca3af', flexShrink: 0 }}>↳</span>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', textDecoration: 'none' }}>{label}</a>
      ) : (
        <span>{label}</span>
      )}
    </div>
  );
}

// trail: { conclusion, sources: [{label, url?}], models: [{name, why?}], confidence: 0-1, executionPath: string[] }
export function ProvenanceAccordion({ trails = [] }) {
  const [openIdx, setOpenIdx] = useState(null);

  if (trails.length === 0) {
    return (
      <div style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
        Analysis provenance will appear here.
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12 }}>
        Analysis Provenance
      </div>
      {trails.map((trail, idx) => (
        <div key={idx} style={{ borderBottom: '1px solid #f3f4f6', marginBottom: 2 }}>
          <div
            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{trail.conclusion}</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{openIdx === idx ? '↑' : '↓'} open trail</span>
          </div>
          {openIdx === idx && (
            <div style={{ paddingBottom: 12, paddingLeft: 8 }}>
              {trail.sources?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Sources</div>
                  {trail.sources.map((s, i) => <SourceRow key={i} {...s} />)}
                </div>
              )}
              {trail.models?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Models used</div>
                  {trail.models.map((m, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#374151', padding: '2px 0' }}>
                      {m.name}{m.why && <span style={{ color: '#9ca3af' }}> — {m.why}</span>}
                    </div>
                  ))}
                </div>
              )}
              {trail.confidence != null && (
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Confidence: {Math.round(trail.confidence * 100)}%
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/chat/ProvenanceAccordion.jsx
git commit -m "feat(chat): ProvenanceAccordion — expandable source/model provenance trail"
```

---

## Task 6: `DrawerStats` + `EscalationCTA`

Two small components that live at the bottom of the drawer body.

**Files:**
- Create: `frontend/src/components/chat/DrawerStats.jsx`
- Create: `frontend/src/components/chat/EscalationCTA.jsx`

- [ ] **Step 1: Implement `DrawerStats`**

```jsx
// frontend/src/components/chat/DrawerStats.jsx

// stats: { tokensProcessed, analysisPasses, sourcesReviewed, modelCorrelations }
export function DrawerStats({ stats }) {
  if (!stats) return null;
  const rows = [
    { label: 'Tokens processed',    value: stats.tokensProcessed?.toLocaleString() },
    { label: 'Analysis passes',     value: stats.analysisPasses },
    { label: 'Sources reviewed',    value: stats.sourcesReviewed },
    { label: 'Model correlations',  value: stats.modelCorrelations },
  ].filter(r => r.value != null);

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 10 }}>
        Operational work units
      </div>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: '#374151' }}>
          <span>{r.label}</span>
          <span style={{ fontWeight: 600, color: '#111827' }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implement `EscalationCTA`**

```jsx
// frontend/src/components/chat/EscalationCTA.jsx

// Warm, contextual — never a sales CTA.
// message: string — contextual observation from the system
// telegramUrl: string
// email: string

export function EscalationCTA({ message, telegramUrl, email }) {
  if (!message) return null;

  return (
    <div style={{
      marginTop: 24,
      background: '#f5f3ff',
      border: '1px solid #e0e7ff',
      borderRadius: 10,
      padding: '16px 18px',
    }}>
      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, marginBottom: 14 }}>
        {message}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {telegramUrl && (
          <a href={telegramUrl} target="_blank" rel="noreferrer" style={{
            fontSize: 12, fontWeight: 600, color: '#4f46e5',
            background: '#ede9fe', padding: '6px 14px', borderRadius: 20,
            textDecoration: 'none',
          }}>
            → Telegram
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} style={{
            fontSize: 12, fontWeight: 600, color: '#374151',
            background: '#f3f4f6', padding: '6px 14px', borderRadius: 20,
            textDecoration: 'none',
          }}>
            → Email
          </a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/chat/DrawerStats.jsx frontend/src/components/chat/EscalationCTA.jsx
git commit -m "feat(chat): DrawerStats + EscalationCTA — operational stats and warm escalation"
```

---

## Task 7: `PlusMenu` — context modifier menu (all stubs)

The `+` button opens a popover menu. All items are stubs for MVP — they inject a confirmation bubble but do no backend work.

**Files:**
- Modify: `frontend/src/components/chat/ChatInput.jsx`

- [ ] **Step 1: Add `PlusMenu` inline to `ChatInput.jsx`**

Add a `PlusMenu` above the input form. When an item is selected, call `onContextInject(label)` (provided by Chat.jsx) to append a stub confirmation message.

```jsx
// Add at top of ChatInput.jsx, before the export function:

const PLUS_ITEMS = [
  { id: 'deck',        label: 'Upload deck / pitch',      icon: '📎' },
  { id: 'website',     label: 'Add website',               icon: '🌐' },
  { id: 'aws-bill',    label: 'Add AWS bill',              icon: '☁️' },
  { id: 'linkedin',    label: 'Add LinkedIn',              icon: '🔗' },
  { id: 'deep-scan',   label: 'Deep market scan',          icon: '🔍' },
  { id: 'regional',    label: 'Enable regional analysis',  icon: '🌏' },
  { id: 'competitors', label: 'Compare competitors',       icon: '🔄' },
  { id: 'investors',   label: 'Run investor readiness',    icon: '💼' },
  { id: 'procurement', label: 'Run procurement readiness', icon: '🏢' },
];

function PlusMenu({ onSelect }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Add context"
        style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '1.5px solid #d1d5db',
          background: open ? '#f3f4f6' : '#ffffff',
          color: '#6b7280', fontSize: 18, lineHeight: 1,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        +
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: 40, left: 0,
          background: '#ffffff', border: '1px solid #e5e7eb',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          padding: '8px 0', minWidth: 220, zIndex: 100,
        }}>
          {PLUS_ITEMS.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onSelect(item.label); setOpen(false); }}
              style={{
                display: 'flex', gap: 10, alignItems: 'center',
                width: '100%', padding: '9px 16px',
                background: 'none', border: 'none',
                fontSize: 13, color: '#111827', cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

Then add `onContextInject` prop to `ChatInput` and render `<PlusMenu onSelect={onContextInject} />` at the left of the input row.

Full updated `ChatInput` signature:
```jsx
export function ChatInput({ onSubmit, onContextInject, disabled, messages = [] }) {
```

And the input row becomes:
```jsx
<form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
  <PlusMenu onSelect={onContextInject ?? (() => {})} />
  {/* existing textarea + send button */}
</form>
```

- [ ] **Step 2: Run existing tests to confirm nothing broke**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | tail -20
```
Expected: all existing tests PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/chat/ChatInput.jsx
git commit -m "feat(chat): PlusMenu — context modifier menu stubs in ChatInput"
```

---

## Task 8: `ProfileSelector` — analysis profile selector

An intent-mode pill selector. Sits in the input area. Sends `analysis_profile` to session start.

**Files:**
- Create: `frontend/src/components/chat/ProfileSelector.jsx`
- Modify: `frontend/src/api/client.js`

- [ ] **Step 1: Implement `ProfileSelector`**

```jsx
// frontend/src/components/chat/ProfileSelector.jsx

const PROFILES = [
  { id: 'investor',    label: 'Investor' },
  { id: 'market',      label: 'Market' },
  { id: 'technical',   label: 'Technical' },
  { id: 'compliance',  label: 'Compliance' },
  { id: 'deep',        label: 'Deep' },
  { id: 'fast',        label: 'Fast' },
];

export function ProfileSelector({ value = 'investor', onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
      {PROFILES.map(p => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange?.(p.id)}
          style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            border: '1.5px solid',
            borderColor: value === p.id ? '#4f46e5' : '#e5e7eb',
            background:  value === p.id ? '#ede9fe' : '#ffffff',
            color:       value === p.id ? '#4f46e5' : '#6b7280',
            cursor: 'pointer', transition: 'all 0.1s',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add `analysis_profile` to `startSession` in `client.js`**

Locate the function in `frontend/src/api/client.js` that calls `POST /api/v1/session/start`. Add `analysis_profile` to the request body:

```js
// Before (existing call):
body: JSON.stringify({ url, ... })

// After:
body: JSON.stringify({ url, ..., analysis_profile: profile ?? 'investor' })
```

The endpoint path is `/api/v1/session/start` — note the `/v1/` segment. The backend ignores `analysis_profile` for MVP — this establishes the contract for future routing.

- [ ] **Step 3: Run existing tests**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | tail -20
```
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/chat/ProfileSelector.jsx frontend/src/api/client.js
git commit -m "feat(chat): ProfileSelector + analysis_profile param in session start"
```

---

## Task 9: Chat.jsx refactor — wire all components, remove deprecated

The largest task. Remove `Sidebar`, `Projection`, `TweaksPanel`, `activeSpace`, and `litTiles`. Add `TrustRail`, `MachineDrawer`, `PlusMenu` (via ChatInput), `ProfileSelector`, `useTrustPhase`. Wire `companyData` state and derive graph nodes.

**Files:**
- Modify: `frontend/src/pages/Chat.jsx` (major)

Work through these removals and additions as atomic sub-steps. Verify `npm run build` passes after each one.

### 9a — Remove deprecated imports and state

- [ ] **Step 1: Remove deprecated imports**

Remove these lines from the top of `Chat.jsx`:
```js
import { Sidebar }      from '../components/chat/Sidebar.jsx';
import { Projection }   from '../components/chat/Projections.jsx';
import { TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakSelect, TweakToggle, TweakButton }
  from '../components/chat/TweaksPanel.jsx';
```

- [ ] **Step 2: Remove deprecated state**

Remove from `Chat.jsx` state declarations:
- `const [tweaks, setTweaks] = useTweaks(TWEAK_DEFAULTS);` (or however it's declared)
- `const TWEAK_DEFAULTS = { ... }` constant block
- `const [activeSpace, setActiveSpace] = useState('chat');`
- `const [litTiles, setLitTiles] = useState({});` — it is an object (`{ investor: false, vendors: false, ... }`), not an array
- Any `activeCompany`, `activeHiveStage`, `inChatSpace` derived values used only by Sidebar/Projection

- [ ] **Step 3: Remove deprecated JSX**

Remove from the Chat.jsx render:
- `<Sidebar ... />` usage
- `<TweaksPanel ... />` usage
- The Projection conditional: `{!inChatSpace && <div ...><Projection ... /></div>}`

- [ ] **Step 4: Verify build**

```bash
cd frontend && npm run build 2>&1 | tail -20
```
Expected: clean build (vite build, no errors). Fix any remaining import references.

- [ ] **Step 5: Commit removal**

```bash
git add frontend/src/pages/Chat.jsx
git commit -m "refactor(chat): remove Sidebar, Projection, TweaksPanel — deprecated by new three-layer architecture"
```

### 9b — Add new state and imports

- [ ] **Step 6: Add new imports**

```js
import { TrustRail }           from '../components/chat/TrustRail.jsx';
import { MachineDrawer }       from '../components/chat/MachineDrawer.jsx';
import { GraphView }           from '../components/chat/GraphView.jsx';
import { ProvenanceAccordion } from '../components/chat/ProvenanceAccordion.jsx';
import { DrawerStats }         from '../components/chat/DrawerStats.jsx';
import { EscalationCTA }       from '../components/chat/EscalationCTA.jsx';
import { ProfileSelector }     from '../components/chat/ProfileSelector.jsx';
import { ChatInput }           from '../components/chat/ChatInput.jsx';
import { useTrustPhase }       from '../hooks/useTrustPhase.js';
import { deriveGraphNodes }    from '../utils/deriveGraphNodes.js';
```

> **Important:** Chat.jsx currently has an inline textarea (around lines 918–962) rather than using the `ChatInput` component. Step 12 replaces that inline textarea block with `<ChatInput ...>`. The `ChatInput` component already has `PlusMenu` wired in from Task 7. The import above is essential — without it, Step 12 will fail to compile.

- [ ] **Step 7: Add new state**

```js
const [companyData,     setCompanyData]     = useState(null);
const [inferenceError,  setInferenceError]  = useState(false);
const [analysisProfile, setAnalysisProfile] = useState('investor');
const [drawerStats,     setDrawerStats]     = useState(null);
```

- [ ] **Step 8: Wire `useTrustPhase`**

```js
const userMessageCount = messages.filter(m => m.role === 'user').length;
const trustPhase = useTrustPhase({ phase, inputReady, userMessageCount, companyData });
```

`phase` is already available from `useChatSession` — it uses values `'intro' | 'triage' | 'active'`. Only `'active'` unblocks materialisation.

- [ ] **Step 9: Wire `companyData` from inference response**

Find the existing polling logic that calls `GET /api/session/inferences` (or similar). When the inference response arrives, call:
```js
setCompanyData({
  inferences: inferenceResponse.inferences,
  correctable_fields: inferenceResponse.correctable_fields,
  // gaps and vendors arrive later from /api/session/report
});
```

When the report arrives, merge gaps and vendors:
```js
setCompanyData(prev => prev ? { ...prev, gaps: report.gaps, vendors: report.vendor_intelligence?.vendors } : prev);
```

If inference polling fails or times out, call:
```js
setInferenceError(true);
```

- [ ] **Step 10: Derive graph nodes**

```js
const graphNodes = useMemo(
  () => deriveGraphNodes(companyData?.inferences, companyData),
  [companyData]
);
```

- [ ] **Step 11: Derive drawer stats**

```js
const drawerStatsDerived = companyData ? {
  nodes: graphNodes.length,
  edges: Math.max(0, graphNodes.length - 1),
  models: 2,  // MVP: hardcoded until multi-model routing ships
  sources: companyData.inferences?.length ?? 0,
} : null;
```

### 9c — Add new JSX

- [ ] **Step 12: Replace layout structure**

The Chat.jsx layout should now be:

```jsx
<div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
  {/* Left rail — invisible at t0, ghost at t1, solid at t2+ */}
  <TrustRail
    trustPhase={trustPhase}
    companyData={companyData}
    inferenceError={inferenceError}
  />

  {/* Main surface — full-width chat */}
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingBottom: 48 }}>
    {/* ... existing theatrical opening, messages, ThinkingStream ... */}
    <ProfileSelector value={analysisProfile} onChange={setAnalysisProfile} />
    <ChatInput
      onSubmit={submit}
      onContextInject={label => {
        // Stub: append confirmation bubble
        addPersonaMessages([{
          persona: 'edison', model: 'claude-sonnet-4-6', tok: 0, ms: 0,
          content: `Got it — adding ${label.toLowerCase()} to the analysis context.`,
        }]);
      }}
      disabled={!inputReady || isProcessing}
      messages={messages}
    />
  </div>

  {/* Bottom drawer — machine room */}
  <MachineDrawer trustPhase={trustPhase} stats={drawerStatsDerived}>
    <GraphView nodes={graphNodes} />
    <ProvenanceAccordion trails={[]} />
    <DrawerStats stats={drawerStatsDerived ? {
      tokensProcessed: 18420,   // MVP: placeholder
      analysisPasses: graphNodes.length > 0 ? 2 : 0,
      sourcesReviewed: companyData?.inferences?.length ?? 0,
      modelCorrelations: 2,
    } : null} />
    <EscalationCTA
      message={companyData?.gaps?.length > 2
        ? "There are gaps here that typically benefit from a guided conversation. We can introduce relevant partners."
        : null}
      telegramUrl="https://t.me/ethikslabs"
      email="hello@ethikslabs.com"
    />
  </MachineDrawer>
</div>
```

- [ ] **Step 13: Verify build**

```bash
cd frontend && npm run build 2>&1 | tail -20
```
Expected: clean build.

- [ ] **Step 14: Run all tests**

```bash
cd frontend && npm test -- --reporter=verbose 2>&1 | tail -30
```
Expected: all tests PASS.

- [ ] **Step 15: Commit**

```bash
git add frontend/src/pages/Chat.jsx
git commit -m "feat(chat): wire TrustRail, MachineDrawer, ProfileSelector into Chat.jsx — three-layer architecture live"
```

---

## Task 10: Build verification + smoke test

Manual end-to-end verification before declaring MVP complete.

- [ ] **Step 1: Start the dev server**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173/chat` (or whatever the dev port is).

- [ ] **Step 2: Verify t=0 state**

Checklist:
- No left rail visible
- No drawer handle visible
- Theatrical opening plays (Sophia → Leonardo → Edison)
- Input locked until Edison finishes
- `+` button and profile selector visible in input row

- [ ] **Step 3: Select intent and verify t=0.5**

Click a triage card. Verify:
- FloatQ ambient questions appear
- Input unlocks
- Still no left rail or drawer handle

- [ ] **Step 4: Submit first message and verify t=1**

Type a message and press Enter. Verify:
- Left rail ghost-shimmers in (low opacity, blurred, "Building…" bars)
- Drawer handle appears at bottom ("↑ Graph · building…")
- ThinkingStream begins inline
- FloatQ questions fade out

- [ ] **Step 5: Wait for inference and verify t=2**

Wait for the backend inference to complete (or use mock data if running without API). Verify:
- Left rail crystallises to full opacity with company data
- Drawer handle shows node/edge counts
- Clicking drawer handle opens the 45vh overlay
- GraphView shows node list
- Drawer closes on second handle click

- [ ] **Step 6: Test `+` menu**

Click the `+` button. Verify:
- Menu appears with all items
- Clicking "Upload deck / pitch" injects: "Got it — adding upload deck / pitch to the analysis context."
- Menu closes after selection

- [ ] **Step 7: Test profile selector**

Click different profile pills (Investor, Market, Technical). Verify pill switches state visually.

- [ ] **Step 8: Final build**

```bash
cd frontend && npm run build 2>&1 | tail -10
```
Expected: clean build, no errors.

- [ ] **Step 9: Push**

```bash
git push origin main
```

---

## Done

The three-layer observable trust graph shell is live:
- **t=0** bare chat → **t=1** ghost activation → **t=2** crystallised understanding
- TrustRail materialises as confidence is earned
- MachineDrawer grows as the graph builds beneath the conversation
- `+` menu and profile selector establish the contract for future wiring
- All deprecated components removed: Sidebar, Projection, TweaksPanel

**Post-MVP (next sessions):**
- Wire `+` menu items to `POST /api/session/context`
- Wire `analysis_profile` into signal-extractor routing
- Build force-directed graph (replace node list)
- ProvenanceAccordion with real data from `report_section` events
- DrawerStats with real token counts from API response
