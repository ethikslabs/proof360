# Companion Panel + Context-at-Add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every add-to-shortlist Move captures the conversational moment it happened in (dated, span pointers, cross-lane recent events, derived note marked inferred), and the shortlist renders in a persistent floating companion panel that visibly accumulates during conversation.

**Architecture:** Backend: one pure helper (`momentContext`) in the existing `shortlist.js` handler enriches `reason.context` on both add paths — pointers and a deterministically derived note, never raw transcript (transcript-evidence gate). Frontend: a new `CompanionPanel.jsx` is a **pure projection** of state Chat.jsx already holds (`serverShortlist`, `recordClaims`, demo items) — fixed-position, collapsible, no state of its own beyond open/closed. The inline `VendorShortlist` block moves inside it.

**Tech Stack:** Node/Fastify + vitest (api), React 18 + Vite + vitest/jsdom (frontend). No new dependencies.

## Global Constraints

- Spec: `_working/01_SPECS/2026-08-24-sarvesh-demo-week-shortlist-panel-design.md` (ETHL-WRK-SPEC-012); rides ETHL-WRK-SPEC-011 P2 (already built: `api/src/handlers/shortlist.js`).
- `INVARIANTS.md` is constitutional — §1 (no stored copy; every string a projection), §3 (shortlist = reasoning provenance), §4 (demo/workspace visually distinct — amber `Example company` label in demo mode), §5 (no pressure CTAs). Read it before touching `frontend/`.
- The panel holds **no state of its own** — projection, not destination (SPEC-012 §0).
- Derived note is deterministic v1 — **no LLM call** at add-time; marked `note_status: 'inferred'` and rendered with an INFERRED pill.
- Raw transcript text never enters the Move beyond a ≤90-char excerpt inside the derived note; spans are pointers (`{turn, role, ts}`) only.
- Verb is "Add to shortlist"; the word "buy" never appears; no rank-by-margin.
- New secondary text color ≥ `#94a3b8` (John contrast rule); do not restyle existing code.
- Append-only: never mutate existing Move records; context lands only on newly minted Moves.
- Commit after every green task; push to the current branch (`feat/memory-store-facade`).

---

### Task 1: `momentContext` — capture the moment on both add paths (API)

**Files:**
- Modify: `api/src/handlers/shortlist.js` (add helper + wire into `shortlistAddHandler` ~line 140 and `acceptProposal` ~line 82)
- Test: `api/tests/unit/moment-context.test.js` (create)
- Test: `api/tests/unit/acceptance-walk.test.js` (add one assertion)

**Interfaces:**
- Consumes: `getSession/updateSession/createSession` (`../services/session-store.js`), `claimsProjection`, `cerProjection`, `sessionRecordSnapshot` — all already imported in `shortlist.js`.
- Produces: `export function momentContext(session)` → `{ at: string(ISO), turn: number, spans: [{turn, role, ts}], recent: [{kind:'claim',field,status}|{kind:'move',name,at}], note: string, note_status: 'inferred' }`. Frontend (Task 2) reads it at `move.reason.context`.

- [ ] **Step 1: Write the failing test**

```js
// api/tests/unit/moment-context.test.js
// Context-at-add (ETHL-WRK-SPEC-012 §3.2; INVARIANTS §3 made mechanical): every
// minted Move carries the conversational moment — pointers + a derived note,
// never raw transcript.
import { describe, it, expect } from 'vitest';
import { createSession, updateSession, getSession } from '../../src/services/session-store.js';
import { shortlistAddHandler, momentContext } from '../../src/handlers/shortlist.js';

function replyMock() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    send(payload) { this.payload = payload; return payload; },
  };
}

function seededSession(chatHistory = []) {
  const session = createSession({ website_url: 'https://acme.example' });
  updateSession(session.id, {
    infer_status: 'complete',
    company_name: 'Acme',
    chat_history: chatHistory,
  });
  return getSession(session.id);
}

async function add(sessionId, body) {
  const reply = replyMock();
  await shortlistAddHandler({ params: { id: sessionId }, body }, reply);
  return reply;
}

describe('momentContext', () => {
  it('captures the conversational moment on a universal add', async () => {
    const session = seededSession([
      { role: 'user', content: 'We need HIPAA for hospitals in Uganda', ts: 1000 },
      { role: 'assistant', content: 'HIPAA applies to US-regulated data …', ts: 2000 },
    ]);
    const reply = await add(session.id, { name: 'Vanta' });
    expect(reply.statusCode).toBe(201);
    const ctx = reply.payload.move.reason.context;
    expect(ctx.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(ctx.turn).toBe(2);
    expect(ctx.spans).toEqual([
      { turn: 0, role: 'user', ts: 1000 },
      { turn: 1, role: 'assistant', ts: 2000 },
    ]);
    expect(ctx.note).toContain('HIPAA for hospitals in Uganda');
    expect(ctx.note_status).toBe('inferred');
  });

  it('derives an honest note when there is no conversation', async () => {
    const session = seededSession([]);
    const reply = await add(session.id, { name: 'SomeTool' });
    const ctx = reply.payload.move.reason.context;
    expect(ctx.turn).toBe(0);
    expect(ctx.spans).toEqual([]);
    expect(ctx.note).toBe('Added outside a conversation');
  });

  it('cross-lane recent: a prior Move appears in the next add’s context', async () => {
    const session = seededSession([
      { role: 'user', content: 'Compliance first, then insurance', ts: 1000 },
    ]);
    await add(session.id, { name: 'Vanta' });
    const reply = await add(getSession(session.id).id, { name: 'SomeTool' });
    const ctx = reply.payload.move.reason.context;
    expect(ctx.recent.some((r) => r.kind === 'move' && r.name === 'Vanta')).toBe(true);
    expect(ctx.note).toContain('Vanta');
  });

  it('excerpt is bounded — a long message never leaks whole into the note', async () => {
    const long = 'x'.repeat(500);
    const session = seededSession([{ role: 'user', content: long, ts: 1000 }]);
    const reply = await add(session.id, { name: 'SomeTool' });
    expect(reply.payload.move.reason.context.note.length).toBeLessThan(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && npx vitest --run tests/unit/moment-context.test.js`
Expected: FAIL — `momentContext` is not exported / `reason.context` undefined.

- [ ] **Step 3: Implement `momentContext` and wire both add paths**

In `api/src/handlers/shortlist.js`, below `shortlistSnapshot`:

```js
function excerpt(text, max) {
  const t = String(text).replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

// The conversational moment, captured at add-time (ETHL-WRK-SPEC-012 §3.2;
// INVARIANTS §3 on the API side). Span POINTERS + a derived note only — the
// transcript-evidence gate: raw transcript never travels beyond a bounded excerpt.
export function momentContext(session) {
  const history = session.chat_history || [];
  const turn = history.length;
  const start = Math.max(0, turn - 4);
  const spans = history.slice(start).map((m, i) => ({ turn: start + i, role: m.role, ts: m.ts }));
  const lastUser = [...history].reverse().find((m) => m.role === 'user');

  const recentClaims = claimsProjection(sessionRecordSnapshot(session))
    .filter((c) => c.status === 'confirmed' || c.status === 'corrected')
    .slice(-3)
    .map((c) => ({ kind: 'claim', field: c.field, status: c.status }));
  const priorMoves = cerProjection(shortlistSnapshot(session))
    .slice(-2)
    .map((m) => ({ kind: 'move', name: m.item?.name ?? m.route, at: m.created_at }));

  const parts = [];
  if (lastUser) parts.push(`while discussing “${excerpt(lastUser.content, 90)}”`);
  if (recentClaims.length) {
    const fields = recentClaims.map((c) => c.field.split('.').pop().replace(/_/g, ' '));
    parts.push(`recently confirmed: ${fields.join(', ')}`);
  }
  if (priorMoves.length) parts.push(`already on the shortlist: ${priorMoves.map((m) => m.name).join(', ')}`);

  return {
    at: new Date().toISOString(),
    turn,
    spans,
    recent: [...recentClaims, ...priorMoves],
    note: parts.length ? `Added ${parts.join('; ')}` : 'Added outside a conversation',
    note_status: 'inferred',
  };
}
```

Wire it — in `shortlistAddHandler`'s `buildCerRecords` call, extend `reason`:

```js
    reason: {
      trigger_id: null,
      trigger: null,
      claims_cited: [],
      gaps_cited: [],
      text: request.body?.why || `Added from ${request.body?.source || 'discovery'}`,
      user_text: null,
      discussed_in: session.id,
      context: momentContext(session),
    },
```

And identically in `acceptProposal`'s `reason` object: add `context: momentContext(session),` after `discussed_in: session.id,`.

- [ ] **Step 4: Run tests to verify green, including the standing suite**

Run: `cd api && npx vitest --run tests/unit/moment-context.test.js && npx vitest --run`
Expected: new file 4 passed; full suite 268 passed (264 + 4), 0 failed.

- [ ] **Step 5: Add the trigger-path assertion**

In `api/tests/unit/acceptance-walk.test.js`, find the assertion block on the accepted Move (`result.move` / `move.reason`) and add:

```js
    expect(move.reason.context.note_status).toBe('inferred');
    expect(typeof move.reason.context.at).toBe('string');
```

Run: `cd api && npx vitest --run tests/unit/acceptance-walk.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/src/handlers/shortlist.js api/tests/unit/moment-context.test.js api/tests/unit/acceptance-walk.test.js
git commit -m "feat(shortlist): context-at-add — every Move captures its conversational moment (SPEC-012 §3.2)"
```

---

### Task 2: Flow context to the panel items (frontend data)

**Files:**
- Modify: `frontend/src/pages/Chat.jsx` (~line 1505, `shortlistPanelItems`)

**Interfaces:**
- Consumes: `move.reason.context` from Task 1 (via existing `spine.getShortlist` / `spine.addToShortlist` — reason already travels whole; no api-client change needed).
- Produces: each panel item gains `context: { at, note, note_status } | null` — Task 3 renders it.

- [ ] **Step 1: Map the context**

In `shortlistPanelItems`, extend the server-Move mapping:

```js
    ...serverShortlist.map(m => ({
      id: m.cer_id,
      name: m.item?.name ?? m.label ?? m.route,
      category: m.item?.category ?? m.pathway_type,
      synthesis: m.reason?.user_text || m.reason?.text || null,
      context: m.reason?.context ?? null,
      timing: 'now',
      cta: m.cta,
      url: m.item?.url ?? null,
      provenance: { added_at: m.created_at },
    })),
```

- [ ] **Step 2: Lint**

Run: `cd frontend && npm run lint`
Expected: clean (pre-existing warnings unchanged).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Chat.jsx
git commit -m "feat(chat): shortlist panel items carry the Move's conversational context"
```

---

### Task 3: Render the moment on the card

**Files:**
- Modify: `frontend/src/components/chat/VendorShortlist.jsx` (inside the `isShortlisted` branch, after the `Added {date}` span)
- Test: `frontend/tests/unit/VendorShortlist.context.test.jsx` (create)

**Interfaces:**
- Consumes: `shortlistEntry.context` from Task 2.
- Produces: visible context line + INFERRED pill (Task 4 wraps this component unchanged).

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/tests/unit/VendorShortlist.context.test.jsx
// INVARIANTS §3: the shortlist is reasoning provenance — "why this mattered at the
// moment you saw it", with inferred honestly labelled.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VendorShortlist } from '../../src/components/chat/VendorShortlist.jsx';

const move = {
  id: 'cer-1',
  name: 'Vanta',
  category: 'compliance',
  synthesis: 'Closes the SOC 2 gap',
  timing: 'now',
  context: {
    at: '2026-08-24T02:00:00.000Z',
    note: 'Added while discussing “HIPAA for hospitals in Uganda”',
    note_status: 'inferred',
  },
  provenance: { added_at: '2026-08-24T02:00:00.000Z' },
};

describe('VendorShortlist context line', () => {
  it('renders the derived note with an INFERRED pill', () => {
    render(<VendorShortlist vendors={[move]} shortlistedIds={[move]} onShortlist={() => {}} />);
    expect(screen.getByText(/HIPAA for hospitals in Uganda/)).toBeTruthy();
    expect(screen.getByText('INFERRED')).toBeTruthy();
  });

  it('renders nothing extra when a move has no context', () => {
    const bare = { ...move, id: 'cer-2', name: 'Duo', context: null };
    render(<VendorShortlist vendors={[bare]} shortlistedIds={[bare]} onShortlist={() => {}} />);
    expect(screen.queryByText('INFERRED')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest --run tests/unit/VendorShortlist.context.test.jsx`
Expected: FAIL — INFERRED not found.

- [ ] **Step 3: Implement the context line**

In `VendorShortlist.jsx`, inside the shortlisted branch, insert **after** the closing of the `Added {date}` conditional span (and before the CTA IIFE), a sibling block — note it must sit outside the flex row to wrap fully, so place it directly under the synthesis `<p>` instead:

```jsx
                  {shortlistEntry?.context?.note && (
                    <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', margin: '0 0 8px' }}>
                      {shortlistEntry.context.note}
                      {shortlistEntry.context.note_status === 'inferred' && (
                        <span style={{
                          marginLeft: 6, fontSize: 9, fontStyle: 'normal', letterSpacing: '0.06em',
                          color: '#eab308', border: '1px solid #eab30855', borderRadius: 4, padding: '1px 4px',
                        }}>INFERRED</span>
                      )}
                    </p>
                  )}
```

(`shortlistEntry` is already computed per card; move its `const` declaration above the synthesis `<p>` if it currently sits lower.)

- [ ] **Step 4: Run tests + lint**

Run: `cd frontend && npx vitest --run tests/unit/VendorShortlist.context.test.jsx && npm run lint`
Expected: 2 passed; lint clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/chat/VendorShortlist.jsx frontend/tests/unit/VendorShortlist.context.test.jsx
git commit -m "feat(shortlist): render the conversational moment on each card, inferred honestly labelled"
```

---

### Task 4: The companion panel — floating, persistent, projection-only

**Files:**
- Create: `frontend/src/components/chat/CompanionPanel.jsx`
- Modify: `frontend/src/pages/Chat.jsx` (remove the inline `{shortlistPanelItems.length > 0 && (<VendorShortlist …/>)}` block ~line 2674; add `<CompanionPanel …/>` as the LAST child inside the top-level `<ShortlistContext.Provider>` wrapper so it never unmounts between messages)
- Test: `frontend/tests/unit/CompanionPanel.smoke.test.jsx` (create)

**Interfaces:**
- Consumes: `shortlistPanelItems` (Task 2 shape), `recordClaims` (existing state), `isDemoMode` (existing), `handleShortlist`, `handleDefer`.
- Produces: `export function CompanionPanel({ items, claims, isDemoMode, onShortlist, onDefer })`.

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/tests/unit/CompanionPanel.smoke.test.jsx
// SPEC-012 §0: the panel is a projection, not a destination — no state of its own
// beyond open/closed; the record count is derived from props on every render.
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompanionPanel } from '../../src/components/chat/CompanionPanel.jsx';

const item = {
  id: 'cer-1', name: 'Vanta', category: 'compliance', synthesis: 'why', timing: 'now',
  context: { at: '2026-08-24T02:00:00.000Z', note: 'Added while discussing SOC 2', note_status: 'inferred' },
  provenance: { added_at: '2026-08-24T02:00:00.000Z' },
};

describe('CompanionPanel', () => {
  it('renders the record count from props (moves + claims)', () => {
    render(<CompanionPanel items={[item]} claims={[{ claim_id: 'c1' }, { claim_id: 'c2' }]}
      isDemoMode={false} onShortlist={() => {}} onDefer={() => {}} />);
    expect(screen.getByText(/Your record · 3 entries/)).toBeTruthy();
    expect(screen.getByText('Vanta')).toBeTruthy();
  });

  it('collapses to a chip and reopens', () => {
    render(<CompanionPanel items={[item]} claims={[]} isDemoMode={false}
      onShortlist={() => {}} onDefer={() => {}} />);
    fireEvent.click(screen.getByLabelText('Collapse record panel'));
    expect(screen.queryByText('Vanta')).toBeNull();
    fireEvent.click(screen.getByLabelText('Open record panel'));
    expect(screen.getByText('Vanta')).toBeTruthy();
  });

  it('marks demo mode per the demo/workspace boundary (INVARIANTS §4)', () => {
    render(<CompanionPanel items={[item]} claims={[]} isDemoMode={true}
      onShortlist={() => {}} onDefer={() => {}} />);
    expect(screen.getByText(/Example company/)).toBeTruthy();
  });

  it('renders nothing at all when the record is empty', () => {
    const { container } = render(<CompanionPanel items={[]} claims={[]} isDemoMode={false}
      onShortlist={() => {}} onDefer={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest --run tests/unit/CompanionPanel.smoke.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement CompanionPanel**

```jsx
// CompanionPanel — the floating living-record surface (ETHL-WRK-SPEC-012 §3;
// canon 2026-08-24 "the companion panel", working name). A PROJECTION, not a
// destination: it owns nothing but open/closed; every visible fact derives from
// props on each render. Renders null when the record is empty (INVARIANTS §5 —
// nothing to show, no pressure to fill it).
import { useState } from 'react';
import { VendorShortlist } from './VendorShortlist.jsx';

export function CompanionPanel({ items, claims, isDemoMode, onShortlist, onDefer }) {
  const [open, setOpen] = useState(true);
  const count = (items?.length ?? 0) + (claims?.length ?? 0);
  if (count === 0) return null;

  const shell = {
    position: 'fixed', right: 16, bottom: 16, zIndex: 40,
    fontFamily: '"IBM Plex Mono", monospace',
  };

  if (!open) {
    return (
      <div style={shell}>
        <button
          aria-label="Open record panel"
          onClick={() => setOpen(true)}
          style={{
            padding: '8px 14px', borderRadius: 20, cursor: 'pointer',
            background: '#0f172a', color: '#94a3b8', border: '1px solid #1e293b',
            fontSize: 12,
          }}
        >
          Your record · {count}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      ...shell, width: 340, maxWidth: 'calc(100vw - 32px)', maxHeight: '60vh',
      display: 'flex', flexDirection: 'column',
      background: '#0b1220', border: '1px solid #1e293b', borderRadius: 12,
      boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', borderBottom: '1px solid #1e293b',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>
          Your record · {count} entries
        </span>
        {isDemoMode && (
          <span style={{
            fontSize: 9, letterSpacing: '0.06em', color: '#f59e0b',
            border: '1px solid #f59e0b55', borderRadius: 4, padding: '1px 5px',
          }}>Example company</span>
        )}
        <button
          aria-label="Collapse record panel"
          onClick={() => setOpen(false)}
          style={{
            marginLeft: 'auto', background: 'transparent', border: 'none',
            color: '#94a3b8', cursor: 'pointer', fontSize: 14, lineHeight: 1,
          }}
        >—</button>
      </div>
      <div style={{ overflowY: 'auto', padding: '12px 14px 4px' }}>
        <VendorShortlist
          vendors={items}
          shortlistedIds={items}
          onShortlist={onShortlist}
          onDefer={onDefer}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire into Chat.jsx**

1. `import { CompanionPanel } from '../components/chat/CompanionPanel.jsx';` beside the VendorShortlist import (line ~27).
2. Delete the inline block at ~2674: `{shortlistPanelItems.length > 0 && ( <VendorShortlist … /> )}` (the whole conditional, including its comment).
3. Add, as the last child before `</ShortlistContext.Provider>`:

```jsx
      <CompanionPanel
        items={shortlistPanelItems}
        claims={recordClaims}
        isDemoMode={isDemoMode}
        onShortlist={handleShortlist}
        onDefer={handleDefer}
      />
```

(If the variable carrying demo state has a different name at that scope, use the same one the ObservationStrip receives as `isDemoMode`.)

- [ ] **Step 5: Run the full frontend suite + lint**

Run: `cd frontend && npx vitest --run && npm run lint`
Expected: all suites pass (including existing Mel + chat smokes); lint clean.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/chat/CompanionPanel.jsx frontend/src/pages/Chat.jsx frontend/tests/unit/CompanionPanel.smoke.test.jsx
git commit -m "feat(chat): the companion panel — floating living-record projection (SPEC-012, canon 2026-08-24)"
```

---

### Task 5: Full verification at HEAD

**Files:** none (verification only)

- [ ] **Step 1: Both suites**

Run: `cd api && npx vitest --run && cd ../frontend && npx vitest --run && npm run build`
Expected: api 268+ passed; frontend all passed; production build succeeds.

- [ ] **Step 2: Estate conformance**

Run: from `~/Projects`, `/verify proof360` (or `node CONTROL/scripts/verify-repo.mjs proof360 --quick` if outside a session).
Expected: no failures beyond the known not-checked entries; report failures-only.

- [ ] **Step 3: Push**

```bash
git push origin feat/memory-store-facade
```

---

## Follow-on (estate lane, not proof360 code — tracked in SPEC-012 §5–6)

1. `ethiks360-aeo-baseline` CORPUS object has no vectors/evidence — diagnose why the flywheel skips it (likely its doc `type: working`); fold it into retrieval or record the exclusion as deliberate.
2. Demo runbook — written after this plan proves out, against the live surfaces.
3. SARVESH.md / Task 7 pointer refresh once the recording exists.
