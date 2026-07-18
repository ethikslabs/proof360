# VERITAS Adapter Spec — proof360 v3

**Component:** `api/src/services/veritas-adapter.js`
**Purpose:** Translate proof360 gap evidence into VERITAS evidence-ingest + claim-generate calls. Map VERITAS responses back to gap state. Replace trust360 in fallback slot during attestation.
**Size estimate:** ~200 LOC
**Build owner:** Kiro
**Verifier:** Claude Code
**Authority:** John Coates
**Source of truth:** `proof360-v3-convergence-locked.md` §8

---

## Position in stack

```
proof360 inference path
├── primary  (every recompute):  NIM Nemotron via VECTOR (trust-client.js, retained)
└── fallback (Tier-2 publish):   VERITAS adapter — this component
```

trust360 retained as second-fallback ONLY during initial VERITAS rollout. Removed once VERITAS attestation is reliable end-to-end across at least 100 sessions.

**Independence guarantee respected:** VERITAS imports nothing from proof360. proof360 imports nothing from VERITAS. The adapter calls VERITAS via HTTP. Provenance flows one way: proof360 submits evidence, VERITAS owns the claim chain.

---

## When the adapter runs

### Trigger 1 — Tier 2 publish (initial)

User clicks "publish Tier 2" in the report UI. Backend handler:

```
POST /api/v1/session/:id/publish
  ↓
load all triggered gaps for session from Postgres
  ↓
for each gap:
   adapter.attest(gap, session_context)
  ↓
update gaps rows with claim_id / claim_class / confidence
  ↓
sessions.status = 'tier2_published'
  ↓
return derived_state (now with vendor matrix populated)
```

### Trigger 2 — Tier 2 republish (revision)

User edits signals after Tier-2 publish, re-publishes. Backend handler:

```
POST /api/v1/session/:id/publish (idempotent on session_id)
  ↓
identify gaps whose underlying signals changed since last attestation
  ↓
for each changed gap only:
   adapter.attest(gap, session_context)
  ↓
update gaps rows
  ↓
return updated derived_state
```

Unchanged gaps retain their existing `veritas_claim_id` and class.

---

## Adapter API (internal)

```js
// api/src/services/veritas-adapter.js

import { getVeritasClient } from './veritas-client.js'  // thin HTTP wrapper

/**
 * Attest a single gap against VERITAS.
 *
 * @param {Object} gap - row from gaps table
 * @param {Object} sessionContext - { session, signals, recon_evidence, tenant_id }
 * @returns {Promise<{ claim_id, claim_class, confidence, reasoning, attested_at }>}
 * @throws AttestationError when VERITAS unavailable or claim generation fails
 */
export async function attest(gap, sessionContext) { ... }

/**
 * Attest a batch of gaps in parallel (Promise.allSettled — partial failures preserved).
 *
 * @param {Array<Object>} gaps - rows from gaps table
 * @param {Object} sessionContext
 * @returns {Promise<Array<{ gap_id, status: 'attested'|'failed', result? , error? }>>}
 */
export async function attestBatch(gaps, sessionContext) { ... }

/**
 * Identify gaps requiring re-attestation after signal changes.
 *
 * @param {Array<Object>} allGaps
 * @param {Array<Object>} changedSignalIds
 * @returns {Array<Object>} gaps that depend on at least one changed signal
 */
export function gapsRequiringReattestation(allGaps, changedSignalIds) { ... }
```

---

## VERITAS contract — submission shape

For each gap:

```js
// Step 1: ingest evidence
POST {VERITAS_URL}/evidence/ingest
Headers:
  x-api-key: {VERITAS_API_KEY}
  content-type: application/json

Body:
{
  "predicate": gap.gap_def_id,                  // e.g. "soc2_attestation"
  "projection": claimTemplate(sessionContext),   // structured claim text
  "content": {
    "signals": session.signals.map(s => ({
      field: s.field,
      value: s.current_value,
      source: s.current_actor,
      confidence: s.confidence
    })),
    "recon_evidence": sessionContext.recon_evidence,
    "gap_evidence": gap.evidence
  },
  "tenant_id": sessionContext.tenant_id,
  "freshness_ttl": 86400  // 24h — recon results decay quickly
}

Response:
{ "evidence_id": "uuid" }

// Step 2: generate claim
POST {VERITAS_URL}/claim/generate
Headers:
  x-api-key: {VERITAS_API_KEY}

Body:
{ "evidence_id": "<from step 1>" }

Response:
{
  "claim_id": "uuid",
  "claim_class": "ATTESTED" | "INFERRED" | "UNKNOWN",
  "confidence": 0.0–1.0,
  "reasoning": "string"
}
```

---

## Claim-class → render mapping

| VERITAS class | Confidence | Render in vendor matrix? | UI treatment |
|---|---|---|---|
| ATTESTED | > 0.85 | Yes | Standard gap card, vendor recommendations |
| ATTESTED | ≤ 0.85 | Yes, with caveat | Caveat: "attested with moderate confidence" |
| INFERRED | any | No (excluded from matrix) | Gap shown, marked "inferred — not yet attested" |
| UNKNOWN | any | No | Gap shown, marked "insufficient evidence to attest" |

This mapping enforced server-side in `recompute.js` Tier-2 path — frontend never makes this decision.

---

## Failure modes (deliberate, hard)

### VERITAS unavailable

- Single attestation throws `AttestationError` after 3 retries with exponential backoff (1s, 2s, 4s).
- Batch attestation: `attestBatch` returns array with mixed `status: 'attested'` and `status: 'failed'` entries.
- `/api/v1/session/:id/publish` handler: if any gap fails attestation, the publish operation fails with HTTP 503:

```json
{
  "error": "veritas_unavailable",
  "message": "Tier-2 attestation could not complete. Please retry.",
  "failed_gaps": ["<gap_id>", "<gap_id>"],
  "partial_results": [...]
}
```

- `sessions.status` does NOT advance to `'tier2_published'`.
- Frontend shows clear retry surface. **No silent fallback-confirm-all.** This is a hard departure from v1 trust-client behaviour.

### Per-gap timeout (>30s)

- Treated as failure for that gap.
- Other gaps in batch continue.
- Failed gaps reported in handler response.

### Partial batch (some attested, some failed)

- Publish operation fails. Tier-2 does not unlock partially.
- `gaps` rows for successfully attested gaps DO update (claim_id persists).
- Republish picks up only the previously failed gaps — successful attestations are reused.

### VERITAS returns UNKNOWN for all gaps

- Publish technically succeeds (no errors).
- Tier-2 unlocks but vendor matrix is empty (UNKNOWN gaps excluded per mapping).
- UI surfaces: "Tier-2 published. Insufficient evidence to attest gaps for vendor recommendations. Add evidence via override panel."

---

## Configuration

### Environment variables

```
VERITAS_URL=https://veritas.ethikslabs.com
VERITAS_API_KEY=<from SSM /proof360/veritas/api-key>
VERITAS_TIMEOUT_MS=30000
VERITAS_MAX_RETRIES=3
```

### SSM paths

- `/proof360/veritas/api-key` — VERITAS API key for proof360 tenant
- `/proof360/veritas/url` — base URL (allows pointing at staging vs production)

### Tenant provisioning

proof360's `tenant_id` is provisioned in VERITAS before adapter goes live. One-time setup:

```bash
# On VERITAS:
curl -X POST $VERITAS_URL/tenants \
  -H "x-api-key: $ADMIN_KEY" \
  -d '{"name": "proof360", "owner": "john-coates"}'
# Returns { tenant_id: "<uuid>" } — store in SSM /proof360/veritas/tenant-id
```

This `tenant_id` is sent on every evidence-ingest call.

---

## Recompute integration

The adapter is called from the Tier-2 publish path. It is NOT called from `recompute.js` directly. Recompute remains fast and synchronous; attestation is deliberately separated.

```
Edit signal → recompute (fast, no VERITAS) → derived_state returns
Publish Tier 2 → attestBatch (slow, VERITAS) → derived_state returns with vendor matrix
```

This separation is constitutional per lock §4: "The fast path is recompute. The slow path is attestation."

---

## Deletion of trust360 fallback

Once VERITAS attestation is reliable across ≥100 production sessions:

1. Remove trust360 fallback path from `trust-client.js`.
2. Update `gap-mapper.js` to call NIM-via-VECTOR primary only.
3. Tier-1 recompute remains independent of attestation (unchanged).
4. Tier-2 publish goes only through VERITAS adapter.

Decision gate: John reviews adapter telemetry after 100 sessions, signs off on trust360 deprecation.

---

## Test requirements

Vitest suite for the adapter. Mock VERITAS client.

| Test | Asserts |
|---|---|
| `attest_returns_attested_for_high_confidence` | claim_class=ATTESTED, confidence > 0.85 → mapping correct |
| `attest_returns_inferred_for_partial_evidence` | claim_class=INFERRED → vendor matrix excludes gap |
| `attest_returns_unknown_for_no_evidence` | claim_class=UNKNOWN → vendor matrix excludes gap |
| `attest_throws_on_veritas_unavailable` | HTTP 503/timeout → AttestationError after 3 retries |
| `attest_batch_handles_partial_failure` | 5 gaps, 2 fail → returns mixed array, no exception |
| `gapsRequiringReattestation_filters_correctly` | only gaps depending on changed signals returned |
| `tier2_publish_blocks_on_partial_attestation` | any gap fails → publish handler returns 503, sessions.status unchanged |
| `tier2_republish_skips_unchanged_gaps` | republish after edit → only changed gaps re-attested |
| `claim_id_persists_to_gaps_row` | successful attestation → gaps.veritas_claim_id matches VERITAS response |
| `no_silent_fallback_confirm_all` | VERITAS down → never confirms gaps as a fallback |

---

## Authority and constraints

- VERITAS owns the claim chain. Adapter does not embed claim logic.
- Adapter does not store claim history. proof360 holds `veritas_claim_id` reference only. Full chain queried from VERITAS on demand.
- No fallback-confirm-all. **This is non-negotiable.** v1 trust-client behaviour where unavailability silently confirms all gaps is the exact failure mode that erodes credibility. v3 hard-fails instead.
- Adapter is the only proof360 component that writes to VERITAS. Centralised contract.

---

*Authority: john-coates*
*Source of truth: proof360-v3-convergence-locked.md §8*
