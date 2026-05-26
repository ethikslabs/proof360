# Chat Chrome Redesign — Design Spec
**Date:** 2026-05-26  
**Status:** Approved  
**Scope:** `frontend/src/pages/Chat.jsx` and `frontend/src/components/chat/` — landing state UX, input chrome, mode tiles, connectors, response metadata

---

## 1. Context

proof360's chat page already has the right bones: sidebar drawer with Hive&Co + Your Company sections, FloatQ ambient questions, OperationalField vendor logos, Sophia/Edison/Leonardo personas, typing animations. Four gaps separate it from the target UX:

1. Landing state leads with Sophia auto-typing — should lead with the input + mode tiles (Claude.ai pattern)
2. No mode tiles with starter questions — only text chips exist
3. Auto-scroll on every message — should stay anchored at line 1
4. Input chrome is thin — needs model picker, STT, + menu, response metadata

This spec closes all four gaps and adds the input chrome layer.

---

## 2. Landing State

### What changes
- **Remove** Sophia auto-type on page load. Sophia, Edison, and Leonardo appear only after the first message is submitted.
- **Keep** FloatQ ambient questions scattered around the interface (already built).
- **Keep** OperationalField vendor logos at bottom-right, ~12% opacity ghosted wordmarks (already built — confirm position is bottom-right, not overlapping input).

### Layout
```
[heading]
[subtitle]
[input box]
[mode tiles]
[question panel — only when a tile is active]
```

Heading: **"Investors are evaluating you *right now.*"** (serif, italic emphasis on "right now.")  
Subtitle: "Before the pitch. Before the meeting." (muted, italic)

Drawer starts closed. Sidebar shows icon rail only.

---

## 3. Mode Tiles

Five tiles displayed below the input on landing:

| Tile | Icon | Starter questions theme |
|------|------|------------------------|
| Investor | 📈 | What investors check, what breaks deals, compliance gaps VCs flag, traction evidence, 90-day readiness gap |
| Diligence | 🔍 | DD checklist, data room gaps, legal red flags, SOC 2 readiness, technical DD patterns |
| Vendor | 🤝 | Best vendor for SOC 2, AWS programs available, Cloudflare vs competitors, Ingram vs Dicker routing, vendor ROI |
| Deal Room | 🏦 | Cap table health, SAFE vs priced round, valuation signals, term sheet red flags, investor pipeline |
| Documents | 📄 | Upload a deck, parse a contract, summarise a term sheet, check a policy doc, build a data room |

**Behaviour:**
- Landing: all 5 tiles visible, none active
- Click a tile → tile highlights, question panel appears below with 5 starters (replaces current 3 text chips)
- Click a starter question → text auto-fills input and auto-submits
- Question panel has × to dismiss without submitting
- Only one tile active at a time; clicking another swaps the question panel
- After first submit: tiles and question panel disappear, input locks to bottom

---

## 4. Input Chrome

### Input box layout
```
┌──────────────────────────────────────────────────────┐
│  Ask about your investor readiness…                  │
│                                                      │
│  [+]            [Model ▾] [Adaptive ▾]  [🎤]  [≋≋]  │
└──────────────────────────────────────────────────────┘
```

### + Menu
Opens upward from the + button. Items:

```
📎  Add files or deck
🔗  Paste a URL
☁️  Add AWS bill
────────────────
🌐  Web search        ✓
🏦  Deal room         ›
────────────────
🔌  Integrations      ›
```

**Integrations flyout** (opens right from "Integrations →"):
- Connected section: Xero (toggle), AWS (toggle), GitHub (toggle)
- Not connected: Microsoft 365 (Connect →), HubSpot (Connect →)
- Add connector (bottom)

Each connected integration feeds live signals into the conversation context. The richer the connections, the more capable the responses — Octalysis variable reward loop: connect Xero → answers include financial context.

### Model Picker
Clicking `[Model ▾]` opens a dropdown grouped by provider. All calls route through VECTOR — proof360 never calls providers directly.

| Model | Provider badge | Description |
|-------|---------------|-------------|
| Claude Opus 4.7 | Bedrock | Most capable · deep analysis |
| Claude Sonnet 4.6 | Bedrock | Balanced · everyday work |
| Claude Haiku 4.5 | Bedrock | Fast · low latency |
| Llama Nemotron Ultra | NVIDIA | 253B · open weights |
| Gemini 2.0 Flash | Google | Fast · multimodal |
| Perplexity Sonar | Live | Real-time · cited sources |
| GPT-4o | Foundry | OpenAI · via Azure |

**Adaptive thinking toggle** at bottom of dropdown. When on, extended reasoning is used for complex queries.

Default model on landing: Claude Sonnet 4.6 (Bedrock).

### STT (Speech-to-Text)
- 🎤 microphone icon in input toolbar — already built in backend
- Tap → pulsing indicator, "Listening…" label replaces model selector temporarily
- Live transcript appears in input textarea in real-time
- Tap again or 2s pause → transcript locked in input, ready to submit
- User can edit transcript before sending

### Waveform icon
Streaming indicator (≋≋) to the right of 🎤 — animates bars when a response is streaming. Static when idle.

---

## 5. After First Submit

### Input locks at bottom
On first submit:
- Input box moves to `position: absolute; bottom: 0` (or `position: fixed` if needed for scroll behaviour)
- Mode tiles and question panel removed from DOM
- Input never disappears, never moves again for the session

### No auto-scroll
Remove the `el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })` call at `Chat.jsx:910`.

The view stays anchored at the top when new messages arrive. The user scrolls down themselves to read the response. This is intentional — the user controls their position, not the interface.

### Personas appear
First response renders with persona label: `Sophia · narrative lens`, `Edison · technical lens`, or `Leonardo · strategic lens` — plus model label top-right of the response card.

---

## 6. Response Anatomy

Each response card has:

```
[● Sophia · narrative lens]              [Claude Opus 4.7 · Bedrock]

Response text here…

────────────────────────────────────────────────────
Retrieved from: [CORPUS] [proof360 signals] [live-web]    ~847 tokens
```

- **Retrieved from** — which data sources were hit. CORPUS = proof360's knowledge substrate. `proof360 signals` = company-specific session signals. `live-web` = Perplexity/web search if used.
- **Token count** — total tokens for this exchange (prompt + completion). Communicates real inference, not keyword lookup.
- **Model label** — which model + provider answered. Updates if VECTOR routes differently per query.

This is the "show the work" principle: transparency is the product.

---

## 7. What Does NOT Change

| Element | Status |
|---------|--------|
| Sidebar drawer content (Hive&Co + Your Company) | Keep exactly as-is |
| FloatQ ambient questions | Keep, already built |
| OperationalField vendor logos | Keep, confirm bottom-right position |
| Heading text "Investors are evaluating you right now." | Keep |
| Auth/account modal (Programs/Purchases/Integrations/Billing) | Keep |
| `/report`, `/audit`, `/portal`, `/account` routes | Untouched |
| Persona names (Sophia/Edison/Leonardo) | Keep, just delay appearance to after first submit |

---

## 8. Files to Change

| File | Change |
|------|--------|
| `frontend/src/pages/Chat.jsx` | Remove Sophia auto-type on load; remove auto-scroll (line ~910); add mode tiles + question panel; wire + menu; wire model picker; wire STT; lock input on first submit; add response metadata footer |
| `frontend/src/components/chat/Sidebar.jsx` | No changes — already correct |
| `frontend/src/components/chat/OperationalField.jsx` | Confirm position is bottom-right, not overlapping input chrome |

New components to extract (keep Chat.jsx manageable):
- `ModeTiles.jsx` — 5 tiles + question panel state
- `InputChrome.jsx` — + menu, model picker, STT, waveform, toolbar
- `ResponseCard.jsx` — persona label, response text, metadata footer

---

## 9. Out of Scope

- Real integration OAuth flows (Xero/AWS/GitHub connectors) — UI shape only, wired to mock state
- Real-time streaming (backend built, frontend integration is a follow-on)
- VECTOR model routing wiring — model picker UI only, actual routing is follow-on
- STT backend connection — mic UI only if STT not already wired; use existing hook if available
- Mobile responsive layout
