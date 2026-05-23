# Session Chat Endpoint Spec

`POST /api/v1/session/:id/chat`

The session-keyed evolution of the existing stateless `/api/v1/chat`. The server owns context, history, and persona selection. The client sends one message.

---

## Why a new endpoint

The existing `POST /api/v1/chat` works but puts burden on the client:
- Client must send the full message history every turn
- Client must explicitly choose a persona
- Client must re-send the full trust context (score, gaps, recon) from wherever it cached it

The new endpoint inverts this: the session on the server already has everything. The client sends a message; the server figures out the rest.

---

## Request

```
POST /api/v1/session/:id/chat
Content-Type: application/json

{
  "message": "string — the user's message",
  "persona_override": "sophia" | "leonardo" | "edison"  // optional
}
```

`persona_override` is used when the client wants explicit control (e.g. user clicked a persona pill, or typed `@edison`). If omitted, the server classifies intent and selects.

---

## Response

Streaming `text/plain; charset=utf-8` (same chunked SSE-to-plaintext pattern as existing `/api/v1/chat`).

Response headers (written before first token):
```
Content-Type: text/plain; charset=utf-8
Transfer-Encoding: chunked
X-Persona: sophia | leonardo | edison
X-Model: <model id>
```

`X-Persona` and `X-Model` let the frontend show the right label and crumb without needing a separate metadata call.

Error (before stream starts): standard JSON `{ "error": "..." }` with appropriate status code.

---

## Intent classification → persona selection

Priority order (first match wins):

1. **`persona_override` in request body** — client knows best, skip classification
2. **`@mention` in message text** — `@sophia`, `@leonardo`, `@edison` (case-insensitive, word boundary)
   - Strip the mention from the message before sending to the model
3. **Keyword classifier** — fast, no model call:

   | Keywords | Persona |
   |----------|---------|
   | investor, funding, raise, term sheet, valuation, due diligence, board, VC, LP | `leonardo` |
   | technical, security, architecture, infrastructure, API, code, fix, SSL, DNS, firewall, DMARC, SPF | `edison` |
   | story, narrative, customer, brand, message, communicate, explain, perception | `sophia` |

   Match against lowercased message. If multiple categories match, highest count wins. Ties → `sophia`.

4. **Default** — `sophia` (narrative is the safest entry point for unknown intent)

No model-based classification in v1. Keyword rules cover 90% of real messages. Add model-based fallback in v2 if the classifier regularly misfires.

---

## Session context injection

On request, read session from store via `getSession(id)`:

```js
const session = getSession(id);
if (!session) return 400 { error: 'session_not_found' }

const context = {
  company_name: session.company_name,
  website: session.website_url,
  score: session.trust_score,
  gaps: session.gaps,
  strengths: derivedFromGaps(session),   // gaps with severity < medium, or positive signals
  recon: session.merged_context?.recon,
  session_id: session.id,
};
```

Pass `context` to `buildSystemPrompt(persona, context)` — existing function, no changes needed.

If `trust_score` is null (session hasn't completed analysis), the endpoint returns `{ error: 'analysis_not_ready' }` with status 425 (Too Early). The frontend should gate the chat input until analysis is complete.

---

## Server-side conversation history

Store history in the session object under `chat_history`:

```js
session.chat_history = [
  { role: 'user', content: '...', ts: 1234567890 },
  { role: 'assistant', content: '...', persona: 'sophia', ts: 1234567891 },
  ...
]
```

On each request:
1. Append the new user message to `session.chat_history`
2. Build `apiMessages` from history (role + content only, no ts/persona metadata)
3. Truncate to last 20 turns (10 user + 10 assistant) before sending to VECTOR — keeps context cost bounded
4. After stream completes, append the full assistant response + persona to history

The client no longer sends a `messages` array. It sends one message; the server manages the window.

---

## Model selection per persona

All route through VECTOR at `http://localhost:3003/v1`.

| Persona | Model | Rationale |
|---------|-------|-----------|
| sophia | `claude-haiku-4-5-20251001` | Warm, conversational — Haiku is fast and natural |
| leonardo | `claude-haiku-4-5-20251001` | Concise commercial framing — same speed |
| edison | `claude-haiku-4-5-20251001` | Precise technical steps — same model |

All three use Haiku in v1. This keeps cost per chat turn minimal. Upgrade path: swap Edison to a reasoning model (sonnet or NIM nemotron) if technical accuracy becomes a bottleneck.

---

## `@john` passthrough

Keep existing behaviour: if `@john` appears in the message, skip VECTOR and call `notifyJohn()`. Return the same inline response. History is still appended so the conversation thread stays coherent.

---

## History endpoint

```
GET /api/v1/session/:id/chat/history
```

Returns:
```json
{
  "history": [
    { "role": "user", "content": "...", "ts": 1234567890 },
    { "role": "assistant", "content": "...", "persona": "sophia", "ts": 1234567891 }
  ]
}
```

Used when the frontend reloads a session — restores the conversation view without a full page state rebuild.

---

## Frontend changes required

The existing `Chat.jsx` sends to `POST /api/v1/chat` with full `messages` + `persona` + `context`. It needs to:

1. Switch to `POST /api/v1/session/:id/chat` — send only `{ message }` (+ `persona_override` if user explicitly chose one)
2. Read `X-Persona` and `X-Model` response headers to set bubble metadata
3. Remove the `messages` array from local state (server owns history now) — or keep it as UI-only render state, populated from the stream as it arrives

Simplest migration: keep the messages array in React state for rendering, but stop sending it to the server. Append locally as each turn completes; on reload, fetch from `GET /session/:id/chat/history`.

---

## Out of scope for v1

- Multi-persona responses (one turn, multiple personas answering the same question)
- Model-based intent classification
- Persona conversation memory across sessions (each session starts fresh)
- Conversation export
- Human-readable session URLs
