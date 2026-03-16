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

Proof360 is the top-of-funnel application and the proof of concept for the entire stack.

Stack: Proof360 (founder-facing) -> Trust360 (reasoning engine) -> Research360 (knowledge substrate) -> Ethiks360 (full platform)

Every architectural decision must be compatible with this chain.

---

## The real competitive position

We are NOT competing with Vanta / Drata / Secureframe (compliance automation), GRC platforms (compliance/legal teams), or security scanners (technical findings). We sit ABOVE the compliance tool layer as a neutral advisor that routes to the ecosystem.

### The moat

The UI is not the moat. The UI can be copied in 3 months.

The moat is:

1. The signals dataset: structured, comparable trust posture data across companies by stage, sector, and geography. Requires collecting structured signals from every session from day one.

2. The reasoning corpus: Research360 as the knowledge substrate. Gap explanations backed by cited standards (SOC 2, ISO 27001, NIST).

3. The portable profile: if the trust profile becomes something buyers, investors, and insurers request, Proof360 becomes infrastructure.

STRATEGIC RISK: Vanta, AWS Marketplace, and large GRC players are all moving toward trust scoring. The window to establish the dataset moat is 12-18 months. The signals object in every session is the core asset, not a nice-to-have.

---

## Product psychology

The user is NOT thinking: I need compliance tooling.

They are thinking: I need to raise, I am losing enterprise deals at procurement, I got sent a security questionnaire and have no idea what to say, I need clarity fast.

The product must meet them at that emotional state, not redirect them to frameworks.

### Design principles

1. Warm editorial, not dashboard. The report should feel like a trusted advisor handed you a well-printed brief.
2. Understandable in seconds, explorable in depth. Layer 1 gives the verdict. Layer 2 gives the reasoning.
3. Education before selling. Why and risk always come before supported paths.
4. Never let people have buyer's regret. Give them information to decide themselves.
5. Revenue framing, not compliance framing. Connect gaps to business outcomes.
6. Progress, not verdict. Score-preview-on-fix (70 -> 81) creates momentum.

---

## Framing language

USE: trust readiness, enterprise deal readiness, trust posture, gap, blocker, supported path, fix this gap

AVOID: compliance, controls, audit, failing, non-compliant, risk score

---

## The CCIE insight

This product is architecturally equivalent to network troubleshooting:

Symptom: startup cannot close enterprise deals
Layer 1: infrastructure signals (hosting, access)
Layer 2: identity signals (MFA, SSO, IAM)
Layer 3: governance signals (policies, documentation)
Layer 4: monitoring signals (logging, incident response)
Root cause: specific gap(s) blocking deal flow
Fix: fastest path to resolution

This is a trust troubleshooting console, not a compliance audit.

---

## MVP scope

IN SCOPE:
- Website URL + pitch deck input
- 10-question conversational assessment
- Gap analysis with full gap object schema
- Trust score (0-100)
- Enterprise deal readiness indicator
- Report Layer 1 (immediate value, no gate)
- Report Layer 2 (full breakdown, email gate)
- Email capture (no password, magic link)
- Gap cards: why, risk, score-preview-on-fix, time estimate, evidence citations, supported paths
- Recommended next steps with score trajectory
- No login, no accounts, no dashboard beyond report

DEFERRED (right features, not MVP):
- Shareable trust profile / public badge
- Investor view toggle
- Portfolio view
- Continuous monitoring
- Platform integrations
- Score trajectory over time
- Viral / network features

---

## The signals object (non-negotiable from day one)

Every session must capture and store a structured signals object. This is the raw material for the dataset moat. Do not simplify this schema for MVP.

Session schema: session_id (uuid), company_name, website (url), deck_uploaded (boolean), stage (seed|series_a|series_b|growth), sector, primary_use_case (enterprise_sales|fundraising|procurement|other), questions_answered (array of {question_id, answer}), gaps (array of gap objects), trust_score (integer 0-100), deal_readiness (low|medium|high), email_captured (boolean), timestamp (ISO datetime), source (website|api|partner)

Gap object schema (must match Trust360 spec): gap_id, category (infrastructure|identity|governance|monitoring), severity (critical|moderate|low), title, why, risk, control, closure_strategies (array), vendor_implementations (array of {vendor_name, url, notes}), score_impact (integer), confidence (high|medium|low), evidence (array of {source, citation}), time_estimate

---

## Platform evolution path

Phase 1 - Trust diagnostic (MVP): Assess -> score -> report -> email gate -> action plan
Phase 2 - Trust workflow: Fix gap -> track progress -> rescore -> updated report
Phase 3 - Trust ledger: Continuous posture tracking, source of truth for policies and controls
Phase 4 - Trust passport: Portable, verifiable trust profile requested by buyers, investors, insurers

Each phase is additive. Nothing in Phase 1 should block Phase 2-4.
