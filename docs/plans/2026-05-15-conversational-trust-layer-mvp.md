# proof360 Conversational Trust Layer — MVP Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace proof360's cold-read-first UX with a chat-first conversational trust layer — founder describes their company, system guides discovery through personas, shows visible thinking, produces a living trust snapshot with vendor shortlist and human handoff.

**Architecture:** New `/chat` route in the existing React 19 + Vite frontend; Phase 0 is pure frontend with mocked data; Phase 1+ adds backend session model (Fastify + Postgres); Phases build linearly with each one gated on the previous phase's test criteria passing.

**Tech Stack:** React 19, Vite 8, Tailwind 3, React Router 7, Vitest (to be added), @testing-library/react (to be added), Fastify 5, Postgres, SSE for streaming, Cloudflare Pages for hosting.

**Source brief:** `docs/plans/2026-05-15-conversational-trust-layer-mvp.md` (this file)
**Full concept brief:** See the morning thread — 26-section brief ingested 2026-05-15.

---

## Phase Status Tracker

| Phase | Name | Status | Gate |
|-------|------|--------|------|
| 0 | Mock shell | ⬜ not started | Honey demo runs end-to-end, no errors |
| 1 | Conversation state model | ⬜ not started | Session CRUD passes all unit tests |
| 2 | Persona orchestration | ⬜ not started | Each persona produces typed response from real prompt |
| 3 | Visible thinking events | ⬜ not started | SSE stream renders in UI, costs attached |
| 4 | Report generation | ⬜ not started | Full report renders from session, all 13 sections |
| 5 | Snapshot system | ⬜ not started | Snapshot saved, versioned, viewable |
| 6 | Evidence/source drawer | ⬜ not started | Every claim has evidence refs, drawer opens |
| 7 | PULSUS cost receipts | ⬜ not started | Every inference call has a receipt, drawer shows totals |
| 8 | Vendor shortlist | ⬜ not started | Shortlist CRUD, timing buckets, ask-why works |
| 9 | Human handoff | ⬜ not started | Lead payload delivered to John via Telegram + HubSpot |
| 10 | Connectors | ⬜ not started | Xero + AWS stubs prompt correctly, consent gated |
| 11 | ARGUS-lite | ⬜ not started | Scheduled market read produces signal JSON |

**Gate rule:** A phase is complete when ALL its gate criteria pass AND the gate test suite is green. No exceptions. Phase N+1 does not start until Phase N gate is closed.

---

## Global build principles

- **Existing routes are sacred.** `/audit`, `/report`, `/portal`, `/account`, `/admin` must remain functional throughout all phases. Never break live v1 flow.
- **All existing routes stay intact.** The new `/chat` route is additive until Phase 4 when it can become the default `/`.
- **VECTOR for all inference.** Never call Anthropic, OpenAI, Perplexity, or Gemini directly. All calls route through `http://localhost:3003/v1`.
- **No connector forces.** Connectors are suggested when context gap arises. Never demanded upfront.
- **Earn the login.** Auth is never demanded before value is shown.
- **Progressive disclosure.** Plumbing (model names, token counts, API routes) stays hidden unless user opens a drawer.
- **HX first.** Every interaction decision is tested against: does this return the founder to agency, or take it away?

---

# Phase 0 — Mock Shell

**Goal:** Prove the full conversation journey with mocked data. No backend required. Must be showable to AWS partners, vendors, and founders.

**Demo script (the gate):** User inputs honey business description → personas respond → thinking stream shows → report panel builds → vendor shortlist appears → "Talk to John" modal opens → save modal appears. All from mock data. No errors. Runs in < 3s on first load.

**What NOT to build in Phase 0:**
- No real API calls
- No auth
- No database
- No VECTOR calls
- No connector integrations

---

## Phase 0 — File Map

**Create (new files):**
- `frontend/src/pages/Chat.jsx` — top-level chat page; owns session state
- `frontend/src/components/chat/ChatInput.jsx` — textarea + drop zone + submit
- `frontend/src/components/chat/MessageList.jsx` — scrollable message history
- `frontend/src/components/chat/MessageBubble.jsx` — user and persona message rendering
- `frontend/src/components/chat/PersonaChips.jsx` — Sofia / Leonardo / Edison / John selector
- `frontend/src/components/chat/ThinkingStream.jsx` — visible thinking events panel
- `frontend/src/components/chat/DrawerPanel.jsx` — generic collapsible drawer shell
- `frontend/src/components/chat/EvidenceDrawer.jsx` — sources/evidence drawer content
- `frontend/src/components/chat/CostDrawer.jsx` — token/cost receipt drawer content
- `frontend/src/components/chat/VendorShortlist.jsx` — vendor card list
- `frontend/src/components/chat/ReportPanel.jsx` — sliding report panel
- `frontend/src/components/chat/SaveModal.jsx` — save / continue-without-saving modal
- `frontend/src/components/chat/HandoffModal.jsx` — "Talk to John" preview + submit modal
- `frontend/src/hooks/useChatSession.js` — session state hook (messages, persona, phase, drawers)
- `frontend/src/data/mock/personas.js` — mock persona responses keyed by persona + input
- `frontend/src/data/mock/thinking.js` — mock thinking step sequences
- `frontend/src/data/mock/report.js` — mock report sections and content
- `frontend/src/data/mock/vendors.js` — mock vendor shortlist with timing buckets
- `frontend/src/data/mock/evidence.js` — mock evidence refs
- `frontend/src/data/mock/costs.js` — mock cost receipts
- `frontend/vitest.config.js` — vitest config with jsdom environment
- `frontend/tests/unit/useChatSession.test.js` — hook unit tests
- `frontend/tests/unit/mock-data.test.js` — mock data shape tests
- `frontend/tests/unit/Chat.smoke.test.jsx` — smoke tests for Chat page

**Modify (existing files):**
- `frontend/src/App.jsx` — add `/chat` route
- `frontend/package.json` — add vitest, @testing-library/react, @testing-library/user-event, jsdom

---

## Phase 0 — Tasks

### Task 0.0: Add test infrastructure

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.js`

- [ ] **Step 1: Install test deps**

```bash
cd frontend && npm install --save-dev vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Write vitest config**

Create `frontend/vitest.config.js`:
```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/unit/**/*.test.{js,jsx}'],
  },
});
```

- [ ] **Step 3: Write test setup**

Create `frontend/tests/setup.js`:
```js
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Add test script to package.json**

In `frontend/package.json` scripts section, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write a canary test to verify setup works**

Create `frontend/tests/unit/canary.test.js`:
```js
describe('test setup', () => {
  it('works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run canary**

```bash
cd frontend && npm test
```
Expected: 1 test passed.

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.js frontend/tests/setup.js frontend/tests/unit/canary.test.js
git commit -m "test(frontend): add vitest + @testing-library/react for chat UI development"
```

---

### Task 0.1: Mock data layer

**Files:**
- Create: `frontend/src/data/mock/personas.js`
- Create: `frontend/src/data/mock/thinking.js`
- Create: `frontend/src/data/mock/report.js`
- Create: `frontend/src/data/mock/vendors.js`
- Create: `frontend/src/data/mock/evidence.js`
- Create: `frontend/src/data/mock/costs.js`
- Create: `frontend/tests/unit/mock-data.test.js`

- [ ] **Step 1: Write failing mock data shape tests**

Create `frontend/tests/unit/mock-data.test.js`:
```js
import { getPersonaResponses } from '../../src/data/mock/personas.js';
import { getThinkingSteps } from '../../src/data/mock/thinking.js';
import { getMockReport } from '../../src/data/mock/report.js';
import { getMockVendors } from '../../src/data/mock/vendors.js';

describe('mock data shapes', () => {
  it('persona response has required fields', () => {
    const responses = getPersonaResponses('honey business at Kings Cross');
    expect(responses).toHaveLength(4);
    responses.forEach(r => {
      expect(r).toHaveProperty('persona');
      expect(r).toHaveProperty('role');
      expect(r).toHaveProperty('response');
      expect(r).toHaveProperty('questions');
      expect(['sofia', 'leonardo', 'edison', 'john_ai']).toContain(r.persona);
    });
  });

  it('thinking steps have required fields', () => {
    const steps = getThinkingSteps();
    expect(steps.length).toBeGreaterThan(3);
    steps.forEach(s => {
      expect(s).toHaveProperty('label');
      expect(s).toHaveProperty('provider');
      expect(['running', 'complete', 'failed']).toContain(s.status);
    });
  });

  it('report has 13 sections', () => {
    const report = getMockReport();
    expect(report.sections).toHaveLength(13);
    report.sections.forEach(s => {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('title');
      expect(s).toHaveProperty('content');
    });
  });

  it('vendors have timing bucket', () => {
    const vendors = getMockVendors();
    vendors.forEach(v => {
      expect(['now', 'soon', 'later']).toContain(v.timing);
      expect(v).toHaveProperty('name');
      expect(v).toHaveProperty('category');
      expect(v).toHaveProperty('reason');
    });
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd frontend && npm test
```
Expected: 4 failures (modules not found).

- [ ] **Step 3: Implement personas.js**

Create `frontend/src/data/mock/personas.js`:
```js
const PERSONA_MAP = {
  sofia: {
    persona: 'sofia',
    role: 'market_investor_lens',
    questions: [
      'Have you raised capital or are you exploring it?',
      'Who are your first five customers?',
      'What does growth beyond the founder look like?',
    ],
  },
  leonardo: {
    persona: 'leonardo',
    role: 'narrative_positioning_lens',
    questions: [
      'How do you explain what you do in one sentence?',
      'What does a buyer need to believe before they trust the product?',
    ],
  },
  edison: {
    persona: 'edison',
    role: 'technical_enterprise_dd_lens',
    questions: [
      'Where does your data live?',
      'What happens if a supplier is compromised?',
      'What evidence would a hospital or enterprise buyer ask for?',
    ],
  },
  john_ai: {
    persona: 'john_ai',
    role: 'commercial_judgment_handoff',
    questions: [
      'What conversation do you need to have next?',
      'What is the one blocker you keep running into?',
    ],
  },
};

const HONEY_RESPONSES = {
  sofia: 'You\'ve burned capital chasing a real opportunity — that\'s not a failure, it\'s a data point. But investors won\'t wire money based on your belief in the opportunity. They\'ll wire it based on evidence: provenance of the product, provenance of the spend, and proof that you know what you\'re scaling into. The investor question is: can you prove the honey is what you say it is, at volume, with a supply chain that doesn\'t collapse under scrutiny?',
  leonardo: 'The narrative can\'t be "we ran out of money." It needs to be "we invested to prove the market, here\'s what we learned, here\'s the evidence, here\'s what the next dollar buys." Buyers — cafés, hospitals, export distributors — and investors both need the same thing: a story that holds up under questions. Provenance is your story. Origin, traceability, verified supply chain. That\'s what makes the pitch defensible.',
  edison: 'Investor due diligence on a global food business will surface your gaps this week, not in six months. They\'ll ask: who has access to your supplier records? What happens if a supplier is compromised? Can you prove origin claims? Is there a digital audit trail? Right now those gaps are survivable. Inside a data room, they become blockers. The good news: they\'re fixable — but the fixes need to start before the investor conversation, not after.',
  john_ai: 'You\'ve reached the point where a human conversation changes more than another analysis. I\'m John\'s AI assistant — I can help you understand what\'s needed, but John can route you to the right investor, broker, or distributor conversation directly. He\'s seen this arc before. Want me to set that up?',
};

export function getPersonaResponses(input = '') {
  const isHoney = /honey|manuka|market|king.s cross|burned.*money|burned.*cash/i.test(input);
  return ['sofia', 'leonardo', 'edison', 'john_ai'].map(key => ({
    ...PERSONA_MAP[key],
    response: isHoney ? HONEY_RESPONSES[key] : `[${key}] Here is what I understand from your description. Let me ask a few questions to sharpen the picture.`,
  }));
}
```

- [ ] **Step 4: Implement thinking.js**

Create `frontend/src/data/mock/thinking.js`:
```js
export function getThinkingSteps() {
  return [
    { id: 't1', label: 'Understanding your stage and intent', provider: 'internal', status: 'complete', durationMs: 320 },
    { id: 't2', label: 'Checking public market signals for this category', provider: 'perplexity', status: 'complete', durationMs: 1800 },
    { id: 't3', label: 'Mapping buyer expectations at this stage', provider: 'gemini', status: 'complete', durationMs: 1200 },
    { id: 't4', label: 'Identifying trust gaps and missing proof', provider: 'internal', status: 'complete', durationMs: 450 },
    { id: 't5', label: 'Building investor narrative', provider: 'anthropic/claude', status: 'complete', durationMs: 2400 },
    { id: 't6', label: 'Preparing enterprise DD view', provider: 'anthropic/claude', status: 'complete', durationMs: 1900 },
    { id: 't7', label: 'Estimating vendor categories', provider: 'internal', status: 'complete', durationMs: 280 },
  ];
}
```

- [ ] **Step 5: Implement report.js**

Create `frontend/src/data/mock/report.js`:
```js
export function getMockReport() {
  return {
    generated_at: new Date().toISOString(),
    company: 'King\'s Cross Honey',
    sections: [
      { id: 's1', title: 'Company context', content: 'Local honey producer at King\'s Cross markets. Interest from cafés, hospitals, and export channels. Possible investment path.' },
      { id: 's2', title: 'What we think you are', content: 'Early-stage founder-led product business with a trusted local brand and emerging B2B demand.' },
      { id: 's3', title: 'What you are becoming', content: 'A regulated supply chain participant. The moment hospitals or export enters the picture, trust becomes infrastructure.' },
      { id: 's4', title: 'Current trust signals', content: 'Strong: local market presence, word-of-mouth, product quality. Weak: formal provenance trail, digital identity, supplier documentation.' },
      { id: 's5', title: 'Missing proof and gaps', content: 'No formal origin certification. No supplier risk documentation. No digital identity or access controls. No insurance coverage mapped to supply chain risk.' },
      { id: 's6', title: 'Investor lens', content: 'You\'ve burned capital on a real opportunity. Investors will accept that — if you can prove it was intentional and teachable. They\'ll ask: where did the money go, and what did it prove? Is the supply chain defensible at scale? What evidence exists beyond the founder\'s word? The capital story needs provenance the same way the product does. These gaps are fixable — but they must be addressed before the data room opens, not inside it.' },
      { id: 's7', title: 'Enterprise buyer lens', content: 'Hospitals and large cafés need: traceability to origin, supplier controls, data handling evidence if ordering is digital, and a contact person with documented authority.' },
      { id: 's8', title: 'Technical and DD lens', content: 'When digital orders begin: identity (who can access the system), data handling (supplier and customer records), and audit trail (what changed, when, by whom) all become material.' },
      { id: 's9', title: 'Recommended next conversations', content: '1. Food Standards Australia New Zealand (FSANZ) on labelling and origin claims. 2. A supply chain insurance broker. 3. A digital identity starter (MFA, basic access controls). 4. An investor with food/agri experience.' },
      { id: 's10', title: 'Vendor shortlist', content: 'See vendor shortlist panel.' },
      { id: 's11', title: 'Maturity timeline', content: 'Now: basic identity controls, supplier documentation template. Soon: formal provenance trail, insurance review. Later: enterprise compliance readiness, export certification.' },
      { id: 's12', title: 'Evidence and provenance', content: 'This report draws on: public Manuka honey fraud cases (Perplexity), FSANZ food labelling standards (Gemini), hospital procurement requirements (internal model). No private data was used.' },
      { id: 's13', title: 'Report metadata', content: 'Generated: ' + new Date().toLocaleDateString('en-AU') + '. Models used: Perplexity (market signals), Gemini (regulatory context), Claude Sonnet (synthesis). Status: draft — refine via conversation.' },
    ],
  };
}
```

- [ ] **Step 6: Implement vendors.js**

Create `frontend/src/data/mock/vendors.js`:
```js
export function getMockVendors() {
  return [
    { id: 'v1', name: 'Basic MFA / identity controls', category: 'identity', timing: 'now', reason: 'Digital orders and supplier records need access controls from day one. Compromised access is a supply-chain risk.', routeability: 'self_serve', regionFit: 'AU', status: 'suggested' },
    { id: 'v2', name: 'Supply chain insurance', category: 'insurance', timing: 'now', reason: 'Hospitals and export buyers will ask about your insurance posture. A broker conversation is free.', routeability: 'ethiks', regionFit: 'AU', status: 'suggested' },
    { id: 'v3', name: 'Supplier documentation template', category: 'compliance_evidence', timing: 'soon', reason: 'A lightweight supplier agreement and origin attestation creates the paper trail investors and enterprise buyers need.', routeability: 'self_serve', regionFit: 'AU', status: 'suggested' },
    { id: 'v4', name: 'Vanta (compliance automation)', category: 'compliance_evidence', timing: 'later', reason: 'When digital infrastructure grows and enterprise accounts are in play. Overkill now — but understand the path.', routeability: 'ethiks', regionFit: 'AU/APAC', status: 'suggested' },
    { id: 'v5', name: 'Okta (enterprise identity)', category: 'identity', timing: 'later', reason: 'When the team grows and multiple systems need governed access. Duo or Google Workspace is enough now.', routeability: 'partner', regionFit: 'Global', status: 'suggested' },
  ];
}
```

- [ ] **Step 7: Implement evidence.js and costs.js**

Create `frontend/src/data/mock/evidence.js`:
```js
export function getMockEvidence() {
  return [
    { id: 'e1', source_type: 'public_source', source_name: 'Perplexity AI', summary: 'Manuka honey fraud has led to several enforcement actions in NZ and AU — origin certification is material to buyer trust.', timestamp: new Date().toISOString(), visibility: 'shareable' },
    { id: 'e2', source_type: 'public_source', source_name: 'Gemini / FSANZ', summary: 'Food Standards Australia requires origin labelling. Export markets have stricter requirements — NZ has specific Manuka grading.', timestamp: new Date().toISOString(), visibility: 'shareable' },
    { id: 'e3', source_type: 'model_output', source_name: 'Claude Sonnet (synthesis)', summary: 'Combined market signals and regulatory context into trust gap assessment and vendor timing recommendations.', timestamp: new Date().toISOString(), visibility: 'internal' },
  ];
}
```

Create `frontend/src/data/mock/costs.js`:
```js
export function getMockCosts() {
  return [
    { id: 'c1', provider: 'perplexity', model: 'pplx-70b-online', purpose: 'Market signals — Manuka honey fraud and trust concerns', tokens_in: 1240, tokens_out: 842, estimated_cost_usd: 0.0032, changed_recommendation: true },
    { id: 'c2', provider: 'google/gemini', model: 'gemini-1.5-flash', purpose: 'Regulatory context — FSANZ, export standards, hospital procurement', tokens_in: 2100, tokens_out: 1450, estimated_cost_usd: 0.0018, changed_recommendation: false },
    { id: 'c3', provider: 'anthropic/claude', model: 'claude-sonnet-4-6', purpose: 'Synthesis — investor narrative, enterprise DD view, vendor timing', tokens_in: 4800, tokens_out: 3200, estimated_cost_usd: 0.041, changed_recommendation: true },
  ];
}
```

- [ ] **Step 8: Run tests — verify they pass**

```bash
cd frontend && npm test
```
Expected: 5 tests passed (canary + 4 mock data shape tests).

- [ ] **Step 9: Commit**

```bash
git add frontend/src/data/mock/ frontend/tests/unit/mock-data.test.js
git commit -m "feat(chat): add mock data layer — personas, thinking, report, vendors, evidence, costs"
```

---

### Task 0.2: useChatSession hook

**Files:**
- Create: `frontend/src/hooks/useChatSession.js`
- Create: `frontend/tests/unit/useChatSession.test.js`

- [ ] **Step 1: Write failing hook tests**

Create `frontend/tests/unit/useChatSession.test.js`:
```js
import { renderHook, act } from '@testing-library/react';
import { useChatSession } from '../../src/hooks/useChatSession.js';

describe('useChatSession', () => {
  it('initialises with empty messages and no active persona', () => {
    const { result } = renderHook(() => useChatSession());
    expect(result.current.messages).toEqual([]);
    expect(result.current.activePersona).toBe(null);
    expect(result.current.phase).toBe('intake');
  });

  it('addUserMessage appends a user message', () => {
    const { result } = renderHook(() => useChatSession());
    act(() => result.current.addUserMessage('We sell honey'));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[0].content).toBe('We sell honey');
  });

  it('setActivePersona changes active persona', () => {
    const { result } = renderHook(() => useChatSession());
    act(() => result.current.setActivePersona('sofia'));
    expect(result.current.activePersona).toBe('sofia');
  });

  it('setPhase advances the phase', () => {
    const { result } = renderHook(() => useChatSession());
    act(() => result.current.setPhase('thinking'));
    expect(result.current.phase).toBe('thinking');
  });

  it('toggleDrawer opens and closes a drawer', () => {
    const { result } = renderHook(() => useChatSession());
    expect(result.current.openDrawers.evidence).toBe(false);
    act(() => result.current.toggleDrawer('evidence'));
    expect(result.current.openDrawers.evidence).toBe(true);
    act(() => result.current.toggleDrawer('evidence'));
    expect(result.current.openDrawers.evidence).toBe(false);
  });

  it('addPersonaMessages appends persona messages', () => {
    const { result } = renderHook(() => useChatSession());
    act(() => result.current.addPersonaMessages([
      { persona: 'sofia', role: 'assistant', content: 'Sofia response' },
    ]));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].persona).toBe('sofia');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd frontend && npm test -- --reporter=verbose
```
Expected: 6 failures (module not found).

- [ ] **Step 3: Implement useChatSession.js**

Create `frontend/src/hooks/useChatSession.js`:
```js
import { useState, useCallback } from 'react';

export function useChatSession() {
  const [messages, setMessages] = useState([]);
  const [activePersona, setActivePersona] = useState(null);
  const [phase, setPhase] = useState('intake'); // intake | thinking | report | done
  const [openDrawers, setOpenDrawers] = useState({
    evidence: false,
    cost: false,
    vendor: false,
    report: false,
  });
  const [thinkingSteps, setThinkingSteps] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [vendorList, setVendorList] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showHandoffModal, setShowHandoffModal] = useState(false);

  const addUserMessage = useCallback((content) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  const addPersonaMessages = useCallback((personaMessages) => {
    setMessages(prev => [...prev, ...personaMessages.map(m => ({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...m,
    }))]);
  }, []);

  const toggleDrawer = useCallback((drawer) => {
    setOpenDrawers(prev => ({ ...prev, [drawer]: !prev[drawer] }));
  }, []);

  return {
    messages,
    activePersona,
    setActivePersona,
    phase,
    setPhase,
    openDrawers,
    toggleDrawer,
    thinkingSteps,
    setThinkingSteps,
    reportData,
    setReportData,
    vendorList,
    setVendorList,
    showSaveModal,
    setShowSaveModal,
    showHandoffModal,
    setShowHandoffModal,
    addUserMessage,
    addPersonaMessages,
  };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd frontend && npm test
```
Expected: all 11 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useChatSession.js frontend/tests/unit/useChatSession.test.js
git commit -m "feat(chat): useChatSession hook — session state, persona, phase, drawer management"
```

---

### Task 0.3: Core chat components

**Files:**
- Create: `frontend/src/components/chat/PersonaChips.jsx`
- Create: `frontend/src/components/chat/MessageBubble.jsx`
- Create: `frontend/src/components/chat/MessageList.jsx`
- Create: `frontend/src/components/chat/ChatInput.jsx`
- Create: `frontend/tests/unit/Chat.smoke.test.jsx`

Design tokens (use existing from Home.jsx pattern):
```js
const BG = '#0a0d14';
const CARD = '#131c2e';
const BORDER = '#1e293b';
const TEXT = '#f1f5f9';
const MUTED = '#64748b';
const INDIGO = '#4f46e5'; // proof360 primary
```

Persona colour map:
```js
const PERSONA_COLORS = {
  sofia: '#f59e0b',     // amber — market/investor warmth
  leonardo: '#8b5cf6',  // violet — narrative/creative
  edison: '#22d3ee',    // cyan — technical precision
  john_ai: '#4f46e5',   // indigo — authority/commercial
};
```

- [ ] **Step 1: Write smoke tests**

Create `frontend/tests/unit/Chat.smoke.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import { PersonaChips } from '../../src/components/chat/PersonaChips.jsx';
import { MessageBubble } from '../../src/components/chat/MessageBubble.jsx';
import { ChatInput } from '../../src/components/chat/ChatInput.jsx';

describe('PersonaChips', () => {
  it('renders all four personas', () => {
    render(<PersonaChips activePersona={null} onSelect={() => {}} />);
    expect(screen.getByText(/sofia/i)).toBeInTheDocument();
    expect(screen.getByText(/leonardo/i)).toBeInTheDocument();
    expect(screen.getByText(/edison/i)).toBeInTheDocument();
    expect(screen.getByText(/john/i)).toBeInTheDocument();
  });

  it('marks active persona', () => {
    render(<PersonaChips activePersona="sofia" onSelect={() => {}} />);
    const sofiaChip = screen.getByText(/sofia/i).closest('button');
    expect(sofiaChip).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('MessageBubble', () => {
  it('renders user message', () => {
    const msg = { id: '1', role: 'user', content: 'Hello', timestamp: new Date().toISOString() };
    render(<MessageBubble message={msg} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders persona message with label', () => {
    const msg = { id: '2', role: 'assistant', persona: 'sofia', content: 'Sofia response', timestamp: new Date().toISOString() };
    render(<MessageBubble message={msg} />);
    expect(screen.getByText('Sofia response')).toBeInTheDocument();
    expect(screen.getByText(/sofia/i)).toBeInTheDocument();
  });
});

describe('ChatInput', () => {
  it('renders textarea and submit button', () => {
    render(<ChatInput onSubmit={() => {}} disabled={false} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start|send|go/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd frontend && npm test
```
Expected: 5 new failures.

- [ ] **Step 3: Implement PersonaChips.jsx**

Create `frontend/src/components/chat/PersonaChips.jsx`:
```jsx
const PERSONAS = [
  { id: 'sofia', label: 'Sofia', role: 'Market & investor lens', color: '#f59e0b' },
  { id: 'leonardo', label: 'Leonardo', role: 'Narrative & positioning', color: '#8b5cf6' },
  { id: 'edison', label: 'Edison', role: 'Technical & enterprise DD', color: '#22d3ee' },
  { id: 'john_ai', label: 'John', role: 'Commercial judgment', color: '#4f46e5' },
];

export function PersonaChips({ activePersona, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 0' }}>
      {PERSONAS.map(p => (
        <button
          key={p.id}
          aria-pressed={activePersona === p.id}
          onClick={() => onSelect(p.id)}
          title={p.role}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            border: `1px solid ${activePersona === p.id ? p.color : '#1e293b'}`,
            background: activePersona === p.id ? p.color + '22' : 'transparent',
            color: activePersona === p.id ? p.color : '#64748b',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.3px',
            transition: 'all 0.15s',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement MessageBubble.jsx**

Create `frontend/src/components/chat/MessageBubble.jsx`:
```jsx
const PERSONA_META = {
  sofia: { label: 'Sofia', color: '#f59e0b' },
  leonardo: { label: 'Leonardo', color: '#8b5cf6' },
  edison: { label: 'Edison', color: '#22d3ee' },
  john_ai: { label: 'John', color: '#4f46e5', disclaimer: 'AI assistant — John can step in personally.' },
};

export function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const meta = message.persona ? PERSONA_META[message.persona] : null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 16,
    }}>
      {meta && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: meta.color,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            {meta.label}
          </span>
          {meta.disclaimer && (
            <span style={{ fontSize: 10, color: '#475569', fontStyle: 'italic' }}>
              {meta.disclaimer}
            </span>
          )}
        </div>
      )}
      <div style={{
        maxWidth: '72%',
        padding: '12px 16px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        background: isUser ? '#4f46e5' : '#131c2e',
        border: isUser ? 'none' : `1px solid ${meta ? meta.color + '33' : '#1e293b'}`,
        color: '#f1f5f9',
        fontSize: 14,
        lineHeight: 1.6,
      }}>
        {message.content}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Implement MessageList.jsx**

Create `frontend/src/components/chat/MessageList.jsx`:
```jsx
import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble.jsx';

export function MessageList({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#334155', fontSize: 13, textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
          Drop a website, upload a deck, or describe your business.<br />
          We'll help you understand what the next stage demands.
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 6: Implement ChatInput.jsx**

Create `frontend/src/components/chat/ChatInput.jsx`:
```jsx
import { useState, useRef } from 'react';

const EXAMPLES = [
  "Imagine you're selling Manuka honey at a stall in King's Cross on a Saturday morning. Fast forward: sales, a global opportunity, burned cash, and now you need investors. What do you do?",
  "We're raising pre-seed",
  "We want to sell to enterprise",
  "We need to understand our trust gaps",
];

export function ChatInput({ onSubmit, disabled }) {
  const [value, setValue] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef(null);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div style={{ borderTop: '1px solid #1e293b', padding: '16px 0 0' }}>
      {/* Example chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {EXAMPLES.map(ex => (
          <button
            key={ex}
            onClick={() => { setValue(ex); textareaRef.current?.focus(); }}
            style={{
              padding: '4px 10px',
              borderRadius: 12,
              border: '1px solid #1e293b',
              background: 'transparent',
              color: '#475569',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div
          style={{
            flex: 1,
            border: `1px solid ${dragOver ? '#4f46e5' : '#1e293b'}`,
            borderRadius: 12,
            background: '#131c2e',
            transition: 'border-color 0.15s',
          }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); /* Phase 1: handle file */ }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste your website, upload a deck, or describe what you're building…"
            disabled={disabled}
            rows={3}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f1f5f9',
              fontSize: 14,
              lineHeight: 1.6,
              padding: '12px 14px',
              resize: 'none',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ padding: '6px 14px 10px', color: '#334155', fontSize: 11 }}>
            Drop a file or paste a URL
          </div>
        </div>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          style={{
            padding: '12px 20px',
            borderRadius: 10,
            background: disabled || !value.trim() ? '#1e293b' : '#4f46e5',
            color: disabled || !value.trim() ? '#475569' : '#fff',
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: disabled || !value.trim() ? 'default' : 'pointer',
            transition: 'all 0.15s',
            letterSpacing: '0.3px',
          }}
        >
          Start
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
cd frontend && npm test
```
Expected: all 16 tests pass.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/chat/ frontend/tests/unit/Chat.smoke.test.jsx
git commit -m "feat(chat): PersonaChips, MessageBubble, MessageList, ChatInput — phase 0 core components"
```

---

### Task 0.4: Thinking stream and drawer components

**Files:**
- Create: `frontend/src/components/chat/ThinkingStream.jsx`
- Create: `frontend/src/components/chat/DrawerPanel.jsx`
- Create: `frontend/src/components/chat/EvidenceDrawer.jsx`
- Create: `frontend/src/components/chat/CostDrawer.jsx`
- Create: `frontend/src/components/chat/VendorShortlist.jsx`

- [ ] **Step 1: Implement ThinkingStream.jsx**

Create `frontend/src/components/chat/ThinkingStream.jsx`:
```jsx
const STATUS_ICON = {
  running: '⟳',
  complete: '✓',
  failed: '✗',
};
const STATUS_COLOR = {
  running: '#f59e0b',
  complete: '#22c55e',
  failed: '#ef4444',
};
const PROVIDER_LABEL = {
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  'anthropic/claude': 'Claude',
  internal: 'proof360',
};

export function ThinkingStream({ steps, visible }) {
  if (!visible || steps.length === 0) return null;

  return (
    <div style={{
      margin: '8px 0 16px',
      padding: '12px 16px',
      background: '#0d1520',
      border: '1px solid #1e293b',
      borderRadius: 10,
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>
        Working
      </p>
      {steps.map(step => (
        <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ color: STATUS_COLOR[step.status], fontSize: 13, minWidth: 14 }}>
            {STATUS_ICON[step.status]}
          </span>
          <span style={{ fontSize: 13, color: step.status === 'complete' ? '#64748b' : '#f1f5f9', flex: 1 }}>
            {step.label}
          </span>
          {step.provider && step.provider !== 'internal' && (
            <span style={{ fontSize: 10, color: '#334155', fontStyle: 'italic' }}>
              via {PROVIDER_LABEL[step.provider] || step.provider}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implement DrawerPanel.jsx**

Create `frontend/src/components/chat/DrawerPanel.jsx`:
```jsx
export function DrawerPanel({ title, isOpen, onClose, children, badge }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: 420,
      background: '#0d1520',
      border: '1px solid #1e293b',
      borderRight: 'none',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{title}</span>
          {badge && (
            <span style={{ fontSize: 10, background: '#1e293b', color: '#64748b', padding: '2px 6px', borderRadius: 10 }}>
              {badge}
            </span>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement EvidenceDrawer.jsx**

Create `frontend/src/components/chat/EvidenceDrawer.jsx`:
```jsx
export function EvidenceDrawer({ evidence }) {
  return (
    <div>
      {evidence.map(e => (
        <div key={e.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {e.source_type.replace('_', ' ')}
            </span>
            <span style={{ fontSize: 11, color: '#475569' }}>{e.source_name}</span>
          </div>
          <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{e.summary}</p>
          <p style={{ fontSize: 10, color: '#334155', marginTop: 6 }}>
            {e.visibility === 'shareable' ? '✓ Shareable' : '⊘ Internal only'} · {new Date(e.timestamp).toLocaleDateString('en-AU')}
          </p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement CostDrawer.jsx**

Create `frontend/src/components/chat/CostDrawer.jsx`:
```jsx
export function CostDrawer({ receipts }) {
  const total = receipts.reduce((sum, r) => sum + r.estimated_cost_usd, 0);

  return (
    <div>
      <div style={{ marginBottom: 20, padding: '12px 16px', background: '#131c2e', borderRadius: 8, border: '1px solid #1e293b' }}>
        <p style={{ fontSize: 10, color: '#475569', margin: '0 0 4px', letterSpacing: '1px', textTransform: 'uppercase' }}>Total inference cost</p>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>${total.toFixed(4)}</p>
        <p style={{ fontSize: 11, color: '#334155', margin: '4px 0 0', fontStyle: 'italic' }}>Free during beta — transparency only</p>
      </div>
      {receipts.map(r => (
        <div key={r.id} style={{ marginBottom: 12, padding: '10px 14px', background: '#0d1520', border: '1px solid #1e293b', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{r.provider}</span>
            <span style={{ fontSize: 12, color: r.changed_recommendation ? '#22c55e' : '#475569', fontWeight: r.changed_recommendation ? 700 : 400 }}>
              ${r.estimated_cost_usd.toFixed(4)}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 4px', lineHeight: 1.4 }}>{r.purpose}</p>
          <p style={{ fontSize: 10, color: '#334155', margin: 0 }}>
            {r.tokens_in.toLocaleString()} in · {r.tokens_out.toLocaleString()} out
            {r.changed_recommendation && <span style={{ color: '#22c55e', marginLeft: 8 }}>↑ changed recommendation</span>}
          </p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Write smoke tests for drawer components**

Add to `frontend/tests/unit/Chat.smoke.test.jsx` (append these describes after the existing ones):

```jsx
import { ThinkingStream } from '../../src/components/chat/ThinkingStream.jsx';
import { DrawerPanel } from '../../src/components/chat/DrawerPanel.jsx';
import { VendorShortlist } from '../../src/components/chat/VendorShortlist.jsx';

describe('ThinkingStream', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(<ThinkingStream steps={[]} visible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders steps when visible', () => {
    const steps = [{ id: 't1', label: 'Checking market', provider: 'perplexity', status: 'complete', durationMs: 400 }];
    render(<ThinkingStream steps={steps} visible={true} />);
    expect(screen.getByText('Checking market')).toBeInTheDocument();
  });
});

describe('DrawerPanel', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<DrawerPanel title="Test" isOpen={false} onClose={() => {}}><p>content</p></DrawerPanel>);
    expect(container.firstChild).toBeNull();
  });

  it('renders content and title when open', () => {
    render(<DrawerPanel title="Evidence" isOpen={true} onClose={() => {}}><p>evidence content</p></DrawerPanel>);
    expect(screen.getByText('Evidence')).toBeInTheDocument();
    expect(screen.getByText('evidence content')).toBeInTheDocument();
  });
});

describe('VendorShortlist', () => {
  it('renders vendors grouped by timing', () => {
    const vendors = [
      { id: 'v1', name: 'MFA', category: 'identity', timing: 'now', reason: 'needs it', status: 'suggested' },
      { id: 'v2', name: 'Vanta', category: 'compliance', timing: 'later', reason: 'enterprise', status: 'suggested' },
    ];
    render(<VendorShortlist vendors={vendors} onShortlist={() => {}} onDefer={() => {}} />);
    expect(screen.getByText('MFA')).toBeInTheDocument();
    expect(screen.getByText('Vanta')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5a: Run tests — verify new tests fail**

```bash
cd frontend && npm test
```

Expected: 5 new failures (modules not found for ThinkingStream, DrawerPanel, VendorShortlist).

- [ ] **Step 6: Implement VendorShortlist.jsx**

Create `frontend/src/components/chat/VendorShortlist.jsx`:
```jsx
const TIMING_STYLE = {
  now: { label: 'Now', color: '#22c55e', bg: '#052e1640' },
  soon: { label: 'Soon', color: '#f59e0b', bg: '#451a0340' },
  later: { label: 'Later', color: '#64748b', bg: '#0f172a' },
};

export function VendorShortlist({ vendors, onShortlist, onDefer }) {
  const byTiming = {
    now: vendors.filter(v => v.timing === 'now'),
    soon: vendors.filter(v => v.timing === 'soon'),
    later: vendors.filter(v => v.timing === 'later'),
  };

  return (
    <div>
      {['now', 'soon', 'later'].map(timing => (
        byTiming[timing].length > 0 && (
          <div key={timing} style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: TIMING_STYLE[timing].color, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>
              {TIMING_STYLE[timing].label}
            </p>
            {byTiming[timing].map(v => (
              <div key={v.id} style={{
                marginBottom: 10,
                padding: '12px 14px',
                background: TIMING_STYLE[timing].bg,
                border: `1px solid ${TIMING_STYLE[timing].color}22`,
                borderRadius: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{v.name}</span>
                  <span style={{ fontSize: 10, color: '#475569', background: '#1e293b', padding: '2px 6px', borderRadius: 10 }}>
                    {v.category.replace('_', ' ')}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, margin: '0 0 8px' }}>{v.reason}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {v.status === 'suggested' && (
                    <>
                      <button onClick={() => onShortlist(v.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${TIMING_STYLE[timing].color}`, background: 'transparent', color: TIMING_STYLE[timing].color, cursor: 'pointer' }}>
                        + Add to shortlist
                      </button>
                      <button onClick={() => onDefer(v.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #1e293b', background: 'transparent', color: '#475569', cursor: 'pointer' }}>
                        Defer
                      </button>
                    </>
                  )}
                  {v.status === 'shortlisted' && (
                    <span style={{ fontSize: 11, color: '#22c55e' }}>✓ Shortlisted</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/chat/ThinkingStream.jsx frontend/src/components/chat/DrawerPanel.jsx frontend/src/components/chat/EvidenceDrawer.jsx frontend/src/components/chat/CostDrawer.jsx frontend/src/components/chat/VendorShortlist.jsx
git commit -m "feat(chat): ThinkingStream, DrawerPanel, EvidenceDrawer, CostDrawer, VendorShortlist components"
```

---

### Task 0.5: Report panel, Save modal, Handoff modal

**Files:**
- Create: `frontend/src/components/chat/ReportPanel.jsx`
- Create: `frontend/src/components/chat/SaveModal.jsx`
- Create: `frontend/src/components/chat/HandoffModal.jsx`

- [ ] **Step 1: Implement ReportPanel.jsx**

`ReportPanel` is **content-only** — it renders the report sections with no fixed-position wrapper. `DrawerPanel` provides the shell. This avoids z-index conflicts between two overlapping fixed containers.

Create `frontend/src/components/chat/ReportPanel.jsx`:
```jsx
export function ReportPanel({ report }) {
  if (!report) return <p style={{ color: '#475569', fontSize: 13 }}>No report yet.</p>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 2px' }}>Trust snapshot</p>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>{report.company}</p>
        <p style={{ fontSize: 10, color: '#334155', fontStyle: 'italic', margin: 0 }}>Draft · refine via chat</p>
      </div>
      {report.sections.map(s => (
        <div key={s.id} style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 6px' }}>{s.title}</p>
          <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>{s.content}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implement SaveModal.jsx**

Create `frontend/src/components/chat/SaveModal.jsx`:
```jsx
import { useState } from 'react';

export function SaveModal({ onSave, onDismiss }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: 16, padding: 32, width: 420, maxWidth: '90vw' }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>Save your snapshot</p>
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '0 0 24px' }}>
          We'll only use your name and email so you can come back to this report. Your report stays private. Refine it anytime or delete it.
        </p>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', background: '#0d1520', border: '1px solid #1e293b', borderRadius: 8, color: '#f1f5f9', fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }}
        />
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', background: '#0d1520', border: '1px solid #1e293b', borderRadius: 8, color: '#f1f5f9', fontSize: 13, marginBottom: 20, boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => onSave({ name, email })}
            disabled={!name || !email}
            style={{ flex: 1, padding: '11px 0', borderRadius: 8, background: name && email ? '#4f46e5' : '#1e293b', color: name && email ? '#fff' : '#475569', border: 'none', fontSize: 13, fontWeight: 700, cursor: name && email ? 'pointer' : 'default' }}
          >
            Save my report
          </button>
          <button
            onClick={onDismiss}
            style={{ flex: 1, padding: '11px 0', borderRadius: 8, background: 'transparent', color: '#64748b', border: '1px solid #1e293b', fontSize: 13, cursor: 'pointer' }}
          >
            Keep exploring
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement HandoffModal.jsx**

Create `frontend/src/components/chat/HandoffModal.jsx`:
```jsx
export function HandoffModal({ sessionSummary, onSubmit, onDismiss }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: 16, padding: 32, width: 480, maxWidth: '90vw' }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>Talk to John</p>
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '0 0 16px' }}>
          No repeated backstory. No generic pitch. Here's what John will see before he speaks with you.
        </p>
        <div style={{ background: '#0d1520', border: '1px solid #1e293b', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>
            {sessionSummary}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onSubmit}
            style={{ flex: 1, padding: '11px 0', borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Send this to John
          </button>
          <button
            onClick={onDismiss}
            style={{ flex: 1, padding: '11px 0', borderRadius: 8, background: 'transparent', color: '#64748b', border: '1px solid #1e293b', fontSize: 13, cursor: 'pointer' }}
          >
            Not yet
          </button>
        </div>
        <p style={{ fontSize: 10, color: '#334155', textAlign: 'center', marginTop: 12 }}>
          You're speaking with John's AI assistant. John can step in personally.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/chat/ReportPanel.jsx frontend/src/components/chat/SaveModal.jsx frontend/src/components/chat/HandoffModal.jsx
git commit -m "feat(chat): ReportPanel, SaveModal, HandoffModal — phase 0 overlay components"
```

---

### Task 0.6: Chat page and routing

**Files:**
- Create: `frontend/src/pages/Chat.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Implement Chat.jsx**

Create `frontend/src/pages/Chat.jsx`:

This file orchestrates all the Phase 0 components. It owns the mock demo flow: user submits input → 2.5s thinking sim → persona messages appear → report builds → drawers become available.

```jsx
import { useState, useCallback } from 'react';
import { useChatSession } from '../hooks/useChatSession.js';
import { PersonaChips } from '../components/chat/PersonaChips.jsx';
import { MessageList } from '../components/chat/MessageList.jsx';
import { ChatInput } from '../components/chat/ChatInput.jsx';
import { ThinkingStream } from '../components/chat/ThinkingStream.jsx';
import { DrawerPanel } from '../components/chat/DrawerPanel.jsx';
import { EvidenceDrawer } from '../components/chat/EvidenceDrawer.jsx';
import { CostDrawer } from '../components/chat/CostDrawer.jsx';
import { VendorShortlist } from '../components/chat/VendorShortlist.jsx';
import { ReportPanel } from '../components/chat/ReportPanel.jsx';
import { SaveModal } from '../components/chat/SaveModal.jsx';
import { HandoffModal } from '../components/chat/HandoffModal.jsx';
import { getPersonaResponses } from '../data/mock/personas.js';
import { getThinkingSteps } from '../data/mock/thinking.js';
import { getMockReport } from '../data/mock/report.js';
import { getMockVendors } from '../data/mock/vendors.js';
import { getMockEvidence } from '../data/mock/evidence.js';
import { getMockCosts } from '../data/mock/costs.js';

const BG = '#0a0d14';

export default function Chat() {
  const session = useChatSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [vendorList, setVendorList] = useState([]);
  const [evidenceList, setEvidenceList] = useState([]);
  const [costList, setCostList] = useState([]);

  const handleSubmit = useCallback(async (input) => {
    session.addUserMessage(input);
    setIsProcessing(true);
    session.setPhase('thinking');

    // Simulate thinking stream
    const steps = getThinkingSteps();
    session.setThinkingSteps(steps.map(s => ({ ...s, status: 'running' })));

    // Progress through thinking steps
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 350 + Math.random() * 400));
      session.setThinkingSteps(prev => prev.map((s, idx) =>
        idx <= i ? { ...s, status: 'complete' } : s
      ));
    }

    // Add persona responses
    const responses = getPersonaResponses(input);
    session.addPersonaMessages(responses.map(r => ({
      role: 'assistant',
      persona: r.persona,
      content: r.response,
    })));

    // Load report and data
    session.setReportData(getMockReport());
    setVendorList(getMockVendors());
    setEvidenceList(getMockEvidence());
    setCostList(getMockCosts());

    session.setPhase('report');
    setIsProcessing(false);

    // Prompt save after a short delay
    setTimeout(() => session.setShowSaveModal(true), 3000);
  }, [session]);

  const handleShortlist = (vendorId) => {
    setVendorList(prev => prev.map(v => v.id === vendorId ? { ...v, status: 'shortlisted' } : v));
  };

  const handleDefer = (vendorId) => {
    setVendorList(prev => prev.map(v => v.id === vendorId ? { ...v, status: 'deferred' } : v));
  };

  const sessionSummary = session.messages.length > 0
    ? `Company: ${session.messages[0]?.content?.slice(0, 200)}\nStage: Early/growing\nInterest: Investor readiness, enterprise buyers\nVendor shortlist: ${vendorList.filter(v => v.status === 'shortlisted').map(v => v.name).join(', ') || 'None yet'}`
    : 'No context yet.';

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #0f172a', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#4f46e5', letterSpacing: '-0.5px' }}>proof360</span>
          <span style={{ fontSize: 11, color: '#334155', borderLeft: '1px solid #1e293b', paddingLeft: 10 }}>Trust conversation</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {session.phase === 'report' && (
            <>
              <button onClick={() => session.toggleDrawer('report')} style={drawerBtnStyle('#4f46e5')}>Report</button>
              <button onClick={() => session.toggleDrawer('vendor')} style={drawerBtnStyle('#22c55e')}>Vendors {vendorList.length > 0 && `(${vendorList.length})`}</button>
              <button onClick={() => session.toggleDrawer('evidence')} style={drawerBtnStyle('#8b5cf6')}>Sources</button>
              <button onClick={() => session.toggleDrawer('cost')} style={drawerBtnStyle('#64748b')}>Cost</button>
              <button onClick={() => session.setShowHandoffModal(true)} style={{ ...drawerBtnStyle('#f59e0b'), fontWeight: 700 }}>Talk to John</button>
            </>
          )}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, maxWidth: 760, width: '100%', margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column' }}>
        <PersonaChips activePersona={session.activePersona} onSelect={session.setActivePersona} />
        <MessageList messages={session.messages} />
        <ThinkingStream steps={session.thinkingSteps} visible={session.phase === 'thinking' || (session.thinkingSteps.length > 0 && session.phase === 'report')} />
        <ChatInput onSubmit={handleSubmit} disabled={isProcessing} />
      </div>

      {/* Drawers */}
      <DrawerPanel title="Trust snapshot" isOpen={session.openDrawers.report} onClose={() => session.toggleDrawer('report')}>
        <ReportPanel report={session.reportData} />
      </DrawerPanel>
      <DrawerPanel title="Vendor shortlist" badge={vendorList.length} isOpen={session.openDrawers.vendor} onClose={() => session.toggleDrawer('vendor')}>
        <VendorShortlist vendors={vendorList} onShortlist={handleShortlist} onDefer={handleDefer} />
      </DrawerPanel>
      <DrawerPanel title="Sources & evidence" badge={evidenceList.length} isOpen={session.openDrawers.evidence} onClose={() => session.toggleDrawer('evidence')}>
        <EvidenceDrawer evidence={evidenceList} />
      </DrawerPanel>
      <DrawerPanel title="Inference cost" isOpen={session.openDrawers.cost} onClose={() => session.toggleDrawer('cost')}>
        <CostDrawer receipts={costList} />
      </DrawerPanel>

      {/* Modals */}
      {session.showSaveModal && (
        <SaveModal
          onSave={(data) => { console.log('save', data); session.setShowSaveModal(false); }}
          onDismiss={() => session.setShowSaveModal(false)}
        />
      )}
      {session.showHandoffModal && (
        <HandoffModal
          sessionSummary={sessionSummary}
          onSubmit={() => { console.log('handoff submitted'); session.setShowHandoffModal(false); }}
          onDismiss={() => session.setShowHandoffModal(false)}
        />
      )}
    </div>
  );
}

function drawerBtnStyle(color) {
  return {
    padding: '6px 12px',
    borderRadius: 6,
    border: `1px solid ${color}44`,
    background: `${color}11`,
    color,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.3px',
  };
}
```

- [ ] **Step 2: Add /chat route to App.jsx**

Edit `frontend/src/App.jsx` — add import and route:
```diff
+ import Chat from './pages/Chat';
```
And in Routes:
```diff
+ <Route path="/chat" element={<Chat />} />
```

- [ ] **Step 3: Run all tests**

```bash
cd frontend && npm test
```

Expected: all 21 tests pass (1 canary + 4 mock-data + 6 hook + 5 chat-smoke + 5 drawer-smoke).

- [ ] **Step 4: Manual smoke — run dev server**

```bash
cd frontend && npm run dev
```
Open `http://localhost:5173/chat`.

Verify:
- [ ] Page loads without errors
- [ ] Persona chips render (Sofia / Leonardo / Edison / John)
- [ ] Example chips appear in input area
- [ ] Click the honey example chip (or type: "Imagine you are selling Manuka honey at a stall in King's Cross on a Saturday morning...") and click Start
- [ ] Thinking steps animate through (all 7)
- [ ] Four persona messages appear (Sofia / Leonardo / Edison / John)
- [ ] Header drawer buttons appear (Report / Vendors / Sources / Cost / Talk to John)
- [ ] Report drawer opens with 13 sections
- [ ] Vendor drawer shows timing buckets (Now / Soon / Later)
- [ ] Adding vendor to shortlist changes its state
- [ ] Evidence drawer shows 3 sources
- [ ] Cost drawer shows total and per-model breakdown
- [ ] Talk to John shows handoff modal with preview
- [ ] Save modal appears ~3s after report loads
- [ ] Keep exploring dismisses save modal
- [ ] All existing routes still work: `/`, `/audit`, `/report`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Chat.jsx frontend/src/App.jsx
git commit -m "feat(chat): phase 0 Chat page — full mock demo flow wired end-to-end"
```

---

## Phase 0 Gate Criteria

**Before Phase 1 can begin, ALL of the following must be true:**

- [ ] `npm test` in `frontend/` passes with zero failures
- [ ] `/chat` route loads in under 3s
- [ ] Honey demo runs without console errors from intake to handoff
- [ ] All 4 personas respond
- [ ] All drawer panels open and close correctly
- [ ] Save modal and handoff modal appear and dismiss correctly
- [ ] All existing routes (`/`, `/audit`, `/report`, `/portal`) still render without errors
- [ ] At least one other person (not the builder) has seen the demo and confirmed: "I understand what this does"

---

# Phase 1 — Conversation State Model

**Goal:** Replace mock data with a real session object persisted in Postgres. The frontend sends messages to a real API. Sessions survive page refresh.

**Deliverables:**
- `POST /v2/chat/sessions` — create session
- `POST /v2/chat/sessions/:id/messages` — add message
- `GET /v2/chat/sessions/:id` — retrieve session with messages
- `PATCH /v2/chat/sessions/:id/context` — update company context
- Postgres schema: `chat_sessions`, `chat_messages`, `company_context`
- Frontend: `useChatSession` reads/writes from API, not local state

**Key data shapes:** See Phase 1 session object schema in brief (§ 20, Phase 1).

**Gate criteria:**
- [ ] API unit tests pass for all four endpoints
- [ ] Session survives page refresh (localStorage session_id → GET rehydrates state)
- [ ] Memory items (user-provided, inferred, uncertain) stored and returned correctly
- [ ] No mock data used in happy path

**Detailed plan:** Write when Phase 0 gate closes.

---

# Phase 2 — Persona Orchestration

**Goal:** Real persona responses from VECTOR. Each persona has a system prompt. Responses are streamed via SSE.

**Deliverables:**
- `POST /v2/chat/sessions/:id/persona-pass` — runs all 4 personas, streams responses
- Persona system prompts for Sofia, Leonardo, Edison, John_AI
- SSE stream to frontend; frontend renders messages as they arrive
- Route: `claude-*` models via VECTOR at `localhost:3003/v1`

**Gate criteria:**
- [ ] Honey demo produces real persona responses (not mock)
- [ ] Streaming works — messages appear incrementally
- [ ] John_AI response always includes synthetic disclosure copy
- [ ] VECTOR handles the load (4 concurrent calls per session submission)

**Detailed plan:** Write when Phase 1 gate closes.

---

# Phase 3 — Visible Thinking Events

**Goal:** Replace simulated thinking steps with real model reasoning events. Every thinking step has a cost receipt attached.

**Deliverables:**
- `GET /v2/chat/sessions/:id/thinking-stream` — SSE endpoint
- Thinking step event schema with `sources`, `provider`, `cost_ref` fields
- `report_section` events include `sources` array (the schema gap from prior session)
- Frontend renders real steps as they arrive

**Gate criteria:**
- [ ] Each thinking step shows real provider and real duration
- [ ] Cost receipt created for every model call in thinking stream
- [ ] `sources` array populated on `report_section` events
- [ ] Thinking stream never hangs — timeout at 30s, surface failure gracefully

**Detailed plan:** Write when Phase 2 gate closes.

---

# Phase 4 — Report Generation

**Goal:** Real report generated from session context. All 13 sections. Editable via chat.

**Deliverables:**
- `POST /v2/chat/sessions/:id/report` — generate report from session
- `PATCH /v2/chat/sessions/:id/report/sections/:sectionId` — update section via chat correction
- Report stored in Postgres, versioned
- Frontend report panel renders live sections as they arrive

**Gate criteria:**
- [ ] Report generates from real session context (not honey hardcode)
- [ ] All 13 sections present and populated
- [ ] User can say "actually we already have MFA" and report section updates
- [ ] Report version history stored (not overwritten)

**Detailed plan:** Write when Phase 3 gate closes.

---

# Phase 5 — Snapshot System

**Goal:** Sessions can be saved as versioned, permissioned snapshots.

**Deliverables:**
- `POST /v2/snapshots` — create snapshot from session
- `GET /v2/snapshots/:id` — retrieve snapshot
- `GET /v2/snapshots` — list user's snapshots
- Snapshot diff: what changed since last snapshot
- Frontend: snapshot history timeline, "changes since last" indicator

**Gate criteria:**
- [ ] Snapshot creates, stores, and retrieves correctly
- [ ] Second snapshot shows diff from first
- [ ] Default permission is `private`
- [ ] Snapshot ID is URL-safe (shareable link foundation)

**Detailed plan:** Write when Phase 4 gate closes.

---

# Phase 6 — Evidence / Source Drawer

**Goal:** Every claim in every report section has evidence refs. Inline links work. Drawer drills into evidence.

**Deliverables:**
- Claims schema with `evidence_refs` array
- Evidence schema with `source_type`, `visibility`, `summary`
- Frontend: inline clickable links in report text
- Drawer: claim → evidence → "why this matters" → technical detail

**Gate criteria:**
- [ ] Every report section has at least one claim with evidence ref
- [ ] Drawer opens to correct evidence for clicked claim
- [ ] Evidence visibility enforced (internal evidence not visible in shareable view)
- [ ] "Show technical detail" link works for at least one claim type

**Detailed plan:** Write when Phase 5 gate closes.

---

# Phase 7 — PULSUS Cost Receipts

**Goal:** Every model call in the system creates a PULSUS cost receipt. Cost drawer shows real numbers.

**Deliverables:**
- Cost receipt written to PULSUS ledger for every VECTOR call
- `GET /v2/chat/sessions/:id/costs` — returns all receipts for a session
- Cost drawer shows real provider, model, tokens, estimated cost
- Beta notice: "Free while we learn"
- `changed_recommendation` flag set when model call materially changed output

**Gate criteria:**
- [ ] Every VECTOR call in the system produces a receipt
- [ ] Cost drawer shows accurate totals
- [ ] `changed_recommendation` is non-trivially computed (not always true)
- [ ] PULSUS ledger (even if stub) receives events

**Detailed plan:** Write when Phase 6 gate closes.

---

# Phase 8 — Vendor Shortlist

**Goal:** Vendor shortlist is real, stored, and managed. Timing buckets are logic-driven, not hardcoded.

**Deliverables:**
- Vendor recommendation engine (config-driven, not ML)
- `GET /v2/chat/sessions/:id/vendors` — get vendor shortlist
- `PATCH /v2/chat/sessions/:id/vendors/:id` — shortlist / defer / dismiss
- Timing logic: based on company stage, buyer type, industry, region
- FORUM integration stub: price query when vendor is shortlisted

**Gate criteria:**
- [ ] Vendor list changes when company context changes (not hardcoded)
- [ ] Shortlist status persists across page refresh
- [ ] "Ask why" explains recommendation factors
- [ ] At least 3 vendor categories covered with region-aware logic

**Detailed plan:** Write when Phase 7 gate closes.

---

# Phase 9 — Human Handoff

**Goal:** "Talk to John" sends real context to John via Telegram and creates a HubSpot lead.

**Deliverables:**
- `POST /v2/leads` — create lead from session
- Lead payload: company summary, snapshot_id, vendor shortlist, requested help, consent
- Telegram delivery via SIGNUM (or direct bot call as stub)
- HubSpot contact creation via existing SIGNUM/HubSpot integration
- Frontend: handoff modal shows what John will see, requires explicit consent

**Gate criteria:**
- [ ] Lead payload delivered to John's Telegram
- [ ] HubSpot contact created with correct fields
- [ ] Consent is explicit (checkbox, not implied)
- [ ] "No repeated backstory" — John can click snapshot link and see full context
- [ ] Lead stored in Postgres for admin view

**Detailed plan:** Write when Phase 8 gate closes.

---

# Phase 10 — Connectors

**Goal:** Context gap cards prompt connector suggestions. First real connector: Xero (read-only).

**Deliverables:**
- Context gap detection: identifies when a connector would improve a specific answer
- Connector prompt card UI: "Edison can estimate X — but read-only Y access would verify it"
- Xero OAuth flow (CF Worker callback, already templated)
- AWS read-only posture connector (read Tags, describe EC2)
- Connector consent: explicit, scoped, revocable

**Gate criteria:**
- [ ] Context gap card appears when relevant (not always)
- [ ] Xero OAuth flow completes and produces a token
- [ ] Xero data improves at least one report section (financial readiness)
- [ ] No connector is forced — all have "Skip for now" option

**Detailed plan:** Write when Phase 9 gate closes.

---

# Phase 11 — ARGUS-lite Market Read

**Goal:** Scheduled market read via Gemini, Perplexity, and Grok. Results feed into trust snapshot.

**Deliverables:**
- `POST /v2/argus/run` — trigger manual market read for a company
- Providers: Perplexity (answer engine), Gemini (regulatory/public), Grok (social sentiment)
- Market read output: signals, sentiment, changed-since-last, cost receipts
- Frontend: "Refresh market read" button in report panel
- Scheduler: daily runs for saved sessions (proof360 cron, not ARGUS infra)

**Gate criteria:**
- [ ] Market read returns structured signals for at least 2 providers
- [ ] Sentiment classified (positive/neutral/negative/unclear)
- [ ] `changed_since_last` correctly populated on second run
- [ ] Cost receipts created for all three provider calls
- [ ] Manual run triggers in < 30s

**Detailed plan:** Write when Phase 10 gate closes.

---

## Cross-phase invariants

These apply to every phase:

1. **VECTOR routing.** Every model call routes through `http://localhost:3003/v1`. No direct provider calls.
2. **Guard for mutations.** Any state mutation that touches a lead, snapshot, or attested claim must pass through Guard.
3. **No forced auth.** Auth is offered after value is shown, never demanded upfront.
4. **Existing v1 routes preserved.** `/audit`, `/report`, `/portal`, `/account` work throughout.
5. **SSE streams time out.** All streaming endpoints have a 30s timeout with graceful failure state.
6. **Every commit is green.** Tests pass before every commit. No "fix later" commits.

---

*Roadmap written: 2026-05-15 · Authority: john-coates · Repo: proof360*
*Next action: Begin Phase 0, Task 0.0 (test infrastructure)*
