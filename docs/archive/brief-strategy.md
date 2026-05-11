# Proof360 — Product Strategy

## What this product is

Proof360 is a trust readiness diagnostic for founders.

It is not a compliance tool.
It is not an audit dashboard.
It is not a checklist product.

It is a decision-support system that answers one question:

> What trust gaps will block my next enterprise deal or fundraising round — and what do I do about them?

The mental model for users is a credit score, not a compliance report. Founders understand credit scores. They do not understand SOC 2 control matrices.

---

## The product stack position

```
Proof360          ← founder-facing entry product (this product)
     ↓
Trust360          ← reasoning engine (gap analysis, scoring, vendor matching)
     ↓
Research360       ← knowledge substrate (frameworks, standards, vendor corpus)
     ↓
Ethiks360         ← full platform (continuous monitoring, integrations, portals)
```

Proof360 is the top-of-funnel application. It is the proof of concept for the entire stack. Every architectural decision must be compatible with this chain.

---

## The real competitive position

### What we are not competing with

- Vanta / Drata / Secureframe — these are compliance automation tools. They help companies fix gaps. We help companies understand which gaps matter and why.
- GRC platforms — these are for compliance and legal teams. We speak to founders and revenue leaders.
- Security scanners — these report technical findings. We report business consequences.

### What we actually are

We sit above the compliance tool layer as a neutral advisor:

```
Trust diagnostic (Proof360)
          ↓
Recommended path (vendor-neutral)
          ↓
Tool ecosystem (Vanta, Drata, etc.)
```

We route to the ecosystem. We do not replace it.

### The moat

The UI is not the moat. The UI can be copied in 3 months.

The moat is:

1. **The signals dataset** — structured, comparable trust posture data across companies by stage, sector, and geography. This is what makes the score meaningful rather than just computed. It requires collecting structured signals from every session from day one.

2. **The reasoning corpus** — Research360 as the knowledge substrate. Gap explanations backed by cited standards (SOC 2, ISO 27001, NIST) create defensible, explainable outputs that feel like intelligence rather than AI guesswork.

3. **The portable profile** — if the trust profile becomes something buyers, investors, and insurers request, Proof360 becomes infrastructure. That requires adoption at both ends of the market.

**The strategic risk:** Vanta, AWS Marketplace, and large GRC players are all moving toward trust scoring. The window to establish the dataset moat is 12–18 months. The signals object in every session is not a nice-to-have. It is the core asset.

---

## Product psychology

### The user's emotional state on arrival

The user is not thinking: "I need compliance tooling."

They are thinking:
- I need to raise and investors are asking questions I can't answer
- I'm losing enterprise deals at procurement and I don't know why
- Someone sent me a security questionnaire and I have no idea what to say
- I need clarity, fast

The product must meet them at that emotional state — not redirect them to frameworks.

### Design principles

1. **Warm editorial, not dashboard.** The report should feel like a trusted advisor handed you a well-printed brief. Not like internal admin software.

2. **Understandable in seconds, explorable in depth.** Layer 1 gives the verdict. Layer 2 gives the reasoning. Never show everything at once.

3. **Education before selling.** Every gap explains why it matters before mentioning a vendor. The "why" and "risk" always come before "supported paths."

4. **Never let people have buyer's regret.** Give them the information to make the decision themselves. Explain consequences. Present curated options. Be honest about what is best for them.

5. **Revenue framing, not compliance framing.** "This will block your enterprise deal" lands differently than "this control is missing." Always connect gaps to business outcomes.

6. **Progress, not verdict.** The score-preview-on-fix (70 → 81) turns the product into a momentum tool. Founders see a path forward, not a failure state.

---

## Framing language

### Use

- Trust readiness
- Enterprise deal readiness
- Trust posture
- Gap
- Blocker
- Supported path
- Fix this gap

### Avoid

- Compliance
- Controls
- Audit
- Failing
- Non-compliant
- Risk score (too financial/insurance)

---

## The CCIE insight

The product is architecturally equivalent to network troubleshooting:

```
Symptom:    startup cannot close enterprise deals
↓
Layer 1:    infrastructure signals (hosting, access)
Layer 2:    identity signals (MFA, SSO, IAM)
Layer 3:    governance signals (policies, documentation)
Layer 4:    monitoring signals (logging, incident response)
↓
Root cause: specific gap(s) blocking deal flow
↓
Fix:        fastest path to resolution
```

This is not a compliance audit. It is a trust troubleshooting console.

---

## MVP scope

### What is in MVP

- Website URL + pitch deck input
- 10-question conversational assessment
- Gap analysis → gap objects with full schema
- Trust score (0–100)
- Enterprise deal readiness indicator
- Report: Layer 1 (immediate value, no gate)
- Report: Layer 2 (full breakdown, email gate)
- Email capture (no password, magic link)
- Gap cards with: why, risk, score-preview-on-fix, time estimate, evidence citations, supported paths
- Recommended next steps with score trajectory
- No login, no accounts, no dashboard beyond report

### What is explicitly deferred

- Shareable trust profile / public badge
- Investor view toggle
- Portfolio view
- Continuous monitoring
- Platform integrations
- Score trajectory over time
- Viral / network features

These are the right next features. They are not MVP.

---

## The signals object (non-negotiable from day one)

Every session must capture and store a structured signals object. This is the raw material for the dataset moat.

```json
{
  "session_id": "uuid",
  "company_name": "string",
  "website": "url",
  "deck_uploaded": "boolean",
  "stage": "seed | series_a | series_b | growth",
  "sector": "string",
  "primary_use_case": "enterprise_sales | fundraising | procurement | other",
  "questions_answered": ["array of {question_id, answer}"],
  "gaps": ["array of gap objects"],
  "trust_score": "integer 0–100",
  "deal_readiness": "low | medium | high",
  "email_captured": "boolean",
  "timestamp": "ISO datetime",
  "source": "website | api | partner"
}
```

Gap object schema (must match Trust360 spec):

```json
{
  "gap_id": "string",
  "category": "infrastructure | identity | governance | monitoring",
  "severity": "critical | moderate | low",
  "title": "string",
  "why": "string",
  "risk": "string",
  "control": "string",
  "closure_strategies": ["array of strings"],
  "vendor_implementations": ["array of {vendor_name, url, notes}"],
  "score_impact": "integer",
  "confidence": "high | medium | low",
  "evidence": ["array of {source, citation}"],
  "time_estimate": "string"
}
```

Do not simplify this schema for MVP. The flywheel depends on structured, comparable data from session one.

---

## Platform evolution path

```
Phase 1 — Trust diagnostic (MVP)
  Assess → score → report → email gate → action plan

Phase 2 — Trust workflow
  Fix gap → track progress → rescore → updated report

Phase 3 — Trust ledger
  Continuous posture tracking. Source of truth for policies, controls, audits.

Phase 4 — Trust passport
  Portable, verifiable trust profile. Requested by buyers, investors, insurers.
```

Each phase is additive. Nothing in Phase 1 should be built in a way that blocks Phase 2–4.
