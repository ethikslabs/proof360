# proof360 — Observable Trust Graph Frontend Design

**Date:** 2026-05-23  
**Authority:** john-coates  
**Status:** Approved — ready for implementation planning  
**Replaces:** `docs/plans/2026-05-15-conversational-trust-layer-mvp.md` (superseded)

---

## Core framing

This is not a chatbot. Not a dashboard. Not an AI assistant. Not a wizard form.

It is an **operational intelligence environment** — a surface where the system reveals what it understands about a company, progressively, as confidence is earned through conversation.

The governing tension:

> **Keep the shell familiar. Make the internals extraordinary.**

The shell uses the interaction grammar that is already globally understood (ChatGPT / Claude / Perplexity). Users spend zero effort learning the interface. All cognitive capacity goes to understanding their company.

---

## Design principles

### 1. Epistemic UI
The interface reflects certainty levels. Ghost = uncertain. Solid = confident. The UI is not a styling choice — it is a readout of what the system knows. No element appears before the system has earned the right to show it.

### 2. Earned complexity
Nothing appears before it has been earned by the conversation. No empty panels. No skeleton screens pretending to load. Structure crystallises from ambiguity.

### 3. State transitions of understanding
The product is not a set of screens. It is a sequence of states that mirror the user's growing understanding of their own company:

> bare familiarity → subtle activation → observable construction → revealed understanding

### 4. Progressive revelation of confidence
Not onboarding. Not loading. The system reveals what it knows as it earns the right to say it.

### 5. Structure crystallising from ambiguity
The left rail does not "open." It crystallises — like confidence forming from signal. The animation should feel like resolution, not navigation.

### 6. The graph is an organism
The graph is not a visualisation tool. It is evidence that something is being constructed beneath the conversation. The drawer handle is its pulse.

---

## Three-layer surface architecture

The product has three distinct layers, each with a single role. No layer bleeds into another.

```
┌─────────────────────────────────────────────────────┐
│  LEFT RAIL          │  MAIN SURFACE                 │
│  Stabilised         │  Conversation + guidance      │
│  operational        │  (ChatGPT shell)              │
│  understanding      │                               │
│                     │                               │
│  (invisible at t=0) │  Theatrical opening           │
│  (ghost at t=1)     │  Ambient domain questions     │
│  (solid at t=2+)    │  Full-width chat              │
│                     │  + menu / analysis profile    │
├─────────────────────┴───────────────────────────────┤
│  BOTTOM DRAWER — Machine room                        │
│  ↑ 12 nodes · 28 edges · 4 models · 6 sources       │
└─────────────────────────────────────────────────────┘
```

### Layer 1 — Main surface (conversation + guidance)

The familiar shell. Identical interaction grammar to ChatGPT/Claude. The user learns nothing new about the interface.

**Contents:**
- Theatrical opening: Sophia → Leonardo → Edison (existing implementation — retained as-is)
- Ambient domain-specific floating questions (orbiting the prompt, fading when user types)
- Full-width chat conversation
- `+` context modifier menu (bottom left)
- Analysis profile selector (bottom, next to input)
- Execution / thinking stream (inline, during analysis)

**Edison's handoff line** (the moment the prompt activates):
> *"You're here for a reason. What are you trying to solve?"*

Not "Enter your URL." Not "Get your trust score." Just that.

### Layer 2 — Left rail (stabilised operational understanding)

Does not exist at t=0. Appears as a ghost shimmer at t=1. Crystallises to solid after first analysis. Reflects what the system now knows with confidence.

**Panels (in order of appearance):**
1. Company Snapshot — inferred name, category, stage, geography
2. Investor Readiness — score + top signals
3. Enterprise Readiness — score + top signals
4. Market Context — TAM indicators, regional opportunities
5. Partner / Vendor Pathways — AWS, Vanta, insurance, distributors
6. Gaps & Risks — missing compliance signals, weak positioning, operational gaps

**Animation contract:**
- t=0 → invisible, zero width
- t=1 → fades in at ~20% opacity, blurred, shows "Building..." placeholder bars
- t=2 → snaps/dissolves to full opacity with real data (not a slide-in — a crystallisation)
- The rail does not animate like a sidebar opening. It resolves like a photograph developing.
- **Error / timeout state:** If inference fails or times out (90s per stage), the rail stays in the t=1 ghost state. Placeholder bars are replaced with a subtle error indicator (e.g. muted red pulse). No hard error screen. No red panels. The ghost state itself communicates "uncertain" — an error is just a deeper shade of uncertain.

### Layer 3 — Bottom drawer (machine room)

The organism growing beneath the conversation. Always available, never intrusive. Progressive discovery.

**Handle (always visible after t=1):**
```
↑ Graph   ● ● ●   12 nodes · 28 edges · 4 models · 6 sources
```
The handle updates in real time. Seeing it change is enough to create:
> "something is constructing itself underneath this conversation"

**Drawer interaction contract:**
- Default state: closed (handle visible, drawer body hidden)
- Open trigger: click anywhere on the handle strip
- Open height: 45vh, fixed for MVP (not user-draggable yet)
- Layout mode: overlay (drawer slides up over the chat; chat does not reflow)
- Close trigger: click handle again, or click outside the drawer
- The drawer is never open by default — it earns discovery

**Drawer contents (revealed on expand):**
- Observable trust graph — nodes and edges, live
- Execution / thinking feed — every real retrieval step, no fake reasoning
- Provenance accordion — per-conclusion, expandable: sources / models / confidence / execution path
- Token + model + source statistics (framed as "operational work units")
- Human escalation CTA

**Graph node types:** company, founder, documents, claims, evidence, vendors, programs, partners, recommendations, risks, readiness gaps

**Graph edge types:** matched_to, evidenced_by, inferred_from, eligible_for, route_via, requires_human_review

---

## State transitions

### t=0 — Landing / bare familiarity

- Full-width chat only. No left rail. No drawer handle.
- Triage card (intent selector) surfaces first, then theatrical opening plays (Sophia → Leonardo → Edison).
- `+` button and analysis profile selector visible in input row.
- Nothing else. Input is locked until Edison's handoff line completes (`inputReady === false`).

### t=0.5 — Post-triage / opening sequence

- User has selected an intent (browse / raise / question) from the triage card.
- Theatrical opening plays. Ambient domain-specific floating questions appear and orbit the prompt at low opacity.
- Input unlocks when Edison finishes (`inputReady === true`, `phase === 'active'`).
- Cursor waits. FloatQ questions remain visible.

### t=1 — Input ready, first message sent / subtle activation

**Trigger:** `phase === 'active' AND inputReady === true AND user submits first message`

This is the exact moment of the first `submit()` call, after Edison's handoff line.

- Left rail ghost-shimmers into view (low opacity, blurred, shows "Building..." placeholder bars).
- Drawer handle fades up from zero, shows "building..." with empty dot indicators.
- Thinking stream begins inline, below the user's message.
- Floating ambient questions fade out.

The user subconsciously understands: *"the structure exists, but it's not confident enough yet."*

### t=2 — First analysis complete / observable construction

Triggered when the backend returns the first complete inference pass.

- Left rail crystallises to full opacity with real company data.
- Drawer handle shows live node/edge/model/source counts.
- Graph nodes begin forming inside the drawer.
- Conversation continues; panels deepen with each subsequent turn.

### t=n — Ongoing / revealed understanding

- Left rail panels deepen and update with each conversation turn.
- Graph grows — new nodes and edges form as new signals are found.
- Provenance trails expand inside the drawer.
- Human escalation surfaces contextually when the system identifies relevant pathways.
- Complexity is earned, visible, and always explainable.

---

## The `+` context modifier menu

Not a settings page. Not integrations admin. Operational plugins that inject context into the conversation — each changes what the system can see and therefore what it can say.

**MVP items (in priority order):**
1. Upload deck / pitch
2. Add website
3. Add AWS bill
4. Add LinkedIn
5. Deep market scan
6. Enable regional analysis
7. Compare competitors
8. Run investor readiness
9. Run procurement readiness

**MVP wiring:** For the weekend ship, all `+` items are UI stubs. The menu renders, the item is selectable, and a confirmation bubble appends to the conversation: *"Got it — adding your pitch deck to the analysis context."* No backend wiring is required for MVP. The `POST /api/session/context` endpoint (mid-session context injection, re-triggering inference) is post-MVP. A developer should not attempt to wire any `+` item to the backend in the initial build.

---

## Analysis profile selector

Visible in the input row. Shows intent, not model names. Users choose what kind of thinking they need. The machine room handles routing.

| Profile | User intent | Models (hidden) |
|---------|------------|-----------------|
| **Investor** (default) | Raise-readiness, due diligence | Claude + Perplexity |
| **Market** | TAM, positioning, regional | Gemini + Perplexity |
| **Technical** | Architecture, security, ops | Claude + Nemotron |
| **Compliance** | SOC 2, ISO, APRA, frameworks | Claude + Grok |
| **Deep** | Exhaustive — all signals | All models, slow |
| **Fast** | Quick read, instant response | Haiku |

**API contract:** The selected profile is sent as `analysis_profile` in the `POST /api/session/start` body alongside the existing params. Valid values: `investor | market | technical | compliance | deep | fast`. Default: `investor`. For MVP, the backend ignores the field gracefully (it is not yet consumed by signal-extractor or inference-builder). The frontend sends it so the parameter is established in the session contract before backend routing is built.

---

## Execution / thinking stream

Every line maps to a real process. No fake reasoning. No hallucinated steps.

**Valid stream lines:**
- `Parsing uploaded deck`
- `Extracting company positioning`
- `Mapping against AWS program eligibility`
- `Checking public operational signals`
- `Comparing regional market indicators`
- `Generating investor readiness assessment`
- `Correlating vendor eligibility`
- `Building operational graph — 4 nodes, 3 edges`

**Invalid:** Any line that doesn't correspond to a real backend operation.

---

## Human escalation

Surfaces inside the drawer and/or as a contextual bubble in the main conversation. Never a sales CTA. Never aggressive lead capture. A warm operational observation.

**Examples:**
> *"This looks aligned to enterprise procurement pathways — a human conversation would be useful here."*  
> *"There are three gaps that typically require a guided remediation path. We can introduce relevant partners."*

**Escalation options:** Telegram, email, callback, meeting. Ordered by friction (lowest first).

---

## Provenance accordion

Every visible conclusion is explainable. The user can expand any panel or graph node to see:

- Sources reviewed (URLs, documents, signals)
- Models used and why
- Confidence score and basis
- Execution path (which steps ran, in what order)
- What would change the conclusion

**Frame:** *"Not selling, sharing."* The product's edge is showing the retrieval chain, not hiding it.

---

## Token / processing visibility

Framed as operational work units, not engineering metrics.

**Example display:**
```
18,420 tokens processed
6 analysis passes
4 public sources reviewed
2 model correlations
```

Visible in the drawer stats panel. Creates trust through observable machine labour.

---

## Mobile contract

- Left rail: collapses to zero at mobile breakpoint; accessible via a slide-in gesture or header button
- Bottom drawer: survives at all breakpoints — same handle, same expand behaviour
- Main surface: full-width at all sizes, no layout changes needed
- The drawer-first architecture was chosen specifically because a right-column graph dies on mobile; a bottom drawer does not

---

## Existing implementation — what carries forward

The current `Chat.jsx` (1,067 lines) already implements:
- Theatrical opening (Sophia/Leonardo/Edison personas) — **retain as-is**
- `ThinkingStream` component — **retain, extend with real backend events**
- `Sidebar` component — **deprecated**. The existing Sidebar is a space-switcher (sets `activeSpace` to switch between Projection panes). It is not a data panel and cannot be evolved into the new left rail. Replace with a new component: `TrustRail.jsx`. The Sidebar component, its `litTiles` state, and `activeSpace` logic are removed for MVP.
- `FloatQ` ambient questions — **retain as-is**. Note: FloatQ currently renders after intent selection (`intent !== null`), not from page load. This is correct — it maps to t=0.5, not t=0.
- `TweaksPanel` — **deprecated for MVP**
- `Projection` component — **deprecated for MVP**. Projection panes are unreachable once the Sidebar space-switcher is removed. Remove `Projection` imports and the `activeSpace !== 'chat'` conditional render from Chat.jsx. This is not a loss — Projection content is superseded by the TrustRail panels and the drawer.

The `api/` session pipeline (signal-extractor, inference-builder, gap-mapper) feeds all three layers. No pipeline changes required for MVP — the frontend consumes existing endpoints.

---

## MVP scope

### Required (weekend ship)
- t=0 landing state: full-width chat, triage card, theatrical opening, `+` button, profile selector
- t=0.5: intent selected, FloatQ ambient questions visible, input unlocked after Edison
- t=1 ghost state: TrustRail ghost shimmer, drawer handle appearance, thinking stream begins
- t=2 materialisation: TrustRail solid with real inference data, live drawer handle count
- Drawer: basic graph (node list, not force-graph), provenance accordion, stats panel, escalation CTA
- `+` menu: full UI renders with all items, all items are stubs (no backend wiring for MVP)
- Analysis profile selector: Investor default; `analysis_profile` param sent on session start; backend ignores for MVP
- Human escalation CTA: warm contextual message + Telegram link + email option
- Remove: Sidebar, Projection, TweaksPanel, `activeSpace` logic, `litTiles` state

### Deferred
- Auth / persistent accounts
- OAuth integrations (LinkedIn, AWS bill import)
- Full force-directed graph (basic node list is MVP)
- Real multi-model routing (single-model with profile label is MVP)
- Complex permissions

---

## The test

Before shipping any surface — any state, any panel, any drawer section:

> *Does this moment return the founder to agency, or take it away?*

If it takes agency away: wrong. Redesign.

The founder never feels processed. They feel understood, then helped, then moving.

**The final measure:**
> *"This system understood our company faster than most first meetings."*  
> *"I can see WHY it reached those conclusions."*

---

*Approved: 2026-05-23 · john-coates*  
*Brainstormed with Claude Code (claude-sonnet-4-6)*
