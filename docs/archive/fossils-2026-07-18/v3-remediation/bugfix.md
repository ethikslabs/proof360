# Bugfix Requirements Document

## Introduction

The proof360 v3.0 build is structurally incomplete. A Claude Code audit identified 8 non-negotiable blockers where files and endpoints exist but the system does not satisfy the constitutional doctrines ("compute centralised, mutation gated"). The normal session lifecycle (start → infer → submit → persist gaps → publish → Tier 2 derived state) cannot complete end-to-end. Additionally, several compliance gaps exist around credential management, email formatting, health checks, stub error handling, and backfill correctness.

Source of truth: `docs/proof360-v3-convergence-locked.md` and `docs/kiro-build-brief-v3.md`. Existing v3 spec: `.kiro/specs/proof360-v3/`.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a normal session completes submit and the publish handler reads triggered gaps from Postgres THEN the system finds zero gap rows because `submit.js` never inserts gap rows into the `gaps` table — it writes signals and recon_outputs but not gaps, making Tier 2 publish impossible for any normal session.

1.2 WHEN any read handler (report, inferences, early-signal, program-match) loads session data THEN the system uses the in-memory session as the primary source and queries Postgres only as enrichment/fallback — the in-memory Map remains canonical for reads, violating the Phase 8 read-switch requirement that Postgres is the canonical read source.

1.3 WHEN the Report page renders a session THEN the frontend sorts gaps client-side via `SEVERITY_ORDER`, computes score deltas in `buildNextSteps`, reads engagement state from `localStorage` via `useEngagements`, uses a legacy `SignalPanel` with local `overrides` state instead of the backend override contract, and renders a `LoginGate` with email-based unlock — all of which violate the doctrine that frontends shall not compute or mutate truth.

1.4 WHEN `signal-extractor.js` or `chat.js` make LLM calls THEN they import `OpenAI` directly and construct clients pointing at the gateway URL, bypassing the VECTOR contract enforcement that requires all AI calls to carry `tenant_id`, `session_id`, `correlation_id`. Additionally, `trust-client.js` contains a fallback-confirm-all path where VERITAS/Trust360 unavailability silently confirms all gaps with `{ confirmed: true, mos: 8, fallback: true }`.

1.5 WHEN an override is submitted via `POST /override` THEN the handler trusts the `actor` field from the request body because `resolveActor()` contains a TODO stub that falls back to `bodyActor`. Additionally, when a conflict is resolved via `resolve-conflict`, the handler updates `current_value` to `chosen_value` but does not preserve both prior conflicting values in the `signal_events` row — only `priorValue` (the current_value at resolution time) is stored, losing the other actor's value. Furthermore, recompute after conflict resolution uses the resolved value but the conflict row itself does not record both competing values for audit replay.

1.6 WHEN the recompute kernel returns Tier 1 output (before `tier2_published`) THEN the `tier1Gaps` shape includes `severity`, `framework_impact`, `remediation`, `veritas_class`, `veritas_confidence`, and `render_caveat` fields — all of which leak outside the locked Tier 1 shape defined in convergence lock §7 as `{ id, description, confidence, evidence_summary }` plus density and directional_hints only.

1.7 WHEN `Report.jsx` passes `derivedState?.signals` to the `OverridePanel` component THEN the override panel receives an empty array or undefined because the recompute kernel does not return a `signals` array in `derived_state` — it returns gaps, density, directional_hints, and (for Tier 2) trust_score, vendor_recommendations, aws_programs, but never a render-safe signal list with `field`, `current_value`, `inferred_value`, `status`, and conflict metadata needed by the override panel.

1.8 WHEN a developer attempts to run tests THEN no vitest dependency exists in `api/package.json` (only `fast-check` is in devDependencies), no `test` script is defined, and no test files exist for the v3 invariants (override stack, recompute determinism, VERITAS mapping, tier boundary, engagement routing) — only legacy property tests from overnight-v1 exist under `api/tests/property/`.

1.9 WHEN the deploy script provisions Postgres credentials THEN the credentials are read from environment variables but the deploy script does not materialize them from SSM `/proof360/postgres/*` — the SSM-to-env materialization path is missing for Postgres credentials specifically.

1.10 WHEN `capture-email.js` sends an SES email THEN the email body may contain marketing copy or HTML formatting instead of a plain URL only as required by the convergence lock.

1.11 WHEN the deploy script runs a health check THEN it may check `/health` instead of `/api/health`, which returns React frontend HTML through Nginx because only `/api/*` is proxied to the API server.

1.12 WHEN `signum-stub.js` attempts to send a Telegram alert and `TELEGRAM_BOT_TOKEN` is not set THEN the stub crashes or throws an unhandled error instead of gracefully no-oping.

1.13 WHEN the backfill script processes `leads.ndjson` THEN it may skip orphaned leads whose `session_id` does not exist in the `sessions` table, causing the final row count to not match the NDJSON line count.

### Expected Behavior (Correct)

2.1 WHEN a normal session completes submit THEN the system SHALL persist triggered gap rows into the `gaps` Postgres table during the `analyzeAsync` flow in `submit.js`, so that the publish handler can read them and the full session lifecycle (start → infer → submit → persisted gaps → publish → Tier 2 derived state) completes end-to-end.

2.2 WHEN any read handler loads session data THEN the system SHALL read from Postgres as the canonical source, with `session-store.js` serving as a write-through cache only — all read handlers (`report`, `inferences`, `early-signal`, `program-match`, `admin-preread`) SHALL query Postgres directly for signals, gaps, recon_outputs, and session state.

2.3 WHEN the Report page renders a session THEN the frontend SHALL render only `derived_state` JSON from the backend recompute kernel — it SHALL NOT sort gaps client-side, SHALL NOT compute score deltas, SHALL NOT read engagement state from localStorage, SHALL NOT use a legacy SignalPanel with local overrides, and SHALL NOT use a legacy email-based unlock gate. All numbers, gaps, vendor recommendations, and routing options SHALL come from the backend.

2.4 WHEN any service makes an LLM call THEN it SHALL route through VECTOR exclusively — `signal-extractor.js` and `chat.js` SHALL NOT import `OpenAI` directly but SHALL use the VECTOR gateway with `tenant_id`, `session_id`, and `correlation_id` on every call. The `trust-client.js` fallback-confirm-all path SHALL be removed entirely; when VERITAS/Trust360 is unavailable, the system SHALL return an error (not silently confirm all gaps).

2.5 WHEN an override is submitted THEN the system SHALL resolve `actor` from auth context (founder → `founder`, partner portal → `partner:<tenant_id>`, MCP → `mcp:<agent_id>`) instead of trusting the request body. WHEN a conflict is resolved THEN the `signal_events` row SHALL preserve both prior competing values (the value from each conflicting actor). WHEN recompute runs after conflict resolution THEN it SHALL use the latest human-chosen value.

2.6 WHEN the recompute kernel returns Tier 1 output (before `tier2_published`) THEN the system SHALL strip the response to the exact allowed shape: `{ gaps: [{ id, description, confidence, evidence_summary }], density, directional_hints }` — no `severity`, `framework_impact`, `remediation`, `veritas_class`, `veritas_confidence`, or `render_caveat` fields SHALL leak in Tier 1 responses.

2.7 WHEN the recompute kernel returns `derived_state` THEN it SHALL include a render-safe `signals` array with each entry containing `field`, `current_value`, `inferred_value`, `status` (inferred|overridden|conflicted), and conflict metadata — so that the OverridePanel can render the signal list and enable corrections without any client-side computation.

2.8 WHEN a developer runs `npm test` in the `api/` directory THEN vitest SHALL be installed as a devDependency, a `test` script SHALL exist in `api/package.json`, and test files SHALL exist covering: override stack invariants, recompute determinism, VERITAS render mapping, tier boundary enforcement, and engagement routing correctness.

2.9 WHEN the deploy script provisions the API environment THEN it SHALL materialize Postgres credentials from SSM `/proof360/postgres/*` into the `.env` file alongside existing secrets.

2.10 WHEN `capture-email.js` sends an SES email THEN the email body SHALL be a plain URL only with no marketing copy or HTML formatting.

2.11 WHEN the deploy script or ARGUS runs a health check THEN it SHALL use `/api/health` which returns a valid JSON health response from the API server.

2.12 WHEN `signum-stub.js` is called and `TELEGRAM_BOT_TOKEN` is not set THEN the stub SHALL gracefully no-op (log a warning and return) instead of crashing.

2.13 WHEN the backfill script processes `leads.ndjson` THEN it SHALL handle orphaned leads (whose `session_id` does not exist in `sessions`) by either inserting them with a null foreign key or logging them separately, so that the final count reconciliation is accurate and documented.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a session is created via `POST /session/start` THEN the system SHALL CONTINUE TO write to both the in-memory Map and the Postgres `sessions` table in parallel (dual-write pattern preserved).

3.2 WHEN the signal extraction pipeline runs (Firecrawl scrape + LLM extraction) THEN the system SHALL CONTINUE TO extract signals, run the recon pipeline in parallel, and persist results — the extraction flow itself is not changed, only the routing of LLM calls through VECTOR.

3.3 WHEN the recompute kernel runs for a `tier2_published` session THEN the system SHALL CONTINUE TO return the full Tier 2 shape including trust_score, vendor_recommendations, aws_programs, and engagement_router data.

3.4 WHEN the override contract processes a valid override THEN the system SHALL CONTINUE TO append a `signal_events` row, update `current_value`, and trigger a full recompute returning `derived_state`.

3.5 WHEN VERITAS attestation succeeds for at least one gap during publish THEN the system SHALL CONTINUE TO set `sessions.status = 'tier2_published'` and return the full Tier 2 derived_state.

3.6 WHEN the engagement router processes a valid engage request THEN the system SHALL CONTINUE TO insert `engagements`, `engagement_events`, and `attribution_ledger` rows and route across the three branches (john, distributor, vendor).

3.7 WHEN the consumption emitter records an external API call THEN the system SHALL CONTINUE TO append NDJSON records to `api/data/consumption.ndjson` with the correct session_id and source.

3.8 WHEN the demo report page is accessed at `/report/demo` THEN the system SHALL CONTINUE TO render the hardcoded demo report from `frontend/src/data/demo-report.js` without requiring an API connection.

3.9 WHEN existing property tests under `api/tests/property/` (aws-programs, confidence, preread-guard, program-match) are run THEN they SHALL CONTINUE TO pass without modification.

3.10 WHEN the NDJSON write paths for leads and consumption are invoked THEN the system SHALL CONTINUE TO write to NDJSON files as a safety net alongside Postgres writes until explicitly removed.
