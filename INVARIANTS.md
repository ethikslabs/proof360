# proof360 Rendering Invariants

**Authority:** john-coates  
**Status:** frozen — ratification required to change any invariant  
**Supersedes:** any spec, plan, or handoff suggestion that conflicts

---

## 1. Frontend renders state. Backend computes truth.

No text in the frontend is stored copy. Every visible string is a projection of computed state.

There is no `title: "AWS Programs"` with a static description. There is a rendering context with `context`, `evidence`, and `synthesis` fields. The synthesis is generated; the evidence is retrieved; the context is observed.

**Violation signal:** any string literal in a component that looks like marketing copy, onboarding text, or a product explanation.

---

## 2. The rendering protocol: context + evidence + synthesis

Every text surface conforms to this shape:

```
{
  context: {        // what we know about the entity right now
    company_stage, location, current_vendors, observed_needs, session_turn
  },
  evidence: [],     // what we retrieved — source, content, why
  synthesis: "",    // the derived interpretation — generated, never stored
  provenance: {     // where this came from
    generated_at, triggered_by, conversation_state
  }
}
```

The rendering protocol shape lives at `frontend/src/rendering/protocol.js`.

---

## 3. The shortlist is reasoning provenance

The shortlist is not bookmarks. It is not a favourites list. It is:

> "Why this mattered at the moment you saw it."

Each shortlisted item carries:
- `synthesis` — why this vendor, for this entity, at this moment (derived, not canned)
- `provenance.triggered_by` — what gap or observation surfaced it
- `provenance.conversation_turn` — when in the conversation it appeared
- `provenance.session_state_snapshot` — what the system knew when it suggested this
- `provenance.added_at` — when the user shortlisted it

Six weeks later, the system restores the path, the reasoning, the state, and the timing — not just a list of names.

---

## 4. Demo / workspace trust boundary

**Hive & Code** is the guided narrative sandbox — an observed example, not the user's reality.

**The user's company** is the living workspace — their operational reality.

These two states must be visually distinct at all times. The user never confuses which one they are looking at. The demo is safe to explore, no commitment. The workspace is theirs, their data, their decisions.

Visual contract:
- Demo mode: amber label `Example company · [Company Name]` at top of CompanyProfile
- Workspace mode: no label — clean, direct, uninterrupted

---

## 5. Contextual commerce — exploratory first

The user can investigate without talking about their own company.

The system reduces social friction, sales anxiety, and commitment pressure.

The emotional posture is never "I'm being sold to." It is "I'm learning through contextual examples."

**Violation signal:** any CTA that appears before the user has had at least one exchange, or any copy that creates pressure to sign up, hand over a URL, or commit.

---

## 6. Personas are cognitive lenses, not characters

Sophia = investor/trust lens  
Leonardo = commercial/narrative lens  
Edison = operational/technical lens

They are reasoning overlays, not assistants. They don't say "I'm happy to help!" They say the precise thing their lens reveals.

Each persona injection into the chat is: "render this state through this worldview."

**Violation signal:** any persona message that sounds like an AI assistant — excited, helpful, apologetic.

---

## 7. No re-litigation

These invariants are frozen. Every refinement session reads this file before touching any frontend file. They are not suggestions. They are not the current best thinking. They are the resolved architecture.

When a refinement prompt conflicts with an invariant, the invariant wins. Surface the conflict; do not resolve it silently.

To change an invariant: explicit John ratification + update this file + commit. Nothing else changes it.
