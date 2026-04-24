# Requirements Document — overnight-v1

## Introduction

GTM-lever overnight build for Proof360. Four user-facing deliverables (shareable cold read URL, admin pre-read tool, landing page swap, AWS program match card) plus three architectural primitives (feature flags, confidence surfacing, signal weight skeleton). Scope is additive only — no framework changes, no new frontend dependencies, no auth refactor, no destructive changes to existing flows.

## Glossary

- **Cold_Read**: The existing Proof360 flow where the system reads a company's public trust signals from a URL and produces a scored gap report without requiring login or questionnaire answers.
- **Session**: An in-memory object keyed by UUID representing one cold read assessment, stored in the Session_Store with 24h TTL.
- **Session_Store**: The in-memory Map (`api/src/services/session-store.js`) holding all active sessions.
- **Signal_Extractor**: The existing service (`api/src/services/signal-extractor.js`) that scrapes a URL via Firecrawl and extracts structured signals via Codex.
- **Cold_Read_Handler**: The existing handler chain that processes `POST /api/v1/session/start` through to inference completion.
- **Report_Page**: The existing React page at `/report/:sessionId` (`frontend/src/pages/Report.jsx`) rendering Layer 1 and Layer 2 of the trust report.
- **GapCard**: The existing React component (`frontend/src/components/report/GapCard.jsx`) rendering individual trust gaps in the report.
- **Layer_2**: The section of the report unlocked after email capture, containing vendor intelligence and (now) program match data.
- **Feature_Flag_Config**: A static JS module (`api/src/config/features.js`) exporting a FEATURES object that gates UI surfaces.
- **Feature_Flag_Context**: A React Context provider that fetches feature flags once on app mount and makes them available to all components.
- **Admin_Key**: An environment-based shared secret (`PROOF360_ADMIN_KEY`) used to gate admin-only endpoints via the `x-admin-key` request header.
- **AWS_Programs_Catalogue**: A structured JS module (`api/src/config/aws-programs.js`) containing AWS funding program definitions with trigger conditions.
- **Program_Match_Endpoint**: `GET /api/program-match/:session_id` — evaluates session signals against the AWS_Programs_Catalogue and returns eligible programs.
- **Preread_Endpoint**: `POST /api/admin/preread` — accepts a batch of URLs, triggers cold reads, returns session IDs.
- **Preread_Status_Endpoint**: `GET /api/admin/preread/:batch_id` — returns completion status of all reads in a batch.
- **Features_Endpoint**: `GET /api/features` — returns the Feature_Flag_Config object.
- **Confidence_Object**: A structured object with fields `overall`, `sources_attempted`, `sources_succeeded`, `missing_sources` describing the reliability of a cold read.
- **Signal_Weights_Skeleton**: A static JS module (`api/src/config/signal-weights.js`) defining tier-based signal weights, not wired into scoring.
- **AuditColdRead_Page**: The existing React page at `/audit/cold-read` (`frontend/src/pages/AuditColdRead.jsx`).
- **AdminPreread_Page**: A new React page at `/admin/preread` (`frontend/src/pages/AdminPreread.jsx`).
- **Home_Page**: The existing React page at `/` (`frontend/src/pages/Home.jsx`).
- **ProgramMatchCard**: A new React component (`frontend/src/components/ProgramMatchCard.jsx`) rendering AWS program eligibility in the report.
- **Confidence_Ribbon**: A banner displayed at the top of the Report_Page when confidence is not high.
- **Confidence_Chip**: A small inline indicator on a GapCard showing per-gap confidence level.
- **Shareable_URL**: A URL of the form `/audit/cold-read?session=<session_id>&url=<encoded_url>` that loads an existing cold read result by session ID, falling back to a fresh cold read via the URL if the session has expired or is missing.

## Requirements

### Requirement 1: Shareable Cold Read URL — Auto-Submit

**User Story:** As a user who receives a shared cold read link, I want the cold read to start automatically when I open the link, so that I see results without manually entering a URL.

#### Acceptance Criteria

1. WHEN the AuditColdRead_Page mounts with both a `session` and a `url` query parameter, THE AuditColdRead_Page SHALL first attempt to load the existing session by ID from the Session_Store.
2. WHEN the session exists in the Session_Store, THE AuditColdRead_Page SHALL render the existing cold read result without running a new assessment.
3. WHEN the session does not exist or has expired, THE AuditColdRead_Page SHALL fall back to running a fresh cold read using the `url` parameter.
4. WHEN the AuditColdRead_Page mounts with only a `url` query parameter (no `session`), THE AuditColdRead_Page SHALL auto-submit the cold read by calling `POST /api/v1/session/start` with the URL value without displaying the input form.
5. WHEN the AuditColdRead_Page mounts with a `url` query parameter containing an invalid URL (not parseable as a URL), THE AuditColdRead_Page SHALL display the standard input form with the invalid value pre-filled.
6. WHEN the AuditColdRead_Page mounts without a `url` query parameter, THE AuditColdRead_Page SHALL display the standard input form.
7. WHEN a cold read is initiated via the `url` query parameter, THE Cold_Read_Handler SHALL record the session source as `"share_link"` in the Session_Store.
8. WHEN the AuditColdRead_Page auto-submits a cold read via the `url` query parameter, THE AuditColdRead_Page SHALL immediately display a loading state with text "Running cold read for <url>..." before the API response returns.

### Requirement 2: Shareable Cold Read URL — Share CTA

**User Story:** As a user who has completed a cold read, I want to share the result link with others, so that they can see the same cold read for the company.

#### Acceptance Criteria

1. WHEN a cold read completes on the AuditColdRead_Page, THE AuditColdRead_Page SHALL display a share CTA section with three options: copy link, email (mailto), and LinkedIn share.
2. WHEN the user activates the copy link action, THE AuditColdRead_Page SHALL copy the Shareable_URL (formatted as `/audit/cold-read?session=<session_id>&url=<encoded_original_url>`) to the system clipboard.
3. WHEN the user activates the email share action, THE AuditColdRead_Page SHALL open a `mailto:` link with a pre-filled subject and body containing the Shareable_URL including both session and url parameters.
4. WHEN the user activates the LinkedIn share action, THE AuditColdRead_Page SHALL open the LinkedIn share URL with the Shareable_URL including both session and url parameters as the shared content.
5. WHILE the Feature_Flag_Config field `cold_read.shareable_url` is set to `false`, THE AuditColdRead_Page SHALL hide the share CTA section.

### Requirement 3: Cold Read Confidence Ribbon on Result

**User Story:** As a user viewing a cold read result, I want to see an honest indication of read quality, so that I understand how much to trust the results.

#### Acceptance Criteria

1. WHEN the cold read result has a Confidence_Object with `overall` equal to `"medium"`, THE AuditColdRead_Page SHALL display a ribbon at the top of the result with the text "High-confidence read with some gaps".
2. WHEN the cold read result has a Confidence_Object with `overall` equal to `"low"`, THE AuditColdRead_Page SHALL display a ribbon at the top of the result with the text "Directional read — additional signals recommended".
3. WHEN the cold read result has a Confidence_Object with `overall` equal to `"partial"`, THE AuditColdRead_Page SHALL display a ribbon at the top of the result with the text "Limited data — treat as early signal".
4. WHEN the cold read result has a Confidence_Object with `overall` equal to `"high"`, THE AuditColdRead_Page SHALL not display a confidence ribbon.

### Requirement 4: Admin Pre-Read — Batch Cold Read Tool

**User Story:** As an admin preparing for a partner meeting, I want to batch-submit a list of company URLs and receive shareable cold read links for each, so that I can walk into the meeting with every target already read.

#### Acceptance Criteria

1. THE AdminPreread_Page SHALL render a textarea accepting a list of URLs separated by newlines or commas.
2. THE AdminPreread_Page SHALL render a "Run batch" button that sends the parsed URL list to the Preread_Endpoint.
3. WHEN the Preread_Endpoint receives a valid request with the correct `x-admin-key` header matching the `PROOF360_ADMIN_KEY` environment variable, THE Preread_Endpoint SHALL trigger the existing cold read pipeline for each URL and return a `batch_id` with an array of `{ url, session_id, status: "queued" }` objects.
4. WHEN the Preread_Endpoint receives a request with a missing or incorrect `x-admin-key` header, THE Preread_Endpoint SHALL return HTTP 401 with `{ "error": "unauthorized" }`.
5. WHEN the Preread_Endpoint receives a request with more than 20 URLs, THE Preread_Endpoint SHALL return HTTP 400 with `{ "error": "max_20_urls_per_batch" }`.
6. WHEN a batch is submitted, THE AdminPreread_Page SHALL poll the Preread_Status_Endpoint every 3 seconds until all reads report a terminal status of `"complete"` or `"failed"`.
7. THE AdminPreread_Page SHALL display a status table with columns: URL, status, shareable link (with copy button), and confidence chip.
8. WHEN all reads in a batch reach a terminal status, THE AdminPreread_Page SHALL offer a "Download all as markdown" button that generates a `.md` file containing URL, session ID, shareable link, and confidence per read.
9. WHEN a cold read is initiated via the Preread_Endpoint, THE Cold_Read_Handler SHALL record the session source as `"preread"` in the Session_Store.
10. WHILE the Feature_Flag_Config field `cold_read.preread_tool` is set to `false`, THE AdminPreread_Page route SHALL not render (redirect to `/`).
11. WHEN the Preread_Endpoint processes a batch, THE Preread_Endpoint SHALL execute cold reads with a maximum parallelism of 4 concurrent reads, queuing the remainder until capacity frees.
12. WHEN the total number of preread-sourced sessions in the Session_Store exceeds 100, THE Preread_Endpoint SHALL drop the oldest preread-sourced sessions to bring the count to 99 before adding new sessions.
13. THE session-drop behaviour SHALL only affect sessions with source `"preread"`. Sessions with source `"user"`, `"share_link"`, or other sources SHALL NOT be dropped by this guard.
14. WHEN the Preread_Endpoint receives more than 2 batch submissions within a rolling 60-second window from the same admin key, THE Preread_Endpoint SHALL return HTTP 429 with `{ "error": "rate_limit", "retry_after_seconds": <N> }`.

### Requirement 5: Admin Pre-Read — Batch Status Endpoint

**User Story:** As the AdminPreread_Page, I need to poll batch completion status, so that I can update the UI as individual reads finish.

#### Acceptance Criteria

1. WHEN the Preread_Status_Endpoint receives a valid `batch_id` with the correct `x-admin-key` header, THE Preread_Status_Endpoint SHALL return the status of all reads in the batch, each with fields: `url`, `session_id`, `status` (`"complete"` | `"running"` | `"failed"`), `shareable_url`, and `confidence`.
2. WHEN the Preread_Status_Endpoint receives an unknown `batch_id`, THE Preread_Status_Endpoint SHALL return HTTP 404 with `{ "error": "batch_not_found" }`.
3. WHEN the Preread_Status_Endpoint receives a request with a missing or incorrect `x-admin-key` header, THE Preread_Status_Endpoint SHALL return HTTP 401 with `{ "error": "unauthorized" }`.

### Requirement 6: Landing Page Swap

**User Story:** As a visitor landing on proof360.au, I want to see a single URL input and clear value proposition immediately, so that I can run a cold read without scrolling or reading marketing copy.

#### Acceptance Criteria

1. THE Home_Page SHALL render a hero section containing a single URL input field, a heading reading "See what we see about any company" (or approved copy), and a primary CTA button.
2. THE Home_Page SHALL render a sub-hero line naming the substrate (e.g. "Public-source trust posture analysis. 60 seconds. No login.").
3. THE Home_Page SHALL render the cold read CTA as the primary action button in the hero section.
4. THE Home_Page SHALL render one persona-hint section below the fold as prose (not a bulleted list) referencing additional use cases.
5. THE Home_Page SHALL render a footer containing a privacy and disclaimer line stating "Analysis based on public sources. Not legal or financial advice."
6. THE Home_Page SHALL remove existing marketing sections (stats grid, how-it-works steps, vendor ecosystem, final CTA repeat) that appear above or around the cold read CTA.
7. THE Home_Page SHALL preserve the existing warm editorial tone and design tokens (fonts, colours, nav structure).
8. WHILE the Feature_Flag_Config has no `surfaces.*` flag set to `true` beyond `founder` and `admin`, THE Home_Page SHALL hide the persona-hint section.


### Requirement 7: ProgramMatchCard — AWS Program Eligibility in Report

**User Story:** As a founder viewing my trust report, I want to see which AWS funding programs I may qualify for, so that I can pursue funded paths to close my trust gaps.

#### Acceptance Criteria

1. THE ProgramMatchCard SHALL be placed in Layer_2 of the Report_Page after the VendorRouteCard stack (final Layer 2 order: GapCard stack → VendorRouteCard stack → ProgramMatchCard).
2. WHEN the ProgramMatchCard mounts, THE ProgramMatchCard SHALL call the Program_Match_Endpoint with the current session ID.
3. WHEN the Program_Match_Endpoint returns one or more eligible programs, THE ProgramMatchCard SHALL render a heading "AWS funding programs you may qualify for" followed by a card for each program containing: program name and benefit, eligibility reason, confidence chip, and a "Learn more" CTA linking to the program application URL.
4. WHEN the Program_Match_Endpoint returns zero eligible programs, THE ProgramMatchCard SHALL render nothing (self-hide).
5. WHILE the Program_Match_Endpoint response is loading, THE ProgramMatchCard SHALL display a skeleton shimmer placeholder.
6. IF the Program_Match_Endpoint returns an error or is unreachable, THEN THE ProgramMatchCard SHALL silently self-hide without displaying an error to the user.
7. THE ProgramMatchCard SHALL use a positive-signal colour palette (green/neutral tones) and match the card shape of the existing GapCard component.
8. WHILE the Feature_Flag_Config field `layer2_cards.program_match` is set to `false`, THE ProgramMatchCard SHALL not render.

### Requirement 8: Program Match Backend Endpoint

**User Story:** As the ProgramMatchCard component, I need a backend endpoint that evaluates session signals against the AWS program catalogue, so that I can display eligible programs.

#### Acceptance Criteria

1. WHEN the Program_Match_Endpoint receives a valid `session_id` for a session with a populated `signals_object`, THE Program_Match_Endpoint SHALL evaluate each program in the AWS_Programs_Catalogue against the session signals and return an array of eligible programs with fields: `program_id`, `name`, `benefit`, `eligibility_reason`, `application_url`, `category`, and `confidence`.
2. WHEN the Program_Match_Endpoint receives a `session_id` that does not exist in the Session_Store, THE Program_Match_Endpoint SHALL return HTTP 404 with `{ "error": "session_not_found" }`.
3. WHEN the Program_Match_Endpoint receives a `session_id` for a session whose `signals_object` is not yet populated, THE Program_Match_Endpoint SHALL return HTTP 202 with `{ "status": "assessment_incomplete", "message": "Assessment still running" }`.
4. THE Program_Match_Endpoint SHALL assign confidence `"high"` when all required trigger signals are present and match, `"medium"` when partial signal match requires inference, and `"low"` when the match is weak.

### Requirement 9: AWS Programs Catalogue

**User Story:** As the Program_Match_Endpoint, I need a structured catalogue of AWS funding programs with trigger conditions, so that I can evaluate session signals against program eligibility.

#### Acceptance Criteria

1. THE AWS_Programs_Catalogue SHALL contain a minimum of 15 AWS funding programs derived from the program inventory in `docs/aws-funding-program-mapping.md`.
2. THE AWS_Programs_Catalogue SHALL define each program with fields: `program_id`, `name`, `benefit`, `application_url`, `category`, `triggers` (array of condition objects), and `confidence_when_matched`.
3. THE AWS_Programs_Catalogue SHALL include programs from at least four categories: startup credits, partner programs, customer funding, and sector/vertical accelerators.
4. THE AWS_Programs_Catalogue trigger conditions SHALL reference signal fields that the Signal_Extractor already produces or that exist in the session `signals_object` (e.g. `stage`, `sector`, `infrastructure`, `geo_market`, `product_type`, `has_raised_institutional`, `abn_entity_type`).

### Requirement 10: Feature Flag Config

**User Story:** As an operator, I want a simple feature flag configuration that gates new surfaces, so that I can enable or disable features by editing a single file.

#### Acceptance Criteria

1. THE Feature_Flag_Config SHALL export a `FEATURES` object with three top-level keys: `surfaces` (object of persona flags), `layer2_cards` (object of card flags), and `cold_read` (object of cold read feature flags).
2. THE Feature_Flag_Config `surfaces` object SHALL contain boolean flags for: `founder`, `buyer`, `investor`, `broker`, `aws_seller`, `distributor`, `admin`.
3. THE Feature_Flag_Config `layer2_cards` object SHALL contain boolean flags for: `program_match`, `risk_heatmap`, `vendor_route`, `quote`.
4. THE Feature_Flag_Config `cold_read` object SHALL contain boolean flags for: `shareable_url`, `preread_tool`.
5. THE Features_Endpoint SHALL return the FEATURES object as JSON when called via `GET /api/features`.

### Requirement 11: Feature Flag Frontend Integration

**User Story:** As the frontend application, I need to read feature flags once on mount and gate new surfaces accordingly, so that disabled features are invisible to users.

#### Acceptance Criteria

1. WHEN the application mounts, THE Feature_Flag_Context SHALL fetch the FEATURES object from the Features_Endpoint once and cache the result in React Context.
2. THE Feature_Flag_Context SHALL make the FEATURES object available to all child components via a React Context hook.
3. WHILE the Feature_Flag_Config field `layer2_cards.program_match` is `false`, THE Report_Page SHALL not render the ProgramMatchCard.
4. WHILE the Feature_Flag_Config field `cold_read.shareable_url` is `false`, THE AuditColdRead_Page SHALL not render the share CTA.
5. WHILE the Feature_Flag_Config field `cold_read.preread_tool` is `false`, THE AdminPreread_Page route SHALL not render.
6. IF the Features_Endpoint is unreachable, THEN THE Feature_Flag_Context SHALL fall back to a safe default configuration where existing features (pre-overnight-v1) remain enabled as they require no flag gating, and new features (`layer2_cards.program_match`, `cold_read.shareable_url`, `cold_read.preread_tool`, all non-founder/non-admin surfaces) default to `false`. THE fallback SHALL preserve full existing application functionality while silently disabling new features.

### Requirement 12: Report Confidence Surfacing — Whole-Report Ribbon

**User Story:** As a founder viewing my trust report, I want to see an honest confidence indicator when the read quality is not high, so that I understand the reliability of the assessment.

#### Acceptance Criteria

1. WHEN the report data includes a Confidence_Object with `overall` not equal to `"high"`, THE Report_Page SHALL display a Confidence_Ribbon at the top of the report below the header.
2. WHEN the Confidence_Object `overall` is `"medium"`, THE Confidence_Ribbon SHALL display the text "High-confidence read with some gaps".
3. WHEN the Confidence_Object `overall` is `"low"`, THE Confidence_Ribbon SHALL display the text "Directional read — additional signals recommended".
4. WHEN the Confidence_Object `overall` is `"partial"`, THE Confidence_Ribbon SHALL display the text "Limited data — treat as early signal".
5. WHEN the Confidence_Object `overall` is `"high"`, THE Report_Page SHALL not display a Confidence_Ribbon.

### Requirement 13: Report Confidence Surfacing — Per-Gap Chip

**User Story:** As a founder viewing individual trust gaps, I want to see when a specific gap's confidence differs from the overall report confidence, so that I can weigh each finding appropriately.

#### Acceptance Criteria

1. WHEN a gap's confidence value differs from the Confidence_Object `overall` value, THE GapCard SHALL display a Confidence_Chip indicating the gap-specific confidence level.
2. WHEN a gap's confidence value equals the Confidence_Object `overall` value, THE GapCard SHALL not display a Confidence_Chip (to avoid noise).

### Requirement 14: Cold Read Handler — Confidence Field

**User Story:** As the frontend, I need the cold read response to include a confidence object, so that I can render confidence ribbons and chips.

#### Acceptance Criteria

1. THE Cold_Read_Handler SHALL include a `confidence` field in the cold read response containing: `overall` (one of `"high"`, `"medium"`, `"low"`, `"partial"`), `sources_attempted` (integer), `sources_succeeded` (integer), and `missing_sources` (array of source identifier strings).
2. WHEN 90% or more of attempted sources succeed and all required fields are populated, THE Cold_Read_Handler SHALL set `overall` to `"high"`.
3. WHEN 70% to 89% of attempted sources succeed, THE Cold_Read_Handler SHALL set `overall` to `"medium"`.
4. WHEN 50% to 69% of attempted sources succeed, THE Cold_Read_Handler SHALL set `overall` to `"low"`.
5. WHEN fewer than 50% of attempted sources succeed, THE Cold_Read_Handler SHALL set `overall` to `"partial"`.

### Requirement 15: Signal Weighting Table Skeleton

**User Story:** As a developer preparing for future signal credibility work, I want a skeleton signal weights file with tier-based static weights, so that the structure is ready when scoring integration ships.

#### Acceptance Criteria

1. THE Signal_Weights_Skeleton SHALL export a `SIGNAL_WEIGHTS` object with five tiers: `critical` (weight 1.0), `high` (weight 0.7), `medium` (weight 0.4), `low` (weight 0.2), and `positive` (weight 0.3).
2. THE Signal_Weights_Skeleton SHALL list signal identifiers per tier.
3. THE Signal_Weights_Skeleton SHALL not be wired into the existing trust score calculation — the existing scoring in `gap-mapper.js` SHALL remain unchanged.

### Requirement 16: Non-Regression — Existing Flows Preserved

**User Story:** As an existing user, I want all current flows to continue working unchanged after this build, so that the overnight changes cause zero regressions.

#### Acceptance Criteria

1. THE existing `/audit` flow (artefact input → reading → cold read → processing) SHALL continue to function without changes to user-visible behaviour.
2. THE existing `/report/:sessionId` page SHALL continue to render Layer 1 and Layer 2 content without errors.
3. THE existing `/portal` and `/portal/dashboard` flows SHALL continue to function without changes.
4. THE existing `/account/login` and `/account` flows SHALL continue to function without changes.
5. THE existing FounderAuth and Portal auth flows SHALL not be modified.

### Requirement 17: Graceful Failure

**User Story:** As a user, I want all new features to fail silently and gracefully, so that errors in new functionality never break the existing experience.

#### Acceptance Criteria

1. IF the ProgramMatchCard encounters an API error or network failure, THEN THE ProgramMatchCard SHALL self-hide without displaying an error message.
2. IF the Confidence_Ribbon encounters missing or malformed confidence data, THEN THE Report_Page SHALL render without the ribbon rather than breaking.
3. IF an individual read in a pre-read batch fails, THEN THE AdminPreread_Page SHALL report the failure for that specific URL while continuing to display results for successful reads.
4. IF the Features_Endpoint is unreachable, THEN THE Feature_Flag_Context SHALL fall back to the safe default configuration (existing features enabled, new overnight-v1 features disabled) and the application SHALL continue to function with existing features only.

### Requirement 18: No New Frontend Dependencies

**User Story:** As the development team, we need to ship this build without adding frontend dependencies, so that the bundle stays stable and the build is fast.

#### Acceptance Criteria

1. THE frontend `package.json` SHALL not add any new dependencies (no shadcn/ui, no tanstack-query, no zustand, no other new packages).
2. THE Feature_Flag_Context SHALL be implemented using React Context and `useState`/`useEffect` hooks only.

### Requirement 19: Admin Pre-Read Route Registration

**User Story:** As the application router, I need the admin pre-read page registered as a route, so that navigating to `/admin/preread` renders the correct page.

#### Acceptance Criteria

1. THE application router in `App.jsx` SHALL register a route at `/admin/preread` rendering the AdminPreread_Page component.
2. WHEN the AdminPreread_Page loads, THE AdminPreread_Page SHALL prompt for the admin key before displaying the batch input interface.

### Requirement 20: Additive-Only Changes

**User Story:** As the codebase owner, I want all overnight changes to be additive, so that no existing code is removed or destructively modified.

#### Acceptance Criteria

1. THE overnight build SHALL not remove any existing API endpoints or handlers.
2. THE overnight build SHALL not remove any existing React components or pages (modifications to Home_Page and AuditColdRead_Page are permitted as they add functionality).
3. THE overnight build SHALL not modify the existing auth architecture (FounderAuth, Portal, Auth0 flows, localStorage keys).
4. THE overnight build SHALL not modify the existing trust score calculation in `gap-mapper.js`.
