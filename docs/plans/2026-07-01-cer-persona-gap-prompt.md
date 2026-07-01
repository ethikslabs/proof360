# CER Persona Gap-Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a CER is forming and a required field is missing, the fitting persona lens asks for it in conversation; the founder's reply (name or URL) fills the field so the flow reaches the agency card — no form, no weakened gate.

**Architecture:** Pure logic (`cerPathways.js`) decides which field is missing, which lens owns it, and how to interpret the reply. State (`useCer.js`) holds an `awaitingField` flag. Orchestration (`Chat.jsx`) injects the persona prompt at route-confirm and captures the next reply into the founder entity.

**Tech Stack:** React (Vite), Vitest, existing proof360 founder-memory event path.

## Global Constraints

- Persona speaks as a **lens, not an assistant** (INVARIANTS.md §6) — precise, unhurried, no "happy to help".
- **No form field.** The ask is a chat message; the answer is a chat message.
- **One ask per message**; fires **only when blocking** (route confirmed + a promptable gate missing).
- MVP scope: the **`company`** prompt only; `FIELD_LENS` map is extensible for `contact`/`need` later.
- Persona ids match `tokens.js` `PERSONA` keys: `sofia`, `edison`, `leonardo`.
- Branch: `feat/cer-persona-gap-prompt` (off `feat/cer-conversation-flow`). Do NOT touch PR #5's committed files' behaviour beyond these additions.

---

### Task 1: Pure gap-detection + reply-capture logic (`cerPathways.js`)

**Files:**
- Modify: `frontend/src/utils/cerPathways.js` (append exports)
- Test: `frontend/tests/unit/cerPathways.test.js` (append describe blocks)

**Interfaces:**
- Consumes: existing `cerBuildFields(...)` output shape `[{ key, label, value, state }]` where `state ∈ 'done'|'live'|'wait'`.
- Produces:
  - `FIELD_LENS: Record<string, { persona, prompt, factField: string|null, profileKey: string|null }>`
  - `firstMissingGate(fields) → { field, persona, prompt, factField, profileKey } | null`
  - `awaitedCapture(field, text) → { kind: 'url' } | { kind: 'value', field, value, factField, profileKey }`

- [ ] **Step 1: Write the failing tests**

Append to `frontend/tests/unit/cerPathways.test.js`:

```js
import { FIELD_LENS, firstMissingGate, awaitedCapture } from '../../src/utils/cerPathways.js';

describe('firstMissingGate', () => {
  const fields = (overrides) => ([
    { key: 'company', state: 'done' }, { key: 'contact', state: 'done' },
    { key: 'need', state: 'done' }, { key: 'route', state: 'done' },
    { key: 'consent', state: 'wait' }, { key: 'visibility', state: 'done' },
  ].map((f) => ({ ...f, ...(overrides[f.key] ? { state: overrides[f.key] } : {}) })));

  it('returns the company lens entry when company is missing', () => {
    const g = firstMissingGate(fields({ company: 'wait' }));
    expect(g.field).toBe('company');
    expect(g.persona).toBe('sofia');
    expect(g.prompt).toMatch(/company/i);
    expect(g.factField).toBe('company_name');
    expect(g.profileKey).toBe('name');
  });

  it('prioritises company over contact when both are missing', () => {
    expect(firstMissingGate(fields({ company: 'wait', contact: 'wait' })).field).toBe('company');
  });

  it('returns null when all promptable gates are present (consent is not promptable)', () => {
    expect(firstMissingGate(fields({}))).toBeNull();
  });
});

describe('awaitedCapture', () => {
  it('treats a URL reply as a cold-read handoff, not a literal name', () => {
    expect(awaitedCapture('company', 'we are at acme.com').kind).toBe('url');
    expect(awaitedCapture('company', 'https://foo.io').kind).toBe('url');
  });
  it('treats plain text as the field value with its fact mapping', () => {
    const c = awaitedCapture('company', '  Acme Robotics ');
    expect(c).toMatchObject({ kind: 'value', field: 'company', value: 'Acme Robotics', factField: 'company_name', profileKey: 'name' });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest --run tests/unit/cerPathways.test.js`
Expected: FAIL — `FIELD_LENS`/`firstMissingGate`/`awaitedCapture` are not exported.

- [ ] **Step 3: Implement**

Append to `frontend/src/utils/cerPathways.js`:

```js
// Which lens owns each promptable gate field, the ask it makes, and how a captured
// reply maps onto the founder entity. Extensible: add entries to prompt more fields.
export const FIELD_LENS = {
  company: {
    persona: 'sofia',
    prompt: "Before I set this up — what's the company called? A name, a website, or a deck all work.",
    factField: 'company_name',
    profileKey: 'name',
  },
  contact: {
    persona: 'sofia',
    prompt: 'And who should I put as the contact on this?',
    factField: null,
    profileKey: null,
  },
  need: {
    persona: 'edison',
    prompt: "What's the gap you're trying to close here?",
    factField: null,
    profileKey: null,
  },
};

// Promptable gates, in ask-priority order. route/visibility are gates but never prompted
// (system-proposed / derived); consent is the agency card, not a prompt.
const GATE_PROMPT_PRIORITY = ['company', 'contact', 'need'];

export function firstMissingGate(fields) {
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
  for (const key of GATE_PROMPT_PRIORITY) {
    if (byKey[key] && byKey[key].state !== 'done') {
      return { field: key, ...FIELD_LENS[key] };
    }
  }
  return null;
}

const URL_RE = /https?:\/\/|\b[\w-]+\.(?:com|io|ai|co|net|org|dev|app)\b/i;

// Resolve a founder's reply to an awaited-field prompt. A URL means "read this"
// (hand to the existing cold-read path); otherwise the text is the field's value.
export function awaitedCapture(field, text) {
  if (URL_RE.test(text)) return { kind: 'url' };
  const lens = FIELD_LENS[field] || {};
  return { kind: 'value', field, value: String(text).trim(), factField: lens.factField || null, profileKey: lens.profileKey || null };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest --run tests/unit/cerPathways.test.js`
Expected: PASS (existing cerPathways tests + the 5 new ones).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/cerPathways.js frontend/tests/unit/cerPathways.test.js
git commit -m "feat(cer): gap detection + reply capture logic (firstMissingGate, awaitedCapture)"
```

---

### Task 2: `awaitingField` state in `useCer`

**Files:**
- Modify: `frontend/src/hooks/useCer.js`
- Test: `frontend/tests/unit/useCer.test.jsx` (append)

**Interfaces:**
- Produces (added to the hook's return object): `awaitingField: string | null`, `awaitField(field: string): void`, `clearAwaiting(): void`.
- `dismissForming()` and `confirmCer()` also clear `awaitingField`.

- [ ] **Step 1: Write the failing tests**

Append to `frontend/tests/unit/useCer.test.jsx`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest --run tests/unit/useCer.test.jsx`
Expected: FAIL — `awaitingField`/`awaitField`/`clearAwaiting` undefined.

- [ ] **Step 3: Implement**

In `frontend/src/hooks/useCer.js`:

Add state after the existing `const [busy, setBusy] = useState(false);`:

```js
  const [awaitingField, setAwaitingField] = useState(null);
  const awaitField = useCallback((field) => setAwaitingField(field), []);
  const clearAwaiting = useCallback(() => setAwaitingField(null), []);
```

In `dismissForming`, add the clear:

```js
  const dismissForming = useCallback(() => { setForming(null); setAgencyOpen(false); setAwaitingField(null); }, []);
```

In `confirmCer`'s success block, after `setAgencyOpen(false);` add `setAwaitingField(null);`.

Add all three to the returned object (alongside `busy`):

```js
    awaitingField,
    awaitField,
    clearAwaiting,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest --run tests/unit/useCer.test.jsx`
Expected: PASS (existing 5 + 2 new).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useCer.js frontend/tests/unit/useCer.test.jsx
git commit -m "feat(cer): awaitingField state in useCer"
```

---

### Task 3: Wire the prompt + capture into `Chat.jsx`

**Files:**
- Modify: `frontend/src/pages/Chat.jsx`

**Interfaces:**
- Consumes: `firstMissingGate`, `awaitedCapture` (Task 1); `cer.awaitingField`, `cer.awaitField`, `cer.clearAwaiting` (Task 2); existing `cer.confirmRoute`, `cer.fields`, `setMessages`, `setCompanyProfile`, `persistFounderMemoryEvent`, `extractUrl`, `setInputValue`, `setIsProcessing`.

- [ ] **Step 1: Extend the cerPathways import**

Change the existing import line in `Chat.jsx`:

```js
import { routeFromText, PATHWAYS } from '../utils/cerPathways.js';
```
to:
```js
import { routeFromText, PATHWAYS, firstMissingGate, awaitedCapture } from '../utils/cerPathways.js';
```

- [ ] **Step 2: Add a persona-prompt injector + intercept the route-confirm**

Just above the `return (` of the chat component (near the other handlers), add:

```js
  // Inject a lens's ask into the chat stream (persona bubble), then wait for the reply.
  const injectPersonaAsk = (persona, content) =>
    setMessages(prev => [...prev, { id: `cer-ask-${Date.now()}`, role: 'assistant', persona, model: 'proof360', content, sources: [] }]);

  // Route-confirm handler: confirm the route, then if a promptable gate is still
  // missing, the owning lens asks for it instead of stalling at the build card.
  const handleConfirmRoute = () => {
    cer.confirmRoute();
    const missing = firstMissingGate(cer.fields);
    if (missing) {
      cer.awaitField(missing.field);
      injectPersonaAsk(missing.persona, missing.prompt);
    }
  };
```

In the CER dock, change the build card's `onConfirmRoute` prop from:

```js
                    onConfirmRoute={cer.forming.routeConfirmed ? undefined : cer.confirmRoute}
```
to:
```js
                    onConfirmRoute={cer.forming.routeConfirmed ? undefined : handleConfirmRoute}
```

- [ ] **Step 3: Capture the awaited reply at the top of `submit`**

In `submit`, immediately after `const text = input.trim();` and the empty-guard (`if (!text || !inputReady || isProcessing) return;`), insert:

```js
    // If a lens asked for a missing CER field, this message answers it.
    if (cer.awaitingField) {
      const cap = awaitedCapture(cer.awaitingField, text);
      cer.clearAwaiting();
      if (cap.kind === 'value') {
        setInputValue('');
        setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }]);
        if (cap.profileKey) setCompanyProfile(prev => ({ ...prev, [cap.profileKey]: cap.value }));
        const memorySessionId = companyData?.session_id ?? sessionStorage.getItem('proof360_session_id') ?? null;
        persistFounderMemoryEvent('chat', {
          text, role: 'user', session_id: memorySessionId, occurred_at: new Date().toISOString(),
        }, 'chat', cap.factField ? [{ field: cap.factField, value: cap.value, source: 'founder' }] : []);
        return; // captured — don't run pathway detection this turn
      }
      // cap.kind === 'url' → fall through so the existing URL cold-read path handles it
    }
```

- [ ] **Step 4: Build and lint**

Run: `cd frontend && npm run build`
Expected: `✓ built` with no errors.

Run: `cd frontend && npx vitest --run`
Expected: all suites PASS (Task 1 + Task 2 tests included; nothing regressed).

- [ ] **Step 5: Manual verification (company-missing path)**

Because the demo founder is now seeded with a company, temporarily exercise the empty-company path:
- In `Chat.jsx`, temporarily set the `DEMO_COMPANY` name to `null` (or comment the name seed) so `companyName` starts null.
- Start a demo api on a spare port with `DEMO_FOUNDER_MODE=true` and point the Vite proxy at it (as in the slice-3b/4 verification), `VITE_DEMO_FOUNDER_MODE=true npm run dev`.
- In the chat: type a pathway trigger ("a customer asked for our SOC 2"), click "Use the compliance pathway →".
- Expected: **Sophia** asks "…what's the company called?"; the build card shows Company still `wait`.
- Reply "Northwind Robotics".
- Expected: Company ticks, the agency card appears; confirming creates the CER.
- Also verify a URL reply ("we're at northwind.io") routes to the cold-read path instead of setting the name to the URL.
- **Restore** the `DEMO_COMPANY` name seed afterward.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Chat.jsx
git commit -m "feat(cer): persona asks for a missing gate field, captures the reply into the entity"
```

---

## Self-Review

**Spec coverage:**
- Field→lens mapping → `FIELD_LENS` (Task 1). ✓
- `firstMissingGate` priority company→contact→need → Task 1. ✓
- URL-vs-value capture → `awaitedCapture` (Task 1). ✓
- `awaitingField` state → Task 2. ✓
- Trigger at route-confirm → `handleConfirmRoute` (Task 3, Step 2). ✓
- Capture into local profile + founder-memory fact → Task 3, Step 3. ✓
- MVP = company only, map extensible → `FIELD_LENS` has company/contact/need; Chat capture uses `profileKey`/`factField` (only company populates both) — contact/need entries exist but null-map, so they inject a prompt but don't yet write a fact (documented MVP boundary). ✓
- HX guards (lens voice, no form, one ask, only-when-blocking) → prompt text in `FIELD_LENS`, injection only inside `handleConfirmRoute` when `firstMissingGate` non-null. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `firstMissingGate` returns `{ field, persona, prompt, factField, profileKey }`; `handleConfirmRoute` uses `.field`, `.persona`, `.prompt`. `awaitedCapture` returns `{ kind, field, value, factField, profileKey }`; `submit` uses `.kind`, `.profileKey`, `.value`, `.factField`. Consistent. ✓

**Note (extensibility boundary):** `contact` and `need` are in `FIELD_LENS` so they'd be *asked*, but their `factField`/`profileKey` are null, so a reply wouldn't persist. For MVP only `company` is a realistic gap (signed-in founders have a contact; `need` triggered the pathway), so this is acceptable — but a task adding `contact`/`need` capture must give them non-null mappings.

---

## Execution Handoff

Two execution options — chosen after the plan is approved.
