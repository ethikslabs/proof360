# DESIGN-004: Contextual Guidance Rendering

**Authority:** john-coates  
**Status:** ratified — ready for implementation planning  
**Date:** 2026-05-27  
**Supersedes:** any prior spec, plan, or handoff that describes recommendation UI without provenance

---

## The governing law

> The UI must never recommend before it has shown what it observed, what it knows canonically, and how those combined into the recommendation.

This is not a UX preference. It is an architectural constraint. Violating it turns the product from an explainable synthesis engine into a chatbot with opinions.

---

## Why this matters

Humans do not trust correctness. They trust contextual specificity.

A recommendation that says "Vanta closes this in 90 days" is correct. It still feels like a brochure.

The same recommendation earned through visible observation, canonical grounding, and transparent synthesis feels like an analyst showing their working.

The distinction is not cosmetic. It is the difference between a product that gets dismissed and a product that gets trusted at a board table.

---

## Three content classes

Every piece of content in the proof360 B-surface belongs to exactly one class. The classification is internal — never exposed as debug labels to the user.

### 1. CanonicalClaim

Stable, reusable, evidence-backed truth. Does not change with the conversation. Does not change with the user.

```ts
type CanonicalClaim = {
  id: string;                  // e.g. "soc2_healthcare_requirement"
  statement: string;           // "Healthcare enterprise procurement commonly requires SOC 2 Type II"
  domain: string;              // "compliance"
  sources: SourceRef[];        // regulatory doc, vendor spec, framework
  confidence: number;          // 0–1; claims <0.7 require explicit sourcing
  valid_from?: string;         // ISO date — when this became true
  valid_until?: string;        // ISO date — if time-limited (e.g. a program window)
};
```

CanonicalClaims are curated, not generated. They live in CORPUS. They are composed with signals — they are never replaced by generation.

### 2. ObservedSignal

Derived from this session: scans, conversation, geography, stage, industry, self-disclosure, inferred behaviour.

```ts
type ObservedSignal = {
  id: string;                  // e.g. "no_soc2_detected"
  type: string;                // "compliance_gap" | "capability" | "market_context" | "stage" | "self_disclosed" | ...
  polarity: "gap" | "capability"; // gap = deficiency; capability = existing strength
  domain: string;              // "compliance" | "security" | "financial" | "identity" | "legal" | "team"
  value: string;               // human-readable: "No SOC 2 detected" or "AWS partner enrolled"
  source: SignalSource;        // "github_scan" | "conversation" | "url_scrape" | "self_disclosed"
  confidence: number;          // 0–1 — see confidence semantics below
  observed_at: string;         // ISO timestamp
  last_verified: string;       // ISO timestamp — when this was last confirmed still true
  freshness_weight: number;    // 0–1 — decays from 1.0 toward 0 as signal ages; applied at render time
  conversation_turn: number;   // which turn produced this signal
  disprovable_by: string;      // what the user could say to correct it
};
```

**Confidence semantics:** `confidence` represents confidence that the observation exists — not confidence in any recommendation outcome. A confidence of 0.82 means "we are 82% confident this signal is currently true." It does not mean the recommended action has an 82% chance of success. This distinction must be preserved in all UI language.

**Signal decay:** `freshness_weight` decays linearly from 1.0 toward 0 over 14 days from `last_verified`. At freshness_weight < 0.5, the signal is considered stale and the UI shows `last verified [date]` instead of `observed [time]`. Stale signals still contribute to GuidanceBlocks but at reduced weight. A self-disclosed signal (`source: "self_disclosed"`) does not decay — the user said it, it is current until they correct it.

ObservedSignals are the trust foundation. They are shown to the user before any recommendation. The user can correct them.

**Persistence:** ObservedSignals are session-scoped — they live for the duration of the in-memory session (24h TTL, consistent with the existing session store). They do not persist across page reload unless the session ID is preserved in the URL. User corrections are also session-scoped. This is acceptable for v2; cross-session signal memory is a later capability.

### 3. GuidanceBlock

Synthesized dynamically from CanonicalClaims + ObservedSignals + persona lens + temporal context.

```ts
type GuidanceBlock = {
  claims: CanonicalClaim[];
  signals: ObservedSignal[];
  persona: "sophia" | "leonardo" | "edison";
  synthesis: string;           // generated — the interpretation
  next_move: string;           // always required — concrete next action
  confidence: number;
  generated_at: string;
  temporal_context?: string;   // e.g. "post-AWS-Activate-deadline-2026-Q2"
};
```

GuidanceBlocks are never stored. They are generated at render time from the current signals and claims. The same entity at a different time or with different signals gets a different GuidanceBlock.

---

## UX laws

### Law 1: Observation before recommendation

The sequence is non-negotiable:

```
1. Observed: [signal chips — clickable]
2. Why it matters: [canonical grounding]
3. What to do next: [synthesized guidance + next move]
```

Skipping straight to a recommendation breaks trust. Even if the recommendation is correct.

### Law 2: Edison rhythm

Every Edison (or Sophia / Leonardo) response follows this structure. Not one block. Three beats.

**Beat 1 — Observed:**  
What the system saw. Facts only. No interpretation.

> "Your repo has no access controls or incident response documentation. You mentioned AU healthcare enterprise as your target."

**Beat 2 — Why it matters:**  
Canonical grounding. Why these observations are significant in this context.

> "Healthcare enterprise procurement commonly requires SOC 2 Type II. These three repo gaps are the items that fail that checklist."

**Beat 3 — Next move:**  
A concrete, sequenced action. Not a vendor pitch. An instruction.

> "Next: add an incident response policy doc to your repo this week. That clears one checklist item regardless of Vanta. Then evaluate Vanta for the remaining audit automation."

### Law 3: Ranking is explainable by evidence

Vendor ordering is never alphabetical, never list-order, never arbitrary.

Every vendor's position in the list is determined by how many current ObservedSignals map to it.

If Vanta is ranked #1, the UI shows why. Always. This line is not optional:

> "Ranked because: AU healthcare + no SOC 2 + no IR controls"

The user must be able to understand why they are being shown what they are being shown.

### Law 4: Tags are internal, rhythm is external

The CanonicalClaim / ObservedSignal / GuidanceBlock classification is an internal architectural property — never surfaced as visible labels to the user.

The user experiences the classification as rhythm, not taxonomy:
- Green signal chips = ObservedSignals (shown, not labelled)
- Edison's three-beat structure = GuidanceBlock (felt, not named)
- Stable vendor descriptions = CanonicalClaims (trusted, not tagged)

### Law 5: CTAs are earned

A CTA (Apply, Book, Inquire) appears only after the relevant GuidanceBlock has been rendered and the user has sent at least one message that touches that domain (i.e. the message is associated with at least one ObservedSignal in that domain). A GuidanceBlock rendered from pre-conversation signals alone (e.g. from a GitHub scan before the user has typed anything) does not qualify — the user must have engaged with the domain in conversation.

Practically: the session tracks `domain_turns: Record<domain, number>`. A CTA for a vendor in the compliance domain is suppressed until `domain_turns.compliance >= 1`.

Premature CTAs (before the observation/synthesis sequence is complete) destroy the contextual commerce posture — they revert the product to a sales tool.

---

## Counter-signals

ObservedSignals are not only deficiencies. The system must detect and surface positive capability signals — existing strengths that reduce risk, increase investor confidence, or unlock program eligibility.

**Gap signals** (polarity: "gap") — the system today:
- No SOC 2 detected
- No IR controls in repo
- No compliance evidence found

**Capability signals** (polarity: "capability") — v2 must also detect:
- AWS partner program enrolled
- Cloudflare enterprise tier active
- Vanta MSP relationship confirmed
- Existing policy maturity detected in repo
- Strong repo hygiene (branch protection, signed commits)
- Investor-ready infra posture (monitoring, logging, DR docs)
- Self-disclosed: "we have SOC 2 in progress"

Capability signals float to the top of the Observed strip with distinct styling. They affect vendor ranking: a founder already on AWS Activate should not be told to apply for it.

The emotional tone of the product must be "system understands operational posture" — not "system finds problems." Without capability signals, the observation strip becomes a deficiency list, which creates anxiety rather than orientation.

---

## The reasoning ledger (signal chips)

Signal chips are not a secondary feature. They are the primary trust surface of the product.

Each chip is a reasoning ledger entry: evidence, inference, provenance, correction. Clicking a chip opens the full reasoning chain for that observation. This is what makes the product inspectable rather than opaque.

Signal chips make the system inspectable.

**Visual:** Small clickable chips in the "Observed this session" strip at the top of the conversation, and in the profile panel signals section. Gap signals: warm green. Capability signals: soft amber (the umber token — same as the Hive&Co reference bar). Not aggressive.

**Interaction:** Click any chip → evidence drawer slides in.

**Evidence drawer content per chip:**

```
Signal: No SOC 2 detected

Source:     GitHub public repo scan
Confidence: 82% (observation confidence — how certain we are this is true)
Observed:   Turn 0 · 08:12 AEST
Freshness:  Current (last verified today)

How inferred:
  No .compliance/ directory
  No SOC 2 certification in README
  No audit trail docs detected

What would disprove this:
  Link to existing SOC 2 certificate
  SOC 2 report URL
  "We have SOC 2 in progress" — self-disclosure

Next action:
  Start SOC 2 readiness audit
  → Vanta (fastest automated path for AU)
  → Or: manual policy doc sprint (3–5 days, no cost)

[Wrong?] [Ignore] [Add context]
```

### User correction loop

Every signal chip has three correction actions:

- **Wrong?** — user asserts the signal is incorrect. The signal is flagged, confidence drops to 0, downstream GuidanceBlocks are invalidated and regenerated.
- **Ignore** — user does not dispute the signal but does not want it to drive recommendations. Signal remains but weight is zeroed.
- **Add context** — user can type a clarification. This becomes a `self_disclosed` ObservedSignal with higher confidence than the inferred one.

Correction loops are how the system earns trust from a skeptical user. The agent is not asserting facts — it is showing observations and inviting correction. This is collaborative calibration, not error recovery.

### Guidance regeneration UX

When a signal correction triggers GuidanceBlock invalidation and regeneration, the transition must be visually soft. Abrupt rewrites feel like hallucination, not recalculation.

Regeneration sequence:
1. Corrected signal chip updates immediately (strike-through then fade to corrected state)
2. Affected GuidanceBlocks show a brief `↻ Updating based on your correction…` line (300ms)
3. New GuidanceBlock fades in — 200ms ease-in, not an instant replace
4. Vendor reason lines update in the same soft transition
5. If vendor rank changes, cards reorder with a subtle slide animation (not a jump)

The UI language must say "recalculating" not "error." The correction loop is a feature, not a recovery path.

---

## Vendor cards

Each vendor card in the discovery list has a permanent reason line. Not a hover tooltip. Always visible.

```
Vanta                                              [ranked #1]
SOC 2 — 90-day automated path to certified

Ranked because: AU healthcare (turn 1) · no SOC 2 · no IR controls
                                                   [Apply →]
```

The reason line is the accountability line. It is how the user understands why this vendor is relevant to them today, not to some generic startup.

The reason line is a GuidanceBlock projection — synthesized, not stored. If signals change (user corrects "No SOC 2" → "we have SOC 2 in progress"), the reason line regenerates and the vendor may re-rank or disappear.

---

## Guidance next move

Every GuidanceBlock must conclude with a next move. This is a hard requirement.

The next move is:
- Concrete (a specific action, not a category)
- Sequenced (what to do first, then what)
- Decoupled from vendor CTAs (the action is not "buy Vanta" — it is what to do regardless of vendor)

Example of a bad next move:
> "Consider using Vanta."

Example of a good next move:
> "Next: add an incident response policy to your repo this week (template in Vanta docs, free). That clears one checklist item independently. Then evaluate Vanta for audit automation if enterprise deals are in the next 6 months."

The next move is the system completing the thought. It is what separates a smart recommendation from a smart sales pitch.

---

## Demo / workspace boundary

**Detection:** Demo mode is a boolean prop passed from `Chat.jsx` to all child components. `Chat.jsx` determines demo mode from the active stage ID — if the stage is sourced from `DEMO_STAGES` (the Hive & Code dataset), `isDemoMode = true`. No URL param or session flag required; the data source is the authority.

When the active session is using the Hive & Code demo company:

- Amber label at top of CompanyProfile: `EXAMPLE · Hive & Code`
- Signal chips render with reduced opacity (they're illustrative, not real)
- No correction loop on demo signals (the user can't correct a simulated company)
- CTA buttons are replaced with: "See how this applies to your company →"

When the active session is the user's own company:
- No label. Clean. Uninterrupted.
- Full correction loop on all signals.

---

## Temporal narrative

Founders think in trajectory, not snapshots. The system must be capable of answering: what changed, what improved, what unlocked, what became possible.

This is the moat. A static analyzer describes the current state. A progression engine describes movement — and movement is what investors and enterprise buyers actually want to see.

**v2 scope:** The temporal narrative surface is defined here but implemented incrementally. The data model must support it from v2 even if the UI rendering comes later.

**What the data model must support (v2):**

Each session writes a `session_snapshot` on close:
```ts
type SessionSnapshot = {
  session_id: string;
  entity_id: string;         // company identifier
  timestamp: string;         // ISO
  signals: ObservedSignal[]; // state at session close
  domain_scores: Record<domain, number>;
  guidance_blocks_rendered: string[]; // GuidanceBlock IDs
};
```

When a subsequent session opens for the same entity, the system compares the current signal set to the prior snapshot and surfaces a delta:

```
Since last session:
  ✓ IR policy added to repo          (gap → resolved)
  ✓ Vanta connected                  (capability signal)
  → Compliance readiness: +18 points

Now unlocked:
  → Healthcare enterprise procurement checklist: 2 of 5 items met
  → AWS ISV co-sell eligibility: check requirements
```

**UI placement:** The temporal delta surfaces at the top of the session, above the Observed strip — but only when a prior snapshot exists. First-session users see the standard Observed strip. Returning users see "What changed" first, then current signals.

**Emotional intent:** The system becomes a progression engine. Not "here are your problems." But "here is what you've done, here is what it unlocked, here is what's next." That is what makes the platform sticky in a way dashboards are not.

---

## What this is not

- Not a replacement of CanonicalClaims with generated text. Canonical truths stay canonical. Generation composes with them.
- Not a debug overlay. Classification is internal. The user experiences rhythm, not taxonomy.
- Not a chatbot with recommendations. It is an analyst showing its working.
- Not a sales tool. CTAs are earned through the observation → synthesis sequence.

---

## Acceptance criteria

1. No GuidanceBlock renders without first rendering the ObservedSignals that contributed to it.
2. Every vendor in the ranked list shows a reason line derived from current signals.
3. Every signal chip opens an evidence drawer with source, observation confidence (labelled as such — not predictive confidence), freshness state, disprovable_by, and correction loop.
4. Every GuidanceBlock ends with a concrete next move decoupled from vendor CTAs.
5. Demo mode signals are visually distinct (reduced opacity) and have no correction loop.
6. No CTA appears on a domain where `domain_turns[domain] < 1`.
7. If a user corrects a signal, all downstream GuidanceBlocks where `signal.domain` matches the corrected signal's `domain` invalidate and regenerate with a soft transition (no abrupt replace). UI shows `↻ Updating based on your correction…` during regeneration.
8. The CanonicalClaim / ObservedSignal / GuidanceBlock classification is never visible as a label to the user.
9. The ObservedSignal schema includes `polarity` ("gap" | "capability"), `last_verified`, and `freshness_weight`. Gap signals style green; capability signals style amber.
10. Signals with `freshness_weight < 0.5` display `last verified [date]` not `observed [time]` in the evidence drawer.
11. The session writes a `SessionSnapshot` on close containing signals, domain scores, and rendered GuidanceBlock IDs. This is the data foundation for the temporal narrative.
12. On a return session for a known entity, the temporal delta (what changed since last session) surfaces above the Observed strip before current signals.
