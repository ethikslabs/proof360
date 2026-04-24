# Proof360 v2 — Product Rethink

**Status:** draft rethink, not yet locked.
**Trigger:** scope expansion across signal pipeline + AWS funding + cross-domain risk synthesis has outgrown the current product shape. Current proof360 = single founder self-assessment. What's been built up behind it = multi-stakeholder enterprise risk + funding engine.

---

## The scope shift

**Backend now carries:**
- ~67 signal sources (vs 22 original)
- ~215 signals feeding gaps + routing
- Cross-domain risk read: technical + legal + financial + reputational + social + governance + human
- 35+ gaps across these lenses
- AWS program eligibility engine (30+ programs, matrix-driven)
- 6+ lead types (direct / msp / mssp / migration_to_aws / migration_to_azure / marketplace_cosell / aws_program_application)
- Multi-distributor routing (arrays, Ingram-first preference)
- Commercial metering path (Metronome + AWS Marketplace MMS)
- Self-hosted intelligence stack (SpiderFoot, TruffleHog, OpenSanctions, etc.)
- AWS account footprint play (~25 services enabled)

**Frontend currently carries:**
- Single founder self-assessment (10Q)
- One report format (Layer 1 free / Layer 2 email-gated)
- Partner portal (per-tenant vendor filtering)
- Founder dashboard (saved reports)

Mismatch is structural. The backend reads for five audiences. The frontend serves one.

---

## Product thesis (v2)

> **Proof360 is the enterprise trust + risk posture engine for the AWS ecosystem.** It reads cross-domain signals (technical, legal, financial, reputational, social, governance, human) and surfaces to multiple stakeholders — founders, enterprise buyers, investors, insurers, AWS sellers, distributors — the specific readings each needs to make a decision. Each stakeholder view drives a commercial path: vendor routing, insurance quote, AWS funding application, migration engagement, diligence report, channel qualification.

**One substrate. Six surfaces. Six commercial paths.**

---

## Stakeholder model

| Stakeholder | Uses proof360 to | Pays via | Current surface | v2 need |
|---|---|---|---|---|
| **Founder (self-assessment)** | understand trust posture, get gaps fixed | free → vendor margin via quote + routing | existing (`/audit`, `/report`) | refine |
| **Enterprise buyer** | assess a vendor before procurement | per-report or subscription | none | new surface |
| **Investor (DD)** | evaluate a portfolio target pre/during DD | per-report or subscription | none | new surface |
| **Insurance broker / underwriter** | price cyber policy | per-quote metered | none | new surface |
| **AWS seller / APN team** | qualify customer for funding programs | partner-attributed pipeline (no direct fee) | none | new surface |
| **Distributor (Ingram / Dicker / AWS Marketplace)** | evaluate reseller fit + channel match | listing fee or per-lead | existing partner portal (narrow) | expand |

---

## Report surfaces (same substrate, different lens)

All driven from the same signals_object + gap analysis + program matrix. Each surface = template + persona + CTA + entitlement.

### 1. Founder Trust Readiness Report (existing — refine)
- Lens: revenue-framing, deal-readiness, founder-first language
- Content: gaps, trust score, AWS programs qualifying for, vendor routing with quote CTA
- CTA: accept quote → proof360 earns resale margin
- Refinement: add AWS program eligibility section (Layer 2), add risk-posture synthesis across cross-domain lenses

### 2. Vendor Trust Profile (new)
- Lens: enterprise procurement, vendor risk assessment
- Content: the target vendor's gaps + posture + history + disclosure pattern
- Buyer uploads a vendor name or URL; proof360 produces a trust profile
- CTA: share profile with procurement / request periodic re-read
- Commercial: subscription (continuous monitoring of N vendors) or per-report

### 3. Investment Diligence Read (new)
- Lens: investor / DD analyst / acquirer
- Content: full cross-domain read, financial posture (funding history, filings, sanctions, directors), governance posture, founder track record, social/reputation risk
- CTA: export to DD data room, flag red-flags for investment memo
- Commercial: per-deal or subscription (portfolio monitoring)

### 4. Insurance Underwriting Pack (new)
- Lens: cyber insurance broker / underwriter (Austbrokers first, others behind)
- Content: quantified risk factors (prior breach disclosures, litigation, regulator actions, exposed secrets, crisis comms history, attack surface, infrastructure posture)
- CTA: feeds directly into quote generation
- Commercial: per-quote metered (Metronome → Austbrokers)

### 5. AWS Program Qualification (new)
- Lens: AWS seller / APN team / customer applying for programs
- Content: programs customer qualifies for, with eligibility criteria matched to signals, with application CTAs
- Also: enterprise readiness signals for Global Startup Program invitation consideration
- CTA: one-click program application initiation, partner-attributed to proof360
- Commercial: partner attribution — no direct fee. Flywheel: AWS sees proof360 as qualified funnel → reciprocal lead flow → tier progression → MDF access

### 6. Distributor Channel Fit Report (new)
- Lens: distributor (Ingram / Dicker) evaluating reseller application
- Content: reseller's own trust posture, financial health, operational maturity, vendor ecosystem fit
- CTA: automate reseller onboarding decision
- Commercial: listing fee or per-assessment to distributor

---

## Entry point architecture

**Unified intake, routed by persona:**

```
User arrives at proof360.au
    ↓
Persona selector / auto-detected from context
    ↓
┌─────────────────────────────────────────────┐
│  • Founder  → self-assessment flow          │
│  • Buyer    → "assess a vendor" flow        │
│  • Investor → "DD this company" flow        │
│  • Broker   → "quote this risk" flow        │
│  • AWS Seller → "qualify this customer" flow│
│  • Distributor → "evaluate reseller" flow   │
└─────────────────────────────────────────────┘
    ↓
Same assessment pipeline (URL + signals + gap analysis)
    ↓
Persona-appropriate report surface
    ↓
Persona-appropriate CTA / commercial path
```

---

## Commercial shape by surface

| Surface | Commercial model | Per-unit economics |
|---|---|---|
| Founder | free report, margin on quote acceptance + vendor resale | margin per close |
| Enterprise buyer | subscription ($/mo per vendor monitored) or per-report | LTV growing with N vendors |
| Investor | subscription or per-deal | high-value, low-volume |
| Insurance | per-quote metered via Metronome | revenue-share with Austbrokers |
| AWS seller | partner-attributed pipeline | no direct revenue; compounds via partner tier + co-sell credit + MDF |
| Distributor | listing fee or per-reseller-evaluated | high-margin, low-volume |

**Revenue mix hypothesis for v2:**
- Short term: founder → quote → vendor resale margin (current motion)
- Medium term: insurance underwriting metered (Austbrokers direct pipe)
- Medium term: AWS co-sell via Marketplace CPPO + MAP funding + program attribution
- Long term: enterprise buyer subscriptions + investor DD subscriptions
- Long term: distributor channel fee

---

## Architecture implication

**Current architecture:**
- In-memory sessions (Map, 24h TTL)
- Hardcoded 10Q flow
- Single report format
- Simple gap-to-vendor routing
- React + Vite frontend, 10 routes
- Node Express API, 11 handlers
- No database
- No multi-tenant model
- No workflow engine
- No entitlement layer

**v2 required:**
- Postgres persistent store (already in Track A brief)
- Multi-tenant model (each buyer / investor / broker / AWS account has their own tenant)
- Report templating engine (multiple surface definitions from same substrate)
- Persona-driven rendering (report content + CTA + language shifts per persona)
- Workflow engine (DD, insurance quote, program application are multi-step)
- Entitlement layer (who sees what surface, what depth)
- Signal pipeline as first-class subsystem (queue + workers + feed pipelines — brief already drafted)
- Multi-stakeholder account model (Auth0 with role: founder / buyer / investor / broker / aws_seller / distributor / admin)

### This is a Track C trigger

Round 4 operating law:
> Track C (pentad-native rewrite) reactivates when (a) revenue covers rebuild cost, OR **(b) a specific revenue motion requires architecture the current code cannot support.**

The multi-stakeholder surfaces are a revenue motion the current code cannot carry. Trigger (b) is hit.

---

## The decision on the table

Three honest options:

### Option A — Keep Track A narrow, v2 is a later thing
- Ship Track A as defined (Postgres, quote endpoint, attribution, founder revenue console)
- Founder-only surface stays
- Multi-stakeholder surfaces become "Track D" for future
- Continue shipping signal pipeline in parallel

**Trade:** fastest to first revenue on founder surface. Debt accumulates. Each new stakeholder surface becomes a separate retrofit.

### Option B — Expand Track A into v2 foundation
- Track A scope grows: multi-stakeholder account model, report templating engine, persona-driven rendering, entitlement, workflow engine
- Founder surface ships first inside the new architecture, other surfaces incrementally
- Signal pipeline ships in parallel (already planned)
- No rebuild later — v2 IS the platform

**Trade:** longer to first revenue (weeks, not days), but everything after founder surface is incremental not retrofit. Track C trigger converted to Track A expansion — no separate pentad-native rewrite later.

### Option C — Track C trigger activated, pentad-native from now
- Pentad planes consumed progressively (PULSUS → VECTOR → VERITAS → NEXUS → IMPERIUM per Round 2 order)
- Track A items ship inside the pentad-native architecture, not on current stack
- Founder surface rebuilt as first IMPERIUM projection
- All stakeholder surfaces arrive as different persona lenses on IMPERIUM

**Trade:** longest to first revenue. Fully aligned to pentad + sovereign + AWS-native doctrine from day one. Requires runway that would typically come from an investor round or explicit funding.

### Recommendation (if forced to pick)

**Option B.** Reasons:
1. Revenue urgency is real; Option C's runway requirement isn't met
2. Scope shift warrants architectural expansion, not full rewrite
3. Option B converts the Track C trigger into Track A expansion — no rework later
4. Each stakeholder surface added in B is a new revenue line, not a rebuild
5. Pentad doctrine is preserved as narrative (Track B) without requiring the rewrite now

**Consequence:** Track A brief (`brief-track-a.md`) expands materially. Signal pipeline brief stays. New briefs needed: stakeholder-surface brief, templating-engine brief, entitlement brief.

---

## What needs to happen if Option B selected

1. Lock this rethink with ChatGPT (architectural convergence confirms)
2. Rewrite `brief-track-a.md` into `brief-track-a-v2.md` with expanded scope
3. Write `brief-stakeholder-surfaces.md` — six surfaces + entry point UX
4. Write `brief-templating-engine.md` — how report templates compose from signals_object
5. Write `brief-entitlement.md` — multi-tenant + persona + role model
6. Update `partner-register.md` with stakeholder-side entities (investors, insurers, distributors)
7. Kiro picks up new briefs, parallel build to signal pipeline

Track B (perception layer) unchanged — narrative still Tier 1 / Tier 2 / pentad-as-substrate. If anything, Track B strengthens because v2 is materially more defensible.

Track C still deferred — v2 is the architectural expansion, not the pentad rewrite.

---

## What doesn't change

- AWS hard-code across every decision
- VECTOR doctrine (inference substrate-agnostic)
- Sovereign-deployable by construction
- Marketplace co-sell as first-class routing
- Relational access as multiplier
- Operating laws from Round 4

---

## Next steps

1. John confirms which option (A / B / C)
2. If B: rewrite Track A brief, draft three new briefs, convergence lock with ChatGPT
3. If A: defer rethink, proceed with current Track A brief as-is, flag stakeholder surfaces as future
4. If C: call for investor runway conversation, architect pentad-native proof360 from scratch

---

*Backend reads for five audiences. Frontend serves one. Rethink required.*
