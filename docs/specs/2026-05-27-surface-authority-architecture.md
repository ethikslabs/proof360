# Surface Authority Architecture — DESIGN-005

**Date:** 2026-05-27  
**Status:** Approved (brainstormed with john-coates)  
**Scope:** `frontend/src/pages/Chat.jsx`, `frontend/src/components/chat/AuthorityLayer.jsx` (new), `frontend/src/hooks/useSurfaceAuthority.js` (new)

---

## Doctrine statement

> Backend computes authority. Frontend expresses gravity. Human commits handoff.

This design reframes proof360's chat interface from a layout problem to a runtime orchestration problem. Three surfaces (chat, projection, shortlist) share a viewport without fixed widths. Authority — which surface is cognitively dominant at any moment — is computed from signals, expressed as elastic visual weight, and transferred only when the human commits. The interface exposes its own reasoning. This is **conversational state introspection**: the user can read why the system behaves the way it does, at a glance, always.

---

## Scope: two layers

### Layer 1 — Surgical fixes (immediate)

Two targeted changes that deliver the biggest HX improvement with minimal risk:

1. **Contextual header** — a full-width authority layer strip at the top of the viewport, above the right rail and chat pane, showing the session contract (see below). Fixes the "page loses narrative grounding" problem.
2. **Model selector → inference chip** — the model picker collapses to a small chip in the authority layer. Expanded on tap. The current expanded state dominates the viewport and destroys focus.

### Layer 2 — Authority architecture (this spec)

The full surface authority model. Surgical fixes fold cleanly into this architecture — the contextual header *is* the authority layer. Building Layer 2 does not require undoing Layer 1.

---

## The session contract

A single full-width header spanning the entire viewport. It is the state machine. Everything below it is a projection.

The header owns six slots, read left to right:

| Slot | Content | Visible |
|------|---------|---------|
| `BOUNDARY` | Example · Workspace label — establishes containment before identity | Always |
| `ENTITY` | Name · stage · vertical — what the system is orbiting | Always |
| `LENS` | Active persona · reasoning mode — how reasoning is shaped | Always |
| `SURFACE AUTHORITY` | Which surface holds focus + handoff suggestions inline | Always |
| `EVIDENCE / TRUST STATE` | Signal provenance row: Verified · Observed · Self-disclosed · Stale · Demo | Conditional — when signals are active or mixed |
| `INFERENCE` | Model chip — current inference path, collapsed to a chip by default | Always (chip form) |

### Slot ordering is intentional

BOUNDARY → ENTITY → LENS → SURFACE AUTHORITY → EVIDENCE → INFERENCE is a psychological sequence: containment → identity → reasoning shape → focus → provenance → infrastructure. Each slot answers a question the user might have, in the order they would ask it.

### EVIDENCE / TRUST STATE

This slot is a diagnostic overlay, not a compliance badge. It surfaces signal provenance when it carries information (mixed confidence, stale signals, self-disclosed overrides). When all signals are fresh and consistent, it does not appear. The slot communicates operational confidence, not moral judgement.

Example states: `● Observed`, `● Self-disclosed`, `◌ Stale`, `◌ Demo` — rendered as minimal chips in the same colour vocabulary as ObservationStrip.

### INFERENCE chip

The model selector becomes a collapsed chip showing the current inference path: `● Claude Sonnet 4.6 · Bedrock`. Tapping expands to the full provider catalog. Once selected, it returns to chip form. The model routing layer is infrastructural — present but not theatrical.

---

## Surface projections

Three surfaces share the viewport below the authority layer. None have fixed widths. Gravity determines allocation.

| Surface | Owns | Resting state |
|---------|------|---------------|
| Chat | Reasoning — conversation transcript, GuidanceBlock, ObservationStrip | Dominant |
| Projection | Vendor intelligence, company profile, comparison views | Compressed but legible |
| Shortlist | Persisted vendor selections with provenance | Minimal — expands as items accumulate |

**Key principle:** surfaces compress, they do not hide. When Projection holds authority, Chat compresses to a visible transcript — conversation continuity is preserved as ambient memory. The user never asks "where did my chat go?"

### Behavioral language (not ratios)

- Chat holds authority: Projection becomes a compact sidebar. Vendor names and reason lines remain visible. "Show more" accessible on tap.
- Projection holds authority: Chat compresses to a readable transcript. Prior reasoning remains oriented. Projection expands to show full vendor cards with signal provenance.
- Neither surface forces the other out.

---

## Weighted surface arbitration

Internal runtime model — not exposed in the UI.

```
authority_score = {
  chat:       float,   // driven by input focus, typing, response reading
  projection: float,   // driven by vendor intent signals, comparison patterns
  evidence:   float,   // driven by signal correction activity
  shortlist:  float,   // driven by shortlist item count
}
```

Scores are continuous, decay over time without new signal, and are bounded to [0, 1] with normalisation across surfaces. The surface with the highest score is a candidate for authority. A score difference above a threshold triggers a SUGGEST phase. Explicit user actions (tapping a surface chip, opening the evidence drawer) override computed scores immediately — `explicit action > inferred authority`.

---

## Authority transition lifecycle

| Phase | What happens | Where it lives |
|-------|-------------|---------------|
| `NOTICE` | Backend computes authority score shift. Projection score exceeds chat score by threshold. | Silent — no UI change |
| `SUGGEST` | Authority layer shows inline suggestion chip in the SURFACE AUTHORITY slot: `→ Vendor Intelligence  ✓  ✕` | SURFACE AUTHORITY slot |
| `WAIT` | Suggestion persists indefinitely. Surfaces maintain current weights. No ambient pressure. User may continue without acknowledging. | Header — suggestion chip stays |
| `COMMIT` | User taps ✓ — authority transfers. Surfaces re-weight elastically. SURFACE AUTHORITY slot updates. Evidence/trust state row appears if signals are mixed. | Header updates · surfaces animate |
| `DISMISS` | User taps ✕ — suggestion removed. System will not re-suggest the same handoff for this session turn. | Suggestion chip dissolves |

### Conversational dignity

The DISMISS phase encodes a governance rule: the system notices, the human decides, the system respects dismissal. A dismissed handoff suggestion is suppressed for the remainder of the session turn. This prevents the "nagging AI" failure mode. The system has no ambient pressure. It waits.

---

## Mobile adaptation

On viewports below ~768px, surfaces cannot share the horizontal axis. The authority model adapts:

**Desktop:** weighted coexistence — surfaces share the viewport with elastic widths.  
**Mobile:** explicit authority navigation — surfaces are full-width and accessed via the authority layer header.

On mobile, the authority layer header chips (`Chat · Vendors · Shortlist`) become the navigation primitive. The active chip is highlighted; tapping another chip transfers surface authority explicitly. The session contract (BOUNDARY, ENTITY, LENS) remains visible at all times. SURFACE AUTHORITY is expressed by which chip is active.

**Principle:** mobile is not a separate product philosophy — it is the same runtime model under a different spatial constraint. One authority layer, many projection surfaces.

---

## Conversational state introspection

The authority layer makes the system's reasoning legible without exposing implementation. At any moment the user can answer:

- **Who am I talking about?** → ENTITY slot
- **What reasoning mode is active?** → LENS slot
- **Which surface is primary right now?** → SURFACE AUTHORITY slot
- **Why is the system showing me vendors?** → SURFACE AUTHORITY suggestion chip
- **How confident is the system in what it believes?** → EVIDENCE / TRUST STATE row
- **What inference path is running?** → INFERENCE chip

This is conversational state introspection: runtime state exposed as readable context, not as settings or logs. The user does not need to understand the underlying system — they can read the header.

---

## Acceptance criteria

### Authority Layer component (AC-1 through AC-6)

- **AC-1** BOUNDARY slot shows "Example" amber label in demo mode, clean in workspace mode
- **AC-2** ENTITY slot populates from company signals — name, stage, vertical
- **AC-3** LENS slot reflects active persona (Edison · operational / Leonardo · strategic / Sophia · narrative)
- **AC-4** SURFACE AUTHORITY slot names the current authority-holding surface; updates on commit
- **AC-5** SURFACE AUTHORITY slot shows inline suggestion chip (`→ [Surface]  ✓  ✕`) when system detects score shift above threshold; suggestion persists until committed or dismissed
- **AC-6** EVIDENCE / TRUST STATE row appears only when `activeSignals` contains mixed provenance or stale signals; hidden when not relevant

### Inference chip (AC-7)

- **AC-7** Model selector collapsed to chip by default (`● [Model name] · [Provider]`); tap to expand to current provider catalog; collapses on selection

### Surface projection behaviour (AC-8 through AC-10)

- **AC-8** Chat surface compresses (does not hide) when Projection holds authority; transcript remains readable
- **AC-9** Projection surface compresses (does not hide) when Chat holds authority; vendor names and reason lines remain visible
- **AC-10** Surface weight transitions animate (not instant cuts); 200–300ms ease

### Authority transition (AC-11 through AC-13)

- **AC-11** NOTICE phase is silent — no UI change until system has confidence in the handoff
- **AC-12** COMMIT transfers authority and re-weights surfaces elastically
- **AC-13** DISMISS suppresses re-suggestion of the same handoff for the remainder of the session turn

### Mobile (AC-14)

- **AC-14** On viewports < 768px, surfaces are full-width; authority layer header chips (`Chat · Vendors · Shortlist`) are the navigation primitive; active chip reflects current SURFACE AUTHORITY

### SessionSnapshot (AC-15)

- **AC-15** `beforeunload` SessionSnapshot (already implemented in DESIGN-004 AC-11) includes `surface_authority_at_close` field — the SURFACE AUTHORITY slot value at time of snapshot

---

## What this is not

- Not a tab model — surfaces are not peers in a switcher
- Not a dashboard — no fixed layout regions
- Not AI automation — the system suggests, the human commits
- Not a responsive design problem — mobile is not a scaled-down desktop; it is the authority model under a spatial constraint

---

## Relationship to existing specs

| Spec | Relationship |
|------|-------------|
| `2026-05-26-chat-chrome-design.md` | Mode tiles (Investor/Diligence/Vendor/Deal Room/Documents) become inputs to the authority score computation — tile selection raises `projection` score. Input chrome spec is unchanged. |
| `2026-05-27-contextual-guidance-rendering.md` | ObservationStrip and GuidanceBlock are rendered within the Chat surface. Signal corrections raise the `evidence` score briefly. EVIDENCE / TRUST STATE row in authority layer echoes ObservationStrip chip vocabulary. |
| `INVARIANTS.md` | This spec extends, does not replace. Authority layer is the new SURFACE AUTHORITY invariant: "which surface holds focus is always legible." |
