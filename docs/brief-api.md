# Proof360 — API Brief (Kiro)

## Your job

Build the Proof360 API. This is the adapter layer between the frontend and the Trust360 reasoning engine. Read brief-strategy.md fully before writing any code — the product psychology shapes what this API must do.

The frontend contains zero business logic. All gap analysis, scoring, inference, vendor matching, and evidence retrieval happens here.

The Trust360 engine (POST /trust) is already built. You are building an adapter on top of it.

---

## The cold read model

The assessment flow is NOT a questionnaire. It is:

1. Founder submits website URL or pitch deck
2. System extracts signals and builds inferences (async)
3. Founder sees "here's what we found" — corrects misreads
4. System asks only targeted follow-up questions it couldn't infer
5. Founder submits corrections + answers
6. System runs gap analysis via Trust360
7. Report delivered

This is the source of truth. The old 10-question Q&A model is retired.

---

## The Trust360 engine

Endpoint: POST /trust

Input: { "question": "string (1-2000 chars)", "evidence": "string (optional)", "metadata": {} }

Pipeline: createContext → buildPrompt → runLLMEnsemble → parseOutputs → computeConsensus → buildResponse

Models (parallel, 20s timeout): gpt-4, gpt-3.5-turbo, claude-sonnet-4-20250514

Output: { traceId, consensus: { mos, variance, agreement }, models: [...], metrics: { executionTimeMs, ... } }

Status codes: 200 (all succeeded), 206 (partial), 400 (validation), 500 (all failed)

Key insight: Trust360 evaluates claims — it does not know what SOC 2 is. You translate business context into evaluable claims. MOS >= 7 confirms a gap.

---

## Endpoints

Nine endpoints. All scoped to /api/v1/.

POST   /session/start                — create session, begin signal extraction
GET    /session/:id/infer-status     — poll extraction progress
GET    /session/:id/inferences       — cold read object (inferences + correctable fields + follow-up questions)
GET    /session/:id/followup-questions — targeted questions only (split endpoint for sequential frontend rendering)
POST   /session/:id/submit           — corrections + answers, triggers gap analysis
GET    /session/:id/status           — poll analysis progress
GET    /session/:id/early-signal     — estimated score after Q4-equivalent signal threshold
POST   /session/:id/capture-email    — email capture, unlocks Layer 2
GET    /session/:id/report           — full report with vendor_intelligence per gap

---

## File structure

proof360/api/src/
  server.js
  handlers/
    session-start.js
    infer-status.js
    inferences.js
    followup-questions.js
    submit.js
    status.js
    early-signal.js
    capture-email.js
    report.js
  services/
    signal-extractor.js
    inference-builder.js
    context-normalizer.js
    gap-mapper.js
    trust-client.js
    vendor-selector.js
    vendor-intelligence-builder.js
    session-store.js
  config/
    gaps.js
    vendors.js
    frameworks.js

---

## Session store

In-memory Map. No database for MVP. 24-hour TTL.

Session object shape:
- session_id (UUID)
- infer_status: "processing" | "complete" | "failed"
- analysis_status: null | "processing" | "complete" | "failed"
- layer2_locked: true (default), false after email capture
- website_url, deck_uploaded (boolean)
- raw_signals (from signal extractor)
- inferences, correctable_fields, followup_questions (from inference builder)
- corrections, followup_answers (from submit)
- merged_context (from context normalizer)
- gaps (confirmed gap objects)
- trust_score, deal_readiness
- vendor_intelligence (per gap)
- signals_object (complete, per brief-strategy.md schema)
- email
- created_at

---

## Signal extraction

service: signal-extractor.js

Inputs: website_url (string) or deck_file (buffer)

For website_url: scrape homepage, pricing page, about page. Extract:
- product_type (b2b_saas, b2c, api_platform, data_platform, etc.)
- customer_type (enterprise, mid_market, smb, consumer)
- data_sensitivity (customer_data, financial_data, health_data, none)
- infrastructure (aws, gcp, azure, unknown)
- stage (pre_revenue, seed, series_a, series_b, growth)

For deck_file: parse PDF text. Extract:
- sector
- use_case
- stage
- target_customer

Assign confidence: "confident" (direct statement), "likely" (strong implication), "probable" (weak implication)

On completion: update session infer_status to "complete" and write inferences to session.

---

## Inference builder

service: inference-builder.js

Takes raw_signals, produces cold read object:

inferences[]: array of { inference_id, label, confidence, category }
correctable_fields[]: always includes customer_type, data_sensitivity, infrastructure using inferred values as defaults
followup_questions[]: generated only for signals NOT inferred — identity_model, insurance_status, questionnaire_experience
  - Each question includes: question_id, context (why we're asking), question, options[] (always include "Not sure")

company_name: derived from URL hostname or deck extraction.

---

## Context normalizer

service: context-normalizer.js

Runs between corrections and gap mapper. Normalizes free-text to internal enums.

Infrastructure: "AWS" | "Amazon" | "Amazon Web Services" → "aws" | "GCP" | "Google Cloud" → "gcp" | "Azure" | "Microsoft" → "azure"
Compliance: "SOC2" | "SOC 2" | "soc2" → "soc2" | "ISO27001" | "ISO 27001" → "iso27001"
Boolean fields: "Yes" | "yes" | "y" | true → true | "No" | "no" | "none" | "not yet" | false → false
Stage: "Seed" | "seed stage" | "pre-series a" → "seed" | "Series A" | "series_a" → "series_a"

Called in submit.js before gap mapping. Writes merged_context to session.

---

## Gap mapper

service: gap-mapper.js

Input: merged_context (normalized signals + corrections + answers)

Process:
1. Evaluate each gap definition's trigger condition against merged_context
2. For each triggered gap, build a Trust360 claim and call POST /trust in parallel
3. MOS >= 7 confirms the gap. If Trust360 unavailable, confirm gap as fallback with flag.
4. Compute trust_score: max(0, 100 - sum of confirmed severity weights) where critical=20, high=10, medium=5, low=2
5. Determine deal_readiness: "ready" (>=80), "partial" (>=50), "not_ready" (<50)
6. Write complete signals_object to session (non-negotiable per brief-strategy.md)

Gap object schema (must match brief-strategy.md exactly):
gap_id, category, severity (critical|moderate|low), title, why, risk, control, closure_strategies[], vendor_implementations[], score_impact, confidence (high|medium|low), evidence[], time_estimate

---

## Gap definitions (gaps.js)

Scaffold these in Phase 1, populate fully in Phase 3.

Required gap definitions:
- soc2: critical — trigger: no compliance certification AND targets enterprise
- mfa: critical — trigger: identity_model is "password_only" or unknown
- cyber_insurance: critical — trigger: insurance_status is false or unknown
- incident_response: high — trigger: no documented IRP
- vendor_questionnaire: high — trigger: no vendor risk process
- edr: high — trigger: no endpoint detection
- sso: medium — trigger: identity_model is not "sso"

Each definition has: id, severity, label, category, trigger(context) function, claim(context) function that builds { question, evidence, metadata }

---

## Vendor intelligence builder

service: vendor-intelligence-builder.js

Called after gap analysis. For each confirmed gap with a mapped vendor category:

Builds vendor_intelligence object per brief-vendors.md shape:
- category_name
- quadrant_axes (x_left, x_right, y_top, y_bottom)
- vendors[] — all vendors for category with x/y coordinates, is_partner, is_pick, deal_label, referral_url
- pick object — context-aware recommendation with first-person recommendation_body
- disclosure string — names all partner vendors, states referral arrangement transparently

Vendor selection rules:
- is_pick = true for exactly one vendor per category
- Prefer partner vendors with best_for match to company stage/stack
- referral_url is null for non-partner vendors

---

## Vendor catalog (vendors.js)

Scaffold in Phase 1, populate fully in Phase 3.

Partners (is_partner: true):
- vanta: GRC, 20% off first year, Proof360 uses internally
- drata: GRC, 15% off first year, Proof360 uses internally
- cloudflare: Infrastructure, existing partnership, deal TBC
- cisco_duo: Identity/IAM, existing partnership, deal TBC
- aws: Infrastructure, AWS Activate credits

Non-partners (is_partner: false, referral_url: null):
- secureframe: GRC
- sprinto: GRC
- okta: Identity
- pagerduty: Incident response
- securityscorecard: Vendor risk

Template-led and consulting-led options always included as alternatives in every category.

---

## Report shape

GET /session/:id/report response:

session_id, company_name, assessed_at, trust_score, deal_readiness_label, deal_readiness_score, headline { ready_count, blocking_count, summary_line }, snapshot { deal_blockers, fundraising_risk, strengths }, gaps[], strengths[], next_steps[], layer2_locked

Each gap includes vendor_intelligence object (from brief-vendors.md) when vendor data exists for that category.

Each next_step: step_number, title, score_trajectory ("70 → 81"), description

layer2_locked: true until capture-email succeeds. When locked, return gaps with evidence and vendor_intelligence fields omitted.

---

## Signals object (non-negotiable)

Written to session on every submit completion. Schema from brief-strategy.md:

session_id, company_name, website (url), deck_uploaded (boolean), stage, sector, primary_use_case, questions_answered[], gaps[], trust_score, deal_readiness, email_captured (boolean), timestamp (ISO), source ("website" | "api" | "partner")

Do not simplify this schema. This is the dataset moat.

---

## Build phases

Phase 1 — foundation:
session-store.js, server.js with CORS, session-start.js, infer-status.js, inferences.js, context-normalizer.js (scaffold), gaps.js (scaffold), vendors.js (scaffold), frameworks.js (scaffold)
Verify: POST /session/start returns session_id, GET /inferences returns cold read object.

Phase 2 — submission:
followup-questions.js, submit.js (calls context-normalizer then gap-mapper), status.js, gap-mapper.js with Trust360 integration
Verify: full flow start → inferences → submit → status === complete.

Phase 3 — report:
gap-mapper.js with full gap data, vendor-intelligence-builder.js, vendors.js fully populated, report.js with vendor_intelligence per gap
Verify: GET /report returns complete shape including vendor_intelligence.

Phase 4 — remaining:
early-signal.js, capture-email.js with layer2_locked toggle and signals_object update
Verify: email capture unlocks Layer 2 fields in report response.

---

## Rules

- Stop and verify after each phase before proceeding.
- If Trust360 is unavailable, confirm triggered gaps as fallback. Never block the pipeline on Trust360 failure.
- All errors return { error: "message", code: "ERROR_CODE" }.
- All pipeline stages log structured JSON with trace_id, session_id, stage, duration_ms.
- The signals object is written on every completion. No exceptions.
- Never hardcode vendor positions in the frontend — they come from vendors.js via the API.
