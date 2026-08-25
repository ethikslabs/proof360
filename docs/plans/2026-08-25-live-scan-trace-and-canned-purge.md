# Live Scan Trace + Canned-Content Purge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps.

**Goal:** During a live cold read, stream the real per-probe extraction log into the chat surface ("show the thinking"), collapsing to an accordion when the read completes; and purge all demo-canned content (mock signals strip, mock Edison lens card, hardcoded follow-up chips) from live sessions.

**Architecture:** Frontend-only. The API already streams real log lines over SSE at `GET /api/v1/session/:id/log` (session-log.js — recon per-source lines via `formatReconLine`, scrape lines, Bedrock steps, `{type:'__done__'}` terminator). The frontend cold-read path (Chat.jsx ~1872–1962) subscribes with EventSource and renders a new `ScanTrace` component. Live-session purge extends the existing `inDemoMode` class (Chat.jsx:1473) to the three remaining canned content sources.

**Tech Stack:** React 18 + Vite, vitest + @testing-library/react (existing test setup in `frontend/tests/unit/`).

**Branch:** `feat/memory-store-facade` (continues the demo-week wave at 6bc3f83).

## Global Constraints (from INVARIANTS.md + landing emotional contract — both constitutional)

- **No canned text in live sessions** (INVARIANTS no-canned-text rule). A live session (`inDemoMode === false`) must never render `MOCK_SIGNALS`, `MOCK_GUIDANCE_BLOCK`, or `FOLLOW_UPS` content.
- **Honest degradation:** the scan trace renders exactly the lines the API sends — failed/skipped probes shown as failed/skipped, never suppressed, never invented.
- **Demo/workspace boundary:** demo furniture stays fully intact in demo mode (`inDemoMode === true`). Nothing in this plan changes demo-mode rendering.
- **Secondary text color ≥ #94a3b8** (contrast rule).
- **The gate variable is `inDemoMode` (Chat.jsx:1473: `isDemoMode && !liveSessionId`)** — never raw `isDemoMode`.
- Reuse existing style idioms in Chat.jsx (inline style objects, `tk` tokens, IBM Plex Mono for terminal-ish text).

---

### Task 1: ScanTrace component + SSE subscription in the cold-read path

**Files:**
- Create: `frontend/src/components/chat/ScanTrace.jsx`
- Modify: `frontend/src/pages/Chat.jsx` (cold-read block ~1872–1962; render site near the status message in the message list)
- Test: `frontend/tests/unit/ScanTrace.test.jsx`

**Interfaces:**
- Produces: `<ScanTrace lines={scanLines} done={scanDone} tk={tk} />`
  - `lines`: array of `{ text, type }` — `type` ∈ `'cmd'|'ok'|'err'|'muted'|'query'|'blank'|'recon'` (recon lines also carry `source`, `color`; use `line.color ?? line.type` for coloring).
  - `done`: boolean — false = streaming (all lines visible, live); true = collapsed accordion.
- Consumes: SSE endpoint `GET /api/v1/session/${session_id}/log` (relative URL — rides the Vite proxy). Each event's `data` is JSON; `{type:'__done__'}` ends the stream.

**Component behavior:**
- While `done === false`: render a bordered monospace block (IBM Plex Mono, fontSize 11) with every line, colored: `ok`→`#2f9b69`, `err`→`#c84b4b`, `query`→`#b0956e`, `muted`/default→`#94a3b8`, `cmd`→`tk.ink`; `blank` renders an empty line. Auto-scroll to bottom on new lines (ref + scrollTop). Header row: `SCANNING · live` label, 10px uppercase letterspaced.
- When `done === true`: collapse to a single summary row — `▸ Scan trace · {lines.filter(l => l.type !== 'blank' && l.type !== 'cmd').length} steps` — clickable (useState open, default closed). Open state shows the same full line block with `▾`.
- Render nothing if `lines.length === 0`.

- [ ] **Step 1: Write the failing tests**

```jsx
// frontend/tests/unit/ScanTrace.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScanTrace } from '../../src/components/chat/ScanTrace.jsx';

const tk = { ink: '#111', inkSoft: '#94a3b8', hairline: '#e5e5e5', bg: '#fff' };
const LINES = [
  { text: '$ proof360 --url acme.com', type: 'cmd' },
  { text: '[dns]       DMARC enforced · SPF pass', type: 'recon', color: 'ok' },
  { text: '[ssllabs]   error · skipped', type: 'recon', color: 'muted' },
];

describe('ScanTrace', () => {
  it('renders nothing with no lines', () => {
    const { container } = render(<ScanTrace lines={[]} done={false} tk={tk} />);
    expect(container.innerHTML).toBe('');
  });

  it('streams all lines while not done', () => {
    render(<ScanTrace lines={LINES} done={false} tk={tk} />);
    expect(screen.getByText(/DMARC enforced/)).toBeInTheDocument();
    expect(screen.getByText(/error · skipped/)).toBeInTheDocument();
  });

  it('collapses to an accordion when done, expands on click', () => {
    render(<ScanTrace lines={LINES} done={true} tk={tk} />);
    expect(screen.queryByText(/DMARC enforced/)).not.toBeInTheDocument();
    const summary = screen.getByText(/Scan trace/);
    fireEvent.click(summary);
    expect(screen.getByText(/DMARC enforced/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests, verify they fail** — `cd frontend && npx vitest run tests/unit/ScanTrace.test.jsx` → FAIL (module not found).

- [ ] **Step 3: Implement `ScanTrace.jsx`** per the behavior spec above. Export named `ScanTrace`.

- [ ] **Step 4: Wire into Chat.jsx.** In the Chat component add state:

```js
const [scanLines, setScanLines] = useState([]);
const [scanDone, setScanDone]   = useState(false);
```

In the cold-read block, immediately after `spine.rememberSessionId(session_id)` (line ~1891), open the stream:

```js
setScanLines([]); setScanDone(false);
const es = new EventSource(`/api/v1/session/${session_id}/log`);
es.onmessage = (ev) => {
  try {
    const line = JSON.parse(ev.data);
    if (line.type === '__done__') { setScanDone(true); es.close(); return; }
    setScanLines(prev => [...prev, line]);
  } catch { /* malformed line — drop */ }
};
es.onerror = () => { setScanDone(true); es.close(); };
```

Also set `setScanDone(true)` in the cold-read `catch` block (failed read must not leave a live-streaming block). Replace the status-message copy `Scanning ${domain} — this takes about 30 seconds…` with `Reading ${domain} — watch the scan below…`.

Render site: in the message map (Chat.jsx ~2694–2707), after the `<Bubble>` whose `m.id` starts with `'status-'`, render the trace:

```jsx
{m.id.startsWith('status-') && (
  <ScanTrace lines={scanLines} done={scanDone} tk={tk} />
)}
```

Import: `import { ScanTrace } from '../components/chat/ScanTrace.jsx';`

- [ ] **Step 5: Run tests** — `npx vitest run tests/unit/ScanTrace.test.jsx` → PASS; then full frontend suite `npx vitest run` → no regressions.

- [ ] **Step 6: Commit** — `feat(chat): live scan trace — stream session log SSE during cold read, accordion on complete`

### Task 2: Purge canned content from live sessions

**Files:**
- Modify: `frontend/src/hooks/useSignals.js` (expose `replaceSignals`)
- Modify: `frontend/src/pages/Chat.jsx` (cold-read success ~1922; firehose live start ~2046 area — locate `setShortlist([])` calls; lens card block ~2671–2683; FollowUpChips block ~2746–2756)
- Test: `frontend/tests/unit/live-purge.test.jsx` (component-level where feasible) + extend existing patterns

**Interfaces:**
- Produces: `replaceSignals(nextSignals)` from `useSignals()` — wholesale replaces the signals array.
- Consumes: `analysis.inferences` (array from `POST /analyze`; items carry at minimum a statement/text field — map defensively: `inf.statement ?? inf.text ?? inf.value ?? String(inf)`), `makeObservedSignal` from `src/rendering/protocol.js`, `inDemoMode` (Chat.jsx:1473).

- [ ] **Step 1: Expose `replaceSignals` in useSignals.js**

```js
const replaceSignals = useCallback((next) => { setSignals(next ?? []); }, []);
// add to the returned object
```

- [ ] **Step 2: Swap signals at both live starts.** In the cold-read success path, next to `setShortlist([])` (line ~1922):

```js
const liveSignals = (analysis.inferences ?? []).map(inf => makeObservedSignal({
  value: inf.statement ?? inf.text ?? inf.value ?? '',
  domain: inf.domain ?? 'compliance',
  polarity: inf.polarity ?? 'gap',
  source: 'url_scrape',
  confidence: inf.confidence ?? 0.6,
})).filter(s => s.value);
replaceSignals(liveSignals);
```

At the firehose live start (the other `setShortlist([])`), call `replaceSignals([])` (no analysis payload there). Destructure `replaceSignals` from the existing `useSignals()` call; import `makeObservedSignal` if not already imported in Chat.jsx.

- [ ] **Step 3: Gate the mock Edison lens card.** Wrap the `Edison · operational lens` block (~2671–2683, the `MOCK_GUIDANCE_BLOCK` render) in `{inDemoMode && ( ... )}`.

- [ ] **Step 4: Gate the canned follow-up chips.** In the FollowUpChips render condition (~2747), add `inDemoMode &&` so chips never show in live sessions: `{!isProcessing && hasMessages && inDemoMode && (() => { ... })()}`.

- [ ] **Step 5: Tests.** Unit-test `replaceSignals` via a small harness component using `useSignals` (renders `signals.length`; effect calls `replaceSignals([])`; assert 0 after replace while MOCK seed was non-zero). Add an assertion file `live-purge.test.jsx` covering: (a) `replaceSignals` replaces wholesale; (b) mapping of a sample `analysis.inferences` array through the Step-2 mapper produces signals with `source: 'url_scrape'` and drops empty statements. (Full-page Chat.jsx render is out of test scope — it is not covered by existing harnesses either.)

- [ ] **Step 6: Run suite** — `cd frontend && npx vitest run` → all pass.

- [ ] **Step 7: Commit** — `fix(chat): purge canned demo content from live sessions — live signals from analysis, lens card + follow-ups demo-gated (INVARIANTS no-canned-text)`
