# Requirements Document

## Introduction

Proof360 is a founder-facing trust readiness diagnostic built on the ethikslabs platform. The current API layer (brief-api.md) is designed around a 10-question Q&A model where the founder answers all questions upfront. The frontend (brief-frontend.md) has moved to a "cold read" model where the system infers trust signals from a website URL or pitch deck first, then the founder corrects misreads and answers only what the system could not figure out.

This spec redesigns the Proof360 API layer to align with the cold read model. The API accepts artefacts (URL/deck), extracts signals, builds inferences with confidence levels, generates targeted follow-up questions for gaps in inference, runs gap analysis via the Trust360 engine, and returns a full report with vendor intelligence per gap.

The Trust360 engine (POST /trust) is already built. This API is an adapter layer on top of it.

## Glossary

- **Session_API**: The Proof360 API server (Fastify, Node.js) that manages session lifecycle from artefact input through report delivery
- **Session_Store**: In-memory Map-based store holding all session state; no database for MVP; 24-hour TTL
- **Signal_Extractor**: Service that reads a website URL or pitch deck and extracts raw trust signals (product type, customer type, data sensitivity, infrastructure, stage, etc.)
- **Inference_Builder**: Service that transforms raw signals into the cold read object: display inferences with confidence levels, correctable fields, and follow-up questions
- **Gap_Mapper**: Service that takes merged context (inferences + corrections + follow-up answers), triggers gap definitions, builds Trust360 claims, evaluates them, computes trust score, and selects vendors
- **Vendor_Intelligence_Builder**: Service that enriches each confirmed gap with a vendor_intelligence object containing quadrant data, pick card, vendor grid, and disclosure per brief-vendors.md
- **Trust360_Engine**: The existing reasoning engine at POST /trust that evaluates claims and returns consensus scores
- **Signals_Object**: The non-negotiable structured data object written for every session per brief-strategy.md — the core dataset asset
- **Cold_Read**: The UX model where the system infers first and the founder corrects second, replacing the old 10-question Q&A flow
- **Inference**: A labelled signal with a confidence level (confident, likely, probable) displayed to the founder for review
- **Correctable_Field**: An inferred value the founder can override inline without answering a full question
- **Follow-up_Question**: A targeted question shown only when the system could not infer a signal
- **Vendor_Intelligence**: Per-gap vendor landscape object including quadrant positions, pick recommendation, all vendors grid, and referral disclosure
- **Early_Signal**: An estimated trust score surfaced after enough signal data reaches a Q4-equivalent threshold, before full analysis completes

## Requirements

### Requirement 1: Session Creation

**User Story:** As a founder, I want to start a trust assessment by providing my website URL or pitch deck, so that the system can begin analysing my trust posture without asking me questions upfront.

#### Acceptance Criteria

1. WHEN a POST request is received at /api/v1/session/start with a valid website_url or deck_file, THE Session_API SHALL create a new session, return a session_id, and begin signal extraction asynchronously
2. WHEN a POST request is received at /api/v1/session/start with neither website_url nor deck_file, THE Session_API SHALL return HTTP 400 with a descriptive error message
3. THE Session_Store SHALL assign a UUID to each new session and initialise all session fields including infer_status set to "processing"
4. WHEN a session is created, THE Session_API SHALL respond with HTTP 201 and a JSON body containing session_id within 200ms, without waiting for signal extraction to complete

### Requirement 2: Signal Extraction

**User Story:** As a founder, I want the system to read my website and pitch deck automatically, so that I do not have to manually describe my company.

#### Acceptance Criteria

1. WHEN a session is created with a website_url, THE Signal_Extractor SHALL read the homepage, pricing page, and about page to extract product type, customer type, data sensitivity, and infrastructure signals
2. WHEN a session is created with a deck_file, THE Signal_Extractor SHALL parse the pitch deck to extract stage, use case, and sector signals
3. THE Signal_Extractor SHALL assign a confidence level (confident, likely, or probable) to each extracted signal based on extraction certainty
4. IF signal extraction fails, THEN THE Signal_Extractor SHALL update the session infer_status to "failed" and log the error
5. WHEN signal extraction completes successfully, THE Signal_Extractor SHALL update the session infer_status to "complete"

### Requirement 3: Inference Status Polling

**User Story:** As a frontend client, I want to poll the inference status so that I can show progress to the founder and navigate when extraction is complete.

#### Acceptance Criteria

1. WHEN a GET request is received at /api/v1/session/:id/infer-status for an existing session, THE Session_API SHALL return the current infer_status value (processing, complete, or failed)
2. WHEN a GET request is received at /api/v1/session/:id/infer-status for a non-existent or expired session, THE Session_API SHALL return HTTP 404

### Requirement 4: Inference Delivery

**User Story:** As a founder, I want to see what the system inferred about my company with confidence levels, so that I can verify the system's read before proceeding.

#### Acceptance Criteria

1. WHEN a GET request is received at /api/v1/session/:id/inferences and infer_status is "complete", THE Session_API SHALL return a JSON object containing company_name, source_summary, inferences array, correctable_fields array, and followup_questions array
2. Each entry in the inferences array SHALL contain inference_id, label, confidence (confident, likely, or probable), and category
3. Each entry in the correctable_fields array SHALL contain key, label, and inferred_value
4. Each entry in the followup_questions array SHALL contain question_id, context, question, and options array
5. WHEN a GET request is received at /api/v1/session/:id/inferences and infer_status is not "complete", THE Session_API SHALL return HTTP 409 with the current infer_status

### Requirement 5: Inference Building

**User Story:** As a system operator, I want raw signals transformed into a structured cold read object, so that the frontend can render inferences, corrections, and follow-up questions.

#### Acceptance Criteria

1. THE Inference_Builder SHALL map each raw signal to a display inference with a human-readable label and the signal's confidence level
2. THE Inference_Builder SHALL always include compliance and infrastructure inferences at "probable" confidence when no direct evidence exists
3. THE Inference_Builder SHALL generate correctable_fields for customer_type, data_sensitivity, and infrastructure signals, using the inferred value as the default
4. THE Inference_Builder SHALL generate follow-up questions only for signal types that were not inferred (identity_model, insurance_status, questionnaire_experience)
5. Each follow-up question SHALL include a "Not sure" option
6. THE Inference_Builder SHALL derive company_name from the website URL hostname when a URL is provided

### Requirement 6: Follow-up Questions Endpoint

**User Story:** As a frontend client, I want a dedicated endpoint for follow-up questions, so that I can fetch them independently if needed.

#### Acceptance Criteria

1. WHEN a GET request is received at /api/v1/session/:id/followup-questions and infer_status is "complete", THE Session_API SHALL return the followup_questions array from the session
2. WHEN a GET request is received at /api/v1/session/:id/followup-questions and infer_status is not "complete", THE Session_API SHALL return HTTP 409
3. WHEN a GET request is received at /api/v1/session/:id/followup-questions for a non-existent session, THE Session_API SHALL return HTTP 404

### Requirement 7: Corrections and Answers Submission

**User Story:** As a founder, I want to submit my corrections to misreads and answers to follow-up questions, so that the system can run an accurate gap analysis.

#### Acceptance Criteria

1. WHEN a POST request is received at /api/v1/session/:id/submit with corrections and answers, THE Session_API SHALL store the corrections and followup_answers on the session, set analysis_status to "processing", and begin gap analysis asynchronously
2. WHEN a POST request is received at /api/v1/session/:id/submit and infer_status is not "complete", THE Session_API SHALL return HTTP 409
3. WHEN a POST request is received at /api/v1/session/:id/submit for a non-existent session, THE Session_API SHALL return HTTP 404
4. THE Session_API SHALL respond with { status: "processing" } within 200ms without waiting for gap analysis to complete

### Requirement 8: Context Merging

**User Story:** As a system operator, I want inferred signals, corrections, and follow-up answers merged into a single context object, so that gap analysis operates on the most accurate data.

#### Acceptance Criteria

1. THE Gap_Mapper SHALL use correction values in preference to inferred values for any field where the founder provided a correction
2. THE Gap_Mapper SHALL normalise follow-up answer strings to internal enum values (e.g. "Passwords only" to "password_only", "Yes" to "active")
3. THE Gap_Mapper SHALL derive compliance_status from the "Pre-SOC 2" inference when no explicit compliance data exists
4. THE Gap_Mapper SHALL include all available context fields when building Trust360 claim evidence strings

### Requirement 9: Gap Analysis

**User Story:** As a founder, I want the system to identify which trust gaps are blocking my enterprise deals, so that I know exactly what to fix.

#### Acceptance Criteria

1. THE Gap_Mapper SHALL evaluate each gap definition's trigger condition against the merged context to identify candidate gaps
2. THE Gap_Mapper SHALL build a Trust360 claim (question + evidence + metadata) for each triggered gap and call POST /trust in parallel
3. WHEN a Trust360 claim returns MOS >= 7, THE Gap_Mapper SHALL confirm the gap
4. IF Trust360 is unavailable for a claim, THEN THE Gap_Mapper SHALL confirm the triggered gap as a fallback with a flag indicating fallback was used
5. THE Gap_Mapper SHALL compute trust_score as max(0, 100 minus the sum of confirmed gap severity weights) where critical=20, high=10, medium=5, low=2
6. THE Gap_Mapper SHALL determine deal_readiness as "ready" when trust_score >= 80, "partial" when trust_score >= 50, and "not_ready" when trust_score < 50
7. Each confirmed gap object SHALL conform to the gap schema defined in brief-strategy.md: gap_id, category, severity (critical, moderate, low), title, why, risk, control, closure_strategies, vendor_implementations, score_impact, confidence, evidence array, and time_estimate

### Requirement 10: Analysis Status Polling

**User Story:** As a frontend client, I want to poll the analysis status so that I can show progress and navigate to the report when analysis is complete.

#### Acceptance Criteria

1. WHEN a GET request is received at /api/v1/session/:id/status for an existing session, THE Session_API SHALL return the current analysis_status value (processing, complete, or failed)
2. WHEN a GET request is received at /api/v1/session/:id/status for a non-existent or expired session, THE Session_API SHALL return HTTP 404
3. WHEN analysis_status is null (submission has not occurred), THE Session_API SHALL return { status: "not_started" }

### Requirement 11: Early Signal Estimation

**User Story:** As a founder, I want to see an estimated trust score as soon as enough signal data is available, so that I get early feedback on my trust posture before the full report.

#### Acceptance Criteria

1. WHEN a GET request is received at /api/v1/session/:id/early-signal and sufficient signal data exists (equivalent to Q4 signal threshold from the old model), THE Session_API SHALL return an estimated trust score and a preliminary deal readiness label
2. WHEN a GET request is received at /api/v1/session/:id/early-signal and insufficient signal data exists, THE Session_API SHALL return HTTP 409 with a message indicating more data is needed
3. WHEN a GET request is received at /api/v1/session/:id/early-signal for a non-existent session, THE Session_API SHALL return HTTP 404

### Requirement 12: Email Capture

**User Story:** As a founder, I want to save my trust report by providing my email, so that I can access the full Layer 2 breakdown.

#### Acceptance Criteria

1. WHEN a POST request is received at /api/v1/session/:id/capture-email with a valid email address, THE Session_API SHALL store the email on the session, set layer2_locked to false, update the signals object email_captured field to true, and log the lead to file
2. WHEN a POST request is received at /api/v1/session/:id/capture-email with an invalid email format, THE Session_API SHALL return HTTP 400
3. WHEN a POST request is received at /api/v1/session/:id/capture-email for a non-existent session, THE Session_API SHALL return HTTP 404
4. THE Session_API SHALL respond with { success: true } on successful email capture

### Requirement 13: Report Generation

**User Story:** As a founder, I want a full trust report with gap details and vendor recommendations, so that I know what is blocking my deals and how to fix each gap.

#### Acceptance Criteria

1. WHEN a GET request is received at /api/v1/session/:id/report and analysis_status is "complete", THE Session_API SHALL return the full report object
2. The report object SHALL contain: session_id, company_name, assessed_at, trust_score, deal_readiness_label, deal_readiness_score, headline, snapshot, gaps array, strengths array, next_steps array, and layer2_locked boolean
3. The headline object SHALL contain ready_count, blocking_count, and summary_line
4. The snapshot object SHALL contain deal_blockers count, fundraising_risk count, and strengths count
5. Each gap in the gaps array SHALL include a vendor_intelligence object conforming to the brief-vendors.md shape when vendor data is available for that gap's category
6. Each next_step SHALL contain step_number, title, score_trajectory (showing current score → projected score with delta), and description
7. WHEN a GET request is received at /api/v1/session/:id/report and analysis_status is not "complete", THE Session_API SHALL return HTTP 409
8. WHEN a GET request is received at /api/v1/session/:id/report for a non-existent session, THE Session_API SHALL return HTTP 404

### Requirement 14: Vendor Intelligence Per Gap

**User Story:** As a founder, I want vendor recommendations contextualised to each specific gap, so that I can see the best path to close each gap with transparent partner disclosure.

#### Acceptance Criteria

1. THE Vendor_Intelligence_Builder SHALL build a vendor_intelligence object for each confirmed gap that has a mapped vendor category
2. Each vendor_intelligence object SHALL contain: category_name, quadrant_axes (x_left, x_right, y_top, y_bottom), vendors array, pick object, and disclosure string
3. Each vendor entry SHALL contain: vendor_id, display_name, initials, x and y quadrant coordinates (0.0-1.0), is_partner, is_pick, deal_label, best_for, summary, and referral_url
4. THE Vendor_Intelligence_Builder SHALL set referral_url to null for non-partner vendors
5. THE Vendor_Intelligence_Builder SHALL select exactly one vendor as is_pick per category, preferring partner vendors with context-appropriate best_for match
6. The pick object SHALL contain: vendor_id, stage_context, recommendation_headline, recommendation_body (first-person narrative), meta (time_to_close, covers, best_for, what_wed_do_differently), cta_label, deal_label, and referral_url
7. THE Vendor_Intelligence_Builder SHALL generate a disclosure string that names all partner vendors in the category and states the referral arrangement transparently

### Requirement 15: Signals Object Persistence

**User Story:** As a platform operator, I want every session to write a complete signals object, so that the dataset moat is built from day one.

#### Acceptance Criteria

1. WHEN gap analysis completes, THE Gap_Mapper SHALL write a complete signals object to the session conforming to the brief-strategy.md schema
2. The signals object SHALL contain: session_id, company_name, website, deck_uploaded, stage, sector, primary_use_case, questions_answered array, gaps array, trust_score, deal_readiness, email_captured, timestamp, and source
3. THE Session_Store SHALL preserve the signals object for the full 24-hour session TTL
4. WHEN email is captured, THE Session_API SHALL update the signals object email_captured field to true

### Requirement 16: Session Expiry

**User Story:** As a system operator, I want sessions to expire after 24 hours, so that memory usage is bounded.

#### Acceptance Criteria

1. THE Session_Store SHALL reject reads for sessions older than 24 hours and remove them from the store
2. WHEN a request references an expired session, THE Session_API SHALL return HTTP 404

### Requirement 17: Server Configuration

**User Story:** As a developer, I want the API server configured with CORS, environment variables, and proper route registration, so that the frontend can communicate with the API.

#### Acceptance Criteria

1. THE Session_API SHALL use Fastify with CORS enabled for all origins
2. THE Session_API SHALL read PORT (default 3001), TRUST360_URL, LOG_LEVEL, and NODE_ENV from environment variables
3. THE Session_API SHALL register all nine endpoints: session/start, infer-status, inferences, followup-questions, submit, status, early-signal, capture-email, and report

### Requirement 18: Gap Definitions Configuration

**User Story:** As a system operator, I want gap definitions with trigger conditions and claim templates, so that the system can map signals to trust gaps.

#### Acceptance Criteria

1. THE Gap_Mapper SHALL use a configurable set of gap definitions, each containing: id, severity, label, category, trigger condition function, and claim template function
2. THE Gap_Mapper SHALL support gap definitions for: soc2 (critical), mfa (critical), cyber_insurance (critical), incident_response (high), vendor_questionnaire (high), edr (high), and sso (medium)
3. Each claim template SHALL build a Trust360-compatible object with question, evidence (incorporating all available context), and metadata containing gapId and severity

### Requirement 19: Vendor Catalog Configuration

**User Story:** As a system operator, I want a vendor catalog with partner data, quadrant positions, and deal details, so that vendor intelligence can be built for each gap.

#### Acceptance Criteria

1. THE Session_API SHALL maintain a vendor catalog containing: vanta, drata, secureframe, okta, cisco_duo, austbrokers, cloudflare, crowdstrike, and palo_alto
2. Each vendor entry SHALL contain: id, display_name, initials, closes (array of gap IDs), cost_range, timeline, is_partner, deal_label, best_for, summary, and referral_url
3. THE Session_API SHALL maintain vendor category definitions with quadrant axes and vendor position coordinates for categories: GRC & compliance automation, Identity & IAM, and additional categories as vendor data expands

### Requirement 20: Framework Mapping Configuration

**User Story:** As a system operator, I want target customer types mapped to applicable compliance frameworks, so that gap analysis can be scoped to relevant frameworks.

#### Acceptance Criteria

1. THE Session_API SHALL maintain a framework mapping from target customer types (banks, enterprise, mid_market, smb, government, pre_revenue) to arrays of applicable framework identifiers
2. THE Gap_Mapper SHALL use the framework mapping to scope gap analysis when target customer type is known from inferences or corrections

### Requirement 21: Build Phase Structure

**User Story:** As a developer, I want the implementation organised into four build phases, so that the system can be built and verified incrementally.

#### Acceptance Criteria

1. Phase 1 (foundation) SHALL deliver: Session_Store, server with CORS, session/start endpoint, infer-status endpoint, inferences endpoint, and scaffolded config files (gaps.js, vendors.js, frameworks.js)
2. Phase 2 (follow-up and submission) SHALL deliver: followup-questions endpoint, submit endpoint, status endpoint, context merging, and gap analysis integration
3. Phase 3 (report) SHALL deliver: Gap_Mapper with full gap data, Vendor_Intelligence_Builder, vendor category quadrant data, and report endpoint with vendor_intelligence per gap
4. Phase 4 (remaining) SHALL deliver: early-signal endpoint and capture-email endpoint
