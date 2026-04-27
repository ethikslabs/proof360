# proof360 — DOSSIER

**Identity:** Entity onramp — trust readiness diagnostic for founders, with editable report and governed claim escalation
**Version:** v3.0 (architecture locked 2026-04-26; build pending)
**Status:** `live` — v1 running at proof360.au; v3 build pending Kiro
**Authority:** John Coates
**Repo:** ethikslabs/proof360
**URL:** proof360.au

---

## Visual Identity

| Field | Value |
|-------|-------|
| Glyph | 🔍 |
| Color | `#4f46e5` |

---

## What This Repo Owns

proof360 is **a deterministic signal correction engine with governed claim escalation and commercial routing attached.** It cold-reads a company's trust posture from public signals, lets the user correct inferred fields through a structured override contract, attests confirmed gaps via VERITAS, and routes commercial engagement through a three-branch model (proof360 / distributor / vendor direct).

It is the front door to the 360 stack and the first product to render the doctrine pair (compute centralised, mutation gated) at architecture level.

**The boundary:**
- proof360 owns assessment UX, signal storage, override contract, recompute kernel, and engagement routing.
- VECTOR routes all inference (Claude Haiku for signal extraction, NIM Nemotron for trust evaluation, embeddings for VERITAS).
- VERITAS is the governed claim authority — attests gaps on Tier-2 publish.
- trust360 is retained as fallback only during VERITAS migration.

---

## Role in the 360 Stack

```
IMPERIUM (control plane)
└── proof360 (entity onramp — live v1, v3 build pending)
    ├── inference   → VECTOR (claude-haiku, NIM nemotron, embeddings)
    ├── attestation → VERITAS (Tier-2 publish gates vendor matrix)
    ├── metering    → PULSUS (dual ledger: VECTOR tokens + proof360 consumption)
    ├── monitoring  → ARGUS (/api/health endpoint registered)
    ├── alerts      → SIGNUM stub (3-line wrapper for portal Telegram)
    └── pulse       → IMPERIUM (fire-and-forget, fallback no-op)
```

---

## v3 Architecture (locked 2026-04-26)

### Doctrine pair governing the system

> Compute is centralised. Rendering is distributed.
> Mutation is gated. Reads are unrestricted.

Backend owns truth. Frontends render. The override panel is one renderer of the mutation contract — partner portal corrections, future MCP agent submissions, and any other write surface use the identical shape.

### Runtime model

```
signals (inferred + override stack, persisted in Postgres)
  ↓
POST /recompute
  ↓
[full deterministic pipeline]
  ├── gap evaluation (config/gaps.js triggerCondition)
  ├── trust score (Σ severity weights of triggered gaps)
  ├── AWS programs filter
  ├── vendor matrix selection
  └── confidence ribbon
  ↓
derived_state (returned as JSON, never stored)
```

**Fast path: recompute. Slow path: VERITAS attestation.** They are deliberately separated.

### Tier boundary (structural, not paywall)

| Tier | Renders | Prohibits |
|---|---|---|
| Tier 1 (diagnostic) | gap candidates, per-gap confidence, signal density | trust score, vendor matrix, named programs, any actionability |
| Tier 2 (actionable) | trust score, vendor matrix, AWS programs, engagement router | progressive attestation states |

Transition: explicit "publish Tier 2" click → VERITAS attestation batch → binary unlock. No partial states.

### Override contract (the only mutation surface)

```json
POST /api/v1/session/:id/override
{ "field": "stage", "value": "Series A", "actor": "founder", "reason": "user override" }
```

Rules:
- Append-only override stack per signal
- System never beats human (rescans don't undo edits)
- Cross-actor conflicts → `status: 'conflicted'`, explicit resolution required
- `current_value` materialises from stack head; recompute runs against `current_value`

### Three-branch engagement router

User picks at Tier 2:
- **john** — proof360 routes, John commission
- **distributor** — Ingram / Dicker margin path
- **vendor direct** — clean attribution, no proof360 cut

Three tables: `engagements` (state), `engagement_events` (lifecycle, append-only), `attribution_ledger` (expected/confirmed/received × amount/date per party).

---

## Architecture (legacy v1, currently live)

### Request pipeline (async, in-memory session-keyed)

```
POST /api/v1/session/start          → signal-extractor (Firecrawl + Haiku via VECTOR)
GET  /api/v1/session/:id/inferences → cold read inferences + corrections + follow-ups
POST /api/v1/session/:id/submit     → gap-mapper + trust-client (NIM primary, trust360 fallback)
GET  /api/v1/session/:id/report     → Layer 1 always, Layer 2 after email gate
POST /api/v1/session/:id/capture-email → leads.ndjson append (no SES wired)
```

v1 trust score: `100 − Σ(severity weights of triggered gaps)`. Severity weights `critical=20, high=10, medium=5, low=2`. v3 retains the same scoring math; what changes is governance (attested gaps only contribute to Tier-2 score) and persistence (Postgres replaces in-memory).

---

## Stack

- **API:** Node.js + Fastify v5, ESM, port 3002
- **Frontend:** React 19 + Vite 8 + Tailwind 3, no state management library
- **Auth:** Auth0 PKCE (founder), Google/Microsoft OAuth + Auth0 PKCE (partner portal). Production tenant required pre-v3.0 launch.
- **Database (v3):** Postgres on RDS, ap-southeast-2, six tables + three append-only event tables
- **Inference:** All routed through VECTOR at `http://localhost:3003/v1` (Claude Haiku, NIM Nemotron, OpenAI embeddings)
- **External scans:** Firecrawl, HIBP, AbuseIPDB, GitHub, SSL Labs, crt.sh, ipapi.co, public port scan, jobs page
- **Metering:** Dual ledger — VECTOR `data/metering.ndjson` (LLM tokens) + proof360 `data/consumption.ndjson` (external scans). PULSUS aggregates by `session_id`.
- **Attestation (v3):** VERITAS via `~200 LOC veritas-adapter.js` — replaces trust360 in fallback slot

---

## Deployment

- **EC2:** `i-010dc648d4676168e`, ap-southeast-2
- **PM2 + Nginx:** API on `:3002`, Nginx serves `frontend/dist/` static and proxies `/api/*`
- **Secrets:** AWS SSM under `/proof360/*`
- **Deploy:** `cd /home/ec2-user/proof360 && bash scripts/deploy.sh`
- **Domain:** proof360.au (Cloudflare DNS)
- **Health endpoint:** `GET /api/health` (ARGUS monitoring contract)

---

## Key Files (v1 — being extended for v3)

| File | Purpose | v3 status |
|------|---------|-----------|
| `api/src/services/signal-extractor.js` | Firecrawl → Claude → raw signals | extend with VECTOR `correlation_id` |
| `api/src/services/gap-mapper.js` | Gap triggers → trust client → trust_score | route fallback to VERITAS adapter |
| `api/src/services/trust-client.js` | NIM primary, trust360 fallback | trust360 path replaced by VERITAS adapter |
| `api/src/services/veritas-adapter.js` | **NEW** — Tier-2 publish attestation | build per `veritas-adapter-spec.md` |
| `api/src/services/consumption-emitter.js` | **NEW** — non-VECTOR scan ledger | build per Kiro brief |
| `api/src/services/session-store.js` | In-memory session map | replace with Postgres `sessions` |
| `api/src/services/recompute.js` | **NEW** — deterministic pipeline kernel | build per Kiro brief |
| `api/src/handlers/override.js` | **NEW** — mutation contract endpoint | build per Kiro brief |
| `api/src/handlers/program-match.js` | AWS program eligibility | fix `signals_object` key collision |
| `api/src/handlers/capture-email.js` | Email gate | wire SES |
| `api/src/services/gpu-manager.js` | Dead code (env never set) | **DELETE** |
| `frontend/src/components/OverridePanel.jsx` | **NEW** — right-hand edit panel | build per Kiro brief |
| `frontend/src/data/demo-report.js` | Hardcoded demo for `/report/demo` | retain for offline demo |

---

## Open Items

### Pre-v3.0 (Kiro brief)

- v3.0 build pending — see `proof360/docs/kiro-build-brief-v3.md`
- VERITAS adapter — see `proof360/docs/veritas-adapter-spec.md`
- Postgres provisioning + cutover sequence (Phase 0–3 in convergence lock §12)
- production Auth0 tenant
- SES wired for Layer-2 email delivery
- ARGUS monitoring updated to `/api/health`
- `gpu-manager.js` deletion
- `signals_object`/`signals` key collision fix

### Post-v3.0

- v3.1+ surface scoping (insurance, AWS programs, buyer subscription) — each gated by named commercial pull
- VECTOR Phase 3 (per-tenant rate limits + budget enforcement) — proof360 handles 429-equivalent cleanly when it lands
- Test suite (no automated tests today; v3 build introduces them)

---

## Related

- `Projects/DOCTRINE.md` — operating invariants (compute centralised, mutation gated, tier boundary)
- `proof360/docs/proof360-v3-convergence-locked.md` — full v3 lock
- `proof360/docs/kiro-build-brief-v3.md` — Kiro execution input
- `proof360/docs/veritas-adapter-spec.md` — adapter component spec
- `VERITAS/DOSSIER.md` — governed truth substrate (claim attestation authority)
- `VECTOR/DOSSIER.md` — inference carrier (all proof360 inference routed here)
- `PULSUS/DOSSIER.md` — cost signal plane (consumes both ledgers)
- `IMPERIUM/DOSSIER.md` — control plane (pulse consumer)
- `ARGUS/DOSSIER.md` — monitoring sentry (`/api/health` registered)
- `WHY.md` — origin story and Ethiks360 context

---

## MCP Surface (v3 — natural projection of mutation contract)

```
mcp://proof360/
└── tools/
    ├── start_assessment      — POST /api/v1/session/start; returns session_id
    ├── get_inferences        — GET  /api/v1/session/:id/inferences (Tier 1)
    ├── submit_override       — POST /api/v1/session/:id/override (mutation contract)
    ├── recompute             — POST /api/v1/session/:id/recompute (returns derived_state)
    ├── publish_tier2         — POST /api/v1/session/:id/publish (triggers VERITAS batch)
    ├── get_report            — GET  /api/v1/session/:id/report (Tier 1 always; Tier 2 after publish)
    └── get_consumption       — GET  /api/v1/session/:id/consumption (per-session token + scan cost)
```

Per doctrine: every MCP caller is just another renderer + writer of the same contracts.

---

## A2A Agent Card

```json
{
  "agent_id": "proof360",
  "display_name": "proof360 — Entity trust onramp, editable report, governed attestation",
  "owner": "john-coates",
  "version": "3.0.0",
  "port": 3002,
  "capabilities": [
    "trust_assessment",
    "deterministic_recompute",
    "override_contract",
    "tier_boundary_enforcement",
    "veritas_attestation",
    "engagement_routing",
    "dual_ledger_metering",
    "pulse_emission"
  ],
  "authority_level": "product",
  "depends_on": ["vector", "veritas", "pulsus", "argus"],
  "contact_protocol": "http",
  "human_principal": "john-coates"
}
```

---

## Commercial

| Field | Value |
|-------|-------|
| Status | active (v1 live, v3 architecture locked, build pending) |
| Founder | john-coates |
| ABN / UEN | pending |
| Capital path | revenue |
| Revenue model | Reseller embed fees + vendor partner lead routing commission (three-branch attribution: john / distributor / vendor) |
| IP boundary | Assessment UX, override contract shape, deterministic recompute kernel, tier boundary enforcement, engagement router, signals_object dataset moat (now persistent in Postgres) |
| Stack dependency | VECTOR (inference, locked contract), VERITAS (Tier-2 attestation), PULSUS (metering), ARGUS (monitoring), IMPERIUM (pulse target) |
| First customer | external: proof360.au (live v1, public) |
| Forcing functions for v3.0 | Ingram MD presentation (partner portal live), AWS commercial motions, Austbrokers underwriting model |

### Traction

| Metric | Value | Source |
|--------|-------|--------|
| Uptime | live | ARGUS |
| Sessions run | live | manual (leads.ndjson) |
| Leads captured | live | manual (leads.ndjson) |
| Partner tenants | pending v3.0 (Ingram first) | manual |
| Convergence rounds | 3 | docs/proof360-v3-convergence-locked.md |

---

*Last updated: 2026-04-26 (v3 architecture locked Round 3)*
*Authority: john-coates*
