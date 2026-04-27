# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - v3 Session Lifecycle Structural Blockers
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the 8 structural blockers exist
  - **Scoped PBT Approach**: Scope properties to concrete failing cases for each blocker
  - Test 1: Gap Persistence — create a session, run `analyzeAsync`, query `SELECT * FROM gaps WHERE session_id = $1` — assert rows > 0 (will FAIL: submit.js never writes gaps)
  - Test 2: Read Handler Canonical Source — create a session, complete analysis, delete from in-memory Map, call report handler — assert valid response (will FAIL: handler reads in-memory first, returns 404)
  - Test 3: Tier 1 Field Leak — call `recompute()` for a non-tier2 session, assert response gaps contain ONLY `{ id, description, confidence, evidence_summary }` (will FAIL: response leaks `severity`, `framework_impact`, `remediation`, `veritas_class`, `veritas_confidence`, `render_caveat`)
  - Test 4: Signal List Missing — call `recompute()`, assert `derived_state.signals` is a non-empty array (will FAIL: signals is undefined)
  - Test 5: Fallback Confirm All — mock Trust360 as unavailable, call `evaluateClaims()`, assert result is `{ confirmed: false, unavailable: true }` (will FAIL: returns `{ confirmed: true, mos: 8, fallback: true }`)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — proves the bugs exist)
  - Document counterexamples found to understand root cause
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Unchanged Behaviors for Non-Remediation Paths
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs, then write property-based tests capturing observed patterns
  - Test 1: Recompute Determinism — generate random signal arrays + recon_outputs via fast-check, verify `recompute(input)` produces identical output across 100 calls for the same input (observe on unfixed code first)
  - Test 2: Override Stack Invariant — generate random sequences of overrides from different actors, verify `current_value` always equals the latest human override's value (observe on unfixed code first)
  - Test 3: Engagement Routing — generate random `vendor_id` + branch combinations, verify routing produces correct `engagements`, `engagement_events`, `attribution_ledger` rows for all three branches (john, distributor, vendor)
  - Test 4: Demo Report Stability — verify `/report/demo` renders from `demo-report.js` without API, returns identical content
  - Test 5: Existing Property Tests — run `aws-programs.property.test.js`, `confidence.property.test.js`, `preread-guard.property.test.js`, `program-match.property.test.js` — all must pass unchanged
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [x] 3. Phase A — Persistence Correctness

  - [x] 3.1 Add `writeGapsToPostgres()` to `api/src/handlers/submit.js`
    - Implement `writeGapsToPostgres(sessionId, gaps)` that INSERTs each triggered gap into the `gaps` table with `ON CONFLICT (session_id, gap_def_id) DO UPDATE`
    - Call `writeGapsToPostgres(sessionId, result.gaps)` inside `analyzeAsync()` after `writeSignalsToPostgres()` and `writeReconOutputsToPostgres()`
    - _Bug_Condition: isBugCondition(input) where input.handler == 'submit' AND NOT gapsPersistedToPostgres(input)_
    - _Expected_Behavior: After submit, `SELECT * FROM gaps WHERE session_id = $1 AND triggered = true` returns rows matching all triggered gaps_
    - _Preservation: Dual-write pattern preserved — in-memory Map + Postgres in parallel (Requirement 3.1)_
    - _Requirements: 1.1, 2.1_

  - [x] 3.2 Expand `SIGNAL_FIELDS` in `api/src/handlers/submit.js`
    - Add all fields from context-normalizer output: `customer_type`, `data_sensitivity`, `geo_market`, `handles_payments`, `infrastructure`, `compliance_status`, `identity_model`, `insurance_status`, `use_case`
    - Currently only includes `['company_name', 'website', 'stage', 'sector', 'primary_use_case']`
    - _Requirements: 2.1_

  - [x] 3.3 Add unique constraint to `gaps` table in `api/db/migrations/001_v3_schema.sql`
    - Add `UNIQUE (session_id, gap_def_id)` constraint to support `ON CONFLICT` upserts
    - _Requirements: 2.1_

  - [x] 3.4 Fix conflict resolution in `api/src/services/signal-store.js`
    - In `resolveConflict()`, before resolving, query the most recent `signal_events` rows for this signal to find both competing values
    - Store both prior values in the `reason` field as structured JSON: `{ resolved_from: { actor1: value1, actor2: value2 }, chosen: chosen_value, reason: user_reason }`
    - Preserves both prior values for audit replay without schema changes
    - _Bug_Condition: isBugCondition(input) where input.handler == 'resolve-conflict' AND NOT preservesBothPriorValues(input)_
    - _Expected_Behavior: signal_events row contains both competing values in structured reason field_
    - _Requirements: 1.5, 2.5_

  - [x] 3.5 Add auth-aware `resolveActor()` in `api/src/handlers/override.js`
    - Replace the TODO stub that trusts `bodyActor` with auth-context-aware resolution
    - If `request.user` exists: partner → `partner:<tenant_id>`, MCP → `mcp:<agent_id>`, else → `founder`
    - Fallback to body actor with `console.warn` log when no auth context (pre-Auth0 only)
    - _Bug_Condition: isBugCondition(input) where input.handler == 'override' AND trustsActorFromRequestBody(input)_
    - _Expected_Behavior: actor resolved from auth context, body actor used only as logged fallback_
    - _Requirements: 1.5, 2.5_

  - [x] 3.6 Phase A Checkpoint
    - Verify `writeGapsToPostgres` inserts rows after submit
    - Verify conflict resolution preserves both prior values
    - Verify `resolveActor` logs warning on body-actor fallback
    - Ensure existing property tests still pass
    - _Requirements: 2.1, 2.5_

- [x] 4. Phase B — Postgres Read Switch

  - [x] 4.1 Rewrite `api/src/handlers/report.js` to read from Postgres canonically
    - Query `sessions`, `signals`, `gaps`, `recon_outputs` tables directly
    - Call `recompute()` with Postgres data and return `derived_state`
    - Remove legacy functions: `buildStrengths()`, `buildNextSteps()`, `buildSignals()`, `buildReconSummary()`, `buildAwsActivate()`, `readinessLabel()`
    - Remove imports: `getSession` from session-store, `buildVendorIntelligence` from vendor-intelligence-builder, `extractReconContext` from recon-pipeline
    - Add imports: `loadSignals` from signal-store, `recompute` from recompute service
    - _Bug_Condition: isBugCondition(input) where input.handler == 'report' AND readsFromInMemoryAsCanonical(input)_
    - _Expected_Behavior: Report handler returns valid data for Postgres-only sessions (in-memory expired)_
    - _Preservation: Demo report path `/report/demo` unchanged (Requirement 3.8)_
    - _Requirements: 1.2, 2.2_

  - [x] 4.2 Rewrite `api/src/handlers/inferences.js` to read from Postgres canonically
    - Use transitional approach (Option B from design): if in-memory session exists and `infer_status` is `processing`, use in-memory; once `infer_status` is `complete`, read from Postgres
    - Remove `getSessionWithFallback()` function that merges `_pg_signals`, `_pg_gaps`, `_pg_recon_outputs` onto in-memory session
    - _Bug_Condition: isBugCondition(input) where input.handler == 'inferences' AND readsFromInMemoryAsCanonical(input)_
    - _Expected_Behavior: Completed sessions read from Postgres; active pipelines use in-memory_
    - _Requirements: 1.2, 2.2_

  - [x] 4.3 Rewrite `api/src/handlers/early-signal.js` to read from Postgres with in-memory fallback
    - Same transitional pattern as inferences: active pipelines use in-memory, completed sessions read from Postgres
    - _Requirements: 1.2, 2.2_

  - [x] 4.4 Rewrite `api/src/handlers/admin-preread.js` to read from Postgres canonically
    - Batch preread queries read from Postgres `sessions` and `signals` tables directly
    - _Requirements: 1.2, 2.2_

  - [x] 4.5 Rewrite `api/src/handlers/program-match.js` to read from Postgres
    - Read signals from Postgres `signals` table instead of in-memory `session.signals_object`
    - Build signals map from Postgres rows: `{ [field]: current_value }`
    - Eliminates `signals_object`/`signals` key collision
    - _Requirements: 1.2, 2.2_

  - [x] 4.6 Update `api/src/services/session-store.js` documentation
    - Add module-level comment: write-through cache, Postgres canonical for completed sessions, in-memory for active pipeline state only
    - Deprecate `getSessionWithDbFallback()` which implies in-memory is primary
    - _Preservation: `getSession()` remains for active pipeline reads (Requirement 3.1)_
    - _Requirements: 2.2_

  - [x] 4.7 Phase B Checkpoint
    - Verify report handler returns valid data for Postgres-only sessions
    - Verify inferences handler reads from Postgres for completed sessions
    - Verify all read handlers query Postgres as canonical source
    - Ensure existing property tests still pass
    - _Requirements: 2.2_

- [x] 5. Phase C — Recompute as Canonical Output

  - [x] 5.1 Strip Tier 1 gaps to exact locked shape in `api/src/services/recompute.js`
    - Replace `tier1Gaps` mapping to return ONLY `{ id, description, confidence, evidence_summary }` per gap
    - Remove leaked fields: `severity`, `framework_impact`, `remediation`, `veritas_class`, `veritas_confidence`, `render_caveat`
    - _Bug_Condition: isBugCondition(input) where input.handler == 'recompute' AND tier1LeaksRestrictedFields(input)_
    - _Expected_Behavior: Tier 1 response contains ONLY `{ gaps: [{ id, description, confidence, evidence_summary }], density, directional_hints, signals }`_
    - _Requirements: 1.6, 2.6_

  - [x] 5.2 Add render-safe signal list to `derived_state` in `api/src/services/recompute.js`
    - Build signal list from input signals: `{ field, current_value, inferred_value, status, current_actor }`
    - Include `signals: signalList` in both Tier 1 and Tier 2 `derived_state` responses
    - Signal list is NOT Tier-2-gated — founders need to see and correct signals before publishing
    - _Bug_Condition: isBugCondition(input) where input.handler == 'recompute' AND NOT returnsSignalListForOverrideUI(input)_
    - _Expected_Behavior: `derived_state.signals` is an array with `{ field, current_value, inferred_value, status }` entries_
    - _Requirements: 1.7, 2.7_

  - [x] 5.3 Fix density to use confidence-based counts in `api/src/services/recompute.js`
    - Update `computeDensity()` to count by `confidence` field (high, medium, low) instead of `severity` field (critical, high, medium, low)
    - Align with convergence lock §7 density shape
    - _Requirements: 2.6_

  - [x] 5.4 Phase C Checkpoint
    - Verify Tier 1 recompute output contains no leaked fields
    - Verify `derived_state.signals` is populated with correct shape
    - Verify density uses confidence-based counts
    - Verify Tier 2 full shape still returned for `tier2_published` sessions (Requirement 3.3)
    - Ensure existing property tests still pass
    - _Requirements: 2.6, 2.7_

- [x] 6. Phase D — VERITAS Publish

  - [x] 6.1 Add zero-gap guard to `api/src/handlers/publish.js`
    - If `allGaps.length === 0`, return `409 { error: 'no_gaps_to_attest', message: 'No triggered gaps found for this session. Submit corrections first.' }`
    - Safety net after Phase A gap persistence — prevents silent publish-with-no-attestation
    - _Bug_Condition: isBugCondition(input) where publish finds zero gap rows because gaps were never persisted_
    - _Expected_Behavior: Publish returns clear error when no gaps exist, succeeds when gaps are persisted_
    - _Preservation: VERITAS attestation success path unchanged — at least one attested gap → `tier2_published` (Requirement 3.5)_
    - _Requirements: 2.1, 2.4_

  - [x] 6.2 Remove fallback-confirm-all from `api/src/services/trust-client.js`
    - In `evaluateClaims()`, replace the catch block that returns `{ confirmed: true, mos: 8, fallback: true }` with `{ confirmed: false, error: err.message, unavailable: true }`
    - When VERITAS/Trust360 is unavailable, system returns error instead of silently confirming all gaps
    - _Bug_Condition: isBugCondition(input) where input.service == 'trust-client' AND hasFallbackConfirmAll(input)_
    - _Expected_Behavior: Trust client returns `{ confirmed: false, unavailable: true }` when VERITAS is down_
    - _Requirements: 1.4, 2.4_

  - [x] 6.3 Phase D Checkpoint
    - Verify publish returns 409 when no gaps exist
    - Verify trust-client returns `{ confirmed: false }` when VERITAS unavailable
    - Verify publish succeeds normally when gaps are persisted and VERITAS is available
    - Ensure existing property tests still pass
    - _Requirements: 2.1, 2.4_

- [x] 7. Phase E — Frontend Doctrine Cleanup

  - [x] 7.1 Rewrite `frontend/src/pages/Report.jsx` to render `derived_state` only
    - Remove client-side computation: `SEVERITY_ORDER` + `.sort()` calls, `buildNextSteps()`, `useEngagements()` hook, `LoginGate` component, `SignalPanel` component (with `SIGNAL_OPTIONS`, `SIGNAL_CONFIDENCE`, `signalStatus()`, `STATUS_COLOURS`, `SIGNAL_IMPACT`), `ScoreBlock` score range computation, `BookingModal` direct HubSpot integration
    - Wire to `derived_state`: fetch via `getReport(id)`, render `derived_state.gaps` (pre-sorted server-side), `derived_state.density`, `derived_state.directional_hints`, `derived_state.trust_score` (Tier 2 only), `derived_state.vendor_recommendations` (Tier 2 only), `derived_state.aws_programs` (Tier 2 only)
    - Wire OverridePanel to `derived_state.signals` from Phase C
    - Wire EngagementRouter to `derived_state.vendor_recommendations[i].routing_options`
    - Implement Tier 1/Tier 2 binary rendering: check `derived_state.status`, show "Publish Tier 2" button that POSTs to `/publish`, re-render with full Tier 2 on success
    - Preserve demo mode: `/report/demo` continues rendering from `demo-report.js` without API
    - _Bug_Condition: isBugCondition(input) where input.component == 'Report.jsx' AND computesDerivedStateClientSide(input)_
    - _Expected_Behavior: Frontend renders ONLY derived_state JSON from backend — no client-side sorting, scoring, vendor gating, or engagement state_
    - _Preservation: Demo report at `/report/demo` unchanged (Requirement 3.8)_
    - _Requirements: 1.3, 2.3_

  - [x] 7.2 Verify `frontend/src/components/EngagementRouter.jsx` renders backend routing only
    - Confirm it renders `routing_options.primary` as default action and `routing_options.alternatives` where they exist
    - Confirm it POSTs to `/engage` with `{ vendor_id, selected_branch }`
    - Remove any client-side routing logic if present
    - _Preservation: Engagement routing three branches unchanged (Requirement 3.6)_
    - _Requirements: 2.3_

  - [x] 7.3 Phase E Checkpoint
    - Verify Report.jsx contains no client-side computation (no `SEVERITY_ORDER`, no `buildNextSteps`, no `useEngagements`, no `LoginGate`, no `SignalPanel`)
    - Verify OverridePanel receives `derived_state.signals` and renders correctly
    - Verify demo report at `/report/demo` still works
    - Run `cd frontend && npm run build` to verify no build errors
    - _Requirements: 2.3_

- [x] 8. Phase F — VECTOR Cleanup

  - [x] 8.1 Remove direct OpenAI import from `api/src/services/signal-extractor.js`
    - Remove `import OpenAI from 'openai'` (line 2)
    - Replace `extractWithClaude()` OpenAI SDK usage with direct `fetch()` to VECTOR gateway
    - Every call carries `tenant_id: 'proof360'`, `session_id`, `correlation_id` per v3 contract
    - Use `process.env.AI_GATEWAY_URL || 'http://localhost:3003/v1'` as gateway URL
    - _Bug_Condition: isBugCondition(input) where input.service == 'signal-extractor' AND importsOpenAIDirectly(input)_
    - _Expected_Behavior: No `import OpenAI` in signal-extractor.js; all LLM calls route through VECTOR with required headers_
    - _Preservation: Signal extraction pipeline behavior unchanged — only routing changes (Requirement 3.2)_
    - _Requirements: 1.4, 2.4_

  - [x] 8.2 Remove direct OpenAI import from `api/src/handlers/chat.js`
    - Remove `import OpenAI from 'openai'` (line 2) and module-level `client` constant
    - Replace streaming `client.chat.completions.create()` with `fetch()` to VECTOR gateway with SSE stream parsing
    - Preserve streaming behavior: parse SSE stream from fetch response, pipe chunks to `reply.raw.write()`
    - Every call carries `tenant_id: 'proof360'`, `session_id`, `correlation_id`
    - _Bug_Condition: isBugCondition(input) where input.service == 'chat' AND importsOpenAIDirectly(input)_
    - _Expected_Behavior: No `import OpenAI` in chat.js; streaming LLM calls route through VECTOR_
    - _Requirements: 1.4, 2.4_

  - [x] 8.3 Verify `api/src/services/nim-client.js` VECTOR compliance
    - Confirm nim-client already calls VECTOR gateway URL (not NIM directly)
    - Confirm it passes `tenant_id`, `session_id`, `correlation_id`
    - No changes expected — verification only
    - _Requirements: 2.4_

  - [x] 8.4 Remove `openai` dependency from `api/package.json`
    - After removing all direct OpenAI imports, remove `openai` from `dependencies`
    - Prevents future direct imports
    - _Requirements: 2.4_

  - [x] 8.5 Phase F Checkpoint
    - Verify no `import OpenAI` statements exist in the codebase (grep check)
    - Verify `openai` is not in `api/package.json` dependencies
    - Verify signal-extractor and chat handler still function via VECTOR gateway
    - Ensure existing property tests still pass
    - _Requirements: 2.4_

- [x] 9. Phase G — Tests + Compliance Fixes

  - [x] 9.1 Install vitest and add test script to `api/package.json`
    - Add `vitest: ^3.2.1` to devDependencies alongside existing `fast-check`
    - Add `"test": "vitest --run"` to scripts
    - Create `api/vitest.config.js` with minimal config: `defineConfig({ test: { globals: true } })`
    - _Requirements: 1.8, 2.8_

  - [x] 9.2 Create `api/tests/unit/override-stack.test.js`
    - Test: system override SHALL NOT beat human override
    - Test: cross-actor conflict SHALL set `status = 'conflicted'`
    - Test: latest human override = `current_value`
    - Test: conflict resolution preserves both prior values
    - Mock Postgres via `vi.mock`
    - _Requirements: 2.5, 2.8_

  - [x] 9.3 Create `api/tests/unit/recompute-determinism.test.js`
    - Test: same input → identical output across 100 calls
    - Test: edit `stage` → AWS program filter changes → vendor matrix shifts → trust score updates
    - Test: idempotent — no side effects
    - _Requirements: 2.8_

  - [x] 9.4 Create `api/tests/unit/veritas-render-mapping.test.js`
    - Test: ATTESTED confidence > 0.85 → included in vendor matrix, standard rendering
    - Test: ATTESTED confidence ≤ 0.85 → included with caveat
    - Test: INFERRED → excluded from vendor matrix
    - Test: UNKNOWN → excluded from vendor matrix
    - Mock VERITAS — no real HTTP calls
    - _Requirements: 2.8_

  - [x] 9.5 Create `api/tests/unit/tier-boundary.test.js`
    - Test: Tier 1 response contains ONLY `{ gaps: [{ id, description, confidence, evidence_summary }], density, directional_hints, signals }`
    - Test: Tier 1 response SHALL NOT contain `trust_score`, `vendor_recommendations`, `aws_programs`, `severity`, `framework_impact`, `remediation`
    - Test: Tier 2 response contains full shape
    - _Requirements: 2.6, 2.8_

  - [x] 9.6 Create `api/tests/unit/engagement-routing.test.js`
    - Test: `john` branch → internal handling, John commission attribution
    - Test: `distributor` branch → matches tenant with `partner_branch = 'distributor'`, ordered by priority
    - Test: `vendor` branch → direct attribution, no routing intermediary
    - Test: engagement requires `tier2_published` status
    - _Requirements: 2.8_

  - [x] 9.7 Add Postgres SSM credential materialization to `scripts/deploy.sh`
    - Add `get_ssm` calls for `PG_HOST`, `PG_PORT`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD` from `/proof360/postgres/*`
    - Add defaults: `PG_PORT=${PG_PORT:-5432}`, `PG_DATABASE=${PG_DATABASE:-proof360}`
    - Write all `PG_*` vars to `.env` file alongside existing secrets
    - _Bug_Condition: isBugCondition(input) where input.script == 'deploy.sh' AND NOT materializesPostgresSSMCredentials(input)_
    - _Expected_Behavior: `.env` contains `PG_HOST`, `PG_PORT`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD` after deploy_
    - _Requirements: 1.9, 2.9_

  - [x] 9.8 Fix health check endpoint in `scripts/deploy.sh`
    - Replace `http://localhost:$PORT/health` with `http://localhost:$PORT/api/health`
    - `/health` returns React frontend HTML through Nginx; `/api/health` returns valid JSON from API server
    - _Bug_Condition: isBugCondition(input) where input.script == 'deploy.sh' AND checksWrongHealthEndpoint(input)_
    - _Expected_Behavior: Health check hits `/api/health` which returns JSON from the API server_
    - _Requirements: 1.11, 2.11_

  - [x] 9.9 Add graceful no-op to `api/src/services/signum-stub.js`
    - Guard `send()` with `if (!process.env.TELEGRAM_BOT_TOKEN)` → log warning and return
    - Guard `if (!to)` → log warning and return
    - Wrap `fetch()` in try/catch → log error on failure, never throw
    - _Bug_Condition: isBugCondition(input) where input.service == 'signum-stub' AND NOT gracefullyNoOpsOnMissingToken(input)_
    - _Expected_Behavior: `send()` with no `TELEGRAM_BOT_TOKEN` returns without throwing_
    - _Requirements: 1.12, 2.12_

  - [x] 9.10 Strip email body to plain URL in `api/src/handlers/capture-email.js`
    - Replace SES body `Your trust readiness report is ready:\n\n${reportUrl}` with `${reportUrl}` only
    - No marketing copy, no HTML formatting per convergence lock
    - _Requirements: 1.10, 2.10_

  - [x] 9.11 Handle orphaned leads in `scripts/backfill-leads.js`
    - When a lead's `session_id` does not exist in `sessions` table, insert with `session_id = NULL` and log the orphan
    - Add final count reconciliation: total NDJSON lines, inserted rows, orphaned rows
    - _Requirements: 1.13, 2.13_

  - [x] 9.12 Phase G Checkpoint
    - Run `cd api && npm test` — all new unit tests pass
    - Run existing property tests — all pass unchanged (Requirement 3.9)
    - Verify deploy script materializes Postgres credentials from SSM
    - Verify deploy script health check uses `/api/health`
    - Verify signum-stub no-ops gracefully
    - Verify capture-email sends plain URL only
    - Verify backfill handles orphaned leads with count reconciliation
    - _Requirements: 2.8, 2.9, 2.10, 2.11, 2.12, 2.13_

- [x] 10. Fix verification

  - [x] 10.1 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - v3 Session Lifecycle Structural Blockers
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms all 8 structural blockers are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7_

  - [x] 10.2 Verify preservation tests still pass
    - **Property 2: Preservation** - Unchanged Behaviors for Non-Remediation Paths
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [x] 11. Final Checkpoint — Ensure all tests pass
  - Run full test suite: `cd api && npm test`
  - Run frontend build: `cd frontend && npm run build`
  - Verify no `import OpenAI` statements in codebase
  - Verify all 7 phases (A–G) are complete
  - Ensure all tests pass, ask the user if questions arise
