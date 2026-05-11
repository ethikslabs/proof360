# proof360 — Deep Research Brief for ChatGPT 5.5

**Prepared by:** Claude.ai (Operator)
**For:** ChatGPT 5.5 deep research mode
**Authority:** John Coates (Final)
**Date:** 2026-04-26
**Scope:** Full solution analysis, competitive landscape, architectural validation, technical pattern critique, commercial model assessment, market positioning, moat analysis. **No stone unturned.**

---

## 0. How to use this brief

This is a research brief, not a sales document. Be honest, be sharp, push back where the architecture has weaknesses or the commercial position has competitive exposure.

**Output format:** structured markdown report, target 8,000–15,000 words. Use sections per research question. Cite sources where claims are external (competitor pricing, market data, technical patterns). Don't cite within proof360's own architecture description — that's provided.

**Honesty contract:** if you find a competitor doing something proof360 hasn't anticipated, surface it. If the architecture has a defensible weakness an enterprise procurement team would flag, surface it. If there's a stronger commercial path than the one described, surface it. The point is to find the gaps, not validate the work.

**Stop condition:** when you've answered every numbered research question with substantive analysis backed by sources where possible. Don't pad. Don't repeat.

---

## 1. The system being researched

### 1.1 What proof360 is (one paragraph)

proof360 is a deterministic signal correction engine with governed claim escalation and commercial routing attached. It takes a company URL, runs a multi-source reconnaissance pipeline, infers structured signals about the company (stage, sector, infrastructure, customer type, geo, compliance posture), evaluates trust gaps against compliance frameworks (SOC 2, ISO 27001, APRA CPS 234, IRAP, Essential Eight, NIST), and produces a scored report. The report has two tiers: Tier 1 is a free diagnostic (gap candidates with confidence, no score, no vendor matrix); Tier 2 is the actionable surface (trust score, vendor matrix, AWS programme matching, three-branch engagement router) gated by VERITAS attestation. Users can override any inferred field through a structured mutation contract; overrides trigger full deterministic recompute. Successfully attested gaps unlock a vendor matrix that routes commercial engagement through three branches: direct (founder commission), distributor (Ingram Micro / Dicker Data margin), or vendor-direct.

### 1.2 The constitutional architecture

proof360 v3.0 is governed by a doctrine pair operating at the constitutional layer above the system:

> **Compute is centralised. Rendering is distributed.**
> **Mutation is gated. Reads are unrestricted.**

Backend owns signals (state), recompute (truth), and the attestation boundary. Frontends — web, mobile, AR, voice, agent, MCP caller — receive derived state and render. They do not compute. They do not mutate truth. Reading derived state carries no contract beyond authentication. Mutating truth carries a single contract: the structured override-submission shape `{ actor, reason, timestamp, value, field, session }` with conflict semantics. Every mutation surface uses the same shape.

**The pair stated tightly:** *All decisions are derived. All mutations are explicit. All truth is replayable.*

### 1.3 The runtime model

```
signals (inferred + override stack, persisted in Postgres)
  ↓
POST /recompute
  ↓
[full deterministic pipeline]
  ├── gap evaluation (config/gaps.js triggerCondition over signals + persisted recon outputs)
  ├── trust score computation (Σ severity weights of triggered gaps; gated by sessions.status)
  ├── AWS programs filter (eligibility rules over signals)
  ├── vendor matrix selection (config/vendors.js × tenant filter × VERITAS attestation state)
  └── confidence ribbon derivation
  ↓
derived_state (returned as JSON, never stored)
```

**Fast path:** recompute (synchronous, no external calls, no AI inference, deterministic over persisted state).
**Slow path:** VERITAS attestation (asynchronous, batched, triggered on Tier 2 publish click).

### 1.4 The data model

Six relational tables plus three append-only event tables in Postgres:

| Table | Purpose |
|---|---|
| `sessions` | One per assessment; status tracks tier1 / tier2_published |
| `signals` | One row per signal field (stage, sector, etc.); carries inferred_value, current_value materialised from override stack head, status: inferred/overridden/conflicted |
| `gaps` | One row per triggered gap; carries veritas_claim_id, veritas_class (ATTESTED/INFERRED/UNKNOWN), confidence |
| `tenants` | Partner tenants with vendor catalog filter and partner branch (distributor/vendor/internal) |
| `engagements` | Commercial state per engagement (selected_branch, routed_tenant, vendor, status) |
| `leads` | Email-captured leads (migration from leads.ndjson) |
| `recon_outputs` | Persisted recon results (DNS, HTTP, certs, IP, GitHub, jobs, HIBP, ports, SSL Labs, AbuseIPDB, Firecrawl-via-Claude) keyed by session_id with TTL |
| `signal_events` (append-only) | Every signal mutation: inferred, overridden, rescanned, conflict_resolved |
| `engagement_events` (append-only) | Every engagement transition: created, routed, accepted, rejected, converted |
| `attribution_ledger` (append-only) | Money truth per engagement party: expected/confirmed/received × amount/date |

**Critical rule:** events reference their domain tables. They do not mirror. `signal_events` does not duplicate VERITAS claim history. `engagement_events` does not duplicate `attribution_ledger`.

### 1.5 The override contract (the only mutation surface)

```http
POST /api/v1/session/:id/override
{
  "field": "stage",
  "value": "Series A",
  "actor": "founder",
  "reason": "user override"
}
```

**Rules (server-enforced):**
1. System overrides never beat human overrides (rescans never undo edits).
2. Overrides are append-only via `signal_events`.
3. Latest human override = `current_value`.
4. Cross-actor conflict (founder vs partner) sets `signals.status = 'conflicted'`. No silent merge.
5. Recompute uses only `current_value`, never the stack.
6. Conflict resolution is explicit through `POST /api/v1/session/:id/resolve-conflict`.

**The override panel is one renderer of this contract.** Partner portal corrections, MCP agent submissions, and any future write surface use the identical shape. This is the doctrine "mutation gated" instantiated.

### 1.6 The recon pipeline (signal sources)

Sources hit per session, all results persisted to `recon_outputs`:

| Source | Type | Unit | Free/Paid | What it provides |
|---|---|---|---|---|
| Firecrawl + Claude Haiku via VECTOR | LLM extraction | tokens | paid | Stage, sector, customer type, geo, infrastructure, hiring intent, compliance signals from website + landing pages |
| DNS | direct | query | free | Domain age, MX records, NS records, SPF/DMARC presence |
| HTTP | direct | request | free | Headers, security headers (HSTS, CSP), tech stack |
| Certs (crt.sh) | API | query | free | Subdomain inventory, certificate transparency posture |
| IP (ipapi.co) | API | query | free | Hosting provider, geo of origin server |
| Ports | direct | scan | free | Public-facing service inventory |
| SSL Labs | API | query | free | TLS configuration grade |
| GitHub | API | calls | free (rate-limited) | Org presence, repo activity, contributor patterns |
| Jobs page | direct | scrape | free | Hiring intent, role types, security/compliance roles |
| HIBP | API | calls | paid | Breach history per email domain |
| AbuseIPDB | API | calls | free tier + paid | IP reputation history |

**Signal extraction:** the LLM step (signal-extractor.js) takes Firecrawl-fetched HTML + landing page summaries and produces a structured signal object. The model is Claude Haiku via VECTOR. The prompt is deterministic. The output is JSON-schema-validated.

**Signal storage:** raw signals from extraction populate `signals` rows with `inferred_value` and `inferred_source = 'claude-haiku-via-vector'`. Override stack is empty until the user edits. `current_value` initially equals `inferred_value`.

### 1.7 Gap evaluation

Gaps are defined declaratively in `config/gaps.js`. Each gap definition carries:

```js
{
  id: 'no_dmarc_record',
  category: 'governance',
  severity: 'medium',
  triggerCondition: (signals, recon) =>
    !recon.dns?.dmarc_present || recon.dns?.dmarc_policy === 'none',
  framework_impact: ['SOC 2 CC6.7', 'ISO 27001 A.13.2.3'],
  evidence_template: (signals, recon) => ({...}),
  closure_strategies: ['Configure DMARC policy reject', 'Use Cloudflare Email Security'],
  vendor_implementations: ['cloudflare', 'mxtoolbox'],
  score_impact: 5,
  time_estimate: '2 hours',
}
```

The gap evaluator runs every gap definition's `triggerCondition` against the materialised signals + recon outputs. Triggered gaps populate the `gaps` table. Each triggered gap gets a confidence score from a separate evaluator (currently NIM Nemotron via VECTOR; this is the existing trust-client primary path).

### 1.8 VERITAS adapter (Tier 2 attestation)

VERITAS is a separate Latin-named primitive in the broader stack. It is a governed claim attestation engine: takes structured evidence, generates a claim, returns ATTESTED / INFERRED / UNKNOWN with confidence and reasoning. VERITAS owns its own database (Postgres + pgvector for semantic query), runs deterministic replay, carries Merkle-proof tamper evidence, and enforces a three-tier corpus (global / module / tenant). VERITAS is independent: zero stack imports.

**proof360's interaction with VERITAS:**

1. User clicks "publish Tier 2" in the report UI.
2. proof360 backend handler `POST /api/v1/session/:id/publish` triggers the adapter.
3. Adapter loads all triggered gaps for the session.
4. For each gap, adapter builds an evidence bundle:

```json
{
  "predicate": "no_dmarc_record",
  "projection": "<claim text generated from gap evidence template>",
  "content": {
    "signals": [{ field, value, source, confidence }, ...],
    "recon_evidence": { dns, http, certs, ... },
    "gap_evidence": <triggered gap evidence object>
  },
  "tenant_id": "<proof360 tenant uuid in VERITAS>",
  "freshness_ttl": 86400
}
```

5. Adapter `POST /evidence/ingest` to VERITAS → returns `evidence_id`.
6. Adapter `POST /claim/generate` with `evidence_id` → returns:

```json
{
  "claim_id": "uuid",
  "claim_class": "ATTESTED" | "INFERRED" | "UNKNOWN",
  "confidence": 0.0-1.0,
  "reasoning": "string"
}
```

7. proof360 stores `claim_id`, `claim_class`, `confidence`, `attested_at` on the gap row. **No claim history duplicated** — proof360 holds reference only.
8. Render mapping (server-side, in recompute):
   - ATTESTED, confidence > 0.85 → render in vendor matrix
   - ATTESTED, confidence ≤ 0.85 → render with caveat
   - INFERRED → exclude from vendor matrix, render gap with "inferred" badge
   - UNKNOWN → exclude, render gap with "insufficient evidence" badge

**Failure mode (deliberate, hard):** VERITAS unavailable returns HTTP 503 from publish. No fallback-confirm. proof360 v1 silently confirmed all gaps when trust360 was down — this is the exact failure mode v3 hard-fails to prevent.

**Republish (revision):** subsequent edits + republish trigger partial re-attest only on changed signals → affected gaps. Successful prior attestations reused via claim_id.

### 1.9 Vendor selection matrix

Vendors are defined in `config/vendors.js`. Each vendor carries:

```js
{
  id: 'vanta',
  name: 'Vanta',
  description: 'SOC 2 automation platform',
  closes_gaps: ['no_soc2_attestation', 'incident_response_docs', ...],
  cost_range: '$8k-$24k/year',
  timeline: '8-16 weeks',
  routing: {
    primary: { party: 'john', type: 'email_intro', template: 'vanta_intro' },
    alternatives: [
      { party: 'vendor', type: 'direct_link', url: 'vanta.com/...', label: 'Connect with Vanta directly' }
    ]
  }
}
```

**Matrix construction (in recompute kernel, server-side):**

1. Filter gaps to those with `claim_class = ATTESTED` (per render mapping above).
2. For each attested gap, look up vendor candidates via `closes_gaps[]`.
3. Apply tenant filter: if session is in a tenant context (partner portal), narrow to vendors in `tenants.vendor_catalog_filter[]`.
4. De-duplicate vendors that close multiple gaps (one row per vendor with all closes_gaps).
5. Order by: (a) gaps closed weighted by severity, (b) priority of routing branch, (c) vendor priority field.
6. Return matrix to frontend with routing options per vendor.

**Three-branch routing per vendor:**
- `john` — proof360 routes, founder commission
- `distributor` — match `tenants.partner_branch='distributor'` (Ingram Micro for AWS/Cisco/Palo Alto, Dicker Data for Cloudflare/Vanta)
- `vendor` — direct attribution, no proof360 cut

**User picks branch only where alternatives exist** (vendor has both `primary` and `alternatives` populated). For most vendors, routing is pre-determined by config.

**Engagement creates rows in three tables:**
- `engagements` — state (selected_branch, routed_tenant, vendor, status)
- `engagement_events` — lifecycle (created, routed, accepted, converted)
- `attribution_ledger` — money (party, share %, expected/confirmed/received × amount/date)

Telegram alert fires via SIGNUM stub on engagement creation to relevant tenant.

### 1.10 The 360 stack (where proof360 sits)

proof360 is one product in a Latin-named primitive stack:

```
IMPERIUM (control plane — port 8360, ethikslabs.com)
├── proof360 (entity onramp — this product, port 3002, proof360.au)
│   ├── inference   → VECTOR (Claude Haiku, NIM Nemotron, embeddings via OpenAI-compatible API)
│   ├── attestation → VERITAS (Tier 2 publish gates vendor matrix)
│   ├── metering    → PULSUS (dual ledger: VECTOR tokens + proof360 consumption)
│   ├── monitoring  → ARGUS (CloudWatch → SNS → Telegram chain)
│   ├── alerts      → SIGNUM stub (3-line wrapper for portal Telegram)
│   └── pulse       → IMPERIUM (fire-and-forget event emission)
```

**VECTOR:** sovereign-by-construction inference router. OpenAI-compatible API. 6+ models registered (NIM Nemotron, Anthropic Claude family, OpenAI embeddings, Bedrock, Azure AI Foundry). Per-call metering captures tenant_id, model, provider, tokens, sovereignty_tier, route_decision, timestamp, correlation_id. Convergence endpoint runs parallel multi-model fan-out with arbiter synthesis. Sovereignty enforcer blocks non-sovereign provider calls when tenant policy requires. MetronomeSink wired as optional billing path for VECTOR-as-a-service customers (separate commercial track from proof360).

**VERITAS:** governed claim attestation engine. Three-tier corpus (global / module / tenant). 53-entry seed corpus covering CISSP 8 domains and 35+ compliance frameworks. Merkle-proof tamper evidence. Deterministic replay. Sovereign veto cannot edit history. proof360 is a tenant; tenant_id provisioned in VERITAS before adapter goes live.

**PULSUS:** cost signal plane. CLI only, no HTTP. TypeScript. Reads `VECTOR/data/metering.ndjson` (LLM tokens) and proof360's new `consumption.ndjson` (non-VECTOR external scan calls). Aggregates per session_id, per tenant, per source. Surfaces cost-per-scan as commercial intelligence.

**ARGUS:** observability sentry. CloudWatch + SNS + Telegram chain. Monitors `/api/health` on every service. Architecturally also being productised as a CF Pages product with Auth0 role-gated views (Board/Investor/Sales/NOC/SOC).

**SIGNUM:** comms carrier. Pre-build. v3.0 uses 3-line stub wrapper. Future: full multi-channel routing (Telegram, WhatsApp, Signal, SMS, voice via Cartesia).

**IMPERIUM:** control plane. ethikslabs.com static + serve layer. Portfolio surface (19 SPVs glyph-first). Deploy notification. Pulse consumer.

### 1.11 Commercial context

- 27+ signed commercial agreements covering: Cloudflare (MSSP status), Vanta (MSP), Cisco (MSP), Palo Alto, Okta/Auth0, Fireblocks, Frankieone, Cognitive View, Cyber Pro Insurance (Austbrokers), Ingram Micro, Dicker Data
- AWS Activate Founders credits funding infrastructure
- Ingram Micro MD relationship active; partner portal forcing function for v3.0
- AWS partner pipeline forming; recent partner event generated 6/20 active follow-ups, AWS MD noted founder name unpromptedly, Cisco AWS Marketplace conversation reopened with former colleague
- Founder is Australian, dual-entity (NSW Pty Ltd + Singapore APAC Pte Ltd)
- Domain commercial isolation: ethikslabs.com is founder-only; ethiks360.com is the broader entity

---

## 2. Research questions (in priority order)

### Question 1 — Competitive landscape mapping

Map the competitive landscape across four overlapping markets. For each, identify direct competitors, adjacent competitors, and emerging entrants. Assess each competitor's funding, customer count, pricing, technical architecture, and provenance/governance posture.

**Markets to map:**

1.1. **Trust scoring / vendor risk management** — entities like SecurityScorecard, BitSight, RiskRecon (Mastercard), UpGuard, Black Kite, Panorays, ProcessUnity, OneTrust Vendorpedia. Plus emerging: SecurityPal (formerly Bee Secure), Conveyor (formerly SecurityPal), Whistic, SafeBase, Vendict, Drata Trust Center, Vanta Trust Center.

1.2. **Compliance automation platforms with vendor recommendation surfaces** — Vanta, Drata, Secureframe, Sprinto, Hyperproof, Tugboat Logic (OneTrust), Strike Graph, Thoropass.

1.3. **AI-attested claim / governance platforms** — Sigstore (in-toto), Slim.AI, Chainguard, Anchore, GUAC graph, Kosli, Reken, Whyhow.ai, plus emerging W3C VC issuers in supply chain.

1.4. **AWS partner ecosystem trust qualification players** — anyone routing AWS programme eligibility (Activate Portfolio, MAP, GenAI Accelerator, IMAGINE Grant) into a productised funnel. Includes accelerators (Cicada, Antler, Techstars) acting as upstream qualifiers.

**For each competitor identified:**
- What they do (one paragraph)
- Pricing (transparent or RFQ)
- Architecture publicly known (multi-tenant SaaS, on-prem, sovereign deployment options)
- AI/LLM posture (do they use it, do they govern it, do they attest it)
- Vendor neutrality (are they paid by vendors, do they sell their own tool, do they route)
- Funding stage and last raise
- Customer count (where public)
- Go-to-market: direct, channel, marketplace
- Geographic strength (US, EU, APAC, AU)

**Deliverable:** competitive matrix in markdown. 30+ competitors minimum across the four markets. Rank top five threats to proof360 with reasoning.

### Question 2 — Architectural pattern critique

Evaluate proof360's v3 architecture against industry patterns. Be honest about weaknesses.

2.1. **Doctrine pair (compute centralised, mutation gated):** how does this compare to event sourcing (Greg Young, Martin Fowler), CQRS, redux pattern at scale, deterministic state machines, blockchain transaction models? Is the doctrine novel, derivative, or industry-standard? What are the failure modes the doctrine doesn't prevent?

2.2. **Override stack (signal-level append-only mutation log):** compare to operational transformation (Google Docs), CRDTs (Automerge, Yjs), version control (Git's commit DAG), three-way merge in collaborative editing. Is the stack model defensible at scale? What happens at 10K signals per session, 1M sessions, 100K conflicting cross-actor overrides per day?

2.3. **Deterministic recompute kernel:** compare to materialized view maintenance (Postgres mat views, RisingWave, Materialize), incremental computation (Differential Dataflow), reactive frameworks (Solid, Reactive Manifesto). proof360 explicitly rejects partial recompute. Is full recompute cost-defensible at scale? At what signal count does this break?

2.4. **VERITAS attestation pattern:** compare to Sigstore (Fulcio + Rekor + Cosign), in-toto attestations, SLSA framework levels, GUAC graph, JSON-LD signed Verifiable Credentials, W3C DID + VC stack. Does VERITAS's claim_class taxonomy (ATTESTED/INFERRED/UNKNOWN) map to existing models? Where does it diverge?

2.5. **Two-tier provenance (Tier 1 diagnostic vs Tier 2 attested):** compare to freemium SaaS gating, public preview vs gated full report (Crunchbase, PitchBook, Glassdoor), unauthenticated vs authenticated API surfaces. Does the structural-not-paywall framing hold against an enterprise procurement team's scrutiny?

2.6. **Three-table engagement model (state + events + attribution_ledger):** compare to event-sourced CQRS, double-entry bookkeeping, Stripe's Ledger schema, partner attribution patterns in Salesforce, HubSpot. Is the separation defensible at audit?

2.7. **Per-vendor routing rules in config:** compare to feature flag systems (LaunchDarkly, Statsig), business rules engines (Drools, OpenL Tablets), workflow engines (Temporal, n8n, Zapier). proof360 explicitly rejects a workflow engine. At what vendor count does config-driven routing break?

2.8. **Sovereign-deployable by construction:** compare to SaaS-only competitors (Vanta), customer-deployed appliances (Splunk Heavy Forwarder), bring-your-own-cloud (Snowflake, Confluent). Is sovereign deployment a market wedge or a cost sink?

**Deliverable:** for each pattern, two paragraphs: (a) industry comparison with named precedents, (b) honest critique of proof360's choice. Where proof360 is on weak ground, name it. Where it's on strong ground, say why.

### Question 3 — VERITAS interrogation pattern

Deep technical analysis of how proof360 queries VERITAS and how this compares to industry attestation patterns.

3.1. The evidence/ingest → claim/generate two-step. Why two steps? How does this compare to single-step attestation flows (Sigstore's keyless signing, in-toto's chained predicates)?

3.2. The freshness_ttl parameter (86400s). How does this compare to cache invalidation strategies in attestation systems? What happens when recon evidence ages out mid-session?

3.3. VERITAS's claim_class taxonomy:
- ATTESTED = sufficient evidence to generate claim with high confidence
- INFERRED = partial evidence, claim generated but uncertain
- UNKNOWN = insufficient evidence

Compare to:
- TUF / Sigstore trust levels
- W3C VC verification statuses
- SLSA levels 0-4
- COBIT confidence bands
- ISO 27001 certification statuses
- Vouch/proof patterns in supply chain (in-toto, GUAC)

3.4. The "no fallback-confirm" hard rule. Compare to industry patterns where attestation failure has degraded modes (Sigstore offline verification, certificate stapling fallbacks). Is hard-fail defensible commercially?

3.5. Partial re-attestation (gapsRequiringReattestation filter). Compare to incremental attestation in CI/CD (GitHub artifact attestations, GitLab provenance), patch-based provenance updates.

3.6. Independence boundary: VERITAS imports nothing from proof360, proof360 holds claim_id reference only. Compare to data ownership patterns in B2B SaaS (Notion, Airtable), to "your data is yours" claims in privacy-focused tools (Proton, Signal).

**Deliverable:** technical assessment per sub-question. Where the pattern is novel, say what's novel. Where it's derivative, name the precedent. Where the rationale doesn't survive scrutiny, surface it.

### Question 4 — Provenance flow analysis

Trace provenance through the entire pipeline and compare to industry provenance standards.

4.1. **Recon → signal → gap → claim chain:**
- Recon outputs persisted with timestamp + source.
- Signals carry inferred_source ("claude-haiku-via-vector") + confidence.
- Override stack records actor + reason + ts per mutation.
- Gaps carry triggered evidence object with recon citations + signal citations.
- VERITAS claim chain references back to evidence_id which carries the full content blob.

Compare to:
- W3C Verifiable Credentials chain
- C2PA (content provenance for media)
- in-toto attestation chains
- GUAC document graph
- SLSA build provenance
- Provenance, Authoring, Authorship in academic publishing (CRediT)

4.2. **Frontend rendering provenance:** the frontend never claims to be the source of derived state. Backend's `derived_state` payload carries source attribution per field. How is this surfaced to user? How does this compare to news/journalism source-attribution UX (NYT's "How we know" sidebars, Bloomberg terminal source codes)?

4.3. **Audit replay paths:** signal_events replay reconstructs override stack chronologically. engagement_events replay reconstructs commercial lifecycle. VERITAS holds claim provenance separately. Three audit domains, no mirroring. Compare to event-sourced CQRS audit replay, regulatory audit trails (SOX, FINRA), compliance log immutability (CloudTrail, Auditd).

4.4. **The "all truth is replayable" doctrine:** is this commercially valuable to enterprise procurement teams? Specific use cases where replay matters (regulator request, dispute resolution, partner attribution audit).

**Deliverable:** provenance flow diagram in text/ASCII, plus assessment of how this compares to and exceeds (or falls short of) industry standards.

### Question 5 — Vendor selection matrix deep dive

The vendor matrix is the commercial mechanism. Deep analysis required.

5.1. **Matrix construction logic:** filter to attested gaps → look up vendor candidates → apply tenant catalog filter → de-duplicate by vendor → order by gaps closed × severity × routing branch priority × vendor priority. Compare to recommendation engines:
- Collaborative filtering (Netflix, Amazon)
- Content-based filtering
- Multi-armed bandits
- Constraint-based recommenders (academic literature)
- Marketplace ranking (AWS Marketplace search algorithm, Salesforce AppExchange)

5.2. **Vendor neutrality vs commercial alignment:** proof360 has 27+ signed agreements. Does the matrix favour signed vendors? If yes, how is this disclosed? Compare to:
- Buyer-side ad disclosure (FTC requirements)
- Consumer Reports neutrality
- Wirecutter affiliate model
- Healthcare comparison sites (transparency requirements)
- B2B SaaS comparison sites (G2, Capterra, TrustRadius — known affiliate-driven)

5.3. **Three-branch engagement router (john / distributor / vendor):** how does this compare to:
- Channel partner routing (Ingram Micro Comet, Tech Data StreamOne)
- AWS Marketplace's partner routing
- Salesforce AppExchange's reseller model
- Vanta's partner programme
- Lead routing in modern PRM (Impartner, Crossbeam, Reveal)

5.4. **Per-vendor routing rules in config:** the model is each vendor has a `primary` route + optional `alternatives`. User picks alternative only where one exists. Compare to:
- Lead routing in HubSpot, Salesforce
- Partner round-robin assignment
- Geographic routing (Cloudflare's load balancing)
- Skill-based routing (call centre infrastructure)

5.5. **Attribution ledger:** expected → confirmed → received × amount/date per party. Compare to:
- Stripe's Ledger schema
- QuickBooks accounts payable/receivable
- Salesforce Opportunity → Order → Invoice → Payment chain
- Channel partner attribution disputes (industry literature)
- Crossbeam / Reveal partner attribution patterns

5.6. **Tenant-level catalog filter:** `tenants.vendor_catalog_filter[]` narrows the matrix to a partner's vendor set. How does this compare to:
- White-label B2B SaaS multi-tenancy
- Reseller portal vendor catalogs (Ingram Micro Marketplace)
- Distributor product carousel patterns

**Deliverable:** detailed analysis per sub-question with concrete examples from named industry comparators.

### Question 6 — Use case journey mapping

Map the user journeys end to end. For each, identify friction points, conversion drivers, and competitive vulnerabilities.

6.1. **Founder journey** — lands on proof360.au with question ("can I close this enterprise deal?"), submits URL, sees Tier 1 cold read, edits inferred fields via override panel, publishes Tier 2 (VERITAS attests), reviews vendor matrix, picks engagement branch per vendor, gets routed.

6.2. **Partner journey (Ingram Micro)** — partner portal access via SSO, sees leads routed to Ingram tenant, takes ownership, surfaces customer in Ingram CRM, closes commercial loop.

6.3. **AWS seller journey** — AWS partner sees proof360 as qualified-funnel source, customer arrives with "you qualify for X, Y, Z programmes" pre-established, AWS seller skips qualification step.

6.4. **Vendor journey (Vanta)** — Vanta sees lead via direct branch attribution, customer pre-qualified by gap closing assignment, Vanta closes faster because gap analysis already done.

6.5. **Buyer/investor journey (future v3.x)** — buyer asks vendor for proof360 trust profile, vendor links to attested public surface, buyer rejects unattested portions, conversation accelerates.

**For each journey:**
- Step-by-step (5-10 steps)
- Friction points (where dropouts happen)
- Conversion driver (the specific moment value is realised)
- Time to value (from arrival to actionable insight)
- Competitive vulnerability (where a competitor could intercept)

**Deliverable:** five journey maps with friction analysis.

### Question 7 — Commercial model assessment

Evaluate the revenue model. Surface weaknesses honestly.

7.1. **Three-branch attribution (john / distributor / vendor) — reality of margin capture:**
- John branch: founder commission on vendor sale. Typical SaaS reseller margin 10-20%. proof360 doesn't sell software, it routes — is this an affiliate model, an MSP model, or a marketplace model?
- Distributor branch: Ingram/Dicker margin path. Typical distributor margin 5-15%. What's proof360's slice?
- Vendor direct: zero commission. Why would proof360 ever recommend this branch?

7.2. **Tier pricing absent in v3.0:** Tier 1 is free. Tier 2 unlock costs nothing to user (VERITAS attestation is the cost, paid by proof360 in tokens). Where does revenue come from?
- Vendor commission only
- AWS programme application attribution
- Future paid surfaces (insurance pack, AWS programme qualification, buyer subscription)

Is this defensible? Compare to:
- Comparison sites with affiliate revenue (NerdWallet, Wirecutter)
- Marketplace platforms (AWS Marketplace's percentage cut)
- Vendor-paid lead-gen (G2, Gartner Magic Quadrant adjacencies)

7.3. **Cost per session today:** Firecrawl + Claude Haiku via VECTOR + NIM via VECTOR + HIBP + AbuseIPDB + GitHub free + DNS/HTTP/cert/IP/ports/SSL Labs free + GPU amortised at $0 (dead code) ≈ $0.015/session. Per-scan cost intelligence will surface as PULSUS aggregates. Is this commercially scalable?

7.4. **Customer-facing token billing absent (Metronome lives in VECTOR for VECTOR-as-a-service, separate track):** does proof360 ever benefit from per-session paid model? Specific use cases where founder would pay (regulatory deadline, deal urgency, investor due diligence sprint).

7.5. **Future v3.1+ surfaces — commercial readiness:**
- Insurance underwriting pack (Austbrokers active relationship)
- AWS programme qualification (compounds partner tier)
- Buyer subscription
- Investor portfolio view
- Distributor listing fee
- Broker submission

For each, assess: forcing function (named commercial pull?), build cost, revenue trajectory, competitive vulnerability.

**Deliverable:** revenue analysis per branch + per surface. Identify the strongest revenue lane and the weakest. Honest assessment of whether the v3.0 model can scale to $1M ARR, $10M ARR, $100M ARR — or where it caps.

### Question 8 — Market positioning and messaging

Evaluate proof360's positioning narrative.

8.1. **The "trust readiness" framing vs "compliance" framing:**
- proof360 explicitly rejects compliance language ("control matrix", "audit", "non-compliant")
- Uses business-outcome language ("trust readiness", "deal blocker", "supported path")
- Positions as decision-support, not compliance tool

Compare to:
- Vanta's "trust management" rebrand
- Drata's "trust at scale"
- SafeBase's "trust centre"
- BitSight's "security ratings"
- The shift from compliance-tool to trust-platform language across the industry

Is proof360's positioning differentiated or following the industry shift?

8.2. **The "credit score for trust" mental model:** founders understand credit scores, not control matrices. The product positions trust score as analogous to credit score. Compare to:
- BitSight (literally markets as "security credit score")
- SecurityScorecard's letter grade model (A-F)
- FICO score equivalence in security context

Does proof360 win or lose on this analogy?

8.3. **The "transparent Palantir" positioning** (founder's words):** same ingestion + correlation surface as Palantir Foundry, but every claim carries provenance chain and attestation state. Is this messaging legible to enterprise buyers?

8.4. **Sovereign-by-construction:** AU/SG focus, regulated-industry pitch (financial services, government, healthcare). How does this compare to:
- AWS GovCloud / Australia regions
- Cloudflare AU data localisation
- Notion's data residency
- Australian financial services data sovereignty (APRA CPS 234 + 230)

Is sovereignty a wedge, table stakes, or a niche?

8.5. **The cross-domain pattern recognition story:** founder's CCIE Voice / CISSP / capital markets / blockchain / renewables background. Architecturally encoded as "transport layer abstraction" — proof360 sits above commodity layers. Is this story credible to buyers, investors, partners? Compare to other technical-founder narratives (Stripe — Patrick Collison's mathematical clarity; Cloudflare — Matthew Prince's network engineering depth).

**Deliverable:** positioning assessment per axis. Identify the strongest and weakest narrative thread.

### Question 9 — Moat analysis

The strategic moat thesis is:

1. **Signals dataset** — structured, comparable trust posture data across companies by stage/sector/geo, accumulating from session 1.
2. **Reasoning corpus** — Research360 / VERITAS as defensible knowledge substrate with cited frameworks.
3. **Portable trust profile** — if buyers/investors/insurers request it, proof360 becomes infrastructure.

9.1. **Dataset moat reality check:**
- Per-session signal richness (how many fields? how comparable across sessions? how often refreshed?)
- Cross-session aggregation use cases (sector benchmarks, stage benchmarks, geo posture comparisons)
- Defensibility against well-funded competitor copying schema (12-18 month window claim — is this real?)
- Compare to dataset moats in other domains: BitSight's 9-year IP-level data, SecurityScorecard's continuous scanning, Crunchbase's 10-year company data, Glassdoor's review accumulation, LinkedIn's graph

9.2. **Reasoning corpus moat:**
- 53-entry seed corpus today (CISSP 8 domains + 35+ frameworks)
- pgvector semantic query layer
- Three-tier corpus (global/module/tenant) for sovereign separation
- Compare to: OpenAI's frontier model knowledge, Vanta's framework library, GRC content libraries (LogicGate, OneTrust)

9.3. **Portable profile moat:**
- v3.0 doesn't ship this (deferred to v3.x)
- Requires adoption at both ends of market (founders + buyers/investors/insurers)
- Compare to: Plaid in financial data portability, OpenAuthorize / OAuth in identity, LinkedIn profiles, Stripe Atlas as company-formation portable artefact, SafeBase's attempt at trust-centre portability

9.4. **Network effects:**
- If proof360 attestations become procurement-relevant, founders pull other founders to get attested
- If partners route through proof360, vendor catalogs accumulate
- If AWS sellers see proof360 as qualified-funnel, AWS pulls deals upstream
- Compare to: which network effects are real and which are aspirational?

**Deliverable:** honest moat assessment. Identify which of the three moats is real today, which is aspirational, which is structurally impossible without market events outside proof360's control.

### Question 10 — AWS partner ecosystem analysis

proof360 has a deep AWS partner thesis: routes customers to AWS programmes (Activate, MAP, GenAI Accelerator, IMAGINE Grant, Marketplace), gets partner attribution back. Detailed analysis:

10.1. **The "qualified funnel" pitch to AWS:** AWS sellers spend manual effort qualifying customers for programmes. proof360 does this upstream from structured signals. How does this compare to:
- AWS partner programmes' own pre-qualification tools
- AWS Activate Hub for VC/accelerator portfolios
- AWS Marketplace listing flow
- Other ISVs claiming "qualified funnel" status

10.2. **APN / ACE / Marketplace progression:** proof360 plans APN registration, ACE pipeline, FTR validation, Marketplace listing, Specialisations. What's the realistic timeline? What are the gates? What's the typical revenue lift from each tier?

10.3. **Specific programme fits:**
- Well-Architected Partner Program ($5k per qualified WA Review) — proof360 is positioned as productised WA Review
- Agentic AI Specialization ($75k MDF) — pentad + VECTOR narrative
- Partner Greenfield Program (security practice) — proof360 = security practice fit
- Marketplace Private Offer Promotion Program — proof360 + CPPO vendors

For each, assess: is the fit real, what proof points are needed, what's the application path, what's the realistic dollar value over 12 months?

10.4. **Customer-side programme routing:**
- MAP for migration ($50k-$1M+ per migration) — proof360 detects on-prem/legacy hosting signals
- POC funding for AWS-native solutions
- Activate Portfolio for VC-backed startups (up to $100k credits)
- IMAGINE Grant for nonprofits

Is the per-customer routing logic defensible? What's the realistic lift in customer conversion when they walk into AWS conversation pre-qualified?

10.5. **Reciprocal lead flow:**
- proof360 routes customers to AWS → AWS attributes pipeline back to proof360
- AWS sees proof360 as qualified-funnel → AWS sellers refer customers to proof360 for trust readiness
- Compare to: how does this pattern actually work in AWS partner ecosystem? Specific examples of partners with reciprocal-lead-flow status.

**Deliverable:** AWS partner pathway analysis with realistic timelines and dollar values.

### Question 11 — Sovereignty and regulatory positioning

proof360 is sovereign-deployable by construction. AU and SG entities. Targets regulated industries (financial services, healthcare, government).

11.1. **APRA CPS 234 + 230 fit:** Australian financial services regulatory requirements for information security (CPS 234) and operational risk (CPS 230, in force from July 2025). How does proof360 fit? What's the buyer profile (banks, insurers, super funds)?

11.2. **IRAP (Information Security Registered Assessors Program) fit:** Australian government cloud assessment. Does proof360 sit upstream of IRAP, or is IRAP a vendor in proof360's matrix?

11.3. **Essential Eight maturity model:** Australian Cyber Security Centre framework. How does proof360 surface Essential Eight gaps? Is the framework first-class or one of many?

11.4. **Singapore IMDA / MAS regulatory posture:** Cyber Security Act, MAS TRM Guidelines for financial institutions. proof360's APAC entity exists but commercial activity unclear.

11.5. **EU AI Act + GDPR positioning:** if proof360 expands to EU, what does the AI Act (in force since Aug 2026) say about VERITAS-style claim attestation systems? Is proof360 a "high-risk" AI system under the Act?

11.6. **US compliance posture:** SOC 2 Type II, ISO 27001 — when does proof360 itself need these? Eating own dogfood (proof360 attests via its own system) is the obvious play. How is this typically handled in industry?

**Deliverable:** regulatory landscape per market, with realistic readiness timelines for proof360 to credibly serve buyers in each.

### Question 12 — Technology stack assessment

12.1. **Postgres + Fastify + React 19 + Tailwind + Auth0 + AWS:** is this a defensible production stack? Compare to typical B2B SaaS stacks at similar scale.

12.2. **VECTOR's OpenAI-compatible API surface:** is this a wedge (any LLM client works against VECTOR) or a feature (just convenient)? Compare to LiteLLM, OpenRouter, Helicone, Portkey, Bedrock.

12.3. **VERITAS's pgvector semantic query:** how does this compare to dedicated vector stores (Pinecone, Weaviate, Qdrant, Milvus)? Is pgvector enough at scale?

12.4. **PULSUS's CLI-only posture:** no HTTP API, just NDJSON ledger reading + emission. Is this scalable as the cost intelligence backbone?

12.5. **ARGUS's CloudWatch + SNS + Telegram chain:** is this production-grade observability? Compare to Datadog, Honeycomb, New Relic, Grafana.

12.6. **Multi-agent build/operate model (Kiro Builder, Claude Code Verifier, Claude.ai Operator, ChatGPT Architect, John Final Authority):** is this a real productivity multiplier or theatre? Compare to other emerging agentic-development workflows.

**Deliverable:** stack assessment. Identify which choices are strong, which are defensible-but-risky, which are weak.

### Question 13 — Failure mode analysis

What kills proof360? Map failure modes by likelihood × impact.

13.1. **Technical failure modes:**
- VERITAS unavailable for extended period (proof360 v3 hard-fails publish)
- VECTOR provider rotation breaks signal extraction
- Postgres data loss
- Recon source rate-limit cascade

13.2. **Commercial failure modes:**
- Vendor agreements lapse / vendor pulls out
- Distributor (Ingram, Dicker) deprioritises proof360
- AWS partner status doesn't compound as expected
- First enterprise lighthouse customer doesn't materialise

13.3. **Competitive failure modes:**
- Vanta launches "Trust Score" with dataset 100x proof360's
- AWS Marketplace launches first-party trust-readiness assessment
- Cloudflare bundles trust assessment into Zero Trust offering
- A well-funded competitor copies the doctrine pair architecture in 12 months

13.4. **Regulatory failure modes:**
- EU AI Act classifies VERITAS as high-risk, blocks expansion
- Australian privacy regulator restricts cross-tenant signal aggregation
- Vendor catalog rules require disclosure that breaks neutrality positioning

13.5. **Organisational failure modes:**
- Founder bandwidth (one-person company with AI agents — what breaks first?)
- Knowledge concentration risk (founder is the architecture)
- Multi-agent operating model brittleness (what happens when an LLM provider rotates models)

**Deliverable:** failure mode matrix with likelihood/impact ranking and mitigation assessment.

### Question 14 — Strategic options analysis

Given the locked v3.0 architecture, what are proof360's strategic options over 6, 12, 24 months?

14.1. **Option A — Ride the AWS partner wave:** double down on AWS programme integration, become the qualified-funnel-of-record for AWS Australia, ride to AWS Marketplace listing, monetise via partner programme MDF + reseller margins.

14.2. **Option B — Insurance underwriting wedge:** Austbrokers relationship → cyber insurance underwriting pack → become the trust signal layer for insurers → expand to financial services trust signals.

14.3. **Option C — Buyer-side procurement tool:** flip from founder-side diagnostic to enterprise-buyer-side vendor risk surface. Compete directly with SecurityScorecard / BitSight / UpGuard.

14.4. **Option D — VECTOR-as-a-service first:** spin VECTOR out as the primary commercial vehicle, treat proof360 as proof-point. Compete with LiteLLM, OpenRouter, Anthropic Bedrock.

14.5. **Option E — Sovereign trust infrastructure for ANZ government / financial services:** focus exclusively on regulated AU buyers, become the IRAP-adjacent trust assessment layer.

14.6. **Option F — Acquisition target:** position to be acquired by Vanta / Drata / SecurityScorecard / Cloudflare / AWS / Ingram Micro.

For each option:
- 6-month / 12-month / 24-month milestones
- Capital required
- Competitive risk
- Organisational fit (one-person + AI agent operating model)
- Probability-weighted upside

**Deliverable:** strategic option matrix with honest probability assessment.

### Question 15 — The "deep deep deep" residual

After the above 14 questions, what should I have asked but didn't? What's the unknown unknown? Surface anything that the brief missed but a sharp researcher would catch.

---

## 3. Sources to prioritise

**Primary research:**
- Competitor websites (read pricing pages, feature pages, public case studies)
- Crunchbase + PitchBook for funding stages
- LinkedIn for company size + recent hires
- G2 + Capterra + TrustRadius for customer reviews (note affiliate-driven bias)
- AWS partner directory + APN listings
- Competitor SOC 2 / ISO 27001 attestation availability

**Technical references:**
- W3C Verifiable Credentials, DID specs
- in-toto, Sigstore, SLSA framework documentation
- Sigstore, GUAC project documentation
- Postgres documentation for schema patterns
- Stripe Ledger documentation
- AWS partner programme official documentation

**Industry analysis:**
- Gartner Magic Quadrant for relevant categories
- Forrester Wave reports
- IDC market sizing for trust / vendor risk / compliance automation
- IANS Research (security research, occasional public reports)
- Australian Cyber Security Centre publications
- APRA / ASIC regulatory publications

**Market intelligence:**
- Vanta's annual State of Trust report
- BitSight's research publications
- SecurityScorecard's threat intelligence reports
- Crowdstrike + AWS partner blog posts
- AWS APN Blog (re:Invent 2025/2026 announcements especially)

---

## 4. Sources to avoid

- proof360's own marketing copy (provided above as context only — don't cite)
- Sponsored / pay-for-placement blog posts on G2/Capterra
- AI-generated competitive analysis without primary sources
- Analyst reports older than 18 months for fast-moving markets
- Founder LinkedIn posts as architectural ground truth (cross-reference with documentation)

---

## 5. Output structure

```
1. Executive Summary (≤500 words, no fluff)
2. Competitive Landscape Map (Q1)
3. Architectural Pattern Critique (Q2)
4. VERITAS Interrogation Pattern (Q3)
5. Provenance Flow Analysis (Q4)
6. Vendor Selection Matrix Deep Dive (Q5)
7. Use Case Journey Maps (Q6)
8. Commercial Model Assessment (Q7)
9. Market Positioning Analysis (Q8)
10. Moat Assessment (Q9)
11. AWS Partner Ecosystem Analysis (Q10)
12. Sovereignty and Regulatory Positioning (Q11)
13. Technology Stack Assessment (Q12)
14. Failure Mode Analysis (Q13)
15. Strategic Options (Q14)
16. The Unknown Unknowns (Q15)
17. Top Five Recommendations (ranked, with reasoning)
18. Sources (bibliographic, footnoted throughout)
```

---

## 6. Tone and stance

- Honest, not flattering
- Specific, not vague
- Cite or qualify
- Surface weaknesses with the same energy as strengths
- The point is to find what proof360 doesn't already know

This is being read by a founder who has built four convergence rounds across multiple LLMs and three months of architectural locking. Don't waste tokens on what's already locked. Spend them on what's still open.

---

*Authority: john-coates*
*Brief prepared: 2026-04-26*
*Inputs available on request: convergence lock v3, doctrine.md, kiro-build-brief-v3, veritas-adapter-spec, DOSSIER, plus full repo trees of VECTOR / VERITAS / IMPERIUM / PULSUS / ARGUS*
