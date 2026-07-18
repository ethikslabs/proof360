# proof360 v3 — Convergence Lock

**Status:** Locked. Both agents declared "Feels recursive" in Round 3.
**Date:** 2026-04-26
**Authority:** John Coates (Final Authority)
**Operator:** Claude.ai
**Architect:** ChatGPT
**Verifier:** Claude Code (pre-Round-1 addendum)
**Inputs:** `convergence-seed-v3.md`, `convergence-seed-v3-addendum.md`, `convergence-lock-v2.md`, `proof360-v2-rethink.md`

---

## §1 — Authority and provenance

Convergence ran across three rounds between Claude.ai (Operator) and ChatGPT (Architect), preceded by a Verifier addendum from Claude Code that collapsed three seed questions before Round 1 began.

| Round | Outcome |
|---|---|
| Pre-Round-1 (Verifier) | Option C (NEXUS-native) deleted. SENATE deleted. Architecture decision narrowed to B vs D. Three latent bugs surfaced as Kiro work, not architecture. |
| Round 1 | Six positions opened by Operator. Architect responded with constraint pressure on five. |
| Round 2 | All six locked under pressure. Tier-1 commercial implication, override conflict semantics, audit-boundary separation, attribution-ledger column expansion all hardened. Constitutional doctrine pair surfaced. |
| Round 3 | Doctrine pair elevated to `Projects/DOCTRINE.md`. Artefact structure agreed. Both declared "Feels recursive." |

**Sign-off line:**

> Locked by John Coates, 2026-04-26. Final Authority.

---

## §2 — Doctrine additions

These rules carry to `Projects/DOCTRINE.md` and operate above proof360. They are not v3-specific.

### Compute is centralised. Rendering is distributed.

Backend owns signals (state), recompute (truth), and the attestation boundary. Frontends — web, mobile, AR, voice, agent, MCP caller — receive derived state and render. They do not compute. They do not mutate truth.

### Mutation is gated. Reads are unrestricted.

Reading derived state carries no contract beyond authentication. Mutating truth carries a single contract: the structured override-submission shape `{ actor, reason, timestamp, value, field, session }` with conflict semantics. Every mutation surface uses the same shape.

### Tier boundary as structural law

Tier 1 is diagnostic. Tier 2 is actionable. The boundary is structural, not a paywall:

- **Tier 1 surfaces:** gap candidates, per-gap confidence, signal density, directional hints. Disclaimer: "public-source analysis."
- **Tier 1 prohibits:** trust score (aggregate), vendor matrix, named program recommendations, anything implying actionability.
- **Tier 2 unlocks:** trust score, vendor matrix, AWS program matching, engagement router. Requires VERITAS attestation across all rendered gaps.
- **Transition:** binary. No progressive attestation in UI. Tier 2 publish click triggers attestation batch; vendor matrix and engagement router unlock only after attestation completes.

The pair stated tightly:

> All decisions are derived. All mutations are explicit. All truth is replayable.

---

## §3 — Architecture decision: B-narrow

The v2 lock chose Option B (expand Track A) over Option C (pentad-native rewrite). The Verifier addendum collapsed Option C entirely (NEXUS has no runtime). This convergence locks **B-narrow**.

**B-narrow** is not delayed-B. It is the proper decomposition of B's bundled abstractions.

The v2 rethink doc treated "templating engine + entitlement layer + workflow engine" as a single foundation that v3 required. This was wrong. Each bundled item is a distinct primitive forced by a distinct surface:

| Surface | Forces | Does NOT force |
|---|---|---|
| Founder editable report (v3.0) | Postgres, override stack, deterministic recompute | templating engine, entitlement, workflow |
| AWS Programs (v3.2) | Rule engine + catalog (versioned, executable rules) | templating engine, entitlement, workflow |
| Buyer subscription (v3.x) | Tenant model + filter on query | templating, full entitlement |
| Insurance Underwriting (v3.1) | Per-quote count surfacing, Stripe invoice path | templating, workflow |

No v3.x surface in the rethink doc forces all three bundled items. They are independent primitives. Add each when the surface that needs it arrives in commercial pull.

**Locked deferrals:**
- No templating engine in v3.0–v3.x until a surface needs multiple branded output formats.
- No entitlement system until a surface needs per-tier feature gating beyond `tenants` table filter.
- No workflow engine until a surface needs multi-step approval flows.

---

## §4 — Runtime model: deterministic recompute kernel

proof360 is a **deterministic signal correction engine with governed claim escalation and commercial routing attached.**

```
signals (inferred + override stack, persisted)
+ recon_outputs (persisted per-source results, written once per session/rescan)
  ↓
POST /recompute
  ↓
[full pipeline runs against current_value of every field + persisted recon_outputs]
  ├── gap evaluation (triggerCondition over signals + persisted recon outputs)
  ├── trust score computation (Σ severity weights)
  ├── AWS programs filter
  ├── vendor matrix selection
  └── confidence ribbon derivation
  ↓
derived_state (returned, not stored)
```

**Hard rules:**
- Frontends never compute derived state. Renderers receive `derived_state` payload, render, and submit overrides through the mutation contract.
- No partial recompute in the runtime. Every edit triggers full pipeline run against persisted `signals`.
- **Recompute reads persisted recon outputs only.** The recompute kernel SHALL NOT make external calls (Firecrawl, DNS, SSL Labs, etc.). All recon data must be persisted in `recon_outputs` before recompute runs. The recon pipeline writes to `recon_outputs` once per session (or on rescan). This ensures determinism: same signals + same recon_outputs → identical derived_state.
- One efficiency carve-out: VERITAS attestation. Re-attestation runs only on changed signals → affected gaps. This is attestation-batch optimisation, not runtime-pipeline optimisation. The recompute kernel itself remains complete on every call.
- No event sourcing on the compute path. Append-only event tables exist for audit, not for recomputation.

**The fast path is recompute. The slow path is attestation.** They are deliberately separated so editing remains responsive.

---

## §5 — Schema (Postgres)

Six relational tables plus one recon storage table plus three append-only event tables.

### Relational

```sql
sessions (
  id uuid pk,
  tenant_id uuid fk,
  url text,
  created_at timestamptz,
  updated_at timestamptz,
  status text  -- active|tier1|tier2_published|expired
)

signals (
  id uuid pk,
  session_id uuid fk,
  field text,                   -- e.g. 'stage', 'sector', 'geo_market'
  inferred_value text,
  inferred_source text,         -- e.g. 'claude-haiku-via-vector'
  inferred_at timestamptz,
  current_value text,           -- materialised from override stack head
  current_actor text,           -- 'system' | 'founder' | 'partner:<id>' | 'aws-seller:<id>'
  status text                   -- 'inferred' | 'overridden' | 'conflicted'
)

gaps (
  id uuid pk,
  session_id uuid fk,
  gap_def_id text,              -- references config/gaps.js gap definition id
  triggered boolean,
  severity text,
  framework_impact jsonb,
  evidence jsonb,
  veritas_claim_id uuid null,   -- reference to VERITAS claim, if attested
  veritas_class text null,      -- 'ATTESTED' | 'INFERRED' | 'UNKNOWN'
  veritas_confidence numeric null,
  attested_at timestamptz null
)

tenants (
  id uuid pk,
  name text,
  email_domains text[],         -- for portal auth resolution
  vendor_catalog_filter text[], -- vendor_ids this tenant routes to
  partner_branch text,          -- 'distributor' | 'vendor' | 'internal'
  priority integer null,        -- routing priority (lower = higher priority); v3.0 amendment
  created_at timestamptz
)

recon_outputs (
  id uuid pk,
  session_id uuid fk,
  source text,                  -- 'dns' | 'http' | 'certs' | 'ip' | 'github' | 'jobs' | 'hibp' | 'ports' | 'ssllabs' | 'abuseipdb'
  payload jsonb,                -- full recon result per source
  fetched_at timestamptz,
  ttl_seconds integer           -- defaults per source: DNS 3600, HTTP 1800, etc.
)

engagements (
  id uuid pk,
  session_id uuid fk,
  selected_branch text,         -- 'john' | 'distributor' | 'vendor'
  routed_tenant_id uuid null,
  vendor_id text null,          -- references config/vendors.js
  status text,                  -- 'created'|'routed'|'accepted'|'rejected'|'converted'
  created_at timestamptz
)

leads (
  id uuid pk,
  session_id uuid fk,
  email text,
  captured_at timestamptz,
  source text                   -- migration target for current leads.ndjson
)
```

### Append-only events

```sql
signal_events (
  id uuid pk,
  signal_id uuid fk,
  event_type text,              -- 'inferred'|'overridden'|'rescanned'|'conflict_resolved'
  actor text,
  reason text,
  prior_value text,
  new_value text,
  ts timestamptz
)

engagement_events (
  id uuid pk,
  engagement_id uuid fk,
  event_type text,              -- 'created'|'routed'|'accepted'|'rejected'|'converted'
  actor text,                   -- 'user'|'system'|'partner:<id>'
  metadata jsonb,
  ts timestamptz
)

attribution_ledger (
  id uuid pk,
  engagement_id uuid fk,
  party text,                   -- 'john' | 'ingram' | 'dicker' | 'vendor:<id>'
  share_percentage numeric,
  expected_amount numeric null,
  expected_date date null,
  confirmed_amount numeric null,
  confirmed_date date null,
  received_amount numeric null,
  received_date date null,
  status text                   -- 'expected'|'confirmed'|'received'|'disputed'
)
```

**Critical rule:** events reference, never mirror. `signal_events` does not duplicate VERITAS claim history. `engagement_events` does not duplicate `attribution_ledger`. Each table has one ownership domain.

---

## §6 — Override contract (the write interface)

This is the only mutation surface in proof360. Every write — founder edit, partner correction, future MCP agent submission — uses this shape.

### Submission shape

```json
POST /api/v1/session/:id/override
{
  "field": "stage",
  "value": "Series A",
  "actor": "founder",
  "reason": "user override"
}
```

### Backend behaviour

1. Resolve `actor` from auth context (founder → `founder`, partner portal → `partner:<tenant_id>`, MCP → `mcp:<agent_id>`).
2. Append entry to override stack: `{ value, actor, ts, reason }`.
3. Apply rules:
   - System overrides never beat human overrides (rescans do not undo edits).
   - Human overrides stack chronologically; latest human override is the head.
   - Cross-actor conflict (e.g. founder=`Series A`, partner=`seed`) sets `signals.status = 'conflicted'`. No silent merge.
4. Compute `current_value` from stack head.
5. Trigger `POST /recompute` against `current_value` only.
6. Emit `signal_events` row.

### Conflict resolution

When `status = 'conflicted'`:
- Recompute pipeline still runs against latest human value (UI shows current pipeline output).
- UI surfaces conflict banner. Resolution is explicit user action. No automatic merging.
- Resolution emits `signal_events` with `event_type = 'conflict_resolved'`, capturing both prior values and the resolved choice.

**The override panel is one renderer of this contract.** Partner portal corrections, MCP agent submissions, and any future write surface use the identical shape.

---

## §7 — Tier boundary

Structural law, not paywall.

### Tier 1 — Diagnostic

**Renders:**
- Gap candidates (triggered gaps, with evidence)
- Per-gap confidence (high|medium|low)
- Signal density summary: *"14 signal-bearing gaps identified — 6 high-confidence, 5 medium, 3 low"*
- Directional hints: *"compliance posture appears partial"*, *"identity surface incomplete"*

**Prohibits:**
- Trust score (aggregate number)
- Vendor matrix
- Named AWS program recommendations
- Anything implying actionability

**Disclaimer:** *"Public-source analysis. We see things. Pay to find out what to do about them."*

### Tier 2 — Actionable

**Unlocks on:** explicit "this is mine" publish click by user (the moment of ownership transition from cold read to owned report).

**Trigger sequence:**
1. User clicks "publish Tier 2" (button label TBD)
2. VERITAS attestation batch runs across all triggered gaps
3. Attestation completes → trust score, vendor matrix, AWS programs, engagement router all render simultaneously
4. UI is binary — never partial attestation rendering

**Renders:**
- Trust score
- Vendor matrix (gated by VERITAS-attested gaps only)
- AWS program matching
- Three-branch engagement router

**Re-publishing:** subsequent edits + republish trigger partial re-attestation (only changed signals → affected gaps). UI remains binary; previous Tier-2 view holds until new attestation completes.

---

## §8 — VERITAS adapter spec

Component lives at `proof360/api/src/services/veritas-adapter.js`. Replaces trust360 in the fallback slot. NIM-via-VECTOR remains the primary path during inference; VERITAS is the attestation authority on Tier-2 publish.

### Trigger

- Tier 2 publish click → batch attest all triggered gaps for the session
- Tier 2 republish after revision → partial re-attest (only gaps whose underlying signals changed)

### Flow

```
For each gap requiring attestation:

1. Build evidence bundle:
   {
     predicate: gap.gap_def_id,
     projection: claim_template(signals + recon_context),
     content: { signals, recon_evidence },
     tenant_id: session.tenant_id,
     freshness_ttl: 86400
   }

2. POST /evidence/ingest → returns evidence_id

3. POST /claim/generate { evidence_id } → returns:
   {
     claim_id,
     claim_class: ATTESTED | INFERRED | UNKNOWN,
     confidence: 0.0–1.0,
     reasoning: string
   }

4. Map result to gap:
   gaps.veritas_claim_id = claim_id
   gaps.veritas_class = claim_class
   gaps.veritas_confidence = confidence
   gaps.attested_at = now()

5. Render rule:
   ATTESTED (confidence > 0.85) → render in vendor matrix
   INFERRED → render with caveat
   UNKNOWN → exclude from vendor matrix (gap shown, but not actionable)
```

### Failure mode

- VERITAS unavailable → Tier 2 publish blocked with explicit error (HTTP 503). No fallback-confirm-all behaviour. (This is a hard departure from current trust360 behaviour where unavailability silently confirms all gaps.)
- Per-gap attestation timeout (>30s) → mark gap as `attestation_timeout`, exclude from vendor matrix, surface in UI as "attestation pending — retry".
- **Publish gate: any-attest, not all-attest.** `sessions.status` advances to `tier2_published` after at least one gap is successfully attested. Failed gaps do not render in the vendor matrix but surface as "attestation pending — retry". Republish (§7 re-publishing) is the explicit retry mechanism for failed gaps. Tier 2 transition is binary at the per-gap render level: each gap is either attested-and-rendered or not-attested-and-not-rendered. There is no "half-attested" gap state. (v3.0 amendment — original lock required all-attest; relaxed to preserve UX without breaking doctrine.)

### Independence

The adapter is a translation layer. It does not embed VERITAS logic. VERITAS owns claim governance entirely. proof360 references claims by ID; never duplicates claim state.

---

## §9 — Audit boundaries

Three distinct audit domains. They reference each other; they do not mirror.

| Domain | Owner | Unit | Replay path |
|---|---|---|---|
| `signal_events` | proof360 | input mutation | reconstruct override stack chronologically; replay recompute pipeline against any historical state |
| `engagement_events` | proof360 | commercial state transition | reconstruct lifecycle of an engagement: created → routed → accepted → converted |
| VERITAS claims | VERITAS | governed truth | query claim provenance chain via VERITAS API; proof360 holds claim_id reference only |

**No mirroring rule.** proof360 does not store VERITAS claim history. proof360 stores `veritas_claim_id` and queries VERITAS for chain detail when needed (e.g. dispute, audit, regulator request).

This survives scale: each audit domain is independent, replayable, and testable in isolation.

---

## §10 — Consumption metering (dual ledger)

Cost intelligence accumulates from v3.0 day one. Customer-facing pricing decisions deferred until data justifies them.

### Ledger 1 — VECTOR metering NDJSON

Already exists at `VECTOR/data/metering.ndjson`. Captures:

```json
{
  "tenant": "proof360",
  "model": "claude-haiku-4-5-20251001",
  "provider": "anthropic",
  "tokens": { "prompt": 2143, "completion": 487, "total": 2630 },
  "sovereignty_tier": "non-sovereign",
  "route_decision": "anthropic",
  "timestamp": "2026-04-26T14:32:11Z"
}
```

**Required schema addition:** `correlation_id` field. proof360 passes `session_id` as correlation on every VECTOR call. PULSUS aggregates by correlation.

### Ledger 2 — proof360 consumption NDJSON

New file: `proof360/api/data/consumption.ndjson`. Captures non-VECTOR external scans.

```json
{
  "session_id": "<uuid>",
  "source": "firecrawl|hibp|abuseipdb|github|ssllabs|crtsh|ipapi|portscan|jobs",
  "units": 5,
  "unit_type": "credits|api_calls|queries",
  "success": true,
  "error": null,
  "timestamp": "2026-04-26T14:32:11Z"
}
```

Emitted by new helper `proof360/api/src/services/consumption-emitter.js`. Every recon source calls it before/after external API hits.

### PULSUS aggregation

PULSUS reads both ledgers, aggregates by `session_id`. Surfaces:
- Cost per scan, broken down by every external service hit
- Free vs paid mix per scan (situational visibility)
- Per-source consumption history (commercial: which sources earn their slot)
- Per-tenant aggregate (proof360 itself today; per-partner once partner portal goes live)

### Metronome

Stays in VECTOR. `MetronomeSink` already wired (`METERING_SINK=metronome` env switch). Used for VECTOR-as-a-service customers — separate SPV motion, parallel commercial track. **proof360 does not touch Metronome.**

---

## §11 — VECTOR contract (locked)

Every VECTOR call from proof360 carries:

```
tenant_id      = 'proof360' (or partner tenant when partner portal is live)
session_id     = <session uuid>
correlation_id = <session uuid>  (same as session_id for proof360; arbitrary for other VECTOR customers)
```

**Future-proofing for VECTOR Phase 3 (per-tenant rate limits + budget enforcement):**
- proof360 must handle 429-equivalent responses cleanly when VECTOR enforces budgets
- Specific behaviour: surface error to user as "service capacity reached, retry shortly" (not silent failure)
- Retry with backoff (max 3 attempts, exponential)

**Sovereignty enforcer:** respected. If a model request is blocked by VECTOR's sovereignty policy, proof360 surfaces the block to the user with reason — does not silently downgrade to a different model.

---

## §12 — Postgres cutover sequence

No flag flipping. Rule: write → verify → read → cut.

### Phase 0 — Parallel write

- Postgres provisioned (RDS, ap-southeast-2, same VPC as proof360 EC2)
- Schema deployed (six tables + three event tables)
- Code change: every write to in-memory `session-store.js` and `leads.ndjson` also writes to Postgres
- NDJSON remains canonical
- Deploy. Verify writes land in both.

### Phase 1 — Read switch (internal)

- All read paths migrated to Postgres
- NDJSON writes continue (safety net)
- Endpoints affected: `/api/v1/session/:id/inferences`, `/report`, `/early-signal`, `/admin/preread/:batch_id`, `/api/program-match/:session_id`
- Deploy. Verify reads return identical data.

### Phase 2 — Backfill replay

- Replay `leads.ndjson` historical entries → `leads` table
- Replay any preserved session NDJSON if present
- Verify counts and integrity

### Phase 3 — Kill NDJSON reads

- Remove NDJSON read paths from code
- NDJSON becomes archive only
- Deploy.

### Phase 4 — Optional kill writes

- Only after sustained confidence in Postgres operations
- Remove NDJSON write paths
- NDJSON files retained as archive

**Critical:** the editable report (§6) cannot ship before Phase 1. The mutation contract requires persistent state. Tier-2 attestation (§8) cannot ship before Phase 1. Phase 0 → Phase 1 is the gating sequence for v3.0 launch.

---

## §13 — Phasing

### v3.0 — Founder surface, editable, attested

- Postgres live (Phase 0–1 minimum, Phase 2–3 fast-follow)
- Editable report with right-hand override panel
- Override contract live (§6)
- Two-tier rendering live (§7)
- VERITAS attestation on Tier-2 publish (§8)
- Three-branch engagement router (john / distributor / vendor)
- Partner portal live with Ingram tenant
- Dual-ledger consumption metering (§10)
- VECTOR contract enforced (§11)
- Telegram alert on lead arrival via 3-line `signum.send()` stub wrapper
- production Auth0 tenant
- Out-of-band fixes from §15 applied

### v3.1+ — Each surface gated by named commercial pull

| Phase | Candidate surface | Forcing function | Adds (primitives only) |
|---|---|---|---|
| v3.1 | Insurance Underwriting Pack | Austbrokers active | Per-quote count surfacing, Stripe invoice path |
| v3.2 | AWS Program Qualification | AWS partner tier compounding | Rule engine + program catalog (not templating) |
| v3.x | Buyer / Investor / Distributor | Specific contract signed | Tenant-filter expansion (not entitlement system) |

No surface is pre-built. No primitive is pre-added. Each surface waits for John's "the commercial pull is real" call.

---

## §14 — Out of scope for this convergence

- SIGNUM build scope (assume 3-line stub `signum.send()` wrapper for v3.0 portal alerts; full SIGNUM build is a separate convergence)
- SENATE — does not exist on disk, removed from question set
- NEXUS as runtime — Python data model + tests only, no entrypoint, not a runtime dependency on any v3 timeline
- Auth0 production tenant migration mechanics (pre-launch gate, not architecture)
- Specific Austbrokers commercial shape (TBD with Austbrokers; convergence assumes monthly invoice not event-stream)

---

## §15 — Out-of-band fixes (Kiro, not architecture)

These are bugs and gaps surfaced during convergence. Not architecture decisions; included in Kiro v3.0 brief as fix items.

1. **`signals_object` / `signals` key collision.** `session-store.js` initialises `signals_object: null`. `submit.js` writes key `signals`. `program-match.js` reads `signals_object` — always null. AWS program matching is broken today. Fix: align to one key (recommend `signals_object` to match downstream readers).
2. **`capture-email` has no SES wired.** Handler comment: *"Log lead to file (MVP — no email sending)"*. Append-to-NDJSON only. v3.0 needs SES integration if Layer 2 unlock includes emailing the report.
3. **Auth0 dev-tenant.** `dev-nfpt3dibp2qzchiq.au.auth0.com` hardcoded as fallback in `Portal.jsx`. Production Auth0 tenant required pre-launch.
4. **ARGUS `/health` correction.** Currently returns React frontend HTML (Nginx only proxies `/api/*`). ARGUS monitoring needs update to `/api/health`.
5. **`gpu-manager.js` dead code.** `GPU_INSTANCE_ID` env unset. Manager exits immediately at line 22. Delete file. NIM runs via hosted free tier through VECTOR — no GPU lifecycle to manage.

---

## §16 — Lock signature

**Round 3 declarations:**

- Claude.ai (Operator): "Feels recursive."
- ChatGPT (Architect): "Feels recursive."

**No unresolved architectural contradictions.** Anything new from here is:
- A new surface (triggers v3.x scoping)
- A new commercial pull (triggers phasing decision)
- A doctrine violation (triggers fresh convergence)

---

**Sign-off:**

> Locked by John Coates, 2026-04-26. Final Authority.

---

## Sub-artefacts feeding from this lock

| Artefact | Path | Status |
|---|---|---|
| Doctrine additions | `Projects/DOCTRINE.md` | written 2026-04-26 |
| This lock | `proof360/docs/proof360-v3-convergence-locked.md` | written 2026-04-26 |
| DOSSIER update | `proof360/DOSSIER.md` | written 2026-04-26 |
| Kiro build brief | `proof360/docs/kiro-build-brief-v3.md` | written 2026-04-26 |
| VERITAS adapter spec | `proof360/docs/veritas-adapter-spec.md` | written 2026-04-26 |

---

*Convergence locked. Round 3 closed.*
*Authority: john-coates*
