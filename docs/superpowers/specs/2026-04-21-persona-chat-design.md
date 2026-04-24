# Persona Chat — Design Spec
**Date:** 2026-04-21
**Status:** Approved

---

## Summary

Three AI advisors — Sophia, Leonardo, Edison — embedded in the Report page and Founder account as a persistent sticky footer bar. Always present, never intrusive. Real Claude API calls, streamed, with full conversation history persisted per persona per company in localStorage.

The design principle: *you always have someone to talk to.*

---

## Personas

| Persona | Colour | Lens | Voice |
|---------|--------|------|-------|
| Sophia | Purple (`#7c3aed` / `#a855f7`) | Narrative | Warm coach. Opens with "I've looked at your results. What's weighing on you most right now?" — creates space, doesn't tell the founder what to think. |
| Leonardo | Amber (`#d97706` / `#f59e0b`) | Market & strategy | Positions the founder's gaps in terms of investor narrative, competitive moat, and market timing. |
| Edison | Teal (`#0d9488` / `#14b8a6`) | Technical | Precise, gap-by-gap. Remediation steps, vendor tradeoffs, implementation sequencing. |

Each persona has a distinct system prompt grounded in the founder's actual report data (company name, score, triggered gaps, website).

### Prompt constraint (all personas)

Prompts must bias responses toward:
- **Short answers** — 2–4 sentences unless the founder explicitly asks for more
- **One thing at a time** — one question or one recommendation per response, never both
- **Explicit report grounding** — every response references at least one specific gap, score, or company fact
- **No generic founder pep talk** — no "you've got this", no summary of the whole report back to them
- **No essays** — the footer format only works at conversation pace, not lecture pace

---

## UI

### Sticky footer bar (collapsed — default)

Fixed to `bottom: 0`, full viewport width. Dark `#0A1628` background, `border-top: 1px solid rgba(124,58,237,0.3)`.

Single row:
- Sophia avatar (purple gradient circle, "S")
- `"Ask Sophia..."` input field (full flex, tapping expands)
- Leonardo avatar chip (amber)
- Edison avatar chip (teal)

Tapping the input or Sophia avatar → expands into Sophia's thread.
Tapping L or E avatar → switches active persona, expands into their thread.

### Expanded panel

Slides up to ~60% viewport height. Active persona's colour scheme applied to border, background tint, message bubbles.

Structure:
- **Header bar** — active persona avatar + name + lens label + collapse chevron. Tap to collapse.
- **Message thread** — scrollable. Sophia/Leonardo/Edison messages left-aligned with avatar; founder messages right-aligned.
- **Streaming** — tokens append live. Blinking cursor while streaming.
- **Input bar** — text input + send button (active persona colour). Sticks to bottom of panel.
- **Persona switcher** — compact avatar chips for the other two personas, visible in the header row. Tap to switch.

### Collapsed → expanded animation

Panel slides up from the footer. Smooth CSS transition, ~250ms ease-out.

---

## Backend — `POST /api/chat`

**File:** `api/src/handlers/chat.js`
**Route:** `POST /api/chat`

### Authentication

This endpoint is intentionally open in the current demo phase — consistent with the no-backend-auth pattern used throughout Proof360. No session validation required. Rate limiting is not implemented at this stage.

### Request body

```json
{
  "persona": "sophia" | "leonardo" | "edison",
  "messages": [
    { "role": "user" | "assistant", "content": "string" }
  ],
  "context": {
    "company_name": "string",
    "score": 62,
    "website": "stackfield.com",
    "gaps": [
      { "id": "soc2", "severity": "critical" },
      { "id": "edr", "severity": "high" }
    ]
  }
}
```

`messages` is the Anthropic SDK message format: an array of `{ role: 'user' | 'assistant', content: string }` objects representing the full conversation history. The system prompt is passed separately — do not include it in `messages`.

`gaps` is an array of confirmed triggered gaps from the session report. Each entry contains only `id` and `severity` — the two fields needed for system prompt injection.

### Response — streaming

```js
reply.raw.writeHead(200, {
  'Content-Type': 'text/plain; charset=utf-8',
  'Transfer-Encoding': 'chunked',
  'Cache-Control': 'no-cache',
  'X-Accel-Buffering': 'no'
});
// write tokens:
reply.raw.write(token);
// on completion:
reply.raw.end();
```

Each `write()` call sends one or more raw text tokens. Frontend appends each chunk to the current assistant message.

### Error handling

If the Claude API call fails before streaming begins: return `reply.status(500).send({ error: 'chat_failed' })` — standard JSON error.

If the API fails mid-stream (after `writeHead`): write the string `"\n\n[error]"` as a final chunk, then call `reply.raw.end()`. The frontend detects `[error]` suffix and marks the message as failed.

### System prompts

Each persona gets a system prompt that:
1. Establishes their identity, voice, and lens
2. Injects the founder's context (company, score, gaps formatted as a readable list)
3. Instructs them to stay grounded in the data — no generic advice

**Sophia system prompt template:**
```
You are Sophia, a narrative advisor for founders. Your lens is story — how this company's trust posture reads to investors, customers, and partners.

The founder you're speaking with runs {{company_name}} ({{website}}). Their Proof360 trust score is {{score}}/100. Their confirmed gaps are: {{gaps_list}}.

Your voice is warm, direct, and coach-like. You create space rather than filling it. Ask one question — never five. Give one observation at a time. You never lecture. You never summarise the whole report back to them. You always reference something specific from their data.

Keep responses to 2–4 sentences. If the founder wants more, they'll ask.
```

**Leonardo system prompt template:**
```
You are Leonardo, a strategic advisor for founders. Your lens is market position — how this company's trust posture affects fundraising, partnerships, and competitive standing.

The founder runs {{company_name}} ({{website}}). Their Proof360 score is {{score}}/100. Their confirmed gaps are: {{gaps_list}}.

Your voice is direct, commercial, and precise. You translate trust gaps into business consequences — investor objections, deal friction, competitive disadvantage. You do not explain what the gaps are (they know). You explain what those gaps cost them in the market.

One consequence or one strategic recommendation per response. 2–4 sentences. Reference at least one specific gap or score. No pep talk.
```

**Edison system prompt template:**
```
You are Edison, a technical advisor for founders. Your lens is execution — what needs to be fixed, in what order, and how.

The founder runs {{company_name}} ({{website}}). Their Proof360 score is {{score}}/100. Their confirmed gaps are: {{gaps_list}}.

Your voice is calm, precise, and sequenced. You speak in specifics: tools, steps, timelines, tradeoffs. You optimise for the fastest path to a meaningful score improvement. You do not frame things emotionally. You do not give general security advice.

One recommendation at a time. 2–4 sentences. Always reference the specific gap you're addressing. Ask a clarifying question only if you genuinely need it to give useful direction.
```

`{{gaps_list}}` is rendered as a human-readable string, e.g. `"SOC 2 (critical), EDR (high), MFA (high)"`.

---

## Frontend — `PersonaChat` component

**File:** `frontend/src/components/PersonaChat.jsx`

### Props

```js
{
  context: {
    company_name: string,
    score: number,
    website: string,
    gaps: Array<{ id, severity, confirmed }>
  }
}
```

### State

```js
activePersona: 'sophia' | 'leonardo' | 'edison'   // default: 'sophia'
expanded: boolean                                   // default: false
threads: { sophia: [], leonardo: [], edison: [] }  // loaded from localStorage on mount
drafts: { sophia: '', leonardo: '', edison: '' }   // draft preserved per persona on switch
streamingPersona: 'sophia' | 'leonardo' | 'edison' | null  // which persona is currently streaming
streamingContent: string                            // partial content being appended live
abortController: AbortController | null             // ref to active fetch, for teardown
```

`streamingPersona` and `streamingContent` are set at stream start and cleared on completion or abort. `abortController` is created per `sendMessage` call and stored — used for context-change teardown and component unmount cleanup.

### localStorage keys

`company_name` is normalised before use as a key: lowercased, whitespace replaced with `_`, non-alphanumeric characters removed. E.g. `"Stackfield GmbH"` → `"stackfield_gmbh"`.

```
p360_persona_sophia_${normalisedName}    → message array (JSON)
p360_persona_leonardo_${normalisedName} → message array (JSON)
p360_persona_edison_${normalisedName}   → message array (JSON)
```

On mount: load all three threads. If Sophia's thread is empty, seed it with a single display message:
```
{ role: 'assistant', content: "I've looked at your results. What's weighing on you most right now?", uiOnly: true }
```

**`uiOnly: true` is load-bearing.** This message is UI copy — it renders in the thread but is never included in the `messages` array sent to the API. On the first user message, the backend receives only `[{ role: 'user', content: '...' }]`. The system prompt already establishes Sophia's voice and opening posture — the seeded message is a display affordance only.

Strip `uiOnly` messages from the array before any API call: `messages.filter(m => !m.uiOnly)`.

On each assistant message complete: persist that persona's thread to localStorage.

### Streaming

Use `fetch` with `ReadableStream` / `response.body.getReader()`. Decode chunks with `TextDecoder`, append to the current `streaming` message in state. On stream end, move the completed message into the thread and persist.

---

## Integration points

### Report.jsx

Mount `<PersonaChat context={...} />` once the report is loaded. Context built from `report.company_name`, `report.trust_score`, `report.website`, `report.gaps`.

### FounderDashboard.jsx

Mount `<PersonaChat context={...} />` when a saved report is active (open/selected). Context from the saved report object. When the founder switches between saved reports, context prop updates and the component loads the correct stored threads.

**Context change teardown** is a first-class path, not an edge case. When the `context` prop changes (founder switches report):

1. If `abortController` is set: call `abortController.abort()`
2. Discard `streamingContent` — do not append or persist the partial message
3. Set `streamingPersona = null`, `streamingContent = ''`, `abortController = null`
4. Re-normalise the new `company_name` and load all three threads from localStorage
5. Re-seed Sophia opener if her new thread is empty
6. Reset `drafts` to `{ sophia: '', leonardo: '', edison: '' }` — do not carry draft text across companies
7. Keep `activePersona` and `expanded` state unchanged — persona preference and panel state persist across report switches

Same teardown applies on component unmount.

---

## What this is not

- Not a general chatbot. Personas only have opinions about this founder's specific data.
- Not persistent server-side. localStorage is intentional for this phase — consistent with vendor message threads.
- Not all three open simultaneously. One active at a time.

---

## Constraints

- `ANTHROPIC_API_KEY` stays server-side. Frontend never sees it.
- Streaming response, not polling. Latency must feel alive.
- No new npm packages on the frontend — native `fetch` + `ReadableStream`.
- Fastify streaming: use `reply.raw` to write chunks directly, avoid Fastify's response buffering.
