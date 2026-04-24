# Implementation Plan: overnight-v1

## Overview

GTM-lever overnight build for Proof360. Four user-facing features (shareable cold read URL, admin pre-read batch tool, landing page swap, AWS program match card) plus three architectural primitives (feature flags, confidence surfacing, signal weight skeleton). All changes are additive. Build order follows dependency chain: backend configs → backend handlers → routes → frontend API client → frontend context → frontend components → page modifications.

## Tasks

- [x] 1. Create backend config files (no dependencies)
  - [x] 1.1 Create `api/src/config/features.js`
    - Export `FEATURES` object with three top-level keys: `surfaces`, `layer2_cards`, `cold_read`
    - `surfaces`: founder=true, buyer=false, investor=false, broker=false, aws_seller=false, distributor=false, admin=true
    - `layer2_cards`: program_match=true, risk_heatmap=false, vendor_route=true, quote=false
    - `cold_read`: shareable_url=true, preread_tool=true
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 1.2 Create `api/src/config/aws-programs.js`
    - Export structured catalogue of 15+ AWS funding programs from `docs/aws-funding-program-mapping.md`
    - Each program: program_id, name, benefit, application_url, category, triggers[], confidence_when_matched
    - Categories: startup_credits, partner_programs, customer_funding, sector_accelerators, nonprofit
    - Trigger conditions use ops: eq, in, exists, not_eq against signal fields (stage, sector, infrastructure, geo_market, product_type, has_raised_institutional, abn_entity_type)
    - Include pure `evaluateTrigger(trigger, signals)` function for each op type
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 1.3 Create `api/src/config/signal-weights.js`
    - Export `SIGNAL_WEIGHTS` object with five tiers: critical (1.0), high (0.7), medium (0.4), low (0.2), positive (0.3)
    - List signal identifiers per tier
    - Do NOT import this in gap-mapper.js — skeleton only
    - _Requirements: 15.1, 15.2, 15.3_

  - [x] 1.4 Write property test: AWS programmes catalogue schema validity
    - **Property 8: AWS programmes catalogue schema validity**
    - Validate every program has required fields (program_id, name, benefit, application_url, category, triggers, confidence_when_matched)
    - Validate trigger conditions reference known signal fields
    - Install `fast-check` as dev dependency in api/
    - **Validates: Requirements 9.2, 9.4**

- [x] 2. Checkpoint — Config files complete
  - Ensure all three config files export correctly, ask the user if questions arise.

- [x] 3. Create backend handlers (depend on configs)
  - [x] 3.1 Create `api/src/handlers/features.js`
    - GET handler returning the FEATURES object as JSON
    - No auth required
    - _Requirements: 10.5_

  - [x] 3.2 Modify `api/src/handlers/inferences.js` — add confidence field
    - Add `computeConfidence(session)` pure function using sources_read ratio: >=0.9 → high, >=0.7 → medium, >=0.5 → low, <0.5 → partial, 0 attempted → partial
    - Include confidence object in response: { overall, sources_attempted, sources_succeeded, missing_sources }
    - Write confidence to session via updateSession so report handler can access it
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 3.3 Write property test: Confidence computation from source counts
    - **Property 3: Confidence computation from source counts**
    - For any (sources_attempted, sources_succeeded) pair where succeeded <= attempted, verify threshold mapping
    - **Validates: Requirements 14.2, 14.3, 14.4, 14.5**

  - [x] 3.4 Create `api/src/handlers/program-match.js`
    - GET /api/program-match/:session_id handler
    - Look up session → 404 if not found
    - Return 202 if signals_object is null (assessment incomplete)
    - Evaluate each program in aws-programs.js against session signals using trigger evaluation
    - Return array of eligible programs with: program_id, name, benefit, eligibility_reason, application_url, category, confidence
    - Confidence: high (all triggers match exactly), medium (required match but optional missing), low (partial/inferred)
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 3.5 Write property test: Program match returns only eligible programs
    - **Property 6: Program match returns only eligible programs**
    - For any signals_object and catalogue, every returned program has all triggers satisfied
    - **Validates: Requirements 8.1**

  - [x] 3.6 Write property test: Program match confidence assignment
    - **Property 7: Program match confidence assignment**
    - Verify confidence assignment rules: high/medium/low based on signal completeness
    - **Validates: Requirements 8.4**

  - [x] 3.7 Create `api/src/handlers/admin-preread.js`
    - POST /api/admin/preread: auth via x-admin-key header vs PROOF360_ADMIN_KEY env var
    - 401 on bad key, 400 on >20 URLs, 429 on >2 batches per 60s per key
    - Memory guard: count preread sessions, drop oldest if >=100 before adding new
    - Concurrency cap: max 4 concurrent cold reads via semaphore pattern
    - Generate batch_id (UUID), store batch in module-level Map with 1h TTL
    - Each read creates session with source: "preread", triggers cold read pipeline
    - GET /api/admin/preread/:batch_id: same auth, return batch status with per-read status/shareable_url/confidence
    - 404 on unknown batch_id
    - _Requirements: 4.3, 4.4, 4.5, 4.9, 4.11, 4.12, 4.13, 4.14, 5.1, 5.2, 5.3_

  - [x] 3.8 Write property test: Preread memory guard preserves non-preread sessions
    - **Property 5: Preread memory guard preserves non-preread sessions**
    - For any mix of sessions with varying sources, after guard runs: non-preread sessions untouched, preread count <= 100
    - **Validates: Requirements 4.12, 4.13**

  - [x] 3.9 Modify `api/src/handlers/session-start.js` — accept optional source field
    - Accept optional `source` field in request body (default: "user")
    - Pass source to createSession
    - _Requirements: 1.7, 4.9, 20.1_

  - [x] 3.10 Modify `api/src/services/session-store.js` — add source field to session schema
    - Add `source: 'user'` default to createSession
    - Accept source parameter in createSession function signature
    - Add `confidence: null` field to session schema
    - Additive only — no existing fields removed or renamed
    - _Requirements: 1.7, 4.9, 20.1, 20.2_

- [x] 4. Register new routes in server.js (depends on handlers)
  - [x] 4.1 Modify `api/src/server.js`
    - Import featuresHandler, programMatchHandler, adminPrereadHandler (POST + GET)
    - Register: GET /api/features, GET /api/program-match/:session_id, POST /api/admin/preread, GET /api/admin/preread/:batch_id
    - Place after existing routes, clearly commented as overnight-v1
    - _Requirements: 10.5, 8.1, 4.3, 5.1_

- [x] 5. Checkpoint — Backend complete
  - Ensure all new endpoints respond correctly, existing endpoints unchanged, ask the user if questions arise.

- [x] 6. Frontend API client additions (depends on backend routes)
  - [x] 6.1 Modify `frontend/src/api/client.js`
    - Add optional `extraHeaders` parameter to `request(method, path, body, extraHeaders)` — merge into headers object
    - Existing callers unaffected (4th param is optional)
    - Add exports: getFeatures, getProgramMatch(sessionId), submitPreread(body, adminKey), getPrereadStatus(batchId, adminKey)
    - submitPreread and getPrereadStatus pass { 'x-admin-key': adminKey } as extraHeaders
    - _Requirements: 4.2, 7.2, 11.1, 18.1_

- [x] 7. Frontend feature flag context (depends on API client)
  - [x] 7.1 Create `frontend/src/contexts/FeatureFlagContext.jsx`
    - createContext + Provider that fetches GET /api/features once on mount via useEffect
    - Store in useState, export useFeatureFlags() hook
    - On fetch failure: fall back to safe defaults — surfaces: founder+admin true, layer2_cards: vendor_route true, cold_read: all false
    - No new dependencies — React Context + useState/useEffect only
    - _Requirements: 11.1, 11.2, 11.6, 17.4, 18.2_

  - [x] 7.2 Write property test: Feature flag safe defaults
    - **Property 9: Feature flag safe defaults**
    - Verify SAFE_DEFAULTS constant: surfaces.founder=true, surfaces.admin=true, layer2_cards.vendor_route=true, all overnight-v1 features=false
    - **Validates: Requirements 11.6, 17.4**

- [x] 8. Create frontend components (depend on feature flags)
  - [x] 8.1 Create `frontend/src/components/ConfidenceChip.jsx`
    - Receives `level` prop (high/medium/low)
    - Renders small inline pill: "medium confidence" / "low confidence"
    - Colours: medium=amber, low=orange
    - Returns null for "high" (no chip needed)
    - _Requirements: 13.1, 13.2_

  - [x] 8.2 Write property test: Confidence chip visibility
    - **Property 10: Confidence chip visibility**
    - For any gap confidence and overall confidence, chip visible iff they differ
    - **Validates: Requirements 13.1, 13.2**

  - [x] 8.3 Create `frontend/src/components/report/ConfidenceRibbon.jsx`
    - Receives `confidence` object as prop
    - Renders full-width banner when overall !== "high"
    - Text: medium → "High-confidence read with some gaps", low → "Directional read — additional signals recommended", partial → "Limited data — treat as early signal"
    - Returns null for "high" or missing data
    - Styling: subtle background tint, 13px text, IBM Plex Mono
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 12.1, 12.2, 12.3, 12.4, 12.5, 17.2_

  - [x] 8.4 Write property test: Confidence level mapping
    - **Property 2: Confidence level mapping**
    - For any level in {high, medium, low, partial}, verify correct display string for non-high and null for high
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 12.2, 12.3, 12.4, 12.5**

  - [x] 8.5 Create `frontend/src/components/ProgramMatchCard.jsx`
    - Fetches GET /api/program-match/{session_id} on mount
    - Gated by layer2_cards.program_match feature flag via useFeatureFlags()
    - Loading: skeleton shimmer (CSS animation, no library)
    - Success with programs: heading + card per program (name, benefit, eligibility_reason, confidence chip, "Learn more" CTA)
    - Zero programs or error: render nothing (self-hide)
    - Green/neutral colour palette (#EAF3DE / #3A7A3A), matching GapCard border-radius/padding
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 17.1_

- [x] 9. Checkpoint — Components complete
  - Ensure all new components render correctly in isolation, ask the user if questions arise.

- [x] 10. Modify frontend pages (depend on components)
  - [x] 10.1 Modify `frontend/src/pages/AuditColdRead.jsx`
    - Session-first lookup: if session param → GET inferences, 200 → render existing, 404 → fall back to url param
    - Auto-submit: if only url param → validate URL, valid → auto POST session/start with source "share_link", invalid → show form with url pre-filled
    - No params → standard input form
    - Loading state: "Running cold read for {url}..."
    - Share CTA (gated by cold_read.shareable_url): copy link, email (mailto), LinkedIn share — all construct Shareable_URL with session + url params
    - Confidence ribbon: render ConfidenceRibbon when confidence.overall !== "high"
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_

  - [x] 10.2 Write property test: Shareable URL round-trip
    - **Property 1: Shareable URL round-trip**
    - For any valid session ID and URL, constructing then parsing a shareable URL recovers both exactly
    - **Validates: Requirements 2.2**

  - [x] 10.3 Modify `frontend/src/pages/Home.jsx`
    - Replace hero: heading "See what we see about any company", sub-hero, single URL input, "Run cold read →" CTA
    - On submit: navigate to /audit/cold-read?url={encodedUrl}
    - Remove: stats grid, how-it-works steps, vendor ecosystem section, final CTA repeat
    - Add below fold: persona-hint prose section, hidden when no surfaces.* flags beyond founder+admin are true
    - Preserve: nav bar, footer (add privacy disclaimer), fonts, colours, Proof360Mark
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [x] 10.4 Modify `frontend/src/pages/Report.jsx`
    - Add ConfidenceRibbon below report header when confidence.overall !== "high"
    - Pass confidence data from report response to ConfidenceRibbon
    - Add ProgramMatchCard in Layer 2 after VendorRouteCard stack, before NextSteps
    - Only render ProgramMatchCard when layer2_locked === false and feature flag enabled
    - _Requirements: 7.1, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 10.5 Modify `frontend/src/components/report/GapCard.jsx`
    - Accept `overallConfidence` prop from Report.jsx
    - When gap.confidence !== overallConfidence, render ConfidenceChip
    - When equal, no chip
    - _Requirements: 13.1, 13.2_

  - [x] 10.6 Modify `frontend/src/App.jsx`
    - Import and wrap BrowserRouter children with FeatureFlagProvider
    - Add route: /admin/preread → AdminPreread
    - Import AdminPreread lazily or directly
    - _Requirements: 19.1, 11.1_

- [x] 11. Create AdminPreread page (depends on API client + feature flags)
  - [x] 11.1 Create `frontend/src/pages/AdminPreread.jsx`
    - On load: prompt for admin key (stored in sessionStorage)
    - Gated by cold_read.preread_tool feature flag — redirect to / if false
    - Textarea for URLs (newline/comma separated), "Run batch" button
    - Parse URLs, call submitPreread with admin key
    - Poll getPrereadStatus every 3s until all terminal
    - Status table: URL, status (colour indicator), shareable link (copy button), confidence chip
    - "Download all as markdown" button when all reads terminal
    - _Requirements: 4.1, 4.2, 4.6, 4.7, 4.8, 4.10, 19.1, 19.2_

- [x] 12. Final checkpoint — Full integration
  - Ensure all new features work end-to-end, existing flows (/audit, /report, /portal, /account) are unchanged, all new features fail gracefully when flags are off or endpoints error.
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 17.1, 17.2, 17.3, 17.4, 18.1, 20.1, 20.2, 20.3, 20.4_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests use `fast-check` — install as dev dependency in api/ for backend tests, frontend/ for frontend tests
- All changes are additive — no existing endpoints, components, or auth flows are modified destructively
- The signal-weights.js skeleton is intentionally not wired into gap-mapper.js scoring
- Existing trust score calculation remains: `100 - Σ(severity weights)`
