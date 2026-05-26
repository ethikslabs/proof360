# Chat Chrome Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace proof360's chat landing state with a Claude.ai-style clean hero (input + mode tiles), add full input chrome (model picker, STT, + menu with connectors flyout), remove auto-scroll, and add response metadata footer.

**Architecture:** Surgical edits to `Chat.jsx` (remove auto-type, auto-scroll, wire new components), new `ModeTiles.jsx` component below the input, extended `ChatInput.jsx` (model picker replaces ModeSelector, STT activated, Integrations flyout added), `Bubble.jsx` extended with provider badge + source pills.

**Tech Stack:** React 18, Vite, inline styles (no CSS files — follow existing pattern). No test suite — verification is visual via `cd frontend && npm run dev`.

**Spec:** `docs/specs/2026-05-26-chat-chrome-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/pages/Chat.jsx` | Modify | Remove auto-scroll (line 902–913), remove Sophia auto-type default path (lines 973–1006), wire ModeTiles, pass model state to ChatInput |
| `frontend/src/components/chat/ModeTiles.jsx` | **Create** | 5 mode tiles + question panel, active tile state, onSelect callback |
| `frontend/src/components/chat/ChatInput.jsx` | Modify | Replace ModeSelector with ModelPicker, add Integrations flyout to PlusMenu, activate STT mic button, add waveform bars |
| `frontend/src/components/chat/Bubble.jsx` | Modify | Add provider badge to model crumb, add source pills row |

---

## Task 1: Remove auto-scroll

**Files:**
- Modify: `frontend/src/pages/Chat.jsx:902–913`

The `useEffect` at line 902 fires on every `messages` change and scrolls to the bottom. Remove it entirely. The view stays wherever it is — user scrolls themselves.

- [ ] **Step 1: Delete the auto-scroll useEffect**

In `Chat.jsx`, find and delete lines 902–913:
```js
// DELETE THIS ENTIRE useEffect:
useEffect(() => {
  const el = scrollRef.current;
  if (!el) return;
  // Double-rAF: first frame triggers layout, second frame reads the settled scrollHeight
  let outer, inner;
  outer = requestAnimationFrame(() => {
    inner = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  });
  return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
}, [messages, thinkingSteps]);
```

- [ ] **Step 2: Verify visually**

Run `cd frontend && npm run dev`. Go to `/chat`, submit a message. The page should NOT scroll down to the response — the view stays anchored. You should have to scroll manually to read the reply.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Chat.jsx
git commit -m "feat(chat): remove auto-scroll — view anchors at top, user controls position"
```

---

## Task 2: Remove Sophia auto-type on landing

**Files:**
- Modify: `frontend/src/pages/Chat.jsx:950–1007`

The `useEffect` at line 950 runs `run()` for the default case, which types the Sophia intro message. Replace the default path with immediate ready state + triage phase. The existing early-return paths for `seedQuery`, `returningUser`, `seedDemo` must stay untouched.

- [ ] **Step 1: Replace the default run() with immediate ready state**

In `Chat.jsx`, the useEffect at line 950 looks like this (simplified):
```js
useEffect(() => {
  if (seedQuery)      { /* ...early return... */ return; }
  if (t.returningUser || seedReturning) { /* ...early return... */ return; }
  if (seedDemo)       { /* ...early return... */ return; }

  // DEFAULT PATH — lines 973-1006 — DELETE ALL OF THIS:
  let cancelled = false;
  const speedMs = t.typeSpeed === 'fast' ? 8 : t.typeSpeed === 'instant' ? 0 : 18;
  async function run() {
    setMessages([]);
    setInputReady(false);
    // ... types SOPHIA_INTRO character by character ...
    run();
    return () => { cancelled = true; };
  }
```

Replace everything from `let cancelled = false;` through the closing `}, [runId, ...]` with:
```js
  // Default: clean landing — input ready immediately, no auto-type
  setMessages([]);
  setInputReady(true);
  setBriefShown(false);
  setPulsingQ(null);
  setPhase('triage');
  setIntent(null);
  setPreviewUrl(null);
  setPreviewOpen(false);
  setBrowserTabs([]);
  setThinkingSteps([]);
  setActiveStageId(DEFAULT_STAGE_ID);
  setCompanyData(null);
}, [runId, t.returningUser, seedQuery, seedReturning, seedDemo]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 2: Verify visually**

Reload `/chat`. The page should show the heading "Investors are evaluating you *right now.*", the input, and the action chips — with no Sophia message appearing. The input should be immediately active (not greyed out).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Chat.jsx
git commit -m "feat(chat): remove Sophia auto-type on landing — clean hero state"
```

---

## Task 3: Create ModeTiles component

**Files:**
- Create: `frontend/src/components/chat/ModeTiles.jsx`

Renders 5 mode tiles below the input. Clicking a tile shows a 5-question panel. Clicking a question calls `onSelect(questionText)`. Clicking × dismisses the panel. Only one tile active at a time.

- [ ] **Step 1: Create the file**

```jsx
// frontend/src/components/chat/ModeTiles.jsx
import { useState } from 'react';
import { tokens } from '../../tokens.js';

const MODES = [
  {
    id: 'investor', label: 'Investor', icon: '📈',
    questions: [
      'What do investors check before wiring money?',
      'What breaks due diligence for a Series A?',
      'Which compliance gaps would a VC flag first?',
      'What evidence of traction matters most right now?',
      'How do I close the investor readiness gap in 90 days?',
    ],
  },
  {
    id: 'diligence', label: 'Diligence', icon: '🔍',
    questions: [
      'What goes in a Series A data room?',
      'What legal issues do DD teams flag most often?',
      'Am I ready for SOC 2 Type I?',
      'What does a technical due diligence checklist look like?',
      'How do I prepare for an investor security review?',
    ],
  },
  {
    id: 'vendor', label: 'Vendor', icon: '🤝',
    questions: [
      'Which vendor should I use to start SOC 2?',
      'What AWS programs am I eligible for?',
      'How does Cloudflare compare for a seed-stage company?',
      'What\'s the fastest path to compliance for a fintech?',
      'What do Ingram Micro and Dicker route differently?',
    ],
  },
  {
    id: 'dealroom', label: 'Deal Room', icon: '🏦',
    questions: [
      'How healthy is a typical Series A cap table?',
      'SAFE vs priced round — what do investors prefer right now?',
      'What valuation signals matter at seed stage?',
      'What term sheet clauses should I push back on?',
      'How do I build an investor pipeline from scratch?',
    ],
  },
  {
    id: 'documents', label: 'Documents', icon: '📄',
    questions: [
      'Review my pitch deck structure',
      'What\'s missing from a standard NDA for a SaaS startup?',
      'How do I structure a data room for DD?',
      'Summarise the key risks in this term sheet',
      'What does a board-ready policy document look like?',
    ],
  },
];

export function ModeTiles({ onSelect, t }) {
  const tk = tokens(t?.theme ?? 'pearl');
  const [activeId, setActiveId] = useState(null);

  const activeMode = MODES.find(m => m.id === activeId);

  function handleTileClick(id) {
    setActiveId(prev => prev === id ? null : id);
  }

  function handleQuestionClick(question) {
    setActiveId(null);
    onSelect(question);
  }

  return (
    <div style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
      {/* Tile row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: activeMode ? 10 : 0 }}>
        {MODES.map(m => {
          const isActive = activeId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleTileClick(m.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px',
                border: `1px solid ${isActive ? tk.ink : tk.hairline}`,
                borderRadius: 20,
                background: isActive ? tk.ink : '#ffffff',
                color: isActive ? '#f8f5f0' : tk.inkSoft,
                fontSize: 13, fontWeight: 500,
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = '#9ca3af';
                  e.currentTarget.style.color = tk.ink;
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = tk.hairline;
                  e.currentTarget.style.color = tk.inkSoft;
                }
              }}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Question panel */}
      {activeMode && (
        <div style={{
          background: '#ffffff',
          border: `1px solid ${tk.hairline}`,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          marginTop: 2,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px',
            borderBottom: `1px solid ${tk.hairline}`,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: tk.inkSoft,
            fontFamily: '"IBM Plex Mono", monospace',
          }}>
            <span>{activeMode.icon} {activeMode.label}</span>
            <button
              type="button"
              onClick={() => setActiveId(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: tk.inkSoft, lineHeight: 1, padding: 0 }}
            >×</button>
          </div>
          {activeMode.questions.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleQuestionClick(q)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px',
                borderBottom: i < activeMode.questions.length - 1 ? `1px solid ${tk.hairline}` : 'none',
                background: 'none', border: 'none',
                fontSize: 13, color: tk.ink, lineHeight: 1.4,
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#faf8f4'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >{q}</button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the file is saved with no syntax errors**

```bash
cd frontend && node --input-type=module < /dev/null 2>&1 || true
npx --yes acorn --ecma2020 --module src/components/chat/ModeTiles.jsx > /dev/null && echo "OK"
```

Expected: `OK` (no parse errors).

- [ ] **Step 3: No commit yet — wire in Task 4**

---

## Task 4: Wire ModeTiles into Chat.jsx

**Files:**
- Modify: `frontend/src/pages/Chat.jsx`

Replace the action chips block (lines 1412–1436) with `<ModeTiles>`. When a question is selected, set `inputValue` to the question text and call `submit()`.

- [ ] **Step 1: Add the import**

At the top of `Chat.jsx` with the other chat component imports (after line 20), add:
```js
import { ModeTiles } from '../components/chat/ModeTiles.jsx';
```

- [ ] **Step 2: Replace the action chips block**

Find the block at lines 1412–1436 (the `phase === 'triage'` chips):
```jsx
{(phase === 'triage' || (phase === 'active' && !hasMessages)) && (
  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
    {(phase === 'triage' ? [
      { id: 'browse', label: 'Show me how it works', ... },
      // ...
    ] : [...]).map(chip => (
      <button ...>{chip.label}</button>
    ))}
  </div>
)}
```

Replace it with:
```jsx
{(phase === 'triage' || (phase === 'active' && !hasMessages)) && (
  <div style={{ marginTop: 14 }}>
    <ModeTiles
      t={t}
      onSelect={question => {
        setInputValue(question);
        submit(question);
        setInputValue('');
      }}
    />
  </div>
)}
```

- [ ] **Step 3: Verify visually**

Reload `/chat`. You should see 5 mode tiles: Investor / Diligence / Vendor / Deal Room / Documents. Click "Investor" — a question panel should appear with 5 questions. Click a question — it should auto-submit and Sophia should respond. Click × — question panel should dismiss without submitting.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/chat/ModeTiles.jsx frontend/src/pages/Chat.jsx
git commit -m "feat(chat): add mode tiles with 5 starter questions per mode — replaces intent chips"
```

---

## Task 5: Replace ModeSelector with ModelPicker in ChatInput.jsx

**Files:**
- Modify: `frontend/src/components/chat/ChatInput.jsx`

The existing `ModeSelector` shows "Investors ▼" for selecting analysis profile. Replace it with a `ModelPicker` showing the current VECTOR model. The model list is UI-only with mock state — actual VECTOR routing is out of scope.

- [ ] **Step 1: Define the models list and add ModelPicker component**

In `ChatInput.jsx`, find the existing `ModeSelector` function and add a new `ModelPicker` function after it (around line 230):

```jsx
const VECTOR_MODELS = [
  { id: 'claude-sonnet-4-6',  label: 'Claude Sonnet 4.6', desc: 'Balanced · everyday work',   provider: 'Bedrock',  providerColor: '#c07a00' },
  { id: 'claude-opus-4-7',    label: 'Claude Opus 4.7',   desc: 'Most capable · deep analysis', provider: 'Bedrock',  providerColor: '#c07a00' },
  { id: 'claude-haiku-4-5',   label: 'Claude Haiku 4.5',  desc: 'Fast · low latency',          provider: 'Bedrock',  providerColor: '#c07a00' },
  { id: 'llama-nemotron',     label: 'Llama Nemotron',    desc: '253B · open weights',         provider: 'NVIDIA',   providerColor: '#527a00' },
  { id: 'gemini-flash',       label: 'Gemini 2.0 Flash',  desc: 'Fast · multimodal',           provider: 'Google',   providerColor: '#1a56c2' },
  { id: 'perplexity-sonar',   label: 'Perplexity Sonar',  desc: 'Real-time · cited sources',   provider: 'Live',     providerColor: '#7c3aed' },
  { id: 'gpt-4o',             label: 'GPT-4o',            desc: 'OpenAI · via Azure',          provider: 'Foundry',  providerColor: '#0063a8' },
];

function ModelPicker({ model, onModelChange }) {
  const [open, setOpen] = useState(false);
  const [adaptive, setAdaptive] = useState(false);
  const { btnRef, pos, openMenu } = useDropdownPos(open);
  const current = VECTOR_MODELS.find(m => m.id === model) ?? VECTOR_MODELS[0];

  function toggle() {
    if (!open) openMenu();
    setOpen(o => !o);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 8px', borderRadius: 7,
          border: '1px solid #e5e7eb',
          background: open ? '#f3f4f6' : 'transparent',
          cursor: 'pointer', fontSize: 11, fontWeight: 600,
          color: '#374151', fontFamily: '"IBM Plex Mono", monospace',
          whiteSpace: 'nowrap', flexShrink: 0,
          transition: 'background 0.12s',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: current.providerColor, flexShrink: 0, display: 'inline-block' }} />
        {current.label}
        <span style={{ color: '#9ca3af', fontSize: 9 }}>▾</span>
      </button>

      {open && pos && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'fixed',
            bottom: pos.bottom, left: pos.left,
            background: '#ffffff', border: '1px solid #e5e7eb',
            borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            padding: '6px 0', minWidth: 260, zIndex: 200,
          }}>
            {/* Group rows by provider */}
            {['Bedrock', 'NVIDIA', 'Google', 'Live', 'Foundry'].map((provider, pi) => {
              const group = VECTOR_MODELS.filter(m => m.provider === provider);
              if (!group.length) return null;
              return (
                <div key={provider}>
                  {pi > 0 && <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />}
                  <div style={{ padding: '4px 14px 2px', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace' }}>
                    {provider}
                  </div>
                  {group.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { onModelChange(m.id); setOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '8px 14px',
                        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {m.label}
                          {m.id === model && <span style={{ color: '#b0956e' }}>✓</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
            {/* Adaptive thinking toggle — UI only, actual extended reasoning is follow-on */}
            <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#fafafa' }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111827' }}>Adaptive thinking</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Extended reasoning for complex questions</div>
              </div>
              <div
                onClick={() => setAdaptive(a => !a)}
                style={{
                  width: 36, height: 20, borderRadius: 10,
                  background: adaptive ? '#b0956e' : '#e5e7eb',
                  position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: 3,
                  left: adaptive ? 19 : 3,
                  width: 14, height: 14, borderRadius: 7, background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 2: Wire ModelPicker into the toolbar and accept model prop**

In `ChatInput.jsx`, find the `ChatInput` component's props and add `model` and `onModelChange`:

```jsx
export const ChatInput = forwardRef(function ChatInput({
  value, onChange, onSubmit, onContextInject,
  disabled, messages, mode, onModeChange, hideChips,
  model, onModelChange,   // ← add these two
}, ref) {
```

In the bottom toolbar (around line 429), replace `<ModeSelector mode={mode} onModeChange={onModeChange} />` with `<ModelPicker model={model ?? 'claude-sonnet-4-6'} onModelChange={onModelChange ?? (() => {})} />`.

- [ ] **Step 3: Wire model state in Chat.jsx**

In `Chat.jsx`, add model state near the other `useState` declarations:
```js
const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-6');
```

Pass it to both `ChatInput` usages (hero state at line 1392, and active state if it exists):
```jsx
<ChatInput
  ...
  model={selectedModel}
  onModelChange={setSelectedModel}
/>
```

- [ ] **Step 4: Verify visually**

Reload `/chat`. The input toolbar should show a model name with a coloured dot (e.g., "● Claude Sonnet 4.6"). Clicking it should open a grouped dropdown with all 7 models. Selecting a model should update the label.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/chat/ChatInput.jsx frontend/src/pages/Chat.jsx
git commit -m "feat(chat): replace mode selector with VECTOR model picker — 7 models, provider-grouped"
```

---

## Task 6: Add Integrations flyout to PlusMenu

**Files:**
- Modify: `frontend/src/components/chat/ChatInput.jsx`

The existing `PlusMenu` has items like "Add files", "Paste URL", "Web search". Add an "Integrations ›" item that shows a flyout panel with togglable connectors (Xero, AWS, GitHub) and "Connect →" prompts for others. This is mock state only — no OAuth.

- [ ] **Step 1: Add integration state and INTEGRATIONS config at the top of ChatInput.jsx**

After the existing `PLUS_GROUPS` constant, add:
```js
const INTEGRATIONS_CONNECTED = [
  { id: 'xero',   label: 'Xero',    icon: '📊', desc: 'Financial signals' },
  { id: 'aws',    label: 'AWS',     icon: '☁️', desc: 'Infrastructure · billing' },
  { id: 'github', label: 'GitHub',  icon: '🐙', desc: 'Codebase signals' },
];
const INTEGRATIONS_AVAILABLE = [
  { id: 'm365',    label: 'Microsoft 365', icon: '📧' },
  { id: 'hubspot', label: 'HubSpot',       icon: '🟠' },
];
```

- [ ] **Step 2: Add IntegrationsFlyout component**

After `ModelPicker`, add:
```jsx
function IntegrationsFlyout({ pos, onClose }) {
  const [enabled, setEnabled] = useState({ xero: true, aws: true, github: true });

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={onClose} />
      <div style={{
        position: 'fixed',
        bottom: pos.bottom, left: (pos.left ?? 0) + 230,
        background: '#ffffff', border: '1px solid #e5e7eb',
        borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        padding: '6px 0', minWidth: 240, zIndex: 201,
      }}>
        <div style={{ padding: '4px 14px 6px', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace' }}>Connected</div>
        {INTEGRATIONS_CONNECTED.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
            <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111827' }}>{item.label}</div>
              <div style={{ fontSize: 10.5, color: '#9ca3af' }}>{item.desc}</div>
            </div>
            {/* Toggle */}
            <div
              onClick={() => setEnabled(p => ({ ...p, [item.id]: !p[item.id] }))}
              style={{
                width: 34, height: 18, borderRadius: 9,
                background: enabled[item.id] ? '#b0956e' : '#e5e7eb',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 2,
                left: enabled[item.id] ? 18 : 2,
                width: 14, height: 14, borderRadius: 7, background: '#fff',
                transition: 'left 0.2s',
              }} />
            </div>
          </div>
        ))}
        <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
        <div style={{ padding: '4px 14px 6px', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c4b8a8', fontFamily: '"IBM Plex Mono", monospace' }}>Not connected</div>
        {INTEGRATIONS_AVAILABLE.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', opacity: 0.7 }}>
            <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{item.icon}</span>
            <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: '#111827' }}>{item.label}</div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#b0956e', cursor: 'pointer' }}>Connect →</span>
          </div>
        ))}
        <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
        <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', background: 'none', border: 'none', fontSize: 12.5, color: '#b0956e', cursor: 'pointer', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>
          <span>+</span> Add connector
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Add Integrations item to PlusMenu and render flyout**

In the `PlusMenu` component, add state and modify the render:
```js
const [integrationsOpen, setIntegrationsOpen] = useState(false);
```

Add an "Integrations" item to `PLUS_GROUPS` (last group, after Web search):
```js
// In the PLUS_GROUPS definition (or directly in the JSX), add after the last group:
<div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
<button type="button" onClick={() => setIntegrationsOpen(o => !o)} style={/* same row style */}>
  <span style={{ color: '#9ca3af' }}><IconConnector /></span>
  <span style={{ flex: 1 }}>Integrations</span>
  <span style={{ color: '#9ca3af', fontSize: 11 }}>›</span>
</button>
```

And in the JSX after the PlusMenu popup div:
```jsx
{integrationsOpen && pos && <IntegrationsFlyout pos={pos} onClose={() => { setIntegrationsOpen(false); setOpen(false); }} />}
```

Add `IconConnector` near the other icon definitions:
```jsx
function IconConnector() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="3" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="11" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/><line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="1.5"/></svg>;
}
```

- [ ] **Step 4: Verify visually**

Click the + button in the input. A popup should appear. An "Integrations ›" row should be at the bottom. Clicking it should show the flyout with Xero/AWS/GitHub toggles and Microsoft 365/HubSpot as "Connect →".

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/chat/ChatInput.jsx
git commit -m "feat(chat): add integrations flyout to plus menu — Xero/AWS/GitHub toggles"
```

---

## Task 7: Activate STT mic button

**Files:**
- Modify: `frontend/src/components/chat/ChatInput.jsx`

The mic button exists at line ~440 with `cursor: default` and no handler. Activate it: clicking the mic toggles listening state. In listening state, the button pulses and the placeholder changes. On second click (or 2s silence), the transcript fills the input. Since the STT backend is already built, check if a hook exists — otherwise build a minimal browser SpeechRecognition wrapper.

- [ ] **Step 1: Check for an existing STT hook**

```bash
find frontend/src -name "*.js" -o -name "*.jsx" | xargs grep -l "SpeechRecognition\|speechRecognition\|useStt\|useSTT" 2>/dev/null
```

If a hook exists, import and use it. If not, proceed to Step 2.

- [ ] **Step 2: Add useStt hook**

Create `frontend/src/hooks/useStt.js`:
```js
import { useState, useRef, useEffect } from 'react';

export function useStt({ onTranscript }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  // Stable ref for the callback — avoids recreating the recognition instance
  // on every render (inline arrow functions in the caller change identity each render)
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; });

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-AU';
    r.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      onTranscriptRef.current(transcript);
    };
    r.onend = () => setListening(false);
    recognitionRef.current = r;
  }, []); // empty — recognition instance is created once, callback is accessed via ref

  function toggle() {
    const r = recognitionRef.current;
    if (!r) return;
    if (listening) { r.stop(); setListening(false); }
    else { r.start(); setListening(true); }
  }

  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  return { listening, toggle, supported };
}
```

- [ ] **Step 3: Wire useStt into ChatInput**

In `ChatInput.jsx`, import the hook and wire the mic button:
```jsx
import { useStt } from '../../hooks/useStt.js';

// Inside ChatInput component, after other hooks:
const { listening, toggle: toggleStt, supported: sttSupported } = useStt({
  onTranscript: (text) => onChange(text),
});
```

Update the mic button (around line 440):
```jsx
<button
  type="button"
  title={sttSupported ? (listening ? 'Stop listening' : 'Speak your question') : 'Speech not supported'}
  onClick={sttSupported ? toggleStt : undefined}
  style={{
    width: 28, height: 28, borderRadius: 7,
    border: listening ? '1px solid #b0956e' : 'none',
    background: listening ? '#fff8f4' : 'transparent',
    color: listening ? '#b0956e' : '#d1d5db',
    cursor: sttSupported ? 'pointer' : 'default',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    animation: listening ? 'liveping 1.5s ease-in-out infinite' : 'none',
  }}
>
  <IconMic />
</button>
```

Also update the placeholder text in the textarea to show "Listening…" when active:
```jsx
placeholder={listening ? 'Listening…' : (messages?.length > 0 ? 'Ask a follow-up…' : 'Ask about your investor readiness…')}
```

- [ ] **Step 4: Verify visually**

On a Chromium browser, click the mic. A browser permission prompt should appear. On grant, speak — the transcript should appear in the input field. Click mic again — listening stops.

On browsers without SpeechRecognition (Firefox), the button should remain visually present but non-interactive (no JS error).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useStt.js frontend/src/components/chat/ChatInput.jsx
git commit -m "feat(chat): activate STT mic — browser SpeechRecognition, live transcript in input"
```

---

## Task 8: Verify input stays pinned after first submit

**Files:**
- Modify: `frontend/src/pages/Chat.jsx` (only if verification fails)

The active-state input is already a `flexShrink: 0` child in a flex column, which keeps it visible. **Verify before touching anything.** Only apply `position: fixed` if the input actually scrolls away during testing.

- [ ] **Step 1: Check where the active-state ChatInput renders**

```bash
grep -n "ChatInput" frontend/src/pages/Chat.jsx
```

Read the wrapping container for the non-hero `<ChatInput>` — note its `position`, `bottom`, and any parent `overflow` constraints.

- [ ] **Step 2: Verify visually first**

Run the dev server. Submit a message. The hero layout should collapse. The input should remain visible at the bottom. Scroll the chat area — the input should not move. If it stays pinned: **this task is done, skip Step 3**.

- [ ] **Step 3: Fix only if the input scrolls away**

If the input does scroll out of view, change its wrapping container to use fixed positioning:
```jsx
<div style={{
  position: 'fixed',
  bottom: 0,
  left: /* match the sidebar width value already in use in this file */,
  right: 0,
  background: tk.parchment,
  borderTop: `1px solid ${tk.hairline}`,
  padding: '8px 16px 12px',
  zIndex: 20,
}}>
  <ChatInput ... />
</div>
```

`position: fixed` takes the element out of the flex flow — check that the scroll area above has enough bottom padding so the last message isn't hidden behind the fixed input. Add `paddingBottom: 80` (or whatever the input height is) to the scroll container.

- [ ] **Step 4: Commit (only if Step 3 was needed)**

```bash
git add frontend/src/pages/Chat.jsx
git commit -m "feat(chat): pin input at bottom — position fixed after first submit"
```

---

## Task 9: Add provider badge and source pills to Bubble

**Files:**
- Modify: `frontend/src/components/chat/Bubble.jsx`
- Modify: `frontend/src/pages/Chat.jsx` (add `sources` and `provider` to mock message objects)

`Bubble` already renders `msg.model` and `msg.tok` in `crumbEl` (lines 178–196). Extend it to show a provider badge next to the model name, and a source pills row below the response.

- [ ] **Step 1: Add provider map and source pills to Bubble.jsx**

At the top of `Bubble.jsx` (after imports), add:
```js
const MODEL_PROVIDER = {
  'claude-sonnet-4-6': { label: 'Bedrock', color: '#c07a00' },
  'claude-opus-4-7':   { label: 'Bedrock', color: '#c07a00' },
  'claude-haiku-4-5':  { label: 'Bedrock', color: '#c07a00' },
  'llama-nemotron':    { label: 'NVIDIA',  color: '#527a00' },
  'gemini-flash':      { label: 'Google',  color: '#1a56c2' },
  'perplexity-sonar':  { label: 'Live',    color: '#7c3aed' },
  'gpt-4o':            { label: 'Foundry', color: '#0063a8' },
};
```

- [ ] **Step 2: Extend crumbEl to include provider badge**

Find `crumbEl` in `Bubble.jsx` (around line 178). It currently renders model + tok + ms. Add provider:
```jsx
const provider = MODEL_PROVIDER[msg.model];

const crumbEl = msg.model && (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
    <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace' }}>
      {msg.model}
    </span>
    {provider && (
      <span style={{
        fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
        fontFamily: '"IBM Plex Mono", monospace',
        padding: '1px 6px', borderRadius: 4,
        color: provider.color,
        background: `${provider.color}18`,
        border: `1px solid ${provider.color}30`,
      }}>
        {provider.label}
      </span>
    )}
    {msg.tok && <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace' }}>{msg.tok?.toLocaleString()} tok</span>}
    {msg.ms && <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace' }}>{(msg.ms / 1000).toFixed(1)}s</span>}
  </div>
);
```

- [ ] **Step 3: Add source pills row**

After `crumbEl`, add a `sourcesEl`:
```jsx
const sourcesEl = msg.sources?.length > 0 && (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
    <span style={{ fontSize: 9.5, color: '#c4b8a8', fontFamily: '"IBM Plex Mono", monospace' }}>from</span>
    {msg.sources.map(s => (
      <span key={s} style={{
        fontSize: 9, fontFamily: '"IBM Plex Mono", monospace',
        padding: '2px 6px', borderRadius: 4,
        background: '#f4f0e8', border: '1px solid #ddd6c8', color: '#7c6f5a',
      }}>{s}</span>
    ))}
  </div>
);
```

In the Bubble return, render `sourcesEl` below `crumbEl` (inside the assistant message wrapper):
```jsx
{crumbEl}
{sourcesEl}
```

- [ ] **Step 4: Add mock sources to Chat.jsx message objects**

In `Chat.jsx`, find where persona response messages are created (around where `getPersonaResponse` is called or where messages are pushed). Add a `sources` array to assistant messages:
```js
// When creating a response message, add:
sources: ['CORPUS', 'proof360 signals'],
// Or for web-search responses:
sources: ['CORPUS', 'proof360 signals', 'live-web'],
```

Find the `introMsg` in `getPersonaResponses` usage or the mock response builders and add `sources` there. Search for where `persona: 'sofia'` messages are constructed in Chat.jsx.

- [ ] **Step 5: Verify visually**

Submit a message. The response should show: persona label top-left, model name + provider badge bottom-right, source pills (`[CORPUS] [proof360 signals]`) below the response text.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/chat/Bubble.jsx frontend/src/pages/Chat.jsx
git commit -m "feat(chat): response metadata — provider badge, source pills, token count"
```

---

## Completion Check

After all tasks, verify the full landing-to-conversation flow:

- [ ] Landing: clean heading + input + 5 mode tiles — no Sophia, no auto-type
- [ ] Mode tile click → 5 starter questions appear
- [ ] Starter question click → auto-submits, Sophia responds
- [ ] × on question panel → dismisses without submitting
- [ ] Submit any message → input moves to fixed bottom, stays there
- [ ] New message arrives → view does NOT auto-scroll
- [ ] Model picker in input toolbar → 7 models, grouped by provider
- [ ] + button → menu with Integrations item → flyout with toggles
- [ ] Mic button → listening state on click, transcript in input
- [ ] Response has: persona label, model + provider badge, source pills, token count
- [ ] `/report`, `/audit`, `/portal`, `/account` routes all still load
