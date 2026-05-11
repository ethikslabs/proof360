# proof360 — Convergence Seed v3

**Protocol:** Stage 1 — Claude.ai (Operator/Synthesiser) ↔ ChatGPT (Architect), 10 rounds
**Lock signal:** Both declare "Feels recursive"
**Output:** Locked proof360 v3 spec → Stage 2 Kiro build brief
**Authority:** John Coates (Final Authority)
**Date:** 2026-04-26
**Status:** Seed — not yet converged

---

## Why this convergence exists

proof360 v2 was converged (Round 5 lock, 2026-04-23) and built by Kiro overnight. Since that build:

1. The latin stack has materially evolved — VERITAS, IMPERIUM, NEXUS, PULSUS, ARGUS, VECTOR are lab-ready or production
2. The codebase has grown well beyond what was specced — a passive recon pipeline, GPU inference, and a six-surface stakeholder model exist in code but have never been architecturally decided
3. The v2 rethink doc identified that the current architecture cannot carry the multi-stakeholder surfaces without structural additions (database, multi-tenant, templating, entitlement)
4. The convergence protocol itself has evolved — it is now a five-stage multi-agent process; Grok and Codex are new stage participants

This seed captures full ground truth. Claude.ai enters Round 1 knowing exactly what exists and what doesn't.

---

## What was specced and built in v2 (the overnight scope)

The v2 convergence lock (Round 5) produced a narrow overnight build scope:

| Item | Status |
|------|--------|
| Shareable cold read URL — `?url=X` on `/audit/cold-read` | ✅ built — `AuditColdRead.jsx`, `utils/shareable-url.js` |
| `/admin/preread` — batch URL input, run cold reads, return shareable links | ✅ built — `AdminPreread.jsx`, `handlers/admin-preread.js` |
| Landing page swap — cold read front and centre | ✅ built — `pages/Home.jsx` with `components/homepage/` suite |
| `ProgramMatchCard` — AWS program eligibility, Layer 2 | ✅ built — `components/ProgramMatchCard.jsx`, `handlers/program-match.js` |
| Signal weighting model (Challenge 1) | ✅ built — `config/signal-weights.js` |
| Confidence indicators (Challenge 2) | ✅ built — `ConfidenceChip.jsx`, `ConfidenceRibbon.jsx`, `confidenceUtils.js` |
| Feature flag system (Challenge 3) | ✅ built — `config/features.js`, served via `GET /api/features`, consumed via `FeatureFlagContext.jsx` |

Deferred items from the lock (still deferred, not built):
- shadcn/ui, tanstack-query, zustand substrate
- Auth0 single-tenant refactor
- RiskHeatmap component
- Multi-persona surfaces (F3–F8)

---

## What exists in the codebase today — ground truth

### API

**Runtime:** Node.js ESM, Fastify v5 (migrated from Express post-lock)
**Port:** 3002
**Package manifest:**
```json
{
  "dependencies": {
    "@fastify/cors": "^11.0.1",
    "@mendable/firecrawl-js": "^1.23.0",
    "fastify": "^5.3.3",
    "openai": "^6.34.0",
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "fast-check": "^4.7.0"
  }
}
```

**Full route surface (all live):**
```
# Phase 1 — Cold read
POST   /api/v1/session/start
GET    /api/v1/session/:id/log              — SSE log stream
GET    /api/v1/session/:id/infer-status    — poll until inference complete
GET    /api/v1/session/:id/inferences      — cold read: inferences + corrections + followups

# Phase 2 — Followup and submission
GET    /api/v1/session/:id/followup-questions
POST   /api/v1/session/:id/submit          — founder corrections + followup answers
GET    /api/v1/session/:id/status          — poll until analysis complete

# Phase 3 — Report
GET    /api/v1/session/:id/report          — full report (Layer 1 always, Layer 2 after email)

# Phase 4 — Remaining
GET    /api/v1/session/:id/early-signal    — estimated score pre-report
POST   /api/v1/session/:id/capture-email  — gates Layer 2

# Persona
POST   /api/v1/chat                        — Sophia persona chat

# Health
GET    /health
GET    /api/health

# Overnight-v1 additions
GET    /api/features                       — feature flag state
GET    /api/program-match/:session_id      — AWS program eligibility
POST   /api/admin/preread                  — batch preread initiation
GET    /api/admin/preread/:batch_id        — batch preread status
```

**Session model:** in-memory Map, 24h TTL, 90s stale timeout per pipeline stage, 30s cleanup interval. No persistence across restarts. `leads.ndjson` append-only for email captures.

### Signal extraction pipeline

Two-stage pipeline runs on `POST /api/v1/session/start`:

**Stage A — Firecrawl web scrape**
Scrapes 5 pages per company (`/`, `/pricing`, `/about`, `/security`, `/trust`), 15s timeout per page, `Promise.allSettled` (failures swallowed). Content truncated to 3,000 chars per page.

**Stage B — Claude Haiku extraction (via VECTOR)**
OpenAI-compatible client → `http://localhost:3003/v1` (VECTOR), `apiKey: 'gateway'`. Extracts structured signals from scraped content: product_type, data_sensitivity, compliance_status, customer_type, infrastructure, identity_model, insurance_status, stage, sector, geo_market, has_raised_institutional, abn_entity_type.

IMPORTANT: Signal extraction is from marketing copy only. Technical signals (DNS, ports, TLS, breach history) come from the recon pipeline — not from page content.

### Passive recon pipeline — new, not in v2 spec

10 intelligence sources run in parallel (`Promise.allSettled`), 12s timeout per source, all failures swallowed:

| Source | What it reads | External dependency |
|--------|--------------|---------------------|
| `recon-dns.js` | DMARC/SPF/MX/CAA/DKIM/DNSSEC/BIMI records | Public DNS |
| `recon-http.js` | Security headers, TLS cert, tech fingerprint, robots.txt, CDN/WAF detection | Public HTTP |
| `recon-certs.js` | CT log subdomain enumeration | crt.sh (no key) |
| `recon-ip.js` | IP/ASN/hosting provider/country | ipapi.co (no key) |
| `recon-github.js` | GitHub org presence, security policy, primary language, commit recency | GitHub API (no key, rate-limited) |
| `recon-jobs.js` | Careers page hiring signals (security, compliance team gaps) | Firecrawl |
| `recon-hibp.js` | Domain breach history | HIBP API (requires `HIBP_API_KEY`) |
| `recon-ports.js` | Common port exposure (risky + critical classification) | Public port scan |
| `recon-ssllabs.js` | Official TLS grade, protocol support, known vulns | Qualys SSL Labs (no key) |
| `recon-abuseipdb.js` | IP abuse confidence score, usage type | AbuseIPDB (requires `ABUSEIPDB_API_KEY`) |

Recon output is flattened into a context object with ~50+ keys (dmarc_policy, spf_policy, has_hsts, has_csp, security_headers_score, tls_version, tls_is_current, cert_expiry_days, cdn_provider, waf_detected, has_security_txt, tech_stack[], subdomain_count, has_staging_exposure, hosting_provider, cloud_provider, is_cloud_hosted, github_found, github_has_security_policy, github_days_stale, security_hire_signal, compliance_hire_signal, domain_in_breach, breach_count, breach_severity, open_ports[], risky_port_count, has_exposed_db, ssl_grade, has_old_tls, hsts_preloaded, abuse_confidence_score, and more).

This recon context feeds `gap-mapper.js` `triggerCondition` functions directly.

### NIM inference client + GPU manager — new, not in v2 spec

`recon-abuseipdb.js` routes trust claim evaluation through VECTOR (not Haiku). Uses NVIDIA Llama Nemotron Ultra 253B for claim assessment:
- `nim-client.js` → OpenAI-compatible client → `http://localhost:3003/v1`, model `nvidia/llama-3.1-nemotron-ultra-253b-v1`
- Response contract: `{ supported: bool, confidence: 1–10, reasoning: "one sentence" }`

`gpu-manager.js` manages an on-demand GPU EC2 instance lifecycle:
- AWS SDK EC2Client, `ap-southeast-2`
- `GPU_INSTANCE_ID` + `NIM_HOST` env vars
- Start on session begin, stop after 10min idle
- 3min warm-up timeout, 5s poll interval

### Gap definitions — 401 lines

`config/gaps.js` contains typed gap definitions. Each gap has:
- `id`, `severity` (critical/high/medium/low), `label`, `category`
- `triggerCondition(ctx)` — pure function over recon context + signal context
- `claimTemplate(ctx)` — produces `{ question, evidence }` for trust claim evaluation
- `framework_impact[]` — maps gap to specific framework controls (SOC2, ISO 27001, Essential Eight, APRA CPS 234, PCI DSS, HIPAA, etc.) with `blocker: bool`
- `remediation[]` — 2–3 concrete remediation steps

Severity weights: critical=20, high=10, medium=5, low=2.
`trust_score = 100 − Σ(severity weights of triggered + confirmed gaps)`

Known gap IDs include: soc2, mfa, cyber_insurance, incident_response, dmarc, encryption, access_control, data_classification, vulnerability_management, pci_dss, hipaa_security, essential_eight, privacy_policy, and others.

### Vendor catalog — 518 lines

`config/vendors.js` is a typed catalog. Each vendor has:
- `id`, `display_name`, `initials`
- `closes[]` — gap IDs this vendor addresses
- `distributor` — `"ingram"` | `"dicker"` | `"direct"`
- `aws_native: bool` — built by AWS, no separate relationship needed
- `marketplace_aws: bool` — listed on AWS Marketplace, bills against AWS commit
- `cost_range`, `timeline`
- `is_partner: bool`, `deal_label` — partner discount text
- `best_for`, `summary`, `referral_url`

Ingram AU and Dicker AU catalogs verified 2026-03-18. Key vendors: AWS Security Hub, Vanta, Drata, Secureframe, Cisco, Palo Alto, Cloudflare, Okta/Auth0, Fireblocks, Frankieone, Cognitive View, Cyber Pro Insurance, Ingram Micro, Dicker Data, and others.

### AWS programs engine — 282 lines

`config/aws-programs.js` contains a typed program catalog with:
- `program_id`, `name`, `benefit`, `application_url`, `category`
- `triggers[]` — pure trigger conditions: `{ field, op: eq|in|not_eq|exists, value?, values? }`
- Categories: startup_credits, partner_programs, customer_funding, sector_accelerators, nonprofit

Known signal fields evaluated: stage, sector, infrastructure, geo_market, product_type, has_raised_institutional, abn_entity_type. AWS programs include Activate Founders, Activate Portfolio, MAP, ISV Accelerate, Partner Network, and sector-specific accelerators. 30+ programs.

### Feature flag system

`config/features.js` served via `GET /api/features`, consumed client-side via React context:

```js
surfaces: {
  founder: true,       // active
  buyer: false,        // stubbed
  investor: false,     // stubbed
  broker: false,       // stubbed
  aws_seller: false,   // stubbed
  distributor: false,  // stubbed
  admin: true,         // active
}
layer2_cards: {
  program_match: true,
  risk_heatmap: false,
  vendor_route: true,
  quote: false,
}
cold_read: {
  shareable_url: true,
  preread_tool: true,
}
```

The six-surface stakeholder model is architecturally registered and feature-flagged. The surfaces cannot actually deliver without: database persistence, multi-tenant model, report templating engine, and entitlement layer. None of those exist yet.

### Frontend

**Stack:** React 19, React Router v7, Vite 8, Tailwind CSS 3, PostCSS. No state management library (zustand/tanstack-query were deferred in the v2 lock).

**Routes (all live):**
```
/                        — Home (cold read entry, hero, how it works)
/audit                   — Audit entry (URL input)
/audit/cold-read         — AuditColdRead (shareable ?url=X, SSE log)
/audit/reading           — AuditReading (inference display, corrections)
/processing              — Processing (analysis in progress)
/report/:session_id      — Report (Layer 1 + Layer 2 after email gate)
/report/demo             — Demo report (no API, uses demo-report.js)
/admin/preread           — AdminPreread (batch cold read tool)
/portal                  — Partner portal login (Google/MS OAuth or Auth0 PKCE)
/portal/callback         — OAuth/PKCE callback handler
/portal/dashboard        — PortalDashboard (leads filtered to tenant's vendor catalog)
/portal/lead/:id         — PortalLeadDetail (gap breakdown, engage flow)
/account                 — FounderDashboard (saved reports, partner activity)
```

**Report components:**
- `TrustScoreRing` — score visualisation
- `ConfidenceRibbon` — whole-report confidence indicator
- `GapCard` + `GapCardEvidence` — per-gap display with evidence
- `VendorMatrix` — quadrant matrix per gap (Layer 2)
- `VendorChip` — inline vendor display
- `ProgramMatchCard` — AWS program eligibility (Layer 2)
- `NextSteps` — remediation CTA
- `EmailGate` — Layer 2 unlock gate
- `LayerTwoPreview` — teaser before email capture
- `SnapshotThreeUp` — summary three-metric view
- `ScorePreviewRow` — score preview on report header

**Auth architecture (client-side only — no backend auth endpoints):**
- Partner portal: Google OAuth implicit or Microsoft OAuth implicit or Auth0 PKCE → `/portal/callback`, tenant resolved by email domain against `TENANTS` in `portal-leads.js`
- Founder: Auth0 PKCE only, `sessionStorage.auth0_intent = 'founder'`
- State stored in localStorage (`portal_auth`, `founder_auth`)
- Demo bypass buttons on both flows (mock state written to localStorage)
- `portal-leads.js` contains static mock `TENANTS` and `PORTAL_LEADS` — portal is demo-only, not live data

**Persona:**
- `PersonaChat.jsx` — Sophia live as chat persona on report surface
- `persona-prompts.js` — server-side persona prompt definitions

---

## What the latin stack can offer proof360 today

### VECTOR — lab, locally live (port 3003)
proof360 already routes ALL inference through VECTOR. `signal-extractor.js` and `nim-client.js` both use `http://localhost:3003/v1` with `apiKey: 'gateway'`. VECTOR handles provider routing (claude-* → Anthropic, everything else → NIM). This integration is complete and functional.

VECTOR is not yet on EC2. proof360 on EC2 uses VECTOR from the same host.

### VERITAS — lab, 117 tests passing (port 8740)
Provides governed truth claims — attestable, provenance-tracked, queryable. proof360's gap findings (`claimTemplate` outputs) are exactly the shape VERITAS consumes. Currently proof360 uses trust360 (a separate service) for claim confirmation. VERITAS is the architectural replacement and upgrade. Not integrated. Not on EC2.

### IMPERIUM — production, Phase 1+2 live on EC2 (port 8360)
Control plane / awareness dashboard. proof360 already fires pulse events to IMPERIUM via `pulse-emitter.js` (fire-and-forget, `DASHBOARD_API_URL` env var). If `DASHBOARD_API_URL` is unset, it silently no-ops. This is a live, partial integration.

### NEXUS — lab, locally running (not deployed)
Agent binding layer. Reads DOSSIERs, routes intents, builds capability maps. proof360 has an A2A agent card in its DOSSIER and an MCP surface planned. NEXUS could route external callers (partners, integrations) to proof360 via intent envelopes rather than direct API. Not integrated.

### PULSUS — lab, 166 tests passing
Cost signal plane. proof360's inference calls (Claude Haiku, NIM Nemotron) and third-party API calls (Firecrawl, HIBP, SSL Labs) represent real per-session cost. PULSUS would meter this per session and surface it to the partner portal (cost per lead generated). Not integrated.

### SIGNUM — pre-build, PLAN.md only, no code
Comms carrier — one endpoint, any channel (Telegram, WhatsApp, SMS, voice via Twilio). When proof360 completes a report, SIGNUM is the natural notification surface. Not integrated, not built.

### ARGUS — live, SPV (port 3007)
Monitors all registered services. proof360 implements `GET /health → 200 { status: 'ok' }` and is registered in `ARGUS/config/services.json`. This integration is live and correct.

---

## What exists as live commercial relationships

These are real, warm, active — they shape what the rebuild must support without pre-committing to any one structure:

- **Ingram Micro** — senior AWS/Cloud sales contact, offered 10% margin premium unprompted on HTML demo, has requested MD presentation
- **AWS** — Marketplace strategy conversation; Rada and Cisco-connected contact from recent event; co-sell motion active
- **Cisco** — adjacent conversations; proof360 as trust-currency extension
- **Macquarie Government** (long play) — sovereign operator for AU Gov via Aidan Tudehope relationship
- **27+ vendor relationships** — varying degrees, each a potential routing partnership
- **Austbrokers** — cyber insurance broker; insurance underwriting metered via Metronome is the identified commercial model

---

## The structural gap: what the rethink identified and nothing has resolved

The `docs/proof360-v2-rethink.md` (pre-convergence analysis) identified the core structural mismatch. Nothing has resolved it since. Quoting the core finding:

> The backend reads for five audiences. The frontend serves one.

Specifically:
- The recon pipeline, gap engine, vendor catalog, and AWS program engine are capable of serving six distinct stakeholder surfaces (founder, enterprise buyer, investor, insurance broker, AWS seller, distributor)
- The feature flags register all six surfaces
- The architecture to deliver them does not exist: no database, no multi-tenant model, no report templating engine, no entitlement layer, no workflow engine
- The rethink doc identified this as a Track C trigger (pentad-native rewrite reactivation) because "multi-stakeholder surfaces are a revenue motion the current code cannot carry"
- At the time, the lock chose Option B (expand Track A, don't rewrite) because the pentad planes weren't ready
- The planes are now lab-ready. The trigger condition is still unresolved.

---

## What this convergence must resolve

### 1. Architecture decision: incremental expansion vs pentad-native rebuild

The v2 lock deferred Track C (pentad-native) because the planes weren't ready. They are now lab-ready (VERITAS 117 tests, PULSUS 166 tests, NEXUS running, VECTOR live). The Track C trigger from the rethink doc is still active.

Three honest paths:
- **Option B (expand Track A):** Add the missing infrastructure (Postgres, multi-tenant, templating, entitlement) to the current Node/Fastify stack. Six surfaces arrive incrementally inside the expanded architecture. pentad planes integrated service-by-service.
- **Option C (pentad-native):** proof360 v3 is rebuilt as a native NEXUS module. IMPERIUM renders its surfaces as role-scoped projections. VERITAS attests every gap finding. PULSUS meters every session. Sessions route as intent envelopes, not direct API calls.
- **Option D (hybrid):** Current codebase + VECTOR + IMPERIUM pulse stays. VERITAS integration added for gap attestation. NEXUS wraps the existing API for external callers. No DB, no multi-tenant yet — defer to revenue milestone.

What each surface requires and which option can deliver it is the primary decision.

### 2. The recon pipeline — govern or leave autonomous

The passive recon pipeline (10 sources) is a live capability that was never specced. It is architecturally ungoverned: no provenance on its findings, no audit trail, no claim attestation. Every gap triggered by recon context is currently unverified.

Options:
- Wrap recon outputs as VERITAS claims (each source's finding becomes an attested fact before feeding the gap engine)
- Leave recon as a fast-path pre-filter; only trust360/NIM confirmed gaps become governed claims
- Route recon pipeline through NEXUS so its results are logged as intent outputs

This has compliance implications: if proof360 is presented to enterprise buyers as a trust assessment, the provenance of its inputs matters.

### 3. Trust claim confirmation: trust360 vs VERITAS vs NIM

Current flow: `gap-mapper.js` calls trust360 (parallel, 20s timeout, fallback confirms all gaps if unavailable). NIM client exists as a parallel path for claim evaluation.

VERITAS is the architectural replacement for trust360. The question is migration path and whether trust360 continues to exist as a separate service or is retired when VERITAS reaches production.

### 4. Session persistence: in-memory vs Postgres

No database. Sessions live in-memory. `signals_object` (the data moat — structured data about real companies) is lost on restart. `leads.ndjson` is the only persistence.

The rethink doc identified Postgres as required for: multi-tenant model, session replay, cross-session analysis, the signals_object dataset moat actually accumulating. This is a foundational decision — nothing else can be built properly without it.

### 5. Partner portal: mock to live

The partner portal currently serves static data from `portal-leads.js` (`TENANTS`, `PORTAL_LEADS`). Lead status and engagements are localStorage only. Auth is demo-bypass or OAuth implicit (no backend verification).

A live partner portal requires: real session data in a database, real tenant model, backend-verified auth, real lead routing to the right tenant's vendor catalog. This is the Ingram commercial motion — they need a working portal to route leads.

### 6. SIGNUM integration: report delivery and alerting

When proof360 completes a report, there is currently no notification path. SIGNUM (pre-build) is the designed comms carrier. The question is whether SIGNUM needs to be partially built before proof360 v3 can ship its commercial motions, or whether email (capture-email gate) is sufficient for now.

The Telegram report push (noted in memory as a future idea) is a SIGNUM integration.

### 7. GPU inference and the self-hosted signal stack

The GPU manager (`gpu-manager.js`) wires to an on-demand GPU EC2 instance for NIM Nemotron inference. This is a significant operational capability — on-demand GPU for trust claim evaluation — that requires the GPU instance to be provisioned, warm-up time to be managed, and cost to be tracked.

This was not in the v2 spec. The convergence must decide:
- Is GPU inference the primary trust claim path, or a secondary high-confidence path alongside trust360?
- Who meters GPU cost? (PULSUS is the answer, but not integrated)
- What's the fallback when the GPU instance is cold or unavailable?

### 8. Six surfaces — which ships first, which is v3.0 vs v3.1

The rethink doc defines six stakeholder surfaces. The feature flags exist. The commercial paths are different per surface. This convergence must produce a clear phasing:
- v3.0: what ships first (founder surface rebuilt on new architecture)
- v3.1: first commercial expansion surface
- v3.x: subsequent surfaces by commercial priority

The Ingram MD presentation and AWS Marketplace strategy are near-term forcing functions. The phase plan must not block these conversations.

### 9. Demo continuity during rebuild

The current proof360 codebase is live at proof360.au. Whatever the convergence decides, demo continuity must be maintained. Options from the v2 lock still apply:
- Freeze and branch
- Rebuild behind feature flags on the same domain
- One-page HTML demo fronts the domain during rebuild

The Ingram MD presentation is a near-term milestone. This shapes timeline risk.

### 10. SENATE and proof360's relationship to the platform

SENATE is now the platform layer — the customer-facing pane of glass above all 360 products. Does proof360 sit inside SENATE (as one surface among many), or does proof360 remain a standalone product with SENATE as a future integration point?

This has UX, routing, and commercial implications. The partner portal may be a SENATE concern rather than a proof360 concern.

---

## Known design tensions

### Tension 1: Revenue urgency vs architecture completeness
The Ingram MD presentation and AWS commercial motions are near-term. A full pentad-native rebuild takes longer than incremental expansion. But incremental expansion carries technical debt into every subsequent surface.

### Tension 2: Recon pipeline provenance
The recon pipeline produces ungoverned findings. VERITAS attestation would govern them but adds latency. Fast ungoverned reads are commercially useful (the cold read pitch). Governed reads are enterprise-credible. Both may be needed at different price points.

### Tension 3: trust360 dependency
trust360 is a separate service called by proof360 for gap confirmation. It has a 20s timeout and a fallback that confirms all gaps if unavailable. If trust360 goes away or is replaced by VERITAS, this dependency needs migration planning.

### Tension 4: GPU cost and metering
NIM Nemotron inference on a GPU EC2 instance has real cost. Without PULSUS metered to the session, proof360 has no visibility into per-assessment cost. This affects pricing decisions for paid surfaces (buyer, investor, insurance).

### Tension 5: The partner portal is a business blocker
Ingram cannot route leads through a static mock. A live partner portal requires database, multi-tenant, and backend auth — the same infrastructure the multi-surface model requires. The partner portal's commercial urgency may force the architecture decision.

### Tension 6: NEXUS intent routing vs direct API
proof360's MCP surface and A2A agent card are planned. NEXUS would route external callers through intent envelopes. But NEXUS is not yet deployed. The question is whether to build direct API integrations now and migrate to NEXUS intent routing when it deploys, or to defer external integrations until NEXUS is production-ready.

---

## Hard rules — carry forward from v2

1. **VECTOR for all inference.** Never call Claude, NIM, or any AI provider directly. All inference through `http://localhost:3003/v1`.
2. **AWS hard-code.** Every commercial decision defaults to AWS-first: Marketplace, MAP, ISV Accelerate, co-sell.
3. **HX First.** Every surface returns the human to agency. No engagement-maximising patterns. No dark UX.
4. **Sovereign-deployable by construction.** proof360 must run in sovereign environments without architectural change.
5. **Commercial adaptability preserved.** The arrangement engine remains the strength. No decision locks to a single arrangement shape.
6. **No agent validates its own work.** Build report maps each brief requirement to result or test artifact. "Build passed" is not a report.
7. **ARGUS monitoring contract.** Every HTTP service: `GET /health → 200 { status: 'ok' }`. Every deployed service: entry in `ARGUS/config/services.json`.

---

## Output format for the locked spec

The convergence output must include:

1. **Architecture decision** — Option B, C, or D with rationale and the tensions it resolves and the debt it carries
2. **Plane consumption contract** — which VECTOR, VERITAS, PULSUS, NEXUS, IMPERIUM intents proof360 sends and receives; what stays inside proof360
3. **Recon pipeline governance** — governed vs ungoverned path, provenance model
4. **Session persistence** — Postgres schema outline or explicit deferral rationale
5. **Six surfaces phase plan** — v3.0 / v3.1 / v3.x scope with commercial rationale for ordering
6. **Partner portal path to live** — what it takes to go from mock to real, in what order
7. **Demo continuity plan** — how proof360.au stays demoable during rebuild
8. **SENATE relationship** — proof360 as standalone vs SENATE surface
9. **Kiro build brief readiness gate** — exact file paths, test requirements, constraint table with named attack paths, deferral list, success criteria, authority chain

---

## What this convergence is NOT resolving

- SIGNUM build spec — SIGNUM is pre-build; assume email is the comms path for v3.0
- SENATE build — SENATE is spec-only; proof360 should be designed to integrate but not depend on it
- NEXUS production deployment — assume NEXUS is available for local integration, not EC2-deployed
- Specific vendor contract terms — commercial relationships are context, not architecture inputs

---

## Protocol instructions

This seed enters Round 1 as-is. Do not resolve open questions before convergence begins.

**Claude.ai role:** Operator / Synthesiser. Hold the architectural coherence. Challenge positions that create future debt without explicit commercial justification.

**ChatGPT role:** Architect. Design pressure on structure, data flow, and interface contracts. Produce the tighter, more constrained position each round.

**Adversarial note:** Grok will be given the locked artefact in Stage 4. Design for attack vectors from the start — assume Grok will challenge the recon pipeline provenance, the GPU cost model, and the partner portal security posture.

Lock signal: both declare "Feels recursive."

The locked output becomes `proof360-v3-convergence-locked.md` and feeds:
- Stage 2 Kiro build brief
- Updated proof360 DOSSIER with v3 architecture declared
- VERITAS integration spec (if chosen)
- NEXUS intent surface definition (if chosen)

---

*Seed only. Not locked. Not built.*
*Authority: john-coates*
*Prepared by: claude-code (Verifier role)*
