# Requirements Document — proof360 v3.0

## Introduction

proof360 v3.0 is a major evolution of the trust readiness platform from an in-memory, NDJSON-backed diagnostic tool into a Postgres-persisted, deterministic signal correction engine with governed claim escalation and commercial routing. The build is a 10-phase hard-sequenced delivery governed by two constitutional doctrines:

1. **Compute centralised, rendering distributed.** Backend owns signals (state), recompute (truth), and the attestation boundary. Frontends receive derived state and render. They do not compute. They do not mutate truth.
2. **Mutation gated, reads unrestricted.** Reading derived state carries no contract beyond authentication. Mutating truth carries a single contract: the structured override-submission shape. Every mutation surface uses the same shape.

The doctrine pair stated tightly: *All decisions are derived. All mutations are explicit. All truth is replayable.*

Source of truth: `docs/proof360-v3-convergence-locked.md` (architecture lock) and `docs/kiro-build-brief-v3.md` (build brief). When this document contradicts the lock, the lock wins.

## Glossary

- **Proof360_API**: The Fastify backend at `api/src/server.js` serving all proof360 endpoints
- **Recompute_Kernel**: The deterministic pure function (`api/src/services/recompute.js`) that computes full derived state from persisted signals
- **Override_Contract**: The single mutation interface (`POST /api/v1/session/:id/override`) through which all writes to signal state flow
- **VERITAS_Adapter**: The translation layer (`api/src/services/veritas-adapter.js`) that submits evidence to VERITAS and maps claim responses back to gap state
- **VECTOR**: The external AI routing service that proof360 calls for all LLM inference; proof360 shall not call Anthropic/NIM/OpenAI directly
- **Tier_Boundary**: The structural separation between Tier 1 (diagnostic) and Tier 2 (actionable) content, enforced server-side
- **Engagement_Router**: The per-vendor commercial routing system that resolves each vendor's primary branch (john / distributor / vendor) from `config/vendors.js` and routes leads after Tier 2 publish
- **Consumption_Emitter**: The service (`api/src/services/consumption-emitter.js`) that records non-VECTOR external API consumption to NDJSON
- **Signal_Events**: The append-only event table recording every mutation to signal state
- **Engagement_Events**: The append-only event table recording every commercial state transition
- **Attribution_Ledger**: The append-only table tracking expected, confirmed, and received revenue per engagement party
- **Derived_State**: The JSON payload returned by the Recompute_Kernel containing gaps, trust score, vendor matrix, AWS programs, and confidence ribbon
- **PULSUS**: The external aggregation service that reads both consumption ledgers and surfaces cost-per-scan analytics
- **SIGNUM**: The external notification service; v3.0 uses a 3-line stub wrapper for Telegram alerts
- **ARGUS**: The external monitoring service that checks proof360 health endpoints
- **Session**: A single trust readiness assessment identified by UUID, persisted in the `sessions` Postgres table
- **Gap**: A trust deficiency identified by evaluating trigger conditions over signals and recon context
- **Recon_Outputs**: The `recon_outputs` Postgres table storing persisted results from external recon sources (DNS, HTTP, certs, etc.) per session. The Recompute_Kernel reads from this table only — never from live external sources. Lock §5 amendment.
- **Override_Stack**: The chronologically ordered list of value changes for a signal field, stored via Signal_Events
- **Founder**: The end user who submits a company URL and owns the resulting report
- **Partner**: A distributor or vendor tenant who accesses leads via the partner portal
- **Tenant**: An organisation record in the `tenants` table with vendor catalog filter and partner branch

## Requirements

### Requirement 1: Postgres Schema Foundation (Phase 1)

**User Story:** As a platform operator, I want all session, signal, gap, tenant, engagement, and lead data persisted in Postgres, so that proof360 survives restarts and supports the mutation contract.

#### Acceptance Criteria

1. THE Proof360_API SHALL create exactly six relational tables: `sessions`, `signals`, `gaps`, `tenants`, `engagements`, `leads` with schemas matching convergence lock §5.
2. THE Proof360_API SHALL create exactly three append-only event tables: `signal_events`, `engagement_events`, `attribution_ledger` with schemas matching convergence lock §5.
3. THE Proof360_API SHALL create a `recon_outputs` table: `id uuid pk, session_id uuid fk, source text, payload jsonb, fetched_at timestamptz, ttl_seconds integer`. The recon pipeline writes to this table once per session (or on rescan). The Recompute_Kernel reads from this table only — never from live external sources. This is a lock §5 amendment.
4. THE Proof360_API SHALL store the migration in `api/db/migrations/001_v3_schema.sql`.
5. THE Proof360_API SHALL use a single Postgres connection pool (`api/src/db/pool.js`) driven by environment variables, with no ORM.
6. THE Proof360_API SHALL read Postgres credentials from AWS SSM under `/proof360/postgres/*`.

### Requirement 2: Parallel Write (Phase 1)

**User Story:** As a platform operator, I want every write to land in both in-memory store and Postgres simultaneously, so that I can verify Postgres correctness before switching reads.

#### Acceptance Criteria

1. WHEN a session is created or updated, THE Proof360_API SHALL write to both the in-memory Map and the corresponding Postgres table.
2. WHEN a lead is captured via `POST /api/v1/session/:id/capture-email`, THE Proof360_API SHALL write to both `leads.ndjson` and the `leads` Postgres table.
3. WHEN signals are written via `submit` handler, THE Proof360_API SHALL write `signals` rows to Postgres alongside in-memory state.
4. WHILE Phase 1 is active, THE Proof360_API SHALL continue reading from in-memory store only; Postgres shall be write-only.
5. THE Proof360_API SHALL retain all existing NDJSON write paths unchanged.

### Requirement 3: VECTOR Contract Enforcement (Phase 2)

**User Story:** As a platform operator, I want every VECTOR call tagged with tenant, session, and correlation identifiers, so that PULSUS can aggregate cost per session.

#### Acceptance Criteria

1. THE Proof360_API SHALL pass `tenant_id`, `session_id`, and `correlation_id` on every VECTOR call, where `correlation_id` equals `session_id` for proof360.
2. THE Proof360_API SHALL add a `correlation_id` field to VECTOR's `MeteringRecord` schema in `VECTOR/src/metering/metering-emitter.js`.
3. WHEN VECTOR returns a rate-limit rejection (HTTP 429-equivalent), THE Proof360_API SHALL surface "service capacity reached, retry shortly" to the user and retry with exponential backoff (max 3 attempts).
4. THE Proof360_API SHALL NOT silently downgrade to a different model when VECTOR's sovereignty policy blocks a request; the block shall be surfaced to the user with reason.
5. THE Proof360_API SHALL NOT call Anthropic, NIM, or OpenAI directly, bypassing VECTOR.

### Requirement 4: Consumption Ledger (Phase 2)

**User Story:** As a platform operator, I want every external API call recorded in a consumption ledger, so that PULSUS can surface cost-per-scan broken down by source.

#### Acceptance Criteria

1. THE Consumption_Emitter SHALL append a record to `api/data/consumption.ndjson` for every external API call, with fields: `session_id`, `source`, `units`, `unit_type`, `success`, `error`, `timestamp`.
2. THE Consumption_Emitter SHALL be called by every recon source: `recon-dns.js`, `recon-http.js`, `recon-certs.js`, `recon-ip.js`, `recon-github.js`, `recon-jobs.js`, `recon-hibp.js`, `recon-ports.js`, `recon-ssllabs.js`, `recon-abuseipdb.js`.
3. THE Consumption_Emitter SHALL be called by `signal-extractor.js` for Firecrawl credit consumption.
4. FOR ALL sessions, the same `session_id` SHALL join VECTOR metering records and proof360 consumption records cleanly.

### Requirement 5: Override Contract — The Write Interface (Phase 3)

**User Story:** As a founder, I want to correct any inferred signal value through a single structured mutation interface, so that my edits are explicit, auditable, and trigger recomputation.

#### Acceptance Criteria

1. THE Proof360_API SHALL expose `POST /api/v1/session/:id/override` accepting the shape `{ field, value, actor, reason }`.
2. WHEN an override is submitted, THE Proof360_API SHALL resolve `actor` from auth context: founder → `founder`, partner portal → `partner:<tenant_id>`, MCP → `mcp:<agent_id>`.
3. WHEN an override is submitted, THE Proof360_API SHALL append a row to `signal_events` with `event_type='overridden'`, `prior_value`, `new_value`, `actor`, `reason`, and `ts`.
4. THE Proof360_API SHALL compute `current_value` from the override stack head (latest human override).
5. WHEN a system rescan occurs, THE Override_Contract SHALL NOT overwrite a human override; system overrides shall never beat human overrides.
6. WHEN two different human actors set conflicting values for the same field (e.g. founder sets "Series A", partner sets "seed"), THE Proof360_API SHALL set `signals.status = 'conflicted'` with no silent merge.
7. WHEN `signals.status = 'conflicted'`, THE Recompute_Kernel SHALL still run against the latest human value, and the conflict shall be surfaced for explicit user resolution.
8. WHEN a conflict is resolved, THE Proof360_API SHALL emit a `signal_events` row with `event_type = 'conflict_resolved'`, capturing both prior values and the resolved choice.
9. THE Override_Contract SHALL be the only mutation surface in proof360; every write — founder edit, partner correction, MCP agent submission — shall use the identical shape.
10. THE Proof360_API SHALL expose `POST /api/v1/session/:id/resolve-conflict` accepting `{ field, chosen_value, actor, reason }` to explicitly resolve a conflicted signal.
11. WHEN a conflict resolution is submitted, THE Proof360_API SHALL set `signals.status` back to `overridden`, update `current_value` to `chosen_value`, emit a `signal_events` row with `event_type = 'conflict_resolved'` capturing both prior values and the resolved choice, and trigger recompute.
12. WITHOUT the conflict resolution endpoint, conflicted signals SHALL remain in `conflicted` status indefinitely; the UI SHALL NOT provide any other mechanism to resolve conflicts.

### Requirement 6: Deterministic Recompute Kernel (Phase 4)

**User Story:** As a platform operator, I want a single pure function that computes all derived state from persisted signals, so that truth is centralised, deterministic, and replayable.

#### Acceptance Criteria

1. THE Proof360_API SHALL expose `POST /api/v1/session/:id/recompute` returning full `derived_state` JSON.
2. THE Recompute_Kernel SHALL load all `signals` for the session (with `current_value` materialised), load persisted recon outputs (already stored during the ingestion/extraction phase), and run the full pipeline: gap evaluation, trust score computation, AWS programs filter, vendor matrix selection, confidence ribbon derivation. THE Recompute_Kernel SHALL NOT make external calls (Firecrawl, DNS, SSL Labs, etc.) during recompute; all recon data must be persisted before recompute runs.
3. THE Recompute_Kernel SHALL NOT perform partial recompute; every call shall run the full pipeline against all persisted signals.
4. THE Recompute_Kernel SHALL be idempotent: multiple calls with no override changes shall return identical results.
5. THE Recompute_Kernel SHALL NOT depend on event sourcing for computation; append-only event tables exist for audit, not for recomputation.
6. THE Recompute_Kernel SHALL be a pure function exported from `api/src/services/recompute.js`.
7. THE Proof360_API SHALL NOT allow any frontend to compute derived state; frontends shall receive the `derived_state` JSON and render only.


### Requirement 7: Tier Boundary — Structural Law (Phase 5)

**User Story:** As a platform operator, I want a hard structural separation between diagnostic (Tier 1) and actionable (Tier 2) content, enforced server-side, so that no frontend can synthesise Tier 2 content without attestation.

#### Acceptance Criteria

1. WHILE `sessions.status` is not `tier2_published`, THE Recompute_Kernel SHALL return only Tier 1 content with the following explicit shape: `{ gaps: [{ id, description, confidence, evidence_summary }], density: { total, high, medium, low }, directional_hints: string[] }`. The response SHALL include gap candidates with evidence, per-gap confidence (high|medium|low), signal density summary, and directional hints.
2. WHILE `sessions.status` is not `tier2_published`, THE Recompute_Kernel SHALL NOT return trust score (aggregate), vendor matrix, named AWS program recommendations, or anything implying actionability.
3. THE Proof360_API SHALL enforce Tier 1 content stripping server-side in the recompute kernel based on `sessions.status`; the frontend shall not make this decision.
4. WHEN `sessions.status` transitions to `tier2_published`, THE Recompute_Kernel SHALL return trust score, vendor matrix, AWS program matching, and engagement router data simultaneously.
5. THE Tier_Boundary transition SHALL be binary; the Proof360_API SHALL NOT render partial attestation states in the UI.

### Requirement 8: VERITAS Attestation — Full Adapter (Phase 5)

**User Story:** As a platform operator, I want VERITAS attestation to gate the vendor matrix, so that every rendered gap recommendation is backed by a governed claim chain.

#### Acceptance Criteria

1. THE Proof360_API SHALL expose `POST /api/v1/session/:id/publish` to trigger Tier 2 attestation.
2. WHEN publish is triggered, THE VERITAS_Adapter SHALL call `attestBatch(gaps, sessionContext)` against all triggered gaps for the session.
3. THE VERITAS_Adapter SHALL implement `attest(gap, sessionContext)` for single-gap attestation, `attestBatch(gaps, sessionContext)` using `Promise.allSettled` for parallel batch attestation, and `gapsRequiringReattestation(allGaps, changedSignalIds)` for filtering gaps needing re-attestation.
4. FOR EACH gap, THE VERITAS_Adapter SHALL POST evidence to `/evidence/ingest` with `{ predicate, projection, content: { signals, recon_evidence }, tenant_id, freshness_ttl: 86400 }`, then POST to `/claim/generate` with the returned `evidence_id`.
5. WHEN VERITAS returns a claim, THE Proof360_API SHALL update the `gaps` row with `veritas_claim_id`, `veritas_class`, `veritas_confidence`, and `attested_at`.
6. THE Proof360_API SHALL set `sessions.status = 'tier2_published'` after at least one gap is successfully attested. Failed gaps SHALL NOT render in the vendor matrix but SHALL surface as "attestation pending — retry" in the UI. Republish (Requirement 10) is the explicit retry mechanism for failed gaps.
7. IF VERITAS is unavailable, THEN THE Proof360_API SHALL return HTTP 503 from the publish endpoint with `{ error: "veritas_unavailable", failed_gaps, partial_results }` and `sessions.status` SHALL NOT advance.
8. THE Tier_Boundary transition SHALL be binary at the per-gap render level: each gap is either attested-and-rendered or not-attested-and-not-rendered. There SHALL be no "half-attested" gap state.
9. THE VERITAS_Adapter SHALL retry failed VERITAS HTTP calls with exponential backoff (1s, 2s, 4s) up to 3 retries.
10. IF a per-gap attestation exceeds 30 seconds, THEN THE VERITAS_Adapter SHALL treat that gap as failed.
11. WHEN gaps are successfully attested in a failed batch, THE Proof360_API SHALL retain their `veritas_claim_id` so that republish reuses successful attestations.
12. THE Proof360_API SHALL NOT implement fallback-confirm-all behaviour; VERITAS unavailability shall never silently confirm gaps.
13. THE VERITAS_Adapter SHALL be a translation layer only; the adapter shall not embed VERITAS claim logic, and VERITAS shall own claim governance entirely.
14. THE Proof360_API SHALL store only `veritas_claim_id` as reference; proof360 shall not duplicate VERITAS claim history.

### Requirement 9: VERITAS Render Mapping (Phase 5)

**User Story:** As a founder, I want the vendor matrix to show only gaps backed by high-confidence attestation, so that recommendations are credible.

#### Acceptance Criteria

1. WHEN VERITAS returns `claim_class = 'ATTESTED'` with `confidence > 0.85`, THE Recompute_Kernel SHALL include the gap in the vendor matrix with standard rendering.
2. WHEN VERITAS returns `claim_class = 'ATTESTED'` with `confidence <= 0.85`, THE Recompute_Kernel SHALL include the gap in the vendor matrix with caveat: "attested with moderate confidence".
3. WHEN VERITAS returns `claim_class = 'INFERRED'`, THE Recompute_Kernel SHALL exclude the gap from the vendor matrix and mark it "inferred — not yet attested".
4. WHEN VERITAS returns `claim_class = 'UNKNOWN'`, THE Recompute_Kernel SHALL exclude the gap from the vendor matrix and mark it "insufficient evidence to attest".
5. THE Recompute_Kernel SHALL enforce this render mapping server-side; the frontend shall not make vendor matrix inclusion decisions.

### Requirement 10: Republish After Revision (Phase 5)

**User Story:** As a founder, I want to edit signals after Tier 2 publish and re-publish, so that my report reflects updated attestations without re-attesting unchanged gaps.

#### Acceptance Criteria

1. WHEN a founder edits signals after Tier 2 publish and re-publishes, THE VERITAS_Adapter SHALL identify only gaps whose underlying signals changed since last attestation using `gapsRequiringReattestation`.
2. THE VERITAS_Adapter SHALL re-attest only the changed gaps; unchanged gaps shall retain their existing `veritas_claim_id` and class.
3. WHILE re-attestation is in progress, THE Proof360_API SHALL hold the previous Tier 2 view until new attestation completes.

### Requirement 11: Engagement System — Per-Vendor Routing (Phase 6)

**User Story:** As a founder, I want each vendor recommendation to come with a default routing path (and alternatives where they exist), so that commercial routing is vendor-specific rather than a blanket session-level choice.

#### Acceptance Criteria

1. THE Proof360_API SHALL expose `POST /api/v1/session/:id/engage` accepting `{ vendor_id, selected_branch }` where `selected_branch` is one of `john`, `distributor`, `vendor`.
2. WHEN engage is called, THE Proof360_API SHALL validate that `sessions.status = 'tier2_published'`; engagement shall not be available before Tier 2 publish.
3. THE `config/vendors.js` SHALL carry a `routing` function per vendor with signature `routing(context) => { primary: { party, tenant_id?, contact?, type, template?, url?, label? }, alternatives: [] }` where `context = { signals, tenant, session, derived_state }`. The Recompute_Kernel SHALL call `vendor.routing(context)` for each vendor and include the result in `derived_state.vendor_recommendations[i].routing_options`. Routing logic executes inside the recompute kernel — compute stays centralised.
4. WHEN `selected_branch = 'john'`, THE Engagement_Router SHALL create an engagement with internal handling and John commission attribution.
5. WHEN `selected_branch = 'distributor'`, THE Engagement_Router SHALL match `tenants.partner_branch = 'distributor'` and route to the best matching tenant, ordered by `priority NULLS LAST, created_at`, selecting the first result. THE `tenants` table SHALL include a `priority integer null` column. THE Engagement_Router SHALL NOT route randomly when multiple distributors exist. Geographic matching is deferred until a surface requires it.
6. WHEN `selected_branch = 'vendor'`, THE Engagement_Router SHALL create a direct attribution engagement with no routing intermediary.
7. THE frontend SHALL render the vendor's `primary` routing option as the default action button, and show `alternatives` only where they exist. The user picks an alternative only when one is available — not a blanket session-level branch choice. THE frontend SHALL NOT evaluate routing functions or conditions; all routing options come pre-resolved from the recompute kernel's `derived_state`.
8. WHEN an engagement is created, THE Proof360_API SHALL insert an `engagements` row with `status = 'created'` and an `engagement_events` row with `event_type = 'routed'`. The `engagements.selected_branch` records what was chosen.
9. WHEN an engagement is routed, THE Proof360_API SHALL insert `attribution_ledger` rows with `expected_amount` and `expected_date` per known party.
10. THE Proof360_API SHALL maintain three distinct tables for engagement state (`engagements`), events (`engagement_events`), and money (`attribution_ledger`); the Proof360_API SHALL NOT collapse these into a single table.
11. THE `attribution_ledger` SHALL carry `expected_amount`, `expected_date`, `confirmed_amount`, `confirmed_date`, `received_amount`, `received_date`, and `status` columns per the convergence lock §5 schema.

### Requirement 12: Engagement Event Audit (Phase 6)

**User Story:** As a platform operator, I want every engagement state transition recorded in an append-only event log, so that the commercial lifecycle is replayable.

#### Acceptance Criteria

1. WHEN an engagement transitions state (created → routed → accepted → rejected → converted), THE Proof360_API SHALL append an `engagement_events` row with `event_type`, `actor`, `metadata`, and `ts`.
2. THE `engagement_events` table SHALL NOT duplicate `attribution_ledger` data; each table shall have one ownership domain.
3. THE `signal_events` table SHALL NOT duplicate VERITAS claim history; proof360 shall hold `veritas_claim_id` reference only.


### Requirement 13: Frontend Override Panel (Phase 7)

**User Story:** As a founder, I want a right-hand override panel on my report, so that I can correct any inferred signal and see the report update in real time.

#### Acceptance Criteria

1. THE Override_Panel (`frontend/src/components/OverridePanel.jsx`) SHALL list every signal field with `current_value`, `inferred_value`, `status` (inferred|overridden|conflicted), and an edit affordance.
2. WHEN a founder edits a signal value, THE Override_Panel SHALL POST to `/api/v1/session/:id/override` with the structured override shape.
3. WHEN the override response returns `derived_state`, THE Override_Panel SHALL re-render the report with the updated derived state.
4. WHEN `signals.status = 'conflicted'` for a field, THE Override_Panel SHALL surface both prior values and prompt explicit resolution; the Override_Panel SHALL NOT silently overwrite.
5. THE Override_Panel SHALL NOT perform any computation; all numbers, gaps, and vendor recommendations shall come from the backend recompute response.

### Requirement 14: Tier Rendering in Frontend (Phase 7)

**User Story:** As a founder, I want the report to show diagnostic-only content before I publish, and full actionable content after I publish, so that the tier boundary is visually clear.

#### Acceptance Criteria

1. WHILE `sessions.status` is not `tier2_published`, THE Report_Page SHALL render only gap candidates, per-gap confidence, density summary, and directional hints.
2. WHILE `sessions.status` is not `tier2_published`, THE Report_Page SHALL hide trust score (aggregate), vendor matrix, and named program recommendations.
3. THE Report_Page SHALL display a "Publish Tier 2" button (triggering `POST /api/v1/session/:id/publish`).
4. WHILE the publish request is in flight (which may take 30+ seconds for VERITAS batch), THE Report_Page SHALL display a loading spinner.
5. WHEN publish completes successfully, THE Report_Page SHALL render trust score, vendor matrix, AWS programs, and engagement router simultaneously as a binary unlock.
6. THE Report_Page SHALL NOT render progressive attestation states; the transition shall be binary (loading → full Tier 2).
7. THE Report_Page SHALL NOT contain any arithmetic operators, scoring logic, or filtering logic; all computation shall be server-side.

### Requirement 15: Engagement Router UI (Phase 7)

**User Story:** As a founder, I want each vendor recommendation to show its default routing path with alternatives where available, so that I can act on recommendations through the right channel.

#### Acceptance Criteria

1. THE Engagement_Router_UI (`frontend/src/components/EngagementRouter.jsx`) SHALL render per-vendor routing: each vendor recommendation shows its `primary` branch as the default action, with `alternatives` shown only where they exist in the vendor config.
2. WHEN a routing branch is selected for a vendor, THE Engagement_Router_UI SHALL POST to `/api/v1/session/:id/engage` with `{ vendor_id, selected_branch }`.
3. THE Engagement_Router_UI SHALL only be visible after `sessions.status = 'tier2_published'`.
4. THE Engagement_Router_UI SHALL NOT present a blanket session-level branch picker; routing is per-vendor.

### Requirement 16: Postgres Read Switch (Phase 8)

**User Story:** As a platform operator, I want all read paths to come from Postgres, so that the system is fully persistent and the in-memory store becomes a write-through cache.

#### Acceptance Criteria

1. THE Proof360_API SHALL modify all read handlers to query Postgres: `GET /api/v1/session/:id/inferences`, `GET /api/v1/session/:id/report`, `GET /api/v1/session/:id/early-signal`, `GET /api/admin/preread/:batch_id`, `GET /api/program-match/:session_id`.
2. WHEN the read switch is complete, THE `session-store.js` SHALL become a write-through cache; reads shall come from Postgres.
3. THE Proof360_API SHALL continue NDJSON writes as a safety net during this phase.
4. FOR ALL endpoints, THE Proof360_API SHALL return identical JSON before and after the read migration.
5. THE Proof360_API SHALL fix the `signals_object` / `signals` key collision in `program-match.js` during this phase by aligning to one key so that AWS program matching returns correct data.

### Requirement 17: Historical Data Backfill (Phase 9)

**User Story:** As a platform operator, I want all historical NDJSON data replayed into Postgres, so that no lead or session data is lost in the migration.

#### Acceptance Criteria

1. THE Proof360_API SHALL provide a `scripts/backfill-leads.js` script that replays `leads.ndjson` entries into the `leads` Postgres table.
2. WHEN backfill completes, THE row count in the `leads` table SHALL match the line count of `leads.ndjson`.
3. FOR ALL backfilled leads, THE content in Postgres SHALL match the original NDJSON content.
4. THE backfill script SHALL maintain foreign key integrity with no orphaned rows.

### Requirement 18: NDJSON Cutover and Archive (Phase 10)

**User Story:** As a platform operator, I want NDJSON read paths removed from code and NDJSON files retained as archive only, so that Postgres is the canonical data store.

#### Acceptance Criteria

1. THE Proof360_API SHALL remove all NDJSON read paths from code.
2. THE Proof360_API SHALL retain NDJSON files on disk as archive.
3. THE Proof360_API SHALL optionally remove NDJSON write paths only after sustained confidence in Postgres operations.

### Requirement 19: SES Email Integration (Phase 10)

**User Story:** As a founder, I want to receive an email with my Layer 2 report URL after email capture, so that I can return to my report.

#### Acceptance Criteria

1. WHEN a lead is captured via `POST /api/v1/session/:id/capture-email`, THE Proof360_API SHALL send an email via SES containing the Layer 2 report URL.
2. THE Proof360_API SHALL use the verified domain `proof360.au` for SES sending.
3. THE email SHALL contain a plain link to the report only, with no marketing copy.

### Requirement 20: Auth0 Production Tenant (Phase 10)

**User Story:** As a platform operator, I want the production Auth0 tenant used in all deployed code, so that no dev-tenant references ship to production.

#### Acceptance Criteria

1. THE Proof360_API SHALL replace the hardcoded `dev-nfpt3dibp2qzchiq.au.auth0.com` in `Portal.jsx` with environment-driven configuration.
2. THE Proof360_API SHALL NOT contain any dev-tenant Auth0 references in production code.

### Requirement 21: Dead Code Removal (Phase 10)

**User Story:** As a platform operator, I want dead code removed, so that the codebase contains no unused or broken references.

#### Acceptance Criteria

1. THE Proof360_API SHALL delete `api/src/services/gpu-manager.js`.
2. THE Proof360_API SHALL remove all references to `gpu-manager.js` from the codebase.
3. THE Proof360_API SHALL verify that the `signals_object` / `signals` key collision fix from Phase 8 is complete and no residual collision exists.

### Requirement 22: ARGUS Health Endpoint Correction (Phase 10)

**User Story:** As a platform operator, I want ARGUS to monitor the correct health endpoint, so that monitoring reflects actual API availability.

#### Acceptance Criteria

1. THE Proof360_API SHALL update `ARGUS/config/services.json` for the proof360 entry to use health endpoint `/api/health` instead of `/health`.
2. WHEN ARGUS checks proof360 health, THE Proof360_API SHALL return a valid health response from `/api/health` (not React frontend HTML).

### Requirement 23: SIGNUM Stub for Telegram Alerts (Phase 10)

**User Story:** As a platform operator, I want a Telegram alert on lead arrival, so that engagement routing is immediately visible.

#### Acceptance Criteria

1. THE Proof360_API SHALL implement a 3-line stub wrapper at `api/src/services/signum-stub.js` that sends a Telegram message via the Telegram Bot API using `TELEGRAM_BOT_TOKEN` environment variable.
2. WHEN an engagement is routed, THE Engagement_Router SHALL call `signum.send()` to alert the relevant tenant via Telegram.
3. THE SIGNUM stub SHALL be replaceable by the full SIGNUM service in a future build without changing the call site interface.

### Requirement 24: Test Suite (Phase 10)

**User Story:** As a platform operator, I want a vitest test suite covering core invariants, so that regressions are caught automatically.

#### Acceptance Criteria

1. THE test suite SHALL cover override stack rules: system override shall never beat human override, and cross-actor conflict shall set `status = 'conflicted'`.
2. THE test suite SHALL cover recompute determinism: same input shall produce identical output across 100 calls.
3. THE test suite SHALL cover VERITAS adapter mapping: ATTESTED with confidence > 0.85 renders in vendor matrix, INFERRED excludes from vendor matrix, UNKNOWN excludes from vendor matrix.
4. THE test suite SHALL cover VERITAS failure: VERITAS unavailable shall return 503 from publish endpoint with `sessions.status` unchanged.
5. THE test suite SHALL cover tier boundary: Tier 1 endpoint shall never return trust score, vendor matrix, or named programs.
6. THE test suite SHALL cover engagement routing: all three branches (john, distributor, vendor) shall route correctly.
7. THE test suite SHALL use vitest as the test framework; the Proof360_API SHALL NOT use any other test framework.
8. THE test suite SHALL mock VERITAS for adapter tests; the test suite SHALL NOT make real VERITAS HTTP calls.

### Requirement 25: Audit Boundary Separation

**User Story:** As a platform operator, I want three distinct audit domains that reference each other but never mirror, so that each domain is independently replayable and testable.

#### Acceptance Criteria

1. THE `signal_events` table SHALL own input mutation audit; replay of `signal_events` SHALL reconstruct the override stack chronologically and support recompute pipeline replay against any historical state.
2. THE `engagement_events` table SHALL own commercial state transition audit; replay SHALL reconstruct the lifecycle of an engagement (created → routed → accepted → converted).
3. VERITAS claims SHALL be owned by VERITAS; proof360 SHALL hold `veritas_claim_id` reference only and query VERITAS for chain detail on demand.
4. THE `signal_events` table SHALL NOT duplicate VERITAS claim history.
5. THE `engagement_events` table SHALL NOT duplicate `attribution_ledger` data.
6. THE events tables SHALL reference, never mirror, their related domain tables.

### Requirement 26: Doctrine Enforcement — No Frontend Computation

**User Story:** As a platform operator, I want a hard guarantee that no frontend code computes derived state, so that the doctrine "compute centralised, rendering distributed" holds.

#### Acceptance Criteria

1. THE frontend codebase SHALL NOT contain arithmetic operators used for scoring, filtering, or gap evaluation in any `.jsx` or `.js` file under `frontend/src/`.
2. IF a frontend component ever has reason to compute a number, THEN that component SHALL surface the violation to John as a doctrine breach.
3. THE frontend SHALL render only the `derived_state` JSON returned from the Recompute_Kernel.

### Requirement 27: Doctrine Enforcement — No Ungated Mutation

**User Story:** As a platform operator, I want every mutation to flow through the override contract, so that the doctrine "mutation gated" holds and all truth is replayable.

#### Acceptance Criteria

1. THE Override_Contract (`POST /api/v1/session/:id/override`) SHALL be the sole mutation path for signal state in proof360.
2. THE Override_Contract submission shape `{ actor, reason, timestamp, value, field, session }` SHALL be used by every mutation surface: founder edit, partner correction, MCP agent submission, and any future write surface.
3. THE Proof360_API SHALL NOT provide any alternative mutation endpoint that bypasses the override contract.

### Requirement 28: Cutover Sequence Integrity

**User Story:** As a platform operator, I want the Postgres cutover to follow a strict write → verify → read → cut sequence with no flag flipping, so that no data is lost.

#### Acceptance Criteria

1. THE Proof360_API SHALL follow the cutover sequence: parallel write (Phase 1) → read switch (Phase 8) → backfill (Phase 9) → NDJSON archive (Phase 10).
2. THE Proof360_API SHALL NOT use feature flags to switch between in-memory and Postgres reads; the switch shall be a code change verified by differential testing.
3. WHILE parallel write is active, THE Proof360_API SHALL verify that Postgres rows match in-memory state and NDJSON content.
4. THE editable report (override contract) SHALL NOT ship before the Postgres read switch is complete; the mutation contract requires persistent state.
5. THE Tier 2 attestation (VERITAS adapter) SHALL NOT ship before the Postgres read switch is complete.

### Requirement 29: Locked Deferrals — Explicit Non-Goals

**User Story:** As a platform operator, I want explicit boundaries on what v3.0 does not build, so that scope creep is prevented.

#### Acceptance Criteria

1. THE Proof360_API SHALL NOT build a templating engine in v3.0 until a surface needs multiple branded output formats.
2. THE Proof360_API SHALL NOT build an entitlement system beyond `tenants` table filter in v3.0.
3. THE Proof360_API SHALL NOT build a workflow engine in v3.0.
4. THE Proof360_API SHALL NOT build partial recompute graph or dependency tracking.
5. THE Proof360_API SHALL NOT build v3.1+ surfaces (insurance, AWS programs qualification, buyer, investor, distributor, broker) in v3.0.
6. THE Proof360_API SHALL NOT build full SIGNUM; only the 3-line stub wrapper.
7. THE Proof360_API SHALL NOT integrate SENATE (does not exist on disk).
8. THE Proof360_API SHALL NOT integrate NEXUS as a runtime dependency.
9. THE Proof360_API SHALL NOT build customer-facing token billing; Metronome stays in VECTOR for VECTOR-as-a-service.
10. THE Proof360_API SHALL NOT use any test framework other than vitest.

### Requirement 30: Production Continuity

**User Story:** As a platform operator, I want proof360.au to stay live throughout the entire 10-phase build, so that demo continuity is preserved.

#### Acceptance Criteria

1. WHILE any build phase is in progress, THE Proof360_API SHALL maintain proof360.au as a live, functional service.
2. THE Proof360_API SHALL NOT require a "final big merge"; each phase shall be atomic — complete, verify, then proceed to next.
3. WHEN a phase is complete, THE Proof360_API SHALL produce a handoff via `OPERATOR_HANDOFF.md` documenting what was done, what is in flight, what is next, and decisions made.

