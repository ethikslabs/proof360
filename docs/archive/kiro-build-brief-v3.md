# Kiro Build Brief — proof360 v3.0

**For:** Kiro (Builder)
**From:** Claude.ai (Operator)
**Verifier:** Claude Code
**Authority:** John Coates (Final)
**Date:** 2026-04-26
**Source of truth:** `proof360/docs/proof360-v3-convergence-locked.md`

---

## 0. Framing (non-negotiable)

Kiro is **implementing**, not designing.

- Do not reinterpret architecture
- Do not introduce abstractions
- Do not "improve" structure
- Follow contracts exactly

All behaviour must align to:
- Deterministic recompute
- Override contract
- Tier boundary
- Append-only audit
- The doctrine pair: *compute centralised, mutation gated*

If this brief contradicts the lock, the lock wins. Surface contradictions to John before building. One question, do not stack.

**No agent validates own work.** Kiro does not declare done. Claude Code verifies after each phase. John signs off.

---

## 1. Build order (hard sequence)

Each phase has a verification gate before the next phase begins. No parallel guessing. No phase skipping.

---

### Phase 1 — Postgres foundation

**Goal:** Persistent state. Parallel write. NDJSON still canonical.

**Deliverables:**

Create exactly these tables (relational):
- `sessions`
- `signals`
- `gaps`
- `tenants`
- `engagements`
- `leads`

Create exactly these tables (append-only):
- `signal_events`
- `engagement_events`
- `attribution_ledger`

Schema specified in `proof360-v3-convergence-locked.md` §5. Build to that exactly.

**Files:**
- `api/db/migrations/001_v3_schema.sql` — new
- `api/src/db/pool.js` — new (single Postgres pool, env-driven, no ORM)
- `api/src/services/session-store.js` — modify (write to Postgres alongside in-memory)
- `api/src/handlers/submit.js` — modify (write `signals` rows)
- `api/src/handlers/capture-email.js` — modify (write `leads` rows)
- `package.json` — add `pg` dependency

**Rules:**
- Keep existing NDJSON writes
- Keep in-memory map
- Add Postgres writes alongside
- **No read switch yet** — reads still come from in-memory
- Postgres credentials in SSM under `/proof360/postgres/*`

**Verification gate:**
- Run a session end-to-end. Confirm Postgres rows match in-memory state and NDJSON content.
- Reads still in-memory; Postgres write-only this phase.
- Claude Code verifies row counts and integrity across 5 sessions.

---

### Phase 2 — VECTOR contract + consumption ledger

**Goal:** Foundational tracking. Every external call from this point forward tagged with session correlation.

**Deliverables:**

**A. VECTOR contract enforcement**

Every VECTOR call carries:
```
tenant_id      = 'proof360' (or partner tenant when partner portal goes live)
session_id     = <session uuid>
correlation_id = <session uuid>  (same as session_id for proof360)
```

Add `correlation_id` field to VECTOR's `MeteringRecord` schema in `VECTOR/src/metering/metering-emitter.js`. proof360 passes `session_id` as `correlation_id` on every call.

Future-proofing: prepare for VECTOR rate-limit and budget rejection responses (HTTP 429-equivalent). No retry behaviour yet — just structure that surfaces "service capacity reached" to user.

**B. Consumption emitter**

New file `api/src/services/consumption-emitter.js` (~50 LOC). Single function:
```js
consumption.record({ session_id, source, units, unit_type, success, error? })
```

Appends to `api/data/consumption.ndjson`.

Wire into every recon source and external API call:
- `recon-dns.js`, `recon-http.js`, `recon-certs.js`, `recon-ip.js`, `recon-github.js`, `recon-jobs.js`, `recon-hibp.js`, `recon-ports.js`, `recon-ssllabs.js`, `recon-abuseipdb.js`
- `signal-extractor.js` (Firecrawl credit consumption)

**Files:**
- `api/src/services/consumption-emitter.js` — new
- `api/src/services/signal-extractor.js` — modify (pass correlation_id, emit consumption)
- `api/src/services/trust-client.js` — modify (pass correlation_id)
- `api/src/services/nim-client.js` — modify (pass correlation_id)
- All `api/src/services/recon-*.js` files — modify (emit consumption)
- `VECTOR/src/metering/metering-emitter.js` — modify (add correlation_id field)

**Verification gate:**
- Run a session. Confirm `data/metering.ndjson` rows carry `correlation_id == session_id`.
- Confirm `data/consumption.ndjson` rows present for every recon source called.
- Cross-reference: same `session_id` joins both ledgers cleanly.

---

### Phase 3 — Signals + override contract

**Goal:** The only mutation interface in proof360.

**Data shape:**

Each `signals` row supports:
- `inferred_value` — original system inference
- `inferred_source` — e.g. `claude-haiku-via-vector`
- override stack (append-only via `signal_events`)
- `current_value` — materialised from stack head
- `current_actor` — actor who set current value
- `status` — `inferred | overridden | conflicted`

**API:**

```
POST /api/v1/session/:id/override
{
  "field": "stage",
  "value": "Series A",
  "actor": "founder",       // resolved from auth context
  "reason": "user override"
}
```

**Rules (must enforce server-side):**
1. System never overrides human (rescans never undo edits)
2. Overrides are append-only via `signal_events`
3. Latest human override = current_value
4. Cross-actor conflict (e.g. founder vs partner) → `status = 'conflicted'`. **No silent merge.**
5. Recompute uses only `current_value`

**Backend behaviour on override:**
1. Resolve `actor` from auth context (founder → `founder`, partner portal → `partner:<tenant_id>`, MCP → `mcp:<agent_id>`)
2. Insert `signal_events` row (event_type=`overridden`, prior_value, new_value, actor, reason, ts)
3. Append entry to override stack on relevant `signals` row
4. Apply rules above
5. Recalculate `current_value` from stack head
6. Trigger `POST /recompute` (Phase 4) against current state, return full `derived_state`

**Files:**
- `api/src/handlers/override.js` — new
- `api/src/services/signal-store.js` — new (override stack management)
- `api/src/server.js` — modify (register `/override` route)

**Verification gate:**
- Submit overrides via curl, confirm `signal_events` rows append, `current_value` updates.
- Cross-actor conflict scenario: founder=A, partner=B → `status='conflicted'`.
- System rescan attempt does not overwrite human override.
- Claude Code asserts override stack invariants on 10 random scenarios.

---

### Phase 4 — Deterministic recompute kernel

**Goal:** Single source of truth computation. Pure function over persisted state.

**Endpoint:**

```
POST /api/v1/session/:id/recompute
→ input: session_id (URL param)
→ output: full derived_state (no state mutation)
```

**Behaviour:**

1. Load all `signals` for session (with `current_value` materialised)
2. Load recon evidence
3. Run full pipeline:
   - Gap evaluation (`config/gaps.js` triggerCondition over signals + recon context)
   - Trust score computation (Σ severity weights of triggered gaps)
   - AWS programs filter (`config/aws-programs.js`)
   - Vendor matrix selection (`config/vendors.js`)
   - Confidence ribbon derivation
4. Return full `derived_state` JSON

**Rules:**
- **No partial recompute.** Full pipeline every call.
- **No frontend computation.** Frontend receives JSON, renders only.
- **No dependency graph.** No event sourcing on compute path.
- One efficiency carve-out: VERITAS attestation in Phase 5 may re-attest only changed gaps. Recompute kernel itself is always complete.
- Idempotent — multiple calls with no override changes return identical result.

**Files:**
- `api/src/services/recompute.js` — new (pure function, exported)
- `api/src/handlers/recompute.js` — new (endpoint wrapper)
- `api/src/server.js` — modify

**Verification gate:**
- Same input → identical output (determinism test, 100 calls)
- Edit `stage` from "seed" to "Series A" → AWS program filter changes → vendor matrix shifts → trust score updates
- Confirm no frontend computation paths remain anywhere

---

### Phase 5 — Tier boundary + VERITAS full adapter

**Goal:** Diagnostic Tier 1 vs Actionable Tier 2 separation, gated by full VERITAS attestation.

**Why full adapter (not stub):** VERITAS attestation is what makes "governed inference" mean something commercially. proof360 v3.0 carrying real attested claims is the basis of the VECTOR economic case. Stub VERITAS = stub the value prop. Build full per `proof360/docs/veritas-adapter-spec.md`.

**A. Tier 1 (default response shape)**

`GET /api/v1/session/:id/inferences` and any pre-publish endpoints return ONLY:
- Gap candidates (triggered gaps, with evidence)
- Per-gap confidence (high|medium|low)
- Signal density summary: *"14 gaps, 6 high-confidence, 5 medium, 3 low"*
- Directional hints: *"compliance posture appears partial"*

Tier 1 must NOT return:
- Trust score (aggregate)
- Vendor matrix
- Named AWS programs
- Anything implying actionability

This is enforced server-side in recompute kernel based on `sessions.status`. Frontend cannot synthesise Tier-2 content.

**B. Tier 2 trigger**

```
POST /api/v1/session/:id/publish
```

**Behaviour:**
1. Load all triggered gaps for session
2. Build VERITAS adapter call per `veritas-adapter-spec.md`
3. Run `attestBatch(gaps, sessionContext)` against VERITAS
4. Update `gaps` rows with `veritas_claim_id`, `veritas_class`, `veritas_confidence`, `attested_at`
5. Set `sessions.status = 'tier2_published'` only if all gaps successfully attested
6. Return `derived_state` with vendor matrix and engagement router populated

**Failure mode (hard, no fallback-confirm):**
- VERITAS unavailable → publish endpoint returns HTTP 503
- Partial batch failure → publish fails; successfully attested gaps retain claim_id for republish reuse
- `sessions.status` does NOT advance to `tier2_published` on any failure
- **No silent fallback-confirm-all.** This is a deliberate departure from v1 trust-client behaviour.

**C. Republish (revision)**

Subsequent edits + republish: only gaps whose underlying signals changed re-attest. Use `gapsRequiringReattestation` helper from adapter. Successful prior attestations reused.

**D. VERITAS adapter component**

Build `api/src/services/veritas-adapter.js` exactly per `proof360/docs/veritas-adapter-spec.md`. ~200 LOC. Includes:
- `attest(gap, sessionContext)` — single gap
- `attestBatch(gaps, sessionContext)` — parallel via `Promise.allSettled`
- `gapsRequiringReattestation(allGaps, changedSignalIds)` — filter helper
- 3-retry exponential backoff on VERITAS HTTP failures
- Per-gap timeout 30s
- Tenant provisioning: proof360 tenant_id stored in SSM `/proof360/veritas/tenant-id`

**E. Render mapping (server-side, in recompute)**

| VERITAS class | Confidence | Vendor matrix | UI treatment |
|---|---|---|---|
| ATTESTED | > 0.85 | Yes | Standard |
| ATTESTED | ≤ 0.85 | Yes | "Attested with moderate confidence" |
| INFERRED | any | No | "Inferred — not yet attested" |
| UNKNOWN | any | No | "Insufficient evidence to attest" |

**Files:**
- `api/src/services/veritas-adapter.js` — new (per spec)
- `api/src/services/veritas-client.js` — new (thin HTTP wrapper)
- `api/src/handlers/publish.js` — new
- `api/src/services/recompute.js` — modify (Tier-1/Tier-2 conditional rendering based on `sessions.status`)
- `api/src/handlers/inferences.js` — modify (strip Tier-2 fields)
- `api/src/server.js` — modify (register `/publish` route)
- `package.json` — no new deps (reuse existing `node-fetch` or native fetch)

**SSM:**
- `/proof360/veritas/api-key` — VERITAS API key
- `/proof360/veritas/url` — base URL (default `https://veritas.ethikslabs.com`)
- `/proof360/veritas/tenant-id` — provisioned tenant UUID

**Tenant provisioning (one-time, manual before deploy):**
```bash
curl -X POST $VERITAS_URL/tenants \
  -H "x-api-key: $ADMIN_KEY" \
  -d '{"name": "proof360", "owner": "john-coates"}'
```

**Verification gate:**
- VERITAS down → `/publish` returns 503 cleanly. `sessions.status` unchanged.
- VERITAS up → claims persist in `gaps` rows. Vendor matrix renders only attested gaps.
- Tier 1 endpoint never returns score, vendor matrix, or named programs (verified by Claude Code via curl + JSON inspection).
- Republish after edit → only changed signals' gaps re-attest. Unchanged gaps reuse claim_id.
- Mixed batch (3 attested, 2 failed) → publish fails, sessions.status unchanged, attested gaps retain claim_id for next republish attempt.

---

### Phase 6 — Engagement system

**Goal:** Three-branch commercial routing foundation.

**Tables (already created in Phase 1, build behaviour now):**

`engagements` (state):
- id, session_id, selected_branch (`john | distributor | vendor`), routed_tenant_id, vendor_id, status, created_at

`engagement_events` (append-only):
- id, engagement_id, event_type (`created|routed|accepted|rejected|converted`), actor, metadata, ts

`attribution_ledger`:
- id, engagement_id, party (`john | ingram | dicker | vendor:<id>`), share_percentage, expected_amount, expected_date, confirmed_amount, confirmed_date, received_amount, received_date, status

**API:**

```
POST /api/v1/session/:id/engage
{
  "selected_branch": "distributor",
  "vendor_id": "vanta"
}
```

**Behaviour:**
1. Validate session is `tier2_published`
2. Insert `engagements` row (status=`created`)
3. Resolve routing:
   - `john` → internal handling, John commission
   - `distributor` → match `tenants.partner_branch='distributor'` filter, route to first match
   - `vendor` → direct attribution, no routing intermediary
4. Insert `engagement_events` row (event_type=`routed`)
5. Insert `attribution_ledger` rows with `expected_amount` / `expected_date` per known party
6. Trigger `signum.send()` stub (Phase 7) for Telegram alert to relevant tenant

**Files:**
- `api/src/handlers/engage.js` — new
- `api/src/services/engagement-router.js` — new
- `api/src/server.js` — modify

**Verification gate:**
- All three branches route correctly
- `engagement_events` rows append on every state transition
- `attribution_ledger` carries expected/confirmed/received column structure (even if values nullable)
- No single-table shortcut — state, events, money are distinct tables

---

### Phase 7 — Frontend (override panel + tier rendering + engagement router)

**Goal:** Editable report. Right-hand override panel. Binary Tier 1 / Tier 2 rendering. Three-branch engagement router UI.

**Components:**

**A. `frontend/src/components/OverridePanel.jsx`** — new
- Right-hand pop-out panel on report surface
- Lists every signal field with: `current_value`, `inferred_value`, `status` (inferred|overridden|conflicted), edit affordance
- On edit: POST to `/api/v1/session/:id/override`
- On response: re-render report with returned `derived_state`
- Conflict UI: surfaces both prior values, prompts explicit resolution. **Mandatory.** No silent overwrites.

**B. `frontend/src/pages/Report.jsx`** — modify
- Tier 1 rendering when `sessions.status != 'tier2_published'`:
  - Gap candidates + per-gap confidence + density summary
  - **Hide:** trust score (aggregate), vendor matrix, named programs
- "Publish Tier 2" button (label: "This is mine — generate vendor matrix")
- On publish: POST to `/api/v1/session/:id/publish`, await response (may take 30s+ for VERITAS batch)
- Tier 2 rendering when `sessions.status = 'tier2_published'`:
  - Trust score, vendor matrix, AWS programs, engagement router
  - **Binary unlock — no progressive states.** Loading spinner during publish, then full Tier 2.

**C. `frontend/src/components/EngagementRouter.jsx`** — new
- Three branches: john / distributor / vendor direct
- Per gap or per vendor: pick branch
- On selection: POST to `/api/v1/session/:id/engage`

**Rules:**
- **No frontend computation.** Frontend renders `derived_state` returned from backend. Period.
- All numbers, all gaps, all vendor recommendations come from backend recompute response.
- If frontend ever has reason to compute a number, that's a doctrine violation — surface to John.

**Files:**
- `frontend/src/components/OverridePanel.jsx` — new
- `frontend/src/components/EngagementRouter.jsx` — new
- `frontend/src/pages/Report.jsx` — modify
- `frontend/src/pages/AuditColdRead.jsx` — modify (Tier 1 rendering, no score)

**Verification gate:**
- Edit `stage` via override panel → recompute → vendor matrix updates in UI
- Tier 1 → Tier 2 transition: publish click → spinner → binary unlock
- Conflict scenario: founder edits, simulated partner override → conflict UI appears
- Frontend code search: no math, no scoring, no filtering logic in `.jsx` files (Claude Code greps for arithmetic operators in JSX)

---

### Phase 8 — Postgres read switch (cutover Phase 1)

**Goal:** All read paths come from Postgres. NDJSON writes continue as safety net.

**Deliverables:**

Modify all read handlers to query Postgres:
- `GET /api/v1/session/:id/inferences`
- `GET /api/v1/session/:id/report`
- `GET /api/v1/session/:id/early-signal`
- `GET /api/admin/preread/:batch_id`
- `GET /api/program-match/:session_id` ← also fixes `signals_object` collision (see §3 of this brief)

In-memory `session-store.js` becomes write-through cache. Reads from Postgres.

**Files:**
- `api/src/handlers/inferences.js` — modify
- `api/src/handlers/report.js` — modify
- `api/src/handlers/early-signal.js` — modify
- `api/src/handlers/admin-preread.js` — modify
- `api/src/handlers/program-match.js` — modify (key collision fix)

**Verification gate:**
- All endpoints return identical JSON pre- and post-migration
- Differential test: 10 random sessions, compare in-memory vs Postgres reads, assert byte-equal
- No silent data loss

---

### Phase 9 — Backfill + verification

**Goal:** Historical NDJSON data replayed into Postgres.

**Deliverables:**
- `scripts/backfill-leads.js` — replay `leads.ndjson` → `leads` table
- Any preserved session data in NDJSON form → respective tables
- Verification: row counts match, content integrity

**Files:**
- `scripts/backfill-leads.js` — new

**Verification gate:**
- `wc -l leads.ndjson` matches `SELECT COUNT(*) FROM leads`
- Spot-check 5 historical leads — content matches
- Foreign key integrity (no orphaned rows)

---

### Phase 10 — Cleanup + out-of-band fixes

**Goal:** v3.0 production-ready. Out-of-band fixes complete. NDJSON archive only.

**A. NDJSON cutover**
- Remove NDJSON read paths from code
- NDJSON files retained as archive
- Optional: remove NDJSON write paths after sustained Postgres confidence

**B. Out-of-band fixes (from lock §15):**

1. **`signals_object` / `signals` key collision** — already fixed in Phase 8; verify
2. **`capture-email` SES wiring** — wire SES integration. Send Layer-2 report URL on email capture. Domain verified for `proof360.au`. Plain template — link only, no marketing copy.
3. **Auth0 dev → production** — replace hardcoded `dev-nfpt3dibp2qzchiq.au.auth0.com` in `Portal.jsx` with env-driven config. Production tenant provisioned (separate task, John handles outside Kiro).
4. **`gpu-manager.js` deletion** — delete file. Remove all references. NIM runs via hosted free tier through VECTOR — no GPU lifecycle to manage.
5. **ARGUS `/api/health` correction** — update `ARGUS/config/services.json` for proof360 entry: health endpoint = `/api/health` (not `/health`). Currently returns React HTML on `/health` because Nginx only proxies `/api/*`.

**C. SIGNUM stub**

Three-line wrapper at `api/src/services/signum-stub.js`:
```js
export async function send({ channel, to, message }) {
  // v3.0 stub — direct Telegram while SIGNUM is pre-build
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: to, text: message })
  });
}
```
Called from engagement router on lead arrival. Will be replaced by real SIGNUM later.

**D. Test suite scaffolding (vitest)**

Cover at minimum:
- Override stack rules (system never beats human, conflict detection)
- Recompute determinism (same input → same output)
- VERITAS adapter (mock VERITAS, verify ATTESTED|INFERRED|UNKNOWN mapping)
- Tier boundary (Tier 1 endpoint never returns score; Tier 2 only after publish)
- Engagement routing (three branches behave correctly)

**Files:**
- `api/src/services/signum-stub.js` — new
- `api/src/handlers/capture-email.js` — modify (SES integration)
- `frontend/src/components/Portal.jsx` — modify (env-driven Auth0)
- `api/src/services/gpu-manager.js` — DELETE
- `ARGUS/config/services.json` — modify (proof360 health endpoint)
- `api/tests/` — new test suite

**Verification gate:**
- Full session walkthrough end-to-end against Postgres only
- ARGUS shows green via `/api/health`
- Telegram alert fires on lead arrival
- SES delivers Layer-2 report email
- `gpu-manager.js` confirmed deleted, no references remain
- Test suite passes
- Claude Code produces final verifier report

---

## 2. Constraint table — named attack paths

| # | Attack path | Defence | Phase |
|---|---|---|---|
| 1 | Frontend computes derived state, drifts from backend | Doctrine: rendering distributed, compute centralised. Code search rejects arithmetic in JSX. | 4, 7 |
| 2 | Override silently overwrites cross-actor correction | `status='conflicted'` on cross-actor mismatch. Conflict UI mandatory. | 3, 7 |
| 3 | System rescan undoes user edit | Override stack rule: system never beats human. | 3 |
| 4 | Tier 1 leaks Tier-2 content (vendor names, score) | Recompute kernel checks `sessions.status`; Tier-1 endpoint strips actionable fields server-side. | 5 |
| 5 | VERITAS down → silent fallback-confirm-all | Hard departure: 503 returned, publish blocked. No fallback. | 5 |
| 6 | proof360 calls Anthropic/NIM/OpenAI directly, bypassing VECTOR | Code review gate: every external AI client uses VECTOR endpoint. | All |
| 7 | NDJSON-to-Postgres data loss during cutover | Parallel write → read switch → backfill → verify → cut. Never flag-flip. | 1, 8, 9, 10 |
| 8 | gpu-manager called somewhere, fails on missing env | Delete file, scan for references, remove. | 10 |
| 9 | Auth0 dev tenant ships to production | Env-driven config, prod tenant gate before deploy. | 10 |
| 10 | Email gate captures lead but no email delivered | SES wired, delivery verified end-to-end. | 10 |
| 11 | VECTOR Phase-3 rate limit crashes proof360 | Handle 429-equivalent: surface to user, exponential retry max 3. | 2 |
| 12 | Single-table engagement model (state + events + money collapsed) | Three distinct tables: engagements, engagement_events, attribution_ledger. | 1, 6 |

---

## 3. Required fixes (from lock §15)

Already distributed across phases above:
- `signals_object` / `signals` key collision → Phase 8
- `capture-email` SES wiring → Phase 10
- Auth0 dev → production → Phase 10 (env config), John handles tenant provisioning separately
- `gpu-manager.js` deletion → Phase 10
- ARGUS `/api/health` → Phase 10

---

## 4. Explicit non-goals (Kiro must NOT build)

- Templating engine
- Entitlement system (beyond `tenants` table filter)
- Workflow engine
- Partial recompute graph / dependency tracking
- Frontend computation logic (any math in JSX)
- v3.1+ surfaces (insurance, AWS programs, buyer, investor, distributor, broker)
- Full SIGNUM build (3-line stub only)
- SENATE integration (does not exist)
- NEXUS runtime integration (no runtime exists)
- Customer-facing token billing (Metronome stays in VECTOR for VECTOR-as-a-service, separate track)
- Test framework other than vitest

---

## 5. Output expectation per phase

Each phase produces:
- Working endpoint(s) or component(s)
- Testable behaviour (verification gate satisfied)
- No broken existing flow (proof360.au stays live throughout)
- Phase handoff via `OPERATOR_HANDOFF.md` + Apple Notes session note

**No "final big merge."** Phases are atomic. Each completes, verifies, then the next begins.

---

## 6. Success criteria for v3.0 done

All must be true:

1. Postgres is canonical state. NDJSON is archive only.
2. Editable report works end-to-end. Override panel submits, recompute returns updated derived_state, UI re-renders.
3. Tier 1 → Tier 2 transition is binary. No progressive attestation visible in UI.
4. VERITAS attestation gates vendor matrix. Failure blocks publish cleanly with 503. No fallback-confirm.
5. Three-branch engagement router routes leads correctly. Telegram alert fires. attribution_ledger carries expected/confirmed/received columns.
6. Dual-ledger consumption metering: every session emits VECTOR token records (with correlation_id) and proof360 scan records (consumption.ndjson). PULSUS aggregates by session_id.
7. Production Auth0 tenant is live. No dev-tenant references in production code.
8. SES delivers Layer-2 report emails.
9. ARGUS shows green via `/api/health`.
10. Test suite covers override rules, recompute determinism, VERITAS adapter, tier boundary.
11. `gpu-manager.js` deleted. `signals_object` collision fixed. No dead code from v1.
12. proof360.au stays live throughout build. Demo continuity preserved.
13. Doctrine pair holds: no frontend computation, no ungated mutation paths.

---

## 7. Authority chain

```
John Coates (Final Authority)
   ↑
Claude.ai (Operator) — wrote this brief, owns convergence to lock
   ↑
Kiro (Builder) — executes against this brief
   ↑
Claude Code (Verifier) — reviews after each phase
   ↓
John Coates signs off
```

When this brief contradicts the lock, the lock wins. When the lock is silent, decide and act, report what was done. When neither covers a case, surface to John (one question, do not stack).

---

## 8. Reporting protocol

After each phase: write to `proof360/OPERATOR_HANDOFF.md` with:
- What was done this phase
- What's in flight
- What's next
- Decisions made

Apple Notes session handoff via existing convention: `HANDOFF — [DD Mon YYYY] ([Time]) [summary line]`.

**Do not declare done.** Report results. John confirms.

---

## 9. Final instruction to Kiro

> Build the system exactly as defined.
> Do not redesign. Do not optimise early.
> Every step must preserve determinism, auditability, and replayability.
> The doctrine pair (compute centralised, mutation gated) holds throughout.
> The lock is the source of truth.

---

*Authority: john-coates*
*Source of truth: proof360-v3-convergence-locked.md*
*VERITAS adapter: full per veritas-adapter-spec.md (no stub — economic basis of VECTOR commercial case)*
