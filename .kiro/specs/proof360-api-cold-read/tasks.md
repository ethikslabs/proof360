# Implementation Plan: Proof360 API Cold Read

## Overview

Implement the Proof360 API cold read layer as a Fastify/Node.js adapter between the React frontend and the Trust360 reasoning engine. The API manages a 9-endpoint session lifecycle for the cold read assessment model. Implementation follows 4 build phases with verification gates. Existing code in proof360/api/ must be reconciled/rewritten to match the approved design — do not preserve existing code as-is.

## Tasks

- [x] 1. Phase 1 — Foundation: Session Store, Server, Inference Pipeline, Config Scaffolds
  - [x] 1.1 Implement session-store.js with in-memory Map, UUID generation, 24-hour TTL, and stale session timeout utility
    - Rewrite `proof360/api/src/services/session-store.js` to match design
    - Export `createSession(input)`, `getSession(id)`, `updateSession(id, updates)`, `deleteSession(id)`
    - `getSession` returns null and removes sessions older than 24 hours
    - Add `checkStaleSessions()` utility: scan all sessions, if `infer_status === "processing"` or `analysis_status === "processing"` for longer than 90 seconds, set status to `"failed"` and log with `reason: "timeout"`
    - `checkStaleSessions()` is called on a 30-second interval (exported for testability, interval started in server.js)
    - Session object must include all fields from design: id, website_url, deck_file, infer_status ("processing"), analysis_status (null), layer2_locked (true), raw_signals, inferences, correctable_fields, followup_questions, company_name, source_summary, corrections, followup_answers, merged_context, gaps, trust_score, deal_readiness, vendor_intelligence, signals_object, email, created_at
    - Signals object must include `enterprise_signals` and `competitor_mentions` fields
    - _Requirements: 1.3, 16.1, 16.2, 15.3_

  - [ ]* 1.2 Write property tests for session store
    - **Property 1: Session creation produces valid initial state**
    - **Property 17: Session expiry at 24-hour TTL**
    - **Validates: Requirements 1.3, 16.1**

  - [x] 1.3 Implement server.js with Fastify, CORS, route registration, and stale session interval
    - Rewrite `proof360/api/src/server.js` to match design
    - Fastify with CORS enabled for all origins
    - Read PORT (default 3001), TRUST360_URL, LOG_LEVEL, NODE_ENV from environment variables
    - Register all nine route handlers under `/api/v1/` prefix
    - Start `checkStaleSessions()` interval at 30 seconds on server boot
    - _Requirements: 17.1, 17.2, 17.3_

  - [x] 1.4 Implement session-start.js handler
    - Rewrite `proof360/api/src/handlers/session-start.js` to match design
    - POST /api/v1/session/start — validate input (400 if neither website_url nor deck_file), create session, return 201 { session_id } within 200ms
    - Fire async signal extraction pipeline (extractSignals → buildInferences → update session)
    - Pipeline catch: set infer_status to "failed", log structured error
    - _Requirements: 1.1, 1.2, 1.4, 2.4, 2.5_

  - [x] 1.5 Implement signal-extractor.js as MVP simulation
    - Rewrite `proof360/api/src/services/signal-extractor.js` to match design
    - Export `extractSignals({ website_url, deck_file })` returning `{ signals: RawSignal[], sources_read: string[] }`
    - MVP: simulate extraction with plausible defaults based on URL/deck presence
    - Extract `enterprise_signals` object: `{ security_page_detected, trust_centre_detected, soc2_mentioned, pricing_enterprise_tier }` (all boolean)
    - Extract `competitor_mentions` array: `string[]`
    - Add prominent comment: `// TODO Phase 2: Wire real HTTP scraping + LLM parsing via Trust360. Current implementation is MVP simulation only.`
    - Each signal has type, value, confidence (confident|likely|probable)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.6 Implement inference-builder.js
    - Rewrite `proof360/api/src/services/inference-builder.js` to match design
    - Export `buildInferences(signals, sources_read, website_url)` returning ColdReadObject
    - Map each raw signal to display inference with inference_id, label, confidence, category
    - Always include compliance and infrastructure inferences at "probable" when no direct evidence
    - Generate correctable_fields for customer_type, data_sensitivity, infrastructure
    - Generate follow-up questions only for uninferred signal types (identity_model, insurance_status, questionnaire_experience)
    - Every follow-up question options array includes "Not sure"
    - Derive company_name from URL hostname (strip www., capitalise first segment)
    - _Requirements: 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 1.7 Write property tests for inference builder
    - **Property 3: Inference builder cold read object completeness**
    - **Property 4: Company name derivation from URL**
    - **Validates: Requirements 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

  - [x] 1.8 Implement infer-status.js handler
    - Rewrite `proof360/api/src/handlers/infer-status.js` to match design
    - GET /api/v1/session/:id/infer-status — return { status } from session
    - 404 if session not found or expired
    - _Requirements: 3.1, 3.2_

  - [x] 1.9 Implement inferences.js handler
    - Rewrite `proof360/api/src/handlers/inferences.js` to match design
    - GET /api/v1/session/:id/inferences — return cold read object (company_name, source_summary, inferences, correctable_fields, followup_questions)
    - 404 if session not found, 409 if infer_status !== "complete"
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 1.10 Scaffold config files: gaps.js, vendors.js, frameworks.js
    - Rewrite `proof360/api/src/config/gaps.js` — export GAP_DEFINITIONS array (id, severity, label, category, triggerCondition, claimTemplate stubs) and SEVERITY_WEIGHTS map (critical=20, high=10, medium=5, low=2) for all 7 gaps: soc2, mfa, cyber_insurance, incident_response, vendor_questionnaire, edr, sso
    - Rewrite `proof360/api/src/config/vendors.js` — export VENDORS catalog and VENDOR_CATEGORIES with quadrant axes and positions for all vendors (vanta, drata, secureframe, okta, cisco_duo, austbrokers, cloudflare, crowdstrike, palo_alto)
    - Rewrite `proof360/api/src/config/frameworks.js` — export FRAMEWORK_MAP from customer types to framework arrays
    - _Requirements: 18.1, 18.2, 19.1, 19.2, 19.3, 20.1_

  - [ ]* 1.11 Write property tests for gap definitions and vendor catalog structure
    - **Property 18: Gap definition and claim template structure**
    - **Property 19: Vendor catalog entry structure**
    - **Validates: Requirements 18.1, 18.3, 19.2**

- [x] 2. Phase 1 Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify: POST /session/start returns session_id with 201
  - Verify: GET /infer-status returns status after extraction completes
  - Verify: GET /inferences returns cold read object with inferences, correctable_fields, followup_questions
  - Verify: stale session timeout sets status to "failed" after 90 seconds

- [ ] 3. Phase 2 — Submission: Follow-ups, Submit with Idempotency, Status, Context Normalizer, Gap Mapper
  - [ ] 3.1 Implement followup-questions.js handler
    - Rewrite `proof360/api/src/handlers/followup-questions.js` to match design
    - GET /api/v1/session/:id/followup-questions — return { followup_questions } from session
    - 404 if session not found, 409 if infer_status !== "complete"
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 3.2 Implement submit.js handler with idempotency guard
    - Rewrite `proof360/api/src/handlers/submit.js` to match design
    - POST /api/v1/session/:id/submit — store corrections and followup_answers, set analysis_status to "processing", return { status: "processing" } within 200ms
    - **Idempotency guard**: if `analysis_status === "processing"`, return HTTP 409 with `{ error: "Analysis already in progress", code: "ALREADY_PROCESSING" }` — prevent double-submission
    - 404 if session not found, 409 if infer_status !== "complete"
    - Fire async gap analysis pipeline (mergeContext → evaluateGapTriggers → Trust360 claims → confirmGaps → computeScore → buildVendorIntelligence → writeSignalsObject → update session)
    - Pipeline catch: set analysis_status to "failed", log structured error
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 3.3 Implement status.js handler
    - Rewrite `proof360/api/src/handlers/status.js` to match design
    - GET /api/v1/session/:id/status — return { status } from session analysis_status
    - When analysis_status is null, return { status: "not_started" }
    - 404 if session not found
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 3.4 Implement context-normalizer.js
    - Create `proof360/api/src/services/context-normalizer.js`
    - Export `normalizeContext(rawContext)` returning NormalizedContext
    - Normalise infrastructure strings → aws|gcp|azure, compliance variants → soc2|iso27001, boolean-ish → true|false, stage variants → canonical enums
    - Corrections override inferred values; follow-up answers normalised to internal enums
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 3.5 Write property tests for context normalizer
    - **Property 5: Context merge — corrections override inferred values**
    - **Property 6: Answer normalisation round-trip**
    - **Validates: Requirements 8.1, 8.2**

  - [ ] 3.6 Implement gap-mapper.js with Trust360 integration
    - Rewrite `proof360/api/src/services/gap-mapper.js` to match design
    - Export `runGapAnalysis(context)` returning GapAnalysisResult
    - Evaluate each gap definition's triggerCondition against merged context
    - Build Trust360 claims for triggered gaps, call POST /trust in parallel via trust-client.js
    - MOS >= 7 confirms gap; Trust360 unavailable → confirm as fallback with fallback flag
    - Compute trust_score: max(0, 100 - Σ severity_weights)
    - Determine deal_readiness: ready (>=80), partial (>=50), not_ready (<50)
    - Write complete signals_object to session including `enterprise_signals` and `competitor_mentions`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 15.1, 15.2_

  - [ ] 3.7 Implement trust-client.js
    - Rewrite `proof360/api/src/services/trust-client.js` to match design
    - Export `evaluateClaim(claim)` and `evaluateClaims(claims)` for parallel Trust360 calls
    - 20-second timeout per call, structured error logging
    - _Requirements: 9.2, 9.4_

  - [ ]* 3.8 Write property tests for gap analysis and scoring
    - **Property 7: Gap trigger evaluation matches context**
    - **Property 8: Trust360 MOS threshold determines gap confirmation**
    - **Property 9: Trust score computation**
    - **Property 10: Gap object schema conformance**
    - **Validates: Requirements 9.1, 9.3, 9.4, 9.5, 9.6, 9.7**

- [ ] 4. Phase 2 Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify: full flow POST /session/start → GET /inferences → POST /submit → GET /status returns "complete"
  - Verify: submit idempotency guard returns 409 when analysis_status is "processing"
  - Verify: pipeline timeout sets status to "failed" after 90 seconds with reason "timeout"

- [ ] 5. Phase 3 — Report: Vendor Selector, Vendor Intelligence Builder, Report Endpoint
  - [ ] 5.1 Implement vendor-selector.js
    - Rewrite `proof360/api/src/services/vendor-selector.js` to match design
    - Export `selectVendors(gaps)` returning MatchedVendor[] — match confirmed gaps to vendor catalog entries, assign priority by gap severity
    - _Requirements: 14.1, 14.5_

  - [ ] 5.2 Implement vendor-intelligence-builder.js with full vendor_intelligence per gap
    - Rewrite `proof360/api/src/services/vendor-intelligence-builder.js` to match design
    - Export `buildVendorIntelligence(gap, context)` returning VendorIntelligence | null
    - Build category_name, quadrant_axes, vendors array (with x/y coordinates, is_partner, is_pick, deal_label, referral_url), pick object (with stage_context, recommendation_headline, recommendation_body, meta, cta_label), disclosure string
    - referral_url null for non-partner vendors
    - Exactly one is_pick per category, prefer partner with context-appropriate best_for
    - Disclosure names all partner vendors, states referral arrangement
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [ ]* 5.3 Write property tests for vendor intelligence
    - **Property 11: Vendor intelligence shape and referral integrity**
    - **Property 12: Exactly one pick per vendor category**
    - **Property 13: Disclosure names all partner vendors**
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.7**

  - [ ] 5.4 Fully populate config/gaps.js with complete gap definitions
    - Fill in all triggerCondition and claimTemplate functions for all 7 gap definitions
    - Each claimTemplate builds Trust360-compatible { question, evidence, metadata } with gapId and severity
    - _Requirements: 18.1, 18.2, 18.3_

  - [ ] 5.5 Fully populate config/vendors.js with complete vendor catalog and category data
    - Complete all vendor entries with full data: id, display_name, initials, closes, cost_range, timeline, is_partner, deal_label, best_for, summary, referral_url
    - Complete VENDOR_CATEGORIES with quadrant axes and vendor position coordinates for GRC, Identity & IAM, and additional categories
    - _Requirements: 19.1, 19.2, 19.3_

  - [ ] 5.6 Implement report.js handler with vendor_intelligence per gap
    - Rewrite `proof360/api/src/handlers/report.js` to match design
    - GET /api/v1/session/:id/report — return full report object
    - Report contains: session_id, company_name, assessed_at, trust_score, deal_readiness_label, deal_readiness_score, headline, snapshot, gaps (with vendor_intelligence when unlocked), strengths, next_steps, layer2_locked
    - When layer2_locked=true, omit evidence and vendor_intelligence from gaps
    - 404 if session not found, 409 if analysis_status !== "complete"
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

  - [ ]* 5.7 Write property tests for report and signals object
    - **Property 14: Signals object completeness**
    - **Property 15: Report response schema conformance**
    - **Validates: Requirements 15.1, 15.2, 15.4, 13.1, 13.2, 13.3, 13.4, 13.6**

- [ ] 6. Phase 3 Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify: GET /report returns complete shape including vendor_intelligence per gap
  - Verify: vendor_intelligence has exactly one pick per category, disclosure names all partners
  - Verify: layer2_locked=true omits evidence and vendor_intelligence from gaps

- [ ] 7. Phase 4 — Remaining: Early Signal, Email Capture
  - [ ] 7.1 Implement early-signal.js handler
    - Rewrite `proof360/api/src/handlers/early-signal.js` (create if not exists)
    - GET /api/v1/session/:id/early-signal — return { estimated_trust_score, preliminary_deal_readiness } when sufficient signal data exists (Q4-equivalent threshold)
    - 404 if session not found, 409 if insufficient signal data
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ] 7.2 Implement capture-email.js handler
    - Rewrite `proof360/api/src/handlers/capture-email.js` (create if not exists)
    - POST /api/v1/session/:id/capture-email — validate email format (400 if invalid), store email, set layer2_locked=false, update signals_object.email_captured=true, log lead to file
    - 404 if session not found
    - Return { success: true }
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ]* 7.3 Write property tests for email validation and endpoint error codes
    - **Property 16: Email validation rejects invalid formats**
    - **Property 20: Endpoint status codes for non-existent sessions**
    - **Property 21: Endpoint 409 for premature requests**
    - **Validates: Requirements 12.1, 12.2, 3.2, 6.3, 7.3, 10.2, 4.5, 6.2, 7.2, 13.7**

  - [ ]* 7.4 Write property test for signal extraction output
    - **Property 2: Signal extraction output validity**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ] 8. Phase 4 Checkpoint — Final Verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify: email capture sets layer2_locked=false and GET /report now includes evidence and vendor_intelligence
  - Verify: early-signal returns estimated score when sufficient data exists
  - Verify: all 9 endpoints registered and responding correctly
  - Verify: signals_object includes enterprise_signals and competitor_mentions on every session
  - Verify: stale session timeout works across both pipelines

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Existing code in proof360/api/ must be reconciled/rewritten to match the approved design — do not preserve existing code as-is
- signal-extractor.js uses MVP simulation in Phase 1; must include comment flagging that real HTTP scraping + LLM parsing via Trust360 is wired in Phase 2
- Submit idempotency guard: return HTTP 409 if analysis_status === "processing" to prevent double-submission
- Pipeline timeout: both async pipelines fail after 90 seconds via checkStaleSessions() utility on 30-second interval
- Signals object includes enterprise_signals ({ security_page_detected, trust_centre_detected, soc2_mentioned, pricing_enterprise_tier }) and competitor_mentions (string[]) on every session
- Property tests use fast-check with minimum 100 iterations per property
- Each phase has a verification checkpoint before proceeding to the next
