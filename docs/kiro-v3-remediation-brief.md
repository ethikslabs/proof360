# Kiro Remediation Brief — proof360 v3.0 Audit

Date: 2026-04-26
Repo: `/Users/johncoates/Library/CloudStorage/Dropbox/Projects/proof360`

## Executive Finding

The v3.0 implementation is structurally incomplete. Kiro created many v3-shaped files and endpoints, but the system does not yet satisfy the constitutional doctrines:

- Compute centralised, rendering distributed.
- Mutation gated, reads unrestricted.
- All decisions are derived. All mutations are explicit. All truth is replayable.

Treat the current state as a partial scaffold, not a shippable v3.0 build.

## Non-Negotiable Blockers

### 1. Tier 2 publish cannot work for normal sessions

`POST /api/v1/session/:id/publish` reads triggered gaps from Postgres:

- `api/src/handlers/publish.js`
- Query: `SELECT * FROM gaps WHERE session_id = $1 AND triggered = true`

But the normal analysis path does not insert `gaps` rows into Postgres:

- `api/src/handlers/submit.js`
- It writes signals and recon outputs only.

Required fix:

- Persist triggered gap rows during analysis.
- Persist `gap_def_id`, `triggered`, `severity`, `framework_impact`, and evidence.
- Ensure publish has rows to attest.
- Ensure recompute can evaluate and return derived state from persisted signals/recon/gaps.

Relevant requirements:

- Requirement 2
- Requirement 6
- Requirement 8
- Requirement 10
- Requirement 28

### 2. Postgres read switch is not complete

Several read handlers still use the in-memory session as the primary source and Postgres only as enrichment or fallback.

Examples:

- `api/src/handlers/report.js`
- `api/src/handlers/inferences.js`
- `api/src/handlers/early-signal.js`
- `api/src/handlers/program-match.js`

Required fix:

- Move read handlers to Postgres as canonical source.
- `session-store.js` should become write-through cache only.
- No handler should require in-memory pipeline state after persisted phase completion.
- Preserve response shape where legacy endpoints still exist.

Relevant requirements:

- Requirement 16
- Requirement 28

### 3. Frontend still computes and mutates outside doctrine

`frontend/src/pages/Report.jsx` still:

- Sorts gaps client-side.
- Filters Layer 2/vendor intelligence client-side.
- Computes score deltas.
- Uses localStorage engagement state.
- Uses legacy email unlock behavior.
- Renders mostly from the old `report` object, not backend `derived_state`.

Examples:

- `sortedGaps = [...(report.gaps || [])].sort(...)`
- `report.trust_score + topGap.score_impact`
- `gap={(locked || (!isTier2 && !isDemo)) ? { ...gap, vendor_intelligence: null } : gap}`
- localStorage engagement flow in `useEngagements`

Required fix:

- Report page must render only `derived_state` from backend recompute/report endpoints.
- Remove client-side scoring, sorting, filtering, gap evaluation, vendor gating, and routing decisions.
- Engagement state must come from backend engagement endpoints, not localStorage.
- Email capture must not locally unlock Tier 2; only `publish` can move to `tier2_published`.

Relevant requirements:

- Requirement 7
- Requirement 13
- Requirement 14
- Requirement 15
- Requirement 26
- Requirement 27

### 4. VECTOR contract is not fully enforced

Current code still imports the OpenAI SDK directly and keeps NIM/Trust360 fallback behavior.

Examples:

- `api/src/services/signal-extractor.js` imports `OpenAI`.
- `api/src/handlers/chat.js` imports `OpenAI`.
- `api/src/services/trust-client.js` routes NIM, then Trust360, then fallback-confirm-all.
- `api/src/services/nim-client.js` remains a direct NIM client wrapper.

Required fix:

- proof360 must call VECTOR only for LLM inference.
- Remove direct Anthropic/OpenAI/NIM bypass paths from proof360.
- Remove confirm-all fallback behavior.
- Ensure every VECTOR call includes:
  - `tenant_id`
  - `session_id`
  - `correlation_id`
- Surface rate limit and sovereignty block errors to users.

Relevant requirements:

- Requirement 3
- Requirement 8.12

### 5. Override contract is incomplete

Current `override` handler trusts `actor` from request body.

File:

- `api/src/handlers/override.js`

Current conflict behavior sets `signals.status = 'conflicted'`, but does not update `current_value` to the latest human value. Requirement 5.7 says recompute should still run against the latest human value.

File:

- `api/src/services/signal-store.js`

Required fix:

- Resolve actor from auth context.
- Request body should not be trusted for actor identity.
- Override submission shape must include `{ actor, reason, timestamp, value, field, session }` consistently at every signal mutation surface.
- Conflict rows must preserve both prior values and expose them for resolution.
- Recompute must use the latest human value while surfacing conflict status.

Relevant requirements:

- Requirement 5
- Requirement 13
- Requirement 27

### 6. Recompute Tier 1 leaks fields outside the locked shape

Before `tier2_published`, recompute returns extra fields on gaps:

- `severity`
- `framework_impact`
- `remediation`
- `veritas_class`
- `veritas_confidence`
- `render_caveat`

File:

- `api/src/services/recompute.js`

Locked Tier 1 shape is:

```js
{
  gaps: [{ id, description, confidence, evidence_summary }],
  density: { total, high, medium, low },
  directional_hints: string[]
}
```

Required fix:

- Strip Tier 1 output to the exact allowed shape.
- Do not return trust score, vendor matrix, named AWS programs, remediation, framework impact, routing, or attestation detail before Tier 2 publish.

Relevant requirements:

- Requirement 7
- Requirement 14
- Requirement 24.5

### 7. Override panel cannot list signals

`Report.jsx` passes `derivedState?.signals` to `OverridePanel`, but recompute does not return `signals`.

Files:

- `frontend/src/pages/Report.jsx`
- `frontend/src/components/OverridePanel.jsx`
- `api/src/services/recompute.js`

Required fix:

- Backend must return a render-safe signal list for override UI, or provide a dedicated read endpoint for persisted signals.
- Shape must include:
  - `field`
  - `current_value`
  - `inferred_value`
  - `status`
  - conflict metadata when conflicted
- Frontend must not infer or compute signal status.

Relevant requirements:

- Requirement 13

### 8. Vitest suite is missing

`api/package.json` has no `vitest` dependency and no `test` script.

Current scripts:

```json
{
  "start": "...",
  "dev": "...",
  "test:log": "node scripts/test-log.js"
}
```

Required fix:

- Add Vitest.
- Add API test script.
- Add tests for:
  - override stack rules
  - recompute determinism
  - VERITAS render mapping
  - VERITAS unavailable publish failure
  - Tier 1 boundary
  - engagement routing branches
- Mock VERITAS; no live VERITAS HTTP calls.

Relevant requirements:

- Requirement 24
- Requirement 29.10

## Additional Compliance Gaps

### Postgres credentials

`api/src/db/pool.js` reads `PG_*` environment variables directly. Requirement 1.6 says credentials must come from AWS SSM under `/proof360/postgres/*`.

Fix:

- Deploy script may materialize SSM values into env, but this must be explicit and documented.
- If Kiro chooses app-level SSM fetch, implement it in one place before pool creation.

### Schema exactness

Migration exists:

- `api/db/migrations/001_v3_schema.sql`

But verify exact match against convergence lock §5. Known risk:

- `signal_events` currently cannot capture both conflicting prior values in a structured way.
- `sessions.status` enum may be too narrow for pipeline states.
- Signal values are `TEXT`; lock may require JSONB flexibility depending on final signal schema.

### SES email body

Requirement says the email contains a plain report link only, with no marketing copy.

Current body includes:

```text
Your trust readiness report is ready:

<url>
```

Fix:

- Body should be exactly the URL, or at most a plain URL line.

### ARGUS health

API exposes both `/health` and `/api/health`.

Deploy script still checks `/health`:

- `scripts/deploy.sh`

No `ARGUS/config/services.json` exists in this repo.

Fix:

- Update deploy verification to `/api/health`.
- Update ARGUS repo/config separately if it lives outside proof360.

### SIGNUM stub

`api/src/services/signum-stub.js` exists and sends Telegram via Bot API. It is more than a literal three-line wrapper but is functionally replaceable.

Risk:

- It does not check missing `TELEGRAM_BOT_TOKEN` or failed Telegram responses.
- Current call site alerts a generic chat ID, not necessarily relevant tenant.

### Backfill script

`scripts/backfill-leads.js` exists.

Risk:

- It skips orphaned leads, but Requirement 17.2 says Postgres row count must match `leads.ndjson` line count. If historical sessions are missing, this cannot pass.

Kiro must choose:

- Create missing session stubs during backfill, or
- Amend acceptance criteria, or
- Require historical sessions to be backfilled first.

## Required Implementation Order

Do not continue feature work before repairing the cutover sequence.

### Phase A — Persistence correctness

1. Make `submit` persist all required signal rows.
2. Make `submit` persist triggered gap rows.
3. Persist recon outputs reliably.
4. Persist enough session state for report/inference/status reads.
5. Add verification logging or differential checks for in-memory vs Postgres vs NDJSON during parallel write.

### Phase B — Postgres read switch

1. Convert read handlers to Postgres canonical reads:
   - `GET /api/v1/session/:id/inferences`
   - `GET /api/v1/session/:id/report`
   - `GET /api/v1/session/:id/early-signal`
   - `GET /api/admin/preread/:batch_id`
   - `GET /api/program-match/:session_id`
2. Keep `session-store.js` as write-through cache only.
3. Remove code comments that claim Phase 8 while still reading memory.

### Phase C — Recompute as canonical output

1. Make `recompute()` the only derived-state producer.
2. Ensure report endpoint returns derived state, or wraps it without adding frontend-computed assumptions.
3. Fix Tier 1 exact output stripping.
4. Add signal list output for override UI.
5. Persist or expose conflict metadata.

### Phase D — VERITAS publish

1. Use persisted triggered gaps.
2. Attest all triggered gaps on first publish.
3. Reuse successful claims on republish.
4. Re-attest only changed gaps.
5. Never fallback-confirm gaps.
6. Keep previous Tier 2 view during republish.

### Phase E — Frontend doctrine cleanup

1. Rewrite `Report.jsx` to render backend `derived_state`.
2. Remove client-side score math, gap sorting/filtering, vendor gating, AWS program matching, and engagement localStorage.
3. Wire `OverridePanel` to backend-provided signal list.
4. Wire `EngagementRouter` only to backend-provided routing options.
5. Remove legacy email gate as Layer 2 unlock. Email capture is lead capture/email delivery only.

### Phase F — VECTOR cleanup

1. Remove direct OpenAI SDK usage from proof360 app code.
2. Remove direct NIM client path.
3. Route all inference through VECTOR contract.
4. Remove Trust360 confirm-all fallback.
5. Ensure user-facing errors for 429 and sovereignty blocks.

### Phase G — Tests

1. Add Vitest.
2. Add v3 invariant tests.
3. Mock VERITAS.
4. Add a doctrine test that scans frontend for prohibited derived-state computation.

## Verification Commands

Current status from audit:

```bash
cd frontend && npm run build
# passes

cd frontend && npm run lint
# fails: 33 errors, 8 warnings
```

API currently has no real test command for v3:

```bash
cd api && npm run test
# missing
```

## Minimum Definition of Done

Kiro should not mark v3.0 complete until all are true:

1. Normal session can complete start -> infer -> submit -> persisted gaps -> publish -> Tier 2 derived state.
2. API restart does not lose completed session/report state.
3. Report page renders from backend derived state only.
4. Tier 1 response contains no score, vendor matrix, AWS programs, remediation, routing, or attestation detail.
5. VERITAS unavailable returns 503 and does not publish.
6. No confirm-all fallback remains.
7. No direct Anthropic/OpenAI/NIM bypass remains in proof360.
8. Override conflict recomputes against latest human value and surfaces conflict for explicit resolution.
9. Engagement routing writes `engagements`, `engagement_events`, and `attribution_ledger`.
10. Vitest suite covers all Requirement 24 invariants.
11. Frontend lint passes.
12. `OPERATOR_HANDOFF.md` exists and documents current phase, completed work, risks, and next steps.

