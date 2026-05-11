# proof360 — Convergence Seed v3 Addendum

**Status:** Verified answers to Claude.ai pre-Round-1 questions
**Date:** 2026-04-26
**Prepared by:** claude-code (Verifier)
**Attach alongside:** `convergence-seed-v3.md`

All answers below are verified from live code and live service checks this session — not assumed.

---

## Item 1 — VERITAS `submit_claim` schema ↔ `gap-mapper.js` delta

No adapter exists. Mismatch is structural, not cosmetic:

| Dimension | gap-mapper output (current) | VERITAS input (required) |
|---|---|---|
| Shape | `{ question, evidence, metadata: { gapId, severity } }` | `POST /evidence/ingest: { predicate, projection, content, tenant_id, freshness_ttl }` then `POST /claim/generate: { evidence_id }` |
| Call pattern | Single sync call | Two-step async: ingest evidence → generate claim |
| Auth | None | `x-api-key` header required |
| Database | Not required | Postgres required (evidence + claims tables) |
| Tenant model | None | `tenant_id` UUID required on every ingest |
| Output | `consensus.mos` (1–10), `variance`, `agreement`, `traceId` | `claim_class: ATTESTED\|INFERRED\|UNKNOWN`, `confidence: 0–1`, `reasoning` |
| Confirmation threshold | `mos >= 7` | `confidence > 0.85` → ATTESTED |

An adapter would need: (1) map gap evidence → VERITAS evidence ingest, (2) generate claim from evidence_id, (3) map ATTESTED/INFERRED/UNKNOWN → confirmed bool. VERITAS also generates a 3072-dim embedding per evidence record (text-embedding-3-large via VECTOR).

**Adapter is buildable but requires proof360 to have a tenant_id and Postgres — same dependency as the DB decision. Option B and Option C both require Postgres before VERITAS integration is possible.**

---

## Item 2 — trust360 confirm-claim contract (one-pager diff)

**trust360 `POST /trust`:**
- In: `{ question: string, evidence?: string, metadata?: object }`
- Out: `{ traceId: uuid, consensus: { mos: 1–10, variance: float, agreement: float }, models: [...], metrics: { totalModels, successfulModels, failedModels, executionTimeMs } }`
- 6-stage sync pipeline. No auth. No tenant. No Postgres.

**Actual call chain in proof360 today (`trust-client.js`):**
1. If `NVIDIA_API_KEY` set → NIM Nemotron via VECTOR first (returns same `{ consensus: { mos, variance, agreement }, traceId }` shape)
2. On NIM failure → trust360 fallback (`POST /trust`, 20s timeout)
3. On trust360 failure → confirm all gaps (`mos: 8, fallback: true`)

**NIM is already the primary path when the key is set. trust360 is already a fallback. VERITAS replaces trust360 in the fallback position — not the primary. The migration is smaller than the seed implies.**

---

## Item 3 — `signals_object` schema (verified from `submit.js`)

```js
{
  session_id: string,
  company_name: string,
  website: string,              // normalized URL
  deck_uploaded: boolean,       // always false — no deck upload built
  stage: string,                // 'seed' | 'series_a' | etc.
  sector: string,
  primary_use_case: string,     // defaults to 'enterprise_sales' (hardcoded)
  questions_answered: [
    { question_id: string, answer: string }
  ],
  gaps: [
    {
      gap_id, category, severity, title, why, risk, control,
      closure_strategies: [],   // always empty — placeholder only
      vendor_implementations: [], // always empty — placeholder only
      score_impact, confidence,
      evidence: [{ source, citation }],
      time_estimate: '',        // always empty string — placeholder only
      framework_impact: [...],
      remediation: string[]
    }
  ],
  trust_score: number,          // 0–100
  deal_readiness: 'ready' | 'partial' | 'not_ready',
  email_captured: boolean,      // false at write time
  timestamp: ISO8601,
  source: 'website',            // hardcoded
}
```

**Known bug (Verifier finding):** `session-store.js` initialises `signals_object: null`. `submit.js` writes `updateSession(id, { signals })` — key is `signals`, not `signals_object`. `program-match.js` reads `session.signals_object` — always null. **AWS program matching is broken today.** Add as a fix item in the Kiro build brief, not an architecture question.

**Also note:** `closure_strategies`, `vendor_implementations`, and `time_estimate` are structural placeholders — always empty. Schema slots exist for future population.

---

## Item 4 — proof360 EC2 status

**Live and healthy.** Verified this session:

```
GET https://proof360.au/api/health
→ {"status":"ok","sessions_active":0,"uptime_ms":9663203,"version":"1.0"}
```

Uptime ~2.7 hours at time of check. The "down" state flagged in the 25 Apr IMPERIUM handoff has resolved. Demo continuity is not at risk. Ingram MD presentation is unblocked on this dimension.

**ARGUS note:** `GET /health` (no `/api/` prefix) returns React frontend HTML — Nginx only proxies `/api/*` to the API. If ARGUS is monitoring `/health`, it needs to be updated to `/api/health`.

---

## Item 5 — NEXUS and SENATE binary deployable-today states

**NEXUS — correct the seed:**
Implementation exists in Python. Files confirmed: `nexus/models.py` (data models — AgentRecord, ModuleRecord, IntentEnvelope defined), `nexus/boot.py`, `nexus/registry_reader.py`, `agents/router.py`, `nexus/health_observer.py`, `nexus/provenance_emitter.py`. Tests exist for all components. **No main entrypoint found, no HTTP server, not running.** Intent envelopes are a defined data model, not a routing runtime. NEXUS cannot receive or dispatch proof360 intents today.

**Correct statement for Round 1:** NEXUS is a data model + test suite. Intent envelope routing does not work locally or otherwise. Do not design proof360 v3 with NEXUS as a runtime dependency — it is not available on any timeline that affects this convergence.

**SENATE — correct the seed:**
Does not exist as a directory or codebase on disk. It is a named concept only. Remove it from the convergence entirely as an integration surface. It cannot be a dependency for proof360 v3.

---

## Item 6 — GPU instance state and burn

`GPU_INSTANCE_ID` is not set in proof360's `.env`. `gpu-manager.js` guards on this at line 22 and exits immediately with a warning. **The GPU manager is dead code — it never fires.**

NIM inference is live but via the **hosted NIM API** (NVIDIA developer access, free tier) routed through VECTOR — not a self-hosted GPU EC2 instance. Current GPU burn: $0.

**Correct statement for Round 1:** "GPU manager" is speculative infrastructure for a future self-hosted deployment. NIM is live via hosted API at zero marginal cost. The GPU trust claim path is functional; the GPU lifecycle manager is not. This distinction matters for PULSUS integration design — cost to meter is API tokens, not GPU instance hours.

---

## Item 7 — Per-session cost (verified)

| Component | Cost per session |
|---|---|
| Firecrawl (5 pages) | ~$0.010 |
| Claude Haiku signal extraction (~2,000 input + ~500 output tokens) | ~$0.004 |
| NIM Nemotron trust evaluation (N claims) | $0.000 (NVIDIA developer free) |
| Passive recon — DNS, HTTP, certs, IP, GitHub, SSL Labs, AbuseIPDB | $0.000 (all free APIs) |
| HIBP breach check | $0.000 (free tier) |
| GPU EC2 | $0.000 (not provisioned) |
| **Total** | **~$0.015** |

Cost is negligible at current scale. **PULSUS urgency is cost attribution, not cost control** — which partner/tenant is consuming sessions. The forcing function is the Ingram partner portal commercial model (per-lead cost visibility), not the absolute cost level. This reframes the PULSUS integration priority in the convergence.

---

## Item 8 — v2 locked doc and rethink.md

Attach both as raw documents to the Claude.ai conversation before Round 1:

- `proof360/docs/convergence-lock-v2.md` — the actual Round 5 lock positions
- `proof360/docs/proof360-v2-rethink.md` — the structural gap diagnosis

Do not rely on paraphrased versions in the seed. ChatGPT needs to see the verbatim lock and the rethink doc to avoid re-deriving positions already locked.

---

## Meta-check: omissions in the seed (Verifier finding)

Three latent unknowns not in the seed that are load-bearing for the convergence:

### Omission 1 — `capture-email` sends no email

The handler comment (line 33): `"// Log lead to file (MVP — no email sending)"`. The Layer 2 gate appends to `leads.ndjson` only. No SES, no SendGrid, no SMTP configured anywhere. The email gate is a UI concept — no delivery infrastructure exists. If Layer 2 unlock means emailing the report to the captured address, that infrastructure must be scoped into v3. Add to the constraint table in the Kiro build brief.

### Omission 2 — Auth0 is a dev tenant

Domain hardcoded as fallback in `Portal.jsx`: `dev-nfpt3dibp2qzchiq.au.auth0.com`. The Auth0 PKCE flow works for demo purposes but this is not a production tenant. Any real user (founder or partner) auth requires a production Auth0 tenant. Add as a pre-launch gate — not a v3.0 architecture decision, but a deployment prerequisite.

### Omission 3 — `signals_object` / `signals` key collision (also noted in Item 3)

`session-store.js` initialises `signals_object: null`. `submit.js` writes `signals` key. `program-match.js` reads `signals_object` — always null. AWS program matching is broken today. This is a Kiro fix item, not an architecture question. But the convergence should not assume program matching works when it doesn't.

---

## Seed verdict

The ten architecture questions in the seed are complete. No other latent unknowns found. Lock the seed with these three additions appended. The addendum is the verifier sign-off.

---

*Verified by: claude-code (Verifier role)*
*Authority: john-coates*
