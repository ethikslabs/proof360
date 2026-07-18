# Implementation Plan: proof360 v3.0

## Overview

10-phase hard-sequenced build transforming proof360 from in-memory/NDJSON to Postgres-persisted, deterministic signal correction engine with governed claim escalation and commercial routing. Each phase is atomic with a verification gate before the next begins. No parallel guessing. No phase skipping.

Doctrine pair holds throughout: *compute centralised, mutation gated. All decisions are derived. All mutations are explicit. All truth is replayable.*

## Tasks

- [x] 1. Phase 1 — Postgres Foundation (Schema + Pool + Parallel Write)
  - [x] 1.1 Create Postgres migration file `api/db/migrations/001_v3_schema.sql`
    - Define all 6 relational tables: `sessions`, `signals`, `gaps`, `tenants`, `recon_outputs`, `engagements`, `leads`
    - Define all 3 append-only event tables: `signal_events`, `engagement_events`, `attribution_ledger`
    - Define all indexes per convergence lock §5
    - Schema must match convergence lock §5 exactly — CHECK constraints, column types, defaults
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Create Postgres connection pool `api/src/db/pool.js`
    - Single `pg.Pool` instance, env-driven (`PG_HOST`, `PG_PORT`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD`)
    - Export `pool` default and `query(text, params)` helper
    - No ORM — raw `pg` only
    - _Requirements: 1.5, 1.6_

  - [x] 1.3 Add `pg` dependency to `api/package.json`
    - `npm install pg`
    - _Requirements: 1.5_

  - [x] 1.4 Modify `api/src/services/session-store.js` — add parallel Postgres writes
    - On session create/update: write to both in-memory Map AND `sessions` table
    - On signal write: write to both in-memory AND `signals` table
    - Keep existing in-memory reads unchanged — Postgres is write-only this phase
    - Keep existing NDJSON writes unchanged
    - _Requirements: 2.1, 2.4, 2.5_

  - [x] 1.5 Modify `api/src/handlers/submit.js` — write signals to Postgres
    - Insert `signals` rows to Postgres alongside in-memory state
    - Insert `recon_outputs` rows from recon pipeline results
    - _Requirements: 2.3_

  - [x] 1.6 Modify `api/src/handlers/capture-email.js` — write leads to Postgres
    - Insert `leads` row to Postgres alongside NDJSON append
    - _Requirements: 2.2_

  - [ ]* 1.7 Write property test for parallel write consistency `api/tests/property/parallel-write.property.test.js`
    - **Property 1: Parallel Write Consistency**
    - Verify data written to Postgres and in-memory store is identical — same fields, same values, same session_id
    - Vary: session data shapes, signal field names/values, lead email formats
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 2. Phase 1 Checkpoint — Postgres foundation verified
  - Run a session end-to-end. Confirm Postgres rows match in-memory state and NDJSON content.
  - Reads still come from in-memory; Postgres is write-only.
  - Verify row counts and integrity across 5 sessions.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Phase 2 — VECTOR Contract + Consumption Ledger
  - [x] 3.1 Create `api/src/services/consumption-emitter.js`
    - Single function: `record({ session_id, source, units, unit_type, success, error })`
    - Appends NDJSON to `api/data/consumption.ndjson`
    - ~50 LOC, fire-and-forget (write failures swallowed)
    - _Requirements: 4.1_

  - [x] 3.2 Modify `api/src/services/signal-extractor.js` — pass `correlation_id`, emit Firecrawl consumption
    - Add `correlation_id = session_id` to all VECTOR calls
    - Call `consumption.record()` for Firecrawl credit usage
    - _Requirements: 3.1, 4.3_

  - [x] 3.3 Modify `api/src/services/trust-client.js` — pass `tenant_id`, `session_id`, `correlation_id` on VECTOR calls
    - Every VECTOR call carries `{ tenant_id: 'proof360', session_id, correlation_id: session_id }`
    - Handle 429-equivalent: surface "service capacity reached" to user, exponential backoff max 3 retries
    - _Requirements: 3.1, 3.3_

  - [x] 3.4 Modify `api/src/services/nim-client.js` — pass `correlation_id` on VECTOR calls
    - Add `correlation_id = session_id` to all VECTOR calls
    - _Requirements: 3.1_

  - [x] 3.5 Modify all recon source files to emit consumption records
    - Wire `consumption.record()` into: `recon-dns.js`, `recon-http.js`, `recon-certs.js`, `recon-ip.js`, `recon-github.js`, `recon-jobs.js`, `recon-hibp.js`, `recon-ports.js`, `recon-ssllabs.js`, `recon-abuseipdb.js`
    - Each call records `session_id`, `source`, `units`, `unit_type`, `success`, `error`
    - _Requirements: 4.2_

  - [ ]* 3.6 Write property test for VECTOR call correlation `api/tests/property/vector-contract.property.test.js`
    - **Property 2: VECTOR Call Correlation**
    - Verify every VECTOR call payload includes `tenant_id`, `session_id`, `correlation_id` where `correlation_id == session_id`
    - **Validates: Requirements 3.1**

  - [ ]* 3.7 Write property test for consumption record completeness `api/tests/property/consumption.property.test.js`
    - **Property 3: Consumption Record Completeness**
    - Verify every external API call produces a consumption record with correct `session_id`, `source`, `success`
    - **Validates: Requirements 4.1, 4.4**

- [x] 4. Phase 2 Checkpoint — VECTOR contract + consumption ledger verified
  - Run a session. Confirm `data/consumption.ndjson` rows present for every recon source called.
  - Confirm VECTOR metering records carry `correlation_id == session_id`.
  - Cross-reference: same `session_id` joins both ledgers cleanly.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Phase 3 — Override Contract + Conflict Resolution
  - [x] 5.1 Create `api/src/services/signal-store.js` — override stack management
    - `applyOverride(sessionId, { field, value, actor, reason })` → `{ signal, event, conflicted }`
    - `resolveConflict(sessionId, { field, chosen_value, actor, reason })` → `{ signal, event }`
    - `loadSignals(sessionId)` → signals with `current_value` materialised
    - Enforce: system never beats human, append-only via `signal_events`, cross-actor conflict → `status='conflicted'`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [x] 5.2 Create `api/src/handlers/override.js` — `POST /api/v1/session/:id/override`
    - Accept `{ field, value, actor, reason }`
    - Resolve actor from auth context
    - Call `signal-store.applyOverride()`, then trigger recompute, return `derived_state`
    - Error responses: 404 session not found, 400 missing fields
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 5.3 Create `api/src/handlers/resolve-conflict.js` — `POST /api/v1/session/:id/resolve-conflict`
    - Accept `{ field, chosen_value, actor, reason }`
    - Call `signal-store.resolveConflict()`, trigger recompute, return `derived_state`
    - Error: 409 if signal not in conflicted status
    - _Requirements: 5.10, 5.11, 5.12_

  - [x] 5.4 Modify `api/src/server.js` — register override and resolve-conflict routes
    - Register `POST /api/v1/session/:id/override` → `override.js`
    - Register `POST /api/v1/session/:id/resolve-conflict` → `resolve-conflict.js`
    - _Requirements: 5.1, 5.10_

  - [ ]* 5.5 Write property tests for override stack `api/tests/property/override.property.test.js`
    - **Property 4: Override Stack Head Invariant** — `current_value` equals most recent human override; system override never changes `current_value` when human override exists
    - **Property 5: Cross-Actor Conflict Detection** — two different human actors setting different values → `status='conflicted'`
    - **Property 6: Signal Event Append Invariant** — every override/resolution appends `signal_events` row; table grows monotonically
    - Vary: override sequences, actor types, field names, values, ordering
    - **Validates: Requirements 5.3, 5.4, 5.5, 5.6, 5.8, 5.11**

- [x] 6. Phase 3 Checkpoint — Override contract verified
  - Submit overrides via curl, confirm `signal_events` rows append, `current_value` updates.
  - Cross-actor conflict scenario: founder=A, partner=B → `status='conflicted'`.
  - System rescan attempt does not overwrite human override.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Phase 4 — Deterministic Recompute Kernel
  - [x] 7.1 Create `api/src/services/recompute.js` — pure function recompute kernel
    - Export `recompute({ signals, recon_outputs, session, gaps_config, vendors_config, aws_programs })` → `{ derived_state }`
    - Pipeline: load signals → gap evaluation → trust score → AWS programs filter → vendor matrix selection → confidence ribbon
    - Tier 1/Tier 2 conditional rendering based on `sessions.status`
    - No external calls. No partial recompute. Idempotent.
    - Call `vendor.routing(context)` for each vendor, include result in `derived_state.vendor_recommendations[i].routing_options`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 7.2 Create `api/src/handlers/recompute.js` — `POST /api/v1/session/:id/recompute` endpoint wrapper
    - Load signals from Postgres (via `signal-store.loadSignals`), load recon_outputs, load session
    - Call `recompute()` pure function
    - Return `derived_state` JSON
    - _Requirements: 6.1_

  - [x] 7.3 Modify `api/src/server.js` — register recompute route
    - Register `POST /api/v1/session/:id/recompute` → `recompute.js`
    - _Requirements: 6.1_

  - [ ]* 7.4 Write property tests for recompute kernel `api/tests/property/recompute.property.test.js`
    - **Property 7: Recompute Idempotence** — same inputs → byte-identical `derived_state` across multiple calls
    - **Property 8: Recompute No External Calls** — kernel produces output without HTTP calls, DNS lookups, or file I/O
    - **Property 9: Tier 1 Boundary Enforcement** — when `status != 'tier2_published'`, response contains `gaps`, `density`, `directional_hints` but NOT `trust_score`, `vendor_recommendations`, `aws_programs`
    - **Property 10: Tier 2 Completeness** — when `status == 'tier2_published'`, response contains all of `trust_score`, `vendor_recommendations`, `aws_programs`, `engagement_router`
    - Vary: signal values, recon payloads, session status, gap trigger combinations
    - **Validates: Requirements 6.2, 6.4, 7.1, 7.2, 7.4**

- [x] 8. Phase 4 Checkpoint — Recompute kernel verified
  - Same input → identical output (determinism test, 100 calls).
  - Edit `stage` from "seed" to "Series A" → AWS program filter changes → vendor matrix shifts → trust score updates.
  - Confirm no frontend computation paths remain.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Phase 5 — Tier Boundary + VERITAS Full Adapter
  - [x] 9.1 Create `api/src/services/veritas-client.js` — thin HTTP wrapper for VERITAS endpoints
    - `POST /evidence/ingest` and `POST /claim/generate` wrappers
    - Config from env: `VERITAS_URL`, `VERITAS_API_KEY`, `VERITAS_TIMEOUT_MS=30000`
    - _Requirements: 8.4_

  - [x] 9.2 Create `api/src/services/veritas-adapter.js` — full adapter per `docs/veritas-adapter-spec.md`
    - `attest(gap, sessionContext)` — single gap attestation with 3-retry exponential backoff (1s, 2s, 4s), 30s timeout
    - `attestBatch(gaps, sessionContext)` — parallel via `Promise.allSettled`, partial failures preserved
    - `gapsRequiringReattestation(allGaps, changedSignalIds)` — filter helper for republish
    - Two-step VERITAS flow: evidence ingest → claim generate
    - ~200 LOC
    - _Requirements: 8.3, 8.4, 8.9, 8.10, 8.13_

  - [x] 9.3 Create `api/src/handlers/publish.js` — `POST /api/v1/session/:id/publish`
    - Load triggered gaps, call `attestBatch()`, update `gaps` rows with claim results
    - Set `sessions.status = 'tier2_published'` only when at least one gap attested
    - On VERITAS unavailable: return 503 with `{ error, failed_gaps, partial_results }`
    - Retain `claim_id` for successfully attested gaps on partial failure
    - On republish: call `gapsRequiringReattestation()`, re-attest only changed gaps
    - _Requirements: 8.1, 8.2, 8.5, 8.6, 8.7, 8.11, 8.12, 10.1, 10.2, 10.3_

  - [x] 9.4 Modify `api/src/services/recompute.js` — add VERITAS render mapping + Tier 1/Tier 2 enforcement
    - ATTESTED confidence > 0.85 → vendor matrix, standard rendering
    - ATTESTED confidence ≤ 0.85 → vendor matrix with caveat
    - INFERRED → excluded from vendor matrix, "inferred — not yet attested"
    - UNKNOWN → excluded from vendor matrix, "insufficient evidence to attest"
    - Strip Tier 2 fields when `sessions.status != 'tier2_published'`
    - _Requirements: 7.1, 7.2, 7.3, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 9.5 Modify `api/src/handlers/inferences.js` — strip Tier 2 fields server-side
    - Ensure no trust score, vendor matrix, or named programs leak in Tier 1 responses
    - _Requirements: 7.2, 7.3_

  - [x] 9.6 Modify `api/src/server.js` — register publish route
    - Register `POST /api/v1/session/:id/publish` → `publish.js`
    - _Requirements: 8.1_

  - [ ]* 9.7 Write property tests for VERITAS adapter `api/tests/property/veritas-adapter.property.test.js`
    - **Property 11: VERITAS Render Mapping** — ATTESTED >0.85 → matrix, ATTESTED ≤0.85 → matrix+caveat, INFERRED → excluded, UNKNOWN → excluded
    - **Property 12: VERITAS Unavailability Hard Fail** — VERITAS down → 503, `sessions.status` unchanged, no fallback-confirm
    - **Property 13: Any-Attest Publish Gate** — at least one attested → `tier2_published`; all fail → status unchanged
    - **Property 14: Partial Batch Claim Persistence** — mixed batch → attested gaps retain `claim_id`
    - **Property 15: Republish Re-attestation Scope** — only gaps with changed signals re-attest; unchanged retain `claim_id`
    - Vary: claim classes, confidence values, batch sizes, failure patterns, signal change sets
    - **Validates: Requirements 8.6, 8.7, 8.11, 8.12, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2**

  - [ ]* 9.8 Write property tests for tier boundary `api/tests/property/tier-boundary.property.test.js`
    - **Property 9: Tier 1 Boundary Enforcement** (cross-validated with recompute tests)
    - **Property 10: Tier 2 Completeness** (cross-validated with recompute tests)
    - Vary: session status values, gap counts, signal combinations
    - **Validates: Requirements 7.1, 7.2, 7.4**

- [x] 10. Phase 5 Checkpoint — Tier boundary + VERITAS verified
  - VERITAS down → `/publish` returns 503 cleanly, `sessions.status` unchanged.
  - VERITAS up → claims persist in `gaps` rows, vendor matrix renders only attested gaps.
  - Tier 1 endpoint never returns score, vendor matrix, or named programs.
  - Republish after edit → only changed signals' gaps re-attest; unchanged gaps reuse `claim_id`.
  - Mixed batch (some attested, some failed) → publish fails, attested gaps retain `claim_id`.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Phase 6 — Engagement System (Per-Vendor Routing)
  - [x] 11.1 Modify `api/src/config/vendors.js` — add `routing(context)` function per vendor
    - Each vendor entry gets `routing: (context) => ({ primary: { party, type, label, ... }, alternatives: [] })`
    - Three branch types: `john` (internal), `distributor` (tenant match), `vendor` (direct)
    - Context shape: `{ signals, tenant, session, derived_state }`
    - _Requirements: 11.3_

  - [x] 11.2 Create `api/src/services/engagement-router.js` — three-branch routing logic
    - `john` → internal handling, John commission attribution
    - `distributor` → match `tenants.partner_branch='distributor'`, ordered by `priority NULLS LAST, created_at`, select first
    - `vendor` → direct attribution, no routing intermediary
    - Insert `engagements` row (status=`created`), `engagement_events` row (event_type=`routed`), `attribution_ledger` rows
    - _Requirements: 11.4, 11.5, 11.6, 11.8, 11.9, 11.10, 11.11, 12.1_

  - [x] 11.3 Create `api/src/handlers/engage.js` — `POST /api/v1/session/:id/engage`
    - Accept `{ vendor_id, selected_branch }`
    - Validate `sessions.status = 'tier2_published'` (409 if not)
    - Call `engagement-router` for routing resolution
    - Return `{ engagement_id, status, routed_to }`
    - _Requirements: 11.1, 11.2_

  - [x] 11.4 Modify `api/src/server.js` — register engage route
    - Register `POST /api/v1/session/:id/engage` → `engage.js`
    - _Requirements: 11.1_

  - [ ]* 11.5 Write property tests for engagement system `api/tests/property/engagement.property.test.js`
    - **Property 16: Engagement Tier Gate** — engage on non-`tier2_published` session → 409, no engagement row
    - **Property 17: Distributor Routing Priority Order** — multiple distributors → lowest non-null priority wins; equal priority → earliest `created_at`; deterministic, not random
    - **Property 18: Engagement Event Append Invariant** — every state transition appends `engagement_events` row; table grows monotonically
    - **Property 21: Vendor Routing Shape Completeness** — `vendor.routing(context)` returns `{ primary: { party, type, label }, alternatives: [] }`
    - Vary: vendor IDs, branch types, tenant priority orderings, routing contexts
    - **Validates: Requirements 11.2, 11.3, 11.5, 12.1**

- [x] 12. Phase 6 Checkpoint — Engagement system verified
  - All three branches route correctly (john, distributor, vendor).
  - `engagement_events` rows append on every state transition.
  - `attribution_ledger` carries expected/confirmed/received column structure.
  - State, events, money are distinct tables — no single-table shortcut.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Phase 7 — Frontend (Override Panel + Tier Rendering + Engagement Router UI)
  - [x] 13.1 Create `frontend/src/components/OverridePanel.jsx` — right-hand signal correction panel
    - List every signal field with `current_value`, `inferred_value`, `status`, edit affordance
    - On edit: POST to `/api/v1/session/:id/override` with structured override shape
    - On response: re-render report with returned `derived_state`
    - Conflict UI: surface both prior values, prompt explicit resolution via `/resolve-conflict`
    - No computation — render `derived_state` only
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 13.2 Create `frontend/src/components/EngagementRouter.jsx` — per-vendor routing UI
    - Render per-vendor: `primary` branch as default action button, `alternatives` shown where they exist
    - On selection: POST to `/api/v1/session/:id/engage` with `{ vendor_id, selected_branch }`
    - Only visible after `sessions.status = 'tier2_published'`
    - No blanket session-level branch picker — routing is per-vendor
    - No routing function evaluation — all options pre-resolved from `derived_state`
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 13.3 Modify `frontend/src/pages/Report.jsx` — Tier 1/Tier 2 binary rendering
    - Tier 1 (status != `tier2_published`): render gap candidates, per-gap confidence, density summary, directional hints
    - Tier 1: hide trust score, vendor matrix, named programs
    - "Publish Tier 2" button → POST `/api/v1/session/:id/publish`
    - Loading spinner during publish (may take 30s+ for VERITAS batch)
    - Tier 2 (status == `tier2_published`): render trust score, vendor matrix, AWS programs, engagement router — binary unlock
    - Wire OverridePanel and EngagementRouter components
    - No arithmetic operators, no scoring logic, no filtering logic
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [x] 13.4 Modify `frontend/src/pages/AuditColdRead.jsx` — Tier 1 rendering only
    - Render Tier 1 content only (no score)
    - _Requirements: 14.1, 14.2_

  - [x] 13.5 Modify `frontend/src/api/client.js` — add v1 API call wrappers
    - Add functions for: override, resolve-conflict, recompute, publish, engage
    - All calls funnel through existing client wrapper pattern
    - _Requirements: 13.2, 15.2_

- [x] 14. Phase 7 Checkpoint — Frontend verified
  - Edit `stage` via override panel → recompute → vendor matrix updates in UI.
  - Tier 1 → Tier 2 transition: publish click → spinner → binary unlock.
  - Conflict scenario: founder edits, simulated partner override → conflict UI appears.
  - Frontend code search: no math, no scoring, no filtering logic in `.jsx` files.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Phase 8 — Postgres Read Switch
  - [x] 15.1 Modify `api/src/handlers/inferences.js` — read from Postgres instead of in-memory
    - Query `signals`, `gaps`, `recon_outputs` from Postgres
    - Return identical JSON shape as before
    - _Requirements: 16.1, 16.4_

  - [x] 15.2 Modify `api/src/handlers/report.js` — read from Postgres
    - Query session + derived state from Postgres
    - _Requirements: 16.1, 16.4_

  - [x] 15.3 Modify `api/src/handlers/early-signal.js` — read from Postgres
    - Query signals from Postgres for early score estimation
    - _Requirements: 16.1, 16.4_

  - [x] 15.4 Modify `api/src/handlers/admin-preread.js` — read from Postgres
    - Query batch data from Postgres
    - _Requirements: 16.1, 16.4_

  - [x] 15.5 Modify `api/src/handlers/program-match.js` — read from Postgres + fix `signals_object`/`signals` key collision
    - Read from Postgres, align to one key so AWS program matching returns correct data
    - _Requirements: 16.1, 16.4, 16.5_

  - [x] 15.6 Modify `api/src/services/session-store.js` — becomes write-through cache
    - Reads now come from Postgres
    - In-memory store becomes write-through cache only
    - NDJSON writes continue as safety net
    - _Requirements: 16.2, 16.3_

  - [ ]* 15.7 Write property test for read migration equivalence `api/tests/property/read-migration.property.test.js`
    - **Property 19: Read Migration Equivalence**
    - Verify JSON returned by each read endpoint is byte-identical before and after Postgres read switch
    - Differential test: compare in-memory vs Postgres reads for same session data
    - **Validates: Requirements 16.4**

- [x] 16. Phase 8 Checkpoint — Postgres read switch verified
  - All endpoints return identical JSON pre- and post-migration.
  - Differential test: 10 random sessions, compare in-memory vs Postgres reads, assert byte-equal.
  - No silent data loss.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Phase 9 — Backfill + Verification
  - [x] 17.1 Create `scripts/backfill-leads.js` — replay `leads.ndjson` → `leads` Postgres table
    - Read `leads.ndjson` line by line
    - Insert each record into `leads` table
    - Maintain foreign key integrity (no orphaned rows)
    - Report: total lines processed, rows inserted, errors
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [ ]* 17.2 Write property test for backfill round-trip `api/tests/property/backfill.property.test.js`
    - **Property 20: Backfill Round-Trip**
    - Verify every lead record in NDJSON has identical field values in Postgres after backfill
    - Verify total row count matches line count
    - **Validates: Requirements 17.2, 17.3**

- [x] 18. Phase 9 Checkpoint — Backfill verified
  - `wc -l leads.ndjson` matches `SELECT COUNT(*) FROM leads`.
  - Spot-check 5 historical leads — content matches.
  - Foreign key integrity (no orphaned rows).
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Phase 10 — Cleanup + Out-of-Band Fixes + Test Suite
  - [x] 19.1 Remove NDJSON read paths from code
    - Remove all code paths that read from NDJSON files
    - Retain NDJSON files on disk as archive
    - NDJSON write paths optionally retained until sustained Postgres confidence
    - _Requirements: 18.1, 18.2, 18.3_

  - [x] 19.2 Modify `api/src/handlers/capture-email.js` — wire SES integration
    - Send email via SES containing Layer 2 report URL on email capture
    - Use verified domain `proof360.au`
    - Plain link only, no marketing copy
    - _Requirements: 19.1, 19.2, 19.3_

  - [x] 19.3 Modify `frontend/src/pages/Portal.jsx` — replace hardcoded Auth0 dev-tenant with env-driven config
    - Replace `dev-nfpt3dibp2qzchiq.au.auth0.com` with `VITE_AUTH0_DOMAIN` env var
    - No dev-tenant references in production code
    - _Requirements: 20.1, 20.2_

  - [x] 19.4 Delete `api/src/services/gpu-manager.js` and remove all references
    - Delete the file
    - Grep for and remove any imports or references across codebase
    - _Requirements: 21.1, 21.2_

  - [x] 19.5 Verify `signals_object`/`signals` key collision fix from Phase 8
    - Confirm no residual collision exists in `program-match.js` or `session-store.js`
    - _Requirements: 21.3_

  - [x] 19.6 Modify `ARGUS/config/services.json` — update proof360 health endpoint to `/api/health`
    - Change health endpoint from `/health` to `/api/health`
    - _Requirements: 22.1, 22.2_

  - [x] 19.7 Create `api/src/services/signum-stub.js` — 3-line Telegram alert wrapper
    - Export `send({ channel, to, message })` — POST to Telegram Bot API
    - Uses `TELEGRAM_BOT_TOKEN` env var
    - Replaceable by full SIGNUM without changing call site
    - _Requirements: 23.1, 23.2, 23.3_

  - [x] 19.8 Wire SIGNUM stub into engagement router
    - Call `signum.send()` on engagement routing to alert relevant tenant
    - _Requirements: 23.2_

  - [ ]* 19.9 Write unit tests `api/tests/unit/engagement-router.test.js`
    - Test three-branch routing (john, distributor, vendor)
    - Test attribution ledger insertion
    - Test SIGNUM stub call on routing
    - _Requirements: 24.6_

  - [ ]* 19.10 Write unit tests `api/tests/unit/veritas-adapter.test.js`
    - Test retry behaviour (3 retries, exponential backoff)
    - Test 30s timeout handling
    - Test two-step VERITAS flow (evidence ingest → claim generate)
    - Test error shapes
    - Mock VERITAS — no real HTTP calls
    - _Requirements: 24.3, 24.4, 24.8_

  - [ ]* 19.11 Write unit tests `api/tests/unit/override-contract.test.js`
    - Test conflict resolution flow
    - Test actor resolution from auth context
    - Test endpoint validation (missing fields, unknown fields)
    - _Requirements: 24.1_

  - [ ]* 19.12 Write unit tests `api/tests/unit/recompute.test.js`
    - Test specific gap trigger scenarios
    - Test trust score calculation examples
    - Test AWS program matching
    - _Requirements: 24.2_

  - [ ]* 19.13 Write unit tests `api/tests/unit/consumption-emitter.test.js`
    - Test NDJSON append
    - Test field validation
    - Test error handling (write failure swallowed)
    - _Requirements: 4.1_

  - [ ]* 19.14 Write unit tests `api/tests/unit/vector-contract.test.js`
    - Test 429 retry behaviour
    - Test sovereignty block surfacing
    - Test `correlation_id` presence on all calls
    - _Requirements: 24.7_

- [x] 20. Phase 10 Final Checkpoint — v3.0 production-ready
  - Full session walkthrough end-to-end against Postgres only.
  - ARGUS shows green via `/api/health`.
  - Telegram alert fires on lead arrival.
  - SES delivers Layer 2 report email.
  - `gpu-manager.js` confirmed deleted, no references remain.
  - No dev-tenant Auth0 references in production code.
  - Test suite passes (vitest).
  - Doctrine pair holds: no frontend computation, no ungated mutation paths.
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each phase is atomic — complete, verify, then proceed to next. No parallel guessing. No phase skipping.
- Property tests validate universal correctness properties from the design document (Properties 1–21)
- Unit tests validate specific examples, edge cases, and error conditions
- All property tests use vitest + fast-check with minimum 100 iterations
- Checkpoints correspond to build brief verification gates — Claude Code verifies, John signs off
- The doctrine pair (compute centralised, mutation gated) holds throughout every phase
- When this document contradicts the convergence lock, the lock wins
