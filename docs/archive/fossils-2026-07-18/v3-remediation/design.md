# v3 Remediation Bugfix Design

## Overview

The proof360 v3.0 build is structurally incomplete. A Claude Code audit identified 8 non-negotiable blockers plus 5 compliance gaps where files and endpoints exist but the system cannot complete a normal session lifecycle end-to-end. The constitutional doctrines ("compute centralised, mutation gated") are violated at multiple layers.

This remediation brings the existing implementation into compliance with the v3 spec at `.kiro/specs/proof360-v3/`. It does not redesign — it fixes. The remediation follows a 7-phase order (A–G) that respects data dependencies: persistence must be correct before reads can switch, reads must switch before recompute becomes canonical, and recompute must be canonical before the frontend can render derived state only.

Source of truth: `docs/proof360-v3-convergence-locked.md` (architecture lock), `docs/kiro-build-brief-v3.md` (build brief), `.kiro/specs/proof360-v3/` (v3 spec). When this document contradicts the lock, the lock wins.

## Glossary

- **Bug_Condition (C)**: The set of structural incompleteness conditions where the v3 implementation diverges from the v3 spec — missing gap persistence, in-memory reads as canonical, frontend computation, direct OpenAI imports, Tier 1 field leaks, missing signal list, missing tests, and compliance gaps
- **Property (P)**: The desired behavior where each divergence is corrected to match the v3 spec exactly — full session lifecycle completes, Postgres is canonical, frontend renders derived_state only, VECTOR contract enforced, Tier 1 shape locked, override panel functional, tests pass
- **Preservation**: Existing behaviors that must remain unchanged — dual-write pattern, demo report, extraction pipeline, NDJSON safety net writes, existing property tests, engagement routing, consumption metering
- **Recompute_Kernel**: `api/src/services/recompute.js` — the deterministic pure function that computes derived_state from persisted signals + recon_outputs + gaps
- **Override_Contract**: `POST /api/v1/session/:id/override` — the single mutation surface for signal state
- **VERITAS_Adapter**: `api/src/services/veritas-adapter.js` — translation layer for VERITAS evidence/claim API
- **Tier_Boundary**: Structural separation between Tier 1 (diagnostic) and Tier 2 (actionable) content, enforced server-side in the recompute kernel
- **derived_state**: The JSON payload returned by the Recompute_Kernel — the only data the frontend renders

## Bug Details

### Bug Condition

The bug manifests across 8 structural blockers and 5 compliance gaps that prevent the v3 session lifecycle from completing end-to-end. The system has v3-shaped files but does not satisfy the constitutional doctrines.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { handler, endpoint, component, service }
  OUTPUT: boolean

  RETURN (input.handler == 'submit' AND NOT gapsPersistedToPostgres(input))
         OR (input.handler IN ['report','inferences','early-signal','program-match'] AND readsFromInMemoryAsCanonical(input))
         OR (input.component == 'Report.jsx' AND computesDerivedStateClientSide(input))
         OR (input.service IN ['signal-extractor','chat'] AND importsOpenAIDirectly(input))
         OR (input.service == 'trust-client' AND hasFallbackConfirmAll(input))
         OR (input.handler == 'recompute' AND tier1LeaksRestrictedFields(input))
         OR (input.handler == 'recompute' AND NOT returnsSignalListForOverrideUI(input))
         OR (input.handler == 'override' AND trustsActorFromRequestBody(input))
         OR (input.handler == 'resolve-conflict' AND NOT preservesBothPriorValues(input))
         OR (NOT vitestInstalled())
         OR (input.script == 'deploy.sh' AND NOT materializesPostgresSSMCredentials(input))
         OR (input.service == 'signum-stub' AND NOT gracefullyNoOpsOnMissingToken(input))
         OR (input.script == 'deploy.sh' AND checksWrongHealthEndpoint(input))
END FUNCTION
```

### Examples

- **Blocker 1.1**: `POST /session/:id/submit` → `analyzeAsync()` calls `writeSignalsToPostgres()` and `writeReconOutputsToPostgres()` but never calls a `writeGapsToPostgres()` function → `publish.js` queries `SELECT * FROM gaps WHERE session_id = $1 AND triggered = true` → returns 0 rows → Tier 2 publish impossible
- **Blocker 1.2**: `report.js` line 12 calls `getSession(id)` from in-memory Map as primary source, queries Postgres only to merge `_pg_status` → in-memory session expires after 24h TTL → report returns 404 for persisted sessions
- **Blocker 1.3**: `Report.jsx` contains `[...gaps].sort((a,b) => (SEVERITY_ORDER[a.severity]??9) - (SEVERITY_ORDER[b.severity]??9))` and `trustScore + topGap.score_impact` — client-side computation violating doctrine
- **Blocker 1.4**: `signal-extractor.js` line 2: `import OpenAI from 'openai'` — direct SDK import bypassing VECTOR contract; `trust-client.js` line 108: `{ confirmed: true, mos: 8, fallback: true }` — silent fallback-confirm-all
- **Blocker 1.6**: `recompute.js` tier1Gaps includes `severity`, `framework_impact`, `remediation`, `veritas_class`, `veritas_confidence`, `render_caveat` — all outside locked Tier 1 shape
- **Blocker 1.7**: `recompute()` returns `{ derived_state: { gaps, density, directional_hints, ... } }` but no `signals` array — OverridePanel receives undefined
- **Compliance 1.9**: `deploy.sh` materializes `FIRECRAWL_API_KEY`, `ANTHROPIC_API_KEY`, `ABUSEIPDB_API_KEY`, `PORT` from SSM but not `PG_HOST`, `PG_PORT`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD`

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Dual-write pattern: `session-store.js` continues writing to both in-memory Map and Postgres in parallel (Requirement 3.1)
- Signal extraction pipeline: Firecrawl scrape + LLM extraction + recon pipeline runs unchanged; only LLM call routing changes (Requirement 3.2)
- Tier 2 full shape: `tier2_published` sessions continue returning trust_score, vendor_recommendations, aws_programs, engagement_router (Requirement 3.3)
- Override contract behavior: valid overrides append signal_events, update current_value, trigger recompute (Requirement 3.4)
- VERITAS attestation success path: at least one attested gap → `tier2_published` (Requirement 3.5)
- Engagement routing: three branches route correctly with engagements, engagement_events, attribution_ledger rows (Requirement 3.6)
- Consumption metering: NDJSON records appended with correct session_id and source (Requirement 3.7)
- Demo report: `/report/demo` renders from `demo-report.js` without API (Requirement 3.8)
- Existing property tests: `aws-programs`, `confidence`, `preread-guard`, `program-match` tests pass (Requirement 3.9)
- NDJSON safety net writes: leads and consumption continue writing to NDJSON alongside Postgres (Requirement 3.10)

**Scope:**
All inputs that do NOT involve the 8 blockers or 5 compliance gaps should be completely unaffected by this fix. This includes:
- Session creation flow (`POST /session/start`)
- Polling endpoints (`infer-status`, `status`)
- Consumption emitter behavior
- Pulse emitter behavior
- Recon pipeline execution (only LLM routing changes)
- Partner portal auth flows
- Founder auth flows

## Hypothesized Root Cause

Based on the audit, the root causes are:

1. **Incomplete persistence in submit handler**: `submit.js` `analyzeAsync()` was built to write signals and recon_outputs to Postgres but the gap persistence step was never implemented. The `runGapAnalysis()` result contains `gaps` but they are only written to in-memory session state, never to the `gaps` Postgres table.

2. **Premature read-switch claims**: Handler comments say "Phase 8" but the actual code still calls `getSession(id)` from in-memory as the primary path. Postgres queries are used only for enrichment (`_pg_signals`, `_pg_gaps`) or status merging (`_pg_status`), not as canonical reads.

3. **Frontend built before backend was canonical**: `Report.jsx` was built against the old v1 report shape (with client-side sorting, scoring, vendor gating) rather than the v3 `derived_state` shape. The OverridePanel and EngagementRouter components exist but cannot function because the backend doesn't provide the data they need.

4. **VECTOR contract partially enforced**: `signal-extractor.js` and `chat.js` use the OpenAI SDK pointing at the gateway URL, which works functionally but violates the contract that proof360 SHALL NOT import OpenAI directly. The `trust-client.js` fallback-confirm-all was carried over from v1 and never removed.

5. **Tier 1 shape never stripped**: The recompute kernel builds the full gap object with all fields and returns it for Tier 1 — the stripping step that reduces to `{ id, description, confidence, evidence_summary }` was never implemented.

6. **Signal list never added to derived_state**: The recompute kernel returns gaps, density, directional_hints, and (for Tier 2) trust_score/vendors/programs, but never queries and returns the signal rows needed by the OverridePanel.

7. **Deploy script predates Postgres**: The SSM materialization in `deploy.sh` was written before Postgres was added and was never updated to include `PG_*` credentials.

8. **Signum stub has no guard**: The `send()` function calls `fetch()` unconditionally — if `TELEGRAM_BOT_TOKEN` is undefined, the URL becomes `https://api.telegram.org/botundefined/sendMessage` which throws.

## Correctness Properties

Property 1: Bug Condition - Session Lifecycle Completion

_For any_ session that completes the submit flow (corrections + followup_answers submitted), the system SHALL persist triggered gap rows into the `gaps` Postgres table during `analyzeAsync`, AND all read handlers SHALL read from Postgres as canonical source, AND the publish handler SHALL find persisted gap rows to attest, enabling the full lifecycle: start → infer → submit → persisted gaps → publish → Tier 2 derived_state.

**Validates: Requirements 2.1, 2.2, 2.3, 2.6, 2.7**

Property 2: Preservation - Unchanged Behaviors

_For any_ input that does NOT involve the 8 structural blockers or 5 compliance gaps (session creation, polling, consumption metering, demo report, existing property tests, NDJSON writes), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality for non-remediation paths.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**


## Fix Implementation

### Changes Required

The remediation follows a strict 7-phase order (A–G). Each phase addresses specific blockers and has explicit file-level changes.

---

### Phase A — Persistence Correctness

**Addresses:** Blocker 1.1 (submit doesn't persist gaps), Blocker 1.5 (conflict resolution doesn't preserve both prior values)

**Goal:** After `submit`, Postgres contains all data needed for publish and recompute: signals, gaps, and recon_outputs.

#### File: `api/src/handlers/submit.js`

**Change 1: Add `writeGapsToPostgres()` function**

After `runGapAnalysis()` returns `result.gaps`, persist each triggered gap to the `gaps` table. Currently `analyzeAsync()` calls `writeSignalsToPostgres()` and `writeReconOutputsToPostgres()` but has no gap persistence.

```
FUNCTION writeGapsToPostgres(sessionId, gaps)
  FOR EACH gap IN gaps
    INSERT INTO gaps (session_id, gap_def_id, triggered, severity, framework_impact, evidence)
    VALUES (sessionId, gap.gap_id, true, gap.severity, gap.framework_impact, gap.evidence)
    ON CONFLICT (session_id, gap_def_id) DO UPDATE
      SET triggered = true, severity = gap.severity,
          framework_impact = gap.framework_impact, evidence = gap.evidence
  END FOR
END FUNCTION
```

Add call to `writeGapsToPostgres(sessionId, result.gaps)` inside `analyzeAsync()` after `writeSignalsToPostgres()` and `writeReconOutputsToPostgres()`.

**Change 2: Persist all signal fields from context-normalizer output**

Currently `SIGNAL_FIELDS` only includes `['company_name', 'website', 'stage', 'sector', 'primary_use_case']`. Expand to include all fields from the normalized context that the recompute kernel needs: `customer_type`, `data_sensitivity`, `geo_market`, `handles_payments`, `infrastructure`, `compliance_status`, `identity_model`, `insurance_status`, `use_case`.

**Change 3: Add unique constraint for gaps**

The `gaps` table needs a `UNIQUE (session_id, gap_def_id)` constraint to support `ON CONFLICT` upserts. Add this to the migration or as an ALTER.

#### File: `api/db/migrations/001_v3_schema.sql`

**Change:** Add `UNIQUE (session_id, gap_def_id)` constraint to the `gaps` table if not already present.

#### File: `api/src/services/signal-store.js`

**Change: Preserve both prior values in conflict resolution**

In `resolveConflict()`, the `signal_events` row currently stores only `priorValue` (the `current_value` at resolution time) as `prior_value` and `chosen_value` as `new_value`. It does not capture the other actor's competing value.

Fix: Before resolving, query the most recent `signal_events` rows for this signal to find both competing values. Store them in the `reason` field as structured JSON: `{ resolved_from: { actor1: value1, actor2: value2 }, chosen: chosen_value, reason: user_reason }`. This preserves both prior values for audit replay without schema changes.

#### File: `api/src/handlers/override.js`

**Change: Add TODO-aware actor resolution**

The `resolveActor()` function currently returns `bodyActor` directly. While full Auth0 middleware is a separate concern, add a guard that logs a warning when the actor is trusted from the body, and structure the function to accept auth context when available:

```js
function resolveActor(request, bodyActor) {
  // Auth0 middleware sets request.user when available
  if (request.user) {
    if (request.user.tenant_id) return `partner:${request.user.tenant_id}`;
    if (request.user.agent_id) return `mcp:${request.user.agent_id}`;
    return 'founder';
  }
  // Fallback: trust body actor (pre-Auth0 only)
  console.warn(JSON.stringify({ event: 'actor_from_body', actor: bodyActor, session_id: request.params.id }));
  return bodyActor;
}
```

---

### Phase B — Postgres Read Switch

**Addresses:** Blocker 1.2 (read handlers use in-memory as canonical)

**Goal:** All read handlers query Postgres as the canonical source. `session-store.js` becomes write-through cache only.

#### File: `api/src/handlers/report.js`

**Change: Rewrite to read from Postgres canonically**

Replace the current flow (line 12: `getSession(id)` → in-memory primary, Postgres enrichment) with:

1. Query `sessions` table for session row
2. Query `signals` table for all signals
3. Query `gaps` table for all gaps
4. Query `recon_outputs` table for all recon data
5. Call `recompute()` with Postgres data
6. Return `derived_state` from recompute result

The report handler becomes a thin wrapper around the recompute kernel. Remove all legacy functions: `buildStrengths()`, `buildNextSteps()`, `buildSignals()`, `buildReconSummary()`, `buildAwsActivate()`, `readinessLabel()`. These compute derived state in the handler — the recompute kernel is the single source of truth.

Remove imports: `getSession` from session-store, `buildVendorIntelligence` from vendor-intelligence-builder, `extractReconContext` from recon-pipeline.

Add imports: `loadSignals` from signal-store, `recompute` from recompute service, config imports for GAP_DEFINITIONS, VENDORS, AWS_PROGRAMS.

#### File: `api/src/handlers/inferences.js`

**Change: Read from Postgres canonically**

Replace `getSessionWithFallback()` (which reads in-memory first, enriches with Postgres) with direct Postgres reads:

1. Query `sessions` table for session row and pipeline state
2. For pipeline state fields (`infer_status`, `inferences`, `correctable_fields`, `followup_questions`, `company_name`, `source_summary`), these are currently only in-memory. Two options:
   - **Option A (recommended):** Persist these fields to a `session_pipeline_state` JSONB column on the `sessions` table during the extraction pipeline. This is the minimal change that makes the read switch work.
   - **Option B:** Keep in-memory as primary for pipeline-active sessions (infer_status != 'complete'), switch to Postgres for completed sessions. This is a transitional approach.

For the remediation, use Option B as the transitional approach: if the in-memory session exists and `infer_status` is still `processing`, use in-memory. Once `infer_status` is `complete`, read from Postgres. This preserves the active pipeline while making completed sessions persistent.

Remove the `getSessionWithFallback()` function that merges `_pg_signals`, `_pg_gaps`, `_pg_recon_outputs` onto the in-memory session.

#### File: `api/src/handlers/early-signal.js`

**Change: Read from Postgres with in-memory fallback for active pipelines**

Same pattern as inferences: for active pipelines, use in-memory; for completed sessions, read from Postgres.

#### File: `api/src/handlers/admin-preread.js`

**Change: Read from Postgres canonically**

Batch preread queries should read from Postgres `sessions` and `signals` tables directly.

#### File: `api/src/handlers/program-match.js`

**Change: Read from Postgres + fix `signals_object`/`signals` key collision**

1. Read signals from Postgres `signals` table instead of in-memory `session.signals_object`
2. Build the signals map from Postgres rows: `{ [field]: current_value }`
3. This eliminates the `signals_object`/`signals` key collision entirely — the Postgres `signals` table is the single source of truth

#### File: `api/src/services/session-store.js`

**Change: Document as write-through cache**

Add a module-level comment: `// Write-through cache. Reads from Postgres are canonical for completed sessions. In-memory serves active pipeline state only.`

The `getSession()` function remains for active pipeline reads. Add `getSessionFromDb()` (already exists) as the canonical read path. Remove or deprecate `getSessionWithDbFallback()` which implies in-memory is primary.

---

### Phase C — Recompute as Canonical Output

**Addresses:** Blocker 1.6 (Tier 1 leaks restricted fields), Blocker 1.7 (no signal list for override UI)

**Goal:** The recompute kernel is the single derived-state producer. Tier 1 output is stripped to the exact locked shape. Signal list is included for the override panel.

#### File: `api/src/services/recompute.js`

**Change 1: Strip Tier 1 gaps to exact locked shape**

Current code (around line 230) builds `tier1Gaps` with `severity`, `framework_impact`, `remediation`, `veritas_class`, `veritas_confidence`, `render_caveat`. These fields leak outside the locked Tier 1 shape.

Replace the `tier1Gaps` mapping:

```js
// BEFORE (leaks restricted fields):
const tier1Gaps = gaps.map((g) => ({
  id: g.id, description: g.description, confidence: g.confidence,
  evidence_summary: g.evidence_summary,
  severity: g.severity,                    // LEAK
  framework_impact: g.framework_impact,    // LEAK
  remediation: g.remediation,              // LEAK
  veritas_class: g.veritas_class || null,  // LEAK
  veritas_confidence: g.veritas_confidence || null, // LEAK
  render_caveat: g.render_caveat || null,  // LEAK
}));

// AFTER (exact locked shape):
const tier1Gaps = gaps.map((g) => ({
  id: g.id,
  description: g.description,
  confidence: g.confidence,
  evidence_summary: g.evidence_summary,
}));
```

The `density` object currently uses `{ total, critical, high, medium, low }`. The locked shape is `{ total, high, medium, low }`. Map `critical` count into the density appropriately or keep as-is if the lock permits (lock §7 says "14 signal-bearing gaps identified — 6 high-confidence, 5 medium, 3 low" which maps to confidence levels, not severity). Align density to confidence-based counts: `{ total, high: countHighConfidence, medium: countMediumConfidence, low: countLowConfidence }`.

**Change 2: Add signal list to derived_state**

After building the tier1/tier2 shape, query and include a render-safe signal list. Since `recompute()` is a pure function that receives `signals` as input, build the signal list from the input:

```js
// Build render-safe signal list for override UI
const signalList = signals.map((s) => ({
  field: s.field,
  current_value: s.current_value,
  inferred_value: s.inferred_value,
  status: s.status,  // 'inferred' | 'overridden' | 'conflicted'
  current_actor: s.current_actor || null,
}));
```

Include `signals: signalList` in both Tier 1 and Tier 2 `derived_state` responses. The signal list is not Tier-2-gated — founders need to see and correct signals before publishing.

**Change 3: Ensure density uses confidence-based counts**

The locked Tier 1 shape specifies density as signal density (how many gaps at each confidence level), not severity. Update `computeDensity()` to count by `confidence` field (`high`, `medium`, `low`) rather than `severity` field (`critical`, `high`, `medium`, `low`).

---

### Phase D — VERITAS Publish

**Addresses:** Blocker 1.1 (publish finds zero gaps because they weren't persisted — fixed in Phase A), Blocker 1.4 (fallback-confirm-all in trust-client.js)

**Goal:** Publish uses persisted gaps from Postgres. No fallback-confirm-all behavior anywhere.

#### File: `api/src/handlers/publish.js`

**Change: Verify gap persistence before attestation**

After Phase A, `publish.js` already reads from `gaps` table. Add a guard: if `allGaps.length === 0`, return a clear error instead of silently succeeding with no attestation:

```js
if (allGaps.length === 0) {
  return reply.status(409).send({
    error: 'no_gaps_to_attest',
    message: 'No triggered gaps found for this session. Submit corrections first.',
  });
}
```

This is a safety net — after Phase A, gaps will be persisted. But the guard prevents silent publish-with-no-attestation.

#### File: `api/src/services/trust-client.js`

**Change: Remove fallback-confirm-all path**

In `evaluateClaims()`, the catch block at line ~108 currently falls back to `{ confirmed: true, mos: 8, fallback: true }` when all paths fail. This violates Requirement 8.12 ("SHALL NOT implement fallback-confirm-all behaviour").

Replace the fallback catch with an error result:

```js
// BEFORE:
results[claim.metadata.gapId] = {
  confirmed: true, mos: 8, fallback: true, error: err.message,
};

// AFTER:
results[claim.metadata.gapId] = {
  confirmed: false, error: err.message, unavailable: true,
};
```

Note: `trust-client.js` is used by the legacy `gap-mapper.js` pipeline during submit. The fallback removal means gap confirmation during submit will fail if Trust360/NIM is unavailable. This is acceptable — the v3 architecture separates gap evaluation (recompute kernel, no external calls) from gap attestation (VERITAS, on publish). The `trust-client.js` calls during submit are a legacy path that should eventually be removed entirely, replaced by the recompute kernel's `triggerCondition` evaluation.

---

### Phase E — Frontend Doctrine Cleanup

**Addresses:** Blocker 1.3 (Report.jsx computes derived state client-side), Blocker 1.7 (OverridePanel receives no signals)

**Goal:** `Report.jsx` renders `derived_state` only. No client-side computation. OverridePanel wired to backend signal list.

#### File: `frontend/src/pages/Report.jsx`

**Change: Major rewrite to render derived_state only**

This is the largest single change in the remediation. The current Report.jsx is ~2146 lines with extensive client-side computation. The rewrite:

1. **Remove client-side computation:**
   - Remove `SEVERITY_ORDER` constant and all `.sort()` calls on gaps
   - Remove `buildNextSteps()` function (score trajectory computation)
   - Remove `useEngagements()` hook (localStorage engagement state)
   - Remove `LoginGate` component (legacy email-based unlock)
   - Remove `SignalPanel` component entirely (legacy local-state signal panel with `SIGNAL_OPTIONS`, `SIGNAL_CONFIDENCE`, `signalStatus()`, `STATUS_COLOURS`, `SIGNAL_IMPACT` — all client-side computation)
   - Remove `ScoreBlock` component's score range computation (`Math.min(score + 15, 100)`)
   - Remove `BookingModal` component's direct HubSpot integration (engagement goes through backend)

2. **Wire to derived_state:**
   - Fetch report via `getReport(id)` which returns `derived_state` from the recompute kernel
   - Render gaps directly from `derived_state.gaps` (already sorted/filtered server-side)
   - Render density from `derived_state.density`
   - Render directional_hints from `derived_state.directional_hints`
   - Render trust_score from `derived_state.trust_score` (Tier 2 only — null before publish)
   - Render vendor_recommendations from `derived_state.vendor_recommendations` (Tier 2 only)
   - Render aws_programs from `derived_state.aws_programs` (Tier 2 only)

3. **Wire OverridePanel to backend signals:**
   - Pass `derived_state.signals` (the new signal list from Phase C) to OverridePanel
   - OverridePanel already POSTs to `/override` and calls `onDerivedStateUpdate` — this works

4. **Wire EngagementRouter to backend routing:**
   - Pass `derived_state.vendor_recommendations[i].routing_options` to EngagementRouter
   - EngagementRouter already POSTs to `/engage` — this works

5. **Tier 1/Tier 2 binary rendering:**
   - Check `derived_state.status` — if not `tier2_published`, render Tier 1 only (gaps, density, hints)
   - Show "Publish Tier 2" button that POSTs to `/publish`
   - On publish success, re-render with full Tier 2 derived_state
   - Loading spinner during publish (may take 30s+ for VERITAS batch)

6. **Preserve demo mode:**
   - `/report/demo` continues to render from `demo-report.js` without API
   - Demo path is separate from live report path

#### File: `frontend/src/components/OverridePanel.jsx`

**Change: No changes needed**

The OverridePanel is already correctly implemented — it renders signals from props, POSTs overrides to the backend, and calls `onDerivedStateUpdate` with the response. It does no computation. The only issue was that it received no data because the backend didn't provide a signal list. Phase C fixes that.

#### File: `frontend/src/components/EngagementRouter.jsx`

**Change: Verify it renders backend-provided routing options only**

The EngagementRouter should render `routing_options.primary` as the default action and `routing_options.alternatives` where they exist. It should POST to `/engage` with `{ vendor_id, selected_branch }`. Verify no client-side routing logic exists.

---

### Phase F — VECTOR Cleanup

**Addresses:** Blocker 1.4 (direct OpenAI imports, NIM bypass, fallback-confirm-all)

**Goal:** proof360 calls VECTOR exclusively for LLM inference. No direct Anthropic/OpenAI/NIM imports. No confirm-all fallback.

#### File: `api/src/services/signal-extractor.js`

**Change: Remove direct OpenAI import, use fetch to VECTOR gateway**

Line 2: `import OpenAI from 'openai'` — remove this import.

Replace `extractWithClaude()` function's OpenAI SDK usage with a direct `fetch()` call to the VECTOR gateway:

```js
// BEFORE:
const client = new OpenAI({ baseURL: process.env.AI_GATEWAY_URL || 'http://localhost:3003/v1', apiKey: 'gateway', defaultHeaders });
response = await client.chat.completions.create({ ... });

// AFTER:
const gatewayUrl = process.env.AI_GATEWAY_URL || 'http://localhost:3003/v1';
const res = await fetch(`${gatewayUrl}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Correlation-ID': session_id || 'proof360',
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
    tenant_id: 'proof360',
    session_id: session_id || null,
    correlation_id: session_id || null,
  }),
});
```

This ensures every VECTOR call carries `tenant_id`, `session_id`, `correlation_id` per the v3 contract.

#### File: `api/src/handlers/chat.js`

**Change: Remove direct OpenAI import, use fetch to VECTOR gateway**

Line 2: `import OpenAI from 'openai'` — remove this import.

Replace the module-level `client` constant and the streaming `client.chat.completions.create()` call with a direct `fetch()` to the VECTOR gateway. The streaming behavior must be preserved — use `fetch()` with response body streaming:

```js
const gatewayUrl = process.env.AI_GATEWAY_URL || 'http://localhost:3003/v1';

// In chatHandler:
const res = await fetch(`${gatewayUrl}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Correlation-ID': session_id || 'proof360',
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'system', content: systemPrompt }, ...apiMessages],
    stream: true,
    tenant_id: 'proof360',
    session_id: context?.session_id || null,
    correlation_id: context?.session_id || null,
  }),
});
```

Parse the SSE stream from the fetch response and pipe chunks to `reply.raw.write()`.

#### File: `api/src/services/trust-client.js`

**Change: Remove fallback-confirm-all (already addressed in Phase D)**

Additionally, verify that all VECTOR calls in this file carry `tenant_id`, `session_id`, `correlation_id`. The current code already passes these in the request body — verify the shape matches the contract.

#### File: `api/src/services/nim-client.js`

**Change: No removal needed — NIM routes through VECTOR gateway**

`nim-client.js` already calls the VECTOR gateway URL (`AI_GATEWAY_URL`), not NIM directly. It passes `tenant_id`, `session_id`, `correlation_id`. This file is compliant with the VECTOR contract. The gateway handles NIM routing internally.

However, verify that `trust-client.js` does not bypass VECTOR when calling NIM. Current flow: `trust-client.js` → `nimEvaluateClaim()` → VECTOR gateway → NIM. This is correct — NIM is accessed through VECTOR.

#### File: `api/package.json`

**Change: Consider removing `openai` dependency**

After removing all direct OpenAI imports from `signal-extractor.js` and `chat.js`, the `openai` package is no longer needed. Remove it from `dependencies` to prevent future direct imports.

---

### Phase G — Tests + Compliance Fixes

**Addresses:** Blocker 1.8 (no vitest), Compliance gaps 1.9–1.13

**Goal:** vitest installed, v3 invariant tests pass, compliance gaps closed.

#### File: `api/package.json`

**Change 1: Add vitest devDependency**

```json
"devDependencies": {
  "fast-check": "^4.7.0",
  "vitest": "^3.2.1"
}
```

**Change 2: Add test script**

```json
"scripts": {
  "start": "node --env-file=.env src/server.js",
  "dev": "node --env-file=.env --watch src/server.js",
  "test": "vitest --run",
  "test:log": "node scripts/test-log.js"
}
```

#### New File: `api/vitest.config.js`

Minimal vitest config:

```js
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { globals: true } });
```

#### New File: `api/tests/unit/override-stack.test.js`

Tests for override stack invariants:
- System override SHALL NOT beat human override
- Cross-actor conflict SHALL set `status = 'conflicted'`
- Latest human override = `current_value`
- Conflict resolution preserves both prior values

Mock Postgres via `vi.mock('../db/pool.js')`.

#### New File: `api/tests/unit/recompute-determinism.test.js`

Tests for recompute determinism:
- Same input → identical output across 100 calls
- Edit `stage` → AWS program filter changes → vendor matrix shifts → trust score updates
- Idempotent: no side effects

#### New File: `api/tests/unit/veritas-render-mapping.test.js`

Tests for VERITAS render mapping:
- ATTESTED confidence > 0.85 → included in vendor matrix, standard rendering
- ATTESTED confidence ≤ 0.85 → included with caveat
- INFERRED → excluded from vendor matrix
- UNKNOWN → excluded from vendor matrix
- Mock VERITAS — no real HTTP calls

#### New File: `api/tests/unit/tier-boundary.test.js`

Tests for tier boundary enforcement:
- Tier 1 response contains ONLY `{ gaps: [{ id, description, confidence, evidence_summary }], density, directional_hints, signals, confidence_ribbon }`
- Tier 1 response SHALL NOT contain trust_score, vendor_recommendations, aws_programs, severity, framework_impact, remediation
- Tier 2 response contains full shape

#### New File: `api/tests/unit/engagement-routing.test.js`

Tests for engagement routing:
- `john` branch → internal handling, John commission attribution
- `distributor` branch → matches tenant with `partner_branch = 'distributor'`, ordered by priority
- `vendor` branch → direct attribution, no routing intermediary
- Engagement requires `tier2_published` status

#### File: `scripts/deploy.sh`

**Change: Add Postgres SSM credential materialization**

After the existing SSM reads, add:

```bash
PG_HOST=$(get_ssm "$SSM_PREFIX/postgres/host")
PG_PORT=$(get_ssm "$SSM_PREFIX/postgres/port")
PG_DATABASE=$(get_ssm "$SSM_PREFIX/postgres/database")
PG_USER=$(get_ssm "$SSM_PREFIX/postgres/user")
PG_PASSWORD=$(get_ssm "$SSM_PREFIX/postgres/password")
PG_PORT=${PG_PORT:-5432}
PG_DATABASE=${PG_DATABASE:-proof360}
```

Add to the `.env` write block:

```
PG_HOST=$PG_HOST
PG_PORT=$PG_PORT
PG_DATABASE=$PG_DATABASE
PG_USER=$PG_USER
PG_PASSWORD=$PG_PASSWORD
```

**Change: Fix health check endpoint**

Replace line: `STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/health 2>/dev/null)`

With: `STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/health 2>/dev/null)`

#### File: `api/src/services/signum-stub.js`

**Change: Add graceful no-op when TELEGRAM_BOT_TOKEN is missing**

```js
export async function send({ channel, to, message }) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn(JSON.stringify({ event: 'signum_noop', reason: 'TELEGRAM_BOT_TOKEN not set' }));
    return;
  }
  if (!to) {
    console.warn(JSON.stringify({ event: 'signum_noop', reason: 'no recipient' }));
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: to, text: message }),
    });
  } catch (err) {
    console.error(JSON.stringify({ event: 'signum_send_failed', error: err.message }));
  }
}
```

#### File: `api/src/handlers/capture-email.js`

**Change: Strip email body to plain URL only**

Current SES body: `Your trust readiness report is ready:\n\n${reportUrl}`

Replace with: `${reportUrl}` (plain URL only, no marketing copy per convergence lock).

```js
Body: {
  Text: { Data: reportUrl },
},
```

#### File: `scripts/backfill-leads.js`

**Change: Handle orphaned leads**

When a lead's `session_id` does not exist in the `sessions` table, insert the lead with `session_id` set to NULL (or create a stub session row) and log the orphan. Add a final count reconciliation that reports: total NDJSON lines, inserted rows, orphaned rows.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that exercise the full session lifecycle and assert each blocker manifests. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Gap Persistence Test**: Create a session, submit corrections, query `SELECT * FROM gaps WHERE session_id = $1` — expect 0 rows (will fail on unfixed code, confirming Blocker 1.1)
2. **Read Handler Canonical Source Test**: Create a session, complete analysis, delete from in-memory Map, call `GET /report/:id` — expect 404 because handler reads in-memory first (will fail on unfixed code, confirming Blocker 1.2)
3. **Tier 1 Field Leak Test**: Create a session (not tier2_published), call recompute, inspect response for `severity`, `framework_impact`, `remediation` fields on gaps — expect they are present (will fail on unfixed code, confirming Blocker 1.6)
4. **Signal List Missing Test**: Call recompute, inspect `derived_state.signals` — expect undefined (will fail on unfixed code, confirming Blocker 1.7)
5. **Fallback Confirm Test**: Mock Trust360 as unavailable, run `evaluateClaims()` — expect `{ confirmed: true, fallback: true }` (will fail on unfixed code, confirming Blocker 1.4)

**Expected Counterexamples**:
- `gaps` table has 0 rows after submit completes
- Report handler returns 404 for sessions that exist in Postgres but not in-memory
- Tier 1 response contains `severity`, `framework_impact`, `remediation` fields
- `derived_state.signals` is undefined
- Trust client returns `confirmed: true` when VERITAS is unavailable

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedSystem(input)
  ASSERT expectedBehavior(result)
END FOR
```

Specific fix checks:
- After submit: `SELECT COUNT(*) FROM gaps WHERE session_id = $1 AND triggered = true` > 0
- After read switch: report handler returns valid data for Postgres-only sessions (in-memory expired)
- After Tier 1 strip: recompute response for non-tier2 sessions contains ONLY `{ id, description, confidence, evidence_summary }` per gap
- After signal list: `derived_state.signals` is an array with `{ field, current_value, inferred_value, status }` entries
- After fallback removal: Trust client returns `{ confirmed: false, unavailable: true }` when VERITAS is down
- After VECTOR cleanup: no `import OpenAI` statements in proof360 codebase
- After deploy fix: `.env` contains `PG_HOST`, `PG_PORT`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD`
- After signum fix: `send()` with no `TELEGRAM_BOT_TOKEN` returns without throwing

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-bug inputs, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Recompute Determinism Preservation**: Generate random signal sets and recon_outputs, verify `recompute(input) === recompute(input)` across 100 calls — same inputs always produce identical outputs
2. **Override Stack Preservation**: Generate random sequences of overrides from different actors, verify `current_value` always equals the latest human override's value
3. **Engagement Routing Preservation**: Generate random vendor_id + branch combinations, verify routing produces correct engagements/events/attribution rows
4. **Demo Report Preservation**: Verify `/report/demo` returns identical content before and after remediation
5. **Existing Property Tests Preservation**: Run `aws-programs.property.test.js`, `confidence.property.test.js`, `preread-guard.property.test.js`, `program-match.property.test.js` — all must pass unchanged

### Unit Tests

- Override stack: system never beats human, cross-actor conflict detection, conflict resolution preserves both values
- Recompute determinism: same input → same output, no side effects, idempotent
- VERITAS render mapping: ATTESTED/INFERRED/UNKNOWN → correct vendor matrix inclusion
- Tier boundary: Tier 1 exact shape, Tier 2 full shape, no leaks
- Engagement routing: three branches, tier gate, attribution ledger
- Signum stub: graceful no-op on missing token
- Deploy script: Postgres SSM materialization, correct health endpoint

### Property-Based Tests

- Generate random signal arrays and verify recompute determinism across many inputs
- Generate random override sequences and verify stack head invariant holds
- Generate random gap configurations with VERITAS classes and verify render mapping correctness
- Generate random session statuses and verify tier boundary enforcement

### Integration Tests

- Full session lifecycle: start → infer → submit → verify gaps persisted → publish → Tier 2 derived_state
- Override → recompute → verify derived_state updates
- Conflict → resolution → verify both values preserved in signal_events
- Publish with VERITAS unavailable → verify 503, status unchanged
- Report endpoint returns derived_state from Postgres (not in-memory)
