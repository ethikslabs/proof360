# Persona Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Sophia / Leonardo / Edison AI advisor chat as a sticky footer bar on the Report page and Founder account, with real Claude API streaming and localStorage persistence per persona per company.

**Architecture:** New `POST /api/chat` Fastify handler streams tokens from the Anthropic SDK using `reply.raw`. A single `PersonaChat` React component handles all UI state, localStorage persistence, and streaming via native `fetch` + `ReadableStream`. Mounted in Report.jsx (always) and FounderDashboard.jsx (using most recent saved report as context).

**Tech Stack:** Fastify (Node.js, ESM), `@anthropic-ai/sdk` (already in package.json), React + Vite, native `fetch` + `ReadableStream`, localStorage

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `api/src/services/persona-prompts.js` | System prompt builder per persona |
| Create | `api/src/handlers/chat.js` | `POST /api/chat` — stream from Claude |
| Modify | `api/src/server.js` | Register the new route |
| Create | `frontend/src/components/PersonaChat.jsx` | Full persona chat UI + streaming + persistence |
| Modify | `frontend/src/pages/Report.jsx` | Mount `<PersonaChat>` with report context |
| Modify | `frontend/src/pages/FounderDashboard.jsx` | Mount `<PersonaChat>` with most-recent-report context |

---

## Task 1: Install the Anthropic SDK

The SDK is declared in `api/package.json` but not yet installed.

**Files:** none (no source changes)

- [ ] **Step 1: Install dependencies**

```bash
cd api && npm install
```

Expected: `node_modules/@anthropic-ai/sdk/` appears.

- [ ] **Step 2: Verify**

```bash
node -e "import('@anthropic-ai/sdk').then(m => console.log('ok', m.default.name))"
```

Expected: `ok Anthropic`

- [ ] **Step 3: Commit**

```bash
git add api/package-lock.json
git commit -m "chore: install @anthropic-ai/sdk"
```

---

## Task 2: Persona prompt builder

**Files:**
- Create: `api/src/services/persona-prompts.js`

- [ ] **Step 1: Create the file**

```js
// api/src/services/persona-prompts.js

function gapsList(gaps) {
  if (!gaps?.length) return 'none identified';
  return gaps.map(g => `${g.id} (${g.severity})`).join(', ');
}

const PROMPTS = {
  sophia: ({ company_name, website, score, gaps }) => `
You are Sophia, a narrative advisor for founders. Your lens is story — how this company's trust posture reads to investors, customers, and partners.

The founder runs ${company_name}${website ? ` (${website})` : ''}. Their Proof360 trust score is ${score}/100. Their confirmed gaps are: ${gapsList(gaps)}.

Your voice is warm, direct, and coach-like. You create space rather than filling it. Ask one question — never five. Give one observation at a time. You never lecture. You never summarise the whole report back to them. You always reference something specific from their data.

Keep responses to 2–4 sentences. If the founder wants more, they'll ask.
`.trim(),

  leonardo: ({ company_name, website, score, gaps }) => `
You are Leonardo, a strategic advisor for founders. Your lens is market position — how this company's trust posture affects fundraising, partnerships, and competitive standing.

The founder runs ${company_name}${website ? ` (${website})` : ''}. Their Proof360 score is ${score}/100. Their confirmed gaps are: ${gapsList(gaps)}.

Your voice is direct, commercial, and precise. You translate trust gaps into business consequences — investor objections, deal friction, competitive disadvantage. You do not explain what the gaps are (they know). You explain what those gaps cost them in the market.

One consequence or one strategic recommendation per response. 2–4 sentences. Reference at least one specific gap or score. No pep talk.
`.trim(),

  edison: ({ company_name, website, score, gaps }) => `
You are Edison, a technical advisor for founders. Your lens is execution — what needs to be fixed, in what order, and how.

The founder runs ${company_name}${website ? ` (${website})` : ''}. Their Proof360 score is ${score}/100. Their confirmed gaps are: ${gapsList(gaps)}.

Your voice is calm, precise, and sequenced. You speak in specifics: tools, steps, timelines, tradeoffs. You optimise for the fastest path to a meaningful score improvement. You do not frame things emotionally. You do not give general security advice.

One recommendation at a time. 2–4 sentences. Always reference the specific gap you're addressing. Ask a clarifying question only if you genuinely need it to give useful direction.
`.trim(),
};

export function buildSystemPrompt(persona, context) {
  const builder = PROMPTS[persona];
  if (!builder) throw new Error(`Unknown persona: ${persona}`);
  return builder(context);
}
```

- [ ] **Step 2: Manual verify**

```bash
cd api && node --input-type=module <<'EOF'
import { buildSystemPrompt } from './src/services/persona-prompts.js';
const ctx = { company_name: 'Stackfield', website: 'stackfield.com', score: 62, gaps: [{ id: 'soc2', severity: 'critical' }] };
console.log(buildSystemPrompt('sophia', ctx).slice(0, 120));
console.log(buildSystemPrompt('leonardo', ctx).slice(0, 120));
console.log(buildSystemPrompt('edison', ctx).slice(0, 120));
EOF
```

Expected: three different prompt openings, no errors.

- [ ] **Step 3: Commit**

```bash
git add api/src/services/persona-prompts.js
git commit -m "feat: persona system prompt builder (sophia/leonardo/edison)"
```

---

## Task 3: Chat handler (streaming)

**Files:**
- Create: `api/src/handlers/chat.js`

- [ ] **Step 1: Create the handler**

```js
// api/src/handlers/chat.js
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from '../services/persona-prompts.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_PERSONAS = ['sophia', 'leonardo', 'edison'];

export async function chatHandler(request, reply) {
  const { persona, messages, context } = request.body ?? {};

  // Validate
  if (!VALID_PERSONAS.includes(persona)) {
    return reply.status(400).send({ error: 'invalid_persona' });
  }
  if (!Array.isArray(messages)) {
    return reply.status(400).send({ error: 'messages_required' });
  }
  if (!context?.company_name) {
    return reply.status(400).send({ error: 'context_required' });
  }

  // Strip uiOnly messages before sending to Claude
  const apiMessages = messages
    .filter(m => !m.uiOnly)
    .map(({ role, content }) => ({ role, content }));

  // Must have at least one user message
  if (!apiMessages.length || apiMessages[apiMessages.length - 1].role !== 'user') {
    return reply.status(400).send({ error: 'last_message_must_be_user' });
  }

  const systemPrompt = buildSystemPrompt(persona, context);

  // Delay writeHead until first token — so API failures before streaming begins
  // can still return a clean JSON 500 rather than a broken chunked response.
  let headersWritten = false;

  try {
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages: apiMessages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        if (!headersWritten) {
          reply.raw.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
          });
          headersWritten = true;
        }
        reply.raw.write(event.delta.text);
      }
    }

    if (headersWritten) {
      reply.raw.end();
    } else {
      return reply.status(500).send({ error: 'chat_failed' });
    }
  } catch (err) {
    request.log.error(err, 'persona chat stream error');
    if (!headersWritten) {
      return reply.status(500).send({ error: 'chat_failed' });
    }
    try {
      reply.raw.write('\n\n[error]');
      reply.raw.end();
    } catch {
      // stream already closed
    }
  }
}
```

Note: `claude-haiku-4-5-20251001` is used here (same as signal-extractor) — fast and cheap for conversational turns. The `max_tokens: 300` enforces the 2–4 sentence constraint at the model level.

- [ ] **Step 2: Register route in server.js**

Open `api/src/server.js`. After the existing imports, add:

```js
import { chatHandler } from './handlers/chat.js';
```

After the `// --- Phase 4: Remaining ---` block, add:

```js
// --- Persona chat ---
app.post('/api/v1/chat', chatHandler);
```

- [ ] **Step 3: Manual test — valid request**

Start the API: `cd api && node --env-file=.env src/server.js`

```bash
curl -N -X POST http://localhost:3002/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "persona": "sophia",
    "messages": [{"role":"user","content":"What should I focus on first?"}],
    "context": {"company_name":"Stackfield","website":"stackfield.com","score":62,"gaps":[{"id":"soc2","severity":"critical"}]}
  }'
```

Expected: tokens stream back as plain text, not buffered.

- [ ] **Step 4: Manual test — invalid persona**

```bash
curl -s -X POST http://localhost:3002/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"persona":"bob","messages":[],"context":{"company_name":"X"}}'
```

Expected: `{"error":"invalid_persona"}`

- [ ] **Step 5: Commit**

```bash
git add api/src/handlers/chat.js api/src/server.js
git commit -m "feat: POST /api/v1/chat — streaming persona advisor endpoint"
```

---

## Task 4: PersonaChat component

**Files:**
- Create: `frontend/src/components/PersonaChat.jsx`

This is the largest task. Build it in two sub-steps: collapsed bar first, then expanded panel + streaming.

- [ ] **Step 1: Create the file with collapsed bar only**

```jsx
// frontend/src/components/PersonaChat.jsx
import { useState, useEffect, useRef } from 'react';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

const PERSONAS = {
  sophia:   { label: 'Sophia',   sublabel: 'Narrative lens',    initial: 'S', color: '#7c3aed', accent: '#a855f7', bg: 'rgba(124,58,237,0.09)', border: 'rgba(124,58,237,0.28)', bubble: 'rgba(124,58,237,0.15)', text: '#e9d5ff' },
  leonardo: { label: 'Leonardo', sublabel: 'Market & strategy', initial: 'L', color: '#d97706', accent: '#f59e0b', bg: 'rgba(234,179,8,0.07)',   border: 'rgba(234,179,8,0.22)',   bubble: 'rgba(234,179,8,0.15)',   text: '#fef3c7' },
  edison:   { label: 'Edison',   sublabel: 'Technical lens',    initial: 'E', color: '#0d9488', accent: '#14b8a6', bg: 'rgba(20,184,166,0.07)',  border: 'rgba(20,184,166,0.22)',  bubble: 'rgba(20,184,166,0.15)',  text: '#ccfbf1' },
};

const SOPHIA_OPENER = { role: 'assistant', content: "I've looked at your results. What's weighing on you most right now?", uiOnly: true };

function normaliseName(name) {
  return (name || 'unknown').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function storageKey(persona, companyName) {
  return `p360_persona_${persona}_${normaliseName(companyName)}`;
}

function loadThread(persona, companyName) {
  try { return JSON.parse(localStorage.getItem(storageKey(persona, companyName)) || 'null') || []; }
  catch { return []; }
}

function saveThread(persona, companyName, thread) {
  localStorage.setItem(storageKey(persona, companyName), JSON.stringify(thread));
}

function Avatar({ persona, size = 32 }) {
  const p = PERSONAS[persona];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${p.color}, ${p.accent})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: '#fff',
    }}>
      {p.initial}
    </div>
  );
}

export default function PersonaChat({ context }) {
  const { company_name, score, website, gaps } = context || {};

  const [activePersona, setActivePersona] = useState('sophia');
  const [expanded, setExpanded] = useState(false);
  const [threads, setThreads] = useState({ sophia: [], leonardo: [], edison: [] });
  const [drafts, setDrafts] = useState({ sophia: '', leonardo: '', edison: '' });
  const [streamingPersona, setStreamingPersona] = useState(null);
  const [streamingContent, setStreamingContent] = useState('');
  const abortRef = useRef(null);
  const threadEndRef = useRef(null);

  // Load threads on mount / context change
  useEffect(() => {
    if (!company_name) return;

    // Abort any in-flight stream
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStreamingPersona(null);
    setStreamingContent('');
    setDrafts({ sophia: '', leonardo: '', edison: '' });

    const loaded = {
      sophia:   loadThread('sophia',   company_name),
      leonardo: loadThread('leonardo', company_name),
      edison:   loadThread('edison',   company_name),
    };
    // Seed Sophia opener if empty
    if (loaded.sophia.length === 0) {
      loaded.sophia = [SOPHIA_OPENER];
      saveThread('sophia', company_name, loaded.sophia);
    }
    setThreads(loaded);
  }, [company_name]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, []);

  // Auto-scroll thread to bottom
  useEffect(() => {
    if (expanded) threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, streamingContent, expanded]);

  function switchPersona(persona) {
    setActivePersona(persona);
    setExpanded(true);
  }

  async function sendMessage() {
    const draft = drafts[activePersona].trim();
    if (!draft || streamingPersona) return;

    const userMessage = { role: 'user', content: draft };
    const nextThread = [...threads[activePersona], userMessage];
    setThreads(t => ({ ...t, [activePersona]: nextThread }));
    setDrafts(d => ({ ...d, [activePersona]: '' }));

    const controller = new AbortController();
    abortRef.current = controller;
    setStreamingPersona(activePersona);
    setStreamingContent('');

    try {
      const res = await fetch(`${BASE}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          persona: activePersona,
          messages: nextThread.filter(m => !m.uiOnly),
          context: { company_name, score, website, gaps },
        }),
      });

      if (!res.ok) throw new Error('chat_failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setStreamingContent(full);
      }

      if (full.endsWith('[error]')) {
        full = full.slice(0, -7).trimEnd() + ' [message failed]';
      }

      const assistantMessage = { role: 'assistant', content: full };
      const finalThread = [...nextThread, assistantMessage];
      setThreads(t => ({ ...t, [activePersona]: finalThread }));
      saveThread(activePersona, company_name, finalThread);
    } catch (err) {
      if (err.name !== 'AbortError') {
        const errThread = [...nextThread, { role: 'assistant', content: '[message failed — please try again]' }];
        setThreads(t => ({ ...t, [activePersona]: errThread }));
      }
    } finally {
      setStreamingPersona(null);
      setStreamingContent('');
      abortRef.current = null;
    }
  }

  const p = PERSONAS[activePersona];
  const others = Object.keys(PERSONAS).filter(k => k !== activePersona);
  const currentThread = threads[activePersona] || [];

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      fontFamily: '"DM Sans", sans-serif',
    }}>
      {/* Expanded panel */}
      {expanded && (
        <div style={{
          background: '#0A1628',
          border: `1px solid ${p.border}`,
          borderBottom: 'none',
          borderRadius: '12px 12px 0 0',
          maxWidth: 600, margin: '0 auto',
          display: 'flex', flexDirection: 'column',
          height: '60vh', maxHeight: 520,
        }}>
          {/* Panel header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${p.border}`,
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <Avatar persona={activePersona} size={30} />
            <div style={{ flex: 1 }}>
              <div style={{ color: p.text, fontSize: 11, fontWeight: 700, letterSpacing: '0.07em' }}>{p.label.toUpperCase()}</div>
              <div style={{ color: '#6b7280', fontSize: 10 }}>{p.sublabel}</div>
            </div>
            {/* Other persona chips */}
            <div style={{ display: 'flex', gap: 6 }}>
              {others.map(k => (
                <button key={k} onClick={() => switchPersona(k)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.7 }}>
                  <Avatar persona={k} size={24} />
                </button>
              ))}
            </div>
            {/* Collapse */}
            <button onClick={() => setExpanded(false)}
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 18, cursor: 'pointer', padding: '0 0 0 6px', lineHeight: 1 }}>
              ⌄
            </button>
          </div>

          {/* Thread */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {currentThread.map((m, i) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: isAssistant ? 'flex-start' : 'flex-end' }}>
                  {isAssistant && <Avatar persona={activePersona} size={22} />}
                  <div style={{
                    maxWidth: '82%',
                    background: isAssistant ? p.bubble : 'rgba(255,255,255,0.08)',
                    borderRadius: isAssistant ? '0 10px 10px 10px' : '10px 0 10px 10px',
                    padding: '9px 12px',
                  }}>
                    <p style={{ color: isAssistant ? p.text : '#f3f4f6', fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                      {m.content}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Streaming message */}
            {streamingPersona === activePersona && streamingContent && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Avatar persona={activePersona} size={22} />
                <div style={{ maxWidth: '82%', background: p.bubble, borderRadius: '0 10px 10px 10px', padding: '9px 12px' }}>
                  <p style={{ color: p.text, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                    {streamingContent}
                    <span style={{
                      display: 'inline-block', width: 7, height: 13, background: p.accent,
                      borderRadius: 1, marginLeft: 2, verticalAlign: 'middle',
                      animation: 'p360-blink 1s step-end infinite',
                    }} />
                  </p>
                </div>
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px', borderTop: `1px solid ${p.border}`,
            display: 'flex', gap: 8, flexShrink: 0,
          }}>
            <input
              value={drafts[activePersona]}
              onChange={e => setDrafts(d => ({ ...d, [activePersona]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={`Ask ${p.label}…`}
              disabled={!!streamingPersona}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${p.border}`, borderRadius: 7,
                padding: '8px 12px', color: p.text, fontSize: 13,
                outline: 'none', fontFamily: '"DM Sans", sans-serif',
                opacity: streamingPersona ? 0.5 : 1,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!drafts[activePersona].trim() || !!streamingPersona}
              style={{
                width: 34, height: 34, borderRadius: 7, flexShrink: 0,
                background: drafts[activePersona].trim() && !streamingPersona ? p.color : 'rgba(255,255,255,0.08)',
                border: 'none', color: '#fff', fontSize: 16,
                cursor: drafts[activePersona].trim() && !streamingPersona ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >↑</button>
          </div>
        </div>
      )}

      {/* Collapsed bar */}
      <div style={{
        background: '#0A1628',
        borderTop: `1px solid ${expanded ? 'transparent' : p.border}`,
        maxWidth: 600, margin: '0 auto',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Avatar persona={activePersona} size={28} />
        <input
          value={expanded ? '' : drafts[activePersona]}
          onChange={e => {
            if (!expanded) setDrafts(d => ({ ...d, [activePersona]: e.target.value }));
          }}
          onFocus={() => setExpanded(true)}
          placeholder={`Ask ${p.label}…`}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${p.border}`, borderRadius: 7,
            padding: '7px 12px', color: p.text, fontSize: 13,
            outline: 'none', fontFamily: '"DM Sans", sans-serif', cursor: 'text',
          }}
        />
        {others.map(k => (
          <button key={k} onClick={() => switchPersona(k)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Avatar persona={k} size={26} />
          </button>
        ))}
      </div>

      <style>{`
        @keyframes p360-blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file saved cleanly (no syntax errors)**

```bash
cd frontend && node --input-type=module --eval "
import('/dev/stdin').catch(e => console.error(e));
" < /dev/null || echo "use browser check"
```

Actually: just start the dev server and check the browser console.

```bash
cd frontend && npm run dev
```

Navigate to `http://localhost:5173/report/demo`. The page should load without React errors. The footer bar is not visible yet (not mounted) — that's expected.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PersonaChat.jsx
git commit -m "feat: PersonaChat component — sticky footer, streaming, localStorage persistence"
```

---

## Task 5: Mount in Report.jsx

**Files:**
- Modify: `frontend/src/pages/Report.jsx`

- [ ] **Step 1: Import the component**

At the top of `frontend/src/pages/Report.jsx`, add after the existing imports:

```js
import PersonaChat from '../components/PersonaChat';
```

- [ ] **Step 2: Mount it**

The Report component's return block ends with several modals before the closing `</div>`. Find this block near line 1634:

```jsx
      {/* ── Signal panel ── */}
      <SignalPanel signals={report.signals || []} isDemo={isDemo} />
```

Add `PersonaChat` just before the closing `</div>` of the outer wrapper (after the BookingModal block, around line 1648). The context needs `company_name`, `score`, `website`, and a simplified gaps array:

```jsx
      {/* ── Persona chat ── */}
      <PersonaChat context={{
        company_name: report.company_name,
        score: report.trust_score,
        website: report.website || null,
        gaps: (report.gaps || []).map(g => ({ id: g.gap_id, severity: g.severity })),
      }} />
```

Place this just before the final `</div>` that closes the outer wrapper.

- [ ] **Step 3: Test in browser**

Visit `http://localhost:5173/report/demo`.

Check:
- Sticky footer bar visible at bottom, Sophia avatar + input + L + E chips
- Clicking input expands the panel, Sophia's opener message visible: "I've looked at your results. What's weighing on you most right now?"
- Type a message, press Enter — request goes to API (check network tab), tokens stream back live
- Collapse panel — bar remains, draft text preserved
- Click L chip — switches to Leonardo (amber colour), empty thread
- Refresh page — Sophia thread is still there (localStorage)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Report.jsx
git commit -m "feat: mount PersonaChat on Report page"
```

---

## Task 6: Mount in FounderDashboard.jsx

**Files:**
- Modify: `frontend/src/pages/FounderDashboard.jsx`

The FounderDashboard doesn't have an "open report" state — reports are shown as a list with "View →" links. The persona chat will use the **most recently saved report** as context. This gives founders immediate access to their advisors without needing to open a specific report.

**Note:** The spec describes a report-switching teardown path (abort in-flight stream, reload threads for the new context). That path is **deferred** — it requires a "selected report" UI state in FounderDashboard that doesn't exist yet. The teardown logic is fully implemented in `PersonaChat` (triggered by `context` prop changes) and will activate automatically once report selection is added to FounderDashboard in a future iteration.

- [ ] **Step 1: Import the component**

At the top of `frontend/src/pages/FounderDashboard.jsx`, add after the existing imports:

```js
import PersonaChat from '../components/PersonaChat';
```

- [ ] **Step 2: Compute most-recent-report context**

In the `FounderDashboard` component function, find where `reports` is read from state (near the top, after the `useEffect` hooks). After it, add:

```js
const mostRecentReport = reports.length > 0
  ? reports.sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at))[0]
  : null;

const personaContext = mostRecentReport ? {
  company_name: mostRecentReport.company_name,
  score: mostRecentReport.trust_score,
  website: mostRecentReport.website || null,
  gaps: (mostRecentReport.gaps || []).map(g => ({ id: g.gap_id || g.id, severity: g.severity })),
} : null;
```

- [ ] **Step 3: Mount conditionally**

Find the closing `</div>` at the very end of the FounderDashboard return block (after the footer, around line 424). Just before it, add:

```jsx
      {/* ── Persona chat ── */}
      {personaContext && <PersonaChat context={personaContext} />}
```

- [ ] **Step 4: Check what fields are in a saved report**

Saved reports are written by `saveAndTrack()` in `Report.jsx`. Grep for it:

```bash
grep -n "saveAndTrack\|company_name\|gaps_count\|trust_score" frontend/src/pages/Report.jsx | head -20
```

If `gaps` (full array) is not saved — only `gaps_count` — then `personaContext.gaps` will be empty. That's fine: the personas will still work, they just won't have per-gap detail. The score and company name are enough for useful responses.

- [ ] **Step 5: Test in browser**

Visit `http://localhost:5173/report/demo`, save the report. Then navigate to `http://localhost:5173/account`.

Check:
- Persona footer bar visible (using Stackfield context)
- Thread from the Report page is still there — same localStorage key, same company name
- Conversation is persistent and continuous across both pages

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/FounderDashboard.jsx
git commit -m "feat: mount PersonaChat on FounderDashboard using most-recent report context"
```

---

## Task 7: Bottom padding (prevent content hidden behind bar)

The sticky footer bar is ~56px tall. Without padding, the bottom of each page's content will sit behind it.

**Files:**
- Modify: `frontend/src/pages/Report.jsx`
- Modify: `frontend/src/pages/FounderDashboard.jsx`

- [ ] **Step 1: Add bottom padding to Report.jsx**

Find the outer wrapper div at the start of the Report return (around line 1408):
```jsx
<div style={{ background: WHITE, minHeight: '100vh', fontFamily: '"Outfit", sans-serif' }}>
```

Add `paddingBottom: 70` to that style object.

- [ ] **Step 2: Add bottom padding to FounderDashboard.jsx**

Find the main content wrapper div and add `paddingBottom: 70` to its style.

- [ ] **Step 3: Verify**

Scroll to the bottom of each page — the footer / CTA section should not be hidden behind the persona bar.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Report.jsx frontend/src/pages/FounderDashboard.jsx
git commit -m "fix: add bottom padding to prevent content hidden behind PersonaChat bar"
```

---

## Done — full smoke test

With API and frontend both running:

1. Visit `/report/demo`
2. Scroll — persona bar visible at bottom throughout
3. Type a message to Sophia, see streaming response
4. Switch to Edison (teal), send a technical question
5. Refresh — Sophia and Edison threads both persist
6. Click "Save this report →"
7. Navigate to `/account`
8. Persona bar visible, Sophia thread from the report is still there
9. Send another message from the account — conversation continues seamlessly

---

## Notes for future iterations

- `max_tokens: 300` on the backend enforces short responses. Increase if needed.
- Model is `claude-haiku-4-5-20251001` — fast and cheap for chat. Upgrade to Sonnet for richer responses when ready.
- Thread history sent on every request grows unbounded. Cap at last N messages when thread grows large (e.g., `messages.slice(-20)`).
- Empty-message guard: the send button is disabled when draft is empty — no backend guard needed.
- Zero-gaps case: personas handle it gracefully (the system prompt renders `"none identified"`).
